import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { HandRecord, ActionType, HandCategory } from '../../engine/types';
import { cardToString } from '../../engine/deck/Card';
import { useTranslation } from '../../i18n';
import { describeHand } from '../../i18n/handDescription';
import { formatEuro } from '../../utils/format';
import { MiniCard } from '../ui/MiniCard';
import { Language } from '../../store/settingsStore';

const ACTION_LABELS: Record<Language, Record<string, string>> = {
  de: {
    [ActionType.Fold]: '❌ Passen',
    [ActionType.Check]: '✋ Schieben',
    [ActionType.Call]: '📞 Mitgehen',
    [ActionType.Bet]: '💰 Setzen',
    [ActionType.Raise]: '⬆️ Erhöhen',
    [ActionType.AllIn]: '🔥 All-in',
    [ActionType.PostSmallBlind]: 'SB',
    [ActionType.PostBigBlind]: 'BB',
  },
  en: {
    [ActionType.Fold]: '❌ Fold',
    [ActionType.Check]: '✋ Check',
    [ActionType.Call]: '📞 Call',
    [ActionType.Bet]: '💰 Bet',
    [ActionType.Raise]: '⬆️ Raise',
    [ActionType.AllIn]: '🔥 All-In',
    [ActionType.PostSmallBlind]: 'SB',
    [ActionType.PostBigBlind]: 'BB',
  },
};

const HAND_COLORS: Record<number, string> = {
  [HandCategory.HighCard]:      '#8e8e93',
  [HandCategory.OnePair]:       '#8e8e93',
  [HandCategory.TwoPair]:       '#ff9f0a',
  [HandCategory.ThreeOfAKind]:  '#ff9f0a',
  [HandCategory.Straight]:      '#0a84ff',
  [HandCategory.Flush]:         '#0a84ff',
  [HandCategory.FullHouse]:     '#bf5af2',
  [HandCategory.FourOfAKind]:   '#ff453a',
  [HandCategory.StraightFlush]: '#ff453a',
  [HandCategory.RoyalFlush]:    '#e3b64a',
};

const HandEntry: React.FC<{ record: HandRecord; expanded: boolean; onToggle: () => void }> = ({
  record, expanded, onToggle,
}) => {
  const { t, language } = useTranslation();
  const mainWinner = record.winners.reduce((best, w) =>
    w.amount > (best?.amount ?? 0) ? w : best, record.winners[0]);
  const winnerPlayer = record.players.find(p => p.id === mainWinner?.playerId);
  const winnerName = winnerPlayer?.name ?? '?';
  const isHumanWin = mainWinner?.playerId === 'human';
  const handColor = mainWinner?.hand ? (HAND_COLORS[mainWinner.hand.category] ?? '#8e8e93') : '#8e8e93';
  const wonWithoutShowdown = !mainWinner?.hand;
  const totalPot = record.pots.reduce((s, p) => s + p.amount, 0);
  const actionLabels = ACTION_LABELS[language];

  // Eigenes Ergebnis dieser Hand
  const me = record.players.find(p => p.id === 'human');
  const myWon = record.winners.filter(w => w.playerId === 'human').reduce((s, w) => s + w.amount, 0);
  const myInvested = record.actions.filter(a => a.playerId === 'human' && a.amount > 0).reduce((s, a) => s + a.amount, 0);
  const myProfit = myWon - myInvested;

  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${isHumanWin ? 'rgba(48,209,88,0.4)' : 'var(--border-subtle)'}`,
      borderLeft: `3px solid ${isHumanWin ? 'var(--color-success)' : handColor}`,
      background: expanded ? 'var(--surface-inset)' : 'var(--surface-panel)',
      overflow: 'hidden',
    }}>
      {/* Kopfzeile — immer sichtbar */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', flexDirection: 'column', gap: 5,
          padding: '9px 11px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        {/* Zeile 1: Gewinner + Betrag rechts */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 9, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>#{record.handNumber}</span>
            <span style={{
              fontSize: 12.5, fontWeight: 800,
              color: isHumanWin ? 'var(--color-success)' : 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {isHumanWin ? '⭐ ' : ''}{winnerName}
            </span>
          </span>
          <span style={{
            fontSize: 12, fontWeight: 800, flexShrink: 0,
            padding: '2px 9px', borderRadius: 20, fontVariantNumeric: 'tabular-nums',
            background: isHumanWin ? 'rgba(48,209,88,0.15)' : 'var(--color-accent-soft)',
            color: isHumanWin ? 'var(--color-success)' : 'var(--color-accent)',
          }}>
            +{formatEuro(mainWinner?.amount ?? 0)}
          </span>
        </div>

        {/* Zeile 2: Gewinnerhand + Street rechts */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: handColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {wonWithoutShowdown
              ? (language === 'de' ? 'Alle anderen ausgestiegen' : 'Everyone else folded')
              : describeHand(mainWinner!.hand!, language)}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-tertiary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            {t(`street.${record.finalStreet}` as Parameters<typeof t>[0])}
            <span style={{ color: 'var(--text-faint)' }}>{expanded ? '▲' : '▼'}</span>
          </span>
        </div>

        {/* Zeile 3: eigenes Ergebnis (falls beteiligt) */}
        {me?.holeCards && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingTop: 4, borderTop: '1px dashed var(--border-subtle)' }}>
            <span style={{ fontSize: 8.5, color: 'var(--text-tertiary)', fontWeight: 700 }}>Du:</span>
            <MiniCard card={me.holeCards[0]} />
            <MiniCard card={me.holeCards[1]} />
            <span style={{
              marginLeft: 'auto', fontSize: 10, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              color: myProfit > 0 ? 'var(--color-success)' : myProfit < 0 ? 'var(--color-danger)' : 'var(--text-tertiary)',
            }}>
              {myProfit > 0 ? '+' : ''}{formatEuro(myProfit)}
            </span>
          </div>
        )}
      </button>

      {/* Details — aufgeklappt */}
      {expanded && (
        <div style={{ padding: '0 11px 10px', fontSize: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Board */}
          {record.communityCards.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 8.5, color: 'var(--text-tertiary)', fontWeight: 700 }}>{t('ui.board')}:</span>
              {record.communityCards.map((c, i) => <MiniCard key={i} card={c} />)}
            </div>
          )}

          {/* Spieler */}
          <div style={{ color: 'var(--text-tertiary)', fontSize: 9.5, lineHeight: 1.5 }}>
            {record.players.map(p => (
              <span key={p.id} style={{ marginRight: 8, whiteSpace: 'nowrap' }}>
                {p.name} ({p.position}) {formatEuro(p.startingChips)}
                {p.holeCards && ` [${p.holeCards.map(cardToString).join('')}]`}
              </span>
            ))}
          </div>

          {/* Aktionen */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {record.actions.map((action, i) => {
              const player = record.players.find(p => p.id === action.playerId);
              return (
                <div key={i} style={{ color: 'var(--text-secondary)', fontSize: 9.5 }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{player?.name}</span>{' '}
                  {actionLabels[action.type] || action.type}
                  {action.amount > 0 && ` ${formatEuro(action.amount)}`}
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>{t('ui.pot')}: {formatEuro(totalPot)}</div>
        </div>
      )}
    </div>
  );
};

export const HandHistoryPanel: React.FC = () => {
  const { t } = useTranslation();
  const handHistory = useGameStore(s => s.handHistory);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const reversedHistory = [...handHistory].reverse();

  return (
    <div
      className="w-full rounded-xl flex flex-col overflow-hidden"
      style={{
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--border-subtle)',
        maxHeight: '100%',
      }}
    >
      <div style={{
        padding: '11px 14px', borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h3 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
          📋 {t('ui.history')}
        </h3>
        <span style={{ fontSize: 10, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
          {handHistory.length} {t('ui.hands')}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: reversedHistory.length === 0 ? 0 : 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {reversedHistory.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text-faint)', padding: 20, textAlign: 'center' }}>
            {t('ui.noHandsYet')}
          </div>
        ) : (
          reversedHistory.map(record => (
            <HandEntry
              key={record.handNumber}
              record={record}
              expanded={expandedId === record.handNumber}
              onToggle={() =>
                setExpandedId(expandedId === record.handNumber ? null : record.handNumber)
              }
            />
          ))
        )}
      </div>
    </div>
  );
};
