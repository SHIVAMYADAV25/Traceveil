"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Check, Copy, Download, Eye, EyeOff } from "lucide-react";
import { QuickExitButton } from "@/components/community/QuickExit";
import { Eyebrow, Field, Notice, PrimaryButton, SecondaryButton, Spinner, TextInput } from "@/components/community/ui";
import { ApiError, post } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { lastRoomPath } from "@/lib/community/lastRoom";
import { useCommunity } from "@/lib/community/session";

type Mode = "create" | "signin" | "recovery";

function JoinInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { phase, me, reloadMe } = useCommunity();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signin" ? "signin" : "create");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [age, setAge] = useState(false);
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [secret, setSecret] = useState("");
  const [issued, setIssued] = useState<{ handle: string; phrase: string } | null>(null);
  const [shown, setShown] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Someone who is already signed in has no reason to be here, except right after sign-up.
  useEffect(() => {
    if (mode !== "recovery" && phase === "ready" && me) router.replace(me.onboardingComplete ? lastRoomPath() : "/community/onboarding");
  }, [phase, me, mode, router]);

  // Losing the recovery phrase means losing the account, so warn before the page is closed.
  useEffect(() => {
    if (mode !== "recovery" || saved) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [mode, saved]);

  const fail = (err: unknown) => setError(err instanceof ApiError ? err.message : copy.errors.generic);

  async function create() {
    setError(null);
    if (!age) { setError("Please confirm that you are 18 or older."); return; }
    if (password && password.length < 8) { setError("A password needs at least 8 characters."); return; }
    setBusy(true);
    try {
      const r = await post<{ handle: string; recoveryPhrase: string }>("/auth/register", { ageConfirmed: true, ...(password ? { password } : {}) });
      setIssued({ handle: r.handle, phrase: r.recoveryPhrase });
      setMode("recovery");
    } catch (err) { fail(err); } finally { setBusy(false); }
  }

  async function signIn() {
    setError(null);
    setBusy(true);
    try {
      await post("/auth/login", { handle, secret });
      const m = await reloadMe();
      router.replace(m?.onboardingComplete ? lastRoomPath() : "/community/onboarding");
    } catch (err) { fail(err); } finally { setBusy(false); }
  }

  async function proceed() {
    await reloadMe();
    router.replace("/community/onboarding");
  }

  const text = issued ? `Traceveil Community sign-in\nHandle: ${issued.handle}\nRecovery phrase: ${issued.phrase}\n` : "";
  const copyBoth = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setError("Could not copy. Please write it down instead."); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url; a.download = "community-sign-in.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const j = copy.join;
  const r = copy.recovery;
  return (
    <main className="min-h-dvh bg-[#fafaf8] px-4 py-6 sm:px-8">
      <div className="mx-auto flex max-w-[460px] items-center justify-between">
        <Link href="/community" className="text-[13px] text-[#374151] underline-offset-4 hover:underline">← {copy.brand}</Link>
        <QuickExitButton />
      </div>

      <div className="mx-auto mt-8 max-w-[460px] rounded-2xl border border-[#e8e4de] bg-white p-6 shadow-[0_18px_44px_-24px_rgba(15,23,42,0.25)] sm:p-8">
        {mode === "create" && (
          <form onSubmit={(e) => { e.preventDefault(); void create(); }} className="space-y-5">
            <div>
              <Eyebrow className="mb-2">{copy.entry.eyebrow}</Eyebrow>
              <h1 className="text-[22px] font-semibold tracking-tight text-[#0a0a0a]">{j.createTitle}</h1>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#374151]">{j.createLead}</p>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e8e4de] bg-[#fafaf8] p-3.5 text-[14px] text-[#0a0a0a]">
              <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} className="mt-0.5 size-4 accent-[#0a0a0a]" />
              {j.ageLabel}
            </label>
            <Field label={j.passwordLabel} htmlFor="pw" hint={j.passwordHint}>
              <TextInput id="pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {error && <Notice tone="red" role="alert">{error}</Notice>}
            <PrimaryButton type="submit" busy={busy} className="w-full py-3">{j.create}</PrimaryButton>
            <p className="text-center text-[13.5px] text-[#374151]">
              <button type="button" onClick={() => { setMode("signin"); setError(null); }} className="underline underline-offset-4 hover:text-[#0a0a0a]">{j.haveAccount}</button>
            </p>
          </form>
        )}

        {mode === "signin" && (
          <form onSubmit={(e) => { e.preventDefault(); void signIn(); }} className="space-y-5">
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight text-[#0a0a0a]">{j.signInTitle}</h1>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#374151]">{j.signInLead}</p>
            </div>
            <Field label={j.handle} htmlFor="handle">
              <TextInput id="handle" autoComplete="username" autoCapitalize="none" spellCheck={false} value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="quiet-heron-1234" />
            </Field>
            <Field label={j.secret} htmlFor="secret">
              <TextInput id="secret" type="password" autoComplete="current-password" value={secret} onChange={(e) => setSecret(e.target.value)} />
            </Field>
            {error && <Notice tone="red" role="alert">{error}</Notice>}
            <PrimaryButton type="submit" busy={busy} disabled={!handle || !secret} className="w-full py-3">{j.signIn}</PrimaryButton>
            <p className="text-center text-[13.5px] text-[#374151]">
              <button type="button" onClick={() => { setMode("create"); setError(null); }} className="underline underline-offset-4 hover:text-[#0a0a0a]">{j.newHere}</button>
            </p>
          </form>
        )}

        {mode === "recovery" && issued && (
          <div className="space-y-5">
            <div>
              <Eyebrow className="mb-2">One time only</Eyebrow>
              <h1 className="text-[22px] font-semibold tracking-tight text-[#0a0a0a]">{r.title}</h1>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#374151]">{r.lead}</p>
            </div>
            <dl className="space-y-3 rounded-xl border border-[#e8e4de] bg-[#fafaf8] p-4">
              <div><dt className="font-mono text-[10.5px] uppercase tracking-widest text-[#6b7280]">{r.handle}</dt><dd className="mt-1 font-mono text-[15px] text-[#0a0a0a]">{issued.handle}</dd></div>
              <div>
                <dt className="font-mono text-[10.5px] uppercase tracking-widest text-[#6b7280]">{r.phrase}</dt>
                <dd className="mt-1 break-words font-mono text-[15px] leading-relaxed text-[#0a0a0a]" aria-live="polite">
                  {shown ? issued.phrase : "•••• •••• •••• •••• •••• •••• •••• ••••"}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton size="sm" onClick={() => setShown((s) => !s)}>{shown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}{shown ? r.hide : r.reveal}</SecondaryButton>
              <SecondaryButton size="sm" onClick={() => void copyBoth()}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? r.copied : r.copy}</SecondaryButton>
              <SecondaryButton size="sm" onClick={download}><Download className="size-3.5" />{r.download}</SecondaryButton>
            </div>
            <Notice tone="amber">{r.safetyNote}</Notice>
            <label className="flex cursor-pointer items-start gap-3 text-[14px] text-[#0a0a0a]">
              <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 size-4 accent-[#0a0a0a]" />
              {r.confirm}
            </label>
            {error && <Notice tone="red" role="alert">{error}</Notice>}
            <PrimaryButton onClick={() => void proceed()} disabled={!saved} className="w-full py-3">{r.continue}</PrimaryButton>
          </div>
        )}
      </div>
    </main>
  );
}

export default function JoinPage() {
  return <Suspense fallback={<div className="min-h-dvh bg-[#fafaf8]"><Spinner /></div>}><JoinInner /></Suspense>;
}
