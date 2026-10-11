"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CaseData } from "@/components/report/types";
import { buildCaseRef } from "@/components/report/utils";

interface ReportWorkflowContextValue {
  caseId: string;
  caseData: CaseData | null;
  suspiciousImg: string | null;
  loading: boolean;
  fetchError: string | null;
  isCaseSaved: boolean;
  isSaving: boolean;
  saveSent: boolean;
  saveEmail: string;
  sessionUserId: string | undefined;
  setSaveEmail: (email: string) => void;
  handleSendMagicLink: (e: React.FormEvent) => Promise<void>;
  handleSaveCase: () => Promise<void>;
}

const ReportWorkflowContext = createContext<ReportWorkflowContextValue | null>(null);

export function ReportWorkflowProvider({
  caseId,
  children,
}: {
  caseId: string;
  children: React.ReactNode;
}) {
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [suspiciousImg, setSuspiciousImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveEmail, setSaveEmail] = useState("");
  const [saveSent, setSaveSent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCaseSaved, setIsCaseSaved] = useState(false);

  const sessionUserId: string | undefined = undefined;

  useEffect(() => {
    if (!caseId) return;

    setSuspiciousImg(sessionStorage.getItem(`sniffer_suspicious_${caseId}`));

    setLoading(true);
    setFetchError(null);

    fetch(`/api/cases/${caseId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Case not found");
        return r.json() as Promise<CaseData>;
      })
      .then((c) => setCaseData(c))
      .catch((e: unknown) => {
        setCaseData(null);
        setFetchError(e instanceof Error ? e.message : "Failed to load report");
      })
      .finally(() => setLoading(false));
  }, [caseId]);

  const handleSendMagicLink = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSent(true);
    void saveEmail;
  }, [saveEmail]);

  const handleSaveCase = useCallback(async () => {
    if (!caseData) return;
    setIsSaving(true);
    await fetch("/api/cases/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId,
        domain: caseData.platform_source,
        caseRef: buildCaseRef(caseId),
      }),
    });
    setIsCaseSaved(true);
    setIsSaving(false);
  }, [caseId, caseData]);

  const value = useMemo<ReportWorkflowContextValue>(
    () => ({
      caseId,
      caseData,
      suspiciousImg,
      loading,
      fetchError,
      isCaseSaved,
      isSaving,
      saveSent,
      saveEmail,
      sessionUserId,
      setSaveEmail,
      handleSendMagicLink,
      handleSaveCase,
    }),
    [caseId, caseData, suspiciousImg, loading, fetchError, isCaseSaved, isSaving, saveSent, saveEmail, sessionUserId, handleSendMagicLink, handleSaveCase],
  );

  return <ReportWorkflowContext.Provider value={value}>{children}</ReportWorkflowContext.Provider>;
}

export function useReportWorkflow() {
  const ctx = useContext(ReportWorkflowContext);
  if (!ctx) throw new Error("useReportWorkflow must be used within ReportWorkflowProvider");
  return ctx;
}