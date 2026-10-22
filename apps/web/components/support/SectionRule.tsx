/** The "01 ——— Label" divider used between sections in the Report. */
export function SectionRule({ n, label, id }: { n?: string; label: string; id?: string }) {
  return (
    <div id={id} className="mb-5 flex items-center gap-3 scroll-mt-24">
      {n && <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-faint">{n}</span>}
      <span className="h-px flex-1 bg-line" />
      <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-faint">{label}</span>
    </div>
  );
}
