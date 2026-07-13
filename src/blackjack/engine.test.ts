import { describe, it, expect } from 'vitest';
import { BlackjackEngine, handValue, isBlackjack } from './engine';
import { basicStrategy } from './basicStrategy';
import { createCard } from '../engine/deck/Card';
import { Rank, Suit } from '../engine/types';

const c = createCard;
const A = Rank.Ace, K = Rank.King, Q = Rank.Queen, T = Rank.Ten;
const s = Suit.Spades, h = Suit.Hearts, d = Suit.Diamonds, cl = Suit.Clubs;

function newGame(chips = 1000) {
  const engine = new BlackjackEngine([{ id: 'hero', name: 'Du', isHuman: true, chips }]);
  engine.setBet('hero', 10);
  return engine;
}

describe('Handwerte (Soft/Hard-Asse)', () => {
  it('rechnet Soft- und Hard-Hände korrekt', () => {
    expect(handValue([c(A, s), c(Rank.Six, h)])).toEqual({ total: 17, soft: true });
    expect(handValue([c(A, s), c(A, h)])).toEqual({ total: 12, soft: true });
    expect(handValue([c(A, s), c(Rank.Six, h), c(Rank.Nine, d)])).toEqual({ total: 16, soft: false });
    expect(handValue([c(A, s), c(K, h)])).toEqual({ total: 21, soft: true });
    expect(handValue([c(K, s), c(Q, h), c(Rank.Five, d)])).toEqual({ total: 25, soft: false });
  });
});

describe('Payouts', () => {
  it('Blackjack zahlt 3:2', () => {
    const engine = newGame(100);
    // Spieler: A,K (Blackjack) · Dealer: 9,7 → 16, zieht 5 → 21? Nein: Dealer soll verlieren.
    engine.setShoeForTesting([c(A, s), c(Rank.Nine, h), c(K, s), c(Rank.Seven, d)]);
    engine.deal();
    // Spieler-BJ, Dealer-Upcard 9: Runde geht direkt zum Dealer
    let st = engine.getState();
    expect(st.seats[0].hands[0].status).toBe('blackjack');
    while (engine.getState().phase === 'dealerTurn') engine.dealerStep();
    st = engine.getState();
    expect(st.phase).toBe('payout');
    // 100 - 10 Einsatz + 25 Payout (10 + 15) = 115
    expect(st.seats[0].chips).toBe(115);
    expect(st.seats[0].hands[0].result).toBe('blackjack');
  });

  it('normaler Gewinn zahlt 1:1, Push gibt den Einsatz zurück', () => {
    const engine = newGame(100);
    // Spieler: K,9 = 19 · Dealer: K,8 = 18 → Spieler gewinnt
    engine.setShoeForTesting([c(K, s), c(K, h), c(Rank.Nine, s), c(Rank.Eight, d)]);
    engine.deal();
    engine.stand();
    while (engine.getState().phase === 'dealerTurn') engine.dealerStep();
    expect(engine.getState().seats[0].chips).toBe(110);

    // Push: beide 19
    const engine2 = newGame(100);
    engine2.setShoeForTesting([c(K, s), c(K, h), c(Rank.Nine, s), c(Rank.Nine, d)]);
    engine2.deal();
    engine2.stand();
    while (engine2.getState().phase === 'dealerTurn') engine2.dealerStep();
    expect(engine2.getState().seats[0].chips).toBe(100);
    expect(engine2.getState().seats[0].hands[0].result).toBe('push');
  });

  it('Dealer zieht bis 17 und bustet korrekt', () => {
    const engine = newGame(100);
    // Spieler: K,9 (steht) · Dealer: 6,K → 16, zieht K → 26 Bust
    engine.setShoeForTesting([c(K, s), c(Rank.Six, h), c(Rank.Nine, s), c(K, d), c(K, cl)]);
    engine.deal();
    engine.stand();
    let steps = 0;
    while (engine.getState().phase === 'dealerTurn' && steps++ < 10) engine.dealerStep();
    const st = engine.getState();
    expect(handValue(st.dealerCards).total).toBeGreaterThan(21);
    expect(st.seats[0].hands[0].result).toBe('win');
    expect(st.seats[0].chips).toBe(110);
  });
});

describe('Verdoppeln & Teilen', () => {
  it('Verdoppeln: doppelter Einsatz, genau eine Karte', () => {
    const engine = newGame(100);
    // Spieler: 6,5 = 11 · Dealer: 9,5 = 14 → zieht 9 = 23 Bust? Nein: 14+9=23 bust → Spieler gewinnt 2×20
    engine.setShoeForTesting([
      c(Rank.Six, s), c(Rank.Nine, h), c(Rank.Five, s), c(Rank.Five, d),
      c(K, cl),          // Double-Karte → 21
      c(Rank.Nine, d),   // Dealer zieht → 23 Bust
    ]);
    engine.deal();
    expect(engine.getLegalActions().canDouble).toBe(true);
    engine.double();
    const hand = engine.getState().seats[0].hands[0];
    expect(hand.bet).toBe(20);
    expect(hand.cards).toHaveLength(3);
    while (engine.getState().phase === 'dealerTurn') engine.dealerStep();
    // 100 - 20 + 40 = 120
    expect(engine.getState().seats[0].chips).toBe(120);
  });

  it('Teilen: zwei Hände, auch K+10 (gleicher Wert), Chips bleiben konsistent', () => {
    const engine = newGame(100);
    // Spieler: K,10 · Dealer: 7,10 = 17 (steht)
    engine.setShoeForTesting([
      c(K, s), c(Rank.Seven, h), c(T, s), c(T, d),
      c(Rank.Nine, cl), c(Rank.Eight, cl), // zweite Karten der Split-Hände → 19 und 18
    ]);
    engine.deal();
    expect(engine.getLegalActions().canSplit).toBe(true);
    engine.split();
    const st1 = engine.getState();
    expect(st1.seats[0].hands).toHaveLength(2);
    expect(st1.seats[0].chips).toBe(80); // 2 × 10 Einsatz

    engine.stand(); // Hand 1: 19
    engine.stand(); // Hand 2: 18
    while (engine.getState().phase === 'dealerTurn') engine.dealerStep();
    const st = engine.getState();
    // 19 und 18 schlagen Dealer-17 → 80 + 40 = 120
    expect(st.seats[0].chips).toBe(120);
  });

  it('geteilte Asse bekommen genau eine Karte', () => {
    const engine = newGame(100);
    engine.setShoeForTesting([
      c(A, s), c(Rank.Seven, h), c(A, d), c(T, d),
      c(Rank.Nine, cl), c(Rank.Eight, cl),
    ]);
    engine.deal();
    engine.split();
    const st = engine.getState();
    // Beide Hände sofort fest (stood), keine weitere Aktion möglich
    expect(st.seats[0].hands[0].status).toBe('stood');
    expect(st.seats[0].hands[1].status).toBe('stood');
    expect(st.phase).toBe('dealerTurn');
  });

  it('geteilte Hand mit 21 ist KEIN Blackjack (zahlt nur 1:1)', () => {
    const hand = { cards: [c(A, s), c(K, h)], bet: 10, status: 'stood' as const, isSplitHand: true, fromSplitAces: true };
    expect(isBlackjack(hand)).toBe(false);
  });
});

describe('Versicherung', () => {
  it('zahlt 2:1 bei Dealer-Blackjack', () => {
    const engine = newGame(100);
    // Spieler: K,9 · Dealer: A,K = Blackjack
    engine.setShoeForTesting([c(K, s), c(A, h), c(Rank.Nine, s), c(K, d)]);
    engine.deal();
    expect(engine.getState().phase).toBe('insurance');
    engine.decideInsurance('hero', true); // kostet 5
    const st = engine.getState();
    expect(st.phase).toBe('payout');
    expect(st.dealerBlackjack).toBe(true);
    // 100 - 10 (Einsatz, verloren) - 5 (Versicherung) + 15 (2:1 + Einsatz zurück) = 100
    expect(st.seats[0].chips).toBe(100);
  });

  it('verfällt ohne Dealer-Blackjack', () => {
    const engine = newGame(100);
    // Dealer: A,7 = 18, Spieler: K,9 = 19 → gewinnt
    engine.setShoeForTesting([c(K, s), c(A, h), c(Rank.Nine, s), c(Rank.Seven, d)]);
    engine.deal();
    engine.decideInsurance('hero', true);
    expect(engine.getState().phase).toBe('playerTurns');
    engine.stand();
    while (engine.getState().phase === 'dealerTurn') engine.dealerStep();
    // 100 - 10 - 5 + 20 = 105
    expect(engine.getState().seats[0].chips).toBe(105);
  });
});

describe('Aufgeben (Late Surrender)', () => {
  it('gibt die Hälfte des Einsatzes zurück', () => {
    const engine = newGame(100);
    // Spieler: K,6 = 16 · Dealer zeigt 10 (Hole 7, kein Blackjack)
    engine.setShoeForTesting([c(K, s), c(T, h), c(Rank.Six, s), c(Rank.Seven, d)]);
    engine.deal();
    expect(engine.getLegalActions().canSurrender).toBe(true);
    expect(engine.surrender()).toBe(true);
    while (engine.getState().phase === 'dealerTurn') engine.dealerStep();
    const st = engine.getState();
    const hand = st.seats[0].hands[0];
    expect(hand.result).toBe('surrender');
    expect(hand.status).toBe('surrendered');
    // 100 - 10 Einsatz + 5 zurück = 95
    expect(st.seats[0].chips).toBe(95);
  });

  it('geht nur als allererste Entscheidung — nach einem Hit nicht mehr', () => {
    const engine = newGame(100);
    // Spieler: K,2 = 12 · Dealer 10,7 · Hit-Karte 2 → 14
    engine.setShoeForTesting([c(K, s), c(T, h), c(Rank.Two, s), c(Rank.Seven, d), c(Rank.Two, cl)]);
    engine.deal();
    engine.hit();
    expect(engine.getLegalActions().canSurrender).toBe(false);
    expect(engine.surrender()).toBe(false);
  });

  it('geht nicht auf Split-Händen', () => {
    const engine = newGame(100);
    engine.setShoeForTesting([
      c(Rank.Eight, s), c(T, h), c(Rank.Eight, d), c(Rank.Seven, d),
      c(Rank.Nine, cl), c(Rank.Eight, cl),
    ]);
    engine.deal();
    engine.split();
    expect(engine.getLegalActions().canSurrender).toBe(false);
  });
});

describe('Dealer-Peek bei 10er-Karte', () => {
  it('deckt Blackjack sofort auf — keine Spielerzüge, kein doppelter Verlust', () => {
    const engine = newGame(100);
    // Spieler: K,9 · Dealer: 10 oben, Ass verdeckt = Blackjack
    engine.setShoeForTesting([c(K, s), c(T, h), c(Rank.Nine, s), c(A, d)]);
    engine.deal();
    const st = engine.getState();
    expect(st.phase).toBe('payout'); // direkt aufgelöst, kein playerTurns
    expect(st.dealerBlackjack).toBe(true);
    expect(st.seats[0].hands[0].result).toBe('lose');
    expect(st.seats[0].chips).toBe(90);
  });

  it('Spieler-Blackjack gegen Dealer-Blackjack ist Push', () => {
    const engine = newGame(100);
    engine.setShoeForTesting([c(A, s), c(T, h), c(K, s), c(A, d)]);
    engine.deal();
    const st = engine.getState();
    expect(st.phase).toBe('payout');
    expect(st.seats[0].hands[0].result).toBe('push');
    expect(st.seats[0].chips).toBe(100);
  });
});

describe('Verdoppeln nach Teilen (DAS)', () => {
  it('erlaubt Double auf der Split-Hand und rechnet korrekt ab', () => {
    const engine = newGame(100);
    // Spieler: 6,6 · Dealer: 5,10 = 15 → zieht K = 25 Bust
    engine.setShoeForTesting([
      c(Rank.Six, s), c(Rank.Five, h), c(Rank.Six, d), c(T, d),
      c(Rank.Five, cl),  // Hand 1: 6+5 = 11
      c(T, cl),          // Double-Karte Hand 1 → 21
      c(Rank.Nine, cl),  // Hand 2: 6+9 = 15
      c(K, h),           // Dealer zieht → 25 Bust
    ]);
    engine.deal();
    engine.split();
    expect(engine.getLegalActions().canDouble).toBe(true); // DAS
    engine.double();   // Hand 1: Einsatz 20
    engine.stand();    // Hand 2: 15 halten
    while (engine.getState().phase === 'dealerTurn') engine.dealerStep();
    const st = engine.getState();
    expect(st.seats[0].hands[0].bet).toBe(20);
    // 100 - 10 - 10 (Split) - 10 (Double) + 40 + 20 = 130
    expect(st.seats[0].chips).toBe(130);
  });
});

describe('Bankrott-Kanten & Rebuy', () => {
  it('lehnt Einsätze über den Chips ab und erlaubt Rebuy', () => {
    const engine = new BlackjackEngine([{ id: 'hero', name: 'Du', isHuman: true, chips: 10 }]);
    expect(engine.setBet('hero', 20)).toBe(false);
    expect(engine.setBet('hero', 10)).toBe(true);
    // Spieler verliert alles: K,6 = 16 steht · Dealer K,7 = 17
    engine.setShoeForTesting([c(K, s), c(K, h), c(Rank.Six, s), c(Rank.Seven, d)]);
    engine.deal();
    engine.stand();
    while (engine.getState().phase === 'dealerTurn') engine.dealerStep();
    expect(engine.getState().seats[0].chips).toBe(0);

    expect(engine.addChips('hero', 500)).toBe(true);
    engine.nextRound();
    expect(engine.setBet('hero', 100)).toBe(true);
  });

  it('addChips geht nur zwischen den Runden', () => {
    const engine = newGame(100);
    engine.setShoeForTesting([c(K, s), c(T, h), c(Rank.Six, s), c(Rank.Seven, d)]);
    engine.deal();
    expect(engine.addChips('hero', 500)).toBe(false); // mitten in der Hand
  });
});

describe('nextRound-Reset', () => {
  it('räumt Hände/Versicherung ab und begrenzt den Vorschlags-Einsatz auf die Chips', () => {
    const engine = new BlackjackEngine([{ id: 'hero', name: 'Du', isHuman: true, chips: 15 }]);
    engine.setBet('hero', 15);
    // Verliert: K,6 steht · Dealer K,7 = 17
    engine.setShoeForTesting([c(K, s), c(K, h), c(Rank.Six, s), c(Rank.Seven, d)]);
    engine.deal();
    engine.stand();
    while (engine.getState().phase === 'dealerTurn') engine.dealerStep();
    expect(engine.getState().seats[0].chips).toBe(0);

    engine.nextRound();
    const st = engine.getState();
    expect(st.phase).toBe('betting');
    expect(st.seats[0].hands).toHaveLength(0);
    expect(st.seats[0].pendingBet).toBe(0); // war 15, auf 0 Chips gekappt
    expect(st.seats[0].insuranceBet).toBe(0);
    expect(st.activeSeatIndex).toBeNull();
  });
});

describe('Basic Strategy (Stichproben)', () => {
  const mkHand = (cards: ReturnType<typeof c>[]) =>
    ({ cards, bet: 10, status: 'playing' as const, isSplitHand: false, fromSplitAces: false });

  it('kennt die Klassiker', () => {
    // Achten immer teilen (auch wenn Surrender möglich wäre)
    expect(basicStrategy(mkHand([c(Rank.Eight, s), c(Rank.Eight, h)]), c(T, d)).action).toBe('split');
    // 20 nie teilen
    expect(basicStrategy(mkHand([c(K, s), c(T, h)]), c(Rank.Six, d)).action).toBe('stand');
    // 11 verdoppeln
    expect(basicStrategy(mkHand([c(Rank.Six, s), c(Rank.Five, h)]), c(Rank.Nine, d)).action).toBe('double');
    // 16 gegen 10: Aufgeben — ohne Surrender: ziehen
    expect(basicStrategy(mkHand([c(T, s), c(Rank.Six, h)]), c(T, d)).action).toBe('surrender');
    expect(basicStrategy(mkHand([c(T, s), c(Rank.Six, h)]), c(T, d), { allowSurrender: false }).action).toBe('hit');
    // 15 gegen 10: Aufgeben — 15 gegen 9: ziehen (kein Surrender-Spot)
    expect(basicStrategy(mkHand([c(T, s), c(Rank.Five, h)]), c(T, d)).action).toBe('surrender');
    expect(basicStrategy(mkHand([c(T, s), c(Rank.Five, h)]), c(Rank.Nine, d)).action).toBe('hit');
    // 13 gegen 6 halten
    expect(basicStrategy(mkHand([c(T, s), c(Rank.Three, h)]), c(Rank.Six, d)).action).toBe('stand');
    // Soft 18 gegen 6 verdoppeln
    expect(basicStrategy(mkHand([c(A, s), c(Rank.Seven, h)]), c(Rank.Six, d)).action).toBe('double');
    // 5,5 nie teilen, sondern verdoppeln
    expect(basicStrategy(mkHand([c(Rank.Five, s), c(Rank.Five, h)]), c(Rank.Six, d)).action).toBe('double');
  });
});
