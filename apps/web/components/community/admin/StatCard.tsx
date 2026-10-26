import type { LucideIcon } from "lucide-react";

export type StatTone = "sage" | "blue" | "lavender" | "amber" | "rose" | "sand";
const TONES: Record<StatTone, { tile: string; ring: string; bg: string }> = {
  sage: { tile: "bg-[#e3eee9] text-[#3e6b60]", ring: "#4c7c6d", bg: "bg-white" },
  blue: { tile: "bg-[#e2eef3] text-[#32576b]", ring: "#4a7890", bg: "bg-white" },
  lavender: { tile: "bg-[#ece9f5] text-[#554a82]", ring: "#7468a3", bg: "bg-white" },
  amber: { tile: "bg-amber-100 text-amber-700", ring: "#b7791f", bg: "bg-white" },
  rose: { tile: "bg-rose-100 text-rose-700", ring: "#be4b5b", bg: "bg-rose-50" },
  sand: { tile: "bg-[#f5eed9] text-[#74591f]", ring: "#9c7b35", bg: "bg-white" },
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

export function StatCard({ label, value, note, icon: Icon, tone, ring }: {
  label: string; value: string | number; note?: string; icon: LucideIcon; tone: StatTone; ring?: number;
}) {
  const t = TONES[tone];
  return (
    <div className={`flex items-start justify-between gap-3 rounded-3xl border border-[var(--cm-line)] p-5 ${t.bg}`}>
      <div className="min-w-0">
        <span className={`mb-3 flex size-10 items-center justify-center rounded-2xl ${t.tile}`}><Icon className="size-5" aria-hidden /></span>
        <p className="text-[13px] text-[var(--cm-ink-3)]">{label}</p>
        <p className={`mt-0.5 font-semibold leading-tight tracking-tight text-[var(--cm-ink)] ${typeof value === "number" ? "text-[30px]" : "text-[22px]"}`}>{value}</p>
        {note && <p className="mt-0.5 text-[12.5px] text-[var(--cm-ink-3)]">{note}</p>}
      </div>
      {ring !== undefined && <Ring value={ring} color={t.ring} />}
    </div>
  );
}
