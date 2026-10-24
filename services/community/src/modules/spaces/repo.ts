import type { Queryable } from "../../db/pool.js";
import type { RoomKind } from "../../config/constants.js";

export interface RoomRow {
  id: string;
  space_id: string;
  space_slug: string;
  slug: string;
  title: string;
  purpose: string;
  kind: RoomKind;
  language: string;
  slow_mode_seconds: number;
  min_account_age_hours: number;
  is_locked: boolean;
  is_archived: boolean;
  sort_order: number;
}

const ROOM_COLUMNS = `r.id, r.space_id, s.slug AS space_slug, r.slug, r.title, r.purpose, r.kind, r.language,
  r.slow_mode_seconds, r.min_account_age_hours, r.is_locked, r.is_archived, r.sort_order`;

export async function getRoom(db: Queryable, roomId: string): Promise<RoomRow | null> {
  const { rows } = await db.query<RoomRow>(
    `SELECT ${ROOM_COLUMNS} FROM rooms r JOIN spaces s ON s.id = r.space_id
      WHERE r.id = $1 AND NOT r.is_archived AND NOT s.is_archived`,
    [roomId],
  );
  return rows[0] ?? null;
}

export async function getRoomBySlugs(
  db: Queryable,
  spaceSlug: string,
  roomSlug: string,
): Promise<RoomRow | null> {
  const { rows } = await db.query<RoomRow>(
    `SELECT ${ROOM_COLUMNS} FROM rooms r JOIN spaces s ON s.id = r.space_id
      WHERE s.slug = $1 AND r.slug = $2 AND NOT r.is_archived AND NOT s.is_archived`,
    [spaceSlug, roomSlug],
  );
  return rows[0] ?? null;
}

export interface SpaceListRow extends RoomRow {
  space_title: string;
  space_description: string;
  space_sort: number;
  unread: number;
  muted: boolean;
}

/** Every open room with the viewer's unread count (capped at 100) and mute setting. */
export async function listSpacesWithRooms(
  db: Queryable,
  accountId: string,
  personaId: string,
): Promise<SpaceListRow[]> {
  const { rows } = await db.query<SpaceListRow>(
    `SELECT ${ROOM_COLUMNS},
            s.title AS space_title, s.description AS space_description, s.sort_order AS space_sort,
            COALESCE(rr.muted, false) AS muted,
            (SELECT count(*)::int FROM (
               SELECT 1 FROM messages m
                WHERE m.room_id = r.id
                  AND m.id > COALESCE(rr.last_read_message_id, 0)
                  AND m.persona_id <> $2
                  AND m.status = 'visible'
                  AND m.persona_id NOT IN (SELECT blocked_persona_id FROM blocks WHERE account_id = $1)
                LIMIT 100) c) AS unread
       FROM rooms r
       JOIN spaces s ON s.id = r.space_id
       LEFT JOIN room_reads rr ON rr.room_id = r.id AND rr.account_id = $1
      WHERE NOT r.is_archived AND NOT s.is_archived
      ORDER BY s.sort_order, s.title, r.sort_order, r.title`,
    [accountId, personaId],
  );
  return rows;
}

export interface NoteRow {
  id: string;
  title: string;
  body: string;
  created_at: Date;
}

export async function listNotes(db: Queryable, roomId: string): Promise<NoteRow[]> {
  const { rows } = await db.query<NoteRow>(
    "SELECT id, title, body, created_at FROM room_notes WHERE room_id = $1 ORDER BY created_at",
    [roomId],
  );
  return rows;
}

export async function setLastRead(
  db: Queryable,
  accountId: string,
  roomId: string,
  messageId: string,
): Promise<void> {
  await db.query(
    `INSERT INTO room_reads (account_id, room_id, last_read_message_id) VALUES ($1, $2, $3::bigint)
     ON CONFLICT (account_id, room_id)
     DO UPDATE SET last_read_message_id = GREATEST(COALESCE(room_reads.last_read_message_id, 0), EXCLUDED.last_read_message_id)`,
    [accountId, roomId, messageId],
  );
}

export async function setMuted(db: Queryable, accountId: string, roomId: string, muted: boolean): Promise<void> {
  await db.query(
    `INSERT INTO room_reads (account_id, room_id, muted) VALUES ($1, $2, $3)
     ON CONFLICT (account_id, room_id) DO UPDATE SET muted = EXCLUDED.muted`,
    [accountId, roomId, muted],
  );
}
