/** Shield + check logo with the lowercase wordmark. */
export function BrandMark({ name }: { name: string }) {
  return (
    <div className="tv-brand">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <path d="M15 3 4 8v7c0 6 4.5 10 11 12 6.5-2 11-6 11-12V8z" fill="#E4937A" />
        <path d="M10 15l4 4 7-8" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </svg>
      <b className="tv-brand__name">{name}</b>
    </div>
  );
}
