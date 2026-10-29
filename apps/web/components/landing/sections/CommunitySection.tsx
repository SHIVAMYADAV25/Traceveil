import { DISCORD_URL } from "@/content/support/own-spaces";
import { COMMUNITY } from "@/content/landing";
import { Card, Chip, Illustration, PillButton, Section, SectionHeading } from "../primitives";

export function CommunitySection() {
  return (
    <Section id="community" variant="spaced">
      <div className="tv-row">
        <div>
          <Chip>{COMMUNITY.chip}</Chip>
          <SectionHeading title={COMMUNITY.title} highlight={COMMUNITY.highlight} />
          <p className="tv-mu tv-lead">{COMMUNITY.body}</p>
          <PillButton href={COMMUNITY.primaryCta.href} variant="dark">
            {COMMUNITY.primaryCta.label}
          </PillButton>{" "}
          <PillButton href={DISCORD_URL ?? COMMUNITY.discordFallback} variant="light">
            {COMMUNITY.discordLabel}
          </PillButton>
        </div>
        <Illustration {...COMMUNITY.image} />
      </div>

      <div className="tv-g tv-g3 tv-community-cards">
        {COMMUNITY.cards.map((c) => (
          <Card key={c.chip} tone={c.tone}>
            <Chip variant="white">{c.chip}</Chip>
            <h3>{c.title}</h3>
            <p className="tv-mu tv-card-text tv-card-text--sm">{c.body}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
