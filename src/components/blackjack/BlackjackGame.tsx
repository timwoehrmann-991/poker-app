import React, { useState, useEffect } from 'react';
import { useBlackjackStore } from '../../store/blackjackStore';
import { useBlackjackProgressStore, BJ_CATEGORY_LABELS, BJCategory } from '../../store/blackjackProgressStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTranslation } from '../../i18n';
import { BlackjackTable } from './BlackjackTable';
import { StrategyMatrix } from './StrategyMatrix';
import { BlackjackStrategyQuiz } from './BlackjackStrategyQuiz';
import { BJ_ACTION_LABELS, applicableRecommendation, BJAction } from '../../blackjack/basicStrategy';
import { isBlackjack } from '../../blackjack/engine';
import { formatEuro } from '../../utils/format';
import { ChipStack } from '../ui/ChipStack';
import { ActionBtn } from '../ui/ActionBtn';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { SettingsModal } from '../settings/SettingsModal';
import { useBlackjackSounds } from '../../hooks/useBlackjackSounds';
import { useIsMobile } from '../../hooks/useIsMobile';

interface BlackjackGameProps {
  onBack: () => void;
}

const CHIP_VALUES = [5, 10, 25, 100];

/** Regelheft — das echte Blackjack-Regelwerk */
const RULES_DE: { title: string; text: string }[] = [
  { title: 'Ziel', text: 'Näher an 21 als die Bank — ohne über 21 zu gehen („kaputt"/Bust). Du spielst nur gegen die Bank, nie gegen die anderen am Tisch.' },
  { title: 'Kartenwerte', text: '2–10 zählen ihren Aufdruck, Bube/Dame/König zählen 10, das Ass zählt 1 ODER 11 — je nachdem, was besser ist („Soft Hand" = Ass zählt gerade als 11).' },
  { title: 'Blackjack', text: 'Ass + 10er-Karte mit den ersten beiden Karten = Blackjack. Zahlt 3:2 (bei €10 Einsatz bekommst du €15 Gewinn). Eine 21 aus drei Karten oder nach dem Teilen ist KEIN Blackjack.' },
  { title: 'Ablauf', text: '1. Einsatz setzen → 2. Jeder bekommt zwei offene Karten, die Bank eine offene und eine verdeckte → 3. Du handelst (ziehen, halten, verdoppeln, teilen, aufgeben) → 4. Die Bank deckt auf und zieht nach fester Regel → 5. Auszahlung.' },
  { title: 'Bank-Regel', text: 'Die Bank hat keine Wahl: Sie zieht bei 16 oder weniger und steht auf jeder 17. Genau daraus entsteht die Basic Strategy — die Bank ist berechenbar.' },
  { title: 'Karte ziehen (Hit)', text: 'Du bekommst eine weitere Karte. Beliebig oft, bis du hältst oder über 21 gehst.' },
  { title: 'Halten (Stand)', text: 'Keine weitere Karte — dein Ergebnis steht fest.' },
  { title: 'Verdoppeln (Double)', text: 'Nur mit den ersten zwei Karten: Einsatz wird verdoppelt, du bekommst genau EINE weitere Karte und musst dann halten. Klassiker: mit 11 verdoppeln.' },
  { title: 'Teilen (Split)', text: 'Zwei Karten gleichen Werts (auch König + Zehn) darfst du in zwei Hände teilen — die zweite Hand kostet einen weiteren Einsatz. Jede Hand wird separat gespielt. Geteilte Asse bekommen genau eine Karte. Achten und Asse immer teilen, Zehnen und Fünfen nie!' },
  { title: 'Aufgeben (Surrender)', text: 'Nur als allererste Entscheidung mit zwei Karten: Du gibst die Hand auf und bekommst die Hälfte des Einsatzes zurück. Lohnt sich nur in den schlechtesten Lagen — hart 16 gegen 9/10/Ass und hart 15 gegen 10.' },
  { title: 'Versicherung', text: 'Zeigt die Bank ein Ass, kannst du für den halben Einsatz gegen ihren Blackjack „versichern" (zahlt 2:1). Mathematisch ein Verlustgeschäft — die Basic Strategy sagt: nie versichern. Hast du selbst Blackjack, heißt dieselbe Wette „Even Money" — und ist genauso unnötig.' },
  { title: 'Unentschieden (Push)', text: 'Gleicher Wert wie die Bank → du bekommst deinen Einsatz zurück.' },
  { title: 'Der Schlitten (Shoe)', text: 'Gespielt wird mit 6 gemischten Decks; bei rund einem Viertel Restkarten wird neu gemischt.' },
];

const RULES_EN: { title: string; text: string }[] = [
  { title: 'Goal', text: 'Get closer to 21 than the bank — without going over 21 (bust). You only play against the bank, never against the others at the table.' },
  { title: 'Card values', text: '2–10 count face value, Jack/Queen/King count 10, the Ace counts 1 OR 11 — whichever is better ("soft hand" = the ace currently counts as 11).' },
  { title: 'Blackjack', text: 'Ace + a ten-card as your first two cards = blackjack. Pays 3:2 (a €10 bet wins €15). A 21 made of three cards or after splitting is NOT a blackjack.' },
  { title: 'Flow', text: '1. Place your bet → 2. Everyone gets two open cards, the bank one open and one face down → 3. You act (hit, stand, double, split, surrender) → 4. The bank reveals and draws by fixed rule → 5. Payout.' },
  { title: 'Bank rule', text: 'The bank has no choice: it draws on 16 or less and stands on every 17. Basic strategy exists precisely because the bank is predictable.' },
  { title: 'Hit', text: 'You get one more card. As often as you like, until you stand or bust.' },
  { title: 'Stand', text: 'No more cards — your result is locked in.' },
  { title: 'Double', text: 'Only with your first two cards: your bet doubles, you get exactly ONE more card and must then stand. Classic: double on 11.' },
  { title: 'Split', text: 'Two cards of equal value (even King + Ten) may be split into two hands — the second hand costs another bet. Each hand plays separately. Split aces get exactly one card. Always split eights and aces, never tens and fives!' },
  { title: 'Surrender', text: 'Only as your very first decision with two cards: you give up the hand and get half your bet back. Only worth it in the worst spots — hard 16 vs 9/10/Ace and hard 15 vs 10.' },
  { title: 'Insurance', text: 'If the bank shows an ace, you can "insure" against its blackjack for half your bet (pays 2:1). Mathematically a losing bet — basic strategy says: never insure. If you hold blackjack yourself, the same bet is called "even money" — equally unnecessary.' },
  { title: 'Push', text: 'Same value as the bank → you get your bet back.' },
  { title: 'The shoe', text: 'Played with 6 shuffled decks; reshuffled at roughly a quarter of cards remaining.' },
];

const CATEGORY_ORDER: BJCategory[] = ['hard', 'soft', 'pair'];

/** Session-übergreifender Lernstand: Hart/Soft/Paare aus dem ProgressStore */
const CategoryScores: React.FC = () => {
  const byCategory = useBlackjackProgressStore(s => s.byCategory);
  const hasData = CATEGORY_ORDER.some(c => byCategory[c].total > 0);
  if (!hasData) return null;
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {CATEGORY_ORDER.map(c => {
        const b = byCategory[c];
        const pct = b.total > 0 ? Math.round((b.correct / b.total) * 100) : null;
        return (
          <div key={c} style={{
            flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 9,
            background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {BJ_CATEGORY_LABELS[c]}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              color: pct === null ? 'var(--text-faint)' : pct >= 80 ? 'var(--color-success)' : pct >= 55 ? 'var(--color-warning)' : 'var(--color-danger)',
            }}>
              {pct === null ? '—' : `${pct} %`}
            </div>
            <div style={{ fontSize: 8, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
              {b.correct}/{b.total}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const SetupScreen: React.FC<{
  onStart: (companions: number, chips: number) => void;
  onBack: () => void;
  onOpenMatrix: () => void;
  onOpenQuiz: () => void;
}> = ({ onStart, onBack, onOpenMatrix, onOpenQuiz }) => {
  const [companions, setCompanions] = useState(2);
  const [chips, setChips] = useState(500);
  const coachOn = useSettingsStore(s => s.beginnerMode);
  const bankroll = useBlackjackProgressStore(s => s.bankroll);
  const { t } = useTranslation();

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    color: 'var(--text-tertiary)', marginBottom: 6,
  };

  return (
    <div className="app-ambient" style={{
      height: '100dvh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '32px 16px 48px', overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onBack} style={{
            padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)',
          }}>← {t('bj.back')}</button>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>🃏 {t('bj.title')}</span>
          <span style={{ width: 70 }} />
        </div>

        <div style={{
          background: 'var(--color-bg-panel)', border: '1px solid var(--border-subtle)',
          borderRadius: 18, padding: '18px 20px', boxShadow: 'var(--glass-shadow)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div>
            <div style={labelStyle}>{t('bj.setup.companions')}</div>
            <div style={{ display: 'flex', gap: 5 }}>
              {[0, 1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setCompanions(n)} style={{
                  flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  border: companions === n ? '1.5px solid var(--color-accent)' : '1px solid var(--border-subtle)',
                  background: companions === n ? 'var(--color-accent-soft)' : 'var(--surface-inset)',
                  color: companions === n ? 'var(--color-accent)' : 'var(--text-secondary)',
                }}>{n}</button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 5 }}>
              {t('bj.setup.companionsHint')}
            </div>
          </div>

          <div>
            <div style={labelStyle}>{t('bj.setup.startMoney')}</div>
            <div style={{ display: 'flex', gap: 5 }}>
              {[200, 500, 1000].map(c => (
                <button key={c} onClick={() => setChips(c)} style={{
                  flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontVariantNumeric: 'tabular-nums',
                  border: chips === c ? '1.5px solid var(--color-accent)' : '1px solid var(--border-subtle)',
                  background: chips === c ? 'var(--color-accent-soft)' : 'var(--surface-inset)',
                  color: chips === c ? 'var(--color-accent)' : 'var(--text-secondary)',
                }}>{formatEuro(c)}</button>
              ))}
            </div>
          </div>

          <button
            onClick={() => useSettingsStore.getState().setBeginnerMode(!coachOn)}
            style={{
              padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
              background: coachOn ? 'var(--color-accent-soft)' : 'var(--surface-inset)',
              border: coachOn ? '1.5px solid var(--color-accent)' : '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: 18 }}>🎓</span>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
              Lern-Coach
              <span style={{ display: 'block', fontSize: 10, fontWeight: 400, color: 'var(--text-tertiary)' }}>
                Zeigt den mathematisch besten Zug und bewertet deine Entscheidungen — gilt für Poker & Blackjack
              </span>
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: coachOn ? 'var(--color-success)' : 'var(--text-tertiary)' }}>
              {coachOn ? 'AN' : 'AUS'}
            </span>
          </button>
        </div>

        {/* Lernbereich: Matrix, Quiz, Lernstand */}
        <div style={{
          background: 'var(--color-bg-panel)', border: '1px solid var(--border-subtle)',
          borderRadius: 18, padding: '14px 20px', boxShadow: 'var(--glass-shadow)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={labelStyle}>Training</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onOpenMatrix} style={{
              flex: 1, padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)',
            }}>📊 Strategie-Matrix</button>
            <button onClick={onOpenQuiz} style={{
              flex: 1, padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)',
            }}>🧠 Strategie-Quiz</button>
          </div>
          <CategoryScores />
        </div>

        {bankroll !== null && bankroll > 0 && (
          <button
            onClick={() => onStart(companions, bankroll)}
            style={{
              width: '100%', padding: '12px 24px', borderRadius: 14,
              background: 'var(--color-accent-soft)', border: '1.5px solid var(--color-accent)',
              color: 'var(--color-accent)', fontWeight: 800, fontSize: 14, cursor: 'pointer',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {t('bj.setup.continueWith')} {formatEuro(bankroll)} →
          </button>
        )}

        <button
          onClick={() => onStart(companions, chips)}
          style={{
            width: '100%', padding: '14px 24px', borderRadius: 14,
            background: 'linear-gradient(135deg, #1a7a3a, #25a050)',
            color: '#fff', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(37,160,80,0.35)',
          }}
        >
          {t('bj.setup.sit')} 🃏
        </button>
      </div>
    </div>
  );
};

export const BlackjackGame: React.FC<BlackjackGameProps> = ({ onBack }) => {
  const store = useBlackjackStore();
  const coachOn = useSettingsStore(s => s.beginnerMode);
  const { t, language } = useTranslation();
  const [rulesOpen, setRulesOpen] = useState(true);
  const [rulesAutoClosed, setRulesAutoClosed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [screen, setScreen] = useState<'game' | 'matrix' | 'quiz'>('game');
  const isMobile = useIsMobile();
  useBlackjackSounds();

  const st = store.state;
  const human = st?.seats.find(s => s.id === 'human');
  const isHumanTurn = !!st && st.phase === 'playerTurns' &&
    st.activeSeatIndex !== null && st.seats[st.activeSeatIndex]?.isHuman && !store.isRunning;
  const humanInsurancePending = !!st && !!human && st.phase === 'insurance' &&
    human.hands.length > 0 && !human.insuranceDecided && !store.isRunning;

  const legal = st?.legalActions ?? { canHit: false, canStand: false, canDouble: false, canSplit: false, canSurrender: false };
  const activeHand = isHumanTurn && human ? human.hands[human.activeHandIndex] : null;

  // Regelheft beim allerersten Austeilen automatisch einklappen
  const handleDeal = () => {
    if (!rulesAutoClosed) {
      setRulesOpen(false);
      setRulesAutoClosed(true);
    }
    void store.dealRound();
  };

  // Hotkeys: Z ziehen · H halten · V verdoppeln · T teilen · A aufgeben
  useEffect(() => {
    if (!isHumanTurn) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const map: Record<string, BJAction> = { z: 'hit', h: 'stand', v: 'double', t: 'split', a: 'surrender' };
      const action = map[e.key.toLowerCase()];
      if (!action) return;
      const allowed: Record<BJAction, boolean> = {
        hit: legal.canHit, stand: legal.canStand, double: legal.canDouble,
        split: legal.canSplit, surrender: legal.canSurrender,
      };
      if (allowed[action]) void store.act(action);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isHumanTurn, legal, store]);

  if (!st || !human) {
    if (screen === 'matrix') return <StrategyMatrix onBack={() => setScreen('game')} />;
    if (screen === 'quiz')   return <BlackjackStrategyQuiz onBack={() => setScreen('game')} />;
    return <SetupScreen
      onBack={onBack}
      onStart={(companions, chips) => store.start({ companions, startChips: chips, humanName: 'Du' })}
      onOpenMatrix={() => setScreen('matrix')}
      onOpenQuiz={() => setScreen('quiz')}
    />;
  }

  // Coach-Empfehlung für die aktuelle Entscheidung
  const recommendation = coachOn && activeHand && st.dealerCards.length > 0
    ? applicableRecommendation(activeHand, st.dealerCards[0], legal)
    : null;

  // Even Money: eigener Blackjack + Bank zeigt Ass — dieselbe Wette, ehrlicher benannt
  const evenMoney = humanInsurancePending && isBlackjack(human.hands[0]);
  const insuranceCost = humanInsurancePending ? Math.floor(human.hands[0].bet / 2) : 0;
  const rules = language === 'en' ? RULES_EN : RULES_DE;
  const showRebuy = st.phase === 'betting' && human.chips < 5 && !store.isRunning;

  const actionBtnDefs: { action: BJAction; label: string; hotkey: string; bg: string; enabled: boolean }[] = [
    { action: 'hit',       label: t('bj.hit'),   hotkey: 'Z', bg: 'linear-gradient(135deg, #0a5fa8, #0a84ff)', enabled: legal.canHit },
    { action: 'stand',     label: t('bj.stand'), hotkey: 'H', bg: 'linear-gradient(135deg, #1a7a3a, #25a050)', enabled: legal.canStand },
    { action: 'double',    label: activeHand ? `${t('bj.double')} +${formatEuro(activeHand.bet)}` : t('bj.double'), hotkey: 'V', bg: 'linear-gradient(135deg, #8b6514, #c9a227)', enabled: legal.canDouble },
    { action: 'split',     label: activeHand ? `${t('bj.split')} +${formatEuro(activeHand.bet)}` : t('bj.split'),   hotkey: 'T', bg: 'linear-gradient(135deg, #6e1fa0, #9b38d4)', enabled: legal.canSplit },
    { action: 'surrender', label: `${t('bj.surrender')} · ${t('bj.surrenderHalf')}`, hotkey: 'A', bg: 'linear-gradient(135deg, #5a5a66, #7a7a88)', enabled: legal.canSurrender },
  ];

  return (
    <div className="app-ambient" style={{
      height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '14px 12px 40px', overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Kopfzeile */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'nowrap' }}>
          <button onClick={() => setConfirmLeave(true)} style={{
            padding: '6px 10px', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>← {isMobile ? '' : t('bj.leave')}</button>
          <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            🃏 {t('bj.title')}{st.roundNumber > 0 ? ` · ${isMobile ? 'R.' : t('bj.round')} ${st.roundNumber}` : ''}
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            {coachOn && store.score.total > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums' }}>
                🎓 {store.score.correct}/{store.score.total}
              </span>
            )}
            <button onClick={() => setRulesOpen(v => !v)} style={{
              padding: '6px 10px', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: rulesOpen ? 'var(--color-accent-soft)' : 'var(--surface-inset)',
              border: rulesOpen ? '1.5px solid var(--color-accent)' : '1px solid var(--border-subtle)',
              color: rulesOpen ? 'var(--color-accent)' : 'var(--text-secondary)',
              whiteSpace: 'nowrap',
            }}>📖{isMobile ? '' : ` ${t('bj.rules')}`}</button>
            <button onClick={() => setSettingsOpen(true)} style={{
              padding: '6px 10px', borderRadius: 9, fontSize: 12, cursor: 'pointer',
              background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)',
            }}>⚙️</button>
          </div>
        </div>

        {/* Tisch */}
        <BlackjackTable state={st} />

        {/* Aktionsbereich */}
        <div style={{
          background: 'var(--surface-panel)', border: '1px solid var(--border-subtle)',
          borderRadius: 18, padding: '14px 16px', boxShadow: 'var(--glass-shadow)',
          maxWidth: 620, width: '100%', margin: '0 auto',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Einsatz-Phase */}
          {st.phase === 'betting' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {t('bj.yourBet')}
                </span>
                <ChipStack amount={store.betAmount} size={12} />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {CHIP_VALUES.map(v => (
                  <button key={v}
                    onClick={() => store.setBetAmount(Math.min(store.betAmount + v, human.chips))}
                    disabled={store.betAmount + v > human.chips}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)', opacity: store.betAmount + v > human.chips ? 0.35 : 1,
                      fontVariantNumeric: 'tabular-nums',
                    }}>+{v}</button>
                ))}
                <button onClick={() => store.setBetAmount(0)} style={{
                  padding: '7px 12px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.3)', color: 'var(--color-danger)',
                }}>✕</button>
              </div>
              <button
                onClick={handleDeal}
                disabled={store.betAmount <= 0 || human.chips <= 0}
                style={{
                  padding: '12px 24px', borderRadius: 12, fontWeight: 800, fontSize: 14,
                  background: 'linear-gradient(135deg, #1a7a3a, #25a050)', color: '#fff', border: 'none',
                  cursor: store.betAmount > 0 && human.chips > 0 ? 'pointer' : 'not-allowed',
                  opacity: store.betAmount > 0 && human.chips > 0 ? 1 : 0.4,
                }}
              >
                {t('bj.deal')} 🃏
              </button>
              {showRebuy && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-danger)', textAlign: 'center' }}>
                    {t('bj.noMoney')}
                  </div>
                  <button onClick={() => store.rebuy()} style={{
                    padding: '9px 20px', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                    background: 'var(--color-accent-soft)', border: '1.5px solid var(--color-accent)',
                    color: 'var(--color-accent)',
                  }}>💰 {t('bj.rebuy')}</button>
                </div>
              )}
            </>
          )}

          {/* Versicherung / Even Money */}
          {humanInsurancePending && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
                {evenMoney ? t('bj.evenMoneyQ') : `${t('bj.insuranceQ')} ${formatEuro(insuranceCost)}?`}
              </div>
              {coachOn && (
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  💡 Basic Strategy: <strong style={{ color: 'var(--color-danger)' }}>{evenMoney ? 'Ablehnen' : 'Nie versichern'}</strong>
                  {' '}— {evenMoney ? 'die 3:2-Auszahlung ist auf Dauer mehr wert als die Garantie.' : 'die Wette verliert langfristig immer.'}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <ActionBtn
                  onClick={() => void store.decideInsurance(false)}
                  label={evenMoney ? t('bj.evenMoneyRisk') : t('bj.insuranceNo')}
                  style={{ background: 'linear-gradient(135deg, #1a7a3a, #25a050)', color: '#fff' }}
                />
                <ActionBtn
                  onClick={() => void store.decideInsurance(true)}
                  label={evenMoney ? t('bj.evenMoneyTake') : t('bj.insuranceYes')}
                  style={{ background: 'linear-gradient(135deg, #8b6514, #c9a227)', color: '#fff' }}
                />
              </div>
            </>
          )}

          {/* Spiel-Phase */}
          {isHumanTurn && (
            <>
              {recommendation && (
                <div style={{
                  fontSize: 11, padding: '7px 10px', borderRadius: 9,
                  background: 'var(--color-accent-soft)', border: '1px solid var(--color-accent-border)',
                  color: 'var(--text-primary)',
                }}>
                  💡 <strong>{BJ_ACTION_LABELS[recommendation.action]}</strong> — {recommendation.reason}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {actionBtnDefs.map(def => (
                  <ActionBtn
                    key={def.action}
                    onClick={() => void store.act(def.action)}
                    label={def.label}
                    hotkey={def.hotkey}
                    disabled={!def.enabled}
                    style={{ background: def.bg, color: '#fff', minWidth: 112, flexBasis: isMobile ? '30%' : undefined }}
                  />
                ))}
              </div>
            </>
          )}

          {/* Warten auf andere */}
          {!isHumanTurn && !humanInsurancePending && st.phase !== 'betting' && st.phase !== 'payout' && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '6px 0' }}>
              {store.isRunning ? '…' : t('bj.othersTurn')}
            </div>
          )}

          {/* Runde vorbei */}
          {st.phase === 'payout' && !store.isRunning && (
            <button
              onClick={() => void store.nextRound()}
              style={{
                padding: '12px 24px', borderRadius: 12, fontWeight: 800, fontSize: 14,
                background: 'linear-gradient(135deg, #1a7a3a, #25a050)', color: '#fff', border: 'none', cursor: 'pointer',
              }}
            >
              {t('bj.nextRound')} →
            </button>
          )}

          {/* Coach-Feedback */}
          {store.feedback && (
            <div style={{
              padding: '8px 10px', borderRadius: 9,
              background: store.feedback.correct ? 'rgba(48,209,88,0.1)' : 'rgba(255,159,10,0.12)',
              border: `1px solid ${store.feedback.correct ? 'rgba(48,209,88,0.35)' : 'rgba(255,159,10,0.4)'}`,
              fontSize: 11, color: 'var(--text-primary)',
            }}>
              {store.feedback.correct
                ? <><strong style={{ color: 'var(--color-success)' }}>🎯 Richtig nach Basic Strategy!</strong></>
                : <>
                    <strong style={{ color: 'var(--color-warning)' }}>🤔 Basic Strategy hätte anders entschieden:</strong>{' '}
                    {BJ_ACTION_LABELS[store.feedback.recommendation.action]} — {store.feedback.recommendation.reason}
                  </>}
            </div>
          )}
        </div>

        {/* Regelheft */}
        {rulesOpen && (
          <div style={{
            background: 'var(--surface-panel)', border: '1px solid var(--border-subtle)',
            borderRadius: 18, padding: '16px 18px', boxShadow: 'var(--glass-shadow)',
            maxWidth: 720, width: '100%', margin: '0 auto',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>📖 Blackjack-Regelheft</div>
            {rules.map(rule => (
              <div key={rule.title} style={{
                padding: '8px 10px', borderRadius: 10, background: 'var(--surface-inset)',
                borderLeft: '3px solid var(--color-accent)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{rule.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.55 }}>{rule.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmLeave}
        message={t('bj.leaveConfirm')}
        confirmLabel={t('bj.leaveYes')}
        cancelLabel={t('bj.stay')}
        onConfirm={() => { setConfirmLeave(false); store.leave(); onBack(); }}
        onCancel={() => setConfirmLeave(false)}
      />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
