import { Suspense } from "react";
import { SupportHeader } from "@/components/support/SupportHeader";
import { SupportFooter } from "@/components/support/SupportFooter";

export const metadata = {
  title: "Support — Traceveil",
  description:
    "Free counsellors, ways to get content taken down, our own Discord and chat, and stories, books and music for hard days.",
};

/** Shared chrome for every Support page. `useSearchParams` in the header needs a Suspense boundary. */
export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <Suspense fallback={<div className="h-[57px] border-b border-line bg-white" />}>
        <SupportHeader />
      </Suspense>
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-14">{children}</main>
      <SupportFooter />
    </div>
  );
}
