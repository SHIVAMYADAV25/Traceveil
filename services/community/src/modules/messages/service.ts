import {
  MENTION_ACTIVITY_DAYS,
  MENTION_MAX_PER_MESSAGE,
  NEW_ACCOUNT_COOLDOWN_SECONDS,
  NEW_ACCOUNT_HOURS,
} from "../../config/constants.js";
import { withTx } from "../../db/pool.js";
import { badRequest, conflict, forbidden, notFound, tooMany } from "../../lib/errors.js";
import type { Actor, AppContext } from "../../types.js";
import { notify } from "../notifications/service.js";
import { accountAgeHours, isStaff, postingState } from "../spaces/posting.js";
import { getRoom } from "../spaces/repo.js";
import { runContentGuards } from "./guards.js";
import type { PostMessageInput } from "./schema.js";
import * as repo from "./repo.js";

export async function listMessages(
  ctx: AppContext,
  actor: Actor,
  roomId: string,
  opts: { before?: string; limit: number },
) {
  if (!(await getRoom(ctx.db, roomId))) throw notFound("That room could not be found.");
  return repo.listRoomMessages(ctx.db, {
    viewerPersonaId: actor.personaId,
    viewerAccountId: actor.accountId,
    roomId,
    before: opts.before,
    limit: opts.limit,
  });
}

export async function postMessage(
  ctx: AppContext,
  actor: Actor,
  roomId: string,
  input: PostMessageInput,
): Promise<{ message: repo.MessageDTO; support: boolean; duplicate: boolean }> {
  const room = await getRoom(ctx.db, roomId);
  if (!room) throw notFound("That room could not be found.");

  // A retry of something already saved returns the original, without checking rules again.
  const existingId = await repo.findByClientId(ctx.db, actor.personaId, input.clientMsgId);
  if (existingId) {
    const message = await repo.getMessageDto(ctx.db, existingId, actor.personaId);
    if (message) return { message, support: false, duplicate: true };
  }

  const state = await postingState(ctx, actor, room);
  if (!state.allowed) throw forbidden(state.code, state.message);

  const text = input.contentWarning ? `${input.body}\n${input.contentWarning}` : input.body;
  const { crisis } = runContentGuards(ctx, actor, text, input.confirmShare);

  const staff = isStaff(actor);
  if (!staff) {
    const isNew = accountAgeHours(actor) < NEW_ACCOUNT_HOURS;
    const wait = Math.max(room.slow_mode_seconds, isNew ? NEW_ACCOUNT_COOLDOWN_SECONDS : 0);
    if (wait > 0) {
      const since = await repo.secondsSinceLastMessage(ctx.db, actor.personaId, room.id);
      if (since !== null && since < wait) {
        const retryAfterSeconds = Math.ceil(wait - since);
        throw tooMany("slow_mode", `Please wait ${retryAfterSeconds} more second${retryAfterSeconds === 1 ? "" : "s"} before posting again.`, {
          retryAfterSeconds,
        });
      }
    }
    if (await repo.hasRecentDuplicate(ctx.db, actor.personaId, input.body)) {
      throw conflict("duplicate_message", "You just sent that exact message.");
    }
  }

  let replyToId: string | null = null;
  let replyAuthorPersona: string | null = null;
  if (input.replyToId) {
    const parent = await repo.getMessageCore(ctx.db, input.replyToId);
    if (!parent || parent.room_id !== room.id) {
      throw badRequest("invalid_reply", "The message you are replying to is not in this room.");
    }
    replyToId = parent.id;
    replyAuthorPersona = parent.persona_id;
  }

  const wanted = [...new Set(input.mentions)].filter((id) => id !== actor.personaId);
  if (wanted.length > MENTION_MAX_PER_MESSAGE) {
    throw badRequest("too_many_mentions", `You can mention up to ${MENTION_MAX_PER_MESSAGE} people in one message.`);
  }
  const allowed = new Set(await repo.mentionablePersonas(ctx.db, room.id, wanted, MENTION_ACTIVITY_DAYS));
  if (wanted.some((id) => !allowed.has(id))) {
    throw badRequest("invalid_mention", "You can only mention people who have recently taken part in this room.");
  }

  const messageId = await withTx(ctx.db, async (tx) => {
    const id = await repo.insertMessage(tx, {
      roomId: room.id,
      personaId: actor.personaId,
      body: input.body,
      replyToId,
      needTag: input.needTag ?? null,
      contentWarning: input.contentWarning ?? null,
      clientMsgId: input.clientMsgId,
      retentionDays: ctx.config.retentionDays,
    });
    await repo.insertMentions(tx, id, wanted);
    return id;
  });

  const neutral = await repo.getMessageDto(ctx.db, messageId, null);
  const mine = await repo.getMessageDto(ctx.db, messageId, actor.personaId);
  if (!neutral || !mine) throw notFound();

  ctx.realtime.broadcastRoom(room.id, { type: "message.created", data: { message: neutral } }, actor.personaId);

  const replyTargets = replyAuthorPersona ? [replyAuthorPersona] : [];
  const targets = await repo.notifiableAccounts(ctx.db, [...new Set([...wanted, ...replyTargets])], actor.personaId);
  for (const t of targets) {
    const kind = wanted.includes(t.personaId) ? "mention" : "reply";
    await notify(ctx, t.accountId, kind, {
      roomId: room.id,
      roomTitle: room.title,
      spaceSlug: room.space_slug,
      roomSlug: room.slug,
      messageId,
      fromName: mine.author.displayName,
    });
  }

  return { message: mine, support: crisis, duplicate: false };
}

async function loadOwnVisibleMessage(ctx: AppContext, actor: Actor, messageId: string) {
  const core = await repo.getMessageCore(ctx.db, messageId);
  if (!core || core.persona_id !== actor.personaId) throw notFound("That message could not be found.");
  if (core.status !== "visible") throw forbidden("message_unavailable", "This message can no longer be changed.");
  return core;
}

export async function editMessage(
  ctx: AppContext,
  actor: Actor,
  messageId: string,
  input: { body: string; contentWarning?: string; confirmShare: boolean },
) {
  const core = await loadOwnVisibleMessage(ctx, actor, messageId);
  const room = await getRoom(ctx.db, core.room_id);
  if (!room) throw notFound("That room could not be found.");
  const state = await postingState(ctx, actor, room);
  if (!state.allowed) throw forbidden(state.code, state.message);

  const text = input.contentWarning ? `${input.body}\n${input.contentWarning}` : input.body;
  const { crisis } = runContentGuards(ctx, actor, text, input.confirmShare);

  await repo.updateMessageBody(ctx.db, messageId, input.body, input.contentWarning ?? null);
  const neutral = await repo.getMessageDto(ctx.db, messageId, null);
  const mine = await repo.getMessageDto(ctx.db, messageId, actor.personaId);
  if (!neutral || !mine) throw notFound();
  ctx.realtime.broadcastRoom(core.room_id, { type: "message.updated", data: { message: neutral } }, actor.personaId);
  return { message: mine, support: crisis };
}

export async function deleteOwnMessage(ctx: AppContext, actor: Actor, messageId: string): Promise<void> {
  const core = await loadOwnVisibleMessage(ctx, actor, messageId);
  await repo.markDeletedByAuthor(ctx.db, messageId);
  ctx.realtime.broadcastRoom(core.room_id, {
    type: "message.deleted",
    data: { roomId: core.room_id, messageId },
  });
}
