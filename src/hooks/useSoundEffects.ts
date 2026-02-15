import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { ActionType, Street } from '../engine/types';

// Web Audio API sound synthesizer - no external audio files needed
class SoundEngine {
  private ctx: AudioContext | null = null;
  private volume = 0.7;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setVolume(v: number) {
    this.volume = v;
  }

  // Card deal sound - short "tick"
  playCardDeal() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.15 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  }

  // Chip clink sound - metallic ping
  playChipClink() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(4000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.1);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(6000, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.1 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 0.12);
  }

  // Check/knock sound - low thud
  playCheck() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  }

  // Fold sound - soft swoosh
  playFold() {
    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(ctx.currentTime);
  }

  // Win fanfare - triumphant chord
  playWin() {
    const ctx = this.getContext();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 major chord

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      const startTime = ctx.currentTime + i * 0.08;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.12 * this.volume, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.start(startTime);
      osc.stop(startTime + 0.6);
    });
  }

  // All-in alarm - dramatic rising tone
  playAllIn() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.08 * this.volume, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12 * this.volume, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }

  // Timer tick sound - subtle clock tick for last 5 seconds
  playTimerTick() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gain.gain.setValueAtTime(0.06 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  }

  // New street card reveal
  playCardFlip() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }
}

const soundEngine = new SoundEngine();

export function useSoundEffects() {
  const soundEnabled = useSettingsStore(s => s.soundEnabled);
  const soundVolume = useSettingsStore(s => s.soundVolume);
  const gameState = useGameStore(s => s.gameState);

  const prevActionCountRef = useRef(0);
  const prevStreetRef = useRef<Street | null>(null);
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

  // Watch for street changes (new community cards)
  useEffect(() => {
    if (!soundEnabled || !gameState) return;

    if (prevStreetRef.current && prevStreetRef.current !== gameState.street) {
      if (gameState.street === Street.Flop || gameState.street === Street.Turn || gameState.street === Street.River) {
        // Delay slightly to sync with card animation
        setTimeout(() => soundEngine.playCardFlip(), 150);
      }
    }
    prevStreetRef.current = gameState.street;
  }, [gameState?.street, soundEnabled]);

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
