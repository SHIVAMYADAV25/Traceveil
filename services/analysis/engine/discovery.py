from __future__ import annotations

import asyncio
import csv
import io
import json
import os
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Iterable, Optional
from urllib.parse import urljoin, urlparse

import httpx
import imagehash
import numpy as np
from bs4 import BeautifulSoup
from PIL import Image, ImageOps

from . import geometry, netguard
from .keypoints import compute_match_rate
from .models import DiscoveryMatch, DiscoveryRelatedDomain, DiscoveryResult

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
MAX_IMAGE_PIXELS = 40_000_000
MIN_IMAGE_SIDE = 48
HTTP_TIMEOUT = 12
MAX_CONCURRENT = 12
CPU_WORKERS = 4

# ── Matching thresholds ───────────────────────────────────────────────────
HASH_MAX_AVG_DISTANCE = 4          # tier 1: average pHash/dHash/aHash Hamming distance
GEO_STRUCTURAL_INLIERS = 15        # tier 2: RANSAC inliers for a confident structural match
GEO_PROBABLE_INLIERS = 10          # tier 3: lower bound for a probable match
GEO_MIN_INLIER_RATIO = 0.30        # inliers / ratio-test survivors (rejects scattered matches)

# Demo mode is now opt-in per request (run_discovery_scan(demo=True)).
# SNIFFER_DEMO_MODE=1 forces it process-wide for local demos only.
DEMO_DISCOVERY_MODE = os.getenv("SNIFFER_DEMO_MODE", "0") == "1"
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
) -> DiscoveryResult:
    started_at = time.time()
    rows = _load_dataset_rows()

    if demo or DEMO_DISCOVERY_MODE:
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
        )


async def _async_discovery_scan(
    case_id: str,
    suspicious_bytes: bytes,
    origin_domain: Optional[str],
    rows: list[dict[str, str]],
    progress_cb: Optional[Callable[[dict], None]],
) -> DiscoveryResult:
    started_at = time.time()
    prioritized_network = _find_network(origin_domain, rows) if origin_domain else None
    domains = _select_domains(rows)
    if prioritized_network:
        # Same-network sites first: they get scanned first and survive a truncated scan.
        domains = sorted(domains, key=lambda r: r.get("network") != prioritized_network)

    reference = build_reference(suspicious_bytes)
    budget = ScanBudget(MAX_TOTAL_CANDIDATES, SCAN_TIMEOUT_SECONDS)
    all_matches: list[DiscoveryMatch] = []
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
                    _scan_page(sem, cpu_sem, client, page_url, row, reference, budget, prefetched)
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

    for row, _page, _html in work[processed:]:   # pages never reached because a budget ran out
        stats[row["domain"]]["skipped"] += 1

    domain_status = {domain: _final_status(s) for domain, s in stats.items()}
    coverage: dict[str, int] = {"checked": 0, "no_images": 0, "blocked": 0, "unreachable": 0, "skipped": 0}
    for status in domain_status.values():
        coverage[status] += 1

    top_matches = _consolidate_matches(all_matches)[:12]
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
    )


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
    reference: "Reference",
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
                match_candidate,
                reference, image_bytes, domain, network, provider_type,
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


# ── Matching ──────────────────────────────────────────────────────────────

@dataclass
class Reference:
    """The user's image prepared once: perceptual hashes for several variants
    (original, mirrored, standard centre crops) and SIFT features for the original
    and mirrored versions."""
    original_bytes: bytes
    variants: dict  # name -> (PIL image, {"phash","dhash","ahash"})
    features: dict  # "original" | "mirrored" -> geometry.Features | None


def _open_rgb(data: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(data))
    if image.width * image.height > MAX_IMAGE_PIXELS:  # header-only check; avoids decompression bombs
        raise ValueError("image too large")
    return ImageOps.exif_transpose(image).convert("RGB")


def _hashes_of(image: Image.Image) -> dict[str, imagehash.ImageHash]:
    return {
        "phash": imagehash.phash(image),
        "dhash": imagehash.dhash(image),
        "ahash": imagehash.average_hash(image),
    }


def _compute_hashes(image_bytes: bytes) -> dict[str, imagehash.ImageHash]:
    return _hashes_of(_open_rgb(image_bytes))


def _center_crop(image: Image.Image, ratio: float) -> Image.Image:
    w, h = image.size
    if w / h > ratio:
        new_w = int(h * ratio)
        left = (w - new_w) // 2
        return image.crop((left, 0, left + new_w, h))
    new_h = int(w / ratio)
    top = (h - new_h) // 2
    return image.crop((0, top, w, top + new_h))


def build_reference(image_bytes: bytes) -> Reference:
    base = _open_rgb(image_bytes)
    images: dict[str, Image.Image] = {"original": base, "mirrored": ImageOps.mirror(base)}
    aspect = base.width / base.height
    for name, ratio in (("crop_16x9", 16 / 9), ("crop_4x3", 4 / 3), ("crop_1x1", 1.0), ("crop_9x16", 9 / 16)):
        if abs(aspect - ratio) / ratio > 0.05:  # skip crops that would equal the original
            images[name] = _center_crop(base, ratio)
    variants = {name: (img, _hashes_of(img)) for name, img in images.items()}
    features = {
        "original": geometry.extract(np.array(images["original"].convert("L"))),
        "mirrored": geometry.extract(np.array(images["mirrored"].convert("L"))),
    }
    return Reference(original_bytes=image_bytes, variants=variants, features=features)


def _ssim(a: Image.Image, b: Image.Image) -> float:
    try:
        from skimage.metrics import structural_similarity

        arr_a = np.array(a.convert("L").resize((128, 128)))
        arr_b = np.array(b.convert("L").resize((128, 128)))
        return round(float(structural_similarity(arr_a, arr_b, data_range=255)), 4)
    except Exception:
        return 0.0


def _histogram_correlation(img1_bytes: bytes, img2_bytes: bytes) -> float:
    try:
        h1 = np.array(_open_rgb(img1_bytes).resize((256, 256)).histogram(), dtype=np.float64)
        h2 = np.array(_open_rgb(img2_bytes).resize((256, 256)).histogram(), dtype=np.float64)
        h1, h2 = h1 / h1.sum(), h2 / h2.sum()
        num = ((h1 - h1.mean()) * (h2 - h2.mean())).sum()
        den = np.sqrt(((h1 - h1.mean()) ** 2).sum() * ((h2 - h2.mean()) ** 2).sum())
        return 0.0 if den == 0 else max(0.0, round(float(num / den), 4))
    except Exception:
        return 0.0


def match_candidate(
    reference: Reference,
    candidate_bytes: bytes,
    domain: str,
    network: Optional[str],
    provider_type: Optional[str],
    page_url: str,
    image_url: str,
    asset_type: str,
) -> Optional[DiscoveryMatch]:
    try:
        candidate = _open_rgb(candidate_bytes)
    except Exception:
        return None
    if min(candidate.size) < MIN_IMAGE_SIDE:  # icons, spacers, tracking pixels
        return None

    cand_hashes = _hashes_of(candidate)

    # Best variant of the reference by average hash distance.
    best_name, best_avg, best_dists = "original", 99.0, (64, 64, 64)
    for name, (_, variant_hashes) in reference.variants.items():
        dists = tuple(int(variant_hashes[k] - cand_hashes[k]) for k in ("phash", "dhash", "ahash"))
        avg = sum(dists) / 3
        if avg < best_avg:
            best_name, best_avg, best_dists = name, avg, dists

    common = dict(
        domain=domain, network=network, provider_type=provider_type,
        page_url=page_url, image_url=image_url, asset_type=asset_type,
        phash_distance=best_dists[0], dhash_distance=best_dists[1], ahash_distance=best_dists[2],
    )

    # ── Tier 1: perceptual hashes (instant; resize / recompress / crop / mirror variants) ──
    if best_avg <= HASH_MAX_AVG_DISTANCE:
        confidence = min(round(max(0.0, 1.0 - best_avg / 16.0) * 100, 1), 99.0)
        return DiscoveryMatch(
            **common,
            confidence=confidence,
            match_type="exact" if best_name == "original" else "near_duplicate",
            ssim_score=_ssim(reference.variants[best_name][0], candidate),
            match_method="hash",
            matched_variant=best_name,
        )

    # ── Tier 2/3: geometric verification (SIFT + ratio test + RANSAC) ──
    if geometry.available():
        cand_features = geometry.extract(np.array(candidate.convert("L")))
        results = {
            name: geometry.match(reference.features.get(name), cand_features)
            for name in ("original", "mirrored")
        }
        variant = max(results, key=lambda n: results[n].inliers)
        geo = results[variant]
        if geo.inliers >= GEO_PROBABLE_INLIERS and geo.inlier_ratio >= GEO_MIN_INLIER_RATIO:
            ssim = _ssim(reference.variants[variant][0], candidate)
            extra = dict(
                keypoint_matches=geo.inliers,
                keypoint_match_rate=geo.inlier_ratio,
                ssim_score=ssim,
                match_method="geometric",
                matched_variant=variant,
            )
            if geo.inliers >= GEO_STRUCTURAL_INLIERS:
                confidence = round(70.0 + min(geo.inliers, 80) / 80.0 * 25.0, 1)
                return DiscoveryMatch(**common, confidence=min(confidence, 95.0), match_type="structural", **extra)
            hist = _histogram_correlation(reference.original_bytes, candidate_bytes)
            confidence = round(40.0 + geo.inliers * 2.0 + hist * 10.0, 1)
            return DiscoveryMatch(
                **common, confidence=min(confidence, 85.0), match_type="probable",
                hist_correlation=round(hist, 4), **extra,
            )
        return None

    # ── Fallback when SIFT is unavailable: the previous ORB ratio rule ──
    kp_matches, kp_rate = compute_match_rate(reference.original_bytes, candidate_bytes)
    if kp_rate >= 0.35:
        return DiscoveryMatch(
            **common, confidence=min(round(65.0 + min(kp_rate, 1.0) * 25.0, 1), 95.0),
            match_type="structural", keypoint_matches=kp_matches, keypoint_match_rate=round(kp_rate, 4),
            ssim_score=_ssim(reference.variants["original"][0], candidate), match_method="orb_fallback",
        )
    if kp_rate >= 0.20:
        hist = _histogram_correlation(reference.original_bytes, candidate_bytes)
        return DiscoveryMatch(
            **common, confidence=min(round(40.0 + kp_rate * 30.0 + hist * 15.0, 1), 85.0),
            match_type="probable", keypoint_matches=kp_matches, keypoint_match_rate=round(kp_rate, 4),
            hist_correlation=round(hist, 4), ssim_score=_ssim(reference.variants["original"][0], candidate),
            match_method="orb_fallback",
        )
    return None


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
