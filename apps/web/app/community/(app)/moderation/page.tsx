"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ArrowRight, Flag, Inbox, Siren, UserCheck } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/community/admin/StatCard";
import { ReportDetailPanel } from "@/components/community/mod/ReportDetailPanel";
import { GlassCard, Notice, PageIntro, Pill, Spinner } from "@/components/community/ui/index";
import { ApiError, get } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { formatAge } from "@/lib/community/format";
import { useCommunity, useCommunityEvents } from "@/lib/community/session";
import type { ReportSummary } from "@/lib/community/types";

type State = "active" | "mine" | "closed";
interface Counts { active: number; urgent: number; mine: number }
const TABS: Array<{ id: State; label: string }> = [{ id: "active", label: "Waiting" }, { id: "mine", label: "Mine" }, { id: "closed", label: "Closed" }];

function ModerationInner() {
  const { isStaff, isAdmin, phase, showToast } = useCommunity();
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
    <div className="cm-wash flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-5 md:px-8 md:py-6">
      <div className={selected ? "hidden lg:block" : ""}>
        <PageIntro trail={[...(isAdmin ? [{ label: "Admin", href: "/community/admin" }] : [{ label: "Team" }]), { label: "Moderation" }]} title="Moderation" subtitle="Reports from members. Urgent ones are always at the top.">
          {isAdmin && (
            <Link href="/community/admin" className="inline-flex items-center gap-2 rounded-full bg-[var(--cm-ink)] px-5 py-2.5 text-[13px] font-medium text-white transition-transform hover:-translate-y-0.5">Admin dashboard<ArrowRight className="size-4" aria-hidden /></Link>
          )}
        </PageIntro>
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <StatCard label="Waiting for a decision" value={counts.active} icon={Flag} tone="amber" />
          <StatCard label="Urgent" value={counts.urgent} icon={Siren} tone={counts.urgent > 0 ? "rose" : "sage"} note={counts.urgent > 0 ? "Please look at these first" : "Nothing urgent"} />
          <StatCard label="Taken by you" value={counts.mine} icon={UserCheck} tone="blue" />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <GlassCard className={`${selected ? "hidden lg:flex" : "flex"} min-h-0 flex-col overflow-hidden`}>
          <section aria-label="Reports" className="flex min-h-0 flex-1 flex-col">
            <div role="tablist" aria-label="Report list" className="m-3 mb-1 flex gap-1 rounded-full bg-[var(--cm-hover)] p-1">
              {TABS.map((t) => (
                <button key={t.id} role="tab" aria-selected={state === t.id} type="button" onClick={() => { setReports(null); setState(t.id); }} className={`flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ${state === t.id ? "bg-white text-[var(--cm-ink)] shadow-sm" : "text-[var(--cm-ink-3)] hover:text-[var(--cm-ink)]"}`}>{t.label}</button>
              ))}
            </div>
            <div data-lenis-prevent className="cm-scroll min-h-0 flex-1 overflow-y-auto p-2">
              {error && <Notice tone="red" role="alert">{error}</Notice>}
              {!reports && !error && <Spinner label="Opening the queue" />}
              {reports?.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--cat-soft)] text-[var(--cat-accent)]"><Inbox className="size-5" aria-hidden /></span>
                  <p className="text-[14.5px] font-medium text-[var(--cm-ink)]">{state === "closed" ? "Nothing closed yet" : "Nothing waiting"}</p>
                  <p className="mt-1 text-[13.5px] text-[var(--cm-ink-3)]">{state === "closed" ? "Closed reports will appear here." : "New reports will appear here the moment they are made."}</p>
                </div>
              )}
              <ul className="space-y-1">
                {reports?.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => select(r.id)} aria-current={selected === r.id ? "true" : undefined}
                      className={`w-full rounded-2xl border p-3.5 text-left transition-all duration-200 ${selected === r.id ? "border-[var(--cat-accent)]/50 bg-white shadow-sm" : "border-transparent hover:bg-white/70"}`}>
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        {r.priority === "urgent" && r.status !== "dismissed" && r.status !== "actioned" && <Pill tone="red">Urgent</Pill>}
                        {r.status === "escalated" && <Pill tone="red">With admins</Pill>}
                        {r.assigned === "me" && <Pill tone="indigo">Yours</Pill>}
                        {r.assigned === "other" && <Pill>Taken</Pill>}
                        <span className="ml-auto text-[12px] text-[var(--cm-ink-3)]">{formatAge(r.ageMinutes)}</span>
                      </div>
                      <p className="text-[14.5px] font-medium text-[var(--cm-ink)]">{copy.report.reasons[r.reason]?.label}</p>
                      <p className="mt-0.5 truncate text-[12.5px] text-[var(--cm-ink-3)]">{r.room?.title ?? "A channel"} · {r.targetName}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </GlassCard>

        <GlassCard className={`${selected ? "block" : "hidden lg:block"} min-h-0 overflow-y-auto`}>
          <section aria-label="Report detail" data-lenis-prevent className="cm-scroll h-full">
            {selected ? (
              <ReportDetailPanel key={selected} reportId={selected} onBack={() => select(null)} onChanged={() => void load()} />
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center p-8 text-center"><p className="max-w-xs text-[14.5px] leading-relaxed text-[var(--cm-ink-3)]">Choose a report to see what happened and decide what to do. Urgent reports are always at the top.</p></div>
            )}
          </section>
        </GlassCard>
      </div>
    </div>
  );
}

export default function ModerationPage() {
  return <Suspense fallback={<Spinner />}><ModerationInner /></Suspense>;
}
