import Link from "next/link";
import { PARTNERS, type PartnerContact } from "@/content/landing";
import { Card, Section, SectionHeading } from "../primitives";

function Contact({ contact }: { contact: PartnerContact }) {
  switch (contact.kind) {
    case "text":
      return <b>{contact.value}</b>;
    case "external":
      return (
        <a className="tv-lk" href={contact.href} target="_blank" rel="noopener noreferrer">
          {contact.label}
        </a>
      );
    case "internal":
      return (
        <Link className="tv-lk" href={contact.href}>
          {contact.label}
        </Link>
      );
  }
}

export function PartnersSection() {
  return (
    <Section variant="spaced">
      <SectionHeading
        centered
        title={PARTNERS.title}
        highlight={PARTNERS.highlight}
        lead={PARTNERS.lead}
      />
      <div className="tv-g tv-g4">
        {PARTNERS.items.map((org) => (
          <Card key={org.name}>
            <h3>{org.name}</h3>
            <p className="tv-mu tv-card-text tv-card-text--org">{org.body}</p>
            <Contact contact={org.contact} />
          </Card>
        ))}
      </div>
    </Section>
  );
}
