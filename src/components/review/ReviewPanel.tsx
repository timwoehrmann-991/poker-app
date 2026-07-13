import React, { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useTrainingStore, TrainingRecord } from '../../store/trainingStore';
import { calculatePlayerStats } from '../../utils/playerStats';
import { detectLeaks, MIN_HANDS_FOR_LEAKS } from '../../utils/leakDetector';
import { MiniCard } from '../ui/MiniCard';
import { useTranslation } from '../../i18n';
import { Street } from '../../engine/types';
import { formatEuro } from '../../utils/format';

const RATING_COLORS: Record<string, string> = {
  excellent: '#30d158', good: '#30d158', okay: '#ff9f0a',
  mistake: '#ff9f0a', blunder: '#ff453a',
};

const STREET_ORDER: Street[] = [Street.Preflop, Street.Flop, Street.Turn, Street.River];

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
    color: 'var(--text-tertiary)', marginBottom: 6,
  }}>
    {children}
  </div>
);

/** Genauigkeit pro Street aus den Trainings-Records */
function accuracyByStreet(records: TrainingRecord[]): { street: Street; pct: number; n: number }[] {
  return STREET_ORDER.map(street => {
    const recs = records.filter(r => r.street === street);
    const good = recs.filter(r => r.rating === 'excellent' || r.rating === 'good').length;
    return { street, pct: recs.length > 0 ? (good / recs.length) * 100 : 0, n: recs.length };
  }).filter(e => e.n > 0);
}

const MistakeCard: React.FC<{ record: TrainingRecord }> = ({ record }) => {
  const { t } = useTranslation();
  return (
    <div style={{
      padding: '8px 10px', borderRadius: 10,
      background: 'var(--surface-inset)',
      borderLeft: `3px solid ${RATING_COLORS[record.rating]}`,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: RATING_COLORS[record.rating], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {record.rating === 'blunder' ? 'Grober Fehler' : 'Fehler'} · {t(`street.${record.street}` as Parameters<typeof t>[0])} · {record.position}
        </span>
        <span style={{ fontSize: 8, color: 'var(--text-faint)' }}>#{record.handNumber}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        {record.holeCards?.map((c, i) => <MiniCard key={i} card={c} highlighted />)}
        {record.board.length > 0 && (
          <>
            <span style={{ fontSize: 8, color: 'var(--text-faint)', margin: '0 2px' }}>Board</span>
            {record.board.map((c, i) => <MiniCard key={`b${i}`} card={c} />)}
          </>
        )}
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
        Gespielt: <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>
          {t(`action.${record.playerAction}` as Parameters<typeof t>[0])}
          {record.playerAmount > 0 ? ` ${formatEuro(record.playerAmount)}` : ''}
        </span>
        {' · '}Besser: <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
          {t(`action.${record.optimalAction}` as Parameters<typeof t>[0])}
          {record.optimalAmount > 0 ? ` ${formatEuro(record.optimalAmount)}` : ''}
        </span>
      </div>

      {record.reasoning && (
        <div style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{record.reasoning}</div>
      )}
    </div>
  );
};

export const ReviewPanel: React.FC = () => {
  const { t } = useTranslation();
  const records     = useTrainingStore(s => s.records);
  const handHistory = useGameStore(s => s.handHistory);

  const heroStats = useMemo(() => calculatePlayerStats(handHistory, 'human'), [handHistory]);
  const leaks     = useMemo(() => detectLeaks(heroStats), [heroStats]);
  const streetAcc = useMemo(() => accuracyByStreet(records), [records]);

  const totalGood = records.filter(r => r.rating === 'excellent' || r.rating === 'good').length;
  const accuracy  = records.length > 0 ? (totalGood / records.length) * 100 : null;

  const mistakes = useMemo(() =>
    records.filter(r => r.rating === 'mistake' || r.rating === 'blunder').slice(-5).reverse(),
  [records]);

  // Equity-Verlauf der letzten selbst gespielten Hand
  const lastEquityHand = useMemo(() => {
    for (let i = handHistory.length - 1; i >= 0; i--) {
      const h = handHistory[i];
      if (h.heroEquityByStreet && Object.keys(h.heroEquityByStreet).length >= 2) return h;
    }
    return null;
  }, [handHistory]);

  return (
    <div
      className="w-full rounded-xl flex flex-col overflow-hidden"
      style={{
        background: 'var(--surface-panel)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--glass-shadow)',
        maxHeight: '100%',
      }}
    >
      <div className="px-3 py-2 border-b border-[color:var(--border-subtle)] flex justify-between items-center">
        <h3 className="text-xs font-bold text-[color:var(--text-secondary)] uppercase tracking-wider">
          🎯 Session-Review
        </h3>
        {accuracy !== null && (
          <span style={{
            fontSize: 11, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
            color: accuracy >= 70 ? 'var(--color-success)' : accuracy >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
          }}>
            {accuracy.toFixed(0)} %
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {records.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0' }}>
            Spiele mit aktiviertem Lern-Coach — hier entsteht dein persönliches Review.
          </div>
        ) : (
          <>
            {/* Genauigkeit nach Street */}
            {streetAcc.length > 0 && (
              <div>
                <SectionTitle>Genauigkeit nach Street ({records.length} Entscheidungen)</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {streetAcc.map(e => (
                    <div key={e.street} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)', width: 52, flexShrink: 0 }}>
                        {t(`street.${e.street}` as Parameters<typeof t>[0])}
                      </span>
                      <div style={{ flex: 1, height: 6, background: 'var(--surface-inset)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          width: `${e.pct}%`, height: '100%', borderRadius: 3,
                          background: e.pct >= 70 ? 'var(--color-success)' : e.pct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
                        }} />
                      </div>
                      <span style={{ fontSize: 9, color: 'var(--text-tertiary)', width: 56, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {e.pct.toFixed(0)} % ({e.n})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Größte Fehler */}
            {mistakes.length > 0 && (
              <div>
                <SectionTitle>Deine letzten Fehler</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {mistakes.map(m => <MistakeCard key={m.id} record={m} />)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Equity-Verlauf der letzten Hand */}
        {lastEquityHand?.heroEquityByStreet && (
          <div>
            <SectionTitle>Equity-Verlauf (Hand #{lastEquityHand.handNumber})</SectionTitle>
            <div style={{ display: 'flex', gap: 4 }}>
              {STREET_ORDER.map(street => {
                const eq = lastEquityHand.heroEquityByStreet?.[street];
                if (eq === undefined) return null;
                const pct = eq * 100;
                return (
                  <div key={street} style={{
                    flex: 1, padding: '6px 4px', borderRadius: 8, textAlign: 'center',
                    background: 'var(--surface-inset)',
                  }}>
                    <div style={{ fontSize: 8, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                      {t(`street.${street}` as Parameters<typeof t>[0])}
                    </div>
                    <div style={{
                      fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                      color: pct >= 55 ? 'var(--color-success)' : pct >= 35 ? 'var(--color-warning)' : 'var(--color-danger)',
                    }}>
                      {pct.toFixed(0)} %
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leak-Detektor */}
        <div>
          <SectionTitle>🔍 Leak-Detektor</SectionTitle>
          {heroStats.handsPlayed < MIN_HANDS_FOR_LEAKS ? (
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', padding: '6px 8px', background: 'var(--surface-inset)', borderRadius: 8 }}>
              Noch {MIN_HANDS_FOR_LEAKS - heroStats.handsPlayed} Hände, dann analysiere ich dein Spiel
              ({heroStats.handsPlayed}/{MIN_HANDS_FOR_LEAKS}).
            </div>
          ) : leaks.length === 0 ? (
            <div style={{ fontSize: 10, color: 'var(--color-success)', padding: '6px 8px', background: 'rgba(48,209,88,0.08)', borderRadius: 8 }}>
              ✓ Keine auffälligen Leaks über {heroStats.handsPlayed} Hände — weiter so!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {leaks.map((leak, i) => (
                <div key={i} style={{
                  padding: '7px 9px', borderRadius: 8,
                  background: 'var(--surface-inset)',
                  borderLeft: `3px solid ${leak.severity === 'hoch' ? 'var(--color-danger)' : leak.severity === 'mittel' ? 'var(--color-warning)' : 'var(--color-primary)'}`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)' }}>{leak.title}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>{leak.detail}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
