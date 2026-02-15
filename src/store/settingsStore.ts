import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AnimationSpeed = 'slow' | 'normal' | 'fast' | 'instant';
export type ColorScheme = 'casino-dark' | 'casino-classic' | 'casino-blue';
export type Language = 'de' | 'en';

export interface SettingsState {
  animationSpeed: AnimationSpeed;
  soundEnabled: boolean;
  soundVolume: number;
  language: Language;
  colorScheme: ColorScheme;
  showOddsCalculator: boolean;
  showTutorial: boolean;
  decisionTimerSeconds: number;
  autoFoldJunk: boolean;
  beginnerMode: boolean;

  setAnimationSpeed: (speed: AnimationSpeed) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  setLanguage: (lang: Language) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setShowOddsCalculator: (show: boolean) => void;
  setShowTutorial: (show: boolean) => void;
  setDecisionTimerSeconds: (seconds: number) => void;
  setAutoFoldJunk: (auto: boolean) => void;
  setBeginnerMode: (beginner: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      animationSpeed: 'normal',
      soundEnabled: true,
      soundVolume: 0.7,
      language: 'de',
      colorScheme: 'casino-dark',
      showOddsCalculator: true,
      showTutorial: false,
      decisionTimerSeconds: 30,
      autoFoldJunk: false,
      beginnerMode: true,

      setAnimationSpeed: (speed) => set({ animationSpeed: speed }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setSoundVolume: (volume) => set({ soundVolume: volume }),
      setLanguage: (lang) => set({ language: lang }),
      setColorScheme: (scheme) => set({ colorScheme: scheme }),
      setShowOddsCalculator: (show) => set({ showOddsCalculator: show }),
      setShowTutorial: (show) => set({ showTutorial: show }),
      setDecisionTimerSeconds: (seconds) => set({ decisionTimerSeconds: seconds }),
      setAutoFoldJunk: (auto) => set({ autoFoldJunk: auto }),
      setBeginnerMode: (beginner) => set({ beginnerMode: beginner }),
    }),
    { name: 'poker-settings' }
  )
);
