import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { GlassCard, Sparkline } from "@/components/community/ui/index";

export type StatTone = "sage" | "blue" | "lavender" | "amber" | "rose" | "sand";
const TONES: Record<StatTone, { tile: string; line: string }> = {
  sage: { tile: "bg-[#e3eee9] text-[#3e6b60]", line: "#4c7c6d" },
  blue: { tile: "bg-[#e2eef3] text-[#32576b]", line: "#4a7890" },
  lavender: { tile: "bg-[#ece9f5] text-[#554a82]", line: "#7468a3" },
  amber: { tile: "bg-amber-100 text-amber-700", line: "#b7791f" },
  rose: { tile: "bg-rose-100 text-rose-700", line: "#be4b5b" },
  sand: { tile: "bg-[#f5eed9] text-[#74591f]", line: "#9c7b35" },
};

/** A round progress mark drawn in SVG. `value` is 0 to 1. The percentage is also written out for screen readers. */
export function Ring({ value, color, size = 64 }: { value: number; color: string; size?: number }) {
  const r = 23; const c = 2 * Math.PI * r; const v = Math.max(0, Math.min(1, value));
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" role="img" aria-label={`${Math.round(v * 100)} percent`}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="#e3e8e2" strokeWidth="5" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} transform="rotate(-90 28 28)" />
      <text x="28" y="31.5" textAnchor="middle" fontSize="11" fontWeight="600" fill="#1f2a27">{Math.round(v * 100)}%</text>
    </svg>
  );
}

/** Up or down against last week. `good` says which direction is the happy one (more members is good; more reports is not). */
export function Delta({ pct, good, now = 0 }: { pct: number | null; good: "up" | "down"; now?: number }) {
  // Last week was empty, so there is no percentage to show: say whether anything has happened since.
  if (pct === null) return now > 0
    ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11.5px] font-medium text-emerald-700">New{good === "down" ? " activity" : ""}</span>
    : <span className="rounded-full bg-[var(--cm-hover)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--cm-ink-3)]">Quiet</span>;
  const up = pct > 0; const flat = pct === 0;
  const happy = flat ? null : (up ? good === "up" : good === "down");
  const cls = flat ? "bg-[var(--cm-hover)] text-[var(--cm-ink-3)]" : happy ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700";
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium ${cls}`}>
      <Icon className="size-3" aria-hidden />{flat ? "0%" : `${up ? "+" : ""}${pct}%`}<span className="sr-only"> compared with last week</span>
    </span>
  );
}

/**
 * Icon top left, small chart or ring top right, the label, then the number with its change. The layout of the
 * reference dashboard; the colours, icons and chart are ours.
 */
export function StatCard({ label, value, note, icon: Icon, tone, ring, series, delta }: {
  label: string; value: string | number; note?: string; icon: LucideIcon; tone: StatTone; ring?: number;
  series?: number[]; delta?: { pct: number | null; good: "up" | "down"; now?: number };
}) {
  const t = TONES[tone];
  return (
    <GlassCard className="p-5 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex size-10 items-center justify-center rounded-xl ${t.tile}`}><Icon className="size-5" aria-hidden /></span>
        {series && <Sparkline values={series} color={t.line} label={`${label}, last 14 days`} />}
        {ring !== undefined && <Ring value={ring} color={t.line} />}
      </div>
      <p className="mt-4 text-[13.5px] text-[var(--cm-ink-3)]">{label}</p>
      <div className="mt-0.5 flex flex-wrap items-center gap-2">
        <p className={`font-semibold leading-tight tracking-tight text-[var(--cm-ink)] ${typeof value === "number" ? "text-[30px]" : "text-[22px]"}`}>{value}</p>
        {delta && <Delta pct={delta.pct} good={delta.good} now={delta.now} />}
      </div>
      {note && <p className="mt-1 text-[12.5px] text-[var(--cm-ink-3)]">{note}</p>}
    </GlassCard>
  );
}
