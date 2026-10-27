"use client";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { copy } from "@/lib/community/copy";
import type { Message } from "@/lib/community/types";
import { Dialog, PrimaryButton, SecondaryButton } from "@/components/community/ui/index";

const URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"')]+)/giu;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Turns message text into display pieces. Everything is plain text: no HTML and no markdown is
 * ever interpreted. Mentions are highlighted. Links are clickable only when a member of the team
 * or a verified helper wrote them, and even then they ask before leaving the site.
 */
export function MessageBody({ message, myPersonaId }: { message: Message; myPersonaId: string }) {
  const [leaving, setLeaving] = useState<string | null>(null);
  const body = message.body ?? "";

  const nodes = useMemo(() => {
    const names = message.mentions.map((m) => `@${m.displayName}`);
    const parts = [...names.map(escapeRe), ...(message.author.linksClickable ? [URL_RE.source] : [])];
    if (parts.length === 0) return [body] as ReactNode[];
    const re = new RegExp(`(${parts.join("|")})`, "giu");
    return body.split(re).map((piece, i): ReactNode => {
      if (!piece) return null;
      const mention = message.mentions.find((m) => piece.toLowerCase() === `@${m.displayName}`.toLowerCase());
      if (mention) {
        const mine = mention.personaId === myPersonaId;
        return (
          <span key={i} className={`rounded px-1 py-px font-medium ${mine ? "bg-indigo-100 text-indigo-800" : "bg-indigo-50 text-indigo-700"}`}>{piece}</span>
        );
      }
      if (message.author.linksClickable && /^(https?:\/\/|www\.)/i.test(piece)) {
        const href = /^https?:\/\//i.test(piece) ? piece : `https://${piece}`;
        return (
          <button key={i} type="button" onClick={() => setLeaving(href)} className="break-all text-left text-indigo-700 underline underline-offset-2 hover:text-indigo-900">{piece}</button>
        );
      }
      return <Fragment key={i}>{piece}</Fragment>;
    });
  }, [body, message.mentions, message.author.linksClickable, myPersonaId]);

  return (
    <>
      <p className="whitespace-pre-wrap break-words text-[16px] leading-[22px] text-[var(--cm-ink)]">{nodes}</p>
      <Dialog open={leaving !== null} onClose={() => setLeaving(null)} title={copy.message.leavingTitle}>
        <p className="mb-2 text-[14px] leading-relaxed text-[var(--cm-ink-2)]">{copy.message.leavingBody}</p>
        <p className="mb-5 break-all rounded-lg bg-[var(--cm-hover)] px-3 py-2 font-mono text-[12.5px] text-[var(--cm-ink)]">{leaving}</p>
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={() => setLeaving(null)}>{copy.message.leavingStay}</SecondaryButton>
          <PrimaryButton onClick={() => { if (leaving) window.open(leaving, "_blank", "noopener,noreferrer"); setLeaving(null); }}>{copy.message.leavingGo}</PrimaryButton>
        </div>
      </Dialog>
    </>
  );
}
