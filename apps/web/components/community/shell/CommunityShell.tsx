"use client";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Loader } from "@/components/community/ui/index";
import { themeFor, themeVars } from "@/lib/community/channelTheme";
import { get } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { useCommunity, useCommunityEvents } from "@/lib/community/session";
import { FrameBanner } from "./FrameBanner";
import { routeHeader } from "./routeHeader";
import { ShellProvider } from "./ShellContext";
import { Sidebar, spaceSlugFromPath } from "./Sidebar";
import { TopHeader } from "./TopHeader";

/**
 * The one big component for the signed-in Community: sidebar and top header make an L-shaped frame in the
 * current group's colours, and the screen sits in a rounded panel set into its corner. Moving between channels
 * or pages changes only what is inside the panel (and the words in the header); the frame is never rebuilt.
 * It also guards the area, sending people who are signed out, not set up, or locked out to the right place.
 */
export function CommunityShell({ children }: { children: ReactNode }) {
  const { phase, me, isStaff, isLockedOut, spaces } = useCommunity();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openReports, setOpenReports] = useState(0);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const theme = themeFor(spaceSlugFromPath(pathname));
  const header = useMemo(() => routeHeader(pathname, spaces), [pathname, spaces]);

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

  // Close the phone drawer when the screen changes.
  useEffect(() => { const t = setTimeout(() => setSidebarOpen(false), 0); return () => clearTimeout(t); }, [pathname]);

  if (phase === "loading" || !me || (!me.onboardingComplete && pathname !== "/community/onboarding")) {
    return <div className="h-dvh bg-[var(--cm-canvas)]"><Loader label="Opening the Community" /></div>;
  }

  const showSidebar = !isLockedOut;
  return (
    <ShellProvider value={{ openSidebar: () => setSidebarOpen(true), actionsSlot: slot }}>
      <div style={themeVars(theme)} className="cm-themed relative flex h-dvh overflow-hidden bg-[var(--cm-frame)]">
        <FrameBanner src={theme.banner} />
        {showSidebar && <aside className="relative z-10 hidden w-[296px] shrink-0 md:block"><Sidebar openReports={openReports} /></aside>}
        <div className="relative z-10 flex min-w-0 flex-1 flex-col">
          <TopHeader info={header} onOpenSidebar={() => setSidebarOpen(true)} setSlot={setSlot} />
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[22px] border border-[var(--cm-frame-line)] bg-[var(--cm-panel)] shadow-[var(--cm-shadow)] transition-colors duration-500 md:mb-2 md:mr-2 md:rounded-[26px]">
            {children}
          </main>
        </div>
      </div>

      {/* The phone drawer stays mounted so it can slide both ways. */}
      {showSidebar && (
        <div style={themeVars(theme)} className={`cm-themed fixed inset-0 z-50 md:hidden ${sidebarOpen ? "" : "pointer-events-none"}`} aria-hidden={!sidebarOpen} inert={!sidebarOpen}>
          <div onClick={() => setSidebarOpen(false)} className={`absolute inset-0 bg-[#1f2a27]/35 backdrop-blur-[2px] transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0"}`} />
          <div className={`absolute inset-y-0 left-0 w-[min(88vw,330px)] overflow-hidden bg-[var(--cm-frame)] shadow-[var(--cm-shadow)] transition-transform duration-300 ease-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
            <FrameBanner src={theme.banner} height={160} />
            <button type="button" aria-label={copy.rail.closeRooms} onClick={() => setSidebarOpen(false)} className="absolute right-2 top-2 z-30 rounded-full bg-white/80 p-2 text-[var(--cm-ink-2)] hover:bg-white"><X className="size-4" /></button>
            <div className="relative z-10 h-full"><Sidebar openReports={openReports} onNavigate={() => setSidebarOpen(false)} /></div>
          </div>
        </div>
      )}
    </ShellProvider>
  );
}
