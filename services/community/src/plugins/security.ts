import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";
import { forbidden } from "../lib/errors.js";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function registerSecurity(app: FastifyInstance): Promise<void> {
  const { allowedOrigins } = app.ctx.config;

  await app.register(helmet, {
    // This service only returns JSON.
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: "same-site" },
  });

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "X-Community-Client"],
    maxAge: 600,
  });

  await app.register(cookie);

  // Cross-site request protection for anything that changes data:
  //  1. a browser Origin, when present, must be one we allow;
  //  2. a custom header must be present (a plain cross-site form cannot set it).
  app.addHook("onRequest", async (req) => {
    if (!MUTATING.has(req.method)) return;
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      throw forbidden("bad_origin", "This request came from a place we do not accept.");
    }
    if (req.headers["x-community-client"] !== "web") {
      throw forbidden("missing_client_header", "This request is missing a required header.");
    }
  });
}
