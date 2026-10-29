# Support pages: design record

Four pages under `/support` that look after the person while the removal work runs: counsellors, organisations and communities, and books and music.

Screenshots are in `docs/support-screenshots/`.

---

## 1. Read this first

**What is real and what is not.**

- Every phone number, hour and language list was checked on 21 Oct 2026 against the service's own page. The source URL is on every card.
- I did not find a Reddit or Discord community for this problem that I could verify. I did not invent one. See [section 9](#9-what-is-not-done-and-why).
- There are no individual private therapists in the data. I can't verify people. The page says so and teaches the person how to choose one.

**Things I found while working that you should know about.**

1. **`apps/web` has a build error that was there before my changes.** `app/api/cases/[caseId]/route.ts` has a wrong type on its second argument (`RouteCtx` should be `RouteContext`). `next build` stops on it. My files compile and type-check clean; the error is in a file I did not touch.
2. **`AGENTS.md` tells agents to read `node_modules/next/dist/docs/`. That folder does not exist in Next 16.1.6.** I followed the patterns already working in your code instead (async `params`, `Suspense` around `useSearchParams`) and verified with a real compile.
3. **The README describes a Vite + FastAPI app. The zip is a Next.js 16 + Tailwind v4 monorepo.** I designed for the Next.js code.
4. **The Meri Trustline number I recalled from memory was wrong.** The verified number is 63631 76363. This is why every number in the data has a source and a date.
5. **iCall's own pages disagree on hours** (one says 10 am to 8 pm, the FAQ says 8 am to 9 pm). I used the FAQ, which is the newer and more specific page.

---

## 2. What I read, and what the design system actually is

I read the landing sections, navbar and footer, the Leak, Report (shell, wellbeing/legal, NCII layout, action console), Dashboard, Takedown, Investigate and How it works pages, the Resources (editorial) pages, the blog components, the shared `ui/` primitives, the i18n provider and translations, and the screenshots/illustration assets. I skimmed the API routes only to confirm what is and isn't tracked.

**Finding: the real design system is not in `globals.css`.** That file holds stock shadcn greys that almost nothing uses. The product pages hard-code a warm-stone palette. I counted usage across the codebase:

| Colour | Uses | Role |
|---|---|---|
| `#e8e4de` | 313 | every border |
| `#0a0a0a` | 312 | headings, primary buttons |
| `#9ca3af` | 171 | captions |
| `#6b7280` | 131 | secondary text |
| `#fafaf8` | 109 | page background on product pages |
| `#a8a29e` | 107 | uppercase eyebrow labels |

Other patterns that repeat and that I matched:

- **Type:** serif (`font-serif`, Georgia) for h1, Inter for body, Geist Mono for small uppercase labels with wide tracking.
- **Shape:** pill buttons for primary actions, `rounded-xl`/`rounded-2xl` bordered white cards on `#fafaf8`, 1px-rule grids (`gap-px` on a line-coloured background) for tile groups.
- **Colour meaning:** indigo is the brand, rose is the NCII flow, emerald is "done/safe", amber is "check this".
- **Chrome:** a sticky white header with logo, a `/`, and a mono crumb (the Report page header). Section dividers of the form `01 ——— LABEL`.
- **Imagery:** thin ink line drawings with small indigo "pixel" squares (`/illustration.png`).
- **Language:** the product pages are English-only and hard-coded; only the landing page uses the translation file.

**I kept all of this.** The new pages use the same values, the same header, the same dividers, the same pill buttons and the same illustration style.

### Deliberate departures (all for a distressed reader)

| Existing habit | What I did | Why |
|---|---|---|
| 9–10 px mono labels | 11 px minimum | Hard to read when you're upset or on a phone |
| 13 px body text | 14–15.5 px body, 1.7 line height | Reading is harder under stress |
| Forensic words ("console", "evidence record") | Plain words | The reader is a person, not an analyst |
| Dark "console" header bars | None | They feel clinical. The Support area has no dark blocks except the active tab and primary buttons |

---

## 3. Tokens

Added to `app/globals.css` inside the existing `@theme inline` block. **They are the same hex values the app already hard-codes**, so nothing existing changes. New pages use the names (`bg-canvas`, `border-line`, `text-ink-soft`). You can migrate old pages whenever you want.

| Token | Value | Use |
|---|---|---|
| `canvas` | `#fafaf8` | page background |
| `paper` | `#ffffff` | cards |
| `sand` | `#f0ede8` | tiles, placeholders |
| `line` / `line-strong` | `#e8e4de` / `#d4cfc9` | borders / hover borders |
| `ink` | `#0a0a0a` | headings, primary button |
| `ink-body` | `#374151` | running text |
| `ink-soft` | `#6b7280` | secondary text |
| `ink-faint` | `#9ca3af` | captions, meta |
| `ink-quiet` | `#a8a29e` | uppercase labels |
| `brand` | `#4f46e5` | logo indigo |

**Tones** (`lib/support/tones.ts`) give each kind of content one colour family, all families the app already uses:

| Tone | Family | Used for |
|---|---|---|
| `care` | rose | crisis help, "Talk to someone", the support callout |
| `brand` | indigo | organisations and communities, neutral actions |
| `safe` | emerald | "Free", books and music |
| `warm` | amber | cautions only: content notes, "Watch out" |
| `calm` | sky | music: slowing down |
| `quiet` | violet | music: sleep |

Rule: **amber means a real caution.** In the first draft I used it for every "Good to know" note, which made the page look alarmed. I changed those to a neutral box after seeing the screenshot.

---

## 4. How the features are divided: four pages

### The decision

| Page | Route | The person's question |
|---|---|---|
| Hub | `/support` | "What would help me right now?" |
| Counsellors | `/support/counsellors` | "I want to talk to a professional." |
| Organisations and communities | `/support/community` | "Who can help me act, and who understands?" |
| Books and music | `/support/books-and-music` | "I need something to do with the next hour." |

### Why four, not one or six

I split by **what the person is trying to do**, not by what kind of data it is.

- **One long page** would put crisis numbers, 8 service cards, 5 books and 6 songs in one scroll. For someone in distress that is a wall. They would also have to scroll past things they don't need to reach the thing they do.
- **Six pages** (counsellors, NGOs, communities, books, music, hub) means 5 or 6 more decisions before getting help. Books (5) and music (6) are each too small to deserve a page, and both serve the same need: something to do while waiting. I merged them.
- **NGOs and communities share a page but not a list.** They are different jobs. Organisations can *act* (report, remove, advise). Communities can only keep you company, and carry risk. They are two tabs, so the person sees one kind at a time, and the intro says plainly which is which.
- **A hub is worth the extra click** because it's where the crisis numbers live, it gives three clear choices instead of one overwhelming page, and it is the single entry point from the report, the navbar and the footer.

### Where people enter

- **Report page:** a quiet rose band after "evidence recorded" links to `/support`. It carries `?caseId=` so every Support page shows "Back to your report".
- **Leak page:** one line under the main button: "Want to talk to someone first?"
- **Navbar:** "Support". **Footer:** "Support and counselling".

---

## 5. What each page shows, and how much

The rule I used: **show what helps decide, and no more. Put the reason behind a choice next to the choice.**

### Hub: three choices and one safety net

Shows: crisis panel, three tiles, an under-18 note.

- **3 tiles, not more.** Three is a choice a distressed person can make in a few seconds. Each tile has an illustration, one plain sentence about what it's for, and one line of facts.
- **Crisis panel: 3 numbers, each with *when* to call it** ("Thinking about ending your life, or can't cope" → 14416). The reader finds themselves in the sentence rather than having to guess what a helpline is for. 14416 for crisis, 112 for danger, 1930 for blackmail. The third is there because blackmail over images is a likely situation for this product's users.
- **Under-18 note:** StopNCII and several services are adult-only. A minor who lands here needs Childline 1098 and Take It Down instead.
- **Privacy statements** (no account, nothing tracked, quick exit) sit under the heading, where they reassure before the person reads further.

### Counsellors: free services, grouped by *when you can call*

Shows 4 services (Tele-MANAS, Vandrevala, Meri Trustline, iCall), grouped:

1. **Answer at any hour** (Tele-MANAS, Vandrevala)
2. **Open on set days and times** (Meri Trustline, iCall)

The grouping replaces a filter. With 4 items, a filter adds effort and removes almost nothing. At 2 am the person sees at once which numbers will be answered. **When the list passes about 8 entries, add a language and "24 hours" filter.** The data already supports it.

Each card shows, in this order: name and "Free" badge → one-sentence description → hours → how to reach → languages → tags → one "Good to know" line → **Call** button → website → date checked and source. Not shown: ratings, reviews, photos, years of experience, "book now". They add pressure, and we cannot verify them.

Below the list, three short pieces of content (the "therapist-related content" in your brief):

- **Before your first session (3 points):** you decide how much to say, ask about privacy in the first minute, you can change your mind. The first point answers the biggest fear: *do I have to show them the images?*
- **Who does what (3 rows):** counsellor, clinical psychologist, psychiatrist, in one or two sentences each, including the RCI registration tip.
- **Finding a private therapist:** five questions to ask, plus iCall's directory.

### Organisations and communities: 5 and 1, with safety rules

- **Organisations (5), ordered by how specific they are to this problem:** Meri Trustline (this exact problem, Mumbai) → StopNCII (stops re-uploads) → Cyber Crime portal and 1930 (official report) → Majlis (legal, Mumbai) → Women Helpline 181.
- **Communities (1):** 7 Cups, with "Who is there", "Moderation" and "Watch out" shown on the card.
- **Staying safe in online spaces (5 rules):** never post images, beware removal-for-money offers, beware private messages, use a separate username, you can leave. These matter more than the list itself.

### Books and music: 6 and 5, chosen by moment, not genre

- **Music (6), ordered by when you'd need it:** racing thoughts → can't sleep → need to cry → want to feel held → ready to speak up → want a lighter hour. Half are instrumental, because lyrics about love or loss can hurt on a bad day. Each says "Instrumental" or the language of the vocals.
- **Books (5)**, each with a specific reason, an effort label (Short chapters / Quick read / Slower read), and a **content note** only where a book has hard material (Frankl describes concentration camps).
- Music comes before books because it takes less effort. The page intro says "Pick one. You don't have to finish it, and you don't have to feel better afterwards."
- Links open a search on Spotify, YouTube, Open Library and Google Books. I could not verify direct track URLs, and a search link cannot go dead.

I rejected *The Body Keeps the Score* and *The Courage to Be Disliked*. The first is dense and clinically graphic. The second argues that trauma doesn't determine the present, which could read as dismissive to a victim.

---

## 6. Words

Rules I wrote to and checked the copy against:

1. Say what a thing is and what it will do. ("Free counselling by phone, at any hour", not "compassionate support".)
2. Plain words over service words: *job*, *call*, *report*, *take down*. Not *journey*, *empower*, *navigate*, *healing*, *unlock*.
3. Never promise an outcome. No "you will feel better" and no "everything will be okay".
4. Say the uncomfortable thing directly when safety needs it: "Thinking about ending your life". Not a euphemism.
5. Say what a service can't do ("Not an emergency service", "Listeners are volunteers, not therapists", "Adults only (18+)").
6. Only claim what the code does. "We don't record which resources you open" is true: these pages make no tracking calls. I did not write "nothing is linked to your case", because the case ID is in the URL.
7. No emoji, no exclamation marks.

---

## 7. Images

- **Three line illustrations** in the style of your `/illustration.png`: thin ink strokes, small indigo squares. One per hub tile: two people (talk), a ring of people (community), an open book with sound arcs (books and music). They are decorative and hidden from screen readers.
- **Book covers are typographic tiles** in each book's tone. Real covers are copyrighted and would need remote images (`next.config.ts` only allows `img.logo.dev`). If you later get permission, add a `coverUrl` field and `remotePatterns`.
- **Music art** is a small sound-wave tile in each track's tone.
- No stock photos of people. They tend to look staged, and a photo of a "sad woman" is a poor image to show someone this is about.

---

## 7a. Safety and privacy decisions

| Feature | What it does | Why |
|---|---|---|
| **Leave quickly** (header, all Support pages) | Replaces the page with google.com so Back doesn't return, and clears this tab's `traceveil_*` session values (image previews from the report flow). Pressing Esc twice does the same. | Someone may walk in. The report keeps image previews in `sessionStorage`, so leaving the page alone isn't enough. **Remove the storage clearing if you don't want that side effect.** |
| **No tracking** | The Support pages make no analytics or API calls. | Visiting support is itself sensitive. |
| **`tel:` links with 40 px+ tap targets** | Every number is a one-tap call on mobile. | Typing a number while upset causes errors. |
| **Checked-on date and source on every card** | Visible on the card. | Same rule as your backend takedown contacts. A reader or a reviewer can check it. |
| **Under-18 note** | Hub only. | StopNCII is 18+. |

Accessibility: tab pattern uses `role="tablist"`/`tabpanel` with the URL hash (`#communities`) so it's linkable; external links announce "(opens in a new tab)"; focus rings on every control; `animate-in` respects `prefers-reduced-motion`; body text is 14 px or larger; no information is carried by colour alone.

---

## 8. Files

### New (29)

```
apps/web/
├── app/support/
│   ├── layout.tsx                  Shared header + footer for all Support pages
│   ├── page.tsx                    Hub
│   ├── counsellors/page.tsx
│   ├── community/page.tsx          Organisations + communities (tabs)
│   └── books-and-music/page.tsx
├── components/support/
│   ├── SupportHeader.tsx           Logo, crumbs, "Back to your report", Leave quickly
│   ├── QuickExit.tsx               Leave button + Esc×2
│   ├── SupportFooter.tsx           Disclaimer and privacy note
│   ├── PageIntro.tsx               Badge + serif title + lead
│   ├── SectionRule.tsx             "01 ——— Label" divider
│   ├── CrisisPanel.tsx             Immediate help (full or compact)
│   ├── PathTile.tsx                Hub tile
│   ├── ServiceCard.tsx             Counsellor / organisation card
│   ├── CommunityCard.tsx
│   ├── CommunityTabs.tsx           Organisations | Communities
│   ├── TrackRow.tsx, BookRow.tsx
│   ├── CoverTile.tsx               Book cover and track art
│   ├── SupportCallout.tsx          Band used on the Report page
│   ├── Icons.tsx
│   └── illustrations/index.tsx     Three line illustrations
├── content/support/                ALL the words and data. Edit here, not in components.
│   ├── services.ts                 8 services (counselling, legal, reporting…)
│   ├── communities.ts
│   ├── books.ts, music.ts
│   └── guides.ts                   First-session, who-does-what, questions, safety rules
└── lib/support/
    ├── types.ts                    Service, Community, Book, Track
    ├── tones.ts                    Tone → class map
    └── format.ts                   Dates, monogram initials, search links
```

### Changed (5, all small and additive)

| File | Change |
|---|---|
| `app/globals.css` | + 11 named colour tokens (same values as already used) |
| `components/landing/Navbar.tsx` | + one nav item: Support |
| `components/landing/Footer.tsx` | + one link: Support and counselling |
| `components/report/NCIIReportLayout.tsx` | + import and `<SupportCallout />` before section 02 |
| `app/leak/page.tsx` | + one line under the main button |

### How I checked

- `tsc --noEmit`: no errors in any file I touched or created.
- `eslint`: clean on all new files (one real error found and fixed: setState inside an effect in the header).
- `next dev`: all four routes return 200. Screenshots at 1280 px and 390 px. No horizontal scroll at 390 px. `#communities` deep link works. Double-Esc navigates away.
- **Not tested:** a full `next build` (blocked by the existing route error above), a screen reader, a real phone, and the report-page callout in a live case. I rendered the Support pages, but I did not load `/report/<id>` with real data.
- Fonts: the sandbox couldn't reach Google Fonts, so screenshots show the system sans where the product uses Geist Mono. Your real build will render the proper typefaces. I restored `layout.tsx` to the original; it is not in the changeset.

---

## 9. What is not done, and why

| Item | Status | What to do |
|---|---|---|
| **Reddit and Discord links** | **Not included.** | See below. |
| **Individual private therapists** | Not included. | Needs partnerships and verification. The `Service` type already fits a practitioner; add rows to `services.ts` with `checkedOn` and `source` after you've verified each. |
| **Hindi, Marathi and other languages** | English only. | The product pages are English-only too. For this content it matters most: copy is isolated in `content/support/`. Translate with a native speaker who has seen trauma-informed writing, not machine translation, and check helpline language lists. |
| **Indian law wording** | None. | Your README says it must be checked by a lawyer. I kept to that. |
| **Hours and numbers will change** | Checked 21 Oct 2026. | Put a quarterly re-check in the calendar. The date on each card tells the reader how fresh it is. |

### Adding a Reddit or Discord community

I searched and could not find a moderated community specific to leaked intimate images that I could verify. Discord invites can't be checked without joining. A fabricated or unvetted link in a product like this can put someone in contact with the person who harmed them, or with a scammer. So `communities.ts` has one verified entry and the page says why there are no others.

Before adding one, the community must pass all of these, and the date written in `checkedOn`:

1. Active moderators, with written rules visible without joining.
2. A rule against posting images or identifying details, and visible enforcement of it.
3. A rule against unsolicited private messages and offers to "remove content".
4. Recent activity (posts in the last few days) and a response when someone is in distress.
5. Someone on your team has read it for at least a week, from a throwaway account.
6. A note in the card's `watchOut` field about the specific risks there.

---

## 10. How to apply this

1. Copy `apps/web/` from this package over your `apps/web/`. The five changed files are full replacements. Compare them with yours first if you have local edits (`diff` them).
2. `cd apps/web && npm install && npm run dev`, then open `/support`.
3. Fix the existing route type error if you want `next build` to pass.
