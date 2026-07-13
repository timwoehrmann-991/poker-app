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
import { ReviewPanel } from './components/review/ReviewPanel';
import { useTranslation } from './i18n';
import { ConfirmDialog } from './components/ui/ConfirmDialog';

type RightPanel = 'tutorial' | 'history' | 'chat' | 'stats' | 'review' | null;

function useWindowSize() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const handler = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return size;
}

const App: React.FC = () => {
  const isGameStarted   = useGameStore(s => s.isGameStarted);
  const colorScheme     = useSettingsStore(s => s.colorScheme);
  const tableBackground = useSettingsStore(s => s.tableBackground);
  const feltColor       = useSettingsStore(s => s.feltColor);
  const showOdds        = useSettingsStore(s => s.showOddsCalculator);
  const gameState       = useGameStore(s => s.gameState);

  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [rightPanel, setRightPanel]     = useState<RightPanel>('tutorial');
  const [mobilePanel, setMobilePanel]   = useState<RightPanel>(null);

  const { w: windowWidth, h: windowHeight } = useWindowSize();
  const isMobile    = windowWidth < 640;
  const isTablet    = windowWidth >= 640 && windowWidth < 1024;
  const isLandscape = windowWidth > windowHeight;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorScheme);
    document.documentElement.setAttribute('data-bg', tableBackground);
    document.documentElement.setAttribute('data-felt', feltColor);
  }, [colorScheme, tableBackground, feltColor]);

  // Persistierte Hand-Historie einmalig laden
  useEffect(() => {
    void useGameStore.getState().loadHistory();
  }, []);

  if (!isGameStarted) return <GameSetup />;

  const panels: { id: RightPanel; icon: string; label: string }[] = [
    { id: 'tutorial', icon: '📖', label: t('ui.panelTutorial') },
    { id: 'chat',     icon: '💬', label: t('ui.panelChat') },
    { id: 'review',   icon: '🎯', label: t('ui.panelReview') },
    { id: 'stats',    icon: '📈', label: t('ui.panelStats') },
    { id: 'history',  icon: '📋', label: t('ui.panelHistory') },
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
    const mobileIsLandscape = isLandscape;
    const btnStyle = (active: boolean): React.CSSProperties => ({
      padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      border: '1px solid ' + (active ? 'var(--color-accent-border)' : 'var(--border-subtle)'),
      background: active ? 'var(--color-accent-soft)' : 'transparent',
      color: active ? 'var(--color-accent)' : 'var(--text-tertiary)',
      cursor: 'pointer', touchAction: 'manipulation',
    });

    return (
      <div className="app-ambient" style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar — in landscape, panel buttons live here to save vertical space */}
        <div style={{
          height: 40, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 8px', position: 'relative', zIndex: 10,
          background: 'var(--surface-bar)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>♠ Poker</span>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {mobileIsLandscape && panels.map(p => (
              <button
                key={p.id}
                onClick={() => setMobilePanel(mobilePanel === p.id ? null : p.id)}
                style={btnStyle(mobilePanel === p.id)}
              >{p.icon}</button>
            ))}

            <button
              onClick={() => useSettingsStore.getState().setShowOddsCalculator(!showOdds)}
              style={btnStyle(showOdds)}
            >📊</button>
            <button
              onClick={() => setSettingsOpen(true)}
              style={{ padding: '3px 8px', borderRadius: 6, fontSize: 12, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', cursor: 'pointer', touchAction: 'manipulation' }}
            >⚙️</button>
            <button
              onClick={() => setLeaveConfirmOpen(true)}
              style={{ padding: '3px 7px', borderRadius: 6, fontSize: 11, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-faint)', cursor: 'pointer', touchAction: 'manipulation' }}
            >✕</button>
          </div>
        </div>

        {/* Table — fills all space between top bar and (portrait) bottom nav */}
        <div style={{
          flex: 1, minHeight: 0, position: 'relative',
          display: 'flex', flexDirection: 'column',
          overflow: mobileIsLandscape ? 'hidden' : 'hidden auto',
        }}>
          {/* Odds im Querformat als kompaktes Overlay — im Hochformat als Block unter dem Tisch */}
          {showOdds && mobileIsLandscape && (
            <div style={{
              position: 'absolute', top: 4, left: 4, zIndex: 20,
              width: 150,
              maxHeight: 'calc(100% - 8px)', overflow: 'hidden auto',
              background: 'var(--surface-panel)', backdropFilter: 'blur(20px)',
              border: '1px solid var(--border-subtle)', borderRadius: 10,
              padding: 6,
            }}>
              <OddsPanel />
            </div>
          )}

          <PokerTable />

          {showOdds && !mobileIsLandscape && (
            <div style={{
              margin: '6px 6px 10px', flexShrink: 0,
              background: 'var(--surface-panel)', backdropFilter: 'blur(20px)',
              border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 8,
            }}>
              <OddsPanel />
            </div>
          )}

          {/* Panel overlay (full-screen modal over the table) */}
          {mobilePanel && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 30,
              background: 'var(--color-bg-panel)', backdropFilter: 'blur(24px)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}>
              {/* Header with title + close button */}
              <div style={{
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--surface-bar)',
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {panels.find(p => p.id === mobilePanel)?.icon}&nbsp;&nbsp;{panels.find(p => p.id === mobilePanel)?.label}
                </span>
                <button
                  onClick={() => setMobilePanel(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 14px', borderRadius: 20,
                    background: 'var(--surface-inset-hover)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-primary)', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', touchAction: 'manipulation',
                    letterSpacing: '0.03em',
                  }}
                >
                  ✕ {t('ui.close')}
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden auto', padding: '8px 10px' }}>
                {mobilePanel === 'tutorial' && <TutorialPanel />}
                {mobilePanel === 'chat'     && <StrategyChat />}
                {mobilePanel === 'stats'    && <StatsPanel />}
                {mobilePanel === 'history'  && <HandHistoryPanel />}
                {mobilePanel === 'review'   && <ReviewPanel />}
              </div>
            </div>
          )}
        </div>

        {/* Bottom nav — portrait only; in landscape the top bar has the buttons */}
        {!mobileIsLandscape && (
          <div style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center',
            background: 'var(--surface-bar)', backdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--border-subtle)',
            padding: '0 2px',
            height: 50, position: 'relative', zIndex: 10,
          }}>
            {panels.map(p => (
              <button
                key={p.id}
                onClick={() => setMobilePanel(mobilePanel === p.id ? null : p.id)}
                style={{
                  flex: 1, height: '100%',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  background: 'transparent', border: 'none', cursor: 'pointer', touchAction: 'manipulation',
                  color: mobilePanel === p.id ? 'var(--color-accent)' : 'var(--text-tertiary)',
                  borderTop: mobilePanel === p.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                  transition: 'color 0.15s',
                }}
              >
                <span style={{ fontSize: 18 }}>{p.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 600 }}>{p.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Skip button — position above bottom nav in portrait, near bottom in landscape */}
        {isAITurn && (
          <button
            onClick={() => useGameStore.getState().forceAITurn()}
            style={{
              position: 'fixed',
              bottom: mobileIsLandscape ? 8 : 60,
              right: 10,
              zIndex: 50,
              width: 42, height: 42, borderRadius: '50%',
              background: 'rgba(255,159,10,0.92)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,159,10,0.6)',
              color: '#fff', fontSize: 17, cursor: 'pointer', touchAction: 'manipulation',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(255,159,10,0.4)',
            }}
            title="AI-Zug überspringen"
          >⏭</button>
        )}

        <ConfirmDialog
        open={leaveConfirmOpen}
        message={t('ui.backToMenu')}
        confirmLabel={t('ui.mainMenu')}
        cancelLabel={t('ui.close')}
        onConfirm={() => { setLeaveConfirmOpen(false); useGameStore.getState().leaveGame(); }}
        onCancel={() => setLeaveConfirmOpen(false)}
      />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    );
  }

  // ─── TABLET LAYOUT (640–1023px) ───────────────────────────────────────────
  if (isTablet) {
    return (
      <div className="app-ambient" style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{
          height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 12px', flexShrink: 0, position: 'relative', zIndex: 10,
          background: 'var(--surface-bar)', backdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>♠ Poker</span>
            <div style={{ width: 1, height: 16, background: 'var(--border-strong)' }} />
            {panels.map(p => (
              <button key={p.id}
                onClick={() => setRightPanel(rightPanel === p.id ? null : p.id)}
                style={{
                  padding: '3px 9px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: rightPanel === p.id ? 'var(--color-accent-soft)' : 'transparent',
                  color: rightPanel === p.id ? 'var(--color-accent)' : 'var(--text-tertiary)',
                }}
              >{p.icon} {p.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => useSettingsStore.getState().setShowOddsCalculator(!showOdds)}
              style={{ padding: '3px 9px', borderRadius: 7, fontSize: 11, fontWeight: 600, border: '1px solid ' + (showOdds ? 'rgba(48,209,88,0.4)' : 'var(--border-subtle)'), background: showOdds ? 'rgba(48,209,88,0.12)' : 'transparent', color: showOdds ? 'var(--color-success)' : 'var(--text-tertiary)', cursor: 'pointer' }}
            >📊 Odds</button>
            <button onClick={() => setSettingsOpen(true)}
              style={{ padding: '3px 9px', borderRadius: 7, fontSize: 13, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >⚙️</button>
            <button onClick={() => setLeaveConfirmOpen(true)}
              style={{ padding: '3px 8px', borderRadius: 7, fontSize: 11, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-faint)', cursor: 'pointer' }}
            >✕</button>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'clip' }}>
          {/* Odds als eigene Spalte im Querformat — nie über dem Tisch */}
          {showOdds && isLandscape && (
            <div style={{
              width: 190, flexShrink: 0, overflow: 'hidden auto',
              borderRight: '1px solid var(--border-subtle)',
              background: 'var(--surface-bar)', padding: 8,
            }}>
              <OddsPanel />
            </div>
          )}

          {/* Center — im Hochformat scrollbar, Odds unter dem Tisch */}
          <div style={{ flex: 1, minWidth: 0, padding: 6, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden auto' }}>
            <PokerTable />
            {showOdds && !isLandscape && (
              <div style={{
                marginTop: 8, flexShrink: 0,
                background: 'var(--surface-panel)', backdropFilter: 'blur(20px)',
                border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 8,
              }}>
                <OddsPanel />
              </div>
            )}
          </div>

          {/* Right panel — narrower on tablet */}
          {rightPanel && (
            <div style={{
              width: 240, flexShrink: 0, overflow: 'hidden auto',
              borderLeft: '1px solid var(--border-subtle)',
              background: 'var(--surface-bar)', padding: 8,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {rightPanel === 'tutorial' && <TutorialPanel />}
              {rightPanel === 'chat'     && <StrategyChat />}
              {rightPanel === 'stats'    && <StatsPanel />}
              {rightPanel === 'history'  && <HandHistoryPanel />}
              {rightPanel === 'review'   && <ReviewPanel />}
              {rightPanel !== 'history'  && <RecentHandsBar />}
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

        <ConfirmDialog
        open={leaveConfirmOpen}
        message={t('ui.backToMenu')}
        confirmLabel={t('ui.mainMenu')}
        cancelLabel={t('ui.close')}
        onConfirm={() => { setLeaveConfirmOpen(false); useGameStore.getState().leaveGame(); }}
        onCancel={() => setLeaveConfirmOpen(false)}
      />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    );
  }

  // ─── DESKTOP LAYOUT (≥1024px) ─────────────────────────────────────────────
  return (
    <div className="app-ambient" style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{
        height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', flexShrink: 0, position: 'relative', zIndex: 10,
        background: 'var(--surface-bar)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            ♠ Poker
          </span>
          <div style={{ width: 1, height: 16, background: 'var(--border-strong)' }} />
          {panels.map(p => (
            <button key={p.id}
              onClick={() => setRightPanel(rightPanel === p.id ? null : p.id)}
              style={{
                padding: '3px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: rightPanel === p.id ? 'var(--color-accent-soft)' : 'transparent',
                color: rightPanel === p.id ? 'var(--color-accent)' : 'var(--text-tertiary)',
              }}
            >{p.icon} {p.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => useSettingsStore.getState().setShowOddsCalculator(!showOdds)}
            style={{
              padding: '3px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
              border: '1px solid ' + (showOdds ? 'rgba(48,209,88,0.4)' : 'var(--border-subtle)'),
              background: showOdds ? 'rgba(48,209,88,0.12)' : 'transparent',
              color: showOdds ? 'var(--color-success)' : 'var(--text-tertiary)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >📊 Odds</button>
          <button
            onClick={() => setSettingsOpen(true)}
            style={{ padding: '3px 9px', borderRadius: 7, fontSize: 13, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >⚙️</button>
          <button
            onClick={() => setLeaveConfirmOpen(true)}
            style={{ padding: '3px 9px', borderRadius: 7, fontSize: 11, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-faint)', cursor: 'pointer' }}
          >✕ Menü</button>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'clip' }}>

        {/* Left: Odds sidebar */}
        {showOdds && (
          <div style={{
            width: 210, flexShrink: 0, overflow: 'hidden auto',
            borderRight: '1px solid var(--border-subtle)',
            background: 'var(--surface-bar)', padding: 8,
          }}>
            <OddsPanel />
          </div>
        )}

        {/* Center: table — minWidth:0 keeps flex sizing correct; no overflow:hidden so seat cards aren't clipped */}
        <div style={{ flex: 1, minWidth: 0, padding: 6 }}>
          <PokerTable />
        </div>

        {/* Right: panel + recent hands stacked */}
        {rightPanel && (
          <div style={{
            width: 268, flexShrink: 0, overflow: 'hidden auto',
            borderLeft: '1px solid var(--border-subtle)',
            background: 'var(--surface-bar)', padding: 8,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {rightPanel === 'tutorial' && <TutorialPanel />}
            {rightPanel === 'chat'     && <StrategyChat />}
            {rightPanel === 'stats'    && <StatsPanel />}
            {rightPanel === 'history'  && <HandHistoryPanel />}
              {rightPanel === 'review'   && <ReviewPanel />}
            {rightPanel !== 'history'  && <RecentHandsBar />}
          </div>
        )}

        {/* Recent hands visible even without right panel open */}
        {!rightPanel && (
          <div style={{
            width: 180, flexShrink: 0, overflow: 'hidden auto',
            borderLeft: '1px solid var(--border-subtle)',
            background: 'var(--surface-bar)', padding: 8,
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

      <ConfirmDialog
        open={leaveConfirmOpen}
        message={t('ui.backToMenu')}
        confirmLabel={t('ui.mainMenu')}
        cancelLabel={t('ui.close')}
        onConfirm={() => { setLeaveConfirmOpen(false); useGameStore.getState().leaveGame(); }}
        onCancel={() => setLeaveConfirmOpen(false)}
      />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default App;
