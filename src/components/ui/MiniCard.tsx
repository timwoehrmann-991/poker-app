import React from 'react';
import { Card, RANK_NAMES, SUIT_SYMBOLS, Suit } from '../../engine/types';

/** Mini-Spielkarte wie eine echte Karte — weiß mit farbigem Symbol */
export const MiniCard: React.FC<{ card: Card; highlighted?: boolean }> = ({ card, highlighted }) => {
  const isRed = card.suit === Suit.Hearts || card.suit === Suit.Diamonds;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 20, height: 26, padding: '0 2px',
      borderRadius: 4, lineHeight: 1,
      background: 'linear-gradient(160deg, var(--color-card-bg), var(--color-card-bg-2))',
      border: highlighted ? '1.5px solid var(--color-accent)' : '1px solid var(--color-card-border)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      fontSize: 9, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
      color: isRed ? 'var(--color-card-red)' : 'var(--color-card-black)',
      flexDirection: 'column', gap: 1,
    }}>
      <span>{RANK_NAMES[card.rank]}</span>
      <span style={{ fontSize: 8 }}>{SUIT_SYMBOLS[card.suit]}</span>
    </span>
  );
};
