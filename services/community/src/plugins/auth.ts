import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "../config/constants.js";
import { sha256Hex } from "../lib/crypto.js";
import { forbidden, unauthorized } from "../lib/errors.js";
import type { Actor } from "../types.js";
import { activeAccountRestrictions } from "../modules/moderation/restrictions.js";

export const SESSION_COOKIE = "community_session";

interface ActorRow {
  account_id: string;
  persona_id: string;
  handle: string;
  role: Role;
  created_at: Date;
  rules_accepted_at: Date | null;
  last_seen_at: Date;
}

export async function registerAuth(app: FastifyInstance): Promise<void> {
  app.decorateRequest("actor", null);
  app.decorateRequest("sessionTokenHash", null);

  app.addHook("onRequest", async (req) => {
    const token = req.cookies[SESSION_COOKIE];
    if (!token) return;
    const hash = sha256Hex(token);
    const { rows } = await app.ctx.db.query<ActorRow>(
      `SELECT a.id AS account_id, p.id AS persona_id, a.handle, a.role, a.created_at,
              a.rules_accepted_at, a.last_seen_at
         FROM sessions s
         JOIN accounts a ON a.id = s.account_id
         JOIN personas p ON p.account_id = a.id
        WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [hash],
    );
    const row = rows[0];
    if (!row) return;
    req.sessionTokenHash = hash;
    req.actor = {
      accountId: row.account_id,
      personaId: row.persona_id,
      handle: row.handle,
      role: row.role,
      createdAt: row.created_at,
      rulesAcceptedAt: row.rules_accepted_at,
    };
    // Keep last_seen roughly current without writing on every request.
    if (Date.now() - row.last_seen_at.getTime() > 5 * 60 * 1000) {
      void app.ctx.db.query("UPDATE accounts SET last_seen_at = now() WHERE id = $1", [row.account_id]);
    }
  });
}

/** Route guard: must be signed in. */
export async function requireAuth(req: FastifyRequest): Promise<void> {
  if (!req.actor) throw unauthorized();
}

/**
 * Route guard: signed in and not suspended or banned.
 * Suspended and banned people can still open the few routes that use requireAuth alone
 * (their account page, notifications and appeals).
 */
export async function requireActive(req: FastifyRequest): Promise<void> {
  if (!req.actor) throw unauthorized();
  const restrictions = await activeAccountRestrictions(req.server.ctx.db, req.actor.accountId);
  const blocking = restrictions.find((r) => r.kind === "suspend" || r.kind === "ban");
  if (blocking) {
    throw forbidden(
      blocking.kind === "ban" ? "banned" : "suspended",
      blocking.kind === "ban"
        ? "Your access to the Community has been removed. You can appeal from your account page."
        : "Your access to the Community is paused. You can appeal from your account page.",
    );
  }
}

/** Route guard factory: signed in, active, and one of the given roles. */
export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    await requireActive(req);
    if (!req.actor || !roles.includes(req.actor.role)) {
      throw forbidden("insufficient_role", "You do not have access to this area.");
    }
  };
}

export function actorOf(req: FastifyRequest): Actor {
  if (!req.actor) throw unauthorized();
  return req.actor;
}
