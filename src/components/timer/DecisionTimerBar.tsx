import React from 'react';
import { DecisionTimerState } from '../../hooks/useDecisionTimer';

interface DecisionTimerBarProps {
  timer: DecisionTimerState;
}

export const DecisionTimerBar: React.FC<DecisionTimerBarProps> = React.memo(({ timer }) => {
  if (!timer.isRunning) return null;

  const { progress, isWarning, timeRemaining } = timer;
  const seconds = Math.ceil(timeRemaining);

  // Color transitions: green -> yellow -> red
  let barColor: string;
  if (progress > 0.5) {
    barColor = '#2ecc71'; // Green
  } else if (progress > 0.2) {
    barColor = '#f39c12'; // Yellow/Orange
  } else {
    barColor = '#e74c3c'; // Red
  }

  return (
    <div className="w-full mb-2">
      {/* Timer bar */}
      <div
        className="relative h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.1)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progress * 100}%`,
            background: barColor,
            transition: 'width 0.1s linear, background 0.5s ease',
            boxShadow: isWarning ? `0 0 8px ${barColor}` : 'none',
          }}
        />
      </div>

      {/* Time remaining display */}
      {isWarning && (
        <div
          className="text-center mt-1 text-xs font-bold animate-pulse"
          style={{ color: barColor }}
        >
          {seconds}s
        </div>
      )}
    </div>
  );
});

DecisionTimerBar.displayName = 'DecisionTimerBar';

// Circular timer for player seat
export const DecisionTimerRing: React.FC<{
  progress: number;
  isWarning: boolean;
  size?: number;
}> = React.memo(({ progress, isWarning, size = 60 }) => {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  let strokeColor: string;
  if (progress > 0.5) {
    strokeColor = '#2ecc71';
  } else if (progress > 0.2) {
    strokeColor = '#f39c12';
  } else {
    strokeColor = '#e74c3c';
  }

  return (
    <svg
      width={size}
      height={size}
      className="absolute -inset-1 z-0"
      style={{ transform: 'rotate(-90deg)' }}
    >
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={2}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{
          transition: 'stroke-dashoffset 0.1s linear, stroke 0.5s ease',
          filter: isWarning ? `drop-shadow(0 0 4px ${strokeColor})` : 'none',
        }}
      />
    </svg>
  );
});

DecisionTimerRing.displayName = 'DecisionTimerRing';
