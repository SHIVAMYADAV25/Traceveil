import Link from "next/link";

export function SupportFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 text-[12px] leading-relaxed text-ink-soft md:grid-cols-2">
          <p>
            <span className="font-semibold text-ink">Not medical, legal or crisis advice.</span>{" "}
            Traceveil does not run these services. Each one is run by another organisation, and we
            checked its details on the date shown on its card. Hours and numbers can change, so
            confirm before you rely on them.
          </p>
          <p>
            <span className="font-semibold text-ink">Your privacy here.</span>{" "}
            We don&apos;t record which resources you open. Links open other websites, which have their
            own privacy practices. Use <em>Leave quickly</em> at the top if you need to close this page fast.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="font-mono text-[11px] tracking-[0.2em] text-ink-faint uppercase">Traceveil · Impic Labs · 2026</p>
          <Link href="/" className="text-[12px] text-ink-soft transition-colors hover:text-ink">
            Back to home
          </Link>
        </div>
      </div>
    </footer>
  );
}
