import { Card } from '../types';
import { createFullDeck } from './Card';

export class Deck {
  private cards: Card[];
  private index: number;

  constructor() {
    this.cards = createFullDeck();
    this.index = 0;
  }

  shuffle(): void {
    this.index = 0;
    // Fisher-Yates shuffle with crypto random
    const arr = this.cards;
    for (let i = arr.length - 1; i > 0; i--) {
      const randomArray = new Uint32Array(1);
      crypto.getRandomValues(randomArray);
      const j = randomArray[0] % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  deal(): Card {
    if (this.index >= this.cards.length) {
      throw new Error('No cards remaining in deck');
    }
    return this.cards[this.index++];
  }

  dealMultiple(count: number): Card[] {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      cards.push(this.deal());
    }
    return cards;
  }

  remaining(): number {
    return this.cards.length - this.index;
  }

  reset(): void {
    this.cards = createFullDeck();
    this.index = 0;
  }

  /** Get a copy of remaining cards (for Monte Carlo simulation) */
  getRemainingCards(): Card[] {
    return this.cards.slice(this.index);
  }

  /** Remove specific cards from the deck (for simulation setup) */
  removeCards(cardsToRemove: Card[]): void {
    const removeIds = new Set(cardsToRemove.map(c => c.id));
    this.cards = this.cards.filter(c => !removeIds.has(c.id));
  }
}
