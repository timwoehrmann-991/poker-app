import { Position } from '../types';

/**
 * Get position labels for a given number of players, starting from the dealer.
 * Returns an array where index 0 is the player at dealer+1 (SB in most cases).
 * The dealer themselves get BTN.
 *
 * Seat order (clockwise from dealer):
 * 2 players: BTN/SB, BB
 * 3 players: BTN, SB, BB
 * 4 players: BTN, SB, BB, UTG
 * 5 players: BTN, SB, BB, UTG, CO
 * 6 players: BTN, SB, BB, UTG, MP, CO
 * 7 players: BTN, SB, BB, UTG, UTG+1, MP, CO
 * 8 players: BTN, SB, BB, UTG, UTG+1, MP, HJ, CO
 * 9 players: BTN, SB, BB, UTG, UTG+1, UTG+2, MP, HJ, CO
 * 10 players: BTN, SB, BB, UTG, UTG+1, UTG+2, MP, MP+1, HJ, CO
 */
export function getPositions(playerCount: number): Position[] {
  if (playerCount === 2) {
    // Heads-up: dealer is SB (and BTN), other is BB
    return [Position.Button, Position.BigBlind];
  }

  if (playerCount === 3) {
    return [Position.Button, Position.SmallBlind, Position.BigBlind];
  }

  // For 4+ players, BTN is last, SB is first after BTN, BB after SB
  const positions: Position[] = [];

  // Late positions (always present for 4+)
  const earlyMiddle: Position[] = [];

  if (playerCount >= 10) {
    earlyMiddle.push(Position.UnderTheGun, Position.UTGPlus1, Position.UTGPlus2, Position.MiddlePosition, Position.MiddlePosition2, Position.Hijack, Position.Cutoff);
  } else if (playerCount === 9) {
    earlyMiddle.push(Position.UnderTheGun, Position.UTGPlus1, Position.UTGPlus2, Position.MiddlePosition, Position.Hijack, Position.Cutoff);
  } else if (playerCount === 8) {
    earlyMiddle.push(Position.UnderTheGun, Position.UTGPlus1, Position.MiddlePosition, Position.Hijack, Position.Cutoff);
  } else if (playerCount === 7) {
    earlyMiddle.push(Position.UnderTheGun, Position.UTGPlus1, Position.MiddlePosition, Position.Cutoff);
  } else if (playerCount === 6) {
    earlyMiddle.push(Position.UnderTheGun, Position.MiddlePosition, Position.Cutoff);
  } else if (playerCount === 5) {
    earlyMiddle.push(Position.UnderTheGun, Position.Cutoff);
  } else if (playerCount === 4) {
    earlyMiddle.push(Position.UnderTheGun);
  }

  // Build: BTN, SB, BB, early/middle, late
  positions.push(Position.Button, Position.SmallBlind, Position.BigBlind, ...earlyMiddle);

  return positions;
}

/**
 * Assign positions to active players based on dealer seat index.
 * Returns a map from seatIndex -> Position.
 */
export function assignPositions(
  activeSeatIndices: number[],
  dealerSeatIndex: number,
): Map<number, Position> {
  const count = activeSeatIndices.length;
  if (count < 2) throw new Error('Need at least 2 players');

  const positions = getPositions(count);

  // Sort seats clockwise starting from dealer
  const sorted = [...activeSeatIndices].sort((a, b) => a - b);
  const dealerIdx = sorted.indexOf(dealerSeatIndex);
  if (dealerIdx === -1) throw new Error('Dealer not in active seats');

  // Rotate so dealer is first
  const rotated = [...sorted.slice(dealerIdx), ...sorted.slice(0, dealerIdx)];

  const result = new Map<number, Position>();
  for (let i = 0; i < rotated.length; i++) {
    result.set(rotated[i], positions[i]);
  }

  return result;
}

export function getPositionCategory(position: Position): 'early' | 'middle' | 'late' | 'blinds' {
  switch (position) {
    case Position.SmallBlind:
    case Position.BigBlind:
      return 'blinds';
    case Position.UnderTheGun:
    case Position.UTGPlus1:
    case Position.UTGPlus2:
      return 'early';
    case Position.MiddlePosition:
    case Position.MiddlePosition2:
    case Position.Hijack:
      return 'middle';
    case Position.Cutoff:
    case Position.Button:
      return 'late';
  }
}
