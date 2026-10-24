import type pg from "pg";
import type { Role } from "../../config/constants.js";
import type { Queryable } from "../../db/pool.js";

export interface AccountRow {
  id: string;
  handle: string;
  recovery_hash: string;
  password_hash: string | null;
  role: Role;
  failed_logins: number;
  locked_until: Date | null;
}

export async function findAccountByHandle(db: Queryable, handle: string): Promise<AccountRow | null> {
  const { rows } = await db.query<AccountRow>(
    `SELECT id, handle, recovery_hash, password_hash, role, failed_logins, locked_until
       FROM accounts WHERE handle = $1`,
    [handle],
  );
  return rows[0] ?? null;
}

export async function insertAccount(
  db: Queryable,
  v: { handle: string; recoveryHash: string; passwordHash: string | null },
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO accounts (handle, recovery_hash, password_hash, age_confirmed_at)
     VALUES ($1, $2, $3, now()) RETURNING id`,
    [v.handle, v.recoveryHash, v.passwordHash],
  );
  return (rows[0] as { id: string }).id;
}

export async function insertPersona(
  db: Queryable,
  v: { accountId: string; displayName: string; avatarSeed: string },
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO personas (account_id, display_name, avatar_seed) VALUES ($1, $2, $3) RETURNING id`,
    [v.accountId, v.displayName, v.avatarSeed],
  );
  return (rows[0] as { id: string }).id;
}

export async function insertSession(
  db: Queryable,
  v: { accountId: string; tokenHash: string; days: number },
): Promise<void> {
  await db.query(
    `INSERT INTO sessions (account_id, token_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3))`,
    [v.accountId, v.tokenHash, v.days],
  );
}

export async function deleteSessionByHash(db: Queryable, tokenHash: string): Promise<void> {
  await db.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
}

export async function recordFailedLogin(
  db: Queryable,
  accountId: string,
  max: number,
  lockMinutes: number,
): Promise<void> {
  await db.query(
    `UPDATE accounts
        SET failed_logins = CASE WHEN failed_logins + 1 >= $2 THEN 0 ELSE failed_logins + 1 END,
            locked_until  = CASE WHEN failed_logins + 1 >= $2
                                 THEN now() + make_interval(mins => $3) ELSE locked_until END
      WHERE id = $1`,
    [accountId, max, lockMinutes],
  );
}

export async function resetFailedLogins(db: Queryable, accountId: string): Promise<void> {
  await db.query("UPDATE accounts SET failed_logins = 0, locked_until = NULL, last_seen_at = now() WHERE id = $1", [
    accountId,
  ]);
}

export async function setRulesAccepted(db: Queryable, accountId: string): Promise<void> {
  await db.query("UPDATE accounts SET rules_accepted_at = COALESCE(rules_accepted_at, now()) WHERE id = $1", [
    accountId,
  ]);
}

export async function setPasswordHash(db: Queryable, accountId: string, hash: string): Promise<void> {
  await db.query("UPDATE accounts SET password_hash = $2 WHERE id = $1", [accountId, hash]);
}

export interface PersonaRow {
  id: string;
  display_name: string;
  avatar_seed: string;
}

export async function getPersonaByAccount(db: Queryable, accountId: string): Promise<PersonaRow> {
  const { rows } = await db.query<PersonaRow>(
    "SELECT id, display_name, avatar_seed FROM personas WHERE account_id = $1",
    [accountId],
  );
  return rows[0] as PersonaRow;
}

export async function updatePersona(
  db: Queryable,
  accountId: string,
  v: { displayName?: string; avatarSeed?: string },
): Promise<PersonaRow> {
  const { rows } = await db.query<PersonaRow>(
    `UPDATE personas
        SET display_name = COALESCE($2, display_name),
            avatar_seed  = COALESCE($3, avatar_seed)
      WHERE account_id = $1
      RETURNING id, display_name, avatar_seed`,
    [accountId, v.displayName ?? null, v.avatarSeed ?? null],
  );
  return rows[0] as PersonaRow;
}

export function isUniqueViolation(err: unknown, constraintHint?: string): boolean {
  const e = err as pg.DatabaseError;
  if (e?.code !== "23505") return false;
  return constraintHint ? (e.constraint ?? "").includes(constraintHint) : true;
}

/**
 * Delete the account and everything tied to it. The persona stays so old messages still make
 * sense, but it is unlinked first (the foreign key sets account_id to NULL) and then renamed,
 * so the unique-name index (which only covers linked personas) is never violated.
 */
export async function anonymiseAndDeleteAccount(client: Queryable, accountId: string): Promise<void> {
  const { rows } = await client.query<{ id: string }>(
    "SELECT id FROM personas WHERE account_id = $1",
    [accountId],
  );
  await client.query("DELETE FROM accounts WHERE id = $1", [accountId]);
  if (rows[0]) {
    await client.query(
      `UPDATE personas SET display_name = 'Deleted member', avatar_seed = 'deleted' WHERE id = $1`,
      [rows[0].id],
    );
  }
}
