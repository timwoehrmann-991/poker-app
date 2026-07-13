import { useEffect, useRef } from 'react';
import { useBlackjackStore } from '../store/blackjackStore';
import { useSettingsStore } from '../store/settingsStore';
import { soundEngine } from '../sound/soundEngine';

/**
 * Beschallt den Blackjack-Tisch mit der gemeinsamen Sound-Engine:
 * Karten-Snap pro ausgeteilter Karte, Chip-Klackern bei Einsätzen und
 * Auszahlungen, Fanfare bei Gewinn/Blackjack, Mischen beim neuen Schlitten.
 */
export function useBlackjackSounds(): void {
  const soundEnabled = useSettingsStore(s => s.soundEnabled);
  const soundVolume = useSettingsStore(s => s.soundVolume);
  const state = useBlackjackStore(s => s.state);
  const dealtSteps = useBlackjackStore(s => s.dealtSteps);
  const chipFlights = useBlackjackStore(s => s.chipFlights);
  const holeFlips = useBlackjackStore(s => s.holeFlips);

  useEffect(() => {
    soundEngine.setVolume(soundVolume);
  }, [soundVolume]);

  // Karten-Snap: beim sequenziellen Austeilen pro Schritt …
  const prevStepRef = useRef<number | null>(null);
  useEffect(() => {
    if (soundEnabled && dealtSteps !== null && dealtSteps > 0 && dealtSteps !== prevStepRef.current) {
      soundEngine.playCardDeal();
    }
    prevStepRef.current = dealtSteps;
  }, [dealtSteps, soundEnabled]);

  // … und bei jeder später gezogenen Karte (Hit/Double/Dealer)
  const totalCards = state
    ? state.dealerCards.length + state.seats.reduce((sum, s) => sum + s.hands.reduce((h, hand) => h + hand.cards.length, 0), 0)
    : 0;
  const prevCardsRef = useRef(0);
  useEffect(() => {
    if (soundEnabled && dealtSteps === null && totalCards > prevCardsRef.current && prevCardsRef.current > 0) {
      soundEngine.playCardDeal();
    }
    prevCardsRef.current = totalCards;
  }, [totalCards, dealtSteps, soundEnabled]);

  // Hole-Card-Flip
  const prevFlipsRef = useRef(0);
  useEffect(() => {
    if (soundEnabled && holeFlips > prevFlipsRef.current && prevFlipsRef.current >= 0 && holeFlips > 0) {
      soundEngine.playCardFlip();
    }
    prevFlipsRef.current = holeFlips;
  }, [holeFlips, soundEnabled]);

  // Chips fliegen (Payout/Einzug) → Klackern; Human-Gewinn → Fanfare
  const prevFlightsRef = useRef(false);
  useEffect(() => {
    const hasFlights = !!chipFlights && chipFlights.length > 0;
    if (soundEnabled && hasFlights && !prevFlightsRef.current) {
      soundEngine.playChipClink();
      const humanIndex = state?.seats.findIndex(s => s.isHuman) ?? -1;
      const humanWin = chipFlights!.some(f => f.seatIndex === humanIndex && !f.toDealer);
      if (humanWin) setTimeout(() => soundEngine.playWin(), 350);
    }
    prevFlightsRef.current = hasFlights;
  }, [chipFlights, soundEnabled, state]);

  // Neuer Schlitten → Mischen
  const prevShoeRef = useRef<number | null>(null);
  useEffect(() => {
    const shoe = state?.shoeRemaining ?? null;
    if (soundEnabled && shoe !== null && prevShoeRef.current !== null && shoe > prevShoeRef.current + 30) {
      soundEngine.playShuffle();
    }
    prevShoeRef.current = shoe;
  }, [state?.shoeRemaining, soundEnabled]);
}
