import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { mulberry32 } from '../rng';
import { waterColor } from '../fx/shared';
import { BASIN_EAST, BASIN_WEST, FOREST, WRECK_SHELF, groundY, smooth } from '../world/terrain';

/**
 * Graphics session G3: zone-aware mid-ground silhouettes. The generic sine
 * ridges are the same everywhere; these give each zone its own distant
 * shapes, drawn once, fogged like the ridges and kept faint so they never
 * read as swimmable rock:
 *  - the Kestrel basin: boulders and a few natural arches,
 *  - the kelp forest: ranks of distant kelp,
 *  - the wreck shelf: hulks, masts and a crane.
 * They sit at one parallax depth, positioned so an object stands where it
 * is in the world when the camera passes it.
 */

const PARALLAX = 0.5;
const REF_DEPTH = 260;
const FOREST_PLATE_CENTER = 12360;
const FOREST_PLATE_WIDTH = 2200;
const FOREST_PILOT_START = 11020;
const FOREST_PILOT_END = 13680;
const FOREST_FADE = 420;
const forestReferenceFog = waterColor(1175);

interface Zone {
  c: Container;
  x0: number;
  x1: number;
  /** 0 = water colour, 1 = full rock colour. */
  strength: number;
  plate?: Sprite;
}

function toHex([r, g, b]: [number, number, number]): number {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return (c(r) << 16) | (c(g) << 8) | c(b);
}

/** Local coordinates for a world position at this layer's parallax. */
const lx = (wx: number) => wx * PARALLAX;
const ly = (wy: number) => REF_DEPTH + (wy - REF_DEPTH) * PARALLAX;

function boulder(g: Graphics, cx: number, base: number, w: number, h: number, rand: () => number): void {
  g.moveTo(cx - w / 2, base);
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = Math.PI * (1 - t);
    const wob = 0.85 + rand() * 0.3;
    g.lineTo(cx + Math.cos(a) * (w / 2) * wob, base - Math.sin(a) * h * wob);
  }
  g.lineTo(cx + w / 2, base).closePath().fill({ color: 0xffffff });
}

function arch(g: Graphics, cx: number, base: number, w: number, h: number): void {
  const leg = w * 0.22;
  g.moveTo(cx - w / 2, base).lineTo(cx - w / 2 + leg * 0.2, base - h * 0.55);
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * (1 - i / 14);
    g.lineTo(cx + Math.cos(a) * (w / 2 - leg * 0.2), base - h * 0.55 - Math.sin(a) * h * 0.45);
  }
  g.lineTo(cx + w / 2, base).lineTo(cx + w / 2 - leg, base);
  g.lineTo(cx + w / 2 - leg * 1.1, base - h * 0.5);
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI;
    g.lineTo(cx + Math.cos(a) * (w / 2 - leg * 1.1), base - h * 0.5 - Math.sin(a) * h * 0.32);
  }
  g.lineTo(cx - w / 2 + leg * 1.1, base).lineTo(cx - w / 2, base).closePath().fill({ color: 0xffffff });
}

function kelpStalk(g: Graphics, x: number, base: number, h: number, rand: () => number): void {
  const w = 5 + rand() * 7;
  const ph = rand() * 6.28;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const sway = Math.sin(t * 6 + ph) * (10 + 14 * t);
    const ww = w * (1 - t * 0.7) * (1 + 0.35 * Math.sin(t * 40 + ph));
    left.push([x + sway - ww, base - t * h]);
    right.push([x + sway + ww, base - t * h]);
  }
  g.moveTo(left[0][0], left[0][1]);
  for (const p of left) g.lineTo(p[0], p[1]);
  for (const p of right.reverse()) g.lineTo(p[0], p[1]);
  g.closePath().fill({ color: 0xffffff });
}

function hulk(g: Graphics, cx: number, base: number, len: number, h: number, tilt: number, rand: () => number): void {
  // A sunk ship seen from the side: sloped bow, flat deck, a bridge, a mast and a crane.
  const pts: [number, number][] = [
    [-len / 2, -h * 0.55],
    [-len * 0.38, 0],
    [len * 0.42, 0],
    [len / 2, -h * 0.7],
    [len * 0.3, -h * 0.72],
    [len * 0.28, -h * 1.25],
    [len * 0.08, -h * 1.25],
    [len * 0.06, -h * 0.75],
    [-len * 0.4, -h * 0.72],
  ];
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  const tp = (p: [number, number]): [number, number] => [cx + p[0] * c - p[1] * s, base + p[0] * s + p[1] * c];
  const hull = pts.map(tp);
  g.moveTo(hull[0][0], hull[0][1]);
  for (const p of hull) g.lineTo(p[0], p[1]);
  g.closePath().fill({ color: 0xffffff });
  // Mast with a crossbar, and a crane jib.
  const m0 = tp([-len * 0.12, -h * 0.72]);
  const m1 = tp([-len * 0.14, -h * (2.1 + rand() * 0.5)]);
  g.moveTo(m0[0] - 4, m0[1]).lineTo(m1[0] - 2, m1[1]).lineTo(m1[0] + 2, m1[1]).lineTo(m0[0] + 4, m0[1]).closePath().fill({ color: 0xffffff });
  const cb = tp([-len * 0.14 - 50, -h * 1.75]);
  const ce = tp([-len * 0.14 + 50, -h * 1.75]);
  g.moveTo(cb[0], cb[1] - 3).lineTo(ce[0], ce[1] - 3).lineTo(ce[0], ce[1] + 3).lineTo(cb[0], cb[1] + 3).closePath().fill({ color: 0xffffff });
  const j0 = tp([-len * 0.34, -h * 0.72]);
  const j1 = tp([-len * 0.2, -h * 1.5]);
  g.moveTo(j0[0] - 4, j0[1]).lineTo(j1[0] - 2, j1[1]).lineTo(j1[0] + 3, j1[1]).lineTo(j0[0] + 5, j0[1]).closePath().fill({ color: 0xffffff });
}

export class ZoneBackdrop {
  readonly view = new Container();
  private zones: Zone[] = [];

  constructor(private readonly forestMidground?: Texture) {}

  build(): void {
    this.view.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.zones = [];
    const rand = mulberry32(4242);
    const mk = (x0: number, x1: number, strength: number, draw: (g: Graphics) => void) => {
      const c = new Container();
      const g = new Graphics();
      draw(g);
      c.addChild(g);
      c.visible = false;
      this.view.addChild(c);
      const zone: Zone = { c, x0, x1, strength };
      this.zones.push(zone);
      return zone;
    };
    // The basin: boulders now and then, an arch every so often.
    mk(BASIN_WEST, BASIN_EAST, 0.34, (g) => {
      for (let x = BASIN_WEST + 200; x < BASIN_EAST - 150; x += 260 + rand() * 520) {
        const base = groundY(x) + 40;
        if (rand() < 0.28) arch(g, lx(x), ly(base), 520 + rand() * 360, 380 + rand() * 260);
        else boulder(g, lx(x), ly(base), 220 + rand() * 340, 120 + rand() * 200, rand);
      }
    });
    // The kelp forest: ranks of distant kelp from the floor towards the surface.
    const forest = mk(FOREST.x0, FOREST.x1, 0.3, (g) => {
      for (let x = FOREST.x0 - 200; x < FOREST.x1 + 200; x += 70 + rand() * 90) {
        const base = groundY(Math.min(FOREST.x1, Math.max(FOREST.x0, x))) + 30;
        kelpStalk(g, lx(x), ly(base), (base - 60) * PARALLAX * (0.55 + rand() * 0.4) / PARALLAX, rand);
      }
    });
    if (this.forestMidground) {
      const plate = new Sprite({ texture: this.forestMidground, label: 'paintedForestMidground' });
      plate.anchor.x = 0.5;
      plate.position.set(lx(FOREST_PLATE_CENTER), ly(140));
      plate.width = FOREST_PLATE_WIDTH;
      plate.height = FOREST_PLATE_WIDTH / 2;
      forest.plate = plate;
      forest.c.addChild(plate);
    }
    // The wreck shelf: hulks, masts and a crane, half sunk in the silt.
    mk(WRECK_SHELF.x0, WRECK_SHELF.x1 + 200, 0.4, (g) => {
      for (let x = WRECK_SHELF.x0 + 300; x < WRECK_SHELF.x1; x += 900 + rand() * 1100) {
        const base = groundY(x) + 70;
        hulk(g, lx(x), ly(base), 640 + rand() * 420, 120 + rand() * 80, (rand() - 0.5) * 0.28, rand);
      }
    });
  }

  /** Camera centre in world units, zoom = CSS px per world unit. */
  update(camCX: number, camCY: number, zoom: number, cssW: number, cssH: number): void {
    const ox = camCX * PARALLAX;
    const oy = REF_DEPTH + (camCY - REF_DEPTH) * PARALLAX;
    const fog = waterColor(camCY + 80);
    for (const z of this.zones) {
      const near = camCX > z.x0 - 1800 && camCX < z.x1 + 1800;
      z.c.visible = near;
      if (!near) continue;
      z.c.scale.set(zoom);
      z.c.position.set(cssW / 2 - ox * zoom, cssH / 2 - oy * zoom);
      const k = z.strength;
      // Darker than the water at this depth, so they read as shapes in the murk, but never solid.
      const c: [number, number, number] = [fog[0] * (1 - k * 0.8), fog[1] * (1 - k * 0.72), fog[2] * (1 - k * 0.55)];
      const g = z.c.children[0] as Graphics;
      g.tint = toHex(c);
      if (z.plate) {
        const edge = Math.min(camCX - FOREST_PILOT_START, FOREST_PILOT_END - camCX);
        // Crossfade at both ends and when the view gets too wide for a single plate.
        const coverage = smooth(edge / FOREST_FADE) * smooth((1810 - cssW / zoom) / 480);
        z.plate.visible = coverage > 0;
        z.plate.alpha = coverage * 0.85;
        z.plate.tint = toHex([
          Math.min(1, fog[0] / forestReferenceFog[0]),
          Math.min(1, fog[1] / forestReferenceFog[1]),
          Math.min(1, fog[2] / forestReferenceFog[2]),
        ]);
        g.visible = coverage < 1;
        g.alpha = 0.62 * (1 - coverage);
      } else {
        g.alpha = 0.62;
      }
    }
  }
}
