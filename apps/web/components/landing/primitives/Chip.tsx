import type { ReactNode } from "react";

type Props = { children: ReactNode; variant?: "default" | "white" | "blue" };

/** Small rounded label. */
export function Chip({ children, variant = "default" }: Props) {
  const mod = variant === "default" ? "" : ` tv-chip--${variant}`;
  return <span className={`tv-chip${mod}`}>{children}</span>;
}
