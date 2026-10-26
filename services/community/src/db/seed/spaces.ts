import type { Db } from "../pool.js";
import type { RoomKind } from "../../config/constants.js";

interface RoomSeed {
  slug: string;
  title: string;
  purpose: string;
  kind?: RoomKind;
  slowModeSeconds?: number;
  notes?: Array<{ title: string; body: string }>;
}
interface SpaceSeed {
  slug: string;
  title: string;
  description: string;
  rooms: RoomSeed[];
}

const NOT_ADVICE =
  "People here share what they have lived through. Nothing in this channel is legal, medical or mental health advice.";

const RULES = [
  "1. Be kind. Do not blame anyone for what happened or for how they responded.",
  "2. Protect privacy, yours and others'. Do not share real names, phone numbers, addresses or links to leaked content.",
  "3. Text only. Never ask for, send or describe how to find intimate images or videos.",
  "4. We are peers, not professionals. Nothing here is legal, medical or mental health advice. If you are in danger, contact local emergency services or someone you trust.",
].join("\n");

/**
 * The channel list. Titles are the channel names as members see them (lower case, hyphenated).
 * Each group has a "theme" in the web app (apps/web/lib/community/channelTheme.ts) keyed by the group slug.
 * Three channels were added beyond the original brief and sit inside the same groups (an admin can archive them):
 * safety-and-privacy, healing-and-small-wins and police-and-cybercrime.
 */
export const SPACES: SpaceSeed[] = [
  {
    slug: "start-here",
    title: "Start here",
    description: "Rules, news and a place to introduce yourself.",
    rooms: [
      { slug: "welcome", title: "welcome", purpose: "What this community is and how to find your way around.", kind: "announcements", notes: [{ title: "Our four rules", body: RULES }] },
      { slug: "rules-and-safety", title: "rules-and-safety", purpose: "The four rules we ask of everyone, and how we keep this place safe.", kind: "announcements", notes: [{ title: "Our four rules", body: RULES }] },
      { slug: "announcements", title: "announcements", purpose: "News from the Traceveil team.", kind: "announcements" },
      { slug: "roles-and-intro", title: "roles-and-intro", purpose: "Who is who here, and a place to say hello. Share only what you want to.", slowModeSeconds: 5 },
    ],
  },
  {
    slug: "victim-support",
    title: "Victim support",
    description: "Ask for help and find people who understand.",
    rooms: [
      { slug: "how-to-get-help", title: "how-to-get-help", purpose: "The ways to get help here and outside this community.", kind: "announcements" },
      { slug: "ask-for-help", title: "ask-for-help", purpose: "Say what you need: someone to listen, practical ideas, or just to read.", slowModeSeconds: 5, notes: [{ title: "Before you post", body: "You do not have to explain everything. Share only what you want to. " + NOT_ADVICE }] },
      {
        slug: "private-support-tickets",
        title: "private-support-tickets",
        purpose: "How to reach the team privately. Private tickets are not open yet.",
        kind: "announcements",
        notes: [{ title: "Not open yet", body: "Private tickets are not available yet. Until they are, use ask-for-help, or report a message to reach the team. There are no private messages in this community." }],
      },
      { slug: "crisis-and-wellbeing", title: "crisis-and-wellbeing", purpose: "For very hard moments, and for looking after yourself.", slowModeSeconds: 5, notes: [{ title: "If you are in danger", body: "If you might harm yourself or you are in danger right now, contact your local emergency number or someone you trust. " + NOT_ADVICE }] },
      { slug: "safety-and-privacy", title: "safety-and-privacy", purpose: "Threats, harassment, and securing your phone and accounts." },
      { slug: "healing-and-small-wins", title: "healing-and-small-wins", purpose: "A good day, something removed, a step forward. Share it here." },
    ],
  },
  {
    slug: "product-support",
    title: "Traceveil product support",
    description: "Help with using Traceveil.",
    rooms: [
      { slug: "getting-started", title: "getting-started", purpose: "First steps with Traceveil." },
      { slug: "scan-questions", title: "scan-questions", purpose: "Questions about scans and what the results mean." },
      { slug: "takedown-help", title: "takedown-help", purpose: "Questions about takedown requests and how they work." },
      { slug: "evidence-and-reports", title: "evidence-and-reports", purpose: "Questions about evidence and the reports Traceveil produces." },
      { slug: "faq", title: "faq", purpose: "Answers to the questions people ask most.", kind: "announcements" },
    ],
  },
  {
    slug: "legal-resources",
    title: "Legal & resources",
    description: "Where to look for legal help and support organisations.",
    rooms: [
      { slug: "legal-resources-india", title: "legal-resources-india", purpose: "Legal information and where to get help in India.", kind: "announcements", notes: [{ title: "About this channel", body: "This is general information, not legal advice. For your own case, speak to a lawyer or a legal aid clinic." }] },
      { slug: "global-resources", title: "global-resources", purpose: "Help and resources outside India.", kind: "announcements" },
      { slug: "lawyers-and-ngos", title: "lawyers-and-ngos", purpose: "Lawyers and organisations that help. Verified helpers can join the conversation.", notes: [{ title: "About advice here", body: NOT_ADVICE + " For your own case, speak to a lawyer or a legal aid clinic." }] },
      { slug: "police-and-cybercrime", title: "police-and-cybercrime", purpose: "Experiences of making a police or cybercrime complaint.", notes: [{ title: "About advice here", body: NOT_ADVICE }] },
    ],
  },
  {
    slug: "bugs-feedback",
    title: "Bugs & feedback",
    description: "Tell us what is broken and what would help.",
    rooms: [
      { slug: "report-a-bug", title: "report-a-bug", purpose: "Something not working? Tell us what happened." },
      { slug: "feature-requests", title: "feature-requests", purpose: "Ideas for what Traceveil should do next." },
      { slug: "false-positives", title: "false-positives", purpose: "A scan said something was fake or real and it was wrong. Tell us." },
    ],
  },
];

/** The first channel list. Only these are retired, so rooms an admin adds later are never touched. */
const LEGACY_SPACES = ["getting-content-removed", "staying-safe", "healing", "people-around-you", "specific-situations"];
const LEGACY_ROOMS: Array<[string, string]> = [["start-here", "welcome-and-rules"], ["start-here", "just-happened"]];

/**
 * Retire the first channel list. Rooms are archived, not deleted, so existing messages, reports and
 * audit records keep their links. Archived rooms leave the member list and an admin can restore them.
 */
export async function archiveLegacy(db: Db): Promise<void> {
  await db.query("UPDATE spaces SET is_archived = true WHERE slug = ANY($1::text[]) AND NOT is_archived", [LEGACY_SPACES]);
  for (const [space, room] of LEGACY_ROOMS) {
    await db.query(
      "UPDATE rooms SET is_archived = true WHERE slug = $2 AND NOT is_archived AND space_id = (SELECT id FROM spaces WHERE slug = $1)",
      [space, room],
    );
  }
  // The one channel that kept its slug: bring its name in line with the new style.
  await db.query(
    `UPDATE rooms SET title = 'announcements'
      WHERE slug = 'announcements' AND title = 'Announcements' AND space_id = (SELECT id FROM spaces WHERE slug = 'start-here')`,
  );
}

/**
 * Create the starting spaces and rooms. Safe to run again: anything that already exists is
 * left exactly as an admin may have changed it. Returns how many were newly created.
 */
export async function seedSpaces(db: Db): Promise<{ spaces: number; rooms: number }> {
  let spaces = 0;
  let rooms = 0;
  await archiveLegacy(db);
  for (const [si, space] of SPACES.entries()) {
    const s = await db.query<{ id: string }>(
      `INSERT INTO spaces (slug, title, description, sort_order) VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO NOTHING RETURNING id`,
      [space.slug, space.title, space.description, (si + 1) * 10],
    );
    let spaceId = s.rows[0]?.id;
    if (spaceId) spaces += 1;
    else spaceId = (await db.query<{ id: string }>("SELECT id FROM spaces WHERE slug = $1", [space.slug])).rows[0]?.id;
    if (!spaceId) continue;

    for (const [ri, room] of space.rooms.entries()) {
      const r = await db.query<{ id: string }>(
        `INSERT INTO rooms (space_id, slug, title, purpose, kind, slow_mode_seconds, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (space_id, slug) DO NOTHING RETURNING id`,
        [spaceId, room.slug, room.title, room.purpose, room.kind ?? "chat", room.slowModeSeconds ?? 0, (ri + 1) * 10],
      );
      const roomId = r.rows[0]?.id;
      if (!roomId) continue;
      rooms += 1;
      for (const note of room.notes ?? []) {
        await db.query("INSERT INTO room_notes (room_id, title, body) VALUES ($1, $2, $3)", [roomId, note.title, note.body]);
      }
    }
  }
  return { spaces, rooms };
}
