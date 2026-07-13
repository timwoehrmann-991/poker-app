import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { PlayerStatus } from '../engine/types';

/** Denkzeit-Skalierung nach Animationsgeschwindigkeit */
const SPEED_MULT = {
  slow: 1.3,
  normal: 1,
  fast: 0.4,
  instant: 0.02,
} as const;

/**
 * Plant KI-Züge: Entscheidung sofort berechnen, aber erst nach der
 * situationsabhängigen "Denkzeit" anwenden — Instant-Folds gehen schnell,
 * große Entscheidungen dauern. Wartet, solange Animationen laufen.
 */
export function useGameLoop() {
  const activeIdx      = useGameStore(s => s.gameState?.activePlayerIndex);
  const handInProgress = useGameStore(s => s.gameState?.isHandInProgress);
  const handNumber     = useGameStore(s => s.gameState?.handNumber);
  const isPlaying      = useGameStore(s => s.view.isPlaying);
  const animationSpeed = useSettingsStore(s => s.animationSpeed);

  useEffect(() => {
    if (!handInProgress || isPlaying || activeIdx === null || activeIdx === undefined) return;

    const store = useGameStore.getState();
    const state = store.gameState;
    if (!state) return;

    const player = state.players[activeIdx];
    if (player.isHuman || player.status !== PlayerStatus.Active) return;

    const decision = store.computeAIDecision();
    if (!decision) return;

    const mult = SPEED_MULT[animationSpeed] ?? 1;
    const delay = Math.max(60, decision.thinkTimeMs * mult);

    const timer = setTimeout(() => {
      useGameStore.getState().applyAIDecision(decision, handNumber!, activeIdx);
    }, delay);

    // Watchdog: falls der geplante Zug hängen bleibt (z.B. weil Animationen
    // liefen), nach großzügiger Frist einen frischen Zug erzwingen
    const watchdog = setTimeout(() => {
      const s = useGameStore.getState();
      if (s.gameState?.isHandInProgress &&
          s.gameState.handNumber === handNumber &&
          s.gameState.activePlayerIndex === activeIdx &&
          !s.view.isPlaying) {
        s.forceAITurn();
      }
    }, delay + 8000);

    return () => {
      clearTimeout(timer);
      clearTimeout(watchdog);
    };
  }, [activeIdx, handInProgress, handNumber, isPlaying, animationSpeed]);
}
