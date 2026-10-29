import { PageIntro } from "@/components/support/PageIntro";
import { CrisisPanel } from "@/components/support/CrisisPanel";
import { SectionRule } from "@/components/support/SectionRule";
import { ServiceCard } from "@/components/support/ServiceCard";
import { ExternalIcon } from "@/components/support/Icons";
import { byRole, SERVICES } from "@/content/support/services";
import { FIRST_SESSION, PROFESSIONALS, QUESTIONS_TO_ASK } from "@/content/support/guides";

export const metadata = { title: "Counsellors — Support — Traceveil" };

export default function CounsellorsPage() {
  const all = byRole("counselling");
  const anyHour = all.filter((s) => s.hours.any);
  const setHours = all.filter((s) => !s.hours.any);
  const esanjeevani = SERVICES.find((s) => s.id === "esanjeevani")!;

  return (
    <>
      <PageIntro
        badge="Counsellors and therapists"
        title="Talk to a counsellor or therapist"
        lead="You can start with a few words, or simply ask to talk. Share only what feels comfortable, at your own pace."
        bgImage="/support/counsellor-bg.png"
      />

      {/* <div className="mb-14">
        <CrisisPanel compact />
      </div> */}

    <SectionRule n="01" label="Before your first session" />
      <div className="mb-16 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
        {FIRST_SESSION.map((f, i) => (
          <div key={f.title} className="bg-paper p-6">
            <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper font-mono text-[11px] font-semibold text-ink">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mb-2 text-[15.5px] font-semibold leading-snug text-ink">{f.title}</h3>
            <p className="text-[14px] leading-[1.7] text-ink-soft">{f.body}</p>
          </div>
        ))}
      </div>

      {/* <SectionRule n="02" label="Who does what" />
      <dl className="mb-16 divide-y divide-line rounded-2xl border border-line bg-paper">
        {PROFESSIONALS.map((p) => (
          <div key={p.term} className="grid gap-1 p-5 sm:grid-cols-[200px_1fr] sm:gap-6 sm:p-6">
            <dt className="text-[14.5px] font-semibold text-ink">{p.term}</dt>
            <dd className="text-[14px] leading-[1.7] text-ink-soft">{p.body}</dd>
          </div>
        ))}
      </dl> */}

      <SectionRule n="02" label="Free, and you can call today" />
      <p className="mb-6 max-w-xl text-[14px] leading-relaxed text-ink-soft">
        {all.length} free services. We list them by when you can reach them, so at 2 am you can see which ones will pick up.
      </p>

      <h2 className="mb-4 text-[15px] font-semibold text-ink">Answer at any hour</h2>
      <div className="mb-10 grid gap-4">
        {anyHour.map((s) => <ServiceCard key={s.id} s={s} tone="care" />)}
      </div>

      <h2 className="mb-4 text-[15px] font-semibold text-ink">Open on set days and times</h2>
      <div className="mb-16 grid gap-4">
        {setHours.map((s) => <ServiceCard key={s.id} s={s} tone="brand" />)}
      </div>

      <SectionRule n="03" label="See a psychiatrist" />
      <p className="mb-6 max-w-xl text-[14.5px] leading-[1.7] text-ink-body">
        A psychiatrist is a doctor who can diagnose and prescribe medicine. You don&apos;t need one to get
        counselling. If you want one, Tele-MANAS (14416) can connect you by video, and eSanjeevani is a
        free government clinic you can book online.
      </p>
      <div className="mb-16"><ServiceCard s={esanjeevani} tone="brand" /></div>



      <SectionRule n="04" label="Finding a private therapist" />
      <div className="rounded-2xl border border-line bg-paper p-6 sm:p-7">
        <p className="mb-5 max-w-2xl text-[14.5px] leading-[1.7] text-ink-body">
          We don&apos;t list individual private therapists, because we can&apos;t check each one. iCall keeps a
          directory of professionals across India who offer face-to-face sessions. We haven&apos;t reviewed
          the individual listings, so ask these questions before you book anyone:
        </p>
        <ul className="mb-6 space-y-3">
          {QUESTIONS_TO_ASK.map((q) => (
            <li key={q} className="flex gap-3 text-[14px] leading-relaxed text-ink-body">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
              {q}
            </li>
          ))}
        </ul>
        <a
          href="https://icallhelpline.org/crowdsource-list/"
          target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line-strong bg-paper px-5 py-2.5 text-[13px] font-medium text-ink-body transition-colors hover:border-ink hover:text-ink"
        >
          iCall directory of professionals <ExternalIcon size={12} className="text-ink-faint" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </>
  );
}
