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
    // 16/11 statt 16/10 + größerer y-Orbit: Board, Pot und Sitze
    // teilen sich sonst auf flachen Ovalen dasselbe vertikale Band.
    // Unter ~1150px Fensterbreite zusätzlich kompakte Karten/Sitze,
    // sonst kollidieren die fixen Pixelgrößen mit dem kleinen Oval.
    const compact = vw < 1150;
    return { tableWidth: '84%', tableMaxWidth: 860, aspectRatio: '16/11', rx: 38, ry: 36, compact };
  }

  if (isPortrait) {
    // Portrait phone — slightly smaller oval so seats have more room around it.
    // rx:36 / ry:34 pulls seats outward without overflowing the 78% wide oval.
    return { tableWidth: '78%', tableMaxWidth: 360, aspectRatio: '1/1', rx: 36, ry: 34, compact: true };
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
