export const ROLES = ["member", "verified_helper", "moderator", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES: readonly Role[] = ["moderator", "admin"];

export const ROOM_KINDS = ["chat", "announcements", "quiet"] as const;
export type RoomKind = (typeof ROOM_KINDS)[number];

/** Curated, supportive reactions. There is deliberately no negative or mocking reaction. */
export const REACTION_KINDS = ["care", "hug", "thanks", "me_too", "strength", "seen"] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

export const NEED_TAGS = ["listen", "advice", "reading"] as const;
export type NeedTag = (typeof NEED_TAGS)[number];

export const REPORT_REASONS = [
  "harassment",
  "threat",
  "fake_helper",
  "leaked_content",
  "personal_details",
  "self_harm_risk",
  "minor_involved",
  "spam",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Reasons that put a report at the top of the moderator queue. */
export const URGENT_REASONS: readonly ReportReason[] = [
  "threat",
  "minor_involved",
  "self_harm_risk",
  "personal_details",
];

export const MESSAGE_MAX_CHARS = 2000;
export const CONTENT_WARNING_MAX_CHARS = 120;
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 24;

/** Accounts newer than this cannot post links. */
export const LINK_MIN_ACCOUNT_AGE_HOURS = 7 * 24;
/** Accounts newer than this get a short cooldown between messages. */
export const NEW_ACCOUNT_HOURS = 24;
export const NEW_ACCOUNT_COOLDOWN_SECONDS = 10;

/** Longest restriction a moderator may set (admins may go further). */
export const MOD_MAX_RESTRICTION_HOURS = 7 * 24;

export const MENTION_MAX_PER_MESSAGE = 5;
export const MENTION_ACTIVITY_DAYS = 14;

export const REPORT_CONTEXT_BEFORE = 10;
export const REPORT_CONTEXT_AFTER = 3;
export const SNAPSHOT_RETENTION_DAYS = 90;

export const LOGIN_MAX_FAILURES = 8;
export const LOGIN_LOCK_MINUTES = 15;
