import React, { useState } from 'react';
import { AIPersonalityType } from '../../engine/types';
import { useGameStore, GameSetupConfig } from '../../store/gameStore';

const PERSONALITY_OPTIONS = [
  { value: AIPersonalityType.TAG,            emoji: '🦈', label: 'TAG',            stats: 'VPIP 20% · AF 70%',     color: 'rgba(10,132,255,0.18)' },
  { value: AIPersonalityType.Rock,           emoji: '🪨', label: 'Rock',           stats: 'VPIP 15% · AF 30%',     color: 'rgba(149,165,166,0.18)' },
  { value: AIPersonalityType.CallingStation, emoji: '📞', label: 'Calling Station',stats: 'VPIP 45% · AF 20%',     color: 'rgba(255,159,10,0.18)' },
  { value: AIPersonalityType.LAGManiac,      emoji: '🃏', label: 'Maniac',         stats: 'VPIP 35% · AF 80%',     color: 'rgba(255,69,58,0.18)' },
  { value: AIPersonalityType.GTOBalanced,    emoji: '⚖️', label: 'GTO Bot',        stats: 'VPIP 25% · AF 60%',     color: 'rgba(191,90,242,0.18)' },
  { value: AIPersonalityType.ShortStack,     emoji: '📊', label: 'Short Stack Pro',stats: 'Push/Fold < 20BB',      color: 'rgba(255,149,0,0.18)' },
  { value: AIPersonalityType.Nit,            emoji: '🔒', label: 'Nit',            stats: 'VPIP 10% · Ultra-Tight',color: 'rgba(48,209,88,0.18)' },
];

const DEFAULT_PERSONALITIES = [
  AIPersonalityType.TAG, AIPersonalityType.CallingStation, AIPersonalityType.LAGManiac,
  AIPersonalityType.Rock, AIPersonalityType.GTOBalanced, AIPersonalityType.Nit,
  AIPersonalityType.ShortStack, AIPersonalityType.TAG, AIPersonalityType.CallingStation,
];

export const GameSetup: React.FC = () => {
  const startGame = useGameStore(s => s.startGame);
  const [playerCount, setPlayerCount] = useState(6);
  const [smallBlind, setSmallBlind] = useState(1);
  const [bigBlind, setBigBlind] = useState(2);
  const [startingChips, setStartingChips] = useState(200);
  const [playerName, setPlayerName] = useState('');
  const [aiPersonalities, setAiPersonalities] = useState<AIPersonalityType[]>(DEFAULT_PERSONALITIES);

  const handleStart = () => {
    startGame({
      playerCount, smallBlind, bigBlind, startingChips,
      humanName: playerName.trim() || 'Player',
      aiPersonalities: aiPersonalities.slice(0, playerCount - 1),
    } as GameSetupConfig);
  };

  const updateAI = (i: number, p: AIPersonalityType) => {
    const updated = [...aiPersonalities];
    updated[i] = p;
    setAiPersonalities(updated);
  };

  const bbs = Math.round(startingChips / bigBlind);

  return (
    <div className="spatial-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'auto' }}>

      {/* Ambient glow orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '8%', left: '3%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(10,132,255,0.07) 0%, transparent 70%)', filter: 'blur(24px)' }} />
        <div style={{ position: 'absolute', bottom: '8%', right: '3%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(191,90,242,0.05) 0%, transparent 70%)', filter: 'blur(24px)' }} />
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: 560 }}>

        {/* Title block */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            {['♠', '♥', '♦', '♣'].map((s, i) => (
              <span key={i} style={{
                fontSize: 32, lineHeight: 1,
                color: i % 2 === 0 ? '#fff' : '#ff3b30',
                textShadow: i % 2 === 0 ? '0 0 24px rgba(255,255,255,0.25)' : '0 0 24px rgba(255,59,48,0.4)',
              }}>{s}</span>
            ))}
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.025em', color: '#fff', lineHeight: 1.1 }}>
            Poker Simulator
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8, letterSpacing: '0.01em' }}>
            No Limit Texas Hold'em · 7 KI-Persönlichkeiten · Live Odds
          </p>
        </div>

        {/* Setup card */}
        <div className="glass-panel-solid" style={{ borderRadius: 24, padding: '28px 30px' }}>

          {/* Player Name */}
          <InputSection label="Dein Name">
            <input
              type="text" value={playerName} maxLength={20}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Player"
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              className="setup-input"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 15, outline: 'none' }}
            />
          </InputSection>

          {/* Player Count */}
          <InputSection label={`Spieleranzahl — ${playerCount} Spieler`}>
            <input
              type="range" min={2} max={9} value={playerCount}
              onChange={e => setPlayerCount(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-accent)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>
              <span>2 Heads-Up</span><span>6 Standard</span><span>9 Full Ring</span>
            </div>
          </InputSection>

          {/* Blinds & Stack */}
          <InputSection label="Blinds & Startstack">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {([
                { label: 'Small Blind', val: smallBlind, set: (v: number) => { const n = Math.max(1,v); setSmallBlind(n); setBigBlind(n*2); }},
                { label: 'Big Blind',   val: bigBlind,   set: (v: number) => setBigBlind(Math.max(smallBlind, v)) },
                { label: `Stack (${bbs}BB)`, val: startingChips, set: (v: number) => setStartingChips(Math.max(bigBlind*10, v)), step: bigBlind*10 },
              ] as {label:string;val:number;set:(v:number)=>void;step?:number}[]).map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 5 }}>{f.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 10px' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>€</span>
                    <input
                      type="number" value={f.val} min={1} step={f.step||1}
                      onChange={e => f.set(Number(e.target.value))}
                      style={{ width: '100%', background: 'none', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </InputSection>

          {/* AI Opponents */}
          <InputSection label={`KI-Gegner (${playerCount - 1})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 230, overflowY: 'auto', paddingRight: 4 }}>
              {Array.from({ length: playerCount - 1 }, (_, i) => {
                const cur = aiPersonalities[i] || AIPersonalityType.TAG;
                const opt = PERSONALITY_OPTIONS.find(o => o.value === cur)!;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: opt.color, border: '1px solid rgba(255,255,255,0.08)', transition: 'background 0.2s' }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{opt.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{opt.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{opt.stats}</div>
                    </div>
                    <select
                      value={cur}
                      onChange={e => updateAI(i, e.target.value as AIPersonalityType)}
                      style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: 'var(--color-text)', fontSize: 11, padding: '4px 8px', cursor: 'pointer', outline: 'none' }}
                    >
                      {PERSONALITY_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.emoji} {o.label}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </InputSection>

          {/* Start Button */}
          <button
            onClick={handleStart}
            style={{
              width: '100%', padding: '14px 24px', borderRadius: 14, marginTop: 8,
              background: 'linear-gradient(135deg, #1a7a3a, #25a050)',
              color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(48,209,88,0.2), inset 0 1px 1px rgba(255,255,255,0.15)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.transform='translateY(-1px)'; b.style.boxShadow='0 8px 30px rgba(48,209,88,0.35), inset 0 1px 1px rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.transform=''; b.style.boxShadow='0 4px 20px rgba(48,209,88,0.2), inset 0 1px 1px rgba(255,255,255,0.15)'; }}
          >
            Spiel starten ♠
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: 'var(--color-text-muted)' }}>
          F = Fold · C = Call/Check · R = Raise · A = All-In
        </p>
      </div>
    </div>
  );
};

const InputSection: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 20 }}>
    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>
      {label}
    </label>
    {children}
  </div>
);
