import { PlayerStats } from './playerStats';

export interface LeakFinding {
  severity: 'hoch' | 'mittel' | 'info';
  title: string;
  detail: string;
}

/** Mindestanzahl Hände, bevor die Befunde statistisch etwas taugen */
export const MIN_HANDS_FOR_LEAKS = 30;

/**
 * Benennt konkrete Muster im Spielstil — der Kern des Leak-Detektors.
 * Schwellen orientieren sich an solidem 6-max-Cash-Game.
 */
export function detectLeaks(stats: PlayerStats): LeakFinding[] {
  const findings: LeakFinding[] = [];
  const f = (severity: LeakFinding['severity'], title: string, detail: string) =>
    findings.push({ severity, title, detail });

  if (stats.vpip > 35) {
    f('hoch', 'Du spielst zu viele Hände',
      `VPIP ${stats.vpip.toFixed(0)} % — solide Spieler liegen bei 20–28 %. Schwache Starthände kosten dich langfristig am meisten.`);
  } else if (stats.vpip < 12 && stats.handsPlayed >= 40) {
    f('mittel', 'Du spielst sehr wenige Hände',
      `VPIP ${stats.vpip.toFixed(0)} % — so verpasst du profitable Spots und wirst leicht ausrechenbar.`);
  }

  if (stats.vpip > 15 && stats.pfr / Math.max(stats.vpip, 1) < 0.4) {
    f('hoch', 'Du callst statt zu erhöhen',
      `PFR ${stats.pfr.toFixed(0)} % bei VPIP ${stats.vpip.toFixed(0)} % — gespielte Hände solltest du meist selbst eröffnen. Limpen verschenkt Initiative.`);
  }

  if (stats.foldToRaisePreflop > 75) {
    f('mittel', 'Du gibst Preflop-Raises zu schnell nach',
      `${stats.foldToRaisePreflop.toFixed(0)} % Fold auf Erhöhungen — aufmerksame Gegner drücken dich mit Raises aus jedem Pot.`);
  }

  if (stats.foldToBetPostflop > 70) {
    f('hoch', 'Du gibst nach dem Flop zu schnell auf',
      `${stats.foldToBetPostflop.toFixed(0)} % Fold auf Bets — jede Continuation Bet gegen dich ist automatisch profitabel.`);
  } else if (stats.foldToBetPostflop < 25 && stats.handsPlayed >= 40) {
    f('hoch', 'Du callst fast jede Bet',
      `Nur ${stats.foldToBetPostflop.toFixed(0)} % Fold auf Bets — gegen Value-Bets wird das teuer. Frage dich: Welche schlechtere Hand bezahlt mich hier?`);
  }

  if (stats.aggressionFactor < 1 && stats.handsPlayed >= 40) {
    f('mittel', 'Zu passiv nach dem Flop',
      `Aggressionsfaktor ${stats.aggressionFactor.toFixed(1)} — du callst öfter als du setzt. Aggression gewinnt Pötte, die niemandem gehören.`);
  }

  if (stats.wtsd > 45 && stats.showdowns >= 10) {
    f('mittel', 'Du gehst zu oft bis zum Showdown',
      `WTSD ${stats.wtsd.toFixed(0)} % — mittelmäßige Hände bis zum River zu bezahlen ist ein klassisches Leak.`);
  }

  return findings;
}
