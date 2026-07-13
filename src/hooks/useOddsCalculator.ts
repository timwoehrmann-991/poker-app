import { useState, useEffect, useRef } from 'react';
import { Card } from '../engine/types';
import type { OddsResponse } from '../workers/odds-calculator.worker';

export interface OddsResult {
  winProbability: number;
  tieProbability: number;
  lossProbability: number;
  equity: number;
  outs: { drawType: string; outs: number; countsForRule: boolean }[];
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
  // Nur das Ergebnis der neuesten Anfrage zählt — späte Antworten
  // älterer Berechnungen werden verworfen (Race-Schutz)
  const latestRequestIdRef = useRef(0);

  // Create worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/odds-calculator.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e: MessageEvent<OddsResponse>) => {
      if (e.data.requestId !== latestRequestIdRef.current) return;
      setResult(e.data);
      setIsCalculating(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Stabile Identität der Board-Karten (Länge allein reicht nicht)
  const boardKey = communityCards.map(c => c.id).join(',');

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
      const requestId = ++latestRequestIdRef.current;
      workerRef.current?.postMessage({
        type: 'calculate',
        requestId,
        holeCards,
        communityCards,
        numOpponents: Math.max(1, numOpponents),
        iterations: 50000,
      });
    }, 200);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeCards?.[0]?.id, holeCards?.[1]?.id, boardKey, numOpponents, enabled]);

  return { result, isCalculating };
}
