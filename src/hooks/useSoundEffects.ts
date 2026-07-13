import { useEffect, useRef, useCallback } from 'react';
import { soundEngine } from '../sound/soundEngine';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { ActionType } from '../engine/types';


export function useSoundEffects() {
  const soundEnabled = useSettingsStore(s => s.soundEnabled);
  const soundVolume = useSettingsStore(s => s.soundVolume);
  const gameState = useGameStore(s => s.gameState);

  const prevActionCountRef = useRef(0);
  const prevWinnersRef = useRef<boolean>(false);

  // Update volume
  useEffect(() => {
    soundEngine.setVolume(soundVolume);
  }, [soundVolume]);

  // Watch for new actions
  useEffect(() => {
    if (!soundEnabled || !gameState) return;

    const actionCount = gameState.actionHistory.length;
    if (actionCount > prevActionCountRef.current && prevActionCountRef.current > 0) {
      // A new action happened
      const lastAction = gameState.actionHistory[actionCount - 1];
      if (lastAction) {
        switch (lastAction.type) {
          case ActionType.Fold:
            soundEngine.playFold();
            break;
          case ActionType.Check:
            soundEngine.playCheck();
            break;
          case ActionType.Call:
          case ActionType.Bet:
          case ActionType.Raise:
            soundEngine.playChipClink();
            break;
          case ActionType.AllIn:
            soundEngine.playAllIn();
            break;
          case ActionType.PostSmallBlind:
          case ActionType.PostBigBlind:
            // Subtle chip sound for blinds
            soundEngine.playChipClink();
            break;
        }
      }
    }
    prevActionCountRef.current = actionCount;
  }, [gameState?.actionHistory.length, soundEnabled]);

  // Jede aufgedeckte Board-Karte bekommt ihren eigenen Karten-Snap
  const boardRevealed = useGameStore(s => s.view.boardRevealed);
  const prevRevealedRef = useRef(0);
  useEffect(() => {
    if (!soundEnabled) { prevRevealedRef.current = boardRevealed; return; }
    if (boardRevealed > prevRevealedRef.current && boardRevealed > 0) {
      soundEngine.playCardFlip();
    }
    prevRevealedRef.current = boardRevealed;
  }, [boardRevealed, soundEnabled]);

  // Chips wandern zur Mitte → Klackern
  const collectingBets = useGameStore(s => s.view.collectingBets);
  useEffect(() => {
    if (!soundEnabled || !collectingBets || collectingBets.length === 0) return;
    soundEngine.playChipClink();
  }, [collectingBets, soundEnabled]);

  // Neue Hand → Mischen
  const handNumber = gameState?.handNumber;
  const prevHandRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (soundEnabled && handNumber !== undefined && prevHandRef.current !== undefined && handNumber !== prevHandRef.current) {
      soundEngine.playShuffle();
    }
    prevHandRef.current = handNumber;
  }, [handNumber, soundEnabled]);

  // Watch for winners
  useEffect(() => {
    if (!soundEnabled || !gameState) return;

    const hasWinners = gameState.winners !== null && gameState.winners.length > 0;
    if (hasWinners && !prevWinnersRef.current) {
      setTimeout(() => soundEngine.playWin(), 300);
    }
    prevWinnersRef.current = hasWinners;
  }, [gameState?.winners, soundEnabled]);

  // Expose tick sound for timer
  const playTimerTick = useCallback(() => {
    if (soundEnabled) soundEngine.playTimerTick();
  }, [soundEnabled]);

  const playCardDeal = useCallback(() => {
    if (soundEnabled) soundEngine.playCardDeal();
  }, [soundEnabled]);

  return { playTimerTick, playCardDeal };
}
