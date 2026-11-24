import type { SpeciesId } from '../game/state';
import { Container, Graphics, Point, Sprite, Text, type Texture } from 'pixi.js';
import { isSolid } from '../world/terrain';
import { mulberry32 } from '../rng';
import { BREATH_OUT, Glance, Spring, approach, batchAll, breathShape } from './animkit';
import type { Walker } from './walker';
import { MAG, floorBetween, magClamp, magStep, type MagBody, type MagResult } from '../game/magboots';
import { KestrelExpression, kestrelFin, kestrelHand, kestrelHelmet, kestrelLimb, kestrelTorso } from './kestrelArt';
import { KestrelSwimMotion, type KestrelAction } from './kestrelMotion';

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
 *  - the kit on the back grows as it is found (before milestone 11): a pony
 *    bottle at first, up to four air tanks, the grapple harpoon, the hip
 *    thruster (and its TH-2 head), and the pressure suit's brass and tubes.
 *
 * Joints (hips, knees, ankles, shoulders, elbows) are separate pieces so the
 * limbs can kick and scull. Weathering (rivets, scratches, rust) is painted on.
 *
 * Local drawing space: facing right, origin at the middle of the torso.
 */

/**
 * What the diver carries, found and built along the way (Colin, before
 * milestone 11): air tanks found out in the world (0 is just the pony
 * bottle), the grapple harpoon on the back, the specimen jar on the belt,
 * the hip thruster (0 none, 1 TH-1, 2 TH-2) and the pressure suit.
 */
export interface KitLook {
  tanks: number;
  spear: boolean;
  jar: boolean;
  thruster: 0 | 1 | 2;
  /** The pressure suit: 0 the Kestrel suit, 1 PS-1, 2 PS-2 (milestone 10). */
  psuit: 0 | 1 | 2;
  /** Milestone 11: the alien resonator, a crystal hoop on the pack and a ringed bracer on the near forearm. */
  resonator?: boolean;
  /** After milestone 12: suit attachments built in the Workshop. */
  satchel?: boolean;
  flare?: boolean;
  visor?: boolean;
  boots?: boolean;
  cowl?: boolean;
  dash?: boolean;
  /** Phase 17: the stun-dart launcher, clipped to the far forearm. */
  dart?: boolean;
  /** Phase 19: the Rivet driver RD-1, strapped to the near forearm. */
  rivet?: boolean;
}
export const FULL_KIT: KitLook = { tanks: 2, spear: true, jar: true, thruster: 1, psuit: 0, resonator: false };
export function kitKey(k: KitLook): string {
  return `${Math.min(4, k.tanks)}${+k.spear}${+k.jar}${k.thruster}${k.psuit}${+!!k.resonator}${+!!k.satchel}${+!!k.flare}${+!!k.visor}${+!!k.boots}${+!!k.cowl}${+!!k.dash}${+!!k.dart}${+!!k.rivet}`;
}
/** The Choir's own colours (DESIGN.md: only the Choir and its technology show them). */
export const CHOIR = [0x5ff0ff, 0xa27cff, 0xff5ad8];
/** A Choir colour drifting through cyan, violet and magenta (t in seconds). */
export function choirColour(t: number): number {
  const f = ((t % 3) + 3) % 3;
  const i = Math.floor(f);
  const k = f - i;
  const a = CHOIR[i];
  const b = CHOIR[(i + 1) % 3];
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
/**
 * Milestone 11: the resonator's hoop, drawn on the pack (cx, cy its centre, r
 * its radius): a forged brass ring holding a pale tuned crystal on four
 * spokes, with two thin swept fins behind it like the Choir's ribbons.
 */
export function drawResonatorHoop(g: Graphics, cx: number, cy: number, r: number, finDir: number): void {
  // The fins: thin brass blades sweeping back, edged pale.
  for (const s of [-1, 1]) {
    g.moveTo(cx - finDir * r * 0.3, cy + s * r * 0.5)
      .quadraticCurveTo(cx - finDir * r * 1.6, cy + s * r * 1.1, cx - finDir * r * 2.6, cy + s * r * 0.5)
      .quadraticCurveTo(cx - finDir * r * 1.5, cy + s * r * 0.75, cx - finDir * r * 0.3, cy + s * r * 0.2)
      .fill({ color: 0x8a6a2a });
    g.moveTo(cx - finDir * r * 0.4, cy + s * r * 0.45).quadraticCurveTo(cx - finDir * r * 1.6, cy + s * r * 1.05, cx - finDir * r * 2.5, cy + s * r * 0.52).stroke({ color: 0xf0d890, width: 0.6, alpha: 0.6 });
  }
  g.circle(cx, cy, r).stroke({ color: BRASS, width: Math.max(1.6, r * 0.28) });
  g.circle(cx, cy, r + r * 0.14).stroke({ color: BRASS_DARK, width: 0.6 });
  g.circle(cx, cy, r * 0.86).stroke({ color: 0xf0d890, width: 0.5, alpha: 0.6 });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    g.moveTo(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85).lineTo(cx + Math.cos(a) * r * 0.32, cy + Math.sin(a) * r * 0.32).stroke({ color: BRASS_DARK, width: 0.9 });
  }
  // The crystal itself (its light is drawn unlit on top).
  g.poly([cx, cy - r * 0.42, cx + r * 0.3, cy, cx, cy + r * 0.42, cx - r * 0.3, cy]).fill({ color: 0xc8d8e8 });
  // A short mount down to the pack.
  g.rect(cx - 1, cy + r, 2, r * 0.5).fill({ color: BRASS_DARK });
}
/** The resonator's bracer on a forearm (len long, w wide, in the forearm's space). */
export function drawResonatorBracer(g: Graphics, len: number, w: number): void {
  g.roundRect(len * 0.18, -w / 2 - 1.2, len * 0.55, w + 2.4, 2.5).fill({ color: 0x6a5222 });
  g.roundRect(len * 0.18, -w / 2 - 1.2, len * 0.55, 1.4, 0.7).fill({ color: 0xf0d890, alpha: 0.5 });
  for (const x of [len * 0.24, len * 0.66]) g.rect(x - 0.8, -w / 2 - 1.2, 1.6, w + 2.4).fill({ color: BRASS });
  // A small crystal ring set in it.
  g.circle(len * 0.45, 0, w * 0.32).stroke({ color: BRASS, width: 1.1 });
  g.circle(len * 0.45, 0, w * 0.16).fill({ color: 0xc8d8e8 });
}
/** Multiply two colours (a tint over a tint). */
export function mulColour(a: number, b: number): number {
  const ch = (s: number) => Math.round((((a >> s) & 255) * ((b >> s) & 255)) / 255);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
/** The pressure suit's warm bronze cast over the charcoal (with brass rings and tubes). */
export const PSUIT_TINT = 0xf2dcb4;
/** PS-2: a deeper, darker bronze, closer to gunmetal. */
export const PSUIT2_TINT = 0xd2bc98;
export const BRASS = 0xc9a13a;
export const BRASS_DARK = 0x7a5e1e;

/**
 * Phase 19: the Rivet driver RD-1, drawn in a forearm's own space (the
 * forearm runs along +x from the elbow to the wrist, the top is -y). It grew
 * from the harpoon: the same white stock and chrome barrel, now a chunky
 * housing strapped on with two red bands, a rivet drum on top, a short
 * barrel past the wrist with a brass muzzle ring, and a lime sight lamp.
 * `k` scales it (the swimmer's forearm is a touch longer).
 */
export function drawRivetDriver(g: Graphics, k = 1): Graphics {
  const s = (n: number) => n * k;
  g.roundRect(s(-1), s(-11.5), s(19), s(8.5), s(2.6)).fill({ color: 0x2a2f32 });
  g.roundRect(s(-1), s(-11.5), s(19), s(2.2), s(1.1)).fill({ color: 0x8e979c, alpha: 0.7 });
  // The white stock the harpoon had, along the back of the housing.
  g.roundRect(s(-3), s(-9.5), s(7), s(4.5), s(2)).fill({ color: 0xd8dde0 });
  // Barrel and muzzle ring.
  g.rect(s(17.5), s(-10), s(9.5), s(4.4)).fill({ color: 0x4d5d77 });
  g.rect(s(17.5), s(-10), s(9.5), s(1.3)).fill({ color: 0xc8d2d8, alpha: 0.7 });
  g.rect(s(25.5), s(-10.8), s(2.6), s(6)).fill({ color: BRASS });
  // The rivet drum on top, brass-banded.
  g.circle(s(7), s(-13), s(4.6)).fill({ color: 0x3a4044 });
  g.circle(s(7), s(-13), s(4.6)).stroke({ color: BRASS, width: s(1.4) });
  g.circle(s(7), s(-13), s(1.6)).fill({ color: 0xa8822e });
  // Red straps round the forearm, like the gloves and belt.
  g.rect(s(2.5), s(-4), s(2.4), s(8.5)).fill({ color: 0xa83a2a });
  g.rect(s(12), s(-4), s(2.4), s(8.5)).fill({ color: 0xa83a2a });
  // Lime sight lamp at the front of the drum.
  g.circle(s(14.5), s(-12.6), s(1.5)).fill({ color: 0xc6f03a });
  return g;
}

/**
 * Phase 19: the guard plate: the harpoon's barbs grown into a round plate
 * that folds out from the driver when Kestrel braces. Drawn centred on its
 * pivot (scale it down to fold it flat along the housing).
 */
export function drawGuardPlate(g: Graphics, k = 1): Graphics {
  const s = (n: number) => n * k;
  g.ellipse(0, 0, s(17), s(6)).fill({ color: 0x3a4044 });
  g.ellipse(0, 0, s(17), s(6)).stroke({ color: 0x8e979c, width: s(1.2) });
  g.ellipse(s(-1), s(-1.4), s(13), s(2.4)).fill({ color: 0xc8d2d8, alpha: 0.35 });
  g.moveTo(s(-16), 0).lineTo(s(16), 0).stroke({ color: BRASS, width: s(1.4), alpha: 0.8 });
  g.circle(0, 0, s(2.4)).fill({ color: BRASS });
  return g;
}

/**
 * The air tanks and the harpoon along the diver's back, for this kit.
 * Rows of tanks stack away from the body: A next to the suit, then B, then
 * C (short with three tanks, full with four). With none yet, a pony bottle.
 */
function drawDiverBack(g: Graphics, kit: KitLook, compact: boolean): void {
  const n = Math.min(4, kit.tanks);
  const tank = (x0: number, x1: number, y: number, shade: number) => {
    const w = x1 - x0;
    g.roundRect(x0, y, w, 12, 6).fill({ color: shade });
    g.roundRect(x0, y, w, 12, 6).stroke({ color: C.steelLight, width: 0.8, alpha: 0.5 });
    g.rect(x1, y + 1, 2, 10).fill({ color: C.chromeHi, alpha: 0.8 });
    g.roundRect(x0 + 3, y + 2, w - 6, 3, 1.5).fill({ color: 0x8e9aa2, alpha: 0.55 });
    g.rect(x0 + w * 0.52, y + 1, 4, 10).fill({ color: C.visor, alpha: 0.9 });
    if (w > 40) g.rect(x0 + w * 0.26, y + 1, 2, 10).fill({ color: C.visor, alpha: 0.6 });
    g.rect(x1 + 2, y + 3, 6, 6).fill({ color: C.steelLight });
    g.rect(x1 + 7, y + 1.5, 3, 9).fill({ color: C.chromeDark });
    scratches(g, x0 + 2, y + 1, w - 4, 9, 2, 0.25);
  };
  let top = -27;
  if (n === 0) {
    // The pony bottle: a short chrome cylinder strapped high on the back.
    g.rect(-2, -19, 38, 4).fill({ color: C.rubber });
    g.roundRect(-4, -28, 36, 11, 5.5).fill({ color: C.chromeDark });
    g.roundRect(-4, -28, 36, 11, 5.5).stroke({ color: C.steelLight, width: 0.8, alpha: 0.5 });
    g.roundRect(-1, -27, 30, 2.6, 1.3).fill({ color: 0x8e9aa2, alpha: 0.6 });
    g.rect(14, -28, 3.5, 11).fill({ color: C.visor, alpha: 0.85 });
    g.rect(32, -25.5, 6, 6).fill({ color: C.steelLight });
  } else {
    tank(-30, 32, -27, C.chromeDark);
    if (n >= 2) {
      tank(-30, 32, -38, C.steelDark);
      top = -38;
    }
    if (n === 3) {
      tank(-12, 24, -49, C.chromeDark);
      top = -49;
    } else if (n >= 4) {
      tank(-30, 32, -49, C.chromeDark);
      top = -49;
    }
  }
  if (compact) {
    // The armored saddle wraps around the rear ribs; valves and the tool rail remain exposed.
    g.moveTo(-25, -14).quadraticCurveTo(-33, -27, -19, -31).quadraticCurveTo(-1, -34, 16, -28)
      .lineTo(23, -15).quadraticCurveTo(0, -8, -25, -14).closePath().fill(0x293e42);
    g.moveTo(-25, -25).quadraticCurveTo(-9, -32, 12, -27)
      .stroke({ color: 0xc28b52, width: 4.2, cap: 'round' });
    g.circle(-19, -24, 2.1).fill(0xe6be78);
  }
  // The regulator hose meets a chrome riser off the topmost valve.
  const vy = n === 0 ? -23 : top + 6;
  if (vy > -40) g.moveTo(38, vy).lineTo(38, -41).stroke({ color: C.chromeMid, width: 3, cap: 'round' });
  if (kit.spear) {
    // The grapple harpoon clipped along the top of the pack: white stock, chrome barrel, spear.
    const y = Math.min(top, -27) - 5;
    g.moveTo(-40, y).lineTo(44, y - 3).stroke({ color: C.chromeDark, width: 1.6 });
    g.poly([44, y - 3, 37, y - 5.5, 37.5, y - 0.5]).fill({ color: C.chromeHi });
    g.roundRect(-30, y - 4, 30, 6, 3).fill({ color: 0xd8dde0 });
    g.rect(-12, y + 2, 3, 6).fill({ color: 0xd8dde0 });
    g.moveTo(-28, y - 2).lineTo(-2, y - 2).stroke({ color: 0x8e979c, width: 1 });
    g.circle(-33, y, 2.6).stroke({ color: 0xd8c890, width: 1.4 }); // the line reel
  }
  // Milestone 11: the resonator's hoop rides on top of the pack.
  if (kit.resonator) drawResonatorHoop(g, RESON_BACK.x, Math.min(top, -27) + RESON_BACK.dy, 8, 1);
}
/** Where the resonator's crystal sits on the swimmer's pack (x, and height above the topmost tank). */
const RESON_BACK = { x: 6, dy: -15 };

/** The pressure suit's brass: collar rings, a chest plate and tubes from the pack (torso space). */
function drawDiverPsuitTorso(g: Graphics): void {
  g.roundRect(-30, -15, 4, 30, 2).fill({ color: BRASS });
  g.roundRect(8, -15, 4, 30, 2).fill({ color: BRASS });
  g.roundRect(-30, -15, 4, 30, 2).stroke({ color: BRASS_DARK, width: 0.8 });
  g.roundRect(8, -15, 4, 30, 2).stroke({ color: BRASS_DARK, width: 0.8 });
  // A riveted brass chest plate.
  g.roundRect(14, -10, 16, 20, 4).fill({ color: 0x8a6a28, alpha: 0.9 });
  g.roundRect(15, -9, 14, 3, 1.5).fill({ color: 0xf0d890, alpha: 0.5 });
  rivets(g, [[16.5, -7], [27.5, -7], [16.5, 7], [27.5, 7]], 0.9);
  // Two ribbed pressure tubes from the pack round the body to the chest.
  coiledHose(g, [[-20, -16], [-12, -4], [2, 12], [16, 10]], 3.2);
  coiledHose(g, [[-4, -16], [4, -6], [16, 2], [26, -4]], 2.8);
}

/** PS-2's extras on the torso: a second pair of tubes, a riveted back plate and a lit pressure gauge. */
function drawDiverPs2Torso(g: Graphics): void {
  coiledHose(g, [[-26, 14], [-14, 22], [6, 22], [22, 13]], 3);
  g.roundRect(-24, -15, 30, 6, 3).fill({ color: 0x5e4a22 });
  g.roundRect(-24, -15, 30, 2, 1).fill({ color: 0xf0d890, alpha: 0.45 });
  rivets(g, [[-21, -12], [-9, -12], [3, -12]], 0.9);
  // A round pressure gauge on the chest plate, its needle lit lime.
  g.circle(22, 0, 5.5).fill({ color: BRASS }).stroke({ color: BRASS_DARK, width: 1 });
  g.circle(22, 0, 4).fill({ color: 0x14181a });
  g.moveTo(22, 0).lineTo(24.6, -2.6).stroke({ color: C.visor, width: 1.2 });
}

/** PS-2's armour plates on the thighs and upper arms. */
function ps2Plate(len: number, w: number): Graphics {
  const g = new Graphics();
  g.roundRect(len * 0.22, -w / 2 - 1.6, len * 0.5, w * 0.62, 3).fill({ color: 0x7a5e28 });
  g.roundRect(len * 0.22, -w / 2 - 1.6, len * 0.5, 1.6, 0.8).fill({ color: 0xf0d890, alpha: 0.5 });
  rivets(g, [[len * 0.28, -w / 2 + 1], [len * 0.66, -w / 2 + 1]], 0.7);
  g.visible = false;
  return g;
}

/** Brass rings and a ribbed tube on a limb segment (len long), for the pressure suit. */
function psuitLimb(len: number, w: number, tube: boolean): Graphics {
  const g = new Graphics();
  for (const x of [2, len - 3]) {
    g.roundRect(x - 1.8, -w / 2 - 0.8, 3.6, w + 1.6, 1.4).fill({ color: BRASS });
    g.rect(x - 1.8, -w / 2 - 0.8, 1.2, w + 1.6).fill({ color: 0xf0d890, alpha: 0.5 });
  }
  if (tube) coiledHose(g, [[3, -w / 2 + 1], [len * 0.35, -w / 2 - 2], [len * 0.65, -w / 2 - 2], [len - 4, -w / 2 + 1]], 2.4);
  g.visible = false;
  return g;
}

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
  hand?: Container;
}

function buildLeg(far: boolean, redesigned: boolean, compact: boolean, detailed: boolean): Leg {
  const tint = far ? 0x9a9a9a : 0xffffff;
  const thigh = new Container();
  const tg = segment(24, 13, C.suit, C.suitShade);
  etching(tg, 2, -5, 16, 10, 3);
  accentBand(tg, 5, -6.5, 3, 13);
  // Chrome knee guard.
  chromeBands(tg, 19, -6.5, 9, 13, 3);
  rivets(tg, [[23.5, -3.5], [23.5, 3.5]], 0.9);
  thigh.addChild(playerPart(tg, redesigned ? kestrelLimb(24, compact ? 16 : 13, 'thigh', detailed) : undefined, tint));

  const shin = new Container();
  shin.x = 24;
  const sg = segment(21, 11, C.suit, C.suitShade);
  etching(sg, 2, -4, 16, 8, 2);
  sg.rect(14, -5.5, 5, 11).fill({ color: C.red, alpha: 0.9 }); // ankle strap
  scratches(sg, 2, -4, 18, 6, 3);
  shin.addChild(playerPart(sg, redesigned ? kestrelLimb(21, 11, 'shin', detailed) : undefined, tint));
  thigh.addChild(shin);

  // The fin is two pieces so the blade can flex: the foot pocket and the
  // stiff root of the blade turn at the ankle, and the softer tip bends
  // further on its own joint (follow-through in the water).
  const fin = new Container();
  fin.x = 22;
  fin.scale.set(1.08, 1.06);
  const fg = new Graphics();
  fg.roundRect(-5, -6, 12, 12, 4).fill({ color: C.rubber });
  fg.moveTo(2, -6).lineTo(19, -7).lineTo(19, 5.1).lineTo(4, 5).closePath().fill({ color: C.rubber });
  for (const y of [-4, 0, 3.5])
    fg.moveTo(8, y * 0.7)
      .lineTo(19, y * 1.03)
      .stroke({ color: 0x3e4140, width: 1, alpha: 0.7 });
  fg.moveTo(10, -2).lineTo(19, -2.3).stroke({ color: C.visor, width: 1, alpha: 0.7 });
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
  tip.addChild(playerPart(tg2, redesigned ? kestrelFin(false, true, compact, detailed) : undefined, tint));
  fin.addChild(playerPart(fg, redesigned ? kestrelFin(false, false) : undefined, tint), tip);
  shin.addChild(fin);
  return { thigh, shin, fin, tip, finAng: -0.3, finVel: 0, prevShin: Math.PI };
}

function buildArm(far: boolean, redesigned: boolean, compact: boolean, detailed: boolean): Arm {
  const tint = far ? 0x9a9a9a : 0xffffff;
  const upper = new Container();
  const ug = segment(17, 10, C.sleeve, C.sleeveShade);
  ug.circle(0, 0, 6).fill({ color: C.chrome }); // shoulder joint ring
  ug.circle(-1, -1.5, 2.5).fill({ color: C.chromeHi, alpha: 0.6 });
  ug.circle(0, 0, 6).stroke({ color: C.chromeDark, width: 1 });
  accentBand(ug, 9, -5, 2.6, 10);
  scratches(ug, 4, -4, 14, 8, 2);
  upper.addChild(playerPart(ug, redesigned ? kestrelLimb(17, compact ? 15 : 11, 'upper', detailed) : undefined, tint));

  const fore = new Container();
  fore.x = 17;
  const fg = segment(14, 9, C.sleeve, C.sleeveShade);
  // Rust-red glove with a chrome cuff ring.
  fg.roundRect(11, -5.2, 11, 10.4, 4.5).fill({ color: C.red });
  fg.roundRect(13, 1, 8, 3.5, 1.5).fill({ color: C.redShade, alpha: 0.7 });
  fg.rect(10, -5, 3, 10).fill({ color: C.chrome });
  fore.addChild(playerPart(fg, redesigned ? kestrelLimb(13, 9, 'fore', detailed) : undefined, tint));
  const hand = redesigned ? kestrelHand(compact, detailed) : undefined;
  if (hand) {
    hand.position.set(compact ? 15 : 12, 0);
    hand.tint = tint;
    fore.addChild(hand);
  }
  upper.addChild(fore);
  return { upper, fore, hand };
}

export function playerPart(legacy: Graphics, replacement: Graphics | undefined, tint: number): Graphics {
  if (replacement) legacy.destroy();
  const part = replacement ?? legacy;
  part.tint = tint;
  return part;
}

export function suitMaterialLayer(texture: Texture, trim: Graphics, x: number, y: number): Container {
  const layer = new Container({ label: 'paintedSuit' });
  const material = new Sprite({ texture, label: 'suitMaterial' });
  material.position.set(x, y);
  layer.addChild(material, trim);
  return layer;
}

function buildTorso(texture?: Texture) {
  const c = new Container();
  const g = new Graphics({ label: 'proceduralSuit' });

  // The tanks and the harpoon on the back are drawn by drawDiverBack (they come with the kit).

  // Suit body: charcoal with brass etching.
  g.roundRect(-34, -15, 74, 30, 13).fill({ color: C.suit });
  g.roundRect(-32, 3, 70, 11, 6).fill({ color: C.suitShade, alpha: 0.75 });
  g.roundRect(-30, -13, 66, 5, 3).fill({ color: C.suitLight, alpha: 0.5 });
  etching(g, -26, -11, 44, 20, 9);
  accentBand(g, -12, -15, 4, 30);
  accentBand(g, 22, -15, 2.6, 30);
  rimEdge(g, -26, -14.5, 28, -14.5, 0.55);
  // Belt, chrome buckle, and harness strap from the back unit.
  g.rect(-28, -15, 7, 30).fill({ color: C.suitShade });
  chromeBands(g, -36, -5, 9, 12, 3);
  g.rect(14, -15, 5, 30).fill({ color: C.chromeDark, alpha: 0.85 });
  scratches(g, -30, -12, 70, 24, 6);
  for (let i = 0; i < 8; i++)
    g.circle(-30 + rand() * 60, 10 + rand() * 4, 0.8 + rand() * 1.1).fill({ color: 0x5f7a3a, alpha: 0.45 });

  // Collar yoke: the chrome ring that wraps the shoulders and seats the helmet.
  const collar = (q: Graphics) => q.moveTo(30, -26)
    .lineTo(44, -24)
    .quadraticCurveTo(52, -10, 52, 6)
    .quadraticCurveTo(52, 18, 42, 19)
    .lineTo(30, 16)
    .quadraticCurveTo(34, -4, 30, -26)
    .closePath();
  collar(g).fill({ color: C.chrome }).stroke({ color: C.chromeDark, width: 1.2 });
  g.moveTo(36, -22).quadraticCurveTo(44, -8, 43, 12).stroke({ color: C.chromeHi, width: 2.2, alpha: 0.7, cap: 'round' });
  g.moveTo(47, -12).quadraticCurveTo(50, 2, 47, 14).stroke({ color: C.chromeMid, width: 2, alpha: 0.9, cap: 'round' });
  const fittings = (q: Graphics) => {
    rivets(q, [[34, -20], [33, 12], [48, 15]], 1);
    // Regulator port and grille.
    q.circle(50, 9, 7).fill({ color: C.chrome }).stroke({ color: C.chromeDark, width: 1.2 });
    q.circle(51, 9, 3.2).fill({ color: 0x0d1114 });
    q.circle(48, 6.5, 1.6).fill({ color: C.chromeHi, alpha: 0.8 });
    for (let i = 0; i < 3; i++) q.rect(42 + i * 3.2, 15.5, 2, 3.2).fill({ color: C.chromeDark });
  };
  fittings(g);
  c.addChild(g);
  let painted: Container | undefined;
  if (texture) {
    // The atlas already includes the bands, straps and buckle. Keep mechanical details above it.
    const fittingsLayer = new Graphics();
    collar(fittingsLayer).stroke({ color: C.chromeDark, width: 1.2 });
    fittings(fittingsLayer);
    painted = suitMaterialLayer(texture, fittingsLayer, -40, -32);
    c.addChild(painted);
  }

  const stencil = new Text({
    text: 'K7',
    style: { fontFamily: 'Courier New, monospace', fontSize: 10, fontWeight: 'bold', fill: 0x1d2430 },
    resolution: 4,
  });
  stencil.alpha = 0.6;
  stencil.anchor.set(0.5);
  stencil.position.set(-1, -19);
  c.addChild(stencil);
  return { view: c, procedural: g, painted };
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
  species: SpeciesId;
  stage: 'egg' | 'young' | 'grown';
}

const JAR_TINT: Record<JarLook['species'], { body: number; fin: number; glow?: number }> = {
  glowfin: { body: 0xc4697d, fin: 0x8e3f55, glow: 0xfff2a8 },
  puffcap: { body: 0xffc4d2, fin: 0xd88aa0 },
  ray: { body: 0x8fa6c4, fin: 0x5c6482 },
  crab: { body: 0xe0703a, fin: 0x9a4220 },
  shrimp: { body: 0xff9a92, fin: 0xd0605a },
  // Milestone 10's cinder snail: iron scales with ember-lit seams.
  snail: { body: 0x5a524a, fin: 0x2e2a26, glow: 0xff8a3a },
  // Phase 22: the kiln eel (sooty, ember lights) and the chime seahorse (ivory, pearl glow).
  eel: { body: 0x4a3e38, fin: 0x2a221e, glow: 0xffa04a },
  horse: { body: 0xe6dcc8, fin: 0xa8977c, glow: 0xfff0c0 },
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
  /**
   * Show the jar (owned: found yet; before milestone 11 it is a find in the
   * coral garden) and what it holds (null: empty). A caught creature also
   * tints the water in its colour, so even at a glance the jar reads as full.
   */
  set(look: JarLook | null, time: number, owned = true): void {
    this.view.visible = owned;
    if (!owned) return;
    if (!look) {
      if (this.key) {
        this.key = '';
        this.content.clear();
      }
      return;
    }
    const k = look.species + look.stage;
    const t = JAR_TINT[look.species];
    if (k !== this.key) {
      this.key = k;
      const g = this.content.clear();
      g.roundRect(-4, 3.4, 8, 10, 2.5).fill({ color: t.body, alpha: 0.28 });
      if (look.stage === 'egg') {
        for (const [x, y, r] of [[-1.6, 11.6, 1.5], [1.4, 11.8, 1.4], [0, 9.6, 1.4]] as const) {
          g.circle(x, y, r).fill({ color: t.body, alpha: 0.85 });
          g.circle(x - 0.4, y - 0.4, r * 0.35).fill({ color: 0xffffff, alpha: 0.6 });
        }
      } else {
        const sc = look.stage === 'grown' ? 1 : 0.7;
        if (t.glow) g.circle(0, 8, 4.4 * sc).fill({ color: t.glow, alpha: 0.35 });
        if (look.species === 'snail') {
          g.ellipse(0.4, 10.4, 3.2 * sc, 1.3 * sc).fill({ color: t.fin });
          g.circle(-0.4, 8.6, 2.6 * sc).fill({ color: t.body });
          g.circle(-0.4, 8.6, 2.6 * sc).stroke({ color: t.glow!, width: 0.6, alpha: 0.9 });
          g.circle(-0.4, 8.6, 1.2 * sc).stroke({ color: t.glow!, width: 0.5, alpha: 0.8 });
        } else if (look.species === 'eel') {
          g.moveTo(-3.2 * sc, 11).quadraticCurveTo(-1, 6.6, 1.4 * sc, 9.4).quadraticCurveTo(3 * sc, 11.4, 3.4 * sc, 7.2).stroke({ color: t.body, width: 1.6 * sc, cap: 'round' });
        } else if (look.species === 'horse') {
          g.ellipse(0, 8.4, 1.8 * sc, 2.8 * sc).fill({ color: t.body });
          g.moveTo(0, 11).quadraticCurveTo(-1.6 * sc, 13, 0.4, 12.6).stroke({ color: t.body, width: 1 * sc });
          g.circle(0.6, 5.6, 1.3 * sc).fill({ color: t.body });
        } else if (look.species === 'crab') {
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
export function buildHelmet(plate = false, paintedFace?: Texture): Container {
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
  if (paintedFace) {
    const portrait = new Sprite(paintedFace);
    portrait.label = hd.label;
    // The 4x texture shares the original helmet-local coordinates and head pivot.
    portrait.position.set(48, -24);
    headRig.addChild(portrait);
    hd.destroy();
  } else {
    headRig.addChild(hd);
  }
  headRig.addChild(lid);
  c.addChild(headRig);
  const f = new Graphics();
  // The suit's neck seal: a dark rubber collar with a metal ring, sitting in
  // the bottom of the helmet.
  f.moveTo(52, 13).quadraticCurveTo(64, 10.5, 77, 12.5).lineTo(79, 20).quadraticCurveTo(64, 22, 50, 19).closePath().fill({ color: C.suit });
  f.moveTo(52, 13).quadraticCurveTo(64, 10.5, 77, 12.5).stroke({ color: C.chrome, width: 1.6 });
  const clearPaintedVisor = !plate && !!paintedFace;
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
    shell(f).fill(clearPaintedVisor ? { color: 0x9bc568, alpha: 0.13 } : { color: C.visor, alpha: 0.3 });
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
  if (clearPaintedVisor) {
    f.moveTo(61, -23).quadraticCurveTo(70, -27, 79, -22).stroke({ color: 0xf6ffe0, width: 1.6, alpha: 0.27, cap: 'round' });
    fp.circle(86.3, -12.2, 1).fill({ color: 0xffffff, alpha: 0.26 });
  } else {
    f.moveTo(60, -21).quadraticCurveTo(71, -26, 81, -18).stroke({ color: 0xf6ffe0, width: 2.4, alpha: paintedFace ? 0.28 : 0.55, cap: 'round' });
    fp.circle(85, -9, 1.7).fill({ color: 0xffffff, alpha: paintedFace ? 0.42 : 0.7 });
  }
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

export function playerHelmet(redesigned: boolean, opening: boolean, paintedFace?: Texture, compact = false, detailed = false): Container {
  if (!redesigned) return buildHelmet(opening, paintedFace);
  const helmet = kestrelHelmet(opening, compact, detailed);
  const hose = new Graphics({ label: 'hose' });
  coiledHose(hose, compact ? [[43, -28], [37, -23], [57, -10], [51, 3]] : [[44, -42], [59, -46], [55, -9], [51, 3]], 4.2);
  helmet.addChild(hose);
  return helmet;
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
  /** Milestone 11: the resonator's crystal light (unlit) and its halo, in world space. */
  readonly resonDot = new Graphics();
  readonly resonGlow = new Graphics();
  /** 0..1: the resonator is singing (set by the game). */
  singing = 0;
  private bracers: Graphics[] = [];

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
  private readonly nearLeg: Leg;
  private readonly farLeg: Leg;
  private readonly nearArm: Arm;
  private readonly farArm: Arm;
  private readonly character?: KestrelSwimMotion;
  private readonly expression?: KestrelExpression;
  private readonly chest?: Graphics;
  private readonly helmet: Container;
  private readonly chestFlex = new Spring(0);
  private readonly tankSwing = new Spring(0);
  private readonly wakeTip = new Point(13.3, -6.8);
  private readonly wakeGlobal = new Point();
  readonly strokeWake = { x: 0, y: 0, strength: 1 };
  visualAction: KestrelAction = 'free';
  visualTarget: { id: string; x: number; y: number } | null = null;
  visualCurrent = 0;
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
  private surfaceReactionReady = false;
  private surfaceReactionActive = false;
  private nextSurfaceReactionAt = 0;
  private diveBag = buildDiveBag();
  /** The specimen jar on the belt (set from the save each frame). */
  jar: JarLook | null = null;
  private beltJar = new BeltJar();
  /** The kit the diver has found so far (set from the save each frame); drawn when it changes. */
  kit: KitLook = FULL_KIT;
  private kitShown = '';
  private backG = new Graphics();
  private psuitTorso = new Graphics();
  private psuitBits: Graphics[] = [];
  private ps2Torso = new Graphics();
  private ps2Bits: Graphics[] = [];
  private tinted: { g: Graphics; base: number }[] = [];
  private readonly torsoMaterials: ReturnType<typeof buildTorso>;
  /** Hip thruster rig: a white housing with a lime nozzle, and the plume while boosting. */
  private thruster = new Graphics();
  /** After milestone 12: the suit attachments (satchel, visor, cowl) in body space, and the limb pieces (boots, flare tube). */
  private extras = new Graphics();
  private bootBits: Graphics[] = [];
  private flareTube = new Graphics();
  /** Phase 17: the stun-dart launcher on the far forearm. */
  private dartPod = new Graphics();
  /** Phase 19: the Rivet driver on the near forearm. */
  private rivetPod = new Graphics();
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

  // ---- Phase 17b: clamped mag-boots. The on-foot rig stands in for the swimming body. ----
  /** The mag-boots are clamped on: Kestrel walks the seabed (main.ts toggles it with the Boots action). */
  clamped = false;
  private walkRig: Walker | null = null;
  private walkHost = new Container();
  private readonly mag: MagBody = { x: 0, y: 0, vx: 0, vy: 0, onFloor: false };
  private walkBreath = 1.5;
  private readonly walkPt = { x: 0, y: 0 };
  /**
   * Kestrel's size in the open water (Colin, Nov 23, 2026): the swimmer and
   * the mag-boots walker are drawn at the same size, 20% smaller than the
   * walker used to be, so the ocean feels bigger. Change KESTREL_SIZE to
   * resize both together.
   */
  static readonly KESTREL_SIZE = 0.8;
  /** Walker units to world units (the standing rig was 0.9 before the resize). */
  static readonly WALK_K = 0.9 * Diver.KESTREL_SIZE;
  /**
   * The swimming body's drawing scale. It was 0.86, which drew the swimmer's
   * helmet about twice the walker's on screen; SWIM_MATCH brings swim form up
   * ~14% (Colin, Nov 23, 2026) to match the mag-boots walker's visual presence.
   */
  private static readonly SWIM_MATCH = 0.57;
  private static readonly SCALE = 0.86 * Diver.SWIM_MATCH * Diver.KESTREL_SIZE;
  /** The swimmer's size against the old one, for distances tuned at the old size. */
  static readonly SWIM_K = Diver.SWIM_MATCH * Diver.KESTREL_SIZE;
  /** How far below the waterline the body floats at the surface (30 at the old size), so the helmet stays out. */
  static readonly FLOAT = Math.round(30 * Diver.SWIM_K);
  /** The swimmer's collision circle follows the drawing (it was 26). */
  private static readonly RADIUS = Math.round(26 * Diver.SWIM_K);
  private static readonly SPEED = 230;
  private static readonly BOOST_SPEED = 430;
  /** With the TH-2 thruster head (found in the kelp forest). */
  private static readonly BOOST_SPEED_2 = 540;

  constructor(paintedFace?: Texture, paintedSuit?: Texture, private readonly surfacePersonality = false, redesigned = false,
    private readonly compact = false, fidelity = false) {
    const detailed = compact && fidelity;
    this.nearLeg = buildLeg(false, redesigned, compact, detailed);
    this.farLeg = buildLeg(true, redesigned, compact, detailed);
    this.nearArm = buildArm(false, redesigned, compact, detailed);
    this.farArm = buildArm(true, redesigned, compact, detailed);
    // The torso is drawn long and compressed a little here for a stockier build.
    this.torsoMaterials = buildTorso(paintedSuit);
    const torso = this.torsoMaterials.view;
    torso.scale.x = 0.88;
    torso.addChildAt(this.backG, 0);
    drawDiverPsuitTorso(this.psuitTorso);
    this.psuitTorso.visible = false;
    torso.addChild(this.psuitTorso);
    drawDiverPs2Torso(this.ps2Torso);
    this.ps2Torso.visible = false;
    torso.addChild(this.ps2Torso);
    // Pressure suit rings and tubes on every limb segment.
    for (const leg of [this.nearLeg, this.farLeg]) {
      const a = psuitLimb(24, 12, true);
      const b = psuitLimb(21, 11, false);
      leg.thigh.addChildAt(a, 1);
      leg.shin.addChild(b);
      this.psuitBits.push(a, b);
      const pl = ps2Plate(24, 12);
      leg.thigh.addChildAt(pl, 2);
      this.ps2Bits.push(pl);
    }
    for (const arm of [this.nearArm, this.farArm]) {
      const a = psuitLimb(17, 10, true);
      const b = psuitLimb(11, 9, false);
      arm.upper.addChildAt(a, 1);
      arm.fore.addChildAt(b, 1);
      this.psuitBits.push(a, b);
      if (arm === this.nearArm) {
        const br = new Graphics();
        drawResonatorBracer(br, 14, 9);
        br.visible = false;
        arm.fore.addChild(br);
        this.bracers.push(br);
      }
      const pl = ps2Plate(17, 10);
      arm.upper.addChildAt(pl, 2);
      this.ps2Bits.push(pl);
    }
    // After milestone 12: mag-boot soles on both shins, and the flare tube on the near forearm.
    for (const leg of [this.nearLeg, this.farLeg]) {
      const b = new Graphics();
      b.roundRect(14.5, -7, 8, 14, 2.5).fill({ color: C.chromeDark });
      b.roundRect(14.5, -7, 8, 3, 1.5).fill({ color: C.chromeHi, alpha: 0.7 });
      b.circle(18.5, 3, 1.8).fill({ color: C.visor, alpha: 0.95 });
      b.visible = false;
      leg.shin.addChild(b);
      this.bootBits.push(b);
    }
    {
      const f = this.flareTube;
      f.roundRect(1, -9, 10, 4.5, 2).fill({ color: C.chromeDark });
      f.roundRect(1, -9, 10, 1.4, 0.7).fill({ color: C.chromeHi, alpha: 0.6 });
      f.rect(10, -8.6, 2.4, 3.8).fill({ color: 0xc8402e });
      f.visible = false;
      this.nearArm.fore.addChild(f);
    }
    {
      // Phase 17: the stun-dart launcher, a short brass-banded barrel on the far forearm with a red-tipped dart.
      const d = this.dartPod;
      d.roundRect(0, 3.5, 11, 4.2, 1.8).fill({ color: C.steelDark });
      d.rect(3, 3.5, 1.6, 4.2).fill({ color: BRASS });
      d.roundRect(0, 3.5, 11, 1.2, 0.6).fill({ color: C.chromeHi, alpha: 0.5 });
      d.poly([11, 4.6, 14.5, 5.6, 11, 6.6]).fill({ color: 0xc8402e });
      d.visible = false;
      this.farArm.fore.addChild(d);
    }
    {
      // Phase 19: the Rivet driver on the near forearm (its guard folded flat while swimming).
      const r = drawRivetDriver(this.rivetPod, 1.05);
      r.visible = false;
      this.nearArm.fore.addChild(r);
    }
    // The suit's own graphics, to take the pressure suit's bronze cast.
    const collect = (c: Container) => {
      for (const ch of c.children) {
        if (ch instanceof Graphics && !this.psuitBits.includes(ch) && !this.ps2Bits.includes(ch)) this.tinted.push({ g: ch, base: ch.tint });
        if (!(ch instanceof Graphics)) collect(ch as Container);
      }
    };
    for (const part of [this.nearLeg.thigh, this.farLeg.thigh, this.nearArm.upper, this.farArm.upper]) collect(part);
    for (const ch of torso.children) if (ch instanceof Graphics && ch !== this.backG && ch !== this.psuitTorso && ch !== this.ps2Torso) this.tinted.push({ g: ch, base: ch.tint });
    if (redesigned) {
      this.character = new KestrelSwimMotion(compact);
      const fit = kestrelTorso(compact, detailed);
      this.chest = fit.getChildByLabel('kestrelChest')! as Graphics;
      fit.position.set(compact ? -27 : -29, 0);
      fit.scale.set(compact ? 1.42 : 1.15, compact ? 1.54 : 1.65);
      fit.rotation = Math.PI * 0.5;
      torso.addChildAt(fit, 2);
      collect(fit);
    }
    const helmet = this.helmet = playerHelmet(redesigned, false, paintedFace, compact, detailed);
    helmet.x = -6;
    this.visorFog = helmet.getChildByLabel('visorFog')!;
    this.visorDrops = helmet.getChildByLabel('visorDrops')!;
    // The head turns about the neck, inside the glass.
    this.headRig = helmet.getChildByLabel('headRig')!;
    this.headRig.pivot.set(66, 8);
    this.headRig.position.set(66, 8);
    this.eyelid = this.headRig.getChildByLabel('eyelid', true)!;
    if (redesigned) {
      this.expression = new KestrelExpression(this.headRig);
      helmet.pivot.set(63, 17);
      helmet.position.set(57, 17);
      helmet.scale.set(compact ? 1.06 : 1.08, compact ? 1.14 : 1.08);
    }
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
      this.extras,
      buildShoulderLamp(),
      this.nearLeg.thigh,
      this.plume,
      this.thruster,
      this.nearArm.upper,
    );
    this.diveBag.position.set(-8, 15);
    this.beltJar.view.position.set(5, 15);
    this.diveBag.visible = false;
    this.applyKit();
    this.body.position.set(0, 0);
    this.view.addChild(this.body);

    this.lens.circle(0, 0, 2.4).fill({ color: 0xfff3d0 });
    this.lensGlow.circle(0, 0, redesigned ? 9 : 14).fill({ color: 0xffe9b0, alpha: redesigned ? 0.63 : 0.9 });
    this.resonDot.visible = this.resonGlow.visible = false;
    batchAll(this.view);
  }

  /** Redraw the kit (tanks, harpoon, thruster, pressure suit) when it changed. */
  private applyKit(): void {
    const key = kitKey(this.kit);
    if (key === this.kitShown) return;
    this.kitShown = key;
    const k = this.kit;
    drawDiverBack(this.backG.clear(), k, this.compact);
    const t = this.thruster.clear();
    if (k.thruster === 1) {
      t.roundRect(-30, 8, 24, 12, 5).fill({ color: 0xd8dde0 });
      t.roundRect(-28, 9, 20, 3, 1.5).fill({ color: 0xffffff, alpha: 0.6 });
      t.rect(-19, 8, 2, 12).fill({ color: 0x8e979c });
      t.roundRect(-36, 9.5, 8, 9, 2).fill({ color: C.chromeDark });
      t.circle(-36, 14, 4).fill({ color: C.visor, alpha: 0.9 });
      t.rect(-12, 10, 10, 3).fill({ color: C.chromeDark });
    } else if (k.thruster === 2) {
      // TH-2: a longer housing with twin nozzles, lime fins and a brass ring.
      t.poly([-26, 7, -14, 0, -10, 0, -16, 7]).fill({ color: C.visor });
      t.poly([-26, 21, -14, 28, -10, 28, -16, 21]).fill({ color: C.visor });
      t.roundRect(-32, 6, 28, 16, 6).fill({ color: 0xd8dde0 });
      t.roundRect(-30, 7, 24, 3.5, 1.5).fill({ color: 0xffffff, alpha: 0.6 });
      t.rect(-20, 6, 3, 16).fill({ color: BRASS });
      t.rect(-20, 6, 1, 16).fill({ color: 0xf0d890, alpha: 0.7 });
      for (const y of [10.5, 17.5]) {
        t.roundRect(-38, y - 3.6, 8, 7.2, 2).fill({ color: C.chromeDark });
        t.circle(-38, y, 3.2).fill({ color: C.visor, alpha: 0.95 });
      }
      t.rect(-6, 9.5, 8, 3).fill({ color: C.chromeDark });
      t.rect(-6, 15.5, 8, 3).fill({ color: C.chromeDark });
    }
    for (const b of this.bracers) b.visible = !!k.resonator;
    // After milestone 12: the attachments.
    for (const b of this.bootBits) b.visible = !!k.boots;
    this.flareTube.visible = !!k.flare;
    this.dartPod.visible = !!k.dart;
    this.rivetPod.visible = !!k.rivet;
    const x = this.extras.clear();
    if (k.dash && k.thruster >= 1) {
      // TH-3: a third, upturned nozzle on the hip thruster.
      x.roundRect(-36, 1, 9, 6, 2).fill({ color: C.chromeDark });
      x.circle(-36, 4, 2.6).fill({ color: C.visor, alpha: 0.95 });
      x.poly([-28, 1, -20, -3, -18, -1, -26, 3]).fill({ color: C.visor });
    }
    if (k.satchel) {
      // The specimen satchel: a padded pouch with a lime-lit lid beside the jar.
      x.roundRect(15, 10, 12, 13, 3.5).fill({ color: 0x4a545a });
      x.roundRect(15, 10, 12, 4, 2).fill({ color: C.chromeDark });
      x.rect(19, 15, 4, 5).fill({ color: C.visor, alpha: 0.8 });
    }
    if (k.cowl) {
      // The heat-shield cowl: a chrome rim round the helmet's base and a cape plate over the shoulder.
      x.moveTo(36, 13).quadraticCurveTo(58, 24, 80, 13).stroke({ color: C.chromeHi, width: 3.2 });
      x.moveTo(36, 13).quadraticCurveTo(58, 24, 80, 13).stroke({ color: C.chromeDark, width: 1, alpha: 0.8 });
      x.poly([12, 0, 40, -4, 44, 8, 16, 12]).fill({ color: C.chromeDark, alpha: 0.92 });
      x.poly([12, 0, 40, -4, 41, -1, 13, 3]).fill({ color: C.chromeHi, alpha: 0.6 });
    }
    if (k.visor) {
      // The Echo visor: a lime band across the front of the glass.
      x.moveTo(58, -15).quadraticCurveTo(74, -19, 84, -11).stroke({ color: C.visor, width: 2.4, alpha: 0.85 });
      x.circle(84, -11, 1.6).fill({ color: 0xf0ffc0 });
    }
    this.psuitTorso.visible = k.psuit > 0;
    for (const b of this.psuitBits) b.visible = k.psuit > 0;
    this.ps2Torso.visible = k.psuit === 2;
    for (const b of this.ps2Bits) b.visible = k.psuit === 2;
    const tint = k.psuit === 2 ? PSUIT2_TINT : PSUIT_TINT;
    for (const { g, base } of this.tinted) g.tint = k.psuit ? mulColour(base, tint) : base;
    const { procedural, painted } = this.torsoMaterials;
    if (painted) {
      painted.visible = k.psuit === 0;
      procedural.visible = !painted.visible;
    }
    if (this.character) {
      procedural.visible = false;
      if (painted) painted.visible = false;
    }
  }

  /** Milestone 11: the resonator's crystal, lit in the Choir's colours (brighter while it sings). */
  private placeResonator(): void {
    const on = !!this.kit.resonator && this.view.visible;
    this.resonDot.visible = this.resonGlow.visible = on;
    if (!on) return;
    const n = Math.min(4, this.kit.tanks);
    const top = n >= 3 ? -49 : n === 2 ? -38 : -27;
    let [x, y] = this.toWorld(RESON_BACK.x * 0.88, Math.min(top, -27) + RESON_BACK.dy);
    if (this.clamped && this.walkRig) {
      const p = this.walkWorld(this.walkRig.resonPoint());
      x = p.x;
      y = p.y;
    }
    const c = choirColour(this.time * (0.5 + this.singing * 2));
    const s = this.singing;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * (2 + s * 9));
    this.resonDot.clear().circle(0, 0, 2 + s * 1.6).fill({ color: 0xf4fbff }).circle(0, 0, 3.4 + s * 2).fill({ color: c, alpha: 0.55 });
    this.resonGlow.clear().circle(0, 0, 10 + s * 26 + pulse * 4 * s).fill({ color: c, alpha: 0.35 + s * 0.5 });
    this.resonDot.position.set(x, y);
    this.resonGlow.position.set(x, y);
    this.resonDot.alpha = this.view.alpha;
    this.resonGlow.alpha = this.view.alpha * (0.55 + 0.25 * pulse);
  }

  /** Where the resonator's crystal is in the world (the song's rings start here). */
  resonPoint(): { x: number; y: number } {
    return { x: this.resonDot.x, y: this.resonDot.y };
  }

  /**
   * Phase 17b: give the diver its on-foot rig (made in main.ts with the same
   * look flags), drawn instead of the swimming body while the boots are clamped.
   */
  attachWalker(w: Walker): void {
    this.walkRig = w;
    w.visor = w.visorTarget = 0;
    const K = Diver.WALK_K;
    // Planted boots sit on the seabed under each foot, so slopes read.
    w.floorAt = (wx) => {
      const x = wx * K;
      const sole = this.y + MAG.foot;
      const f = floorBetween(x, sole - 18, sole + 18, isSolid);
      return (f ?? sole) / K;
    };
    this.walkHost.scale.set(K);
    this.walkHost.visible = false;
    this.walkHost.addChild(w.view);
    this.view.addChild(this.walkHost);
  }

  /** Clamp the boots on (Kestrel drops to the seabed) or let go (swimming at once). The position never moves. */
  setClamped(on: boolean): void {
    if (on === this.clamped || (on && !this.walkRig)) return;
    this.clamped = on;
    if (on) {
      const m = this.mag;
      m.x = this.x;
      m.y = this.y;
      m.vx = this.vx;
      m.vy = this.vy;
      magClamp(m, isSolid);
      this.vx = m.vx;
      this.vy = m.vy;
      this.surfaced = false;
      this.boostTime = 0;
      this.cancelSurfaceReaction();
      const w = this.walkRig!;
      const K = Diver.WALK_K;
      w.x = this.x / K;
      w.y = (this.y + MAG.foot) / K;
      w.vx = this.vx / K;
      w.vy = this.vy / K;
      w.face = this.face;
      w.onGround = m.onFloor;
      w.pose = m.onFloor ? 'stand' : 'fall';
      w.arrive();
      this.body.visible = false;
      this.walkHost.visible = true;
    } else {
      this.body.visible = true;
      this.walkHost.visible = false;
      this.resonDot.visible = this.resonGlow.visible = false;
      // Swimming picks up from the walk: the facing and speed carry over.
      this.faceS.set(this.face);
    }
  }

  /** Is the clamped diver standing on the bottom (not mid-hop or sinking off a ledge)? */
  get onFloor(): boolean {
    return this.clamped && this.mag.onFloor;
  }

  /**
   * Phase 17b: one frame walking in clamped boots (instead of `update`).
   * Returns what happened (a landing, a hop) and whether a boot came down.
   */
  walkFrame(dt: number, moveX: number, hop: boolean, toggleLamp: boolean): MagResult & { step: boolean; stepX: number; stepY: number } {
    const w = this.walkRig!;
    const K = Diver.WALK_K;
    this.time += dt;
    if (toggleLamp) this.lampOn = !this.lampOn;
    this.lampLevel += ((this.lampOn ? 1 : 0) - this.lampLevel) * Math.min(1, dt * 10);
    this.splash = 0;
    this.exhale = false;
    this.surfaced = false;
    const m = this.mag;
    m.x = this.x;
    m.y = this.y;
    // A heavy dive bag makes the walk a little slower still.
    const r = magStep(m, moveX * (1 - 0.15 * Math.min(1.6, this.load)), hop, dt, isSolid);
    this.x = m.x;
    this.y = m.y;
    this.vx = m.vx;
    this.vy = m.vy;
    if (moveX > 0.15) this.face = 1;
    else if (moveX < -0.15) this.face = -1;
    this.faceS.set(this.face);
    this.speedNorm = Math.min(1.6, Math.hypot(this.vx, this.vy) / Diver.SPEED);
    // A calm breath out every few seconds, quicker while walking.
    this.walkBreath -= dt;
    if (this.walkBreath <= 0) {
      this.walkBreath = 3.6 - 0.8 * Math.min(1, Math.abs(this.vx) / MAG.walk);
      this.bubblesDue += 4;
    }
    w.x = this.x / K;
    w.y = (this.y + MAG.foot) / K;
    w.vx = this.vx / K;
    w.vy = this.vy / K;
    w.face = this.face;
    w.onGround = m.onFloor;
    w.pose = m.onFloor ? (Math.abs(this.vx) > 8 ? 'walk' : 'stand') : this.vy < 0 ? 'jump' : 'fall';
    w.heavy = 1;
    w.kit = this.kit;
    w.jar = this.jar;
    w.load = this.load;
    w.lampOn = this.lampOn;
    w.singing = this.singing;
    w.working = this.working ? 1 : 0;
    const before = w.footfalls;
    w.animate(dt);
    this.view.position.set(this.x, this.y);
    this.view.scale.set(1, 1);
    this.walkHost.position.set(-this.x, -this.y);
    this.strokeWake.x = this.x;
    this.strokeWake.y = this.y + MAG.foot;
    this.strokeWake.strength = 0.25 * Math.min(1, Math.abs(this.vx) / MAG.walk);
    this.placeResonator();
    return { ...r, step: w.footfalls !== before && m.onFloor, stepX: w.lastStepX * K, stepY: this.y + MAG.foot };
  }

  /** A walker point (its own units, from the rig) in the world. */
  private walkWorld(p: { x: number; y: number }): { x: number; y: number } {
    this.walkPt.x = p.x * Diver.WALK_K;
    this.walkPt.y = p.y * Diver.WALK_K;
    return this.walkPt;
  }

  /** The middle of the helmet, in world space (for breath vapour and the surface splash). */
  helmetPoint(): [number, number] {
    if (this.clamped && this.walkRig) {
      const p = this.walkWorld(this.walkRig.head());
      return [p.x, p.y];
    }
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
    lx *= this.compact ? this.body.scale.x : Diver.SCALE;
    ly *= this.compact ? this.body.scale.y : Diver.SCALE;
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
    if (this.clamped && this.walkRig) {
      const p = this.walkWorld(this.walkRig.lampPoint());
      const o = this.lampOut;
      o.x = p.x;
      o.y = p.y;
      o.dirX = this.face * 0.99;
      o.dirY = 0.14;
      return o;
    }
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
    if (this.clamped && this.walkRig) {
      const p = this.walkWorld(this.walkRig.head());
      return [p.x + this.face * 6, p.y - 2];
    }
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

  cancelSurfaceReaction(): void {
    this.surfaceReactionReady = false;
    if (!this.surfaceReactionActive) return;
    this.surfaceReactionActive = false;
    this.headRig.rotation = this.headS.x;
    this.eyelid.visible = this.glance.blinking;
  }

  update(dt: number, moveX: number, moveY: number, boost: boolean, toggleLamp: boolean, freeSwimming = false, waterline = 0, bracing = false): void {
    this.time += dt;
    if (toggleLamp) this.lampOn = !this.lampOn;
    this.lampLevel += ((this.lampOn ? 1 : 0) - this.lampLevel) * Math.min(1, dt * 10);

    // Boost: a short burst of hard kicking, then a cooldown.
    this.boostCooldown = Math.max(0, this.boostCooldown - dt);
    this.boostTime = Math.max(0, this.boostTime - dt);
    if (boost && this.boostCooldown <= 0) {
      this.boostTime = this.kit.thruster === 2 ? 0.75 : 0.55;
      this.boostCooldown = 1.1;
      let bx = moveX;
      let by = moveY;
      if (Math.hypot(bx, by) < 0.2) {
        bx = this.face;
        by = 0;
      }
      const l = Math.hypot(bx, by);
      const push = (this.kit.thruster === 2 ? 340 : 260) * (1 - 0.2 * Math.min(1.6, this.load));
      this.vx += (bx / l) * push;
      this.vy += (by / l) * push;
    }

    // Breaking the surface, and ducking back under.
    this.splash = 0;
    this.exhale = false;
    this.diveCooldown = Math.max(0, this.diveCooldown - dt);
    if (this.surfacePersonality) {
      if (!freeSwimming || this.working || this.boostTime > 0) {
        this.cancelSurfaceReaction();
      } else if (!this.surfaced) {
        this.surfaceReactionActive = false;
        // A fresh ascent needs real submersion. Surface bobbing and surface spawns cannot arm it.
        if (this.y >= waterline + 110) this.surfaceReactionReady = true;
      }
    }
    if (this.surfaced) {
      if (moveY > 0.4) {
        this.surfaced = false;
        this.cancelSurfaceReaction();
        this.vy = 170;
        this.splash = 0.35;
        this.diveCooldown = 0.8;
      }
    } else if (this.y <= waterline + 48 && moveY < 0.25 && this.vy <= 40 && this.diveCooldown <= 0) {
      this.surfaced = true;
      this.surfaceTime = 0;
      const hit = Math.max(0, -this.vy) / 300;
      this.popStrength = Math.min(1, 0.3 + hit);
      this.splash = hit > 0.12 ? Math.min(1, 0.3 + hit) : 0;
      this.breathClock = 0.35; // first gasp straight away
      this.breaths = 0;
      if (this.splash > 0) this.visorDrops.alpha = 1;
      if (this.surfaceReactionReady && this.splash > 0 && this.time >= this.nextSurfaceReactionAt) {
        this.surfaceReactionActive = true;
        this.nextSurfaceReactionAt = this.time + 2.2;
      }
      this.surfaceReactionReady = false;
    }

    // Swim physics: accelerate towards the wanted velocity, with water drag.
    const top = this.boostTime > 0 ? (this.kit.thruster === 2 ? Diver.BOOST_SPEED_2 : Diver.BOOST_SPEED) : Diver.SPEED;
    // A heavy dive bag: slower everywhere, slower still going up, and a slow sink when not swimming.
    const L = Math.min(1.6, this.load);
    const heavy = 1 - 0.22 * L;
    const slow = (this.surfaced ? 0.5 : this.working ? 0.15 : 1) * heavy;
    const wantX = moveX * top * slow * (bracing ? 0.45 : 1);
    const effort = Math.min(1, Math.hypot(moveX, moveY));
    const climb = moveY < 0 ? 1 - 0.15 * L : 1;
    const sink = this.surfaced || this.working || this.noSink ? 0 : 30 * L * (1 - 0.75 * effort);
    const wantY = bracing ? 16 : this.surfaced ? 0 : moveY * top * slow * climb + sink;
    const accel = bracing ? 9 : Math.hypot(moveX, moveY) > 0.05 ? 3.2 : 1.4;
    const k = 1 - Math.exp(-accel * dt);
    // A current carries the diver: it adds to the speed they swim at.
    this.vx += (wantX + this.current.x - this.vx) * k;
    this.vy += (wantY + this.current.y - this.vy) * k;
    // Gentle bob when floating still.
    this.vy += Math.sin(this.time * 1.6) * 6 * dt * (1 - Math.min(1, Math.hypot(moveX, moveY)));

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.surfaced) this.treadWater(dt, waterline);
    if (waterline > 0 && this.y < waterline + 18 * Diver.SWIM_K) {
      this.y = waterline + 18 * Diver.SWIM_K;
      this.vy = Math.max(0, this.vy);
    }
    this.collide();

    const speed = Math.hypot(this.vx, this.vy);
    this.speedNorm = Math.min(1.6, speed / Diver.SPEED);

    this.animate(dt, bracing ? moveX * 0.45 : moveX, bracing ? 0 : moveY);
  }

  /**
   * Animate only, for when something else moves the diver (the grapple
   * reeling them in): the body keeps breathing and trails its legs
   * instead of freezing mid-kick.
   */
  pose(dt: number): void {
    this.cancelSurfaceReaction();
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

    if (this.character) this.poseKestrel(dt, moveX, moveY);
    this.animateHead(dt, input);
    this.animateGear(dt);
    if (this.character && !this.working) this.poseKestrelLimbs(dt, this.character);
    else this.animateLimbs(dt);
    if (this.character) this.placeStrokeWake(this.character);
  }

  private poseKestrel(dt: number, mx: number, my: number): void {
    const motion = this.character!;
    const action = this.working ? 'busy' : this.visualAction;
    motion.update(dt, this.vx, this.vy, mx, my, this.face, this.boostLvl, this.surfaced, this.surfaceTime,
      this.popStrength, action, this.visualTarget, this.x, this.y, this.pitch);
    const curl = motion.brake * (this.compact ? 0.51 : 0.23) + motion.interest * motion.look * 0.16 + motion.relief * 0.15;
    const flex = this.chestFlex.step(curl + Math.sin(motion.stroke - 0.5) * (0.034 + motion.power * 0.038)
      - motion.reach * 0.13, 10, 0.84, dt);
    this.chest!.rotation = flex;
    this.chest!.scale.y = 1 + this.heave * 0.045 + motion.reach * 0.10 - motion.brake * (this.compact ? 0.25 : 0.11);
    this.helmet.rotation = flex * 0.54 - motion.relief * 0.17 - motion.trim * 0.18;
    this.helmet.position.set((this.compact ? 51 : 57) - motion.brake * (this.compact ? 9 : 5) + motion.reach * 2.4, 17 + flex * 13 - motion.relief * 2);
    this.view.scale.x = Math.sign(this.view.scale.x) * Math.max(this.compact ? 0.47 : 0.26, Math.abs(this.view.scale.x));
    this.body.y += Math.sin(this.time * 1.7) * 1.75 * (1 - motion.travel) + Math.sin(motion.stroke * 2 - 0.5) * (1.8 * motion.travel) - motion.relief * 2.2;
    this.body.rotation += Math.sin(motion.stroke * 2) * (0.038 * motion.travel + 0.025 * motion.power);
    this.nearArm.upper.position.set(25 - motion.brake * 2.4, 8 + flex * 16);
    this.farArm.upper.position.set(27 - motion.brake * 3.1, 1 + flex * 12);
    this.nearLeg.thigh.position.set(-26 + motion.brake * 1.5, 7 + motion.brake * 3);
    this.farLeg.thigh.position.set(-24 + motion.brake * 1.8, 2 + motion.brake * 1.5);
    this.backG.rotation = this.tankSwing.step(motion.brake * 0.09 - motion.reach * 0.06, 8.5, 0.63, dt);
    if (this.compact && !this.surfaced && action === 'free') {
      this.body.rotation -= motion.brake * 0.30 + motion.reach * 0.13 + motion.interest * 0.19;
      this.body.scale.x *= 1 - motion.compression * 0.14 + motion.reach * 0.08;
      this.body.scale.y *= 1 + motion.compression * 0.09;
    }
  }

  private poseKestrelLimbs(dt: number, motion: KestrelSwimMotion): void {
    const { stroke, travel, power, reach, brake, trim, interest, adjust, relief } = motion;
    const hover = 1 - travel;
    const scanning = this.visualAction === 'scan';
    const grappling = this.visualAction === 'grapple';
    const nearFloor = !this.surfaced && isSolid(this.x - this.face * 48 * Diver.SWIM_K, this.y + 29 * Diver.SWIM_K);
    // Expressive flutter kick: gentle tread while hovering, clear rhythmic scissor kick while swimming, strong surge on boost.
    const spread = (this.surfaced ? 0.44 : 0.20 + travel * 0.26 + power * 0.34) * (nearFloor ? 0.65 : 1);
    for (let i = 0; i < 2; i++) {
      const near = i === 0;
      const leg = near ? this.nearLeg : this.farLeg;
      const arm = near ? this.nearArm : this.farArm;
      const phase = stroke + i * Math.PI;
      const beat = Math.sin(phase);
      const kneeWave = Math.sin(phase - 0.88);
      const ankleWave = Math.sin(phase - 1.48);
      const tipWave = Math.sin(phase - 2.08);
      // Power travels naturally down the leg: hip -> knee -> ankle -> flexible fin blade tip.
      leg.thigh.rotation = Math.PI - hover * (0.34 + i * 0.16) + spread * beat
        - brake * (0.69 + i * 0.23) + trim * 0.24 - relief * 0.18;
      leg.shin.rotation = 0.14 + hover * (0.48 + 0.12 * i) + spread * (0.44 + kneeWave * 0.68)
        + brake * 0.49 - reach * 0.14;
      if (this.compact) {
        leg.thigh.rotation -= brake * 0.55 + motion.compression * 0.48;
        leg.shin.rotation += brake * 0.75 + motion.compression * 0.78;
      }
      const target = -0.08 - hover * 0.18 - ankleWave * (0.24 + spread * 1.15) + brake * 0.25 - this.visualCurrent * hover * 0.12;
      leg.finAng = approach(leg.finAng, target, 16, dt);
      leg.fin.rotation = leg.finAng;
      const tipTarget = -tipWave * (0.22 + spread * 1.18) + (leg.finAng - target) * 0.55;
      leg.tip.rotation = approach(leg.tip.rotation, tipTarget, 18, dt);
      const delay = kneeWave;

      // An easy figure-eight scull becomes a longer recovery and pull as speed builds.
      const pull = 0.5 + 0.5 * Math.sin(phase - 0.33);
      let upper = 1.05 + Math.sin(phase * 1.0 + 0.2) * 0.19 + i * 0.23;
      upper += travel * (1.50 + 0.50 * power - 0.58 * (1 - power) * pull);
      let elbow = -0.78 + travel * (0.71 + 0.26 * pull);
      upper -= reach * (near ? 1.04 : 0.63) + brake * (near ? 1.07 : 1.19);
      elbow -= brake * 0.89 + reach * 0.28;
      if (this.compact) {
        upper += brake * 0.46 + motion.compression * 0.47 - reach * 0.35 - interest * (near ? 0.33 : 0.17);
        elbow -= brake * 0.48 + motion.compression * 0.34 + interest * (near ? 0.18 : 0.1);
      }
      upper += interest * (near ? 0.09 : 0.31) - relief * (near ? 0.67 : 0.23) - trim * 0.37;
      elbow -= (near ? adjust * 0.85 : 0) + relief * 0.29;
      if (near && (scanning || grappling)) {
        upper = scanning ? 0.68 + motion.look * 0.52 : 0.14 + trim * 0.4;
        elbow = scanning ? -0.85 : -0.17;
      }
      arm.upper.rotation = approach(arm.upper.rotation, upper, 14, dt);
      arm.fore.rotation = approach(arm.fore.rotation, elbow, 15, dt);
      arm.hand!.rotation = approach(arm.hand!.rotation, -0.22 - delay * 0.20 + brake * 0.62 - reach * 0.25, 12, dt);
    }
  }

  private placeStrokeWake(motion: KestrelSwimMotion): void {
    // Switch feet close to the recovery stroke. Reuse the actual visible rig joints.
    const side = Math.cos(motion.stroke) > 0 ? 0 : 1;
    const leg = side === 0 ? this.nearLeg : this.farLeg;
    if (this.compact && this.view.parent) {
      leg.tip.toGlobal(this.wakeTip, this.wakeGlobal);
      this.view.parent.toLocal(this.wakeGlobal, undefined, this.wakeGlobal);
      this.strokeWake.x = this.wakeGlobal.x;
      this.strokeWake.y = this.wakeGlobal.y;
      this.strokeWake.strength = 0.58 + 0.37 * Math.abs(Math.cos(motion.stroke)) + motion.power * 0.3;
      return;
    }
    let angle = leg.thigh.rotation;
    let x = leg.thigh.x + Math.cos(angle) * leg.shin.x;
    let y = leg.thigh.y + Math.sin(angle) * leg.shin.x;
    angle += leg.shin.rotation;
    x += Math.cos(angle) * leg.fin.x;
    y += Math.sin(angle) * leg.fin.x;
    angle += leg.fin.rotation;
    x += Math.cos(angle) * leg.tip.x * leg.fin.scale.x;
    y += Math.sin(angle) * leg.tip.x * leg.fin.scale.x;
    angle += leg.tip.rotation;
    x += Math.cos(angle) * 13;
    y += Math.sin(angle) * 13;
    const c = Math.cos(this.body.rotation);
    const s = Math.sin(this.body.rotation);
    this.strokeWake.x = this.x + this.view.scale.x * (x * this.body.scale.x * c - y * this.body.scale.y * s);
    this.strokeWake.y = this.y + this.body.y + x * this.body.scale.x * s + y * this.body.scale.y * c;
    this.strokeWake.strength = 0.53 + 0.46 * Math.abs(Math.cos(motion.stroke)) + motion.power * 0.28;
  }

  /**
   * Treading water at the surface: the body bobs on the swell, pops up
   * after a fast breach and settles, and breathes in and out. The first
   * breath after a dive is a big gasp.
   */
  private treadWater(dt: number, waterline: number): void {
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
    const pop = -30 * Diver.SWIM_K * this.popStrength * Math.exp(-2.6 * t) * Math.cos(5.5 * t);
    const targetY = waterline + Diver.FLOAT + (Math.sin(this.time * 1.7) * 2.5 - this.heave * 3) * Diver.SWIM_K + pop;
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
    const t = this.surfaceTime;
    const reactionDuration = 0.64;
    // Reserve a brief quiet gap after the scripted blinks without changing the idle glance cadence.
    if (t >= 0.84) this.surfaceReactionActive = false;
    const reacting = this.surfaceReactionActive && this.surfaced;
    this.glance.update(dt);
    const still = (1 - this.swimBlend) * (this.working ? 0 : 1);
    // Looking where the body is going: a little further than the body's own angle.
    const lead = Math.max(-0.12, Math.min(0.12, (this.pitchS.v * 0.08) + Math.sin(this.pitch) * 0.08 * this.swimBlend));
    let want = this.glance.target * still * (1 - input) + lead - this.boostLvl * 0.05 * (1 - this.turn);
    if (this.surfaced) want = -0.05 - this.heave * 0.06;
    if (this.working) want = 0.1;
    want = Math.max(-0.17, Math.min(0.14, want));
    const w = 7;
    const head = this.headS.step(want, w, 1, dt);
    // Add the tip to the head drawing alone. The hose still follows the breathing spring.
    const tip = reacting && t < reactionDuration ? (Math.PI / 60) * Math.sin(Math.PI * t / reactionDuration) ** 2 : 0;
    this.headRig.rotation = head - tip;
    const blink = reacting ? (t >= 0.14 && t < 0.24) || (t >= 0.375 && t < 0.475) : this.glance.blinking;
    if (this.character && this.expression) {
      const m = this.character;
      const inspect = this.visualAction === 'scan' ? 0.9 : m.interest;
      this.headRig.rotation += m.look * inspect * 0.37 - m.relief * 0.17 - m.trim * 0.09 + m.brake * 0.11;
      this.expression.apply(blink, m.look * 1.6, Math.min(1, m.relief + m.interest * 0.7 + m.brake * 0.37),
        Math.max(m.power * 0.66, this.visualAction === 'scan' ? 0.65 : 0), m.relief * 0.94);
    } else this.eyelid.visible = blink;
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
    // TH-1 has one nozzle; TH-2 two, each a little narrower, and a longer jet.
    const mk2 = this.kit.thruster === 2;
    const nozzles = mk2 ? [10.5, 17.5] : [14];
    const NY = nozzles[Math.floor(Math.random() * nozzles.length)];
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
      const len = (30 + 26 * jet) * flick * (mk2 ? 1.35 : 1);
      const wk = mk2 ? 0.8 : 1;
      for (const NY of nozzles) {
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
      pl.poly(bell(0, 6.2 * wk, len)).fill({ color: C.visor, alpha: 0.28 * jet });
      pl.poly(bell(2, 4.2 * wk, len * 0.78)).fill({ color: 0xd9ff70, alpha: 0.5 * jet });
      pl.poly(bell(4, 2.2 * wk, len * 0.45)).fill({ color: 0xfaffe6, alpha: 0.95 * jet });
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
    this.applyKit();
    this.placeResonator();
    this.beltJar.set(this.kit.jar ? this.jar : null, this.time, this.kit.jar);
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
