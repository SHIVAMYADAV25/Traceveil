const TIME = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const DAY = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" });

export const formatTime = (iso: string): string => TIME.format(new Date(iso));

export function formatDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return DAY.format(d);
}

export function formatAge(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function formatUntil(iso: string | null): string {
  if (!iso) return "until an admin reviews it";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "ending now";
  const h = Math.ceil(ms / 3_600_000);
  if (h < 48) return `for about ${h} more hour${h === 1 ? "" : "s"}`;
  return `for about ${Math.ceil(h / 24)} more days`;
}

export const sameDay = (a: string, b: string): boolean => new Date(a).toDateString() === new Date(b).toDateString();
