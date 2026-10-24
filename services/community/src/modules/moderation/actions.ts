import type { Queryable } from "../../db/pool.js";

/** Append one line to the permanent moderation record. Returns its id. */
export async function recordAction(
  db: Queryable,
  v: {
    actorAccountId: string;
    action: string;
    personaId?: string | null;
    messageId?: string | null;
    reportId?: string | null;
    roomId?: string | null;
    reason?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO mod_actions (actor_account_id, action, persona_id, message_id, report_id, room_id, reason, meta)
     VALUES ($1, $2, $3, $4::bigint, $5::bigint, $6, $7, $8::jsonb) RETURNING id`,
    [
      v.actorAccountId,
      v.action,
      v.personaId ?? null,
      v.messageId ?? null,
      v.reportId ?? null,
      v.roomId ?? null,
      v.reason ?? null,
      JSON.stringify(v.meta ?? {}),
    ],
  );
  return (rows[0] as { id: string }).id;
}

export async function recordAudit(
  db: Queryable,
  v: { actorAccountId: string; action: string; target?: string | null; reason?: string | null },
): Promise<void> {
  await db.query("INSERT INTO audit_log (actor_account_id, action, target, reason) VALUES ($1, $2, $3, $4)", [
    v.actorAccountId,
    v.action,
    v.target ?? null,
    v.reason ?? null,
  ]);
}

/** All moderator and admin accounts (admins only when staff is the subject of a report). */
export async function staffAccountIds(db: Queryable, adminsOnly = false): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM accounts WHERE role = ANY($1::text[])`,
    [adminsOnly ? ["admin"] : ["moderator", "admin"]],
  );
  return rows.map((r) => r.id);
}
