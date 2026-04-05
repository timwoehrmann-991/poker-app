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
import { RecentHandsBar } from './components/ui/RecentHandsBar';

type RightPanel = 'tutorial' | 'history' | 'chat' | 'stats' | null;

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

const App: React.FC = () => {
  const isGameStarted = useGameStore(s => s.isGameStarted);
  const colorScheme   = useSettingsStore(s => s.colorScheme);
  const showOdds      = useSettingsStore(s => s.showOddsCalculator);
  const gameState     = useGameStore(s => s.gameState);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rightPanel, setRightPanel]     = useState<RightPanel>('tutorial');
  const [mobilePanel, setMobilePanel]   = useState<RightPanel>(null);

  const windowWidth = useWindowWidth();
  const isMobile    = windowWidth < 640;
  const isTablet    = windowWidth >= 640 && windowWidth < 1024;

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

  // Active AI player check for skip button visibility
  const isAITurn = (() => {
    if (!gameState?.isHandInProgress) return false;
    const idx = gameState.activePlayerIndex;
    if (idx === null) return false;
    return !gameState.players[idx].isHuman;
  })();

  // ─── MOBILE LAYOUT ────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', overflow: 'hidden' }}>

        {/* Top bar — minimal on mobile */}
        <div style={{
          height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 10px', flexShrink: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>♠ Poker</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => useSettingsStore.getState().setShowOddsCalculator(!showOdds)}
              style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: '1px solid ' + (showOdds ? 'rgba(48,209,88,0.4)' : 'rgba(255,255,255,0.12)'),
                background: showOdds ? 'rgba(48,209,88,0.12)' : 'transparent',
                color: showOdds ? '#30d158' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
              }}
            >📊</button>
            <button
              onClick={() => setSettingsOpen(true)}
              style={{ padding: '3px 8px', borderRadius: 6, fontSize: 13, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
            >⚙️</button>
            <button
              onClick={() => { if (confirm('Zurück zum Hauptmenü?')) useGameStore.setState({ isGameStarted: false, gameState: null, controller: null }); }}
              style={{ padding: '3px 7px', borderRadius: 6, fontSize: 11, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
            >✕</button>
          </div>
        </div>

        {/* Table — takes all remaining space above bottom nav */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
          {/* Odds panel — overlay on top of table if enabled */}
          {showOdds && (
            <div style={{
              position: 'absolute', top: 6, left: 6, zIndex: 20,
              width: 180, maxHeight: 'calc(100% - 12px)', overflow: 'hidden auto',
              background: 'rgba(8,8,14,0.9)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
              padding: 8,
            }}>
              <OddsPanel />
            </div>
          )}

          <PokerTable />

          {/* Mobile panel overlay */}
          {mobilePanel && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 30,
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
              display: 'flex', flexDirection: 'column',
              padding: 12, overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  {panels.find(p => p.id === mobilePanel)?.icon} {panels.find(p => p.id === mobilePanel)?.label}
                </span>
                <button
                  onClick={() => setMobilePanel(null)}
                  style={{ fontSize: 18, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '0 6px' }}
                >✕</button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden auto' }}>
                {mobilePanel === 'tutorial' && <TutorialPanel />}
                {mobilePanel === 'chat'     && <StrategyChat />}
                {mobilePanel === 'stats'    && <StatsPanel />}
                {mobilePanel === 'history'  && <HandHistoryPanel />}
              </div>
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center',
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '0 4px',
          height: 50,
        }}>
          {panels.map(p => (
            <button
              key={p.id}
              onClick={() => setMobilePanel(mobilePanel === p.id ? null : p.id)}
              style={{
                flex: 1, height: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: mobilePanel === p.id ? 'var(--color-accent)' : 'rgba(255,255,255,0.4)',
                borderTop: mobilePanel === p.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 18 }}>{p.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 600 }}>{p.label}</span>
            </button>
          ))}
        </div>

        {/* Skip button */}
        {isAITurn && (
          <button
            onClick={() => useGameStore.getState().forceAITurn()}
            style={{
              position: 'fixed', bottom: 62, right: 14, zIndex: 50,
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,159,10,0.92)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,159,10,0.6)',
              color: '#fff', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(255,159,10,0.4)',
              transition: 'transform 0.1s',
            }}
            title="AI-Zug überspringen"
          >⏭</button>
        )}

        <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    );
  }

  // ─── TABLET LAYOUT (640–1023px) ───────────────────────────────────────────
  if (isTablet) {
    return (
      <div style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{
          height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 12px', flexShrink: 0,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>♠ Poker</span>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />
            {panels.map(p => (
              <button key={p.id}
                onClick={() => setRightPanel(rightPanel === p.id ? null : p.id)}
                style={{
                  padding: '3px 9px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: rightPanel === p.id ? 'rgba(212,166,52,0.18)' : 'transparent',
                  color: rightPanel === p.id ? 'var(--color-accent)' : 'rgba(255,255,255,0.4)',
                }}
              >{p.icon} {p.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => useSettingsStore.getState().setShowOddsCalculator(!showOdds)}
              style={{ padding: '3px 9px', borderRadius: 7, fontSize: 11, fontWeight: 600, border: '1px solid ' + (showOdds ? 'rgba(48,209,88,0.4)' : 'rgba(255,255,255,0.1)'), background: showOdds ? 'rgba(48,209,88,0.12)' : 'transparent', color: showOdds ? '#30d158' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
            >📊 Odds</button>
            <button onClick={() => setSettingsOpen(true)}
              style={{ padding: '3px 9px', borderRadius: 7, fontSize: 13, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
            >⚙️</button>
            <button onClick={() => { if (confirm('Zurück zum Hauptmenü?')) useGameStore.setState({ isGameStarted: false, gameState: null, controller: null }); }}
              style={{ padding: '3px 8px', borderRadius: 7, fontSize: 11, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
            >✕</button>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {/* Center */}
          <div style={{ flex: 1, overflow: 'hidden', padding: 6, position: 'relative' }}>
            {showOdds && (
              <div style={{
                position: 'absolute', top: 10, left: 10, zIndex: 10,
                width: 190, maxHeight: 'calc(100% - 20px)', overflow: 'hidden auto',
                background: 'rgba(8,8,14,0.88)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 8,
              }}>
                <OddsPanel />
              </div>
            )}
            <PokerTable />
          </div>

          {/* Right panel — narrower on tablet */}
          {rightPanel && (
            <div style={{
              width: 240, flexShrink: 0, overflow: 'hidden auto',
              borderLeft: '1px solid rgba(255,255,255,0.05)',
              background: 'rgba(0,0,0,0.3)', padding: 8,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {rightPanel === 'tutorial' && <TutorialPanel />}
              {rightPanel === 'chat'     && <StrategyChat />}
              {rightPanel === 'stats'    && <StatsPanel />}
              {rightPanel === 'history'  && <HandHistoryPanel />}
              <RecentHandsBar />
            </div>
          )}
        </div>

        {/* Skip button */}
        {isAITurn && (
          <button
            onClick={() => useGameStore.getState().forceAITurn()}
            style={{
              position: 'fixed', bottom: 16, right: 16, zIndex: 50,
              padding: '8px 16px', borderRadius: 24,
              background: 'rgba(255,159,10,0.92)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,159,10,0.6)',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 20px rgba(255,159,10,0.35)',
            }}
            title="AI-Zug überspringen"
          >⏭ Skip</button>
        )}

        <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    );
  }

  // ─── DESKTOP LAYOUT (≥1024px) ─────────────────────────────────────────────
  return (
    <div style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--color-bg)' }}>

      {/* Top bar */}
      <div style={{
        height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', flexShrink: 0,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
            ♠ Poker
          </span>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />
          {panels.map(p => (
            <button key={p.id}
              onClick={() => setRightPanel(rightPanel === p.id ? null : p.id)}
              style={{
                padding: '3px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: rightPanel === p.id ? 'rgba(212,166,52,0.18)' : 'transparent',
                color: rightPanel === p.id ? 'var(--color-accent)' : 'rgba(255,255,255,0.4)',
              }}
            >{p.icon} {p.label}</button>
          ))}
        </div>

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
          >📊 Odds</button>
          <button
            onClick={() => setSettingsOpen(true)}
            style={{ padding: '3px 9px', borderRadius: 7, fontSize: 13, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
          >⚙️</button>
          <button
            onClick={() => { if (confirm('Zurück zum Hauptmenü?')) useGameStore.setState({ isGameStarted: false, gameState: null, controller: null }); }}
            style={{ padding: '3px 9px', borderRadius: 7, fontSize: 11, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
          >✕ Menü</button>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left: Odds sidebar */}
        {showOdds && (
          <div style={{
            width: 210, flexShrink: 0, overflow: 'hidden auto',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(0,0,0,0.25)', padding: 8,
          }}>
            <OddsPanel />
          </div>
        )}

        {/* Center: table */}
        <div style={{ flex: 1, overflow: 'hidden', padding: 6 }}>
          <PokerTable />
        </div>

        {/* Right: panel + recent hands stacked */}
        {rightPanel && (
          <div style={{
            width: 268, flexShrink: 0, overflow: 'hidden auto',
            borderLeft: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(0,0,0,0.25)', padding: 8,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {rightPanel === 'tutorial' && <TutorialPanel />}
            {rightPanel === 'chat'     && <StrategyChat />}
            {rightPanel === 'stats'    && <StatsPanel />}
            {rightPanel === 'history'  && <HandHistoryPanel />}
            <RecentHandsBar />
          </div>
        )}

        {/* Recent hands visible even without right panel open */}
        {!rightPanel && (
          <div style={{
            width: 180, flexShrink: 0, overflow: 'hidden auto',
            borderLeft: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(0,0,0,0.2)', padding: 8,
          }}>
            <RecentHandsBar />
          </div>
        )}
      </div>

      {/* Skip button — only visible when an AI is the active player */}
      {isAITurn && (
        <button
          onClick={() => useGameStore.getState().forceAITurn()}
          style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 50,
            padding: '10px 18px', borderRadius: 28,
            background: 'rgba(255,159,10,0.92)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,159,10,0.5)',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: '0 6px 24px rgba(255,159,10,0.4)',
            transition: 'transform 0.1s, box-shadow 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          title="AI-Zug sofort ausführen (Notfall)"
        >
          ⏭ KI-Zug
        </button>
      )}

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default App;
