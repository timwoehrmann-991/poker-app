import { useState, useEffect } from 'react';

export interface TableLayout {
  tableWidth: string;   // CSS value for the table div width
  tableMaxWidth: number;
  aspectRatio: string;  // CSS aspect-ratio value
  rx: number;           // x-orbit radius %
  ry: number;           // y-orbit radius %
  compact: boolean;     // reduce seat sizes
}

function computeLayout(vw: number, vh: number): TableLayout {
  const isMobile  = vw < 640;
  const isPortrait = vh > vw;

  if (!isMobile) {
    return { tableWidth: '84%', tableMaxWidth: 860, aspectRatio: '16/10', rx: 38, ry: 32, compact: false };
  }

  if (isPortrait) {
    // Portrait phone — use a square oval so seats fit vertically
    return { tableWidth: '90%', tableMaxWidth: 420, aspectRatio: '1/1', rx: 28, ry: 28, compact: true };
  }

  // Landscape phone — table must leave ~165 px for the action panel below.
  // Target oval height ≤ 44 dvh  →  width = 44dvh × 1.6
  // min(50%, …) prevents a too-wide oval on larger landscape phones.
  return {
    tableWidth: 'min(50%, calc(44dvh * 1.6))',
    tableMaxWidth: 640,
    aspectRatio: '16/10',
    rx: 26,
    ry: 16,
    compact: true,
  };
}

export function useTableLayout(): TableLayout {
  const [layout, setLayout] = useState<TableLayout>(() =>
    computeLayout(window.innerWidth, window.innerHeight),
  );

  useEffect(() => {
    const handler = () =>
      setLayout(computeLayout(window.innerWidth, window.innerHeight));
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return layout;
}
