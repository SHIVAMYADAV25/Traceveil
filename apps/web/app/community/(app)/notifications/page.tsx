"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Eyebrow, SecondaryButton, Spinner } from "@/components/community/ui";
import { get, post } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { formatAge } from "@/lib/community/format";
import { useCommunity, useCommunityEvents } from "@/lib/community/session";
import { useNow } from "@/lib/community/useNow";
import type { AppNotification } from "@/lib/community/types";

function targetFor(n: AppNotification): string | null {
  const p = n.payload;
  if ((n.kind === "mention" || n.kind === "reply") && p.spaceSlug && p.roomSlug) return `/community/${String(p.spaceSlug)}/${String(p.roomSlug)}`;
  if (n.kind === "report_new" || n.kind === "report_escalated") return `/community/moderation?report=${String(p.reportId ?? "")}`;
  if (n.kind === "appeal_new") return "/community/admin?tab=appeals";
  if (["restriction", "appeal_decided", "mod_notice"].includes(n.kind)) return "/community/account";
  return null;
}

export default function NotificationsPage() {
  const { setUnread, me } = useCommunity();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const now = useNow();

  useEffect(() => {
    let alive = true;
    get<{ notifications: AppNotification[]; unread: number }>("/notifications?limit=50")
      .then((r) => { if (alive) { setItems(r.notifications); setUnread(r.unread); } })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [setUnread]);
  useCommunityEvents((e) => { if (e.type === "notification.created") setItems((p) => (p ? [e.data.notification, ...p] : p)); });

  async function markAll() {
    const r = await post<{ unread: number }>("/notifications/read", { all: true });
    setItems((p) => (p ?? []).map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnread(r.unread);
  }
  async function open(n: AppNotification) {
    if (!n.readAt) {
      post<{ unread: number }>("/notifications/read", { ids: [n.id] }).then((r) => setUnread(r.unread)).catch(() => undefined);
      setItems((p) => (p ?? []).map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    }
    const to = targetFor(n);
    if (to) router.push(to);
  }

  return (
    <div data-lenis-prevent className="h-full overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-[680px]">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <Eyebrow className="mb-1.5">{copy.brand}</Eyebrow>
            <h1 className="text-[24px] font-semibold tracking-tight text-[#0a0a0a]">{copy.notifications.title}</h1>
          </div>
          {!!me?.unreadNotifications && <SecondaryButton size="sm" onClick={() => void markAll()}>{copy.notifications.markAll}</SecondaryButton>}
        </div>

        {items === null && <Spinner />}
        {items?.length === 0 && (
          <div className="rounded-2xl border border-[#e8e4de] bg-white p-8 text-center">
            <Bell className="mx-auto mb-3 size-6 text-[#6b7280]" aria-hidden />
            <p className="mx-auto max-w-sm text-[14.5px] leading-relaxed text-[#374151]">{copy.notifications.empty}</p>
          </div>
        )}
        <ul className="space-y-2">
          {items?.map((n) => {
            const text = (copy.notifications.kinds[n.kind] ?? (() => "You have a new notification"))(n.payload);
            const unread = !n.readAt;
            return (
              <li key={n.id}>
                <button type="button" onClick={() => void open(n)} className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:border-[#d4cfc9] ${unread ? "border-indigo-200 bg-indigo-50/60" : "border-[#e8e4de] bg-white"}`}>
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${unread ? "bg-indigo-500" : "bg-transparent"}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] leading-relaxed text-[#0a0a0a]">{text}</span>
                    <span className="mt-0.5 block font-mono text-[11px] text-[#6b7280]">{formatAge(Math.max(0, Math.floor((now - new Date(n.createdAt).getTime()) / 60000)))}</span>
                  </span>
                  {unread && <span className="sr-only">unread</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
