import { CommunityFrame } from "@/components/community/CommunityFrame";

export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return <CommunityFrame>{children}</CommunityFrame>;
}
