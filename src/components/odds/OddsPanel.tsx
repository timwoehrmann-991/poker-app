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
  const showOdds  = useSettingsStore(s => s.showOddsCalculator);

  const humanPlayer = gameState?.players.find(p => p.isHuman);
  const opponents   = gameState?.players.filter(
    p => !p.isHuman && (p.status === PlayerStatus.Active || p.status === PlayerStatus.AllIn)
  ).length || 0;

  const { result, isCalculating } = useOddsCalculator(
    humanPlayer?.holeCards || null,
    gameState?.communityCards || [],
    opponents,
    showOdds && !!gameState?.isHandInProgress,
  );

  if (!showOdds || !gameState?.isHandInProgress || !humanPlayer?.holeCards) return null;

  const totalPot = getTotalPot(gameState.pots) + gameState.players.reduce((s, p) => s + p.currentBet, 0);
  const toCall   = gameState.activePlayerIndex !== null
    ? Math.max(0, Math.max(...gameState.players.map(p => p.currentBet)) - (humanPlayer.currentBet ?? 0))
    : 0;
  const potOdds  = toCall > 0 ? toCall / (totalPot + toCall) : 0;
  const ev       = result ? (result.equity * (totalPot + toCall)) - toCall : 0;
  const isProfitable = result ? result.equity > potOdds : false;

  const winPct = result ? result.winProbability * 100 : 0;

  return (
    <div style={{
      background: 'rgba(10,10,18,0.82)',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 16,
      padding: 14,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <span style={{ fontSize: 13 }}>📊</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
          {t('odds.title')}
        </span>
      </div>

      {isCalculating && !result ? (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '16px 0', letterSpacing: '0.04em' }}>
          {t('odds.calculating')}…
        </div>
      ) : result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Win probability — hero stat */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {t('odds.winProbability')}
              </span>
              <span style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: getEquityColor(result.winProbability), letterSpacing: '-0.02em' }}>
                {winPct.toFixed(1)}%
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${winPct}%`,
                background: `linear-gradient(90deg, ${getEquityColor(result.winProbability)}cc, ${getEquityColor(result.winProbability)})`,
                transition: 'width 0.5s ease',
                boxShadow: `0 0 8px ${getEquityColor(result.winProbability)}60`,
              }} />
            </div>
            {/* Win/Tie/Loss breakdown */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
              <span style={{ color: '#30d158' }}>W {(result.winProbability * 100).toFixed(0)}%</span>
              <span style={{ color: '#ff9f0a' }}>T {(result.tieProbability * 100).toFixed(0)}%</span>
              <span style={{ color: '#ff453a' }}>L {(result.lossProbability * 100).toFixed(0)}%</span>
            </div>
          </div>

          <Divider />

          {/* Equity + Pot Odds + EV */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <StatRow label="Equity" value={`${(result.equity * 100).toFixed(1)}%`} />
            {toCall > 0 && (
              <StatRow label={t('odds.potOdds')} value={`${(potOdds * 100).toFixed(1)}%`} />
            )}
            <StatRow
              label={t('odds.ev')}
              value={`${ev >= 0 ? '+' : ''}€${ev.toFixed(1)}`}
              valueColor={ev >= 0 ? '#30d158' : '#ff453a'}
            />
          </div>

          {/* EV indicator */}
          {toCall > 0 && (
            <div style={{
              padding: '8px 12px', borderRadius: 10,
              background: isProfitable ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)',
              border: `1px solid ${isProfitable ? 'rgba(48,209,88,0.3)' : 'rgba(255,69,58,0.3)'}`,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 14 }}>{isProfitable ? '✅' : '❌'}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: isProfitable ? '#30d158' : '#ff453a' }}>
                  {isProfitable ? 'Call profitabel' : 'Fold empfohlen'}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                  Break-even: {(potOdds * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* Outs */}
          {result.outs.length > 0 && (
            <>
              <Divider />
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  {t('odds.outs')}
                </div>
                {result.outs.map((out, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{out.drawType}</span>
                    <span style={{ color: '#fff', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{out.outs} outs</span>
                  </div>
                ))}
                {gameState.communityCards.length < 5 && (
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 5, padding: '5px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 7 }}>
                    Rule of {gameState.communityCards.length === 3 ? '4' : '2'}:{' '}
                    ≈{(result.outs.reduce((s, o) => s + o.outs, 0) * (gameState.communityCards.length === 3 ? 4 : 2)).toFixed(0)}%
                  </div>
                )}
              </div>
            </>
          )}

          {/* Simulation info */}
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', textAlign: 'right', marginTop: 2 }}>
            50k Sims · {result.calculationTimeMs.toFixed(0)}ms
          </div>
        </div>
      ) : null}
    </div>
  );
};

function getEquityColor(equity: number): string {
  if (equity > 0.65) return '#30d158';
  if (equity > 0.45) return '#ff9f0a';
  return '#ff453a';
}

const Divider: React.FC = () => (
  <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
);

const StatRow: React.FC<{ label: string; value: string; valueColor?: string }> = ({ label, value, valueColor }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 700, color: valueColor || '#fff', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  </div>
);
