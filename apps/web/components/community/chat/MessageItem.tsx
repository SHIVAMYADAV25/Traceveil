"use client";
import { memo, useState } from "react";
import { BadgeCheck, BookOpen, Ear, Lightbulb, ShieldCheck, type LucideIcon } from "lucide-react";
import { ApiError } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { formatTime } from "@/lib/community/format";
import type { Message, NeedTag, ReactionKind } from "@/lib/community/types";
import { Avatar } from "@/components/community/ui/Avatar";
import { Notice, PrimaryButton, SecondaryButton, TextArea } from "@/components/community/ui";
import { ContentWarning } from "./ContentWarning";
import { MessageBody } from "./MessageBody";
import { MessageToolbar } from "./MessageToolbar";
import { ReplyPreview } from "./ReplyPreview";

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

const NEED_ICON: Record<NeedTag, LucideIcon> = { listen: Ear, advice: Lightbulb, reading: BookOpen };

const ROLE_CHIP = {
  verified_helper: { label: copy.message.helper, Icon: BadgeCheck, cls: "bg-emerald-50 text-emerald-700" },
  moderator: { label: copy.message.moderator, Icon: ShieldCheck, cls: "bg-[var(--cat-soft)] text-[var(--cat-ink)]" },
  admin: { label: copy.message.admin, Icon: ShieldCheck, cls: "bg-[var(--cat-soft)] text-[var(--cat-ink)]" },
};

function MessageItemBase(props: Props) {
  const { message: m, myPersonaId, compact, highlighted, canReact, canWrite } = props;
  const own = m.author.personaId === myPersonaId;
  const [cwOpen, setCwOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [draft, setDraft] = useState("");
  const [cwDraft, setCwDraft] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const gone = m.status !== "visible";
  const chip = m.author.badge ? ROLE_CHIP[m.author.badge] : null;
  const NeedIcon = m.needTag ? NEED_ICON[m.needTag] : null;

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

  // On touch screens there is no hover, so a tap on the message shows its toolbar.
  const onTap = (e: React.MouseEvent) => {
    if (!window.matchMedia("(hover: none)").matches) return;
    if ((e.target as HTMLElement).closest("button, a, textarea, input")) return;
    setTapped((t) => !t);
  };

  const bubble = own
    ? "rounded-2xl rounded-tr-md bg-[var(--cm-own)]"
    : "rounded-2xl rounded-tl-md border border-[var(--cm-line)] bg-[var(--cm-surface)]";

  return (
    <article
      id={`msg-${m.id}`}
      aria-label={`${m.author.displayName}, ${formatTime(m.createdAt)}`}
      onClick={onTap}
      className={`group relative px-3 transition-colors sm:px-4 ${compact ? "pt-0.5" : "pt-4"} pb-0.5 ${highlighted ? "bg-[var(--cat-soft)]/60" : ""}`}
    >
      {m.replyTo && !gone && <ReplyPreview reply={m.replyTo} onJump={props.onJump} own={own} />}

      <div className={`flex gap-3 ${own ? "flex-row-reverse" : ""}`}>
        {!own && (
          <div className="w-9 shrink-0">
            {compact
              ? <time dateTime={m.createdAt} className="invisible block pt-2.5 text-center text-[10.5px] text-[var(--cm-ink-3)] group-hover:visible">{formatTime(m.createdAt)}</time>
              : <Avatar seed={m.author.avatarSeed} size={36} label="" />}
          </div>
        )}

        <div className={`flex min-w-0 max-w-[min(100%,680px)] flex-col ${own ? "items-end" : "items-start"}`}>
          {!compact && (
            <header className={`mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 ${own ? "justify-end" : ""}`}>
              <span className={`text-[14px] font-semibold ${chip ? "text-[var(--cat-ink)]" : "text-[var(--cm-ink)]"}`}>{own ? copy.message.youLabel : m.author.displayName}</span>
              {chip && (
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium leading-4 ${chip.cls}`}>
                  <chip.Icon className="size-3" aria-hidden />{chip.label}
                </span>
              )}
              <time dateTime={m.createdAt} className="text-[12px] text-[var(--cm-ink-3)]">{formatTime(m.createdAt)}</time>
              {m.editedAt && <span className="text-[12px] text-[var(--cm-ink-3)]">({copy.message.edited})</span>}
            </header>
          )}

          {m.status === "deleted_by_author" && <p className="rounded-xl border border-dashed border-[var(--cm-line-strong)] px-3.5 py-2 text-[13.5px] italic text-[var(--cm-ink-3)]">{copy.message.deleted}</p>}
          {m.status === "hidden_by_mod" && <p className="rounded-xl border border-dashed border-[var(--cm-line-strong)] px-3.5 py-2 text-[13.5px] italic text-[var(--cm-ink-3)]">{copy.message.hiddenByTeam}</p>}

          {!gone && !editing && (
            <div className={`${bubble} px-3.5 py-2.5 ${m.contentWarning && !cwOpen ? "!border-0 !bg-transparent !p-0" : ""}`}>
              {m.needTag && NeedIcon && (
                <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--cat-soft)] px-2.5 py-0.5 text-[12px] font-medium text-[var(--cat-ink)]">
                  <NeedIcon className="size-3.5" aria-hidden />{copy.composer.needShort[m.needTag]}
                </span>
              )}
              {m.contentWarning && <ContentWarning text={m.contentWarning} open={cwOpen} onToggle={() => setCwOpen((v) => !v)} />}
              {(!m.contentWarning || cwOpen) && <MessageBody message={m} myPersonaId={myPersonaId} />}
            </div>
          )}

          {editing && (
            <div className="w-[min(100%,560px)] space-y-2 rounded-2xl border border-[var(--cm-line)] bg-[var(--cm-surface)] p-3">
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
            <div className={`mt-1.5 flex flex-wrap gap-1.5 ${own ? "justify-end" : ""}`} role="group" aria-label="Reactions">
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
                    className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[13px] transition-colors disabled:opacity-60 ${r.mine ? "bg-[var(--cat-soft)] text-[var(--cat-ink)] ring-1 ring-[var(--cat-accent)]/50" : "bg-[var(--cm-hover)] text-[var(--cm-ink-2)] hover:bg-[var(--cm-line)]"}`}
                  >
                    <span className="text-[15px] leading-none" aria-hidden>{info?.icon}</span>
                    <span className="font-medium tabular-nums">{r.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {!gone && !editing && (
        <div className={`${tapped ? "opacity-100" : "pointer-events-none opacity-0"} transition-opacity focus-within:pointer-events-auto focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100`}>
          <MessageToolbar
            message={m}
            own={own}
            canReact={canReact}
            canWrite={canWrite}
            side={own ? "left" : "right"}
            actions={{
              onReact: (kind, on) => props.onReact(m, kind, on),
              onReply: () => props.onReply(m),
              onCopy: () => props.onCopy(m),
              onEdit: () => { setDraft(m.body ?? ""); setCwDraft(m.contentWarning ?? ""); setEditing(true); },
              onDelete: () => props.onDelete(m),
              onReport: () => props.onReport(m),
              onBlock: () => props.onBlock(m),
            }}
          />
        </div>
      )}
    </article>
  );
}

export const MessageItem = memo(MessageItemBase);
