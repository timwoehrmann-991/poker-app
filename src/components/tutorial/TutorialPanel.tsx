import React, { useState } from 'react';

const TABS = [
  { id: 'hands', label: 'Hand Rankings' },
  { id: 'odds', label: 'Odds & Outs' },
  { id: 'positions', label: 'Positionen' },
  { id: 'strategy', label: 'Strategie' },
  { id: 'glossary', label: 'Glossar' },
];

const HAND_RANKINGS = [
  { name: 'Royal Flush', example: 'A♠ K♠ Q♠ J♠ T♠', prob: '0.000154%', desc: 'A-K-Q-J-T gleiche Farbe' },
  { name: 'Straight Flush', example: '9♥ 8♥ 7♥ 6♥ 5♥', prob: '0.00139%', desc: 'Fünf aufeinanderfolgende Karten gleicher Farbe' },
  { name: 'Four of a Kind', example: 'K♠ K♥ K♦ K♣ 7♠', prob: '0.024%', desc: 'Vier Karten gleichen Werts' },
  { name: 'Full House', example: 'A♠ A♥ A♦ K♠ K♥', prob: '0.144%', desc: 'Drilling + Paar' },
  { name: 'Flush', example: 'A♦ J♦ 8♦ 5♦ 3♦', prob: '0.197%', desc: 'Fünf Karten gleicher Farbe' },
  { name: 'Straight', example: 'T♠ 9♥ 8♦ 7♣ 6♠', prob: '0.392%', desc: 'Fünf aufeinanderfolgende Karten' },
  { name: 'Three of a Kind', example: 'Q♠ Q♥ Q♦ 7♣ 2♠', prob: '2.11%', desc: 'Drei Karten gleichen Werts' },
  { name: 'Two Pair', example: 'J♠ J♥ 5♦ 5♣ A♠', prob: '4.75%', desc: 'Zwei verschiedene Paare' },
  { name: 'One Pair', example: '9♠ 9♥ A♦ K♣ 7♠', prob: '42.3%', desc: 'Zwei Karten gleichen Werts' },
  { name: 'High Card', example: 'A♠ J♦ 8♣ 5♥ 3♠', prob: '50.1%', desc: 'Keine Kombination' },
];

const OUTS_TABLE = [
  { draw: 'Flush Draw', outs: 9, flop: '35%', turn: '19.6%' },
  { draw: 'Open-Ended Straight', outs: 8, flop: '31.5%', turn: '17.4%' },
  { draw: 'Gutshot Straight', outs: 4, flop: '16.5%', turn: '8.7%' },
  { draw: 'Two Overcards', outs: 6, flop: '24.1%', turn: '13%' },
  { draw: 'Set to Full House/Quads', outs: 7, flop: '27.8%', turn: '15.2%' },
  { draw: 'Pair to Two Pair/Trips', outs: 5, flop: '20.4%', turn: '10.9%' },
  { draw: 'Flush + Straight Draw', outs: 15, flop: '54.1%', turn: '32.6%' },
  { draw: 'One Overcard', outs: 3, flop: '12.5%', turn: '6.5%' },
];

const GLOSSARY: { term: string; en: string; desc: string }[] = [
  { term: 'VPIP', en: 'Voluntarily Put Money In Pot', desc: 'Prozent der Hände, in denen ein Spieler freiwillig Geld in den Pot investiert' },
  { term: 'PFR', en: 'Pre-Flop Raise', desc: 'Prozent der Hände, in denen ein Spieler vor dem Flop erhöht' },
  { term: 'AF', en: 'Aggression Factor', desc: '(Bets + Raises) / Calls. Misst die Aggressivität eines Spielers' },
  { term: 'SPR', en: 'Stack-to-Pot Ratio', desc: 'Verhältnis des effektiven Stacks zum Pot. Niedrig = committed, Hoch = flexibel' },
  { term: 'GTO', en: 'Game Theory Optimal', desc: 'Spieltheoretisch optimale Strategie, die nicht ausgebeutet werden kann' },
  { term: 'ICM', en: 'Independent Chip Model', desc: 'Modell zur Berechnung des Turnierwertes von Chips' },
  { term: 'C-Bet', en: 'Continuation Bet', desc: 'Einsatz auf dem Flop nach einer Preflop-Erhöhung' },
  { term: 'Double Barrel', en: 'Double Barrel', desc: 'Zweite Bet auf dem Turn nach einer C-Bet auf dem Flop' },
  { term: 'Triple Barrel', en: 'Triple Barrel', desc: 'Dritte Bet auf dem River nach Double Barrel' },
  { term: 'Value Bet', en: 'Value Bet', desc: 'Einsatz mit einer Hand, die voraussichtlich die beste ist, um Wert zu extrahieren' },
  { term: 'Bluff', en: 'Bluff', desc: 'Einsatz mit einer schwachen Hand, um den Gegner zum Aufgeben zu bringen' },
  { term: 'Semi-Bluff', en: 'Semi-Bluff', desc: 'Bluff mit einer Draw-Hand, die sich noch verbessern kann' },
  { term: 'Donk Bet', en: 'Donk Bet', desc: 'Bet aus schlechter Position in den Aggressor der vorherigen Runde' },
  { term: 'Probe Bet', en: 'Probe Bet', desc: 'Bet wenn der Aggressor auf der vorherigen Street gecheckt hat' },
  { term: 'Blocking Bet', en: 'Blocking Bet', desc: 'Kleine Bet um eine größere Bet des Gegners zu verhindern' },
  { term: 'Check-Raise', en: 'Check-Raise', desc: 'Erst checken, dann erhöhen nachdem der Gegner gesetzt hat' },
  { term: 'Squeeze Play', en: 'Squeeze Play', desc: '3-Bet nach einem Raise und einem oder mehreren Calls' },
  { term: 'Isolation Raise', en: 'Isolation Raise', desc: 'Raise um einen schwachen Spieler zu isolieren' },
  { term: 'Slowplay', en: 'Slowplay', desc: 'Eine starke Hand passiv spielen, um Gegner im Pot zu halten' },
  { term: 'Trapping', en: 'Trapping', desc: 'Ähnlich wie Slowplay - Fallen stellen mit starker Hand' },
  { term: 'Pot Odds', en: 'Pot Odds', desc: 'Verhältnis des zu callenden Betrags zum aktuellen Pot' },
  { term: 'Implied Odds', en: 'Implied Odds', desc: 'Pot Odds plus erwartete zukünftige Gewinne' },
  { term: 'Equity', en: 'Equity', desc: 'Dein prozentualer Anteil am Pot basierend auf Gewinnwahrscheinlichkeit' },
  { term: 'EV', en: 'Expected Value', desc: 'Der mathematisch erwartete Gewinn/Verlust einer Aktion' },
  { term: 'Outs', en: 'Outs', desc: 'Karten im Deck, die deine Hand zur wahrscheinlich besten Hand verbessern' },
  { term: 'Dead Money', en: 'Dead Money', desc: 'Geld im Pot von Spielern, die bereits gefoldet haben' },
  { term: 'Drawing Dead', en: 'Drawing Dead', desc: 'Keine Karte kann deine Hand zur Gewinnerhand machen' },
  { term: 'Cooler', en: 'Cooler', desc: 'Situation wo zwei starke Hände aufeinandertreffen - unvermeidbar' },
  { term: 'Bad Beat', en: 'Bad Beat', desc: 'Verlieren trotz statistisch großer Favoritenrolle' },
  { term: 'Hero Call', en: 'Hero Call', desc: 'Call mit schwacher Hand basierend auf einem Read/Feeling' },
  { term: 'Hero Fold', en: 'Hero Fold', desc: 'Fold einer starken Hand basierend auf einem Read' },
  { term: 'Board Texture', en: 'Board Texture', desc: 'Beschreibung der Community Cards (dry, wet, monotone, rainbow, paired)' },
  { term: '3-Bet', en: 'Three-Bet', desc: 'Die dritte Erhöhung (Re-Raise des ursprünglichen Raises)' },
  { term: '4-Bet', en: 'Four-Bet', desc: 'Re-Raise einer 3-Bet' },
];

export const TutorialPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('hands');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div
      className="w-72 rounded-xl overflow-hidden flex flex-col"
      style={{
        background: 'var(--color-bg-panel)',
        border: '1px solid rgba(255,255,255,0.1)',
        maxHeight: '100%',
      }}
    >
      {/* Tab buttons */}
      <div className="flex overflow-x-auto border-b border-white/10">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-2 py-2 text-[10px] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              activeTab === tab.id
                ? 'text-yellow-400 border-b-2 border-yellow-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 text-xs">
        {activeTab === 'hands' && (
          <div className="space-y-2">
            <h4 className="font-bold text-white text-sm mb-2">Poker Hand Rankings</h4>
            {HAND_RANKINGS.map((hand, i) => (
              <div
                key={hand.name}
                className="p-2 rounded-lg"
                style={{ background: `rgba(255,255,255,${0.05 - i * 0.004})` }}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-bold text-white">{10 - i}. {hand.name}</span>
                  <span className="text-gray-500">{hand.prob}</span>
                </div>
                <div className="font-mono text-yellow-400 text-[11px]">{hand.example}</div>
                <div className="text-gray-400 mt-0.5">{hand.desc}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'odds' && (
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm">Rule of 2 and 4</h4>
            <p className="text-gray-400">
              <strong className="text-white">Flop → River:</strong> Outs × 4 = ca. Gewinnchance%
            </p>
            <p className="text-gray-400">
              <strong className="text-white">Turn → River:</strong> Outs × 2 = ca. Gewinnchance%
            </p>

            <h4 className="font-bold text-white text-sm mt-3">Outs-Tabelle</h4>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left py-1">Draw</th>
                  <th className="text-center">Outs</th>
                  <th className="text-center">Flop→R</th>
                  <th className="text-center">Turn→R</th>
                </tr>
              </thead>
              <tbody>
                {OUTS_TABLE.map(row => (
                  <tr key={row.draw} className="border-t border-white/5">
                    <td className="py-1 text-gray-300">{row.draw}</td>
                    <td className="text-center text-yellow-400 font-bold">{row.outs}</td>
                    <td className="text-center text-green-400">{row.flop}</td>
                    <td className="text-center text-blue-400">{row.turn}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 className="font-bold text-white text-sm mt-3">Pot Odds berechnen</h4>
            <div className="text-gray-400 space-y-1">
              <p>1. Call-Betrag bestimmen</p>
              <p>2. Pot-Größe nach dem Call berechnen</p>
              <p>3. Pot Odds = Call / (Pot + Call)</p>
              <p>4. Vergleiche mit Equity</p>
              <p className="text-green-400">→ Equity {'>'} Pot Odds = profitabler Call</p>
            </div>
          </div>
        )}

        {activeTab === 'positions' && (
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm">Tischpositionen</h4>

            <div className="space-y-2">
              <div className="p-2 rounded bg-red-900/20 border border-red-800/30">
                <div className="font-bold text-red-400">Early Position (EP)</div>
                <div className="text-gray-400">UTG, UTG+1, UTG+2</div>
                <div className="text-gray-500 mt-0.5">Nur starke Hände spielen. Du musst als Erster handeln.</div>
              </div>

              <div className="p-2 rounded bg-yellow-900/20 border border-yellow-800/30">
                <div className="font-bold text-yellow-400">Middle Position (MP)</div>
                <div className="text-gray-400">MP, HJ (Hijack)</div>
                <div className="text-gray-500 mt-0.5">Etwas breiter spielen als EP. Guter Platz für solide Hände.</div>
              </div>

              <div className="p-2 rounded bg-green-900/20 border border-green-800/30">
                <div className="font-bold text-green-400">Late Position (LP)</div>
                <div className="text-gray-400">CO (Cutoff), BTN (Button)</div>
                <div className="text-gray-500 mt-0.5">Beste Position! Breiteste Range. Information von allen anderen Spielern.</div>
              </div>

              <div className="p-2 rounded bg-blue-900/20 border border-blue-800/30">
                <div className="font-bold text-blue-400">Blinds</div>
                <div className="text-gray-400">SB (Small Blind), BB (Big Blind)</div>
                <div className="text-gray-500 mt-0.5">Schlechteste Post-Flop Position. Preflop-Discount durch Pflichteinzahlungen.</div>
              </div>
            </div>

            <p className="text-gray-500 mt-2">
              Position ist der wichtigste Faktor im Poker. Der Button ist die profitabelste Position.
            </p>
          </div>
        )}

        {activeTab === 'strategy' && (
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm">Preflop Starting Hands</h4>
            <div className="text-gray-400 space-y-1">
              <p><span className="text-green-400 font-bold">Premium:</span> AA, KK, QQ, AKs, AKo</p>
              <p><span className="text-yellow-400 font-bold">Strong:</span> JJ, TT, AQs, AQo, AJs, KQs</p>
              <p><span className="text-orange-400 font-bold">Playable:</span> 99-22, ATs+, KJs+, QJs, JTs</p>
              <p><span className="text-red-400 font-bold">Marginal:</span> A9s-, KTo, QTo, suited connectors</p>
            </div>

            <h4 className="font-bold text-white text-sm mt-3">Continuation Bet (C-Bet)</h4>
            <div className="text-gray-400 space-y-1">
              <p>• Bet auf dem Flop nach Preflop-Raise</p>
              <p>• Standard-Größe: 50-66% des Pots</p>
              <p>• Funktioniert besser auf trockenen Boards</p>
              <p>• Reduce C-Bet Frequenz auf nassen Boards</p>
            </div>

            <h4 className="font-bold text-white text-sm mt-3">3-Bet Ranges</h4>
            <div className="text-gray-400 space-y-1">
              <p><span className="text-green-400">Value 3-Bet:</span> QQ+, AKs, AKo</p>
              <p><span className="text-orange-400">Bluff 3-Bet:</span> A5s-A2s, KQs (positionsabhängig)</p>
              <p>• 3-Bet Size: 3-3.5x der originalen Raise</p>
            </div>

            <h4 className="font-bold text-white text-sm mt-3">Tipps</h4>
            <div className="text-gray-400 space-y-1">
              <p>• Position {'>'} Karten</p>
              <p>• Tight spielen in Early Position</p>
              <p>• Aggression zahlt sich aus</p>
              <p>• Pot Control mit mittleren Händen</p>
              <p>• Gegner beobachten und anpassen</p>
            </div>
          </div>
        )}

        {activeTab === 'glossary' && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Suche..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1.5 rounded bg-black/30 border border-white/10 text-white text-xs placeholder-gray-500 focus:border-yellow-500 focus:outline-none mb-2"
            />
            {GLOSSARY
              .filter(g =>
                g.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                g.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
                g.en.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(g => (
                <div key={g.term} className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex justify-between">
                    <span className="font-bold text-yellow-400">{g.term}</span>
                    <span className="text-gray-600 text-[9px]">{g.en}</span>
                  </div>
                  <div className="text-gray-400 mt-0.5">{g.desc}</div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
