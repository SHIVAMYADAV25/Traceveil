import type { ReactNode } from "react";

/** Green check bullet used in promise / helpline lists. */
export function TickItem({ children }: { children: ReactNode }) {
  return (
    <div className="tv-tick">
      <i aria-hidden="true">✓</i>
      <span>{children}</span>
    </div>
  );
}
