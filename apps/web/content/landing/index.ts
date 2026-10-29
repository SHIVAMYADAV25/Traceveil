/**
 * Copy and data for the public landing page ("/").
 *
 * All user-facing text lives here so wording can be reviewed or translated
 * without touching component code. Components in `components/landing/`
 * only render what is exported from this file.
 */

export type Tone = "pink" | "mint" | "blue" | "orange";

export const BRAND = {
  name: "traceveil",
  tagline: "Get help. Take back control.",
} as const;

/* ── Navigation ─────────────────────────────────────────────────────── */

export const NAV_LINKS = [
  { label: "What it is", href: "#what" },
  { label: "Who it’s for", href: "#who" },
  { label: "How it works", href: "#how" },
  { label: "Support", href: "/support" },
  { label: "Community", href: "/community" },
  { label: "FAQ", href: "#faq" },
] as const;

export const NAV_CTA = { label: "Analyze an Image →", href: "/leak?demo=1" } as const;

/* ── Hero ───────────────────────────────────────────────────────────── */

export const HERO = {
  chip: "You’re not alone",
  titleLine1: "Get your private media",
  titleLine2: "removed from the internet.",
  lead:
    "Traceveil helps you find where your images/videos are, send removal requests, and reach people who will listen. One calm place, at your pace.",
  primaryCta: { label: "Get help →", href: "#how" },
  secondaryCta: { label: "See what Traceveil is", href: "#what" },
  image: {
    src: "/landing/hero.webp",
    width: 1100,
    height: 716,
    alt: "Four people of different genders and backgrounds looking ahead together",
  },
  quickLinks: [
    { title: "What is Traceveil?", href: "#what", tone: "pink" },
    { title: "Who is it for?", href: "#who", tone: "mint" },
    { title: "How do I use it?", href: "#how", tone: "blue" },
  ],
} as const;

/* ── What is Traceveil ──────────────────────────────────────────────── */

export const ABOUT = {
  title: "What is",
  highlight: "Traceveil",
  titleEnd: "?",
  body:
    "Traceveil is a free support platform for people whose private images or videos were shared, without consent. Check where your content appears, get ready-to-send removal requests, and find real people to talk to.",
  chips: ["Find your content", "Get it taken down", "Talk to someone", "Join a community"],
  image: {
    src: "/landing/laptop.webp",
    width: 800,
    height: 478,
    alt: "Person quietly working on a laptop",
  },
} as const;

/* ── Who is it for ──────────────────────────────────────────────────── */

export const AUDIENCE = {
  title: "Who is",
  highlight: "Traceveil",
  titleEnd: "for?",
  lead: "For anyone. Any gender, any age, any background. No one is judged here.",
  cards: [
    {
      title: "You’re affected",
      body: "Your images were shared or leaked without your consent.",
      tone: "pink",
    },
    {
      title: "You’re helping someone",
      body: "A friend or family member needs support and you want to do it right.",
      tone: "blue",
    },
    {
      title: "You’re not sure",
      body: "You think something is out there but don’t know. We can help you find out.",
      tone: "orange",
    },
  ],
  // Kept for when the "threatened" path is re-enabled on the page.
  // { title: "You’re being threatened", body: "Someone says they will share your images, or demands something.", tone: "mint" },
} as const;

/* ── How it works ───────────────────────────────────────────────────── */

export const HOW_IT_WORKS = {
  title: "How to use",
  highlight: "Traceveil",
  lead: "Three simple steps. Stop whenever you want.",
  steps: [
    {
      title: "Start a private case",
      body:
        "Upload a photo or video you're worried about. Your case stays private, and nothing is shared without your permission.",
    },
    {
      title: "Review what we found",
      body:
        "We scan known sites and show possible matches in plain language, with how confident we are and where each appears. Evidence is saved safely.",
    },
    {
      title: "Choose your next step",
      body:
        "Send removal requests when you're ready, talk to a helpline or counsellor, or connect with survivors in peer support.",
    },
  ],
} as const;

/* ── Privacy ────────────────────────────────────────────────────────── */

export const PRIVACY = {
  title: "Your privacy",
  highlight: "comes first",
  lead: "This is a sensitive moment. Here is what we promise.",
  promises: [
    "No account or email needed to get help",
    "Your images are not stored",
    "The community is anonymous and text-only",
    "You stay in control at every step",
  ],
  image: {
    src: "/landing/privacy-Photoroom.png",
    width: 900,
    height: 600,
    alt: "Person holding a shield with a lock",
  },
} as const;

/* ── Takedown ───────────────────────────────────────────────────────── */

export const TAKEDOWN = {
  chip: "Get it taken down",
  title: "Find it. Report it.",
  highlight: "Track it.",
  body:
    "Upload one image to see where it may appear. Traceveil prepares removal requests for each platform and a clear record you can use with the police or a lawyer.",
  primaryCta: { label: "Start a check →", href: "/leak" },
  secondaryCta: { label: "Try a demo", href: "/leak?demo=1" },
  image: {
    src: "/landing/doc.webp",
    width: 800,
    height: 477,
    alt: "Person reading a prepared removal request",
  },
} as const;

/* ── Counsellors & helplines ────────────────────────────────────────── */

export const SUPPORT = {
  chip: "Talk to someone",
  title: "Counsellors and helplines,",
  highlight: "free",
  lead: "Trained people who won’t judge. Pick one and reach out whenever you’re ready.",
  helplines: [
    { strong: "Tele-MANAS 14416", rest: ": free, 24/7 mental health support" },
    { strong: "", rest: "iCall, Vandrevala Foundation, AASRA and more, with hours" },
  ],
  cta: { label: "See all helplines →", href: "/support/counsellors" },
  image: {
    src: "/landing/calm-removebg-preview.png",
    width: 800,
    height: 477,
    alt: "Person listening to calming audio with a warm drink",
  },
} as const;

/* ── Community ──────────────────────────────────────────────────────── */

export const COMMUNITY = {
  chip: "More than a tool",
  title: "Community,",
  highlight: "stories and calm",
  body:
    "Meet people who understand, in moderated rooms or on our Discord. Join with a nickname, no email and no private messages.",
  primaryCta: { label: "Join the community", href: "/community" },
  discordLabel: "Open Discord",
  discordFallback: "/community",
  image: {
    src: "/landing/support.webp",
    width: 1100,
    height: 656,
    alt: "Person on a bean bag with a cat, surrounded by support options",
  },
  cards: [
    {
      chip: "Community",
      title: "You’re not alone",
      body: "Safe, moderated rooms with a two-tap report.",
      tone: "pink",
    },
    {
      chip: "Books & stories",
      title: "Learn and feel supported",
      body: "Guides, real stories and practical advice.",
      tone: "orange",
    },
    {
      chip: "Music & audio",
      title: "A moment of calm",
      body: "Playlists and soft audio for hard days.",
      tone: "mint",
    },
  ],
} as const;

/* ── Partner organisations ──────────────────────────────────────────── */

export type PartnerContact =
  | { kind: "text"; value: string }
  | { kind: "external"; label: string; href: string }
  | { kind: "internal"; label: string; href: string };

export const PARTNERS = {
  title: "Organisations that",
  highlight: "help",
  lead: "Trusted NGOs and official services. Contact them directly.",
  items: [
    {
      name: "Meri Trustline",
      body:
        "RATI Foundation. Free, confidential help with takedown, counselling and legal guidance by phone or WhatsApp.",
      contact: { kind: "text", value: "6363176363" },
    },
    {
      name: "StopNCII.org",
      body: "Free tool for adults (18+) to stop intimate images spreading on partner platforms.",
      contact: { kind: "external", label: "stopncii.org", href: "https://stopncii.org" },
    },
    {
      name: "Cyber Wellness Helpline",
      body: "Run by Responsible Netism. Support for people facing online harm.",
      contact: { kind: "internal", label: "Contact details", href: "/support" },
    },
    {
      name: "Cyber Crime Portal",
      body: "Report online to the National Cybercrime Reporting Portal or call the helpline.",
      contact: { kind: "text", value: "1930" },
    },
  ] as readonly {
    name: string;
    body: string;
    contact: PartnerContact;
  }[],
} as const;

/* ── Final call to action ───────────────────────────────────────────── */

export const FINAL_CTA = {
  title: "You don’t have to figure this out",
  highlight: "alone",
  lead: "Take the next step at your own pace.",
  cta: { label: "Get help →", href: "#how" },
  image: {
    src: "/landing/group-Photoroom.png",
    width: 1300,
    height: 542,
    alt: "Four people standing together with a heart",
  },
} as const;

/* ── Under-18 notice ────────────────────────────────────────────────── */

export const MINORS_NOTICE = {
  title: "Are you under 18?",
  childline: "1098",
  cta: { label: "Visit Take It Down", href: "https://takeitdown.ncmec.org" },
} as const;

/* ── FAQ ────────────────────────────────────────────────────────────── */

export const FAQ = {
  title: "Frequently asked",
  highlight: "questions",
  items: [
    {
      q: "Is Traceveil free?",
      a: "Yes. Getting help, the community and the helpline directory are free.",
    },
    { q: "Will my images be stored?", a: "No. Your images are not stored." },
    {
      q: "Can I use it regardless of my gender?",
      a: "Yes. Traceveil is for everyone, any gender and any age.",
    },
    {
      q: "Does Traceveil guarantee removal?",
      a: "No one can promise that. We prepare the requests and guide you; platforms decide.",
    },
    { q: "Do I need an account?", a: "No. The community uses a nickname only." },
    {
      q: "What if nothing is found?",
      a: "You can still talk to someone, join the community, or set up protection.",
    },
  ],
} as const;

/* ── Footer ─────────────────────────────────────────────────────────── */

export const FOOTER_LINKS = [
  { label: "Privacy" },
  { label: "Terms" },
  { label: "Support", href: "/support" },
  { label: "Community", href: "/community" },
  { label: "FAQ", href: "#faq" },
] as const;
