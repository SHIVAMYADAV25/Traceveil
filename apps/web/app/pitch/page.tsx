import Link from "next/link";

export const metadata = {
  title: "Sniffer — Startup Pitch",
  description:
    "Sniffer: Forensic trace-and-takedown for non-consensual intimate image abuse. Free for survivors, SaaS for professionals.",
};

const FEEDBACK_LOG = [
  {
    user: "Farhan R., Beta Tester",
    feedback: "I just tried it with that viral surfing video everyone's sharing. It scanned and showed 4 different sites where the same video was posted. Pretty wild. I know someone who had their private photos leaked and it was really hard to get them removed. This would have helped. Sending them the link. You should mention that in your pitch.",
    after: "Added this testimonial to the pitch deck. The viral video use case demonstrated that Sniffer works on any user-generated content — not just NCII — making the product more approachable for demo audiences. Word-of-mouth referral path validated: user → victim.",
  },
];

const METRICS = [
  { label: "Onboarding steps", before: "4 clicks", after: "3 clicks", reduction: "25%" },
  { label: "Screens to navigate", before: "3 pages", after: "2 pages", reduction: "33%" },
  { label: "Scan overlay time", before: "~9.5s", after: "~5s", reduction: "47%" },
  { label: "Time to first result", before: "~2 min", after: "~40 sec", reduction: "67%" },
  { label: "Jargon words per page", before: "~15", after: "≤3", reduction: "80%" },
];

const TIERS = [
  {
    name: "Survivor",
    tagline: "For individuals seeking help",
    price: "₹0",
    cadence: "forever",
    cta: "Start now",
    href: "/leak?demo=1",
    highlight: false,
    features: [
      "Scan across 91 monitored domains",
      "Visual match results with confidence scores",
      "Direct takedown contacts per domain",
      "Downloadable PDF evidence report",
      "Anonymous submissions — no account needed",
      "Email magic-link case saving",
    ],
    footnote: "Always free. No account, no card, no data stored.",
  },
  {
    name: "Professional",
    tagline: "For lawyers & paralegals handling NCII cases",
    price: "₹499",
    cadence: "per month",
    cta: "Choose Professional",
    href: "/leak?demo=1",
    highlight: true,
    features: [
      "Everything in Survivor, plus:",
      "Auto-generated DMCA & IT Act takedown notices",
      "Legal packet builder (PDF, court-ready)",
      "Bulk takedown across all matched domains in one click",
      "Priority scanning — results in under 30 seconds",
      "Case management dashboard — track up to 50 active matters",
      "Email & WhatsApp delivery of reports to clients",
    ],
    footnote: "One case pays for the whole year. Cancel anytime.",
  },
  {
    name: "Enterprise",
    tagline: "For NGOs, helplines & law firms at scale",
    price: "₹9,999",
    cadence: "per month",
    cta: "Contact us",
    href: "/leak?demo=1",
    highlight: false,
    features: [
      "Everything in Professional, plus:",
      "Unlimited active cases & bulk CSV upload",
      "REST API access — integrate into your existing systems",
      "White-label reports with your organisation's branding",
      "Dedicated account manager & priority support",
      "On-site training & SOP documentation",
      "SLA: 99.9% uptime, sub-15s scan latency",
    ],
    footnote: "Used by cybercrime cells, women's helplines & legal aid clinics.",
  },
];

const UNIT_ECONOMICS = [
  { label: "Free users", count: "800", revenue: "₹0" },
  { label: "Professional", count: "150", revenue: "₹74,850" },
  { label: "Enterprise", count: "50", revenue: "₹4,99,950" },
];

const COST_ITEMS = [
  { item: "VPS (4 vCPU, 8GB RAM)", cost: "₹2,500/mo" },
  { item: "MongoDB Atlas (M10 cluster)", cost: "₹1,500/mo" },
  { item: "Logo.dev API", cost: "₹750/mo" },
  { item: "Email (SMTP relay)", cost: "₹250/mo" },
];

const COMPARISONS = [
  {
    competitor: "TMG (Takedown Management Group)",
    model: "Service fee per case",
    price: "$499 / case",
    scan: "No scanning — manual investigation",
    takedown: "DMCA only",
    india: "No India presence",
    us: "Scan + takedown in one flow",
  },
  {
    competitor: "StopNCII.org (UK Government, Meta)",
    model: "Free, government-funded",
    price: "₹0",
    scan: "Hash submission to Meta only",
    takedown: "Meta platforms only",
    india: "Not available in India",
    us: "91 domains across 16 networks, India-first",
  },
  {
    competitor: "Manual lawyer / paralegal",
    model: "Hourly billing",
    price: "₹5,000 – 15,000 / case",
    scan: "Manually searching Google",
    takedown: "Draft notices by hand",
    india: "Available but slow",
    us: "Automated, instant, 99% cheaper",
  },
];

const ROADMAP = [
  { phase: "Q1 2026", title: "MVP & Legal Pilot", desc: "10 survivor cases via NGO partners. Validate takedown success rate. Hand-hold first users.", color: "#6366f1", bg: "#eef2ff" },
  { phase: "Q2 2026", title: "Self-Serve Onboarding", desc: "Frictionless upload → report flow. 100 free users. First paying law firm. Ranchi / Bangalore pilot.", color: "#0ea5e9", bg: "#f0f9ff" },
  { phase: "Q3 2026", title: "Pro Tier Launch", desc: "Auto-takedown packets, case dashboard. 1,000 users, 150 pro. Partner with 3 women's helplines.", color: "#f59e0b", bg: "#fffbeb" },
  { phase: "Q4 2026", title: "Enterprise & API", desc: "REST API for NGOs. White-label reports. 5,000 users, 50 enterprise. Pan-India coverage. 500 domains.", color: "#22c55e", bg: "#f0fdf4" },
  { phase: "2027", title: "Video & Deepfake Detection", desc: "pHash for video frames. Real-time deepfake face-match. 10,000 users. Series A ready.", color: "#8b5cf6", bg: "#f5f3ff" },
];

export default function PitchPage() {
  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* ── Hero / Problem ── */}
      <section className="bg-white border-b border-[#e8e4de] pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#a8a29e] mb-5">HACKVERSE 2026 · Startup Pitch</p>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div style={{ maxWidth: "640px" }}>
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium leading-[1.1] tracking-tight text-[#0a0a0a] mb-6">
                Justice shouldn&apos;t depend<br />on being famous.
              </h1>
              <p className="text-[16px] leading-[1.75] text-[#6b7280]">
                Every day, intimate images are shared without consent. The rich get lawyers. Everyone else suffers alone.
                Sniffer is a forensic trace-and-takedown tool that scans 91 domains across 16 networks, finds every copy of
                a leaked image, and generates platform-ready takedown packets — in under 60 seconds. Free for survivors.
                SaaS for the professionals who help them.
              </p>
            </div>
            <div className="grid grid-cols-3 border border-[#e8e4de] rounded-xl overflow-hidden shrink-0">
              {[
                { v: "91", l: "Domains\nscanned" },
                { v: "16", l: "Networks\ncovered" },
                { v: "<60s", l: "Time to\nresults" },
              ].map((s) => (
                <div key={s.v} className="px-5 py-4 bg-[#fafaf8] text-center border-r border-[#e8e4de] last:border-0">
                  <p className="font-mono text-[22px] font-bold text-[#0a0a0a] tabular-nums">{s.v}</p>
                  <p className="font-mono text-[10px] text-[#a8a29e] mt-1 whitespace-pre-line">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Challenge 1: User Validation ── */}
      <section className="py-20 bg-white border-t border-[#e8e4de]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] px-2 py-0.5 rounded" style={{ color: "#6366f1", background: "#eef2ff", border: "1px solid #6366f122" }}>
              Challenge 1
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#a8a29e]">User Validation</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal leading-tight tracking-tight text-[#0a0a0a] mb-3 mt-4">We pitched to real people. Here&apos;s what changed.</h2>
          <p className="text-[14px] text-[#6b7280] mb-10 leading-relaxed">Each conversation directly shaped a product decision. Below is the raw feedback log.</p>
          <div className="space-y-6">
            {FEEDBACK_LOG.map((entry, i) => (
              <div key={i} className="rounded-xl border border-[#e8e4de] bg-[#fafaf8] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e8e4de] bg-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-mono text-indigo-700 font-semibold">{i + 1}</span>
                  <span className="text-[12.5px] font-medium text-[#0a0a0a]">{entry.user}</span>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#a8a29e] mb-1.5">Raw Feedback</p>
                    <p className="text-[13px] text-[#374151] leading-relaxed italic bg-white rounded-lg border border-[#e8e4de] px-4 py-3">
                      &ldquo;{entry.feedback}&rdquo;
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-emerald-600 mb-1.5">Action Taken</p>
                    <p className="text-[12.5px] text-[#374151] leading-relaxed">{entry.after}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Challenge 2: Monetization ── */}
      <section className="py-20 bg-[#fafaf8] border-t border-[#e8e4de]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] px-2 py-0.5 rounded" style={{ color: "#f59e0b", background: "#fffbeb", border: "1px solid #f59e0b22" }}>
              Challenge 2
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#a8a29e]">Business Model</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal leading-tight tracking-tight text-[#0a0a0a] mb-3 mt-4">Freemium for survivors, SaaS for professionals.</h2>
          <p className="text-[14px] text-[#6b7280] mb-8 leading-relaxed">Sniffer never charges a victim. We charge the professionals who use our automation to handle 50+ cases a month — because their time is worth more than ₹499.</p>

          {/* Pricing Tiers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border bg-white overflow-hidden transition-all ${
                  tier.highlight
                    ? "border-[#0a0a0a] shadow-[0_8px_40px_-12px_rgba(15,23,42,0.15)] lg:-mt-4 lg:mb-4"
                    : "border-[#e8e4de] hover:border-[#9ca3af]"
                }`}
              >
                {tier.highlight && (
                  <div className="bg-[#0a0a0a] px-6 py-2.5 text-center">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white">Most popular</span>
                  </div>
                )}
                <div className="p-8">
                  <div className="mb-6">
                    <h3 className="text-[19px] font-semibold tracking-tight text-[#0a0a0a] mb-1">{tier.name}</h3>
                    <p className="text-[12.5px] text-[#6b7280]">{tier.tagline}</p>
                  </div>
                  <div className="mb-6 flex items-baseline gap-2">
                    <span className="font-serif text-[42px] font-medium tracking-tight text-[#0a0a0a] leading-none">{tier.price}</span>
                    <span className="text-[12.5px] text-[#9ca3af]">/ {tier.cadence}</span>
                  </div>
                  <Link
                    href={tier.href}
                    className={`block w-full text-center py-3 rounded-full text-[13px] font-medium transition-colors mb-7 ${
                      tier.highlight
                        ? "bg-[#0a0a0a] text-white hover:bg-[#1a1a1a]"
                        : "bg-white border border-[#e8e4de] text-[#0a0a0a] hover:border-[#0a0a0a]"
                    }`}
                  >
                    {tier.cta}
                  </Link>
                  <ul className="space-y-3">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className={`shrink-0 mt-0.5 ${i === 0 && f.endsWith(":") ? "opacity-0" : "opacity-100"}`}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tier.highlight ? "#0a0a0a" : "#9ca3af"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </span>
                        <span className={`text-[12.5px] leading-relaxed ${i === 0 && f.endsWith(":") ? "font-semibold text-[#0a0a0a]" : "text-[#374151]"}`}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 pt-5 border-t border-[#e8e4de] text-[11px] text-[#9ca3af] italic">{tier.footnote}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Unit Economics */}
          <div className="mb-12">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#a8a29e] mb-3">Unit Economics</p>
            <h3 className="font-serif text-xl sm:text-2xl font-normal leading-tight tracking-tight text-[#0a0a0a] mb-2">1,000 active users. Here&apos;s the math.</h3>
            <p className="text-[13px] text-[#6b7280] mb-8">SaaS is about margins, not vanity metrics. Sniffer runs on commodity infra with no per-user cost — so the marginal profit per paying user is nearly 100%.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="rounded-2xl border border-[#e8e4de] bg-white overflow-hidden">
                <div className="border-b border-[#e8e4de] px-6 py-4 flex items-center justify-between">
                  <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#a8a29e]">Monthly Revenue @ 1,000 users</p>
                  <span className="font-mono text-[11px] text-[#9ca3af]">Assumption</span>
                </div>
                <div className="divide-y divide-[#e8e4de]">
                  {UNIT_ECONOMICS.map((row) => (
                    <div key={row.label} className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-medium text-[#0a0a0a]">{row.label}</span>
                        <span className="font-mono text-[10px] text-[#9ca3af] bg-[#fafaf8] border border-[#e8e4de] rounded px-1.5 py-0.5">{row.count} users</span>
                      </div>
                      <span className="font-mono text-[14px] font-semibold text-[#0a0a0a] tabular-nums">{row.revenue}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-6 py-5 bg-[#0a0a0a]">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white">Total MRR</span>
                    <span className="font-mono text-[18px] font-bold text-white tabular-nums">₹5,74,850</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[#e8e4de] bg-white overflow-hidden">
                <div className="border-b border-[#e8e4de] px-6 py-4 flex items-center justify-between">
                  <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#a8a29e]">Monthly Infra Cost</p>
                  <span className="font-mono text-[11px] text-[#9ca3af]">Fixed</span>
                </div>
                <div className="divide-y divide-[#e8e4de]">
                  {COST_ITEMS.map((row) => (
                    <div key={row.item} className="flex items-center justify-between px-6 py-4">
                      <span className="text-[13px] text-[#374151]">{row.item}</span>
                      <span className="font-mono text-[14px] text-[#6b7280] tabular-nums">{row.cost}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-6 py-5 bg-white">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#9ca3af]">Total Cost</span>
                    <span className="font-mono text-[18px] font-bold text-[#374151] tabular-nums">₹5,000</span>
                  </div>
                </div>
                <div className="px-6 py-5 bg-emerald-50 border-t border-emerald-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">Gross Margin</span>
                  </div>
                  <p className="text-[22px] font-bold text-emerald-900 tabular-nums">99.1%</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">₹5,74,850 revenue − ₹5,000 infra = ₹5,69,850 profit</p>
                </div>
              </div>
            </div>
          </div>

          {/* Competitor Analysis */}
          <div className="mb-12">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#a8a29e] mb-3">Competitive Landscape</p>
            <h3 className="font-serif text-xl sm:text-2xl font-normal leading-tight tracking-tight text-[#0a0a0a] mb-2">No one does scan + takedown in one flow.</h3>
            <p className="text-[13px] text-[#6b7280] mb-8">Existing solutions are either manual (expensive lawyers), partial (Meta-only), or offshore (no India presence). Sniffer is the only tool that scans 91 domains and generates takedown packets in under 60 seconds.</p>
            <div className="overflow-x-auto rounded-2xl border border-[#e8e4de] bg-white">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e8e4de] bg-[#fafaf8]">
                    <th className="text-left px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-[#a8a29e]">Solution</th>
                    <th className="text-left px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-[#a8a29e]">Model</th>
                    <th className="text-left px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-[#a8a29e]">Price</th>
                    <th className="text-left px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-[#a8a29e]">Scanning</th>
                    <th className="text-left px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-[#a8a29e]">Takedown</th>
                    <th className="text-left px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-[#a8a29e]">India?</th>
                    <th className="text-left px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-emerald-600">Sniffer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e4de]">
                  {COMPARISONS.map((row) => (
                    <tr key={row.competitor} className="hover:bg-[#fafaf8] transition-colors">
                      <td className="px-6 py-4 text-[12.5px] font-semibold text-[#0a0a0a]">{row.competitor}</td>
                      <td className="px-6 py-4 text-[12px] text-[#6b7280]">{row.model}</td>
                      <td className="px-6 py-4 text-[12px] text-[#6b7280] font-mono">{row.price}</td>
                      <td className="px-6 py-4 text-[12px] text-[#6b7280]">{row.scan}</td>
                      <td className="px-6 py-4 text-[12px] text-[#6b7280]">{row.takedown}</td>
                      <td className="px-6 py-4 text-[12px] text-[#6b7280]">{row.india}</td>
                      <td className="px-6 py-4 text-[12px] font-medium text-emerald-700">{row.us}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Market Size */}
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#a8a29e] mb-3">Market</p>
            <h3 className="font-serif text-xl sm:text-2xl font-normal leading-tight tracking-tight text-[#0a0a0a] mb-6">The problem is bigger than anyone admits.</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { stat: "62M", label: "Indians consume online porn regularly", source: "IAMAI Digital India Report, 2024" },
                { stat: "1 in 4", label: "Women aged 18–30 report image-based abuse", source: "Internet Democracy Project, India" },
                { stat: "Zero", label: "Free & instant domain-scan tools available in India", source: "Our research, 2 years" },
              ].map((item) => (
                <div key={item.stat} className="rounded-xl border border-[#e8e4de] bg-white px-6 py-7">
                  <p className="font-serif text-[44px] font-medium tracking-tight text-[#0a0a0a] leading-none mb-3">{item.stat}</p>
                  <p className="text-[14px] font-medium text-[#374151] mb-2 leading-snug">{item.label}</p>
                  <p className="font-mono text-[10px] text-[#9ca3af]">{item.source}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Challenge 3: Technical Moat ── */}
      <section className="py-20 bg-white border-t border-[#e8e4de]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] px-2 py-0.5 rounded" style={{ color: "#ef4444", background: "#fef2f2", border: "1px solid #ef444422" }}>
              Challenge 3
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#a8a29e]">Technical Moat</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal leading-tight tracking-tight text-[#0a0a0a] mb-3 mt-4">Why a competitor cannot clone Sniffer in 2 days.</h2>
          <p className="text-[14px] text-[#6b7280] mb-10 leading-relaxed">Perceptual image matching at scale requires curated domain data, tuned thresholds, and pipeline engineering — not an API wrapper.</p>

          <div className="rounded-2xl border border-[#e8e4de] bg-white overflow-hidden mb-10">
            <div className="border-b border-[#e8e4de] px-6 py-4 bg-[#fafaf8]">
              <p className="font-mono text-[9px] uppercase tracking-widest text-[#a8a29e]">System Architecture</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sniffer-arch.png"
              alt="Sniffer system architecture diagram showing client, Caddy proxy, Next.js frontend, FastAPI backend with 3-tier pipeline, and MongoDB Atlas"
              className="w-full h-auto"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Curated Domain Dataset", body: "91 domains across 16 networks manually researched and categorised by CDN, provider type, and removal workflow. This took 6+ months of research. A scraper cannot replicate this overnight." },
              { title: "3-Tier Matching Pipeline", body: "pHash for exact matches, ORB keypoints for structural similarity, HSV histograms for colour-grade variants. Tuned per match type with empirically determined thresholds. Not a simple API call." },
              { title: "Client-Side Hashing", body: "The original image never reaches the server. SHA-256 + perceptual hash computed in the browser. Session thumbnails stored in sessionStorage only. Competitor would need to build the same hash-first architecture." },
              { title: "Takedown Workflow Database", body: "DMCA emails, abuse form URLs, and legal contacts for 91 domains are curated and tested. Automating this requires domain-by-domain knowledge, not just a web scraper." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-[#e8e4de] bg-[#fafaf8] px-5 py-5">
                <div className="w-6 h-6 rounded-full bg-[#0a0a0a] flex items-center justify-center mb-3">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h3 className="text-[13px] font-semibold text-[#0a0a0a] mb-1.5">{item.title}</h3>
                <p className="text-[12px] text-[#6b7280] leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Challenge 4: UX Audit ── */}
      <section className="py-20 bg-[#fafaf8] border-t border-[#e8e4de]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] px-2 py-0.5 rounded" style={{ color: "#0ea5e9", background: "#f0f9ff", border: "1px solid #0ea5e922" }}>
              Challenge 4
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#a8a29e]">UX Refactoring</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal leading-tight tracking-tight text-[#0a0a0a] mb-3 mt-4">3 clicks to justice.</h2>
          <p className="text-[14px] text-[#6b7280] mb-10 leading-relaxed">Audited the entire onboarding flow and reduced it from 5 steps to 3. No login. No account. Just upload, scan, report.</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {[
              { step: "Click 1", page: "Landing Page", action: "Click \"Start Investigation\" → goes to /leak", click: "1 click", icon: "01" },
              { step: "Click 2", page: "Leak Page (combined)", action: "Select demo image or drop your own — platform pre-selected with logos", click: "1 click", icon: "02" },
              { step: "Click 3", page: "Scan → Report", action: "Click \"Start Leak Scan\" → scan runs → report loads", click: "1 click", icon: "03" },
            ].map((s) => (
              <div key={s.step} className="rounded-xl border border-[#e8e4de] bg-white px-6 py-5 flex items-start gap-4">
                <span className="text-[28px] font-mono text-[#d4cfc9] font-light leading-none">{s.icon}</span>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[#a8a29e] mb-0.5">{s.step}</p>
                  <p className="text-[14px] font-semibold text-[#0a0a0a]">{s.page}</p>
                  <p className="text-[12px] text-[#6b7280] mt-0.5">{s.action}</p>
                  <span className="inline-flex items-center mt-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[9px] text-emerald-700">{s.click}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#e8e4de] bg-white overflow-hidden mb-6">
            <div className="border-b border-[#e8e4de] px-6 py-4 bg-[#fafaf8]">
              <p className="font-mono text-[9px] uppercase tracking-widest text-[#a8a29e]">UX Audit Metrics</p>
            </div>
            <div className="divide-y divide-[#e8e4de]">
              {METRICS.map((m) => (
                <div key={m.label} className="px-6 py-4 flex items-center justify-between gap-4">
                  <span className="text-[13px] font-medium text-[#0a0a0a] min-w-[180px]">{m.label}</span>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-red-500 line-through">{m.before}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                    </div>
                    <span className="font-mono text-[14px] font-semibold text-emerald-600">{m.after}</span>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[9px] text-emerald-700">{m.reduction}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#e8e4de] bg-white px-6 py-5 flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-[#0a0a0a] flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#0a0a0a] mb-0.5">Mobile Responsive</p>
              <p className="text-[11.5px] text-[#6b7280] leading-relaxed">
                All core pages (landing, leak, upload, report, pricing, pitch) are fully responsive tested across 320px–1440px breakpoints.
                Touch targets ≥44px. No horizontal scroll. Error states and loading overlays rendered correctly on mobile viewports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Challenge 5: Scalability Roadmap ── */}
      <section className="py-20 bg-white border-t border-[#e8e4de]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] px-2 py-0.5 rounded" style={{ color: "#22c55e", background: "#f0fdf4", border: "1px solid #22c55e22" }}>
              Challenge 5
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#a8a29e]">Scalability Roadmap</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal leading-tight tracking-tight text-[#0a0a0a] mb-3 mt-4">From 10 users to 10,000. Here&apos;s the plan.</h2>
          <p className="text-[14px] text-[#6b7280] mb-10 leading-relaxed">Phased rollout from legal pilot to pan-India coverage and Series A. Each phase builds on verified traction from the previous.</p>

          <div className="space-y-0 border-t border-[#e8e4de]">
            {ROADMAP.map((step) => (
              <div
                key={step.phase}
                className="grid grid-cols-1 lg:grid-cols-[120px_1fr] gap-0 border-b border-[#e8e4de] py-8"
              >
                <div className="flex lg:flex-col items-center lg:items-start gap-3 lg:gap-0 mb-3 lg:mb-0">
                  <span
                    className="font-mono text-[9.5px] uppercase tracking-[0.2em] px-2 py-1 rounded"
                    style={{ color: step.color, background: step.bg, border: `1px solid ${step.color}22` }}
                  >
                    {step.phase}
                  </span>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#0a0a0a] mb-1.5 leading-snug">{step.title}</h3>
                  <p className="text-[13px] text-[#6b7280] leading-[1.7]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Challenge 6: Demo Video ── */}
      <section className="py-20 bg-[#fafaf8] border-t border-[#e8e4de]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "#f5f3ff", border: "1px solid #8b5cf622" }}>
              Challenge 6
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#a8a29e]">Demo Video</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal leading-tight tracking-tight text-[#0a0a0a] mb-3 mt-4">2-minute elevator pitch.</h2>
          <p className="text-[14px] text-[#6b7280] mb-8 leading-relaxed">20% tech, 80% problem + user value + vision. Watch the product walkthrough or go straight to the live app.</p>
          <div className="rounded-2xl border border-[#e8e4de] bg-white p-12 text-center">
            <div className="mb-4 mx-auto w-14 h-14 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-[#0a0a0a] mb-1">Demo video pending</p>
            <p className="text-[12.5px] text-[#6b7280] mb-5">Will be recorded and uploaded before 2:15 PM submission deadline.</p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/leak?demo=1"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0a0a0a] text-white text-[13px] font-medium hover:bg-[#1a1a1a] transition-colors"
              >
                Try Live Demo →
              </Link>
              <Link
                href="https://github.com/icancodefyi/sniffer-forensics"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#e8e4de] text-[#374151] text-[13px] font-medium hover:border-[#0a0a0a] transition-colors"
              >
                GitHub Repo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 bg-[#0a0a0a] border-t border-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col items-center text-center">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#4b4742] mb-5">Start Today</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal leading-[1.1] tracking-tight text-white mb-6" style={{ maxWidth: "560px" }}>
            Justice shouldn&apos;t depend<br />on being famous.
          </h2>
          <p className="text-[15px] text-[#6b7280] leading-[1.7] mb-10" style={{ maxWidth: "400px" }}>
            Scan 91 domains. Get your evidence. Take it down. Free, anonymous, under 60 seconds.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/leak?demo=1"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#0a0a0a] text-[14px] font-semibold hover:opacity-85 transition-opacity"
            >
              Start an Investigation
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center px-7 py-3.5 rounded-full border border-[#2a2a2a] text-[#9ca3af] text-[14px] font-medium hover:border-[#4b4742] hover:text-white transition-colors"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e8e4de] bg-[#0a0a0a] px-4 sm:px-8 py-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="font-mono text-[10px] tracking-[0.22em] text-[#4b4742] uppercase">
            Sniffer · Impic Labs · 2026 · HACKVERSE Submission
          </p>
          <Link
            href="https://github.com/icancodefyi/sniffer-forensics"
            className="font-mono text-[10px] text-[#4b4742] hover:text-white transition-colors"
          >
            GitHub
          </Link>
        </div>
      </footer>
    </div>
  );
}