"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Fingerprint, UserCheck } from "lucide-react";
import { ApiError, get, post } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { formatAge, formatTime, formatUntil } from "@/lib/community/format";
import { useCommunity } from "@/lib/community/session";
import type { ReportDetail } from "@/lib/community/types";
import { Dialog, DangerButton, Field, Notice, Pill, PrimaryButton, SecondaryButton, Spinner, TextArea } from "../ui";

type Action = "dismiss" | "hide_message" | "warn" | "mute_room" | "suspend" | "ban" | "escalate" | "note";

const ACTIONS: Array<{ id: Action; label: string; hint: string; admin?: boolean; modOnly?: boolean; needsDuration?: boolean; danger?: boolean }> = [
  { id: "dismiss", label: "Dismiss", hint: "Not a violation. The reporter is told no action was needed." },
  { id: "hide_message", label: "Hide the message", hint: "Removed from the room for everyone. The author is told why." },
  { id: "warn", label: "Send a warning", hint: "A private note to the author. Nothing else changes." },
  { id: "mute_room", label: "Mute in this room", hint: "They cannot write in this room for a set time.", needsDuration: true },
  { id: "suspend", label: "Pause their access", hint: "They cannot read or write anywhere for a set time. They can appeal.", needsDuration: true, danger: true },
  { id: "ban", label: "Remove their access", hint: "Admin only. They can appeal.", admin: true, danger: true },
  { id: "escalate", label: "Hand to an admin", hint: "You cannot decide this one. An admin will.", modOnly: true },
  { id: "note", label: "Add a private note", hint: "Visible to the team only. Does not close the report." },
];

const HOURS = [{ v: 1, l: "1 hour" }, { v: 6, l: "6 hours" }, { v: 24, l: "1 day" }, { v: 72, l: "3 days" }, { v: 168, l: "7 days" }];
const ADMIN_HOURS = [...HOURS, { v: 720, l: "30 days" }, { v: 2160, l: "90 days" }];

const STATUS: Record<string, { label: string; tone: "amber" | "indigo" | "emerald" | "neutral" | "red" }> = {
  open: { label: "Waiting", tone: "amber" }, in_review: { label: "Being reviewed", tone: "indigo" },
  actioned: { label: "Action taken", tone: "emerald" }, dismissed: { label: "Dismissed", tone: "neutral" }, escalated: { label: "With admins", tone: "red" },
};

export function ReportDetailPanel({ reportId, onBack, onChanged }: { reportId: string; onBack: () => void; onChanged: () => void }) {
  const { isAdmin, showToast } = useCommunity();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState<number | "permanent">(24);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealWhy, setRevealWhy] = useState("");
  const [identity, setIdentity] = useState<{ handle?: string; role?: string; createdAt?: string; lastSeenAt?: string; deleted: boolean } | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);

  useEffect(() => {
    setReport(null); setLoadError(null); setRevealed(false); setAction(null); setReason(""); setError(null); setIdentity(null);
    get<{ report: ReportDetail }>(`/mod/reports/${reportId}`).then((r) => setReport(r.report)).catch((e) => setLoadError(e instanceof ApiError ? e.message : copy.errors.generic));
  }, [reportId]);

  if (loadError) return <div className="p-6"><Notice tone="red" role="alert">{loadError}</Notice></div>;
  if (!report) return <Spinner />;

  const closed = report.status === "dismissed";
  const chosen = ACTIONS.find((a) => a.id === action);
  const available = ACTIONS.filter((a) => (!a.admin || isAdmin) && (!a.modOnly || !isAdmin) && !(a.id === "hide_message" && !report.messageStillVisible)
    && !(["warn", "mute_room", "suspend", "ban"].includes(a.id) && report.target.deleted) && !(a.id === "mute_room" && !report.room));

  async function claim() {
    setBusy(true); setError(null);
    try { setReport((await post<{ report: ReportDetail }>(`/mod/reports/${reportId}/claim`, { force: isAdmin })).report); onChanged(); }
    catch (e) { setError(e instanceof ApiError ? e.message : copy.errors.generic); } finally { setBusy(false); }
  }

  async function apply() {
    if (!action) return;
    setBusy(true); setError(null);
    try {
      const durationHours = chosen?.needsDuration || (action === "ban" && hours !== "permanent") ? (hours === "permanent" ? undefined : hours) : undefined;
      const r = await post<{ report: ReportDetail }>(`/mod/reports/${reportId}/actions`, { action, reason, ...(durationHours ? { durationHours } : {}) });
      setReport(r.report); setAction(null); setReason(""); onChanged(); showToast("Done. The record has been saved.");
    } catch (e) { setError(e instanceof ApiError ? e.message : copy.errors.generic); } finally { setBusy(false); }
  }

  async function reveal() {
    setRevealError(null);
    try {
      const r = await post<{ deleted: boolean; handle?: string; role?: string; createdAt?: string; lastSeenAt?: string }>("/admin/reveal", { personaId: report!.target.personaId, reason: revealWhy });
      setIdentity(r); setRevealOpen(false); setRevealWhy("");
    } catch (e) { setRevealError(e instanceof ApiError ? e.message : copy.errors.generic); }
  }

  const st = STATUS[report.status] ?? STATUS.open!;
  const reasonInfo = copy.report.reasons[report.reason];
  return (
    <div data-lenis-prevent className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[820px] space-y-5 p-4 sm:p-6">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-[#374151] hover:text-[#0a0a0a] lg:hidden"><ArrowLeft className="size-4" aria-hidden />Back to the queue</button>

        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-widest text-[#6b7280]">Report #{report.id} · {formatAge(report.ageMinutes)}</p>
            <h2 className="mt-1 text-[20px] font-semibold tracking-tight text-[#0a0a0a]">{reasonInfo?.label}</h2>
            {report.room && <p className="text-[13.5px] text-[#374151]">in {report.room.title}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {report.priority === "urgent" && <Pill tone="red">Urgent</Pill>}
            <Pill tone={st.tone}>{st.label}</Pill>
            {report.assigned === "me" && <Pill tone="indigo"><UserCheck className="size-3" aria-hidden />Yours</Pill>}
            {report.assigned === "other" && <Pill>Someone else is on it</Pill>}
          </div>
        </header>

        {report.note && <Notice tone="neutral" title="What the reporter wrote">{report.note}</Notice>}

        <section aria-labelledby="ctx" className="rounded-2xl border border-[#e8e4de] bg-white">
          <div className="flex items-center justify-between border-b border-[#f0ede8] px-4 py-3">
            <h3 id="ctx" className="text-[14px] font-semibold text-[#0a0a0a]">Conversation at the time</h3>
            <SecondaryButton size="sm" onClick={() => setRevealed((r) => !r)}>{revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}{revealed ? "Blur text" : "Reveal text"}</SecondaryButton>
          </div>
          <ul className="divide-y divide-[#f0ede8]">
            {report.snapshot.map((m) => (
              <li key={m.id} className={`px-4 py-3 ${m.reported ? "border-l-4 border-indigo-500 bg-indigo-50/60" : ""}`}>
                <div className="mb-1 flex flex-wrap items-center gap-2 text-[12.5px]">
                  <span className="font-semibold text-[#0a0a0a]">{m.displayName}</span>
                  <span className="font-mono text-[11px] text-[#6b7280]">{formatTime(m.createdAt)}</span>
                  {m.reported && <Pill tone="indigo">Reported message</Pill>}
                  {m.status !== "visible" && <Pill>{m.status === "hidden_by_mod" ? "Hidden by team" : "Deleted by author"}</Pill>}
                </div>
                {m.contentWarning && <p className="mb-1 text-[12.5px] text-amber-800">Content warning: {m.contentWarning}</p>}
                <p className={`whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-[#0a0a0a] transition-[filter] ${revealed ? "" : "select-none blur-[6px]"}`} aria-hidden={!revealed}>
                  {m.body ?? "(deleted)"}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#e8e4de] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[14px] font-semibold text-[#0a0a0a]">{report.target.displayName}</h3>
            <div className="flex flex-wrap gap-1.5">
              {report.target.isStaff && <Pill tone="indigo">Team member</Pill>}
              {report.target.deleted && <Pill>Account deleted</Pill>}
              <Pill tone={report.target.priorReports > 0 ? "amber" : "neutral"}>{report.target.priorReports} other report{report.target.priorReports === 1 ? "" : "s"}</Pill>
              {report.target.activeRestrictions.map((r, i) => <Pill key={i} tone="rose">{copy.account.restrictionKind[r.kind]}: {formatUntil(r.endsAt)}</Pill>)}
            </div>
          </div>
          {report.target.history.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-[13px] text-[#374151]">
              {report.target.history.slice(0, 6).map((h, i) => (
                <li key={i}><span className="font-medium text-[#0a0a0a]">{h.action.replace(/_/g, " ")}</span>{h.reason ? `: ${h.reason}` : ""} <span className="font-mono text-[11px] text-[#6b7280]">{new Date(h.createdAt).toLocaleDateString()}</span></li>
              ))}
            </ul>
          ) : <p className="mt-2 text-[13px] text-[#6b7280]">No earlier actions on this person.</p>}
          {isAdmin && !report.target.deleted && (
            <div className="mt-3 border-t border-[#f0ede8] pt-3">
              {identity ? (
                <p className="text-[13px] text-[#374151]">Handle <span className="font-mono text-[#0a0a0a]">{identity.handle}</span> · {identity.role?.replace("_", " ")} · joined {identity.createdAt ? new Date(identity.createdAt).toLocaleDateString() : ""}. <span className="text-[#6b7280]">This lookup was recorded.</span></p>
              ) : (
                <SecondaryButton size="sm" onClick={() => setRevealOpen(true)}><Fingerprint className="size-3.5" />Look up the account (recorded)</SecondaryButton>
              )}
            </div>
          )}
        </section>

        {!closed && (
          <section className="rounded-2xl border border-[#e8e4de] bg-white p-4 sm:p-5" aria-labelledby="act">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 id="act" className="text-[14px] font-semibold text-[#0a0a0a]">Decide what to do</h3>
              {report.assigned !== "me" && <SecondaryButton size="sm" busy={busy} onClick={() => void claim()}>{report.assigned === "other" ? "Take this over" : "I will take this one"}</SecondaryButton>}
            </div>
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="sr-only">Action</legend>
              {available.map((a) => (
                <label key={a.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${action === a.id ? "border-[#0a0a0a] bg-white" : "border-[#e8e4de] bg-[#fafaf8] hover:border-[#d4cfc9]"}`}>
                  <input type="radio" name="action" value={a.id} checked={action === a.id} onChange={() => { setAction(a.id); setError(null); if (a.id === "ban") setHours("permanent"); else if (hours === "permanent") setHours(24); }} className="mt-1 size-4 accent-[#0a0a0a]" />
                  <span><span className={`block text-[14px] font-medium ${a.danger ? "text-rose-700" : "text-[#0a0a0a]"}`}>{a.label}</span><span className="block text-[12.5px] leading-snug text-[#6b7280]">{a.hint}</span></span>
                </label>
              ))}
            </fieldset>

            {action && (
              <div className="mt-4 space-y-3">
                {(chosen?.needsDuration || action === "ban") && (
                  <Field label="For how long" htmlFor="dur">
                    <select id="dur" value={String(hours)} onChange={(e) => setHours(e.target.value === "permanent" ? "permanent" : Number(e.target.value))} className="w-full rounded-lg border border-[#e8e4de] bg-[#fafaf8] px-3.5 py-2.5 text-[14.5px] focus:border-[#0a0a0a] focus:outline-none">
                      {(isAdmin ? ADMIN_HOURS : HOURS).map((h) => <option key={h.v} value={h.v}>{h.l}</option>)}
                      {action === "ban" && <option value="permanent">Until an admin lifts it</option>}
                    </select>
                  </Field>
                )}
                <Field label={action === "note" ? "Note for the team" : "Reason (the person will be shown this)"} htmlFor="why" hint={action === "note" ? undefined : "Write it as you would want to read it. Be specific and kind."}>
                  <TextArea id="why" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
                </Field>
                {error && <Notice tone="red" role="alert">{error}</Notice>}
                <div className="flex gap-2">
                  {chosen?.danger ? <DangerButton busy={busy} disabled={reason.trim().length < 3} onClick={() => void apply()}>Apply: {chosen.label}</DangerButton>
                    : <PrimaryButton busy={busy} disabled={reason.trim().length < 3} onClick={() => void apply()}>Apply: {chosen?.label}</PrimaryButton>}
                  <SecondaryButton onClick={() => setAction(null)}>Cancel</SecondaryButton>
                </div>
              </div>
            )}
            {!action && error && <div className="mt-3"><Notice tone="red" role="alert">{error}</Notice></div>}
          </section>
        )}
        {closed && <Notice tone="neutral">This report was dismissed. You can still add a private note by opening a new report if something changes.</Notice>}
      </div>

      <Dialog open={revealOpen} onClose={() => setRevealOpen(false)} title="Look up the account">
        <p className="mb-3 text-[14px] leading-relaxed text-[#374151]">This shows which account is behind the made-up name. Every lookup is saved in the audit log with your reason, and other admins can see it.</p>
        <Field label="Why do you need this?" htmlFor="rv" hint="At least 10 characters." error={revealError}>
          <TextArea id="rv" rows={3} value={revealWhy} onChange={(e) => setRevealWhy(e.target.value)} />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <SecondaryButton onClick={() => setRevealOpen(false)}>Cancel</SecondaryButton>
          <PrimaryButton disabled={revealWhy.trim().length < 10} onClick={() => void reveal()}>Look up</PrimaryButton>
        </div>
      </Dialog>
    </div>
  );
}
