import type { ReactNode } from "react";

type Props = { children: ReactNode; className?: string; style?: React.CSSProperties };

/** Centred max-width wrapper (1160px, 28px gutters). */
export function Container({ children, className = "", style }: Props) {
  return (
    <div className={`tv-w ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
