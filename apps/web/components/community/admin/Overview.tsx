"use client";
import { useEffect, useState } from "react";
import { get } from "@/lib/community/api";
import { Notice, Spinner } from "../ui";

interface Stats { accounts: number; activeLast7Days: number; messagesLast24Hours: number; openReports: number; urgentOpenReports: number; openAppeals: number; averageHoursToResolve: number | null }

export function Overview() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => { get<Stats>("/admin/stats").then(setS).catch(() => setS(null)); }, []);
  if (!s) return <Spinner />;
  const cards: Array<{ label: string; value: string | number; note?: string; alert?: boolean }> = [
    { label: "Members", value: s.accounts },
    { label: "Active in the last 7 days", value: s.activeLast7Days },
    { label: "Messages in the last 24 hours", value: s.messagesLast24Hours },
    { label: "Reports waiting", value: s.openReports },
    { label: "Urgent reports waiting", value: s.urgentOpenReports, alert: s.urgentOpenReports > 0 },
    { label: "Appeals waiting", value: s.openAppeals, alert: s.openAppeals > 0 },
    { label: "Average time to resolve a report", value: s.averageHoursToResolve === null ? "No data yet" : `${s.averageHoursToResolve} h`, note: "Last 30 days" },
  ];
  return (
    <div className="space-y-4">
      {s.urgentOpenReports > 0 && <Notice tone="rose" title="Urgent reports are waiting">Open the moderation console to review them first.</Notice>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-2xl border p-4 ${c.alert ? "border-rose-200 bg-rose-50" : "border-[#e8e4de] bg-white"}`}>
            <p className="font-mono text-[10.5px] uppercase tracking-widest text-[#6b7280]">{c.label}</p>
            <p className={`mt-2 text-[28px] font-semibold tracking-tight ${c.alert ? "text-rose-700" : "text-[#0a0a0a]"}`}>{c.value}</p>
            {c.note && <p className="text-[12.5px] text-[#6b7280]">{c.note}</p>}
          </div>
        ))}
      </div>
      <p className="text-[13px] text-[#6b7280]">These are counts only. Nothing on this page can show what anyone wrote.</p>
    </div>
  );
}
