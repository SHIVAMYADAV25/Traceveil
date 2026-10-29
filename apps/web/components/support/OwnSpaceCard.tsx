import Link from "next/link";
import type { OwnSpace } from "@/lib/support/types";
import { formatChecked, isInternal } from "@/lib/support/format";
import { ArrowRight, ChatIcon, ExternalIcon } from "./Icons";

const OPEN_LABEL: Record<OwnSpace["id"], string> = {
  discord: "Open our Discord",
  chat: "Open our chat",
};

const btn =
  "inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/**
 * A space we run: our Discord server or our chat.
 * `url` null means it is not open. The card says so and shows no button.
 */
export function OwnSpaceCard({ s }: { s: OwnSpace }) {
  const open = s.url !== null;
  return (
    <article className="rounded-2xl border border-line bg-paper p-5 transition-colors hover:border-line-strong sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
        >
          <ChatIcon size={18} />
        </span>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-quiet">Run by Traceveil</p>
          <h3 className="text-[17px] font-semibold leading-snug text-ink">{s.name}</h3>
        </div>
        <span
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            open
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-line-strong bg-canvas text-ink-body"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-emerald-500" : "bg-line-strong"}`} aria-hidden />
          {open ? "Open" : "Opening soon"}
        </span>
      </div>

      <p className="mt-4 text-[14.5px] leading-[1.7] text-ink-body">{s.summary}</p>

      <dl className="mt-5 grid gap-x-8 gap-y-3 border-t border-line pt-5 text-[13px] leading-relaxed sm:grid-cols-3">
        <div>
          <dt className="mb-1 font-mono text-[11px] uppercase tracking-widest text-ink-quiet">Who runs it</dt>
          <dd className="text-ink-body">{s.whoRunsIt}</dd>
        </div>
        <div>
          <dt className="mb-1 font-mono text-[11px] uppercase tracking-widest text-ink-quiet">Moderation</dt>
          <dd className="text-ink-body">{s.moderation}</dd>
        </div>
        <div>
          <dt className="mb-1 font-mono text-[11px] uppercase tracking-widest text-ink-quiet">Who can join</dt>
          <dd className="text-ink-body">
            {s.minAge} and over. Under {s.minAge}? Call{" "}
            <a className="font-mono font-semibold underline underline-offset-2" href="tel:1098">1098</a>.
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <h4 className="mb-2.5 text-[13.5px] font-semibold text-ink">What we ask of everyone</h4>
        <ul className="space-y-2.5">
          {s.houseRules.map((r) => (
            <li key={r} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-body">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-amber-900">
        <span className="font-semibold">Watch out: </span>{s.watchOut}
      </p>
      <p className="mt-3 rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-body">
        <span className="font-semibold text-ink">Good to know: </span>{s.notFor}
      </p>

      {s.platformFacts && (
        <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-ink-soft">
          {s.platformFacts.map((f) => (
            <li key={f.text}>
              {f.text}{" "}
              <span className="font-mono text-[11px]">
                Checked {formatChecked(f.checkedOn)} ·{" "}
                <a href={f.source} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-ink">
                  source<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5">
        {s.url === null ? (
          <p className="inline-flex min-h-10 items-center rounded-full border border-dashed border-line-strong px-5 py-2.5 text-[13px] text-ink-body">
            Opening soon. Nothing to join yet.
          </p>
        ) : isInternal(s.url) ? (
          <Link href={s.url} className={btn}>
            {OPEN_LABEL[s.id]} <ArrowRight size={12} />
          </Link>
        ) : (
          <a href={s.url} target="_blank" rel="noopener noreferrer" className={btn}>
            {OPEN_LABEL[s.id]} <ExternalIcon size={12} />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </div>
    </article>
  );
}
