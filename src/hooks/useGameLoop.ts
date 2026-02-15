import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { PlayerStatus, ActionType, Position } from '../engine/types';
import { getAIDecision } from '../ai/AIPlayer';
import { computeLegalActions } from '../engine/game/ActionValidator';

const SPEED_DELAYS = {
  slow: 2500,
  normal: 1500,
  fast: 600,
  instant: 50,
};

export function useGameLoop() {
  const gameState = useGameStore(s => s.gameState);
  const controller = useGameStore(s => s.controller);
  const performAction = useGameStore(s => s.performAction);
  const animationSpeed = useSettingsStore(s => s.animationSpeed);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingRef = useRef(false);

  const processAITurn = useCallback(() => {
    if (processingRef.current) return;

    const state = useGameStore.getState().gameState;
    const ctrl = useGameStore.getState().controller;
    if (!state || !ctrl || !state.isHandInProgress) return;

    const activeIdx = state.activePlayerIndex;
    if (activeIdx === null) return;

    const activePlayer = state.players[activeIdx];
    if (activePlayer.isHuman || activePlayer.status !== PlayerStatus.Active) return;

    processingRef.current = true;

    const legalActions = ctrl.getLegalActions(activePlayer.id);
    if (!legalActions) {
      processingRef.current = false;
      return;
    }

    const posMap = ctrl.getPositionMap();
    const position = posMap.get(activePlayer.seatIndex) || Position.Button;

    const decision = getAIDecision(
      activePlayer.aiPersonality!,
      state,
      activePlayer,
      position,
      legalActions,
    );

    // Apply the AI action
    performAction(decision.action, decision.amount);
    processingRef.current = false;
  }, [performAction]);

  useEffect(() => {
    if (!gameState || !gameState.isHandInProgress) return;

    const activeIdx = gameState.activePlayerIndex;
    if (activeIdx === null) return;

    const activePlayer = gameState.players[activeIdx];
    if (activePlayer.isHuman) return; // Wait for human input
    if (activePlayer.status !== PlayerStatus.Active) return;

    // Schedule AI turn with delay
    const delay = SPEED_DELAYS[animationSpeed] + Math.random() * 500;
    aiTimerRef.current = setTimeout(processAITurn, delay);

    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
      }
    };
  }, [gameState?.activePlayerIndex, gameState?.isHandInProgress, animationSpeed, processAITurn]);

  return { gameState };
}
