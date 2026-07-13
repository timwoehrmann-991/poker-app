import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { ActionType } from '../engine/types';

export interface DecisionTimerState {
  timeRemaining: number;  // seconds remaining
  totalTime: number;      // total seconds
  progress: number;       // 0-1, 1 = full, 0 = expired
  isRunning: boolean;
  isWarning: boolean;     // true when < 5 seconds
}

export function useDecisionTimer(isHumanTurn: boolean): DecisionTimerState {
  const decisionTimerSeconds = useSettingsStore(s => s.decisionTimerSeconds);
  const performAction = useGameStore(s => s.performAction);
  const getLegalActions = useGameStore(s => s.getLegalActions);
  const gameState = useGameStore(s => s.gameState);
  const timerPaused = useGameStore(s => s.timerPaused);

  const [timeRemaining, setTimeRemaining] = useState(decisionTimerSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasExpiredRef = useRef(false);
  // Erst scharf, wenn der Countdown dieser Runde wirklich gelaufen ist —
  // sonst feuert der Ablauf-Effekt mit dem alten 0-Wert der Vorrunde sofort
  const armedRef = useRef(false);

  // Reset timer when it becomes the human's turn
  useEffect(() => {
    if (isHumanTurn) {
      // Bewusster Reset beim Zugwechsel — einmalig pro Turn, keine Kaskade
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeRemaining(decisionTimerSeconds);
      hasExpiredRef.current = false;
      armedRef.current = false;
    }
  }, [isHumanTurn, gameState?.activePlayerIndex, decisionTimerSeconds]);

  // Run the countdown
  useEffect(() => {
    if (!isHumanTurn) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      // Pausiert, solange der Coach-Tipp offen ist — Lesen ohne Zeitdruck
      if (useGameStore.getState().timerPaused) return;
      setTimeRemaining(prev => {
        if (prev > 0) armedRef.current = true;
        const next = prev - 0.1;
        if (next <= 0) {
          return 0;
        }
        return Math.round(next * 10) / 10;
      });
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isHumanTurn, gameState?.activePlayerIndex]);

  // Handle expiration - auto fold/check
  useEffect(() => {
    if (timeRemaining <= 0 && isHumanTurn && armedRef.current && !hasExpiredRef.current) {
      hasExpiredRef.current = true;
      armedRef.current = false;
      const legalActions = getLegalActions();
      if (legalActions) {
        // Check if we can check, otherwise fold
        if (legalActions.canCheck) {
          performAction(ActionType.Check);
        } else {
          performAction(ActionType.Fold);
        }
      }
    }
  }, [timeRemaining, isHumanTurn, getLegalActions, performAction]);

  const progress = decisionTimerSeconds > 0 ? timeRemaining / decisionTimerSeconds : 1;

  return {
    timeRemaining: Math.max(0, timeRemaining),
    totalTime: decisionTimerSeconds,
    progress: Math.max(0, Math.min(1, progress)),
    isRunning: isHumanTurn && timeRemaining > 0 && !timerPaused,
    isWarning: isHumanTurn && timeRemaining > 0 && timeRemaining <= 5,
  };
}
