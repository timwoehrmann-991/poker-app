import React, { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { HandRecord } from '../../engine/types';
import { calculatePlayerStats } from '../../utils/playerStats';



export const StatsPanel: React.FC = () => {
  const handHistory = useGameStore(s => s.handHistory);
  const gameState = useGameStore(s => s.gameState);

  const humanStats = useMemo(() =>
    calculatePlayerStats(handHistory, 'human'),
    [handHistory]
  );

  const aiStats = useMemo(() => {
    if (!gameState) return [];
    return gameState.players
      .filter(p => !p.isHuman)
      .map(p => ({
        name: p.name,
        personality: p.aiPersonality || 'unknown',
        chips: p.chips,
        stats: calculatePlayerStats(handHistory, p.id),
      }));
  }, [handHistory, gameState]);

  const winRate = humanStats.handsPlayed > 0
    ? ((humanStats.totalProfit / humanStats.handsPlayed) * 100 / (gameState?.config.bigBlind || 2)).toFixed(1)
    : '0';

  return (
    <div
      className="w-72 rounded-xl flex flex-col overflow-hidden"
      style={{
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--border-subtle)',
        maxHeight: '100%',
      }}
    >
      <div className="px-3 py-2 border-b border-[color:var(--border-subtle)]">
        <h3 className="text-xs font-bold text-[color:var(--text-secondary)] uppercase tracking-wider">
          Statistiken
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Your Stats */}
        <div>
          <h4 className="text-sm font-bold text-[color:var(--text-primary)] mb-2">Deine Statistiken</h4>
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Hände" value={String(humanStats.handsPlayed)} />
            <StatBox label="Gewonnen" value={String(humanStats.handsWon)} />
            <StatBox
              label="Profit"
              value={`€${humanStats.totalProfit >= 0 ? '+' : ''}${humanStats.totalProfit}`}
              color={humanStats.totalProfit >= 0 ? '#2ecc71' : '#e74c3c'}
            />
            <StatBox label="BB/100" value={winRate} />
            <StatBox label="VPIP" value={`${humanStats.vpip.toFixed(0)}%`} />
            <StatBox label="PFR" value={`${humanStats.pfr.toFixed(0)}%`} />
            <StatBox label="AF" value={humanStats.aggressionFactor.toFixed(1)} />
            <StatBox label="Max Pot" value={`€${humanStats.biggestPot}`} />
          </div>

          {/* Profit graph (simple SVG sparkline) */}
          {handHistory.length > 1 && (
            <div className="mt-2">
              <ProfitGraph history={handHistory} playerId="human" />
            </div>
          )}
        </div>

        {/* Opponent stats */}
        {aiStats.length > 0 && handHistory.length >= 5 && (
          <div>
            <h4 className="text-sm font-bold text-[color:var(--text-primary)] mb-2">Gegner-Stats</h4>
            <div className="space-y-1.5">
              {aiStats.map(ai => (
                <div key={ai.name} className="text-[10px] p-1.5 rounded" style={{ background: 'var(--surface-inset)' }}>
                  <div className="flex justify-between">
                    <span className="text-[color:var(--text-secondary)] font-medium">{ai.name}</span>
                    <span className="text-[color:var(--color-accent)]">€{ai.chips}</span>
                  </div>
                  <div className="flex gap-2 text-[color:var(--text-tertiary)] mt-0.5">
                    <span>VPIP: {ai.stats.vpip.toFixed(0)}%</span>
                    <span>PFR: {ai.stats.pfr.toFixed(0)}%</span>
                    <span>AF: {ai.stats.aggressionFactor.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div className="p-1.5 rounded text-center" style={{ background: 'var(--surface-inset)' }}>
    <div className="text-[9px] text-[color:var(--text-tertiary)] uppercase">{label}</div>
    <div className="text-sm font-bold" style={{ color: color || 'var(--color-text)' }}>
      {value}
    </div>
  </div>
);

const ProfitGraph: React.FC<{ history: HandRecord[]; playerId: string }> = ({ history, playerId }) => {
  const points = useMemo(() => {
    let cumProfit = 0;
    const pts: number[] = [0];
    for (const hand of history) {
      const wonAmount = hand.winners
        .filter(w => w.playerId === playerId)
        .reduce((sum, w) => sum + w.amount, 0);
      const invested = hand.actions
        .filter(a => a.playerId === playerId && a.amount > 0)
        .reduce((sum, a) => sum + a.amount, 0);
      cumProfit += wonAmount - invested;
      pts.push(cumProfit);
    }
    return pts;
  }, [history, playerId]);

  if (points.length < 2) return null;

  const width = 240;
  const height = 50;
  const maxVal = Math.max(Math.abs(Math.min(...points)), Math.abs(Math.max(...points)), 1);
  const midY = height / 2;

  const pathD = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = midY - (p / maxVal) * (height / 2 - 2);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  const lastPoint = points[points.length - 1];
  const color = lastPoint >= 0 ? '#2ecc71' : '#e74c3c';

  return (
    <svg width={width} height={height} className="w-full">
      {/* Zero line */}
      <line x1={0} y1={midY} x2={width} y2={midY} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
      {/* Profit line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
};
