import React, { useMemo, useState } from 'react';
import { SCENARIOS, TrainingScenario } from '../../training/scenarios';
import { useTrainingStore, TrainingRecord } from '../../store/trainingStore';
import { MiniCard } from '../ui/MiniCard';
import { formatEuro } from '../../utils/format';
import { useTranslation } from '../../i18n';

type Tab = 'spots' | 'fehler';

interface ScenarioTrainerProps {
  onBack: () => void;
}

/** Aus einem gespeicherten Fehler ein nachspielbares Szenario bauen */
function scenarioFromRecord(record: TrainingRecord, t: (k: never) => string): TrainingScenario | null {
  if (!record.holeCards) return null;
  const optimalLabel = `${t(`action.${record.optimalAction}` as never)}${record.optimalAmount > 0 ? ` ${formatEuro(record.optimalAmount)}` : ''}`;
  const playedLabel = `${t(`action.${record.playerAction}` as never)}${record.playerAmount > 0 ? ` ${formatEuro(record.playerAmount)}` : ''}`;
  const wrongOptions = [playedLabel, 'Passen', 'Mitgehen', 'Erhöhen']
    .filter(l => l !== optimalLabel)
    .slice(0, 2);
  return {
    id: `record-${record.id}`,
    title: `Dein Fehler aus Hand #${record.handNumber}`,
    concept: 'Fehler-Wiederholung',
    heroCards: record.holeCards,
    board: record.board,
    position: record.position,
    situation: `Diese Situation hast du schon einmal gespielt — damals: ${playedLabel}.`,
    pot: record.potSize,
    toCall: 0,
    stackBB: 0,
    options: [
      { label: optimalLabel, correct: true, explanation: record.reasoning || 'Das war die empfohlene Aktion.' },
      ...wrongOptions.map(label => ({
        label,
        correct: false,
        explanation: label === playedLabel
          ? 'Das hast du damals gespielt — und es war ein Fehler.'
          : 'Nicht die beste Wahl in dieser Situation.',
      })),
    ],
    lesson: record.reasoning || 'Wiederhole den Spot, bis die richtige Aktion automatisch kommt.',
  };
}

const SituationCard: React.FC<{ scenario: TrainingScenario }> = ({ scenario }) => (
  <div style={{
    background: 'var(--color-bg-panel)', border: '1px solid var(--border-subtle)',
    borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
    boxShadow: 'var(--glass-shadow)',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{scenario.title}</span>
      <span style={{
        fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'var(--color-accent)', background: 'var(--color-accent-soft)',
        padding: '2px 8px', borderRadius: 8,
      }}>
        {scenario.concept}
      </span>
    </div>

    {/* Karten & Board */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginRight: 2 }}>Du:</span>
        {scenario.heroCards.map((card, i) => <MiniCard key={i} card={card} highlighted />)}
      </div>
      {scenario.board.length > 0 && (
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginRight: 2 }}>Board:</span>
          {scenario.board.map((card, i) => <MiniCard key={i} card={card} />)}
        </div>
      )}
    </div>

    {/* Eckdaten */}
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-secondary)' }}>
      <span>Position: <strong style={{ color: 'var(--text-primary)' }}>{scenario.position}</strong></span>
      <span>Pot: <strong style={{ color: 'var(--text-primary)' }}>{formatEuro(scenario.pot)}</strong></span>
      {scenario.toCall > 0 && <span>Zu zahlen: <strong style={{ color: 'var(--text-primary)' }}>{formatEuro(scenario.toCall)}</strong></span>}
      {scenario.stackBB > 0 && <span>Stack: <strong style={{ color: 'var(--text-primary)' }}>{scenario.stackBB} BB</strong></span>}
    </div>

    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
      {scenario.situation}
    </div>
  </div>
);

export const ScenarioTrainer: React.FC<ScenarioTrainerProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const records = useTrainingStore(s => s.records);
  const [tab, setTab] = useState<Tab>('spots');
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });

  const mistakeScenarios = useMemo(() =>
    records
      .filter(r => (r.rating === 'mistake' || r.rating === 'blunder') && r.holeCards)
      .slice(-10)
      .reverse()
      .map(r => scenarioFromRecord(r, t as (k: never) => string))
      .filter((s): s is TrainingScenario => s !== null),
  [records, t]);

  const pool = tab === 'spots' ? SCENARIOS : mistakeScenarios;
  const scenario = pool[index % Math.max(pool.length, 1)];

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    setScore(s => ({ right: s.right + (scenario.options[i].correct ? 1 : 0), total: s.total + 1 }));
  };

  const next = () => {
    setPicked(null);
    setIndex(i => i + 1);
  };

  const switchTab = (newTab: Tab) => {
    setTab(newTab);
    setIndex(0);
    setPicked(null);
  };

  return (
    <div className="app-ambient" style={{
      height: '100dvh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '24px 16px 48px', overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>

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
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>🎯 Szenario-Training</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums' }}>
            {score.right}/{score.total}
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {([
            { id: 'spots' as Tab, label: `Übungs-Spots (${SCENARIOS.length})` },
            { id: 'fehler' as Tab, label: `Deine Fehler (${mistakeScenarios.length})` },
          ]).map(tb => (
            <button
              key={tb.id}
              onClick={() => switchTab(tb.id)}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                border: tab === tb.id ? '1.5px solid var(--color-accent)' : '1px solid var(--border-subtle)',
                background: tab === tb.id ? 'var(--color-accent-soft)' : 'var(--surface-inset)',
                color: tab === tb.id ? 'var(--color-accent)' : 'var(--text-secondary)',
              }}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {pool.length === 0 ? (
          <div style={{
            background: 'var(--color-bg-panel)', border: '1px solid var(--border-subtle)',
            borderRadius: 16, padding: 24, textAlign: 'center',
            fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6,
          }}>
            Noch keine Fehler gespeichert — spiele mit aktiviertem Lern-Coach,<br />
            dann landen bewertete Fehlentscheidungen hier zum Nachspielen.
          </div>
        ) : (
          <>
            <SituationCard scenario={scenario} />

            {/* Antwortoptionen */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {scenario.options.map((opt, i) => {
                const resolved = picked !== null;
                const isPicked = picked === i;
                let border = '1px solid var(--border-subtle)';
                let bg = 'var(--color-bg-panel)';
                if (resolved && opt.correct) { border = '1.5px solid var(--color-success)'; bg = 'rgba(48,209,88,0.1)'; }
                else if (resolved && isPicked && !opt.correct) { border = '1.5px solid var(--color-danger)'; bg = 'rgba(255,69,58,0.1)'; }
                return (
                  <button
                    key={i}
                    onClick={() => pick(i)}
                    disabled={picked !== null}
                    style={{
                      textAlign: 'left', padding: '12px 14px', borderRadius: 12,
                      border, background: bg,
                      cursor: picked === null ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {resolved && opt.correct ? '✓ ' : resolved && isPicked ? '✗ ' : ''}{opt.label}
                    </div>
                    {resolved && (opt.correct || isPicked) && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 5, lineHeight: 1.5 }}>
                        {opt.explanation}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Lektion + Weiter */}
            {picked !== null && (
              <>
                <div style={{
                  padding: '12px 14px', borderRadius: 12,
                  background: 'var(--color-accent-soft)', border: '1px solid var(--color-accent-border)',
                  fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.55,
                }}>
                  <span style={{ fontWeight: 800 }}>📌 Merksatz: </span>{scenario.lesson}
                </div>
                <button
                  onClick={next}
                  style={{
                    padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    background: 'linear-gradient(135deg, #1a7a3a, #25a050)', color: '#fff', border: 'none',
                    boxShadow: '0 4px 18px rgba(48,209,88,0.25)',
                  }}
                >
                  Nächster Spot →
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
