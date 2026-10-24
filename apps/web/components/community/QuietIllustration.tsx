/**
 * An original illustration for the welcome and empty states: a lit window in a quiet room.
 * Drawn only with shapes in the site's palette, with no people or faces.
 */
export function QuietIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 240" className={className} role="img" aria-label="A quiet room with a lit window" fill="none">
      <rect x="0" y="0" width="320" height="240" rx="20" fill="#f0ede8" />
      <circle cx="236" cy="62" r="46" fill="#e0e7ff" />
      <circle cx="236" cy="62" r="28" fill="#c7d2fe" />
      <rect x="64" y="46" width="112" height="132" rx="8" fill="#ffffff" stroke="#d4cfc9" />
      <rect x="74" y="56" width="92" height="112" rx="4" fill="#fafaf8" stroke="#e8e4de" />
      <path d="M120 56 V168 M74 112 H166" stroke="#e8e4de" strokeWidth="2" />
      <path d="M74 168 L166 168 L196 218 L44 218Z" fill="#fde68a" opacity=".55" />
      <rect x="0" y="190" width="320" height="50" fill="#e8e4de" />
      <rect x="0" y="190" width="320" height="2" fill="#d4cfc9" />
      <path d="M228 190 V160 Q228 146 242 146 Q256 146 256 160 V190Z" fill="#ffffff" stroke="#d4cfc9" />
      <circle cx="242" cy="138" r="5" fill="#fde68a" />
      <path d="M262 190 q6 -22 22 -26 q-2 18 -14 26" fill="#d1fae5" stroke="#6ee7b7" />
    </svg>
  );
}
