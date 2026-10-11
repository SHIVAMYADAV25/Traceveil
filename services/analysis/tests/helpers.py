import io

import skimage.data as sd
from PIL import Image


def photo(name: str, max_side: int = 640) -> Image.Image:
    img = Image.fromarray(getattr(sd, name)()).convert("RGB")
    img.thumbnail((max_side, max_side))
    return img


def to_bytes(img: Image.Image, fmt: str = "JPEG", quality: int = 85) -> bytes:
    buf = io.BytesIO()
    if fmt == "JPEG":
        img.save(buf, "JPEG", quality=quality)
    else:
        img.save(buf, fmt)
    return buf.getvalue()


def thumb(img: Image.Image, width: int) -> Image.Image:
    return img.resize((width, max(1, int(img.height * width / img.width))), Image.LANCZOS)
