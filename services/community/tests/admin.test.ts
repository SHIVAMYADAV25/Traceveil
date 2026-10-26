import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCleanup } from "../src/jobs/jobs.js";
import { ageAccount, Client, createTestEnv, newMember, roomId, setRole, uid, type TestEnv } from "./helpers.js";

let env: TestEnv;
beforeAll(async () => {
  env = await createTestEnv();
});
afterAll(async () => env.close());

async function admin() {
  const c = await newMember(env);
  await setRole(env, c, "admin");
  return c;
}

describe("people and roles", () => {
  it("searches accounts by handle only, never by display name", async () => {
    const adm = await admin();
    const m = await newMember(env);
    const byHandle = await adm.get(`/admin/accounts?handle=${m.handle.slice(0, 8)}`);
    expect(byHandle.body.accounts.some((a: any) => a.handle === m.handle)).toBe(true);
    const byName = await adm.get(`/admin/accounts?handle=${encodeURIComponent(m.displayName)}`);
    expect(byName.body.accounts).toHaveLength(0);
    expect(JSON.stringify(byHandle.body)).not.toContain(m.displayName);
  });

  it("changes roles with a reason, writes the audit log, and updates live access immediately", async () => {
    const adm = await admin();
    const m = await newMember(env);
    const id = (await env.db.query("SELECT id FROM accounts WHERE handle = $1", [m.handle])).rows[0].id;
    expect((await m.get("/mod/reports")).status).toBe(403);
    expect((await adm.post(`/admin/accounts/${id}/role`, { role: "moderator" })).status).toBe(400); // reason needed
    expect((await adm.post(`/admin/accounts/${id}/role`, { role: "moderator", reason: "Trained volunteer" })).status).toBe(200);
    expect((await m.get("/mod/reports")).status).toBe(200);
    const log = await adm.get("/admin/audit");
    expect(log.body.entries[0]).toMatchObject({ action: "role_changed", reason: "Trained volunteer" });
    expect(log.body.entries[0].target).toContain("member -> moderator");
  });

  it("will not let an admin change their own role; another admin can change it", async () => {
    const one = await admin();
    const two = await admin();
    const oneId = (await env.db.query("SELECT id FROM accounts WHERE handle = $1", [one.handle])).rows[0].id;
    const twoId = (await env.db.query("SELECT id FROM accounts WHERE handle = $1", [two.handle])).rows[0].id;
    const self = await one.post(`/admin/accounts/${oneId}/role`, { role: "member", reason: "stepping down" });
    expect(self.body.error.code).toBe("cannot_change_own_role");
    expect((await one.post(`/admin/accounts/${twoId}/role`, { role: "member", reason: "rotating off" })).status).toBe(200);
    // two is now an ordinary member and cannot use admin tools
    expect((await two.post(`/admin/accounts/${oneId}/role`, { role: "member", reason: "coup attempt" })).status).toBe(403);
  });

  it("reveals the account behind a persona only with a written reason, and records it", async () => {
    const adm = await admin();
    const m = await newMember(env);
    expect((await adm.post("/admin/reveal", { personaId: m.personaId, reason: "short" })).status).toBe(400);
    const r = await adm.post("/admin/reveal", { personaId: m.personaId, reason: "Court order reference 123" });
    expect(r.body).toMatchObject({ deleted: false, handle: m.handle });
    const log = (await adm.get("/admin/audit")).body.entries;
    expect(log[0]).toMatchObject({ action: "reveal_identity", reason: "Court order reference 123" });
    expect(log[0].target).toBe(`persona:${m.personaId}`);
    await m.del("/me", { confirm: "delete my account" });
    expect((await adm.post("/admin/reveal", { personaId: m.personaId, reason: "Checking a deleted account" })).body.deleted).toBe(true);
    const mod = await newMember(env);
    await setRole(env, mod, "moderator");
    expect((await mod.post("/admin/reveal", { personaId: m.personaId, reason: "Moderators cannot do this" })).status).toBe(403);
  });
});

describe("managing spaces and rooms", () => {
  it("creates, edits, locks and archives rooms, and members see the effect", async () => {
    const adm = await admin();
    const slug = `test-space-${Date.now()}`; // spaces are not wiped between runs, so keep it unique
    const s = await adm.post("/admin/spaces", { slug, title: "Test space" });
    expect(s.status).toBe(201);
    expect((await adm.post("/admin/spaces", { slug, title: "Again" })).body.error.code).toBe("slug_taken");
    expect((await adm.post("/admin/spaces", { slug: "Bad Slug!", title: "x" })).status).toBe(400);
    const r = await adm.post(`/admin/spaces/${s.body.id}/rooms`, { slug: "hello", title: "Hello room", slowModeSeconds: 30, language: "hi" });
    expect(r.status).toBe(201);

    const m = await newMember(env);
    await ageAccount(env, m, 24 * 30);
    const view = await m.get(`/rooms/by-slug/${slug}/hello`);
    expect(view.body.room).toMatchObject({ title: "Hello room", slowModeSeconds: 30, language: "hi" });
    expect(view.body.room.posting.allowed).toBe(true);

    await adm.patch(`/admin/rooms/${r.body.id}`, { isLocked: true });
    const locked = (await m.get(`/rooms/${r.body.id}`)).body.room;
    expect(locked.posting.code).toBe("room_locked");
    // changing one setting must leave every other setting alone
    expect(locked).toMatchObject({ title: "Hello room", slowModeSeconds: 30, language: "hi", kind: "chat" });
    expect((await adm.patch(`/admin/rooms/${r.body.id}`, {})).status).toBe(400);

    await adm.patch(`/admin/rooms/${r.body.id}`, { isArchived: true });
    expect((await m.get(`/rooms/${r.body.id}`)).status).toBe(404);
    expect((await adm.get("/admin/spaces")).body.spaces.find((x: any) => x.slug === slug).rooms[0].isArchived).toBe(true);
  });

  it("adds and removes pinned notes", async () => {
    const adm = await admin();
    const rid = await roomId(env, "healing-and-small-wins");
    const n = await adm.post(`/admin/rooms/${rid}/notes`, { title: "What helped me", body: "Share one thing that helped." });
    expect(n.status).toBe(201);
    const m = await newMember(env);
    expect((await m.get(`/rooms/${rid}`)).body.room.notes.map((x: any) => x.title)).toContain("What helped me");
    expect((await adm.del(`/admin/notes/${n.body.id}`)).status).toBe(200);
    expect((await m.get(`/rooms/${rid}`)).body.room.notes.map((x: any) => x.title)).not.toContain("What helped me");
  });

  it("is closed to everyone but admins", async () => {
    const m = await newMember(env);
    const mod = await newMember(env);
    await setRole(env, mod, "moderator");
    for (const c of [m, mod]) {
      expect((await c.post("/admin/spaces", { slug: "nope", title: "Nope" })).status).toBe(403);
      expect((await c.get("/admin/spaces")).status).toBe(403);
      expect((await c.get("/admin/audit")).status).toBe(403);
    }
  });
});

describe("statistics", () => {
  it("returns numbers only, with no message content", async () => {
    const adm = await admin();
    const m = await newMember(env);
    await ageAccount(env, m, 24 * 30);
    await m.post(`/rooms/${await roomId(env, "healing-and-small-wins")}/messages`, { clientMsgId: uid(), body: "a very private sentence" });
    const s = await adm.get("/admin/stats");
    expect(s.body.accounts).toBeGreaterThan(0);
    expect(s.body.messagesLast24Hours).toBeGreaterThan(0);
    expect(JSON.stringify(s.body)).not.toContain("private");
    expect(Object.values(s.body).every((v) => typeof v === "number" || v === null)).toBe(true);
  });
});

describe("cleanup jobs", () => {
  it("deletes expired messages, ends expired restrictions and purges old report snapshots", async () => {
    const m = await newMember(env);
    await ageAccount(env, m, 24 * 30);
    const rid = await roomId(env, "healing-and-small-wins");
    const old = (await m.post(`/rooms/${rid}/messages`, { clientMsgId: uid(), body: "this will expire" })).body.message;
    const fresh = (await m.post(`/rooms/${rid}/messages`, { clientMsgId: uid(), body: "this will stay" })).body.message;
    await env.db.query("UPDATE messages SET expires_at = now() - interval '1 minute' WHERE id = $1", [old.id]);

    const accId = (await env.db.query("SELECT id FROM accounts WHERE handle = $1", [m.handle])).rows[0].id;
    await env.db.query("INSERT INTO restrictions (account_id, kind, reason, ends_at, created_by) VALUES ($1, 'suspend', 'test', now() - interval '1 hour', $1)", [accId]);
    await env.db.query(
      `INSERT INTO reports (reporter_account_id, persona_id, reason, status, context_snapshot, resolved_at, created_at)
       VALUES ($1, $2, 'spam', 'dismissed', '[]'::jsonb, now() - interval '100 days', now() - interval '101 days')`,
      [accId, m.personaId],
    );

    const result = await runCleanup(env.app.ctx);
    expect(result.expiredMessages).toBe(1);
    expect(result.liftedRestrictions).toBe(1);
    expect(result.purgedSnapshots).toBe(1);
    const left = await m.get(`/rooms/${rid}/messages`);
    expect(left.body.messages.map((x: any) => x.id)).toContain(fresh.id);
    expect(left.body.messages.map((x: any) => x.id)).not.toContain(old.id);
    expect((await m.get("/me")).body.restrictions).toHaveLength(0);
  });

  it("keeps a report's frozen context even after the reported message expires", async () => {
    const bad = await newMember(env);
    await ageAccount(env, bad, 24 * 30);
    const victim = await newMember(env);
    const mod = await newMember(env);
    await setRole(env, mod, "moderator");
    const rid = await roomId(env, "healing-and-small-wins");
    const msg = (await bad.post(`/rooms/${rid}/messages`, { clientMsgId: uid(), body: "evidence text" })).body.message;
    const rep = await victim.post(`/messages/${msg.id}/reports`, { reason: "harassment" });
    await env.db.query("UPDATE messages SET expires_at = now() - interval '1 minute' WHERE id = $1", [msg.id]);
    await runCleanup(env.app.ctx);
    const detail = (await mod.get(`/mod/reports/${rep.body.reportId}`)).body.report;
    expect(detail.snapshot.find((x: any) => x.reported).body).toBe("evidence text");
    expect(detail.messageStillVisible).toBe(false);
  });
});

describe("rate limiting", () => {
  it("limits sign-ups and repeated login attempts when enabled", async () => {
    const limited = await createTestEnv({ RATE_LIMIT_ENABLED: "true" });
    try {
      const results: number[] = [];
      for (let i = 0; i < 7; i += 1) results.push((await new Client(limited).post("/auth/register", {})).status);
      expect(results.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
      expect(results.slice(5)).toEqual([429, 429]);
      const tries: number[] = [];
      for (let i = 0; i < 12; i += 1) tries.push((await new Client(limited).post("/auth/login", { handle: "nobody-here-0000", secret: "x" })).status);
      expect(tries.filter((s) => s === 429).length).toBeGreaterThan(0);
      const rl = await new Client(limited).post("/auth/register", {});
      expect(rl.body.error.code).toBe("rate_limited");
    } finally {
      await limited.close();
    }
  });
});
