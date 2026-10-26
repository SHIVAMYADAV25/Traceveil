"use client";
import { Copy, CornerUpLeft, Flag, MoreHorizontal, Pencil, SmilePlus, Trash2, UserX } from "lucide-react";
import { copy } from "@/lib/community/copy";
import type { Message, ReactionKind } from "@/lib/community/types";
import { Menu, MenuDivider, MenuItem } from "@/components/community/ui/Menu";
import { ReactionPicker } from "./ReactionPicker";

const QUICK: ReactionKind[] = ["care", "hug", "thanks"];
const BTN = "flex size-9 items-center justify-center rounded-lg text-[var(--cm-ink-2)] transition-colors hover:bg-[var(--cm-hover)] md:size-8";

export interface ToolbarActions {
  onReact: (kind: ReactionKind, on: boolean) => void;
  onReply: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  onBlock: () => void;
}

/**
 * The small bar that floats above a message: three one-tap reactions, a picker for the rest, reply,
 * and a menu for everything else. Same arrangement as the reference chat. Menus open downward and
 * flip upward when there is no room.
 */
export function MessageToolbar({ message: m, own, canReact, canWrite, actions, side }: {
  message: Message; own: boolean; canReact: boolean; canWrite: boolean; actions: ToolbarActions; side: "left" | "right";
}) {
  const mine = new Set(m.reactions.filter((r) => r.mine).map((r) => r.kind));
  const canBlock = !m.author.badge || m.author.badge === "verified_helper";
  return (
    <div className={`absolute -top-4 z-10 flex items-center gap-0.5 rounded-xl border border-[var(--cm-line)] bg-[var(--cm-surface)] p-0.5 shadow-[var(--cm-shadow)] ${side === "right" ? "right-3" : "left-3"}`}>
      {canReact && (
        <>
          {QUICK.map((kind) => (
            <button key={kind} type="button" aria-label={copy.reactions[kind]?.label} aria-pressed={mine.has(kind)} title={copy.reactions[kind]?.label}
              onClick={() => actions.onReact(kind, !mine.has(kind))}
              className={`${BTN} text-[17px] leading-none ${mine.has(kind) ? "bg-[var(--cat-soft)]" : ""}`}>
              <span aria-hidden>{copy.reactions[kind]?.icon}</span>
            </button>
          ))}
          <span className="mx-0.5 h-5 w-px bg-[var(--cm-line)]" aria-hidden />
          <Menu label={copy.message.react} side="auto" align={side === "right" ? "right" : "left"} triggerClassName={BTN} panelClassName="min-w-0 p-1" trigger={<SmilePlus className="size-[18px]" aria-hidden />}>
            {(close) => <ReactionPicker mine={mine} onPick={(k, on) => { actions.onReact(k, on); close(); }} />}
          </Menu>
        </>
      )}
      {canWrite && (
        <button type="button" aria-label={copy.message.reply} title={copy.message.reply} onClick={actions.onReply} className={BTN}>
          <CornerUpLeft className="size-[18px]" aria-hidden />
        </button>
      )}
      <Menu label={copy.message.more} side="auto" align={side === "right" ? "right" : "left"} triggerClassName={BTN} trigger={<MoreHorizontal className="size-[18px]" aria-hidden />}>
        {(close) => (
          <>
            <MenuItem icon={<Copy className="size-4" />} onClick={() => { close(); actions.onCopy(); }}>{copy.message.copyText}</MenuItem>
            {own ? (
              <>
                <MenuItem icon={<Pencil className="size-4" />} onClick={() => { close(); actions.onEdit(); }}>{copy.message.edit}</MenuItem>
                <MenuDivider />
                <MenuItem tone="danger" icon={<Trash2 className="size-4" />} onClick={() => { close(); actions.onDelete(); }}>{copy.message.delete}</MenuItem>
              </>
            ) : (
              <>
                {canBlock && <MenuItem icon={<UserX className="size-4" />} onClick={() => { close(); actions.onBlock(); }}>{copy.message.block}</MenuItem>}
                <MenuDivider />
                <MenuItem tone="danger" icon={<Flag className="size-4" />} onClick={() => { close(); actions.onReport(); }}>{copy.message.report}</MenuItem>
              </>
            )}
          </>
        )}
      </Menu>
    </div>
  );
}
