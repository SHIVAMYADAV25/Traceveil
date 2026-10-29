import { PRIVACY } from "@/content/landing";
import { Card, Illustration, Section, SectionHeading, TickItem } from "../primitives";

export function PrivacySection() {
  return (
    <Section variant="spaced">
      <Card tone="mint" className="tv-card--xl">
        <div className="tv-row">
          <div>
            <SectionHeading title={PRIVACY.title} highlight={PRIVACY.highlight} />
            <p className="tv-mu tv-lead">{PRIVACY.lead}</p>
            {PRIVACY.promises.map((p) => (
              <TickItem key={p}>{p}</TickItem>
            ))}
          </div>
          <Illustration {...PRIVACY.image} />
        </div>
      </Card>
    </Section>
  );
}
