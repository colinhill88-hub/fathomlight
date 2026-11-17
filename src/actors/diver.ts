import { Container, Graphics, Text } from 'pixi.js';
import { isSolid } from '../world/terrain';
import { mulberry32 } from '../rng';
import { BREATH_OUT, Glance, Spring, batchAll, breathShape } from './animkit';

/**
 * The explorer, drawn entirely with code. The suit takes its inspiration
 * from the toy divers Colin played with as a kid (see DESIGN.md, Art
 * direction), reimagined as real, weathered dive gear rather than a toy:
 *
 *  - a swept helmet of tinted lime-green glass with a raised crest, the face
 *    visible inside,
 *  - a chrome-and-blue-steel collar yoke with a coiled breathing hose that
 *    runs from the back unit over the side of the helmet to a round
 *    regulator port on the chest,
 *  - grey sleeves, a charcoal suit with faint brass etched panel lines,
 *    and rust-red gloves and belt,
 *  - a compact chrome rebreather unit on the back instead of a tank.
 *
 * Joints (hips, knees, ankles, shoulders, elbows) are separate pieces so the
 * limbs can kick and scull. Weathering (rivets, scratches, rust) is painted on.
 *
 * Local drawing space: facing right, origin at the middle of the torso.
 */

/** The suit's colours, shared with the walker (the same person on foot). */
export const C = {
  suit: 0x3a4144, // charcoal, lifted a little so it parts from the base's 0x2f363b walls
  suitShade: 0x1a1d1d,
  suitLight: 0x4a504d,
  etch: 0xb39a4e, // brass etched lines
  sleeve: 0x394044, // charcoal sleeves (Colin's Crest diver boards, docs/art/kit2)
  sleeveShade: 0x1c1f20,
  red: 0xb3302a, // red gloves and fin tips
  redShade: 0x6e1c18,
  rust: 0x8a3a20,
  chrome: 0x6d7f9a, // blue-steel chrome
  chromeDark: 0x2c3647,
  chromeMid: 0x4d5d77,
  chromeHi: 0xd6e0ee,
  steelDark: 0x3b4448,
  steelLight: 0xaab4b5,
  rubber: 0x232524,
  rubberEdge: 0x3d4140,
  visor: 0xc6f03a, // neon lime glass
  visorEdge: 0x6f8f16,
  skin: 0x9a7058,
  accent: 0xe0a02a, // amber trim bands (thin, never hazard stripes)
  accentShade: 0x8a5e14,
  rim: 0x6fe8e0, // cool cyan rim light, painted on the edges that face the light
};

/** A thin amber trim band (x, y, w, h) with a darker lower edge. */
export function accentBand(g: Graphics, x: number, y: number, w: number, h: number): void {
  g.rect(x, y, w, h).fill({ color: C.accent, alpha: 0.92 });
  g.rect(x, y + h * 0.65, w, h * 0.35).fill({ color: C.accentShade, alpha: 0.7 });
}

/** A one-pixel painted rim light along an edge. */
export function rimEdge(g: Graphics, x0: number, y0: number, x1: number, y1: number, alpha = 0.5): void {
  g.moveTo(x0, y0).lineTo(x1, y1).stroke({ color: C.rim, alpha, width: 1, cap: 'round' });
}

const rand = mulberry32(0xd1e5);
const rngDefault = rand;

export function rivets(g: Graphics, pts: [number, number][], r = 1.1): void {
  for (const [x, y] of pts) {
    g.circle(x, y, r).fill({ color: C.chromeDark });
    g.circle(x - 0.3, y - 0.4, r * 0.45).fill({ color: C.chromeHi, alpha: 0.85 });
  }
}

export function scratches(g: Graphics, x0: number, y0: number, w: number, h: number, n: number, alpha = 0.22, rand = rngDefault): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + rand() * w;
    const y = y0 + rand() * h;
    const a = rand() * Math.PI;
    const l = 2 + rand() * 4;
    g.moveTo(x, y)
      .lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
      .stroke({ color: 0xffffff, alpha: alpha * (0.7 + rand() * 0.6), width: 0.6 });
  }
}

/** Faint engraved "circuit" panel lines, like etched brass trim on the suit. */
export function etching(g: Graphics, x0: number, y0: number, w: number, h: number, n: number, rand = rngDefault): void {
  for (let i = 0; i < n; i++) {
    let x = x0 + rand() * w;
    let y = y0 + rand() * h;
    g.moveTo(x, y);
    for (let k = 0; k < 3; k++) {
      if (rand() < 0.5) x = Math.min(x0 + w, Math.max(x0, x + (rand() - 0.5) * 14));
      else y = Math.min(y0 + h, Math.max(y0, y + (rand() - 0.5) * 8));
      g.lineTo(x, y);
    }
    g.stroke({ color: C.etch, alpha: 0.5, width: 0.7 });
    g.circle(x, y, 0.9).fill({ color: C.etch, alpha: 0.7 });
  }
}

/** Polished metal: base colour with bright and dark reflection bands. */
export function chromeBands(g: Graphics, x: number, y: number, w: number, h: number, r: number): void {
  g.roundRect(x, y, w, h, r).fill({ color: C.chrome });
  g.roundRect(x + 1, y + h * 0.55, w - 2, h * 0.4, r * 0.6).fill({ color: C.chromeMid, alpha: 0.85 });
  g.roundRect(x + 2, y + h * 0.12, w - 4, h * 0.16, h * 0.08).fill({ color: C.chromeHi, alpha: 0.75 });
  g.roundRect(x, y, w, h, r).stroke({ color: C.chromeDark, width: 1 });
}

/** A limb segment drawn along +x from its joint. */
export function segment(len: number, thick: number, color: number, shade: number): Graphics {
  const g = new Graphics();
  g.roundRect(-thick * 0.45, -thick / 2, len + thick * 0.9, thick, thick / 2).fill({ color });
  g.roundRect(-thick * 0.3, thick * 0.05, len + thick * 0.6, thick * 0.42, thick * 0.2).fill({
    color: shade,
    alpha: 0.6,
  });
  g.moveTo(0, -thick * 0.3)
    .lineTo(len, -thick * 0.3)
    .stroke({ color: C.rim, alpha: 0.5, width: 1, cap: 'round' });
  return g;
}

interface Leg {
  thigh: Container;
  shin: Container;
  fin: Container;
  /** The flexible end of the fin blade. */
  tip: Container;
  /** Ankle angle (relative to the shin) and its speed: a damped spring pushed by the water. */
  finAng: number;
  finVel: number;
  /** The shin's angle last frame, to tell how fast the foot sweeps through the water. */
  prevShin: number;
}
interface Arm {
  upper: Container;
  fore: Container;
}

function buildLeg(far: boolean): Leg {
  const tint = far ? 0x9a9a9a : 0xffffff;
  const thigh = new Container();
  const tg = segment(24, 13, C.suit, C.suitShade);
  etching(tg, 2, -5, 16, 10, 3);
  accentBand(tg, 5, -6.5, 3, 13);
  // Chrome knee guard.
  chromeBands(tg, 19, -6.5, 9, 13, 3);
  rivets(tg, [[23.5, -3.5], [23.5, 3.5]], 0.9);
  tg.tint = tint;
  thigh.addChild(tg);

  const shin = new Container();
  shin.x = 24;
  const sg = segment(21, 11, C.suit, C.suitShade);
  etching(sg, 2, -4, 16, 8, 2);
  sg.rect(14, -5.5, 5, 11).fill({ color: C.red, alpha: 0.9 }); // ankle strap
  scratches(sg, 2, -4, 18, 6, 3);
  sg.tint = tint;
  shin.addChild(sg);
  thigh.addChild(shin);

  // The fin is two pieces so the blade can flex: the foot pocket and the
  // stiff root of the blade turn at the ankle, and the softer tip bends
  // further on its own joint (follow-through in the water).
  const fin = new Container();
  fin.x = 22;
  fin.scale.set(0.88, 1);
  const fg = new Graphics();
  fg.roundRect(-5, -6, 12, 12, 4).fill({ color: C.rubber });
  fg.moveTo(2, -6).lineTo(19, -7).lineTo(19, 5.1).lineTo(4, 5).closePath().fill({ color: C.rubber });
  for (const y of [-4, 0, 3.5])
    fg.moveTo(8, y * 0.7)
      .lineTo(19, y * 1.03)
      .stroke({ color: 0x3e4140, width: 1, alpha: 0.7 });
  fg.moveTo(10, -2).lineTo(19, -2.3).stroke({ color: C.visor, width: 1, alpha: 0.7 });
  fg.tint = tint;
  const tip = new Container();
  tip.x = 18;
  const tg2 = new Graphics();
  // Short fins with red tips (the concept's "short fins").
  tg2.moveTo(-1, -7).lineTo(14, -8).quadraticCurveTo(19, -1, 16, 5.5).lineTo(-1, 5.1).closePath().fill({ color: C.rubber });
  tg2.moveTo(6, -7.5).lineTo(14, -8).quadraticCurveTo(19, -1, 16, 5.5).lineTo(6, 5.2).closePath().fill({ color: C.red });
  tg2.moveTo(14, -8).quadraticCurveTo(19, -1, 16, 5.5).stroke({ color: C.redShade, width: 1.6, alpha: 0.9 });
  for (const y of [-4, 0, 3.5])
    tg2.moveTo(0, y * 1.03)
      .lineTo(5, y * 1.1)
      .stroke({ color: 0x3e4140, width: 1, alpha: 0.7 });
  tg2.moveTo(0, -2.3).lineTo(2, -2.4).stroke({ color: C.visor, width: 1, alpha: 0.7 });
  tg2.tint = tint;
  tip.addChild(tg2);
  fin.addChild(fg, tip);
  shin.addChild(fin);
  return { thigh, shin, fin, tip, finAng: -0.3, finVel: 0, prevShin: Math.PI };
}

function buildArm(far: boolean): Arm {
  const tint = far ? 0x9a9a9a : 0xffffff;
  const upper = new Container();
  const ug = segment(17, 10, C.sleeve, C.sleeveShade);
  ug.circle(0, 0, 6).fill({ color: C.chrome }); // shoulder joint ring
  ug.circle(-1, -1.5, 2.5).fill({ color: C.chromeHi, alpha: 0.6 });
  ug.circle(0, 0, 6).stroke({ color: C.chromeDark, width: 1 });
  accentBand(ug, 9, -5, 2.6, 10);
  scratches(ug, 4, -4, 14, 8, 2);
  ug.tint = tint;
  upper.addChild(ug);

  const fore = new Container();
  fore.x = 17;
  const fg = segment(14, 9, C.sleeve, C.sleeveShade);
  // Rust-red glove with a chrome cuff ring.
  fg.roundRect(11, -5.2, 11, 10.4, 4.5).fill({ color: C.red });
  fg.roundRect(13, 1, 8, 3.5, 1.5).fill({ color: C.redShade, alpha: 0.7 });
  fg.rect(10, -5, 3, 10).fill({ color: C.chrome });
  fg.tint = tint;
  fore.addChild(fg);
  upper.addChild(fore);
  return { upper, fore };
}

function buildTorso(): Container {
  const c = new Container();
  const g = new Graphics();

  // Twin oxygen tanks along the back (Colin's Crest diver): dark chrome with lime
  // bands, valves and chrome caps towards the head.
  for (const [y, shade] of [[-38, C.steelDark], [-27, C.chromeDark]] as const) {
    g.roundRect(-30, y, 62, 12, 6).fill({ color: shade });
    g.roundRect(-30, y, 62, 12, 6).stroke({ color: C.steelLight, width: 0.8, alpha: 0.5 });
    g.rect(30, y + 1, 2, 10).fill({ color: C.chromeHi, alpha: 0.8 });
    g.roundRect(-27, y + 2, 56, 3, 1.5).fill({ color: 0x8e9aa2, alpha: 0.55 });
    g.rect(2, y + 1, 4, 10).fill({ color: C.visor, alpha: 0.9 });
    g.rect(-14, y + 1, 2, 10).fill({ color: C.visor, alpha: 0.6 });
    g.rect(32, y + 3, 6, 6).fill({ color: C.steelLight });
    g.rect(37, y + 1.5, 3, 9).fill({ color: C.chromeDark });
    scratches(g, -28, y + 1, 56, 9, 3, 0.25);
  }
  // A harpoon clipped along the tanks: white stock, chrome barrel and spear.
  g.moveTo(-40, -43).lineTo(44, -46).stroke({ color: C.chromeDark, width: 1.6 });
  g.poly([44, -46, 37, -48.5, 37.5, -43.5]).fill({ color: C.chromeHi });
  g.roundRect(-30, -47, 30, 6, 3).fill({ color: 0xd8dde0 });
  g.rect(-12, -41, 3, 6).fill({ color: 0xd8dde0 });
  g.moveTo(-28, -45).lineTo(-2, -45).stroke({ color: 0x8e979c, width: 1 });

  // Suit body: charcoal with brass etching.
  g.roundRect(-34, -15, 74, 30, 13).fill({ color: C.suit });
  g.roundRect(-32, 3, 70, 11, 6).fill({ color: C.suitShade, alpha: 0.75 });
  g.roundRect(-30, -13, 66, 5, 3).fill({ color: C.suitLight, alpha: 0.5 });
  etching(g, -26, -11, 44, 20, 9);
  accentBand(g, -12, -15, 4, 30);
  accentBand(g, 22, -15, 2.6, 30);
  rimEdge(g, -26, -14.5, 28, -14.5, 0.55);
  // Belt with a chrome buckle.
  g.rect(-28, -15, 7, 30).fill({ color: C.suitShade });
  chromeBands(g, -36, -5, 9, 12, 3);
  // Harness strap from the back unit.
  g.rect(14, -15, 5, 30).fill({ color: C.chromeDark, alpha: 0.85 });
  scratches(g, -30, -12, 70, 24, 6);
  for (let i = 0; i < 8; i++)
    g.circle(-30 + rand() * 60, 10 + rand() * 4, 0.8 + rand() * 1.1).fill({ color: 0x5f7a3a, alpha: 0.45 });

  // Collar yoke: the chrome ring that wraps the shoulders and seats the helmet.
  g.moveTo(30, -26)
    .lineTo(44, -24)
    .quadraticCurveTo(52, -10, 52, 6)
    .quadraticCurveTo(52, 18, 42, 19)
    .lineTo(30, 16)
    .quadraticCurveTo(34, -4, 30, -26)
    .closePath()
    .fill({ color: C.chrome })
    .stroke({ color: C.chromeDark, width: 1.2 });
  g.moveTo(36, -22).quadraticCurveTo(44, -8, 43, 12).stroke({ color: C.chromeHi, width: 2.2, alpha: 0.7, cap: 'round' });
  g.moveTo(47, -12).quadraticCurveTo(50, 2, 47, 14).stroke({ color: C.chromeMid, width: 2, alpha: 0.9, cap: 'round' });
  rivets(g, [[34, -20], [33, 12], [48, 15]], 1);

  // Regulator port on the chest: a round chrome fitting with a dark mouth
  // and grille slots below.
  g.circle(50, 9, 7).fill({ color: C.chrome }).stroke({ color: C.chromeDark, width: 1.2 });
  g.circle(51, 9, 3.2).fill({ color: 0x0d1114 });
  g.circle(48, 6.5, 1.6).fill({ color: C.chromeHi, alpha: 0.8 });
  for (let i = 0; i < 3; i++) g.rect(42 + i * 3.2, 15.5, 2, 3.2).fill({ color: C.chromeDark });
  c.addChild(g);

  const stencil = new Text({
    text: 'K7',
    style: { fontFamily: 'Courier New, monospace', fontSize: 10, fontWeight: 'bold', fill: 0x1d2430 },
    resolution: 4,
  });
  stencil.alpha = 0.6;
  stencil.anchor.set(0.5);
  stencil.position.set(-1, -19);
  c.addChild(stencil);
  return c;
}

/** Ribbed hose: a curve with closely spaced light and dark rings across it. */
export function coiledHose(g: Graphics, pts: [number, number][], width: number): void {
  const [p0, p1, p2, p3] = pts;
  const at = (t: number): [number, number] => {
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ];
  };
  g.moveTo(...p0)
    .bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1])
    .stroke({ color: C.chromeMid, width, cap: 'round' });
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y] = at(t);
    const [x2, y2] = at(Math.min(1, t + 0.01));
    let dx = x2 - x;
    let dy = y2 - y;
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    const h = width * 0.55;
    g.moveTo(x - dy * h, y + dx * h)
      .lineTo(x + dy * h, y - dx * h)
      .stroke({ color: i % 2 ? C.chromeHi : C.chromeDark, width: 1, alpha: i % 2 ? 0.8 : 0.9 });
  }
}

/**
 * Dive lamp: a chrome canister strapped to the harness on the near
 * shoulder, pointing forward under the helmet.
 */
/**
 * A mesh dive bag clipped to the belt at the hip (milestone 3 follow-up).
 * Drawn full; the diver scales it with how much is in it.
 */
export function buildDiveBag(): Container {
  const c = new Container();
  const g = new Graphics();
  // Clip and strap from the belt.
  g.rect(-1.5, -6, 3, 7).fill({ color: C.red });
  g.circle(0, 1, 2.2).stroke({ color: C.chrome, width: 1.2 });
  // The sack: a rounded mesh pouch with what is inside showing through.
  g.moveTo(-8, 2).quadraticCurveTo(-13, 14, -6, 21).quadraticCurveTo(0, 24, 6, 21).quadraticCurveTo(13, 14, 8, 2).closePath();
  g.fill({ color: 0x3b3a30, alpha: 0.92 });
  g.circle(-3, 13, 3.4).fill({ color: 0x6a5a4c }); // scrap
  g.circle(3, 16, 3).fill({ color: 0x6e5440 }); // copper
  g.circle(4.6, 15, 1.2).fill({ color: 0x5f9a72 });
  g.poly([0, 8, 1.5, 4, 3, 8, 2.6, 12, 0.4, 12]).fill({ color: 0xe8ecdf, alpha: 0.8 }); // quartz
  g.moveTo(-6, 7).quadraticCurveTo(-2, 10, -5, 17).stroke({ color: 0xc9a24a, width: 1 }); // fibre
  // Netting.
  for (let i = -2; i <= 2; i++) g.moveTo(i * 3.2, 2).quadraticCurveTo(i * 4.4, 13, i * 2.4, 22);
  for (const y of [7, 12, 17]) g.moveTo(-10.5, y).quadraticCurveTo(0, y + 2.2, 10.5, y);
  g.stroke({ color: 0x8c876e, width: 0.7, alpha: 0.85 });
  g.roundRect(-8.5, 1, 17, 3, 1.5).fill({ color: C.rubber });
  c.addChild(g);
  return c;
}

/** What the specimen jar holds, for the jar on the belt. */
export interface JarLook {
  species: 'glowfin' | 'puffcap' | 'ray' | 'crab' | 'shrimp';
  stage: 'egg' | 'young' | 'grown';
}

const JAR_TINT: Record<JarLook['species'], { body: number; fin: number; glow?: number }> = {
  glowfin: { body: 0xc4697d, fin: 0x8e3f55, glow: 0xfff2a8 },
  puffcap: { body: 0xffc4d2, fin: 0xd88aa0 },
  ray: { body: 0x8fa6c4, fin: 0x5c6482 },
  crab: { body: 0xe0703a, fin: 0x9a4220 },
  shrimp: { body: 0xff9a92, fin: 0xd0605a },
};

/**
 * The specimen jar, clipped to the belt (Colin, after the terrain pass): a
 * small glass jar with a chrome lid, empty until something is caught, then
 * showing what is inside (eggs, a youngster or a grown creature).
 */
export class BeltJar {
  readonly view = new Container();
  private content = new Graphics();
  private key = '';
  constructor() {
    const g = new Graphics();
    // Clip and strap from the belt.
    g.rect(-1.2, -5, 2.4, 5.5).fill({ color: C.red });
    g.circle(0, 0, 1.8).stroke({ color: C.chrome, width: 1 });
    // The jar: glass with a chrome lid and band.
    g.roundRect(-4.6, 2.6, 9.2, 11.4, 3).fill({ color: 0x2e5a62, alpha: 0.55 });
    this.view.addChild(g, this.content);
    const front = new Graphics();
    front.roundRect(-4.6, 2.6, 9.2, 11.4, 3).stroke({ color: 0xc8eef2, width: 0.8, alpha: 0.85 });
    front.rect(-3.4, 4.2, 1.1, 7.5).fill({ color: 0xffffff, alpha: 0.38 });
    front.roundRect(-5.2, 0.4, 10.4, 3, 1.2).fill({ color: C.chromeMid });
    front.rect(-5.2, 0.4, 10.4, 1).fill({ color: C.chromeHi, alpha: 0.7 });
    front.rect(-4.6, 9.6, 9.2, 1.2).fill({ color: C.accent, alpha: 0.8 });
    this.view.addChild(front);
    this.view.visible = false;
  }
  /** Show what the jar holds (null hides the jar: nothing caught). */
  set(look: JarLook | null, time: number): void {
    this.view.visible = !!look;
    if (!look) return;
    const k = look.species + look.stage;
    const t = JAR_TINT[look.species];
    if (k !== this.key) {
      this.key = k;
      const g = this.content.clear();
      if (look.stage === 'egg') {
        for (const [x, y, r] of [[-1.6, 11.6, 1.5], [1.4, 11.8, 1.4], [0, 9.6, 1.4]] as const) {
          g.circle(x, y, r).fill({ color: t.body, alpha: 0.85 });
          g.circle(x - 0.4, y - 0.4, r * 0.35).fill({ color: 0xffffff, alpha: 0.6 });
        }
      } else {
        const sc = look.stage === 'grown' ? 1 : 0.7;
        if (t.glow) g.circle(0, 8, 4.4 * sc).fill({ color: t.glow, alpha: 0.35 });
        if (look.species === 'crab') {
          g.ellipse(0, 9, 3 * sc, 2 * sc).fill({ color: t.body });
          for (const sx of [-1, 1]) g.circle(sx * 3.2 * sc, 7.6, 1.1 * sc).fill({ color: t.fin });
        } else if (look.species === 'ray') {
          g.poly([-3.8 * sc, 8, 0, 6.2, 3.8 * sc, 8, 0, 9.6]).fill({ color: t.body });
          g.rect(-0.3, 9, 0.6, 3 * sc).fill({ color: t.fin });
        } else {
          g.ellipse(0.6, 8, 2.8 * sc, 1.7 * sc).fill({ color: t.body });
          g.poly([-1.8 * sc, 8, -3.8 * sc, 6.4, -3.8 * sc, 9.6]).fill({ color: t.fin });
          g.circle(2 * sc, 7.6, 0.5).fill({ color: 0x141414 });
        }
        if (t.glow) g.circle(2.6 * sc, 6.6, 0.9).fill({ color: t.glow });
      }
    }
    // The creature drifts a little in its water.
    this.content.position.set(Math.sin(time * 1.3) * 0.5, Math.sin(time * 2.1) * 0.4);
  }
}

export function buildShoulderLamp(): Graphics {
  const g = new Graphics();
  g.rect(33, 7, 3.5, 15).fill({ color: C.red }); // strap round the harness
  g.rect(33, 7, 3.5, 4).fill({ color: C.redShade, alpha: 0.6 });
  chromeBands(g, 28, 10.5, 16, 8, 3.5);
  g.roundRect(43, 9.5, 4, 10, 1.5).fill({ color: C.chromeDark }); // front bezel
  g.rect(30, 11.5, 2.5, 6).fill({ color: C.chromeDark, alpha: 0.7 }); // end cap
  rivets(g, [[39, 12.5]], 0.8);
  scratches(g, 29, 11, 13, 6, 2, 0.3);
  return g;
}

/** The helmet's glass outline as points (for splitting off the walker's lifting face plate). */
function shellPoints(): number[] {
  const pts: number[] = [];
  const cubic = (p0: number[], p1: number[], p2: number[], p3: number[]) => {
    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      const u = 1 - t;
      pts.push(
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      );
    }
  };
  pts.push(46, 15);
  cubic([46, 15], [37, 4], [37, -18], [54, -25]);
  cubic([54, -25], [66, -30], [81, -26], [87, -14]);
  cubic([87, -14], [92, -4], [91, 8], [83, 15]);
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    const u = 1 - t;
    pts.push(u * u * 83 + 2 * u * t * 64 + t * t * 46, u * u * 15 + 2 * u * t * 21 + t * t * 15);
  }
  return pts;
}

/** Keep the part of a polygon on one side of the line x = cut (front: x >= cut). */
function clipX(pts: number[], cut: number, front: boolean): number[] {
  const out: number[] = [];
  const n = pts.length / 2;
  const inside = (x: number) => (front ? x >= cut : x <= cut);
  for (let i = 0; i < n; i++) {
    const ax = pts[i * 2];
    const ay = pts[i * 2 + 1];
    const bx = pts[((i + 1) % n) * 2];
    const by = pts[((i + 1) % n) * 2 + 1];
    if (inside(ax)) out.push(ax, ay);
    if (inside(ax) !== inside(bx)) out.push(cut, ay + ((cut - ax) / (bx - ax)) * (by - ay));
  }
  return out;
}

/** Where the walker's face plate is hinged, in helmet space (it lifts up and forward about here). */
export const PLATE_HINGE = { x: 70, y: -28 };

/**
 * The helmet. With `plate` (the walker), the front of the glass is a
 * separate piece labelled 'plate' so the face plate can lift; drawn shut it
 * looks the same as the diver's.
 */
export function buildHelmet(plate = false): Container {
  const c = new Container();
  const g = new Graphics();
  const shell = (q: Graphics) =>
    q
      .moveTo(46, 15)
      .bezierCurveTo(37, 4, 37, -18, 54, -25)
      .bezierCurveTo(66, -30, 81, -26, 87, -14)
      .bezierCurveTo(92, -4, 91, 8, 83, 15)
      .quadraticCurveTo(64, 21, 46, 15)
      .closePath();

  // Inside of the helmet: in shadow, so the glass reads as deep and tinted.
  // (On foot, only behind the face plate: with the plate up, the face is in the open air.)
  if (plate) g.poly(clipX(shellPoints(), PLATE_HINGE.x, false)).fill({ color: 0x0e1a17, alpha: 0.55 });
  else shell(g).fill({ color: 0x0e1a17, alpha: 0.55 });
  c.addChild(g);
  // The head is its own piece so it can turn a little inside the glass.
  const hd = new Graphics();
  hd.label = 'head';
  // The head in side profile, filling most of the helmet: skull, brow,
  // nose, lips, chin and a jaw line that rises back towards the ear. Below
  // it a slim neck in shadow disappears into the suit's dark neck seal.
  // Neck first, so the jaw overlaps it.
  hd.moveTo(61, 6).lineTo(71, 6).lineTo(70.5, 16).lineTo(60.5, 16).closePath().fill({ color: 0x6e4c3b });
  hd.moveTo(61, 6).lineTo(71, 6).lineTo(70.5, 10).quadraticCurveTo(66, 8, 61, 9).closePath().fill({ color: 0x2c1e17, alpha: 0.45 });
  const head = () =>
    hd
      .moveTo(60, 9)
      .bezierCurveTo(54, 5, 50, -2, 51, -8)
      .bezierCurveTo(52, -17, 62, -23, 71, -22)
      .bezierCurveTo(78, -21, 82, -16, 82.5, -10)
      .quadraticCurveTo(83, -7, 82.2, -5)
      .lineTo(85, 0) // nose
      .quadraticCurveTo(85.2, 1.6, 82.6, 2)
      .quadraticCurveTo(83.6, 3.6, 82.4, 5) // lips
      .quadraticCurveTo(83.2, 7.5, 81, 9.3) // chin
      .quadraticCurveTo(76, 10.2, 70.5, 7.5) // jaw line, rising to the ear
      .quadraticCurveTo(66, 6, 60, 9)
      .closePath();
  head().fill({ color: C.skin });
  // Shading: the back of the head is turned away from the light.
  hd.moveTo(60, 9)
    .bezierCurveTo(54, 5, 50, -2, 51, -8)
    .bezierCurveTo(52, -14, 58, -19, 64, -21)
    .quadraticCurveTo(60, -6, 66, 6.5)
    .quadraticCurveTo(63, 7, 60, 9)
    .closePath()
    .fill({ color: 0x3a2a22, alpha: 0.4 });
  // Soft shadow under the jaw and a cheekbone highlight.
  hd.moveTo(81, 9.3).quadraticCurveTo(76, 10.2, 70.5, 7.5).quadraticCurveTo(76, 7.6, 80.4, 7.6).closePath().fill({ color: 0x2c1e17, alpha: 0.35 });
  hd.ellipse(77.5, -1.2, 3.4, 2).fill({ color: 0xc69274, alpha: 0.35 });
  // Cap of hair over the crown and back of the head, with a few strands.
  hd.moveTo(51.5, -3)
    .bezierCurveTo(50, -14, 60, -23, 71, -22)
    .bezierCurveTo(77, -21.5, 80.5, -18, 81.5, -14)
    .quadraticCurveTo(72, -17, 64, -12)
    .quadraticCurveTo(58, -8, 57, 1)
    .closePath()
    .fill({ color: 0x3b261c });
  for (const [x0, y0, x1, y1] of [[56, -14, 66, -19], [60, -10, 72, -17], [54, -6, 60, -15]])
    hd.moveTo(x0, y0).lineTo(x1, y1).stroke({ color: 0x5a3c2c, width: 0.7, alpha: 0.7 });
  // Ear.
  hd.moveTo(63, -4.5).quadraticCurveTo(67.5, -5, 67, 0).quadraticCurveTo(66.5, 3.5, 63.5, 3).quadraticCurveTo(62, -1, 63, -4.5).fill({ color: 0x8a5f49 });
  hd.moveTo(64.2, -2.5).quadraticCurveTo(66, -2.6, 65.6, 0.4).stroke({ color: 0x5e3f30, width: 0.8, alpha: 0.85 });
  // Brow, eye with an upper lid, nostril, the line from nose to mouth, lips.
  hd.moveTo(75.5, -9.6).quadraticCurveTo(78.8, -11, 81.6, -9.6).stroke({ color: 0x2a1a14, width: 1.4, alpha: 0.9 });
  hd.moveTo(77.4, -6.4).quadraticCurveTo(79.2, -7.6, 80.8, -6.2).quadraticCurveTo(79.2, -5.4, 77.4, -6.4).fill({ color: 0xe8e0d6 });
  hd.circle(79.8, -6.4, 0.85).fill({ color: 0x1a120e });
  hd.moveTo(77.2, -6.6).quadraticCurveTo(79.2, -8.1, 81, -6.5).stroke({ color: 0x2a1a14, width: 0.7, alpha: 0.85 });
  hd.circle(83.2, 0.8, 0.55).fill({ color: 0x3a241b, alpha: 0.85 });
  hd.moveTo(81.4, 1.2).quadraticCurveTo(80, 3.4, 80.8, 5.4).stroke({ color: 0x5e3a2c, width: 0.6, alpha: 0.5 });
  hd.moveTo(82.2, 3).lineTo(83.3, 3.3).stroke({ color: 0x6a3a2c, width: 0.9 });
  // An eyelid for the occasional blink (shown by the Diver).
  const lid = new Graphics();
  lid.moveTo(77.2, -6.8).quadraticCurveTo(79.2, -8.1, 81, -6.6).quadraticCurveTo(79.2, -5.2, 77.2, -6.2).closePath().fill({ color: 0x8a5f49 });
  lid.label = 'eyelid';
  lid.visible = false;
  const headRig = new Container();
  headRig.label = 'headRig';
  headRig.addChild(hd, lid);
  c.addChild(headRig);
  const f = new Graphics();
  // The suit's neck seal: a dark rubber collar with a metal ring, sitting in
  // the bottom of the helmet.
  f.moveTo(52, 13).quadraticCurveTo(64, 10.5, 77, 12.5).lineTo(79, 20).quadraticCurveTo(64, 22, 50, 19).closePath().fill({ color: C.suit });
  f.moveTo(52, 13).quadraticCurveTo(64, 10.5, 77, 12.5).stroke({ color: C.chrome, width: 1.6 });
  // Tinted glass shell (on foot, only the back of it: the front is the face plate).
  const CUT = PLATE_HINGE.x;
  const pl = new Graphics();
  if (plate) {
    const pts = shellPoints();
    const back = clipX(pts, CUT, false);
    const front = clipX(pts, CUT, true);
    f.poly(back).fill({ color: C.visor, alpha: 0.3 });
    // Outline the back glass along the shell only, not along the cut where the plate meets it.
    let k0 = 0;
    for (let i = 0; i < back.length; i += 2) if (back[i] === CUT && back[(i + 2) % back.length] === CUT) k0 = (i + 2) % back.length;
    f.moveTo(back[k0], back[k0 + 1]);
    for (let j = 2; j < back.length; j += 2) f.lineTo(back[(k0 + j) % back.length], back[(k0 + j + 1) % back.length]);
    f.stroke({ color: C.visorEdge, width: 2, alpha: 0.95 });
    pl.poly(front).fill({ color: C.visor, alpha: 0.3 });
    pl.poly(front).stroke({ color: C.visorEdge, width: 2, alpha: 0.95 });
  } else {
    shell(f).fill({ color: C.visor, alpha: 0.3 });
    shell(f).stroke({ color: C.visorEdge, width: 2, alpha: 0.95 });
  }
  // The face plate's details go on the plate when it is a separate piece.
  const fp = plate ? pl : f;
  // Thick glass catches more colour along its edges.
  f.moveTo(47, 12).bezierCurveTo(40, 2, 40, -16, 55, -22).stroke({ color: C.visor, width: 3, alpha: 0.55, cap: 'round' });

  // One smooth crest fin, sweeping back past the rear of the helmet.
  f.moveTo(82, -22)
    .quadraticCurveTo(79, -37, 65, -39)
    .quadraticCurveTo(49, -40, 35, -32)
    .quadraticCurveTo(47, -27, 56, -25.5)
    .quadraticCurveTo(70, -27, 82, -22)
    .closePath()
    .fill({ color: C.visor, alpha: 0.8 })
    .stroke({ color: C.visorEdge, width: 1.5 });
  f.moveTo(78, -26).quadraticCurveTo(64, -32, 44, -31).stroke({ color: C.visorEdge, width: 1, alpha: 0.7 });
  f.moveTo(76, -30).quadraticCurveTo(66, -34, 54, -34).stroke({ color: 0xf2ffd0, width: 1.4, alpha: 0.55, cap: 'round' });

  // Moulded rib down the side, and the face-plate frame.
  f.moveTo(55, -20).quadraticCurveTo(52, -4, 56, 12).stroke({ color: C.visorEdge, width: 1.4, alpha: 0.7 });
  fp.moveTo(82, -17).bezierCurveTo(87, -8, 87, 5, 81, 13).stroke({ color: C.visorEdge, width: 2, alpha: 0.9 });

  // Reflections.
  f.moveTo(60, -21).quadraticCurveTo(71, -26, 81, -18).stroke({ color: 0xf6ffe0, width: 2.4, alpha: 0.55, cap: 'round' });
  fp.circle(85, -9, 1.7).fill({ color: 0xffffff, alpha: 0.7 });
  fp.moveTo(87.5, -2).quadraticCurveTo(88, 3, 86, 8).stroke({ color: 0xffffff, width: 1.2, alpha: 0.35, cap: 'round' });


  // Coiled breathing hose from the back unit, over the side of the helmet,
  // down to the regulator port on the chest.
  c.addChild(f);
  if (plate) {
    pl.label = 'plate';
    pl.pivot.set(PLATE_HINGE.x, PLATE_HINGE.y);
    pl.position.set(PLATE_HINGE.x, PLATE_HINGE.y);
    c.addChild(pl);
  }
  // The hose is its own piece (the Diver moves it to the body so it can sway a little).
  const hose = new Graphics();
  coiledHose(hose, [[44, -42], [60, -46], [59, -8], [51, 3]], 4.2);
  hose.label = 'hose';
  c.addChild(hose);

  // Breath fogging the inside of the glass after surfacing (faded in and out by the Diver).
  const fog = new Graphics();
  fog
    .moveTo(48, 13)
    .bezierCurveTo(40, 4, 40, -17, 55, -23)
    .bezierCurveTo(66, -28, 80, -24, 86, -13)
    .bezierCurveTo(90, -4, 89, 7, 82, 13)
    .quadraticCurveTo(64, 19, 48, 13)
    .closePath()
    .fill({ color: 0xeef4ee, alpha: 0.75 });
  fog.ellipse(78, 2, 7, 5).fill({ color: 0xffffff, alpha: 0.4 }); // densest in front of the mouth
  fog.label = 'visorFog';
  fog.alpha = 0;
  // Water running off the glass after breaking the surface.
  const drops = new Graphics();
  for (const [x, y, r] of [[62, -22, 1.6], [74, -19, 1.2], [84, -8, 1.5], [86, 3, 1.1], [70, -12, 0.9], [57, -14, 1.2], [80, 9, 1.3]]) {
    drops.ellipse(x, y, r * 0.8, r * 1.2).fill({ color: 0xffffff, alpha: 0.55 });
    drops.moveTo(x, y + r).lineTo(x, y + r + 4).stroke({ color: 0xffffff, width: 0.6, alpha: 0.3 });
  }
  drops.label = 'visorDrops';
  drops.alpha = 0;
  c.addChild(fog, drops);
  return c;
}

export interface LampPose {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
}

export class Diver {
  readonly view = new Container();
  /** The glowing lens of the shoulder lamp, drawn without lighting so it shines. */
  readonly lens = new Graphics();
  readonly lensGlow = new Graphics();

  x = 300;
  y = 300;
  vx = 0;
  vy = 0;
  lampOn = true;
  /** 0..1, how fast the diver is going relative to normal top speed. */
  speedNorm = 0;

  /** True while treading water with the head above the surface. */
  surfaced = false;
  /** Seconds since breaking the surface (for the oxygen refill to start after the first breath). */
  surfaceTime = 0;
  /** Set for one frame: how hard (0..1) the diver hit the surface, or ducked back under. Read by main. */
  splash = 0;
  /** Set for one frame when the diver breathes out above water. */
  exhale = false;
  /** Set while collecting: the diver stays still and works at a spot with the near arm. */
  working: { x: number; y: number } | null = null;
  /**
   * How heavy the dive bag is: 0 empty, 1 at the rated load, more when
   * overloaded (milestone 3 follow-up). Slows swimming and climbing, and
   * the diver slowly sinks when not swimming.
   */
  load = 0;
  /** Set while standing on a floor that holds the diver up (inside a dome): no sinking. */
  noSink = false;
  /** Milestone 7 part 2: water flowing past (the cold surge in the kelp caves), in units per second. */
  current = { x: 0, y: 0 };

  private body = new Container();
  private nearLeg = buildLeg(false);
  private farLeg = buildLeg(true);
  private nearArm = buildArm(false);
  private farArm = buildArm(true);
  private face = 1; // 1 right, -1 left
  /** The facing mirror (a critically damped spring) and the body's angle. */
  private faceS = new Spring(1);
  private pitchS = new Spring(0);
  private get pitch(): number {
    return this.pitchS.x;
  }
  private kick = 0;
  private time = 0;
  private boostTime = 0;
  private boostCooldown = 0;
  private lampLevel = 1;
  private popStrength = 0;
  private breathClock = 0;
  private breaths = 0;
  private heave = 0;
  private diveCooldown = 0;
  private diveBag = buildDiveBag();
  /** The specimen jar on the belt (set from the save each frame). */
  jar: JarLook | null = null;
  private beltJar = new BeltJar();
  /** Hip thruster rig: a white housing with a lime nozzle, and the plume while boosting. */
  private thruster = new Graphics();
  private plume = new Graphics();
  private visorFog!: Container;
  private visorDrops!: Container;
  private headRig!: Container;
  private eyelid!: Container;
  private hose!: Container;

  // ---- Animation state (character animation polish, session A) ----
  // Everything here is plain numbers updated in place: no objects are made per frame.
  /** Smoothed swimming effort, 0 floating still .. 1 full kick. Builds up and dies away gradually. */
  private drive = 0;
  /** Smoothed boost, 0..1: ramps in fast and fades out over about half a second. */
  private boostLvl = 0;
  /** Smoothed hip swing of the kick, radians. */
  private kickAmp = 0.06;
  /** 0 relaxed floating pose .. 1 streamlined swimming pose. */
  private swimBlend = 0;
  /** 0 arms sculling in front .. 1 arms back along the body (a slow pull stroke between them). */
  private armBlend = 0;
  /** 1 just after turning around, fading to 0: extra sculling and kicking while the body comes round. */
  private turn = 0;
  /** Underwater breathing: phase 0..1 of the current breath, and bubbles waiting to be released. */
  private breathUw = 0.3;
  private bubblesDue = 0;
  private trickle = 0;
  /** The head inside the glass: where it is looking now, where it wants to look, and when it next glances. */
  private headS = new Spring(0);
  private glance = new Glance(rand);
  /** The dive bag hangs like a pendulum, the hose sways a little. */
  private bagS = new Spring(0);
  private hoseS = new Spring(0);
  private lastVx = 0;
  private plumeDrawn = false;
  /** Reused for lampPose so the per-frame lamp query makes no garbage. */
  private readonly lampOut: LampPose = { x: 0, y: 0, dirX: 1, dirY: 0 };

  private static readonly SCALE = 0.86;
  private static readonly RADIUS = 26;
  private static readonly SPEED = 230;
  private static readonly BOOST_SPEED = 430;

  constructor() {
    // The torso is drawn long and compressed a little here for a stockier build.
    const torso = buildTorso();
    torso.scale.x = 0.88;
    const helmet = buildHelmet();
    helmet.x = -6;
    this.visorFog = helmet.getChildByLabel('visorFog')!;
    this.visorDrops = helmet.getChildByLabel('visorDrops')!;
    // The head turns about the neck, inside the glass.
    this.headRig = helmet.getChildByLabel('headRig')!;
    this.headRig.pivot.set(66, 8);
    this.headRig.position.set(66, 8);
    this.eyelid = this.headRig.getChildByLabel('eyelid', true)!;
    // The hose sways about its chest fitting; it lives on the body, over the helmet.
    this.hose = helmet.getChildByLabel('hose')!;
    helmet.removeChild(this.hose);
    this.hose.pivot.set(51, 3);
    this.hose.position.set(51 - 6, 3);
    const hip = { x: -26, y: 5 };
    const shoulder = { x: 25, y: 6 };
    this.farLeg.thigh.position.set(hip.x + 2, hip.y - 3);
    this.nearLeg.thigh.position.set(hip.x, hip.y + 2);
    this.farArm.upper.position.set(shoulder.x + 2, shoulder.y - 3);
    this.nearArm.upper.position.set(shoulder.x, shoulder.y + 2);
    this.body.addChild(
      this.farLeg.thigh,
      this.farArm.upper,
      torso,
      this.diveBag,
      this.beltJar.view,
      helmet,
      this.hose,
      buildShoulderLamp(),
      this.nearLeg.thigh,
      this.plume,
      this.thruster,
      this.nearArm.upper,
    );
    this.diveBag.position.set(-8, 15);
    this.beltJar.view.position.set(5, 15);
    {
      const t = this.thruster;
      t.roundRect(-30, 8, 24, 12, 5).fill({ color: 0xd8dde0 });
      t.roundRect(-28, 9, 20, 3, 1.5).fill({ color: 0xffffff, alpha: 0.6 });
      t.rect(-19, 8, 2, 12).fill({ color: 0x8e979c });
      t.roundRect(-36, 9.5, 8, 9, 2).fill({ color: C.chromeDark });
      t.circle(-36, 14, 4).fill({ color: C.visor, alpha: 0.9 });
      t.rect(-12, 10, 10, 3).fill({ color: C.chromeDark });
    }
    this.diveBag.visible = false;
    this.body.position.set(0, 0);
    this.view.addChild(this.body);

    this.lens.circle(0, 0, 2.4).fill({ color: 0xfff3d0 });
    this.lensGlow.circle(0, 0, 14).fill({ color: 0xffe9b0, alpha: 0.9 });
    batchAll(this.view);
  }

  /** The middle of the helmet, in world space (for breath vapour and the surface splash). */
  helmetPoint(): [number, number] {
    return this.toWorld(58, -5);
  }

  /** Where the shoulder lamp's lens sits, in local drawing space. */
  private static readonly LAMP = { x: 48, y: 14.5 };
  private static readonly BUBBLE = { x: 47, y: 9 };

  /**
   * Local drawing space to world space. The facing flip is a mirror in
   * world x (so turning around never flips the body's tilt), applied after
   * the body's pitch.
   */
  private toWorld(lx: number, ly: number): [number, number] {
    const S = Diver.SCALE;
    lx *= S;
    ly *= S;
    const r = this.body.rotation;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return [this.x + this.view.scale.x * (lx * c - ly * s), this.y + this.body.y + lx * s + ly * c];
  }

  /**
   * Where the lamp is and where it points. The same object is returned
   * every call (copy the numbers if you need to keep them).
   */
  lampPose(): LampPose {
    const [x, y] = this.toWorld(Diver.LAMP.x, Diver.LAMP.y);
    const r = this.body.rotation;
    const dyl = 0.1; // aim slightly downwards
    // The beam swaps sides when the body passes edge-on halfway through a turn.
    const side = this.view.scale.x >= 0 ? 1 : -1;
    const o = this.lampOut;
    o.x = x;
    o.y = y;
    o.dirX = side * (Math.cos(r) - dyl * Math.sin(r));
    o.dirY = Math.sin(r) + dyl * Math.cos(r);
    return o;
  }

  /**
   * Bubbles breathed out since the last call (underwater only). Bubbles
   * now leave the helmet in time with the diver's breathing.
   */
  takeBubbles(): number {
    const n = Math.floor(this.bubblesDue);
    this.bubblesDue -= n;
    return n;
  }

  bubblePoint(): [number, number] {
    return this.toWorld(Diver.BUBBLE.x, Diver.BUBBLE.y);
  }

  /** How strongly the lamp shines right now (it fades on and off). */
  get lamp(): number {
    return this.lampLevel;
  }

  /** Which way the diver faces: 1 right, -1 left. */
  get facing(): number {
    return this.face;
  }

  get boosting(): boolean {
    return this.boostTime > 0;
  }

  update(dt: number, moveX: number, moveY: number, boost: boolean, toggleLamp: boolean): void {
    this.time += dt;
    if (toggleLamp) this.lampOn = !this.lampOn;
    this.lampLevel += ((this.lampOn ? 1 : 0) - this.lampLevel) * Math.min(1, dt * 10);

    // Boost: a short burst of hard kicking, then a cooldown.
    this.boostCooldown = Math.max(0, this.boostCooldown - dt);
    this.boostTime = Math.max(0, this.boostTime - dt);
    if (boost && this.boostCooldown <= 0) {
      this.boostTime = 0.55;
      this.boostCooldown = 1.1;
      let bx = moveX;
      let by = moveY;
      if (Math.hypot(bx, by) < 0.2) {
        bx = this.face;
        by = 0;
      }
      const l = Math.hypot(bx, by);
      const push = 260 * (1 - 0.2 * Math.min(1.6, this.load));
      this.vx += (bx / l) * push;
      this.vy += (by / l) * push;
    }

    // Breaking the surface, and ducking back under.
    this.splash = 0;
    this.exhale = false;
    this.diveCooldown = Math.max(0, this.diveCooldown - dt);
    if (this.surfaced) {
      if (moveY > 0.4) {
        this.surfaced = false;
        this.vy = 170;
        this.splash = 0.35;
        this.diveCooldown = 0.8;
      }
    } else if (this.y <= 48 && moveY < 0.25 && this.vy <= 40 && this.diveCooldown <= 0) {
      this.surfaced = true;
      this.surfaceTime = 0;
      const hit = Math.max(0, -this.vy) / 300;
      this.popStrength = Math.min(1, 0.3 + hit);
      this.splash = hit > 0.12 ? Math.min(1, 0.3 + hit) : 0;
      this.breathClock = 0.35; // first gasp straight away
      this.breaths = 0;
      if (this.splash > 0) this.visorDrops.alpha = 1;
    }

    // Swim physics: accelerate towards the wanted velocity, with water drag.
    const top = this.boostTime > 0 ? Diver.BOOST_SPEED : Diver.SPEED;
    // A heavy dive bag: slower everywhere, slower still going up, and a slow sink when not swimming.
    const L = Math.min(1.6, this.load);
    const heavy = 1 - 0.22 * L;
    const slow = (this.surfaced ? 0.5 : this.working ? 0.15 : 1) * heavy;
    const wantX = moveX * top * slow;
    const effort = Math.min(1, Math.hypot(moveX, moveY));
    const climb = moveY < 0 ? 1 - 0.15 * L : 1;
    const sink = this.surfaced || this.working || this.noSink ? 0 : 30 * L * (1 - 0.75 * effort);
    const wantY = this.surfaced ? 0 : moveY * top * slow * climb + sink;
    const accel = Math.hypot(moveX, moveY) > 0.05 ? 3.2 : 1.4;
    const k = 1 - Math.exp(-accel * dt);
    // A current carries the diver: it adds to the speed they swim at.
    this.vx += (wantX + this.current.x - this.vx) * k;
    this.vy += (wantY + this.current.y - this.vy) * k;
    // Gentle bob when floating still.
    this.vy += Math.sin(this.time * 1.6) * 6 * dt * (1 - Math.min(1, Math.hypot(moveX, moveY)));

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.surfaced) this.treadWater(dt);
    this.collide();

    const speed = Math.hypot(this.vx, this.vy);
    this.speedNorm = Math.min(1.6, speed / Diver.SPEED);

    this.animate(dt, moveX, moveY);
  }

  /**
   * Animate only, for when something else moves the diver (the grapple
   * reeling them in): the body keeps breathing and trails its legs
   * instead of freezing mid-kick.
   */
  pose(dt: number): void {
    this.time += dt;
    this.speedNorm = Math.min(1.6, Math.hypot(this.vx, this.vy) / Diver.SPEED);
    this.animate(dt, 0, 0);
  }

  /**
   * Everything visual that follows from the movement: facing, body angle,
   * breathing, the head, equipment, and the limbs. Gameplay state (position,
   * speed, collisions) is never changed here.
   */
  private animate(dtIn: number, moveX: number, moveY: number): void {
    // Springs below are stable to about 1/20 s; a long hitch just slows the animation.
    const dt = Math.min(dtIn, 0.05);
    if (dt <= 0) return;
    const speed = Math.hypot(this.vx, this.vy);
    const input = this.surfaced || this.working ? 0 : Math.min(1, Math.hypot(moveX, moveY));

    // Facing. Turning around starts a short "coming round" envelope.
    const prevFace = this.face;
    if (this.vx > 25) this.face = 1;
    else if (this.vx < -25) this.face = -1;
    if (this.face !== prevFace) this.turn = 1;
    this.turn = Math.max(0, this.turn - dt * 1.6);
    // A critically damped spring: the turn eases in and out instead of starting at full speed.
    this.faceS.step(this.face, 13, 1, dt);

    // Effort and boost, smoothed: kicks build up as the diver gets going and
    // die away slowly after letting go, so the diver glides to a stop.
    const L = Math.min(1.6, this.load);
    let want = input * (0.5 + 0.5 * Math.min(1, this.speedNorm)) + this.turn * 0.25 * input;
    if (this.surfaced) want = 0.3; // treading water
    want = Math.min(1, want);
    this.drive += (want - this.drive) * Math.min(1, dt * (want > this.drive ? 3.2 : 1.1));
    const bWant = this.boostTime > 0 ? 1 : 0;
    this.boostLvl += (bWant - this.boostLvl) * Math.min(1, dt * (bWant > this.boostLvl ? 14 : 2.4));

    // Pose blends: streamlined when travelling, relaxed when floating.
    const moving = this.surfaced ? 0 : Math.min(1, speed / 60);
    const swimWant = this.surfaced || this.working ? 0 : Math.max(moving, input * 0.6);
    this.swimBlend += (swimWant - this.swimBlend) * Math.min(1, dt * (swimWant > this.swimBlend ? 3 : 1.4));
    // The arms pull back quickly when setting off (a stroke) and drift forward slowly when stopping.
    this.armBlend += (swimWant - this.armBlend) * Math.min(1, dt * (swimWant > this.armBlend ? 4.5 : 1.2));

    // Breathing underwater: slow and calm when still, quicker when working hard.
    if (!this.surfaced) {
      const period = 4.2 - 1.2 * this.drive - 1.1 * this.boostLvl - 0.4 * L * this.drive;
      const before = this.breathUw;
      this.breathUw += dt / period;
      if (this.breathUw >= 1) this.breathUw -= 1;
      const ph = this.breathUw;
      // In over the first 40%, then a longer breath out.
      this.heave = breathShape(ph) * 0.55;
      if (before < BREATH_OUT && ph >= BREATH_OUT) {
        // The breath out: a burst from the regulator, then a short trickle.
        this.bubblesDue += 3 + Math.round(2 * this.drive + 2 * this.boostLvl);
        this.trickle = 0.7;
      }
      if (this.trickle > 0) {
        this.trickle -= dt;
        this.bubblesDue += dt * (2.5 + 3 * this.drive);
      }
    } else {
      this.bubblesDue = 0;
      this.trickle = 0;
    }

    // Body angle: along the direction of travel, head up when floating.
    const swimAngle = Math.atan2(this.vy, Math.abs(this.vx) + 25);
    const idleAngle = -0.22 + Math.sin(this.time * 0.9) * 0.04;
    let targetPitch = Math.max(-1.15, Math.min(1.15, swimAngle * moving + idleAngle * (1 - moving)));
    targetPitch -= this.turn * 0.14 * (1 - Math.abs(targetPitch)); // the body lifts a little as it comes round
    // Upright and treading water at the surface; the head tips back a little with each breath in.
    if (this.surfaced) targetPitch = -1.08 - this.heave * 0.12 + Math.sin(this.time * 1.3) * 0.04;
    if (this.working) targetPitch = Math.atan2(this.working.y - this.y, Math.abs(this.working.x - this.x) + 30) * 0.8;
    {
      // A slightly soft spring: the body settles with a hint of follow-through, never a snap.
      const w = this.surfaced ? 9 : 5.5;
      const z = 0.82;
      this.pitchS.step(targetPitch, w, z, dt);
    }

    // Breath fog on the glass clears slowly; drops of water run off.
    this.visorFog.alpha = Math.max(0, this.visorFog.alpha - dt * 0.35);
    this.visorDrops.alpha = Math.max(0, this.visorDrops.alpha - dt * 0.22);

    // Kick rhythm. The phase only ever advances, so speeding up or slowing
    // down never makes the legs jump.
    const kickRate = 1.9 + this.drive * 6.4 + this.boostLvl * 5.5 + L * 1.4 * this.drive + this.turn * 1.5;
    this.kick += dt * kickRate;
    // Small, irregular kicks to hold position when floating still.
    const hold = 0.045 + 0.05 * Math.max(0, Math.sin(this.time * 0.37) * Math.sin(this.time * 0.23 + 1));
    const ampWant = hold * (1 - this.drive) + this.drive * 0.27 + this.boostLvl * 0.13 + this.turn * 0.07;
    this.kickAmp += (ampWant - this.kickAmp) * Math.min(1, dt * 4);

    // Place the body: facing mirror on the view, pitch and a little torso
    // flex from the kick on the body, a breath rising and falling.
    const A = this.kickAmp;
    this.view.position.set(this.x, this.y);
    const fa = this.faceS.x;
    this.view.scale.x = Math.abs(fa) < 0.06 ? (fa < 0 ? -0.06 : 0.06) : fa;
    // Floating still the breath is easier to see; swimming keeps the smaller lift.
    const still = 1 - this.swimBlend;
    const chest = 1 + this.heave * (0.035 + 0.02 * still);
    this.body.scale.set(Diver.SCALE * (1 + this.heave * (0.01 + 0.006 * still)), Diver.SCALE * chest);
    this.body.rotation = this.pitch + Math.sin(this.kick - 0.6) * A * 0.04 * this.swimBlend;
    this.body.y = Math.sin(this.kick * 2) * A * 1.4 * this.swimBlend - this.heave * (1.2 + 0.9 * still) * (1 - this.swimBlend);

    this.animateHead(dt, input);
    this.animateGear(dt);
    this.animateLimbs(dt);
  }

  /**
   * Treading water at the surface: the body bobs on the swell, pops up
   * after a fast breach and settles, and breathes in and out. The first
   * breath after a dive is a big gasp.
   */
  private treadWater(dt: number): void {
    this.surfaceTime += dt;
    const t = this.surfaceTime;
    // Breathing: a big gasp first, then slower, calmer breaths.
    const period = this.breaths < 1 ? 1.5 : this.breaths < 3 ? 2.1 : 2.8;
    const before = this.breathClock;
    this.breathClock += dt / period;
    const ph = this.breathClock % 1;
    // In-breath over the first 40% of the cycle, then a slower breath out.
    const amp = this.breaths < 1 ? 1 : this.breaths < 3 ? 0.6 : 0.4;
    this.heave = breathShape(ph) * amp;
    if (Math.floor(before + 0.6) !== Math.floor(this.breathClock + 0.6)) {
      // Crossed into the breath out.
      this.exhale = true;
      this.visorFog.alpha = Math.min(0.55, this.visorFog.alpha + (this.breaths < 1 ? 0.45 : 0.18));
      this.breaths++;
    }
    // Pop up out of the water after a fast breach, overshoot and settle.
    const pop = -30 * this.popStrength * Math.exp(-2.6 * t) * Math.cos(5.5 * t);
    const targetY = 30 + Math.sin(this.time * 1.7) * 2.5 + pop - this.heave * 3;
    this.y += (targetY - this.y) * Math.min(1, dt * 9);
    this.vy = 0;
  }

  /**
   * The head inside the glass: it leads the body into climbs and dives,
   * tucks in when boosting, and when floating it now and then looks
   * around. An occasional blink.
   */
  private animateHead(dt: number, input: number): void {
    // Restrained: a look up, a look down, or back to straight ahead (shared with the walker).
    this.glance.update(dt);
    const still = (1 - this.swimBlend) * (this.working ? 0 : 1);
    // Looking where the body is going: a little further than the body's own angle.
    const lead = Math.max(-0.12, Math.min(0.12, (this.pitchS.v * 0.08) + Math.sin(this.pitch) * 0.08 * this.swimBlend));
    let want = this.glance.target * still * (1 - input) + lead - this.boostLvl * 0.05 * (1 - this.turn);
    if (this.surfaced) want = -0.05 - this.heave * 0.06;
    if (this.working) want = 0.1;
    want = Math.max(-0.17, Math.min(0.14, want));
    const w = 7;
    this.headRig.rotation = this.headS.step(want, w, 1, dt);
    this.eyelid.visible = this.glance.blinking;
  }

  /**
   * The hip thruster's exhaust (Colin, after the terrain pass: more like a
   * thruster than a triangle). A flared bell of lime light with a white-hot
   * core, a bright ring at the nozzle, shock diamonds that pulse down the
   * jet, and churned bubbles and sparks thrown out behind, which drift and
   * fade after the boost ends. All in the body's own drawing space.
   */
  private drawPlume(dt: number, jet: number): void {
    const NX = -38;
    const NY = 14;
    const sp = this.jetSparks;
    // Feed the trail while firing.
    if (jet > 0.05) {
      this.jetEmit += dt * (40 + 50 * jet);
      while (this.jetEmit >= 1) {
        this.jetEmit -= 1;
        const a = (Math.random() - 0.5) * 0.5;
        const v = 120 + Math.random() * 110 * jet;
        sp.push({ x: NX - 4, y: NY + (Math.random() - 0.5) * 5, vx: -Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.22 + Math.random() * 0.25, r: 0.9 + Math.random() * 1.8, hot: Math.random() < 0.45 });
      }
    }
    for (let i = sp.length - 1; i >= 0; i--) {
      const q = sp[i];
      q.life += dt;
      if (q.life >= q.max) {
        sp.splice(i, 1);
        continue;
      }
      // Water drag: the jet slows fast and the bubbles start to rise (up is -y, before the body's pitch).
      const k = Math.exp(-dt * 6);
      q.vx *= k;
      q.vy = q.vy * k - 40 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }
    if (jet <= 0.02 && !sp.length) {
      if (this.plumeDrawn) {
        this.plume.clear();
        this.plumeDrawn = false;
      }
      return;
    }
    const pl = this.plume.clear();
    this.plumeDrawn = true;
    if (jet > 0.02) {
      const t = this.time;
      const flick = 1 + Math.sin(t * 47) * 0.06 + Math.sin(t * 73 + 1) * 0.05;
      const len = (30 + 26 * jet) * flick;
      // The bell: a little wider than the nozzle a short way out, then tapering to a soft tip.
      const bell = (u: number, w: number, l: number): number[] => {
        const top: number[] = [];
        const bot: number[] = [];
        const n = 10;
        for (let i = 0; i <= n; i++) {
          const f = i / n;
          const half = w * (0.75 + 0.6 * Math.sin(Math.PI * Math.min(1, f * 1.6)) * (1 - f)) * Math.pow(1 - f, 0.45) + 0.4;
          const wob = Math.sin(t * 31 + f * 9 + u) * 0.5 * f;
          top.push(NX - l * f, NY - half + wob);
          bot.unshift(NX - l * f, NY + half + wob);
        }
        return [...top, ...bot];
      };
      pl.poly(bell(0, 6.2, len)).fill({ color: C.visor, alpha: 0.28 * jet });
      pl.poly(bell(2, 4.2, len * 0.78)).fill({ color: 0xd9ff70, alpha: 0.5 * jet });
      pl.poly(bell(4, 2.2, len * 0.45)).fill({ color: 0xfaffe6, alpha: 0.95 * jet });
      // Shock diamonds: bright knots that travel a little down the jet and pulse.
      for (let i = 0; i < 3; i++) {
        const f = 0.22 + i * 0.2 + ((t * 3.2) % 0.2);
        const x = NX - len * f;
        const r = (2.6 - i * 0.55) * (0.8 + 0.2 * Math.sin(t * 55 + i));
        pl.poly([x + r * 1.5, NY, x, NY - r, x - r * 1.5, NY, x, NY + r]).fill({ color: 0xffffff, alpha: 0.75 * jet * (1 - f) });
      }
      // The nozzle's hot ring.
      pl.ellipse(NX + 0.5, NY, 2.6, 5.4).fill({ color: 0xf4ffd0, alpha: 0.9 * jet });
      pl.ellipse(NX + 0.5, NY, 1.4, 3.2).fill({ color: 0xffffff, alpha: jet });
    }
    // Churned bubbles (pale rings) and sparks (lime dots) thrown out behind.
    for (const q of sp) {
      const f = q.life / q.max;
      if (q.hot) pl.circle(q.x, q.y, q.r * (1 - f * 0.6)).fill({ color: 0xe6ff9a, alpha: 0.85 * (1 - f) });
      else pl.circle(q.x, q.y, q.r * (1 + f * 0.8)).stroke({ color: 0xdff6ff, width: 0.8, alpha: 0.7 * (1 - f) });
    }
  }
  private jetSparks: { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; hot: boolean }[] = [];
  private jetEmit = 0;

  /** The dive bag swings on its clip, the hose sways, the thruster plume. */
  private animateGear(dt: number): void {
    const boost = this.boostLvl;
    // Hip jets: a lime plume while boosting, fading out after.
    const jet = Math.min(1, this.boostTime / 0.3);
    this.drawPlume(dt, jet);

    // Forward acceleration, in the body's own frame (positive = speeding up the way it faces).
    const ax = ((this.vx - this.lastVx) / dt) * (this.face);
    this.lastVx = this.vx;
    const fill = Math.min(1.6, this.load);
    this.diveBag.visible = this.load > 0.005;
    this.diveBag.scale.set(0.55 + 0.32 * fill, 0.5 + 0.45 * fill);
    {
      // A pendulum: hangs straight down in the world, swings back when the
      // diver speeds up and forward when they slow, jiggles with the kick.
      const target = -this.pitch * 0.6;
      const push = Math.max(-1, Math.min(1, ax / 600)) * 3 + Math.sin(this.kick * 2) * this.kickAmp * 2.5 * this.swimBlend;
      const w = 4.2 - 0.8 * Math.min(1, fill);
      this.bagS.step(target, w, 0.35, dt, push);
      this.bagS.x = Math.max(-0.7, Math.min(0.7, this.bagS.x));
      this.diveBag.rotation = this.bagS.x;
    }
    this.beltJar.set(this.jar, this.time);
    this.beltJar.view.rotation = this.bagS.x * 0.8;
    {
      // The hose flexes a little with the head, the breath and sudden changes of speed.
      const target = this.headS.x * 0.25 + this.heave * 0.02 - boost * 0.02;
      const push = Math.max(-1, Math.min(1, ax / 800)) * 0.6;
      const w = 9;
      this.hoseS.step(target, w, 0.4, dt, push);
      this.hoseS.x = Math.max(-0.06, Math.min(0.06, this.hoseS.x));
      this.hose.rotation = this.hoseS.x;
    }
  }

  /**
   * Legs and arms.
   *
   * The flutter kick comes from the hips: the thigh swings, the knee bends
   * on the way up and snaps straight on the way down, and the fin is a
   * damped spring that the water bends against the sweep of the foot, with
   * its softer tip bending further. Speed, boost and load set how fast and
   * how big the kick is; nothing switches instantly.
   */
  private animateLimbs(dt: number): void {
    const A = this.kickAmp;
    const sb = this.swimBlend;
    const s = Math.min(1, this.speedNorm);
    for (let i = 0; i < 2; i++) {
      const leg = i === 0 ? this.nearLeg : this.farLeg;
      const p = this.kick + (i === 0 ? 0 : Math.PI);
      // Relaxed float: hips a little flexed, knees bent, the far leg a little different from the near one.
      const hipIdle = Math.PI - 0.3 + (i === 0 ? 0 : 0.1);
      const kneeIdle = 0.42 + (i === 0 ? 0 : 0.14);
      const hipBase = hipIdle + (Math.PI - 0.04 - hipIdle) * sb;
      const kneeBase = kneeIdle + (0.08 - kneeIdle) * sb;
      leg.thigh.rotation = hipBase + Math.sin(p) * A;
      // The knee only ever bends one way. It is most bent just as the thigh
      // starts down, then straightens through the downbeat (the whip).
      const k = 0.5 + 0.5 * Math.sin(p - 0.5);
      leg.shin.rotation = kneeBase + A * 1.15 * k * k;

      // Ankle and fin. Pointed toes when swimming, relaxed feet when floating.
      const ankle = -0.35 + 0.3 * sb;
      const shinWorld = leg.thigh.rotation + leg.shin.rotation + this.pitch;
      const sweep = (shinWorld - leg.prevShin) / dt;
      leg.prevShin = shinWorld;
      // Moving forward, the water lines the fin up with the flow (a stiffer spring).
      const w = 9 + 7 * s + 4 * this.boostLvl;
      const damp = 2 * 0.55 * w;
      // The water holds the blade back against the foot's sweep.
      const drag = Math.max(-25, Math.min(25, sweep)) * (0.6 + 0.5 * s);
      leg.finVel += (w * w * (ankle - leg.finAng) - damp * leg.finVel - drag * w * 0.9) * dt;
      leg.finAng += leg.finVel * dt;
      if (leg.finAng > 0.7) {
        leg.finAng = 0.7;
        leg.finVel = Math.min(0, leg.finVel);
      } else if (leg.finAng < -0.75) {
        leg.finAng = -0.75;
        leg.finVel = Math.max(0, leg.finVel);
      }
      leg.fin.rotation = leg.finAng;
      // The softer tip bends further the same way.
      leg.tip.rotation = (leg.finAng - ankle) * 0.75;
    }

    if (this.working) {
      // Working at a spot: the near arm chips, pries or cuts with short strokes.
      const strike = Math.sin(this.time * 13);
      this.nearArm.upper.rotation = 1.75 + strike * 0.22;
      this.nearArm.fore.rotation = -0.35 + Math.max(0, strike) * 0.45;
      this.farArm.upper.rotation = 1.45 + Math.sin(this.time * 2) * 0.05;
      this.farArm.fore.rotation = -0.6;
      return;
    }

    // Arms. Floating: a lazy figure-of-eight scull in front to hold
    // position. Swimming: back along the body, trimming a little with each
    // kick, tucked in tight when boosting. While coming round after a turn
    // (or climbing slowly) the hands scull to help steer.
    const ab = this.armBlend;
    const scull = Math.min(1, this.turn * 1.2 + Math.max(0, -Math.sin(this.pitch)) * 0.35 * (1 - this.boostLvl) * (1 - this.drive * 0.5));
    for (let i = 0; i < 2; i++) {
      const arm = i === 0 ? this.nearArm : this.farArm;
      const off = i === 0 ? 0 : 0.9;
      const t = this.time * 1.25 + off;
      const idleUpper = 1.02 + Math.sin(t) * 0.17 + this.heave * 0.05;
      const idleFore = -0.85 + Math.sin(t + 1.3) * 0.18;
      const swimUpper = Math.PI - 0.32 + this.boostLvl * 0.1 + Math.sin(this.kick + off) * A * 0.12;
      const swimFore = 0.12 - this.boostLvl * 0.07 + Math.sin(this.kick + off + 0.8) * A * 0.15;
      const st = this.time * 4.2 + off * 2;
      arm.upper.rotation = idleUpper + (swimUpper - idleUpper) * ab - Math.sin(st) * 0.22 * scull * ab;
      arm.fore.rotation = idleFore + (swimFore - idleFore) * ab - (0.25 + Math.sin(st + 1.2) * 0.25) * scull * ab;
    }
  }

  /**
   * Keep the diver out of rock and sand. We test points around a circle,
   * push away from any that are inside rock, and cancel the part of the
   * velocity going into the surface, so the diver slides along walls.
   */
  private collide(): void {
    const r = Diver.RADIUS;
    for (let iter = 0; iter < 8; iter++) {
      let nx = 0;
      let ny = 0;
      let hits = 0;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        if (isSolid(this.x + dx * r, this.y + dy * r * 0.8)) {
          nx -= dx;
          ny -= dy;
          hits++;
        }
      }
      if (!hits) break;
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      if (l < 0.01) ny = -1; // surrounded: float up
      this.x += nx * 2.5;
      this.y += ny * 2.5;
      const vn = this.vx * nx + this.vy * ny;
      if (vn < 0) {
        this.vx -= nx * vn;
        this.vy -= ny * vn;
      }
    }
    // The surface: the helmet can break it but the diver cannot leave the water.
    if (this.y < 18) {
      this.y = 18;
      if (this.vy < 0) this.vy = 0;
    }
  }
}
