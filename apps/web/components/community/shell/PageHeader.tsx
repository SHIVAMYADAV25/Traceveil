"use client";
import type { ReactNode } from "react";
import { Menu as MenuIcon, type LucideIcon } from "lucide-react";
import { copy } from "@/lib/community/copy";
import { QuickExitButton } from "./QuickExit";
import { useShell } from "./ShellContext";

/**
 * The bar at the top of every signed-in screen: the menu button on phones, what this screen is,
 * anything specific to it, and Leave quickly. Channels, account, notifications, moderation and admin all use it.
 */
export function PageHeader({ icon: Icon, iconNode, title, description, children, accent = false }: {
  icon?: LucideIcon; iconNode?: ReactNode; title: string; description?: string; children?: ReactNode; accent?: boolean;
}) {
  const { openSidebar } = useShell();
  return (
    <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-[var(--cm-line)] bg-[var(--cm-surface)]/90 px-3 backdrop-blur sm:px-5">
      <button type="button" aria-label={copy.rail.openRooms} onClick={openSidebar} className="-ml-1 rounded-xl p-2 text-[var(--cm-ink-2)] hover:bg-[var(--cm-hover)] md:hidden">
        <MenuIcon className="size-5" aria-hidden />
      </button>
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${accent ? "bg-[var(--cat-soft)] text-[var(--cat-ink)]" : "text-[var(--cm-ink-3)]"}`}>
        {iconNode ?? (Icon && <Icon className="size-[18px]" aria-hidden />)}
      </span>
      <div className="min-w-0 flex-1 py-2">
        <h1 className="truncate text-[15.5px] font-semibold leading-tight text-[var(--cm-ink)]">{title}</h1>
        {description && <p className="truncate text-[12.5px] leading-snug text-[var(--cm-ink-3)]">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {children}
        {/* <QuickExitButton /> */}
      </div>
    </header>
  );
}
