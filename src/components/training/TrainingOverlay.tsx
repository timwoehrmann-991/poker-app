import React, { useState, useMemo, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSettingsStore } from '../../store/settingsStore';
import {
  ActionType, AIPersonalityType, Position, PlayerStatus, Street,
} from '../../engine/types';
import { getAIDecision, AIDecisionResult } from '../../ai/AIPlayer';
import { computeLegalActions } from '../../engine/game/ActionValidator';
import { useTranslation } from '../../i18n';

interface TrainingFeedback {
  playerAction: ActionType;
  playerAmount: number;
  optimalAction: ActionType;
  optimalAmount: number;
  reasoning: string;
  isOptimal: boolean;
  rating: 'excellent' | 'good' | 'okay' | 'mistake' | 'blunder';
}

export const TrainingOverlay: React.FC = () => {
  const { t } = useTranslation();
  const beginnerMode = useSettingsStore(s => s.beginnerMode);
  const gameState = useGameStore(s => s.gameState);
  const controller = useGameStore(s => s.controller);

  const [feedback, setFeedback] = useState<TrainingFeedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastHandNumber, setLastHandNumber] = useState(0);
  const [feedbackHistory, setFeedbackHistory] = useState<TrainingFeedback[]>([]);

  // Track when human takes an action - compute optimal play
  const actionCount = gameState?.actionHistory.length || 0;

  useEffect(() => {
    if (!beginnerMode || !gameState || !controller) return;

    // Check if the last action was from the human player
    if (actionCount === 0) return;
    const lastAction = gameState.actionHistory[actionCount - 1];
    if (!lastAction) return;

    const humanPlayer = gameState.players.find(p => p.isHuman);
    if (!humanPlayer || lastAction.playerId !== humanPlayer.id) return;

    // Skip blind posts
    if (lastAction.type === ActionType.PostSmallBlind || lastAction.type === ActionType.PostBigBlind) return;

    // We need to compute what the GTO AI would have done in this situation
    // We use the state BEFORE the action was taken, which we approximate
    // by creating a synthetic context
    try {
      const posMap = controller.getPositionMap();
      const position = posMap.get(humanPlayer.seatIndex) || Position.Button;

      // Get legal actions for comparison (approximate - use current state's context)
      const legalActions = computeLegalActions(
        humanPlayer,
        gameState.config.bigBlind, // approximate highestBet
        gameState.config.bigBlind,
        gameState.street,
        gameState.config.bigBlind,
      );

      // Ask GTO AI what it would do
      const gtoDecision = getAIDecision(
        AIPersonalityType.GTOBalanced,
        gameState,
        humanPlayer,
        position,
        legalActions,
      );

      const fb = computeFeedback(lastAction.type, lastAction.amount, gtoDecision);
      setFeedback(fb);
      setShowFeedback(true);
      setFeedbackHistory(prev => [...prev.slice(-19), fb]); // Keep last 20

      // Auto-hide after 3 seconds
      const timer = setTimeout(() => setShowFeedback(false), 3500);
      return () => clearTimeout(timer);
    } catch {
      // Silently fail - don't interrupt gameplay
    }
  }, [actionCount, beginnerMode]);

  // Show hint before human acts
  const [hint, setHint] = useState<AIDecisionResult | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Compute hint when it's human's turn
  useEffect(() => {
    if (!beginnerMode || !gameState || !controller) {
      setHint(null);
      return;
    }

    if (gameState.activePlayerIndex === null) return;
    const activePlayer = gameState.players[gameState.activePlayerIndex];
    if (!activePlayer.isHuman) {
      setHint(null);
      return;
    }

    try {
      const posMap = controller.getPositionMap();
      const position = posMap.get(activePlayer.seatIndex) || Position.Button;
      const legalActions = controller.getLegalActions(activePlayer.id);
      if (!legalActions) return;

      const gtoDecision = getAIDecision(
        AIPersonalityType.GTOBalanced,
        gameState,
        activePlayer,
        position,
        legalActions,
      );

      setHint(gtoDecision);
    } catch {
      setHint(null);
    }
  }, [gameState?.activePlayerIndex, beginnerMode]);

  if (!beginnerMode) return null;

  const isHumanTurn = gameState?.activePlayerIndex !== null &&
    gameState?.players[gameState.activePlayerIndex!]?.isHuman;

  // Calculate session accuracy
  const accuracy = feedbackHistory.length > 0
    ? (feedbackHistory.filter(f => f.isOptimal || f.rating === 'good').length / feedbackHistory.length * 100).toFixed(0)
    : null;

  return (
    <>
      {/* Hint bar - shows when it's human's turn */}
      {isHumanTurn && hint && showHint && (
        <div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-lg text-sm max-w-md text-center"
          style={{
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(155, 89, 182, 0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="text-purple-400 font-bold text-xs mb-1">
            💡 Tipp vom GTO-Bot
          </div>
          <div className="text-gray-200 text-xs">
            {formatActionLabel(hint.action)}{hint.amount > 0 ? ` €${hint.amount}` : ''}
            {hint.reasoning && (
              <span className="text-gray-400 ml-1">- {hint.reasoning}</span>
            )}
          </div>
        </div>
      )}

      {/* Hint toggle button (when it's human's turn) */}
      {isHumanTurn && hint && (
        <button
          onClick={() => setShowHint(!showHint)}
          className={`absolute bottom-16 left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-full text-xs font-medium transition-all ${
            showHint
              ? 'bg-purple-600/40 text-purple-300 border border-purple-500/50'
              : 'bg-white/10 text-gray-400 hover:bg-white/20 border border-white/10'
          }`}
        >
          {showHint ? '🙈 Tipp ausblenden' : '💡 Tipp anzeigen'}
        </button>
      )}

      {/* Feedback toast - shows after human acts */}
      {showFeedback && feedback && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm animate-feedback-in"
          style={{
            background: 'rgba(0,0,0,0.9)',
            border: `1px solid ${getRatingColor(feedback.rating)}40`,
            backdropFilter: 'blur(8px)',
            minWidth: 250,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getRatingEmoji(feedback.rating)}</span>
            <span
              className="font-bold text-xs uppercase tracking-wider"
              style={{ color: getRatingColor(feedback.rating) }}
            >
              {getRatingLabel(feedback.rating)}
            </span>
          </div>
          {!feedback.isOptimal && (
            <div className="text-gray-300 text-xs">
              Optimal: <span className="text-green-400 font-medium">
                {formatActionLabel(feedback.optimalAction)}
                {feedback.optimalAmount > 0 ? ` €${feedback.optimalAmount}` : ''}
              </span>
            </div>
          )}
          {feedback.reasoning && (
            <div className="text-gray-500 text-[10px] mt-1">{feedback.reasoning}</div>
          )}
        </div>
      )}

      {/* Session accuracy badge */}
      {accuracy !== null && feedbackHistory.length >= 3 && (
        <div className="absolute top-2 right-3 z-30 text-[10px] px-2 py-1 rounded-full bg-purple-900/40 text-purple-300 border border-purple-500/20">
          Training: {accuracy}% korrekt ({feedbackHistory.length} Aktionen)
        </div>
      )}
    </>
  );
};

function computeFeedback(
  playerAction: ActionType,
  playerAmount: number,
  gtoDecision: AIDecisionResult,
): TrainingFeedback {
  const isExactMatch = playerAction === gtoDecision.action;
  const isSimilar = areSimilarActions(playerAction, gtoDecision.action);

  let rating: TrainingFeedback['rating'];
  if (isExactMatch) {
    rating = 'excellent';
  } else if (isSimilar) {
    rating = 'good';
  } else if (isPassiveVariant(playerAction, gtoDecision.action)) {
    rating = 'okay';
  } else if (playerAction === ActionType.Fold &&
    (gtoDecision.action === ActionType.Raise || gtoDecision.action === ActionType.Bet)) {
    rating = 'blunder';
  } else {
    rating = 'mistake';
  }

  return {
    playerAction,
    playerAmount,
    optimalAction: gtoDecision.action,
    optimalAmount: gtoDecision.amount,
    reasoning: gtoDecision.reasoning,
    isOptimal: isExactMatch,
    rating,
  };
}

function areSimilarActions(a: ActionType, b: ActionType): boolean {
  // Call/Check are similar passive actions
  if ((a === ActionType.Call || a === ActionType.Check) &&
      (b === ActionType.Call || b === ActionType.Check)) return true;
  // Bet/Raise are similar aggressive actions
  if ((a === ActionType.Bet || a === ActionType.Raise || a === ActionType.AllIn) &&
      (b === ActionType.Bet || b === ActionType.Raise || b === ActionType.AllIn)) return true;
  return false;
}

function isPassiveVariant(player: ActionType, optimal: ActionType): boolean {
  // Calling when you should raise is "okay"
  if ((player === ActionType.Call || player === ActionType.Check) &&
      (optimal === ActionType.Bet || optimal === ActionType.Raise)) return true;
  return false;
}

function formatActionLabel(action: ActionType): string {
  const labels: Record<string, string> = {
    fold: 'Fold',
    check: 'Check',
    call: 'Call',
    bet: 'Bet',
    raise: 'Raise',
    allIn: 'All-In',
  };
  return labels[action] || action;
}

function getRatingColor(rating: TrainingFeedback['rating']): string {
  switch (rating) {
    case 'excellent': return '#2ecc71';
    case 'good': return '#27ae60';
    case 'okay': return '#f39c12';
    case 'mistake': return '#e67e22';
    case 'blunder': return '#e74c3c';
  }
}

function getRatingEmoji(rating: TrainingFeedback['rating']): string {
  switch (rating) {
    case 'excellent': return '🎯';
    case 'good': return '👍';
    case 'okay': return '🤔';
    case 'mistake': return '⚠️';
    case 'blunder': return '❌';
  }
}

function getRatingLabel(rating: TrainingFeedback['rating']): string {
  switch (rating) {
    case 'excellent': return 'Perfekt!';
    case 'good': return 'Gut gespielt';
    case 'okay': return 'Akzeptabel';
    case 'mistake': return 'Fehler';
    case 'blunder': return 'Grober Fehler';
  }
}
