import React, { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { HandRecord, ActionType, PlayerStatus } from '../../engine/types';

interface PlayerStats {
  handsPlayed: number;
  handsWon: number;
  vpip: number; // % of hands voluntarily put money in pot
  pfr: number;  // % of hands preflop raise
  aggressionFactor: number;
  totalProfit: number;
  biggestPot: number;
  showdownWins: number;
  showdowns: number;
}

function calculateStats(history: HandRecord[], playerId: string): PlayerStats {
  if (history.length === 0) {
    return { handsPlayed: 0, handsWon: 0, vpip: 0, pfr: 0, aggressionFactor: 0, totalProfit: 0, biggestPot: 0, showdownWins: 0, showdowns: 0 };
  }

  let handsPlayed = 0;
  let handsWon = 0;
  let vpipCount = 0;
  let pfrCount = 0;
  let betsRaises = 0;
  let calls = 0;
  let totalProfit = 0;
  let biggestPot = 0;
  let showdownWins = 0;
  let showdowns = 0;

  for (const hand of history) {
    const playerInfo = hand.players.find(p => p.id === playerId);
    if (!playerInfo) continue;

    handsPlayed++;

    // Check if player won
    const winResult = hand.winners.find(w => w.playerId === playerId);
    if (winResult) {
      handsWon++;
      biggestPot = Math.max(biggestPot, winResult.amount);
    }

    // Calculate profit
    const startChips = playerInfo.startingChips;
    const wonAmount = hand.winners
      .filter(w => w.playerId === playerId)
      .reduce((sum, w) => sum + w.amount, 0);
    const invested = hand.actions
      .filter(a => a.playerId === playerId && a.amount > 0)
      .reduce((sum, a) => sum + a.amount, 0);
    totalProfit += wonAmount - invested;

    // VPIP: did player voluntarily put money in the pot preflop?
    const preflopActions = hand.actions.filter(
      a => a.playerId === playerId &&
      a.type !== ActionType.PostSmallBlind &&
      a.type !== ActionType.PostBigBlind
    );
    const voluntaryAction = preflopActions.find(
      a => a.type === ActionType.Call || a.type === ActionType.Raise ||
           a.type === ActionType.Bet || a.type === ActionType.AllIn
    );
    if (voluntaryAction) vpipCount++;

    // PFR: did player raise preflop?
    const preflopRaise = preflopActions.find(
      a => a.type === ActionType.Raise || a.type === ActionType.AllIn
    );
    if (preflopRaise) pfrCount++;

    // Aggression stats
    for (const action of hand.actions) {
      if (action.playerId !== playerId) continue;
      if (action.type === ActionType.Bet || action.type === ActionType.Raise) betsRaises++;
      if (action.type === ActionType.Call) calls++;
    }

    // Showdown stats
    if (hand.finalStreet === 'showdown') {
      const wasInHand = hand.winners.some(w => w.playerId === playerId) ||
        hand.actions.some(a => a.playerId === playerId && a.type !== ActionType.Fold);
      if (wasInHand) {
        showdowns++;
        if (winResult) showdownWins++;
      }
    }
  }

  return {
    handsPlayed,
    handsWon,
    vpip: handsPlayed > 0 ? (vpipCount / handsPlayed) * 100 : 0,
    pfr: handsPlayed > 0 ? (pfrCount / handsPlayed) * 100 : 0,
    aggressionFactor: calls > 0 ? betsRaises / calls : betsRaises,
    totalProfit,
    biggestPot,
    showdownWins,
    showdowns,
  };
}

export const StatsPanel: React.FC = () => {
  const handHistory = useGameStore(s => s.handHistory);
  const gameState = useGameStore(s => s.gameState);

  const humanStats = useMemo(() =>
    calculateStats(handHistory, 'human'),
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
        stats: calculateStats(handHistory, p.id),
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
        border: '1px solid rgba(255,255,255,0.1)',
        maxHeight: '100%',
      }}
    >
      <div className="px-3 py-2 border-b border-white/10">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Statistiken
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Your Stats */}
        <div>
          <h4 className="text-sm font-bold text-white mb-2">Deine Statistiken</h4>
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
              <ProfitGraph history={handHistory} playerId="human" bigBlind={gameState?.config.bigBlind || 2} />
            </div>
          )}
        </div>

        {/* Opponent stats */}
        {aiStats.length > 0 && handHistory.length >= 5 && (
          <div>
            <h4 className="text-sm font-bold text-white mb-2">Gegner-Stats</h4>
            <div className="space-y-1.5">
              {aiStats.map(ai => (
                <div key={ai.name} className="text-[10px] p-1.5 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex justify-between">
                    <span className="text-gray-300 font-medium">{ai.name}</span>
                    <span className="text-yellow-400">€{ai.chips}</span>
                  </div>
                  <div className="flex gap-2 text-gray-500 mt-0.5">
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
  <div className="p-1.5 rounded text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
    <div className="text-[9px] text-gray-500 uppercase">{label}</div>
    <div className="text-sm font-bold" style={{ color: color || 'var(--color-text)' }}>
      {value}
    </div>
  </div>
);

const ProfitGraph: React.FC<{ history: HandRecord[]; playerId: string; bigBlind: number }> = ({ history, playerId, bigBlind }) => {
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
