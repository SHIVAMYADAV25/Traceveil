# Traceveil Community, v2

An anonymous, moderated group chat for people affected by non-consensual intimate imagery (NCII), living inside
the website at `/community` and backed by a separate service in `services/community`.

v2 redesigns the whole interface, replaces the channel list, opens the Community to people under 18, and splits the
admin area into proper pages. The service, database design, safety checks and moderation rules from
[v1](./community.md) are unchanged unless this document says otherwise.

---

## 1. What changed from v1

| Area | v1 | v2 |
| --- | --- | --- |
| Look | Light site styling, dark "console" band for team tools | One calm palette taken from the watercolours in `public/support`; each channel group has its own colour and banner |
| Navigation | Top bar, room list that disappeared on team pages | A Discord-style sidebar that is always there: banner, notifications, team tools (team only), channel groups, your name |
| Names | Spaces and rooms | **Groups** and **channels**, written `#like-this` |
| Channels | 6 spaces, 20 rooms | 5 groups, 22 channels (section 3). Old channels are archived, not deleted |
| Sign-up | Required an "I am 18 or older" box | No age question. Nothing about age is stored |
| Rules | Behind a collapsed "Pinned" button | Written out in full at the top of the channel; "Rules" button in the header reopens them; shown before the name step at onboarding |
| Messages | Flat list with a hover bar | Bubbles, reply line with a curved connector, role chips, soft content-warning card, emoji reaction chips |
| Reactions | Text menu | One row of six emoji, no text on screen (names kept for screen readers) |
| Composer | Dropdown that could be cut off | "What would help" and content warning open as a tray inside the input. Popup menus flip upward when needed |
| Admin | Five tabs on one page, hidden behind the account menu | Separate pages with a side navigation, a dashboard, and a visible "Admin" entry in the sidebar |

---

## 2. Purpose and promises

Unchanged. Five promises shape every decision: safe to be anonymous; calm by design; group only (no direct
messages); text only; moderated with care. See v1 section 1.

---

## 3. Channels

Names are exactly as supplied. Channel kinds: **chat** (everyone writes), **team only** (stored as `announcements`; the team writes, members read and react), **quiet** (same as team only; none seeded).

| Group | Channel | Kind | Notes |
| --- | --- | --- | --- |
| Start here | `#welcome` | Team only | Shows the four rules |
| | `#rules-and-safety` | Team only | The four rules |
| | `#announcements` | Team only | |
| | `#roles-and-intro` | Chat, 5 s slow mode | |
| Victim support | `#how-to-get-help` | Team only | |
| | `#ask-for-help` | Chat, 5 s slow mode | "Before you post" note |
| | `#private-support-tickets` | Team only | **Information only.** Says tickets are not open yet. See open question 1 |
| | `#crisis-and-wellbeing` | Chat, 5 s slow mode | "If you are in danger" note |
| | `#safety-and-privacy` | Chat | *Added* |
| | `#healing-and-small-wins` | Chat | *Added* |
| Traceveil product support | `#getting-started`, `#scan-questions`, `#takedown-help`, `#evidence-and-reports` | Chat | |
| | `#faq` | Team only | |
| Legal & resources | `#legal-resources-india`, `#global-resources` | Team only | India channel carries a "not legal advice" note |
| | `#lawyers-and-ngos` | Chat | Verified helpers can take part |
| | `#police-and-cybercrime` | Chat | *Added* |
| Bugs & feedback | `#report-a-bug`, `#feature-requests`, `#false-positives` | Chat | |

Three channels were added beyond the brief: `#safety-and-privacy`, `#healing-and-small-wins`, `#police-and-cybercrime`.
They are in the seed file and can be archived from **Admin → Channels**.

**Retiring the old list.** Running the seed (`pnpm --filter @sniffer/community seed`) archives the v1 groups and the
channels `welcome-and-rules` and `just-happened`, and renames the surviving `announcements`. Messages, reports and audit
records keep their links. It touches only those known v1 names, so channels an admin adds later are never archived.
Browsers that remembered an old channel are offered a "Go to #welcome" button.

---

## 4. Sign-up and age

- Sign-up asks nothing. A handle and an 8-word recovery phrase are generated; a password is optional.
- No age is recorded. Migration `002_open_to_all_ages.sql` makes `accounts.age_confirmed_at` optional; new rows leave it empty.
- Everything else that makes the Community safe for younger people is unchanged: no direct messages, text only, reports marked urgent when "a child or teenager is involved", crisis wording that privately shows a support card.
- **This needs a lawyer before launch.** India's Digital Personal Data Protection Act, 2023 has rules about processing children's data (including parental consent). Nothing in this build addresses that.

---

## 5. Roles and permissions

Unchanged from v1 section 4.

---

## 6. Architecture, database, safety

Unchanged from v1 sections 5 and 6, plus one migration (`002`). Seventeen tables.

---

## 7. The interface

### Design language
- **Palette.** Tokens live in `apps/web/app/community/community.css` under `.cm`. Neutrals are a pale sage-grey family; ink is a deep green-black. Text on any surface is at least `--cm-ink-3` (`#62706b`).
- **Group themes.** `apps/web/lib/community/channelTheme.ts` gives each group an accent, a tint, a text colour and a banner:

  | Group | Accent | Banner |
  | --- | --- | --- |
  | Start here | sage | `public/community/banners/start-here.webp` |
  | Victim support | soft rose | `victim-support.webp` |
  | Traceveil product support | mist blue | `product-support.webp` |
  | Legal & resources | dusk lavender | `legal-resources.webp` |
  | Bugs & feedback | sand | `bugs-feedback.webp` |

  The banners are tinted crops of the four images in `public/support` (about 15 KB each). Groups an admin adds later use the first theme.
- **Type.** The site's body font; Georgia for large titles, matching the existing headline style. Sentence-case labels throughout, no shouting.
- **Motion.** Only what answers an action: popups, the composer tray, the phone sidebar. All of it is switched off when the system asks for reduced motion.

### Layout
```
Sidebar (288 px)                      Main
 ┌───────────────────────┐            ┌────────────────────────────────────────┐
 │ banner of the group   │            │ Header: icon, name, purpose, Rules,    │
 │ Community ▾  (menu)   │            │         mute, Leave quickly            │
 │ Notifications         │            ├────────────────────────────────────────┤
 │ Moderation  (team)    │            │ Banner · "Welcome to #channel" · rules │
 │ Admin       (admin)   │            │ ── Today ──                            │
 │ ▾ Start here          │            │ messages                               │
 │   # channels          │            ├────────────────────────────────────────┤
 │ ▾ Victim support …    │            │ Composer (or a read-only bar)          │
 │ you · role · account  │            └────────────────────────────────────────┘
 └───────────────────────┘
```
On phones the sidebar slides in from the left (menu button in the header). The banner at the top of the sidebar changes with the group you are in.

### Moving around
- **Members:** sidebar → channel. Notifications and account are one tap away (sidebar row, account button, or the menu under "Community").
- **Moderators:** the same, plus **Moderation** in the sidebar with a count of reports waiting.
- **Admins:** the same, plus **Admin**. Inside Admin a side navigation (a scrolling strip on phones) lists Overview, People and roles, Channels, Appeals, Audit log, then "Moderation queue" and "Back to channels". The Moderation page has an "Admin" link for admins.
- **Leave quickly** is in the header of every screen, always labelled, and Escape three times does the same.

### Admin pages
`/community/admin` (overview), `/people`, `/rooms` (channels), `/appeals`, `/audit`. The overview shows an attention strip when urgent reports or appeals wait, seven stat cards with coloured SVG icons, a progress ring for "active in the last 7 days" as a share of members, and shortcuts. All numbers come from the existing `/admin/stats` counts; nothing is estimated and nothing shows what anyone wrote.

### Messages
- Bubbles: others on the left with a picture, your own on the right in the group's tint. Consecutive messages from one person within five minutes are joined.
- A reply shows a small curved line back to the original, who wrote it and an excerpt; pressing it scrolls there.
- The hover bar (tap a message on a touch screen): three one-tap reactions, a picker with all six, reply, and a menu (copy, edit, delete, block, report). Menus open downward and flip upward when there is no room.
- "What would help" shows as a chip with an icon. Role chips mark verified helpers and the team.
- A content warning collapses the message into a soft card with "Show message"; opened, it becomes a one-line reminder with "Hide again".
- Not built: an unread-messages banner. The API does not return where you stopped reading.

### Channel introduction and rules
Every channel opens with its banner, a large title ("Welcome to Traceveil Community" in `#welcome`, otherwise "Welcome to #name"), the purpose, badges (team only, slow mode, paused) and the channel's pinned notes written out in full. In a long channel the introduction is above "Show earlier messages"; the header's **Rules** button opens the notes in a dialog from anywhere.

### Composer
Soft rounded input. Below the text: **What would help** (three choices) and **Content warning** open as a tray inside the box, above the text. Send is a round button; during slow mode it shows the wait. Team-only channels, paused channels and restricted accounts show a read-only bar with the reason in plain words instead.

### Wording
Plain, warm, specific. "Group" and "channel" replace "space" and "room" in all member-facing and team-facing text. The internal names (`rooms`, `spaces`, API paths, database tables) are unchanged.

---

## 8. Files

### Changed outside the Community
None beyond v1 (Navbar, Footer, `.env.example`, `docker-compose.yml`, `package.json`, `pnpm-lock.yaml`).

### Service (`services/community`)
- `src/db/seed/spaces.ts`: new channel list, `archiveLegacy`.
- `src/modules/auth/{schema,repo}.ts`: no age at sign-up.
- `migrations/002_open_to_all_ages.sql`: new.
- `tests/*`: updated for the new channels and sign-up; one test now creates its own quiet channel because none is seeded.
- `e2e/community_smoke.e2e.py`: new browser smoke test. `e2e/community_ui.e2e.OUTDATED.py`: the v1 script, kept for reference, does not match the new interface.

### Web (`apps/web`)
```
app/community/
  community.css            design tokens
  layout.tsx, page.tsx     entry page
  join/ onboarding/
  (app)/layout.tsx         wraps signed-in screens in the shell
  (app)/[space]/[room]/    channel page
  (app)/account/ notifications/ moderation/
  (app)/admin/             layout.tsx (guard, nav) + page.tsx, people/, rooms/, appeals/, audit/
components/community/
  ui/      primitives, Menu, Avatar, Illustration, ChannelIcon
  shell/   CommunityShell, Sidebar, PageHeader, ShellContext, QuickExit
  chat/    ChannelHeader, ChannelIntro, NoteBody, MessageList, MessageItem, MessageToolbar,
           ReactionPicker, ReplyPreview, ContentWarning, MessageBody, Composer, ReadOnlyBar,
           ReportDialog, BlockDialog, SupportCard, useRoomMessages
  admin/   AdminNav, StatsContext, StatCard, Overview, People, Rooms, Appeals, Audit
  mod/     ReportDetailPanel
lib/community/   channelTheme.ts (new) plus the v1 files
public/community/banners/   five themed banners
```
Removed: `mod/ConsoleHeader.tsx`, the tabbed admin page. The old `?tab=` admin addresses no longer exist; notification links were updated.

---

## 9. How it was checked

Run on a Linux machine with PostgreSQL 16 installed directly and Chromium.

- **Service: 97 tests passing** (`vitest`), after the changes in this version.
- **Retiring old channels:** run by hand against a database holding the v1 channels. Old channels were archived and `announcements` renamed.
- **Web: `tsc --noEmit` and `eslint` report nothing** for the Community code.
- **Browser smoke test: 11 checks passing** (`community_smoke.e2e.py`) against the dev server: sign-up without an age box, rules before the name step, rules visible on `#welcome`, read-only team channel, the five groups, posting, the composer tray, the reaction picker, no script errors.
- **Looked at in screenshots:** entry, join, recovery, onboarding, `#welcome`, a chat channel with replies, own message, reaction and hover bar, the reaction picker, the admin overview and channels pages, and a 390 px wide phone view.

### Not verified (please do not assume it works)
- **`next build`** was not run. The environment cannot reach Google Fonts; the dev server ran with fallback fonts, so the real fonts were not seen.
- The v1 45-check browser test was not updated or run. The smoke test covers a fraction of it. Not covered: moderation actions, appeals, a suspended member, live two-person delivery, Leave quickly, and the personal-details and support-card prompts.
- Moderation, People, Appeals, Audit and Account were re-coloured and re-worded but not redesigned, and only the Channels and Overview admin pages were looked at.
- Keyboard-only use, screen readers, Safari, Firefox, a real phone, load, and `docker compose up community-db`.
- Colour contrast was chosen with care but not measured with a tool.
- No dark theme.

---

## 10. Before opening to the public

1. **Moderators.** At least two trained moderators whenever channels are open. Until then keep `COMMUNITY_OPEN=false`.
2. **Minors.** Get legal advice on the DPDP Act position for under-18s (section 4) and decide whether anything extra is needed.
3. **Review the wording**: the four rules, the channel notes, report reasons and `data/crisis-terms.json`, with a counsellor, an NGO or a helpline partner.
4. **Fill the team-only channels.** `#welcome`, `#how-to-get-help`, `#faq`, `#legal-resources-india`, `#global-resources` and the others are empty. Their content must be written, and legal and helpline details checked, by people who know them.
5. **Helplines.** `HELPLINES` in `apps/web/lib/community/copy.ts` is empty on purpose. Add only verified numbers.
6. **Change the database password**, serve over HTTPS, set `COOKIE_SECURE=true`.
7. Translate `copy.ts` with someone who understands the subject.

## 11. Open questions

1. **`#private-support-tickets`.** There is no ticket system, and the Community promises no private messages. The channel exists as information only. Decide whether to build tickets (a real design and privacy decision), rename the channel, or remove it.
2. **Added channels.** Keep, rename or archive `#safety-and-privacy`, `#healing-and-small-wins`, `#police-and-cybercrime`.
3. **"Victim support"** is used as written in the brief. Some people affected may not use that word; consider the label with a counsellor.
4. **Unread banner and dark theme** were in the references but not built.

## 12. Known limits

Unchanged from v1 section 11: no end-to-end encryption; ban evasion is easy; a lost recovery phrase means a lost account; peers are not professionals; anonymity depends on the person; automatic checks will miss things; thresholds were written without real conversations; the main web app's other routes are unauthenticated and were not touched. New in v2: with no age gate, the Community cannot tell who is a minor.
