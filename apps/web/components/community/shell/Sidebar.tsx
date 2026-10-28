"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Bell, BellOff, ChevronDown, LayoutDashboard, LogOut, Settings, ShieldCheck, Undo2, UserRound, type LucideIcon } from "lucide-react";
import { Avatar } from "@/components/community/ui/Avatar";
import { ChannelIcon } from "@/components/community/ui/ChannelIcon";
import { Menu, MenuDivider, MenuItem } from "@/components/community/ui/Menu";
import { themeFor, themeVars } from "@/lib/community/channelTheme";
import { copy } from "@/lib/community/copy";
import { useCommunity } from "@/lib/community/session";
import type { RoomListItem, Space } from "@/lib/community/types";

/** Which channel group the person is in, read from the address. Anything else (account, admin) uses the first theme. */
export function spaceSlugFromPath(pathname: string): string | undefined {
  const m = /^\/community\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(pathname);
  const reserved = ["account", "notifications", "moderation", "admin", "join", "onboarding"];
  return m && !reserved.includes(m[1] as string) ? m[1] : undefined;
}

const badgeCount = (n: number) => (n > 99 ? "99+" : String(n));
const ROW = "flex min-h-[38px] items-center gap-3 rounded-xl px-3 py-1.5 text-[15px] transition-all duration-200";
const ROW_ON = "bg-white/85 font-medium text-[var(--cm-ink)] shadow-[0_1px_3px_rgb(31_42_39/0.1)]";
const ROW_OFF = "text-[var(--cm-ink-2)] hover:bg-[var(--cm-sidebar-hover)] hover:text-[var(--cm-ink)]";

function CountBadge({ n, label }: { n: number; label: string }) {
  if (n <= 0) return null;
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--cat-accent)] px-1.5 text-[11.5px] font-semibold leading-none text-white">
      {badgeCount(n)}<span className="sr-only"> {label}</span>
    </span>
  );
}

function NavRow({ href, icon: Icon, children, active, badge, badgeLabel, onNavigate }: {
  href: string; icon: LucideIcon; children: ReactNode; active: boolean; badge?: number; badgeLabel?: string; onNavigate?: () => void;
}) {
  return (
    <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`${ROW} ${active ? ROW_ON : ROW_OFF}`}>
      <Icon className={`size-5 shrink-0 ${active ? "text-[var(--cat-accent)]" : "text-[var(--cm-ink-3)]"}`} aria-hidden />
      <span className="truncate">{children}</span>
      <CountBadge n={badge ?? 0} label={badgeLabel ?? ""} />
    </Link>
  );
}

function ChannelRow({ room, active, onNavigate }: { room: RoomListItem; active: boolean; onNavigate?: () => void }) {
  const unread = !room.muted && !active ? room.unread : 0;
  return (
    <Link
      href={`/community/${room.spaceSlug}/${room.slug}`}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`${ROW} ${active ? ROW_ON : unread > 0 ? "font-medium text-[var(--cm-ink)] hover:bg-[var(--cm-sidebar-hover)]" : ROW_OFF}`}
    >
      <ChannelIcon slug={room.slug} kind={room.kind} locked={room.isLocked} className={`size-[19px] shrink-0 ${active ? "text-[var(--cat-accent)]" : "text-[var(--cm-ink-3)]"}`} />
      <span className="truncate">{room.title}</span>
      {room.muted && <BellOff className="ml-auto size-3.5 shrink-0 text-[var(--cm-ink-3)]" aria-label={copy.rail.muted} />}
      <CountBadge n={unread} label={copy.rail.unreadLabel} />
    </Link>
  );
}

function Group({ space, pathname, onNavigate }: { space: Space; pathname: string; onNavigate?: () => void }) {
  const [open, setOpen] = useState(true);
  const theme = themeFor(space.slug);
  const unread = space.rooms.reduce((n, r) => n + (r.muted ? 0 : r.unread), 0);
  return (
    <section style={themeVars(theme)} className="mb-1.5">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left">
        <ChevronDown className={`size-3.5 shrink-0 text-[var(--cm-ink-3)] transition-transform duration-300 ${open ? "" : "-rotate-90"}`} aria-hidden />
        <span className="size-2 shrink-0 rounded-full bg-[var(--cat-accent)]" aria-hidden />
        <span className="truncate text-[13.5px] font-medium text-[var(--cm-ink-2)] transition-colors group-hover:text-[var(--cm-ink)]">{space.title}</span>
        {unread > 0 && <span className={`ml-auto size-2 rounded-full bg-[var(--cat-accent)] transition-opacity duration-200 ${open ? "opacity-0" : "opacity-100"}`}><span className="sr-only">{unread} {copy.rail.unreadLabel}</span></span>}
      </button>
      {/* Height animates by letting a grid row go from 0 to its content's size. */}
      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <ul className="min-h-0 space-y-0.5 overflow-hidden" inert={!open}>
          {space.rooms.map((room) => (
            <li key={room.id}><ChannelRow room={room} active={pathname === `/community/${room.spaceSlug}/${room.slug}`} onNavigate={onNavigate} /></li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * The left side of the frame, top to bottom: the community name with its menu, the places that are not channels
 * (notifications, and team tools for the team), every channel group, and who you are signed in as.
 * It has no background of its own: the frame's colour and banner show through, which is what joins it to the header.
 */
export function Sidebar({ openReports, onNavigate }: { openReports: number; onNavigate?: () => void }) {
  const { me, spaces, isStaff, isAdmin, signOut } = useCommunity();
  const router = useRouter();
  const pathname = usePathname();
  const go = (path: string, close: () => void) => () => { close(); onNavigate?.(); router.push(path); };
  if (!me) return null;

  return (
    <nav aria-label={copy.rail.title} className="flex h-full flex-col">
      {/* No overflow clipping here, so the menu below can open over the list. */}
      <div className="relative z-20 shrink-0 px-4 pb-3 pt-4">
        <Link href="/community" onClick={onNavigate} className="mb-3 flex w-fit items-center gap-2 text-[13px] font-medium text-[var(--cm-ink-2)]">
          {/* <Image src="/logo.png" alt="" width={20} height={20} className="rounded" /> */}
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}><svg width="20" height="20" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 3 4 8v7c0 6 4.5 10 11 12 6.5-2 11-6 11-12V8z" fill="#E4937A"/><path d="M10 15l4 4 7-8" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round"/></svg><b style={{fontSize:'20px',fontWeight:'500'}}>traceveil</b></div>
        </Link>
        <Menu
          label={copy.topbar.menu}
          align="left"
          tone="frame"
          panelClassName="w-[256px]"
          triggerClassName="-ml-1.5 flex items-center gap-1.5 rounded-xl px-2 py-1 transition-colors hover:bg-white/50"
          trigger={<><span className="cm-title text-[27px] leading-none text-[var(--cm-ink)]">{copy.brand}</span><ChevronDown className="size-4 text-[var(--cm-ink-2)]" aria-hidden /></>}
        >
          {(close) => (
            <>
              <MenuItem icon={<Settings className="size-4" />} onClick={go("/community/account", close)}>{copy.topbar.account}</MenuItem>
              <MenuItem icon={<Bell className="size-4" />} onClick={go("/community/notifications", close)}>{copy.topbar.notifications}</MenuItem>
              <MenuItem icon={<Undo2 className="size-4" />} onClick={() => { close(); router.push("/"); }}>{copy.topbar.back}</MenuItem>
              <MenuDivider />
              <MenuItem icon={<LogOut className="size-4" />} onClick={async () => { close(); await signOut(); router.replace("/community"); }}>{copy.account.signOut}</MenuItem>
            </>
          )}
        </Menu>
      </div>

      <div className="cm-scroll relative z-10 min-h-0 flex-1 overflow-y-auto px-3 pb-4" data-lenis-prevent>
        <div className="space-y-0.5 pb-2">
          <NavRow href="/community/notifications" icon={Bell} active={pathname.startsWith("/community/notifications")} badge={me.unreadNotifications} badgeLabel={copy.rail.unreadLabel} onNavigate={onNavigate}>{copy.topbar.notifications}</NavRow>
          {isStaff && <NavRow href="/community/moderation" icon={ShieldCheck} active={pathname.startsWith("/community/moderation")} badge={openReports} badgeLabel="reports waiting" onNavigate={onNavigate}>{copy.topbar.moderation}</NavRow>}
          {isAdmin && <NavRow href="/community/admin" icon={LayoutDashboard} active={pathname.startsWith("/community/admin")} onNavigate={onNavigate}>{copy.topbar.admin}</NavRow>}
        </div>
        <div className="mx-2 mb-2 border-t border-[var(--cm-frame-line)]" role="separator" />

        {spaces.length === 0 && <p className="px-3 py-4 text-[13px] text-[var(--cm-ink-3)]">{copy.room.loading}…</p>}
        {spaces.map((space) => <Group key={space.slug} space={space} pathname={pathname} onNavigate={onNavigate} />)}
      </div>

      <div className="relative z-10 flex items-center gap-3 px-3.5 pb-3.5 pt-2">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-white/70 p-2 pr-1.5 shadow-[0_1px_3px_rgb(31_42_39/0.08)]">
          <Avatar seed={me.persona.avatarSeed} size={36} label="" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium leading-tight text-[var(--cm-ink)]">{me.persona.displayName}</p>
            <p className="truncate text-[12px] leading-tight text-[var(--cm-ink-3)]">{copy.roles[me.account.role]}</p>
          </div>
          <Link href="/community/account" onClick={onNavigate} aria-label={copy.topbar.account} title={copy.topbar.account} className="rounded-xl p-2 text-[var(--cm-ink-2)] transition-colors hover:bg-[var(--cm-sidebar-hover)]">
            <UserRound className="size-[18px]" aria-hidden />
          </Link>
        </div>
      </div>
    </nav>
  );
}
