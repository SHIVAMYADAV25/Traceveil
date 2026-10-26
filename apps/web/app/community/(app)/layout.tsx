import { CommunityShell } from "@/components/community/shell/CommunityShell";

export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return <CommunityShell>{children}</CommunityShell>;
}
