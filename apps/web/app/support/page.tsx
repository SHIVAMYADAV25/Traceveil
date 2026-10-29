import { PageIntro } from "@/components/support/PageIntro";
import { CrisisPanel } from "@/components/support/CrisisPanel";
import { PathTile } from "@/components/support/PathTile";
import { SectionRule } from "@/components/support/SectionRule";
import { LockIcon, CheckIcon, ExitIcon } from "@/components/support/Icons";
import {
  TalkIllustration, CircleIllustration, ReadListenIllustration,
} from "@/components/support/illustrations";
import Link from "next/link";
import { ArrowRight } from "@/components/support/Icons";
import { BOOKS } from "@/content/support/books";
import { TRACKS } from "@/content/support/music";
import { CALM_AUDIO } from "@/content/support/calm";
import { STORIES, BLOGS } from "@/content/support/stories";
import { OWN_SPACES } from "@/content/support/own-spaces";

export const metadata = { title: "Support — Traceveil" };

export default function SupportHubPage() {
  return (
    <>
      <PageIntro
        badge="Support"
        title="Getting the content taken down is one job. Looking after yourself is another."
        lead="We've gathered trusted services and people you can turn to, many of them free. Explore what feels helpful right now."
        bgImage="/support/counsellor-bg1.png"
      >
        <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-ink-soft">
          <li className="inline-flex items-center gap-1.5"><CheckIcon size={12} className="text-emerald-600" /> No account needed</li>
          <li className="inline-flex items-center gap-1.5"><LockIcon size={12} className="text-emerald-600" /> We don&apos;t record what you open</li>
          {/* <li className="inline-flex items-center gap-1.5"><ExitIcon size={12} className="text-emerald-600" /> Leave quickly button, top right</li> */}
        </ul>
      </PageIntro>

      <div className="mb-14">
        <CrisisPanel />
      </div>

      <SectionRule n="01" label="Where would you like to start?" />
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
        <PathTile
          href="/support/counsellors"
          tag="Talk to someone"
          tone="care"
          title="A counsellor or therapist"
          body="People trained to help with what a leak does to your sleep, your work and your sense of safety. You don't have to show them anything."
          meta="Free · Phone, chat, email · Open at any hour"
          cta="See counsellors"
          art={<TalkIllustration />}
        />
        <PathTile
          href="/support/community"
          tag="Get help and company"
          tone="brand"
          title="Get it taken down, or talk with others"
          body="Ways to ask for images to be removed, organisations that can help, and our own Discord and chat for people who understand."
          meta="Removal · Legal help · Talk with others"
          cta="See what is here"
          art={<CircleIllustration />}
        />
        <PathTile
          href="/support/read-and-listen"
          tag="Take a break"
          tone="safe"
          title="Read, watch and listen"
          body="Stories from other people, blogs, books and calm audio. Pick one. You don't have to finish it, and you don't have to feel better after."
          meta={`${STORIES.length} stories · ${BLOGS.length} blogs · ${BOOKS.length} books · ${TRACKS.length + CALM_AUDIO.length} audio`}
          cta="Browse"
          art={<ReadListenIllustration />}
        />
      </div>

      <Link
        href="/support/community#communities"
        className="group mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-paper p-5 transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div className="max-w-xl">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-600">Run by Traceveil</p>
          <p className="mb-1 text-[15px] font-semibold text-ink">Talk with others who understand</p>
          <p className="text-[13.5px] leading-relaxed text-ink-soft">
            Our Discord and our chat are for people whose private images were shared without consent.{" "}
            {OWN_SPACES.every((s) => s.url === null) ? "Both are opening soon." : "See which are open."}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink">
          How they work <ArrowRight size={12} className="transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </Link>

      <div className="mt-8 rounded-2xl border border-line bg-paper p-5 sm:p-6">
        <p className="mb-1 text-[14px] font-semibold text-ink">If you are under 18</p>
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-soft">
          Call <a className="font-mono font-semibold text-ink underline underline-offset-2" href="tel:1098">1098</a> (Childline, free).
          <a className="font-medium text-ink underline underline-offset-2" href="https://takeitdown.ncmec.org" target="_blank" rel="noopener noreferrer">Take It Down<span className="sr-only"> (opens in a new tab)</span></a> is a free tool for images taken before you were 18. StopNCII and some other services on the next pages are for 18 and over only.
        </p>
      </div>
    </>
  );
}
