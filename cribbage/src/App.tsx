import { useState } from 'react';
import { Action, GameState, Player, RuleError, applyAction, newGame, viewFor } from './engine';
import { Game } from './ui/Game';

/** Local test harness: one device plays both seats. Later, `state` comes from Supabase and `me` from auth. */
export default function App() {
  const [state, setState] = useState<GameState>(() => newGame());
  const [me, setMe] = useState<Player>(0);
  const [prev, setPrev] = useState<[number, number]>([0, 0]);
  const [error, setError] = useState('');

  const dispatch = (a: Action) => {
    try {
      const next = applyAction(state, a);
      setPrev((p) => [
        next.scores[0] !== state.scores[0] ? state.scores[0] : p[0],
        next.scores[1] !== state.scores[1] ? state.scores[1] : p[1],
      ]);
      setState(next);
      setError('');
    } catch (e) {
      setError(e instanceof RuleError ? e.message : String(e));
    }
  };

  return (
    <>
      <div className="dev">
        Local test mode, viewing as Player {me + 1}
        <button onClick={() => setMe((me ^ 1) as Player)}>Switch seat</button>
      </div>
      {error && <div className="error">{error}</div>}
      <Game
        view={viewFor(state, me)}
        me={me}
        prev={prev}
        onAction={dispatch}
        onNewGame={() => { setState(newGame()); setPrev([0, 0]); }}
      />
    </>
  );
}
