import { Texture } from 'pixi.js';
import type { SpeciesId } from '../game/state';

/**
 * Painted creature body textures (Colin, Nov 23, 2026).
 *
 * Generated `.webp` plates live in `src/art/creatures/<species>.webp` on a clean
 * pure-white background. At startup we decode each plate onto an offscreen canvas,
 * flood-fill from the four outer corners to key out only the exterior white
 * (keeping white eye catchlights untouched), soften the 1-pixel edge fringe, crop
 * tightly to the painted silhouette, and cache a PixiJS Texture.
 *
 * Missing textures or `?art=procedural` fall back cleanly to the code-drawn rigs.
 */
export type CreatureArtKey = SpeciesId | 'linnea' | 'lurker' | 'angler' | 'stalker' | 'spider' | 'silverbar';
export type CreatureArt = Partial<Record<CreatureArtKey, Texture>>;

const webps = import.meta.glob<string>('./creatures/*.webp', { eager: true, import: 'default', query: '?url&no-inline' });
const pngs = import.meta.glob<string>('./creatures/*.png', { eager: true, import: 'default', query: '?url&no-inline' });

const TARGET_MAX_DIM = 320;

let activeArt: CreatureArt = {};

/** Current loaded painted creature textures (empty when `?art=procedural` is active). */
export function getCreatureArt(): CreatureArt {
  return activeArt;
}

/** Decode an image URL into an HTMLImageElement. */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

/**
 * Remove the exterior pure-white background using a 4-corner flood-fill so
 * interior eye catchlights and bright highlights stay 100% intact.
 * Crops tightly to the non-transparent silhouette for predictable rig fitting.
 */
/** removeEnclosedWhite: also key out enclosed white pockets; a number sets the smallest pocket removed (default 12 px). */
export function keyOutWhiteAndCrop(img: HTMLImageElement, mipmaps: boolean, maxDim = TARGET_MAX_DIM, removeEnclosedWhite: boolean | number = false): Texture {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  const ctx = src.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);

  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const total = w * h;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const isBg = (idx: number): boolean => {
    const o = idx * 4;
    if (px[o + 3] < 16) return true;
    const r = px[o];
    const g = px[o + 1];
    const b = px[o + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    return min >= 232 && max - min <= 18;
  };

  const push = (x: number, y: number) => {
    const idx = y * w + x;
    if (visited[idx] || !isBg(idx)) return;
    visited[idx] = 1;
    queue[tail++] = idx;
  };

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  while (head < tail) {
    const idx = queue[head++];
    px[idx * 4 + 3] = 0;
    const x = idx % w;
    const y = (idx - x) / w;
    if (x > 0) push(x - 1, y);
    if (x + 1 < w) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y + 1 < h) push(x, y + 1);
  }

  // Optionally key out enclosed pure-white background pockets (pipe loops, ladder rungs, wheel spokes).
  if (removeEnclosedWhite) {
    const seen = new Uint8Array(total);
    const comp = new Int32Array(total);
    const isPureWhite = (idx: number): boolean => {
      const o = idx * 4;
      if (px[o + 3] < 16) return false;
      const min = Math.min(px[o], px[o + 1], px[o + 2]);
      const max = Math.max(px[o], px[o + 1], px[o + 2]);
      return min >= 247 && max - min <= 8;
    };
    for (let start = 0; start < total; start++) {
      if (visited[start] || seen[start] || !isPureWhite(start)) continue;
      let cHead = 0;
      let cTail = 0;
      seen[start] = 1;
      comp[cTail++] = start;
      while (cHead < cTail) {
        const idx = comp[cHead++];
        const x = idx % w;
        const y = (idx - x) / w;
        const tryAdd = (nx: number, ny: number) => {
          const nIdx = ny * w + nx;
          if (visited[nIdx] || seen[nIdx] || !isBg(nIdx)) return;
          seen[nIdx] = 1;
          comp[cTail++] = nIdx;
        };
        if (x > 0) tryAdd(x - 1, y);
        if (x + 1 < w) tryAdd(x + 1, y);
        if (y > 0) tryAdd(x, y - 1);
        if (y + 1 < h) tryAdd(x, y + 1);
      }
      // Only remove genuine background pockets (>= 12 px) so tiny specular highlights stay intact.
      if (cTail >= (typeof removeEnclosedWhite === 'number' ? removeEnclosedWhite : 12)) {
        for (let k = 0; k < cTail; k++) {
          const idx = comp[k];
          visited[idx] = 1;
          px[idx * 4 + 3] = 0;
        }
      }
    }
  }

  // White-matte decontamination + 2-ring anti-aliased edge feathering so cutout sprites
  // blend seamlessly into dark indoor walls and ocean water with zero pale-grey halo.
  const isEdge1 = new Uint8Array(total);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (visited[idx]) continue;
      if (
        visited[idx - 1] || visited[idx + 1] || visited[idx - w] || visited[idx + w] ||
        visited[idx - w - 1] || visited[idx - w + 1] || visited[idx + w - 1] || visited[idx + w + 1]
      ) {
        isEdge1[idx] = 1;
        const o = idx * 4;
        const r = px[o];
        const g = px[o + 1];
        const b = px[o + 2];
        const lum = (r + g + b) / 3;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        if (sat <= 38 && lum > 115) {
          const keep = Math.max(0, Math.min(1, (236 - lum) / 135));
          px[o + 3] = Math.round(px[o + 3] * keep);
          if (keep > 0.04) {
            const inv = 1 - keep;
            px[o] = Math.max(0, Math.min(255, Math.round((r - 255 * inv) / keep)));
            px[o + 1] = Math.max(0, Math.min(255, Math.round((g - 255 * inv) / keep)));
            px[o + 2] = Math.max(0, Math.min(255, Math.round((b - 255 * inv) / keep)));
          }
        }
      }
    }
  }
  // Second pass: softly de-fringe any pale neutral 2nd-ring pixel touching a feathered edge.
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (visited[idx] || isEdge1[idx]) continue;
      if (isEdge1[idx - 1] || isEdge1[idx + 1] || isEdge1[idx - w] || isEdge1[idx + w]) {
        const o = idx * 4;
        const r = px[o];
        const g = px[o + 1];
        const b = px[o + 2];
        const lum = (r + g + b) / 3;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        if (sat <= 28 && lum > 180) {
          const keep = Math.max(0, Math.min(1, (242 - lum) / 68));
          px[o + 3] = Math.round(px[o + 3] * keep);
          if (keep > 0.08) {
            const inv = 1 - keep;
            px[o] = Math.max(0, Math.min(255, Math.round((r - 255 * inv) / keep)));
            px[o + 1] = Math.max(0, Math.min(255, Math.round((g - 255 * inv) / keep)));
            px[o + 2] = Math.max(0, Math.min(255, Math.round((b - 255 * inv) / keep)));
          }
        }
      }
    }
  }

  ctx.putImageData(data, 0, 0);

  // Tight bounding box crop.
  let x0 = w;
  let y0 = h;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 20) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < x0 || y1 < y0) {
    x0 = 0;
    y0 = 0;
    x1 = w - 1;
    y1 = h - 1;
  }
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d')!.drawImage(src, x0, y0, cw, ch, 0, 0, cw, ch);

  const texture = Texture.from(out);
  if (mipmaps) texture.source.autoGenerateMipmaps = true;
  return texture;
}

const SPECIES_FILES: readonly CreatureArtKey[] = [
  'glowfin', 'puffcap', 'ray', 'crab', 'shrimp', 'snail', 'eel', 'horse',
  'linnea', 'lurker', 'angler', 'stalker', 'spider', 'silverbar',
];

export async function loadCreatureArt(mipmaps = false): Promise<CreatureArt> {
  const entries = await Promise.all(
    SPECIES_FILES.map(async (sp) => {
      const url = webps[`./creatures/${sp}.webp`] ?? pngs[`./creatures/${sp}.png`];
      if (!url) return [sp, undefined] as const;
      try {
        const img = await loadImage(url);
        return [sp, keyOutWhiteAndCrop(img, mipmaps)] as const;
      } catch (err) {
        console.warn(`Creature artwork ${sp} could not be loaded. Using procedural rig.`, err);
        return [sp, undefined] as const;
      }
    }),
  );
  activeArt = Object.fromEntries(entries);
  return activeArt;
}
