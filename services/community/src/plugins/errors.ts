import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

export function registerErrorHandling(app: FastifyInstance): void {
  app.setNotFoundHandler((_req, reply) => {
    void reply.code(404).send({ error: { code: "not_found", message: "Not found." } });
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.status).send({
        error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
      });
    }
    if (err instanceof ZodError) {
      return reply.code(400).send({
        error: {
          code: "invalid_request",
          message: "Some details were missing or not valid.",
          details: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
        },
      });
    }
    const status = typeof (err as { statusCode?: unknown }).statusCode === "number"
      ? ((err as { statusCode: number }).statusCode)
      : 500;
    if (status === 429) {
      return reply.code(429).send({
        error: { code: "rate_limited", message: "You are doing that too quickly. Please wait a moment." },
      });
    }
    if (status >= 400 && status < 500) {
      return reply.code(status).send({
        error: { code: "bad_request", message: "The request could not be understood." },
      });
    }
    // Never leak internals. Log the error without request bodies.
    req.log.error({ err: { message: (err as Error).message, stack: (err as Error).stack } }, "unhandled error");
    return reply.code(500).send({ error: { code: "server_error", message: "Something went wrong on our side." } });
  });
}
