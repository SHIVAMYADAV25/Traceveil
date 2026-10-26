"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, Download, Eye, EyeOff, KeyRound, Lock, UsersRound } from "lucide-react";
import Image from "next/image";
import { QuickExitButton } from "@/components/community/shell/QuickExit";
import { Field, Notice, PrimaryButton, SecondaryButton, Spinner, TextInput } from "@/components/community/ui";
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

  const [showPassword, setShowPassword] = useState(false);
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
    if (password && password.length < 8) { setError("A password needs at least 8 characters."); return; }
    setBusy(true);
    try {
      const r = await post<{ handle: string; recoveryPhrase: string }>("/auth/register", password ? { password } : {});
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
  const switchTo = (m: Mode) => { setMode(m); setError(null); };
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[var(--cm-canvas)] px-4 py-6 sm:px-8">
      <Image src="/community/banners/start-here.webp" alt="" fill priority sizes="100vw" className="pointer-events-none object-cover object-[80%_bottom] opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--cm-canvas)] via-[var(--cm-canvas)]/70 to-transparent" aria-hidden />
      <div className="relative mx-auto flex max-w-[460px] items-center justify-between">
        <Link href="/community" className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] text-[var(--cm-ink-2)] hover:bg-white/70"><ArrowLeft className="size-4" aria-hidden />{copy.join.back}</Link>
        <QuickExitButton />
      </div>

      <div className="relative mx-auto mt-10 max-w-[460px] rounded-3xl border border-[var(--cm-line)] bg-white/95 p-6 shadow-[var(--cm-shadow)] backdrop-blur sm:p-8">
        {mode !== "recovery" && (
          <div role="tablist" aria-label="Join or sign in" className="mb-6 grid grid-cols-2 rounded-full bg-[var(--cm-hover)] p-1">
            {([["create", j.tabCreate], ["signin", j.tabSignIn]] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => switchTo(id)}
                className={`rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors ${mode === id ? "bg-white text-[var(--cm-ink)] shadow-sm" : "text-[var(--cm-ink-3)] hover:text-[var(--cm-ink)]"}`}>{label}</button>
            ))}
          </div>
        )}

        {mode === "create" && (
          <form onSubmit={(e) => { e.preventDefault(); void create(); }} className="space-y-5">
            <div>
              <h1 className="cm-title text-[28px] leading-tight text-[var(--cm-ink)]">{j.createTitle}</h1>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--cm-ink-2)]">{j.createLead}</p>
            </div>
            <ul className="space-y-2.5 text-[13.5px] text-[var(--cm-ink-2)]">
              <li className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-full bg-[var(--cat-soft)] text-[var(--cat-accent)]"><UsersRound className="size-4" aria-hidden /></span>{j.points[0]}</li>
              <li className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-full bg-[var(--cat-soft)] text-[var(--cat-accent)]"><KeyRound className="size-4" aria-hidden /></span>{j.points[1]}</li>
              <li className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-full bg-[var(--cat-soft)] text-[var(--cat-accent)]"><Lock className="size-4" aria-hidden /></span>{j.points[2]}</li>
            </ul>
            {showPassword ? (
              <Field label={j.passwordLabel} htmlFor="pw" hint={j.passwordHint}>
                <TextInput id="pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            ) : (
              <button type="button" onClick={() => setShowPassword(true)} className="text-[13.5px] text-[var(--cat-ink)] underline underline-offset-4">{j.addPassword}</button>
            )}
            {error && <Notice tone="red" role="alert">{error}</Notice>}
            <PrimaryButton type="submit" busy={busy} className="w-full py-3">{j.create}</PrimaryButton>
          </form>
        )}

        {mode === "signin" && (
          <form onSubmit={(e) => { e.preventDefault(); void signIn(); }} className="space-y-5">
            <div>
              <h1 className="cm-title text-[28px] leading-tight text-[var(--cm-ink)]">{j.signInTitle}</h1>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-[var(--cm-ink-2)]">{j.signInLead}</p>
            </div>
            <Field label={j.handle} htmlFor="handle">
              <TextInput id="handle" autoComplete="username" autoCapitalize="none" spellCheck={false} value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="quiet-heron-1234" />
            </Field>
            <Field label={j.secret} htmlFor="secret">
              <TextInput id="secret" type="password" autoComplete="current-password" value={secret} onChange={(e) => setSecret(e.target.value)} />
            </Field>
            {error && <Notice tone="red" role="alert">{error}</Notice>}
            <PrimaryButton type="submit" busy={busy} disabled={!handle || !secret} className="w-full py-3">{j.signIn}</PrimaryButton>
          </form>
        )}

        {mode === "recovery" && issued && (
          <div className="space-y-5">
            <div>
              <h1 className="cm-title text-[28px] leading-tight text-[var(--cm-ink)]">{r.title}</h1>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-[var(--cm-ink-2)]">{r.lead}</p>
            </div>
            <dl className="space-y-3 rounded-xl border border-[var(--cm-line)] bg-[var(--cm-canvas)] p-4">
              <div><dt className="text-[12.5px] font-medium text-[var(--cm-ink-3)]">{r.handle}</dt><dd className="mt-1 font-mono text-[15px] text-[var(--cm-ink)]">{issued.handle}</dd></div>
              <div>
                <dt className="text-[12.5px] font-medium text-[var(--cm-ink-3)]">{r.phrase}</dt>
                <dd className="mt-1 break-words font-mono text-[15px] leading-relaxed text-[var(--cm-ink)]" aria-live="polite">
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
            <label className="flex cursor-pointer items-start gap-3 text-[14px] text-[var(--cm-ink)]">
              <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 size-4 accent-[var(--cm-ink)]" />
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
  return <Suspense fallback={<div className="min-h-dvh bg-[var(--cm-canvas)]"><Spinner /></div>}><JoinInner /></Suspense>;
}
