import Link from "next/link";
import type { Tone } from "@/lib/support/types";
import { TONES } from "@/lib/support/tones";
import { ArrowRight } from "./Icons";

/** One of three ways in on the hub. Tiles sit on a 1px rule grid, like Audience on the landing page. */
export function PathTile({
  href, tag, tone, title, body, meta, cta, art,
}: {
  href: string; tag: string; tone: Tone; title: string; body: string; meta: string; cta: string; art: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <Link
      href={href}
      className="group flex flex-col bg-paper transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
    >
      <div className="h-52 border-b border-line bg-canvas px-6 py-3 transition-colors group-hover:bg-paper">{art}</div>
      <div className="flex flex-1 flex-col p-7">
        <span className={`mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] ${t.text}`}>{tag}</span>
        <h3 className="mb-3 text-[19px] font-semibold leading-snug text-ink">{title}</h3>
        <p className="mb-6 flex-1 text-[14.5px] leading-[1.7] text-ink-soft">{body}</p>
        <p className="mb-4 border-t border-line pt-4 font-mono text-[11.5px] text-ink-faint">{meta}</p>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink">
          {cta}
          <ArrowRight size={12} className="transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
