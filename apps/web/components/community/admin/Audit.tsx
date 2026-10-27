"use client";
import { useEffect, useState } from "react";
import { get } from "@/lib/community/api";
import { Loader, SecondaryButton, TableCard, TD, TH, TR } from "@/components/community/ui/index";

interface Entry { id: string; action: string; target: string | null; reason: string | null; actor: string; createdAt: string }

export function Audit() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [more, setMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => { get<{ entries: Entry[] }>("/admin/audit?limit=50").then((r) => { setEntries(r.entries); setMore(r.entries.length === 50); }).catch(() => setEntries([])); }, []);

  async function loadMore() {
    const last = entries?.[entries.length - 1];
    if (!last) return;
    setLoadingMore(true);
    try { const r = await get<{ entries: Entry[] }>(`/admin/audit?limit=50&before=${last.id}`); setEntries((p) => [...(p ?? []), ...r.entries]); setMore(r.entries.length === 50); } finally { setLoadingMore(false); }
  }
  if (!entries) return <Loader label="Reading the record" fill={false} />;
  return (
    <div className="space-y-4">
      <TableCard title="Team actions" count={`${entries.length} shown`}>
        <table className="w-full min-w-[640px]">
          <thead><tr><th className={TH}>When</th><th className={TH}>Who</th><th className={TH}>What</th><th className={TH}>Reason</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className={`${TR} align-top`}>
                <td className={`${TD} whitespace-nowrap font-mono text-[12px]`}>{new Date(e.createdAt).toLocaleString()}</td>
                <td className={`${TD} font-mono text-[12px]`}>{e.actor}</td>
                <td className={TD}><span className="font-medium text-[var(--cm-ink)]">{e.action.replace(/_/g, " ")}</span>{e.target && <span className="block break-all text-[12px] text-[var(--cm-ink-3)]">{e.target}</span>}</td>
                <td className={TD}>{e.reason ?? ""}</td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-[var(--cm-ink-3)]">Nothing recorded yet.</td></tr>}
          </tbody>
        </table>
      </TableCard>
      {more && entries.length > 0 && <SecondaryButton busy={loadingMore} onClick={() => void loadMore()}>Show older entries</SecondaryButton>}
    </div>
  );
}
