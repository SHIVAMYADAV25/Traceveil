"use client";
import { memo, useState } from "react";
import { CornerUpLeft, Flag, MoreHorizontal, Pencil, SmilePlus, Trash2, UserX, Copy, EyeOff } from "lucide-react";
import { ApiError } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { formatTime } from "@/lib/community/format";
import type { Message, ReactionKind } from "@/lib/community/types";
import { Avatar } from "./Avatar";
import { Menu, MenuItem } from "./Menu";
import { MessageBody } from "./MessageBody";
import { Notice, Pill, PrimaryButton, SecondaryButton, TextArea } from "./ui";

const REACTION_ORDER: ReactionKind[] = ["care", "hug", "thanks", "me_too", "strength", "seen"];

export interface MessageActions {
  onReply: (m: Message) => void;
  onReact: (m: Message, kind: ReactionKind, on: boolean) => void;
  onReport: (m: Message) => void;
  onBlock: (m: Message) => void;
  onEdit: (m: Message, body: string, cw: string | undefined, confirmShare: boolean) => Promise<void>;
  onDelete: (m: Message) => void;
  onJump: (id: string) => void;
  onCopy: (m: Message) => void;
}

interface Props extends MessageActions {
  message: Message;
  myPersonaId: string;
  compact: boolean;
  highlighted: boolean;
  canReact: boolean;
  canWrite: boolean;
}

const BADGE = {
  verified_helper: { label: copy.message.helper, tone: "emerald" as const },
  moderator: { label: copy.message.moderator, tone: "indigo" as const },
  admin: { label: copy.message.admin, tone: "indigo" as const },
};

function MessageItemBase(props: Props) {
  const { message: m, myPersonaId, compact, highlighted, canReact, canWrite } = props;
  const own = m.author.personaId === myPersonaId;
  const [cwOpen, setCwOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [cwDraft, setCwDraft] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const gone = m.status !== "visible";
  const badge = m.author.badge ? BADGE[m.author.badge] : null;

  async function save(confirmShare: boolean) {
    setSaving(true); setEditError(null);
    try {
      await props.onEdit(m, draft, cwDraft.trim() || undefined, confirmShare);
      setEditing(false); setNeedsConfirm(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === "confirm_personal_details") { setNeedsConfirm(true); setEditError(err.message); }
      else setEditError(err instanceof ApiError ? err.message : copy.errors.generic);
    } finally { setSaving(false); }
  }

  return (
    <article
      id={`msg-${m.id}`}
      aria-label={`${m.author.displayName}, ${formatTime(m.createdAt)}`}
      className={`group relative flex gap-3 rounded-xl px-3 transition-colors hover:bg-white focus-within:bg-white ${compact ? "py-0.5" : "pt-3 pb-1"} ${highlighted ? "bg-indigo-50/70" : ""}`}
    >
      <div className="w-8 shrink-0">
        {compact ? (
          <span className="invisible block pt-1.5 text-right font-mono text-[10.5px] text-[#6b7280] group-hover:visible">{formatTime(m.createdAt)}</span>
        ) : (
          <Avatar seed={m.author.avatarSeed} size={32} label="" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!compact && (
          <header className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[14px] font-semibold text-[#0a0a0a]">{m.author.displayName}</span>
            {own && <span className="text-[12px] text-[#6b7280]">({copy.message.youLabel})</span>}
            {badge && <Pill tone={badge.tone}>{badge.label}</Pill>}
            <time dateTime={m.createdAt} className="font-mono text-[11px] text-[#6b7280]">{formatTime(m.createdAt)}</time>
            {m.editedAt && <span className="text-[11.5px] text-[#6b7280]">({copy.message.edited})</span>}
          </header>
        )}

        {m.replyTo && !gone && (
          <button
            type="button"
            onClick={() => props.onJump(m.replyTo!.id)}
            title={copy.message.jumpToOriginal}
            className="mb-1 mt-0.5 flex max-w-full items-center gap-1.5 border-l-2 border-[#d4cfc9] pl-2.5 text-left text-[12.5px] text-[#6b7280] hover:border-indigo-400 hover:text-[#374151]"
          >
            <CornerUpLeft className="size-3 shrink-0" aria-hidden />
            <span className="shrink-0 font-medium text-[#374151]">{m.replyTo.authorName}</span>
            <span className="truncate">
              {m.replyTo.excerpt ?? (m.replyTo.hasContentWarning ? copy.message.replyCw : copy.message.replyUnavailable)}
            </span>
          </button>
        )}

        {m.status === "deleted_by_author" && <p className="py-0.5 text-[13.5px] italic text-[#6b7280]">{copy.message.deleted}</p>}
        {m.status === "hidden_by_mod" && <p className="py-0.5 text-[13.5px] italic text-[#6b7280]">{copy.message.hiddenByTeam}</p>}

        {!gone && m.needTag && (
          <Pill tone="neutral" className="mb-1 mt-0.5">{copy.composer.needShort[m.needTag]}</Pill>
        )}

        {!gone && m.contentWarning && !cwOpen && !editing && (
          <div className="my-1 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[13.5px] text-amber-900"><span className="font-semibold">{copy.message.cwPrefix}:</span> {m.contentWarning}</p>
            <button type="button" onClick={() => setCwOpen(true)} className="rounded-full border border-amber-300 bg-white px-3 py-1 text-[12.5px] font-medium text-amber-900 hover:bg-amber-100">{copy.message.showCw}</button>
          </div>
        )}

        {!gone && (!m.contentWarning || cwOpen) && !editing && (
          <>
            {m.contentWarning && (
              <button type="button" onClick={() => setCwOpen(false)} className="mb-1 inline-flex items-center gap-1 text-[12px] text-amber-800 underline underline-offset-2">
                <EyeOff className="size-3" aria-hidden /> {copy.message.hideCw}
              </button>
            )}
            <MessageBody message={m} myPersonaId={myPersonaId} />
          </>
        )}

        {editing && (
          <div className="my-1 space-y-2">
            <TextArea aria-label={copy.composer.edit} value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} maxLength={2000} data-lenis-prevent />
            <TextArea aria-label={copy.composer.cwLabel} value={cwDraft} onChange={(e) => setCwDraft(e.target.value)} rows={1} maxLength={120} placeholder={copy.composer.cwPlaceholder} />
            {editError && <Notice tone={needsConfirm ? "amber" : "red"} role="alert">{editError}</Notice>}
            <div className="flex gap-2">
              {needsConfirm
                ? <PrimaryButton size="sm" busy={saving} onClick={() => void save(true)}>{copy.personalDetails.share}</PrimaryButton>
                : <PrimaryButton size="sm" busy={saving} disabled={!draft.trim()} onClick={() => void save(false)}>{copy.composer.saveEdit}</PrimaryButton>}
              <SecondaryButton size="sm" onClick={() => { setEditing(false); setEditError(null); setNeedsConfirm(false); }}>{copy.composer.cancelEdit}</SecondaryButton>
            </div>
          </div>
        )}

        {!gone && m.reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Reactions">
            {m.reactions.map((r) => {
              const info = copy.reactions[r.kind];
              return (
                <button
                  key={r.kind}
                  type="button"
                  disabled={!canReact}
                  aria-pressed={r.mine}
                  aria-label={`${info?.label}: ${r.count}${r.mine ? ", you reacted" : ""}`}
                  onClick={() => props.onReact(m, r.kind, !r.mine)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12.5px] transition-colors ${r.mine ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-[#e8e4de] bg-white text-[#374151] hover:border-[#d4cfc9]"} disabled:opacity-60`}
                >
                  <span aria-hidden>{info?.icon}</span>{r.count}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!gone && !editing && (
        <div className="absolute -top-3 right-3 flex items-center gap-0.5 rounded-full border border-[#e8e4de] bg-white p-0.5 opacity-100 shadow-sm md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
          {canReact && (
            <Menu
              label={copy.message.react}
              triggerClassName="rounded-full p-2.5 text-[#374151] hover:bg-[#f0ede8] md:p-1.5"
              trigger={<SmilePlus className="size-4" aria-hidden />}
            >
              {(close) => (
                <div className="grid grid-cols-2 gap-1 p-1" role="group" aria-label={copy.message.react}>
                  {REACTION_ORDER.map((kind) => {
                    const mine = m.reactions.find((r) => r.kind === kind)?.mine ?? false;
                    const info = copy.reactions[kind];
                    return (
                      <button key={kind} type="button" role="menuitemcheckbox" aria-checked={mine} onClick={() => { props.onReact(m, kind, !mine); close(); }}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-[#f0ede8] ${mine ? "bg-indigo-50 text-indigo-800" : "text-[#0a0a0a]"}`}>
                        <span aria-hidden>{info?.icon}</span>{info?.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </Menu>
          )}
          {canWrite && (
            <button type="button" aria-label={copy.message.reply} title={copy.message.reply} onClick={() => props.onReply(m)} className="rounded-full p-2.5 text-[#374151] hover:bg-[#f0ede8] md:p-1.5">
              <CornerUpLeft className="size-4" aria-hidden />
            </button>
          )}
          <Menu label={copy.message.more} triggerClassName="rounded-full p-2.5 text-[#374151] hover:bg-[#f0ede8] md:p-1.5" trigger={<MoreHorizontal className="size-4" aria-hidden />}>
            {(close) => (
              <>
                <MenuItem icon={<Copy className="size-4" />} onClick={() => { close(); props.onCopy(m); }}>{copy.message.copyText}</MenuItem>
                {own ? (
                  <>
                    <MenuItem icon={<Pencil className="size-4" />} onClick={() => { close(); setDraft(m.body ?? ""); setCwDraft(m.contentWarning ?? ""); setEditing(true); }}>{copy.message.edit}</MenuItem>
                    <MenuItem tone="danger" icon={<Trash2 className="size-4" />} onClick={() => { close(); props.onDelete(m); }}>{copy.message.delete}</MenuItem>
                  </>
                ) : (
                  <>
                    <MenuItem tone="danger" icon={<Flag className="size-4" />} onClick={() => { close(); props.onReport(m); }}>{copy.message.report}</MenuItem>
                    {!m.author.badge || m.author.badge === "verified_helper"
                      ? <MenuItem icon={<UserX className="size-4" />} onClick={() => { close(); props.onBlock(m); }}>{copy.message.block}</MenuItem>
                      : null}
                  </>
                )}
              </>
            )}
          </Menu>
        </div>
      )}
    </article>
  );
}

export const MessageItem = memo(MessageItemBase);
