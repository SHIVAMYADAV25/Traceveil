"use client";
import { Menu as MenuIcon } from "lucide-react";
import { ChannelIcon } from "@/components/community/ui/ChannelIcon";
import { copy } from "@/lib/community/copy";
import { QuickExitButton } from "./QuickExit";
import type { HeaderInfo } from "./routeHeader";

/**
 * The top of the frame. It sits on the same colour as the sidebar, so the two read as one piece with the
 * message panel set into the corner. It never unmounts: only the title, the line under it and the buttons change.
 */
export function TopHeader({ info, onOpenSidebar, setSlot }: { info: HeaderInfo; onOpenSidebar: () => void; setSlot: (el: HTMLElement | null) => void }) {
  const Icon = info.icon;
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 px-3 sm:px-5">
      <button type="button" aria-label={copy.rail.openRooms} onClick={onOpenSidebar} className="-ml-1 rounded-xl p-2 text-[var(--cm-ink-2)] transition-colors hover:bg-[var(--cm-sidebar-hover)] md:hidden">
        <MenuIcon className="size-5" aria-hidden />
      </button>
      <div key={info.title} className="cm-fade flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/60 text-[var(--cat-ink)] ring-1 ring-white/70">
          {info.channel ? <ChannelIcon slug={info.channel.slug} kind={info.channel.kind} locked={info.channel.locked} className="size-[18px]" /> : Icon && <Icon className="size-[18px]" aria-hidden />}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[16px] font-semibold leading-tight text-[var(--cm-ink)]">{info.title}</h1>
          {info.description && <p className="hidden truncate text-[12.5px] leading-snug text-[var(--cm-ink-2)] sm:block">{info.description}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <div ref={setSlot} className="flex items-center gap-1.5" />
        {/* <QuickExitButton /> */}
      </div>
    </header>
  );
}
