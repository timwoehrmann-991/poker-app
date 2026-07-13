import React, { useState } from 'react';

const TABS = [
  { id: 'hands',     label: 'Blätter',  icon: '🃏' },
  { id: 'odds',      label: 'Odds',     icon: '📐' },
  { id: 'positions', label: 'Position', icon: '📍' },
  { id: 'strategy',  label: 'Strategie',icon: '♟️' },
  { id: 'glossary',  label: 'Glossar',  icon: '📚' },
];

const HAND_RANKINGS = [
  { name: 'Royal Flush', example: 'A♠ K♠ Q♠ J♠ T♠', prob: '0.000154%', desc: 'A-K-Q-J-T gleiche Farbe', tier: 'legendary' },
  { name: 'Straight Flush', example: '9♥ 8♥ 7♥ 6♥ 5♥', prob: '0.00139%', desc: 'Fünf aufeinanderfolgende Karten gleicher Farbe', tier: 'legendary' },
  { name: 'Four of a Kind', example: 'K♠ K♥ K♦ K♣ 7♠', prob: '0.024%', desc: 'Vier Karten gleichen Werts', tier: 'epic' },
  { name: 'Full House', example: 'A♠ A♥ A♦ K♠ K♥', prob: '0.144%', desc: 'Drilling + Paar', tier: 'epic' },
  { name: 'Flush', example: 'A♦ J♦ 8♦ 5♦ 3♦', prob: '0.197%', desc: 'Fünf Karten gleicher Farbe', tier: 'strong' },
  { name: 'Straight', example: 'T♠ 9♥ 8♦ 7♣ 6♠', prob: '0.392%', desc: 'Fünf aufeinanderfolgende Karten', tier: 'strong' },
  { name: 'Three of a Kind', example: 'Q♠ Q♥ Q♦ 7♣ 2♠', prob: '2.11%', desc: 'Drei Karten gleichen Werts', tier: 'medium' },
  { name: 'Two Pair', example: 'J♠ J♥ 5♦ 5♣ A♠', prob: '4.75%', desc: 'Zwei verschiedene Paare', tier: 'medium' },
  { name: 'One Pair', example: '9♠ 9♥ A♦ K♣ 7♠', prob: '42.3%', desc: 'Zwei Karten gleichen Werts', tier: 'common' },
  { name: 'High Card', example: 'A♠ J♦ 8♣ 5♥ 3♠', prob: '50.1%', desc: 'Keine Kombination', tier: 'common' },
];

const TIER_COLORS: Record<string, string> = {
  legendary: '#e3b64a',
  epic: '#bf5af2',
  strong: '#0a84ff',
  medium: '#ff9f0a',
  common: '#8e8e93',
};

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

/** Beispielhand mit eingefärbten Suits rendern */
const ExampleCards: React.FC<{ example: string }> = ({ example }) => (
  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
    {example.split(' ').map((c, i) => {
      const isRed = c.includes('♥') || c.includes('♦');
      return (
        <span key={i} style={{
          fontSize: 10, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          padding: '2px 5px', borderRadius: 5, lineHeight: 1.3,
          background: 'var(--color-card-bg)',
          border: '1px solid var(--color-card-border)',
          color: isRed ? 'var(--color-card-red)' : 'var(--color-card-black)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}>{c}</span>
      );
    })}
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>{children}</h4>
);

export const TutorialPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('hands');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div
      className="w-full rounded-xl overflow-hidden flex flex-col"
      style={{
        background: 'var(--surface-panel)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--glass-shadow)',
        maxHeight: '100%',
      }}
    >
      {/* Tab buttons */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
            style={{
              flex: 1,
              padding: '7px 2px',
              background: activeTab === tab.id ? 'var(--color-accent-soft)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              borderBottom: activeTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 14 }}>{tab.icon}</span>
            <span style={{
              fontSize: 8,
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--text-tertiary)',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}>
              {tab.label.slice(0, 4)}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto" style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '14px 14px 16px' }}>
        {activeTab === 'hands' && (
          <div className="space-y-2">
            <SectionTitle>Poker Hand Rankings</SectionTitle>
            {HAND_RANKINGS.map((hand, i) => (
              <div
                key={hand.name}
                style={{
                  padding: '10px 12px', borderRadius: 10,
                  background: 'var(--surface-inset)',
                  borderLeft: `3px solid ${TIER_COLORS[hand.tier]}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 11 }}>
                    <span style={{ color: TIER_COLORS[hand.tier], marginRight: 4 }}>{i + 1}.</span>
                    {hand.name}
                  </span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 9, fontVariantNumeric: 'tabular-nums' }}>{hand.prob}</span>
                </div>
                <ExampleCards example={hand.example} />
                <div style={{ color: 'var(--text-tertiary)', marginTop: 4, fontSize: 10 }}>{hand.desc}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'odds' && (
          <div className="space-y-3">
            <SectionTitle>Rule of 2 and 4</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-inset)', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flop → River</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-success)', marginTop: 2 }}>Outs × 4</div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-inset)', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Turn → River</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-primary)', marginTop: 2 }}>Outs × 2</div>
              </div>
            </div>

            <SectionTitle>Outs-Tabelle</SectionTitle>
            <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-tertiary)' }}>
                  <th style={{ textAlign: 'left', padding: '3px 0', fontWeight: 600 }}>Draw</th>
                  <th style={{ textAlign: 'center', fontWeight: 600 }}>Outs</th>
                  <th style={{ textAlign: 'center', fontWeight: 600 }}>Flop→R</th>
                  <th style={{ textAlign: 'center', fontWeight: 600 }}>Turn→R</th>
                </tr>
              </thead>
              <tbody>
                {OUTS_TABLE.map(row => (
                  <tr key={row.draw} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '4px 0', color: 'var(--text-secondary)' }}>{row.draw}</td>
                    <td style={{ textAlign: 'center', color: 'var(--color-accent)', fontWeight: 700 }}>{row.outs}</td>
                    <td style={{ textAlign: 'center', color: 'var(--color-success)' }}>{row.flop}</td>
                    <td style={{ textAlign: 'center', color: 'var(--color-primary)' }}>{row.turn}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <SectionTitle>Pot Odds berechnen</SectionTitle>
            <div style={{ color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10 }}>
              <p>1. Call-Betrag bestimmen</p>
              <p>2. Pot-Größe nach dem Call berechnen</p>
              <p>3. Pot Odds = Call / (Pot + Call)</p>
              <p>4. Vergleiche mit Equity</p>
              <p style={{ color: 'var(--color-success)', fontWeight: 600 }}>→ Equity {'>'} Pot Odds = profitabler Call</p>
            </div>
          </div>
        )}

        {activeTab === 'positions' && (
          <div className="space-y-3">
            <SectionTitle>Tischpositionen</SectionTitle>

            <div className="space-y-2">
              {[
                { title: 'Early Position (EP)', seats: 'UTG, UTG+1, UTG+2', tip: 'Nur starke Hände spielen. Du musst als Erster handeln.', color: 'var(--color-danger)' },
                { title: 'Middle Position (MP)', seats: 'MP, HJ (Hijack)', tip: 'Etwas breiter spielen als EP. Guter Platz für solide Hände.', color: 'var(--color-warning)' },
                { title: 'Late Position (LP)', seats: 'CO (Cutoff), BTN (Button)', tip: 'Beste Position! Breiteste Range. Information von allen anderen Spielern.', color: 'var(--color-success)' },
                { title: 'Blinds', seats: 'SB (Small Blind), BB (Big Blind)', tip: 'Schlechteste Post-Flop Position. Preflop-Discount durch Pflichteinzahlungen.', color: 'var(--color-primary)' },
              ].map(p => (
                <div key={p.title} style={{
                  padding: '10px 12px', borderRadius: 10,
                  background: 'var(--surface-inset)',
                  borderLeft: `3px solid ${p.color}`,
                }}>
                  <div style={{ fontWeight: 700, color: p.color, fontSize: 11 }}>{p.title}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 10, marginTop: 1 }}>{p.seats}</div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 10, marginTop: 3 }}>{p.tip}</div>
                </div>
              ))}
            </div>

            <p style={{ color: 'var(--text-tertiary)', fontSize: 10, marginTop: 8 }}>
              Position ist der wichtigste Faktor im Poker. Der Button ist die profitabelste Position.
            </p>
          </div>
        )}

        {activeTab === 'strategy' && (
          <div className="space-y-3">
            <SectionTitle>Preflop Starting Hands</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { label: 'Premium', hands: 'AA, KK, QQ, AKs, AKo', color: 'var(--color-success)' },
                { label: 'Strong', hands: 'JJ, TT, AQs, AQo, AJs, KQs', color: 'var(--color-accent)' },
                { label: 'Playable', hands: '99-22, ATs+, KJs+, QJs, JTs', color: 'var(--color-warning)' },
                { label: 'Marginal', hands: 'A9s-, KTo, QTo, suited connectors', color: 'var(--color-danger)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                  <span style={{ color: row.color, fontWeight: 700, fontSize: 10, minWidth: 56 }}>{row.label}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{row.hands}</span>
                </div>
              ))}
            </div>

            <SectionTitle>Continuation Bet (C-Bet)</SectionTitle>
            <div style={{ color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10 }}>
              <p>• Bet auf dem Flop nach Preflop-Raise</p>
              <p>• Standard-Größe: 50-66% des Pots</p>
              <p>• Funktioniert besser auf trockenen Boards</p>
              <p>• Reduziere C-Bet Frequenz auf nassen Boards</p>
            </div>

            <SectionTitle>3-Bet Ranges</SectionTitle>
            <div style={{ color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10 }}>
              <p><span style={{ color: 'var(--color-success)' }}>Value 3-Bet:</span> QQ+, AKs, AKo</p>
              <p><span style={{ color: 'var(--color-warning)' }}>Bluff 3-Bet:</span> A5s-A2s, KQs (positionsabhängig)</p>
              <p>• 3-Bet Size: 3-3.5x der originalen Raise</p>
            </div>

            <SectionTitle>Tipps</SectionTitle>
            <div style={{ color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10 }}>
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
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 8, marginBottom: 8,
                background: 'var(--surface-inset)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)', fontSize: 11, outline: 'none',
              }}
            />
            {GLOSSARY
              .filter(g =>
                g.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                g.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
                g.en.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(g => (
                <div key={g.term} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface-inset)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-accent)', fontSize: 11 }}>{g.term}</span>
                    <span style={{ color: 'var(--text-faint)', fontSize: 9 }}>{g.en}</span>
                  </div>
                  <div style={{ color: 'var(--text-tertiary)', marginTop: 2, fontSize: 10 }}>{g.desc}</div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
