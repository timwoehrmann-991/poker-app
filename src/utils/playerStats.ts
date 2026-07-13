import { HandRecord, ActionType, Street } from '../engine/types';

export interface PlayerStats {
  handsPlayed: number;
  handsWon: number;
  vpip: number;             // % Hände mit freiwilligem Einsatz preflop
  pfr: number;              // % Hände mit Preflop-Raise
  aggressionFactor: number; // (Bets+Raises)/Calls
  totalProfit: number;
  biggestPot: number;
  showdownWins: number;
  showdowns: number;
  /** % Folds, wenn preflop eine Erhöhung vor dem Spieler kam */
  foldToRaisePreflop: number;
  /** % Folds auf Bets/Raises postflop */
  foldToBetPostflop: number;
  /** Went to Showdown: % der gespielten Hände, die der Spieler bis zum Showdown brachte */
  wtsd: number;
}

const EMPTY: PlayerStats = {
  handsPlayed: 0, handsWon: 0, vpip: 0, pfr: 0, aggressionFactor: 0,
  totalProfit: 0, biggestPot: 0, showdownWins: 0, showdowns: 0,
  foldToRaisePreflop: 0, foldToBetPostflop: 0, wtsd: 0,
};

export function calculatePlayerStats(history: HandRecord[], playerId: string): PlayerStats {
  if (history.length === 0) return { ...EMPTY };

  let handsPlayed = 0;
  let handsWon = 0;
  let vpipCount = 0;
  let pfrCount = 0;
  let betsRaises = 0;
  let calls = 0;
  let totalProfit = 0;
  let biggestPot = 0;
  let showdownWins = 0;
  let showdowns = 0;
  let facedPreflopRaise = 0;
  let foldedToPreflopRaise = 0;
  let facedPostflopBet = 0;
  let foldedToPostflopBet = 0;
  let voluntaryHands = 0;
  let wentToShowdown = 0;

  for (const hand of history) {
    const playerInfo = hand.players.find(p => p.id === playerId);
    if (!playerInfo) continue;

    handsPlayed++;

    const winResult = hand.winners.find(w => w.playerId === playerId);
    if (winResult) {
      handsWon++;
      biggestPot = Math.max(biggestPot, winResult.amount);
    }

    const wonAmount = hand.winners
      .filter(w => w.playerId === playerId)
      .reduce((sum, w) => sum + w.amount, 0);
    const invested = hand.actions
      .filter(a => a.playerId === playerId && a.amount > 0)
      .reduce((sum, a) => sum + a.amount, 0);
    totalProfit += wonAmount - invested;

    // VPIP / PFR (ohne Blind-Posts)
    const ownPreflop = hand.actions.filter(
      a => a.playerId === playerId && a.street === Street.Preflop &&
      a.type !== ActionType.PostSmallBlind && a.type !== ActionType.PostBigBlind
    );
    const voluntary = ownPreflop.some(
      a => a.type === ActionType.Call || a.type === ActionType.Raise ||
           a.type === ActionType.Bet || a.type === ActionType.AllIn
    );
    if (voluntary) { vpipCount++; voluntaryHands++; }
    if (ownPreflop.some(a => a.type === ActionType.Raise || a.type === ActionType.AllIn)) pfrCount++;

    // Fold-Frequenzen: gab es vor der eigenen Aktion Aggression?
    let sawPreflopRaise = false;
    let sawPostflopBet = false;
    for (const action of hand.actions) {
      const isOwn = action.playerId === playerId;
      const preflop = action.street === Street.Preflop;
      const aggressive = action.type === ActionType.Raise || action.type === ActionType.Bet || action.type === ActionType.AllIn;

      if (!isOwn && aggressive) {
        if (preflop) sawPreflopRaise = true;
        else sawPostflopBet = true;
        continue;
      }
      if (!isOwn) continue;

      if (preflop && sawPreflopRaise &&
          (action.type === ActionType.Fold || action.type === ActionType.Call || action.type === ActionType.Raise || action.type === ActionType.AllIn)) {
        facedPreflopRaise++;
        if (action.type === ActionType.Fold) foldedToPreflopRaise++;
        sawPreflopRaise = false;
      }
      if (!preflop && sawPostflopBet &&
          (action.type === ActionType.Fold || action.type === ActionType.Call || action.type === ActionType.Raise || action.type === ActionType.AllIn)) {
        facedPostflopBet++;
        if (action.type === ActionType.Fold) foldedToPostflopBet++;
        sawPostflopBet = false;
      }

      if (action.type === ActionType.Bet || action.type === ActionType.Raise) betsRaises++;
      if (action.type === ActionType.Call) calls++;
    }

    // Showdown-Statistik
    if (hand.finalStreet === Street.Showdown) {
      const folded = hand.actions.some(a => a.playerId === playerId && a.type === ActionType.Fold);
      if (!folded) {
        showdowns++;
        wentToShowdown += voluntary ? 1 : 0;
        if (winResult) showdownWins++;
      }
    }
  }

  return {
    handsPlayed,
    handsWon,
    vpip: handsPlayed > 0 ? (vpipCount / handsPlayed) * 100 : 0,
    pfr: handsPlayed > 0 ? (pfrCount / handsPlayed) * 100 : 0,
    aggressionFactor: calls > 0 ? betsRaises / calls : betsRaises,
    totalProfit,
    biggestPot,
    showdownWins,
    showdowns,
    foldToRaisePreflop: facedPreflopRaise > 0 ? (foldedToPreflopRaise / facedPreflopRaise) * 100 : 0,
    foldToBetPostflop: facedPostflopBet > 0 ? (foldedToPostflopBet / facedPostflopBet) * 100 : 0,
    wtsd: voluntaryHands > 0 ? (wentToShowdown / voluntaryHands) * 100 : 0,
  };
}
