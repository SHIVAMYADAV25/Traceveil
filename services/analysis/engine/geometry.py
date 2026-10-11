"""
Geometric image matching: SIFT features + Lowe ratio test + RANSAC.

Why this replaces "ORB match ratio" as the deciding signal:
  * A ratio of matched keypoints can be high for repeated textures (false
    positive) and low for a genuine crop, because it is divided by the larger
    keypoint count.
  * Here the matches must also agree on ONE geometric transform (scale +
    rotation + translation). Genuine crops / resizes / watermarked copies give
    many consistent inliers; unrelated images with similar texture do not.

Both images are normalised first (max side 512 px, CLAHE contrast) so thumbnails
of very different sizes are comparable.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np

try:
    import cv2
except ImportError:  # pragma: no cover
    cv2 = None  # type: ignore

NORM_MAX_SIDE = 512
SIFT_FEATURES = 700
RATIO = 0.75
MIN_KEYPOINTS = 8
MIN_GOOD = 8
RANSAC_REPROJ = 4.0
SCALE_RANGE = (0.2, 5.0)


@dataclass
class Features:
    points: np.ndarray       # (N, 2) float32 keypoint coordinates
    descriptors: np.ndarray  # (N, 128) float32


@dataclass
class GeoResult:
    inliers: int = 0
    good_matches: int = 0
    inlier_ratio: float = 0.0


def available() -> bool:
    return cv2 is not None and hasattr(cv2, "SIFT_create")


def _normalise(gray: np.ndarray) -> np.ndarray:
    h, w = gray.shape[:2]
    scale = NORM_MAX_SIDE / max(h, w)
    if scale < 1.0:
        gray = cv2.resize(gray, (max(1, int(w * scale)), max(1, int(h * scale))), interpolation=cv2.INTER_AREA)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray)


def extract(gray: np.ndarray) -> Optional[Features]:
    """Extract SIFT features from a uint8 grayscale array."""
    if not available() or gray is None or gray.size == 0:
        return None
    try:
        sift = cv2.SIFT_create(nfeatures=SIFT_FEATURES)
        kps, des = sift.detectAndCompute(_normalise(gray), None)
        if des is None or len(kps) < MIN_KEYPOINTS:
            return None
        pts = np.float32([k.pt for k in kps])
        return Features(points=pts, descriptors=des.astype(np.float32))
    except cv2.error:
        return None


def match(ref: Optional[Features], cand: Optional[Features]) -> GeoResult:
    if ref is None or cand is None:
        return GeoResult()
    try:
        matcher = cv2.BFMatcher(cv2.NORM_L2)
        pairs = matcher.knnMatch(ref.descriptors, cand.descriptors, k=2)
        good = [m for m, n in (p for p in pairs if len(p) == 2) if m.distance < RATIO * n.distance]
        if len(good) < MIN_GOOD:
            return GeoResult(good_matches=len(good))

        src = np.float32([ref.points[m.queryIdx] for m in good]).reshape(-1, 1, 2)
        dst = np.float32([cand.points[m.trainIdx] for m in good]).reshape(-1, 1, 2)
        matrix, mask = cv2.estimateAffinePartial2D(
            src, dst, method=cv2.RANSAC, ransacReprojThreshold=RANSAC_REPROJ
        )
        if matrix is None or mask is None:
            return GeoResult(good_matches=len(good))

        scale = float(np.sqrt(abs(matrix[0, 0] * matrix[1, 1] - matrix[0, 1] * matrix[1, 0])))
        if not (SCALE_RANGE[0] <= scale <= SCALE_RANGE[1]):
            return GeoResult(good_matches=len(good))  # degenerate transform

        inliers = int(mask.sum())
        return GeoResult(
            inliers=inliers,
            good_matches=len(good),
            inlier_ratio=round(inliers / len(good), 4),
        )
    except cv2.error:
        return GeoResult()
