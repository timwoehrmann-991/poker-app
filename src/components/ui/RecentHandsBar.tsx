import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { HandCategory } from '../../engine/types';

const HAND_NAMES: Record<number, string> = {
  [HandCategory.HighCard]:      'High Card',
  [HandCategory.OnePair]:       'One Pair',
  [HandCategory.TwoPair]:       'Two Pair',
  [HandCategory.ThreeOfAKind]:  'Three of a Kind',
  [HandCategory.Straight]:      'Straight',
  [HandCategory.Flush]:         'Flush',
  [HandCategory.FullHouse]:     'Full House',
  [HandCategory.FourOfAKind]:   'Four of a Kind',
  [HandCategory.StraightFlush]: 'Straight Flush',
  [HandCategory.RoyalFlush]:    'Royal Flush',
};

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
  [HandCategory.RoyalFlush]:    '#ffd60a',
};

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣',
};
const SUIT_COLORS: Record<string, string> = {
  spades: '#fff', hearts: '#ff453a', diamonds: '#ff453a', clubs: '#fff',
};

export const RecentHandsBar: React.FC = () => {
  const handHistory = useGameStore(s => s.handHistory);
  const gameState   = useGameStore(s => s.gameState);

  if (handHistory.length === 0) return null;

  const recent = handHistory.slice(-3).reverse();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
      width: '100%',
    }}>
      {/* Header */}
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.3)',
        marginBottom: 1,
      }}>
        Letzte Hände
      </div>

      {recent.map(record => {
        // Find the primary winner (highest amount in pot 0)
        const mainWinner = record.winners.reduce((best, w) =>
          w.amount > (best?.amount ?? 0) ? w : best,
        record.winners[0]);

        if (!mainWinner) return null;

        const winnerPlayer = record.players.find(p => p.id === mainWinner.playerId);
        const winnerName   = winnerPlayer?.name ?? 'Unknown';
        const handName     = mainWinner.hand ? (HAND_NAMES[mainWinner.hand.category] ?? '?') : 'Unknown';
        const handColor    = mainWinner.hand ? (HAND_COLORS[mainWinner.hand.category] ?? '#8e8e93') : '#8e8e93';
        const bestCards    = mainWinner.hand?.bestCards ?? [];
        const isHumanWin   = mainWinner.playerId === 'human';

        return (
          <div
            key={record.handNumber}
            style={{
              background: 'rgba(10,10,18,0.75)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${isHumanWin ? 'rgba(48,209,88,0.3)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: 10,
              padding: '6px 9px',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            {/* Top row: winner + amount */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: isHumanWin ? 'var(--color-success)' : 'rgba(255,255,255,0.7)',
                maxWidth: 70,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {isHumanWin ? '⭐ ' : ''}{winnerName}
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                color: isHumanWin ? 'var(--color-success)' : 'var(--color-accent)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                +€{mainWinner.amount}
              </span>
            </div>

            {/* Hand name */}
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              color: handColor,
              letterSpacing: '0.04em',
            }}>
              {handName}
            </div>

            {/* Best cards */}
            {bestCards.length > 0 && (
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {bestCards.slice(0, 5).map((card, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: SUIT_COLORS[card.suit] || '#fff',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: 4,
                      padding: '1px 3px',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.4,
                    }}
                  >
                    {card.rank}{SUIT_SYMBOLS[card.suit] || card.suit}
                  </span>
                ))}
              </div>
            )}

            {/* Hand # */}
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.18)', textAlign: 'right' }}>
              Hand #{record.handNumber}
            </div>
          </div>
        );
      })}
    </div>
  );
};
