# Expertenpanel Runde 2 — Blackjack-Fokus (13.07.2026)

7 Perspektiven ausgewertet: Blackjack-Profi (300k-Runden-Simulation), Blackjack-Dealer,
Systematik-Prüfer (Poker+Blackjack), Apple-Designer, Anfänger, Casino-Chef, Tech-Architekt.
(Poker-Profi-Regression am Agent-Limit abgebrochen; Kernpunkte vom Systematik-Prüfer
gemessen: VPIP-Verteilung plausibel, 23/23 Tests grün.)

## ✅ Entwarnung beim Kern
- **Blackjack-Engine fachlich sauber**: 300.000 simulierte Runden → Hausvorteil −0,48 %
  (Theorie ~−0,55 %), BJ-Frequenz 4,7 % (Soll 4,75 %), keine Regelfehler. Peek, S17,
  DAS, Split-Asse, 3:2 alles verifiziert.
- **Basic-Strategy-Tabelle: 310/310 Zellen korrekt** gegen die Standard-6-Deck-S17-DAS-Referenz.
- Poker-KI: Charaktere klar differenziert, TAG exakt auf Ziel (22,1 % VPIP).
- Gesamturteil Tech: „Blackjack ist architektonisch das sauberste Stück der Codebasis."

## A) BUGS (P0 — vor allem anderen)
- **A1 Doppelte React-Keys durch 6-Deck-Shoe**: `card.id` (0–51) ist im Shoe 6× vorhanden —
  zwei gleiche Karten in einer Hand kollidieren (`key={card.id}` in BlackjackTable) →
  kaputte Animationen/DOM. Fix: Index in den Key. Tritt statistisch sicher auf.
- **A2 runFlow-Race**: `runFlow` cached die Engine; `leave()` + sofortiger Neustart →
  alter Flow entsperrt `isRunning` der NEUEN Runde, sync() schreibt falsche Zwischenstände.
  Fix: Generation-Counter, jeder set/sync prüft `get().engine === engine`. Zusätzlich
  `leave()` während `isRunning` bestätigen/sperren.
- **A3 Coach-Score zählt vor Validierung**: in `act()` wird Feedback/Score gebucht,
  BEVOR `ok` geprüft ist → Doppelklick zählt Geisterentscheidungen. Score hinter `if (!ok)`.
- **A4 „Versichern" ohne Deckung verpufft stumm**: Rückgabewert von `decideInsurance`
  wird ignoriert; Dialog bleibt ohne Feedback stehen.
- **A5 Rundungs-Randfälle**: Versicherung bei ungeradem Einsatz (floor(5/2)=2, zahlt 6 →
  Netto −1 statt ±0); BJ-Payout floor(5*1,5)=7 statt 7,5. Fix: Einsätze auf gerade Beträge
  beschränken ODER exakt in Cents rechnen (einfachster Weg: Mindesteinsatz/Schritt 2).
- **A6 Shoe-Refill mitten in der Runde** mischt volle 6 Decks trotz Karten im Spiel
  (nur theoretisch erreichbar) — beim Refill ausgeteilte Karten ausschließen.

## B) BLACKJACK ALS „INSEL" (Systematik — von 4 Experten unabhängig genannt)
- **B1 Settings unerreichbar**: SettingsModal nur im laufenden Pokerspiel. ⚙️-Zugang in
  GameSetup (Hauptmenü) + BlackjackGame ergänzen.
- **B2 Kein Sound**: useSoundEffects hängt zu 100 % am Poker-gameStore. Fix: SoundEngine
  in eigenes Modul extrahieren, `useBlackjackSounds` (Karten-Snap pro Karte, Chip-Klackern
  beim Setzen/Payout, playWin bei Human-Gewinn, playShuffle bei neuem Shoe).
- **B3 Kein i18n**: Blackjack komplett hartkodiert Deutsch — bei Sprache EN halb/halb.
  Strings in i18n/de+en überführen.
- **B4 Keine Persistenz**: Coach-Score & Chips flüchtig (weg bei leave/Reload).
  Fix: `blackjackTrainingStore` mit zustand/persist (Score + Fehler-Situationen +
  Bankroll), Muster aus trainingStore.
- **B5 beginnerMode-Doppelbedeutung**: ein Flag, zwei Namen („Lern-Coach" vs.
  „Basic-Strategy-Coach") — Nutzer schaltet unbewusst beide. Mindestens einheitlich
  benennen; besser getrennte Flags.
- **B6 Verlassen ohne Bestätigung** (Poker hat ConfirmDialog, Blackjack nicht).

## C) RITUAL & ATMOSPHÄRE (Dealer + Casino-Chef: „stiller Nebenraum")
- **C1 Karten einzeln über den Tisch geben**: deal() ist ein State-Update; Karten sollen
  wie beim Poker sequenziell erscheinen (Sitz 1→n→Dealer, 2 Runden, ~150-200 ms + Tick).
  Umsetzung UI-seitig im runFlow (dealtCount-View-State) — Engine bleibt synchron.
- **C2 Hole-Card-Flip-Moment**: Aufdecken mit Pause + Flip statt Remount; „Bank prüft…"-
  Beat beim Peek (auch bei 10er-Upcard nicht abrupt enden).
- **C3 Payout mit Chips-Bewegung**: Gewinn-Chips fliegen zur Bet-Box → zum Spieler;
  Verlust-Chips wandern zur Bank; Push pulst. fly-chips-Infrastruktur existiert.
- **C4 Momente zelebrieren**: Spieler-Blackjack (Glow+Sound+Ansage, sofort sichtbar),
  Bank-Bust als Tisch-Moment („Bank kaputt — der Tisch gewinnt!").
- **C5 Bet-Box auf dem Filz** vor jedem Sitz (leer sichtbar in der Einsatz-Phase,
  Chips wandern hinein); „Keine Einsätze mehr" beim Geben.
- **C6 Dealer-Ansagen** als kleines Ansage-Element über der Bank („Bank zeigt 10",
  „Bank hat 17 — Bank steht", „Einundzwanzig!").
- **C7 KI-/Dealer-Tempo variieren** (600–1300 ms statt fixe 850/750; knappe
  Entscheidungen dauern länger).
- **C8 Split-Timing**: Hand 1 bekommt Karte und wird fertig gespielt, DANN Hand 2
  (Engine-Anpassung, EV-neutral).
- **C9 Rundenwechsel**: Karten Richtung Discard wischen statt State-Reset-Blitz;
  Shoe + Neumischen sichtbar machen (Anzeige + playShuffle).

## D) UI/UX (Designer + Anfänger)
- **D1 Mobile bricht komplett**: fixe Kartengrößen/Sitzboxen ohne compact-Modus —
  unter 640 px Kartensalat. Fix: useIsMobile + tiny-Karten + kleinere Sitzboxen
  (Poker-Muster übernehmen).
- **D2 Sitz-/Split-Kollisionen** bei 5-6 Sitzen: Split-Hände (~140 px) sprengen den
  ~95-px-Sitzabstand. Fix: tiny-Karten ab 5 Sitzen, Split vertikal versetzt,
  aktiver Sitz zIndex 25.
- **D3 Buttons vereinheitlichen**: ActionBtn aus dem Poker-ActionPanel extrahieren
  und im Blackjack nutzen (Hover, Hotkey-Hints); Tasten Z/H/V/T + Keyboard-Listener.
- **D4 Kosten auf die Buttons**: „Verdoppeln +€10", „Teilen +€10" — Anfänger-Blocker #1.
- **D5 Pleite-Sackgasse**: Rebuy-Button („Neues Geld holen") statt Verlassen-Zwang.
- **D6 Netto-Ergebnisse**: „+€15" (Gewinn), „±0" (Push), „−€10" (Verlust) statt
  missverständlichem „Unentschieden +€10" / „Verloren" ohne Betrag.
- **D7 Regelheft bei Runde 1 offen** bzw. Kurz-Intro vor der ersten Runde.
- **D8 „Gleicher Einsatz nochmal"**-Button; Einsatz-Phase am Tisch anzeigen
  (pulsierende Bet-Box statt nur Panel-Text).
- **D9 Token-/Konsistenz-Hygiene**: hartkodierte Farben (Aktiv-Border, ValueBadge,
  CTA-Gradient 4× dupliziert) auf Tokens; Panelbreiten angleichen; Startseiten-
  Umschalter als echte gleichwertige Kacheln (Titel „Poker Simulator" → neutraler).
- **D10 „(soft)"-Tooltip** am Handwert-Badge.

## E) LERN-AUSBAU (deckt Tims Lern-Anspruch)
- **E1 Basic-Strategy-Quiz** als eigener Modus (analog Range-Quiz): zufällige Hand +
  Dealer-Karte → Nutzer wählt → Begründung. Logik liegt fertig in basicStrategy.ts.
- **E2 Fehler-Wiederholung**: falsche Entscheidungen mit Situation speichern
  (Blackjack-Pendant zum Szenario-Trainer „Deine Fehler").
- **E3 Interaktive Strategie-Matrix** (Spielerhand × Dealer-Karte) einblendbar,
  aktuelle Zelle im Spiel gehighlightet — verbindet Coach und Muster.
- **E4 Score-Auswertung nach Kategorien** (Soft Hands / Paare / 12-16) + optional
  „Kosten deiner Fehler in €" (EV-Differenz).

## F) REGELWERK-KOMFORT (optional, vom Profi empfohlen)
- **F1 Even-Money-Angebot** bei Spieler-BJ vs. Dealer-Ass (Coach: ablehnen!).
- **F2 Late Surrender** (16 vs. 9/10/A, 15 vs. 10) — Standard jeder Strategiekarte.
- **F3 Resplit auf 3-4 Hände** (aktuell max. 2).

## G) POKER-NACHJUSTIERUNG (Randbefunde)
- **G1 Kalibrierungs-Drift**: Station 57 % VPIP (Anzeige „45 %"), LAG 42 % (35), Nit 9 %
  (10-14 ok-ish), Rock 14 (17). Fix: Station playThreshold 0.14→0.18, LAG 0.20→0.23,
  Rock 0.32→0.29 ODER Setup-Anzeigen anpassen.
- **G2 Poker-Verlassen räumt view/tournament/currentHandEquity nicht auf** — zentrale
  leaveGame()-Action.
- **G3 Aufräumen**: CardComponent Face/Back-Duplikat extrahieren, tote Deps
  (motion, immer) entfernen, tote Zweige in applicableRecommendation,
  legalActions in BJState statt Live-Engine-Zugriff aus der UI.
- **G4 Blackjack-Testlücken**: Peek bei 10er-Upcard, Double-nach-Split-Abrechnung,
  Bankrott-Kanten, nextRound-Reset, Reshuffle-Schwelle.

## OUT-OF-THE-BOX (Ideen-Speicher)
Halbmond-Tisch (gerade Dealer-Kante statt Poker-Oval) · Dealer als Person mit Namen
und Sprüchen · Shoe + Cut-Card als sichtbares Objekt mit Misch-Zeremonie ·
Hi-Lo-Counting-Trainer · Regel-Varianten-Schalter (H17/Surrender) mit angepasster
Strategie · Wisch-Gesten für Hit/Stand.

## Vorgeschlagene Umsetzungs-Reihenfolge
1. **BJ-0 Bugs**: A1–A6, A-Poker G1–G3
2. **BJ-1 Insel anbinden**: B1–B6 (Settings, Sound, i18n, Persistenz, Coach-Klarheit, Confirm)
3. **BJ-2 Ritual**: C1–C9 (Deal-Sequenz, Flip, Payout-Chips, Zelebration, Bet-Box, Ansagen)
4. **BJ-3 UX**: D1–D10 (Mobile, Kollisionen, Buttons+Hotkeys, Kosten, Rebuy, Netto, Onboarding)
5. **BJ-4 Lernen**: E1–E4 (+ optional F1/F2) + Tests G4
