import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config/env.js";
import { migrationsPath } from "../lib/paths.js";
import { createPool, withTx, type Db } from "./pool.js";

/** Apply every pending .sql file in /migrations, in name order. Returns the names applied. */
export async function runMigrations(db: Db): Promise<string[]> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       text PRIMARY KEY,
      checksum   text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);

  const dir = migrationsPath();
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const applied: string[] = [];

  for (const file of files) {
    const sql = await readFile(path.join(dir, file), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = await db.query<{ checksum: string }>(
      "SELECT checksum FROM schema_migrations WHERE name = $1",
      [file],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].checksum !== checksum) {
        throw new Error(
          `Migration ${file} was changed after it was applied. Add a new migration instead of editing it.`,
        );
      }
      continue;
    }
    await withTx(db, async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [
        file,
        checksum,
      ]);
    });
    applied.push(file);
  }
  return applied;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const config = loadConfig();
  const db = createPool(config.databaseUrl);
  runMigrations(db)
    .then((applied) => {
      console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Database is up to date.");
    })
    .catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => db.end());
}
