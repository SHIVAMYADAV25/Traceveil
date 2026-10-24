import { SNAPSHOT_RETENTION_DAYS } from "../config/constants.js";
import type { AppContext } from "../types.js";

export interface JobReport {
  expiredMessages: number;
  liftedRestrictions: number;
  purgedSnapshots: number;
  purgedSessions: number;
  purgedNotifications: number;
}

/** Remove what has passed its retention date. Safe to run as often as you like. */
export async function runCleanup(ctx: AppContext): Promise<JobReport> {
  const q = (sql: string, params: unknown[] = []) => ctx.db.query(sql, params).then((r) => r.rowCount ?? 0);
  return {
    expiredMessages: await q("DELETE FROM messages WHERE expires_at < now()"),
    liftedRestrictions: await q("UPDATE restrictions SET active = false WHERE active AND ends_at IS NOT NULL AND ends_at < now()"),
    purgedSnapshots: await q(
      `UPDATE reports SET context_snapshot = NULL
        WHERE context_snapshot IS NOT NULL AND resolved_at IS NOT NULL
          AND resolved_at < now() - make_interval(days => $1)`,
      [SNAPSHOT_RETENTION_DAYS],
    ),
    purgedSessions: await q("DELETE FROM sessions WHERE expires_at < now()"),
    purgedNotifications: await q("DELETE FROM notifications WHERE created_at < now() - interval '60 days'"),
  };
}

/** Run cleanup now and then every interval. Returns a function that stops it. */
export function startJobs(ctx: AppContext, intervalMs = 10 * 60 * 1000): () => void {
  const run = () =>
    runCleanup(ctx).catch((err: unknown) => console.error("cleanup failed:", err instanceof Error ? err.message : err));
  void run();
  const timer = setInterval(() => void run(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
