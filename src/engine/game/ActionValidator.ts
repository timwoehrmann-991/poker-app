import { Player, PlayerStatus, LegalActions, Street } from '../types';

/**
 * Compute the legal actions for the active player given the current betting state.
 *
 * Key NLHE rules:
 * - "Bet" = first voluntary wager in a betting round (no prior bet/raise)
 * - "Raise" = increasing an existing bet
 * - Preflop: the BB counts as a bet, so subsequent actions are raises
 * - Min raise = at least the size of the previous raise (not the total bet)
 * - No limit on max raise (except player's stack)
 */
export function computeLegalActions(
  player: Player,
  highestBet: number,
  lastRaiseSize: number,
  street: Street,
  bigBlind: number,
  raiseAllowed: boolean = true,
): LegalActions {
  const chips = player.chips;
  const currentBet = player.currentBet;
  const toCall = highestBet - currentBet;

  // If player is all-in or folded, no actions
  if (player.status === PlayerStatus.AllIn || player.status === PlayerStatus.Folded) {
    return {
      canFold: false, canCheck: false, canCall: false, callAmount: 0,
      canBet: false, minBet: 0, maxBet: 0,
      canRaise: false, minRaise: 0, maxRaise: 0,
    };
  }

  // Determine if there's been a bet this round
  // Preflop: BB counts as a bet, so it's always a "raise" situation preflop
  // Post-flop: highestBet > 0 means there's been a bet
  const hasBet = street === Street.Preflop ? true : highestBet > 0;

  const canFold = toCall > 0;
  const canCheck = toCall <= 0;
  const canCall = toCall > 0 && chips > 0;
  const callAmount = Math.min(toCall, chips);

  // Bet: only when there's been NO bet this round (post-flop only)
  const canBet = !hasBet && chips > 0;
  const minBetAmount = canBet ? Math.min(bigBlind, chips) : 0;
  const maxBetAmount = canBet ? chips : 0;

  // Raise: when there IS a bet and player has enough chips to raise.
  // Nach einem Incomplete-All-in-Raise ist Re-Raisen gesperrt (raiseAllowed).
  const canRaise = hasBet && chips > Math.max(toCall, 0) && raiseAllowed;
  // Min raise total = current highest bet + last raise size (or BB if first raise)
  const effectiveRaiseSize = Math.max(lastRaiseSize, bigBlind);
  const minRaiseTotal = highestBet + effectiveRaiseSize;
  // The amount the player needs to PUT IN to min-raise
  const minRaiseAmount = Math.min(minRaiseTotal - currentBet, chips);
  const maxRaiseAmount = canRaise ? chips : 0;

  return {
    canFold,
    canCheck,
    canCall,
    callAmount,
    canBet,
    minBet: minBetAmount,
    maxBet: maxBetAmount,
    canRaise,
    minRaise: canRaise ? Math.max(minRaiseAmount, callAmount + 1) : 0,
    maxRaise: maxRaiseAmount,
  };
}
