"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, Loader2 } from "lucide-react";
import { copy } from "@/lib/community/copy";
import { formatDay, sameDay } from "@/lib/community/format";
import type { Message, RoomKind } from "@/lib/community/types";
import { MessageItem, type MessageActions } from "@/components/community/chat/MessageItem";
import { Loader, Notice, SecondaryButton } from "@/components/community/ui/index";

interface Props extends Omit<MessageActions, "onJump"> {
  /** Shown at the very start of the channel, above the first message. */
  intro?: ReactNode;
  /** A message to scroll to once the channel has loaded (from a notification link). */
  focusId?: string | null;
  messages: Message[];
  roomKind: RoomKind;
  myPersonaId: string;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadingOlder: boolean;
  canReact: boolean;
  canWrite: boolean;
  reconnecting: boolean;
  onLoadOlder: () => void;
  onRetry: () => void;
  onReadUpTo: (lastId: string) => void;
}

const NEAR_BOTTOM = 96;
const GROUP_MS = 5 * 60 * 1000;

/** The scrolling conversation. It stays put while you read older messages and follows new ones only when you are at the bottom. */
export function MessageList(p: Props) {
  const box = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const restore = useRef<number | null>(null);
  const lastSeen = useRef<string | null>(null);
  const [unseen, setUnseen] = useState(0);
  const [highlight, setHighlight] = useState<string | null>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = box.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const onScroll = () => {
    const el = box.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM;
    if (atBottom.current) setUnseen(0);
  };

  // New messages arrived (or the first page loaded).
  const lastId = p.messages[p.messages.length - 1]?.id ?? null;
  const lastIsMine = p.messages[p.messages.length - 1]?.author.personaId === p.myPersonaId;
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    if (restore.current !== null) {
      el.scrollTop = el.scrollHeight - restore.current; // keep the same message in view after loading older ones
      restore.current = null;
      return;
    }
    const follow = lastSeen.current === null || atBottom.current || lastIsMine;
    const isNew = !!lastId && lastId !== lastSeen.current;
    if (follow) scrollToBottom();
    // State is updated on the next frame, not inside this effect.
    requestAnimationFrame(() => setUnseen((n) => (follow ? 0 : isNew ? n + 1 : n)));
    lastSeen.current = lastId;
  }, [lastId, lastIsMine, p.messages.length, scrollToBottom]);

  // Tell the server what has been read, once the bottom has been seen.
  const { onReadUpTo } = p;
  useEffect(() => {
    if (!lastId || unseen > 0) return;
    const t = setTimeout(() => { if (atBottom.current) onReadUpTo(lastId); }, 700);
    return () => clearTimeout(t);
  }, [lastId, unseen, onReadUpTo]);

  const loadOlder = () => {
    if (box.current) restore.current = box.current.scrollHeight - box.current.scrollTop;
    p.onLoadOlder();
  };

  const jump = useCallback((id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setHighlight(id);
    setTimeout(() => setHighlight((h) => (h === id ? null : h)), 2200);
  }, []);

  const doneFocus = useRef<string | null>(null);
  const { focusId, loading: isLoading, messages: all } = p;
  useEffect(() => {
    if (!focusId || isLoading || doneFocus.current === focusId || !all.some((m) => m.id === focusId)) return;
    doneFocus.current = focusId;
    const t = setTimeout(() => jump(focusId), 250);
    return () => clearTimeout(t);
  }, [focusId, isLoading, all, jump]);

  const empty = p.messages.length === 0 && !p.loading && !p.error;
  const e = copy.room.empty[p.roomKind];

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={box}
        onScroll={onScroll}
        data-lenis-prevent
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversation"
        className="cm-scroll h-full overflow-y-auto pb-4"
      >
        {p.loading && <Loader label={copy.room.loading} />}

        {p.error && (
          <div className="mx-auto my-8 max-w-sm space-y-3 text-center">
            <Notice tone="red" role="alert">{p.error}</Notice>
            <SecondaryButton onClick={p.onRetry}>{copy.room.retry}</SecondaryButton>
          </div>
        )}

        {!p.hasMore && !p.loading && p.intro}

        {p.hasMore && !p.loading && (
          <div className="flex justify-center py-3">
            <SecondaryButton size="sm" onClick={loadOlder} busy={p.loadingOlder}>{copy.room.olderMessages}</SecondaryButton>
          </div>
        )}

        {empty && (
          <div className="mx-auto max-w-sm px-4 py-8 text-center">
            <h2 className="text-[15.5px] font-semibold text-[var(--cm-ink)]">{e.title}</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--cm-ink-3)]">{e.body}</p>
          </div>
        )}

        {p.messages.map((m, i) => {
          const prev = p.messages[i - 1];
          const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
          const compact =
            !!prev && !newDay && prev.author.personaId === m.author.personaId && !m.replyTo &&
            prev.status === "visible" && m.status === "visible" &&
            new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_MS;
          return (
            <div key={m.id}>
              {newDay && (
                <div className="mt-5 flex items-center gap-3 px-4" role="separator" aria-label={formatDay(m.createdAt)}>
                  <span className="h-px flex-1 bg-[var(--cm-line)]" />
                  <span className="text-[12px] font-medium text-[var(--cm-ink-3)]">{formatDay(m.createdAt)}</span>
                  <span className="h-px flex-1 bg-[var(--cm-line)]" />
                </div>
              )}
              <MessageItem
                message={m}
                myPersonaId={p.myPersonaId}
                compact={compact}
                highlighted={highlight === m.id}
                canReact={p.canReact}
                canWrite={p.canWrite}
                onReply={p.onReply}
                onReact={p.onReact}
                onReport={p.onReport}
                onBlock={p.onBlock}
                onEdit={p.onEdit}
                onDelete={p.onDelete}
                onCopy={p.onCopy}
                onJump={jump}
              />
            </div>
          );
        })}
      </div>

      {p.reconnecting && (
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center px-4">
          <span className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-[12.5px] text-amber-900 shadow-sm">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />{copy.room.reconnecting}
          </span>
        </div>
      )}

      {unseen > 0 && (
        <button type="button" onClick={() => { scrollToBottom(true); setUnseen(0); }} className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[var(--cat-accent)] px-4 py-2 text-[13px] font-medium text-white shadow-lg hover:opacity-90">
          <ArrowDown className="size-3.5" aria-hidden />{copy.room.newMessages}
        </button>
      )}
    </div>
  );
}
