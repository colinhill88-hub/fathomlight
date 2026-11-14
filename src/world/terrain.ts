import { mulberry32, WORLD_SEED } from '../rng';

/**
 * The shape of the milestone 1 test scene, in world units (wu).
 * y = 0 is the water surface and y grows downwards. 75 wu is about 1 metre.
 *
 * Layout, left to right: sunny sandy shallows with a rock outcrop, a slope
 * that drops off into deeper water, and a rock ledge whose underside forms a
 * dark grotto. The grotto is where the dynamic lights matter most.
 */

export const WORLD_W = 3600;
export const WORLD_H = 1180;
export const WU_PER_METRE = 75;

const rand = mulberry32(WORLD_SEED ^ 0x1111);
const bumps = Array.from({ length: 6 }, (_, i) => ({
  f: (i + 1) * 0.0021 + rand() * 0.0012,
  a: 14 / (i + 1),
  p: rand() * Math.PI * 2,
}));

function smooth(t: number): number {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}

/** Height of the seabed at x: the first solid y below the water. */
export function groundY(x: number): number {
  // Shallows sand, sloping gently down from the left edge.
  let y = 440 + smooth(x / 900) * 70;
  // Rock outcrop in the shallows.
  y -= Math.exp(-(((x - 1020) / 150) ** 2)) * 120;
  y -= Math.exp(-(((x - 1160) / 70) ** 2)) * 50;
  // The drop-off into deeper water.
  y += smooth((x - 1750) / 750) * 560;
  // Rising wall at the far right end.
  y -= smooth((x - 3300) / 300) * 520;
  for (const b of bumps) y += Math.sin(x * b.f + b.p) * b.a;
  return y;
}

/**
 * The rock ledge above the grotto, as a closed outline. It hangs off the
 * right-hand wall; the diver can swim over it or underneath it.
 */
export const LEDGE: [number, number][] = (() => {
  const pts: [number, number][] = [];
  const r = mulberry32(WORLD_SEED ^ 0x2222);
  // Top surface, left to right.
  for (let x = 2480; x <= 3620; x += 40) {
    const t = (x - 2480) / 1140;
    const top = 600 - smooth(t * 3) * 50 + Math.sin(x * 0.013) * 10 + (r() - 0.5) * 8;
    pts.push([x, top]);
  }
  // Underside (the grotto ceiling), right to left.
  for (let x = 3620; x >= 2480; x -= 40) {
    const t = (x - 2480) / 1140;
    const bottom = 690 + smooth(t * 2.5) * 40 + Math.sin(x * 0.021 + 1) * 12 + (r() - 0.5) * 10;
    pts.push([x, bottom]);
  }
  // Round off the left tip.
  pts.push([2455, 668], [2442, 642], [2452, 616]);
  return pts;
})();

function inPolygon(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Is this point inside rock or sand? Used for the diver's collisions. */
export function isSolid(x: number, y: number): boolean {
  if (x < 0 || x > WORLD_W) return true;
  if (y >= groundY(x)) return true;
  if (y > 540 && y < 780 && x > 2440 && inPolygon(x, y, LEDGE)) return true;
  return false;
}

/**
 * Bake how much daylight reaches each spot ("sky visibility"), into a small
 * greyscale image covering the whole world. 1 = open water under the sun,
 * lower = shaded by rock above. It is blurred so the shadows are soft.
 * The lighting shader reads it every frame, so shadows cost nothing at runtime.
 */
export function bakeSkyVisibility(cell: number, blurPasses: number): HTMLCanvasElement {
  const w = Math.ceil(WORLD_W / cell);
  const h = Math.ceil(WORLD_H / cell);
  const vis = new Float32Array(w * h);
  for (let i = 0; i < w; i++) {
    const x = (i + 0.5) * cell;
    let rock = 0;
    for (let j = 0; j < h; j++) {
      const y = (j + 0.5) * cell;
      const solid = isSolid(x, y);
      // Light enters a surface slightly, so the top of a rock is fully lit.
      vis[j * w + i] = Math.exp(-rock / 70);
      if (solid) rock += cell;
    }
  }
  // Soft shadow edges: repeated small box blurs approximate a smooth blur.
  const tmp = new Float32Array(w * h);
  for (let pass = 0; pass < blurPasses; pass++) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        let s = 0;
        for (let k = -2; k <= 2; k++) s += vis[j * w + Math.min(w - 1, Math.max(0, i + k))];
        tmp[j * w + i] = s / 5;
      }
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        let s = 0;
        for (let k = -2; k <= 2; k++) s += tmp[Math.min(h - 1, Math.max(0, j + k)) * w + i];
        vis[j * w + i] = s / 5;
      }
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  for (let k = 0; k < w * h; k++) {
    const v = Math.round(Math.min(1, Math.max(0, vis[k])) * 255);
    img.data[k * 4] = v;
    img.data[k * 4 + 1] = v;
    img.data[k * 4 + 2] = v;
    img.data[k * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
