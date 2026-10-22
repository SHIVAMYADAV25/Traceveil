import type { Community } from "@/lib/support/types";
import { formatChecked } from "@/lib/support/format";
import { ExternalIcon } from "./Icons";

const PLATFORM: Record<Community["platform"], string> = {
  app: "App and website", reddit: "Reddit", discord: "Discord", forum: "Forum", whatsapp: "WhatsApp group",
};

export function CommunityCard({ c }: { c: Community }) {
  return (
    <article className="rounded-2xl border border-line bg-paper p-5 transition-colors hover:border-line-strong sm:p-6">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-ink-quiet">{PLATFORM[c.platform]}</p>
      <h3 className="text-[17px] font-semibold text-ink">{c.name}</h3>
      <p className="mt-2 text-[14.5px] leading-[1.7] text-ink-body">{c.summary}</p>
      <dl className="mt-5 grid gap-4 border-t border-line pt-5 text-[13px] leading-relaxed sm:grid-cols-2">
        <div>
          <dt className="mb-1 font-mono text-[11px] uppercase tracking-widest text-ink-quiet">Who is there</dt>
          <dd className="text-ink-body">{c.whoIsThere}</dd>
        </div>
        <div>
          <dt className="mb-1 font-mono text-[11px] uppercase tracking-widest text-ink-quiet">Moderation</dt>
          <dd className="text-ink-body">{c.moderation}</dd>
        </div>
      </dl>
      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-amber-900">
        <span className="font-semibold">Watch out: </span>{c.watchOut}
      </p>
      <div className="mt-5">
        <a href={c.url} target="_blank" rel="noopener noreferrer"
           className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line-strong bg-paper px-5 py-2.5 text-[13px] font-medium text-ink-body transition-colors hover:border-ink hover:text-ink">
          Visit {c.name} <ExternalIcon size={12} className="text-ink-faint" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
      <p className="mt-5 font-mono text-[11px] text-ink-faint">
        Checked {formatChecked(c.checkedOn)} ·{" "}
        <a href={c.source} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-ink-soft">source</a>
      </p>
    </article>
  );
}
