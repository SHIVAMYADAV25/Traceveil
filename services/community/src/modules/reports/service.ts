import {
  REPORT_CONTEXT_AFTER,
  REPORT_CONTEXT_BEFORE,
  URGENT_REASONS,
  type ReportReason,
} from "../../config/constants.js";
import { conflict, forbidden, notFound, badRequest } from "../../lib/errors.js";
import type { Actor, AppContext } from "../../types.js";
import { getMessageCore } from "../messages/repo.js";
import { staffAccountIds } from "../moderation/actions.js";
import { notify } from "../notifications/service.js";
import { getRoom } from "../spaces/repo.js";
import { isUniqueViolation } from "../auth/repo.js";

export interface SnapshotMessage {
  id: string;
  personaId: string;
  displayName: string;
  body: string | null;
  contentWarning: string | null;
  status: string;
  createdAt: string;
  reported: boolean;
}

/** Freeze the messages around the reported one, exactly as they are right now. */
async function takeSnapshot(ctx: AppContext, roomId: string, messageId: string): Promise<SnapshotMessage[]> {
  const { rows } = await ctx.db.query<{
    id: string;
    persona_id: string;
    display_name: string;
    body: string;
    content_warning: string | null;
    status: string;
    created_at: Date;
  }>(
    `SELECT * FROM (
       (SELECT m.id, m.persona_id, p.display_name, m.body, m.content_warning, m.status, m.created_at
          FROM messages m JOIN personas p ON p.id = m.persona_id
         WHERE m.room_id = $1 AND m.id <= $2::bigint ORDER BY m.id DESC LIMIT $3)
       UNION ALL
       (SELECT m.id, m.persona_id, p.display_name, m.body, m.content_warning, m.status, m.created_at
          FROM messages m JOIN personas p ON p.id = m.persona_id
         WHERE m.room_id = $1 AND m.id > $2::bigint ORDER BY m.id ASC LIMIT $4)
     ) x ORDER BY id`,
    [roomId, messageId, REPORT_CONTEXT_BEFORE + 1, REPORT_CONTEXT_AFTER],
  );
  return rows.map((r) => ({
    id: r.id,
    personaId: r.persona_id,
    displayName: r.display_name,
    body: r.status === "deleted_by_author" ? null : r.body,
    contentWarning: r.content_warning,
    status: r.status,
    createdAt: r.created_at.toISOString(),
    reported: r.id === messageId,
  }));
}

export async function createReport(
  ctx: AppContext,
  actor: Actor,
  messageId: string,
  input: { reason: ReportReason; note?: string },
): Promise<{ reportId: string }> {
  if (!actor.rulesAcceptedAt) {
    throw forbidden("onboarding_required", "Please finish setting up your name and accept the community rules first.");
  }
  const core = await getMessageCore(ctx.db, messageId);
  if (!core || core.status !== "visible") throw notFound("That message could not be found.");
  if (core.persona_id === actor.personaId) {
    throw badRequest("cannot_report_self", "You cannot report your own message. You can delete it instead.");
  }
  const room = await getRoom(ctx.db, core.room_id);
  if (!room) throw notFound("That message could not be found.");

  const targetRole = (
    await ctx.db.query<{ role: string | null }>(
      "SELECT a.role FROM personas p LEFT JOIN accounts a ON a.id = p.account_id WHERE p.id = $1",
      [core.persona_id],
    )
  ).rows[0]?.role;
  const targetIsStaff = targetRole === "moderator" || targetRole === "admin";

  const snapshot = await takeSnapshot(ctx, core.room_id, messageId);
  const priority = URGENT_REASONS.includes(input.reason) ? "urgent" : "normal";

  let reportId: string;
  try {
    const { rows } = await ctx.db.query<{ id: string }>(
      `INSERT INTO reports (reporter_account_id, message_id, persona_id, room_id, reason, note, priority, context_snapshot)
       VALUES ($1, $2::bigint, $3, $4, $5, $6, $7, $8::jsonb) RETURNING id`,
      [actor.accountId, messageId, core.persona_id, core.room_id, input.reason, input.note ?? null, priority, JSON.stringify(snapshot)],
    );
    reportId = (rows[0] as { id: string }).id;
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict("already_reported", "You have already reported this message. The team will look at it.");
    throw err;
  }

  // Reports about the team itself go to admins only.
  const recipients = (await staffAccountIds(ctx.db, targetIsStaff)).filter((id) => id !== actor.accountId);
  for (const accountId of recipients) {
    await notify(ctx, accountId, "report_new", {
      reportId,
      priority,
      reason: input.reason,
      roomTitle: room.title,
    });
  }
  return { reportId };
}
