"""
Matching calibration harness.

Builds known copies (resize, recompress, crop, mirror, watermark, letterbox,
brightness shift) of bundled sample photographs, plus unrelated images
(other photos and repeated textures), and measures — for the OLD rule
(hash <=4, else ORB keypoint ratio) and the NEW rule (hash variants +
SIFT/RANSAC) — how many copies are found and how many unrelated images are
falsely matched.

Run:  python tests/calibration.py
"""
from __future__ import annotations

import io
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageOps
import skimage.data as sd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine import discovery as d  # noqa: E402
from engine.keypoints import compute_match_rate  # noqa: E402

PHOTOS = ["astronaut", "coffee", "chelsea", "rocket", "hubble_deep_field", "retina",
          "immunohistochemistry", "camera", "moon"]
TEXTURES = ["brick", "grass", "gravel"]


def load(name: str) -> Image.Image:
    arr = getattr(sd, name)()
    img = Image.fromarray(arr).convert("RGB")
    img.thumbnail((640, 640))
    return img


def jpeg(img: Image.Image, q: int = 85) -> bytes:
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=q)
    return buf.getvalue()


def png(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


def thumb(img: Image.Image, w: int) -> Image.Image:
    return img.resize((w, max(1, int(img.height * w / img.width))), Image.LANCZOS)


def crop_frac(img, l, t, r, b):
    w, h = img.size
    return img.crop((int(w * l), int(h * t), int(w * r), int(h * b)))


def watermark(img):
    img = img.copy()
    dr = ImageDraw.Draw(img, "RGBA")
    w, h = img.size
    dr.rectangle((w * 0.55, h * 0.88, w * 0.98, h * 0.98), fill=(0, 0, 0, 170))
    dr.text((w * 0.58, h * 0.9), "example-site.com", fill=(255, 255, 255, 230))
    return img


def letterbox(img):
    w, h = img.size
    pad = int(h * 0.18)
    out = Image.new("RGB", (w, h + 2 * pad), (0, 0, 0))
    out.paste(img, (0, pad))
    return out


TRANSFORMS = {
    "thumbnail_320": lambda i: jpeg(thumb(i, 320)),
    "thumbnail_160": lambda i: jpeg(thumb(i, 160), 70),
    "jpeg_q30": lambda i: jpeg(thumb(i, 480), 30),
    "mirrored": lambda i: jpeg(thumb(ImageOps.mirror(i), 320)),
    "crop_center_75%": lambda i: jpeg(thumb(crop_frac(i, .125, .125, .875, .875), 320)),
    "crop_corner_60%": lambda i: jpeg(thumb(crop_frac(i, .4, .0, 1.0, .6), 320)),
    "watermark": lambda i: jpeg(thumb(watermark(i), 320)),
    "letterbox": lambda i: jpeg(thumb(letterbox(i), 320)),
    "brightness+contrast": lambda i: jpeg(thumb(ImageEnhance.Contrast(ImageEnhance.Brightness(i).enhance(1.25)).enhance(1.2), 320)),
}


def old_rule(ref_bytes: bytes, cand_bytes: bytes):
    """The previous logic: hash avg<=4 -> exact; else ORB ratio >=.35 structural / >=.20 probable."""
    try:
        h1, h2 = d._compute_hashes(ref_bytes), d._compute_hashes(cand_bytes)
    except Exception:
        return None
    avg = sum(int(h1[k] - h2[k]) for k in h1) / 3
    if avg <= 4:
        return "exact"
    _, rate = compute_match_rate(ref_bytes, cand_bytes)
    if rate >= 0.35:
        return "structural"
    if rate >= 0.20:
        return "probable"
    return None


def new_rule(ref: d.Reference, cand_bytes: bytes):
    m = d.match_candidate(ref, cand_bytes, "t.example", None, None, "p", "i", "thumbnail")
    return m.match_type if m else None


def main() -> int:
    photos = {n: load(n) for n in PHOTOS}
    textures = {n: load(n) for n in TEXTURES}
    detected = {"old": defaultdict(int), "new": defaultdict(int)}
    total_pos = len(PHOTOS)
    fp = {"old": [], "new": []}
    neg_total = 0

    refs = {n: (png(img), d.build_reference(png(img))) for n, img in photos.items()}

    for name, img in photos.items():
        ref_bytes, ref = refs[name]
        for tname, fn in TRANSFORMS.items():
            cand = fn(img)
            if old_rule(ref_bytes, cand):
                detected["old"][tname] += 1
            if new_rule(ref, cand):
                detected["new"][tname] += 1

    # negatives: every other photo (at 320 and 160 px) and every texture against every reference
    for rname, (ref_bytes, ref) in refs.items():
        for oname, other in {**photos, **textures}.items():
            if oname == rname:
                continue
            for w in (320, 160):
                cand = jpeg(thumb(other, w))
                neg_total += 1
                if old_rule(ref_bytes, cand):
                    fp["old"].append((rname, oname, w))
                if new_rule(ref, cand):
                    fp["new"].append((rname, oname, w))

    # hard negatives: a DIFFERENT, non-overlapping region of the same photo / texture
    hard_total, hard_fp = 0, {"old": [], "new": []}
    for name, img in {**photos, **textures}.items():
        left, right = crop_frac(img, 0.0, 0.0, 0.42, 1.0), crop_frac(img, 0.58, 0.0, 1.0, 1.0)
        for ref_img, cand_img, tag in ((left, right, "L>R"), (right, left, "R>L")):
            ref_b = png(ref_img)
            ref = d.build_reference(ref_b)
            cand = jpeg(thumb(cand_img, 320))
            hard_total += 1
            if old_rule(ref_b, cand):
                hard_fp["old"].append((name, tag))
            if new_rule(ref, cand):
                hard_fp["new"].append((name, tag))

    print(f"{'transform':<22}{'old rule':>10}{'new rule':>10}   (of {total_pos})")
    tot = {"old": 0, "new": 0}
    for t in TRANSFORMS:
        o, n = detected["old"][t], detected["new"][t]
        tot["old"] += o; tot["new"] += n
        print(f"{t:<22}{o:>10}{n:>10}")
    cells = total_pos * len(TRANSFORMS)
    print(f"\nrecall      old {tot['old']}/{cells} = {tot['old']/cells:.0%}    new {tot['new']}/{cells} = {tot['new']/cells:.0%}")
    print(f"false alarms old {len(fp['old'])}/{neg_total}    new {len(fp['new'])}/{neg_total}")
    print(f"hard negatives (other region of same image) old {len(hard_fp['old'])}/{hard_total}    new {len(hard_fp['new'])}/{hard_total}")
    for label in ("old", "new"):
        if hard_fp[label]:
            print(f"  {label} hard false alarms:", hard_fp[label])
    for label in ("old", "new"):
        if fp[label]:
            print(f"  {label} false alarms:", fp[label][:6])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
