/**
 * The loading mark: a round window onto a sun over two slow waves, with a ripple and a small bird. It is the same
 * scene as the banners, drawn in the current group's colours, so waiting feels part of the place. Centered in
 * whatever holds it. Motion stops when the system asks for reduced motion (see community.css) and the label is read out.
 */
export function Loader({ label = "Getting things ready", fill = true }: { label?: string; fill?: boolean }) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-4 ${fill ? "h-full min-h-[280px] w-full" : "py-12"}`}>
      <svg width="124" height="124" viewBox="0 0 124 124" fill="none" aria-hidden>
        <defs>
          <clipPath id="cm-porthole"><circle cx="62" cy="62" r="54" /></clipPath>
          <linearGradient id="cm-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--cat-soft)" />
            <stop offset="1" stopColor="var(--cat-soft)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <circle cx="62" cy="62" r="58" stroke="var(--cat-accent)" strokeOpacity="0.25" strokeWidth="1.5" />
        <g clipPath="url(#cm-porthole)">
          <rect x="0" y="0" width="124" height="124" fill="url(#cm-sky)" />
          <g className="cm-sun"><circle cx="62" cy="52" r="20" fill="var(--cat-accent)" opacity="0.25" /><circle cx="62" cy="52" r="12.5" fill="var(--cat-accent)" opacity="0.6" /></g>
          <path className="cm-bird" d="M86 30 q4 -5 8 0 q4 -5 8 0" stroke="var(--cat-ink)" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
          <path d="M0 74 L26 54 L44 66 L64 48 L90 70 L108 58 L124 70 L124 80 L0 80 Z" fill="var(--cat-accent)" opacity="0.16" />
          <rect x="0" y="72" width="124" height="52" fill="var(--cat-accent)" opacity="0.12" />
          <g className="cm-wave-a"><path d="M0 84 q15 -8 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0" stroke="var(--cat-accent)" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" /></g>
          <g className="cm-wave-b"><path d="M0 98 q15 -8 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0" stroke="var(--cat-ink)" strokeWidth="2" strokeLinecap="round" opacity="0.35" /></g>
          <path d="M0 110 q15 -6 30 0 t30 0 t30 0 t30 0 t30 0" stroke="var(--cat-accent)" strokeWidth="1.6" strokeLinecap="round" opacity="0.25" />
        </g>
      </svg>
      <p className="text-[13.5px] text-[var(--cm-ink-3)]">{label}</p>
    </div>
  );
}
