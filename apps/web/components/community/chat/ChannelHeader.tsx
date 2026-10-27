"use client";
import { useState } from "react";
import { Bell, BellOff, ShieldCheck, Timer } from "lucide-react";
import { HeaderActions } from "@/components/community/shell/ShellContext";
import { Dialog, Pill } from "@/components/community/ui/index";
import { copy } from "@/lib/community/copy";
import type { RoomDetail } from "@/lib/community/types";
import { NoteBody } from "./NoteBody";

/**
 * The buttons that belong to this channel (rules, mute, its badges), drawn inside the shell's top header.
 * The header's title and line of text come from the route, so they are already right before this screen has loaded.
 */
export function ChannelHeaderActions({ room, muted, onToggleMute }: { room: RoomDetail; muted: boolean; onToggleMute: () => void }) {
  const [notesOpen, setNotesOpen] = useState(false);
  return (
    <>
      <HeaderActions>
        {room.slowModeSeconds > 0 && <Pill className="hidden bg-white/60 lg:inline-flex"><Timer className="size-3" aria-hidden />{copy.room.slowMode(room.slowModeSeconds)}</Pill>}
        {room.kind !== "chat" && <Pill tone="indigo" className="hidden bg-white/60 sm:inline-flex">{room.kind === "quiet" ? copy.room.quietBadge : copy.room.staffBadge}</Pill>}
        {room.notes.length > 0 && (
          <button type="button" onClick={() => setNotesOpen(true)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-[var(--cat-ink)] transition-colors hover:bg-white/60">
            <ShieldCheck className="size-4" aria-hidden /><span className="hidden sm:inline">{copy.room.rules}</span>
          </button>
        )}
        <button type="button" onClick={onToggleMute} aria-pressed={muted} aria-label={muted ? copy.room.unmutedRoom : copy.room.mutedRoom} title={muted ? copy.room.unmutedRoom : copy.room.mutedRoom}
          className={`rounded-full p-2 transition-colors ${muted ? "bg-amber-100 text-amber-800" : "text-[var(--cm-ink-2)] hover:bg-white/60"}`}>
          {muted ? <BellOff className="size-[18px]" aria-hidden /> : <Bell className="size-[18px]" aria-hidden />}
        </button>
      </HeaderActions>

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
