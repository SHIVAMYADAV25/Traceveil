/**
 * Types for the Support area (/support).
 * Every listed resource carries `checkedOn` + `source`, the same rule the
 * backend uses for takedown contacts: if we can't show where we checked it
 * and when, it doesn't ship.
 */

export type Tone = "care" | "brand" | "safe" | "warm" | "calm" | "quiet";

export type Role =
  | "counselling"
  | "crisis"
  | "takedown"
  | "reporting"
  | "legal"
  | "prevention"
  | "emergency"
  | "psychiatry";

export type Channel = "phone" | "whatsapp" | "chat" | "email" | "web";

export interface Service {
  id: string;
  name: string;
  /** Who runs it, e.g. "Government of India". */
  operator: string;
  /** Short plain label shown as a chip, e.g. "Government helpline". */
  kindLabel: string;
  roles: Role[];
  /** One or two sentences: what it is and what it does for you. */
  summary: string;
  cost: "free" | "ask";
  costNote?: string;
  /** `any` = answers at every hour. `label` is the exact hours text. */
  hours: { any: boolean; label: string };
  languages: string[];
  channels: Channel[];
  phone?: { display: string; tel: string };
  website?: { label: string; url: string };
  /** Short tags: what this is good for. */
  goodFor: string[];
  /** One honest "good to know" line (limits, recording, age limit…). */
  note?: string;
  /** Where it operates, e.g. "All India", "Mumbai". */
  area: string;
  checkedOn: string; // ISO date
  source: string; // https URL of the page the details were checked on
  /** "workbook" = taken from the team workbook, not yet re-opened by us. Flip to "opened" after you click-test it. */
  verifiedBy?: Provenance;
}

export type CommunityPlatform = "app" | "reddit" | "discord" | "forum" | "whatsapp";

export interface Community {
  id: string;
  name: string;
  platform: CommunityPlatform;
  summary: string;
  /** Who is in the room: volunteers, other survivors, professionals. */
  whoIsThere: string;
  moderation: string;
  watchOut: string;
  url: string;
  checkedOn: string;
  source: string;
}


export interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
  tone: Tone;
  /** Why this one, in specific terms. */
  why: string;
  effort: "Short chapters" | "Quick read" | "Slower read";
  /** Content note, only when the book contains difficult material. */
  contentNote?: string;
  /** Who it is for. Used to group the list. */
  group: "any" | "understand" | "work" | "teen";
  /** Publisher page, when we have one. Otherwise only library search links show. */
  publisher?: { url: string; paid: boolean; verifiedBy: Provenance };
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  year: number;
  tone: Tone;
  /** The moment this is for. Starts with "When…". */
  forWhen: string;
  voice: "Instrumental" | "With vocals";
  language: "No lyrics" | "English" | "Hindi / Urdu";
  /** Why it's here: one factual line. */
  why: string;
}

/** Who last opened the page the details came from. Not shown to the reader. */
export type Provenance = "opened" | "workbook";

/** A way to get content taken down or stop it spreading. */
export interface RemovalRoute {
  id: string;
  name: string;
  /** Who it is for, in one line. Include age limits. */
  forWhom: string;
  summary: string;
  /** What she does, one sentence. */
  howTo: string;
  /** What it cannot do. */
  limit: string;
  phone?: { display: string; tel: string };
  link: { label: string; url: string };
  checkedOn: string;
  source: string;
}

export type PieceFormat = "Written" | "Video" | "Talk" | "Interview";

export type PieceGroup = "own" | "wider" | "understand" | "voices";

export interface Piece {
  id: string;
  kind: "story" | "blog";
  title: string;
  by: string;
  format: PieceFormat;
  length?: string;
  why: string;
  contentNote?: string;
  place?: string;
  linkLabel: string;
  url: string;
  checkedOn: string;
  verifiedBy: Provenance;

  // Add these properties
  group: PieceGroup;
  hidden?: boolean;
}

export interface CalmAudio {
  id: string;
  title: string;
  by: string;
  /** What she will hear. */
  sound: "Instrumental" | "Guided voice" | "Nature sounds";
  forWhen: string;
  length?: string;
  tone: Tone;
  youtube?: string;
  spotify?: string;
  checkedOn: string;
  verifiedBy: Provenance;
}

/** A space we run ourselves: our Discord server and our chat. */
export interface OwnSpace {
  id: "discord" | "chat";
  name: string;
  summary: string;
  /** null = not open yet. Set the URL in content/support/own-spaces.ts to open it. */
  url: string | null;
  whoRunsIt: string;
  moderation: string;
  /** What we ask of everyone. */
  houseRules: string[];
  /** One real caution for this platform. */
  watchOut: string;
  /** What this space is not. */
  notFor: string;
  minAge: number;
  /** Extra facts, each with a source and date. */
  platformFacts?: { text: string; source: string; checkedOn: string }[];
}
