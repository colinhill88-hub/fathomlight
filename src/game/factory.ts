import { BaseLayout, CELL, isDone, PIECES, pieceRect, Placed } from './base';
import { MachineData, MaterialId, SaveData } from './state';

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

export interface LineDef {
  kind: LineKind;
  name: string;
  /** What it carries, in a few words. */
  carries: string;
  /** Capacity of the first tier (CB-1 conveyor, FL-1 pipe), per minute. Tiers use Kestrel stencil codes, not "Mk". */
  rate: number;
  unit: string;
  /** Materials per cell of length: one of `a` for every `per` cells (rounded up). */
  cost: { k: MaterialId; per: number }[];
}

export const LINES: Record<LineKind, LineDef> = {
  belt: {
    kind: 'belt',
    name: 'Conveyor',
    carries: 'solid items',
    rate: 6,
    unit: 'items/min',
    cost: [
      { k: 'scrap', per: 2 },
      { k: 'copper', per: 4 },
    ],
  },
  pipe: {
    kind: 'pipe',
    name: 'Feed pipe',
    carries: 'feed mash and other fluids',
    rate: 10,
    unit: 'L/min',
    cost: [
      { k: 'copper', per: 2 },
      { k: 'fibre', per: 4 },
    ],
  },
};

/** The longest line, in cells. */
export const MAX_LINE_CELLS = 30;
/** Most lines one port can have (per kind and direction). */
const PORT_LIMITS = { beltOut: 4, beltIn: 2, pipeOut: 4, pipeIn: 1 };

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
  return save.machines[k];
}

/** Where a line leaves or enters a piece: a port on its top, belts left of centre, pipes right. */
export function portPoint(p: Placed, kind: LineKind): { x: number; y: number } {
  const r = pieceRect(p);
  const cx = r.x + r.w / 2;
  if (p.kind === 'tank') return { x: cx + 28, y: r.y + 12 };
  return { x: cx + (kind === 'belt' ? -22 : 22), y: r.y + 10 };
}

/**
 * The path of a line: up out of the first piece, across, and down into the
 * second. `slot` spreads lines from the same piece onto separate lanes.
 */
export function lineRoute(a: Placed, b: Placed, kind: LineKind, slot = 0): { pts: [number, number][]; cells: number } {
  const p = portPoint(a, kind);
  const q = portPoint(b, kind);
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

export function lineCost(kind: LineKind, cells: number): Partial<Record<MaterialId, number>> {
  const out: Partial<Record<MaterialId, number>> = {};
  for (const c of LINES[kind].cost) out[c.k] = (out[c.k] ?? 0) + Math.ceil(cells / c.per);
  return out;
}

/** Can a line of this kind run from one piece to another? Null if yes, else why not. */
export function linkProblem(save: SaveData, layout: BaseLayout, kind: LineKind, from: Placed, to: Placed): string | null {
  const out = PIECES[from.kind].ports?.[kind === 'belt' ? 'beltOut' : 'pipeOut'];
  const inn = PIECES[to.kind].ports?.[kind === 'belt' ? 'beltIn' : 'pipeIn'];
  if (from.id === to.id) return 'Pick another piece';
  if (!out) return `A ${PIECES[from.kind].name.toLowerCase()} has nothing to send down a ${LINES[kind].name.toLowerCase()}`;
  if (!inn) return `A ${PIECES[to.kind].name.toLowerCase()} can't take a ${LINES[kind].name.toLowerCase()}`;
  if (save.lines.some((l) => l.kind === kind && l.from === from.id && l.to === to.id)) return 'These two are already linked';
  const outs = save.lines.filter((l) => l.kind === kind && l.from === from.id).length;
  const ins = save.lines.filter((l) => l.kind === kind && l.to === to.id).length;
  if (outs >= PORT_LIMITS[kind === 'belt' ? 'beltOut' : 'pipeOut']) return `That ${PIECES[from.kind].name.toLowerCase()} already has ${outs} ${LINES[kind].name.toLowerCase()}s out`;
  if (ins >= PORT_LIMITS[kind === 'belt' ? 'beltIn' : 'pipeIn'])
    return `That ${PIECES[to.kind].name.toLowerCase()} already has ${ins === 1 ? 'a' : ins} ${LINES[kind].name.toLowerCase()}${ins === 1 ? '' : 's'} in`;
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
}

/** What a feeder is doing right now, for the readouts. */
export type FeederState = 'running' | 'no-power' | 'frame' | 'no-fibre' | 'full' | 'no-belt';

export class Factory {
  readonly flows = new Map<number, LineFlow>();
  readonly feederState = new Map<number, FeederState>();
  /** Smoothed fibre pressed per minute, per feeder. */
  readonly pressRate = new Map<number, number>();

  flow(id: number): LineFlow {
    let f = this.flows.get(id);
    if (!f) {
      f = { acc: 0, moved: 0, rate: 0, phase: Math.random() };
      this.flows.set(id, f);
    }
    return f;
  }

  /** Run the base's machines and lines forward by dt seconds of play. */
  tick(save: SaveData, layout: BaseLayout, dt: number): void {
    if (dt <= 0) return;
    const byId = new Map(layout.pieces.map((p) => [p.id, p]));
    // Lines and fitted whorls whose pieces are gone go too (removing a piece
    // refunds its lines in build mode; this is a safety net).
    save.lines = save.lines.filter((l) => byId.has(l.from) && byId.has(l.to));
    for (const k of Object.keys(save.fitted)) if (!byId.has(Number(k)) || !save.fitted[k]) delete save.fitted[k];
    for (const k of Object.keys(save.machines)) if (!byId.has(Number(k))) delete save.machines[k];
    for (const l of save.lines) this.flow(l.id).moved = 0;

    for (const f of layout.pieces) {
      if (f.kind !== 'feeder') continue;
      const m = machineData(save, f.id);
      const on = isDone(f) && layout.powered.has(f.id);
      const mult = whorlMult(save, f.id);
      const belts = save.lines.filter((l) => l.kind === 'belt' && l.to === f.id);
      // Kelp fibre arrives from storage on the conveyor(s).
      for (const l of belts) {
        const fl = this.flow(l.id);
        const src = byId.get(l.from)!;
        const ok = on && src.kind === 'storage' && isDone(src) && layout.powered.has(src.id) && save.stored.fibre > 0 && m.fibre < HOPPER_CAP;
        if (!ok) {
          fl.acc = Math.min(fl.acc, 1);
          continue;
        }
        fl.acc += (LINES.belt.rate / 60) * dt;
        if (fl.acc >= 1) {
          fl.acc -= 1;
          save.stored.fibre--;
          m.fibre++;
          fl.moved += 1;
        }
      }
      // Press fibre into mash.
      let state: FeederState = 'running';
      let pressed = 0;
      if (!isDone(f)) state = 'frame';
      else if (!on) state = 'no-power';
      else if (m.fibre < 1) state = belts.length ? 'no-fibre' : 'no-belt';
      else if (m.mash > FEEDER_MASH_CAP - MASH_PER_FIBRE) state = 'full';
      else {
        m.press += ((FEEDER_RATE * mult) / 60) * dt;
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
        if (!on || t.kind !== 'tank' || !isDone(t)) continue;
        const td = (save.tankData[String(t.id)] ??= { water: 1, plant: null });
        const share = m.mash / (pipes.length - i);
        const give = Math.max(0, Math.min((LINES.pipe.rate / 60) * dt, TROUGH_CAP - (td.mash ?? 0), share));
        if (give <= 0) continue;
        td.mash = (td.mash ?? 0) + give;
        m.mash -= give;
        fl.moved += give;
      }
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
export function feederStatus(state: FeederState | undefined): string {
  switch (state) {
    case 'frame':
      return 'Still a frame: the drone has to finish it';
    case 'no-power':
      return 'No power: join it to a current turbine';
    case 'no-belt':
      return 'Needs kelp fibre: run a conveyor to it from a storage pod';
    case 'no-fibre':
      return 'Waiting for kelp fibre (is there any in storage?)';
    case 'full':
      return 'Mash tank full: the tanks are fed';
    default:
      return 'Pressing kelp fibre into feed mash';
  }
}

/** Litres of mash a creature eats per minute (at ×1). */
export function mashPerCreature(hungerRate: number): number {
  return (hungerRate * 60) / MASH_FED;
}
