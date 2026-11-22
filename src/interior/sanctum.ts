import type { Graphics } from 'pixi.js';
import type { Light } from '../fx/lighting';
import type { InteriorOptions } from './interior';

/**
 * Milestone 11: the heart of the sanctum, explored on foot (Colin's choice:
 * swim down through the sanctum, then a dry interior). The Choir keeps air in
 * its heart, as if it expected visitors who breathe. One tile is 40 units.
 *
 *  - The upper hall: in through the glowing arch (S), east along a walkway,
 *    and over a chasm of light on three rings of light (grapple and swing).
 *  - The lift (U, G, L): a disc of stone riding a column of light down the
 *    east side, always powered.
 *  - The lower hall: west from the lift to a song-lock (Q), sung open at its
 *    plinth (1), then a second swing back over the chasm, above its pool of
 *    light (falling in only lifts you back to where you last stood).
 *  - The Choir's chamber, under the upper walkway: a tall room with ledges of
 *    light, and the plinth where you answer the Choir (9).
 *
 * The map is built by code (carved rooms in solid stone) so its shape is easy
 * to change.
 */
export const HEART_W = 90;
export const HEART_H = 34;
/** The middle of the Choir's chamber, where the Choir rises (level units). */
export const CHOIR_AT = { x: 14 * 40, y: 19 * 40 };

export const HEART_MAP: string[] = (() => {
  const g: string[][] = Array.from({ length: HEART_H }, () => Array.from({ length: HEART_W }, () => '#'));
  const carve = (c0: number, c1: number, r0: number, r1: number, ch = ' ') => {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) g[r][c] = ch;
  };
  const put = (c: number, r: number, ch: string) => (g[r][c] = ch);
  // The upper hall and the walkway, west to east.
  carve(1, 82, 1, 8);
  // The chasm, down to its pool of light.
  carve(29, 52, 9, 29);
  carve(29, 52, 30, 31, '~');
  // The Choir's chamber under the upper walkway, opening onto the chasm low down.
  carve(1, 27, 12, 27);
  carve(28, 28, 19, 27);
  // The lower hall, from the chasm east to the lift.
  carve(53, 82, 19, 27);
  // The lift: call stones (U), gates (G) and the shaft (L) up the east side.
  put(82, 8, 'U');
  put(82, 27, 'U');
  for (const r of [6, 7, 8, 25, 26, 27]) put(83, r, 'G');
  for (let r = 6; r <= 27; r++) for (let c = 84; c <= 86; c++) put(c, r, 'L');
  // In by the arch.
  put(3, 8, 'S');
  // Rings of light over the chasm: high for the upper crossing, low for the lower one.
  for (const c of [34, 41, 48]) put(c, 3, 'o');
  for (const c of [31, 38, 45]) put(c, 20, 'o');
  // The song-lock across the lower hall, and its plinth.
  carve(60, 60, 19, 27, 'Q');
  put(64, 27, '1');
  // Ledges of light in the Choir's chamber, and the plinth where you answer.
  carve(3, 7, 22, 22, '=');
  carve(20, 24, 22, 22, '=');
  carve(10, 17, 16, 16, '=');
  put(13, 27, '9');
  return g.map((r) => r.join(''));
})();

/**
 * The Choir as it rises in its chamber: rings and ribbons of living light.
 * The contact (src/main.ts) sets how far it has risen and which colour it is
 * singing; this draws it and lights the room.
 */
export class ChoirForm {
  /** 0 not there .. 1 fully risen. */
  rise = 0;
  /** The colour it sings now (0 cyan, 1 violet, 2 magenta, 3 pale gold) and how strongly (0..1). */
  note = -1;
  noteK = 0;
  /** The ending: it opens out and fills the room. */
  bloom = 0;
  /**
   * Phase 23: your collection in its song. `echo` are your creatures' glow colours; `rich`
   * (0..1) how much of them it takes on: lights that circle it, and (above a half) an
   * outer ring in your colours. `flash` is the colour of the word it is singing now.
   */
  echo: number[] = [];
  rich = 0;
  flash = -1;
  flashK = 0;
  /** Phase 23: the companion's bubble of light (0..1) and where it floats. */
  bubble = 0;
  bubbleAt = { x: 0, y: 0 };
  bubbleColour = 0xfff0c0;
  private light: Light = { x: CHOIR_AT.x, y: CHOIR_AT.y, radius: 900, intensity: 0, color: [0.6, 0.6, 1], haze: 0.12 };
  static readonly COLOURS = [0x5ff0ff, 0xa27cff, 0xff5ad8, 0xffe7a0];

  constructor(private readonly living = false) {}

  draw(_d: Graphics, de: Graphics, t: number): void {
    const k = this.rise;
    if (k <= 0.001) {
      this.light.intensity = 0;
      return;
    }
    const x = CHOIR_AT.x;
    const y = CHOIR_AT.y + (1 - k) * 220;
    const C = ChoirForm.COLOURS;
    const sing = this.note >= 0 ? this.noteK : 0;
    const big = 1 + this.bloom * 0.8 + sing * 0.15;
    if (this.living) this.drawMantle(de, t, x, y, k, sing, big);
    else this.drawRings(de, t, x, y, k, sing, big);
    this.drawEcho(de, t, x, y, k, big);
    let col = this.note >= 0 && sing > 0.05 ? C[this.note] : 0xb0b8ff;
    if (this.flash >= 0 && this.flashK > sing) col = this.flash;
    this.light.x = x;
    this.light.y = y;
    this.light.color = [((col >> 16) & 255) / 255, ((col >> 8) & 255) / 255, (col & 255) / 255];
    this.light.intensity = (0.9 + 1.2 * sing + this.bloom) * k;
  }

  private drawRings(de: Graphics, t: number, x: number, y: number, k: number, sing: number, big: number): void {
    const C = ChoirForm.COLOURS;
    // Rings: tilted, turning slowly, each its own colour; the singing colour flares.
    for (let i = 0; i < 6; i++) {
      const r = (60 + i * 34) * big * (0.6 + 0.4 * k);
      const tilt = 0.25 + 0.2 * Math.sin(t * 0.3 + i);
      const rot = t * (0.15 + i * 0.05) * (i % 2 ? -1 : 1);
      const c = C[i % 3];
      const on = this.note === i % 3 ? sing : 0;
      const pts: number[] = [];
      for (let a = 0; a <= 32; a++) {
        const ang = (a / 32) * Math.PI * 2;
        const px = Math.cos(ang) * r;
        const py = Math.sin(ang) * r * tilt;
        pts.push(x + px * Math.cos(rot) - py * Math.sin(rot), y + px * Math.sin(rot) + py * Math.cos(rot));
      }
      de.poly(pts, true).stroke({ color: c, width: 1.6 + on * 3, alpha: (0.35 + 0.5 * on) * k });
    }
    // Ribbons trailing down from it, waving.
    for (let i = 0; i < 7; i++) {
      const bx = x + (i - 3) * 28 * big;
      const c = C[i % 3];
      de.moveTo(bx, y + 20);
      for (let s = 1; s <= 10; s++) de.lineTo(bx + Math.sin(t * 1.3 + i + s * 0.6) * (8 + s * 2), y + 20 + s * 24 * k * big);
      de.stroke({ color: this.note === i % 3 ? C[this.note] : c, width: 2, alpha: 0.5 * k });
    }
    // The core.
    const core = this.note >= 0 && sing > 0.05 ? C[this.note] : 0xe8f0ff;
    de.circle(x, y, (26 + sing * 18 + this.bloom * 40) * k).fill({ color: core, alpha: 0.35 + 0.3 * sing });
    de.circle(x, y, (10 + sing * 6) * k).fill({ color: 0xf8fcff, alpha: 0.95 });
  }

  private drawMantle(de: Graphics, t: number, x: number, y: number, rise: number, sing: number, spread: number): void {
    const span = spread * rise;
    const breathing = 1 + Math.sin(t * 1.1) * 0.08;
    const colours = ChoirForm.COLOURS;
    for (let i = 0; i < 7; i++) {
      const u = (i - 3) / 3;
      const colour = colours[i % 3];
      const flare = this.note === i % 3 ? sing : 0;
      const trail = Math.sin(t * 1.25 - i * 0.74) * 13 * span;
      const dx = u * (155 + flare * 29) * span * breathing;
      const crown = y - (63 - Math.abs(u) * 27) * span;
      const hanging = y + (163 + (1 - Math.abs(u)) * 112) * span;
      const mid = y + 40 * span;
      de.moveTo(x + u * 19 * span, crown)
        .bezierCurveTo(x + dx * 0.8, crown - 39 * span, x + dx * 1.13, mid - 13 * span, x + dx, mid)
        .bezierCurveTo(x + dx * 0.88, hanging - 52 * span, x + dx * 0.48 + trail, hanging - 17 * span, x + dx * 0.35 + trail, hanging)
        .bezierCurveTo(x + dx * 0.67 + trail * 0.47, hanging - 61 * span, x + dx * 0.63, mid + 19 * span, x + u * 19 * span, crown)
        .fill({ color: colour, alpha: rise * (0.19 + 0.46 * flare) });
      de.moveTo(x + u * 19 * span, crown)
        .bezierCurveTo(x + dx * 0.85, crown - 21 * span, x + dx * 0.88, mid, x + dx * 0.35 + trail, hanging)
        .stroke({ color: colour, alpha: rise * (0.58 + 0.42 * flare), width: 1.8 + flare * 2.2 });
    }
    const core = this.note >= 0 && sing > 0.05 ? colours[this.note] : 0xe8f0ff;
    const height = (47 + sing * 19 + this.bloom * 32) * span;
    const width = (24 + sing * 12) * span * breathing;
    de.moveTo(x, y - height).quadraticCurveTo(x + width, y - height * 0.26, x + width, y + height * 0.13)
      .quadraticCurveTo(x + width * 0.55, y + height * 0.64, x, y + height)
      .quadraticCurveTo(x - width, y + height * 0.24, x - width, y + height * 0.13)
      .quadraticCurveTo(x - width, y - height * 0.28, x, y - height).fill({ color: core, alpha: 0.64 * rise });
    de.ellipse(x, y, width * 0.31, height * 0.48).fill({ color: 0xf8fcff, alpha: 0.96 * rise });
  }

  /** Phase 23: your creatures' lights circling it, an outer ring of your colours, and the companion's bubble. */
  private drawEcho(de: Graphics, t: number, x: number, y: number, k: number, big: number): void {
    const r = this.rich * Math.min(1, this.bloom * 1.6);
    if (r > 0.01 && this.echo.length) {
      const n = Math.min(16, Math.max(4, this.echo.length));
      for (let i = 0; i < n; i++) {
        const a = t * 0.35 + (i / n) * Math.PI * 2;
        const R = (230 + 40 * Math.sin(t * 0.5 + i)) * big * k;
        const px = x + Math.cos(a) * R;
        const py = y + Math.sin(a) * R * 0.42;
        const c = this.echo[i % this.echo.length];
        const flare = this.flash === c ? this.flashK : 0;
        // Tier 3 (rich above three quarters): each light leaves a short trail.
        if (this.rich > 0.75)
          for (let s = 1; s <= 4; s++) {
            const b = a - s * 0.06;
            de.circle(x + Math.cos(b) * R, y + Math.sin(b) * R * 0.42, 5 - s).fill({ color: c, alpha: r * (0.35 - s * 0.07) });
          }
        de.circle(px, py, (5 + flare * 5) * (0.7 + 0.3 * r)).fill({ color: c, alpha: r * (0.6 + 0.4 * flare) });
      }
      if (this.rich > 0.5) {
        // An outer ring in your colours, turning slowly the other way.
        const R = 300 * big * k;
        const segs = Math.max(6, this.echo.length * 2);
        for (let i = 0; i < segs; i++) {
          const a0 = -t * 0.12 + (i / segs) * Math.PI * 2;
          const a1 = a0 + (Math.PI * 2) / segs * 0.8;
          const pts: number[] = [];
          for (let s = 0; s <= 6; s++) {
            const a = a0 + ((a1 - a0) * s) / 6;
            pts.push(x + Math.cos(a) * R, y + Math.sin(a) * R * 0.3);
          }
          de.poly(pts, false).stroke({ color: this.echo[i % this.echo.length], width: 2, alpha: r * 0.55 });
        }
      }
    }
    if (this.bubble > 0.01) {
      const b = this.bubble;
      const { x: bx, y: by } = this.bubbleAt;
      de.circle(bx, by, 34 * b).fill({ color: this.bubbleColour, alpha: 0.14 * b });
      de.circle(bx, by, 34 * b).stroke({ color: 0xe8f0ff, width: 1.4, alpha: 0.55 * b });
      de.circle(bx - 12 * b, by - 14 * b, 5 * b).fill({ color: 0xffffff, alpha: 0.35 * b });
    }
  }

  lights(): Light[] {
    return this.light.intensity > 0 ? [this.light] : [];
  }
}

export function heartOptions(choir: ChoirForm, again = false): InteriorOptions {
  return {
    labels: {
      '1': 'Sing to the song-lock',
      // Phase 23: after first contact the plinth lets you sing with it again.
      '9': again ? 'Sing with the Choir again' : 'Answer the Choir',
    },
    style: 'sanctum',
    powered: true,
    gates: { Q: '1' },
    plainFinds: true,
    exitLabel: 'Go back out through the arch',
    animate: (d, de, t) => choir.draw(d, de, t),
    lights: () => choir.lights(),
  };
}
