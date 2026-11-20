import { Container, FillGradient, Graphics, Text } from 'pixi.js';
import { MATERIAL_ORDER } from '../game/state';
import { mulberry32, WORLD_SEED } from '../rng';
import { groundY, WORLD_W, WORLD_X0 } from './terrain';
import { drawHabitatFrame, drawObservationCrown, drawPressureRib } from './habitatFrame';
import { drawDockBrace, POOL_HALF_WIDTH, POOL_LADDER_X, POOL_SURFACE_Y } from './moonpool';
import {
  BaseLayout,
  CELL,
  cellOpen,
  Collar,
  collarPoint,
  collarsOf,
  GRID_BASE,
  GRID_COLS,
  GRID_ROWS,
  GRID_X0,
  isDone,
  onSeabed,
  PieceKind,
  pieceRect,
  Placed,
  shapeOf,
  STORAGE_PER_POD,
  SORT_BAY,
} from '../game/base';
import type { PointLight } from './scenery';
import { WhorlArt } from './whorl';

/** Live machine readings for drawing (milestone 5). */
export interface PieceReadings {
  /** Echo whorls fitted to a piece. */
  whorls(id: number): number;
  /** An auto feeder's hopper and mash levels (0..1) and whether it is pressing. */
  feeder(id: number): { hopper: number; mash: number; run: boolean } | null;
  /** A plate press (milestone 5 part 2): hopper levels (0..1), plates on the rack, stroke progress, seconds since the last plate. */
  press(id: number): { scrap: number; copper: number; plates: number; progress: number; since: number; run: boolean } | null;
  /** A Lab or Workshop (milestone 7): is it working on a job? */
  station?(id: number): boolean;
}

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

/**
 * After the Corvina on foot, Colin's new base kit (docs/art/kit2): charcoal
 * hull, chrome joints and flanges, neon lime glass, a gold power line and one
 * red lamp. No yellow plate, no hazard stripes. The old names are kept so
 * every piece picks up the new look: "yellow" is now the darker hull panel.
 */
const PAL = {
  steel: 0x2c3236,
  steelLight: 0xb8c4ca,
  steelDark: 0x1b1f22,
  steelDeep: 0x0f1214,
  yellow: 0x383f44,
  yellowDark: 0x24292c,
  // Red is kept for the one status lamp; old red trim becomes dark chrome.
  rust: 0x4a545a,
  rustDark: 0x2a3034,
  streak: 0x0c0e10,
  algae: 0x5e7a3c,
  algaeLight: 0x8aa154,
  glass: 0xc6f03a,
  brass: 0xa4b0b7,
  sand: 0xb7a47a,
  warm: 0xe4ffa8,
  lampOn: 0xc6f03a,
  lampOff: 0xff4a3a,
  chrome: 0xa4b0b7,
  chromeHi: 0xe6eef2,
  gold: 0xc9a13a,
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
    style: { fontFamily: 'Courier New, monospace', fontSize: size, fontWeight: 'bold', fill: 0xc8d0d4, letterSpacing: 0.5 },
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
  g.circle(x, y, r).fill({ color: 0x1a2a14 });
  g.circle(x - r * 0.3, y - r * 0.35, r * 0.35).fill({ color: 0xffffff, alpha: 0.25 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.circle(x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2), 0.9).fill({ color: 0x3a4248 });
  }
}

/** Weathered paint band with faded hazard stripes. */
/** A dark panel band with gold circuit traces (replaces the old yellow hazard band). */
function hazardBand(g: Graphics, x: number, y: number, w: number, h: number): void {
  g.rect(x, y, w, h).fill({ color: PAL.yellowDark });
  goldTraces(g, x + 4, y + h / 2, w - 8, Math.max(3, h * 0.45));
  g.rect(x, y, w, 1).fill({ color: PAL.chrome, alpha: 0.35 });
}

/** Gold power lines etched across a panel: right-angled runs with round nodes. */
function goldTraces(g: Graphics, x0: number, cy: number, w: number, amp: number): void {
  let x = x0;
  let y = cy;
  g.moveTo(x, y);
  while (x < x0 + w - 10) {
    x = Math.min(x0 + w, x + R(10, 26));
    g.lineTo(x, y);
    y = cy + (rand() < 0.5 ? -amp : amp) * R(0.3, 1);
    g.lineTo(x + 4, y);
    x += 4;
  }
  g.stroke({ color: PAL.gold, width: 1, alpha: 0.85 });
  for (let i = 0; i < w / 40; i++) g.circle(R(x0, x0 + w), cy + R(-amp, amp), 1.2).fill({ color: PAL.gold });
}

/** A chrome flange ring round a tube end (the concept's thick chrome collars). */
function flangeV(g: Graphics, x: number, cy: number, h: number, w = 10): void {
  g.roundRect(x - w / 2, cy - h / 2, w, h, 3).fill({ color: PAL.chrome });
  g.roundRect(x - w / 2 + 1.5, cy - h / 2 + 2, 2.5, h - 4, 1).fill({ color: PAL.chromeHi, alpha: 0.8 });
  g.roundRect(x + w / 2 - 3, cy - h / 2 + 2, 2, h - 4, 1).fill({ color: PAL.steelDark, alpha: 0.6 });
  for (let k = 0; k < 4; k++) g.circle(x, cy - h / 2 + 8 + (k * (h - 16)) / 3, 1.2).fill({ color: PAL.steelDark });
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
  /** G4: a slow reflection streak that drifts across the dome glass (moved every frame), and how far it travels. */
  streak?: Graphics;
  streakSpan?: number;
  /** Storage fill gauge (redrawn as the pod fills). */
  gauge?: Graphics;
  gaugeBox?: { x: number; y: number; w: number; h: number };
  /** Auto feeder (milestone 5): hopper and mash levels, redrawn as they change. */
  levels?: { g: Graphics; hopper: { x: number; y: number; w: number; h: number }; mash: { x: number; y: number; w: number; h: number } };
  /** Where fitted Echo whorls show on the piece (local). */
  whorlAt?: { x: number; y: number };
  /** Plate press (milestone 5 part 2): the ram, hopper windows and plate rack. */
  press?: {
    g: Graphics;
    ram: Container;
    scrap: { x: number; y: number; w: number; h: number };
    copper: { x: number; y: number; w: number; h: number };
    rack: { x: number; y: number; w: number };
  };
  /** Lab and Workshop (milestone 7): the Lab's scan bar; the Workshop's fabrication arm and torch spark. */
  station?: { bar?: Graphics; y0?: number; h?: number; arm?: Container; torch?: Graphics; armAt?: { x: number; y: number } };
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
  g.poly(domePts).fill({ color: PAL.glass, alpha: 0.42 });
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
  goldTraces(g, 16, drumTop + 26, W / 2 - 50, 8);
  goldTraces(g, W / 2 + 34, drumTop + 26, W / 2 - 50, 8);
  goldTraces(g, 16, drumBot - 30, W - 32, 6);
  // A chrome rim flange where the glass meets the drum.
  g.roundRect(4, drumTop - 10, W - 8, 10, 4).fill({ color: PAL.chrome });
  g.roundRect(4, drumTop - 10, W - 8, 3, 2).fill({ color: PAL.chromeHi, alpha: 0.8 });
  // The airlock: a round chrome hatch on the front of the drum.
  const ax = cx;
  const ay = drumBot - 44;
  g.circle(ax, ay, 26).fill({ color: PAL.chrome });
  g.circle(ax, ay, 26).stroke({ color: PAL.steelDark, width: 2 });
  g.circle(ax, ay, 19).fill({ color: PAL.steelDeep });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.circle(ax + Math.cos(a) * 22.5, ay + Math.sin(a) * 22.5, 1.3).fill({ color: PAL.steelDark });
  }
  g.moveTo(ax - 12, ay).lineTo(ax + 12, ay).moveTo(ax, ay - 12).lineTo(ax, ay + 12).stroke({ color: PAL.chrome, width: 3 });
  g.circle(ax, ay, 4.5).fill({ color: PAL.chrome });
  windows.circle(ax, ay, 21).stroke({ color: PAL.glass, width: 2, alpha: 0.8 });
  windowGlow.circle(ax, ay, 26).stroke({ color: PAL.glass, width: 6, alpha: 0.35 });
  g.rect(8, drumBot - 20, W - 16, 20).fill({ color: PAL.steelDeep, alpha: 0.4 });
  // Panel seams.
  for (const sx of [56, 112, 168]) g.rect(sx - 1, drumTop + 4, 2, drumBot - drumTop - 4).fill({ color: PAL.steelDark, alpha: 0.8 });
  rivets(g, 16, drumTop + 1, W - 16, drumTop + 1, 18);
  rivets(g, 16, drumBot - 5, W - 16, drumBot - 5, 18);
  for (const px of [32, 192]) porthole(g, px, drumTop + 50, 8);
  for (const px of [32, 192]) {
    windows.circle(px, drumTop + 50, 7).fill({ color: PAL.warm, alpha: 0.85 });
    windowGlow.circle(px, drumTop + 50, 14).fill({ color: PAL.warm, alpha: 0.5 });
  }
  body.addChild(stencil(`HAB-0${n}`, cx, drumTop + 14, 7));
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
  // G4: a pale slanted band that slides slowly across the glass (clipped to the dome).
  const streak = new Graphics();
  streak.poly([-14, drumTop - ry - 6, 6, drumTop - ry - 6, -22, drumTop + 4, -42, drumTop + 4]).fill({ color: 0xffffff, alpha: 0.16 });
  streak.poly([14, drumTop - ry - 6, 20, drumTop - ry - 6, -8, drumTop + 4, -14, drumTop + 4]).fill({ color: 0xffffff, alpha: 0.1 });
  const clip = new Graphics().poly(domePts).fill({ color: 0xffffff });
  sheen.addChild(clip, streak);
  streak.mask = clip;

  return { body, windows, windowGlow, lamp: { x: cx, y: drumTop - ry - 20 }, sheen, streak, streakSpan: rx * 2.6 };
}

function drawKestrelHabitat(n: number): PieceArt {
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const sheen = new Graphics();
  const mid = CELL;
  const w = CELL * 2;
  const hatch = w - 56;
  g.moveTo(4, 129).lineTo(19, 122).lineTo(w - 19, 122).lineTo(w - 4, 129)
    .lineTo(w - 4, 190).lineTo(w - 22, 212).lineTo(22, 212).lineTo(4, 190).closePath().fill(0x385151);
  g.poly([13, 144, 94, 144, 92, 193, 25, 205, 13, 187]).fill(0x63756b);
  g.poly([130, 144, w - 13, 144, w - 13, 187, w - 25, 205, 132, 193]).fill(0x556a64);
  g.moveTo(18, 150).lineTo(85, 150).moveTo(139, 150).lineTo(w - 18, 150)
    .stroke({ color: 0xc3ac87, width: 2.1, alpha: 0.72 });
  g.roundRect(17, 195, w - 34, 14, 4).fill(0x34484a);
  for (const x of [23, w - 56]) {
    g.poly([x, 202, x + 32, 202, x + 28, 220, x + 3, 220]).fill(0x415857);
    g.rect(x + 1, 216, 29, 4).fill(0x776649);
  }
  drawObservationCrown(g, windows, windowGlow, { x: 9, y: 21, w: w - 18, h: 112 });
  g.poly([80, 25, 88, 12, 146, 12, 156, 25]).fill(0x596d65);
  g.moveTo(90, 14).lineTo(135, 14).stroke({ color: 0xb5ad89, width: 2 });
  g.roundRect(124, 6, 18, 8, 2).fill(0x313c3b);
  g.circle(138, 8, 2.7).fill(0x74614a);
  for (const x of [43, w - 43]) {
    g.roundRect(x - 21, hatch - 12, 42, 26, 8).fill(0x364b48);
    g.roundRect(x - 16, hatch - 8, 32, 18, 5).fill(0x5b5e48);
    windows.roundRect(x - 14, hatch - 6, 28, 13, 4).fill({ color: 0xeec58b, alpha: 0.68 });
    windowGlow.ellipse(x, hatch, 22, 15).fill({ color: 0xe9af70, alpha: 0.47 });
  }
  g.circle(mid, hatch, 27).fill(0x263736).circle(mid, hatch, 24).fill(0x988464).circle(mid, hatch, 18).fill(0x33413e);
  g.moveTo(mid - 11, hatch).lineTo(mid + 11, hatch).moveTo(mid, hatch - 11).lineTo(mid, hatch + 11)
    .stroke({ color: 0xbeb08d, width: 2.4 });
  g.circle(mid, hatch, 3.7).fill(0xaea282);
  windows.circle(mid, hatch, 20).stroke({ color: 0xffc28b, width: 1.3, alpha: 0.87 });
  algaeLine(g, 15, w - 15, 211, 19);
  streaks(g, 20, w - 20, 174, 17, 9);
  body.addChild(stencil(`HAB-0${n}`, mid, 140, 7));
  sheen.moveTo(42, 68).quadraticCurveTo(68, 48, 108, 48).stroke({ color: 0xe3efdb, width: 5, alpha: 0.18, cap: 'round' });
  return { body, windows, windowGlow, sheen, lamp: { x: 138, y: 8 } };
}

const pressureShell = new FillGradient({
  type: 'linear', start: { x: 0, y: 0 }, end: { x: 0.15, y: 1 },
  colorStops: [{ offset: 0, color: 0x9fa68d }, { offset: 0.24, color: 0x69857d },
    { offset: 0.58, color: 0x3c6664 }, { offset: 1, color: 0x1e363b }],
});

/** The service modules share the dome's enamel, with their original machinery mounted above it. */
function drawMachineShell(g: Graphics, x: number, y: number, w: number, h: number, radius: number, livingBases: boolean): void {
  g.roundRect(x, y, w, h, radius).fill(livingBases ? pressureShell : PAL.steel);
  if (!livingBases) return;
  const inset = Math.min(radius, 12);
  g.moveTo(x + 4, y + inset + 6).quadraticCurveTo(x + 4, y + 5, x + inset + 7, y + 4)
    .lineTo(x + w - inset, y + 4).stroke({ color: 0xccc3a0, alpha: 0.49, width: 1.8, cap: 'round' });
  g.roundRect(x + 5, y + h - 17, w - 10, 11, 4).fill({ color: 0x263b3e, alpha: 0.46 });
  g.moveTo(x + 8, y + h - 11).lineTo(x + w - 8, y + h - 11)
    .stroke({ color: 0xbc9260, alpha: 0.64, width: 1.5 });
}

function drawPressureCorridor(n: number, rot: number, withStencil = true): PieceArt {
  const body = new Container();
  const chamber = body.addChild(new Container());
  const g = chamber.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const c = CELL / 2;
  const y = c - (TUBE + 10) / 2;
  const height = TUBE + 10;
  g.roundRect(4, y, CELL - 8, height, 10).fill(pressureShell);
  g.roundRect(12, y + 5, CELL - 24, height - 10, 7).stroke({ color: 0xb0a481, width: 1.2, alpha: 0.7 });
  g.moveTo(18, y + height - 7).lineTo(35, y + height - 7).lineTo(42, y + height - 11)
    .lineTo(CELL - 16, y + height - 11).stroke({ color: 0xb48054, width: 2.2 });
  for (const x of [4, CELL - 13]) drawPressureRib(g, x, y - 5, height + 10, 9);
  const port = { x: c - 24, y: c - 12, w: 48, h: 24 };
  drawHabitatFrame(g, port, 4);
  g.roundRect(port.x + 1, port.y + 1, port.w - 2, port.h - 2, 4).fill(0x20464c);
  g.rect(c - 1.5, c - 12, 3, 24).fill(0x67766a);
  const upright = rot % 2 === 1;
  for (const x of [c - 22, c + 2]) {
    const panel = upright ? [c - 5, x, 14, 20] as const : [x, c - 9, 20, 14] as const;
    windows.roundRect(panel[0], panel[1], panel[2], panel[3], 3).fill({ color: 0xffcb88, alpha: 0.58 });
    windowGlow.ellipse(panel[0] + panel[2] / 2, panel[1] + panel[3] / 2, 17, 14).fill({ color: 0xffc081, alpha: 0.24 });
  }
  if (withStencil) chamber.addChild(stencil(`C-${String(n).padStart(2, '0')}`, c, y + height - 4, 6));
  if (upright) {
    chamber.pivot.set(c, c);
    chamber.rotation = Math.PI / 2;
    chamber.position.set(c, c);
  }
  const lamp = upright ? { x: CELL - y - 5, y: CELL - 23 } : { x: CELL - 23, y: y + 5 };
  return { body, windows, windowGlow, lamp };
}

function drawCorridor(n: number, rot: number, withStencil = true): PieceArt {
  // Colin's corridor board: a charcoal drum with gold circuit lines, thick chrome
  // flanges at both ends, a lime porthole in a chrome ring, one red lamp, and a
  // coiled conduit along the top.
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const c = CELL / 2;
  const L = CELL;
  const D = TUBE + 6;
  const h = new Graphics();
  // Drawn running left-right, then turned for a vertical corridor.
  h.roundRect(4, c - D / 2, L - 8, D, 10).fill({ color: PAL.steel });
  h.roundRect(4, c - D / 2 + 4, L - 8, 8, 4).fill({ color: 0xffffff, alpha: 0.08 });
  h.roundRect(4, c + D / 2 - 18, L - 8, 18, 6).fill({ color: PAL.steelDeep, alpha: 0.5 });
  goldTraces(h, 16, c - 14, L - 32, 6);
  goldTraces(h, 16, c + 16, L - 32, 5);
  // Coiled conduit along the top, between the flanges.
  h.rect(16, c - D / 2 - 6, L - 32, 6).fill({ color: PAL.steelDark });
  for (let x = 17; x < L - 16; x += 3) h.rect(x, c - D / 2 - 6, 1.6, 6).fill({ color: PAL.chrome, alpha: 0.75 });
  // Chrome end flanges.
  flangeV(h, 9, c, D + 14, 12);
  flangeV(h, L - 9, c, D + 14, 12);
  // Porthole in a thick chrome ring.
  h.circle(c, c, 17).fill({ color: PAL.chrome });
  h.circle(c, c, 17).stroke({ color: PAL.steelDark, width: 1.5 });
  h.circle(c - 4, c - 5, 5).fill({ color: PAL.chromeHi, alpha: 0.4 });
  h.circle(c, c, 12).fill({ color: 0x4a6a14 });
  h.circle(c - 3, c - 4, 4).fill({ color: 0xe8ffb0, alpha: 0.4 });
  h.rect(c - 32, c - 3, 3, 9).fill({ color: PAL.chromeHi, alpha: 0.7 });
  scratches(h, 8, c - D / 2, L - 16, c + D / 2, 6);
  if (rot % 2 === 1) {
    h.pivot.set(c, c);
    h.rotation = Math.PI / 2;
    h.position.set(c, c);
  }
  body.addChild(h);
  windows.circle(c, c, 11).fill({ color: PAL.glass, alpha: 0.85 });
  windowGlow.circle(c, c, 22).fill({ color: PAL.glass, alpha: 0.45 });
  const lamp = rot % 2 === 0 ? { x: L - 26, y: c - 22 } : { x: c + 22, y: L - 26 };
  if (withStencil) body.addChild(stencil(`C-${String(n).padStart(2, '0')}`, rot % 2 === 0 ? c + 28 : c - 22, rot % 2 === 0 ? c + 26 : c + 30, 6, rot % 2 === 0 ? 0 : -Math.PI / 2));
  void g;
  return { body, windows, windowGlow, lamp };
}

/** A flange across a vertical tube (the top or bottom edge of a cell). */
function flangeH(g: Graphics, cx: number, y: number, w: number, h = 10): void {
  g.roundRect(cx - w / 2, y - h / 2, w, h, 3).fill({ color: PAL.chrome });
  g.roundRect(cx - w / 2 + 2, y - h / 2 + 1.5, w - 4, 2.5, 1).fill({ color: PAL.chromeHi, alpha: 0.8 });
  g.roundRect(cx - w / 2 + 2, y + h / 2 - 3, w - 4, 2, 1).fill({ color: PAL.steelDark, alpha: 0.6 });
  for (let k = 0; k < 4; k++) g.circle(cx - w / 2 + 8 + (k * (w - 16)) / 3, y, 1.2).fill({ color: PAL.steelDark });
}

/** A riser shaft: three upright corridor drums stacked, with one stencil. */
function drawShaft(n: number, livingBases: boolean): PieceArt {
  const body = new Container();
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const c = CELL / 2;
  // Side tubes through the top and bottom cells (Colin, after the terrain pass):
  // the shaft branches sideways near each end, not only up and down.
  const sides = body.addChild(new Graphics());
  for (const k of [0, 2]) {
    tubeH(sides, 0, CELL, c + k * CELL, 0);
    flangeV(sides, 9, c + k * CELL, TUBE + 14, 12);
    flangeV(sides, CELL - 9, c + k * CELL, TUBE + 14, 12);
  }
  for (let k = 0; k < 3; k++) {
    const cell = livingBases ? drawPressureCorridor(n, 1, false) : drawCorridor(n, 1, false);
    cell.body.y = k * CELL;
    body.addChild(cell.body);
    if (livingBases) {
      windows.roundRect(c - 5, c + k * CELL - 20, 14, 40, 4).fill({ color: 0xffcb88, alpha: 0.48 });
      windowGlow.ellipse(c + 2, c + k * CELL, 20, 29).fill({ color: 0xffc081, alpha: 0.24 });
    } else {
      windows.circle(c, c + k * CELL, 11).fill({ color: PAL.glass, alpha: 0.85 });
      windowGlow.circle(c, c + k * CELL, 22).fill({ color: PAL.glass, alpha: 0.45 });
    }
    cell.windows.destroy();
    cell.windowGlow.destroy();
  }
  body.addChild(stencil(`SH-${n}`, c - 22, CELL * 1.5 + 30, 6, -Math.PI / 2));
  return { body, windows, windowGlow, lamp: { x: c + 22, y: CELL * 3 - 26 } };
}

/**
 * Milestone 11: the Choir lantern. Tubes through all four edges meet a ring of
 * pale Choir stone holding a seed of its light (the only Choir colours on the
 * base: cyan, violet and magenta), lit only when it is finished.
 */
function drawLantern(n: number): PieceArt {
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const c = CELL / 2;
  tubeH(g, 0, CELL, c, 0);
  tubeV(g, 0, CELL, c, 0);
  const D = TUBE + 14;
  flangeV(g, 9, c, D, 12);
  flangeV(g, CELL - 9, c, D, 12);
  flangeH(g, c, 9, D, 12);
  flangeH(g, c, CELL - 9, D, 12);
  // The stone ring, nacre pale with grooves, set in a chrome collar.
  g.circle(c, c, 40).fill({ color: PAL.chrome });
  g.circle(c, c, 40).stroke({ color: PAL.steelDark, width: 2 });
  g.circle(c, c, 35).fill({ color: 0xb8c0d8 });
  for (const r of [30, 24]) g.circle(c, c, r).stroke({ color: 0x5a5e78, width: 1.2 });
  g.circle(c, c, 19).fill({ color: 0x14102c });
  windows.circle(c, c, 16).fill({ color: 0xa27cff, alpha: 0.75 });
  windows.circle(c, c, 10).fill({ color: 0x5ff0ff, alpha: 0.9 });
  windows.circle(c, c, 4).fill({ color: 0xf4fbff });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    windows.circle(c + Math.cos(a) * 27, c + Math.sin(a) * 27, 1.8).fill({ color: k % 2 ? 0xff5ad8 : 0x5ff0ff, alpha: 0.85 });
  }
  windowGlow.circle(c, c, 44).fill({ color: 0xa27cff, alpha: 0.5 });
  body.addChild(stencil(`CL-${n}`, c, c + 50, 6));
  return { body, windows, windowGlow, lamp: { x: CELL - 26, y: 26 } };
}

/** A cross junction: tubes through all four edges meeting at a chrome-ringed hub. */
function drawJunction(n: number): PieceArt {
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const c = CELL / 2;
  tubeH(g, 0, CELL, c, 0);
  tubeV(g, 0, CELL, c, 0);
  // The hub: a rounded charcoal block over the crossing, with gold traces and a lime port.
  g.roundRect(c - 34, c - 34, 68, 68, 14).fill({ color: PAL.steel });
  g.roundRect(c - 34, c - 34, 68, 68, 14).stroke({ color: PAL.steelDark, width: 2 });
  g.roundRect(c - 30, c - 30, 60, 8, 4).fill({ color: 0xffffff, alpha: 0.08 });
  goldTraces(g, c - 28, c + 24, 56, 4);
  g.circle(c, c - 2, 15).fill({ color: PAL.chrome });
  g.circle(c, c - 2, 15).stroke({ color: PAL.steelDark, width: 1.5 });
  g.circle(c, c - 2, 10).fill({ color: 0x4a6a14 });
  g.circle(c - 3, c - 5, 3.5).fill({ color: 0xe8ffb0, alpha: 0.4 });
  // Flanges at the four edges.
  const D = TUBE + 14;
  flangeV(g, 9, c, D, 12);
  flangeV(g, CELL - 9, c, D, 12);
  flangeH(g, c, 9, D, 12);
  flangeH(g, c, CELL - 9, D, 12);
  scratches(g, 10, 10, CELL - 10, CELL - 10, 5);
  windows.circle(c, c - 2, 9).fill({ color: PAL.glass, alpha: 0.85 });
  windowGlow.circle(c, c - 2, 20).fill({ color: PAL.glass, alpha: 0.45 });
  body.addChild(stencil(`JX-${n}`, c, c + 41, 6));
  return { body, windows, windowGlow, lamp: { x: CELL - 26, y: 26 } };
}

/** A cliff bracket: a bolted rock plate with a gusset, carrying tubes up, down and out. Drawn for rock on the west; rot 1 mirrors it. */
function drawBracket(n: number, rot: number): PieceArt {
  const body = new Container();
  const art = new Container();
  const g = art.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const c = CELL / 2;
  tubeV(g, 0, CELL, c + 8, 0);
  tubeH(g, 24, CELL, c, 1);
  // The anchor plate against the rock, with bolt heads, and a diagonal gusset to the tube.
  g.roundRect(0, 6, 26, CELL - 12, 4).fill({ color: PAL.steelDark });
  g.roundRect(0, 6, 5, CELL - 12, 2).fill({ color: 0xffffff, alpha: 0.08 });
  for (const y of [18, c, CELL - 18]) {
    g.circle(13, y, 4.5).fill({ color: PAL.chrome });
    g.circle(13, y, 4.5).stroke({ color: PAL.steelDeep, width: 1 });
    g.circle(12, y - 1, 1.6).fill({ color: PAL.chromeHi, alpha: 0.8 });
  }
  g.moveTo(26, c + 30).lineTo(c - 12, c + 8).lineTo(c - 12, c + 24).closePath().fill({ color: PAL.steel });
  g.moveTo(26, c - 30).lineTo(c - 12, c - 8).lineTo(c - 12, c - 24).closePath().fill({ color: PAL.steel });
  flangeV(g, CELL - 9, c, TUBE + 14, 12);
  flangeH(g, c + 8, 9, TUBE + 14, 12);
  flangeH(g, c + 8, CELL - 9, TUBE + 14, 12);
  scratches(g, 26, 10, CELL - 10, CELL - 10, 4);
  streaks(g, 4, 22, 12, 3, 28);
  if (rot % 2 === 1) {
    art.scale.x = -1;
    art.position.x = CELL;
  }
  body.addChild(art);
  const lx = rot % 2 === 1 ? 26 : CELL - 26;
  body.addChild(stencil(`BR-${n}`, rot % 2 === 1 ? c - 8 : c + 8, c + 40, 6));
  return { body, windows, windowGlow, lamp: { x: lx, y: 24 } };
}

/**
 * Milestone 12: the core generator (copied from the Corvina's own). A charcoal column like the turbine's, but
 * sealed: a chrome-ringed porthole onto a core of glowing vent ore, heat fins
 * down both sides, and the gold spine carrying its power.
 */
function drawThermal(n: number, livingBases: boolean): PieceArt {
  const W = CELL;
  const H = CELL * 2;
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const cx = W / 2;
  const hubY = H / 2 - 6;
  tubeH(g, 0, 16, H - CELL / 2, 1);
  tubeH(g, W - 16, W, H - CELL / 2, 1);
  tubeH(g, 0, 16, CELL / 2, 1);
  tubeH(g, W - 16, W, CELL / 2, 1);
  drawMachineShell(g, 20, 6, W - 40, H - 14, 10, livingBases);
  g.roundRect(20, 6, W - 40, 10, 5).fill({ color: PAL.steelDark });
  g.rect(24, 16, 6, H - 30).fill({ color: 0xffffff, alpha: 0.06 });
  // Heat fins.
  for (let k = 0; k < 9; k++) {
    const y = 24 + k * 9;
    g.rect(14, y, 10, 4).fill({ color: PAL.steelDark });
    g.rect(W - 24, y, 10, 4).fill({ color: PAL.steelDark });
    g.rect(14, H - 30 - k * 9, 10, 4).fill({ color: PAL.steelDark });
    g.rect(W - 24, H - 30 - k * 9, 10, 4).fill({ color: PAL.steelDark });
  }
  goldTraces(g, 28, 34, W - 56, 6);
  goldTraces(g, 28, H - 34, W - 56, 6);
  g.rect(cx - 3, 40, 6, H - 80).fill({ color: 0xb08020 });
  windows.rect(cx - 2, 40, 4, hubY - 78).fill({ color: 0xffc040, alpha: 0.9 });
  windows.rect(cx - 2, hubY + 38, 4, H - 40 - (hubY + 38)).fill({ color: 0xffc040, alpha: 0.9 });
  // The core behind its porthole.
  g.circle(cx, hubY, 36).fill({ color: PAL.steelDeep });
  g.circle(cx, hubY, 36).stroke({ color: PAL.chrome, width: 8 });
  g.circle(cx, hubY, 40).stroke({ color: PAL.steelDark, width: 1.2 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.circle(cx + Math.cos(a) * 36, hubY + Math.sin(a) * 36, 2.4).fill({ color: PAL.steelDark });
  }
  g.circle(cx, hubY, 28).fill({ color: 0x3a1408 });
  windows.circle(cx, hubY, 24).fill({ color: 0xff6a1a, alpha: 0.85 });
  windows.circle(cx - 4, hubY + 3, 14).fill({ color: 0xffa040, alpha: 0.9 });
  windows.circle(cx + 3, hubY - 4, 6).fill({ color: 0xffe0a0 });
  for (let i = 0; i < 5; i++) windows.circle(cx + R(-16, 16), hubY + R(-14, 14), R(2, 4)).fill({ color: 0xffd080, alpha: 0.8 });
  g.circle(cx - 10, hubY - 12, 30).stroke({ color: PAL.chromeHi, width: 1.5, alpha: 0.4 });
  windowGlow.circle(cx, hubY, 52).fill({ color: 0xff7a2a, alpha: 0.45 });
  windowGlow.rect(cx - 6, 40, 12, H - 80).fill({ color: 0xffb030, alpha: 0.3 });
  body.addChild(stencil(`CG-${n}`, cx, H - 50, 6));
  scratches(g, 22, 10, W - 24, H - 10, 10);
  algaeLine(g, 20, W - 20, H - 8, 8);
  return { body, windows, windowGlow, lamp: { x: W - 30, y: 14 } };
}

function drawTurbine(n: number, livingBases: boolean): PieceArt {
  // Colin's turbine board: a tall charcoal column with lime grille vents top and
  // bottom, a glowing gold spine carrying the current, side clamps, and the
  // impeller turning inside a thick chrome ring in the middle.
  const W = CELL;
  const H = CELL * 2;
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const cx = W / 2;
  const hubY = H / 2 - 6;
  // Collar stubs through the column, on both levels (the upper pair after the terrain pass).
  tubeH(g, 0, 16, H - CELL / 2, 1);
  tubeH(g, W - 16, W, H - CELL / 2, 1);
  tubeH(g, 0, 16, CELL / 2, 1);
  tubeH(g, W - 16, W, CELL / 2, 1);
  // Side clamps.
  for (const sx of [10, W - 26]) {
    g.roundRect(sx, hubY - 34, 16, 68, 4).fill({ color: PAL.steelDark });
    for (let k = 0; k < 4; k++) g.rect(sx + 2, hubY - 28 + k * 16, 12, 3).fill({ color: PAL.chrome, alpha: 0.7 });
  }
  // The column.
  drawMachineShell(g, 22, 6, W - 44, H - 14, 8, livingBases);
  g.roundRect(22, 6, W - 44, 10, 5).fill({ color: PAL.steelDark });
  g.rect(26, 16, 6, H - 30).fill({ color: 0xffffff, alpha: 0.06 });
  goldTraces(g, 28, 60, W - 56, 8);
  goldTraces(g, 28, H - 60, W - 56, 8);
  // Lime grille vents, top and bottom (they glow with power).
  const vents = [
    { y: 20, h: 30 },
    { y: H - 52, h: 30 },
  ];
  for (const v of vents) {
    g.roundRect(30, v.y, W - 60, v.h, 3).fill({ color: PAL.steelDeep });
    for (let k = 0; k < 5; k++) {
      g.rect(33, v.y + 3 + k * 5.6, W - 66, 3).fill({ color: 0x4a6a14 });
      windows.rect(33, v.y + 3 + k * 5.6, W - 66, 3).fill({ color: PAL.glass, alpha: 0.8 });
    }
    windowGlow.rect(30, v.y, W - 60, v.h).fill({ color: PAL.glass, alpha: 0.35 });
  }
  // The gold spine.
  g.rect(cx - 3, 52, 6, H - 106).fill({ color: 0xb08020 });
  windows.rect(cx - 2, 52, 4, H - 106).fill({ color: 0xffc040, alpha: 0.9 });
  windowGlow.rect(cx - 6, 52, 12, H - 106).fill({ color: 0xffb030, alpha: 0.4 });
  // Chrome ring round the impeller.
  g.circle(cx, hubY, 36).fill({ color: PAL.steelDeep });
  g.circle(cx, hubY, 36).stroke({ color: PAL.chrome, width: 8 });
  g.circle(cx, hubY, 40).stroke({ color: PAL.steelDark, width: 1.2 });
  g.circle(cx - 10, hubY - 12, 34).stroke({ color: PAL.chromeHi, width: 1.5, alpha: 0.4 });
  // Impeller: three dark chrome blades.
  const rotor = new Container();
  const rg = rotor.addChild(new Graphics());
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const P = (u: number, v: number): [number, number] => [ca * u - sa * v, sa * u + ca * v];
    rg.poly([P(6, -4), P(18, -12), P(30, -6), P(31, 2), P(8, 5)].flat()).fill({ color: 0x5a646a });
    rg.poly([P(8, 1), P(31, 2), P(8, 5)].flat()).fill({ color: 0x3a4248 });
  }
  rg.circle(0, 0, 8).fill({ color: PAL.chrome });
  rg.circle(-2, -2, 3).fill({ color: PAL.chromeHi, alpha: 0.7 });
  rg.circle(0, 0, 2.5).fill({ color: PAL.steelDeep });
  rotor.position.set(cx, hubY);
  body.addChild(rotor);
  body.addChild(stencil(`CT-${n}`, cx, H - 66, 6));
  scratches(g, 24, 10, W - 26, H - 10, 10);
  algaeLine(g, 22, W - 22, H - 8, 10);
  return { body, rotor, windows, windowGlow, lamp: { x: W - 30, y: 14 } };
}

function drawStorage(n: number, livingBases: boolean): PieceArt {
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
  drawMachineShell(g, 18, 10, CELL - 36, CELL - 20, 24, livingBases);
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

/**
 * Sorting pod SP-1 (milestone 7 part 2): a squat resin-sealed cabinet with a
 * row of small bay doors, one per material, each with its own fill light.
 */
function drawSorter(n: number, livingBases: boolean): PieceArt {
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const c = CELL / 2;
  tubeH(g, 0, 18, c, 1);
  tubeH(g, CELL - 18, CELL, c, 1);
  tubeV(g, 0, 14, c, 1);
  tubeV(g, CELL - 12, CELL, c, 1);
  drawMachineShell(g, 12, 14, CELL - 24, CELL - 26, 8, livingBases);
  g.roundRect(16, 18, 8, CELL - 34, 4).fill({ color: 0xffffff, alpha: 0.12 });
  g.rect(12, 26, CELL - 24, 4).fill({ color: 0xc88a2a });
  g.rect(12, CELL - 26, CELL - 24, 4).fill({ color: 0xc88a2a });
  // Seven bay doors in two rows.
  for (let i = 0; i < 7; i++) {
    const row = i < 4 ? 0 : 1;
    const col = row ? i - 4 : i;
    const x = 20 + col * 18 + (row ? 9 : 0);
    const y = 36 + row * 24;
    g.roundRect(x, y, 14, 18, 2).fill({ color: PAL.steelDark });
    g.roundRect(x + 1.5, y + 1.5, 11, 15, 2).fill({ color: PAL.steelDeep });
    windows.rect(x + 4, y + 13, 6, 2).fill({ color: [0xa8a199, 0xb87a4a, 0xe8f0f0, 0x9aa84a, 0x8e9a9c, 0xd89a3a, 0xc8e070][i], alpha: 0.9 });
  }
  windowGlow.rect(18, 46, CELL - 36, 40).fill({ color: PAL.warm, alpha: 0.12 });
  rivets(g, 18, 22, CELL - 18, 22, 7);
  body.addChild(stencil(`SP-${n}`, c, 20, 6));
  streaks(g, 16, CELL - 16, 30, 8, 18);
  scratches(g, 14, 14, CELL - 14, CELL - 14, 8);
  algaeLine(g, 16, CELL - 16, CELL - 12, 14);
  return { body, windows, windowGlow, lamp: { x: c, y: 10 } };
}

/**
 * Recompression room RC-1 (milestone 8 part 2): a brass-banded pressure
 * capsule lying on its side, with a round port and a pressure gauge.
 */
function drawRecomp(n: number): PieceArt {
  const W = CELL * 2;
  const H = CELL;
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  tubeH(g, 0, 18, H / 2, 1);
  tubeH(g, W - 18, W, H / 2, 1);
  g.roundRect(14, 14, W - 28, H - 24, (H - 24) / 2).fill({ color: 0x7a6a4a });
  g.roundRect(20, 18, W - 40, 10, 5).fill({ color: 0xffffff, alpha: 0.1 });
  for (const bx of [34, W / 2 - 4, W - 42]) g.rect(bx, 14, 8, H - 24).fill({ color: 0xa8822e });
  g.circle(W / 2 - 40, H / 2 + 4, 20).fill({ color: PAL.steelDeep });
  g.circle(W / 2 - 40, H / 2 + 4, 20).stroke({ color: 0xe8c870, width: 3 });
  windows.circle(W / 2 - 40, H / 2 + 4, 15).fill({ color: 0xffe8b0, alpha: 0.5 });
  windowGlow.circle(W / 2 - 40, H / 2 + 4, 30).fill({ color: PAL.warm, alpha: 0.3 });
  g.circle(W / 2 + 46, H / 2 - 4, 11).fill({ color: 0xe8e0c8 });
  g.circle(W / 2 + 46, H / 2 - 4, 11).stroke({ color: 0xa8822e, width: 2 });
  g.moveTo(W / 2 + 46, H / 2 - 4).lineTo(W / 2 + 52, H / 2 - 10).stroke({ color: 0xa8402e, width: 1.6 });
  rivets(g, 20, 20, W - 20, 20, 16);
  body.addChild(stencil(`RC-${n}`, W / 2 + 46, H - 18, 6));
  streaks(g, 16, W - 16, 22, 12, 18);
  algaeLine(g, 14, W - 14, H - 10, 20);
  return { body, windows, windowGlow, lamp: { x: W - 30, y: 12 } };
}

/**
 * Salvage crane SC-1 (milestone 8 part 2): a slewing jib on a riveted base,
 * a cable and hook, and a breaking floor where salvage is cut up.
 */
function drawCrane(n: number, livingBases: boolean): PieceArt {
  const W = CELL * 2;
  const H = CELL * 2;
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  tubeH(g, 0, 18, H - CELL / 2, 1);
  tubeH(g, W - 18, W, H - CELL / 2, 1);
  // Base and breaking floor.
  drawMachineShell(g, 10, H - 60, W - 20, 52, 6, livingBases);
  hazardBand(g, 10, H - 60, W - 20, 8);
  g.rect(18, H - 44, W - 36, 30).fill({ color: PAL.steelDeep });
  // Mast and jib.
  g.rect(36, 24, 18, H - 84).fill({ color: 0xa8822e });
  for (let y = 30; y < H - 70; y += 20) g.moveTo(36, y).lineTo(54, y + 18).stroke({ color: 0x6a5020, width: 1.6 });
  g.poly([45, 22, W - 14, 40, W - 14, 50, 45, 36]).fill({ color: 0xa8822e });
  g.roundRect(26, 40, 34, 26, 4).fill({ color: PAL.steelDark });
  windows.roundRect(30, 44, 26, 10, 2).fill({ color: 0xffd98a, alpha: 0.85 });
  windowGlow.roundRect(22, 36, 42, 30, 6).fill({ color: PAL.warm, alpha: 0.25 });
  // Cable and hook.
  g.moveTo(W - 24, 48).lineTo(W - 24, H - 90).stroke({ color: 0x2a2622, width: 1.6 });
  g.moveTo(W - 24, H - 90).arc(W - 30, H - 90, 6, 0, Math.PI).stroke({ color: 0x8a9496, width: 3 });
  rivets(g, 16, H - 54, W - 16, H - 54, 14);
  body.addChild(stencil(`SC-${n}`, W / 2 + 20, H - 14, 6));
  streaks(g, 14, W - 14, H - 50, 12, 20);
  algaeLine(g, 10, W - 10, H - 8, 20);
  return { body, windows, windowGlow, lamp: { x: 45, y: 20 } };
}

/**
 * Hatchery HX-1 (milestone 9): a rounded incubator hull with a window strip of
 * egg cradles, warm under lamps, and a little egg-cup crane on top.
 */
function drawHatchery(n: number, livingBases: boolean): PieceArt {
  const W = CELL * 2;
  const H = CELL;
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  tubeH(g, 0, 18, H / 2, 1);
  tubeH(g, W - 18, W, H / 2, 1);
  drawMachineShell(g, 14, 12, W - 28, H - 22, 22, livingBases);
  g.roundRect(20, 16, W - 40, 8, 4).fill({ color: 0xffffff, alpha: 0.12 });
  g.roundRect(14, H - 34, W - 28, 24, 10).fill({ color: PAL.steelDeep, alpha: 0.5 });
  // The cradle window: four cups in a row, each a warm pool of light.
  g.roundRect(28, 34, W - 56, 36, 10).fill({ color: PAL.steelDark });
  g.roundRect(28, 34, W - 56, 36, 10).stroke({ color: PAL.chrome, width: 2 });
  for (let i = 0; i < 4; i++) {
    const cx = 48 + i * ((W - 96) / 3);
    g.ellipse(cx, 62, 13, 5).fill({ color: PAL.chrome });
    windows.ellipse(cx, 52, 10, 12).fill({ color: 0xffd890, alpha: 0.45 });
    windows.circle(cx - 2, 56, 3.4).fill({ color: 0xf2f6c8, alpha: 0.9 });
    windows.circle(cx + 3, 57, 2.8).fill({ color: 0xf2f6c8, alpha: 0.8 });
  }
  windowGlow.roundRect(22, 28, W - 44, 48, 14).fill({ color: 0xffd080, alpha: 0.28 });
  goldTraces(g, 30, H - 22, W - 60, 3);
  rivets(g, 22, 20, W - 22, 20, 14);
  body.addChild(stencil(`HX-${n}`, W - 44, H - 16, 6));
  streaks(g, 16, W - 16, 26, 10, 14);
  algaeLine(g, 14, W - 14, H - 10, 18);
  return { body, windows, windowGlow, lamp: { x: 26, y: 14 } };
}

/**
 * Kelp farm KF-1 (milestone 9): a long glass grow house with fronds of kelp
 * rising from planters under a rail of lime grow lamps.
 */
function drawFarm(n: number): PieceArt {
  const W = CELL * 2;
  const H = CELL;
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  tubeH(g, 0, 18, H / 2, 1);
  tubeH(g, W - 18, W, H / 2, 1);
  g.roundRect(12, 10, W - 24, H - 18, 8).fill({ color: PAL.steelDark });
  g.rect(18, 22, W - 36, H - 44).fill({ color: 0x163a30 });
  // Planter troughs and the fronds growing out of them.
  g.rect(18, H - 30, W - 36, 10).fill({ color: 0x5a4a32 });
  for (let i = 0; i < 9; i++) {
    const x = 26 + i * ((W - 52) / 8);
    const h = 30 + ((i * 37) % 13);
    g.moveTo(x, H - 30).bezierCurveTo(x + 6, H - 30 - h * 0.4, x - 6, H - 30 - h * 0.7, x + 2, H - 30 - h).stroke({ color: i % 2 ? 0x7a8a3a : 0x6a7a30, width: 3.2, cap: 'round' });
    g.ellipse(x + 2, H - 30 - h * 0.6, 3, 1.6).fill({ color: 0xa8923e });
  }
  // The grow-lamp rail.
  g.rect(18, 18, W - 36, 5).fill({ color: PAL.chrome });
  for (let i = 0; i < 5; i++) {
    const x = 32 + i * ((W - 64) / 4);
    windows.rect(x - 8, 23, 16, 3).fill({ color: PAL.lampOn });
    windowGlow.ellipse(x, 40, 18, 22).fill({ color: PAL.glass, alpha: 0.16 });
  }
  // Glass glints, a frame bar, and the tray hatch on the right.
  for (const gx of [0.3, 0.68]) g.poly([18 + (W - 36) * gx, 22, 18 + (W - 36) * gx + 8, 22, 18 + (W - 36) * gx - 10, H - 22, 18 + (W - 36) * gx - 18, H - 22]).fill({ color: 0xffffff, alpha: 0.06 });
  g.rect(W / 2 - 2, 18, 4, H - 36).fill({ color: PAL.steel });
  hazardBand(g, 12, H - 18, W - 24, 8);
  rivets(g, 16, 14, W - 16, 14, 14);
  body.addChild(stencil(`KF-${n}`, 44, H - 13, 6));
  algaeLine(g, 12, W - 12, H - 8, 20);
  return { body, windows, windowGlow, lamp: { x: W - 22, y: 12 }, whorlAt: { x: W - 34, y: H - 40 } };
}

/**
 * Revival pool RP-1 (milestone 9): a low brass-rimmed basin under a glass
 * hood, its still water lit warm from below.
 */
function drawRevive(n: number, livingBases: boolean): PieceArt {
  const W = CELL * 2;
  const H = CELL;
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  tubeH(g, 0, 18, H / 2, 1);
  tubeH(g, W - 18, W, H / 2, 1);
  drawMachineShell(g, 14, 30, W - 28, H - 40, 12, livingBases);
  g.moveTo(26, 34).bezierCurveTo(30, 4, W - 30, 4, W - 26, 34).fill({ color: 0x86b3ae, alpha: 0.25 });
  g.moveTo(26, 34).bezierCurveTo(30, 4, W - 30, 4, W - 26, 34).stroke({ color: PAL.chrome, width: 2 });
  g.roundRect(30, 46, W - 60, 22, 10).fill({ color: 0xa8822e });
  g.roundRect(34, 50, W - 68, 14, 7).fill({ color: 0x1a2620 });
  windows.roundRect(36, 52, W - 72, 10, 5).fill({ color: 0xfff0c0, alpha: 0.6 });
  windows.circle(W / 2, 57, 3).fill({ color: 0xffffff, alpha: 0.9 });
  windowGlow.ellipse(W / 2, 50, W / 2 - 20, 26).fill({ color: 0xfff0c0, alpha: 0.25 });
  rivets(g, 34, 48, W - 34, 48, 12);
  goldTraces(g, 22, H - 20, W - 44, 3);
  body.addChild(stencil(`RP-${n}`, W / 2, H - 14, 6));
  algaeLine(g, 14, W - 14, H - 10, 18);
  return { body, windows, windowGlow, lamp: { x: W - 30, y: 34 } };
}

/**
 * Signal array SA-1 (milestone 10): a squat brass-and-charcoal hull with a
 * listening dish raised on a mast, a ring of receiver rods and a decoder window.
 */
function drawSignal(n: number, livingBases: boolean): PieceArt {
  const W = CELL * 2;
  const H = CELL * 2;
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  tubeH(g, 0, 18, H - CELL / 2, 1);
  tubeH(g, W - 18, W, H - CELL / 2, 1);
  // The hull.
  drawMachineShell(g, 12, H - CELL + 6, W - 24, CELL - 14, 10, livingBases);
  g.rect(12, H - CELL + 18, W - 24, 4).fill({ color: 0xa8822e });
  g.roundRect(30, H - CELL + 32, W - 60, 30, 6).fill({ color: PAL.steelDeep });
  windows.roundRect(34, H - CELL + 36, W - 68, 22, 4).fill({ color: 0xffd98a, alpha: 0.7 });
  for (let k = 0; k < 6; k++) windows.rect(40 + k * ((W - 86) / 5), H - CELL + 40, 3, 14).fill({ color: 0x1a1410, alpha: 0.6 });
  windowGlow.roundRect(26, H - CELL + 28, W - 52, 38, 8).fill({ color: PAL.warm, alpha: 0.25 });
  // Mast and dish.
  const mx = W / 2;
  g.rect(mx - 6, 40, 12, H - CELL - 30).fill({ color: PAL.chrome });
  g.moveTo(mx - 62, 34).quadraticCurveTo(mx, 82, mx + 62, 34).lineTo(mx + 56, 30).quadraticCurveTo(mx, 70, mx - 56, 30).closePath().fill({ color: 0xa8822e });
  g.moveTo(mx - 62, 34).quadraticCurveTo(mx, 82, mx + 62, 34).stroke({ color: PAL.chrome, width: 2 });
  g.moveTo(mx - 40, 40).lineTo(mx, 10).lineTo(mx + 40, 40).stroke({ color: PAL.chrome, width: 1.6 });
  g.circle(mx, 10, 5).fill({ color: PAL.steelDark });
  windows.circle(mx, 10, 2.6).fill({ color: 0xffe0a0 });
  // Receiver rods around the hull's roof.
  for (let k = 0; k < 7; k++) {
    const x = 24 + k * ((W - 48) / 6);
    g.rect(x - 1.5, H - CELL - 18, 3, 24).fill({ color: PAL.chrome });
    g.circle(x, H - CELL - 19, 2.6).fill({ color: 0xa8822e });
  }
  rivets(g, 18, H - CELL + 12, W - 18, H - CELL + 12, 14);
  goldTraces(g, 20, H - 22, W - 40, 3);
  body.addChild(stencil(`SA-${n}`, W / 2, H - 12, 6));
  algaeLine(g, 12, W - 12, H - 8, 20);
  return { body, windows, windowGlow, lamp: { x: mx, y: 8 } };
}

/** Inside of a creature tank (local): the water the creatures swim in. */
export const TANK_INNER = { x: 16, y: 16, w: CELL * 2 - 32, h: CELL - 30 };
/** Milestone 7 part 2: the Grand tank's water, 3 × 2 cells. */
export const GTANK_INNER = { x: 16, y: 16, w: CELL * 3 - 32, h: CELL * 2 - 30 };
export function tankInner(kind: PieceKind): { x: number; y: number; w: number; h: number } {
  return kind === 'gtank' ? GTANK_INNER : TANK_INNER;
}

/**
 * Creature tank (milestone 4): a long glass aquarium in a riveted steel frame
 * with rust-red rails, like the kit sheet. The water, sand and rocks are
 * drawn here; the creatures, plant, murk and front glass are drawn by
 * TankLife (src/world/tanklife.ts) on top.
 */
function drawTank(n: number, grand = false, livingBases = false): PieceArt {
  const W = CELL * (grand ? 3 : 2);
  const H = CELL * (grand ? 2 : 1);
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const I = grand ? GTANK_INNER : TANK_INNER;
  // Collar stubs.
  tubeH(g, 0, 18, H / 2, 1);
  tubeH(g, W - 18, W, H / 2, 1);
  // Back wall and water.
  if (livingBases) drawHabitatFrame(g, I, 10);
  else {
    g.rect(I.x - 4, I.y - 4, I.w + 8, I.h + 8).fill({ color: PAL.steelDeep });
    g.rect(I.x, I.y, I.w, I.h).fill({ color: 0x1f4a4c });
    g.rect(I.x, I.y, I.w, I.h * 0.45).fill({ color: 0x3d7470, alpha: 0.55 });
  }
  // Sand floor with a few pebbles and a rock.
  const floor = I.y + I.h - 12;
  const sand: number[] = [I.x, I.y + I.h];
  for (let x = I.x; x <= I.x + I.w; x += 8) sand.push(x, floor + Math.sin(x * 0.09) * 2.4 + Math.sin(x * 0.23) * 1.2);
  sand.push(I.x + I.w, I.y + I.h);
  g.poly(sand).fill({ color: 0xb7a47a });
  for (let i = 0; i < 18; i++) g.circle(R(I.x + 4, I.x + I.w - 4), R(floor + 3, I.y + I.h - 2), R(0.8, 2)).fill({ color: rand() < 0.5 ? 0x8a7a58 : 0xd8c8a0, alpha: 0.8 });
  g.ellipse(I.x + I.w * 0.78, floor, 16, 9).fill({ color: 0x6a6a62 });
  g.ellipse(I.x + I.w * 0.78 - 4, floor - 4, 9, 3).fill({ color: 0xffffff, alpha: 0.12 });
  g.ellipse(I.x + I.w * 0.86, floor + 2, 8, 5).fill({ color: 0x585a52 });
  algaeLine(g, I.x + I.w * 0.72, I.x + I.w * 0.9, floor - 6, 5);
  if (!livingBases) {
    // Frame: steel posts, rust-red top and bottom rails.
    g.rect(8, 6, 10, H - 10).fill({ color: PAL.steel });
    g.rect(W - 18, 6, 10, H - 10).fill({ color: PAL.steel });
    g.rect(8, 6, 3, H - 10).fill({ color: 0xffffff, alpha: 0.12 });
    g.rect(W - 18, 6, 3, H - 10).fill({ color: 0xffffff, alpha: 0.12 });
    g.roundRect(4, 2, W - 8, 14, 3).fill({ color: PAL.rust });
    g.roundRect(4, 2, W - 8, 4, 2).fill({ color: 0xffffff, alpha: 0.14 });
    g.roundRect(4, H - 16, W - 8, 14, 3).fill({ color: PAL.rust });
    g.rect(4, H - 6, W - 8, 4).fill({ color: PAL.rustDark, alpha: 0.7 });
    rivets(g, 12, 9, W - 12, 9, 22);
    rivets(g, 12, H - 9, W - 12, H - 9, 22);
  } else {
    g.roundRect(W * 0.6 - 18, 0, 42, 13, 3).fill(0x655743);
    g.roundRect(W * 0.6 - 12, 3, 32, 5, 2).fill(0xa98a58);
    g.poly([28, H - 9, 56, H - 9, 51, H, 25, H]).fill(0x42615e);
    g.poly([W - 56, H - 9, W - 28, H - 9, W - 25, H, W - 51, H]).fill(0x42615e);
  }
  // Lamp housing on the top rail.
  g.roundRect(W / 2 - 40, 4, 80, 8, 2).fill({ color: PAL.steelDark });
  windows.rect(W / 2 - 36, 10, 72, 3).fill({ color: 0xfff1d0, alpha: 0.9 });
  windowGlow.rect(W / 2 - 50, 8, 100, 30).fill({ color: PAL.warm, alpha: 0.25 });
  if (grand && !livingBases) {
    // A middle post, and resin-amber seals along the rails.
    g.rect(W / 2 - 4, 14, 8, H - 28).fill({ color: PAL.steel, alpha: 0.85 });
    g.rect(4, 15, W - 8, 3).fill({ color: 0xc88a2a, alpha: 0.8 });
    g.rect(4, H - 19, W - 8, 3).fill({ color: 0xc88a2a, alpha: 0.8 });
  }
  body.addChild(stencil(grand ? `GT-${n}` : `TANK ${n}`, 42, H - 9, 6));
  streaks(g, 8, W - 8, livingBases ? 8 : 14, 16, livingBases ? 5 : 16);
  streaks(g, 8, W - 8, H - 4, 10, 8);
  scratches(g, 6, 2, W - 6, livingBases ? 7 : 14, 8);
  algaeLine(g, 6, W - 6, H - 3, 24);
  return { body, windows, windowGlow, lamp: { x: W - 30, y: 8 }, whorlAt: { x: W - 30, y: 26 } };
}

/**
 * Filter pump (milestone 4): a squat drum with an impeller behind a grille,
 * a pressure gauge and pipes to its collars. Clean water is pumped through
 * the corridors to up to two creature tanks.
 */
function drawFilter(n: number, livingBases: boolean): PieceArt {
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const c = CELL / 2;
  tubeH(g, 0, 22, c, 1);
  tubeH(g, CELL - 22, CELL, c, 1);
  tubeV(g, 0, 18, c, 1);
  // Drum.
  drawMachineShell(g, 16, 18, CELL - 32, CELL - 30, 10, livingBases);
  g.roundRect(20, 22, 8, CELL - 40, 4).fill({ color: 0xffffff, alpha: 0.12 });
  g.roundRect(CELL - 36, 22, 14, CELL - 40, 6).fill({ color: PAL.steelDeep, alpha: 0.4 });
  hazardBand(g, 16, 24, CELL - 32, 8);
  rivets(g, 22, 36, CELL - 22, 36, 6);
  rivets(g, 22, CELL - 18, CELL - 22, CELL - 18, 6);
  // Impeller grille.
  g.circle(c - 6, 62, 20).fill({ color: PAL.steelDeep });
  g.circle(c - 6, 62, 20).stroke({ color: PAL.steelDark, width: 3 });
  const rotor = new Container();
  const rg = rotor.addChild(new Graphics());
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rg.poly([Math.cos(a) * 3, Math.sin(a) * 3, Math.cos(a + 0.5) * 16, Math.sin(a + 0.5) * 16, Math.cos(a + 0.9) * 14, Math.sin(a + 0.9) * 14]).fill({ color: PAL.steelLight });
  }
  rg.circle(0, 0, 4).fill({ color: PAL.brass });
  rotor.position.set(c - 6, 62);
  body.addChild(rotor);
  const grille = body.addChild(new Graphics());
  for (let i = -3; i <= 3; i++) grille.rect(c - 6 + i * 5 - 0.8, 44, 1.6, 36).fill({ color: PAL.steelDark, alpha: 0.85 });
  grille.circle(c - 6, 62, 20).stroke({ color: PAL.steelDark, width: 2 });
  // Gauge.
  g.circle(c + 26, 52, 7).fill({ color: PAL.brass });
  g.circle(c + 26, 52, 5.5).fill({ color: 0xe8e2cc });
  g.moveTo(c + 26, 52).lineTo(c + 29, 48.5).stroke({ color: PAL.rust, width: 1.2 });
  // Intake pipe down to the sand.
  g.rect(c + 20, 66, 10, CELL - 70).fill({ color: PAL.steelDark });
  g.rect(c + 18, CELL - 14, 14, 6).fill({ color: PAL.rust });
  body.addChild(stencil(`FP-${n}`, c + 26, 68, 6, -Math.PI / 2));
  streaks(g, 18, CELL - 18, 32, 8, 18);
  scratches(g, 18, 20, CELL - 18, CELL - 14, 8);
  algaeLine(g, 18, CELL - 18, CELL - 12, 14);
  windows.rect(c + 22, 48, 0.1, 0.1).fill({ color: 0 });
  windowGlow.rect(c + 22, 48, 0.1, 0.1).fill({ color: 0 });
  return { body, rotor, windows, windowGlow, lamp: { x: c + 26, y: 40 }, whorlAt: { x: 26, y: 30 } };
}

/**
 * Auto feeder (milestone 5): a tall press. Kelp fibre drops from the
 * conveyor into a funnel hopper on top, a geared press drum grinds it, and
 * the mash collects in a tank with a glass sight window at the bottom. A
 * copper riser carries the mash back up to the feed pipe port on top.
 */
function drawFeeder(n: number, livingBases: boolean): PieceArt {
  const W = CELL;
  const H = CELL * 2;
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const cy = H - CELL / 2;
  tubeH(g, 0, 18, cy, 1);
  tubeH(g, W - 18, W, cy, 1);
  // Frame posts the whole height.
  g.rect(12, 20, 7, H - 26).fill({ color: PAL.steelDark });
  g.rect(W - 26, 20, 7, H - 26).fill({ color: PAL.steelDark });
  // Copper riser from the mash tank up to the pipe port.
  const px = W / 2 + 22;
  g.rect(px - 5, 6, 10, H - 70).fill({ color: 0x8a6a3a });
  g.rect(px - 5, 6, 3, H - 70).fill({ color: 0xffffff, alpha: 0.16 });
  for (let y = 22; y < H - 70; y += 34) g.rect(px - 7, y, 14, 4).fill({ color: PAL.brass });
  dab(g, px, H - 110, 6, 14, 0x5e8a6e, 0.5);
  // Hopper: a funnel open at the top, where the conveyor drops in.
  const hx0 = 8;
  const hx1 = 66;
  g.poly([hx0, 6, hx1, 6, hx1 - 14, 66, hx0 + 14, 66]).fill({ color: PAL.steel });
  g.poly([hx0 + 5, 10, hx1 - 5, 10, hx1 - 17, 60, hx0 + 17, 60]).fill({ color: PAL.steelDeep });
  const hopper = { x: hx0 + 18, y: 14, w: hx1 - hx0 - 36, h: 44 };
  hazardBand(g, hx0, 4, hx1 - hx0, 7);
  rivets(g, hx0 + 4, 16, hx0 + 16, 62, 4);
  rivets(g, hx1 - 4, 16, hx1 - 16, 62, 4);
  // Press drum with a big gear.
  g.roundRect(12, 70, W - 24, 58, 10).fill({ color: PAL.yellow });
  g.roundRect(14, 72, W - 28, 6, 3).fill({ color: 0xffffff, alpha: 0.15 });
  g.roundRect(12, 116, W - 24, 12, 4).fill({ color: PAL.yellowDark, alpha: 0.6 });
  rivets(g, 18, 75, W - 18, 75, 8);
  rivets(g, 18, 123, W - 18, 123, 8);
  g.circle(40, 99, 22).fill({ color: PAL.steelDeep });
  const rotor = new Container();
  const rg = rotor.addChild(new Graphics());
  const teeth: number[] = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const rr = i % 2 ? 15 : 19;
    teeth.push(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  rg.poly(teeth).fill({ color: PAL.steelLight });
  rg.circle(0, 0, 10).fill({ color: PAL.steel });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    rg.circle(Math.cos(a) * 6, Math.sin(a) * 6, 2).fill({ color: PAL.steelDeep });
  }
  rg.circle(0, 0, 3).fill({ color: PAL.brass });
  rotor.position.set(40, 99);
  body.addChild(rotor);
  g.circle(78, 92, 7).fill({ color: PAL.brass });
  g.circle(78, 92, 5.5).fill({ color: 0xe8e2cc });
  g.moveTo(78, 92).lineTo(81, 88.5).stroke({ color: PAL.rust, width: 1.2 });
  // Mash tank with a sight window.
  drawMachineShell(g, 14, 134, W - 28, H - 146, 8, livingBases);
  g.roundRect(18, 138, 6, H - 156, 3).fill({ color: 0xffffff, alpha: 0.12 });
  g.roundRect(W - 34, 138, 12, H - 156, 5).fill({ color: PAL.steelDeep, alpha: 0.4 });
  const mash = { x: 32, y: 146, w: 18, h: 54 };
  g.roundRect(mash.x - 4, mash.y - 4, mash.w + 8, mash.h + 8, 4).fill({ color: PAL.brass });
  g.rect(mash.x, mash.y, mash.w, mash.h).fill({ color: 0x1c2a2e });
  rivets(g, 20, H - 16, W - 20, H - 16, 7);
  const levels = { g: new Graphics(), hopper, mash };
  body.addChild(levels.g);
  // Glass sheen over the sight window, above the level.
  const sheen = body.addChild(new Graphics());
  sheen.rect(mash.x + 2, mash.y + 2, 3, mash.h - 4).fill({ color: 0xffffff, alpha: 0.22 });
  body.addChild(stencil(`AF-${n}`, 70, 150, 6, -Math.PI / 2));
  streaks(g, 14, W - 14, 128, 10, 22);
  streaks(g, 14, W - 14, 60, 6, 14);
  scratches(g, 12, 70, W - 12, H - 14, 10);
  algaeLine(g, 14, W - 14, H - 14, 16);
  algaeLine(g, hx0 + 4, hx1 - 4, 8, 6);
  windows.rect(W - 40, 140, 10, 4).fill({ color: 0xfff1d0, alpha: 0.9 });
  windowGlow.rect(W - 46, 132, 24, 18).fill({ color: PAL.warm, alpha: 0.3 });
  return { body, rotor, windows, windowGlow, lamp: { x: W - 34, y: 182 }, levels, whorlAt: { x: 80, y: 112 } };
}

/**
 * Plate press (milestone 5 part 2): a squat hydraulic press. Scrap and
 * copper drop from the conveyor into a split hopper on the left; a yellow
 * crossbeam on two steel columns carries a chrome cylinder whose ram stamps
 * them into riveted hull plates on the die bed; finished plates stack on a
 * rack on the right, where the out conveyor picks them up.
 */
function drawPress(n: number): PieceArt {
  const W = CELL * 2;
  const H = CELL;
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const cy = H / 2;
  tubeH(g, 0, 16, cy, 1);
  tubeH(g, W - 16, W, cy, 1);
  // Bed with a hazard band.
  g.roundRect(10, H - 34, W - 20, 22, 4).fill({ color: PAL.steelDark });
  g.rect(12, H - 33, W - 24, 3).fill({ color: 0xffffff, alpha: 0.1 });
  hazardBand(g, 14, H - 18, W - 28, 5);
  rivets(g, 18, H - 26, W - 18, H - 26, 12);
  // Die block under the ram.
  g.rect(W / 2 - 30, H - 42, 60, 9).fill({ color: PAL.steelLight });
  g.rect(W / 2 - 30, H - 42, 60, 2).fill({ color: 0xffffff, alpha: 0.2 });
  // Columns and crossbeam.
  for (const x of [W / 2 - 40, W / 2 + 32]) {
    g.rect(x, 16, 8, H - 50).fill({ color: PAL.steel });
    g.rect(x, 16, 2.5, H - 50).fill({ color: 0xffffff, alpha: 0.14 });
    g.rect(x - 2, H - 40, 12, 6).fill({ color: PAL.steelDark });
  }
  g.roundRect(W / 2 - 50, 8, 100, 20, 4).fill({ color: PAL.yellow });
  g.roundRect(W / 2 - 48, 9, 96, 4, 2).fill({ color: 0xffffff, alpha: 0.15 });
  g.rect(W / 2 - 50, 24, 100, 4).fill({ color: PAL.yellowDark, alpha: 0.7 });
  rivets(g, W / 2 - 44, 18, W / 2 + 44, 18, 9);
  // Cylinder.
  g.rect(W / 2 - 9, 28, 18, 14).fill({ color: PAL.steelLight });
  g.rect(W / 2 - 9, 28, 5, 14).fill({ color: 0xffffff, alpha: 0.25 });
  // The ram moves (a child container).
  const ram = new Container();
  const rg = ram.addChild(new Graphics());
  rg.rect(-4, 0, 8, 22).fill({ color: 0xc8d0d2 });
  rg.rect(-4, 0, 2, 22).fill({ color: 0xffffff, alpha: 0.4 });
  rg.roundRect(-28, 20, 56, 12, 2).fill({ color: PAL.steelDark });
  rg.rect(-28, 20, 56, 3).fill({ color: PAL.yellow });
  rg.rect(-24, 30, 48, 3).fill({ color: PAL.steelDeep });
  ram.position.set(W / 2, 40);
  body.addChild(ram);
  // Split hopper on the left: scrap (rust) and copper (verdigris) windows.
  g.poly([22, 6, 80, 6, 72, 52, 30, 52]).fill({ color: PAL.steel });
  g.poly([26, 9, 76, 9, 69, 48, 33, 48]).fill({ color: PAL.steelDeep });
  g.rect(50, 9, 2, 39).fill({ color: PAL.steel });
  hazardBand(g, 22, 4, 58, 6);
  g.rect(42, 52, 18, 10).fill({ color: PAL.steelDark });
  g.rect(58, 56, 20, 6).fill({ color: PAL.steelDark });
  const scrap = { x: 36, y: 14, w: 12, h: 32 };
  const copper = { x: 54, y: 14, w: 12, h: 32 };
  // Plate rack on the right.
  const rx0 = W - 82;
  g.rect(rx0, 22, 4, H - 56).fill({ color: PAL.steelDark });
  g.rect(W - 26, 22, 4, H - 56).fill({ color: PAL.steelDark });
  g.rect(rx0, H - 38, W - 22 - rx0, 4).fill({ color: PAL.rust });
  const rack = { x: rx0 + 6, y: H - 40, w: W - 32 - rx0 };
  // Chute up to the out port.
  g.rect(W / 2 + 58, 8, 10, 16).fill({ color: PAL.steelDark });
  const levels = new Graphics();
  body.addChild(levels);
  body.addChild(stencil(`PP-${n}`, W / 2, 18, 7));
  body.addChild(stencil('2 SCRAP + 1 CU', 51, 58, 4));
  streaks(g, 14, W - 14, H - 34, 8, 14);
  streaks(g, W / 2 - 48, W / 2 + 48, 28, 4, 10);
  scratches(g, 12, H - 34, W - 12, H - 14, 8);
  algaeLine(g, 14, W - 14, H - 13, 18);
  algaeLine(g, 24, 78, 8, 5);
  // A small lit readout on the crossbeam.
  windows.rect(W / 2 + 30, 12, 10, 5).fill({ color: 0xfff1d0, alpha: 0.9 });
  windowGlow.rect(W / 2 + 24, 6, 22, 17).fill({ color: PAL.warm, alpha: 0.3 });
  return {
    body,
    windows,
    windowGlow,
    lamp: { x: W / 2 - 34, y: 13 },
    whorlAt: { x: W / 2 + 30, y: 38 },
    press: { g: levels, ram, scrap, copper, rack },
  };
}


/**
 * Moon pool dock (milestone 6): a pressurised hall on the top row with a
 * pool cut in its floor, over an open berth on the bottom row. The sub
 * rises into the pool from below until its dome sits up in the hall, where
 * clamps hold it and the crane over the pool lifts modules on and off.
 * Heavy side pillars carry the hall down to the seabed; amber guide lamps
 * on the pillars show the way in.
 */
function drawPressureDock(n: number, housingOcean: boolean): PieceArt {
  const W = 3 * CELL;
  const H = 2 * CELL;
  const cx = W / 2;
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  tubeH(g, 0, 26, CELL / 2, 1);
  tubeH(g, W - 26, W, CELL / 2, 1);
  for (const s of [-1, 1]) {
    const x = cx + s * 143;
    g.poly([x - 13, 92, x + 13, 92, x + 13 + s * 7, H - 5, x - 13 + s * 7, H - 5]).fill(pressureShell);
    g.moveTo(x, 110).lineTo(x + s * 7, H - 8).stroke({ color: 0xb19a73, alpha: 0.75, width: 2 });
    g.roundRect(x + s * 7 - 22, H - 10, 44, 10, 3).fill(0x395354);
    if (housingOcean) drawDockBrace(g, cx, 0, s);
    else g.moveTo(x + s * 5, H - 33).lineTo(cx + s * 102, 105).stroke({ color: 0x3f6a65, width: 9 });
    const clamp = cx + s * 74;
    g.poly([clamp - 6, 103, clamp + 6, 103, clamp + 6, 137, clamp - s * 16, 151,
      clamp - s * 21, 145, clamp - 6, 134]).fill(0x816954);
    g.circle(clamp, 137, 5).fill(0xaea98e);
    for (const y of [152, 194]) {
      windows.roundRect(x - 5, y, 10, 4, 2).fill(0xffbd72);
      windowGlow.ellipse(x, y + 2, 12, 10).fill({ color: 0xffb76e, alpha: 0.35 });
    }
  }
  g.moveTo(13, 97).lineTo(23, 40).quadraticCurveTo(30, 16, 66, 15).lineTo(W - 66, 15)
    .quadraticCurveTo(W - 30, 16, W - 23, 40).lineTo(W - 13, 97).lineTo(W - 13, 109)
    .lineTo(cx + 72, 109).lineTo(cx + 64, 82).lineTo(cx - 64, 82).lineTo(cx - 72, 109)
    .lineTo(13, 109).closePath().fill(pressureShell);
  g.moveTo(33, 40).quadraticCurveTo(35, 24, 70, 24).lineTo(W - 70, 24).quadraticCurveTo(W - 35, 24, W - 33, 40)
    .stroke({ color: 0xc6bf9e, width: 2, alpha: 0.72 });
  drawPressureRib(g, 88, 22, 83, 10);
  drawPressureRib(g, W - 98, 22, 83, 10);
  for (const x of [29, W - 81]) {
    drawHabitatFrame(g, { x, y: 55, w: 52, h: 25 }, 5);
    windows.roundRect(x + 3, 59, 46, 16, 3).fill({ color: 0xffcb88, alpha: 0.6 });
    windowGlow.ellipse(x + 26, 68, 34, 20).fill({ color: 0xffc081, alpha: 0.26 });
  }
  g.roundRect(cx - POOL_HALF_WIDTH, 44, POOL_HALF_WIDTH * 2, POOL_SURFACE_Y - 43, 8).fill(0x19383d);
  g.rect(cx - POOL_HALF_WIDTH + 4, POOL_SURFACE_Y, (POOL_HALF_WIDTH - 4) * 2, 3).fill({ color: 0x7baca5, alpha: 0.42 });
  g.rect(cx - 55, 49, 110, 4).fill(0x687e73);
  g.roundRect(cx - 18, 47, 36, 14, 3).fill(0x97704e);
  g.moveTo(cx, 61).lineTo(cx, 79).stroke({ color: 0xadbaaa, width: 2 });
  const ladder = cx + POOL_LADDER_X;
  for (const x of [ladder - 9, ladder + 9]) {
    g.moveTo(x, 59).lineTo(x, 121).stroke({ color: 0x94876a, width: 3 });
  }
  for (let y = 63; y < 121; y += 9) {
    g.moveTo(ladder - 9, y).lineTo(ladder + 9, y).stroke({ color: 0xbba480, width: 2.5 });
  }
  g.moveTo(cx - 74, 108).lineTo(cx - 64, 82).lineTo(cx + 64, 82).lineTo(cx + 74, 108)
    .stroke({ color: 0xcf9c65, width: 4, alpha: 0.86, join: 'round' });
  for (const x of [cx - 49, cx + 49]) {
    windows.rect(x - 7, 81, 14, 3).fill({ color: 0xffdb9e, alpha: 0.92 });
    windowGlow.ellipse(x, 95, 22, 18).fill({ color: 0xffcd8e, alpha: 0.25 });
  }
  body.addChild(stencil(`MP-${n} · MOONPOOL`, cx, 34, 9));
  body.addChild(stencil('KS-1', W - 54, 94, 6));
  return { body, windows, windowGlow, lamp: { x: cx + 44, y: 32 } };
}

function drawDock(n: number): PieceArt {
  const W = CELL * 3;
  const H = CELL * 2;
  const HALL = CELL; // the hall is the top row
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const cy = HALL / 2;
  // Collar stubs on the hall.
  tubeH(g, 0, 20, cy, 1);
  tubeH(g, W - 20, W, cy, 1);
  // Berth: pillars and bracing (behind), down to the bottom of the footprint.
  for (const x of [14, W - 34]) {
    g.rect(x, HALL, 20, H - HALL).fill({ color: PAL.steelDark });
    g.rect(x, HALL, 5, H - HALL).fill({ color: 0xffffff, alpha: 0.1 });
    hazardBand(g, x, HALL + 14, 20, 8);
    rivets(g, x + 10, HALL + 30, x + 10, H - 8, 6);
    g.roundRect(x - 6, H - 8, 32, 8, 2).fill({ color: PAL.steel });
  }
  g.moveTo(34, HALL + 10).lineTo(70, H - 10).moveTo(W - 34, HALL + 10).lineTo(W - 70, H - 10);
  g.stroke({ color: PAL.steelDark, width: 3, alpha: 0.75 });
  // Hall shell: a long drum with a curved roof.
  g.roundRect(18, 10, W - 36, HALL - 6, 26).fill({ color: PAL.steel });
  g.roundRect(18, 10, W - 36, 10, 6).fill({ color: 0xffffff, alpha: 0.12 });
  g.rect(18, HALL - 22, W - 36, 18).fill({ color: PAL.steelDeep, alpha: 0.4 });
  hazardBand(g, 24, 30, W - 48, 7);
  for (const sx of [70, 130, W - 130, W - 70]) {
    g.moveTo(sx, 14).lineTo(sx, HALL).stroke({ color: PAL.steelDeep, width: 1, alpha: 0.6 });
    rivets(g, sx + 4, 18, sx + 4, HALL - 6, 7);
  }
  // Portholes.
  for (const px of [52, W - 52]) {
    porthole(g, px, 62, 11);
    windows.circle(px, 62, 10).fill({ color: 0xffe2a8, alpha: 0.85 });
    windowGlow.circle(px, 62, 22).fill({ color: PAL.warm, alpha: 0.32 });
  }
  // The pool: an opening in the hall floor, with water light rippling inside.
  const p0 = W / 2 - 70;
  const p1 = W / 2 + 70;
  g.rect(18, HALL - 8, W - 36, 14).fill({ color: PAL.steelDark });
  g.rect(18, HALL - 8, W - 36, 2.5).fill({ color: 0xffffff, alpha: 0.14 });
  g.rect(p0, 40, p1 - p0, HALL - 34).fill({ color: 0x0f2a33 });
  g.rect(p0, 40, p1 - p0, 4).fill({ color: PAL.yellow });
  for (const x of [p0 - 8, p1]) {
    g.rect(x, 36, 8, HALL - 30).fill({ color: PAL.steelDark });
    rivets(g, x + 4, 42, x + 4, HALL, 5);
  }
  windows.rect(p0 + 4, 46, p1 - p0 - 8, 3).fill({ color: 0xbfe0d8, alpha: 0.55 });
  windowGlow.rect(p0, 40, p1 - p0, 20).fill({ color: 0xffe0b0, alpha: 0.2 });
  // Clamp arms hanging from the floor edges, down into the berth.
  for (const [x, s] of [
    [p0 - 4, -1],
    [p1 + 4, 1],
  ] as const) {
    g.rect(x - 4, HALL + 4, 8, 22).fill({ color: PAL.steelDark });
    g.poly([x - 4, HALL + 26, x + 4, HALL + 26, x - s * 8, HALL + 40, x - s * 14, HALL + 36]).fill({ color: PAL.yellow });
    g.circle(x, HALL + 26, 3).fill({ color: PAL.steelLight });
  }
  // Crane rail and hook block over the pool.
  g.rect(p0 - 20, 22, p1 - p0 + 40, 5).fill({ color: PAL.steelDark });
  g.roundRect(W / 2 - 12, 26, 24, 9, 2).fill({ color: PAL.yellow });
  g.moveTo(W / 2, 35).lineTo(W / 2, 44).stroke({ color: 0x9aa3a5, width: 1.2 });
  g.moveTo(W / 2 - 3, 44).quadraticCurveTo(W / 2 - 4, 49, W / 2, 49).quadraticCurveTo(W / 2 + 3, 49, W / 2 + 2, 46).stroke({ color: PAL.steelLight, width: 1.6 });
  // Amber guide lamps on the pillars.
  for (const [x, y] of [
    [24, HALL + 54],
    [W - 24, HALL + 54],
    [24, HALL + 84],
    [W - 24, HALL + 84],
  ]) {
    g.circle(x, y, 4).fill({ color: PAL.steelDeep });
    windows.circle(x, y, 2.6).fill({ color: 0xffc060 });
    windowGlow.circle(x, y, 10).fill({ color: 0xffb040, alpha: 0.6 });
  }
  body.addChild(stencil(`MP-${n}`, W / 2, 16, 8));
  body.addChild(stencil('MOON POOL', 100, 74, 5));
  body.addChild(stencil('CLEAR BERTH', W - 100, 74, 5));
  streaks(g, 24, W - 24, 36, 12, 20);
  streaks(g, 24, W - 24, HALL, 8, 16);
  scratches(g, 22, 14, W - 22, HALL - 8, 14);
  algaeLine(g, 22, W - 22, HALL + 4, 20);
  algaeLine(g, 30, W - 30, 12, 8);
  algaeLine(g, 8, 40, H - 4, 5);
  algaeLine(g, W - 40, W - 8, H - 4, 5);
  return { body, windows, windowGlow, lamp: { x: W / 2 + 40, y: 16 } };
}

/**
 * Lab (milestone 7): a squat pressure capsule with one big glass port. Inside,
 * a lit analysis bench with a sample rack and a reader for data cartridges;
 * on the roof a short aerial mast. The reader's screen and the bench lamp
 * light up with power, and a scan bar sweeps the screen while it decodes.
 */
function drawLab(n: number, livingBases: boolean): PieceArt {
  const W = CELL;
  const H = CELL;
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const c = W / 2;
  tubeH(g, 0, 18, 66, 1);
  tubeH(g, W - 18, W, 66, 1);
  tubeV(g, 0, 18, c, 1);
  // Shell: a rounded drum on a skirt.
  drawMachineShell(g, 12, 18, W - 24, H - 30, 22, livingBases);
  g.roundRect(18, 22, 10, H - 42, 5).fill({ color: 0xffffff, alpha: 0.12 });
  g.roundRect(W - 34, 22, 16, H - 42, 8).fill({ color: PAL.steelDeep, alpha: 0.4 });
  g.roundRect(8, H - 18, W - 16, 10, 3).fill({ color: PAL.steelDark });
  hazardBand(g, 12, H - 28, W - 24, 6);
  rivets(g, 20, 26, W - 20, 26, 7);
  // The big port: glass over a lit bench.
  const px = c;
  const py = 58;
  const pr = 26;
  g.circle(px, py, pr + 5).fill({ color: PAL.brass });
  g.circle(px, py, pr + 5).stroke({ color: 0x5a4a2a, width: 1 });
  g.circle(px, py, pr).fill({ color: 0x14242a });
  // Bench, sample rack (little jars) and the cartridge reader inside.
  g.rect(px - 20, py + 8, 40, 4).fill({ color: PAL.steelDark });
  for (let i = 0; i < 4; i++) {
    g.roundRect(px - 18 + i * 6, py - 2, 4, 10, 1.5).fill({ color: [0x9aa84a, 0xd8a060, 0x86b3ae, 0xc8c0a8][i], alpha: 0.85 });
  }
  g.roundRect(px + 4, py - 12, 15, 12, 2).fill({ color: PAL.steelDark });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.circle(px + Math.cos(a) * (pr + 3), py + Math.sin(a) * (pr + 3), 1).fill({ color: 0x3a3020 });
  }
  // Screen and bench lamp (lit with power).
  windows.rect(px + 6, py - 10, 11, 8).fill({ color: 0xd8f0a0, alpha: 0.9 });
  windows.circle(px - 10, py - 14, 2.6).fill({ color: 0xfff1d0 });
  windowGlow.circle(px, py, pr + 4).fill({ color: PAL.warm, alpha: 0.28 });
  // Glass highlight over the port.
  g.ellipse(px - 9, py - 11, 9, 5).fill({ color: 0xffffff, alpha: 0.16 });
  // Roof mast with a little dish.
  g.rect(W - 36, 4, 3, 16).fill({ color: PAL.steelDark });
  g.moveTo(W - 42, 6).quadraticCurveTo(W - 34, 12, W - 26, 6).stroke({ color: PAL.steelLight, width: 2 });
  body.addChild(stencil(`LAB-${n}`, c, 33, 6));
  streaks(g, 16, W - 16, 30, 8, 16);
  scratches(g, 14, 20, W - 14, H - 20, 8);
  algaeLine(g, 14, W - 14, H - 10, 14);
  // A scan bar that sweeps the screen while the Lab decodes (moved by BaseView).
  const scan = new Graphics().rect(0, 0, 11, 1.6).fill({ color: 0xffffff, alpha: 0.9 });
  scan.position.set(px + 6, py - 10);
  windows.addChild(scan);
  return { body, windows, windowGlow, lamp: { x: 26, y: 26 }, station: { bar: scan, y0: py - 10, h: 8 } };
}

/**
 * Workshop (milestone 7): a low riveted shed with a roll-up door, a
 * fabrication arm on a rail inside, a parts rack and a work lamp. The arm
 * swings and its torch flickers while gear is being built.
 */
function drawWorkshop(n: number, livingBases: boolean): PieceArt {
  const W = CELL * 2;
  const H = CELL;
  const body = new Container();
  const g = body.addChild(new Graphics());
  const windows = new Graphics();
  const windowGlow = new Graphics();
  const cy = H / 2;
  tubeH(g, 0, 16, cy, 1);
  tubeH(g, W - 16, W, cy, 1);
  // Shed shell with a gently curved roof.
  drawMachineShell(g, 10, 12, W - 20, H - 22, 14, livingBases);
  g.roundRect(10, 12, W - 20, 9, 6).fill({ color: PAL.yellow });
  g.rect(10, 19, W - 20, 3).fill({ color: PAL.yellowDark, alpha: 0.7 });
  g.rect(10, H - 22, W - 20, 12).fill({ color: PAL.steelDeep, alpha: 0.4 });
  rivets(g, 18, 28, W - 18, 28, 14);
  for (const sx of [64, W - 64]) {
    g.moveTo(sx, 22).lineTo(sx, H - 12).stroke({ color: PAL.steelDeep, width: 1, alpha: 0.6 });
  }
  // The bay: an opening with the door rolled half up.
  const bx = 70;
  const bw = W - 140;
  g.rect(bx, 34, bw, H - 48).fill({ color: 0x182226 });
  g.rect(bx, 30, bw, 8).fill({ color: PAL.steelDark });
  for (let k = 0; k < 3; k++) g.rect(bx, 30 + k * 3, bw, 1).fill({ color: 0x000000, alpha: 0.25 });
  // Rail along the top of the bay; parts rack at the back.
  g.rect(bx + 2, 40, bw - 4, 3).fill({ color: PAL.steelLight });
  for (let i = 0; i < 3; i++) {
    g.rect(bx + 6, 52 + i * 12, 16, 2).fill({ color: PAL.steelDark });
    g.rect(bx + 8, 47 + i * 12, 5, 5).fill({ color: [PAL.rust, PAL.brass, PAL.steelLight][i] });
  }
  // A bench at the front of the bay.
  g.rect(bx + 24, H - 30, bw - 30, 5).fill({ color: PAL.steelDark });
  g.rect(bx + 26, H - 25, 3, 10).fill({ color: PAL.steelDark });
  g.rect(bx + bw - 12, H - 25, 3, 10).fill({ color: PAL.steelDark });
  // The fabrication arm (it swings while building).
  const arm = new Container();
  const ag = arm.addChild(new Graphics());
  ag.roundRect(-5, -3, 10, 7, 2).fill({ color: PAL.yellow });
  ag.moveTo(0, 2).lineTo(6, 16).lineTo(-2, 26).stroke({ color: PAL.steelLight, width: 3, cap: 'round', join: 'round' });
  ag.circle(6, 16, 2.4).fill({ color: PAL.steelDark });
  ag.poly([-5, 25, 1, 25, -2, 31]).fill({ color: PAL.steelDark });
  arm.position.set(bx + bw / 2 + 6, 42);
  body.addChild(arm);
  // Side panels: a vent grille and a tool board.
  for (let i = 0; i < 5; i++) g.rect(22, 38 + i * 7, 36, 3).fill({ color: PAL.steelDark });
  g.roundRect(W - 58, 38, 38, 36, 3).fill({ color: PAL.steelDark });
  g.circle(W - 46, 50, 4).stroke({ color: PAL.rust, width: 2 });
  g.rect(W - 36, 44, 3, 22).fill({ color: PAL.steelLight });
  g.rect(W - 30, 46, 6, 3).fill({ color: PAL.brass });
  body.addChild(stencil(`WS-${n}`, W / 2, 16, 7));
  body.addChild(stencil('WORKSHOP', 40, 80, 4.5));
  streaks(g, 14, W - 14, 22, 12, 18);
  scratches(g, 12, 14, W - 12, H - 14, 10);
  algaeLine(g, 14, W - 14, H - 10, 22);
  algaeLine(g, 14, W - 14, 13, 10);
  // Work lamp in the bay (with power) and the torch spark (while building).
  windows.circle(bx + 14, 38, 2.6).fill({ color: 0xfff1d0 });
  windowGlow.circle(bx + bw / 2, 62, 46).fill({ color: PAL.warm, alpha: 0.2 });
  const torch = new Graphics().circle(0, 0, 2.2).fill({ color: 0xfff0c0 });
  windows.addChild(torch);
  return { body, windows, windowGlow, lamp: { x: W - 22, y: 30 }, station: { arm, torch, armAt: { x: bx + bw / 2 + 6, y: 42 } } };
}

/** Draw a piece's art. The same drawing is used for placed pieces and the build ghost. */
export function drawPiece(kind: PieceKind, n: number, rot: number, seed: number, livingBases = false, housingOcean = livingBases): PieceArt {
  rand = mulberry32(WORLD_SEED ^ (seed * 7919 + 0x1b5e));
  if (kind === 'dome') return livingBases ? drawKestrelHabitat(n) : drawDome(n);
  if (kind === 'corridor') return livingBases ? drawPressureCorridor(n, rot) : drawCorridor(n, rot);
  if (kind === 'shaft') return drawShaft(n, livingBases);
  if (kind === 'junction') return drawJunction(n);
  if (kind === 'lantern') return drawLantern(n);
  if (kind === 'bracket') return drawBracket(n, rot);
  if (kind === 'turbine') return drawTurbine(n, livingBases);
  if (kind === 'thermal') return drawThermal(n, livingBases);
  if (kind === 'tank' || kind === 'gtank') return drawTank(n, kind === 'gtank', livingBases);
  if (kind === 'sorter') return drawSorter(n, livingBases);
  if (kind === 'recomp') return drawRecomp(n);
  if (kind === 'crane') return drawCrane(n, livingBases);
  if (kind === 'hatch') return drawHatchery(n, livingBases);
  if (kind === 'farm') return drawFarm(n);
  if (kind === 'revive') return drawRevive(n, livingBases);
  if (kind === 'signal') return drawSignal(n, livingBases);
  if (kind === 'filter') return drawFilter(n, livingBases);
  if (kind === 'feeder') return drawFeeder(n, livingBases);
  if (kind === 'press') return drawPress(n);
  if (kind === 'dock') return livingBases ? drawPressureDock(n, housingOcean) : drawDock(n);
  if (kind === 'lab') return drawLab(n, livingBases);
  if (kind === 'workshop') return drawWorkshop(n, livingBases);
  return drawStorage(n, livingBases);
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
  spin: number;
  /** While the piece is still a frame being welded by the drone. */
  frame: { mask: Graphics; scaffold: Graphics; seam: Graphics; seamGlow: Graphics; shown: number } | null;
  /** Fitted Echo whorls (milestone 5). */
  whorls: WhorlArt[];
  /** Last drawn feeder levels. */
  levelKey: string;
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
  /** G4: strength of the dome glass streak (0 = off). Set by the game each frame. */
  glassStreak = 1;
  readonly emissive = new Container();
  readonly glow = new Container();
  readonly lights: PointLight[] = [];

  private legs = new Graphics();
  private collarG = new Graphics();
  private pieceLayer = new Container();
  private whorlLayer = new Container();
  private live = new Map<number, Live>();
  private sparks: Spark[] = [];

  constructor(private readonly livingBases = false, private readonly housingOcean = livingBases) {
    this.view.addChild(this.legs, this.pieceLayer, this.collarG, this.whorlLayer);
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
      for (const w of l.whorls) this.dropWhorl(w);
      this.live.delete(id);
    }
    const counts: Record<PieceKind, number> = { dome: 0, corridor: 0, turbine: 0, storage: 0, tank: 0, filter: 0, feeder: 0, press: 0, dock: 0, lab: 0, workshop: 0, gtank: 0, sorter: 0, recomp: 0, crane: 0, hatch: 0, farm: 0, revive: 0, shaft: 0, junction: 0, bracket: 0, signal: 0, lantern: 0, thermal: 0 };
    for (const p of [...layout.pieces].sort((a, b) => a.id - b.id)) {
      counts[p.kind]++;
      if (this.live.has(p.id)) continue;
      const art = drawPiece(p.kind, counts[p.kind], p.rot, p.id, this.livingBases, this.housingOcean);
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
        p.kind === 'dome'
          ? { x: r.x + r.w / 2, y: r.y + r.h - 130, radius: 330, intensity: 0, color: [1, 0.86, 0.66] }
          : p.kind === 'tank' || p.kind === 'gtank'
            ? { x: r.x + r.w / 2, y: r.y + 30, radius: p.kind === 'gtank' ? 260 : 170, intensity: 0, color: [1, 0.92, 0.75] }
            : p.kind === 'dock'
              ? { x: r.x + r.w / 2, y: r.y + CELL + 40, radius: 260, intensity: 0, color: [1, 0.85, 0.6] }
              : null;
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
      this.live.set(p.id, {
        placed: p,
        art,
        root,
        lampG,
        lampHalo,
        light,
        build: isFresh ? 0 : 1,
        phase: rand() * 10,
        powered: false,
        fill: -1,
        spin: 0,
        frame,
        whorls: [],
        levelKey: '',
      });
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
          const bot = below >= 0 ? GRID_BASE - (below + 1) * CELL : groundY(Math.max(WORLD_X0, Math.min(WORLD_W, lx))) + 6;
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
        if (k.dir === 'D' && onSeabed(k.gx, k.gy)) continue;
        drawCollar(c, k, layout.isJoined(k));
      }
  }

  private dropWhorl(w: WhorlArt): void {
    w.shell.destroy();
    w.light.destroy({ children: true });
    w.halo.destroy();
  }

  /** Show the Echo whorls fitted to each piece, side by side at its whorl spot. */
  private syncWhorls(l: Live, n: number): void {
    while (l.whorls.length > n) this.dropWhorl(l.whorls.pop()!);
    const at = l.art.whorlAt;
    if (!at) return;
    while (l.whorls.length < n) {
      const w = new WhorlArt(0.8);
      this.whorlLayer.addChild(w.shell);
      this.emissive.addChild(w.light);
      this.glow.addChild(w.halo);
      l.whorls.push(w);
    }
    const r = pieceRect(l.placed);
    l.whorls.forEach((w, i) => w.setPosition(r.x + at.x - i * 17, r.y + at.y));
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
  update(
    dt: number,
    time: number,
    layout: BaseLayout,
    storedFrac: number,
    viewX0: number,
    viewX1: number,
    weldId: number | null = null,
    readings: PieceReadings | null = null,
  ): void {
    const visible = viewX1 > GRID_X0 - 300 && viewX0 < GRID_X0 + GRID_COLS * CELL + 300;
    this.view.visible = this.front.visible = visible;
    for (const l of this.live.values()) {
      if (readings) {
        const n = l.frame ? 0 : readings.whorls(l.placed.id);
        if (n !== l.whorls.length) this.syncWhorls(l, n);
        for (const w of l.whorls) w.pulse(time, l.powered ? 1 : 0.4);
        const lv = l.art.levels;
        const f = lv && !l.frame ? readings.feeder(l.placed.id) : null;
        if (lv && f) {
          const key = `${f.hopper.toFixed(2)}|${f.mash.toFixed(2)}`;
          if (key !== l.levelKey) {
            l.levelKey = key;
            const g = lv.g.clear();
            const hb = lv.hopper;
            const hh = hb.h * f.hopper;
            if (hh > 0.5) {
              g.rect(hb.x, hb.y + hb.h - hh, hb.w, hh).fill({ color: 0xb8923f });
              for (let i = 0; i < hb.w; i += 4) g.rect(hb.x + i, hb.y + hb.h - hh, 2, Math.min(hh, 6)).fill({ color: 0xe0c070, alpha: 0.8 });
            }
            const mb = lv.mash;
            const mh = mb.h * f.mash;
            if (mh > 0.5) {
              g.rect(mb.x, mb.y + mb.h - mh, mb.w, mh).fill({ color: 0x9aa84a });
              g.rect(mb.x, mb.y + mb.h - mh, mb.w, 2).fill({ color: 0xd8e6a0 });
            }
          }
          if (l.art.rotor) l.art.rotor.rotation += dt * (f.run && l.powered ? 2.4 : 0);
        }
        if (l.art.streak) {
          // Slow: a pass across the dome every twenty seconds or so, then a pause.
          const span = l.art.streakSpan ?? 200;
          const t = ((time * 0.05 + l.phase) % 1) * 1.6;
          l.art.streak.x = t < 1 ? t * span : span * 2;
          l.art.streak.alpha = this.glassStreak;
        }
        const st = l.art.station;
        if (st && !l.frame) {
          const run = !!readings.station?.(l.placed.id) && l.powered;
          if (st.bar) {
            st.bar.visible = run;
            st.bar.y = (st.y0 ?? 0) + ((time * 0.9 + l.phase) % 1) * (st.h ?? 8);
          }
          if (st.arm && st.torch && st.armAt) {
            const a = run ? Math.sin(time * 1.7 + l.phase) * 0.5 : 0.15;
            st.arm.x = st.armAt.x + (run ? Math.sin(time * 0.6 + l.phase) * 30 : 0);
            st.arm.rotation = a;
            // The torch tip, in the piece's local space.
            const tx = -2 * Math.cos(a) - 29 * Math.sin(a);
            const ty = -2 * Math.sin(a) + 29 * Math.cos(a);
            st.torch.position.set(st.arm.x + tx, st.armAt.y + ty);
            st.torch.visible = run && Math.sin(time * 41 + l.phase) > -0.3;
            if (run && Math.random() < dt * 6) {
              const r = l.root;
              this.burst(r.x + st.torch.x, r.y + st.torch.y, 6, 6, 3);
            }
          }
        }
        const pa = l.art.press;
        const pr = pa && !l.frame ? readings.press(l.placed.id) : null;
        if (pa && pr) {
          const key = `${pr.scrap.toFixed(2)}|${pr.copper.toFixed(2)}|${pr.plates}`;
          if (key !== l.levelKey) {
            l.levelKey = key;
            const g = pa.g.clear();
            for (const [b, v, col, hi] of [
              [pa.scrap, pr.scrap, 0x7a5a48, 0xa8402e],
              [pa.copper, pr.copper, 0x6e5440, 0x5f9a72],
            ] as const) {
              const h = b.h * v;
              if (h > 0.5) {
                g.rect(b.x, b.y + b.h - h, b.w, h).fill({ color: col });
                for (let i = 1; i < b.w; i += 4) g.circle(b.x + i + 1, b.y + b.h - h + 2, 1.6).fill({ color: hi, alpha: 0.8 });
              }
            }
            for (let i = 0; i < pr.plates; i++) {
              const y = pa.rack.y - 6 - i * 7;
              g.rect(pa.rack.x, y, pa.rack.w, 6).fill({ color: 0x8e9a9c });
              g.rect(pa.rack.x, y, pa.rack.w, 1.5).fill({ color: 0xffffff, alpha: 0.3 });
              g.circle(pa.rack.x + 5, y + 3.5, 1).fill({ color: PAL.steelDeep });
              g.circle(pa.rack.x + pa.rack.w - 5, y + 3.5, 1).fill({ color: PAL.steelDeep });
            }
          }
          // The ram creeps down as a stroke builds, slams on each plate, then lifts.
          const slam = pr.since < 0.25 ? 1 : pr.since < 1.2 ? 1 - (pr.since - 0.25) / 0.95 : 0;
          const creep = pr.run && l.powered ? pr.progress * 0.35 : 0;
          const down = Math.max(slam, creep);
          pa.ram.y = 40 + down * 18;
          if (pr.since < dt + 0.001 && l.powered) {
            const r = pieceRect(l.placed);
            this.burst(r.x + r.w / 2, r.y + r.h - 40, 50, 6, 14);
          }
        }
      }
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
      if (l.art.rotor && l.placed.kind !== 'feeder') {
        if (l.placed.kind === 'filter') {
          // The filter impeller only spins with power.
          l.spin += dt * (powered && !l.frame ? 9 : 0);
          l.art.rotor.rotation = l.spin;
        } else l.art.rotor.rotation = time * 1.6 + Math.sin(time * 0.4 + l.phase) * 0.4 + l.phase;
      }
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
  // Milestone 7 part 2: each sorting pod adds a bay of SORT_BAY for every material.
  return layout.countDone('storage') * STORAGE_PER_POD + layout.countDone('sorter') * SORT_BAY * MATERIAL_ORDER.length;
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

  private links = new Graphics();
  private ports = new Graphics();

  constructor(private readonly livingBases = false, private readonly housingOcean = livingBases) {
    this.view.addChild(this.grid, this.links, this.ghostRoot, this.ghostOutline, this.marks, this.select, this.ports);
    this.view.visible = false;
    // Faint cell corners over open water, drawn once (the site is big).
    const g = this.grid;
    for (let gx = 0; gx <= GRID_COLS; gx++)
      for (let gy = 0; gy <= GRID_ROWS; gy++) {
        if (!cellOpen(gx, gy) && !cellOpen(gx - 1, gy) && !cellOpen(gx, gy - 1) && !cellOpen(gx - 1, gy - 1)) continue;
        const x = GRID_X0 + gx * CELL;
        const y = GRID_BASE - gy * CELL;
        g.moveTo(x - 6, y).lineTo(x + 6, y).moveTo(x, y - 6).lineTo(x, y + 6);
      }
    g.stroke({ color: 0xfff1d0, width: 1.5, alpha: 0.35 });
    // The edge of the site: along the top and sides, and around the rock under the shelf.
    for (let gx = 0; gx < GRID_COLS; gx++)
      for (let gy = 0; gy < GRID_ROWS; gy++) {
        if (!cellOpen(gx, gy)) continue;
        const x = GRID_X0 + gx * CELL;
        const y = GRID_BASE - (gy + 1) * CELL;
        if (!cellOpen(gx - 1, gy)) g.moveTo(x, y).lineTo(x, y + CELL);
        if (!cellOpen(gx + 1, gy)) g.moveTo(x + CELL, y).lineTo(x + CELL, y + CELL);
        if (!cellOpen(gx, gy + 1)) g.moveTo(x, y).lineTo(x + CELL, y);
        if (gy > 0 && !cellOpen(gx, gy - 1)) g.moveTo(x, y + CELL).lineTo(x + CELL, y + CELL);
      }
    g.stroke({ color: 0xfff1d0, width: 2, alpha: 0.22 });
  }

  /**
   * link: a conveyor or pipe being drawn (milestone 5): where it would run,
   * whether it can, and the pieces it could go to. line: the selected line's path.
   */
  update(
    time: number,
    layout: BaseLayout,
    ghost: { kind: PieceKind; gx: number; gy: number; rot: number; ok: boolean } | null,
    selected: Placed | null,
    link: {
      from: Placed;
      other?: Placed | null;
      targets: Placed[];
      route: [number, number][] | null;
      ok: boolean;
      drag?: { x0: number; y0: number; x1: number; y1: number; kind: 'belt' | 'pipe' };
    } | null = null,
    line: [number, number][] | null = null,
    markers: { piece: Placed; kind: 'belt' | 'pipe'; x: number; y: number; px: number; py: number; out: boolean; in: boolean }[] = [],
    markScale = 1,
  ): void {
    const lg = this.links;
    lg.clear();
    // After milestone 12: port markers on pieces that take or send lines (amber conveyors, teal pipes; ▲ out, ▼ in).
    const pk = this.ports.clear();
    if (!ghost) {
      const k = markScale;
      for (const m of markers) {
        const col = m.kind === 'belt' ? 0xffb040 : 0x3cd8e8;
        const isAnchor = !!link && link.from.id === m.piece.id && (!link.drag || link.drag.kind === m.kind);
        const isTarget = !!link && link.targets.some((t) => t.id === m.piece.id) && (link.drag ? link.drag.kind === m.kind : true);
        const isSnap = isTarget && !!link?.other && link.other.id === m.piece.id;
        const dim = !!link && !isAnchor && !isTarget;
        const r = (isAnchor || isSnap ? 15 : 12) * k * (isTarget && !isSnap ? 1 + 0.12 * Math.sin(time * 6) : 1);
        const a = dim ? 0.25 : 0.95;
        // A stem down to the port it stands for (markers are spread apart, so it may lean).
        pk.moveTo(m.x, m.y + r).lineTo(m.px, m.py - 4).stroke({ color: col, width: 2 * k, alpha: a * 0.7 });
        if (isSnap) pk.circle(m.x, m.y, r + 7 * k).stroke({ color: 0xffffff, width: 2.5 * k, alpha: 0.9 });
        pk.circle(m.x, m.y, r + 2.5 * k).fill({ color: 0x0a1418, alpha: a * 0.85 });
        pk.circle(m.x, m.y, r).fill({ color: col, alpha: a });
        const t = r * 0.5;
        const tri = (dy: number, up: boolean) =>
          pk.poly(up ? [m.x - t, m.y + dy + t * 0.55, m.x + t, m.y + dy + t * 0.55, m.x, m.y + dy - t * 0.65] : [m.x - t, m.y + dy - t * 0.55, m.x + t, m.y + dy - t * 0.55, m.x, m.y + dy + t * 0.65]).fill({ color: 0x0a1418, alpha: a });
        if (m.out && m.in) {
          tri(-r * 0.32, true);
          tri(r * 0.36, false);
        } else tri(0, m.out);
      }
    }
    if (link?.drag) {
      const d = link.drag;
      const col = d.kind === 'belt' ? 0xffb040 : 0x3cd8e8;
      // Snapped to a target: the band thins (the route shows where the line will run).
      const snapped = !!link.route;
      lg.moveTo(d.x0, d.y0).lineTo(d.x1, d.y1).stroke({ color: col, width: (snapped ? 2.5 : 5) * markScale, alpha: snapped ? 0.45 : 0.75, cap: 'round' });
      lg.circle(d.x1, d.y1, 7 * markScale).fill({ color: col, alpha: 0.9 });
    }
    if (link) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 5);
      for (const t of link.targets) {
        const r = pieceRect(t);
        if (link.other && link.other.id === t.id) {
          // The piece the line will go to: filled and solid, so it is clear before letting go.
          lg.roundRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, 10).fill({ color: 0xd8e6a0, alpha: 0.16 });
          lg.roundRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, 10).stroke({ color: link.ok ? 0xd8e6a0 : 0xe05a40, width: 4 * Math.max(1, markScale * 0.7), alpha: 0.95 });
          continue;
        }
        lg.roundRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 8).stroke({ color: 0xd8e6a0, width: 2.5 * Math.max(1, markScale * 0.6), alpha: 0.35 + 0.5 * pulse });
      }
      const fr = pieceRect(link.from);
      lg.roundRect(fr.x - 5, fr.y - 5, fr.w + 10, fr.h + 10, 8).stroke({ color: 0xffc070, width: 3 });
      if (link.route) dashed(lg, link.route, time, link.ok ? 0xd8e6a0 : 0xe05a40);
    }
    if (line) dashed(lg, line, time, 0xffc070);

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
        const art = drawPiece(ghost.kind, 0, ghost.rot, 99, this.livingBases, this.housingOcean);
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

/** A marching dashed path, for line previews and the selected line. */
function dashed(g: Graphics, pts: [number, number][], time: number, color: number): void {
  for (let i = 1; i < pts.length; i++) g.moveTo(pts[i - 1][0], pts[i - 1][1]).lineTo(pts[i][0], pts[i][1]);
  g.stroke({ color, width: 16, alpha: 0.18, cap: 'round', join: 'round' });
  const off = (time * 40) % 24;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const l = Math.hypot(bx - ax, by - ay);
    if (l < 1) continue;
    for (let d = off; d < l; d += 24) {
      const e = Math.min(l, d + 12);
      g.moveTo(ax + ((bx - ax) * d) / l, ay + ((by - ay) * d) / l).lineTo(ax + ((bx - ax) * e) / l, ay + ((by - ay) * e) / l);
    }
  }
  g.stroke({ color, width: 3, alpha: 0.95, cap: 'round' });
}
