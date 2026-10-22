import type { Community } from "@/lib/support/types";

/**
 * Only communities we could confirm are listed.
 *
 * Reddit and Discord are deliberately absent for now: we could not find a
 * moderated space specific to this problem that we could verify, and Discord
 * invites cannot be checked without joining. See docs/support-pages.md,
 * "Adding a Reddit or Discord community", for the vetting checklist.
 * Add an entry here only after that checklist is done and dated.
 */
export const COMMUNITIES: Community[] = [
  {
    id: "7cups",
    name: "7 Cups",
    platform: "app",
    summary:
      "Anonymous one-to-one chat with trained volunteer listeners, plus group chat rooms and forums. Free.",
    whoIsThere: "Volunteer listeners who completed a listening course, and other people seeking support.",
    moderation: "Run by the company. Listeners can be reported inside the app.",
    watchOut:
      "Listeners are volunteers, not therapists, and cannot help in a crisis. Paid therapy on the same app is separate and in US dollars. Do not share your name, number or case details.",
    url: "https://www.7cups.com/",
    checkedOn: "2026-10-21",
    source: "https://www.healthline.com/health/mental-health/7-cups",
  },
];
