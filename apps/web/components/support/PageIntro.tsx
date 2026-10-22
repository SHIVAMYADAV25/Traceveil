import type { Tone } from "@/lib/support/types";
import { TONES } from "@/lib/support/tones";

/** Page title block: badge, serif heading, lead. Mirrors the Leak page header. */
export function PageIntro({
  badge, title, lead, tone = "care", children,
}: { badge: string; title: string; lead: string; tone?: Tone; children?: React.ReactNode }) {
  const t = TONES[tone];
  return (
    <div className="mb-10 animate-in fade-in duration-500 motion-reduce:animate-none">
      <div className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${t.chip}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden />
        <span className="font-mono text-[11px] uppercase tracking-widest">{badge}</span>
      </div>
      <h1 className="mb-4 max-w-2xl font-serif text-[32px] font-normal leading-[1.15] tracking-tight text-ink sm:text-[40px]">
        {title}
      </h1>
      <p className="max-w-xl text-[15.5px] leading-[1.7] text-ink-soft">{lead}</p>
      {children}
    </div>
  );
}
