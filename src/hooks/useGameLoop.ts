import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { PlayerStatus, Position } from '../engine/types';
import { getAIDecision } from '../ai/AIPlayer';

const SPEED_DELAYS = {
  slow: 2500,
  normal: 1500,
  fast: 600,
  instant: 50,
};

export function useGameLoop() {
  const gameState        = useGameStore(s => s.gameState);
  const performAction    = useGameStore(s => s.performAction);
  const animationSpeed   = useSettingsStore(s => s.animationSpeed);
  const aiTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingRef    = useRef(false);
  const watchdogRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActionTimeRef = useRef(Date.now());
  // Track the last activePlayerIndex so we can reset processingRef on change
  const lastActiveIdxRef  = useRef<number | null | undefined>(undefined);

  const processAITurn = useCallback(() => {
    if (processingRef.current) return;

    const state = useGameStore.getState().gameState;
    const ctrl  = useGameStore.getState().controller;
    if (!state || !ctrl || !state.isHandInProgress) return;

    const activeIdx = state.activePlayerIndex;
    if (activeIdx === null) return;

    const activePlayer = state.players[activeIdx];
    if (activePlayer.isHuman || activePlayer.status !== PlayerStatus.Active) return;

    processingRef.current    = true;
    lastActionTimeRef.current = Date.now();

    const legalActions = ctrl.getLegalActions(activePlayer.id);
    if (!legalActions) {
      processingRef.current = false;
      return;
    }

    const posMap   = ctrl.getPositionMap();
    const position = posMap.get(activePlayer.seatIndex) || Position.Button;

    const decision = getAIDecision(
      activePlayer.aiPersonality!,
      state,
      activePlayer,
      position,
      legalActions,
    );

    performAction(decision.action, decision.amount);
    processingRef.current = false;
  }, [performAction]);

  // Schedule AI turn whenever active player changes
  useEffect(() => {
    if (!gameState?.isHandInProgress) return;

    const activeIdx = gameState.activePlayerIndex;

    // When the active player changes, reset the processing flag
    if (activeIdx !== lastActiveIdxRef.current) {
      lastActiveIdxRef.current  = activeIdx;
      processingRef.current     = false;
      lastActionTimeRef.current = Date.now();
    }

    if (activeIdx === null) return;

    const activePlayer = gameState.players[activeIdx];
    if (activePlayer.isHuman) return;
    if (activePlayer.status !== PlayerStatus.Active) return;

    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    const delay = SPEED_DELAYS[animationSpeed] + Math.random() * 300;
    aiTimerRef.current = setTimeout(processAITurn, delay);

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [gameState?.activePlayerIndex, gameState?.isHandInProgress, animationSpeed, processAITurn]);

  // Watchdog: if an AI player is active for > 6 s without acting, force a decision
  useEffect(() => {
    watchdogRef.current = setInterval(() => {
      if (Date.now() - lastActionTimeRef.current < 6000) return;

      const state = useGameStore.getState().gameState;
      if (!state?.isHandInProgress) return;

      const activeIdx = state.activePlayerIndex;
      if (activeIdx === null) return;

      const activePlayer = state.players[activeIdx];
      if (activePlayer.isHuman || activePlayer.status !== PlayerStatus.Active) return;

      // Reset lock and fire immediately
      processingRef.current    = false;
      lastActionTimeRef.current = Date.now();
      processAITurn();
    }, 1500);

    return () => {
      if (watchdogRef.current) clearInterval(watchdogRef.current);
    };
  }, [processAITurn]);

  return { gameState };
}
