import { TAKEDOWN } from "@/content/landing";
import { Chip, Illustration, PillButton, Section, SectionHeading } from "../primitives";

export function TakedownSection() {
  return (
    <Section variant="spaced">
      <div className="tv-row">
        <div>
          <Chip>{TAKEDOWN.chip}</Chip>
          <SectionHeading title={TAKEDOWN.title} highlight={TAKEDOWN.highlight} />
          <p className="tv-mu tv-lead">{TAKEDOWN.body}</p>
          <PillButton href={TAKEDOWN.primaryCta.href} variant="dark">
            {TAKEDOWN.primaryCta.label}
          </PillButton>{" "}
          <PillButton href={TAKEDOWN.secondaryCta.href}>{TAKEDOWN.secondaryCta.label}</PillButton>
        </div>
        <Illustration {...TAKEDOWN.image} />
      </div>
    </Section>
  );
}
