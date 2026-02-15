export enum Suit {
  Clubs = 'c',
  Diamonds = 'd',
  Hearts = 'h',
  Spades = 's',
}

export enum Rank {
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
  Ten = 10,
  Jack = 11,
  Queen = 12,
  King = 13,
  Ace = 14,
}

export const RANK_NAMES: Record<Rank, string> = {
  [Rank.Two]: '2',
  [Rank.Three]: '3',
  [Rank.Four]: '4',
  [Rank.Five]: '5',
  [Rank.Six]: '6',
  [Rank.Seven]: '7',
  [Rank.Eight]: '8',
  [Rank.Nine]: '9',
  [Rank.Ten]: 'T',
  [Rank.Jack]: 'J',
  [Rank.Queen]: 'Q',
  [Rank.King]: 'K',
  [Rank.Ace]: 'A',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  [Suit.Clubs]: '♣',
  [Suit.Diamonds]: '♦',
  [Suit.Hearts]: '♥',
  [Suit.Spades]: '♠',
};

export interface Card {
  rank: Rank;
  suit: Suit;
  id: number; // 0-51 unique encoding
}

export enum HandCategory {
  HighCard = 0,
  OnePair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
  RoyalFlush = 9,
}

export interface EvaluatedHand {
  category: HandCategory;
  value: number; // Absolute comparable rank (higher = better)
  bestCards: Card[];
  description: string;
}

export type PlayerId = string;

export enum PlayerStatus {
  Active = 'active',
  Folded = 'folded',
  AllIn = 'allIn',
  SittingOut = 'sittingOut',
  Eliminated = 'eliminated',
}

export interface Player {
  id: PlayerId;
  name: string;
  chips: number;
  holeCards: [Card, Card] | null;
  status: PlayerStatus;
  seatIndex: number;
  isHuman: boolean;
  aiPersonality?: AIPersonalityType;
  avatarUrl?: string;
  currentBet: number;
  totalInvested: number;
}

export enum Position {
  SmallBlind = 'SB',
  BigBlind = 'BB',
  UnderTheGun = 'UTG',
  UTGPlus1 = 'UTG+1',
  UTGPlus2 = 'UTG+2',
  MiddlePosition = 'MP',
  MiddlePosition2 = 'MP+1',
  Hijack = 'HJ',
  Cutoff = 'CO',
  Button = 'BTN',
}

export enum ActionType {
  Fold = 'fold',
  Check = 'check',
  Call = 'call',
  Bet = 'bet',
  Raise = 'raise',
  AllIn = 'allIn',
  PostSmallBlind = 'postSB',
  PostBigBlind = 'postBB',
}

export interface PlayerAction {
  playerId: PlayerId;
  type: ActionType;
  amount: number;
  timestamp: number;
}

export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canBet: boolean;
  minBet: number;
  maxBet: number;
  canRaise: boolean;
  minRaise: number;
  maxRaise: number;
}

export interface Pot {
  amount: number;
  eligiblePlayerIds: PlayerId[];
  isMainPot: boolean;
}

export enum Street {
  Preflop = 'preflop',
  Flop = 'flop',
  Turn = 'turn',
  River = 'river',
  Showdown = 'showdown',
}

export interface GameConfig {
  playerCount: number;
  smallBlind: number;
  bigBlind: number;
  startingChips: number;
  decisionTimeSeconds: number;
  ante: number;
}

export interface WinnerResult {
  playerId: PlayerId;
  potIndex: number;
  amount: number;
  hand: EvaluatedHand | null;
}

export interface GameState {
  handNumber: number;
  street: Street;
  players: Player[];
  communityCards: Card[];
  pots: Pot[];
  dealerSeatIndex: number;
  activePlayerIndex: number | null;
  config: GameConfig;
  actionHistory: PlayerAction[];
  isHandInProgress: boolean;
  winners: WinnerResult[] | null;
}

export interface HandRecord {
  handNumber: number;
  timestamp: number;
  config: GameConfig;
  players: Array<{
    id: PlayerId;
    name: string;
    seatIndex: number;
    startingChips: number;
    holeCards: [Card, Card] | null;
    position: Position;
  }>;
  communityCards: Card[];
  actions: PlayerAction[];
  pots: Pot[];
  winners: WinnerResult[];
  finalStreet: Street;
}

export enum AIPersonalityType {
  Rock = 'rock',
  CallingStation = 'callingStation',
  TAG = 'tag',
  LAGManiac = 'lagManiac',
  GTOBalanced = 'gtoBalanced',
  ShortStack = 'shortStack',
  Nit = 'nit',
}

export interface BoardTexture {
  wetness: number;
  connectedness: number;
  highCardPresence: number;
  isPaired: boolean;
  isMonotone: boolean;
  isTwoTone: boolean;
  possibleStraightDraws: number;
  possibleFlushDraws: number;
}

export interface OpponentProfile {
  playerId: PlayerId;
  vpip: number;
  pfr: number;
  aggressionFactor: number;
  foldToThreeBet: number;
  cbet: number;
  handsObserved: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  playerCount: 6,
  smallBlind: 1,
  bigBlind: 2,
  startingChips: 200,
  decisionTimeSeconds: 30,
  ante: 0,
};
