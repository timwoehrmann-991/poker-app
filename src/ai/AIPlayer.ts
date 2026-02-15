import {
  GameState, Player, ActionType, LegalActions, Card, Street,
  PlayerStatus, Rank, HandCategory, Position,
} from '../engine/types';
import { evaluateHand } from '../engine/evaluator/HandEvaluator';
import { getTotalPot } from '../engine/game/PotManager';
import { getPositionCategory } from '../engine/utils/position';

export interface AIDecisionResult {
  action: ActionType;
  amount: number;
  reasoning: string;
}

export interface AIContext {
  gameState: GameState;
  player: Player;
  position: Position;
  legalActions: LegalActions;
  street: Street;
  potSize: number;
  handStrength: number; // 0-1 normalized
  handCategory: HandCategory | null;
}

/** Compute hand strength as a normalized 0-1 value */
function getHandStrength(holeCards: [Card, Card], communityCards: Card[]): { strength: number; category: HandCategory | null } {
  if (communityCards.length === 0) {
    // Preflop - use simple card ranking
    return { strength: getPreflopStrength(holeCards), category: null };
  }

  const allCards = [...holeCards, ...communityCards];
  const evaluated = evaluateHand(allCards);

  // Normalize hand value to 0-1 range
  // Max possible value ~9_000_000 (Royal Flush)
  const strength = Math.min(evaluated.value / 9_000_100, 1);
  return { strength, category: evaluated.category };
}

function getPreflopStrength(holeCards: [Card, Card]): number {
  const [c1, c2] = holeCards;
  const highRank = Math.max(c1.rank, c2.rank);
  const lowRank = Math.min(c1.rank, c2.rank);
  const suited = c1.suit === c2.suit;
  const paired = c1.rank === c2.rank;

  let strength = 0;

  if (paired) {
    // Pairs: AA=0.95, KK=0.90, ... 22=0.50
    strength = 0.50 + (highRank - 2) * 0.0375;
  } else {
    // Non-pairs: base on high card + gap + suited bonus
    strength = (highRank - 2) * 0.02 + (lowRank - 2) * 0.015;
    if (suited) strength += 0.05;
    // Connected bonus
    if (highRank - lowRank === 1) strength += 0.03;
    else if (highRank - lowRank === 2) strength += 0.015;

    // Cap at reasonable values
    strength = Math.min(strength, 0.75);
  }

  return Math.max(0, Math.min(1, strength));
}

export function createAIContext(
  gameState: GameState,
  player: Player,
  position: Position,
  legalActions: LegalActions,
): AIContext {
  const potSize = getTotalPot(gameState.pots) +
    gameState.players.reduce((sum, p) => sum + p.currentBet, 0);

  const { strength, category } = player.holeCards
    ? getHandStrength(player.holeCards, gameState.communityCards)
    : { strength: 0, category: null };

  return {
    gameState,
    player,
    position,
    legalActions,
    street: gameState.street,
    potSize,
    handStrength: strength,
    handCategory: category,
  };
}

/** Simple random number 0-1 */
function rand(): number {
  return Math.random();
}

// ============================================================
// AI Personality Implementations
// ============================================================

/** Rock: Tight/Passive. VPIP ~15%, AF ~30% */
export function rockDecide(ctx: AIContext): AIDecisionResult {
  const { legalActions, handStrength, street, potSize, player } = ctx;
  const posCategory = getPositionCategory(ctx.position);

  // Preflop: Only play top 15% hands
  if (street === Street.Preflop) {
    const threshold = posCategory === 'late' ? 0.55 : posCategory === 'middle' ? 0.62 : 0.68;
    if (handStrength < threshold) {
      return { action: ActionType.Fold, amount: 0, reasoning: 'Hand too weak for Rock style' };
    }
    if (legalActions.canCheck) {
      return { action: ActionType.Check, amount: 0, reasoning: 'Checking with marginal hand' };
    }
    if (legalActions.canCall) {
      return { action: ActionType.Call, amount: legalActions.callAmount, reasoning: 'Calling with decent hand' };
    }
  }

  // Post-flop: Only continue with strong hands
  if (handStrength > 0.7 && legalActions.canRaise && rand() < 0.3) {
    const raiseAmount = Math.min(legalActions.minRaise, legalActions.maxRaise);
    return { action: ActionType.Raise, amount: raiseAmount, reasoning: 'Raising with strong hand' };
  }

  if (handStrength > 0.4) {
    if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Checking' };
    if (legalActions.canCall) return { action: ActionType.Call, amount: legalActions.callAmount, reasoning: 'Calling' };
  }

  if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Checking weak hand' };
  return { action: ActionType.Fold, amount: 0, reasoning: 'Folding weak hand' };
}

/** Calling Station: Loose/Passive. VPIP ~45%, AF ~20% */
export function callingStationDecide(ctx: AIContext): AIDecisionResult {
  const { legalActions, handStrength, street } = ctx;

  // Preflop: Play most hands
  if (street === Street.Preflop) {
    if (handStrength < 0.25) {
      if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Checking junk' };
      if (rand() < 0.5) return { action: ActionType.Fold, amount: 0, reasoning: 'Folding worst hands' };
    }
    if (legalActions.canCall) return { action: ActionType.Call, amount: legalActions.callAmount, reasoning: 'Calling - likes to see flops' };
    if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Checking' };
  }

  // Post-flop: Call almost everything
  if (handStrength > 0.15) {
    if (legalActions.canCall) return { action: ActionType.Call, amount: legalActions.callAmount, reasoning: 'Calling - never folds' };
    if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Checking' };
  }

  // Rarely bets/raises even with good hands
  if (handStrength > 0.75 && rand() < 0.2) {
    if (legalActions.canBet) {
      return { action: ActionType.Bet, amount: legalActions.minBet, reasoning: 'Min-betting strong hand' };
    }
  }

  if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Checking' };
  if (legalActions.canCall) return { action: ActionType.Call, amount: legalActions.callAmount, reasoning: 'Calling' };
  return { action: ActionType.Fold, amount: 0, reasoning: 'Folding' };
}

/** TAG: Tight/Aggressive. VPIP ~20%, AF ~70% */
export function tagDecide(ctx: AIContext): AIDecisionResult {
  const { legalActions, handStrength, street, potSize, player } = ctx;
  const posCategory = getPositionCategory(ctx.position);

  // Preflop: Selective but aggressive
  if (street === Street.Preflop) {
    const threshold = posCategory === 'late' ? 0.50 : posCategory === 'middle' ? 0.58 : 0.65;
    if (handStrength < threshold) {
      if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Checking' };
      return { action: ActionType.Fold, amount: 0, reasoning: 'Hand below TAG threshold' };
    }
    // Raise with playable hands
    if (legalActions.canRaise) {
      const raiseSize = Math.min(
        Math.max(legalActions.minRaise, Math.floor(potSize * 0.75)),
        legalActions.maxRaise
      );
      return { action: ActionType.Raise, amount: raiseSize, reasoning: 'Aggressive raise with good hand' };
    }
    if (legalActions.canBet) {
      const betSize = Math.min(
        Math.max(legalActions.minBet, Math.floor(potSize * 0.66)),
        legalActions.maxBet
      );
      return { action: ActionType.Bet, amount: betSize, reasoning: 'Betting aggressively' };
    }
    if (legalActions.canCall) return { action: ActionType.Call, amount: legalActions.callAmount, reasoning: 'Calling' };
  }

  // Post-flop: Aggressive with made hands and draws
  if (handStrength > 0.5) {
    if (legalActions.canRaise && rand() < 0.6) {
      const raiseSize = Math.min(
        Math.max(legalActions.minRaise, Math.floor(potSize * 0.66)),
        legalActions.maxRaise
      );
      return { action: ActionType.Raise, amount: raiseSize, reasoning: 'TAG raise' };
    }
    if (legalActions.canBet) {
      const betSize = Math.min(
        Math.max(legalActions.minBet, Math.floor(potSize * 0.66)),
        legalActions.maxBet
      );
      return { action: ActionType.Bet, amount: betSize, reasoning: 'C-bet / value bet' };
    }
    if (legalActions.canCall) return { action: ActionType.Call, amount: legalActions.callAmount, reasoning: 'Calling' };
    if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Checking' };
  }

  // C-bet with air sometimes
  if (street === Street.Flop && rand() < 0.55) {
    if (legalActions.canBet) {
      const betSize = Math.min(
        Math.max(legalActions.minBet, Math.floor(potSize * 0.5)),
        legalActions.maxBet
      );
      return { action: ActionType.Bet, amount: betSize, reasoning: 'Continuation bet' };
    }
  }

  if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Checking weak hand' };
  return { action: ActionType.Fold, amount: 0, reasoning: 'Folding' };
}

/** LAG/Maniac: Loose/Aggressive. VPIP ~35%, AF ~80% */
export function lagManiacDecide(ctx: AIContext): AIDecisionResult {
  const { legalActions, handStrength, street, potSize, player } = ctx;

  // Preflop: Play wide and raise
  if (street === Street.Preflop) {
    if (handStrength < 0.20 && rand() < 0.6) {
      if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Even maniacs fold sometimes' };
      return { action: ActionType.Fold, amount: 0, reasoning: 'Folding worst hands' };
    }
    // Raise most of the time
    if (legalActions.canRaise && rand() < 0.75) {
      const raiseSize = Math.min(
        Math.max(legalActions.minRaise, Math.floor(potSize * (0.8 + rand() * 0.5))),
        legalActions.maxRaise
      );
      return { action: ActionType.Raise, amount: raiseSize, reasoning: 'Maniac raise!' };
    }
    if (legalActions.canBet) {
      const betSize = Math.min(
        Math.max(legalActions.minBet, Math.floor(potSize * 0.8)),
        legalActions.maxBet
      );
      return { action: ActionType.Bet, amount: betSize, reasoning: 'Aggressive open' };
    }
    if (legalActions.canCall) return { action: ActionType.Call, amount: legalActions.callAmount, reasoning: 'Calling' };
  }

  // Post-flop: Very aggressive, bluffs a lot
  if (rand() < 0.7) {
    if (legalActions.canRaise) {
      const raiseSize = Math.min(
        Math.max(legalActions.minRaise, Math.floor(potSize * (0.6 + rand() * 0.8))),
        legalActions.maxRaise
      );
      return { action: ActionType.Raise, amount: raiseSize, reasoning: 'Maniac aggression!' };
    }
    if (legalActions.canBet) {
      const betSize = Math.min(
        Math.max(legalActions.minBet, Math.floor(potSize * (0.5 + rand() * 0.7))),
        legalActions.maxBet
      );
      return { action: ActionType.Bet, amount: betSize, reasoning: 'Bluffing or value - who knows!' };
    }
  }

  if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Check' };
  if (legalActions.canCall && rand() < 0.7) return { action: ActionType.Call, amount: legalActions.callAmount, reasoning: 'Calling' };
  return { action: ActionType.Fold, amount: 0, reasoning: 'Even maniacs fold sometimes' };
}

/** GTO-Balanced: VPIP ~25%, AF ~60% */
export function gtoBalancedDecide(ctx: AIContext): AIDecisionResult {
  const { legalActions, handStrength, street, potSize } = ctx;
  const posCategory = getPositionCategory(ctx.position);

  // Preflop: Position-aware, balanced ranges
  if (street === Street.Preflop) {
    const threshold = posCategory === 'late' ? 0.45 : posCategory === 'middle' ? 0.55 : 0.60;
    if (handStrength < threshold) {
      if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Outside range' };
      return { action: ActionType.Fold, amount: 0, reasoning: 'Folding - not in range' };
    }

    // Mix between raising and calling
    if (rand() < 0.6 && handStrength > 0.55) {
      if (legalActions.canRaise) {
        const raiseSize = Math.min(
          Math.max(legalActions.minRaise, Math.floor(potSize * 0.66)),
          legalActions.maxRaise
        );
        return { action: ActionType.Raise, amount: raiseSize, reasoning: 'GTO raise' };
      }
    }

    if (legalActions.canCall) return { action: ActionType.Call, amount: legalActions.callAmount, reasoning: 'GTO call' };
    if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Check' };
  }

  // Post-flop: Balanced between value and bluffs
  const bluffFreq = 0.35;
  const shouldBluff = rand() < bluffFreq && handStrength < 0.3;

  if (handStrength > 0.55 || shouldBluff) {
    const betSizeMultiplier = handStrength > 0.7 ? 0.75 : 0.5;
    if (legalActions.canBet) {
      const betSize = Math.min(
        Math.max(legalActions.minBet, Math.floor(potSize * betSizeMultiplier)),
        legalActions.maxBet
      );
      return {
        action: ActionType.Bet,
        amount: betSize,
        reasoning: shouldBluff ? 'Balanced bluff' : 'Value bet',
      };
    }
    if (legalActions.canRaise && rand() < 0.5) {
      const raiseSize = Math.min(
        Math.max(legalActions.minRaise, Math.floor(potSize * 0.66)),
        legalActions.maxRaise
      );
      return { action: ActionType.Raise, amount: raiseSize, reasoning: 'GTO raise' };
    }
  }

  // Medium strength: check/call
  if (handStrength > 0.35) {
    if (legalActions.canCall) return { action: ActionType.Call, amount: legalActions.callAmount, reasoning: 'GTO call' };
    if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Check' };
  }

  if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Check' };
  return { action: ActionType.Fold, amount: 0, reasoning: 'GTO fold' };
}

/** Short Stack Specialist: Push/Fold under 20BB */
export function shortStackDecide(ctx: AIContext): AIDecisionResult {
  const { legalActions, handStrength, player, gameState } = ctx;
  const bb = gameState.config.bigBlind;
  const stackBBs = player.chips / bb;

  // Push/Fold mode when short-stacked
  if (stackBBs < 20) {
    const pushThreshold = stackBBs < 10 ? 0.35 : stackBBs < 15 ? 0.45 : 0.50;
    if (handStrength > pushThreshold) {
      return { action: ActionType.AllIn, amount: player.chips, reasoning: `Short stack push (${stackBBs.toFixed(0)} BB)` };
    }
    if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Check' };
    return { action: ActionType.Fold, amount: 0, reasoning: 'Fold - waiting for better spot' };
  }

  // If not short, play like a TAG
  return tagDecide(ctx);
}

/** Nit: Ultra-Tight. VPIP ~10%, only premium hands */
export function nitDecide(ctx: AIContext): AIDecisionResult {
  const { legalActions, handStrength, street } = ctx;

  // Preflop: Only top 10% hands
  if (street === Street.Preflop) {
    if (handStrength < 0.72) {
      if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Not premium enough' };
      return { action: ActionType.Fold, amount: 0, reasoning: 'Nit fold - waiting for premium' };
    }
    if (legalActions.canRaise) {
      const raiseSize = Math.min(legalActions.minRaise, legalActions.maxRaise);
      return { action: ActionType.Raise, amount: raiseSize, reasoning: 'Premium hand raise' };
    }
    if (legalActions.canCall) return { action: ActionType.Call, amount: legalActions.callAmount, reasoning: 'Calling with premium' };
  }

  // Post-flop: Only continues with very strong hands
  if (handStrength > 0.65) {
    if (legalActions.canBet) {
      return { action: ActionType.Bet, amount: legalActions.minBet, reasoning: 'Nit value bet' };
    }
    if (legalActions.canCall) return { action: ActionType.Call, amount: legalActions.callAmount, reasoning: 'Calling with strong hand' };
    if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Trapping' };
  }

  if (legalActions.canCheck) return { action: ActionType.Check, amount: 0, reasoning: 'Check' };
  return { action: ActionType.Fold, amount: 0, reasoning: 'Nit fold' };
}

// ============================================================
// Main AI Decision Router
// ============================================================

import { AIPersonalityType } from '../engine/types';

const PERSONALITY_HANDLERS: Record<AIPersonalityType, (ctx: AIContext) => AIDecisionResult> = {
  [AIPersonalityType.Rock]: rockDecide,
  [AIPersonalityType.CallingStation]: callingStationDecide,
  [AIPersonalityType.TAG]: tagDecide,
  [AIPersonalityType.LAGManiac]: lagManiacDecide,
  [AIPersonalityType.GTOBalanced]: gtoBalancedDecide,
  [AIPersonalityType.ShortStack]: shortStackDecide,
  [AIPersonalityType.Nit]: nitDecide,
};

export function getAIDecision(
  personality: AIPersonalityType,
  gameState: GameState,
  player: Player,
  position: Position,
  legalActions: LegalActions,
): AIDecisionResult {
  const ctx = createAIContext(gameState, player, position, legalActions);
  const handler = PERSONALITY_HANDLERS[personality];
  const result = handler(ctx);

  // Validate the action is legal
  if (result.action === ActionType.Fold && !legalActions.canFold) {
    if (legalActions.canCheck) return { ...result, action: ActionType.Check, amount: 0 };
  }
  if (result.action === ActionType.Check && !legalActions.canCheck) {
    if (legalActions.canCall) return { ...result, action: ActionType.Call, amount: legalActions.callAmount };
    return { ...result, action: ActionType.Fold, amount: 0 };
  }
  if (result.action === ActionType.Call && !legalActions.canCall) {
    if (legalActions.canCheck) return { ...result, action: ActionType.Check, amount: 0 };
    return { ...result, action: ActionType.Fold, amount: 0 };
  }
  if (result.action === ActionType.Bet && !legalActions.canBet) {
    if (legalActions.canRaise) {
      return { ...result, action: ActionType.Raise, amount: Math.min(result.amount, legalActions.maxRaise) };
    }
    if (legalActions.canCall) return { ...result, action: ActionType.Call, amount: legalActions.callAmount };
    if (legalActions.canCheck) return { ...result, action: ActionType.Check, amount: 0 };
  }
  if (result.action === ActionType.Raise && !legalActions.canRaise) {
    if (legalActions.canBet) {
      return { ...result, action: ActionType.Bet, amount: Math.min(result.amount, legalActions.maxBet) };
    }
    if (legalActions.canCall) return { ...result, action: ActionType.Call, amount: legalActions.callAmount };
    if (legalActions.canCheck) return { ...result, action: ActionType.Check, amount: 0 };
  }

  return result;
}
