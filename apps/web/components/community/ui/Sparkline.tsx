/** A small line chart, smoothed, with a soft fill and a dot on the latest value. Drawn from real counts only. */
export function Sparkline({ values, color, width = 120, height = 44, label }: { values: number[]; color: string; width?: number; height?: number; label: string }) {
  const pad = 5;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pts = values.map((v, i) => [pad + (i * (width - pad * 2)) / Math.max(values.length - 1, 1), height - pad - ((v - min) / span) * (height - pad * 2)] as const);
  const flat = values.every((v) => v === 0);
  let d = "";
  pts.forEach(([x, y], i) => {
    if (i === 0) { d = `M${x},${y}`; return; }
    const [px, py] = pts[i - 1] as readonly [number, number];
    const cx = (px + x) / 2;
    d += ` C${cx},${py} ${cx},${y} ${x},${y}`;
  });
  const last = pts[pts.length - 1] ?? [pad, height - pad];
  const first = pts[0] ?? [pad, height - pad];
  const id = `spark-${label.replace(/\W/g, "")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="shrink-0 overflow-visible">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.22" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {flat ? (
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke={color} strokeOpacity="0.4" strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" />
      ) : (
        <>
          <path d={`${d} L${last[0]},${height} L${first[0]},${height} Z`} fill={`url(#${id})`} />
          <path d={d} stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx={last[0]} cy={last[1]} r="4" fill="#fff" stroke={color} strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
