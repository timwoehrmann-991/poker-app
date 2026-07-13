# Poker Simulator & Lerntrainer (+ Blackjack)

## Was das ist
No-Limit Texas Hold'em Simulator gegen 7 KI-Persönlichkeiten mit Live-Odds,
Lern-Coach, Session-Review, Leak-Detektor, Szenario-Trainer, Range-Quiz und
Turniermodus — plus **Blackjack gegen die Bank** im selben Look.
Reine Client-App — läuft komplett im Browser.

## Stack
- Vite 7 + React 19 + TypeScript, Tailwind 4 (Token-basiert via CSS-Variablen)
- Zustand (gameStore, settingsStore + trainingStore mit persist)
- Web Worker für Monte-Carlo-Odds (50k Simulationen, requestId-Protokoll)
- IndexedDB für Hand-Historie (`src/persistence/handStore.ts`, Schema-Version 2)
- Hosting: Vercel (Auto-Deploy via GitHub `timwoehrmann-991/poker-app`)
- **Kein Supabase / kein Backend**

## Architektur
- `src/engine/` — Spiellogik. GameController emittiert **GameEvents**
  (betsCollected, streetDealt, showdown, potAwarded …), die der gameStore
  sequenziell abspielt (Playback mit Pausen → Chips fliegen, Karten einzeln,
  Showdown nacheinander). `startHand(scenario?)` akzeptiert feste Karten/Board
  (Szenario-Trainer, Tests). NLHE-Regeln vollständig: Min-Raise-Validierung,
  Incomplete-All-in-Raise re-opened die Action NICHT (`cannotRaise`-Set).
  `PlayerAction` trägt `street`; `HandRecord.heroEquityByStreet` wird vom
  Odds-Panel befüllt.
- `src/store/gameStore.ts` — Engine-Wahrheit + `view`-Playback-State
  (boardRevealed, collectingBets, awarding, showdownRevealed, isPlaying).
  KI-Pfad konsolidiert: `computeAIDecision` → `applyAIDecision` (mit
  Situations-Check); `useGameLoop` ist nur Scheduler und nutzt die
  situationsabhängige `thinkTimeMs` der KI. Turnier: `TOURNAMENT_LEVELS`,
  Blinds steigen alle 8 Hände, `tournamentResult` bei Ausscheiden/Sieg.
- `src/ai/AIPlayer.ts` — EIN Entscheidungskern, parametrisiert über Profile.
  Preflop: Chen-Formel (exportiert, auch fürs Range-Quiz). Kalibriert nach
  Profi-Review: TAG VPIP ~21/PFR ~18, raise-or-fold statt Limpen (TAG/GTO),
  River-Bluffs > 0 %, Bluff-Catcher gegen Overbets, Station callt nicht 100 %.
  `{ deterministic: true }` für Coach/Quiz (gleiche Situation → gleiche Antwort).
- **Lerntrainer**: `trainingStore` speichert bewertete Entscheidungen MIT
  Situationskontext (persist). `ReviewPanel` (🎯-Tab) = Genauigkeit pro Street +
  Fehlerliste + Equity-Verlauf + Leak-Detektor (`utils/leakDetector.ts`, ab 30
  Händen). `ScenarioTrainer` = kuratierte Spots (`training/scenarios.ts`) +
  „Deine Fehler"-Replay. `RangeQuiz` = 13×13-Matrix, Chen-Schwellen identisch
  zum GTO-Bot. Coach-Toggle auf der Startseite; Timer pausiert bei offenem Tipp;
  Fehler-Feedback bleibt bis „Verstanden".
- `src/assets/styles/global.css` — Design-Tokens, 4 Themes (**daylight** =
  Standard), 4 Hintergründe (`data-bg`), 4 Tischfarben (`data-felt`, beige
  stellt Filztext dunkel). Komponenten verwenden NUR Tokens.
  `fly-chips`-Keyframes nutzen `--fly-to-x/y` pro Element.
- Deutsch ist Standard; Hand-Beschreibungen via `i18n/handDescription.ts`.
- **Blackjack** (`src/blackjack/` + `components/blackjack/` + `store/blackjackStore.ts`):
  Eigenständige Engine mit US-Regelwerk — 6-Deck-Shoe, S17, Blackjack 3:2,
  Double (auch nach Split/DAS), Split bei gleichem Wert (Asse: 1 Karte, kein BJ
  nach Split), Versicherung 2:1 mit Dealer-Peek (auch bei 10er-Upcard),
  **Late Surrender** (halber Einsatz zurück, nur erste Entscheidung).
  `basicStrategy.ts` = komplette S17/DAS/Surrender-Tabelle mit deutschen
  Begründungen — treibt KI-Mitspieler (0–5) UND den Coach; `applicableRecommendation`
  fällt sauber zurück, wenn der pure Zug gerade nicht legal ist.
  Ritual-Ablauf im Store: `dealtSteps` (Karten einzeln), `holeFlips`
  (Flip-Trigger via Key-Remount + `flip-reveal`-CSS), `chipFlights` (Payout),
  `announce` (Bank-Ansagen), `clearing`; `alive(engine)`-Guard gegen stale Flows.
  UI: Bet-Boxen auf dem Filz, Netto-Ergebnisse, Hotkeys Z/H/V/T/A, Kosten auf
  Buttons, Even-Money-Dialog bei eigenem BJ, Rebuy, ConfirmDialog, ⚙️-Settings,
  bj.*-i18n-Keys (Coach-Begründungen bewusst deutsch). Karten mit `flat`-Prop
  rendern (3D-Flip macht bei überlappenden Karten Compositing-Probleme);
  Karten-Keys immer MIT Index (6-Deck-Shoe → doppelte IDs möglich).
  `setShoeForTesting()` (+testMode) für deterministische Tests.
- **Blackjack-Lernen**: `blackjackProgressStore` (persist) = Bankroll
  („Weiterspielen mit €X"), Lifetime-Score nach Kategorie (Hart/Soft/Paare),
  Fehler-Archiv (max 100, volle Situation). `StrategyMatrix` (aus basicStrategy
  generiert, Hover = Begründung) + `BlackjackStrategyQuiz` (Quiz-Tab +
  „Deine Fehler"-Tab) — Zugang über den Blackjack-Startbildschirm.
  Sounds via `useBlackjackSounds` (gemeinsame `soundEngine`).

## Befehle
- `npm run dev` / `npm run build` / `npm test` (Vitest) / `npx eslint .` (0 Fehler halten)
- Tests: `src/ai/AIPlayer.test.ts` (Verhaltens-Simulation) +
  `src/engine/engine.test.ts` (Min-Raise/Side-Pots/Szenario-Deck/Events) +
  `src/blackjack/engine.test.ts` (Payouts/Split/Double/Versicherung/Strategy).
  Bei Engine- oder KI-Änderungen IMMER laufen lassen.

## Bekannte Stolperfallen
- `LegalActions.minRaise/maxRaise` = Betrag den der Spieler ZUSÄTZLICH einzahlt,
  nicht die Zielhöhe. Die KI kapselt das in `betOrRaiseTo()`.
- Während `view.isPlaying` sind Eingaben und KI-Züge gesperrt — neue UI-Aktionen
  müssen das respektieren, sonst kollidieren sie mit dem Playback.
- `useDecisionTimer`: Ablauf-Effekt nur mit `armedRef` scharf (Insta-Fold-Bug).
- HandRecords in IndexedDB sind schema-versioniert (RECORD_SCHEMA_VERSION) —
  bei Strukturänderungen Version erhöhen, alte Records werden ignoriert.

## Offen (bewusst zurückgestellt)
- Echte Hintergrund-Fotos (Nr. 9) — braucht Tims OK für Bild-Generierungs-Credits.
- Emoji-UI-Icons durch SVG ersetzen; Onboarding „geführte erste Hand";
  Lernstufen-Scaffolding; Dealer-Stimme; All-in-Spotlight-Regie.
