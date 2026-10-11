# Sniffer — Architecture Context & Production Roadmap

Digital media authenticity verification and takedown intelligence platform.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Frontend Layer](#2-frontend-layer)
3. [API Gateway Layer (Next.js)](#3-api-gateway-layer-nextjs)
4. [Microservices Layer](#4-microservices-layer)
5. [Data Flow: 3-Step Report Workflow](#5-data-flow-3-step-report-workflow)
6. [State Management](#6-state-management)
7. [Database](#7-database)
8. [Auth](#8-auth)
9. [External Integrations](#9-external-integrations)
10. [Key Architectural Decisions](#10-key-architectural-decisions)
11. [Production Readiness Audit](#11-production-readiness-audit)
12. [Phased Production Roadmap](#12-phased-production-roadmap)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          🖥️ CLIENT (Browser)                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Next.js 16 App — App Router (React 19 / TypeScript / Tailwind v4)│  │
│  │                                                                   │  │
│  │  Pages:                                                           │  │
│  │  ─ / .................... Landing (9 sections)                    │  │
│  │  ─ /start .............. Investigation type selector              │  │
│  │  ─ /verify/upload ...... Deepfake analysis image upload           │  │
│  │  ─ /leak/upload ........ NCII case image upload                   │  │
│  │  ─ /report/[caseId]/analysis .... Step 1: Forensic analysis       │  │
│  │  ─ /report/[caseId]/distribution . Step 2: Distribution trace     │  │
│  │  ─ /report/[caseId]/takedown ..... Step 3: Takedown action        │  │
│  │  ─ /investigate ........ Domain investigation lookup              │  │
│  │  ─ /takedown ............ Takedown (guided / bulk / standalone)   │  │
│  │  ─ /protect ............. Image fingerprint registry              │  │
│  │  ─ /dashboard ........... Case monitoring dashboard               │  │
│  │  ─ /how-it-works ........ Marketing page                          │  │
│  │  ─ /supported-platforms .. Platform listing                       │  │
│  │  ─ /resources/[slug] .... MDX blog/resources                     │  │
│  │                                                                   │  │
│  │  State: ReportWorkflowContext (React Context)                     │  │
│  │         LanguageProvider (i18n: 8 languages)                      │  │
│  │                                                                   │  │
│  │  UI: shadcn/ui (Radix Nova) + framer-motion + Lenis (smooth scroll)│ │
│  │  Icons: @tabler/icons-react, lucide-react                        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────┬─────────────────────────────────┘
                                         │ HTTP
                                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     🌐 NEXT.JS API GATEWAY LAYER (:3000)                 │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Internal API Routes (gateway to services + DB)                   │  │
│  │                                                                   │  │
│  │  /api/cases/[caseId]  ────► GET: MongoDB → fallback Analysis API  │  │
│  │  /api/cases/save      ────► POST: Save case to MongoDB            │  │
│  │  /api/user/cases      ────► GET/DELETE: User case CRUD            │  │
│  │  /api/dashboard/overview  ──► MongoDB aggregation → fallback demo │  │
│  │  /api/claim/track     ────► GET/POST: Lifecycle event recording   │  │
│  │  /api/analyst         ────► POST: Groq LLM streaming chat         │  │
│  │  /api/monitor/status  ────► GET: Static demo telemetry (mock)     │  │
│  │  /api/intelligence/[domain] ──► Proxy → Intel Service (:8002)     │  │
│  │  /api/takedown/[domain]    ──► Proxy → Takedown Service (:8003)   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Database: MongoDB (lib/mongodb.ts — singleton connection)              │
│  Auth: NextAuth v5 beta — stub returning null (disabled)               │
└─────────────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  🔬 ANALYSIS    │  │  🕵️ INTELLIGENCE│  │  ⚖️  TAKEDOWN   │
│  FastAPI :8000   │  │  FastAPI :8002   │  │  FastAPI :8003   │
│                 │  │                 │  │                 │
│  14-step pipe-  │  │  Domain→CDN/    │  │  Domain→removal │
│  line:          │  │  network mapping│  │  guidance from  │
│                 │  │  from CSV       │  │  CSV + live     │
│  1. C2PA check  │  │  datasets       │  │  scrape fallback│
│  2. AI detection│  │                 │  │                 │
│  3. ELA         │  │  Endpoints:     │  │  Endpoints:     │
│  4. DCT         │  │  GET /{domain}  │  │  GET /{domain}  │
│  5. Noise       │  │  GET /{domain}/ │  │  POST /{domain}/│
│  6. Color hist  │  │    details      │  │    submit       │
│  7. SSIM        │  │  GET /providers │  │  GET / (stats)  │
│  8. ORB keypts  │  │  GET / (stats)  │  │                 │
│  9. Hashing     │  │                 │  │  Data:          │
│ 10. Heatmap     │  │  Data:          │  │  118 domains    │
│ 11. Score calc  │  │  138 domains    │  │  in-memory CSV  │
│ 12. Explanation │  │  in-memory CSV  │  │                 │
│ 13. Signal table│  │                 │  │                 │
│ 14. Audit trail │  │  ⚠️ In-memory   │  │  ⚠️ In-memory   │
│                 │  │    dict storage │  │    dict storage │
│  ⚠️ In-memory   │  │                 │  │                 │
│    dict storage │  │                 │  │                 │
│                 │  │                 │  │                 │
│  ML: HuggingFace│  │                 │  │                 │
│  Detector +     │  │                 │  │                 │
│  scikit-image   │  │                 │  │                 │
│  + opencv       │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 2. Frontend Layer

### Pages & Routes

| Route | Page Component | Description |
|-------|---------------|-------------|
| `/` | `app/page.tsx` | Landing page — 9 sections: Navbar, Hero, Problem, HowItWorks, Features, ReportPreview, Audience, CTA, Footer |
| `/start` | `app/start/page.tsx` | Investigation type selector (Deepfake/AI, NCII Leak, Screenshot) |
| `/verify` | — | Redirects to `/verify/upload` |
| `/verify/upload` | `app/verify/upload/page.tsx` | Upload suspicious image for deepfake analysis |
| `/leak` | `app/leak/page.tsx` | NCII case creation — select source platform |
| `/leak/upload` | `app/leak/upload/page.tsx` | Upload image for NCII case |
| `/report/[caseId]` | — | Redirects to `/report/[caseId]/analysis` |
| `/report/[caseId]/analysis` | `app/report/[caseId]/analysis/page.tsx` | Step 1: Forensic analysis (polling results, evidence display) |
| `/report/[caseId]/distribution` | `app/report/[caseId]/distribution/page.tsx` | Step 2: Distribution network trace |
| `/report/[caseId]/takedown` | `app/report/[caseId]/takedown/page.tsx` | Step 3: Takedown guidance & action |
| `/investigate` | `app/investigate/page.tsx` | Domain investigation lookup (standalone Step 2) |
| `/takedown` | `app/takedown/page.tsx` | Takedown (guided, bulk, or standalone modes) |
| `/protect` | `app/protect/page.tsx` | Image fingerprint registry — upload originals |
| `/dashboard` | `app/dashboard/page.tsx` | Case monitoring dashboard with metrics, activity stream, lifecycle |
| `/how-it-works` | `app/how-it-works/page.tsx` | Marketing page |
| `/supported-platforms` | `app/supported-platforms/page.tsx` | Supported platforms listing |
| `/resources` | `app/resources/page.tsx` | Resources listing |
| `/resources/[slug]` | `app/resources/[slug]/page.tsx` | Individual resource/article (MDX-based) |
| `/auth/signin` | `app/auth/signin/page.tsx` | Sign-in page (stub, auth disabled) |
| `/auth/error` | `app/auth/error/page.tsx` | Auth error page |
| `/auth/verify-request` | `app/auth/verify-request/page.tsx` | Verify request page |
| `/*` | `app/not-found.tsx` | Thematically consistent 404 page |

### Component Tree

```
RootLayout
├── LanguageProvider (i18n context — 8 languages, persisted to localStorage)
│   └── LenisProvider (smooth scroll via Lenis)
│       └── Pages
│
├── Landing Page (/)
│   ├── Navbar
│   ├── HeroSection
│   ├── ProblemSection
│   ├── HowItWorksSection
│   ├── FeaturesSection
│   ├── ReportPreviewSection
│   ├── AudienceSection
│   ├── CTASection
│   └── Footer
│
├── Report Workflow (/report/[caseId])
│   ├── ReportWorkflowProvider (React Context — case data, analysis, images)
│   │   └── ReportWorkflowShell (3-step navigation + header)
│   │       ├── CaseHeader
│   │       ├── StepNav (Analysis / Distribution / Takedown tabs)
│   │       ├── AnalysisStepPage
│   │       │   ├── ImageEvidence
│   │       │   ├── C2PAProvenance
│   │       │   ├── NeuralModelVerdict
│   │       │   ├── ForensicSignals (ELA, DCT, Noise, Color, Keypoints)
│   │       │   ├── ScoreGauge
│   │       │   ├── TamperHeatmap
│   │       │   ├── EvidenceMetadata
│   │       │   ├── EvidenceTimeline
│   │       │   ├── AuditTrail
│   │       │   └── CaseAnalyst (Groq streaming LLM chat)
│   │       ├── DistributionStepPage
│   │       │   └── ContentTrace
│   │       └── TakedownStepPage
│   │           └── TakedownGuidance / LeakActionConsole
│   └── NCIIReportLayout (alternative layout for NCII pipeline)
│
├── Dashboard (/dashboard)
│   ├── MonitoringPrototypeCard
│   ├── MetricTile
│   ├── CaseRow
│   ├── ActivityHeatmap
│   ├── ThreatMeter
│   ├── ThreatTimeline
│   └── Various chart components
│
└── Shared UI Components (14 shadcn/ui primitives)
    ├── button, card, badge, input, textarea, select
    ├── dropdown-menu, alert-dialog, combobox, field
    ├── label, separator, input-group, typography
```

---

## 3. API Gateway Layer (Next.js)

The Next.js app acts as a unified API gateway. It:

- **Proxies** to the 3 FastAPI microservices (intelligence, takedown)
- **Interfaces directly with MongoDB** (cases, user saves, claims, metrics)
- **Streams** Groq LLM responses to the frontend
- **Returns demo/mock data** when backends are unavailable (dashboard, monitoring)

| Route | Method | Source | Behavior |
|-------|--------|--------|----------|
| `/api/cases/[caseId]` | GET | MongoDB → Analysis API fallback | Fetches case from MongoDB; falls back to Analysis API in-memory store if not found |
| `/api/cases/save` | POST | MongoDB | Saves case + analysis result to `snifferX.cases` collection |
| `/api/user/cases` | GET | MongoDB | Lists user-saved cases sorted by `last_saved_at` desc |
| `/api/user/cases` | DELETE | MongoDB | Deletes a saved case by `case_id` |
| `/api/dashboard/overview` | GET | MongoDB | Aggregates across `cases`, `claim_events`, `claim_metrics`; **falls back to hardcoded demo data** |
| `/api/claim/track` | POST | MongoDB | Records lifecycle event into `claim_events` |
| `/api/claim/track` | GET | MongoDB | Lists events for a case from `claim_events` |
| `/api/analyst` | POST | Groq API | Streams chat completions with case context injected as system prompt |
| `/api/intelligence/[domain]` | GET | Proxy → :8002 | Proxies `GET /api/v1/intelligence/{domain}` to Intelligence service |
| `/api/takedown/[domain]` | GET | Proxy → :8003 | Proxies `GET /api/v1/takedown/{domain}` to Takedown service |
| `/api/monitor/status` | GET | Mock | Returns **hardcoded demo telemetry** — not real monitoring |

---

## 4. Microservices Layer

### 4.1 Analysis Service (`services/analysis/`) — FastAPI :8000

The core forensic engine. Receives images, runs a 14-step hybrid analysis pipeline, and returns structured forensic reports.

**14-Step Pipeline:**

| Step | Module | What It Computes | Library |
|------|--------|-----------------|---------|
| 1 | `c2pa_check.py` | C2PA Content Credentials manifest verification | `c2pa-python` |
| 2 | `ai_detection.py` | AI-generation detection (FFT grid, PRNU kurtosis, chromatic aberration, metadata anomalies) | `numpy`, `scipy`, `PIL` |
| 3 | `metadata.py` | EXIF/XMP extraction + comparison (suspicious vs reference) | `PIL` |
| 4 | `hashing.py` | SHA-256 + perceptual hash consensus (pHash, dHash, aHash) | `PIL`, `imagehash` |
| 5 | `ssim.py` | Structural Similarity Index + pixel-level diff map | `scikit-image` |
| 6 | `ela.py` | Error Level Analysis — detects JPEG compression inconsistencies | `PIL`, `numpy` |
| 7 | `dct.py` | DCT block analysis — detects double-compression artifacts (JPEG ghosts) | `numpy`, `scipy` |
| 8 | `color_analysis.py` | Color histogram + KL-divergence between images | `numpy`, `PIL` |
| 9 | `noise_analysis.py` | Noise consistency analysis (variance across blocks) | `numpy`, `opencv` |
| 10 | `keypoint_matching.py` | ORB keypoint detection + FLANN-based matching | `opencv` |
| 11 | `heatmap.py` | Tamper heatmap overlay + tamper region extraction | `numpy`, `PIL` |
| 12 | `scoring.py` | Weighted scoring model → `forensic_certainty` (authentic/likely_authentic/inconclusive/likely_manipulated/manipulated/fabricated) | Custom |
| 13 | `explanation.py` | Human-readable forensic narrative | Custom |
| 14 | `audit.py` | Tamper-evident audit trail (hash chain) | Custom |

**Endpoints:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/cases/` | Create case (UUID, platform_source, issue_type) |
| GET | `/api/cases/{case_id}` | Get case metadata |
| POST | `/api/analysis/{case_id}/run` | Run full 14-step pipeline (suspicious + optional reference image) |
| GET | `/api/analysis/{case_id}/result` | Fetch stored analysis result |
| POST | `/api/analysis/{case_id}/discover` | Start async discovery scan (background thread) |
| GET | `/api/analysis/{case_id}/discover` | Read discovery result/status |
| POST | `/api/registry/` | Register original image (SHA-256 + pHash) |
| GET | `/api/registry/` | List registry entries |
| GET | `/api/registry/check/{file_hash}` | Hash verification |
| POST | `/api/registry/takedown-notice` | Generate formatted takedown notice text |
| GET | `/api/dashboard/` | Mock service analytics |
| GET | `/health` | Health check |

**Models** (`engine/models.py`):

```
AnalysisResult
├── status: str (completed/failed/processing/pending)
├── verdict: str (authentic/manipulated/inconclusive/failed)
├── suspicious_sha256, reference_sha256
├── suspicious_metadata, reference_metadata (MetadataResult)
├── metadata_comparison
├── hash_result (HashResult — SHA256 + perceptual hash consensus)
├── similarity (SimilarityResult — SSIM + pixel diff %)
├── ela_result (ELAResult — max_ela, mean_ela, tamper_likelihood)
├── dct_result (DCTResult — blocking_artifact_magnitude, double_compression_detected)
├── color_histogram (ColorHistResult — kl_divergence, histogram_distance)
├── noise_analysis (NoiseResult — noise_consistency_score, noise_variance)
├── keypoint_result (KeypointResult — match_count, inlier_ratio)
├── heatmap_base64
├── tamper_regions (list of TamperRegion)
├── c2pa_result (dict)
├── ai_detection (dict)
├── forensic_certainty (string enum)
├── signals (dict — backward compat)
├── score (int 0-100)
├── explanation (string)
├── algorithm_details, algorithm_signals (metadata about pipeline)
├── audit_trail (AuditTrail)
├── submitted_at, analyzed_at, pipeline_version
└── discovery (DiscoveryResult — optional)
```

**Key Production Gaps:**
- ⚠️ `_results`, `_cases`, `_registry` are **in-memory Python dicts** — all data lost on restart
- ⚠️ **No auth/rate limiting** — anyone can submit 10MB files
- ⚠️ **Sync pipeline** — blocks the HTTP worker thread for 10+ seconds
- ⚠️ **Thread-based backgrounding** — `threading.Thread` for discovery (fragile)

### 4.2 Intelligence Service (`services/intelligence/`) — FastAPI :8002

Maps domains to CDN providers, content networks, and infrastructure metadata from a CSV dataset.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/intelligence/{domain}` | Domain intelligence lookup |
| GET | `/api/v1/intelligence/` | Dataset statistics |
| GET | `/health` | Health check |

**Data:** 138 domains in `dataset.csv` (in-memory, loaded at startup).

**Key Production Gaps:**
- ⚠️ **In-memory dict storage**
- ⚠️ No input validation on domain parameter
- ⚠️ Uses `print()` for logging
- ⚠️ Dataset has errors (e.g., `beacon.min.js` listed as a video provider)

### 4.3 Takedown Service (`services/takedown/`) — FastAPI :8003

Provides removal guidance for platforms (contact methods, form URLs, legal references). Falls back to live web scraping when the domain isn't in the dataset.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/takedown/{domain}` | Takedown guidance lookup |
| POST | `/api/v1/takedown/{domain}/submit` | Placeholder submission endpoint |
| GET | `/api/v1/takedown/` | Dataset statistics |
| GET | `/health` | Health check |

**Data:** 118 domains in `dataset.csv` (in-memory, loaded at startup). Quality levels 0-3.

**Key Production Gaps:**
- ⚠️ **In-memory dict storage**
- ⚠️ No input validation
- ⚠️ Uses `print()` for logging
- ⚠️ Dataset quality is uneven (quality-0 entries have no data)

---

## 5. Data Flow: 3-Step Report Workflow

The main user journey flows through three sequential pages, each building on the previous step's results.

```
User → /start → selects pipeline type (Deepfake/AI or NCII Leak)
  │
  ▼
POST /api/cases/ (Analysis API) → creates case, returns caseId
  │
  ▼
/verify/upload or /leak/upload → user uploads image
  │
  ▼
POST /api/analysis/{caseId}/run (Analysis API) → runs 14-step pipeline
  │
  ▼ ── polling GET /api/analysis/{caseId}/result ──▶ AnalysisResult
  │
  ┌─────────────────────────────────────────────────────────────────┐
  │                                                                  │
  │  /report/[caseId]/analysis              ◄── STEP 1              │
  │  ──────────────────────                                          │
  │  • ImageEvidence — side-by-side display with zoom                │
  │  • C2PAProvenance — Content Credentials badge/manifest           │
  │  • NeuralModelVerdict — AI/human classifier score                │
  │  • ForensicSignals — 6 signal cards (ELA, DCT, Noise, Color,    │
  │    Keypoints, Metadata) with individual scores                   │
  │  • ScoreGauge — 0-100 composite score with color coding          │
  │  • TamperHeatmap — overlay visualization                         │
  │  • EvidenceTimeline — step-by-step analysis timeline             │
  │  • EvidenceMetadata — file, camera, edit metadata                │
  │  • AuditTrail — tamper-evident report hash                       │
  │  • CaseAnalyst — Groq LLM chatbot with case context              │
  │                                                                  │
  │  Polling: GET /api/analysis/{caseId}/result (~3s interval)      │
  │  Components degrade gracefully while pipeline runs               │
  │                                                                  │
  └─────────────────────────────────────────────────────────────────┘
  │
  ▼  (user clicks "Continue to Distribution")
  │
  ┌─────────────────────────────────────────────────────────────────┐
  │                                                                  │
  │  /report/[caseId]/distribution         ◄── STEP 2               │
  │  ────────────────────────                                         │
  │  • POST /api/analysis/{caseId}/discover → starts background     │
  │    discovery scan (threading)                                    │
  │  • Polls GET /api/analysis/{caseId}/discover for results         │
  │  • ContentTrace — displays matched domains, confidence scores,   │
  │    page URLs, image matches                                       │
  │  • ⚠️ DEMO_DISCOVERY_MODE=True → returns hardcoded fake data    │
  │  • Also calls /api/intelligence/[domain] for CDN/network info    │
  │                                                                  │
  └─────────────────────────────────────────────────────────────────┘
  │
  ▼  (user clicks "Continue to Takedown")
  │
  ┌─────────────────────────────────────────────────────────────────┐
  │                                                                  │
  │  /report/[caseId]/takedown              ◄── STEP 3               │
  │  ──────────────────────                                           │
  │  • Calls /api/takedown/[domain] for each discovered domain       │
  │  • TakedownGuidance — platform contact info, removal method,     │
  │    form URL, escalation path                                      │
  │  • LeakActionConsole — consolidated escalation actions            │
  │  • Generates mailto: links with pre-filled removal notice         │
  │                                                                  │
  └─────────────────────────────────────────────────────────────────┘
  │
  ▼
 Dashboard (/dashboard)
  │
  ├── Overview metrics (total cases, active scans, threats detected,
  │    escalations, takedowns)
  ├── Recent saved cases list
  ├── Activity stream (lifecycle events from claim_events collection)
  ├── MonitoringPrototypeCard (mock — not real)
  ├── ThreatMeter + ThreatTimeline
  └── Action buttons — new investigation, saved reports, registry
```

**Alternative workflows (outside the 3-step report):**

- **Standalone Investigation** (`/investigate`): User enters a domain → `Promise.allSettled([intelProxy, takedownProxy])` → side-by-side results
- **Standalone Takedown** (`/takedown`): Three modes (guided with caseId+domain, bulk with caseId only, standalone file upload)
- **Protect** (`/protect`): Upload original image → POST to registry → SHA-256 + pHash stored → future match detection

---

## 6. State Management

The app uses **React Context** — no external state library (no Redux, Zustand, React Query, SWR).

### ReportWorkflowContext

```
ReportWorkflowContext
├── caseId: string | null
├── sessionId: string | null
├── caseData: CaseData | null
├── results: AnalysisResult | null
├── imageBlob: Blob | null  (suspicious image)
├── imagePreview: string | null  (base64 data URL)
├── file: File | null
├── currentStep: 1 | 2 | 3
├── isLoading: boolean
├── error: string | null
├── saveState: "idle" | "saving" | "saved" | "error"
├── isSessionActive: boolean
├── setCaseId, setResults, setImageBlob, ...
├── saveToMongo: () => Promise<void>
├── createNewSession: () => Promise<void>
└── resetWorkflow: () => void
```

**Pattern used across pages:** `useState` + `useRef` with manual `fetch` in `useEffect`. No server state caching, no optimistic updates, no deduplication of requests.

### LanguageProvider

```
LanguageProvider (i18n — 8 languages)
├── locale: string  (stored in localStorage key: "sniffer-locale")
├── setLocale: (locale: string) => void
├── t: (key: string) => string  (translation lookup)
└── dir: "ltr" | "rtl"

Supported locales: en, hi, bn, ta, te, mr, kn, gu
Translations: apps/web/lib/translations.ts (flat key-value objects per locale)
```

---

## 7. Database

### MongoDB (`snifferX` database)

| Collection | Document Shape | Key Fields | Indexes |
|------------|---------------|------------|---------|
| `cases` | Case records | `caseId`, `caseData`, `analysisResult`, `images`, `userId`, `platformSource`, `issueType`, `createdAt`, `lastSavedAt` | **None** |
| `claim_events` | Lifecycle events | `caseId`, `eventType` (case_created, case_saved, report_viewed, escalation_requested, takedown_requested, content_removed, etc.), `metadata`, `timestamp` | **None** |
| `claim_metrics` | Dashboard metrics | `type`, `value`, `timestamp`, `labels` | **None** |

### Connection (`lib/mongodb.ts`)

Standard Next.js pattern: global singleton cached in development, single connection in production. Uses `@auth/mongodb-adapter`.

### Key Production Gaps
- ⚠️ **No indexes** — queries will degrade severely with volume
- ⚠️ **No retry logic** on connection failures
- ⚠️ **No migration system** — schema evolution is manual

---

## 8. Auth

**Status: Disabled / Stub.**

`apps/web/auth.ts` returns `null` for all exports. NextAuth v5 beta is installed but not wired up.

```typescript
// auth.ts — simplified stub
export const { handlers, signIn, signOut, auth } = {
  handlers: { GET: () => new Response(null, { status: 302, headers: { Location: "/" } }),
  signIn: async () => "/",
  signOut: async () => "/",
  auth: async () => null,
};
```

- **No middleware** — all routes are publicly accessible
- **`AuthSessionProvider`** exists in components but is unused
- Email/passwordless auth flow defined in `.env.example` (EMAIL_*, NEXTAUTH_*) but not active
- All API endpoints have no authentication checks

---

## 9. External Integrations

| Service | What For | Auth Mechanism | Config |
|---------|----------|---------------|--------|
| **Groq API** | Streaming LLM analyst chat (`llama-3.3-70b-versatile`) | `GROQ_API_KEY` env var | `apps/web/.env.local` |
| **Hugging Face Hub** | Deepfake detection model inference | `HF_TOKEN` env var (optional) | `services/analysis/.env` |
| **MongoDB Atlas** | Persistence (cases, events, metrics) | `MONGODB_URI` connection string | `apps/web/.env.local` |
| **img.logo.dev** | Remote platform logo images (in supported-platforms, report) | `logo.dev` API key | `apps/web/.env.local` |
| **Nodemailer** (via NextAuth) | Email-based magic link auth (disabled) | SMTP credentials | `apps/web/.env.local` |
| **C2PA Python library** | Content Credentials (provenance) verification | Local library | Installed via pip |

### 🚨 Security Alert: Secrets in Repo

The following secrets are committed to disk in plaintext (should be in `.gitignore`):
- `apps/web/.env.local` — MongoDB Atlas connection string with credentials, Groq API key, Logo.dev API key
- `services/analysis/.env` — Hugging Face token

**These must be rotated immediately before any launch.**

---

## 10. Key Architectural Decisions

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| **Monorepo with pnpm workspaces** | Shared tooling, single `pnpm install`, consistent scripts | Frontend + 3 services share no code — pure organizational monorepo |
| **Next.js API routes as gateway** | Single origin for frontend, hides internal services, no need for API gateway in front | Added latency on proxied requests, duplicates some logic (MongoDB handling) |
| **FastAPI microservices are independent** | Simple direct HTTP calls, no service mesh/discovery needed | Brittle — no health-based routing, no circuit breakers, no retries |
| **Analysis results in-memory** | Simplicity for MVP, no DB dependency for analysis service | All data lost on restart, no horizontal scaling |
| **CSV-based datasets** (intel + takedown) | Zero infrastructure, easy to audit/edit, fast startup | Must reload service to update data, no querying capability |
| **No server state management** (React Query/SWR) | Fewer dependencies, simpler mental model | Duplicate requests, no caching, no deduplication, manual loading/error states everywhere |
| **Manual fetch + useEffect** | No abstraction layer, easy to understand | Boilerplate heavy, error-prone, no built-in retry or race condition handling |
| **shadcn/ui + Tailwind v4** | Themeable via CSS variables, consistent design system, tree-shakeable | Mixed icon libraries (Tabler + Lucide), full import of icon sets in bundle |

---

## 11. Production Readiness Audit

A comprehensive audit was conducted across 12 dimensions. Summary of findings:

### 11.1 Mock vs Real Data — Critical Gaps

| Issue | File | Severity |
|-------|------|----------|
| **Discovery scan hardcoded to demo** 🔥 | `services/analysis/engine/discovery.py:46` | Critical |
| | `DEMO_DISCOVERY_MODE = True` — real crawling code exists but is dead code. Returns hardcoded fake URLs, domains, confidence scores. | |
| **Monitoring endpoint entirely static** 🔥 | `apps/web/app/api/monitor/status/route.ts:7-63` | Critical |
| | Returns hardcoded mock telemetry with disclaimer: *"Demonstration data only"*. Alert IDs prefixed `mock-`. | |
| **Dashboard fallback to demo data** | `apps/web/app/api/dashboard/overview/route.ts:329-382` | High |
| | When MongoDB is unavailable, silently returns hardcoded demo data with `demo-a1b2c3d4` style IDs. Masks real infra failures. | |
| **In-memory data stores (all 3 services)** | `routers/cases.py:30`, `analysis.py:19`, `registry.py:18` | Critical |
| | Comment: *"replace with PostgreSQL in production"* — data lost on restart, no horizontal scaling. | |

### 11.2 Error Handling — Silent Failures

| Issue | File | Severity |
|-------|------|----------|
| **Empty catch blocks** | `analysis.py:78-79`, `cases/save/route.ts:53-55`, `claim/track/route.ts:49-52` | High |
| **No ErrorBoundary in app tree** | `app/layout.tsx` | Medium |
| **Dashboard `.catch()` ignores errors** | `app/dashboard/page.tsx:116,124` | Medium |
| **Analysis pipeline modules** — good pattern (catch → safe defaults) | `ela.py:48`, `dct.py:41`, etc. | Low (positive) |

### 11.3 Testing — Zero Coverage 🔥

| Issue | Severity |
|-------|----------|
| No test files, no test config, no test dependencies | **Critical** |
| No `jest.config`, `vitest.config`, no `pytest` in requirements | |
| No test script in any `package.json` | |

### 11.4 Logging — No Structured Logging

| Issue | File | Severity |
|-------|------|----------|
| Python services use `print()` | `main.py:14`, `loader.py:28` | High |
| Next.js uses `console.error()` inconsistently | Various | Medium |
| No centralized logging (pino/winston/structlog) | Entire codebase | Medium |

### 11.5 Secrets Security 🔥

| Issue | File | Severity |
|-------|------|----------|
| **MongoDB Atlas connection string with credentials** | `apps/web/.env.local` | Critical |
| **Groq API key** | `apps/web/.env.local` | Critical |
| **Logo.dev API key** | `apps/web/.env.local` | Critical |
| **Hugging Face token** | `services/analysis/.env` | Critical |

### 11.6 Database Readiness

| Issue | Severity |
|-------|----------|
| No indexes on any collection | High |
| No retry logic for DB connection failures | Medium |
| No migration system | Medium |

### 11.7 Python Service Production Readiness

| Issue | Severity |
|-------|----------|
| No structured logging | High |
| No rate limiting | Medium |
| No request validation on intel/takedown services | Medium |
| No exception handler middleware | Low |
| CORS allows `allow_methods=["*"]` on analysis service | Low |

### 11.8 Frontend Resilience

| Issue | Severity |
|-------|----------|
| No ErrorBoundary | Medium |
| No retry logic on API failures (dashboard, investigate, takedown) | Medium |
| Dashboard lacks error state rendering | Medium |
| Loading states present (good) | Low (positive) |
| Empty states present (good) | Low (positive) |

### 11.9 API Security

| Issue | Severity |
|-------|----------|
| No security headers (CSP, HSTS, X-Frame-Options) | High |
| No rate limiting anywhere | High |
| Auth completely disabled — all routes public | High |
| No input sanitization on domain lookups (SSRF risk) | Medium |

### 11.10 Deployment

| Issue | Severity |
|-------|----------|
| **No Dockerfiles or docker-compose** | Critical |
| **No CI/CD configuration (GitHub Actions)** | Critical |
| No Vercel/vercel.json config | Medium |

### 11.11 Performance

| Issue | Severity |
|-------|----------|
| Analysis pipeline blocks HTTP worker synchronously (10s+) | High |
| Full Tabler icon set + framer-motion in client bundle | Medium |
| CSV datasets loaded entirely in memory (acceptable for current size) | Low |

### 11.12 Dataset Quality

| Issue | File | Severity |
|-------|------|----------|
| `beacon.min.js` listed as a video provider | `intelligence/data/dataset.csv` | Medium |
| Inconsistent timestamp formats | `takedown/data/dataset.csv` | Medium |
| 13 entries with no data (quality-0) | `takedown/data/dataset.csv` | Medium |
| Personal email exposed in dataset | `intelligence/data/dataset.csv:136` | Medium |

### Audit Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Mock vs Real Data | 3 | 1 | 0 | 1 |
| Error Handling | 0 | 2 | 4 | 1 |
| Testing | 1 | 0 | 0 | 0 |
| Logging | 0 | 1 | 1 | 0 |
| Secrets Security | 4 | 0 | 0 | 0 |
| Database Readiness | 0 | 1 | 2 | 1 |
| Python Service | 0 | 1 | 1 | 3 |
| Frontend Resilience | 0 | 0 | 3 | 6 |
| API Security | 0 | 3 | 1 | 0 |
| Deployment | 2 | 0 | 1 | 1 |
| Performance | 0 | 1 | 1 | 2 |
| Dataset Quality | 0 | 0 | 4 | 0 |
| **TOTALS** | **10** | **10** | **18** | **15** |

---

## 12. Phased Production Roadmap

### Phase 0: 🚨 Security Incident Response (Week 1)

| # | Action | Details | Owner |
|---|--------|---------|-------|
| 0.1 | **Rotate all exposed credentials** | MongoDB Atlas password, Groq API key, HuggingFace token, Logo.dev API key | DevOps |
| 0.2 | **Remove `.env.local` from git history** | `git filter-branch` or `git filter-repo` to scrub committed secrets | DevOps |
| 0.3 | **Add `.env.*` to `.gitignore`** and verify no secrets remain unignored | Ensure `services/*/.env` is in root `.gitignore` | DevOps |
| 0.4 | **Set up `.env.production.local`** with real secrets for deployment target | Document required vars | DevOps |

### Phase 1: Foundation — Make the Core Real (Weeks 2-4)

| # | Priority | Action | Impact | Effort |
|---|----------|--------|--------|--------|
| 1.1 | P0 | **Replace in-memory dicts with PostgreSQL** in all 3 Python services | Data survives restarts, horizontal scaling possible | 2 weeks |
| 1.2 | P0 | **Enable real discovery scanning** — remove `DEMO_DISCOVERY_MODE = True` in `discovery.py:46` | Core feature actually works | 3 days |
| 1.3 | P0 | **Replace monitoring mock data** with real scheduled re-scanning or remove the feature | Honest UX, no fake telemetry | 1 week |
| 1.4 | P0 | **Add proper task queue** (Celery/arq/Redis Queue) for analysis pipeline + discovery | Pipeline doesn't block HTTP workers | 2 weeks |
| 1.5 | P0 | **Dockerize all services** — write Dockerfiles + docker-compose.yml | Reproducible deployments | 3 days |
| 1.6 | P0 | **Set up CI/CD** — GitHub Actions (lint → test → build → deploy) | Automated quality gates | 1 week |
| 1.7 | P1 | **Add unit tests for the analysis pipeline** (pytest) | Core algorithm regression safety | 1 week |
| 1.8 | P1 | **Add integration tests for API routes** (pytest + httpx for services, Playwright for frontend) | API contract safety | 1 week |

### Phase 2: Reliability — Handle Production Traffic (Weeks 5-7)

| # | Priority | Action | Impact | Effort |
|---|----------|--------|--------|--------|
| 2.1 | P1 | **Create database indexes** on `cases.caseId`, `cases.lastSavedAt`, `claim_events.eventType` | Query performance under load | 1 day |
| 2.2 | P1 | **Replace `print()` with structured logging** (pino/next-logger for Next.js, structlog/loguru for Python) | Debuggable production incidents | 3 days |
| 2.3 | P1 | **Add React ErrorBoundary** wrapping the app tree | UI doesn't crash on component error | 1 day |
| 2.4 | P1 | **Add retry logic** to all frontend API calls (exponential backoff, max 3 retries) | Resilient to transient failures | 2 days |
| 2.5 | P1 | **Add rate limiting** to all services (Next.js: Vercel WAF or upstash-rate-limiter; Python: slowapi) | Protection against abuse | 2 days |
| 2.6 | P1 | **Configure security headers** (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) in `next.config.ts` | Security baseline | 1 day |
| 2.7 | P1 | **Remove silent error swallowing** — dashboard, claim-tracker catch blocks | Fail visibly instead of showing fake "ok" | 1 day |
| 2.8 | P1 | **Add input validation** on intel/takedown domain parameters (sanitize, validate domain format) | Reduced SSRF risk | 1 day |

### Phase 3: Completeness — Fill Feature & Quality Gaps (Weeks 8-10)

| # | Priority | Action | Impact | Effort |
|---|----------|--------|--------|--------|
| 3.1 | P2 | **Validate and clean CSV datasets** — fix wrong data types, normalize timestamps, add missing quality-0 entries | Data-driven features become trustworthy | 1 week |
| 3.2 | P2 | **Expand dataset coverage** — add more domains to intel + takedown datasets | More useful for real users | 2 weeks |
| 3.3 | P2 | **Implement database migration system** (Alembic for PostgreSQL, migrate-mongo for MongoDB if kept) | Safe schema evolution | 3 days |
| 3.4 | P2 | **Remove the demo fallback** from dashboard overview route | No more fake data in production | 1 day |
| 3.5 | P2 | **Add request timeouts** on each analysis pipeline module (per-step timeout) | Pipeline can't hang on pathological images | 2 days |
| 3.6 | P2 | **Authenticated takedown submission** — integrate with platform APIs or send email | Takedown becomes an action, not just text | 2 weeks |
| 3.7 | P2 | **Add auth** — enable NextAuth with email magic links if multi-user needed | Route protection, user isolation | 1 week |
| 3.8 | P2 | **Add `/health` endpoints** with dependency checks (DB, upstream services) | Observability baseline | 1 day |

### Phase 4: Scale & Polish — Production Maturity (Weeks 11-14)

| # | Priority | Action | Impact | Effort |
|---|----------|--------|--------|--------|
| 4.1 | P3 | **Stream/offload image processing** — use temp files instead of holding full bytes in memory | Handle large images, avoid OOM | 3 days |
| 4.2 | P3 | **Optimize frontend bundle** — dynamic import heavy components (framer-motion, heatmap), subset icons | Faster page loads, lower JS payload | 3 days |
| 4.3 | P3 | **Harden discovery crawling** — respect `robots.txt`, throttle requests, multi-language keywords, expand domain selection beyond hardcoded allowlist | Crawler doesn't get blocked, broader coverage | 2 weeks |
| 4.4 | P3 | **Add trusted timestamping** (RFC 3161) for registry entries | Cryptographically verifiable evidence | 1 week |
| 4.5 | P3 | **Set up observability stack** (Prometheus metrics, health checks, APM tracing) | Proactive incident detection | 1 week |
| 4.6 | P3 | **Set up staging environment** (staging.sniffer.dev) with production-like config | Safe pre-production testing | 3 days |
| 4.7 | P3 | **Performance benchmark the analysis pipeline** — measure per-step latency for 10+ image types (small/large, JPEG/PNG, manipulated/authentic) | Know your performance envelope | 1 week |
| 4.8 | P3 | **Add Redis caching layer** for intelligence/takedown lookups + repeated pipeline inputs | Reduce latency for common queries | 1 week |
| 4.9 | P3 | **Set up monitoring + alerting** (uptime monitoring, error rate alerts, log aggregation) | Know when things break | 1 week |

### Phase 5: Product-Market Fit (Post-Launch)

| # | Action | Why |
|---|--------|-----|
| 5.1 | **Multi-language support for keyword extraction** in discovery crawler | English-only keywords miss most non-English content |
| 5.2 | **PDF report export** with signed chain of custody | Needed for legal/admissible evidence |
| 5.3 | **Role-based workspaces** (individual / law firm / trust & safety team) | Different user types need different views |
| 5.4 | **Automated re-scanning / watchlists** | Users want continuous monitoring of domains |
| 5.5 | **Billing / usage tiers** | If this needs to be a business |
| 5.6 | **Platform API integration** (submit takedowns via platform APIs instead of just generating text) | Reduces user effort significantly |

---

## Quick Reference: File Map

| Path | Purpose |
|------|---------|
| `apps/web/app/` | Next.js App Router — all pages + API routes |
| `apps/web/components/` | React components (ui/, landing/, report/, dashboard/, upload/, verify/, etc.) |
| `apps/web/lib/` | Utilities (mongodb.ts, claim-tracker.ts, translations.ts, utils.ts) |
| `apps/web/providers/` | Context providers (LenisProvider) |
| `apps/web/auth.ts` | **Auth stub** — returns null (disabled) |
| `apps/web/next.config.ts` | Next.js config (remote image patterns only) |
| `services/analysis/engine/` | 14 forensic modules + pipeline orchestrator + models |
| `services/analysis/routers/` | FastAPI route definitions (cases, analysis, registry, dashboard) |
| `services/intelligence/engine/` | CSV loader + lookup logic |
| `services/intelligence/routers/` | Domain intelligence API routes |
| `services/intelligence/data/` | `dataset.csv` — 138 domains |
| `services/takedown/engine/` | CSV loader + live scraper |
| `services/takedown/routers/` | Takedown guidance API routes |
| `services/takedown/data/` | `dataset.csv` — 118 domains |
| `scripts/` | `run-service.cjs` — service runner via concurrently |

---

*Generated from comprehensive codebase audit — covers architecture, all routes/components/services, data flow, state management, integration points, production readiness gaps, and phased roadmap.*
