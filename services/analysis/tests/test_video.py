"""Video pipeline: intake, keyframes, video URL extraction, temporal check, and the full scan."""
import asyncio
import glob
import io
import os
import tempfile

import httpx
import pytest

from engine import discovery as d
from engine import netguard, verify
from engine import video as videolib
from engine.verify import Verification, ordered_matches, verify_video_url
from video_world import (ROWS, handler, make_reference, user_video_path, video_bytes)


# ── Intake ────────────────────────────────────────────────────────────────

def test_keyframes_cover_all_scenes_and_are_distinct():
    path = user_video_path()
    try:
        info = videolib.probe(path)
        frames = videolib.extract_keyframes(path, info)
    finally:
        os.unlink(path)
    assert info.duration == 15.0 and (info.width, info.height) == (480, 270)
    assert 5 <= len(frames) <= videolib.MAX_KEYFRAMES
    times = [f.time for f in frames]
    assert times == sorted(times) and times[-1] <= info.duration
    scenes_seen = {int(t // 3) for t in times}
    assert scenes_seen == {0, 1, 2, 3, 4}, "every scene must be represented"
    assert max(frames[0].image.size) <= videolib.FRAME_MAX_SIDE


def test_black_intro_frames_are_dropped():
    path = user_video_path("black_intro")
    try:
        frames = videolib.extract_keyframes(path)
    finally:
        os.unlink(path)
    assert all(f.time >= 2.0 for f in frames), "black frames hash alike and would cause false matches"


@pytest.mark.parametrize("payload", [b"definitely not a video", b"\x00" * 4096, b"\xff\xd8\xff\xe0" + b"0" * 500])
def test_non_video_files_are_rejected_by_decoding(payload):
    path = tempfile.mktemp(suffix=".mp4")
    with open(path, "wb") as handle:
        handle.write(payload)
    try:
        with pytest.raises(videolib.VideoError):
            videolib.extract_keyframes(path)
    finally:
        os.unlink(path)


def test_duration_cap(monkeypatch):
    monkeypatch.setattr(videolib, "MAX_DURATION_SECONDS", 5)
    path = user_video_path()
    try:
        with pytest.raises(videolib.VideoError, match="longer than"):
            videolib.probe(path)
    finally:
        os.unlink(path)


def test_spool_upload_enforces_cap_and_leaves_no_temp_file():
    before = set(glob.glob(os.path.join(tempfile.gettempdir(), "traceveil-video-*")))
    stream = io.BytesIO(b"x" * 5000)

    async def read(n):
        return stream.read(n)

    with pytest.raises(videolib.VideoTooLarge):
        asyncio.run(videolib.spool_upload(read, limit=1000, chunk=512))
    assert set(glob.glob(os.path.join(tempfile.gettempdir(), "traceveil-video-*"))) == before

    async def empty(n):
        return b""
    with pytest.raises(videolib.VideoError, match="empty"):
        asyncio.run(videolib.spool_upload(empty, limit=1000))
    assert set(glob.glob(os.path.join(tempfile.gettempdir(), "traceveil-video-*"))) == before


# ── Temporal ordering ─────────────────────────────────────────────────────

def test_ordered_matches_finds_chronological_run():
    pairs = [(0, 3), (2, 6), (4, 9), (6, 12)]
    assert ordered_matches(pairs) == pairs


def test_reversed_order_is_not_a_chronological_match():
    pairs = [(0, 12), (2, 9), (4, 6), (6, 3)]   # their video plays your scenes backwards
    assert len(ordered_matches(pairs)) == 1


def test_ordered_matches_ignores_one_off_coincidence():
    pairs = [(0, 3), (2, 0), (4, 6), (6, 9)]    # one frame matched somewhere unrelated
    chain = ordered_matches(pairs)
    assert [p[1] for p in chain] == [3, 6, 9]
    assert ordered_matches([]) == []


# ── Video URL extraction ──────────────────────────────────────────────────

def test_extract_video_urls_classifies_and_ranks():
    html = """
    <html><head>
      <meta property="og:video" content="https://example.com/player/123">
      <meta property="og:video:secure_url" content="https://cdn.example.com/a/clip.mp4?token=1">
      <script type="application/ld+json">{"@type":"VideoObject","contentUrl":"https://cdn.example.com/b/other.webm"}</script>
    </head><body>
      <video><source src="/rel/video.m3u8" type="application/x-mpegURL"></video>
      <script>var cfg = {"hls":"https:\\/\\/cdn.example.com\\/hls\\/master.m3u8"};</script>
      <iframe src="https://embed.example.com/e/9"></iframe>
      <a href="javascript:void(0)">x</a>
    </body></html>"""
    found = d._extract_video_urls(html, "https://example.com/watch/1")
    kinds = [k for _, k in found]
    assert kinds == sorted(kinds, key=lambda k: {"direct": 0, "stream": 1, "embed": 2}[k]), "direct first, then streams, then embeds"
    urls = dict(found)
    assert urls["https://cdn.example.com/a/clip.mp4?token=1"] == "direct"
    assert urls["https://cdn.example.com/b/other.webm"] == "direct"
    assert urls["https://example.com/rel/video.m3u8"] == "stream"          # relative URL resolved, never treated as a file
    assert urls["https://cdn.example.com/hls/master.m3u8"] == "stream"     # JSON-escaped slashes handled
    assert urls["https://example.com/player/123"] == "embed"
    assert len(found) <= 5 and not any(u.startswith("javascript") for u in urls)


def test_page_without_a_player_gives_nothing_not_a_guess():
    assert d._extract_video_urls("<html><body><img src='/a.jpg'></body></html>", "https://x.example/") == []


# ── Verification ──────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def vref():
    return make_reference()


def _verify(vref, video_kind, **patch):
    def serve(request):
        return handler(request)
    async def go():
        async with httpx.AsyncClient(transport=httpx.MockTransport(serve), follow_redirects=True) as client:
            return await verify_video_url(asyncio.Semaphore(4), asyncio.Semaphore(2), client, vref,
                                          f"https://v.example/v/{video_kind}.mp4")
    return asyncio.run(go())


def test_trimmed_reencoded_watermarked_copy_is_verified_with_a_time_range(vref):
    result = _verify(vref, "copy")
    assert result.status == "verified", result
    assert result.ordered_frames >= 3
    assert result.segment["start"] >= 2.5, "the copy starts after your first scene (it was trimmed)"
    assert result.segment["end"] > result.segment["start"]


def test_same_scenes_in_the_wrong_order_are_not_verified(vref):
    result = _verify(vref, "shuffled")
    assert result.status == "partial", result
    assert result.ordered_frames < 3


def test_unrelated_video_has_no_frame_match(vref):
    result = _verify(vref, "other")
    assert result.status == "no_frame_match"
    assert "does not rule out" in result.reason


def test_truncated_download_whose_index_is_at_the_end_is_honestly_not_verified(vref, monkeypatch):
    monkeypatch.setattr(verify, "VERIFY_MAX_BYTES", 20_000)
    result = _verify(vref, "copy")
    assert result.status == "not_verified" and "decoded" in result.reason


def test_download_is_blocked_for_internal_addresses(vref, monkeypatch):
    monkeypatch.setenv("TRACEVEIL_NETGUARD", "1")

    async def fake_resolve(host):
        return ["169.254.169.254"]
    monkeypatch.setattr(netguard, "_resolve", fake_resolve)
    netguard._cache.clear()

    async def go():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler), follow_redirects=True,
                                     event_hooks={"request": [netguard.request_hook]}) as client:
            return await verify_video_url(asyncio.Semaphore(4), asyncio.Semaphore(2), client, vref,
                                          "http://metadata.internal/v/copy.mp4")
    result = asyncio.run(go())
    assert result.status == "not_verified" and "network policy" in result.reason


# ── Full scan ─────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def scan_result(vref):
    mp = pytest.MonkeyPatch()
    mp.setenv("TRACEVEIL_NETGUARD", "0")
    mp.setattr(d, "_load_dataset_rows", lambda: ROWS)
    mp.setattr(d, "_TRANSPORT", httpx.MockTransport(handler))
    try:
        return d.run_discovery_scan("video-case", b"", video_ref=vref)
    finally:
        mp.undo()


def by_domain(result):
    return {m["domain"]: m for m in result.direct_matches}


def test_full_scan_reports_video_urls_categories_and_evidence(scan_result):
    assert scan_result.status == "completed" and scan_result.input_type == "video"
    assert scan_result.reference_frames >= 5 and scan_result.video_info["duration_seconds"] == 15.0
    m = by_domain(scan_result)

    # the real copy: found, video URL resolved, verified, with a time range
    copy = m["copy.example"]
    assert copy["video_url"].endswith("/v/copy.mp4") and copy["video_url_type"] == "direct"
    assert copy["category"] == "verified" and copy["evidence"]["verification"] == "verified"
    assert copy["evidence"]["ordered_frames"] >= 3 and copy["matched_segment"]["end"] > copy["matched_segment"]["start"]
    assert copy["confidence"] >= 95 and copy["matched_frame_time"] is not None

    # thumbnail match with a stream: URL reported, honestly not downloaded
    stream = m["thumbonly.example"]
    assert stream["video_url_type"] == "stream" and stream["evidence"]["verification"] == "not_attempted"
    assert stream["category"] in {"strong", "possible"}

    # right thumbnail, wrong order: must NOT be verified
    assert m["shuffled.example"]["category"] != "verified"
    assert m["shuffled.example"]["evidence"]["verification"] == "partial"

    # right thumbnail, different video file behind it
    assert m["lookalike.example"]["evidence"]["verification"] == "no_frame_match"
    assert m["lookalike.example"]["category"] != "verified"

    # page without an exposed player: reported with null video URL, not guessed
    assert m["noplayer.example"]["video_url"] is None

    # unrelated thumbnail: not reported at all
    assert "unrelated.example" not in m


def test_only_one_scene_matches_a_single_thumbnail_but_it_is_found(scan_result):
    assert by_domain(scan_result)["copy.example"]["frames_matched"] >= 1


def test_image_scan_is_unaffected_by_video_support():
    # same entry point, no video_ref: behaves as before and says it is an image scan
    from helpers import photo, to_bytes
    import test_discovery as td
    mp = pytest.MonkeyPatch()
    mp.setenv("TRACEVEIL_NETGUARD", "0")
    mp.setattr(d, "_load_dataset_rows", lambda: td.ROWS)
    mp.setattr(d, "_TRANSPORT", httpx.MockTransport(td.handler))
    try:
        result = d.run_discovery_scan("img", to_bytes(photo("astronaut"), "PNG"))
    finally:
        mp.undo()
    assert result.input_type == "image" and result.reference_frames == 0
    assert any(x["domain"] == "good.example" for x in result.direct_matches)
    assert all(x["category"] is None and x["video_url"] is None for x in result.direct_matches)


def test_apply_evidence_never_marks_verified_without_verification():
    from engine.models import DiscoveryMatch
    from engine.verify import apply_evidence
    m = DiscoveryMatch(domain="a", page_url="p", image_url="i", asset_type="thumbnail", confidence=88.0,
                       match_type="structural", phash_distance=1, dhash_distance=1, ahash_distance=1, ssim_score=0.5)
    apply_evidence(m, None)
    assert m.category == "strong" and m.evidence["verification"] == "not_attempted"
    apply_evidence(m, Verification("partial", "x", ordered_frames=2))
    assert m.category == "strong"
