/**
 * Everything about the player's progress that needs to survive closing the
 * app, plus automatic saving to the device (localStorage).
 *
 * Saving is automatic: every few seconds while playing, straight after
 * anything important (a scan, a pickup, blacking out), and when the app is
 * sent to the background. Moving a save between devices (a save code) is
 * planned for milestone 11.
 */

export type MaterialId = 'scrap' | 'copper' | 'quartz' | 'fibre';

/** kg: how heavy one piece is in the dive bag (milestone 3 follow-up, Colin's idea). */
export const MATERIALS: Record<MaterialId, { name: string; plural: string; blurb: string; kg: number }> = {
  scrap: { name: 'Scrap metal', plural: 'Scrap metal', blurb: 'Rusted plate and fittings from old wreckage. Base frames and hulls.', kg: 2.5 },
  copper: { name: 'Copper nodule', plural: 'Copper nodules', blurb: 'Green-crusted lumps half buried in sand. Wiring and turbines.', kg: 3 },
  quartz: { name: 'Quartz', plural: 'Quartz', blurb: 'Clear crystal that grows on reef rock. Dome glass.', kg: 1.5 },
  fibre: { name: 'Kelp fibre', plural: 'Kelp fibre', blurb: 'Tough golden strands from kelp holdfasts. Seals and filters.', kg: 0.5 },
};
export const MATERIAL_ORDER: MaterialId[] = ['scrap', 'copper', 'quartz', 'fibre'];

/** Oxygen, in seconds of breathing, for the starting tank and for each tank upgrade. */
export const BASE_OXYGEN = 75;
export const TANK_BONUS = 20;
export const TOTAL_AIR_TANKS = 2;
/**
 * Collected materials grow back after this much play time. Play time keeps
 * counting through blackouts and is saved, so neither dying nor closing the
 * app makes anything grow back sooner.
 */
export const REGROW_SECONDS = 10 * 60;

/**
 * The dive bag (milestone 3 follow-up). Every material has a weight. Up to
 * the rated load the bag is comfortable; past it the diver is clearly slowed.
 * At the full load nothing more fits until something is unloaded at a
 * storage pod. The penalty grows smoothly and never drowns anyone: in the
 * shallows it only makes a trip slower and thirstier.
 *
 * Later gear raises these limits: a lift bag, a buoyancy vest, the drone
 * carrying loads and the sub's cargo bay (milestone 5). They all plug in
 * through bagLimits().
 */
export const BAG_RATED_KG = 15;
export const BAG_MAX_KG = 24;

export function bagWeight(bag: Record<MaterialId, number>): number {
  return MATERIAL_ORDER.reduce((a, k) => a + bag[k] * MATERIALS[k].kg, 0);
}

export function bagLimits(_d: SaveData): { rated: number; max: number } {
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
export function droneWeldRate(_d: SaveData): number {
  return 1;
}

export interface DroppedBag {
  x: number;
  y: number;
  items: Partial<Record<MaterialId, number>>;
}

/** Creatures you can keep (milestone 4). Rules are in src/game/creatures.ts. */
export type SpeciesId = 'glowfin' | 'puffcap' | 'ray';
export type PlantId = 'coral' | 'kelp' | 'grass';

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
}

/** What is in the specimen jar the diver carries (one creature or one egg clutch). */
export interface JarData {
  species: SpeciesId;
  stage: 'egg' | 'young' | 'grown';
  /** Set when it was taken out of a tank: it keeps its needs and growth when put back. */
  keep?: CreatureData;
}

/** Per creature tank: water quality (0..1) and the plant growing in it. */
export interface TankData {
  water: number;
  plant: PlantId | null;
  /** Litres of feed mash waiting in the tank's feed trough (milestone 5). */
  mash?: number;
}

/** A conveyor or feed pipe between two base pieces (milestone 5; rules in src/game/factory.ts). */
export interface SavedLine {
  id: number;
  kind: 'belt' | 'pipe';
  from: number;
  to: number;
}

/** What a machine holds (milestone 5): an auto feeder's hopper, mash tank and press progress. */
export interface MachineData {
  fibre: number;
  mash: number;
  press: number;
}

/** A base piece as saved (see src/game/base.ts). */
export interface SavedPiece {
  id: number;
  kind: 'dome' | 'corridor' | 'turbine' | 'storage' | 'tank' | 'filter' | 'feeder';
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
  /** Wild creature or egg spot id -> play time when it was collected (they come back). */
  caught: Record<string, number>;
  /** Creatures that died of neglect, kept in storage as dormant remains (revived later). */
  dormant: Partial<Record<SpeciesId, number>>;
  /** Conveyors and feed pipes between pieces (milestone 5). */
  lines: SavedLine[];
  nextLineId: number;
  /** Base piece id -> what the machine holds (milestone 5). */
  machines: Record<string, MachineData>;
  /** Ids of Echo whorls found out in the world (milestone 5). */
  whorls: string[];
  /** Base piece id -> how many Echo whorls are fitted to it. */
  fitted: Record<string, number>;
  /** One-time tips already shown. */
  tips: string[];
  playSeconds: number;
  savedAt: number;
}

const KEY = 'fathomlight.save.v1';
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
    bag: { scrap: 0, copper: 0, quartz: 0, fibre: 0 },
    scans: [],
    tanks: [],
    taken: {},
    dropped: null,
    pieces: [],
    nextPieceId: 1,
    stored: { scrap: 0, copper: 0, quartz: 0, fibre: 0 },
    drone: 'stranded',
    creatures: [],
    nextCreatureId: 1,
    tankData: {},
    jar: null,
    caught: {},
    dormant: {},
    lines: [],
    nextLineId: 1,
    machines: {},
    whorls: [],
    fitted: {},
    tips: [],
    playSeconds: 0,
    savedAt: 0,
  };
}

export function loadSave(spawnX: number, spawnY: number): { data: SaveData; loaded: boolean } {
  const fresh = freshSave(spawnX, spawnY);
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
      jar: d.jar && typeof d.jar === 'object' ? d.jar : null,
      lines: Array.isArray(d.lines) ? d.lines : [],
      machines: d.machines && typeof d.machines === 'object' ? d.machines : {},
      whorls: Array.isArray(d.whorls) ? d.whorls : [],
      fitted: d.fitted && typeof d.fitted === 'object' ? d.fitted : {},
      site: typeof d.site === 'number' ? d.site : 1,
    } as SaveData;
    // Milestone 5: the build grid grew around the old site. Shift older bases
    // so every piece keeps its place in the world.
    if (data.site < 2) {
      for (const p of data.pieces) {
        p.gx += SITE_SHIFT.gx;
        p.gy += SITE_SHIFT.gy;
      }
      data.site = 2;
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
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: nothing to clear */
  }
}

export function maxOxygen(d: SaveData): number {
  return BASE_OXYGEN + d.tanks.length * TANK_BONUS;
}
