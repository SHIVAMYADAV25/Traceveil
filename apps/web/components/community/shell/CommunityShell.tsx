"use client";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Spinner } from "@/components/community/ui";
import { themeFor, themeVars } from "@/lib/community/channelTheme";
import { get } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { useCommunity, useCommunityEvents } from "@/lib/community/session";
import { ShellProvider } from "./ShellContext";
import { Sidebar, spaceSlugFromPath } from "./Sidebar";

/**
 * The signed-in shell: sidebar on the left, the current screen on the right. It also guards the area:
 * people who are not signed in, have not finished setting up, or are locked out are sent to the right
 * place, and nothing else is shown until they are. On phones the sidebar slides in over the screen.
 */
export function CommunityShell({ children }: { children: ReactNode }) {
  const { phase, me, isStaff, isLockedOut } = useCommunity();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openReports, setOpenReports] = useState(0);
  const theme = themeFor(spaceSlugFromPath(pathname));

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

  // Close the phone sidebar when the screen changes.
  useEffect(() => { const t = setTimeout(() => setSidebarOpen(false), 0); return () => clearTimeout(t); }, [pathname]);

  if (phase === "loading" || !me || (!me.onboardingComplete && pathname !== "/community/onboarding")) {
    return <div className="min-h-dvh bg-[var(--cm-canvas)]"><Spinner /></div>;
  }

  const showSidebar = !isLockedOut;
  return (
    <ShellProvider value={{ openSidebar: () => setSidebarOpen(true) }}>
      <div style={themeVars(theme)} className="flex h-dvh overflow-hidden bg-[var(--cm-canvas)]">
        {showSidebar && <aside className="hidden w-[288px] shrink-0 border-r border-[var(--cm-line)] md:block"><Sidebar openReports={openReports} /></aside>}
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>

      {showSidebar && sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden" style={themeVars(theme)}>
          <div className="absolute inset-0 bg-[#1f2a27]/35 backdrop-blur-[2px]" onClick={() => setSidebarOpen(false)} aria-hidden />
          <div className="cm-pop absolute inset-y-0 left-0 w-[min(88vw,320px)] shadow-[var(--cm-shadow)]" style={{ ["--cm-pop-from" as string]: "0px" }}>
            <button type="button" aria-label={copy.rail.closeRooms} onClick={() => setSidebarOpen(false)} className="absolute right-2 top-2 z-10 rounded-full bg-white/80 p-2 text-[var(--cm-ink-2)] hover:bg-white"><X className="size-4" /></button>
            <Sidebar openReports={openReports} onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}
    </ShellProvider>
  );
}
