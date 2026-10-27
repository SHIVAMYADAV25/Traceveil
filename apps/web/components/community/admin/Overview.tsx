"use client";
import Link from "next/link";
import { Activity, ArrowRight, Clock, Flag, MessageCircle, Scale, Siren, UsersRound } from "lucide-react";
import { GlassCard, Loader, Notice, PageIntro } from "@/components/community/ui/index";
import { StatCard } from "./StatCard";
import { useAdminStats, weekDelta } from "./StatsContext";

const SHORTCUTS = [
  { href: "/community/moderation", title: "Review reports", body: "Urgent ones are at the top." },
  { href: "/community/admin/appeals", title: "Decide appeals", body: "People asking for a second look." },
  { href: "/community/admin/people", title: "Manage roles", body: "Moderators and verified helpers." },
  { href: "/community/admin/rooms", title: "Edit channels", body: "Add, lock, archive or reorder." },
];

export function Overview() {
  const { stats: s, series, failed } = useAdminStats();
  if (failed) return <Notice tone="red" role="alert">Could not load the counts. Please refresh.</Notice>;
  if (!s) return <Loader label="Counting" fill={false} />;
  const active = s.accounts > 0 ? s.activeLast7Days / s.accounts : 0;
  const members = series ? weekDelta(series.members) : null;
  const messages = series ? weekDelta(series.messages) : null;
  const reports = series ? weekDelta(series.reports) : null;
  const appeals = series ? weekDelta(series.appeals) : null;
  const attention = s.urgentOpenReports > 0 || s.openAppeals > 0;

  return (
    <div>
      <PageIntro trail={[{ label: "Admin", href: "/community/admin" }, { label: "Overview" }]} title="Overview" subtitle="How the Community is doing. Counts only: nothing here can show what anyone wrote.">
        <Link href="/community/moderation" className="inline-flex items-center gap-2 rounded-full bg-[var(--cm-ink)] px-5 py-2.5 text-[13px] font-medium text-white transition-transform hover:-translate-y-0.5">
          Review reports<ArrowRight className="size-4" aria-hidden />
        </Link>
      </PageIntro>

      {attention && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[22px] border border-rose-100 bg-rose-50/90 px-5 py-4 text-rose-900">
          <Siren className="size-5 shrink-0 text-rose-600" aria-hidden />
          <p className="min-w-0 flex-1 text-[14px]">
            {s.urgentOpenReports > 0 && <span className="font-semibold">{s.urgentOpenReports} urgent {s.urgentOpenReports === 1 ? "report" : "reports"} waiting. </span>}
            {s.openAppeals > 0 && <span>{s.openAppeals} {s.openAppeals === 1 ? "appeal" : "appeals"} waiting for a decision.</span>}
          </p>
          <Link href={s.urgentOpenReports > 0 ? "/community/moderation" : "/community/admin/appeals"} className="rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-rose-800 ring-1 ring-rose-200 transition-colors hover:bg-rose-100">Open now</Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Members" value={s.accounts} icon={UsersRound} tone="sage" series={series?.members} delta={members ? { now: members.now, pct: members.pct, good: "up" } : undefined} note={members ? `${members.now} joined in the last 7 days` : undefined} />
        <StatCard label="Messages in 24 hours" value={s.messagesLast24Hours} icon={MessageCircle} tone="lavender" series={series?.messages} delta={messages ? { now: messages.now, pct: messages.pct, good: "up" } : undefined} note={messages ? `${messages.now} in the last 7 days` : undefined} />
        <StatCard label="Reports waiting" value={s.openReports} icon={Flag} tone="amber" series={series?.reports} delta={reports ? { now: reports.now, pct: reports.pct, good: "down" } : undefined} note={reports ? `${reports.now} received in the last 7 days` : undefined} />
        <StatCard label="Appeals waiting" value={s.openAppeals} icon={Scale} tone="sand" series={series?.appeals} delta={appeals ? { now: appeals.now, pct: appeals.pct, good: "down" } : undefined} note={appeals ? `${appeals.now} received in the last 7 days` : undefined} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Active in the last 7 days" value={s.activeLast7Days} icon={Activity} tone="blue" ring={active} note="of all members" />
        <StatCard label="Urgent reports waiting" value={s.urgentOpenReports} icon={Siren} tone={s.urgentOpenReports > 0 ? "rose" : "sage"} note={s.urgentOpenReports > 0 ? "Please look at these first" : "Nothing urgent right now"} />
        <StatCard label="Average time to resolve" value={s.averageHoursToResolve === null ? "No data yet" : `${s.averageHoursToResolve} h`} icon={Clock} tone="blue" note="Reports closed in the last 30 days" />
      </div>

      <section aria-label="Shortcuts" className="mt-8">
        <h3 className="mb-3 text-[14px] font-semibold text-[var(--cm-ink)]">Go to</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SHORTCUTS.map((x) => (
            <Link key={x.href} href={x.href} className="group">
              <GlassCard className="flex h-full items-start justify-between gap-2 p-4 transition-all duration-200 group-hover:-translate-y-0.5">
                <div><p className="text-[14px] font-medium text-[var(--cm-ink)]">{x.title}</p><p className="mt-0.5 text-[13px] text-[var(--cm-ink-3)]">{x.body}</p></div>
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-[var(--cm-ink-3)] transition-transform group-hover:translate-x-0.5" aria-hidden />
              </GlassCard>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
