/** Plain-language guidance shown on the Counsellors and Community pages. */

export const FIRST_SESSION = [
  {
    title: "You decide how much to say",
    body: "A counsellor does not need to see the images or the links. “My private images were shared without my consent” is enough to begin. The rest can come later, or never.",
  },
  {
    title: "Ask about privacy in the first minute",
    body: "Counselling is confidential, with limits. Ask what they are. Usually the exception is a risk to your life or someone else's. Asking is normal and good counsellors expect it.",
  },
  {
    title: "You can change your mind",
    body: "If it does not feel right after a session or two, try someone else. A good fit matters more than sticking with the first person.",
  },
] as const;

export const PROFESSIONALS = [
  {
    term: "Counsellor",
    body: "Talks with you about what you are facing and helps you cope. Usually has a master's degree in counselling or psychology.",
  },
  {
    term: "Clinical psychologist",
    body: "Trained to assess and treat anxiety, depression and trauma using therapy. In India, should be registered with the Rehabilitation Council of India (RCI).",
  },
  {
    term: "Psychiatrist",
    body: "A medical doctor who can diagnose and prescribe medicine. Often works alongside a therapist rather than instead of one.",
  },
] as const;

export const QUESTIONS_TO_ASK = [
  "Have you worked with people affected by online or image-based abuse?",
  "Are you registered, and can I see your registration number?",
  "What are your fees, and what happens if I miss a session?",
  "What are the limits of confidentiality?",
  "Can we have sessions in my language, or online?",
] as const;

export const COMMUNITY_SAFETY = [
  {
    title: "Never post your images, links or case details",
    body: "Not even blurred. Anyone in the space can copy what you share.",
  },
  {
    title: "Be wary of anyone who offers to remove content for money",
    body: "This is a common scam aimed at people in your position. The services listed on this site are free.",
  },
  {
    title: "Be wary of private messages",
    body: "People who message you first, ask for photos, or move you to another app are a risk. Report and block them.",
  },
  {
    title: "Use a separate username",
    body: "Pick one that is not your name or one you use elsewhere.",
  },
  {
    title: "You can leave at any time",
    body: "If reading other people's stories makes things worse, step away. It does not mean you are doing it wrong.",
  },
] as const;
