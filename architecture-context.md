
System Architecture
┌─────────────────────────────────────────────────────────────────────┐
│                        🖥️ CLIENT (Browser)                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Next.js 16 App (React 19 / TypeScript / Tailwind v4)        │  │
│  │                                                               │  │
│  │  Pages: / /start /verify/upload /leak/upload                  │  │
│  │         /report/[caseId]/{analysis,distribution,takedown}     │  │
│  │         /investigate /takedown /protect /dashboard            │  │
│  │         /how-it-works /supported-platforms /resources         │  │
│  │                                                               │  │
│  │  State: ReportWorkflowContext (React Context)                 │  │
│  │         LanguageProvider (i18n: 8 languages)                  │  │
│  │                                                               │  │
│  │  UI: shadcn/ui (Radix Nova) + framer-motion + Lenis          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────┘
                                     │ HTTP/WS
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     🌐 NEXT.JS API LAYER (:3000)                    │
│                                                                     │
│  /api/cases/[caseId]         ───► MongoDB (cases collection)        │
│  /api/cases/save                                                │
│  /api/user/cases                                                  │
│  /api/dashboard/overview      ───► MongoDB aggregated query         │
│  /api/claim/track             ───► MongoDB claim_events             │
│                                                                     │
│  /api/analyst                 ───► Groq LLM (streaming chat)       │
│                                                                     │
│  /api/intelligence/[domain]   ────┐                                │
│  /api/takedown/[domain]       ────┤  (proxies to services)        │
│  /api/monitor/status          ────┘                                │
└─────────────────────────────────────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  🔬 ANALYSIS    │    │  🕵️ INTELLIGENCE    │    │  ⚖️  TAKEDOWN       │
│  FastAPI :8000   │    │  FastAPI :8002       │    │  FastAPI :8003       │
│                  │    │                      │    │                      │
│  14-step pipe-   │    │  domain→CDN/network  │    │  domain→removal      │
│  line:           │    │  mapping from CSV    │    │  guidance from CSV   │
│                  │    │  datasets            │    │  + live web scrape   │
│  1. C2PA check   │    │                      │    │  fallback            │
│  2. AI detection │    │  GET /{domain}       │    │                      │
│  3. ELA          │    │  GET /{domain}/      │    │  GET /{domain}       │
│  4. DCT          │    │    details           │    │  POST /{domain}/     │
│  5. Noise        │    │  GET /providers      │    │    submit            │
│  6. Color hist   │    │                      │    │                      │
│  7. SSIM         │    │  Data: IntelCSV      │    │  Data: TakedownCSV   │
│  8. ORB keypoints│    │  (14k rows)          │    │  (1.1k rows)         │
│  9. Hashing      │    │                      │    │                      │
│ 10. Heatmap      │    │                      │    │                      │
│ 11. Score calc   │    │                      │    │                      │
│ 12. Explanation  │    │                      │    │                      │
│ 13. Signal table │    │                      │    │                      │
│ 14. Audit trail  │    │                      │    │                      │
│                  │    │                      │    │                      │
│  Models:         │    │                      │    │                      │
│  HuggingFace     │    │                      │    │                      │
│  Detector +      │    │                      │    │                      │
│  scikit-image    │    │                      │    │                      │
│  + opencv        │    │                      │    │                      │
└─────────────────┘    └─────────────────────┘    └─────────────────────┘
Data Flow: 3-Step Report Workflow
User → /start → selects pipeline type
  │
  ▼
Upload image → POST to Analysis API (:8000)
  │
  ▼
Analysis API runs 14-step pipeline → stores result in-memory
  │
  ▼ (polling GET /analysis/{caseId}/result)
  │
  ┌─────────────────────────────────────────────────┐
  │  /report/[caseId]/analysis    ◄── STEP 1        │
  │  • C2PA provenance badge                         │
  │  • Neural model verdict (AI/human score)         │
  │  • Forensic signals (ELA, DCT, Noise, etc.)      │
  │  • Tamper heatmap visualization                  │
  │  • ScoreGauge + EvidenceTimeline                 │
  │  • CaseAnalyst (Groq LLM chat)                   │
  └─────────────────────────────────────────────────┘
  │
  ▼
  ┌─────────────────────────────────────────────────┐
  │  /report/[caseId]/distribution  ◄── STEP 2       │
  │  • Discovery scan (web crawling)                  │
  │  • ContentTrace — domain→platform mapping         │
  │  • Calls Intelligence API (:8002)                │
  └─────────────────────────────────────────────────┘
  │
  ▼
  ┌─────────────────────────────────────────────────┐
  │  /report/[caseId]/takedown     ◄── STEP 3        │
  │  • Takedown guidance per platform                 │
  │  • LeakActionConsole                             │
  │  • Calls Takedown API (:8003)                    │
  │  • Generates mailto links / form URLs             │
  └─────────────────────────────────────────────────┘
State Management
ReportWorkflowContext (React Context)
├── caseId, sessionId
├── caseData, results
├── imageBlob, file
├── currentStep (1|2|3)
├── loading / error states
├── saveState / isSessionActive
LanguageProvider
└── locale (stored in localStorage)
    └── 8 languages: en, hi, bn, ta, te, mr, kn, gu
Database (MongoDB)
Collection	Documents	Key Fields
snifferX.cases	Case records	caseId, analysisResult, images, userId, createdAt
snifferX.claim_events	Lifecycle events	caseId, eventType, metadata, timestamp
snifferX.claim_metrics	Dashboard metrics	type, value, timestamp, labels
Auth (Currently Disabled — Stub)
auth.ts → returns null (all exports)
NextAuth v5 beta with EmailProvider / MongoDB adapter configured but disabled
No middleware — all routes public
External Integrations
Service	Use
Groq API	LLM analyst (llama-3.3-70b-versatile)
Hugging Face Hub	Deepfake detection model inference
MongoDB	Persistence layer
img.logo.dev	Remote platform logo images
C2PA library	Content Credentials verification
Key Architectural Decisions
1. 
Monorepo with pnpm workspaces — frontend + 3 microservices share no code
2. 
Next.js API routes as a gateway — proxies external calls, handles MongoDB, provides unified API to frontend
3. 
FastAPI microservices are independent — no service discovery, direct HTTP calls
4. 
Analysis results kept in-memory (Python dict) — no persistence in the analysis service; MongoDB save is optional via frontend
5. 
No server state management — manual fetch/useEffect patterns (no React Query/SWR)
6. 
CSV-based datasets for intelligence & takedown — no database needed for those services
7. 
shadcn/ui with Radix Nova — Tailwind v4 based, themable via CSS variables
Would you like me to read any specific file to get deeper detail on a particular subsystem (e.g., the pipeline models, specific API contracts, component props)?