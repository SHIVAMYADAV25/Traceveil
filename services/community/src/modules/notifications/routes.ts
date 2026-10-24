import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { actorOf, requireAuth } from "../../plugins/auth.js";
import { listNotifications, markRead, unreadCount } from "./repo.js";

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  before: z.string().regex(/^\d+$/).optional(),
  unread: z.enum(["true", "false"]).default("false"),
});

const readBody = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ ids: z.array(z.string().regex(/^\d+$/)).min(1).max(100) }),
]);

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  const { db } = app.ctx;

  app.get("/notifications", { preHandler: requireAuth }, async (req) => {
    const actor = actorOf(req);
    const q = listQuery.parse(req.query);
    const items = await listNotifications(db, actor.accountId, {
      limit: q.limit,
      before: q.before,
      unreadOnly: q.unread === "true",
    });
    return { notifications: items, unread: await unreadCount(db, actor.accountId) };
  });

  app.post("/notifications/read", { preHandler: requireAuth }, async (req) => {
    const actor = actorOf(req);
    const body = readBody.parse(req.body);
    const updated = await markRead(db, actor.accountId, "all" in body ? "all" : body.ids);
    return { updated, unread: await unreadCount(db, actor.accountId) };
  });
}
