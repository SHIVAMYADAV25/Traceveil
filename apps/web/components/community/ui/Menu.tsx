"use client";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

interface MenuProps {
  trigger: ReactNode;
  label: string;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  /** "auto" opens downward and flips upward when there is no room, so a menu is never cut off at the edge of the screen. */
  side?: "auto" | "up" | "down";
  triggerClassName?: string;
  panelClassName?: string;
  /** "frame" gives the panel the sidebar's own colour, for menus that open from the sidebar. */
  tone?: "surface" | "frame";
  /** Called when the menu opens or closes, so a parent can keep a toolbar visible while its menu is open. */
  onOpenChange?: (open: boolean) => void;
}

/** A small popup. Closes on Escape or an outside click, returns focus to its button, and flips to stay on screen. */
export function Menu({ trigger, label, children, align = "right", side = "auto", triggerClassName = "", panelClassName = "", tone = "surface", onOpenChange }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(side === "up");
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const change = (v: boolean) => { setOpen(v); onOpenChange?.(v); };

  useLayoutEffect(() => {
    if (!open || side !== "auto" || !button.current || !panel.current) return;
    const b = button.current.getBoundingClientRect();
    const h = panel.current.offsetHeight + 12;
    const below = window.innerHeight - b.bottom;
    // Deferred so the state change is not made synchronously inside the effect.
    requestAnimationFrame(() => setUp(h > below && b.top > below));
  }, [open, side]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) change(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { change(false); button.current?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={wrap} className="relative inline-block">
      <button ref={button} type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => change(!open)} className={triggerClassName}>
        {trigger}
      </button>
      {open && (
        <div
          ref={panel}
          role="menu"
          style={{ ["--cm-pop-from" as string]: up ? "4px" : "-4px" }}
          className={`cm-pop absolute z-40 min-w-[210px] rounded-2xl border p-1.5 shadow-[var(--cm-shadow)] ${tone === "frame" ? "border-[var(--cm-frame-line)] bg-[var(--cm-raised)]" : "border-[var(--cm-line)] bg-[var(--cm-surface)]"} ${up ? "bottom-full mb-2" : "top-full mt-2"} ${align === "right" ? "right-0" : "left-0"} ${panelClassName}`}
        >
          {children(() => change(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon, children, onClick, tone = "default", hint }: { icon?: ReactNode; children: ReactNode; onClick: () => void; tone?: "default" | "danger"; hint?: string }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13.5px] transition-colors ${tone === "danger" ? "text-rose-700 hover:bg-rose-50" : "text-[var(--cm-ink)] hover:bg-[var(--cm-hover)]"}`}
    >
      {icon && <span className={`shrink-0 ${tone === "danger" ? "" : "text-[var(--cm-ink-3)]"}`} aria-hidden>{icon}</span>}
      <span className="min-w-0 flex-1">
        {children}
        {hint && <span className="block text-[12px] text-[var(--cm-ink-3)]">{hint}</span>}
      </span>
    </button>
  );
}

export function MenuDivider() {
  return <div role="separator" className="my-1 border-t border-[var(--cm-line)]" />;
}
