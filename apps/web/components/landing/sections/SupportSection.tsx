import Link from "next/link";
import { SUPPORT } from "@/content/landing";
import { Card, Chip, Illustration, Section, SectionHeading, TickItem } from "../primitives";

export function SupportSection() {
  return (
    <Section id="support" variant="spaced">
      <Card tone="blue" className="tv-card--xl">
        <div className="tv-row">
          <Illustration {...SUPPORT.image} />
          <div>
            <Chip variant="blue">{SUPPORT.chip}</Chip>
            <SectionHeading title={SUPPORT.title} highlight={SUPPORT.highlight} />
            <p className="tv-mu tv-lead tv-lead--tight">{SUPPORT.lead}</p>
            {SUPPORT.helplines.map((h) => (
              <TickItem key={h.rest}>
                {h.strong ? <b>{h.strong}</b> : null}
                {h.rest}
              </TickItem>
            ))}
            <Link className="tv-lk tv-lk--blue" href={SUPPORT.cta.href}>
              {SUPPORT.cta.label}
            </Link>
          </div>
        </div>
      </Card>
    </Section>
  );
}
