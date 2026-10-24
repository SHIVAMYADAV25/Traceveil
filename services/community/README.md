# Community service

Anonymous, moderated group rooms for people affected by non-consensual intimate imagery.
A separate Node.js service with **its own PostgreSQL database**. It shares no code, database,
login or credentials with the rest of Traceveil.

Design reasons and the full feature list are in [`docs/community.md`](../../docs/community.md).
This file is about running and operating the service.

## What it is

- TypeScript on Node 20+, Fastify 5, `ws` WebSockets, `pg`, `zod`, `argon2`
- Port **8004**, all routes under `/api/community`, WebSocket at `/api/community/ws`
- Group rooms only: no direct messages, no images, no video, no files, no link previews
- Roles: `member`, `verified_helper` (a badge), `moderator`, `admin`

## Run it

```bash
docker compose up -d community-db        # from the repo root: PostgreSQL on port 5433
cd services/community
cp .env.example .env                     # defaults match docker-compose.yml
pnpm install                             # from the repo root: updates pnpm-lock.yaml
pnpm migrate                             # creates the tables
pnpm seed                                # 6 spaces and 20 rooms. Safe to run again
pnpm dev                                 # http://localhost:8004/health
```

Or from the repo root: `pnpm dev` starts the web app and every service, including this one.

Make the first admin (sign up in the app first, then use the handle you were given):

```bash
pnpm promote -- quiet-heron-1234 admin
```

Roles after that are changed by an admin in the app. Every change is written to the audit log.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | none (required) | PostgreSQL connection string |
| `COMMUNITY_PORT` | 8004 | |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated origins allowed to call the API and open WebSockets |
| `COOKIE_SECURE` | false | **Must be true in production** (the service refuses to start otherwise) |
| `TRUST_PROXY` | false | True only behind a trusted reverse proxy |
| `COMMUNITY_OPEN` | **false** | While false, members cannot write in chat rooms. Announcements and the quiet room stay readable |
| `SESSION_DAYS` | 14 | |
| `RETENTION_DAYS` | 30 | Messages are deleted this long after they are written |
| `RATE_LIMIT_ENABLED` | true | |
| `REGISTER_LIMIT_PER_HOUR` | 5 | New sign-ups per hour from one address. Raise it for an office or shelter helping several people |

`COMMUNITY_OPEN` defaults to **false on purpose**. Do not open conversation rooms until the launch
conditions in `docs/community.md` are met (trained moderators, reviewed rules and crisis wording).

## Scripts

| Script | Does |
| --- | --- |
| `pnpm dev` | Run with reload |
| `pnpm build` / `pnpm start` | Compile to `dist/` and run it |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | 97 tests against a real PostgreSQL database (see below) |
| `pnpm migrate` | Apply pending SQL files in `migrations/`. An applied file must never be edited; add a new one |
| `pnpm seed` | Create the starting spaces and rooms. Existing ones are left as admins changed them |
| `pnpm promote -- <handle> <role>` | Set an account's role from the command line (audited) |

## Tests

The tests use a **real PostgreSQL database** and real WebSocket connections, not mocks. They wipe
accounts, messages and reports in that database, so point them at a throwaway one:

```bash
createdb community_test      # or any empty database
TEST_DATABASE_URL=postgresql://community:community_dev@localhost:5432/community_test pnpm test
```

Without `TEST_DATABASE_URL` they use `community_test` on `localhost:5432`.

A separate browser test of the real screens is in [`e2e/community_ui.e2e.py`](e2e/community_ui.e2e.py)
(Python and Playwright; its header explains how to run it). Run it against a test database only.

## Production notes

- Put it behind HTTPS and route one path on your domain to it, so the browser talks to the same
  origin and the session cookie is `HttpOnly`, `Secure`, `SameSite=Lax`. With Caddy this looks like
  the example below (not tested in this repository; Caddy forwards WebSocket upgrades on its own):

  ```
  example.org {
      handle /api/community/* {
          reverse_proxy localhost:8004
      }
      handle {
          reverse_proxy localhost:3000
      }
  }
  ```

  Then set `NEXT_PUBLIC_COMMUNITY_API_URL=/api/community` for the web build, and
  `ALLOWED_ORIGINS`, `COOKIE_SECURE=true` and `TRUST_PROXY=true` for the service.
- Run **one instance**. Live connections are held in memory (`src/realtime/hub.ts`). To scale out,
  implement the small `Realtime` interface in that file on top of Redis pub/sub. No module needs to change.
- Change the database password from the development value, and back up the database. Backups contain
  messages until they expire, so encrypt them and expire them.
- Logs hold only the request method, path (without query string) and status. Never IP addresses,
  cookies or message text. Keep it that way if you change the logger.
- Cleanup (expired messages, ended restrictions, old report snapshots, sessions, old notifications)
  runs when the service starts and every 10 minutes after.

## Layout

```
services/community/
  migrations/            SQL files, applied in order, checksummed
  data/                  blocked-domains.txt, crisis-terms.json (standalone, reviewed by people)
  src/
    config/              environment and constants
    db/                  pool, migration runner, seed data
    plugins/             security (origin and client-header checks), auth/roles, errors
    modules/             one folder per feature: auth, spaces, messages, reactions, blocks,
                         notifications, reports, moderation, appeals, admin
    realtime/            hub (in-memory), WebSocket route, event types
    safety/              link, personal-detail and crisis-language checks
    jobs/                cleanup
    scripts/             promote
  tests/                 unit, integration and WebSocket tests
  e2e/                   browser test (Python)
```

Modules use `routes.ts` (HTTP), `service.ts` (rules) and `repo.ts` (SQL) where a feature has enough
logic to need them. Small features keep everything in `routes.ts`.
