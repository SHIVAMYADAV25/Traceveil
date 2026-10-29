import { HOW_IT_WORKS } from "@/content/landing";
import { Card, Section, SectionHeading } from "../primitives";

export function HowItWorksSection() {
  return (
    <Section id="how" variant="spaced">
      <SectionHeading
        centered
        title={HOW_IT_WORKS.title}
        highlight={HOW_IT_WORKS.highlight}
        lead={HOW_IT_WORKS.lead}
      />
      <div className="tv-g tv-g3">
        {HOW_IT_WORKS.steps.map((step, i) => (
          <Card key={step.title}>
            <div className="tv-num">{i + 1}</div>
            <h3>{step.title}</h3>
            <p className="tv-mu tv-card-text">{step.body}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
