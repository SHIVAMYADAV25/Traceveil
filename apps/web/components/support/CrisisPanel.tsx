import { PhoneIcon } from "./Icons";

const ROWS = [
  {
    when: "Thinking about ending your life, or can't cope",
    name: "Tele-MANAS",
    number: "14416",
    tel: "14416",
    meta: "Free · 24 hours · 20 languages",
  },
  {
    when: "In danger, or someone is threatening you",
    name: "Emergency",
    number: "112",
    tel: "112",
    meta: "Police, ambulance · 24 hours",
  },
  {
    when: "Being blackmailed with your images",
    name: "Cyber crime helpline",
    number: "1930",
    tel: "1930",
    meta: "Free · 24 hours",
  },
] as const;

/**
 * Immediate help. Shown first on the hub and the counsellors page.
 * `compact` keeps only the first row.
 */
export function CrisisPanel({ compact = false }: { compact?: boolean }) {
  const rows = compact ? ROWS.slice(0, 1) : ROWS;
  return (
    <section
      aria-labelledby="crisis-heading"
      className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span className="h-2 w-2 rounded-full bg-rose-400" aria-hidden />
        <h2 id="crisis-heading" className="text-[15px] font-semibold text-rose-900">
          {compact ? "In crisis right now?" : "If you need help right now"}
        </h2>
      </div>
      <ul className={`grid gap-3 ${compact ? "" : "md:grid-cols-3"}`}>
        {rows.map((r) => (
          <li key={r.tel} className="flex min-h-[132px] flex-col justify-between rounded-xl border border-rose-100 bg-white p-4">
            <p className="mb-3 text-[13px] leading-snug text-ink-body">{r.when}</p>
            <div>
              <a
                href={`tel:${r.tel}`}
                className="group inline-flex min-h-11 items-center gap-2.5 rounded-lg text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
                aria-label={`Call ${r.name} on ${r.number}`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600 transition-colors group-hover:bg-rose-500 group-hover:text-white">
                  <PhoneIcon size={14} />
                </span>
                <span className="font-mono text-[22px] font-semibold tracking-tight">{r.number}</span>
              </a>
              <p className="mt-1 text-[12px] text-ink-soft">
                {r.name} · {r.meta}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
