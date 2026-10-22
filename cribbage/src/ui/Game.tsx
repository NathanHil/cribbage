import { useState } from 'react';
import { Action, Card, Player, ScoreItem, pegValue, same, viewFor } from '../engine';
import { Board } from './Board';
import { CardView } from './CardView';

export type View = ReturnType<typeof viewFor>;
const COLORS: [string, string] = ['#e2573f', '#46a8d8'];
const NAMES: Record<string, string> = {
  fifteen: 'Fifteen', nobs: 'Nobs', heels: 'His heels', 'thirty-one': 'Thirty-one', 'last-card': 'Last card',
};
const label = (i: ScoreItem) =>
  i.kind === 'run' ? `Run of ${i.cards.length}`
  : i.kind === 'flush' ? `Flush of ${i.cards.length}`
  : i.kind === 'pair' ? ['', '', 'Pair', 'Pair royal', 'Double pair royal'][i.cards.length]
  : NAMES[i.kind];

interface Props {
  view: View;
  me: Player;
  prev: [number, number];
  onAction: (a: Action) => void;
  onNewGame: () => void;
}

export function Game({ view, me, prev, onAction, onNewGame }: Props) {
  const [sel, setSel] = useState<Card[]>([]);
  const opp = (me ^ 1) as Player;
  const myTurn = view.turn === me;
  const who = (p: Player) => (p === me ? 'You' : 'Opponent');
  const toggle = (c: Card) =>
    setSel((s) => (s.some((x) => same(x, c)) ? s.filter((x) => !same(x, c)) : s.length < 2 ? [...s, c] : s));
  const playable = (c: Card) => view.phase === 'pegging' && myTurn && view.count + pegValue(c) <= 31;

  const showing = view.phase === 'show' || view.phase === 'gameover';
  const r = showing && view.show.length ? view.show[view.show.length - 1] : null;
  const rCards = r && (r.source === 'crib' ? view.crib! : r.player === me ? view.myKept : view.opponentKept!);

  const scored = view.log.map((l) => `${who(l.player)} +${l.points}: ${l.items.map(label).join(', ')}`).join('. ');
  const loser = view.winner === null ? 0 : view.scores[(view.winner ^ 1) as Player];
  const skunk = loser < 61 ? ' Double skunk!' : loser < 91 ? ' Skunk!' : '';

  const status =
    view.phase === 'gameover' ? `${who(view.winner!)} won.${skunk}`
    : view.phase === 'discard' ? (view.hand.length === 4 ? 'Waiting for opponent to discard' : `Choose 2 cards for ${view.dealer === me ? 'your' : "opponent's"} crib`)
    : view.phase === 'pegging' ? (myTurn ? 'Your play' : "Opponent's play")
    : r ? `${r.source === 'crib' ? `${who(r.player)}'s crib` : `${who(r.player)}'s hand`}: ${r.total}` : '';

  return (
    <main className="game">
      <header>
        <div className="chips">
          {([me, opp] as Player[]).map((p) => (
            <div key={p} className="chip">
              <i style={{ background: COLORS[p] }} />{who(p)} <b>{view.scores[p]}</b>
              {view.dealer === p && <small>dealer</small>}
            </div>
          ))}
        </div>
        <Board scores={view.scores} prev={prev} colors={COLORS} />
      </header>

      <section className="table">
        <div className="row opp">
          {Array.from({ length: view.opponentHandSize }, (_, i) => <CardView key={i} small />)}
        </div>

        <div className="mid">
          <p className="status">{status}</p>
          {scored && <p className="scored">{scored}</p>}
          {r ? (
            <>
              <div className="row">
                {rCards!.map((c, i) => <CardView key={i} card={c} small />)}
                <span className="plus">+</span>
                <CardView card={view.starter!} small />
              </div>
              <ul className="items">
                {r.items.length ? r.items.map((it, i) => <li key={i}>{label(it)} <b>+{it.points}</b></li>) : <li>No points</li>}
              </ul>
            </>
          ) : view.phase === 'pegging' ? (
            <>
              <div className="row">
                <div className="stack">
                  <CardView card={view.starter!} small />
                  <span>Starter</span>
                </div>
                <div className="pile">
                  {view.pile.map((c, i) => <CardView key={i} card={c} small />)}
                </div>
              </div>
              <p className="count">Count <b>{view.count}</b></p>
            </>
          ) : (
            <div className="stack"><CardView small /><span>{view.dealer === me ? 'Your' : "Opponent's"} crib {view.cribSize}/4</span></div>
          )}
        </div>
      </section>

      <footer>
        {view.phase === 'show' && (
          <button className="primary" onClick={() => onAction({ type: 'ackShow', player: me })}>
            {view.show.length < 3 ? 'Continue' : 'Deal next round'}
          </button>
        )}
        {view.phase === 'gameover' && <button className="primary" onClick={onNewGame}>New game</button>}
        {view.phase === 'discard' && view.hand.length === 6 && (
          <button className="primary" disabled={sel.length !== 2}
            onClick={() => { onAction({ type: 'discard', player: me, cards: [sel[0], sel[1]] }); setSel([]); }}>
            Discard to crib
          </button>
        )}
        <div className="row hand">
          {!showing && view.hand.map((c) => (
            <CardView key={`${c.rank}${c.suit}`} card={c}
              selected={sel.some((x) => same(x, c))}
              dim={view.phase === 'pegging' && !playable(c)}
              onClick={
                view.phase === 'discard' && view.hand.length === 6 ? () => toggle(c)
                : playable(c) ? () => onAction({ type: 'play', player: me, card: c })
                : undefined
              } />
          ))}
        </div>
      </footer>
    </main>
  );
}
