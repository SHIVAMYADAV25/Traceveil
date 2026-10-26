import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ageAccount, newMember, roomId, setRole, uid, type Client, type TestEnv, createTestEnv } from "./helpers.js";

let env: TestEnv;
let room: string; // safety-and-privacy: no slow mode
beforeAll(async () => {
  env = await createTestEnv();
  room = await roomId(env, "safety-and-privacy");
});
afterAll(async () => env.close());

const say = (c: Client, body: string, extra: Record<string, unknown> = {}, rid?: string) =>
  c.post(`/rooms/${rid ?? room}/messages`, { clientMsgId: uid(), body, ...extra });

async function oldMember(): Promise<Client> {
  const c = await newMember(env);
  await ageAccount(env, c, 24 * 30);
  return c;
}

describe("posting and reading", () => {
  it("lists spaces and rooms with the seeded structure", async () => {
    const c = await newMember(env);
    const r = await c.get("/spaces");
    expect(r.status).toBe(200);
    expect(r.body.spaces.map((s: any) => s.slug)).toContain("start-here");
    const rooms = r.body.spaces.flatMap((s: any) => s.rooms);
    expect(rooms.length).toBeGreaterThanOrEqual(20);
    expect(rooms.find((x: any) => x.slug === "rules-and-safety").kind).toBe("announcements");
    expect(rooms.map((x: any) => x.slug)).not.toContain("quiet-room"); // earlier channels are retired
    expect(r.body.spaces.map((s: any) => s.slug)).not.toContain("healing");
  });

  it("posts a message and returns it with its author, then lists it", async () => {
    const a = await oldMember();
    const r = await say(a, "  Hello, this is hard today.  ");
    expect(r.status).toBe(201);
    expect(r.body.message.body).toBe("Hello, this is hard today.");
    expect(r.body.message.author.displayName).toBe(a.displayName);
    const list = await a.get(`/rooms/${room}/messages`);
    expect(list.body.messages.at(-1).body).toBe("Hello, this is hard today.");
  });

  it("rejects empty and over-long messages and bad ids", async () => {
    const a = await oldMember();
    expect((await say(a, "   ")).status).toBe(400);
    expect((await say(a, "x".repeat(2001))).status).toBe(400);
    expect((await a.post(`/rooms/${room}/messages`, { clientMsgId: "nope", body: "hi" })).status).toBe(400);
    expect((await a.get(`/rooms/not-a-uuid/messages`)).status).toBe(400);
    expect((await a.get(`/rooms/${uid()}/messages`)).status).toBe(404);
  });

  it("is idempotent: retrying the same client id does not post twice", async () => {
    const a = await oldMember();
    const id = uid();
    const first = await a.post(`/rooms/${room}/messages`, { clientMsgId: id, body: "once only" });
    const again = await a.post(`/rooms/${room}/messages`, { clientMsgId: id, body: "once only" });
    expect(first.status).toBe(201);
    expect(again.status).toBe(200);
    expect(again.body.message.id).toBe(first.body.message.id);
    const { rows } = await env.db.query("SELECT count(*)::int n FROM messages WHERE client_msg_id = $1", [id]);
    expect(rows[0].n).toBe(1);
  });

  it("pages through history with a cursor", async () => {
    const a = await oldMember();
    const rid = await roomId(env, "healing-and-small-wins");
    for (let i = 1; i <= 5; i += 1) await say(a, `note ${i}`, {}, rid);
    const p1 = await a.get(`/rooms/${rid}/messages?limit=3`);
    expect(p1.body.messages.map((m: any) => m.body)).toEqual(["note 3", "note 4", "note 5"]);
    expect(p1.body.hasMore).toBe(true);
    const p2 = await a.get(`/rooms/${rid}/messages?limit=3&before=${p1.body.messages[0].id}`);
    expect(p2.body.messages.map((m: any) => m.body)).toEqual(["note 1", "note 2"]);
    expect(p2.body.hasMore).toBe(false);
  });

  it("stores plain text only (markup is returned as text, not interpreted)", async () => {
    const a = await oldMember();
    const r = await say(a, "<img src=x onerror=alert(1)> **bold**");
    expect(r.body.message.body).toBe("<img src=x onerror=alert(1)> **bold**");
  });
});

describe("rules about who can post where", () => {
  it("requires onboarding before posting", async () => {
    const c = await newMember(env, { onboard: false });
    const r = await say(c, "hi");
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("onboarding_required");
  });

  it("keeps announcements and the quiet room staff-only, and lets staff post", async () => {
    const m = await oldMember();
    const ann = await roomId(env, "announcements");
    // No quiet room is seeded any more; admins can still create one, so make one here.
    const sp = (await env.db.query("SELECT id FROM spaces WHERE slug = 'start-here'")).rows[0].id;
    await env.db.query("INSERT INTO rooms (space_id, slug, title, kind) VALUES ($1, 'test-quiet', 'test-quiet', 'quiet') ON CONFLICT DO NOTHING", [sp]);
    const quiet = await roomId(env, "test-quiet");
    expect((await say(m, "hi", {}, ann)).body.error.code).toBe("staff_only_room");
    expect((await say(m, "hi", {}, quiet)).body.error.code).toBe("staff_only_room");
    const mod = await oldMember();
    await setRole(env, mod, "moderator");
    const mod2 = await newMember(env);
    await setRole(env, mod2, "moderator");
    expect((await say(mod2, "Welcome everyone", {}, ann)).status).toBe(201);
    expect((await say(mod2, "A story to read", {}, quiet)).status).toBe(201);
  });

  it("closes chat rooms for members when the Community is not open, but not for staff", async () => {
    const closed = await createTestEnv({ COMMUNITY_OPEN: "false" });
    try {
      const m = await newMember(closed);
      const rid = await roomId(closed, "ask-for-help");
      const r = await m.post(`/rooms/${rid}/messages`, { clientMsgId: uid(), body: "hi" });
      expect(r.status).toBe(403);
      expect(r.body.error.code).toBe("community_closed");
      const s = await newMember(closed);
      await setRole(closed, s, "moderator");
      expect((await s.post(`/rooms/${rid}/messages`, { clientMsgId: uid(), body: "hi team" })).status).toBe(201);
      const room = await m.get(`/rooms/${rid}`);
      expect(room.body.room.posting.allowed).toBe(false);
    } finally {
      await closed.close();
    }
  });

  it("enforces minimum account age and locked rooms", async () => {
    const m = await newMember(env);
    await env.db.query("UPDATE rooms SET min_account_age_hours = 48 WHERE id = $1", [room]);
    expect((await say(m, "hi")).body.error.code).toBe("account_too_new");
    await env.db.query("UPDATE rooms SET min_account_age_hours = 0, is_locked = true WHERE id = $1", [room]);
    expect((await say(await oldMember(), "hi")).body.error.code).toBe("room_locked");
    await env.db.query("UPDATE rooms SET is_locked = false WHERE id = $1", [room]);
  });

  it("applies slow mode and the new-account cooldown, but not to staff", async () => {
    const m = await newMember(env); // brand new: 10 second cooldown
    expect((await say(m, "first")).status).toBe(201);
    const second = await say(m, "second");
    expect(second.status).toBe(429);
    expect(second.body.error.code).toBe("slow_mode");
    expect(second.body.error.details.retryAfterSeconds).toBeGreaterThan(0);

    const s = await newMember(env);
    await setRole(env, s, "moderator");
    expect((await say(s, "one")).status).toBe(201);
    expect((await say(s, "two")).status).toBe(201);
  });

  it("blocks repeating the exact same message", async () => {
    const m = await oldMember();
    expect((await say(m, "same words")).status).toBe(201);
    const dup = await say(m, "Same Words");
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("duplicate_message");
  });
});

describe("content guards", () => {
  it("never allows links to blocked leak sites, even for older accounts", async () => {
    const blocked = [...env.app.ctx.blockedDomains][0] as string;
    const m = await oldMember();
    const r = await say(m, `see https://${blocked}/video`);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("blocked_link");
  });

  it("stops accounts under 7 days from posting links; older accounts may", async () => {
    const fresh = await newMember(env);
    const r = await say(fresh, "try example.org");
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("links_not_allowed_yet");
    const old = await oldMember();
    expect((await say(old, "try https://example.org")).status).toBe(201);
  });

  it("asks before sharing personal details, and posts once confirmed", async () => {
    const m = await oldMember();
    const ask = await say(m, "you can call me on 9876543210");
    expect(ask.status).toBe(409);
    expect(ask.body.error.code).toBe("confirm_personal_details");
    expect(ask.body.error.details.kinds).toContain("phone");
    const ok = await say(m, "you can call me on 9876543210", { confirmShare: true });
    expect(ok.status).toBe(201);
  });

  it("shows support privately for crisis language and still posts the message", async () => {
    const m = await oldMember();
    const r = await say(m, "some days I want to die");
    expect(r.status).toBe(201);
    expect(r.body.support).toBe(true);
    const calm = await say(m, "a calmer day today");
    expect(calm.body.support).toBe(false);
    const { rows } = await env.db.query("SELECT count(*)::int n FROM reports");
    expect(rows[0].n).toBe(0); // never auto-reported
  });
});

describe("replies, mentions, content warnings and tags", () => {
  it("replies show who and what is replied to, and notify the author", async () => {
    const a = await oldMember();
    const b = await oldMember();
    const orig = await say(a, "Has anyone reported to the police?");
    const reply = await say(b, "Yes, ask me anything", { replyToId: orig.body.message.id });
    expect(reply.body.message.replyTo.authorName).toBe(a.displayName);
    expect(reply.body.message.replyTo.excerpt).toBe("Has anyone reported to the police?");
    const n = await a.get("/notifications");
    expect(n.body.notifications[0].kind).toBe("reply");
    expect(n.body.notifications[0].payload.fromName).toBe(b.displayName);
    expect(n.body.unread).toBeGreaterThan(0);
  });

  it("rejects a reply to a message from another room", async () => {
    const a = await oldMember();
    const other = await roomId(env, "healing-and-small-wins");
    const orig = await say(a, "elsewhere", {}, other);
    const r = await say(a, "cross-room reply", { replyToId: orig.body.message.id });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("invalid_reply");
  });

  it("mentions only people recently active in the room, notifies them, and caps the number", async () => {
    const a = await oldMember();
    const b = await oldMember();
    const lurker = await oldMember();
    await say(b, "I am here");
    const ok = await say(a, `thank you @${b.displayName}`, { mentions: [b.personaId] });
    expect(ok.status).toBe(201);
    expect(ok.body.message.mentions[0].personaId).toBe(b.personaId);
    expect((await b.get("/notifications")).body.notifications.some((n: any) => n.kind === "mention")).toBe(true);
    const bad = await say(a, "hello @lurker", { mentions: [lurker.personaId] });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("invalid_mention");
    const many = await say(a, "everyone", { mentions: Array.from({ length: 6 }, () => uid()) });
    expect(many.status).toBe(400);
  });

  it("stores need tags and content warnings, and rejects unknown tags", async () => {
    const a = await oldMember();
    const r = await say(a, "this includes a hard detail", { needTag: "listen", contentWarning: "Mentions how it began" });
    expect(r.body.message.needTag).toBe("listen");
    expect(r.body.message.contentWarning).toBe("Mentions how it began");
    expect((await say(a, "x", { needTag: "mock" })).status).toBe(400);
  });
});

describe("reactions", () => {
  it("adds and removes supportive reactions, with counts and 'mine'", async () => {
    const a = await oldMember();
    const b = await oldMember();
    const m = (await say(a, "I removed one link today")).body.message;
    expect((await b.put(`/messages/${m.id}/reactions/strength`)).body.count).toBe(1);
    expect((await a.put(`/messages/${m.id}/reactions/strength`)).body.count).toBe(2);
    await b.put(`/messages/${m.id}/reactions/strength`); // repeating does nothing
    const view = (await b.get(`/rooms/${room}/messages`)).body.messages.find((x: any) => x.id === m.id);
    expect(view.reactions).toEqual([{ kind: "strength", count: 2, mine: true }]);
    expect((await b.del(`/messages/${m.id}/reactions/strength`)).body.count).toBe(1);
  });

  it("only offers the curated set: no mocking or negative reactions", async () => {
    const a = await oldMember();
    const m = (await say(a, "hello")).body.message;
    for (const bad of ["laugh", "thumbs_down", "angry"]) {
      expect((await a.put(`/messages/${m.id}/reactions/${bad}`)).status).toBe(400);
    }
  });
});

describe("blocking", () => {
  it("hides a blocked person's messages from the list, and can be undone", async () => {
    const a = await oldMember();
    const b = await oldMember();
    const rid = await roomId(env, "scan-questions");
    await say(a, "from A", {}, rid);
    await say(b, "from B", {}, rid);
    expect((await a.post("/blocks", { personaId: b.personaId })).status).toBe(200);
    const seen = (await a.get(`/rooms/${rid}/messages`)).body.messages.map((m: any) => m.body);
    expect(seen).toContain("from A");
    expect(seen).not.toContain("from B");
    expect((await a.get("/blocks")).body.blocked[0].personaId).toBe(b.personaId);
    await a.del(`/blocks/${b.personaId}`);
    expect((await a.get(`/rooms/${rid}/messages`)).body.messages.map((m: any) => m.body)).toContain("from B");
  });

  it("does not notify someone who blocked the author, and staff cannot be blocked", async () => {
    const a = await oldMember();
    const b = await oldMember();
    const mod = await newMember(env);
    await setRole(env, mod, "moderator");
    await a.post("/blocks", { personaId: b.personaId });
    const orig = await say(a, "question");
    await say(b, "answer", { replyToId: orig.body.message.id });
    expect((await a.get("/notifications")).body.notifications.filter((n: any) => n.kind === "reply")).toHaveLength(0);
    expect((await a.post("/blocks", { personaId: mod.personaId })).body.error.code).toBe("cannot_block_staff");
    expect((await a.post("/blocks", { personaId: a.personaId })).body.error.code).toBe("cannot_block_self");
  });
});

describe("editing and deleting", () => {
  it("lets authors edit and delete only their own messages", async () => {
    const a = await oldMember();
    const b = await oldMember();
    const m = (await say(a, "first draft")).body.message;
    expect((await b.patch(`/messages/${m.id}`, { body: "hijack" })).status).toBe(404);
    expect((await b.del(`/messages/${m.id}`)).status).toBe(404);
    const edited = await a.patch(`/messages/${m.id}`, { body: "better words" });
    expect(edited.body.message.body).toBe("better words");
    expect(edited.body.message.editedAt).not.toBeNull();
    expect((await a.del(`/messages/${m.id}`)).status).toBe(200);
    const view = (await b.get(`/rooms/${room}/messages`)).body.messages.find((x: any) => x.id === m.id);
    expect(view.status).toBe("deleted_by_author");
    expect(view.body).toBeNull();
    const { rows } = await env.db.query("SELECT body FROM messages WHERE id = $1", [m.id]);
    expect(rows[0].body).toBe(""); // the words are really gone
    expect((await a.patch(`/messages/${m.id}`, { body: "again" })).status).toBe(403);
  });

  it("applies the same guards when editing", async () => {
    const a = await oldMember();
    const m = (await say(a, "plain")).body.message;
    const r = await a.patch(`/messages/${m.id}`, { body: "write to me@example.com" });
    expect(r.status).toBe(409);
  });
});

describe("read markers and muting", () => {
  it("counts unread messages from others and clears them once read", async () => {
    const a = await oldMember();
    const b = await oldMember();
    const rid = await roomId(env, "getting-started");
    const m1 = (await say(b, "one", {}, rid)).body.message;
    const m2 = (await say(b, "two", {}, rid)).body.message;
    const unread = async () =>
      (await a.get("/spaces")).body.spaces.flatMap((s: any) => s.rooms).find((r: any) => r.id === rid).unread;
    expect(await unread()).toBe(2);
    await a.post(`/rooms/${rid}/read`, { messageId: m1.id });
    expect(await unread()).toBe(1);
    await a.post(`/rooms/${rid}/read`, { messageId: m2.id });
    expect(await unread()).toBe(0);
    expect((await a.put(`/rooms/${rid}/mute`, { muted: true })).body.muted).toBe(true);
  });
});

describe("notifications", () => {
  it("lists, counts and marks notifications read", async () => {
    const a = await oldMember();
    const b = await oldMember();
    const o = (await say(a, "hello")).body.message;
    await say(b, "hi back", { replyToId: o.id });
    const before = await a.get("/notifications?unread=true");
    expect(before.body.unread).toBe(1);
    const done = await a.post("/notifications/read", { all: true });
    expect(done.body.unread).toBe(0);
    expect((await a.get("/me")).body.unreadNotifications).toBe(0);
  });
});
