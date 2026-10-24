import { LINK_MIN_ACCOUNT_AGE_HOURS, STAFF_ROLES } from "../../config/constants.js";
import type { Actor, AppContext } from "../../types.js";
import { activeAccountRestrictions } from "../moderation/restrictions.js";
import type { RoomRow } from "./repo.js";

export type PostingState =
  | { allowed: true }
  | { allowed: false; code: string; message: string; endsAt?: string | null };

export const isStaff = (actor: Pick<Actor, "role">): boolean => STAFF_ROLES.includes(actor.role);

export const accountAgeHours = (actor: Pick<Actor, "createdAt">): number =>
  (Date.now() - actor.createdAt.getTime()) / 3_600_000;

export const mayPostLinks = (actor: Actor): boolean =>
  isStaff(actor) || actor.role === "verified_helper" || accountAgeHours(actor) >= LINK_MIN_ACCOUNT_AGE_HOURS;

/**
 * Whether this person can write in this room right now, and if not, why.
 * The same answer drives the message composer and the server-side check.
 */
export async function postingState(ctx: AppContext, actor: Actor, room: RoomRow): Promise<PostingState> {
  if (!actor.rulesAcceptedAt) {
    return { allowed: false, code: "onboarding_required", message: "Please finish setting up your name and accept the community rules first." };
  }
  const staff = isStaff(actor);

  if (room.kind !== "chat" && !staff) {
    return {
      allowed: false,
      code: "staff_only_room",
      message:
        room.kind === "quiet"
          ? "This is a quiet room. You can read and react, and the team shares stories here."
          : "Only the Community team posts in this room.",
    };
  }
  if (room.kind === "chat" && !ctx.config.communityOpen && !staff) {
    return { allowed: false, code: "community_closed", message: "The Community is not open for conversation yet. You can read announcements and the quiet room." };
  }
  if (room.is_locked && !staff) {
    return { allowed: false, code: "room_locked", message: "This room is paused by the Community team." };
  }
  if (!staff && room.min_account_age_hours > 0 && accountAgeHours(actor) < room.min_account_age_hours) {
    return { allowed: false, code: "account_too_new", message: "This room opens to accounts that are a little older. Please check back soon." };
  }
  const restrictions = await activeAccountRestrictions(ctx.db, actor.accountId);
  const mute = restrictions.find((r) => r.kind === "room_mute" && r.roomId === room.id);
  if (mute) {
    return {
      allowed: false,
      code: "muted_in_room",
      message: "You cannot post in this room for now.",
      endsAt: mute.endsAt ? mute.endsAt.toISOString() : null,
    };
  }
  return { allowed: true };
}
