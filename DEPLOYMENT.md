# Traceveil: free deployment guide

Free-tier limits change. Check each provider's pricing page before you rely on a number below.

## 0. What you are deploying

| # | Piece | Tech | Port (local) | Free host | Needs |
|---|-------|------|--------------|-----------|-------|
| 1 | **web** (`apps/web`) | Next.js 16 | 3000 | **Vercel** | MongoDB, all 4 services below |
| 2 | **analysis** (`services/analysis`) | FastAPI | 8000 | **Render** | HF token. Browser calls it directly |
| 3 | **intelligence** (`services/intelligence`) | FastAPI | 8002 | **Render** | nothing (CSV bundled). Called by web server |
| 4 | **takedown** (`services/takedown`) | FastAPI | 8003 | **Render** | nothing (CSV bundled). Called by web server |
| 5 | **community** (`services/community`) | Fastify + WebSocket | 8004 | **Render** | Postgres |
| 6 | MongoDB (db `traceveilX`) | | 27017 | **MongoDB Atlas M0** | |
| 7 | PostgreSQL | | 5433 | **Neon** (or Supabase) | |

Deploy in this order: **databases, backends, Vercel, then go back and set CORS origins**.

How traffic flows:
- Browser calls `analysis` directly (`NEXT_PUBLIC_API_URL`). Image uploads do not pass through Vercel, so the 4.5 MB Vercel body limit does not apply.
- Browser calls `community` directly for REST and WebSocket (`NEXT_PUBLIC_COMMUNITY_API_URL`).
- Vercel server routes call `intelligence`, `takedown` and `analysis` (`*_SERVICE_URL`), and MongoDB.

---

## 1. Put the code on GitHub

```bash
cd Traceveil-main
git init && git add . && git commit -m "deploy"
git branch -M main
git remote add origin https://github.com/<you>/traceveil.git
git push -u origin main
```

---

## 2. Databases

### 2a. MongoDB Atlas (free M0)
1. https://cloud.mongodb.com -> create project -> **Build a Database -> M0 Free**. Pick a region near your users (Mumbai `ap-south-1` is fine).
2. **Database Access -> Add user** (password auth). Use a password with only letters and digits to avoid URL-encoding problems.
3. **Network Access -> Add IP -> Allow access from anywhere (0.0.0.0/0)**. Vercel has no fixed IPs, so this is required.
4. **Connect -> Drivers** -> copy the string and add the DB name:
   ```
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/traceveilX?retryWrites=true&w=majority
   ```
   Collections are created automatically. The code uses database `traceveilX`.

### 2b. Neon Postgres (free) for the community service
1. https://neon.tech -> new project (region AWS Singapore, closest to Mumbai).
2. Copy the **connection string** (keep `?sslmode=require`):
   ```
   DATABASE_URL=postgresql://<user>:<password>@<host>.neon.tech/neondb?sslmode=require
   ```
   Use the **direct** string, not the `-pooler` one.
3. Migrations run automatically when the community service starts. The rooms/channels need a one-time seed (step 5).

---

## 3. Backend services on Render

Free web services sleep after about 15 minutes idle. The first request after that takes 30 to 60 seconds. Free instances have 512 MB RAM. Render gives roughly 750 free instance-hours per month across the workspace, so do **not** ping all four services around the clock.

### Option A: Blueprint (fastest)
1. https://render.com -> **New -> Blueprint** -> connect the GitHub repo. It reads `render.yaml` and creates all 4 services.
2. Fill in the values it asks for:

| Service | Variable | Value |
|---|---|---|
| analysis | `ALLOWED_ORIGINS` | your Vercel URL, e.g. `https://traceveil.vercel.app` (placeholder for now) |
| analysis | `HF_TOKEN` | Hugging Face token (huggingface.co -> Settings -> Access Tokens -> Read) |
| intelligence / takedown | `ALLOWED_ORIGINS` | same Vercel URL |
| community | `DATABASE_URL` | Neon string from 2b |
| community | `ALLOWED_ORIGINS` | same Vercel URL (exact, no trailing slash) |

3. Wait for all four to go **Live**. Note the four URLs: `https://traceveil-analysis.onrender.com`, `...-intelligence...`, `...-takedown...`, `...-community...`. Render may add a suffix if a name is taken, so use what the dashboard shows.

### Option B: manual (if the Blueprint fails)
For each: **New -> Web Service -> pick repo -> Instance type Free**.

| Service | Root Directory | Build Command | Start Command | Health Check |
|---|---|---|---|---|
| analysis | `services/analysis` | `pip install -r requirements.txt` | `uvicorn main:app --host 0.0.0.0 --port $PORT` | `/health` |
| intelligence | `services/intelligence` | `pip install -r requirements.txt` | `uvicorn main:app --host 0.0.0.0 --port $PORT` | `/health` |
| takedown | `services/takedown` | `pip install -r requirements.txt` | `uvicorn main:app --host 0.0.0.0 --port $PORT` | `/health` |
| community | `services/community` | `npm ci --include=dev && npm run build` | `npm start` | `/health` |

Always add `PYTHON_VERSION=3.12.8` to the three Python services (the dependency wheels, especially `c2pa-python` and `opencv`, are safest on 3.12) and `NODE_VERSION=22.12.0` to community.

### Environment variables per backend

**analysis**
```
PYTHON_VERSION=3.12.8
ALLOWED_ORIGINS=https://<your-app>.vercel.app
HF_TOKEN=hf_xxx
TRACEVEIL_MAX_CONCURRENT_SCANS=1
TRACEVEIL_MAX_CONCURRENT_VIDEO_SCANS=1
# optional: TRACEVEIL_RETENTION_DAYS=7, DEEPFAKE_MODEL_ID, TRACEVEIL_NETGUARD=1
```
Scan records live on local disk (`.data`). Render's free disk is wiped on every redeploy and restart, so in-progress scan state is temporary. That is fine because finished cases are saved to MongoDB by the web app.

**intelligence** and **takedown**
```
PYTHON_VERSION=3.12.8
ALLOWED_ORIGINS=https://<your-app>.vercel.app
```

**community**
```
NODE_VERSION=22.12.0
NODE_ENV=production
COMMUNITY_PORT=10000
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
ALLOWED_ORIGINS=https://<your-app>.vercel.app
COOKIE_SECURE=true
COOKIE_SAMESITE=none        # see "Cookies" below
TRUST_PROXY=true
COMMUNITY_OPEN=true
SESSION_DAYS=14
RETENTION_DAYS=30
RATE_LIMIT_ENABLED=true
REGISTER_LIMIT_PER_HOUR=5
```
`COMMUNITY_PORT=10000` matches Render's default `PORT`. If Render shows a different port, use that.

### Cookies: read this, it decides whether community login works
The community session is a cookie, and the WebSocket needs it too. `vercel.app` and `onrender.com` are different sites, so a default `SameSite=Lax` cookie is not sent.

- **Option 1, no domain (free):** `COOKIE_SAMESITE=none` plus `COOKIE_SECURE=true` (already set above). Works in Chrome and Edge. Safari and Firefox strict or private modes block third-party cookies, so login may not stick there.
- **Option 2, custom domain (recommended for real users):** put the web app on `example.com` and community on `community.example.com` (Vercel and Render both allow custom domains on free plans). Then set `COOKIE_SAMESITE=lax`, `ALLOWED_ORIGINS=https://example.com`, and `NEXT_PUBLIC_COMMUNITY_API_URL=https://community.example.com/api/community`. Works in all browsers.

---

## 4. Frontend on Vercel

1. https://vercel.com -> **Add New -> Project** -> import the repo.
2. **Root Directory:** `apps/web`. Framework: Next.js (auto). Leave "Include source files outside of the Root Directory" **on**.
3. If install fails with workspace errors, set **Install Command** to `cd ../.. && pnpm install --frozen-lockfile`. Build Command stays `next build`.
4. Add these **Environment Variables** (Production and Preview) **before the first deploy**:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/traceveilX?retryWrites=true&w=majority
NEXT_PUBLIC_API_URL=https://traceveil-analysis.onrender.com
ANALYSIS_SERVICE_URL=https://traceveil-analysis.onrender.com
INTELLIGENCE_SERVICE_URL=https://traceveil-intelligence.onrender.com
TAKEDOWN_SERVICE_URL=https://traceveil-takedown.onrender.com
NEXT_PUBLIC_COMMUNITY_API_URL=https://traceveil-community.onrender.com/api/community
GROQ_API_KEY=gsk_xxx
# optional
NEXT_PUBLIC_LOGO_DEV_KEY=pk_xxx
NEXT_PUBLIC_QUICK_EXIT_URL=https://www.google.com
```
No trailing slashes. `NEXTAUTH_URL` and `NEXTAUTH_SECRET` are no longer needed (auth was removed). The committed `apps/web/.env.production` only holds build placeholders, and Vercel's variables override it.

5. **Deploy.** Note the URL, e.g. `https://traceveil.vercel.app`.
6. **Go back to Render** and set `ALLOWED_ORIGINS` on analysis, intelligence, takedown and community to exactly that URL (scheme + host, no path, no trailing slash). If you use a custom domain, list both separated by commas on analysis. On community, list only the origin(s) the site is served from. Render redeploys on save.

If you change any `NEXT_PUBLIC_*` variable later, **redeploy Vercel**. Those values are baked in at build time.

---

## 5. One-time community setup (rooms + first admin)

Run these from your computer, pointed at the Neon DB:

```bash
cd services/community
npm ci
printf 'DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require\n' > .env
npm run seed                      # creates the spaces and rooms
```
Open `https://<your-app>.vercel.app/community`, register an account, then:
```bash
npm run promote -- <your-handle> admin
```
Delete `services/community/.env` afterwards (it is git-ignored, but don't leave credentials around).

---

## 6. Verify (in this order)

```bash
curl https://traceveil-analysis.onrender.com/health
curl https://traceveil-intelligence.onrender.com/health
curl https://traceveil-takedown.onrender.com/health
curl https://traceveil-community.onrender.com/health
curl https://<your-app>.vercel.app/api/intelligence/xvideos.com
curl https://<your-app>.vercel.app/api/takedown/xvideos.com
```
Each `/health` should return `{"status":"ok",...}`. The first call to a sleeping service is slow, so retry once.

Then in the browser:
- Home page: **Support** and **Community** links stay on your domain.
- `/leak?demo=1`: runs a scan. DevTools -> Network shows calls to `onrender.com`, with no CORS errors.
- `/community`: register, sign in, send a message. DevTools -> Network -> WS shows `wss://...onrender.com/api/community/ws` as **101 Switching Protocols**.

---

## 7. What changed in the code (localhost clean-up)

| File | Change |
|---|---|
| `components/home/Home.tsx` | Support and Community links were hard-coded `http://localhost:3000/...`. Now `/support` and `/community`. |
| `components/support/QuickExit.tsx` | Read `NEXTAUTH_URL` in the browser, where it does not exist, so it always went to localhost. Now `NEXT_PUBLIC_QUICK_EXIT_URL`, default `/`. |
| `app/api/auth/[...nextauth]/route.ts` | Redirect uses the request URL, not a localhost fallback. |
| `lib/config.ts` (new) | One place for `API_URL` and `COMMUNITY_API_URL`. The localhost fallback only applies in `next dev`. |
| `leak/page.tsx`, `takedown/page.tsx`, `ContentTrace.tsx`, `LeakActionConsole.tsx`, `lib/community/api.ts` | Use `lib/config.ts` instead of their own localhost fallbacks. |
| `app/api/cases/[caseId]/route.ts` | Server-side calls prefer `ANALYSIS_SERVICE_URL`. |
| `services/analysis/main.py` | CORS origins were hard-coded (localhost and old domains). Now from `ALLOWED_ORIGINS`. |
| `services/community` (`env.ts`, `auth/routes.ts`) | New `COOKIE_SAMESITE` (`lax` default, `none` for cross-site hosting). Logout clears the cookie with matching attributes. |
| `render.yaml` (new) | Blueprint for the 4 backends. |
| `.env.example` files | Local and production values documented per service. |

Still intentionally localhost: the local-dev defaults in `.env.example`, `docker-compose.yml`, and `uvicorn --host 0.0.0.0` (that one is correct for hosting).

---

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Browser: CORS error calling `onrender.com` | `ALLOWED_ORIGINS` on that service is missing or does not exactly match the Vercel origin. No trailing slash, `https`. |
| Calls go to `localhost:8000` | `NEXT_PUBLIC_API_URL` was not set at build time. Set it and redeploy Vercel. |
| Community: "could not reach" / 403 `bad_origin` | Community `ALLOWED_ORIGINS` is wrong. |
| Community register works but you are signed out on refresh | Cookie not stored. Use `COOKIE_SAMESITE=none` with `COOKIE_SECURE=true`, or move to a shared custom domain. |
| Community won't boot: "COOKIE_SECURE must be true in production" | Set `COOKIE_SECURE=true`. |
| Community: DB SSL / connection error | Use the Neon direct string with `?sslmode=require`. |
| Chat shows no channels | Run `npm run seed` (step 5). |
| 503 "Intelligence service is not configured" | `INTELLIGENCE_SERVICE_URL` (or `TAKEDOWN_SERVICE_URL`) missing on Vercel. |
| Mongo: `bad auth` or timeouts | Wrong password, or Atlas Network Access not `0.0.0.0/0`. |
| `/api/analyst` returns "GROQ_API_KEY is not configured" | Add `GROQ_API_KEY` on Vercel and redeploy. |
| Deepfake score always 0 or "Unknown" | `HF_TOKEN` missing or invalid on analysis. |
| analysis crashes or restarts during scans | Out of 512 MB RAM. Keep concurrency at 1, or move analysis to a Hugging Face Docker Space (free, more RAM) and point `NEXT_PUBLIC_API_URL` and `ANALYSIS_SERVICE_URL` at it. |
| First request slow, then fine | Free-tier cold start. Normal. |
| pip build fails on Render | Confirm `PYTHON_VERSION=3.12.8`. |

---

## 9. Free-tier notes
- Vercel Hobby is for non-commercial use. If this becomes a funded or commercial product, move to a paid plan or Netlify or Cloudflare Pages.
- Neon and Atlas M0 are small. Community data older than `RETENTION_DAYS` is purged by the service itself.
- To reduce cold starts without burning Render hours, ping only **analysis** and **community** (for example UptimeRobot every 14 minutes, `/health`) during demo or judging windows, and stop afterwards.
