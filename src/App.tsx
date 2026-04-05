import React, { useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { useSettingsStore } from './store/settingsStore';
import { GameSetup } from './components/setup/GameSetup';
import { PokerTable } from './components/table/PokerTable';
import { OddsPanel } from './components/odds/OddsPanel';
import { TutorialPanel } from './components/tutorial/TutorialPanel';
import { StrategyChat } from './components/chat/StrategyChat';
import { HandHistoryPanel } from './components/history/HandHistoryPanel';
import { StatsPanel } from './components/stats/StatsPanel';
import { SettingsModal } from './components/settings/SettingsModal';

type RightPanel = 'tutorial' | 'history' | 'chat' | 'stats' | null;

const App: React.FC = () => {
  const isGameStarted = useGameStore(s => s.isGameStarted);
  const colorScheme   = useSettingsStore(s => s.colorScheme);
  const showOdds      = useSettingsStore(s => s.showOddsCalculator);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rightPanel, setRightPanel]     = useState<RightPanel>('tutorial');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorScheme);
  }, [colorScheme]);

  if (!isGameStarted) return <GameSetup />;

  const panels: { id: RightPanel; icon: string; label: string }[] = [
    { id: 'tutorial', icon: '📖', label: 'Tutorial' },
    { id: 'chat',     icon: '💬', label: 'Chat' },
    { id: 'stats',    icon: '📈', label: 'Stats' },
    { id: 'history',  icon: '📋', label: 'History' },
  ];

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--color-bg)' }}>

      {/* ── Top bar ───────────────────────────────────────── */}
      <div style={{
        height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', flexShrink: 0,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        {/* Left: brand + panel tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
            ♠ Poker
          </span>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />
          {panels.map(p => (
            <button
              key={p.id}
              onClick={() => setRightPanel(rightPanel === p.id ? null : p.id)}
              style={{
                padding: '3px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: rightPanel === p.id ? 'rgba(212,166,52,0.18)' : 'transparent',
                color: rightPanel === p.id ? 'var(--color-accent)' : 'rgba(255,255,255,0.4)',
              }}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>

        {/* Right: odds toggle + settings + exit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => useSettingsStore.getState().setShowOddsCalculator(!showOdds)}
            style={{
              padding: '3px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
              border: '1px solid ' + (showOdds ? 'rgba(48,209,88,0.4)' : 'rgba(255,255,255,0.1)'),
              background: showOdds ? 'rgba(48,209,88,0.12)' : 'transparent',
              color: showOdds ? 'var(--color-success)' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            📊 Odds
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            style={{
              padding: '3px 9px', borderRadius: 7, fontSize: 13,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            ⚙️
          </button>
          <button
            onClick={() => { if (confirm('Zurück zum Hauptmenü?')) useGameStore.setState({ isGameStarted: false, gameState: null, controller: null }); }}
            style={{
              padding: '3px 9px', borderRadius: 7, fontSize: 11,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            ✕ Menü
          </button>
        </div>
      </div>

      {/* ── Main layout ───────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: Odds sidebar */}
        {showOdds && (
          <div style={{
            width: 220, flexShrink: 0, overflow: 'hidden auto',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(0,0,0,0.25)',
            padding: 8,
          }}>
            <OddsPanel />
          </div>
        )}

        {/* Center: Poker table */}
        <div style={{ flex: 1, overflow: 'hidden', padding: 6 }}>
          <PokerTable />
        </div>

        {/* Right: Panel */}
        {rightPanel && (
          <div style={{
            width: 280, flexShrink: 0, overflow: 'hidden auto',
            borderLeft: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(0,0,0,0.25)',
            padding: 8,
          }}>
            {rightPanel === 'tutorial' && <TutorialPanel />}
            {rightPanel === 'chat'     && <StrategyChat />}
            {rightPanel === 'stats'    && <StatsPanel />}
            {rightPanel === 'history'  && <HandHistoryPanel />}
          </div>
        )}
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default App;
