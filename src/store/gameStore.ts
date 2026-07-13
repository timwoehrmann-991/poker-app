import { create } from 'zustand';
import {
  GameState, GameConfig, Player, PlayerStatus, ActionType, PlayerId,
  LegalActions, Street, AIPersonalityType, HandRecord, HandScenario,
  Position, GameEvent, WinnerResult,
} from '../engine/types';
import { GameController } from '../engine/game/GameController';
import { getAIDecision, AIDecisionResult } from '../ai/AIPlayer';
import { useSettingsStore } from './settingsStore';
import { saveHandRecord, loadHandRecords } from '../persistence/handStore';

export type GameMode = 'cash' | 'tournament';

export interface GameSetupConfig {
  playerCount: number;
  smallBlind: number;
  bigBlind: number;
  startingChips: number;
  humanName: string;
  aiPersonalities: AIPersonalityType[];
  mode: GameMode;
}

/** Blind-Struktur im Turnier: Erhöhung alle HANDS_PER_LEVEL Hände */
export const TOURNAMENT_LEVELS: { sb: number; bb: number }[] = [
  { sb: 10, bb: 20 }, { sb: 15, bb: 30 }, { sb: 25, bb: 50 },
  { sb: 50, bb: 100 }, { sb: 75, bb: 150 }, { sb: 100, bb: 200 },
  { sb: 150, bb: 300 }, { sb: 200, bb: 400 }, { sb: 300, bb: 600 },
  { sb: 500, bb: 1000 },
];
export const HANDS_PER_LEVEL = 8;

export interface TournamentResult {
  placement: number;
  totalPlayers: number;
  handsPlayed: number;
}

const AI_NAMES: Record<AIPersonalityType, string[]> = {
  [AIPersonalityType.Rock]: ['Rocky', 'Stone', 'Boulder'],
  [AIPersonalityType.CallingStation]: ['CallMaster', 'Limpy', 'CheckCall'],
  [AIPersonalityType.TAG]: ['Shark', 'AceKing', 'ProJoe'],
  [AIPersonalityType.LAGManiac]: ['Maniac', 'CrazyIvan', 'WildCard'],
  [AIPersonalityType.GTOBalanced]: ['GTO-Bot', 'Solver', 'Balance'],
  [AIPersonalityType.ShortStack]: ['ShortStack', 'AllInAndy', 'PushFold'],
  [AIPersonalityType.Nit]: ['TightTom', 'NitNate', 'FoldEmma'],
};

function getAIName(personality: AIPersonalityType, index: number): string {
  const names = AI_NAMES[personality];
  return names[index % names.length];
}

/** Skalierung der Playback-Pausen nach Animationsgeschwindigkeit */
const SPEED_MULT: Record<string, number> = {
  slow: 1.4, normal: 1, fast: 0.45, instant: 0,
};

function speedMult(): number {
  return SPEED_MULT[useSettingsStore.getState().animationSpeed] ?? 1;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/** Sichtbarer Zwischenzustand während des Event-Playbacks (Animationen) */
export interface ViewState {
  /** Wie viele Board-Karten die UI zeigt (Engine kann schon weiter sein) */
  boardRevealed: number;
  /** Einsätze, die gerade zur Tischmitte fliegen */
  collectingBets: { playerId: PlayerId; amount: number }[] | null;
  /** Gewinner, zu denen der Pot gerade wandert */
  awarding: WinnerResult[] | null;
  /** Spieler-IDs, deren Karten im Showdown bereits offen sind */
  showdownRevealed: PlayerId[];
  /** Playback läuft — Eingaben und KI-Züge warten */
  isPlaying: boolean;
}

const INITIAL_VIEW: ViewState = {
  boardRevealed: 0,
  collectingBets: null,
  awarding: null,
  showdownRevealed: [],
  isPlaying: false,
};

export interface GameStoreState {
  // Game state
  gameState: GameState | null;
  controller: GameController | null;
  isGameStarted: boolean;
  setupConfig: GameSetupConfig | null;

  // Positions
  positionMap: Map<number, Position>;

  // Hand history (persistiert via IndexedDB)
  handHistory: HandRecord[];
  historyLoaded: boolean;

  // Playback-View
  view: ViewState;

  // Hero-Equity je Street der laufenden Hand (vom Odds-Panel gemeldet)
  currentHandEquity: Partial<Record<Street, number>>;

  /** Entscheidungs-Timer pausiert (z.B. während der Coach-Tipp offen ist) */
  timerPaused: boolean;
  setTimerPaused: (paused: boolean) => void;

  // Actions
  startGame: (setup: GameSetupConfig) => void;
  startNewHand: (scenario?: HandScenario) => void;
  performAction: (action: ActionType, amount?: number) => void;
  getLegalActions: () => LegalActions | null;
  getHumanPlayer: () => Player | null;
  rotateDealerAndStartNewHand: () => void;
  /** KI-Zug: Entscheidung berechnen (ohne anzuwenden) */
  computeAIDecision: () => AIDecisionResult | null;
  /** Geplante KI-Entscheidung anwenden — nur wenn die Situation noch stimmt */
  applyAIDecision: (decision: AIDecisionResult, handNumber: number, activeIndex: number) => void;
  /** KI-Zug sofort ausführen (Skip-Button, Watchdog) */
  forceAITurn: () => void;
  /** Persistierte Historie laden (einmalig beim App-Start) */
  loadHistory: () => Promise<void>;
  /** Odds-Panel meldet die Hero-Equity der aktuellen Street */
  reportHeroEquity: (street: Street, equity: number) => void;
  /** Spiel sauber verlassen — räumt ALLE Laufzeit-Zustände auf */
  leaveGame: () => void;

  /** Turnier: aktuelles Blind-Level (0-basiert), null im Cash Game */
  tournamentLevel: number | null;
  /** Turnier vorbei (Spieler raus oder Sieg) */
  tournamentResult: TournamentResult | null;
}

export const useGameStore = create<GameStoreState>()((set, get) => {

  /** Engine-Events sequenziell abspielen — hier entsteht das Tisch-Gefühl */
  async function playEvents(events: GameEvent[]): Promise<void> {
    const mult = speedMult();
    if (events.length === 0) return;

    // instant: alles sofort sichtbar, keine Pausen
    if (mult === 0) {
      const s = get().gameState;
      set({ view: { ...INITIAL_VIEW, boardRevealed: s?.communityCards.length ?? 0 } });
      return;
    }

    set(state => ({ view: { ...state.view, isPlaying: true } }));

    for (const ev of events) {
      switch (ev.type) {
        case 'handStarted':
          set(state => ({ view: { ...state.view, boardRevealed: 0, showdownRevealed: [], awarding: null, collectingBets: null } }));
          break;

        case 'betsCollected':
          // Chips fliegen zur Tischmitte
          set(state => ({ view: { ...state.view, collectingBets: ev.bets } }));
          await sleep(520 * mult);
          set(state => ({ view: { ...state.view, collectingBets: null } }));
          break;

        case 'streetDealt': {
          // Dealer-Pause vor der Street — der River bekommt den großen Moment
          const pause = ev.street === Street.River ? 1200 : ev.street === Street.Turn ? 800 : 650;
          await sleep(pause * mult);
          for (let i = 0; i < ev.cards.length; i++) {
            set(state => ({ view: { ...state.view, boardRevealed: state.view.boardRevealed + 1 } }));
            await sleep(320 * mult);
          }
          break;
        }

        case 'showdown': {
          // Karten nacheinander aufdecken statt alle gleichzeitig
          await sleep(400 * mult);
          for (const playerId of ev.playerIds) {
            set(state => ({ view: { ...state.view, showdownRevealed: [...state.view.showdownRevealed, playerId] } }));
            await sleep(650 * mult);
          }
          break;
        }

        case 'potAwarded':
          set(state => ({ view: { ...state.view, awarding: ev.winners } }));
          await sleep(900 * mult);
          set(state => ({ view: { ...state.view, awarding: null } }));
          break;

        default:
          break;
      }
    }

    set(state => ({ view: { ...state.view, isPlaying: false } }));
  }

  /** Nach Handende: Record vervollständigen, merken, persistieren */
  function finalizeHand(): void {
    const { controller, currentHandEquity, setupConfig } = get();
    if (!controller) return;
    const record = controller.getHandRecord();
    if (Object.keys(currentHandEquity).length > 0) {
      record.heroEquityByStreet = { ...currentHandEquity };
    }
    set(state => ({
      handHistory: [...state.handHistory, record].slice(-500),
      currentHandEquity: {},
    }));
    void saveHandRecord(record);

    // Turnier-Ende: Spieler ausgeschieden oder letzter Überlebender
    if (setupConfig?.mode === 'tournament') {
      const state = controller.getState();
      const alive = state.players.filter(p => p.chips > 0);
      const human = state.players.find(p => p.isHuman);
      const total = state.players.length;
      if (human && human.chips <= 0) {
        set({ tournamentResult: { placement: alive.length + 1, totalPlayers: total, handsPlayed: state.handNumber } });
      } else if (alive.length === 1 && human && human.chips > 0) {
        set({ tournamentResult: { placement: 1, totalPlayers: total, handsPlayed: state.handNumber } });
      }
    }
  }

  return {
    gameState: null,
    controller: null,
    isGameStarted: false,
    setupConfig: null,
    positionMap: new Map(),
    handHistory: [],
    historyLoaded: false,
    view: { ...INITIAL_VIEW },
    currentHandEquity: {},
    tournamentLevel: null,
    tournamentResult: null,
    timerPaused: false,
    setTimerPaused: (paused) => set({ timerPaused: paused }),

    loadHistory: async () => {
      if (get().historyLoaded) return;
      const records = await loadHandRecords(500);
      set(state => {
        // Dedupe (HMR/StrictMode können im Dev doppelt speichern)
        const seen = new Set<string>();
        const merged = [...records, ...state.handHistory].filter(r => {
          const key = `${r.timestamp}-${r.handNumber}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return { historyLoaded: true, handHistory: merged.slice(-500) };
      });
    },

    startGame: (setup: GameSetupConfig) => {
      const config: GameConfig = {
        playerCount: setup.playerCount,
        smallBlind: setup.smallBlind,
        bigBlind: setup.bigBlind,
        startingChips: setup.startingChips,
        decisionTimeSeconds: 30,
        ante: 0,
      };

      const players: Player[] = [];

      players.push({
        id: 'human',
        name: setup.humanName || 'Du',
        chips: setup.startingChips,
        holeCards: null,
        status: PlayerStatus.Active,
        seatIndex: 0,
        isHuman: true,
        currentBet: 0,
        totalInvested: 0,
      });

      for (let i = 0; i < setup.playerCount - 1; i++) {
        const personality = setup.aiPersonalities[i] || AIPersonalityType.TAG;
        players.push({
          id: `ai-${i}`,
          name: getAIName(personality, i),
          chips: setup.startingChips,
          holeCards: null,
          status: PlayerStatus.Active,
          seatIndex: i + 1,
          isHuman: false,
          aiPersonality: personality,
          currentBet: 0,
          totalInvested: 0,
        });
      }

      const controller = new GameController(config, players);

      set({
        controller,
        setupConfig: setup,
        isGameStarted: true,
        tournamentLevel: setup.mode === 'tournament' ? 0 : null,
        tournamentResult: null,
      });

      get().startNewHand();
    },

    startNewHand: (scenario?: HandScenario) => {
      const { controller, setupConfig } = get();
      if (!controller) return;

      // Turnier: Blinds steigen alle HANDS_PER_LEVEL Hände
      if (setupConfig?.mode === 'tournament') {
        const handsPlayed = controller.getState().handNumber;
        const level = Math.min(Math.floor(handsPlayed / HANDS_PER_LEVEL), TOURNAMENT_LEVELS.length - 1);
        const blinds = TOURNAMENT_LEVELS[level];
        controller.updateBlinds(blinds.sb, blinds.bb);
        set({ tournamentLevel: level });
      }

      controller.startHand(scenario);
      const gameState = controller.getState();
      const positionMap = controller.getPositionMap();
      const events = controller.drainEvents();

      set({
        gameState,
        positionMap,
        currentHandEquity: {},
        view: { ...INITIAL_VIEW, boardRevealed: 0 },
      });

      void playEvents(events);
    },

    performAction: (action: ActionType, amount?: number) => {
      const { controller, gameState, view } = get();
      if (!controller || !gameState) return;
      if (view.isPlaying) return; // während Animationen keine Eingaben

      const activeIdx = gameState.activePlayerIndex;
      if (activeIdx === null) return;

      const activePlayer = gameState.players[activeIdx];
      const wasInProgress = gameState.isHandInProgress;
      const ok = controller.applyAction(activePlayer.id, action, amount || 0);
      if (!ok) return;

      const newState = controller.getState();
      const events = controller.drainEvents();
      set({ gameState: newState });

      if (!newState.isHandInProgress && wasInProgress) {
        finalizeHand();
      }

      void playEvents(events);
    },

    getLegalActions: () => {
      const { controller } = get();
      if (!controller) return null;
      return controller.getLegalActions();
    },

    getHumanPlayer: () => {
      const { gameState } = get();
      if (!gameState) return null;
      return gameState.players.find(p => p.isHuman) || null;
    },

    rotateDealerAndStartNewHand: () => {
      const { controller } = get();
      if (!controller) return;
      controller.rotateDealerButton();
      get().startNewHand();
    },

    computeAIDecision: () => {
      const { controller, gameState } = get();
      if (!controller || !gameState || !gameState.isHandInProgress) return null;

      const activeIdx = gameState.activePlayerIndex;
      if (activeIdx === null) return null;

      const activePlayer = gameState.players[activeIdx];
      if (activePlayer.isHuman || activePlayer.status !== PlayerStatus.Active) return null;
      if (!activePlayer.aiPersonality) return null;

      const legalActions = controller.getLegalActions();
      if (!legalActions) return null;

      const posMap = controller.getPositionMap();
      const position = posMap.get(activePlayer.seatIndex) || Position.Button;

      return getAIDecision(activePlayer.aiPersonality, gameState, activePlayer, position, legalActions);
    },

    applyAIDecision: (decision, handNumber, activeIndex) => {
      const { gameState, view } = get();
      if (!gameState || !gameState.isHandInProgress) return;
      if (view.isPlaying) return;
      // Situation muss noch dieselbe sein (Schutz gegen veraltete Timer)
      if (gameState.handNumber !== handNumber || gameState.activePlayerIndex !== activeIndex) return;
      get().performAction(decision.action, decision.amount);
    },

    forceAITurn: () => {
      const { gameState } = get();
      if (!gameState || gameState.activePlayerIndex === null) return;
      const decision = get().computeAIDecision();
      if (!decision) return;
      get().applyAIDecision(decision, gameState.handNumber, gameState.activePlayerIndex);
    },

    leaveGame: () => {
      set({
        isGameStarted: false,
        gameState: null,
        controller: null,
        view: { ...INITIAL_VIEW },
        currentHandEquity: {},
        tournamentLevel: null,
        tournamentResult: null,
        timerPaused: false,
      });
    },

    reportHeroEquity: (street, equity) => {
      set(state => ({
        currentHandEquity: { ...state.currentHandEquity, [street]: equity },
      }));
    },
  };
});
