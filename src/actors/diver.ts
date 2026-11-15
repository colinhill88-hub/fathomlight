import { Container, Graphics, Text } from 'pixi.js';
import { isSolid } from '../world/terrain';
import { mulberry32 } from '../rng';

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

const C = {
  suit: 0x2c302f, // charcoal
  suitShade: 0x1a1d1d,
  suitLight: 0x4a504d,
  etch: 0xb39a4e, // brass etched lines
  sleeve: 0x8b918f,
  sleeveShade: 0x5f6563,
  red: 0xa8402e, // rust red gloves and belt
  redShade: 0x6e2a1f,
  rust: 0x8a3a20,
  chrome: 0x6d7f9a, // blue-steel chrome
  chromeDark: 0x2c3647,
  chromeMid: 0x4d5d77,
  chromeHi: 0xd6e0ee,
  steelDark: 0x3b4448,
  steelLight: 0xaab4b5,
  rubber: 0x232524,
  rubberEdge: 0x3d4140,
  visor: 0xb6e23a, // tinted lime glass
  visorEdge: 0x6f8f16,
  skin: 0x9a7058,
};

const rand = mulberry32(0xd1e5);

function rivets(g: Graphics, pts: [number, number][], r = 1.1): void {
  for (const [x, y] of pts) {
    g.circle(x, y, r).fill({ color: C.chromeDark });
    g.circle(x - 0.3, y - 0.4, r * 0.45).fill({ color: C.chromeHi, alpha: 0.85 });
  }
}

function scratches(g: Graphics, x0: number, y0: number, w: number, h: number, n: number, alpha = 0.22): void {
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

function rustStreaks(g: Graphics, x0: number, y0: number, w: number, n: number, len: number): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + rand() * w;
    const l = len * (0.5 + rand());
    g.moveTo(x, y0)
      .quadraticCurveTo(x + (rand() - 0.5) * 2, y0 + l * 0.5, x + (rand() - 0.5) * 3, y0 + l)
      .stroke({ color: C.rust, alpha: 0.3 + rand() * 0.25, width: 0.7 + rand() * 0.8 });
  }
}

/** Faint engraved "circuit" panel lines, like etched brass trim on the suit. */
function etching(g: Graphics, x0: number, y0: number, w: number, h: number, n: number): void {
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
function chromeBands(g: Graphics, x: number, y: number, w: number, h: number, r: number): void {
  g.roundRect(x, y, w, h, r).fill({ color: C.chrome });
  g.roundRect(x + 1, y + h * 0.55, w - 2, h * 0.4, r * 0.6).fill({ color: C.chromeMid, alpha: 0.85 });
  g.roundRect(x + 2, y + h * 0.12, w - 4, h * 0.16, h * 0.08).fill({ color: C.chromeHi, alpha: 0.75 });
  g.roundRect(x, y, w, h, r).stroke({ color: C.chromeDark, width: 1 });
}

/** A limb segment drawn along +x from its joint. */
function segment(len: number, thick: number, color: number, shade: number): Graphics {
  const g = new Graphics();
  g.roundRect(-thick * 0.45, -thick / 2, len + thick * 0.9, thick, thick / 2).fill({ color });
  g.roundRect(-thick * 0.3, thick * 0.05, len + thick * 0.6, thick * 0.42, thick * 0.2).fill({
    color: shade,
    alpha: 0.6,
  });
  g.moveTo(0, -thick * 0.3)
    .lineTo(len, -thick * 0.3)
    .stroke({ color: 0xffffff, alpha: 0.12, width: 1 });
  return g;
}

interface Leg {
  thigh: Container;
  shin: Container;
  fin: Container;
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

  const fin = new Container();
  fin.x = 22;
  const fg = new Graphics();
  fg.roundRect(-5, -6, 12, 12, 4).fill({ color: C.rubber });
  fg.moveTo(2, -6)
    .lineTo(44, -9)
    .quadraticCurveTo(50, -1, 46, 6)
    .lineTo(4, 5)
    .closePath()
    .fill({ color: C.rubber });
  fg.moveTo(44, -9).quadraticCurveTo(50, -1, 46, 6).stroke({ color: C.rubberEdge, width: 2.2, alpha: 0.9 });
  for (const y of [-4, 0, 3.5])
    fg.moveTo(8, y * 0.7)
      .lineTo(42, y * 1.25)
      .stroke({ color: 0x3e4140, width: 1, alpha: 0.7 });
  fg.tint = tint;
  fg.scale.set(0.88, 1);
  fin.addChild(fg);
  shin.addChild(fin);
  return { thigh, shin, fin };
}

function buildArm(far: boolean): Arm {
  const tint = far ? 0x9a9a9a : 0xffffff;
  const upper = new Container();
  const ug = segment(17, 10, C.sleeve, C.sleeveShade);
  ug.circle(0, 0, 6).fill({ color: C.chrome }); // shoulder joint ring
  ug.circle(-1, -1.5, 2.5).fill({ color: C.chromeHi, alpha: 0.6 });
  ug.circle(0, 0, 6).stroke({ color: C.chromeDark, width: 1 });
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

  // Raised chrome cowl: the back unit's metal rises up behind the helmet
  // and curves forward over it, protecting the hose connection.
  g.moveTo(-10, -28)
    .bezierCurveTo(4, -38, 18, -51, 34, -51)
    .bezierCurveTo(44, -52, 50, -47, 50, -42)
    .quadraticCurveTo(44, -40, 42, -34)
    .lineTo(40, -24)
    .lineTo(-10, -24)
    .closePath()
    .fill({ color: C.chrome })
    .stroke({ color: C.chromeDark, width: 1.2 });
  g.moveTo(0, -33).bezierCurveTo(12, -42, 24, -48, 38, -48.5).stroke({ color: C.chromeHi, width: 2.6, alpha: 0.75, cap: 'round' });
  g.moveTo(41, -33).quadraticCurveTo(44, -42, 49, -44).stroke({ color: C.chromeMid, width: 2.2, alpha: 0.9, cap: 'round' });
  // A round port through the cowl, ribs, and the hose coupling at the top.
  g.circle(12, -31.5, 3.6).fill({ color: C.chromeMid }).stroke({ color: C.chromeDark, width: 1 });
  g.circle(12, -31.5, 1.7).fill({ color: 0x0f1418 });
  for (let k = 0; k < 3; k++) g.moveTo(31 + k * 3.2, -44).lineTo(31 + k * 3.2, -31).stroke({ color: C.chromeDark, width: 1.2, alpha: 0.7 });
  g.roundRect(41, -45, 9, 7, 2).fill({ color: C.chromeMid }).stroke({ color: C.chromeDark, width: 1 });
  rivets(g, [[37, -28], [22, -42], [26, -30]], 0.9);
  scratches(g, 0, -48, 44, 18, 6, 0.3);
  rustStreaks(g, 14, -33, 22, 2, 5);

  // Back unit: a compact chrome rebreather with two round ports.
  chromeBands(g, -28, -32, 62, 19, 9.5);
  // A bolted access hatch at the rear and a vent grille towards the front.
  g.roundRect(-23, -27, 14, 9, 2).fill({ color: C.chromeMid }).stroke({ color: C.chromeDark, width: 1 });
  rivets(g, [[-21, -25], [-11, -25], [-21, -20], [-11, -20]], 0.75);
  for (let i = 0; i < 5; i++) g.roundRect(8 + i * 4, -28, 2, 10, 1).fill({ color: C.chromeDark, alpha: 0.85 });
  rivets(g, [[-24, -18], [-1, -27], [26, -18]], 0.9);
  scratches(g, -24, -29, 54, 14, 8, 0.3);
  rustStreaks(g, -20, -16, 44, 3, 5);

  // Suit body: charcoal with brass etching.
  g.roundRect(-34, -15, 74, 30, 13).fill({ color: C.suit });
  g.roundRect(-32, 3, 70, 11, 6).fill({ color: C.suitShade, alpha: 0.75 });
  g.roundRect(-30, -13, 66, 5, 3).fill({ color: C.suitLight, alpha: 0.5 });
  etching(g, -26, -11, 44, 20, 9);
  // Rust-red belt with a chrome buckle.
  g.rect(-28, -15, 7, 30).fill({ color: C.red });
  g.rect(-28, 4, 7, 11).fill({ color: C.redShade, alpha: 0.6 });
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
function coiledHose(g: Graphics, pts: [number, number][], width: number): void {
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
function buildShoulderLamp(): Graphics {
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

function buildHelmet(): Container {
  const c = new Container();
  const g = new Graphics();
  const shell = () =>
    g
      .moveTo(46, 15)
      .bezierCurveTo(37, 4, 37, -18, 54, -25)
      .bezierCurveTo(66, -30, 81, -26, 87, -14)
      .bezierCurveTo(92, -4, 91, 8, 83, 15)
      .quadraticCurveTo(64, 21, 46, 15)
      .closePath();

  // Inside of the helmet: in shadow, so the glass reads as deep and tinted.
  shell().fill({ color: 0x0e1a17, alpha: 0.55 });
  // The head in side profile, filling most of the helmet: skull, brow,
  // nose, lips, chin and a jaw line that rises back towards the ear. Below
  // it a slim neck in shadow disappears into the suit's dark neck seal.
  // Neck first, so the jaw overlaps it.
  g.moveTo(61, 6).lineTo(71, 6).lineTo(70.5, 16).lineTo(60.5, 16).closePath().fill({ color: 0x6e4c3b });
  g.moveTo(61, 6).lineTo(71, 6).lineTo(70.5, 10).quadraticCurveTo(66, 8, 61, 9).closePath().fill({ color: 0x2c1e17, alpha: 0.45 });
  const head = () =>
    g
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
  g.moveTo(60, 9)
    .bezierCurveTo(54, 5, 50, -2, 51, -8)
    .bezierCurveTo(52, -14, 58, -19, 64, -21)
    .quadraticCurveTo(60, -6, 66, 6.5)
    .quadraticCurveTo(63, 7, 60, 9)
    .closePath()
    .fill({ color: 0x3a2a22, alpha: 0.4 });
  // Soft shadow under the jaw and a cheekbone highlight.
  g.moveTo(81, 9.3).quadraticCurveTo(76, 10.2, 70.5, 7.5).quadraticCurveTo(76, 7.6, 80.4, 7.6).closePath().fill({ color: 0x2c1e17, alpha: 0.35 });
  g.ellipse(77.5, -1.2, 3.4, 2).fill({ color: 0xc69274, alpha: 0.35 });
  // Cap of hair over the crown and back of the head, with a few strands.
  g.moveTo(51.5, -3)
    .bezierCurveTo(50, -14, 60, -23, 71, -22)
    .bezierCurveTo(77, -21.5, 80.5, -18, 81.5, -14)
    .quadraticCurveTo(72, -17, 64, -12)
    .quadraticCurveTo(58, -8, 57, 1)
    .closePath()
    .fill({ color: 0x3b261c });
  for (const [x0, y0, x1, y1] of [[56, -14, 66, -19], [60, -10, 72, -17], [54, -6, 60, -15]])
    g.moveTo(x0, y0).lineTo(x1, y1).stroke({ color: 0x5a3c2c, width: 0.7, alpha: 0.7 });
  // Ear.
  g.moveTo(63, -4.5).quadraticCurveTo(67.5, -5, 67, 0).quadraticCurveTo(66.5, 3.5, 63.5, 3).quadraticCurveTo(62, -1, 63, -4.5).fill({ color: 0x8a5f49 });
  g.moveTo(64.2, -2.5).quadraticCurveTo(66, -2.6, 65.6, 0.4).stroke({ color: 0x5e3f30, width: 0.8, alpha: 0.85 });
  // Brow, eye with an upper lid, nostril, the line from nose to mouth, lips.
  g.moveTo(75.5, -9.6).quadraticCurveTo(78.8, -11, 81.6, -9.6).stroke({ color: 0x2a1a14, width: 1.4, alpha: 0.9 });
  g.moveTo(77.4, -6.4).quadraticCurveTo(79.2, -7.6, 80.8, -6.2).quadraticCurveTo(79.2, -5.4, 77.4, -6.4).fill({ color: 0xe8e0d6 });
  g.circle(79.8, -6.4, 0.85).fill({ color: 0x1a120e });
  g.moveTo(77.2, -6.6).quadraticCurveTo(79.2, -8.1, 81, -6.5).stroke({ color: 0x2a1a14, width: 0.7, alpha: 0.85 });
  g.circle(83.2, 0.8, 0.55).fill({ color: 0x3a241b, alpha: 0.85 });
  g.moveTo(81.4, 1.2).quadraticCurveTo(80, 3.4, 80.8, 5.4).stroke({ color: 0x5e3a2c, width: 0.6, alpha: 0.5 });
  g.moveTo(82.2, 3).lineTo(83.3, 3.3).stroke({ color: 0x6a3a2c, width: 0.9 });
  // The suit's neck seal: a dark rubber collar with a metal ring, sitting in
  // the bottom of the helmet.
  g.moveTo(52, 13).quadraticCurveTo(64, 10.5, 77, 12.5).lineTo(79, 20).quadraticCurveTo(64, 22, 50, 19).closePath().fill({ color: C.suit });
  g.moveTo(52, 13).quadraticCurveTo(64, 10.5, 77, 12.5).stroke({ color: C.chrome, width: 1.6 });
  // Tinted glass shell.
  shell().fill({ color: C.visor, alpha: 0.3 });
  shell().stroke({ color: C.visorEdge, width: 2, alpha: 0.95 });
  // Thick glass catches more colour along its edges.
  g.moveTo(47, 12).bezierCurveTo(40, 2, 40, -16, 55, -22).stroke({ color: C.visor, width: 3, alpha: 0.55, cap: 'round' });

  // One smooth crest fin, sweeping back past the rear of the helmet.
  g.moveTo(82, -22)
    .quadraticCurveTo(79, -37, 65, -39)
    .quadraticCurveTo(49, -40, 35, -32)
    .quadraticCurveTo(47, -27, 56, -25.5)
    .quadraticCurveTo(70, -27, 82, -22)
    .closePath()
    .fill({ color: C.visor, alpha: 0.8 })
    .stroke({ color: C.visorEdge, width: 1.5 });
  g.moveTo(78, -26).quadraticCurveTo(64, -32, 44, -31).stroke({ color: C.visorEdge, width: 1, alpha: 0.7 });
  g.moveTo(76, -30).quadraticCurveTo(66, -34, 54, -34).stroke({ color: 0xf2ffd0, width: 1.4, alpha: 0.55, cap: 'round' });

  // Moulded rib down the side, and the face-plate frame.
  g.moveTo(55, -20).quadraticCurveTo(52, -4, 56, 12).stroke({ color: C.visorEdge, width: 1.4, alpha: 0.7 });
  g.moveTo(82, -17).bezierCurveTo(87, -8, 87, 5, 81, 13).stroke({ color: C.visorEdge, width: 2, alpha: 0.9 });

  // Reflections.
  g.moveTo(60, -21).quadraticCurveTo(71, -26, 81, -18).stroke({ color: 0xf6ffe0, width: 2.4, alpha: 0.55, cap: 'round' });
  g.circle(85, -9, 1.7).fill({ color: 0xffffff, alpha: 0.7 });
  g.moveTo(87.5, -2).quadraticCurveTo(88, 3, 86, 8).stroke({ color: 0xffffff, width: 1.2, alpha: 0.35, cap: 'round' });


  // Coiled breathing hose from the back unit, over the side of the helmet,
  // down to the regulator port on the chest.
  coiledHose(g, [[44, -42], [60, -46], [59, -8], [51, 3]], 4.2);
  c.addChild(g);

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

  private body = new Container();
  private nearLeg = buildLeg(false);
  private farLeg = buildLeg(true);
  private nearArm = buildArm(false);
  private farArm = buildArm(true);
  private face = 1; // 1 right, -1 left
  private faceAnim = 1;
  private pitch = 0;
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
  private visorFog!: Container;
  private visorDrops!: Container;

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
      helmet,
      buildShoulderLamp(),
      this.nearLeg.thigh,
      this.nearArm.upper,
    );
    this.body.position.set(0, 0);
    this.view.addChild(this.body);

    this.lens.circle(0, 0, 2.4).fill({ color: 0xfff3d0 });
    this.lensGlow.circle(0, 0, 14).fill({ color: 0xffe9b0, alpha: 0.9 });
  }

  /** The middle of the helmet, in world space (for breath vapour and the surface splash). */
  helmetPoint(): [number, number] {
    return this.toWorld(58, -5);
  }

  /** Where the shoulder lamp's lens sits, in local drawing space. */
  private static readonly LAMP = { x: 48, y: 14.5 };
  private static readonly BUBBLE = { x: 47, y: 9 };

  private toWorld(lx: number, ly: number): [number, number] {
    const S = Diver.SCALE;
    const sx = lx * this.faceAnim * S;
    ly *= S;
    const r = this.body.rotation;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return [this.x + sx * c - ly * s, this.y + sx * s + ly * c];
  }

  lampPose(): LampPose {
    const [x, y] = this.toWorld(Diver.LAMP.x, Diver.LAMP.y);
    const r = this.body.rotation;
    const dl = 1;
    const dyl = 0.1; // aim slightly downwards
    const dx = dl * this.face;
    return {
      x,
      y,
      dirX: dx * Math.cos(r) - dyl * Math.sin(r),
      dirY: dx * Math.sin(r) + dyl * Math.cos(r),
    };
  }

  bubblePoint(): [number, number] {
    return this.toWorld(Diver.BUBBLE.x, Diver.BUBBLE.y);
  }

  /** How strongly the lamp shines right now (it fades on and off). */
  get lamp(): number {
    return this.lampLevel;
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
      this.vx += (bx / l) * 260;
      this.vy += (by / l) * 260;
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
    const slow = this.surfaced ? 0.5 : this.working ? 0.15 : 1;
    const wantX = moveX * top * slow;
    const wantY = this.surfaced ? 0 : moveY * top * slow;
    const accel = Math.hypot(moveX, moveY) > 0.05 ? 3.2 : 1.4;
    const k = 1 - Math.exp(-accel * dt);
    this.vx += (wantX - this.vx) * k;
    this.vy += (wantY - this.vy) * k;
    // Gentle bob when floating still.
    this.vy += Math.sin(this.time * 1.6) * 6 * dt * (1 - Math.min(1, Math.hypot(moveX, moveY)));

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.surfaced) this.treadWater(dt);
    this.collide();

    const speed = Math.hypot(this.vx, this.vy);
    this.speedNorm = Math.min(1.6, speed / Diver.SPEED);

    // Facing and body angle.
    if (this.vx > 25) this.face = 1;
    else if (this.vx < -25) this.face = -1;
    this.faceAnim += (this.face - this.faceAnim) * Math.min(1, dt * 9);
    if (Math.abs(this.faceAnim) < 0.08) this.faceAnim = this.face * 0.08; // never quite zero width

    const moving = this.surfaced ? 0 : Math.min(1, speed / 60);
    const swimAngle = Math.atan2(this.vy, Math.abs(this.vx) + 25);
    const idleAngle = -0.22 + Math.sin(this.time * 0.9) * 0.04;
    let targetPitch = Math.max(-1.15, Math.min(1.15, swimAngle * moving + idleAngle * (1 - moving)));
    // Upright and treading water at the surface; the head tips back a little with each breath in.
    if (this.surfaced) targetPitch = -1.08 - this.heave * 0.12 + Math.sin(this.time * 1.3) * 0.04;
    if (this.working) targetPitch = Math.atan2(this.working.y - this.y, Math.abs(this.working.x - this.x) + 30) * 0.8;
    this.pitch += (targetPitch - this.pitch) * Math.min(1, dt * (this.surfaced ? 7 : 5));

    // Breath fog on the glass clears slowly; drops of water run off.
    this.visorFog.alpha = Math.max(0, this.visorFog.alpha - dt * 0.35);
    this.visorDrops.alpha = Math.max(0, this.visorDrops.alpha - dt * 0.22);

    this.view.position.set(this.x, this.y);
    const chest = 1 + this.heave * 0.035;
    this.body.scale.set(this.faceAnim * Diver.SCALE * (1 + this.heave * 0.01), Diver.SCALE * chest);
    this.body.rotation = this.pitch * this.face;

    this.animateLimbs(dt, moving);
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
    this.heave = (ph < 0.4 ? Math.sin((ph / 0.4) * Math.PI * 0.5) : Math.cos(((ph - 0.4) / 0.6) * Math.PI * 0.5)) * amp;
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

  private animateLimbs(dt: number, moving: number): void {
    const s = this.speedNorm;
    const boost = this.boostTime > 0 ? 1 : 0;
    this.kick += dt * (2.2 + s * 6.5 + boost * 5);
    const amp = 0.1 + Math.min(1, s) * 0.32 + boost * 0.12;
    const legs: [Leg, number][] = [
      [this.nearLeg, 0],
      [this.farLeg, Math.PI],
    ];
    for (const [leg, off] of legs) {
      const p = this.kick + off;
      leg.thigh.rotation = Math.PI - 0.06 + Math.sin(p) * amp;
      leg.shin.rotation = 0.12 + Math.sin(p - 0.9) * amp * 0.9;
      leg.fin.rotation = Math.sin(p - 1.7) * amp * 1.2;
    }

    // Arms: streamlined along the body when swimming, gentle sculling when still.
    const scull = Math.sin(this.time * 2.1);
    const arms: [Arm, number][] = [
      [this.nearArm, 0],
      [this.farArm, 0.8],
    ];
    if (this.working) {
      // Working at a spot: the near arm chips, pries or cuts with short strokes.
      const strike = Math.sin(this.time * 13);
      this.nearArm.upper.rotation = 1.75 + strike * 0.22;
      this.nearArm.fore.rotation = -0.35 + Math.max(0, strike) * 0.45;
      this.farArm.upper.rotation = 1.45 + Math.sin(this.time * 2) * 0.05;
      this.farArm.fore.rotation = -0.6;
      return;
    }
    for (const [arm, off] of arms) {
      const idleUpper = 1.05 + Math.sin(this.time * 2.1 + off) * 0.22;
      const idleFore = -0.9 + scull * 0.15;
      const swimUpper = Math.PI - 0.32 + Math.sin(this.kick * 0.5 + off) * 0.05;
      const swimFore = 0.12;
      arm.upper.rotation = idleUpper + (swimUpper - idleUpper) * moving;
      arm.fore.rotation = idleFore + (swimFore - idleFore) * moving;
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
