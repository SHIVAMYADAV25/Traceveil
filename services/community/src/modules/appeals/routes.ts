import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { conflict, notFound } from "../../lib/errors.js";
import { actorOf, requireAuth, requireRole } from "../../plugins/auth.js";
import { recordAction, recordAudit, staffAccountIds } from "../moderation/actions.js";
import { notify } from "../notifications/service.js";
import { isUniqueViolation } from "../auth/repo.js";

const createBody = z.object({
  restrictionId: z.string().regex(/^\d+$/),
  body: z.string().trim().min(10, "Please write at least a couple of sentences.").max(1000),
});
const decisionBody = z.object({
  decision: z.enum(["upheld", "overturned"]),
  note: z.string().trim().min(3).max(500),
});

export async function appealRoutes(app: FastifyInstance): Promise<void> {
  const ctx = app.ctx;
  const admin = requireRole("admin");

  // Open to people who are suspended or banned too: this is how they can ask for a review.
  app.get("/restrictions/mine", { preHandler: requireAuth }, async (req) => {
    const { rows } = await ctx.db.query(
      `SELECT r.id, r.kind, r.room_id, r.reason, r.starts_at, r.ends_at, ap.status AS appeal_status
         FROM restrictions r LEFT JOIN appeals ap ON ap.restriction_id = r.id
        WHERE r.account_id = $1 AND r.active AND (r.ends_at IS NULL OR r.ends_at > now())
        ORDER BY r.id DESC`,
      [actorOf(req).accountId],
    );
    return {
      restrictions: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        roomId: r.room_id,
        reason: r.reason,
        startsAt: r.starts_at.toISOString(),
        endsAt: r.ends_at ? r.ends_at.toISOString() : null,
        appealStatus: r.appeal_status ?? null,
      })),
    };
  });

  app.post(
    "/appeals",
    { preHandler: requireAuth, config: { rateLimit: { max: 5, timeWindow: "1 hour" } } },
    async (req, reply) => {
      const actor = actorOf(req);
      const input = createBody.parse(req.body);
      const found = await ctx.db.query(
        `SELECT id FROM restrictions
          WHERE id = $1::bigint AND account_id = $2 AND active AND (ends_at IS NULL OR ends_at > now())`,
        [input.restrictionId, actor.accountId],
      );
      if (!found.rows[0]) throw notFound("That restriction could not be found.");
      try {
        const { rows } = await ctx.db.query<{ id: string }>(
          "INSERT INTO appeals (restriction_id, account_id, body) VALUES ($1::bigint, $2, $3) RETURNING id",
          [input.restrictionId, actor.accountId, input.body],
        );
        const appealId = (rows[0] as { id: string }).id;
        for (const id of await staffAccountIds(ctx.db, true)) {
          await notify(ctx, id, "appeal_new", { appealId });
        }
        return reply.code(201).send({ appealId, message: "Your appeal has been sent to an admin who was not involved in the decision wherever possible." });
      } catch (err) {
        if (isUniqueViolation(err)) throw conflict("already_appealed", "You have already appealed this decision. An admin will reply here.");
        throw err;
      }
    },
  );

  app.get("/admin/appeals", { preHandler: admin }, async (req) => {
    const { status } = z.object({ status: z.enum(["open", "decided", "all"]).default("open") }).parse(req.query);
    const { rows } = await ctx.db.query(
      `SELECT ap.id, ap.body, ap.status, ap.created_at, ap.decided_at, ap.decision_note,
              r.id AS restriction_id, r.kind, r.reason, r.starts_at, r.ends_at, r.active,
              p.display_name AS persona_name, r.created_by = $2 AS imposed_by_me
         FROM appeals ap
         JOIN restrictions r ON r.id = ap.restriction_id
         LEFT JOIN personas p ON p.account_id = ap.account_id
        WHERE ($1 = 'all' OR ($1 = 'open' AND ap.status = 'open') OR ($1 = 'decided' AND ap.status <> 'open'))
        ORDER BY ap.created_at ASC LIMIT 100`,
      [status, actorOf(req).accountId],
    );
    return {
      appeals: rows.map((a) => ({
        id: a.id,
        body: a.body,
        status: a.status,
        createdAt: a.created_at.toISOString(),
        decidedAt: a.decided_at ? a.decided_at.toISOString() : null,
        decisionNote: a.decision_note,
        personaName: a.persona_name,
        // Lets the interface warn an admin who is reviewing their own decision.
        imposedByMe: a.imposed_by_me,
        restriction: {
          id: a.restriction_id,
          kind: a.kind,
          reason: a.reason,
          endsAt: a.ends_at ? a.ends_at.toISOString() : null,
          active: a.active,
        },
      })),
    };
  });

  app.post("/admin/appeals/:appealId/decision", { preHandler: admin }, async (req) => {
    const actor = actorOf(req);
    const { appealId } = z.object({ appealId: z.string().regex(/^\d+$/) }).parse(req.params);
    const input = decisionBody.parse(req.body);
    const { rows } = await ctx.db.query<{ id: string; account_id: string; restriction_id: string; status: string }>(
      "SELECT id, account_id, restriction_id, status FROM appeals WHERE id = $1::bigint",
      [appealId],
    );
    const appeal = rows[0];
    if (!appeal) throw notFound("That appeal could not be found.");
    if (appeal.status !== "open") throw conflict("already_decided", "This appeal has already been decided.");

    await ctx.db.query(
      "UPDATE appeals SET status = $2, decided_by = $3, decided_at = now(), decision_note = $4 WHERE id = $1::bigint",
      [appealId, input.decision, actor.accountId, input.note],
    );
    if (input.decision === "overturned") {
      await ctx.db.query("UPDATE restrictions SET active = false WHERE id = $1::bigint", [appeal.restriction_id]);
      await recordAction(ctx.db, {
        actorAccountId: actor.accountId,
        action: "appeal_overturned",
        reason: input.note,
        meta: { appealId, restrictionId: appeal.restriction_id },
      });
    }
    await recordAudit(ctx.db, { actorAccountId: actor.accountId, action: "appeal_decided", target: `appeal:${appealId}`, reason: `${input.decision}: ${input.note}` });
    await notify(ctx, appeal.account_id, "appeal_decided", { decision: input.decision, note: input.note });
    return { ok: true, decision: input.decision };
  });
}
