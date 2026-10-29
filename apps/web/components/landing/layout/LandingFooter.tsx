import Link from "next/link";
import { BRAND, FOOTER_LINKS } from "@/content/landing";
import { Container } from "../primitives";

export function LandingFooter() {
  return (
    <footer className="tv-footer">
      <Container className="tv-footer__inner">
        <span>
          <b className="tv-footer__brand">{BRAND.name}</b> · {BRAND.tagline}
        </span>
        <span>
          {FOOTER_LINKS.map((item, i) => (
            <span key={item.label}>
              {i > 0 ? " · " : null}
              {"href" in item ? (
                item.href.startsWith("/") ? (
                  <Link href={item.href}>{item.label}</Link>
                ) : (
                  <a href={item.href}>{item.label}</a>
                )
              ) : (
                item.label
              )}
            </span>
          ))}
        </span>
      </Container>
    </footer>
  );
}
