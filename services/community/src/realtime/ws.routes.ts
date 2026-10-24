import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { forbidden } from "../lib/errors.js";
import { requireActive } from "../plugins/auth.js";
import { getRoom } from "../modules/spaces/repo.js";
import type { ClientMessage } from "./events.js";
import type { Hub, HubClient } from "./hub.js";

const MAX_ROOMS_PER_CONNECTION = 20;
const HEARTBEAT_MS = 30_000;

const clientMessage = z.discriminatedUnion("type", [
  z.object({ type: z.literal("subscribe"), roomId: z.string().uuid() }),
  z.object({ type: z.literal("unsubscribe"), roomId: z.string().uuid() }),
  z.object({ type: z.literal("ping") }),
]);

export async function websocketRoutes(app: FastifyInstance, hub: Hub): Promise<void> {
  const ctx = app.ctx;

  app.get(
    "/ws",
    {
      websocket: true,
      preHandler: [
        async (req) => {
          // Browsers always send Origin on a WebSocket handshake. Refuse anything not from our site.
          const origin = req.headers.origin;
          if (!origin || !ctx.config.allowedOrigins.includes(origin)) {
            throw forbidden("bad_origin", "This connection came from a place we do not accept.");
          }
        },
        requireActive,
      ],
    },
    (socket, req) => {
      const actor = req.actor;
      if (!actor) {
        socket.close(4401, "unauthorized");
        return;
      }
      const send = (event: unknown) => {
        if (socket.readyState === 1) socket.send(JSON.stringify(event));
      };
      const client: HubClient = {
        accountId: actor.accountId,
        personaId: actor.personaId,
        role: actor.role,
        socket,
        rooms: new Set(),
        blocked: new Set(),
      };

      // Listeners are attached straight away. A browser may send "subscribe" the instant the
      // connection opens, and anything sent before a listener exists would be lost. Messages
      // simply wait here until the setup below has finished.
      const setup = (async () => {
        const blocks = await ctx.db.query<{ blocked_persona_id: string }>(
          "SELECT blocked_persona_id FROM blocks WHERE account_id = $1",
          [actor.accountId],
        );
        client.blocked = new Set(blocks.rows.map((b) => b.blocked_persona_id));
        hub.add(client);
        send({ type: "ready", data: { personaId: actor.personaId } });
      })();
      setup.catch(() => socket.close(1011, "setup_failed"));

      let alive = true;
      socket.on("pong", () => {
        alive = true;
      });
      const heartbeat = setInterval(() => {
        if (!alive) {
          socket.terminate();
          return;
        }
        alive = false;
        socket.ping();
      }, HEARTBEAT_MS);

      socket.on("message", async (raw: Buffer) => {
        try {
          await setup;
        } catch {
          return;
        }
        let msg: ClientMessage;
        try {
          msg = clientMessage.parse(JSON.parse(raw.toString("utf8")));
        } catch {
          send({ type: "error", data: { code: "invalid_message", message: "That message was not understood." } });
          return;
        }
        if (msg.type === "ping") return send({ type: "pong", data: {} });
        if (msg.type === "unsubscribe") {
          hub.unsubscribe(client, msg.roomId);
          return send({ type: "unsubscribed", data: { roomId: msg.roomId } });
        }
        if (client.rooms.size >= MAX_ROOMS_PER_CONNECTION && !client.rooms.has(msg.roomId)) {
          return send({ type: "error", data: { code: "too_many_rooms", message: "Too many rooms open at once." } });
        }
        const room = await getRoom(ctx.db, msg.roomId);
        if (!room) {
          return send({ type: "error", data: { code: "not_found", message: "That room could not be found." } });
        }
        hub.subscribe(client, room.id);
        send({ type: "subscribed", data: { roomId: room.id } });
      });

      socket.on("close", () => {
        clearInterval(heartbeat);
        void setup.then(() => hub.remove(client), () => undefined);
      });
      socket.on("error", () => socket.terminate());
    },
  );
}
