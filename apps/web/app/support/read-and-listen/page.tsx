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
import { Piece } from "@/lib/support/types";

export const metadata = { title: "Read, watch and listen — Support — Traceveil" };

const Intro = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-6 max-w-xl text-[14px] leading-relaxed text-ink-soft">{children}</p>
);

const ALL_AUDIO = [
    ...TRACKS.map((t) => ({
    ...t,
    type: "track" as const,
  })),
  ...CALM_AUDIO.map((a) => ({
    ...a,
    type: "calm" as const,
  }))
];

export default function ReadAndListenPage() {
  const listen = (
 <>
      <Intro>
        Links open Spotify or YouTube. None of this is treatment. It is
        something to put on.
      </Intro>

      <h2 className="mb-1 text-[15px] font-semibold text-ink">
        Press play and sit
      </h2>

      <ul className="mb-12">
        {ALL_AUDIO.map((item, i) =>
          item.type === "calm" ? (
            <CalmRow
              key={item.id}
              a={item}
              index={i}
            />
          ) : (
            <TrackRow
              key={item.id}
              track={item}
              index={i}
            />
          )
        )}
      </ul>
    </>
  );

  const pieces = (list: Piece[], g: Piece["group"]) => list.filter((p) => p.group === g);
  const cards = (list: Piece[]) => (
    <div className="mb-12 grid gap-4">{list.map((p) => <PieceCard key={p.id} p={p} />)}</div>
  );

  const stories = (
    <>
      <Intro>
        Other people&apos;s accounts of getting through this. We link to them. We did not make them. Each has a
        content note. Stop whenever you like. Some are from other countries, so advice about laws there may not
        apply in India.
      </Intro>
      <h2 className="mb-4 text-[15px] font-semibold text-ink">Their own stories</h2>
      {cards(pieces(STORIES, "own"))}
      <h2 className="mb-1 text-[15px] font-semibold text-ink">The wider picture</h2>
      <p className="mb-4 max-w-xl text-[13.5px] leading-relaxed text-ink-soft">
        More about campaigning and how systems work than about recovery. Come back to these when you feel steadier.
      </p>
      {cards(pieces(STORIES, "wider"))}
    </>
  );

  const blogs = (
    <>
      <Intro>
        Short reading from organisations and survivors. Pick one. You don&apos;t have to read them in order.
      </Intro>
      <h2 className="mb-4 text-[15px] font-semibold text-ink">Understanding and getting help</h2>
      {cards(pieces(BLOGS, "understand"))}
      <h2 className="mb-4 text-[15px] font-semibold text-ink">Writing by survivors</h2>
      {cards(pieces(BLOGS, "voices"))}
    </>
  );

  // const blogs = (
  //   <>
  //     <Intro>
  //       Short reading from organisations and survivors. Pick one. You don&apos;t have to read them in order.
  //     </Intro>
  //     <div className="grid gap-4">{BLOGS.map((p) => <PieceCard key={p.id} p={p} />)}</div>
  //   </>
  // );

  const group = (key: "any" | "understand" | "work" | "teen") =>
    BOOKS.filter((b) => b.group === key);
  const shelf = (key: "any" | "understand" | "work" | "teen") => (
    <ul className="mb-12">
      {group(key).map((b, i) => <BookRow key={b.id} book={b} index={i} />)}
    </ul>
  );

  const books = (
    <>
      <Intro>
        Short sections you can read in any order. Where a book has hard material, it says so.
      </Intro>

      <h2 className="mb-1 text-[15px] font-semibold text-ink">For any day</h2>
      {shelf("any")}

      <h2 className="mb-1 text-[15px] font-semibold text-ink">To understand what trauma does</h2>
      <p className="mb-2 max-w-xl text-[13.5px] leading-relaxed text-ink-soft">
        Longer and more detailed. Read when you have the energy.
      </p>
      {shelf("understand")}

      <h2 className="mb-1 text-[15px] font-semibold text-ink">Workbooks and guides</h2>
      <p className="mb-2 max-w-xl text-[13.5px] leading-relaxed text-ink-soft">
        Mostly about sexual trauma in general. Two are about childhood abuse or intimacy, so read the note first.
      </p>
      {shelf("work")}

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
        lead="Words to read, voices to hear, moments to yourself"
        bgImage="/support/read-listen-bg.png"
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
