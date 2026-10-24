"use client";
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Loader2, X } from "lucide-react";

/**
 * Small building blocks for the Community, written in the same visual language as the rest of the
 * site: warm neutrals, 1px #e8e4de borders, pill buttons, mono eyebrow labels.
 */

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`font-mono text-[10.5px] uppercase tracking-widest text-[#6b7280] ${className}`}>{children}</p>;
}

const PILL_TONES = {
  neutral: "bg-[#f0ede8] text-[#374151] border-[#e8e4de]",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
} as const;
export type Tone = keyof typeof PILL_TONES;

export function Pill({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-medium leading-5 ${PILL_TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full text-[13px] font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1] disabled:opacity-50 disabled:pointer-events-none";

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; size?: "sm" | "md" };
const sizeCls = (s: "sm" | "md" | undefined) => (s === "sm" ? "px-3.5 py-1.5" : "px-5 py-2.5");

export function PrimaryButton({ busy, size, className = "", children, disabled, ...p }: BtnProps) {
  return (
    <button type="button" {...p} disabled={disabled || busy} className={`${BTN_BASE} ${sizeCls(size)} bg-[#0a0a0a] text-white hover:opacity-80 ${className}`}>
      {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
export function SecondaryButton({ busy, size, className = "", children, disabled, ...p }: BtnProps) {
  return (
    <button type="button" {...p} disabled={disabled || busy} className={`${BTN_BASE} ${sizeCls(size)} border border-[#e8e4de] bg-white text-[#0a0a0a] hover:border-[#d4cfc9] hover:bg-[#fafaf8] ${className}`}>
      {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
export function DangerButton({ busy, size, className = "", children, disabled, ...p }: BtnProps) {
  return (
    <button type="button" {...p} disabled={disabled || busy} className={`${BTN_BASE} ${sizeCls(size)} border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 ${className}`}>
      {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
export function GhostButton({ className = "", children, ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...p} className={`${BTN_BASE} px-3 py-1.5 text-[#374151] hover:bg-[#f0ede8] ${className}`}>
      {children}
    </button>
  );
}

const FIELD = "w-full rounded-lg border border-[#e8e4de] bg-[#fafaf8] px-3.5 py-2.5 text-[14.5px] text-[#0a0a0a] placeholder:text-[#8a8378] transition-colors focus:border-[#0a0a0a] focus:bg-white focus:outline-none";

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string | null; children: ReactNode; htmlFor: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-[#0a0a0a]">{label}</label>
      {children}
      {hint && !error && <p className="text-[12.5px] leading-relaxed text-[#6b7280]">{hint}</p>}
      {error && <p role="alert" className="text-[12.5px] leading-relaxed text-red-700">{error}</p>}
    </div>
  );
}
export function TextInput(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={`${FIELD} ${p.className ?? ""}`} />;
}
export function TextArea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={`${FIELD} resize-none ${p.className ?? ""}`} />;
}

const NOTICE_TONES: Record<Tone, string> = {
  neutral: "border-[#e8e4de] bg-white text-[#374151]",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-900",
  rose: "border-rose-200 bg-rose-50 text-rose-900",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  red: "border-red-200 bg-red-50 text-red-800",
};
export function Notice({ tone = "neutral", title, children, role }: { tone?: Tone; title?: string; children: ReactNode; role?: "alert" | "status" }) {
  return (
    <div role={role} className={`rounded-xl border px-4 py-3 text-[13.5px] leading-relaxed ${NOTICE_TONES[tone]}`}>
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-[13px] text-[#6b7280]">
      <Loader2 className="size-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

/** A modal that traps focus, closes on Escape, and returns focus to where it was opened. */
export function Dialog({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    (focusables()[0] ?? node)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0] as HTMLElement;
      const last = items[items.length - 1] as HTMLElement;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("keydown", onKey, true); previous?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#0a0a0a]/40" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-lenis-prevent
        className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-[#e8e4de] bg-white p-6 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)] sm:rounded-2xl ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-[17px] font-semibold tracking-tight text-[#0a0a0a]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 -mt-1 rounded-full p-1.5 text-[#6b7280] hover:bg-[#f0ede8]">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
