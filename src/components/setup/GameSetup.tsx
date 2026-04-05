import React, { useState, useEffect } from 'react';
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

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mobile;
}

export const GameSetup: React.FC = () => {
  const startGame   = useGameStore(s => s.startGame);
  const isMobile    = useIsMobile();

  const [playerCount,    setPlayerCount]    = useState(4);
  const [smallBlind,     setSmallBlind]     = useState(1);
  const [bigBlind,       setBigBlind]       = useState(2);
  const [startingChips,  setStartingChips]  = useState(200);
  const [playerName,     setPlayerName]     = useState('');
  const [aiPersonalities,setAiPersonalities]= useState<AIPersonalityType[]>(DEFAULT_PERSONALITIES);

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

  const pad  = isMobile ? '16px 14px' : '24px 28px';
  const gap  = isMobile ? 14 : 20;
  const h1   = isMobile ? 28  : 36;

  return (
    <div
      className="spatial-bg"
      style={{
        minHeight: '100dvh',   // dvh for iOS Safari — adjusts with address bar
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: isMobile ? '12px 10px 24px' : '24px 16px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Ambient glow orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '8%', left: '3%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(10,132,255,0.07) 0%, transparent 70%)', filter: 'blur(24px)' }} />
        <div style={{ position: 'absolute', bottom: '8%', right: '3%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(191,90,242,0.05) 0%, transparent 70%)', filter: 'blur(24px)' }} />
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: 520 }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 16 : 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
            {['♠', '♥', '♦', '♣'].map((s, i) => (
              <span key={i} style={{
                fontSize: isMobile ? 24 : 30, lineHeight: 1,
                color: i % 2 === 0 ? '#fff' : '#ff3b30',
              }}>{s}</span>
            ))}
          </div>
          <h1 style={{ fontSize: h1, fontWeight: 700, letterSpacing: '-0.025em', color: '#fff', lineHeight: 1.1, margin: 0 }}>
            Poker Simulator
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
            No Limit Texas Hold'em · 7 KI · Live Odds
          </p>
        </div>

        {/* Setup card */}
        <div
          className="glass-panel-solid"
          style={{ borderRadius: 20, padding: pad, display: 'flex', flexDirection: 'column', gap }}
        >
          {/* Player Name */}
          <Section label="Dein Name">
            <input
              type="text" value={playerName} maxLength={20}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Player"
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </Section>

          {/* Player Count */}
          <Section label={`Spieleranzahl — ${playerCount} Spieler`}>
            <input
              type="range" min={2} max={9} value={playerCount}
              onChange={e => setPlayerCount(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-accent)', height: 20 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>
              <span>2 Heads-Up</span><span>6 Standard</span><span>9 Full Ring</span>
            </div>
          </Section>

          {/* Blinds & Stack */}
          <Section label="Blinds & Startstack">
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr',
              gap: 8,
            }}>
              {([
                { label: 'Small Blind', val: smallBlind, set: (v: number) => { const n = Math.max(1,v); setSmallBlind(n); setBigBlind(n*2); }},
                { label: 'Big Blind',   val: bigBlind,   set: (v: number) => setBigBlind(Math.max(smallBlind, v)) },
                { label: `Stack (${bbs}BB)`, val: startingChips, set: (v: number) => setStartingChips(Math.max(bigBlind*10, v)), step: bigBlind*10 },
              ] as {label:string;val:number;set:(v:number)=>void;step?:number}[]).map(f => (
                <div key={f.label} style={{ gridColumn: isMobile && f.label.startsWith('Stack') ? '1 / -1' : undefined }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 5 }}>
                    {f.label}
                  </div>
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
          </Section>

          {/* AI Opponents */}
          <Section label={`KI-Gegner (${playerCount - 1})`}>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 5,
              maxHeight: isMobile ? 180 : 220,
              overflowY: 'auto',
              paddingRight: 2,
              WebkitOverflowScrolling: 'touch',
            }}>
              {Array.from({ length: playerCount - 1 }, (_, i) => {
                const cur = aiPersonalities[i] || AIPersonalityType.TAG;
                const opt = PERSONALITY_OPTIONS.find(o => o.value === cur)!;
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: isMobile ? '6px 10px' : '8px 12px',
                      borderRadius: 10, background: opt.color,
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{opt.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {opt.label}
                      </div>
                      {!isMobile && (
                        <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{opt.stats}</div>
                      )}
                    </div>
                    <select
                      value={cur}
                      onChange={e => updateAI(i, e.target.value as AIPersonalityType)}
                      style={{
                        background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 7, color: 'var(--color-text)', fontSize: 11,
                        padding: isMobile ? '3px 4px' : '4px 8px',
                        cursor: 'pointer', outline: 'none', flexShrink: 0,
                      }}
                    >
                      {PERSONALITY_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.emoji} {o.label}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Start Button */}
          <button
            onClick={handleStart}
            style={{
              width: '100%',
              padding: isMobile ? '13px 20px' : '14px 24px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #1a7a3a, #25a050)',
              color: '#fff', fontWeight: 700,
              fontSize: isMobile ? 15 : 16,
              letterSpacing: '-0.01em',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(48,209,88,0.2)',
              // Ensure button is always tappable on mobile
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Spiel starten ♠
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'var(--color-text-muted)' }}>
          {isMobile ? 'Tap the buttons to play' : 'F = Fold · C = Call/Check · R = Raise · A = All-In'}
        </p>
      </div>
    </div>
  );
};

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label style={{
      display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
      textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 7,
    }}>
      {label}
    </label>
    {children}
  </div>
);
