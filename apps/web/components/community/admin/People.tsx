"use client";
import { useCallback, useEffect, useState } from "react";
import { ApiError, get, post } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { formatUntil } from "@/lib/community/format";
import { useCommunity } from "@/lib/community/session";
import { Dialog, Field, Notice, Pill, PrimaryButton, SecondaryButton, Spinner, TextArea, TextInput } from "@/components/community/ui";

interface Account { id: string; handle: string; role: string; createdAt: string; lastSeenAt: string; activeRestrictions: number }
interface Restriction { id: string; kind: string; reason: string; endsAt: string | null; personaName: string }
const ROLES = [
  { id: "member", label: "Member" }, { id: "verified_helper", label: "Verified helper" }, { id: "moderator", label: "Moderator" }, { id: "admin", label: "Admin" },
];
const TONE: Record<string, "neutral" | "emerald" | "indigo"> = { member: "neutral", verified_helper: "emerald", moderator: "indigo", admin: "indigo" };

export function People() {
  const { showToast } = useCommunity();
  const [q, setQ] = useState("");
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
        <h2 className="mb-1 text-[16px] font-semibold text-[var(--cm-ink)]">People and roles</h2>
        <p className="mb-4 text-[13.5px] text-[var(--cm-ink-3)]">Search by handle. Made-up names are deliberately not searchable here, so this page cannot be used to find out who someone is.</p>
        <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); void load(q); }}>
          <TextInput aria-label="Handle starts with" placeholder="Handle starts with…" value={q} onChange={(e) => setQ(e.target.value)} />
          <PrimaryButton type="submit">Search</PrimaryButton>
        </form>
        {!accounts ? <Spinner /> : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--cm-line)] bg-white">
            <table className="w-full min-w-[560px] text-left text-[13.5px]">
              <thead><tr className="border-b border-[var(--cm-line)] text-[12.5px] text-[var(--cm-ink-3)]"><th className="px-4 py-3 font-normal">Handle</th><th className="px-4 py-3 font-normal">Role</th><th className="px-4 py-3 font-normal">Joined</th><th className="px-4 py-3 font-normal">Last seen</th><th className="px-4 py-3" /></tr></thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--cm-hover)] last:border-0">
                    <td className="px-4 py-2.5 font-mono text-[13px]">{a.handle}{a.activeRestrictions > 0 && <Pill tone="rose" className="ml-2">Restricted</Pill>}</td>
                    <td className="px-4 py-2.5"><Pill tone={TONE[a.role] ?? "neutral"}>{ROLES.find((r) => r.id === a.role)?.label}</Pill></td>
                    <td className="px-4 py-2.5 text-[var(--cm-ink-2)]">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-[var(--cm-ink-2)]">{new Date(a.lastSeenAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-right"><SecondaryButton size="sm" onClick={() => { setEditing(a); setRole(a.role); setWhy(""); setError(null); }}>Change role</SecondaryButton></td>
                  </tr>
                ))}
                {accounts.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--cm-ink-3)]">No accounts match.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-[16px] font-semibold text-[var(--cm-ink)]">Active restrictions</h2>
        {!restrictions ? <Spinner /> : restrictions.length === 0 ? <p className="text-[14px] text-[var(--cm-ink-3)]">Nobody is currently restricted.</p> : (
          <ul className="space-y-2">
            {restrictions.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--cm-line)] bg-white px-4 py-3">
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
