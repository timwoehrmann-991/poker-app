import React from 'react';
import { useSettingsStore, AnimationSpeed, ColorScheme, TableBackground, FeltColor, Language } from '../../store/settingsStore';
import { useTranslation } from '../../i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEMES: { value: ColorScheme; label: string; swatch: string }[] = [
  { value: 'casino-dark',    label: 'Mitternacht', swatch: 'linear-gradient(135deg, #08080f, #0d3a24)' },
  { value: 'casino-classic', label: 'Royal',       swatch: 'linear-gradient(135deg, #140c1c, #14532d)' },
  { value: 'casino-blue',    label: 'Ocean',       swatch: 'linear-gradient(135deg, #041018, #0e3050)' },
  { value: 'daylight',       label: 'Hell ☀️',      swatch: 'linear-gradient(135deg, #f8f6f0, #2e8b57)' },
];

const BACKGROUNDS: { value: TableBackground; label: string; icon: string }[] = [
  { value: 'ambient', label: 'Ambiente', icon: '🌌' },
  { value: 'bokeh',   label: 'Lichter',  icon: '✨' },
  { value: 'sunset',  label: 'Sunset',   icon: '🌇' },
  { value: 'minimal', label: 'Minimal',  icon: '◽' },
];

const FELT_COLORS: { value: FeltColor; label: string; swatch: string }[] = [
  { value: 'gruen',    label: 'Grün',      swatch: '#17583a' },
  { value: 'beige',    label: 'Hellbeige', swatch: '#d8c9a5' },
  { value: 'blau',     label: 'Blau',      swatch: '#14456e' },
  { value: 'bordeaux', label: 'Bordeaux',  swatch: '#6b1f2e' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const settings = useSettingsStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
      <div
        className="w-full max-w-md rounded-2xl p-6 max-h-[80vh] overflow-y-auto"
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--border-strong)',
          boxShadow: 'var(--glass-shadow-lg)',
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{t('settings.title')}</h2>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--surface-inset)', border: 'none',
              color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Color Theme */}
        <div className="mb-5">
          <SettingLabel>{t('settings.theme')}</SettingLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {THEMES.map(theme => (
              <button
                key={theme.value}
                onClick={() => settings.setColorScheme(theme.value)}
                style={{
                  padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                  border: settings.colorScheme === theme.value
                    ? '1.5px solid var(--color-accent)'
                    : '1px solid var(--border-subtle)',
                  background: settings.colorScheme === theme.value ? 'var(--color-accent-soft)' : 'transparent',
                  color: 'var(--text-primary)', fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <span style={{ width: 28, height: 18, borderRadius: 5, background: theme.swatch, border: '1px solid var(--border-subtle)', flexShrink: 0 }} />
                {theme.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Background */}
        <div className="mb-5">
          <SettingLabel>Hintergrund</SettingLabel>
          <div style={{ display: 'flex', gap: 6 }}>
            {BACKGROUNDS.map(bg => (
              <button
                key={bg.value}
                onClick={() => settings.setTableBackground(bg.value)}
                style={{
                  flex: 1, padding: '7px 4px', borderRadius: 10, cursor: 'pointer',
                  border: settings.tableBackground === bg.value
                    ? '1.5px solid var(--color-accent)'
                    : '1px solid var(--border-subtle)',
                  background: settings.tableBackground === bg.value ? 'var(--color-accent-soft)' : 'transparent',
                  color: settings.tableBackground === bg.value ? 'var(--color-accent)' : 'var(--text-secondary)',
                  fontSize: 10, fontWeight: 600,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                }}
              >
                <span style={{ fontSize: 15 }}>{bg.icon}</span>
                {bg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Felt Color */}
        <div className="mb-5">
          <SettingLabel>Tischfarbe</SettingLabel>
          <div style={{ display: 'flex', gap: 6 }}>
            {FELT_COLORS.map(felt => (
              <button
                key={felt.value}
                onClick={() => settings.setFeltColor(felt.value)}
                style={{
                  flex: 1, padding: '7px 4px', borderRadius: 10, cursor: 'pointer',
                  border: settings.feltColor === felt.value
                    ? '1.5px solid var(--color-accent)'
                    : '1px solid var(--border-subtle)',
                  background: settings.feltColor === felt.value ? 'var(--color-accent-soft)' : 'transparent',
                  color: settings.feltColor === felt.value ? 'var(--color-accent)' : 'var(--text-secondary)',
                  fontSize: 10, fontWeight: 600,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}
              >
                <span style={{
                  width: 26, height: 16, borderRadius: 8, background: felt.swatch,
                  border: '1px solid var(--border-strong)',
                }} />
                {felt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Animation Speed */}
        <div className="mb-5">
          <SettingLabel>{t('settings.animationSpeed')}</SettingLabel>
          <div className="flex gap-2">
            {(['slow', 'normal', 'fast', 'instant'] as AnimationSpeed[]).map(speed => (
              <PillButton
                key={speed}
                active={settings.animationSpeed === speed}
                onClick={() => settings.setAnimationSpeed(speed)}
              >
                {t(`settings.${speed}` as Parameters<typeof t>[0])}
              </PillButton>
            ))}
          </div>
        </div>

        {/* Sound */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <SettingLabel noMargin>{t('settings.sound')}</SettingLabel>
            <Toggle value={settings.soundEnabled} onChange={settings.setSoundEnabled} />
          </div>
          {settings.soundEnabled && (
            <input
              type="range"
              min={0}
              max={100}
              value={settings.soundVolume * 100}
              onChange={(e) => settings.setSoundVolume(Number(e.target.value) / 100)}
              style={{ width: '100%', accentColor: 'var(--color-accent)' }}
            />
          )}
        </div>

        {/* Language */}
        <div className="mb-5">
          <SettingLabel>{t('settings.language')}</SettingLabel>
          <div className="flex gap-2">
            {[
              { value: 'de' as Language, label: '🇩🇪 Deutsch' },
              { value: 'en' as Language, label: '🇬🇧 English' },
            ].map(lang => (
              <PillButton
                key={lang.value}
                active={settings.language === lang.value}
                onClick={() => settings.setLanguage(lang.value)}
              >
                {lang.label}
              </PillButton>
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
            label="Charakter-Symbole am Tisch (🦈 📞 …)"
            value={settings.showPersonalityBadges}
            onChange={settings.setShowPersonalityBadges}
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

const SettingLabel: React.FC<{ children: React.ReactNode; noMargin?: boolean }> = ({ children, noMargin }) => (
  <label style={{
    display: 'block', fontSize: 12, color: 'var(--text-secondary)',
    marginBottom: noMargin ? 0 : 8, fontWeight: 600,
  }}>
    {children}
  </label>
);

const PillButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1, padding: '6px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
      cursor: 'pointer', transition: 'all 0.15s',
      border: active ? '1.5px solid var(--color-accent)' : '1px solid var(--border-subtle)',
      background: active ? 'var(--color-accent-soft)' : 'var(--surface-inset)',
      color: active ? 'var(--color-accent)' : 'var(--text-secondary)',
    }}
  >
    {children}
  </button>
);

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    style={{
      width: 40, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
      background: value ? 'var(--color-success)' : 'var(--surface-inset-hover)',
      transition: 'background 0.2s', position: 'relative',
    }}
  >
    <div style={{
      width: 16, height: 16, borderRadius: '50%', background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      position: 'absolute', top: 2,
      left: value ? 22 : 2, transition: 'left 0.2s',
    }} />
  </button>
);

const ToggleRow: React.FC<{
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex justify-between items-center">
    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
    <Toggle value={value} onChange={onChange} />
  </div>
);
