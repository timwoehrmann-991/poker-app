import React from 'react';
import { Card } from '../../engine/types';
import { CardComponent } from '../cards/CardComponent';

interface CommunityCardsProps {
  cards: Card[];
  compact?: boolean;
}

export const CommunityCards: React.FC<CommunityCardsProps> = React.memo(({ cards, compact = false }) => {
  const gap = compact ? 4 : 8;
  const emptyW = compact ? 40 : 56;
  const emptyH = compact ? 58 : 80;

  return (
    <div style={{ display: 'flex', gap, justifyContent: 'center', alignItems: 'center' }}>
      {cards.map((card, i) => (
        // Eine Animationsquelle: card-deal im CardComponent.
        // Flop-Karten gestaffelt, Turn/River sofort.
        <CardComponent
          key={card.id}
          card={card}
          faceUp
          small={compact}
          dealDelay={i < 3 ? i * 120 : 0}
        />
      ))}
      {/* Placeholder for remaining cards */}
      {[...Array(Math.max(0, 5 - cards.length))].map((_, i) => (
        <div
          key={`empty-${i}`}
          className="rounded-lg border border-dashed border-[color:var(--border-subtle)]"
          style={{ width: emptyW, height: emptyH }}
        />
      ))}
    </div>
  );
});

CommunityCards.displayName = 'CommunityCards';
