"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EyeOff, MessageSquareText, ShieldCheck, UsersRound, type LucideIcon } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { QuickExitButton } from "@/components/community/shell/QuickExit";
import { QuietIllustration } from "@/components/community/ui/Illustration";
import { Notice, PrimaryButton, SecondaryButton, Spinner } from "@/components/community/ui";
import { get } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { lastRoomPath } from "@/lib/community/lastRoom";
import { useCommunity } from "@/lib/community/session";

const ICONS: LucideIcon[] = [EyeOff, UsersRound, MessageSquareText, ShieldCheck];

export default function CommunityEntryPage() {
  const { phase, me } = useCommunity();
  const router = useRouter();
  // Whether conversation channels are open. Unknown until the service answers, so nothing misleading is shown meanwhile.
  const [chatOpen, setChatOpen] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    get<{ open: boolean }>("/status").then((r) => { if (alive) setChatOpen(r.open); }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (phase === "ready" && me) router.replace(me.onboardingComplete ? lastRoomPath() : "/community/onboarding");
  }, [phase, me, router]);

  if (phase === "loading" || phase === "ready") return <div className="min-h-dvh bg-[var(--cm-canvas)]"><Spinner /></div>;

  const e = copy.entry;
  return (
    <div className="bg-[var(--cm-canvas)]">
      <Navbar />
      <main>
        <section className="mx-auto grid max-w-[1100px] items-center gap-12 px-4 pb-16 pt-32 sm:px-8 md:grid-cols-[1.05fr_0.95fr] md:pt-40">
          <div>
            <h1 className="cm-title text-[36px] leading-[1.12] text-[var(--cm-ink)] sm:text-[48px]">{e.title}</h1>
            <p className="mt-5 max-w-[520px] text-[16.5px] leading-[1.7] text-[var(--cm-ink-2)]">{e.lead}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/community/join"><PrimaryButton className="px-6 py-3 text-[14px]">{e.join}</PrimaryButton></Link>
              <Link href="/community/join?mode=signin"><SecondaryButton className="px-6 py-3 text-[14px]">{e.signIn}</SecondaryButton></Link>
              <QuickExitButton className="ml-auto sm:ml-2" />
            </div>
          </div>
          <QuietIllustration className="w-full justify-self-center shadow-[var(--cm-shadow)]" />
        </section>

        <section className="mx-auto max-w-[1100px] px-4 pb-16 sm:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {e.promises.map((p, i) => {
              const Icon = ICONS[i] ?? ShieldCheck;
              return (
                <div key={p.title} className="rounded-3xl bg-[var(--cat-soft)]/60 p-6">
                  <span className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-white text-[var(--cat-accent)]"><Icon className="size-5" aria-hidden /></span>
                  <h2 className="mb-1.5 text-[15px] font-semibold text-[var(--cm-ink)]">{p.title}</h2>
                  <p className="text-[14px] leading-relaxed text-[var(--cm-ink-2)]">{p.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-[760px] space-y-4 px-4 pb-20 sm:px-8">
          <Notice tone="indigo" title={e.notAdviceTitle}>{e.notAdvice}</Notice>
          {chatOpen === false && <Notice tone="amber">{e.closedNotice}</Notice>}
        </section>
      </main>
      <Footer />
    </div>
  );
}
