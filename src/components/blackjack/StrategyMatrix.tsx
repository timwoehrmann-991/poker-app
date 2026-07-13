import React from 'react';
import { Card, Rank, Suit } from '../../engine/types';
import { BJHand } from '../../blackjack/engine';
import { basicStrategy, BJAction } from '../../blackjack/basicStrategy';

/** Synthetische Karte nur für die Strategie-Berechnung */
function mkCard(rank: Rank, suit: Suit = Suit.Spades): Card {
  return { rank, suit, id: (rank - 2) * 4 };
}

function mkHand(cards: Card[]): BJHand {
  return { cards, bet: 10, status: 'playing', isSplitHand: false, fromSplitAces: false };
}

/** Zwei Karten ohne Ass und ohne Paar, die den harten Wert ergeben */
function hardHand(total: number): BJHand {
  let a = total <= 11 ? 2 : 10;
  let b = total - a;
  if (a === b) { a += 1; b -= 1; }
  const rank = (v: number): Rank => (v === 10 ? Rank.Ten : (v as Rank));
  return mkHand([mkCard(rank(a)), mkCard(rank(b), Suit.Hearts)]);
}

const DEALER_UPS: { label: string; card: Card }[] = [
  ...[2, 3, 4, 5, 6, 7, 8, 9].map(v => ({ label: String(v), card: mkCard(v as Rank) })),
  { label: '10', card: mkCard(Rank.Ten) },
  { label: 'A', card: mkCard(Rank.Ace) },
];

const ACTION_CELL: Record<BJAction, { letter: string; bg: string; color: string }> = {
  hit:       { letter: 'H', bg: 'rgba(10,132,255,0.28)',  color: 'var(--text-primary)' },
  stand:     { letter: 'S', bg: 'rgba(48,209,88,0.32)',   color: 'var(--text-primary)' },
  double:    { letter: 'D', bg: 'rgba(227,182,74,0.42)',  color: 'var(--text-primary)' },
  split:     { letter: 'P', bg: 'rgba(191,90,242,0.32)',  color: 'var(--text-primary)' },
  surrender: { letter: 'R', bg: 'rgba(140,140,155,0.35)', color: 'var(--text-primary)' },
};

interface MatrixRow {
  key: string;
  label: string;
  hand: BJHand;
}

const HARD_ROWS: MatrixRow[] = Array.from({ length: 13 }, (_, i) => {
  const total = 5 + i;
  return { key: `hard-${total}`, label: String(total), hand: hardHand(total) };
});

const SOFT_ROWS: MatrixRow[] = Array.from({ length: 8 }, (_, i) => {
  const kicker = 2 + i; // A2 … A9
  return {
    key: `soft-${13 + i}`,
    label: `A,${kicker}`,
    hand: mkHand([mkCard(Rank.Ace), mkCard(kicker as Rank, Suit.Hearts)]),
  };
});

const PAIR_ROWS: MatrixRow[] = [
  ...[2, 3, 4, 5, 6, 7, 8, 9].map(v => ({
    key: `pair-${v}`,
    label: `${v},${v}`,
    hand: mkHand([mkCard(v as Rank), mkCard(v as Rank, Suit.Hearts)]),
  })),
  { key: 'pair-10', label: '10,10', hand: mkHand([mkCard(Rank.Ten), mkCard(Rank.King, Suit.Hearts)]) },
  { key: 'pair-A', label: 'A,A', hand: mkHand([mkCard(Rank.Ace), mkCard(Rank.Ace, Suit.Hearts)]) },
];

/** Zelle, die live hervorgehoben werden soll: Zeilen-Key + Dealer-Spalte */
export interface MatrixHighlight {
  rowKey: string;
  dealerLabel: string;
}

const Section: React.FC<{ title: string; rows: MatrixRow[]; highlight?: MatrixHighlight }> = ({ title, rows, highlight }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-primary)', margin: '10px 0 6px' }}>{title}</div>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
        <thead>
          <tr>
            <th style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', padding: '3px 6px', textAlign: 'left' }}>Du ↓ · Bank →</th>
            {DEALER_UPS.map(up => (
              <th key={up.label} style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-secondary)', padding: '3px 0', minWidth: 26, textAlign: 'center' }}>
                {up.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key}>
              <td style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', padding: '2px 6px', whiteSpace: 'nowrap' }}>{row.label}</td>
              {DEALER_UPS.map(up => {
                const rec = basicStrategy(row.hand, up.card);
                const cell = ACTION_CELL[rec.action];
                const hot = highlight && highlight.rowKey === row.key && highlight.dealerLabel === up.label;
                return (
                  <td
                    key={up.label}
                    title={rec.reason}
                    style={{
                      textAlign: 'center', fontSize: 10, fontWeight: 800,
                      padding: '3px 0', background: cell.bg, color: cell.color,
                      border: '1px solid var(--border-subtle)',
                      outline: hot ? '2.5px solid var(--color-primary)' : 'none',
                      outlineOffset: -2,
                    }}
                  >
                    {cell.letter}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/** Vollständige Basic-Strategy-Matrix — direkt aus der Engine-Strategie generiert */
export const StrategyMatrixContent: React.FC<{ highlight?: MatrixHighlight }> = ({ highlight }) => (
  <div>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 9, color: 'var(--text-secondary)' }}>
      {(Object.keys(ACTION_CELL) as BJAction[]).map(a => (
        <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            display: 'inline-block', width: 14, height: 14, borderRadius: 3, textAlign: 'center',
            fontSize: 9, fontWeight: 800, lineHeight: '14px', background: ACTION_CELL[a].bg, color: ACTION_CELL[a].color,
          }}>{ACTION_CELL[a].letter}</span>
          {{ hit: 'Ziehen', stand: 'Halten', double: 'Verdoppeln', split: 'Teilen', surrender: 'Aufgeben' }[a]}
        </span>
      ))}
    </div>
    <Section title="Harte Hände (ohne Ass als 11)" rows={HARD_ROWS} highlight={highlight} />
    <Section title="Soft Hände (Ass zählt als 11)" rows={SOFT_ROWS} highlight={highlight} />
    <Section title="Paare" rows={PAIR_ROWS} highlight={highlight} />
    <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 8, lineHeight: 1.5 }}>
      6 Decks · Bank steht auf 17 · Verdoppeln nach Teilen erlaubt · Late Surrender.
      Fahre mit der Maus über eine Zelle für die Begründung.
    </div>
  </div>
);

/** Vollbild-Ansicht mit Zurück-Knopf (Zugang über den Blackjack-Startbildschirm) */
export const StrategyMatrix: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="app-ambient" style={{
    minHeight: '100dvh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '32px 16px 48px', overflowY: 'auto',
  }}>
    <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{
          padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)',
        }}>← Zurück</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>📊 Strategie-Matrix</span>
        <span style={{ width: 70 }} />
      </div>
      <div style={{
        background: 'var(--color-bg-panel)', border: '1px solid var(--border-subtle)',
        borderRadius: 18, padding: '16px 18px', boxShadow: 'var(--glass-shadow)',
      }}>
        <StrategyMatrixContent />
      </div>
    </div>
  </div>
);
