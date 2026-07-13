import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { HandCategory } from '../../engine/types';
import { MiniCard } from './MiniCard';
import { useTranslation } from '../../i18n';
import { describeHand } from '../../i18n/handDescription';
import { formatEuro } from '../../utils/format';

const HAND_COLORS: Record<number, string> = {
  [HandCategory.HighCard]:      '#8e8e93',
  [HandCategory.OnePair]:       '#8e8e93',
  [HandCategory.TwoPair]:       '#ff9f0a',
  [HandCategory.ThreeOfAKind]:  '#ff9f0a',
  [HandCategory.Straight]:      '#0a84ff',
  [HandCategory.Flush]:         '#0a84ff',
  [HandCategory.FullHouse]:     '#bf5af2',
  [HandCategory.FourOfAKind]:   '#ff453a',
  [HandCategory.StraightFlush]: '#ff453a',
  [HandCategory.RoyalFlush]:    '#e3b64a',
};


export const RecentHandsBar: React.FC = () => {
  const { t, language } = useTranslation();
  const handHistory = useGameStore(s => s.handHistory);

  if (handHistory.length === 0) return null;

  const recent = handHistory.slice(-4).reverse();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {/* Header */}
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--text-tertiary)', marginBottom: 1,
      }}>
        {t('ui.recentHands')}
      </div>

      {recent.map(record => {
        const mainWinner = record.winners.reduce((best, w) =>
          w.amount > (best?.amount ?? 0) ? w : best,
        record.winners[0]);

        if (!mainWinner) return null;

        const winnerPlayer = record.players.find(p => p.id === mainWinner.playerId);
        const winnerName   = winnerPlayer?.name ?? '?';
        const handColor    = mainWinner.hand ? (HAND_COLORS[mainWinner.hand.category] ?? '#8e8e93') : '#8e8e93';
        const bestCards    = mainWinner.hand?.bestCards ?? [];
        const isHumanWin   = mainWinner.playerId === 'human';
        const totalPot     = record.pots.reduce((s, p) => s + p.amount, 0);
        // Ohne Showdown gibt es keine aufgedeckte Hand — Gewinn durch Aufgeben der anderen
        const wonWithoutShowdown = !mainWinner.hand;

        return (
          <div
            key={record.handNumber}
            style={{
              background: 'var(--surface-panel)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${isHumanWin ? 'rgba(48,209,88,0.4)' : 'var(--border-subtle)'}`,
              borderLeft: `3px solid ${isHumanWin ? 'var(--color-success)' : handColor}`,
              borderRadius: 10,
              padding: '7px 9px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {/* Zeile 1: Hand-Nr + Gewinner + Betrag */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, minWidth: 0 }}>
                <span style={{ fontSize: 8, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  #{record.handNumber}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: isHumanWin ? 'var(--color-success)' : 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {isHumanWin ? '⭐ ' : ''}{winnerName}
                </span>
              </span>
              <span style={{
                fontSize: 11, fontWeight: 800, flexShrink: 0,
                color: isHumanWin ? 'var(--color-success)' : 'var(--color-accent)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                +{formatEuro(mainWinner.amount)}
              </span>
            </div>

            {/* Zeile 2: Gewinnerhand */}
            <div style={{ fontSize: 9, fontWeight: 700, color: handColor, letterSpacing: '0.02em' }}>
              {wonWithoutShowdown
                ? (language === 'de' ? 'Alle anderen ausgestiegen' : 'Everyone else folded')
                : describeHand(mainWinner.hand!, language)}
            </div>

            {/* Zeile 3: beste 5 Karten als Mini-Karten */}
            {bestCards.length > 0 && (
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {bestCards.slice(0, 5).map((card, i) => (
                  <MiniCard key={i} card={card} />
                ))}
              </div>
            )}

            {/* Eigene Hand + Ergebnis */}
            {(() => {
              const me = record.players.find(p => p.id === 'human');
              if (!me?.holeCards) return null;
              const won = record.winners.filter(w => w.playerId === 'human').reduce((s2, w) => s2 + w.amount, 0);
              const invested = record.actions.filter(a => a.playerId === 'human' && a.amount > 0).reduce((s2, a) => s2 + a.amount, 0);
              const profit = won - invested;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 3, borderTop: '1px dashed var(--border-subtle)' }}>
                  <span style={{ fontSize: 8, color: 'var(--text-tertiary)', fontWeight: 700 }}>Du:</span>
                  <MiniCard card={me.holeCards[0]} />
                  <MiniCard card={me.holeCards[1]} />
                  <span style={{
                    marginLeft: 'auto', fontSize: 9, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                    color: profit > 0 ? 'var(--color-success)' : profit < 0 ? 'var(--color-danger)' : 'var(--text-tertiary)',
                  }}>
                    {profit > 0 ? '+' : ''}{formatEuro(profit)}
                  </span>
                </div>
              );
            })()}

            {/* Zeile 4: Pot */}
            <div style={{ fontSize: 8, color: 'var(--text-faint)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('ui.pot')}: {formatEuro(totalPot)}</span>
              <span>{t(`street.${record.finalStreet}` as Parameters<typeof t>[0])}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
