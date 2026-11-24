import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { mulberry32, WORLD_SEED } from '../rng';
import { isSolid, WORLD_W, WORLD_X0 } from '../world/terrain';
import type { Light } from '../fx/lighting';
import type { SubModule } from '../game/state';
import { getPropArt } from '../art/propArt';

/**
 * The submersible KS-1 (milestone 6), drawn with code and driven like a
 * heavy machine: it takes a moment to get going and to stop, the hull tilts
 * with the climb, and the thrusters (Boost) push it to about twice the
 * diver's speed for a short burst.
 *
 * The look (redrawn after milestone 12, Colin: "make it look cooler"): the
 * new base kit's charcoal, chrome, neon lime glass and gold circuit lines on
 * a swept, flattened hull with a sharp bow; a bubble canopy with the pilot
 * (the explorer in their lime-glass helmet) visible inside; no propeller,
 * but a main ring thruster and a ventral nacelle whose lime exhaust burns
 * brighter with speed and flares with Boost; a swept dorsal fin with an edge
 * light and a red tail lamp. Fitted modules show
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
  // After milestone 12: the new base kit's colours (docs/art/kit2): charcoal hull, chrome, neon lime glass, gold lines.
  hull: 0x2c3236,
  hullHi: 0x4a545a,
  hullDark: 0x1e2326,
  hullDeep: 0x121618,
  chrome: 0xa4b0b7,
  chromeHi: 0xe4ecf0,
  lime: 0xc6f03a,
};

/** The hull's outline: a sharp bow, a long swept back and a deep keel (inside the old capsule's footprint). */
function hullPath(): number[] {
  const pts: number[] = [];
  const top: [number, number][] = [
    [HX1 + 10, 6],
    [HX1 - 16, -5],
    [80, -15],
    [40, -23],
    [-4, -30],
    [-44, -34],
    [-82, -27],
    [HX0 + 2, -14],
  ];
  const bottom: [number, number][] = [
    [HX0 - 2, 16],
    [-78, 28],
    [-24, HY1 + 2],
    [36, HY1 + 2],
    [84, 26],
    [HX1 - 2, 15],
  ];
  const curve = (ps: [number, number][]) => {
    for (let i = 0; i < ps.length - 1; i++) {
      const [x0, y0] = ps[Math.max(0, i - 1)];
      const [x1, y1] = ps[i];
      const [x2, y2] = ps[i + 1];
      const [x3, y3] = ps[Math.min(ps.length - 1, i + 2)];
      for (let t = 0; t < 1; t += 0.125) {
        const t2 = t * t;
        const t3 = t2 * t;
        pts.push(
          0.5 * (2 * x1 + (-x0 + x2) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 + (-x0 + 3 * x1 - 3 * x2 + x3) * t3),
          0.5 * (2 * y1 + (-y0 + y2) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (-y0 + 3 * y1 - 3 * y2 + y3) * t3),
        );
      }
    }
    const [lx, ly] = ps[ps.length - 1];
    pts.push(lx, ly);
  };
  curve(top);
  curve(bottom);
  return pts;
}

/** The bubble canopy: swept back, tallest just behind the middle of the cabin. */
function canopyPath(): number[] {
  const { x, y } = DOME;
  const pts: number[] = [];
  const bez = (p0: number[], p1: number[], p2: number[], p3: number[]) => {
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const u = 1 - t;
      pts.push(
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      );
    }
  };
  // A teardrop: a rounded back, the crown over the pilot's head, and a long raked windscreen.
  bez([x - 40, y + 2], [x - 40, y - 28], [x - 22, y - 44], [x + 2, y - 44]);
  bez([x + 2, y - 44], [x + 24, y - 44], [x + 44, y - 20], [x + 58, y + 2]);
  return pts;
}

/** A gold circuit line, like the etching on the diver's suit. */
function goldLine(g: Graphics, pts: [number, number][], w: number): void {
  g.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
  g.stroke({ color: 0xb08a2a, width: w, alpha: 0.85 });
}

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
    style: { fontFamily: 'Courier New, monospace', fontSize: size, fontWeight: 'bold', fill: 0xd8e2e4, letterSpacing: 0.6 },
    resolution: 6,
  });
  t.anchor.set(0.5);
  t.position.set(x, y);
  t.alpha = 0.5;
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
  /** After milestone 12: the thrusters' lime nozzles and exhaust, the lit side line and the fin's edge light. */
  private nozzle = new Graphics();
  private exhaust = new Graphics();
  private exhaustGlow = new Graphics();
  private sideLine = new Graphics();
  private sideGlow = new Graphics();
  private finEdge = new Graphics();
  private finGlow = new Graphics();
  private exhaustLight: Light = { x: 0, y: 0, radius: 200, intensity: 0, color: [0.78, 0.95, 0.35] };
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
  private pilot = new Container();
  private pilotE = new Container();
  private pilotLevel = 0;
  private cabinLight: Light = { x: 0, y: 0, radius: 150, intensity: 0, color: [1, 0.86, 0.6] };
  private lightLevel = 0;
  private wasFrame = false;

  constructor() {
    rand = mulberry32(WORLD_SEED ^ 0x5b1);
    this.view.addChild(this.body);
    this.emissive.addChild(this.eBody);
    this.glow.addChild(this.gBody);
    const painted = getPropArt().vehicles.sub;
    if (painted) {
      const spr = new Sprite(painted);
      spr.anchor.set(0.5, 0.52);
      const sc = 248 / Math.max(1, painted.width);
      spr.scale.set(sc);
      spr.position.set(0, -4);
      this.body.addChild(spr);
      // Mount the real painted Kestrel (head + torso) inside the glass nose canopy!
      const kArt = getPropArt().kestrel;
      if (kArt.head) {
        const buildPaintedPilot = (target: Container, alpha = 1) => {
          const back = new Graphics();
          back.ellipse(68, -12, 20, 24).fill({ color: 0xe4ff9e, alpha: 0.14 * alpha });
          target.addChild(back);
          if (kArt.torso) {
            const tSpr = new Sprite(kArt.torso);
            tSpr.anchor.set(0.5, 0.5);
            const tsc = 24 / Math.max(1, kArt.torso.height);
            tSpr.scale.set(tsc);
            tSpr.position.set(62, 1);
            tSpr.alpha = alpha;
            target.addChild(tSpr);
          }
          const hSpr = new Sprite(kArt.head!);
          hSpr.anchor.set(0.5, 0.5);
          const hsc = 30 / Math.max(1, kArt.head!.height);
          hSpr.scale.set(hsc);
          hSpr.position.set(65, -18);
          hSpr.alpha = alpha;
          target.addChild(hSpr);
        };
        buildPaintedPilot(this.pilot, 1);
        buildPaintedPilot(this.pilotE, 0.55);
      } else {
        const drawSeatedPilot = (target: Container, alpha = 1) => {
          const p = target.addChild(new Graphics());
          const px = 66;
          const py = 4;
          p.ellipse(px + 6, py - 14, 22, 26).fill({ color: 0xe4ff9e, alpha: 0.16 * alpha });
          p.roundRect(px - 14, py - 14, 24, 15, 6).fill({ color: 0x3b4448, alpha });
          p.moveTo(px - 10, py - 10).lineTo(px + 6, py - 10).stroke({ color: 0xd4ad5a, width: 1.1, alpha: 0.85 * alpha });
          p.roundRect(px + 1, py - 9, 21, 5.5, 2.5).fill({ color: 0x9aa4a8, alpha });
          p.circle(px + 22, py - 6.2, 2.8).fill({ color: 0xc86442, alpha });
          p.roundRect(px - 10, py - 16, 18, 5, 2.5).fill({ color: 0xb8ccd8, alpha });
          const hx = px;
          const hy = py - 24;
          const k = 1.08;
          p.circle(hx, hy, 8 * k).fill({ color: 0xd9a788, alpha });
          p.moveTo(hx - 8 * k, hy - 1 * k).arc(hx, hy, 8 * k, Math.PI, -0.2).lineTo(hx + 2 * k, hy - 2 * k).closePath().fill({ color: 0x4a3426, alpha });
          p.poly([hx + 7 * k, hy - 1 * k, hx + 10.5 * k, hy + 2 * k, hx + 7.5 * k, hy + 3.5 * k]).fill({ color: 0xd9a788, alpha });
          p.circle(hx + 4.5 * k, hy - 1 * k, 1.2).fill({ color: 0x1a1410, alpha });
          p.moveTo(hx + 5 * k, hy + 5 * k).lineTo(hx + 8 * k, hy + 4.6 * k).stroke({ color: 0x5a3a30, width: 0.9, alpha });
          p.circle(hx + 1, hy, 13.2).fill({ color: PAL.visor, alpha: 0.24 * alpha });
          p.circle(hx + 1, hy, 13.2).stroke({ color: 0x9cc846, width: 1.4, alpha: 0.88 * alpha });
          p.circle(hx + 5.5, hy - 5, 2.5).fill({ color: 0xffffff, alpha: 0.55 * alpha });
        };
        drawSeatedPilot(this.pilot, 1);
        drawSeatedPilot(this.pilotE, 0.78);
      }
      this.body.addChild(this.pilot);
      this.eBody.addChild(this.pilotE);
      // Soft glass canopy sheen over the pilot so they sit genuinely inside the glass dome.
      const sheen = new Graphics();
      sheen.moveTo(68, -32).quadraticCurveTo(88, -22, 95, -4).stroke({ color: 0xffffff, width: 3.0, alpha: 0.28, cap: 'round' });
      this.body.addChild(sheen);
      this.navLens.circle(94, 24, 5).fill({ color: 0xffe8b0 });
      this.navHalo.circle(94, 24, 18).fill({ color: 0xffd280, alpha: 0.45 });
      this.tailLamp.circle(-84, -22, 2.2).fill({ color: 0xff4a3a });
      this.tailHalo.circle(-84, -22, 10).fill({ color: 0xff3a2a, alpha: 0.65 });
      this.drawModules();
      this.drawExtras();
    } else {
      this.drawStern();
      this.drawHull();
      this.drawCockpit();
      this.drawModules();
      this.drawExtras();
    }
    this.body.addChild(this.dents, this.domeCrack);
    this.drawDamage();
    this.body.addChild(this.frameMask);
    this.view.addChild(this.scaffold);
    this.eBody.addChild(this.navLens, this.tailLamp, this.screen, this.portLit, this.lightsE, this.seam, this.nozzle, this.sideLine, this.finEdge, this.exhaust);
    this.gBody.addChild(this.navHalo, this.tailHalo, this.screenGlow, this.lightsGlow, this.seamGlow, this.sideGlow, this.finGlow, this.exhaustGlow);
    this.lights.push(this.lampLight, this.cabinLight, this.exhaustLight);
  }

  // ---------------------------------------------------------------------------
  // Drawing (once)
  // ---------------------------------------------------------------------------

  private drawStern(): void {
    // After milestone 12 (Colin: "make it look cooler"): no propeller. A main
    // ring thruster at the stern and a ventral nacelle under the hull, both
    // with lime nozzles that burn brighter with speed (drawn each frame).
    const g = new Graphics();
    // Swept dorsal fin with a lime edge light and the red tail lamp at its tip.
    g.poly([-40, -24, -70, -22, -104, -52, -112, -50, -96, -20]).fill({ color: PAL.hull });
    g.poly([-40, -24, -104, -52, -108, -51, -50, -25]).fill({ color: PAL.hullHi, alpha: 0.7 });
    goldLine(g, [[-52, -24], [-78, -28], [-98, -44]], 1.4);
    this.finEdge.poly([-42, -25, -104, -53, -103, -55, -41, -27]).fill({ color: PAL.lime, alpha: 0.85 });
    this.finGlow.poly([-42, -24, -104, -52, -100, -58, -40, -30]).fill({ color: PAL.lime, alpha: 0.35 });
    g.circle(-108, -51, 3.2).fill({ color: PAL.chrome });
    this.tailLamp.circle(-108, -51, 2.2).fill({ color: 0xff4a3a });
    this.tailHalo.circle(-108, -51, 10).fill({ color: 0xff3a2a, alpha: 0.7 });
    // Stern stabiliser fins, low and swept.
    g.poly([-88, 24, -60, 26, -116, 44, -124, 40]).fill({ color: PAL.hullDark });
    g.poly([-88, 24, -116, 44, -120, 43, -92, 24]).fill({ color: PAL.hullHi, alpha: 0.5 });
    // The main ring thruster: a chrome-flanged housing with a dark throat.
    g.roundRect(HX0 - 20, -18, 26, 40, 9).fill({ color: PAL.hullDark });
    g.roundRect(HX0 - 20, -18, 26, 7, 4).fill({ color: PAL.hullHi, alpha: 0.6 });
    for (const fx of [HX0 - 20, HX0 - 4]) {
      g.roundRect(fx, -20, 5, 44, 2.5).fill({ color: PAL.chrome });
      g.roundRect(fx, -20, 2, 44, 1).fill({ color: PAL.chromeHi, alpha: 0.7 });
    }
    g.ellipse(HX0 - 22, 2, 6, 17).fill({ color: 0x0a0e10 });
    this.nozzle.ellipse(HX0 - 22, 2, 4.2, 14).stroke({ color: PAL.lime, width: 2.2 });
    // The ventral nacelle under the hull: a long pod with chrome rings and its own nozzle.
    g.roundRect(-104, 26, 66, 20, 10).fill({ color: PAL.hullDark });
    g.poly([-44, 27, -26, 33, -26, 39, -44, 45]).fill({ color: PAL.hullDark });
    g.roundRect(-100, 27, 58, 5, 2.5).fill({ color: PAL.hullHi, alpha: 0.55 });
    for (const rx of [-96, -52]) {
      g.roundRect(rx, 24, 6, 24, 3).fill({ color: PAL.chrome });
      g.rect(rx + 1, 25, 1.6, 22).fill({ color: PAL.chromeHi, alpha: 0.6 });
    }
    goldLine(g, [[-88, 40], [-58, 40]], 1.2);
    g.ellipse(-106, 36, 4, 8).fill({ color: 0x0a0e10 });
    this.nozzle.ellipse(-106, 36, 3, 6.5).stroke({ color: PAL.lime, width: 1.8 });
    this.body.addChild(g);
    // The turbine fans in the nozzles turn with the thrust (redrawn each frame).
    this.body.addChild(this.prop);
  }

  private drawHull(): void {
    const g = new Graphics();
    // A swept, flattened hull: a sharp bow, a long back, a deep keel.
    const out = hullPath();
    g.poly(out).fill({ color: PAL.hull });
    // Lighter back, darker belly.
    g.poly(clampY(out, -40, -8)).fill({ color: PAL.hullHi, alpha: 0.55 });
    g.poly(clampY(out, -40, -18)).fill({ color: 0xffffff, alpha: 0.06 });
    g.poly(clampY(out, 18, 60)).fill({ color: PAL.hullDark, alpha: 0.85 });
    // The chrome belt flange along the side, with rivets, and a lime light line above it.
    g.poly(clampY(clampY(out, BELT - 2, BELT + 4), BELT - 2, BELT + 4)).fill({ color: PAL.chrome });
    g.rect(HX0 + 10, BELT - 2, HX1 - HX0 - 26, 1.2).fill({ color: PAL.chromeHi, alpha: 0.6 });
    rivets(g, HX0 + 14, BELT + 1, HX1 - 24, BELT + 1, 24);
    this.sideLine.rect(HX0 + 30, BELT - 6, HX1 - HX0 - 80, 1.6).fill({ color: PAL.lime, alpha: 0.9 });
    this.sideGlow.rect(HX0 + 26, BELT - 9, HX1 - HX0 - 74, 7).fill({ color: PAL.lime, alpha: 0.32 });
    // Panel seams, angled to follow the sweep.
    for (const sx of [-78, -34, 2]) {
      g.moveTo(sx, -22).lineTo(sx - 6, BELT - 3).stroke({ color: PAL.hullDeep, width: 1.1, alpha: 0.8 });
      g.moveTo(sx - 6, BELT + 5).lineTo(sx - 10, 30).stroke({ color: PAL.hullDeep, width: 1.1, alpha: 0.8 });
    }
    // Gold circuit etching, like the diver's suit.
    // A raised spine plate along the back, blending into the fin.
    g.poly([-96, -18, -60, -30, -10, -29, 20, -25, -10, -22, -60, -24]).fill({ color: PAL.hullHi, alpha: 0.75 });
    goldLine(g, [[-84, -14], [-56, -14], [-50, -20], [-8, -20]], 1.3);
    goldLine(g, [[-40, 20], [0, 20], [6, 16], [56, 16]], 1.2);
    for (const [cx, cy] of [[-56, -14], [0, 20]] as const) g.circle(cx, cy, 1.8).fill({ color: 0xd8a830 });
    // A swept chin plate under the bow, darker, for a wedge-shaped front.
    g.poly([HX1 - 4, 12, 70, 28, 30, 30, 60, 20]).fill({ color: PAL.hullDeep, alpha: 0.8 });
    // Side vents: lime-lit slots behind the canopy.
    for (let k = 0; k < 4; k++) {
      g.roundRect(-30 + k * 8, -2, 5, 9, 1.5).fill({ color: 0x0c1012 });
      this.portLit.roundRect(-29 + k * 8, 0, 3, 5, 1).fill({ color: PAL.lime, alpha: 0.8 });
    }
    // The bow: a chrome nose cap and a lime sensor eye.
    g.poly([HX1 - 10, -4, HX1 + 8, 4, HX1 - 10, 14]).fill({ color: PAL.chrome });
    g.poly([HX1 - 10, -4, HX1 + 8, 4, HX1 - 6, 2]).fill({ color: PAL.chromeHi, alpha: 0.6 });
    g.roundRect(HX1 - 22, 2, 14, 6, 3).fill({ color: 0x0a0e10 });
    this.navLens.roundRect(HX1 - 21, 3.2, 12, 3.6, 1.8).fill({ color: 0xe8ffb0 });
    this.navHalo.ellipse(HX1 - 12, 5, 18, 9).fill({ color: PAL.lime, alpha: 0.6 });
    // Hatch on the back behind the canopy, and a short sensor mast.
    g.roundRect(-14, HY0 - 4, 24, 6, 2).fill({ color: PAL.hullDark });
    g.roundRect(-14, HY0 - 4, 24, 2, 1).fill({ color: PAL.chrome, alpha: 0.8 });
    g.rect(-28, HY0 - 16, 3, 14).fill({ color: PAL.chrome });
    g.circle(-26.5, HY0 - 17, 2.6).fill({ color: PAL.hullDark });
    this.tailLamp.circle(-26.5, HY0 - 17, 1.4).fill({ color: 0xff4a3a });
    // Landing skids: chrome struts and a charcoal rail.
    for (const sx of [-6, 62]) g.rect(sx - 2, 28, 4, 18).fill({ color: PAL.chrome });
    g.roundRect(-14, HY1 + 10, 90, 5, 2.5).fill({ color: PAL.hullDark });
    g.roundRect(-14, HY1 + 10, 90, 1.5, 1).fill({ color: PAL.chromeHi, alpha: 0.4 });
    // A little wear: fine scratches, and a hint of growth along the keel.
    for (let i = 0; i < 18; i++) {
      const x = R(HX0 + 14, HX1 - 20);
      const y = R(-18, 26);
      const a = R(-0.5, 0.5);
      const l = R(4, 10);
      g.moveTo(x, y).lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l).stroke({ color: 0xd8dcd6, width: 0.6, alpha: R(0.1, 0.25) });
    }
    for (let i = 0; i < 10; i++) dab(g, R(-60, 80), R(28, 32), R(2, 5), R(1, 2), rand() < 0.6 ? PAL.algae : PAL.algaeLight, 0.5);
    this.body.addChild(g);
    this.stencils.push(stencil('KS-1', -52, 2, 10), stencil('KESTREL', -52, 12, 4.5));
    this.body.addChild(...this.stencils);
  }

  private drawCockpit(): void {
    let g = new Graphics();
    const { x, y } = DOME;
    // A swept bubble canopy in neon lime glass, in a chrome frame.
    const canopy = canopyPath();
    g.poly(canopy).fill({ color: 0x0e1a1c, alpha: 0.9 });
    // The seat back.
    g.roundRect(x - 26, y - 30, 9, 29, 3).fill({ color: 0x4a1c18 });
    g.roundRect(x - 26, y - 30, 3, 29, 1).fill({ color: 0xffffff, alpha: 0.1 });
    this.body.addChild(g);
    g = this.pilot.addChild(new Graphics());
    g.roundRect(x - 16, y - 13, 24, 13, 6).fill({ color: PAL.charcoal });
    g.moveTo(x - 12, y - 9).lineTo(x + 5, y - 9).stroke({ color: PAL.brass, width: 0.7, alpha: 0.6 });
    g.roundRect(x - 1, y - 8, 21, 5, 2.5).fill({ color: 0x7c8487 });
    g.circle(x + 20, y - 5.5, 2.6).fill({ color: PAL.rust });
    g.roundRect(x - 12, y - 15, 18, 5, 2.5).fill({ color: 0x9fb2c0 });
    const k = 0.82;
    const hx = x - 3;
    const hy = y - 23;
    g.circle(hx, hy, 8 * k).fill({ color: PAL.skin });
    g.moveTo(hx - 8 * k, hy - 1 * k).arc(hx, hy, 8 * k, Math.PI, -0.2).lineTo(hx + 2 * k, hy - 2 * k).closePath().fill({ color: 0x3a2a20 });
    g.poly([hx + 7 * k, hy - 1 * k, hx + 10.5 * k, hy + 2 * k, hx + 7.5 * k, hy + 3.5 * k]).fill({ color: PAL.skin });
    g.circle(hx + 4.5 * k, hy - 1 * k, 0.9).fill({ color: 0x1a1410 });
    g.moveTo(hx + 5 * k, hy + 5 * k).lineTo(hx + 8 * k, hy + 4.6 * k).stroke({ color: 0x5a3a30, width: 0.7 });
    g.circle(hx + 1, hy, 10.5).fill({ color: PAL.visor, alpha: 0.32 });
    g.circle(hx + 1, hy, 10.5).stroke({ color: 0x6a8a2a, width: 1.1, alpha: 0.8 });
    g.poly([hx - 7.5, hy - 7.5, hx + 3.5, hy - 11.5, hx + 8.5, hy - 9, hx - 3.5, hy - 13]).fill({ color: PAL.visor, alpha: 0.55 });
    g.circle(hx + 4.5, hy - 4, 2).fill({ color: 0xffffff, alpha: 0.35 });
    this.body.addChild(this.pilot);
    g = new Graphics();
    // The flight console with its lime screen.
    g.roundRect(x + 18, y - 18, 18, 18, 3).fill({ color: PAL.hullDark });
    this.screen.roundRect(x + 21, y - 15, 12, 6, 1).fill({ color: 0xd8ff8a, alpha: 0.9 });
    this.screen.circle(x + 24, y - 5, 1.2).fill({ color: 0xffc040 });
    this.screen.circle(x + 29, y - 5, 1.2).fill({ color: 0xff5a4a });
    this.screenGlow.roundRect(x + 14, y - 22, 28, 22, 6).fill({ color: PAL.lime, alpha: 0.3 });
    // The glass: lime-tinted, with a chrome frame, one rib and a long sheen.
    g.poly(canopy).fill({ color: PAL.lime, alpha: 0.16 });
    g.poly(canopy).stroke({ color: PAL.chrome, width: 2.6 });
    g.moveTo(x + 10, y - 43).quadraticCurveTo(x + 26, y - 30, x + 30, y).stroke({ color: PAL.chrome, width: 1.6, alpha: 0.85 });
    g.moveTo(x - 30, y - 20).quadraticCurveTo(x - 18, y - 38, x + 2, y - 40).stroke({ color: 0xffffff, width: 3, alpha: 0.32 });
    g.moveTo(x + 34, y - 26).quadraticCurveTo(x + 44, y - 16, x + 50, y - 6).stroke({ color: 0xffffff, width: 1.5, alpha: 0.28 });
    // Chrome sill where the canopy meets the hull.
    g.roundRect(x - 42, y - 2, 102, 5, 2.5).fill({ color: PAL.chrome });
    g.roundRect(x - 42, y - 2, 102, 1.8, 1).fill({ color: PAL.chromeHi, alpha: 0.7 });
    this.body.addChild(g);
  }

  private drawModules(): void {
    // Cargo: a sleek pod clamped under the bow half of the keel.
    const c = new Graphics();
    c.roundRect(-4, HY1 - 2, 78, 14, 7).fill({ color: PAL.hullDark });
    c.roundRect(-2, HY1 - 1, 74, 3.5, 2).fill({ color: PAL.hullHi, alpha: 0.6 });
    for (const cx of [6, 58]) {
      c.roundRect(cx, HY1 - 4, 6, 18, 2.5).fill({ color: PAL.chrome });
      c.rect(cx + 1, HY1 - 3, 1.5, 16).fill({ color: PAL.chromeHi, alpha: 0.6 });
    }
    goldLine(c, [[14, HY1 + 6], [36, HY1 + 6], [40, HY1 + 3], [54, HY1 + 3]], 1.1);
    const cs = stencil('CARGO', 34, HY1 + 8, 3.6);
    this.stencils.push(cs);
    this.cargoG.addChild(c, cs);
    this.body.addChild(this.cargoG);

    // Floodlights: twin light bars along the bow, above and below the eye.
    const f = new Graphics();
    for (const [lx, ly, w] of [
      [HX1 - 44, -14, 30],
      [HX1 - 40, 18, 26],
    ] as const) {
      f.roundRect(lx, ly - 3, w + 6, 8, 3.5).fill({ color: PAL.hullDark });
      f.roundRect(lx, ly - 3, w + 6, 2, 1).fill({ color: PAL.chrome, alpha: 0.8 });
      this.floodLens.roundRect(lx + 3, ly - 0.5, w, 3, 1.5).fill({ color: 0xfffaf0 });
      this.floodHalo.ellipse(lx + w + 4, ly + 1, 20, 9).fill({ color: 0xf4ffe0, alpha: 0.8 });
    }
    this.lightsG.addChild(f);
    this.lightsE.addChild(this.floodLens);
    this.lightsGlow.addChild(this.floodHalo);
    this.body.addChild(this.lightsG);

    // Grabber arm: a chrome shoulder, charcoal segments with gold lines, a chrome claw.
    const sh = new Graphics();
    sh.roundRect(SHOULDER.x - 11, SHOULDER.y - 7, 22, 13, 5).fill({ color: PAL.hullDark });
    sh.circle(SHOULDER.x, SHOULDER.y, 5.5).fill({ color: PAL.chrome });
    sh.circle(SHOULDER.x, SHOULDER.y, 2).fill({ color: PAL.hullDeep });
    const up = new Graphics();
    up.roundRect(-3, -4, UPPER + 4, 8, 3).fill({ color: PAL.hullHi });
    up.rect(2, -1, UPPER - 4, 1.4).fill({ color: 0xd8a830 });
    up.circle(UPPER, 0, 4).fill({ color: PAL.chrome });
    this.upperG.addChild(up);
    const fo = new Graphics();
    fo.roundRect(-2, -3, FORE + 2, 6, 2.5).fill({ color: PAL.hullHi });
    fo.rect(2, -0.6, FORE - 4, 1.2).fill({ color: 0xd8a830 });
    fo.circle(0, 0, 2).fill({ color: PAL.hullDeep });
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
    // After milestone 12: the six new modules.
    this.afterburner = mods.includes('booster');
    this.boosterG.visible = this.boosterE.visible = this.afterburner;
    this.ballastG.visible = mods.includes('ballast');
    this.tractorG.visible = this.tractorE.visible = mods.includes('tractor');
    this.domeG.visible = this.domeE.visible = mods.includes('sdome');
    this.habitatG.visible = this.habitatE.visible = mods.includes('habitat');
    this.drillG.visible = mods.includes('drill');
  }

  /** After milestone 12: hull tiers that show on the hull: brass depth plating, then the Choir's pale stone after contact. */
  setLook(plating: boolean, choir: boolean): void {
    this.platingG.visible = plating;
    this.choirG.visible = this.choirE.visible = choir;
  }

  /** The drill bit spins while drilling. */
  drilling = false;
  /** Is the afterburner fitted? */
  afterburner = false;
  private boosterG = new Graphics();
  private boosterE = new Graphics();
  private ballastG = new Graphics();
  private tractorG = new Graphics();
  private tractorE = new Graphics();
  private domeG = new Graphics();
  private domeE = new Graphics();
  private habitatG = new Graphics();
  private habitatE = new Graphics();
  private drillG = new Graphics();
  private drillSpin = new Graphics();
  private platingG = new Graphics();
  private choirG = new Graphics();
  private choirE = new Graphics();

  /** After milestone 12: draw the new modules and hull tiers once. */
  private drawExtras(): void {
    // Hull tiers first, under the modules: riveted brass plates over the sides...
    const pl = this.platingG;
    for (const [x0, w] of [[-86, 26], [-56, 30], [-22, 28], [10, 30], [44, 26]] as const) {
      pl.roundRect(x0, -14, w, 18, 2).fill({ color: 0x7e6430, alpha: 0.75 });
      pl.roundRect(x0, -14, w, 3, 1.5).fill({ color: 0xd8b868, alpha: 0.35 });
      rivets(pl, x0 + 3, -9, x0 + w - 3, -9, 3);
      rivets(pl, x0 + 3, 1, x0 + w - 3, 1, 3);
    }
    // ...and after contact, pale Choir stone along the spine and keel, set with the Choir's colours.
    const ch = this.choirG;
    ch.poly([-90, -20, -50, -32, 0, -31, 30, -26, 0, -27, -50, -28]).fill({ color: 0xc8cce0, alpha: 0.9 });
    ch.poly([-60, 30, 0, 36, 60, 32, 0, 33]).fill({ color: 0xc8cce0, alpha: 0.9 });
    for (const [x, y, c] of [[-60, -27, 0x5ff0ff], [-30, -29, 0xa27cff], [0, -29, 0xff5ad8], [-20, 33, 0x5ff0ff], [20, 33, 0xa27cff]] as const) {
      this.choirE.circle(x, y, 2.2).fill({ color: c, alpha: 0.95 });
      this.choirE.circle(x, y, 6).fill({ color: c, alpha: 0.25 });
    }
    // Afterburner: a second ring nozzle above the main one.
    const b = this.boosterG;
    b.roundRect(HX0 - 12, -38, 30, 18, 8).fill({ color: PAL.hullDark });
    b.roundRect(HX0 - 12, -38, 30, 4, 2).fill({ color: PAL.hullHi, alpha: 0.6 });
    b.roundRect(HX0 - 14, -40, 5, 22, 2.5).fill({ color: PAL.chrome });
    b.ellipse(HX0 - 15, -29, 4, 8).fill({ color: 0x0a0e10 });
    this.boosterE.ellipse(HX0 - 15, -29, 3, 6.5).stroke({ color: PAL.lime, width: 1.8 });
    // Ballast pod: twin trim tanks strapped under the keel.
    const bl = this.ballastG;
    for (const x0 of [-70, 4]) {
      bl.roundRect(x0, HY1 + 14, 52, 11, 5.5).fill({ color: PAL.hullHi });
      bl.roundRect(x0 + 2, HY1 + 15, 48, 3, 1.5).fill({ color: 0xffffff, alpha: 0.12 });
      for (const sx of [x0 + 10, x0 + 40]) bl.rect(sx, HY1 + 12, 3, 15).fill({ color: PAL.chrome });
      bl.rect(x0 + 22, HY1 + 17, 8, 5).fill({ color: 0xa8402e });
    }
    // Tractor beam: a lime emitter lens in the chin.
    const tr = this.tractorG;
    tr.roundRect(84, 18, 22, 12, 5).fill({ color: PAL.hullDark });
    tr.circle(98, 24, 5).fill({ color: PAL.chrome });
    this.tractorE.circle(98, 24, 3.4).fill({ color: PAL.lime });
    this.tractorE.circle(98, 24, 8).fill({ color: PAL.lime, alpha: 0.3 });
    // Sonar dome: a small glass dome on the back, behind the hatch, with a sweep inside.
    const d = this.domeG;
    d.roundRect(-46, HY0 - 8, 24, 6, 2).fill({ color: PAL.chrome });
    d.moveTo(-44, HY0 - 7).arc(-34, HY0 - 7, 10, Math.PI, 0).closePath().fill({ color: 0x0e1a1c, alpha: 0.9 });
    d.moveTo(-44, HY0 - 7).arc(-34, HY0 - 7, 10, Math.PI, 0).stroke({ color: PAL.chrome, width: 1.4 });
    // Habitat pod: a pressurised cabin on the back between the fin and the canopy, with lit ports.
    const h = this.habitatG;
    h.roundRect(-82, HY0 - 22, 52, 20, 9).fill({ color: PAL.hullHi });
    h.roundRect(-80, HY0 - 21, 48, 5, 2.5).fill({ color: 0xffffff, alpha: 0.1 });
    h.rect(-56, HY0 - 22, 2, 20).fill({ color: 0xb08a2a });
    for (const px of [-72, -44]) {
      h.circle(px, HY0 - 12, 4.5).fill({ color: PAL.chrome });
      h.circle(px, HY0 - 12, 3).fill({ color: 0x0c1012 });
      this.habitatE.circle(px, HY0 - 12, 2.6).fill({ color: 0xffd98a, alpha: 0.9 });
    }
    // Drill nose: a chrome cone with cutting flutes, past the bow.
    const dr = this.drillG;
    dr.poly([HX1 + 2, -6, HX1 + 40, 5, HX1 + 2, 16]).fill({ color: PAL.chrome });
    dr.poly([HX1 + 2, -6, HX1 + 40, 5, HX1 + 8, 2]).fill({ color: PAL.chromeHi, alpha: 0.6 });
    dr.roundRect(HX1 - 4, -8, 9, 26, 3).fill({ color: PAL.hullDark });
    dr.addChild(this.drillSpin);
    this.body.addChild(pl, ch, b, bl, tr, d, h, dr);
    this.eBody.addChild(this.choirE, this.boosterE, this.tractorE, this.domeE, this.habitatE);
    this.setLook(false, false);
    for (const g of [b, bl, tr, d, h, dr, this.boosterE, this.tractorE, this.domeE, this.habitatE]) g.visible = false;
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
    if (inp.boost && inp.piloted) this.thrust = Sub.BURST * (this.afterburner ? 3 : 1);
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
      const top = this.thrust > 0 ? Sub.BOOST * (this.afterburner ? 1.5 : 1) : Sub.CRUISE;
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
    this.pilot.visible = this.pilotE.visible = this.pilotLevel > 0.02;
    this.pilot.alpha = this.pilotE.alpha = Math.min(1, this.pilotLevel * 1.4);
    this.pilot.y = this.pilotE.y = (1 - this.pilotLevel) * -26;
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
    // Thrusters: fans turn in the nozzles, and the exhaust burns lime, brighter and longer with speed and boost.
    const built = frame === null;
    const speed = Math.min(1, Math.hypot(this.vx, this.vy) / Sub.CRUISE);
    const burn = !built ? 0 : this.thrust > 0 ? 1 : o.piloted ? 0.28 + 0.5 * speed : 0.06;
    this.burn += (burn - this.burn) * Math.min(1, dt * 6);
    this.propAngle += dt * (built ? 2 + 26 * this.burn : 0);
    const pg = this.prop.clear();
    for (const [nx, ny, rh] of [
      [HX0 - 21, 2, 12],
      [-105, 36, 5.5],
    ] as const) {
      for (let i = 0; i < 4; i++) {
        const a = this.propAngle + (i / 4) * Math.PI * 2;
        pg.rect(nx - 1, ny + Math.sin(a) * rh - 1, 2.4, 2.2).fill({ color: Math.cos(a) > 0 ? PAL.chrome : PAL.hullHi });
      }
    }
    const ex = this.exhaust.clear();
    const eg = this.exhaustGlow.clear();
    this.nozzle.alpha = built ? 0.4 + 0.6 * Math.min(1, this.burn * 1.6) : 0;
    if (this.burn > 0.02) {
      const flick = 0.85 + 0.15 * Math.sin(this.time * 41) + 0.08 * Math.sin(this.time * 17);
      for (const [nx, ny, h, len] of [
        [HX0 - 24, 2, 11, 70],
        [-108, 36, 5, 40],
      ] as const) {
        const L = len * (0.3 + this.burn) * flick;
        ex.poly([nx, ny - h, nx - L, ny, nx, ny + h]).fill({ color: PAL.lime, alpha: 0.55 * this.burn });
        ex.poly([nx, ny - h * 0.45, nx - L * 0.6, ny, nx, ny + h * 0.45]).fill({ color: 0xf4ffd0, alpha: 0.8 * this.burn });
        eg.ellipse(nx - L * 0.4, ny, L * 0.6 + 8, h * 1.8).fill({ color: PAL.lime, alpha: 0.45 * this.burn });
      }
    }
    // After milestone 12: the afterburner's own plume, the sonar dome's sweep and the drill's flutes.
    if (this.afterburner && this.burn > 0.02 && this.thrust > 0) {
      const L = 90 * this.burn * (0.85 + 0.15 * Math.sin(this.time * 37));
      ex.poly([HX0 - 18, -36, HX0 - 18 - L, -29, HX0 - 18, -22]).fill({ color: PAL.lime, alpha: 0.6 });
      ex.poly([HX0 - 18, -32, HX0 - 18 - L * 0.6, -29, HX0 - 18, -26]).fill({ color: 0xf4ffd0, alpha: 0.85 });
      eg.ellipse(HX0 - 18 - L * 0.4, -29, L * 0.6 + 8, 12).fill({ color: PAL.lime, alpha: 0.4 });
    }
    if (this.domeE.visible) {
      const de = this.domeE.clear();
      const a = Math.PI + ((this.time * 2) % 1) * Math.PI;
      de.moveTo(-34, HY0 - 7).lineTo(-34 + Math.cos(a) * 9, HY0 - 7 + Math.sin(a) * 9).stroke({ color: 0x5fe0ff, width: 1.6 });
      de.circle(-34, HY0 - 7, 2).fill({ color: 0x5fe0ff });
    }
    if (this.drillG.visible) {
      const sp = this.drillSpin.clear();
      const k = (this.time * (this.drilling ? 14 : 1.5)) % 1;
      for (let i = 0; i < 4; i++) {
        const u = (i + k) / 4;
        const x = HX1 + 4 + u * 34;
        const hw = 11 * (1 - u);
        sp.moveTo(x, 5 - hw).lineTo(x + 4, 5 + hw).stroke({ color: PAL.hullDark, width: 1.4, alpha: 0.8 });
      }
    }
    const back = this.faceAnim >= 0 ? -1 : 1;
    this.exhaustLight.x = this.x + back * (HX1 + 40);
    this.exhaustLight.y = this.y + 6;
    this.exhaustLight.intensity = 0.9 * this.burn;
    // The side line and fin edge glow while the sub is built (brighter with someone aboard).
    const live = built ? (o.piloted ? 1 : 0.45) : 0;
    this.sideLine.alpha = this.finEdge.alpha = live;
    this.sideGlow.alpha = this.finGlow.alpha = live * 0.9;

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
  private burn = 0;
  /** Painted words, kept reading left to right whichever way the sub faces. */
  private stencils: Text[] = [];

  /** Where the propeller wash comes out (world). */
  washPoint(): { x: number; y: number } {
    return { x: this.x - this.face * (HX1 + 32), y: this.y + 2 };
  }
}
