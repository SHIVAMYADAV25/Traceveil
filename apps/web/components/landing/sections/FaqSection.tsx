import { FAQ } from "@/content/landing";
import { Section, SectionHeading } from "../primitives";

export function FaqSection() {
  return (
    <Section id="faq">
      <SectionHeading centered title={FAQ.title} highlight={FAQ.highlight} />
      <div className="tv-g tv-g2 tv-faq">
        {FAQ.items.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
