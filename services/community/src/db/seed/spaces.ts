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
  "People here share what they have lived through. Nothing in this room is legal, medical or mental health advice.";

export const SPACES: SpaceSeed[] = [
  {
    slug: "start-here",
    title: "Start here",
    description: "Find your footing. Rules, announcements and a place for the first 48 hours.",
    rooms: [
      {
        slug: "welcome-and-rules",
        title: "Welcome and rules",
        purpose: "How this community works and how we look after each other.",
        kind: "announcements",
        notes: [
          {
            title: "Our four rules",
            body: [
              "1. Be kind. Do not blame anyone for what happened or for how they responded.",
              "2. Protect privacy, yours and others'. Do not share real names, phone numbers, addresses or links to leaked content.",
              "3. Text only. Never ask for, send or describe how to find intimate images or videos.",
              "4. We are peers, not professionals. Nothing here is legal, medical or mental health advice. If you are in danger, contact local emergency services or someone you trust.",
            ].join("\n"),
          },
        ],
      },
      {
        slug: "announcements",
        title: "Announcements",
        purpose: "News from the Traceveil team.",
        kind: "announcements",
      },
      {
        slug: "just-happened",
        title: "Just happened",
        purpose: "For the first 48 hours. Say what you need: someone to listen, practical steps, or just to read.",
        slowModeSeconds: 5,
        notes: [{ title: "Before you post", body: "You do not have to explain everything. Share only what you want to. " + NOT_ADVICE }],
      },
    ],
  },
  {
    slug: "getting-content-removed",
    title: "Getting content removed",
    description: "What people have tried, what happened, and what to expect.",
    rooms: [
      {
        slug: "reporting-to-platforms",
        title: "Reporting to platforms",
        purpose: "Sharing experiences of reporting content to websites and apps.",
      },
      {
        slug: "police-and-cybercrime",
        title: "Police and cybercrime complaints",
        purpose: "Experiences of making a complaint, and questions about the process.",
        notes: [{ title: "About advice here", body: NOT_ADVICE + " For your own case, speak to a lawyer, a legal aid clinic or the police." }],
      },
      {
        slug: "legal-questions",
        title: "Legal questions",
        purpose: "Talk through questions with others. A verified helper may join the conversation.",
        notes: [{ title: "About advice here", body: NOT_ADVICE + " For your own case, speak to a lawyer or a legal aid clinic." }],
      },
      {
        slug: "mirror-sites-and-reuploads",
        title: "Mirror sites and re-uploads",
        purpose: "When content reappears somewhere else, and how others have coped with it.",
      },
    ],
  },
  {
    slug: "staying-safe",
    title: "Staying safe",
    description: "Threats, harassment and protecting your accounts.",
    rooms: [
      { slug: "blackmail-and-threats", title: "Blackmail and threats", purpose: "For people being threatened or pressured. You are not alone, and it is not your fault." },
      { slug: "phone-and-account-security", title: "Phone and account security", purpose: "Practical ways people have secured their phones and accounts." },
      { slug: "harassment-and-doxxing", title: "Harassment and doxxing", purpose: "When someone is harassing you or sharing your personal details." },
    ],
  },
  {
    slug: "healing",
    title: "Healing",
    description: "Space for feelings. There is no right way to feel and no deadline.",
    rooms: [
      { slug: "feeling-overwhelmed", title: "Feeling overwhelmed", purpose: "For hard days. Say how you are, or just read." },
      { slug: "shame-and-self-blame", title: "Shame and self-blame", purpose: "For the voice that says it was your fault. It was not." },
      {
        slug: "quiet-room",
        title: "Quiet room",
        purpose: "Read stories from the team and others. React with care. No replies needed.",
        kind: "quiet",
      },
      { slug: "small-wins", title: "Small wins", purpose: "Something removed, a good day, a step forward. Share it here." },
    ],
  },
  {
    slug: "people-around-you",
    title: "People around you",
    description: "Family, work, college and the people who want to help.",
    rooms: [
      { slug: "telling-family", title: "Telling family", purpose: "Deciding whether and how to tell the people close to you." },
      { slug: "work-and-college", title: "Work and college", purpose: "Dealing with an employer, a school or a college." },
      { slug: "for-friends-and-partners", title: "For friends and partners", purpose: "For people supporting someone this has happened to." },
    ],
  },
  {
    slug: "specific-situations",
    title: "Specific situations",
    description: "For situations that have their own challenges.",
    rooms: [
      { slug: "deepfakes", title: "Deepfakes", purpose: "When an image or video of you was faked or altered." },
      { slug: "hidden-cameras-and-mms", title: "Hidden cameras and MMS", purpose: "Recorded or shared without your knowledge." },
      { slug: "an-ex-or-someone-i-knew", title: "An ex or someone I knew", purpose: "When it was someone you trusted." },
    ],
  },
];

/**
 * Create the starting spaces and rooms. Safe to run again: anything that already exists is
 * left exactly as an admin may have changed it. Returns how many were newly created.
 */
export async function seedSpaces(db: Db): Promise<{ spaces: number; rooms: number }> {
  let spaces = 0;
  let rooms = 0;
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
