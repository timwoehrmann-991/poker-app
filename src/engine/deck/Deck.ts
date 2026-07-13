import { Card } from '../types';
import { createFullDeck } from './Card';

export class Deck {
  private cards: Card[];
  private index: number;

  constructor(cards?: Card[]) {
    this.cards = cards ? [...cards] : createFullDeck();
    this.index = 0;
  }

  /**
   * Baut ein Deck, bei dem `front` in exakt dieser Reihenfolge zuerst
   * ausgeteilt wird — der Rest folgt gemischt. Für Szenarien und Tests.
   */
  static arranged(front: Card[]): Deck {
    const frontIds = new Set(front.map(c => c.id));
    if (frontIds.size !== front.length) {
      throw new Error('Doppelte Karte im Szenario');
    }
    const rest = createFullDeck().filter(c => !frontIds.has(c.id));
    shuffleInPlace(rest);
    return new Deck([...front, ...rest]);
  }

  shuffle(): void {
    this.index = 0;
    shuffleInPlace(this.cards);
  }

  deal(): Card {
    if (this.index >= this.cards.length) {
      throw new Error('No cards remaining in deck');
    }
    return this.cards[this.index++];
  }

  remaining(): number {
    return this.cards.length - this.index;
  }
}

export function shuffleInPlace(arr: Card[]): void {
  // Fisher-Yates shuffle with crypto random
  for (let i = arr.length - 1; i > 0; i--) {
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const j = randomArray[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
