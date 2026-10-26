"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BlockDialog } from "@/components/community/chat/BlockDialog";
import { ChannelHeader } from "@/components/community/chat/ChannelHeader";
import { ChannelIntro } from "@/components/community/chat/ChannelIntro";
import { Composer } from "@/components/community/chat/Composer";
import { ReadOnlyBar } from "@/components/community/chat/ReadOnlyBar";
import { MessageList } from "@/components/community/chat/MessageList";
import { ReportDialog } from "@/components/community/chat/ReportDialog";
import { useRoomMessages } from "@/components/community/chat/useRoomMessages";
import { Dialog, Notice, PrimaryButton, SecondaryButton, Spinner } from "@/components/community/ui";
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
    return <div className="mx-auto max-w-md p-8"><Notice tone="red" role="alert">{roomError}</Notice><div className="mt-4 flex gap-2"><SecondaryButton onClick={() => void loadRoom()}>{copy.room.retry}</SecondaryButton><Link href="/community/start-here/welcome"><SecondaryButton>{copy.room.goWelcome}</SecondaryButton></Link></div></div>;
  }
  if (!room || !me) return <Spinner label={copy.room.loading} />;

  const canWrite = room.posting.allowed;
  const blockedMessage = !room.posting.allowed
    ? room.posting.code === "muted_in_room"
      ? `${copy.postingBlocked.muted_in_room} (${formatUntil(room.posting.endsAt ?? null)}).`
      : copy.postingBlocked[room.posting.code] ?? room.posting.message
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChannelHeader room={room} muted={muted} onToggleMute={() => void toggleMute()} />

      <MessageList
        intro={<ChannelIntro room={room} />}
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

      <div className="shrink-0 px-3 pb-4 pt-1 sm:px-6">
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
          <div className="mx-auto w-full max-w-[860px]"><ReadOnlyBar room={room} message={blockedMessage ?? ""} /></div>
        )}
      </div>

      <ReportDialog message={reporting} onClose={() => setReporting(null)} onBlock={(m) => setBlocking(m)} />
      <BlockDialog
        message={blocking}
        onClose={() => setBlocking(null)}
        onDone={(personaId) => { setBlocked((s) => new Set(s).add(personaId)); showToast(copy.block.done); }}
      />
      <Dialog open={deleting !== null} onClose={() => setDeleting(null)} title={copy.message.delete}>
        <p className="mb-5 text-[14.5px] leading-relaxed text-[var(--cm-ink-2)]">{copy.message.deleteConfirm}</p>
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={() => setDeleting(null)}>{copy.block.cancel}</SecondaryButton>
          <PrimaryButton onClick={() => void confirmDelete()}>{copy.message.delete}</PrimaryButton>
        </div>
      </Dialog>
    </div>
  );
}
