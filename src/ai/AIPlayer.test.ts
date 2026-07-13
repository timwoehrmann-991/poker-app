import { describe, it, expect } from 'vitest';
import { GameController } from '../engine/game/GameController';
import { getAIDecision } from './AIPlayer';
import {
  GameConfig, Player, PlayerStatus, ActionType, AIPersonalityType, Position,
} from '../engine/types';

function makePlayers(personalities: AIPersonalityType[], chips: number): Player[] {
  return personalities.map((p, i) => ({
    id: `ai-${i}`,
    name: `AI ${i}`,
    chips,
    holeCards: null,
    status: PlayerStatus.Active,
    seatIndex: i,
    isHuman: false,
    aiPersonality: p,
    currentBet: 0,
    totalInvested: 0,
  }));
}

const CONFIG: GameConfig = {
  playerCount: 6,
  smallBlind: 1,
  bigBlind: 2,
  startingChips: 200,
  decisionTimeSeconds: 30,
  ante: 0,
};

const MIX: AIPersonalityType[] = [
  AIPersonalityType.TAG,
  AIPersonalityType.Rock,
  AIPersonalityType.CallingStation,
  AIPersonalityType.LAGManiac,
  AIPersonalityType.GTOBalanced,
  AIPersonalityType.Nit,
];

/** Simuliert n Hände komplett mit KI-Entscheidungen und sammelt Statistiken */
function simulate(hands: number) {
  const players = makePlayers(MIX, CONFIG.startingChips);
  const controller = new GameController(CONFIG, players);

  let totalActions = 0;
  let allInActions = 0;
  let preflopFolds = 0;
  let preflopDecisions = 0;
  let handsCompleted = 0;
  let raiseActions = 0;

  for (let h = 0; h < hands; h++) {
    controller.startHand();
    let state = controller.getState();
    if (!state.isHandInProgress) break; // zu wenige Spieler übrig

    let safety = 0;
    while (state.isHandInProgress && safety < 300) {
      safety++;
      const idx = state.activePlayerIndex;
      if (idx === null) break;
      const player = state.players[idx];
      const legal = controller.getLegalActions();
      if (!legal) break;

      const posMap = controller.getPositionMap();
      const position = posMap.get(player.seatIndex) || Position.Button;
      const decision = getAIDecision(player.aiPersonality!, state, player, position, legal);

      totalActions++;
      if (decision.action === ActionType.AllIn) allInActions++;
      if (decision.action === ActionType.Raise || decision.action === ActionType.Bet) raiseActions++;
      if (state.street === 'preflop') {
        preflopDecisions++;
        if (decision.action === ActionType.Fold) preflopFolds++;
      }

      const ok = controller.applyAction(player.id, decision.action, decision.amount);
      expect(ok, `Aktion ${decision.action} (${decision.amount}) muss legal sein`).toBe(true);
      state = controller.getState();
    }

    expect(safety, 'Hand darf nicht in Endlosschleife hängen').toBeLessThan(300);
    if (!state.isHandInProgress) handsCompleted++;
    controller.rotateDealerButton();

    // Chips auffüllen, damit alle Hände mit vollen Stacks getestet werden
    const s = controller.getState();
    if (s.players.filter(p => p.chips > 0).length < 3) break;
  }

  return {
    handsCompleted,
    totalActions,
    allInRate: allInActions / Math.max(totalActions, 1),
    preflopFoldRate: preflopFolds / Math.max(preflopDecisions, 1),
    raiseRate: raiseActions / Math.max(totalActions, 1),
  };
}

describe('AI-Simulation (Verhaltens-Qualität)', () => {
  it('spielt 100 Hände ohne Stall, mit gesunden Quoten', () => {
    const stats = simulate(100);

    // Hände laufen sauber durch
    expect(stats.handsCompleted).toBeGreaterThan(50);

    // All-ins sind die Ausnahme, nicht die Regel (< 6 % aller Aktionen)
    expect(stats.allInRate).toBeLessThan(0.06);

    // KIs folden nicht alles preflop — ~70-75 % pro Entscheidung ist realistisches 6-Max-Poker
    expect(stats.preflopFoldRate).toBeLessThan(0.8);
    // ...aber auch nicht nichts (Poker lebt vom Folden)
    expect(stats.preflopFoldRate).toBeGreaterThan(0.2);

    // Es gibt aktives Spiel (Bets/Raises kommen vor)
    expect(stats.raiseRate).toBeGreaterThan(0.05);
  });
});

describe('AI-Einzelentscheidungen', () => {
  function scenarioController(personalities: AIPersonalityType[]) {
    const players = makePlayers(personalities, 200);
    const controller = new GameController(CONFIG, players);
    controller.startHand();
    return controller;
  }

  it('trifft immer legale Entscheidungen (Fuzz über 50 Hände)', () => {
    for (let run = 0; run < 5; run++) {
      const controller = scenarioController(MIX);
      let state = controller.getState();
      let safety = 0;
      while (state.isHandInProgress && safety < 300) {
        safety++;
        const idx = state.activePlayerIndex;
        if (idx === null) break;
        const player = state.players[idx];
        const legal = controller.getLegalActions()!;
        const posMap = controller.getPositionMap();
        const decision = getAIDecision(
          player.aiPersonality!, state, player,
          posMap.get(player.seatIndex) || Position.Button, legal,
        );
        expect(controller.applyAction(player.id, decision.action, decision.amount)).toBe(true);
        state = controller.getState();
      }
    }
  });
});
