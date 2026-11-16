import { Container, Graphics, MeshRope, Point, Renderer, Text, Texture } from 'pixi.js';
import { mulberry32, WORLD_SEED } from '../rng';
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
function dab(g: Graphics, x: number, y: number, rx: number, ry: number, color: number, alpha: number): void {
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
    smooth((x - 9700) / 300) * (0.7 + 0.15 * Math.sin(x * 0.003))
  );
}

/** Sand for one slice of the world, from x0 to x1. */
function drawGround(g: Graphics, detail: number, x0: number, x1: number): void {
  const step = 10;
  g.moveTo(x0 - 2, WORLD_H + 300);
  for (let x = x0 - 2; x <= x1 + 2; x += step) g.lineTo(x, gy(x));
  g.lineTo(x1 + 2, gy(x1 + 2)).lineTo(x1 + 2, WORLD_H + 300).closePath().fill({ color: PAL.sand });

  for (let x = x0; x < x1; x += 14) {
    const t = siltAt(x + 7);
    if (t < 0.02) continue;
    g.poly([x, gy(x), x + 14.5, gy(x + 14.5), x + 14.5, WORLD_H + 300, x, WORLD_H + 300]).fill({ color: PAL.silt, alpha: t * 0.75 });
  }

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

/** Paints rock texture into an outline: shaded base, dabs, cracks, algae on top. */
function paintRock(g: Graphics, outline: [number, number][], topOf: (x: number) => number, detail: number): void {
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
  g.poly(outline.flat()).fill({ color: PAL.rock });
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
    dab(g, x, y, R(8, 30), R(5, 16), c, R(0.2, 0.4));
  }
  for (let i = 0; i < n / 25; i++) {
    let x = R(minX, maxX);
    const top = topOf(x);
    if (!isFinite(top)) continue;
    let y = top + R(15, 90);
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += R(-10, 10);
      y += R(6, 16);
      g.lineTo(x, y);
    }
    g.stroke({ color: PAL.rockShade, alpha: 0.35, width: R(0.8, 1.5) });
  }
  let started = false;
  for (let x = minX + 2; x <= maxX - 2; x += 6) {
    const top = topOf(x);
    if (!isFinite(top)) continue;
    if (!started) g.moveTo(x, top + 2.5);
    else g.lineTo(x, top + 2.5);
    started = true;
  }
  if (started) g.stroke({ color: PAL.rockLight, width: 5, alpha: 0.55, join: 'round', cap: 'round' });
  for (let x = minX + 4; x < maxX - 4; x += R(5, 12)) {
    const top = topOf(x);
    if (!isFinite(top)) continue;
    if (rand() < 0.75) {
      const c = rand() < 0.5 ? PAL.algae : PAL.algaeLight;
      g.circle(x + R(-3, 3), top + R(1, 6), R(2, 4.5)).fill({ color: c, alpha: R(0.5, 0.85) });
    }
  }
}

/** A rock patch that follows the ground line and tapers into the sand at both ends. */
function rockPatch(g: Graphics, x0: number, x1: number, thick: number, d: number): void {
  const pts: [number, number][] = [];
  for (let x = x0; x <= x1; x += 8) pts.push([x, gy(x) - 1]);
  for (let x = x1; x >= x0; x -= 16) {
    const t = (x - x0) / (x1 - x0);
    const k = Math.pow(Math.sin(Math.PI * t), 1.5);
    pts.push([x, gy(x) + 4 + thick * k + Math.sin(x * 0.05) * 6 * k]);
  }
  paintRock(g, pts, (x) => (x >= x0 && x <= x1 ? gy(x) : NaN), d);
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
function drawCave(g: Graphics, dark: Graphics): void {
  const top = (x: number) => Math.max(caveSpan(x)[0], gy(x));
  const caveBottom = (x: number) => caveSpan(x)[1];
  const pts: [number, number][] = [];
  const xs: number[] = [];
  for (let x = CAVE.x0 - 40; x <= CAVE.x1; x += 6) xs.push(x);
  for (const x of xs) pts.push([x, top(x)]);
  for (const x of [...xs].reverse()) pts.push([x, caveBottom(x)]);
  g.poly(pts.flat()).fill({ color: 0x1f2a2d });
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
function drawCoral(g: Graphics, x: number, y: number, color: number, size: number): void {
  const branch = (bx: number, by: number, angle: number, len: number, w: number, depth: number) => {
    const ex = bx + Math.cos(angle) * len;
    const ey = by + Math.sin(angle) * len;
    g.moveTo(bx, by)
      .quadraticCurveTo(bx + Math.cos(angle + 0.3) * len * 0.5, by + Math.sin(angle + 0.3) * len * 0.5, ex, ey)
      .stroke({ color, width: w, cap: 'round' });
    if (depth > 0) {
      const n = rand() < 0.5 ? 2 : 3;
      for (let i = 0; i < n; i++) branch(ex, ey, angle + R(-0.7, 0.7), len * R(0.55, 0.8), w * 0.72, depth - 1);
    } else {
      g.circle(ex, ey, w * 0.7).fill({ color: 0xffffff, alpha: 0.25 });
    }
  };
  for (let i = 0; i < 3; i++) branch(x + R(-6, 6), y + 4, -Math.PI / 2 + R(-0.6, 0.6), 22 * size, 7 * size, 3);
}

function drawFan(g: Graphics, x: number, y: number, color: number, size: number): void {
  for (let i = 0; i < 18; i++) {
    const a = -Math.PI / 2 + R(-0.9, 0.9);
    const l = R(26, 46) * size;
    g.moveTo(x, y)
      .quadraticCurveTo(x + Math.cos(a) * l * 0.4 + R(-6, 6), y + Math.sin(a) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l)
      .stroke({ color, width: 1.6 * size, alpha: 0.85, cap: 'round' });
  }
}

function rivetsRow(g: Graphics, x: number, y: number, n: number, gap: number): void {
  for (let i = 0; i < n; i++) {
    g.circle(x + i * gap, y, 1.4).fill({ color: 0x2f373a });
    g.circle(x + i * gap - 0.4, y - 0.5, 0.6).fill({ color: 0xd0d6d6, alpha: 0.7 });
  }
}

function rustStreaks(g: Graphics, x0: number, x1: number, y: number, n: number, len: number): void {
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
  | 'kcaves';

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
  };
  /** The cave's black throat (milestone 7: the dive light thins it). */
  caveDark!: Graphics;
  /** The survey boom gate on the cliff-top shelf and its winch (milestone 7). */
  private boomGate = new Container();
  private winch = new Graphics();
  private cable = new Graphics();
  private boomShown = -1;
  private mossGlows: { core: Graphics; halo: Graphics; light: PointLight; phase: number }[] = [];

  private kelps: Kelp[] = [];
  private grass: { g: Graphics; phase: number; x: number }[] = [];
  private slices: Slice[] = [];
  private buoy = new Container();
  private beaconLamp = new Graphics();
  private beaconGlow = new Graphics();
  private beaconLight!: PointLight;
  private anemones: { core: Graphics; halo: Graphics; light: PointLight; phase: number }[] = [];

  constructor(renderer: Renderer, detail: number) {
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
      drawGround(g, detail, i === 0 ? -60 : x0, i === nSlices - 1 ? WORLD_W + 60 : x1);
      groundLayer.addChild(g);
      this.slices.push({ obj: g, x0: x0 - 80, x1: x1 + 80 });
      const d = new Graphics();
      decorLayer.addChild(d);
      decor.push(d);
      this.slices.push({ obj: d, x0: x0 - 160, x1: x1 + 160 });
    }
    const decorAt = (x: number) => decor[Math.max(0, Math.min(nSlices - 1, Math.floor(x / SLICE)))];

    const rock = (x0: number, x1: number, build: (g: Graphics) => void) => {
      const g = new Graphics();
      build(g);
      groundLayer.addChild(g);
      this.slices.push({ obj: g, x0: x0 - 60, x1: x1 + 60 });
    };
    // The cliff from the shelf down into the basin, and the rock under the shelf (milestone 5).
    // Since the terraces (after milestone 6) the rock starts at the foot of the lowest ledge.
    rock(-320, 1760, (g) => {
      const pts: [number, number][] = [];
      const top = (x: number) => gy(x) + 90 * smooth((x - 360) / 60) * (1 - smooth((x - 1640) / 120));
      for (let x = -320; x <= 1760; x += 8) pts.push([x, top(x)]);
      pts.push([1760, WORLD_H + 300], [-320, WORLD_H + 300]);
      paintRock(g, pts, (x) => (x >= -320 && x <= 1760 ? top(x) : NaN), detail * 0.7);
    });
    rock(2080, 2500, (g) => rockPatch(g, 2080, 2500, 60, detail));
    rock(3020, 3290, (g) => rockPatch(g, 3020, 3290, 45, detail));
    rock(4580, 4990, (g) => rockPatch(g, 4580, 4990, 60, detail));
    rock(4950, 5810, (g) => rockPatch(g, 4950, 5810, 700, detail * 0.8));
    rock(6370, 7100, (g) => rockPatch(g, 6370, 7100, 900, detail * 0.8));
    rock(8280, 10400, (g) => rockPatch(g, 8280, 10400, 1300, detail * 0.8));
    rock(5690, 6880, (g) => paintRock(g, LEDGE, ledgeTop, detail));
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
      drawCave(g, this.caveDark);
    });
    this.scanPoints.cave.push({ x: CAVE.x0 + 40, y: (caveTop(CAVE.x0 + 40) + caveBottom(CAVE.x0 + 40)) / 2 });

    // Coral and fans: thick in the coral garden, a few elsewhere.
    const corals = [0xc76a83, 0xa766a7, 0xd58a52, 0xb4506a];
    for (let i = 0; i < Math.round(60 * detail); i++) {
      const p = rand();
      const x = p < 0.6 ? R(1750, 3580) : p < 0.72 ? R(400, 1700) : p < 0.86 ? R(5300, 6500) : R(6900, 8300);
      const deep = x > 5200 && x < 6600;
      const y = gy(x) + 4;
      const g = decorAt(x);
      if (rand() < 0.65) {
        drawCoral(g, x, y, corals[Math.floor(rand() * corals.length)], R(0.7, 1.3) * (deep ? 0.8 : 1));
        this.scanPoints.coral.push({ x, y: y - 20 });
      } else {
        drawFan(g, x, y, deep ? 0x8c5a7a : 0xb86a8e, R(0.8, 1.4));
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
      const rope = new MeshRope({ texture: tex, points, textureScale: 0 });
      rope.tint = tint;
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
      this.emissive.addChild(core);
      this.glow.addChild(halo);
      const light: PointLight = { x, y: y - dir * 18, radius: 230, intensity: 0.9, color: [0.62, 0.95, 0.45] };
      this.lights.push(light);
      this.anemones.push({ core, halo, light, phase: rand() * 6 });
      this.scanPoints.anemone.push({ x, y: y - dir * 14 });
    }

    // ---- The Kestrel basin (milestone 5), with its own random numbers so
    // the rest of the shallows is drawn the same as before. ----
    const keep = rand;
    rand = mulberry32(WORLD_SEED ^ 0xba51);
    for (let x0 = WORLD_X0 - 60; x0 < -60; x0 += 1000) {
      const x1 = Math.min(-60, x0 + 1000);
      const g = new Graphics();
      drawGround(g, detail, x0, x1);
      groundLayer.addChildAt(g, 0);
      this.slices.push({ obj: g, x0: x0 - 80, x1: x1 + 80 });
    }
    // The west wall, with the nook part-way up.
    rock(WORLD_X0 - 60, BASIN_WEST + 80, (g) => {
      const pts: [number, number][] = [];
      for (let x = WORLD_X0 - 60; x <= BASIN_WEST + 80; x += 8) pts.push([x, gy(x)]);
      pts.push([BASIN_WEST + 80, WORLD_H + 300], [WORLD_X0 - 60, WORLD_H + 300]);
      paintRock(g, pts, (x) => (x >= WORLD_X0 - 60 && x <= BASIN_WEST + 80 ? gy(x) : NaN), detail * 0.7);
    });
    // Boulders on the basin floor, mostly near the walls (the middle is for building).
    rock(-5000, 300, (g) => {
      for (const x of [-4880, -4620, -3950, -2420, -1150, -260, 130, 200]) {
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
    for (const x of [WALL_NOOK.x - 60, WALL_NOOK.x - 20, WALL_NOOK.x + 30, -4930, -4800, 160, 240, -3100, -1800]) {
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
    for (const x of [250, 330, 420, 470, -4950, -4870, -4760, -3500, -2000, -700]) addKelp(x, R(260, x < 0 && x > -4700 ? 420 : 600), kelpBack, greens[Math.floor(rand() * greens.length)]);
    // Warm anemones on the basin floor: a little light down where the sun barely reaches.
    for (const x of [-4720, -3020, -1320, 60]) {
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
      this.emissive.addChild(core);
      this.glow.addChild(halo);
      const light: PointLight = { x, y: y - 18, radius: 260, intensity: 0.9, color: [0.85, 0.9, 0.45] };
      this.lights.push(light);
      this.anemones.push({ core, halo, light, phase: rand() * 6 });
      this.scanPoints.anemone.push({ x, y: y - 14 });
    }

    // ---- The kelp forest (milestone 7), with its own random numbers. ----
    rand = mulberry32(WORLD_SEED ^ 0xf0e57);
    this.buildForest(renderer, detail, rock, addKelp, kelpBack, kelpFront, decorLayer);
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
    rock: (x0: number, x1: number, build: (g: Graphics) => void) => void,
    addKelp: (x: number, height: number, layer: Container, tint: number, base?: number) => void,
    kelpBack: Container,
    kelpFront: Container,
    decorLayer: Container,
  ): void {
    // Rock outcrops on the floor.
    for (const [x0, x1, th] of [
      [10850, 11450, 150],
      [12560, 13150, 180],
      [13600, 14100, 120],
    ] as const)
      rock(x0, x1, (g) => rockPatch(g, x0, x1, th, detail));
    // The east wall, with the kelp caves' mouth.
    rock(14560, WORLD_W + 60, (g) => {
      const pts: [number, number][] = [];
      for (let x = 14560; x <= WORLD_W + 60; x += 8) pts.push([x, gy(x)]);
      pts.push([WORLD_W + 60, WORLD_H + 300], [14560, WORLD_H + 300]);
      paintRock(g, pts, (x) => (x >= 14560 && x <= WORLD_W + 60 ? gy(x) : NaN), detail * 0.7);
      // The mouth: a dark recess in the wall that grows black further in.
      const m = SITE_MOUTH;
      const top = (x: number) => Math.max(gy(x), m.y - m.ry * Math.sqrt(Math.max(0, 1 - ((x - m.x) / m.rx) ** 2)));
      const bot = (x: number) => Math.min(m.y + m.ry * 0.7, m.y + m.ry * Math.sqrt(Math.max(0, 1 - ((x - m.x) / m.rx) ** 2)));
      for (let x = m.x - m.rx; x < m.x + m.rx; x += 6) {
        const t0 = top(x);
        const b0 = bot(x);
        if (b0 <= t0) continue;
        const k = smooth((x - (m.x - m.rx * 0.6)) / (m.rx * 1.2));
        g.rect(x, t0, 6.5, b0 - t0).fill({ color: 0x141c1e });
        g.rect(x, t0, 6.5, b0 - t0).fill({ color: 0x000000, alpha: 0.25 + k * 0.7 });
      }
      for (let x = m.x - m.rx + 10; x < m.x + m.rx * 0.6; x += R(6, 14)) {
        const b0 = bot(x);
        if (b0 > top(x)) g.circle(x, b0 + R(-2, 2), R(3, 7)).fill({ color: rand() < 0.5 ? 0x3b4a4e : 0x55605c, alpha: 0.9 });
      }
    });
    this.scanPoints.kcaves.push({ x: SITE_MOUTH.x - 90, y: SITE_MOUTH.y + 10 });
    this.scanPoints.forest.push({ x: 10600, y: 700 }, { x: 12200, y: 800 }, { x: 13600, y: 700 });

    const decor = new Graphics();
    decorLayer.addChild(decor);
    this.slices.push({ obj: decor, x0: 9400, x1: WORLD_W + 100 });
    const decorEnd = new Graphics();
    decorLayer.addChild(decorEnd);
    this.slices.push({ obj: decorEnd, x0: 12000, x1: WORLD_W + 100 });
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
  update(time: number, diverX: number, diverY: number, diverVX: number, viewX0: number, viewX1: number): void {
    for (const s of this.slices) s.obj.visible = s.x1 > viewX0 && s.x0 < viewX1;

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

    for (const g of this.grass) {
      const vis = g.x > viewX0 - 80 && g.x < viewX1 + 80;
      g.g.visible = vis;
      if (!vis) continue;
      const near = Math.abs(g.x - diverX) < 60 && diverY > groundY(g.x) - 120 ? Math.sign(g.x - diverX || 1) * 0.25 : 0;
      g.g.skew.x = Math.sin(time * 1.1 + g.phase + g.x * 0.004) * 0.12 + near;
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
      k.bend += (push - k.bend) * 0.06;
      const n = k.points.length;
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1);
        const sway = Math.sin(time * 0.8 + k.phase + f * 2.2) * 26 * f + Math.sin(time * 1.9 + k.phase * 2 + f * 4) * 6 * f;
        const lean = k.bend * f * f;
        k.points[i].x = k.baseX + sway + lean;
        k.points[i].y = k.baseY - k.height * f + Math.abs(lean) * 0.2 * f;
      }
    }
  }
}
