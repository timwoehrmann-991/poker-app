import { useState, useEffect } from 'react';

/** true unter 640px Viewport-Breite (gemeinsam für alle Screens) */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}
