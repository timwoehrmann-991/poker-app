import React from 'react';

/** Klassische Casino-Stückelung mit Standardfarben */
const DENOMINATIONS = [
  { value: 500, color: '#7d3bad', light: '#9b59d0', label: '500' },
  { value: 100, color: '#26262e', light: '#4a4a56', label: '100' },
  { value: 25,  color: '#1e8c4a', light: '#2eb066', label: '25' },
  { value: 5,   color: '#c93a3a', light: '#e05656', label: '5' },
  { value: 1,   color: '#e8e6dc', light: '#faf9f2', label: '1' },
] as const;

interface ChipGroup {
  value: number;
  color: string;
  light: string;
  count: number;
}

function amountToChips(amount: number): ChipGroup[] {
  const groups: ChipGroup[] = [];
  let rest = Math.max(0, Math.floor(amount));
  for (const d of DENOMINATIONS) {
    const count = Math.floor(rest / d.value);
    if (count > 0) {
      groups.push({ value: d.value, color: d.color, light: d.light, count });
      rest -= count * d.value;
    }
  }
  return groups;
}

const Chip: React.FC<{ color: string; light: string; size: number; offset: number }> = ({ color, light, size, offset }) => (
  <div style={{
    position: 'absolute',
    bottom: offset,
    left: 0,
    width: size,
    height: size,
    borderRadius: '50%',
    background: `radial-gradient(circle at 50% 38%, ${light} 0%, ${color} 65%)`,
    border: `${Math.max(1.5, size * 0.12)}px dashed rgba(255,255,255,0.85)`,
    boxShadow: `inset 0 0 0 ${Math.max(1, size * 0.08)}px ${color}, 0 1px 2px rgba(0,0,0,0.4)`,
    boxSizing: 'border-box',
  }} />
);

interface ChipStackProps {
  amount: number;
  /** Chip-Durchmesser in px */
  size?: number;
  /** Betrag daneben anzeigen */
  showAmount?: boolean;
}

/**
 * Stellt einen Geldbetrag als Casino-Chip-Stapel dar — pro Stückelung
 * ein Stapel, wie am echten Tisch. Max. 5 Chips pro Stapel sichtbar.
 */
export const ChipStack: React.FC<ChipStackProps> = React.memo(({ amount, size = 14, showAmount = true }) => {
  const groups = amountToChips(amount);
  if (amount <= 0 || groups.length === 0) return null;

  const stackGap = Math.round(size * 0.28);
  const shown = groups.slice(0, 4); // max. 4 Stapel, sonst wird es unruhig

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: Math.round(size * 0.45) }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: Math.round(size * 0.3) }}>
        {shown.map(g => {
          const visible = Math.min(g.count, 5);
          const stackHeight = size + (visible - 1) * stackGap;
          return (
            <div key={g.value} style={{ position: 'relative', width: size, height: stackHeight, flexShrink: 0 }}>
              {Array.from({ length: visible }, (_, i) => (
                <Chip key={i} color={g.color} light={g.light} size={size} offset={i * stackGap} />
              ))}
              {g.count > 5 && (
                <div style={{
                  position: 'absolute', top: -Math.round(size * 0.75), left: '50%', transform: 'translateX(-50%)',
                  fontSize: Math.max(7, size * 0.55), fontWeight: 800, color: 'var(--text-secondary)',
                  fontVariantNumeric: 'tabular-nums', lineHeight: 1, whiteSpace: 'nowrap',
                }}>
                  ×{g.count}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showAmount && (
        <span style={{
          fontSize: Math.max(9, size * 0.8), fontWeight: 800, lineHeight: 1.1,
          color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums',
          textShadow: '0 1px 2px rgba(0,0,0,0.25)',
        }}>
          €{amount.toLocaleString()}
        </span>
      )}
    </div>
  );
});

ChipStack.displayName = 'ChipStack';

/** Einzelner Mini-Chip als Symbol (z.B. vor dem Stack-Betrag) */
export const ChipIcon: React.FC<{ size?: number }> = ({ size = 10 }) => (
  <span style={{
    display: 'inline-block', width: size, height: size, borderRadius: '50%',
    background: 'radial-gradient(circle at 50% 38%, #e05656 0%, #c93a3a 65%)',
    border: '1.5px dashed rgba(255,255,255,0.85)',
    boxSizing: 'border-box', verticalAlign: 'middle',
  }} />
);
