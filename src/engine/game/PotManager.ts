import { Player, PlayerStatus, Pot, PlayerId } from '../types';

/**
 * Calculates main pot and side pots for all-in situations.
 *
 * Algorithm:
 * 1. Consider only players who invested chips (not folded at 0)
 * 2. Sort all-in amounts ascending
 * 3. For each tier, create a pot that each eligible player contributes equally
 * 4. Players who folded still contribute their bets but are not eligible to win
 */
export function calculatePots(players: Player[]): Pot[] {
  // Get all players who put money in (including folded players who invested)
  const investors = players
    .filter(p => p.totalInvested > 0)
    .map(p => ({
      id: p.id,
      invested: p.totalInvested,
      eligible: p.status !== PlayerStatus.Folded && p.status !== PlayerStatus.Eliminated,
    }));

  if (investors.length === 0) {
    return [{ amount: 0, eligiblePlayerIds: [], isMainPot: true }];
  }

  // Get unique investment levels of all-in players (sorted ascending)
  const allInAmounts = [...new Set(
    investors
      .filter(p => {
        const player = players.find(pl => pl.id === p.id);
        return player?.status === PlayerStatus.AllIn;
      })
      .map(p => p.invested)
  )].sort((a, b) => a - b);

  // If no all-ins, single pot
  if (allInAmounts.length === 0) {
    const totalAmount = investors.reduce((sum, p) => sum + p.invested, 0);
    const eligibleIds = investors.filter(p => p.eligible).map(p => p.id);
    return [{ amount: totalAmount, eligiblePlayerIds: eligibleIds, isMainPot: true }];
  }

  const pots: Pot[] = [];
  let previousTier = 0;

  for (const tierAmount of allInAmounts) {
    const contribution = tierAmount - previousTier;
    if (contribution <= 0) continue;

    let potAmount = 0;
    const eligibleIds: PlayerId[] = [];

    for (const investor of investors) {
      const canContribute = Math.min(contribution, Math.max(0, investor.invested - previousTier));
      potAmount += canContribute;
      if (investor.eligible && investor.invested >= tierAmount) {
        eligibleIds.push(investor.id);
      }
    }

    if (potAmount > 0) {
      pots.push({
        amount: potAmount,
        eligiblePlayerIds: eligibleIds,
        isMainPot: pots.length === 0,
      });
    }

    previousTier = tierAmount;
  }

  // Remaining pot for players who invested more than the highest all-in
  const maxAllIn = allInAmounts[allInAmounts.length - 1];
  let remainingAmount = 0;
  const remainingEligible: PlayerId[] = [];

  for (const investor of investors) {
    const excess = Math.max(0, investor.invested - maxAllIn);
    remainingAmount += excess;
    if (investor.eligible && investor.invested > maxAllIn) {
      remainingEligible.push(investor.id);
    }
  }

  if (remainingAmount > 0) {
    pots.push({
      amount: remainingAmount,
      eligiblePlayerIds: remainingEligible,
      isMainPot: pots.length === 0,
    });
  }

  // If we got no pots (edge case), create one
  if (pots.length === 0) {
    const totalAmount = investors.reduce((sum, p) => sum + p.invested, 0);
    const eligibleIds = investors.filter(p => p.eligible).map(p => p.id);
    pots.push({ amount: totalAmount, eligiblePlayerIds: eligibleIds, isMainPot: true });
  }

  return pots;
}

/** Get total pot amount across all pots */
export function getTotalPot(pots: Pot[]): number {
  return pots.reduce((sum, pot) => sum + pot.amount, 0);
}
