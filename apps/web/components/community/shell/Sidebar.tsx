"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Bell, BellOff, ChevronDown, LayoutDashboard, LogOut, Settings, ShieldCheck, Undo2, UserRound, type LucideIcon } from "lucide-react";
import { Avatar } from "@/components/community/ui/Avatar";
import { Menu, MenuDivider, MenuItem } from "@/components/community/ui/Menu";
import { ChannelIcon } from "@/components/community/ui/ChannelIcon";
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

function CountBadge({ n, label }: { n: number; label: string }) {
  if (n <= 0) return null;
  return (
    <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--cat-accent)] px-1.5 text-[11px] font-semibold leading-none text-white">
      {badgeCount(n)}<span className="sr-only"> {label}</span>
    </span>
  );
}

function NavRow({ href, icon: Icon, children, active, badge, badgeLabel, onNavigate }: {
  href: string; icon: LucideIcon; children: ReactNode; active: boolean; badge?: number; badgeLabel?: string; onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-9 items-center gap-2.5 rounded-xl px-3 py-1.5 text-[14px] transition-colors ${active ? "bg-[var(--cm-surface)] font-medium text-[var(--cm-ink)] shadow-[0_1px_2px_rgb(31_42_39/0.08)]" : "text-[var(--cm-ink-2)] hover:bg-[var(--cm-sidebar-hover)]"}`}
    >
      <Icon className="size-[18px] shrink-0 text-[var(--cm-ink-3)]" aria-hidden />
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
      className={`group flex min-h-9 items-center gap-2.5 rounded-xl px-3 py-1.5 text-[14px] transition-colors ${active ? "bg-[var(--cm-surface)] font-medium text-[var(--cm-ink)] shadow-[0_1px_2px_rgb(31_42_39/0.08)]" : unread > 0 ? "font-medium text-[var(--cm-ink)] hover:bg-[var(--cm-sidebar-hover)]" : "text-[var(--cm-ink-2)] hover:bg-[var(--cm-sidebar-hover)]"}`}
    >
      <ChannelIcon slug={room.slug} kind={room.kind} locked={room.isLocked} className={`size-[17px] shrink-0 ${active ? "text-[var(--cat-accent)]" : "text-[var(--cm-ink-3)]"}`} />
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
    <section style={themeVars(theme)} className="mb-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left hover:text-[var(--cm-ink)]"
      >
        <ChevronDown className={`size-3.5 shrink-0 text-[var(--cm-ink-3)] transition-transform ${open ? "" : "-rotate-90"}`} aria-hidden />
        <span className="size-2 shrink-0 rounded-full bg-[var(--cat-accent)]" aria-hidden />
        <span className="truncate text-[13px] font-medium text-[var(--cm-ink-2)] group-hover:text-[var(--cm-ink)]">{space.title}</span>
        {!open && unread > 0 && <span className="ml-auto size-2 rounded-full bg-[var(--cat-accent)]"><span className="sr-only">{unread} {copy.rail.unreadLabel}</span></span>}
      </button>
      {open && (
        <ul className="mt-0.5 space-y-0.5">
          {space.rooms.map((room) => (
            <li key={room.id}><ChannelRow room={room} active={pathname === `/community/${room.spaceSlug}/${room.slug}`} onNavigate={onNavigate} /></li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * The left side of the Community, top to bottom: a banner for the group you are in with the menu for
 * your account, the places that are not channels (notifications, and team tools for team members),
 * every channel group, and who you are signed in as.
 */
export function Sidebar({ openReports, onNavigate }: { openReports: number; onNavigate?: () => void }) {
  const { me, spaces, isStaff, isAdmin, signOut } = useCommunity();
  const router = useRouter();
  const pathname = usePathname();
  const theme = themeFor(spaceSlugFromPath(pathname));
  const go = (path: string, close: () => void) => () => { close(); onNavigate?.(); router.push(path); };
  if (!me) return null;

  return (
    <nav aria-label={copy.rail.title} style={themeVars(theme)} className="flex h-full flex-col bg-[var(--cm-sidebar)]">
      <div className="relative h-[128px] shrink-0 overflow-hidden">
        <Image key={theme.banner} src={theme.banner} alt="" fill sizes="288px" className="object-cover object-[78%_center]" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/55 via-white/10 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--cm-sidebar)] to-transparent" aria-hidden />
        <div className="relative flex h-full flex-col justify-between p-3.5">
          <Link href="/community" onClick={onNavigate} className="flex w-fit items-center gap-2 text-[12.5px] font-medium text-[var(--cm-ink-2)]">
            <Image src="/logo.png" alt="" width={18} height={18} className="rounded" />
            Traceveil
          </Link>
          <Menu
            label={copy.topbar.menu}
            align="left"
            panelClassName="w-[248px]"
            triggerClassName="-ml-1 flex items-center gap-1.5 rounded-xl px-1.5 py-1 hover:bg-white/50"
            trigger={<><span className="cm-title text-[24px] leading-none text-[var(--cm-ink)]">{copy.brand}</span><ChevronDown className="size-4 text-[var(--cm-ink-2)]" aria-hidden /></>}
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
      </div>

      <div className="cm-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pb-4" data-lenis-prevent>
        <div className="space-y-0.5 pb-2 pt-1">
          <NavRow href="/community/notifications" icon={Bell} active={pathname.startsWith("/community/notifications")} badge={me.unreadNotifications} badgeLabel={copy.rail.unreadLabel} onNavigate={onNavigate}>{copy.topbar.notifications}</NavRow>
          {isStaff && <NavRow href="/community/moderation" icon={ShieldCheck} active={pathname.startsWith("/community/moderation")} badge={openReports} badgeLabel="reports waiting" onNavigate={onNavigate}>{copy.topbar.moderation}</NavRow>}
          {isAdmin && <NavRow href="/community/admin" icon={LayoutDashboard} active={pathname.startsWith("/community/admin")} onNavigate={onNavigate}>{copy.topbar.admin}</NavRow>}
        </div>
        <div className="mx-2 mb-2 border-t border-[var(--cm-line)]" role="separator" />

        {spaces.length === 0 && <p className="px-3 py-4 text-[13px] text-[var(--cm-ink-3)]">{copy.room.loading}…</p>}
        {spaces.map((space) => <Group key={space.slug} space={space} pathname={pathname} onNavigate={onNavigate} />)}
      </div>

      <div className="flex items-center gap-2.5 border-t border-[var(--cm-line)] bg-[var(--cm-sidebar)] px-3 py-2.5">
        <Avatar seed={me.persona.avatarSeed} size={34} label="" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium leading-tight text-[var(--cm-ink)]">{me.persona.displayName}</p>
          <p className="truncate text-[12px] leading-tight text-[var(--cm-ink-3)]">{copy.roles[me.account.role]}</p>
        </div>
        <Link href="/community/account" onClick={onNavigate} aria-label={copy.topbar.account} title={copy.topbar.account} className="rounded-xl p-2 text-[var(--cm-ink-2)] hover:bg-[var(--cm-sidebar-hover)]">
          <UserRound className="size-[18px]" aria-hidden />
        </Link>
      </div>
    </nav>
  );
}
