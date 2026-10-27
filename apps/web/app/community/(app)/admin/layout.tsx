"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AdminNav } from "@/components/community/admin/AdminNav";
import { StatsProvider, type AdminSeries, type AdminStats } from "@/components/community/admin/StatsContext";
import { Notice, PageIntro } from "@/components/community/ui/index";
import { get } from "@/lib/community/api";
import { useCommunity } from "@/lib/community/session";

const PAGES: Array<[string, string, string]> = [
  ["/community/admin/people", "People and roles", "Search by handle, change roles, and lift restrictions. Made-up names are deliberately not searchable."],
  ["/community/admin/rooms", "Channels", "The groups and channels members see. Changes appear straight away."],
  ["/community/admin/appeals", "Appeals", "Decisions people have asked to be reviewed by someone else."],
  ["/community/admin/audit", "Audit log", "A permanent record of team actions. It cannot be edited or deleted."],
];

/**
 * Everything under /community/admin. The sidebar and top header come from the shell and stay put; this adds the
 * section navigation and loads the overview counts once, so moving between sections does not refetch them.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAdmin, phase } = useCommunity();
  const pathname = usePathname();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [series, setSeries] = useState<AdminSeries | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    get<AdminStats>("/admin/stats").then((s) => { if (alive) setStats(s); }).catch(() => { if (alive) setFailed(true); });
    get<AdminSeries>("/admin/stats/series").then((s) => { if (alive) setSeries(s); }).catch(() => undefined);
    return () => { alive = false; };
  }, [isAdmin, pathname]);

  if (phase === "ready" && !isAdmin) {
    return <div className="mx-auto max-w-md p-8"><Notice tone="rose" title="This area is for admins">You do not have access to admin tools.</Notice></div>;
  }
  const page = PAGES.find(([p]) => pathname.startsWith(p));
  return (
    <StatsProvider value={{ stats, series, failed }}>
      <div className="cm-wash flex min-h-0 flex-1 flex-col md:flex-row">
        <AdminNav />
        <div data-lenis-prevent className="cm-scroll min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-7">
          <div className="mx-auto max-w-[1040px]">
            {page && <PageIntro trail={[{ label: "Admin", href: "/community/admin" }, { label: page[1] }]} title={page[1]} subtitle={page[2]} />}
            {children}
          </div>
        </div>
      </div>
    </StatsProvider>
  );
}
