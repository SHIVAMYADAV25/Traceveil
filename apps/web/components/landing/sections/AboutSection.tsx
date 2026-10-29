import { ABOUT } from "@/content/landing";
import { Chip, Illustration, Section, SectionHeading } from "../primitives";

export function AboutSection() {
  return (
    <Section id="what">
      <div className="tv-row">
        <Illustration {...ABOUT.image} />
        <div>
          <SectionHeading title={ABOUT.title} highlight={ABOUT.highlight} titleEnd={ABOUT.titleEnd} />
          <p className="tv-mu tv-lead tv-lead--about">{ABOUT.body}</p>
          <div className="tv-chips">
            {ABOUT.chips.map((c) => (
              <Chip key={c}>{c}</Chip>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
