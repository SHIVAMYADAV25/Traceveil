import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  /** Bold word(s) rendered after the title. */
  highlight?: string;
  titleEnd?: string;
  /** Sub-line under the title. */
  lead?: ReactNode;
  centered?: boolean;
  /** Narrow, centred lead (used by the audience section). */
  narrowLead?: boolean;
};

/** h2 with an optional bold highlight and lead paragraph. */
export function SectionHeading({ title, highlight, titleEnd, lead, centered, narrowLead }: Props) {
  return (
    <>
      <h2 className={centered ? "tv-center" : undefined}>
        {title}
        {highlight ? (
          <>
            {" "}
            <b>{highlight}</b>
          </>
        ) : null}
        {titleEnd ? (/^[?!.,]/.test(titleEnd) ? titleEnd : ` ${titleEnd}`) : null}
      </h2>
      {lead ? (
        <p className={`tv-mu tv-sub${narrowLead ? " tv-sub--narrow" : ""}`}>{lead}</p>
      ) : null}
    </>
  );
}
