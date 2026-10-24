import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { actorOf, requireActive } from "../../plugins/auth.js";
import { editMessageBody, listQuery, postMessageBody } from "./schema.js";
import * as service from "./service.js";

const roomParams = z.object({ roomId: z.string().uuid() });
const messageParams = z.object({ messageId: z.string().regex(/^\d+$/) });

export async function messageRoutes(app: FastifyInstance): Promise<void> {
  const ctx = app.ctx;

  app.get("/rooms/:roomId/messages", { preHandler: requireActive }, async (req) => {
    const { roomId } = roomParams.parse(req.params);
    const q = listQuery.parse(req.query);
    return service.listMessages(ctx, actorOf(req), roomId, q);
  });

  app.post(
    "/rooms/:roomId/messages",
    { preHandler: requireActive, config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const { roomId } = roomParams.parse(req.params);
      const body = postMessageBody.parse(req.body);
      const result = await service.postMessage(ctx, actorOf(req), roomId, body);
      return reply.code(result.duplicate ? 200 : 201).send({ message: result.message, support: result.support });
    },
  );

  app.patch(
    "/messages/:messageId",
    { preHandler: requireActive, config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req) => {
      const { messageId } = messageParams.parse(req.params);
      const body = editMessageBody.parse(req.body);
      return service.editMessage(ctx, actorOf(req), messageId, body);
    },
  );

  app.delete("/messages/:messageId", { preHandler: requireActive }, async (req) => {
    const { messageId } = messageParams.parse(req.params);
    await service.deleteOwnMessage(ctx, actorOf(req), messageId);
    return { ok: true };
  });
}
