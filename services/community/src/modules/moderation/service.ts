import { MOD_MAX_RESTRICTION_HOURS } from "../../config/constants.js";
import { withTx } from "../../db/pool.js";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors.js";
import type { Actor, AppContext } from "../../types.js";
import { getMessageCore } from "../messages/repo.js";
import { notify } from "../notifications/service.js";
import { recordAction, staffAccountIds } from "./actions.js";
import { activeAccountRestrictions } from "./restrictions.js";

export const REPORT_ACTIONS = [
  "dismiss",
  "hide_message",
  "warn",
  "mute_room",
  "suspend",
  "ban",
  "escalate",
  "note",
] as const;
export type ReportAction = (typeof REPORT_ACTIONS)[number];

interface ReportRow {
  id: string;
  reporter_account_id: string | null;
  message_id: string | null;
  persona_id: string;
  room_id: string | null;
  reason: string;
  note: string | null;
  priority: "normal" | "urgent";
  status: "open" | "in_review" | "actioned" | "dismissed" | "escalated";
  assigned_to: string | null;
  context_snapshot: unknown;
  created_at: Date;
  resolved_at: Date | null;
  target_account_id: string | null;
  target_role: string | null;
  target_name: string;
  room_title: string | null;
  space_slug: string | null;
  room_slug: string | null;
}

const REPORT_SELECT = `
  SELECT r.id, r.reporter_account_id, r.message_id, r.persona_id, r.room_id, r.reason, r.note, r.priority,
         r.status, r.assigned_to, r.context_snapshot, r.created_at, r.resolved_at,
         p.account_id AS target_account_id, a.role AS target_role, p.display_name AS target_name,
         rm.title AS room_title, sp.slug AS space_slug, rm.slug AS room_slug
    FROM reports r
    JOIN personas p ON p.id = r.persona_id
    LEFT JOIN accounts a ON a.id = p.account_id
    LEFT JOIN rooms rm ON rm.id = r.room_id
    LEFT JOIN spaces sp ON sp.id = rm.space_id`;

const isStaffRole = (role: string | null): boolean => role === "moderator" || role === "admin";

/** Moderators do not see reports about the team. Only admins do. */
function visibleTo(actor: Actor, row: ReportRow): boolean {
  return actor.role === "admin" || !isStaffRole(row.target_role);
}

async function loadReport(ctx: AppContext, actor: Actor, reportId: string): Promise<ReportRow> {
  const { rows } = await ctx.db.query<ReportRow>(`${REPORT_SELECT} WHERE r.id = $1::bigint`, [reportId]);
  const row = rows[0];
  if (!row || !visibleTo(actor, row)) throw notFound("That report could not be found.");
  return row;
}

const ageMinutes = (d: Date): number => Math.floor((Date.now() - d.getTime()) / 60000);

function summary(actor: Actor, r: ReportRow) {
  return {
    id: r.id,
    reason: r.reason,
    priority: r.priority,
    status: r.status,
    createdAt: r.created_at.toISOString(),
    ageMinutes: ageMinutes(r.created_at),
    resolvedAt: r.resolved_at ? r.resolved_at.toISOString() : null,
    room: r.room_id ? { id: r.room_id, title: r.room_title, spaceSlug: r.space_slug, roomSlug: r.room_slug } : null,
    targetName: r.target_name,
    assigned: r.assigned_to === null ? null : r.assigned_to === actor.accountId ? "me" : "other",
  };
}

export async function listReports(
  ctx: AppContext,
  actor: Actor,
  opts: { state: "active" | "mine" | "closed" | "all"; limit: number },
) {
  const { rows } = await ctx.db.query<ReportRow>(
    `${REPORT_SELECT}
      WHERE ($1 = 'admin' OR a.role IS NULL OR a.role NOT IN ('moderator', 'admin'))
        AND CASE $2
              WHEN 'active' THEN r.status IN ('open', 'in_review', 'escalated')
              WHEN 'mine'   THEN r.status IN ('open', 'in_review', 'escalated') AND r.assigned_to = $3
              WHEN 'closed' THEN r.status IN ('actioned', 'dismissed')
              ELSE true END
      ORDER BY (r.priority = 'urgent' AND r.status IN ('open', 'in_review', 'escalated')) DESC,
               CASE WHEN r.status IN ('open', 'in_review', 'escalated') THEN r.created_at END ASC,
               r.created_at DESC
      LIMIT $4`,
    [actor.role, opts.state, actor.accountId, opts.limit],
  );
  const counts = await ctx.db.query<{ active: number; urgent: number; mine: number }>(
    `SELECT count(*) FILTER (WHERE r.status IN ('open', 'in_review', 'escalated'))::int AS active,
            count(*) FILTER (WHERE r.status IN ('open', 'in_review', 'escalated') AND r.priority = 'urgent')::int AS urgent,
            count(*) FILTER (WHERE r.status IN ('open', 'in_review', 'escalated') AND r.assigned_to = $2)::int AS mine
       FROM reports r JOIN personas p ON p.id = r.persona_id LEFT JOIN accounts a ON a.id = p.account_id
      WHERE ($1 = 'admin' OR a.role IS NULL OR a.role NOT IN ('moderator', 'admin'))`,
    [actor.role, actor.accountId],
  );
  return { reports: rows.map((r) => summary(actor, r)), counts: counts.rows[0] };
}

export async function getReportDetail(ctx: AppContext, actor: Actor, reportId: string) {
  const r = await loadReport(ctx, actor, reportId);
  const history = await ctx.db.query<{ action: string; reason: string | null; created_at: Date }>(
    `SELECT action, reason, created_at FROM mod_actions WHERE persona_id = $1 ORDER BY id DESC LIMIT 20`,
    [r.persona_id],
  );
  const prior = await ctx.db.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM reports WHERE persona_id = $1 AND id <> $2::bigint",
    [r.persona_id, reportId],
  );
  const restrictions = r.target_account_id ? await activeAccountRestrictions(ctx.db, r.target_account_id) : [];
  const messageNow = r.message_id ? await getMessageCore(ctx.db, r.message_id) : null;
  return {
    ...summary(actor, r),
    // The reporter is never identified here. Only the note they chose to write is shown.
    note: r.note,
    snapshot: r.context_snapshot ?? [],
    messageStillVisible: messageNow?.status === "visible",
    target: {
      personaId: r.persona_id,
      displayName: r.target_name,
      isStaff: isStaffRole(r.target_role),
      deleted: r.target_account_id === null,
      priorReports: prior.rows[0]?.n ?? 0,
      activeRestrictions: restrictions.map((x) => ({
        kind: x.kind,
        roomId: x.roomId,
        endsAt: x.endsAt ? x.endsAt.toISOString() : null,
      })),
      history: history.rows.map((h) => ({ action: h.action, reason: h.reason, createdAt: h.created_at.toISOString() })),
    },
  };
}

export async function claimReport(ctx: AppContext, actor: Actor, reportId: string, force: boolean) {
  const r = await loadReport(ctx, actor, reportId);
  if (r.status === "actioned" || r.status === "dismissed") throw conflict("report_closed", "This report has already been closed.");
  if (r.assigned_to && r.assigned_to !== actor.accountId && !(force && actor.role === "admin")) {
    throw conflict("already_claimed", "Someone else on the team is already looking at this report.");
  }
  await ctx.db.query(
    `UPDATE reports SET assigned_to = $2, status = CASE WHEN status = 'open' THEN 'in_review' ELSE status END
      WHERE id = $1::bigint`,
    [reportId, actor.accountId],
  );
  return getReportDetail(ctx, actor, reportId);
}

interface ActionInput {
  action: ReportAction;
  reason: string;
  durationHours?: number;
}

function checkDuration(actor: Actor, input: ActionInput, required: boolean): number | null {
  const hours = input.durationHours ?? null;
  if (hours === null) {
    if (required) throw badRequest("duration_required", "Choose how long this should last.");
    return null;
  }
  if (actor.role !== "admin" && hours > MOD_MAX_RESTRICTION_HOURS) {
    throw forbidden("duration_too_long", `Moderators can set up to ${MOD_MAX_RESTRICTION_HOURS / 24} days. Escalate for anything longer.`);
  }
  return hours;
}

/** Shared by report actions and direct hides: makes the message disappear for members. */
async function hideMessageNow(ctx: AppContext, messageId: string): Promise<string | null> {
  const core = await getMessageCore(ctx.db, messageId);
  if (!core || core.status !== "visible") return null;
  await ctx.db.query("UPDATE messages SET status = 'hidden_by_mod' WHERE id = $1::bigint", [messageId]);
  ctx.realtime.broadcastRoom(core.room_id, { type: "message.hidden", data: { roomId: core.room_id, messageId } });
  return core.room_id;
}

function guardTarget(actor: Actor, targetRole: string | null): void {
  if (targetRole === "admin") throw forbidden("cannot_act_on_admin", "Admins cannot be restricted this way.");
  if (targetRole === "moderator" && actor.role !== "admin") {
    throw forbidden("cannot_act_on_staff", "Only an admin can act on a member of the team.");
  }
}

export async function applyReportAction(ctx: AppContext, actor: Actor, reportId: string, input: ActionInput) {
  const r = await loadReport(ctx, actor, reportId);
  const isNote = input.action === "note";

  if (!isNote && r.status === "dismissed") throw conflict("report_closed", "This report was dismissed. Add a note, or open a new report.");
  if (!isNote && r.status === "escalated" && actor.role !== "admin") {
    throw forbidden("escalated_to_admin", "This report was escalated and is waiting for an admin.");
  }
  if (input.action === "ban" && actor.role !== "admin") {
    throw forbidden("admin_only", "Only an admin can ban someone.");
  }

  const needsAccount = ["warn", "mute_room", "suspend", "ban"].includes(input.action);
  if (needsAccount || input.action === "hide_message") guardTarget(actor, r.target_role);
  if (needsAccount && !r.target_account_id) {
    throw conflict("account_deleted", "This person has deleted their account, so there is nothing to restrict.");
  }

  let restrictionKind: "room_mute" | "suspend" | "ban" | null = null;
  let hours: number | null = null;
  if (input.action === "mute_room") {
    if (!r.room_id) throw badRequest("no_room", "This report is not linked to a room.");
    restrictionKind = "room_mute";
    hours = checkDuration(actor, input, true);
  } else if (input.action === "suspend") {
    restrictionKind = "suspend";
    hours = checkDuration(actor, input, true);
  } else if (input.action === "ban") {
    restrictionKind = "ban";
    hours = checkDuration(actor, input, false);
  }

  let hiddenRoom: string | null = null;
  if (input.action === "hide_message") {
    if (!r.message_id) throw conflict("message_gone", "The reported message no longer exists.");
    hiddenRoom = await hideMessageNow(ctx, r.message_id);
    if (!hiddenRoom) throw conflict("already_hidden", "That message is already hidden or deleted.");
  }

  const closing = ["dismiss", "hide_message", "warn", "mute_room", "suspend", "ban"].includes(input.action);
  const nextStatus =
    input.action === "dismiss" ? "dismissed" : input.action === "escalate" ? "escalated" : closing ? "actioned" : r.status;
  const firstResolution = closing && (r.status === "open" || r.status === "in_review" || r.status === "escalated");

  const restrictionId = await withTx(ctx.db, async (tx) => {
    const actionId = await recordAction(tx, {
      actorAccountId: actor.accountId,
      action: input.action,
      personaId: r.persona_id,
      messageId: r.message_id,
      reportId,
      roomId: r.room_id,
      reason: input.reason,
      meta: hours ? { durationHours: hours } : {},
    });
    let rid: string | null = null;
    if (restrictionKind && r.target_account_id) {
      const ins = await tx.query<{ id: string }>(
        `INSERT INTO restrictions (account_id, kind, room_id, reason, ends_at, source_action_id, created_by)
         VALUES ($1, $2, $3, $4, CASE WHEN $5::int IS NULL THEN NULL ELSE now() + make_interval(hours => $5::int) END, $6::bigint, $7)
         RETURNING id`,
        [r.target_account_id, restrictionKind, restrictionKind === "room_mute" ? r.room_id : null, input.reason, hours, actionId, actor.accountId],
      );
      rid = (ins.rows[0] as { id: string }).id;
    }
    await tx.query(
      `UPDATE reports
          SET status = $2,
              resolved_at = CASE WHEN $3 THEN now() ELSE resolved_at END,
              resolution_note = CASE WHEN $3 THEN $4 ELSE resolution_note END,
              assigned_to = COALESCE(assigned_to, $5)
        WHERE id = $1::bigint`,
      [reportId, nextStatus, firstResolution, input.reason, actor.accountId],
    );
    return rid;
  });

  // Tell the person who was acted on what happened and why. They are never told who reported them.
  if (r.target_account_id) {
    if (restrictionKind && restrictionId) {
      const [restriction] = (await activeAccountRestrictions(ctx.db, r.target_account_id)).filter((x) => x.id === restrictionId);
      await notify(ctx, r.target_account_id, "restriction", {
        restrictionId,
        kind: restrictionKind,
        reason: input.reason,
        endsAt: restriction?.endsAt ? restriction.endsAt.toISOString() : null,
        roomTitle: restrictionKind === "room_mute" ? r.room_title : null,
        canAppeal: true,
      });
      ctx.realtime.sendToAccount(r.target_account_id, {
        type: "account.restricted",
        data: { kind: restrictionKind, endsAt: restriction?.endsAt ? restriction.endsAt.toISOString() : null },
      });
      if (restrictionKind !== "room_mute") ctx.realtime.disconnectAccount(r.target_account_id);
    } else if (input.action === "warn") {
      await notify(ctx, r.target_account_id, "mod_notice", { action: "warning", reason: input.reason });
    } else if (input.action === "hide_message") {
      await notify(ctx, r.target_account_id, "mod_notice", { action: "message_hidden", reason: input.reason, roomTitle: r.room_title });
    }
  }

  if (input.action === "escalate") {
    for (const id of (await staffAccountIds(ctx.db, true)).filter((x) => x !== actor.accountId)) {
      await notify(ctx, id, "report_escalated", { reportId, priority: r.priority, reason: r.reason });
    }
  }
  if (firstResolution && r.reporter_account_id) {
    await notify(ctx, r.reporter_account_id, "report_result", {
      outcome: input.action === "dismiss" ? "no_action" : "action_taken",
    });
  }
  return getReportDetail(ctx, actor, reportId);
}

/** Hide a message straight away, without a report (for example something spotted by a moderator). */
export async function hideMessageDirect(ctx: AppContext, actor: Actor, messageId: string, reason: string) {
  const core = await getMessageCore(ctx.db, messageId);
  if (!core) throw notFound("That message could not be found.");
  const target = (
    await ctx.db.query<{ account_id: string | null; role: string | null }>(
      "SELECT p.account_id, a.role FROM personas p LEFT JOIN accounts a ON a.id = p.account_id WHERE p.id = $1",
      [core.persona_id],
    )
  ).rows[0];
  guardTarget(actor, target?.role ?? null);
  const roomId = await hideMessageNow(ctx, messageId);
  if (!roomId) throw conflict("already_hidden", "That message is already hidden or deleted.");
  await recordAction(ctx.db, {
    actorAccountId: actor.accountId,
    action: "hide_message",
    personaId: core.persona_id,
    messageId,
    roomId,
    reason,
  });
  if (target?.account_id) {
    await notify(ctx, target.account_id, "mod_notice", { action: "message_hidden", reason });
  }
  return { ok: true };
}
