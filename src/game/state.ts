import type { Traits } from './traits';
/**
 * Everything about the player's progress that needs to survive closing the
 * app, plus automatic saving to the device (localStorage).
 *
 * Saving is automatic: every few seconds while playing, straight after
 * anything important (a scan, a pickup, blacking out), and when the app is
 * sent to the background. Moving a save between devices (a save code) is
 * planned for milestone 11.
 */

export type MaterialId = 'scrap' | 'copper' | 'quartz' | 'fibre' | 'plate' | 'resin' | 'moss' | 'brass' | 'bloom';
/** Materials found on the reef. Hull plating (milestone 5 part 2) is only made by the plate press. */
export type ReefMaterial = Exclude<MaterialId, 'plate'>;

/** kg: how heavy one piece is in the dive bag (milestone 3 follow-up, Colin's idea). */
export const MATERIALS: Record<MaterialId, { name: string; plural: string; blurb: string; kg: number }> = {
  scrap: { name: 'Scrap metal', plural: 'Scrap metal', blurb: 'Rusted plate and fittings from old wreckage. Base frames and hulls.', kg: 2.5 },
  copper: { name: 'Copper nodule', plural: 'Copper nodules', blurb: 'Green-crusted lumps half buried in sand. Wiring and turbines.', kg: 3 },
  quartz: { name: 'Quartz', plural: 'Quartz', blurb: 'Clear crystal that grows on reef rock. Dome glass.', kg: 1.5 },
  fibre: { name: 'Kelp fibre', plural: 'Kelp fibre', blurb: 'Tough golden strands from kelp holdfasts. Seals and filters.', kg: 0.5 },
  plate: {
    name: 'Hull plating',
    plural: 'Hull plating',
    blurb: 'Scrap and copper pressed into riveted plate by a plate press. For the submersible, CB-2 conveyors and FL-2 pipes.',
    kg: 4,
  },
  // Milestone 7: the kelp forest's own materials.
  resin: {
    name: 'Holdfast resin',
    plural: 'Holdfast resin',
    blurb: 'Amber resin that oozes from the root-like holdfasts of the giant kelp. Seals and planters; kelp forest base pieces.',
    kg: 1,
  },
  moss: {
    name: 'Lumen moss',
    plural: 'Lumen moss',
    blurb: 'Soft moss that glows a warm yellow-green on shaded kelp forest rock. Lamps and tank plants; kelp forest base pieces.',
    kg: 0.5,
  },
  // Milestone 8: the wreck shelf's own material.
  brass: {
    name: 'Brass fitting',
    plural: 'Brass fittings',
    blurb: 'Heavy valves, portholes and fittings unbolted from wrecks on the shelf. Green with age, bright underneath. Wreck shelf base pieces and pressure gear.',
    kg: 3,
  },
  // Milestone 9: the rare glowing bloom (the Revival pool uses one per revival).
  bloom: {
    name: 'Glowing bloom',
    plural: 'Glowing blooms',
    blurb: 'A soft flower of light that grows only where no lamp has ever shone. The Revival pool uses one to wake a dormant creature.',
    kg: 0.3,
  },
};
export const MATERIAL_ORDER: MaterialId[] = ['scrap', 'copper', 'quartz', 'fibre', 'plate', 'resin', 'moss', 'brass', 'bloom'];

/** Oxygen, in seconds of breathing, for the starting tank and for each tank upgrade. */
export const BASE_OXYGEN = 75;
export const TANK_BONUS = 20;
export const TOTAL_AIR_TANKS = 5;
/**
 * Collected materials grow back after this much play time. Play time keeps
 * counting through blackouts and is saved, so neither dying nor closing the
 * app makes anything grow back sooner.
 */
export const REGROW_SECONDS = 10 * 60;
/**
 * Scrap grows back faster (Colin, after milestone 7b: waiting for scrap made the
 * fresh-save road to the Lab and Workshop slow).
 */
export const REGROW_BY_KIND: Partial<Record<MaterialId, number>> = { scrap: 6 * 60 };
export function regrowSeconds(kind: string): number {
  return REGROW_BY_KIND[kind as MaterialId] ?? REGROW_SECONDS;
}

/**
 * The dive bag (milestone 3 follow-up). Every material has a weight. Up to
 * the rated load the bag is comfortable; past it the diver is clearly slowed.
 * At the full load nothing more fits until something is unloaded at a
 * storage pod. The penalty grows smoothly and never drowns anyone: in the
 * shallows it only makes a trip slower and thirstier.
 *
 * Later gear raises these limits: a lift bag, a buoyancy vest, the drone
 * carrying loads and the sub's cargo bay (milestone 6). They all plug in
 * through bagLimits().
 */
export const BAG_RATED_KG = 15;
export const BAG_MAX_KG = 24;

export function bagWeight(bag: Record<MaterialId, number>): number {
  return MATERIAL_ORDER.reduce((a, k) => a + bag[k] * MATERIALS[k].kg, 0);
}

/**
 * How much the diver can carry. Milestone 6: aboard the submersible with a
 * cargo bay fitted, the bay takes the load, so both limits rise by a lot
 * (see CARGO_BAY_KG in src/game/sub.ts). On leaving the sub, whatever the
 * diver cannot carry stays in the bay's hold.
 */
export function bagLimits(d: SaveData): { rated: number; max: number } {
  const bay = d.sub && d.sub.aboard && d.sub.modules.includes('cargo') ? CARGO_BAY : null;
  return { rated: BAG_RATED_KG + (bay?.rated ?? 0), max: BAG_MAX_KG + (bay?.max ?? 0) };
}
/** Extra kg the sub's cargo bay adds to the rated and full load while aboard. */
export const CARGO_BAY = { rated: 36, max: 40 };

/** The diver's own limits, without the sub. */
export function diverLimits(): { rated: number; max: number } {
  return { rated: BAG_RATED_KG, max: BAG_MAX_KG };
}

/** 0 = empty, 1 = at the rated load, up to max/rated when full. */
export function bagLoad(d: SaveData): number {
  return bagWeight(d.bag) / bagLimits(d).rated;
}

/** Could one more of this material go in the bag? */
export function bagHasRoom(d: SaveData, kind: MaterialId): boolean {
  return bagWeight(d.bag) + MATERIALS[kind].kg <= bagLimits(d).max + 1e-6;
}

/**
 * The build drone (milestone 3 follow-up). It starts stranded in the survey
 * sled wreck and must be repaired before anything can be built.
 */
export const DRONE_REPAIR_COST: Partial<Record<MaterialId, number>> = { scrap: 2, copper: 1, fibre: 1 };
/** How fast the drone welds (1 = normal). Upgrades later: a faster torch, or a second drone. */
export function droneWeldRate(d: SaveData): number {
  // Milestone 7 part 2: the DR-2 welder upgrade welds twice as fast.
  if (d.gear.includes('welder')) return 2;
  return 1;
}

export interface DroppedBag {
  x: number;
  y: number;
  items: Partial<Record<MaterialId, number>>;
}

/** Creatures you can keep (milestone 4). Rules are in src/game/creatures.ts. */
export type SpeciesId = 'glowfin' | 'puffcap' | 'ray' | 'crab' | 'shrimp';
export type PlantId = 'coral' | 'kelp' | 'grass' | 'bladder' | 'lumen';

/** One creature living in a creature tank. Every need is 0..1 (1 is best). */
export interface CreatureData {
  id: number;
  species: SpeciesId;
  /** The creature tank (base piece id) it lives in. */
  tank: number;
  stage: 'egg' | 'young' | 'grown';
  /** Egg: 0..1 towards hatching. Young: 0..1 towards grown. */
  growth: number;
  fed: number;
  comfort: number;
  /** 0 = healthy. Rises while a need stays very low; at 1 it goes dormant. */
  sickness: number;
  /** 0..1 towards the next material it makes, once grown and happy. */
  make: number;
  /** Milestone 9: colour, glow pattern and radiance (src/game/traits.ts). Missing on old saves: fixed by its id. */
  traits?: Traits;
}

/** What is in the specimen jar the diver carries (one creature or one egg clutch). */
export interface JarData {
  species: SpeciesId;
  stage: 'egg' | 'young' | 'grown';
  /** Set when it was taken out of a tank: it keeps its needs and growth when put back. */
  keep?: CreatureData;
  /** Milestone 9: a creature from the Hatchery or the Revival pool carries its traits. */
  traits?: Traits;
}

/** Per creature tank: water quality (0..1) and the plant growing in it. */
export interface TankData {
  water: number;
  plant: PlantId | null;
  /** Milestone 7 part 2: a Grand tank's second planter. */
  plant2?: PlantId | null;
  /** Litres of feed mash waiting in the tank's feed trough (milestone 5). */
  mash?: number;
  /**
   * Milestone 5 part 2: what its creatures made, waiting in the tank's output
   * tray for a conveyor (or the diver) to take it away.
   */
  out?: Partial<Record<MaterialId, number>>;
  /** Milestone 9: 0..1 towards the next egg, per species with a happy grown pair here. */
  breed?: Partial<Record<SpeciesId, number>>;
}

/** A conveyor or feed pipe between two base pieces (milestone 5; rules in src/game/factory.ts). */
export interface SavedLine {
  id: number;
  kind: 'belt' | 'pipe';
  from: number;
  to: number;
  /** Line tier: 1 = CB-1 / FL-1, 2 = CB-2 / FL-2 (milestone 5 part 2). Missing means 1. */
  tier?: number;
}

/**
 * What a machine holds (milestone 5): an auto feeder's hopper, mash tank and
 * press progress; a plate press's scrap and copper hoppers, finished plates
 * and stroke progress (part 2).
 */
export interface MachineData {
  fibre: number;
  mash: number;
  press: number;
  scrap?: number;
  copper?: number;
  plate?: number;
  /** Milestone 9, the Kelp farm: what it grows ('fibre' or a plant's id). Its tray uses `fibre`, its progress `press`. */
  grow?: 'fibre' | PlantId;
}

/** Modules that fit the submersible's slots (milestone 6; rules in src/game/sub.ts). */
export type SubModule = 'cargo' | 'lights' | 'grabber';

/** The submersible KS-1 (milestone 6). There is one; it is built at a Moon pool dock. */
export interface SubData {
  /** A frame while the build drone welds it at its dock, then built. */
  stage: 'frame' | 'built';
  /** 0..1 while still a frame. */
  progress?: number;
  /** The Moon pool dock (piece id) it was built at, or last docked in. */
  dock: number;
  x: number;
  y: number;
  /** 1 facing right, -1 facing left. */
  face: number;
  /** 0..1. Hard knocks against rock dent it; at 0 the crew tows it home. */
  hull: number;
  /** Seconds of air in the sub's reserve. */
  air: number;
  /** Clamped in its dock's berth. */
  docked: boolean;
  /** The diver is piloting it. */
  aboard: boolean;
  /** Fitted modules, one per slot. */
  modules: SubModule[];
  /** Cargo left in the cargo bay when the diver climbed out. */
  hold: Partial<Record<MaterialId, number>>;
  /** Floodlights / running lamp on. */
  lights: boolean;
  /** Milestone 8 part 2: a piece of heavy salvage hanging from the grabber. */
  salvage?: string | null;
}

/** Milestone 7: gear built in the Workshop (rules in src/game/gear.ts). */
export type GearId = 'light' | 'cutter' | 'tow' | 'welder' | 'relay' | 'sonar' | 'psuit';
/** Blueprints the Lab decodes. Each one lets the Workshop build something, or unlocks a base piece. */
export type BlueprintId = 'light' | 'cutter' | 'tow' | 'welder' | 'relay' | 'gtank' | 'sorter' | 'sonar' | 'psuit' | 'recomp' | 'crane' | 'revive';
/** Data finds the diver brings back to the Lab (they weigh nothing). */
export type FindId = 'recorder' | 'relaylog' | 'weldchip' | 'towcoil' | 'cache' | 'sonardata' | 'suitplans' | 'poolplans';
/** What a Lab or Workshop is busy with. */
export interface StationJob {
  /** 'research:light' or 'build:light'. */
  id: string;
  /** 0..1. */
  progress: number;
}

/** A base piece as saved (see src/game/base.ts). */
export interface SavedPiece {
  id: number;
  kind: 'dome' | 'corridor' | 'turbine' | 'storage' | 'tank' | 'filter' | 'feeder' | 'press' | 'dock' | 'lab' | 'workshop' | 'gtank' | 'sorter' | 'recomp' | 'crane' | 'hatch' | 'farm' | 'revive' | 'shaft' | 'junction' | 'bracket';
  gx: number;
  gy: number;
  rot: number;
  /** 0..1 while the build drone is still welding it. Missing means finished. */
  progress?: number;
}

export interface SaveData {
  v: 1;
  /**
   * Layout of the build site: 1 = the 11 × 3 shelf of milestones 3-4,
   * 2 = the 58 × 14 basin (milestone 5). Older bases are shifted on load.
   */
  site: number;
  x: number;
  y: number;
  oxygen: number;
  lampOn: boolean;
  /** Carried materials. A blackout drops these; stored ones are safe. */
  bag: Record<MaterialId, number>;
  /** Ids of scanner log entries that are complete. */
  scans: string[];
  /** Ids of air tank upgrades found. */
  tanks: string[];
  /** Pickup id -> play time (seconds) when it was collected, so it can grow back. */
  taken: Record<string, number>;
  dropped: DroppedBag | null;
  /** The base at the Kestrel site (milestone 3). */
  pieces: SavedPiece[];
  nextPieceId: number;
  /** Materials in the base's storage pods. Safe from blackouts. */
  stored: Record<MaterialId, number>;
  /** The build drone: still stuck in the sled wreck, or repaired and working. */
  drone: 'stranded' | 'active';
  /** Creatures in the base's tanks (milestone 4). */
  creatures: CreatureData[];
  nextCreatureId: number;
  /** Creature tank piece id -> its water and plant. */
  tankData: Record<string, TankData>;
  /** The specimen jar on the diver's belt. A blackout lets its creature swim home. */
  jar: JarData | null;
  /**
   * The kit found out in the world (Colin, before milestone 11: the diver's kit
   * builds up as things are found). The specimen jar, and the hip thruster:
   * 0 none, 1 TH-1, 2 the TH-2 upgrade (a bigger boost).
   */
  kit: { jar: boolean; thruster: 0 | 1 | 2 };
  /** Wild creature or egg spot id -> play time when it was collected (they come back). */
  caught: Record<string, number>;
  /** Creatures that died of neglect, kept in storage as dormant remains (revived later). */
  dormant: Partial<Record<SpeciesId, number>>;
  /**
   * Milestone 9: eggs laid by pairs in the tanks, incubating in the base's
   * Hatchery, and the young that hatched from them waiting to be placed.
   */
  nursery: CreatureData[];
  /** Milestone 9: plant cuttings grown in a Kelp farm, used instead of materials when planting. */
  cuttings: Partial<Record<PlantId, number>>;
  /** Milestone 9: the wreck shelf's rusted locker, picked open by a grown tinker crab. */
  lockerOpen: boolean;
  /** Conveyors and feed pipes between pieces (milestone 5). */
  lines: SavedLine[];
  nextLineId: number;
  /** Base piece id -> what the machine holds (milestone 5). */
  machines: Record<string, MachineData>;
  /** Ids of Echo whorls found out in the world (milestone 5). */
  whorls: string[];
  /** Base piece id -> how many Echo whorls are fitted to it. */
  fitted: Record<string, number>;
  /** The submersible (milestone 6), once one is started at a Moon pool dock. */
  sub: SubData | null;
  /**
   * Milestone 7: gear the diver owns (built in the Workshop), blueprints the
   * Lab has decoded, data finds carried back to the Lab (weightless), and
   * the job each Lab or Workshop is running (piece id -> job).
   */
  gear: GearId[];
  blueprints: BlueprintId[];
  finds: FindId[];
  jobs: Record<string, StationJob>;
  /** The old survey boom gate in the notch of the east cliff, opened from the kelp forest side. */
  boomOpen: boolean;
  /** Milestone 7 part 2: lumen moss set on the black chamber's brackets, the kelp wall cut, and air relays. */
  brackets: boolean[];
  kelpCut: boolean;
  /** Air relay AR-1 kits built and not yet planted. */
  relayKits: number;
  /** Planted air relays: where each one's anchor sits on the seabed. */
  relays: { x: number; y: number }[];
  /** Milestone 8: suit integrity, 0..1 (bites crack it; at 0 the diver blacks out). */
  suit: number;
  /** Milestone 8: sealed wreck hatches cut open with the cutter torch. */
  hatches: string[];
  /** Milestone 8: the flow vane past the race is raised (the sub can cross over the top). */
  vane: boolean;
  /** Milestone 8 part 2: the Corvina (deck hatch cut, stern door released, breakers thrown). */
  corvina: { hatch: boolean; door: boolean; breakers: boolean[]; taken?: string[] };
  /** The hidden passage in the shelf edge (a sonar pulse reveals it) and its locker. */
  hiddenOpen: boolean;
  hiddenLooted: boolean;
  /** Heavy salvage lifted (play time when, so it can come back), and pieces waiting at salvage cranes. */
  salvageTaken: Record<string, number>;
  craneQueue: number;
  craneProgress: number;
  /** Scrap still owed from the test gift after milestone 6 (removed in milestone 7: kept only so old saves load). */
  gift?: number;
  /** One-time tips already shown. */
  tips: string[];
  playSeconds: number;
  savedAt: number;
}

const KEY = 'fathomlight.save.v1';
/** ?bench in the URL runs the graphics benchmark (src/dev/bench.ts). It must never read or write the real save. */
const BENCH_RUN = typeof location !== 'undefined' && new URLSearchParams(location.search).has('bench');
/** Where the milestone 3-4 site sits in the milestone 5 grid (OLD_SITE in src/game/base.ts). */
const SITE_SHIFT = { gx: 47, gy: 11 };

export function freshSave(spawnX: number, spawnY: number): SaveData {
  return {
    v: 1,
    site: 2,
    x: spawnX,
    y: spawnY,
    oxygen: BASE_OXYGEN,
    lampOn: true,
    bag: { scrap: 0, copper: 0, quartz: 0, fibre: 0, plate: 0, resin: 0, moss: 0, brass: 0, bloom: 0 },
    scans: [],
    tanks: [],
    taken: {},
    dropped: null,
    pieces: [],
    nextPieceId: 1,
    stored: { scrap: 0, copper: 0, quartz: 0, fibre: 0, plate: 0, resin: 0, moss: 0, brass: 0, bloom: 0 },
    drone: 'stranded',
    creatures: [],
    nextCreatureId: 1,
    tankData: {},
    jar: null,
    kit: { jar: false, thruster: 0 },
    caught: {},
    dormant: {},
    nursery: [],
    cuttings: {},
    lockerOpen: false,
    lines: [],
    nextLineId: 1,
    machines: {},
    whorls: [],
    fitted: {},
    sub: null,
    gear: [],
    blueprints: [],
    finds: [],
    jobs: {},
    boomOpen: false,
    brackets: [false, false, false, false],
    kelpCut: false,
    relayKits: 0,
    relays: [],
    suit: 1,
    hatches: [],
    vane: false,
    corvina: { hatch: false, door: false, breakers: [false, false] },
    hiddenOpen: false,
    hiddenLooted: false,
    salvageTaken: {},
    craneQueue: 0,
    craneProgress: 0,
    tips: [],
    playSeconds: 0,
    savedAt: 0,
  };
}

export function loadSave(spawnX: number, spawnY: number): { data: SaveData; loaded: boolean } {
  const fresh = freshSave(spawnX, spawnY);
  if (BENCH_RUN) return { data: fresh, loaded: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { data: fresh, loaded: false };
    const d = JSON.parse(raw) as Partial<SaveData>;
    if (d.v !== 1) return { data: fresh, loaded: false };
    // Fill in anything missing, so older or damaged saves still load.
    const data: SaveData = {
      ...fresh,
      ...d,
      bag: { ...fresh.bag, ...(d.bag ?? {}) },
      stored: { ...fresh.stored, ...(d.stored ?? {}) },
      pieces: Array.isArray(d.pieces) ? d.pieces : [],
      tips: Array.isArray(d.tips) ? d.tips : [],
      scans: Array.isArray(d.scans) ? d.scans : [],
      tanks: Array.isArray(d.tanks) ? d.tanks : [],
      taken: d.taken && typeof d.taken === 'object' ? d.taken : {},
      drone: d.drone === 'active' ? 'active' : 'stranded',
      creatures: Array.isArray(d.creatures) ? d.creatures : [],
      tankData: d.tankData && typeof d.tankData === 'object' ? d.tankData : {},
      caught: d.caught && typeof d.caught === 'object' ? d.caught : {},
      dormant: d.dormant && typeof d.dormant === 'object' ? d.dormant : {},
      nursery: Array.isArray(d.nursery) ? d.nursery : [],
      cuttings: d.cuttings && typeof d.cuttings === 'object' ? d.cuttings : {},
      lockerOpen: d.lockerOpen === true,
      jar: d.jar && typeof d.jar === 'object' ? d.jar : null,
      kit: {
        jar: d.kit?.jar === true,
        thruster: d.kit?.thruster === 2 ? 2 : d.kit?.thruster === 1 ? 1 : 0,
      },
      lines: Array.isArray(d.lines) ? d.lines : [],
      machines: d.machines && typeof d.machines === 'object' ? d.machines : {},
      whorls: Array.isArray(d.whorls) ? d.whorls : [],
      fitted: d.fitted && typeof d.fitted === 'object' ? d.fitted : {},
      sub: d.sub && typeof d.sub === 'object' ? { ...d.sub, modules: Array.isArray(d.sub.modules) ? d.sub.modules : [], hold: d.sub.hold ?? {} } : null,
      site: typeof d.site === 'number' ? d.site : 1,
      gear: Array.isArray(d.gear) ? d.gear : [],
      blueprints: Array.isArray(d.blueprints) ? d.blueprints : [],
      finds: Array.isArray(d.finds) ? d.finds : [],
      jobs: d.jobs && typeof d.jobs === 'object' ? d.jobs : {},
      boomOpen: d.boomOpen === true,
      brackets: [0, 1, 2, 3].map((i) => Array.isArray(d.brackets) && d.brackets[i] === true),
      kelpCut: d.kelpCut === true,
      relayKits: typeof d.relayKits === 'number' ? d.relayKits : 0,
      suit: typeof d.suit === 'number' ? Math.max(0.05, Math.min(1, d.suit)) : 1,
      hatches: Array.isArray(d.hatches) ? d.hatches : [],
      vane: d.vane === true,
      corvina: {
        hatch: d.corvina?.hatch === true,
        door: d.corvina?.door === true,
        breakers: [0, 1].map((i) => Array.isArray(d.corvina?.breakers) && d.corvina.breakers[i] === true),
        taken: Array.isArray(d.corvina?.taken) ? d.corvina.taken : [],
      },
      hiddenOpen: d.hiddenOpen === true,
      hiddenLooted: d.hiddenLooted === true,
      salvageTaken: d.salvageTaken && typeof d.salvageTaken === 'object' ? d.salvageTaken : {},
      craneQueue: typeof d.craneQueue === 'number' ? d.craneQueue : 0,
      craneProgress: typeof d.craneProgress === 'number' ? d.craneProgress : 0,
      relays: Array.isArray(d.relays) ? d.relays.filter((r: { x?: unknown; y?: unknown }) => typeof r?.x === 'number' && typeof r?.y === 'number') : [],
    } as SaveData;
    // Milestone 7: the scavenger crab makes scrap now, so the test gift ends.
    delete data.gift;
    // Milestone 5: the build grid grew around the old site. Shift older bases
    // so every piece keeps its place in the world.
    if (data.site < 2) {
      for (const p of data.pieces) {
        p.gx += SITE_SHIFT.gx;
        p.gy += SITE_SHIFT.gy;
      }
      data.site = 2;
    }
    // Saves from before the kit was found piece by piece: whoever got going already keeps
    // the jar (once they have kept or caught a creature) and the first thruster.
    if (!d.kit) {
      const started = data.drone === 'active' || data.pieces.length > 0 || data.tanks.length > 0;
      data.kit.jar = !!data.jar || data.creatures.length > 0 || Object.keys(data.caught).length > 0 || data.nursery.length > 0;
      data.kit.thruster = started ? 1 : 0;
    }
    // Older saves stored real clock times (milliseconds). Restart those timers from now.
    for (const k of Object.keys(data.taken)) if (data.taken[k] > 1e9) data.taken[k] = data.playSeconds;
    if (!isFinite(data.x) || !isFinite(data.y)) {
      data.x = spawnX;
      data.y = spawnY;
    }
    return { data, loaded: true };
  } catch {
    return { data: fresh, loaded: false };
  }
}

export function writeSave(d: SaveData): boolean {
  d.savedAt = Date.now();
  if (BENCH_RUN) return true;
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  if (BENCH_RUN) return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: nothing to clear */
  }
}

export function maxOxygen(d: SaveData): number {
  return BASE_OXYGEN + d.tanks.length * TANK_BONUS;
}
