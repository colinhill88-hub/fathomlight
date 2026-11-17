import { Container, Graphics, Text } from 'pixi.js';
import { mulberry32, WORLD_SEED } from '../rng';
import { isSolid, WORLD_W, WORLD_X0 } from '../world/terrain';
import type { Light } from '../fx/lighting';
import type { SubModule } from '../game/state';

/**
 * The submersible KS-1 (milestone 6), drawn with code and driven like a
 * heavy machine: it takes a moment to get going and to stop, the hull tilts
 * with the climb, and the thrusters (Boost) push it to about twice the
 * diver's speed for a short burst.
 *
 * The look follows the art direction: a stubby Kestrel hull in weathered
 * muted yellow over a steel belly with a rust-red band, rivets, panel
 * seams, stencils, rust streaks and algae, a ducted propeller at the stern
 * and the signature glass dome over the cockpit, with the pilot (the
 * explorer in their lime-glass helmet) visible inside. Fitted modules show
 * on the hull: a cargo pod under the belly, twin bow floodlights and a
 * folding grabber arm under the chin. Dents and cracks show as the hull
 * takes damage.
 *
 * Local space: (0, 0) is the middle of the hull, +x is the bow.
 */

const PAL = {
  steel: 0x5b6467,
  steelLight: 0x8a9496,
  steelDark: 0x3b4448,
  steelDeep: 0x262d30,
  yellow: 0xb8923f,
  yellowLight: 0xd0aa58,
  yellowDark: 0x7f6430,
  rust: 0xa8402e,
  rustDark: 0x6e2a1f,
  streak: 0x8a3a20,
  algae: 0x5e7a3c,
  algaeLight: 0x8aa154,
  glass: 0x86b3ae,
  brass: 0xa88a4a,
  visor: 0xb6e23a,
  skin: 0x9a7058,
  charcoal: 0x2c2f31,
};

/** Hull capsule: x from -108 to 110, y from -24 to 34. */
const HX0 = -108;
const HX1 = 110;
const HY0 = -24;
const HY1 = 34;
/** Where the hull's yellow paint meets the steel belly. */
const BELT = 8;
/** The dome: centre and radius (it sits on a collar ring on the hull top). */
const DOME = { x: 40, y: -26, r: 38 };
/** The grabber arm's shoulder, under the bow. */
const SHOULDER = { x: 72, y: 32 };
const UPPER = 30;
const FORE = 28;

let rand = mulberry32(1);
const R = (a: number, b: number) => a + rand() * (b - a);

function capsule(x0: number, x1: number, y0: number, y1: number, n = 48): number[] {
  const r = (y1 - y0) / 2;
  const cy = (y0 + y1) / 2;
  const pts: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI;
    pts.push(x1 - r + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 + (i / n) * Math.PI;
    pts.push(x0 + r + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return pts;
}

/** The same outline with y pushed into [lo, hi]: the part of the hull above or below a line. */
function clampY(pts: number[], lo: number, hi: number): number[] {
  return pts.map((v, i) => (i % 2 ? Math.max(lo, Math.min(hi, v)) : v));
}

function rivets(g: Graphics, x0: number, y0: number, x1: number, y1: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    g.circle(x, y, 1.4).fill({ color: 0x2f373a });
    g.circle(x - 0.4, y - 0.5, 0.6).fill({ color: 0xd0d6d6, alpha: 0.7 });
  }
}

function dab(g: Graphics, x: number, y: number, rx: number, ry: number, color: number, alpha: number): void {
  g.ellipse(x, y, rx, ry).fill({ color, alpha: alpha * 0.5 });
  g.ellipse(x, y, rx * 0.65, ry * 0.65).fill({ color, alpha: alpha * 0.6 });
}

function stencil(text: string, x: number, y: number, size: number): Text {
  const t = new Text({
    text,
    style: { fontFamily: 'Courier New, monospace', fontSize: size, fontWeight: 'bold', fill: 0x221e16, letterSpacing: 0.6 },
    resolution: 6,
  });
  t.anchor.set(0.5);
  t.position.set(x, y);
  t.alpha = 0.62;
  return t;
}

export interface SubUpdate {
  /** Stick direction, -1..1. Zero when nobody is piloting. */
  moveX: number;
  moveY: number;
  /** Boost pressed this frame (thrusters). */
  boost: boolean;
  piloted: boolean;
  /** Ease into this spot (a dock's berth) and hold still there. */
  hold: { x: number; y: number } | null;
}

export class Sub {
  /** Lit art, in the world. */
  readonly view = new Container();
  readonly emissive = new Container();
  readonly glow = new Container();
  /** Lights it casts on the scene (bow lamp or floodlights, cabin glow). */
  readonly lights: Light[] = [];

  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  face = 1;
  pitch = 0;
  /** Seconds of thruster burst left. */
  thrust = 0;
  /** True while near enough the surface to breathe through the snorkel. */
  surfaced = false;

  private body = new Container();
  private eBody = new Container();
  private gBody = new Container();
  private faceAnim = 1;
  private time = 0;
  private prop = new Graphics();
  private dents = new Graphics();
  private domeCrack = new Graphics();
  private cargoG = new Container();
  private lightsG = new Container();
  private lightsE = new Container();
  private lightsGlow = new Container();
  private arm = new Container();
  private upperG = new Container();
  private foreG = new Container();
  private claw = new Graphics();
  private navLens = new Graphics();
  private navHalo = new Graphics();
  private tailLamp = new Graphics();
  private tailHalo = new Graphics();
  private screen = new Graphics();
  private screenGlow = new Graphics();
  private portLit = new Graphics();
  private floodLens = new Graphics();
  private floodHalo = new Graphics();
  private frameMask = new Graphics();
  private scaffold = new Graphics();
  private seam = new Graphics();
  private seamGlow = new Graphics();
  private armAngles = { upper: 2.85, fore: -2.9 };
  private lampLight: Light = { x: 0, y: 0, radius: 520, intensity: 0, color: [1, 0.9, 0.74], coneCos: 0.88, coneSoft: 0.12, haze: 0.3, shadow: true };
  /** The pilot in the cabin, and how far in they are (0 = empty, 1 = seated). */
  private pilot = new Graphics();
  private pilotLevel = 0;
  private cabinLight: Light = { x: 0, y: 0, radius: 150, intensity: 0, color: [1, 0.86, 0.6] };
  private lightLevel = 0;
  private wasFrame = false;

  constructor() {
    rand = mulberry32(WORLD_SEED ^ 0x5b1);
    this.view.addChild(this.body);
    this.emissive.addChild(this.eBody);
    this.glow.addChild(this.gBody);
    this.drawStern();
    this.drawHull();
    this.drawCockpit();
    this.drawModules();
    this.body.addChild(this.dents, this.domeCrack);
    this.drawDamage();
    this.body.addChild(this.frameMask);
    this.view.addChild(this.scaffold);
    this.eBody.addChild(this.navLens, this.tailLamp, this.screen, this.portLit, this.lightsE, this.seam);
    this.gBody.addChild(this.navHalo, this.tailHalo, this.screenGlow, this.lightsGlow, this.seamGlow);
    this.lights.push(this.lampLight, this.cabinLight);
  }

  // ---------------------------------------------------------------------------
  // Drawing (once)
  // ---------------------------------------------------------------------------

  private drawStern(): void {
    const g = new Graphics();
    // Tail cone to the propeller duct.
    g.poly([HX0 + 6, HY0 + 8, HX0 - 22, -8, HX0 - 22, 18, HX0 + 6, HY1 - 6]).fill({ color: PAL.steel });
    g.poly([HX0 + 6, HY0 + 8, HX0 - 22, -8, HX0 - 22, -3, HX0 + 6, HY0 + 14]).fill({ color: 0xffffff, alpha: 0.1 });
    // Dorsal fin and stabilisers.
    g.poly([-96, HY0 + 1, -76, HY0 + 1, -100, HY0 - 24, -110, HY0 - 21]).fill({ color: PAL.yellow });
    g.poly([-96, HY0 + 1, -100, HY0 - 24, -104, HY0 - 22, -100, HY0 + 1]).fill({ color: 0xffffff, alpha: 0.12 });
    rivets(g, -98, HY0 - 2, -106, HY0 - 18, 4);
    g.poly([-100, 10, -74, 10, -112, 22, -122, 20]).fill({ color: PAL.steelDark });
    // The duct ring around the propeller.
    g.roundRect(HX0 - 38, -24, 16, 50, 6).fill({ color: PAL.steelDark });
    g.roundRect(HX0 - 37, -23, 4, 48, 2).fill({ color: 0xffffff, alpha: 0.12 });
    g.rect(HX0 - 38, -6, 16, 4).fill({ color: PAL.yellow });
    rivets(g, HX0 - 30, -20, HX0 - 30, 22, 6);
    this.body.addChild(g);
    // The propeller spins inside the duct (redrawn each frame).
    this.body.addChild(this.prop);
  }

  private drawHull(): void {
    const g = new Graphics();
    const out = capsule(HX0, HX1, HY0, HY1);
    // Steel belly and yellow upper hull, split at the belt line.
    g.poly(out).fill({ color: PAL.steel });
    g.poly(clampY(out, HY0, BELT)).fill({ color: PAL.yellow });
    g.poly(clampY(out, HY0, HY0 + 7)).fill({ color: PAL.yellowLight, alpha: 0.55 });
    g.poly(clampY(out, HY1 - 9, HY1)).fill({ color: PAL.steelDeep, alpha: 0.5 });
    // Rust-red band on the belt line.
    g.poly(clampY(clampY(out, BELT - 2, BELT + 5), BELT - 2, BELT + 5)).fill({ color: PAL.rust });
    g.rect(HX0 + 14, BELT - 2, HX1 - HX0 - 28, 1.2).fill({ color: 0xffffff, alpha: 0.14 });
    rivets(g, HX0 + 18, BELT + 1.5, HX1 - 18, BELT + 1.5, 22);
    // Panel seams with rivet rows.
    for (const sx of [-72, -24, 24, 74]) {
      g.moveTo(sx, HY0 + 3).lineTo(sx, HY1 - 3).stroke({ color: PAL.steelDeep, width: 1, alpha: 0.6 });
      rivets(g, sx + 3, HY0 + 6, sx + 3, BELT - 5, 4);
      rivets(g, sx + 3, BELT + 9, sx + 3, HY1 - 6, 3);
    }
    // Hazard stripes by the stern.
    for (let x = -100; x < -80; x += 7) g.poly([x, HY0 + 6, x + 4, HY0 + 6, x + 1, BELT - 3, x - 3, BELT - 3]).fill({ color: 0x2a2418, alpha: 0.55 });
    // Portholes along the side.
    for (const px of [-54, -36]) {
      g.circle(px, -6, 7.5).fill({ color: PAL.brass });
      g.circle(px, -6, 5.2).fill({ color: 0x1c2a2e });
      g.circle(px - 1.6, -7.8, 1.8).fill({ color: 0xffffff, alpha: 0.25 });
      this.portLit.circle(px, -6, 4.6).fill({ color: 0xffe2a8, alpha: 0.8 });
    }
    // Bow nav lamp housing.
    g.roundRect(HX1 - 9, -2, 10, 12, 3).fill({ color: PAL.steelDark });
    this.navLens.circle(HX1 - 3, 4, 3).fill({ color: 0xfff1d0 });
    this.navHalo.circle(HX1 - 1, 4, 14).fill({ color: 0xffe6b0, alpha: 0.7 });
    // Hatch on the hull top behind the dome, with a hand wheel.
    g.roundRect(-14, HY0 - 4, 24, 6, 2).fill({ color: PAL.steelDark });
    g.circle(-2, HY0 - 6, 4).stroke({ color: PAL.rust, width: 1.4 });
    // Snorkel mast and tail lamp.
    g.rect(-30, HY0 - 18, 4, 18).fill({ color: PAL.steelDark });
    g.rect(-32, HY0 - 20, 9, 4).fill({ color: PAL.steel });
    g.circle(-104, HY0 - 22, 2.2).fill({ color: PAL.steelDark });
    this.tailLamp.circle(-104, HY0 - 22, 1.8).fill({ color: 0xff6a4a });
    this.tailHalo.circle(-104, HY0 - 22, 8).fill({ color: 0xff5a3a, alpha: 0.6 });
    // Skids.
    for (const sx of [-58, 40]) {
      g.rect(sx - 2, HY1 - 4, 4, 14).fill({ color: PAL.steelDark });
    }
    g.roundRect(-76, HY1 + 8, 136, 5, 2.5).fill({ color: PAL.steelDark });
    g.roundRect(-76, HY1 + 8, 136, 1.5, 1).fill({ color: 0xffffff, alpha: 0.12 });
    // Weathering: streaks, scratches, algae.
    for (let i = 0; i < 16; i++) {
      const sx = R(HX0 + 16, HX1 - 20);
      const sy = R(HY0 + 4, BELT + 4);
      g.moveTo(sx, sy).lineTo(sx + R(-1, 1), sy + R(6, 18)).stroke({ color: PAL.streak, width: R(0.8, 1.8), alpha: R(0.3, 0.6) });
    }
    for (let i = 0; i < 18; i++) {
      const x = R(HX0 + 14, HX1 - 14);
      const y = R(HY0 + 4, HY1 - 4);
      const a = R(-0.5, 0.5);
      const l = R(4, 11);
      g.moveTo(x, y).lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l).stroke({ color: 0xd8dcd6, width: 0.7, alpha: R(0.18, 0.38) });
    }
    for (let i = 0; i < 22; i++) dab(g, R(HX0 + 18, HX1 - 22), R(HY1 - 7, HY1 - 1), R(3, 8), R(1.4, 3), rand() < 0.6 ? PAL.algae : PAL.algaeLight, 0.75);
    for (let i = 0; i < 6; i++) dab(g, R(-70, 40), HY1 + 11, R(3, 6), R(1, 2), PAL.algae, 0.7);
    this.body.addChild(g);
    this.stencils.push(stencil('KS-1', 2, -10, 11), stencil('KESTREL', 2, 1, 5));
    this.body.addChild(...this.stencils);
  }

  private drawCockpit(): void {
    let g = new Graphics();
    const { x, y, r } = DOME;
    // Collar ring the dome sits in.
    g.roundRect(x - r - 5, y - 2, 2 * r + 10, 10, 3).fill({ color: PAL.steelDark });
    g.roundRect(x - r - 5, y - 2, 2 * r + 10, 2.5, 1).fill({ color: 0xffffff, alpha: 0.15 });
    rivets(g, x - r - 1, y + 3, x + r + 1, y + 3, 12);
    // Inside: dark cabin, a seat, the pilot and the console.
    g.moveTo(x - r + 1, y - 1).arc(x, y - 1, r - 1, Math.PI, 0).closePath().fill({ color: 0x14232a, alpha: 0.85 });
    // Seated low in the cabin, so the whole helmet (crest included) stays inside the glass.
    g.roundRect(x - 24, y - 28, 9, 27, 3).fill({ color: PAL.rustDark });
    g.roundRect(x - 24, y - 28, 3, 27, 1).fill({ color: 0xffffff, alpha: 0.1 });
    // Pilot (shown only while someone is aboard; after milestone 7b they climb in through the hatch):
    // charcoal shoulders, a grey sleeve to the controls, helmet with lime glass and a crest fin.
    this.body.addChild(g);
    const gCabin = g;
    g = this.pilot;
    g.roundRect(x - 16, y - 13, 24, 13, 6).fill({ color: PAL.charcoal });
    g.moveTo(x - 12, y - 9).lineTo(x + 5, y - 9).stroke({ color: PAL.brass, width: 0.7, alpha: 0.6 });
    g.roundRect(x - 1, y - 8, 21, 5, 2.5).fill({ color: 0x7c8487 });
    g.circle(x + 20, y - 5.5, 2.6).fill({ color: PAL.rust });
    // Chrome collar yoke.
    g.roundRect(x - 12, y - 15, 18, 5, 2.5).fill({ color: 0x9fb2c0 });
    // Head inside the helmet: hair, face in profile (looking ahead).
    const k = 0.82;
    const hx = x - 3;
    const hy = y - 23;
    g.circle(hx, hy, 8 * k).fill({ color: PAL.skin });
    g.moveTo(hx - 8 * k, hy - 1 * k).arc(hx, hy, 8 * k, Math.PI, -0.2).lineTo(hx + 2 * k, hy - 2 * k).closePath().fill({ color: 0x3a2a20 });
    g.poly([hx + 7 * k, hy - 1 * k, hx + 10.5 * k, hy + 2 * k, hx + 7.5 * k, hy + 3.5 * k]).fill({ color: PAL.skin });
    g.circle(hx + 4.5 * k, hy - 1 * k, 0.9).fill({ color: 0x1a1410 });
    g.moveTo(hx + 5 * k, hy + 5 * k).lineTo(hx + 8 * k, hy + 4.6 * k).stroke({ color: 0x5a3a30, width: 0.7 });
    // Helmet glass and crest (top of the crest is about 13.5 above hy: well inside the dome).
    g.circle(hx + 1, hy, 10.5).fill({ color: PAL.visor, alpha: 0.32 });
    g.circle(hx + 1, hy, 10.5).stroke({ color: 0x6a8a2a, width: 1.1, alpha: 0.8 });
    g.poly([hx - 7.5, hy - 7.5, hx + 3.5, hy - 11.5, hx + 8.5, hy - 9, hx - 3.5, hy - 13]).fill({ color: PAL.visor, alpha: 0.55 });
    g.circle(hx + 4.5, hy - 4, 2).fill({ color: 0xffffff, alpha: 0.35 });
    this.body.addChild(this.pilot);
    void gCabin;
    g = new Graphics();
    // Console with a lit screen.
    g.roundRect(x + 18, y - 18, 16, 18, 3).fill({ color: PAL.steelDark });
    this.screen.roundRect(x + 21, y - 15, 10, 6, 1).fill({ color: 0xffd98a, alpha: 0.9 });
    this.screen.circle(x + 24, y - 5, 1.2).fill({ color: 0xb8e07a });
    this.screenGlow.roundRect(x + 14, y - 22, 26, 22, 6).fill({ color: 0xffd090, alpha: 0.35 });
    // The glass: tinted, with ribs and a bright sheen.
    g.moveTo(x - r, y).arc(x, y, r, Math.PI, 0).closePath().fill({ color: PAL.glass, alpha: 0.24 });
    g.moveTo(x - r, y).arc(x, y, r, Math.PI, 0).stroke({ color: PAL.steelDark, width: 2.4 });
    g.moveTo(x, y - r).lineTo(x, y).stroke({ color: PAL.steelDark, width: 1.2, alpha: 0.7 });
    g.moveTo(x - r * 0.62, y - r * 0.78).quadraticCurveTo(x - r * 0.72, y - r * 0.3, x - r * 0.7, y).stroke({ color: PAL.steelDark, width: 1, alpha: 0.6 });
    g.moveTo(x + r * 0.62, y - r * 0.78).quadraticCurveTo(x + r * 0.72, y - r * 0.3, x + r * 0.7, y).stroke({ color: PAL.steelDark, width: 1, alpha: 0.6 });
    g.moveTo(x - r * 0.78, y - r * 0.3).arc(x, y, r * 0.84, Math.PI * 1.12, Math.PI * 1.42).stroke({ color: 0xffffff, width: 3, alpha: 0.32 });
    g.moveTo(x + r * 0.2, y - r * 0.86).arc(x, y, r * 0.9, Math.PI * 1.58, Math.PI * 1.7).stroke({ color: 0xffffff, width: 1.6, alpha: 0.25 });
    // A little algae where glass meets the collar.
    for (let i = 0; i < 6; i++) dab(g, R(x - r, x + r), y - 1, R(2, 5), R(1, 2), PAL.algae, 0.6);
    this.body.addChild(g);
  }

  private drawModules(): void {
    // Cargo pod under the belly, between the skids.
    const c = new Graphics();
    c.roundRect(-64, HY1 - 4, 92, 13, 4).fill({ color: PAL.steel });
    c.roundRect(-64, HY1 - 4, 92, 3, 2).fill({ color: 0xffffff, alpha: 0.12 });
    for (const dx of [-60, -30, 0]) {
      c.roundRect(dx + 2, HY1 - 1, 24, 8, 1.5).fill({ color: PAL.rust });
      c.rect(dx + 13, HY1 - 1, 1.2, 8).fill({ color: PAL.rustDark });
      c.circle(dx + 9, HY1 + 3, 0.9).fill({ color: PAL.steelDeep });
    }
    rivets(c, -60, HY1 + 7, 24, HY1 + 7, 12);
    const cs = stencil('CARGO', -18, HY1 + 3, 4);
    this.stencils.push(cs);
    this.cargoG.addChild(c, cs);
    this.body.addChild(this.cargoG);

    // Twin floodlights on the bow.
    const f = new Graphics();
    for (const [lx, ly] of [
      [HX1 - 18, HY0 + 2],
      [HX1 - 16, HY1 - 10],
    ]) {
      f.rect(lx - 6, ly + 2, 8, 4).fill({ color: PAL.steelDark });
      f.roundRect(lx, ly - 2, 16, 12, 3).fill({ color: PAL.steelDark });
      f.roundRect(lx + 1, ly - 1, 14, 2.5, 1).fill({ color: 0xffffff, alpha: 0.15 });
      f.rect(lx + 2, ly + 7, 10, 1.5).fill({ color: PAL.yellow });
      this.floodLens.roundRect(lx + 12, ly, 4, 8, 1.5).fill({ color: 0xfffaf0 });
      this.floodHalo.ellipse(lx + 18, ly + 4, 16, 12).fill({ color: 0xfff0d0, alpha: 0.8 });
    }
    this.lightsG.addChild(f);
    this.lightsE.addChild(this.floodLens);
    this.lightsGlow.addChild(this.floodHalo);
    this.body.addChild(this.lightsG);

    // Grabber arm: a shoulder housing, two segments and a claw.
    const sh = new Graphics();
    sh.roundRect(SHOULDER.x - 10, SHOULDER.y - 6, 20, 12, 4).fill({ color: PAL.steelDark });
    sh.circle(SHOULDER.x, SHOULDER.y, 5).fill({ color: PAL.steel });
    sh.circle(SHOULDER.x, SHOULDER.y, 2).fill({ color: PAL.steelDeep });
    const up = new Graphics();
    up.roundRect(-3, -4, UPPER + 4, 8, 3).fill({ color: PAL.yellow });
    up.rect(0, -1, UPPER, 2).fill({ color: PAL.yellowDark });
    up.rect(6, 4, UPPER - 12, 2).fill({ color: 0x8a9496 });
    up.circle(UPPER, 0, 4).fill({ color: PAL.steel });
    rivets(up, 4, -2, UPPER - 4, -2, 4);
    this.upperG.addChild(up);
    const fo = new Graphics();
    fo.roundRect(-2, -3, FORE + 2, 6, 2.5).fill({ color: PAL.yellow });
    fo.rect(2, -0.6, FORE - 4, 1.2).fill({ color: PAL.yellowDark });
    fo.circle(0, 0, 2).fill({ color: PAL.steelDeep });
    this.foreG.addChild(fo, this.claw);
    this.claw.position.set(FORE, 0);
    this.drawClaw(0);
    this.upperG.addChild(this.foreG);
    this.foreG.position.set(UPPER, 0);
    this.upperG.position.set(SHOULDER.x, SHOULDER.y);
    this.arm.addChild(sh, this.upperG);
    this.body.addChild(this.arm);
  }

  private drawClaw(open: number): void {
    const g = this.claw.clear();
    g.roundRect(-2, -4, 6, 8, 2).fill({ color: PAL.steelDark });
    const a = 0.25 + open * 0.55;
    for (const s of [-1, 1]) {
      const x1 = 4 + Math.cos(a * s) * 8;
      const y1 = Math.sin(a * s) * 8;
      g.moveTo(3, s * 2).lineTo(x1, y1).lineTo(x1 + 5, y1 - s * 3).stroke({ color: PAL.steelLight, width: 2.2, cap: 'round', join: 'round' });
    }
  }

  private drawDamage(): void {
    const g = this.dents;
    for (let i = 0; i < 9; i++) {
      const x = R(HX0 + 20, HX1 - 24);
      const y = R(HY0 + 6, HY1 - 6);
      const rx = R(4, 9);
      g.ellipse(x, y, rx, rx * 0.6).fill({ color: PAL.steelDeep, alpha: 0.45 });
      g.ellipse(x - rx * 0.3, y - rx * 0.25, rx * 0.5, rx * 0.25).fill({ color: 0xffffff, alpha: 0.12 });
      g.moveTo(x - rx, y).lineTo(x - rx * 0.2, y + 1).stroke({ color: PAL.steelDeep, width: 0.8, alpha: 0.6 });
    }
    for (let i = 0; i < 5; i++) {
      let x = R(HX0 + 20, HX1 - 30);
      let y = R(HY0 + 4, HY1 - 8);
      g.moveTo(x, y);
      for (let j = 0; j < 4; j++) {
        x += R(3, 8);
        y += R(-4, 4);
        g.lineTo(x, y);
      }
      g.stroke({ color: 0x14181a, width: 1.1, alpha: 0.8 });
    }
    for (let i = 0; i < 8; i++) {
      const sx = R(HX0 + 20, HX1 - 20);
      g.moveTo(sx, R(HY0 + 6, BELT)).lineTo(sx + R(-1, 1), R(BELT + 6, HY1)).stroke({ color: PAL.streak, width: R(1, 2.2), alpha: 0.6 });
    }
    // A crack across the dome glass.
    const d = this.domeCrack;
    let x = DOME.x - 14;
    let y = DOME.y - 30;
    d.moveTo(x, y);
    for (let j = 0; j < 5; j++) {
      x += R(3, 7);
      y += R(2, 7);
      d.lineTo(x, y);
    }
    d.moveTo(DOME.x - 5, DOME.y - 22).lineTo(DOME.x - 14, DOME.y - 14).lineTo(DOME.x - 18, DOME.y - 6);
    d.stroke({ color: 0xe8f0ec, width: 1, alpha: 0.85 });
  }

  /** Which modules show on the hull. */
  setModules(mods: SubModule[]): void {
    this.cargoG.visible = mods.includes('cargo');
    this.lightsG.visible = this.lightsE.visible = this.lightsGlow.visible = mods.includes('lights');
    this.arm.visible = mods.includes('grabber');
    this.hasFlood = mods.includes('lights');
  }
  private hasFlood = false;

  /** Where the claw tip is (world), for collecting. */
  /** The hatch on top of the dome, where the diver climbs in and out. */
  hatchPoint(): { x: number; y: number } {
    return { x: this.x + this.face * DOME.x, y: this.y + DOME.y - DOME.r - 26 };
  }

  clawPoint(): { x: number; y: number } {
    return { x: this.x + this.face * 108, y: this.y + 62 };
  }

  /** The scanner beam starts at the dome. */
  domePoint(): { x: number; y: number } {
    return { x: this.x + this.face * (DOME.x + 10), y: this.y + DOME.y - 14 };
  }

  /** The tip of the bow (for the scanner and the cave gate). */
  bowX(): number {
    return this.x + this.face * HX1;
  }

  // ---------------------------------------------------------------------------
  // Driving
  // ---------------------------------------------------------------------------

  private static readonly CRUISE = 330;
  private static readonly BOOST = 620;
  private static readonly BURST = 1.6;

  /**
   * Move the sub. Returns how hard it hit rock this frame (world units per
   * second along the hit; 0 for none), so the caller can dent the hull.
   */
  update(dt: number, inp: SubUpdate): number {
    this.time += dt;
    if (inp.boost && inp.piloted) this.thrust = Sub.BURST;
    this.thrust = Math.max(0, this.thrust - dt);
    let impact = 0;
    if (inp.hold) {
      // Docking: the clamps draw it into the berth.
      const k = 1 - Math.exp(-3 * dt);
      this.x += (inp.hold.x - this.x) * k;
      this.y += (inp.hold.y - this.y) * k;
      this.vx *= 1 - k;
      this.vy *= 1 - k;
    } else {
      const top = this.thrust > 0 ? Sub.BOOST : Sub.CRUISE;
      const mx = inp.piloted ? inp.moveX : 0;
      const my = inp.piloted ? inp.moveY : 0;
      const push = Math.min(1, Math.hypot(mx, my));
      let wantX = mx * top;
      let wantY = my * top * 0.8;
      if (this.thrust > 0 && push < 0.2) wantX = this.face * top; // thrusters with no stick: straight ahead
      // Heavy: slow to speed up, slower still to stop.
      const k = 1 - Math.exp(-(push > 0.05 || this.thrust > 0 ? 1.15 : 0.55) * dt);
      this.vx += (wantX - this.vx) * k;
      this.vy += (wantY - this.vy) * k;
      // A gentle bob when idle.
      this.vy += Math.sin(this.time * 0.9) * 4 * dt * (1 - push);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      impact = this.collide();
    }
    this.surfaced = this.y < 78;
    if (this.vx > 40) this.face = 1;
    else if (this.vx < -40) this.face = -1;
    this.faceAnim += (this.face - this.faceAnim) * Math.min(1, dt * 3.2);
    if (Math.abs(this.faceAnim) < 0.06) this.faceAnim = this.face * 0.06;
    const want = inp.hold ? 0 : Math.max(-0.32, Math.min(0.32, Math.atan2(this.vy, Math.abs(this.vx) + 120) * 0.7));
    this.pitch += (want - this.pitch) * Math.min(1, dt * 2.5);
    return impact;
  }

  /** Keep the hull and dome out of rock, sliding along it. Returns the hardest hit speed. */
  private collide(): number {
    let impact = 0;
    const pts: [number, number][] = [];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      pts.push([Math.cos(a) * 118, 6 + Math.sin(a) * (Math.sin(a) > 0 ? 40 : 30)]);
    }
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      pts.push([DOME.x + Math.cos(a) * DOME.r, DOME.y + Math.sin(a) * DOME.r]);
    }
    for (let iter = 0; iter < 8; iter++) {
      let nx = 0;
      let ny = 0;
      let hits = 0;
      for (const [px, py] of pts) {
        const wx = this.x + px * this.face;
        const wy = this.y + py;
        if (isSolid(wx, wy)) {
          const l = Math.hypot(px * this.face, py - 6) || 1;
          nx -= (px * this.face) / l;
          ny -= (py - 6) / l;
          hits++;
        }
      }
      if (!hits) break;
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      if (l < 0.01) ny = -1;
      this.x += nx * 3;
      this.y += ny * 3;
      const vn = this.vx * nx + this.vy * ny;
      if (vn < 0) {
        if (iter === 0) impact = Math.max(impact, -vn);
        this.vx -= nx * vn;
        this.vy -= ny * vn;
        // Scraping along rock slows it down.
        this.vx *= 0.92;
        this.vy *= 0.92;
      }
    }
    // The surface: the dome and snorkel may break it, the hull may not leave the water.
    if (this.y < 62) {
      this.y = 62;
      if (this.vy < 0) this.vy = 0;
    }
    this.x = Math.max(WORLD_X0 + 140, Math.min(WORLD_W - 140, this.x));
    return impact;
  }

  // ---------------------------------------------------------------------------
  // Per-frame look
  // ---------------------------------------------------------------------------

  /**
   * frame: 0..1 while the drone is still welding it (null when built).
   * hull: 0..1 for dents. lightsOn: the bow lamp or floodlights.
   * reach: a world point the grabber is working at, or null.
   */
  draw(dt: number, o: { frame: number | null; hull: number; lightsOn: boolean; piloted: boolean; occupied: boolean; reach: { x: number; y: number } | null; welding: boolean }): void {
    // The pilot climbs down into the seat after boarding, and up out of it when leaving.
    this.pilotLevel += ((o.occupied ? 1 : 0) - this.pilotLevel) * Math.min(1, dt * (o.occupied ? 4 : 7));
    this.pilot.visible = this.pilotLevel > 0.02;
    this.pilot.alpha = Math.min(1, this.pilotLevel * 1.4);
    this.pilot.y = (1 - this.pilotLevel) * -26;
    for (const c of [this.body, this.eBody, this.gBody]) {
      c.scale.set(this.faceAnim, 1);
      c.rotation = this.pitch * Math.sign(this.faceAnim);
    }
    this.scaffold.scale.set(this.faceAnim, 1);
    for (const t of this.stencils) t.scale.x = Math.sign(this.faceAnim) || 1;
    this.view.position.set(this.x, this.y);
    this.emissive.position.set(this.x, this.y);
    this.glow.position.set(this.x, this.y);

    // A frame: the hull shows from the bottom up as the drone welds it, inside a scaffold.
    const frame = o.frame;
    if (frame !== null) {
      this.wasFrame = true;
      this.body.mask = this.frameMask;
      const top = HY1 + 14 - (HY1 + 14 - (DOME.y - DOME.r - 30)) * frame;
      this.frameMask.clear().rect(-160, top, 320, 200).fill({ color: 0xffffff });
      this.scaffold.clear();
      for (const sx of [-120, -60, 0, 60, 120]) this.scaffold.rect(sx - 1.5, -70, 3, 120).fill({ color: 0x9aa3a5, alpha: 0.8 });
      for (const sy of [-70, -20, 48]) this.scaffold.rect(-122, sy - 1.5, 244, 3).fill({ color: 0x9aa3a5, alpha: 0.8 });
      this.scaffold.mask = null;
      this.seam.clear();
      this.seamGlow.clear();
      if (o.welding && frame > 0.003) {
        const flick = 0.7 + 0.3 * Math.sin(this.time * 37);
        this.seam.rect(-112, top - 1, 224, 2).fill({ color: 0xffd090, alpha: 0.9 * flick });
        this.seamGlow.rect(-120, top - 4, 240, 8).fill({ color: 0xffb060, alpha: 0.5 * flick });
      }
    } else if (this.wasFrame) {
      this.wasFrame = false;
      this.body.mask = null;
      this.frameMask.clear();
      this.scaffold.clear();
      this.seam.clear();
      this.seamGlow.clear();
    }
    // Propeller: blades turning with the thrust (seen side on, so they sweep up and down).
    const spin = frame !== null ? 0 : Math.abs(this.vx) / 40 + (o.piloted ? 2 : 0) + (this.thrust > 0 ? 10 : 0);
    this.propAngle += dt * spin;
    const pg = this.prop.clear();
    const px = HX0 - 30;
    pg.rect(px - 1, -3, 9, 7).fill({ color: PAL.steelDark });
    for (let i = 0; i < 3; i++) {
      const a = this.propAngle + (i / 3) * Math.PI * 2;
      const h = Math.sin(a) * 19;
      const w = 3 + Math.abs(Math.cos(a)) * 4;
      pg.ellipse(px + 1, h / 2, w / 2, Math.abs(h) / 2 + 1.5).fill({ color: Math.cos(a) > 0 ? PAL.brass : 0x7a6438 });
    }
    pg.circle(px + 1, 0, 3).fill({ color: PAL.steelLight });

    // Damage shows as the hull wears.
    this.dents.alpha = Math.max(0, Math.min(1, (1 - o.hull) * 1.3));
    this.domeCrack.visible = o.hull < 0.35 && frame === null;

    // Lights.
    const on = frame === null && o.lightsOn && o.piloted ? 1 : 0;
    this.lightLevel += (on - this.lightLevel) * Math.min(1, dt * 8);
    const flood = this.hasFlood;
    const ang = this.pitch;
    const bow = { x: this.x + this.faceAnim * (HX1 - 2) * Math.cos(ang), y: this.y + 4 + HX1 * Math.sin(ang) * Math.sign(this.faceAnim) };
    const L = this.lampLight;
    L.x = bow.x;
    L.y = bow.y;
    L.dirX = this.face * Math.cos(ang + 0.08);
    L.dirY = Math.sin(ang + 0.08);
    L.radius = flood ? 1150 : 560;
    L.coneCos = flood ? 0.78 : 0.88;
    L.coneSoft = flood ? 0.2 : 0.12;
    L.haze = flood ? 0.42 : 0.3;
    L.intensity = (flood ? 2.1 : 1.15) * this.lightLevel;
    this.navLens.alpha = flood ? 0.3 : 0.25 + 0.75 * this.lightLevel;
    this.navHalo.alpha = flood ? 0 : this.lightLevel;
    this.floodLens.alpha = 0.3 + 0.7 * this.lightLevel;
    this.floodHalo.alpha = this.lightLevel;
    const cabin = frame === null ? (o.piloted ? 1 : 0.35) : 0;
    this.cabinLight.x = this.x + this.face * DOME.x;
    this.cabinLight.y = this.y + DOME.y - 10;
    this.cabinLight.intensity = 0.45 * cabin;
    this.screen.alpha = cabin * (0.85 + 0.15 * Math.sin(this.time * 5));
    this.screenGlow.alpha = cabin * 0.8;
    this.portLit.alpha = cabin * 0.8;
    const blink = (this.time % 2) < 0.2 ? 1 : 0.15;
    this.tailLamp.alpha = frame === null ? blink : 0;
    this.tailHalo.alpha = frame === null ? blink : 0;

    // Grabber arm: folded under the chin, or reaching for what it is working on.
    let tu = 2.85;
    let tf = -2.9;
    let open = 0.2;
    if (o.reach && this.arm.visible) {
      // Two-bone reach in local space (ignoring the small tilt).
      const lx = (o.reach.x - this.x) * this.face - SHOULDER.x;
      const ly = o.reach.y - this.y - SHOULDER.y;
      const d = Math.max(8, Math.min(UPPER + FORE - 2, Math.hypot(lx, ly)));
      const base = Math.atan2(ly, lx);
      const cosA = (UPPER * UPPER + d * d - FORE * FORE) / (2 * UPPER * d);
      const a = Math.acos(Math.max(-1, Math.min(1, cosA)));
      tu = base - a;
      const cosB = (UPPER * UPPER + FORE * FORE - d * d) / (2 * UPPER * FORE);
      tf = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosB)));
      open = 0.5 + 0.5 * Math.sin(this.time * 9);
    }
    const k = Math.min(1, dt * 6);
    this.armAngles.upper += (tu - this.armAngles.upper) * k;
    this.armAngles.fore += (tf - this.armAngles.fore) * k;
    this.upperG.rotation = this.armAngles.upper;
    this.foreG.rotation = this.armAngles.fore;
    if (o.reach) this.drawClaw(open);
  }
  private propAngle = 0;
  /** Painted words, kept reading left to right whichever way the sub faces. */
  private stencils: Text[] = [];

  /** Where the propeller wash comes out (world). */
  washPoint(): { x: number; y: number } {
    return { x: this.x - this.face * (HX1 + 32), y: this.y + 2 };
  }
}
