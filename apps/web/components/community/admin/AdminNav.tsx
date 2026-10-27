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
      className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-[14px] transition-all duration-200 ${active(i) ? "bg-[var(--cat-accent)] font-medium text-white shadow-[0_6px_14px_-6px_var(--cat-accent)]" : "text-[var(--cm-ink-2)] hover:bg-white/80 hover:text-[var(--cm-ink)]"}`}>
      <i.icon className="size-[18px]" aria-hidden />{i.label}
      {!!i.badge && i.badge > 0 && <span className={`ml-auto rounded-full px-1.5 text-[11px] font-semibold leading-[18px] ${active(i) ? "bg-white/25 text-white" : "bg-[var(--cat-accent)] text-white"}`}>{i.badge}</span>}
    </Link>
  );
  const plain = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-[var(--cm-ink-2)] transition-colors hover:bg-white/80 hover:text-[var(--cm-ink)]";

  return (
    <>
      <nav aria-label="Admin sections" className="cm-glass m-4 mr-0 hidden w-[224px] shrink-0 flex-col gap-0.5 self-start rounded-[22px] p-2 md:flex">
        {main.map(link)}
        <div className="mx-2 my-1.5 border-t border-[var(--cm-line)]" role="separator" />
        <Link href="/community/moderation" className={plain}>
          <ShieldCheck className="size-[18px]" aria-hidden />Moderation queue
          {!!stats?.openReports && <span className="ml-auto rounded-full bg-rose-100 px-1.5 text-[11px] font-semibold leading-[18px] text-rose-700">{stats.openReports}</span>}
        </Link>
        <Link href={lastRoomPath()} className={plain}><ArrowLeft className="size-[18px]" aria-hidden />Back to channels</Link>
      </nav>
      <nav aria-label="Admin sections" className="cm-scroll flex gap-1 overflow-x-auto px-3 py-2 md:hidden">
        {main.map(link)}
        <Link href="/community/moderation" className={`${plain} shrink-0`}><ShieldCheck className="size-[18px]" aria-hidden />Moderation</Link>
      </nav>
    </>
  );
}
