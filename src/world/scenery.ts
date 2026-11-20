import { Color, Container, FillGradient, Graphics, MeshRope, Point, Renderer, Sprite, Text, Texture, type FillStyle } from 'pixi.js';
import { createShallowsSeabed, type ReefTextures } from '../art/shallows';
import { materialFill, type Material, type WorldArt } from '../art/worldArt';
import type { WaterMotion } from '../scene/waterMotion';
import { mulberry32, WORLD_SEED } from '../rng';
import { TrenchScenery } from './trenchgfx';
import { SanctumScenery } from './sanctumgfx';
import { drawSurveyWreck } from './corvinaArt';
import { AnemoneCrown, BottomAnimal } from '../actors/bottomLife';
import {
  ANCHOR_X,
  BEACON_X,
  BUOY_X,
  CAVE,
  caveBottom,
  caveSpan,
  caveTop,
  CREVICE_X,
  groundY,
  LEDGE,
  SLED_X,
  RECORDER_X,
  smooth,
  WORLD_H,
  WORLD_W,
  WORLD_X0,
  BASIN_WEST,
  WALL_NOOK,
  BOOM_X,
  FOREST,
  SHELF,
  SITE_MOUTH,
  WINCH_X,
  AIR_POCKETS,
  BRACKETS,
  caveFloor,
  caveField,
  ellTop,
  KC,
  KC_BOUNDS,
  inLightless,
  LIGHTLESS_EDGE,
  KC_FINDS,
  KC_PILLARS,
  KELP_WALL,
  CORVINA,
  LURKER_DENS,
  RACE,
  RINGS,
  VANE,
  WRECKS,
  corvinaHull,
  corvinaHouse,
  CV_HATCH,
  HIDDEN,
  SEAM,
  shapesField,
  SALVAGE,
} from './terrain';

/**
 * Everything solid in the Sunlit Shallows: painted sand and rock, the rock
 * ledge, kelp, coral, seagrass, the Kestrel marker buoy, an old survey sled
 * wreck, an anchor, the survey beacon, glowing anemones in the grotto and the
 * cave mouth in the east cliff.
 *
 * "Painterly" here means many soft, semi-transparent brush dabs layered over
 * a flat base colour, so surfaces have the uneven, hand-made texture of the
 * concept art instead of looking like flat vector shapes.
 *
 * The zone is wide, so the art is cut into vertical slices and only the
 * slices near the camera are drawn each frame ("culling").
 */

let rand = mulberry32(WORLD_SEED ^ 0x5ce9);
const R = (a: number, b: number) => a + rand() * (b - a);

const PAL = {
  sand: 0xcdb98c,
  sandLight: 0xe3d3a8,
  sandShade: 0x9f8d66,
  silt: 0x7d7a66,
  rock: 0x4c5d61,
  rockLight: 0x7f9192,
  rockShade: 0x2c3a3f,
  algae: 0x5e7a3c,
  algaeLight: 0x8aa154,
};

const gy = (x: number) => groundY(Math.max(WORLD_X0, Math.min(WORLD_W, x)));
/** The foreground kelp layer is laid out over the shallows' old width (it moves with parallax). */
export const FRONT_REF = 9000;

export interface PointLight {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  color: [number, number, number];
}

/** A soft brush dab: a few stacked ellipses fading towards the edge. */
export function dab(g: Graphics, x: number, y: number, rx: number, ry: number, color: number, alpha: number): void {
  g.ellipse(x, y, rx, ry).fill({ color, alpha: alpha * 0.5 });
  g.ellipse(x, y, rx * 0.65, ry * 0.65).fill({ color, alpha: alpha * 0.6 });
}

/** How much the floor has turned to grey silt at x (the deep part around the grotto). */
function siltAt(x: number): number {
  return (
    smooth((x - 5000) / 700) * (1 - smooth((x - 6600) / 400)) +
    smooth((x - 3650) / 300) * (1 - smooth((x - 4400) / 300)) * 0.35 +
    // The floor of the Kestrel basin (milestone 5): fine grey silt, patchy.
    (1 - smooth((x - 150) / 200)) * (0.45 + 0.15 * Math.sin(x * 0.0021)) +
    // The kelp forest floor (milestone 7): dark silt and kelp litter.
    smooth((x - 9700) / 300) * (0.7 + 0.15 * Math.sin(x * 0.003)) * (1 - smooth((x - 19200) / 400)) +
    // The wreck shelf (milestone 8): grey silt with rust stains.
    smooth((x - 19400) / 400) * (0.8 + 0.12 * Math.sin(x * 0.0041))
  );
}

const geology: readonly [number, number, Material][] = [
  [WORLD_X0 - 80, BUOY_X, 'shale'], [ANCHOR_X, 5930, 'limestone'], [5930, 6910, 'grotto'],
  [6910, 8340, 'limestone'], [8340, 9960, 'grotto'], [9960, 14800, 'forest'],
  [14800, 19550, 'cave'], [19550, 26870, 'silt'],
];

function groundPaint(g: Graphics, art: WorldArt, x0: number, x1: number): void {
  for (const [start, end, key] of geology) {
    const texture = art.materials[key];
    if (!texture || start >= x1 || end <= x0) continue;
    // Fade the rock treatments where their ranges meet and retain the procedural sand below.
    const stops = [start, start + 28, start + 57, start + 90, end - 90, end - 57, end - 28, end];
    for (let i = 1; i < stops.length; i++) {
      const left = Math.max(x0, stops[i - 1]);
      const right = Math.min(x1, stops[i]);
      if (right <= left) continue;
      const opacity = [0.17, 0.38, 0.58, 0.76, 0.58, 0.38, 0.17][i - 1];
      const points = [left, WORLD_H + 300, left, gy(left) + 0.5];
      for (let x = (Math.floor(left / 10) + 1) * 10; x < right; x += 10) points.push(x, gy(x) + 0.5);
      points.push(right, gy(right) + 0.5, right, WORLD_H + 300);
      g.poly(points).fill(materialFill(texture, PAL.sand, opacity, 1360, 710));
    }
  }
}

/** Sand for one slice of the world, from x0 to x1. */
function drawGround(g: Graphics, detail: number, x0: number, x1: number, art?: WorldArt): void {
  const step = 10;
  g.moveTo(x0 - 2, WORLD_H + 300);
  for (let x = x0 - 2; x <= x1 + 2; x += step) g.lineTo(x, gy(x));
  g.lineTo(x1 + 2, gy(x1 + 2)).lineTo(x1 + 2, WORLD_H + 300).closePath().fill({ color: PAL.sand });

  for (let x = x0; x < x1; x += 14) {
    const t = siltAt(x + 7);
    if (t < 0.02) continue;
    g.poly([x, gy(x), x + 14.5, gy(x + 14.5), x + 14.5, WORLD_H + 300, x, WORLD_H + 300]).fill({ color: PAL.silt, alpha: t * 0.75 });
  }
  if (art) groundPaint(g, art, x0 - 2, x1 + 2);

  const per = (x1 - x0) / 3600;
  const n = Math.round(900 * detail * per);
  for (let i = 0; i < n; i++) {
    const x = R(x0, x1);
    const y = gy(x) + Math.pow(rand(), 1.6) * 160 + 6;
    dab(g, x, y, R(10, 36), R(3, 8), rand() < 0.45 ? PAL.sandLight : PAL.sandShade, R(0.18, 0.35));
  }
  for (let i = 0; i < 260 * detail * per; i++) {
    const x = R(x0, x1);
    const y = gy(x) + R(8, 70);
    const w = R(8, 22);
    g.moveTo(x - w, y)
      .quadraticCurveTo(x, y - R(2, 4), x + w, y)
      .stroke({ color: PAL.sandShade, alpha: R(0.25, 0.5), width: R(1, 2) });
  }
  for (let i = 0; i < 220 * detail * per; i++) {
    const x = R(x0, x1);
    const y = gy(x) + R(3, 50);
    const r = R(1.5, 5);
    g.ellipse(x, y, r * 1.3, r).fill({ color: rand() < 0.5 ? 0x8b8573 : 0x5c5a50, alpha: 0.8 });
    g.ellipse(x - r * 0.3, y - r * 0.4, r * 0.5, r * 0.3).fill({ color: 0xffffff, alpha: 0.18 });
  }
  // Soft darker band lower down, like the concept art's shaded sand.
  g.moveTo(x0 - 2, WORLD_H + 300);
  for (let x = x0 - 2; x <= x1 + 2; x += 30) g.lineTo(x, gy(x) + 70 + Math.sin(x * 0.01) * 14);
  g.lineTo(x1 + 2, gy(x1 + 2) + 70).lineTo(x1 + 2, WORLD_H + 300).closePath().fill({ color: PAL.sandShade, alpha: 0.35 });
}

function inside(x: number, y: number, poly: [number, number][]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function rockFade(color: number, from: number, to: number): FillGradient {
  return new FillGradient({
    start: { x: from, y: 0 },
    end: { x: to, y: 0 },
    textureSpace: 'global',
    colorStops: [0, 0.25, 0.5, 0.75, 1].map((offset) => ({
      offset,
      color: new Color(color).setAlpha(1 - smooth(offset)),
    })),
  });
}

/** Paints rock texture into an outline: shaded base, dabs, cracks, algae on top. */
function paintRock(
  g: Graphics,
  outline: [number, number][],
  topOf: (x: number) => number,
  detail: number,
  featherFrom?: number,
  material?: Texture,
): void {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of outline) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const baseFade = featherFrom === undefined ? null : rockFade(PAL.rock, featherFrom, maxX);
  const rimFade = featherFrom === undefined ? null : rockFade(PAL.rockLight, featherFrom, maxX);
  const coverage = featherFrom === undefined
    ? () => 1
    : (x: number) => 1 - smooth((x - featherFrom) / (maxX - featherFrom));
  if (baseFade && rimFade) {
    g.once('destroyed', () => {
      baseFade.destroy();
      rimFade.destroy();
    });
  }
  g.poly(outline.flat()).fill(baseFade ? { fill: baseFade } : { color: PAL.rock });
  if (material && !baseFade) g.poly(outline.flat()).fill(materialFill(material, PAL.rock, 0.84, 1130, 650));
  const area = ((maxX - minX) * (Math.min(maxY, WORLD_H + 40) - minY)) / 1000;
  const n = Math.round(Math.min(1400, area * 1.1) * detail);
  for (let i = 0; i < n; i++) {
    const x = R(minX, maxX);
    const top = topOf(x);
    if (!isFinite(top)) continue;
    const y = R(Math.max(minY, top), Math.min(maxY, WORLD_H + 40));
    if (y < top + 2) continue;
    if (!inside(x, y, outline)) continue;
    const depthIn = (y - top) / 120;
    const c = depthIn < 0.4 && rand() < 0.35 ? PAL.rockLight : rand() < 0.5 ? PAL.rockShade : PAL.rock;
    const rx = R(8, 30);
    dab(g, x, y, rx, R(5, 16), c, R(0.2, 0.4) * coverage(x + rx));
  }
  for (let i = 0; i < n / 25; i++) {
    let x = R(minX, maxX);
    const top = topOf(x);
    if (!isFinite(top)) continue;
    let y = top + R(15, 90);
    let right = x;
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += R(-10, 10);
      y += R(6, 16);
      right = Math.max(right, x);
      g.lineTo(x, y);
    }
    const width = R(0.8, 1.5);
    g.stroke({ color: PAL.rockShade, alpha: 0.35 * coverage(right + width / 2), width });
  }
  let started = false;
  for (let x = minX + 2; x <= maxX - 2; x += 6) {
    const top = topOf(x);
    if (!isFinite(top)) continue;
    if (!started) g.moveTo(x, top + 2.5);
    else g.lineTo(x, top + 2.5);
    started = true;
  }
  if (started) g.stroke({ color: PAL.rockLight, fill: rimFade, width: 5, alpha: 0.55, join: 'round', cap: 'round' });
  for (let x = minX + 4; x < maxX - 4; x += R(5, 12)) {
    const top = topOf(x);
    if (!isFinite(top)) continue;
    if (rand() < 0.75) {
      const c = rand() < 0.5 ? PAL.algae : PAL.algaeLight;
      const cx = x + R(-3, 3);
      const cy = top + R(1, 6);
      const radius = R(2, 4.5);
      g.circle(cx, cy, radius).fill({ color: c, alpha: R(0.5, 0.85) * coverage(cx + radius) });
    }
  }
}

/**
 * Fill the region where fn(x, y) < 0, traced with marching squares on a grid of
 * step S (after milestone 7 part 2): smooth, interpolated edges, with whole rows
 * of inside cells merged into single rectangles.
 */
export function traceField(g: Graphics, fn: (x: number, y: number) => number, X0: number, X1: number, Y0: number, Y1: number, S: number, color: number | FillStyle, alpha = 1): void {
  const fill = typeof color === 'number' ? { color, alpha } : color;
  const nx = Math.ceil((X1 - X0) / S) + 1;
  const ny = Math.ceil((Y1 - Y0) / S) + 1;
  const F = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[j * nx + i] = fn(X0 + i * S, Y0 + j * S);
  for (let j = 0; j < ny - 1; j++) {
    let run = -1;
    const flush = (iEnd: number) => {
      if (run >= 0) g.rect(X0 + run * S, Y0 + j * S, (iEnd - run) * S, S).fill(fill);
      run = -1;
    };
    for (let i = 0; i < nx - 1; i++) {
      const v = [F[j * nx + i], F[j * nx + i + 1], F[(j + 1) * nx + i + 1], F[(j + 1) * nx + i]];
      const inside = v.map((q) => q < 0);
      if (inside.every(Boolean)) {
        if (run < 0) run = i;
        continue;
      }
      flush(i);
      if (!inside.some(Boolean)) continue;
      const cx = [X0 + i * S, X0 + (i + 1) * S, X0 + (i + 1) * S, X0 + i * S];
      const cy = [Y0 + j * S, Y0 + j * S, Y0 + (j + 1) * S, Y0 + (j + 1) * S];
      const pts: number[] = [];
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) % 4;
        if (inside[k]) pts.push(cx[k], cy[k]);
        if (inside[k] !== inside[k2]) {
          const t = v[k] / (v[k] - v[k2]);
          pts.push(cx[k] + (cx[k2] - cx[k]) * t, cy[k] + (cy[k2] - cy[k]) * t);
        }
      }
      if (pts.length >= 6) g.poly(pts).fill(fill);
    }
    flush(nx - 1);
  }
}

/** A rock patch that follows the ground line and tapers into the sand at both ends. */
function rockPatch(g: Graphics, x0: number, x1: number, thick: number, d: number, material?: Texture): void {
  const pts: [number, number][] = [];
  for (let x = x0; x <= x1; x += 8) pts.push([x, gy(x) - 1]);
  for (let x = x1; x >= x0; x -= 16) {
    const t = (x - x0) / (x1 - x0);
    const k = Math.pow(Math.sin(Math.PI * t), 1.5);
    pts.push([x, gy(x) + 4 + thick * k + Math.sin(x * 0.05) * 6 * k]);
  }
  paintRock(g, pts, (x) => (x >= x0 && x <= x1 ? gy(x) : NaN), d, undefined, material);
}

function ledgeTop(x: number): number {
  for (let i = 0; i < LEDGE.length - 1; i++) {
    const [x0, y0] = LEDGE[i];
    const [x1, y1] = LEDGE[i + 1];
    if (x1 < x0) break; // reached the underside
    if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return NaN;
}

/** The cave in the east cliff: a dark back wall, and a black throat where it goes deeper than any lamp reaches. */
function drawCave(g: Graphics, dark: Graphics, stone?: Texture): void {
  const top = (x: number) => Math.max(caveSpan(x)[0], gy(x));
  const caveBottom = (x: number) => caveSpan(x)[1];
  const pts: [number, number][] = [];
  const xs: number[] = [];
  for (let x = CAVE.x0 - 40; x <= CAVE.x1; x += 6) xs.push(x);
  for (const x of xs) pts.push([x, top(x)]);
  for (const x of [...xs].reverse()) pts.push([x, caveBottom(x)]);
  g.poly(pts.flat()).fill({ color: 0x1f2a2d });
  if (stone) g.poly(pts.flat()).fill(materialFill(stone, 0x1f2a2d, 0.68, 1040, 540));
  for (let i = 0; i < 160; i++) {
    const x = R(CAVE.x0, CAVE.x1 - 40);
    const y = R(top(x) + 6, caveBottom(x) - 6);
    dab(g, x, y, R(8, 22), R(5, 12), rand() < 0.5 ? 0x2c3a3f : 0x161f22, R(0.3, 0.5));
  }
  // Cave floor: a lip of rock and silt.
  for (let x = CAVE.x0 - 30; x < CAVE.x1 - 60; x += R(6, 14))
    g.circle(x, caveBottom(x) + R(-3, 2), R(3, 7)).fill({ color: rand() < 0.5 ? 0x3b4a4e : 0x55605c, alpha: 0.9 });
  // The throat: strips getting blacker towards the end. Black stays black under any light.
  // Each strip follows the tunnel's own outline, so the darkness stays inside the rock.
  for (let x = 8680; x < CAVE.x1 - 150; x += 8) {
    // Milestone 7: the tunnel runs right through now, so it lightens again towards the far end.
    const t = smooth((x - 8680) / 220) * (1 - smooth((x - 9480) / 300));
    const xe = Math.min(CAVE.x1, x + 8.5);
    dark
      .poly([x, top(x) - 2, xe, top(xe) - 2, xe, caveBottom(xe) + 4, x, caveBottom(x) + 4])
      .fill({ color: 0x000000, alpha: 0.1 + t * 0.9 });
  }
}

/** Branching coral, grown from a seed so every reef looks different. */
function drawCoral(g: Graphics | undefined, x: number, y: number, color: number, size: number): void {
  const branch = (bx: number, by: number, angle: number, len: number, w: number, depth: number) => {
    const ex = bx + Math.cos(angle) * len;
    const ey = by + Math.sin(angle) * len;
    g?.moveTo(bx, by)
      .quadraticCurveTo(bx + Math.cos(angle + 0.3) * len * 0.5, by + Math.sin(angle + 0.3) * len * 0.5, ex, ey)
      .stroke({ color, width: w, cap: 'round' });
    if (depth > 0) {
      const n = rand() < 0.5 ? 2 : 3;
      for (let i = 0; i < n; i++) branch(ex, ey, angle + R(-0.7, 0.7), len * R(0.55, 0.8), w * 0.72, depth - 1);
    } else {
      g?.circle(ex, ey, w * 0.7).fill({ color: 0xffffff, alpha: 0.25 });
    }
  };
  for (let i = 0; i < 3; i++) branch(x + R(-6, 6), y + 4, -Math.PI / 2 + R(-0.6, 0.6), 22 * size, 7 * size, 3);
}

function drawFan(g: Graphics | undefined, x: number, y: number, color: number, size: number): void {
  for (let i = 0; i < 18; i++) {
    const a = -Math.PI / 2 + R(-0.9, 0.9);
    const l = R(26, 46) * size;
    const controlX = x + Math.cos(a) * l * 0.4 + R(-6, 6);
    const controlY = y + Math.sin(a) * l * 0.6;
    g?.moveTo(x, y)
      .quadraticCurveTo(controlX, controlY, x + Math.cos(a) * l, y + Math.sin(a) * l)
      .stroke({ color, width: 1.6 * size, alpha: 0.85, cap: 'round' });
  }
}

function addReefSprite(layer: Container, texture: Texture, x: number, y: number, size: number): void {
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 0.9);
  sprite.position.set(x, y);
  sprite.width = sprite.height = size;
  layer.addChild(sprite);
}

function rivetsRow(g: Graphics, x: number, y: number, n: number, gap: number): void {
  for (let i = 0; i < n; i++) {
    g.circle(x + i * gap, y, 1.4).fill({ color: 0x2f373a });
    g.circle(x + i * gap - 0.4, y - 0.5, 0.6).fill({ color: 0xd0d6d6, alpha: 0.7 });
  }
}

export function rustStreaks(g: Graphics, x0: number, x1: number, y: number, n: number, len: number): void {
  for (let i = 0; i < n; i++) {
    const sx = R(x0, x1);
    const sy = y + R(-2, 4);
    g.moveTo(sx, sy).lineTo(sx + R(-1.5, 1.5), sy + R(len * 0.4, len)).stroke({ color: 0x8a3a20, width: R(0.8, 1.8), alpha: R(0.4, 0.7) });
  }
}

/** The survey beacon on the edge of the drop-off: weathered steel with a red lamp. */
function drawBeacon(g: Graphics, x: number, y: number): { lampX: number; lampY: number } {
  const h = 120;
  g.moveTo(x + 4, y + 2)
    .bezierCurveTo(x - 30, y + 14, x - 70, y + 4, x - 120, y + 18)
    .stroke({ color: 0x222628, width: 3.5 });
  g.roundRect(x - 28, y - 10, 56, 16, 4).fill({ color: 0x5b6467 });
  g.roundRect(x - 28, y - 10, 56, 4, 2).fill({ color: 0xffffff, alpha: 0.12 });
  rivetsRow(g, x - 22, y - 2, 4, 15);
  g.rect(x - 4, y - h, 8, h - 8).fill({ color: 0x6b7478 });
  g.rect(x - 4, y - h, 3, h - 8).fill({ color: 0xffffff, alpha: 0.12 });
  for (let k = 0; k < 4; k++) g.rect(x - 5, y - h + 20 + k * 22, 10, 3).fill({ color: 0x3b4448 });
  rustStreaks(g, x - 3, x + 3, y - h + 14 + 30, 6, 30);
  const hy = y - h - 26;
  g.roundRect(x - 20, hy, 40, 30, 5).fill({ color: 0xc29b45 });
  g.roundRect(x - 20, hy + 18, 40, 12, 4).fill({ color: 0x8c6f31, alpha: 0.7 });
  g.rect(x - 20, hy + 10, 40, 4).fill({ color: 0x3b4448 });
  rivetsRow(g, x - 15, hy + 4, 4, 10);
  rivetsRow(g, x - 15, hy + 25, 4, 10);
  rustStreaks(g, x - 18, x + 18, hy + 14, 5, 16);
  for (let i = 0; i < 14; i++) dab(g, x + R(-26, 26), y - R(0, 12), R(3, 8), R(2, 4), PAL.algae, 0.7);
  const ly = hy - 9;
  g.rect(x - 9, hy - 3, 18, 4).fill({ color: 0x3b4448 });
  g.moveTo(x - 8, hy - 2).lineTo(x - 7, ly - 7).moveTo(x + 8, hy - 2).lineTo(x + 7, ly - 7).moveTo(x - 7, ly - 7).lineTo(x + 7, ly - 7);
  g.stroke({ color: 0x3b4448, width: 1.6 });
  g.circle(x, ly, 6.5).fill({ color: 0x5a1a14 });
  return { lampX: x, lampY: ly };
}

/**
 * The Kestrel site marker: a weighted steel crate on the sand with a rope
 * rising to an orange-red buoy at the surface. This is where the crew will
 * lay out the base in milestone 3.
 */
function drawSiteMarker(g: Graphics, x: number): void {
  const y = gy(x) + 4;
  // Crate.
  g.roundRect(x - 34, y - 34, 68, 36, 3).fill({ color: 0x5b6467 });
  g.roundRect(x - 34, y - 34, 68, 5, 2).fill({ color: 0xffffff, alpha: 0.14 });
  g.rect(x - 34, y - 20, 68, 4).fill({ color: 0x3b4448 });
  g.rect(x - 12, y - 34, 4, 36).fill({ color: 0x3b4448 });
  g.rect(x + 10, y - 34, 4, 36).fill({ color: 0x3b4448 });
  g.rect(x - 34, y - 14, 22, 12).fill({ color: 0xc29b45, alpha: 0.9 });
  for (let i = 0; i < 4; i++) g.rect(x - 32 + i * 6, y - 14, 3, 12).fill({ color: 0x232524, alpha: 0.85 });
  rivetsRow(g, x - 30, y - 28, 6, 12);
  rustStreaks(g, x - 32, x + 32, y - 30, 9, 18);
  for (let i = 0; i < 18; i++) dab(g, x + R(-38, 38), y - R(0, 8), R(3, 9), R(2, 4), PAL.algae, 0.7);
  // Shackle and rope to the surface.
  g.circle(x, y - 40, 5).stroke({ color: 0x3b4448, width: 2.5 });
  g.moveTo(x, y - 44);
  const top = 6;
  for (let k = 1; k <= 20; k++) {
    const t = k / 20;
    g.lineTo(x + Math.sin(t * Math.PI) * 14, y - 44 + (top - (y - 44)) * t);
  }
  g.stroke({ color: 0x8c7c5a, width: 2 });
}

/** The surface buoy itself (separate so it can bob). */
function drawBuoy(c: Container): void {
  const g = c.addChild(new Graphics());
  g.ellipse(0, 0, 22, 15).fill({ color: 0xa8402e });
  g.ellipse(0, -5, 18, 7).fill({ color: 0xc8604a, alpha: 0.6 });
  g.rect(-22, -2, 44, 5).fill({ color: 0xe0d8c8, alpha: 0.85 });
  g.ellipse(0, 11, 16, 5).fill({ color: 0x6e2a1f, alpha: 0.8 });
  g.rect(-1.5, -30, 3, 18).fill({ color: 0x3b4448 });
  g.circle(0, 14, 3).stroke({ color: 0x3b4448, width: 2 });
  for (let i = 0; i < 6; i++) dab(g, R(-16, 16), R(6, 13), R(2, 5), R(1.5, 3), PAL.algae, 0.7);
  const label = new Text({
    text: 'KESTREL',
    style: { fontFamily: 'Courier New, monospace', fontSize: 5, fontWeight: 'bold', fill: 0x2a2418 },
    resolution: 6,
  });
  label.anchor.set(0.5);
  label.position.set(0, 0.5);
  label.alpha = 0.8;
  c.addChild(label);
}

/** An old survey sled wreck: a rusted frame on two runners, half buried, with a crushed instrument box. */
function drawSled(g: Graphics, x: number): Text {
  const y = gy(x) + 6;
  const tilt = (dx: number) => y - dx * 0.06;
  // Runners.
  for (const dy of [0, -6]) {
    g.moveTo(x - 120, tilt(-120) + dy)
      .lineTo(x + 100, tilt(100) + dy)
      .quadraticCurveTo(x + 130, tilt(130) + dy - 4, x + 128, tilt(128) + dy - 22)
      .stroke({ color: dy ? 0x4a4038 : 0x5e4c3e, width: 6, cap: 'round' });
  }
  // Frame uprights and top rail.
  for (const dx of [-100, -40, 30, 90]) g.rect(x + dx - 3, tilt(dx) - 70, 6, 66).fill({ color: 0x5a4a3e });
  g.moveTo(x - 104, tilt(-104) - 70).lineTo(x + 94, tilt(94) - 70).stroke({ color: 0x6a5546, width: 6 });
  g.moveTo(x - 100, tilt(-100) - 66).lineTo(x - 40, tilt(-40) - 8).stroke({ color: 0x4a3f36, width: 3 });
  g.moveTo(x + 30, tilt(30) - 66).lineTo(x + 90, tilt(90) - 8).stroke({ color: 0x4a3f36, width: 3 });
  // A crumpled instrument box in yellow, its door hanging open.
  const bx = x - 30;
  const by = tilt(-30) - 58;
  g.poly([bx - 30, by, bx + 32, by - 4, bx + 36, by + 46, bx - 28, by + 50]).fill({ color: 0xa88a40 });
  g.poly([bx - 30, by, bx + 32, by - 4, bx + 33, by + 6, bx - 29, by + 10]).fill({ color: 0xffffff, alpha: 0.12 });
  g.poly([bx + 4, by + 12, bx + 28, by + 10, bx + 30, by + 40, bx + 6, by + 42]).fill({ color: 0x1d2224 });
  g.poly([bx + 28, by + 10, bx + 50, by + 18, bx + 52, by + 46, bx + 30, by + 40]).fill({ color: 0x8c6f31 });
  rivetsRow(g, bx - 24, by + 4, 5, 12);
  g.rect(bx - 22, by + 20, 20, 6).fill({ color: 0x232524, alpha: 0.85 });
  rustStreaks(g, bx - 28, bx + 30, by + 6, 12, 30);
  // Sand drifted against it, algae and barnacles.
  for (let i = 0; i < 22; i++) dab(g, x + R(-130, 130), y + R(-6, 2), R(8, 22), R(3, 6), PAL.sandShade, 0.5);
  for (let i = 0; i < 40; i++) g.circle(x + R(-110, 100), tilt(0) - R(0, 72), R(1, 2.6)).fill({ color: rand() < 0.5 ? PAL.algae : 0xc8c0a8, alpha: 0.75 });
  const label = new Text({
    text: 'SLED 2',
    style: { fontFamily: 'Courier New, monospace', fontSize: 7, fontWeight: 'bold', fill: 0x2a2418 },
    resolution: 5,
  });
  label.position.set(bx - 22, by + 30);
  label.rotation = -0.06;
  label.alpha = 0.6;
  return label;
}

/** An old fluked anchor with a few links of chain, sunk into the sand. */
function drawAnchor(g: Graphics, x: number): void {
  const y = gy(x) + 2;
  g.moveTo(x - 6, y - 70).lineTo(x + 8, y - 4).stroke({ color: 0x4a4038, width: 7, cap: 'round' });
  g.moveTo(x - 36, y - 14).quadraticCurveTo(x + 4, y + 18, x + 42, y - 22).stroke({ color: 0x4a4038, width: 7, cap: 'round' });
  g.poly([x - 40, y - 22, x - 30, y - 10, x - 44, y - 8]).fill({ color: 0x4a4038 });
  g.poly([x + 46, y - 30, x + 36, y - 18, x + 50, y - 16]).fill({ color: 0x4a4038 });
  g.moveTo(x - 26, y - 62).lineTo(x + 12, y - 70).stroke({ color: 0x3e3630, width: 5, cap: 'round' });
  g.circle(x - 7, y - 78, 7).stroke({ color: 0x4a4038, width: 3.5 });
  for (let i = 0; i < 5; i++) g.ellipse(x - 20 - i * 13, y - 74 + i * 15, 7, 4).stroke({ color: 0x3e3630, width: 3 });
  rustStreaks(g, x - 8, x + 6, y - 66, 6, 40);
  for (let i = 0; i < 16; i++) g.circle(x + R(-40, 40), y - R(0, 70), R(1, 2.4)).fill({ color: PAL.algae, alpha: 0.7 });
}

/** A swaying kelp stalk: a textured strip bent along a chain of points. */
interface Kelp {
  rope: MeshRope;
  points: Point[];
  baseX: number;
  baseY: number;
  height: number;
  phase: number;
  bend: number; // current push from the diver
}

function kelpTexture(renderer: Renderer): Texture {
  // Drawn lying sideways: the texture's width runs along the stalk.
  const L = 256;
  const T = 48;
  const g = new Graphics();
  for (let i = 0; i < 9; i++) {
    const cx = 14 + i * 27;
    const side = i % 2 ? 1 : -1;
    g.moveTo(cx - 12, T / 2)
      .quadraticCurveTo(cx, T / 2 + side * T * 0.52, cx + 16, T / 2 + side * 3)
      .closePath()
      .fill({ color: 0xffffff, alpha: 0.85 });
  }
  g.rect(0, T / 2 - 3, L, 6).fill({ color: 0xe0e0e0 });
  g.rect(0, T / 2 - 1, L, 1.5).fill({ color: 0xffffff });
  const tex = renderer.generateTexture({ target: g, resolution: 2, frame: undefined });
  g.destroy();
  return tex;
}

/** A clump of seagrass blades. The whole clump sways by skewing. */
function grassClump(x: number, y: number, size: number): Graphics {
  const g = new Graphics();
  const greens = [0x6f8a45, 0x5c7a3c, 0x87994f, 0x4f6a36];
  for (let i = 0; i < 9; i++) {
    const bx = R(-14, 14) * size;
    const h = R(28, 62) * size;
    const lean = R(-8, 8);
    g.moveTo(bx - 2, 0)
      .quadraticCurveTo(bx + lean * 0.3, -h * 0.6, bx + lean, -h)
      .quadraticCurveTo(bx + lean * 0.3 + 3, -h * 0.6, bx + 2, 0)
      .closePath()
      .fill({ color: greens[Math.floor(rand() * greens.length)], alpha: 0.95 });
  }
  g.position.set(x, y + 4);
  return g;
}

/** Ids for the scanner, matched to the entries in game/scanner.ts. */
export type ScanKind =
  | 'kelp'
  | 'coral'
  | 'fan'
  | 'grass'
  | 'anemone'
  | 'beacon'
  | 'sled'
  | 'anchor'
  | 'buoy'
  | 'cave'
  | 'boom'
  | 'forest'
  | 'gkelp'
  | 'bladder'
  | 'lumen'
  | 'kcaves'
  | 'airpocket'
  | 'surge'
  | 'blackwater'
  | 'kwall'
  | 'wshelf'
  | 'race'
  | 'ring'
  | 'wreck'
  | 'corvina'
  | 'vane'
  | 'cvhook'
  | 'hidden'
  | 'salvage';

interface Slice {
  obj: Container;
  x0: number;
  x1: number;
}

export class Scenery {
  /** Lit by the scene lighting (drawn into the lit layer). */
  readonly view = new Container();
  /** Foreground plants that pass in front of the diver. */
  readonly front = new Container();
  /** Shining parts, drawn on top without lighting. */
  readonly emissive = new Container();
  /** Soft copies of the shining parts, blurred into a glow. */
  readonly glow = new Container();
  /** Drawn after the diver: the black throat of the cave. */
  readonly over = new Container();
  readonly lights: PointLight[] = [];
  /** Where each kind of scannable thing is. */
  readonly scanPoints: Record<ScanKind, { x: number; y: number }[]> = {
    kelp: [], coral: [], fan: [], grass: [], anemone: [], beacon: [], sled: [], anchor: [], buoy: [], cave: [],
    boom: [], forest: [], gkelp: [], bladder: [], lumen: [], kcaves: [],
    airpocket: [], surge: [], blackwater: [], kwall: [],
    wshelf: [], race: [], ring: [], wreck: [], corvina: [], vane: [], cvhook: [], hidden: [], salvage: [],
  };
  /** The cave's black throat (milestone 7: the dive light thins it). */
  caveDark!: Graphics;
  /** The survey boom gate on the cliff-top shelf and its winch (milestone 7). */
  private boomGate = new Container();
  private winch = new Graphics();
  private cable = new Graphics();
  private boomShown = -1;
  private mossGlows: { core: Graphics; halo: Graphics; light: PointLight; phase: number }[] = [];
  /** Milestone 7 part 2: the kelp caves. */
  private kcDark = new Graphics();
  private kcWall = new Graphics();
  private kcWallCut = new Graphics();
  private kcBrackets: { core: Graphics; halo: Graphics; light: PointLight; lit: boolean }[] = [];
  private kcSurge = new Graphics();
  private kcLitShown = '';

  /** Milestone 10: the trench's own art. */
  trench!: TrenchScenery;
  /** Milestone 11: the sanctum under the trench floor. */
  sanctum!: SanctumScenery;
  private kelps: Kelp[] = [];
  private grass: { g: Graphics | Sprite; phase: number; x: number; bend?: number }[] = [];
  private readonly plantFlow = { x: 0, y: 0, silt: 0, energy: 0 };
  private slices: Slice[] = [];
  private buoy = new Container();
  private beaconLamp = new Graphics();
  private beaconGlow = new Graphics();
  private beaconLight!: PointLight;
  private anemones: { core: Container; halo: Graphics; light: PointLight; phase: number; crown?: AnemoneCrown }[] = [];
  private readonly anemoneFlow = { x: 0, y: 0, silt: 0, energy: 0 };
  private readonly shelfAnimals: BottomAnimal[] = [];

  constructor(renderer: Renderer, detail: number, reef?: ReefTextures, seabed?: Texture, kelp?: readonly Texture[], forestOutcrop?: Texture, private readonly art?: WorldArt, living = false, private readonly livingBases = false) {
    // Same seed every time, so switching presets rebuilds the identical world.
    rand = mulberry32(WORLD_SEED ^ 0x5ce9);

    const kelpBack = new Container();
    const groundLayer = new Container();
    const decorLayer = new Container();
    const kelpFront = new Container();
    this.view.addChild(kelpBack, groundLayer, decorLayer, kelpFront);

    const SLICE = 1000;
    const nSlices = Math.ceil(WORLD_W / SLICE);
    const decor: Graphics[] = [];
    for (let i = 0; i < nSlices; i++) {
      const x0 = i * SLICE;
      const x1 = Math.min(WORLD_W, x0 + SLICE);
      const g = new Graphics();
      drawGround(g, detail, i === 0 ? -60 : x0, i === nSlices - 1 ? WORLD_W + 60 : x1, this.art);
      groundLayer.addChild(g);
      this.slices.push({ obj: g, x0: x0 - 80, x1: x1 + 80 });
      const d = new Graphics();
      decorLayer.addChild(d);
      decor.push(d);
      this.slices.push({ obj: d, x0: x0 - 160, x1: x1 + 160 });
    }
    const decorAt = (x: number) => decor[Math.max(0, Math.min(nSlices - 1, Math.floor(x / SLICE)))];

    const rock = (x0: number, x1: number, build: (g: Graphics) => void, replacement?: Sprite) => {
      const g = new Graphics();
      build(g);
      // Keep the procedural random sequence identical so later decorations and scanner points stay put.
      const obj = replacement ?? g;
      if (replacement) g.destroy();
      groundLayer.addChild(obj);
      this.slices.push({ obj, x0: x0 - 60, x1: x1 + 60 });
    };
    // The cliff from the shelf down into the basin, and the rock under the shelf (milestone 5).
    // Since the terraces (after milestone 6) the rock starts at the foot of the lowest ledge.
    rock(-320, 1760, (g) => {
      const pts: [number, number][] = [];
      const top = (x: number) => gy(x) + 90 * smooth((x - 360) / 60) * (1 - smooth((x - 1640) / 120));
      for (let x = -320; x <= 1760; x += 8) pts.push([x, top(x)]);
      pts.push([1760, WORLD_H + 300], [-320, WORLD_H + 300]);
      // Feather the material at the eastern end while keeping the outline.
      paintRock(g, pts, (x) => (x >= -320 && x <= 1760 ? top(x) : NaN), detail * 0.7, 1640);
    });
    rock(2080, 2500, (g) => rockPatch(g, 2080, 2500, 60, detail));
    rock(3020, 3290, (g) => rockPatch(g, 3020, 3290, 45, detail));
    rock(4580, 4990, (g) => rockPatch(g, 4580, 4990, 60, detail, this.art?.materials.limestone));
    rock(4950, 5810, (g) => rockPatch(g, 4950, 5810, 700, detail * 0.8, this.art?.materials.grotto));
    rock(6370, 7100, (g) => rockPatch(g, 6370, 7100, 900, detail * 0.8, this.art?.materials.grotto));
    rock(8280, 10400, (g) => rockPatch(g, 8280, 10400, 1300, detail * 0.8, this.art?.materials.grotto));
    rock(5690, 6880, (g) => paintRock(g, LEDGE, ledgeTop, detail, undefined, this.art?.materials.grotto));
    rock(5300, 6560, (g) => {
      for (let i = 0; i < 14; i++) {
        const x = R(5300, 6550);
        const y = gy(x);
        const r = R(14, 40);
        const pts: [number, number][] = [];
        for (let k = 0; k < 12; k++) {
          const a = Math.PI + (k / 11) * Math.PI;
          pts.push([x + Math.cos(a) * r * R(0.85, 1.15), y + 8 + Math.sin(a) * r * R(0.6, 0.9)]);
        }
        paintRock(g, pts, () => y - r * 0.7, 0.4);
      }
    });
    rock(CAVE.x0 - 60, CAVE.x1, (g) => {
      this.caveDark = this.over.addChild(new Graphics()) as Graphics;
      drawCave(g, this.caveDark, this.art?.materials.grotto);
    });
    this.scanPoints.cave.push({ x: CAVE.x0 + 40, y: (caveTop(CAVE.x0 + 40) + caveBottom(CAVE.x0 + 40)) / 2 });

    // Coral and fans: thick in the coral garden, a few elsewhere.
    const corals = [0xc76a83, 0xa766a7, 0xd58a52, 0xb4506a];
    const reefLayer = reef ? new Container() : null;
    if (reefLayer && reef) {
      decorLayer.addChildAt(reefLayer, 0);
      this.slices.push({ obj: reefLayer, x0: BUOY_X - 80, x1: ANCHOR_X + 80 });
      addReefSprite(reefLayer, reef.rock[0], 2110, gy(2110) + 4, 48);
      addReefSprite(reefLayer, reef.rock[1], 2740, gy(2740) + 4, 48);
    }
    const outerReefLayer = this.art?.reef.some(Boolean) ? new Container() : undefined;
    if (outerReefLayer) {
      decorLayer.addChildAt(outerReefLayer, 0);
      this.slices.push({ obj: outerReefLayer, x0: ANCHOR_X - 80, x1: 8400 });
    }
    for (let i = 0; i < Math.round(60 * detail); i++) {
      const p = rand();
      const x = p < 0.6 ? R(1750, 3580) : p < 0.72 ? R(400, 1700) : p < 0.86 ? R(5300, 6500) : R(6900, 8300);
      const deep = x > 5200 && x < 6600;
      const y = gy(x) + 4;
      // Advance the original drawing RNG even when a sprite takes over. Later
      // coral, kelp, and scanner positions depend on the same sequence.
      const authored = reefLayer && reef && x >= BUOY_X && x <= ANCHOR_X;
      const outer = x > ANCHOR_X ? this.art?.reef : undefined;
      if (rand() < 0.65) {
        const color = corals[Math.floor(rand() * corals.length)];
        const size = R(0.7, 1.3) * (deep ? 0.8 : 1);
        const texture = outer?.[1 + i % 3];
        drawCoral(authored || texture ? undefined : decorAt(x), x, y, color, size);
        if (authored) addReefSprite(reefLayer, reef.coral[i % reef.coral.length], x, y + 4, 76 * size);
        if (texture && outerReefLayer) addReefSprite(outerReefLayer, texture, x, y, 78 * size);
        this.scanPoints.coral.push({ x, y: y - 20 });
      } else {
        const size = R(0.8, 1.4);
        const texture = outer?.[0];
        drawFan(authored || texture ? undefined : decorAt(x), x, y, deep ? 0x8c5a7a : 0xb86a8e, size);
        if (authored) addReefSprite(reefLayer, reef.fan[i % reef.fan.length], x, y, 64 * size);
        if (texture && outerReefLayer) addReefSprite(outerReefLayer, texture, x, y, 68 * size);
        this.scanPoints.fan.push({ x, y: y - 25 });
      }
    }

    // Kelp: groves in the coral garden and the meadow, clumps around the channel, tall stalks in the deep.
    const tex = kelpTexture(renderer);
    const greens = [0x5a7444, 0x4c6a3e, 0x67794a, 0x445f3a, 0x6f7f4c, 0x587048];
    const addKelp = (x: number, height: number, layer: Container, tint: number, base?: number) => {
      const n = 12;
      const baseY = base ?? gy(x) + 6;
      const points = Array.from({ length: n }, (_, i) => new Point(x, baseY - (height * i) / (n - 1)));
      // Use the existing anchor to choose a texture without advancing the placement RNG.
      const forest = x >= 9880 && x <= FOREST.x1 ? this.art?.forestKelp : undefined;
      const ribbons = x >= BUOY_X && x <= ANCHOR_X ? kelp : forest;
      const painted = layer !== this.front && ribbons?.length ? ribbons[Math.floor(x) % ribbons.length] : undefined;
      const rope = new MeshRope({ texture: painted ?? tex, points, textureScale: 0 });
      rope.tint = painted ? 0xffffff : tint;
      layer.addChild(rope);
      this.kelps.push({ rope, points, baseX: x, baseY, height, phase: rand() * 10, bend: 0 });
      if (layer !== this.front) this.scanPoints.kelp.push({ x, y: baseY - height * 0.4 });
    };
    for (let i = 0; i < Math.round(56 * detail); i++) {
      const p = rand();
      const x = p < 0.45 ? R(1700, 3600) : p < 0.6 ? R(3500, 4700) : p < 0.72 ? R(5300, 6450) : p < 0.92 ? R(6900, 8300) : R(350, 1500);
      const deep = x > 5200 && x < 6500;
      const h = R(160, deep ? 520 : 380);
      addKelp(x, h, rand() < 0.55 ? kelpBack : kelpFront, greens[Math.floor(rand() * greens.length)]);
    }
    // Dark foreground kelp silhouettes, like the blurred edges in the concept art.
    const nFront = Math.round(12 * detail);
    for (let i = 0; i < nFront; i++) {
      const x = 200 + ((i + R(0.1, 0.9)) / nFront) * (FRONT_REF - 400);
      addKelp(x, R(300, 560), this.front, 0x1d3530);
    }

    // Seagrass meadow.
    for (let x = 6880; x < 8330; x += R(14, 34)) {
      if (Math.abs(x - CREVICE_X) < 30) continue;
      const g = grassClump(x, gy(x), R(0.7, 1.25) * detail ** 0.2);
      kelpFront.addChild(g);
      this.grass.push({ g, phase: rand() * 6, x });
      if (rand() < 0.15) this.scanPoints.grass.push({ x, y: gy(x) - 25 });
    }
    // A few tufts on the Kestrel site and in the channel too.
    for (let i = 0; i < 26; i++) {
      const x = rand() < 0.5 ? R(500, 1650) : R(3600, 4600);
      const g = grassClump(x, gy(x), R(0.5, 0.8));
      kelpFront.addChild(g);
      this.grass.push({ g, phase: rand() * 6, x });
    }

    // Kestrel site marker and buoy.
    drawSiteMarker(decorAt(BUOY_X), BUOY_X);
    drawBuoy(this.buoy);
    this.buoy.position.set(BUOY_X + 2, 4);
    this.view.addChild(this.buoy);
    this.scanPoints.buoy.push({ x: BUOY_X, y: gy(BUOY_X) - 20 });

    // Survey sled wreck in the channel and the old anchor in the coral garden.
    this.view.addChild(drawSled(decorAt(SLED_X), SLED_X));
    this.scanPoints.sled.push({ x: SLED_X - 20, y: gy(SLED_X) - 40 });
    this.buildRecorder(decorAt(RECORDER_X));
    drawAnchor(decorAt(ANCHOR_X), ANCHOR_X);
    this.scanPoints.anchor.push({ x: ANCHOR_X, y: gy(ANCHOR_X) - 40 });

    // The survey beacon at the top of the drop-off.
    const bx = BEACON_X;
    const { lampX, lampY } = drawBeacon(decorAt(bx), bx, gy(bx) + 4);
    this.scanPoints.beacon.push({ x: bx, y: gy(bx) - 70 });
    this.beaconLamp.circle(0, 0, 5.5).fill({ color: 0xff5a3c });
    this.beaconLamp.circle(-1.5, -1.8, 1.8).fill({ color: 0xffd0c0 });
    this.beaconLamp.position.set(lampX, lampY);
    this.beaconGlow.circle(0, 0, 26).fill({ color: 0xff4a30 });
    this.beaconGlow.position.set(lampX, lampY);
    this.emissive.addChild(this.beaconLamp);
    this.glow.addChild(this.beaconGlow);
    this.beaconLight = { x: lampX, y: lampY, radius: 300, intensity: 0, color: [1.0, 0.32, 0.22] };
    this.lights.push(this.beaconLight);
    const label = new Text({
      text: 'KESTREL\nSURVEY 03',
      style: { fontFamily: 'Courier New, monospace', fontSize: 6, fontWeight: 'bold', fill: 0x2a2418, align: 'center', lineHeight: 6.5 },
      resolution: 6,
    });
    label.anchor.set(0.5);
    label.alpha = 0.6;
    label.position.set(bx, gy(bx) + 4 - 120 - 26 + 21);
    this.view.addChild(label);

    // Glowing anemones in the grotto: on the floor and hanging from the ceiling.
    const spots: [number, number, number][] = [
      [5870, gy(5870) + 4, -1],
      [6150, gy(6150) + 4, -1],
      [6400, gy(6400) + 4, -1],
      [6010, 0, 1],
      [6310, 0, 1],
    ];
    for (const [x, y0, dir] of spots) {
      let y = y0;
      if (dir > 0) {
        y = 700;
        for (let i = Math.floor(LEDGE.length / 2); i < LEDGE.length - 1; i++) {
          const [lx, ly] = LEDGE[i];
          if (Math.abs(lx - x) < 25) y = ly - 6;
        }
      }
      const core = new Graphics();
      const halo = new Graphics();
      const color = dir > 0 ? 0xd9f08a : 0xb8f07e;
      decorAt(x).ellipse(x, y, 13, 6).fill({ color: 0x4a3f4a });
      for (let k = 0; k < 11; k++) {
        const a = (dir < 0 ? -Math.PI / 2 : Math.PI / 2) + (k / 10 - 0.5) * 2.2;
        const l = R(16, 30);
        core
          .moveTo(0, 0)
          .quadraticCurveTo(Math.cos(a) * l * 0.5 + R(-5, 5), Math.sin(a) * l * 0.5, Math.cos(a) * l, Math.sin(a) * l)
          .stroke({ color, width: 2.2, cap: 'round', alpha: 0.95 });
        core.circle(Math.cos(a) * l, Math.sin(a) * l, 2.4).fill({ color: 0xffffe0 });
      }
      core.position.set(x, y);
      halo.circle(0, dir * -12, 34).fill({ color });
      halo.position.set(x, y);
      const crown = living ? new AnemoneCrown(x, y, dir > 0 ? 0xa1b079 : 0xb8bd84, dir) : undefined;
      if (crown) core.destroy();
      this.emissive.addChild(crown?.view ?? core);
      this.glow.addChild(halo);
      const light: PointLight = { x, y: y - dir * 18, radius: 230, intensity: 0.9, color: [0.62, 0.95, 0.45] };
      this.lights.push(light);
      this.anemones.push({ core: crown?.view ?? core, crown, halo, light, phase: rand() * 6 });
      this.scanPoints.anemone.push({ x, y: y - dir * 14 });
    }

    // ---- The Kestrel basin (milestone 5), with its own random numbers so
    // the rest of the shallows is drawn the same as before. ----
    const keep = rand;
    rand = mulberry32(WORLD_SEED ^ 0xba51);
    for (let x0 = WORLD_X0 - 60; x0 < -60; x0 += 1000) {
      const x1 = Math.min(-60, x0 + 1000);
      const g = new Graphics();
      drawGround(g, detail, x0, x1, this.art);
      groundLayer.addChildAt(g, 0);
      this.slices.push({ obj: g, x0: x0 - 80, x1: x1 + 80 });
    }
    // The west wall, with the nook part-way up.
    rock(WORLD_X0 - 60, BASIN_WEST + 80, (g) => {
      const pts: [number, number][] = [];
      for (let x = WORLD_X0 - 60; x <= BASIN_WEST + 80; x += 8) pts.push([x, gy(x)]);
      pts.push([BASIN_WEST + 80, WORLD_H + 300], [WORLD_X0 - 60, WORLD_H + 300]);
      paintRock(g, pts, (x) => (x >= WORLD_X0 - 60 && x <= BASIN_WEST + 80 ? gy(x) : NaN), detail * 0.7, undefined, this.art?.materials.shale);
    });
    // Boulders on the basin floor, mostly near the walls (the middle is for building).
    rock(-2700, 300, (g) => {
      for (const x of [-2420, -1150, -260, 130, 200]) {
        const y = gy(x);
        const r = R(18, 46);
        const pts: [number, number][] = [];
        for (let k = 0; k < 12; k++) {
          const a = Math.PI + (k / 11) * Math.PI;
          pts.push([x + Math.cos(a) * r * R(0.85, 1.2), y + 8 + Math.sin(a) * r * R(0.55, 0.85)]);
        }
        paintRock(g, pts, () => y - r * 0.6, 0.4);
      }
    });
    const decorBasin = new Graphics();
    decorLayer.addChild(decorBasin);
    this.slices.push({ obj: decorBasin, x0: WORLD_X0 - 100, x1: 600 });
    // Coral and fans on the nook ledge and along the foot of the walls.
    for (const x of [WALL_NOOK.x - 60, WALL_NOOK.x - 20, WALL_NOOK.x + 30, 160, 240, -1800]) {
      const y = gy(x) + 4;
      if (rand() < 0.6) {
        drawCoral(decorBasin, x, y, corals[Math.floor(rand() * corals.length)], R(0.6, 1.0));
        this.scanPoints.coral.push({ x, y: y - 20 });
      } else {
        drawFan(decorBasin, x, y, 0x8c5a7a, R(0.7, 1.1));
        this.scanPoints.fan.push({ x, y: y - 25 });
      }
    }
    // Tall kelp: along the shelf edge, up the cliff and at the foot of the west wall (behind the base).
    for (const x of [250, 330, 420, 470, -2000, -700]) addKelp(x, R(260, x < 0 ? 420 : 600), kelpBack, greens[Math.floor(rand() * greens.length)]);
    // Warm anemones on the basin floor: a little light down where the sun barely reaches.
    for (const x of [-3020, -1320, 60]) {
      const y = gy(x) + 4;
      const core = new Graphics();
      const halo = new Graphics();
      decorBasin.ellipse(x, y, 13, 6).fill({ color: 0x4a3f4a });
      for (let k = 0; k < 11; k++) {
        const a = -Math.PI / 2 + (k / 10 - 0.5) * 2.2;
        const l = R(16, 30);
        core
          .moveTo(0, 0)
          .quadraticCurveTo(Math.cos(a) * l * 0.5 + R(-5, 5), Math.sin(a) * l * 0.5, Math.cos(a) * l, Math.sin(a) * l)
          .stroke({ color: 0xd8e07a, width: 2.2, cap: 'round', alpha: 0.95 });
        core.circle(Math.cos(a) * l, Math.sin(a) * l, 2.4).fill({ color: 0xffffe0 });
      }
      core.position.set(x, y);
      halo.circle(0, -12, 34).fill({ color: 0xd8e07a });
      halo.position.set(x, y);
      const crown = living ? new AnemoneCrown(x, y, 0xc4b47a, -1) : undefined;
      if (crown) core.destroy();
      this.emissive.addChild(crown?.view ?? core);
      this.glow.addChild(halo);
      const light: PointLight = { x, y: y - 18, radius: 260, intensity: 0.9, color: [0.85, 0.9, 0.45] };
      this.lights.push(light);
      this.anemones.push({ core: crown?.view ?? core, crown, halo, light, phase: rand() * 6 });
      this.scanPoints.anemone.push({ x, y: y - 14 });
    }

    // ---- The kelp forest (milestone 7), with its own random numbers. ----
    rand = mulberry32(WORLD_SEED ^ 0xf0e57);
    this.buildForest(renderer, detail, rock, addKelp, kelpBack, kelpFront, decorLayer, forestOutcrop);
    this.buildKelpCaves(detail, rock, decorLayer);
    this.buildShelf(detail, rock, decorLayer, living);
    this.addPaintedLife(decorLayer, detail);
    if (seabed) {
      const strip = groundLayer.addChild(createShallowsSeabed(seabed));
      this.slices.push({ obj: strip, x0: BUOY_X, x1: ANCHOR_X });
    }
    // Milestone 10: the trench.
    this.trench = new TrenchScenery(detail, this.art, living, this.livingBases);
    this.view.addChild(this.trench.view);
    this.emissive.addChild(this.trench.emissive);
    this.glow.addChild(this.trench.glow);
    this.lights.push(...this.trench.lights);
    // Milestone 11: the sanctum.
    this.sanctum = new SanctumScenery(detail, this.art, this.livingBases);
    this.view.addChild(this.sanctum.view);
    this.emissive.addChild(this.sanctum.emissive);
    this.glow.addChild(this.sanctum.glow);
    this.lights.push(...this.sanctum.lights);
    rand = keep;
  }

  /**
   * The kelp forest beyond the east cliff: rock outcrops and the east wall
   * with the mouth of the kelp caves, giant kelp from floor to surface with
   * knotted holdfasts, bushy bladder kelp, glowing lumen moss on shaded rock,
   * and the old survey boom gate on the cliff-top shelf.
   */
  private buildForest(
    _renderer: Renderer,
    detail: number,
    rock: (x0: number, x1: number, build: (g: Graphics) => void, replacement?: Sprite) => void,
    addKelp: (x: number, height: number, layer: Container, tint: number, base?: number) => void,
    kelpBack: Container,
    kelpFront: Container,
    decorLayer: Container,
    forestOutcrop?: Texture,
  ): void {
    // Rock outcrops on the floor.
    for (const [x0, x1, th] of [
      [10850, 11450, 150],
      [12560, 13150, 180],
      [13600, 14100, 120],
    ] as const) {
      const painted = forestOutcrop && x0 === 12560
        ? new Sprite({ texture: forestOutcrop, label: 'paintedForestOutcrop', x: 12536, y: 1144 })
        : undefined;
      rock(x0, x1, (g) => rockPatch(g, x0, x1, th, detail, this.art?.materials.forest), painted);
    }
    // The east wall, with the kelp caves' mouth.
    rock(14560, 19400, (g) => {
      const pts: [number, number][] = [];
      for (let x = 14560; x <= 19400; x += 8) pts.push([x, gy(x)]);
      pts.push([19400, WORLD_H + 300], [14560, WORLD_H + 300]);
      paintRock(g, pts, (x) => (x >= 14560 && x <= 19400 ? gy(x) : NaN), detail * 0.7, undefined, this.art?.materials.cave);
      // The mouth: a dark recess in the wall that grows black further in.
      // The mouth of the kelp caves is drawn with the caves (buildKelpCaves), as one smooth opening.
    });
    this.scanPoints.kcaves.push({ x: SITE_MOUTH.x - 90, y: SITE_MOUTH.y + 10 });
    this.scanPoints.forest.push({ x: 10600, y: 700 }, { x: 12200, y: 800 }, { x: 13600, y: 700 });

    const decor = new Graphics();
    decorLayer.addChild(decor);
    this.slices.push({ obj: decor, x0: 9400, x1: 19600 });
    const decorEnd = new Graphics();
    decorLayer.addChild(decorEnd);
    this.slices.push({ obj: decorEnd, x0: 12000, x1: 19600 });
    const dg = (x: number) => (x < 12200 ? decor : decorEnd);

    // Giant kelp: from the floor all the way up to the surface, golden brown.
    const tints = [0x6a6a3a, 0x5a5e34, 0x77703e, 0x4f5530, 0x66603a];
    const holdfast = (g: Graphics, x: number) => {
      const y = gy(x) + 4;
      for (let k = 0; k < 9; k++) {
        const a = Math.PI + (k / 8) * Math.PI;
        const l = R(10, 24);
        g.moveTo(x, y - 6)
          .quadraticCurveTo(x + Math.cos(a) * l * 0.6, y - 6 + Math.sin(a) * 4, x + Math.cos(a) * l, y + R(-2, 3))
          .stroke({ color: rand() < 0.5 ? 0x5a4a2a : 0x6e5a32, width: R(2, 3.5), cap: 'round' });
      }
      g.ellipse(x, y - 4, 9, 5).fill({ color: 0x4e4026 });
      if (rand() < 0.6) g.circle(x + R(-6, 6), y - R(4, 9), R(1.5, 2.6)).fill({ color: 0xc8862e, alpha: 0.85 });
    };
    const n = Math.round(48 * detail);
    for (let i = 0; i < n; i++) {
      const x = FOREST.x0 + 60 + ((i + R(0.05, 0.95)) / n) * (FOREST.x1 - FOREST.x0 - 120);
      const front = rand() < 0.3;
      addKelp(x, gy(x) - R(-10, 70), front ? kelpFront : kelpBack, tints[Math.floor(rand() * tints.length)]);
      holdfast(dg(x), x);
      if (!front && rand() < 0.4) this.scanPoints.gkelp.push({ x, y: gy(x) - 160 });
    }
    // A few more along the foot of the east face and the west edge of the wall.
    for (const x of [9880, 9960, 10010, 14520, 14610]) {
      addKelp(x, gy(x) - R(0, 60), kelpBack, tints[Math.floor(rand() * tints.length)]);
      holdfast(dg(x), x);
    }
    // Dark foreground stalks, so the forest closes in around the diver.
    for (let i = 0; i < Math.round(9 * detail); i++) {
      const x = FOREST.x0 + ((i + R(0.1, 0.9)) / Math.round(9 * detail)) * (FOREST.x1 - FOREST.x0);
      // The foreground layer moves with parallax (see FRONT_REF in main.ts).
      addKelp(x * 1.3 - FRONT_REF * 0.15, R(900, 1250), this.front, 0x1a2a20, gy(x) + 60);
    }

    // Bladder kelp: short and bushy, with round gas floats.
    for (const x of [10180, 10460, 10760, 11620, 11980, 12340, 13310, 13480, 14280, 14460]) {
      const g = dg(x);
      const y = gy(x) + 4;
      for (let k = 0; k < 6; k++) {
        const lean = R(-14, 14);
        const h = R(30, 58);
        g.moveTo(x + R(-6, 6), y)
          .quadraticCurveTo(x + lean * 0.4, y - h * 0.6, x + lean, y - h)
          .stroke({ color: rand() < 0.5 ? 0x7a6a30 : 0x8c7a38, width: 3.2, cap: 'round' });
        for (let b = 0; b < 3; b++) {
          const t = R(0.35, 1);
          g.circle(x + lean * t * t, y - h * t, R(3, 4.6)).fill({ color: 0xa8923e });
          g.circle(x + lean * t * t - 1, y - h * t - 1.2, 1.2).fill({ color: 0xf0e0a0, alpha: 0.6 });
        }
      }
      this.scanPoints.bladder.push({ x, y: y - 30 });
    }

    // Lumen moss: glowing patches on the outcrops and the east face.
    const mossAt: [number, number][] = [];
    for (const x of [10920, 11080, 11330, 12640, 12880, 13060, 13700, 13980]) mossAt.push([x, gy(x) + 3]);
    for (const [x, y] of [
      [9860, 0],
      [14640, 0],
      [14720, 0],
    ])
      mossAt.push([x, (y || gy(x)) + 3]);
    for (const [x, y] of mossAt) {
      const g = dg(x);
      for (let k = 0; k < 10; k++) g.circle(x + R(-16, 16), y + R(-4, 3), R(3, 7)).fill({ color: rand() < 0.5 ? 0x4e6a30 : 0x6a8a3c, alpha: 0.9 });
      const core = new Graphics();
      for (let k = 0; k < 9; k++) core.circle(R(-15, 15), R(-5, 2), R(1, 2.2)).fill({ color: 0xe8f6a0 });
      core.position.set(x, y);
      const halo = new Graphics().ellipse(0, -2, 30, 14).fill({ color: 0xc8e070 });
      halo.position.set(x, y);
      this.emissive.addChild(core);
      this.glow.addChild(halo);
      const light: PointLight = { x, y: y - 14, radius: 190, intensity: 0.6, color: [0.8, 0.95, 0.45] };
      this.lights.push(light);
      this.mossGlows.push({ core, halo, light, phase: rand() * 6 });
      this.scanPoints.lumen.push({ x, y: y - 8 });
    }

    // The survey boom gate across the shelf on the cliff top, and its winch.
    const post = new Graphics();
    const px = BOOM_X - 34;
    const py = gy(px) + 4;
    post.rect(px - 7, -70, 14, py + 70).fill({ color: 0x5a4a3e });
    post.rect(px - 7, -70, 4, py + 70).fill({ color: 0xffffff, alpha: 0.1 });
    for (let y = -40; y < py - 20; y += 40) post.rect(px - 9, y, 18, 5).fill({ color: 0x3b3430 });
    post.rect(px - 7, -78, BOOM_X - px + 14, 10).fill({ color: 0x6a5546 });
    post.circle(BOOM_X, -72, 7).fill({ color: 0x3b3430 });
    post.circle(BOOM_X, -72, 3).fill({ color: 0x8a9496 });
    rustStreaks(post, px - 6, px + 6, -30, 10, 60);
    for (let i = 0; i < 14; i++) dab(post, px + R(-10, 10), py - R(0, 30), R(3, 8), R(2, 4), PAL.algae, 0.7);
    const gate = new Graphics();
    const H = SHELF.floor + 70;
    gate.rect(-13, 0, 26, H).fill({ color: 0x4a4038 });
    for (let y = 14; y < H; y += 26) gate.rect(-15, y, 30, 5).fill({ color: 0x5e4c3e });
    for (const x of [-8, 0, 8]) gate.rect(x - 1.5, 0, 3, H).fill({ color: 0x2e2622, alpha: 0.6 });
    gate.rect(-13, 0, 4, H).fill({ color: 0xffffff, alpha: 0.08 });
    rustStreaks(gate, -12, 12, 8, 16, 50);
    for (let i = 0; i < 18; i++) gate.circle(R(-12, 12), R(60, H), R(1.2, 3)).fill({ color: rand() < 0.6 ? PAL.algae : 0x7a6a30, alpha: 0.8 });
    gate.moveTo(-10, H - 2).lineTo(-14, H + 10).moveTo(10, H - 2).lineTo(14, H + 10).stroke({ color: 0x3b3430, width: 3 });
    const label = new Text({
      text: 'KS BOOM 1',
      style: { fontFamily: 'Courier New, monospace', fontSize: 6, fontWeight: 'bold', fill: 0x2a2418 },
      resolution: 6,
    });
    label.anchor.set(0.5);
    label.rotation = Math.PI / 2;
    label.position.set(0, 110);
    label.alpha = 0.55;
    this.boomGate.addChild(gate, label);
    this.boomGate.position.set(BOOM_X, -72);
    this.view.addChild(post, this.cable, this.boomGate, this.winch);
    this.scanPoints.boom.push({ x: BOOM_X - 40, y: 120 });
    this.slices.push({ obj: post, x0: BOOM_X - 300, x1: WINCH_X + 300 });
    this.setBoom(0);
  }

  /**
   * Milestone 7 part 2: the kelp caves behind the forest's east wall. The open
   * water is painted over the wall's rock as a dark cave interior; the black
   * chamber gets a darkness layer that lit brackets push back.
   */
  private addPaintedLife(layer: Container, detail: number): void {
    if (!this.art) return;
    const bands = [[3100, 4800, 1], [7100, 8150, 0], [13300, 14740, 2], [20030, 25400, 3]];
    const rng = mulberry32(WORLD_SEED ^ 0x6127);
    for (const [start, end, tile] of bands) {
      const texture = this.art.life[tile];
      if (!texture) continue;
      for (let x = start + 35; x < end; x += 110 + rng() * (detail > 0.8 ? 125 : 200)) {
        const y = gy(x);
        if (Math.abs(gy(x + 20) - gy(x - 20)) > 32) continue;
        const size = 50 + rng() * 48;
        const plant = new Sprite({ texture, label: 'paintedBenthicGrowth', alpha: 0.83 });
        plant.anchor.set(0.5, 0.9);
        plant.position.set(x, y + 2);
        plant.width = plant.height = size;
        layer.addChild(plant);
        this.grass.push({ g: plant, x, phase: rng() * Math.PI * 2 });
      }
    }
  }

  private buildKelpCaves(detail: number, rock: (x0: number, x1: number, build: (g: Graphics) => void) => void, decorLayer: Container): void {
    const encrustation = this.art?.life[7];
    if (encrustation) {
      const colonies = new Container();
      decorLayer.addChild(colonies);
      this.slices.push({ obj: colonies, x0: KC_BOUNDS.x0, x1: KC_BOUNDS.x1 });
      for (const [x, y] of [[15580, 1175], [15790, 1170], [16690, 1255], [17070, 1330], [18410, 1710]]) {
        if (caveField(x, y) < 0) addReefSprite(colonies, encrustation, x, caveFloor(x, y), 55);
      }
    }
    rock(KC_BOUNDS.x0 - 40, KC_BOUNDS.x1 + 40, (g) => {
      // One smooth shape (after milestone 7 part 2): the caves' field, cut off at the
      // seabed so the mouth meets the wall face exactly, traced with marching squares.
      const field = (x: number, y: number) => Math.max(caveField(x, y), gy(x) + 1 - y);
      const trace = (level: number, color: number, alpha: number) =>
        traceField(g, (x, y) => field(x, y) - level, KC_BOUNDS.x0, KC_BOUNDS.x1, 740, 1980, 8, color, alpha);
      // A soft dark rim just inside the rock, then the cave's back wall.
      trace(12, 0x2c3a3f, 0.6);
      trace(0, 0x151e21, 1);
      const paint = this.art?.materials.cave;
      const plate = this.art?.plates.caves;
      if (paint) traceField(g, (x, y) => field(x, y) + 2, KC_BOUNDS.x0, KC_BOUNDS.x1, 740, 1980, 8,
        materialFill(paint, 0x151e21, 0.64, 1480, 620));
      if (plate) traceField(g, (x, y) => field(x, y) + 4, 14940, 18640, 880, 1950, 12,
        materialFill(plate, 0x151e21, 0.64, 3700, 1070, 14940, 880));
      // Brushed texture on the back wall.
      for (let i = 0; i < Math.round(900 * detail); i++) {
        const x = R(KC_BOUNDS.x0, KC_BOUNDS.x1);
        const y = R(760, 1940);
        if (field(x, y) > -6) continue;
        dab(g, x, y, R(8, 24), R(5, 13), rand() < 0.5 ? 0x26343a : 0x121a1c, R(0.3, 0.5));
      }
      // Floors (silt and pebbles) and ceilings (little hanging drips of rock).
      for (let x = KC_BOUNDS.x0; x < KC_BOUNDS.x1; x += 7) {
        let was = false;
        const top = gy(x) + 4;
        for (let y = Math.max(760, top); y < 1960; y += 3) {
          const open = field(x, y) < 0;
          if (open && !was && y > top + 6 && rand() < 0.35) {
            const l = R(4, 14);
            g.poly([x - 3, y - 1, x + 3, y - 1, x + R(-1, 1), y + l]).fill({ color: 0x3a4a4e, alpha: 0.9 });
          }
          if (!open && was) {
            g.circle(x + R(-2, 2), y + R(-4, 0), R(2.5, 6)).fill({ color: rand() < 0.5 ? 0x3b4a4e : 0x55605c, alpha: 0.9 });
            if (rand() < 0.3) g.circle(x, y - R(2, 5), R(1.5, 3)).fill({ color: PAL.algae, alpha: 0.6 });
          }
          was = open;
        }
      }
      // Pillars of rock in the black chamber.
      for (const p of KC_PILLARS) {
        const pts: [number, number][] = [];
        for (let k = 0; k < 28; k++) {
          const a = (k / 28) * Math.PI * 2;
          pts.push([p.x + Math.cos(a) * p.rx * R(0.92, 1.06), p.y + Math.sin(a) * p.ry * R(0.95, 1.04)]);
        }
        paintRock(g, pts, (x) => (Math.abs(x - p.x) < p.rx ? ellTop(p, x) : NaN), 0.6, undefined, this.art?.materials.cave);
      }
      // Air pockets: trapped air filling the roof down to a waterline. Traced from the
      // caves' own shape, so the air follows the real roof (after milestone 8 part 1).
      for (const ap of AIR_POCKETS) {
        const e = ap.shape as { x: number; y: number; rx: number; ry: number };
        const x0 = e.x - e.rx - 80;
        const x1 = e.x + e.rx + 80;
        const airField = (x: number, y: number) => Math.max(field(x, y), y - ap.waterY);
        traceField(g, airField, x0, x1, ap.waterY - 260, ap.waterY + 8, 6, 0x34494d, 0.9);
        traceField(g, (x, y) => Math.max(field(x, y) + 10, y - ap.waterY + 8), x0, x1, ap.waterY - 260, ap.waterY + 8, 6, 0x45625f, 0.5);
        // The water surface, rippling, only where there is water under the air.
        let open = false;
        for (let x = x0; x < x1; x += 5) {
          const ok = field(x, ap.waterY + 3) < -2 && field(x, ap.waterY - 3) < -2;
          const y = ap.waterY + Math.sin(x * 0.21) * 1.3;
          if (ok && !open) g.moveTo(x, y);
          else if (ok) g.lineTo(x, y);
          open = ok;
        }
        g.stroke({ color: 0xc8e0d8, width: 2, alpha: 0.65 });
        // Droplets clinging to the roof.
        for (let k = 0; k < 18; k++) {
          const x = R(x0, x1);
          if (field(x, ap.waterY - 4) > -4) continue;
          let y = ap.waterY - 4;
          while (y > ap.waterY - 260 && field(x, y) < 0) y -= 3;
          g.circle(x, y + R(4, 8), R(1, 2)).fill({ color: 0xd8f0e8, alpha: 0.5 });
        }
        this.scanPoints.airpocket.push({ x: e.x, y: ap.waterY - 8 });
      }
      // The finds: a toppled relay buoy, a broken welder crate, a rope reel, and the cache.
      const floor = (k: keyof typeof KC_FINDS) => caveFloor(KC_FINDS[k].x, KC_FINDS[k].from);
      {
        const x = KC_FINDS.relaylog.x;
        const y = floor('relaylog');
        g.circle(x, y - 14, 18).fill({ color: 0xa8402e });
        g.circle(x - 5, y - 20, 6).fill({ color: 0xd07050, alpha: 0.5 });
        g.rect(x - 18, y - 16, 36, 4).fill({ color: 0xc9a24a });
        g.moveTo(x + 10, y - 28).lineTo(x + 30, y - 52).stroke({ color: 0x8a9496, width: 2 });
        g.roundRect(x - 34, y - 8, 18, 8, 2).fill({ color: 0x3b4448 });
        rustStreaks(g, x - 14, x + 14, y - 20, 4, 10);
      }
      {
        const x = KC_FINDS.weldchip.x;
        const y = floor('weldchip');
        g.roundRect(x - 26, y - 22, 52, 22, 3).fill({ color: 0x5a6466 });
        g.rect(x - 26, y - 22, 52, 5).fill({ color: 0xc9a24a });
        g.poly([x + 8, y - 22, x + 26, y - 22, x + 30, y - 36, x + 12, y - 32]).fill({ color: 0x4a5456 });
        g.circle(x - 12, y - 10, 4).fill({ color: 0x2a3234 });
        rustStreaks(g, x - 22, x + 22, y - 16, 5, 9);
      }
      {
        const x = KC_FINDS.towcoil.x;
        const y = floor('towcoil');
        g.rect(x - 30, y - 6, 60, 6).fill({ color: 0x4a4038 });
        g.rect(x - 26, y - 40, 5, 36).fill({ color: 0x5a4a3e });
        g.rect(x + 21, y - 40, 5, 36).fill({ color: 0x5a4a3e });
        g.ellipse(x, y - 24, 22, 15).fill({ color: 0xb89a5a });
        for (let k = 0; k < 7; k++) g.ellipse(x, y - 24, 22 - k * 2.4, 15 - k * 1.7).stroke({ color: 0x7a6436, width: 1, alpha: 0.7 });
        g.moveTo(x + 18, y - 14).quadraticCurveTo(x + 40, y, x + 62, y - 2).stroke({ color: 0xb89a5a, width: 2.5 });
      }
      {
        // After milestone 12: the nursery log's crate, with a warm egg stencilled on its lid.
        const x = KC_FINDS.nurserylog.x;
        const y = floor('nurserylog');
        g.roundRect(x - 22, y - 20, 44, 20, 3).fill({ color: 0x4a545a });
        g.rect(x - 22, y - 20, 44, 4).fill({ color: 0xc9a24a });
        g.ellipse(x, y - 10, 5, 6.5).fill({ color: 0xffd890 });
        g.ellipse(x - 1, y - 12, 2, 2.4).fill({ color: 0xfff4d0, alpha: 0.8 });
        rustStreaks(g, x - 18, x + 18, y - 16, 4, 8);
      }
      {
        const x = KC_FINDS.cache.x;
        const y = floor('cache');
        g.roundRect(x - 40, y - 34, 80, 34, 4).fill({ color: 0x6a5a4c });
        g.rect(x - 40, y - 34, 80, 7).fill({ color: 0x8a7a62 });
        g.rect(x - 4, y - 30, 8, 12).fill({ color: 0x2a2622 });
        for (const bx of [-30, 30]) g.circle(x + bx, y - 16, 2.5).fill({ color: 0x3b3a36 });
        g.rect(x - 40, y - 20, 80, 3).fill({ color: 0xa8402e, alpha: 0.8 });
        rustStreaks(g, x - 34, x + 34, y - 28, 8, 14);
      }
    });
    const stencil = (text: string, x: number, y: number) => {
      const t = new Text({ text, style: { fontFamily: 'monospace', fontSize: 9, fill: 0xd8d0b8, fontWeight: 'bold' } });
      t.alpha = 0.75;
      t.anchor.set(0.5);
      t.position.set(x, y);
      decorLayer.addChild(t);
      this.slices.push({ obj: t, x0: x - 300, x1: x + 300 });
    };
    stencil('KS RELAY 2', KC_FINDS.relaylog.x, caveFloor(KC_FINDS.relaylog.x, KC_FINDS.relaylog.from) - 14);
    stencil('KD WELD', KC_FINDS.weldchip.x - 4, caveFloor(KC_FINDS.weldchip.x, KC_FINDS.weldchip.from) - 11);
    stencil('SURVEY CACHE 3', KC_FINDS.cache.x, caveFloor(KC_FINDS.cache.x, KC_FINDS.cache.from) - 9);
    // A small amber status lamp on each find, so they can be found in the dark.
    for (const k of Object.keys(KC_FINDS) as (keyof typeof KC_FINDS)[]) {
      const x = KC_FINDS[k].x;
      const y = caveFloor(x, KC_FINDS[k].from) - (k === 'cache' ? 38 : k === 'towcoil' ? 44 : 30);
      const core = new Graphics().circle(0, 0, 2.5).fill({ color: 0xffc860 });
      core.position.set(x + (k === 'relaylog' ? 30 : 0), k === 'relaylog' ? y - 22 : y);
      const halo = new Graphics().circle(0, 0, 12).fill({ color: 0xffa040 });
      halo.position.copyFrom(core.position);
      this.emissive.addChild(core);
      this.glow.addChild(halo);
      const light: PointLight = { x: core.x, y: core.y, radius: 120, intensity: 0.45, color: [1, 0.75, 0.4] };
      this.lights.push(light);
      this.mossGlows.push({ core, halo, light, phase: rand() * 6 });
    }

    // Lumen moss along the way: dim warm-green lights, so the caves are dark, not black.
    for (const [x, from] of [
      [15560, 1100],
      [15960, 1100],
      [16130, 1180],
      [16420, 1210],
      [16760, 1240],
      [16980, 1320],
      [17290, 1320],
      [17200, 860],
      [17470, 1520],
      [18880, 1650],
      [19080, 1650],
    ] as [number, number][]) {
      const y = caveFloor(x, from) + 3;
      const core = new Graphics();
      for (let k = 0; k < 8; k++) core.circle(R(-12, 12), R(-4, 2), R(1, 2)).fill({ color: 0xe8f6a0 });
      core.position.set(x, y);
      const halo = new Graphics().ellipse(0, -2, 26, 12).fill({ color: 0xc8e070 });
      halo.position.set(x, y);
      this.emissive.addChild(core);
      this.glow.addChild(halo);
      const light: PointLight = { x, y: y - 14, radius: 170, intensity: 0.5, color: [0.8, 0.95, 0.45] };
      this.lights.push(light);
      this.mossGlows.push({ core, halo, light, phase: rand() * 6 });
    }

    // The kelp wall: old holdfasts and stalks grown into a solid tangle across the side passage.
    {
      const w = this.kcWall;
      const W = KELP_WALL;
      for (let i = 0; i < 70; i++) {
        // Only inside the passage, so the tangle doesn't spill over the rock.
        let x = R(W.x0 + 10, W.x1 - 10);
        for (let k = 0; k < 20 && caveField(x, (W.y0 + W.y1) / 2) > -8; k++) x = R(W.x0 + 10, W.x1 - 10);
        const y0 = R(W.y0 - 18, W.y0 + 6);
        w.moveTo(x, y0)
          .quadraticCurveTo(x + R(-12, 12), (W.y0 + W.y1) / 2, x + R(-8, 8), R(W.y1 - 6, W.y1 + 16))
          .stroke({ color: rand() < 0.5 ? 0x5a5e34 : 0x6a6a3a, width: R(4, 9), alpha: 0.95, cap: 'round' });
      }
      for (let i = 0; i < 30; i++) {
        const x = R(W.x0 + 10, W.x1 - 10);
        const y = R(W.y0, W.y1);
        if (caveField(x, y) < -4) w.circle(x, y, R(4, 9)).fill({ color: 0x4f5530, alpha: 0.9 });
      }
      // Once cut: only a few charred stubs cling to the passage walls, so the way down is clear.
      const c = this.kcWallCut;
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? 1 : -1;
        let x = (W.x0 + W.x1) / 2;
        const y = R(W.y0, W.y1);
        while (Math.abs(x - (W.x0 + W.x1) / 2) < 120 && caveField(x, y) < 0) x += side * 3;
        c.moveTo(x, y).lineTo(x - side * R(6, 12), y + R(-3, 3)).stroke({ color: 0x2e2a1e, width: R(3, 5), cap: 'round' });
      }
      c.visible = false;
      // Not in the culling slices: their visibility says whether the wall is cut.
      decorLayer.addChild(this.kcWall, this.kcWallCut);
      this.scanPoints.kwall.push({ x: (W.x0 + W.x1) / 2, y: W.y0 - 10 });
    }

    // Brackets across the black chamber, and the glow of moss set on them.
    for (const b of BRACKETS) {
      const g = new Graphics();
      g.rect(b.x - 2, b.y - 4, 4, 26).fill({ color: 0x5a6466 });
      g.roundRect(b.x - 12, b.y - 10, 24, 7, 2).fill({ color: 0x6a7476 });
      g.moveTo(b.x - 12, b.y - 10).lineTo(b.x - 16, b.y - 18).moveTo(b.x + 12, b.y - 10).lineTo(b.x + 16, b.y - 18).stroke({ color: 0x6a7476, width: 2 });
      rustStreaks(g, b.x - 10, b.x + 10, b.y - 6, 3, 8);
      decorLayer.addChild(g);
      this.slices.push({ obj: g, x0: b.x - 400, x1: b.x + 400 });
      const core = new Graphics();
      for (let k = 0; k < 10; k++) core.circle(R(-10, 10), R(-16, -10), R(1.2, 2.4)).fill({ color: 0xeaf8a8 });
      core.position.set(b.x, b.y);
      const halo = new Graphics().ellipse(0, -14, 40, 22).fill({ color: 0xc8e070 });
      halo.position.set(b.x, b.y);
      core.visible = halo.visible = false;
      this.emissive.addChild(core);
      this.glow.addChild(halo);
      const light: PointLight = { x: b.x, y: b.y - 30, radius: 340, intensity: 0, color: [0.82, 0.95, 0.5] };
      this.lights.push(light);
      this.kcBrackets.push({ core, halo, light, lit: false });
    }
    this.scanPoints.blackwater.push({ x: KC.dark.x - KC.dark.rx + 90, y: KC.dark.y });
    this.scanPoints.surge.push({ x: 16150, y: 1190 });
    // Streaks of cold water through the squeeze (they brighten while it surges).
    decorLayer.addChild(this.kcSurge);
    this.slices.push({ obj: this.kcSurge, x0: KC.squeeze.x1 - 300, x1: KC.squeeze.x2 + 300 });
    decorLayer.addChild(this.kcDark);
    this.slices.push({ obj: this.kcDark, x0: 17300, x1: 18900 });
    this.buildBlackWater();
    this.buildLightless(decorLayer);
    this.setKelpCaves([false, false, false, false], false);
  }

  /** Brackets lit (moss set on them) and whether the kelp wall is cut. Redraws the black chamber's darkness. */
  setKelpCaves(lit: boolean[], wallCut: boolean): void {
    const key = lit.map((l) => (l ? 1 : 0)).join('') + (wallCut ? 'c' : '');
    if (key === this.kcLitShown) return;
    this.kcLitShown = key;
    this.kcWall.visible = !wallCut;
    this.kcWallCut.visible = wallCut;
    this.kcBrackets.forEach((b, i) => {
      b.lit = !!lit[i];
      b.core.visible = b.halo.visible = b.lit;
      b.light.intensity = b.lit ? 1.1 : 0;
    });
    // Black water: one smooth haze of silt (built once); lit brackets thin it.
    this.kcDark.alpha = 1 - 0.16 * lit.filter(Boolean).length;
  }

  /** The black chamber's silt haze: soft layers that fade towards its edges (no strips or boxes). */
  private buildBlackWater(): void {
    const d = this.kcDark.clear();
    const e = KC.dark;
    for (let k = 0; k < 4; k++) {
      const rx = e.rx + 90 - k * 70;
      const ry = e.ry + 70 - k * 22;
      const fn = (x: number, y: number) => Math.max(caveField(x, y, false), (Math.hypot((x - e.x - 40) / rx, (y - e.y) / ry) - 1) * ry);
      traceField(d, fn, e.x - rx - 60, e.x + rx + 100, e.y - ry - 40, e.y + ry + 40, 8, 0x000000, 0.24);
    }
  }

  private relayG = new Graphics();
  private relayLights: PointLight[] = [];
  /** Milestone 7 part 2: planted air relays (a mooring, a hose and a surface float). */
  setRelays(list: { x: number; y: number }[]): void {
    if (!this.relayG.parent) this.view.addChild(this.relayG);
    const g = this.relayG.clear();
    for (const l of this.relayLights) this.lights.splice(this.lights.indexOf(l), 1);
    this.relayLights = [];
    for (const r of list) {
      const { x, y } = r;
      // Mooring block and regulator head.
      g.roundRect(x - 22, y - 16, 44, 18, 3).fill({ color: 0x5a6466 });
      g.rect(x - 22, y - 12, 44, 3).fill({ color: 0xc9a24a });
      g.roundRect(x - 9, y - 40, 18, 24, 4).fill({ color: 0x8a9496 });
      g.circle(x, y - 44, 7).fill({ color: 0xa8402e });
      rustStreaks(g, x - 18, x + 18, y - 12, 4, 8);
      // The hose up to the float, with a little slack.
      g.moveTo(x, y - 46).bezierCurveTo(x + 40, y * 0.66, x - 30, y * 0.33, x + 10, 6).stroke({ color: 0x2a2622, width: 2.5 });
      g.ellipse(x + 10, 2, 22, 10).fill({ color: 0xd8742e });
      g.rect(x - 12, 0, 44, 3).fill({ color: 0xf0e8d0, alpha: 0.8 });
      const light: PointLight = { x, y: y - 50, radius: 200, intensity: 0.7, color: [1, 0.85, 0.55] };
      this.lights.push(light);
      this.relayLights.push(light);
    }
  }

  // ---------------------------------------------------------------------------
  // Milestone 8 part 1: the wreck shelf.
  private raceG = new Graphics();
  private towG = new Graphics();
  private hatchG = new Map<string, { closed: Graphics; open: Graphics }>();
  /** The flow vane (a hinged plate on a seabed pivot) and its winch. */
  private vane = new Container();
  private vaneWinch = new Graphics();
  private vaneShown = -1;
  /** The grapple's target marker, drawn unlit so it shows in the dark. */
  private markG = new Graphics();

  private buildShelf(detail: number, rock: (x0: number, x1: number, build: (g: Graphics) => void) => void, decorLayer: Container, living: boolean): void {
    // The shelf edge: rock from the plateau down to the shelf floor.
    rock(19050, 19950, (g) => {
      const pts: [number, number][] = [];
      for (let x = 19050; x <= 19950; x += 8) pts.push([x, gy(x)]);
      pts.push([19950, gy(19950) + 60], [19800, WORLD_H + 300], [19050, WORLD_H + 300]);
      paintRock(g, pts, (x) => (x >= 19050 && x <= 19950 ? gy(x) : NaN), detail * 0.7, undefined, this.art?.materials.silt);
    });
    for (const [x0, x1, th] of [
      [20450, 20800, 70],
      [23500, 23850, 60],
      [24850, 25100, 50],
    ] as const)
      rock(x0, x1, (g) => rockPatch(g, x0, x1, th, detail, this.art?.materials.silt));
    // (Milestone 10: the old east wall is now the trench's rim, drawn by TrenchScenery.)

    const decor = new Graphics();
    decorLayer.addChild(decor);
    this.slices.push({ obj: decor, x0: 19000, x1: 23400 });
    const decor2 = new Graphics();
    decorLayer.addChild(decor2);
    this.slices.push({ obj: decor2, x0: 23200, x1: 27400 });
    const dg = (x: number) => (x < 23300 ? decor : decor2);

    if (this.art?.debris.some(Boolean)) {
      const fragments = new Container();
      decorLayer.addChildAt(fragments, decorLayer.getChildIndex(decor));
      this.slices.push({ obj: fragments, x0: 19800, x1: 27080 });
      for (const [i, x] of [20010, 20340, 20680, 20970, 21650, 22130, 22490, 23420, 23890, 24690, 25110, 26920].entries()) {
        const texture = this.art.debris[i % 4];
        if (texture && Math.abs(gy(x + 28) - gy(x - 28)) < 25) addReefSprite(fragments, texture, x, gy(x) + 2, 105 + (i % 4) * 23);
      }
    }

    // Debris on the shelf floor: rusted plates, ribs, chain and cable.
    for (let i = 0; i < Math.round(70 * detail); i++) {
      const x = R(19900, 26600);
      const y = gy(x) + 3;
      const g = dg(x);
      const k = rand();
      if (k < 0.45) {
        const w = R(14, 40);
        g.poly([x - w, y, x - w * 0.6, y - R(5, 14), x + w * 0.7, y - R(3, 10), x + w, y]).fill({ color: rand() < 0.5 ? 0x6a4a38 : 0x5a5450, alpha: 0.95 });
        rustStreaks(g, x - w * 0.6, x + w * 0.6, y - 6, 2, 6);
      } else if (k < 0.7) {
        const h = R(20, 55);
        g.moveTo(x, y).quadraticCurveTo(x + R(-10, 10), y - h * 0.6, x + R(-14, 14), y - h).stroke({ color: 0x4a3c34, width: R(3, 6), cap: 'round' });
      } else {
        for (let c = 0; c < 8; c++) g.ellipse(x + c * 7, y - 2 + Math.sin(c) * 1.5, 4, 2.6).stroke({ color: 0x5a4a3e, width: 1.6 });
      }
    }
    // Pale sea pens and tube worms: the few things that grow in the twilight.
    for (let i = 0; i < Math.round(40 * detail); i++) {
      const x = R(19900, 26600);
      const y = gy(x) + 3;
      const h = R(14, 34);
      const lean = R(-3, 3);
      if (living) {
        // Maintain the legacy random sequence so the rest of the shelf stays registered.
        for (let k = 0; k < 10; k++) rand();
        const animal = new BottomAnimal(i % 3 === 0 ? 'worm' : 'pen', x, y, h, lean);
        animal.view.visible = false;
        this.shelfAnimals.push(animal);
        decorLayer.addChild(animal.view);
      } else {
        const g = dg(x);
        g.moveTo(x, y).lineTo(x + lean, y - h).stroke({ color: 0x9a9480, width: 1.6, alpha: 0.8 });
        for (let k = 0; k < 5; k++) g.circle(x + R(-4, 4), y - h * (0.6 + k * 0.08), R(1.5, 3)).fill({ color: 0xc8b8a0, alpha: 0.6 });
      }
    }

    // Anchor rings across the race.
    for (const r of RINGS) {
      const g = dg(r.x);
      const base = gy(r.x) + 6;
      g.rect(r.x - 4, r.y + 14, 8, base - r.y - 14).fill({ color: 0x4a4440 });
      g.rect(r.x - 4, r.y + 14, 2.5, base - r.y - 14).fill({ color: 0xffffff, alpha: 0.1 });
      g.circle(r.x, r.y, 15).stroke({ color: 0x8a4a2e, width: 5 });
      g.circle(r.x, r.y, 15).stroke({ color: 0xc87a4a, width: 1.5, alpha: 0.5 });
      g.ellipse(r.x, base - 2, 16, 5).fill({ color: 0x3a3632 });
      rustStreaks(g, r.x - 4, r.x + 4, r.y + 20, 2, 18);
      for (let c = 0; c < 4; c++) g.ellipse(r.x + 6, r.y + 22 + c * 8, 2.6, 4).stroke({ color: 0x6a4a38, width: 1.4 });
      this.scanPoints.ring.push({ x: r.x, y: r.y });
    }
    this.scanPoints.race.push({ x: 20300, y: 1300 }, { x: 21300, y: 1350 });
    this.scanPoints.wshelf.push({ x: 22200, y: 1400 }, { x: 24000, y: 1350 });

    // Lurker dens: dark holes under a rusted plate or a rock lip.
    for (const d of LURKER_DENS) {
      const g = dg(d.x);
      const y = gy(d.x) - 22;
      g.ellipse(d.x, y, 30, 20).fill({ color: 0x0a0e10 });
      g.ellipse(d.x + d.dir * 6, y + 2, 20, 13).fill({ color: 0x000000 });
      g.poly([d.x - 52, y - 16, d.x + 54, y - 22, d.x + 48, y - 34, d.x - 46, y - 30]).fill({ color: 0x5a4a40 });
      rustStreaks(g, d.x - 40, d.x + 40, y - 26, 5, 14);
    }

    // The two small sealed wrecks and the great wreck of the Corvina.
    this.drawTrawler(dg(WRECKS[0].x0), WRECKS[0]);
    this.drawBarge(dg(WRECKS[1].x0), WRECKS[1]);
    this.drawCorvina(decor2, this.livingBases);
    for (const w of WRECKS) {
      const x = w.hatchX;
      const y = gy(x) - 70;
      const closed = new Graphics();
      closed.circle(x, y, 24).fill({ color: 0x5a5450 });
      closed.circle(x, y, 24).stroke({ color: 0x3a3430, width: 3 });
      closed.circle(x, y, 11).stroke({ color: 0xa8402e, width: 2.6 });
      closed.moveTo(x - 11, y).lineTo(x + 11, y).moveTo(x, y - 11).lineTo(x, y + 11).stroke({ color: 0xa8402e, width: 2 });
      for (let k = 0; k < 8; k++) closed.circle(x + Math.cos(k * 0.785) * 19, y + Math.sin(k * 0.785) * 19, 1.4).fill({ color: 0x2a2622 });
      rustStreaks(closed, x - 16, x + 16, y + 10, 4, 14);
      const open = new Graphics();
      open.circle(x, y, 23).fill({ color: 0x050708 });
      open.circle(x, y, 24).stroke({ color: 0x3a3430, width: 3 });
      open.poly([x + 22, y - 18, x + 46, y - 30, x + 52, y + 8, x + 26, y + 18]).fill({ color: 0x5a5450 });
      open.visible = false;
      decorLayer.addChild(closed, open);
      this.hatchG.set(w.id, { closed, open });
      this.scanPoints.wreck.push({ x, y: y - 40 });
    }

    decorLayer.addChild(this.raceG);
    this.slices.push({ obj: this.raceG, x0: RACE.x0 - 200, x1: RACE.x1 + 200 });
    this.view.addChild(this.towG);
    this.emissive.addChild(this.markG);

    // The flow vane: a long riveted plate on a pivot, lying flat until its winch raises it.
    {
      const p = new Graphics();
      const L = 420;
      p.roundRect(-L, -10, L, 20, 6).fill({ color: 0x5a524c });
      p.rect(-L, -10, L, 4).fill({ color: 0xffffff, alpha: 0.08 });
      for (let x = -L + 30; x < -10; x += 60) p.rect(x, -10, 4, 20).fill({ color: 0x3a3430 });
      for (let x = -L + 12; x < -6; x += 20) p.circle(x, 0, 1.6).fill({ color: 0x2a2622 });
      for (let x = -L + 40; x < -40; x += 90) p.rect(x, -10, 26, 3).fill({ color: 0xa8402e, alpha: 0.8 });
      rustStreaks(p, -L + 10, -20, -2, 14, 10);
      this.vane.addChild(p);
      this.vane.position.set(VANE.x, gy(VANE.x) - 8);
      const pivot = new Graphics();
      pivot.roundRect(VANE.x - 30, gy(VANE.x) - 26, 60, 30, 6).fill({ color: 0x4a4440 });
      pivot.circle(VANE.x, gy(VANE.x) - 8, 12).fill({ color: 0x6a625c });
      pivot.circle(VANE.x, gy(VANE.x) - 8, 4).fill({ color: 0x2a2622 });
      decorLayer.addChild(this.vane, pivot, this.vaneWinch);
      this.scanPoints.vane.push({ x: VANE.x - 120, y: gy(VANE.x) - 60 });
      this.setVane(0);
    }
    this.buildHidden();
    this.buildSeam();
    this.setSeam(false);
    this.buildLocker();
    this.setHidden(false);
    // Heavy salvage: a rusted winch drum, a propeller hub and an engine block, lying in the silt.
    SALVAGE.forEach((sv, i) => {
      const g = new Graphics();
      this.drawSalvage(g, 0, 0, i);
      g.position.set(sv.x, gy(sv.x) + 4);
      this.view.addChild(g);
      this.salvageG.set(sv.id, g);
      this.scanPoints.salvage.push({ x: sv.x, y: gy(sv.x) - 30 });
    });
    this.view.addChild(this.carried);
  }

  private hiddenOpen = new Graphics();
  private hiddenShut = new Graphics();
  /** Milestone 8 part 2: the hidden passage in the shelf edge, and the silt slump that hides it. */
  private buildHidden(): void {
    const o = this.hiddenOpen;
    const fn = (x: number, y: number) => Math.max(shapesField([HIDDEN.tunnel, HIDDEN.room], x, y), gy(x) + 2 - y);
    traceField(o, (x, y) => fn(x, y) - 8, 19340, 19860, 1440, 1640, 5, 0x2c3a3f, 0.7);
    traceField(o, fn, 19340, 19860, 1440, 1640, 5, 0x151e21, 1);
    const walls = this.art?.materials.silt;
    if (walls) traceField(o, fn, 19340, 19860, 1440, 1640, 5, materialFill(walls, 0x151e21, 0.58, 620, 375));
    // An old salvage locker in the hollow.
    const r = HIDDEN.room;
    o.roundRect(r.x - 30, r.y + 22, 60, 32, 4).fill({ color: 0x5a4a3e });
    o.rect(r.x - 30, r.y + 22, 60, 6).fill({ color: 0xa8402e });
    rustStreaks(o, r.x - 26, r.x + 26, r.y + 30, 5, 12);
    o.visible = false;
    // The slump: a fan of grey silt and stones over the mouth.
    const sh = this.hiddenShut;
    for (let i = 0; i < 40; i++) {
      const x = R(19700, 19830);
      const y = R(1515, 1610);
      dab(sh, x, y, R(10, 26), R(6, 14), rand() < 0.5 ? 0x6a6658 : 0x55524a, 0.7);
    }
    for (let i = 0; i < 14; i++) sh.circle(R(19700, 19830), R(1560, 1605), R(3, 7)).fill({ color: 0x4a4840 });
    this.view.addChild(o, sh);
    this.scanPoints.hidden.push({ x: 19770, y: 1560 });
  }
  // ---- After milestone 12: the drill seam under the trench rim, and the grotto behind it ----
  private seamOpenG = new Graphics();
  private seamShutG = new Graphics();
  private buildSeam(): void {
    const o = this.seamOpenG;
    const fn = (x: number, y: number) => shapesField([SEAM.tunnel, SEAM.room], x, y);
    traceField(o, (x, y) => fn(x, y) - 10, 26580, 27480, 1990, 2340, 6, 0x2a2430, 0.7);
    traceField(o, fn, 26580, 27480, 1990, 2340, 6, 0x120f18, 1);
    const walls = this.art?.materials.basalt;
    if (walls) traceField(o, fn, 26580, 27480, 1990, 2340, 6, materialFill(walls, 0x120f18, 0.68, 1050, 430));
    // Bore marks round the tunnel, and pale crystal in the grotto's walls.
    for (let i = 0; i < 12; i++) {
      const x = R(27080, 27380);
      o.moveTo(x, SEAM.y - 80).lineTo(x - 6, SEAM.y + 80).stroke({ color: 0x3a3440, width: 1.2, alpha: 0.6 });
    }
    for (let i = 0; i < 18; i++) {
      const a = R(Math.PI * 1.05, Math.PI * 1.95);
      const x = SEAM.room.x + Math.cos(a) * SEAM.room.rx * 0.92;
      const y = SEAM.room.y + Math.sin(a) * SEAM.room.ry * 0.92;
      o.poly([x, y, x + R(-4, 4), y - R(8, 16), x + R(4, 8), y]).fill({ color: 0x8a90a8, alpha: 0.7 });
    }
    o.visible = false;
    // The seam, shut: a band of pale, flaky soft rock across the wall, glinting.
    const sh = this.seamShutG;
    for (let i = 0; i < 46; i++) dab(sh, R(27330, 27420), R(2050, 2250), R(8, 20), R(5, 12), rand() < 0.5 ? 0x8a8070 : 0x9a9282, 0.8);
    for (let i = 0; i < 16; i++) sh.circle(R(27340, 27415), R(2060, 2240), R(1.2, 2.4)).fill({ color: 0xe8f0ff, alpha: 0.8 });
    for (let k = 0; k < 4; k++) sh.moveTo(27330 + k * 22, 2040).lineTo(27340 + k * 22, 2260).stroke({ color: 0x5a5448, width: 1.4, alpha: 0.6 });
    this.view.addChild(o, sh);
  }
  setSeam(open: boolean): void {
    this.seamOpenG.visible = open;
    this.seamShutG.visible = !open;
  }

  setHidden(open: boolean): void {
    this.hiddenOpen.visible = open;
    this.hiddenShut.visible = !open;
    this.lockerG.visible = open;
  }

  // ---- Milestone 9: the rusted strongbox in the hidden room (a grown tinker crab picks its lock) ----
  private lockerG = new Container();
  private lockerShut = new Graphics();
  private lockerOpenG = new Graphics();
  /** Where the strongbox sits. */
  static readonly LOCKER = { x: 19404, y: 1563 };
  private buildLocker(): void {
    const { x, y } = Scenery.LOCKER;
    const sh = this.lockerShut;
    sh.ellipse(x, y + 2, 30, 5).fill({ color: 0x2a2826, alpha: 0.6 });
    sh.roundRect(x - 24, y - 30, 48, 30, 3).fill({ color: 0x5a4434 });
    sh.rect(x - 24, y - 30, 48, 6).fill({ color: 0x6a5240 });
    for (const bx of [x - 18, x + 14]) sh.rect(bx, y - 30, 4, 30).fill({ color: 0x3e3028 });
    // The seized padlock: tiny, crusted, too fine for a cutter.
    sh.roundRect(x - 5, y - 20, 10, 9, 2).fill({ color: 0x8a6a3a });
    sh.arc(x, y - 20, 3.6, Math.PI, 0).stroke({ color: 0x8a6a3a, width: 1.6 });
    sh.circle(x, y - 15.5, 1.2).fill({ color: 0x2a2018 });
    sh.moveTo(x - 12, y - 24).quadraticCurveTo(x - 8, y - 24, x - 6, y - 19)
      .moveTo(x - 14, y - 21).quadraticCurveTo(x - 10, y - 21, x - 7, y - 17)
      .stroke({ color: 0xc2a080, width: 1.6, alpha: 0.75 });
    sh.moveTo(x + 17, y - 24).quadraticCurveTo(x + 15, y - 29, x + 22, y - 34)
      .stroke({ color: 0x728452, width: 2.4, alpha: 0.9 });
    rustStreaks(sh, x - 20, x + 20, y - 24, 5, 10);
    const op = this.lockerOpenG;
    op.ellipse(x, y + 2, 30, 5).fill({ color: 0x2a2826, alpha: 0.6 });
    op.roundRect(x - 24, y - 24, 48, 24, 3).fill({ color: 0x5a4434 });
    op.roundRect(x - 21, y - 21, 42, 16, 2).fill({ color: 0x241c16 });
    op.poly([x - 24, y - 24, x + 24, y - 24, x + 28, y - 46, x - 20, y - 50]).fill({ color: 0x6a5240 });
    op.roundRect(x + 10, y - 4, 8, 6, 1).fill({ color: 0x8a6a3a });
    this.lockerG.addChild(sh, op);
    this.view.addChild(this.lockerG);
    this.lockerG.visible = false;
    this.setLocker(false);
  }
  setLocker(open: boolean): void {
    this.lockerShut.visible = !open;
    this.lockerOpenG.visible = open;
  }

  // ---- Milestone 9: the lightless passage and grotto under the kelp caves' junction ----
  private kcLightless = new Graphics();
  private buildLightless(decorLayer: Container): void {
    const d = this.kcLightless;
    // Soft layers that thicken going in from the edge, so the darkness swallows the passage gradually.
    const fn = (x: number, y: number) => (inLightless(x, y) ? Math.max(caveField(x, y, false), 70 - Math.hypot(x - LIGHTLESS_EDGE.x, y - LIGHTLESS_EDGE.y) * 0.6) : 40);
    for (let k = 0; k < 4; k++) traceField(d, (x, y) => fn(x, y) + k * 22, 16100, 17080, 1360, 1820, 8, 0x000000, 0.36);
    decorLayer.addChild(d);
    this.slices.push({ obj: d, x0: 16000, x1: 17200 });
  }
  /** How thick the lightless water looks (1: pitch black; less while a glowfin's light swims with you). */
  setLightless(alpha: number): void {
    this.kcLightless.alpha = alpha;
  }

  private salvageG = new Map<string, Graphics>();
  private carried = new Graphics();
  private carriedKind = -1;
  private drawSalvage(g: Graphics, x: number, y: number, kind: number): void {
    g.ellipse(x, y, 54, 9).fill({ color: 0x3a3632, alpha: 0.7 });
    if (kind === 0) {
      g.roundRect(x - 40, y - 46, 80, 44, 10).fill({ color: 0x5a4a3e });
      for (let k = 0; k < 5; k++) g.rect(x - 34 + k * 16, y - 46, 4, 44).fill({ color: 0x3a3430 });
      g.circle(x + 44, y - 24, 14).stroke({ color: 0x6a4a38, width: 5 });
    } else if (kind === 1) {
      g.circle(x, y - 26, 16).fill({ color: 0xa8822e });
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 - 0.4;
        g.ellipse(x + Math.cos(a) * 30, y - 26 + Math.sin(a) * 30, 24, 10).fill({ color: 0x9a7a2e });
      }
    } else {
      g.roundRect(x - 46, y - 52, 92, 50, 6).fill({ color: 0x4a4e50 });
      for (let k = 0; k < 4; k++) g.circle(x - 30 + k * 20, y - 38, 7).fill({ color: 0x2a2e30 });
      g.rect(x - 50, y - 56, 100, 6).fill({ color: 0x6a4a2e });
    }
    rustStreaks(g, x - 36, x + 36, y - 40, 6, 16);
  }
  /** Which salvage is lying on the shelf now. */
  setSalvage(taken: Record<string, number>): void {
    for (const [id, g] of this.salvageG) g.visible = !(id in taken);
  }
  /** Salvage hanging from the sub's claw (index into SALVAGE), or none. */
  setCarried(p: { x: number; y: number } | null, kind: number): void {
    if (!p) {
      this.carried.visible = false;
      return;
    }
    if (kind !== this.carriedKind) {
      this.carriedKind = kind;
      this.carried.clear();
      this.drawSalvage(this.carried, 0, 56, kind);
      this.carried.moveTo(0, 0).lineTo(0, 8).stroke({ color: 0x2a2622, width: 2 });
    }
    this.carried.visible = true;
    this.carried.position.set(p.x, p.y);
  }

  /** 0 = the vane lies flat on the seabed, 1 = raised (the top of the race goes calm). */
  setVane(t: number): void {
    if (Math.abs(t - this.vaneShown) < 0.002) return;
    this.vaneShown = t;
    this.vane.rotation = smooth(t) * 1.05;
    const w = this.vaneWinch.clear();
    const x = VANE.winchX;
    const y = gy(x) + 4;
    w.roundRect(x - 26, y - 12, 52, 12, 3).fill({ color: 0x4a4038 });
    w.rect(x - 22, y - 40, 6, 30).fill({ color: 0x5a4a3e });
    w.rect(x + 16, y - 40, 6, 30).fill({ color: 0x5a4a3e });
    w.roundRect(x - 18, y - 36, 36, 20, 6).fill({ color: 0xa88a40 });
    const a = t * 14;
    w.circle(x + 30, y - 26, 10).stroke({ color: 0xa8402e, width: 3 });
    w.moveTo(x + 30 + Math.cos(a) * 10, y - 26 + Math.sin(a) * 10).lineTo(x + 30 - Math.cos(a) * 10, y - 26 - Math.sin(a) * 10).stroke({ color: 0xa8402e, width: 2 });
    rustStreaks(w, x - 16, x + 16, y - 30, 5, 12);
    // The cable from the drum to the vane's tip.
    const L = 420;
    const ang = this.vane.rotation;
    const tx = VANE.x - Math.cos(ang) * L;
    const ty = gy(VANE.x) - 8 - Math.sin(ang) * L;
    w.moveTo(x - 2, y - 30).quadraticCurveTo((x + tx) / 2, Math.min(y, ty) - 30 * (1 - t), tx, ty).stroke({ color: 0x2a2622, width: 1.6, alpha: 0.9 });
  }

  /** Where the vane's winch is, for the Collect button. */
  static vaneWinchPoint(): { x: number; y: number } {
    return { x: VANE.winchX, y: groundY(VANE.winchX) - 26 };
  }

  /** The grapple's target: an amber ring and crosshair round the anchor, or none. */
  /** The SLED 2 recorder on the sand: a yellow canister with a cable back to the sled and an amber beacon. */
  private buildRecorder(cable: Graphics): void {
    const x = RECORDER_X;
    const y = gy(x) + 2;
    // The torn data cable, half buried, trailing back to the sled's west end.
    const sx = SLED_X - 118;
    const sy = gy(sx) - 6;
    cable.moveTo(x + 16, y - 6).quadraticCurveTo((x + sx) / 2, y + 2, sx, sy).stroke({ color: 0x1e2224, width: 2.6 });
    cable.moveTo(x + 16, y - 6).quadraticCurveTo((x + sx) / 2, y + 2, sx, sy).stroke({ color: 0x3e4448, width: 1, alpha: 0.6 });
    const g = this.recorder.addChild(new Graphics());
    // Lying on its side, tipped a little: a bright yellow flight-recorder canister.
    g.ellipse(0, 4, 26, 4).fill({ color: 0x000000, alpha: 0.25 });
    g.roundRect(-20, -18, 40, 22, 5).fill({ color: 0xe0a92a });
    g.roundRect(-20, -18, 40, 6, 3).fill({ color: 0xffffff, alpha: 0.2 });
    g.roundRect(-20, -2, 40, 6, 3).fill({ color: 0x8c6414, alpha: 0.6 });
    for (const bx of [-13, 13]) g.rect(bx - 2.5, -19, 5, 24).fill({ color: 0x2a2e30 });
    g.rect(-6, -12, 12, 7).fill({ color: 0x232524 });
    g.rect(-5, -11, 10, 1.6).fill({ color: 0xe0a92a, alpha: 0.8 });
    g.circle(19, -7, 3).fill({ color: 0x2a2e30 }); // cable gland
    for (let i = 0; i < 8; i++) g.circle(R(-18, 18), R(-16, 2), R(0.8, 1.8)).fill({ color: PAL.algae, alpha: 0.6 });
    const t = new Text({ text: 'SLED 2 · REC', style: { fontFamily: 'Courier New, monospace', fontSize: 4.5, fontWeight: 'bold', fill: 0x2a2418 }, resolution: 6 });
    t.anchor.set(0.5);
    t.position.set(0, -2.5);
    t.alpha = 0.75;
    this.recorder.addChild(t);
    this.recorder.position.set(x, y - 2);
    this.recorder.rotation = -0.08;
    this.view.addChild(this.recorder);
    const lx = x - 1;
    const ly = y - 24;
    this.recLamp.rect(-1, 3, 2, 4).fill({ color: 0x2a2e30 });
    this.recLamp.circle(0, 0, 3.4).fill({ color: 0xffb030 });
    this.recLamp.circle(-0.8, -1, 1.2).fill({ color: 0xfff0c0 });
    this.recLamp.position.set(lx, ly);
    this.recGlow.circle(0, 0, 30).fill({ color: 0xffa020 });
    this.recGlow.position.set(lx, ly);
    this.emissive.addChild(this.recLamp, this.recRing);
    this.glow.addChild(this.recGlow);
    this.recLight = { x: lx, y: ly, radius: 220, intensity: 0, color: [1.0, 0.68, 0.22] };
    this.lights.push(this.recLight);
  }
  private recorder = new Container();
  private recLamp = new Graphics();
  private recGlow = new Graphics();
  private recRing = new Graphics();
  private recLight: PointLight = { x: 0, y: 0, radius: 0, intensity: 0, color: [1, 1, 1] };

  /**
   * Show the SLED 2 recorder until it is taken. Its beacon blinks twice every
   * couple of seconds, and a slow ring pulses round it when the diver is near.
   */
  setRecorder(show: boolean, near: boolean, time: number): void {
    this.recorder.visible = this.recLamp.visible = this.recGlow.visible = show;
    this.recRing.clear();
    if (!show) {
      this.recLight.intensity = 0;
      return;
    }
    const t = time % 1.8;
    const pulse = (a: number) => (t >= a && t < a + 0.5 ? Math.exp(-(t - a) * 9) : 0);
    const lvl = 0.15 + 0.85 * Math.max(pulse(0), pulse(0.28));
    this.recLight.intensity = lvl * 1.2;
    this.recLamp.alpha = 0.4 + 0.6 * lvl;
    this.recGlow.alpha = lvl * 0.9;
    this.recGlow.scale.set(0.7 + lvl * 0.5);
    if (near) {
      const x = this.recorder.x;
      const y = this.recorder.y - 8;
      const r = 34 + ((time * 22) % 18);
      this.recRing.circle(x, y, r).stroke({ color: 0xffc860, width: 2, alpha: 0.8 * (1 - (r - 34) / 18) });
      this.recRing.circle(x, y, 32).stroke({ color: 0xffc860, width: 1.2, alpha: 0.5 });
    }
  }

  setGrappleMark(p: { x: number; y: number } | null, time: number): void {
    const g = this.markG.clear();
    if (!p) return;
    const r = 26 + Math.sin(time * 6) * 3;
    g.circle(p.x, p.y, r).stroke({ color: 0xffc860, width: 2, alpha: 0.85 });
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + time * 0.8;
      g.moveTo(p.x + Math.cos(a) * (r + 4), p.y + Math.sin(a) * (r + 4))
        .lineTo(p.x + Math.cos(a) * (r + 12), p.y + Math.sin(a) * (r + 12))
        .stroke({ color: 0xffc860, width: 2, alpha: 0.85 });
    }
  }

  private hull(g: Graphics, pts: number[], color: number, texture?: Texture): void {
    g.poly(pts).fill({ color });
    if (texture) g.poly(pts).fill(materialFill(texture, color, 0.72, 1320, 610));
    this.weatherHull(g, pts);
  }

  private weatherHull(g: Graphics, pts: number[], opacity = 1): void {
    // Plate seams and rivets along the hull.
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      minX = Math.min(minX, pts[i]);
      maxX = Math.max(maxX, pts[i]);
      minY = Math.min(minY, pts[i + 1]);
      maxY = Math.max(maxY, pts[i + 1]);
    }
    for (let i = 0; i < (maxX - minX) / 6; i++) {
      const x = R(minX + 10, maxX - 10);
      const y = R(minY + 10, maxY - 6);
      dab(g, x, y, R(8, 22), R(4, 10), rand() < 0.5 ? 0x4a3a32 : 0x7a5a44, R(0.25, 0.45) * opacity);
    }
  }

  private drawTrawler(g: Graphics, w: { x0: number; x1: number; hatchX: number }): void {
    const f = (x: number) => gy(x) + 20;
    const { x0, x1 } = w;
    // A small fishing boat, keeled over a little and half sunk in silt.
    this.hull(g, [x0, f(x0) - 150, x1 - 90, f(x1) - 160, x1, f(x1) - 210, x1 - 40, f(x1), x0 + 30, f(x0)], 0x5e4a40);
    g.rect(x0, f(x0) - 152, x1 - x0 - 80, 8).fill({ color: 0x8a3a28 });
    // Wheelhouse.
    g.roundRect(x0 + 60, f(x0) - 250, 170, 102, 6).fill({ color: 0x6a5a50 });
    for (let k = 0; k < 4; k++) g.roundRect(x0 + 74 + k * 38, f(x0) - 236, 26, 22, 3).fill({ color: 0x0e1416 });
    rustStreaks(g, x0 + 60, x0 + 230, f(x0) - 210, 8, 30);
    // A broken mast.
    g.moveTo(x0 + 320, f(x0) - 160).lineTo(x0 + 360, f(x0) - 330).stroke({ color: 0x4a3c34, width: 7 });
    g.moveTo(x0 + 352, f(x0) - 300).lineTo(x0 + 410, f(x0) - 290).stroke({ color: 0x4a3c34, width: 4 });
    for (let k = 0; k < 7; k++) g.circle(x0 + 260 + k * 40, f(x0) - 110, 7).fill({ color: 0x14191b });
    rustStreaks(g, x0 + 40, x1 - 60, f(x0) - 130, 16, 40);
  }

  private drawBarge(g: Graphics, w: { x0: number; x1: number; hatchX: number }): void {
    const f = (x: number) => gy(x) + 18;
    const { x0, x1 } = w;
    this.hull(g, [x0, f(x0) - 130, x1, f(x1) - 140, x1 - 30, f(x1), x0 + 20, f(x0)], 0x544c46);
    g.rect(x0, f(x0) - 132, x1 - x0, 7).fill({ color: 0x6a6460 });
    // A toppled deck crane and cargo boxes.
    g.moveTo(x1 - 160, f(x1) - 140).lineTo(x1 - 40, f(x1) - 300).stroke({ color: 0xa8822e, width: 8 });
    g.moveTo(x1 - 40, f(x1) - 300).lineTo(x1 + 30, f(x1) - 250).stroke({ color: 0xa8822e, width: 5 });
    for (let k = 0; k < 3; k++) g.rect(x0 + 380 + k * 62, f(x0) - 186, 56, 54).fill({ color: [0x6a4a38, 0x4a5a5a, 0x7a5a3a][k] });
    rustStreaks(g, x0 + 20, x1 - 20, f(x0) - 120, 20, 50);
  }

  private cvParts: { hatchClosed: Graphics; hatchOpen: Graphics; shown: string } | null = null;

  private drawCorvina(g: Graphics, livingBases: boolean): void {
    const { x0, x1 } = CORVINA;
    const f = (x: number) => gy(x) + 30;
    const hull = corvinaHull();
    const H = corvinaHouse();
    // A big survey ship lying on the shelf: a long dark hull, her bow raised on a rock.
    const steel = this.art?.materials.corvina;
    if (livingBases) {
      drawSurveyWreck(g, steel);
      this.weatherHull(g, hull.flat(), 0.43);
    } else {
      this.hull(g, hull.flat(), 0x4a4240, steel);
      g.rect(x0, hull[0][1] - 2, x1 - x0 - 150, 10).fill({ color: 0x7a3a2a });
      for (let k = 0; k < 18; k++) g.circle(x0 + 160 + k * 52, f(x0) - 230, 9).fill({ color: 0x0c1012 });
      g.roundRect(H.x, H.y, H.w, H.h, 8).fill({ color: 0x5a524c });
      if (steel) g.roundRect(H.x, H.y, H.w, H.h, 8).fill(materialFill(steel, 0x5a524c, 0.68, 1180, 490));
      for (let k = 0; k < 6; k++) g.roundRect(H.x + 20 + k * 58, H.y + 14, 38, 24, 4).fill({ color: 0x0c1012 });
      g.moveTo(x0 + 620, hull[0][1]).lineTo(x0 + 640, f(x0) - 640).stroke({ color: 0x3e3632, width: 9 });
      g.moveTo(x0 + 860, hull[0][1]).lineTo(x0 + 900, f(x0) - 560).stroke({ color: 0x3e3632, width: 7 });
    }
    rustStreaks(g, x0 + 40, x1 - 80, f(x0) - 260, 40, 70);
    const t = new Text({ text: 'CORVINA', style: { fontFamily: 'monospace', fontSize: 26, fill: 0xd8d0b8, fontWeight: 'bold', letterSpacing: 6 } });
    t.alpha = 0.55;
    t.anchor.set(0.5);
    t.position.set(x0 + 760, f(x0) - 180);
    this.view.addChild(t);
    this.slices.push({ obj: t, x0: x0 - 300, x1: x1 + 300 });

    // Her deck hatch (her insides are a separate dry interior, entered here).
    const add = (gr: Graphics) => {
      this.view.addChild(gr);
      return gr;
    };
    const hx = CV_HATCH.x;
    const hy = CV_HATCH.y;
    const hatchClosed = add(new Graphics().roundRect(hx - 36, hy - 6, 72, 12, 3).fill({ color: 0x5a5450 }));
    hatchClosed.circle(hx, hy, 7).stroke({ color: 0xa8402e, width: 2.4 });
    const hatchOpen = add(new Graphics().roundRect(hx - 36, hy - 4, 72, 8, 3).fill({ color: 0x0a0d0e }));
    hatchOpen.poly([hx + 36, hy - 4, hx + 44, hy - 40, hx + 52, hy - 38, hx + 44, hy]).fill({ color: 0x5a5450 });
    this.cvParts = { hatchClosed, hatchOpen, shown: '' };
    this.scanPoints.corvina.push({ x: x0 + 400, y: f(x0) - 200 });
  }

  /** The Corvina's deck hatch: cut open or not. */
  setCorvina(o: { hatch: boolean }): void {
    const c = this.cvParts;
    if (!c) return;
    const key = String(o.hatch);
    if (key === c.shown) return;
    c.shown = key;
    c.hatchClosed.visible = !o.hatch;
    c.hatchOpen.visible = o.hatch;
  }

  /** Which sealed hatches are cut open. */
  setHatches(open: string[]): void {
    for (const [id, h] of this.hatchG) {
      const o = open.includes(id);
      h.closed.visible = !o;
      h.open.visible = o;
    }
  }

  /** The grapple line from the ring to the diver, or none. */
  setTow(a: { x: number; y: number } | null, b?: { x: number; y: number }): void {
    const g = this.towG.clear();
    if (!a || !b) return;
    const sag = Math.min(40, Math.hypot(b.x - a.x, b.y - a.y) * 0.08);
    g.moveTo(a.x, a.y).quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + sag, b.x, b.y).stroke({ color: 0xd8c890, width: 2 });
  }

  /** The race: streaks of silt racing west across the shelf edge. */
  updateRace(time: number, viewX0: number, viewX1: number): void {
    const g = this.raceG.clear();
    if (viewX1 < RACE.x0 - 200 || viewX0 > RACE.x1 + 200) return;
    for (let i = 0; i < 70; i++) {
      const span = RACE.x1 - RACE.x0;
      const x = RACE.x1 - (((i * 997) % span) + time * (380 + (i % 5) * 40)) % span;
      if (x < viewX0 - 50 || x > viewX1 + 50) continue;
      const y = 300 + ((i * 613) % 1300);
      if (y > gy(x) - 10) continue;
      g.moveTo(x, y).lineTo(x + 50 + (i % 4) * 14, y + 1).stroke({ color: 0xbcd0cc, width: 1.1, alpha: 0.2 });
    }
  }

  /** Called each frame while the caves are near: the surge streaks. */
  updateKelpCaves(time: number, surge: number): void {
    const g = this.kcSurge.clear();
    if (surge < 0.05) return;
    const s = KC.squeeze;
    for (let i = 0; i < 18; i++) {
      const t = (i / 18 + time * 0.9 * (0.6 + (i % 3) * 0.2)) % 1;
      const tt = 1 - t;
      const x = s.x1 + (s.x2 - s.x1) * tt;
      const y = s.y1 + (s.y2 - s.y1) * tt + Math.sin(i * 7.3) * 26;
      g.moveTo(x, y).lineTo(x + 40 + (i % 4) * 10, y + 2).stroke({ color: 0xbcd8d4, width: 1.2, alpha: 0.25 * surge });
    }
  }

  /** Where the winch is, for the Collect button (milestone 7). */
  static winchPoint(): { x: number; y: number } {
    return { x: WINCH_X, y: groundY(WINCH_X) - 26 };
  }

  /** 0 = boom gate closed (hanging across the shelf), 1 = winched up out of the way. */
  setBoom(t: number): void {
    if (Math.abs(t - this.boomShown) < 0.002) return;
    this.boomShown = t;
    this.boomGate.rotation = -smooth(t) * 1.45;
    // Winch: a drum on a frame, with a crank wheel that turns as it winds.
    const w = this.winch.clear();
    const x = WINCH_X;
    const y = groundY(x) + 4;
    w.roundRect(x - 26, y - 12, 52, 12, 3).fill({ color: 0x4a4038 });
    w.rect(x - 22, y - 40, 6, 30).fill({ color: 0x5a4a3e });
    w.rect(x + 16, y - 40, 6, 30).fill({ color: 0x5a4a3e });
    w.roundRect(x - 18, y - 36, 36, 20, 6).fill({ color: 0xa88a40 });
    w.rect(x - 18, y - 30, 36, 3).fill({ color: 0x3b4448, alpha: 0.6 });
    for (let k = 0; k < 6; k++) w.moveTo(x - 16 + k * 6, y - 35).lineTo(x - 16 + k * 6, y - 17).stroke({ color: 0x6a5530, width: 1, alpha: 0.7 });
    const a = t * 14;
    w.circle(x + 30, y - 26, 10).stroke({ color: 0xa8402e, width: 3 });
    w.moveTo(x + 30 + Math.cos(a) * 10, y - 26 + Math.sin(a) * 10).lineTo(x + 30 - Math.cos(a) * 10, y - 26 - Math.sin(a) * 10).stroke({ color: 0xa8402e, width: 2 });
    w.moveTo(x + 22, y - 26).lineTo(x + 30, y - 26).stroke({ color: 0x3b4448, width: 3 });
    rustStreaks(w, x - 16, x + 16, y - 30, 5, 12);
    // The cable from the drum up to the gate's free end.
    const ga = this.boomGate.rotation;
    const L = SHELF.floor + 70;
    const ex = BOOM_X - Math.sin(ga) * L;
    const ey = -72 + Math.cos(ga) * L;
    this.cable.clear().moveTo(x - 2, y - 30).quadraticCurveTo((x + ex) / 2, Math.max(y - 30, ey) + 20 * (1 - t), ex, ey).stroke({ color: 0x2a2622, width: 1.6, alpha: 0.9 });
  }

  /** viewX0..viewX1 is the part of the world the camera can see. */
  update(time: number, diverX: number, diverY: number, diverVX: number, viewX0: number, viewX1: number, motion?: WaterMotion, dt = 1 / 60, diverVY = 0): void {
    for (const s of this.slices) s.obj.visible = s.x1 > viewX0 && s.x0 < viewX1;
    this.trench.update(time, viewX0, viewX1, motion, diverX, diverY);
    for (const a of this.shelfAnimals) {
      a.view.visible = a.x > viewX0 - 100 && a.x < viewX1 + 100;
      if (!a.view.visible) continue;
      const flow = motion ? motion.sample(a.x, a.y - 16, this.anemoneFlow).x / 65 : 0;
      const passing = Math.max(0, 1 - Math.hypot(a.x - diverX, a.y - diverY) / 110);
      a.update(time, flow, passing);
    }
    this.sanctum.update(time, viewX0, viewX1, diverY - 1400, diverY + 1400);

    const t = time % 2.4;
    const flash = t < 0.12 ? 1 : Math.exp(-(t - 0.12) * 3.2) * 0.85;
    const lvl = 0.12 + flash * 0.88;
    this.beaconLight.intensity = lvl * 1.4;
    this.beaconLamp.alpha = 0.35 + lvl * 0.65;
    this.beaconGlow.alpha = lvl;
    this.beaconGlow.scale.set(0.8 + lvl * 0.5);

    for (const a of this.anemones) {
      const p = 0.75 + 0.25 * Math.sin(time * 1.3 + a.phase);
      a.core.alpha = 0.7 + 0.3 * p;
      a.halo.alpha = 0.55 * p;
      a.light.intensity = 0.85 * p;
      a.core.rotation = Math.sin(time * 0.7 + a.phase) * 0.06;
      if (a.crown && a.core.x > viewX0 - 100 && a.core.x < viewX1 + 100) {
        const flow = motion ? motion.sample(a.core.x, a.core.y, this.anemoneFlow).x / 65 : 0;
        const passing = Math.max(0, 1 - Math.hypot(diverX - a.core.x, diverY - a.core.y) / 98);
        a.crown.update(time + a.phase, flow, passing);
      }
    }

    for (const m of this.mossGlows) {
      const p = 0.8 + 0.2 * Math.sin(time * 0.9 + m.phase);
      m.core.alpha = 0.6 + 0.4 * p;
      m.halo.alpha = 0.4 * p;
      m.light.intensity = 0.55 * p;
    }

    // The buoy bobs and rolls on the swell.
    this.buoy.y = 4 + Math.sin(time * 1.1) * 3;
    this.buoy.rotation = Math.sin(time * 0.9 + 1) * 0.08;

    const passing = motion ? Math.max(0, Math.min(1, (Math.hypot(diverVX, diverVY) - 18) / 92)) : 1;
    for (const g of this.grass) {
      const vis = g.x > viewX0 - 80 && g.x < viewX1 + 80;
      g.g.visible = vis;
      if (!vis) continue;
      const near = Math.abs(g.x - diverX) < 60 && diverY > groundY(g.x) - 120 ? Math.sign(g.x - diverX || 1) * 0.25 : 0;
      if (motion) {
        const flow = motion.sample(g.x, groundY(g.x) - 43, this.plantFlow);
        const bend = Math.max(-0.54, Math.min(0.54, flow.x * 0.011 + near * passing));
        const last = g.bend ?? 0;
        g.bend = last + (bend - last) * (1 - Math.exp(-dt * 4.8));
        g.g.skew.x = g.bend + Math.sin(time * 1.6 + g.phase) * (0.063 + flow.energy * 0.045);
      } else g.g.skew.x = Math.sin(time * 1.1 + g.phase + g.x * 0.004) * 0.12 + near;
    }

    // Kelp sways in the swell, and leans away when the diver brushes past.
    for (const k of this.kelps) {
      if (k.rope.parent !== this.front) {
        const vis = k.baseX > viewX0 - 200 && k.baseX < viewX1 + 200;
        k.rope.visible = vis;
        if (!vis) continue;
      }
      const dx = k.baseX - diverX;
      const near = diverY > k.baseY - k.height - 40 && diverY < k.baseY + 20 && Math.abs(dx) < 90;
      const push = near ? Math.sign(dx || 1) * (1 - Math.abs(dx) / 90) * 60 + diverVX * 0.12 : 0;
      const flow = motion && k.rope.parent !== this.front ? motion.sample(k.baseX, Math.max(24, k.baseY - k.height * 0.39), this.plantFlow) : undefined;
      const current = flow ? Math.max(-100, Math.min(100, flow.x * 2.55)) : 0;
      k.bend += (push * (flow ? passing : 1) + current - k.bend) * (motion ? 1 - Math.exp(-dt * 3.1) : 0.06);
      const n = k.points.length;
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1);
        const sway = Math.sin(time * 0.8 + k.phase + f * 2.2) * (flow ? 14 : 26) * f
          + Math.sin(time * 1.9 + k.phase * 2 + f * 4) * 6 * f;
        const lean = k.bend * f * f;
        k.points[i].x = k.baseX + sway + lean;
        k.points[i].y = k.baseY - k.height * f + Math.abs(lean) * 0.2 * f + (flow?.y ?? 0) * f ** 3 * 0.3;
      }
    }
  }
}
