import React from 'react';
import { BJState, BJSeat, BJHand, handValue, isBlackjack } from '../../blackjack/engine';
import { CardComponent } from '../cards/CardComponent';
import { ChipStack } from '../ui/ChipStack';
import { formatEuro } from '../../utils/format';
import { useBlackjackStore } from '../../store/blackjackStore';
import { useIsMobile } from '../../hooks/useIsMobile';

const DEALER_POS = { x: 50, y: 12 };
const TABLE_CENTER = { x: 50, y: 46 };

/** Sitzpositionen auf dem unteren Tischbogen (links → rechts, in %) */
function seatPositions(count: number, tight: boolean): { x: number; y: number }[] {
  if (count === 1) return [{ x: 50, y: tight ? 74 : 78 }];
  // tight (Mobile): Sitze weiter innen, damit Boxen nicht aus dem Bild ragen
  const rx = tight ? 33 : 40;
  const ry = tight ? 28 : 34;
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const angle = Math.PI * (0.83 - 0.66 * t);
    return {
      x: 50 + rx * Math.cos(angle),
      y: 46 + ry * Math.sin(angle),
    };
  });
}

/** Bet-Box liegt zwischen Sitz und Tischmitte auf dem Filz */
function betBoxPos(seat: { x: number; y: number }): { x: number; y: number } {
  return {
    x: TABLE_CENTER.x + (seat.x - TABLE_CENTER.x) * 0.62,
    y: TABLE_CENTER.y + (seat.y - TABLE_CENTER.y) * 0.55,
  };
}

/** Handwert-Badge: zeigt Wert, Soft, Bust, Blackjack */
const ValueBadge: React.FC<{ hand: BJHand; visibleCards: number }> = ({ hand, visibleCards }) => {
  const cards = hand.cards.slice(0, visibleCards);
  if (cards.length === 0) return null;
  const value = handValue(cards);
  const complete = visibleCards >= hand.cards.length;
  const bj = complete && (isBlackjack(hand) || hand.status === 'blackjack');
  const bust = value.total > 21;

  let bg = 'rgba(0,0,0,0.6)';
  let color = '#fff';
  if (bj) { bg = 'rgba(227,182,74,0.92)'; color = '#1a1206'; }
  else if (bust) { bg = 'rgba(255,69,58,0.9)'; }
  else if (value.total === 21) { bg = 'rgba(48,209,88,0.9)'; }

  return (
    <span
      title={value.soft ? 'Soft: Das Ass zählt gerade als 11 — mit einer weiteren Karte kann es zur 1 werden, du kannst nicht kaputtgehen.' : undefined}
      style={{
        fontSize: 10, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
        padding: '1px 7px', borderRadius: 9, background: bg, color,
        whiteSpace: 'nowrap',
      }}>
      {bj ? 'Blackjack!'
        : hand.status === 'surrendered' ? 'Aufgegeben'
        : bust ? `${value.total} — kaputt`
        : value.soft ? `${value.total} (soft)` : value.total}
    </span>
  );
};

/** Netto-Ergebnis aus Sicht des Spielers: payout enthält den Einsatz */
function netResult(hand: BJHand): number {
  return (hand.payout ?? 0) - hand.bet;
}

const RESULT_LABELS: Record<string, { text: string; color: string }> = {
  win:       { text: 'Gewonnen',      color: 'var(--color-success)' },
  blackjack: { text: 'Blackjack!',    color: 'var(--color-accent)' },
  push:      { text: 'Unentschieden', color: 'var(--color-warning)' },
  lose:      { text: 'Verloren',      color: 'var(--color-danger)' },
  surrender: { text: 'Aufgegeben',    color: 'var(--text-tertiary)' },
};

const ResultTag: React.FC<{ hand: BJHand }> = ({ hand }) => {
  if (!hand.result) return null;
  const label = RESULT_LABELS[hand.result];
  const net = netResult(hand);
  const netText = net > 0 ? `+${formatEuro(net)}` : net < 0 ? `−${formatEuro(-net)}` : '±0';
  return (
    <span style={{ fontSize: 9, fontWeight: 800, color: label.color, whiteSpace: 'nowrap' }}>
      {label.text} {netText}
    </span>
  );
};

const SeatView: React.FC<{
  seat: BJSeat;
  isActive: boolean;
  activeHandIndex: number;
  showResults: boolean;
  /** Sichtbare Karten pro Hand während des Austeilens (null = alle) */
  visibleInitial: number | null;
  clearing: boolean;
  compact: boolean;
  /** Startversatz des Kartenflugs (Richtung Bank), in px */
  flyFrom: { dx: number; dy: number };
}> = ({ seat, isActive, activeHandIndex, showResults, visibleInitial, clearing, compact, flyFrom }) => {
  const sitOut = seat.hands.length === 0;
  const splitTight = seat.hands.length > 1 && compact;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: compact ? 2 : 4,
      opacity: sitOut ? 0.5 : 1,
      transform: compact ? 'scale(0.82)' : 'none',
      transformOrigin: 'center bottom',
    }}>
      {/* Hände (bei Split zwei nebeneinander — bei Engstand untereinander) */}
      <div style={{ display: 'flex', flexDirection: splitTight ? 'column' : 'row', gap: splitTight ? 4 : 10 }}>
        {seat.hands.map((hand, hi) => {
          const handActive = isActive && hi === activeHandIndex && hand.status === 'playing';
          const visibleCards = visibleInitial === null ? hand.cards.length : Math.min(visibleInitial, hand.cards.length);
          return (
            <div key={hi} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: 3, borderRadius: 10,
              outline: handActive ? '2px solid var(--color-primary)' : 'none',
              outlineOffset: 2,
            }}>
              <div className={clearing ? 'card-clear' : ''} style={{ display: 'flex', minHeight: compact ? 44 : 52 }}>
                {hand.cards.slice(0, visibleCards).map((card, ci) => (
                  // Index im Key: der 6-Deck-Shoe kann identische Karten-IDs in eine Hand legen
                  <div
                    key={`${card.id}-${ci}`}
                    className="deal-fly"
                    style={{
                      marginLeft: ci > 0 ? -22 : 0, zIndex: ci,
                      ['--deal-from-x' as string]: `${flyFrom.dx}px`,
                      ['--deal-from-y' as string]: `${flyFrom.dy}px`,
                    }}
                  >
                    <CardComponent card={card} faceUp small flat />
                  </div>
                ))}
              </div>
              <ValueBadge hand={hand} visibleCards={visibleCards} />
              {showResults
                ? <ResultTag hand={hand} />
                : hand.bet > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{formatEuro(hand.bet)}</span>}
            </div>
          );
        })}
      </div>

      {/* Sitz-Box */}
      <div className={isActive ? 'active-glow' : ''} style={{
        background: 'var(--surface-seat)',
        border: `1.5px solid ${isActive ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
        borderRadius: 10, padding: '4px 10px', textAlign: 'center', minWidth: 74,
        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
          {seat.isHuman ? `⭐ ${seat.name}` : seat.name}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums' }}>
          {formatEuro(seat.chips)}
        </div>
      </div>
    </div>
  );
};

export const BlackjackTable: React.FC<{ state: BJState }> = ({ state }) => {
  const dealtSteps  = useBlackjackStore(s => s.dealtSteps);
  const announce    = useBlackjackStore(s => s.announce);
  const suppressHole = useBlackjackStore(s => s.suppressHole);
  const holeFlips   = useBlackjackStore(s => s.holeFlips);
  const chipFlights = useBlackjackStore(s => s.chipFlights);
  const clearing    = useBlackjackStore(s => s.clearing);
  const betAmount   = useBlackjackStore(s => s.betAmount);
  const isMobile    = useIsMobile();

  const positions = seatPositions(state.seats.length, isMobile);
  const showResults = state.phase === 'payout';
  const betting = state.phase === 'betting';
  const compact = isMobile;

  // Austeil-Reihenfolge: erst Runde 1 (Sitz 0..n-1, dann Bank), dann Runde 2.
  // Aktiver Sitz k: Karte 0 = Schritt k, Karte 1 = Schritt n+1+k · Bank: n und 2n+1.
  const activeSeatOrder = state.seats
    .map((seat, i) => ({ seat, i }))
    .filter(({ seat }) => seat.hands.length > 0)
    .map(({ i }) => i);
  const n = activeSeatOrder.length;

  function visibleInitialFor(seatIndex: number): number | null {
    if (dealtSteps === null) return null;
    const k = activeSeatOrder.indexOf(seatIndex);
    if (k === -1) return 0;
    let visible = 0;
    if (dealtSteps > k) visible = 1;
    if (dealtSteps > n + 1 + k) visible = 2;
    return visible;
  }

  const dealerVisible = dealtSteps === null
    ? state.dealerCards.length
    : (dealtSteps > 2 * n + 1 ? 2 : dealtSteps > n ? 1 : 0);

  const holeHidden = !state.dealerRevealed || suppressHole;
  const dealerValue = state.dealerCards.length > 0 && dealerVisible > 0
    ? (holeHidden ? handValue([state.dealerCards[0]]) : handValue(state.dealerCards.slice(0, dealerVisible)))
    : null;

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 860, aspectRatio: isMobile ? '1/1.05' : '16/10', margin: '0 auto' }}>
      {/* Tisch — identischer Aufbau wie beim Poker */}
      <div style={{
        position: 'absolute', inset: -12, borderRadius: '50%',
        background: 'var(--rail-outer)',
        boxShadow: '0 0 0 4px rgba(0,0,0,0.35), 0 24px 80px rgba(0,0,0,0.55)',
      }} />
      <div style={{
        position: 'absolute', inset: -3, borderRadius: '50%',
        background: 'var(--rail-wood)',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.6)',
      }} />
      <div className="felt-texture" style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        boxShadow: 'inset 0 0 100px rgba(0,0,0,0.45), inset 0 4px 24px rgba(0,0,0,0.35)',
      }} />
      <div style={{
        position: 'absolute', inset: '11%', borderRadius: '50%',
        border: '1.5px solid var(--felt-ring)', pointerEvents: 'none',
      }} />

      {/* Tisch-Aufschrift wie im echten Casino */}
      <div style={{
        position: 'absolute', top: '38%', left: '50%', transform: 'translateX(-50%)',
        fontSize: 10, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase',
        color: 'var(--table-logo)', pointerEvents: 'none', whiteSpace: 'nowrap', textAlign: 'center',
      }}>
        Blackjack zahlt 3:2
        <div style={{ fontSize: 7, letterSpacing: '0.22em', marginTop: 3 }}>
          Die Bank zieht bis 16 · steht auf 17
        </div>
      </div>

      {/* Dealer-Ansage über der Bank */}
      {announce && (
        <div style={{
          position: 'absolute', top: '-4%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 40, pointerEvents: 'none',
          background: 'var(--color-bg-elevated)', border: '1px solid var(--border-strong)',
          borderRadius: 12, padding: '6px 14px',
          fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap',
          boxShadow: 'var(--glass-shadow)',
        }}>
          {announce}
        </div>
      )}

      {/* Dealer (Bank) oben */}
      <div style={{
        position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, zIndex: 10,
      }}>
        <div style={{
          background: 'var(--surface-seat)', border: '1px solid var(--border-subtle)',
          borderRadius: 10, padding: '3px 12px',
          fontSize: 10, fontWeight: 700, color: 'var(--text-primary)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        }}>
          🏦 Bank
        </div>
        <div className={clearing ? 'card-clear' : ''} style={{ display: 'flex', minHeight: 52 }}>
          {state.dealerCards.slice(0, dealerVisible).map((card, i) => {
            const isHole = i === 1;
            const faceUp = !isHole || !holeHidden;
            const justFlipped = isHole && faceUp;
            return (
              // Index im Key (A1) + holeFlips: Remount beim Aufdecken triggert den Flip
              <div
                key={isHole ? `${card.id}-${i}-${faceUp}-${holeFlips}` : `${card.id}-${i}`}
                className={justFlipped ? 'flip-reveal' : 'deal-fly'}
                style={{
                  marginLeft: i > 0 ? -22 : 0, position: 'relative', zIndex: i,
                  ['--deal-from-y' as string]: '-70px',
                }}
              >
                <CardComponent card={card} faceUp={faceUp} small flat />
              </div>
            );
          })}
        </div>
        {dealerValue && (
          <span style={{
            fontSize: 10, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
            padding: '1px 7px', borderRadius: 9,
            background: dealerValue.total > 21 ? 'rgba(255,69,58,0.9)' : 'rgba(0,0,0,0.6)',
            color: '#fff',
          }}>
            {holeHidden
              ? `zeigt ${dealerValue.total}`
              : (dealerValue.total > 21 ? `${dealerValue.total} — Bank kaputt!` : dealerValue.total)}
          </span>
        )}
      </div>

      {/* Bet-Boxen auf dem Filz */}
      {state.seats.map((seat, i) => {
        const box = betBoxPos(positions[i]);
        const bet = seat.hands.reduce((sum, h) => sum + h.bet, 0);
        const humanPreview = betting && seat.isHuman && betAmount > 0;
        const showChips = bet > 0 || humanPreview;
        return (
          <div key={`bet-${seat.id}`} style={{
            position: 'absolute', left: `${box.x}%`, top: `${box.y}%`,
            transform: 'translate(-50%, -50%)', zIndex: 12, pointerEvents: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <div
              className={betting && seat.chips > 0 ? 'bet-box-pulse' : ''}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                border: '1.5px dashed var(--felt-ring)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {showChips && <ChipStack amount={humanPreview ? betAmount : bet} size={11} showAmount={false} />}
            </div>
            {showChips && (
              <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--felt-text)', fontVariantNumeric: 'tabular-nums' }}>
                {formatEuro(humanPreview ? betAmount : bet)}
              </span>
            )}
          </div>
        );
      })}

      {/* Fliegende Chips beim Payout */}
      {chipFlights?.map((flight, fi) => {
        const box = betBoxPos(positions[flight.seatIndex]);
        const from = flight.toDealer ? box : DEALER_POS;
        const to = flight.toDealer ? DEALER_POS : box;
        return (
          <div
            key={`flight-${fi}`}
            className="fly-chips"
            style={{
              position: 'absolute', zIndex: 35,
              left: `${from.x}%`, top: `${from.y}%`,
              transform: 'translate(-50%, -50%)',
              ['--fly-to-x' as string]: `${to.x}%`,
              ['--fly-to-y' as string]: `${to.y}%`,
              animationDuration: '0.7s',
              pointerEvents: 'none',
            }}
          >
            <ChipStack amount={flight.amount} size={12} showAmount={false} />
          </div>
        );
      })}

      {/* Spieler-Sitze auf dem unteren Bogen */}
      {state.seats.map((seat, i) => {
        const pos = positions[i];
        const isActive = state.activeSeatIndex === i;
        // Flugrichtung: von der Bank (oben Mitte) zum Sitz — grob in px umgerechnet
        const flyFrom = {
          dx: Math.round((DEALER_POS.x - pos.x) * (isMobile ? 3.4 : 7.5)),
          dy: Math.round((DEALER_POS.y - pos.y) * (isMobile ? 3.4 : 4.8)),
        };
        return (
          <div key={seat.id} style={{
            position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`,
            transform: 'translate(-50%, -50%)', zIndex: isActive ? 25 : 20,
          }}>
            <SeatView
              seat={seat}
              isActive={isActive}
              activeHandIndex={seat.activeHandIndex}
              showResults={showResults}
              visibleInitial={visibleInitialFor(i)}
              clearing={clearing}
              compact={compact}
              flyFrom={flyFrom}
            />
          </div>
        );
      })}
    </div>
  );
};
