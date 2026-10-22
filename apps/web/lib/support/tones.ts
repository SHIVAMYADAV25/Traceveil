import type { Tone } from "./types";

/**
 * Semantic tones → Tailwind classes. Written out in full so Tailwind can see them.
 * Families are the ones the app already uses (see AudienceSection, STATUS_STYLES):
 *   care   rose     the NCII flow, crisis, people
 *   brand  indigo   product accent, neutral links
 *   safe   emerald  free, verified, available
 *   warm   amber    "check this first"
 *   calm   sky      slowing down
 *   quiet  violet   sleep, stillness
 */
export const TONES: Record<
  Tone,
  { chip: string; tile: string; dot: string; text: string; ring: string; stroke: string }
> = {
  care: {
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    tile: "bg-rose-50 text-rose-600",
    dot: "bg-rose-400",
    text: "text-rose-600",
    ring: "ring-rose-100",
    stroke: "#fb7185",
  },
  brand: {
    chip: "border-indigo-200 bg-indigo-50 text-indigo-700",
    tile: "bg-indigo-50 text-indigo-600",
    dot: "bg-indigo-400",
    text: "text-indigo-600",
    ring: "ring-indigo-100",
    stroke: "#818cf8",
  },
  safe: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    tile: "bg-emerald-50 text-emerald-600",
    dot: "bg-emerald-500",
    text: "text-emerald-600",
    ring: "ring-emerald-100",
    stroke: "#34d399",
  },
  warm: {
    chip: "border-amber-200 bg-amber-50 text-amber-800",
    tile: "bg-amber-50 text-amber-600",
    dot: "bg-amber-400",
    text: "text-amber-600",
    ring: "ring-amber-100",
    stroke: "#fbbf24",
  },
  calm: {
    chip: "border-sky-200 bg-sky-50 text-sky-700",
    tile: "bg-sky-50 text-sky-600",
    dot: "bg-sky-400",
    text: "text-sky-600",
    ring: "ring-sky-100",
    stroke: "#38bdf8",
  },
  quiet: {
    chip: "border-violet-200 bg-violet-50 text-violet-700",
    tile: "bg-violet-50 text-violet-600",
    dot: "bg-violet-400",
    text: "text-violet-600",
    ring: "ring-violet-100",
    stroke: "#a78bfa",
  },
};
