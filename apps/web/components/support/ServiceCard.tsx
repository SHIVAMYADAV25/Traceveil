import type { Service } from "@/lib/support/types";
import { TONES } from "@/lib/support/tones";
import { formatChecked, initials } from "@/lib/support/format";
import { PhoneIcon, ExternalIcon, ClockIcon, GlobeIcon, CheckIcon } from "./Icons";

const CHANNEL_LABEL: Record<string, string> = {
  phone: "Phone", whatsapp: "WhatsApp", chat: "Chat", email: "Email", web: "Website",
};

/** One service. Used on Counsellors (counselling) and Community (organisations). */
export function ServiceCard({ s, tone = "brand" }: { s: Service; tone?: "brand" | "care" | "safe" }) {
  const t = TONES[tone];
  const langs = s.languages.length > 0 ? s.languages : null;
  return (
    <article className="rounded-2xl border border-line bg-paper p-5 transition-colors hover:border-line-strong sm:p-6">
      <div className="flex items-start gap-4">
        <div
          aria-hidden
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-[13px] font-semibold ${t.tile}`}
        >
          {initials(s.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <h3 className="text-[17px] font-semibold leading-snug text-ink">{s.name}</h3>
            {s.cost === "free" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <CheckIcon size={10} /> Free
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink-faint">
            {s.kindLabel} · {s.operator}
          </p>
        </div>
      </div>

      <p className="mt-4 text-[14.5px] leading-[1.7] text-ink-body">{s.summary}</p>

      <dl className="mt-5 grid gap-x-8 gap-y-3 border-t border-line pt-5 text-[13px] sm:grid-cols-2">
        <div>
          <dt className="mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-ink-quiet">
            <ClockIcon size={11} /> Hours
          </dt>
          <dd className="text-ink-body">{s.hours.label}</dd>
        </div>
        <div>
          <dt className="mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-ink-quiet">
            <PhoneIcon size={11} /> How to reach them
          </dt>
          <dd className="text-ink-body">{s.channels.map((c) => CHANNEL_LABEL[c]).join(" · ")}</dd>
        </div>
        {langs && (
          <div className="sm:col-span-2">
            <dt className="mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-ink-quiet">
              <GlobeIcon size={11} /> Languages
            </dt>
            <dd className="text-ink-body">{langs.join(", ")}</dd>
          </div>
        )}
      </dl>

      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Good for">
        {s.goodFor.map((g) => (
          <li key={g} className="rounded-full border border-line bg-canvas px-2.5 py-1 text-[12px] text-ink-soft">
            {g}
          </li>
        ))}
      </ul>

      {(s.note || s.costNote) && (
        <p className="mt-4 rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-body">
          <span className="font-semibold text-ink">Good to know: </span>
          {[s.costNote, s.note].filter(Boolean).join(" ")}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        {s.phone && (
          <a
            href={`tel:${s.phone.tel}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <PhoneIcon size={13} />
            Call {s.phone.display}
          </a>
        )}
        {s.website && (
          <a
            href={s.website.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line-strong bg-paper px-5 py-2.5 text-[13px] font-medium text-ink-body transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {s.website.label}
            <ExternalIcon size={12} className="text-ink-faint" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </div>

      <p className="mt-5 font-mono text-[11px] text-ink-faint">
        Checked {formatChecked(s.checkedOn)} ·{" "}
        <a href={s.source} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-ink-soft">
          source
        </a>
      </p>
    </article>
  );
}
