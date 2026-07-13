import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PlayerStatus, HandCategory, GameState } from '../../engine/types';
import { evaluateHand } from '../../engine/evaluator/HandEvaluator';
import { getTotalPot } from '../../engine/game/PotManager';
import { cardToString } from '../../engine/deck/Card';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
}

function generateAdvice(question: string, gameState: GameState | null): string {
  if (!gameState) return 'Starte zuerst ein Spiel, damit ich dir helfen kann!';

  const human = gameState.players.find(p => p.isHuman);
  if (!human?.holeCards) return 'Du hast noch keine Karten. Warte auf die nächste Hand.';

  const holeStr = human.holeCards.map(cardToString).join(' ');
  const communityStr = gameState.communityCards.map(cardToString).join(' ');
  const totalPot = getTotalPot(gameState.pots) + gameState.players.reduce((s, p) => s + p.currentBet, 0);
  const activePlayers = gameState.players.filter(p => p.status === PlayerStatus.Active || p.status === PlayerStatus.AllIn).length;
  const q = question.toLowerCase();

  // Evaluate current hand if we have community cards
  let handDesc = '';
  let handStrength = '';
  if (gameState.communityCards.length >= 3) {
    const evaluated = evaluateHand([...human.holeCards, ...gameState.communityCards]);
    handDesc = evaluated.description;
    if (evaluated.category >= HandCategory.ThreeOfAKind) handStrength = 'stark';
    else if (evaluated.category >= HandCategory.OnePair) handStrength = 'mittel';
    else handStrength = 'schwach';
  }

  // Question-specific responses
  if (q.includes('odds') || q.includes('flush') || q.includes('straight') || q.includes('draw')) {
    if (gameState.communityCards.length >= 3) {
      const suitCounts: Record<string, number> = {};
      [...human.holeCards, ...gameState.communityCards].forEach(c => {
        suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
      });
      const hasFlushDraw = Object.values(suitCounts).some(c => c === 4);
      if (hasFlushDraw) {
        return `Du hast einen Flush Draw! Das sind 9 Outs. ${gameState.communityCards.length === 3 ? 'Mit der Rule of 4 hast du ca. 36% Chance bis zum River.' : 'Mit der Rule of 2 hast du ca. 18% Chance auf dem River.'}`;
      }
      return `Deine aktuelle Hand: ${handDesc}. Schau dir den Odds Calculator links an für genaue Wahrscheinlichkeiten.`;
    }
    return 'Warte auf die Community Cards für eine Odds-Berechnung.';
  }

  if (q.includes('call') || q.includes('fold') || q.includes('sollte')) {
    const toCall = Math.max(0, Math.max(...gameState.players.map(p => p.currentBet)) - human.currentBet);
    if (toCall === 0) return `Du kannst checken! Kein Call nötig. Deine Hand: ${holeStr}${handDesc ? ` (${handDesc})` : ''}.`;

    const potOdds = toCall / (totalPot + toCall);
    return `Call: €${toCall} in einen €${totalPot} Pot.\nPot Odds: ${(potOdds * 100).toFixed(1)}%.\n${handDesc ? `Deine Hand: ${handDesc} (${handStrength}).` : ''}\n${potOdds < 0.25 ? 'Die Pot Odds sind gut - ein Call kann sich lohnen.' : 'Die Pot Odds sind hoch - du brauchst eine starke Hand oder gute Draws.'}`;
  }

  if (q.includes('raise') || q.includes('erhöh') || q.includes('bet') || q.includes('setz')) {
    return `Pot: €${totalPot}, ${activePlayers} Spieler aktiv.\n${handStrength === 'stark' ? 'Deine Hand ist stark - eine Value Bet/Raise ist sinnvoll! Setze ca. 50-75% des Pots.' : handStrength === 'mittel' ? 'Mittlere Hand - Pot Control! Check-Call oder kleine Bets.' : 'Schwache Hand - Bluff nur wenn du einen guten Read hast. Position beachten!'}`;
  }

  if (q.includes('bluff')) {
    return `Bluff-Tipps:\n• Bluff am besten in Position (Button/Cutoff)\n• Gegen wenige Gegner (1-2)\n• Auf trockenen Boards\n• Dein Bluff muss eine "Geschichte erzählen"\n• Semi-Bluffs (mit Draws) sind besser als Pure Bluffs\nAktuell ${activePlayers} Spieler - ${activePlayers <= 2 ? 'gute Bluff-Situation!' : 'zu viele Gegner für einen Bluff.'}`;
  }

  if (q.includes('spr') || q.includes('stack')) {
    // SPR immer mit dem EFFEKTIVEN Stack rechnen — mehr als der größte
    // Gegnerstack kann nie gewonnen oder verloren werden
    const maxOpponent = Math.max(0, ...gameState.players
      .filter(p => !p.isHuman && (p.status === PlayerStatus.Active || p.status === PlayerStatus.AllIn))
      .map(p => p.chips + p.currentBet));
    const effectiveStack = Math.min(human.chips + human.currentBet, maxOpponent);
    const spr = effectiveStack / Math.max(1, totalPot);
    return `SPR (Stack-to-Pot Ratio): ${spr.toFixed(1)}\n• SPR < 4: Du bist "committed" - Starke Hände all-in spielen\n• SPR 4-10: Mittlerer SPR - Top Pair ist gut genug für Stack-Off\n• SPR > 10: Hoher SPR - Du brauchst starke Hände für den ganzen Stack\nEffektiver Stack: €${effectiveStack} (dein Stack €${human.chips}, größter Gegner €${maxOpponent}), Pot: €${totalPot}`;
  }

  if (q.includes('calling station')) {
    return `Gegen Calling Stations:\n• NICHT bluffen! Sie callen zu viel\n• Value Bet breit mit mittleren+ Händen\n• Größer setzen mit starken Händen\n• Sie machen sich langfristig kaputt durch zu viele Calls`;
  }

  if (q.includes('3-bet') || q.includes('3bet') || q.includes('drei')) {
    return `3-Betting erklärt:\n• Eine 3-Bet ist ein Re-Raise nach einem Open-Raise\n• Value 3-Bet: QQ+, AKs, AKo\n• Bluff 3-Bet: A5s-A2s, KQs (blocken Aces)\n• Größe: 3-3.5x der originalen Raise\n• In Position: Etwas kleiner (3x)\n• Out of Position: Etwas größer (3.5x)`;
  }

  // General response
  return `Deine Hand: ${holeStr}${communityStr ? ` | Board: ${communityStr}` : ''}\n${handDesc ? `Aktuell: ${handDesc}` : 'Preflop - schaue auf die Starting Hand Charts im Tutorial.'}\nPot: €${totalPot}, ${activePlayers} Spieler aktiv.\nFrag mich etwas Spezifisches! Z.B. "Sollte ich callen?", "Was sind meine Odds?", "Wann bluffen?"`;
}

export const StrategyChat: React.FC = () => {
  const gameState = useGameStore(s => s.gameState);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, role: 'assistant', text: 'Hi! Ich bin dein Strategie-Berater. Frag mich alles über Poker! 🃏\n\nBeispiele:\n• "Sollte ich callen oder folden?"\n• "Was sind meine Odds?"\n• "Erkläre 3-Betting"\n• "Wann sollte ich bluffen?"' },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now(), role: 'user', text: input.trim() };
    const response = generateAdvice(input.trim(), gameState);
    const assistantMsg: ChatMessage = { id: Date.now() + 1, role: 'assistant', text: response };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
  };

  return (
    <div
      className="w-72 rounded-xl flex flex-col overflow-hidden"
      style={{
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--border-subtle)',
        height: 350,
      }}
    >
      <div className="px-3 py-2 border-b border-[color:var(--border-subtle)]">
        <h3 className="text-xs font-bold text-[color:var(--text-secondary)] uppercase tracking-wider">
          Strategie-Chat
        </h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-2">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`text-xs p-2 rounded-lg whitespace-pre-line ${
              msg.role === 'user'
                ? 'bg-blue-900/40 text-blue-200 ml-4'
                : 'bg-white/5 text-[color:var(--text-secondary)] mr-4'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="p-2 border-t border-[color:var(--border-subtle)] flex gap-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Frag mich etwas..."
          className="flex-1 px-2 py-1.5 rounded bg-[color:var(--surface-inset)] border border-[color:var(--border-subtle)] text-[color:var(--text-primary)] text-xs placeholder-[color:var(--text-tertiary)] focus:border-yellow-500 focus:outline-none"
        />
        <button
          onClick={handleSend}
          className="px-3 py-1.5 rounded bg-yellow-600 hover:bg-yellow-500 text-[color:var(--text-primary)] text-xs font-bold transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
};
