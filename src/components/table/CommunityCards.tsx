import React from 'react';
import { Card, Street } from '../../engine/types';
import { CardComponent } from '../cards/CardComponent';

interface CommunityCardsProps {
  cards: Card[];
  street: Street;
}

export const CommunityCards: React.FC<CommunityCardsProps> = React.memo(({ cards, street }) => {
  return (
    <div className="flex gap-2 justify-center items-center">
      {cards.map((card, i) => (
        <div
          key={card.id}
          style={{
            animation: `fadeSlideIn 0.4s ease-out ${i * 0.1}s both`,
          }}
        >
          <CardComponent card={card} faceUp dealDelay={i * 100} />
        </div>
      ))}
      {/* Placeholder for remaining cards */}
      {[...Array(Math.max(0, 5 - cards.length))].map((_, i) => (
        <div
          key={`empty-${i}`}
          className="rounded-lg border border-dashed border-white/10"
          style={{ width: 56, height: 80 }}
        />
      ))}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.8); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
});

CommunityCards.displayName = 'CommunityCards';
