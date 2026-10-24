"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/community/Avatar";
import { QuickExitButton } from "@/components/community/QuickExit";
import { Eyebrow, Field, Notice, PrimaryButton, Spinner, TextInput } from "@/components/community/ui";
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

  if (!me) return <div className="min-h-dvh bg-[#fafaf8]"><Spinner /></div>;
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
    <main className="min-h-dvh bg-[#fafaf8] px-4 py-6 sm:px-8">
      <div className="mx-auto flex max-w-[560px] justify-end"><QuickExitButton /></div>
      <form onSubmit={(e) => { e.preventDefault(); void enter(); }} className="mx-auto mt-6 max-w-[560px] space-y-7 rounded-2xl border border-[#e8e4de] bg-white p-6 shadow-[0_18px_44px_-24px_rgba(15,23,42,0.25)] sm:p-8">
        <div>
          <Eyebrow className="mb-2">{o.eyebrow}</Eyebrow>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#0a0a0a]">{o.title}</h1>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#374151]">{o.lead}</p>
        </div>

        <div className="flex items-start gap-4">
          <Avatar seed={me.persona.avatarSeed} size={56} label="Your picture" />
          <div className="flex-1">
            <Field label={o.nameLabel} htmlFor="name" hint={o.nameHint} error={nameProblem}>
              <TextInput id="name" value={current} maxLength={24} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </Field>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-[15px] font-semibold text-[#0a0a0a]">{o.rulesTitle}</h2>
          <ol className="space-y-3">
            {o.rules.map((rule, i) => (
              <li key={rule.title} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#f0ede8] font-mono text-[11px] text-[#374151]">{i + 1}</span>
                <p className="text-[14.5px] leading-relaxed text-[#374151]"><span className="font-semibold text-[#0a0a0a]">{rule.title}.</span> {rule.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e8e4de] bg-[#fafaf8] p-3.5 text-[14px] text-[#0a0a0a]">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 accent-[#0a0a0a]" />
          {o.accept}
        </label>
        {error && !nameProblem && <Notice tone="red" role="alert">{error}</Notice>}
        <PrimaryButton type="submit" busy={busy} disabled={!agreed || current.trim().length < 2} className="w-full py-3">{o.enter}</PrimaryButton>
      </form>
    </main>
  );
}
