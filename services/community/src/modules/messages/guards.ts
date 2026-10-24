import { LINK_MIN_ACCOUNT_AGE_HOURS } from "../../config/constants.js";
import { badRequest, conflict, forbidden } from "../../lib/errors.js";
import { findLinks } from "../../safety/link-guard.js";
import { showsCrisisLanguage } from "../../safety/crisis-guard.js";
import { findPersonalDetails } from "../../safety/pii-guard.js";
import type { Actor, AppContext } from "../../types.js";
import { mayPostLinks } from "../spaces/posting.js";

/**
 * Checks run before a message is saved. Throws a clear, kind error when something must change.
 * Returns whether the text contains crisis language, so the author can privately be shown support.
 */
export function runContentGuards(
  ctx: AppContext,
  actor: Actor,
  text: string,
  confirmShare: boolean,
): { crisis: boolean } {
  const links = findLinks(text, ctx.blockedDomains);

  if (links.some((l) => l.blocked)) {
    throw badRequest(
      "blocked_link",
      "Links to sites that host leaked content cannot be shared here. This protects everyone in the room.",
    );
  }
  if (links.length > 0 && !mayPostLinks(actor)) {
    throw forbidden(
      "links_not_allowed_yet",
      `Links can be shared once an account is ${LINK_MIN_ACCOUNT_AGE_HOURS / 24} days old. This helps keep scams out of the Community.`,
    );
  }

  const personal = findPersonalDetails(text);
  if (personal.length > 0 && !confirmShare) {
    throw conflict(
      "confirm_personal_details",
      "This looks like it may contain personal details. Everyone in this room can read it. Are you sure you want to share it?",
      { kinds: personal },
    );
  }

  return { crisis: showsCrisisLanguage(text, ctx.crisisPhrases) };
}
