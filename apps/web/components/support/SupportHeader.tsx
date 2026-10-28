"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { QuickExit } from "./QuickExit";
import { ArrowLeft } from "./Icons";

const CRUMBS: Record<string, string> = {
  "/support/counsellors": "Counsellors",
  "/support/community": "Organisations and communities",
  "/support/read-and-listen": "Read, watch and listen",
};

const CASE_KEY = "sniffer_support_case";

/** Same chrome as the Report header: logo, "/", mono crumb, actions on the right. */
export function SupportHeader() {
  const pathname = usePathname();
  const params = useSearchParams();
  const fromUrl = params.get("caseId");

  // Remember which report the person came from, so "Back to your report" survives page changes.
  useEffect(() => {
    if (!fromUrl) return;
    try { sessionStorage.setItem(CASE_KEY, fromUrl); } catch { /* storage unavailable */ }
  }, [fromUrl]);

  const stored = useSyncExternalStore(
    () => () => {},
    () => { try { return sessionStorage.getItem(CASE_KEY); } catch { return null; } },
    () => null,
  );
  const caseId = fromUrl ?? stored;

  const crumb = CRUMBS[pathname];

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-white/90 px-4 py-3.5 backdrop-blur-md sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          {/* <Image src="/logo.png" alt="Sniffer" width={24} height={24} /> */}
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}><svg width="20" height="20" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 3 4 8v7c0 6 4.5 10 11 12 6.5-2 11-6 11-12V8z" fill="#E4937A"/><path d="M10 15l4 4 7-8" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round"/></svg></div>
          <span className="text-[17px] font-semibold tracking-tight text-ink">Traceveil</span>
        </Link>
        <span className="text-line-strong">/</span>
        {crumb ? (
          <>
            <Link
              href="/support"
              className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-faint transition-colors hover:text-ink"
            >
              Support
            </Link>
            <span className="hidden text-line-strong sm:inline">/</span>
            <span className="hidden truncate text-[13px] text-ink-faint sm:inline">{crumb}</span>
          </>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-faint">Support</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {caseId && (
            <Link
              href={`/report/${caseId}`}
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-ink-soft transition-colors hover:text-ink md:inline-flex"
            >
              <ArrowLeft size={12} />
              Back to your report
            </Link>
          )}
          <QuickExit />
        </div>
      </div>
    </header>
  );
}
