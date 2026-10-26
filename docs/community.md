> **Superseded by [community-v2.md](./community-v2.md).** This is the original (v1) document, kept for history. The interface, channel list and sign-up described here have changed.

# Traceveil Community

An anonymous, moderated group chat for people affected by non-consensual intimate imagery (NCII).
It lives inside the existing website at `/community`, backed by a separate service in `services/community`.

This document explains what was built, why it was designed this way, how it is put together, which
files were added or changed, and what has and has not been checked.

---

## 1. Purpose

Getting content removed is only part of recovery. People also need to talk to others who have been
through the same thing, in a place that is calm, private and looked after.

The Community is that place. Five promises shape every decision:

1. **Safe to be anonymous.** No real name, no required email, no member list, no tracking.
2. **Calm by design.** No typing indicators, no "who is online", no negative reactions, no counters.
3. **Group only.** Everything is visible to the room. There are no direct messages, so nobody can be
   approached privately. That removes the usual route for scammers posing as "removal services" and for abusers.
4. **Text only.** No images, video or files, so the Community can never become a place where leaked
   content is shared again.
5. **Moderated, with care.** Reports reach a person quickly, the person reported can appeal, and
   moderators are protected from what they review.

---

## 2. Decisions and the reasons behind them

| Decision | Reason |
| --- | --- |
| Separate Node.js service with its own PostgreSQL database | Requested. It also keeps sensitive conversation data away from the case data in MongoDB, and the existing app has no authentication to build on. |
| PostgreSQL, not MongoDB | Foreign keys, constraints and transactions matter for moderation records. Append-only audit tables are enforced by the database, not just by code. |
| WebSockets (`ws` through Fastify) | Next.js route handlers cannot host WebSockets, so a standalone service is the right place for them. |
| No direct messages | Requested. See promise 3 above. |
| No images, video or files | Re-sharing of leaked content, child-safety risk, legal exposure, and no 24-hour moderation team to review media. |
| Accounts without email: a generated handle plus an 8-word recovery phrase shown once | Someone hiding from an abuser may not want an email address linked to this. Phrases are stored as argon2id hashes, so even the team cannot read them. About 62 bits of entropy, with login throttling and lockout. |
| Messages store a **persona**, never an account | Other members only ever see a made-up name and picture. Linking a persona to an account is an admin-only action that needs a written reason and is permanently logged. |
| Reactions limited to six supportive ones | No thumbs-down, no laughing. Reactions cannot be used to mock someone. |
| Reported people are **not** told they were reported | Avoids retaliation against the reporter. They are told only when action is taken against them, with the reason, and they can appeal. |
| Moderators never see who reported | Only the note the reporter chose to write is shown. |
| Reports about team members are visible to admins only | Moderators should not review reports about themselves or peers. |
| Messages expire (30 days by default) | Less data held means less data to lose. Reports keep their own frozen copy of context for 90 days after resolution. |
| `COMMUNITY_OPEN` defaults to **off** | An unmoderated support chat for people in crisis can do harm. Rooms stay read-only until a moderation team exists. |

### Where the build differs from the plan that was agreed

- **Optional email was not built.** There is no way to send recovery email, and storing an address
  that is never used would collect data for no reason.
- **Interface words are in English only**, in `apps/web/lib/community/copy.ts`, not in the 98 KB
  `translations.ts`. These words need translating by someone who understands the situation, not by
  machine. The file is structured so another language can mirror it.
- **Not every module has four files.** Features with little logic keep everything in `routes.ts`.
- **The existing face illustration was not reused.** It shows a face dissolving into pixels. That
  suits a deepfake-detection product, but could be upsetting here and contradicts the "no faces" choice.
  A new abstract illustration was drawn in the site's palette.
- **A legal hold on report snapshots was not built.** They are purged 90 days after resolution.
- The footer line "Anonymous by default · No stored images" was checked and is still accurate, so it was left unchanged.

---

## 3. Features

**Accounts and anonymity**
- Sign up needs only the 18+ confirmation. A handle and recovery phrase are generated; an optional password can be added.
- The recovery phrase is shown once, with copy and download options, and the page is set up to warn before it is closed.
- Every member gets a generated name and an abstract picture (shapes and colour, never faces). Names are unique and can be changed.
- Account deletion is self-service. Past messages stay until they expire but show as "Deleted member" and can no longer be linked to anyone.

**Spaces and rooms**
- Six spaces and twenty rooms are seeded (Start here, Getting content removed, Staying safe, Healing, People around you, Specific situations). Admins can add, edit, lock, archive and reorder them.
- Room kinds: **chat** (everyone writes), **quiet** (the team writes; members read and react), **announcements** (the team writes).
- Each room has a purpose line, optional pinned notes, optional slow mode, an optional minimum account age and a language field.

**Messaging**
- Text up to 2,000 characters, with emoji. Replies show who and what is being answered. Mentions only work for people who recently wrote in the room, up to five per message.
- An optional **"what would help"** tag (someone to listen / practical ideas / just reading) and an optional **content warning** that collapses a message until the reader chooses to open it.
- Edit and delete your own messages. Deleting really erases the text. Block someone and their messages disappear for you everywhere. Mute a room. Unread markers.
- Live delivery over WebSockets, with automatic reconnection and catch-up after a dropped connection.

**Automatic safety checks (before a message is saved)**
- Links to leak sites on a blocklist are always refused. Accounts under 7 days old cannot post links. Member links are shown as plain text, never clickable. Team and verified-helper links are clickable behind an "you are leaving" prompt.
- Text that looks like a phone number, email address or ID number triggers an "are you sure?" prompt.
- Crisis wording privately shows the author a support card. It is never stored and never reported.
- Slow mode, a 10-second cooldown for brand-new accounts, duplicate-message blocking, and rate limits.

**Reporting and moderation**
- Report any message with nine plain-language reasons. Threats, a minor involved, risk of self-harm and personal details are marked **urgent** and go to the top.
- The surrounding messages are frozen at the moment of the report, so context survives edits and deletions.
- Moderator console: queue (Waiting / Mine / Closed), report detail with blurred text until revealed, a history of earlier actions on the person, claim, and actions: dismiss, hide, warn, mute in a room, pause access, escalate, private note. Moderators can set up to 7 days.
- Admins can also remove access (ban), set longer durations, look up the account behind a persona (needs a written reason, always logged), manage roles, rooms and appeals, and read the audit log.
- Appeals: anyone restricted can still reach their account page, see the reason and ask for a review.

**Safety of the person using it**
- **Leave quickly**: a button always visible at the top, and pressing Escape three times does the same. It blanks the page and replaces it in the browser history.
- The interface does not rely on colour alone to show status. Dialogs, menus and forms are built for keyboard use, but full keyboard-only use of every screen has not been tested.

---

## 4. Roles and permissions

| Action | Member | Verified helper | Moderator | Admin |
| --- | :-: | :-: | :-: | :-: |
| Read rooms; write, reply, mention, react (where allowed) | Yes | Yes | Yes | Yes |
| Report, block, mute rooms; edit or delete own messages | Yes | Yes | Yes | Yes |
| Post clickable links | No | Yes | Yes | Yes |
| Write in announcements and quiet rooms | No | No | Yes | Yes |
| Ignore slow mode and the new-account cooldown | No | No | Yes | Yes |
| See the report queue; hide messages; warn; mute in a room; pause access (up to 7 days) | No | No | Yes | Yes |
| Act on a report about a team member | No | No | No | Yes |
| Remove access; set longer durations; lift restrictions; decide appeals | No | No | No | Yes |
| Change roles and manage spaces and rooms | No | No | No | Yes |
| Look up the account behind a persona (audited) | No | No | No | Yes |

"Verified helper" is a badge for NGO staff, counsellors and lawyers confirmed by an admin. It carries no moderation power.
An admin cannot change their own role, and admins cannot be restricted through reports.

---

## 5. Architecture

```
Browser (Next.js pages under /community)
   |  HTTPS: JSON requests and one WebSocket
   v
Community service (Node.js, port 8004)
   |-- REST routes: sign-in, rooms, history, send, react, report, moderate, administer
   |-- WebSocket hub: pushes new messages, reactions, notifications to connected people
   |-- Safety checks: links, personal details, crisis wording, rate limits
   |-- Cleanup job: expired messages and restrictions, old snapshots, sessions
   v
PostgreSQL (its own container; no link to MongoDB)
```

**Sending and receiving.** Sending is a normal request carrying a client-made id, so a retry never posts twice.
The service checks permissions, restrictions, slow mode and the safety checks, saves the message, then the hub
pushes it to everyone subscribed to that room, except people who blocked the author. Opening a room loads history
over HTTP. If the connection drops it reconnects with a growing pause, re-joins its rooms and fetches what it missed.

**Security.** Sessions are random tokens in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production). Only a
hash of the token is stored. Every change to data needs a custom header and an allowed origin, so another website
cannot act on someone's behalf. WebSockets also check the origin. Roles are checked on the server for every route.
Message text is stored and shown as plain text: no HTML, no Markdown. Input is validated with schemas. Error replies
never include internals. Logs contain only the method, path and status code: **no IP addresses, cookies or message text**.
Dependency audit for the service: 0 known vulnerabilities in production packages.

**Data protection.** Collected: a handle, a hashed recovery phrase, an optional hashed password, messages and reports.
Not collected: email, real name, IP address, device details. Messages expire; sessions, notifications and old report
snapshots are cleaned up automatically. Compliance with India's Digital Personal Data Protection Act, 2023 needs review by a lawyer.

**Single instance.** Live connections are held in memory. To run several instances, implement the small `Realtime`
interface in `src/realtime/hub.ts` over Redis; nothing else needs to change.

---

## 6. Database (PostgreSQL, 17 tables)

| Table | Holds |
| --- | --- |
| `accounts` | handle, hashed recovery phrase and password, role, login failure counters, age and rules confirmation times |
| `personas` | the made-up name and picture seed. One per account. `account_id` becomes empty on deletion |
| `sessions` | hashed session tokens with expiry |
| `spaces`, `rooms`, `room_notes` | structure, room settings and pinned notes |
| `room_reads` | each person's read position and mute setting |
| `messages` | text, reply link, tag, content warning, status, expiry. Unique per author and client id |
| `message_mentions`, `reactions`, `blocks` | who was mentioned, who reacted with what, who blocked whom |
| `reports` | reason, note, priority, status, assignee, and the frozen context |
| `restrictions` | mutes, pauses and bans with start, end and reason |
| `mod_actions`, `audit_log` | permanent records. The database refuses to update or delete rows |
| `appeals` | appeal text, status and the admin's decision |
| `notifications` | in-app notifications |

Foreign keys connect everything that should stay connected. `mod_actions` and `audit_log` deliberately hold plain
ids instead, so the record outlives deleted accounts, messages and rooms. Migrations are plain SQL in
`services/community/migrations/`, checksummed so an applied file cannot be quietly edited.

---

## 7. The interface

### Design language
The Community reuses what the existing pages actually use: canvas `#fafaf8`, white cards, 1px `#e8e4de` borders,
ink `#0a0a0a`, secondary text `#374151` and `#6b7280`, chips `#f0ede8`, indigo for brand and selection, rose for care
and sensitive actions, emerald for success, amber for waiting. Pill buttons, rounded cards, the mono uppercase
"eyebrow" labels, Georgia only for the main headline, and the same spacing rhythm (`px-4 sm:px-8`, gaps of 2 to 4,
cards padded 4 to 6). The shadcn tokens in `globals.css` are not used by the pages, so they were not used here either.

### Two moods, on purpose
- **Members** see a light, quiet interface.
- **Team tools** (moderation and admin) use the dark "console" header band the site already uses for the Removal Console.
  It signals "you are now doing team work" and visually separates caring for others from being cared for.

### Where it deliberately differs from the rest of the site
Messages are 15px, and any text people must read is at least `#6b7280`. The existing 9 to 11px text in light grey
is kept for decoration only, because it fails contrast guidelines and tires people who are already distressed.
Touch targets on message actions are enlarged on phones.

### Wording
Plain, warm and specific: "Write to everyone in this room", "Leave quickly", "Report this message", "Ask for a review",
"Go back and edit" (offered as the main button on the personal-details prompt, so the safe choice is the easy one).
Top-level groups are **Spaces** and the rooms inside them are **Rooms**; changing those words is a single edit in `copy.ts`.

### Screens
Entry page (inside the existing nav and footer) · Join and sign in · One-time recovery phrase · Onboarding (name and four rules) ·
Room (list of spaces and rooms, conversation, composer; the room list becomes a sheet on phones) · Notifications ·
Your account (name, password, blocked people, decisions and appeals, deletion) · Moderation console · Admin console
(Overview, People and roles, Spaces and rooms, Appeals, Audit log).

### Accessibility
Keyboard-operable dialogs that trap focus and return it; labelled controls; a live region for new messages; focus outlines;
status shown with words and icons, not colour alone; no sideways scrolling at 390px wide. Not yet tested with a screen reader.

---

## 8. Files

### Changed (6 existing files)
| File | Change |
| --- | --- |
| `apps/web/components/landing/Navbar.tsx` | One link: Community |
| `apps/web/components/landing/Footer.tsx` | One link: Community |
| `apps/web/.env.example` | Adds `NEXT_PUBLIC_COMMUNITY_API_URL` |
| `docker-compose.yml` | Adds the `community-db` PostgreSQL container. MongoDB is untouched |
| `package.json` | Adds `dev:community` and `test:community`; includes the service in `dev`, `dev:services` and `start`; `build` also builds it |
| `pnpm-lock.yaml` | Regenerated. Adds the new service's packages. One existing change: `zod` moved from 4.3.6 to 4.6.7 (same major version), shared with the service. Review this in the pull request |

No existing page, component or API route was otherwise modified.

### Added
- `services/community/` (69 files): the service, SQL migrations, data lists, tests, a browser test and a README.
- `apps/web/app/community/` : entry, `join`, `onboarding`, and a signed-in group `(app)` containing the room page,
  `account`, `notifications`, `moderation` and `admin`.
- `apps/web/components/community/` : room list, messages, composer, dialogs, avatar, quick exit, and `mod/` and `admin/` screens.
- `apps/web/lib/community/` : API client, WebSocket client, session provider, copy, types and formatters.
- `docs/community.md` : this document.

---

## 9. How it was checked

**Service: 97 automated tests, all passing**, against a real PostgreSQL database and real WebSocket connections. They cover
sign-up and sign-in, lockout, sessions, request protection, every rule about who can write where, the safety checks,
replies, mentions, reactions, blocking, editing and deleting, live delivery, the full report-to-outcome path, roles, appeals,
the audit log, cleanup jobs and rate limiting. The service also compiles and runs as a built process (`pnpm build`, then start).

**Web: type-checked, linted (no findings in the new code) and built.** The full app builds and all eight Community routes are present.

**Interface: a 45-check browser test** drove the real screens with several simulated people: entry page, Leave quickly
(button and triple Escape), sign-up and recovery phrase, onboarding, a live two-person conversation, replies, reactions,
cooldown, the personal-details prompt, the support card, reporting, the moderator console (blur, claim, hide, live effect on
the author's screen), the admin console, a suspended member and their appeal, a phone-sized screen, and signing in again.

### Problems found by testing and fixed
- A request loop in the web app (about 800 requests a minute) caused by unstable helper functions in the session provider. Found by the browser test, not the unit tests. A check that idle screens stay quiet now guards against it.
- Half of all avatars were blank because of a signed-shift bug in the hash code. Found by looking at screenshots.
- A race where messages sent the instant a WebSocket opened could be dropped by the server. Regression test added.
- `PATCH` on a room would have reset its other settings to defaults (a schema-default trap). Fixed and tested.
- Request logs were recording client IP addresses, contradicting the privacy promise. Removed.
- Deleting a second account could have collided on the unique-name index. Fixed and tested.
- Smaller items: a duplicate bell icon, an always-visible "opening gradually" notice, a wrapped "Leave quickly" button on phones, small touch targets.

### Not verified (please do not assume it works)
- **`docker compose up community-db`** was not run (no Docker here). The compose file is valid YAML and the service was tested against a PostgreSQL 16 server installed directly.
- **The Caddy example** and any production HTTPS setup were not tested.
- **The web build was made with the Google Fonts calls temporarily stubbed**, because this environment cannot reach Google. Your `layout.tsx` was restored byte for byte. In a normal environment `next build` fetches the fonts as before.
- **Next.js 16 documentation** referenced by `AGENTS.md` was not present in the installed package, so only conservative features were used (client components, no middleware or `proxy.ts`).
- **`next dev`** was not run; the production build (`next start`) was.
- **Load, many instances, screen readers, Safari/Firefox, and a real phone** were not tested. Chromium only.
- **Intel Macs** may need a C toolchain for `argon2`, which ships prebuilt binaries for Linux, Windows and Apple Silicon.

---

## 10. Before opening to the public

These need people, not code.

1. **Moderators.** At least two trained moderators active whenever rooms are open. Until then leave `COMMUNITY_OPEN=false`.
2. **Review the wording.** The four rules, the pinned notes, the report reasons and the crisis wording list (`services/community/data/crisis-terms.json`)
   should be reviewed by a counsellor, an NGO or a helpline partner.
3. **Helplines.** `HELPLINES` in `apps/web/lib/community/copy.ts` is **empty on purpose**. Add numbers only after verifying each one.
4. **Legal review** of the age gate, retention periods and the DPDP Act position.
5. **Translate** `copy.ts` with someone who understands the subject. Decide whether rooms per language are needed (rooms already carry a language field).
6. **Change the database password**, serve over HTTPS, set `COOKIE_SECURE=true`.

## 11. Known limits

- **No end-to-end encryption.** The server and anyone with database access can read messages; moderation depends on it. The interface says so.
- **Ban evasion is easy.** With no email, a banned person can create a new account. New-account limits (no links for 7 days, cooldown, optional room age limits) reduce the damage but cannot prevent it.
- A lost recovery phrase means a lost account.
- Peers are not professionals. The interface says plainly that nothing here is legal, medical or mental health advice.
- Anonymity also depends on the person. Writing identifying details can still identify them; the prompt reduces this but cannot remove it.
- The automatic checks will miss things and sometimes block innocent text. Moderators and appeals exist for that reason.
- Thresholds and word lists were written without real conversations to test against. Expect to adjust them after a small pilot.
- Existing routes in the main web app are unauthenticated (for example, deleting a case by its id). This work did not change them, but they should be fixed separately.
