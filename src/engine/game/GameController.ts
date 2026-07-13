import {
  GameState, GameConfig, Player, PlayerStatus, Card, Street,
  ActionType, PlayerId, LegalActions,
  Position, HandRecord, HandScenario, GameEvent,
} from '../types';
import { Deck, shuffleInPlace } from '../deck/Deck';
import { createFullDeck } from '../deck/Card';
import { calculatePots } from './PotManager';
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
  /** Spieler, für die ein Incomplete-All-in-Raise die Action NICHT neu eröffnet hat */
  private cannotRaise: Set<PlayerId> = new Set();
  private positionMap: Map<number, Position> = new Map();
  private events: GameEvent[] = [];

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

  /** Seit dem letzten Abruf aufgelaufene Engine-Ereignisse (für UI-Playback) */
  drainEvents(): GameEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  private emit(event: GameEvent): void {
    this.events.push(event);
  }

  /** Blinds zwischen zwei Händen ändern (Turniermodus) */
  updateBlinds(smallBlind: number, bigBlind: number, ante: number = 0): void {
    if (this.state.isHandInProgress) return;
    this.state.config.smallBlind = smallBlind;
    this.state.config.bigBlind = bigBlind;
    this.state.config.ante = ante;
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
      !this.cannotRaise.has(player.id),
    );
  }

  /** Start a new hand — optional mit vordefiniertem Szenario (Training/Tests) */
  startHand(scenario?: HandScenario): void {
    this.state.handNumber++;
    this.state.isHandInProgress = true;
    this.state.winners = null;
    this.state.communityCards = [];
    this.state.actionHistory = [];
    this.state.street = Street.Preflop;
    this.highestBet = 0;
    this.lastRaiseSize = this.state.config.bigBlind;
    this.actedThisRound.clear();
    this.cannotRaise.clear();
    this.events = [];

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

    if (scenario?.dealerSeatIndex !== undefined) {
      this.state.dealerSeatIndex = scenario.dealerSeatIndex;
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

    // Deck: gemischt oder nach Szenario gestapelt
    if (scenario && (scenario.holeCards || scenario.board)) {
      this.deck = this.buildScenarioDeck(scenario);
    } else {
      this.deck = new Deck();
      this.deck.shuffle();
    }

    this.emit({ type: 'handStarted', handNumber: this.state.handNumber, dealerSeatIndex: this.state.dealerSeatIndex });

    // Post antes + blinds
    this.postAntes();
    this.postBlinds();

    // Deal hole cards
    this.dealHoleCards();

    // Set active player to UTG (first player after BB)
    this.setFirstToActPreflop();
  }

  /**
   * Baut ein gestapeltes Deck, das die Szenario-Karten in exakt der
   * Reihenfolge liefert, in der die Engine sie austeilt (2 Runden Hole
   * Cards, dann Burn+Flop, Burn+Turn, Burn+River).
   */
  private buildScenarioDeck(scenario: HandScenario): Deck {
    const active = this.getActivePlayers();
    const fixedIds = new Set<number>();
    for (const cards of Object.values(scenario.holeCards ?? {})) {
      for (const c of cards) fixedIds.add(c.id);
    }
    for (const c of scenario.board ?? []) fixedIds.add(c.id);

    const pool = createFullDeck().filter(c => !fixedIds.has(c.id));
    shuffleInPlace(pool);
    const draw = (): Card => {
      const card = pool.pop();
      if (!card) throw new Error('Szenario-Pool erschöpft');
      return card;
    };

    const holeByPlayer = new Map<PlayerId, [Card, Card]>();
    for (const p of active) {
      holeByPlayer.set(p.id, scenario.holeCards?.[p.id] ?? [draw(), draw()]);
    }

    const front: Card[] = [];
    for (let round = 0; round < 2; round++) {
      for (const p of active) {
        front.push(holeByPlayer.get(p.id)![round]);
      }
    }

    const board = scenario.board ?? [];
    if (board.length > 0) {
      front.push(draw()); // Burn vor dem Flop
      front.push(board[0] ?? draw(), board[1] ?? draw(), board[2] ?? draw());
      if (board.length > 3) {
        front.push(draw(), board[3]); // Burn + Turn
      }
      if (board.length > 4) {
        front.push(draw(), board[4]); // Burn + River
      }
    }

    return Deck.arranged(front);
  }

  private postAntes(): void {
    const ante = this.state.config.ante;
    if (ante <= 0) return;
    for (const player of this.getActivePlayers()) {
      const amount = Math.min(ante, player.chips);
      player.chips -= amount;
      player.totalInvested += amount;
      if (player.chips === 0) player.status = PlayerStatus.AllIn;
    }
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
      if (bbPlayer.chips === 0) bbPlayer.status = PlayerStatus.AllIn;
    }

    this.emit({ type: 'blindsPosted', smallBlind, bigBlind });
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

    this.emit({ type: 'holeCardsDealt', playerIds: activePlayers.map(p => p.id) });
  }

  private setFirstToActPreflop(): void {
    const activePlayers = this.getPlayersInHand().filter(p => p.status === PlayerStatus.Active);
    if (activePlayers.length <= 1) {
      // Alle bis auf max. einen sind durch Blinds/Antes all-in → Board ausspielen
      if (this.getPlayersInHand().length > 1) {
        this.runOutBoard();
      } else {
        this.endHand();
      }
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

    const bb = this.state.config.bigBlind;

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
        const betAmount = Math.min(Math.max(amount, bb), player.chips);
        this.lastRaiseSize = betAmount;
        this.highestBet = player.currentBet + betAmount;
        this.placeBet(player, betAmount);
        if (player.chips === 0) player.status = PlayerStatus.AllIn;
        this.actedThisRound.clear();
        this.cannotRaise.clear();
        this.addAction(playerId, ActionType.Bet, betAmount);
        break;
      }

      case ActionType.Raise: {
        if (this.cannotRaise.has(playerId)) return false;
        const putIn = Math.min(Math.max(amount, 1), player.chips);
        const newTotal = player.currentBet + putIn;
        // Ein "Raise", der die höchste Bet nicht übersteigt, ist keiner
        if (newTotal <= this.highestBet) return false;
        const isAllIn = putIn === player.chips;
        const minRaiseSize = Math.max(this.lastRaiseSize, bb);
        // Min-Raise erzwingen — Ausnahme: All-in darf darunter liegen
        if (newTotal < this.highestBet + minRaiseSize && !isAllIn) return false;

        const raiseIncrease = newTotal - this.highestBet;
        const isFullRaise = raiseIncrease >= minRaiseSize;
        this.highestBet = newTotal;
        this.placeBet(player, putIn);
        if (player.chips === 0) player.status = PlayerStatus.AllIn;

        if (isFullRaise) {
          this.lastRaiseSize = raiseIncrease;
          this.actedThisRound.clear();
          this.cannotRaise.clear();
        } else {
          // Incomplete All-in-Raise: eröffnet die Action für bereits
          // handelnde Spieler NICHT neu — sie dürfen nur callen/folden
          for (const id of this.actedThisRound) this.cannotRaise.add(id);
        }
        this.addAction(playerId, ActionType.Raise, putIn);
        break;
      }

      case ActionType.AllIn: {
        const allInAmount = player.chips;
        if (allInAmount <= 0) return false;
        const newTotal = player.currentBet + allInAmount;
        if (newTotal > this.highestBet) {
          const raiseIncrease = newTotal - this.highestBet;
          const isFullRaise = raiseIncrease >= Math.max(this.lastRaiseSize, bb);
          this.highestBet = newTotal;
          if (isFullRaise) {
            this.lastRaiseSize = raiseIncrease;
            this.actedThisRound.clear();
            this.cannotRaise.clear();
          } else {
            for (const id of this.actedThisRound) this.cannotRaise.add(id);
          }
        }
        this.placeBet(player, allInAmount);
        player.status = PlayerStatus.AllIn;
        this.addAction(playerId, ActionType.AllIn, allInAmount);
        break;
      }

      default:
        return false;
    }

    this.emit({
      type: 'actionPerformed',
      playerId,
      action: actionType,
      amount,
      street: this.state.street,
    });

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
      street: this.state.street,
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
    // Einsätze einsammeln (für die Chip-Animation der UI)
    const collectedBets = this.state.players
      .filter(p => p.currentBet > 0)
      .map(p => ({ playerId: p.id, amount: p.currentBet }));
    if (collectedBets.length > 0) {
      this.emit({ type: 'betsCollected', street: this.state.street, bets: collectedBets });
    }

    // Update pots
    this.state.pots = calculatePots(this.state.players);

    // Reset for next round
    for (const player of this.state.players) {
      player.currentBet = 0;
    }
    this.highestBet = 0;
    this.lastRaiseSize = this.state.config.bigBlind;
    this.actedThisRound.clear();
    this.cannotRaise.clear();

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
    const cards = [this.deck.deal(), this.deck.deal(), this.deck.deal()];
    this.state.communityCards.push(...cards);
    this.emit({ type: 'streetDealt', street: Street.Flop, cards });
    this.setFirstToActPostflop();
  }

  private dealTurn(): void {
    this.state.street = Street.Turn;
    this.deck.deal(); // Burn card
    const card = this.deck.deal();
    this.state.communityCards.push(card);
    this.emit({ type: 'streetDealt', street: Street.Turn, cards: [card] });
    this.setFirstToActPostflop();
  }

  private dealRiver(): void {
    this.state.street = Street.River;
    this.deck.deal(); // Burn card
    const card = this.deck.deal();
    this.state.communityCards.push(card);
    this.emit({ type: 'streetDealt', street: Street.River, cards: [card] });
    this.setFirstToActPostflop();
  }

  /** When all players are all-in, deal remaining community cards */
  private runOutBoard(): void {
    while (this.state.communityCards.length < 5) {
      if (this.state.communityCards.length === 0) {
        this.state.street = Street.Flop;
        this.deck.deal(); // Burn
        const cards = [this.deck.deal(), this.deck.deal(), this.deck.deal()];
        this.state.communityCards.push(...cards);
        this.emit({ type: 'streetDealt', street: Street.Flop, cards });
      } else if (this.state.communityCards.length === 3) {
        this.state.street = Street.Turn;
        this.deck.deal(); // Burn
        const card = this.deck.deal();
        this.state.communityCards.push(card);
        this.emit({ type: 'streetDealt', street: Street.Turn, cards: [card] });
      } else if (this.state.communityCards.length === 4) {
        this.state.street = Street.River;
        this.deck.deal(); // Burn
        const card = this.deck.deal();
        this.state.communityCards.push(card);
        this.emit({ type: 'streetDealt', street: Street.River, cards: [card] });
      } else {
        break; // Safety
      }
    }
    this.goToShowdown();
  }

  private goToShowdown(): void {
    this.state.street = Street.Showdown;
    this.state.pots = calculatePots(this.state.players);
    this.emit({
      type: 'showdown',
      playerIds: this.getPlayersInHand().map(p => p.id),
    });
    this.state.winners = determineWinners(
      this.state.players,
      this.state.communityCards,
      this.state.pots,
    );
    this.distributeWinnings();
    this.emit({ type: 'potAwarded', winners: this.state.winners ?? [] });
    this.emit({ type: 'handEnded' });
    this.state.activePlayerIndex = null;
    this.state.isHandInProgress = false;
  }

  private endHandFold(): void {
    this.state.pots = calculatePots(this.state.players);
    this.state.winners = determineFoldWinner(this.state.players, this.state.pots);
    this.distributeWinnings();
    this.emit({ type: 'potAwarded', winners: this.state.winners ?? [] });
    this.emit({ type: 'handEnded' });
    this.state.activePlayerIndex = null;
    this.state.isHandInProgress = false;
  }

  private endHand(): void {
    this.emit({ type: 'handEnded' });
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

  /** Nächster aktiver Spieler in Sitzreihenfolge (nicht Array-Reihenfolge) */
  private getNextActivePlayerIndex(fromIndex: number): number | null {
    const players = this.state.players;
    const fromSeat = players[fromIndex].seatIndex;

    // Alle aktiven Spieler nach Sitz sortiert, dann den nächsten im Uhrzeigersinn suchen
    const activeBySeat = players
      .map((p, idx) => ({ p, idx }))
      .filter(({ p }) => p.status === PlayerStatus.Active)
      .sort((a, b) => a.p.seatIndex - b.p.seatIndex);

    if (activeBySeat.length === 0) return null;

    const after = activeBySeat.find(({ p }) => p.seatIndex > fromSeat);
    const next = after ?? activeBySeat[0];
    if (next.p.seatIndex === fromSeat) return null;
    return next.idx;
  }

  private findPositionSeat(position: Position): number | null {
    for (const [seat, pos] of this.positionMap) {
      if (pos === position) return seat;
    }
    return null;
  }
}
