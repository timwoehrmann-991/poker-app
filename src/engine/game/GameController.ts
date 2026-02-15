import {
  GameState, GameConfig, Player, PlayerStatus, Card, Street,
  ActionType, PlayerAction, PlayerId, Pot, WinnerResult, LegalActions,
  Position, HandRecord,
} from '../types';
import { Deck } from '../deck/Deck';
import { calculatePots, getTotalPot } from './PotManager';
import { computeLegalActions } from './ActionValidator';
import { determineWinners, determineFoldWinner } from './Showdown';
import { assignPositions } from '../utils/position';

export class GameController {
  private state: GameState;
  private deck: Deck;
  private handStartChips: Map<PlayerId, number> = new Map();
  private highestBet: number = 0;
  private lastRaiseSize: number = 0;
  private actedThisRound: Set<PlayerId> = new Set();
  private lastAggressor: PlayerId | null = null;
  private positionMap: Map<number, Position> = new Map();
  private bbPlayerId: PlayerId | null = null;

  constructor(config: GameConfig, players: Player[]) {
    this.deck = new Deck();
    this.state = {
      handNumber: 0,
      street: Street.Preflop,
      players: players.map(p => ({ ...p })),
      communityCards: [],
      pots: [{ amount: 0, eligiblePlayerIds: [], isMainPot: true }],
      dealerSeatIndex: players[0].seatIndex,
      activePlayerIndex: null,
      config: { ...config },
      actionHistory: [],
      isHandInProgress: false,
      winners: null,
    };
  }

  getState(): GameState {
    // Return a shallow copy for immutability
    return {
      ...this.state,
      players: this.state.players.map(p => ({ ...p })),
      communityCards: [...this.state.communityCards],
      pots: this.state.pots.map(p => ({ ...p, eligiblePlayerIds: [...p.eligiblePlayerIds] })),
      actionHistory: [...this.state.actionHistory],
      winners: this.state.winners ? [...this.state.winners] : null,
    };
  }

  getPositionMap(): Map<number, Position> {
    return new Map(this.positionMap);
  }

  getLegalActions(playerId?: PlayerId): LegalActions | null {
    const idx = this.state.activePlayerIndex;
    if (idx === null) return null;
    const player = this.state.players[idx];
    if (playerId && player.id !== playerId) return null;
    return computeLegalActions(
      player,
      this.highestBet,
      this.lastRaiseSize,
      this.state.street,
      this.state.config.bigBlind,
    );
  }

  /** Start a new hand */
  startHand(): void {
    this.state.handNumber++;
    this.state.isHandInProgress = true;
    this.state.winners = null;
    this.state.communityCards = [];
    this.state.actionHistory = [];
    this.state.street = Street.Preflop;
    this.highestBet = 0;
    this.lastRaiseSize = this.state.config.bigBlind;
    this.lastAggressor = null;
    this.bbPlayerId = null;
    this.actedThisRound.clear();

    // Reset players for new hand
    for (const player of this.state.players) {
      if (player.status === PlayerStatus.Eliminated || player.chips <= 0) {
        player.status = PlayerStatus.Eliminated;
        continue;
      }
      player.status = PlayerStatus.Active;
      player.holeCards = null;
      player.currentBet = 0;
      player.totalInvested = 0;
    }

    // Store starting chips
    this.handStartChips.clear();
    for (const p of this.state.players) {
      this.handStartChips.set(p.id, p.chips);
    }

    // Assign positions
    const activeSeatIndices = this.state.players
      .filter(p => p.status === PlayerStatus.Active)
      .map(p => p.seatIndex);

    if (activeSeatIndices.length < 2) {
      this.state.isHandInProgress = false;
      return;
    }

    this.positionMap = assignPositions(activeSeatIndices, this.state.dealerSeatIndex);

    // Shuffle and deal
    this.deck = new Deck();
    this.deck.shuffle();

    // Post blinds
    this.postBlinds();

    // Deal hole cards
    this.dealHoleCards();

    // Set active player to UTG (first player after BB)
    this.setFirstToActPreflop();
  }

  private postBlinds(): void {
    const { smallBlind, bigBlind } = this.state.config;
    const activePlayers = this.getActivePlayers();

    if (activePlayers.length < 2) return;

    let sbPlayer: Player | undefined;
    let bbPlayer: Player | undefined;

    if (activePlayers.length === 2) {
      // Heads-up: dealer/BTN posts SB, other posts BB
      sbPlayer = activePlayers.find(p => p.seatIndex === this.state.dealerSeatIndex);
      bbPlayer = activePlayers.find(p => p.seatIndex !== this.state.dealerSeatIndex);
    } else {
      for (const [seatIdx, pos] of this.positionMap) {
        if (pos === Position.SmallBlind) {
          sbPlayer = this.state.players.find(p => p.seatIndex === seatIdx && p.status === PlayerStatus.Active);
        }
        if (pos === Position.BigBlind) {
          bbPlayer = this.state.players.find(p => p.seatIndex === seatIdx && p.status === PlayerStatus.Active);
        }
      }
    }

    if (sbPlayer) {
      const sbAmount = Math.min(smallBlind, sbPlayer.chips);
      this.placeBet(sbPlayer, sbAmount);
      this.addAction(sbPlayer.id, ActionType.PostSmallBlind, sbAmount);
      if (sbPlayer.chips === 0) sbPlayer.status = PlayerStatus.AllIn;
    }

    if (bbPlayer) {
      const bbAmount = Math.min(bigBlind, bbPlayer.chips);
      this.placeBet(bbPlayer, bbAmount);
      this.addAction(bbPlayer.id, ActionType.PostBigBlind, bbAmount);
      this.highestBet = bbAmount;
      this.bbPlayerId = bbPlayer.id;
      if (bbPlayer.chips === 0) bbPlayer.status = PlayerStatus.AllIn;
    }
  }

  private dealHoleCards(): void {
    const activePlayers = this.getActivePlayers();
    // Deal cards one at a time, 2 rounds (standard dealing order)
    const cards: Map<PlayerId, Card[]> = new Map();
    for (const player of activePlayers) {
      cards.set(player.id, []);
    }

    for (let round = 0; round < 2; round++) {
      for (const player of activePlayers) {
        const card = this.deck.deal();
        cards.get(player.id)!.push(card);
      }
    }

    for (const player of activePlayers) {
      const playerCards = cards.get(player.id)!;
      if (playerCards.length === 2) {
        player.holeCards = [playerCards[0], playerCards[1]];
      }
    }
  }

  private setFirstToActPreflop(): void {
    const activePlayers = this.getPlayersInHand().filter(p => p.status === PlayerStatus.Active);
    if (activePlayers.length <= 1) {
      this.endHand();
      return;
    }

    if (activePlayers.length === 2) {
      // Heads-up: SB/BTN acts first preflop
      const sbPlayer = activePlayers.find(p => p.seatIndex === this.state.dealerSeatIndex);
      if (sbPlayer) {
        this.state.activePlayerIndex = this.state.players.indexOf(sbPlayer);
      }
    } else {
      // Multi-way: UTG acts first (player after BB)
      const bbSeat = this.findPositionSeat(Position.BigBlind);
      if (bbSeat !== null) {
        const bbIdx = this.state.players.findIndex(p => p.seatIndex === bbSeat);
        this.state.activePlayerIndex = this.getNextActivePlayerIndex(bbIdx);
      }
    }

    // BB hasn't "acted" yet - they get an option
    this.actedThisRound.clear();
  }

  private setFirstToActPostflop(): void {
    const activePlayers = this.getPlayersInHand().filter(p => p.status === PlayerStatus.Active);
    if (activePlayers.length <= 1) {
      // Check if there are still all-in players to run out board
      if (this.getPlayersInHand().length > 1) {
        this.runOutBoard();
      } else {
        this.endBettingRound();
      }
      return;
    }

    // Post-flop: first to act is first active player after dealer (clockwise)
    const dealerIdx = this.state.players.findIndex(
      p => p.seatIndex === this.state.dealerSeatIndex
    );
    this.state.activePlayerIndex = this.getNextActivePlayerIndex(dealerIdx);
    this.actedThisRound.clear();
  }

  /** Apply a player action */
  applyAction(playerId: PlayerId, actionType: ActionType, amount: number = 0): boolean {
    const playerIdx = this.state.activePlayerIndex;
    if (playerIdx === null) return false;

    const player = this.state.players[playerIdx];
    if (player.id !== playerId) return false;

    switch (actionType) {
      case ActionType.Fold:
        player.status = PlayerStatus.Folded;
        this.addAction(playerId, ActionType.Fold, 0);
        break;

      case ActionType.Check:
        // BB can check preflop if no one raised
        if (this.highestBet > player.currentBet) return false;
        this.addAction(playerId, ActionType.Check, 0);
        break;

      case ActionType.Call: {
        const toCall = Math.min(this.highestBet - player.currentBet, player.chips);
        if (toCall <= 0) return false;
        this.placeBet(player, toCall);
        if (player.chips === 0) player.status = PlayerStatus.AllIn;
        this.addAction(playerId, ActionType.Call, toCall);
        break;
      }

      case ActionType.Bet: {
        // Bet is only valid when there's no existing bet (post-flop)
        if (this.state.street === Street.Preflop || this.highestBet > 0) return false;
        const betAmount = Math.min(Math.max(amount, this.state.config.bigBlind), player.chips);
        this.lastRaiseSize = betAmount;
        this.highestBet = player.currentBet + betAmount;
        this.placeBet(player, betAmount);
        if (player.chips === 0) player.status = PlayerStatus.AllIn;
        this.lastAggressor = playerId;
        this.actedThisRound.clear();
        this.addAction(playerId, ActionType.Bet, betAmount);
        break;
      }

      case ActionType.Raise: {
        const totalPutIn = Math.min(Math.max(amount, 1), player.chips);
        const newTotal = player.currentBet + totalPutIn;
        const raiseIncrease = newTotal - this.highestBet;
        if (raiseIncrease > 0) {
          this.lastRaiseSize = Math.max(raiseIncrease, this.lastRaiseSize);
        }
        this.highestBet = newTotal;
        this.placeBet(player, totalPutIn);
        if (player.chips === 0) player.status = PlayerStatus.AllIn;
        this.lastAggressor = playerId;
        this.actedThisRound.clear();
        this.addAction(playerId, ActionType.Raise, totalPutIn);
        break;
      }

      case ActionType.AllIn: {
        const allInAmount = player.chips;
        const newTotal = player.currentBet + allInAmount;
        if (newTotal > this.highestBet) {
          const raiseIncrease = newTotal - this.highestBet;
          if (raiseIncrease >= this.lastRaiseSize) {
            this.lastRaiseSize = raiseIncrease;
          }
          this.highestBet = newTotal;
          this.lastAggressor = playerId;
          this.actedThisRound.clear();
        }
        this.placeBet(player, allInAmount);
        player.status = PlayerStatus.AllIn;
        this.addAction(playerId, ActionType.AllIn, allInAmount);
        break;
      }

      default:
        return false;
    }

    this.actedThisRound.add(playerId);
    this.advanceAction();
    return true;
  }

  private placeBet(player: Player, amount: number): void {
    const actual = Math.min(amount, player.chips);
    player.chips -= actual;
    player.currentBet += actual;
    player.totalInvested += actual;
  }

  private addAction(playerId: PlayerId, type: ActionType, amount: number): void {
    this.state.actionHistory.push({
      playerId,
      type,
      amount,
      timestamp: Date.now(),
    });
  }

  private advanceAction(): void {
    // Check if only one player remains (everyone else folded)
    const playersInHand = this.getPlayersInHand();
    if (playersInHand.length <= 1) {
      this.endHandFold();
      return;
    }

    // Get active (non-allin) players
    const canAct = playersInHand.filter(p => p.status === PlayerStatus.Active);

    // If no one can act (all are all-in), run out the board
    if (canAct.length === 0) {
      this.endBettingRound();
      return;
    }

    // Check if the betting round is complete:
    // All active players have acted AND their bets match the highest bet
    const roundComplete = canAct.every(p => {
      const hasActed = this.actedThisRound.has(p.id);
      const betMatches = p.currentBet >= this.highestBet;
      return hasActed && betMatches;
    });

    if (roundComplete) {
      this.endBettingRound();
      return;
    }

    // Move to next player who can act
    const currentIdx = this.state.activePlayerIndex!;
    const nextIdx = this.getNextActivePlayerIndex(currentIdx);

    if (nextIdx === null) {
      this.endBettingRound();
      return;
    }

    this.state.activePlayerIndex = nextIdx;
  }

  private endBettingRound(): void {
    // Update pots
    this.state.pots = calculatePots(this.state.players);

    // Reset for next round
    for (const player of this.state.players) {
      player.currentBet = 0;
    }
    this.highestBet = 0;
    this.lastRaiseSize = this.state.config.bigBlind;
    this.actedThisRound.clear();

    // Check if we need to run out the board (all-in situation)
    const playersInHand = this.getPlayersInHand();
    const activePlayers = playersInHand.filter(p => p.status === PlayerStatus.Active);

    if (activePlayers.length <= 1 && playersInHand.length > 1) {
      this.runOutBoard();
      return;
    }

    if (playersInHand.length <= 1) {
      this.endHandFold();
      return;
    }

    // Move to next street
    switch (this.state.street) {
      case Street.Preflop:
        this.dealFlop();
        break;
      case Street.Flop:
        this.dealTurn();
        break;
      case Street.Turn:
        this.dealRiver();
        break;
      case Street.River:
        this.goToShowdown();
        break;
    }
  }

  private dealFlop(): void {
    this.state.street = Street.Flop;
    this.deck.deal(); // Burn card
    this.state.communityCards.push(this.deck.deal(), this.deck.deal(), this.deck.deal());
    this.setFirstToActPostflop();
  }

  private dealTurn(): void {
    this.state.street = Street.Turn;
    this.deck.deal(); // Burn card
    this.state.communityCards.push(this.deck.deal());
    this.setFirstToActPostflop();
  }

  private dealRiver(): void {
    this.state.street = Street.River;
    this.deck.deal(); // Burn card
    this.state.communityCards.push(this.deck.deal());
    this.setFirstToActPostflop();
  }

  /** When all players are all-in, deal remaining community cards */
  private runOutBoard(): void {
    while (this.state.communityCards.length < 5) {
      if (this.state.communityCards.length === 0) {
        this.state.street = Street.Flop;
        this.deck.deal(); // Burn
        this.state.communityCards.push(this.deck.deal(), this.deck.deal(), this.deck.deal());
      } else if (this.state.communityCards.length === 3) {
        this.state.street = Street.Turn;
        this.deck.deal(); // Burn
        this.state.communityCards.push(this.deck.deal());
      } else if (this.state.communityCards.length === 4) {
        this.state.street = Street.River;
        this.deck.deal(); // Burn
        this.state.communityCards.push(this.deck.deal());
      } else {
        break; // Safety
      }
    }
    this.goToShowdown();
  }

  private goToShowdown(): void {
    this.state.street = Street.Showdown;
    this.state.pots = calculatePots(this.state.players);
    this.state.winners = determineWinners(
      this.state.players,
      this.state.communityCards,
      this.state.pots,
    );
    this.distributeWinnings();
    this.state.activePlayerIndex = null;
    this.state.isHandInProgress = false;
  }

  private endHandFold(): void {
    this.state.pots = calculatePots(this.state.players);
    this.state.winners = determineFoldWinner(this.state.players, this.state.pots);
    this.distributeWinnings();
    this.state.activePlayerIndex = null;
    this.state.isHandInProgress = false;
  }

  private endHand(): void {
    this.state.activePlayerIndex = null;
    this.state.isHandInProgress = false;
  }

  private distributeWinnings(): void {
    if (!this.state.winners) return;
    for (const result of this.state.winners) {
      const player = this.state.players.find(p => p.id === result.playerId);
      if (player) {
        player.chips += result.amount;
      }
    }
  }

  /** Rotate dealer button to next active player */
  rotateDealerButton(): void {
    const activePlayers = this.state.players.filter(
      p => p.status !== PlayerStatus.Eliminated && p.chips > 0
    );
    if (activePlayers.length < 2) return;

    // Sort by seat index for consistent rotation
    const sorted = [...activePlayers].sort((a, b) => a.seatIndex - b.seatIndex);
    const currentIdx = sorted.findIndex(p => p.seatIndex === this.state.dealerSeatIndex);
    const nextIdx = (currentIdx + 1) % sorted.length;
    this.state.dealerSeatIndex = sorted[nextIdx].seatIndex;
  }

  /** Get the hand record for history */
  getHandRecord(): HandRecord {
    return {
      handNumber: this.state.handNumber,
      timestamp: Date.now(),
      config: { ...this.state.config },
      players: this.state.players.map(p => ({
        id: p.id,
        name: p.name,
        seatIndex: p.seatIndex,
        startingChips: this.handStartChips.get(p.id) || 0,
        holeCards: p.holeCards,
        position: this.positionMap.get(p.seatIndex) || Position.Button,
      })),
      communityCards: [...this.state.communityCards],
      actions: [...this.state.actionHistory],
      pots: this.state.pots.map(p => ({ ...p })),
      winners: this.state.winners ? [...this.state.winners] : [],
      finalStreet: this.state.street,
    };
  }

  // ---- Helper methods ----

  private getActivePlayers(): Player[] {
    return this.state.players.filter(p => p.status === PlayerStatus.Active);
  }

  private getPlayersInHand(): Player[] {
    return this.state.players.filter(
      p => p.status === PlayerStatus.Active || p.status === PlayerStatus.AllIn
    );
  }

  private getNextActivePlayerIndex(fromIndex: number): number | null {
    const players = this.state.players;
    const count = players.length;

    for (let i = 1; i <= count; i++) {
      const idx = (fromIndex + i) % count;
      if (players[idx].status === PlayerStatus.Active) {
        return idx;
      }
    }
    return null;
  }

  private findPositionSeat(position: Position): number | null {
    for (const [seat, pos] of this.positionMap) {
      if (pos === position) return seat;
    }
    return null;
  }
}
