/** Small stroke icons, same style as the inline SVGs used across the app (24px grid, 1.8–2 stroke). */
type P = { className?: string; size?: number };
const base = (size = 14) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const, "aria-hidden": true,
});

export const PhoneIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z" /></svg>
);
export const ArrowRight = ({ className, size }: P) => (
  <svg {...base(size)} strokeWidth={2.4} className={className}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
);
export const ExternalIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
);
export const ClockIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
);
export const GlobeIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
);
export const CheckIcon = ({ className, size }: P) => (
  <svg {...base(size)} strokeWidth={2.5} className={className}><path d="M20 6L9 17l-5-5" /></svg>
);
export const ExitIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
);
export const LockIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
);
export const ChatIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
);
export const MailIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></svg>
);
export const ArrowLeft = ({ className, size }: P) => (
  <svg {...base(size)} strokeWidth={2.2} className={className}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
);
