import React, { useMemo, useCallback, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useDecisionTimer } from '../../hooks/useDecisionTimer';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { PlayerSeat } from './PlayerSeat';
import { CommunityCards } from './CommunityCards';
import { ActionPanel } from '../actions/ActionPanel';
import { DecisionTimerBar } from '../timer/DecisionTimerBar';
import { TrainingOverlay } from '../training/TrainingOverlay';
import { ActionType, Street, PlayerStatus } from '../../engine/types';
import { getTotalPot } from '../../engine/game/PotManager';
import { useTranslation } from '../../i18n';

// Seat positions around an elliptical table (percentage-based)
// Position [x%, y%] from center of table container
function getSeatPositions(count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  // Place human at bottom center (index 0)
  // Other players distributed around the ellipse
  for (let i = 0; i < count; i++) {
    // Start from bottom (human), go clockwise
    const angle = (Math.PI / 2) + (2 * Math.PI * i) / count;
    const x = 50 + 42 * Math.cos(angle);
    const y = 50 + 38 * Math.sin(angle);
    positions.push({ x, y });
  }
  return positions;
}

export const PokerTable: React.FC = () => {
  const { t } = useTranslation();
  const gameState = useGameStore(s => s.gameState);
  const positionMap = useGameStore(s => s.positionMap);
  const performAction = useGameStore(s => s.performAction);
  const getLegalActions = useGameStore(s => s.getLegalActions);
  const rotateDealerAndStartNewHand = useGameStore(s => s.rotateDealerAndStartNewHand);

  useGameLoop();
  const { playTimerTick } = useSoundEffects();

  const legalActions = useMemo(() => getLegalActions(), [gameState]);

  const isHumanTurn = useMemo(() => {
    if (!gameState) return false;
    const idx = gameState.activePlayerIndex;
    if (idx === null) return false;
    return gameState.players[idx].isHuman;
  }, [gameState]);

  const humanPlayer = useMemo(() => {
    return gameState?.players.find(p => p.isHuman) || null;
  }, [gameState]);

  const totalPot = useMemo(() => {
    if (!gameState) return 0;
    return getTotalPot(gameState.pots) +
      gameState.players.reduce((sum, p) => sum + p.currentBet, 0);
  }, [gameState]);

  const seatPositions = useMemo(() => {
    if (!gameState) return [];
    return getSeatPositions(gameState.players.filter(p => p.status !== PlayerStatus.Eliminated).length);
  }, [gameState?.players.length]);

  // Decision timer
  const timer = useDecisionTimer(isHumanTurn);

  // Play tick sound in warning phase
  const prevSecondRef = React.useRef(0);
  useEffect(() => {
    if (timer.isWarning) {
      const currentSecond = Math.ceil(timer.timeRemaining);
      if (currentSecond !== prevSecondRef.current && currentSecond > 0) {
        prevSecondRef.current = currentSecond;
        playTimerTick();
      }
    } else {
      prevSecondRef.current = 0;
    }
  }, [timer.isWarning, timer.timeRemaining, playTimerTick]);

  const handleAction = useCallback((action: ActionType, amount?: number) => {
    performAction(action, amount);
  }, [performAction]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isHumanTurn || !legalActions) return;

    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case 'f':
          if (legalActions.canFold) handleAction(ActionType.Fold);
          break;
        case 'c':
          if (legalActions.canCheck) handleAction(ActionType.Check);
          else if (legalActions.canCall) handleAction(ActionType.Call);
          break;
        case 'r':
          if (legalActions.canRaise) handleAction(ActionType.Raise, legalActions.minRaise);
          else if (legalActions.canBet) handleAction(ActionType.Bet, legalActions.minBet);
          break;
        case 'a':
          handleAction(ActionType.AllIn);
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isHumanTurn, legalActions, handleAction]);

  if (!gameState) return null;

  const isShowdown = gameState.street === Street.Showdown || !gameState.isHandInProgress;
  const showAllCards = isShowdown && gameState.winners !== null;

  const activePlayers = gameState.players.filter(p => p.status !== PlayerStatus.Eliminated);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Training overlay */}
      <TrainingOverlay />

      {/* Table */}
      <div className="relative" style={{ width: '85%', maxWidth: 900, aspectRatio: '16/10' }}>
        {/* Table felt */}
        <div
          className="absolute inset-0 rounded-[50%] felt-texture shadow-2xl"
          style={{
            border: '8px solid var(--color-table-border)',
            boxShadow: `
              inset 0 0 60px rgba(0,0,0,0.3),
              0 0 0 12px var(--color-bg-secondary),
              0 0 0 14px var(--color-table-border-inner),
              0 8px 32px rgba(0,0,0,0.5)
            `,
          }}
        />

        {/* Pot display */}
        <div className="absolute left-1/2 top-[35%] -translate-x-1/2 -translate-y-1/2 z-10 text-center">
          {totalPot > 0 && (
            <div className="chip-animate">
              <div className="text-xs text-gray-300 mb-0.5">{t('ui.pot')}</div>
              <div
                className="text-xl font-bold px-4 py-1 rounded-full"
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  color: 'var(--color-accent)',
                  textShadow: '0 0 10px rgba(212,166,52,0.5)',
                }}
              >
                €{totalPot.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Street indicator */}
        <div className="absolute left-1/2 top-[25%] -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">
            {gameState.isHandInProgress ? gameState.street : ''}
          </div>
        </div>

        {/* Community cards */}
        <div className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 z-10">
          <CommunityCards cards={gameState.communityCards} street={gameState.street} />
        </div>

        {/* Player seats */}
        {activePlayers.map((player, i) => {
          const pos = seatPositions[i];
          if (!pos) return null;

          const isActive = gameState.activePlayerIndex !== null &&
            gameState.players[gameState.activePlayerIndex]?.id === player.id;
          const isDealer = player.seatIndex === gameState.dealerSeatIndex;
          const winResult = gameState.winners?.find(w => w.playerId === player.id);
          const isWinner = !!winResult;
          const position = positionMap.get(player.seatIndex);

          const showPlayerTimer = isActive && player.isHuman && timer.isRunning;

          return (
            <div
              key={player.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <PlayerSeat
                player={player}
                position={position}
                isActive={isActive}
                isDealer={isDealer}
                isWinner={isWinner}
                isHuman={player.isHuman}
                showCards={showAllCards}
                winAmount={winResult?.amount}
                timerProgress={showPlayerTimer ? timer.progress : undefined}
                timerWarning={showPlayerTimer ? timer.isWarning : undefined}
              />
            </div>
          );
        })}

        {/* Winner announcement */}
        {gameState.winners && gameState.winners.length > 0 && !gameState.isHandInProgress && (
          <div className="absolute left-1/2 top-[62%] -translate-x-1/2 z-30 animate-winner-pop">
            <div className="text-center bg-black/70 rounded-lg px-4 py-2 backdrop-blur-sm">
              {gameState.winners.map((w, i) => {
                const winner = gameState.players.find(p => p.id === w.playerId);
                return (
                  <div key={i} className="text-sm">
                    <span className="text-green-400 font-bold">{winner?.name}</span>
                    <span className="text-gray-300"> {t('ui.wins')} €{w.amount}</span>
                    {w.hand && (
                      <span className="text-yellow-400 ml-2">({w.hand.description})</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Action area below table */}
      <div className="mt-4 w-full flex flex-col items-center" style={{ maxWidth: 500 }}>
        {isHumanTurn && legalActions && humanPlayer ? (
          <>
            <DecisionTimerBar timer={timer} />
            <ActionPanel
              legalActions={legalActions}
              onAction={handleAction}
              potSize={totalPot}
              playerChips={humanPlayer.chips}
            />
          </>
        ) : !gameState.isHandInProgress ? (
          <button
            onClick={rotateDealerAndStartNewHand}
            className="px-6 py-3 rounded-lg font-bold text-base transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
              color: '#fff',
              boxShadow: '0 4px 15px rgba(46, 204, 113, 0.3)',
            }}
          >
            {t('ui.nextHand')} →
          </button>
        ) : (
          <div className="text-gray-500 text-sm animate-pulse">
            Warte auf KI-Entscheidung...
          </div>
        )}
      </div>

      {/* Hand number */}
      <div className="absolute top-2 left-3 text-xs text-gray-600">
        Hand #{gameState.handNumber}
      </div>
    </div>
  );
};
