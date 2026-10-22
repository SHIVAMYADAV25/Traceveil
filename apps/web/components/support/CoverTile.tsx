import type { Tone } from "@/lib/support/types";
import { TONES } from "@/lib/support/tones";

/**
 * Typographic stand-ins for cover art. Real covers are copyrighted and would be remote images
 * (next.config allows only img.logo.dev), so each item gets a tile in its tone instead.
 */
export function BookCover({ title, author, tone }: { title: string; author: string; tone: Tone }) {
  const t = TONES[tone];
  return (
    <div
      aria-hidden
      className={`relative flex h-32 w-[88px] shrink-0 flex-col justify-between overflow-hidden rounded-md p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_6px_16px_-6px_rgba(0,0,0,0.12)] ${t.tile}`}
    >
      <span className="absolute inset-y-0 left-1.5 w-px bg-current opacity-25" />
      <span className="pl-2 font-serif text-[12.5px] font-normal leading-tight text-ink">{title}</span>
      <span className="pl-2 font-mono text-[8.5px] uppercase tracking-widest text-ink-soft">{author}</span>
    </div>
  );
}

export function TrackArt({ tone }: { tone: Tone }) {
  const t = TONES[tone];
  return (
    <div aria-hidden className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${t.tile}`}>
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="15" cy="15" r="2" fill="currentColor" stroke="none" />
        <path d="M10.5 10.5a6.4 6.4 0 000 9M19.5 10.5a6.4 6.4 0 010 9" opacity=".9" />
        <path d="M6.5 6.5a12 12 0 000 17M23.5 6.5a12 12 0 010 17" opacity=".5" />
      </svg>
    </div>
  );
}
