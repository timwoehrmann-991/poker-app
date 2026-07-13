import { Card, Rank, Suit } from '../engine/types';
import { createCard } from '../engine/deck/Card';

const c = createCard;

export interface ScenarioOption {
  label: string;
  correct: boolean;
  explanation: string;
}

/** Kuratierter Übungs-Spot: eine Situation, eine richtige Antwort, eine Lektion */
export interface TrainingScenario {
  id: string;
  title: string;
  concept: string;          // Welches Konzept trainiert wird
  heroCards: [Card, Card];
  board: Card[];
  position: string;
  situation: string;        // Was ist passiert (Villain-Action etc.)
  pot: number;
  toCall: number;
  stackBB: number;
  options: ScenarioOption[];
  lesson: string;           // Merksatz nach der Auflösung
}

export const SCENARIOS: TrainingScenario[] = [
  {
    id: 'flushdraw-turn',
    title: 'Flush Draw am Turn',
    concept: 'Pot Odds',
    heroCards: [c(Rank.Ace, Suit.Hearts), c(Rank.Nine, Suit.Hearts)],
    board: [c(Rank.King, Suit.Hearts), c(Rank.Seven, Suit.Hearts), c(Rank.Two, Suit.Spades), c(Rank.Jack, Suit.Clubs)],
    position: 'BTN',
    situation: 'Der Gegner setzt €10 in einen €40-Pot (Viertel-Pot).',
    pot: 40,
    toCall: 10,
    stackBB: 80,
    options: [
      { label: 'Passen', correct: false, explanation: 'Zu tight! Mit 9 Flush-Outs hast du ~18 % Equity — die Pot Odds verlangen nur 20 %. Dazu kommt der Nut-Flush als Gewinnpotenzial.' },
      { label: 'Mitgehen', correct: true, explanation: 'Richtig: €10 in €50 = 20 % Break-even. Deine ~18 % direkten Odds plus Implied Odds (der Gegner zahlt, wenn dein Ass-hoch-Flush ankommt) machen den Call klar profitabel.' },
      { label: 'All-in', correct: false, explanation: 'Overkill. Semi-Bluff-Raises sind eine Option, aber ein All-in riskiert den ganzen Stack mit einer Draw-Hand gegen eine kleine Bet.' },
    ],
    lesson: 'Rule of 2: Outs × 2 ≈ Equity am Turn. Vergleiche mit den Pot Odds (Call ÷ (Pot + Call)) — liegt die Equity darüber, ist der Call profitabel.',
  },
  {
    id: '3bet-blinds-aks',
    title: '3-Bet aus den Blinds',
    concept: 'Preflop-Aggression',
    heroCards: [c(Rank.Ace, Suit.Spades), c(Rank.King, Suit.Spades)],
    board: [],
    position: 'BB',
    situation: 'Der Button eröffnet auf €6 (3 BB). Alle anderen passen. Du sitzt im Big Blind.',
    pot: 9,
    toCall: 4,
    stackBB: 100,
    options: [
      { label: 'Passen', correct: false, explanation: 'AKs ist eine Top-5-Hand — folden verschenkt massiven Wert.' },
      { label: 'Mitgehen', correct: false, explanation: 'Ein Call ist okay, aber zu passiv: Du spielst den Rest der Hand ohne Initiative und aus schlechter Position.' },
      { label: 'Erhöhen auf €20', correct: true, explanation: 'Richtig: AKs gehört in die Value-3-Bet-Range. Aus den Blinds 3-bettest du größer (3–4× des Raises), weil du postflop aus schlechter Position spielst.' },
    ],
    lesson: 'Value-3-Bet-Range: QQ+, AK. Aus Position 3× des Open-Raise, aus den Blinds 3,5–4×.',
  },
  {
    id: 'toppair-river-overbet',
    title: 'Top Pair gegen River-Overbet',
    concept: 'Bet-Sizing lesen',
    heroCards: [c(Rank.Ace, Suit.Diamonds), c(Rank.Queen, Suit.Clubs)],
    board: [c(Rank.Queen, Suit.Spades), c(Rank.Eight, Suit.Hearts), c(Rank.Five, Suit.Diamonds), c(Rank.Nine, Suit.Hearts), c(Rank.Seven, Suit.Hearts)],
    position: 'CO',
    situation: 'Ein tighter Gegner (Rock) check-callt Flop und Turn — und setzt am River plötzlich €90 in den €60-Pot. Flush und Straße sind angekommen.',
    pot: 60,
    toCall: 90,
    stackBB: 90,
    options: [
      { label: 'Passen', correct: true, explanation: 'Richtig: Ein passiver Spieler, der zwei Streets nur callt und dann OVERBETTET, wenn Flush + Straße ankommen, blufft fast nie. Top Pair ist hier ein Bluff-Catcher ohne Catch.' },
      { label: 'Mitgehen', correct: false, explanation: 'Gegen diesen Spielertyp ist das ein teurer Call: Seine Range besteht nach diesem Verlauf fast nur aus Flushes, Straßen und Sets.' },
      { label: 'All-in', correct: false, explanation: 'Top Pair in einen Rock zu jagen, dessen Linie Stärke schreit, verbrennt den Stack.' },
    ],
    lesson: 'Sizing + Spielertyp + Verlauf zusammen lesen: Passive Spieler, die auf gefährlichen Rivers plötzlich groß setzen, haben es fast immer.',
  },
  {
    id: 'gutshot-potbet',
    title: 'Gutshot gegen Pot-Bet',
    concept: 'Draws diszipliniert folden',
    heroCards: [c(Rank.Nine, Suit.Clubs), c(Rank.Eight, Suit.Diamonds)],
    board: [c(Rank.Six, Suit.Spades), c(Rank.Five, Suit.Hearts), c(Rank.King, Suit.Clubs)],
    position: 'MP',
    situation: 'Der Gegner setzt €20 in den €20-Pot (volle Pot-Bet).',
    pot: 20,
    toCall: 20,
    stackBB: 95,
    options: [
      { label: 'Passen', correct: true, explanation: 'Richtig: Ein Gutshot hat 4 Outs ≈ 16 % bis zum River. Die Pot-Bet verlangt 33 % Equity — der Preis ist doppelt so hoch wie dein Draw wert ist.' },
      { label: 'Mitgehen', correct: false, explanation: '4 Outs gegen 33 % Break-even — dieser Call verliert langfristig Geld, auch mit Implied Odds.' },
      { label: 'Erhöhen', correct: false, explanation: 'Als Semi-Bluff brauchst du mehr Fold-Equity oder mehr Outs; mit nacktem Gutshot gegen eine Pot-Bet ist das Spew.' },
    ],
    lesson: 'Nicht jeder Draw rechtfertigt einen Call: Gutshot = 4 Outs ≈ 16 %. Gegen große Bets heißt das fast immer Fold.',
  },
  {
    id: 'aa-vs-3bet',
    title: 'Asse gegen 3-Bet',
    concept: 'Value maximieren',
    heroCards: [c(Rank.Ace, Suit.Clubs), c(Rank.Ace, Suit.Diamonds)],
    board: [],
    position: 'CO',
    situation: 'Du eröffnest auf €6, der Button 3-bettet auf €20. Die Blinds passen.',
    pot: 29,
    toCall: 14,
    stackBB: 100,
    options: [
      { label: 'Mitgehen', correct: false, explanation: 'Slowplay ist gelegentlich okay, aber Standard ist die 4-Bet: Du baust den Pot mit der besten Starthand auf, solange du sicher vorne bist.' },
      { label: 'Erhöhen auf €45', correct: true, explanation: 'Richtig: 4-Bet auf ~2,2–2,5× der 3-Bet. Mit AA willst du den Pot JETZT groß machen — jede vierte 3-Bet-Hand zahlt dich weiter aus.' },
      { label: 'All-in', correct: false, explanation: '100 BB direkt zu schieben verjagt alle schlechteren Hände — du gewinnst nur noch das, was schon im Pot liegt.' },
    ],
    lesson: 'Mit Monstern den Pot wachsen lassen, ohne die Gegner-Range zu verjagen: 4-Bet ~2,2–2,5× der 3-Bet statt All-in.',
  },
  {
    id: 'bottompair-river-check',
    title: 'Bottom Pair am River',
    concept: 'Showdown Value',
    heroCards: [c(Rank.Seven, Suit.Diamonds), c(Rank.Six, Suit.Diamonds)],
    board: [c(Rank.Ace, Suit.Spades), c(Rank.Jack, Suit.Hearts), c(Rank.Six, Suit.Clubs), c(Rank.Three, Suit.Spades), c(Rank.Ten, Suit.Diamonds)],
    position: 'BTN',
    situation: 'Der Gegner checkt am River zu dir. Du hältst nur Bottom Pair.',
    pot: 30,
    toCall: 0,
    stackBB: 85,
    options: [
      { label: 'Schieben', correct: true, explanation: 'Richtig: Bottom Pair hat Showdown Value — es schlägt Bluffs und verpasste Draws. Eine Bet bezahlt nur, wer dich schlägt.' },
      { label: 'Setzen (klein)', correct: false, explanation: 'Welche schlechtere Hand callt? Keine. Welche bessere foldet? Auch keine. Die Bet hat kein Ziel.' },
      { label: 'Setzen (Pot)', correct: false, explanation: 'Ein großer Bluff mit einer Hand, die checkend oft gewinnt, verwandelt einen Gewinner in einen Verlierer.' },
    ],
    lesson: 'Vor jeder Bet zwei Fragen: Callt eine schlechtere Hand (Value)? Foldet eine bessere (Bluff)? Zweimal Nein → Check.',
  },
  {
    id: 'suited-connector-utg',
    title: 'Suited Connector unter der Pistole',
    concept: 'Position',
    heroCards: [c(Rank.Seven, Suit.Hearts), c(Rank.Six, Suit.Hearts)],
    board: [],
    position: 'UTG',
    situation: 'Du bist als Erster dran (UTG) an einem 7er-Tisch. Noch keine Action vor dir.',
    pot: 3,
    toCall: 2,
    stackBB: 100,
    options: [
      { label: 'Passen', correct: true, explanation: 'Richtig: 76s ist hübsch, aber aus früher Position spielst du gegen 6 Unbekannte ohne Positionsvorteil. Am Button wäre dieselbe Hand ein Open.' },
      { label: 'Mitgehen (Limp)', correct: false, explanation: 'Limpen lädt Raises ein und verschenkt Initiative — aus UTG mit Speculative Hands doppelt schlecht.' },
      { label: 'Erhöhen', correct: false, explanation: 'Ein Open aus UTG braucht eine Hand, die auch gegen Widerstand gut spielt — 76s gehört ans späte Positions-Ende der Range.' },
    ],
    lesson: 'Dieselbe Hand ist aus UTG ein Fold und am Button ein Raise: Position bestimmt die Range, nicht die Kartenschönheit.',
  },
  {
    id: 'cbet-dry-board',
    title: 'Continuation Bet auf trockenem Board',
    concept: 'C-Bet',
    heroCards: [c(Rank.Ace, Suit.Clubs), c(Rank.King, Suit.Diamonds)],
    board: [c(Rank.Queen, Suit.Spades), c(Rank.Seven, Suit.Diamonds), c(Rank.Two, Suit.Clubs)],
    position: 'CO',
    situation: 'Du hast preflop erhöht, nur der Big Blind ist mitgegangen und checkt jetzt zu dir. Du hast nichts getroffen — aber zwei Overcards.',
    pot: 14,
    toCall: 0,
    stackBB: 98,
    options: [
      { label: 'Schieben', correct: false, explanation: 'Zu passiv: Auf Q-7-2 ohne Draws trifft der Big Blind fast nie — deine C-Bet gewinnt den Pot sofort in ~60 % der Fälle.' },
      { label: 'Setzen (halber Pot)', correct: true, explanation: 'Richtig: Trockenes Board + Initiative + zwei Overcards mit 6 Outs = klassische C-Bet. Halber Pot reicht als Größe völlig.' },
      { label: 'Setzen (Pot)', correct: false, explanation: 'Funktioniert, ist aber zu teuer: Auf trockenen Boards erzielt eine halbe Pot-Bet dieselben Folds für weniger Risiko.' },
    ],
    lesson: 'C-Bet-Faustregel: Je trockener das Board, desto öfter und kleiner darfst du als Aggressor weitersetzen.',
  },
  {
    id: 'shortstack-push',
    title: 'Short Stack: Push or Fold',
    concept: 'Stack-Management',
    heroCards: [c(Rank.Ace, Suit.Spades), c(Rank.Ten, Suit.Diamonds)],
    board: [],
    position: 'CO',
    situation: 'Du hast nur noch 9 BB. Alle vor dir passen.',
    pot: 3,
    toCall: 2,
    stackBB: 9,
    options: [
      { label: 'Passen', correct: false, explanation: 'ATo ist bei 9 BB weit über der Push-Schwelle — die Blinds fressen dich sonst auf.' },
      { label: 'Erhöhen auf 3 BB', correct: false, explanation: 'Ein Mini-Raise bei 9 BB bindet dich an den Pot, ohne den Fold-Druck eines All-ins zu erzeugen — die schlechteste Welt.' },
      { label: 'All-in', correct: true, explanation: 'Richtig: Unter ~12 BB gilt Push or Fold. ATo aus dem Cutoff ist ein klarer Shove — maximale Fold-Equity plus solide Hand, falls gecallt wird.' },
    ],
    lesson: 'Unter ~12 BB verschwinden Raise und Call aus dem Werkzeugkasten: Push or Fold — halbe Sachen kosten den Stack.',
  },
];
