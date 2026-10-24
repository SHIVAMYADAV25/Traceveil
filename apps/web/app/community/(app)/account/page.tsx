"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import { Avatar } from "@/components/community/Avatar";
import { DangerButton, Eyebrow, Field, Notice, Pill, PrimaryButton, SecondaryButton, Spinner, TextArea, TextInput } from "@/components/community/ui";
import { ApiError, del, get, patch, post, put } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { formatUntil } from "@/lib/community/format";
import { useCommunity } from "@/lib/community/session";

interface MyRestriction { id: string; kind: "room_mute" | "suspend" | "ban"; reason: string; endsAt: string | null; appealStatus: string | null }
interface BlockedPerson { personaId: string; displayName: string; avatarSeed: string }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e8e4de] bg-white p-5 sm:p-6">
      <h2 className="mb-4 text-[15px] font-semibold text-[#0a0a0a]">{title}</h2>
      {children}
    </section>
  );
}

export default function AccountPage() {
  const { me, reloadMe, signOut, showToast, isLockedOut } = useCommunity();
  const router = useRouter();
  const a = copy.account;
  const [restrictions, setRestrictions] = useState<MyRestriction[] | null>(null);
  const [blocked, setBlocked] = useState<BlockedPerson[] | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passError, setPassError] = useState<string | null>(null);
  const [appealFor, setAppealFor] = useState<string | null>(null);
  const [appealText, setAppealText] = useState("");
  const [appealError, setAppealError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setRestrictions((await get<{ restrictions: MyRestriction[] }>("/restrictions/mine")).restrictions); } catch { setRestrictions([]); }
    if (!isLockedOut) { try { setBlocked((await get<{ blocked: BlockedPerson[] }>("/blocks")).blocked); } catch { setBlocked([]); } }
  }, [isLockedOut]);
  useEffect(() => { void load(); }, [load]);

  if (!me) return <Spinner />;
  const current = name ?? me.persona.displayName;
  const err = (e: unknown) => (e instanceof ApiError ? e.message : copy.errors.generic);

  async function saveName() {
    setBusy("name"); setNameError(null);
    try { await patch("/me/persona", { displayName: current }); await reloadMe(); setName(null); showToast(a.nameSaved); }
    catch (e) { setNameError(err(e)); } finally { setBusy(null); }
  }
  async function newPicture() {
    setBusy("avatar");
    try { await patch("/me/persona", { newAvatar: true }); await reloadMe(); } catch (e) { showToast(err(e)); } finally { setBusy(null); }
  }
  async function savePassword() {
    setBusy("password"); setPassError(null);
    try { await put("/me/password", { password }); setPassword(""); showToast(a.passwordSaved); }
    catch (e) { setPassError(err(e)); } finally { setBusy(null); }
  }
  async function unblock(id: string) {
    try { await del(`/blocks/${id}`); setBlocked((b) => (b ?? []).filter((x) => x.personaId !== id)); } catch (e) { showToast(err(e)); }
  }
  async function sendAppeal() {
    if (!appealFor) return;
    setBusy("appeal"); setAppealError(null);
    try { await post("/appeals", { restrictionId: appealFor, body: appealText }); setAppealFor(null); setAppealText(""); showToast(a.appealSent); await load(); }
    catch (e) { setAppealError(err(e)); } finally { setBusy(null); }
  }
  async function deleteAccount() {
    setBusy("delete");
    try { await del("/me", { confirm: "delete my account" }); await signOut(); router.replace("/community"); }
    catch (e) { showToast(err(e)); setBusy(null); }
  }

  const lockedKind = me.restrictions.find((r) => r.kind === "ban" || r.kind === "suspend");
  return (
    <div data-lenis-prevent className="h-full overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-[680px] space-y-5">
        <div>
          <Eyebrow className="mb-1.5">{copy.brand}</Eyebrow>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#0a0a0a]">{a.title}</h1>
        </div>

        {lockedKind && (
          <Notice tone="rose" title={lockedKind.kind === "ban" ? copy.restricted.banned : copy.restricted.suspended}>{copy.restricted.lead}</Notice>
        )}

        {restrictions && restrictions.length > 0 && (
          <Section title={a.restrictionsSection}>
            <ul className="space-y-4">
              {restrictions.map((r) => (
                <li key={r.id} className="rounded-xl border border-[#e8e4de] bg-[#fafaf8] p-4">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Pill tone="rose"><ShieldAlert className="size-3" aria-hidden />{a.restrictionKind[r.kind]}</Pill>
                    <span className="text-[12.5px] text-[#6b7280]">{formatUntil(r.endsAt)}</span>
                  </div>
                  <p className="text-[14.5px] leading-relaxed text-[#0a0a0a]"><span className="font-medium">Reason:</span> {r.reason}</p>
                  {r.appealStatus ? (
                    <p className="mt-3"><Pill tone={r.appealStatus === "overturned" ? "emerald" : r.appealStatus === "open" ? "amber" : "neutral"}>{a.appealStatus[r.appealStatus]}</Pill></p>
                  ) : appealFor === r.id ? (
                    <div className="mt-3 space-y-3">
                      <p className="text-[13.5px] text-[#374151]">{a.appealLead}</p>
                      <TextArea aria-label={a.appeal} rows={4} maxLength={1000} value={appealText} onChange={(e) => setAppealText(e.target.value)} placeholder={a.appealPlaceholder} />
                      {appealError && <Notice tone="red" role="alert">{appealError}</Notice>}
                      <div className="flex gap-2">
                        <PrimaryButton size="sm" busy={busy === "appeal"} disabled={appealText.trim().length < 10} onClick={() => void sendAppeal()}>{a.appeal}</PrimaryButton>
                        <SecondaryButton size="sm" onClick={() => setAppealFor(null)}>{copy.block.cancel}</SecondaryButton>
                      </div>
                    </div>
                  ) : (
                    <SecondaryButton size="sm" className="mt-3" onClick={() => { setAppealFor(r.id); setAppealError(null); }}>{a.appeal}</SecondaryButton>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {!isLockedOut && (
          <>
            <Section title={a.nameSection}>
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-2">
                  <Avatar seed={me.persona.avatarSeed} size={64} label="Your picture" />
                  <button type="button" onClick={() => void newPicture()} disabled={busy === "avatar"} className="text-[12.5px] text-[#374151] underline underline-offset-4 hover:text-[#0a0a0a]">{a.newAvatar}</button>
                </div>
                <form className="flex-1 space-y-3" onSubmit={(e) => { e.preventDefault(); void saveName(); }}>
                  <Field label={copy.onboarding.nameLabel} htmlFor="acc-name" hint={copy.onboarding.nameHint} error={nameError}>
                    <TextInput id="acc-name" value={current} maxLength={24} onChange={(e) => setName(e.target.value)} />
                  </Field>
                  <PrimaryButton type="submit" size="sm" busy={busy === "name"} disabled={current.trim() === me.persona.displayName || current.trim().length < 2}>Save name</PrimaryButton>
                </form>
              </div>
            </Section>

            <Section title={a.privacySection}>
              <ul className="space-y-2.5">
                {a.privacyPoints.map((p) => (
                  <li key={p} className="flex gap-2.5 text-[14.5px] leading-relaxed text-[#374151]"><Lock className="mt-1 size-3.5 shrink-0 text-[#6366f1]" aria-hidden />{p}</li>
                ))}
              </ul>
            </Section>

            <Section title={a.passwordSection}>
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void savePassword(); }}>
                <Field label="New password" htmlFor="acc-pw" hint={a.passwordHint} error={passError}>
                  <TextInput id="acc-pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
                <PrimaryButton type="submit" size="sm" busy={busy === "password"} disabled={password.length < 8}>{a.setPassword}</PrimaryButton>
              </form>
            </Section>

            <Section title={a.blockedSection}>
              {blocked === null ? <Spinner /> : blocked.length === 0 ? (
                <p className="text-[14px] text-[#6b7280]">{a.blockedEmpty}</p>
              ) : (
                <ul className="divide-y divide-[#f0ede8]">
                  {blocked.map((b) => (
                    <li key={b.personaId} className="flex items-center gap-3 py-2.5">
                      <Avatar seed={b.avatarSeed} size={28} label="" />
                      <span className="flex-1 text-[14px] text-[#0a0a0a]">{b.displayName}</span>
                      <SecondaryButton size="sm" onClick={() => void unblock(b.personaId)}>{a.unblock}</SecondaryButton>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}

        <Section title={a.deleteSection}>
          <p className="mb-4 text-[14.5px] leading-relaxed text-[#374151]">{a.deleteLead}</p>
          <Field label={a.deleteConfirmLabel} htmlFor="acc-del">
            <TextInput id="acc-del" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          </Field>
          <div className="mt-3 flex flex-wrap gap-2">
            <DangerButton busy={busy === "delete"} disabled={confirmText.trim().toLowerCase() !== "delete my account"} onClick={() => void deleteAccount()}>{a.deleteButton}</DangerButton>
            <SecondaryButton onClick={async () => { await signOut(); router.replace("/community"); }}>{a.signOut}</SecondaryButton>
          </div>
        </Section>
      </div>
    </div>
  );
}
