"use client";
import { copy } from "@/lib/community/copy";
import type { ReactionKind } from "@/lib/community/types";

export const REACTION_ORDER: ReactionKind[] = ["care", "hug", "thanks", "me_too", "strength", "seen"];

/**
 * The six supportive reactions as a single row of emoji. There is no text on screen: each button still
 * has a name for screen readers and a tooltip. Only these six exist, so reactions cannot be used to mock anyone.
 */
export function ReactionPicker({ mine, onPick }: { mine: Set<ReactionKind>; onPick: (kind: ReactionKind, on: boolean) => void }) {
  return (
    <div role="group" aria-label={copy.message.react} className="flex items-center gap-0.5">
      {REACTION_ORDER.map((kind) => {
        const info = copy.reactions[kind];
        const on = mine.has(kind);
        return (
          <button
            key={kind}
            type="button"
            role="menuitemcheckbox"
            aria-checked={on}
            aria-label={info?.label}
            title={info?.label}
            onClick={() => onPick(kind, !on)}
            className={`flex size-10 items-center justify-center rounded-full text-[21px] leading-none transition-transform hover:scale-110 hover:bg-[var(--cm-hover)] ${on ? "bg-[var(--cat-soft)] ring-1 ring-[var(--cat-accent)]/40" : ""}`}
          >
            <span aria-hidden>{info?.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
