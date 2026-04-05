import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '../engine/types';

export interface OddsResult {
  winProbability: number;
  tieProbability: number;
  lossProbability: number;
  equity: number;
  outs: { drawType: string; outs: number }[];
  calculationTimeMs: number;
}

export function useOddsCalculator(
  holeCards: [Card, Card] | null,
  communityCards: Card[],
  numOpponents: number,
  enabled: boolean = true,
) {
  const [result, setResult] = useState<OddsResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/odds-calculator.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e) => {
      setResult(e.data);
      setIsCalculating(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Calculate odds when inputs change
  useEffect(() => {
    if (!enabled || !holeCards || !workerRef.current) {
      setResult(null);
      return;
    }

    // Debounce
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setIsCalculating(true);
      workerRef.current?.postMessage({
        type: 'calculate',
        holeCards,
        communityCards,
        numOpponents: Math.max(1, numOpponents),
        iterations: 50000,
      });
    }, 200);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [holeCards?.[0]?.id, holeCards?.[1]?.id, communityCards.length, numOpponents, enabled]);

  return { result, isCalculating };
}
