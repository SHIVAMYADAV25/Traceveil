"use client";
import { HeartHandshake, X } from "lucide-react";
import { copy, HELPLINES } from "@/lib/community/copy";

/** Shown only to the person who wrote something that suggests they may be struggling. Never stored or reported. */
export function SupportCard({ onClose }: { onClose: () => void }) {
  return (
    <section role="status" className="relative rounded-2xl border border-rose-200 bg-rose-50 p-4 pr-10 text-rose-950">
      <button type="button" aria-label={copy.support.dismiss} onClick={onClose} className="absolute right-2.5 top-2.5 rounded-full p-1.5 hover:bg-rose-100"><X className="size-4" aria-hidden /></button>
      <div className="flex gap-3">
        <HeartHandshake className="mt-0.5 size-5 shrink-0 text-rose-600" aria-hidden />
        <div className="space-y-2 text-[14px] leading-relaxed">
          <p className="font-semibold">{copy.support.title}</p>
          <p>{copy.support.body}</p>
          {HELPLINES.length > 0 && (
            <div>
              <p className="font-medium">{copy.support.helplines}</p>
              <ul className="mt-1 space-y-0.5">{HELPLINES.map((h) => <li key={h.name}><span className="font-medium">{h.name}</span>: {h.detail}</li>)}</ul>
            </div>
          )}
          <p className="font-mono text-[11px] uppercase tracking-widest text-rose-700">{copy.support.private}</p>
        </div>
      </div>
    </section>
  );
}
