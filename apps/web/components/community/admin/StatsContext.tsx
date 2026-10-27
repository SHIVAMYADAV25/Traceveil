"use client";
import { createContext, useContext } from "react";

export interface AdminStats {
  accounts: number; activeLast7Days: number; messagesLast24Hours: number; openReports: number;
  urgentOpenReports: number; openAppeals: number; averageHoursToResolve: number | null;
}
/** Counts per day for the last 14 days, oldest first. */
export interface AdminSeries { days: string[]; members: number[]; messages: number[]; reports: number[]; appeals: number[] }
interface Value { stats: AdminStats | null; series: AdminSeries | null; failed: boolean }

const StatsContext = createContext<Value>({ stats: null, series: null, failed: false });
export const StatsProvider = StatsContext.Provider;
export const useAdminStats = (): Value => useContext(StatsContext);

/** This week against last week, from a 14-day series. `null` when last week was empty, so no misleading percentage is shown. */
export function weekDelta(values: number[]): { pct: number | null; now: number; before: number } {
  const before = values.slice(0, 7).reduce((a, b) => a + b, 0);
  const now = values.slice(7).reduce((a, b) => a + b, 0);
  return { pct: before === 0 ? null : Math.round(((now - before) / before) * 100), now, before };
}
