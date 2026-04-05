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
  const canBetOrRaise = legalActions.canBet || legalActions.canRaise;
  const minAmount     = legalActions.canBet ? legalActions.minBet : legalActions.minRaise;
  const maxAmount     = legalActions.canBet ? legalActions.maxBet : legalActions.maxRaise;
  const [raiseAmount, setRaiseAmount] = useState(minAmount || 0);

  React.useEffect(() => {
    if (minAmount > 0) setRaiseAmount(minAmount);
  }, [minAmount]);

  const setQuickBet = (fraction: number) => {
    const amount = Math.max(minAmount, Math.min(Math.floor(potSize * fraction), maxAmount));
    setRaiseAmount(amount);
  };

  const handleBet = useCallback(() => {
    if (legalActions.canBet) onAction(ActionType.Bet, raiseAmount);
    else if (legalActions.canRaise) onAction(ActionType.Raise, raiseAmount);
  }, [onAction, legalActions, raiseAmount]);

  return (
    <div style={{
      background: 'rgba(10,10,18,0.82)',
      backdropFilter: 'blur(32px)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 18,
      padding: '14px 16px',
      width: '100%',
      boxShadow: '0 -4px 40px rgba(0,0,0,0.5)',
    }}>
      {/* Raise controls */}
      {canBetOrRaise && (
        <>
          {/* Quick-bet buttons */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, justifyContent: 'center' }}>
            {[
              { label: t('bet.third'),     frac: 1/3 },
              { label: t('bet.half'),      frac: 1/2 },
              { label: t('bet.twoThirds'), frac: 2/3 },
              { label: t('bet.pot'),       frac: 1 },
            ].map(({ label, frac }) => (
              <button
                key={label}
                onClick={() => setQuickBet(frac)}
                style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.55)', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', minWidth: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              €{minAmount}
            </span>
            <input
              type="range" min={minAmount} max={maxAmount} value={raiseAmount}
              onChange={e => setRaiseAmount(Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--color-accent)', height: 4 }}
            />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', minWidth: 32, fontVariantNumeric: 'tabular-nums' }}>
              €{maxAmount}
            </span>
          </div>
        </>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        {/* Fold */}
        {legalActions.canFold && (
          <ActionBtn
            onClick={() => onAction(ActionType.Fold)}
            label={t('action.fold')}
            hotkey="F"
            style={{
              background: 'rgba(255,69,58,0.12)',
              border: '1.5px solid rgba(255,69,58,0.35)',
              color: '#ff6b62',
            }}
            hoverStyle={{ background: 'rgba(255,69,58,0.22)', borderColor: 'rgba(255,69,58,0.6)' }}
          />
        )}

        {/* Check */}
        {legalActions.canCheck && (
          <ActionBtn
            onClick={() => onAction(ActionType.Check)}
            label={t('action.check')}
            hotkey="C"
            style={{
              background: 'linear-gradient(135deg, rgba(48,209,88,0.15), rgba(48,209,88,0.08))',
              border: '1.5px solid rgba(48,209,88,0.4)',
              color: '#4cde84',
              boxShadow: '0 2px 12px rgba(48,209,88,0.1)',
            }}
            hoverStyle={{ background: 'rgba(48,209,88,0.25)', borderColor: 'rgba(48,209,88,0.7)' }}
          />
        )}

        {/* Call */}
        {legalActions.canCall && (
          <ActionBtn
            onClick={() => onAction(ActionType.Call)}
            label={`${t('action.call')} €${legalActions.callAmount}`}
            hotkey="C"
            style={{
              background: 'linear-gradient(135deg, #0a5fa8, #0a84ff)',
              border: '1.5px solid rgba(10,132,255,0.5)',
              color: '#fff',
              boxShadow: '0 2px 14px rgba(10,132,255,0.2)',
            }}
            hoverStyle={{ boxShadow: '0 4px 20px rgba(10,132,255,0.35)' }}
          />
        )}

        {/* Bet / Raise */}
        {canBetOrRaise && (
          <ActionBtn
            onClick={handleBet}
            label={`${legalActions.canBet ? t('action.bet') : t('action.raise')} €${raiseAmount}`}
            hotkey="R"
            style={{
              background: 'linear-gradient(135deg, #8b6514, #c9a227)',
              border: '1.5px solid rgba(212,166,52,0.5)',
              color: '#fff',
              boxShadow: '0 2px 14px rgba(212,166,52,0.2)',
            }}
            hoverStyle={{ boxShadow: '0 4px 20px rgba(212,166,52,0.35)' }}
          />
        )}

        {/* All-In */}
        {playerChips > 0 && (
          <ActionBtn
            onClick={() => onAction(ActionType.AllIn)}
            label={`${t('action.allIn')} €${playerChips}`}
            hotkey="A"
            style={{
              background: 'linear-gradient(135deg, #6e1fa0, #9b38d4)',
              border: '1.5px solid rgba(191,90,242,0.5)',
              color: '#fff',
              boxShadow: '0 2px 14px rgba(191,90,242,0.2)',
            }}
            hoverStyle={{ boxShadow: '0 4px 20px rgba(191,90,242,0.4)' }}
          />
        )}
      </div>

      {/* Hotkey hint */}
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em' }}>
        F · C · R · A
      </div>
    </div>
  );
});

ActionPanel.displayName = 'ActionPanel';

interface ActionBtnProps {
  onClick: () => void;
  label: string;
  hotkey: string;
  style: React.CSSProperties;
  hoverStyle: React.CSSProperties;
}

const ActionBtn: React.FC<ActionBtnProps> = ({ onClick, label, hotkey, style, hoverStyle }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, padding: '10px 8px', borderRadius: 11,
        fontWeight: 700, fontSize: 12, cursor: 'pointer',
        transition: 'all 0.18s ease',
        transform: hovered ? 'translateY(-1px) scale(1.02)' : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        ...style,
        ...(hovered ? hoverStyle : {}),
      }}
    >
      <span style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{label}</span>
      <span style={{ fontSize: 8, opacity: 0.4, fontWeight: 600 }}>[{hotkey}]</span>
    </button>
  );
};
