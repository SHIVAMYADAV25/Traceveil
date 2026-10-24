import { loadConfig } from "../../config/env.js";
import { createPool } from "../pool.js";
import { runMigrations } from "../migrate.js";
import { seedSpaces } from "./spaces.js";

const config = loadConfig();
const db = createPool(config.databaseUrl);
runMigrations(db)
  .then(() => seedSpaces(db))
  .then((r) => console.log(`Seeded ${r.spaces} spaces and ${r.rooms} rooms (existing ones were left unchanged).`))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.end());
