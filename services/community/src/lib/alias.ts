import { ADJECTIVES, NOUNS, PHRASE_WORDS } from "./words.js";
import { randomInteger } from "./crypto.js";
import { DISPLAY_NAME_MAX, DISPLAY_NAME_MIN } from "../config/constants.js";

const pick = <T>(list: readonly T[]): T => list[randomInteger(list.length)] as T;

/** A friendly generated name such as "Quiet Heron". */
export function generateDisplayName(): string {
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
}

/** Same name with a number, used when the plain name is already taken. */
export function generateDisplayNameWithNumber(): string {
  return `${generateDisplayName()} ${10 + randomInteger(90)}`;
}

/** Login handle such as "quiet-heron-4821". Not shown to other members. */
export function generateHandle(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${1000 + randomInteger(9000)}`.toLowerCase();
}

/** Eight random words, shown once at sign-up. */
export function generateRecoveryPhrase(): string {
  return Array.from({ length: 8 }, () => pick(PHRASE_WORDS)).join(" ");
}

/** Lower-case and collapse whitespace so phrases typed with extra spaces still match. */
export function normalisePhrase(phrase: string): string {
  return phrase.trim().toLowerCase().split(/\s+/).join(" ");
}

export const RESERVED_NAMES = [
  "admin", "administrator", "moderator", "mod", "staff", "traceveil", "traceveil", "support",
  "helper", "official", "system", "deleted member", "community",
];

const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} _'-]*[\p{L}\p{N}]$/u;

/** Returns an error message, or null when the name is acceptable. */
export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length < DISPLAY_NAME_MIN || trimmed.length > DISPLAY_NAME_MAX) {
    return `Choose a name between ${DISPLAY_NAME_MIN} and ${DISPLAY_NAME_MAX} characters.`;
  }
  if (!NAME_PATTERN.test(trimmed)) {
    return "Use letters, numbers, spaces, hyphens, apostrophes or underscores.";
  }
  const lower = trimmed.toLowerCase();
  if (RESERVED_NAMES.some((r) => lower === r || lower.startsWith(`${r} `))) {
    return "That name is reserved. Please choose another.";
  }
  return null;
}

export const cleanDisplayName = (name: string): string => name.trim().replace(/\s+/g, " ");
