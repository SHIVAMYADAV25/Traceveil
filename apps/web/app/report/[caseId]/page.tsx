import { ReportWorkflowProvider } from "@/components/report/ReportWorkflowContext";
import { ReportWorkflowShell } from "@/components/report/ReportWorkflowShell";

export const metadata = {
  title: "Investigation Report — Sniffer",
  description: "Forensic investigation report for NCII leak discovery.",
};

export default async function ReportPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return (
    <ReportWorkflowProvider caseId={caseId}>
      <ReportWorkflowShell />
    </ReportWorkflowProvider>
  );
}