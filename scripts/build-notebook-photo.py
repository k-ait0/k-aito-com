"""Build a sharp local WebP asset for the first DIGITAL STORAGE article.

The old notebook-hq.jpg is 420x280 and is too small for retina cards and an
article-width figure. Replace it with a genuinely high-resolution licensed
photo (not an interpolation that merely enlarges existing pixels).

Photo: Tuğçe Aslan / Pexels, https://www.pexels.com/photo/cozy-workspace-with-coffee-and-open-notebook-9420702/
Pexels free license: https://www.pexels.com/license/
"""
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "notebook-photo.webp"
URL = ("https://images.pexels.com/photos/9420702/pexels-photo-9420702.jpeg"
       "?auto=compress&cs=tinysrgb&w=1920")
request = Request(URL, headers={"User-Agent": "Mozilla/5.0 (K. Aito photo asset build)"})
with urlopen(request, timeout=35) as response:
    blob = response.read()
if len(blob) < 20000:
    raise RuntimeError("Downloaded photo is unexpectedly small")
with Image.open(BytesIO(blob)) as original:
    image = ImageOps.exif_transpose(original).convert("RGB")
if image.width < 1600 or image.height < 1050:
    raise RuntimeError(f"Source lacks native high resolution: {image.size}")
image = ImageOps.fit(
    image, (1680, 1120), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5)
)
image.save(OUT, "WEBP", quality=88, method=6)
with Image.open(OUT) as check:
    assert check.size == (1680, 1120)
print(f"PASS high-resolution photo: source {original.size}, output {image.size}, {OUT.stat().st_size} bytes")
