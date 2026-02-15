import React, { useState } from 'react';
import { AIPersonalityType } from '../../engine/types';
import { useGameStore, GameSetupConfig } from '../../store/gameStore';
import { useTranslation } from '../../i18n';

const PERSONALITY_OPTIONS = [
  { value: AIPersonalityType.TAG, label: 'ai.tag' as const, emoji: '🦈', desc: 'VPIP 20%, AF 70%' },
  { value: AIPersonalityType.Rock, label: 'ai.rock' as const, emoji: '🪨', desc: 'VPIP 15%, AF 30%' },
  { value: AIPersonalityType.CallingStation, label: 'ai.callingStation' as const, emoji: '📞', desc: 'VPIP 45%, AF 20%' },
  { value: AIPersonalityType.LAGManiac, label: 'ai.lagManiac' as const, emoji: '🃏', desc: 'VPIP 35%, AF 80%' },
  { value: AIPersonalityType.GTOBalanced, label: 'ai.gtoBalanced' as const, emoji: '⚖️', desc: 'VPIP 25%, AF 60%' },
  { value: AIPersonalityType.ShortStack, label: 'ai.shortStack' as const, emoji: '📊', desc: 'Push/Fold <20BB' },
  { value: AIPersonalityType.Nit, label: 'ai.nit' as const, emoji: '🔒', desc: 'VPIP 10%, nur Premium' },
];

const DEFAULT_PERSONALITIES = [
  AIPersonalityType.TAG,
  AIPersonalityType.CallingStation,
  AIPersonalityType.LAGManiac,
  AIPersonalityType.Rock,
  AIPersonalityType.GTOBalanced,
  AIPersonalityType.Nit,
  AIPersonalityType.ShortStack,
  AIPersonalityType.TAG,
  AIPersonalityType.CallingStation,
];

export const GameSetup: React.FC = () => {
  const { t } = useTranslation();
  const startGame = useGameStore(s => s.startGame);

  const [playerCount, setPlayerCount] = useState(6);
  const [smallBlind, setSmallBlind] = useState(1);
  const [bigBlind, setBigBlind] = useState(2);
  const [startingChips, setStartingChips] = useState(200);
  const [playerName, setPlayerName] = useState('');
  const [aiPersonalities, setAiPersonalities] = useState<AIPersonalityType[]>(DEFAULT_PERSONALITIES);

  const handleStart = () => {
    const setup: GameSetupConfig = {
      playerCount,
      smallBlind,
      bigBlind,
      startingChips,
      humanName: playerName || 'Player',
      aiPersonalities: aiPersonalities.slice(0, playerCount - 1),
    };
    startGame(setup);
  };

  const updateAI = (index: number, personality: AIPersonalityType) => {
    const updated = [...aiPersonalities];
    updated[index] = personality;
    setAiPersonalities(updated);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <div
        className="w-full max-w-lg rounded-2xl p-8 shadow-2xl"
        style={{
          background: 'var(--color-bg-panel)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">♠♥♦♣</div>
          <h1 className="text-3xl font-bold text-white">
            {t('setup.title')}
          </h1>
          <p className="text-gray-400 text-sm mt-1">{t('setup.subtitle')}</p>
        </div>

        {/* Player Name */}
        <div className="mb-5">
          <label className="block text-sm text-gray-400 mb-1">{t('setup.yourName')}</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Player"
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition"
          />
        </div>

        {/* Player Count */}
        <div className="mb-5">
          <label className="block text-sm text-gray-400 mb-2">
            {t('setup.playerCount')}: <span className="text-white font-bold">{playerCount}</span>
          </label>
          <input
            type="range"
            min={2}
            max={10}
            value={playerCount}
            onChange={(e) => setPlayerCount(Number(e.target.value))}
            className="w-full accent-yellow-500"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>2 (Heads-Up)</span>
            <span>6 (Standard)</span>
            <span>10 (Full Ring)</span>
          </div>
        </div>

        {/* Blinds */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('setup.smallBlind')}</label>
            <div className="flex items-center gap-1">
              <span className="text-gray-400">€</span>
              <input
                type="number"
                value={smallBlind}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value));
                  setSmallBlind(val);
                  setBigBlind(val * 2);
                }}
                min={1}
                className="w-full px-2 py-1.5 rounded bg-black/30 border border-white/10 text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('setup.bigBlind')}</label>
            <div className="flex items-center gap-1">
              <span className="text-gray-400">€</span>
              <input
                type="number"
                value={bigBlind}
                onChange={(e) => setBigBlind(Math.max(smallBlind, Number(e.target.value)))}
                min={smallBlind}
                className="w-full px-2 py-1.5 rounded bg-black/30 border border-white/10 text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Starting Chips */}
        <div className="mb-5">
          <label className="block text-sm text-gray-400 mb-1">{t('setup.startingChips')}</label>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">€</span>
            <input
              type="number"
              value={startingChips}
              onChange={(e) => setStartingChips(Math.max(bigBlind * 10, Number(e.target.value)))}
              min={bigBlind * 10}
              step={bigBlind * 10}
              className="w-full px-2 py-1.5 rounded bg-black/30 border border-white/10 text-white focus:border-yellow-500 focus:outline-none"
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            = {(startingChips / bigBlind).toFixed(0)} Big Blinds
          </div>
        </div>

        {/* AI Opponents */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">{t('setup.aiOpponents')}</label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {Array.from({ length: playerCount - 1 }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">Seat {i + 2}</span>
                <select
                  value={aiPersonalities[i] || AIPersonalityType.TAG}
                  onChange={(e) => updateAI(i, e.target.value as AIPersonalityType)}
                  className="flex-1 px-2 py-1.5 rounded bg-black/30 border border-white/10 text-white text-sm focus:border-yellow-500 focus:outline-none cursor-pointer"
                >
                  {PERSONALITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.emoji} {t(opt.label)} ({opt.desc})
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="w-full py-3 rounded-xl font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(46, 204, 113, 0.3)',
          }}
        >
          {t('setup.startGame')} ♠
        </button>
      </div>
    </div>
  );
};
