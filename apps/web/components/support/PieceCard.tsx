import type { Piece } from "@/lib/support/types";
import { formatChecked } from "@/lib/support/format";
import { ExternalIcon } from "./Icons";

/** A story, interview or blog. Links out. Content note shown before the link, never after. */
export function PieceCard({ p }: { p: Piece }) {
  return (
    <article className="rounded-2xl border border-line bg-paper p-5 transition-colors hover:border-line-strong sm:p-6">
      {/* Format & Tags */}
      <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-ink-quiet">
        {p.format}
        {p.length ? ` · ${p.length}` : ""}
        {p.place ? ` · ${p.place}` : ""}
      </p>

      {/* Title */}
      <h3 className="text-[17px] font-semibold leading-snug text-ink">{p.title}</h3>

      {/* Author / Byline */}
      <p className="mt-0.5 text-[13px] text-ink-soft">{p.by}</p>

      {/* Description */}
      <p className="mt-3 max-w-xl text-[14px] leading-[1.65] text-ink-body">{p.why}</p>

      {/* Content Note */}
      {/* {p.contentNote && (
        <p className="mt-3.5 max-w-xl rounded-lg border border-amber-200/80 bg-amber-50/70 px-3.5 py-2 text-[12.5px] leading-relaxed text-amber-900">
          <span className="font-semibold">Content note: </span>
          {p.contentNote}
        </p>
      )} */}

      {/* Footer Action & Verification Date */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line-strong bg-paper px-4 py-1.5 text-[12.5px] font-medium text-ink-body transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {p.linkLabel} <ExternalIcon size={11} className="text-ink-faint" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>

        {p.checkedOn && (
          <span className="font-mono text-[11px] text-ink-faint select-none">
            Checked {formatChecked(p.checkedOn)}
          </span>
        )}
      </div>
    </article>
  );
}