import type { WebSocket } from "ws";
import type { Role } from "../config/constants.js";
import { STAFF_ROLES } from "../config/constants.js";
import type { ServerEvent } from "./events.js";

export interface HubClient {
  accountId: string;
  personaId: string;
  role: Role;
  socket: WebSocket;
  rooms: Set<string>;
  /** Personas this person has blocked. Their messages are never pushed to this client. */
  blocked: Set<string>;
}

/**
 * What the rest of the service may do with live connections.
 * The in-memory Hub below implements it for a single instance.
 * A Redis-backed version could replace it without changing any module.
 */
export interface Realtime {
  broadcastRoom(roomId: string, event: ServerEvent, authorPersonaId?: string): void;
  sendToAccount(accountId: string, event: ServerEvent): void;
  setBlocked(accountId: string, personaIds: Iterable<string>): void;
  disconnectAccount(accountId: string): void;
}

export class Hub implements Realtime {
  private readonly clients = new Set<HubClient>();
  private readonly byRoom = new Map<string, Set<HubClient>>();
  private readonly byAccount = new Map<string, Set<HubClient>>();

  add(client: HubClient): void {
    this.clients.add(client);
    let set = this.byAccount.get(client.accountId);
    if (!set) this.byAccount.set(client.accountId, (set = new Set()));
    set.add(client);
  }

  remove(client: HubClient): void {
    this.clients.delete(client);
    this.byAccount.get(client.accountId)?.delete(client);
    if (this.byAccount.get(client.accountId)?.size === 0) this.byAccount.delete(client.accountId);
    for (const roomId of client.rooms) this.unsubscribe(client, roomId);
  }

  subscribe(client: HubClient, roomId: string): void {
    client.rooms.add(roomId);
    let set = this.byRoom.get(roomId);
    if (!set) this.byRoom.set(roomId, (set = new Set()));
    set.add(client);
  }

  unsubscribe(client: HubClient, roomId: string): void {
    client.rooms.delete(roomId);
    const set = this.byRoom.get(roomId);
    set?.delete(client);
    if (set && set.size === 0) this.byRoom.delete(roomId);
  }

  broadcastRoom(roomId: string, event: ServerEvent, authorPersonaId?: string): void {
    const set = this.byRoom.get(roomId);
    if (!set) return;
    const payload = JSON.stringify(event);
    for (const client of set) {
      if (authorPersonaId && client.blocked.has(authorPersonaId)) continue;
      this.write(client, payload);
    }
  }

  sendToAccount(accountId: string, event: ServerEvent): void {
    const set = this.byAccount.get(accountId);
    if (!set) return;
    const payload = JSON.stringify(event);
    for (const client of set) this.write(client, payload);
  }

  /** Send to every connected moderator and admin. */
  sendToStaff(event: ServerEvent): void {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (STAFF_ROLES.includes(client.role)) this.write(client, payload);
    }
  }

  setBlocked(accountId: string, personaIds: Iterable<string>): void {
    const next = new Set(personaIds);
    for (const client of this.byAccount.get(accountId) ?? []) client.blocked = next;
  }

  setRole(accountId: string, role: Role): void {
    for (const client of this.byAccount.get(accountId) ?? []) client.role = role;
  }

  disconnectAccount(accountId: string): void {
    for (const client of [...(this.byAccount.get(accountId) ?? [])]) {
      client.socket.close(4001, "signed_out");
    }
  }

  connectionCount(): number {
    return this.clients.size;
  }

  roomSubscriberCount(roomId: string): number {
    return this.byRoom.get(roomId)?.size ?? 0;
  }

  closeAll(): void {
    for (const client of [...this.clients]) client.socket.close(1001, "server_shutdown");
  }

  private write(client: HubClient, payload: string): void {
    // 1 === OPEN. Ignore sockets that are closing.
    if (client.socket.readyState === 1) client.socket.send(payload);
  }
}
