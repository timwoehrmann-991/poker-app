import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { HandRecord, ActionType } from '../../engine/types';
import { cardToString } from '../../engine/deck/Card';
import { useTranslation } from '../../i18n';
import { describeHand } from '../../i18n/handDescription';
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

const HandEntry: React.FC<{ record: HandRecord; expanded: boolean; onToggle: () => void }> = ({
  record, expanded, onToggle,
}) => {
  const { t, language } = useTranslation();
  const winner = record.winners[0];
  const winnerPlayer = record.players.find(p => p.id === winner?.playerId);
  const totalPot = record.pots.reduce((s, p) => s + p.amount, 0);
  const actionLabels = ACTION_LABELS[language];

  return (
    <div className="border-b border-[color:var(--border-subtle)]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-2 py-1.5 transition-colors text-left"
        style={{ background: expanded ? 'var(--surface-inset)' : 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <div>
          <span className="text-[10px] text-[color:var(--text-tertiary)]">#{record.handNumber}</span>
          <span className="text-xs text-[color:var(--text-primary)] ml-2">
            {winnerPlayer?.name || '?'} {t('ui.wins')} €{winner?.amount || 0}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[color:var(--text-tertiary)]">
            {t(`street.${record.finalStreet}` as Parameters<typeof t>[0])}
          </span>
          <span className="text-[color:var(--text-tertiary)]">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-2 text-[10px] space-y-1">
          {/* Players */}
          <div className="text-[color:var(--text-tertiary)] mb-1">
            {record.players.map(p => (
              <span key={p.id} className="mr-2">
                {p.name} ({p.position}) €{p.startingChips}
                {p.holeCards && ` [${p.holeCards.map(cardToString).join('')}]`}
              </span>
            ))}
          </div>

          {/* Board */}
          {record.communityCards.length > 0 && (
            <div className="text-[color:var(--color-accent)] font-mono">
              {t('ui.board')}: {record.communityCards.map(cardToString).join(' ')}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-0.5">
            {record.actions.map((action, i) => {
              const player = record.players.find(p => p.id === action.playerId);
              return (
                <div key={i} className="text-[color:var(--text-secondary)]">
                  <span className="text-[color:var(--text-tertiary)]">{player?.name}</span>{' '}
                  {actionLabels[action.type] || action.type}
                  {action.amount > 0 && ` €${action.amount}`}
                </div>
              );
            })}
          </div>

          {/* Result */}
          {record.winners.map((w, i) => {
            const p = record.players.find(pl => pl.id === w.playerId);
            return (
              <div key={i} className="text-[color:var(--color-success)] font-medium">
                {p?.name} {t('ui.wins')} €{w.amount}
                {w.hand && ` (${describeHand(w.hand, language)})`}
              </div>
            );
          })}

          <div className="text-[color:var(--text-faint)]">{t('ui.pot')}: €{totalPot}</div>
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
      className="w-72 rounded-xl flex flex-col overflow-hidden"
      style={{
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--border-subtle)',
        maxHeight: '100%',
      }}
    >
      <div className="px-3 py-2 border-b border-[color:var(--border-subtle)] flex justify-between items-center">
        <h3 className="text-xs font-bold text-[color:var(--text-secondary)] uppercase tracking-wider">
          {t('ui.history')}
        </h3>
        <span className="text-[10px] text-[color:var(--text-faint)]">{handHistory.length} {t('ui.hands')}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {reversedHistory.length === 0 ? (
          <div className="text-xs text-[color:var(--text-faint)] p-3 text-center">
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
