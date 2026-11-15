import { mulberry32, WORLD_SEED } from '../rng';

/**
 * The shape of the Sunlit Shallows (milestone 2), in world units (wu).
 * y = 0 is the water surface and y grows downwards. 75 wu is about 1 metre.
 *
 * Layout, left to right (x):
 * -5600 - -5000  the basin's west wall, rising to just under the surface (milestone 5)
 * -5000 -   300  the Kestrel basin: a wide, flat-floored hollow about 22 m deep,
 *                the big build site for the factory base (milestone 5)
 *   300 -  380  a cliff up to the shelf
 *   300 - 1700  Kestrel shelf: flat sand under a marker buoy, where the first
 *               base went (milestone 3); it is the top east corner of the site
 *  1700 - 3600  coral garden with two rock outcrops
 *  3600 - 4700  a sand channel with the wreck of an old survey sled
 *  4700 - 5000  a rocky knoll with the survey beacon on its edge
 *  5000 - 6850  the drop-off, the rock ledge and the dark grotto under it (from milestone 1)
 *  6850 - 8400  a seagrass meadow on a plateau, with a narrow crevice
 *  8400 - 9000  the east cliff, with a cave mouth that leads into darkness (the
 *               gear gate to the kelp forest and caves zone: it needs a real dive light)
 */

/** West edge of the world (milestone 5 added the basin west of the old wall). */
export const WORLD_X0 = -5600;
export const WORLD_W = 9000;
/** Width of the whole world, from WORLD_X0 to WORLD_W. */
export const WORLD_SPAN = WORLD_W - WORLD_X0;
export const WORLD_H = 1980;
export const WU_PER_METRE = 75;

/** Where the diver starts, and comes back to after blacking out: the Kestrel buoy at the surface. */
export const SPAWN = { x: 900, y: 40 };
export const BUOY_X = 900;
export const BEACON_X = 4990;
export const SLED_X = 4120;
export const ANCHOR_X = 2860;
export const CREVICE_X = 7700;
export const GROTTO = { x0: 5810, x1: 6500, y0: 760, y1: 1000 };
/** The diver cannot go past this point inside the cave: it is too dark. */
export const CAVE_GATE_X = 8790;

const rand = mulberry32(WORLD_SEED ^ 0x1111);
const bumps = Array.from({ length: 6 }, (_, i) => ({
  f: (i + 1) * 0.0021 + rand() * 0.0012,
  a: 14 / (i + 1),
  p: rand() * Math.PI * 2,
}));

export function smooth(t: number): number {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}

const bump = (x: number, cx: number, w: number, h: number) => Math.exp(-(((x - cx) / w) ** 2)) * h;

/**
 * The Kestrel basin (milestone 5). Its floor sits a little below the bottom
 * row of the build grid (see GRID_BASE in src/game/base.ts), so every
 * bottom-row cell is open water. BASIN_EAST is where the cliff up to the
 * old shelf starts; BASIN_WEST where the far wall starts to rise.
 */
export const BASIN_FLOOR = 1700;
export const BASIN_EAST = 300;
export const BASIN_WEST = -4990;
/** A nook in the west wall (an Echo whorl hides there). */
export const WALL_NOOK = { x: -5225, y: 770 };

function basinGround(x: number): number {
  // Gentle ripples on the floor, and a few low sand mounds.
  let y = BASIN_FLOOR + 6 + Math.sin(x * 0.004) * 6 + Math.sin(x * 0.0113 + 2) * 4;
  y -= bump(x, -3300, 260, 10) + bump(x, -1450, 320, 12);
  // The cliff up to the shelf: steep, with a shoulder part-way up.
  const up = smooth((x - (BASIN_EAST - 10)) / 85);
  y += (430 - y) * up;
  y += bump(x, BASIN_EAST + 10, 22, 90) * (1 - up);
  // The west wall: a steep rise with a ledge (the nook) part-way up.
  const w = smooth((BASIN_WEST - x) / 170);
  y += (WALL_NOOK.y + 26 - y) * w;
  y -= bump(x, WALL_NOOK.x + 35, 30, 14) * w; // a lip at the front of the nook
  const w2 = smooth((BASIN_WEST - 290 - x) / 170);
  y += (110 - y) * w2;
  return y;
}

/** Height of the seabed at x: the first solid y below the water (ignoring the ledge and the cave). */
export function groundY(x: number): number {
  if (x < 380) {
    // The basin (milestone 5). East of 380 the shallows are unchanged.
    let y = basinGround(x);
    const k = 0.35 + 0.65 * smooth((x - 290) / 85);
    for (const b of bumps) y += Math.sin(x * b.f + b.p) * b.a * k;
    return y;
  }
  let y = 430;
  // Coral garden: a gentle slope down, with two outcrops.
  y += smooth((x - 1700) / 1200) * 50;
  y -= bump(x, 2270, 150, 120) + bump(x, 2410, 70, 50);
  y -= bump(x, 3150, 110, 80);
  // The sand channel.
  y += smooth((x - 3550) / 350) * 130 - smooth((x - 4350) / 350) * 130;
  // The knoll that the beacon stands on.
  y -= bump(x, 4780, 160, 70);
  // The drop-off into deeper water, then the rising wall at the end of the grotto.
  y += smooth((x - 5000) / 750) * 560;
  y -= smooth((x - 6550) / 300) * 520;
  // Seagrass meadow: a few soft hollows, and a narrow crevice.
  y += bump(x, 7250, 180, 25) + bump(x, 8050, 140, 20);
  y += bump(x, CREVICE_X, 38, 130);
  // The east cliff.
  y -= smooth((x - 8380) / 260) * 420;
  for (const b of bumps) y += Math.sin(x * b.f + b.p) * b.a;
  return y;
}

/**
 * The rock ledge above the grotto, as a closed outline. It hangs off the
 * wall at the end of the drop-off; the diver can swim over it or underneath it.
 */
export const LEDGE: [number, number][] = (() => {
  const pts: [number, number][] = [];
  const r = mulberry32(WORLD_SEED ^ 0x2222);
  const X0 = 5730;
  const X1 = 6870;
  for (let x = X0; x <= X1; x += 40) {
    const t = (x - X0) / (X1 - X0);
    const top = 600 - smooth(t * 3) * 50 + Math.sin(x * 0.013) * 10 + (r() - 0.5) * 8;
    pts.push([x, top]);
  }
  for (let x = X1; x >= X0; x -= 40) {
    const t = (x - X0) / (X1 - X0);
    const bottom = 690 + smooth(t * 2.5) * 40 + Math.sin(x * 0.021 + 1) * 12 + (r() - 0.5) * 10;
    pts.push([x, bottom]);
  }
  pts.push([X0 - 25, 668], [X0 - 38, 642], [X0 - 28, 616]);
  return pts;
})();

/** The cave in the east cliff: a tunnel sloping gently down into the rock. */
export const CAVE = { x0: 8470, x1: 8960 };
export function caveTop(x: number): number {
  return 420 + (x - CAVE.x0) * 0.2 + Math.sin(x * 0.03) * 8;
}
export function caveBottom(x: number): number {
  return 560 + (x - CAVE.x0) * 0.24 + Math.sin(x * 0.02 + 2) * 6;
}
/** The open part of the tunnel at x, as [top, bottom]; it closes off in a rounded end. */
export function caveSpan(x: number): [number, number] {
  const endFade = smooth((x - (CAVE.x1 - 80)) / 80);
  const mid = (caveTop(x) + caveBottom(x)) / 2;
  const half = ((caveBottom(x) - caveTop(x)) / 2) * Math.sqrt(1 - endFade * 0.98);
  return [mid - half, mid + half];
}
function inCave(x: number, y: number): boolean {
  if (x < CAVE.x0 - 40 || x > CAVE.x1) return false;
  const [t, b] = caveSpan(x);
  return y > t && y < b;
}

function inPolygon(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Is this point inside rock or sand? Used for collisions. */
export function isSolid(x: number, y: number): boolean {
  if (x < WORLD_X0 || x > WORLD_W) return true;
  if (y >= groundY(x)) return !inCave(x, y);
  if (y > 540 && y < 780 && x > 5690 && x < 6880 && inPolygon(x, y, LEDGE)) return true;
  return false;
}

/** Is the point inside the cave tunnel (the dark part)? */
export function inCaveTunnel(x: number, y: number): boolean {
  return x > CAVE.x0 + 40 && inCave(x, y) && y >= groundY(x);
}

/**
 * Bake how much daylight reaches each spot ("sky visibility"), into a small
 * greyscale image covering the whole world. 1 = open water under the sun,
 * lower = shaded by rock above. It is blurred so the shadows are soft.
 * The lighting shader reads it every frame, so shadows cost nothing at runtime.
 */
export function bakeSkyVisibility(cell: number, blurPasses: number): HTMLCanvasElement {
  const w = Math.ceil(WORLD_SPAN / cell);
  const h = Math.ceil(WORLD_H / cell);
  const vis = new Float32Array(w * h);
  for (let i = 0; i < w; i++) {
    const x = WORLD_X0 + (i + 0.5) * cell;
    let rock = 0;
    for (let j = 0; j < h; j++) {
      const y = (j + 0.5) * cell;
      const solid = isSolid(x, y);
      // Light enters a surface slightly, so the top of a rock is fully lit.
      vis[j * w + i] = Math.exp(-rock / 70);
      if (solid) rock += cell;
      // Deep inside the cave nothing gets through.
      else if (x > CAVE.x0 && y > caveTop(x) - 10 && y < caveBottom(x) + 10) rock += cell * 0.4;
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
