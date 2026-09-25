"""Build the first-note photo from a genuinely high-resolution licensed source.

Photo by Kaboompics / Pexels:
https://www.pexels.com/photo/wooden-table-with-coffee-and-notebook-with-pen-4195334/
Pexels license: https://www.pexels.com/license/
"""
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/"assets"/"notebook-photo.webp"
URL="https://images.pexels.com/photos/4195334/pexels-photo-4195334.jpeg?auto=compress&cs=tinysrgb&w=1920"
with urlopen(Request(URL,headers={"User-Agent":"Mozilla/5.0"}),timeout=35) as response:
    blob=response.read()
if len(blob)<20000:
    raise RuntimeError("Downloaded image unusually small")
with Image.open(BytesIO(blob)) as original:
    image=ImageOps.exif_transpose(original).convert("RGB")
if image.width<1600 or image.height<1050:
    raise RuntimeError(f"Photo lacks native resolution: {image.size}")
source_size=image.size
image=ImageOps.fit(image,(1680,1120),method=Image.Resampling.LANCZOS,centering=(0.5,0.5))
image.save(OUT,"WEBP",quality=90,method=6)
with Image.open(OUT) as check:
    assert check.size==(1680,1120)
print(f"PASS notebook photo {source_size} -> {image.size}, {OUT.stat().st_size} bytes")
