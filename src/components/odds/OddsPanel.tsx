import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { useOddsCalculator } from '../../hooks/useOddsCalculator';
import { useSettingsStore } from '../../store/settingsStore';
import { useTranslation } from '../../i18n';
import { PlayerStatus } from '../../engine/types';
import { getTotalPot } from '../../engine/game/PotManager';

export const OddsPanel: React.FC = () => {
  const { t } = useTranslation();
  const gameState = useGameStore(s => s.gameState);
  const showOdds = useSettingsStore(s => s.showOddsCalculator);

  const humanPlayer = gameState?.players.find(p => p.isHuman);
  const opponents = gameState?.players.filter(
    p => !p.isHuman && (p.status === PlayerStatus.Active || p.status === PlayerStatus.AllIn)
  ).length || 0;

  const { result, isCalculating } = useOddsCalculator(
    humanPlayer?.holeCards || null,
    gameState?.communityCards || [],
    opponents,
    showOdds && !!gameState?.isHandInProgress,
  );

  if (!showOdds || !gameState?.isHandInProgress || !humanPlayer?.holeCards) return null;

  const totalPot = getTotalPot(gameState.pots) +
    gameState.players.reduce((sum, p) => sum + p.currentBet, 0);

  // Calculate pot odds
  const toCall = gameState.activePlayerIndex !== null
    ? Math.max(0, Math.max(...gameState.players.map(p => p.currentBet)) - humanPlayer.currentBet)
    : 0;
  const potOdds = toCall > 0 ? toCall / (totalPot + toCall) : 0;

  // Calculate EV
  const ev = result ? (result.equity * (totalPot + toCall)) - toCall : 0;

  return (
    <div
      className="w-56 rounded-xl p-3 space-y-3 overflow-y-auto"
      style={{
        background: 'var(--color-bg-panel)',
        border: '1px solid rgba(255,255,255,0.1)',
        maxHeight: '100%',
      }}
    >
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
        {t('odds.title')}
      </h3>

      {isCalculating && !result ? (
        <div className="text-sm text-gray-500 animate-pulse">{t('odds.calculating')}</div>
      ) : result ? (
        <>
          {/* Win Probability */}
          <div>
            <div className="text-[10px] text-gray-500 uppercase">{t('odds.winProbability')}</div>
            <div className="text-2xl font-bold" style={{ color: getEquityColor(result.winProbability) }}>
              {(result.winProbability * 100).toFixed(1)}%
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${result.winProbability * 100}%`,
                  background: `linear-gradient(90deg, #e74c3c, #f39c12, #2ecc71)`,
                  backgroundSize: '300% 100%',
                  backgroundPosition: `${(1 - result.winProbability) * 100}% 0`,
                }}
              />
            </div>
          </div>

          {/* Equity */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500 uppercase">{t('odds.equity')}</span>
            <span className="text-sm font-semibold text-white">
              {(result.equity * 100).toFixed(1)}%
            </span>
          </div>

          {/* Pot Odds */}
          {toCall > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-500 uppercase">{t('odds.potOdds')}</span>
              <span className="text-sm font-semibold text-white">
                {(potOdds * 100).toFixed(1)}%
              </span>
            </div>
          )}

          {/* EV */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500 uppercase">{t('odds.ev')}</span>
            <span className={`text-sm font-semibold ${ev >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {ev >= 0 ? '+' : ''}€{ev.toFixed(1)}
            </span>
          </div>

          {/* Outs */}
          {result.outs.length > 0 && (
            <div>
              <div className="text-[10px] text-gray-500 uppercase mb-1">{t('odds.outs')}</div>
              {result.outs.map((out, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-gray-400">{out.drawType}</span>
                  <span className="text-white font-medium">{out.outs} outs</span>
                </div>
              ))}
              {gameState.communityCards.length < 5 && (
                <div className="text-[9px] text-gray-600 mt-1">
                  ≈ {(result.outs.reduce((s, o) => s + o.outs, 0) * (gameState.communityCards.length === 3 ? 4 : 2)).toFixed(0)}% (Rule of {gameState.communityCards.length === 3 ? '4' : '2'})
                </div>
              )}
            </div>
          )}

          {/* Calculation time */}
          <div className="text-[9px] text-gray-700">
            10k Iterationen in {result.calculationTimeMs.toFixed(0)}ms
          </div>
        </>
      ) : null}
    </div>
  );
};

function getEquityColor(equity: number): string {
  if (equity > 0.65) return '#2ecc71';
  if (equity > 0.45) return '#f39c12';
  return '#e74c3c';
}
