import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { badRequest, notFound } from "../../lib/errors.js";
import { actorOf, requireActive } from "../../plugins/auth.js";
import type { AppContext } from "../../types.js";

const body = z.object({ personaId: z.string().uuid() });

async function refreshHub(ctx: AppContext, accountId: string): Promise<void> {
  const { rows } = await ctx.db.query<{ blocked_persona_id: string }>(
    "SELECT blocked_persona_id FROM blocks WHERE account_id = $1",
    [accountId],
  );
  ctx.realtime.setBlocked(accountId, rows.map((r) => r.blocked_persona_id));
}

export async function blockRoutes(app: FastifyInstance): Promise<void> {
  const ctx = app.ctx;

  app.get("/blocks", { preHandler: requireActive }, async (req) => {
    const { rows } = await ctx.db.query<{ id: string; display_name: string; avatar_seed: string }>(
      `SELECT p.id, p.display_name, p.avatar_seed
         FROM blocks b JOIN personas p ON p.id = b.blocked_persona_id
        WHERE b.account_id = $1 ORDER BY b.created_at DESC`,
      [actorOf(req).accountId],
    );
    return { blocked: rows.map((r) => ({ personaId: r.id, displayName: r.display_name, avatarSeed: r.avatar_seed })) };
  });

  app.post("/blocks", { preHandler: requireActive }, async (req) => {
    const actor = actorOf(req);
    const { personaId } = body.parse(req.body);
    if (personaId === actor.personaId) throw badRequest("cannot_block_self", "You cannot block yourself.");
    const { rows } = await ctx.db.query<{ role: string | null }>(
      `SELECT a.role FROM personas p LEFT JOIN accounts a ON a.id = p.account_id WHERE p.id = $1`,
      [personaId],
    );
    if (!rows[0]) throw notFound("That person could not be found.");
    if (rows[0].role === "moderator" || rows[0].role === "admin") {
      throw badRequest("cannot_block_staff", "Members of the Community team cannot be blocked. You can report a message instead.");
    }
    await ctx.db.query(
      "INSERT INTO blocks (account_id, blocked_persona_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [actor.accountId, personaId],
    );
    await refreshHub(ctx, actor.accountId);
    return { ok: true };
  });

  app.delete("/blocks/:personaId", { preHandler: requireActive }, async (req) => {
    const actor = actorOf(req);
    const { personaId } = z.object({ personaId: z.string().uuid() }).parse(req.params);
    await ctx.db.query("DELETE FROM blocks WHERE account_id = $1 AND blocked_persona_id = $2", [
      actor.accountId,
      personaId,
    ]);
    await refreshHub(ctx, actor.accountId);
    return { ok: true };
  });
}
