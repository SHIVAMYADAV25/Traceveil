<p align="center">
  <img src="apps/web/public/logo.png" alt="Traceveil" width="64" height="64" />
</p>

<h1 align="center">Traceveil</h1>

<p align="center">
  <strong>Open-source support, leak discovery and takedown platform for victims of non-consensual intimate imagery (NCII)</strong>
</p>

<p align="center">
  Upload one image. Scan known high-risk domains. Get ready-to-send removal requests. Talk to someone who will listen.
</p>

---

## Table of contents

1. [What is Traceveil?](#1-what-is-traceveil)
2. [Feature overview](#2-feature-overview)
3. [System architecture](#3-system-architecture)
4. [Repository layout](#4-repository-layout)
5. [Frontend structure (`apps/web`)](#5-frontend-structure-appsweb)
6. [UI design system](#6-ui-design-system)
7. [Services](#7-services)
8. [Data stores](#8-data-stores)
9. [Local setup](#9-local-setup)
10. [Environment variables](#10-environment-variables)
11. [Ports and API endpoints](#11-ports-and-api-endpoints)
12. [Testing](#12-testing)
13. [Privacy and safety principles](#13-privacy-and-safety-principles)
14. [Renaming note (Sniffer → Traceveil)](#14-renaming-note-sniffer--traceveil)
15. [Further reading](#15-further-reading)

---

## 1. What is Traceveil?

Once intimate content is leaked it spreads across websites, mirror networks and CDNs within hours. A victim has to
find each copy, document it, work out who hosts it and file a separate takedown request per platform, each with
different forms and contacts. That takes hours per case, and most people never find every copy.

Traceveil automates the response workflow and pairs it with human support:

1. **Upload** one reference image or video (a private case; nothing is shared without permission).
2. **Fingerprint** it with a multi-tier perceptual matching engine.
3. **Scan** pre-indexed high-risk domains and mirror networks.
4. **Collect evidence**: URLs, hashes, CDN/hosting info, timestamps.
5. **Take down**: generate platform-specific DMCA / abuse requests.
6. **Get support**: helplines, counsellors, an anonymous moderated community, books and audio.

## 2. Feature overview

| Area | What it does |
|------|--------------|
| **Matching engine** | pHash (DCT) for exact/resized/recompressed copies, ORB keypoints for crops/watermarks/rotation, HSV histogram for brightness/filter edits |
| **Forensic analysis pipeline** | C2PA check, AI-generation detection, ELA, DCT, noise, colour, SSIM, ORB keypoints, hashing, heatmap, scoring, plain-language explanation, signal table, audit trail |
| **Video support** | Frame-sampled matching for video leaks (see `docs/VIDEO_FEATURE.md`) |
| **Domain discovery** | Scans indexed domains in parallel with network-safety limits (`netguard`) |
| **Infrastructure intelligence** | Domain → CDN / hosting / mirror-network mapping (`services/intelligence`) |
| **Takedown guidance** | Domain → removal contacts, forms and templates, with live-scrape fallback (`services/takedown`) |
| **Evidence reports** | Case report with hashes, confidence scores, timestamps and case references |
| **Dashboard** | Case metrics, activity heatmap, threat timeline, platform distribution |
| **AI analyst** | Streaming assistant for case questions (Groq, `/api/analyst`) |
| **Support hub** | Helplines, counsellors, books and music, quick-exit button (`/support`) |
| **Community** | Anonymous, text-only, moderated rooms with reports, appeals and admin tools (`services/community`) |
| **Multilingual UI** | English plus Indian languages via `LanguageProvider` |
| **Resources** | MDX blog on image forensics, deepfakes, C2PA, EXIF |

### Matching tiers

```
┌──────────────┬──────────────────┬───────────────────────┐
│    pHash     │   ORB Features   │   HSV Histogram       │
│    (DCT)     │   (Keypoints)    │   (Colour dist.)      │
├──────────────┼──────────────────┼───────────────────────┤
│ Exact copies │ Cropped images   │ Brightness edits      │
│ Resized      │ Watermarked      │ Filter changes        │
│ Recompressed │ Rotated          │ Contrast manipulation │
└──────────────┴──────────────────┴───────────────────────┘
```

## 3. System architecture

```
                         ┌──────────────────────────────┐
                         │          Browser             │
                         └──────────────┬───────────────┘
                                        │
                         ┌──────────────▼───────────────┐
                         │  apps/web  (Next.js 16)      │  :3000 dev / :3001 prod
                         │  pages + API routes + auth   │
                         └───┬────────┬────────┬────┬───┘
            proxy / REST     │        │        │    │ direct (cookies)
        ┌────────────────────▼─┐ ┌────▼─────┐ ┌▼────▼─────┐ ┌──────────────────┐
        │ analysis   (FastAPI) │ │ intel.   │ │ takedown  │ │ community        │
        │ :8000                │ │ :8002    │ │ :8003     │ │ (Fastify) :8004  │
        └──────────┬───────────┘ └────┬─────┘ └─────┬─────┘ └────────┬─────────┘
                   │                  │             │                │
             case store / files   CSV datasets  CSV datasets    PostgreSQL :5433
                                                                (own database)
                   ┌───────────────────────┐
  apps/web ───────▶│ MongoDB :27017        │  cases, claim events, users/sessions
                   └───────────────────────┘
```

Key decisions

- **Monorepo** (pnpm workspaces: `apps/*`, `services/*`). Every service has a `package.json` so one root
  command can start them all.
- **Separation of concerns**: analysis, intelligence, takedown and community are independent services. The
  community service has its **own PostgreSQL database, credentials and env file**; nothing is shared with the web
  app or other services.
- **Next.js as gateway**: browser calls go to `app/api/*`, which proxy to the Python services, so service URLs
  stay server-side.
- **Datasets as CSV** for intelligence and takedown, loaded at start-up (`engine/loader.py`).
- **Report workflow state** lives in `ReportWorkflowContext` (React Context) on the client; persisted cases in MongoDB.

Detailed diagrams, the 14-step analysis pipeline, data flow and a production-readiness audit are in
[`architecture-context.md`](architecture-context.md) and [`docs/architecture-and-roadmap.md`](docs/architecture-and-roadmap.md).

## 4. Repository layout

```
Traceveil/
├── apps/
│   └── web/                      Next.js frontend, API routes, auth
├── services/
│   ├── analysis/                 FastAPI: cases, forensic pipeline, discovery, registry, dashboard
│   ├── intelligence/             FastAPI: domain → CDN/hosting intelligence
│   ├── takedown/                 FastAPI: domain → removal guidance
│   └── community/                Fastify + PostgreSQL: anonymous rooms, moderation, realtime
├── docs/                         Architecture, video feature, community and support design docs
├── scripts/                      setup-python-venv.cjs, run-service.cjs
├── docker-compose.yml            MongoDB + community PostgreSQL
├── architecture-context.md       Full system diagram and production roadmap
└── pnpm-workspace.yaml
```

## 5. Frontend structure (`apps/web`)

```
apps/web/
├── app/                          Routes (App Router)
│   ├── page.tsx                  "/" → <LandingPage />
│   ├── leak/  report/[caseId]/  investigate/  takedown/  dashboard/
│   ├── support/  community/  resources/  how-it-works/  supported-platforms/  pricing/  pitch/
│   ├── auth/                     sign-in, error, verify-request
│   └── api/                      cases, analyst, dashboard, intelligence, takedown, monitor, claim, auth
│
├── components/
│   ├── landing/                  ★ Public landing page (see below)
│   ├── layout/                   Site-wide Navbar + Footer (used by inner marketing pages)
│   ├── legacy/landing/           Previous landing sections, no longer routed (safe to delete)
│   ├── report/                   Report workflow (ContentTrace, LeakActionConsole, HashDisplay …)
│   ├── dashboard/                Charts and monitoring widgets
│   ├── support/                  Support hub cards, tabs, illustrations, quick exit
│   ├── community/                Chat UI, composer, moderation + admin components
│   ├── blog/  upload/  auth/  i18n/
│   └── ui/                       shadcn/ui primitives (button, card, dialog, input …)
│
├── content/
│   ├── landing/index.ts          ★ All landing copy and data
│   ├── blog/                     MDX articles
│   └── support/                  Support hub data (helplines, own spaces, Discord URL)
│
├── lib/                          mongodb.ts, translations.ts, url.ts, utils.ts, community client …
├── providers/                    LenisProvider (smooth scroll)
└── public/                       landing/ images, supported-platforms/ logos, logo.png
```

### Landing page structure

The landing page is split by responsibility: **copy** (`content/landing`), **building blocks**
(`primitives`), **page chrome** (`layout`), **page sections** (`sections`) and **composition**
(`LandingPage.tsx`).

```
components/landing/
├── LandingPage.tsx               Composition only: lists sections in page order
├── landing.css                   Tokens + all styles, namespaced `tv-` and scoped under `.tv-p`
├── fonts.ts                      Poppins loader (--font-poppins)
├── index.ts
├── primitives/                   Reusable, content-free building blocks
│   ├── Container.tsx             1160px centred wrapper
│   ├── Section.tsx               variants: default | hero | spaced | band
│   ├── SectionHeading.tsx        h2 + bold highlight + optional lead
│   ├── PillButton.tsx            Link / anchor / external-link aware button
│   ├── Chip.tsx   Card.tsx   TickItem.tsx   Illustration.tsx
├── layout/
│   ├── LandingNav.tsx   LandingFooter.tsx   BrandMark.tsx
└── sections/                     One file per page section
    ├── HeroSection            ├── PrivacySection        ├── PartnersSection
    ├── AboutSection (#what)   ├── TakedownSection       ├── FinalCtaSection
    ├── AudienceSection (#who) ├── SupportSection        ├── MinorsNotice
    ├── HowItWorksSection (#how) └── CommunitySection    └── FaqSection (#faq)
```

Conventions

- **Edit text in `content/landing/index.ts`**, not in components.
- **Add a section**: create `sections/MySection.tsx`, export it from `sections/index.ts`, add it to `LandingPage.tsx`.
- Use primitives (`Section`, `Card`, `PillButton` …) instead of raw markup so spacing and tones stay consistent.
- Internal routes (`/…`) render `next/link`; `#anchors` and external URLs render plain anchors (external opens in a new tab).
- Imports use the `@/` alias (root of `apps/web`).

## 6. UI design system

The landing page and the support/community surfaces share a **warm, calm, non-clinical** look. It should feel
safe, never alarming.

| Token | Value | Use |
|-------|-------|-----|
| `--tv-bg` | `#FDFAF4` | Page background (cream) |
| `--tv-band` | `#F6F1E7` | Full-bleed tinted strip |
| `--tv-ink` | `#1F2430` | Text, dark buttons |
| `--tv-muted` | `#565B66` | Secondary text |
| `--tv-line` | `#EADFD2` | Borders |
| `--tv-coral` | `#B8472B` | Accent text, links |
| `--tv-green` | `#7A9B7E` | Tick bullets |
| Card tones | pink `#FBE3DD` · mint `#E8EFE0` · blue `#E4EAF4` · orange `#FDEBD9` | Pastel cards (`tone` prop) |

- **Typography**: Poppins (300/400/500/600) on the landing page. Light-weight headings (`h1` 54px, `h2` 36px) with
  one **bold** highlighted word. Product pages use Inter / Geist via `app/layout.tsx`.
- **Shape**: 24px card radius, fully rounded pills and chips.
- **Layout**: 1160px container, 28px gutters, 2-column `tv-row` for text + illustration, 2/3/4-column grids
  that collapse to one column below 860px.
- **Illustrations**: friendly people artwork in `public/landing/` (diverse, no distressing imagery).
- **Product pages** use a separate warm-stone palette defined in `app/globals.css` (`canvas`, `paper`, `sand`,
  `line`, `ink`, `brand` …) on top of Tailwind v4 and shadcn/ui.
- **Safety UX**: a quick-exit button on support and community pages, plain-language wording, no account required,
  nothing alarming above the fold.
- **Accessibility**: semantic landmarks (`main`, `nav`, `footer`), alt text on every image, native `<details>` FAQ,
  visible link text, 48px tap targets on primary buttons.

## 7. Services

| Service | Stack | Responsibility |
|---------|-------|----------------|
| `services/analysis` | Python, FastAPI, OpenCV, NumPy, Pillow | Cases, forensic pipeline, perceptual matching, discovery crawl, video, registry, dashboard stats |
| `services/intelligence` | Python, FastAPI | Domain → CDN / hosting network lookup from CSV |
| `services/takedown` | Python, FastAPI | Domain → removal contacts/guidance, notice submission, live-scrape fallback |
| `services/community` | Node, Fastify, PostgreSQL, WebSocket | Anonymous accounts, rooms, messages, reports, appeals, moderation, notifications, safety guards (crisis, PII, links) |

Analysis engine modules live in `services/analysis/engine/` (`pipeline.py`, `hashing.py`, `matching.py`, `ela.py`,
`dct.py`, `keypoints.py`, `heatmap.py`, `scoring.py`, `video.py`, `discovery.py`, `netguard.py`, `store.py` …).

## 8. Data stores

| Store | Used by | Notes |
|-------|---------|-------|
| MongoDB (`traceveilX`) | Web app | Cases, claim events/metrics, auth adapter. Started by `docker-compose.yml` |
| PostgreSQL (`community`) | Community service | Separate container, port `5433`, no shared users or credentials |
| CSV datasets | Intelligence, takedown | `services/*/data/dataset.csv` |
| Local data dir | Analysis | `TRACEVEIL_DATA_DIR`, retention via `TRACEVEIL_RETENTION_DAYS` |

## 9. Local setup

**Prerequisites**: Node.js 20+, pnpm 9+, Python 3.11+, Docker (for MongoDB / PostgreSQL).

```bash
# 1. Clone and install JS dependencies
git clone https://github.com/SHIVAMYADAV25/Traceveil.git
cd Traceveil
pnpm install

# 2. Python virtualenv for the three FastAPI services
pnpm install:py          # runs scripts/setup-python-venv.cjs
#   or manually:
#   cd services && python -m venv .venv && source .venv/bin/activate
#   pip install -r analysis/requirements.txt -r intelligence/requirements.txt -r takedown/requirements.txt

# 3. Databases
docker compose up -d     # MongoDB :27017 and community PostgreSQL :5433

# 4. Environment
cp apps/web/.env.example apps/web/.env.local
cp services/community/.env.example services/community/.env
cp services/analysis/.env.example services/analysis/.env   # optional

# 5. Community database (first run only)
pnpm --filter @traceveil/community migrate
pnpm --filter @traceveil/community seed

# 6. Run
pnpm dev                 # web + analysis + intelligence + takedown
pnpm dev:community       # community service (separate terminal)
```

Open http://localhost:3000. Try the demo at http://localhost:3000/leak?demo=1.

Useful scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Web + analysis + intelligence + takedown |
| `pnpm dev:web` / `dev:api` / `dev:intel` / `dev:takedown` / `dev:community` | Run a single piece |
| `pnpm build` / `pnpm start` | Production build and run |
| `pnpm lint` | ESLint for the web app |
| `pnpm test:community` | Community service tests |

## 10. Environment variables

**`apps/web/.env.local`**

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection (default `mongodb://127.0.0.1:27017/traceveilX`) |
| `NEXT_PUBLIC_API_URL` | Analysis API (`http://localhost:8000`) |
| `INTELLIGENCE_SERVICE_URL` | Intelligence API (`http://localhost:8002`) |
| `TAKEDOWN_SERVICE_URL` | Takedown API (`http://localhost:8003`) |
| `NEXT_PUBLIC_COMMUNITY_API_URL` | Community API (`http://localhost:8004/api/community`) |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | Auth.js (generate secret with `openssl rand -base64 32`) |
| `EMAIL_SERVER_*`, `EMAIL_FROM` | Optional magic-link email |

**`services/analysis`** (all optional): `TRACEVEIL_DEMO_MODE`, `TRACEVEIL_DATA_DIR`, `TRACEVEIL_RETENTION_DAYS`,
`TRACEVEIL_NETGUARD`, `TRACEVEIL_SCAN_TIMEOUT_SECONDS`, `TRACEVEIL_MAX_CONCURRENT_SCANS`,
`TRACEVEIL_MAX_PAGES_PER_DOMAIN`, `TRACEVEIL_MAX_ASSETS_PER_PAGE`, `TRACEVEIL_MAX_TOTAL_CANDIDATES`,
`TRACEVEIL_VERIFY_VIDEO`, `TRACEVEIL_VERIFY_MAX_CANDIDATES`, `TRACEVEIL_VERIFY_MAX_BYTES`,
`TRACEVEIL_MAX_VIDEO_SECONDS`, `TRACEVEIL_MAX_VIDEO_MB`, `TRACEVEIL_MAX_CONCURRENT_VIDEO_SCANS`, `HF_TOKEN`.

**`services/community`**: `COMMUNITY_PORT`, `DATABASE_URL`, `ALLOWED_ORIGINS`, `COOKIE_SECURE`, `TRUST_PROXY`,
`COMMUNITY_OPEN`, `SESSION_DAYS`, `RETENTION_DAYS`, `RATE_LIMIT_ENABLED`, `REGISTER_LIMIT_PER_HOUR`.

> Never commit real secrets. `apps/web/.env.production` should contain build-time placeholders only.

## 11. Ports and API endpoints

| Service | Port |
|---------|------|
| Web (dev / production) | 3000 / 3001 |
| Analysis API | 8000 |
| Intelligence API | 8002 |
| Takedown API | 8003 |
| Community API | 8004 |
| MongoDB / community PostgreSQL | 27017 / 5433 |

**Analysis (`:8000`)**: `POST /api/cases/` · `GET /api/cases/{case_id}` · `POST /api/analysis/{case_id}/run` ·
`GET /api/analysis/{case_id}/discover` · `POST /api/registry/` · `GET /api/dashboard/`

**Intelligence (`:8002`)**: `GET /api/v1/intelligence/{domain}` · `GET /api/v1/intelligence/`

**Takedown (`:8003`)**: `GET /api/v1/takedown/{domain}` · `GET /api/v1/takedown/`

**Web API routes** (`apps/web/app/api`): `cases/[caseId]`, `cases/save`, `user/cases`, `dashboard/overview`,
`intelligence/[domain]`, `takedown/[domain]`, `monitor/status`, `claim/track`, `analyst`, `auth/[...nextauth]`.

## 12. Testing

```bash
pnpm test:community                       # Vitest (auth, messages, moderation, admin, realtime, safety)
cd services/analysis && pytest            # API, discovery, video, netguard/store
```

## 13. Privacy and safety principles

- No account or email needed to get help; community uses a nickname only.
- Uploaded images are not stored; cases use anonymous IDs.
- Community is anonymous and text-only, with crisis-term, PII and link guards.
- Discovery crawler is bounded by `netguard` (timeouts, page/asset caps, concurrency limits).
- Traceveil prepares requests and guides the user; **removal is decided by each platform and is never guaranteed**.
- Under-18 users are pointed to Childline (1098) and NCMEC Take It Down; adults can also use StopNCII.org.

## 14. Renaming note (Sniffer → Traceveil)

The project was originally named **Sniffer**. All internal names were changed:

| Old | New |
|-----|-----|
| `@sniffer/*` workspace packages | `@traceveil/*` |
| `SNIFFER_*` environment variables | `TRACEVEIL_*` |
| MongoDB database `snifferX` | `traceveilX` |
| `sniffer_lang`, `sniffer-locale`, `sniffer_support_case` browser keys | `traceveil_*` |
| `public/sniffer-arch.png` | `public/traceveil-arch.png` |
| Docker containers `sniffer-*` | `traceveil-*` |

Migration notes: rename any existing `SNIFFER_*` variables in your `.env` files; existing data in `snifferX` must be
migrated (e.g. `mongodump` / `mongorestore --nsFrom 'snifferX.*' --nsTo 'traceveilX.*'`) or the old name set in
`MONGODB_URI`. The hosted domain (`sniffer.impiclabs.com`), GitHub repo URL and Vercel origin were intentionally
**left unchanged** because they point at real deployed resources; update them when the new domain/repo exists.

## 15. Further reading

- [`architecture-context.md`](architecture-context.md): full diagram, data flow, auth, production gaps
- [`docs/architecture-and-roadmap.md`](docs/architecture-and-roadmap.md): audit and phased roadmap
- [`docs/VIDEO_FEATURE.md`](docs/VIDEO_FEATURE.md), [`docs/IMAGE_FIXES_AND_VIDEO_ARCHITECTURE.md`](docs/IMAGE_FIXES_AND_VIDEO_ARCHITECTURE.md)
- [`docs/community.md`](docs/community.md), [`docs/community-v2.md`](docs/community-v2.md)
- [`docs/support-pages.md`](docs/support-pages.md), [`docs/support-pages-v2.md`](docs/support-pages-v2.md)
- [`services/analysis/README.md`](services/analysis/README.md), [`services/community/README.md`](services/community/README.md)

---

<p align="center">
  <strong>HACKVERSE 2026</strong> · Built by <a href="https://github.com/SHIVAMYADAV25/Traceveil">Impic Labs</a>
</p>
