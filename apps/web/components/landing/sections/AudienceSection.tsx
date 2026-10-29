import { AUDIENCE } from "@/content/landing";
import { Card, Container, Section, SectionHeading } from "../primitives";

export function AudienceSection() {
  return (
    <Section id="who" variant="band">
      <Container>
        <SectionHeading
          centered
          narrowLead
          title={AUDIENCE.title}
          highlight={AUDIENCE.highlight}
          titleEnd={AUDIENCE.titleEnd}
          lead={AUDIENCE.lead}
        />
        <div className="tv-g tv-g3">
          {AUDIENCE.cards.map((c) => (
            <Card key={c.title} tone={c.tone}>
              <h3>{c.title}</h3>
              <p className="tv-mu tv-card-text">{c.body}</p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
