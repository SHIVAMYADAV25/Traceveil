"""
Stage 3 of the video pipeline: verify a candidate against the real video file.

Given a direct video URL found on a matched page, download a bounded prefix
(through the guarded HTTP client), decode frames, and check whether frames of the
candidate match frames of the user's video **in the same order**.

Why order matters: one similar frame can match by coincidence, and several similar
frames can come from unrelated videos shot in the same room. Several distinctive
frames matching in a consistent time order is much stronger evidence of a copy.

Honest limits (reported to the user, never hidden):
  * only the first VERIFY_MAX_BYTES of the candidate are read, so the user's clip
    must overlap the start of the candidate video
  * an MP4 whose index is at the end cannot be decoded from a partial download
  * streams (.m3u8) and embeds are not downloaded
"""
from __future__ import annotations

import asyncio
import os
import tempfile
from dataclasses import dataclass
from typing import Optional

import httpx

from . import netguard
from .matching import VideoReference, match_image_to_video
from .models import DiscoveryMatch
from .video import remove, sample_frames


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


VERIFY_ENABLED = os.getenv("SNIFFER_VERIFY_VIDEO", "1") != "0"
VERIFY_MAX_BYTES = _env_int("SNIFFER_VERIFY_MAX_BYTES", 6 * 1024 * 1024)
VERIFY_MAX_CANDIDATES = _env_int("SNIFFER_VERIFY_MAX_CANDIDATES", 6)
VERIFY_TIMEOUT_SECONDS = 45
FRAMES_PER_CANDIDATE = 12
FRAME_STEP_SECONDS = 2.0
REQUIRED_ORDERED_FRAMES = 3     # starting rule; calibrate on real data before relying on it
FRAME_MATCH_TYPES = {"exact", "near_duplicate", "structural"}  # "probable" is too weak to verify with


@dataclass
class Verification:
    # verified | partial | no_frame_match | not_verified | not_attempted
    status: str
    reason: Optional[str] = None
    frames_checked: int = 0
    matched_frames: int = 0
    ordered_frames: int = 0
    segment: Optional[dict] = None          # {"start", "end"} seconds in the USER'S video
    seconds_checked: float = 0.0            # how much of the candidate video was examined


def ordered_matches(pairs: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """pairs: (candidate_time, user_video_time). Returns the longest run in which the
    user's-video time strictly increases as candidate time increases (a chronological
    match). O(n^2); n is at most FRAMES_PER_CANDIDATE."""
    pairs = sorted(pairs)
    if not pairs:
        return []
    best_len = [1] * len(pairs)
    prev = [-1] * len(pairs)
    for i in range(len(pairs)):
        for j in range(i):
            if pairs[j][0] < pairs[i][0] and pairs[j][1] < pairs[i][1] and best_len[j] + 1 > best_len[i]:
                best_len[i], prev[i] = best_len[j] + 1, j
    end = max(range(len(pairs)), key=lambda k: best_len[k])
    chain = []
    while end != -1:
        chain.append(pairs[end])
        end = prev[end]
    return chain[::-1]


async def _download_prefix(
    client: httpx.AsyncClient, url: str, max_bytes: int
) -> tuple[Optional[str], Optional[str]]:
    """Stream up to max_bytes of `url` into a private temp file. Returns (path, None)
    or (None, reason). Stopping at the cap is normal, not an error."""
    headers = {"Range": f"bytes=0-{max_bytes - 1}", "Accept": "video/*,application/octet-stream;q=0.8,*/*;q=0.5"}
    fd, path = tempfile.mkstemp(prefix="sniffer-cand-", suffix=".bin")
    try:
        with os.fdopen(fd, "wb") as out:
            async with client.stream("GET", url, headers=headers) as response:
                if response.status_code in (401, 403, 429, 451, 503):
                    return _fail(path, "the site refused the download")
                if response.status_code not in (200, 206):
                    return _fail(path, f"the site answered HTTP {response.status_code}")
                ctype = response.headers.get("content-type", "").lower()
                if "text/html" in ctype or "json" in ctype or "xml" in ctype:
                    return _fail(path, "the address is a web page, not a video file")
                total = 0
                async for chunk in response.aiter_bytes():
                    total += len(chunk)
                    if total > max_bytes:
                        out.write(chunk[: len(chunk) - (total - max_bytes)])
                        break
                    out.write(chunk)
        return path, None
    except netguard.BlockedAddress:
        return _fail(path, "blocked by network policy (non-public address)")
    except httpx.TimeoutException:
        return _fail(path, "the download timed out")
    except httpx.HTTPError:
        return _fail(path, "the download failed")


def _fail(path: str, reason: str) -> tuple[None, str]:
    remove(path)
    return None, reason


def _compare_frames(vref: VideoReference, path: str) -> Verification:
    """CPU-bound: decode frames and match each against the user's keyframes."""
    frames = sample_frames(path, count=FRAMES_PER_CANDIDATE, step_seconds=FRAME_STEP_SECONDS)
    if not frames:
        return Verification(
            "not_verified",
            "The partial download could not be decoded (the file's index may be at the end, or the format is unsupported).",
        )
    pairs: list[tuple[float, float]] = []
    for frame in frames:
        found = match_image_to_video(vref, frame.image)
        if found and found[1].match_type in FRAME_MATCH_TYPES:
            pairs.append((frame.time, vref.frames[found[0]].time))

    seconds = frames[-1].time
    chain = ordered_matches(pairs)
    required = min(REQUIRED_ORDERED_FRAMES, len(vref.frames))
    base = dict(frames_checked=len(frames), matched_frames=len(pairs), ordered_frames=len(chain), seconds_checked=seconds)

    if len(chain) >= required and required >= 2:
        user_times = [user for _, user in chain]
        return Verification("verified", segment={"start": min(user_times), "end": max(user_times)}, **base)
    if pairs:
        reason = (
            "Your video has only one distinct frame, so chronological order could not be checked."
            if required < 2
            else f"{len(pairs)} frame(s) matched but fewer than {required} in chronological order."
        )
        return Verification("partial", reason, **base)
    return Verification(
        "no_frame_match",
        f"No frames in the first {int(seconds)} s of that video matched yours. This does not rule out a match later in the video.",
        **base,
    )


async def verify_video_url(
    sem: asyncio.Semaphore, cpu_sem: asyncio.Semaphore, client: httpx.AsyncClient,
    vref: VideoReference, url: str,
) -> Verification:
    path: Optional[str] = None
    try:
        async def fetch():
            async with sem:
                return await _download_prefix(client, url, VERIFY_MAX_BYTES)

        path, reason = await asyncio.wait_for(fetch(), VERIFY_TIMEOUT_SECONDS)
        if path is None:
            return Verification("not_verified", f"Download failed: {reason}.")
        async with cpu_sem:
            return await asyncio.to_thread(_compare_frames, vref, path)
    except asyncio.TimeoutError:
        return Verification("not_verified", "Verification timed out.")
    except Exception:
        return Verification("not_verified", "Verification failed unexpectedly.")
    finally:
        remove(path)


# ── Turning evidence into the headline category ───────────────────────────

def apply_evidence(match: DiscoveryMatch, verification: Optional[Verification]) -> None:
    """Fill match.category / evidence / matched_segment from what was actually found.
    The numeric confidence is kept for compatibility, but the UI leads with the category."""
    if verification is None:
        reason = "no direct video file was found" if match.video_url_type != "direct" else "verification was not run"
        verification = Verification("not_attempted", reason.capitalize() + ".")

    if verification.status == "verified":
        match.category = "verified"
        match.matched_segment = verification.segment
        match.confidence = round(min(99.0, max(match.confidence, 90.0 + 2.0 * verification.ordered_frames)), 1)
    elif match.match_type in ("exact", "near_duplicate", "structural") or match.frames_matched >= 2:
        match.category = "strong"
    else:
        match.category = "possible"

    match.evidence = {
        "thumbnail_match": True,
        "frames_matched": match.frames_matched,
        "video_url_found": match.video_url is not None,
        "video_url_type": match.video_url_type,
        "verification": verification.status,
        "verification_reason": verification.reason,
        "frames_checked": verification.frames_checked,
        "matched_frames": verification.matched_frames,
        "ordered_frames": verification.ordered_frames if verification.frames_checked else None,
        "seconds_checked": verification.seconds_checked or None,
    }
