import {
  GameState, Player, ActionType, LegalActions, Card, Street,
  Rank, HandCategory, Position, AIPersonalityType, PlayerStatus,
} from '../engine/types';
import { evaluateHand } from '../engine/evaluator/HandEvaluator';
import { getTotalPot } from '../engine/game/PotManager';
import { getPositionCategory } from '../engine/utils/position';

export interface AIDecisionResult {
  action: ActionType;
  amount: number;
  reasoning: string;
  /** Empfohlene "Nachdenkzeit" in ms — schwere Entscheidungen dauern länger */
  thinkTimeMs: number;
}

export interface AIDecisionOptions {
  /** Ohne Zufall entscheiden (für Trainings-Feedback und Quiz) */
  deterministic?: boolean;
}

// ============================================================
// Persönlichkeits-Profile — ein gemeinsamer Entscheidungskern,
// parametrisiert statt sieben getrennte Ad-hoc-Funktionen
// ============================================================

interface PersonalityProfile {
  playThreshold: number;     // Chen-Stärke ab der eine Hand gespielt wird
  openThreshold: number;     // Stärke ab der selbst erhöht wird
  threeBetThreshold: number; // Stärke für Re-Raise preflop
  aggression: number;        // 0-1: Bet-/Raise-Neigung postflop
  bluffFreq: number;         // 0-1: Bluff-Häufigkeit
  stickiness: number;        // 0-1: Calling-Neigung mit schwachen Händen
  sizing: number;            // Multiplikator für Einsatzgrößen
  trapFreq: number;          // 0-1: Monster langsam spielen
}

/**
 * Kalibrierung nach Profi-Review (12.07.2026): Ziel-VPIP 7-max —
 * Nit ~13 %, Rock ~17 %, TAG ~21 %, GTO ~23 %, LAG ~35 %, Station ~45 %.
 * raiseOrFold: gespielte Hände werden eröffnet, nicht gelimpt (TAG/GTO).
 */
interface PersonalityProfileExt extends PersonalityProfile {
  raiseOrFold: boolean;
}

const PROFILES: Record<AIPersonalityType, PersonalityProfileExt> = {
  [AIPersonalityType.Nit]: {
    playThreshold: 0.34, openThreshold: 0.40, threeBetThreshold: 0.62,
    aggression: 0.35, bluffFreq: 0.03, stickiness: 0.1, sizing: 0.85, trapFreq: 0.35,
    raiseOrFold: false,
  },
  [AIPersonalityType.Rock]: {
    playThreshold: 0.29, openThreshold: 0.35, threeBetThreshold: 0.58,
    aggression: 0.35, bluffFreq: 0.05, stickiness: 0.2, sizing: 0.9, trapFreq: 0.25,
    raiseOrFold: false,
  },
  [AIPersonalityType.TAG]: {
    playThreshold: 0.30, openThreshold: 0.30, threeBetThreshold: 0.52,
    aggression: 0.7, bluffFreq: 0.22, stickiness: 0.3, sizing: 1.0, trapFreq: 0.12,
    raiseOrFold: true,
  },
  [AIPersonalityType.GTOBalanced]: {
    playThreshold: 0.28, openThreshold: 0.28, threeBetThreshold: 0.50,
    aggression: 0.6, bluffFreq: 0.28, stickiness: 0.4, sizing: 1.0, trapFreq: 0.15,
    raiseOrFold: true,
  },
  [AIPersonalityType.LAGManiac]: {
    playThreshold: 0.23, openThreshold: 0.26, threeBetThreshold: 0.42,
    aggression: 0.85, bluffFreq: 0.45, stickiness: 0.55, sizing: 1.2, trapFreq: 0.05,
    raiseOrFold: false,
  },
  [AIPersonalityType.CallingStation]: {
    playThreshold: 0.18, openThreshold: 0.50, threeBetThreshold: 0.68,
    aggression: 0.15, bluffFreq: 0.03, stickiness: 0.9, sizing: 0.8, trapFreq: 0.3,
    raiseOrFold: false,
  },
  [AIPersonalityType.ShortStack]: {
    playThreshold: 0.30, openThreshold: 0.34, threeBetThreshold: 0.54,
    aggression: 0.65, bluffFreq: 0.12, stickiness: 0.25, sizing: 1.0, trapFreq: 0.08,
    raiseOrFold: true,
  },
};

// ============================================================
// Preflop-Handstärke (Chen-Formel, normiert 0-1)
// AA=1.0 · KK=0.8 · AKs=0.6 · AKo=0.5 · 22=0.25 · 72o=0
// ============================================================

export function chenStrength(c1: Card, c2: Card): number {
  const high = Math.max(c1.rank, c2.rank);
  const low = Math.min(c1.rank, c2.rank);
  const suited = c1.suit === c2.suit;
  const paired = c1.rank === c2.rank;

  const highCardPoints = (r: Rank): number => {
    if (r === Rank.Ace) return 10;
    if (r === Rank.King) return 8;
    if (r === Rank.Queen) return 7;
    if (r === Rank.Jack) return 6;
    return r / 2;
  };

  let score = highCardPoints(high as Rank);

  if (paired) {
    score = Math.max(5, score * 2);
  } else {
    if (suited) score += 2;
    const gap = high - low - 1;
    if (gap === 1) score -= 1;
    else if (gap === 2) score -= 2;
    else if (gap === 3) score -= 4;
    else if (gap >= 4) score -= 5;
    // Straight-Potenzial kleiner Connectors
    if (gap <= 1 && high < Rank.Queen) score += 1;
  }

  return Math.max(0, Math.min(1, Math.ceil(score * 2) / 2 / 20));
}

// ============================================================
// Postflop-Handstärke relativ zum Board (0-1)
// ============================================================

interface PostflopEval {
  strength: number;          // Stärke der gemachten Hand
  category: HandCategory;
  flushDraw: boolean;
  straightDraw: 'open' | 'gutshot' | null;
  outs: number;
  description: string;
}

function boardRankCounts(board: Card[]): Map<Rank, number> {
  const counts = new Map<Rank, number>();
  for (const c of board) counts.set(c.rank, (counts.get(c.rank) || 0) + 1);
  return counts;
}

function detectDraws(hole: [Card, Card], board: Card[]): { flushDraw: boolean; straightDraw: 'open' | 'gutshot' | null; outs: number } {
  if (board.length >= 5) return { flushDraw: false, straightDraw: null, outs: 0 };

  const all = [...hole, ...board];

  // Flush Draw: genau 4 Karten einer Farbe, mindestens eine davon aus der Hand
  const suitCounts = new Map<string, number>();
  for (const c of all) suitCounts.set(c.suit, (suitCounts.get(c.suit) || 0) + 1);
  let flushDraw = false;
  for (const [suit, count] of suitCounts) {
    if (count === 4 && hole.some(c => c.suit === suit)) flushDraw = true;
  }

  // Straight Draw über Rang-Fenster (Ass zählt oben und unten)
  const ranks = new Set<number>(all.map(c => c.rank));
  if (ranks.has(Rank.Ace)) ranks.add(1);
  const completers = new Set<number>();
  for (let high = 5; high <= 14; high++) {
    const window: number[] = [];
    for (let r = high - 4; r <= high; r++) window.push(r);
    const missing = window.filter(r => !ranks.has(r));
    if (missing.length === 1) completers.add(missing[0]);
  }
  let straightDraw: 'open' | 'gutshot' | null = null;
  if (completers.size >= 2) straightDraw = 'open';
  else if (completers.size === 1) straightDraw = 'gutshot';

  let outs = 0;
  if (flushDraw) outs += 9;
  if (straightDraw === 'open') outs += flushDraw ? 6 : 8; // Überschneidung grob abziehen
  else if (straightDraw === 'gutshot') outs += flushDraw ? 3 : 4;

  return { flushDraw, straightDraw, outs: Math.min(outs, 15) };
}

function postflopEval(hole: [Card, Card], board: Card[]): PostflopEval {
  const evaluated = evaluateHand([...hole, ...board]);
  const draws = detectDraws(hole, board);
  const boardCounts = boardRankCounts(board);
  const maxBoardRank = Math.max(...board.map(c => c.rank));
  const boardPaired = [...boardCounts.values()].some(n => n >= 2);

  let s: number;

  switch (evaluated.category) {
    case HandCategory.HighCard: {
      const overcards = hole.filter(c => c.rank > maxBoardRank).length;
      s = 0.08 + overcards * 0.04;
      break;
    }
    case HandCategory.OnePair: {
      const isPocket = hole[0].rank === hole[1].rank;
      const pairFromBoardOnly = !isPocket &&
        !hole.some(c => (boardCounts.get(c.rank) || 0) >= 1);
      if (pairFromBoardOnly) {
        // Das Paar liegt auf dem Board — wir haben effektiv nichts
        s = 0.14 + (hole.some(c => c.rank >= Rank.King) ? 0.05 : 0);
      } else if (isPocket) {
        s = hole[0].rank > maxBoardRank ? 0.56 : 0.32; // Overpair vs. Underpair
      } else {
        const pairRank = hole.find(c => (boardCounts.get(c.rank) || 0) >= 1)?.rank || 0;
        const kicker = Math.max(hole[0].rank, hole[1].rank);
        if (pairRank === maxBoardRank) s = 0.50 + (kicker === Rank.Ace ? 0.05 : 0); // Top Pair
        else s = 0.34; // Middle/Bottom Pair
      }
      break;
    }
    case HandCategory.TwoPair:
      s = boardPaired ? 0.48 : 0.64;
      break;
    case HandCategory.ThreeOfAKind: {
      const isSet = hole[0].rank === hole[1].rank;
      s = isSet ? 0.78 : 0.68;
      break;
    }
    case HandCategory.Straight: s = 0.82; break;
    case HandCategory.Flush: s = 0.86; break;
    case HandCategory.FullHouse: s = 0.92; break;
    case HandCategory.FourOfAKind: s = 0.97; break;
    default: s = 1.0; break; // Straight/Royal Flush
  }

  return {
    strength: s,
    category: evaluated.category,
    flushDraw: draws.flushDraw,
    straightDraw: draws.straightDraw,
    outs: draws.outs,
    description: evaluated.description,
  };
}

// ============================================================
// Kontext & Hilfsfunktionen
// ============================================================

interface DecisionContext {
  state: GameState;
  player: Player;
  profile: PersonalityProfileExt;
  legal: LegalActions;
  pot: number;            // Gesamttopf inkl. laufender Einsätze
  toCall: number;
  bb: number;
  stackBB: number;
  posCategory: 'early' | 'middle' | 'late' | 'blinds';
}

/** Austauschbare Zufallsquelle — 0.5 im deterministischen Modus (Training/Quiz) */
let rng: () => number = Math.random;

function rand(): number { return rng(); }

/** Zufällige Variation ±12 % für natürlichere Einsatzgrößen */
function jitter(amount: number): number {
  return Math.round(amount * (0.88 + rand() * 0.24));
}

function clampBet(amount: number, min: number, max: number): number {
  return Math.max(min, Math.min(amount, max));
}

function fold(reason: string): AIDecisionResult {
  return { action: ActionType.Fold, amount: 0, reasoning: reason, thinkTimeMs: 0 };
}
function check(reason: string): AIDecisionResult {
  return { action: ActionType.Check, amount: 0, reasoning: reason, thinkTimeMs: 0 };
}
function call(ctx: DecisionContext, reason: string): AIDecisionResult {
  return { action: ActionType.Call, amount: ctx.legal.callAmount, reasoning: reason, thinkTimeMs: 0 };
}
function allIn(ctx: DecisionContext, reason: string): AIDecisionResult {
  return { action: ActionType.AllIn, amount: ctx.player.chips, reasoning: reason, thinkTimeMs: 0 };
}

/** Passive Rückfalloption: checken wenn möglich, sonst folden */
function checkOrFold(ctx: DecisionContext, reason: string): AIDecisionResult {
  if (ctx.legal.canCheck) return check(reason);
  return fold(reason);
}

/**
 * Bet/Raise auf eine Ziel-Gesamthöhe. Kapselt die Engine-Semantik:
 * `amount` ist immer der Betrag, der zusätzlich in den Pot gelegt wird.
 * Verhindert versehentliche Overbets und wandelt nur bewusst in All-in um.
 */
function betOrRaiseTo(
  ctx: DecisionContext,
  targetTotal: number,
  reason: string,
  allowAllIn: boolean,
): AIDecisionResult {
  const { legal, player } = ctx;
  const putIn = targetTotal - player.currentBet;

  if (legal.canBet) {
    let amount = clampBet(jitter(putIn), legal.minBet, legal.maxBet);
    if (amount >= player.chips * 0.85) {
      if (allowAllIn) return allIn(ctx, reason);
      amount = clampBet(Math.floor(player.chips * 0.5), legal.minBet, legal.maxBet);
    }
    return { action: ActionType.Bet, amount, reasoning: reason, thinkTimeMs: 0 };
  }

  if (legal.canRaise) {
    let amount = clampBet(jitter(putIn), legal.minRaise, legal.maxRaise);
    if (amount >= player.chips * 0.85) {
      if (allowAllIn) return allIn(ctx, reason);
      // Zu teuer für den geplanten Raise → lieber nur callen
      if (legal.canCall) return call(ctx, reason + ' (Raise wäre zu teuer — Call)');
      amount = legal.minRaise;
    }
    return { action: ActionType.Raise, amount, reasoning: reason, thinkTimeMs: 0 };
  }

  if (legal.canCall) return call(ctx, reason);
  return checkOrFold(ctx, reason);
}

// ============================================================
// Preflop-Entscheidung
// ============================================================

function decidePreflop(ctx: DecisionContext, strength: number): AIDecisionResult {
  const { profile, legal, state, pot, toCall, bb, stackBB, posCategory } = ctx;

  // Positionsanpassung: früh enger, spät weiter
  const posAdjust = posCategory === 'early' ? 0.05 : posCategory === 'late' ? -0.05 : 0;
  const playThreshold = profile.playThreshold + posAdjust;

  // Short-Stack-Modus: Push/Fold unter 15 BB
  if (stackBB < 15) {
    const pushThreshold = stackBB < 8 ? 0.33 : stackBB < 12 ? 0.42 : 0.48;
    if (strength >= pushThreshold) {
      return allIn(ctx, `Short Stack (${stackBB.toFixed(0)} BB) — Push mit spielbarer Hand`);
    }
    if (legal.canCheck) return check('Short Stack — gratis ansehen');
    return fold(`Short Stack (${stackBB.toFixed(0)} BB) — auf bessere Hand warten`);
  }

  const highestBet = Math.max(...state.players.map(p => p.currentBet));
  const raiseLevel = highestBet / bb; // 1 = nur Blinds, >2 = jemand hat erhöht
  const facingRaise = raiseLevel > 1.01;

  // Gegen Erhöhungen wird die Anforderung höher (je größer der Raise, desto enger)
  const tightening = facingRaise ? Math.min(0.25, 0.06 * Math.log2(Math.max(raiseLevel, 2))) : 0;
  const continueThreshold = playThreshold + tightening - profile.stickiness * 0.06;

  if (strength < continueThreshold) {
    if (legal.canCheck) return check('Schwache Hand — gratis im Big Blind');
    // Stations schauen sich billige Flops trotzdem gern an
    if (profile.stickiness > 0.7 && toCall <= bb * 2 && strength >= 0.12 && legal.canCall) {
      return call(ctx, 'Billiger Flop — mal reinschauen');
    }
    return fold(facingRaise ? 'Zu schwach gegen die Erhöhung' : 'Hand außerhalb der Range');
  }

  // Bereits investiert und erneut erhöht worden? Nur mit Premium weiter eskalieren.
  const gotReRaised = ctx.player.currentBet > bb && toCall > 0;
  if (gotReRaised && strength < 0.75) {
    const potOdds = toCall / (pot + toCall);
    if (strength >= continueThreshold + 0.08 || potOdds < 0.25) {
      return call(ctx, 'Re-Raise — mit solider Hand mitgehen');
    }
    return fold('Re-Raise — Hand reicht nicht zum Weiterspielen');
  }

  // Premium gegen massive Action: All-in ist gerechtfertigt
  if (strength >= 0.8 && raiseLevel >= 8) {
    return allIn(ctx, 'Premium-Hand gegen starke Action — All-in');
  }

  // Re-Raise (3-Bet) mit starker Hand
  if (facingRaise && strength >= profile.threeBetThreshold && legal.canRaise && rand() < 0.7) {
    // Standardgröße: 3× des vorherigen Raises
    const target = Math.round(highestBet * (2.6 + rand() * 0.8) * profile.sizing);
    return betOrRaiseTo(ctx, target, '3-Bet mit starker Hand', strength >= 0.8);
  }

  // Selbst eröffnen — aggressive Profile raisen JEDE gespielte Hand (kein Limpen)
  const openProb = profile.raiseOrFold ? 1 : 0.4 + profile.aggression * 0.5;
  if (!facingRaise && strength >= profile.openThreshold + posAdjust && legal.canRaise && rand() < openProb) {
    const limpers = state.players.filter(p =>
      p.currentBet === bb && p.status === PlayerStatus.Active && p.id !== ctx.player.id).length;
    const target = Math.round(bb * (2.5 + limpers) * profile.sizing);
    return betOrRaiseTo(ctx, target, 'Open Raise aus ' + posCategory + ' Position', false);
  }

  // Raise-or-Fold-Profile limpen nicht — außer gratis im Big Blind
  if (!facingRaise && profile.raiseOrFold && !legal.canCheck) {
    return fold('Kein Limp — Hand nicht stark genug für einen Raise');
  }

  // Mitgehen
  if (legal.canCall) {
    const potOdds = toCall / (pot + toCall);
    if (strength >= continueThreshold || potOdds < 0.2 + profile.stickiness * 0.15) {
      return call(ctx, facingRaise ? 'Call der Erhöhung — Hand ist gut genug' : 'Limp — Flop ansehen');
    }
    return fold('Preis für den Call ist zu hoch');
  }

  if (legal.canCheck) return check('Option im Big Blind');
  return fold('Keine sinnvolle Aktion');
}

// ============================================================
// Postflop-Entscheidung
// ============================================================

function decidePostflop(ctx: DecisionContext, hand: PostflopEval): AIDecisionResult {
  const { profile, legal, state, pot, toCall } = ctx;
  const s = hand.strength;
  const street = state.street;

  // Draw-Equity nach Rule of 4 und 2
  const streetFactor = street === Street.Flop ? 0.04 : 0.02;
  const drawEquity = hand.outs * streetFactor;
  const equity = Math.min(0.95, s * 0.85 + drawEquity);

  const drawLabel = hand.flushDraw
    ? 'Flush Draw'
    : hand.straightDraw === 'open' ? 'Straight Draw' : hand.straightDraw === 'gutshot' ? 'Gutshot' : '';

  // ── Niemand hat gesetzt ────────────────────────────────────
  if (toCall <= 0) {
    // Monster gelegentlich langsam spielen
    if (s >= 0.85 && rand() < profile.trapFreq) {
      return check('Monster — Falle stellen');
    }
    // Value Bet
    if (s >= 0.5 && rand() < 0.35 + profile.aggression * 0.55) {
      const frac = s >= 0.75 ? 0.7 : 0.55;
      return betOrRaiseTo(ctx, Math.round(pot * frac * profile.sizing), `Value Bet (${hand.description})`, s >= 0.85);
    }
    // Semi-Bluff mit Draw
    if (hand.outs >= 8 && rand() < profile.aggression * 0.6) {
      return betOrRaiseTo(ctx, Math.round(pot * 0.55 * profile.sizing), `Semi-Bluff mit ${drawLabel}`, false);
    }
    // Reiner Bluff — auch am River (dort etwas seltener, aber nie 0 %)
    const bluffProb = street === Street.River ? profile.bluffFreq * 0.3 : profile.bluffFreq * 0.4;
    if (s < 0.3 && rand() < bluffProb) {
      const frac = street === Street.River ? 0.65 : 0.5;
      return betOrRaiseTo(ctx, Math.round(pot * frac), street === Street.River ? 'River-Bluff — nur Fold-Equity zählt' : 'Bluff — Initiative übernehmen', false);
    }
    // River-Value dünn
    if (street === Street.River && s >= 0.45 && rand() < profile.aggression * 0.4) {
      return betOrRaiseTo(ctx, Math.round(pot * 0.45 * profile.sizing), 'Dünne Value Bet am River', false);
    }
    return check(s >= 0.4 ? 'Pot-Kontrolle mit mittlerer Hand' : 'Check — nichts getroffen');
  }

  // ── Jemand hat gesetzt ─────────────────────────────────────
  const potOdds = toCall / (pot + toCall);
  const heavyBet = toCall > pot * 0.85;
  const committed = toCall >= ctx.player.chips * 0.55;
  const gotReRaised = ctx.player.currentBet > 0; // wir hatten diese Street schon gesetzt

  // Sehr starke Hand: Raise oder All-in
  if (s >= 0.8) {
    if (committed || (heavyBet && s >= 0.85)) {
      return allIn(ctx, `${hand.description} — All-in ist klar profitabel`);
    }
    if (legal.canRaise && rand() < profile.aggression * 0.8 && !gotReRaised) {
      const target = ctx.player.currentBet + toCall + Math.round(pot * 0.8 * profile.sizing);
      return betOrRaiseTo(ctx, target, `Value Raise (${hand.description})`, true);
    }
    return call(ctx, `${hand.description} — stark genug für jeden Call`);
  }

  // Nach Re-Raise nicht weiter eskalieren, nur nach Odds entscheiden
  if (gotReRaised) {
    if (equity > potOdds + 0.05 || (s >= 0.55 && !heavyBet)) {
      return call(ctx, 'Gegen Re-Raise mitgehen — Odds stimmen');
    }
    return fold('Re-Raise signalisiert Stärke — aussteigen');
  }

  // Gute gemachte Hand
  if (s >= 0.5) {
    if (legal.canRaise && !heavyBet && rand() < profile.aggression * 0.35) {
      const target = ctx.player.currentBet + toCall + Math.round(pot * 0.6 * profile.sizing);
      return betOrRaiseTo(ctx, target, `Raise mit ${hand.description}`, false);
    }
    if (equity > potOdds * 0.75 || !heavyBet) {
      return call(ctx, `Call mit ${hand.description}`);
    }
    // Bluff-Catcher gegen Overbets: gute Hände nicht reflexhaft wegwerfen —
    // sonst ist jede große Bet ein Gratis-Bluff (Profi-Review A4)
    if (!committed && rand() < 0.35 + profile.stickiness * 0.45) {
      return call(ctx, `Bluff-Catcher — ${hand.description} gegen die Overbet`);
    }
    return fold('Großer Einsatz — Hand könnte geschlagen sein');
  }

  // Draws nach Pot Odds spielen
  if (hand.outs >= 4) {
    if (drawEquity > potOdds) {
      // Gelegentlich als Semi-Bluff-Raise
      if (hand.outs >= 8 && legal.canRaise && !heavyBet && rand() < profile.aggression * profile.bluffFreq) {
        const target = ctx.player.currentBet + toCall + Math.round(pot * 0.7);
        return betOrRaiseTo(ctx, target, `Semi-Bluff-Raise mit ${drawLabel}`, false);
      }
      return call(ctx, `${drawLabel} — Pot Odds rechtfertigen den Call`);
    }
    if (profile.stickiness > 0.6 && toCall <= pot * 0.4) {
      return call(ctx, `${drawLabel} — optimistischer Call`);
    }
    return fold(`${drawLabel} — Preis ist zu hoch`);
  }

  // Mittlere Hand: kleiner Einsatz wird bezahlt, Overbets gelegentlich gesnappt
  if (s >= 0.3) {
    if (potOdds < 0.22 + profile.stickiness * 0.2 && !committed) {
      return call(ctx, 'Kleiner Einsatz — mit mittlerer Hand mitgehen');
    }
    if (heavyBet && !committed && rand() < profile.stickiness * 0.4) {
      return call(ctx, 'Misstrauischer Call — die Overbet riecht nach Bluff');
    }
    return fold('Mittlere Hand — Einsatz zu groß');
  }

  // Schwache Hand: Stations callen kleine Bets oft (aber nicht zu 100 % — sonst
  // sind sie mechanisch schlagbar, Profi-Review A6)
  if (profile.stickiness > 0.75 && toCall <= pot * 0.4 && !committed && rand() < 0.75) {
    return call(ctx, 'Station-Call — vielleicht blufft er ja');
  }
  if (!heavyBet && street !== Street.River && legal.canRaise && rand() < profile.bluffFreq * 0.15) {
    const target = ctx.player.currentBet + toCall + Math.round(pot * 0.75);
    return betOrRaiseTo(ctx, target, 'Bluff-Raise — Druck aufbauen', false);
  }
  return fold('Nichts getroffen — Fold');
}

// ============================================================
// Haupteinstieg
// ============================================================

export function getAIDecision(
  personality: AIPersonalityType,
  gameState: GameState,
  player: Player,
  position: Position,
  legalActions: LegalActions,
  options?: AIDecisionOptions,
): AIDecisionResult {
  const profile = PROFILES[personality];
  const bb = gameState.config.bigBlind;
  const pot = getTotalPot(gameState.pots) +
    gameState.players.reduce((sum, p) => sum + p.currentBet, 0);

  const ctx: DecisionContext = {
    state: gameState,
    player,
    profile,
    legal: legalActions,
    pot: Math.max(pot, bb),
    toCall: legalActions.callAmount,
    bb,
    stackBB: player.chips / bb,
    posCategory: getPositionCategory(position),
  };

  // Deterministischer Modus: gleiche Situation → gleiche Empfehlung
  if (options?.deterministic) rng = () => 0.5;

  let result: AIDecisionResult;
  try {
    if (!player.holeCards) {
      result = checkOrFold(ctx, 'Keine Karten');
    } else if (gameState.street === Street.Preflop) {
      result = decidePreflop(ctx, chenStrength(player.holeCards[0], player.holeCards[1]));
    } else {
      result = decidePostflop(ctx, postflopEval(player.holeCards, gameState.communityCards));
    }
  } finally {
    rng = Math.random;
  }

  const validated = validateDecision(result, ctx);
  return { ...validated, thinkTimeMs: computeThinkTime(validated, ctx) };
}

/**
 * Wie lange "denkt" die KI? Leichte Entscheidungen gehen schnell,
 * große Entscheidungen (hoher Einsatz relativ zu Pot/Stack) dauern —
 * so fühlt sich das Timing wie Nachdenken an, nicht wie ein Timer.
 */
function computeThinkTime(result: AIDecisionResult, ctx: DecisionContext): number {
  const { toCall, pot, player } = ctx;
  const vary = (base: number, spread: number) => Math.round(base + Math.random() * spread);

  // Schwere der Situation: was steht relativ zu Pot und Stack auf dem Spiel?
  const stakePressure = Math.min(1,
    (toCall / Math.max(pot, 1)) * 0.5 +
    (toCall / Math.max(player.chips, 1)) * 0.9);

  switch (result.action) {
    case ActionType.Fold:
      // Müll wegwerfen geht schnell — schwere Folds dauern
      return vary(350 + stakePressure * 2500, 400);
    case ActionType.Check:
      return vary(500, 700);
    case ActionType.Call:
      return vary(700 + stakePressure * 3000, 600);
    case ActionType.Bet:
    case ActionType.Raise:
      return vary(1100 + stakePressure * 2200, 900);
    case ActionType.AllIn:
      return vary(2200 + stakePressure * 2800, 1200);
    default:
      return vary(800, 400);
  }
}

/** Stellt sicher, dass die gewählte Aktion legal ist — sonst nächstbeste Alternative */
function validateDecision(result: AIDecisionResult, ctx: DecisionContext): AIDecisionResult {
  const legal = ctx.legal;

  switch (result.action) {
    case ActionType.Fold:
      if (legal.canCheck) return { ...result, action: ActionType.Check, amount: 0 };
      return result;
    case ActionType.Check:
      if (legal.canCheck) return result;
      if (legal.canCall) return { ...result, action: ActionType.Call, amount: legal.callAmount };
      return { ...result, action: ActionType.Fold, amount: 0 };
    case ActionType.Call:
      if (legal.canCall) return { ...result, amount: legal.callAmount };
      if (legal.canCheck) return { ...result, action: ActionType.Check, amount: 0 };
      return { ...result, action: ActionType.Fold, amount: 0 };
    case ActionType.Bet:
      if (legal.canBet) return { ...result, amount: clampBet(result.amount, legal.minBet, legal.maxBet) };
      if (legal.canRaise) return { ...result, action: ActionType.Raise, amount: clampBet(result.amount, legal.minRaise, legal.maxRaise) };
      if (legal.canCall) return { ...result, action: ActionType.Call, amount: legal.callAmount };
      if (legal.canCheck) return { ...result, action: ActionType.Check, amount: 0 };
      return { ...result, action: ActionType.Fold, amount: 0 };
    case ActionType.Raise:
      if (legal.canRaise) return { ...result, amount: clampBet(result.amount, legal.minRaise, legal.maxRaise) };
      if (legal.canBet) return { ...result, action: ActionType.Bet, amount: clampBet(result.amount, legal.minBet, legal.maxBet) };
      if (legal.canCall) return { ...result, action: ActionType.Call, amount: legal.callAmount };
      if (legal.canCheck) return { ...result, action: ActionType.Check, amount: 0 };
      return { ...result, action: ActionType.Fold, amount: 0 };
    case ActionType.AllIn:
      if (ctx.player.chips > 0) return { ...result, amount: ctx.player.chips };
      if (legal.canCheck) return { ...result, action: ActionType.Check, amount: 0 };
      return { ...result, action: ActionType.Fold, amount: 0 };
    default:
      return result;
  }
}
