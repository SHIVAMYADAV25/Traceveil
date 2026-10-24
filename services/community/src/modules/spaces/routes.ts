import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { actorOf, requireActive, requireAuth } from "../../plugins/auth.js";
import { notFound } from "../../lib/errors.js";
import type { Actor, AppContext } from "../../types.js";
import { postingState } from "./posting.js";
import * as repo from "./repo.js";

const uuid = z.string().uuid();
const readBody = z.object({ messageId: z.string().regex(/^\d+$/) });
const muteBody = z.object({ muted: z.boolean() });

export function roomDto(room: repo.RoomRow) {
  return {
    id: room.id,
    spaceSlug: room.space_slug,
    slug: room.slug,
    title: room.title,
    purpose: room.purpose,
    kind: room.kind,
    language: room.language,
    slowModeSeconds: room.slow_mode_seconds,
    minAccountAgeHours: room.min_account_age_hours,
    isLocked: room.is_locked,
  };
}

async function describeRoom(ctx: AppContext, actor: Actor, room: repo.RoomRow) {
  const [notes, posting] = await Promise.all([repo.listNotes(ctx.db, room.id), postingState(ctx, actor, room)]);
  return {
    ...roomDto(room),
    notes: notes.map((n) => ({ id: n.id, title: n.title, body: n.body })),
    posting,
  };
}

export async function spaceRoutes(app: FastifyInstance): Promise<void> {
  const ctx = app.ctx;

  // Public: lets the sign-in page say whether chat rooms are open.
  app.get("/status", async () => ({ open: ctx.config.communityOpen }));

  app.get("/spaces", { preHandler: requireActive }, async (req) => {
    const actor = actorOf(req);
    const rows = await repo.listSpacesWithRooms(ctx.db, actor.accountId, actor.personaId);
    const spaces: Array<{
      slug: string;
      title: string;
      description: string;
      rooms: Array<ReturnType<typeof roomDto> & { unread: number; muted: boolean }>;
    }> = [];
    for (const row of rows) {
      let space = spaces.find((s) => s.slug === row.space_slug);
      if (!space) {
        space = { slug: row.space_slug, title: row.space_title, description: row.space_description, rooms: [] };
        spaces.push(space);
      }
      space.rooms.push({ ...roomDto(row), unread: row.unread, muted: row.muted });
    }
    return { spaces };
  });

  app.get("/rooms/:roomId", { preHandler: requireActive }, async (req) => {
    const { roomId } = z.object({ roomId: uuid }).parse(req.params);
    const room = await repo.getRoom(ctx.db, roomId);
    if (!room) throw notFound("That room could not be found.");
    return { room: await describeRoom(ctx, actorOf(req), room) };
  });

  app.get("/rooms/by-slug/:space/:room", { preHandler: requireActive }, async (req) => {
    const p = z.object({ space: z.string().max(80), room: z.string().max(80) }).parse(req.params);
    const room = await repo.getRoomBySlugs(ctx.db, p.space, p.room);
    if (!room) throw notFound("That room could not be found.");
    return { room: await describeRoom(ctx, actorOf(req), room) };
  });

  app.post("/rooms/:roomId/read", { preHandler: requireActive }, async (req) => {
    const { roomId } = z.object({ roomId: uuid }).parse(req.params);
    const { messageId } = readBody.parse(req.body);
    if (!(await repo.getRoom(ctx.db, roomId))) throw notFound("That room could not be found.");
    await repo.setLastRead(ctx.db, actorOf(req).accountId, roomId, messageId);
    return { ok: true };
  });

  app.put("/rooms/:roomId/mute", { preHandler: requireActive }, async (req) => {
    const { roomId } = z.object({ roomId: uuid }).parse(req.params);
    const { muted } = muteBody.parse(req.body);
    if (!(await repo.getRoom(ctx.db, roomId))) throw notFound("That room could not be found.");
    await repo.setMuted(ctx.db, actorOf(req).accountId, roomId, muted);
    return { ok: true, muted };
  });
}
