import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  variant?: "dark" | "light" | "outline";
  className?: string;
};

const VARIANT_CLASS = { dark: "tv-dk", light: "tv-lt", outline: "" } as const;

/**
 * Rounded call-to-action.
 * - "/path"  → next/link (client navigation)
 * - "#id"    → plain anchor (in-page scroll)
 * - "http…"  → plain anchor opening in a new tab
 */
export function PillButton({ href, children, variant = "outline", className = "" }: Props) {
  const cls = `tv-pill ${VARIANT_CLASS[variant]} ${className}`.replace(/\s+/g, " ").trim();

  if (href.startsWith("/")) {
    return (
      <Link className={cls} href={href}>
        {children}
      </Link>
    );
  }
  if (href.startsWith("http")) {
    return (
      <a className={cls} href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <a className={cls} href={href}>
      {children}
    </a>
  );
}
