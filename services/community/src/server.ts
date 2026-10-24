import { buildApp } from "./app.js";
import { loadConfig } from "./config/env.js";
import { createPool } from "./db/pool.js";
import { runMigrations } from "./db/migrate.js";
import { startJobs } from "./jobs/jobs.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const db = createPool(config.databaseUrl);
  const applied = await runMigrations(db);
  if (applied.length) console.log(`Applied migrations: ${applied.join(", ")}`);

  const { app, hub } = await buildApp(config, db, { logger: true });

  const stopJobs = startJobs(app.ctx);

  const shutdown = async (signal: string) => {
    app.log.info(`${signal} received, shutting down`);
    stopJobs();
    hub.closeAll();
    await app.close();
    await db.end();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port: config.port, host: "0.0.0.0" });
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
