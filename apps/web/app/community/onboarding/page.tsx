"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/community/ui/Avatar";
import { QuickExitButton } from "@/components/community/shell/QuickExit";
import { Field, Notice, PrimaryButton, Spinner, TextInput } from "@/components/community/ui";
import { ApiError, post } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { lastRoomPath } from "@/lib/community/lastRoom";
import { useCommunity } from "@/lib/community/session";

export default function OnboardingPage() {
  const { phase, me, reloadMe } = useCommunity();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phase === "signed_out") router.replace("/community/join");
    else if (phase === "ready" && me?.onboardingComplete) router.replace(lastRoomPath());
  }, [phase, me, router]);

  if (!me) return <div className="min-h-dvh bg-[var(--cm-canvas)]"><Spinner /></div>;
  const current = name ?? me.persona.displayName;

  async function enter() {
    if (!me) return;
    setError(null);
    setBusy(true);
    try {
      const changed = current.trim() !== me.persona.displayName;
      await post("/me/onboarding", { acceptRules: true, ...(changed ? { displayName: current } : {}) });
      await reloadMe();
      router.replace(lastRoomPath());
    } catch (err) { setError(err instanceof ApiError ? err.message : copy.errors.generic); } finally { setBusy(false); }
  }

  const o = copy.onboarding;
  const nameProblem = error && /name|characters|reserved|letters/i.test(error) ? error : null;
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[var(--cm-canvas)] px-4 py-6 sm:px-8">
      <Image src="/community/banners/start-here.webp" alt="" fill priority sizes="100vw" className="pointer-events-none object-cover object-[80%_bottom] opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--cm-canvas)] via-[var(--cm-canvas)]/70 to-transparent" aria-hidden />
      {/* <div className="relative mx-auto flex max-w-[600px] justify-end"><QuickExitButton /></div> */}
      <form onSubmit={(e) => { e.preventDefault(); void enter(); }} className="relative mx-auto mt-8 max-w-[600px] space-y-7 rounded-3xl border border-[var(--cm-line)] bg-white/95 p-6 shadow-[var(--cm-shadow)] backdrop-blur sm:p-8">
        <div>
          <h1 className="cm-title text-[30px] leading-tight text-[var(--cm-ink)]">{o.title}</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--cm-ink-2)]">{o.lead}</p>
        </div>

        <div className="rounded-3xl bg-[var(--cat-soft)]/70 p-5 ring-1 ring-[var(--cat-accent)]/15">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-[var(--cat-ink)]"><ShieldCheck className="size-[18px] text-[var(--cat-accent)]" aria-hidden />{o.rulesTitle}</h2>
          <ol className="space-y-3">
            {o.rules.map((rule, i) => (
              <li key={rule.title} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[var(--cat-ink)]">{i + 1}</span>
                <p className="text-[14.5px] leading-relaxed text-[var(--cm-ink-2)]"><span className="font-semibold text-[var(--cm-ink)]">{rule.title}.</span> {rule.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex items-start gap-4">
          <Avatar seed={me.persona.avatarSeed} size={56} label="Your picture" />
          <div className="flex-1">
            <Field label={o.nameLabel} htmlFor="name" hint={o.nameHint} error={nameProblem}>
              <TextInput id="name" value={current} maxLength={24} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </Field>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--cm-line)] bg-[var(--cm-canvas)] p-3.5 text-[14px] text-[var(--cm-ink)]">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 accent-[var(--cat-accent)]" />
          {o.accept}
        </label>
        {error && !nameProblem && <Notice tone="red" role="alert">{error}</Notice>}
        <PrimaryButton type="submit" busy={busy} disabled={!agreed || current.trim().length < 2} className="w-full py-3">{o.enter}</PrimaryButton>
      </form>
    </main>
  );
}
