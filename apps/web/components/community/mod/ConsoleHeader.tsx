import type { ReactNode } from "react";

/** The dark header band used for team tools, matching the Removal Console elsewhere on the site. */
export function ConsoleHeader({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0a0a] px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2.5">
        <span className="size-2 rounded-full bg-rose-500" aria-hidden />
        <span className="font-mono text-[11px] uppercase tracking-widest text-[#e8e4de]">{label}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function ConsoleStat({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "alert" }) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1 ${tone === "alert" ? "border-rose-400/60 bg-rose-500/15 text-rose-200" : "border-white/15 text-[#e8e4de]"}`}>
      <span className="text-[13px] font-semibold">{value}</span>
      <span className="font-mono text-[10px] uppercase tracking-widest opacity-80">{label}</span>
    </span>
  );
}
