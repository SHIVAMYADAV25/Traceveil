import type { OwnSpace } from "@/lib/support/types";

/**
 * Our own spaces. Two switches:
 *
 *   DISCORD_URL  paste the Discord invite link between the quotes.
 *   CHAT_URL     set to "/chat" once the chat app is live.
 *
 * While a value is null the card says "Opening soon" and shows no button.
 * Nothing else needs to change.
 *
 * BEFORE YOU OPEN EITHER ONE, the team must make these true. The cards say them to the reader:
 *   1. Someone reads reports and removes posts and people, every day.
 *   2. Images are blocked or removed on sight (chat: no image upload at all).
 *   3. Private messages from new contacts are off or limited.
 *   4. Members must be 18 or over. Change minAge here if your rule differs.
 */

export const DISCORD_URL: string | null = "https://discord.gg/GK9JY92n2A";
export const CHAT_URL: string | null = null;

const SHARED_RULES = [
  "Never post images, links or details of your case. Not even blurred.",
  "Nobody here can remove content for you. Ignore anyone who offers to, especially for money.",
  "Do not message people who have not said yes. Do not ask anyone for photos.",
  "Use a username that is not your name or one you use elsewhere.",
];

export const OWN_SPACES: OwnSpace[] = [
  {
    id: "discord",
    name: "Our Discord",
    summary:
      "A server run by the Traceveil team for people whose private images were shared without consent. Text channels, at your own pace.",
    url: DISCORD_URL,
    whoRunsIt: "The Traceveil team.",
    moderation: "Moderators can remove posts and people. You can report any message to them.",
    houseRules: SHARED_RULES,
    watchOut: "Anyone in a server can copy what you post. Share only what you would be fine with strangers reading.",
    notFor: "Not a crisis line, and not legal advice. If you are in crisis, call 14416.",
    minAge: 18,
    platformFacts: [
      {
        text: "Discord shows your username to people on the server. You can switch off direct messages from server members in Discord's Privacy and Safety settings. They are on by default.",
        source: "https://swgfl.org.uk/magazine/discord-security-settings-a-guide-for-parents-and-carers/",
        checkedOn: "2026-10-22",
      },
      {
        text: "Discord requires you to be 13 or over to have an account. Our server is for 18 and over.",
        source: "https://saferinternet.org.uk/blog/discord-security-settings-a-guide-for-parents-and-carers",
        checkedOn: "2026-10-22",
      },
    ],
  },
  {
    id: "chat",
    name: "Our chat",
    summary:
      "A chat on this website, made by us, where you can talk with other people who have been through this. No Discord account needed.",
    url: CHAT_URL,
    whoRunsIt: "The Traceveil team.",
    moderation: "Moderators can remove messages and people. You can report any message to them.",
    houseRules: SHARED_RULES,
    watchOut: "Other members can read what you write here. Treat it as shared, not private.",
    notFor: "Not a crisis line, and not legal advice. If you are in crisis, call 14416.",
    minAge: 18,
  },
];
