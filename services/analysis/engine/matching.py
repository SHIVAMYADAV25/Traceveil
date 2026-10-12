"""
Matching primitives shared by image and video discovery.

Pure computation: no network, no FastAPI. That keeps it unit-testable and lets the
video pipeline be moved into its own worker process later without changes here.

Image matching, in tiers (cheapest first):
  1. Perceptual hashes (pHash / dHash / aHash) against the original, a mirrored
     copy and standard centre crops of the reference.
  2. SIFT + Lowe ratio test + RANSAC (geometric verification) on both the
     original and mirrored reference.
  3. If SIFT is unavailable: the previous ORB keypoint-ratio rule.

Video matching: the video is reduced to keyframes, each prepared as a normal
image `Reference`. A candidate thumbnail is ranked against every keyframe with
the cheap hashes, and only the 3 closest keyframes get the expensive geometric
test.
"""
from __future__ import annotations

import io
from dataclasses import dataclass
from typing import Optional

import imagehash
import numpy as np
from PIL import Image, ImageOps

from . import geometry
from .keypoints import compute_match_rate
from .models import DiscoveryMatch

MAX_IMAGE_PIXELS = 40_000_000
MIN_IMAGE_SIDE = 48

HASH_MAX_AVG_DISTANCE = 4          # tier 1: average pHash/dHash/aHash Hamming distance
GEO_STRUCTURAL_INLIERS = 15        # tier 2: RANSAC inliers for a confident structural match
GEO_PROBABLE_INLIERS = 10          # tier 3: lower bound for a probable match
GEO_MIN_INLIER_RATIO = 0.30        # inliers / ratio-test survivors (rejects scattered matches)
VIDEO_TOP_FRAMES = 3               # keyframes that get the expensive geometric test per candidate


# ── Reference preparation ─────────────────────────────────────────────────

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


# ── Scores ────────────────────────────────────────────────────────────────

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


# ── Comparison of one candidate against one reference ─────────────────────

@dataclass
class Outcome:
    match_type: str       # exact | near_duplicate | structural | probable
    confidence: float
    method: str           # hash | geometric | orb_fallback
    variant: str          # which version of the reference matched
    ssim: float = 0.0
    inliers: int = 0
    inlier_ratio: float = 0.0
    hist: float = 0.0
    dists: tuple = (64, 64, 64)


def _best_variant(reference: Reference, cand_hashes: dict) -> tuple[str, float, tuple]:
    best_name, best_avg, best_dists = "original", 99.0, (64, 64, 64)
    for name, (_, variant_hashes) in reference.variants.items():
        dists = tuple(int(variant_hashes[k] - cand_hashes[k]) for k in ("phash", "dhash", "ahash"))
        avg = sum(dists) / 3
        if avg < best_avg:
            best_name, best_avg, best_dists = name, avg, dists
    return best_name, best_avg, best_dists


def _candidate_bytes(candidate: Image.Image, cache: dict) -> bytes:
    if "bytes" not in cache:
        buffer = io.BytesIO()
        candidate.save(buffer, "JPEG", quality=90)
        cache["bytes"] = buffer.getvalue()
    return cache["bytes"]


def _compare(
    reference: Reference, candidate: Image.Image, cand_hashes: dict, cache: dict
) -> Optional[Outcome]:
    """cache holds per-candidate work (SIFT features, encoded bytes) so comparing one
    candidate against several references never repeats it."""
    best_name, best_avg, best_dists = _best_variant(reference, cand_hashes)

    # Tier 1: perceptual hashes (instant; resize / recompress / crop / mirror variants)
    if best_avg <= HASH_MAX_AVG_DISTANCE:
        return Outcome(
            match_type="exact" if best_name == "original" else "near_duplicate",
            confidence=min(round(max(0.0, 1.0 - best_avg / 16.0) * 100, 1), 99.0),
            method="hash",
            variant=best_name,
            ssim=_ssim(reference.variants[best_name][0], candidate),
            dists=best_dists,
        )

    # Tier 2/3: geometric verification (SIFT + ratio test + RANSAC)
    if geometry.available():
        if "features" not in cache:
            cache["features"] = geometry.extract(np.array(candidate.convert("L")))
        results = {
            name: geometry.match(reference.features.get(name), cache["features"])
            for name in ("original", "mirrored")
        }
        variant = max(results, key=lambda n: results[n].inliers)
        geo = results[variant]
        if geo.inliers < GEO_PROBABLE_INLIERS or geo.inlier_ratio < GEO_MIN_INLIER_RATIO:
            return None
        common = dict(
            method="geometric", variant=variant, inliers=geo.inliers, inlier_ratio=geo.inlier_ratio,
            ssim=_ssim(reference.variants[variant][0], candidate), dists=best_dists,
        )
        if geo.inliers >= GEO_STRUCTURAL_INLIERS:
            confidence = round(70.0 + min(geo.inliers, 80) / 80.0 * 25.0, 1)
            return Outcome(match_type="structural", confidence=min(confidence, 95.0), **common)
        hist = _histogram_correlation(reference.original_bytes, _candidate_bytes(candidate, cache))
        confidence = round(40.0 + geo.inliers * 2.0 + hist * 10.0, 1)
        return Outcome(match_type="probable", confidence=min(confidence, 85.0), hist=round(hist, 4), **common)

    # Fallback when SIFT is unavailable: the previous ORB ratio rule
    data = _candidate_bytes(candidate, cache)
    kp_matches, kp_rate = compute_match_rate(reference.original_bytes, data)
    base = dict(
        method="orb_fallback", variant="original", inliers=kp_matches, inlier_ratio=round(kp_rate, 4),
        ssim=_ssim(reference.variants["original"][0], candidate), dists=best_dists,
    )
    if kp_rate >= 0.35:
        return Outcome(match_type="structural", confidence=min(round(65.0 + min(kp_rate, 1.0) * 25.0, 1), 95.0), **base)
    if kp_rate >= 0.20:
        hist = _histogram_correlation(reference.original_bytes, data)
        return Outcome(
            match_type="probable", confidence=min(round(40.0 + kp_rate * 30.0 + hist * 15.0, 1), 85.0),
            hist=round(hist, 4), **base,
        )
    return None


def _to_match(
    outcome: Outcome, domain: str, network: Optional[str], provider_type: Optional[str],
    page_url: str, image_url: str, asset_type: str,
) -> DiscoveryMatch:
    return DiscoveryMatch(
        domain=domain, network=network, provider_type=provider_type,
        page_url=page_url, image_url=image_url, asset_type=asset_type,
        phash_distance=outcome.dists[0], dhash_distance=outcome.dists[1], ahash_distance=outcome.dists[2],
        confidence=outcome.confidence, match_type=outcome.match_type, ssim_score=outcome.ssim,
        keypoint_matches=outcome.inliers, keypoint_match_rate=outcome.inlier_ratio,
        hist_correlation=outcome.hist, match_method=outcome.method, matched_variant=outcome.variant,
    )


def _open_candidate(candidate_bytes: bytes) -> Optional[Image.Image]:
    try:
        candidate = _open_rgb(candidate_bytes)
    except Exception:
        return None
    if min(candidate.size) < MIN_IMAGE_SIDE:  # icons, spacers, tracking pixels
        return None
    return candidate


# ── Image ─────────────────────────────────────────────────────────────────

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
    candidate = _open_candidate(candidate_bytes)
    if candidate is None:
        return None
    outcome = _compare(reference, candidate, _hashes_of(candidate), {"bytes": candidate_bytes})
    if outcome is None:
        return None
    return _to_match(outcome, domain, network, provider_type, page_url, image_url, asset_type)


# ── Video ─────────────────────────────────────────────────────────────────

@dataclass
class KeyframeRef:
    time: float          # seconds into the user's video
    reference: Reference


@dataclass
class VideoReference:
    frames: list         # list[KeyframeRef]
    duration: float = 0.0
    width: int = 0
    height: int = 0


def build_video_reference(
    frames: list[tuple[float, bytes]], duration: float = 0.0, width: int = 0, height: int = 0
) -> VideoReference:
    """frames: [(time_seconds, jpeg_bytes)] -> one prepared Reference per keyframe."""
    return VideoReference(
        frames=[KeyframeRef(time=t, reference=build_reference(data)) for t, data in frames],
        duration=duration, width=width, height=height,
    )


def _rank_keyframes(vref: VideoReference, cand_hashes: dict) -> list[int]:
    return sorted(range(len(vref.frames)), key=lambda i: _best_variant(vref.frames[i].reference, cand_hashes)[1])


def match_image_to_video(
    vref: VideoReference, candidate: Image.Image, top_k: int = VIDEO_TOP_FRAMES
) -> Optional[tuple[int, Outcome, int]]:
    """Best keyframe match for one image. Returns (keyframe index, outcome, keyframes matched)."""
    if not vref.frames:
        return None
    cand_hashes = _hashes_of(candidate)
    cache: dict = {}
    best: Optional[tuple[int, Outcome]] = None
    matched = 0
    for index in _rank_keyframes(vref, cand_hashes)[:top_k]:
        outcome = _compare(vref.frames[index].reference, candidate, cand_hashes, cache)
        if outcome is None:
            continue
        matched += 1
        if best is None or outcome.confidence > best[1].confidence:
            best = (index, outcome)
    return None if best is None else (best[0], best[1], matched)


def match_candidate_video(
    vref: VideoReference,
    candidate_bytes: bytes,
    domain: str,
    network: Optional[str],
    provider_type: Optional[str],
    page_url: str,
    image_url: str,
    asset_type: str,
) -> Optional[DiscoveryMatch]:
    candidate = _open_candidate(candidate_bytes)
    if candidate is None:
        return None
    found = match_image_to_video(vref, candidate)
    if found is None:
        return None
    index, outcome, matched = found
    match = _to_match(outcome, domain, network, provider_type, page_url, image_url, asset_type)
    match.matched_frame_index = index
    match.matched_frame_time = round(vref.frames[index].time, 2)
    match.frames_matched = matched
    return match
