import type { Queryable } from "../../db/pool.js";

export interface NotificationDTO {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

interface Row {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  read_at: Date | null;
  created_at: Date;
}

const toDto = (r: Row): NotificationDTO => ({
  id: r.id,
  kind: r.kind,
  payload: r.payload,
  readAt: r.read_at ? r.read_at.toISOString() : null,
  createdAt: r.created_at.toISOString(),
});

export async function insertNotification(
  db: Queryable,
  accountId: string,
  kind: string,
  payload: Record<string, unknown>,
): Promise<NotificationDTO> {
  const { rows } = await db.query<Row>(
    `INSERT INTO notifications (account_id, kind, payload) VALUES ($1, $2, $3::jsonb)
     RETURNING id, kind, payload, read_at, created_at`,
    [accountId, kind, JSON.stringify(payload)],
  );
  return toDto(rows[0] as Row);
}

export async function listNotifications(
  db: Queryable,
  accountId: string,
  opts: { limit: number; before?: string; unreadOnly: boolean },
): Promise<NotificationDTO[]> {
  const { rows } = await db.query<Row>(
    `SELECT id, kind, payload, read_at, created_at
       FROM notifications
      WHERE account_id = $1
        AND ($2::bigint IS NULL OR id < $2::bigint)
        AND (NOT $3 OR read_at IS NULL)
      ORDER BY id DESC
      LIMIT $4`,
    [accountId, opts.before ?? null, opts.unreadOnly, opts.limit],
  );
  return rows.map(toDto);
}

export async function unreadCount(db: Queryable, accountId: string): Promise<number> {
  const { rows } = await db.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM notifications WHERE account_id = $1 AND read_at IS NULL",
    [accountId],
  );
  return rows[0]?.n ?? 0;
}

export async function markRead(
  db: Queryable,
  accountId: string,
  ids: string[] | "all",
): Promise<number> {
  const result =
    ids === "all"
      ? await db.query(
          "UPDATE notifications SET read_at = now() WHERE account_id = $1 AND read_at IS NULL",
          [accountId],
        )
      : await db.query(
          `UPDATE notifications SET read_at = now()
            WHERE account_id = $1 AND read_at IS NULL AND id = ANY($2::bigint[])`,
          [accountId, ids],
        );
  return result.rowCount ?? 0;
}
