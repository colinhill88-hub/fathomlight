"""
Prepare generated Earth scenery paintings for the game (Earth polish, Nov 28, 2026).

    python3 -I scripts/prep-earth-art.py <folder with src/art/...> [<more folders>]

The paintings arrive as full scenes on white whose edges fade into white mist
(docs/art/prompts/earth-polish.md). Each one is turned into a soft-edged RGBA
image: the white mist becomes transparency, and the colour under the mist is
recovered (un-mixed from the white) so the faded edges don't go grey or pale.

  painterly-world/*    far scenery plates, sized to 1536 x 768 (the size
                       src/art/worldArt.ts expects).
  sunlit-shallows/kelp-front
                       the near-camera kelp, sized to 1024 x 512.

The originals are untouched; the repo gets the prepared copies. Pillow is the only
dependency.
"""
import os
import sys
from collections import deque

from PIL import Image, ImageFilter

REPO_ART = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'art')
SIZES = {'painterly-world': (1536, 768), 'sunlit-shallows': (1024, 512)}
# How far from white a pixel must be to count as fully painted (lower = more of the
# mist stays opaque). Paintings fill their middle, so a fairly low value keeps them solid.
SOLID = 70
# Only near-pure white joined to the border is mist; sun rays and sparkles that reach the
# edge are paler than the painting but not this white.
MIST = 14


def border_mist(src, w: int, h: int) -> bytearray:
    """The mist is the pale region connected to the picture's border; pale spots inside
    the painting (sun rays, sparkles on the surface) are not mist and stay solid."""
    mist = bytearray(w * h)
    q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while q:
        x, y = q.popleft()
        i = y * w + x
        if mist[i]:
            continue
        r, g, b = src[x, y]
        if max(255 - r, 255 - g, 255 - b) >= MIST:
            continue
        mist[i] = 1
        if x > 0: q.append((x - 1, y))
        if x < w - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < h - 1: q.append((x, y + 1))
    return mist


def white_to_alpha(im: Image.Image, plate: bool) -> Image.Image:
    """plate: a painted scene; it stays solid inside, and only its misty rim fades out.
    Otherwise (the kelp): every pale pixel fades by how pale it is."""
    im = im.convert('RGB')
    w, h = im.size
    src = im.load()
    inside = None
    if plate:
        mist = border_mist(src, w, h)
        # A feathered "inside" mask: 1 deep in the painting, falling to 0 out in the mist.
        inside = Image.frombytes('L', (w, h), bytes(0 if v else 255 for v in mist)).filter(ImageFilter.GaussianBlur(18)).load()
    out = Image.new('RGBA', (w, h))
    dst = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            d = max(255 - r, 255 - g, 255 - b)
            a = min(1.0, d / SOLID)
            if inside is not None:
                a = max(a, (inside[x, y] / 255) ** 2)
            if a >= 0.999:
                dst[x, y] = (r, g, b, 255)
                continue
            if a <= 0.004:
                dst[x, y] = (0, 0, 0, 0)
                continue
            # pixel = a * colour + (1 - a) * white, so colour = (pixel - (1 - a) * 255) / a
            un = tuple(max(0, min(255, round((c - (1 - a) * 255) / a))) for c in (r, g, b))
            dst[x, y] = (*un, round(a * 255))
    return out


def main(folders: list) -> None:
    for top in folders:
        for root, _, files in os.walk(top):
            for f in sorted(files):
                if not f.endswith(('.webp', '.png', '.jpg')):
                    continue
                src = os.path.join(root, f)
                parts = os.path.relpath(src, top).split(os.sep)
                if 'art' not in parts:
                    continue
                sub = parts[parts.index('art') + 1]
                if sub not in SIZES:
                    continue
                im = Image.open(src)
                out = white_to_alpha(im.resize(SIZES[sub], Image.LANCZOS), plate=sub == 'painterly-world')
                dst = os.path.join(REPO_ART, sub, os.path.splitext(f)[0] + '.webp')
                out.save(dst, 'WEBP', quality=84, method=6)
                print(f'{sub}/{f}: {os.path.getsize(src) // 1024} KB -> {os.path.getsize(dst) // 1024} KB, {out.size}')


if __name__ == '__main__':
    main(sys.argv[1:])
