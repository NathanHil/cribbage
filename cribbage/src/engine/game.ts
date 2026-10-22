import { Card, Rng, newDeck, shuffle, same, pegValue } from './cards';
import { ScoreItem, scoreHand, scorePlay, totalPoints } from './scoring';

export type Player = 0 | 1;
export const other = (p: Player): Player => (p === 0 ? 1 : 0);
export const WIN = 121;

export type Phase = 'discard' | 'pegging' | 'show' | 'gameover';
export interface ShowResult { source: 'hand' | 'crib'; player: Player; total: number; items: ScoreItem[] }
export interface LogEntry { player: Player; points: number; items: ScoreItem[] }

export interface GameState {
  phase: Phase;
  dealer: Player;
  turn: Player | null;          // whose move in pegging; null otherwise
  scores: [number, number];
  deck: Card[];
  hands: [Card[], Card[]];      // cards currently held
  kept: [Card[], Card[]];       // 4-card hands saved for the show
  crib: Card[];
  starter: Card | null;
  pile: Card[];                 // cards since last count reset
  count: number;
  lastPlayer: Player | null;
  show: ShowResult[];           // hand/crib results counted so far this round
  winner: Player | null;
  log: LogEntry[];              // points scored by the most recent action
}

export type Action =
  | { type: 'discard'; player: Player; cards: [Card, Card] }
  | { type: 'play'; player: Player; card: Card }
  | { type: 'ackShow'; player: Player };

export class RuleError extends Error {}
const fail = (m: string): never => { throw new RuleError(m); };

function deal(scores: [number, number], dealer: Player, rng: Rng): GameState {
  const deck = shuffle(newDeck(), rng);
  const hands: [Card[], Card[]] = [deck.splice(0, 6), deck.splice(0, 6)];
  return {
    phase: 'discard', dealer, turn: null, scores, deck, hands, kept: [[], []], crib: [],
    starter: null, pile: [], count: 0, lastPlayer: null, show: [], winner: null, log: [],
  };
}

export const newGame = (rng: Rng = Math.random): GameState => deal([0, 0], rng() < 0.5 ? 0 : 1, rng);

function award(s: GameState, player: Player, items: ScoreItem[]) {
  const points = totalPoints(items);
  if (!points || s.phase === 'gameover') return;
  s.scores[player] += points;
  s.log.push({ player, points, items });
  if (s.scores[player] >= WIN) { s.phase = 'gameover'; s.winner = player; s.turn = null; }
}

const canPlay = (s: GameState, p: Player) => s.hands[p].some((c) => s.count + pegValue(c) <= 31);

export function applyAction(prev: GameState, a: Action, rng: Rng = Math.random): GameState {
  if (prev.phase === 'gameover') fail('The game is over');
  const s = structuredClone(prev);
  s.log = [];
  switch (a.type) {
    case 'discard': discard(s, a.player, a.cards); return s;
    case 'play': play(s, a.player, a.card); return s;
    case 'ackShow': return ackShow(s, rng);
  }
}

function discard(s: GameState, player: Player, cards: [Card, Card]) {
  if (s.phase !== 'discard') fail('Not the discard phase');
  const hand = s.hands[player];
  if (hand.length !== 6) fail('You already discarded');
  if (cards.length !== 2 || same(cards[0], cards[1])) fail('Discard two different cards');
  if (!cards.every((c) => hand.some((h) => same(h, c)))) fail('Card not in your hand');
  s.hands[player] = hand.filter((h) => !cards.some((c) => same(c, h)));
  s.crib.push(...cards);
  if (s.crib.length < 4) return;

  s.kept = [[...s.hands[0]], [...s.hands[1]]];
  s.starter = s.deck.pop()!;
  s.phase = 'pegging';
  s.turn = other(s.dealer);
  if (s.starter.rank === 11) award(s, s.dealer, [{ kind: 'heels', points: 2, cards: [s.starter] }]);
}

function play(s: GameState, player: Player, card: Card) {
  if (s.phase !== 'pegging') fail('Not the pegging phase');
  if (s.turn !== player) fail('Not your turn');
  const i = s.hands[player].findIndex((h) => same(h, card));
  if (i < 0) fail('Card not in your hand');
  const played = s.hands[player][i];
  if (s.count + pegValue(played) > 31) fail('That card would take the count over 31');

  s.hands[player].splice(i, 1);
  s.pile.push(played);
  s.count += pegValue(played);
  s.lastPlayer = player;
  award(s, player, scorePlay(s.pile));
  if (s.phase === 'gameover') return;

  const opp = other(player);
  if (s.count !== 31) {
    if (canPlay(s, opp)) { s.turn = opp; return; }
    if (canPlay(s, player)) { s.turn = player; return; } // opponent says "go" (forced, so automatic)
    award(s, player, [{ kind: 'last-card', points: 1, cards: [played] }]);
    if (s.phase === 'gameover') return;
  }
  // Count resets; player after the last one to play leads, if they have cards.
  s.pile = []; s.count = 0; s.lastPlayer = null;
  const lead = s.hands[opp].length ? opp : s.hands[player].length ? player : null;
  if (lead === null) { s.phase = 'show'; s.turn = null; countNext(s); } else s.turn = lead;
}

/** Show order: non-dealer's hand, dealer's hand, then the crib (dealer's). */
function countNext(s: GameState) {
  const steps: ['hand' | 'crib', Player][] = [['hand', other(s.dealer)], ['hand', s.dealer], ['crib', s.dealer]];
  const [source, player] = steps[s.show.length];
  const cards = source === 'crib' ? s.crib : s.kept[player];
  const r = scoreHand(cards, s.starter!, source === 'crib');
  s.show.push({ source, player, total: r.total, items: r.items });
  award(s, player, r.items);
}

/** Either player taps "next": reveals the next count, or deals the next round after the crib. */
function ackShow(s: GameState, rng: Rng): GameState {
  if (s.phase !== 'show') fail('Not the show phase');
  if (s.show.length < 3) { countNext(s); return s; }
  return deal(s.scores, other(s.dealer), rng);
}

export function outcome(s: GameState) {
  if (s.winner === null) return null;
  const loser = s.scores[other(s.winner)];
  return {
    winner: s.winner,
    skunk: loser < 61 ? 'double' : loser < 91 ? 'single' : 'none',
  } as const;
}

/** What one player may see. Use this on the server before sending state to a client. */
export function viewFor(s: GameState, me: Player) {
  const reveal = s.phase === 'show' || s.phase === 'gameover';
  const { deck, hands, kept, crib, ...rest } = s;
  return {
    ...rest,
    hand: hands[me],
    opponentHandSize: hands[other(me)].length,
    myKept: kept[me],
    opponentKept: reveal ? kept[other(me)] : null,
    crib: reveal ? crib : null,
    cribSize: crib.length,
  };
}
