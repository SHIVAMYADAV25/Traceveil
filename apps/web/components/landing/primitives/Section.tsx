import type { ReactNode } from "react";

type Props = {
  id?: string;
  /** hero: extra top padding · spaced: standard gap between page sections · band: full-bleed tinted strip */
  variant?: "default" | "hero" | "spaced" | "band";
  children: ReactNode;
  className?: string;
};

const VARIANT_CLASS = {
  default: "tv-sec",
  hero: "tv-sec tv-sec--hero",
  spaced: "tv-sec tv-sec--spaced",
  band: "tv-sec tv-sec--band",
} as const;

/** Page section. Every landing section is wrapped in this so spacing stays consistent. */
export function Section({ id, variant = "default", children, className = "" }: Props) {
  // The band variant is full-bleed, so it must not receive the .tv-w width cap.
  const width = variant === "band" ? "" : "tv-w ";
  return (
    <section id={id} className={`${width}${VARIANT_CLASS[variant]} ${className}`.trim()}>
      {children}
    </section>
  );
}
