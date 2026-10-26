import { Lock, MessageSquareOff, Users } from "lucide-react";
import type { RoomDetail } from "@/lib/community/types";

/** Shown where the composer would be, with the reason in plain words. Same idea as the reference's "no permission" bar. */
export function ReadOnlyBar({ room, message }: { room: RoomDetail; message: string }) {
  const Icon = room.isLocked ? Lock : room.kind === "chat" ? MessageSquareOff : Users;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--cm-line)] bg-[var(--cm-surface)] px-4 py-3.5 text-[14px] leading-snug text-[var(--cm-ink-2)]">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--cm-hover)] text-[var(--cm-ink-3)]"><Icon className="size-4" aria-hidden /></span>
      <p>{message}{room.kind !== "chat" && !room.isLocked ? " You can still react to messages." : ""}</p>
    </div>
  );
}
