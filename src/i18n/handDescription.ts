import { EvaluatedHand, HandCategory, Rank } from '../engine/types';
import { Language } from '../store/settingsStore';

/** Deutsche Rangnamen im Plural („Paar Buben", „Drilling Damen") */
const RANK_PLURAL_DE: Record<Rank, string> = {
  [Rank.Two]: 'Zweien', [Rank.Three]: 'Dreien', [Rank.Four]: 'Vieren',
  [Rank.Five]: 'Fünfen', [Rank.Six]: 'Sechsen', [Rank.Seven]: 'Siebenen',
  [Rank.Eight]: 'Achten', [Rank.Nine]: 'Neunen', [Rank.Ten]: 'Zehnen',
  [Rank.Jack]: 'Buben', [Rank.Queen]: 'Damen', [Rank.King]: 'Königen', [Rank.Ace]: 'Assen',
};

const RANK_SINGULAR_DE: Record<Rank, string> = {
  [Rank.Two]: 'Zwei', [Rank.Three]: 'Drei', [Rank.Four]: 'Vier',
  [Rank.Five]: 'Fünf', [Rank.Six]: 'Sechs', [Rank.Seven]: 'Sieben',
  [Rank.Eight]: 'Acht', [Rank.Nine]: 'Neun', [Rank.Ten]: 'Zehn',
  [Rank.Jack]: 'Bube', [Rank.Queen]: 'Dame', [Rank.King]: 'König', [Rank.Ace]: 'Ass',
};

export const CATEGORY_NAMES_DE: Record<HandCategory, string> = {
  [HandCategory.HighCard]: 'Höchste Karte',
  [HandCategory.OnePair]: 'Ein Paar',
  [HandCategory.TwoPair]: 'Zwei Paare',
  [HandCategory.ThreeOfAKind]: 'Drilling',
  [HandCategory.Straight]: 'Straße',
  [HandCategory.Flush]: 'Flush',
  [HandCategory.FullHouse]: 'Full House',
  [HandCategory.FourOfAKind]: 'Vierling',
  [HandCategory.StraightFlush]: 'Straight Flush',
  [HandCategory.RoyalFlush]: 'Royal Flush',
};

/** Ränge in bestCards nach Häufigkeit gruppieren (häufigste zuerst, dann höchste) */
function rankGroups(hand: EvaluatedHand): { rank: Rank; count: number }[] {
  const counts = new Map<Rank, number>();
  for (const c of hand.bestCards) counts.set(c.rank, (counts.get(c.rank) || 0) + 1);
  return [...counts.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
}

/**
 * Beschreibt eine ausgewertete Hand in der gewählten Sprache.
 * Englisch nutzt die Engine-Beschreibung, Deutsch wird aus den Karten gebaut.
 */
export function describeHand(hand: EvaluatedHand, language: Language): string {
  if (language === 'en') return hand.description;

  const groups = rankGroups(hand);
  const high = hand.bestCards.length > 0
    ? (Math.max(...hand.bestCards.map(c => c.rank)) as Rank)
    : Rank.Ace;

  switch (hand.category) {
    case HandCategory.HighCard:
      return `Höchste Karte ${RANK_SINGULAR_DE[high]}`;
    case HandCategory.OnePair:
      return `Ein Paar ${RANK_PLURAL_DE[groups[0].rank]}`;
    case HandCategory.TwoPair:
      return `Zwei Paare — ${RANK_PLURAL_DE[groups[0].rank]} und ${RANK_PLURAL_DE[groups[1].rank]}`;
    case HandCategory.ThreeOfAKind:
      return `Drilling ${RANK_PLURAL_DE[groups[0].rank]}`;
    case HandCategory.Straight:
      return `Straße bis ${RANK_SINGULAR_DE[high]}`;
    case HandCategory.Flush:
      return `Flush, ${RANK_SINGULAR_DE[high]} hoch`;
    case HandCategory.FullHouse:
      return `Full House — ${RANK_PLURAL_DE[groups[0].rank]} über ${RANK_PLURAL_DE[groups[1].rank]}`;
    case HandCategory.FourOfAKind:
      return `Vierling ${RANK_PLURAL_DE[groups[0].rank]}`;
    case HandCategory.StraightFlush:
      return `Straight Flush bis ${RANK_SINGULAR_DE[high]}`;
    case HandCategory.RoyalFlush:
      return 'Royal Flush';
    default:
      return hand.description;
  }
}
