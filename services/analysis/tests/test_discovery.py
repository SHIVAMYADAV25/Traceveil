"""End-to-end crawler tests against fake in-process websites (httpx.MockTransport)."""
import httpx
import pytest
from PIL import ImageOps

from engine import discovery as d
from helpers import photo, thumb, to_bytes

REF = photo("astronaut")
REF_BYTES = to_bytes(REF, "PNG")
COPY = to_bytes(thumb(REF, 320))                           # a normal thumbnail of the user's image
MIRRORED_COPY = to_bytes(thumb(ImageOps.mirror(REF), 320))  # a mirrored re-upload
OTHER = to_bytes(thumb(photo("coffee"), 320))              # unrelated image

ROWS = [
    {"domain": f"{name}.example", "network": "NetA" if name in {"good", "dup"} else "UnknownNetwork",
     "provider_type": "tube", "video_provider": "cdn-x" if name in {"good", "dup", "sister"} else ""}
    for name in ("good", "dup", "blocked", "down", "empty", "sister", "huge")
]


def html(body: str) -> httpx.Response:
    return httpx.Response(200, content=body.encode(), headers={"content-type": "text/html"})


def handler(request: httpx.Request) -> httpx.Response:
    host, path = request.url.host, request.url.path
    if host == "down.example":
        raise httpx.ConnectError("refused", request=request)
    if host == "blocked.example":
        return httpx.Response(403)
    if path.endswith(".jpg"):
        if host == "huge.example":
            return httpx.Response(200, content=b"\xff" * (4 * 1024 * 1024), headers={"content-type": "image/jpeg"})
        data = {"/t/copy.jpg": COPY, "/t/mirror.jpg": MIRRORED_COPY, "/t/other.jpg": OTHER,
                "/t/lazy-real.jpg": COPY}.get(path)
        if data is None:
            return httpx.Response(404)
        return httpx.Response(200, content=data, headers={"content-type": "image/jpeg"})

    if host == "good.example":
        if path == "/robots.txt":
            return httpx.Response(200, text="User-agent: *\nSitemap: https://good.example/sm.xml\n")
        if path == "/sm.xml":
            return httpx.Response(200, content=(
                b"<urlset><url><loc>https://good.example/watch/abc</loc><lastmod>2026-01-02</lastmod></url>"
                b"<url><loc>https://good.example/about</loc></url></urlset>"), headers={"content-type": "application/xml"})
        if path == "/watch/abc":   # only reachable through the sitemap; thumbnail uses a lazy-load placeholder
            return html('<a href="/watch/abc"><img src="data:image/gif;base64,R0lGOD" data-src="/t/lazy-real.jpg"></a>')
        if path == "/":
            return html('<a href="/other">no keyword</a><img src="/t/other.jpg">')
        return httpx.Response(404)
    if host == "dup.example":
        if path == "/":
            return html('<a href="/video/1"><img src="/t/copy.jpg"></a>'
                        '<a href="/video/1"><img srcset="/t/copy.jpg 1x, /t/mirror.jpg 2x"></a>')
        return httpx.Response(404)
    if host == "empty.example":
        return html("<html><body>app rendered by javascript</body></html>") if path == "/" else httpx.Response(404)
    if host == "sister.example":
        return html('<img src="/t/other.jpg">') if path == "/" else httpx.Response(404)
    if host == "huge.example":
        return html('<img src="/t/huge.jpg">') if path == "/" else httpx.Response(404)
    return httpx.Response(404)


@pytest.fixture()
def scan(monkeypatch):
    monkeypatch.setenv("SNIFFER_NETGUARD", "0")      # fake hosts do not resolve in DNS
    monkeypatch.setattr(d, "_load_dataset_rows", lambda: ROWS)
    monkeypatch.setattr(d, "_TRANSPORT", httpx.MockTransport(handler))

    def run(**kwargs):
        return d.run_discovery_scan("case-1", REF_BYTES, **kwargs)
    return run


def test_finds_copy_via_sitemap_and_lazy_load_attribute(scan):
    result = scan()
    assert result.status == "completed"
    good = [m for m in result.direct_matches if m["domain"] == "good.example"]
    assert good, "copy on a sitemap-only page with a data-src thumbnail must be found"
    assert good[0]["page_url"].endswith("/watch/abc")
    assert good[0]["ssim_score"] > 0.5, "SSIM must now be a real value, not a hard-coded 0.0"


def test_duplicate_thumbnails_of_one_page_collapse_into_one_result(scan):
    result = scan()
    dup = [m for m in result.direct_matches if m["domain"] == "dup.example"]
    assert len(dup) == 1
    assert dup[0]["alt_image_urls"], "the second matching thumbnail is kept as alt_image_urls"


def test_mirrored_copy_is_recognised(scan):
    result = scan()
    variants = {m["matched_variant"] for m in result.direct_matches if m["domain"] == "dup.example"}
    assert variants & {"original", "mirrored"}


def test_unrelated_images_are_not_matched(scan):
    result = scan()
    assert all(m["domain"] != "sister.example" for m in result.direct_matches)


def test_domain_status_distinguishes_could_not_check_from_no_match(scan):
    result = scan()
    status = result.domain_status
    assert status["good.example"] == "checked"
    assert status["blocked.example"] == "blocked"
    assert status["down.example"] == "unreachable"
    assert status["empty.example"] == "no_images"
    assert status["sister.example"] == "checked"          # reachable and compared: genuinely no match
    assert result.coverage["blocked"] == 1 and result.coverage["unreachable"] == 1
    assert result.domains_scanned == 5                    # reachable + parsed, not "domains with matches"
    assert result.domains_with_matches == 2


def test_oversized_image_is_abandoned_not_crashing(scan):
    result = scan()
    assert result.status == "completed"


def test_related_domains_use_shared_cdn_when_network_unknown(scan):
    result = scan()
    related = {r["domain"]: r["reason"] for r in result.related_domains}
    assert "sister.example" in related and "CDN" in related["sister.example"]


def test_request_budget_truncates_honestly(scan, monkeypatch):
    monkeypatch.setattr(d, "MAX_TOTAL_CANDIDATES", 1)
    result = scan()
    assert result.truncated is True and result.truncation_reason == "request_budget"


DEMO_SAMPLE = (d.DEMO_IMAGES_DIR / "demo_original.jpg").read_bytes()


def test_demo_flag_only_applies_to_bundled_sample_images(scan):
    # A user's own image with demo=True must get a REAL scan, never the scripted result.
    own = scan(demo=True)
    assert own.demo is False
    assert "good.example" in own.target_domains


def test_demo_sample_returns_scripted_result_and_is_labelled(monkeypatch):
    monkeypatch.setattr(d, "_load_dataset_rows", lambda: ROWS)
    sample = d.run_discovery_scan("case-1", DEMO_SAMPLE, demo=True)
    assert sample.demo is True and sample.status == "completed"
    # ...and a later real scan is unaffected
    assert d.DEMO_DISCOVERY_MODE is False


def test_sample_without_demo_flag_is_a_real_scan(scan):
    result = d.run_discovery_scan("case-1", DEMO_SAMPLE)
    assert result.demo is False
