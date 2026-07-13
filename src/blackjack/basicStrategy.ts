import { Card, Rank } from '../engine/types';
import { BJHand, BJLegalActions, cardValue, handValue } from './engine';

export type BJAction = 'hit' | 'stand' | 'double' | 'split' | 'surrender';

export interface BJRecommendation {
  action: BJAction;
  reason: string;
}

export const BJ_ACTION_LABELS: Record<BJAction, string> = {
  hit: 'Karte ziehen',
  stand: 'Halten',
  double: 'Verdoppeln',
  split: 'Teilen',
  surrender: 'Aufgeben',
};

export interface StrategyOptions {
  allowDouble?: boolean;
  allowSplit?: boolean;
  allowSurrender?: boolean;
}

/**
 * Vollständige Basic Strategy für 6 Decks, Dealer steht auf 17 (S17),
 * Verdoppeln nach Teilen erlaubt (DAS), Late Surrender — der mathematisch
 * beste Zug für jede Situation. Grundlage für KI-Mitspieler UND Coach.
 * Pure Strategie: über `opts` lassen sich Aktionen ausschließen
 * (z.B. wenn Verdoppeln nicht mehr erlaubt ist).
 */
export function basicStrategy(
  hand: BJHand,
  dealerUpCard: Card,
  opts: StrategyOptions = {},
): BJRecommendation {
  const allowDouble = (opts.allowDouble ?? true) && hand.cards.length === 2;
  const allowSplit = (opts.allowSplit ?? true) && hand.cards.length === 2;
  const allowSurrender = (opts.allowSurrender ?? true) && hand.cards.length === 2 && !hand.isSplitHand;
  const legal: BJLegalActions = {
    canHit: true, canStand: true,
    canDouble: allowDouble, canSplit: allowSplit, canSurrender: allowSurrender,
  };
  const up = dealerUpCard.rank === Rank.Ace ? 11 : cardValue(dealerUpCard);
  const value = handValue(hand.cards);
  const total = value.total;

  // ── Paare ──────────────────────────────────────────────
  if (legal.canSplit && hand.cards.length === 2 && cardValue(hand.cards[0]) === cardValue(hand.cards[1])) {
    const pairRank = hand.cards[0].rank;
    const pairValue = cardValue(hand.cards[0]);

    if (pairRank === Rank.Ace) {
      return { action: 'split', reason: 'Asse IMMER teilen: aus einer schwachen 12 werden zwei Hände mit je 11 als Start.' };
    }
    if (pairValue === 8) {
      return { action: 'split', reason: 'Achten IMMER teilen: 16 ist die schlechteste Hand im Spiel — zwei 8er-Starts sind viel besser.' };
    }
    if (pairValue === 10) {
      return { action: 'stand', reason: '20 wird NIE geteilt: Du zerstörst eine fast sichere Gewinnhand.' };
    }
    if (pairValue === 9) {
      if (up !== 7 && up >= 2 && up <= 9) {
        return { action: 'split', reason: '18 klingt gut, verliert aber langfristig — gegen schwache Dealer-Karten sind zwei 9er-Hände stärker. (Ausnahme: gegen 7 halten, deine 18 schlägt seine wahrscheinliche 17.)' };
      }
      return { action: 'stand', reason: 'Gegen 7 schlägt deine 18 die wahrscheinliche Dealer-17; gegen 10/Ass ist Teilen zu teuer.' };
    }
    if (pairValue === 7 && up <= 7) {
      return { action: 'split', reason: '14 ist schwach — gegen Dealer 2–7 machen zwei 7er-Hände daraus zwei Chancen.' };
    }
    if (pairValue === 6 && up <= 6) {
      return { action: 'split', reason: '12 gegen eine schwache Dealer-Karte: Teilen nutzt die hohe Bust-Gefahr des Dealers.' };
    }
    if (pairValue === 4 && (up === 5 || up === 6)) {
      return { action: 'split', reason: 'Nur gegen 5/6 lohnt das Teilen der Vieren — der Dealer bustet hier am häufigsten.' };
    }
    if ((pairValue === 2 || pairValue === 3) && up <= 7) {
      return { action: 'split', reason: 'Kleine Paare gegen 2–7 teilen: Jede Hand kann sich zu einer starken entwickeln, der Dealer ist verwundbar.' };
    }
    // 5,5 fällt durch zu "harte 10" weiter unten — nie teilen
  }

  // ── Late Surrender (nur harte 15/16 gegen starke Karten) ──
  if (legal.canSurrender && !value.soft) {
    if (total === 16 && (up === 9 || up === 10 || up === 11)) {
      return { action: 'surrender', reason: 'Harte 16 gegen 9/10/Ass ist so schlecht, dass der halbe Einsatz zurück mehr wert ist als Weiterspielen.' };
    }
    if (total === 15 && up === 10) {
      return { action: 'surrender', reason: 'Harte 15 gegen 10: Aufgeben rettet den halben Einsatz — jede andere Option verliert mehr.' };
    }
  }

  // ── Soft Hands (Ass zählt als 11) ─────────────────────
  if (value.soft && hand.cards.length >= 2) {
    if (total >= 19) {
      return { action: 'stand', reason: `Soft ${total} ist stark genug — halten.` };
    }
    if (total === 18) {
      if (up >= 3 && up <= 6 && legal.canDouble) {
        return { action: 'double', reason: 'Soft 18 gegen 3–6: Der Dealer bustet oft — verdopple, du kannst nicht überkaufen.' };
      }
      if (up <= 8) {
        return { action: 'stand', reason: 'Soft 18 gegen 2/7/8: solide — halten.' };
      }
      return { action: 'hit', reason: 'Soft 18 gegen 9/10/Ass ist zu schwach — ziehe risikofrei (das Ass wird zur 1).' };
    }
    if (total === 17 && up >= 3 && up <= 6 && legal.canDouble) {
      return { action: 'double', reason: 'Soft 17 gegen schwache Dealer-Karte: Verdoppeln — du kannst nicht busten.' };
    }
    if ((total === 15 || total === 16) && up >= 4 && up <= 6 && legal.canDouble) {
      return { action: 'double', reason: `Soft ${total} gegen 4–6: klassischer Verdoppel-Spot ohne Bust-Risiko.` };
    }
    if ((total === 13 || total === 14) && (up === 5 || up === 6) && legal.canDouble) {
      return { action: 'double', reason: `Soft ${total} gegen 5/6: Der Dealer ist maximal verwundbar.` };
    }
    return { action: 'hit', reason: `Soft ${total}: Ziehen ist gratis — das Ass fängt jede hohe Karte ab.` };
  }

  // ── Hard Hands ─────────────────────────────────────────
  if (total >= 17) {
    return { action: 'stand', reason: `Harte ${total}: Halten — jede Karte über ${21 - total} wirft dich raus.` };
  }
  if (total >= 13 && total <= 16) {
    if (up <= 6) {
      return { action: 'stand', reason: `Harte ${total} gegen ${up}: Lass den Dealer das Risiko tragen — er muss ziehen und bustet oft.` };
    }
    return { action: 'hit', reason: `Harte ${total} gegen starke Dealer-Karte: Halten verliert fast immer — du musst das Bust-Risiko eingehen.` };
  }
  if (total === 12) {
    if (up >= 4 && up <= 6) {
      return { action: 'stand', reason: '12 gegen 4–6: Nur eine 10 wirft dich raus, der Dealer bustet hier am häufigsten — halten.' };
    }
    return { action: 'hit', reason: '12 gegen 2/3 oder starke Karten: Ziehen — die Bust-Gefahr ist es hier wert.' };
  }
  if (total === 11) {
    if (up <= 10 && legal.canDouble) {
      return { action: 'double', reason: '11 ist DIE Verdoppel-Hand: Jede 10 macht daraus 21.' };
    }
    return { action: 'hit', reason: '11: ziehen (gegen ein Dealer-Ass ohne Verdoppeln).' };
  }
  if (total === 10) {
    if (up <= 9 && legal.canDouble) {
      return { action: 'double', reason: '10 gegen 2–9: Verdoppeln — du bist klarer Favorit auf die bessere Endhand.' };
    }
    return { action: 'hit', reason: '10 gegen 10/Ass: nur ziehen — der Dealer ist zu stark zum Verdoppeln.' };
  }
  if (total === 9) {
    if (up >= 3 && up <= 6 && legal.canDouble) {
      return { action: 'double', reason: '9 gegen 3–6: Verdoppeln gegen die schwächsten Dealer-Karten.' };
    }
    return { action: 'hit', reason: '9: ziehen und auf eine gute Karte hoffen.' };
  }
  return { action: 'hit', reason: `${total} oder weniger: Ziehen ist immer richtig — busten unmöglich.` };
}

/**
 * Empfehlung unter Berücksichtigung der tatsächlich legalen Aktionen.
 * Didaktisch wertvoll: Wenn der eigentlich beste Zug nicht (mehr) geht,
 * sagt der Coach das dazu — „Eigentlich Verdoppeln, hier nicht möglich → ziehen".
 */
export function applicableRecommendation(
  hand: BJHand,
  dealerUpCard: Card,
  legal: BJLegalActions,
): BJRecommendation {
  const pure = basicStrategy(hand, dealerUpCard);
  const available =
    (pure.action !== 'double' || legal.canDouble) &&
    (pure.action !== 'split' || legal.canSplit) &&
    (pure.action !== 'surrender' || legal.canSurrender);

  if (available) return pure;

  const fallback = basicStrategy(hand, dealerUpCard, {
    allowDouble: legal.canDouble,
    allowSplit: legal.canSplit,
    allowSurrender: legal.canSurrender,
  });
  return {
    action: fallback.action,
    reason: `Eigentlich: ${BJ_ACTION_LABELS[pure.action]} — hier nicht möglich. ${fallback.reason}`,
  };
}
