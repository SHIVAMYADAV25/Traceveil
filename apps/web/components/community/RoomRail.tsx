"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BellOff, ChevronDown, Lock } from "lucide-react";
import { copy } from "@/lib/community/copy";
import { useCommunity } from "@/lib/community/session";

/**
 * The list of spaces and the rooms inside each. Spaces are the headings; rooms are the places
 * to talk. A dot means there is something unread, and the number is shown to screen readers.
 */
export function RoomRail({ onNavigate }: { onNavigate?: () => void }) {
  const { spaces } = useCommunity();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <nav aria-label={copy.rail.title} className="flex h-full flex-col">
      <div className="px-4 pb-2 pt-4">
        <p className="font-mono text-[10.5px] uppercase tracking-widest text-[#6b7280]">{copy.rail.spaces}</p>
      </div>
      <div data-lenis-prevent className="flex-1 overflow-y-auto px-2 pb-6">
        {spaces.length === 0 && <p className="px-3 py-4 text-[13px] text-[#6b7280]">{copy.room.loading}…</p>}
        {spaces.map((space) => {
          const open = !collapsed[space.slug];
          const unread = space.rooms.reduce((n, r) => n + (r.muted ? 0 : r.unread), 0);
          return (
            <section key={space.slug} className="mb-1">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setCollapsed((c) => ({ ...c, [space.slug]: open }))}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-[#f0ede8]"
              >
                <span className="text-[13px] font-semibold text-[#0a0a0a]">{space.title}</span>
                <span className="flex items-center gap-2">
                  {!open && unread > 0 && <span className="size-1.5 rounded-full bg-indigo-500" aria-hidden />}
                  <ChevronDown className={`size-3.5 text-[#6b7280] transition-transform ${open ? "" : "-rotate-90"}`} aria-hidden />
                </span>
              </button>
              {open && (
                <ul className="mt-0.5 space-y-0.5">
                  {space.rooms.map((room) => {
                    const href = `/community/${room.spaceSlug}/${room.slug}`;
                    const active = pathname === href;
                    return (
                      <li key={room.id}>
                        <Link
                          href={href}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          className={`group flex min-h-9 items-center gap-2 rounded-lg px-3 py-1.5 text-[13.5px] leading-snug transition-colors ${
                            active ? "bg-[#0a0a0a] font-medium text-white" : "text-[#374151] hover:bg-[#f0ede8]"
                          }`}
                        >
                          <span className="flex-1">{room.title}</span>
                          {room.isLocked && <Lock className="size-3 shrink-0 opacity-60" aria-label={copy.room.lockedBadge} />}
                          {room.muted && <BellOff className="size-3 shrink-0 opacity-60" aria-label={copy.rail.muted} />}
                          {!room.muted && room.unread > 0 && !active && (
                            <>
                              <span className="size-2 shrink-0 rounded-full bg-indigo-500" aria-hidden />
                              <span className="sr-only">{room.unread} {copy.rail.unreadLabel}</span>
                            </>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </nav>
  );
}
