import Link from "next/link";
import type { Tone } from "@/lib/support/types";
import { TONES } from "@/lib/support/tones";
import { ArrowRight } from "./Icons";

/** One of three ways in on the hub. Tiles sit on a 1px rule grid with refined micro-interactions. */
export function PathTile({
  href,
  tag,
  tone,
  title,
  body,
  meta,
  cta,
  art,
}: {
  href: string;
  tag: string;
  tone: Tone;
  title: string;
  body: string;
  meta: string;
  cta: string;
  art: React.ReactNode;
}) {
  const t = TONES[tone];

  return (
    <Link
      href={href}
      className="group flex flex-col bg-paper border border-transparent transition-all duration-300 ease-out hover:border-line-strong hover:bg-canvas/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
    >
      {/* Top Artwork Block */}
      <div className="h-52 overflow-hidden border-b border-line bg-canvas/60 px-6 py-3 transition-colors duration-300 group-hover:bg-canvas flex items-center justify-center">
        <div className="transition-transform duration-300 ease-out group-hover:scale-[1.03]">
          {art}
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-7">
        <span className={`mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] ${t.text}`}>
          {tag}
        </span>

        <h3 className="mb-3 text-[19px] font-semibold leading-snug text-ink transition-colors duration-200">
          {title}
        </h3>

        <p className="mb-6 flex-1 text-[14.5px] leading-[1.7] text-ink-soft">
          {body}
        </p>

        <p className="mb-4 border-t border-line/80 pt-4 font-mono text-[11.5px] text-ink-faint">
          {meta}
        </p>

        {/* CTA Link with Smooth Slide Interaction */}
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink group-hover:underline decoration-ink/30 underline-offset-4">
          <span>{cta}</span>
          <ArrowRight
            size={12}
            className="transition-transform duration-200 ease-out group-hover:translate-x-1"
          />
        </span>
      </div>
    </Link>
  );
}