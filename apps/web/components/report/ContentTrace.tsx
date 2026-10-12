"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import type { DiscoveryResult } from "@/components/report/types";

const LOGO_KEY = process.env.NEXT_PUBLIC_LOGO_DEV_KEY ?? "pk_FRWLyzqbRcmEUk2DRouw0w";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const CATEGORY_LABELS: Record<string, { label: string; chip: string }> = {
  verified: { label: "Video verified", chip: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  strong: { label: "Strong match", chip: "border-orange-200 bg-orange-50 text-orange-700" },
  possible: { label: "Possible match", chip: "border-indigo-200 bg-indigo-50 text-indigo-700" },
};

const VIDEO_TYPE_LABELS: Record<string, string> = {
  direct: "Video file",
  stream: "Stream playlist",
  embed: "Embedded player",
};

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const MATCH_LABELS: Record<string, string> = {
  exact: "Exact visual match",
  near_duplicate: "Near-duplicate",
  structural: "Structural match",
  probable: "Probable match",
};

const VARIANT_LABELS: Record<string, string> = {
  mirrored: "mirrored copy",
  crop_16x9: "cropped 16:9",
  crop_4x3: "cropped 4:3",
  crop_1x1: "cropped square",
  crop_9x16: "cropped vertical",
};

const MATCH_CLASSES: Record<string, string> = {
  exact: "bg-red-50 border-red-200 text-red-700",
  near_duplicate: "bg-amber-50 border-amber-200 text-amber-700",
  structural: "bg-orange-50 border-orange-200 text-orange-700",
  probable: "bg-indigo-50 border-indigo-200 text-indigo-700",
};

function formatDomainLabel(value?: string | null) {
  if (!value) return "unknown";
  return value.trim().toLowerCase();
}

function PlatformLogo({ domain, size = 40 }: { domain?: string | null; size?: number }) {
  const normalizedDomain = formatDomainLabel(domain);
  const [logoFailed, setLogoFailed] = useState(false);

  if (!domain || logoFailed) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-[#e8e4de] bg-[#f5f3f0] shrink-0"
        style={{ width: size, height: size }}
      >
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#6b7280]">
          {normalizedDomain.slice(0, 2)}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={`https://img.logo.dev/${normalizedDomain}?token=${LOGO_KEY}&size=64`}
      alt={`${normalizedDomain} logo`}
      width={size}
      height={size}
      onError={() => setLogoFailed(true)}
      className="rounded-xl border border-[#e8e4de] bg-white object-contain p-1.5 shrink-0"
      unoptimized
    />
  );
}

interface Props {
  caseId: string;
}

export function ContentTrace({ caseId }: Props) {
  const { t } = useTranslation();
  const [trace, setTrace] = useState<DiscoveryResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // Real data only: poll the scan until it finishes, and say so honestly if it cannot be reached.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let notFound = 0;
    let failures = 0;

    async function poll() {
      try {
        const res = await fetch(`${API_URL}/api/analysis/${caseId}/discover`, { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 404) {
          // the record can lag the redirect by a moment; after a few tries it genuinely does not exist
          notFound += 1;
          if (notFound >= 4) {
            setProblem("No scan was found for this case. It may have expired. Please run a new scan.");
            return;
          }
          timer = setTimeout(poll, 2000);
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        failures = 0;
        const data = (await res.json()) as DiscoveryResult;
        if (cancelled) return;
        setProblem(null);
        setTrace(data);
        if (data.status === "running" || data.status === "queued") timer = setTimeout(poll, 3000);
      } catch {
        if (cancelled) return;
        failures += 1;
        if (failures >= 5) {
          setProblem("Could not reach the scan service. Check your connection and refresh this page.");
          return;
        }
        timer = setTimeout(poll, 4000);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [caseId]);

  if (problem && !trace) return <NoticeCard tone="warn" title="Scan unavailable" message={problem} />;

  if (!trace) {
    return (
      <div className="rounded-xl border border-[#e8e4de] bg-white px-6 py-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <p className="text-[12px] font-medium text-[#0a0a0a]">Connecting to your scan…</p>
        </div>
        <div className="space-y-3 animate-pulse">
          <div className="h-3 w-48 rounded bg-[#f0ede8]" />
          <div className="h-16 w-full rounded-xl bg-[#f0ede8]" />
        </div>
      </div>
    );
  }

  if (trace.status === "failed") {
    return <NoticeCard tone="warn" title="The scan did not finish" message={trace.error ?? "Something went wrong while scanning. Please run a new scan."} />;
  }

  if (trace.status === "running" || trace.status === "queued") {
    return (
      <div className="rounded-xl border border-[#e8e4de] bg-white px-6 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <p className="text-[13px] font-medium text-[#0a0a0a]">Scan in progress</p>
        </div>
        <div className="flex flex-wrap gap-5 mb-3">
          <Stat value={String(trace.pages_scanned)} label="Pages crawled" />
          <Stat value={String(trace.candidates_evaluated)} label="Images compared" />
          <Stat value={String(trace.domains_with_matches ?? 0)} label="Sites with a match so far" />
          {trace.input_type === "video" && <Stat value={String(trace.reference_frames ?? 0)} label="Key frames from your video" />}
        </div>
        <p className="text-[12px] text-[#6b7280] leading-relaxed">
          {trace.current_domain ? `Currently checking ${trace.current_domain}. ` : ""}
          Checking {trace.target_domains.length || "many"} sites can take several minutes. Keep this page open; results appear here when the scan finishes.
        </p>
      </div>
    );
  }

  const coverage = trace.coverage ?? {};
  const couldNotCheck = (coverage.blocked ?? 0) + (coverage.unreachable ?? 0) + (coverage.skipped ?? 0);
  const totalDomains = trace.target_domains.length;
  const summaryStats = [
    { value: totalDomains ? `${trace.domains_scanned}/${totalDomains}` : String(trace.domains_scanned), label: "Sites reachable" },
    { value: String(trace.pages_scanned), label: "Pages crawled" },
    { value: String(trace.candidates_evaluated), label: "Images compared" },
  ];

  return (
    <div className="rounded-2xl border border-[#e8e4de] bg-white overflow-hidden shadow-[0_4px_24px_-12px_rgba(15,23,42,0.06)]">

      {/* ── Header ── */}
      <div className="border-b border-[#e8e4de] px-6 py-5 bg-gradient-to-br from-[#fafaf8] to-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-[#0a0a0a] flex items-center justify-center shrink-0">
                <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              </div>
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#a8a29e]">
                {t.report.distributionTrace}
              </p>
            </div>
            <h3 className="font-serif text-[20px] font-medium text-[#0a0a0a] tracking-tight leading-snug mb-1">
              Visual match scan
            </h3>
            <p className="text-[13px] text-[#6b7280] leading-relaxed max-w-md">
              Perceptual fingerprinting across high-risk domains and known mirror networks.
            </p>
          </div>
          <div className="shrink-0">
            {trace.direct_matches.length > 0 ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-red-700">
                  {trace.direct_matches.length} match{trace.direct_matches.length > 1 ? "es" : ""}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-[#e8e4de] bg-[#fafaf8] px-3.5 py-1.5">
                <span className="w-2 h-2 rounded-full bg-[#9ca3af]" />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#6b7280]">No matches found</span>
              </div>
            )}
          </div>
        </div>

        {/* Scan stats row */}
        <div className="mt-5 flex flex-wrap gap-3">
          {summaryStats.map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-1.5">
              <span className="font-mono text-[16px] font-bold text-[#0a0a0a] tabular-nums">{stat.value}</span>
              <span className="text-[11px] text-[#9ca3af]">{stat.label}</span>
            </div>
          ))}
          {trace.prioritized_network && (
            <div className="flex items-center gap-1.5 ml-auto">
              <svg width="11" height="11" fill="none" stroke="#6366f1" strokeWidth="2.5" viewBox="0 0 24 24">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="text-[11px] font-medium text-indigo-600">Priority: {trace.prioritized_network}</span>
            </div>
          )}
        </div>
      </div>

      {/* Coverage: what a "no match" result does and does not cover */}
      {(couldNotCheck > 0 || (coverage.no_images ?? 0) > 0 || trace.truncated) && (
        <div className="border-b border-[#e8e4de] bg-amber-50/50 px-6 py-3">
          <p className="text-[12px] leading-relaxed text-amber-900">
            {trace.truncated ? "This scan stopped early, so it is partial. " : ""}
            Compared images on {coverage.checked ?? 0} site{(coverage.checked ?? 0) === 1 ? "" : "s"}.
            {(coverage.no_images ?? 0) > 0 ? ` ${coverage.no_images} loaded but showed no images (they may need JavaScript).` : ""}
            {(coverage.blocked ?? 0) > 0 ? ` ${coverage.blocked} blocked our scan.` : ""}
            {(coverage.unreachable ?? 0) > 0 ? ` ${coverage.unreachable} could not be reached.` : ""}
            {(coverage.skipped ?? 0) > 0 ? ` ${coverage.skipped} were not finished.` : ""}
            {" "}Results only cover the sites we could check.
          </p>
        </div>
      )}

      {/* ── Body ── */}
      <div className="px-6 py-6 space-y-8">

        {trace.direct_matches.length === 0 && (
          <div className="rounded-xl border border-[#e8e4de] bg-[#fafaf8] px-5 py-4">
            <p className="text-[13px] font-semibold text-[#0a0a0a] mb-1">No visual matches on the sites we could check</p>
            <p className="text-[12px] text-[#6b7280] leading-relaxed">
              This does not prove your image is not online. We only search a fixed list of sites, and some could not be checked (see above).
              If you know where it appeared, you can still use the removal tools for that site.
            </p>
          </div>
        )}

        {/* Direct matches */}
        {trace.direct_matches.length > 0 && (
          <div>
            {/* Urgency banner */}
            <div className="mb-6 rounded-xl border border-red-100 bg-gradient-to-r from-red-50 to-rose-50/40 px-5 py-4 flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
                <svg width="17" height="17" fill="none" stroke="#dc2626" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
                  <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-red-900 tracking-tight">
                  Possible copies found
                </p>
                <p className="text-[12px] text-red-700 mt-0.5 leading-relaxed">
                  {trace.direct_matches.length} page{trace.direct_matches.length > 1 ? "s" : ""} contain an image that visually matches yours.
                  Review each page, then use the removal tools below.
                </p>
              </div>
            </div>

            {/* Section label */}
            <div className="flex items-center gap-3 mb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#a8a29e]">
                Matches found
              </p>
              <span className="font-mono text-[10px] text-[#0a0a0a] font-semibold bg-[#f0ede8] rounded px-1.5 py-0.5">
                {trace.direct_matches.length}
              </span>
              <div className="flex-1 h-px bg-[#e8e4de]" />
            </div>

            {/* Match cards */}
            <div className="space-y-4">
              {trace.direct_matches.map((match, idx) => (
                <MatchCard key={`${match.domain}-${idx}`} match={match} />
              ))}
            </div>
          </div>
        )}

        {/* Related domains */}
        {trace.related_domains && trace.related_domains.length > 0 && (
          <div>
            {/* Section label */}
            <div className="flex items-center gap-3 mb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#a8a29e]">
                Related mirror domains
              </p>
              <span className="font-mono text-[10px] text-[#0a0a0a] font-semibold bg-[#f0ede8] rounded px-1.5 py-0.5">
                {trace.related_domains.length}
              </span>
              <div className="flex-1 h-px bg-[#e8e4de]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trace.related_domains.map((domain, idx) => (
                <div
                  key={`${domain.network}-${idx}`}
                  className="group rounded-xl border border-[#e8e4de] bg-[#fafaf8] p-4 hover:border-[#9ca3af] hover:bg-white transition-all"
                >
                  <div className="flex items-start gap-3">
                    <PlatformLogo domain={domain.domain} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[13px] font-semibold text-[#0a0a0a] tracking-tight">{domain.domain}</p>
                      </div>
                      <p className="font-mono text-[10px] text-[#9ca3af] uppercase tracking-wider mb-2">{domain.network}</p>
                      <p className="text-[11.5px] text-[#6b7280] leading-relaxed">{domain.reason}</p>
                    </div>
                    <svg width="14" height="14" fill="none" stroke="#c4bdb5" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0 mt-1 group-hover:stroke-[#0a0a0a] transition-colors">
                      <path d="M7 7h10v10M17 7L7 17" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Match card ────────────────────────────────────────────────────────── */

function MatchCard({ match }: { match: DiscoveryResult["direct_matches"][number] }) {
  const isExact = match.match_type === "exact";
  const accent = isExact ? "#dc2626" : match.confidence >= 85 ? "#d97706" : "#6366f1";
  const accentBg = isExact ? "bg-red-50" : match.confidence >= 85 ? "bg-amber-50" : "bg-indigo-50";
  const accentBorder = isExact ? "border-red-200" : match.confidence >= 85 ? "border-amber-200" : "border-indigo-200";
  const accentText = isExact ? "text-red-700" : match.confidence >= 85 ? "text-amber-700" : "text-indigo-700";

  return (
    <div className={`rounded-xl border ${accentBorder} ${accentBg} overflow-hidden transition-all hover:shadow-[0_4px_20px_-8px_rgba(15,23,42,0.1)]`}>

      {/* Status strip */}
      {isExact && match.category !== "verified" && (
        <div className="flex items-center gap-2 px-5 py-2 bg-red-100/60 border-b border-red-100">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-600" />
          </span>
          <p className="font-mono text-[9.5px] font-bold text-red-700 uppercase tracking-[0.18em]">
            Exact visual match
          </p>
        </div>
      )}

      <div className="px-5 py-5">
        {/* Top: logo + domain + gauge */}
        <div className="flex items-start gap-4 mb-4">
          <PlatformLogo domain={match.domain} size={44} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-[15px] font-semibold text-[#0a0a0a] tracking-tight">{match.domain}</h4>
              {match.network && (
                <span className="inline-flex items-center rounded-md border border-[#e8e4de] bg-white px-1.5 py-0.5 text-[9.5px] font-mono text-[#6b7280] uppercase tracking-wider">
                  {match.network}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-md border ${accentBorder} bg-white px-2 py-0.5 text-[10px] font-mono font-semibold ${accentText}`}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                {MATCH_LABELS[match.match_type] ?? match.match_type}
                {match.matched_variant && VARIANT_LABELS[match.matched_variant] ? ` · ${VARIANT_LABELS[match.matched_variant]}` : ""}
              </span>
              {match.category && CATEGORY_LABELS[match.category] && (
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold ${CATEGORY_LABELS[match.category].chip}`}>
                  {CATEGORY_LABELS[match.category].label}
                </span>
              )}
              {match.alt_image_urls && match.alt_image_urls.length > 0 && (
                <span className="text-[10px] text-[#6b7280]">+{match.alt_image_urls.length} more matching image{match.alt_image_urls.length > 1 ? "s" : ""} on this page</span>
              )}
            </div>
          </div>

          <ConfidenceGauge confidence={match.confidence} />
        </div>

        {match.category && <VideoEvidence match={match} />}

        {/* Bottom: metrics + actions */}
        <div className="flex items-end justify-between gap-4 pt-4 border-t border-[#e8e4de]/60">
          {/* Metrics */}
          <div className="flex gap-4">
            <div>
              <p className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#9ca3af] mb-0.5">pHash Δ</p>
              <p className="font-mono text-[15px] font-bold text-[#0a0a0a] tabular-nums leading-none">{match.phash_distance}</p>
            </div>
            <div>
              <p className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#9ca3af] mb-0.5">SSIM</p>
              <p className="font-mono text-[15px] font-bold text-[#0a0a0a] tabular-nums leading-none">{match.ssim_score > 0 ? match.ssim_score.toFixed(2) : "–"}</p>
            </div>
            <div>
              <p className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#9ca3af] mb-0.5">Asset</p>
              <p className="font-mono text-[15px] font-bold text-[#0a0a0a] tabular-nums leading-none uppercase">{match.asset_type.split("/")[1] ?? match.asset_type}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={match.page_url}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                isExact
                  ? "bg-[#0a0a0a] text-white hover:bg-[#1a1a1a]"
                  : "bg-white border border-[#e8e4de] text-[#0a0a0a] hover:border-[#0a0a0a]"
              }`}
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="15 3 21 3 21 9" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              View page
            </a>
            <a
              href={match.image_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e4de] bg-white px-3 py-1.5 text-[11px] font-medium text-[#374151] hover:border-[#9ca3af] transition-all"
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              View image
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Confidence gauge ──────────────────────────────────────────────────── */

function ConfidenceGauge({ confidence }: { confidence: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (confidence / 100) * circumference;
  const color = confidence >= 90 ? "#dc2626" : confidence >= 80 ? "#d97706" : "#6366f1";

  return (
    <div className="relative shrink-0" style={{ width: 72, height: 72 }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#e8e4de" strokeWidth="4" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 36 36)"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[18px] font-bold leading-none tabular-nums" style={{ color }}>
          {confidence}
        </span>
        <span className="font-mono text-[8px] mt-0.5" style={{ color }}>SCORE</span>
      </div>
    </div>
  );
}

/* ── Small helpers ─────────────────────────────────────────────────────── */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono text-[16px] font-bold text-[#0a0a0a] tabular-nums">{value}</span>
      <span className="text-[11px] text-[#9ca3af]">{label}</span>
    </div>
  );
}

function NoticeCard({ title, message, tone }: { title: string; message: string; tone: "warn" | "info" }) {
  const palette = tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-[#e8e4de] bg-[#fafaf8] text-[#0a0a0a]";
  return (
    <div className={`rounded-xl border px-6 py-5 ${palette}`}>
      <p className="text-[13px] font-semibold mb-1">{title}</p>
      <p className="text-[12px] leading-relaxed opacity-90">{message}</p>
    </div>
  );
}

/* ── Video evidence ────────────────────────────────────────────────────── */

const VERIFICATION_TEXT: Record<string, string> = {
  verified: "Frames of this video match yours in the same order.",
  partial: "Some frames matched, but not enough in the right order to verify.",
  no_frame_match: "No frames of this video matched yours in the part we could check.",
  not_verified: "We could not check the video file itself.",
  not_attempted: "The video file was not checked.",
};

function VideoEvidence({ match }: { match: DiscoveryResult["direct_matches"][number] }) {
  const ev = match.evidence;
  const status = ev?.verification ?? "not_attempted";
  const detail = status === "verified" && match.matched_segment
    ? `${ev?.ordered_frames ?? 0} frames in order, covering about ${formatTime(match.matched_segment.start)} to ${formatTime(match.matched_segment.end)} of your video.`
    : ev?.verification_reason;

  return (
    <div className="mb-4 space-y-2.5 rounded-lg border border-[#e8e4de]/70 bg-white/70 px-4 py-3">
      <div>
        <p className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#9ca3af] mb-0.5">Where the video is</p>
        {match.video_url ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-[#e8e4de] bg-white px-1.5 py-0.5 text-[9.5px] font-mono text-[#6b7280] uppercase tracking-wider">
              {VIDEO_TYPE_LABELS[match.video_url_type ?? "direct"] ?? "Video"}
            </span>
            <a href={match.video_url} target="_blank" rel="noreferrer" className="min-w-0 max-w-full truncate font-mono text-[11px] text-[#0a0a0a] underline decoration-[#d4cfc9] underline-offset-2 hover:decoration-[#0a0a0a]">
              {match.video_url}
            </a>
          </div>
        ) : (
          <p className="text-[12px] text-[#6b7280] leading-relaxed">
            No video address was found on this page. Some sites build the player with JavaScript, so the page itself is the best lead.
          </p>
        )}
        {match.video_url_type === "stream" && (
          <p className="mt-1 text-[11px] text-[#9ca3af]">This is a streaming playlist, not a single file, so it was not downloaded.</p>
        )}
      </div>

      {typeof match.matched_frame_time === "number" && (
        <p className="text-[12px] text-[#374151]">
          The thumbnail resembles about <span className="font-mono font-semibold">{formatTime(match.matched_frame_time)}</span> of your video.
        </p>
      )}

      <div>
        <p className="text-[12px] font-medium text-[#0a0a0a]">{VERIFICATION_TEXT[status] ?? VERIFICATION_TEXT.not_attempted}</p>
        {detail && <p className="mt-0.5 text-[11.5px] text-[#6b7280] leading-relaxed">{detail}</p>}
      </div>
    </div>
  );
}
