export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export interface Card { rank: Rank; suit: Suit }
export type Rng = () => number;

export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
export const pegValue = (c: Card) => Math.min(c.rank, 10);
export const same = (a: Card, b: Card) => a.rank === b.rank && a.suit === b.suit;

export const newDeck = (): Card[] =>
  SUITS.flatMap((suit) => Array.from({ length: 13 }, (_, i) => ({ rank: (i + 1) as Rank, suit })));

export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const FACE: Record<string, Rank> = { A: 1, J: 11, Q: 12, K: 13 };
/** Parse 'AH', '10S', 'KD' etc. */
export function card(s: string): Card {
  const r = s.slice(0, -1);
  return { rank: (FACE[r] ?? Number(r)) as Rank, suit: s.slice(-1) as Suit };
}
