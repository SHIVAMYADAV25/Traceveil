import { createElement } from "react";
import { channelIcon } from "@/lib/community/channelTheme";
import type { RoomKind } from "@/lib/community/types";

/** The small picture for a channel (see channelIcon for the choices). */
export function ChannelIcon({ slug, kind, locked = false, className }: { slug: string; kind: RoomKind; locked?: boolean; className?: string }) {
  return createElement(channelIcon(slug, kind, locked), { className, "aria-hidden": true });
}
