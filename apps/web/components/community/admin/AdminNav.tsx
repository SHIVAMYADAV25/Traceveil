"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Hash, LayoutDashboard, Scale, ScrollText, ShieldCheck, UsersRound, type LucideIcon } from "lucide-react";
import { lastRoomPath } from "@/lib/community/lastRoom";
import { useAdminStats } from "./StatsContext";

interface Item { href: string; label: string; icon: LucideIcon; badge?: number; exact?: boolean }

/** Where an admin goes next. Always visible on large screens, a scrolling strip on phones. */
export function AdminNav() {
  const pathname = usePathname();
  const { stats } = useAdminStats();
  const main: Item[] = [
    { href: "/community/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/community/admin/people", label: "People and roles", icon: UsersRound },
    { href: "/community/admin/rooms", label: "Channels", icon: Hash },
    { href: "/community/admin/appeals", label: "Appeals", icon: Scale, badge: stats?.openAppeals },
    { href: "/community/admin/audit", label: "Audit log", icon: ScrollText },
  ];
  const active = (i: Item) => (i.exact ? pathname === i.href : pathname.startsWith(i.href));

  const link = (i: Item) => (
    <Link key={i.href} href={i.href} aria-current={active(i) ? "page" : undefined}
      className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-[13.5px] transition-colors ${active(i) ? "bg-[var(--cat-soft)] font-medium text-[var(--cat-ink)]" : "text-[var(--cm-ink-2)] hover:bg-[var(--cm-hover)]"}`}>
      <i.icon className="size-[18px]" aria-hidden />{i.label}
      {!!i.badge && i.badge > 0 && <span className="ml-auto rounded-full bg-[var(--cat-accent)] px-1.5 text-[11px] font-semibold leading-[18px] text-white">{i.badge}</span>}
    </Link>
  );

  return (
    <>
      <nav aria-label="Admin sections" className="hidden w-[236px] shrink-0 flex-col gap-0.5 border-r border-[var(--cm-line)] bg-[var(--cm-surface)] p-3 md:flex">
        {main.map(link)}
        <div className="my-2 border-t border-[var(--cm-line)]" role="separator" />
        <Link href="/community/moderation" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] text-[var(--cm-ink-2)] hover:bg-[var(--cm-hover)]">
          <ShieldCheck className="size-[18px]" aria-hidden />Moderation queue
          {!!stats?.openReports && <span className="ml-auto rounded-full bg-rose-100 px-1.5 text-[11px] font-semibold leading-[18px] text-rose-700">{stats.openReports}</span>}
        </Link>
        <Link href={lastRoomPath()} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] text-[var(--cm-ink-2)] hover:bg-[var(--cm-hover)]">
          <ArrowLeft className="size-[18px]" aria-hidden />Back to channels
        </Link>
      </nav>
      <nav aria-label="Admin sections" className="cm-scroll flex gap-1 overflow-x-auto border-b border-[var(--cm-line)] bg-[var(--cm-surface)] px-3 py-2 md:hidden">
        {main.map(link)}
        <Link href="/community/moderation" className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[13.5px] text-[var(--cm-ink-2)]"><ShieldCheck className="size-[18px]" aria-hidden />Moderation</Link>
      </nav>
    </>
  );
}
