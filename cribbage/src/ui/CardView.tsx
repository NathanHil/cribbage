import { Card } from '../engine';

const SUIT = { S: '♠', H: '♥', D: '♦', C: '♣' } as const;
const NAME = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' } as const;
export const rankLabel = (r: number) => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' } as Record<number, string>)[r] ?? String(r);

interface Props { card?: Card; small?: boolean; selected?: boolean; dim?: boolean; onClick?: () => void }

/** No `card` renders a face-down card. */
export function CardView({ card, small, selected, dim, onClick }: Props) {
  const size = small ? ' small' : '';
  if (!card) return <div className={`card back${size}`} aria-hidden />;
  const red = card.suit === 'H' || card.suit === 'D' ? ' red' : '';
  return (
    <button
      className={`card${red}${size}${selected ? ' sel' : ''}${dim ? ' dim' : ''}`}
      disabled={!onClick}
      onClick={onClick}
      aria-label={`${rankLabel(card.rank)} of ${NAME[card.suit]}`}
    >
      <span className="idx">{rankLabel(card.rank)}<br />{SUIT[card.suit]}</span>
      <span className="pip">{SUIT[card.suit]}</span>
    </button>
  );
}
