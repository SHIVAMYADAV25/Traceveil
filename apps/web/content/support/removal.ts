import type { RemovalRoute } from "@/lib/support/types";

/**
 * Six ways to get content taken down or stop it spreading, in the order most people use them.
 * Details checked 22 Oct 2026. The 24-hour duty comes from MeitY's procedure of 11 Nov 2025.
 * We describe it in plain words only. No legal sections, until a lawyer has reviewed them.
 */
export const REMOVAL_INTRO =
  "Under a government procedure issued in November 2025, platforms are told to remove reported images within 24 hours of a complaint. It is a duty on the platform. You still have to make the complaint, and removal is not guaranteed.";

export const REMOVAL_ROUTES: RemovalRoute[] = [
  {
    id: "platform",
    name: "Report to the platform",
    forWhom: "Anyone, on any site or app that runs in India",
    summary: "The first step. Every large platform has a report button and a named Grievance Officer.",
    howTo: "Use the report button, or write to the Grievance Officer. Keep the acknowledgement they send.",
    limit: "How quickly and how well platforms respond varies.",
    link: { label: "Read the government procedure", url: "https://www.meity.gov.in/static/uploads/2025/11/a2c9500ef5f8b62a43bfc68747de592d.pdf" },
    checkedOn: "2026-10-22",
    source: "https://negd.gov.in/wp-content/uploads/2025/11/Press-Release_Press-Information-Bureau2-1.pdf",
  },
  {
    id: "cybercrime",
    name: "Cyber Crime Reporting Portal and helpline 1930",
    forWhom: "Anyone, including someone acting for you",
    summary: "The government's official place to report this online or by phone. It is also a route named in the November 2025 procedure.",
    howTo: "File on the portal, or call 1930. You can also go to a police station.",
    limit: "It records your complaint. It does not remove content or offer counselling. Whether to report is your decision.",
    phone: { display: "1930", tel: "1930" },
    link: { label: "Open cybercrime.gov.in", url: "https://cybercrime.gov.in" },
    checkedOn: "2026-10-22",
    source: "https://www.storyboard18.com/digital/breaking-govt-tightens-ncii-takedown-norms-makes-intermediaries-directly-accountable-84001.htm",
  },
  {
    id: "gac",
    name: "Grievance Appellate Committee",
    forWhom: "Anyone unhappy with a platform's answer, or with no answer",
    summary: "An online appeal against a platform's decision.",
    howTo: "Contact the platform first. Then appeal at gac.gov.in within 30 days of their reply.",
    limit: "You must have complained to the platform first. It is not for crimes: use 1930 for those.",
    link: { label: "Open gac.gov.in", url: "https://www.gac.gov.in/" },
    checkedOn: "2026-10-22",
    source: "https://cybermithra.in/2025/11/25/governments-24-hour-deletion-sop/?amp=1",
  },
  {
    id: "stopncii",
    name: "StopNCII.org",
    forWhom: "Adults. The image must have been taken when you were 18 or over",
    summary: "Makes a digital fingerprint of your image on your own device. Partner platforms use it to find and block copies. The image never leaves your device.",
    howTo: "Create a case on the site. Keep your case number and PIN.",
    limit: "Works only on partner platforms, not the whole internet. You need to still have the image.",
    link: { label: "Open stopncii.org", url: "https://stopncii.org/" },
    checkedOn: "2026-10-22",
    source: "https://stopncii.org/faq/",
  },
  {
    id: "take-it-down",
    name: "Take It Down",
    forWhom: "Anyone, if the image was taken before you were 18, even if you are now an adult",
    summary: "The same fingerprint idea, run by a US child-protection charity. You can use it without giving your name.",
    howTo: "Choose the file on your device on the site. The file is not uploaded.",
    limit: "Works only on partner platforms with public or unencrypted spaces. It may not remove copies already posted.",
    link: { label: "Open takeitdown.ncmec.org", url: "https://takeitdown.ncmec.org" },
    checkedOn: "2026-10-22",
    source: "https://takeitdown.ncmec.org",
  },
  {
    id: "google",
    name: "Google Search removal",
    forWhom: "The person in the image, or someone acting for you",
    summary: "Asks Google to stop showing pages with explicit images of you in search results.",
    howTo: "Use Google's removal form and give the page links.",
    limit: "The page stays on the website. Contact the site too, or use the routes above.",
    link: { label: "Open Google's form page", url: "https://support.google.com/websearch/answer/6302812" },
    checkedOn: "2026-10-21",
    source: "https://support.google.com/websearch/answer/6302812",
  },
];
