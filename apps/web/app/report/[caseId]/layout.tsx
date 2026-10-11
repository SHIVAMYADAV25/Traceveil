import { ReportWorkflowProvider } from "@/components/report/ReportWorkflowContext";
import { ReportWorkflowShell } from "@/components/report/ReportWorkflowShell";

export default async function ReportCaseLayout({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;

  return (
    <ReportWorkflowProvider caseId={caseId}>
      <ReportWorkflowShell />
    </ReportWorkflowProvider>
  );
}