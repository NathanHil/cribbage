import { Card, pegValue } from './cards';

export interface ScoreItem {
  kind: 'fifteen' | 'pair' | 'run' | 'flush' | 'nobs' | 'heels' | 'thirty-one' | 'last-card';
  points: number;
  cards: Card[];
}
export interface HandScore { total: number; items: ScoreItem[] }

const sum = (items: ScoreItem[]) => items.reduce((n, i) => n + i.points, 0);

function subsets<T>(a: T[]): T[][] {
  const out: T[][] = [];
  for (let m = 1; m < 1 << a.length; m++) out.push(a.filter((_, i) => m & (1 << i)));
  return out;
}

/** True if the ranks form a consecutive sequence with no duplicates (order ignored). */
function isRun(cs: Card[]): boolean {
  const r = cs.map((c) => c.rank).sort((a, b) => a - b);
  return r.every((x, i) => i === 0 || x === r[i - 1] + 1);
}

/** Score a 4-card hand (or crib) with the starter. */
export function scoreHand(hand: Card[], starter: Card, isCrib = false): HandScore {
  const all = [...hand, starter];
  const subs = subsets(all);
  const items: ScoreItem[] = [];

  for (const s of subs) {
    if (s.reduce((n, c) => n + pegValue(c), 0) === 15) items.push({ kind: 'fifteen', points: 2, cards: s });
  }
  for (const s of subs) {
    if (s.length === 2 && s[0].rank === s[1].rank) items.push({ kind: 'pair', points: 2, cards: s });
  }
  // Only the longest run length counts; duplicates make multiple runs (double/triple/quad).
  for (let len = 5; len >= 3; len--) {
    const runs = subs.filter((s) => s.length === len && isRun(s));
    if (runs.length) {
      runs.forEach((s) => items.push({ kind: 'run', points: len, cards: s }));
      break;
    }
  }
  if (hand.every((c) => c.suit === hand[0].suit)) {
    if (starter.suit === hand[0].suit) items.push({ kind: 'flush', points: 5, cards: all });
    else if (!isCrib) items.push({ kind: 'flush', points: 4, cards: hand });
  }
  const nobs = hand.find((c) => c.rank === 11 && c.suit === starter.suit);
  if (nobs) items.push({ kind: 'nobs', points: 1, cards: [nobs] });

  return { total: sum(items), items };
}

/** Score the card just played. `pile` = cards since the last count reset, including the new card. */
export function scorePlay(pile: Card[]): ScoreItem[] {
  const items: ScoreItem[] = [];
  const count = pile.reduce((n, c) => n + pegValue(c), 0);
  if (count === 15) items.push({ kind: 'fifteen', points: 2, cards: [...pile] });
  if (count === 31) items.push({ kind: 'thirty-one', points: 2, cards: [...pile] });

  const last = pile[pile.length - 1];
  let n = 0;
  for (let i = pile.length - 1; i >= 0 && pile[i].rank === last.rank; i--) n++;
  if (n >= 2) items.push({ kind: 'pair', points: n === 2 ? 2 : n === 3 ? 6 : 12, cards: pile.slice(-n) });

  for (let len = Math.min(pile.length, 7); len >= 3; len--) {
    const tail = pile.slice(-len);
    if (isRun(tail)) {
      items.push({ kind: 'run', points: len, cards: tail });
      break;
    }
  }
  return items;
}

export { sum as totalPoints };
