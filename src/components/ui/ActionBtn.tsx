import React from 'react';

interface ActionBtnProps {
  onClick: () => void;
  label: string;
  hotkey?: string;
  disabled?: boolean;
  style: React.CSSProperties;
  hoverStyle?: React.CSSProperties;
}

/**
 * Gemeinsamer Aktions-Button für Poker UND Blackjack —
 * eine Interaktionssprache: Hover-Lift, Hotkey-Hinweis, Disabled-Zustand.
 */
export const ActionBtn: React.FC<ActionBtnProps> = ({ onClick, label, hotkey, disabled = false, style, hoverStyle }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, minWidth: 130, padding: '10px 8px', borderRadius: 11,
        fontWeight: 700, fontSize: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        transition: 'all 0.18s ease',
        transform: hovered && !disabled ? 'translateY(-1px) scale(1.02)' : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        border: 'none',
        ...style,
        ...(hovered && !disabled ? hoverStyle : {}),
      }}
    >
      <span style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{label}</span>
      {hotkey && <span style={{ fontSize: 8, opacity: 0.4, fontWeight: 600 }}>[{hotkey}]</span>}
    </button>
  );
};
