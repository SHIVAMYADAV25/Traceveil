import pg from "pg";

export type Db = pg.Pool;
export type Queryable = Pick<pg.Pool, "query">;

export function createPool(connectionString: string): Db {
  const pool = new pg.Pool({ connectionString, max: 10 });
  pool.on("error", (err) => {
    // Idle client errors must not crash the process.
    console.error("Unexpected database pool error:", err.message);
  });
  return pool;
}

/** Run work in one transaction. Rolls back if the callback throws. */
export async function withTx<T>(db: Db, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
