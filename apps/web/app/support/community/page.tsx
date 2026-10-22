import { PageIntro } from "@/components/support/PageIntro";
import { SectionRule } from "@/components/support/SectionRule";
import { ServiceCard } from "@/components/support/ServiceCard";
import { CommunityCard } from "@/components/support/CommunityCard";
import { OwnSpaceCard } from "@/components/support/OwnSpaceCard";
import { RemovalCard } from "@/components/support/RemovalCard";
import { SupportTabs } from "@/components/support/SupportTabs";
import { SERVICES } from "@/content/support/services";
import { COMMUNITIES } from "@/content/support/communities";
import { COMMUNITY_SAFETY } from "@/content/support/guides";
import { OWN_SPACES } from "@/content/support/own-spaces";
import { REMOVAL_INTRO, REMOVAL_ROUTES } from "@/content/support/removal";

export const metadata = { title: "Get help, talk with others — Support — Sniffer" };

/** Order matters: most specific to this problem first. */
const ORG_ORDER = ["meri-trustline", "responsible-netism", "sneha", "majlis", "women-181"];

export default function CommunityPage() {
  const orgs = ORG_ORDER.map((id) => SERVICES.find((s) => s.id === id)!).filter(Boolean);

  const organisations = (
    <>
      <h2 className="mb-2 text-[15px] font-semibold text-ink">Ways to get it taken down</h2>
      <p className="mb-6 max-w-2xl text-[14.5px] leading-[1.7] text-ink-soft">{REMOVAL_INTRO}</p>
      <div className="mb-14 grid gap-4">
        {REMOVAL_ROUTES.map((r, i) => <RemovalCard key={r.id} r={r} n={i + 1} />)}
      </div>

      <h2 className="mb-2 text-[15px] font-semibold text-ink">Organisations that can help</h2>
      <p className="mb-6 max-w-2xl text-[14.5px] leading-[1.7] text-ink-soft">
        People who can sit beside you through it: counselling, legal help, and getting through the police and platform steps.
      </p>
      <div className="grid gap-4">
        {orgs.map((s) => <ServiceCard key={s.id} s={s} tone="brand" />)}
      </div>
    </>
  );

  const talk = (
    <>
      <p className="mb-8 max-w-2xl text-[14.5px] leading-[1.7] text-ink-soft">
        People here can listen. They can&apos;t remove content or advise on the law. Read the safety notes
        below before you join anything.
      </p>

      <h2 className="mb-4 text-[15px] font-semibold text-ink">Our own space</h2>
      <div className="mb-12 grid gap-4">
        {OWN_SPACES.map((s) => <OwnSpaceCard key={s.id} s={s} />)}
      </div>

      <h2 className="mb-4 text-[15px] font-semibold text-ink">Another space we have checked</h2>
      <div className="mb-12 grid gap-4">
        {COMMUNITIES.map((c) => <CommunityCard key={c.id} c={c} />)}
      </div>

      <SectionRule label="Staying safe with other people online" />
      <ul className="mb-8 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2">
        {COMMUNITY_SAFETY.map((s, i) => (
          <li key={s.title} className={`bg-paper p-6 ${i === COMMUNITY_SAFETY.length - 1 ? "md:col-span-2" : ""}`}>
            <h3 className="mb-1.5 text-[14.5px] font-semibold text-ink">{s.title}</h3>
            <p className="text-[13.5px] leading-[1.7] text-ink-soft">{s.body}</p>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-dashed border-line-strong bg-paper p-6">
        <p className="mb-1 text-[14px] font-semibold text-ink">Why Reddit and other forums are not listed</p>
        <p className="max-w-2xl text-[13.5px] leading-[1.7] text-ink-soft">
          We could not confirm that any of them is moderated for this experience, and an unmoderated one can do
          harm. We list a space only after we have checked it, and we show the date.
        </p>
      </div>
    </>
  );

  return (
    <>
      <PageIntro
        badge="Get help, talk with others"
        tone="brand"
        title="Get practical help, or talk to people who understand"
        lead="Organisations can help you report and get content taken down. Talking with others is for company. They are different, so they are kept apart."
      />
      <SectionRule n="01" label="Choose one" />
      <SupportTabs
        label="Type of support"
        items={[
          { key: "organisations", label: "Get it taken down", count: REMOVAL_ROUTES.length + orgs.length, panel: organisations },
          { key: "communities", label: "Talk with others", count: OWN_SPACES.length + COMMUNITIES.length, panel: talk },
        ]}
      />
    </>
  );
}
