const KEY = "community:last-room";
const DEFAULT_ROOM = "/community/start-here/welcome-and-rules";

/** Remember which room someone was in, so they return to where they stopped. Not personal data. */
export function rememberRoom(path: string): void {
  try { window.localStorage.setItem(KEY, path); } catch { /* storage may be blocked */ }
}
export function lastRoomPath(): string {
  try {
    const v = window.localStorage.getItem(KEY);
    return v && /^\/community\/[a-z0-9-]+\/[a-z0-9-]+$/.test(v) ? v : DEFAULT_ROOM;
  } catch { return DEFAULT_ROOM; }
}
