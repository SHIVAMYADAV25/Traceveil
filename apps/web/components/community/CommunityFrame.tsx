"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Bell, Gavel, Menu as MenuIcon, Settings, ShieldCheck, UserRound, X } from "lucide-react";
import { get } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { useCommunity, useCommunityEvents } from "@/lib/community/session";
import { Avatar } from "./Avatar";
import { Menu, MenuItem } from "./Menu";
import { QuickExitButton } from "./QuickExit";
import { RoomRail } from "./RoomRail";
import { Spinner } from "./ui";

/**
 * The signed-in shell. A slim top bar, then the room list beside the conversation. It also guards
 * the area: people who are not signed in, have not finished setting up, or are locked out are sent
 * to the right place, and nothing else is shown until they are.
 */
export function CommunityFrame({ children }: { children: ReactNode }) {
  const { phase, me, isStaff, isAdmin, isLockedOut, socketStatus, signOut } = useCommunity();
  const router = useRouter();
  const pathname = usePathname();
  const [railOpen, setRailOpen] = useState(false);
  const [openReports, setOpenReports] = useState(0);

  const onStaffPage = pathname.startsWith("/community/moderation") || pathname.startsWith("/community/admin");
  const showRail = !onStaffPage && !isLockedOut;

  useEffect(() => {
    if (phase === "signed_out") router.replace("/community/join");
    else if (phase === "ready" && me && !me.onboardingComplete) router.replace("/community/onboarding");
    else if (phase === "ready" && isLockedOut && pathname !== "/community/account") router.replace("/community/account");
  }, [phase, me, isLockedOut, pathname, router]);

  const loadReportCount = useCallback(async () => {
    if (!isStaff) return;
    try { setOpenReports((await get<{ counts: { active: number } }>("/mod/reports?limit=1")).counts.active); } catch { /* badge only */ }
  }, [isStaff]);
  useEffect(() => {
    if (!isStaff) return;
    let alive = true;
    get<{ counts: { active: number } }>("/mod/reports?limit=1").then((r) => { if (alive) setOpenReports(r.counts.active); }).catch(() => undefined);
    return () => { alive = false; };
  }, [isStaff]);
  useCommunityEvents((e) => {
    if (e.type === "notification.created" && ["report_new", "report_escalated"].includes(e.data.notification.kind)) void loadReportCount();
  });

  if (phase === "loading" || !me || (!me.onboardingComplete && pathname !== "/community/onboarding")) {
    return <div className="min-h-dvh bg-[#fafaf8]"><Spinner /></div>;
  }

  const live = socketStatus === "open";
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#fafaf8]">
      <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-[#e8e4de] bg-white/90 px-3 backdrop-blur sm:gap-3 sm:px-5">
        {showRail && (
          <button type="button" aria-label={copy.rail.openRooms} onClick={() => setRailOpen(true)} className="rounded-lg p-2 text-[#374151] hover:bg-[#f0ede8] md:hidden">
            <MenuIcon className="size-5" aria-hidden />
          </button>
        )}
        <Link href="/community" className="flex items-center gap-2" aria-label="Community home">
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}><svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 3 4 8v7c0 6 4.5 10 11 12 6.5-2 11-6 11-12V8z" fill="#E4937A"/><path d="M10 15l4 4 7-8" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round"/></svg><b style={{fontSize:'22px',fontWeight:'500'}}>traceveil</b></div>
          {/* <span className="hidden text-[17px] font-semibold tracking-tight text-[#0a0a0a] sm:inline">sniffer</span> */}
          <span className="rounded-full border border-[#e8e4de] bg-[#f0ede8] px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-widest text-[#374151]">{copy.brand}</span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <span className="hidden items-center gap-1.5 text-[12px] text-[#6b7280] sm:flex" title={live ? copy.topbar.live : copy.room.reconnecting}>
            <span className={`size-1.5 rounded-full ${live ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden />
            {live ? copy.topbar.live : "…"}
          </span>
          {/* <QuickExitButton /> */}
          <Link href="/community/notifications" aria-label={`${copy.topbar.notifications}${me.unreadNotifications ? `, ${me.unreadNotifications} unread` : ""}`} className="relative rounded-full p-2 text-[#374151] hover:bg-[#f0ede8]">
            <Bell className="size-[18px]" aria-hidden />
            {me.unreadNotifications > 0 && (
              <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-semibold leading-4 text-white">
                {me.unreadNotifications > 99 ? "99+" : me.unreadNotifications}
              </span>
            )}
          </Link>
          <Menu
            label={copy.topbar.account}
            triggerClassName="flex items-center rounded-full p-0.5 hover:ring-2 hover:ring-[#e8e4de]"
            trigger={<Avatar seed={me.persona.avatarSeed} size={32} label={me.persona.displayName} />}
          >
            {(close) => (
              <>
                <div className="px-3 pb-2 pt-1.5">
                  <p className="text-[13.5px] font-semibold text-[#0a0a0a]">{me.persona.displayName}</p>
                  <p className="text-[12px] text-[#6b7280]">{me.account.role === "member" ? "Member" : me.account.role.replace("_", " ")}</p>
                </div>
                <div className="my-1 border-t border-[#f0ede8]" />
                <MenuItem icon={<Settings className="size-4" />} onClick={() => { close(); router.push("/community/account"); }}>{copy.topbar.account}</MenuItem>
                {isStaff && <MenuItem icon={<ShieldCheck className="size-4" />} onClick={() => { close(); router.push("/community/moderation"); }}>{copy.topbar.moderation}{openReports > 0 ? ` (${openReports})` : ""}</MenuItem>}
                {isAdmin && <MenuItem icon={<Gavel className="size-4" />} onClick={() => { close(); router.push("/community/admin"); }}>{copy.topbar.admin}</MenuItem>}
                <MenuItem icon={<UserRound className="size-4" />} onClick={() => { close(); router.push("/"); }}>{copy.topbar.back}</MenuItem>
                <div className="my-1 border-t border-[#f0ede8]" />
                <MenuItem onClick={async () => { close(); await signOut(); router.replace("/community"); }}>{copy.account.signOut}</MenuItem>
              </>
            )}
          </Menu>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {showRail && (
          <aside className="hidden w-[280px] shrink-0 border-r border-[#e8e4de] bg-white md:block"><RoomRail /></aside>
        )}
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {showRail && railOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-[#0a0a0a]/40" onClick={() => setRailOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-[#e8e4de] px-4">
              <span className="text-[14px] font-semibold">{copy.rail.title}</span>
              <button type="button" aria-label={copy.rail.closeRooms} onClick={() => setRailOpen(false)} className="rounded-full p-2 hover:bg-[#f0ede8]"><X className="size-4" /></button>
            </div>
            <div className="min-h-0 flex-1"><RoomRail onNavigate={() => setRailOpen(false)} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
