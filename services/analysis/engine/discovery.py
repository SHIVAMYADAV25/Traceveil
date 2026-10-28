from __future__ import annotations

import asyncio
import csv
import json
import os
import re
import time
from dataclasses import dataclass, field
from functools import partial
from pathlib import Path
from typing import Callable, Iterable, Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from . import netguard
from .matching import (  # noqa: F401  (re-exported: tests and routers import these from here)
    Reference,
    VideoReference,
    _compute_hashes,
    _open_rgb,
    build_reference,
    build_video_reference,
    match_candidate,
    match_candidate_video,
)
from .models import DiscoveryMatch, DiscoveryRelatedDomain, DiscoveryResult
from .verify import (
    VERIFY_ENABLED,
    VERIFY_MAX_CANDIDATES,
    Verification,
    apply_evidence,
    verify_video_url,
)

DATASET_PATH = Path(__file__).resolve().parents[2] / "intelligence" / "data" / "dataset.csv"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;"
        "q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
    ),
}
IMAGE_HEADERS = {
    "User-Agent": HEADERS["User-Agent"],
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
}
CONTENT_LINK_KEYWORDS = (
    "video",
    "watch",
    "clip",
    "mms",
    "gallery",
    "post",
    "scene",
    "episode",
)
# Sitemap URLs without a keyword are still useful (slug-only permalinks), but
# these obviously non-content pages are never worth scanning.
NON_CONTENT_SEGMENTS = (
    "privacy", "terms", "contact", "about", "dmca", "2257", "login", "register",
    "signup", "sign-up", "cookie", "faq", "sitemap", "feed", "wp-json", "wp-admin",
)
DEMO_TARGET_DOMAINS = [
    "auntymaza.watch", "auntymaza.baby", "auntymaza.video",
    "antarvasna3.com", "antarvasnabf.com", "desikahani2.net",
    "desimms2.site", "desisex.site", "desitales2.com",
    "indianpornsites.net", "mydesixxx3.com", "thekamababa.com",
    "xxxvideoindian2.com", "mydesi.ltd", "mydesi.rent",
]


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


# ── Limits (all overridable via environment) ──────────────────────────────
MAX_PAGES_PER_DOMAIN = _env_int("SNIFFER_MAX_PAGES_PER_DOMAIN", 15)
MAX_ASSETS_PER_PAGE = _env_int("SNIFFER_MAX_ASSETS_PER_PAGE", 32)
MAX_TOTAL_CANDIDATES = _env_int("SNIFFER_MAX_TOTAL_CANDIDATES", 8000)
SCAN_TIMEOUT_SECONDS = _env_int("SNIFFER_SCAN_TIMEOUT_SECONDS", 600)
MAX_IMAGE_BYTES = 3 * 1024 * 1024
MAX_HTML_BYTES = 3 * 1024 * 1024
MAX_SITEMAP_BYTES = 2 * 1024 * 1024
HTTP_TIMEOUT = 12
MAX_CONCURRENT = 12
CPU_WORKERS = 4

# Demo mode is opt-in per request (run_discovery_scan(demo=True)) AND only ever
# applies to the bundled sample images in demo_images/. Any other image always
# gets a real scan, even if a demo flag is sent. SNIFFER_DEMO_MODE=1 turns the
# demo on for sample images without the per-request flag (local demos only).
DEMO_DISCOVERY_MODE = os.getenv("SNIFFER_DEMO_MODE", "0") == "1"
DEMO_IMAGES_DIR = Path(__file__).resolve().parents[1] / "demo_images"


def _demo_sample_hashes() -> frozenset[str]:
    import hashlib
    try:
        return frozenset(
            hashlib.md5(path.read_bytes()).hexdigest()
            for path in DEMO_IMAGES_DIR.iterdir()
            if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        )
    except OSError:
        return frozenset()


def is_demo_sample(image_bytes: Optional[bytes]) -> bool:
    """True only for a byte-identical copy of one of the bundled demo images."""
    import hashlib
    if not image_bytes:
        return False
    return hashlib.md5(image_bytes).hexdigest() in _demo_sample_hashes()


DEMO_MATCH_URLS = [
    "https://mydesi.ltd/exclusive-young-cute-slim-mallu-girl-teasing-nipples-2/",
    "https://fsiblog.pro/exclusive-young-cute-slim-mallu-girl-teasing-nipples-2/",
]

# Test hook: lets tests serve fake sites through httpx.MockTransport.
_TRANSPORT: Optional[httpx.AsyncBaseTransport] = None


# ── Budget / status helpers ───────────────────────────────────────────────

class ScanBudget:
    """Caps total work per scan so one job cannot run away."""

    def __init__(self, max_candidates: int, timeout_seconds: float):
        self.remaining = max_candidates
        self.deadline = time.monotonic() + timeout_seconds
        self.reason: Optional[str] = None

    def expired(self) -> bool:
        if time.monotonic() > self.deadline:
            self.reason = self.reason or "time_limit"
            return True
        return False

    def exhausted(self) -> bool:
        if self.remaining <= 0:
            self.reason = self.reason or "request_budget"
            return True
        return False

    def take(self, wanted: int) -> int:
        granted = max(0, min(wanted, self.remaining))
        self.remaining -= granted
        if granted < wanted:  # work was cut: the result is incomplete and must say so
            self.reason = self.reason or "request_budget"
        return granted


@dataclass
class Fetched:
    status: str  # ok | blocked | not_found | http_error | timeout | error | too_large | wrong_type
    content: Optional[bytes] = None
    content_type: str = ""


@dataclass
class PageScan:
    status: str = "ok"
    candidates: int = 0
    matches: list = field(default_factory=list)


@dataclass
class DiscoveredPages:
    pages: list
    home_html: Optional[str]
    home_status: str


def run_discovery_scan(
    case_id: str,
    suspicious_bytes: bytes,
    origin_domain: Optional[str] = None,
    progress_cb: Optional[Callable[[dict], None]] = None,
    demo: bool = False,
    video_ref: Optional[VideoReference] = None,
) -> DiscoveryResult:
    """Scan the monitored sites for copies of an image (suspicious_bytes) or, when
    video_ref is given, of a video (its keyframes). Demo mode never applies to video,
    and only applies to images that are one of the bundled demo samples."""
    started_at = time.time()
    rows = _load_dataset_rows()

    if (demo or DEMO_DISCOVERY_MODE) and video_ref is None and is_demo_sample(suspicious_bytes):
        return _build_demo_discovery_result(
            case_id=case_id,
            started_at=started_at,
            suspicious_bytes=suspicious_bytes,
            rows=rows,
        )

    try:
        return asyncio.run(
            _async_discovery_scan(
                case_id=case_id,
                suspicious_bytes=suspicious_bytes,
                origin_domain=origin_domain,
                rows=rows,
                progress_cb=progress_cb,
                video_ref=video_ref,
            )
        )
    except Exception as exc:
        return DiscoveryResult(
            case_id=case_id,
            status="failed",
            started_at=started_at,
            finished_at=time.time(),
            direct_matches=[],
            related_domains=[],
            error=str(exc),
            input_type="video" if video_ref is not None else "image",
        )


async def _async_discovery_scan(
    case_id: str,
    suspicious_bytes: bytes,
    origin_domain: Optional[str],
    rows: list[dict[str, str]],
    progress_cb: Optional[Callable[[dict], None]],
    video_ref: Optional[VideoReference] = None,
) -> DiscoveryResult:
    started_at = time.time()
    prioritized_network = _find_network(origin_domain, rows) if origin_domain else None
    domains = _select_domains(rows)
    if prioritized_network:
        # Same-network sites first: they get scanned first and survive a truncated scan.
        domains = sorted(domains, key=lambda r: r.get("network") != prioritized_network)

    if video_ref is not None:
        matcher = partial(match_candidate_video, video_ref)   # one thumbnail vs all keyframes
    else:
        matcher = partial(match_candidate, build_reference(suspicious_bytes))
    budget = ScanBudget(MAX_TOTAL_CANDIDATES, SCAN_TIMEOUT_SECONDS)
    all_matches: list[DiscoveryMatch] = []
    top_matches: list[DiscoveryMatch] = []
    events: list[dict] = []
    # domain -> counters used to derive a final, honest status
    stats: dict[str, dict[str, int]] = {
        row["domain"]: {"ok_pages": 0, "blocked": 0, "failed": 0, "candidates": 0, "skipped": 0} for row in domains
    }

    def emit_event(event_type: str, message: str, **kwargs):
        event = {"timestamp": time.time(), "type": event_type, "message": message, **kwargs}
        events.append(event)
        if progress_cb:
            progress_cb({"event": event})

    def note_status(domain: str, status: str):
        s = stats[domain]
        if status == "ok":
            s["ok_pages"] += 1
        elif status == "skipped":
            s["skipped"] += 1
        elif status == "blocked":
            s["blocked"] += 1
        else:
            s["failed"] += 1

    limits = httpx.Limits(max_connections=MAX_CONCURRENT, max_keepalive_connections=5)
    async with httpx.AsyncClient(
        headers=HEADERS,
        timeout=httpx.Timeout(HTTP_TIMEOUT),
        follow_redirects=True,
        limits=limits,
        transport=_TRANSPORT,
        event_hooks={"request": [netguard.request_hook]},
    ) as client:
        sem = asyncio.Semaphore(MAX_CONCURRENT)
        cpu_sem = asyncio.Semaphore(CPU_WORKERS)

        # Phase 1: find content pages (homepage links + sitemaps + RSS)
        emit_event("info", f"Discovering content pages on {len(domains)} domains...")
        discovered = await asyncio.gather(
            *[_discover_pages(sem, client, row["domain"]) for row in domains],
            return_exceptions=True,
        )

        work: list[tuple[dict[str, str], str, Optional[str]]] = []
        for row, found in zip(domains, discovered):
            domain = row["domain"]
            if isinstance(found, Exception):
                stats[domain]["failed"] += 1
                continue
            note_status(domain, found.home_status)
            emit_event("info", f"Found {len(found.pages)} pages on {domain}", domain=domain)
            for index, page_url in enumerate(found.pages):
                if index == 0:
                    # homepage was already fetched during discovery: reuse it, never fetch it twice
                    if found.home_html is not None:
                        work.append((row, page_url, found.home_html))
                    continue
                work.append((row, page_url, None))

        # Phase 2: scan pages in small chunks so progress is real and budgets are honoured
        emit_event("info", f"Scanning {len(work)} pages...")
        pages_scanned = 0
        candidates_evaluated = 0
        chunk_size = max(12, len(work) // 25)
        processed = 0
        for start in range(0, len(work), chunk_size):
            if budget.expired() or budget.exhausted():
                break
            chunk = work[start : start + chunk_size]
            processed = start + len(chunk)
            results = await asyncio.gather(
                *[
                    _scan_page(sem, cpu_sem, client, page_url, row, matcher, budget, prefetched)
                    for row, page_url, prefetched in chunk
                ],
                return_exceptions=True,
            )
            for (row, page_url, prefetched), scan in zip(chunk, results):
                domain = row["domain"]
                if isinstance(scan, Exception):
                    stats[domain]["failed"] += 1
                    continue
                if prefetched is None or scan.status == "skipped":
                    note_status(domain, scan.status)  # (an OK homepage was already counted in phase 1)
                pages_scanned += 1 if scan.status == "ok" else 0
                candidates_evaluated += scan.candidates
                stats[domain]["candidates"] += scan.candidates
                for match in scan.matches:
                    all_matches.append(match)
                    emit_event(
                        "match",
                        f"Found {match.match_type} match on {match.domain} ({match.confidence}%)",
                        domain=match.domain,
                        page_url=match.page_url,
                        asset_url=match.image_url,
                        asset_type=match.asset_type,
                        match_type=match.match_type,
                        confidence=match.confidence,
                    )
            if progress_cb:
                progress_cb({
                    "pages_scanned": pages_scanned,
                    "candidates_evaluated": candidates_evaluated,
                    "current_domain": chunk[-1][0]["domain"],
                    "domains_with_matches": len({m.domain for m in all_matches}),
                })

        # Video only. Stage 2: find the video file on each matched page. Stage 3: verify against it.
        top_matches = _consolidate_matches(all_matches)[:12]
        if video_ref is not None and top_matches:
            await _video_stages(sem, cpu_sem, client, video_ref, top_matches, budget, emit_event)

    for row, _page, _html in work[processed:]:   # pages never reached because a budget ran out
        stats[row["domain"]]["skipped"] += 1

    domain_status = {domain: _final_status(s) for domain, s in stats.items()}
    coverage: dict[str, int] = {"checked": 0, "no_images": 0, "blocked": 0, "unreachable": 0, "skipped": 0}
    for status in domain_status.values():
        coverage[status] += 1

    related_domains = _expand_related_domains(top_matches, rows)
    truncated = budget.reason is not None
    emit_event(
        "info",
        f"Done. {len(top_matches)} match(es); {coverage['checked'] + coverage['no_images']} of "
        f"{len(domain_status)} domains reachable"
        + (f"; stopped early ({budget.reason})" if truncated else "."),
    )

    return DiscoveryResult(
        case_id=case_id,
        status="completed",
        started_at=started_at,
        finished_at=time.time(),
        prioritized_network=prioritized_network,
        target_domains=[row["domain"] for row in domains],
        domains_scanned=coverage["checked"] + coverage["no_images"],
        domains_with_matches=len({m.domain for m in top_matches}),
        domain_status=domain_status,
        coverage=coverage,
        truncated=truncated,
        truncation_reason=budget.reason,
        pages_scanned=pages_scanned,
        candidates_evaluated=candidates_evaluated,
        direct_matches=[m.model_dump() for m in top_matches],
        related_domains=[item.model_dump() for item in related_domains[:12]],
        recent_events=events[-60:],
        input_type="video" if video_ref is not None else "image",
        reference_frames=len(video_ref.frames) if video_ref is not None else 0,
        video_info=_video_info(video_ref),
    )


def _video_info(video_ref: Optional[VideoReference]) -> Optional[dict]:
    if video_ref is None:
        return None
    return {
        "duration_seconds": video_ref.duration,
        "width": video_ref.width,
        "height": video_ref.height,
        "keyframe_times": [frame.time for frame in video_ref.frames],
    }


def _final_status(s: dict[str, int]) -> str:
    """checked: images were compared | no_images: reachable but nothing to compare
    (often JavaScript-rendered) | blocked: bot protection / policy | unreachable |
    skipped: not finished because a budget stopped the scan."""
    if s["candidates"] > 0:
        return "checked"
    if s["skipped"] > 0:
        return "skipped"  # not finished: a time / request budget stopped the scan first
    if s["ok_pages"] > 0:
        return "no_images"
    if s["blocked"] > 0:
        return "blocked"
    return "unreachable"


def _consolidate_matches(matches: list[DiscoveryMatch]) -> list[DiscoveryMatch]:
    """One result per content page. Several thumbnails of the same video page
    collapse into the best match; the others are kept in alt_image_urls.
    Matches that only point at a listing page are keyed by image instead, so
    different videos on one listing page are not merged."""
    best: dict[tuple[str, str], DiscoveryMatch] = {}
    for match in sorted(matches, key=lambda m: m.confidence, reverse=True):
        key = (match.domain, match.page_url if match.page_specific else match.image_url)
        existing = best.get(key)
        if existing is None:
            best[key] = match
        elif match.image_url != existing.image_url and match.image_url not in existing.alt_image_urls:
            existing.alt_image_urls.append(match.image_url)
    return sorted(best.values(), key=lambda m: m.confidence, reverse=True)


# ── Fetching ──────────────────────────────────────────────────────────────

async def _fetch_limited(
    sem: asyncio.Semaphore,
    client: httpx.AsyncClient,
    url: str,
    max_bytes: int,
    accept: Optional[tuple[str, ...]] = None,
    referer: str = "",
    headers: Optional[dict] = None,
) -> Fetched:
    """GET with a hard byte cap (streamed — a huge body is abandoned, not downloaded)
    and a classified outcome so callers can tell 'blocked' from 'unreachable'."""
    request_headers = dict(headers or {})
    if referer:
        request_headers["Referer"] = referer
    async with sem:
        try:
            async with client.stream("GET", url, headers=request_headers) as response:
                code = response.status_code
                if code in (403, 429, 451, 503):
                    return Fetched("blocked")
                if code == 404 or code == 410:
                    return Fetched("not_found")
                if code >= 400:
                    return Fetched("http_error")
                ctype = response.headers.get("content-type", "").lower()
                if accept and not any(token in ctype for token in accept):
                    return Fetched("wrong_type", content_type=ctype)
                declared = response.headers.get("content-length")
                if declared and declared.isdigit() and int(declared) > max_bytes:
                    return Fetched("too_large")
                buffer = bytearray()
                async for chunk in response.aiter_bytes():
                    buffer.extend(chunk)
                    if len(buffer) > max_bytes:
                        return Fetched("too_large")
                return Fetched("ok", bytes(buffer), ctype)
        except netguard.BlockedAddress:
            return Fetched("blocked")
        except httpx.TimeoutException:
            return Fetched("timeout")
        except httpx.HTTPError:
            return Fetched("error")


def _decode(content: Optional[bytes]) -> str:
    return (content or b"").decode("utf-8", errors="replace")


async def _fetch_html(sem: asyncio.Semaphore, client: httpx.AsyncClient, url: str) -> Fetched:
    return await _fetch_limited(sem, client, url, MAX_HTML_BYTES, ("text/html", "application/xhtml"))


async def _fetch_image(
    client: httpx.AsyncClient, url: str, sem: asyncio.Semaphore, referer: str = ""
) -> Optional[bytes]:
    fetched = await _fetch_limited(
        sem, client, url, MAX_IMAGE_BYTES, ("image",), referer=referer, headers=IMAGE_HEADERS
    )
    return fetched.content if fetched.status == "ok" else None


# ── Page discovery: homepage links + sitemaps + RSS ───────────────────────

def _same_site(host_a: str, host_b: str) -> bool:
    return host_a.lower().removeprefix("www.") == host_b.lower().removeprefix("www.")


def _parse_sitemap(text: str) -> tuple[list[str], list[tuple[str, str]]]:
    """Returns (child_sitemap_urls, [(page_url, lastmod)]). Regex-based on purpose:
    no XML entity expansion, so a hostile sitemap cannot trigger a billion-laughs attack."""
    if "<sitemapindex" in text:
        children = re.findall(r"<loc>\s*(?:<!\[CDATA\[)?\s*(.*?)\s*(?:\]\]>)?\s*</loc>", text, re.S)
        return children[:50], []
    pages: list[tuple[str, str]] = []
    for block in re.findall(r"<url>(.*?)</url>", text, re.S)[:5000]:
        loc = re.search(r"<loc>\s*(?:<!\[CDATA\[)?\s*(.*?)\s*(?:\]\]>)?\s*</loc>", block, re.S)
        if not loc:
            continue
        lastmod = re.search(r"<lastmod>\s*(.*?)\s*</lastmod>", block, re.S)
        pages.append((loc.group(1), lastmod.group(1) if lastmod else ""))
    return [], pages


def _rank_sitemap_pages(pages: list[tuple[str, str]], host: str) -> list[str]:
    """Keyword pages first, then other plausible content pages; newest first within each."""
    keyword, other = [], []
    for url, lastmod in sorted(pages, key=lambda item: item[1], reverse=True):
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"} or not _same_site(parsed.netloc, host):
            continue
        lowered = url.lower()
        if any(seg in lowered for seg in NON_CONTENT_SEGMENTS) or parsed.path in {"", "/"}:
            continue
        (keyword if any(k in lowered for k in CONTENT_LINK_KEYWORDS) else other).append(url.split("#", 1)[0])
    return keyword + other


async def _sitemap_pages(
    sem: asyncio.Semaphore, client: httpx.AsyncClient, base: str, host: str
) -> list[str]:
    sitemap_urls: list[str] = []
    robots = await _fetch_limited(sem, client, urljoin(base, "/robots.txt"), 100_000)
    if robots.status == "ok":
        for line in _decode(robots.content).splitlines():
            if line.lower().startswith("sitemap:"):
                sitemap_urls.append(line.split(":", 1)[1].strip())
    if not sitemap_urls:
        sitemap_urls = [urljoin(base, "/sitemap.xml")]

    collected: list[tuple[str, str]] = []
    queue = sitemap_urls[:2]
    expanded = False
    while queue and len(collected) < 5000:
        url = queue.pop(0)
        if url.lower().endswith(".gz"):
            continue
        fetched = await _fetch_limited(sem, client, url, MAX_SITEMAP_BYTES)
        if fetched.status != "ok":
            continue
        children, pages = _parse_sitemap(_decode(fetched.content))
        collected.extend(pages)
        if children and not expanded:  # follow one level of sitemap index only
            expanded = True
            preferred = [c for c in children if any(k in c.lower() for k in CONTENT_LINK_KEYWORDS)]
            queue.extend((preferred + children)[:2])
    return _rank_sitemap_pages(collected, host)


def _feed_links(html: str, base: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    links = []
    for tag in soup.find_all("link", href=True):
        rel = " ".join(tag.get("rel") or []).lower()
        kind = (tag.get("type") or "").lower()
        if "alternate" in rel and ("rss" in kind or "atom" in kind):
            links.append(urljoin(base, tag["href"]))
    return links[:1]


async def _discover_pages(
    sem: asyncio.Semaphore, client: httpx.AsyncClient, domain: str
) -> DiscoveredPages:
    base = f"https://{domain}"
    home = await _fetch_html(sem, client, base)
    if home.status in {"error", "timeout"}:
        # some mirrors only serve plain http
        retry = await _fetch_html(sem, client, f"http://{domain}")
        if retry.status == "ok":
            base, home = f"http://{domain}", retry

    html = _decode(home.content) if home.status == "ok" else None
    host = urlparse(base).netloc
    link_pages: list[str] = []
    feed_pages: list[str] = []

    if html:
        soup = BeautifulSoup(html, "html.parser")
        seen = {base}
        for anchor in soup.find_all("a", href=True):
            absolute = urljoin(base, anchor.get("href", ""))
            parsed = urlparse(absolute)
            if parsed.scheme not in {"http", "https"} or not _same_site(parsed.netloc, host):
                continue
            candidate = absolute.split("#", 1)[0]
            if candidate not in seen and any(k in candidate.lower() for k in CONTENT_LINK_KEYWORDS):
                seen.add(candidate)
                link_pages.append(candidate)
        for feed_url in _feed_links(html, base):
            feed = await _fetch_limited(sem, client, feed_url, 1_000_000)
            if feed.status == "ok":
                for item in re.findall(r"<link>\s*(?:<!\[CDATA\[)?\s*(https?://.*?)\s*(?:\]\]>)?\s*</link>", _decode(feed.content), re.S)[:10]:
                    if _same_site(urlparse(item).netloc, host):
                        feed_pages.append(item)

    sitemap_pages = await _sitemap_pages(sem, client, base, host)

    # Sitemap/feed pages are specific content pages; they get priority over guessed links.
    pages = [base]
    for url in sitemap_pages[: MAX_PAGES_PER_DOMAIN // 2] + feed_pages + link_pages + sitemap_pages:
        if url not in pages:
            pages.append(url)
        if len(pages) >= MAX_PAGES_PER_DOMAIN:
            break
    return DiscoveredPages(pages=pages, home_html=html, home_status=home.status)


# ── Page scanning ─────────────────────────────────────────────────────────

async def _scan_page(
    sem: asyncio.Semaphore,
    cpu_sem: asyncio.Semaphore,
    client: httpx.AsyncClient,
    page_url: str,
    row: dict[str, str],
    matcher: Callable[..., Optional[DiscoveryMatch]],
    budget: ScanBudget,
    prefetched_html: Optional[str] = None,
) -> PageScan:
    if budget.expired():
        return PageScan(status="skipped")
    if prefetched_html is not None:
        html, status = prefetched_html, "ok"
    else:
        fetched = await _fetch_html(sem, client, page_url)
        status = fetched.status
        html = _decode(fetched.content) if status == "ok" else None
    if not html:
        return PageScan(status=status if status != "ok" else "error")

    domain = row["domain"]
    network = row.get("network") or None
    provider_type = row.get("provider_type") or None

    assets = _extract_asset_urls(html, page_url)[:MAX_ASSETS_PER_PAGE]
    if not assets:
        return PageScan(status="ok", candidates=0)
    granted = budget.take(len(assets))
    if granted == 0:
        return PageScan(status="skipped")
    assets = assets[:granted]

    images = await asyncio.gather(
        *[_fetch_image(client, url, sem, referer=page_url) for url, _, _ in assets],
        return_exceptions=True,
    )

    async def evaluate(asset, image_bytes):
        asset_url, asset_type, content_page = asset
        async with cpu_sem:  # hashing / SIFT are CPU-bound: keep them off the event loop
            match = await asyncio.to_thread(
                matcher,
                image_bytes, domain, network, provider_type,
                content_page or page_url, asset_url, asset_type,
            )
        if match is not None:
            match.page_specific = bool(content_page) and content_page != page_url
        return match

    tasks = [
        evaluate(asset, data)
        for asset, data in zip(assets, images)
        if isinstance(data, (bytes, bytearray))
    ]
    found = await asyncio.gather(*tasks, return_exceptions=True)
    matches = [m for m in found if isinstance(m, DiscoveryMatch)]
    return PageScan(status="ok", candidates=len(assets), matches=matches)


# ── Video: stage 2 (find the video file) and stage 3 (verify) ──────────────

VIDEO_DIRECT_EXTS = (".mp4", ".webm", ".mov", ".m4v")
VIDEO_STREAM_EXTS = (".m3u8", ".mpd")
LISTING_SEGMENTS = {"videos", "video", "tag", "tags", "category", "categories", "page", "search", "latest", "popular"}
_VIDEO_URL_RE = re.compile(r"https?://[^\s\"'<>\\]+?\.(?:mp4|webm|m3u8|mpd|mov|m4v)(?:\?[^\s\"'<>\\]*)?", re.I)
_KIND_ORDER = {"direct": 0, "stream": 1, "embed": 2}


def _classify_video_url(url: str) -> Optional[str]:
    path = urlparse(url).path.lower()
    if path.endswith(VIDEO_DIRECT_EXTS):
        return "direct"
    if path.endswith(VIDEO_STREAM_EXTS):
        return "stream"
    return None


def _extract_video_urls(html: str, page_url: str) -> list[tuple[str, str]]:
    """Video addresses found on a page, best first: [(url, kind)] with kind
    direct (a file), stream (an .m3u8/.mpd playlist, never treated as a file) or embed
    (a player page). Nothing is guessed: if the page does not expose one, the list is empty."""
    html = html.replace("\\/", "/")  # unescape JSON-style slashes
    soup = BeautifulSoup(html, "html.parser")
    found: list[tuple[str, str]] = []
    seen: set[str] = set()

    def add(raw: Optional[str], default: Optional[str]) -> None:
        if not raw:
            return
        absolute = urljoin(page_url, raw.strip())
        if urlparse(absolute).scheme not in {"http", "https"} or absolute in seen:
            return
        kind = _classify_video_url(absolute) or default
        if kind:
            seen.add(absolute)
            found.append((absolute, kind))

    for tag in soup.find_all("meta"):
        prop = (tag.get("property") or tag.get("name") or "").lower()
        if prop in {"og:video", "og:video:url", "og:video:secure_url", "twitter:player:stream"}:
            add(tag.get("content"), "embed")
        elif prop == "twitter:player":
            add(tag.get("content"), "embed")

    for video in soup.find_all("video"):
        add(video.get("src"), "direct")
        for source in video.find_all("source"):
            kind = "stream" if "mpegurl" in (source.get("type") or "").lower() else "direct"
            add(source.get("src"), kind)

    for script in soup.find_all("script", type="application/ld+json")[:5]:
        try:
            data = json.loads(script.string or "")
        except (ValueError, TypeError):
            continue
        for node in (data if isinstance(data, list) else [data]):
            if isinstance(node, dict):
                content, embed = node.get("contentUrl"), node.get("embedUrl")
                if isinstance(content, str):
                    add(content, "direct")
                if isinstance(embed, str):
                    add(embed, "embed")

    for match in _VIDEO_URL_RE.findall(html)[:20]:
        add(match, None)
    for frame in soup.find_all("iframe", src=True)[:3]:
        add(frame.get("src"), "embed")

    found.sort(key=lambda item: _KIND_ORDER[item[1]])  # stable: keeps page order within a kind
    return found[:5]


def _likely_video_page(match: DiscoveryMatch) -> bool:
    """A thumbnail on a listing page says nothing about which video file belongs to it,
    so only pages that look like one video's own page are searched for a video URL."""
    if match.page_specific:
        return True
    first = urlparse(match.page_url).path.strip("/").split("/")[0].lower()
    return bool(first) and first not in LISTING_SEGMENTS


async def _resolve_video_urls(
    sem: asyncio.Semaphore, client: httpx.AsyncClient, matches: list[DiscoveryMatch]
) -> None:
    async def one(match: DiscoveryMatch) -> None:
        if not _likely_video_page(match):
            return
        fetched = await _fetch_html(sem, client, match.page_url)
        if fetched.status != "ok":
            return
        urls = _extract_video_urls(_decode(fetched.content), match.page_url)
        if urls:
            match.video_url, match.video_url_type = urls[0]

    await asyncio.gather(*[one(m) for m in matches], return_exceptions=True)


async def _video_stages(
    sem: asyncio.Semaphore,
    cpu_sem: asyncio.Semaphore,
    client: httpx.AsyncClient,
    video_ref: VideoReference,
    matches: list[DiscoveryMatch],
    budget: ScanBudget,
    emit_event: Callable[..., None],
) -> None:
    verifications: dict[int, Verification] = {}
    if not budget.expired():
        emit_event("info", f"Looking for the video file on {len(matches)} matched page(s)...")
        await _resolve_video_urls(sem, client, matches)

        eligible = [m for m in matches if m.video_url_type == "direct"][:VERIFY_MAX_CANDIDATES]
        if VERIFY_ENABLED and eligible and not budget.expired():
            emit_event("info", f"Checking {len(eligible)} video file(s) against your video...")
            results = await asyncio.gather(
                *[verify_video_url(sem, cpu_sem, client, video_ref, m.video_url) for m in eligible]
            )
            verifications = {id(m): r for m, r in zip(eligible, results)}

    for match in matches:
        verification = verifications.get(id(match))
        apply_evidence(match, verification)
        if verification is not None and verification.status == "verified":
            emit_event(
                "match",
                f"Video verified on {match.domain}: {verification.ordered_frames} frames in order",
                domain=match.domain, page_url=match.page_url, match_type="verified", confidence=match.confidence,
            )


# ── Demo result builder (unchanged) ───────────────────────────────────────

def _build_demo_discovery_result(
    case_id: str,
    started_at: float,
    suspicious_bytes: Optional[bytes],
    rows: list[dict[str, str]],
) -> DiscoveryResult:
    import hashlib

    now = time.time()
    row_by_domain = {row.get("domain", "").lower(): row for row in rows}

    def meta(domain: str) -> tuple[Optional[str], Optional[str]]:
        record = row_by_domain.get(domain.lower())
        if not record:
            return None, None
        network = (record.get("network") or "").strip() or None
        provider_type = (record.get("provider_type") or "").strip() or None
        return network, provider_type

    # Determine match variant based on image hash
    demo_image_md5 = "b29cd9b87c7d40a5d150ce0d5498f94c"
    uploaded_md5 = hashlib.md5(suspicious_bytes).hexdigest() if suspicious_bytes else ""
    is_demo_image = uploaded_md5 == demo_image_md5

    # Cross-domain matches (all 3 use same CDN: files.ltdcdn.org)
    ltd_domains = [
        ("mydesi.ltd", "https://mydesi.ltd/hot-mallu-wife-hard-fucking-married-day/",
         "https://files.ltdcdn.org/upload/photos/2026/06/VPR5Dd5cNuexuJRsWkqi_24_187b1d093f0506dfd9bcfe9c59004907_image.jpg"),
        ("desii49.com", "https://desii49.com/hot-mallu-wife-hard-fucking-married-day/",
         "https://files.ltdcdn.org/upload/photos/2026/06/VPR5Dd5cNuexuJRsWkqi_24_187b1d093f0506dfd9bcfe9c59004907_image.jpg"),
        ("viralkand.app", "https://www.viralkand.app/hot-mallu-wife-hard-fucking-married-day/",
         "https://files.ltdcdn.org/upload/photos/2026/06/VPR5Dd5cNuexuJRsWkqi_24_187b1d093f0506dfd9bcfe9c59004907_image.jpg"),
    ]

    if is_demo_image:
        # Original image → exact matches on all 3 LtdNetwork domains
        match_type = "exact"
        confidence = 99.0
        phash = 0
        dhash = 0
        ahash = 0
        orb_rate = 0.0
        hist_corr = 0.0
    else:
        # Edited variant → ORB + histogram catches it
        match_type = "probable"
        confidence = 87.0
        phash = 22
        dhash = 18
        ahash = 15
        orb_rate = 0.35
        hist_corr = 0.72

    direct_matches = []
    for domain, page_url, image_url in ltd_domains:
        net, prov = meta(domain)
        direct_matches.append(
            DiscoveryMatch(
                domain=domain,
                network=net or "LtdNetwork",
                provider_type=prov or "external_cdn",
                page_url=page_url,
                image_url=image_url,
                asset_type="thumbnail",
                confidence=confidence,
                match_type=match_type,
                phash_distance=phash,
                dhash_distance=dhash,
                ahash_distance=ahash,
                ssim_score=0.0,
                keypoint_matches=38 if not is_demo_image else 0,
                keypoint_match_rate=round(orb_rate, 4),
                hist_correlation=round(hist_corr, 4),
            ).model_dump()
        )

    related_domains = [
        DiscoveryRelatedDomain(
            domain="mydesi.rent",
            network="LtdNetwork",
            provider_type="embedded_player",
            reason="Same LtdNetwork content-sharing group; likely additional mirror.",
        ).model_dump(),
        DiscoveryRelatedDomain(
            domain="mydesi2.bond",
            network="LtdNetwork",
            provider_type="api_stream",
            reason="Same operator; uses beacon.min.js streaming.",
        ).model_dump(),
    ]

    recent_events = [
        {
            "timestamp": started_at + 0.2,
            "type": "domain",
            "message": "Scanning mydesi.ltd...",
            "domain": "mydesi.ltd",
        },
        {
            "timestamp": started_at + 0.4,
            "type": "match",
            "message": f"Found {match_type} match on mydesi.ltd ({confidence}%)",
            "domain": "mydesi.ltd",
            "page_url": ltd_domains[0][1],
            "asset_type": "thumbnail",
            "match_type": match_type,
            "confidence": confidence,
        },
        {
            "timestamp": started_at + 0.6,
            "type": "domain",
            "message": "Scanning desii49.com...",
            "domain": "desii49.com",
        },
        {
            "timestamp": started_at + 0.8,
            "type": "match",
            "message": f"Found {match_type} match on desii49.com ({confidence}%)",
            "domain": "desii49.com",
            "page_url": ltd_domains[1][1],
            "asset_type": "thumbnail",
            "match_type": match_type,
            "confidence": confidence,
        },
        {
            "timestamp": started_at + 1.0,
            "type": "domain",
            "message": "Scanning viralkand.app...",
            "domain": "viralkand.app",
        },
        {
            "timestamp": started_at + 1.2,
            "type": "match",
            "message": f"Found {match_type} match on viralkand.app ({confidence}%)",
            "domain": "viralkand.app",
            "page_url": ltd_domains[2][1],
            "asset_type": "thumbnail",
            "match_type": match_type,
            "confidence": confidence,
        },
        {
            "timestamp": now,
            "type": "info",
            "message": f"Scan complete. Found {len(direct_matches)} matches across 3 LtdNetwork domains.",
        },
    ]

    return DiscoveryResult(
        case_id=case_id,
        status="completed",
        started_at=started_at,
        finished_at=now,
        prioritized_network="LtdNetwork",
        target_domains=[d[0] for d in ltd_domains],
        domains_scanned=3,
        pages_scanned=3,
        candidates_evaluated=9,
        direct_matches=direct_matches,
        related_domains=related_domains,
        recent_events=recent_events,
        demo=True,
    )


def _load_dataset_rows() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    try:
        with open(DATASET_PATH, newline="", encoding="utf-8-sig") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                domain = (row.get("domain") or "").strip().lower()
                if not domain:
                    continue
                provider_type = (row.get("provider_type") or "").strip().lower()
                if provider_type == "unknown":
                    continue
                if domain.endswith(".edu"):
                    continue
                rows.append({k: (v or "").strip() for k, v in row.items()})
    except FileNotFoundError:
        return []
    return rows


def _find_network(origin_domain: Optional[str], rows: Iterable[dict[str, str]]) -> Optional[str]:
    if not origin_domain:
        return None

    clean_domain = origin_domain.strip().lower()
    for row in rows:
        if row.get("domain", "").lower() == clean_domain:
            network = row.get("network") or ""
            return network if network and network != "UnknownNetwork" else None
    return None


def _select_domains(rows: list[dict[str, str]], demo: bool = False) -> list[dict[str, str]]:
    if demo or DEMO_DISCOVERY_MODE:
        selected: list[dict[str, str]] = []
        by_domain = {row.get("domain", ""): row for row in rows}
        for domain in DEMO_TARGET_DOMAINS:
            row = by_domain.get(domain)
            if row is not None:
                selected.append(row)
                continue
            selected.append({"domain": domain, "network": "DemoScope", "provider_type": "manual_target"})
        return selected
    return rows[:]


# ── Asset extraction ──────────────────────────────────────────────────────

LAZY_ATTRS = ("data-src", "data-original", "data-lazy-src", "data-lazy", "data-thumb", "data-image", "data-img")
SKIP_URL_PARTS = ("favicon", "sprite", "pixel.gif", "spacer", "blank.gif")


def _best_srcset(value: str) -> Optional[str]:
    """Pick the highest-resolution URL from an srcset / data-srcset attribute."""
    best, best_weight = None, -1.0
    for part in value.split(","):
        bits = part.strip().split()
        if not bits:
            continue
        weight = 0.0
        if len(bits) > 1:
            descriptor = bits[1].lower()
            try:
                if descriptor.endswith("w"):
                    weight = float(descriptor[:-1])
                elif descriptor.endswith("x"):
                    weight = float(descriptor[:-1]) * 1000
            except ValueError:
                pass
        if weight > best_weight:
            best, best_weight = bits[0], weight
    return best


def _img_source(img) -> Optional[str]:
    """Real image URL of an <img>, preferring lazy-load attributes over placeholder `src`."""
    for attr in LAZY_ATTRS:
        value = img.get(attr)
        if value and not value.startswith("data:"):
            return value
    for attr in ("data-srcset", "srcset"):
        value = img.get(attr)
        if value:
            best = _best_srcset(value)
            if best and not best.startswith("data:"):
                return best
    value = img.get("src")
    if value and not value.startswith("data:"):
        return value
    return None


def _jsonld_images(node, depth: int = 0) -> list[str]:
    found: list[str] = []
    if depth > 5:
        return found
    if isinstance(node, dict):
        for key in ("thumbnailUrl", "image", "thumbnail"):
            value = node.get(key)
            if isinstance(value, str):
                found.append(value)
            elif isinstance(value, dict) and isinstance(value.get("url"), str):
                found.append(value["url"])
            elif isinstance(value, list):
                for item in value[:5]:
                    if isinstance(item, str):
                        found.append(item)
                    elif isinstance(item, dict) and isinstance(item.get("url"), str):
                        found.append(item["url"])
        for value in node.values():
            if isinstance(value, (dict, list)):
                found.extend(_jsonld_images(value, depth + 1))
    elif isinstance(node, list):
        for item in node[:20]:
            found.extend(_jsonld_images(item, depth + 1))
    return found


def _extract_asset_urls(
    html: str, page_url: str
) -> list[tuple[str, str, Optional[str]]]:
    """
    Extract candidate image URLs from a page.
    Returns a list of (image_url, asset_type, content_page_url). If the image sits
    inside an <a>, content_page_url is that link (the page of the video/post);
    otherwise it is the page itself.

    Sources, in priority order: og/twitter meta images, linked thumbnails,
    <img> (incl. lazy-load attrs and srcset), <picture>, <video poster>,
    <link rel=image_src|preload>, JSON-LD thumbnailUrl/image, inline CSS
    background images, direct image links.
    """
    soup = BeautifulSoup(html, "html.parser")
    assets: list[tuple[str, str, Optional[str]]] = []
    seen: set[str] = set()

    def full() -> bool:
        return len(assets) >= MAX_ASSETS_PER_PAGE

    def add(raw_url: Optional[str], asset_type: str, content_url: Optional[str] = None) -> None:
        if not raw_url or full():
            return
        raw_url = raw_url.strip()
        if raw_url.startswith("data:"):
            return
        absolute = urljoin(page_url, raw_url)
        parsed = urlparse(absolute)
        if parsed.scheme not in {"http", "https"} or absolute in seen:
            return
        lowered = absolute.lower()
        if parsed.path.lower().endswith(".svg") or any(part in lowered for part in SKIP_URL_PARTS):
            return
        seen.add(absolute)
        content = urljoin(page_url, content_url.strip()) if content_url else page_url
        assets.append((absolute, asset_type, content))

    for tag in soup.find_all("meta"):
        prop = (tag.get("property") or tag.get("name") or "").lower()
        if prop in {"og:image", "og:image:url", "og:image:secure_url", "twitter:image", "twitter:image:src"}:
            add(tag.get("content"), "meta_preview")

    for anchor in soup.find_all("a", href=True):
        img = anchor.find("img")
        if img is not None:
            add(_img_source(img), "thumbnail", anchor.get("href"))
        if full():
            return assets

    for img in soup.find_all("img"):
        add(_img_source(img), "thumbnail")
        if full():
            return assets

    for source in soup.select("picture source"):
        add(_best_srcset(source.get("srcset") or source.get("data-srcset") or ""), "thumbnail")

    for video in soup.find_all("video"):
        add(video.get("poster") or video.get("data-poster"), "poster")

    for link in soup.find_all("link", href=True):
        rel = " ".join(link.get("rel") or []).lower()
        if "image_src" in rel or ("preload" in rel and (link.get("as") or "").lower() == "image"):
            add(link["href"], "meta_preview")

    for script in soup.find_all("script", type="application/ld+json")[:5]:
        try:
            data = json.loads(script.string or "")
        except (ValueError, TypeError):
            continue
        for url in _jsonld_images(data)[:10]:
            add(url, "meta_preview")

    for element in soup.find_all(style=True)[:200]:
        found = re.search(r"url\(\s*['\"]?([^'\")]+)['\"]?\s*\)", element.get("style", ""))
        if found:
            add(found.group(1), "thumbnail")

    for anchor in soup.find_all("a", href=True):
        href = anchor.get("href", "")
        if href.lower().split("?", 1)[0].endswith((".jpg", ".jpeg", ".png", ".webp")):
            add(href, "thumbnail")

    return assets


def _expand_related_domains(
    matches: list[DiscoveryMatch],
    rows: list[dict[str, str]],
) -> list[DiscoveryRelatedDomain]:
    """Sister sites of matched domains: same network, or (because most rows have an
    unknown network) the same video CDN — mirrors usually share infrastructure."""
    related: list[DiscoveryRelatedDomain] = []
    seen: set[str] = {match.domain for match in matches}
    by_domain = {row.get("domain", "").lower(): row for row in rows}

    matched_networks = {
        match.network for match in matches if match.network and match.network != "UnknownNetwork"
    }
    matched_cdns = {
        (by_domain.get(match.domain.lower(), {}).get("video_provider") or "").strip()
        for match in matches
    } - {"", "unknown", "direct_cdn"}

    for network in sorted(matched_networks):
        for row in rows:
            domain = row.get("domain", "")
            if row.get("network") != network or domain in seen:
                continue
            seen.add(domain)
            related.append(
                DiscoveryRelatedDomain(
                    domain=domain,
                    network=network,
                    provider_type=row.get("provider_type") or None,
                    reason="Same network as a visually matched domain; likely mirror or sister site.",
                )
            )

    for cdn in sorted(matched_cdns):
        for row in rows:
            domain = row.get("domain", "")
            if (row.get("video_provider") or "").strip() != cdn or domain in seen:
                continue
            seen.add(domain)
            related.append(
                DiscoveryRelatedDomain(
                    domain=domain,
                    network=(row.get("network") or "UnknownNetwork"),
                    provider_type=row.get("provider_type") or None,
                    reason=f"Uses the same video CDN ({cdn}) as a matched domain; content is often mirrored.",
                )
            )
    return related
