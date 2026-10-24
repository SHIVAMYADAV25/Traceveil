"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EyeOff, HeartHandshake, MessageSquareText, ShieldCheck, UsersRound } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { QuickExitButton } from "@/components/community/QuickExit";
import { QuietIllustration } from "@/components/community/QuietIllustration";
import { Eyebrow, Notice, PrimaryButton, SecondaryButton, Spinner } from "@/components/community/ui";
import { get } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { lastRoomPath } from "@/lib/community/lastRoom";
import { useCommunity } from "@/lib/community/session";

const ICONS = [EyeOff, UsersRound, MessageSquareText, ShieldCheck];

export default function CommunityEntryPage() {
  const { phase, me } = useCommunity();
  const router = useRouter();
  // Whether conversation rooms are open. Unknown until the service answers, so nothing misleading is shown meanwhile.
  const [chatOpen, setChatOpen] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    get<{ open: boolean }>("/status").then((r) => { if (alive) setChatOpen(r.open); }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (phase === "ready" && me) router.replace(me.onboardingComplete ? lastRoomPath() : "/community/onboarding");
  }, [phase, me, router]);

  if (phase === "loading" || phase === "ready") return <div className="min-h-dvh bg-[#fafaf8]"><Spinner /></div>;

  const e = copy.entry;
  return (
    <div className="bg-white">
      <Navbar />
      <main>
        <section className="mx-auto grid max-w-[1100px] items-center gap-12 px-4 pb-20 pt-32 sm:px-8 md:grid-cols-[1.1fr_0.9fr] md:pt-40">
          <div>
            <Eyebrow className="mb-5">{e.eyebrow}</Eyebrow>
            <h1 className="text-[34px] leading-[1.12] tracking-tight text-[#0a0a0a] sm:text-[44px]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              {e.title}
            </h1>
            <p className="mt-5 max-w-[520px] text-[16.5px] leading-[1.7] text-[#374151]">{e.lead}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/community/join"><PrimaryButton className="px-6 py-3 text-[14px]">{e.join}</PrimaryButton></Link>
              <Link href="/community/join?mode=signin"><SecondaryButton className="px-6 py-3 text-[14px]">{e.signIn}</SecondaryButton></Link>
              <QuickExitButton className="ml-auto sm:ml-2" />
            </div>
            <p className="mt-4 font-mono text-[11.5px] uppercase tracking-widest text-[#6b7280]">{e.adultsOnly}</p>
          </div>
          <QuietIllustration className="w-full max-w-[420px] justify-self-center" />
        </section>

        <section className="border-y border-[#e8e4de] bg-[#fafaf8]">
          <div className="mx-auto grid max-w-[1100px] gap-px bg-[#e8e4de] px-0 sm:grid-cols-2 lg:grid-cols-4">
            {e.promises.map((p, i) => {
              const Icon = ICONS[i] ?? HeartHandshake;
              return (
                <div key={p.title} className="bg-[#fafaf8] p-6 sm:p-7">
                  <Icon className="mb-4 size-5 text-[#6366f1]" aria-hidden />
                  <h2 className="mb-1.5 text-[15px] font-semibold text-[#0a0a0a]">{p.title}</h2>
                  <p className="text-[14px] leading-relaxed text-[#374151]">{p.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-[760px] space-y-4 px-4 py-16 sm:px-8">
          <Notice tone="indigo" title={e.notAdviceTitle}>{e.notAdvice}</Notice>
          {chatOpen === false && <Notice tone="amber">{e.closedNotice}</Notice>}
        </section>
      </main>
      <Footer />
    </div>
  );
}
