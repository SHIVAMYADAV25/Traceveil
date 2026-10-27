import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/** Breadcrumb, a large title, a line of explanation, and the screen's main action on the right. */
export function PageIntro({ trail, title, subtitle, children }: { trail: Array<{ label: string; href?: string }>; title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-[13px] text-[var(--cm-ink-3)]">
          {trail.map((t, i) => (
            <span key={t.label} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5" aria-hidden />}
              {t.href ? <Link href={t.href} className="transition-colors hover:text-[var(--cm-ink)]">{t.label}</Link> : <span aria-current="page" className="text-[var(--cm-ink-2)]">{t.label}</span>}
            </span>
          ))}
        </nav>
        <h2 className="cm-title text-[30px] leading-tight text-[var(--cm-ink)]">{title}</h2>
        {subtitle && <p className="mt-1 max-w-[560px] text-[14px] leading-relaxed text-[var(--cm-ink-3)]">{subtitle}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

/** The frosted card used for every summary on the admin and moderation screens. */
export function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`cm-glass rounded-[22px] ${className}`}>{children}</div>;
}

/** A card for a table: its name and how many rows are showing on the left, search and filters on the right. */
export function TableCard({ title, count, toolbar, children }: { title: string; count?: string; toolbar?: ReactNode; children: ReactNode }) {
  return (
    <GlassCard className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-5">
        <div>
          <h3 className="text-[16px] font-semibold text-[var(--cm-ink)]">{title}</h3>
          {count && <p className="text-[12.5px] text-[var(--cm-ink-3)]">{count}</p>}
        </div>
        {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
      </div>
      <div className="overflow-x-auto px-2 pb-2">{children}</div>
    </GlassCard>
  );
}

/** A status with a small dot, like the Active, New and Suspended marks in the reference table. */
export function StatusDot({ tone, children }: { tone: "green" | "blue" | "rose" | "amber" | "gray"; children: ReactNode }) {
  const t = { green: "bg-emerald-50 text-emerald-700", blue: "bg-sky-50 text-sky-700", rose: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-800", gray: "bg-[var(--cm-hover)] text-[var(--cm-ink-2)]" }[tone];
  const d = { green: "bg-emerald-500", blue: "bg-sky-500", rose: "bg-rose-500", amber: "bg-amber-500", gray: "bg-[var(--cm-ink-3)]" }[tone];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${t}`}><span className={`size-1.5 rounded-full ${d}`} aria-hidden />{children}</span>;
}

export const TH = "px-3 py-2.5 text-left text-[12.5px] font-medium text-[var(--cm-ink-3)]";
export const TD = "px-3 py-3 text-[13.5px] text-[var(--cm-ink-2)]";
export const TR = "border-t border-[var(--cm-line)]/70 transition-colors hover:bg-white/70";
