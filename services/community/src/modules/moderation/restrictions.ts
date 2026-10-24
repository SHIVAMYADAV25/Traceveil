import type { Queryable } from "../../db/pool.js";

export interface RestrictionRow {
  id: string;
  kind: "room_mute" | "suspend" | "ban";
  roomId: string | null;
  reason: string;
  startsAt: Date;
  endsAt: Date | null;
}

/** Restrictions that are switched on and have not run out. */
export async function activeAccountRestrictions(
  db: Queryable,
  accountId: string,
): Promise<RestrictionRow[]> {
  const { rows } = await db.query<{
    id: string;
    kind: RestrictionRow["kind"];
    room_id: string | null;
    reason: string;
    starts_at: Date;
    ends_at: Date | null;
  }>(
    `SELECT id, kind, room_id, reason, starts_at, ends_at
       FROM restrictions
      WHERE account_id = $1 AND active AND (ends_at IS NULL OR ends_at > now())
      ORDER BY id`,
    [accountId],
  );
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    roomId: r.room_id,
    reason: r.reason,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
  }));
}
