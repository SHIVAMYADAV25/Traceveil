import { randomBytes } from "node:crypto";
import { LOGIN_LOCK_MINUTES, LOGIN_MAX_FAILURES, type Role } from "../../config/constants.js";
import { withTx } from "../../db/pool.js";
import {
  cleanDisplayName,
  generateDisplayName,
  generateDisplayNameWithNumber,
  generateHandle,
  generateRecoveryPhrase,
  normalisePhrase,
  validateDisplayName,
} from "../../lib/alias.js";
import { hashSecret, newSessionToken, sha256Hex, verifySecret } from "../../lib/crypto.js";
import { badRequest, conflict, tooMany, unauthorized } from "../../lib/errors.js";
import type { Actor, AppContext } from "../../types.js";
import { activeAccountRestrictions } from "../moderation/restrictions.js";
import { unreadCount } from "../notifications/repo.js";
import * as repo from "./repo.js";

const newAvatarSeed = (): string => randomBytes(8).toString("hex");

// A real hash of a throwaway value, verified against when a handle does not exist,
// so "no such account" and "wrong secret" take about the same time.
let dummyHash: string | null = null;
async function getDummyHash(): Promise<string> {
  dummyHash ??= await hashSecret("not-a-real-secret");
  return dummyHash;
}

export interface SessionResult {
  token: string;
}

async function startSession(ctx: AppContext, accountId: string): Promise<SessionResult> {
  const token = newSessionToken();
  await repo.insertSession(ctx.db, { accountId, tokenHash: sha256Hex(token), days: ctx.config.sessionDays });
  return { token };
}

export async function register(
  ctx: AppContext,
  input: { password?: string },
): Promise<{ handle: string; recoveryPhrase: string; displayName: string; session: SessionResult }> {
  const phrase = generateRecoveryPhrase();
  const recoveryHash = await hashSecret(normalisePhrase(phrase));
  const passwordHash = input.password ? await hashSecret(input.password) : null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const handle = generateHandle();
    const displayName = attempt < 2 ? generateDisplayName() : generateDisplayNameWithNumber();
    try {
      const accountId = await withTx(ctx.db, async (tx) => {
        const id = await repo.insertAccount(tx, { handle, recoveryHash, passwordHash });
        await repo.insertPersona(tx, { accountId: id, displayName, avatarSeed: newAvatarSeed() });
        return id;
      });
      const session = await startSession(ctx, accountId);
      return { handle, recoveryPhrase: phrase, displayName, session };
    } catch (err) {
      // Handle or display name already taken: try again with a new random pick.
      if (repo.isUniqueViolation(err)) continue;
      throw err;
    }
  }
  throw conflict("try_again", "We could not create your account just now. Please try again.");
}

export async function login(
  ctx: AppContext,
  input: { handle: string; secret: string },
): Promise<SessionResult> {
  const handle = input.handle.trim().toLowerCase();
  const account = await repo.findAccountByHandle(ctx.db, handle);

  if (!account) {
    await verifySecret(await getDummyHash(), input.secret);
    throw unauthorized("That handle and recovery phrase or password do not match.");
  }
  if (account.locked_until && account.locked_until.getTime() > Date.now()) {
    throw tooMany(
      "account_locked",
      "Too many unsuccessful tries. Please wait a few minutes before trying again.",
    );
  }

  const phraseOk = await verifySecret(account.recovery_hash, normalisePhrase(input.secret));
  const passwordOk =
    !phraseOk && account.password_hash ? await verifySecret(account.password_hash, input.secret) : false;

  if (!phraseOk && !passwordOk) {
    await repo.recordFailedLogin(ctx.db, account.id, LOGIN_MAX_FAILURES, LOGIN_LOCK_MINUTES);
    throw unauthorized("That handle and recovery phrase or password do not match.");
  }
  await repo.resetFailedLogins(ctx.db, account.id);
  return startSession(ctx, account.id);
}

export async function logout(ctx: AppContext, tokenHash: string | null): Promise<void> {
  if (tokenHash) await repo.deleteSessionByHash(ctx.db, tokenHash);
}

export async function completeOnboarding(
  ctx: AppContext,
  actor: Actor,
  input: { displayName?: string },
): Promise<{ displayName: string }> {
  if (input.displayName !== undefined && input.displayName.trim() !== "") {
    await renamePersona(ctx, actor, input.displayName);
  }
  await repo.setRulesAccepted(ctx.db, actor.accountId);
  const persona = await repo.getPersonaByAccount(ctx.db, actor.accountId);
  return { displayName: persona.display_name };
}

export async function renamePersona(ctx: AppContext, actor: Actor, rawName: string): Promise<void> {
  const problem = validateDisplayName(rawName);
  if (problem) throw badRequest("invalid_display_name", problem);
  try {
    await repo.updatePersona(ctx.db, actor.accountId, { displayName: cleanDisplayName(rawName) });
  } catch (err) {
    if (repo.isUniqueViolation(err)) {
      throw conflict("display_name_taken", "Someone is already using that name. Please choose another.");
    }
    throw err;
  }
}

export async function updatePersona(
  ctx: AppContext,
  actor: Actor,
  input: { displayName?: string; newAvatar?: boolean },
): Promise<{ displayName: string; avatarSeed: string }> {
  if (input.displayName !== undefined) await renamePersona(ctx, actor, input.displayName);
  if (input.newAvatar) await repo.updatePersona(ctx.db, actor.accountId, { avatarSeed: newAvatarSeed() });
  const p = await repo.getPersonaByAccount(ctx.db, actor.accountId);
  return { displayName: p.display_name, avatarSeed: p.avatar_seed };
}

export async function setPassword(ctx: AppContext, actor: Actor, password: string): Promise<void> {
  await repo.setPasswordHash(ctx.db, actor.accountId, await hashSecret(password));
}

export async function deleteAccount(ctx: AppContext, actor: Actor): Promise<void> {
  await withTx(ctx.db, (tx) => repo.anonymiseAndDeleteAccount(tx, actor.accountId));
  ctx.realtime.disconnectAccount(actor.accountId);
}

export async function describeMe(ctx: AppContext, actor: Actor) {
  const persona = await repo.getPersonaByAccount(ctx.db, actor.accountId);
  const restrictions = await activeAccountRestrictions(ctx.db, actor.accountId);
  return {
    account: { handle: actor.handle, role: actor.role as Role, createdAt: actor.createdAt.toISOString() },
    persona: { id: persona.id, displayName: persona.display_name, avatarSeed: persona.avatar_seed },
    onboardingComplete: actor.rulesAcceptedAt !== null,
    restrictions: restrictions.map((r) => ({
      id: r.id,
      kind: r.kind,
      roomId: r.roomId,
      reason: r.reason,
      endsAt: r.endsAt ? r.endsAt.toISOString() : null,
    })),
    unreadNotifications: await unreadCount(ctx.db, actor.accountId),
    communityOpen: ctx.config.communityOpen,
  };
}
