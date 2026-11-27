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

/** The world rectangle that holds every open cell (the build camera frames this, not the rock around it). */
export const SITE = (() => {
  let c0 = GRID_COLS;
  let r0 = GRID_ROWS;
  let r1 = 0;
  for (let gy = 0; gy < GRID_ROWS; gy++)
    for (let gx = 0; gx < GRID_COLS; gx++)
      if (OPEN[gy * GRID_COLS + gx]) {
        c0 = Math.min(c0, gx);
        r0 = Math.min(r0, gy);
        r1 = Math.max(r1, gy);
      }
  return { x0: GRID_X0 + c0 * CELL, x1: GRID_X1, y0: GRID_BASE - (r1 + 1) * CELL, y1: GRID_BASE - r0 * CELL };
})();

/** How many cells of the site are open water. */
export const OPEN_CELLS = OPEN.filter(Boolean).length;

export type PieceKind = 'dome' | 'corridor' | 'turbine' | 'storage' | 'tank' | 'filter' | 'feeder' | 'press' | 'dock' | 'lab' | 'workshop' | 'gtank' | 'sorter' | 'recomp' | 'crane' | 'hatch' | 'farm' | 'revive' | 'shaft' | 'junction' | 'bracket' | 'signal' | 'lantern' | 'thermal' | 'bedroom' | 'works';
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
  /** A cliff bracket: it only goes beside solid rock, on the side its rotation says (rotation 0: rock to the west). */
  needsRock?: boolean;
}

export const PIECES: Record<PieceKind, PieceDef> = {
  // Beyond Earth (Nov 27, 2026): the Petrel's parts shop, unlocked at first contact (src/game/petrel.ts).
  works: {
    kind: 'works',
    name: 'Petrel works',
    job: 'Turns materials in base storage into parts for the Petrel, the ship on the launch platform above the base, one stage at a time. Tap Petrel works beside it.',
    cost: { plate: 6, brass: 4, copper: 4, quartz: 2 },
    buildTime: 45,
    blueprint: 'works',
    shapes: [{ w: 2, h: 1, collars: [{ cx: 0, cy: 0, dir: 'L' }, { cx: 1, cy: 0, dir: 'R' }, { cx: 0, cy: 0, dir: 'U' }] }],
  },
  dome: {
    kind: 'dome',
    name: 'Dome habitat',
    job: 'Swim inside to breathe, refill oxygen and save. You wake up here after a blackout.',
    cost: { scrap: 3, quartz: 4, fibre: 2 },
    buildTime: 40,
    shapes: [{ w: 2, h: 2, collars: [{ cx: 0, cy: 0, dir: 'L' }, { cx: 1, cy: 0, dir: 'R' }] }],
  },
  bedroom: {
    kind: 'bedroom',
    name: 'Crew quarters',
    job: 'Spacious 3×2 personal quarters with your bunk, panoramic lounge, and a built-in display shelf for collectibles, lamps, and enemy figurines from EX-1.',
    cost: { plate: 4, scrap: 3, copper: 2, fibre: 3 },
    buildTime: 34,
    shapes: [
      {
        w: 3,
        h: 2,
        collars: [
          { cx: 0, cy: 0, dir: 'L' },
          { cx: 2, cy: 0, dir: 'R' },
          { cx: 0, cy: 1, dir: 'L' },
          { cx: 2, cy: 1, dir: 'R' },
        ],
      },
    ],
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
    job: 'Turns the reef current into 12 W of power for the pieces joined to it. The Kestrel current only drives three turbines; more stand idle.',
    cost: { scrap: 2, copper: 4, fibre: 1 },
    buildTime: 28,
    // Doorways on both levels: the upper pair (after the terrain pass) joins pieces to the top deck.
    shapes: [
      {
        w: 1,
        h: 2,
        collars: [
          { cx: 0, cy: 0, dir: 'L' },
          { cx: 0, cy: 0, dir: 'R' },
          { cx: 0, cy: 1, dir: 'L' },
          { cx: 0, cy: 1, dir: 'R' },
        ],
      },
    ],
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
    cost: { scrap: 2, quartz: 3, fibre: 1, copper: 2 },
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
    // The hall is the top row (collars there); the bottom row splits into the KS-1 Sub Berth (left) and Diver Entry Well (right).
    shapes: [{ w: 4, h: 2, collars: [{ cx: 0, cy: 1, dir: 'L' }, { cx: 3, cy: 1, dir: 'R' }] }],
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
    name: 'Sanctuary tank',
    job: 'One grand 3×2 living aquarium for all your creatures — no creature cap, full-screen feeding, drag-and-drop aquascaping, and in-tank breeding (only one per base).',
    cost: { scrap: 3, quartz: 4, fibre: 2, copper: 2 },
    buildTime: 30,
    ports: { pipeIn: 1, beltOut: 2 },
    whorls: true,
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
    name: 'Creature room',
    job: 'The heart of your creature care. Happy grown pairs in the base\'s tanks lay eggs here, where cradles keep them warm (4 at a time); the young swim to a tank that suits them by themselves. Its console shows every tank in the base: who lives where, how content they are, and what they need, and lets you move, feed and clean from one place.',
    cost: { resin: 4, quartz: 3, moss: 2, copper: 2 },
    blueprint: 'hatch',
    ports: { pipeIn: 1 },
    buildTime: 36,
    shapes: [{ w: 2, h: 1, collars: [{ cx: 0, cy: 0, dir: 'L' }, { cx: 1, cy: 0, dir: 'R' }, { cx: 0, cy: 0, dir: 'U' }] }],
  },
  farm: {
    kind: 'farm',
    name: 'Kelp farm',
    job: 'Grows kelp fibre under lamps, into its own tray, so a conveyor can carry it to an auto feeder or storage. Once bladder kelp is scanned it can grow resin instead (the only way to make resin at the base), or cuttings of a tank plant: planting with a cutting costs nothing.',
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
  // Milestone 10: the trench's piece (DESIGN.md: the Signal array maps zones and decodes alien signals).
  signal: {
    kind: 'signal',
    name: 'Signal array',
    job: "A listening dish and pattern decoder. It reads the Choir's light patterns off spools found in the trench, one at a time, once your grown creatures show enough different glow patterns (the Choir's words).",
    cost: { ore: 6, quartz: 6, brass: 4, plate: 4, copper: 4 },
    buildTime: 55,
    blueprint: 'signal',
    shapes: [{ w: 2, h: 2, collars: [{ cx: 0, cy: 0, dir: 'L' }, { cx: 1, cy: 0, dir: 'R' }] }],
  },
  // After milestone 9 (Colin's terrain pass): structure for building up and down the stepped trench.
  shaft: {
    kind: 'shaft',
    name: 'Riser shaft',
    job: 'A walkable shaft three cells tall, with collars at the top and bottom, and on both sides of its top and bottom cells: one piece instead of three upright corridors, and a little cheaper.',
    cost: { scrap: 5, fibre: 2 },
    buildTime: 24,
    shapes: [
      {
        w: 1,
        h: 3,
        collars: [
          { cx: 0, cy: 0, dir: 'D' },
          { cx: 0, cy: 2, dir: 'U' },
          { cx: 0, cy: 0, dir: 'L' },
          { cx: 0, cy: 0, dir: 'R' },
          { cx: 0, cy: 2, dir: 'L' },
          { cx: 0, cy: 2, dir: 'R' },
        ],
      },
    ],
  },
  junction: {
    kind: 'junction',
    name: 'Cross junction',
    job: 'A small hub with a collar on every side, for branching a base up, down and across.',
    cost: { scrap: 3, fibre: 1 },
    buildTime: 12,
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
  // Milestone 12: power as a real limit. The middle tier, from the trench's vent ore.
  thermal: {
    kind: 'thermal',
    // After milestone 12 (Colin: the power ceiling came too long before the trench): copied from the Corvina, built from shelf materials.
    name: 'Core generator',
    job: "A copy of the Corvina's sealed power core, glowing behind its porthole. It makes 40 W, more than three current turbines, and needs no current, so it works anywhere on the site.",
    cost: { brass: 4, copper: 5, plate: 3, quartz: 2 },
    buildTime: 45,
    blueprint: 'thermal',
    shapes: [
      {
        w: 1,
        h: 2,
        collars: [
          { cx: 0, cy: 0, dir: 'L' },
          { cx: 0, cy: 0, dir: 'R' },
          { cx: 0, cy: 1, dir: 'L' },
          { cx: 0, cy: 1, dir: 'R' },
        ],
      },
    ],
  },
  // Milestone 11: the Choir's gift after contact. A power source like a turbine, but it needs no current.
  lantern: {
    kind: 'lantern',
    name: 'Choir lantern',
    job: "A seed of the Choir's light in a ring of pale stone. It makes 100 W, needs no current and works anywhere on the site, and lights the base in the Choir's colours.",
    cost: { quartz: 4, ore: 2, bloom: 1 },
    buildTime: 30,
    blueprint: 'lantern',
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
  bracket: {
    kind: 'bracket',
    name: 'Cliff bracket',
    job: 'Bolts to solid rock beside it and carries collars up, down and out from the cliff face. Rotate it to mount on the other side.',
    cost: { scrap: 3, copper: 2 },
    buildTime: 16,
    needsRock: true,
    shapes: [
      {
        w: 1,
        h: 1,
        collars: [
          { cx: 0, cy: 0, dir: 'R' },
          { cx: 0, cy: 0, dir: 'U' },
          { cx: 0, cy: 0, dir: 'D' },
        ],
      },
      {
        w: 1,
        h: 1,
        collars: [
          { cx: 0, cy: 0, dir: 'L' },
          { cx: 0, cy: 0, dir: 'U' },
          { cx: 0, cy: 0, dir: 'D' },
        ],
      },
    ],
  },
};
export const PIECE_ORDER: PieceKind[] = ['dome', 'bedroom', 'corridor', 'turbine', 'storage', 'gtank', 'filter', 'feeder', 'press', 'dock', 'lab', 'workshop', 'sorter', 'recomp', 'crane', 'farm', 'revive', 'signal', 'thermal', 'lantern', 'works', 'shaft', 'junction', 'bracket'];
/** Each sorting pod's bay for every material. */
export const SORT_BAY = 12;

/** Where a docked sub sits in a Moon pool dock (milestone 6): its hull in the berth, its dome up in the pool. */
export function berthOf(p: { kind: PieceKind; gx: number; gy: number; rot: number }): { x: number; y: number } {
  const r = pieceRect(p);
  return { x: r.x + r.w * 0.36, y: r.y + r.h - 74 };
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

function shapeIndex(p: { kind: PieceKind; rot: number }): number {
  const n = PIECES[p.kind].shapes.length;
  return ((p.rot % n) + n) % n;
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


/**
 * Milestone 12: power as a real limit (Colin's choices: three tiers, and a
 * shortage slows machines down instead of switching anything off).
 *
 * Every source makes watts and every piece draws watts. Pieces joined into
 * one network share its sources. If a network draws more than it makes, its
 * machines (production lines, Labs, Workshops, the Signal array, cranes,
 * Hatcheries) run at supply ÷ demand speed. Air, doors, lights and the dock's
 * clamps never fail.
 */
export const POWER_MAKE: Partial<Record<PieceKind, number>> = { turbine: 12, thermal: 40, lantern: 100 };
/** The Kestrel current only drives this many turbines in all; the rest stand idle. */
export const TURBINE_LIMIT = 3;
export const POWER_DRAW: Record<PieceKind, number> = {
  dome: 1, bedroom: 1, corridor: 0, turbine: 0, storage: 1, tank: 1, filter: 1, feeder: 1, press: 3, dock: 3, lab: 2, workshop: 3,
  gtank: 2, sorter: 2, recomp: 2, crane: 3, hatch: 2, farm: 1, revive: 2, shaft: 0, junction: 0, bracket: 0, signal: 4, lantern: 0, thermal: 0, works: 6,
};
export interface PowerNet {
  make: number;
  draw: number;
  /** supply ÷ demand, capped at 1. */
  rate: number;
  ids: number[];
}

/** The base as a whole: which cells are taken, which collars are joined, which pieces have power. */
export class BaseLayout {
  pieces: Placed[] = [];
  private occupied = new Map<string, Placed>();
  /** Piece id -> ids of the pieces it is joined to. */
  links = new Map<number, number[]>();
  powered = new Set<number>();
  /** Milestone 12: the power network each powered piece is on. */
  nets: PowerNet[] = [];
  private netOf = new Map<number, PowerNet>();

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
    const queue = pieces.filter((p) => POWER_MAKE[p.kind] && done.has(p.id)).map((p) => p.id);
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
    // Split the powered pieces into networks and add up each one's watts.
    this.nets = [];
    this.netOf.clear();
    const byId = new Map(pieces.map((p) => [p.id, p]));
    // Turbines past the limit (in build order) stand idle.
    const liveTurbines = new Set(pieces.filter((p) => p.kind === 'turbine' && done.has(p.id)).sort((a, b) => a.id - b.id).slice(0, TURBINE_LIMIT).map((p) => p.id));
    for (const start of [...this.powered].sort((a, b) => a - b)) {
      if (this.netOf.has(start)) continue;
      const net: PowerNet = { make: 0, draw: 0, rate: 1, ids: [] };
      const q = [start];
      this.netOf.set(start, net);
      while (q.length) {
        const id = q.pop()!;
        net.ids.push(id);
        const p = byId.get(id)!;
        net.make += p.kind === 'turbine' ? (liveTurbines.has(id) ? 12 : 0) : POWER_MAKE[p.kind] ?? 0;
        net.draw += POWER_DRAW[p.kind];
        for (const n of this.links.get(id) ?? []) {
          if (!this.powered.has(n) || this.netOf.has(n)) continue;
          this.netOf.set(n, net);
          q.push(n);
        }
      }
      net.rate = net.draw <= net.make ? 1 : net.make / net.draw;
      this.nets.push(net);
    }
  }

  /** How fast this piece's machines run: 1 with enough power, less when its network is short, 0 with none. */
  powerRate(id: number): number {
    return this.netOf.get(id)?.rate ?? 0;
  }

  /** The network this piece is on, if it has power. */
  netFor(id: number): PowerNet | undefined {
    return this.netOf.get(id);
  }

  /** The whole base's watts (all networks together). */
  powerTotals(): { make: number; draw: number } {
    let make = 0;
    let draw = 0;
    for (const n of this.nets) {
      make += n.make;
      draw += n.draw;
    }
    return { make, draw };
  }

  /** Is this turbine one the Kestrel current can't drive (past the limit)? */
  idleTurbine(p: Placed): boolean {
    if (p.kind !== 'turbine' || !isDone(p)) return false;
    const live = this.pieces.filter((q) => q.kind === 'turbine' && isDone(q)).sort((a, b) => a.id - b.id).slice(0, TURBINE_LIMIT);
    return !live.some((q) => q.id === p.id);
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
    if (isTankKind(p.kind) && this.pieces.some((q) => isTankKind(q.kind))) return 'Only one Sanctuary Tank per base';
    if (PIECES[p.kind].needsRock && cellOpen(p.gx + (shapeIndex(p) === 0 ? -1 : 1), p.gy)) return 'A cliff bracket bolts to solid rock beside it';
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
  bedroom: 'BR-',
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
  shaft: 'SH-',
  junction: 'JX-',
  bracket: 'BR-',
  signal: 'SA-',
  lantern: 'CL-',
  thermal: 'CG-',
  works: 'PW-',
};

/** A piece's stencil code, as painted on it: CT-1, AF-2, PP-1, TANK 3. Pieces are numbered per kind in build order. */
export function pieceCode(layout: BaseLayout, p: Placed): string {
  const n = layout.pieces.filter((q) => q.kind === p.kind && q.id <= p.id).length;
  return `${CODE_PREFIX[p.kind]}${p.kind === 'corridor' ? String(n).padStart(2, '0') : n}`;
}
