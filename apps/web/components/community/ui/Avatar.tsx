import { memo } from "react";

// Soft backgrounds and deeper shape colours from the Community palette (see app/community/community.css).
const BACKGROUNDS = ["#dcebe4", "#f3e6c3", "#f6d9d4", "#d9e8ee", "#e8e5df", "#e3def0", "#e8efd6", "#f5dcc9"];
const SHAPES = ["#4c7c6d", "#a8863d", "#b0646f", "#4a7890", "#7a7a6c", "#7468a3", "#6f8a3d", "#c07a4d"];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * A picture made only from shapes and colour, chosen from the person's seed. Never a face, so
 * nobody can be recognised from it, and the same seed always gives the same picture.
 */
function AvatarBase({ seed, size = 32, label }: { seed: string; size?: number; label?: string }) {
  if (seed === "deleted") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={label ?? "Deleted member"} className="shrink-0">
        <circle cx="16" cy="16" r="15" fill="#eef2ec" stroke="#cfd7ce" strokeDasharray="3 3" />
      </svg>
    );
  }
  const h = hash(seed);
  const bg = BACKGROUNDS[h % BACKGROUNDS.length] as string;
  // ">>>" (unsigned) matters: ">>" turns large hashes negative and gives an invalid index.
  const c1 = SHAPES[(h >>> 3) % SHAPES.length] as string;
  const c2 = SHAPES[(h >>> 7) % SHAPES.length] as string;
  const variant = (h >>> 11) % 4;
  const id = `av-${h.toString(36)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={label ?? "Member picture"} className="shrink-0">
      <defs><clipPath id={id}><circle cx="16" cy="16" r="16" /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <rect width="32" height="32" fill={bg} />
        {variant === 0 && (<><circle cx="11" cy="21" r="10" fill={c1} opacity=".55" /><circle cx="23" cy="10" r="6" fill={c2} opacity=".6" /></>)}
        {variant === 1 && (<><path d="M-2 24 Q16 6 34 24 L34 34 L-2 34Z" fill={c1} opacity=".55" /><circle cx="22" cy="10" r="4.5" fill={c2} opacity=".7" /></>)}
        {variant === 2 && (<><rect x="4" y="4" width="14" height="14" rx="7" fill={c1} opacity=".55" /><rect x="14" y="14" width="14" height="14" rx="7" fill={c2} opacity=".55" /></>)}
        {variant === 3 && (<><circle cx="16" cy="16" r="11" fill="none" stroke={c1} strokeWidth="4" opacity=".6" /><circle cx="16" cy="16" r="4" fill={c2} opacity=".75" /></>)}
      </g>
    </svg>
  );
}

export const Avatar = memo(AvatarBase);
