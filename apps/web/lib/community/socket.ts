import { websocketUrl } from "./api";
import type { ServerEvent } from "./types";

export type SocketStatus = "connecting" | "open" | "reconnecting" | "closed";
type EventHandler = (e: ServerEvent) => void;
type StatusHandler = (s: SocketStatus, reconnected: boolean) => void;

/**
 * One live connection. It reconnects on its own with a growing pause, re-joins the rooms it was
 * in, and tells the screen when it has come back so missed messages can be fetched again.
 */
export class CommunitySocket {
  private ws: WebSocket | null = null;
  private rooms = new Set<string>();
  private eventHandlers = new Set<EventHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private attempt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private everOpened = false;
  status: SocketStatus = "connecting";

  onEvent(fn: EventHandler) { this.eventHandlers.add(fn); return () => { this.eventHandlers.delete(fn); }; }
  onStatus(fn: StatusHandler) { this.statusHandlers.add(fn); return () => { this.statusHandlers.delete(fn); }; }

  connect() {
    this.stopped = false;
    this.open();
  }

  private setStatus(s: SocketStatus, reconnected = false) {
    this.status = s;
    this.statusHandlers.forEach((h) => h(s, reconnected));
  }

  private open() {
    if (this.stopped) return;
    this.setStatus(this.everOpened ? "reconnecting" : "connecting");
    const ws = new WebSocket(websocketUrl());
    this.ws = ws;
    ws.onopen = () => {
      const reconnected = this.everOpened;
      this.everOpened = true;
      this.attempt = 0;
      this.rooms.forEach((roomId) => this.send({ type: "subscribe", roomId }));
      this.setStatus("open", reconnected);
    };
    ws.onmessage = (m) => {
      try {
        const event = JSON.parse(String(m.data)) as ServerEvent;
        this.eventHandlers.forEach((h) => h(event));
      } catch { /* ignore a malformed frame */ }
    };
    ws.onclose = (e) => {
      this.ws = null;
      if (this.stopped) return;
      // 4001 = signed out, 4401 = not signed in: do not keep retrying.
      if (e.code === 4001 || e.code === 4401) { this.setStatus("closed"); return; }
      this.setStatus("reconnecting");
      const wait = Math.min(30000, 1000 * 2 ** this.attempt++) + Math.random() * 500;
      this.timer = setTimeout(() => this.open(), wait);
    };
    ws.onerror = () => ws.close();
  }

  private send(obj: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  subscribe(roomId: string) { this.rooms.add(roomId); this.send({ type: "subscribe", roomId }); }
  unsubscribe(roomId: string) { this.rooms.delete(roomId); this.send({ type: "unsubscribe", roomId }); }

  close() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
    this.setStatus("closed");
  }
}
