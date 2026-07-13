import React from 'react';
import { Player, PlayerStatus, Position } from '../../engine/types';
import { CardComponent } from '../cards/CardComponent';
import { ChipStack, ChipIcon } from '../ui/ChipStack';
import { useTranslation } from '../../i18n';
import { useSettingsStore } from '../../store/settingsStore';

interface PlayerSeatProps {
  player: Player;
  position?: Position;
  isActive: boolean;
  isWinner: boolean;
  isHuman: boolean;
  showCards: boolean;
  liveStats?: string;
  winAmount?: number;
  timerProgress?: number;
  timerWarning?: boolean;
  compact?: boolean;
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
  player, position, isActive, isWinner, isHuman, showCards, liveStats, winAmount,
  timerProgress, timerWarning, compact = false,
}) => {
  const { t } = useTranslation();
  const showBadges = useSettingsStore(s => s.showPersonalityBadges);
  const isFolded     = player.status === PlayerStatus.Folded;
  const isAllIn      = player.status === PlayerStatus.AllIn;
  const isEliminated = player.status === PlayerStatus.Eliminated;

  if (isEliminated) return null;

  const personalityColor = player.aiPersonality
    ? (PERSONALITY_COLORS[player.aiPersonality] || '#8e8e93')
    : '#0a84ff';

  let borderColor = 'var(--border-subtle)';
  if (isActive) borderColor = 'rgba(10,132,255,0.8)';
  if (isWinner) borderColor = 'rgba(48,209,88,0.8)';

  const glowClass = isActive ? 'active-glow' : isWinner ? 'winner-glow' : '';

  return (
    <div
      className={glowClass}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity: isFolded ? 0.45 : 1,
        transition: 'opacity 0.3s',
        filter: isFolded ? 'grayscale(0.5)' : 'none',
      }}
    >
      {/* Hole cards — on compact mode AI placeholder cards are hidden to save vertical space */}
      {/* Hole cards — tiny in compact mode to save space and avoid overlap */}
      <div style={{ display: 'flex', gap: compact ? 2 : 3, marginBottom: 3, minHeight: compact ? 0 : 44 }}>
        {player.holeCards && !isFolded ? (
          <>
            <CardComponent card={player.holeCards[0]} faceUp={showCards || isHuman} small={!compact} tiny={compact} dealDelay={0} />
            <CardComponent card={player.holeCards[1]} faceUp={showCards || isHuman} small={!compact} tiny={compact} dealDelay={80} />
          </>
        ) : !isFolded && player.status !== PlayerStatus.Eliminated ? (
          compact ? null : (
            <>
              <CardComponent card={null} faceUp={false} small dealDelay={0} />
              <CardComponent card={null} faceUp={false} small dealDelay={80} />
            </>
          )
        ) : null}
      </div>

      {/* ── Badge row — OUTSIDE the overflow:hidden info box so it's never clipped ── */}
      {((player.aiPersonality && showBadges) || isHuman) && (
        <div style={{
          height: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 2,
          zIndex: 6,
          position: 'relative',
        }}>
          {player.aiPersonality && showBadges && (
            <div style={{
              background: personalityColor,
              borderRadius: 8,
              fontSize: 10,
              padding: '1px 6px',
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              boxShadow: `0 2px 8px ${personalityColor}60`,
            }}>
              {PERSONALITY_EMOJIS[player.aiPersonality] || '🤖'}
            </div>
          )}
          {isHuman && (
            <div style={{
              background: 'var(--color-primary)',
              borderRadius: 8,
              fontSize: 9,
              fontWeight: 700,
              padding: '1px 7px',
              color: '#fff',
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(10,132,255,0.4)',
            }}>{t('ui.you')}</div>
          )}
        </div>
      )}

      {/* Info box — no overflow:hidden so nothing inside is ever clipped */}
      <div style={{
        background: 'var(--surface-seat)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        border: `1.5px solid ${borderColor}`,
        borderRadius: 10,
        padding: compact ? '4px 7px' : '5px 10px',
        minWidth: compact ? 64 : 80,
        textAlign: 'center',
        position: 'relative',
        transition: 'border-color 0.25s',
      }}>
        {/* Timer bar at bottom of info box */}
        {timerProgress !== undefined && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
            background: 'var(--surface-inset)',
            borderRadius: '0 0 10px 10px',
            overflow: 'hidden',
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

        {/* Name */}
        <div style={{
          fontSize: compact ? 10 : 11, fontWeight: 600, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: compact ? 64 : 78,
        }}>
          {player.name}
        </div>

        {/* Stack */}
        <div style={{
          fontSize: compact ? 11 : 13, fontWeight: 700, color: 'var(--color-accent)',
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
          {!compact && <ChipIcon size={9} />}
          €{player.chips.toLocaleString()}
        </div>

        {/* Position label — hidden in compact to save space */}
        {position && !compact && (
          <div style={{ fontSize: 8, color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', marginTop: 1 }}>
            {position}
          </div>
        )}

        {/* Live-Stats des Bots (ab 10 Händen) — Gegner lesen lernen */}
        {liveStats && !compact && (
          <div style={{ fontSize: 7.5, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
            {liveStats}
          </div>
        )}

        {/* Status badges */}
        {isAllIn && (
          <div style={{
            fontSize: 9, fontWeight: 800, color: 'var(--color-danger)',
            background: 'rgba(255,69,58,0.15)', borderRadius: 5,
            padding: '1px 5px', marginTop: 2, letterSpacing: '0.04em',
          }}>
            {t('ui.allInBadge')}
          </div>
        )}
        {isFolded && (
          <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2, letterSpacing: '0.04em' }}>
            {t('ui.foldedBadge')}
          </div>
        )}
      </div>

      {/* Current bet as real casino chips */}
      {player.currentBet > 0 && (
        <div className="chip-animate" style={{ marginTop: 5 }}>
          <ChipStack amount={player.currentBet} size={compact ? 11 : 14} />
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
