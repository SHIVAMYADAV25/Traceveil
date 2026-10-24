import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ROLES, ROOM_KINDS } from "../../config/constants.js";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors.js";
import { actorOf, requireRole } from "../../plugins/auth.js";
import { Hub } from "../../realtime/hub.js";
import { isUniqueViolation } from "../auth/repo.js";
import { recordAction, recordAudit } from "../moderation/actions.js";
import { notify } from "../notifications/service.js";
import { getRoom } from "../spaces/repo.js";
import { roomDto } from "../spaces/routes.js";

const id = z.string().uuid();
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lower-case letters, numbers and hyphens.").max(60);
const text = (max: number) => z.string().trim().min(1).max(max);
const reasonText = (min: number) => z.string().trim().min(min, `Please give a reason of at least ${min} characters.`).max(500);

const spaceCreate = z.object({ slug, title: text(80), description: z.string().trim().max(300).default(""), sortOrder: z.number().int().default(0) });
const spaceUpdate = z.object({
  title: text(80).optional(),
  description: z.string().trim().max(300).optional(),
  sortOrder: z.number().int().optional(),
  isArchived: z.boolean().optional(),
});
const roomCreate = z.object({
  slug,
  title: text(80),
  purpose: z.string().trim().max(300).default(""),
  kind: z.enum(ROOM_KINDS).default("chat"),
  language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/).default("en"),
  slowModeSeconds: z.number().int().min(0).max(3600).default(0),
  minAccountAgeHours: z.number().int().min(0).max(24 * 90).default(0),
  sortOrder: z.number().int().default(0),
});
// Written out in full on purpose. Deriving this from roomCreate with .partial() would keep the
// create defaults, and an edit like { isLocked: true } would silently reset every other setting.
const roomUpdate = z.object({
  title: text(80).optional(),
  purpose: z.string().trim().max(300).optional(),
  kind: z.enum(ROOM_KINDS).optional(),
  language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/).optional(),
  slowModeSeconds: z.number().int().min(0).max(3600).optional(),
  minAccountAgeHours: z.number().int().min(0).max(24 * 90).optional(),
  sortOrder: z.number().int().optional(),
  isLocked: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

const COLUMN: Record<string, string> = {
  title: "title",
  description: "description",
  purpose: "purpose",
  kind: "kind",
  language: "language",
  slowModeSeconds: "slow_mode_seconds",
  minAccountAgeHours: "min_account_age_hours",
  sortOrder: "sort_order",
  isLocked: "is_locked",
  isArchived: "is_archived",
};

function buildUpdate(table: string, rowId: string, changes: Record<string, unknown>) {
  const entries = Object.entries(changes).filter(([, v]) => v !== undefined);
  if (entries.length === 0) throw badRequest("nothing_to_change", "No changes were given.");
  const sets = entries.map(([k], i) => `${COLUMN[k]} = $${i + 2}`);
  return { sql: `UPDATE ${table} SET ${sets.join(", ")} WHERE id = $1`, params: [rowId, ...entries.map(([, v]) => v)] };
}

export async function adminRoutes(app: FastifyInstance, hub: Hub): Promise<void> {
  const ctx = app.ctx;
  const admin = requireRole("admin");

  // ---- people ----------------------------------------------------------------------------
  app.get("/admin/accounts", { preHandler: admin }, async (req) => {
    const q = z.object({ handle: z.string().trim().max(60).default(""), limit: z.coerce.number().int().min(1).max(100).default(30) }).parse(req.query);
    // Handles only. Display names are deliberately not searchable here: that would reveal who is behind a persona.
    const { rows } = await ctx.db.query(
      `SELECT a.id, a.handle, a.role, a.created_at, a.last_seen_at,
              (SELECT count(*)::int FROM restrictions r WHERE r.account_id = a.id AND r.active AND (r.ends_at IS NULL OR r.ends_at > now())) AS active_restrictions
         FROM accounts a WHERE a.handle LIKE $1 ORDER BY a.created_at DESC LIMIT $2`,
      [`${q.handle.toLowerCase().replace(/[%_\\]/g, "")}%`, q.limit],
    );
    return {
      accounts: rows.map((a) => ({
        id: a.id,
        handle: a.handle,
        role: a.role,
        createdAt: a.created_at.toISOString(),
        lastSeenAt: a.last_seen_at.toISOString(),
        activeRestrictions: a.active_restrictions,
      })),
    };
  });

  app.post("/admin/accounts/:accountId/role", { preHandler: admin }, async (req) => {
    const actor = actorOf(req);
    const { accountId } = z.object({ accountId: id }).parse(req.params);
    const input = z.object({ role: z.enum(ROLES), reason: reasonText(5) }).parse(req.body);
    if (accountId === actor.accountId) throw forbidden("cannot_change_own_role", "Ask another admin to change your own role.");
    const { rows } = await ctx.db.query<{ handle: string; role: string }>("SELECT handle, role FROM accounts WHERE id = $1", [accountId]);
    const target = rows[0];
    if (!target) throw notFound("That account could not be found.");
    if (target.role === input.role) return { ok: true, unchanged: true };
    if (target.role === "admin") {
      const n = (await ctx.db.query<{ n: number }>("SELECT count(*)::int AS n FROM accounts WHERE role = 'admin'")).rows[0]?.n ?? 0;
      if (n <= 1) throw conflict("last_admin", "There must always be at least one admin.");
    }
    await ctx.db.query("UPDATE accounts SET role = $2 WHERE id = $1", [accountId, input.role]);
    hub.setRole(accountId, input.role as (typeof ROLES)[number]);
    await recordAudit(ctx.db, { actorAccountId: actor.accountId, action: "role_changed", target: `${target.handle}: ${target.role} -> ${input.role}`, reason: input.reason });
    await notify(ctx, accountId, "role_changed", { role: input.role });
    return { ok: true };
  });

  app.post("/admin/reveal", { preHandler: admin }, async (req) => {
    const actor = actorOf(req);
    const input = z.object({ personaId: id, reason: reasonText(10) }).parse(req.body);
    const { rows } = await ctx.db.query(
      `SELECT p.id, p.display_name, a.id AS account_id, a.handle, a.role, a.created_at, a.last_seen_at
         FROM personas p LEFT JOIN accounts a ON a.id = p.account_id WHERE p.id = $1`,
      [input.personaId],
    );
    const row = rows[0];
    if (!row) throw notFound("That person could not be found.");
    await recordAudit(ctx.db, { actorAccountId: actor.accountId, action: "reveal_identity", target: `persona:${input.personaId}`, reason: input.reason });
    if (!row.account_id) return { deleted: true, displayName: row.display_name };
    const history = await ctx.db.query(
      "SELECT id, kind, reason, starts_at, ends_at, active FROM restrictions WHERE account_id = $1 ORDER BY id DESC LIMIT 20",
      [row.account_id],
    );
    return {
      deleted: false,
      displayName: row.display_name,
      accountId: row.account_id,
      handle: row.handle,
      role: row.role,
      createdAt: row.created_at.toISOString(),
      lastSeenAt: row.last_seen_at.toISOString(),
      restrictionHistory: history.rows.map((h) => ({ id: h.id, kind: h.kind, reason: h.reason, startsAt: h.starts_at.toISOString(), endsAt: h.ends_at ? h.ends_at.toISOString() : null, active: h.active })),
    };
  });

  app.get("/admin/restrictions", { preHandler: admin }, async () => {
    const { rows } = await ctx.db.query(
      `SELECT r.id, r.kind, r.reason, r.starts_at, r.ends_at, p.display_name, p.id AS persona_id
         FROM restrictions r JOIN personas p ON p.account_id = r.account_id
        WHERE r.active AND (r.ends_at IS NULL OR r.ends_at > now()) ORDER BY r.id DESC LIMIT 100`,
    );
    return { restrictions: rows.map((r) => ({ id: r.id, kind: r.kind, reason: r.reason, startsAt: r.starts_at.toISOString(), endsAt: r.ends_at ? r.ends_at.toISOString() : null, personaName: r.display_name, personaId: r.persona_id })) };
  });

  app.post("/admin/restrictions/:restrictionId/lift", { preHandler: admin }, async (req) => {
    const actor = actorOf(req);
    const { restrictionId } = z.object({ restrictionId: z.string().regex(/^\d+$/) }).parse(req.params);
    const { reason } = z.object({ reason: reasonText(3) }).parse(req.body);
    const { rows } = await ctx.db.query<{ account_id: string }>(
      "UPDATE restrictions SET active = false WHERE id = $1::bigint AND active RETURNING account_id",
      [restrictionId],
    );
    if (!rows[0]) throw notFound("That restriction could not be found.");
    await recordAction(ctx.db, { actorAccountId: actor.accountId, action: "lift_restriction", reason, meta: { restrictionId } });
    await notify(ctx, rows[0].account_id, "mod_notice", { action: "restriction_lifted", reason });
    return { ok: true };
  });

  // ---- spaces and rooms --------------------------------------------------------------------
  app.get("/admin/spaces", { preHandler: admin }, async () => {
    const { rows } = await ctx.db.query(
      `SELECT s.id AS space_id, s.slug AS space_slug, s.title AS space_title, s.description, s.sort_order AS space_sort, s.is_archived AS space_archived,
              r.id, r.slug, r.title, r.purpose, r.kind, r.language, r.slow_mode_seconds, r.min_account_age_hours, r.is_locked, r.is_archived, r.sort_order
         FROM spaces s LEFT JOIN rooms r ON r.space_id = s.id ORDER BY s.sort_order, s.title, r.sort_order, r.title`,
    );
    const spaces: any[] = [];
    for (const r of rows) {
      let s = spaces.find((x) => x.id === r.space_id);
      if (!s) spaces.push((s = { id: r.space_id, slug: r.space_slug, title: r.space_title, description: r.description, sortOrder: r.space_sort, isArchived: r.space_archived, rooms: [] }));
      if (r.id) s.rooms.push({ id: r.id, slug: r.slug, title: r.title, purpose: r.purpose, kind: r.kind, language: r.language, slowModeSeconds: r.slow_mode_seconds, minAccountAgeHours: r.min_account_age_hours, isLocked: r.is_locked, isArchived: r.is_archived, sortOrder: r.sort_order });
    }
    return { spaces };
  });

  app.post("/admin/spaces", { preHandler: admin }, async (req, reply) => {
    const actor = actorOf(req);
    const i = spaceCreate.parse(req.body);
    try {
      const { rows } = await ctx.db.query<{ id: string }>(
        "INSERT INTO spaces (slug, title, description, sort_order) VALUES ($1, $2, $3, $4) RETURNING id",
        [i.slug, i.title, i.description, i.sortOrder],
      );
      await recordAudit(ctx.db, { actorAccountId: actor.accountId, action: "space_created", target: i.slug });
      return reply.code(201).send({ id: rows[0]?.id });
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict("slug_taken", "A space with that address already exists.");
      throw err;
    }
  });

  app.patch("/admin/spaces/:spaceId", { preHandler: admin }, async (req) => {
    const { spaceId } = z.object({ spaceId: id }).parse(req.params);
    const q = buildUpdate("spaces", spaceId, spaceUpdate.parse(req.body));
    const r = await ctx.db.query(q.sql, q.params);
    if (!r.rowCount) throw notFound("That space could not be found.");
    await recordAudit(ctx.db, { actorAccountId: actorOf(req).accountId, action: "space_updated", target: spaceId });
    return { ok: true };
  });

  app.post("/admin/spaces/:spaceId/rooms", { preHandler: admin }, async (req, reply) => {
    const { spaceId } = z.object({ spaceId: id }).parse(req.params);
    const i = roomCreate.parse(req.body);
    try {
      const { rows } = await ctx.db.query<{ id: string }>(
        `INSERT INTO rooms (space_id, slug, title, purpose, kind, language, slow_mode_seconds, min_account_age_hours, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [spaceId, i.slug, i.title, i.purpose, i.kind, i.language, i.slowModeSeconds, i.minAccountAgeHours, i.sortOrder],
      );
      await recordAudit(ctx.db, { actorAccountId: actorOf(req).accountId, action: "room_created", target: i.slug });
      return reply.code(201).send({ id: rows[0]?.id });
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict("slug_taken", "A room with that address already exists in this space.");
      if ((err as { code?: string }).code === "23503") throw notFound("That space could not be found.");
      throw err;
    }
  });

  app.patch("/admin/rooms/:roomId", { preHandler: admin }, async (req) => {
    const { roomId } = z.object({ roomId: id }).parse(req.params);
    const q = buildUpdate("rooms", roomId, roomUpdate.parse(req.body));
    const r = await ctx.db.query(q.sql, q.params);
    if (!r.rowCount) throw notFound("That room could not be found.");
    await recordAudit(ctx.db, { actorAccountId: actorOf(req).accountId, action: "room_updated", target: roomId });
    const room = await getRoom(ctx.db, roomId);
    if (room) hub.broadcastRoom(roomId, { type: "room.updated", data: { room: roomDto(room) } });
    return { ok: true };
  });

  app.post("/admin/rooms/:roomId/notes", { preHandler: admin }, async (req, reply) => {
    const { roomId } = z.object({ roomId: id }).parse(req.params);
    const i = z.object({ title: text(80), body: text(2000) }).parse(req.body);
    try {
      const { rows } = await ctx.db.query<{ id: string }>(
        "INSERT INTO room_notes (room_id, title, body, created_by) VALUES ($1, $2, $3, $4) RETURNING id",
        [roomId, i.title, i.body, actorOf(req).accountId],
      );
      return reply.code(201).send({ id: rows[0]?.id });
    } catch (err) {
      if ((err as { code?: string }).code === "23503") throw notFound("That room could not be found.");
      throw err;
    }
  });

  app.delete("/admin/notes/:noteId", { preHandler: admin }, async (req) => {
    const { noteId } = z.object({ noteId: id }).parse(req.params);
    const r = await ctx.db.query("DELETE FROM room_notes WHERE id = $1", [noteId]);
    if (!r.rowCount) throw notFound("That note could not be found.");
    return { ok: true };
  });

  // ---- records ---------------------------------------------------------------------------
  app.get("/admin/audit", { preHandler: admin }, async (req) => {
    const q = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50), before: z.string().regex(/^\d+$/).optional() }).parse(req.query);
    const { rows } = await ctx.db.query(
      `SELECT l.id, l.action, l.target, l.reason, l.created_at, a.handle AS actor_handle
         FROM audit_log l LEFT JOIN accounts a ON a.id = l.actor_account_id
        WHERE ($1::bigint IS NULL OR l.id < $1::bigint) ORDER BY l.id DESC LIMIT $2`,
      [q.before ?? null, q.limit],
    );
    return { entries: rows.map((r) => ({ id: r.id, action: r.action, target: r.target, reason: r.reason, actor: r.actor_handle ?? "deleted account", createdAt: r.created_at.toISOString() })) };
  });

  // Numbers only. Nothing here can show what anyone wrote.
  app.get("/admin/stats", { preHandler: admin }, async () => {
    const { rows } = await ctx.db.query(
      `SELECT (SELECT count(*)::int FROM accounts) AS accounts,
              (SELECT count(*)::int FROM accounts WHERE last_seen_at > now() - interval '7 days') AS active_7d,
              (SELECT count(*)::int FROM messages WHERE created_at > now() - interval '24 hours') AS messages_24h,
              (SELECT count(*)::int FROM reports WHERE status IN ('open', 'in_review', 'escalated')) AS open_reports,
              (SELECT count(*)::int FROM reports WHERE status IN ('open', 'in_review', 'escalated') AND priority = 'urgent') AS urgent_reports,
              (SELECT count(*)::int FROM appeals WHERE status = 'open') AS open_appeals,
              (SELECT round((EXTRACT(EPOCH FROM avg(resolved_at - created_at)) / 3600)::numeric, 1)::float8
                 FROM reports WHERE resolved_at > now() - interval '30 days') AS avg_hours_to_resolve`,
    );
    const r = rows[0];
    return {
      accounts: r.accounts,
      activeLast7Days: r.active_7d,
      messagesLast24Hours: r.messages_24h,
      openReports: r.open_reports,
      urgentOpenReports: r.urgent_reports,
      openAppeals: r.open_appeals,
      averageHoursToResolve: r.avg_hours_to_resolve,
    };
  });
}
