import type { RemovalRoute } from "@/lib/support/types";
import { formatChecked } from "@/lib/support/format";
import { ExternalIcon, PhoneIcon } from "./Icons";

const sec =
  "inline-flex min-h-10 items-center gap-2 rounded-full border border-line-strong bg-paper px-5 py-2.5 text-[13px] font-medium text-ink-body transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** One way to get content taken down. Numbered in the order people usually use them. */
export function RemovalCard({ r, n }: { r: RemovalRoute; n: number }) {
  return (
    <article className="rounded-2xl border border-line bg-paper p-5 transition-colors hover:border-line-strong sm:p-6">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line font-mono text-[11px] font-semibold text-ink"
        >
          {String(n).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16.5px] font-semibold leading-snug text-ink">{r.name}</h3>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">For: {r.forWhom}</p>
        </div>
      </div>
      <p className="mt-4 text-[14.5px] leading-[1.7] text-ink-body">{r.summary}</p>
      <dl className="mt-4 grid gap-4 border-t border-line pt-4 text-[13px] leading-relaxed sm:grid-cols-2">
        <div>
          <dt className="mb-1 font-mono text-[11px] uppercase tracking-widest text-ink-quiet">What you do</dt>
          <dd className="text-ink-body">{r.howTo}</dd>
        </div>
        <div>
          <dt className="mb-1 font-mono text-[11px] uppercase tracking-widest text-ink-quiet">What it can&apos;t do</dt>
          <dd className="text-ink-body">{r.limit}</dd>
        </div>
      </dl>
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        {r.phone && (
          <a
            href={`tel:${r.phone.tel}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <PhoneIcon size={13} /> Call {r.phone.display}
          </a>
        )}
        <a href={r.link.url} target="_blank" rel="noopener noreferrer" className={sec}>
          {r.link.label} <ExternalIcon size={12} className="text-ink-faint" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
      <p className="mt-5 font-mono text-[11px] text-ink-faint">
        Checked {formatChecked(r.checkedOn)} ·{" "}
        <a href={r.source} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-ink-soft">
          source<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </article>
  );
}
