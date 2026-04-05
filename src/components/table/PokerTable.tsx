import React, { useMemo, useCallback, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useDecisionTimer } from '../../hooks/useDecisionTimer';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { useTableLayout } from '../../hooks/useTableLayout';
import { PlayerSeat } from './PlayerSeat';
import { CommunityCards } from './CommunityCards';
import { ActionPanel } from '../actions/ActionPanel';
import { DecisionTimerBar } from '../timer/DecisionTimerBar';
import { TrainingOverlay } from '../training/TrainingOverlay';
import { ActionType, Street, PlayerStatus } from '../../engine/types';
import { getTotalPot } from '../../engine/game/PotManager';
import { useTranslation } from '../../i18n';

function getSeatPositions(count: number, rx: number, ry: number): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.PI / 2 + (2 * Math.PI * i) / count;
    return { x: 50 + rx * Math.cos(angle), y: 50 + ry * Math.sin(angle) };
  });
}

export const PokerTable: React.FC = () => {
  const { t } = useTranslation();
  const gameState       = useGameStore(s => s.gameState);
  const positionMap     = useGameStore(s => s.positionMap);
  const performAction   = useGameStore(s => s.performAction);
  const getLegalActions = useGameStore(s => s.getLegalActions);
  const rotateDealerAndStartNewHand = useGameStore(s => s.rotateDealerAndStartNewHand);

  useGameLoop();
  const { playTimerTick } = useSoundEffects();
  const layout = useTableLayout();

  const legalActions  = useMemo(() => getLegalActions(), [gameState]);
  const isHumanTurn   = useMemo(() => {
    if (!gameState) return false;
    const idx = gameState.activePlayerIndex;
    return idx !== null && gameState.players[idx].isHuman;
  }, [gameState]);
  const humanPlayer   = useMemo(() => gameState?.players.find(p => p.isHuman) || null, [gameState]);
  const totalPot      = useMemo(() => {
    if (!gameState) return 0;
    return getTotalPot(gameState.pots) + gameState.players.reduce((s, p) => s + p.currentBet, 0);
  }, [gameState]);
  const activePlayers = useMemo(() =>
    gameState?.players.filter(p => p.status !== PlayerStatus.Eliminated) || [],
  [gameState]);
  const seatPositions = useMemo(
    () => getSeatPositions(activePlayers.length, layout.rx, layout.ry),
    [activePlayers.length, layout.rx, layout.ry],
  );
  const timer         = useDecisionTimer(isHumanTurn);

  const prevSecondRef = React.useRef(0);
  useEffect(() => {
    if (timer.isWarning) {
      const s = Math.ceil(timer.timeRemaining);
      if (s !== prevSecondRef.current && s > 0) { prevSecondRef.current = s; playTimerTick(); }
    } else { prevSecondRef.current = 0; }
  }, [timer.isWarning, timer.timeRemaining, playTimerTick]);

  const handleAction = useCallback((action: ActionType, amount?: number) => {
    performAction(action, amount);
  }, [performAction]);

  useEffect(() => {
    if (!isHumanTurn || !legalActions) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case 'f': if (legalActions.canFold)  handleAction(ActionType.Fold); break;
        case 'c': if (legalActions.canCheck) handleAction(ActionType.Check);
                  else if (legalActions.canCall) handleAction(ActionType.Call); break;
        case 'r': if (legalActions.canRaise) handleAction(ActionType.Raise, legalActions.minRaise);
                  else if (legalActions.canBet) handleAction(ActionType.Bet, legalActions.minBet); break;
        case 'a': handleAction(ActionType.AllIn); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isHumanTurn, legalActions, handleAction]);

  if (!gameState) return null;

  const showAllCards = !gameState.isHandInProgress && gameState.winners !== null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <TrainingOverlay />

      {/* Table */}
      <div style={{ position: 'relative', width: layout.tableWidth, maxWidth: layout.tableMaxWidth, aspectRatio: layout.aspectRatio }}>

        {/* Gold outer ring */}
        <div style={{
          position: 'absolute', inset: -12, borderRadius: '50%',
          background: 'linear-gradient(145deg, #c9a227 0%, #8b6514 40%, #c9a227 70%, #6b4a10 100%)',
          boxShadow: '0 0 0 4px rgba(0,0,0,0.9), 0 20px 70px rgba(0,0,0,0.8)',
        }} />

        {/* Dark wood ring */}
        <div style={{
          position: 'absolute', inset: -3, borderRadius: '50%',
          background: 'linear-gradient(145deg, #3a2206, #1e1003, #4a2d08)',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.6)',
        }} />

        {/* Felt */}
        <div className="felt-texture" style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.45), inset 0 4px 24px rgba(0,0,0,0.35)',
        }} />

        {/* Faint table logo */}
        <div style={{
          position: 'absolute', top: '17%', left: '50%', transform: 'translateX(-50%)',
          fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.055)', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          No Limit Texas Hold'em
        </div>

        {/* Street */}
        {gameState.isHandInProgress && (
          <div style={{
            position: 'absolute', top: '26%', left: '50%', transform: 'translateX(-50%)',
            fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.22)',
          }}>
            — {gameState.street} —
          </div>
        )}

        {/* Pot display */}
        {totalPot > 0 && (
          <div className="chip-animate" style={{
            position: 'absolute', top: '33%', left: '50%', transform: 'translateX(-50%)',
            zIndex: 10, textAlign: 'center',
          }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 3, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Pot</div>
            <div style={{
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(212,166,52,0.35)',
              borderRadius: 24, padding: '5px 16px',
              fontSize: 20, fontWeight: 700, color: 'var(--color-accent)',
              textShadow: '0 0 16px rgba(212,166,52,0.45)',
              fontVariantNumeric: 'tabular-nums',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}>
              €{totalPot.toLocaleString()}
            </div>
            {/* Side pots */}
            {gameState.pots.length > 1 && (
              <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 4 }}>
                {gameState.pots.map((pot, i) => (
                  <div key={i} style={{
                    background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, padding: '1px 7px', fontSize: 9, color: 'rgba(255,255,255,0.4)',
                  }}>
                    {pot.isMainPot ? 'Main' : `Side ${i}`}: €{pot.amount}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Community cards */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', zIndex: 10,
        }}>
          <CommunityCards cards={gameState.communityCards} street={gameState.street} />
        </div>

        {/* Player seats */}
        {activePlayers.map((player, i) => {
          const pos = seatPositions[i];
          if (!pos) return null;
          const isActive  = gameState.activePlayerIndex !== null && gameState.players[gameState.activePlayerIndex]?.id === player.id;
          const winResult = gameState.winners?.find(w => w.playerId === player.id);
          return (
            <div key={player.id} style={{
              position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)', zIndex: 20,
            }}>
              <PlayerSeat
                player={player}
                position={positionMap.get(player.seatIndex)}
                isActive={isActive}
                isDealer={player.seatIndex === gameState.dealerSeatIndex}
                isWinner={!!winResult}
                compact={layout.compact}
                isHuman={player.isHuman}
                showCards={showAllCards}
                winAmount={winResult?.amount}
                timerProgress={isActive && player.isHuman && timer.isRunning ? timer.progress : undefined}
                timerWarning={isActive && player.isHuman && timer.isRunning ? timer.isWarning : undefined}
              />
            </div>
          );
        })}

        {/* Winner announcement */}
        {gameState.winners && gameState.winners.length > 0 && !gameState.isHandInProgress && (
          <div className="animate-winner-pop" style={{
            position: 'absolute', bottom: '-4%', left: '50%', zIndex: 30,
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(24px)',
              border: '1px solid rgba(48,209,88,0.35)',
              borderRadius: 14, padding: '8px 20px', textAlign: 'center',
              boxShadow: '0 4px 24px rgba(48,209,88,0.15)',
            }}>
              {gameState.winners.map((w, i) => {
                const winner = gameState.players.find(p => p.id === w.playerId);
                return (
                  <div key={i} style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>{winner?.name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}> {t('ui.wins')} </span>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>€{w.amount}</span>
                    {w.hand && (
                      <span style={{ color: 'rgba(255,255,255,0.35)', marginLeft: 8, fontSize: 10 }}>({w.hand.description})</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Action area */}
      <div style={{ marginTop: 14, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 530 }}>
        {isHumanTurn && legalActions && humanPlayer ? (
          <>
            <DecisionTimerBar timer={timer} />
            <ActionPanel legalActions={legalActions} onAction={handleAction} potSize={totalPot} playerChips={humanPlayer.chips} />
          </>
        ) : !gameState.isHandInProgress ? (
          <button
            onClick={rotateDealerAndStartNewHand}
            style={{
              padding: '12px 36px', borderRadius: 12, fontWeight: 700, fontSize: 14,
              background: 'linear-gradient(135deg, #1a7a3a, #25a050)',
              color: '#fff', border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(48,209,88,0.25)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
          >
            {t('ui.nextHand')} →
          </button>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '10px 0', letterSpacing: '0.03em' }}>
            KI denkt nach…
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', top: 6, left: 10, fontSize: 10, color: 'rgba(255,255,255,0.18)', fontVariantNumeric: 'tabular-nums' }}>
        Hand #{gameState.handNumber}
      </div>
    </div>
  );
};
