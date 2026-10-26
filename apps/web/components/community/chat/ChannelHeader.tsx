"use client";
import { useState } from "react";
import { Bell, BellOff, ShieldCheck, Timer } from "lucide-react";
import { Dialog, Pill } from "@/components/community/ui";
import { PageHeader } from "@/components/community/shell/PageHeader";
import { ChannelIcon } from "@/components/community/ui/ChannelIcon";
import { copy } from "@/lib/community/copy";
import type { RoomDetail } from "@/lib/community/types";
import { NoteBody } from "./NoteBody";

/** Channel name and purpose, a way to reopen the pinned notes at any time, and mute. */
export function ChannelHeader({ room, muted, onToggleMute }: { room: RoomDetail; muted: boolean; onToggleMute: () => void }) {
  const [notesOpen, setNotesOpen] = useState(false);
  return (
    <>
      <PageHeader iconNode={<ChannelIcon slug={room.slug} kind={room.kind} locked={room.isLocked} className="size-[18px]" />} accent title={room.title} description={room.purpose}>
        {room.slowModeSeconds > 0 && <Pill className="hidden lg:inline-flex"><Timer className="size-3" aria-hidden />{copy.room.slowMode(room.slowModeSeconds)}</Pill>}
        {room.kind !== "chat" && <Pill tone="indigo" className="hidden sm:inline-flex">{room.kind === "quiet" ? copy.room.quietBadge : copy.room.staffBadge}</Pill>}
        {room.notes.length > 0 && (
          <button type="button" onClick={() => setNotesOpen(true)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-[var(--cat-ink)] hover:bg-[var(--cat-soft)]">
            <ShieldCheck className="size-4" aria-hidden /><span className="hidden sm:inline">{copy.room.rules}</span>
          </button>
        )}
        <button type="button" onClick={onToggleMute} aria-pressed={muted} aria-label={muted ? copy.room.unmutedRoom : copy.room.mutedRoom} title={muted ? copy.room.unmutedRoom : copy.room.mutedRoom}
          className={`rounded-full p-2 transition-colors ${muted ? "bg-amber-50 text-amber-800" : "text-[var(--cm-ink-2)] hover:bg-[var(--cm-hover)]"}`}>
          {muted ? <BellOff className="size-[18px]" aria-hidden /> : <Bell className="size-[18px]" aria-hidden />}
        </button>
      </PageHeader>

      <Dialog open={notesOpen} onClose={() => setNotesOpen(false)} title={`#${room.title}`}>
        <div className="space-y-5">
          {room.notes.map((n) => (
            <div key={n.id}>
              <h3 className="mb-2 text-[14.5px] font-semibold text-[var(--cat-ink)]">{n.title}</h3>
              <NoteBody body={n.body} />
            </div>
          ))}
        </div>
      </Dialog>
    </>
  );
}
