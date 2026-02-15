import { en, TranslationKey } from './en';
import { de } from './de';
import { useSettingsStore } from '../store/settingsStore';

const translations = { en, de };

export function t(key: TranslationKey): string {
  const lang = useSettingsStore.getState().language;
  return translations[lang][key] || translations.en[key] || key;
}

export function useTranslation() {
  const language = useSettingsStore(s => s.language);
  return {
    t: (key: TranslationKey): string => {
      return translations[language][key] || translations.en[key] || key;
    },
    language,
  };
}

export type { TranslationKey };
