import {
  Bug, CircleHelp, Hash, HeartHandshake, Lightbulb, LifeBuoy, Lock, Megaphone, Scale, ShieldCheck, Sparkles, Ticket, Globe, type LucideIcon,
} from "lucide-react";
import type { RoomKind } from "./types";

/**
 * Each channel group has its own colour and its own banner picture. The banners live in
 * /public/community/banners and are tinted copies of the watercolours in /public/support.
 * Keyed by the group's slug (services/community/src/db/seed/spaces.ts). Unknown groups, such as
 * ones an admin adds later, fall back to the first theme.
 */
export interface ChannelTheme {
  banner: string;
  accent: string; // buttons, active state, links
  soft: string; // tinted backgrounds
  ink: string; // text on the tinted background
}

const THEMES: Record<string, ChannelTheme> = {
  "start-here": { banner: "/community/banners/start-here.webp", accent: "#4c7c6d", soft: "#e3eee9", ink: "#2f5a4e" },
  "victim-support": { banner: "/community/banners/victim-support.webp", accent: "#b0646f", soft: "#f8e8e5", ink: "#85444f" },
  "product-support": { banner: "/community/banners/product-support.webp", accent: "#4a7890", soft: "#e2eef3", ink: "#32576b" },
  "legal-resources": { banner: "/community/banners/legal-resources.webp", accent: "#7468a3", soft: "#ece9f5", ink: "#554a82" },
  "bugs-feedback": { banner: "/community/banners/bugs-feedback.webp", accent: "#9c7b35", soft: "#f5eed9", ink: "#74591f" },
};

export const DEFAULT_THEME: ChannelTheme = THEMES["start-here"] as ChannelTheme;
export const themeFor = (spaceSlug: string | undefined): ChannelTheme => (spaceSlug && THEMES[spaceSlug]) || DEFAULT_THEME;

/** CSS variables for a theme. Spread into a style prop on any element that should wear the theme. */
export const themeVars = (t: ChannelTheme): React.CSSProperties =>
  ({ "--cat-accent": t.accent, "--cat-soft": t.soft, "--cat-ink": t.ink }) as React.CSSProperties;

const ICONS: Record<string, LucideIcon> = {
  welcome: Sparkles,
  "rules-and-safety": ShieldCheck,
  "how-to-get-help": LifeBuoy,
  "ask-for-help": HeartHandshake,
  "private-support-tickets": Ticket,
  "crisis-and-wellbeing": HeartHandshake,
  faq: CircleHelp,
  "legal-resources-india": Scale,
  "global-resources": Globe,
  "report-a-bug": Bug,
  "feature-requests": Lightbulb,
};

/** A small picture for a channel: a specific one where it helps, otherwise a megaphone for team-only and # for the rest. */
export function channelIcon(slug: string, kind: RoomKind, locked = false): LucideIcon {
  if (locked) return Lock;
  return ICONS[slug] ?? (kind === "chat" ? Hash : Megaphone);
}
