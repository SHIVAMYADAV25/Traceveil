"""
ORB (Oriented FAST and Rotated BRIEF) keypoint matching.
Structural regions that were manipulated no longer match the reference —
a low match rate (< 30 %) flags significant structural alteration.
Requires opencv-python-headless.
"""
import io

import numpy as np
from PIL import Image

from .models import KeypointResult

_GOOD_MATCH_DISTANCE = 50
_MATCH_RATE_THRESHOLD = 0.30
_ORB_FEATURES = 500
_MIN_KEYPOINTS = 30


def compute_match_rate(target_bytes: bytes, candidate_bytes: bytes) -> tuple[int, float]:
    """
    One-way ORB matching at native sizes (no resizing).
    Returns (good_matches, match_rate) where match_rate is the fraction
    of target keypoints successfully matched in the candidate.
    This naturally handles crops, watermarks, and size differences.
    """
    try:
        import cv2
        import numpy as np

        target_img = Image.open(io.BytesIO(target_bytes)).convert("L")
        candidate_img = Image.open(io.BytesIO(candidate_bytes)).convert("L")

        target_arr = np.array(target_img, dtype=np.uint8)
        candidate_arr = np.array(candidate_img, dtype=np.uint8)

        orb = cv2.ORB_create(nfeatures=_ORB_FEATURES)
        kp1, des1 = orb.detectAndCompute(target_arr, None)
        kp2, des2 = orb.detectAndCompute(candidate_arr, None)

        k1 = len(kp1) if kp1 is not None else 0
        k2 = len(kp2) if kp2 is not None else 0
        if des1 is None or des2 is None or k1 < _MIN_KEYPOINTS or k2 < _MIN_KEYPOINTS:
            return (0, 0.0)

        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = sorted(bf.match(des1, des2), key=lambda m: m.distance)
        good = [m for m in matches if m.distance < _GOOD_MATCH_DISTANCE]

        total = max(k1, k2)
        match_rate = len(good) / total if total > 0 else 0.0

        return (len(good), round(match_rate, 4))

    except ImportError:
        return (0, 0.0)
    except Exception:
        return (0, 0.0)


def run_keypoint_matching(suspicious_bytes: bytes, reference_bytes: bytes) -> KeypointResult:
    try:
        import cv2

        susp_img = Image.open(io.BytesIO(suspicious_bytes)).convert("L")
        ref_img = Image.open(io.BytesIO(reference_bytes)).convert("L").resize(
            susp_img.size, Image.LANCZOS
        )

        susp_arr = np.array(susp_img, dtype=np.uint8)
        ref_arr = np.array(ref_img, dtype=np.uint8)

        orb = cv2.ORB_create(nfeatures=_ORB_FEATURES)
        kp1, des1 = orb.detectAndCompute(susp_arr, None)
        kp2, des2 = orb.detectAndCompute(ref_arr, None)

        k1 = len(kp1) if kp1 is not None else 0
        k2 = len(kp2) if kp2 is not None else 0
        if des1 is None or des2 is None or k1 < _MIN_KEYPOINTS or k2 < _MIN_KEYPOINTS:
            return KeypointResult(
                keypoints_suspicious=k1,
                keypoints_reference=k2,
                good_matches=0,
                match_rate=0.0,
                flagged=True,
            )

        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = sorted(bf.match(des1, des2), key=lambda m: m.distance)
        good = [m for m in matches if m.distance < _GOOD_MATCH_DISTANCE]

        total = max(k1, k2)
        match_rate = len(good) / total if total > 0 else 0.0

        return KeypointResult(
            keypoints_suspicious=len(kp1),
            keypoints_reference=len(kp2),
            good_matches=len(good),
            match_rate=round(match_rate, 4),
            flagged=match_rate < _MATCH_RATE_THRESHOLD,
        )

    except ImportError:
        # opencv not installed — return neutral result
        return KeypointResult(
            keypoints_suspicious=0, keypoints_reference=0,
            good_matches=0, match_rate=1.0, flagged=False,
        )
    except Exception:
        return KeypointResult(
            keypoints_suspicious=0, keypoints_reference=0,
            good_matches=0, match_rate=0.0, flagged=False,
        )
