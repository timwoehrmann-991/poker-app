# Expertenpanel-Bericht — 12.07.2026

6 Perspektiven (Apple-Designer, Poker-Profi, Anfänger, Casino-Chef, Tech-Architekt, Lern-Didaktiker)
haben Code + Verhalten analysiert (Profi: 6.000+ simulierte Hände). Dieser Bericht ist die
Arbeitsgrundlage für den großen Umbau zusammen mit Tims 7 gewählten Features
(1 Session-Review, 2 Leak-Detektor, 3 Szenario-Trainer, 4 Range-Charts, 7 Turniermodus,
8 Chip-Animationen, 9 Hintergrund-Fotos).

## A) ECHTE FEHLER (P0 — vor allem anderen fixen)

### Regeln & Engine
- **A1** Short-All-in unterhalb Min-Raise re-opened fälschlich die Action (`GameController.applyAction`, AllIn-Fall: `actedThisRound.clear()` ohne Prüfung `raiseIncrease >= lastRaiseSize`).
- **A2** `applyAction` validiert Raise nicht gegen Min-Raise — Raise unter Call-Betrag SENKT `highestBet` (A raist 8, B "raist" auf 2 → highestBet=2). Clamping in der KI verdeckt es nur.

### KI-Exploits (vom Profi gemessen)
- **A3** River-Bluff-Frequenz = 0,0 % bei allen Profilen (`decidePostflop`: Bluff nur `street !== River`). Exploit: jede River-Bet ist Value.
- **A4** Overbet-Exploit: Fold auf 1,1×-Pot-Bet: Nit 82 %, TAG 81 %, GTO 80 %. Any-Two-Overbet ist sofort +EV. Fehlt: Bluff-Catcher-Logik bei `heavyBet`.
- **A5** Ranges unrealistisch: Nit VPIP 3,5 % (real ~13 %), Rock 5,5 %, TAG 15 % (real ~21 %); TAG/GTO limpen die halbe Range (VPIP≈2×PFR). Thresholds rekalibrieren (Nit ~0.35, Rock ~0.30), TAG/GTO: raise-or-fold statt Limp.
- **A6** Calling Station callt Halb-Pot-Bets zu 100 % → mechanisch schlagbar (−98 bb/100 gemessen).

### Odds & Training (Mathe/Ehrlichkeit)
- **A7** Worker: Tie-Equity pauschal ×0,5 statt 1/n Gewinner; Equity nur vs. Random-Hände (Label ergänzen: „vs. X zufällige Hände").
- **A8** Rule-of-4-Anzeige summiert ALLE Out-Kategorien inkl. „Other Improvements" → zeigt z.T. 60 %+. Nur echte Draw-Outs zählen, Überschneidungen dedupen.
- **A9** Trainings-Feedback vergleicht gegen EINE zufällige KI-Ziehung (nicht deterministisch, gleiche Situation → mal „Perfekt", mal „Blunder"), ignoriert Sizing, heißt fälschlich „GTO". Deterministische Bewertungsfunktion + Frequenz-Ausgabe („Bet 60 % / Check 40 %").
- **A10** StrategyChat rechnet SPR mit Hero-Gesamtstack statt effektivem Stack.

### UI-Brüche
- **A11** Hartkodierte Farben brechen das helle Theme: Pot-Display (schwarz+Gold), Action-Button-Gradients, Active/Winner-Glows (Keyframes fix blau/grün), `getEquityColor`, PERSONALITY_COLORS. Alles auf Tokens/pro-Theme-Zustände.
- **A12** Sprachchaos: TrainingOverlay `formatActionLabel` hartkodiert Englisch („Raise" statt „Erhöhen"), PlayerSeat „YOU/FOLD/ALL-IN", Tutorial-Tabs/Handnamen englisch. Alles über i18n.
- **A13** Doppelte Kartenanimation (CommunityCards `fadeSlideIn` + CardComponent `card-deal` gleichzeitig, verschiedene Kurven) — eine Quelle.
- **A14** `window.confirm()` beim Menü-Verlassen (3×) → eigenes Modal.
- **A15** Zahlformatierung inkonsistent (`toLocaleString` nur beim Haupt-Pot) → zentrale `formatEuro()`.
- **A16** 34 ESLint-Fehler, `any` in StrategyChat (verstößt gegen Tims Regel), tote Pfade (bbPlayerId, lastAggressor, Deck.reset u.a., ante wird nie gepostet).

## B) ARCHITEKTUR-FUNDAMENT (vor den Features, sonst bauen wir auf Sand)

- **B1** Deck/RNG injizierbar + `startHand(scenario?)` (definierte Karten/Stacks/Positionen) → Voraussetzung für Szenario-Trainer (3), Fehler-Replay, deterministische Tests.
- **B2** Event-Stream aus der Engine (`BetPlaced`, `StreetDealt`, `PotAwarded`, `ChipsMoved`…) statt Snapshot-Sprüngen; UI spielt Events sequenziell ab → Voraussetzung für Chip-/Karten-Animationen (8), Street-Pausen, Showdown-Regie. Overlay-Layer mit gemessenen Pixelpositionen (getBoundingClientRect); `motion` ist installiert und ungenutzt.
- **B3** `street` in `PlayerAction` + `boardByStreet` in `HandRecord` → Voraussetzung für Session-Review (1) und Leak-Detektor (2). VOR dem Ansammeln von History einführen (Schema-Version!).
- **B4** Persistenz-Modul (IndexedDB, versioniertes Schema) für handHistory + feedbackHistory + Lernfortschritt → Leak-Detektor über Sessions; StatsPanel auf inkrementelle Aggregation.
- **B5** Worker-Protokoll v2: requestId, Abbruch, Batch → Equity-Snapshots pro Street in HandRecord (Session-Review).
- **B6** Turnier-Voraussetzungen: Blind-Schedule änderbar machen (config eingefroren), `getNextActivePlayerIndex` auf seatIndex-Reihenfolge (bricht sonst bei Eliminierung), Antes wirklich posten.
- **B7** AI-Turn-Pfad konsolidieren (useGameLoop/Watchdog/forceAITurn = 3 Duplikate → eine Store-Action; Watchdog pollt auch außerhalb von Händen).
- **B8** Golden-Tests VOR dem Umbau: PotManager (Side Pots), Showdown (Splits), ActionValidator (Min-Raise), Heads-Up-Regeln.

## C) ERLEBNIS (Casino-Chef + Designer)

- **C1** Chips wandern: Einsätze gleiten beim Street-Ende zur Mitte, Pot gleitet zum Gewinner, Count-up der Pot-Zahl. (= Tims Nr. 8; von 4 der 6 Experten unabhängig genannt — größter Einzelhebel.)
- **C2** Street-Dramaturgie: 800–1200 ms Pause vor Flop/Turn/River, Karten einzeln (250–400 ms), River mit Extra-Pause; Showdown sequenziert (Karten nacheinander flippen, Banner erst danach).
- **C3** KI-Denkzeit situationsabhängig: Instant-Fold bei Müll (~300 ms), langes Tanken bei großen Entscheidungen (4–8 s) mit „denkt nach…" am Sitz.
- **C4** Sound-Upgrade: Chip-Klackern (versetzte Noise-Bursts statt Sinus-Ping), Karten-Snap pro Deal (playCardDeal wird nie aufgerufen!), Shuffle beim Handstart, Pot-Einsammeln, Chips-Schieben. Chip-Landung mit 30-ms-Versatz pro Chip + Tick koppeln.
- **C5** Dealer-Button gleitet sichtbar zum nächsten Sitz + kurze Blinds-Einblendung.
- **C6** Design-System-Disziplin: Type-Scale (11/12/13/15/17/22/28) als Tokens, 4-pt-Abstands-Raster, 3 Radius-Tokens, monochrome SVG-Icons statt Emoji-UI, `:focus-visible`/Hover per CSS statt JS, `prefers-reduced-motion`.
- **C7** Daylight eigenständig denken: Schatten statt Glow für Aktiv/Winner (Glow ist Dunkel-Phänomen) → löst A11 konzeptionell.
- **C8** Pot als visueller Held: Street-Label/Logo zurücknehmen, Pot größer mit Wert-Übergang.
- **C9** Emoji-Persönlichkeits-Badges abschaltbar (Immersion vs. Lernhilfe).
- **C10** Out-of-the-box: All-in-Regie (Ambient dimmen, Spotlight, Live-Equity-Overlay via vorhandenem Worker), „Dealer-Kamera"-Showdown, Tisch lebt zwischen Händen (Fold-Karten fliegen Richtung Mitte), optionale Dealer-Stimme (DE/EN).

## D) LERNTRAINER (Anfänger + Didaktiker) — deckt Tims Nr. 1–4

- **D1** Trainer sichtbar machen: Schalter auf der Startseite („Mit Lern-Coach spielen"), Settings-Label korrigieren (heißt „Deutsche Begriffe", schaltet aber das Training).
- **D2** Timer pausieren, solange Tipp/Fehler-Feedback offen ist; Fehler-Feedback bleibt bis zum Wegklicken stehen + ein Satz Konzept-Anbindung mit Tutorial-Link.
- **D3** Glossar an den Ort der Entscheidung: Fachbegriffe (Equity, Pot Odds, BB, VPIP, AKs-Notation…) überall als Tooltip aus dem vorhandenen GLOSSARY.
- **D4** „Erst raten, dann zeigen": Hint-Flow umdrehen (Recall statt Recognition), computeFeedback wiederverwenden.
- **D5** Session-Review (= Nr. 1): Debriefing-Screen alle N Hände / Session-Ende — 3 größte Fehler mit Board, gespielt vs. optimal, Konzept-Tag, Equity-Verlauf pro Street (braucht B3+B5), Kennzahlen-Trend. Live nur Ampel-Feedback, Tiefe im ruhigen Moment.
- **D6** Fehler-Replay/Szenario-Deck (= Nr. 3): Blunder als vollständiges Szenario speichern (braucht B1), Modus „Deine Fehler" ohne Timer, Spaced-Repetition-Queue mit Variation; plus kuratierte Standard-Szenarien (Flush Draw Turn, 3-Bet aus Blinds…).
- **D7** Leak-Detektor (= Nr. 2, + Profi-Idee Exploit-Detektor): Tims VPIP/PFR/AF/Fold-Frequenzen über Sessions tracken (braucht B3+B4), Muster benennen („Du foldest 85 % auf Turn-Raises — so beutet man dich aus"). Dazu „Leak-Labor": 1.000 Hände headless simulieren (<1 s, gemessen) mit bb/100-Ergebnis.
- **D8** Range-Quiz 13×13 (= Nr. 4): eigenes Mini-Spiel mit Levels (Premium erkennen → Positionen → vs. Open-Raise), Matrix färbt sich mit Antworten vs. Lösung. Braucht Range-Datenstruktur (KI nutzt Chen, keine Charts!) — Ranges definieren und idealerweise die KI daraus speisen (löst A5 gleich mit).
- **D9** „Warum verloren?"-Vergleich beim Showdown: meine Hand vs. Gewinnerhand nebeneinander + 1 Satz Erklärung.
- **D10** Onboarding: geführte erste Hand (geskriptet via B1); Lernstufen-Scaffolding (Anzeigen schrittweise freischalten statt alles gleichzeitig); Widerspruch Odds-Panel („Fold") vs. GTO-Hint („Raise") erklären/hierarchisieren.
- **D11** Live-Stats der Bots am Seat einblendbar (VPIP/PFR aus actionHistory) — trainiert Gegnertypen-Lesen.
- **D12** RecentHandsBar um „meine Hand + meine Schlüsselaktion + Rating" ergänzen (Review statt Gewinner-Ticker); Glossar-Quiz-Modus (35 Einträge = fertiges Spaced-Repetition-Material).

## E) UMBAU-REIHENFOLGE

1. **Phase 0 — Fehler & Hygiene:** A1–A16 (Regeln, KI-Exploits, Odds-Mathe, Sprache, Theme, Lint). Golden-Tests B8 parallel.
2. **Phase 1 — Fundament:** B1→B7 (Seed/Events/Street-Metadaten/Persistenz/Worker v2/Turnier-Basis/AI-Pfad).
3. **Phase 2 — Erlebnis:** C1–C9 (= Nr. 8 Chip-Animationen + Dramaturgie + Sound + Design-Disziplin).
4. **Phase 3 — Lerntrainer:** D1–D12 (= Nr. 1 Session-Review, Nr. 2 Leak-Detektor, Nr. 3 Szenario-Trainer, Nr. 4 Range-Quiz).
5. **Phase 4 — Ausbau:** Nr. 7 Turniermodus (auf B6), Nr. 9 Hintergrund-Fotos, C10-Ideen nach Lust.
