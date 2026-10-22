/**
 * Line illustrations in the same language as /illustration.png on the landing page:
 * thin ink strokes on white, with a few small indigo "pixel" squares as the accent.
 * Decorative only (aria-hidden); the text next to them carries the meaning.
 */
const INK = "#0a0a0a";
const INDIGO = "#6366f1";
const SOFT = "#818cf8";

const common = {
  viewBox: "24 24 272 180",
  fill: "none",
  "aria-hidden": true,
  className: "h-full w-full",
  preserveAspectRatio: "xMidYMid meet",
} as const;

function Px({ x, y, s = 5, o = 1 }: { x: number; y: number; s?: number; o?: number }) {
  return <rect x={x} y={y} width={s} height={s} fill={INDIGO} opacity={o} />;
}

/** Two people sitting near each other, one speaking, one listening. */
export function TalkIllustration() {
  return (
    <svg {...common}>
      {/* listener */}
      <circle cx="108" cy="92" r="25" stroke={INK} strokeWidth="1.5" />
      <path d="M58 192c0-34 22-56 50-56s50 22 50 56" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M96 88c4-9 18-9 22 0" stroke={INK} strokeWidth="1.5" strokeLinecap="round" opacity=".5" />
      {/* person speaking */}
      <circle cx="214" cy="100" r="22" stroke={INK} strokeWidth="1.5" />
      <path d="M170 192c0-30 19-50 44-50s44 20 44 50" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      {/* the space between them */}
      <path d="M92 52c34-30 98-30 134 6" stroke={SOFT} strokeWidth="1.4" strokeDasharray="2 7" strokeLinecap="round" />
      <path d="M26 192h268" stroke={INK} strokeWidth="1.2" opacity=".25" />
      <Px x={244} y={64} s={6} /><Px x={256} y={78} s={4} o={0.6} /><Px x={236} y={80} s={3} o={0.45} />
      <Px x={64} y={74} s={4} o={0.5} />
    </svg>
  );
}

/** A ring of people, one highlighted. */
export function CircleIllustration() {
  const pts = [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    return { x: 160 + Math.cos(a) * 78, y: 112 + Math.sin(a) * 66 };
  });
  return (
    <svg {...common}>
      <ellipse cx="160" cy="112" rx="78" ry="66" stroke={SOFT} strokeWidth="1.3" strokeDasharray="2 7" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y - 6} r="9" stroke={INK} strokeWidth="1.5" fill={i === 0 ? INDIGO : "none"} strokeOpacity={i === 0 ? 0 : 1} />
          <path
            d={`M${p.x - 15} ${p.y + 20}c0-10 6-17 15-17s15 7 15 17`}
            stroke={i === 0 ? INDIGO : INK}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      ))}
      <circle cx="160" cy="112" r="3" fill={INK} />
      <Px x={40} y={40} s={5} o={0.5} /><Px x={52} y={52} s={3} o={0.4} /><Px x={268} y={170} s={5} o={0.6} />
    </svg>
  );
}

/** An open book with soft sound arcs above it. */
export function ReadListenIllustration() {
  return (
    <svg {...common}>
      <path d="M62 150l98 18V98L62 80z" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M258 150l-98 18V98l98-18z" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M160 98v70" stroke={INK} strokeWidth="1.5" />
      <path d="M80 104l62 11M80 118l62 11M80 132l50 9" stroke={INK} strokeWidth="1.2" opacity=".35" strokeLinecap="round" />
      <path d="M240 104l-62 11M240 118l-62 11M240 132l-50 9" stroke={INK} strokeWidth="1.2" opacity=".35" strokeLinecap="round" />
      {[22, 38, 54].map((r, i) => (
        <path
          key={r}
          d={`M${160 - r} 66a${r} ${r} 0 0 1 ${r * 2} 0`}
          stroke={SOFT}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity={1 - i * 0.22}
        />
      ))}
      <circle cx="160" cy="70" r="3" fill={INDIGO} />
      <path d="M40 190h240" stroke={INK} strokeWidth="1.2" opacity=".25" />
      <Px x={256} y={52} s={5} o={0.6} /><Px x={268} y={64} s={3} o={0.4} /><Px x={50} y={56} s={4} o={0.5} />
    </svg>
  );
}
