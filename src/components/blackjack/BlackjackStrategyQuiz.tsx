import React, { useState, useCallback } from 'react';
import { Card, Rank, Suit } from '../../engine/types';
import { BJHand, handValue } from '../../blackjack/engine';
import { basicStrategy, BJAction, BJ_ACTION_LABELS, BJRecommendation } from '../../blackjack/basicStrategy';
import { useBlackjackProgressStore, BJ_CATEGORY_LABELS } from '../../store/blackjackProgressStore';
import { MiniCard } from '../ui/MiniCard';
import { ActionBtn } from '../ui/ActionBtn';

const SUITS = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs];

function randSuit(): Suit {
  return SUITS[Math.floor(Math.random() * SUITS.length)];
}

function mkCard(rank: Rank): Card {
  const suit = randSuit();
  return { rank, suit, id: (rank - 2) * 4 + SUITS.indexOf(suit) };
}

function mkHand(cards: Card[]): BJHand {
  return { cards, bet: 10, status: 'playing', isSplitHand: false, fromSplitAces: false };
}

const TEN_RANKS = [Rank.Ten, Rank.Jack, Rank.Queen, Rank.King];

function rankForValue(v: number): Rank {
  if (v === 10) return TEN_RANKS[Math.floor(Math.random() * TEN_RANKS.length)];
  if (v === 11) return Rank.Ace;
  return v as Rank;
}

interface QuizQuestion {
  hand: BJHand;
  dealerUp: Card;
  answer: BJRecommendation;
}

/** Zufällige Zwei-Karten-Situation: hart, soft oder Paar — Dealer 2–A */
function randomQuestion(): QuizQuestion {
  const dealerUp = mkCard(rankForValue([2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11][Math.floor(Math.random() * 13)]));
  const kind = Math.random();
  let hand: BJHand;

  if (kind < 0.5) {
    // Harte Hand 8–17 (die interessante Zone)
    const total = 8 + Math.floor(Math.random() * 10);
    let a = total <= 11 ? 2 + Math.floor(Math.random() * Math.min(total - 4, 6)) : 10;
    let b = total - a;
    if (a === b) { a += 1; b -= 1; }
    if (b > 10) { a = total - 10; b = 10; }
    hand = mkHand([mkCard(rankForValue(a)), mkCard(rankForValue(b))]);
  } else if (kind < 0.75) {
    // Soft Hand A2–A9
    const kicker = 2 + Math.floor(Math.random() * 8);
    hand = mkHand([mkCard(Rank.Ace), mkCard(kicker as Rank)]);
  } else {
    // Paar
    const v = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11][Math.floor(Math.random() * 10)];
    hand = mkHand([mkCard(rankForValue(v)), mkCard(rankForValue(v))]);
  }

  return { hand, dealerUp, answer: basicStrategy(hand, dealerUp) };
}

const ACTION_BG: Record<BJAction, string> = {
  hit: 'linear-gradient(135deg, #0a5fa8, #0a84ff)',
  stand: 'linear-gradient(135deg, #1a7a3a, #25a050)',
  double: 'linear-gradient(135deg, #8b6514, #c9a227)',
  split: 'linear-gradient(135deg, #6e1fa0, #9b38d4)',
  surrender: 'linear-gradient(135deg, #5a5a66, #7a7a88)',
};

const ACTIONS: BJAction[] = ['hit', 'stand', 'double', 'split', 'surrender'];

const QuizTab: React.FC = () => {
  const [question, setQuestion] = useState<QuizQuestion>(() => randomQuestion());
  const [chosen, setChosen] = useState<BJAction | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const next = useCallback(() => {
    setQuestion(randomQuestion());
    setChosen(null);
  }, []);

  const pick = (action: BJAction) => {
    if (chosen) return;
    setChosen(action);
    setScore(s => ({ correct: s.correct + (action === question.answer.action ? 1 : 0), total: s.total + 1 }));
  };

  const value = handValue(question.hand.cards);
  const correct = chosen === question.answer.action;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {score.total > 0 && (
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
          🎓 {score.correct}/{score.total} richtig
        </div>
      )}

      {/* Situation */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 28, alignItems: 'flex-end' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 5 }}>Bank zeigt</div>
          <MiniCard card={question.dealerUp} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 5 }}>Deine Hand</div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {question.hand.cards.map((c, i) => <MiniCard key={i} card={c} />)}
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
            {value.soft ? `${value.total} (soft)` : value.total}
          </div>
        </div>
      </div>

      {/* Antworten */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {ACTIONS.map(action => (
          <ActionBtn
            key={action}
            onClick={() => pick(action)}
            label={BJ_ACTION_LABELS[action]}
            disabled={chosen !== null && chosen !== action && action !== question.answer.action}
            style={{
              background: ACTION_BG[action], color: '#fff', minWidth: 96,
              outline: chosen !== null && action === question.answer.action
                ? '2.5px solid var(--color-success)'
                : chosen === action && !correct ? '2.5px solid var(--color-danger)' : 'none',
            }}
          />
        ))}
      </div>

      {/* Auflösung */}
      {chosen && (
        <>
          <div style={{
            padding: '9px 12px', borderRadius: 10, fontSize: 11, lineHeight: 1.5,
            background: correct ? 'rgba(48,209,88,0.1)' : 'rgba(255,159,10,0.12)',
            border: `1px solid ${correct ? 'rgba(48,209,88,0.35)' : 'rgba(255,159,10,0.4)'}`,
            color: 'var(--text-primary)',
          }}>
            {correct
              ? <strong style={{ color: 'var(--color-success)' }}>🎯 Richtig! </strong>
              : <strong style={{ color: 'var(--color-warning)' }}>Besser: {BJ_ACTION_LABELS[question.answer.action]}. </strong>}
            {question.answer.reason}
          </div>
          <button onClick={next} style={{
            padding: '11px 24px', borderRadius: 12, fontWeight: 800, fontSize: 13,
            background: 'linear-gradient(135deg, #1a7a3a, #25a050)', color: '#fff', border: 'none', cursor: 'pointer',
          }}>
            Nächste Situation →
          </button>
        </>
      )}
    </div>
  );
};

const MistakesTab: React.FC = () => {
  const mistakes = useBlackjackProgressStore(s => s.mistakes);
  if (mistakes.length === 0) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>
        Noch keine Fehler gesammelt — spiel mit eingeschaltetem Lern-Coach,
        dann landen falsche Entscheidungen hier zum Nachlernen.
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
      {[...mistakes].reverse().map(m => (
        <div key={m.id} style={{
          display: 'flex', gap: 12, alignItems: 'center', padding: '8px 10px',
          borderRadius: 10, background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
            {m.playerCards.map((c, i) => <MiniCard key={i} card={c} />)}
            <span style={{ fontSize: 9, color: 'var(--text-faint)', margin: '0 3px' }}>vs</span>
            <MiniCard card={m.dealerUp} />
          </div>
          <div style={{ fontSize: 10, lineHeight: 1.45, color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 700, color: 'var(--color-danger)' }}>{BJ_ACTION_LABELS[m.chosen]}</span>
            {' statt '}
            <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{BJ_ACTION_LABELS[m.recommended]}</span>
            <span style={{ color: 'var(--text-tertiary)' }}> · {BJ_CATEGORY_LABELS[m.category]}</span>
            <div style={{ color: 'var(--text-tertiary)' }}>{m.reason}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

/** Strategie-Quiz + persönliches Fehler-Archiv (aus dem Lern-Coach) */
export const BlackjackStrategyQuiz: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [tab, setTab] = useState<'quiz' | 'mistakes'>('quiz');
  const mistakeCount = useBlackjackProgressStore(s => s.mistakes.length);

  return (
    <div className="app-ambient" style={{
      height: '100dvh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '32px 16px 48px', overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onBack} style={{
            padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)',
          }}>← Zurück</button>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>🧠 Strategie-Quiz</span>
          <span style={{ width: 70 }} />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {([
            { id: 'quiz', label: 'Quiz' },
            { id: 'mistakes', label: `Deine Fehler${mistakeCount > 0 ? ` (${mistakeCount})` : ''}` },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: tab === t.id ? '1.5px solid var(--color-accent)' : '1px solid var(--border-subtle)',
              background: tab === t.id ? 'var(--color-accent-soft)' : 'var(--surface-inset)',
              color: tab === t.id ? 'var(--color-accent)' : 'var(--text-secondary)',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{
          background: 'var(--color-bg-panel)', border: '1px solid var(--border-subtle)',
          borderRadius: 18, padding: '16px 18px', boxShadow: 'var(--glass-shadow)',
        }}>
          {tab === 'quiz' ? <QuizTab /> : <MistakesTab />}
        </div>
      </div>
    </div>
  );
};
