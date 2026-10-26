"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, del, get, patch, post, put } from "@/lib/community/api";
import { useCommunity, useCommunityEvents } from "@/lib/community/session";
import type { Message, ReactionKind } from "@/lib/community/types";

interface Page { messages: Message[]; hasMore: boolean }

/** Insert or replace by id, keeping messages in the order they were sent. */
function upsert(list: Message[], m: Message): Message[] {
  const i = list.findIndex((x) => x.id === m.id);
  if (i >= 0) { const next = list.slice(); next[i] = m; return next; }
  return [...list, m].sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
}

/**
 * Everything a room needs about its messages: the first page, older pages, live changes pushed by
 * the server, catching up after the connection drops, and the actions (react, edit, delete).
 */
export function useRoomMessages(roomId: string | null) {
  const { me, subscribe, unsubscribe, reconnectTick } = useCommunity();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<string | null>(roomId);
  roomRef.current = roomId;
  const myPersona = me?.persona.id;

  const load = useCallback(async (id: string, keepExisting: boolean) => {
    try {
      const page = await get<Page>(`/rooms/${id}/messages?limit=50`);
      if (roomRef.current !== id) return;
      setMessages((prev) => (keepExisting ? page.messages.reduce(upsert, prev) : page.messages));
      if (!keepExisting) setHasMore(page.hasMore);
      setError(null);
    } catch (err) {
      if (roomRef.current !== id) return;
      setError(err instanceof ApiError ? err.message : "We could not load this room.");
    } finally {
      if (roomRef.current === id) setLoading(false);
    }
  }, []);

  // Switching rooms: start clean, load, and join that room's live updates.
  useEffect(() => {
    if (!roomId) return;
    setMessages([]); setHasMore(false); setLoading(true); setError(null);
    void load(roomId, false);
    subscribe(roomId);
    return () => unsubscribe(roomId);
  }, [roomId, load, subscribe, unsubscribe]);

  // After the connection came back, fetch what was missed.
  useEffect(() => {
    if (roomId && reconnectTick > 0) void load(roomId, true);
  }, [reconnectTick, roomId, load]);

  useCommunityEvents((e) => {
    if (!roomRef.current) return;
    switch (e.type) {
      case "message.created":
        if (e.data.message.roomId === roomRef.current) setMessages((p) => upsert(p, e.data.message));
        break;
      case "message.updated": {
        const incoming = e.data.message;
        if (incoming.roomId !== roomRef.current) break;
        // The pushed copy is neutral (it cannot know which reactions are mine), so keep ours.
        setMessages((p) => p.map((m) => (m.id === incoming.id ? { ...incoming, reactions: m.reactions } : m)));
        break;
      }
      case "message.hidden":
      case "message.deleted":
        if (e.data.roomId !== roomRef.current) break;
        setMessages((p) => p.map((m) => m.id === e.data.messageId
          ? { ...m, status: e.type === "message.hidden" ? "hidden_by_mod" : "deleted_by_author", body: null, contentWarning: null, needTag: null, reactions: [], mentions: [] }
          : m));
        break;
      case "reaction.changed": {
        const d = e.data;
        if (d.roomId !== roomRef.current) break;
        setMessages((p) => p.map((m) => {
          if (m.id !== d.messageId) return m;
          const mine = d.personaId === myPersona ? d.added : m.reactions.find((r) => r.kind === d.kind)?.mine ?? false;
          const rest = m.reactions.filter((r) => r.kind !== d.kind);
          return { ...m, reactions: d.count > 0 ? [...rest, { kind: d.kind, count: d.count, mine }].sort((a, b) => a.kind.localeCompare(b.kind)) : rest };
        }));
        break;
      }
      default:
    }
  });

  const loadOlder = useCallback(async () => {
    if (!roomId || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const page = await get<Page>(`/rooms/${roomId}/messages?limit=50&before=${messages[0]?.id}`);
      setMessages((prev) => [...page.messages.filter((m) => !prev.some((p) => p.id === m.id)), ...prev]);
      setHasMore(page.hasMore);
    } finally { setLoadingOlder(false); }
  }, [roomId, loadingOlder, messages]);

  const toggleReaction = useCallback(async (messageId: string, kind: ReactionKind, on: boolean) => {
    const r = await (on ? put : del)<{ count: number; mine: boolean }>(`/messages/${messageId}/reactions/${kind}`);
    setMessages((p) => p.map((m) => {
      if (m.id !== messageId) return m;
      const rest = m.reactions.filter((x) => x.kind !== kind);
      return { ...m, reactions: r.count > 0 ? [...rest, { kind, count: r.count, mine: r.mine }].sort((a, b) => a.kind.localeCompare(b.kind)) : rest };
    }));
  }, []);

  const send = useCallback(async (body: {
    clientMsgId: string; body: string; replyToId?: string; needTag?: string; contentWarning?: string; mentions: string[]; confirmShare: boolean;
  }) => {
    const r = await post<{ message: Message; support: boolean }>(`/rooms/${roomId}/messages`, body);
    setMessages((p) => upsert(p, r.message));
    return r;
  }, [roomId]);

  const edit = useCallback(async (id: string, body: string, contentWarning: string | undefined, confirmShare: boolean) => {
    const r = await patch<{ message: Message }>(`/messages/${id}`, { body, contentWarning, confirmShare });
    setMessages((p) => p.map((m) => (m.id === id ? { ...r.message } : m)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await del(`/messages/${id}`);
    setMessages((p) => p.map((m) => m.id === id ? { ...m, status: "deleted_by_author", body: null, contentWarning: null, needTag: null, reactions: [], mentions: [] } : m));
  }, []);

  const retry = useCallback(() => { if (roomId) { setLoading(true); void load(roomId, false); } }, [roomId, load]);

  return { messages, hasMore, loading, loadingOlder, error, loadOlder, toggleReaction, send, edit, remove, retry, setMessages };
}
