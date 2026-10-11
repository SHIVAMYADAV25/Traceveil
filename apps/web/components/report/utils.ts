export function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-IN", { dateStyle: "long" });
}

export function buildCaseRef(caseId: string): string {
  return `SNF-${caseId.slice(0, 4).toUpperCase()}-${caseId.slice(4, 8).toUpperCase()}-${caseId.slice(9, 13).toUpperCase()}`;
}