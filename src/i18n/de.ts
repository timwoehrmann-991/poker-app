import { TranslationKey } from './en';

export const de: Record<TranslationKey, string> = {
  // Game setup
  'setup.title': 'No Limit Texas Hold\'em',
  'setup.subtitle': 'Pokerspiel',
  'setup.playerCount': 'Anzahl der Spieler',
  'setup.blinds': 'Blinds',
  'setup.smallBlind': 'Small Blind',
  'setup.bigBlind': 'Big Blind',
  'setup.startingChips': 'Startchips',
  'setup.yourName': 'Dein Name',
  'setup.aiOpponents': 'KI-Gegner',
  'setup.startGame': 'Spiel starten',
  'setup.players': 'Spieler',

  // Actions
  'action.fold': 'Passen',
  'action.check': 'Schieben',
  'action.call': 'Mitgehen',
  'action.bet': 'Setzen',
  'action.raise': 'Erhöhen',
  'action.allIn': 'Alles setzen',

  // Streets
  'street.preflop': 'Preflop',
  'street.flop': 'Flop',
  'street.turn': 'Turn',
  'street.river': 'River',
  'street.showdown': 'Showdown',

  // Positions
  'pos.BTN': 'Button',
  'pos.SB': 'Small Blind',
  'pos.BB': 'Big Blind',
  'pos.UTG': 'Under the Gun',
  'pos.UTG+1': 'UTG+1',
  'pos.UTG+2': 'UTG+2',
  'pos.MP': 'Mittlere Position',
  'pos.MP+1': 'MP+1',
  'pos.HJ': 'Hijack',
  'pos.CO': 'Cutoff',

  // Hand categories
  'hand.royalFlush': 'Royal Flush',
  'hand.straightFlush': 'Straight Flush',
  'hand.fourOfAKind': 'Vierling',
  'hand.fullHouse': 'Full House',
  'hand.flush': 'Flush',
  'hand.straight': 'Straße',
  'hand.threeOfAKind': 'Drilling',
  'hand.twoPair': 'Zwei Paare',
  'hand.onePair': 'Ein Paar',
  'hand.highCard': 'Höchste Karte',

  // Odds panel
  'odds.title': 'Odds-Rechner',
  'odds.winProbability': 'Gewinnwahrscheinlichkeit',
  'odds.outs': 'Outs',
  'odds.potOdds': 'Pot Odds',
  'odds.equity': 'Equity',
  'odds.ev': 'Erwartungswert',
  'odds.calculating': 'Berechne...',

  // UI
  'ui.pot': 'Pot',
  'ui.dealer': 'D',
  'ui.newHand': 'Neue Hand',
  'ui.nextHand': 'Nächste Hand',
  'ui.settings': 'Einstellungen',
  'ui.tutorial': 'Tutorial',
  'ui.stats': 'Statistiken',
  'ui.history': 'Handverlauf',
  'ui.chat': 'Strategie-Chat',
  'ui.training': 'Trainingsmodus',
  'ui.mainMenu': 'Hauptmenü',
  'ui.wins': 'gewinnt',

  // AI Personalities
  'ai.rock': 'Rock (Tight/Passiv)',
  'ai.callingStation': 'Calling Station (Loose/Passiv)',
  'ai.tag': 'TAG (Tight/Aggressiv)',
  'ai.lagManiac': 'Maniac (Loose/Aggressiv)',
  'ai.gtoBalanced': 'GTO (Ausbalanciert)',
  'ai.shortStack': 'Short Stack Spezialist',
  'ai.nit': 'Nit (Ultra-Tight)',

  // Quick bet
  'bet.third': '1/3 Pot',
  'bet.half': '1/2 Pot',
  'bet.twoThirds': '2/3 Pot',
  'bet.pot': 'Pot',

  // Stats
  'stats.handsPlayed': 'Gespielte Hände',
  'stats.winRate': 'Gewinnrate',
  'stats.vpip': 'VPIP',
  'stats.pfr': 'PFR',
  'stats.af': 'Aggressionsfaktor',
  'stats.biggestPot': 'Größter Pot',

  // Settings
  'settings.title': 'Einstellungen',
  'settings.animationSpeed': 'Animationsgeschwindigkeit',
  'settings.slow': 'Langsam',
  'settings.normal': 'Normal',
  'settings.fast': 'Schnell',
  'settings.instant': 'Sofort',
  'settings.sound': 'Sound',
  'settings.language': 'Sprache',
  'settings.theme': 'Farbschema',
  'settings.autoFold': 'Auto-Fold schlechte Hände',
  'settings.beginnerMode': 'Anfänger-Modus (Deutsche Begriffe)',
};
