import type { ReactNode } from "react";
import type { Tone } from "@/content/landing";

const TONE_CLASS: Record<Tone, string> = {
  pink: "tv-pk",
  mint: "tv-mn",
  blue: "tv-bl",
  orange: "tv-or",
};

type Props = {
  tone?: Tone;
  /** Renders the card as an in-page anchor. */
  href?: string;
  children: ReactNode;
  className?: string;
};

/** Rounded surface; optional pastel tone. */
export function Card({ tone, href, children, className = "" }: Props) {
  const cls = ["tv-card", tone ? TONE_CLASS[tone] : "", href ? "tv-card--link" : "", className]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return <div className={cls}>{children}</div>;
}
