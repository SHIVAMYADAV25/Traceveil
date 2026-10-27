import { Bell, LayoutDashboard, Settings, ShieldCheck, type LucideIcon } from "lucide-react";
import type { RoomKind, Space } from "@/lib/community/types";

export interface HeaderInfo {
  title: string;
  description: string;
  /** A channel, drawn with the channel's own picture. */
  channel?: { slug: string; kind: RoomKind; locked: boolean };
  icon?: LucideIcon;
}

const RESERVED = ["account", "notifications", "moderation", "admin", "join", "onboarding"];

const ADMIN: Array<[string, string]> = [
  ["/community/admin/people", "Who is on the team, and who is a verified helper."],
  ["/community/admin/rooms", "The groups and channels members see."],
  ["/community/admin/appeals", "Decisions people have asked to be reviewed."],
  ["/community/admin/audit", "A permanent record of team actions."],
];

/**
 * What the top header says for the current address. It is worked out from the address and the channel list the
 * sidebar already has, so the header changes the instant you click, with no waiting for the screen underneath.
 */
export function routeHeader(pathname: string, spaces: Space[]): HeaderInfo {
  const m = /^\/community\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(pathname);
  if (m && !RESERVED.includes(m[1] as string)) {
    const room = spaces.find((s) => s.slug === m[1])?.rooms.find((r) => r.slug === m[2]);
    return room
      ? { title: room.title, description: room.purpose, channel: { slug: room.slug, kind: room.kind, locked: room.isLocked } }
      : { title: m[2] as string, description: "", channel: { slug: m[2] as string, kind: "chat", locked: false } };
  }
  if (pathname.startsWith("/community/notifications")) return { title: "Notifications", description: "Replies, mentions and notes from the team.", icon: Bell };
  if (pathname.startsWith("/community/account")) return { title: "Your account", description: "How you appear, who you have blocked, and your access.", icon: Settings };
  if (pathname.startsWith("/community/moderation")) return { title: "Moderation", description: "Reports from members, urgent ones first.", icon: ShieldCheck };
  if (pathname.startsWith("/community/admin")) {
    return { title: "Admin", description: ADMIN.find(([p]) => pathname.startsWith(p))?.[1] ?? "How the Community is doing today.", icon: LayoutDashboard };
  }
  return { title: "Community", description: "", icon: Bell };
}
