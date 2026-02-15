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
  const colorScheme = useSettingsStore(s => s.colorScheme);
  const showOdds = useSettingsStore(s => s.showOddsCalculator);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>('tutorial');

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorScheme);
  }, [colorScheme]);

  if (!isGameStarted) {
    return <GameSetup />;
  }

  const panelButtons: { id: RightPanel; label: string }[] = [
    { id: 'tutorial', label: '📖 Tutorial' },
    { id: 'chat', label: '💬 Chat' },
    { id: 'stats', label: '📈 Stats' },
    { id: 'history', label: '📋 History' },
  ];

  return (
    <div
      className="w-screen h-screen flex flex-col overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Top bar */}
      <div
        className="h-10 flex items-center justify-between px-4 border-b flex-shrink-0"
        style={{
          background: 'var(--color-bg-secondary)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white">♠ Poker</span>
          {panelButtons.map(btn => (
            <button
              key={btn.id}
              onClick={() => setRightPanel(rightPanel === btn.id ? null : btn.id)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                rightPanel === btn.id
                  ? 'bg-yellow-600/30 text-yellow-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => useSettingsStore.getState().setShowOddsCalculator(!showOdds)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              showOdds
                ? 'bg-green-600/30 text-green-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            📊 Odds
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            ⚙️
          </button>
          <button
            onClick={() => {
              if (confirm('Zurück zum Hauptmenü?')) {
                useGameStore.setState({
                  isGameStarted: false,
                  gameState: null,
                  controller: null,
                });
              }
            }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            🚪 Menü
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Odds Calculator */}
        {showOdds && (
          <div className="w-56 p-2 flex-shrink-0 overflow-y-auto border-r" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <OddsPanel />
          </div>
        )}

        {/* Center - Poker table */}
        <div className="flex-1 p-2 overflow-hidden">
          <PokerTable />
        </div>

        {/* Right sidebar */}
        {rightPanel && (
          <div className="w-72 p-2 flex-shrink-0 overflow-y-auto border-l" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {rightPanel === 'tutorial' && <TutorialPanel />}
            {rightPanel === 'chat' && <StrategyChat />}
            {rightPanel === 'stats' && <StatsPanel />}
            {rightPanel === 'history' && <HandHistoryPanel />}
          </div>
        )}
      </div>

      {/* Settings modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default App;
