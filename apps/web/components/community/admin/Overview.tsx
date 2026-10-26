"use client";
import Link from "next/link";
import { Activity, Clock, Flag, MessageCircle, Scale, Siren, UsersRound } from "lucide-react";
import { Notice, Spinner } from "@/components/community/ui";
import { StatCard } from "./StatCard";
import { useAdminStats } from "./StatsContext";

const SHORTCUTS = [
  { href: "/community/moderation", title: "Review reports", body: "Urgent ones are at the top." },
  { href: "/community/admin/appeals", title: "Decide appeals", body: "People asking for a second look." },
  { href: "/community/admin/people", title: "Manage roles", body: "Moderators and verified helpers." },
  { href: "/community/admin/rooms", title: "Edit channels", body: "Add, lock, archive or reorder." },
];

export function Overview() {
  const { stats: s, failed } = useAdminStats();
  if (failed) return <Notice tone="red" role="alert">Could not load the counts. Please refresh.</Notice>;
  if (!s) return <Spinner />;
  const active = s.accounts > 0 ? s.activeLast7Days / s.accounts : 0;
  return (
    <div className="space-y-6">
      {(s.urgentOpenReports > 0 || s.openAppeals > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-rose-100 bg-rose-50 px-5 py-4 text-rose-900">
          <Siren className="size-5 shrink-0 text-rose-600" aria-hidden />
          <p className="min-w-0 flex-1 text-[14px]">
            {s.urgentOpenReports > 0 && <span className="font-semibold">{s.urgentOpenReports} urgent {s.urgentOpenReports === 1 ? "report" : "reports"} waiting. </span>}
            {s.openAppeals > 0 && <span>{s.openAppeals} {s.openAppeals === 1 ? "appeal" : "appeals"} waiting for a decision.</span>}
          </p>
          <Link href={s.urgentOpenReports > 0 ? "/community/moderation" : "/community/admin/appeals"} className="rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-rose-800 ring-1 ring-rose-200 hover:bg-rose-100">Open now</Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Members" value={s.accounts} icon={UsersRound} tone="sage" />
        <StatCard label="Active in the last 7 days" value={s.activeLast7Days} icon={Activity} tone="blue" ring={active} note={s.accounts ? "of all members" : undefined} />
        <StatCard label="Messages in the last 24 hours" value={s.messagesLast24Hours} icon={MessageCircle} tone="lavender" />
        <StatCard label="Reports waiting" value={s.openReports} icon={Flag} tone="amber" />
        <StatCard label="Urgent reports waiting" value={s.urgentOpenReports} icon={Siren} tone={s.urgentOpenReports > 0 ? "rose" : "sage"} />
        <StatCard label="Appeals waiting" value={s.openAppeals} icon={Scale} tone="sand" />
        <StatCard label="Average time to resolve a report" value={s.averageHoursToResolve === null ? "No data yet" : `${s.averageHoursToResolve} h`} note="Last 30 days" icon={Clock} tone="blue" />
      </div>

      <section aria-label="Shortcuts">
        <h2 className="mb-3 text-[14px] font-semibold text-[var(--cm-ink)]">Go to</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SHORTCUTS.map((x) => (
            <Link key={x.href} href={x.href} className="rounded-2xl border border-[var(--cm-line)] bg-white p-4 transition-colors hover:border-[var(--cat-accent)]">
              <p className="text-[14px] font-medium text-[var(--cm-ink)]">{x.title}</p>
              <p className="mt-0.5 text-[13px] text-[var(--cm-ink-3)]">{x.body}</p>
            </Link>
          ))}
        </div>
      </section>
      <p className="text-[13px] text-[var(--cm-ink-3)]">These are counts only. Nothing on this page can show what anyone wrote.</p>
    </div>
  );
}
