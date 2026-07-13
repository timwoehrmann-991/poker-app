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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 540, maxHeight: '86vh', overflowY: 'auto',
          borderRadius: 24,
          padding: '28px 30px 26px',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--border-strong)',
          boxShadow: 'var(--glass-shadow-lg)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚙️</span>
            <h2 style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
              {t('settings.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-inset-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-inset)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            ✕
          </button>
        </div>

        {/* ── Erscheinungsbild ────────────────────────────── */}
        <GroupHeader>Erscheinungsbild</GroupHeader>

        <Section label={t('settings.theme')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {THEMES.map(theme => {
              const active = settings.colorScheme === theme.value;
              return (
                <OptionButton key={theme.value} active={active} onClick={() => settings.setColorScheme(theme.value)}>
                  <span style={{ width: 30, height: 20, borderRadius: 6, background: theme.swatch, border: '1px solid var(--border-strong)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{theme.label}</span>
                </OptionButton>
              );
            })}
          </div>
        </Section>

        <Section label="Hintergrund">
          <div style={{ display: 'flex', gap: 8 }}>
            {BACKGROUNDS.map(bg => {
              const active = settings.tableBackground === bg.value;
              return (
                <OptionButton key={bg.value} active={active} onClick={() => settings.setTableBackground(bg.value)} column>
                  <span style={{ fontSize: 17 }}>{bg.icon}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600 }}>{bg.label}</span>
                </OptionButton>
              );
            })}
          </div>
        </Section>

        <Section label="Tischfarbe" last>
          <div style={{ display: 'flex', gap: 8 }}>
            {FELT_COLORS.map(felt => {
              const active = settings.feltColor === felt.value;
              return (
                <OptionButton key={felt.value} active={active} onClick={() => settings.setFeltColor(felt.value)} column>
                  <span style={{ width: 28, height: 18, borderRadius: 9, background: felt.swatch, border: '1px solid var(--border-strong)' }} />
                  <span style={{ fontSize: 10.5, fontWeight: 600 }}>{felt.label}</span>
                </OptionButton>
              );
            })}
          </div>
        </Section>

        <Divider />

        {/* ── Spiel & Ton ─────────────────────────────────── */}
        <GroupHeader>Spiel & Ton</GroupHeader>

        <Section label={t('settings.animationSpeed')}>
          <div style={{ display: 'flex', gap: 8 }}>
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
        </Section>

        <Section label={t('settings.sound')}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)',
            borderRadius: 12, padding: '10px 14px',
          }}>
            <Toggle value={settings.soundEnabled} onChange={settings.setSoundEnabled} />
            <input
              type="range"
              min={0}
              max={100}
              disabled={!settings.soundEnabled}
              value={settings.soundVolume * 100}
              onChange={(e) => settings.setSoundVolume(Number(e.target.value) / 100)}
              style={{ flex: 1, accentColor: 'var(--color-accent)', opacity: settings.soundEnabled ? 1 : 0.4 }}
            />
          </div>
        </Section>

        <Section label={t('settings.language')} last>
          <div style={{ display: 'flex', gap: 8 }}>
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
        </Section>

        <Divider />

        {/* ── Tisch & Lernen ──────────────────────────────── */}
        <GroupHeader>Tisch & Lernen</GroupHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <ToggleRow label="Odds-Rechner anzeigen"        value={settings.showOddsCalculator}   onChange={settings.setShowOddsCalculator} />
          <ToggleRow label="Charakter-Symbole am Tisch (🦈 📞 …)" value={settings.showPersonalityBadges} onChange={settings.setShowPersonalityBadges} />
          <ToggleRow label="Tutorial anzeigen"            value={settings.showTutorial}         onChange={settings.setShowTutorial} />
          <ToggleRow label={t('settings.autoFold')}       value={settings.autoFoldJunk}         onChange={settings.setAutoFoldJunk} />
          <ToggleRow label={t('settings.beginnerMode')}   value={settings.beginnerMode}         onChange={settings.setBeginnerMode} />
        </div>
      </div>
    </div>
  );
};

/** Kleiner Abschnitts-Überkopf mit Akzentpunkt */
const GroupHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-accent)' }} />
    <span style={{
      fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase',
      color: 'var(--color-accent)',
    }}>
      {children}
    </span>
  </div>
);

const Section: React.FC<{ label: string; last?: boolean; children: React.ReactNode }> = ({ label, last, children }) => (
  <div style={{ marginBottom: last ? 0 : 18 }}>
    <label style={{
      display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8,
    }}>
      {label}
    </label>
    {children}
  </div>
);

const Divider: React.FC = () => (
  <div style={{ height: 1, background: 'var(--border-subtle)', margin: '22px 0' }} />
);

const OptionButton: React.FC<{
  active: boolean; onClick: () => void; column?: boolean; children: React.ReactNode;
}> = ({ active, onClick, column, children }) => (
  <button
    onClick={onClick}
    style={{
      flex: column ? 1 : undefined,
      padding: column ? '9px 4px' : '9px 12px', borderRadius: 12, cursor: 'pointer',
      border: active ? '1.5px solid var(--color-accent)' : '1px solid var(--border-subtle)',
      background: active ? 'var(--color-accent-soft)' : 'var(--surface-inset)',
      color: active ? 'var(--color-accent)' : 'var(--text-primary)',
      display: 'flex', flexDirection: column ? 'column' : 'row', alignItems: 'center',
      justifyContent: column ? 'center' : 'flex-start', gap: column ? 4 : 9,
      transition: 'all 0.15s',
    }}
  >
    {children}
  </button>
);

const PillButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1, padding: '9px 8px', borderRadius: 10, fontSize: 11.5, fontWeight: 700,
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
      width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
      background: value ? 'var(--color-success)' : 'var(--surface-inset-hover)',
      transition: 'background 0.2s', position: 'relative',
    }}
  >
    <div style={{
      width: 18, height: 18, borderRadius: '50%', background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      position: 'absolute', top: 3,
      left: value ? 21 : 3, transition: 'left 0.2s',
    }} />
  </button>
);

const ToggleRow: React.FC<{
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, value, onChange }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    padding: '9px 12px', borderRadius: 11,
    background: value ? 'var(--color-accent-soft)' : 'var(--surface-inset)',
    border: `1px solid ${value ? 'var(--color-accent-border)' : 'var(--border-subtle)'}`,
    transition: 'all 0.15s',
  }}>
    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
    <Toggle value={value} onChange={onChange} />
  </div>
);
