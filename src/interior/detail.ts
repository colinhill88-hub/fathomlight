import { materialFill } from '../art/worldArt';
import type { Texture } from 'pixi.js';
import { Graphics } from 'pixi.js';

/**
 * Detail for the walkable base's rooms (interior art pass, after character
 * animation session B). Everything here is drawn once into the interior's
 * static layer when the level is built, so it costs nothing per frame beyond
 * its triangles. The interior lighting reads surface relief from brightness
 * edges in the picture, so the bevels, seams and raised parts here catch the
 * lamps. Kept low in contrast: the big shapes (machines, doors, tanks) must
 * still read first at phone size.
 */

export const DC = {
  wall: 0x2f363b,
  wallLight: 0x3a4247,
  wallDark: 0x22282c,
  seam: 0x1a1e21,
  bevelHi: 0x56636b,
  bevelLo: 0x161a1d,
  chrome: 0xa4b0b7,
  chromeHi: 0xe4ecf0,
  chromeDark: 0x4a545a,
  steel: 0x5c676e,
  gold: 0xc9a13a,
  lime: 0xc6f03a,
  red: 0xd8392e,
  hazard: 0xd8a830,
  rust: 0x6a3a22,
  grime: 0x0e1113,
  copper: 0xb06a3a,
  copperHi: 0xf0b078,
};

type Rand = () => number;

/** A small rivet: dark head with a lit edge on top. */
export function rivet(g: Graphics, x: number, y: number, r = 1.3): void {
  g.circle(x, y, r).fill({ color: DC.bevelLo });
  g.circle(x - 0.3, y - 0.4, r * 0.55).fill({ color: DC.bevelHi });
}

/** A run of bolts along a line. */
export function bolts(g: Graphics, x0: number, y0: number, x1: number, y1: number, step: number, r = 1.2): void {
  const l = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.floor(l / step));
  for (let i = 0; i <= n; i++) rivet(g, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, r);
}

/**
 * The back wall of a room: bevelled plates (lit along the top and left,
 * shadowed under and to the right), corner rivets, and now and then a vent
 * grille, an access hatch, a gauge, a valve wheel or a label plate.
 */
export function wallPanels(g: Graphics, x0: number, y0: number, w: number, h: number, rand: Rand, texture?: Texture, pw = 120, ph = 80): void {
  g.rect(x0, y0, w, h).fill({ color: DC.wall });
  if (texture) g.rect(x0, y0, w, h).fill(materialFill(texture, DC.wall, 0.66, 790, 510));
  for (let y = y0; y < y0 + h - 4; y += ph)
    for (let x = x0; x < x0 + w - 4; x += pw) {
      const cw = Math.min(pw, x0 + w - x);
      const chh = Math.min(ph, y0 + h - y);
      const tone = rand();
      g.rect(x + 2, y + 2, cw - 4, chh - 4).fill({ color: tone < 0.45 ? DC.wallLight : tone < 0.85 ? DC.wall : 0x343b40, alpha: texture ? 0.45 : 0.75 });
      // Bevel: light from above.
      g.rect(x + 2, y + 2, cw - 4, 1.4).fill({ color: DC.bevelHi, alpha: 0.55 });
      g.rect(x + 2, y + 2, 1.4, chh - 4).fill({ color: DC.bevelHi, alpha: 0.3 });
      g.rect(x + 2, y + chh - 3.5, cw - 4, 1.6).fill({ color: DC.bevelLo, alpha: 0.7 });
      g.rect(x + cw - 3.5, y + 2, 1.5, chh - 4).fill({ color: DC.bevelLo, alpha: 0.5 });
      // Seams.
      g.rect(x, y, cw, 2).fill({ color: DC.seam, alpha: 0.8 });
      g.rect(x, y, 2, chh).fill({ color: DC.seam, alpha: 0.6 });
      if (cw < 30 || chh < 30) continue;
      for (const [rx, ry] of [[6, 6], [cw - 6, 6], [6, chh - 6], [cw - 6, chh - 6]]) rivet(g, x + rx, y + ry, 1.2);
      const r = rand();
      const mx = x + cw / 2;
      const my = y + chh / 2;
      if (r < 0.14) {
        // Vent grille.
        g.roundRect(mx - 22, my - 12, 44, 24, 3).fill({ color: DC.wallDark });
        for (let k = 0; k < 5; k++) g.rect(mx - 18, my - 9 + k * 4.4, 36, 2.2).fill({ color: DC.grime });
        g.roundRect(mx - 22, my - 12, 44, 24, 3).stroke({ color: DC.bevelHi, width: 1, alpha: 0.5 });
      } else if (r < 0.24) {
        // Access hatch with a handle.
        g.roundRect(mx - 18, my - 22, 36, 44, 4).fill({ color: DC.wallLight });
        g.roundRect(mx - 18, my - 22, 36, 44, 4).stroke({ color: DC.bevelLo, width: 1.4 });
        g.rect(mx - 17, my - 21, 34, 1.2).fill({ color: DC.bevelHi, alpha: 0.6 });
        g.roundRect(mx + 8, my - 6, 4, 12, 2).fill({ color: DC.chromeDark });
        for (const [hx, hy] of [[-14, -18], [14, -18], [-14, 18], [14, 18]]) rivet(g, mx + hx, my + hy, 1);
      } else if (r < 0.3) {
        // Pressure gauge on a short pipe stub.
        g.rect(mx - 1.5, my + 8, 3, 16).fill({ color: DC.chromeDark });
        g.circle(mx, my, 9).fill({ color: DC.chrome });
        g.circle(mx, my, 7).fill({ color: 0xd8d4c4 });
        g.moveTo(mx, my).lineTo(mx + Math.cos(rand() * 3 - 2.6) * 5.5, my + Math.sin(rand() * 3 - 2.6) * 5.5).stroke({ color: DC.red, width: 1.2 });
        g.circle(mx, my, 1.2).fill({ color: DC.seam });
      } else if (r < 0.35) {
        // A valve wheel.
        g.circle(mx, my, 10).stroke({ color: DC.red, width: 2.6, alpha: 0.85 });
        g.moveTo(mx - 10, my).lineTo(mx + 10, my).moveTo(mx, my - 10).lineTo(mx, my + 10).stroke({ color: DC.red, width: 1.6, alpha: 0.85 });
        g.circle(mx, my, 2.4).fill({ color: DC.chromeDark });
      } else if (r < 0.43) {
        // A stencilled label plate.
        g.rect(mx - 16, my - 5, 32, 10).fill({ color: 0x8a8f86, alpha: 0.5 });
        for (let k = 0; k < 3; k++) g.rect(mx - 12 + k * 9, my - 2, 6, 4).fill({ color: DC.seam, alpha: 0.6 });
      }
    }
}

/** Darker air and grime gathering along a floor, and a few drips. */
export function floorGrime(g: Graphics, x0: number, w: number, floorY: number, rand: Rand): void {
  for (let k = 0; k < 4; k++) g.rect(x0, floorY - 16 - (k + 1) * 9, w, 9).fill({ color: DC.grime, alpha: 0.12 - k * 0.025 });
  for (let i = 0; i < w / 70; i++) {
    const x = x0 + rand() * w;
    g.rect(x, floorY - 16 - 10 - rand() * 40, 1 + rand() * 1.5, 8 + rand() * 30).fill({ color: rand() < 0.4 ? DC.rust : DC.grime, alpha: 0.18 + rand() * 0.18 });
  }
}

/** A skirting plate along a floor: bevelled, bolted, with a hazard stripe under doorways if asked. */
export function skirting(g: Graphics, x0: number, w: number, floorY: number): void {
  g.rect(x0, floorY - 16, w, 16).fill({ color: DC.wallDark });
  g.rect(x0, floorY - 16, w, 2).fill({ color: DC.chromeDark });
  g.rect(x0, floorY - 14, w, 1).fill({ color: DC.bevelHi, alpha: 0.4 });
  for (let x = x0 + 30; x < x0 + w; x += 60) rivet(g, x, floorY - 8, 1.1);
}

/** Black and yellow stripes in a box. */
export function hazard(g: Graphics, x: number, y: number, w: number, h: number): void {
  g.rect(x, y, w, h).fill({ color: DC.seam });
  for (let s = -h; s < w; s += 10) {
    const a = Math.max(x, x + s);
    const b = Math.min(x + w, x + s + 5);
    if (b <= a) continue;
    g.poly([a, y + h, b, y + h, Math.min(x + w, b + h), y, Math.min(x + w, a + h), y]).fill({ color: DC.hazard, alpha: 0.75 });
  }
}

/**
 * A structural beam under a ceiling: an I-section with lit flange, gussets
 * down onto the wall, and slack cables clipped along it.
 */
export function ceilingBeam(g: Graphics, x0: number, w: number, y: number, rand: Rand): void {
  g.rect(x0, y, w, 12).fill({ color: DC.steel });
  g.rect(x0, y, w, 2).fill({ color: DC.chrome, alpha: 0.6 });
  g.rect(x0, y + 10, w, 2).fill({ color: DC.bevelLo });
  g.rect(x0, y + 4, w, 4).fill({ color: DC.chromeDark, alpha: 0.6 });
  for (let x = x0 + 40; x < x0 + w - 20; x += 160) {
    g.poly([x - 14, y + 12, x + 14, y + 12, x, y + 26]).fill({ color: DC.chromeDark });
    rivet(g, x, y + 16, 1.1);
  }
  // Cables: two or three hanging in shallow loops between clamps.
  const n = 2 + (rand() < 0.5 ? 1 : 0);
  const cols = [0x1c2124, 0x5a2a22, 0x2a3a2a];
  for (let c = 0; c < n; c++) {
    const cy = y + 15 + c * 3;
    let x = x0 + 10;
    g.moveTo(x, cy);
    while (x < x0 + w - 10) {
      const nx = Math.min(x0 + w - 10, x + 90 + rand() * 40);
      g.quadraticCurveTo((x + nx) / 2, cy + 7 + rand() * 5, nx, cy);
      x = nx;
    }
    g.stroke({ color: cols[c], width: 2.2 });
  }
  for (let x = x0 + 10; x < x0 + w - 10; x += 120) g.rect(x - 3, y + 12, 6, 12).fill({ color: DC.chromeDark });
}

/**
 * A horizontal pipe along a wall: shaded round section, flanges with bolts,
 * and brackets back to the wall.
 */
export function pipeRun(g: Graphics, x0: number, x1: number, y: number, r: number, color: number, hi: number, rand: Rand): void {
  const w = x1 - x0;
  g.rect(x0, y - r, w, r * 2).fill({ color });
  g.rect(x0, y - r + 1, w, r * 0.45).fill({ color: hi, alpha: 0.55 });
  g.rect(x0, y + r * 0.45, w, r * 0.55).fill({ color: DC.grime, alpha: 0.35 });
  for (let x = x0 + 30 + rand() * 40; x < x1 - 20; x += 110 + rand() * 60) {
    g.rect(x - 3, y - r - 2.5, 6, r * 2 + 5).fill({ color: DC.chromeDark });
    g.rect(x - 3, y - r - 2.5, 6, 1.4).fill({ color: DC.chrome, alpha: 0.7 });
    rivet(g, x, y - r - 1, 0.9);
    rivet(g, x, y + r + 1, 0.9);
  }
  for (let x = x0 + 70; x < x1 - 20; x += 150) {
    g.rect(x - 2, y - r - 8, 4, 8).fill({ color: DC.steel });
    g.rect(x - 6, y - r - 9, 12, 2.5).fill({ color: DC.chromeDark });
  }
}

/** A vertical pipe or conduit (same look as pipeRun, standing up). */
export function pipeUp(g: Graphics, x: number, y0: number, y1: number, r: number, color: number, hi: number): void {
  const h = y1 - y0;
  g.rect(x - r, y0, r * 2, h).fill({ color });
  g.rect(x - r + 1, y0, r * 0.45, h).fill({ color: hi, alpha: 0.5 });
  g.rect(x + r * 0.45, y0, r * 0.55, h).fill({ color: DC.grime, alpha: 0.35 });
  for (let y = y0 + 40; y < y1 - 10; y += 120) {
    g.rect(x - r - 2.5, y - 3, r * 2 + 5, 6).fill({ color: DC.chromeDark });
    g.rect(x - r - 2.5, y - 3, r * 2 + 5, 1.4).fill({ color: DC.chrome, alpha: 0.7 });
  }
}

/** A ceiling lamp fixture: hung on two rods under the ceiling, a housing and a diffuser rim. */
export function lampFixture(g: Graphics, x: number, y: number): void {
  g.rect(x - 12, y - 10, 2, 8).fill({ color: DC.chromeDark });
  g.rect(x + 10, y - 10, 2, 8).fill({ color: DC.chromeDark });
  g.poly([x - 20, y - 3, x + 20, y - 3, x + 16, y + 4, x - 16, y + 4]).fill({ color: 0x2a2f33 });
  g.rect(x - 20, y - 4, 40, 2).fill({ color: DC.chrome });
  g.rect(x - 16, y + 3, 32, 1.5).fill({ color: DC.chromeDark });
  rivet(g, x - 15, y - 1, 0.9);
  rivet(g, x + 15, y - 1, 0.9);
}

/** Diamond tread on a deck's top face (a strip of short slanted ribs). */
export function deckTread(g: Graphics, x0: number, w: number, y: number): void {
  let flip = false;
  for (let x = x0 + 2; x < x0 + w - 3; x += 5) {
    g.moveTo(x, y + (flip ? 1 : 4)).lineTo(x + 3, y + (flip ? 4 : 1)).stroke({ color: 0x5a666d, width: 1 });
    flip = !flip;
  }
}

/** A bolted chrome flange round a rectangle (machine housings, doors). */
export function flangeRect(g: Graphics, x: number, y: number, w: number, h: number, r = 4): void {
  g.roundRect(x, y, w, h, r).stroke({ color: DC.chromeDark, width: 3 });
  g.roundRect(x + 1, y + 1, w - 2, h - 2, r).stroke({ color: DC.chrome, width: 1, alpha: 0.5 });
  bolts(g, x + 6, y + 4, x + w - 6, y + 4, 28, 1);
  bolts(g, x + 6, y + h - 4, x + w - 6, y + h - 4, 28, 1);
}
