"use client";
import { CornerUpLeft } from "lucide-react";
import { copy } from "@/lib/community/copy";
import type { Message } from "@/lib/community/types";

/**
 * The line above a reply that shows who and what it answers. A soft curve leads from the message
 * back to the original, and pressing it scrolls there. Mirrors the pattern in the reference chat.
 */
export function ReplyPreview({ reply, onJump, own }: { reply: NonNullable<Message["replyTo"]>; onJump: (id: string) => void; own: boolean }) {
  const text = reply.excerpt ?? (reply.hasContentWarning ? copy.message.replyCw : copy.message.replyUnavailable);
  return (
    <button
      type="button"
      onClick={() => onJump(reply.id)}
      title={copy.message.jumpToOriginal}
      className={`group/reply mb-1 flex max-w-full items-center gap-2 text-left text-[12.5px] text-[var(--cm-ink-3)] hover:text-[var(--cm-ink-2)] ${own ? "ml-auto" : "pl-[18px]"}`}
    >
      {!own && <span className="mt-2 h-3.5 w-7 shrink-0 rounded-tl-xl border-l-2 border-t-2 border-[var(--cm-line-strong)] group-hover/reply:border-[var(--cat-accent)]" aria-hidden />}
      <CornerUpLeft className="size-3 shrink-0" aria-hidden />
      <span className="shrink-0 font-medium text-[var(--cm-ink-2)]">{reply.authorName}</span>
      <span className="truncate">{text}</span>
    </button>
  );
}
