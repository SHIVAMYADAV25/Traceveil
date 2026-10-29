import { HERO } from "@/content/landing";
import { Card, Chip, Illustration, PillButton, Section } from "../primitives";

export function HeroSection() {
  return (
    <Section variant="hero">
      <div className="tv-row">
        <div>
          <Chip>{HERO.chip}</Chip>
          <h1>
            {HERO.titleLine1}
            <br />
            <span className="tv-co">{HERO.titleLine2}</span>
          </h1>
          <p className="tv-mu tv-lead tv-lead--hero">{HERO.lead}</p>
          <PillButton href={HERO.primaryCta.href} variant="dark">
            {HERO.primaryCta.label}
          </PillButton>{" "}
          <PillButton href={HERO.secondaryCta.href} variant="light">
            {HERO.secondaryCta.label}
          </PillButton>
        </div>
        <Illustration {...HERO.image} />
      </div>

      <div className="tv-g tv-g3 tv-hero-links">
        {HERO.quickLinks.map((q) => (
          <Card key={q.title} tone={q.tone} href={q.href}>
            <h3>{q.title}</h3>
            <p className="tv-mu tv-card-text tv-card-text--flush">Learn more ↓</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
