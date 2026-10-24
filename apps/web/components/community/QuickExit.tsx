"use client";
import { useEffect, useRef } from "react";
import { LogOut } from "lucide-react";
import { copy, QUICK_EXIT_URL } from "@/lib/community/copy";

/** Hide everything at once, then replace this page in the history with an ordinary site. */
export function leaveQuickly(): void {
  try {
    document.documentElement.style.visibility = "hidden";
    document.title = "New tab";
  } catch { /* leaving anyway */ }
  window.location.replace(QUICK_EXIT_URL);
}

/** Pressing Escape three times within two seconds leaves the page. Works on every Community screen. */
export function QuickExitKeys() {
  const presses = useRef<number[]>([]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const now = Date.now();
      presses.current = [...presses.current.filter((t) => now - t < 2000), now];
      if (presses.current.length >= 3) leaveQuickly();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}

export function QuickExitButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={leaveQuickly}
      title={copy.topbar.leaveHint}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-[12.5px] font-medium text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 ${className}`}
    >
      <LogOut className="size-3.5" aria-hidden />
      {copy.topbar.leaveQuickly}
    </button>
  );
}
