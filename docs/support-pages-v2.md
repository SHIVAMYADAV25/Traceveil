# Support pages v2: what changed, what was checked, what is held

Checked 22 Oct 2026. Read with `support-pages.md`.

## Structure

Hub keeps three choices. Everything new sits inside them.

```
/support                      Hub: crisis numbers, 3 tiles, band for Our Discord and Our chat, under-18 note
├── /support/counsellors      01 Free helplines (any hour | set hours)  02 See a psychiatrist  03 Before your first session
│                             04 Who does what  05 Finding a private therapist
├── /support/community        Tab "Get it taken down":  6 removal routes, then 5 organisations
│   #communities              Tab "Talk with others":   Our Discord, Our chat, 7 Cups, safety rules
└── /support/read-and-listen  Tabs: Listen (12) | Stories (4) | Blogs (4) | Books (9)
    /support/books-and-music  Redirects to read-and-listen
```

## Turning on Discord and chat

Edit `content/support/own-spaces.ts`. Two lines:

```ts
export const DISCORD_URL: string | null = null;  // paste the invite link
export const CHAT_URL: string | null = null;     // set to "/chat" when the app is live
```

`null` shows "Opening soon" and no button. A value shows an "Open" badge and a button. `/chat` opens in the same tab; anything else opens a new tab.

Before either goes live, the team must make true what the card tells the reader: daily moderation, no images, private messages from new contacts limited, 18 and over (change `minAge` if different).

## Opened and checked on 22 Oct 2026

AASRA 24x7 number (aasra.info). SNEHA numbers (found a conflict, see below). Responsible Netism helpline number (news report only; hours not published). Take It Down and StopNCII age rules and how they work. MeitY 24-hour procedure, 1930, cybercrime portal, grievance officers and the appeal route (several reports; SOP PDF not opened). Discord: 13+ account age, 18+ servers possible, direct messages from server members on by default and can be switched off. Lauren's story (Revenge Porn Helpline site). Leah Juliett's TED page.

## Found while checking

- **SNEHA's own pages disagree.** The workbook number 98922 78287 appears on older pages. The newest crisis-helpline page lists 91675 35765. The data uses the newest and the card says to confirm.
- **Hub under-18 note was wrong.** Take It Down is for images taken before 18, including for adults now. StopNCII is for images taken at 18 or over. Fixed.

## From the workbook, not re-opened by me

Marked `verifiedBy: "workbook"` in the data (not shown to readers). Click-test each, then change to `"opened"`: eSanjeevani, all six calm-audio links, the four new books' publisher pages, Ayesha Omar interview link, Brave Movement story, SOAR Q&A, SNEHA article, Imaara stories, SurvivorSpace writing, Google removal page.

## Held back

| Item | Why |
|---|---|
| Humsafar, CyberB.A.A.P., Shakti Shalini, Mudita | Not re-opened. Add after check. |
| Digital Safe India, PARI | Workbook says do not surface. |
| Reddit | No named community. |
| H.O.P.E., SurvivorSpace circles, Orinam, Imaara Tara, Our Wave | Not about this experience, or moderation unchecked. |
| India Today interview, Mashable | Workbook could not verify. |
| 50 Shades of Silence, FOX 61 panel, Andrea Powell interview, IGPP talk | Tone unreviewed, or about system gaps and trafficking. |
| MSF clinic page | Clinic closing. |
| Happiful, Springer paper | UK-focused and dated, or academic. |
| Amaha, Practo | Prices and numbers not re-opened. |
| Trauma and Recovery, Healing Sex, Born a Crime, Educated, Fourteen, picture book | Dense, off-topic or wrong age for this reader. |
| Two books with marketplace links | Workbook says replace first. |

## Files

New: `SupportTabs`, `OwnSpaceCard`, `RemovalCard`, `PieceCard`, `CalmRow`, `app/support/read-and-listen/page.tsx`, `content/support/{removal,own-spaces,stories,calm}.ts`.
Changed: hub, counsellors, community pages, header crumbs, `BookRow`, `books.ts`, `services.ts`, `types.ts`, `format.ts`, layout text.
Removed: `CommunityTabs` (replaced by `SupportTabs`). `stopncii` and `cybercrime` moved from `services.ts` to `removal.ts`.

## Not tested

Real phone, screen reader, a browser at 390 px, ESLint (no repo config in the zip), `next build`. Routes were rendered in a scratch Next app and returned 200.
