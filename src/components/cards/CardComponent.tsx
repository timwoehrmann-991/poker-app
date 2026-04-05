import React, { useEffect, useRef, useState } from 'react';
import { Card, Rank, Suit, SUIT_SYMBOLS } from '../../engine/types';

interface CardComponentProps {
  card: Card | null;
  faceUp?: boolean;
  small?: boolean;
  tiny?: boolean;       // extra-small for compact mobile seats (28×40)
  highlighted?: boolean;
  dealDelay?: number; // ms delay before deal animation starts
}

const RANK_DISPLAY: Record<Rank, string> = {
  [Rank.Two]: '2', [Rank.Three]: '3', [Rank.Four]: '4', [Rank.Five]: '5',
  [Rank.Six]: '6', [Rank.Seven]: '7', [Rank.Eight]: '8', [Rank.Nine]: '9',
  [Rank.Ten]: '10', [Rank.Jack]: 'J', [Rank.Queen]: 'Q', [Rank.King]: 'K', [Rank.Ace]: 'A',
};

function getSuitColor(suit: Suit): string {
  return suit === Suit.Hearts || suit === Suit.Diamonds ? '#e74c3c' : '#2c3e50';
}

export const CardComponent: React.FC<CardComponentProps> = React.memo(({
  card, faceUp = true, small = false, tiny = false, highlighted = false, dealDelay,
}) => {
  const width  = tiny ? 28 : small ? 40 : 56;
  const height = tiny ? 40 : small ? 58 : 80;
  const prevFaceUpRef = useRef(faceUp);
  const [isFlipping, setIsFlipping] = useState(false);

  // Detect flip from back to face
  useEffect(() => {
    if (faceUp && !prevFaceUpRef.current && card) {
      setIsFlipping(true);
      const timer = setTimeout(() => setIsFlipping(false), 600);
      return () => clearTimeout(timer);
    }
    prevFaceUpRef.current = faceUp;
  }, [faceUp, card]);

  // 3D card flip container
  const showFace = faceUp && card;

  return (
    <div
      className="flex-shrink-0"
      style={{
        width, height,
        perspective: 600,
        animation: dealDelay !== undefined ? `card-deal 0.35s cubic-bezier(0.25,0.46,0.45,0.94) ${dealDelay}ms both` : undefined,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.5s ease-in-out',
          transform: showFace ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Card back */}
        <div
          className="rounded-lg shadow-lg absolute inset-0 overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #1a365d 100%)',
            border: '2px solid #4a5568',
          }}
        >
          <div className="absolute inset-1 rounded border border-blue-400/30 flex items-center justify-center">
            <div className="text-blue-300/40 text-lg font-bold">♠</div>
          </div>
        </div>

        {/* Card face */}
        <div
          className={`rounded-lg shadow-lg absolute inset-0 ${highlighted ? 'ring-2 ring-yellow-400' : ''}`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: '#ffffff',
            border: '1.5px solid #d1d5db',
          }}
        >
          {card && (
            <>
              {/* Top-left rank + suit */}
              <div className="absolute top-0.5 left-1 leading-none" style={{ color: getSuitColor(card.suit) }}>
                <div style={{ fontSize: tiny ? 8 : small ? 10 : 13, fontWeight: 700 }}>{RANK_DISPLAY[card.rank]}</div>
                <div style={{ fontSize: tiny ? 6 : small ? 8 : 10, marginTop: -2 }}>{SUIT_SYMBOLS[card.suit]}</div>
              </div>
              {/* Center suit */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ color: getSuitColor(card.suit), fontSize: tiny ? 12 : small ? 18 : 26 }}
              >
                {SUIT_SYMBOLS[card.suit]}
              </div>
              {/* Bottom-right rank + suit (rotated) */}
              <div
                className="absolute bottom-0.5 right-1 leading-none"
                style={{ color: getSuitColor(card.suit), transform: 'rotate(180deg)' }}
              >
                <div style={{ fontSize: tiny ? 8 : small ? 10 : 13, fontWeight: 700 }}>{RANK_DISPLAY[card.rank]}</div>
                <div style={{ fontSize: tiny ? 6 : small ? 8 : 10, marginTop: -2 }}>{SUIT_SYMBOLS[card.suit]}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

CardComponent.displayName = 'CardComponent';
