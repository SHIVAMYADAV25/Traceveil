import type { FastifyInstance, FastifyReply } from "fastify";
import { actorOf, requireAuth, SESSION_COOKIE } from "../../plugins/auth.js";
import * as service from "./service.js";
import {
  deleteAccountBody,
  loginBody,
  onboardingBody,
  passwordBody,
  personaBody,
  registerBody,
} from "./schema.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const ctx = app.ctx;

  const setSessionCookie = (reply: FastifyReply, token: string) => {
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: ctx.config.cookieSecure,
      sameSite: ctx.config.cookieSameSite,
      path: "/",
      maxAge: ctx.config.sessionDays * 24 * 60 * 60,
    });
  };

  app.post(
    "/auth/register",
    { config: { rateLimit: { max: ctx.config.registerLimitPerHour, timeWindow: "1 hour" } } },
    async (req, reply) => {
      const body = registerBody.parse(req.body);
      const result = await service.register(ctx, { password: body.password });
      setSessionCookie(reply, result.session.token);
      return reply.code(201).send({
        handle: result.handle,
        // Shown exactly once. Only a hash is stored, so it cannot be shown again.
        recoveryPhrase: result.recoveryPhrase,
        displayName: result.displayName,
      });
    },
  );

  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } },
    async (req, reply) => {
      const body = loginBody.parse(req.body);
      const session = await service.login(ctx, body);
      setSessionCookie(reply, session.token);
      return { ok: true };
    },
  );

  app.post("/auth/logout", async (req, reply) => {
    await service.logout(ctx, req.sessionTokenHash);
    if (req.actor) ctx.realtime.disconnectAccount(req.actor.accountId);
    reply.clearCookie(SESSION_COOKIE, { path: "/", secure: ctx.config.cookieSecure, sameSite: ctx.config.cookieSameSite, httpOnly: true });
    return { ok: true };
  });

  app.get("/me", { preHandler: requireAuth }, async (req) => service.describeMe(ctx, actorOf(req)));

  app.post("/me/onboarding", { preHandler: requireAuth }, async (req) => {
    const body = onboardingBody.parse(req.body);
    return service.completeOnboarding(ctx, actorOf(req), { displayName: body.displayName });
  });

  app.patch("/me/persona", { preHandler: requireAuth }, async (req) => {
    const body = personaBody.parse(req.body);
    return service.updatePersona(ctx, actorOf(req), body);
  });

  app.put("/me/password", { preHandler: requireAuth }, async (req) => {
    const body = passwordBody.parse(req.body);
    await service.setPassword(ctx, actorOf(req), body.password);
    return { ok: true };
  });

  app.delete("/me", { preHandler: requireAuth }, async (req, reply) => {
    deleteAccountBody.parse(req.body);
    await service.deleteAccount(ctx, actorOf(req));
    reply.clearCookie(SESSION_COOKIE, { path: "/", secure: ctx.config.cookieSecure, sameSite: ctx.config.cookieSameSite, httpOnly: true });
    return { ok: true };
  });
}
