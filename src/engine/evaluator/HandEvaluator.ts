import { Card, Rank, Suit, HandCategory, EvaluatedHand, RANK_NAMES, SUIT_SYMBOLS } from '../types';

/**
 * Evaluates the best 5-card poker hand from up to 7 cards.
 * Uses combinatorial enumeration: for 7 cards, evaluates all C(7,5)=21 combinations.
 * Each 5-card hand is scored with a numeric value for absolute ordering.
 */

// Hand category base values (spaced far apart to prevent overlap)
const CATEGORY_BASE: Record<HandCategory, number> = {
  [HandCategory.HighCard]: 0,
  [HandCategory.OnePair]: 1_000_000,
  [HandCategory.TwoPair]: 2_000_000,
  [HandCategory.ThreeOfAKind]: 3_000_000,
  [HandCategory.Straight]: 4_000_000,
  [HandCategory.Flush]: 5_000_000,
  [HandCategory.FullHouse]: 6_000_000,
  [HandCategory.FourOfAKind]: 7_000_000,
  [HandCategory.StraightFlush]: 8_000_000,
  [HandCategory.RoyalFlush]: 9_000_000,
};

interface FiveCardResult {
  category: HandCategory;
  value: number;
  cards: Card[];
}

function getRankCounts(cards: Card[]): Map<Rank, number> {
  const counts = new Map<Rank, number>();
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
  }
  return counts;
}

function getSuitCounts(cards: Card[]): Map<Suit, number> {
  const counts = new Map<Suit, number>();
  for (const card of cards) {
    counts.set(card.suit, (counts.get(card.suit) || 0) + 1);
  }
  return counts;
}

function isFlush(cards: Card[]): boolean {
  const suit = cards[0].suit;
  return cards.every(c => c.suit === suit);
}

function getSortedRanks(cards: Card[]): Rank[] {
  return cards.map(c => c.rank).sort((a, b) => b - a);
}

function isStraight(sortedRanks: Rank[]): boolean {
  // Check normal straight (high to low consecutive)
  for (let i = 0; i < sortedRanks.length - 1; i++) {
    if (sortedRanks[i] - sortedRanks[i + 1] !== 1) {
      // Check for wheel (A-2-3-4-5): ranks would be [14, 5, 4, 3, 2]
      if (i === 0 && sortedRanks[0] === Rank.Ace && sortedRanks[1] === Rank.Five) {
        continue; // Allow A-5 gap for wheel
      }
      return false;
    }
  }
  return true;
}

function isWheel(sortedRanks: Rank[]): boolean {
  return (
    sortedRanks[0] === Rank.Ace &&
    sortedRanks[1] === Rank.Five &&
    sortedRanks[2] === Rank.Four &&
    sortedRanks[3] === Rank.Three &&
    sortedRanks[4] === Rank.Two
  );
}

/** Encode up to 5 ranks into a comparable number. Each rank gets 4 bits. */
function encodeKickers(ranks: Rank[]): number {
  let value = 0;
  for (let i = 0; i < ranks.length; i++) {
    value += ranks[i] * Math.pow(15, ranks.length - 1 - i);
  }
  return value;
}

function evaluateFiveCards(cards: Card[]): FiveCardResult {
  const sortedRanks = getSortedRanks(cards);
  const rankCounts = getRankCounts(cards);
  const flush = isFlush(cards);
  const straight = isStraight(sortedRanks);
  const wheel = isWheel(sortedRanks);

  // Group ranks by count
  const groups: { rank: Rank; count: number }[] = [];
  rankCounts.forEach((count, rank) => groups.push({ rank, count }));
  groups.sort((a, b) => b.count - a.count || b.rank - a.rank);

  // Straight Flush / Royal Flush
  if (flush && straight) {
    if (sortedRanks[0] === Rank.Ace && sortedRanks[1] === Rank.King) {
      return {
        category: HandCategory.RoyalFlush,
        value: CATEGORY_BASE[HandCategory.RoyalFlush],
        cards,
      };
    }
    const highCard = wheel ? Rank.Five : sortedRanks[0];
    return {
      category: HandCategory.StraightFlush,
      value: CATEGORY_BASE[HandCategory.StraightFlush] + highCard,
      cards,
    };
  }

  // Four of a Kind
  if (groups[0].count === 4) {
    const quadRank = groups[0].rank;
    const kicker = groups[1].rank;
    return {
      category: HandCategory.FourOfAKind,
      value: CATEGORY_BASE[HandCategory.FourOfAKind] + quadRank * 15 + kicker,
      cards,
    };
  }

  // Full House
  if (groups[0].count === 3 && groups[1].count === 2) {
    return {
      category: HandCategory.FullHouse,
      value: CATEGORY_BASE[HandCategory.FullHouse] + groups[0].rank * 15 + groups[1].rank,
      cards,
    };
  }

  // Flush
  if (flush) {
    return {
      category: HandCategory.Flush,
      value: CATEGORY_BASE[HandCategory.Flush] + encodeKickers(sortedRanks),
      cards,
    };
  }

  // Straight
  if (straight) {
    const highCard = wheel ? Rank.Five : sortedRanks[0];
    return {
      category: HandCategory.Straight,
      value: CATEGORY_BASE[HandCategory.Straight] + highCard,
      cards,
    };
  }

  // Three of a Kind
  if (groups[0].count === 3) {
    const tripRank = groups[0].rank;
    const kickers = groups.slice(1).map(g => g.rank);
    return {
      category: HandCategory.ThreeOfAKind,
      value: CATEGORY_BASE[HandCategory.ThreeOfAKind] + tripRank * 225 + encodeKickers(kickers),
      cards,
    };
  }

  // Two Pair
  if (groups[0].count === 2 && groups[1].count === 2) {
    const highPair = Math.max(groups[0].rank, groups[1].rank);
    const lowPair = Math.min(groups[0].rank, groups[1].rank);
    const kicker = groups[2].rank;
    return {
      category: HandCategory.TwoPair,
      value: CATEGORY_BASE[HandCategory.TwoPair] + highPair * 225 + lowPair * 15 + kicker,
      cards,
    };
  }

  // One Pair
  if (groups[0].count === 2) {
    const pairRank = groups[0].rank;
    const kickers = groups.slice(1).map(g => g.rank).sort((a, b) => b - a);
    return {
      category: HandCategory.OnePair,
      value: CATEGORY_BASE[HandCategory.OnePair] + pairRank * 3375 + encodeKickers(kickers),
      cards,
    };
  }

  // High Card
  return {
    category: HandCategory.HighCard,
    value: CATEGORY_BASE[HandCategory.HighCard] + encodeKickers(sortedRanks),
    cards,
  };
}

/** Generate all C(n,5) combinations from an array */
function* combinations5(cards: Card[]): Generator<Card[]> {
  const n = cards.length;
  for (let i = 0; i < n - 4; i++) {
    for (let j = i + 1; j < n - 3; j++) {
      for (let k = j + 1; k < n - 2; k++) {
        for (let l = k + 1; l < n - 1; l++) {
          for (let m = l + 1; m < n; m++) {
            yield [cards[i], cards[j], cards[k], cards[l], cards[m]];
          }
        }
      }
    }
  }
}

function describeHand(category: HandCategory, bestCards: Card[]): string {
  const sortedRanks = getSortedRanks(bestCards);
  const rankCounts = getRankCounts(bestCards);
  const groups: { rank: Rank; count: number }[] = [];
  rankCounts.forEach((count, rank) => groups.push({ rank, count }));
  groups.sort((a, b) => b.count - a.count || b.rank - a.rank);

  const rankName = (r: Rank): string => {
    const names: Record<number, string> = {
      2: 'Twos', 3: 'Threes', 4: 'Fours', 5: 'Fives', 6: 'Sixes',
      7: 'Sevens', 8: 'Eights', 9: 'Nines', 10: 'Tens', 11: 'Jacks',
      12: 'Queens', 13: 'Kings', 14: 'Aces',
    };
    return names[r] || String(r);
  };

  const singleRankName = (r: Rank): string => {
    const names: Record<number, string> = {
      2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six',
      7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack',
      12: 'Queen', 13: 'King', 14: 'Ace',
    };
    return names[r] || String(r);
  };

  switch (category) {
    case HandCategory.RoyalFlush:
      return 'Royal Flush';
    case HandCategory.StraightFlush:
      return `Straight Flush, ${singleRankName(isWheel(sortedRanks) ? Rank.Five : sortedRanks[0])} high`;
    case HandCategory.FourOfAKind:
      return `Four of a Kind, ${rankName(groups[0].rank)}`;
    case HandCategory.FullHouse:
      return `Full House, ${rankName(groups[0].rank)} full of ${rankName(groups[1].rank)}`;
    case HandCategory.Flush:
      return `Flush, ${singleRankName(sortedRanks[0])} high`;
    case HandCategory.Straight:
      return `Straight, ${singleRankName(isWheel(sortedRanks) ? Rank.Five : sortedRanks[0])} high`;
    case HandCategory.ThreeOfAKind:
      return `Three of a Kind, ${rankName(groups[0].rank)}`;
    case HandCategory.TwoPair:
      return `Two Pair, ${rankName(groups[0].rank)} and ${rankName(groups[1].rank)}`;
    case HandCategory.OnePair:
      return `Pair of ${rankName(groups[0].rank)}`;
    case HandCategory.HighCard:
      return `High Card, ${singleRankName(sortedRanks[0])}`;
  }
}

/**
 * Evaluate the best 5-card hand from 5, 6, or 7 cards.
 */
export function evaluateHand(cards: Card[]): EvaluatedHand {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error(`Cannot evaluate ${cards.length} cards, need 5-7`);
  }

  if (cards.length === 5) {
    const result = evaluateFiveCards(cards);
    return {
      category: result.category,
      value: result.value,
      bestCards: result.cards,
      description: describeHand(result.category, result.cards),
    };
  }

  let bestResult: FiveCardResult | null = null;

  for (const combo of combinations5(cards)) {
    const result = evaluateFiveCards(combo);
    if (!bestResult || result.value > bestResult.value) {
      bestResult = result;
    }
  }

  return {
    category: bestResult!.category,
    value: bestResult!.value,
    bestCards: bestResult!.cards,
    description: describeHand(bestResult!.category, bestResult!.cards),
  };
}

/**
 * Compare two evaluated hands. Returns positive if a > b, negative if a < b, 0 if equal.
 */
export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  return a.value - b.value;
}
