import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { REPORT_REASONS } from "../../config/constants.js";
import { actorOf, requireActive } from "../../plugins/auth.js";
import { createReport } from "./service.js";

const params = z.object({ messageId: z.string().regex(/^\d+$/) });
const body = z.object({
  reason: z.enum(REPORT_REASONS),
  note: z
    .string()
    .max(500)
    .transform((s) => s.trim())
    .optional()
    .transform((s) => (s ? s : undefined)),
});

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/messages/:messageId/reports",
    { preHandler: requireActive, config: { rateLimit: { max: 20, timeWindow: "1 hour" } } },
    async (req, reply) => {
      const { messageId } = params.parse(req.params);
      const input = body.parse(req.body);
      const { reportId } = await createReport(app.ctx, actorOf(req), messageId, input);
      return reply.code(201).send({
        reportId,
        message: "Thank you. The Community team has been told and will look at this. The person you reported is not told that you reported them.",
      });
    },
  );
}
