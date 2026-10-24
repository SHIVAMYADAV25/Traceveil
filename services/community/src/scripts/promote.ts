import { loadConfig } from "../config/env.js";
import { ROLES, type Role } from "../config/constants.js";
import { createPool } from "../db/pool.js";
import { runMigrations } from "../db/migrate.js";

/**
 * Give an account a role from the command line. This is how the first admin is created.
 * Usage: npm run promote -- <handle> <member|verified_helper|moderator|admin>
 */
async function main(): Promise<void> {
  const [handle, role] = process.argv.slice(2);
  if (!handle || !role || !(ROLES as readonly string[]).includes(role)) {
    console.error(`Usage: npm run promote -- <handle> <${ROLES.join("|")}>`);
    process.exitCode = 1;
    return;
  }
  const db = createPool(loadConfig().databaseUrl);
  try {
    await runMigrations(db);
    const { rows } = await db.query<{ id: string }>("UPDATE accounts SET role = $2 WHERE handle = $1 RETURNING id", [
      handle.toLowerCase(),
      role as Role,
    ]);
    if (!rows[0]) {
      console.error(`No account with the handle "${handle}".`);
      process.exitCode = 1;
      return;
    }
    await db.query("INSERT INTO audit_log (actor_account_id, action, target, reason) VALUES ($1, 'role_set_by_cli', $2, 'Set from the command line')", [
      rows[0].id,
      `${handle}: ${role}`,
    ]);
    console.log(`${handle} is now ${role}.`);
  } finally {
    await db.end();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
