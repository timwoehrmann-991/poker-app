import React from 'react';
import { useSettingsStore, AnimationSpeed, ColorScheme, Language } from '../../store/settingsStore';
import { useTranslation } from '../../i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const settings = useSettingsStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
        style={{
          background: 'var(--color-bg-panel)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-white">{t('settings.title')}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Animation Speed */}
        <div className="mb-5">
          <label className="block text-sm text-gray-400 mb-2">{t('settings.animationSpeed')}</label>
          <div className="flex gap-2">
            {(['slow', 'normal', 'fast', 'instant'] as AnimationSpeed[]).map(speed => (
              <button
                key={speed}
                onClick={() => settings.setAnimationSpeed(speed)}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  settings.animationSpeed === speed
                    ? 'bg-yellow-600 text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                {t(`settings.${speed}` as any)}
              </button>
            ))}
          </div>
        </div>

        {/* Sound */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-gray-400">{t('settings.sound')}</label>
            <button
              onClick={() => settings.setSoundEnabled(!settings.soundEnabled)}
              className={`w-10 h-5 rounded-full transition-colors ${
                settings.soundEnabled ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  settings.soundEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          {settings.soundEnabled && (
            <input
              type="range"
              min={0}
              max={100}
              value={settings.soundVolume * 100}
              onChange={(e) => settings.setSoundVolume(Number(e.target.value) / 100)}
              className="w-full accent-yellow-500"
            />
          )}
        </div>

        {/* Language */}
        <div className="mb-5">
          <label className="block text-sm text-gray-400 mb-2">{t('settings.language')}</label>
          <div className="flex gap-2">
            {[
              { value: 'de' as Language, label: '🇩🇪 Deutsch' },
              { value: 'en' as Language, label: '🇬🇧 English' },
            ].map(lang => (
              <button
                key={lang.value}
                onClick={() => settings.setLanguage(lang.value)}
                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  settings.language === lang.value
                    ? 'bg-yellow-600 text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color Theme */}
        <div className="mb-5">
          <label className="block text-sm text-gray-400 mb-2">{t('settings.theme')}</label>
          <div className="flex gap-2">
            {[
              { value: 'casino-dark' as ColorScheme, label: 'Dark', color: '#1a5c2a' },
              { value: 'casino-classic' as ColorScheme, label: 'Classic', color: '#256b35' },
              { value: 'casino-blue' as ColorScheme, label: 'Blue', color: '#1a3a5c' },
            ].map(theme => (
              <button
                key={theme.value}
                onClick={() => {
                  settings.setColorScheme(theme.value);
                  document.documentElement.setAttribute('data-theme', theme.value);
                }}
                className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors border ${
                  settings.colorScheme === theme.value
                    ? 'border-yellow-500 text-white'
                    : 'border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <div
                  className="w-full h-4 rounded mb-1"
                  style={{ background: theme.color }}
                />
                {theme.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <ToggleRow
            label="Odds Calculator anzeigen"
            value={settings.showOddsCalculator}
            onChange={settings.setShowOddsCalculator}
          />
          <ToggleRow
            label="Tutorial anzeigen"
            value={settings.showTutorial}
            onChange={settings.setShowTutorial}
          />
          <ToggleRow
            label={t('settings.autoFold')}
            value={settings.autoFoldJunk}
            onChange={settings.setAutoFoldJunk}
          />
          <ToggleRow
            label={t('settings.beginnerMode')}
            value={settings.beginnerMode}
            onChange={settings.setBeginnerMode}
          />
        </div>
      </div>
    </div>
  );
};

const ToggleRow: React.FC<{
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex justify-between items-center">
    <span className="text-xs text-gray-400">{label}</span>
    <button
      onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full transition-colors ${
        value ? 'bg-green-500' : 'bg-gray-600'
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  </div>
);
