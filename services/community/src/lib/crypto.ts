import { createHash, randomBytes, randomInt } from "node:crypto";
import argon2 from "argon2";

export const sha256Hex = (input: string): string =>
  createHash("sha256").update(input).digest("hex");

/** 32 random bytes, URL-safe. Only its hash is stored. */
export const newSessionToken = (): string => randomBytes(32).toString("base64url");

export async function hashSecret(secret: string): Promise<string> {
  return argon2.hash(secret, { type: argon2.argon2id });
}

export async function verifySecret(hash: string, secret: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, secret);
  } catch {
    return false;
  }
}

export const randomInteger = (maxExclusive: number): number => randomInt(maxExclusive);
