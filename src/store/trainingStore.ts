import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ActionType, Card, Street } from '../engine/types';

export type TrainingRating = 'excellent' | 'good' | 'okay' | 'mistake' | 'blunder';

/**
 * Eine bewertete Entscheidung MIT vollständigem Situationskontext —
 * damit Fehler im Review angeschaut und als Szenario nachgespielt werden können.
 */
export interface TrainingRecord {
  id: string;
  timestamp: number;
  handNumber: number;
  rating: TrainingRating;
  playerAction: ActionType;
  playerAmount: number;
  optimalAction: ActionType;
  optimalAmount: number;
  reasoning: string;
  street: Street;
  holeCards: [Card, Card] | null;
  board: Card[];
  position: string;
  potSize: number;
}

interface TrainingStoreState {
  records: TrainingRecord[];
  addRecord: (record: TrainingRecord) => void;
  clearRecords: () => void;
}

export const useTrainingStore = create<TrainingStoreState>()(
  persist(
    (set) => ({
      records: [],
      addRecord: (record) => set(state => ({
        records: [...state.records, record].slice(-300),
      })),
      clearRecords: () => set({ records: [] }),
    }),
    { name: 'poker-training', version: 1 },
  ),
);

/** Wie viele Board-Karten lagen auf der jeweiligen Street? */
export function boardCardsForStreet(street: Street): number {
  switch (street) {
    case Street.Preflop: return 0;
    case Street.Flop: return 3;
    case Street.Turn: return 4;
    default: return 5;
  }
}
