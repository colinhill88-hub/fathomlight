import { Container, Graphics, Text } from 'pixi.js';
import { DC, bolts, ceilingBeam, flangeRect, floorGrime, hazard, pipeRun, pipeUp, rivet, skirting, wallPanels } from './detail';
import type { Light } from '../fx/lighting';
import { T, type InteriorAct, type InteriorHooks } from './interior';
import { BaseLayout, collarsOf, isDone, PieceKind, PIECES, pieceCode, Placed, shapeOf } from '../game/base';
import type { CreatureData, MaterialId, PlantId, SaveData, SavedLine } from '../game/state';
import { Critter } from '../actors/critters';
import { traitsOf } from '../game/traits';
import { HATCH_CAP } from '../game/creatures';
import { WHORLS_PER_PIECE } from '../game/factory';
import { ITEM_COLOURS, pointAlong } from '../world/linegfx';
import { drawPlant, TankLife } from '../world/tanklife';
import { mulberry32, WORLD_SEED } from '../rng';

/**
 * The walkable base (after the Corvina on foot, Colin's choices): everything
 * indoors, machines included, built automatically from the pieces on the
 * build grid, so the rooms always match the layout.
 *
 *  - One grid cell becomes 8 × 6 tiles (320 × 240 units, about 4.3 m × 3.2 m).
 *    A 2 × 2 dome is a two-level hall; a 1 × 1 corridor is a short passage.
 *  - Joined side collars become doorways at floor level, through both walls
 *    (the thick chrome-flanged collar between two pieces).
 *  - Joined up/down collars become ladder shafts through floor and ceiling.
 *    Pieces two or more cells tall have a grating mezzanine and a ladder.
 *  - A frame still being welded is not a room yet: its doorway stays sealed.
 *  - You come in through a dome's airlock.
 *
 * Map letters: X water outside the hull, # hull, = grating, H ladder,
 * P the moon pool's water (the dock's lower deck), space = open air.
 */

export const CW = 8;
export const CH = 6;
/** Milestone 9: creatures and plants in the indoor tanks are drawn this much bigger than outside. */
export const TANK_SCALE = 1.45;

export interface Room {
  piece: Placed;
  kind: PieceKind;
  /** Top-left tile and size in tiles. */
  tx0: number;
  ty0: number;
  tw: number;
  th: number;
  /** Size in grid cells. */
  w: number;
  h: number;
}

export interface BaseLevel {
  map: string[];
  rooms: Room[];
  /** Doorways in side walls (tile of the wall, floor tile row), and whether they're sealed. */
  doors: { tx: number; floorTy: number; dir: 'L' | 'R'; sealed: boolean; other: Placed }[];
  /** Ladder holes in floors and ceilings that are sealed (the piece beyond is a frame). */
  hatches: { tx: number; ty: number; other: Placed }[];
  /** Open collars on the outside of the base: drawn as portholes onto the water. */
  ports: { x: number; y: number }[];
  airlocks: { id: number; x: number; y: number }[];
  /** Lift pads at both ends of a shaft taller than 3 cells (part 2). */
  lifts: { x: number; y: number; toX: number; toY: number; up: boolean }[];
  /** Changes when the rooms change (a piece finished, added or removed). */
  signature: string;
}

export function baseSignature(layout: BaseLayout): string {
  return layout.pieces
    .filter(isDone)
    .map((p) => `${p.id}:${p.kind}:${p.gx},${p.gy},${p.rot}`)
    .join('|');
}

export function buildBaseLevel(layout: BaseLayout): BaseLevel | null {
  const done = layout.pieces.filter(isDone);
  if (!done.some((p) => p.kind === 'dome')) return null;
  let gx0 = Infinity;
  let gx1 = -Infinity;
  let gy0 = Infinity;
  let gy1 = -Infinity;
  for (const p of done) {
    const s = shapeOf(p);
    gx0 = Math.min(gx0, p.gx);
    gx1 = Math.max(gx1, p.gx + s.w);
    gy0 = Math.min(gy0, p.gy);
    gy1 = Math.max(gy1, p.gy + s.h);
  }
  // A little water all round.
  const M = 3;
  const W = (gx1 - gx0) * CW + M * 2;
  const H = (gy1 - gy0) * CH + M * 2;
  const m: string[][] = [];
  for (let y = 0; y < H; y++) m.push(new Array(W).fill('X'));
  const col = (gx: number) => (gx - gx0) * CW + M;
  /** Top tile row of grid row gy (gy counts up from the seabed). */
  const row = (gy: number) => (gy1 - 1 - gy) * CH + M;
  const set = (tx: number, ty: number, c: string) => {
    if (ty >= 0 && ty < H && tx >= 0 && tx < W) m[ty][tx] = c;
  };
  const rooms: Room[] = [];
  for (const p of done) {
    const s = shapeOf(p);
    const r: Room = { piece: p, kind: p.kind, tx0: col(p.gx), ty0: row(p.gy + s.h - 1), tw: s.w * CW, th: s.h * CH, w: s.w, h: s.h };
    rooms.push(r);
    for (let ty = r.ty0; ty < r.ty0 + r.th; ty++) for (let tx = r.tx0; tx < r.tx0 + r.tw; tx++) set(tx, ty, '#');
    for (let ty = r.ty0 + 1; ty < r.ty0 + r.th - 1; ty++) for (let tx = r.tx0 + 1; tx < r.tx0 + r.tw - 1; tx++) set(tx, ty, ' ');
    if (r.h > 1) {
      if (p.kind === 'dock') {
        // The dock: a catwalk along the top deck, the moon pool below it.
        for (let tx = r.tx0 + 1; tx < r.tx0 + r.tw - 1; tx++) {
          set(tx, r.ty0 + CH - 1, '#');
          for (let ty = r.ty0 + CH; ty < r.ty0 + r.th - 1; ty++) set(tx, ty, 'P');
        }
      } else {
        // A grating mezzanine on each upper level, and a ladder up the left side.
        for (let k = 1; k < r.h; k++) for (let tx = r.tx0 + 1; tx < r.tx0 + r.tw - 1; tx++) set(tx, r.ty0 + k * CH - 1, '=');
        // The ladder tops out at the highest mezzanine, so you step off onto it.
        for (let ty = r.ty0 + CH - 1; ty < r.ty0 + r.th - 1; ty++) set(r.tx0 + 2, ty, 'H');
      }
    }
  }
  const doors: BaseLevel['doors'] = [];
  const hatches: BaseLevel['hatches'] = [];
  const ports: BaseLevel['ports'] = [];
  for (const r of rooms) {
    for (const c of collarsOf(r.piece)) {
      const other = layout.collarPartner(c);
      const floorTy = row(c.gy) + CH - 1;
      if (c.dir === 'L' || c.dir === 'R') {
        const tx = c.dir === 'L' ? col(c.gx) : col(c.gx) + CW - 1;
        if (!other) {
          ports.push({ x: (c.dir === 'L' ? tx + 1 : tx) * T, y: (floorTy - 2) * T });
          continue;
        }
        const open = isDone(other);
        doors.push({ tx, floorTy, dir: c.dir, sealed: !open, other });
        if (open) for (let ty = floorTy - 3; ty < floorTy; ty++) set(tx, ty, ' ');
      } else {
        const lx = col(c.gx) + CW / 2;
        if (!other) continue;
        if (!isDone(other)) {
          hatches.push({ tx: lx, ty: c.dir === 'U' ? r.ty0 : floorTy, other });
          continue;
        }
        if (c.dir === 'U') for (let ty = r.ty0; ty < floorTy; ty++) set(lx, ty, 'H');
        else set(lx, floorTy, 'H');
      }
    }
  }
  // Shafts taller than 3 cells get a lift at each end (the ladder is slow over a long climb).
  const lifts: BaseLevel['lifts'] = [];
  const roomOf = (id: number) => rooms.find((q) => q.piece.id === id)!;
  const upOf = (p: Placed) => {
    for (const c of collarsOf(p)) {
      if (c.dir !== 'U') continue;
      const o = layout.collarPartner(c);
      if (o && isDone(o)) return { o, c };
    }
    return null;
  };
  const hasBelow = (p: Placed) => collarsOf(p).some((c) => c.dir === 'D' && !!layout.collarPartner(c) && isDone(layout.collarPartner(c)!));
  for (const p of done) {
    if (hasBelow(p)) continue;
    const first = upOf(p);
    if (!first) continue;
    let cells = shapeOf(p).h;
    let top = p;
    let n = first;
    const seen = new Set([p.id]);
    for (;;) {
      if (seen.has(n.o.id)) break;
      seen.add(n.o.id);
      cells += shapeOf(n.o).h;
      top = n.o;
      const nx = upOf(n.o);
      if (!nx) break;
      n = nx;
    }
    if (cells <= 3) continue;
    const rb = roomOf(p.id);
    const rt = roomOf(top.id);
    const lxB = rb.tx0 + (first.c.gx - p.gx) * CW + CW / 2;
    const lxT = rt.tx0 + (first.c.gx - top.gx) * CW + CW / 2;
    const yB = (rb.ty0 + rb.th - 1) * T;
    const yT = (rt.ty0 + rt.th - 1) * T;
    const xB = (lxB + 2) * T + T / 2;
    const xT = (lxT + 2) * T + T / 2;
    lifts.push({ x: xB, y: yB, toX: xT, toY: yT, up: true });
    lifts.push({ x: xT, y: yT, toX: xB, toY: yB, up: false });
  }
  const airlocks = rooms
    .filter((r) => r.kind === 'dome')
    .map((r) => ({ id: r.piece.id, x: (r.tx0 + r.tw / 2) * T, y: (r.ty0 + r.th - 1) * T }));
  return { map: m.map((l) => l.join('')), rooms, doors, hatches, ports, airlocks, lifts, signature: baseSignature(layout) };
}

// ---------------------------------------------------------------------------
// The rooms' art and what you can do in them.

/** What the base rooms ask of the game. */
export interface BaseCtx {
  save: SaveData;
  layout: BaseLayout;
  carried(): number;
  storageText(): string;
  unload(pieceId: number): void;
  /** What putting the jar's creature in would say, or null with an empty jar. */
  jarLabel(tankId: number): string | null;
  deposit(tankId: number): void;
  trayCount(tankId: number): number;
  takeTray(tankId: number): void;
  tend(tankId: number): void;
  station(id: number): void;
  dock(id: number): void;
  build(): void;
  exit(domeId: number): void;
  recompress(): void;
  /** Conveyors and feed pipes, and the live flow on each (part 2). */
  lines(): SavedLine[];
  flow(id: number): { rate: number; item: MaterialId | null } | null;
  /** Ride a lift: put the walker at the other end. */
  lift(x: number, y: number): void;
  /** The moon pool: is the sub berthed in this dock, and climbing down into it. */
  subDocked(dockId: number): boolean;
  boardSub(): void;
  /** Echo whorls fitted to a machine, and how many are spare. */
  whorlsFitted(id: number): number;
  whorlsFree(): number;
  /** Fit (+1) or take out (-1) an Echo whorl, right here at the machine's console. */
  fitWhorl(id: number, step: 1 | -1): void;
  /** A one-line status for a machine. */
  status(p: Placed): string;
  /** Live machine readings for the art. */
  pressing(id: number): boolean;
  feederLevels(id: number): { hopper: number; mash: number; run: boolean };
  stationBusy(id: number): boolean;
  storedFrac(): number;
  /** Milestone 9: the Hatchery's panel, the Kelp farm's crop and tray, and the Revival pool. */
  hatchery(id: number): void;
  nursery(): CreatureData[];
  farmCrop(id: number): { name: string; grow: 'fibre' | PlantId; progress: number; tray: number; cap: number };
  farmCycle(id: number): void;
  farmTake(id: number): void;
  reviveLabel(): { ok: boolean; text: string };
  revive(id: number): void;
  /** Milestone 10: the Signal array's console (status, and reading the latest decoded fragment). */
  signalLabel(): { ok: boolean; text: string };
  signalRead(): void;
  /** 0..1 decoding progress, or -1 when idle (for the screen). */
  signalProgress(): number;
}

const COL = {
  wall: 0x2f363b,
  wallLight: 0x3a4247,
  wallDark: 0x22282c,
  seam: 0x1a1e21,
  chrome: 0xa4b0b7,
  chromeHi: 0xe4ecf0,
  chromeDark: 0x4a545a,
  gold: 0xc9a13a,
  lime: 0xc6f03a,
  limeDim: 0x6f8a1e,
  red: 0xd8392e,
  white: 0xd8dde0,
  glassSea: 0x0c3440,
  sand: 0xb7a47a,
};

function sign(text: string, x: number, y: number, size = 13, color = 0xd8dde0, alpha = 0.7): Text {
  const t = new Text({ text, style: { fontFamily: 'Courier New, monospace', fontSize: size, fill: color, fontWeight: 'bold', letterSpacing: 2 }, resolution: 3 });
  t.anchor.set(0.5);
  t.position.set(x, y);
  t.alpha = alpha;
  return t;
}

/** A gold circuit trace across a panel: right angles and a node at each end. */
function trace(g: Graphics, x0: number, y0: number, len: number, rand: () => number, alpha = 0.7): void {
  let x = x0;
  let y = y0;
  g.moveTo(x, y);
  for (let k = 0; k < 4; k++) {
    if (k % 2 === 0) x += len * (0.2 + rand() * 0.3);
    else y += (rand() < 0.5 ? -1 : 1) * (6 + rand() * 14);
    g.lineTo(x, y);
  }
  g.stroke({ color: COL.gold, width: 1.4, alpha });
  g.circle(x0, y0, 2).fill({ color: COL.gold, alpha });
  g.circle(x, y, 2).fill({ color: COL.gold, alpha });
}

interface Spot {
  room: Room;
  x: number;
  y: number;
  r: number;
  what: 'airlock' | 'planner' | 'unload' | 'tank' | 'station' | 'dock' | 'recomp' | 'info' | 'sealed' | 'lift' | 'board' | 'tune' | 'hatch' | 'farm' | 'farmtray' | 'revive' | 'signal';
  other?: Placed;
  to?: { x: number; y: number };
  up?: boolean;
}

export class BaseHooks implements InteriorHooks {
  readonly style = 'base' as const;
  spawn: { x: number; y: number };
  private spots: Spot[] = [];
  private screens: Light[] = [];
  private tanks: { room: Room; x: number; y: number; w: number; h: number }[] = [];
  private turbines: { x: number; y: number; r: number; id: number }[] = [];
  /**
   * Milestone 9 (Colin, after the interior art pass): the tanks indoors show
   * the very same creatures and plants as the tanks outside, swimming the
   * same way, drawn bigger for the room's window.
   */
  readonly tankLife: TankLife;
  /** Conveyors and feed pipes, routed through the rooms' ceilings (part 2). */
  private routes: { id: number; kind: 'belt' | 'pipe'; tier: number; pts: [number, number][]; len: number }[] = [];

  constructor(
    readonly level: BaseLevel,
    private readonly ctx: BaseCtx,
    domeId: number | null,
  ) {
    const a = level.airlocks.find((q) => q.id === domeId) ?? level.airlocks[0];
    this.spawn = { x: a.x, y: a.y };
    for (const r of level.rooms) this.planRoom(r);
    this.tankLife = new TankLife({
      boxOf: (p) => {
        const t = this.tanks.find((q) => q.room.piece.id === p.id);
        return t ? { x: t.x + 8, y: t.y + 10, w: t.w - 16, h: t.h - 16 } : null;
      },
      scale: TANK_SCALE,
      clumps: true,
      glass: false,
    });
    for (const l of level.lifts) this.spots.push({ room: level.rooms[0], x: l.x, y: l.y, r: 40, what: 'lift', to: { x: l.toX, y: l.toY }, up: l.up });
    ctx.lines().forEach((l, i) => {
      const pts = this.routeLine(l, i % 4);
      if (!pts || pts.length < 2) return;
      let len = 0;
      for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      this.routes.push({ id: l.id, kind: l.kind, tier: l.tier ?? 1, pts, len });
    });
  }

  attach(lit: Container, emissive: Container, glow: Container): void {
    lit.addChild(this.tankLife.view, this.extraLit);
    emissive.addChild(this.tankLife.emissive, this.extraEm);
    glow.addChild(this.tankLife.glow, this.extraGlow);
    this.tankLife.sync(this.ctx.save, this.ctx.layout);
  }
  /** Milestone 9: the Hatchery's eggs and young (real creatures) and the farm's crops. */
  private extraLit = new Container();
  private extraEm = new Container();
  private extraGlow = new Container();
  private nest = new Map<number, { c: Critter; stage: string }>();
  private crops = new Map<number, { key: string; plants: Container[] }>();

  /**
   * The Echo whorl socket plate on the wall by a machine's whorl console (after
   * the terrain pass): two sockets that glow when a whorl is fitted, and blink
   * softly while a spare is waiting to go in.
   */
  private whorlPlates = new Map<number, { em: Graphics; key: string }>();
  private syncWhorlPlates(time: number): void {
    for (const sp of this.spots) {
      if (sp.what !== 'tune') continue;
      const id = sp.room.piece.id;
      let pl = this.whorlPlates.get(id);
      const x = sp.x;
      const y = sp.y - 122;
      if (!pl) {
        const g = new Graphics();
        g.roundRect(x - 26, y - 15, 52, 30, 6).fill({ color: COL.wallDark });
        g.roundRect(x - 26, y - 15, 52, 30, 6).stroke({ color: COL.chrome, width: 2 });
        g.rect(x - 22, y - 12, 44, 2).fill({ color: COL.chromeHi, alpha: 0.35 });
        for (const dx of [-11, 11]) {
          g.circle(x + dx, y + 1, 8).fill({ color: 0x15191b });
          g.circle(x + dx, y + 1, 8).stroke({ color: COL.chromeDark, width: 2 });
        }
        g.moveTo(x, y - 15).lineTo(x, y - 34).stroke({ color: COL.gold, width: 1.6, alpha: 0.7 });
        this.extraLit.addChild(g);
        const em = new Graphics();
        this.extraEm.addChild(em);
        pl = { em, key: '' };
        this.whorlPlates.set(id, pl);
      }
      const n = this.ctx.whorlsFitted(id);
      const spare = this.ctx.whorlsFree() > 0;
      const blink = spare && n < WHORLS_PER_PIECE ? 0.35 + 0.35 * Math.sin(time * 3) : 0;
      const key = `${n}:${blink.toFixed(2)}`;
      if (key === pl.key) continue;
      pl.key = key;
      const em = pl.em.clear();
      [-11, 11].forEach((dx, i) => {
        if (i < n) {
          em.circle(x + dx, y + 1, 6).fill({ color: 0x8ff4ff, alpha: 0.9 });
          em.circle(x + dx - 2, y - 1, 2).fill({ color: 0xffffff, alpha: 0.8 });
        } else if (i === n && blink > 0) em.circle(x + dx, y + 1, 6.5).stroke({ color: COL.lime, width: 1.6, alpha: blink });
      });
    }
  }

  /** The four cradles in a Hatchery room, where its eggs and young sit. */
  private cradles(r: Room): { x: number; y: number }[] {
    const b = this.box(r);
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < HATCH_CAP; i++) out.push({ x: b.ox + 80 + i * ((b.ow - 260) / (HATCH_CAP - 1)), y: b.bottom - 76 });
    return out;
  }
  /** The farm's planter tiers (y of each trough top). */
  private farmTiers(r: Room): number[] {
    const b = this.box(r);
    return [b.bottom - 96, b.bottom - 22];
  }

  private syncNest(time: number, dt: number): void {
    const rooms = this.level.rooms.filter((r) => r.kind === 'hatch').sort((a, b) => a.piece.id - b.piece.id);
    const slots = rooms.flatMap((r) => this.cradles(r).map((q) => ({ ...q, on: this.powered(r.piece.id) })));
    const list = this.ctx.nursery();
    const keep = new Set<number>();
    list.forEach((c, i) => {
      const q = slots[i];
      if (!q) return;
      keep.add(c.id);
      let n = this.nest.get(c.id);
      if (!n || n.stage !== c.stage) {
        n?.c.destroy();
        const cr = new Critter(c.species, c.stage, c.id, traitsOf(c));
        this.extraLit.addChild(cr.view);
        this.extraEm.addChild(cr.emissive);
        this.extraGlow.addChild(cr.glow);
        n = { c: cr, stage: c.stage };
        this.nest.set(c.id, n);
      }
      // Eggs rest in the bowl; the young circle slowly under the bell.
      const egg = c.stage === 'egg';
      const ph = time * 0.8 + c.id;
      const x = egg ? q.x : q.x + Math.sin(ph) * 12;
      const y = egg ? q.y + 12 : q.y - 6 + Math.sin(ph * 1.7) * 4;
      n.c.update(dt, time, x, y, egg ? 0 : Math.cos(ph) * 12, 0, { vigour: q.on ? 0.9 : 0.4, sick: 0, size: egg ? 1.2 : 1.05 });
    });
    for (const [id, n] of this.nest)
      if (!keep.has(id)) {
        n.c.destroy();
        this.nest.delete(id);
      }
  }

  private syncCrops(time: number): void {
    for (const r of this.level.rooms) {
      if (r.kind !== 'farm') continue;
      const f = this.ctx.farmCrop(r.piece.id);
      const plant: PlantId = f.grow === 'fibre' ? 'kelp' : f.grow;
      let cr = this.crops.get(r.piece.id);
      if (!cr || cr.key !== plant) {
        cr?.plants.forEach((p) => p.destroy({ children: true }));
        const b = this.box(r);
        const plants: Container[] = [];
        for (const ty of this.farmTiers(r))
          for (let x = b.ox + 140; x < b.ox + b.ow - 130; x += 52) {
            const p = drawPlant(plant);
            p.position.set(x + ((x * 13) % 9), ty + 3);
            this.extraLit.addChildAt(p, 0);
            plants.push(p);
          }
        cr = { key: plant, plants };
        this.crops.set(r.piece.id, cr);
      }
      // The crop grows as the farm works towards the next harvest, and sways in the pumped water.
      const on = this.powered(r.piece.id);
      const sc = (plant === 'kelp' ? 0.95 : 1.5) * (0.6 + 0.4 * f.progress);
      cr.plants.forEach((p, i) => {
        p.scale.set(i % 2 ? -sc : sc, sc);
        p.skew.x = on ? Math.sin(time * 0.9 + i * 1.3) * 0.08 : 0;
      });
    }
  }
  private detached = false;
  detach(): void {
    if (this.detached) return;
    this.detached = true;
    this.tankLife.destroy();
    for (const n of this.nest.values()) n.c.destroy();
    this.nest.clear();
    this.crops.clear();
    for (const c of [this.extraLit, this.extraEm, this.extraGlow]) c.destroy({ children: true });
  }
  private syncClock = 0;
  tick(dt: number, time: number, x0: number, x1: number): void {
    if (this.detached) return;
    this.syncClock -= dt;
    if (this.syncClock <= 0) {
      this.syncClock = 0.4;
      this.tankLife.sync(this.ctx.save, this.ctx.layout);
    }
    this.tankLife.update(dt, time, this.ctx.save, x0, x1);
    this.syncNest(time, dt);
    this.syncCrops(time);
    this.syncWhorlPlates(time);
  }
  /** Milestone 9: where the camera frames a room while its panel is open (the Hatchery). */
  roomFocus(id: number): { x: number; y: number; h: number } | null {
    const r = this.level.rooms.find((q) => q.piece.id === id);
    if (!r) return null;
    const b = this.box(r);
    return { x: b.cx, y: b.bottom - 90, h: 340 };
  }
  /** Re-read the tanks now (a creature was added, moved or a plant planted). */
  syncTanks(): void {
    if (!this.detached) this.tankLife.sync(this.ctx.save, this.ctx.layout);
  }
  /** Milestone 9: where the camera frames a tank while it is tended indoors. */
  tankFocus(id: number): { x: number; y: number; h: number } | null {
    const t = this.tanks.find((q) => q.room.piece.id === id);
    if (!t) return null;
    return { x: t.x + t.w / 2, y: t.y + t.h / 2 + 20, h: Math.max(320, t.h + 150) };
  }

  /** Where to step in when climbing up out of the sub into a dock. */
  dockSpawn(dockId: number): { x: number; y: number } | null {
    const r = this.level.rooms.find((q) => q.piece.id === dockId);
    if (!r) return null;
    const b = this.box(r);
    return { x: b.cx + 130, y: b.floor(0) };
  }

  /** The ceiling height of one level of a room (0 = the top level), plus a lane offset. */
  private laneY(r: Room, k: number, lane: number): number {
    return (k === 0 ? r.ty0 + 1 : r.ty0 + k * CH) * T + 24 + lane * 9;
  }
  private levelOf(r: Room, gy: number): number {
    return r.piece.gy + r.h - 1 - gy;
  }
  /** Where a line meets a machine, indoors: its port, scaled up from the outside art. */
  private portX(r: Room, kind: 'belt' | 'pipe', dir: 'in' | 'out'): number {
    const cx = (r.tx0 + r.tw / 2) * T;
    const k = (CW * T) / 112;
    if (r.kind === 'tank' || r.kind === 'gtank') return cx + (kind === 'pipe' ? 28 : -28) * k;
    if (r.kind === 'press') return cx + (dir === 'in' ? -62 : 62) * k;
    return cx + (kind === 'belt' ? -22 : 22) * k;
  }
  /** Pieces joined end to end, from one to another (through doorways and shafts). */
  private piecePath(from: number, to: number): Placed[] | null {
    const layout = this.ctx.layout;
    const byId = new Map(layout.pieces.map((p) => [p.id, p]));
    const prev = new Map<number, number>([[from, -1]]);
    const queue = [from];
    while (queue.length) {
      const id = queue.shift()!;
      if (id === to) break;
      for (const n of layout.links.get(id) ?? []) {
        const q = byId.get(n);
        if (!q || !isDone(q) || prev.has(n)) continue;
        prev.set(n, id);
        queue.push(n);
      }
    }
    if (!prev.has(to)) return null;
    const out: Placed[] = [];
    for (let id = to; id !== -1; id = prev.get(id)!) out.push(byId.get(id)!);
    return out.reverse();
  }
  /**
   * A line's route indoors: out of its machine, up to the ceiling, along the
   * ceilings of every room between (through the walls at doorways, up and
   * down the shafts), and into the other machine.
   */
  private routeLine(l: SavedLine, lane: number): [number, number][] | null {
    const path = this.piecePath(l.from, l.to);
    if (!path) return null;
    const rooms = path.map((p) => this.level.rooms.find((r) => r.piece.id === p.id)!);
    if (rooms.some((r) => !r)) return null;
    const pts: [number, number][] = [];
    const push = (x: number, y: number) => {
      const t = pts[pts.length - 1];
      if (!t || t[0] !== x || t[1] !== y) pts.push([x, y]);
    };
    const wallX = (r: Room) => (r.tx0 + 1) * T + 10;
    let k = 0;
    const goLevel = (r: Room, to: number) => {
      if (k === to) return;
      push(wallX(r), this.laneY(r, k, lane));
      push(wallX(r), this.laneY(r, to, lane));
      k = to;
    };
    push(this.portX(rooms[0], l.kind, 'out'), this.laneY(rooms[0], 0, lane));
    for (let i = 0; i + 1 < path.length; i++) {
      const P = path[i];
      const Q = path[i + 1];
      const rP = rooms[i];
      const rQ = rooms[i + 1];
      const c = collarsOf(P).find((q) => this.ctx.layout.collarPartner(q)?.id === Q.id);
      if (!c) return null;
      const kP = this.levelOf(rP, c.gy);
      const kQ = this.levelOf(rQ, c.dir === 'U' ? c.gy + 1 : c.dir === 'D' ? c.gy - 1 : c.gy);
      goLevel(rP, kP);
      const tx = rP.tx0 + (c.gx - P.gx) * CW;
      if (c.dir === 'L' || c.dir === 'R') {
        const xb = c.dir === 'R' ? (tx + CW) * T : tx * T;
        push(xb, this.laneY(rP, kP, lane));
        push(xb, this.laneY(rQ, kQ, lane));
      } else {
        const sx = (tx + CW / 2) * T + T - 7;
        push(sx, this.laneY(rP, kP, lane));
        push(sx, this.laneY(rQ, kQ, lane));
      }
      k = kQ;
    }
    const last = rooms[rooms.length - 1];
    goLevel(last, 0);
    push(this.portX(last, l.kind, 'in'), this.laneY(last, 0, lane));
    return pts;
  }

  /** A room's open area and floor heights, in units. */
  private box(r: Room) {
    const ox = (r.tx0 + 1) * T;
    const oy = (r.ty0 + 1) * T;
    const ow = (r.tw - 2) * T;
    const oh = (r.th - 2) * T;
    /** Floor height of level k from the top (0 = top level). */
    const floor = (k: number) => (r.ty0 + (k + 1) * CH - 1) * T;
    return { ox, oy, ow, oh, floor, bottom: floor(r.h - 1), cx: ox + ow / 2 };
  }

  private planRoom(r: Room): void {
    const b = this.box(r);
    const id = r.piece.id;
    const add = (x: number, y: number, what: Spot['what'], rad = 46) => this.spots.push({ room: r, x, y, r: rad, what });
    switch (r.kind) {
      case 'dome':
        add(b.cx, b.bottom, 'airlock', 56);
        add(b.ox + b.ow - 90, b.floor(0), 'planner', 60);
        break;
      case 'storage':
      case 'sorter':
        add(b.cx, b.bottom, 'unload', 120);
        break;
      case 'tank':
      case 'gtank': {
        const top = b.oy + 14;
        const bot = b.bottom - 22;
        this.tanks.push({ room: r, x: b.ox + 30, y: top, w: b.ow - 60, h: bot - top });
        add(b.cx, b.bottom, 'tank', b.ow / 2 - 20);
        if (r.h > 1) add(b.cx, b.floor(0), 'tank', b.ow / 2 - 60);
        break;
      }
      case 'lab':
      case 'workshop':
        add(b.cx, b.bottom, 'station', 110);
        break;
      case 'dock':
        add(b.cx, b.floor(0), 'dock', 80);
        if (this.ctx.subDocked(id)) add(b.cx - 150, b.floor(0), 'board', 70);
        break;
      case 'recomp':
        add(b.ox + b.ow * 0.62, b.bottom, 'recomp', 70);
        add(b.ox + 70, b.bottom, 'info', 60);
        break;
      case 'turbine':
        this.turbines.push({ x: b.ox + 140, y: b.floor(0) - 92, r: 64, id });
        add(b.cx, b.bottom, 'info', 120);
        break;
      case 'corridor':
        break;
      case 'hatch':
        add(b.ox + b.ow - 70, b.bottom, 'hatch', 90);
        add(b.cx - 60, b.bottom, 'hatch', 150);
        break;
      case 'farm':
        add(b.ox + 60, b.bottom, 'farm', 60);
        add(b.ox + b.ow - 60, b.bottom, 'farmtray', 60);
        add(b.cx, b.bottom, 'info', 120);
        break;
      case 'revive':
        add(b.cx, b.bottom, 'revive', 140);
        break;
      case 'signal':
        add(b.cx, b.bottom, 'signal', 160);
        break;
      default:
        add(b.cx, b.bottom, 'info', 130);
    }
    // Fit Echo whorls right here (the socket plate on the wall above), once any have been found.
    if (PIECES[r.kind].whorls && this.ctx.save.whorls.length > 0) add(b.ox + b.ow - 56, r.kind === 'feeder' || r.kind === 'press' ? b.bottom : b.bottom, 'tune', 40);
    for (const d of this.level.doors)
      if (d.sealed && d.tx >= r.tx0 && d.tx < r.tx0 + r.tw && d.floorTy >= r.ty0 && d.floorTy < r.ty0 + r.th)
        this.spots.push({ room: r, x: (d.dir === 'L' ? d.tx + 1 : d.tx) * T, y: d.floorTy * T, r: 60, what: 'sealed', other: d.other });
  }

  powered(zone: number): boolean {
    return this.ctx.layout.powered.has(zone);
  }

  lights(): Light[] {
    return this.screens.filter((l) => {
      const z = (l as Light & { zone?: number }).zone;
      return z === undefined || this.powered(z);
    });
  }

  private roomAt(x: number, y: number): Room | null {
    for (const r of this.level.rooms) if (x >= r.tx0 * T && x < (r.tx0 + r.tw) * T && y > r.ty0 * T && y <= (r.ty0 + r.th) * T) return r;
    return null;
  }

  act(x: number, y: number): InteriorAct | string | null {
    const c = this.ctx;
    let best: Spot | null = null;
    let bd = Infinity;
    for (const s of this.spots) {
      const d = Math.abs(x - s.x);
      if (d < s.r && Math.abs(y - s.y) < 30 && d < bd) {
        bd = d;
        best = s;
      }
    }
    if (!best) {
      const r = this.roomAt(x, y);
      if (r && r.kind === 'corridor' && r.piece.rot % 2 === 1) return null;
      return null;
    }
    const p = best.room.piece;
    const on = this.powered(p.id);
    const code = pieceCode(c.layout, p);
    switch (best.what) {
      case 'airlock':
        return { key: 'airlock', label: 'Go out through the airlock', seconds: 0.8, done: () => c.exit(p.id) };
      case 'planner':
        return { key: 'planner', label: 'Plan the base (build view)', seconds: 0.4, done: () => c.build() };
      case 'unload': {
        const n = c.carried();
        if (!on) return `${code}: no power`;
        if (!n) return c.storageText();
        return { key: 'unload', label: `Unload ${n} item${n === 1 ? '' : 's'} into storage`, seconds: 0.5, done: () => c.unload(p.id) };
      }
      case 'tank': {
        const jar = c.jarLabel(p.id);
        if (jar) return { key: 'jar', label: jar, seconds: 0.6, done: () => c.deposit(p.id) };
        const n = c.trayCount(p.id);
        if (n && Math.abs(x - best.x) < 80) return { key: 'tray', label: `Take ${n} from the output tray`, seconds: 0.5, done: () => c.takeTray(p.id) };
        return { key: 'tend', label: `Tend ${code}`, seconds: 0.4, done: () => c.tend(p.id) };
      }
      case 'station':
        return { key: 'station', label: `Use the ${p.kind === 'lab' ? 'Lab' : 'Workshop'} (${code})`, seconds: 0.4, done: () => c.station(p.id) };
      case 'dock':
        return { key: 'dock', label: `Dock controls (${code})`, seconds: 0.4, done: () => c.dock(p.id) };
      case 'recomp':
        if (!on) return `${code}: no power`;
        return { key: 'recomp', label: 'Seal the chamber: mend the suit', seconds: 1.6, done: () => c.recompress() };
      case 'lift': {
        const to = best.to!;
        return {
          key: 'lift' + (best.up ? 'u' : 'd'),
          label: best.up ? 'Take the lift up' : 'Take the lift down',
          seconds: 0.5,
          done: () => c.lift(to.x, to.y),
        };
      }
      case 'board':
        return { key: 'board', label: 'Climb down into KS-1', seconds: 1, done: () => c.boardSub() };
      case 'tune': {
        // Fitted straight from the console (Colin, after the terrain pass): fit one while there
        // is room and a spare; once full (or out of spares), the same console takes one out.
        const free = c.whorlsFree();
        const n = c.whorlsFitted(p.id);
        if (!isDone(p)) return `${code} is still a frame: whorls fit once it is built`;
        if (n < WHORLS_PER_PIECE && free > 0)
          return { key: 'tune+' + n, label: `Fit an Echo whorl to ${code} (${n}/${WHORLS_PER_PIECE} fitted · ${free} spare)`, seconds: 0.8, done: () => c.fitWhorl(p.id, 1) };
        if (n > 0) return { key: 'tune-' + n, label: `Take an Echo whorl out of ${code} (${n}/${WHORLS_PER_PIECE} fitted)`, seconds: 0.8, done: () => c.fitWhorl(p.id, -1) };
        return `${code}: no spare Echo whorls. They hide in quiet corners of the reef.`;
      }
      case 'sealed':
        return `Sealed hatch: ${PIECES[best.other!.kind].name.toLowerCase()} beyond is still a frame`;
      case 'hatch':
        if (!on) return `${code}: no power. The eggs are cooling: join it to a current turbine.`;
        return { key: 'hatch', label: `Use the Hatchery (${code}): ${c.nursery().length} egg${c.nursery().length === 1 ? '' : 's'} and young`, seconds: 0.4, done: () => c.hatchery(p.id) };
      case 'farm': {
        const f = c.farmCrop(p.id);
        return { key: 'farm', label: `Change the crop (growing ${f.name})`, seconds: 0.4, done: () => c.farmCycle(p.id) };
      }
      case 'farmtray': {
        const f = c.farmCrop(p.id);
        if (!on) return `${code}: no power. The grow lamps are off.`;
        if (f.grow === 'fibre' && f.tray > 0) return { key: 'ftray', label: `Take ${f.tray} kelp fibre from the tray`, seconds: 0.5, done: () => c.farmTake(p.id) };
        return f.grow === 'fibre'
          ? `${code}: growing kelp fibre · ${Math.round(f.progress * 100)}% · tray ${f.tray}/${f.cap}`
          : `${code}: growing ${f.name} cuttings · ${Math.round(f.progress * 100)}% · ready cuttings go to the planters`;
      }
      case 'revive':
        if (!on) return `${code}: no power`;
      {
        const l = c.reviveLabel();
        return l.ok ? { key: 'revive', label: l.text, seconds: 1.4, done: () => c.revive(p.id) } : l.text;
      }
      case 'signal': {
        if (!on) return `${code}: no power. Join it to a current turbine.`;
        const l = c.signalLabel();
        return l.ok ? { key: 'signal', label: l.text, seconds: 0.5, done: () => c.signalRead() } : l.text;
      }
      default:
        return c.status(p);
    }
  }

  // -------------------------------------------------------------------------

  decorate(g: Graphics, e: Graphics, gl: Graphics, addLamp: (x: number, y: number, zone: number) => void, addText: (t: Text) => void, phase: 'back' | 'front'): void {
    const rand = mulberry32(WORLD_SEED ^ 0x5eba5e);
    if (phase === 'back') {
      this.screens = [];
      for (const r of this.level.rooms) this.drawRoom(r, g, e, gl, addLamp, addText, rand);
      return;
    }
    // Doorways: chrome flanges round each one, or a shut hatch where the next piece is a frame.
    for (const d of this.level.doors) {
      const x = (d.dir === 'L' ? d.tx : d.tx) * T;
      const top = (d.floorTy - 3) * T;
      const h = 3 * T;
      if (d.sealed) {
        const fx = d.dir === 'L' ? x + T : x;
        g.roundRect(fx - 10, top - 6, 20, h + 6, 6).fill({ color: COL.chromeDark });
        g.roundRect(fx - 7, top, 14, h, 4).fill({ color: COL.wallDark });
        g.rect(fx - 7, top + h / 2 - 2, 14, 4).fill({ color: COL.gold, alpha: 0.8 });
        e.circle(fx, top - 14, 3).fill({ color: COL.red });
        gl.circle(fx, top - 14, 9).fill({ color: COL.red, alpha: 0.5 });
      } else {
        // A thick flange where this wall meets the next room's.
        g.rect(x, top - 10, T, 10).fill({ color: COL.chrome });
        g.rect(x, top - 10, T, 3).fill({ color: COL.chromeHi, alpha: 0.8 });
        const edge = d.dir === 'L' ? x + 2 : x + T - 8;
        g.rect(edge, top - 10, 6, h + 10).fill({ color: COL.chromeDark });
        g.rect(x, top, T, h).fill({ color: COL.wallDark, alpha: 0.5 });
        for (let k = 8; k < h; k += 24) g.rect(x + 4, top + k, T - 8, 2).fill({ color: COL.seam, alpha: 0.6 });
      }
    }
    for (const h of this.level.hatches) {
      const x = h.tx * T;
      const y = h.ty * T;
      g.rect(x - 6, y + 10, T + 12, 18).fill({ color: COL.chromeDark });
      g.rect(x - 2, y + 16, T + 4, 4).fill({ color: COL.gold, alpha: 0.8 });
      e.circle(x + T / 2, y + 6, 2.5).fill({ color: COL.red });
    }
    this.drawRoutes(g, e);
    for (const l of this.level.lifts) {
      g.roundRect(l.x - 30, l.y - 8, 60, 8, 3).fill({ color: COL.chrome });
      g.rect(l.x - 30, l.y - 8, 60, 2).fill({ color: COL.chromeHi, alpha: 0.8 });
      g.roundRect(l.x - 22, l.y - 112, 44, 104, 6).fill({ color: COL.wallDark, alpha: 0.85 });
      g.roundRect(l.x - 22, l.y - 112, 44, 104, 6).stroke({ color: COL.chromeDark, width: 2 });
      g.rect(l.x - 22, l.y - 112, 44, 5).fill({ color: COL.chrome });
      const dir = l.up ? -1 : 1;
      for (let k = 0; k < 3; k++) {
        const cy = l.y - 62 + dir * (k * 14 - 14);
        e.moveTo(l.x - 10, cy - dir * 6).lineTo(l.x, cy + dir * 6).lineTo(l.x + 10, cy - dir * 6).stroke({ color: COL.lime, width: 2.5, alpha: 0.5 + 0.15 * k });
      }
      e.rect(l.x + 16, l.y - 108, 3, 3).fill({ color: COL.red });
    }
    // Open collars on the outside: a round window onto the water.
    for (const p of this.level.ports) {
      g.circle(p.x, p.y, 22).fill({ color: COL.chrome });
      g.circle(p.x, p.y, 17).fill({ color: COL.glassSea });
      g.circle(p.x, p.y, 16).fill({ color: 0x2a7080, alpha: 0.85 });
      e.circle(p.x - 6, p.y - 6, 4).fill({ color: 0x9ae0e0, alpha: 0.25 });
    }
  }

  /** Conveyors and feed pipes along the ceilings, with a junction box where they meet a machine. */
  private drawRoutes(g: Graphics, e: Graphics): void {
    for (const r of this.routes) {
      const belt = r.kind === 'belt';
      const w = belt ? 9 : 6;
      for (let i = 1; i < r.pts.length; i++) {
        const [ax, ay] = r.pts[i - 1];
        const [bx, by] = r.pts[i];
        const x0 = Math.min(ax, bx);
        const y0 = Math.min(ay, by);
        const horiz = Math.abs(by - ay) < 0.5;
        const len = horiz ? Math.abs(bx - ax) : Math.abs(by - ay);
        if (belt) {
          // A dark belt on a chrome cradle.
          if (horiz) {
            g.rect(x0, ay - w / 2 - 2, len, w + 4).fill({ color: COL.chromeDark });
            g.rect(x0, ay - w / 2, len, w).fill({ color: 0x15191b });
            g.rect(x0, ay - w / 2, len, 1.5).fill({ color: 0x40484d });
            for (let x = x0 + 6; x < x0 + len - 3; x += 16) g.circle(x, ay + w / 2 + 2.5, 1.8).fill({ color: COL.chrome });
          } else {
            g.rect(ax - w / 2 - 2, y0, w + 4, len).fill({ color: COL.chromeDark });
            g.rect(ax - w / 2, y0, w, len).fill({ color: 0x15191b });
            for (let y = y0 + 6; y < y0 + len - 3; y += 16) g.circle(ax + w / 2 + 2.5, y, 1.8).fill({ color: COL.chrome });
          }
        } else if (horiz) {
          g.rect(x0, ay - w / 2, len, w).fill({ color: 0xb06a3a });
          g.rect(x0, ay - w / 2, len, 1.6).fill({ color: 0xf0b078, alpha: 0.8 });
          for (let x = x0 + 14; x < x0 + len - 4; x += 60) g.rect(x, ay - w / 2 - 2, 4, w + 4).fill({ color: COL.chrome });
        } else {
          g.rect(ax - w / 2, y0, w, len).fill({ color: 0xb06a3a });
          g.rect(ax - w / 2, y0, 1.6, len).fill({ color: 0xf0b078, alpha: 0.8 });
          for (let y = y0 + 14; y < y0 + len - 4; y += 60) g.rect(ax - w / 2 - 2, y, w + 4, 4).fill({ color: COL.chrome });
        }
        if (i > 1) g.circle(ax, ay, w / 2 + 2).fill({ color: COL.chrome });
      }
      // Drops into the machines at each end.
      for (const [px, py, out] of [[r.pts[0][0], r.pts[0][1], true], [r.pts[r.pts.length - 1][0], r.pts[r.pts.length - 1][1], false]] as const) {
        g.rect(px - 3, py, 6, 34).fill({ color: belt ? COL.chromeDark : 0x8a5028 });
        g.roundRect(px - 11, py + 30, 22, 12, 3).fill({ color: COL.chrome });
        g.rect(px - 11, py + 30, 22, 2.5).fill({ color: COL.chromeHi, alpha: 0.7 });
        e.moveTo(px - 5, py + 33).lineTo(px, py + 39).lineTo(px + 5, py + 33).stroke({ color: out ? COL.gold : COL.lime, width: 1.6, alpha: 0.9 });
      }
    }
  }

  private drawRoom(r: Room, g: Graphics, e: Graphics, gl: Graphics, addLamp: (x: number, y: number, zone: number) => void, addText: (t: Text) => void, rand: () => number): void {
    const b = this.box(r);
    const id = r.piece.id;
    const code = pieceCode(this.ctx.layout, r.piece);
    // Back wall: bevelled, riveted charcoal plates with vents, hatches and fittings (interior art pass).
    wallPanels(g, b.ox, b.oy, b.ow, b.oh, rand);
    // A conduit along the wall, under the line lanes, where the machines leave the wall clear.
    const conduit = r.kind === 'storage' || r.kind === 'sorter' || r.kind === 'lab' || r.kind === 'workshop' || r.kind === 'filter' || r.kind === 'dock';
    for (let k = 0; k < r.h; k++) {
      const f = b.floor(k);
      const ceil = k === 0 ? b.oy : b.floor(k - 1) + T;
      // Grime gathers along the floor; a skirting plate; a gold line at waist height.
      floorGrime(g, b.ox, b.ow, f, rand);
      skirting(g, b.ox, b.ow, f);
      e.rect(b.ox, f - 92, b.ow, 1.6).fill({ color: COL.gold, alpha: 0.55 });
      for (let x = b.ox + 40; x < b.ox + b.ow - 40; x += 150) trace(e, x, f - 92, 90, rand, 0.45);
      if (conduit && f - ceil > 180) pipeRun(g, b.ox, b.ox + b.ow, ceil + 66, 3.5, DC.steel, DC.chrome, rand);
      // The ceiling beam with its cables, and a lamp hung under it in each cell.
      ceilingBeam(g, b.ox, b.ow, ceil, rand);
      for (let c = 0; c < r.w; c++) addLamp((r.tx0 + c * CW + 5.5) * T, ceil + 16, id);
    }
    // The room's stencil code, high on the back wall.
    if (r.kind !== 'corridor') addText(sign(code, b.ox + 70, b.oy + 26, 13));
    // A red status lamp by the code.
    e.circle(b.ox + 22, b.oy + 26, 3).fill({ color: COL.red });
    gl.circle(b.ox + 22, b.oy + 26, 8).fill({ color: COL.red, alpha: 0.4 });

    const bot = b.bottom;
    switch (r.kind) {
      case 'dome': {
        // Upper level: the glass dome itself, a lime-tinted window onto the sea, with chrome ribs.
        const f0 = b.floor(0);
        const wx = b.cx;
        const wy = f0 - 18;
        const rx = b.ow / 2 - 40;
        const ry = f0 - b.oy - 30;
        const half = (ax: number, ay: number) => {
          const pts: number[] = [];
          for (let i = 0; i <= 32; i++) {
            const t = (i / 32) * Math.PI;
            pts.push(wx + Math.cos(t) * ax, wy - Math.sin(t) * ay);
          }
          return pts;
        };
        g.poly(half(rx + 8, ry + 8)).fill({ color: COL.chrome });
        g.poly(half(rx, ry)).fill({ color: COL.glassSea });
        g.poly(half(rx, ry)).fill({ color: 0x3a7a3a, alpha: 0.75 });
        g.poly(half(rx * 0.8, ry * 0.6)).fill({ color: 0x2a5a2a, alpha: 0.3 });
        for (const k of [-0.6, -0.3, 0, 0.3, 0.6]) g.rect(wx + k * rx - 2, wy - ry * Math.sqrt(1 - k * k), 4, ry * Math.sqrt(1 - k * k)).fill({ color: COL.chromeDark });
        g.rect(wx - rx - 8, wy - 4, rx * 2 + 16, 8).fill({ color: COL.chrome });
        e.moveTo(wx - rx * 0.7, wy - ry * 0.55).quadraticCurveTo(wx - rx * 0.2, wy - ry * 0.95, wx + rx * 0.3, wy - ry * 0.9).stroke({ color: 0xe8ffc0, width: 4, alpha: 0.18 });
        // The base planner: a table with a lime holographic grid.
        const px = b.ox + b.ow - 90;
        g.roundRect(px - 44, f0 - 46, 88, 12, 3).fill({ color: COL.chromeDark });
        g.rect(px - 6, f0 - 34, 12, 34).fill({ color: COL.wallDark });
        for (let i = 0; i < 6; i++) e.rect(px - 40 + i * 16, f0 - 50, 10, 4).fill({ color: COL.lime, alpha: 0.5 });
        addText(sign('BASE PLANNER', px, f0 - 66, 9, 0xc6f03a, 0.8));
        this.screens.push({ x: px, y: f0 - 60, radius: 160, intensity: 0.5, color: [0.75, 0.95, 0.35], zone: id } as Light);
        // Lower level: the airlock, a bunk, and a galley console.
        const ax = b.cx;
        const ay = bot - 64;
        g.circle(ax, ay, 54).fill({ color: COL.chrome });
        g.circle(ax, ay, 54).stroke({ color: COL.chromeDark, width: 3 });
        g.circle(ax, ay, 42).fill({ color: COL.wallDark });
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.circle(ax + Math.cos(a) * 48, ay + Math.sin(a) * 48, 2.4).fill({ color: COL.chromeDark });
        }
        g.moveTo(ax - 28, ay).lineTo(ax + 28, ay).moveTo(ax, ay - 28).lineTo(ax, ay + 28).stroke({ color: COL.chrome, width: 5 });
        g.circle(ax, ay, 10).fill({ color: COL.chrome });
        e.circle(ax, ay, 44).stroke({ color: COL.lime, width: 2, alpha: 0.6 });
        addText(sign('AIRLOCK', ax, ay - 70, 10));
        hazard(g, ax - 60, bot - 6, 120, 6);
        for (const [hx, hy] of [[-40, -40], [40, -40], [-40, 40], [40, 40]]) rivet(g, ax + hx, ay + hy, 1.6);
        // Bunk on the left.
        g.roundRect(b.ox + 70, bot - 40, 120, 18, 4).fill({ color: COL.chromeDark });
        g.roundRect(b.ox + 74, bot - 50, 112, 12, 4).fill({ color: 0x4a5258 });
        g.roundRect(b.ox + 76, bot - 56, 30, 10, 4).fill({ color: COL.white, alpha: 0.7 });
        g.rect(b.ox + 70, bot - 22, 6, 22).fill({ color: COL.chromeDark });
        g.rect(b.ox + 184, bot - 22, 6, 22).fill({ color: COL.chromeDark });
        // Console on the right with two screens.
        const cx2 = b.ox + b.ow - 120;
        g.roundRect(cx2 - 50, bot - 70, 100, 70, 4).fill({ color: COL.wallDark });
        g.rect(cx2 - 50, bot - 70, 100, 3).fill({ color: COL.chrome });
        g.rect(cx2 - 42, bot - 62, 38, 24).fill({ color: 0x0c1418 });
        g.rect(cx2 + 4, bot - 62, 38, 24).fill({ color: 0x0c1418 });
        // Screen bezels, a row of keys and the console's bolted side panels.
        g.rect(cx2 - 43, bot - 63, 40, 26).stroke({ color: DC.chromeDark, width: 1.4 });
        g.rect(cx2 + 3, bot - 63, 40, 26).stroke({ color: DC.chromeDark, width: 1.4 });
        for (let i = 0; i < 8; i++) g.rect(cx2 - 40 + i * 10, bot - 30, 7, 4).fill({ color: i % 3 ? 0x4a5258 : 0x6f8a1e });
        bolts(g, cx2 - 46, bot - 18, cx2 + 46, bot - 18, 23, 1);
        this.screens.push({ x: cx2, y: bot - 60, radius: 180, intensity: 0.45, color: [0.7, 0.95, 0.4], zone: id } as Light);
        break;
      }
      case 'corridor': {
        if (r.piece.rot % 2 === 0) {
          // A tube: chrome ribs, and a round window in the middle.
          for (let x = b.ox + 20; x < b.ox + b.ow; x += 60) {
            g.rect(x, b.oy, 8, b.oh).fill({ color: COL.chromeDark });
            g.rect(x, b.oy, 2, b.oh).fill({ color: COL.chromeHi, alpha: 0.4 });
          }
          g.circle(b.cx, b.oy + 60, 26).fill({ color: COL.chrome });
          g.circle(b.cx, b.oy + 60, 20).fill({ color: COL.glassSea });
          g.circle(b.cx, b.oy + 60, 19).fill({ color: 0x3a7a3a, alpha: 0.7 });
          e.circle(b.cx - 6, b.oy + 54, 5).fill({ color: COL.lime, alpha: 0.35 });
        } else {
          for (let y = b.oy + 20; y < b.oy + b.oh; y += 50) g.rect(b.ox, y, b.ow, 6).fill({ color: COL.chromeDark });
        }
        break;
      }
      case 'shaft': {
        // Chrome bands up the shaft, like an upright corridor, with a gold conduit down the wall
        // beside the ladder, and a lime level marker at each floor.
        for (let y = b.oy + 20; y < b.oy + b.oh; y += 50) g.rect(b.ox, y, b.ow, 6).fill({ color: COL.chromeDark });
        g.rect(b.ox + b.ow - 14, b.oy, 8, b.oh).fill({ color: COL.wallDark });
        e.rect(b.ox + b.ow - 11, b.oy, 2, b.oh).fill({ color: 0xe8b040, alpha: 0.55 });
        for (let k = 0; k < r.h; k++) {
          const fy = b.floor(k);
          g.rect(b.ox + 8, fy - 14, 22, 4).fill({ color: COL.chrome });
          e.rect(b.ox + 10, fy - 13, 18, 2).fill({ color: COL.lime, alpha: 0.7 });
          addText(sign(`L${r.h - k}`, b.ox + 56, fy - 22, 9, 0xc6f03a, 0.65));
        }
        break;
      }
      case 'lantern': {
        // Milestone 11: the Choir lantern's room. A ring of pale stone on the back wall holds the seed of light.
        g.circle(b.cx, b.oy + 62, 34).fill({ color: 0xb8c0d8 });
        g.circle(b.cx, b.oy + 62, 34).stroke({ color: COL.chromeDark, width: 3 });
        for (const r of [28, 22]) g.circle(b.cx, b.oy + 62, r).stroke({ color: 0x5a5e78, width: 1.2 });
        g.circle(b.cx, b.oy + 62, 17).fill({ color: 0x14102c });
        e.circle(b.cx, b.oy + 62, 14).fill({ color: 0xa27cff, alpha: 0.7 });
        e.circle(b.cx, b.oy + 62, 8).fill({ color: 0x5ff0ff, alpha: 0.9 });
        e.circle(b.cx, b.oy + 62, 3).fill({ color: 0xf4fbff });
        gl.circle(b.cx, b.oy + 62, 50).fill({ color: 0xa27cff, alpha: 0.4 });
        break;
      }
      case 'junction': {
        // A hub chamber: a chrome ring on the back wall with arrows to the four ways out, and a gold trace.
        g.circle(b.cx, b.oy + 62, 30).fill({ color: COL.chrome });
        g.circle(b.cx, b.oy + 62, 30).stroke({ color: COL.chromeDark, width: 3 });
        g.circle(b.cx, b.oy + 62, 22).fill({ color: COL.glassSea });
        e.circle(b.cx, b.oy + 62, 8).fill({ color: COL.lime, alpha: 0.5 });
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
          const ax = b.cx + dx * 44;
          const ay = b.oy + 62 + dy * 44;
          e.poly([ax + dx * 7, ay + dy * 7, ax - dy * 5 - dx * 3, ay + dx * 5 - dy * 3, ax + dy * 5 - dx * 3, ay - dx * 5 - dy * 3]).fill({ color: COL.gold, alpha: 0.6 });
        }
        break;
      }
      case 'turbine': {
        // Upper level: a round window onto the impeller (it turns in animate). A gold spine runs the full height.
        const t = this.turbines.find((q) => q.id === id)!;
        g.circle(t.x, t.y, t.r + 14).fill({ color: COL.chrome });
        g.circle(t.x, t.y, t.r + 14).stroke({ color: COL.chromeDark, width: 3 });
        g.circle(t.x, t.y, t.r).fill({ color: COL.glassSea });
        g.circle(t.x, t.y, t.r).fill({ color: 0x2a7080, alpha: 0.85 });
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          g.circle(t.x + Math.cos(a) * (t.r + 7), t.y + Math.sin(a) * (t.r + 7), 2.4).fill({ color: COL.chromeDark });
        }
        const sx = b.ox + b.ow - 12;
        g.rect(sx - 9, b.oy, 18, b.oh).fill({ color: COL.wallDark });
        // (Toned down in the interior art pass: it bloomed harder than anything else in the room.)
        e.rect(sx - 3, b.oy, 6, b.oh).fill({ color: 0xe8b040, alpha: 0.75 });
        gl.rect(sx - 8, b.oy, 16, b.oh).fill({ color: 0xffb030, alpha: 0.14 });
        for (let y = b.oy + 30; y < b.oy + b.oh; y += 70) g.rect(sx - 12, y, 24, 10).fill({ color: COL.chrome });
        // Lower level: the generator housing, with lime grille vents.
        g.roundRect(b.ox + 110, bot - 120, b.ow - 140, 120, 6).fill({ color: COL.wallDark });
        g.rect(b.ox + 110, bot - 120, b.ow - 140, 4).fill({ color: COL.chrome });
        for (let i = 0; i < 6; i++) g.rect(b.ox + 124, bot - 106 + i * 14, b.ow - 168, 7).fill({ color: COL.lime, alpha: 0.55 });
        gl.rect(b.ox + 120, bot - 110, b.ow - 160, 84).fill({ color: COL.lime, alpha: 0.2 });
        flangeRect(g, b.ox + 110, bot - 120, b.ow - 140, 120, 6);
        // Cable trunking from the generator up to the window's hub.
        pipeUp(g, b.ox + 140, b.floor(0) + T, bot - 120, 5, COL.chromeDark, COL.chrome);
        this.screens.push({ x: b.cx + 30, y: bot - 70, radius: 200, intensity: 0.5, color: [0.75, 1, 0.3], zone: id } as Light);
        break;
      }
      case 'storage':
      case 'sorter': {
        // Racks of crates (storage) or labelled bays (sorting pod).
        for (let k = 0; k < 3; k++) {
          const sy = bot - 40 - k * 46;
          g.rect(b.ox + 16, sy, b.ow - 32, 5).fill({ color: COL.chrome });
          g.rect(b.ox + 16, sy + 5, b.ow - 32, 2).fill({ color: COL.seam });
        }
        for (const x of [b.ox + 18, b.ox + b.ow - 24]) {
          g.rect(x, bot - 150, 6, 150).fill({ color: COL.chromeDark });
          for (let y = bot - 144; y < bot - 6; y += 9) g.rect(x + 2, y, 2, 4).fill({ color: DC.grime });
        }
        // Diagonal bracing behind the shelves, and a stripe where the forklift path ends.
        g.moveTo(b.ox + 24, bot - 46).lineTo(b.ox + 70, bot - 132).moveTo(b.ox + b.ow - 24, bot - 46).lineTo(b.ox + b.ow - 70, bot - 132).stroke({ color: DC.chromeDark, width: 2, alpha: 0.7 });
        hazard(g, b.ox + 16, bot - 6, 40, 6);
        hazard(g, b.ox + b.ow - 56, bot - 6, 40, 6);
        if (r.kind === 'sorter') addText(sign('SORTING BAYS', b.ox + b.ow - 90, b.oy + 26, 9, 0xc6f03a, 0.7));
        break;
      }
      case 'tank':
      case 'gtank': {
        const t = this.tanks.find((q) => q.room === r)!;
        g.roundRect(t.x - 14, t.y - 14, t.w + 28, t.h + 28, 12).fill({ color: COL.chrome });
        g.roundRect(t.x - 14, t.y - 14, t.w + 28, 4, 2).fill({ color: COL.chromeHi, alpha: 0.7 });
        g.roundRect(t.x, t.y, t.w, t.h, 6).fill({ color: COL.glassSea });
        // Water and sand drawn unlit so the tank glows from inside.
        g.roundRect(t.x, t.y, t.w, t.h, 6).fill({ color: 0x2a8a98, alpha: 1 });
        g.rect(t.x, t.y, t.w, 26).fill({ color: 0x4ab0b0, alpha: 0.18 });
        g.roundRect(t.x, t.y + t.h - 24, t.w, 24, 6).fill({ color: 0xb09a6e, alpha: 0.9 });
        for (let i = 0; i < t.w / 18; i++) g.circle(t.x + rand() * t.w, t.y + t.h - 20 + rand() * 14, 2 + rand() * 4).fill({ color: 0x6a5a42, alpha: 0.8 });
        // Vertical frame bars every few metres.
        for (let x = t.x + 160; x < t.x + t.w - 40; x += 160) g.rect(x - 4, t.y - 14, 8, t.h + 28).fill({ color: COL.chromeDark });
        gl.roundRect(t.x + 20, t.y + 20, t.w - 40, t.h - 40, 30).fill({ color: 0x1a8080, alpha: 0.12 });
        // The frame is bolted all round; a level scale by the glass.
        bolts(g, t.x - 7, t.y - 7, t.x + t.w + 7, t.y - 7, 26, 1.2);
        bolts(g, t.x - 7, t.y + t.h + 7, t.x + t.w + 7, t.y + t.h + 7, 26, 1.2);
        for (let y = t.y + 10; y < t.y + t.h - 10; y += 12) g.rect(t.x - 12, y, y % 36 < 12 ? 7 : 4, 1.4).fill({ color: COL.chromeHi, alpha: 0.6 });
        // A railing in front.
        for (let k = 0; k < r.h; k++) {
          const f = b.floor(k);
          g.rect(b.ox + 10, f - 40, b.ow - 20, 4).fill({ color: COL.chrome });
          for (let x = b.ox + 20; x < b.ox + b.ow - 10; x += 60) g.rect(x, f - 40, 3, 40).fill({ color: COL.chromeDark });
        }
        this.screens.push({ x: t.x + t.w / 2, y: t.y + t.h / 2, radius: Math.max(t.w, t.h) * 0.7, intensity: 0.45, color: [0.3, 0.75, 0.8] });
        break;
      }
      case 'filter': {
        // Two glass columns of lime-tinted water and a pump between them.
        for (const x of [b.ox + 50, b.ox + b.ow - 90]) {
          g.roundRect(x - 4, bot - 154, 48, 154, 8).fill({ color: COL.chrome });
          g.roundRect(x, bot - 146, 40, 138, 6).fill({ color: 0x14302a });
        }
        g.roundRect(b.cx - 30, bot - 70, 60, 70, 6).fill({ color: COL.wallDark });
        g.circle(b.cx, bot - 40, 16).fill({ color: COL.chrome });
        g.rect(b.ox + 90, bot - 120, b.ow - 140, 8).fill({ color: COL.chromeDark });
        // Column bands and caps, the pump motor's cooling fins, and the pipes into the columns.
        for (const x of [b.ox + 50, b.ox + b.ow - 90]) {
          for (const y of [bot - 130, bot - 80, bot - 30]) g.rect(x - 6, y, 52, 5).fill({ color: COL.chromeDark });
          g.roundRect(x - 2, bot - 164, 44, 12, 4).fill({ color: COL.chrome });
          rivet(g, x + 6, bot - 158, 1.2);
          rivet(g, x + 34, bot - 158, 1.2);
          for (let y = bot - 140; y < bot - 14; y += 10) g.rect(x + 3, y, 3, 1.2).fill({ color: COL.lime, alpha: 0.3 });
        }
        for (let i = 0; i < 6; i++) g.rect(b.cx - 22 + i * 8, bot - 66, 3, 14).fill({ color: DC.grime });
        g.circle(b.cx, bot - 40, 9).fill({ color: COL.chromeDark });
        g.circle(b.cx, bot - 40, 3).fill({ color: COL.chrome });
        pipeRun(g, b.ox + 94, b.cx - 30, bot - 46, 4, DC.copper, DC.copperHi, rand);
        pipeRun(g, b.cx + 30, b.ox + b.ow - 94, bot - 46, 4, DC.copper, DC.copperHi, rand);
        hazard(g, b.cx - 30, bot - 6, 60, 6);
        break;
      }
      case 'feeder': {
        // Upper level: the fibre hopper. Lower level: the mash vat and its pump.
        const f0 = b.floor(0);
        g.poly([b.ox + 80, f0 - 150, b.ox + b.ow - 30, f0 - 150, b.ox + b.ow - 70, f0 - 40, b.ox + 120, f0 - 40]).fill({ color: COL.wallDark });
        g.rect(b.ox + 80, f0 - 150, b.ow - 110, 5).fill({ color: COL.chrome });
        g.roundRect(b.ox + 80, bot - 150, b.ow - 110, 150, 10).fill({ color: COL.chrome });
        g.roundRect(b.ox + 88, bot - 142, b.ow - 126, 134, 8).fill({ color: 0x1a2a1c });
        // Hopper ribs and a chute down to the vat; the vat's bolted bands and a sight window.
        for (let i = 1; i < 5; i++) {
          const yy = f0 - 150 + i * 22;
          const inset = (i * 22 * 40) / 110;
          g.rect(b.ox + 80 + inset, yy, b.ow - 110 - inset * 2, 3).fill({ color: COL.chromeDark });
        }
        pipeUp(g, b.cx + 20, f0 - 40, bot - 150, 6, COL.chromeDark, COL.chrome);
        for (const yy of [bot - 110, bot - 50]) {
          g.rect(b.ox + 82, yy, b.ow - 114, 5).fill({ color: COL.chromeDark });
          bolts(g, b.ox + 90, yy + 2.5, b.ox + b.ow - 40, yy + 2.5, 30, 1);
        }
        g.roundRect(b.ox + b.ow - 80, bot - 96, 18, 40, 4).fill({ color: 0x2a4a22 });
        g.roundRect(b.ox + b.ow - 80, bot - 96, 18, 40, 4).stroke({ color: COL.chrome, width: 2 });
        hazard(g, b.ox + 80, bot - 6, b.ow - 110, 6);
        addText(sign('MASH', b.ox + 80 + (b.ow - 110) / 2, bot - 160, 9, 0xc6f03a, 0.7));
        break;
      }
      case 'press': {
        // A big hydraulic frame; the ram moves in animate. Plate rack on the right.
        const px = b.ox + 160;
        g.rect(px - 80, b.oy + 10, 14, bot - b.oy - 10).fill({ color: COL.chromeDark });
        g.rect(px + 66, b.oy + 10, 14, bot - b.oy - 10).fill({ color: COL.chromeDark });
        g.rect(px - 86, b.oy + 10, 172, 22).fill({ color: COL.chrome });
        g.rect(px - 70, bot - 26, 140, 26).fill({ color: COL.wallDark });
        g.rect(px - 70, bot - 26, 140, 4).fill({ color: COL.gold, alpha: 0.8 });
        for (let k = 0; k < 4; k++) g.rect(b.ox + b.ow - 170, bot - 20 - k * 30, 130, 4).fill({ color: COL.chrome });
        // Ribbed columns, two hydraulic cylinders on the crosshead, a bolted bed and a warning stripe.
        for (const cx of [px - 73, px + 73]) {
          for (let y = b.oy + 40; y < bot - 30; y += 22) g.rect(cx - 7, y, 14, 2).fill({ color: COL.chrome, alpha: 0.5 });
          g.rect(cx - 7, b.oy + 32, 2, bot - b.oy - 60).fill({ color: COL.chromeHi, alpha: 0.25 });
        }
        for (const cx of [px - 40, px + 40]) {
          g.roundRect(cx - 9, b.oy + 32, 18, 42, 4).fill({ color: COL.chromeDark });
          g.rect(cx - 9, b.oy + 32, 4, 42).fill({ color: COL.chrome, alpha: 0.5 });
          g.rect(cx - 11, b.oy + 70, 22, 4).fill({ color: COL.chrome });
        }
        bolts(g, px - 82, b.oy + 21, px + 82, b.oy + 21, 20, 1.4);
        bolts(g, px - 64, bot - 12, px + 64, bot - 12, 16, 1.2);
        hazard(g, px - 70, bot - 30, 140, 4);
        for (let k = 0; k < 4; k++) g.rect(b.ox + b.ow - 170, bot - 16 - k * 30, 130, 1.5).fill({ color: DC.grime, alpha: 0.7 });
        break;
      }
      case 'dock': {
        // The catwalk's railing, a winch gantry over the pool, and the pool's lip.
        const f0 = b.floor(0);
        g.rect(b.ox, f0 - 40, b.ow, 4).fill({ color: COL.chrome });
        for (let x = b.ox + 20; x < b.ox + b.ow; x += 70) g.rect(x, f0 - 40, 3, 40).fill({ color: COL.chromeDark });
        g.rect(b.ox + 40, b.oy + 8, b.ow - 80, 14).fill({ color: COL.chrome });
        for (const x of [b.cx - 120, b.cx + 120]) {
          g.rect(x - 1.5, b.oy + 22, 3, f0 - b.oy - 60).fill({ color: COL.chromeDark });
          g.circle(x, f0 - 36, 7).stroke({ color: COL.chrome, width: 3 });
        }
        addText(sign('MOON POOL', b.cx, f0 + 28, 11, 0x9ae0e0, 0.6));
        // The gantry's bolted beam, winch drums, and stripes along the catwalk's edge.
        bolts(g, b.ox + 46, b.oy + 15, b.ox + b.ow - 46, b.oy + 15, 30, 1.3);
        for (const x of [b.cx - 120, b.cx + 120]) {
          g.circle(x, b.oy + 30, 9).fill({ color: COL.chromeDark });
          g.circle(x, b.oy + 30, 5).fill({ color: COL.chrome });
        }
        hazard(g, b.ox, f0 - 6, b.ow, 4);
        break;
      }
      case 'lab': {
        // A scanner table with a lime hologram, and wall screens.
        g.roundRect(b.cx - 70, bot - 50, 140, 50, 6).fill({ color: COL.wallDark });
        g.rect(b.cx - 70, bot - 50, 140, 4).fill({ color: COL.chrome });
        for (const x of [b.ox + 20, b.ox + b.ow - 80]) {
          g.rect(x, b.oy + 50, 60, 40).fill({ color: 0x0c1418 });
          g.rect(x - 3, b.oy + 47, 66, 46).stroke({ color: COL.chromeDark, width: 2.4 });
          g.rect(x + 26, b.oy + 93, 8, 10).fill({ color: COL.chromeDark });
        }
        // Drawers under the scanner table, and sample racks on the wall.
        for (let i = 0; i < 3; i++) {
          g.rect(b.cx - 62 + i * 44, bot - 40, 38, 30).stroke({ color: DC.bevelLo, width: 1.2 });
          g.rect(b.cx - 49 + i * 44, bot - 28, 12, 3).fill({ color: COL.chrome });
        }
        for (let i = 0; i < 6; i++) {
          g.roundRect(b.ox + 110 + i * 12, b.oy + 64, 6, 20, 3).fill({ color: [0x6f8a1e, 0x2a7080, 0xb06a3a][i % 3], alpha: 0.8 });
        }
        g.rect(b.ox + 104, b.oy + 82, 78, 4).fill({ color: COL.chromeDark });
        this.screens.push({ x: b.cx, y: bot - 80, radius: 220, intensity: 0.55, color: [0.7, 1, 0.35], zone: id } as Light);
        break;
      }
      case 'workshop': {
        // A fabricator bench with a robot arm (it works in animate), and tool racks.
        g.roundRect(b.cx - 140, bot - 44, 280, 44, 6).fill({ color: COL.wallDark });
        g.rect(b.cx - 140, bot - 44, 280, 4).fill({ color: COL.chrome });
        g.rect(b.cx - 10, b.oy, 20, 30).fill({ color: COL.chromeDark });
        for (let k = 0; k < 5; k++) g.rect(b.ox + 30 + k * 18, b.oy + 50, 4, 40 + (k % 2) * 14).fill({ color: COL.chrome });
        // A pegboard of tools (a wrench, a hammer, a saw), the bench's vice and drawers.
        g.rect(b.ox + b.ow - 180, b.oy + 40, 140, 90).fill({ color: 0x3a3428 });
        for (let y = b.oy + 48; y < b.oy + 126; y += 10) for (let x = b.ox + b.ow - 172; x < b.ox + b.ow - 44; x += 10) g.circle(x, y, 1).fill({ color: DC.grime });
        const tx = b.ox + b.ow - 160;
        g.rect(tx, b.oy + 52, 4, 46).fill({ color: COL.chrome });
        g.circle(tx + 2, b.oy + 52, 6).stroke({ color: COL.chrome, width: 3 });
        g.rect(tx + 34, b.oy + 56, 4, 44).fill({ color: 0x6a4a2e });
        g.rect(tx + 26, b.oy + 52, 20, 9).fill({ color: COL.chromeDark });
        g.poly([tx + 66, b.oy + 54, tx + 104, b.oy + 54, tx + 104, b.oy + 66, tx + 66, b.oy + 78]).fill({ color: COL.chrome });
        g.rect(tx + 100, b.oy + 52, 8, 16).fill({ color: COL.red, alpha: 0.85 });
        g.roundRect(b.cx + 90, bot - 60, 34, 16, 3).fill({ color: COL.chromeDark });
        g.rect(b.cx + 100, bot - 74, 14, 14).fill({ color: COL.chrome });
        for (let i = 0; i < 4; i++) g.rect(b.cx - 130 + i * 50, bot - 30, 40, 22).stroke({ color: DC.bevelLo, width: 1.2 });
        break;
      }
      case 'recomp': {
        // A pressure chamber: a chrome cylinder with gold bands and a round door, lime light inside.
        const cx = b.ox + b.ow * 0.62;
        g.roundRect(cx - 90, b.oy + 14, 180, bot - b.oy - 14, 60).fill({ color: COL.chrome });
        g.roundRect(cx - 80, b.oy + 22, 160, bot - b.oy - 30, 54).fill({ color: COL.wallDark });
        for (const y of [b.oy + 50, bot - 40]) g.rect(cx - 90, y, 180, 8).fill({ color: COL.gold });
        g.circle(cx, (b.oy + bot) / 2, 40).fill({ color: COL.chromeDark });
        g.circle(cx, (b.oy + bot) / 2, 30).fill({ color: COL.glassSea });
        this.screens.push({ x: cx, y: (b.oy + bot) / 2, radius: 160, intensity: 0.5, color: [0.75, 1, 0.4], zone: id } as Light);
        g.roundRect(b.ox + 40, bot - 80, 60, 80, 4).fill({ color: COL.wallDark });
        // The door's locking wheel, bolts round the bands, gauges on the control box.
        const dy = (b.oy + bot) / 2;
        g.circle(cx, dy, 46).stroke({ color: COL.chromeDark, width: 3 });
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          rivet(g, cx + Math.cos(a) * 36, dy + Math.sin(a) * 36, 1.6);
        }
        for (const y of [b.oy + 54, bot - 36]) bolts(g, cx - 84, y, cx + 84, y, 21, 1.1);
        for (const yy of [bot - 64, bot - 40]) {
          g.circle(b.ox + 58, yy, 7).fill({ color: COL.chrome });
          g.circle(b.ox + 58, yy, 5).fill({ color: 0xd8d4c4 });
          g.moveTo(b.ox + 58, yy).lineTo(b.ox + 61, yy - 3).stroke({ color: COL.red, width: 1 });
        }
        pipeUp(g, b.ox + 86, b.oy + 20, bot - 80, 4, DC.copper, DC.copperHi);
        break;
      }
      case 'hatch': {
        // Milestone 9: an incubator bench of glass cradles under warm lamps, and a console.
        const cr = this.cradles(r);
        g.roundRect(b.ox + 30, bot - 46, b.ow - 170, 46, 6).fill({ color: COL.wallDark });
        g.rect(b.ox + 30, bot - 46, b.ow - 170, 5).fill({ color: COL.chrome });
        bolts(g, b.ox + 38, bot - 30, b.ox + b.ow - 150, bot - 30, 26, 1.2);
        for (const q of cr) {
          // A chrome stand, a shallow bowl of warm water, and a glass bell over it.
          g.rect(q.x - 4, q.y + 16, 8, bot - 46 - q.y - 16).fill({ color: COL.chromeDark });
          g.ellipse(q.x, q.y + 16, 34, 7).fill({ color: COL.chrome });
          g.ellipse(q.x, q.y + 13, 30, 5).fill({ color: 0x1a3a3a });
          g.moveTo(q.x - 30, q.y + 13).bezierCurveTo(q.x - 32, q.y - 40, q.x + 32, q.y - 40, q.x + 30, q.y + 13).stroke({ color: COL.chromeHi, width: 1.6, alpha: 0.5 });
          g.moveTo(q.x - 22, q.y - 8).quadraticCurveTo(q.x - 16, q.y - 26, q.x - 4, q.y - 28).stroke({ color: 0xffffff, width: 2, alpha: 0.18 });
          // A heat lamp hanging over each cradle.
          g.rect(q.x - 1.5, b.oy + 40, 3, q.y - 48 - b.oy - 40).fill({ color: COL.chromeDark });
          g.poly([q.x - 14, q.y - 48, q.x + 14, q.y - 48, q.x + 8, q.y - 58, q.x - 8, q.y - 58]).fill({ color: COL.chrome });
          e.ellipse(q.x, q.y - 47, 10, 2.4).fill({ color: 0xffd890, alpha: 0.9 });
          gl.ellipse(q.x, q.y - 10, 34, 40).fill({ color: 0xffc070, alpha: 0.16 });
          this.screens.push({ x: q.x, y: q.y - 20, radius: 120, intensity: 0.55, color: [1, 0.8, 0.5], zone: id } as Light);
        }
        // The console: a screen of egg readouts and a warm keypad.
        const kx = b.ox + b.ow - 70;
        g.roundRect(kx - 40, bot - 96, 80, 96, 6).fill({ color: COL.wallDark });
        g.roundRect(kx - 32, bot - 88, 64, 40, 3).fill({ color: 0x0c1418 });
        for (let i = 0; i < 6; i++) e.rect(kx - 26 + (i % 3) * 18, bot - 82 + Math.floor(i / 3) * 16, 12, 9).fill({ color: 0xffd890, alpha: 0.35 + (i % 2) * 0.2 });
        for (let i = 0; i < 4; i++) rivet(g, kx - 30 + i * 20, bot - 38, 1.6);
        hazard(g, b.ox + 30, bot - 6, b.ow - 170, 6);
        addText(sign('HATCHERY', kx, bot - 110, 9, 0xffd890, 0.75));
        break;
      }
      case 'farm': {
        // Milestone 9: two tiers of planter troughs under lime grow lamps, a seed console and a tray hatch.
        for (const ty of this.farmTiers(r)) {
          g.rect(b.ox + 110, ty, b.ow - 220, 14).fill({ color: COL.chromeDark });
          g.rect(b.ox + 114, ty + 2, b.ow - 228, 8).fill({ color: 0x4a3a28 });
          g.rect(b.ox + 110, ty, b.ow - 220, 2).fill({ color: COL.chromeHi, alpha: 0.5 });
          bolts(g, b.ox + 116, ty + 12, b.ox + b.ow - 116, ty + 12, 30, 1);
          // The lamp rail over the tier.
          g.rect(b.ox + 110, ty - 70, b.ow - 220, 5).fill({ color: COL.chrome });
          for (let x = b.ox + 130; x < b.ox + b.ow - 120; x += 60) {
            e.rect(x - 14, ty - 65, 28, 3).fill({ color: COL.lime, alpha: 0.85 });
            gl.ellipse(x, ty - 40, 26, 30).fill({ color: COL.lime, alpha: 0.08 });
          }
          this.screens.push({ x: b.cx, y: ty - 40, radius: b.ow * 0.5, intensity: 0.5, color: [0.75, 1, 0.45], zone: id } as Light);
        }
        for (const x of [b.ox + 104, b.ox + b.ow - 116]) g.rect(x, b.oy + 30, 12, bot - b.oy - 30).fill({ color: COL.chromeDark });
        // Seed console (left) and the tray hatch (right).
        const sx = b.ox + 56;
        g.roundRect(sx - 34, bot - 84, 68, 84, 6).fill({ color: COL.wallDark });
        g.roundRect(sx - 26, bot - 76, 52, 30, 3).fill({ color: 0x0c1418 });
        addText(sign('CROP', sx, bot - 96, 9, 0xc6f03a, 0.75));
        const tx = b.ox + b.ow - 56;
        g.roundRect(tx - 34, bot - 64, 68, 64, 6).fill({ color: COL.chrome });
        g.roundRect(tx - 28, bot - 58, 56, 34, 4).fill({ color: COL.wallDark });
        for (let i = 0; i < 4; i++) rivet(g, tx - 26 + i * 17, bot - 14, 1.4);
        addText(sign('TRAY', tx, bot - 76, 9, 0xd8dde0, 0.6));
        hazard(g, b.ox + 110, bot - 6, b.ow - 220, 6);
        break;
      }
      case 'revive': {
        // Milestone 9: a still, warm pool in a brass rim, under a glass hood.
        const py = bot - 34;
        g.roundRect(b.cx - 170, py - 12, 340, 46, 18).fill({ color: 0xa8822e });
        g.roundRect(b.cx - 160, py - 6, 320, 30, 14).fill({ color: 0x14221c });
        bolts(g, b.cx - 160, py - 9, b.cx + 160, py - 9, 24, 1.3);
        g.moveTo(b.cx - 150, py - 12).bezierCurveTo(b.cx - 140, b.oy + 10, b.cx + 140, b.oy + 10, b.cx + 150, py - 12).stroke({ color: COL.chromeHi, width: 2, alpha: 0.45 });
        g.moveTo(b.cx - 100, py - 50).quadraticCurveTo(b.cx - 70, b.oy + 40, b.cx - 20, b.oy + 36).stroke({ color: 0xffffff, width: 3, alpha: 0.12 });
        gl.ellipse(b.cx, py, 180, 40).fill({ color: 0xfff0c0, alpha: 0.14 });
        this.screens.push({ x: b.cx, y: py - 10, radius: 260, intensity: 0.65, color: [1, 0.93, 0.7], zone: id } as Light);
        for (const x of [b.cx - 220, b.cx + 220]) {
          g.roundRect(x - 18, bot - 120, 36, 120, 6).fill({ color: COL.wallDark });
          e.rect(x - 10, bot - 110, 20, 3).fill({ color: 0xfff0c0, alpha: 0.6 });
        }
        addText(sign('REVIVAL POOL', b.cx, b.oy + 54, 10, 0xfff0c0, 0.7));
        break;
      }
      case 'signal': {
        // Milestone 10: the decoder: a big round pattern screen in a brass ring, receiver racks either side.
        const sy = b.oy + (bot - b.oy) * 0.42;
        g.circle(b.cx, sy, 104).fill({ color: 0xa8822e });
        g.circle(b.cx, sy, 94).fill({ color: 0x081014 });
        bolts(g, b.cx - 96, sy - 100, b.cx + 96, sy - 100, 12, 1.2);
        for (let k = 0; k < 24; k++) {
          const a = (k / 24) * Math.PI * 2;
          g.moveTo(b.cx + Math.cos(a) * 96, sy + Math.sin(a) * 96).lineTo(b.cx + Math.cos(a) * 102, sy + Math.sin(a) * 102).stroke({ color: 0x5a4418, width: 1.4 });
        }
        for (const x of [b.ox + 70, b.ox + b.ow - 70]) {
          g.roundRect(x - 34, bot - 200, 68, 200, 6).fill({ color: COL.wallDark });
          for (let k = 0; k < 8; k++) {
            g.rect(x - 26, bot - 190 + k * 22, 52, 14).fill({ color: 0x14181b });
            e.rect(x - 22, bot - 186 + k * 22, 6 + ((k * 13) % 30), 3).fill({ color: 0xffc860, alpha: 0.6 });
          }
        }
        g.roundRect(b.cx - 60, bot - 70, 120, 70, 8).fill({ color: COL.chromeDark });
        g.roundRect(b.cx - 50, bot - 62, 100, 26, 4).fill({ color: 0x0c1418 });
        addText(sign('SIGNAL ARRAY', b.cx, sy + 128, 11, 0xffd890, 0.75));
        this.screens.push({ x: b.cx, y: sy, radius: 300, intensity: 0.5, color: [1, 0.85, 0.6], zone: id } as Light);
        break;
      }
      case 'crane': {
        // Upper level: the gantry beam and trolley. Lower: the cradle where salvage is broken down.
        const f0 = b.floor(0);
        g.rect(b.ox + 20, b.oy + 20, b.ow - 40, 22).fill({ color: COL.chrome });
        for (let x = b.ox + 30; x < b.ox + b.ow - 30; x += 30) g.poly([x, b.oy + 22, x + 15, b.oy + 40, x + 30, b.oy + 22]).stroke({ color: COL.chromeDark, width: 2 });
        g.roundRect(b.cx - 30, b.oy + 42, 60, 30, 4).fill({ color: COL.wallDark });
        g.rect(b.cx - 1.5, b.oy + 72, 3, f0 - b.oy - 100).fill({ color: COL.chromeDark });
        g.roundRect(b.cx - 120, bot - 30, 240, 30, 6).fill({ color: COL.wallDark });
        g.rect(b.cx - 120, bot - 30, 240, 4).fill({ color: COL.gold, alpha: 0.8 });
        // The trolley's wheels and motor, a hook block, the cradle's jaws and a stripe round it.
        for (const x of [b.cx - 20, b.cx + 20]) g.circle(x, b.oy + 44, 5).fill({ color: COL.chrome });
        g.rect(b.cx - 26, b.oy + 50, 52, 3).fill({ color: DC.grime, alpha: 0.8 });
        g.roundRect(b.cx - 10, f0 - 30, 20, 16, 3).fill({ color: COL.chrome });
        g.arc(b.cx, f0 - 8, 8, 0, Math.PI).stroke({ color: COL.chromeDark, width: 3.5 });
        for (const x of [b.cx - 110, b.cx + 96]) g.rect(x, bot - 52, 14, 22).fill({ color: COL.chromeDark });
        bolts(g, b.cx - 112, bot - 20, b.cx + 112, bot - 20, 28, 1.2);
        hazard(g, b.cx - 120, bot - 6, 240, 6);
        break;
      }
    }
  }

  // -------------------------------------------------------------------------

  animate(d: Graphics, de: Graphics, time: number): void {
    const c = this.ctx;
    // Things riding the lines: bundles of material on belts (their colour), soft pulses in pipes.
    for (const r of this.routes) {
      const fl = c.flow(r.id);
      if (!fl || fl.rate <= 0.02) continue;
      if (r.kind === 'belt') {
        const [col, hi] = ITEM_COLOURS[fl.item ?? 'fibre'];
        const off = (time * (r.tier > 1 ? 44 : 24) * 2.2) % 28;
        for (let dd = off; dd < r.len - 6; dd += 28) {
          const [x, y] = pointAlong(r.pts, dd);
          d.roundRect(x - 4.5, y - 7, 9, 6, 2).fill({ color: col });
          d.rect(x - 4, y - 6.5, 8, 1.4).fill({ color: hi, alpha: 0.7 });
        }
      } else {
        const off = (time * (r.tier > 1 ? 70 : 40) * 2) % 60;
        for (let dd = off; dd < r.len; dd += 60) {
          const [x, y] = pointAlong(r.pts, dd);
          de.circle(x, y, 3.4).fill({ color: 0xd8e6a0, alpha: 0.75 });
        }
      }
    }
    // Turbines: the impeller turns, slower without anything to power.
    for (const t of this.turbines) {
      const a0 = time * 1.6;
      for (let i = 0; i < 3; i++) {
        const a = a0 + (i / 3) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const P = (u: number, v: number) => [t.x + ca * u - sa * v, t.y + sa * u + ca * v];
        d.poly([...P(12, -10), ...P(t.r * 0.6, -22), ...P(t.r - 6, -8), ...P(t.r - 8, 6), ...P(14, 8)]).fill({ color: 0x5a646a });
        d.poly([...P(14, 0), ...P(t.r - 8, 0), ...P(t.r - 8, 6), ...P(14, 8)]).fill({ color: 0x3a4248 });
      }
      d.circle(t.x, t.y, 16).fill({ color: COL.chrome });
      d.circle(t.x, t.y, 6).fill({ color: COL.chromeDark });
    }
    for (const r of this.level.rooms) {
      const on = this.powered(r.piece.id);
      const b = this.box(r);
      const bot = b.bottom;
      const id = r.piece.id;
      if (r.kind === 'dock' && c.subDocked(id)) {
        // KS-1 berthed in the pool: charcoal hull, lime dome, a lamp on the nose.
        const sy = bot - 30;
        const sx = b.cx;
        d.roundRect(sx - 100, sy - 36, 200, 44, 18).fill({ color: 0x2c3236 });
        d.roundRect(sx - 100, sy - 36, 200, 10, 5).fill({ color: 0x4a545a });
        d.rect(sx - 70, sy - 14, 140, 2).fill({ color: COL.gold });
        d.poly([sx - 40, sy - 36, sx - 26, sy - 62, sx + 26, sy - 62, sx + 40, sy - 36]).fill({ color: 0x4a6a14 });
        d.poly([sx - 30, sy - 36, sx - 20, sy - 56, sx + 6, sy - 56, sx + 2, sy - 36]).fill({ color: COL.lime, alpha: 0.6 });
        de.circle(sx + 96, sy - 16, 4).fill({ color: 0xfff0b0 });
        de.circle(sx - 94, sy - 12, 3).fill({ color: COL.red });
      }
      if (r.kind === 'signal' && on) {
        // The pattern screen: slow rings while listening, the Choir's own colours while a fragment decodes.
        const sy = b.oy + (bot - b.oy) * 0.42;
        const pr = c.signalProgress();
        for (let k = 0; k < 4; k++) {
          const u = (time * (pr >= 0 ? 0.35 : 0.12) + k / 4) % 1;
          const col = pr >= 0 ? [0x4ad8e8, 0x9a6af0, 0xe060c8, 0x4ad8e8][k] : 0xffc860;
          de.circle(b.cx, sy, 8 + u * 82).stroke({ color: col, width: 1.6, alpha: 0.55 * (1 - u) });
        }
        if (pr >= 0) de.rect(b.cx - 46, bot - 54, 92 * pr, 6).fill({ color: 0x9ad0e0, alpha: 0.85 });
      }
      if (r.kind === 'revive' && on) {
        // Slow rings drifting out across the still, warm water.
        const py = bot - 22;
        for (let k = 0; k < 3; k++) {
          const u = ((time * 0.25 + k / 3) % 1);
          de.ellipse(b.cx, py, 20 + u * 130, 3 + u * 8).stroke({ color: 0xfff0c0, width: 1.4, alpha: 0.5 * (1 - u) });
        }
      } else if (r.kind === 'farm' && on) {
        const f = c.farmCrop(id);
        const tx = b.ox + b.ow - 56;
        for (let k = 0; k < Math.min(4, f.tray); k++) d.roundRect(tx - 24 + k * 12, bot - 50, 10, 22, 2).fill({ color: 0xc8a050 });
        de.rect(b.ox + 34, bot - 72, 44 * f.progress, 4).fill({ color: COL.lime, alpha: 0.85 });
      }
      if (r.kind === 'dome' && on) {
        const cx2 = b.ox + b.ow - 120;
        d.rect(cx2 - 42, bot - 62, 38, 24).fill({ color: 0x9ad040, alpha: 0.55 + 0.1 * Math.sin(time * 3) });
        d.rect(cx2 + 4, bot - 62, 38, 24).fill({ color: 0xc6f03a, alpha: 0.45 });
        for (let k = 0; k < 4; k++) d.rect(cx2 - 38, bot - 58 + k * 5, 10 + ((time * 20 + k * 7) % 24), 2).fill({ color: 0x0c1418, alpha: 0.6 });
        const px = b.ox + b.ow - 90;
        const f0 = b.floor(0);
        for (let i = 0; i < 5; i++) de.rect(px - 36 + i * 16, f0 - 90 + Math.sin(time * 2 + i) * 4, 10, 30).fill({ color: COL.lime, alpha: 0.18 });
      } else if ((r.kind === 'storage' || r.kind === 'sorter') && on) {
        // Crates on the racks, filling with what's stored.
        const n = Math.round(c.storedFrac() * 24);
        for (let k = 0; k < Math.min(24, n); k++) {
          const shelf = Math.floor(k / 8);
          const x = b.ox + 26 + (k % 8) * ((b.ow - 52) / 8);
          d.roundRect(x, bot - 40 - shelf * 46 - 30, (b.ow - 52) / 8 - 4, 30, 3).fill({ color: [0x5a4a38, 0x6e5440, 0x8a8a7a, 0x4a6a4a][k % 4] });
        }
        de.rect(b.ox + b.ow - 50, b.oy + 50, 20, 60).fill({ color: 0x0c1418 });
        de.rect(b.ox + b.ow - 48, b.oy + 108 - 56 * c.storedFrac(), 16, 56 * c.storedFrac()).fill({ color: COL.lime, alpha: 0.85 });
      } else if (r.kind === 'tank' || r.kind === 'gtank') {
        this.drawTank(r, d, de, time, on);
      } else if (r.kind === 'filter' && on) {
        for (const x of [b.ox + 50, b.ox + b.ow - 90]) {
          d.roundRect(x, bot - 146, 40, 138, 6).fill({ color: 0x5a8a1e, alpha: 0.6 });
          for (let i = 0; i < 6; i++) de.circle(x + 8 + ((i * 13) % 26), bot - 12 - ((time * 60 + i * 23) % 130), 2.4).fill({ color: 0xe0ff90, alpha: 0.7 });
        }
        de.circle(b.cx, bot - 40, 6).fill({ color: COL.lime, alpha: 0.8 });
      } else if (r.kind === 'feeder') {
        const lv = c.feederLevels(id);
        const vh = 134;
        d.roundRect(b.ox + 88, bot - 8 - vh * lv.mash, b.ow - 126, vh * lv.mash, 6).fill({ color: 0x6a8a2a, alpha: 0.85 });
        const f0 = b.floor(0);
        d.rect(b.ox + 100, f0 - 46 - 90 * lv.hopper, b.ow - 150, 90 * lv.hopper).fill({ color: 0xc9a24a, alpha: 0.85 });
        if (lv.run && on) de.circle(b.ox + b.ow - 50, bot - 170, 4).fill({ color: COL.lime });
      } else if (r.kind === 'press') {
        const px = b.ox + 160;
        const run = on && c.pressing(id);
        const stroke = run ? (Math.sin(time * 2.4) + 1) / 2 : 0;
        const ramY = b.oy + 32 + stroke * (bot - b.oy - 110);
        d.rect(px - 10, b.oy + 32, 20, ramY - b.oy - 32).fill({ color: COL.chromeHi });
        d.roundRect(px - 60, ramY, 120, 40, 4).fill({ color: COL.chromeDark });
        d.rect(px - 60, ramY + 36, 120, 4).fill({ color: COL.gold });
        if (run && stroke > 0.95) de.circle(px, bot - 28, 10).fill({ color: 0xffd080, alpha: 0.7 });
      } else if (r.kind === 'lab' && on) {
        const busy = c.stationBusy(id);
        for (let i = 0; i < 5; i++) de.ellipse(b.cx, bot - 70 - i * 12, 50 - i * 8, 6).stroke({ color: COL.lime, width: 1.5, alpha: busy ? 0.6 : 0.25 });
        for (const x of [b.ox + 20, b.ox + b.ow - 80]) {
          d.rect(x, b.oy + 50, 60, 40).fill({ color: 0x5a8a1e, alpha: 0.5 });
          if (busy) de.rect(x + 4, b.oy + 54 + ((time * 30) % 32), 52, 3).fill({ color: COL.lime, alpha: 0.8 });
        }
      } else if (r.kind === 'workshop') {
        const busy = on && c.stationBusy(id);
        const a = busy ? Math.sin(time * 3) * 0.6 : 0.2;
        const ax = b.cx;
        const ay = b.oy + 30;
        const ex = ax + Math.sin(a) * 60;
        const ey = ay + Math.cos(a) * 60;
        const tx = ex + Math.sin(a * 1.6 + 1) * 46;
        const ty = ey + Math.cos(a * 1.6 + 1) * 46;
        d.moveTo(ax, ay).lineTo(ex, ey).stroke({ color: COL.chrome, width: 9, cap: 'round' });
        d.moveTo(ex, ey).lineTo(tx, ty).stroke({ color: COL.white, width: 7, cap: 'round' });
        d.circle(ex, ey, 7).fill({ color: COL.chromeDark });
        if (busy && Math.sin(time * 17) > 0.2) de.circle(tx, ty + 4, 5).fill({ color: 0xfff0b0 });
      } else if (r.kind === 'recomp' && on) {
        const cx = b.ox + b.ow * 0.62;
        d.circle(cx, (b.oy + bot) / 2, 28).fill({ color: 0x8ac030, alpha: 0.35 + 0.1 * Math.sin(time * 2) });
      } else if (r.kind === 'crane') {
        const f0 = b.floor(0);
        const sway = Math.sin(time * 0.8) * 6;
        d.moveTo(b.cx, f0 - 28).lineTo(b.cx + sway, f0 + 20).stroke({ color: COL.chromeDark, width: 2 });
        d.poly([b.cx + sway - 8, f0 + 20, b.cx + sway + 8, f0 + 20, b.cx + sway, f0 + 34]).fill({ color: COL.chrome });
        const q = c.save.craneQueue;
        for (let k = 0; k < Math.min(3, q); k++) d.roundRect(b.cx - 90 + k * 64, bot - 30 - 40, 52, 40, 6).fill({ color: [0x5a4a38, 0x6a5a48, 0x4a4038][k] });
      }
    }
  }

  private drawTank(r: Room, d: Graphics, de: Graphics, time: number, on: boolean): void {
    const t = this.tanks.find((q) => q.room === r)!;
    void d;
    // Bubbles from the filter inlet, when powered.
    if (on) for (let i = 0; i < 8; i++) de.circle(t.x + t.w - 30 + Math.sin(time * 2 + i) * 4, t.y + t.h - 20 - ((time * 50 + i * 37) % (t.h - 30)), 2 + (i % 3)).fill({ color: 0xc8ffff, alpha: 0.35 });

  }
}
