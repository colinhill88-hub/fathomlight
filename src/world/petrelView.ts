import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import { getPropArt } from '../art/propArt';
import { baseWaveHeight } from '../fx/surfaceMotion';
import { PETREL_STAGES, petrelDone } from '../game/petrel';
import type { SaveData } from '../game/state';
import { groundY } from './terrain';

/**
 * Beyond Earth (Nov 27, 2026): the Petrel's launch platform, floating at the
 * surface just east of the Kestrel base, and the ship growing on it stage by
 * stage. Seen every time Kestrel comes up for air.
 *
 * Code-drawn in the Victorian watercolor look of the base kit (riveted
 * gunmetal, brass bands, dark ink outlines, warm amber lamps), with a soft
 * wash under it. Painted images replace it when they exist in
 * src/art/landmarks/ (see docs/art/prompts/petrel.md):
 *   petrel_platform  the empty platform and its gantry;
 *   petrel_1..5      the ship as she stands after each stage.
 * Until those land, this file draws everything.
 */

/** Where the platform floats (world x), between the base and Linnea's home spot. */
export const PETREL_X = 1380;
/** Deck height above the still waterline (world y is down; the surface sits at about 0). */
const DECK_Y = -26;
const DECK_HALF = 210;
/** The ship's height above the deck when whole. */
const SHIP_H = 330;
const SHIP_HALF = 46;
/** The whole platform is drawn at this scale, so the ship fits in the sky above the waterline in view. */
const VIEW_SCALE = 0.58;

const INK = 0x161d20;
const STEEL = 0x2f373b;
const STEEL_LIGHT = 0x58656b;
const STEEL_DARK = 0x1b2124;
const BRASS = 0xb8913e;
const BRASS_LIGHT = 0xe8c878;
const BRASS_DARK = 0x6e5424;
const AMBER = 0xffc46a;
const TILE = 0x7a6a52;
const TILE_LIGHT = 0xa8916a;

type PetrelTexKey = 'petrel_platform' | 'petrel_1' | 'petrel_2' | 'petrel_3' | 'petrel_4' | 'petrel_5';

export class PetrelView {
  readonly view = new Container();
  readonly emissive = new Container();
  readonly glow = new Container();

  readonly x = PETREL_X;
  y = DECK_Y;

  private readonly chain = new Graphics();
  private readonly body = new Container();
  private readonly emBody = new Container();
  private readonly glowBody = new Container();
  private readonly coreGlow = new Graphics();
  private readonly beacon = new Graphics();
  private readonly floorY: number;
  private sig = '';
  private visible = false;
  private hasCore = false;

  constructor() {
    this.floorY = groundY(this.x);
    this.view.addChild(this.chain, this.body);
    this.emissive.addChild(this.emBody);
    this.glow.addChild(this.glowBody);
    this.view.visible = this.emissive.visible = this.glow.visible = false;
  }

  /** Redraw for the save's progress (cheap to call: it only redraws when the ship changed). */
  refresh(save: SaveData): void {
    const show = !!save.sanctum?.contact;
    const done = petrelDone(save);
    const stage = PETREL_STAGES[done];
    const frac = stage ? Math.min(1, (save.petrel?.parts ?? 0) / stage.parts) : 0;
    // Redraw in steps of a part, not every frame.
    const sig = `${show}|${done}|${save.petrel?.parts ?? 0}`;
    if (sig === this.sig) return;
    this.sig = sig;
    this.visible = show;
    this.view.visible = this.emissive.visible = this.glow.visible = show;
    // The beacon and the core glow are kept and re-added; everything else is redrawn.
    for (const c of [this.body, this.emBody, this.glowBody])
      for (const ch of c.removeChildren()) if (ch !== this.beacon && ch !== this.coreGlow) ch.destroy({ children: true });
    if (!show) return;
    this.hasCore = done >= 5;
    this.draw(done, frac);
  }

  update(time: number): void {
    if (!this.visible) return;
    const bob = baseWaveHeight(this.x, time) * 0.35 + Math.sin(time * 0.9) * 1.6;
    const tilt = Math.sin(time * 0.6) * 0.012;
    this.y = DECK_Y + bob;
    for (const c of [this.body, this.emBody, this.glowBody]) {
      c.position.set(this.x, this.y);
      c.rotation = tilt;
      c.scale.set(VIEW_SCALE);
    }
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.6);
    this.beacon.alpha = 0.6 + pulse * 0.4;
    if (this.hasCore) this.coreGlow.alpha = 0.55 + 0.45 * Math.sin(time * 1.7);
    // Mooring chain from the platform's keel to the seabed.
    const cg = this.chain.clear();
    const top = { x: this.x - 150 * VIEW_SCALE, y: this.y + 44 * VIEW_SCALE };
    const bot = { x: this.x - 230, y: this.floorY - 4 };
    const mid = { x: (top.x + bot.x) / 2 + Math.sin(time * 0.8) * 10, y: (top.y + bot.y) / 2 + 30 };
    cg.moveTo(top.x, top.y).quadraticCurveTo(mid.x, mid.y, bot.x, bot.y).stroke({ color: STEEL_DARK, width: 4.4, cap: 'round' });
    cg.moveTo(top.x, top.y).quadraticCurveTo(mid.x, mid.y, bot.x, bot.y).stroke({ color: BRASS_DARK, width: 1.4, alpha: 0.7, cap: 'round' });
    cg.circle(bot.x, bot.y, 7).fill({ color: STEEL_DARK }).stroke({ color: BRASS, width: 2 });
  }

  // -------------------------------------------------------------------------

  private draw(done: number, frac: number): void {
    const art = getPropArt().landmarks as Partial<Record<PetrelTexKey, Texture>>;
    const shipTex = done > 0 ? art[`petrel_${done}` as PetrelTexKey] : undefined;
    const platformTex = art.petrel_platform;

    // Before the first girder: only a marker buoy where the platform will float.
    if (done === 0 && frac <= 0) {
      this.drawMarker();
      return;
    }

    // The platform (painted, or drawn; during stage 1 it assembles as parts arrive).
    if (platformTex) this.addSprite(platformTex, 0, 46, DECK_HALF * 2 + 40);
    else this.drawPlatform(done > 0 ? 1 : Math.min(1, frac * 2));

    // The ship: the painted stage image when there is one, otherwise drawn system by system.
    if (shipTex) {
      this.addSprite(shipTex, 0, 2, SHIP_HALF * 2 + 120);
    } else {
      const g = new Graphics();
      this.body.addChild(g);
      const frameFrac = done > 0 ? 1 : Math.max(0, frac * 2 - 1);
      if (frameFrac > 0) this.drawFrame(g, frameFrac);
      if (done >= 1) this.drawShield(g, done > 1 ? 1 : frac);
      if (done >= 2) this.drawLifeSupport(g, done > 2 ? 1 : frac);
      if (done >= 3) this.drawNav(g, done > 3 ? 1 : frac);
      if (done >= 4) this.drawCore(done > 4 ? 1 : frac);
      // Scaffolding round the section being built.
      if (done < 5 && done >= 1) this.drawScaffold(g, done);
    }
    this.drawLamps(done);
    const label = new Text({ text: 'PETREL', style: { fontFamily: 'monospace', fontSize: 9, fontWeight: 'bold', fill: BRASS_LIGHT, letterSpacing: 2 } });
    label.anchor.set(0.5);
    label.position.set(DECK_HALF - 64, 10);
    this.body.addChild(label);
  }

  private addSprite(tex: Texture, x: number, bottomY: number, width: number): void {
    const spr = new Sprite(tex);
    spr.anchor.set(0.5, 1);
    spr.scale.set(width / Math.max(1, tex.width));
    spr.position.set(x, bottomY);
    this.body.addChild(spr);
  }

  private drawMarker(): void {
    const g = new Graphics();
    g.ellipse(0, 16, 26, 7).fill({ color: 0x0d1a20, alpha: 0.35 });
    g.roundRect(-16, -6, 32, 24, 8).fill(STEEL).stroke({ color: INK, width: 2 });
    g.rect(-16, 2, 32, 5).fill(BRASS);
    g.moveTo(0, -6).lineTo(0, -40).stroke({ color: STEEL_LIGHT, width: 3 });
    g.moveTo(0, -40).lineTo(18, -34).lineTo(0, -28).fill({ color: BRASS });
    this.body.addChild(g);
    this.beacon.clear().circle(0, -42, 3.5).fill({ color: AMBER });
    this.emBody.addChild(this.beacon);
    const halo = new Graphics().circle(0, -42, 22).fill({ color: AMBER, alpha: 0.3 });
    this.glowBody.addChild(halo);
  }

  private drawPlatform(t: number): void {
    const g = new Graphics();
    this.body.addChild(g);
    const half = DECK_HALF * (0.45 + 0.55 * t);
    // Watercolor wash shadow on the water.
    g.ellipse(0, 30, half + 30, 18).fill({ color: 0x0b1820, alpha: 0.28 });
    // Pontoons (half under water), riveted gunmetal with brass bands.
    for (const px of [-half + 40, 0, half - 40]) {
      if (t < 0.4 && px !== 0) continue;
      g.roundRect(px - 44, 6, 88, 38, 18).fill(STEEL_DARK).stroke({ color: INK, width: 2 });
      g.roundRect(px - 40, 9, 80, 9, 5).fill({ color: STEEL_LIGHT, alpha: 0.45 });
      for (const bx of [-24, 24]) g.rect(px + bx - 3, 6, 6, 38).fill(BRASS_DARK);
      for (let rx = -34; rx <= 34; rx += 11) g.circle(px + rx, 26, 1.3).fill(BRASS_LIGHT);
    }
    // Deck.
    g.rect(-half, -6, half * 2, 14).fill(STEEL).stroke({ color: INK, width: 2 });
    g.rect(-half, -6, half * 2, 3).fill({ color: STEEL_LIGHT, alpha: 0.6 });
    g.rect(-half, 5, half * 2, 3).fill(BRASS);
    for (let x = -half + 10; x < half; x += 18) g.circle(x, 1, 1.4).fill(BRASS_LIGHT);
    // Railing.
    if (t > 0.6) {
      for (let x = -half + 6; x <= half - 6; x += 30) g.moveTo(x, -6).lineTo(x, -24).stroke({ color: BRASS_DARK, width: 2 });
      g.moveTo(-half + 6, -24).lineTo(half - 6, -24).stroke({ color: BRASS, width: 2.4 });
    }
    // The launch cradle at the centre: a brass ring the ship stands in.
    g.ellipse(0, -6, SHIP_HALF + 18, 7).fill(BRASS_DARK).stroke({ color: INK, width: 1.6 });
    g.ellipse(0, -8, SHIP_HALF + 12, 4).fill({ color: BRASS_LIGHT, alpha: 0.5 });
    // Gantry tower on the west side (a riveted lattice), once the deck is down.
    if (t >= 1) this.drawGantry(g, -SHIP_HALF - 70);
  }

  private drawGantry(g: Graphics, x: number): void {
    const top = -SHIP_H - 10;
    g.rect(x - 12, top, 24, -top - 6).fill({ color: STEEL_DARK, alpha: 0.92 }).stroke({ color: INK, width: 2 });
    for (let y = -16; y > top + 10; y -= 26) {
      g.moveTo(x - 12, y).lineTo(x + 12, y - 26).stroke({ color: STEEL_LIGHT, width: 1.6, alpha: 0.7 });
      g.moveTo(x + 12, y).lineTo(x - 12, y - 26).stroke({ color: STEEL_LIGHT, width: 1.6, alpha: 0.7 });
      g.moveTo(x - 12, y).lineTo(x + 12, y).stroke({ color: BRASS, width: 1.4 });
    }
    // Swing arms to the ship.
    for (const y of [-110, -230]) g.rect(x + 12, y - 4, SHIP_HALF + 70 - 12 - SHIP_HALF + 8, 8).fill(BRASS_DARK).stroke({ color: INK, width: 1.4 });
    g.rect(x - 16, top - 8, 32, 8).fill(BRASS).stroke({ color: INK, width: 1.6 });
  }

  /** The hull's half-width at height h above the deck (a tall, round-shouldered body with a pointed nose). */
  private hullHalf(h: number): number {
    const u = h / SHIP_H;
    if (u > 0.78) return SHIP_HALF * Math.sqrt(Math.max(0, 1 - ((u - 0.78) / 0.22) ** 2));
    return SHIP_HALF * (0.86 + 0.14 * Math.sin(Math.min(1, u / 0.3) * Math.PI * 0.5));
  }

  private hullPoly(h0: number, h1: number): number[] {
    const pts: number[] = [];
    for (let h = h0; h <= h1; h += 6) pts.push(-this.hullHalf(h), -h);
    for (let h = h1; h >= h0; h -= 6) pts.push(this.hullHalf(h), -h);
    return pts;
  }

  /** Rounded-body shading for a hull band: a soft light down the left, a wash of shadow down the right. */
  private shade(g: Graphics, h0: number, h1: number): void {
    const left: number[] = [];
    const right: number[] = [];
    for (let h = h0; h <= h1; h += 6) {
      const w = this.hullHalf(h);
      left.push(-w * 0.72, -h);
      right.push(w * 0.38, -h);
    }
    for (let h = h1; h >= h0; h -= 6) {
      const w = this.hullHalf(h);
      left.push(-w * 0.38, -h);
      right.push(w, -h);
    }
    g.poly(left).fill({ color: 0xffffff, alpha: 0.1 });
    g.poly(right).fill({ color: 0x05080a, alpha: 0.32 });
  }

  /** Stage 1: the bare girder frame, rising from the cradle. */
  private drawFrame(g: Graphics, t: number): void {
    const top = SHIP_H * t;
    for (const sx of [-1, -0.45, 0.45, 1]) {
      const pts: number[] = [];
      for (let h = 0; h <= top; h += 8) pts.push(sx * this.hullHalf(h), -h);
      for (let i = 0; i + 3 < pts.length; i += 2) g.moveTo(pts[i], pts[i + 1]).lineTo(pts[i + 2], pts[i + 3]);
      g.stroke({ color: STEEL_LIGHT, width: 3 });
    }
    for (let h = 20; h < top; h += 34) {
      const w = this.hullHalf(h);
      g.moveTo(-w, -h).lineTo(w, -h).stroke({ color: BRASS_DARK, width: 2.4 });
    }
  }

  /** Stage 2: heat tiles round the lower hull and three engine bells under it. */
  private drawShield(g: Graphics, t: number): void {
    const h1 = 110 * t;
    if (h1 < 4) return;
    g.poly(this.hullPoly(0, h1)).fill(TILE);
    // Overlapping tiles in offset rows, like roof slates, with only a faint seam between them.
    let row = 0;
    for (let h = 8; h < h1 - 2; h += 13, row++) {
      const w = this.hullHalf(h) - 2;
      for (let x = -w + (row % 2 ? 7 : 0); x < w; x += 14) {
        const x0 = Math.max(-w, x - 7);
        const x1 = Math.min(w, x + 7);
        g.roundRect(x0, -h - 6, x1 - x0, 12, 3).fill({ color: (row * 7 + Math.round(x)) % 5 === 0 ? TILE_LIGHT : TILE, alpha: 0.9 }).stroke({ color: 0x3a2e20, width: 0.7, alpha: 0.45 });
      }
    }
    this.shade(g, 0, h1);
    g.poly(this.hullPoly(0, h1)).stroke({ color: INK, width: 2 });
    g.rect(-this.hullHalf(h1), -h1 - 3, this.hullHalf(h1) * 2, 5).fill(BRASS).stroke({ color: INK, width: 0.8 });
    if (t >= 1)
      for (const bx of [-26, 0, 26]) {
        g.poly([bx - 9, -6, bx + 9, -6, bx + 14, 10, bx - 14, 10]).fill(BRASS_DARK).stroke({ color: INK, width: 1.6 });
        g.ellipse(bx, 10, 14, 3).fill({ color: 0x2a1a10 });
      }
  }

  /** Stage 3: the riveted gunmetal mid hull with the air garden's amber portholes. */
  private drawLifeSupport(g: Graphics, t: number): void {
    const h0 = 110;
    const h1 = h0 + 120 * t;
    if (h1 - h0 < 4) return;
    g.poly(this.hullPoly(h0, h1)).fill(STEEL);
    // Plate seams.
    for (let h = h0 + 14; h < h1; h += 20) {
      const w = this.hullHalf(h);
      for (let x = -w + 12; x < w - 6; x += 22) g.moveTo(x, -h + 10).lineTo(x, -h - 10).stroke({ color: STEEL_DARK, width: 0.8, alpha: 0.6 });
    }
    this.shade(g, h0, h1);
    g.poly(this.hullPoly(h0, h1)).stroke({ color: INK, width: 2 });
    for (let h = h0 + 30; h < h1; h += 40) {
      const w = this.hullHalf(h);
      g.rect(-w, -h - 2, w * 2, 4).fill(BRASS);
      for (let x = -w + 6; x < w; x += 10) g.circle(x, -h, 1.1).fill(BRASS_LIGHT);
    }
    if (t >= 0.6) {
      // Above and below the heart window, where the Choir core goes in stage 5.
      for (const py of [h0 + 24, h0 + 96]) {
        g.circle(-18, -py, 9).fill(BRASS).stroke({ color: INK, width: 1.4 });
        g.circle(18, -py, 9).fill(BRASS).stroke({ color: INK, width: 1.4 });
        const win = new Graphics();
        win.circle(-18, -py, 6).fill({ color: AMBER });
        win.circle(18, -py, 6).fill({ color: AMBER });
        this.emBody.addChild(win);
        const halo = new Graphics();
        halo.circle(-18, -py, 18).fill({ color: AMBER, alpha: 0.28 });
        halo.circle(18, -py, 18).fill({ color: AMBER, alpha: 0.28 });
        this.glowBody.addChild(halo);
        g.circle(-18, -py, 6).fill({ color: 0x3a3018 });
        g.circle(18, -py, 6).fill({ color: 0x3a3018 });
      }
    }
  }

  /** Stage 4: the nose, with the dome viewport and the brass star-telescope. */
  private drawNav(g: Graphics, t: number): void {
    const h0 = 230;
    const h1 = h0 + (SHIP_H - h0) * t;
    if (h1 - h0 < 4) return;
    g.poly(this.hullPoly(h0, h1)).fill(STEEL);
    this.shade(g, h0, h1);
    g.poly(this.hullPoly(h0, h1)).stroke({ color: INK, width: 2 });
    g.rect(-this.hullHalf(h0) - 1, -h0 - 3, this.hullHalf(h0) * 2 + 2, 6).fill(BRASS).stroke({ color: INK, width: 1 });
    if (t >= 0.5) {
      // The dome viewport: the base kit's signature glass.
      g.ellipse(0, -h0 - 34, 22, 18).fill(BRASS).stroke({ color: INK, width: 1.6 });
      g.ellipse(0, -h0 - 34, 17, 14).fill({ color: 0x9fd6c8, alpha: 0.75 });
      g.moveTo(-17, -h0 - 34).lineTo(17, -h0 - 34).stroke({ color: BRASS, width: 1.4 });
      g.moveTo(0, -h0 - 48).lineTo(0, -h0 - 20).stroke({ color: BRASS, width: 1.4 });
      g.ellipse(-6, -h0 - 40, 5, 3).fill({ color: 0xffffff, alpha: 0.45 });
    }
    if (t >= 1) {
      g.moveTo(0, -SHIP_H).lineTo(0, -SHIP_H - 30).stroke({ color: STEEL_LIGHT, width: 3 });
      g.circle(0, -SHIP_H - 32, 4).fill(BRASS).stroke({ color: INK, width: 1.2 });
      // Brass star-telescope on the shoulder.
      g.roundRect(this.hullHalf(h0 + 20) - 4, -h0 - 30, 30, 9, 4).fill(BRASS).stroke({ color: INK, width: 1.4 });
      g.circle(this.hullHalf(h0 + 20) + 26, -h0 - 25.5, 5).fill({ color: 0x9fd6c8 }).stroke({ color: INK, width: 1.2 });
      // Fins.
      for (const s of [-1, 1]) g.poly([s * SHIP_HALF * 0.86, -10, s * (SHIP_HALF + 30), 6, s * (SHIP_HALF + 26), -70, s * SHIP_HALF * 0.9, -90]).fill(STEEL_DARK).stroke({ color: INK, width: 2 });
    }
  }

  /** Stage 5: the Choir core, a ring of living light seen through the heart window. */
  private drawCore(t: number): void {
    const g = new Graphics();
    const cy = -170;
    g.circle(0, cy, 22).fill(BRASS).stroke({ color: INK, width: 2 });
    g.circle(0, cy, 17).fill({ color: 0x0b1420 });
    this.body.addChild(g);
    const ring = new Graphics();
    const k = Math.max(0.15, t);
    ring.ellipse(0, cy, 13 * k, 6 * k).stroke({ color: 0x6ff3ff, width: 2.6 });
    ring.ellipse(0, cy, 6 * k, 13 * k).stroke({ color: 0xb07cff, width: 2.2 });
    ring.circle(0, cy, 3 * k).fill({ color: 0xff6ad5 });
    this.emBody.addChild(ring);
    this.coreGlow.clear().circle(0, cy, 40 * k).fill({ color: 0x8ad8ff, alpha: 0.32 }).circle(0, cy, 20 * k).fill({ color: 0xd8b0ff, alpha: 0.35 });
    this.glowBody.addChild(this.coreGlow);
  }

  private drawScaffold(g: Graphics, done: number): void {
    const bands: Record<number, [number, number]> = { 1: [0, 110], 2: [110, 230], 3: [230, SHIP_H], 4: [150, 190] };
    const [h0, h1] = bands[done] ?? [0, 0];
    const x = SHIP_HALF + 10;
    for (const s of [-1, 1]) {
      g.moveTo(s * x, -h0).lineTo(s * x, -h1 - 10).stroke({ color: BRASS_DARK, width: 2, alpha: 0.8 });
      for (let h = h0; h < h1; h += 22) g.moveTo(s * x, -h).lineTo(s * (x - 10), -h - 11).stroke({ color: BRASS_DARK, width: 1.2, alpha: 0.7 });
    }
  }

  private drawLamps(done: number): void {
    const lamps: [number, number][] = [[-DECK_HALF + 14, -30], [DECK_HALF - 14, -30]];
    if (done >= 1) lamps.push([-SHIP_HALF - 70, -SHIP_H - 22]);
    const em = new Graphics();
    const halo = new Graphics();
    for (const [x, y] of lamps) {
      em.circle(x, y, 3.2).fill({ color: AMBER });
      halo.circle(x, y, 20).fill({ color: AMBER, alpha: 0.3 });
    }
    this.emBody.addChild(em);
    this.glowBody.addChild(halo);
    this.beacon.clear().circle(done >= 1 ? -SHIP_HALF - 70 : 0, done >= 1 ? -SHIP_H - 22 : -30, 4).fill({ color: 0xff8a4a });
    this.emBody.addChild(this.beacon);
  }
}
