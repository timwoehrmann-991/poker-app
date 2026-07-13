import { create } from 'zustand';
import { BlackjackEngine, BJState, BJSeatConfig, handValue, isBlackjack } from '../blackjack/engine';
import { BJAction, BJRecommendation, applicableRecommendation, BJ_ACTION_LABELS } from '../blackjack/basicStrategy';
import { useSettingsStore } from './settingsStore';
import { useBlackjackProgressStore, categoryOfHand } from './blackjackProgressStore';

const COMPANION_NAMES = ['Anna', 'Ben', 'Clara', 'David', 'Emma'];

const SPEED_MULT: Record<string, number> = {
  slow: 1.75, normal: 1, fast: 0.5, instant: 0.05,
};

function speedMult(): number {
  return SPEED_MULT[useSettingsStore.getState().animationSpeed] ?? 1;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, Math.max(20, ms * speedMult())));
}

/** Leicht variierte Denkpause — Menschen (und gute Fakes) sind kein Metronom */
function think(base: number, spread: number): Promise<void> {
  return sleep(base + Math.random() * spread);
}

export interface BJFeedback {
  chosen: BJAction;
  recommendation: BJRecommendation;
  correct: boolean;
}

export interface BlackjackSetup {
  companions: number;   // 0-5 KI-Mitspieler
  startChips: number;
  humanName: string;
}

/** Chips, die gerade über den Tisch fliegen (Payout/Einzug) */
export interface BJChipFlight {
  seatIndex: number;
  amount: number;
  /** true = Einsatz wandert zur Bank (Verlust), false = Gewinn kommt zum Sitz */
  toDealer: boolean;
}

interface BlackjackStoreState {
  engine: BlackjackEngine | null;
  state: BJState | null;
  isRunning: boolean;       // Ablauf-Sequenz läuft (Eingaben sperren)
  betAmount: number;        // gewählter Einsatz des Spielers
  feedback: BJFeedback | null;
  /** Session-Zähler fürs Lernen (Lifetime läuft im ProgressStore) */
  score: { correct: number; total: number };

  // Ritual-View
  /** Wie viele Karten der Austeil-Sequenz sichtbar sind (null = alle) */
  dealtSteps: number | null;
  /** Dealer-Ansage über der Bank */
  announce: string | null;
  /** Hole Card trotz Engine-Reveal noch verdeckt halten (Drama-Beat) */
  suppressHole: boolean;
  /** Zählt hoch, wenn die Hole Card aufgedeckt wird (triggert Flip-Animation) */
  holeFlips: number;
  /** Chips fliegen beim Payout */
  chipFlights: BJChipFlight[] | null;
  /** Karten werden zum Rundenende abgeräumt */
  clearing: boolean;

  start: (setup: BlackjackSetup) => void;
  leave: () => void;
  rebuy: () => void;
  setBetAmount: (amount: number) => void;
  dealRound: () => Promise<void>;
  act: (action: BJAction) => Promise<void>;
  decideInsurance: (take: boolean) => Promise<void>;
  nextRound: () => Promise<void>;
  dismissFeedback: () => void;
}

export const useBlackjackStore = create<BlackjackStoreState>()((set, get) => {

  /** true, solange dieselbe Engine-Session aktiv ist — Schutz gegen stale Flows */
  function alive(engine: BlackjackEngine): boolean {
    return get().engine === engine;
  }

  function sync(engine: BlackjackEngine): void {
    if (alive(engine)) set({ state: engine.getState() });
  }

  function say(engine: BlackjackEngine, text: string | null): void {
    if (alive(engine)) set({ announce: text });
  }

  /** Bankroll des Spielers persistieren (überlebt Verlassen & Reload) */
  function saveBankroll(engine: BlackjackEngine): void {
    const human = engine.getState().seats.find(s => s.isHuman);
    if (human) useBlackjackProgressStore.getState().setBankroll(human.chips);
  }

  /** KI-Mitspieler und Dealer ziehen sichtbar nacheinander */
  async function runFlow(engine: BlackjackEngine): Promise<void> {
    if (!alive(engine)) return;
    set({ isRunning: true });

    let safety = 0;
    while (safety++ < 200 && alive(engine)) {
      const st = engine.getState();

      if (st.phase === 'insurance') {
        // KI-Mitspieler nehmen NIE Versicherung (Basic Strategy)
        const aiPending = st.seats.find(s => !s.isHuman && s.hands.length > 0 && !s.insuranceDecided);
        if (aiPending) {
          await think(400, 400);
          engine.decideInsurance(aiPending.id, false);
          sync(engine);
          continue;
        }
        break; // Mensch muss entscheiden
      }

      if (st.phase === 'playerTurns') {
        const seat = engine.getActiveSeat();
        const hand = engine.getActiveHand();
        if (!seat || !hand) break;
        if (seat.isHuman) break; // Mensch ist dran

        // KI spielt Basic Strategy — knappe Entscheidungen dauern länger
        const rec = applicableRecommendation(hand, st.dealerCards[0], engine.getLegalActions());
        const tricky = rec.action !== 'stand' && handValue(hand.cards).total >= 12;
        await think(tricky ? 900 : 550, 700);
        if (!alive(engine)) break;
        switch (rec.action) {
          case 'hit': engine.hit(); break;
          case 'stand': engine.stand(); break;
          case 'double': engine.double(); break;
          case 'split': engine.split(); break;
          case 'surrender': engine.surrender(); break;
        }
        sync(engine);
        continue;
      }

      if (st.phase === 'dealerTurn') {
        // Hole-Card-Moment: Beat, dann Flip
        say(engine, 'Bank deckt auf …');
        await think(1100, 400);
        if (!alive(engine)) break;
        set(s => ({ holeFlips: s.holeFlips + 1 }));
        sync(engine); // dealerRevealed wird beim ersten dealerStep gesetzt

        let result: 'draw' | 'done' = 'draw';
        while (result === 'draw' && alive(engine)) {
          result = engine.dealerStep();
          sync(engine);
          const value = handValue(engine.getState().dealerCards);
          if (result === 'draw') {
            say(engine, `Bank hat ${value.total} — Bank zieht …`);
            await think(1000, 450);
          } else {
            const bust = value.total > 21;
            say(engine, bust
              ? `${value.total} — Bank kaputt! Der Tisch gewinnt.`
              : `Bank steht mit ${value.total}.`);
          }
        }
        continue;
      }

      if (st.phase === 'payout') {
        // Chips sichtbar auszahlen/einziehen
        const flights: BJChipFlight[] = [];
        st.seats.forEach((seat, seatIndex) => {
          for (const hand of seat.hands) {
            if (!hand.result) continue;
            if (hand.result === 'lose') flights.push({ seatIndex, amount: hand.bet, toDealer: true });
            else if (hand.result !== 'push' && (hand.payout ?? 0) > 0) {
              flights.push({ seatIndex, amount: hand.payout!, toDealer: false });
            }
          }
        });
        if (flights.length > 0 && alive(engine)) {
          set({ chipFlights: flights });
          await sleep(850);
          if (alive(engine)) set({ chipFlights: null });
        }
        saveBankroll(engine);
        break;
      }

      break; // betting → nichts zu tun
    }

    if (alive(engine)) set({ isRunning: false });
  }

  return {
    engine: null,
    state: null,
    isRunning: false,
    betAmount: 10,
    feedback: null,
    score: { correct: 0, total: 0 },
    dealtSteps: null,
    announce: null,
    suppressHole: false,
    holeFlips: 0,
    chipFlights: null,
    clearing: false,

    start: (setup: BlackjackSetup) => {
      const seats: BJSeatConfig[] = [];
      const before = Math.floor(setup.companions / 2);
      for (let i = 0; i < before; i++) {
        seats.push({ id: `ki-${i}`, name: COMPANION_NAMES[i], isHuman: false, chips: setup.startChips });
      }
      seats.push({ id: 'human', name: setup.humanName || 'Du', isHuman: true, chips: setup.startChips });
      for (let i = before; i < setup.companions; i++) {
        seats.push({ id: `ki-${i}`, name: COMPANION_NAMES[i], isHuman: false, chips: setup.startChips });
      }

      const engine = new BlackjackEngine(seats);
      set({
        engine,
        state: engine.getState(),
        betAmount: 10,
        feedback: null,
        score: { correct: 0, total: 0 },
        isRunning: false,
        dealtSteps: null,
        announce: null,
        suppressHole: false,
        chipFlights: null,
        clearing: false,
      });
      useBlackjackProgressStore.getState().setBankroll(setup.startChips);
    },

    leave: () => {
      const { engine } = get();
      if (engine) saveBankroll(engine);
      set({ engine: null, state: null, feedback: null, isRunning: false, announce: null, chipFlights: null, dealtSteps: null });
    },

    rebuy: () => {
      const { engine } = get();
      if (!engine) return;
      if (engine.addChips('human', 500)) {
        set({ state: engine.getState() });
        saveBankroll(engine);
      }
    },

    setBetAmount: (amount: number) => set({ betAmount: amount }),

    dealRound: async () => {
      const { engine, betAmount, isRunning } = get();
      if (!engine || isRunning) return;
      const st = engine.getState();
      if (st.phase !== 'betting') return;

      // Mensch setzt den gewählten Einsatz, KI-Mitspieler setzen selbst
      for (const seat of st.seats) {
        if (seat.isHuman) {
          engine.setBet(seat.id, Math.min(betAmount, seat.chips));
        } else if (seat.chips > 0) {
          const options = [5, 10, 10, 25].filter(b => b <= seat.chips);
          const bet = options.length > 0 ? options[Math.floor(Math.random() * options.length)] : seat.chips;
          engine.setBet(seat.id, bet);
        }
      }

      set({ feedback: null, announce: 'Keine Einsätze mehr.' });
      if (!engine.deal()) {
        set({ announce: null });
        return;
      }

      // Karten einzeln über den Tisch geben — wie vom Dealer
      const after = engine.getState();
      const activeSeats = after.seats.filter(s => s.hands.length > 0).length;
      const totalSteps = 2 * (activeSeats + 1);
      const dealerHasBJ = after.dealerBlackjack;

      set({ isRunning: true, dealtSteps: 0, suppressHole: dealerHasBJ, state: after });
      for (let step = 1; step <= totalSteps; step++) {
        // Ruhiges Tempo: Man sieht jede Karte über den Tisch wandern
        await sleep(420);
        if (!alive(engine)) return;
        set({ dealtSteps: step });
      }
      await sleep(300);
      if (!alive(engine)) return;
      set({ dealtSteps: null });

      // Spieler-Blackjack sofort feiern
      const human = after.seats.find(s => s.isHuman);
      if (human?.hands[0] && isBlackjack(human.hands[0])) {
        say(engine, '♠ Blackjack! Zahlt 3:2 🎉');
        await sleep(900);
      }

      // Dealer-Peek-Drama, wenn die Bank direkt Blackjack hat
      if (dealerHasBJ) {
        say(engine, 'Bank prüft auf Blackjack …');
        await think(1300, 400);
        if (!alive(engine)) return;
        set(s => ({ suppressHole: false, holeFlips: s.holeFlips + 1 }));
        say(engine, 'Blackjack der Bank.');
        await sleep(800);
      } else if (after.phase === 'insurance') {
        say(engine, 'Bank zeigt Ass — Versicherung?');
      }

      if (alive(engine)) set({ isRunning: false });
      await runFlow(engine);
    },

    act: async (action: BJAction) => {
      const { engine, isRunning } = get();
      if (!engine || isRunning) return;
      const seat = engine.getActiveSeat();
      const hand = engine.getActiveHand();
      if (!seat?.isHuman || !hand) return;

      const legal = engine.getLegalActions();
      const dealerUp = engine.getState().dealerCards[0];
      // Empfehlung VOR der Aktion berechnen (danach ist die Situation weg)
      const rec = applicableRecommendation(hand, dealerUp, legal);
      const category = categoryOfHand(hand);
      const handCards = [...hand.cards];

      let ok = false;
      switch (action) {
        case 'hit': ok = engine.hit(); break;
        case 'stand': ok = engine.stand(); break;
        case 'double': ok = engine.double(); break;
        case 'split': ok = engine.split(); break;
        case 'surrender': ok = engine.surrender(); break;
      }
      if (!ok) return; // erst NACH erfolgreicher Aktion zählen (kein Geister-Score)

      // Coach: bewerten + Fortschritt persistieren
      if (useSettingsStore.getState().beginnerMode) {
        const correct = rec.action === action;
        set(state => ({
          feedback: { chosen: action, recommendation: rec, correct },
          score: { correct: state.score.correct + (correct ? 1 : 0), total: state.score.total + 1 },
        }));
        useBlackjackProgressStore.getState().recordDecision(category, correct, correct ? undefined : {
          playerCards: handCards,
          dealerUp,
          chosen: action,
          recommended: rec.action,
          reason: rec.reason,
        });
      }

      sync(engine);
      await runFlow(engine);
    },

    decideInsurance: async (take: boolean) => {
      const { engine, isRunning } = get();
      if (!engine || isRunning) return;
      const ok = engine.decideInsurance('human', take);
      if (!ok && take) {
        // Deckung reicht nicht — sichtbar machen statt stumm zu verpuffen
        say(engine, 'Nicht genug Chips für die Versicherung.');
        return;
      }
      say(engine, null);
      sync(engine);
      await runFlow(engine);
    },

    nextRound: async () => {
      const { engine, isRunning } = get();
      if (!engine || isRunning) return;

      // Karten abräumen statt Blitz-Reset
      set({ clearing: true, announce: null });
      await sleep(350);
      if (!alive(engine)) return;

      const before = engine.getState().shoeRemaining;
      engine.nextRound();
      const after = engine.getState();
      set({ clearing: false, feedback: null, state: after });

      // Neuer Schlitten? (Shoe wächst beim Nachmischen)
      if (after.shoeRemaining > before) {
        say(engine, 'Der Schlitten wird neu gemischt …');
        await sleep(900);
        say(engine, null);
      }
    },

    dismissFeedback: () => set({ feedback: null }),
  };
});

export { BJ_ACTION_LABELS };
