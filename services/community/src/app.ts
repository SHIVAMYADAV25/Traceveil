import websocket from "@fastify/websocket";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import type { Config } from "./config/env.js";
import type { Db } from "./db/pool.js";
import { registerAuth } from "./plugins/auth.js";
import { registerErrorHandling } from "./plugins/errors.js";
import { registerSecurity } from "./plugins/security.js";
import { Hub } from "./realtime/hub.js";
import { websocketRoutes } from "./realtime/ws.routes.js";
import { loadCrisisPhrases } from "./safety/crisis-guard.js";
import { loadBlockedDomains } from "./safety/link-guard.js";
import type { AppContext } from "./types.js";
import { adminRoutes } from "./modules/admin/routes.js";
import { appealRoutes } from "./modules/appeals/routes.js";
import { authRoutes } from "./modules/auth/routes.js";
import { blockRoutes } from "./modules/blocks/routes.js";
import { messageRoutes } from "./modules/messages/routes.js";
import { moderationRoutes } from "./modules/moderation/routes.js";
import { notificationRoutes } from "./modules/notifications/routes.js";
import { reactionRoutes } from "./modules/reactions/routes.js";
import { reportRoutes } from "./modules/reports/routes.js";
import { spaceRoutes } from "./modules/spaces/routes.js";

export const API_PREFIX = "/api/community";

export interface BuiltApp {
  app: FastifyInstance;
  hub: Hub;
}

export async function buildApp(config: Config, db: Db, opts: { logger?: boolean } = {}): Promise<BuiltApp> {
  const app = Fastify({
    logger: opts.logger
      ? {
          level: "info",
          // Logs are kept on disk, so they must not hold IP addresses, cookies, or anything typed
          // by a member. Only the method and the path (without the query string) are recorded.
          serializers: {
            req: (req: { method: string; url: string }) => ({ method: req.method, url: req.url.split("?")[0] }),
            res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
          },
        }
      : false,
    trustProxy: config.trustProxy,
    bodyLimit: 32 * 1024,
  });

  const hub = new Hub();
  const ctx: AppContext = {
    config,
    db,
    realtime: hub,
    blockedDomains: loadBlockedDomains(),
    crisisPhrases: loadCrisisPhrases(),
  };
  app.decorate("ctx", ctx);

  registerErrorHandling(app);
  await registerSecurity(app);
  await registerAuth(app); // must come before rate limiting so limits can key on the signed-in person

  await app.register(rateLimit, {
    global: true,
    max: config.rateLimitEnabled ? 300 : 1_000_000,
    timeWindow: "1 minute",
    allowList: () => !config.rateLimitEnabled,
    // Counters live in memory only, so no IP address is written to the database.
    keyGenerator: (req) => req.actor?.accountId ?? req.ip,
  });
  await app.register(websocket, { options: { maxPayload: 4096 } });

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(
    async (api) => {
      await authRoutes(api);
      await spaceRoutes(api);
      await messageRoutes(api);
      await reactionRoutes(api);
      await blockRoutes(api);
      await notificationRoutes(api);
      await reportRoutes(api);
      await moderationRoutes(api);
      await appealRoutes(api);
      await adminRoutes(api, hub);
      await websocketRoutes(api, hub);
    },
    { prefix: API_PREFIX },
  );

  return { app, hub };
}
