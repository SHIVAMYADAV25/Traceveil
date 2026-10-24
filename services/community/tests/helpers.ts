import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { buildApp, API_PREFIX } from "../src/app.js";
import { loadConfig, type Config } from "../src/config/env.js";
import { runMigrations } from "../src/db/migrate.js";
import { createPool, type Db } from "../src/db/pool.js";
import { seedSpaces } from "../src/db/seed/spaces.js";
import type { Hub } from "../src/realtime/hub.js";

export const ORIGIN = "http://localhost:3000";
export const TEST_DB =
  process.env.TEST_DATABASE_URL ?? "postgresql://community:community_dev@localhost:5432/community_test";

export interface TestEnv {
  app: FastifyInstance;
  hub: Hub;
  db: Db;
  config: Config;
  close(): Promise<void>;
}

export async function createTestEnv(overrides: Partial<Record<string, string>> = {}): Promise<TestEnv> {
  const config = loadConfig({
    NODE_ENV: "test",
    DATABASE_URL: TEST_DB,
    ALLOWED_ORIGINS: ORIGIN,
    COMMUNITY_OPEN: "true",
    RATE_LIMIT_ENABLED: "false",
    ...overrides,
  } as NodeJS.ProcessEnv);
  const db = createPool(config.databaseUrl);
  await runMigrations(db);
  await seedSpaces(db);
  await db.query("TRUNCATE accounts, personas, mod_actions, audit_log RESTART IDENTITY CASCADE");
  const { app, hub } = await buildApp(config, db);
  await app.ready();
  return {
    app,
    hub,
    db,
    config,
    close: async () => {
      hub.closeAll();
      await app.close();
      await db.end();
    },
  };
}

export interface Reply<T = any> {
  status: number;
  body: T;
}

/** A tiny browser: keeps its own session cookie. */
export class Client {
  cookie = "";
  handle = "";
  phrase = "";
  personaId = "";
  displayName = "";
  constructor(private readonly env: TestEnv) {}

  async call<T = any>(method: string, path: string, body?: unknown, extra: Record<string, string> = {}): Promise<Reply<T>> {
    const res = await this.env.app.inject({
      method: method as "GET",
      url: `${API_PREFIX}${path}`,
      headers: {
        origin: ORIGIN,
        "x-community-client": "web",
        ...(this.cookie ? { cookie: this.cookie } : {}),
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...extra,
      },
      payload: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers["set-cookie"];
    const first = Array.isArray(set) ? set[0] : set;
    if (first) {
      const pair = first.split(";")[0] ?? "";
      this.cookie = pair.endsWith("=") ? "" : pair;
    }
    let parsed: any = null;
    try {
      parsed = res.body ? JSON.parse(res.body) : null;
    } catch {
      parsed = res.body;
    }
    return { status: res.statusCode, body: parsed };
  }
  get = <T = any>(p: string) => this.call<T>("GET", p);
  post = <T = any>(p: string, b: unknown = {}) => this.call<T>("POST", p, b);
  put = <T = any>(p: string, b: unknown = {}) => this.call<T>("PUT", p, b);
  patch = <T = any>(p: string, b: unknown = {}) => this.call<T>("PATCH", p, b);
  del = <T = any>(p: string, b?: unknown) => this.call<T>("DELETE", p, b);
}

/** Sign up a new member and finish onboarding. */
export async function newMember(env: TestEnv, opts: { onboard?: boolean; displayName?: string } = {}): Promise<Client> {
  const c = new Client(env);
  const r = await c.post("/auth/register", { ageConfirmed: true });
  if (r.status !== 201) throw new Error(`register failed: ${JSON.stringify(r.body)}`);
  c.handle = r.body.handle;
  c.phrase = r.body.recoveryPhrase;
  if (opts.onboard !== false) {
    const o = await c.post("/me/onboarding", { acceptRules: true, ...(opts.displayName ? { displayName: opts.displayName } : {}) });
    if (o.status !== 200) throw new Error(`onboarding failed: ${JSON.stringify(o.body)}`);
  }
  const me = await c.get("/me");
  c.personaId = me.body.persona.id;
  c.displayName = me.body.persona.displayName;
  return c;
}

/** Give an account a role directly in the database. */
export async function setRole(env: TestEnv, client: Client, role: string): Promise<void> {
  await env.db.query("UPDATE accounts SET role = $2 WHERE handle = $1", [client.handle, role]);
}

/** Make an account look older than it is (to get past new-account limits). */
export async function ageAccount(env: TestEnv, client: Client, hours: number): Promise<void> {
  await env.db.query("UPDATE accounts SET created_at = now() - make_interval(hours => $2) WHERE handle = $1", [
    client.handle,
    hours,
  ]);
}

export async function roomId(env: TestEnv, slug: string): Promise<string> {
  const { rows } = await env.db.query<{ id: string }>("SELECT id FROM rooms WHERE slug = $1", [slug]);
  if (!rows[0]) throw new Error(`no room ${slug}`);
  return rows[0].id;
}

export const uid = (): string => randomUUID();
