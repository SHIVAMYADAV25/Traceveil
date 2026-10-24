"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, Send, X } from "lucide-react";
import { ApiError, newClientId } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import type { Message, NeedTag, Room } from "@/lib/community/types";
import { Menu } from "./Menu";
import { SupportCard } from "./SupportCard";
import { Dialog, Notice, PrimaryButton, SecondaryButton } from "./ui";

const MAX = 2000;
const NEEDS: NeedTag[] = ["listen", "advice", "reading"];

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
      setText(""); setNeed(null); setCwOn(false); setCw(""); setMentions([]); setConfirmKinds(null);
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
  return (
    <div className="space-y-2.5">
      {support && <SupportCard onClose={() => setSupport(false)} />}

      <div className="rounded-2xl border border-[#e8e4de] bg-white shadow-[0_8px_24px_-16px_rgba(15,23,42,0.25)] focus-within:border-[#0a0a0a]">
        {replyTo && (
          <div className="flex items-center justify-between gap-3 border-b border-[#f0ede8] px-4 py-2 text-[12.5px] text-[#374151]">
            <span className="min-w-0 truncate"><span className="font-medium">{c.replyingTo(replyTo.author.displayName)}</span>{replyTo.body && !replyTo.contentWarning ? `: ${replyTo.body.slice(0, 80)}` : ""}</span>
            <button type="button" aria-label={c.cancelReply} onClick={onCancelReply} className="rounded-full p-1 hover:bg-[#f0ede8]"><X className="size-3.5" /></button>
          </div>
        )}

        {cwOn && (
          <div className="border-b border-[#f0ede8] px-4 py-2">
            <label htmlFor="cw" className="sr-only">{c.cwLabel}</label>
            <input id="cw" value={cw} onChange={(e) => setCw(e.target.value)} maxLength={120} placeholder={c.cwPlaceholder} className="w-full bg-transparent text-[13.5px] text-amber-900 placeholder:text-amber-700/60 focus:outline-none" />
          </div>
        )}

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
            className="block max-h-[200px] w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-[1.6] text-[#0a0a0a] placeholder:text-[#8a8378] focus:outline-none"
          />
          {options.length > 0 && (
            <ul role="listbox" aria-label="People you can mention" className="absolute bottom-full left-3 z-30 mb-1 min-w-[200px] rounded-xl border border-[#e8e4de] bg-white p-1 shadow-lg">
              {options.map((o, i) => (
                <li key={o.personaId} role="option" aria-selected={i === mentionIndex}>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); pickMention(o); }} className={`w-full rounded-lg px-3 py-1.5 text-left text-[13.5px] ${i === mentionIndex ? "bg-[#f0ede8]" : ""}`}>@{o.displayName}</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[#f0ede8] px-3 py-2">
          <Menu
            label={c.needLabel}
            align="left"
            triggerClassName={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] ${need ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-[#e8e4de] text-[#374151] hover:bg-[#f0ede8]"}`}
            trigger={<>{need ? c.need[need] : c.needLabel}<ChevronDown className="size-3" aria-hidden /></>}
          >
            {(close) => (
              <div role="group" aria-label={c.needLabel}>
                <button type="button" role="menuitemradio" aria-checked={!need} onClick={() => { setNeed(null); close(); }} className="block w-full rounded-lg px-3 py-2 text-left text-[13.5px] hover:bg-[#f0ede8]">{c.needNone}</button>
                {NEEDS.map((n) => (
                  <button key={n} type="button" role="menuitemradio" aria-checked={need === n} onClick={() => { setNeed(n); close(); }} className={`block w-full rounded-lg px-3 py-2 text-left text-[13.5px] hover:bg-[#f0ede8] ${need === n ? "bg-indigo-50 text-indigo-800" : ""}`}>{c.need[n]}</button>
                ))}
              </div>
            )}
          </Menu>
          <button type="button" aria-pressed={cwOn} onClick={() => setCwOn((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] ${cwOn ? "border-amber-300 bg-amber-50 text-amber-900" : "border-[#e8e4de] text-[#374151] hover:bg-[#f0ede8]"}`}>
            <AlertTriangle className="size-3" aria-hidden />{c.cwToggle}
          </button>

          <span id="composer-hint" className="ml-auto hidden text-[12px] text-[#6b7280] lg:inline">{left < 400 ? c.limit(left) : c.mentionHint}</span>
          <PrimaryButton onClick={() => void submit()} busy={busy} disabled={!text.trim() || wait > 0} className="ml-auto lg:ml-0">
            {wait > 0 ? c.waitSlow(wait) : (<>{c.send}<Send className="size-3.5" aria-hidden /></>)}
          </PrimaryButton>
        </div>
      </div>

      {error && <Notice tone="amber" role="alert">{error}</Notice>}

      <Dialog open={confirmKinds !== null} onClose={() => setConfirmKinds(null)} title={copy.personalDetails.title}>
        <p className="mb-2 text-[14.5px] leading-relaxed text-[#374151]">{copy.personalDetails.body}</p>
        {confirmKinds && confirmKinds.length > 0 && (
          <p className="mb-5 text-[14px] text-[#0a0a0a]">It looks like {confirmKinds.map((k) => copy.personalDetails.kinds[k] ?? k).join(" and ")}.</p>
        )}
        <div className="flex justify-end gap-2">
          <PrimaryButton onClick={() => setConfirmKinds(null)}>{copy.personalDetails.edit}</PrimaryButton>
          <SecondaryButton onClick={() => void submit(true)}>{copy.personalDetails.share}</SecondaryButton>
        </div>
      </Dialog>
    </div>
  );
}
