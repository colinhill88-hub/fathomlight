import { Container, Graphics, Text } from 'pixi.js';
import { mulberry32, WORLD_SEED } from '../rng';
import { groundY, WORLD_W } from './terrain';
import {
  BaseLayout,
  CELL,
  Collar,
  collarPoint,
  collarsOf,
  GRID_BASE,
  GRID_COLS,
  GRID_ROWS,
  GRID_X0,
  isDone,
  PieceKind,
  pieceRect,
  Placed,
  shapeOf,
  STORAGE_PER_POD,
} from '../game/base';
import type { PointLight } from './scenery';

/**
 * Drawing the base pieces (milestone 3), all with code: weathered steel,
 * muted Kestrel yellow and rust red, rivets, seams, stencils, rust streaks
 * and algae, with dome glass as the signature shape.
 *
 * Layers, matching the rest of the game:
 *  - view: the pieces themselves, lit by the scene lighting, behind the diver
 *  - front: the dome glass sheen, drawn over the diver so they look inside
 *  - emissive / glow: lit windows, status lamps and welding sparks
 *  - overlay: build mode only (grid, ghost piece, open collar markers)
 */

const PAL = {
  steel: 0x5b6467,
  steelLight: 0x8a9496,
  steelDark: 0x3b4448,
  steelDeep: 0x262d30,
  yellow: 0xb8923f,
  yellowDark: 0x7f6430,
  rust: 0xa8402e,
  rustDark: 0x6e2a1f,
  streak: 0x8a3a20,
  algae: 0x5e7a3c,
  algaeLight: 0x8aa154,
  glass: 0x86b3ae,
  brass: 0xa88a4a,
  sand: 0xb7a47a,
  warm: 0xffd9a0,
  lampOn: 0xb8e07a,
  lampOff: 0xff5a3a,
};

/** Tube diameter of corridors and collar stubs. */
const TUBE = 62;
/** Height of a collar flange. */
const FLANGE = 78;

let rand = mulberry32(1);
const R = (a: number, b: number) => a + rand() * (b - a);

function dab(g: Graphics, x: number, y: number, rx: number, ry: number, color: number, alpha: number): void {
  g.ellipse(x, y, rx, ry).fill({ color, alpha: alpha * 0.5 });
  g.ellipse(x, y, rx * 0.65, ry * 0.65).fill({ color, alpha: alpha * 0.6 });
}

function rivets(g: Graphics, x0: number, y0: number, x1: number, y1: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    g.circle(x, y, 1.6).fill({ color: 0x2f373a });
    g.circle(x - 0.5, y - 0.6, 0.7).fill({ color: 0xd0d6d6, alpha: 0.7 });
  }
}

function streaks(g: Graphics, x0: number, x1: number, y: number, n: number, len: number): void {
  for (let i = 0; i < n; i++) {
    const sx = R(x0, x1);
    const sy = y + R(-2, 3);
    g.moveTo(sx, sy)
      .lineTo(sx + R(-1.2, 1.2), sy + R(len * 0.35, len))
      .stroke({ color: PAL.streak, width: R(0.8, 2), alpha: R(0.35, 0.65) });
  }
}

function scratches(g: Graphics, x0: number, y0: number, x1: number, y1: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const x = R(x0, x1);
    const y = R(y0, y1);
    const l = R(4, 12);
    const a = R(-0.5, 0.5);
    g.moveTo(x, y)
      .lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
      .stroke({ color: 0xd8dcd6, width: 0.7, alpha: R(0.2, 0.4) });
  }
}

function algaeLine(g: Graphics, x0: number, x1: number, y: number, n: number): void {
  for (let i = 0; i < n; i++) {
    dab(g, R(x0, x1), y + R(-4, 2), R(3, 9), R(1.5, 4), rand() < 0.6 ? PAL.algae : PAL.algaeLight, 0.75);
  }
  for (let i = 0; i < n * 0.6; i++) g.circle(R(x0, x1), y - R(0, 10), R(0.8, 2)).fill({ color: rand() < 0.5 ? 0xc8c0a8 : PAL.algae, alpha: 0.8 });
}

function stencil(text: string, x: number, y: number, size = 7, rot = 0): Text {
  const t = new Text({
    text,
    style: { fontFamily: 'Courier New, monospace', fontSize: size, fontWeight: 'bold', fill: 0x221e16, letterSpacing: 0.5 },
    resolution: 6,
  });
  t.anchor.set(0.5);
  t.position.set(x, y);
  t.rotation = rot;
  t.alpha = 0.62;
  return t;
}

/** A horizontal stretch of tube (corridor body or a short stub to a collar). */
function tubeH(g: Graphics, x0: number, x1: number, cy: number, ribs: number): void {
  const r = TUBE / 2;
  g.rect(x0, cy - r, x1 - x0, TUBE).fill({ color: PAL.steel });
  g.rect(x0, cy - r + 4, x1 - x0, 7).fill({ color: 0xffffff, alpha: 0.13 });
  g.rect(x0, cy + r - 16, x1 - x0, 16).fill({ color: PAL.steelDeep, alpha: 0.45 });
  g.rect(x0, cy - r, x1 - x0, 2).fill({ color: PAL.steelDark });
  g.rect(x0, cy + r - 2, x1 - x0, 2).fill({ color: PAL.steelDeep });
  for (let i = 0; i < ribs; i++) {
    const x = x0 + ((i + 0.5) / ribs) * (x1 - x0);
    g.rect(x - 3, cy - r - 2, 6, TUBE + 4).fill({ color: PAL.steelDark });
    g.rect(x - 3, cy - r - 2, 2, TUBE + 4).fill({ color: 0xffffff, alpha: 0.1 });
    rivets(g, x, cy - r + 6, x, cy + r - 6, 5);
  }
}

function tubeV(g: Graphics, y0: number, y1: number, cx: number, ribs: number): void {
  const r = TUBE / 2;
  g.rect(cx - r, y0, TUBE, y1 - y0).fill({ color: PAL.steel });
  g.rect(cx - r + 5, y0, 8, y1 - y0).fill({ color: 0xffffff, alpha: 0.13 });
  g.rect(cx + r - 18, y0, 18, y1 - y0).fill({ color: PAL.steelDeep, alpha: 0.45 });
  for (let i = 0; i < ribs; i++) {
    const y = y0 + ((i + 0.5) / ribs) * (y1 - y0);
    g.rect(cx - r - 2, y - 3, TUBE + 4, 6).fill({ color: PAL.steelDark });
    g.rect(cx - r - 2, y - 3, TUBE + 4, 2).fill({ color: 0xffffff, alpha: 0.1 });
    rivets(g, cx - r + 6, y, cx + r - 6, y, 5);
  }
}

/** A round window with a brass ring. Returns where its glass is, for the lit-window glow. */
function porthole(g: Graphics, x: number, y: number, r: number): void {
  g.circle(x, y, r + 4).fill({ color: PAL.brass });
  g.circle(x, y, r + 4).stroke({ color: 0x5a4a2a, width: 1 });
  g.circle(x, y, r).fill({ color: 0x1c2a2e });
  g.circle(x - r * 0.3, y - r * 0.35, r * 0.35).fill({ color: 0xffffff, alpha: 0.25 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.circle(x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2), 0.9).fill({ color: 0x3a3020 });
  }
}

/** Weathered paint band with faded hazard stripes. */
function hazardBand(g: Graphics, x: number, y: number, w: number, h: number): void {
  g.rect(x, y, w, h).fill({ color: PAL.yellow });
  for (let sx = x - h; sx < x + w; sx += 12) {
    const a = Math.max(x, sx);
    const b = Math.min(x + w, sx + 6);
    if (b <= a) continue;
    g.poly([a, y + h, Math.min(x + w, a + h), y, Math.min(x + w, b + h), y, b, y + h]).fill({ color: 0x2a2418, alpha: 0.55 });
  }
  g.rect(x, y, w, 1.5).fill({ color: 0xffffff, alpha: 0.18 });
  for (let i = 0; i < w / 10; i++) dab(g, R(x, x + w), R(y, y + h), R(2, 6), R(1, 2.5), PAL.steelDark, 0.5);
}

// ---------------------------------------------------------------------------
// The four pieces. Each draws in local space: (0,0) is the top-left of its
// footprint, (w,h) the bottom-right. `n` is its number for the stencil.
// ---------------------------------------------------------------------------

interface PieceArt {
  /** Lit art, behind the diver. */
  body: Container;
  /** Moving or switchable parts. */
  rotor?: Container;
  /** Shown only with power: lit windows (emissive) and their soft glow. */
  windows: Graphics;
  windowGlow: Graphics;
  /** Status lamp position (local). */
  lamp: { x: number; y: number };
  /** Dome glass sheen, drawn over the diver. */
  sheen?: Graphics;
  /** Storage fill gauge (redrawn as the pod fills). */
  gauge?: Graphics;
  gaugeBox?: { x: number; y: number; w: number; h: number };
}

function drawDome(n: number): PieceArt {
  const W = CELL * 2;
  const H = CELL * 2;
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const cx = W / 2;
  const drumTop = H - 100;
  const drumBot = H - 12;
  const rx = 98;
  const ry = 114;

  // Interior behind the glass: deck, console, bunk, a kelp jar, hanging lamp.
  const domePts: number[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * Math.PI;
    domePts.push(cx + Math.cos(t) * rx, drumTop - Math.sin(t) * ry);
  }
  g.poly(domePts).fill({ color: 0x24343a });
  g.rect(cx - rx + 8, drumTop - 6, rx * 2 - 16, 6).fill({ color: 0x4a4a40 });
  // Console with screens.
  g.roundRect(cx - 74, drumTop - 44, 46, 38, 3).fill({ color: 0x46514f });
  g.rect(cx - 70, drumTop - 40, 18, 12).fill({ color: 0x182226 });
  g.rect(cx - 48, drumTop - 40, 16, 12).fill({ color: 0x182226 });
  g.rect(cx - 72, drumTop - 22, 42, 3).fill({ color: PAL.yellowDark });
  // Chair.
  g.roundRect(cx - 24, drumTop - 30, 14, 18, 3).fill({ color: PAL.rustDark });
  g.rect(cx - 20, drumTop - 12, 3, 8).fill({ color: PAL.steelDark });
  // Bunk.
  g.roundRect(cx + 18, drumTop - 22, 60, 14, 3).fill({ color: 0x55605c });
  g.roundRect(cx + 20, drumTop - 28, 18, 8, 3).fill({ color: 0xc8c0a8, alpha: 0.7 });
  g.rect(cx + 18, drumTop - 54, 60, 4).fill({ color: PAL.steelDark });
  g.rect(cx + 74, drumTop - 54, 4, 40).fill({ color: PAL.steelDark });
  // Kelp jar on a shelf.
  g.roundRect(cx + 26, drumTop - 76, 14, 20, 3).fill({ color: 0x5f8a6a, alpha: 0.7 });
  g.moveTo(cx + 33, drumTop - 58).quadraticCurveTo(cx + 28, drumTop - 68, cx + 32, drumTop - 76).stroke({ color: PAL.algaeLight, width: 2 });
  // Hanging lamp.
  g.moveTo(cx, drumTop - ry + 10).lineTo(cx, drumTop - 78).stroke({ color: PAL.steelDark, width: 1.5 });
  g.poly([cx - 9, drumTop - 70, cx - 5, drumTop - 80, cx + 5, drumTop - 80, cx + 9, drumTop - 70]).fill({ color: PAL.steelDark });

  // Lit interior (only with power).
  windows.poly(domePts).fill({ color: PAL.warm, alpha: 0.13 });
  windows.ellipse(cx, drumTop - 66, 10, 4).fill({ color: 0xfff1d0, alpha: 0.95 });
  windows.rect(cx - 70, drumTop - 40, 18, 12).fill({ color: 0xffe2a8, alpha: 0.75 });
  windows.rect(cx - 48, drumTop - 40, 16, 12).fill({ color: 0xd8f0a0, alpha: 0.6 });
  windowGlow.ellipse(cx, drumTop - 50, 70, 46).fill({ color: PAL.warm, alpha: 0.28 });
  windowGlow.circle(cx, drumTop - 66, 16).fill({ color: 0xfff1d0, alpha: 0.7 });

  // Glass: a faint tint over the interior, then the steel frame.
  g.poly(domePts).fill({ color: PAL.glass, alpha: 0.22 });
  const meridian = (k: number) => {
    const pts: number[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = (i / 24) * (Math.PI / 2);
      pts.push(cx + k * rx * Math.cos(t), drumTop - Math.sin(t) * ry);
    }
    return pts;
  };
  for (const k of [-0.72, -0.36, 0, 0.36, 0.72]) {
    const p = meridian(k);
    g.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
    g.stroke({ color: PAL.steelDark, width: 3.2 });
    g.moveTo(p[0] - 1, p[1]);
    for (let i = 2; i < p.length; i += 2) g.lineTo(p[i] - 1, p[i + 1]);
    g.stroke({ color: 0xffffff, width: 0.8, alpha: 0.18 });
  }
  // Latitude ring (seen edge-on it is a straight band).
  for (const th of [0.62, 1.12]) {
    const y = drumTop - Math.cos(th) * ry;
    const hw = Math.sin(th) * rx;
    g.rect(cx - hw, y - 2, hw * 2, 4).fill({ color: PAL.steelDark });
    rivets(g, cx - hw + 4, y, cx + hw - 4, y, Math.round(hw / 12));
  }
  // Outer rim.
  g.moveTo(domePts[0], domePts[1]);
  for (let i = 2; i < domePts.length; i += 2) g.lineTo(domePts[i], domePts[i + 1]);
  g.stroke({ color: PAL.steelDark, width: 5 });
  g.moveTo(domePts[0], domePts[1]);
  for (let i = 2; i < domePts.length; i += 2) g.lineTo(domePts[i], domePts[i + 1]);
  g.stroke({ color: PAL.steelLight, width: 1.2, alpha: 0.35 });
  // Crown vent with the status lamp on top.
  g.roundRect(cx - 16, drumTop - ry - 10, 32, 14, 4).fill({ color: PAL.steel });
  g.rect(cx - 16, drumTop - ry - 10, 32, 3).fill({ color: 0xffffff, alpha: 0.15 });
  for (let i = 0; i < 4; i++) g.rect(cx - 12 + i * 7, drumTop - ry - 5, 3, 7).fill({ color: PAL.steelDeep });
  g.rect(cx - 2, drumTop - ry - 18, 4, 8).fill({ color: PAL.steelDark });
  g.circle(cx, drumTop - ry - 20, 4).fill({ color: 0x3a1a14 });
  algaeLine(g, cx - 20, cx + 20, drumTop - ry - 8, 8);

  // Drum: the steel ring the dome sits on.
  g.roundRect(8, drumTop - 6, W - 16, drumBot - drumTop + 6, 10).fill({ color: PAL.steel });
  g.roundRect(8, drumTop - 6, W - 16, 10, 5).fill({ color: PAL.steelDark });
  g.rect(12, drumTop + 6, W - 24, 6).fill({ color: 0xffffff, alpha: 0.12 });
  hazardBand(g, 8, drumTop + 18, W - 16, 10);
  g.rect(8, drumBot - 20, W - 16, 20).fill({ color: PAL.steelDeep, alpha: 0.4 });
  // Panel seams.
  for (const sx of [56, 112, 168]) g.rect(sx - 1, drumTop + 4, 2, drumBot - drumTop - 4).fill({ color: PAL.steelDark, alpha: 0.8 });
  rivets(g, 16, drumTop + 1, W - 16, drumTop + 1, 18);
  rivets(g, 16, drumBot - 5, W - 16, drumBot - 5, 18);
  for (const px of [32, 84, 140, 192]) porthole(g, px, drumTop + 50, 8);
  for (const px of [32, 84, 140, 192]) {
    windows.circle(px, drumTop + 50, 7).fill({ color: PAL.warm, alpha: 0.85 });
    windowGlow.circle(px, drumTop + 50, 14).fill({ color: PAL.warm, alpha: 0.5 });
  }
  body.addChild(stencil(`KESTREL  HAB-0${n}`, cx, drumTop + 34, 7));
  streaks(g, 14, W - 14, drumTop + 30, 14, 22);
  streaks(g, 14, W - 14, drumBot - 8, 10, 10);
  scratches(g, 12, drumTop + 8, W - 12, drumBot - 6, 22);
  algaeLine(g, 10, W - 10, drumBot, 40);
  // Underside skirt.
  g.roundRect(18, drumBot - 2, W - 36, 10, 3).fill({ color: PAL.steelDark });

  // Glass sheen, drawn over the diver: a broad soft highlight and a crisp streak.
  const sheen = new Graphics();
  const arc = (r0: number, a0: number, a1: number) => {
    const pts: number[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = a0 + ((a1 - a0) * i) / 16;
      pts.push(cx + Math.cos(t) * rx * r0, drumTop - Math.sin(t) * ry * r0);
    }
    return pts;
  };
  const a = arc(0.86, 2.2, 1.35);
  sheen.moveTo(a[0], a[1]);
  for (let i = 2; i < a.length; i += 2) sheen.lineTo(a[i], a[i + 1]);
  sheen.stroke({ color: 0xffffff, width: 7, alpha: 0.16, cap: 'round' });
  const b = arc(0.78, 2.5, 2.15);
  sheen.moveTo(b[0], b[1]);
  for (let i = 2; i < b.length; i += 2) sheen.lineTo(b[i], b[i + 1]);
  sheen.stroke({ color: 0xffffff, width: 2.5, alpha: 0.4, cap: 'round' });
  sheen.poly(domePts).fill({ color: PAL.glass, alpha: 0.12 });
  sheen.circle(cx + 50, drumTop - 70, 3).fill({ color: 0xffffff, alpha: 0.35 });

  return { body, windows, windowGlow, lamp: { x: cx, y: drumTop - ry - 20 }, sheen };
}

function drawCorridor(n: number, rot: number): PieceArt {
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const c = CELL / 2;
  if (rot % 2 === 0) {
    tubeH(g, 0, CELL, c, 4);
    g.rect(0, c - 6, CELL, 8).fill({ color: PAL.yellow, alpha: 0.85 });
    g.rect(0, c - 6, CELL, 1.5).fill({ color: 0xffffff, alpha: 0.15 });
    porthole(g, c, c + 12, 7);
    windows.circle(c, c + 12, 6).fill({ color: PAL.warm, alpha: 0.8 });
    windowGlow.circle(c, c + 12, 13).fill({ color: PAL.warm, alpha: 0.45 });
    body.addChild(stencil(`C-${String(n).padStart(2, '0')}`, c + 30, c - 14, 6));
    streaks(g, 4, CELL - 4, c + 2, 8, 18);
    scratches(g, 2, c - 28, CELL - 2, c + 28, 8);
    algaeLine(g, 0, CELL, c + TUBE / 2, 14);
  } else {
    tubeV(g, 0, CELL, c, 4);
    g.rect(c - 6, 0, 8, CELL).fill({ color: PAL.yellow, alpha: 0.85 });
    porthole(g, c + 12, c, 7);
    windows.circle(c + 12, c, 6).fill({ color: PAL.warm, alpha: 0.8 });
    windowGlow.circle(c + 12, c, 13).fill({ color: PAL.warm, alpha: 0.45 });
    body.addChild(stencil(`C-${String(n).padStart(2, '0')}`, c - 14, c + 30, 6, -Math.PI / 2));
    streaks(g, c - 26, c + 26, 8, 6, 30);
    algaeLine(g, c - 28, c + 28, CELL - 4, 8);
  }
  return { body, windows, windowGlow, lamp: rot % 2 === 0 ? { x: c - 30, y: c - 16 } : { x: c - 16, y: c - 30 } };
}

function drawTurbine(n: number): PieceArt {
  const W = CELL;
  const H = CELL * 2;
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const cx = W / 2;
  const hubY = CELL / 2;
  const houseTop = H - 100;
  const houseBot = H - 10;

  // Collar stubs through the machine house.
  tubeH(g, 0, 16, H - CELL / 2, 1);
  tubeH(g, W - 16, W, H - CELL / 2, 1);
  // Mast.
  g.rect(cx - 7, hubY, 14, houseTop - hubY + 4).fill({ color: PAL.steel });
  g.rect(cx - 7, hubY, 4, houseTop - hubY + 4).fill({ color: 0xffffff, alpha: 0.12 });
  g.rect(cx + 3, hubY, 4, houseTop - hubY + 4).fill({ color: PAL.steelDeep, alpha: 0.5 });
  rivets(g, cx, hubY + 60, cx, houseTop - 4, 5);
  streaks(g, cx - 6, cx + 6, hubY + 60, 3, 30);
  // Copper power cable spiralling down the mast.
  g.moveTo(cx + 7, hubY + 54);
  for (let y = hubY + 54; y < houseTop; y += 6) g.lineTo(cx + (Math.sin(y * 0.25) > 0 ? 8 : 6), y);
  g.stroke({ color: 0xb06a3a, width: 2.2 });
  // Duct ring around the rotor.
  g.circle(cx, hubY, 50).stroke({ color: PAL.steelDark, width: 8 });
  g.circle(cx, hubY, 50).stroke({ color: PAL.yellow, width: 3, alpha: 0.75 });
  g.circle(cx, hubY, 54).stroke({ color: PAL.steelDeep, width: 1.2, alpha: 0.6 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.circle(cx + Math.cos(a) * 50, hubY + Math.sin(a) * 50, 1.3).fill({ color: 0x2f373a });
  }
  // Duct struts.
  for (const a of [Math.PI * 0.5, Math.PI * 0.17, Math.PI * 0.83]) {
    g.moveTo(cx + Math.cos(a) * 14, hubY + Math.sin(a) * 14)
      .lineTo(cx + Math.cos(a) * 48, hubY + Math.sin(a) * 48)
      .stroke({ color: PAL.steelDark, width: 3 });
  }
  algaeLine(g, cx - 40, cx + 40, hubY + 50, 10);
  for (let i = 0; i < 10; i++) {
    const a = R(Math.PI * 0.1, Math.PI * 0.9);
    g.circle(cx + Math.cos(a) * 52, hubY + Math.sin(a) * 52, R(1, 2.4)).fill({ color: PAL.algae, alpha: 0.8 });
  }

  // Rotor: three blades face-on, spinning in the current.
  const rotor = new Container();
  const rg = rotor.addChild(new Graphics());
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const P = (u: number, v: number): [number, number] => [ca * u - sa * v, sa * u + ca * v];
    const pts = [P(8, -5), P(26, -9), P(44, -5), P(46, 0), P(42, 4), P(20, 6), P(8, 5)].flat();
    rg.poly(pts).fill({ color: PAL.yellow });
    rg.poly([P(8, 1), P(44, 0), P(42, 4), P(20, 6), P(8, 5)].flat()).fill({ color: PAL.yellowDark, alpha: 0.6 });
    rg.poly([P(38, -6), P(44, -5), P(46, 0), P(42, 4), P(38, 4)].flat()).fill({ color: PAL.rust, alpha: 0.85 });
    const [ux, uy] = P(24, -4);
    rg.circle(ux, uy, 2).fill({ color: PAL.streak, alpha: 0.5 });
  }
  rg.circle(0, 0, 11).fill({ color: PAL.steel });
  rg.circle(0, 0, 11).stroke({ color: PAL.steelDark, width: 2 });
  rg.circle(-3, -3, 4).fill({ color: 0xffffff, alpha: 0.2 });
  rg.circle(0, 0, 3).fill({ color: PAL.steelDeep });
  rotor.position.set(cx, hubY);
  body.addChild(rotor);

  // Machine house.
  g.roundRect(12, houseTop, W - 24, houseBot - houseTop, 6).fill({ color: PAL.yellow });
  g.roundRect(12, houseTop, W - 24, 7, 3).fill({ color: 0xffffff, alpha: 0.16 });
  g.rect(12, houseBot - 18, W - 24, 18).fill({ color: PAL.yellowDark, alpha: 0.65 });
  for (let i = 0; i < 7; i++) g.rect(20 + i * 5, houseTop + 14, 2.5, 34).fill({ color: PAL.steelDeep, alpha: 0.55 });
  g.roundRect(60, houseTop + 14, 30, 22, 2).fill({ color: PAL.steelDark });
  g.rect(63, houseTop + 17, 24, 6).fill({ color: 0x1c2226 });
  rivets(g, 18, houseTop + 4, W - 18, houseTop + 4, 8);
  rivets(g, 18, houseBot - 5, W - 18, houseBot - 5, 8);
  for (let i = 0; i < 26; i++) dab(g, R(14, W - 14), R(houseTop + 4, houseBot - 4), R(2, 7), R(1, 3), PAL.steelDark, 0.45);
  body.addChild(stencil(`CT-${n}`, 75, houseTop + 52, 7));
  body.addChild(stencil('▲ CURRENT', 52, houseTop + 66, 5));
  streaks(g, 16, W - 16, houseTop + 8, 10, 26);
  scratches(g, 14, houseTop + 4, W - 14, houseBot - 4, 12);
  algaeLine(g, 12, W - 12, houseBot, 18);
  windows.rect(63, houseTop + 17, 24, 6).fill({ color: 0xd8f0a0, alpha: 0.75 });
  windowGlow.rect(60, houseTop + 13, 30, 14).fill({ color: 0xd8f0a0, alpha: 0.3 });

  return { body, rotor, windows, windowGlow, lamp: { x: 76, y: houseTop - 2 } };
}

function drawStorage(n: number): PieceArt {
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const c = CELL / 2;
  // Stubs to the four collars.
  tubeH(g, 0, 22, c, 1);
  tubeH(g, CELL - 22, CELL, c, 1);
  tubeV(g, 0, 16, c, 1);
  tubeV(g, CELL - 14, CELL, c, 1);
  // The pod: an upright capsule.
  g.roundRect(18, 10, CELL - 36, CELL - 20, 24).fill({ color: PAL.steel });
  g.roundRect(24, 14, 10, CELL - 30, 5).fill({ color: 0xffffff, alpha: 0.12 });
  g.roundRect(CELL - 38, 14, 16, CELL - 30, 8).fill({ color: PAL.steelDeep, alpha: 0.4 });
  hazardBand(g, 18, 26, CELL - 36, 9);
  g.rect(18, CELL - 32, CELL - 36, 3).fill({ color: PAL.steelDark });
  rivets(g, 26, 40, CELL - 26, 40, 6);
  rivets(g, 26, CELL - 26, CELL - 26, CELL - 26, 6);
  // Hatch with a wheel.
  g.roundRect(30, 46, 30, 32, 4).fill({ color: PAL.steelDark });
  g.roundRect(32, 48, 26, 28, 3).fill({ color: PAL.steel });
  g.circle(45, 62, 8).stroke({ color: PAL.rust, width: 2.4 });
  g.moveTo(37, 62).lineTo(53, 62).moveTo(45, 54).lineTo(45, 70).stroke({ color: PAL.rust, width: 1.8 });
  g.circle(45, 62, 2.2).fill({ color: PAL.rustDark });
  // Fill gauge slot.
  const gaugeBox = { x: 68, y: 46, w: 8, h: 32 };
  g.roundRect(gaugeBox.x - 2, gaugeBox.y - 2, gaugeBox.w + 4, gaugeBox.h + 4, 2).fill({ color: PAL.brass });
  g.rect(gaugeBox.x, gaugeBox.y, gaugeBox.w, gaugeBox.h).fill({ color: 0x182024 });
  const gauge = new Graphics();
  body.addChild(stencil(`STORE 0${n}`, c, 20, 6));
  streaks(g, 22, CELL - 22, 36, 10, 20);
  scratches(g, 20, 14, CELL - 20, CELL - 14, 10);
  algaeLine(g, 22, CELL - 22, CELL - 12, 18);
  return { body, windows, windowGlow, lamp: { x: c, y: 8 }, gauge, gaugeBox };
}

/** Draw a piece's art. The same drawing is used for placed pieces and the build ghost. */
export function drawPiece(kind: PieceKind, n: number, rot: number, seed: number): PieceArt {
  rand = mulberry32(WORLD_SEED ^ (seed * 7919 + 0x1b5e));
  if (kind === 'dome') return drawDome(n);
  if (kind === 'corridor') return drawCorridor(n, rot);
  if (kind === 'turbine') return drawTurbine(n);
  return drawStorage(n);
}

/**
 * A collar flange at a cell edge. Joined collars are bolted flanges; open
 * ones carry a rust-red blanking cap with a hand wheel.
 */
function drawCollar(g: Graphics, c: Collar, joined: boolean): void {
  const p = collarPoint(c);
  const horiz = p.dx !== 0;
  const fw = 12;
  const fh = FLANGE;
  const out = horiz ? p.dx : p.dy;
  // Flange plate, centred on the cell edge but sitting inside this piece.
  const fx = horiz ? p.x - (out > 0 ? fw : 0) : p.x - fh / 2;
  const fy = horiz ? p.y - fh / 2 : p.y - (out > 0 ? fw : 0);
  const w = horiz ? fw : fh;
  const h = horiz ? fh : fw;
  g.roundRect(fx, fy, w, h, 3).fill({ color: PAL.steelDark });
  g.roundRect(fx + 1, fy + 1, horiz ? 3 : w - 2, horiz ? h - 2 : 3, 1).fill({ color: 0xffffff, alpha: 0.14 });
  for (let i = 0; i < 5; i++) {
    const t = (i + 0.5) / 5;
    const bx = horiz ? fx + fw / 2 : fx + w * t;
    const by = horiz ? fy + h * t : fy + fw / 2;
    g.circle(bx, by, 2).fill({ color: 0x2a3033 });
    g.circle(bx - 0.6, by - 0.6, 0.8).fill({ color: 0xc8d0d0, alpha: 0.6 });
  }
  if (!joined) {
    // Blanking cap bulging out of the collar.
    const capW = 9;
    const cx = horiz ? (out > 0 ? p.x : p.x - capW) : p.x - (fh - 16) / 2;
    const cy = horiz ? p.y - (fh - 16) / 2 : out > 0 ? p.y : p.y - capW;
    g.roundRect(cx, cy, horiz ? capW : fh - 16, horiz ? fh - 16 : capW, 4).fill({ color: PAL.rust });
    g.roundRect(cx, cy, horiz ? 3 : fh - 16, horiz ? fh - 16 : 3, 2).fill({ color: 0xffffff, alpha: 0.15 });
    g.circle(horiz ? cx + capW / 2 : p.x, horiz ? p.y : cy + capW / 2, 4).stroke({ color: PAL.rustDark, width: 1.6 });
  }
}

interface Live {
  placed: Placed;
  art: PieceArt;
  root: Container;
  lampG: Graphics;
  lampHalo: Graphics;
  light: PointLight | null;
  /** 0..1 while being assembled after placing. */
  build: number;
  phase: number;
  powered: boolean;
  fill: number;
  /** While the piece is still a frame being welded by the drone. */
  frame: { mask: Graphics; scaffold: Graphics; seam: Graphics; seamGlow: Graphics; shown: number } | null;
}

/** A steel scaffold drawn over a frame until the drone finishes welding it. */
function drawScaffold(w: number, h: number): Graphics {
  const g = new Graphics();
  const col = 0x9aa3a5;
  const posts: number[] = [];
  for (let x = 6; x <= w - 6; x += CELL / 2) posts.push(x);
  if (posts[posts.length - 1] < w - 12) posts.push(w - 6);
  for (const x of posts) g.rect(x - 2, 0, 4, h).fill({ color: col, alpha: 0.8 });
  for (let y = 4; y <= h; y += CELL / 2) g.rect(0, Math.min(h - 4, y) - 1.5, w, 3).fill({ color: col, alpha: 0.8 });
  for (let i = 0; i < posts.length - 1; i++)
    for (let y = 4; y < h - 8; y += CELL / 2) {
      const y1 = Math.min(h - 4, y + CELL / 2);
      g.moveTo(posts[i], y).lineTo(posts[i + 1], y1);
    }
  g.stroke({ color: col, width: 1.6, alpha: 0.6 });
  for (const x of posts) for (let y = 4; y <= h; y += CELL / 2) g.circle(x, Math.min(h - 4, y), 2.2).fill({ color: 0x3b4448 });
  return g;
}

interface Spark {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

/** The base as seen in the world. */
export class BaseView {
  readonly view = new Container();
  readonly front = new Container();
  readonly emissive = new Container();
  readonly glow = new Container();
  readonly lights: PointLight[] = [];

  private legs = new Graphics();
  private collarG = new Graphics();
  private pieceLayer = new Container();
  private live = new Map<number, Live>();
  private sparks: Spark[] = [];

  constructor() {
    this.view.addChild(this.legs, this.pieceLayer, this.collarG);
  }

  /** Bring the drawing in line with the layout. `fresh` ids get the assembly animation. */
  sync(layout: BaseLayout, fresh: number[] = []): void {
    const ids = new Set(layout.pieces.map((p) => p.id));
    for (const [id, l] of this.live) {
      if (ids.has(id)) continue;
      l.root.destroy({ children: true });
      l.art.windows.destroy();
      l.art.windowGlow.destroy();
      l.art.sheen?.destroy();
      l.lampG.destroy();
      l.lampHalo.destroy();
      l.frame?.seam.destroy();
      l.frame?.seamGlow.destroy();
      this.live.delete(id);
    }
    const counts: Record<PieceKind, number> = { dome: 0, corridor: 0, turbine: 0, storage: 0 };
    for (const p of [...layout.pieces].sort((a, b) => a.id - b.id)) {
      counts[p.kind]++;
      if (this.live.has(p.id)) continue;
      const art = drawPiece(p.kind, counts[p.kind], p.rot, p.id);
      const r = pieceRect(p);
      const root = new Container();
      root.addChild(art.body);
      if (art.gauge) root.addChild(art.gauge);
      root.position.set(r.x, r.y);
      this.pieceLayer.addChild(root);
      art.windows.position.set(r.x, r.y);
      art.windowGlow.position.set(r.x, r.y);
      this.emissive.addChild(art.windows);
      this.glow.addChild(art.windowGlow);
      if (art.sheen) {
        art.sheen.position.set(r.x, r.y);
        this.front.addChild(art.sheen);
      }
      const lampG = new Graphics().circle(0, 0, 3).fill({ color: 0xffffff });
      const lampHalo = new Graphics().circle(0, 0, 12).fill({ color: 0xffffff, alpha: 0.6 });
      lampG.position.set(r.x + art.lamp.x, r.y + art.lamp.y);
      lampHalo.position.copyFrom(lampG.position);
      this.emissive.addChild(lampG);
      this.glow.addChild(lampHalo);
      const light: PointLight | null =
        p.kind === 'dome' ? { x: r.x + r.w / 2, y: r.y + r.h - 130, radius: 330, intensity: 0, color: [1, 0.86, 0.66] } : null;
      const isFresh = fresh.includes(p.id);
      let frame: Live['frame'] = null;
      if (!isDone(p)) {
        // A frame: the finished hull shows from the bottom up as the drone welds it.
        const mask = new Graphics();
        const scaffold = drawScaffold(r.w, r.h);
        root.addChild(mask, scaffold);
        art.body.mask = mask;
        if (art.gauge) art.gauge.visible = false;
        if (art.sheen) art.sheen.visible = false;
        const seam = new Graphics();
        const seamGlow = new Graphics();
        this.emissive.addChild(seam);
        this.glow.addChild(seamGlow);
        frame = { mask, scaffold, seam, seamGlow, shown: -1 };
      }
      this.live.set(p.id, { placed: p, art, root, lampG, lampHalo, light, build: isFresh ? 0 : 1, phase: rand() * 10, powered: false, fill: -1, frame });
      if (isFresh) this.burst(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
    }
    this.lights.length = 0;
    for (const l of this.live.values()) if (l.light) this.lights.push(l.light);
    this.drawJoins(layout);
  }

  /** Legs down to the sand, and the collar flanges (which depend on the neighbours). */
  private drawJoins(layout: BaseLayout): void {
    const g = this.legs;
    g.clear();
    rand = mulberry32(WORLD_SEED ^ 0x1e95);
    for (const p of layout.pieces) {
      const s = shapeOf(p);
      const r = pieceRect(p);
      for (let i = 0; i < s.w; i++) {
        const gx = p.gx + i;
        if (p.gy > 0 && layout.pieceAt(gx, p.gy - 1)) continue;
        // Down to the first piece below, or to the sand.
        let below = p.gy - 1;
        while (below >= 0 && !layout.pieceAt(gx, below)) below--;
        const x0 = r.x + i * CELL;
        for (const lx of [x0 + 22, x0 + CELL - 22]) {
          const top = r.y + r.h - (p.kind === 'corridor' && p.rot % 2 === 0 ? CELL / 2 - TUBE / 2 + 2 : 14);
          const bot = below >= 0 ? GRID_BASE - (below + 1) * CELL : groundY(Math.max(0, Math.min(WORLD_W, lx))) + 6;
          if (bot - top < 4) continue;
          g.rect(lx - 4, top, 8, bot - top).fill({ color: PAL.steelDark });
          g.rect(lx - 4, top, 2.5, bot - top).fill({ color: 0xffffff, alpha: 0.1 });
          for (let y = top + 14; y < bot - 6; y += 22) g.circle(lx, y, 1.3).fill({ color: 0x2a3033 });
          if (below < 0) {
            g.roundRect(lx - 11, bot - 6, 22, 7, 2).fill({ color: PAL.steel });
            dab(g, lx, bot + 1, 16, 4, PAL.sand, 0.8);
          }
          streaks(g, lx - 3, lx + 3, top + 4, 2, 24);
          if (bot - top > 30) algaeLine(g, lx - 5, lx + 5, bot - 4, 4);
        }
        // Cross bracing between the two legs.
        const top = r.y + r.h - 10;
        const bot = below >= 0 ? GRID_BASE - (below + 1) * CELL : Math.min(groundY(x0 + 22), groundY(x0 + CELL - 22));
        if (bot - top > 34) {
          g.moveTo(x0 + 22, top + 6).lineTo(x0 + CELL - 22, bot - 6).moveTo(x0 + CELL - 22, top + 6).lineTo(x0 + 22, bot - 6);
          g.stroke({ color: PAL.steelDark, width: 3, alpha: 0.9 });
        }
      }
    }
    const c = this.collarG;
    c.clear();
    for (const p of layout.pieces)
      for (const k of collarsOf(p)) {
        // A collar facing down into the seabed is sealed flush: nothing can join there.
        if (k.dir === 'D' && k.gy === 0) continue;
        drawCollar(c, k, layout.isJoined(k));
      }
  }

  /** Welding sparks around a newly placed piece. */
  private burst(x: number, y: number, w: number, h: number, count = 46): void {
    for (let i = 0; i < count; i++) {
      const g = new Graphics().circle(0, 0, R(0.8, 1.8)).fill({ color: rand() < 0.5 ? 0xfff1d0 : 0xffc070 });
      const a = rand() * Math.PI * 2;
      const sp = R(40, 160);
      const sx = x + R(-w / 2, w / 2);
      const sy = y + R(-h / 2, h / 2);
      this.emissive.addChild(g);
      this.sparks.push({ g, x: sx, y: sy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: R(0.4, 1.1) });
    }
  }

  /** Finish a frame: drop the scaffold and show the whole piece. */
  private finishFrame(l: Live): void {
    const f = l.frame;
    if (!f) return;
    l.art.body.mask = null;
    f.mask.destroy();
    f.scaffold.destroy();
    f.seam.destroy();
    f.seamGlow.destroy();
    if (l.art.gauge) l.art.gauge.visible = true;
    if (l.art.sheen) l.art.sheen.visible = true;
    l.frame = null;
    l.fill = -1;
    const r = pieceRect(l.placed);
    this.burst(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, 60);
  }

  /** weldId: the frame the drone is welding right now (its seam glows). */
  update(dt: number, time: number, layout: BaseLayout, storedFrac: number, viewX0: number, viewX1: number, weldId: number | null = null): void {
    const visible = viewX1 > GRID_X0 - 300 && viewX0 < GRID_X0 + GRID_COLS * CELL + 300;
    this.view.visible = this.front.visible = visible;
    for (const l of this.live.values()) {
      const powered = layout.powered.has(l.placed.id);
      l.powered = powered;
      const r = pieceRect(l.placed);
      if (l.build < 1) {
        l.build = Math.min(1, l.build + dt / 0.9);
        const e = 1 - Math.pow(1 - l.build, 3);
        l.root.alpha = e;
        l.root.y = r.y - (1 - e) * 26;
        if (rand() < dt * 20) this.burst(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h * 0.6, 3);
      } else {
        l.root.alpha = 1;
        l.root.y = r.y;
      }
      if (l.frame) {
        if (isDone(l.placed)) this.finishFrame(l);
        else {
          const f = l.frame;
          const prog = l.placed.progress ?? 0;
          if (Math.abs(prog - f.shown) > 0.002) {
            f.shown = prog;
            f.mask.clear().rect(-20, r.h * (1 - prog), r.w + 40, r.h * prog + 60).fill({ color: 0xffffff });
          }
          // A hot seam line along the top of the welded part while the drone works on it.
          const hot = weldId === l.placed.id;
          f.seam.clear();
          f.seamGlow.clear();
          if (hot && prog > 0.003) {
            const y = r.y + r.h * (1 - prog);
            const flick = 0.7 + 0.3 * Math.sin(time * 37 + l.phase);
            f.seam.rect(r.x + 4, y - 1, r.w - 8, 2).fill({ color: 0xffd090, alpha: 0.9 * flick });
            f.seamGlow.rect(r.x, y - 4, r.w, 8).fill({ color: 0xffb060, alpha: 0.5 * flick });
          }
        }
      }
      const on = powered && l.build >= 1 ? 1 : 0;
      const flick = on ? 0.9 + 0.1 * Math.sin(time * 7 + l.phase) * Math.sin(time * 3.1 + l.phase) : 0;
      l.art.windows.alpha = flick * l.root.alpha;
      l.art.windowGlow.alpha = flick * l.root.alpha;
      if (l.light) l.light.intensity = 0.95 * flick;
      // Status lamp: steady pale green with power, a slow red blink without,
      // and a slow amber pulse while it is still a frame.
      const blink = l.frame ? 0.35 + 0.35 * Math.sin(time * 2 + l.phase) : powered ? 1 : (time + l.phase) % 1.6 < 0.25 ? 1 : 0.12;
      l.lampG.tint = l.frame ? 0xffb040 : powered ? PAL.lampOn : PAL.lampOff;
      l.lampHalo.tint = l.lampG.tint;
      l.lampG.alpha = blink * l.root.alpha;
      l.lampHalo.alpha = blink * 0.7 * l.root.alpha;
      if (l.art.rotor) l.art.rotor.rotation = time * 1.6 + Math.sin(time * 0.4 + l.phase) * 0.4 + l.phase;
      if (l.art.gauge && l.art.gaugeBox && Math.abs(l.fill - storedFrac) > 0.001) {
        l.fill = storedFrac;
        const b = l.art.gaugeBox;
        const h = b.h * storedFrac;
        l.art.gauge.clear();
        if (h > 0.5) l.art.gauge.rect(b.x, b.y + b.h - h, b.w, h).fill({ color: 0xc9a24a });
      }
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      if (s.life <= 0) {
        s.g.destroy();
        this.sparks.splice(i, 1);
        continue;
      }
      s.vy += 120 * dt;
      s.vx *= 1 - dt * 2;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.g.position.set(s.x, s.y);
      s.g.alpha = Math.min(1, s.life * 2);
    }
  }
}

/** Storage capacity of the whole base. */
export function storageCapacity(layout: BaseLayout): number {
  return layout.countDone('storage') * STORAGE_PER_POD;
}

// ---------------------------------------------------------------------------
// Build mode overlay: grid, open collar markers, the ghost piece and selection.
// Drawn unlit on top of everything, in world space.
// ---------------------------------------------------------------------------

export class BuildOverlay {
  readonly view = new Container();
  private grid = new Graphics();
  private marks = new Graphics();
  private ghostRoot = new Container();
  private ghostOutline = new Graphics();
  private select = new Graphics();
  private ghostKey = '';

  constructor() {
    this.view.addChild(this.grid, this.ghostRoot, this.ghostOutline, this.marks, this.select);
    this.view.visible = false;
  }

  update(
    time: number,
    layout: BaseLayout,
    ghost: { kind: PieceKind; gx: number; gy: number; rot: number; ok: boolean } | null,
    selected: Placed | null,
  ): void {
    // Faint cell corners over free cells.
    const g = this.grid;
    g.clear();
    for (let gx = 0; gx <= GRID_COLS; gx++)
      for (let gy = 0; gy <= GRID_ROWS; gy++) {
        const x = GRID_X0 + gx * CELL;
        const y = GRID_BASE - gy * CELL;
        g.moveTo(x - 6, y).lineTo(x + 6, y).moveTo(x, y - 6).lineTo(x, y + 6);
      }
    g.stroke({ color: 0xfff1d0, width: 1.5, alpha: 0.35 });
    g.rect(GRID_X0, GRID_BASE - GRID_ROWS * CELL, GRID_COLS * CELL, GRID_ROWS * CELL).stroke({ color: 0xfff1d0, width: 1, alpha: 0.18 });

    // Open collars pulse, so it is clear where the next piece can join.
    const m = this.marks;
    m.clear();
    const pulse = 0.55 + 0.45 * Math.sin(time * 4);
    for (const c of layout.openCollars()) {
      const p = collarPoint(c);
      const s = 9 + pulse * 3;
      const ox = p.x + p.dx * 18;
      const oy = p.y + p.dy * 18;
      // A chevron pointing outwards.
      const px = -p.dy;
      const py = p.dx;
      m.moveTo(ox - p.dx * s + px * s, oy - p.dy * s + py * s)
        .lineTo(ox, oy)
        .lineTo(ox - p.dx * s - px * s, oy - p.dy * s - py * s)
        .stroke({ color: 0xffc070, width: 3, alpha: 0.5 + pulse * 0.5, cap: 'round', join: 'round' });
    }

    // Ghost piece.
    const key = ghost ? `${ghost.kind}|${ghost.rot}` : '';
    if (key !== this.ghostKey) {
      this.ghostKey = key;
      this.ghostRoot.removeChildren().forEach((c) => c.destroy({ children: true }));
      if (ghost) {
        const art = drawPiece(ghost.kind, 0, ghost.rot, 99);
        this.ghostRoot.addChild(art.body);
        art.windows.destroy();
        art.windowGlow.destroy();
        art.sheen?.destroy();
        const cg = new Graphics();
        for (const c of shapeOf(ghost).collars) {
          drawCollar(cg, { gx: c.cx, gy: c.cy, dir: c.dir }, true);
        }
        // Collars were drawn at grid-relative cells; shift them to local space.
        cg.position.set(-GRID_X0, -(GRID_BASE - shapeOf(ghost).h * CELL));
        this.ghostRoot.addChild(cg);
      }
    }
    const o = this.ghostOutline;
    o.clear();
    if (ghost) {
      const r = pieceRect(ghost);
      this.ghostRoot.visible = true;
      this.ghostRoot.position.set(r.x, r.y);
      this.ghostRoot.alpha = 0.5 + 0.1 * Math.sin(time * 5);
      const col = ghost.ok ? 0xd8e6a0 : 0xe05a40;
      o.roundRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 8).fill({ color: col, alpha: 0.1 });
      o.roundRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 8).stroke({ color: col, width: 2.5, alpha: 0.9 });
      // Light up the collars that would join.
      for (const c of collarsOf(ghost)) {
        const p = collarPoint(c);
        const step = { L: [-1, 0], R: [1, 0], U: [0, 1], D: [0, -1] }[c.dir];
        const nb = layout.pieceAt(c.gx + step[0], c.gy + step[1]);
        const joins = nb && collarsOf(nb).some((k) => k.gx === c.gx + step[0] && k.gy === c.gy + step[1] && layout.collarPartner(k) === undefined && k.dir === ({ L: 'R', R: 'L', U: 'D', D: 'U' } as const)[c.dir]);
        if (joins) o.circle(p.x, p.y, 12 + 3 * Math.sin(time * 8)).stroke({ color: 0xd8e6a0, width: 3 });
      }
    } else this.ghostRoot.visible = false;

    const s = this.select;
    s.clear();
    if (selected && !ghost) {
      const r = pieceRect(selected);
      const dash = 10;
      const per = 2 * (r.w + r.h) + 24;
      const off = (time * 30) % (dash * 2);
      // Marching-ants outline.
      const pt = (d: number): [number, number] => {
        d = ((d % per) + per) % per;
        const x0 = r.x - 6;
        const y0 = r.y - 6;
        const w = r.w + 12;
        const h = r.h + 12;
        if (d < w) return [x0 + d, y0];
        if (d < w + h) return [x0 + w, y0 + d - w];
        if (d < 2 * w + h) return [x0 + w - (d - w - h), y0 + h];
        return [x0, y0 + h - (d - 2 * w - h)];
      };
      for (let d = off; d < per + off; d += dash * 2) {
        const [ax, ay] = pt(d);
        const [bx, by] = pt(d + dash * 0.5);
        const [cx, cy] = pt(d + dash);
        s.moveTo(ax, ay).lineTo(bx, by).lineTo(cx, cy);
      }
      s.stroke({ color: 0xffc070, width: 2.5 });
    }
  }
}
