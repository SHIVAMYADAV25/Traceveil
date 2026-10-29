import { FINAL_CTA } from "@/content/landing";
import { Card, Illustration, PillButton, Section, SectionHeading } from "../primitives";

export function FinalCtaSection() {
  return (
    <Section variant="spaced">
      <Card tone="orange" className="tv-card--lg">
        <div className="tv-row">
          <div>
            <SectionHeading title={FINAL_CTA.title} highlight={FINAL_CTA.highlight} />
            <p className="tv-mu tv-lead tv-lead--cta">{FINAL_CTA.lead}</p>
            <PillButton href={FINAL_CTA.cta.href} variant="dark">
              {FINAL_CTA.cta.label}
            </PillButton>
          </div>
          <Illustration {...FINAL_CTA.image} />
        </div>
      </Card>
    </Section>
  );
}
