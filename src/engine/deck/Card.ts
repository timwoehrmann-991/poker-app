import { Card, Rank, Suit, RANK_NAMES, SUIT_SYMBOLS } from '../types';

const SUITS: Suit[] = [Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades];
const RANKS: Rank[] = [
  Rank.Two, Rank.Three, Rank.Four, Rank.Five, Rank.Six, Rank.Seven,
  Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace,
];

export function createCard(rank: Rank, suit: Suit): Card {
  const suitIndex = SUITS.indexOf(suit);
  const rankIndex = rank - 2; // Rank.Two = 2, so index 0
  return { rank, suit, id: suitIndex * 13 + rankIndex };
}

export function cardFromId(id: number): Card {
  const suitIndex = Math.floor(id / 13);
  const rankIndex = id % 13;
  return { rank: RANKS[rankIndex], suit: SUITS[suitIndex], id };
}

export function cardToString(card: Card): string {
  return `${RANK_NAMES[card.rank]}${SUIT_SYMBOLS[card.suit]}`;
}

export function cardToShortString(card: Card): string {
  return `${RANK_NAMES[card.rank]}${card.suit}`;
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a.id === b.id;
}

export function createFullDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
}

export { SUITS, RANKS };
