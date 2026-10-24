import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { REACTION_KINDS } from "../../config/constants.js";
import { forbidden, notFound } from "../../lib/errors.js";
import { actorOf, requireActive } from "../../plugins/auth.js";
import { getMessageCore } from "../messages/repo.js";
import { getRoom } from "../spaces/repo.js";

const params = z.object({
  messageId: z.string().regex(/^\d+$/),
  kind: z.enum(REACTION_KINDS),
});

export async function reactionRoutes(app: FastifyInstance): Promise<void> {
  const ctx = app.ctx;
  const limit = { rateLimit: { max: 60, timeWindow: "1 minute" } };

  async function change(req: Parameters<typeof actorOf>[0], add: boolean) {
    const actor = actorOf(req);
    const { messageId, kind } = params.parse(req.params);
    if (!actor.rulesAcceptedAt) {
      throw forbidden("onboarding_required", "Please finish setting up your name and accept the community rules first.");
    }
    const core = await getMessageCore(ctx.db, messageId);
    if (!core || core.status !== "visible" || !(await getRoom(ctx.db, core.room_id))) {
      throw notFound("That message could not be found.");
    }
    if (add) {
      await ctx.db.query(
        "INSERT INTO reactions (message_id, persona_id, kind) VALUES ($1::bigint, $2, $3) ON CONFLICT DO NOTHING",
        [messageId, actor.personaId, kind],
      );
    } else {
      await ctx.db.query(
        "DELETE FROM reactions WHERE message_id = $1::bigint AND persona_id = $2 AND kind = $3",
        [messageId, actor.personaId, kind],
      );
    }
    const { rows } = await ctx.db.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM reactions WHERE message_id = $1::bigint AND kind = $2",
      [messageId, kind],
    );
    const count = rows[0]?.n ?? 0;
    ctx.realtime.broadcastRoom(core.room_id, {
      type: "reaction.changed",
      data: { roomId: core.room_id, messageId, kind, personaId: actor.personaId, added: add, count },
    });
    return { messageId, kind, count, mine: add };
  }

  app.put("/messages/:messageId/reactions/:kind", { preHandler: requireActive, config: limit }, (req) =>
    change(req, true),
  );
  app.delete("/messages/:messageId/reactions/:kind", { preHandler: requireActive, config: limit }, (req) =>
    change(req, false),
  );
}
