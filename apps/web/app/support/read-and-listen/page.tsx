import { PageIntro } from "@/components/support/PageIntro";
import { SectionRule } from "@/components/support/SectionRule";
import { SupportTabs } from "@/components/support/SupportTabs";
import { TrackRow } from "@/components/support/TrackRow";
import { CalmRow } from "@/components/support/CalmRow";
import { BookRow } from "@/components/support/BookRow";
import { PieceCard } from "@/components/support/PieceCard";
import { TRACKS } from "@/content/support/music";
import { CALM_AUDIO } from "@/content/support/calm";
import { BOOKS } from "@/content/support/books";
import { STORIES, BLOGS } from "@/content/support/stories";

export const metadata = { title: "Read, watch and listen — Support — Sniffer" };

const Intro = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-6 max-w-xl text-[14px] leading-relaxed text-ink-soft">{children}</p>
);

export default function ReadAndListenPage() {
  const listen = (
    <>
      <Intro>
        Links open Spotify or YouTube. None of this is treatment. It is something to put on.
      </Intro>
      <h2 className="mb-1 text-[15px] font-semibold text-ink">Press play and sit</h2>
      <ul className="mb-12">{CALM_AUDIO.map((a, i) => <CalmRow key={a.id} a={a} index={i} />)}</ul>
      <h2 className="mb-1 text-[15px] font-semibold text-ink">Songs, by the moment you are in</h2>
      <p className="mb-2 max-w-xl text-[13.5px] leading-relaxed text-ink-soft">
        Half have no lyrics, because words about love or loss can hit hard on a bad day.
      </p>
      <ul>{TRACKS.map((t, i) => <TrackRow key={t.id} track={t} index={i} />)}</ul>
    </>
  );

  const stories = (
    <>
      <Intro>
        Other people&apos;s accounts of getting through this. We link to them. We did not make them. Each has a
        content note. Stop whenever you like. Some are from other countries, so advice about laws there may not
        apply in India.
      </Intro>
      <div className="grid gap-4">{STORIES.map((p) => <PieceCard key={p.id} p={p} />)}</div>
    </>
  );

  const blogs = (
    <>
      <Intro>
        Short reading from organisations and survivors. Pick one. You don&apos;t have to read them in order.
      </Intro>
      <div className="grid gap-4">{BLOGS.map((p) => <PieceCard key={p.id} p={p} />)}</div>
    </>
  );

  const group = (key: "any" | "write" | "teen") => BOOKS.filter((b) => b.group === key);
  const books = (
    <>
      <Intro>
        Short sections you can read in any order. Where a book has hard material, it says so.
      </Intro>
      <h2 className="mb-1 text-[15px] font-semibold text-ink">For any day</h2>
      <ul className="mb-12">{group("any").map((b, i) => <BookRow key={b.id} book={b} index={i} />)}</ul>
      <h2 className="mb-1 text-[15px] font-semibold text-ink">To write in</h2>
      <ul className="mb-12">{group("write").map((b, i) => <BookRow key={b.id} book={b} index={i} />)}</ul>
      <h2 className="mb-1 text-[15px] font-semibold text-ink">For teenagers</h2>
      <p className="mb-2 text-[13.5px] text-ink-soft">
        If you are under 18, you can also call{" "}
        <a className="font-mono font-semibold text-ink underline underline-offset-2" href="tel:1098">1098</a>.
      </p>
      <ul>{group("teen").map((b, i) => <BookRow key={b.id} book={b} index={i} />)}</ul>
    </>
  );

  return (
    <>
      <PageIntro
        tone="safe"
        badge="Read, watch and listen"
        title="Something to listen to, watch or read when your mind won't settle"
        lead="Pick one. You don't have to finish it, and you don't have to feel better afterwards."
      />
      <SectionRule n="01" label="Choose one" />
      <SupportTabs
        label="Kind of break"
        items={[
          { key: "listen", label: "Listen", count: CALM_AUDIO.length + TRACKS.length, panel: listen },
          { key: "stories", label: "Stories", count: STORIES.length, panel: stories },
          { key: "blogs", label: "Blogs", count: BLOGS.length, panel: blogs },
          { key: "books", label: "Books", count: BOOKS.length, panel: books },
        ]}
      />
    </>
  );
}
