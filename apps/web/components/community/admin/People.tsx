"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Search } from "lucide-react";
import { ApiError, get, post } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { formatUntil } from "@/lib/community/format";
import { useCommunity } from "@/lib/community/session";
import { useNow } from "@/lib/community/useNow";
import { Avatar } from "@/components/community/ui/Avatar";
import { Menu, MenuItem } from "@/components/community/ui/Menu";
import { Dialog, Field, Loader, Notice, Pill, PrimaryButton, SecondaryButton, StatusDot, TableCard, TD, TH, TR, TextArea } from "@/components/community/ui/index";

interface Account { id: string; handle: string; role: string; createdAt: string; lastSeenAt: string; activeRestrictions: number }
interface Restriction { id: string; kind: string; reason: string; endsAt: string | null; personaName: string }
const ROLES = [
  { id: "member", label: "Member" }, { id: "verified_helper", label: "Verified helper" }, { id: "moderator", label: "Moderator" }, { id: "admin", label: "Admin" },
];
const TONE: Record<string, "neutral" | "emerald" | "indigo"> = { member: "neutral", verified_helper: "emerald", moderator: "indigo", admin: "indigo" };

export function People() {
  const { showToast } = useCommunity();
  const now = useNow();
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [restrictions, setRestrictions] = useState<Restriction[] | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);
  const [role, setRole] = useState("member");
  const [why, setWhy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lifting, setLifting] = useState<Restriction | null>(null);

  const load = useCallback(async (query: string) => {
    setAccounts((await get<{ accounts: Account[] }>(`/admin/accounts?handle=${encodeURIComponent(query)}&limit=30`)).accounts);
  }, []);
  const loadRestrictions = useCallback(async () => {
    setRestrictions((await get<{ restrictions: Restriction[] }>("/admin/restrictions")).restrictions);
  }, []);
  useEffect(() => {
    let alive = true;
    get<{ accounts: Account[] }>("/admin/accounts?handle=&limit=30").then((r) => { if (alive) setAccounts(r.accounts); }).catch(() => { if (alive) setAccounts([]); });
    get<{ restrictions: Restriction[] }>("/admin/restrictions").then((r) => { if (alive) setRestrictions(r.restrictions); }).catch(() => { if (alive) setRestrictions([]); });
    return () => { alive = false; };
  }, []);

  // Search as you type, after a short pause.
  useEffect(() => {
    const t = setTimeout(() => { get<{ accounts: Account[] }>(`/admin/accounts?handle=${encodeURIComponent(q)}&limit=30`).then((r) => setAccounts(r.accounts)).catch(() => undefined); }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const shown = useMemo(() => (accounts ?? []).filter((a) => roleFilter === "all" || a.role === roleFilter), [accounts, roleFilter]);
  const status = (a: Account) => {
    const day = 24 * 3600 * 1000;
    if (a.activeRestrictions > 0) return <StatusDot tone="rose">Restricted</StatusDot>;
    if (now - new Date(a.createdAt).getTime() < 7 * day) return <StatusDot tone="blue">New</StatusDot>;
    if (now - new Date(a.lastSeenAt).getTime() < 7 * day) return <StatusDot tone="green">Active</StatusDot>;
    return <StatusDot tone="gray">Quiet</StatusDot>;
  };

  async function saveRole() {
    if (!editing) return;
    setError(null);
    try { await post(`/admin/accounts/${editing.id}/role`, { role, reason: why }); setEditing(null); setWhy(""); showToast("Role updated and recorded"); await load(q); }
    catch (e) { setError(e instanceof ApiError ? e.message : copy.errors.generic); }
  }
  async function lift() {
    if (!lifting) return;
    setError(null);
    try { await post(`/admin/restrictions/${lifting.id}/lift`, { reason: why }); setLifting(null); setWhy(""); showToast("Restriction lifted"); await loadRestrictions(); }
    catch (e) { setError(e instanceof ApiError ? e.message : copy.errors.generic); }
  }

  return (
    <div className="space-y-8">
      <section>
        {!accounts ? <Loader label="Finding people" fill={false} /> : (
          <TableCard
            title="All people"
            count={`${shown.length} shown`}
            toolbar={
              <>
                <label className="relative">
                  <span className="sr-only">Handle starts with</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cm-ink-3)]" aria-hidden />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Handle starts with…" className="w-[210px] rounded-full border border-[var(--cm-line-strong)] bg-white/80 py-2 pl-9 pr-3 text-[13.5px] placeholder:text-[var(--cm-ink-3)] focus:border-[var(--cat-accent)] focus:outline-none focus:ring-4 focus:ring-[var(--cat-soft)]" />
                </label>
                <label>
                  <span className="sr-only">Filter by role</span>
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-full border border-[var(--cm-line-strong)] bg-white/80 px-3.5 py-2 text-[13.5px] text-[var(--cm-ink-2)] focus:border-[var(--cat-accent)] focus:outline-none">
                    <option value="all">All roles</option>
                    {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </label>
              </>
            }
          >
            <table className="w-full min-w-[640px]">
              <thead><tr><th className={TH}>Person</th><th className={TH}>Role</th><th className={TH}>Joined</th><th className={TH}>Last seen</th><th className={TH}>Status</th><th className={`${TH} text-right`}><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {shown.map((a) => (
                  <tr key={a.id} className={TR}>
                    <td className={TD}>
                      <span className="flex items-center gap-3">
                        <Avatar seed={a.handle} size={32} label="" />
                        <span className="font-mono text-[13px] text-[var(--cm-ink)]">{a.handle}</span>
                      </span>
                    </td>
                    <td className={TD}><Pill tone={TONE[a.role] ?? "neutral"}>{ROLES.find((r) => r.id === a.role)?.label}</Pill></td>
                    <td className={TD}>{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className={TD}>{new Date(a.lastSeenAt).toLocaleDateString()}</td>
                    <td className={TD}>{status(a)}</td>
                    <td className={`${TD} text-right`}>
                      <Menu label={`Actions for ${a.handle}`} align="right" triggerClassName="rounded-full p-2 text-[var(--cm-ink-3)] transition-colors hover:bg-[var(--cm-hover)] hover:text-[var(--cm-ink)]" trigger={<MoreHorizontal className="size-4" aria-hidden />}>
                        {(close) => <MenuItem icon={<Pencil className="size-4" />} onClick={() => { close(); setEditing(a); setRole(a.role); setWhy(""); setError(null); }}>Change role</MenuItem>}
                      </Menu>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--cm-ink-3)]">No accounts match.</td></tr>}
              </tbody>
            </table>
          </TableCard>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-[16px] font-semibold text-[var(--cm-ink)]">Active restrictions</h3>
        {!restrictions ? <Loader label="Loading" fill={false} /> : restrictions.length === 0 ? <p className="text-[14px] text-[var(--cm-ink-3)]">Nobody is currently restricted.</p> : (
          <ul className="space-y-2">
            {restrictions.map((r) => (
              <li key={r.id} className="cm-glass flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-[var(--cm-ink)]">{r.personaName} <Pill tone="rose" className="ml-1">{copy.account.restrictionKind[r.kind]}</Pill></p>
                  <p className="text-[13px] text-[var(--cm-ink-2)]">{r.reason} · {formatUntil(r.endsAt)}</p>
                </div>
                <SecondaryButton size="sm" onClick={() => { setLifting(r); setWhy(""); setError(null); }}>Lift</SecondaryButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title="Change role">
        <p className="mb-3 font-mono text-[13px] text-[var(--cm-ink-2)]">{editing?.handle}</p>
        <fieldset className="mb-4 space-y-2">
          <legend className="sr-only">Role</legend>
          {ROLES.map((r) => (
            <label key={r.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${role === r.id ? "border-[var(--cat-accent)]" : "border-[var(--cm-line)] bg-[var(--cm-canvas)]"}`}>
              <input type="radio" name="role" checked={role === r.id} onChange={() => setRole(r.id)} className="size-4 accent-[var(--cm-ink)]" />
              <span className="text-[14px] text-[var(--cm-ink)]">{r.label}</span>
            </label>
          ))}
        </fieldset>
        <Field label="Reason (saved in the audit log)" htmlFor="role-why"><TextArea id="role-why" rows={2} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        {error && <div className="mt-3"><Notice tone="red" role="alert">{error}</Notice></div>}
        <div className="mt-4 flex justify-end gap-2"><SecondaryButton onClick={() => setEditing(null)}>Cancel</SecondaryButton><PrimaryButton disabled={why.trim().length < 5 || role === editing?.role} onClick={() => void saveRole()}>Save role</PrimaryButton></div>
      </Dialog>

      <Dialog open={lifting !== null} onClose={() => setLifting(null)} title="Lift this restriction">
        <p className="mb-3 text-[14px] text-[var(--cm-ink-2)]">{lifting?.personaName} will be told that the restriction was lifted.</p>
        <Field label="Reason" htmlFor="lift-why"><TextArea id="lift-why" rows={2} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        {error && <div className="mt-3"><Notice tone="red" role="alert">{error}</Notice></div>}
        <div className="mt-4 flex justify-end gap-2"><SecondaryButton onClick={() => setLifting(null)}>Cancel</SecondaryButton><PrimaryButton disabled={why.trim().length < 3} onClick={() => void lift()}>Lift restriction</PrimaryButton></div>
      </Dialog>
    </div>
  );
}
