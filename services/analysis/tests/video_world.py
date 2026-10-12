"""Synthetic videos and a fake internet for the video tests (no real network, no real media)."""
from __future__ import annotations

import os
import tempfile
from functools import lru_cache

import cv2
import httpx
import numpy as np
import skimage.data as sd
from PIL import Image

from engine.video import extract_keyframes, probe, to_jpeg

USER_SCENES = ["astronaut", "coffee", "chelsea", "rocket", "camera"]
OTHER_SCENES = ["hubble_deep_field", "retina", "immunohistochemistry", "moon", "brick"]
SECONDS_PER_SCENE = 3
FPS = 10


def _photo(name: str) -> np.ndarray:
    arr = getattr(sd, name)()
    return np.array(Image.fromarray(arr).convert("RGB"))


def _frame(photo: np.ndarray, progress: float, size: tuple[int, int]) -> np.ndarray:
    """A moving shot of a photo: slow zoom and pan, so frames of one scene differ like real video."""
    h, w = photo.shape[:2]
    aspect = size[0] / size[1]
    zoom = 1.0 + 0.25 * progress
    win_w = int(min(w, h * aspect) / zoom)
    win_h = int(win_w / aspect)
    x0 = int((w - win_w) * progress)
    y0 = int((h - win_h) * 0.5)
    crop = photo[y0:y0 + win_h, x0:x0 + win_w]
    return cv2.resize(crop, size, interpolation=cv2.INTER_AREA)


def write_video(path: str, scenes: list[str], size=(480, 270), watermark=False, black_intro=0) -> None:
    writer = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*"mp4v"), FPS, size)
    assert writer.isOpened(), "mp4v encoder unavailable"
    for _ in range(black_intro * FPS):
        writer.write(np.zeros((size[1], size[0], 3), np.uint8))
    frames_per_scene = SECONDS_PER_SCENE * FPS
    for name in scenes:
        photo = _photo(name)
        for i in range(frames_per_scene):
            rgb = _frame(photo, i / frames_per_scene, size)
            if watermark:
                cv2.rectangle(rgb, (int(size[0] * .6), int(size[1] * .88)), (size[0] - 4, size[1] - 4), (0, 0, 0), -1)
            writer.write(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
    writer.release()


@lru_cache(maxsize=None)
def video_bytes(kind: str) -> bytes:
    """kind: user | copy (trimmed first scene, smaller, watermarked, re-encoded) |
    shuffled (same scenes, reversed order) | other (unrelated scenes)."""
    spec = {
        "user": (USER_SCENES, (480, 270), False, 0),
        "copy": (USER_SCENES[1:], (320, 180), True, 0),
        "shuffled": (USER_SCENES[::-1], (320, 180), False, 0),
        "other": (OTHER_SCENES, (320, 180), False, 0),
        "black_intro": (USER_SCENES, (480, 270), False, 2),
    }[kind]
    path = tempfile.mktemp(suffix=".mp4")
    try:
        write_video(path, spec[0], spec[1], spec[2], spec[3])
        with open(path, "rb") as handle:
            return handle.read()
    finally:
        os.unlink(path)


def user_video_path(kind: str = "user") -> str:
    path = tempfile.mktemp(suffix=".mp4")
    with open(path, "wb") as handle:
        handle.write(video_bytes(kind))
    return path


@lru_cache(maxsize=None)
def thumbnail(scene_index: int) -> bytes:
    """A site thumbnail: a real decoded frame from the middle of one of the user's scenes."""
    path = user_video_path()
    try:
        cap = cv2.VideoCapture(path)
        cap.set(cv2.CAP_PROP_POS_FRAMES, int((scene_index + 0.5) * SECONDS_PER_SCENE * FPS))
        ok, frame = cap.read()
        cap.release()
        assert ok
        image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        image.thumbnail((320, 320))
        return to_jpeg(image, 80)
    finally:
        os.unlink(path)


@lru_cache(maxsize=None)
def other_thumbnail() -> bytes:
    image = Image.fromarray(_photo("hubble_deep_field"))
    image.thumbnail((320, 320))
    return to_jpeg(image, 80)


def page(body: str) -> httpx.Response:
    return httpx.Response(200, content=body.encode(), headers={"content-type": "text/html"})


def serve_video(request: httpx.Request, data: bytes) -> httpx.Response:
    rng = request.headers.get("range", "")
    if rng.startswith("bytes="):
        start_s, _, end_s = rng[6:].partition("-")
        start = int(start_s)
        end = min(int(end_s) if end_s else len(data) - 1, len(data) - 1)
        chunk = data[start:end + 1]
        return httpx.Response(206, content=chunk, headers={
            "content-type": "video/mp4", "content-range": f"bytes {start}-{start + len(chunk) - 1}/{len(data)}"})
    return httpx.Response(200, content=data, headers={"content-type": "video/mp4"})


VIDEO_FILES = {"/v/copy.mp4": "copy", "/v/shuffled.mp4": "shuffled", "/v/other.mp4": "other"}

# domain -> (page path, thumbnail scene or None for unrelated, <head>/<body> html for the video)
SITES = {
    "copy.example":      ("/watch/1", 2, '<video><source src="/v/copy.mp4" type="video/mp4"></video>'),
    "thumbonly.example": ("/watch/2", 1, '<meta property="og:video" content="https://cdn.thumbonly.example/live/index.m3u8">'),
    "shuffled.example":  ("/watch/3", 2, '<video src="/v/shuffled.mp4"></video>'),
    "lookalike.example": ("/watch/4", 3, '<video src="/v/other.mp4"></video>'),
    "noplayer.example":  ("/watch/5", 0, "<p>player is built by JavaScript</p>"),
    "unrelated.example": ("/watch/6", None, '<video src="/v/other.mp4"></video>'),
}
ROWS = [{"domain": d, "network": "UnknownNetwork", "provider_type": "tube", "video_provider": ""} for d in SITES]


def handler(request: httpx.Request) -> httpx.Response:
    host, path = request.url.host, request.url.path
    if path.startswith("/t/"):
        if path == "/t/other.jpg":
            return httpx.Response(200, content=other_thumbnail(), headers={"content-type": "image/jpeg"})
        return httpx.Response(200, content=thumbnail(int(path[3:-4])), headers={"content-type": "image/jpeg"})
    if path in VIDEO_FILES:
        return serve_video(request, video_bytes(VIDEO_FILES[path]))
    site = SITES.get(host)
    if site is None:
        return httpx.Response(404)
    page_path, scene, player = site
    if path == "/":
        return page(f'<a href="{page_path}">watch</a>')
    if path == page_path:
        thumb = "/t/other.jpg" if scene is None else f"/t/{scene}.jpg"
        return page(f'<html><head><meta property="og:image" content="{thumb}">{player if player.startswith("<meta") else ""}</head>'
                    f'<body>{"" if player.startswith("<meta") else player}</body></html>')
    return httpx.Response(404)


def make_reference(kind: str = "user"):
    from engine.discovery import build_video_reference
    path = user_video_path(kind)
    try:
        info = probe(path)
        frames = extract_keyframes(path, info)
        return build_video_reference([(f.time, to_jpeg(f.image)) for f in frames], info.duration, info.width, info.height)
    finally:
        os.unlink(path)
