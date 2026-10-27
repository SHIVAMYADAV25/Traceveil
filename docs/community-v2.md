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

### Layout: one frame, one panel
The sidebar and the top header form an L-shaped frame in the current channel group's colour. The banner is laid across the top of the frame and fades downward, so the sidebar and header share it. The screen sits in a rounded panel set into the corner, which gives the curve where the three meet.
```
┌────────────┬──────────────────────────────────────────────┐
│ sidebar    │ top header (title, line of text, buttons)    │
│ (banner,   ├──╮───────────────────────────────────────────┤
│  menu,     │  │ panel: messages, composer, or a page      │
│  channels, │  │                                           │
│  you)      │  │                                           │
└────────────┴──┴───────────────────────────────────────────┘
```
- `shell/CommunityShell.tsx` owns the frame. It never unmounts while you move around; only the panel's content changes.
- The header's title and line of text come from the address (`shell/routeHeader.ts`) and the channel list the sidebar already has, so they change the instant you click. A screen adds its own buttons (rules, mute, mark all read) through `HeaderActions`, which draws them inside the header.
- Colours of the frame, panel and hover tint are derived from the group's tint in `community.css` (`.cm-themed`), so changing group changes them by a nudge, with a short transition.
- Sidebar: groups collapse with an animated height, the phone drawer slides in and out, the community menu opens over the list in the sidebar's own tone.
- Loading: a round "sun over waves" mark (`ui/Loader.tsx`) is centred in the panel while a channel loads. The header is already right at that point.

### Moving around
- **Members:** sidebar to channel. Notifications and account are one tap away.
- **Moderators:** plus **Moderation** in the sidebar with a count of waiting reports.
- **Admins:** plus **Admin**. Inside Admin a side navigation lists Overview, People and roles, Channels, Appeals, Audit log, Moderation queue and Back to channels. Moderation has an "Admin dashboard" button for admins.
- **Leave quickly** is in the header of every screen; Escape three times does the same.

### Admin and moderation pages
Breadcrumb, large title, short explanation and the main action on the right; frosted cards on a soft wash; table cards with a name and count, search and filter, status pills and a row menu. Layout idea from a reference dashboard; colours, icons and charts are our own.
- Overview: attention strip, four cards with a small chart and a change against last week (members, messages, reports, appeals), then active members as a ring, urgent reports, average time to resolve, and shortcuts. Charts use `GET /admin/stats/series` (counts per day for 14 days, admins only, numbers only). Nothing is estimated.
- People: search as you type, role filter, status (Restricted, New, Active, Quiet) worked out from existing fields, row menu for "Change role".
- Moderation: three count cards, the report list, and the detail beside it.

### Messages
- Discord-style rows: no bubbles or borders, everyone including you on the left with a 40 px picture, name, role tag and time, 16 px text, a faint tint on hover. Consecutive messages within five minutes are joined, with the time shown on hover.
- A reply shows a curved line back to the original; pressing it scrolls there.
- Hover bar at the row's top right (tap a message on a touch screen): three one-tap reactions, a picker with all six, reply, and a menu (copy, edit, delete, block, report).
- Reaction chips, "what would help" chips, role tags and the content-warning card are quiet and take their colour from the group.
- Not built: an unread-messages banner (the API does not return where you stopped reading).

### Notifications
Grouped Today and Earlier, All or Unread, an icon tile per kind, an unread dot, a hover state that says where it goes, and "Mark all as read" in the header. Pressing one marks it read and goes to the place; replies and mentions go to the exact message, which is scrolled to and highlighted (`?m=<message id>`).

### Composer
Soft rounded box with a glow on focus. The text field inside draws no outline of its own. "What would help" and "Content warning" open as a tray inside the box.

### Wording
Plain, warm, specific. "Group" and "channel" replace "space" and "room" in all member-facing and team-facing text. The internal names (`rooms`, `spaces`, API paths, database tables) are unchanged.

---

## 8. Files

### Changed outside the Community
None beyond v1 (Navbar, Footer, `.env.example`, `docker-compose.yml`, `package.json`, `pnpm-lock.yaml`).

### Service (`services/community`)
- `src/db/seed/spaces.ts`: new channel list, `archiveLegacy`.
- `src/modules/auth/{schema,repo}.ts`: no age at sign-up.
- `src/modules/admin/routes.ts`: new `GET /admin/stats/series`.
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
  shell/   CommunityShell, Sidebar, TopHeader, FrameBanner, routeHeader, ShellContext (HeaderActions), QuickExit
  chat/    ChannelHeader, ChannelIntro, NoteBody, MessageList, MessageItem, MessageToolbar,
           ReactionPicker, ReplyPreview, ContentWarning, MessageBody, Composer, ReadOnlyBar,
           ReportDialog, BlockDialog, SupportCard, useRoomMessages
  admin/   AdminNav, StatsContext, StatCard, Overview, People, Rooms, Appeals, Audit
  (ui/ also has Loader, Sparkline and Layout: PageIntro, GlassCard, TableCard, StatusDot)
  mod/     ReportDetailPanel
lib/community/   channelTheme.ts (new) plus the v1 files
public/community/banners/   five themed banners
```
Removed: `mod/ConsoleHeader.tsx`, the tabbed admin page. The old `?tab=` admin addresses no longer exist; notification links were updated.

---

## 9. How it was checked

Round 1 (the first v2 build) was checked with the service tests (97 passing), `tsc`, `eslint`, a browser smoke test and screenshots. Round 2 (frame, Discord-style messages, notifications, admin and moderation restyle, loader, series endpoint) was checked as it was built with `tsc`, the admin service tests (12 passing, including the new endpoint), an extended 16-check browser smoke test (`community_smoke.e2e.py`) and screenshots of the channel, hover bar, community menu, composer focus, notifications, admin overview, people, moderation with a real report, loader and phone drawer.

**Not re-run after the last small edits** (the loader redraw and the "New" / "Quiet" wording on the overview): `eslint`, the full service test suite and the smoke test. Run them before shipping:
```
pnpm --filter @sniffer/community test
cd apps/web && npx tsc --noEmit && npx eslint app/community components/community lib/community
python3 services/community/e2e/community_smoke.e2e.py   # needs service and web app running
```

### Not verified
- `next build` (needs Google Fonts); the dev server used fallback fonts.
- The old 45-check script (`community_ui.e2e.OUTDATED.py`) is out of date; moderation actions, appeals, suspended members, live two-person delivery and Leave quickly are not covered by the smoke test.
- Appeals, Channels and Audit pages were restyled but only Audit and Channels were glanced at.
- Keyboard-only use, screen readers, Safari, Firefox, a real phone, load, `docker compose`, contrast measurement. No dark theme.

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
