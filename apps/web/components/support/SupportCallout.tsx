import Link from "next/link";
import { ArrowRight } from "./Icons";

/**
 * Quiet band for the Report page. Sits after "evidence recorded" so the first thing a person
 * sees after scanning is that the work is moving, and the second is that they are not alone.
 */
export function SupportCallout({ caseId }: { caseId: string }) {
  return (
    <section className="print:hidden" aria-labelledby="support-callout-heading">
      <div className="flex flex-col gap-5 rounded-2xl border border-rose-200/80 bg-rose-50/50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-rose-600">Support for you</p>
          <h2 id="support-callout-heading" className="text-[15px] font-semibold text-ink">
            The removal can take days. You don&apos;t have to wait it out alone.
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
            Free counsellors, organisations that can help with the law, and things to read and listen to.
          </p>
        </div>
        <Link
          href={`/support?caseId=${caseId}`}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[12.5px] font-medium text-white transition-opacity hover:opacity-75"
        >
          See support options <ArrowRight size={12} />
        </Link>
      </div>
    </section>
  );
}
