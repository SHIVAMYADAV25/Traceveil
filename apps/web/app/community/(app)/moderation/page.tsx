"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { ConsoleHeader, ConsoleStat } from "@/components/community/mod/ConsoleHeader";
import { ReportDetailPanel } from "@/components/community/mod/ReportDetailPanel";
import { Notice, Pill, Spinner } from "@/components/community/ui";
import { ApiError, get } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { formatAge } from "@/lib/community/format";
import { useCommunity, useCommunityEvents } from "@/lib/community/session";
import type { ReportSummary } from "@/lib/community/types";

type State = "active" | "mine" | "closed";
interface Counts { active: number; urgent: number; mine: number }
const TABS: Array<{ id: State; label: string }> = [{ id: "active", label: "Waiting" }, { id: "mine", label: "Mine" }, { id: "closed", label: "Closed" }];

function ModerationInner() {
  const { isStaff, phase, showToast } = useCommunity();
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("report");
  const [state, setState] = useState<State>("active");
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [counts, setCounts] = useState<Counts>({ active: 0, urgent: 0, mine: 0 });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await get<{ reports: ReportSummary[]; counts: Counts }>(`/mod/reports?state=${state}&limit=100`);
      setReports(r.reports); setCounts(r.counts); setError(null);
    } catch (e) { setError(e instanceof ApiError ? e.message : copy.errors.generic); }
  }, [state]);

  useEffect(() => {
    let alive = true;
    get<{ reports: ReportSummary[]; counts: Counts }>(`/mod/reports?state=${state}&limit=100`)
      .then((r) => { if (alive) { setReports(r.reports); setCounts(r.counts); setError(null); } })
      .catch((e) => { if (alive) setError(e instanceof ApiError ? e.message : copy.errors.generic); });
    return () => { alive = false; };
  }, [state]);
  useEffect(() => { const t = setInterval(() => void load(), 60_000); return () => clearInterval(t); }, [load]);
  useCommunityEvents((e) => {
    if (e.type !== "notification.created") return;
    const k = e.data.notification.kind;
    if (k === "report_new" || k === "report_escalated") {
      void load();
      if (e.data.notification.payload.priority === "urgent") showToast("An urgent report just arrived");
    }
  });

  const select = (id: string | null) => router.replace(id ? `/community/moderation?report=${id}` : "/community/moderation");

  if (phase === "ready" && !isStaff) return <div className="mx-auto max-w-md p-8"><Notice tone="rose" title="This area is for the Community team">You do not have access to moderation tools.</Notice></div>;

  return (
    <div className="flex h-full flex-col">
      <ConsoleHeader label="Moderation console">
        <ConsoleStat label="waiting" value={counts.active} />
        <ConsoleStat label="urgent" value={counts.urgent} tone={counts.urgent > 0 ? "alert" : "default"} />
        <ConsoleStat label="mine" value={counts.mine} />
      </ConsoleHeader>

      <div className="flex min-h-0 flex-1">
        <section aria-label="Reports" className={`${selected ? "hidden lg:flex" : "flex"} w-full flex-col border-r border-[#e8e4de] bg-white lg:w-[380px] lg:shrink-0`}>
          <div role="tablist" aria-label="Report list" className="flex gap-1 border-b border-[#e8e4de] p-2">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={state === t.id} type="button" onClick={() => { setReports(null); setState(t.id); }} className={`flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${state === t.id ? "bg-[#0a0a0a] text-white" : "text-[#374151] hover:bg-[#f0ede8]"}`}>{t.label}</button>
            ))}
          </div>
          <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto p-2">
            {error && <Notice tone="red" role="alert">{error}</Notice>}
            {!reports && !error && <Spinner />}
            {reports?.length === 0 && (
              <div className="px-4 py-12 text-center">
                <Inbox className="mx-auto mb-3 size-6 text-[#6b7280]" aria-hidden />
                <p className="text-[14.5px] font-medium text-[#0a0a0a]">{state === "closed" ? "Nothing closed yet" : "Nothing waiting"}</p>
                <p className="mt-1 text-[13.5px] text-[#6b7280]">{state === "closed" ? "Closed reports will appear here." : "New reports will appear here the moment they are made."}</p>
              </div>
            )}
            <ul className="space-y-1.5">
              {reports?.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => select(r.id)} aria-current={selected === r.id ? "true" : undefined}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${selected === r.id ? "border-[#0a0a0a] bg-white" : "border-[#e8e4de] bg-[#fafaf8] hover:border-[#d4cfc9]"}`}>
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      {r.priority === "urgent" && r.status !== "dismissed" && r.status !== "actioned" && <Pill tone="red">Urgent</Pill>}
                      {r.status === "escalated" && <Pill tone="red">With admins</Pill>}
                      {r.assigned === "me" && <Pill tone="indigo">Yours</Pill>}
                      {r.assigned === "other" && <Pill>Taken</Pill>}
                      <span className="ml-auto font-mono text-[11px] text-[#6b7280]">{formatAge(r.ageMinutes)}</span>
                    </div>
                    <p className="text-[14px] font-medium text-[#0a0a0a]">{copy.report.reasons[r.reason]?.label}</p>
                    <p className="mt-0.5 truncate text-[12.5px] text-[#6b7280]">{r.room?.title ?? "A room"} · {r.targetName}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-label="Report detail" className={`${selected ? "block" : "hidden lg:block"} min-w-0 flex-1 bg-[#fafaf8]`}>
          {selected ? (
            <ReportDetailPanel key={selected} reportId={selected} onBack={() => select(null)} onChanged={() => void load()} />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center"><p className="max-w-xs text-[14.5px] leading-relaxed text-[#6b7280]">Choose a report to see what happened and decide what to do. Urgent reports are always at the top.</p></div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ModerationPage() {
  return <Suspense fallback={<Spinner />}><ModerationInner /></Suspense>;
}
