"use client";

/**
 * Legal orientation for NCII reports — same console chrome as Removal Console (LeakActionConsole).
 * Not legal advice; high-level India-focused references only.
 */

const LEGAL_POINTS = [
  {
    title: "Information Technology Act, 2000 — Section 66E",
    body: "Capturing or publishing images of a person’s private area without consent can be a punishable privacy violation. A forensic report like this can help police and courts understand what was shared and where.",
    tag: "Privacy · electronic form",
  },
  {
    title: "Indian Penal Code — voyeurism & related offences",
    body: "Depending on facts, provisions such as voyeurism (e.g. IPC 354C) and other sexual harassment or stalking provisions may be considered by investigators. Only police / a lawyer can decide what applies.",
    tag: "Criminal law · fact-specific",
  },
  {
    title: "IT Act — Sections 67 / 67A",
    body: "Publishing or transmitting certain intimate material without consent can attract separate offences. Platforms also have duties under their policies and Indian intermediary rules.",
    tag: "Online publication",
  },
  {
    title: "How this report supports filings",
    body: "Use your case reference and hashes in police complaints, platform abuse reports, and cybercrime portal filings. Keep screenshots, URLs, and this document together for counsel or an NGO support worker.",
    tag: "Practical next steps",
  },
] as const;

export function ReportWellbeingLegal() {
  const refCount: number = LEGAL_POINTS.length;

  return (
    <section className="print:break-inside-avoid">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-[10px] font-mono text-[#9ca3af] uppercase tracking-[0.28em]">02b</span>
        <span className="h-px flex-1 bg-[#e8e4de]" />
        <span className="text-[10px] font-mono text-[#9ca3af] uppercase tracking-[0.28em]">
          Legal reference
        </span>
      </div>

      <div className="mb-6 rounded-xl border border-[#e8e4de] bg-white overflow-hidden shadow-sm print:rounded-none print:border print:shadow-none">
        {/* Console header — matches Removal Console */}
        <div className="bg-[#0a0a0a] px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-2 h-2 rounded-full bg-rose-400 shrink-0" aria-hidden />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#a8a29e] truncate">
              Legal console
            </p>
          </div>
          <span className="font-mono text-[10px] text-white/30 shrink-0">
            {refCount} reference{refCount === 1 ? "" : "s"}
          </span>
        </div>

        {/* Title band */}
        <div className="px-6 py-4 border-b border-[#e8e4de]">
          <p className="text-[13px] font-semibold text-[#0a0a0a] mb-0.5">Laws & remedies that may apply</p>
          <p className="text-[12px] text-[#6b7280] leading-relaxed">
            High-level orientation for India. Use this section with police, legal aid, or platform abuse teams — not a substitute for professional legal advice.
          </p>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="rounded-lg border border-[#e8e4de] bg-[#fafaf8] px-4 py-3 print:bg-white">
            <p className="text-[12px] leading-relaxed text-[#374151]">
              <span className="font-semibold text-[#0a0a0a]">Not legal advice.</span> Applicable law depends on facts, age, and
              jurisdiction. Only a qualified advocate can advise on your case.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LEGAL_POINTS.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-[#e8e4de] bg-[#fafaf8] p-4 hover:border-[#d4cfc9] transition-colors print:bg-white"
              >
                <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#9ca3af] mb-1.5">{item.tag}</p>
                <p className="text-[12.5px] font-semibold text-[#0a0a0a] leading-snug mb-2">{item.title}</p>
                <p className="text-[12px] leading-relaxed text-[#6b7280]">{item.body}</p>
              </article>
            ))}
          </div>

          <p className="text-[11px] leading-relaxed text-[#9ca3af] px-0.5">
            Cross-border hosting: pair{" "}
            <a
              href="https://cybercrime.gov.in"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#374151] underline underline-offset-2 decoration-[#d4cfc9] hover:text-[#0a0a0a]"
            >
              cybercrime.gov.in
            </a>{" "}
            (where relevant) with the per-platform removal steps in your takedown section.
          </p>
        </div>
      </div>
    </section>
  );
}
