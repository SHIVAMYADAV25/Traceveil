import type { Tone } from "@/lib/support/types";
import { TONES } from "@/lib/support/tones";

/** Page title block: badge, serif heading, lead. Mirrors the Leak page header. */
export function PageIntro({
  badge,
  title,
  lead,
  tone = "care",
  bgImage,
  children,
}: {
  badge: string;
  title: string;
  lead: string;
  tone?: Tone;
  bgImage?: string;
  children?: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div className="relative overflow-hidden mb-11 animate-in fade-in duration-500 motion-reduce:animate-none">
      {/* Optional Background Image aligned to the right, scaling gracefully */}
      {bgImage && (
        <div 
          className="absolute inset-y-0 right-0 w-full sm:w-3/5 lg:w-1/2 pointer-events-none bg-no-repeat bg-right bg-cover opacity-90 rounded-r-md"
          style={{ 
            backgroundImage: `url(${bgImage})`,
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)'
          }}
          aria-hidden="true"
        />
      )}

      {/* Content wrapper to ensure text sits cleanly above the background image */}
      <div className="relative z-10 py-2">
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
    </div>
  );
}