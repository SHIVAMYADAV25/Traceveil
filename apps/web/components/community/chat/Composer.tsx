"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, BookOpen, Ear, HeartHandshake, Lightbulb, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { ApiError, newClientId } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import type { Message, NeedTag, Room } from "@/lib/community/types";
import { SupportCard } from "@/components/community/chat/SupportCard";
import { Dialog, Notice, PrimaryButton, SecondaryButton } from "@/components/community/ui";

type Panel = "need" | "cw" | null;

const MAX = 2000;
const NEEDS: Array<{ id: NeedTag; Icon: LucideIcon }> = [{ id: "listen", Icon: Ear }, { id: "advice", Icon: Lightbulb }, { id: "reading", Icon: BookOpen }];

interface Candidate { personaId: string; displayName: string }
type SendFn = (b: { clientMsgId: string; body: string; replyToId?: string; needTag?: string; contentWarning?: string; mentions: string[]; confirmShare: boolean }) => Promise<{ support: boolean }>;

interface Props {
  room: Room;
  candidates: Candidate[];
  replyTo: Message | null;
  onCancelReply: () => void;
  onSend: SendFn;
  onSent: () => void;
}

/**
 * Where a message is written. Slow mode, mentions, the optional "what would help" tag and the
 * content warning all live here. Every kind of refusal from the server is shown in plain words
 * and the person's text is never lost.
 */
export function Composer({ room, candidates, replyTo, onCancelReply, onSend, onSent }: Props) {
  const [text, setText] = useState("");
  const [need, setNeed] = useState<NeedTag | null>(null);
  const [cwOn, setCwOn] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [cw, setCw] = useState("");
  const [mentions, setMentions] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [confirmKinds, setConfirmKinds] = useState<string[] | null>(null);
  const [support, setSupport] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const clientId = useRef(newClientId());

  // Reply focuses the box so the person can start typing straight away.
  useEffect(() => { if (replyTo) area.current?.focus(); }, [replyTo]);

  // Auto-grow up to a limit.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const options = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return candidates.filter((c) => c.displayName.toLowerCase().includes(q)).slice(0, 6);
  }, [candidates, mentionQuery]);

  const detectMention = useCallback((value: string, caret: number) => {
    const before = value.slice(0, caret);
    const m = /(?:^|\s)@([^\s@]{0,24})$/u.exec(before);
    setMentionQuery(m ? (m[1] ?? "") : null);
    setMentionIndex(0);
  }, []);

  function pickMention(c: Candidate) {
    const el = area.current;
    if (!el) return;
    const caret = el.selectionStart;
    const before = text.slice(0, caret).replace(/@[^\s@]{0,24}$/u, `@${c.displayName} `);
    const next = before + text.slice(caret);
    setText(next);
    setMentions((prev) => (prev.some((p) => p.personaId === c.personaId) ? prev : [...prev, c]));
    setMentionQuery(null);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(before.length, before.length); });
  }

  async function submit(confirmShare = false) {
    const body = text.trim();
    if (!body || busy || wait > 0) return;
    setBusy(true); setError(null); setConfirmKinds(null);
    // Only keep mentions whose name is still in the text.
    const active = mentions.filter((m) => body.includes(`@${m.displayName}`));
    try {
      const r = await onSend({
        clientMsgId: clientId.current,
        body,
        mentions: active.map((m) => m.personaId),
        confirmShare,
        ...(replyTo ? { replyToId: replyTo.id } : {}),
        ...(need ? { needTag: need } : {}),
        ...(cwOn && cw.trim() ? { contentWarning: cw.trim() } : {}),
      });
      setText(""); setNeed(null); setCwOn(false); setPanel(null); setCw(""); setMentions([]); setConfirmKinds(null);
      clientId.current = newClientId();
      onCancelReply();
      if (r.support) setSupport(true);
      if (room.slowModeSeconds > 0) setWait(room.slowModeSeconds);
      onSent();
    } catch (err) {
      if (err instanceof ApiError && err.code === "confirm_personal_details" && !confirmShare) {
        setConfirmKinds(((err.details as { kinds?: string[] } | undefined)?.kinds) ?? []);
      } else if (err instanceof ApiError && err.code === "slow_mode") {
        setWait(Number((err.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds ?? 5));
        setError(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : copy.errors.generic);
      }
    } finally { setBusy(false); }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (options.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => (i + 1) % options.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => (i - 1 + options.length) % options.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); const c = options[mentionIndex]; if (c) pickMention(c); return; }
      if (e.key === "Escape") { e.stopPropagation(); setMentionQuery(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); }
  }

  const left = MAX - text.length;
  const c = copy.composer;
  const toggle = (p: Exclude<Panel, null>) => {
    const next = panel === p ? null : p;
    setPanel(next);
    if (p === "cw") setCwOn(next === "cw" || cw.trim().length > 0);
  };
  const tool = (active: boolean) =>
    `inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors ${active ? "bg-[var(--cat-soft)] text-[var(--cat-ink)]" : "text-[var(--cm-ink-2)] hover:bg-[var(--cm-hover)]"}`;

  return (
    <div className="mx-auto w-full max-w-[860px] space-y-2">
      {support && <SupportCard onClose={() => setSupport(false)} />}

      <div className="rounded-3xl border border-[var(--cm-line-strong)] bg-[var(--cm-surface)] shadow-[var(--cm-shadow)] transition-shadow focus-within:border-[var(--cat-accent)] focus-within:ring-4 focus-within:ring-[var(--cat-soft)]">
        {replyTo && (
          <div className="mx-3 mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[var(--cm-hover)] px-3.5 py-2 text-[13px] text-[var(--cm-ink-2)]">
            <span className="min-w-0 truncate"><span className="font-medium text-[var(--cm-ink)]">{c.replyingTo(replyTo.author.displayName)}</span>{replyTo.body && !replyTo.contentWarning ? `  ${replyTo.body.slice(0, 80)}` : ""}</span>
            <button type="button" aria-label={c.cancelReply} onClick={onCancelReply} className="rounded-full p-1 hover:bg-[var(--cm-line)]"><X className="size-3.5" /></button>
          </div>
        )}

        {/* The options open inside the box, above the text, so nothing is ever cut off at the edge of the screen. */}
        <div className={`grid transition-[grid-template-rows] duration-200 ${panel ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className="overflow-hidden" inert={!panel}>
            <div className="px-4 pb-1 pt-3">
              {panel === "need" && (
                <div role="radiogroup" aria-label={c.needLabel}>
                  <p className="mb-2 text-[12.5px] text-[var(--cm-ink-3)]">{c.needHelp}</p>
                  <div className="flex flex-wrap gap-2">
                    {NEEDS.map(({ id, Icon }) => (
                      <button key={id} type="button" role="radio" aria-checked={need === id} onClick={() => setNeed(need === id ? null : id)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13.5px] transition-colors ${need === id ? "border-[var(--cat-accent)] bg-[var(--cat-soft)] font-medium text-[var(--cat-ink)]" : "border-[var(--cm-line-strong)] text-[var(--cm-ink-2)] hover:bg-[var(--cm-hover)]"}`}>
                        <Icon className="size-4" aria-hidden />{c.need[id]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {panel === "cw" && (
                <div>
                  <label htmlFor="cw" className="mb-2 block text-[12.5px] text-[var(--cm-ink-3)]">{c.cwHelp}</label>
                  <input id="cw" value={cw} onChange={(e) => { setCw(e.target.value); setCwOn(true); }} maxLength={120} placeholder={c.cwPlaceholder}
                    className="w-full rounded-xl bg-amber-50 px-3.5 py-2.5 text-[14px] text-amber-950 ring-1 ring-amber-200 placeholder:text-amber-800/60 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          <label htmlFor="composer" className="sr-only">{c.placeholder}</label>
          <textarea
            id="composer"
            ref={area}
            value={text}
            rows={1}
            maxLength={MAX}
            placeholder={c.placeholder}
            onChange={(e) => { setText(e.target.value); detectMention(e.target.value, e.target.selectionStart); }}
            onClick={(e) => detectMention(text, e.currentTarget.selectionStart)}
            onKeyDown={onKeyDown}
            aria-describedby="composer-hint"
            data-lenis-prevent
            className="block max-h-[200px] w-full resize-none bg-transparent px-5 pb-2 pt-4 text-[15px] leading-[1.6] text-[var(--cm-ink)] placeholder:text-[var(--cm-ink-3)]/70 focus:outline-none"
          />
          {options.length > 0 && (
            <ul role="listbox" aria-label="People you can mention" className="cm-pop absolute bottom-full left-3 z-30 mb-1 min-w-[200px] rounded-2xl border border-[var(--cm-line)] bg-[var(--cm-surface)] p-1 shadow-[var(--cm-shadow)]">
              {options.map((o, i) => (
                <li key={o.personaId} role="option" aria-selected={i === mentionIndex}>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); pickMention(o); }} className={`w-full rounded-xl px-3 py-1.5 text-left text-[13.5px] ${i === mentionIndex ? "bg-[var(--cm-hover)]" : ""}`}>@{o.displayName}</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-1 px-3 pb-3 pt-1">
          <button type="button" aria-expanded={panel === "need"} onClick={() => toggle("need")} className={tool(panel === "need" || need !== null)}>
            <HeartHandshake className="size-4" aria-hidden />{need ? c.need[need] : c.needLabel}
            {need && <span role="button" tabIndex={0} aria-label={c.needNone} onClick={(e) => { e.stopPropagation(); setNeed(null); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); setNeed(null); } }} className="-mr-1 rounded-full p-0.5 hover:bg-[var(--cm-line)]"><X className="size-3" aria-hidden /></span>}
          </button>
          <button type="button" aria-expanded={panel === "cw"} onClick={() => toggle("cw")} className={tool(panel === "cw" || (cwOn && cw.trim().length > 0))}>
            <TriangleAlert className="size-4" aria-hidden /><span className="hidden sm:inline">{c.cwToggle}</span><span className="sm:hidden">{c.cwShort}</span>
          </button>

          <span id="composer-hint" className="ml-auto mr-2 hidden text-[12px] text-[var(--cm-ink-3)] md:inline">{left < 400 ? c.limit(left) : c.mentionHint}</span>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!text.trim() || wait > 0 || busy}
            aria-label={wait > 0 ? c.waitSlow(wait) : c.send}
            className={`ml-auto flex h-9 items-center justify-center gap-1.5 rounded-full bg-[var(--cat-accent)] text-white transition-all hover:brightness-95 disabled:bg-[var(--cm-line-strong)] md:ml-0 ${wait > 0 ? "px-4 text-[12.5px] font-medium" : "w-9"}`}
          >
            {wait > 0 ? c.waitSlow(wait) : <ArrowUp className="size-[18px]" aria-hidden />}
          </button>
        </div>
      </div>

      {error && <Notice tone="amber" role="alert">{error}</Notice>}

      <Dialog open={confirmKinds !== null} onClose={() => setConfirmKinds(null)} title={copy.personalDetails.title}>
        <p className="mb-2 text-[14.5px] leading-relaxed text-[var(--cm-ink-2)]">{copy.personalDetails.body}</p>
        {confirmKinds && confirmKinds.length > 0 && (
          <p className="mb-5 text-[14px] text-[var(--cm-ink)]">It looks like {confirmKinds.map((k) => copy.personalDetails.kinds[k] ?? k).join(" and ")}.</p>
        )}
        <div className="flex justify-end gap-2">
          <PrimaryButton onClick={() => setConfirmKinds(null)}>{copy.personalDetails.edit}</PrimaryButton>
          <SecondaryButton onClick={() => void submit(true)}>{copy.personalDetails.share}</SecondaryButton>
        </div>
      </Dialog>
    </div>
  );
}
