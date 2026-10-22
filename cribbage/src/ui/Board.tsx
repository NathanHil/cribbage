const X0 = 14, DX = 8.3;
const gx = (i: number) => X0 + i * DX + Math.floor(i / 5) * 2;

/** Hole position for a score: 3 legs of 40 holes, two lanes per leg, finish hole at 121. */
function pos(p: number, lane: number): [number, number] {
  if (p <= 0) return [4, 12 + lane * 12];
  const q = Math.min(p, 121) - 1;
  const leg = Math.min(Math.floor(q / 40), 2);
  return [gx(q - leg * 40), 12 + leg * 34 + lane * 12];
}

interface Props { scores: [number, number]; prev: [number, number]; colors: [string, string] }

export function Board({ scores, prev, colors }: Props) {
  const holes = [];
  for (let leg = 0; leg < 3; leg++)
    for (let lane = 0; lane < 2; lane++)
      for (let i = 0; i < 40; i++)
        holes.push(<circle key={`${leg}-${lane}-${i}`} cx={gx(i)} cy={12 + leg * 34 + lane * 12} r={2.4} className="hole" />);
  return (
    <svg viewBox="0 0 380 100" className="board" role="img" aria-label={`Score ${scores[0]} to ${scores[1]}`}>
      <rect x="0" y="0" width="380" height="100" rx="10" className="wood" />
      {holes}
      <circle cx={gx(40)} cy={12 + 68 + 6} r={4} className="finish" />
      {([0, 1] as const).map((lane) => (
        <g key={lane}>
          {[prev[lane], scores[lane]].map((p, k) => {
            const [x, y] = pos(p, lane);
            return (
              <circle key={k} r={k ? 4.6 : 3.6} fill={colors[lane]} className="peg"
                opacity={k ? 1 : 0.55} style={{ transform: `translate(${x}px, ${y}px)` }} />
            );
          })}
        </g>
      ))}
    </svg>
  );
}
