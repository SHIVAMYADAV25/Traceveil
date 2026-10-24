import { readFileSync } from "node:fs";
import { dataPath } from "../lib/paths.js";

export function loadCrisisPhrases(file = dataPath("crisis-terms.json")): string[] {
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { phrases: string[] };
  return parsed.phrases.map((p) => p.toLowerCase());
}

/**
 * True when the text contains a phrase from the reviewed list.
 * The result is only used to show private support resources to the author.
 * It is never stored and never reported.
 */
export function showsCrisisLanguage(text: string, phrases: readonly string[]): boolean {
  const lower = text.toLowerCase().replace(/[’‘]/g, "'");
  return phrases.some((p) => lower.includes(p));
}
