"use client";
import { useState } from "react";
import { ApiError, post } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import type { Message } from "@/lib/community/types";
import { DangerButton, Dialog, Notice, SecondaryButton } from "@/components/community/ui";

export function BlockDialog({ message, onClose, onDone }: { message: Message | null; onClose: () => void; onDone: (personaId: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!message) return;
    setBusy(true); setError(null);
    try {
      await post("/blocks", { personaId: message.author.personaId });
      onDone(message.author.personaId);
      onClose();
    } catch (err) { setError(err instanceof ApiError ? err.message : copy.errors.generic); } finally { setBusy(false); }
  }

  return (
    <Dialog open={message !== null} onClose={onClose} title={copy.block.title}>
      <p className="mb-2 text-[14.5px] leading-relaxed text-[var(--cm-ink-2)]">{message ? `${message.author.displayName}: ` : ""}{copy.block.body}</p>
      {error && <div className="mb-3"><Notice tone="red" role="alert">{error}</Notice></div>}
      <div className="mt-5 flex justify-end gap-2">
        <SecondaryButton onClick={onClose}>{copy.block.cancel}</SecondaryButton>
        <DangerButton busy={busy} onClick={() => void confirm()}>{copy.block.confirm}</DangerButton>
      </div>
    </Dialog>
  );
}
