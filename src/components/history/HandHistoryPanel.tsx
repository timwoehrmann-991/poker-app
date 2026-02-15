import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { HandRecord, ActionType, Street } from '../../engine/types';
import { cardToString } from '../../engine/deck/Card';

const ACTION_SYMBOLS: Record<string, string> = {
  [ActionType.Fold]: '❌ Fold',
  [ActionType.Check]: '✅ Check',
  [ActionType.Call]: '📞 Call',
  [ActionType.Bet]: '💰 Bet',
  [ActionType.Raise]: '⬆️ Raise',
  [ActionType.AllIn]: '🔥 All-In',
  [ActionType.PostSmallBlind]: 'SB',
  [ActionType.PostBigBlind]: 'BB',
};

const HandEntry: React.FC<{ record: HandRecord; expanded: boolean; onToggle: () => void }> = ({
  record, expanded, onToggle,
}) => {
  const winner = record.winners[0];
  const winnerPlayer = record.players.find(p => p.id === winner?.playerId);
  const totalPot = record.pots.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="border-b border-white/5">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-white/5 transition-colors text-left"
      >
        <div>
          <span className="text-[10px] text-gray-500">#{record.handNumber}</span>
          <span className="text-xs text-white ml-2">
            {winnerPlayer?.name || '?'} gewinnt €{winner?.amount || 0}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500">{record.finalStreet}</span>
          <span className="text-gray-500">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-2 text-[10px] space-y-1">
          {/* Players */}
          <div className="text-gray-500 mb-1">
            {record.players.map(p => (
              <span key={p.id} className="mr-2">
                {p.name} ({p.position}) €{p.startingChips}
                {p.holeCards && ` [${p.holeCards.map(cardToString).join('')}]`}
              </span>
            ))}
          </div>

          {/* Board */}
          {record.communityCards.length > 0 && (
            <div className="text-yellow-400 font-mono">
              Board: {record.communityCards.map(cardToString).join(' ')}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-0.5">
            {record.actions.map((action, i) => {
              const player = record.players.find(p => p.id === action.playerId);
              return (
                <div key={i} className="text-gray-400">
                  <span className="text-gray-500">{player?.name}</span>{' '}
                  {ACTION_SYMBOLS[action.type] || action.type}
                  {action.amount > 0 && ` €${action.amount}`}
                </div>
              );
            })}
          </div>

          {/* Result */}
          {record.winners.map((w, i) => {
            const p = record.players.find(pl => pl.id === w.playerId);
            return (
              <div key={i} className="text-green-400 font-medium">
                {p?.name} gewinnt €{w.amount}
                {w.hand && ` (${w.hand.description})`}
              </div>
            );
          })}

          <div className="text-gray-600">Pot: €{totalPot}</div>
        </div>
      )}
    </div>
  );
};

export const HandHistoryPanel: React.FC = () => {
  const handHistory = useGameStore(s => s.handHistory);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const reversedHistory = [...handHistory].reverse();

  return (
    <div
      className="w-72 rounded-xl flex flex-col overflow-hidden"
      style={{
        background: 'var(--color-bg-panel)',
        border: '1px solid rgba(255,255,255,0.1)',
        maxHeight: '100%',
      }}
    >
      <div className="px-3 py-2 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Hand History
        </h3>
        <span className="text-[10px] text-gray-600">{handHistory.length} Hände</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {reversedHistory.length === 0 ? (
          <div className="text-xs text-gray-600 p-3 text-center">
            Noch keine Hände gespielt
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
