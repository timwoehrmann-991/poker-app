import { Card, Player, PlayerStatus, Pot, WinnerResult, EvaluatedHand } from '../types';
import { evaluateHand } from '../evaluator/HandEvaluator';

/**
 * Determine winners for each pot at showdown.
 * Handles split pots when multiple players have equal hand strength.
 */
export function determineWinners(
  players: Player[],
  communityCards: Card[],
  pots: Pot[],
): WinnerResult[] {
  const results: WinnerResult[] = [];

  for (let potIndex = 0; potIndex < pots.length; potIndex++) {
    const pot = pots[potIndex];

    if (pot.amount === 0) continue;

    // Get eligible players who have hole cards
    const eligible = pot.eligiblePlayerIds
      .map(id => players.find(p => p.id === id))
      .filter((p): p is Player =>
        p !== undefined &&
        p.holeCards !== null &&
        (p.status === PlayerStatus.Active || p.status === PlayerStatus.AllIn)
      );

    if (eligible.length === 0) {
      // No eligible players (all folded), pot goes to last remaining player
      const anyEligible = players.find(
        p => p.status === PlayerStatus.Active || p.status === PlayerStatus.AllIn
      );
      if (anyEligible) {
        results.push({
          playerId: anyEligible.id,
          potIndex,
          amount: pot.amount,
          hand: null,
        });
      }
      continue;
    }

    if (eligible.length === 1) {
      // Only one eligible player
      const player = eligible[0];
      const hand = player.holeCards
        ? evaluateHand([...player.holeCards, ...communityCards])
        : null;
      results.push({
        playerId: player.id,
        potIndex,
        amount: pot.amount,
        hand,
      });
      continue;
    }

    // Evaluate all eligible hands
    const evaluations: { playerId: string; hand: EvaluatedHand }[] = [];
    for (const player of eligible) {
      if (player.holeCards) {
        const hand = evaluateHand([...player.holeCards, ...communityCards]);
        evaluations.push({ playerId: player.id, hand });
      }
    }

    if (evaluations.length === 0) continue;

    // Find the best hand value
    const bestValue = Math.max(...evaluations.map(e => e.hand.value));

    // All players with the best hand split the pot
    const winners = evaluations.filter(e => e.hand.value === bestValue);
    const splitAmount = Math.floor(pot.amount / winners.length);
    const remainder = pot.amount - splitAmount * winners.length;

    winners.forEach((winner, idx) => {
      results.push({
        playerId: winner.playerId,
        potIndex,
        amount: splitAmount + (idx === 0 ? remainder : 0), // First winner gets remainder
        hand: winner.hand,
      });
    });
  }

  return results;
}

/**
 * When only one player remains (all others folded), they win all pots.
 */
export function determineFoldWinner(
  players: Player[],
  pots: Pot[],
): WinnerResult[] {
  const winner = players.find(
    p => p.status === PlayerStatus.Active || p.status === PlayerStatus.AllIn
  );

  if (!winner) return [];

  const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);
  return [{
    playerId: winner.id,
    potIndex: 0,
    amount: totalPot,
    hand: null,
  }];
}
