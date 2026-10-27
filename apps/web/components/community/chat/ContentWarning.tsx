"use client";
import { EyeOff, TriangleAlert } from "lucide-react";
import { copy } from "@/lib/community/copy";

/** Collapsed: a soft card that says what is inside and lets the reader choose. Open: a one-line reminder with a way to hide it again. */
export function ContentWarning({ text, open, onToggle }: { text: string; open: boolean; onToggle: () => void }) {
  if (open) {
    return (
      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-amber-900">
        <TriangleAlert className="size-3.5 shrink-0 text-amber-700" aria-hidden />
        <span className="min-w-0"><span className="font-semibold">{copy.message.cwPrefix}:</span> {text}</span>
        <button type="button" onClick={onToggle} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium underline-offset-2 hover:bg-amber-100 hover:underline">
          <EyeOff className="size-3" aria-hidden />{copy.message.hideCw}
        </button>
      </div>
    );
  }
  return (
    <div className="my-1 flex min-w-[240px] max-w-[520px] items-start gap-3 rounded-xl bg-amber-50 px-3.5 py-3 ring-1 ring-amber-200/70">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"><TriangleAlert className="size-4" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-amber-900">{copy.message.cwPrefix}</p>
        <p className="mt-0.5 break-words text-[14px] leading-snug text-amber-950">{text}</p>
        <button type="button" onClick={onToggle} className="mt-2.5 rounded-full bg-white px-3.5 py-1 text-[12.5px] font-medium text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100">
          {copy.message.showCw}
        </button>
      </div>
    </div>
  );
}
