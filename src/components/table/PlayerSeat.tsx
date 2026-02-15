import React from 'react';
import { Player, PlayerStatus, Position, Card } from '../../engine/types';
import { CardComponent } from '../cards/CardComponent';

interface PlayerSeatProps {
  player: Player;
  position?: Position;
  isActive: boolean;
  isDealer: boolean;
  isWinner: boolean;
  isHuman: boolean;
  showCards: boolean;
  winAmount?: number;
  timerProgress?: number;
  timerWarning?: boolean;
}

const PERSONALITY_COLORS: Record<string, string> = {
  rock: '#95a5a6',
  callingStation: '#f39c12',
  tag: '#3498db',
  lagManiac: '#e74c3c',
  gtoBalanced: '#9b59b6',
  shortStack: '#e67e22',
  nit: '#1abc9c',
};

const PERSONALITY_EMOJIS: Record<string, string> = {
  rock: '🪨',
  callingStation: '📞',
  tag: '🦈',
  lagManiac: '🃏',
  gtoBalanced: '⚖️',
  shortStack: '📊',
  nit: '🔒',
};

export const PlayerSeat: React.FC<PlayerSeatProps> = React.memo(({
  player, position, isActive, isDealer, isWinner, isHuman, showCards, winAmount,
  timerProgress, timerWarning,
}) => {
  const isFolded = player.status === PlayerStatus.Folded;
  const isAllIn = player.status === PlayerStatus.AllIn;
  const isEliminated = player.status === PlayerStatus.Eliminated;

  if (isEliminated) return null;

  const borderColor = isActive ? 'var(--color-accent)' : isWinner ? '#2ecc71' : 'rgba(255,255,255,0.15)';
  const bgOpacity = isFolded ? 0.4 : 1;
  const personalityColor = player.aiPersonality ? PERSONALITY_COLORS[player.aiPersonality] || '#666' : '#3498db';

  return (
    <div
      className={`relative flex flex-col items-center ${isActive ? 'active-glow' : ''} ${isWinner ? 'winner-glow' : ''}`}
      style={{ opacity: bgOpacity, transition: 'opacity 0.3s' }}
    >
      {/* Dealer Button */}
      {isDealer && (
        <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-white text-black text-xs font-bold flex items-center justify-center shadow-lg z-10 border-2 border-yellow-500">
          D
        </div>
      )}

      {/* Hole Cards */}
      <div className="flex gap-0.5 mb-1" style={{ minHeight: 58 }}>
        {player.holeCards && !isFolded ? (
          <>
            <CardComponent
              card={player.holeCards[0]}
              faceUp={showCards || isHuman}
              small
              dealDelay={0}
            />
            <CardComponent
              card={player.holeCards[1]}
              faceUp={showCards || isHuman}
              small
              dealDelay={100}
            />
          </>
        ) : !isFolded && player.status !== PlayerStatus.Eliminated ? (
          <>
            <CardComponent card={null} faceUp={false} small dealDelay={0} />
            <CardComponent card={null} faceUp={false} small dealDelay={100} />
          </>
        ) : null}
      </div>

      {/* Player info box */}
      <div
        className="rounded-lg px-3 py-1.5 min-w-[100px] text-center relative"
        style={{
          background: 'var(--color-bg-panel)',
          border: `2px solid ${borderColor}`,
          transition: 'border-color 0.3s',
        }}
      >
        {/* Timer progress bar */}
        {timerProgress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-lg overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${timerProgress * 100}%`,
                background: timerWarning ? '#e74c3c' : timerProgress > 0.5 ? '#2ecc71' : '#f39c12',
                transition: 'width 0.1s linear',
                boxShadow: timerWarning ? '0 0 6px #e74c3c' : 'none',
              }}
            />
          </div>
        )}
        {/* Personality indicator */}
        {player.aiPersonality && (
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] px-1.5 rounded-full font-bold"
            style={{ background: personalityColor, color: '#fff' }}
          >
            {PERSONALITY_EMOJIS[player.aiPersonality] || '🤖'}
          </div>
        )}

        {/* Name */}
        <div className="text-xs font-semibold text-white truncate max-w-[90px]">
          {isHuman ? '👤 ' : ''}{player.name}
        </div>

        {/* Chips */}
        <div className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
          €{player.chips.toLocaleString()}
        </div>

        {/* Position */}
        {position && (
          <div className="text-[9px] text-gray-400 font-medium">
            {position}
          </div>
        )}

        {/* Status badges */}
        {isAllIn && (
          <div className="text-[10px] font-bold text-red-400 bg-red-900/50 rounded px-1 mt-0.5">
            ALL-IN
          </div>
        )}
        {isFolded && (
          <div className="text-[10px] text-gray-500 mt-0.5">FOLD</div>
        )}
      </div>

      {/* Current bet */}
      {player.currentBet > 0 && (
        <div className="mt-1 chip-animate">
          <div className="bg-yellow-600/80 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
            €{player.currentBet}
          </div>
        </div>
      )}

      {/* Win amount */}
      {isWinner && winAmount && winAmount > 0 && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-green-400 font-bold text-sm animate-bounce">
          +€{winAmount}
        </div>
      )}
    </div>
  );
});

PlayerSeat.displayName = 'PlayerSeat';
