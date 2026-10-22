import type { CalmAudio } from "@/lib/support/types";
import { TONES } from "@/lib/support/tones";
import { TrackArt } from "./CoverTile";
import { ExternalIcon } from "./Icons";

const link =
  "inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink";

/** Calm audio with direct links. Says what she will hear: music, a voice, or nature. */
export function CalmRow({ a, index }: { a: CalmAudio; index: number }) {
  const t = TONES[a.tone];
  return (
    <li className="flex gap-4 border-b border-line py-6 last:border-b-0 sm:gap-6">
      <span className="hidden w-8 shrink-0 pt-1 font-mono text-[22px] font-light leading-none text-line-strong select-none sm:block">
        {String(index + 1).padStart(2, "0")}
      </span>
      <TrackArt tone={a.tone} />
      <div className="min-w-0 flex-1">
        <p className={`mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] ${t.text}`}>{a.forWhen}</p>
        <h3 className="text-[17px] font-semibold leading-snug text-ink">{a.title}</h3>
        <p className="text-[13px] text-ink-soft">{a.by}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="rounded-full border border-line bg-canvas px-2.5 py-1 text-[12px] text-ink-soft">
            {a.sound}
            {a.length ? ` · ${a.length}` : ""}
          </span>
          {a.spotify && (
            <a href={a.spotify} target="_blank" rel="noopener noreferrer" className={link}>
              Spotify <ExternalIcon size={11} className="text-ink-faint" />
              <span className="sr-only">: {a.title} (opens in a new tab)</span>
            </a>
          )}
          {a.youtube && (
            <a href={a.youtube} target="_blank" rel="noopener noreferrer" className={link}>
              YouTube <ExternalIcon size={11} className="text-ink-faint" />
              <span className="sr-only">: {a.title} (opens in a new tab)</span>
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
