import { create } from 'zustand';
import {
  GameState, GameConfig, Player, PlayerStatus, ActionType, PlayerId,
  LegalActions, Street, AIPersonalityType, DEFAULT_GAME_CONFIG,
  WinnerResult, HandRecord, Position,
} from '../engine/types';
import { GameController } from '../engine/game/GameController';
import { getAIDecision } from '../ai/AIPlayer';

export interface GameSetupConfig {
  playerCount: number;
  smallBlind: number;
  bigBlind: number;
  startingChips: number;
  humanName: string;
  aiPersonalities: AIPersonalityType[];
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

export interface GameStoreState {
  // Game state
  gameState: GameState | null;
  controller: GameController | null;
  isGameStarted: boolean;
  setupConfig: GameSetupConfig | null;

  // Positions
  positionMap: Map<number, Position>;

  // Hand history
  handHistory: HandRecord[];

  // Actions
  startGame: (setup: GameSetupConfig) => void;
  startNewHand: () => void;
  performAction: (action: ActionType, amount?: number) => void;
  getLegalActions: () => LegalActions | null;
  getHumanPlayer: () => Player | null;
  rotateDealerAndStartNewHand: () => void;
  forceAITurn: () => void;
}

export const useGameStore = create<GameStoreState>()((set, get) => ({
  gameState: null,
  controller: null,
  isGameStarted: false,
  setupConfig: null,
  positionMap: new Map(),
  handHistory: [],

  startGame: (setup: GameSetupConfig) => {
    const config: GameConfig = {
      playerCount: setup.playerCount,
      smallBlind: setup.smallBlind,
      bigBlind: setup.bigBlind,
      startingChips: setup.startingChips,
      decisionTimeSeconds: 30,
      ante: 0,
    };

    // Create players
    const players: Player[] = [];

    // Human player at seat 0
    players.push({
      id: 'human',
      name: setup.humanName || 'You',
      chips: setup.startingChips,
      holeCards: null,
      status: PlayerStatus.Active,
      seatIndex: 0,
      isHuman: true,
      currentBet: 0,
      totalInvested: 0,
    });

    // AI players
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
      handHistory: [],
    });

    // Start first hand
    get().startNewHand();
  },

  startNewHand: () => {
    const { controller } = get();
    if (!controller) return;

    controller.startHand();
    const gameState = controller.getState();
    const positionMap = controller.getPositionMap();

    set({ gameState, positionMap });
  },

  performAction: (action: ActionType, amount?: number) => {
    const { controller, gameState } = get();
    if (!controller || !gameState) return;

    const activeIdx = gameState.activePlayerIndex;
    if (activeIdx === null) return;

    const activePlayer = gameState.players[activeIdx];
    controller.applyAction(activePlayer.id, action, amount || 0);

    const newState = controller.getState();
    set({ gameState: newState });

    // If hand ended, record it
    if (!newState.isHandInProgress && gameState.isHandInProgress) {
      const record = controller.getHandRecord();
      set(state => ({
        handHistory: [...state.handHistory, record],
      }));
    }
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

  forceAITurn: () => {
    const { controller, gameState } = get();
    if (!controller || !gameState || !gameState.isHandInProgress) return;

    const activeIdx = gameState.activePlayerIndex;
    if (activeIdx === null) return;

    const activePlayer = gameState.players[activeIdx];
    if (activePlayer.isHuman || activePlayer.status !== PlayerStatus.Active) return;

    const legalActions = controller.getLegalActions();
    if (!legalActions) return;

    const posMap   = controller.getPositionMap();
    const position = posMap.get(activePlayer.seatIndex) || Position.Button;

    const decision = getAIDecision(
      activePlayer.aiPersonality!,
      gameState,
      activePlayer,
      position,
      legalActions,
    );

    get().performAction(decision.action, decision.amount);
  },
}));
