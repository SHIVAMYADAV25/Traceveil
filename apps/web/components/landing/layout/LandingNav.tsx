import { BRAND, NAV_CTA, NAV_LINKS } from "@/content/landing";
import { Container, PillButton } from "../primitives";
import { BrandMark } from "./BrandMark";
import Link from "next/link";

/** Top bar. Text links collapse on mobile; the CTA stays visible. */
export function LandingNav() {
  return (
    <Container className="tv-nav">
      <BrandMark name={BRAND.name} />
      <nav aria-label="Primary">
        {NAV_LINKS.map((link) =>
          link.href.startsWith("/") ? (
            <Link key={link.label} className="tv-l" href={link.href}>
              {link.label}
            </Link>
          ) : (
            <a key={link.label} className="tv-l" href={link.href}>
              {link.label}
            </a>
          ),
        )}
        <PillButton href={NAV_CTA.href} variant="dark" className="tv-pill--sm">
          {NAV_CTA.label}
        </PillButton>
      </nav>
    </Container>
  );
}
