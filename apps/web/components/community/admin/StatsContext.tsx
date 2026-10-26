"use client";
import { createContext, useContext } from "react";

export interface AdminStats {
  accounts: number; activeLast7Days: number; messagesLast24Hours: number; openReports: number;
  urgentOpenReports: number; openAppeals: number; averageHoursToResolve: number | null;
}
interface Value { stats: AdminStats | null; failed: boolean }

const StatsContext = createContext<Value>({ stats: null, failed: false });
export const StatsProvider = StatsContext.Provider;
export const useAdminStats = (): Value => useContext(StatsContext);
