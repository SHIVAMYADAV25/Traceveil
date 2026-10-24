"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BellOff, Bell, ChevronDown, Info, Lock, MessageSquareOff } from "lucide-react";
import { BlockDialog } from "@/components/community/BlockDialog";
import { Composer } from "@/components/community/Composer";
import { MessageList } from "@/components/community/MessageList";
import { ReportDialog } from "@/components/community/ReportDialog";
import { useRoomMessages } from "@/components/community/useRoomMessages";
import { Dialog, Notice, Pill, PrimaryButton, SecondaryButton, Spinner } from "@/components/community/ui";
import { ApiError, get, post, put } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { formatUntil } from "@/lib/community/format";
import { rememberRoom } from "@/lib/community/lastRoom";
import { useCommunity, useCommunityEvents } from "@/lib/community/session";
import type { Message, ReactionKind, RoomDetail } from "@/lib/community/types";

const FOURTEEN_DAYS = 14 * 24 * 3600 * 1000;

/** A new RoomView is mounted for every room, so nothing from the previous room (draft reply, open dialogs, notes panel) can carry over. */
export default function RoomPage() {
  const { space, room } = useParams<{ space: string; room: string }>();
  return <RoomView key={`${space}/${room}`} space={space} roomSlug={room} />;
}

function RoomView({ space, roomSlug }: { space: string; roomSlug: string }) {
  const { me, spaces, reconnectTick, socketStatus, showToast, markRoomRead, reloadSpaces } = useCommunity();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [reporting, setReporting] = useState<Message | null>(null);
  const [blocking, setBlocking] = useState<Message | null>(null);
  const [deleting, setDeleting] = useState<Message | null>(null);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());

  const loadRoom = useCallback(async () => {
    try {
      const r = await get<{ room: RoomDetail }>(`/rooms/by-slug/${space}/${roomSlug}`);
      setRoom(r.room); setRoomError(null);
      rememberRoom(`/community/${space}/${roomSlug}`);
    } catch (err) { setRoomError(err instanceof ApiError ? err.message : copy.room.couldNotLoad); }
  }, [space, roomSlug]);

  // Load once on arrival, and again whenever the live connection comes back.
  useEffect(() => {
    let alive = true;
    get<{ room: RoomDetail }>(`/rooms/by-slug/${space}/${roomSlug}`)
      .then((r) => { if (alive) { setRoom(r.room); setRoomError(null); rememberRoom(`/community/${space}/${roomSlug}`); } })
      .catch((err) => { if (alive) setRoomError(err instanceof ApiError ? err.message : copy.room.couldNotLoad); });
    return () => { alive = false; };
  }, [space, roomSlug, reconnectTick]);
  useCommunityEvents((e) => { if (e.type === "room.updated" && e.data.room.id === room?.id) void loadRoom(); });

  const feed = useRoomMessages(room?.id ?? null);
  const listed = spaces.flatMap((s) => s.rooms).find((r) => r.id === room?.id);
  const muted = listed?.muted ?? false;

  const visible = useMemo(() => feed.messages.filter((m) => !blocked.has(m.author.personaId)), [feed.messages, blocked]);

  const candidates = useMemo(() => {
    const seen = new Map<string, { personaId: string; displayName: string }>();
    // Relative to the newest message, so this stays a pure calculation.
    const newest = feed.messages.length ? new Date(feed.messages[feed.messages.length - 1]!.createdAt).getTime() : 0;
    const cutoff = newest - FOURTEEN_DAYS;
    for (const m of feed.messages) {
      if (m.author.personaId === me?.persona.id || m.author.displayName === "Deleted member" || blocked.has(m.author.personaId)) continue;
      if (new Date(m.createdAt).getTime() < cutoff || m.status !== "visible") continue;
      seen.set(m.author.personaId, { personaId: m.author.personaId, displayName: m.author.displayName });
    }
    return [...seen.values()];
  }, [feed.messages, me?.persona.id, blocked]);

  const onReadUpTo = useCallback((lastId: string) => {
    if (!room) return;
    markRoomRead(room.id);
    void post(`/rooms/${room.id}/read`, { messageId: lastId }).catch(() => undefined);
  }, [room, markRoomRead]);

  const onReact = useCallback(async (m: Message, kind: ReactionKind, on: boolean) => {
    try { await feed.toggleReaction(m.id, kind, on); }
    catch (err) { showToast(err instanceof ApiError ? err.message : copy.errors.generic); }
  }, [feed, showToast]);

  const onCopy = useCallback(async (m: Message) => {
    try { await navigator.clipboard.writeText(m.body ?? ""); showToast(copy.recovery.copied); } catch { showToast(copy.errors.generic); }
  }, [showToast]);

  async function toggleMute() {
    if (!room) return;
    try { await put(`/rooms/${room.id}/mute`, { muted: !muted }); await reloadSpaces(); }
    catch (err) { showToast(err instanceof ApiError ? err.message : copy.errors.generic); }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try { await feed.remove(deleting.id); } catch (err) { showToast(err instanceof ApiError ? err.message : copy.errors.generic); }
    setDeleting(null);
  }

  if (roomError) {
    return <div className="mx-auto max-w-md p-8"><Notice tone="red" role="alert">{roomError}</Notice><div className="mt-4"><SecondaryButton onClick={() => void loadRoom()}>{copy.room.retry}</SecondaryButton></div></div>;
  }
  if (!room || !me) return <Spinner label={copy.room.loading} />;

  const canWrite = room.posting.allowed;
  const blockedMessage = !room.posting.allowed
    ? room.posting.code === "muted_in_room"
      ? `${copy.postingBlocked.muted_in_room} (${formatUntil(room.posting.endsAt ?? null)}).`
      : copy.postingBlocked[room.posting.code] ?? room.posting.message
    : null;

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-[#e8e4de] bg-white px-4 py-3 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-[18px] font-semibold tracking-tight text-[#0a0a0a]">{room.title}</h1>
            <p className="mt-0.5 text-[13.5px] leading-snug text-[#374151]">{room.purpose}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {room.kind === "quiet" && <Pill tone="indigo">{copy.room.quietBadge}</Pill>}
              {room.kind === "announcements" && <Pill>{copy.room.staffBadge}</Pill>}
              {room.isLocked && <Pill tone="amber"><Lock className="size-3" aria-hidden />{copy.room.lockedBadge}</Pill>}
              {room.slowModeSeconds > 0 && <Pill>{copy.room.slowMode(room.slowModeSeconds)}</Pill>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => void toggleMute()} aria-pressed={muted} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${muted ? "border-amber-200 bg-amber-50 text-amber-900" : "border-[#e8e4de] bg-white text-[#374151] hover:bg-[#f0ede8]"}`}>
              {muted ? <BellOff className="size-3.5" aria-hidden /> : <Bell className="size-3.5" aria-hidden />}
              <span className="hidden sm:inline">{muted ? copy.room.unmutedRoom : copy.room.mutedRoom}</span>
              <span className="sm:hidden">{muted ? "Muted" : "Mute"}</span>
            </button>
          </div>
        </div>
        {room.notes.length > 0 && (
          <div className="mt-2">
            <button type="button" onClick={() => setNotesOpen((o) => !o)} aria-expanded={notesOpen} className="inline-flex items-center gap-1.5 rounded-full border border-[#e8e4de] bg-[#fafaf8] px-3 py-1 text-[12.5px] font-medium text-[#374151] hover:bg-[#f0ede8]">
              <Info className="size-3.5" aria-hidden />{copy.room.pinned}: {room.notes[0]?.title}
              <ChevronDown className={`size-3 transition-transform ${notesOpen ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {notesOpen && (
              <div className="mt-2 space-y-3 rounded-xl border border-[#e8e4de] bg-[#fafaf8] p-4">
                {room.notes.map((n) => (
                  <div key={n.id}>
                    <p className="mb-1 font-mono text-[10.5px] uppercase tracking-widest text-[#6b7280]">{n.title}</p>
                    <p className="whitespace-pre-line text-[14px] leading-relaxed text-[#0a0a0a]">{n.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      <MessageList
        messages={visible}
        roomKind={room.kind}
        myPersonaId={me.persona.id}
        loading={feed.loading}
        error={feed.error}
        hasMore={feed.hasMore}
        loadingOlder={feed.loadingOlder}
        canReact={me.onboardingComplete}
        canWrite={canWrite}
        reconnecting={socketStatus === "reconnecting"}
        onLoadOlder={() => void feed.loadOlder()}
        onRetry={feed.retry}
        onReadUpTo={onReadUpTo}
        onReply={setReplyTo}
        onReact={onReact}
        onReport={setReporting}
        onBlock={setBlocking}
        onEdit={(m, body, cw, confirm) => feed.edit(m.id, body, cw, confirm)}
        onDelete={setDeleting}
        onCopy={onCopy}
      />

      <div className="shrink-0 border-t border-[#e8e4de] bg-[#fafaf8] px-3 py-3 sm:px-6">
        {canWrite ? (
          <Composer
            room={room}
            candidates={candidates}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onSend={(body) => feed.send(body)}
            onSent={() => undefined}
          />
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-[#e8e4de] bg-white px-4 py-3 text-[14px] leading-relaxed text-[#374151]">
            <MessageSquareOff className="mt-0.5 size-4 shrink-0 text-[#6b7280]" aria-hidden />
            <p>{blockedMessage}</p>
          </div>
        )}
      </div>

      <ReportDialog message={reporting} onClose={() => setReporting(null)} onBlock={(m) => setBlocking(m)} />
      <BlockDialog
        message={blocking}
        onClose={() => setBlocking(null)}
        onDone={(personaId) => { setBlocked((s) => new Set(s).add(personaId)); showToast(copy.block.done); }}
      />
      <Dialog open={deleting !== null} onClose={() => setDeleting(null)} title={copy.message.delete}>
        <p className="mb-5 text-[14.5px] leading-relaxed text-[#374151]">{copy.message.deleteConfirm}</p>
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={() => setDeleting(null)}>{copy.block.cancel}</SecondaryButton>
          <PrimaryButton onClick={() => void confirmDelete()}>{copy.message.delete}</PrimaryButton>
        </div>
      </Dialog>
    </div>
  );
}
