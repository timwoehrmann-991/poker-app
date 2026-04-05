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
      {/* ── All overlays use position:fixed so they sit in the viewport
           bottom-right corner without ever blocking the table view ── */}

      {/* Feedback toast — appears after human acts, bottom-right */}
      {showFeedback && feedback && (
        <div style={{
          position: 'fixed', bottom: 90, right: 16, zIndex: 60,
          background: 'rgba(8,8,16,0.94)', backdropFilter: 'blur(14px)',
          border: `1px solid ${getRatingColor(feedback.rating)}50`,
          borderRadius: 14, padding: '10px 14px',
          minWidth: 200, maxWidth: 280,
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${getRatingColor(feedback.rating)}20`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>{getRatingEmoji(feedback.rating)}</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: getRatingColor(feedback.rating) }}>
              {getRatingLabel(feedback.rating)}
            </span>
          </div>
          {!feedback.isOptimal && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
              Optimal:{' '}
              <span style={{ color: '#30d158', fontWeight: 600 }}>
                {formatActionLabel(feedback.optimalAction)}
                {feedback.optimalAmount > 0 ? ` €${feedback.optimalAmount}` : ''}
              </span>
            </div>
          )}
          {feedback.reasoning && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
              {feedback.reasoning}
            </div>
          )}
        </div>
      )}

      {/* Hint content — appears above toggle button */}
      {isHumanTurn && hint && showHint && (
        <div style={{
          position: 'fixed', bottom: 90, right: 16, zIndex: 59,
          background: 'rgba(8,8,16,0.94)', backdropFilter: 'blur(14px)',
          border: '1px solid rgba(155,89,182,0.45)',
          borderRadius: 14, padding: '10px 14px',
          maxWidth: 260,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#bf5af2', letterSpacing: '0.06em', marginBottom: 5 }}>
            💡 GTO-Empfehlung
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
            {formatActionLabel(hint.action)}{hint.amount > 0 ? ` €${hint.amount}` : ''}
          </div>
          {hint.reasoning && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              {hint.reasoning}
            </div>
          )}
        </div>
      )}

      {/* Hint toggle button — fixed bottom-right, only on human's turn */}
      {isHumanTurn && hint && (
        <button
          onClick={() => setShowHint(v => !v)}
          style={{
            position: 'fixed', bottom: 20, right: 16, zIndex: 60,
            padding: '8px 14px', borderRadius: 24,
            background: showHint ? 'rgba(191,90,242,0.85)' : 'rgba(20,20,35,0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid ' + (showHint ? 'rgba(191,90,242,0.6)' : 'rgba(255,255,255,0.12)'),
            color: showHint ? '#fff' : 'rgba(255,255,255,0.6)',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            boxShadow: showHint ? '0 4px 20px rgba(191,90,242,0.35)' : '0 2px 12px rgba(0,0,0,0.4)',
            transition: 'all 0.15s',
            touchAction: 'manipulation',
          }}
        >
          {showHint ? '🙈 Tipp aus' : '💡 Tipp'}
        </button>
      )}

      {/* Session accuracy badge — top-right, small, not obstructive */}
      {accuracy !== null && feedbackHistory.length >= 3 && (
        <div style={{
          position: 'fixed', top: 54, right: 10, zIndex: 30,
          fontSize: 10, padding: '3px 8px', borderRadius: 12,
          background: 'rgba(100,60,170,0.35)', color: 'rgba(191,90,242,0.9)',
          border: '1px solid rgba(191,90,242,0.2)',
          backdropFilter: 'blur(8px)',
        }}>
          🎓 {accuracy}% ({feedbackHistory.length})
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
