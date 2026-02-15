import React, { useState, useCallback } from 'react';
import { LegalActions, ActionType } from '../../engine/types';
import { useTranslation } from '../../i18n';

interface ActionPanelProps {
  legalActions: LegalActions;
  onAction: (action: ActionType, amount?: number) => void;
  potSize: number;
  playerChips: number;
}

export const ActionPanel: React.FC<ActionPanelProps> = React.memo(({
  legalActions, onAction, potSize, playerChips,
}) => {
  const { t } = useTranslation();
  const [raiseAmount, setRaiseAmount] = useState(legalActions.minRaise || legalActions.minBet || 0);

  const handleFold = useCallback(() => onAction(ActionType.Fold), [onAction]);
  const handleCheck = useCallback(() => onAction(ActionType.Check), [onAction]);
  const handleCall = useCallback(() => onAction(ActionType.Call), [onAction]);
  const handleBet = useCallback(() => {
    if (legalActions.canBet) {
      onAction(ActionType.Bet, raiseAmount);
    } else if (legalActions.canRaise) {
      onAction(ActionType.Raise, raiseAmount);
    }
  }, [onAction, legalActions, raiseAmount]);
  const handleAllIn = useCallback(() => onAction(ActionType.AllIn), [onAction]);

  const canBetOrRaise = legalActions.canBet || legalActions.canRaise;
  const minAmount = legalActions.canBet ? legalActions.minBet : legalActions.minRaise;
  const maxAmount = legalActions.canBet ? legalActions.maxBet : legalActions.maxRaise;

  const setQuickBet = (fraction: number) => {
    const amount = Math.max(minAmount, Math.min(Math.floor(potSize * fraction), maxAmount));
    setRaiseAmount(amount);
  };

  // Update raise amount when legal actions change
  React.useEffect(() => {
    const min = legalActions.canBet ? legalActions.minBet : legalActions.minRaise;
    if (min > 0) setRaiseAmount(min);
  }, [legalActions]);

  return (
    <div className="flex flex-col gap-2 items-center p-3 rounded-xl" style={{ background: 'var(--color-bg-panel)' }}>
      {/* Quick bet buttons */}
      {canBetOrRaise && (
        <div className="flex gap-1.5 mb-1">
          {[
            { label: t('bet.third'), fraction: 1/3 },
            { label: t('bet.half'), fraction: 1/2 },
            { label: t('bet.twoThirds'), fraction: 2/3 },
            { label: t('bet.pot'), fraction: 1 },
          ].map(({ label, fraction }) => (
            <button
              key={label}
              onClick={() => setQuickBet(fraction)}
              className="px-2 py-1 text-[10px] rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Raise slider */}
      {canBetOrRaise && (
        <div className="w-full flex items-center gap-2 px-1">
          <span className="text-xs text-gray-400 w-12 text-right">€{minAmount}</span>
          <input
            type="range"
            min={minAmount}
            max={maxAmount}
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(Number(e.target.value))}
            className="flex-1 accent-yellow-500 h-2"
          />
          <span className="text-xs text-gray-400 w-12">€{maxAmount}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 items-center">
        {/* Fold */}
        {legalActions.canFold && (
          <button
            onClick={handleFold}
            className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #c0392b, #e74c3c)',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(231, 76, 60, 0.3)',
            }}
          >
            {t('action.fold')}
          </button>
        )}

        {/* Check */}
        {legalActions.canCheck && (
          <button
            onClick={handleCheck}
            className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(46, 204, 113, 0.3)',
            }}
          >
            {t('action.check')}
          </button>
        )}

        {/* Call */}
        {legalActions.canCall && (
          <button
            onClick={handleCall}
            className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #2980b9, #3498db)',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(52, 152, 219, 0.3)',
            }}
          >
            {t('action.call')} €{legalActions.callAmount}
          </button>
        )}

        {/* Bet/Raise */}
        {canBetOrRaise && (
          <button
            onClick={handleBet}
            className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #d4a634, #e6b83e)',
              color: '#000',
              boxShadow: '0 2px 8px rgba(212, 166, 52, 0.3)',
            }}
          >
            {legalActions.canBet ? t('action.bet') : t('action.raise')} €{raiseAmount}
          </button>
        )}

        {/* All-In */}
        {playerChips > 0 && (
          <button
            onClick={handleAllIn}
            className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #8e44ad, #9b59b6)',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(155, 89, 182, 0.3)',
            }}
          >
            {t('action.allIn')} €{playerChips}
          </button>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="text-[9px] text-gray-600 mt-0.5">
        F=Fold  C=Check/Call  R=Raise  A=All-In
      </div>
    </div>
  );
});

ActionPanel.displayName = 'ActionPanel';
