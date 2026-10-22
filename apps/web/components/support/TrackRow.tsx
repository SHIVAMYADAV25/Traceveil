import type { Track } from "@/lib/support/types";
import { TONES } from "@/lib/support/tones";
import { searchUrl } from "@/lib/support/format";
import { TrackArt } from "./CoverTile";
import { ExternalIcon } from "./Icons";

export function TrackRow({ track: k, index }: { track: Track; index: number }) {
  const t = TONES[k.tone];
  const q = `${k.title} ${k.artist.split(",")[0]}`;
  return (
    <li className="flex gap-4 border-b border-line py-6 last:border-b-0 sm:gap-6">
      <span className="hidden w-8 shrink-0 pt-1 font-mono text-[22px] font-light leading-none text-line-strong select-none sm:block">
        {String(index + 1).padStart(2, "0")}
      </span>
      <TrackArt tone={k.tone} />
      <div className="min-w-0 flex-1">
        <p className={`mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] ${t.text}`}>{k.forWhen}</p>
        <h3 className="text-[17px] font-semibold leading-snug text-ink">{k.title}</h3>
        <p className="text-[13px] text-ink-soft">
          {k.artist} · {k.year}
        </p>
        <p className="mt-2 max-w-xl text-[14px] leading-[1.65] text-ink-body">{k.why}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="rounded-full border border-line bg-canvas px-2.5 py-1 text-[12px] text-ink-soft">
            {k.voice === "Instrumental" ? "Instrumental" : `Vocals · ${k.language}`}
          </span>
          <a href={searchUrl("spotify", q)} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
            Spotify <ExternalIcon size={11} className="text-ink-faint" /><span className="sr-only">: search for {k.title} (opens in a new tab)</span>
          </a>
          <a href={searchUrl("youtube", q)} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
            YouTube <ExternalIcon size={11} className="text-ink-faint" /><span className="sr-only">: search for {k.title} (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </li>
  );
}
