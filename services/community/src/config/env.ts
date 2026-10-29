import { z } from "zod";

const bool = z.enum(["true", "false"]).transform((v) => v === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  COMMUNITY_PORT: z.coerce.number().int().min(1).max(65535).default(8004),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  COOKIE_SECURE: bool.default(false),
  // "lax" when web and community share a registrable domain; "none" when they are on different sites
  // (e.g. *.vercel.app + *.onrender.com). "none" requires COOKIE_SECURE=true.
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  TRUST_PROXY: bool.default(false),
  COMMUNITY_OPEN: bool.default(false),
  SESSION_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  RATE_LIMIT_ENABLED: bool.default(true),
  REGISTER_LIMIT_PER_HOUR: z.coerce.number().int().min(1).max(10000).default(5),
});

export interface Config {
  env: "development" | "test" | "production";
  port: number;
  databaseUrl: string;
  allowedOrigins: string[];
  cookieSecure: boolean;
  cookieSameSite: "lax" | "strict" | "none";
  trustProxy: boolean;
  communityOpen: boolean;
  sessionDays: number;
  retentionDays: number;
  rateLimitEnabled: boolean;
  /** New sign-ups allowed per hour from one address. Raise it for an office or shelter that helps several people at once. */
  registerLimitPerHour: number;
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid configuration:\n${lines.join("\n")}`);
  }
  const e = parsed.data;
  if (e.NODE_ENV === "production" && !e.COOKIE_SECURE) {
    throw new Error("Invalid configuration:\n  COOKIE_SECURE must be true in production");
  }
  if (e.COOKIE_SAMESITE === "none" && !e.COOKIE_SECURE) {
    throw new Error("Invalid configuration:\n  COOKIE_SAMESITE=none requires COOKIE_SECURE=true");
  }
  return {
    env: e.NODE_ENV,
    port: e.COMMUNITY_PORT,
    databaseUrl: e.DATABASE_URL,
    allowedOrigins: e.ALLOWED_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    cookieSecure: e.COOKIE_SECURE,
    cookieSameSite: e.COOKIE_SAMESITE,
    trustProxy: e.TRUST_PROXY,
    communityOpen: e.COMMUNITY_OPEN,
    sessionDays: e.SESSION_DAYS,
    retentionDays: e.RETENTION_DAYS,
    rateLimitEnabled: e.RATE_LIMIT_ENABLED,
    registerLimitPerHour: e.REGISTER_LIMIT_PER_HOUR,
  };
}
