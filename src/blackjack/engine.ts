import { Card, Rank } from '../engine/types';
import { createFullDeck } from '../engine/deck/Card';
import { shuffleInPlace } from '../engine/deck/Deck';

/**
 * Blackjack-Engine — klassisches Casino-Regelwerk:
 * - 6 Decks im Shoe, neu gemischt bei < 25 % Restkarten
 * - Blackjack zahlt 3:2, Dealer steht auf ALLEN 17 (S17)
 * - Verdoppeln auf jeden zwei Karten, auch nach dem Teilen (DAS)
 * - Teilen bei gleichem Kartenwert (auch K+10), max. 2 Hände,
 *   geteilte Asse bekommen genau eine Karte
 * - Versicherung gegen Dealer-Ass (kostet halben Einsatz, zahlt 2:1)
 * - Dealer prüft bei Ass/10 sofort auf Blackjack (US-Stil mit Hole Card)
 */

export type BJPhase = 'betting' | 'insurance' | 'playerTurns' | 'dealerTurn' | 'payout';

export type BJHandStatus = 'playing' | 'stood' | 'bust' | 'blackjack' | 'doubled' | 'surrendered';

export interface BJHand {
  cards: Card[];
  bet: number;
  status: BJHandStatus;
  isSplitHand: boolean;
  fromSplitAces: boolean;
  /** Ergebnis nach dem Payout (für die Anzeige) */
  result?: 'win' | 'lose' | 'push' | 'blackjack' | 'surrender';
  payout?: number;
}

export interface BJSeat {
  id: string;
  name: string;
  isHuman: boolean;
  chips: number;
  hands: BJHand[];
  activeHandIndex: number;
  insuranceBet: number;
  insuranceDecided: boolean;
  /** Aktueller Einsatz für die nächste Runde (Betting-Phase) */
  pendingBet: number;
}

export interface BJState {
  phase: BJPhase;
  seats: BJSeat[];
  dealerCards: Card[];
  dealerRevealed: boolean;
  activeSeatIndex: number | null;
  roundNumber: number;
  shoeRemaining: number;
  /** Dealer hatte Blackjack (Runde endete sofort) */
  dealerBlackjack: boolean;
  /** Legale Aktionen der aktiven Hand — UI muss die Engine nicht anfassen */
  legalActions: BJLegalActions;
}

export interface BJLegalActions {
  canHit: boolean;
  canStand: boolean;
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
}

export interface HandValue {
  total: number;
  soft: boolean;   // ein Ass zählt gerade als 11
}

/** Blackjack-Kartenwert (Bildkarten 10, Ass hier als 1 — Soft-Logik in handValue) */
export function cardValue(card: Card): number {
  if (card.rank === Rank.Ace) return 1;
  if (card.rank >= Rank.Ten) return 10;
  return card.rank;
}

export function handValue(cards: Card[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c.rank === Rank.Ace) aces++;
  }
  // Ein Ass als 11 werten, wenn es nicht überzieht
  if (aces > 0 && total + 10 <= 21) {
    return { total: total + 10, soft: true };
  }
  return { total, soft: false };
}

export function isBlackjack(hand: BJHand): boolean {
  return !hand.isSplitHand && hand.cards.length === 2 && handValue(hand.cards).total === 21;
}

const SHOE_DECKS = 6;
const RESHUFFLE_AT = 52 * SHOE_DECKS * 0.25;

export interface BJSeatConfig {
  id: string;
  name: string;
  isHuman: boolean;
  chips: number;
}

function emptyHand(bet: number, isSplitHand = false, fromSplitAces = false): BJHand {
  return { cards: [], bet, status: 'playing', isSplitHand, fromSplitAces };
}

export class BlackjackEngine {
  private state: BJState;
  private shoe: Card[] = [];
  private testMode = false;

  constructor(seats: BJSeatConfig[]) {
    this.refillShoe();
    this.state = {
      phase: 'betting',
      seats: seats.map(s => ({
        ...s,
        hands: [],
        activeHandIndex: 0,
        insuranceBet: 0,
        insuranceDecided: false,
        pendingBet: 0,
      })),
      dealerCards: [],
      dealerRevealed: false,
      activeSeatIndex: null,
      roundNumber: 0,
      shoeRemaining: this.shoe.length,
      dealerBlackjack: false,
      legalActions: { canHit: false, canStand: false, canDouble: false, canSplit: false, canSurrender: false },
    };
  }

  getState(): BJState {
    return {
      ...this.state,
      seats: this.state.seats.map(s => ({
        ...s,
        hands: s.hands.map(h => ({ ...h, cards: [...h.cards] })),
      })),
      dealerCards: [...this.state.dealerCards],
      shoeRemaining: this.shoe.length,
      legalActions: this.getLegalActions(),
    };
  }

  private refillShoe(): void {
    this.shoe = [];
    for (let d = 0; d < SHOE_DECKS; d++) {
      this.shoe.push(...createFullDeck());
    }
    shuffleInPlace(this.shoe);
  }

  /** Nur für Tests: legt die Ziehreihenfolge fest (erste Karte zuerst) */
  setShoeForTesting(cardsInDrawOrder: Card[]): void {
    this.shoe = [...cardsInDrawOrder].reverse();
    this.testMode = true;
  }

  private draw(): Card {
    if (this.shoe.length === 0) this.refillShoeExcludingTable();
    return this.shoe.pop()!;
  }

  /** Not-Nachfüllen mitten in der Runde: Karten im Spiel bleiben einmalig */
  private refillShoeExcludingTable(): void {
    const inPlay = new Map<number, number>();
    const count = (c: Card) => inPlay.set(c.id, (inPlay.get(c.id) ?? 0) + 1);
    this.state.dealerCards.forEach(count);
    for (const seat of this.state.seats) {
      for (const hand of seat.hands) hand.cards.forEach(count);
    }
    this.shoe = [];
    for (let d = 0; d < SHOE_DECKS; d++) {
      for (const c of createFullDeck()) {
        const n = inPlay.get(c.id) ?? 0;
        if (n > 0) inPlay.set(c.id, n - 1);
        else this.shoe.push(c);
      }
    }
    shuffleInPlace(this.shoe);
  }

  /** Spielgeld nachkaufen (Rebuy) — nur zwischen den Runden */
  addChips(seatId: string, amount: number): boolean {
    if (this.state.phase !== 'betting' && this.state.phase !== 'payout') return false;
    const seat = this.state.seats.find(s => s.id === seatId);
    if (!seat || amount <= 0) return false;
    seat.chips += amount;
    return true;
  }

  /** Einsatz für die nächste Runde setzen (Betting-Phase) */
  setBet(seatId: string, amount: number): boolean {
    if (this.state.phase !== 'betting') return false;
    const seat = this.state.seats.find(s => s.id === seatId);
    if (!seat) return false;
    if (amount < 0 || amount > seat.chips) return false;
    seat.pendingBet = amount;
    return true;
  }

  /** Runde starten — alle Sitze mit Einsatz > 0 spielen mit */
  deal(): boolean {
    if (this.state.phase !== 'betting') return false;
    const active = this.state.seats.filter(s => s.pendingBet > 0);
    if (active.length === 0) return false;

    if (!this.testMode && this.shoe.length < RESHUFFLE_AT) this.refillShoe();

    this.state.roundNumber++;
    this.state.dealerCards = [];
    this.state.dealerRevealed = false;
    this.state.dealerBlackjack = false;

    for (const seat of this.state.seats) {
      seat.hands = [];
      seat.activeHandIndex = 0;
      seat.insuranceBet = 0;
      seat.insuranceDecided = false;
      if (seat.pendingBet > 0) {
        seat.chips -= seat.pendingBet;
        seat.hands = [emptyHand(seat.pendingBet)];
      }
    }

    // Austeilen wie am echten Tisch: zwei Runden, Dealer bekommt Up-Card + Hole Card
    for (let round = 0; round < 2; round++) {
      for (const seat of this.state.seats) {
        if (seat.hands.length > 0) seat.hands[0].cards.push(this.draw());
      }
      this.state.dealerCards.push(this.draw());
    }

    // Naturals markieren
    for (const seat of this.state.seats) {
      if (seat.hands.length > 0 && isBlackjack(seat.hands[0])) {
        seat.hands[0].status = 'blackjack';
      }
    }

    const upCard = this.state.dealerCards[0];
    if (upCard.rank === Rank.Ace) {
      this.state.phase = 'insurance';
      return true;
    }

    // Dealer-Peek bei 10er-Karte
    if (cardValue(upCard) === 10 && handValue(this.state.dealerCards).total === 21) {
      this.resolveDealerBlackjack();
      return true;
    }

    this.startPlayerTurns();
    return true;
  }

  /** Versicherungsentscheidung (nur wenn Dealer-Ass offen liegt) */
  decideInsurance(seatId: string, take: boolean): boolean {
    if (this.state.phase !== 'insurance') return false;
    const seat = this.state.seats.find(s => s.id === seatId);
    if (!seat || seat.hands.length === 0 || seat.insuranceDecided) return false;

    if (take) {
      const cost = Math.round(seat.hands[0].bet / 2);
      if (cost > seat.chips) return false;
      seat.chips -= cost;
      seat.insuranceBet = cost;
    }
    seat.insuranceDecided = true;

    // Alle entschieden → Dealer prüft auf Blackjack
    const pending = this.state.seats.some(s => s.hands.length > 0 && !s.insuranceDecided);
    if (!pending) {
      if (handValue(this.state.dealerCards).total === 21) {
        this.resolveDealerBlackjack();
      } else {
        // Versicherungen verfallen
        for (const s of this.state.seats) s.insuranceBet = 0;
        this.startPlayerTurns();
      }
    }
    return true;
  }

  private resolveDealerBlackjack(): void {
    this.state.dealerRevealed = true;
    this.state.dealerBlackjack = true;
    // Versicherung zahlt 2:1 (Einsatz + 2× zurück)
    for (const seat of this.state.seats) {
      if (seat.insuranceBet > 0) {
        seat.chips += seat.insuranceBet * 3;
      }
    }
    this.payout();
  }

  private startPlayerTurns(): void {
    this.state.phase = 'playerTurns';
    this.state.activeSeatIndex = null;
    this.advanceTurn();
  }

  /** Nächste zu spielende Hand finden (überspringt Blackjack/Bust/fertige) */
  private advanceTurn(): void {
    for (let i = 0; i < this.state.seats.length; i++) {
      const seat = this.state.seats[i];
      for (let h = 0; h < seat.hands.length; h++) {
        const hand = seat.hands[h];
        if (hand.status !== 'playing') continue;

        // Split-Hand, die noch auf ihre zweite Karte wartet
        if (hand.cards.length === 1) {
          hand.cards.push(this.draw());
          if (handValue(hand.cards).total === 21) {
            hand.status = 'stood';
            continue;
          }
        }

        this.state.activeSeatIndex = i;
        seat.activeHandIndex = h;
        return;
      }
    }
    // Niemand mehr dran → Dealer spielt
    this.state.activeSeatIndex = null;
    this.state.phase = 'dealerTurn';
  }

  getActiveSeat(): BJSeat | null {
    if (this.state.activeSeatIndex === null) return null;
    return this.state.seats[this.state.activeSeatIndex];
  }

  getActiveHand(): BJHand | null {
    const seat = this.getActiveSeat();
    if (!seat) return null;
    return seat.hands[seat.activeHandIndex] ?? null;
  }

  getLegalActions(): BJLegalActions {
    const seat = this.getActiveSeat();
    const hand = this.getActiveHand();
    if (this.state.phase !== 'playerTurns' || !seat || !hand || hand.status !== 'playing') {
      return { canHit: false, canStand: false, canDouble: false, canSplit: false, canSurrender: false };
    }
    const twoCards = hand.cards.length === 2;
    const canAfford = seat.chips >= hand.bet;
    const sameValue = twoCards && cardValue(hand.cards[0]) === cardValue(hand.cards[1]);
    return {
      canHit: true,
      canStand: true,
      canDouble: twoCards && canAfford && !hand.fromSplitAces,
      canSplit: sameValue && canAfford && seat.hands.length < 2,
      // Late Surrender: nur als allererste Aktion, nicht nach Split
      canSurrender: twoCards && !hand.isSplitHand && seat.hands.length === 1,
    };
  }

  /** Aufgeben (Late Surrender): halber Einsatz zurück, Hand ist beendet */
  surrender(): boolean {
    const seat = this.getActiveSeat();
    const hand = this.getActiveHand();
    if (!seat || !hand || !this.getLegalActions().canSurrender) return false;
    const refund = Math.round(hand.bet / 2);
    seat.chips += refund;
    hand.status = 'surrendered';
    hand.result = 'surrender';
    hand.payout = refund;
    this.advanceTurn();
    return true;
  }

  /** Karte ziehen */
  hit(): boolean {
    const hand = this.getActiveHand();
    if (this.state.phase !== 'playerTurns' || !hand || hand.status !== 'playing') return false;
    hand.cards.push(this.draw());
    this.afterDraw(hand);
    return true;
  }

  /** Halten */
  stand(): boolean {
    const hand = this.getActiveHand();
    if (this.state.phase !== 'playerTurns' || !hand || hand.status !== 'playing') return false;
    hand.status = 'stood';
    this.advanceTurn();
    return true;
  }

  /** Verdoppeln: Einsatz ×2, genau eine Karte, dann automatisch halten */
  double(): boolean {
    const seat = this.getActiveSeat();
    const hand = this.getActiveHand();
    if (!seat || !hand || !this.getLegalActions().canDouble) return false;
    seat.chips -= hand.bet;
    hand.bet *= 2;
    hand.cards.push(this.draw());
    const value = handValue(hand.cards);
    hand.status = value.total > 21 ? 'bust' : 'doubled';
    this.advanceTurn();
    return true;
  }

  /** Teilen: zwei Hände mit je einer Karte + neuem Einsatz */
  split(): boolean {
    const seat = this.getActiveSeat();
    const hand = this.getActiveHand();
    if (!seat || !hand || !this.getLegalActions().canSplit) return false;

    const splitAces = hand.cards[0].rank === Rank.Ace;
    seat.chips -= hand.bet;

    const second = emptyHand(hand.bet, true, splitAces);
    second.cards = [hand.cards.pop()!];
    hand.isSplitHand = true;
    hand.fromSplitAces = splitAces;
    seat.hands.push(second);

    // Hand 1 bekommt sofort ihre zweite Karte; Hand 2 erst, wenn sie
    // an der Reihe ist — wie am echten Tisch
    hand.cards.push(this.draw());

    // Geteilte Asse: genau eine Karte, dann fest
    if (splitAces) {
      second.cards.push(this.draw());
      hand.status = handValue(hand.cards).total > 21 ? 'bust' : 'stood';
      second.status = handValue(second.cards).total > 21 ? 'bust' : 'stood';
    }

    this.advanceTurn();
    return true;
  }

  private afterDraw(hand: BJHand): void {
    const value = handValue(hand.cards);
    if (value.total > 21) {
      hand.status = 'bust';
      this.advanceTurn();
    } else if (value.total === 21) {
      hand.status = 'stood';
      this.advanceTurn();
    }
  }

  /** Dealer zieht eine Karte (die UI ruft das schrittweise für die Animation) */
  dealerStep(): 'draw' | 'done' {
    if (this.state.phase !== 'dealerTurn') return 'done';
    this.state.dealerRevealed = true;

    // Wenn kein Spieler mehr im Rennen ist, muss der Dealer nicht ziehen
    const anyLive = this.state.seats.some(s =>
      s.hands.some(h => h.status === 'stood' || h.status === 'doubled'));
    // (bust/blackjack/surrendered brauchen keinen Dealer-Zug)

    const value = handValue(this.state.dealerCards);
    if (anyLive && value.total < 17) {
      this.state.dealerCards.push(this.draw());
      return 'draw';
    }

    this.payout();
    return 'done';
  }

  private payout(): void {
    const dealerValue = handValue(this.state.dealerCards).total;
    const dealerBust = dealerValue > 21;
    const dealerBJ = this.state.dealerBlackjack;

    for (const seat of this.state.seats) {
      for (const hand of seat.hands) {
        const value = handValue(hand.cards).total;

        if (hand.status === 'surrendered') {
          // Bereits beim Aufgeben abgerechnet (halber Einsatz zurück)
          continue;
        }

        if (hand.status === 'bust') {
          hand.result = 'lose';
          hand.payout = 0;
        } else if (hand.status === 'blackjack') {
          if (dealerBJ) {
            hand.result = 'push';
            hand.payout = hand.bet;
          } else {
            // Blackjack zahlt 3:2
            hand.result = 'blackjack';
            hand.payout = hand.bet + Math.round(hand.bet * 1.5);
          }
        } else if (dealerBJ) {
          hand.result = 'lose';
          hand.payout = 0;
        } else if (dealerBust || value > dealerValue) {
          hand.result = 'win';
          hand.payout = hand.bet * 2;
        } else if (value === dealerValue) {
          hand.result = 'push';
          hand.payout = hand.bet;
        } else {
          hand.result = 'lose';
          hand.payout = 0;
        }

        seat.chips += hand.payout ?? 0;
      }
    }

    this.state.dealerRevealed = true;
    this.state.phase = 'payout';
    this.state.activeSeatIndex = null;
  }

  /** Nächste Runde vorbereiten (zurück zur Betting-Phase) */
  nextRound(): void {
    if (this.state.phase !== 'payout') return;
    this.state.phase = 'betting';
    this.state.activeSeatIndex = null;
    for (const seat of this.state.seats) {
      // Letzten Einsatz als Vorschlag behalten, aber auf Chips begrenzen
      seat.pendingBet = Math.min(seat.pendingBet, seat.chips);
      seat.hands = [];
      seat.insuranceBet = 0;
      seat.insuranceDecided = false;
    }
  }
}
