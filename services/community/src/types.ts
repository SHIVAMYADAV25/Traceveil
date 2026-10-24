import type { Config } from "./config/env.js";
import type { Role } from "./config/constants.js";
import type { Db } from "./db/pool.js";
import type { Realtime } from "./realtime/hub.js";

/** The signed-in person making a request. */
export interface Actor {
  accountId: string;
  personaId: string;
  handle: string;
  role: Role;
  createdAt: Date;
  rulesAcceptedAt: Date | null;
}

export interface AppContext {
  config: Config;
  db: Db;
  realtime: Realtime;
  blockedDomains: ReadonlySet<string>;
  crisisPhrases: readonly string[];
}

declare module "fastify" {
  interface FastifyRequest {
    actor: Actor | null;
    sessionTokenHash: string | null;
  }
  interface FastifyInstance {
    ctx: AppContext;
  }
}
