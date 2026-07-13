import React from 'react';
import { Card, Rank, Suit, SUIT_SYMBOLS } from '../../engine/types';

interface CardComponentProps {
  card: Card | null;
  faceUp?: boolean;
  small?: boolean;
  tiny?: boolean;       // extra-small for compact mobile seats (28×40)
  highlighted?: boolean;
  dealDelay?: number; // ms delay before deal animation starts
  /** Ohne 3D-Flip rendern (robust bei überlappenden Karten, z.B. Blackjack) */
  flat?: boolean;
}

const RANK_DISPLAY: Record<Rank, string> = {
  [Rank.Two]: '2', [Rank.Three]: '3', [Rank.Four]: '4', [Rank.Five]: '5',
  [Rank.Six]: '6', [Rank.Seven]: '7', [Rank.Eight]: '8', [Rank.Nine]: '9',
  [Rank.Ten]: '10', [Rank.Jack]: 'J', [Rank.Queen]: 'Q', [Rank.King]: 'K', [Rank.Ace]: 'A',
};

function getSuitColor(suit: Suit): string {
  return suit === Suit.Hearts || suit === Suit.Diamonds
    ? 'var(--color-card-red)'
    : 'var(--color-card-black)';
}

export const CardComponent: React.FC<CardComponentProps> = React.memo(({
  card, faceUp = true, small = false, tiny = false, highlighted = false, dealDelay, flat = false,
}) => {
  const width  = tiny ? 28 : small ? 40 : 56;
  const height = tiny ? 40 : small ? 58 : 80;
  const showFace = faceUp && card;

  // Flache Variante: nur die sichtbare Seite, keine 3D-Transforms
  if (flat) {
    return (
      <div
        className="flex-shrink-0"
        style={{
          width, height, position: 'relative',
          animation: dealDelay !== undefined ? `card-deal 0.35s cubic-bezier(0.25,0.46,0.45,0.94) ${dealDelay}ms both` : undefined,
        }}
      >
        {showFace ? (
          <div
            className={`rounded-lg absolute inset-0 ${highlighted ? 'ring-2 ring-yellow-400' : ''}`}
            style={{
              background: 'linear-gradient(160deg, var(--color-card-bg) 0%, var(--color-card-bg-2) 100%)',
              border: '1px solid var(--color-card-border)',
              boxShadow: '0 3px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          >
            <div className="absolute top-0.5 left-1 leading-none" style={{ color: getSuitColor(card.suit) }}>
              <div style={{ fontSize: tiny ? 9 : small ? 12 : 16, fontWeight: 800, letterSpacing: '-0.03em' }}>{RANK_DISPLAY[card.rank]}</div>
              <div style={{ fontSize: tiny ? 6 : small ? 9 : 11, marginTop: -1 }}>{SUIT_SYMBOLS[card.suit]}</div>
            </div>
            <div
              className="absolute flex items-end justify-end"
              style={{
                right: tiny ? 2 : 3, bottom: tiny ? 1 : 2,
                color: getSuitColor(card.suit),
                fontSize: tiny ? 13 : small ? 20 : 30,
                lineHeight: 1,
                opacity: 0.92,
              }}
            >
              {SUIT_SYMBOLS[card.suit]}
            </div>
          </div>
        ) : (
          <div
            className="rounded-lg absolute inset-0 overflow-hidden"
            style={{
              background: 'linear-gradient(150deg, var(--card-back-1) 0%, var(--card-back-2) 45%, var(--card-back-3) 100%)',
              border: '2px solid var(--card-back-border)',
              boxShadow: '0 3px 10px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 5px)',
            }} />
            <div
              className="absolute rounded flex items-center justify-center"
              style={{ inset: tiny ? 2 : 3, border: '1px solid rgba(255,255,255,0.22)' }}
            >
              <div style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: tiny ? 10 : small ? 14 : 20,
                fontWeight: 700,
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}>♠</div>
            </div>
          </div>
        )}
      </div>
    );
  }

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
        {/* Card back — dunkelblaues Muster mit Doppelrahmen */}
        <div
          className="rounded-lg absolute inset-0 overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(150deg, var(--card-back-1) 0%, var(--card-back-2) 45%, var(--card-back-3) 100%)',
            border: '2px solid var(--card-back-border)',
            boxShadow: '0 3px 10px rgba(0,0,0,0.35)',
          }}
        >
          {/* Diagonales Linienmuster */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 5px)',
          }} />
          <div
            className="absolute rounded flex items-center justify-center"
            style={{ inset: tiny ? 2 : 3, border: '1px solid rgba(255,255,255,0.22)' }}
          >
            <div style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: tiny ? 10 : small ? 14 : 20,
              fontWeight: 700,
              textShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}>♠</div>
          </div>
        </div>

        {/* Card face */}
        <div
          className={`rounded-lg absolute inset-0 ${highlighted ? 'ring-2 ring-yellow-400' : ''}`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(160deg, var(--color-card-bg) 0%, var(--color-card-bg-2) 100%)',
            border: '1px solid var(--color-card-border)',
            boxShadow: '0 3px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.9)',
          }}
        >
          {card && (
            <>
              {/* Top-left rank + suit */}
              <div className="absolute top-0.5 left-1 leading-none" style={{ color: getSuitColor(card.suit) }}>
                <div style={{ fontSize: tiny ? 9 : small ? 12 : 16, fontWeight: 800, letterSpacing: '-0.03em' }}>{RANK_DISPLAY[card.rank]}</div>
                <div style={{ fontSize: tiny ? 6 : small ? 9 : 11, marginTop: -1 }}>{SUIT_SYMBOLS[card.suit]}</div>
              </div>
              {/* Center suit */}
              <div
                className="absolute flex items-end justify-end"
                style={{
                  right: tiny ? 2 : 3, bottom: tiny ? 1 : 2,
                  color: getSuitColor(card.suit),
                  fontSize: tiny ? 13 : small ? 20 : 30,
                  lineHeight: 1,
                  opacity: 0.92,
                }}
              >
                {SUIT_SYMBOLS[card.suit]}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

CardComponent.displayName = 'CardComponent';
