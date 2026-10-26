import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, createTestEnv, newMember, type TestEnv } from "./helpers.js";

let env: TestEnv;
beforeAll(async () => {
  env = await createTestEnv();
});
afterAll(async () => env.close());

describe("registration and sign-in", () => {
  it("needs no age or any other detail to sign up, and records none", async () => {
    const c = new Client(env);
    const r = await c.post("/auth/register", {});
    expect(r.status).toBe(201);
    const { rows } = await env.db.query("SELECT age_confirmed_at FROM accounts WHERE handle = $1", [r.body.handle]);
    expect(rows[0].age_confirmed_at).toBeNull();
  });

  it("creates an account with a generated handle, name and one-time recovery phrase", async () => {
    const c = new Client(env);
    const r = await c.post("/auth/register", {});
    expect(r.status).toBe(201);
    expect(r.body.handle).toMatch(/^[a-z]+-[a-z]+-\d{4}$/);
    expect(r.body.recoveryPhrase.split(" ")).toHaveLength(8);
    expect(r.body.displayName).toMatch(/\w+ \w+/);
    expect(c.cookie).toContain("community_session=");
    // the phrase is never stored in readable form
    const { rows } = await env.db.query("SELECT recovery_hash FROM accounts WHERE handle = $1", [r.body.handle]);
    expect(rows[0].recovery_hash).toMatch(/^\$argon2id\$/);
    expect(rows[0].recovery_hash).not.toContain(r.body.recoveryPhrase.split(" ")[0] + " ");
  });

  it("stores only a hash of the session token", async () => {
    const c = await newMember(env);
    const token = c.cookie.split("=")[1] as string;
    const { rows } = await env.db.query("SELECT token_hash FROM sessions");
    expect(rows.some((r) => r.token_hash === token)).toBe(false);
  });

  it("sets an HttpOnly, SameSite cookie", async () => {
    const res = await env.app.inject({
      method: "POST",
      url: "/api/community/auth/register",
      headers: { origin: "http://localhost:3000", "x-community-client": "web", "content-type": "application/json" },
      payload: JSON.stringify({}),
    });
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it("signs back in with the recovery phrase (extra spaces and capitals are fine)", async () => {
    const a = await newMember(env);
    const b = new Client(env);
    const r = await b.post("/auth/login", { handle: a.handle.toUpperCase(), secret: `  ${a.phrase.toUpperCase()}  ` });
    expect(r.status).toBe(200);
    expect((await b.get("/me")).status).toBe(200);
  });

  it("signs in with an optional password too", async () => {
    const c = new Client(env);
    const reg = await c.post("/auth/register", { password: "a long password 123" });
    const d = new Client(env);
    expect((await d.post("/auth/login", { handle: reg.body.handle, secret: "a long password 123" })).status).toBe(200);
    expect((await new Client(env).post("/auth/login", { handle: reg.body.handle, secret: "wrong password" })).status).toBe(401);
  });

  it("gives the same answer for an unknown handle and a wrong secret", async () => {
    const a = await newMember(env);
    const wrong = await new Client(env).post("/auth/login", { handle: a.handle, secret: "nope nope" });
    const unknown = await new Client(env).post("/auth/login", { handle: "nobody-here-0000", secret: "nope nope" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it("locks the account for a while after repeated failures", async () => {
    const a = await newMember(env);
    for (let i = 0; i < 8; i += 1) {
      expect((await new Client(env).post("/auth/login", { handle: a.handle, secret: "bad" })).status).toBe(401);
    }
    const locked = await new Client(env).post("/auth/login", { handle: a.handle, secret: a.phrase });
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe("account_locked");
  });

  it("logout ends the session", async () => {
    const c = await newMember(env);
    expect((await c.get("/me")).status).toBe(200);
    const old = c.cookie;
    await c.post("/auth/logout");
    const replay = new Client(env);
    replay.cookie = old;
    expect((await replay.get("/me")).status).toBe(401);
  });
});

describe("request protection", () => {
  it("refuses changes without the client header or from a foreign origin", async () => {
    const noHeader = await env.app.inject({
      method: "POST",
      url: "/api/community/auth/register",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      payload: JSON.stringify({}),
    });
    expect(noHeader.statusCode).toBe(403);
    const foreign = await env.app.inject({
      method: "POST",
      url: "/api/community/auth/register",
      headers: { origin: "https://evil.example", "x-community-client": "web", "content-type": "application/json" },
      payload: JSON.stringify({}),
    });
    expect(foreign.statusCode).toBe(403);
  });

  it("requires sign-in for protected routes", async () => {
    const c = new Client(env);
    expect((await c.get("/me")).status).toBe(401);
    expect((await c.get("/spaces")).status).toBe(401);
    expect((await c.get("/notifications")).status).toBe(401);
  });

  it("returns errors without internals", async () => {
    const c = new Client(env);
    const r = await c.post("/auth/login", { handle: "x" });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).not.toMatch(/stack|node_modules|at /);
  });
});

describe("onboarding, names and account deletion", () => {
  it("accepts rules and an optional custom name; names are unique", async () => {
    const a = await newMember(env, { displayName: "Maple Dawn" });
    expect(a.displayName).toBe("Maple Dawn");
    const b = await newMember(env, { onboard: false });
    const clash = await b.post("/me/onboarding", { acceptRules: true, displayName: "maple dawn" });
    expect(clash.status).toBe(409);
    const reserved = await b.patch("/me/persona", { displayName: "Admin" });
    expect(reserved.status).toBe(400);
  });

  it("does not accept onboarding without the rules", async () => {
    const b = await newMember(env, { onboard: false });
    expect((await b.post("/me/onboarding", { acceptRules: false })).status).toBe(400);
  });

  it("deletes an account but keeps its messages, shown as Deleted member", async () => {
    const a = await newMember(env);
    const room = (await a.get("/rooms/by-slug/victim-support/ask-for-help")).body.room;
    const sent = await a.post(`/rooms/${room.id}/messages`, { clientMsgId: crypto.randomUUID(), body: "hello everyone" });
    expect(sent.status).toBe(201);
    const bad = await a.del("/me", { confirm: "yes" });
    expect(bad.status).toBe(400);
    expect((await a.del("/me", { confirm: "delete my account" })).status).toBe(200);
    expect((await new Client(env).post("/auth/login", { handle: a.handle, secret: a.phrase })).status).toBe(401);

    const b = await newMember(env);
    const list = await b.get(`/rooms/${room.id}/messages`);
    const m = list.body.messages.find((x: any) => x.body === "hello everyone");
    expect(m.author.displayName).toBe("Deleted member");
    const { rows } = await env.db.query("SELECT account_id FROM personas WHERE id = $1", [m.author.personaId]);
    expect(rows[0].account_id).toBeNull();
  });

  it("can delete two accounts in a row without name clashes", async () => {
    const a = await newMember(env);
    const b = await newMember(env);
    expect((await a.del("/me", { confirm: "delete my account" })).status).toBe(200);
    expect((await b.del("/me", { confirm: "delete my account" })).status).toBe(200);
  });
});
