"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard } from "lucide-react";
import { AdminNav } from "@/components/community/admin/AdminNav";
import { StatsProvider, type AdminStats } from "@/components/community/admin/StatsContext";
import { PageHeader } from "@/components/community/shell/PageHeader";
import { Notice } from "@/components/community/ui";
import { get } from "@/lib/community/api";
import { useCommunity } from "@/lib/community/session";

const TITLES: Array<[string, string, string]> = [
  ["/community/admin/people", "People and roles", "Who is on the team, and who is a verified helper."],
  ["/community/admin/rooms", "Channels", "The groups and channels members see."],
  ["/community/admin/appeals", "Appeals", "Decisions people have asked to be reviewed."],
  ["/community/admin/audit", "Audit log", "A permanent record of team actions."],
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAdmin, phase } = useCommunity();
  const pathname = usePathname();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    get<AdminStats>("/admin/stats").then((s) => { if (alive) setStats(s); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [isAdmin, pathname]);

  if (phase === "ready" && !isAdmin) {
    return <div className="mx-auto max-w-md p-8"><Notice tone="rose" title="This area is for admins">You do not have access to admin tools.</Notice></div>;
  }
  const [, title, description] = TITLES.find(([p]) => pathname.startsWith(p)) ?? ["", "Admin", "Overview of the Community."];
  return (
    <StatsProvider value={{ stats, failed }}>
      <PageHeader icon={LayoutDashboard} title={title} description={description} accent />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <AdminNav />
        <div data-lenis-prevent className="cm-scroll min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-[980px]">{children}</div>
        </div>
      </div>
    </StatsProvider>
  );
}
