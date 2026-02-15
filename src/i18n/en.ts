export const en = {
  // Game setup
  'setup.title': 'No Limit Texas Hold\'em',
  'setup.subtitle': 'Poker Game',
  'setup.playerCount': 'Number of Players',
  'setup.blinds': 'Blinds',
  'setup.smallBlind': 'Small Blind',
  'setup.bigBlind': 'Big Blind',
  'setup.startingChips': 'Starting Chips',
  'setup.yourName': 'Your Name',
  'setup.aiOpponents': 'AI Opponents',
  'setup.startGame': 'Start Game',
  'setup.players': 'Players',

  // Actions
  'action.fold': 'Fold',
  'action.check': 'Check',
  'action.call': 'Call',
  'action.bet': 'Bet',
  'action.raise': 'Raise',
  'action.allIn': 'All-In',

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
  'pos.MP': 'Middle Position',
  'pos.MP+1': 'MP+1',
  'pos.HJ': 'Hijack',
  'pos.CO': 'Cutoff',

  // Hand categories
  'hand.royalFlush': 'Royal Flush',
  'hand.straightFlush': 'Straight Flush',
  'hand.fourOfAKind': 'Four of a Kind',
  'hand.fullHouse': 'Full House',
  'hand.flush': 'Flush',
  'hand.straight': 'Straight',
  'hand.threeOfAKind': 'Three of a Kind',
  'hand.twoPair': 'Two Pair',
  'hand.onePair': 'One Pair',
  'hand.highCard': 'High Card',

  // Odds panel
  'odds.title': 'Odds Calculator',
  'odds.winProbability': 'Win Probability',
  'odds.outs': 'Outs',
  'odds.potOdds': 'Pot Odds',
  'odds.equity': 'Equity',
  'odds.ev': 'Expected Value',
  'odds.calculating': 'Calculating...',

  // UI
  'ui.pot': 'Pot',
  'ui.dealer': 'D',
  'ui.newHand': 'New Hand',
  'ui.nextHand': 'Next Hand',
  'ui.settings': 'Settings',
  'ui.tutorial': 'Tutorial',
  'ui.stats': 'Statistics',
  'ui.history': 'Hand History',
  'ui.chat': 'Strategy Chat',
  'ui.training': 'Training Mode',
  'ui.mainMenu': 'Main Menu',
  'ui.wins': 'wins',

  // AI Personalities
  'ai.rock': 'Rock (Tight/Passive)',
  'ai.callingStation': 'Calling Station (Loose/Passive)',
  'ai.tag': 'TAG (Tight/Aggressive)',
  'ai.lagManiac': 'Maniac (Loose/Aggressive)',
  'ai.gtoBalanced': 'GTO (Balanced)',
  'ai.shortStack': 'Short Stack Specialist',
  'ai.nit': 'Nit (Ultra-Tight)',

  // Quick bet
  'bet.third': '1/3 Pot',
  'bet.half': '1/2 Pot',
  'bet.twoThirds': '2/3 Pot',
  'bet.pot': 'Pot',

  // Stats
  'stats.handsPlayed': 'Hands Played',
  'stats.winRate': 'Win Rate',
  'stats.vpip': 'VPIP',
  'stats.pfr': 'PFR',
  'stats.af': 'Aggression Factor',
  'stats.biggestPot': 'Biggest Pot',

  // Settings
  'settings.title': 'Settings',
  'settings.animationSpeed': 'Animation Speed',
  'settings.slow': 'Slow',
  'settings.normal': 'Normal',
  'settings.fast': 'Fast',
  'settings.instant': 'Instant',
  'settings.sound': 'Sound',
  'settings.language': 'Language',
  'settings.theme': 'Color Theme',
  'settings.autoFold': 'Auto-Fold Junk Hands',
  'settings.beginnerMode': 'Beginner Mode (German Terms)',
} as const;

export type TranslationKey = keyof typeof en;
