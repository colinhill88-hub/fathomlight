"""
Prepare a batch of generated Europa art for the game (Beyond Earth, Nov 28, 2026).

    python3 -I scripts/prep-europa-art.py <folder with src/art/...> [<more folders>]

Each image is keyed, sized and re-encoded as WebP into the repo's src/art/ tree,
by its role (from its file name):

  layer    zone midgrounds and foregrounds (*_mid, *_fg) on white: soft white key,
           full frame kept (so the layers line up), RGBA.
  object   props on white (hab, still, bell, glyphs, floes, pools, vents, pickups,
           the works room props): the white background is flooded away from the
           border (white *inside* the object, like snow, is kept), then cropped.
  creature creatures on white (moth, glasshorn, krill, floe_ray): keyed like an
           object but NOT cropped, so they stay aligned with their glow sheets and
           the floe ray's gear overlays.
  black    Jupiter on black: black keyed to alpha.
  keep     glow sheets, the kin and the kin's gate (drawn as added light, so black
           is already "nothing"), the ray's gear overlays (already transparent).
  specks   the black water (drawn as added light): its dark base is pulled down to pure
           black and its top and bottom fade out, so only the drifting motes add light.
  photo    full-frame paintings (backgrounds, the sky, black water, the voyages):
           only re-encoded.

The originals are untouched; the repo gets the prepared copies. Pillow is the only
dependency.
"""
import os
import sys
from collections import deque

from PIL import Image, ImageFilter

REPO_ART = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'art')


def role(name: str, folder: str) -> str:
    base = os.path.splitext(name)[0]
    if base == 'blackwater':
        return 'specks'
    if folder == 'voyage' or base.endswith('_bg') or base == 'floes_sky':
        return 'photo'
    if base.endswith('_mid') or base.endswith('_fg'):
        return 'layer'
    if base == 'jupiter':
        return 'black'
    if base.endswith('_glow') or base in ('kin', 'kin_gate') or base.startswith('ray_'):
        return 'keep'
    if base in ('moth', 'glasshorn', 'krill', 'floe_ray'):
        return 'creature'
    return 'object'


def soft_white_key(im: Image.Image) -> Image.Image:
    """Near-white goes transparent, with a soft ramp so painted edges stay smooth."""
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            lo = min(r, g, b)
            a = max(0, min(255, int((252 - lo) * 255 / 34)))
            px[x, y] = (r, g, b, a)
    return im


def flood_white_key(im: Image.Image, tol: int = 236, holes: int = 0) -> Image.Image:
    """Flood the white background in from the border; white inside the object stays.

    With holes > 0, enclosed near-pure-white pockets of at least that many pixels (the
    gaps between the hab's struts) are keyed out too."""
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    bg = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or bg[y * w + x]:
            continue
        r, g, b, _ = px[x, y]
        if min(r, g, b) < tol:
            continue
        bg[y * w + x] = 1
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    if holes:
        seen = bytearray(w * h)
        for sy in range(h):
            for sx in range(w):
                i0 = sy * w + sx
                if bg[i0] or seen[i0] or min(px[sx, sy][:3]) < 250:
                    continue
                comp, q2 = [], deque([(sx, sy)])
                seen[i0] = 1
                while q2:
                    x, y = q2.popleft()
                    comp.append(y * w + x)
                    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and not bg[ny * w + nx] and min(px[nx, ny][:3]) >= 244:
                            seen[ny * w + nx] = 1
                            q2.append((nx, ny))
                if len(comp) >= holes:
                    for i in comp:
                        bg[i] = 1
    mask = Image.frombytes('L', (w, h), bytes(0 if v else 255 for v in bg)).filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(mask)
    return im


def black_key(im: Image.Image) -> Image.Image:
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            m = max(r, g, b)
            a = max(0, min(255, int((m - 6) * 255 / 40)))
            if a > 0 and a < 255:
                k = 255 / a
                r, g, b = min(255, int(r * k)), min(255, int(g * k)), min(255, int(b * k))
            px[x, y] = (r, g, b, a)
    return im


def specks(im: Image.Image) -> Image.Image:
    """The painting is nearly black already: stretch its faint motes so they show as added
    light, and fade the top and bottom quarter to black so the band has no hard edge."""
    im = im.convert('RGB')
    w, h = im.size
    hi = max(1, im.convert('L').getextrema()[1])
    px = im.load()
    for y in range(h):
        u = y / max(1, h - 1)
        fade = max(0.0, min(1.0, u / 0.25, (1 - u) / 0.25))
        k = fade * 150 / hi
        for x in range(w):
            px[x, y] = tuple(min(255, int(max(0, c - 2) * k)) for c in px[x, y])
    return im


def crop(im: Image.Image, pad: int = 3) -> Image.Image:
    box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if not box:
        return im
    x0, y0, x1, y1 = box
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


def prep(src: str, dst: str, kind: str) -> None:
    im = Image.open(src)
    if kind == 'photo':
        im.convert('RGB').save(dst, 'WEBP', quality=76, method=6)
        return
    if kind == 'layer':
        out = soft_white_key(im)
    elif kind == 'object':
        # Snowy floes need a stricter "white" so their snow tops aren't flooded away.
        name = os.path.splitext(os.path.basename(src))[0]
        tol = 250 if name.startswith('floe') or name in ('brine_pool', 'rime') else 236
        out = crop(flood_white_key(im, tol, 400 if name == 'hab' else 0))
    elif kind == 'creature':
        out = flood_white_key(im)
    elif kind == 'specks':
        out = specks(im)
    elif kind == 'black':
        out = black_key(im)
    else:
        out = im.convert('RGBA') if im.mode == 'RGBA' else im.convert('RGB')
    out.save(dst, 'WEBP', quality=82, method=6)


def main(folders: list) -> None:
    total_in = total_out = 0
    for top in folders:
        for root, _, files in os.walk(top):
            for f in sorted(files):
                if not f.endswith('.webp'):
                    continue
                src = os.path.join(root, f)
                rel = os.path.relpath(src, top)
                parts = rel.split(os.sep)
                if 'art' not in parts:
                    continue
                sub = parts[parts.index('art') + 1]
                dst_dir = os.path.join(REPO_ART, sub)
                os.makedirs(dst_dir, exist_ok=True)
                dst = os.path.join(dst_dir, f)
                kind = role(f, sub)
                prep(src, dst, kind)
                a, b = os.path.getsize(src), os.path.getsize(dst)
                total_in += a
                total_out += b
                print(f'{kind:8} {sub}/{f}: {a // 1024} KB -> {b // 1024} KB')
    print(f'total {total_in // 1024} KB -> {total_out // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1:])
