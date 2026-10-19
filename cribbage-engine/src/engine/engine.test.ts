import { describe, it, expect } from 'vitest';
import { card as c, pegValue, Rng } from './cards';
import { scoreHand, scorePlay, totalPoints } from './scoring';
import { newGame, applyAction, RuleError, GameState } from './game';

const hand = (cards: string[], starter: string, crib = false) =>
  scoreHand(cards.map(c), c(starter), crib).total;
const play = (cards: string[]) => totalPoints(scorePlay(cards.map(c)));

describe('hand scoring', () => {
  it('perfect 29', () => expect(hand(['5H', '5D', '5S', 'JC'], '5C')).toBe(29));
  it('zero hand', () => expect(hand(['2C', '4D', '6H', 'KS'], '8D')).toBe(0));
  it('double run + pair + fifteen', () => expect(hand(['3H', '4D', '4S', '5C'], 'KH')).toBe(10));
  it('4-card flush', () => expect(hand(['2H', '4H', '6H', '8H'], 'KS')).toBe(4));
  it('5-card flush', () => expect(hand(['2H', '4H', '6H', '8H'], 'KH')).toBe(5));
  it('crib needs 5-card flush', () => {
    expect(hand(['2H', '4H', '6H', '8H'], 'KS', true)).toBe(0);
    expect(hand(['2H', '4H', '6H', '8H'], 'KH', true)).toBe(5);
  });
  it('nobs needs jack matching starter suit', () => {
    expect(hand(['JH', '2C', '4D', '8S'], 'QH')).toBe(1);
    expect(hand(['JH', '2C', '4D', '8S'], 'QS')).toBe(0);
  });
  it('triple run (3-3-3-4-5 = 3 runs + 3 pairs + fifteens)', () =>
    expect(hand(['3H', '3D', '3S', '4C'], '5H')).toBe(3 * 3 + 6 + 2 * 3 /* 3+4+5+3 = 15 x3 */));
});

describe('pegging scoring', () => {
  it('fifteen', () => expect(play(['7H', '8D'])).toBe(2));
  it('thirty-one', () => expect(play(['KH', 'QD', 'JS', 'AC'])).toBe(2));
  it('pair royal + fifteen', () => expect(play(['5H', '5D', '5S'])).toBe(8));
  it('run in any order + fifteen', () => expect(play(['4H', '6D', '5S'])).toBe(5));
  it('only trailing cards count', () => expect(play(['9H', '4H', '6D', '5S'])).toBe(3));
  it('no wrap-around runs', () => expect(play(['QH', 'KD', 'AS'])).toBe(0));
});

describe('rules enforcement', () => {
  const seeded = (seed: number): Rng => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

  it('rejects illegal moves', () => {
    let s = newGame(seeded(7));
    expect(() => applyAction(s, { type: 'ackShow', player: 0 })).toThrow(RuleError);
    for (const p of [0, 1] as const)
      s = applyAction(s, { type: 'discard', player: p, cards: [s.hands[p][0], s.hands[p][1]] });
    const wrong = s.turn === 0 ? 1 : 0;
    expect(() => applyAction(s, { type: 'play', player: wrong, card: s.hands[wrong][0] })).toThrow('Not your turn');
  });

  it('plays complete random games legally to 121', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const rng = seeded(seed);
      let s: GameState = newGame(rng);
      for (let step = 0; step < 5000 && s.phase !== 'gameover'; step++) {
        if (s.phase === 'discard') {
          for (const p of [0, 1] as const)
            if (s.hands[p].length === 6)
              s = applyAction(s, { type: 'discard', player: p, cards: [s.hands[p][0], s.hands[p][1]] }, rng);
        } else if (s.phase === 'pegging') {
          const p = s.turn!;
          const card = s.hands[p].find((h) => s.count + pegValue(h) <= 31)!;
          expect(card).toBeDefined(); // engine never gives the turn to a player who can't play
          s = applyAction(s, { type: 'play', player: p, card }, rng);
        } else {
          s = applyAction(s, { type: 'ackShow', player: 0 }, rng);
        }
      }
      expect(s.phase).toBe('gameover');
      expect(Math.max(...s.scores)).toBeGreaterThanOrEqual(121);
    }
  });
});
