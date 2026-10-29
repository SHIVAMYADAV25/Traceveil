import "./landing.css";
import { poppins } from "./fonts";
import { LandingFooter, LandingNav } from "./layout";
import {
  AboutSection,
  AudienceSection,
  CommunitySection,
  FaqSection,
  FinalCtaSection,
  HeroSection,
  HowItWorksSection,
  MinorsNotice,
  PartnersSection,
  PrivacySection,
  SupportSection,
  TakedownSection,
} from "./sections";

/**
 * Public landing page ("/").
 * Pure composition: order of sections is the order on the page.
 * Copy lives in `content/landing`, styling in `landing.css`.
 */
export function LandingPage() {
  return (
    <div className={poppins.variable}>
      <main className="tv-p">
        <LandingNav />
        <HeroSection />
        <AboutSection />
        <AudienceSection />
        <HowItWorksSection />
        <PrivacySection />
        <TakedownSection />
        <SupportSection />
        <CommunitySection />
        <PartnersSection />
        <FinalCtaSection />
        <MinorsNotice />
        <FaqSection />
        <LandingFooter />
      </main>
    </div>
  );
}
