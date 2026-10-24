"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Appeals } from "@/components/community/admin/Appeals";
import { Audit } from "@/components/community/admin/Audit";
import { Overview } from "@/components/community/admin/Overview";
import { People } from "@/components/community/admin/People";
import { Rooms } from "@/components/community/admin/Rooms";
import { ConsoleHeader } from "@/components/community/mod/ConsoleHeader";
import { Notice, Spinner } from "@/components/community/ui";
import { useCommunity } from "@/lib/community/session";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "people", label: "People and roles" },
  { id: "rooms", label: "Spaces and rooms" },
  { id: "appeals", label: "Appeals" },
  { id: "audit", label: "Audit log" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function AdminInner() {
  const { isAdmin, phase } = useCommunity();
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("tab");
  const tab: Tab = TABS.some((t) => t.id === requested) ? (requested as Tab) : "overview";

  if (phase === "ready" && !isAdmin) return <div className="mx-auto max-w-md p-8"><Notice tone="rose" title="This area is for admins">You do not have access to admin tools.</Notice></div>;

  return (
    <div className="flex h-full flex-col">
      <ConsoleHeader label="Admin console" />
      <div role="tablist" aria-label="Admin sections" className="flex gap-1 overflow-x-auto border-b border-[#e8e4de] bg-white px-3 py-2 sm:px-6">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => router.replace(`/community/admin?tab=${t.id}`)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${tab === t.id ? "bg-[#0a0a0a] text-white" : "text-[#374151] hover:bg-[#f0ede8]"}`}>{t.label}</button>
        ))}
      </div>
      <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto bg-[#fafaf8] px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-[920px]">
          {tab === "overview" && <Overview />}
          {tab === "people" && <People />}
          {tab === "rooms" && <Rooms />}
          {tab === "appeals" && <Appeals />}
          {tab === "audit" && <Audit />}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return <Suspense fallback={<Spinner />}><AdminInner /></Suspense>;
}
