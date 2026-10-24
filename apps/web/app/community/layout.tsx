import type { Metadata } from "next";
import { QuickExitKeys } from "@/components/community/QuickExit";
import { CommunityProvider } from "@/lib/community/session";

export const metadata: Metadata = {
  title: "Community · Traceveil",
  description: "A private, moderated place to talk with others who have been through the same thing.",
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <CommunityProvider>
      <QuickExitKeys />
      {children}
    </CommunityProvider>
  );
}
