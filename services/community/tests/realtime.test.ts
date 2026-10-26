import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { ageAccount, createTestEnv, newMember, ORIGIN, roomId, uid, type Client, type TestEnv } from "./helpers.js";

let env: TestEnv;
let port: number;
let room: string;

beforeAll(async () => {
  env = await createTestEnv();
  await env.app.listen({ port: 0, host: "127.0.0.1" });
  port = (env.app.server.address() as AddressInfo).port;
  room = await roomId(env, "safety-and-privacy");
});
afterAll(async () => env.close());

async function oldMember(): Promise<Client> {
  const c = await newMember(env);
  await ageAccount(env, c, 24 * 30);
  return c;
}

interface Live {
  ws: WebSocket;
  events: Array<{ type: string; data: any }>;
  waitFor(type: string, ms?: number): Promise<{ type: string; data: any }>;
  send(obj: unknown): void;
  close(): void;
}

function connect(client: Client, origin: string | null = ORIGIN): Promise<Live> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/community/ws`, {
      headers: { cookie: client.cookie, ...(origin ? { origin } : {}) },
    });
    const events: Live["events"] = [];
    const waiters: Array<{ type: string; resolve: (e: any) => void }> = [];
    ws.on("message", (raw) => {
      const ev = JSON.parse(raw.toString());
      events.push(ev);
      const i = waiters.findIndex((w) => w.type === ev.type);
      if (i >= 0) waiters.splice(i, 1)[0]?.resolve(ev);
    });
    const live: Live = {
      ws,
      events,
      waitFor: (type, ms = 3000) =>
        new Promise((res, rej) => {
          const found = events.find((e) => e.type === type);
          if (found) return res(found);
          const t = setTimeout(() => rej(new Error(`timed out waiting for ${type}; got ${events.map((e) => e.type)}`)), ms);
          waiters.push({ type, resolve: (e) => (clearTimeout(t), res(e)) });
        }),
      send: (o) => ws.send(JSON.stringify(o)),
      close: () => ws.close(),
    };
    ws.on("open", () => resolve(live));
    ws.on("unexpected-response", (_req, res) => reject(new Error(`HTTP ${res.statusCode}`)));
    ws.on("error", reject);
  });
}

async function subscribed(live: Live, roomId: string) {
  live.send({ type: "subscribe", roomId });
  await live.waitFor("subscribed");
}

describe("websocket", () => {
  it("refuses connections without a session, or from a foreign origin", async () => {
    const anon = await newMember(env);
    anon.cookie = "";
    await expect(connect(anon)).rejects.toThrow(/401/);
    const member = await oldMember();
    await expect(connect(member, "https://evil.example")).rejects.toThrow(/403/);
    await expect(connect(member, null)).rejects.toThrow(/403/);
  });

  it("delivers a posted message live to everyone subscribed to the room, and only them", async () => {
    const a = await oldMember();
    const b = await oldMember();
    const c = await oldMember();
    const la = await connect(a);
    const lb = await connect(b);
    const lc = await connect(c);
    await la.waitFor("ready");
    await subscribed(la, room);
    await subscribed(lb, room);
    await subscribed(lc, await roomId(env, "healing-and-small-wins")); // different room

    const posted = await a.post(`/rooms/${room}/messages`, { clientMsgId: uid(), body: "live hello" });
    const got = await lb.waitFor("message.created");
    expect(got.data.message.body).toBe("live hello");
    expect(got.data.message.id).toBe(posted.body.message.id);
    await la.waitFor("message.created"); // the author's other tabs also get it
    await new Promise((r) => setTimeout(r, 200));
    expect(lc.events.some((e) => e.type === "message.created")).toBe(false);
    [la, lb, lc].forEach((l) => l.close());
  });

  it("does not push messages from a blocked person", async () => {
    const a = await oldMember();
    const b = await oldMember();
    const la = await connect(a);
    await subscribed(la, room);
    await a.post("/blocks", { personaId: b.personaId });
    await b.post(`/rooms/${room}/messages`, { clientMsgId: uid(), body: "you should not see this" });
    await new Promise((r) => setTimeout(r, 300));
    expect(la.events.some((e) => e.type === "message.created")).toBe(false);
    la.close();
  });

  it("pushes reactions, edits, deletions and notifications", async () => {
    const a = await oldMember();
    const b = await oldMember();
    const la = await connect(a);
    const lb = await connect(b);
    await subscribed(la, room);
    await subscribed(lb, room);
    const m = (await a.post(`/rooms/${room}/messages`, { clientMsgId: uid(), body: "original" })).body.message;

    await b.put(`/messages/${m.id}/reactions/hug`);
    const r = await la.waitFor("reaction.changed");
    expect(r.data).toMatchObject({ messageId: m.id, kind: "hug", added: true, count: 1, personaId: b.personaId });

    await a.patch(`/messages/${m.id}`, { body: "changed" });
    expect((await lb.waitFor("message.updated")).data.message.body).toBe("changed");

    await b.post(`/rooms/${room}/messages`, { clientMsgId: uid(), body: "replying", replyToId: m.id });
    const n = await la.waitFor("notification.created");
    expect(n.data.notification.kind).toBe("reply");

    await a.del(`/messages/${m.id}`);
    expect((await lb.waitFor("message.deleted")).data.messageId).toBe(m.id);
    la.close();
    lb.close();
  });

  it("rejects bad client messages and unknown rooms without closing the connection", async () => {
    const a = await oldMember();
    const la = await connect(a);
    await la.waitFor("ready");
    la.ws.send("not json");
    expect((await la.waitFor("error")).data.code).toBe("invalid_message");
    la.events.length = 0;
    la.send({ type: "subscribe", roomId: uid() });
    expect((await la.waitFor("error")).data.code).toBe("not_found");
    la.events.length = 0;
    la.send({ type: "ping" });
    expect((await la.waitFor("pong")).type).toBe("pong");
    la.close();
  });

  it("handles a subscribe sent the instant the socket opens (regression: early messages were dropped)", async () => {
    const members = await Promise.all(Array.from({ length: 15 }, () => oldMember()));
    const lives = await Promise.all(members.map((m) => connect(m)));
    for (const live of lives) live.send({ type: "subscribe", roomId: room }); // no waiting for "ready"
    await Promise.all(lives.map((l) => l.waitFor("subscribed")));
    expect(env.hub.roomSubscriberCount(room)).toBe(15);
    lives.forEach((l) => l.close());
    await new Promise((r) => setTimeout(r, 300));
  });

  it("removes closed connections from the hub", async () => {
    const a = await oldMember();
    const la = await connect(a);
    await subscribed(la, room);
    expect(env.hub.roomSubscriberCount(room)).toBe(1);
    la.close();
    await new Promise((r) => setTimeout(r, 300));
    expect(env.hub.roomSubscriberCount(room)).toBe(0);
    expect(env.hub.connectionCount()).toBe(0);
  });

  it("disconnects live sockets when the person signs out", async () => {
    const a = await oldMember();
    const la = await connect(a);
    await la.waitFor("ready");
    const closed = new Promise<number>((res) => la.ws.on("close", (code) => res(code)));
    await a.post("/auth/logout");
    expect(await closed).toBe(4001);
  });
});
