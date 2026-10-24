"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** A small popup menu. Closes on Escape or an outside click, and returns focus to its button. */
export function Menu({
  trigger, label, children, align = "right", triggerClassName = "",
}: {
  trigger: ReactNode; label: string; children: (close: () => void) => ReactNode; align?: "left" | "right"; triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={wrap} className="relative inline-block">
      <button ref={button} type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={triggerClassName}>
        {trigger}
      </button>
      {open && (
        <div role="menu" className={`absolute z-40 mt-1.5 min-w-[200px] rounded-xl border border-[#e8e4de] bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.25)] ${align === "right" ? "right-0" : "left-0"}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon, children, onClick, tone = "default" }: { icon?: ReactNode; children: ReactNode; onClick: () => void; tone?: "default" | "danger" }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] transition-colors ${tone === "danger" ? "text-rose-700 hover:bg-rose-50" : "text-[#0a0a0a] hover:bg-[#f0ede8]"}`}
    >
      {icon && <span className="shrink-0 opacity-70" aria-hidden>{icon}</span>}
      {children}
    </button>
  );
}
