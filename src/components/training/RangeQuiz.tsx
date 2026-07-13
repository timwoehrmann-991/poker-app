import React, { useMemo, useState } from 'react';
import { Rank, Suit } from '../../engine/types';
import { createCard } from '../../engine/deck/Card';
import { chenStrength } from '../../ai/AIPlayer';

interface RangeQuizProps {
  onBack: () => void;
}

/** Ränge absteigend A → 2 (Matrix-Achsen) */
const RANKS_DESC: Rank[] = [
  Rank.Ace, Rank.King, Rank.Queen, Rank.Jack, Rank.Ten, Rank.Nine, Rank.Eight,
  Rank.Seven, Rank.Six, Rank.Five, Rank.Four, Rank.Three, Rank.Two,
];
const RANK_LABEL: Record<Rank, string> = {
  [Rank.Two]: '2', [Rank.Three]: '3', [Rank.Four]: '4', [Rank.Five]: '5',
  [Rank.Six]: '6', [Rank.Seven]: '7', [Rank.Eight]: '8', [Rank.Nine]: '9',
  [Rank.Ten]: 'T', [Rank.Jack]: 'J', [Rank.Queen]: 'Q', [Rank.King]: 'K', [Rank.Ace]: 'A',
};

/**
 * Open-Raise-Schwellen (Chen-normiert) — identisch zur Spielweise des
 * GTO-Bots im Simulator, damit Quiz und Coach dieselbe Sprache sprechen.
 */
const POSITIONS = [
  { id: 'UTG', label: 'UTG (früh)', threshold: 0.33 },
  { id: 'MP',  label: 'MP (Mitte)', threshold: 0.28 },
  { id: 'CO',  label: 'CO (spät)',  threshold: 0.23 },
  { id: 'BTN', label: 'Button',     threshold: 0.23 },
  { id: 'SB',  label: 'Small Blind', threshold: 0.28 },
] as const;

type PositionId = typeof POSITIONS[number]['id'];

/** Zelle (row, col): Diagonale = Paar, oben rechts = suited, unten links = offsuit */
function cellInfo(row: number, col: number) {
  const r1 = RANKS_DESC[row];
  const r2 = RANKS_DESC[col];
  const isPair = row === col;
  const suited = col > row; // rechts oben
  const high = RANKS_DESC[Math.min(row, col)];
  const low = RANKS_DESC[Math.max(row, col)];
  const label = isPair
    ? `${RANK_LABEL[r1]}${RANK_LABEL[r2]}`
    : `${RANK_LABEL[high]}${RANK_LABEL[low]}${suited ? 's' : 'o'}`;
  const strength = chenStrength(
    createCard(high, Suit.Spades),
    createCard(low, suited && !isPair ? Suit.Spades : Suit.Hearts),
  );
  return { label, strength, isPair, suited };
}

interface QuizQuestion {
  row: number;
  col: number;
  position: PositionId;
}

function randomQuestion(): QuizQuestion {
  return {
    row: Math.floor(Math.random() * 13),
    col: Math.floor(Math.random() * 13),
    position: POSITIONS[Math.floor(Math.random() * POSITIONS.length)].id,
  };
}

export const RangeQuiz: React.FC<RangeQuizProps> = ({ onBack }) => {
  const [posTab, setPosTab] = useState<PositionId>('UTG');
  const [question, setQuestion] = useState<QuizQuestion>(randomQuestion);
  const [answer, setAnswer] = useState<'raise' | 'fold' | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [answered, setAnswered] = useState<Map<string, boolean>>(new Map()); // key row-col-pos → korrekt?
  const [showSolution, setShowSolution] = useState(false);

  const threshold = POSITIONS.find(p => p.id === posTab)!.threshold;
  const qThreshold = POSITIONS.find(p => p.id === question.position)!.threshold;
  const qInfo = useMemo(() => cellInfo(question.row, question.col), [question]);
  const qInRange = qInfo.strength >= qThreshold;

  const give = (a: 'raise' | 'fold') => {
    if (answer !== null) return;
    setAnswer(a);
    const correct = (a === 'raise') === qInRange;
    setScore(s => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1 }));
    setAnswered(prev => new Map(prev).set(`${question.row}-${question.col}-${question.position}`, correct));
  };

  const next = () => {
    setAnswer(null);
    setQuestion(randomQuestion());
  };

  return (
    <div className="app-ambient" style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '24px 16px 48px', overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Kopf */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={onBack}
            style={{
              padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            ← Zurück
          </button>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>📊 Range-Quiz</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums' }}>
            {score.right}/{score.total}
          </span>
        </div>

        {/* Frage */}
        <div style={{
          background: 'var(--color-bg-panel)', border: '1px solid var(--border-subtle)',
          borderRadius: 16, padding: 18, boxShadow: 'var(--glass-shadow)',
          display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            Alle vor dir passen. Eröffnest du?
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{
              fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              color: 'var(--text-primary)', letterSpacing: '0.02em',
            }}>
              {qInfo.label}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
              background: 'var(--color-accent-soft)', color: 'var(--color-accent)',
            }}>
              {POSITIONS.find(p => p.id === question.position)!.label}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 340 }}>
            <button
              onClick={() => give('raise')}
              disabled={answer !== null}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer',
                background: answer !== null && qInRange ? 'rgba(48,209,88,0.15)' : 'linear-gradient(135deg, #8b6514, #c9a227)',
                border: answer !== null && qInRange ? '1.5px solid var(--color-success)' : 'none',
                color: answer !== null && qInRange ? 'var(--color-success)' : '#fff',
              }}
            >
              Erhöhen
            </button>
            <button
              onClick={() => give('fold')}
              disabled={answer !== null}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer',
                background: answer !== null && !qInRange ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.12)',
                border: answer !== null && !qInRange ? '1.5px solid var(--color-success)' : '1.5px solid rgba(255,69,58,0.35)',
                color: answer !== null && !qInRange ? 'var(--color-success)' : 'var(--color-danger)',
              }}
            >
              Passen
            </button>
          </div>

          {answer !== null && (
            <>
              <div style={{
                fontSize: 12, fontWeight: 700,
                color: (answer === 'raise') === qInRange ? 'var(--color-success)' : 'var(--color-danger)',
              }}>
                {(answer === 'raise') === qInRange ? '✓ Richtig!' : '✗ Daneben'}
                {' — '}
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {qInfo.label} ist aus {question.position} {qInRange ? 'ein Open-Raise' : 'ein Fold'}.
                </span>
              </div>
              <button
                onClick={next}
                style={{
                  padding: '9px 28px', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  background: 'linear-gradient(135deg, #1a7a3a, #25a050)', color: '#fff', border: 'none',
                }}
              >
                Nächste Hand →
              </button>
            </>
          )}
        </div>

        {/* Matrix */}
        <div style={{
          background: 'var(--color-bg-panel)', border: '1px solid var(--border-subtle)',
          borderRadius: 16, padding: 16, boxShadow: 'var(--glass-shadow)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {POSITIONS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPosTab(p.id)}
                  style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    border: posTab === p.id ? '1.5px solid var(--color-accent)' : '1px solid var(--border-subtle)',
                    background: posTab === p.id ? 'var(--color-accent-soft)' : 'transparent',
                    color: posTab === p.id ? 'var(--color-accent)' : 'var(--text-secondary)',
                  }}
                >
                  {p.id}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSolution(v => !v)}
              style={{
                padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                border: '1px solid var(--border-subtle)',
                background: showSolution ? 'var(--color-accent-soft)' : 'transparent',
                color: showSolution ? 'var(--color-accent)' : 'var(--text-secondary)',
              }}
            >
              {showSolution ? 'Range ausblenden' : 'Range zeigen'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 2 }}>
            {RANKS_DESC.map((_, row) =>
              RANKS_DESC.map((_, col) => {
                const info = cellInfo(row, col);
                const inRange = info.strength >= threshold;
                const answeredKey = answered.get(`${row}-${col}-${posTab}`);
                let bg = 'var(--surface-inset)';
                if (showSolution && inRange) bg = 'var(--color-accent-soft)';
                let ring = 'none';
                if (answeredKey === true) ring = '1.5px solid var(--color-success)';
                if (answeredKey === false) ring = '1.5px solid var(--color-danger)';
                return (
                  <div
                    key={`${row}-${col}`}
                    title={`${info.label} — ${inRange ? 'Open-Raise' : 'Fold'} aus ${posTab}`}
                    style={{
                      aspectRatio: '1', borderRadius: 3,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 7.5, fontWeight: 700,
                      background: bg,
                      outline: ring, outlineOffset: -1,
                      color: showSolution && inRange ? 'var(--color-accent)' : 'var(--text-tertiary)',
                      cursor: 'default',
                    }}
                  >
                    {info.label}
                  </div>
                );
              })
            )}
          </div>

          <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 8, lineHeight: 1.5 }}>
            Diagonale = Paare · rechts oben = suited (s) · links unten = offsuit (o).
            Die Ranges entsprechen der Spielweise des GTO-Bots im Simulator.
          </div>
        </div>
      </div>
    </div>
  );
};
