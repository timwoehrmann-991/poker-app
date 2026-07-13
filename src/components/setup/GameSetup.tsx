import React, { useState, useEffect } from 'react';
import { AIPersonalityType } from '../../engine/types';
import { useGameStore, GameSetupConfig, GameMode } from '../../store/gameStore';
import { useSettingsStore } from '../../store/settingsStore';
import { ChipIcon } from '../ui/ChipStack';
import { ScenarioTrainer } from '../training/ScenarioTrainer';
import { RangeQuiz } from '../training/RangeQuiz';
import { BlackjackGame } from '../blackjack/BlackjackGame';
import { useIsMobile } from '../../hooks/useIsMobile';

interface PersonalityOption {
  value: AIPersonalityType;
  emoji: string;
  label: string;
  desc: string;
  stats: string;
  color: string;
  difficulty: 1 | 2 | 3;
}

const PERSONALITY_OPTIONS: PersonalityOption[] = [
  { value: AIPersonalityType.TAG,            emoji: '🦈', label: 'TAG-Profi',       desc: 'Tight & aggressiv — der solide Profi',     stats: 'VPIP 20 % · sehr aggressiv', color: '#0a84ff', difficulty: 3 },
  { value: AIPersonalityType.GTOBalanced,    emoji: '⚖️', label: 'GTO-Bot',         desc: 'Ausbalanciert und schwer zu lesen',        stats: 'VPIP 25 % · ausgewogen',     color: '#bf5af2', difficulty: 3 },
  { value: AIPersonalityType.LAGManiac,      emoji: '🃏', label: 'Maniac',          desc: 'Wild & unberechenbar — blufft viel',       stats: 'VPIP 35 % · hyperaggressiv', color: '#ff453a', difficulty: 2 },
  { value: AIPersonalityType.ShortStack,     emoji: '📊', label: 'Short Stack Pro', desc: 'Push/Fold-Spezialist bei kleinen Stacks',  stats: 'All-in oder Fold < 15 BB',   color: '#ff9500', difficulty: 2 },
  { value: AIPersonalityType.Rock,           emoji: '🪨', label: 'Rock',            desc: 'Passiv — wartet geduldig auf gute Karten', stats: 'VPIP 15 % · passiv',         color: '#8e8e93', difficulty: 1 },
  { value: AIPersonalityType.CallingStation, emoji: '📞', label: 'Calling Station', desc: 'Geht fast immer mit — foldet ungern',      stats: 'VPIP 45 % · callt alles',    color: '#ff9f0a', difficulty: 1 },
  { value: AIPersonalityType.Nit,            emoji: '🔒', label: 'Nit',             desc: 'Ultra-tight — spielt nur Premiumhände',    stats: 'VPIP 10 % · sehr eng',       color: '#30d158', difficulty: 1 },
];

const DEFAULT_PERSONALITIES = [
  AIPersonalityType.TAG, AIPersonalityType.CallingStation, AIPersonalityType.LAGManiac,
  AIPersonalityType.Rock, AIPersonalityType.GTOBalanced, AIPersonalityType.Nit,
  AIPersonalityType.ShortStack, AIPersonalityType.TAG,
];


const Card: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div style={{
    background: 'var(--color-bg-panel)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 18,
    padding: '18px 20px',
    boxShadow: 'var(--glass-shadow)',
    backdropFilter: 'blur(24px)',
  }}>
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{subtitle}</div>}
    </div>
    {children}
  </div>
);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    color: 'var(--text-tertiary)', marginBottom: 6,
  }}>
    {children}
  </div>
);

export const GameSetup: React.FC = () => {
  const startGame       = useGameStore(s => s.startGame);
  const colorScheme     = useSettingsStore(s => s.colorScheme);
  const tableBackground = useSettingsStore(s => s.tableBackground);
  const feltColor       = useSettingsStore(s => s.feltColor);
  const coachOn         = useSettingsStore(s => s.beginnerMode);
  const isMobile        = useIsMobile();

  // Theme auch auf der Startseite anwenden (Standard: Hell)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorScheme);
    document.documentElement.setAttribute('data-bg', tableBackground);
    document.documentElement.setAttribute('data-felt', feltColor);
  }, [colorScheme, tableBackground, feltColor]);

  const [playerCount,     setPlayerCount]     = useState(4);
  const [smallBlind,      setSmallBlind]      = useState(1);
  const [bigBlind,        setBigBlind]        = useState(2);
  const [startingChips,   setStartingChips]   = useState(200);
  const [playerName,      setPlayerName]      = useState('');
  const [aiPersonalities, setAiPersonalities] = useState<AIPersonalityType[]>(DEFAULT_PERSONALITIES);
  const [mode,            setMode]            = useState<GameMode>('cash');
  const [screen,          setScreen]          = useState<'menu' | 'scenario' | 'range' | 'blackjack'>('menu');

  const switchMode = (m: GameMode) => {
    setMode(m);
    if (m === 'tournament') {
      setStartingChips(1500);
    } else {
      setStartingChips(200);
      setSmallBlind(1);
      setBigBlind(2);
    }
  };

  if (screen === 'scenario')  return <ScenarioTrainer onBack={() => setScreen('menu')} />;
  if (screen === 'range')     return <RangeQuiz onBack={() => setScreen('menu')} />;
  if (screen === 'blackjack') return <BlackjackGame onBack={() => setScreen('menu')} />;

  const handleStart = () => {
    const config: GameSetupConfig = {
      playerCount,
      smallBlind: mode === 'tournament' ? 10 : smallBlind,
      bigBlind: mode === 'tournament' ? 20 : bigBlind,
      startingChips,
      humanName: playerName.trim() || 'Du',
      aiPersonalities: aiPersonalities.slice(0, playerCount - 1),
      mode,
    };
    startGame(config);
  };

  const updateAI = (i: number, p: AIPersonalityType) => {
    const updated = [...aiPersonalities];
    updated[i] = p;
    setAiPersonalities(updated);
  };

  const bbs = Math.round(startingChips / bigBlind);

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'none', border: 'none', color: 'var(--text-primary)',
    fontSize: 14, fontWeight: 600, outline: 'none', fontVariantNumeric: 'tabular-nums',
  };
  const inputBoxStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)',
    borderRadius: 10, padding: '9px 10px',
  };

  return (
    <div
      className="app-ambient"
      style={{
        height: '100dvh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: isMobile ? '16px 10px 32px' : '32px 16px 48px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Titel */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 4 : 10 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
            {['♠', '♥', '♦', '♣'].map((s, i) => (
              <span key={i} style={{
                fontSize: isMobile ? 24 : 30, lineHeight: 1,
                color: i % 2 === 0 ? 'var(--text-primary)' : 'var(--color-danger)',
                textShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}>{s}</span>
            ))}
          </div>
          <h1 style={{ fontSize: isMobile ? 28 : 38, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.1, margin: 0 }}>
            Casino Simulator
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
            Poker & Blackjack · KI-Mitspieler · Live-Odds · Lerntrainer
          </p>
        </div>

        {/* Spiel-Wahl: Poker oder Blackjack */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1, padding: '11px 14px', borderRadius: 14,
            border: '1.5px solid var(--color-accent)', background: 'var(--color-accent-soft)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>♠</span>
            <span>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>Poker</span>
              <span style={{ display: 'block', fontSize: 10, color: 'var(--text-tertiary)' }}>Texas Hold'em gegen 7 KI-Charaktere</span>
            </span>
          </div>
          <button
            onClick={() => setScreen('blackjack')}
            style={{
              flex: 1, padding: '11px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
              border: '1px solid var(--border-subtle)', background: 'var(--color-bg-panel)',
              display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--glass-shadow)',
            }}
          >
            <span style={{ fontSize: 20 }}>🃏</span>
            <span>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Blackjack</span>
              <span style={{ display: 'block', fontSize: 10, color: 'var(--text-tertiary)' }}>Gegen die Bank — mit Regelheft & Coach</span>
            </span>
          </button>
        </div>

        {/* Karte 1: Dein Spiel */}
        <Card title="♠ Dein Spiel" subtitle="Name, Tischgröße und Einsätze">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Spielmodus */}
            <div>
              <FieldLabel>Spielmodus</FieldLabel>
              <div style={{ display: 'flex', gap: 6 }}>
                {([
                  { id: 'cash' as GameMode, icon: '💶', label: 'Cash Game', desc: 'Feste Blinds' },
                  { id: 'tournament' as GameMode, icon: '🏆', label: 'Turnier', desc: 'Blinds steigen alle 8 Hände' },
                ]).map(m => (
                  <button
                    key={m.id}
                    onClick={() => switchMode(m.id)}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      border: mode === m.id ? '1.5px solid var(--color-accent)' : '1px solid var(--border-subtle)',
                      background: mode === m.id ? 'var(--color-accent-soft)' : 'var(--surface-inset)',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 17 }}>{m.icon}</span>
                    <span>
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: mode === m.id ? 'var(--color-accent)' : 'var(--text-primary)' }}>{m.label}</span>
                      <span style={{ display: 'block', fontSize: 9, color: 'var(--text-tertiary)' }}>{m.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <FieldLabel>Dein Name</FieldLabel>
              <input
                type="text" value={playerName} maxLength={20}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Du"
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)', fontSize: 15, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Spieleranzahl als Segmente */}
            <div>
              <FieldLabel>Spieler am Tisch</FieldLabel>
              <div style={{ display: 'flex', gap: 5 }}>
                {[2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                  <button
                    key={n}
                    onClick={() => setPlayerCount(n)}
                    style={{
                      flex: 1, padding: isMobile ? '8px 0' : '9px 0', borderRadius: 9,
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      fontVariantNumeric: 'tabular-nums',
                      border: playerCount === n ? '1.5px solid var(--color-accent)' : '1px solid var(--border-subtle)',
                      background: playerCount === n ? 'var(--color-accent-soft)' : 'var(--surface-inset)',
                      color: playerCount === n ? 'var(--color-accent)' : 'var(--text-secondary)',
                      transition: 'all 0.12s',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 5 }}>
                <span>2 = Heads-Up</span><span>6 = Standard</span><span>9 = Full Ring</span>
              </div>
            </div>

            {/* Blinds & Stack */}
            {mode === 'tournament' && (
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', padding: '8px 10px', background: 'var(--surface-inset)', borderRadius: 10 }}>
                🏆 Blinds starten bei <strong style={{ color: 'var(--text-primary)' }}>10/20</strong> und steigen alle 8 Hände.
                Wer zuletzt Chips hat, gewinnt.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1.2fr', gap: 8 }}>
              <div style={{ display: mode === 'tournament' ? 'none' : undefined }}>
                <FieldLabel>Small Blind</FieldLabel>
                <div style={inputBoxStyle}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>€</span>
                  <input type="number" value={smallBlind} min={1}
                    onChange={e => { const n = Math.max(1, Number(e.target.value)); setSmallBlind(n); setBigBlind(n * 2); }}
                    style={inputStyle} />
                </div>
              </div>
              <div style={{ display: mode === 'tournament' ? 'none' : undefined }}>
                <FieldLabel>Big Blind</FieldLabel>
                <div style={inputBoxStyle}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>€</span>
                  <input type="number" value={bigBlind} min={smallBlind}
                    onChange={e => setBigBlind(Math.max(smallBlind, Number(e.target.value)))}
                    style={inputStyle} />
                </div>
              </div>
              <div style={{ gridColumn: isMobile ? '1 / -1' : undefined }}>
                <FieldLabel>Startstack <span style={{ opacity: 0.7 }}>({bbs} BB)</span></FieldLabel>
                <div style={inputBoxStyle}>
                  <ChipIcon size={11} />
                  <input type="number" value={startingChips} min={bigBlind * 10} step={bigBlind * 10}
                    onChange={e => setStartingChips(Math.max(bigBlind * 10, Number(e.target.value)))}
                    style={inputStyle} />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Karte 2: Gegner wählen */}
        <Card
          title={`🎭 Deine Gegner (${playerCount - 1})`}
          subtitle="Tippe auf ein Symbol, um den Charakter zu wechseln — ★ = Schwierigkeit"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: playerCount - 1 }, (_, i) => {
              const cur = aiPersonalities[i] || AIPersonalityType.TAG;
              const opt = PERSONALITY_OPTIONS.find(o => o.value === cur)!;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: isMobile ? '8px 10px' : '10px 14px',
                    borderRadius: 12,
                    background: 'var(--surface-inset)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: `3px solid ${opt.color}`,
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: isMobile ? 34 : 40, height: isMobile ? 34 : 40, borderRadius: '50%',
                    background: `${opt.color}22`, border: `2px solid ${opt.color}66`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isMobile ? 16 : 19, flexShrink: 0,
                  }}>
                    {opt.emoji}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {opt.label}
                      </span>
                      <span style={{ fontSize: 9, color: opt.color, fontWeight: 700, letterSpacing: '0.03em' }}>
                        {'★'.repeat(opt.difficulty)}{'☆'.repeat(3 - opt.difficulty)}
                      </span>
                    </div>
                    {!isMobile && (
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {opt.desc} · {opt.stats}
                      </div>
                    )}
                  </div>

                  {/* Charakter-Schnellwahl */}
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    {PERSONALITY_OPTIONS.map(o => (
                      <button
                        key={o.value}
                        onClick={() => updateAI(i, o.value)}
                        title={`${o.label} — ${o.desc}`}
                        style={{
                          width: isMobile ? 26 : 30, height: isMobile ? 26 : 30, borderRadius: 8,
                          fontSize: isMobile ? 12 : 14, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: cur === o.value ? `1.5px solid ${o.color}` : '1px solid var(--border-subtle)',
                          background: cur === o.value ? `${o.color}26` : 'transparent',
                          opacity: cur === o.value ? 1 : 0.55,
                          transition: 'all 0.12s',
                          padding: 0,
                        }}
                      >
                        {o.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Lern-Coach — der Kern der App, direkt sichtbar statt in den Settings versteckt */}
        <button
          onClick={() => useSettingsStore.getState().setBeginnerMode(!coachOn)}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
            background: coachOn ? 'var(--color-accent-soft)' : 'var(--color-bg-panel)',
            border: coachOn ? '1.5px solid var(--color-accent)' : '1px solid var(--border-subtle)',
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: 22 }}>🎓</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Mit Lern-Coach spielen
            </span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Empfehlungen auf Abruf, Feedback nach jeder Entscheidung, Timer pausiert beim Lesen
            </span>
          </span>
          <span style={{
            width: 40, height: 20, borderRadius: 10, position: 'relative', flexShrink: 0,
            background: coachOn ? 'var(--color-success)' : 'var(--surface-inset-hover)',
            transition: 'background 0.2s',
          }}>
            <span style={{
              position: 'absolute', top: 2, left: coachOn ? 22 : 2,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s',
            }} />
          </span>
        </button>

        {/* Start */}
        <button
          onClick={handleStart}
          style={{
            width: '100%',
            padding: isMobile ? '14px 20px' : '16px 24px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #1a7a3a, #25a050)',
            color: '#fff', fontWeight: 800,
            fontSize: isMobile ? 15 : 16,
            letterSpacing: '-0.01em',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(37,160,80,0.35)',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Spiel starten ♠
        </button>

        {/* Trainings-Modi — Lernen ohne Tischrunde */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setScreen('scenario')}
            style={{
              flex: 1, padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
              background: 'var(--color-bg-panel)', border: '1px solid var(--border-subtle)',
              textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: 'var(--glass-shadow)',
            }}
          >
            <span style={{ fontSize: 20 }}>🎯</span>
            <span>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Szenario-Training</span>
              <span style={{ display: 'block', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>Knifflige Spots & deine Fehler üben</span>
            </span>
          </button>
          <button
            onClick={() => setScreen('range')}
            style={{
              flex: 1, padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
              background: 'var(--color-bg-panel)', border: '1px solid var(--border-subtle)',
              textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: 'var(--glass-shadow)',
            }}
          >
            <span style={{ fontSize: 20 }}>📊</span>
            <span>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Range-Quiz</span>
              <span style={{ display: 'block', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>Starthände nach Position lernen</span>
            </span>
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
          {isMobile ? 'Viel Erfolg am Tisch!' : 'Tastatur: F = Passen · C = Mitgehen/Schieben · R = Erhöhen · A = All-in'}
        </p>
      </div>
    </div>
  );
};
