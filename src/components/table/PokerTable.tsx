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
import { ActionType, PlayerStatus, PlayerId, Street } from '../../engine/types';
import { getTotalPot } from '../../engine/game/PotManager';
import { useTranslation } from '../../i18n';
import { describeHand } from '../../i18n/handDescription';
import { ChipStack } from '../ui/ChipStack';
import { formatEuro } from '../../utils/format';
import { calculatePlayerStats } from '../../utils/playerStats';
import { evaluateHand } from '../../engine/evaluator/HandEvaluator';

function getSeatPositions(count: number, rx: number, ry: number): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.PI / 2 + (2 * Math.PI * i) / count;
    return { x: 50 + rx * Math.cos(angle), y: 50 + ry * Math.sin(angle) };
  });
}

/** Position der Pot-Anzeige auf dem Tisch (in %) */
const POT_POS = { x: 50, y: 36 };

export const PokerTable: React.FC = () => {
  const { t, language } = useTranslation();
  const gameState       = useGameStore(s => s.gameState);
  const positionMap     = useGameStore(s => s.positionMap);
  const performAction   = useGameStore(s => s.performAction);
  const getLegalActions = useGameStore(s => s.getLegalActions);
  const view            = useGameStore(s => s.view);
  const handHistory     = useGameStore(s => s.handHistory);
  const tournamentLevel  = useGameStore(s => s.tournamentLevel);
  const tournamentResult = useGameStore(s => s.tournamentResult);
  const rotateDealerAndStartNewHand = useGameStore(s => s.rotateDealerAndStartNewHand);

  useGameLoop();
  const { playTimerTick } = useSoundEffects();
  const layout = useTableLayout();

  // Billig genug für jeden Render — useMemo mit Store-Funktion verwirrt den Compiler
  const legalActions  = getLegalActions();
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

  // Live-Stats der Bots (ab 10 beobachteten Händen) — Gegnertypen lesen lernen
  const liveStats = useMemo(() => {
    const map = new Map<string, string>();
    if (handHistory.length < 10) return map;
    const recent = handHistory.slice(-100);
    for (const p of activePlayers) {
      if (p.isHuman) continue;
      const st = calculatePlayerStats(recent, p.id);
      if (st.handsPlayed >= 10) {
        map.set(p.id, `VPIP ${st.vpip.toFixed(0)} · PFR ${st.pfr.toFixed(0)}`);
      }
    }
    return map;
  }, [handHistory, activePlayers]);

  // Eingaben nur, wenn keine Animation läuft
  const canAct = isHumanTurn && !view.isPlaying;
  const timer  = useDecisionTimer(canAct);

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
    if (!canAct || !legalActions) return;
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
  }, [canAct, legalActions, handleAction]);

  // Sitzposition eines Spielers (in %) für Flug-Animationen
  const seatPosOf = useCallback((playerId: PlayerId): { x: number; y: number } | null => {
    const idx = activePlayers.findIndex(p => p.id === playerId);
    return idx >= 0 ? seatPositions[idx] ?? null : null;
  }, [activePlayers, seatPositions]);

  if (!gameState) return null;

  // Board: während des Playbacks nur die bereits "aufgedeckten" Karten
  const shownBoard = view.isPlaying
    ? gameState.communityCards.slice(0, view.boardRevealed)
    : gameState.communityCards;

  // Pot ohne die gerade fliegenden Chips (sie kommen sichtbar an)
  const flyingAmount = view.collectingBets?.reduce((s, b) => s + b.amount, 0) ?? 0;
  const shownPot = Math.max(0, totalPot - flyingAmount);

  const handOver = !gameState.isHandInProgress && gameState.winners !== null;
  const showWinners = handOver && !view.isPlaying;

  // "Warum verloren?": eigene Showdown-Hand benennen
  const humanLostHand = (() => {
    if (!showWinners || !humanPlayer?.holeCards) return null;
    if (gameState.street !== Street.Showdown) return null;
    if (humanPlayer.status === PlayerStatus.Folded) return null;
    if (gameState.winners?.some(w => w.playerId === humanPlayer.id)) return null;
    if (gameState.communityCards.length < 3) return null;
    try {
      return evaluateHand([...humanPlayer.holeCards, ...gameState.communityCards]);
    } catch {
      return null;
    }
  })();

  // Dealer-Button-Position (gleitet animiert zum nächsten Sitz)
  const dealerIdx = activePlayers.findIndex(p => p.seatIndex === gameState.dealerSeatIndex);
  const dealerSeatPos = dealerIdx >= 0 ? seatPositions[dealerIdx] : null;
  const dealerBtnPos = dealerSeatPos
    ? { x: dealerSeatPos.x + (50 - dealerSeatPos.x) * 0.26, y: dealerSeatPos.y + (50 - dealerSeatPos.y) * 0.26 }
    : null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <TrainingOverlay />

      {/* Table */}
      <div style={{ position: 'relative', width: layout.tableWidth, maxWidth: layout.tableMaxWidth, aspectRatio: layout.aspectRatio }}>

        {/* Gold outer ring */}
        <div style={{
          position: 'absolute', inset: -12, borderRadius: '50%',
          background: 'var(--rail-outer)',
          boxShadow: '0 0 0 4px rgba(0,0,0,0.35), 0 24px 80px rgba(0,0,0,0.55)',
        }} />

        {/* Dark wood ring */}
        <div style={{
          position: 'absolute', inset: -3, borderRadius: '50%',
          background: 'var(--rail-wood)',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.6)',
        }} />

        {/* Felt */}
        <div className="felt-texture" style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.45), inset 0 4px 24px rgba(0,0,0,0.35)',
        }} />

        {/* Betting line — innerer Filzring wie am echten Tisch */}
        <div style={{
          position: 'absolute', inset: '11%', borderRadius: '50%',
          border: '1.5px solid var(--felt-ring)',
          pointerEvents: 'none',
        }} />

        {/* Faint table logo */}
        <div style={{
          position: 'absolute', top: '17%', left: '50%', transform: 'translateX(-50%)',
          fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase',
          color: 'var(--table-logo)', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          No Limit Texas Hold'em
        </div>

        {/* Street */}
        {gameState.isHandInProgress && (
          <div style={{
            position: 'absolute', top: '26%', left: '50%', transform: 'translateX(-50%)',
            fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: 'var(--felt-text-soft)',
          }}>
            — {t(`street.${gameState.street}` as Parameters<typeof t>[0])} —
          </div>
        )}

        {/* Pot display */}
        {shownPot > 0 && (
          <div style={{
            position: 'absolute', top: `${POT_POS.y - 3}%`, left: `${POT_POS.x}%`, transform: 'translateX(-50%)',
            zIndex: 10, textAlign: 'center',
          }}>
            <div style={{ fontSize: 9, color: 'var(--felt-text)', marginBottom: 3, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('ui.pot')}</div>
            <div style={{
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(230,190,90,0.4)',
              borderRadius: 24, padding: '6px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}>
              <ChipStack amount={shownPot} size={13} showAmount={false} />
              <span style={{
                fontSize: 20, fontWeight: 700, color: '#e8c860',
                textShadow: '0 0 16px rgba(230,190,90,0.45)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatEuro(shownPot)}
              </span>
            </div>
            {/* Side pots */}
            {gameState.pots.length > 1 && (
              <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 4 }}>
                {gameState.pots.map((pot, i) => (
                  <div key={i} style={{
                    background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, padding: '1px 7px', fontSize: 9, color: 'rgba(255,255,255,0.4)',
                  }}>
                    {pot.isMainPot ? 'Main' : `Side ${i}`}: {formatEuro(pot.amount)}
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
          <CommunityCards cards={shownBoard} compact={layout.compact} />
        </div>

        {/* Fliegende Chips: Einsätze → Pot */}
        {view.collectingBets?.map(bet => {
          const from = seatPosOf(bet.playerId);
          if (!from) return null;
          return (
            <div
              key={`fly-${bet.playerId}`}
              className="fly-chips"
              style={{
                position: 'absolute', zIndex: 30,
                left: `${from.x}%`, top: `${from.y}%`,
                transform: 'translate(-50%, -50%)',
                ['--fly-to-x' as string]: `${POT_POS.x}%`,
                ['--fly-to-y' as string]: `${POT_POS.y}%`,
                pointerEvents: 'none',
              }}
            >
              <ChipStack amount={bet.amount} size={12} showAmount={false} />
            </div>
          );
        })}

        {/* Fliegende Chips: Pot → Gewinner */}
        {view.awarding?.map(w => {
          const to = seatPosOf(w.playerId);
          if (!to) return null;
          return (
            <div
              key={`award-${w.playerId}-${w.potIndex}`}
              className="fly-chips"
              style={{
                position: 'absolute', zIndex: 30,
                left: `${POT_POS.x}%`, top: `${POT_POS.y}%`,
                transform: 'translate(-50%, -50%)',
                ['--fly-to-x' as string]: `${to.x}%`,
                ['--fly-to-y' as string]: `${to.y}%`,
                animationDuration: '0.8s',
                pointerEvents: 'none',
              }}
            >
              <ChipStack amount={w.amount} size={13} showAmount={false} />
            </div>
          );
        })}

        {/* Dealer-Button — gleitet beim Handwechsel zum nächsten Sitz */}
        {dealerBtnPos && (
          <div
            className="dealer-button-anim"
            style={{
              position: 'absolute', zIndex: 15,
              left: `${dealerBtnPos.x}%`, top: `${dealerBtnPos.y}%`,
              transform: 'translate(-50%, -50%)',
              width: 20, height: 20, borderRadius: '50%',
              background: 'linear-gradient(135deg, #fff 0%, #e8e8e8 100%)',
              color: '#000', fontSize: 9, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--color-accent)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
            }}
          >D</div>
        )}

        {/* Player seats */}
        {activePlayers.map((player, i) => {
          const pos = seatPositions[i];
          if (!pos) return null;
          const isActive  = gameState.activePlayerIndex !== null && gameState.players[gameState.activePlayerIndex]?.id === player.id;
          const winResult = gameState.winners?.find(w => w.playerId === player.id);
          // Karten werden nur im Showdown aufgedeckt — nacheinander, nicht alle auf einmal
          const cardsRevealed = view.showdownRevealed.includes(player.id);
          return (
            <div key={player.id} style={{
              position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)', zIndex: 20,
            }}>
              <PlayerSeat
                player={player}
                position={positionMap.get(player.seatIndex)}
                isActive={isActive}
                isWinner={!!winResult && showWinners}
                compact={layout.compact}
                isHuman={player.isHuman}
                showCards={cardsRevealed}
                liveStats={liveStats.get(player.id)}
                winAmount={showWinners ? winResult?.amount : undefined}
                timerProgress={isActive && player.isHuman && timer.isRunning ? timer.progress : undefined}
                timerWarning={isActive && player.isHuman && timer.isRunning ? timer.isWarning : undefined}
              />
            </div>
          );
        })}

        {/* Winner announcement — erst nach der Showdown-Sequenz */}
        {showWinners && gameState.winners && gameState.winners.length > 0 && (
          <div className="animate-winner-pop" style={{
            position: 'absolute', bottom: '-4%', left: '50%', zIndex: 30,
          }}>
            <div style={{
              background: 'var(--surface-panel)', backdropFilter: 'blur(24px)',
              border: '1px solid rgba(48,209,88,0.4)',
              borderRadius: 14, padding: '8px 20px', textAlign: 'center',
              boxShadow: '0 4px 24px rgba(48,209,88,0.15)',
            }}>
              {gameState.winners.map((w, i) => {
                const winner = gameState.players.find(p => p.id === w.playerId);
                return (
                  <div key={i} style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>{winner?.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}> {t('ui.wins')} </span>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{formatEuro(w.amount)}</span>
                    {w.hand && (
                      <span style={{ color: 'var(--text-tertiary)', marginLeft: 8, fontSize: 10 }}>({describeHand(w.hand, language)})</span>
                    )}
                  </div>
                );
              })}
              {humanLostHand && (
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4, whiteSpace: 'nowrap' }}>
                  Deine Hand: <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{describeHand(humanLostHand, language)}</span> — geschlagen
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action area */}
      <div style={{ marginTop: 14, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 530 }}>
        {canAct && legalActions && humanPlayer ? (
          <>
            <DecisionTimerBar timer={timer} />
            <ActionPanel legalActions={legalActions} onAction={handleAction} potSize={totalPot} playerChips={humanPlayer.chips} />
          </>
        ) : handOver && !view.isPlaying ? (
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
            {view.isPlaying ? '…' : t('ui.aiThinking')}
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', top: 6, left: 10, fontSize: 10, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
        Hand #{gameState.handNumber}
        {tournamentLevel !== null && (
          <span style={{ marginLeft: 8, color: 'var(--color-accent)', fontWeight: 700 }}>
            🏆 Level {tournamentLevel + 1} · Blinds {gameState.config.smallBlind}/{gameState.config.bigBlind}
          </span>
        )}
      </div>

      {/* Turnier-Ende */}
      {tournamentResult && !view.isPlaying && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 90,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: 'var(--color-bg-elevated)', border: '1px solid var(--border-strong)',
            borderRadius: 20, padding: '28px 32px', textAlign: 'center', maxWidth: 340,
            boxShadow: 'var(--glass-shadow-lg)',
          }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>
              {tournamentResult.placement === 1 ? '🏆' : tournamentResult.placement <= 3 ? '🥈' : '🎲'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              {tournamentResult.placement === 1 ? 'Turniersieg!' : 'Turnier vorbei'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>
              Platz {tournamentResult.placement} von {tournamentResult.totalPlayers} · {tournamentResult.handsPlayed} Hände
            </div>
            <button
              onClick={() => useGameStore.getState().leaveGame()}
              style={{
                width: '100%', padding: '11px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13,
                background: 'linear-gradient(135deg, #1a7a3a, #25a050)', color: '#fff', border: 'none', cursor: 'pointer',
              }}
            >
              Zurück zum Menü
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
