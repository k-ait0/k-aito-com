"""Build the first-note cover image from a licensed high-resolution source.

Photo: Clay Banks / Unsplash
https://unsplash.com/photos/open-notebook-with-pen-and-pencils-on-desk-n9AaeihA9HI
Unsplash license: https://unsplash.com/license
"""
import json
from io import BytesIO
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen
from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/"assets"/"notebook-photo.webp"
HEADERS={"User-Agent":"Mozilla/5.0","Accept":"application/json"}
with urlopen(Request("https://unsplash.com/napi/photos/n9AaeihA9HI",headers=HEADERS),timeout=35) as response:
    data=json.load(response)
photo_url=data["urls"]["raw"]
parts=urlsplit(photo_url)
params=dict(parse_qsl(parts.query))
params.update({"w":"1920","q":"90","fit":"max"})
photo_url=urlunsplit((parts.scheme,parts.netloc,parts.path,urlencode(params),""))
with urlopen(Request(photo_url,headers={"User-Agent":"Mozilla/5.0"}),timeout=35) as response:
    blob=response.read()
if len(blob)<20000:
    raise RuntimeError("Downloaded photo is unexpectedly small")
with Image.open(BytesIO(blob)) as original:
    image=ImageOps.exif_transpose(original).convert("RGB")
if image.width<1600 or image.height<1050:
    raise RuntimeError(f"Source lacks native high resolution: {image.size}")
source_size=image.size
image=ImageOps.fit(image,(1680,1120),method=Image.Resampling.LANCZOS,centering=(0.5,0.5))
image.save(OUT,"WEBP",quality=88,method=6)
with Image.open(OUT) as check:
    assert check.size==(1680,1120)
print(f"PASS high-resolution notebook: source {source_size}, output {image.size}, {OUT.stat().st_size} bytes")
