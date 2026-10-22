"use client";

import { useEffect, useCallback } from "react";
import { ExitIcon } from "./Icons";

const EXIT_URL =
  process.env.NEXTAUTH_URL || "http://localhost:3000";

/**
 * Leaves the page fast, for when someone walks in.
 * - Replaces this history entry, so Back does not return here.
 * - Clears image previews the report flow keeps in this tab's sessionStorage.
 * - Press Escape twice for the same effect.
 */

export function QuickExit() {
  const exit = useCallback(() => {
    try {
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith("sniffer_"))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch { /* storage may be unavailable */ }
    window.location.replace(EXIT_URL);
  }, []);

  useEffect(() => {
    let last = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const now = Date.now();
      if (now - last < 600) exit();
      last = now;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exit]);

  return (
    <button
      type="button"
      onClick={exit}
      title="Leave this page now. You can also press Esc twice."
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-[12px] font-medium text-ink-body transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <ExitIcon size={13} className="text-ink-faint" />
      <span className="hidden sm:inline">Leave quickly</span>
      <span className="sm:hidden">Exit</span>
    </button>
  );
}
