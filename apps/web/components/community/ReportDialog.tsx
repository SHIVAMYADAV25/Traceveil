"use client";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ApiError, post } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import type { Message, ReportReason } from "@/lib/community/types";
import { DangerButton, Dialog, Field, Notice, PrimaryButton, SecondaryButton, TextArea } from "./ui";

const URGENT: ReportReason[] = ["threat", "minor_involved", "self_harm_risk", "personal_details"];
const ORDER: ReportReason[] = ["harassment", "threat", "fake_helper", "leaked_content", "personal_details", "self_harm_risk", "minor_involved", "spam", "other"];

export function ReportDialog({ message, onClose, onBlock }: { message: Message | null; onClose: () => void; onBlock: (m: Message) => void }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => { if (message) { setReason(null); setNote(""); setError(null); setSent(false); } }, [message]);

  async function submit() {
    if (!message || !reason) return;
    setBusy(true); setError(null);
    try {
      await post(`/messages/${message.id}/reports`, { reason, ...(note.trim() ? { note: note.trim() } : {}) });
      setSent(true);
    } catch (err) { setError(err instanceof ApiError ? err.message : copy.errors.generic); } finally { setBusy(false); }
  }

  const r = copy.report;
  return (
    <Dialog open={message !== null} onClose={onClose} title={sent ? r.thanksTitle : r.title} wide>
      {message && sent && (
        <div className="space-y-5">
          <div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden /><p className="text-[14.5px] leading-relaxed text-[#374151]">{r.thanksBody}</p></div>
          <div className="flex flex-wrap justify-end gap-2">
            <DangerButton onClick={() => { onBlock(message); onClose(); }}>{r.alsoBlock}</DangerButton>
            <PrimaryButton onClick={onClose}>{r.done}</PrimaryButton>
          </div>
        </div>
      )}
      {message && !sent && (
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-5">
          <p className="text-[14.5px] leading-relaxed text-[#374151]">{r.lead}</p>
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-[#0a0a0a]">{r.reasonLabel}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {ORDER.map((key) => {
                const info = r.reasons[key];
                const on = reason === key;
                return (
                  <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${on ? "border-[#0a0a0a] bg-white" : "border-[#e8e4de] bg-[#fafaf8] hover:border-[#d4cfc9]"}`}>
                    <input type="radio" name="reason" value={key} checked={on} onChange={() => setReason(key)} className="mt-1 size-4 accent-[#0a0a0a]" />
                    <span>
                      <span className="block text-[14px] font-medium text-[#0a0a0a]">{info?.label}</span>
                      <span className="block text-[12.5px] leading-snug text-[#6b7280]">{info?.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {reason && URGENT.includes(reason) && <Notice tone="amber">{r.urgentNote}</Notice>}
          <Field label={r.noteLabel} htmlFor="report-note">
            <TextArea id="report-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {error && <Notice tone="red" role="alert">{error}</Notice>}
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={onClose}>{copy.block.cancel}</SecondaryButton>
            <PrimaryButton type="submit" busy={busy} disabled={!reason}>{r.submit}</PrimaryButton>
          </div>
        </form>
      )}
    </Dialog>
  );
}
