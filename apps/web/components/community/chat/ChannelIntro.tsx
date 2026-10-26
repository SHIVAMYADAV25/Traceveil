import Image from "next/image";
import { Lock, ShieldCheck, Timer, Users } from "lucide-react";
import { Pill } from "@/components/community/ui";
import { ChannelIcon } from "@/components/community/ui/ChannelIcon";
import { themeFor } from "@/lib/community/channelTheme";
import { copy } from "@/lib/community/copy";
import type { RoomDetail } from "@/lib/community/types";
import { NoteBody } from "./NoteBody";

/**
 * The first thing in every channel: a banner in the group's colours, a large title, a line about what
 * the channel is for, and the channel's pinned notes (such as the four rules) written out in full.
 * Rules are never folded away. Anyone who opens a channel can read them without pressing anything.
 */
export function ChannelIntro({ room }: { room: RoomDetail }) {
  const theme = themeFor(room.spaceSlug);
  const isWelcome = room.slug === "welcome";
  const title = isWelcome ? `Welcome to Traceveil ${copy.brand}` : `Welcome to #${room.title}`;
  return (
    <section id="channel-intro" aria-label={copy.room.about} className="mx-auto w-full max-w-[760px] px-3 pb-2 pt-6 sm:px-4 sm:pt-10">
      <div className="relative h-36 overflow-hidden rounded-3xl sm:h-44">
        <Image src={theme.banner} alt="" fill priority sizes="(min-width: 768px) 760px, 100vw" className="object-cover object-[80%_center]" />
      </div>
      <div className="relative z-10 -mt-8 flex justify-center">
        <span className="flex size-16 items-center justify-center rounded-full border-4 border-[var(--cm-canvas)] bg-[var(--cat-soft)] text-[var(--cat-accent)] shadow-sm">
          <ChannelIcon slug={room.slug} kind={room.kind} className="size-7" />
        </span>
      </div>

      <div className="mt-3 text-center">
        <h2 className="cm-title text-[32px] leading-tight text-[var(--cm-ink)] sm:text-[40px]">{title}</h2>
        <p className="mx-auto mt-2 max-w-[520px] text-[15px] leading-relaxed text-[var(--cm-ink-2)]">{room.purpose}</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          {room.kind !== "chat" && <Pill tone="indigo"><Users className="size-3" aria-hidden />{room.kind === "quiet" ? copy.room.quietBadge : copy.room.staffBadge}</Pill>}
          {room.isLocked && <Pill tone="amber"><Lock className="size-3" aria-hidden />{copy.room.lockedBadge}</Pill>}
          {room.slowModeSeconds > 0 && <Pill><Timer className="size-3" aria-hidden />{copy.room.slowMode(room.slowModeSeconds)}</Pill>}
        </div>
      </div>

      {room.notes.length > 0 && (
        <div className="mt-7 space-y-3">
          {room.notes.map((n) => (
            <div key={n.id} className="rounded-3xl bg-[var(--cat-soft)]/70 p-5 ring-1 ring-[var(--cat-accent)]/15 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="size-[18px] text-[var(--cat-accent)]" aria-hidden />
                <h3 className="text-[15.5px] font-semibold text-[var(--cat-ink)]">{n.title}</h3>
              </div>
              <NoteBody body={n.body} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
