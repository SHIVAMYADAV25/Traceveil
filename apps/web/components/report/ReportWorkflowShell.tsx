"use client";

import Link from "next/link";
import { NCIIReportLayout } from "@/components/report/NCIIReportLayout";
import { useReportWorkflow } from "@/components/report/ReportWorkflowContext";

export function ReportWorkflowShell() {
  const {
    caseId,
    caseData,
    suspiciousImg,
    loading,
    fetchError,
    isCaseSaved,
    isSaving,
    saveSent,
    saveEmail,
    setSaveEmail,
    handleSendMagicLink,
    handleSaveCase,
    sessionUserId,
  } = useReportWorkflow();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#e8e4de] border-t-[#0a0a0a] rounded-full animate-spin mx-auto mb-5" />
          <p className="text-[13px] text-[#6b7280] font-mono tracking-wider">Loading report…</p>
        </div>
      </div>
    );
  }

  if (fetchError || !caseData) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" fill="none" stroke="#dc2626" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-[#0a0a0a] mb-1">Report unavailable</p>
          <p className="text-[13px] text-[#6b7280] mb-5">{fetchError ?? "The requested case could not be found."}</p>
          <Link href="/leak" className="inline-flex items-center gap-2 text-[13px] font-medium text-[#0a0a0a] hover:underline">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            New Investigation
          </Link>
        </div>
      </div>
    );
  }

  return (
    <NCIIReportLayout
      caseId={caseId}
      caseData={caseData}
      suspiciousImg={suspiciousImg}
      isCaseSaved={isCaseSaved}
      isSaving={isSaving}
      saveSent={saveSent}
      saveEmail={saveEmail}
      onSaveEmailChange={setSaveEmail}
      onSendMagicLink={handleSendMagicLink}
      onSaveCase={handleSaveCase}
      sessionUserId={sessionUserId}
    />
  );
}