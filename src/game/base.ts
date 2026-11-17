import { groundY } from '../world/terrain';
import { BlueprintId, MATERIAL_ORDER, MaterialId } from './state';

/**
 * The rules of the snap-together base (milestone 3). No drawing here, just
 * the grid, the pieces, where they may go and which ones have power.
 *
 * The base is laid out on a grid of square cells over the sand at the
 * Kestrel site. Each piece covers a few cells and has connector collars on
 * some of its sides. A new piece must line one of its collars up with an
 * open collar on the base, so everything is joined into one structure.
 * A current turbine powers every piece joined to it through collars, and a
 * piece only does its job while it has power.
 */

/** Size of one grid cell in world units (75 wu is about 1 metre, so 1.5 m). */
export const CELL = 112;
/**
 * Milestone 5: the site grew from 11 × 3 cells on the sand shelf to 58 × 14
 * cells over the whole Kestrel basin. The old site is the top east corner of
 * the new grid, at OLD_SITE, so bases built before keep their place in the
 * world (old saves are shifted by this much when they load).
 */
export const GRID_COLS = 58;
export const GRID_ROWS = 14;
export const OLD_SITE = { gx: 47, gy: 11 };
/** West edge of the build grid. */
export const GRID_X0 = 380 - OLD_SITE.gx * CELL;
export const GRID_X1 = GRID_X0 + GRID_COLS * CELL;
/** Where the old site's bottom was: just above the highest sand on the shelf. */
const SHELF_BASE = 423;
/**
 * The bottom of the grid, just above the basin floor. Pieces on the basin
 * floor stand on short legs; pieces on the shelf stand on the shelf.
 */
export const GRID_BASE = SHELF_BASE + OLD_SITE.gy * CELL;

/**
 * Which cells are open water. Cells inside rock (under the shelf, and the
 * foot of the cliff) cannot be built in yet: tunnelling comes later.
 */
const OPEN: boolean[] = (() => {
  const out: boolean[] = [];
  for (let gy = 0; gy < GRID_ROWS; gy++)
    for (let gx = 0; gx < GRID_COLS; gx++) {
      const x0 = GRID_X0 + gx * CELL;
      const bottom = GRID_BASE - gy * CELL;
      let open = true;
      for (let x = x0 + 2; x <= x0 + CELL - 2; x += 6) if (groundY(x) < bottom - 1) open = false;
      out.push(open);
    }
  return out;
})();

/** Is this cell on the grid and open water (not rock)? */
export function cellOpen(gx: number, gy: number): boolean {
  return gx >= 0 && gy >= 0 && gx < GRID_COLS && gy < GRID_ROWS && OPEN[gy * GRID_COLS + gx];
}

/** Does a piece in this cell stand on the seabed (the basin floor, the shelf or the cliff)? */
export function onSeabed(gx: number, gy: number): boolean {
  return gy === 0 || !cellOpen(gx, gy - 1);
}

/** How many cells of the site are open water. */
export const OPEN_CELLS = OPEN.filter(Boolean).length;

export type PieceKind = 'dome' | 'corridor' | 'turbine' | 'storage' | 'tank' | 'filter' | 'feeder' | 'press' | 'dock' | 'lab' | 'workshop' | 'gtank' | 'sorter' | 'recomp' | 'crane' | 'hatch' | 'farm' | 'revive';
/** Creature tanks of either size (milestone 7 part 2 added the Grand tank). */
export function isTankKind(k: PieceKind): boolean {
  return k === 'tank' || k === 'gtank';
}
/** Pieces that store materials (storage pods and sorting pods). */
export function isStoreKind(k: PieceKind): boolean {
  return k === 'storage' || k === 'sorter';
}
export type PortKind = 'beltIn' | 'beltOut' | 'pipeIn' | 'pipeOut';
export type Dir = 'L' | 'R' | 'U' | 'D';

export interface PieceDef {
  kind: PieceKind;
  name: string;
  /** What the piece does, in one line. */
  job: string;
  cost: Partial<Record<MaterialId, number>>;
  /** Seconds of welding by the build drone. */
  buildTime: number;
  /** Footprint in cells, for each rotation the piece has. */
  shapes: { w: number; h: number; collars: { cx: number; cy: number; dir: Dir }[] }[];
  /**
   * Milestone 5: which transport lines it takes in and sends out (see LINES
   * in src/game/factory.ts), and how many of each it can have.
   */
  ports?: Partial<Record<PortKind, number>>;
  /** Can Echo whorls be fitted to it (milestone 5)? */
  whorls?: boolean;
  /** Milestone 7 part 2: a blueprint the Lab must decode before the build card appears. */
  blueprint?: BlueprintId;
}

export const PIECES: Record<PieceKind, PieceDef> = {
  dome: {
    kind: 'dome',
    name: 'Dome habitat',
    job: 'Swim inside to breathe, refill oxygen and save. You wake up here after a blackout.',
    cost: { scrap: 3, quartz: 4, fibre: 2 },
    buildTime: 40,
    shapes: [{ w: 2, h: 2, collars: [{ cx: 0, cy: 0, dir: 'L' }, { cx: 1, cy: 0, dir: 'R' }] }],
  },
  corridor: {
    kind: 'corridor',
    name: 'Corridor',
    job: 'Joins pieces and extends the base. Rotate it to run up or down.',
    cost: { scrap: 2, fibre: 1 },
    buildTime: 10,
    shapes: [
      { w: 1, h: 1, collars: [{ cx: 0, cy: 0, dir: 'L' }, { cx: 0, cy: 0, dir: 'R' }] },
      { w: 1, h: 1, collars: [{ cx: 0, cy: 0, dir: 'U' }, { cx: 0, cy: 0, dir: 'D' }] },
    ],
  },
  turbine: {
    kind: 'turbine',
    name: 'Current turbine',
    job: 'Turns the reef current into power for every piece joined to it.',
    cost: { scrap: 2, copper: 4, fibre: 1 },
    buildTime: 28,
    shapes: [{ w: 1, h: 2, collars: [{ cx: 0, cy: 0, dir: 'L' }, { cx: 0, cy: 0, dir: 'R' }] }],
  },
  storage: {
    kind: 'storage',
    name: 'Storage pod',
    job: 'Stop by it and tap Collect to unload what you carry. Stored materials are safe from blackouts.',
    cost: { scrap: 3, copper: 1, fibre: 1 },
    buildTime: 18,
    ports: { beltOut: 4, beltIn: 4 },
    shapes: [
      {
        w: 1,
        h: 1,
        collars: [
          { cx: 0, cy: 0, dir: 'L' },
          { cx: 0, cy: 0, dir: 'R' },
          { cx: 0, cy: 0, dir: 'U' },
          { cx: 0, cy: 0, dir: 'D' },
        ],
      },
    ],
  },
  tank: {
    kind: 'tank',
    name: 'Creature tank',
    job: 'Houses up to four creatures. Stop by it with a creature in your jar and tap Collect to put it in; tap Tend to look after them.',
    cost: { scrap: 2, quartz: 3, fibre: 1 },
    buildTime: 24,
    ports: { pipeIn: 1, beltOut: 2 },
    whorls: true,
    shapes: [{ w: 2, h: 1, collars: [{ cx: 0, cy: 0, dir: 'L' }, { cx: 1, cy: 0, dir: 'R' }] }],
  },
  filter: {
    kind: 'filter',
    name: 'Filter pump',
    job: 'Keeps the water clean in up to two creature tanks joined to it.',
    cost: { scrap: 2, copper: 2, fibre: 2 },
    buildTime: 16,
    shapes: [
      {
        w: 1,
        h: 1,
        collars: [
          { cx: 0, cy: 0, dir: 'L' },
          { cx: 0, cy: 0, dir: 'R' },
          { cx: 0, cy: 0, dir: 'U' },
        ],
      },
    ],
  },
  feeder: {
    kind: 'feeder',
    name: 'Auto feeder',
    job: 'Presses kelp fibre from a conveyor into feed mash and pumps it down feed pipes to creature tanks, so they feed themselves.',
    cost: { scrap: 3, copper: 3, quartz: 2 },
    buildTime: 30,
    shapes: [{ w: 1, h: 2, collars: [{ cx: 0, cy: 0, dir: 'L' }, { cx: 0, cy: 0, dir: 'R' }] }],
    ports: { beltIn: 2, pipeOut: 4 },
    whorls: true,
  },
  press: {
    kind: 'press',
    name: 'Plate press',
    job: 'Presses scrap and copper into hull plating. Conveyors in and out.',
    cost: { scrap: 4, copper: 2, quartz: 1 },
    buildTime: 34,
    shapes: [{ w: 2, h: 1, collars: [{ cx: 0, cy: 0, dir: 'L' }, { cx: 1, cy: 0, dir: 'R' }] }],
    ports: { beltIn: 2, beltOut: 2 },
    whorls: true,
  },
  dock: {
    kind: 'dock',
    name: 'Moon pool dock',
    job: 'Builds, berths, repairs and refits the submersible. The sub rises into the pool from the open berth underneath.',
    cost: { plate: 6, scrap: 4, copper: 3, quartz: 2 },
    buildTime: 45,
    // The hall is the top row (collars there); the bottom row is the open berth.
    shapes: [{ w: 3, h: 2, collars: [{ cx: 0, cy: 1, dir: 'L' }, { cx: 2, cy: 1, dir: 'R' }] }],
  },
  // Milestone 7: the first gear gate.
  lab: {
    kind: 'lab',
    name: 'Lab',
    job: 'Reads scans and data finds (like the sled recorder) and decodes them into blueprints. Tap Lab beside it.',
    cost: { scrap: 3, quartz: 3, copper: 2 },
    buildTime: 26,
    shapes: [
      {
        w: 1,
        h: 1,
        collars: [
          { cx: 0, cy: 0, dir: 'L' },
          { cx: 0, cy: 0, dir: 'R' },
          { cx: 0, cy: 0, dir: 'U' },
        ],
      },
    ],
  },
  workshop: {
    kind: 'workshop',
    name: 'Workshop',
    job: 'Builds gear from the blueprints the Lab decodes. Tap Workshop beside it.',
    cost: { plate: 4, scrap: 3, copper: 2 },
    buildTime: 36,
    shapes: [{ w: 2, h: 1, collars: [{ cx: 0, cy: 0, dir: 'L' }, { cx: 1, cy: 0, dir: 'R' }] }],
  },
  // Milestone 7 part 2: the kelp forest pieces (Colin's choices: costs as proposed).
  gtank: {
    kind: 'gtank',
    name: 'Grand tank',
    job: 'A big tank for up to eight creatures, with a planter for two kinds of plant, so two species can both have their favourite. Collect and Tend work as with a creature tank.',
    cost: { resin: 6, plate: 4, quartz: 3, moss: 2 },
    buildTime: 50,
    ports: { pipeIn: 1, beltOut: 2 },
    whorls: true,
    blueprint: 'gtank',
    shapes: [
      {
        w: 3,
        h: 2,
        collars: [
          { cx: 0, cy: 0, dir: 'L' },
          { cx: 2, cy: 0, dir: 'R' },
        ],
      },
    ],
  },
  sorter: {
    kind: 'sorter',
    name: 'Sorting pod',
    job: 'Storage with its own bay for every material (12 of each), so creature output or one big haul can never crowd out the rest. Unload and conveyors work as with a storage pod.',
    cost: { resin: 4, scrap: 3, copper: 2 },
    buildTime: 26,
    ports: { beltOut: 4, beltIn: 4 },
    blueprint: 'sorter',
    shapes: [
      {
        w: 1,
        h: 1,
        collars: [
          { cx: 0, cy: 0, dir: 'L' },
          { cx: 0, cy: 0, dir: 'R' },
          { cx: 0, cy: 0, dir: 'U' },
          { cx: 0, cy: 0, dir: 'D' },
        ],
      },
    ],
  },
  // Milestone 8 part 2: the wreck shelf pieces (Colin: recompression room and salvage crane).
  recomp: {
    kind: 'recomp',
    name: 'Recompression room',
    job: 'A brass pressure chamber. Swim inside: it mends a cracked suit fast and refills your air. Later, with the pressure suit, it prepares you for the deep.',
    cost: { brass: 5, plate: 3, quartz: 2 },
    buildTime: 40,
    blueprint: 'recomp',
    shapes: [{ w: 2, h: 1, collars: [{ cx: 0, cy: 0, dir: 'L' }, { cx: 1, cy: 0, dir: 'R' }] }],
  },
  crane: {
    kind: 'crane',
    name: 'Salvage crane',
    job: 'Lift heavy salvage off the wreck shelf with the sub\'s grabber arm and lower it here: the crane breaks each piece into 4 scrap, 2 brass and 1 hull plating, into storage.',
    cost: { brass: 4, plate: 4, scrap: 4 },
    buildTime: 45,
    blueprint: 'crane',
    shapes: [{ w: 2, h: 2, collars: [{ cx: 0, cy: 0, dir: 'L' }, { cx: 1, cy: 0, dir: 'R' }] }],
  },
  // Milestone 9: breeding (Colin's choices: pairs breed in their tank, the Hatchery incubates).
  hatch: {
    kind: 'hatch',
    name: 'Hatchery',
    job: 'Happy grown pairs in the base\'s tanks lay eggs now and then: the Hatchery collects them and keeps them warm (4 at a time). Choose a tank for each young one that hatches. Colour and glow pattern pass from parent to young.',
    cost: { resin: 4, quartz: 3, moss: 2, copper: 2 },
    buildTime: 36,
    shapes: [{ w: 2, h: 1, collars: [{ cx: 0, cy: 0, dir: 'L' }, { cx: 1, cy: 0, dir: 'R' }, { cx: 0, cy: 0, dir: 'U' }] }],
  },
  farm: {
    kind: 'farm',
    name: 'Kelp farm',
    job: 'Grows kelp fibre under lamps, into its own tray, so a conveyor can carry it to an auto feeder or storage. Or switch it to grow cuttings of a tank plant you have scanned: planting with a cutting costs nothing.',
    cost: { fibre: 4, resin: 3, quartz: 2, copper: 2 },
    buildTime: 32,
    ports: { beltOut: 2 },
    whorls: true,
    shapes: [{ w: 2, h: 1, collars: [{ cx: 0, cy: 0, dir: 'L' }, { cx: 1, cy: 0, dir: 'R' }, { cx: 1, cy: 0, dir: 'U' }] }],
  },
  revive: {
    kind: 'revive',
    name: 'Revival pool',
    job: 'Wakes a dormant creature with one glowing bloom: it comes back young, into your jar.',
    cost: { brass: 4, quartz: 4, moss: 3, plate: 2 },
    buildTime: 44,
    blueprint: 'revive',
    shapes: [{ w: 2, h: 1, collars: [{ cx: 0, cy: 0, dir: 'L' }, { cx: 1, cy: 0, dir: 'R' }] }],
  },
};
export const PIECE_ORDER: PieceKind[] = ['dome', 'corridor', 'turbine', 'storage', 'tank', 'filter', 'feeder', 'press', 'dock', 'lab', 'workshop', 'gtank', 'sorter', 'recomp', 'crane', 'hatch', 'farm', 'revive'];
/** Each sorting pod's bay for every material. */
export const SORT_BAY = 12;

/** Where a docked sub sits in a Moon pool dock (milestone 6): its hull in the berth, its dome up in the pool. */
export function berthOf(p: { kind: PieceKind; gx: number; gy: number; rot: number }): { x: number; y: number } {
  const r = pieceRect(p);
  return { x: r.x + r.w / 2, y: r.y + r.h - 74 };
}

/** How many materials each storage pod holds, all kinds together. */
export const STORAGE_PER_POD = 40;

/** A piece in the base, as saved. gx, gy is its bottom-left cell; gy counts up from the seabed. */
export interface Placed {
  id: number;
  kind: PieceKind;
  gx: number;
  gy: number;
  rot: number;
  /** 0..1 while the build drone is welding it (a frame). Missing means finished. */
  progress?: number;
}

/** Is the piece finished (not a frame still being welded)? */
export function isDone(p: { progress?: number }): boolean {
  return p.progress === undefined || p.progress >= 1;
}

export function shapeOf(p: { kind: PieceKind; rot: number }) {
  const s = PIECES[p.kind].shapes;
  return s[((p.rot % s.length) + s.length) % s.length];
}

/** World rectangle covered by a piece: x, y is the top-left corner. */
export function pieceRect(p: { kind: PieceKind; gx: number; gy: number; rot: number }) {
  const s = shapeOf(p);
  const x = GRID_X0 + p.gx * CELL;
  const bottom = GRID_BASE - p.gy * CELL;
  return { x, y: bottom - s.h * CELL, w: s.w * CELL, h: s.h * CELL };
}

/** World position of the middle of a grid cell. */
export function cellCentre(gx: number, gy: number): { x: number; y: number } {
  return { x: GRID_X0 + (gx + 0.5) * CELL, y: GRID_BASE - (gy + 0.5) * CELL };
}

/** The grid cell under a world point (may be outside the grid). */
export function cellAt(x: number, y: number): { gx: number; gy: number } {
  return { gx: Math.floor((x - GRID_X0) / CELL), gy: Math.floor((GRID_BASE - y) / CELL) };
}

const OPP: Record<Dir, Dir> = { L: 'R', R: 'L', U: 'D', D: 'U' };
const STEP: Record<Dir, [number, number]> = { L: [-1, 0], R: [1, 0], U: [0, 1], D: [0, -1] };

/** A collar in grid terms: the cell it is on and the side it faces. */
export interface Collar {
  gx: number;
  gy: number;
  dir: Dir;
}

export function collarsOf(p: Placed | Omit<Placed, 'id'>): Collar[] {
  return shapeOf(p).collars.map((c) => ({ gx: p.gx + c.cx, gy: p.gy + c.cy, dir: c.dir }));
}

/** Where a collar sits in the world (the middle of the cell edge) and which way it faces. */
export function collarPoint(c: Collar): { x: number; y: number; dx: number; dy: number } {
  const m = cellCentre(c.gx, c.gy);
  const [sx, sy] = STEP[c.dir];
  return { x: m.x + (sx * CELL) / 2, y: m.y - (sy * CELL) / 2, dx: sx, dy: -sy };
}

function cellsOf(p: Omit<Placed, 'id'>): [number, number][] {
  const s = shapeOf(p);
  const out: [number, number][] = [];
  for (let i = 0; i < s.w; i++) for (let j = 0; j < s.h; j++) out.push([p.gx + i, p.gy + j]);
  return out;
}

/** The base as a whole: which cells are taken, which collars are joined, which pieces have power. */
export class BaseLayout {
  pieces: Placed[] = [];
  private occupied = new Map<string, Placed>();
  /** Piece id -> ids of the pieces it is joined to. */
  links = new Map<number, number[]>();
  powered = new Set<number>();

  constructor(pieces: Placed[]) {
    this.set(pieces);
  }

  set(pieces: Placed[]): void {
    this.pieces = pieces;
    this.occupied.clear();
    for (const p of pieces) for (const [x, y] of cellsOf(p)) this.occupied.set(`${x},${y}`, p);
    this.links.clear();
    for (const p of pieces) {
      const list: number[] = [];
      for (const c of collarsOf(p)) {
        const o = this.collarPartner(c);
        if (o && o.id !== p.id && !list.includes(o.id)) list.push(o.id);
      }
      this.links.set(p.id, list);
    }
    // Power flows from every finished turbine through joined collars.
    // Frames still being welded neither work nor pass power on.
    this.powered.clear();
    const done = new Set(pieces.filter(isDone).map((p) => p.id));
    const queue = pieces.filter((p) => p.kind === 'turbine' && done.has(p.id)).map((p) => p.id);
    for (const id of queue) this.powered.add(id);
    while (queue.length) {
      const id = queue.shift()!;
      for (const n of this.links.get(id) ?? []) {
        if (!this.powered.has(n) && done.has(n)) {
          this.powered.add(n);
          queue.push(n);
        }
      }
    }
  }

  pieceAt(gx: number, gy: number): Placed | undefined {
    return this.occupied.get(`${gx},${gy}`);
  }

  /** The piece whose collar meets this one face to face, if any. */
  collarPartner(c: Collar): Placed | undefined {
    const [sx, sy] = STEP[c.dir];
    const o = this.pieceAt(c.gx + sx, c.gy + sy);
    if (!o) return undefined;
    const want = OPP[c.dir];
    return collarsOf(o).some((k) => k.gx === c.gx + sx && k.gy === c.gy + sy && k.dir === want) ? o : undefined;
  }

  /** Is this collar joined to another piece? */
  isJoined(c: Collar): boolean {
    return !!this.collarPartner(c);
  }

  /** Open collars that a new piece could attach to (the cell beyond them is free and on the grid). */
  openCollars(): Collar[] {
    const out: Collar[] = [];
    for (const p of this.pieces)
      for (const c of collarsOf(p)) {
        if (this.isJoined(c)) continue;
        const [sx, sy] = STEP[c.dir];
        const nx = c.gx + sx;
        const ny = c.gy + sy;
        if (!cellOpen(nx, ny) || this.pieceAt(nx, ny)) continue;
        out.push(c);
      }
    return out;
  }

  /** Can a piece go here? Returns null if yes, or the reason it cannot. */
  check(p: Omit<Placed, 'id'>): string | null {
    const s = shapeOf(p);
    if (p.gx < 0 || p.gy < 0 || p.gx + s.w > GRID_COLS || p.gy + s.h > GRID_ROWS) return 'Outside the Kestrel site';
    for (const [x, y] of cellsOf(p)) if (!cellOpen(x, y)) return 'Solid rock here (tunnelling comes later)';
    for (const [x, y] of cellsOf(p)) if (this.pieceAt(x, y)) return 'Something is already there';
    if (this.pieces.length === 0) {
      for (let i = 0; i < s.w; i++) if (onSeabed(p.gx + i, p.gy)) return null;
      return 'The first piece goes on the seabed';
    }
    const joins = collarsOf(p).some((c) => {
      const [sx, sy] = STEP[c.dir];
      const o = this.pieceAt(c.gx + sx, c.gy + sy);
      return !!o && collarsOf(o).some((k) => k.gx === c.gx + sx && k.gy === c.gy + sy && k.dir === OPP[c.dir]);
    });
    return joins ? null : 'Line up a collar with an open collar on the base';
  }

  /** Every valid spot for a piece of this kind and rotation. */
  validSpots(kind: PieceKind, rot: number): { gx: number; gy: number }[] {
    const out: { gx: number; gy: number }[] = [];
    for (let gy = 0; gy < GRID_ROWS; gy++)
      for (let gx = 0; gx < GRID_COLS; gx++) if (cellOpen(gx, gy) && !this.check({ kind, gx, gy, rot })) out.push({ gx, gy });
    return out;
  }

  count(kind: PieceKind): number {
    return this.pieces.filter((p) => p.kind === kind).length;
  }

  /** Finished pieces of a kind (frames still being welded do not count). */
  countDone(kind: PieceKind): number {
    return this.pieces.filter((p) => p.kind === kind && isDone(p)).length;
  }

  /** Frames waiting for the build drone, oldest first. */
  frames(): Placed[] {
    return this.pieces.filter((p) => !isDone(p)).sort((a, b) => a.id - b.id);
  }
}

/** Total materials available to build with: what the diver carries plus what is in storage. */
export function available(bag: Record<MaterialId, number>, stored: Record<MaterialId, number>): Record<MaterialId, number> {
  const out = { ...bag };
  for (const k of MATERIAL_ORDER) out[k] += stored[k];
  return out;
}

export function canAfford(kind: PieceKind, bag: Record<MaterialId, number>, stored: Record<MaterialId, number>): boolean {
  const have = available(bag, stored);
  return MATERIAL_ORDER.every((k) => have[k] >= (PIECES[kind].cost[k] ?? 0));
}

/** Take the cost of a piece, from the carried bag first, then from storage. */
export function pay(kind: PieceKind, bag: Record<MaterialId, number>, stored: Record<MaterialId, number>): void {
  for (const k of MATERIAL_ORDER) {
    let need = PIECES[kind].cost[k] ?? 0;
    const fromBag = Math.min(need, bag[k]);
    bag[k] -= fromBag;
    need -= fromBag;
    stored[k] -= need;
  }
}

/** The stencil prefix painted on each kind of piece (see src/world/basegfx.ts). */
const CODE_PREFIX: Record<PieceKind, string> = {
  dome: 'HAB-0',
  corridor: 'C-',
  turbine: 'CT-',
  storage: 'STORE 0',
  tank: 'TANK ',
  filter: 'FP-',
  feeder: 'AF-',
  press: 'PP-',
  dock: 'MP-',
  lab: 'LAB-',
  workshop: 'WS-',
  gtank: 'GT-',
  sorter: 'SP-',
  recomp: 'RC-',
  crane: 'SC-',
  hatch: 'HX-',
  farm: 'KF-',
  revive: 'RP-',
};

/** A piece's stencil code, as painted on it: CT-1, AF-2, PP-1, TANK 3. Pieces are numbered per kind in build order. */
export function pieceCode(layout: BaseLayout, p: Placed): string {
  const n = layout.pieces.filter((q) => q.kind === p.kind && q.id <= p.id).length;
  return `${CODE_PREFIX[p.kind]}${p.kind === 'corridor' ? String(n).padStart(2, '0') : n}`;
}
