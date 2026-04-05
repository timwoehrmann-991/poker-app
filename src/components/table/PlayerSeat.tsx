import React from 'react';
import { Player, PlayerStatus, Position } from '../../engine/types';
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
  rock:           '#8e8e93',
  callingStation: '#ff9f0a',
  tag:            '#0a84ff',
  lagManiac:      '#ff453a',
  gtoBalanced:    '#bf5af2',
  shortStack:     '#ff9500',
  nit:            '#30d158',
};

const PERSONALITY_EMOJIS: Record<string, string> = {
  rock: '🪨', callingStation: '📞', tag: '🦈',
  lagManiac: '🃏', gtoBalanced: '⚖️', shortStack: '📊', nit: '🔒',
};

export const PlayerSeat: React.FC<PlayerSeatProps> = React.memo(({
  player, position, isActive, isDealer, isWinner, isHuman, showCards, winAmount,
  timerProgress, timerWarning,
}) => {
  const isFolded      = player.status === PlayerStatus.Folded;
  const isAllIn       = player.status === PlayerStatus.AllIn;
  const isEliminated  = player.status === PlayerStatus.Eliminated;

  if (isEliminated) return null;

  const personalityColor = player.aiPersonality ? (PERSONALITY_COLORS[player.aiPersonality] || '#8e8e93') : '#0a84ff';

  let borderColor = 'rgba(255,255,255,0.12)';
  if (isActive)  borderColor = 'rgba(10,132,255,0.8)';
  if (isWinner)  borderColor = 'rgba(48,209,88,0.8)';

  const glowClass = isActive ? 'active-glow' : isWinner ? 'winner-glow' : '';

  return (
    <div
      className={glowClass}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity: isFolded ? 0.4 : 1,
        transition: 'opacity 0.3s',
        filter: isFolded ? 'grayscale(0.5)' : 'none',
      }}
    >
      {/* Dealer button */}
      {isDealer && (
        <div style={{
          position: 'absolute', top: -8, right: -8,
          width: 20, height: 20, borderRadius: '50%',
          background: 'linear-gradient(135deg, #fff 0%, #e8e8e8 100%)',
          color: '#000', fontSize: 9, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid var(--color-accent)',
          boxShadow: '0 2px 8px rgba(212,166,52,0.5)',
          zIndex: 5,
        }}>D</div>
      )}

      {/* Hole cards */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 4, minHeight: isHuman ? 0 : 50 }}>
        {player.holeCards && !isFolded ? (
          <>
            <CardComponent card={player.holeCards[0]} faceUp={showCards || isHuman} small dealDelay={0} />
            <CardComponent card={player.holeCards[1]} faceUp={showCards || isHuman} small dealDelay={80} />
          </>
        ) : !isFolded && player.status !== PlayerStatus.Eliminated ? (
          <>
            <CardComponent card={null} faceUp={false} small dealDelay={0} />
            <CardComponent card={null} faceUp={false} small dealDelay={80} />
          </>
        ) : null}
      </div>

      {/* Info box */}
      <div style={{
        background: 'rgba(12,12,20,0.88)',
        backdropFilter: 'blur(16px)',
        border: `1.5px solid ${borderColor}`,
        borderRadius: 10,
        padding: '6px 10px',
        minWidth: 90,
        textAlign: 'center',
        position: 'relative',
        transition: 'border-color 0.25s',
        overflow: 'hidden',
      }}>
        {/* Timer bar */}
        {timerProgress !== undefined && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
            background: 'rgba(255,255,255,0.1)',
          }}>
            <div style={{
              height: '100%',
              width: `${timerProgress * 100}%`,
              background: timerWarning
                ? 'var(--color-danger)'
                : timerProgress > 0.5
                  ? 'var(--color-success)'
                  : 'var(--color-warning)',
              transition: 'width 0.1s linear',
              boxShadow: timerWarning ? '0 0 6px var(--color-danger)' : 'none',
            }} />
          </div>
        )}

        {/* Personality badge — centred above name */}
        {player.aiPersonality && (
          <div style={{
            position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
            background: personalityColor, borderRadius: 8,
            fontSize: 10, padding: '1px 6px', whiteSpace: 'nowrap',
            boxShadow: `0 2px 8px ${personalityColor}60`,
          }}>
            {PERSONALITY_EMOJIS[player.aiPersonality] || '🤖'}
          </div>
        )}

        {/* Human "YOU" badge — right-aligned so it never overlaps dealer button */}
        {isHuman && (
          <div style={{
            position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--color-primary)', borderRadius: 8,
            fontSize: 9, fontWeight: 700, padding: '1px 7px', color: '#fff',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(10,132,255,0.4)',
          }}>YOU</div>
        )}

        {/* Name */}
        <div style={{
          fontSize: 11, fontWeight: 600, color: '#fff',
          marginTop: player.aiPersonality || isHuman ? 6 : 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: 80,
        }}>
          {player.name}
        </div>

        {/* Stack */}
        <div style={{
          fontSize: 13, fontWeight: 700, color: 'var(--color-accent)',
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
        }}>
          €{player.chips.toLocaleString()}
        </div>

        {/* Position */}
        {position && (
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.08em', marginTop: 1 }}>
            {position}
          </div>
        )}

        {/* Status badges */}
        {isAllIn && (
          <div style={{
            fontSize: 9, fontWeight: 800, color: 'var(--color-danger)',
            background: 'rgba(255,69,58,0.15)', borderRadius: 5,
            padding: '1px 5px', marginTop: 2, letterSpacing: '0.04em',
          }}>
            ALL-IN
          </div>
        )}
        {isFolded && (
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2, letterSpacing: '0.04em' }}>
            FOLD
          </div>
        )}
      </div>

      {/* Current bet chip */}
      {player.currentBet > 0 && (
        <div className="chip-animate" style={{ marginTop: 4 }}>
          <div style={{
            background: 'rgba(212,166,52,0.2)', border: '1px solid rgba(212,166,52,0.4)',
            borderRadius: 12, padding: '2px 8px',
            fontSize: 10, fontWeight: 700, color: 'var(--color-accent)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            €{player.currentBet}
          </div>
        </div>
      )}

      {/* Win amount */}
      {isWinner && winAmount && winAmount > 0 && (
        <div style={{
          position: 'absolute', bottom: -22, left: '50%', transform: 'translateX(-50%)',
          fontSize: 12, fontWeight: 700, color: 'var(--color-success)',
          animation: 'chip-slide-in 0.3s ease-out',
          whiteSpace: 'nowrap',
          textShadow: '0 0 10px rgba(48,209,88,0.5)',
        }}>
          +€{winAmount}
        </div>
      )}
    </div>
  );
});

PlayerSeat.displayName = 'PlayerSeat';
