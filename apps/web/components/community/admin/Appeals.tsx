"use client";
import { useCallback, useEffect, useState } from "react";
import { ApiError, get, post } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { formatUntil } from "@/lib/community/format";
import { useCommunity } from "@/lib/community/session";
import { Field, Notice, Pill, PrimaryButton, SecondaryButton, Spinner, TextArea } from "@/components/community/ui/index";

interface Appeal { id: string; body: string; status: string; createdAt: string; decisionNote: string | null; personaName: string | null; imposedByMe: boolean; restriction: { id: string; kind: string; reason: string; endsAt: string | null; active: boolean } }

export function Appeals() {
  const { showToast } = useCommunity();
  const [view, setView] = useState<"open" | "decided">("open");
  const [items, setItems] = useState<Appeal[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => { setItems((await get<{ appeals: Appeal[] }>(`/admin/appeals?status=${view}`)).appeals); }, [view]);
  useEffect(() => {
    let alive = true;
    get<{ appeals: Appeal[] }>(`/admin/appeals?status=${view}`).then((r) => { if (alive) setItems(r.appeals); }).catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [view]);

  async function decide(id: string, decision: "upheld" | "overturned") {
    setError(null);
    try { await post(`/admin/appeals/${id}/decision`, { decision, note }); setActive(null); setNote(""); showToast("Decision sent to the member"); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : copy.errors.generic); }
  }

  return (
    <div className="space-y-4">
      <div role="tablist" className="inline-flex gap-1 rounded-full cm-glass p-1">
        {(["open", "decided"] as const).map((v) => (
          <button key={v} role="tab" aria-selected={view === v} type="button" onClick={() => { setItems(null); setView(v); }} className={`rounded-full px-4 py-1.5 text-[13px] font-medium ${view === v ? "bg-[var(--cat-accent)] text-white" : "text-[var(--cm-ink-2)] hover:bg-[var(--cm-hover)]"}`}>{v === "open" ? "Waiting" : "Decided"}</button>
        ))}
      </div>
      {!items ? <Spinner /> : items.length === 0 ? <p className="text-[14px] text-[var(--cm-ink-3)]">{view === "open" ? "No appeals are waiting." : "No decided appeals yet."}</p> : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="rounded-2xl cm-glass p-4 sm:p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-[14.5px] font-semibold text-[var(--cm-ink)]">{a.personaName ?? "Deleted member"}</span>
                <Pill tone="rose">{copy.account.restrictionKind[a.restriction.kind]}</Pill>
                {a.restriction.active && <span className="text-[12.5px] text-[var(--cm-ink-3)]">{formatUntil(a.restriction.endsAt)}</span>}
                {a.status !== "open" && <Pill tone={a.status === "overturned" ? "emerald" : "neutral"}>{a.status === "overturned" ? "Accepted" : "Decision stands"}</Pill>}
              </div>
              <p className="mb-1 text-[13px] text-[var(--cm-ink-3)]">Reason given at the time</p>
              <p className="mb-3 text-[14px] text-[var(--cm-ink)]">{a.restriction.reason}</p>
              <p className="mb-1 text-[13px] text-[var(--cm-ink-3)]">Their appeal</p>
              <p className="mb-3 whitespace-pre-wrap rounded-xl bg-[var(--cm-canvas)] p-3 text-[14.5px] leading-relaxed text-[var(--cm-ink)]">{a.body}</p>
              {a.decisionNote && <p className="text-[13.5px] text-[var(--cm-ink-2)]"><span className="font-medium">Decision note:</span> {a.decisionNote}</p>}
              {a.status === "open" && (
                <>
                  {a.imposedByMe && <div className="mb-3"><Notice tone="amber">You made the original decision. If another admin is available, ask them to review this one.</Notice></div>}
                  {active === a.id ? (
                    <div className="space-y-3">
                      <Field label="Note to the member (they will see this)" htmlFor={`n-${a.id}`}><TextArea id={`n-${a.id}`} rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
                      {error && <Notice tone="red" role="alert">{error}</Notice>}
                      <div className="flex flex-wrap gap-2">
                        <PrimaryButton disabled={note.trim().length < 3} onClick={() => void decide(a.id, "overturned")}>Accept the appeal and lift it</PrimaryButton>
                        <SecondaryButton disabled={note.trim().length < 3} onClick={() => void decide(a.id, "upheld")}>Keep the decision</SecondaryButton>
                        <SecondaryButton onClick={() => setActive(null)}>Cancel</SecondaryButton>
                      </div>
                    </div>
                  ) : <SecondaryButton onClick={() => { setActive(a.id); setNote(""); setError(null); }}>Review this appeal</SecondaryButton>}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
