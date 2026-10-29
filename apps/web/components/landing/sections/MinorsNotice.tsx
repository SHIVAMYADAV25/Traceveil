import { MINORS_NOTICE } from "@/content/landing";
import { Card, PillButton } from "../primitives";

/** Under-18 safety notice. Not a Section: it sits flush under the final CTA. */
export function MinorsNotice() {
  return (
    <section className="tv-w tv-minors">
      <Card tone="pink" className="tv-minors__card">
        <div>
          <h3>{MINORS_NOTICE.title}</h3>
          <p className="tv-mu tv-minors__text">
            Call Childline <b>{MINORS_NOTICE.childline}</b> any time. You can also use{" "}
            <b>Take It Down</b>, a free service by NCMEC for images taken before you were 18.
          </p>
        </div>
        <PillButton href={MINORS_NOTICE.cta.href} variant="light">
          {MINORS_NOTICE.cta.label}
        </PillButton>
      </Card>
    </section>
  );
}
