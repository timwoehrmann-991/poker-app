import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AnimationSpeed = 'slow' | 'normal' | 'fast' | 'instant';
export type ColorScheme = 'casino-dark' | 'casino-classic' | 'casino-blue' | 'daylight';
export type TableBackground = 'ambient' | 'bokeh' | 'sunset' | 'minimal';
export type FeltColor = 'gruen' | 'beige' | 'blau' | 'bordeaux';
export type Language = 'de' | 'en';

export interface SettingsState {
  animationSpeed: AnimationSpeed;
  soundEnabled: boolean;
  soundVolume: number;
  language: Language;
  colorScheme: ColorScheme;
  tableBackground: TableBackground;
  feltColor: FeltColor;
  showOddsCalculator: boolean;
  showPersonalityBadges: boolean;
  showTutorial: boolean;
  decisionTimerSeconds: number;
  autoFoldJunk: boolean;
  beginnerMode: boolean;

  setAnimationSpeed: (speed: AnimationSpeed) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  setLanguage: (lang: Language) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setTableBackground: (bg: TableBackground) => void;
  setFeltColor: (felt: FeltColor) => void;
  setShowOddsCalculator: (show: boolean) => void;
  setShowPersonalityBadges: (show: boolean) => void;
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
      colorScheme: 'daylight',
      tableBackground: 'ambient',
      feltColor: 'gruen',
      showOddsCalculator: true,
      showPersonalityBadges: true,
      showTutorial: false,
      decisionTimerSeconds: 30,
      autoFoldJunk: false,
      beginnerMode: true,

      setAnimationSpeed: (speed) => set({ animationSpeed: speed }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setSoundVolume: (volume) => set({ soundVolume: volume }),
      setLanguage: (lang) => set({ language: lang }),
      setColorScheme: (scheme) => set({ colorScheme: scheme }),
      setTableBackground: (bg) => set({ tableBackground: bg }),
      setFeltColor: (felt) => set({ feltColor: felt }),
      setShowOddsCalculator: (show) => set({ showOddsCalculator: show }),
      setShowPersonalityBadges: (show) => set({ showPersonalityBadges: show }),
      setShowTutorial: (show) => set({ showTutorial: show }),
      setDecisionTimerSeconds: (seconds) => set({ decisionTimerSeconds: seconds }),
      setAutoFoldJunk: (auto) => set({ autoFoldJunk: auto }),
      setBeginnerMode: (beginner) => set({ beginnerMode: beginner }),
    }),
    {
      name: 'poker-settings',
      version: 1,
      // v1: Hell ist der neue Standard — einmalige Umstellung bestehender Nutzer
      migrate: (persisted, version) => {
        const state = persisted as Partial<SettingsState>;
        if (version < 1) {
          state.colorScheme = 'daylight';
          state.language = 'de';
        }
        return state as SettingsState;
      },
    }
  )
);
