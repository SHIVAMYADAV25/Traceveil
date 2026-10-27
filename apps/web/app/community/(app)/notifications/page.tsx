"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AtSign, BadgeCheck, Bell, CheckCheck, CheckCircle2, ChevronRight, CornerUpLeft, Flag, Info, Scale, ShieldAlert, Siren, type LucideIcon } from "lucide-react";
import { HeaderActions } from "@/components/community/shell/ShellContext";
import { Loader, SecondaryButton } from "@/components/community/ui/index";
import { get, post } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { formatAge } from "@/lib/community/format";
import { useCommunity, useCommunityEvents } from "@/lib/community/session";
import { useNow } from "@/lib/community/useNow";
import type { AppNotification } from "@/lib/community/types";

type Tone = "sage" | "blue" | "amber" | "rose" | "lavender";
const KIND: Record<string, { icon: LucideIcon; tone: Tone }> = {
  mention: { icon: AtSign, tone: "lavender" },
  reply: { icon: CornerUpLeft, tone: "blue" },
  report_result: { icon: CheckCircle2, tone: "sage" },
  mod_notice: { icon: Info, tone: "amber" },
  restriction: { icon: ShieldAlert, tone: "rose" },
  appeal_decided: { icon: Scale, tone: "sage" },
  report_new: { icon: Flag, tone: "amber" },
  report_escalated: { icon: Siren, tone: "rose" },
  appeal_new: { icon: Scale, tone: "amber" },
  role_changed: { icon: BadgeCheck, tone: "sage" },
};
const TILE: Record<Tone, string> = {
  sage: "bg-[#e3eee9] text-[#3e6b60]", blue: "bg-[#e2eef3] text-[#32576b]", amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700", lavender: "bg-[#ece9f5] text-[#554a82]",
};

/** Where a notification leads. Replies and mentions go to the exact message. */
function targetFor(n: AppNotification): string | null {
  const p = n.payload;
  if ((n.kind === "mention" || n.kind === "reply") && p.spaceSlug && p.roomSlug) {
    return `/community/${String(p.spaceSlug)}/${String(p.roomSlug)}${p.messageId ? `?m=${String(p.messageId)}` : ""}`;
  }
  if (n.kind === "report_new" || n.kind === "report_escalated") return `/community/moderation?report=${String(p.reportId ?? "")}`;
  if (n.kind === "appeal_new") return "/community/admin/appeals";
  if (["restriction", "appeal_decided", "mod_notice"].includes(n.kind)) return "/community/account";
  return null;
}

const GO: Record<string, string> = { mention: "Open the message", reply: "Open the message", report_new: "Open the report", report_escalated: "Open the report", appeal_new: "Open appeals", restriction: "See your access", appeal_decided: "See your account", mod_notice: "See your account" };

export default function NotificationsPage() {
  const { setUnread, me } = useCommunity();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [view, setView] = useState<"all" | "unread">("all");
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

  const shown = useMemo(() => (items ?? []).filter((n) => view === "all" || !n.readAt), [items, view]);
  const groups = useMemo(() => {
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    const today = shown.filter((n) => new Date(n.createdAt).getTime() >= startOfToday.getTime());
    return [{ label: "Today", rows: today }, { label: "Earlier", rows: shown.filter((n) => !today.includes(n)) }].filter((g) => g.rows.length > 0);
  }, [shown, now]);
  const unreadCount = me?.unreadNotifications ?? 0;

  return (
    <>
      <HeaderActions>
        {unreadCount > 0 && <SecondaryButton size="sm" onClick={() => void markAll()} className="!bg-white/70"><CheckCheck className="size-4" aria-hidden />{copy.notifications.markAll}</SecondaryButton>}
      </HeaderActions>
      <div data-lenis-prevent className="cm-scroll min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-[720px]">
          <div role="tablist" aria-label="Show" className="mb-5 inline-flex rounded-full bg-[var(--cm-hover)] p-1">
            {([["all", "All"], ["unread", `Unread${unreadCount ? ` (${unreadCount})` : ""}`]] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)}
                className={`rounded-full px-4 py-1.5 text-[13.5px] font-medium transition-all duration-200 ${view === id ? "bg-white text-[var(--cm-ink)] shadow-sm" : "text-[var(--cm-ink-3)] hover:text-[var(--cm-ink)]"}`}>{label}</button>
            ))}
          </div>

          {items === null && <Loader label="Looking for news" fill={false} />}

          {items !== null && groups.length === 0 && (
            <div className="px-4 py-16 text-center">
              <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[var(--cat-soft)] text-[var(--cat-accent)]"><Bell className="size-6" aria-hidden /></span>
              <p className="text-[15.5px] font-medium text-[var(--cm-ink)]">{view === "unread" ? "You are all caught up" : "Nothing new"}</p>
              <p className="mx-auto mt-1 max-w-xs text-[14px] leading-relaxed text-[var(--cm-ink-3)]">{view === "unread" ? "There is nothing you have not seen." : copy.notifications.empty}</p>
            </div>
          )}

          {groups.map((g) => (
            <section key={g.label} className="mb-6" aria-label={g.label}>
              <h2 className="mb-2 px-1 text-[12.5px] font-medium text-[var(--cm-ink-3)]">{g.label}</h2>
              <ul className="space-y-1.5">
                {g.rows.map((n) => {
                  const k = KIND[n.kind] ?? { icon: Bell, tone: "sage" as Tone };
                  const text = copy.notifications.kinds[n.kind]?.(n.payload) ?? "Something happened";
                  const to = targetFor(n);
                  const mins = Math.max(0, Math.floor((now - new Date(n.createdAt).getTime()) / 60000));
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => void open(n)}
                        className={`group flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-px hover:border-[var(--cat-accent)]/40 hover:bg-white hover:shadow-[0_8px_20px_-14px_rgb(31_42_39/0.4)] ${n.readAt ? "border-transparent bg-transparent" : "border-[var(--cat-accent)]/20 bg-[var(--cat-soft)]/50"}`}
                      >
                        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${TILE[k.tone]}`}><k.icon className="size-5" aria-hidden /></span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-[15px] leading-snug ${n.readAt ? "text-[var(--cm-ink-2)]" : "font-medium text-[var(--cm-ink)]"}`}>{text}</span>
                          <span className="mt-0.5 flex items-center gap-2 text-[12.5px] text-[var(--cm-ink-3)]">
                            <span>{formatAge(mins)}</span>
                            {to && <span className="opacity-0 transition-opacity group-hover:opacity-100">· {GO[n.kind] ?? "Open"}</span>}
                          </span>
                        </span>
                        {!n.readAt && <span className="size-2.5 shrink-0 rounded-full bg-[var(--cat-accent)]"><span className="sr-only">Unread</span></span>}
                        {to && <ChevronRight className="size-4 shrink-0 text-[var(--cm-ink-3)] transition-transform group-hover:translate-x-0.5" aria-hidden />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
