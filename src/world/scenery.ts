import { Container, Graphics, MeshRope, Point, Renderer, Text, Texture } from 'pixi.js';
import { mulberry32, WORLD_SEED } from '../rng';
import { groundY, LEDGE, WORLD_H, WORLD_W } from './terrain';

/**
 * Everything solid in the test scene: painted sand and rock, the rock ledge,
 * kelp, coral, a weathered survey beacon and glowing anemones in the grotto.
 *
 * "Painterly" here means many soft, semi-transparent brush dabs layered over
 * a flat base colour, so surfaces have the uneven, hand-made texture of the
 * concept art instead of looking like flat vector shapes.
 */

const rand = mulberry32(WORLD_SEED ^ 0x5ce9);
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

function drawGround(g: Graphics, detail: number): void {
  const step = 10;
  g.moveTo(-60, WORLD_H + 300);
  for (let x = -60; x <= WORLD_W + 60; x += step) g.lineTo(x, groundY(Math.max(0, Math.min(WORLD_W, x))));
  g.lineTo(WORLD_W + 60, WORLD_H + 300).closePath().fill({ color: PAL.sand });

  // Deeper floor turns to grey silt; colour fades in over the drop-off.
  const gy = (x: number) => groundY(Math.min(WORLD_W, x));
  for (let x = 1500; x <= WORLD_W + 60; x += 14) {
    const t = Math.min(1, (x - 1500) / 700);
    g.poly([x, gy(x), x + 14.5, gy(x + 14.5), x + 14.5, WORLD_H + 300, x, WORLD_H + 300]).fill({
      color: PAL.silt,
      alpha: t * 0.75,
    });
  }

  // Sand texture: dabs, ripples and pebbles.
  const n = Math.round(900 * detail);
  for (let i = 0; i < n; i++) {
    const x = R(-40, WORLD_W + 40);
    const top = groundY(Math.max(0, Math.min(WORLD_W, x)));
    const y = top + Math.pow(rand(), 1.6) * 160 + 6;
    const light = rand() < 0.45;
    dab(g, x, y, R(10, 36), R(3, 8), light ? PAL.sandLight : PAL.sandShade, R(0.18, 0.35));
  }
  for (let i = 0; i < 260 * detail; i++) {
    const x = R(0, WORLD_W);
    const top = groundY(x);
    const y = top + R(8, 70);
    const w = R(8, 22);
    g.moveTo(x - w, y)
      .quadraticCurveTo(x, y - R(2, 4), x + w, y)
      .stroke({ color: PAL.sandShade, alpha: R(0.25, 0.5), width: R(1, 2) });
  }
  for (let i = 0; i < 220 * detail; i++) {
    const x = R(0, WORLD_W);
    const y = groundY(x) + R(3, 50);
    const r = R(1.5, 5);
    g.ellipse(x, y, r * 1.3, r).fill({ color: rand() < 0.5 ? 0x8b8573 : 0x5c5a50, alpha: 0.8 });
    g.ellipse(x - r * 0.3, y - r * 0.4, r * 0.5, r * 0.3).fill({ color: 0xffffff, alpha: 0.18 });
  }
  // Soft darker band lower down, like the concept art's shaded sand.
  g.moveTo(-60, WORLD_H + 300);
  for (let x = -60; x <= WORLD_W + 60; x += 30)
    g.lineTo(x, groundY(Math.max(0, Math.min(WORLD_W, x))) + 70 + Math.sin(x * 0.01) * 14);
  g.lineTo(WORLD_W + 60, WORLD_H + 300).closePath().fill({ color: PAL.sandShade, alpha: 0.35 });
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
  const area = ((maxX - minX) * (maxY - minY)) / 1000;
  const n = Math.round(Math.min(1400, area * 1.1) * detail);
  for (let i = 0; i < n; i++) {
    const x = R(minX, maxX);
    const top = topOf(x);
    if (!isFinite(top)) continue;
    const y = R(Math.max(minY, top), maxY);
    if (y < top + 2) continue;
    if (!inside(x, y, outline)) continue;
    const depthIn = (y - top) / 120;
    const c = depthIn < 0.4 && rand() < 0.35 ? PAL.rockLight : rand() < 0.5 ? PAL.rockShade : PAL.rock;
    dab(g, x, y, R(8, 30), R(5, 16), c, R(0.2, 0.4));
  }
  // Cracks.
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
  // Light rim and algae along the top edge, following the outline.
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

function drawRocks(g: Graphics, detail: number): void {
  // Rock patches follow the ground line and taper to a point at both ends,
  // so they blend into the sand instead of ending in a straight edge.
  const patch = (x0: number, x1: number, thick: number, d: number) => {
    const pts: [number, number][] = [];
    for (let x = x0; x <= x1; x += 8) pts.push([x, groundY(Math.min(WORLD_W, x)) - 1]);
    for (let x = x1; x >= x0; x -= 16) {
      const t = (x - x0) / (x1 - x0);
      const k = Math.pow(Math.sin(Math.PI * t), 1.5);
      pts.push([x, groundY(Math.min(WORLD_W, x)) + 4 + thick * k + Math.sin(x * 0.05) * 6 * k]);
    }
    paintRock(g, pts, (x) => (x >= x0 && x <= x1 ? groundY(Math.min(WORLD_W, x)) : NaN), d);
  };
  patch(840, 1250, 60, detail); // the outcrop in the shallows
  patch(1700, 2560, 700, detail * 0.8); // the drop-off face
  patch(3120, WORLD_W + 200, 900, detail * 0.8); // the far wall

  // The ledge over the grotto.
  const top = (x: number) => {
    for (let i = 0; i < LEDGE.length - 1; i++) {
      const [x0, y0] = LEDGE[i];
      const [x1, y1] = LEDGE[i + 1];
      if (x1 < x0) break; // reached the underside
      if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
    return NaN;
  };
  paintRock(g, LEDGE, top, detail);
  // Boulders scattered on the deep floor.
  for (let i = 0; i < 14; i++) {
    const x = R(2050, 3300);
    const y = groundY(x);
    const r = R(14, 40);
    const pts: [number, number][] = [];
    for (let k = 0; k < 12; k++) {
      const a = Math.PI + (k / 11) * Math.PI;
      pts.push([x + Math.cos(a) * r * R(0.85, 1.15), y + 8 + Math.sin(a) * r * R(0.6, 0.9)]);
    }
    paintRock(g, pts, () => y - r * 0.7, 0.4);
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

/** The survey beacon on the edge of the drop-off: weathered steel with a red lamp. */
function drawBeacon(g: Graphics, x: number, y: number): { lampX: number; lampY: number } {
  const h = 120;
  // Cable snaking off into the sand.
  g.moveTo(x + 4, y + 2)
    .bezierCurveTo(x - 30, y + 14, x - 70, y + 4, x - 120, y + 18)
    .stroke({ color: 0x222628, width: 3.5 });
  // Weighted base plate.
  g.roundRect(x - 28, y - 10, 56, 16, 4).fill({ color: 0x5b6467 });
  g.roundRect(x - 28, y - 10, 56, 4, 2).fill({ color: 0xffffff, alpha: 0.12 });
  rivetsRow(g, x - 22, y - 2, 4, 15);
  // Mast.
  g.rect(x - 4, y - h, 8, h - 8).fill({ color: 0x6b7478 });
  g.rect(x - 4, y - h, 3, h - 8).fill({ color: 0xffffff, alpha: 0.12 });
  for (let k = 0; k < 4; k++) g.rect(x - 5, y - h + 20 + k * 22, 10, 3).fill({ color: 0x3b4448 });
  // Rust running down the mast.
  for (let i = 0; i < 6; i++) {
    const sx = x - 3 + rand() * 6;
    const sy = y - h + 14 + rand() * 60;
    g.moveTo(sx, sy).lineTo(sx + R(-1, 1), sy + R(10, 30)).stroke({ color: 0x8a3a20, width: R(0.8, 1.6), alpha: 0.6 });
  }
  // Yellow instrument housing.
  const hy = y - h - 26;
  g.roundRect(x - 20, hy, 40, 30, 5).fill({ color: 0xc29b45 });
  g.roundRect(x - 20, hy + 18, 40, 12, 4).fill({ color: 0x8c6f31, alpha: 0.7 });
  g.rect(x - 20, hy + 10, 40, 4).fill({ color: 0x3b4448 });
  rivetsRow(g, x - 15, hy + 4, 4, 10);
  rivetsRow(g, x - 15, hy + 25, 4, 10);
  for (let i = 0; i < 5; i++) {
    const sx = x - 18 + rand() * 36;
    g.moveTo(sx, hy + 14).lineTo(sx + R(-1, 1), hy + 14 + R(6, 16)).stroke({ color: 0x8a3a20, width: 1.2, alpha: 0.6 });
  }
  // Algae creeping up the base.
  for (let i = 0; i < 14; i++) dab(g, x + R(-26, 26), y - R(0, 12), R(3, 8), R(2, 4), PAL.algae, 0.7);
  // Lamp cage.
  const ly = hy - 9;
  g.rect(x - 9, hy - 3, 18, 4).fill({ color: 0x3b4448 });
  g.moveTo(x - 8, hy - 2).lineTo(x - 7, ly - 7).moveTo(x + 8, hy - 2).lineTo(x + 7, ly - 7).moveTo(x - 7, ly - 7).lineTo(x + 7, ly - 7);
  g.stroke({ color: 0x3b4448, width: 1.6 });
  g.circle(x, ly, 6.5).fill({ color: 0x5a1a14 });
  return { lampX: x, lampY: ly };
}

function rivetsRow(g: Graphics, x: number, y: number, n: number, gap: number): void {
  for (let i = 0; i < n; i++) {
    g.circle(x + i * gap, y, 1.4).fill({ color: 0x2f373a });
    g.circle(x + i * gap - 0.4, y - 0.5, 0.6).fill({ color: 0xd0d6d6, alpha: 0.7 });
  }
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

export class Scenery {
  /** Lit by the scene lighting (drawn into the lit layer). */
  readonly view = new Container();
  /** Foreground plants that pass in front of the diver. */
  readonly front = new Container();
  /** Shining parts, drawn on top without lighting. */
  readonly emissive = new Container();
  /** Soft copies of the shining parts, blurred into a glow. */
  readonly glow = new Container();
  readonly lights: PointLight[] = [];

  private kelps: Kelp[] = [];
  private beaconLamp = new Graphics();
  private beaconGlow = new Graphics();
  private beaconLight!: PointLight;
  private anemones: { core: Graphics; halo: Graphics; light: PointLight; phase: number }[] = [];

  constructor(renderer: Renderer, detail: number) {
    const back = new Graphics();
    const kelpBack = new Container();
    const ground = new Graphics();
    const decor = new Graphics();
    drawGround(ground, detail);
    drawRocks(ground, detail);
    this.view.addChild(back, kelpBack, ground, decor);

    // Coral and fans in the shallows, a few on the deep floor.
    const corals = [0xc76a83, 0xa766a7, 0xd58a52, 0xb4506a];
    for (let i = 0; i < Math.round(26 * detail); i++) {
      const x = rand() < 0.75 ? R(80, 1700) : R(2100, 3200);
      const deep = x > 2000;
      const y = groundY(x) + 4;
      if (rand() < 0.65) drawCoral(decor, x, y, corals[Math.floor(rand() * corals.length)], R(0.7, 1.3) * (deep ? 0.8 : 1));
      else drawFan(decor, x, y, deep ? 0x8c5a7a : 0xb86a8e, R(0.8, 1.4));
    }

    // Kelp: a forest in the shallows, sparse clumps deeper down.
    const tex = kelpTexture(renderer);
    const greens = [0x5a7444, 0x4c6a3e, 0x67794a, 0x445f3a, 0x6f7f4c, 0x587048];
    const addKelp = (x: number, height: number, layer: Container, tint: number) => {
      const n = 12;
      const baseY = groundY(x) + 6;
      const points = Array.from({ length: n }, (_, i) => new Point(x, baseY - (height * i) / (n - 1)));
      const rope = new MeshRope({ texture: tex, points, textureScale: 0 });
      rope.tint = tint;
      // Reverse so the stalk is thicker at the base: scale the far end of the strip.
      layer.addChild(rope);
      this.kelps.push({ rope, points, baseX: x, baseY, height, phase: rand() * 10, bend: 0 });
    };
    for (let i = 0; i < Math.round(22 * detail); i++) {
      const x = rand() < 0.8 ? R(40, 1650) : R(2000, 3250);
      const deep = x > 1900;
      const h = R(160, deep ? 520 : 380);
      const back = rand() < 0.55;
      addKelp(x, h, back ? kelpBack : this.view, greens[Math.floor(rand() * greens.length)]);
    }
    // Dark foreground kelp silhouettes, like the blurred edges in the concept art.
    const nFront = Math.round(5 * detail);
    for (let i = 0; i < nFront; i++) {
      const x = 200 + ((i + R(0.1, 0.9)) / nFront) * (WORLD_W - 400);
      addKelp(x, R(300, 560), this.front, 0x1d3530);
    }

    // The survey beacon at the top of the drop-off.
    const bx = 1700;
    const { lampX, lampY } = drawBeacon(decor, bx, groundY(bx) + 4);
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
    label.position.set(bx, groundY(bx) + 4 - 120 - 26 + 21);
    this.view.addChild(label);

    // Glowing anemones in the grotto: on the floor and hanging from the ceiling.
    const spots: [number, number, number][] = [
      [2620, groundY(2620) + 4, -1],
      [2900, groundY(2900) + 4, -1],
      [3150, groundY(3150) + 4, -1],
      [2760, 0, 1],
      [3060, 0, 1],
    ];
    for (const [x, y0, dir] of spots) {
      let y = y0;
      if (dir > 0) {
        // Find the ceiling: the ledge's underside above this x.
        y = 700;
        for (let i = Math.floor(LEDGE.length / 2); i < LEDGE.length - 1; i++) {
          const [lx, ly] = LEDGE[i];
          if (Math.abs(lx - x) < 25) y = ly - 6;
        }
      }
      const core = new Graphics();
      const halo = new Graphics();
      const color = dir > 0 ? 0xd9f08a : 0xb8f07e;
      // Stalk drawn in the lit layer.
      decor.ellipse(x, y, 13, 6).fill({ color: 0x4a3f4a });
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
    }
  }

  update(time: number, diverX: number, diverY: number, diverVX: number): void {
    // Beacon: a bright flash every 2.4 seconds, with a slow afterglow.
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

    // Kelp sways in the swell, and leans away when the diver brushes past.
    for (const k of this.kelps) {
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
