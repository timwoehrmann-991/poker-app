import { useState, useEffect, useRef, useCallback } from 'react';
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

  const [timeRemaining, setTimeRemaining] = useState(decisionTimerSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasExpiredRef = useRef(false);

  // Reset timer when it becomes the human's turn
  useEffect(() => {
    if (isHumanTurn) {
      setTimeRemaining(decisionTimerSeconds);
      hasExpiredRef.current = false;
    }
  }, [isHumanTurn, gameState?.activePlayerIndex, decisionTimerSeconds]);

  // Run the countdown
  useEffect(() => {
    if (!isHumanTurn) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
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
    if (timeRemaining <= 0 && isHumanTurn && !hasExpiredRef.current) {
      hasExpiredRef.current = true;
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
    isRunning: isHumanTurn && timeRemaining > 0,
    isWarning: isHumanTurn && timeRemaining > 0 && timeRemaining <= 5,
  };
}
