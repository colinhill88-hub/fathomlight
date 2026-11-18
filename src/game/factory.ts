import { BaseLayout, CELL, isDone, isStoreKind, isTankKind, PieceKind, PIECES, pieceRect, Placed } from './base';
import { MachineData, MATERIAL_ORDER, MATERIALS, MaterialId, SaveData, TankData } from './state';

/**
 * Factory groundwork (milestone 5): moving materials between base pieces at
 * real rates, and the first production line, the auto feeder. No drawing
 * here, just the rules. Every rate is one constant below, easy to tune.
 *
 * Different kinds of material move by different means:
 *  - Conveyors carry solid items (scrap, copper, quartz, kelp fibre), counted
 *    in items per minute.
 *  - Feed pipes carry fluids (feed mash now; filtered water and the like
 *    later), counted in litres per minute.
 *  - Corridors still join pieces for power and access (src/game/base.ts).
 *
 * A line runs from one piece's output port to another piece's input port.
 * It leaves the top of the first piece, runs across above them and drops
 * into the top of the second, so the player draws it with two taps.
 *
 * The first chain:
 *   storage pod --conveyor (kelp fibre)--> auto feeder --feed pipe (mash)--> creature tanks
 * The auto feeder presses kelp fibre into feed mash. Each creature tank keeps
 * a small trough of mash, and its creatures eat from it whenever they get
 * peckish, so they no longer need feeding by hand.
 *
 * Echo whorls (found out in the world) fit into a tank or a machine. One
 * doubles what it makes, two triple it, and what it uses goes up just as
 * much: a tank's creatures eat and foul the water faster, a feeder presses
 * more fibre. So a whorl only pays off when its inputs keep up.
 */

export type LineKind = 'belt' | 'pipe';

/** One tier of a line: its Kestrel stencil code, capacity and cost. */
export interface TierDef {
  /** Stencil code (CB-1, CB-2, FL-1, FL-2). Tiers use Kestrel codes, never "Mk". */
  code: string;
  /** Capacity, per minute. */
  rate: number;
  /** Materials per cell of length: one of `k` for every `per` cells (rounded up). */
  cost: { k: MaterialId; per: number }[];
}

export interface LineDef {
  kind: LineKind;
  name: string;
  /** What it carries, in a few words. */
  carries: string;
  unit: string;
  /** Tier 1 first. Higher tiers move more and cost hull plating (milestone 5 part 2). */
  tiers: TierDef[];
}

export const LINES: Record<LineKind, LineDef> = {
  belt: {
    kind: 'belt',
    name: 'Conveyor',
    carries: 'solid items',
    unit: 'items/min',
    tiers: [
      {
        code: 'CB-1',
        rate: 4,
        cost: [
          { k: 'scrap', per: 2 },
          { k: 'copper', per: 4 },
        ],
      },
      {
        code: 'CB-2',
        rate: 10,
        cost: [
          { k: 'scrap', per: 2 },
          { k: 'copper', per: 4 },
          { k: 'plate', per: 4 },
        ],
      },
    ],
  },
  pipe: {
    kind: 'pipe',
    name: 'Feed pipe',
    carries: 'feed mash and other fluids',
    unit: 'L/min',
    tiers: [
      {
        code: 'FL-1',
        rate: 10,
        cost: [
          { k: 'copper', per: 2 },
          { k: 'fibre', per: 4 },
        ],
      },
      {
        code: 'FL-2',
        rate: 25,
        cost: [
          { k: 'copper', per: 2 },
          { k: 'fibre', per: 4 },
          { k: 'plate', per: 4 },
        ],
      },
    ],
  },
};

/** A line's tier, 1-based (old saves have none: tier 1). */
export function tierOf(l: { kind: LineKind; tier?: number }): number {
  return Math.max(1, Math.min(LINES[l.kind].tiers.length, l.tier ?? 1));
}
export function tierDef(kind: LineKind, tier: number): TierDef {
  const t = LINES[kind].tiers;
  return t[Math.max(0, Math.min(t.length - 1, tier - 1))];
}
/** What a line can carry per minute. */
export function lineRate(l: { kind: LineKind; tier?: number }): number {
  return tierDef(l.kind, tierOf(l)).rate;
}
/** The stencil code of a line: CB-1, CB-2, FL-1, FL-2. */
export function lineCode(l: { kind: LineKind; tier?: number }): string {
  return tierDef(l.kind, tierOf(l)).code;
}

/** The longest line, in cells. */
export const MAX_LINE_CELLS = 30;

// ---- The auto feeder ----
/** Kelp fibre pressed per minute, before Echo whorls. */
export const FEEDER_RATE = 0.5;
/** Litres of feed mash from one kelp fibre. */
export const MASH_PER_FIBRE = 12;
/** Kelp fibre the hopper holds. */
export const HOPPER_CAP = 4;
/** Litres the feeder's mash tank holds. */
export const FEEDER_MASH_CAP = 24;
/** Litres a creature tank's feed trough holds. */
export const TROUGH_CAP = 12;
/** How much one litre of mash fills a creature's Fed need (1 = full). */
export const MASH_FED = 0.2;
/** Creatures top up from the trough once Fed drops below this. */
export const EAT_BELOW = 0.95;

// ---- The plate press (milestone 5 part 2) ----
/** Hull plating made per minute, before Echo whorls (one stroke every 2 minutes). */
export const PRESS_RATE = 0.5;
/** What one plate takes. */
export const PLATE_RECIPE: Partial<Record<MaterialId, number>> = { scrap: 2, copper: 1 };
/** What the press's hoppers and output rack hold. */
export const PRESS_SCRAP_CAP = 6;
export const PRESS_COPPER_CAP = 3;
export const PRESS_PLATE_CAP = 4;

// ---- Creature tank output (milestone 5 part 2) ----
/** Items a tank's output tray holds. When it is full its creatures pause making. */
export const TRAY_CAP = 4;

export function trayCount(td: TankData | undefined): number {
  return td?.out ? MATERIAL_ORDER.reduce((a, k) => a + (td.out![k] ?? 0), 0) : 0;
}

// ---- Milestone 9: the Kelp farm ----
/** Seconds of growing per kelp fibre (before Echo whorls). */
export const FARM_SECONDS = 150;
/** Kelp fibre its tray holds; a full tray pauses it. */
export const FARM_TRAY = 4;
/** Seconds per plant cutting, and how many of each kind the base keeps ready. */
export const CUTTING_SECONDS = 200;
export const CUTTING_CAP = 3;

// ---- Echo whorls ----
export const WHORLS_PER_PIECE = 2;

/** Output (and input) multiplier from the whorls fitted to a piece: ×1, ×2 or ×3. */
export function whorlMult(save: SaveData, pieceId: number): number {
  return 1 + Math.min(WHORLS_PER_PIECE, save.fitted[String(pieceId)] ?? 0);
}

/** Whorls found but not fitted to anything. */
export function whorlsFree(save: SaveData): number {
  const used = Object.values(save.fitted).reduce((a, b) => a + b, 0);
  return Math.max(0, save.whorls.length - used);
}

export function machineData(save: SaveData, id: number): MachineData {
  const k = String(id);
  if (!save.machines[k]) save.machines[k] = { fibre: 0, mash: 0, press: 0 };
  const m = save.machines[k];
  m.scrap ??= 0;
  m.copper ??= 0;
  m.plate ??= 0;
  return m;
}

/** Where a line leaves or enters a piece: a port on its top. */
export function portPoint(p: Placed, kind: LineKind, dir: 'in' | 'out'): { x: number; y: number } {
  const r = pieceRect(p);
  const cx = r.x + r.w / 2;
  if (isTankKind(p.kind)) return { x: cx + (kind === 'pipe' ? 28 : -28), y: r.y + 12 };
  if (p.kind === 'press') return { x: cx + (dir === 'in' ? -62 : 62), y: r.y + 14 };
  return { x: cx + (kind === 'belt' ? -22 : 22), y: r.y + 10 };
}

/**
 * The path of a line: up out of the first piece, across, and down into the
 * second. `slot` spreads lines from the same piece onto separate lanes.
 */
export function lineRoute(a: Placed, b: Placed, kind: LineKind, slot = 0): { pts: [number, number][]; cells: number } {
  const p = portPoint(a, kind, 'out');
  const q = portPoint(b, kind, 'in');
  const lane = Math.min(p.y, q.y) - (kind === 'belt' ? 30 : 46) - slot * 12;
  const pts: [number, number][] = [
    [p.x, p.y],
    [p.x, lane],
    [q.x, lane],
    [q.x, q.y],
  ];
  const len = Math.abs(lane - p.y) + Math.abs(q.x - p.x) + Math.abs(lane - q.y);
  return { pts, cells: Math.max(1, Math.ceil(len / CELL)) };
}

/** Which lane a line uses: lines leaving the same piece take turns. */
export function lineSlot(save: SaveData, line: { id: number; kind: LineKind; from: number }): number {
  const same = save.lines.filter((l) => l.from === line.from && l.kind === line.kind).map((l) => l.id);
  const i = same.indexOf(line.id);
  return i < 0 ? same.length : i;
}

export function lineCost(kind: LineKind, cells: number, tier = 1): Partial<Record<MaterialId, number>> {
  const out: Partial<Record<MaterialId, number>> = {};
  for (const c of tierDef(kind, tier).cost) out[c.k] = (out[c.k] ?? 0) + Math.ceil(cells / c.per);
  return out;
}

/** What upgrading a line to the next tier costs: the difference between the two. */
export function upgradeCost(kind: LineKind, cells: number, tier: number): Partial<Record<MaterialId, number>> {
  const a = lineCost(kind, cells, tier);
  const b = lineCost(kind, cells, tier + 1);
  const out: Partial<Record<MaterialId, number>> = {};
  for (const k of MATERIAL_ORDER) if ((b[k] ?? 0) > (a[k] ?? 0)) out[k] = (b[k] ?? 0) - (a[k] ?? 0);
  return out;
}

/** Solid materials a piece can send out on a conveyor (null: anything it holds). */
function sends(kind: PieceKind): MaterialId[] | null {
  if (kind === 'storage' || kind === 'sorter' || kind === 'tank' || kind === 'gtank') return null;
  if (kind === 'press') return ['plate'];
  if (kind === 'farm') return ['fibre'];
  return [];
}
/** Solid materials a piece takes in from a conveyor (null: anything). */
function takes(kind: PieceKind): MaterialId[] | null {
  if (kind === 'storage' || kind === 'sorter') return null;
  if (kind === 'feeder') return ['fibre'];
  if (kind === 'press') return ['scrap', 'copper'];
  return [];
}

/** Does a conveyor into this kind of piece accept this material? */
export function accepts(kind: PieceKind, k: MaterialId): boolean {
  const t = takes(kind);
  return t === null || t.includes(k);
}

/** Materials waiting in a tank's tray that none of its conveyors can carry anywhere. */
export function stuckInTray(save: SaveData, layout: BaseLayout, tankId: number): MaterialId[] {
  const out = save.tankData[String(tankId)]?.out;
  if (!out) return [];
  const targets = save.lines.filter((l) => l.kind === 'belt' && l.from === tankId).map((l) => layout.pieces.find((p) => p.id === l.to));
  if (!targets.length) return [];
  return MATERIAL_ORDER.filter((k) => out[k] && !targets.some((t) => t && accepts(t.kind, k)));
}

const PORT_NAME = (kind: LineKind, dir: 'in' | 'out') => (kind === 'belt' ? (dir === 'in' ? 'beltIn' : 'beltOut') : dir === 'in' ? 'pipeIn' : 'pipeOut');

/** Can a line of this kind run from one piece to another? Null if yes, else why not. */
export function linkProblem(save: SaveData, layout: BaseLayout, kind: LineKind, from: Placed, to: Placed): string | null {
  const nameA = PIECES[from.kind].name.toLowerCase();
  const nameB = PIECES[to.kind].name.toLowerCase();
  const line = LINES[kind].name.toLowerCase();
  const outLimit = PIECES[from.kind].ports?.[PORT_NAME(kind, 'out')] ?? 0;
  const inLimit = PIECES[to.kind].ports?.[PORT_NAME(kind, 'in')] ?? 0;
  if (from.id === to.id) return 'Pick another piece';
  if (!outLimit) return `A ${nameA} has nothing to send down a ${line}`;
  if (!inLimit) return `A ${nameB} can't take a ${line} in`;
  if (isStoreKind(from.kind) && isStoreKind(to.kind)) return 'Storage pods already share everything they hold';
  if (kind === 'belt') {
    const s = sends(from.kind);
    const t = takes(to.kind);
    if (s && t && !s.some((k) => t.includes(k)))
      return `A ${nameA} sends ${s.map((k) => MATERIALS[k].name.toLowerCase()).join(', ')}; a ${nameB} has no use for it`;
  }
  if (save.lines.some((l) => l.kind === kind && l.from === from.id && l.to === to.id)) return 'These two are already linked';
  const outs = save.lines.filter((l) => l.kind === kind && l.from === from.id).length;
  const ins = save.lines.filter((l) => l.kind === kind && l.to === to.id).length;
  if (outs >= outLimit) return `That ${nameA} already has ${outs === 1 ? 'a' : outs} ${line}${outs === 1 ? '' : 's'} out`;
  if (ins >= inLimit) return `That ${nameB} already has ${ins === 1 ? 'a' : ins} ${line}${ins === 1 ? '' : 's'} in`;
  const { cells } = lineRoute(from, to, kind, outs);
  if (cells > MAX_LINE_CELLS) return `Too far: ${cells} cells (a line can be up to ${MAX_LINE_CELLS})`;
  void layout;
  return null;
}

/** Live numbers for one line, for the build-mode readouts. Not saved. */
export interface LineFlow {
  /** Part-way towards the next item (belts). */
  acc: number;
  /** Amount moved this tick. */
  moved: number;
  /** Smoothed rate, per minute. */
  rate: number;
  /** 0..1 phase of the items or pulses drawn moving along it. */
  phase: number;
  /** The material last carried (belts), for the readouts and the bundles drawn on it. */
  item: MaterialId | null;
  /** Smoothed share of its capacity it is being asked for (1 = flat out or more). */
  busy: number;
}

/** What a machine is doing right now, for the readouts. */
export type MachineState = 'running' | 'no-power' | 'frame' | 'no-input' | 'full' | 'no-belt' | 'no-out';
/** Kept for older call sites. */
export type FeederState = MachineState;

export class Factory {
  readonly flows = new Map<number, LineFlow>();
  /** What each auto feeder or plate press is doing. */
  readonly feederState = new Map<number, MachineState>();
  readonly pressState = new Map<number, MachineState>();
  /** Smoothed fibre pressed per minute, per feeder. */
  readonly pressRate = new Map<number, number>();
  /** A short press-stroke animation timer per plate press (seconds since the last plate). */
  readonly stroke = new Map<number, number>();

  flow(id: number): LineFlow {
    let f = this.flows.get(id);
    if (!f) {
      f = { acc: 0, moved: 0, rate: 0, phase: Math.random(), item: null, busy: 0 };
      this.flows.set(id, f);
    }
    return f;
  }

  /**
   * Run the base's machines and lines forward by dt seconds of play.
   * room() says how many more items fit in the base's storage.
   */
  tick(save: SaveData, layout: BaseLayout, dt: number, room: (k?: MaterialId) => number = () => 0): void {
    if (dt <= 0) return;
    const byId = new Map(layout.pieces.map((p) => [p.id, p]));
    // Lines and fitted whorls whose pieces are gone go too (removing a piece
    // refunds its lines in build mode; this is a safety net).
    save.lines = save.lines.filter((l) => byId.has(l.from) && byId.has(l.to));
    for (const k of Object.keys(save.fitted)) if (!byId.has(Number(k)) || !save.fitted[k]) delete save.fitted[k];
    for (const k of Object.keys(save.machines)) if (!byId.has(Number(k))) delete save.machines[k];
    for (const l of save.lines) this.flow(l.id).moved = 0;
    const on = (p: Placed) => isDone(p) && layout.powered.has(p.id);
    // Milestone 12: a network short of power runs its machines and lines slower.
    const pw = (p: Placed) => layout.powerRate(p.id);

    // ---- Conveyors: each carries what its source has and its target wants ----
    const has = (p: Placed, k: MaterialId): boolean => {
      if (isStoreKind(p.kind)) return save.stored[k] > 0;
      if (isTankKind(p.kind)) return (save.tankData[String(p.id)]?.out?.[k] ?? 0) > 0;
      if (p.kind === 'press') return k === 'plate' && (machineData(save, p.id).plate ?? 0) > 0;
      if (p.kind === 'farm') return k === 'fibre' && machineData(save, p.id).fibre > 0;
      return false;
    };
    /** How full the target is of k (0..1), or null if it has no room or no use for it. */
    const want = (p: Placed, k: MaterialId): number | null => {
      if (isStoreKind(p.kind)) return room(k) > 0 ? 0 : null;
      if (p.kind === 'feeder') return k === 'fibre' && machineData(save, p.id).fibre < HOPPER_CAP ? machineData(save, p.id).fibre / HOPPER_CAP : null;
      if (p.kind === 'press') {
        const m = machineData(save, p.id);
        if (k === 'scrap') return m.scrap! < PRESS_SCRAP_CAP ? m.scrap! / PRESS_SCRAP_CAP : null;
        if (k === 'copper') return m.copper! < PRESS_COPPER_CAP ? m.copper! / PRESS_COPPER_CAP : null;
      }
      return null;
    };
    const take = (p: Placed, k: MaterialId) => {
      if (isStoreKind(p.kind)) save.stored[k]--;
      else if (isTankKind(p.kind)) {
        const o = save.tankData[String(p.id)]!.out!;
        o[k] = (o[k] ?? 0) - 1;
        if (!o[k]) delete o[k];
      } else if (p.kind === 'press') machineData(save, p.id).plate!--;
      else if (p.kind === 'farm') machineData(save, p.id).fibre--;
    };
    const give = (p: Placed, k: MaterialId) => {
      if (isStoreKind(p.kind)) save.stored[k]++;
      else if (p.kind === 'feeder') machineData(save, p.id).fibre++;
      else if (p.kind === 'press') {
        const m = machineData(save, p.id);
        if (k === 'scrap') m.scrap!++;
        else if (k === 'copper') m.copper!++;
      }
    };
    for (const l of save.lines) {
      if (l.kind !== 'belt') continue;
      const fl = this.flow(l.id);
      const src = byId.get(l.from)!;
      const dst = byId.get(l.to)!;
      let pick: MaterialId | null = null;
      if (on(src) && on(dst)) {
        let best = Infinity;
        for (const k of MATERIAL_ORDER) {
          if (!has(src, k)) continue;
          const w = want(dst, k);
          if (w !== null && w < best) {
            best = w;
            pick = k;
          }
        }
      }
      fl.busy += ((pick ? 1 : 0) - fl.busy) * Math.min(1, dt / 20);
      if (!pick) {
        fl.acc = Math.min(fl.acc, 1);
        continue;
      }
      fl.acc += (lineRate(l) / 60) * dt * Math.min(pw(src), pw(dst));
      while (fl.acc >= 1 && pick) {
        fl.acc -= 1;
        take(src, pick);
        give(dst, pick);
        fl.moved += 1;
        fl.item = pick;
        // Pick again for the next item this tick (rare: only on long ticks).
        const k: MaterialId = pick;
        pick = has(src, k) && want(dst, k) !== null ? k : null;
      }
    }

    // ---- Milestone 9: Kelp farms grow fibre into their tray, or plant cuttings ----
    for (const f of layout.pieces) {
      if (f.kind !== 'farm' || !on(f)) continue;
      const m = machineData(save, f.id);
      const grow = m.grow ?? 'fibre';
      const rate = whorlMult(save, f.id) * dt * pw(f);
      if (grow === 'fibre') {
        if (m.fibre >= FARM_TRAY) continue;
        m.press += rate / FARM_SECONDS;
        if (m.press >= 1) {
          m.press = 0;
          m.fibre++;
        }
      } else {
        if ((save.cuttings[grow] ?? 0) >= CUTTING_CAP) continue;
        m.press += rate / CUTTING_SECONDS;
        if (m.press >= 1) {
          m.press = 0;
          save.cuttings[grow] = (save.cuttings[grow] ?? 0) + 1;
        }
      }
    }

    // ---- Auto feeders: press fibre into mash, pump it down feed pipes ----
    for (const f of layout.pieces) {
      if (f.kind !== 'feeder') continue;
      const m = machineData(save, f.id);
      const mult = whorlMult(save, f.id);
      const belts = save.lines.some((l) => l.kind === 'belt' && l.to === f.id);
      let state: MachineState = 'running';
      let pressed = 0;
      if (!isDone(f)) state = 'frame';
      else if (!on(f)) state = 'no-power';
      else if (m.fibre < 1) state = belts ? 'no-input' : 'no-belt';
      else if (m.mash > FEEDER_MASH_CAP - MASH_PER_FIBRE) state = 'full';
      else {
        m.press += ((FEEDER_RATE * mult) / 60) * dt * pw(f);
        if (m.press >= 1) {
          m.press -= 1;
          m.fibre--;
          m.mash += MASH_PER_FIBRE;
          pressed = 1;
        }
      }
      this.feederState.set(f.id, state);
      const pr = this.pressRate.get(f.id) ?? 0;
      this.pressRate.set(f.id, pr + ((pressed / dt) * 60 - pr) * Math.min(1, dt / 40));
      // Pump mash down the feed pipes, sharing it between them.
      const pipes = save.lines.filter((l) => l.kind === 'pipe' && l.from === f.id);
      for (let i = 0; i < pipes.length; i++) {
        const l = pipes[i];
        const fl = this.flow(l.id);
        const t = byId.get(l.to)!;
        if (!on(f) || !isTankKind(t.kind) || !isDone(t)) {
          fl.busy += (0 - fl.busy) * Math.min(1, dt / 20);
          continue;
        }
        const td = (save.tankData[String(t.id)] ??= { water: 1, plant: null });
        const share = m.mash / (pipes.length - i);
        const cap = (lineRate(l) / 60) * dt * pw(f);
        const room = TROUGH_CAP - (td.mash ?? 0);
        const give = Math.max(0, Math.min(cap, room, share));
        // Busy = the trough wanted at least the pipe's full flow and the feeder had it.
        fl.busy += ((room > cap * 1.01 && share > cap * 1.01 ? 1 : 0) - fl.busy) * Math.min(1, dt / 20);
        if (give <= 0) continue;
        td.mash = (td.mash ?? 0) + give;
        m.mash -= give;
        fl.moved += give;
      }
    }

    // ---- Plate presses: 2 scrap + 1 copper -> 1 hull plating ----
    for (const p of layout.pieces) {
      if (p.kind !== 'press') continue;
      const m = machineData(save, p.id);
      const mult = whorlMult(save, p.id);
      const beltIn = save.lines.some((l) => l.kind === 'belt' && l.to === p.id);
      const beltOut = save.lines.some((l) => l.kind === 'belt' && l.from === p.id);
      const enough = MATERIAL_ORDER.every((k) => ((m as unknown as Record<string, number>)[k] ?? 0) >= (PLATE_RECIPE[k] ?? 0));
      let state: MachineState = 'running';
      if (!isDone(p)) state = 'frame';
      else if (!on(p)) state = 'no-power';
      else if (m.plate! >= PRESS_PLATE_CAP) state = beltOut ? 'full' : 'no-out';
      else if (!enough) state = beltIn ? 'no-input' : 'no-belt';
      else {
        m.press += ((PRESS_RATE * mult) / 60) * dt * pw(p);
        if (m.press >= 1) {
          m.press -= 1;
          m.scrap! -= PLATE_RECIPE.scrap ?? 0;
          m.copper! -= PLATE_RECIPE.copper ?? 0;
          m.plate!++;
          this.stroke.set(p.id, 0);
        }
      }
      this.pressState.set(p.id, state);
      this.stroke.set(p.id, (this.stroke.get(p.id) ?? 99) + dt);
    }

    for (const l of save.lines) {
      const fl = this.flow(l.id);
      fl.rate += ((fl.moved / dt) * 60 - fl.rate) * Math.min(1, dt / 30);
      if (fl.rate < 0.005) fl.rate = 0;
    }
    for (const id of [...this.flows.keys()]) if (!save.lines.some((l) => l.id === id)) this.flows.delete(id);
  }
}

/** Plain-language status of an auto feeder. */
export function feederStatus(state: MachineState | undefined): string {
  switch (state) {
    case 'frame':
      return 'Still a frame: the drone has to finish it';
    case 'no-power':
      return 'No power: join it to a current turbine';
    case 'no-belt':
      return 'Needs kelp fibre: run a conveyor to it from a storage pod or a puffcap tank';
    case 'no-input':
      return 'Waiting for kelp fibre (is there any in storage?)';
    case 'full':
      return 'Mash tank full: the tanks are fed';
    default:
      return 'Pressing kelp fibre into feed mash';
  }
}

/** Plain-language status of a plate press. */
export function pressStatus(state: MachineState | undefined): string {
  switch (state) {
    case 'frame':
      return 'Still a frame: the drone has to finish it';
    case 'no-power':
      return 'No power: join it to a current turbine';
    case 'no-belt':
      return 'Needs scrap and copper: run a conveyor to it from a storage pod';
    case 'no-input':
      return 'Waiting for scrap and copper (2 scrap + 1 copper per plate)';
    case 'no-out':
      return 'Plate rack full: run a conveyor from it to a storage pod';
    case 'full':
      return 'Plate rack full: waiting for room in storage';
    default:
      return 'Pressing hull plating';
  }
}

/** Litres of mash a creature eats per minute (at ×1). */
export function mashPerCreature(hungerRate: number): number {
  return (hungerRate * 60) / MASH_FED;
}
