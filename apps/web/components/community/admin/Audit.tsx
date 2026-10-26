"use client";
import { useEffect, useState } from "react";
import { get } from "@/lib/community/api";
import { Spinner, SecondaryButton } from "@/components/community/ui";

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
  if (!entries) return <Spinner />;
  return (
    <div className="space-y-4">
      <p className="text-[13.5px] text-[var(--cm-ink-3)]">A permanent record of role changes, identity lookups, appeals and channel changes. It cannot be edited or deleted.</p>
      <div className="overflow-x-auto rounded-2xl border border-[var(--cm-line)] bg-white">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead><tr className="border-b border-[var(--cm-line)] text-[12.5px] text-[var(--cm-ink-3)]"><th className="px-4 py-3 font-normal">When</th><th className="px-4 py-3 font-normal">Who</th><th className="px-4 py-3 font-normal">What</th><th className="px-4 py-3 font-normal">Reason</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-[var(--cm-hover)] align-top last:border-0">
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12px] text-[var(--cm-ink-2)]">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2.5 font-mono text-[12px]">{e.actor}</td>
                <td className="px-4 py-2.5"><span className="font-medium text-[var(--cm-ink)]">{e.action.replace(/_/g, " ")}</span>{e.target && <span className="block break-all text-[12px] text-[var(--cm-ink-3)]">{e.target}</span>}</td>
                <td className="px-4 py-2.5 text-[var(--cm-ink-2)]">{e.reason ?? ""}</td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--cm-ink-3)]">Nothing recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {more && entries.length > 0 && <SecondaryButton busy={loadingMore} onClick={() => void loadMore()}>Show older entries</SecondaryButton>}
    </div>
  );
}
