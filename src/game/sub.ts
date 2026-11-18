import { BaseLayout, berthOf, isDone, Placed } from './base';
import { BlueprintId, MATERIAL_ORDER, MaterialId, MATERIALS, SaveData, SubData, SubModule } from './state';

/**
 * The submersible KS-1 (milestone 6): the rules, with no drawing. The actor
 * that drives and draws it is src/actors/sub.ts; the dock panel is
 * src/ui/dock.ts.
 *
 * The sub is built at a powered Moon pool dock, welded by the build drone
 * like a base piece. It carries its own air, so it is a mobile safe point:
 * aboard, the diver breathes from the sub's reserve, and after a blackout
 * the crew can bring the diver back to the sub instead of the dome. Hard
 * knocks against rock dent the hull; the dock repairs it with hull plating.
 * Modules go in its three slots at the dock.
 */

/** What the sub costs to build (Colin chose the medium cost: about 20 plating with the dock). */
export const SUB_COST: Partial<Record<MaterialId, number>> = { plate: 12, quartz: 4, copper: 3, fibre: 2 };
/** Seconds of welding by the build drone. */
export const SUB_BUILD_TIME = 60;
/** Seconds of air in a full reserve (10 minutes). */
export const SUB_AIR = 600;
/** Module slots on the hull. */
/** After milestone 12: four slots (there are nine modules now, so the fit is a choice). */
export const SUB_SLOTS = 4;
/** Hull plating per quarter of the hull repaired. */
export const REPAIR_PLATE_PER_QUARTER = 1;
/**
 * Dents: an impact into rock faster than this (world units per second,
 * along the hit) dents the hull; each unit faster takes DENT_PER_SPEED.
 * Cruising straight into a wall (about 330) costs ~15%; a full thruster
 * ram (about 600) ~40%. Brushing along rock is free.
 */
export const DENT_SPEED = 170;
export const DENT_PER_SPEED = 1 / 1100;

export interface ModuleDef {
  id: SubModule;
  name: string;
  /** Stencil code painted on the module. */
  code: string;
  job: string;
  cost: Partial<Record<MaterialId, number>>;
  /** After milestone 12: a blueprint the Lab must decode before the dock offers it. */
  blueprint?: BlueprintId;
}

export const MODULES: Record<SubModule, ModuleDef> = {
  cargo: {
    id: 'cargo',
    name: 'Cargo bay',
    code: 'CB-S',
    job: 'A belly hold. Aboard, you can carry 40 kg more, with no slowdown until 51 kg. What you cannot carry when you climb out stays in the hold; the dock unloads it into storage.',
    cost: { plate: 3, scrap: 2, fibre: 1 },
  },
  lights: {
    id: 'lights',
    name: 'Floodlights',
    code: 'FL-S',
    job: 'Twin bow floodlights, far brighter and wider than the running lamp. Lamp button switches them.',
    cost: { plate: 2, quartz: 2, copper: 1 },
  },
  grabber: {
    id: 'grabber',
    name: 'Grabber arm',
    code: 'GA-S',
    job: 'A folding claw under the bow. Hold Collect next to materials or young creatures to take them without climbing out.',
    cost: { plate: 3, copper: 2, scrap: 1 },
  },
  // ---- After milestone 12 ----
  booster: {
    id: 'booster',
    name: 'Afterburner',
    code: 'AB-S',
    job: 'A second burner under the stern. Boost is half again as fast and burns three times as long.',
    cost: { plate: 3, brass: 3, copper: 2 },
    blueprint: 'booster',
  },
  ballast: {
    id: 'ballast',
    name: 'Ballast pod',
    code: 'BP-S',
    job: 'Trim tanks under the keel. Currents and upwellings move KS-1 a fifth as much.',
    cost: { plate: 3, scrap: 3, brass: 1 },
    blueprint: 'ballast',
  },
  tractor: {
    id: 'tractor',
    name: 'Tractor beam',
    code: 'TB-S',
    job: 'A lime beam from the chin. Drive slowly past loose materials and it draws them into KS-1 by itself, one at a time.',
    cost: { quartz: 3, moss: 2, plate: 2, copper: 2 },
    blueprint: 'tractor',
  },
  sdome: {
    id: 'sdome',
    name: 'Sonar dome',
    code: 'SD-S',
    job: 'A dome on the back that pings every few seconds. Materials within about 25 m show as marks, through rock, while you drive.',
    cost: { brass: 3, quartz: 2, plate: 2 },
    blueprint: 'sdome',
  },
  habitat: {
    id: 'habitat',
    name: 'Habitat pod',
    code: 'HP-S',
    job: "A pressurised pod with air scrubbers. Aboard, your own air refills, and the sub's reserve falls a quarter as fast.",
    cost: { plate: 4, quartz: 3, fibre: 3, resin: 2 },
    blueprint: 'habitat',
  },
  drill: {
    id: 'drill',
    name: 'Drill nose',
    code: 'DN-S',
    job: 'A cutting nose that bores through soft rock. Hold Collect with the bow at a soft seam.',
    cost: { brass: 4, plate: 4, ore: 2 },
    blueprint: 'drill',
  },
};
export const MODULE_ORDER: SubModule[] = ['cargo', 'lights', 'grabber', 'booster', 'ballast', 'tractor', 'sdome', 'habitat', 'drill'];
/** Is this module's blueprint decoded (or does it need none)? */
export function moduleKnown(save: SaveData, m: SubModule): boolean {
  const b = MODULES[m].blueprint;
  return !b || save.blueprints.includes(b);
}

/** Carried first, then stored, as for base pieces. */
export function haveFor(save: SaveData, cost: Partial<Record<MaterialId, number>>): boolean {
  return MATERIAL_ORDER.every((k) => save.bag[k] + save.stored[k] >= (cost[k] ?? 0));
}

export function payFor(save: SaveData, cost: Partial<Record<MaterialId, number>>): boolean {
  if (!haveFor(save, cost)) return false;
  for (const k of MATERIAL_ORDER) {
    let need = cost[k] ?? 0;
    const fromBag = Math.min(need, save.bag[k]);
    save.bag[k] -= fromBag;
    need -= fromBag;
    save.stored[k] -= need;
  }
  return true;
}

/** What is short, as text: "3 hull plating, 1 quartz". */
export function missingText(save: SaveData, cost: Partial<Record<MaterialId, number>>): string {
  return MATERIAL_ORDER.filter((k) => save.bag[k] + save.stored[k] < (cost[k] ?? 0))
    .map((k) => `${(cost[k] ?? 0) - save.bag[k] - save.stored[k]} ${MATERIALS[k].name.toLowerCase()}`)
    .join(', ');
}

/** Start the sub as a frame in a dock's berth. */
export function startSub(save: SaveData, dock: Placed): SubData {
  const b = berthOf(dock);
  save.sub = {
    stage: 'frame',
    progress: 0,
    dock: dock.id,
    x: b.x,
    y: b.y,
    face: 1,
    hull: 1,
    air: SUB_AIR,
    docked: true,
    aboard: false,
    modules: [],
    hold: {},
    lights: true,
  };
  return save.sub;
}

/** The dock piece the sub belongs to, if it still exists. */
export function subDock(save: SaveData, layout: BaseLayout): Placed | null {
  const s = save.sub;
  if (!s) return null;
  return layout.pieces.find((p) => p.id === s.dock && p.kind === 'dock') ?? null;
}

/** Finished Moon pool docks. */
export function docks(layout: BaseLayout): Placed[] {
  return layout.pieces.filter((p) => p.kind === 'dock' && isDone(p));
}

/** Plating to repair the hull fully. */
export function repairCost(hull: number): number {
  return Math.ceil((1 - hull) * 4 - 1e-6) * REPAIR_PLATE_PER_QUARTER;
}

export function holdCount(s: SubData): number {
  return MATERIAL_ORDER.reduce((a, k) => a + (s.hold[k] ?? 0), 0);
}

export function holdKg(s: SubData): number {
  return MATERIAL_ORDER.reduce((a, k) => a + (s.hold[k] ?? 0) * MATERIALS[k].kg, 0);
}

/** "9:41" */
export function airClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
