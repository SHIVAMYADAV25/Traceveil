<p align="center">
  <img src="apps/web/public/logo.png" alt="Sniffer" width="64" height="64" />
</p>

<h1 align="center">Sniffer</h1>

<p align="center">
  <strong>Open-Source NCII Leak Discovery & Automated Takedown Platform</strong>
</p>

<p align="center">
  Upload one image. Scan 90+ domains. Generate takedown requests in 30 seconds.
</p>

<p align="center">
  <a href="https://sniffer.impiclabs.com">Live Demo</a> ·
  <a href="https://sniffer.impiclabs.com/leak?demo=1">Try the Scan</a> ·
  <a href="https://sniffer.impiclabs.com/pitch">Pitch Deck</a>
</p>

<br/>

## The Problem

Once intimate content is leaked, it spreads across multiple websites, mirror networks, and CDNs within hours. Victims must:

- Manually discover every copy across dozens of sites
- Document each with screenshots, URLs, and timestamps
- Identify hosting infrastructure for each platform
- File separate takedown requests — each with different forms, contacts, and legal requirements

This takes **3-4 hours per case**. Most victims never find all copies.

## The Solution

**Sniffer** automates the complete response workflow:

1. **Upload** one reference image or video
2. **Fingerprint** using a 3-tier perceptual matching engine
3. **Scan** 91+ high-risk domains and mirror networks in parallel
4. **Evidence** automatically collects URLs, hashes, CDN info, timestamps
5. **Takedown** generates platform-specific DMCA/abuse requests with one click

<br/>

## Key Features

| Feature | Description |
|---------|-------------|
| **3-Tier Matching Engine** | pHash (99% confidence) + ORB features (85-95%) + HSV histogram (75-85%) — detects crops, watermarks, brightness edits without deep learning |
| **91-Domain Scan Network** | Pre-indexed high-risk domains across 2+ mirror networks (LTD Network, TTCACHE Network) |
| **Automated Takedown** | Generates platform-specific DMCA requests, abuse reports, and legal templates with contact emails and removal portal links |
| **Infrastructure Intelligence** | Identifies CDN providers, hosting networks, and mirror infrastructure for each domain |
| **Court-Ready Evidence** | PDF reports with SHA-256 hashes, confidence scores, timestamps, and case references |
| **Privacy-First** | No PII stored. Anonymous case IDs. Images hashed locally before processing. |
| **Bulk Takedown** | Escalate all detected domains simultaneously with one case-wide removal packet |

<br/>

## Matching Engine

```
┌─────────────────────────────────────────────────────────┐
│                   3-TIER MATCHING                       │
├──────────────┬──────────────────┬───────────────────────┤
│    pHash     │   ORB Features   │   HSV Histogram       │
│   (DCT)      │   (Keypoints)    │   (Color Dist.)       │
│  99% conf.   │   85-95% conf.   │   75-85% conf.        │
├──────────────┼──────────────────┼───────────────────────┤
│ Exact copies │ Cropped images   │ Brightness edits      │
│ Resized      │ Watermarked      │ Filter changes        │
│ Recompressed │ Rotated          │ Contrast manipulation  │
└──────────────┴──────────────────┴───────────────────────┘
```

## Business Model

| Tier | Price | Who | Key Features |
|------|-------|-----|-------------|
| **Survivor** | Free | Victims | Core NCII discovery, takedown guidance, email support |
| **Professional** | ₹499/mo | Lawyers, NGOs | Bulk scanning, PDF reports, multi-case dashboard, priority support |
| **Enterprise** | ₹9,999/mo | Platforms, large orgs | White-label reports, API access, SLA, dedicated onboarding |

**Unit Economics (at 1K users):**
- MRR: ₹5.74 Lakhs
- Gross Margin: 99.1%
- Market: 5.7M+ NCII victims in India
- TAM: ₹240 Cr/year

## Impact & Results

- **5 videos successfully removed** from hosting platforms
- **91+ domains indexed** across 2 mirror networks
- **95% of takedown requests auto-submitted**
- **80% removal rate** during testing
- **10× faster** than manual investigation process

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4, Shadcn UI, Framer Motion |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, Pydantic |
| **Matching** | OpenCV, NumPy, Pillow |
| **Database** | MongoDB, Redis |
| **Infrastructure** | Docker, Caddy (reverse proxy), systemd |
| **Auth** | NextAuth.js, Magic Link |

## Architecture

```
┌─────────┐     ┌──────────────┐     ┌──────────────────┐
│  User   │────▶│  Web App     │────▶│  Analysis API    │
│ Browser │     │  :3001       │     │  :8000           │
└─────────┘     └──────┬───────┘     └────────┬─────────┘
                       │                       │
                       │              ┌────────▼─────────┐
                       │              │  Intelligence API│
                       ├──────────────▶  :8002           │
                       │              └──────────────────┘
                       │              ┌──────────────────┐
                       └──────────────▶  Takedown API    │
                                      │  :8003           │
                                      └──────────────────┘
```

## Repository Layout

```
apps/web/                 Next.js frontend + API proxy routes + auth
├── app/
│   ├── leak/             Image upload + scan page
│   ├── report/[caseId]/  Investigation report with evidence
│   ├── pitch/            Full pitch deck with business model
│   ├── takedown/         Bulk takedown workflow
│   └── ...
├── components/
│   ├── landing/          Landing page sections
│   ├── report/           Report components (ContentTrace, LeakActionConsole, etc.)
│   └── ui/               Reusable UI primitives
│
services/
├── analysis/             FastAPI analysis service (case management, discovery)
├── intelligence/         FastAPI intelligence service (domain lookup, CDN detection)
└── takedown/             FastAPI takedown service (removal guidance, contact lookup)
```

## Live Demo

**URL:** [https://sniffer.impiclabs.com](https://sniffer.impiclabs.com)

The app is deployed on a VPS with Caddy reverse proxy:
- Frontend: port 3001
- Backend API: port 8000 (`/api/*`)
- All services run via systemd

## Local Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.11+

### Quick Start

```bash
# Clone & install
git clone https://github.com/icancodefyi/sniffer-forensics.git
cd sniffer-forensics
pnpm install

# Set up Python virtual environment
cd services
python -m venv .venv
source .venv/bin/activate
pip install -r analysis/requirements.txt
pip install -r intelligence/requirements.txt
pip install -r takedown/requirements.txt
cd ..

# Start all services (web + 3 APIs)
pnpm dev
```

### Environment Variables

Copy `apps/web/.env.example` → `apps/web/.env.local` and configure:

- `MONGODB_URI` — MongoDB connection string
- `NEXT_PUBLIC_API_URL` — Analysis API URL (default: `http://localhost:8000`)
- `INTELLIGENCE_SERVICE_URL` — Intelligence API URL (default: `http://localhost:8002`)
- `TAKEDOWN_SERVICE_URL` — Takedown API URL (default: `http://localhost:8003`)

### Expected Ports

| Service | Port |
|---------|------|
| Web App | 3001 |
| Analysis API | 8000 |
| Intelligence API | 8002 |
| Takedown API | 8003 |

## API Endpoints

### Analysis (`:8000`)
- `POST /api/cases/` — Create case
- `GET /api/cases/{case_id}` — Get case
- `POST /api/analysis/{case_id}/run` — Run analysis
- `GET /api/analysis/{case_id}/discover` — Get discovery results
- `POST /api/registry/` — Register content
- `GET /api/dashboard/` — Dashboard stats

### Intelligence (`:8002`)
- `GET /api/v1/intelligence/{domain}` — Domain intelligence lookup
- `GET /api/v1/intelligence/` — List all intelligence data

### Takedown (`:8003`)
- `GET /api/v1/takedown/{domain}` — Domain takedown info
- `GET /api/v1/takedown/` — List all takedown data

## Links

- **Live App:** [sniffer.impiclabs.com](https://sniffer.impiclabs.com)
- **Pitch Page:** [sniffer.impiclabs.com/pitch](https://sniffer.impiclabs.com/pitch)
- **Try Demo:** [sniffer.impiclabs.com/leak?demo=1](https://sniffer.impiclabs.com/leak?demo=1)
- **GitHub:** [github.com/icancodefyi/sniffer-forensics](https://github.com/icancodefyi/sniffer-forensics)

---

<p align="center">
  <strong>HACKVERSE 2026</strong> · Built by <a href="https://github.com/icancodefyi">Impic Labs</a>
</p>
