"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DropZone } from "@/components/upload/DropZone";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SCAN_STEPS = [
  "Fingerprinting image for network scan",
  "Scanning monitored sites",
  "Comparing thumbnails and preview assets",
  "Mapping hosting networks and CDN",
  "Compiling evidence and removal contacts",
];

const SCAN_STEPS_VIDEO = [
  "Reading your video and choosing key frames",
  "Scanning monitored sites",
  "Comparing thumbnails with your key frames",
  "Looking for the video files",
  "Compiling evidence and removal contacts",
];

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".mkv", ".m4v"];
/* neutral stand-in when the browser cannot draw a poster frame for a video */
const VIDEO_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' rx='12' fill='%23f0ede8'/><path d='M38 30l28 18-28 18z' fill='%239ca3af'/></svg>".replace(/%23/g, "#"),
  );

/** Draws one frame of a video file to a small JPEG data URL (used as the preview). */
function videoPoster(file: File): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const finish = (value: string) => { URL.revokeObjectURL(url); resolve(value); };
    const timer = setTimeout(() => finish(VIDEO_PLACEHOLDER), 5000);
    video.muted = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.onerror = () => { clearTimeout(timer); finish(VIDEO_PLACEHOLDER); };
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 1) * 0.1);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(video.videoWidth || 480, 480);
        canvas.height = Math.round((canvas.width / (video.videoWidth || 480)) * (video.videoHeight || 270));
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        clearTimeout(timer);
        finish(canvas.toDataURL("image/jpeg", 0.75));
      } catch {
        clearTimeout(timer);
        finish(VIDEO_PLACEHOLDER);
      }
    };
    video.src = url;
  });
}

/* ── Platform logos (inline brand SVGs) ── */

function TelegramLogo() {
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#0088cc" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12 16.3l-1.89 1.83c-.22.22-.4.4-.81.4z" />
      </svg>
    </div>
  );
}

function InstagramLogo() {
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(45deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D, #F56040, #F77737, #FCAF45)" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="18" cy="6" r="1.2" fill="white" stroke="none" />
      </svg>
    </div>
  );
}

function TwitterLogo() {
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-black">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </div>
  );
}

function RedditLogo() {
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#FF4500" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.01 4.744c.782.782.782 2.049 0 2.831-.441.441-1.165.639-1.781.461l-2.985 2.986c.117.318.181.659.181 1.014 0 .484-.135.937-.368 1.323l3.328 2.473c.469-.395 1.071-.633 1.729-.633 1.515 0 2.744 1.229 2.744 2.744S18.426 21.25 16.91 21.25c-1.515 0-2.744-1.229-2.744-2.744 0-.242.032-.476.091-.698L8.5 11.684c-.242.07-.497.107-.761.107-.378 0-.733-.087-1.049-.242L4.832 14.096c.283.42.448.923.448 1.466a2.737 2.737 0 11-2.737-2.737c.405 0 .788.088 1.131.244l1.845-2.638a3.082 3.082 0 01-.346-1.416c0-1.515 1.229-2.744 2.744-2.744.484 0 .937.135 1.323.368l3.328-3.328a2.729 2.729 0 01-.452-1.521c0-1.515 1.229-2.744 2.744-2.744.484 0 .937.135 1.323.368z" />
      </svg>
    </div>
  );
}

function GlobeLogo() {
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#6b7280]">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    </div>
  );
}

const SOURCES = [
  { value: "Telegram", label: "Telegram", desc: "Private channel or group", Logo: TelegramLogo },
  { value: "Instagram", label: "Instagram", desc: "Story, post, or reel", Logo: InstagramLogo },
  { value: "Twitter / X", label: "Twitter / X", desc: "Post or direct message", Logo: TwitterLogo },
  { value: "Reddit", label: "Reddit", desc: "Post or community share", Logo: RedditLogo },
  { value: "mydesi.ltd", label: "mydesi.ltd", desc: "Adult content domain", logoImg: "/supported-platforms/mydesi.ltd.webp" },
  { value: "fsiblog.pro", label: "fsiblog.pro", desc: "Adult content domain", logoImg: "/supported-platforms/fsiblog.pro.webp" },
  { value: "Other website", label: "Other website", desc: "Any other platform or URL", Logo: GlobeLogo },
];

function LeakPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [demoOn, setDemoOn] = useState(searchParams.get("demo") === "1");
  /* true only while the selected file is one of the bundled demo samples */
  const [fromDemo, setFromDemo] = useState(false);

  const [source, setSource] = useState("Telegram");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [creatingCase, setCreatingCase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originDomain, setOriginDomain] = useState("");
  const [mode, setMode] = useState<"image" | "video">("image");
  const isVideo = mode === "video";
  const steps = isVideo ? SCAN_STEPS_VIDEO : SCAN_STEPS;

  function switchMode(next: "image" | "video") {
    if (next === mode) return;
    setMode(next);
    setFromDemo(false);
    setFile(null);
    setPreview(null);
    setError(null);
  }

  async function handleVideoFile(f: File) {
    const name = f.name.toLowerCase();
    const looksLikeVideo = f.type.startsWith("video/") || VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));
    if (!looksLikeVideo) {
      setError("Please upload a video file (MP4, MOV, WebM or MKV).");
      return;
    }
    if (f.size > MAX_VIDEO_BYTES) {
      setError("The video must be under 100 MB.");
      return;
    }
    setError(null);
    setFile(f);
    setPreview(VIDEO_PLACEHOLDER);
    setPreview(await videoPoster(f));
  }

  function handleFile(f: File) {
    setFromDemo(false);
    if (isVideo) { void handleVideoFile(f); return; }
    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, WEBP).");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File must be under 10 MB.");
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function handleEvidenceFile(f: File) {
    if (!f.type.startsWith("image/")) return;
    if (f.size > 10 * 1024 * 1024) return;
    setError(null);
    setEvidenceFile(f);
    setEvidencePreview(URL.createObjectURL(f));
  }

  async function storePreview(src: string, key: string) {
    try {
      const canvas = document.createElement("canvas");
      const img = new Image();
      img.src = src;
      await new Promise<void>((res) => { img.onload = () => res(); });
      canvas.width = Math.min(img.width, 480);
      canvas.height = Math.round((canvas.width / img.width) * img.height);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      sessionStorage.setItem(key, canvas.toDataURL("image/jpeg", 0.75));
    } catch { /* non-critical */ }
  }

  async function startScan() {
    if (!file) return;
    setCreatingCase(true);
    setError(null);

    try {
      /* ── Step 1: Create the case ── */
      const caseRes = await fetch(`${API_URL}/api/cases/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymous: true,
          platform_source: source,
          issue_type: isVideo ? "Non-consensual video sharing" : "Non-consensual image sharing",
          pipeline_type: "ncii",
        }),
      });
      if (!caseRes.ok) {
        const err = await caseRes.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || "Failed to create case");
      }
      const { case_id } = await caseRes.json() as { case_id: string };

      /* Fire-and-forget tracking */
      void fetch("/api/claim/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "case_created",
          caseId: case_id,
          platformSource: source,
          issueType: isVideo ? "Non-consensual video sharing" : "Non-consensual image sharing",
          pipelineType: "ncii",
          anonymous: true,
        }),
        keepalive: true,
      }).catch(() => {});

      /* ── Step 2: Start scanning overlay ── */
      setCreatingCase(false);
      setScanning(true);
      setScanStep(0);

      if (preview) await storePreview(preview, `sniffer_suspicious_${case_id}`);
      if (evidencePreview) await storePreview(evidencePreview, `sniffer_evidence_${case_id}`);

      const interval = setInterval(() => {
        setScanStep((s) => {
          if (s >= steps.length - 1) { clearInterval(interval); return s; }
          return s + 1;
        });
      }, 600); /* 600ms per step (was 900ms) */

      const minDelay = new Promise<void>((res) => setTimeout(res, 3000)); /* 3s min (was 4.5s) */

      /* ── Step 3: Upload image + discover ── */
      const formData = new FormData();
      formData.append(isVideo ? "video" : "suspicious_image", file);
      if (evidenceFile) formData.append("evidence_image", evidenceFile);
      if (fromDemo && !isVideo) formData.append("demo", "true");
      const origin = originDomain.trim();
      if (origin) formData.append("origin_domain", origin);

      const [res] = await Promise.all([
        fetch(`${API_URL}/api/analysis/${case_id}/${isVideo ? "discover-video" : "discover"}`, {
          method: "POST",
          body: formData,
        }),
        minDelay,
      ]);

      clearInterval(interval);
      setScanStep(steps.length - 1);

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(err.detail || "Scan failed to start");
      }

      /* ── Step 4: Brief processing screen ── */
      setScanning(false);
      setProcessing(true);
      await new Promise<void>((res) => setTimeout(res, 2000)); /* 2s (was 5s) */
      router.push(`/report/${case_id}`);
    } catch (e) {
      setScanning(false);
      setProcessing(false);
      setCreatingCase(false);
      setError(e instanceof Error ? e.message : "Scan failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* ── Header ── */}
      <header className="border-b border-[#e8e4de] px-6 py-4 flex items-center gap-3 bg-white">
        <Link href="/" className="font-mono text-[13px] text-[#0a0a0a] tracking-widest uppercase hover:opacity-70 transition-opacity">
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}><svg width="24" height="24" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 3 4 8v7c0 6 4.5 10 11 12 6.5-2 11-6 11-12V8z" fill="#E4937A"/><path d="M10 15l4 4 7-8" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round"/></svg><b>traceveil</b></div>
        </Link>
        <span className="text-[#d4cfc9]">/</span>
        <span className="text-[13px] text-[#9ca3af]">Leak Discovery</span>
      </header>

      {/* ── Scanning overlay ── */}
      {scanning && (
        <div className="fixed inset-0 z-50 bg-[#fafaf8]/90 backdrop-blur-sm flex items-center justify-center">
          <div className="max-w-sm w-full mx-6 rounded-2xl border border-[#e8e4de] bg-white px-8 py-10 text-center shadow-xl">
            <div className="relative mx-auto mb-6 w-16 h-16">
              <div className="absolute inset-0 rounded-full bg-rose-100 animate-ping opacity-60" />
              <div className="relative w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#f43f5e" strokeWidth="1.75">
                  <circle cx="12" cy="12" r="10" strokeLinecap="round" />
                  <path d="M2 12h4M18 12h4M12 2v4M12 18v4" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
            </div>
            <p className="font-mono text-[10px] text-rose-500 uppercase tracking-widest mb-2">NCII · Leak Scan</p>
            <p className="text-[18px] font-semibold text-[#0a0a0a] mb-1 leading-snug">Scanning the network</p>
            <p className="text-[12.5px] text-[#6b7280] mb-7 leading-relaxed">
              Fingerprinting your image and comparing it with pages on monitored sites.
            </p>
            <div className="text-left space-y-2.5">
              {steps.map((label, i) => (
                <div key={label} className={`flex items-center gap-2.5 transition-opacity ${i > scanStep ? "opacity-30" : "opacity-100"}`}>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    i < scanStep ? "bg-rose-500 border-rose-500" : i === scanStep ? "border-rose-400 bg-rose-50" : "border-[#e8e4de]"
                  }`}>
                    {i < scanStep && (
                      <svg width="7" height="7" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {i === scanStep && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                  </div>
                  <span className={`text-[12px] ${i === scanStep ? "text-[#0a0a0a] font-medium" : "text-[#6b7280]"}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Processing overlay ── */}
      {processing && (
        <div className="fixed inset-0 z-50 bg-[#fafaf8]/90 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="w-7 h-7 border-2 border-[#e8e4de] border-t-[#0a0a0a] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[13px] text-[#9ca3af] font-mono">Preparing your report…</p>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Badge */}
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-100">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
          <span className="font-mono text-[10px] text-rose-600 uppercase tracking-widest">NCII · Leak Discovery</span>
        </div>

        <h1 className="font-serif text-3xl text-[#0a0a0a] leading-snug mb-2 font-normal">
          Trace your image across the network
        </h1>
        <p className="text-sm text-[#6b7280] mb-8 max-w-prose">
          Select where the content was found, upload the image, and we&apos;ll fingerprint it and scan
          across our list of monitored sites. The scan runs in the background and can take a few minutes.
          No account needed — completely anonymous.
        </p>

        {/* ── Step 1: Platform selection ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-[#0a0a0a] text-white text-[11px] font-mono font-semibold flex items-center justify-center">1</span>
            <label className="text-[12px] font-mono text-[#0a0a0a] uppercase tracking-widest font-medium">
              Where was the content found?
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SOURCES.map((s) => {
              const selected = source === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSource(s.value)}
                  className={`text-left p-3.5 border rounded-xl transition-all flex items-center gap-3 ${
                    selected
                      ? "border-rose-400 bg-rose-50 ring-1 ring-rose-100"
                      : "border-[#e8e4de] bg-white hover:border-[#9ca3af]"
                  }`}
                >
                  {s.Logo ? (
                    <s.Logo />
                  ) : s.logoImg ? (
                    <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-[#e8e4de]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.logoImg} alt={s.label} className="w-full h-full object-cover" />
                    </div>
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <span className="block text-[13.5px] font-semibold text-[#0a0a0a]">{s.label}</span>
                    <span className="block text-[11.5px] text-[#9ca3af] mt-0.5">{s.desc}</span>
                  </div>
                  {selected && (
                    <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center shrink-0">
                      <svg width="9" height="9" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Step 2: Upload image ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className={`w-6 h-6 rounded-full text-[11px] font-mono font-semibold flex items-center justify-center transition-colors ${file ? "bg-[#0a0a0a] text-white" : "bg-[#e8e4de] text-[#9ca3af]"}`}>2</span>
            <label className="text-[12px] font-mono text-[#0a0a0a] uppercase tracking-widest font-medium">
              {isVideo ? "Upload the video to trace" : "Upload the image to trace"}
            </label>
          </div>

          {/* Image / Video */}
          <div role="group" aria-label="What are you tracing?" className="mb-4 inline-flex rounded-lg border border-[#e8e4de] bg-white p-0.5">
            {(["image", "video"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => switchMode(m)}
                className={`rounded-md px-4 py-1.5 text-[12px] font-medium transition-colors ${
                  mode === m ? "bg-[#0a0a0a] text-white" : "text-[#6b7280] hover:text-[#0a0a0a]"
                }`}
              >
                {m === "image" ? "Image" : "Video"}
              </button>
            ))}
          </div>

          {!demoOn && !isVideo && (
            <button
              type="button"
              onClick={() => setDemoOn(true)}
              className="mb-4 ml-2 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-[12px] font-medium text-emerald-700 hover:border-emerald-400 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Try with demo images
            </button>
          )}

          {demoOn && !isVideo && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="font-mono text-[10px] text-emerald-700 uppercase tracking-widest">Demo Mode — Try these</span>
              </div>
              <p className="text-[12px] text-emerald-800 mb-4 leading-relaxed">
                Tap a pre-loaded sample to see the 3-tier matching engine in action.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { file: "/demo/demo_original.jpg", label: "Original", desc: "pHash 99%" },
                  { file: "/demo/demo_cropped.jpg", label: "Cropped", desc: "ORB 95%" },
                  { file: "/demo/demo_watermarked.jpg", label: "Watermarked", desc: "ORB+Hist 87%" },
                  { file: "/demo/demo_darker.jpg", label: "Exposure Edit", desc: "Hist 82%" },
                ].map((item) => (
                  <button
                    key={item.file}
                    type="button"
                    onClick={async () => {
                      const resp = await fetch(item.file);
                      const blob = await resp.blob();
                      const f = new File([blob], item.file.split("/").pop() || "demo.jpg", { type: "image/jpeg" });
                      setFile(f);
                      setPreview(URL.createObjectURL(blob));
                      setError(null);
                      setFromDemo(true);
                    }}
                    className="group relative aspect-[16/9] rounded-lg overflow-hidden border border-emerald-200 bg-white hover:border-emerald-400 hover:shadow-md transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.file} alt={item.label} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-[11px] font-medium text-white">{item.label}</p>
                      <p className="text-[9px] text-white/70">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <DropZone
            file={file}
            preview={preview}
            accept={isVideo ? "video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv,.m4v" : undefined}
            label={isVideo ? "Drag & drop your video here" : undefined}
            hint={isVideo ? "MP4 · MOV · WEBM · MKV · MAX 100 MB" : undefined}
            onFile={handleFile}
            onClear={() => { setFile(null); setPreview(null); setFromDemo(false); }}
          />

          {/* Where did you see it? (optional) — lets the scan check sites on the same network first */}
          {file && (
            <div className="mt-4 rounded-xl border border-[#e8e4de] bg-white p-4">
              <label htmlFor="origin-domain" className="block text-[11px] font-mono text-[#a8a29e] uppercase tracking-widest mb-1">
                Seen on a specific site? <span className="text-[#c4bdb5]">— optional</span>
              </label>
              <p className="text-[11.5px] text-[#6b7280] mb-2 leading-relaxed">
                If you know a website where it appeared (for example example.com), we check that site&apos;s network first.
              </p>
              <input
                id="origin-domain"
                type="text"
                inputMode="url"
                autoComplete="off"
                value={originDomain}
                onChange={(e) => setOriginDomain(e.target.value)}
                placeholder="example.com"
                className="w-full rounded-lg border border-[#e8e4de] bg-[#fafaf8] px-3 py-2 text-[12.5px] text-[#0a0a0a] outline-none focus:border-[#0a0a0a]"
              />
            </div>
          )}

          {/* Supporting evidence (appears after image selected) */}
          {file && (
            <div className="mt-4 rounded-xl border border-[#e8e4de] bg-white p-4">
              <p className="text-[11px] font-mono text-[#a8a29e] uppercase tracking-widest mb-1">
                Supporting Evidence <span className="text-[#c4bdb5]">— optional</span>
              </p>
              <p className="text-[11.5px] text-[#6b7280] mb-3 leading-relaxed">
                Add a screenshot showing where this content appeared (Telegram message, social post, etc.).
              </p>
              {evidenceFile ? (
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-[#e8e4de] bg-[#fafaf8]">
                  {evidencePreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={evidencePreview} alt="Evidence" className="w-10 h-10 object-cover rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-[#0a0a0a] truncate">{evidenceFile.name}</p>
                    <p className="text-[11px] text-[#9ca3af]">Uploaded</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setEvidenceFile(null); setEvidencePreview(null); }}
                    className="text-[11px] text-[#9ca3af] hover:text-red-500 transition-colors shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-[#e8e4de] bg-[#fafaf8] cursor-pointer hover:border-rose-300 hover:bg-rose-50/30 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-[#f0ede8] flex items-center justify-center shrink-0">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9l4-4 4 4 4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-[12px] text-[#6b7280]">Click to upload a screenshot</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleEvidenceFile(f); }}
                  />
                </label>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700">
            {error}
          </div>
        )}

        {/* ── CTA row ── */}
        <div className="flex justify-between items-center pt-2">
          <Link href="/" className="text-[13px] text-[#6b7280] hover:text-[#0a0a0a] transition-colors">
            ← Back
          </Link>
          <button
            type="button"
            onClick={startScan}
            disabled={!file || scanning || creatingCase}
            className="px-7 py-3 bg-rose-500 text-white text-[13px] font-medium rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-rose-600 transition-colors flex items-center gap-2"
          >
            {scanning || creatingCase ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {creatingCase ? "Creating case…" : "Scanning…"}
              </>
            ) : (
              "Start Leak Scan →"
            )}
          </button>
        </div>

        <p className="mt-8 border-t border-[#e8e4de] pt-5 text-[12.5px] leading-relaxed text-[#6b7280]">
          Want to talk to someone first?{" "}
          <Link href="/support" className="font-medium text-[#0a0a0a] underline underline-offset-2 decoration-[#d4cfc9] hover:decoration-[#0a0a0a]">
            Free counsellors and support
          </Link>
          . You can come back to this page any time.
        </p>
      </main>
    </div>
  );
}

export default function LeakPage() {
  return (
    <Suspense>
      <LeakPageContent />
    </Suspense>
  );
}