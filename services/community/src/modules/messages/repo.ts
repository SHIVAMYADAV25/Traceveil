import type { Queryable } from "../../db/pool.js";

export interface MessageDTO {
  id: string;
  roomId: string;
  status: "visible" | "hidden_by_mod" | "deleted_by_author";
  body: string | null;
  contentWarning: string | null;
  needTag: string | null;
  createdAt: string;
  editedAt: string | null;
  author: {
    personaId: string;
    displayName: string;
    avatarSeed: string;
    badge: "admin" | "moderator" | "verified_helper" | null;
    linksClickable: boolean;
  };
  replyTo: {
    id: string;
    authorName: string;
    status: string;
    excerpt: string | null;
    hasContentWarning: boolean;
  } | null;
  mentions: Array<{ personaId: string; displayName: string }>;
  reactions: Array<{ kind: string; count: number; mine: boolean }>;
}

interface Row {
  id: string;
  room_id: string;
  status: MessageDTO["status"];
  body: string;
  content_warning: string | null;
  need_tag: string | null;
  created_at: Date;
  edited_at: Date | null;
  persona_id: string;
  display_name: string;
  avatar_seed: string;
  author_role: string | null;
  reply_id: string | null;
  reply_status: string | null;
  reply_body: string | null;
  reply_cw: string | null;
  reply_author: string | null;
  mentions: MessageDTO["mentions"];
  reactions: MessageDTO["reactions"];
}

const BADGES = new Set(["admin", "moderator", "verified_helper"]);

function toDto(r: Row): MessageDTO {
  const badge = r.author_role && BADGES.has(r.author_role) ? (r.author_role as MessageDTO["author"]["badge"]) : null;
  const visible = r.status === "visible";
  const replyVisible = r.reply_status === "visible" && !r.reply_cw;
  return {
    id: r.id,
    roomId: r.room_id,
    status: r.status,
    body: visible ? r.body : null,
    contentWarning: visible ? r.content_warning : null,
    needTag: visible ? r.need_tag : null,
    createdAt: r.created_at.toISOString(),
    editedAt: r.edited_at ? r.edited_at.toISOString() : null,
    author: {
      personaId: r.persona_id,
      displayName: r.display_name,
      avatarSeed: r.avatar_seed,
      badge,
      linksClickable: badge !== null,
    },
    replyTo: r.reply_id
      ? {
          id: r.reply_id,
          authorName: r.reply_author ?? "Deleted member",
          status: r.reply_status ?? "deleted_by_author",
          excerpt: replyVisible && r.reply_body ? r.reply_body.slice(0, 100) : null,
          hasContentWarning: Boolean(r.reply_cw) && r.reply_status === "visible",
        }
      : null,
    mentions: visible ? r.mentions : [],
    reactions: visible ? r.reactions : [],
  };
}

const BASE_SELECT = `
  SELECT m.id, m.room_id, m.status, m.body, m.content_warning, m.need_tag, m.created_at, m.edited_at,
         p.id AS persona_id, p.display_name, p.avatar_seed, a.role AS author_role,
         rm.id AS reply_id, rm.status AS reply_status, rm.body AS reply_body,
         rm.content_warning AS reply_cw, rp.display_name AS reply_author,
         COALESCE((SELECT json_agg(json_build_object('personaId', mp.id, 'displayName', mp.display_name))
                     FROM message_mentions mm JOIN personas mp ON mp.id = mm.persona_id
                    WHERE mm.message_id = m.id), '[]'::json) AS mentions,
         COALESCE((SELECT json_agg(json_build_object('kind', x.kind, 'count', x.c, 'mine', x.mine) ORDER BY x.kind)
                     FROM (SELECT kind, count(*)::int AS c, COALESCE(bool_or(persona_id = $1::uuid), false) AS mine
                             FROM reactions WHERE message_id = m.id GROUP BY kind) x), '[]'::json) AS reactions
    FROM messages m
    JOIN personas p ON p.id = m.persona_id
    LEFT JOIN accounts a ON a.id = p.account_id
    LEFT JOIN messages rm ON rm.id = m.reply_to_id
    LEFT JOIN personas rp ON rp.id = rm.persona_id`;

/** Newest-first page of a room, hiding people the viewer has blocked. */
export async function listRoomMessages(
  db: Queryable,
  v: { viewerPersonaId: string; viewerAccountId: string; roomId: string; before?: string; limit: number },
): Promise<{ messages: MessageDTO[]; hasMore: boolean }> {
  const { rows } = await db.query<Row>(
    `${BASE_SELECT}
      WHERE m.room_id = $3
        AND ($4::bigint IS NULL OR m.id < $4::bigint)
        AND m.persona_id NOT IN (SELECT blocked_persona_id FROM blocks WHERE account_id = $2)
      ORDER BY m.id DESC
      LIMIT $5`,
    [v.viewerPersonaId, v.viewerAccountId, v.roomId, v.before ?? null, v.limit + 1],
  );
  const hasMore = rows.length > v.limit;
  const page = rows.slice(0, v.limit).reverse();
  return { messages: page.map(toDto), hasMore };
}

/** One message. Pass a null viewer for the neutral version that is pushed to everyone. */
export async function getMessageDto(
  db: Queryable,
  messageId: string,
  viewerPersonaId: string | null,
): Promise<MessageDTO | null> {
  const { rows } = await db.query<Row>(`${BASE_SELECT} WHERE m.id = $2::bigint`, [viewerPersonaId, messageId]);
  return rows[0] ? toDto(rows[0]) : null;
}

export interface MessageCore {
  id: string;
  room_id: string;
  persona_id: string;
  status: MessageDTO["status"];
  body: string;
  reply_to_id: string | null;
}

export async function getMessageCore(db: Queryable, messageId: string): Promise<MessageCore | null> {
  const { rows } = await db.query<MessageCore>(
    "SELECT id, room_id, persona_id, status, body, reply_to_id FROM messages WHERE id = $1::bigint",
    [messageId],
  );
  return rows[0] ?? null;
}

export async function findByClientId(
  db: Queryable,
  personaId: string,
  clientMsgId: string,
): Promise<string | null> {
  const { rows } = await db.query<{ id: string }>(
    "SELECT id FROM messages WHERE persona_id = $1 AND client_msg_id = $2",
    [personaId, clientMsgId],
  );
  return rows[0]?.id ?? null;
}

export async function secondsSinceLastMessage(
  db: Queryable,
  personaId: string,
  roomId: string,
): Promise<number | null> {
  const { rows } = await db.query<{ s: number | null }>(
    `SELECT EXTRACT(EPOCH FROM (now() - max(created_at)))::float8 AS s
       FROM messages WHERE persona_id = $1 AND room_id = $2`,
    [personaId, roomId],
  );
  return rows[0]?.s ?? null;
}

export async function hasRecentDuplicate(db: Queryable, personaId: string, body: string): Promise<boolean> {
  const { rows } = await db.query(
    `SELECT 1 FROM messages
      WHERE persona_id = $1 AND lower(body) = lower($2)
        AND created_at > now() - interval '2 minutes' AND status = 'visible'
      LIMIT 1`,
    [personaId, body],
  );
  return rows.length > 0;
}

/** Of the given personas, which may be mentioned in this room (recently active, or staff)? */
export async function mentionablePersonas(
  db: Queryable,
  roomId: string,
  personaIds: string[],
  activityDays: number,
): Promise<string[]> {
  if (personaIds.length === 0) return [];
  const { rows } = await db.query<{ id: string }>(
    `SELECT p.id FROM personas p
      WHERE p.id = ANY($2::uuid[]) AND p.account_id IS NOT NULL
        AND (
          EXISTS (SELECT 1 FROM messages m
                   WHERE m.room_id = $1 AND m.persona_id = p.id
                     AND m.created_at > now() - make_interval(days => $3))
          OR EXISTS (SELECT 1 FROM accounts a WHERE a.id = p.account_id AND a.role IN ('moderator', 'admin'))
        )`,
    [roomId, personaIds, activityDays],
  );
  return rows.map((r) => r.id);
}

export async function insertMessage(
  db: Queryable,
  v: {
    roomId: string;
    personaId: string;
    body: string;
    replyToId: string | null;
    needTag: string | null;
    contentWarning: string | null;
    clientMsgId: string;
    retentionDays: number;
  },
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO messages (room_id, persona_id, body, reply_to_id, need_tag, content_warning,
                           client_msg_id, expires_at)
     VALUES ($1, $2, $3, $4::bigint, $5, $6, $7, now() + make_interval(days => $8))
     RETURNING id`,
    [v.roomId, v.personaId, v.body, v.replyToId, v.needTag, v.contentWarning, v.clientMsgId, v.retentionDays],
  );
  return (rows[0] as { id: string }).id;
}

export async function insertMentions(db: Queryable, messageId: string, personaIds: string[]): Promise<void> {
  if (personaIds.length === 0) return;
  await db.query(
    `INSERT INTO message_mentions (message_id, persona_id)
     SELECT $1::bigint, unnest($2::uuid[]) ON CONFLICT DO NOTHING`,
    [messageId, personaIds],
  );
}

export async function updateMessageBody(
  db: Queryable,
  messageId: string,
  body: string,
  contentWarning: string | null,
): Promise<void> {
  await db.query(
    "UPDATE messages SET body = $2, content_warning = $3, edited_at = now() WHERE id = $1::bigint",
    [messageId, body, contentWarning],
  );
}

export async function markDeletedByAuthor(db: Queryable, messageId: string): Promise<void> {
  await db.query(
    `UPDATE messages SET status = 'deleted_by_author', body = '', content_warning = NULL, need_tag = NULL
      WHERE id = $1::bigint`,
    [messageId],
  );
  await db.query("DELETE FROM message_mentions WHERE message_id = $1::bigint", [messageId]);
}

/** Who should hear about a reply or mention: the account behind a persona, unless they blocked the author. */
export async function notifiableAccounts(
  db: Queryable,
  personaIds: string[],
  authorPersonaId: string,
): Promise<Array<{ personaId: string; accountId: string }>> {
  if (personaIds.length === 0) return [];
  const { rows } = await db.query<{ persona_id: string; account_id: string }>(
    `SELECT p.id AS persona_id, p.account_id
       FROM personas p
      WHERE p.id = ANY($1::uuid[]) AND p.account_id IS NOT NULL AND p.id <> $2
        AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.account_id = p.account_id AND b.blocked_persona_id = $2)`,
    [personaIds, authorPersonaId],
  );
  return rows.map((r) => ({ personaId: r.persona_id, accountId: r.account_id }));
}
