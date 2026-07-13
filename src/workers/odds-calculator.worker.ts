import { Card, Rank, Suit } from '../engine/types';
import { createFullDeck } from '../engine/deck/Card';
import { evaluateHand } from '../engine/evaluator/HandEvaluator';

export interface OddsRequest {
  type: 'calculate';
  requestId: number;
  holeCards: [Card, Card];
  communityCards: Card[];
  numOpponents: number;
  iterations: number;
}

export interface OutInfo {
  drawType: string;
  outs: number;
  /** Zählt für die Rule-of-4/2-Anzeige (nur echte Draws zur Gewinnerhand) */
  countsForRule: boolean;
}

export interface OddsResponse {
  type: 'result';
  requestId: number;
  winProbability: number;
  tieProbability: number;
  lossProbability: number;
  equity: number;
  outs: OutInfo[];
  calculationTimeMs: number;
}

function fisherYatesShuffle(arr: Card[]): Card[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function calculateOuts(holeCards: [Card, Card], communityCards: Card[]): OutInfo[] {
  if (communityCards.length < 3 || communityCards.length >= 5) return [];

  const outs: OutInfo[] = [];
  const knownCards = new Set([...holeCards, ...communityCards].map(c => c.id));
  const currentHand = evaluateHand([...holeCards, ...communityCards]);
  const allCards = createFullDeck();
  const remaining = allCards.filter(c => !knownCards.has(c.id));

  let flushOuts = 0;
  let flushSuit: Suit | null = null;
  let straightOuts = 0;
  let improvementOuts = 0;

  // Check suit counts for flush draws
  const suitCounts = new Map<Suit, number>();
  for (const c of [...holeCards, ...communityCards]) {
    suitCounts.set(c.suit, (suitCounts.get(c.suit) || 0) + 1);
  }

  for (const [suit, count] of suitCounts) {
    if (count === 4) {
      flushOuts = remaining.filter(c => c.suit === suit).length;
      flushSuit = suit;
    }
  }

  // Check for straight draws — Karten, die schon als Flush-Outs zählen,
  // nicht doppelt zählen (Überschneidung Straight-Flush-Karten)
  const ranks = new Set([...holeCards, ...communityCards].map(c => c.rank));
  if (ranks.has(Rank.Ace)) ranks.add(1 as Rank); // Low ace
  const straightCompleters = new Set<Rank>();

  for (let high = 5; high <= 14; high++) {
    let count = 0;
    const missing: Rank[] = [];
    for (let r = high - 4; r <= high; r++) {
      const rank = r === 1 ? Rank.Ace : r as Rank;
      if (ranks.has(r as Rank) || (r === 1 && ranks.has(Rank.Ace))) count++;
      else missing.push(rank);
    }
    if (count === 4 && missing.length === 1) {
      straightCompleters.add(missing[0]);
    }
  }
  for (const rank of straightCompleters) {
    straightOuts += remaining.filter(c => c.rank === rank && c.suit !== flushSuit).length;
  }

  // General improvement outs (Kicker etc.) — NICHT Rule-of-4-tauglich
  for (const card of remaining) {
    const newHand = evaluateHand([...holeCards, ...communityCards, card]);
    if (newHand.value > currentHand.value) {
      improvementOuts++;
    }
  }

  if (flushOuts > 0) outs.push({ drawType: 'Flush Draw', outs: flushOuts, countsForRule: true });
  if (straightOuts > 0) outs.push({ drawType: 'Straight Draw', outs: Math.min(straightOuts, 8), countsForRule: true });
  if (improvementOuts > flushOuts + straightOuts) {
    outs.push({ drawType: 'Weitere Verbesserungen', outs: improvementOuts - flushOuts - straightOuts, countsForRule: false });
  }

  return outs;
}

self.onmessage = (e: MessageEvent<OddsRequest>) => {
  const { requestId, holeCards, communityCards, numOpponents, iterations } = e.data;
  const startTime = performance.now();

  const knownIds = new Set([...holeCards, ...communityCards].map(c => c.id));
  const fullDeck = createFullDeck();
  const remainingDeck = fullDeck.filter(c => !knownIds.has(c.id));

  let wins = 0;
  let ties = 0;
  let losses = 0;
  let equitySum = 0;

  for (let i = 0; i < iterations; i++) {
    const shuffled = fisherYatesShuffle(remainingDeck);
    let idx = 0;

    // Complete the board
    const board = [...communityCards];
    while (board.length < 5) {
      board.push(shuffled[idx++]);
    }

    // Deal opponent hands
    const heroValue = evaluateHand([...holeCards, ...board]).value;
    let bestOpp = 0;
    let tiedOpponents = 0;

    for (let o = 0; o < numOpponents; o++) {
      const oppHand: [Card, Card] = [shuffled[idx++], shuffled[idx++]];
      const oppValue = evaluateHand([...oppHand, ...board]).value;
      if (oppValue > bestOpp) {
        bestOpp = oppValue;
        tiedOpponents = 1;
      } else if (oppValue === bestOpp) {
        tiedOpponents++;
      }
    }

    if (heroValue > bestOpp) {
      wins++;
      equitySum += 1;
    } else if (heroValue === bestOpp) {
      // Split-Pot: Anteil ist 1/(Anzahl der Gewinner), nicht pauschal 1/2
      ties++;
      equitySum += 1 / (1 + tiedOpponents);
    } else {
      losses++;
    }
  }

  const outs = calculateOuts(holeCards, communityCards);

  const response: OddsResponse = {
    type: 'result',
    requestId,
    winProbability: wins / iterations,
    tieProbability: ties / iterations,
    lossProbability: losses / iterations,
    equity: equitySum / iterations,
    outs,
    calculationTimeMs: performance.now() - startTime,
  };

  self.postMessage(response);
};
