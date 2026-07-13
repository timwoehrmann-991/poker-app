import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Card } from '../engine/types';
import { BJAction } from '../blackjack/basicStrategy';
import { BJHand, cardValue, handValue } from '../blackjack/engine';

/** Situationstyp für die Lern-Auswertung */
export type BJCategory = 'hard' | 'soft' | 'pair';

export const BJ_CATEGORY_LABELS: Record<BJCategory, string> = {
  hard: 'Harte Hände',
  soft: 'Soft Hands',
  pair: 'Paare',
};

export function categoryOfHand(hand: BJHand): BJCategory {
  if (hand.cards.length === 2 && cardValue(hand.cards[0]) === cardValue(hand.cards[1])) return 'pair';
  if (handValue(hand.cards).soft) return 'soft';
  return 'hard';
}

/** Ein gespeicherter Fehler — vollständige Situation zum Nachspielen */
export interface BJMistake {
  id: string;
  timestamp: number;
  playerCards: Card[];
  dealerUp: Card;
  chosen: BJAction;
  recommended: BJAction;
  reason: string;
  category: BJCategory;
}

interface ScoreBucket { correct: number; total: number; }

interface BlackjackProgressState {
  /** Spielgeld überlebt Verlassen & Reload */
  bankroll: number | null;
  /** Lebenslanger Coach-Score */
  lifetime: ScoreBucket;
  byCategory: Record<BJCategory, ScoreBucket>;
  mistakes: BJMistake[];

  recordDecision: (category: BJCategory, correct: boolean, mistake?: Omit<BJMistake, 'id' | 'timestamp' | 'category'>) => void;
  setBankroll: (chips: number) => void;
  clearProgress: () => void;
}

const EMPTY_BUCKET: ScoreBucket = { correct: 0, total: 0 };

export const useBlackjackProgressStore = create<BlackjackProgressState>()(
  persist(
    (set) => ({
      bankroll: null,
      lifetime: { ...EMPTY_BUCKET },
      byCategory: { hard: { ...EMPTY_BUCKET }, soft: { ...EMPTY_BUCKET }, pair: { ...EMPTY_BUCKET } },
      mistakes: [],

      recordDecision: (category, correct, mistake) => set(state => ({
        lifetime: { correct: state.lifetime.correct + (correct ? 1 : 0), total: state.lifetime.total + 1 },
        byCategory: {
          ...state.byCategory,
          [category]: {
            correct: state.byCategory[category].correct + (correct ? 1 : 0),
            total: state.byCategory[category].total + 1,
          },
        },
        mistakes: mistake
          ? [...state.mistakes, { ...mistake, category, id: `${Date.now()}-${state.lifetime.total}`, timestamp: Date.now() }].slice(-100)
          : state.mistakes,
      })),

      setBankroll: (chips) => set({ bankroll: chips }),

      clearProgress: () => set({
        bankroll: null,
        lifetime: { ...EMPTY_BUCKET },
        byCategory: { hard: { ...EMPTY_BUCKET }, soft: { ...EMPTY_BUCKET }, pair: { ...EMPTY_BUCKET } },
        mistakes: [],
      }),
    }),
    { name: 'blackjack-progress', version: 1 },
  ),
);
