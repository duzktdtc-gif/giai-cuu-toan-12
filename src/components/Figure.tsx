import type { FigureSpec } from "../game/types";

const CUBE_VERTICES: Record<string, { x: number; y: number }> = {
  A: { x: 0.5, y: -0.35 },
  B: { x: 0, y: 0 },
  C: { x: 1, y: 0 },
  D: { x: 1.5, y: -0.35 },
  "A'": { x: 0.5, y: -1.35 },
  "B'": { x: 0, y: -1 },
  "C'": { x: 1, y: -1 },
  "D'": { x: 1.5, y: -1.35 },
};

const CUBE_VISIBLE: Array<[string, string]> = [
  ["B", "C"],
  ["C", "C'"],
  ["C'", "B'"],
  ["B'", "B"],
  ["C'", "D'"],
  ["D'", "A'"],
  ["A'", "B'"],
  ["C", "D"],
  ["D", "D'"],
];

const CUBE_HIDDEN: Array<[string, string]> = [
  ["A", "B"],
  ["A", "D"],
  ["A", "A'"],
];

const LABEL_OFFSETS: Record<string, { dx: number; dy: number; anchor: "start" | "middle" | "end" }> = {
  A: { dx: 7, dy: 4, anchor: "start" },
  B: { dx: -8, dy: 12, anchor: "end" },
  C: { dx: 4, dy: 14, anchor: "middle" },
  D: { dx: 9, dy: 3, anchor: "start" },
  "A'": { dx: -8, dy: -5, anchor: "end" },
  "B'": { dx: -9, dy: 3, anchor: "end" },
  "C'": { dx: 4, dy: -6, anchor: "middle" },
  "D'": { dx: 9, dy: -3, anchor: "start" },
};

const SX = 98;
const SY = 98;
const OX = 34;
const OY = 154;

function project(vertex: string): { x: number; y: number } | null {
  const point = CUBE_VERTICES[vertex];
  if (!point) return null;
  return { x: OX + point.x * SX, y: OY + point.y * SY };
}

function parsePair(pair: string): [string, string] | null {
  const match = pair.match(/^([A-D]'?)([A-D]'?)$/);
  return match ? [match[1], match[2]] : null;
}

function samePair(a: [string, string], b: [string, string]): boolean {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

function CubeFigure({ highlight = [] }: { highlight?: string[] }) {
  const highlighted = new Set<string>();
  const endpointSet = new Set<string>();
  const highlightPairs: Array<{ pair: [string, string]; hidden: boolean }> = [];
  for (const raw of highlight) {
    const pair = parsePair(raw);
    if (!pair) continue;
    highlighted.add(`${pair[0]}|${pair[1]}`);
    endpointSet.add(pair[0]);
    endpointSet.add(pair[1]);
    highlightPairs.push({
      pair,
      hidden: CUBE_HIDDEN.some((hidden) => samePair(hidden, pair)),
    });
  }

  return (
    <svg viewBox="0 0 210 176" className="h-auto w-full max-w-[260px]" role="img" aria-label="Hình lập phương minh họa">
      <title>Hình lập phương ABCD.A'B'C'D'</title>
      <g stroke="#c4b5fd" strokeWidth="1.7" strokeLinecap="round" fill="none">
        {CUBE_HIDDEN.map(([a, b]) => {
          const p1 = project(a);
          const p2 = project(b);
          if (!p1 || !p2) return null;
          return <line key={`h-${a}-${b}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} opacity="0.38" strokeDasharray="4 4" />;
        })}
        {CUBE_VISIBLE.map(([a, b]) => {
          const p1 = project(a);
          const p2 = project(b);
          if (!p1 || !p2) return null;
          return <line key={`v-${a}-${b}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} opacity="0.85" />;
        })}
      </g>

      <g stroke="#38bdf8" strokeWidth="3.1" strokeLinecap="round" fill="none">
        {highlightPairs.map(({ pair, hidden }, index) => {
          const p1 = project(pair[0]);
          const p2 = project(pair[1]);
          if (!p1 || !p2) return null;
          return (
            <line
              key={`hl-${index}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              strokeDasharray={hidden ? "5 4" : undefined}
            />
          );
        })}
      </g>

      <g fill="#c4b5fd">
        {Object.keys(CUBE_VERTICES).map((vertex) => {
          const point = project(vertex);
          if (!point) return null;
          return <circle key={`dot-${vertex}`} cx={point.x} cy={point.y} r={endpointSet.has(vertex) ? 2.8 : 1.8} />;
        })}
      </g>
      <g fill="#38bdf8">
        {[...endpointSet].map((vertex) => {
          const point = project(vertex);
          if (!point) return null;
          return <circle key={`end-${vertex}`} cx={point.x} cy={point.y} r="3.1" />;
        })}
      </g>

      <g fontSize="11" fontWeight="700" fill="#ede9fe" stroke="#0b0518" strokeWidth="3" paintOrder="stroke">
        {Object.keys(CUBE_VERTICES).map((vertex) => {
          const point = project(vertex);
          const offset = LABEL_OFFSETS[vertex];
          if (!point || !offset) return null;
          return (
            <text key={`label-${vertex}`} x={point.x + offset.dx} y={point.y + offset.dy} textAnchor={offset.anchor}>
              {vertex.replace("'", "′")}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

function LinesFigure({ mode }: { mode: Extract<FigureSpec, { type: "lines" }>["mode"] }) {
  const stroke = "#c4b5fd";
  const accent = "#38bdf8";
  const label = { fontSize: 13, fontWeight: 700, fill: "#ede9fe", stroke: "#0b0518", strokeWidth: 3, paintOrder: "stroke" as const };
  return (
    <svg viewBox="0 0 220 120" className="h-auto w-full max-w-[260px]" role="img" aria-label="Hình minh họa đường thẳng">
      <title>Hình minh họa đường thẳng</title>
      {mode === "angle" && (
        <g>
          <line x1="18" y1="82" x2="202" y2="82" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="56" y1="108" x2="154" y2="20" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M138 82 A28 28 0 0 0 124 58" fill="none" stroke="#f6c453" strokeWidth="2" />
          <text x="150" y="68" {...label} fill="#f6c453">
            α
          </text>
          <text x="204" y="86" {...label}>
            a
          </text>
          <text x="158" y="18" {...label} fill="#7dd3fc">
            b
          </text>
          <circle cx="138" cy="82" r="2.5" fill="#f6c453" />
        </g>
      )}
      {mode === "parallel" && (
        <g>
          <line x1="18" y1="44" x2="202" y2="44" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="18" y1="82" x2="202" y2="82" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
          <path d="m92 38 8 6-8 6" fill="none" stroke={stroke} strokeWidth="1.8" />
          <path d="m112 76 8 6-8 6" fill="none" stroke={accent} strokeWidth="1.8" />
          <text x="204" y="48" {...label}>
            a
          </text>
          <text x="204" y="86" {...label} fill="#7dd3fc">
            b
          </text>
        </g>
      )}
      {mode === "coincident" && (
        <g>
          <line x1="18" y1="62" x2="202" y2="62" stroke={stroke} strokeWidth="3.4" strokeLinecap="round" />
          <text x="62" y="50" {...label}>
            a
          </text>
          <text x="132" y="84" {...label} fill="#7dd3fc">
            b
          </text>
          <text x="204" y="66" {...label} fontSize="11" fill="#f6c453">
            a ≡ b
          </text>
        </g>
      )}
      {mode === "perpendicular" && (
        <g>
          <line x1="24" y1="62" x2="196" y2="62" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="110" y1="16" x2="110" y2="106" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M110 47h15V62" fill="none" stroke="#f6c453" strokeWidth="1.8" />
          <text x="198" y="66" {...label}>
            a
          </text>
          <text x="116" y="16" {...label} fill="#7dd3fc">
            b
          </text>
        </g>
      )}
      {mode === "skew" && (
        <g>
          <line x1="18" y1="40" x2="196" y2="40" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="58" y1="106" x2="138" y2="74" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
          <text x="198" y="44" {...label}>
            a
          </text>
          <text x="142" y="72" {...label} fill="#7dd3fc">
            b
          </text>
          <text x="78" y="64" {...label} fontSize="11" fill="#f6c453">
            chéo nhau
          </text>
        </g>
      )}
      {mode === "three" && (
        <g>
          <line x1="20" y1="38" x2="200" y2="38" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="78" y1="18" x2="78" y2="100" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="78" y1="82" x2="200" y2="82" stroke="#f6c453" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M78 55h16V38" fill="none" stroke="#f6c453" strokeWidth="1.6" />
          <path d="m120 32 8 6-8 6" fill="none" stroke={stroke} strokeWidth="1.8" />
          <path d="m140 76 8 6-8 6" fill="none" stroke="#f6c453" strokeWidth="1.8" />
          <text x="202" y="42" {...label}>
            a
          </text>
          <text x="84" y="18" {...label} fill="#7dd3fc">
            b
          </text>
          <text x="202" y="86" {...label} fill="#f6c453">
            c
          </text>
        </g>
      )}
    </svg>
  );
}

export function Figure({ spec, className = "" }: { spec?: FigureSpec | null; className?: string }) {
  if (!spec) return null;
  return (
    <div className={`flex justify-center rounded-xl border border-lilac-400/15 bg-ink-950/40 p-2 ${className}`}>
      {spec.type === "cube" ? <CubeFigure highlight={spec.highlight} /> : <LinesFigure mode={spec.mode} />}
    </div>
  );
}
