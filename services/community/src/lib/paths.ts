import { fileURLToPath } from "node:url";
import path from "node:path";

/** Service root. Works from src/lib (dev) and dist/lib (built), which sit at the same depth. */
export const SERVICE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const dataPath = (...parts: string[]): string => path.join(SERVICE_ROOT, "data", ...parts);
export const migrationsPath = (): string => path.join(SERVICE_ROOT, "migrations");
