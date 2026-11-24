import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { mulberry32 } from '../rng';
import { waterColor } from '../fx/shared';
import type { WorldArt } from '../art/worldArt';
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
interface PlatePlacement {
  label: string;
  centerX: number;
  topY: number;
  width: number;
  startX: number;
  endX: number;
  fadeIn: number;
  fadeOut: number;
  referenceFog: [number, number, number];
}

const forestPlacement: PlatePlacement = {
  label: 'paintedForestMidground',
  centerX: 12360, topY: 140, width: 2200,
  startX: 11020, endX: 13680, fadeIn: 420, fadeOut: 420,
  referenceFog: waterColor(1175),
};

const shelfPlacement: PlatePlacement = {
  label: 'paintedWreckShelfMidground',
  // At half parallax the 3400 × 1700 sprite spans world x 19600–26400.
  centerX: 23000, topY: -190, width: 3400,
  startX: 19480, endX: 25900, fadeIn: 660, fadeOut: 940,
  referenceFog: waterColor(1500),
};

interface Zone {
  c: Container;
  x0: number;
  x1: number;
  /** 0 = water colour, 1 = full rock colour. */
  strength: number;
  plate?: { sprite: Sprite; placement: PlatePlacement };
}

interface Landscape {
  asset: keyof WorldArt['plates'];
  x: [number, number];
  y: [number, number];
  center: [number, number];
  width: number;
  depth: number;
  opacity: number;
}

const landscapes: Landscape[] = [
  { asset: 'basin', x: [-5700, 1550], y: [-260, 1780], center: [-1550, 790], width: 3250, depth: 0.26, opacity: 0.84 },
  { asset: 'meadow', x: [2400, 8900], y: [-450, 1080], center: [5610, 408], width: 2800, depth: 0.32, opacity: 0.82 },
  { asset: 'cliff', x: [5480, 10300], y: [-300, 1570], center: [8110, 660], width: 2450, depth: 0.44, opacity: 0.76 },
  { asset: 'forest-east', x: [13210, 15260], y: [320, 1540], center: [14150, 1100], width: 1750, depth: 0.4, opacity: 0.78 },
  { asset: 'shelf', x: [19150, 23730], y: [435, 1900], center: [21250, 1380], width: 2150, depth: 0.32, opacity: 0.74 },
  { asset: 'shelf-east', x: [24700, 28170], y: [500, 2060], center: [26640, 1195], width: 2000, depth: 0.38, opacity: 0.7 },
  { asset: 'trench', x: [26600, 30920], y: [1600, 5220], center: [29000, 3350], width: 2680, depth: 0.36, opacity: 0.75 },
  { asset: 'abyss', x: [29100, 33280], y: [4350, 7990], center: [31020, 6000], width: 2750, depth: 0.33, opacity: 0.72 },
];

function toHex([r, g, b]: [number, number, number]): number {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return (c(r) << 16) | (c(g) << 8) | c(b);
}

/** Local coordinates for a world position at this layer's parallax. */
const lx = (wx: number) => wx * PARALLAX;
const ly = (wy: number) => REF_DEPTH + (wy - REF_DEPTH) * PARALLAX;

function addPlate(zone: Zone, texture: Texture, placement: PlatePlacement): void {
  const sprite = new Sprite({ texture, label: placement.label });
  sprite.anchor.x = 0.5;
  sprite.position.set(lx(placement.centerX), ly(placement.topY));
  sprite.width = placement.width;
  sprite.height = placement.width / 2;
  zone.plate = { sprite, placement };
  zone.c.addChild(sprite);
}

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
  private landscapes: { placement: Landscape; sprite: Sprite }[] = [];
  private landscapeView?: Container;
  private waterline?: Graphics;

  constructor(private readonly forestMidground?: Texture, private readonly shelfMidground?: Texture, private readonly art?: WorldArt) {}

  build(): void {
    this.view.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.zones = [];
    this.landscapes = [];
    this.landscapeView = undefined;
    this.waterline = undefined;
    for (const placement of landscapes) {
      const texture = this.art?.plates[placement.asset];
      if (!texture) continue;
      const sprite = new Sprite({ texture, label: `world-${placement.asset}` });
      sprite.anchor.set(0.5, 0.55);
      sprite.visible = false;
      this.landscapes.push({ placement, sprite });
    }
    if (this.landscapes.length) {
      this.landscapeView = this.view.addChild(new Container());
      this.waterline = this.view.addChild(new Graphics());
      this.landscapeView.addChild(...this.landscapes.map(({ sprite }) => sprite));
    }
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
    // The basin: procedural boulders/arches only when the painted basin landscape is absent.
    if (!this.art?.plates.basin) {
      mk(BASIN_WEST, BASIN_EAST, 0.34, (g) => {
        for (let x = BASIN_WEST + 200; x < BASIN_EAST - 150; x += 260 + rand() * 520) {
          const base = groundY(x) + 40;
          if (rand() < 0.28) arch(g, lx(x), ly(base), 520 + rand() * 360, 380 + rand() * 260);
          else boulder(g, lx(x), ly(base), 220 + rand() * 340, 120 + rand() * 200, rand);
        }
      });
    }
    // The kelp forest: ranks of distant kelp from the floor towards the surface.
    const forest = mk(FOREST.x0, FOREST.x1, 0.3, (g) => {
      for (let x = FOREST.x0 - 200; x < FOREST.x1 + 200; x += 70 + rand() * 90) {
        const base = groundY(Math.min(FOREST.x1, Math.max(FOREST.x0, x))) + 30;
        kelpStalk(g, lx(x), ly(base), (base - 60) * PARALLAX * (0.55 + rand() * 0.4) / PARALLAX, rand);
      }
    });
    if (this.forestMidground) addPlate(forest, this.forestMidground, forestPlacement);
    // The wreck shelf: hulks, masts and a crane, half sunk in the silt.
    const shelf = mk(WRECK_SHELF.x0, WRECK_SHELF.x1 + 200, 0.4, (g) => {
      for (let x = WRECK_SHELF.x0 + 300; x < WRECK_SHELF.x1; x += 900 + rand() * 1100) {
        const base = groundY(x) + 70;
        hulk(g, lx(x), ly(base), 640 + rand() * 420, 120 + rand() * 80, (rand() - 0.5) * 0.28, rand);
      }
    });
    if (this.shelfMidground) addPlate(shelf, this.shelfMidground, shelfPlacement);
  }

  /** Camera centre in world units, zoom = CSS px per world unit. Returns painted landscape coverage (0..1). */
  update(camCX: number, camCY: number, zoom: number, cssW: number, cssH: number): number {
    const ox = camCX * PARALLAX;
    const oy = REF_DEPTH + (camCY - REF_DEPTH) * PARALLAX;
    const fog = waterColor(camCY + 80);
    if (this.landscapeView && this.waterline) {
      // Keep plate silhouettes under the water shader's animated surface.
      const surface = cssH / 2 + (9 - camCY) * zoom;
      if (surface > 0) {
        this.waterline.clear().rect(0, surface, cssW, Math.max(0, cssH - surface)).fill(0xffffff);
        if (!this.landscapeView.mask) this.landscapeView.mask = this.waterline;
      } else if (this.landscapeView.mask) {
        this.landscapeView.mask = null;
        this.waterline.clear();
      }
    }
    let paintedCover = 0;
    for (const { placement, sprite } of this.landscapes) {
      const { x, y, center, width, depth, opacity } = placement;
      const edgeX = Math.min(camCX - x[0], x[1] - camCX);
      const edgeY = Math.min(camCY - y[0], y[1] - camCY);
      const coverage = smooth(edgeX / 430) * smooth(edgeY / 260);
      if (coverage > paintedCover) paintedCover = coverage;
      sprite.visible = coverage > 0;
      if (!sprite.visible) continue;
      sprite.position.set(cssW / 2 + (center[0] - camCX) * zoom * depth, cssH / 2 + (center[1] - camCY) * zoom * depth);
      sprite.width = width * zoom;
      sprite.height = width * 0.5 * zoom;
      const reference = waterColor(Math.max(0, center[1]) + 80);
      sprite.tint = toHex([Math.min(1, fog[0] / reference[0]), Math.min(1, fog[1] / reference[1]), Math.min(1, fog[2] / reference[2])]);
      sprite.alpha = coverage * opacity;
    }
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
        const { sprite, placement } = z.plate;
        const edge = Math.min((camCX - placement.startX) / placement.fadeIn, (placement.endX - camCX) / placement.fadeOut);
        // Crossfade at both ends and when the view gets too wide for a single plate.
        const coverage = smooth(edge) * smooth((1810 - cssW / zoom) / 480);
        if (coverage > paintedCover) paintedCover = coverage;
        sprite.visible = coverage > 0;
        sprite.alpha = coverage * 0.85;
        sprite.tint = toHex([
          Math.min(1, fog[0] / placement.referenceFog[0]),
          Math.min(1, fog[1] / placement.referenceFog[1]),
          Math.min(1, fog[2] / placement.referenceFog[2]),
        ]);
        g.visible = coverage < 1;
        g.alpha = 0.62 * (1 - coverage);
      } else {
        g.alpha = 0.62;
      }
    }
    return paintedCover;
  }
}
