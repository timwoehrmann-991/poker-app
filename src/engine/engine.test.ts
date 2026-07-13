import { describe, it, expect } from 'vitest';
import { GameController } from './game/GameController';
import { calculatePots, getTotalPot } from './game/PotManager';
import { createCard } from './deck/Card';
import {
  GameConfig, Player, PlayerStatus, ActionType, Rank, Suit, Street,
} from './types';

function makePlayers(chips: number[]): Player[] {
  return chips.map((c, i) => ({
    id: `p${i}`,
    name: `Spieler ${i}`,
    chips: c,
    holeCards: null,
    status: PlayerStatus.Active,
    seatIndex: i,
    isHuman: false,
    currentBet: 0,
    totalInvested: 0,
  }));
}

const CONFIG: GameConfig = {
  playerCount: 3,
  smallBlind: 1,
  bigBlind: 2,
  startingChips: 200,
  decisionTimeSeconds: 30,
  ante: 0,
};

describe('Min-Raise-Regeln (A1/A2-Regressionen)', () => {
  function setup() {
    // 3 Spieler, Dealer Sitz 0 → SB=1, BB=2, UTG=0 handelt zuerst
    const ctrl = new GameController(CONFIG, makePlayers([200, 200, 200]));
    ctrl.startHand();
    return ctrl;
  }

  it('lehnt einen Raise unterhalb des Min-Raise ab und senkt niemals highestBet', () => {
    const ctrl = setup();
    const s = ctrl.getState();
    const utg = s.players[s.activePlayerIndex!];

    // UTG raist auf 8 (putIn 8, currentBet 0 → Total 8, Raise-Größe 6 ≥ BB) — legal
    expect(ctrl.applyAction(utg.id, ActionType.Raise, 8)).toBe(true);

    // Nächster Spieler versucht "Raise" auf Total 2 (unter highestBet) — illegal
    const s2 = ctrl.getState();
    const next = s2.players[s2.activePlayerIndex!];
    expect(ctrl.applyAction(next.id, ActionType.Raise, 1)).toBe(false);

    // highestBet ist unverändert: Call kostet weiterhin 8 - currentBet
    const legal = ctrl.getLegalActions()!;
    expect(legal.callAmount).toBe(8 - next.currentBet);

    // Raise auf Total 10 (Erhöhung 2 < letzter Raise 6) ohne All-in — illegal
    expect(ctrl.applyAction(next.id, ActionType.Raise, 10 - next.currentBet)).toBe(false);

    // Raise auf Total 14 (Erhöhung 6 = Min-Raise) — legal
    expect(ctrl.applyAction(next.id, ActionType.Raise, 14 - next.currentBet)).toBe(true);
  });

  it('Short-All-in unterhalb Min-Raise eröffnet die Action NICHT neu', () => {
    // Spieler 2 (BB-Sitz) hat nur 10 Chips → kann nur short all-in gehen
    const ctrl = new GameController(CONFIG, makePlayers([200, 200, 10]));
    ctrl.startHand();

    let s = ctrl.getState();
    // UTG (Sitz 0) raist auf 8
    const utg = s.players[s.activePlayerIndex!];
    expect(utg.seatIndex).toBe(0);
    expect(ctrl.applyAction(utg.id, ActionType.Raise, 8)).toBe(true);

    // SB (Sitz 1) callt 8
    s = ctrl.getState();
    const sb = s.players[s.activePlayerIndex!];
    expect(ctrl.applyAction(sb.id, ActionType.Call)).toBe(true);

    // BB (Sitz 2, 10 Chips, 2 schon gesetzt) geht all-in: Total 10, Erhöhung 2 < Min-Raise 6
    s = ctrl.getState();
    const bb = s.players[s.activePlayerIndex!];
    expect(bb.seatIndex).toBe(2);
    expect(ctrl.applyAction(bb.id, ActionType.AllIn)).toBe(true);

    // Zurück bei UTG: darf callen, aber NICHT re-raisen (Action nicht neu eröffnet)
    s = ctrl.getState();
    const backToUtg = s.players[s.activePlayerIndex!];
    expect(backToUtg.seatIndex).toBe(0);
    const legal = ctrl.getLegalActions()!;
    expect(legal.canCall).toBe(true);
    expect(legal.callAmount).toBe(2);
    expect(legal.canRaise).toBe(false);
  });

  it('voller All-in-Raise eröffnet die Action neu', () => {
    const ctrl = new GameController(CONFIG, makePlayers([200, 200, 50]));
    ctrl.startHand();

    let s = ctrl.getState();
    const utg = s.players[s.activePlayerIndex!];
    expect(ctrl.applyAction(utg.id, ActionType.Raise, 8)).toBe(true);

    s = ctrl.getState();
    const sb = s.players[s.activePlayerIndex!];
    expect(ctrl.applyAction(sb.id, ActionType.Call)).toBe(true);

    // BB all-in 50 (Erhöhung 42 ≥ 6) → volle Erhöhung
    s = ctrl.getState();
    const bb = s.players[s.activePlayerIndex!];
    expect(ctrl.applyAction(bb.id, ActionType.AllIn)).toBe(true);

    // UTG darf jetzt re-raisen
    const legal = ctrl.getLegalActions()!;
    expect(legal.canRaise).toBe(true);
  });
});

describe('Side Pots', () => {
  it('berechnet Main- und Side-Pots bei drei verschiedenen Stacks korrekt', () => {
    const players = makePlayers([50, 100, 200]);
    players[0].totalInvested = 50;  players[0].status = PlayerStatus.AllIn;
    players[1].totalInvested = 100; players[1].status = PlayerStatus.AllIn;
    players[2].totalInvested = 100; players[2].status = PlayerStatus.Active;

    const pots = calculatePots(players);
    // Main: 50×3 = 150 (alle), Side: 50×2 = 100 (p1+p2)
    expect(pots).toHaveLength(2);
    expect(pots[0].amount).toBe(150);
    expect(pots[0].eligiblePlayerIds).toEqual(['p0', 'p1', 'p2']);
    expect(pots[1].amount).toBe(100);
    expect(pots[1].eligiblePlayerIds).toEqual(['p1', 'p2']);
    expect(getTotalPot(pots)).toBe(250);
  });

  it('gefoldete Spieler zahlen ein, sind aber nicht berechtigt', () => {
    const players = makePlayers([100, 100, 100]);
    players[0].totalInvested = 30; players[0].status = PlayerStatus.Folded;
    players[1].totalInvested = 60; players[1].status = PlayerStatus.AllIn;
    players[2].totalInvested = 60; players[2].status = PlayerStatus.Active;

    const pots = calculatePots(players);
    expect(getTotalPot(pots)).toBe(150);
    for (const pot of pots) {
      expect(pot.eligiblePlayerIds).not.toContain('p0');
    }
  });
});

describe('Szenario-Deck (B1)', () => {
  it('teilt exakt die vorgegebenen Karten aus', () => {
    const ctrl = new GameController(CONFIG, makePlayers([200, 200, 200]));
    const heroCards: [ReturnType<typeof createCard>, ReturnType<typeof createCard>] = [
      createCard(Rank.Ace, Suit.Spades), createCard(Rank.Ace, Suit.Hearts),
    ];
    const board = [
      createCard(Rank.King, Suit.Clubs),
      createCard(Rank.Seven, Suit.Diamonds),
      createCard(Rank.Two, Suit.Spades),
      createCard(Rank.Ten, Suit.Hearts),
      createCard(Rank.Queen, Suit.Clubs),
    ];

    ctrl.startHand({
      holeCards: {
        p0: heroCards,
        p1: [createCard(Rank.Three, Suit.Clubs), createCard(Rank.Five, Suit.Hearts)],
        p2: [createCard(Rank.Four, Suit.Diamonds), createCard(Rank.Eight, Suit.Clubs)],
      },
      board,
      dealerSeatIndex: 0,
    });
    const s = ctrl.getState();
    const p0 = s.players.find(p => p.id === 'p0')!;
    expect(p0.holeCards!.map(c => c.id).sort()).toEqual(heroCards.map(c => c.id).sort());

    // Alle callen/checken bis zum Showdown → Board muss dem Szenario entsprechen
    let safety = 0;
    while (ctrl.getState().isHandInProgress && safety++ < 60) {
      const st = ctrl.getState();
      const active = st.players[st.activePlayerIndex!];
      const legal = ctrl.getLegalActions()!;
      if (legal.canCheck) ctrl.applyAction(active.id, ActionType.Check);
      else if (legal.canCall) ctrl.applyAction(active.id, ActionType.Call);
      else ctrl.applyAction(active.id, ActionType.Fold);
    }

    const final = ctrl.getState();
    expect(final.communityCards.map(c => c.id)).toEqual(board.map(c => c.id));
    // AA auf diesem Board gewinnt für p0
    expect(final.winners!.some(w => w.playerId === 'p0')).toBe(true);
  });

  it('Split Pot: Board spielt für beide → gleicher Anteil', () => {
    const ctrl = new GameController({ ...CONFIG, playerCount: 2 }, makePlayers([100, 100]));
    const board = [
      createCard(Rank.Ace, Suit.Spades), createCard(Rank.King, Suit.Hearts),
      createCard(Rank.Queen, Suit.Diamonds), createCard(Rank.Jack, Suit.Clubs),
      createCard(Rank.Ten, Suit.Spades),
    ];
    ctrl.startHand({
      holeCards: {
        p0: [createCard(Rank.Two, Suit.Clubs), createCard(Rank.Three, Suit.Diamonds)],
        p1: [createCard(Rank.Two, Suit.Hearts), createCard(Rank.Three, Suit.Spades)],
      },
      board,
      dealerSeatIndex: 0,
    });

    let safety = 0;
    while (ctrl.getState().isHandInProgress && safety++ < 60) {
      const st = ctrl.getState();
      const active = st.players[st.activePlayerIndex!];
      const legal = ctrl.getLegalActions()!;
      if (legal.canCheck) ctrl.applyAction(active.id, ActionType.Check);
      else if (legal.canCall) ctrl.applyAction(active.id, ActionType.Call);
    }

    const final = ctrl.getState();
    const w0 = final.winners!.filter(w => w.playerId === 'p0').reduce((s2, w) => s2 + w.amount, 0);
    const w1 = final.winners!.filter(w => w.playerId === 'p1').reduce((s2, w) => s2 + w.amount, 0);
    expect(w0).toBe(w1);
    expect(final.players.reduce((s2, p) => s2 + p.chips, 0)).toBe(200);
  });
});

describe('Heads-Up-Regeln', () => {
  it('Dealer postet SB und handelt preflop zuerst', () => {
    const ctrl = new GameController({ ...CONFIG, playerCount: 2 }, makePlayers([100, 100]));
    ctrl.startHand();
    const s = ctrl.getState();
    const dealer = s.players.find(p => p.seatIndex === s.dealerSeatIndex)!;
    expect(dealer.currentBet).toBe(1); // SB
    expect(s.players[s.activePlayerIndex!].id).toBe(dealer.id);
  });
});

describe('Events & Chips-Erhaltung', () => {
  it('emittiert Events in sinnvoller Reihenfolge und erhält die Chipsumme', () => {
    const ctrl = new GameController(CONFIG, makePlayers([200, 200, 200]));
    ctrl.startHand();
    const startEvents = ctrl.drainEvents().map(e => e.type);
    expect(startEvents[0]).toBe('handStarted');
    expect(startEvents).toContain('blindsPosted');
    expect(startEvents).toContain('holeCardsDealt');

    const before = 600; // 3 × 200 Startchips

    let safety = 0;
    while (ctrl.getState().isHandInProgress && safety++ < 60) {
      const st = ctrl.getState();
      const active = st.players[st.activePlayerIndex!];
      const legal = ctrl.getLegalActions()!;
      if (legal.canCheck) ctrl.applyAction(active.id, ActionType.Check);
      else if (legal.canCall) ctrl.applyAction(active.id, ActionType.Call);
    }

    const endEvents = ctrl.drainEvents().map(e => e.type);
    expect(endEvents).toContain('potAwarded');
    expect(endEvents[endEvents.length - 1]).toBe('handEnded');

    const after = ctrl.getState().players.reduce((s2, p) => s2 + p.chips, 0);
    expect(after).toBe(before);
  });

  it('Aktionen tragen die korrekte Street', () => {
    const ctrl = new GameController(CONFIG, makePlayers([200, 200, 200]));
    ctrl.startHand();
    let safety = 0;
    while (ctrl.getState().isHandInProgress && safety++ < 60) {
      const st = ctrl.getState();
      const active = st.players[st.activePlayerIndex!];
      const legal = ctrl.getLegalActions()!;
      if (legal.canCheck) ctrl.applyAction(active.id, ActionType.Check);
      else if (legal.canCall) ctrl.applyAction(active.id, ActionType.Call);
    }
    const record = ctrl.getHandRecord();
    const streets = new Set(record.actions.map(a => a.street));
    expect(streets.has(Street.Preflop)).toBe(true);
    expect(streets.has(Street.Flop)).toBe(true);
    expect(streets.has(Street.River)).toBe(true);
  });
});
