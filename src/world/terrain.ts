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
 *
 * Milestone 7 added the kelp forest east of the cliff:
 *  8640 - 9600  the cliff top: a shallow rock shelf under 3 m of water. The cave
 *               runs right under it and comes out on the far side. The sub can
 *               cross the shelf, but an old survey boom gate hangs across it
 *               (x = 8900); its winch is on the forest side.
 *  9600 - 10050 the shelf's east face drops 15 m to the forest floor
 * 10050 - 14800 the kelp forest: giant kelp from the floor to the surface,
 *               rock outcrops, holdfasts (resin) and shaded rock (lumen moss)
 * 14800 - 15600 the east wall, with the mouth of the kelp caves (the zone's
 *               major site, milestone 7 part 2)
 */

/** West edge of the world (milestone 5 added the basin west of the old wall). */
export const WORLD_X0 = -5600;
export const WORLD_W = 15600;
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
/** The diver cannot go past this point inside the cave without the dive light: it is too dark. */
export const CAVE_GATE_X = 8790;

/** Milestone 7: the kelp forest beyond the east cliff. */
export const FOREST = { x0: 10050, x1: 14800 };
/** The shelf on top of the east cliff (the sub's way over), and the boom gate across it. */
export const SHELF = { x0: 8640, x1: 9600, floor: 210 };
export const BOOM_X = 8900;
/** The boom gate's winch, on the forest side of the gate. */
export const WINCH_X = 9040;
/** Is the boom gate open? Set from the save (src/main.ts). */
export const boom = { open: false };
/** The mouth of the kelp caves in the east wall (the major site, part 2). */
export const SITE_MOUTH = { x: 14975, y: 1150, rx: 170, ry: 100 };

function forestFloor(x: number): number {
  let y = 1290 + Math.sin(x * 0.0017) * 28 + Math.sin(x * 0.0041 + 1) * 14;
  y -= bump(x, 11150, 260, 80) + bump(x, 12850, 220, 110) + bump(x, 13850, 200, 60);
  return y;
}

/** The shelf, the east face, the forest floor and the east wall. */
function eastGround(x: number): number {
  let y = SHELF.floor + Math.sin(x * 0.011) * 5 - bump(x, 9300, 90, 22);
  y += (forestFloor(x) - y) * smooth((x - 9600) / 450);
  y += (260 - y) * smooth((x - 14800) / 420);
  return y;
}

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

/*
 * The terraces line up with the build grid (src/game/base.ts can't be
 * imported here, so its numbers are repeated): cells are 112 units, the grid
 * starts at x = -4884 and its bottom row sits on y = 1655. A ledge `rows`
 * high fills that many cells of its two columns with rock; its riser sits
 * inside its own west column, so the cells beside it stay open. Its top is
 * 16 below the row line, which keeps the row above open despite the ripples.
 * They take 30 cells: 2 columns × (2 + 5 + 8) rows.
 */
const T_CELL = 112;
const T_GRID_X0 = -4884;
const T_GRID_BASE = 1655;
const TERRACES = [
  { col: 41, rows: 2 },
  { col: 43, rows: 5 },
  { col: 45, rows: 8 },
].map((t) => ({ x: T_GRID_X0 + t.col * T_CELL, y: T_GRID_BASE - t.rows * T_CELL + 16 }));

function basinGround(x: number): number {
  // Gentle ripples on the floor, and a few low sand mounds.
  let y = BASIN_FLOOR + 6 + Math.sin(x * 0.004) * 6 + Math.sin(x * 0.0113 + 2) * 4;
  y -= bump(x, -3300, 260, 10) + bump(x, -1450, 320, 12);
  // Terraces at the foot of the cliff (Colin, after milestone 6): three rock
  // ledges, each two grid columns wide, stepping down from the shelf, so pieces
  // built off the shelf edge stand on a ledge instead of on 17 m legs.
  for (const t of TERRACES) y += (t.y - y) * smooth((x - t.x) / 46);
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
  // The east cliff (milestone 7: it now rises out of the water).
  y -= smooth((x - 8380) / 260) * 270;
  if (x > 8540) y += (eastGround(x) - y) * smooth((x - 8540) / 100);
  const k = x > 8700 ? 0.5 : 1;
  for (const b of bumps) y += Math.sin(x * b.f + b.p) * b.a * k;
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

/**
 * The cave in the east cliff: a tunnel sloping gently down into the rock.
 * Milestone 7: it runs right through, under the island, and comes out on
 * its east face above the kelp forest.
 */
export const CAVE = { x0: 8470, x1: 9960 };
export function caveTop(x: number): number {
  return 420 + (x - CAVE.x0) * 0.2 + Math.sin(x * 0.03) * 8;
}
export function caveBottom(x: number): number {
  return 560 + (x - CAVE.x0) * 0.24 + Math.sin(x * 0.02 + 2) * 6;
}
/** The open part of the tunnel at x, as [top, bottom]; it closes off in a rounded end. */
export function caveSpan(x: number): [number, number] {
  return [caveTop(x), caveBottom(x)];
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

function inMouth(x: number, y: number): boolean {
  const m = SITE_MOUTH;
  return ((x - m.x) / m.rx) ** 2 + ((y - m.y) / m.ry) ** 2 < 1 && y < m.y + m.ry * 0.7;
}

/** Is this point inside rock or sand? Used for collisions. */
export function isSolid(x: number, y: number): boolean {
  if (x < WORLD_X0 || x > WORLD_W) return true;
  if (!boom.open && Math.abs(x - BOOM_X) < 16 && y < SHELF.floor + 8) return true;
  if (y >= groundY(x)) return !inCave(x, y) && !(x > SITE_MOUTH.x - SITE_MOUTH.rx && inMouth(x, y));
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
  const wasOpen = boom.open;
  boom.open = true;
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
      else if (x > CAVE.x0 && x < CAVE.x1 - 120 && y > caveTop(x) - 10 && y < caveBottom(x) + 10) rock += cell * 0.4;
      // Milestone 7: the kelp canopy shades the forest more the deeper you go.
      else if (x > 9650 && y > 40) rock += cell * 0.055 * smooth((x - 9650) / 450) * (1 - 0.5 * smooth((x - 14700) / 400));
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
  boom.open = wasOpen;
  return canvas;
}
