"""
Video intake: spooling an upload to disk, validating it by decoding, and choosing
keyframes. Pure computation + file I/O: no FastAPI, no network. (That is the seam
along which this could later move into its own worker process.)

Safety:
  * the upload is streamed to a private temp file with a hard byte cap
  * the file type is never trusted; the file must actually decode
  * duration, dimensions and extraction time are all capped
  * callers delete the temp file as soon as keyframes exist
"""
from __future__ import annotations

import io
import math
import os
import tempfile
import time
from dataclasses import dataclass
from typing import Awaitable, Callable, Optional

import cv2
import imagehash
import numpy as np
from PIL import Image


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


MAX_VIDEO_BYTES = _env_int("TRACEVEIL_MAX_VIDEO_MB", 100) * 1024 * 1024
MAX_DURATION_SECONDS = _env_int("TRACEVEIL_MAX_VIDEO_SECONDS", 600)
MAX_KEYFRAMES = 16
CANDIDATE_SAMPLES = 40          # frames sampled before diversity selection
MIN_FRAME_DIVERSITY = 5         # min pHash distance between two kept keyframes
FRAME_MAX_SIDE = 640
MAX_DIMENSION = 7680
BLACK_MEAN = 14                 # near-black frames hash alike and cause false matches
FLAT_STD = 8                    # flat / blank frames carry no features
EXTRACT_TIMEOUT_SECONDS = 30


class VideoError(ValueError):
    """The upload is not usable as a video. The message is safe to show to the user."""


class VideoTooLarge(VideoError):
    pass


@dataclass
class VideoInfo:
    duration: float
    fps: float
    width: int
    height: int
    frame_count: int


@dataclass
class KeyFrame:
    time: float           # seconds
    image: Image.Image    # RGB, longest side <= FRAME_MAX_SIDE


# ── Upload spooling ───────────────────────────────────────────────────────

async def spool_upload(
    read: Callable[[int], Awaitable[bytes]], limit: int, suffix: str = ".bin", chunk: int = 1 << 20
) -> str:
    """Stream an upload to a private temp file, never holding it in memory.
    Raises VideoTooLarge as soon as `limit` bytes are exceeded. Returns the path."""
    fd, path = tempfile.mkstemp(prefix="traceveil-video-", suffix=suffix)  # mode 0600
    total = 0
    try:
        with os.fdopen(fd, "wb") as out:
            while True:
                data = await read(chunk)
                if not data:
                    break
                total += len(data)
                if total > limit:
                    raise VideoTooLarge(f"The video is larger than {limit // (1024 * 1024)} MB.")
                out.write(data)
        if total == 0:
            raise VideoError("The uploaded file is empty.")
        return path
    except BaseException:
        remove(path)
        raise


def remove(path: Optional[str]) -> None:
    if path:
        try:
            os.unlink(path)
        except OSError:
            pass


# ── Probing ───────────────────────────────────────────────────────────────

def _count_frames_by_decoding(path: str, limit: int) -> int:
    cap = cv2.VideoCapture(path)
    count = 0
    try:
        while count <= limit and cap.grab():
            count += 1
    finally:
        cap.release()
    return count


def probe(path: str) -> VideoInfo:
    cap = cv2.VideoCapture(path)
    try:
        if not cap.isOpened():
            raise VideoError("The file could not be opened as a video.")
        frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    finally:
        cap.release()

    if not (fps > 0 and math.isfinite(fps)):
        raise VideoError("The video has no readable frame rate.")
    if width <= 0 or height <= 0 or max(width, height) > MAX_DIMENSION:
        raise VideoError("The video dimensions are not supported.")
    if frames <= 0:  # some containers (e.g. webm) do not declare a length: count by decoding
        frames = _count_frames_by_decoding(path, int(MAX_DURATION_SECONDS * fps) + 1)
    if frames <= 0:
        raise VideoError("No frames could be read from the file.")
    duration = frames / fps
    if duration > MAX_DURATION_SECONDS:
        raise VideoError(f"The video is longer than {MAX_DURATION_SECONDS // 60} minutes.")
    return VideoInfo(duration=round(duration, 2), fps=fps, width=width, height=height, frame_count=frames)


# ── Frames ────────────────────────────────────────────────────────────────

def _to_image(frame: np.ndarray) -> Optional[Image.Image]:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    if gray.mean() < BLACK_MEAN or gray.std() < FLAT_STD:
        return None
    image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    image.thumbnail((FRAME_MAX_SIDE, FRAME_MAX_SIDE))
    return image


def _select_diverse(frames: list[KeyFrame], max_frames: int) -> list[KeyFrame]:
    """Greedy farthest-point selection on pHash: keep the frames that look most
    different from each other, so scene changes are covered and near-duplicates dropped."""
    if len(frames) <= 1:
        return frames
    hashes = [imagehash.phash(f.image) for f in frames]
    chosen = [0]
    while len(chosen) < max_frames:
        best, best_distance = None, -1
        for i in range(len(frames)):
            if i in chosen:
                continue
            distance = min(int(hashes[i] - hashes[j]) for j in chosen)
            if distance > best_distance:
                best, best_distance = i, distance
        if best is None or best_distance < MIN_FRAME_DIVERSITY:
            break
        chosen.append(best)
    return [frames[i] for i in sorted(chosen)]


def extract_keyframes(
    path: str, info: Optional[VideoInfo] = None, max_frames: int = MAX_KEYFRAMES,
    timeout: float = EXTRACT_TIMEOUT_SECONDS,
) -> list[KeyFrame]:
    """Sample frames evenly across the video, drop black/flat ones, then keep the
    most visually distinct. Raises VideoError if nothing usable can be read."""
    info = info or probe(path)
    deadline = time.monotonic() + timeout
    samples = min(CANDIDATE_SAMPLES, info.frame_count)
    indices = sorted({
        int(round(i * (info.frame_count - 1) / max(1, samples - 1))) for i in range(samples)
    })

    candidates: list[KeyFrame] = []
    cap = cv2.VideoCapture(path)
    try:
        for index in indices:
            if time.monotonic() > deadline:
                raise VideoError("Reading the video took too long.")
            cap.set(cv2.CAP_PROP_POS_FRAMES, index)
            ok, frame = cap.read()
            if not ok:
                continue
            image = _to_image(frame)
            if image is not None:
                candidates.append(KeyFrame(time=round(index / info.fps, 2), image=image))
    finally:
        cap.release()

    if not candidates:  # some codecs refuse to seek: fall back to one sequential pass
        candidates = sample_frames(path, count=samples, step_seconds=max(0.5, info.duration / samples), timeout=timeout)
    if not candidates:
        raise VideoError("The video has no usable frames (it may be blank or unreadable).")
    return _select_diverse(candidates, max_frames)


def sample_frames(
    path: str, count: int = 12, step_seconds: float = 2.0, timeout: float = 20.0, max_frames_read: int = 4000
) -> list[KeyFrame]:
    """Decode sequentially and keep one frame every `step_seconds`. Works on truncated
    files (no seeking, no index needed). Used to read a partial download."""
    cap = cv2.VideoCapture(path)
    frames: list[KeyFrame] = []
    try:
        if not cap.isOpened():
            return []
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
        if not (fps > 0 and math.isfinite(fps)):
            fps = 25.0
        stride = max(1, int(round(fps * step_seconds)))
        deadline = time.monotonic() + timeout
        index = 0
        while len(frames) < count and index < max_frames_read and time.monotonic() < deadline:
            if index % stride == 0:
                ok, frame = cap.read()
                if not ok:
                    break
                image = _to_image(frame)
                if image is not None:
                    frames.append(KeyFrame(time=round(index / fps, 2), image=image))
            elif not cap.grab():
                break
            index += 1
    except cv2.error:
        return frames
    finally:
        cap.release()
    return frames


def to_jpeg(image: Image.Image, quality: int = 90) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=quality)
    return buffer.getvalue()
