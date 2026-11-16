import { BaseLayout, isDone, Placed } from './base';
import type { BlueprintId, FindId, GearId, MaterialId, SaveData, StationJob } from './state';

/**
 * Milestone 7: the first gear gate. No drawing here, just the rules.
 *
 *  - The Lab reads data finds (like the survey sled's recorder) and scans,
 *    and decodes them into blueprints. Each research job runs for a while
 *    of play time, and only while the Lab has power.
 *  - The Workshop builds gear from a blueprint the Lab has decoded, paying
 *    its materials up front. It also only works with power.
 *  - Gear opens places the diver could already see, as in Zelda: the dive
 *    light opens the dark cave in the east cliff.
 *
 * Every number is a constant here, easy to tune after Colin plays.
 */

export interface ResearchDef {
  id: BlueprintId;
  name: string;
  /** What the Lab says while it works. */
  text: string;
  /** Data finds it uses up. */
  finds: FindId[];
  /** Scanner log entries it needs. */
  scans: string[];
  seconds: number;
}

export const RESEARCH: Record<BlueprintId, ResearchDef> = {
  light: {
    id: 'light',
    name: 'Dive light blueprint',
    text: 'Reads the SLED 2 recorder: the earlier expedition was testing a sealed, high-output dive light for the caves.',
    finds: ['recorder'],
    scans: ['sled'],
    seconds: 75,
  },
  // Milestone 7 part 2 (Colin's choices: costs as proposed, research 60–120 s).
  gtank: {
    id: 'gtank',
    name: 'Grand tank GT-1 blueprint',
    text: 'From your scans of the tinker crab, the lantern shrimp and the giant kelp: a big 3 × 2 tank for eight creatures, with a planter for two kinds of plant. Unlocks a build card.',
    finds: [],
    scans: ['crab', 'shrimp', 'gkelp'],
    seconds: 90,
  },
  sorter: {
    id: 'sorter',
    name: 'Sorting pod SP-1 blueprint',
    text: 'From your scans of giant kelp (its holdfast resin) and bladder kelp: resin-sealed storage with a separate bay for every material, so one kind can never crowd out the rest. Unlocks a build card.',
    finds: [],
    scans: ['gkelp', 'bladder'],
    seconds: 60,
  },
  relay: {
    id: 'relay',
    name: 'Air relay AR-1 blueprint',
    text: 'Reads the KS RELAY 2 log from the kelp caves: a surface float that pumps fresh air down a hose to a mooring on the seabed.',
    finds: ['relaylog'],
    scans: [],
    seconds: 80,
  },
  welder: {
    id: 'welder',
    name: 'DR-2 welder blueprint',
    text: 'Reads the KD WELD control chip from the kelp caves: a hotter, steadier torch head for the build drone.',
    finds: ['weldchip'],
    scans: [],
    seconds: 70,
  },
  tow: {
    id: 'tow',
    name: 'Grapple line blueprint',
    text: 'Reads the rope store\'s spool tag and notes: a wrist launcher that fires a hooked line at an anchor point and reels you in, faster than any current.',
    finds: ['towcoil'],
    scans: [],
    seconds: 100,
  },
  cutter: {
    id: 'cutter',
    name: 'Cutter torch blueprint',
    text: 'Reads the survey cache\'s data cartridge: a cutting torch that burns through kelp walls and, later, sealed wreck hatches.',
    finds: ['cache'],
    scans: [],
    seconds: 120,
  },
  // Milestone 8 part 2: the wreck shelf.
  recomp: {
    id: 'recomp',
    name: 'Recompression room RC-1 blueprint',
    text: 'From your scans of the wreck shelf and the wreck lurker: a brass pressure chamber that mends a cracked suit fast. Unlocks a build card.',
    finds: [],
    scans: ['wshelf', 'lurker'],
    seconds: 90,
  },
  crane: {
    id: 'crane',
    name: 'Salvage crane SC-1 blueprint',
    text: 'From your scans of the sealed wrecks and the Corvina: a crane that breaks heavy salvage the sub brings home into scrap, brass and plating. Unlocks a build card.',
    finds: [],
    scans: ['wreck', 'corvina'],
    seconds: 80,
  },
  sonar: {
    id: 'sonar',
    name: 'Sonar pulse blueprint',
    text: "Reads the Corvina's sonar test logs: a pulse that maps hollows behind rock and silt, and drives hunters back into their dens.",
    finds: ['sonardata'],
    scans: [],
    seconds: 100,
  },
  psuit: {
    id: 'psuit',
    name: 'Pressure suit PS-1 blueprint',
    text: "The Corvina's drawings for a deep-water suit, brass-ringed and pressure-sealed: safe far deeper than the Kestrel suit. For the trench.",
    finds: ['suitplans'],
    scans: [],
    seconds: 140,
  },
};
export const RESEARCH_ORDER: BlueprintId[] = ['light', 'gtank', 'sorter', 'relay', 'welder', 'tow', 'cutter', 'recomp', 'crane', 'sonar', 'psuit'];
/** Blueprints that unlock a base piece (build card) instead of Workshop gear. */
export const PIECE_BLUEPRINTS: Partial<Record<BlueprintId, string>> = { gtank: 'gtank', sorter: 'sorter', recomp: 'recomp', crane: 'crane' };

export interface GearDef {
  id: GearId;
  name: string;
  code: string;
  job: string;
  blueprint: BlueprintId;
  cost: Partial<Record<MaterialId, number>>;
  seconds: number;
}

export const GEAR: Record<GearId, GearDef> = {
  light: {
    id: 'light',
    name: 'Dive light',
    code: 'DL-1',
    job: 'A sealed, wide-beam lamp that replaces the shoulder lamp. Bright enough for the dark cave in the east cliff.',
    blueprint: 'light',
    cost: { plate: 2, quartz: 2, copper: 1 },
    seconds: 45,
  },
  cutter: {
    id: 'cutter',
    name: 'Cutter torch',
    code: 'TC-1',
    job: 'Burns through thick kelp walls (hold Collect at one). Later it opens sealed wreck hatches.',
    blueprint: 'cutter',
    cost: { plate: 4, copper: 3, quartz: 2, resin: 2 },
    seconds: 60,
  },
  tow: {
    id: 'tow',
    name: 'Grapple line',
    code: 'GL-1',
    job: 'Fires a hooked line at an anchor ring and reels you in, faster than any current. When a ring is marked, tap Collect to fire.',
    blueprint: 'tow',
    cost: { plate: 3, fibre: 4, resin: 2 },
    seconds: 50,
  },
  welder: {
    id: 'welder',
    name: 'DR-2 welder',
    code: 'DR-2',
    job: 'Fitted to the build drone KD-1: it welds about twice as fast.',
    blueprint: 'welder',
    cost: { plate: 3, copper: 2, moss: 2 },
    seconds: 50,
  },
  relay: {
    id: 'relay',
    name: 'Air relay kit',
    code: 'AR-1',
    job: 'Plant it on open seabed (hold Collect): a float pumps air down to it. Swim up to it to breathe, and you wake up at the nearest one after a blackout. Build as many as you like.',
    blueprint: 'relay',
    cost: { plate: 3, resin: 4, moss: 3, copper: 2 },
    seconds: 45,
  },
  sonar: {
    id: 'sonar',
    name: 'Sonar pulse',
    code: 'SN-1',
    job: 'Tap Scan to send a pulse (every 6 s): it reveals hollows hidden behind silt and rock, and sends lurkers nearby back into their dens for a while.',
    blueprint: 'sonar',
    cost: { brass: 3, copper: 2, quartz: 2, plate: 1 },
    seconds: 55,
  },
  psuit: {
    id: 'psuit',
    name: 'Pressure suit',
    code: 'PS-1',
    job: 'A brass-ringed deep suit, safe far below the Kestrel suit. Nothing on the reef needs it yet: the trench will (milestone 10).',
    blueprint: 'psuit',
    cost: { brass: 6, plate: 4, resin: 2 },
    seconds: 80,
  },
};
export const GEAR_ORDER: GearId[] = ['light', 'cutter', 'tow', 'welder', 'relay', 'sonar', 'psuit'];
/** Gear that is a kit you can build again and again (it isn't kept in save.gear). */
export const KIT_GEAR: GearId[] = ['relay'];

export const FINDS: Record<FindId, { name: string; text: string }> = {
  recorder: { name: 'SLED 2 recorder', text: 'A scuffed data cartridge from the survey sled. The Lab can read it.' },
  relaylog: { name: 'KS RELAY 2 log', text: 'The memory card from a toppled air relay buoy in the kelp caves.' },
  weldchip: { name: 'KD WELD control chip', text: 'A drone welder controller from a broken crate in the caves.' },
  towcoil: { name: 'Rope store spool tag', text: 'The tag and waterproof notes from a grapple line spool in the caves\' old rope store.' },
  cache: { name: 'Survey cache cartridge', text: 'The data cartridge from the earlier expedition\'s cache, deep in the kelp caves.' },
  sonardata: { name: 'Corvina sonar logs', text: "Test logs from the Corvina's lab: a pulse sonar her crew were building." },
  suitplans: { name: 'Pressure suit drawings', text: "A waterproof roll of drawings from the Corvina's lab: a deep-water suit." },
};

/** The dive light (DL-1) against the shoulder lamp: reach, brightness and beam width. */
export const LAMP = { radius: 560, intensity: 1.5, coneCos: 0.86 };
export const DIVE_LIGHT = { radius: 980, intensity: 2.1, coneCos: 0.78 };

export function hasGear(save: SaveData, g: GearId): boolean {
  return save.gear.includes(g);
}

/** What still stops a research job from starting, or null. */
export function researchBlocker(save: SaveData, r: ResearchDef): string | null {
  if (save.blueprints.includes(r.id)) return 'Already decoded';
  for (const s of r.scans) if (!save.scans.includes(s)) return 'Needs a scan the log does not have yet';
  for (const f of r.finds) if (!save.finds.includes(f)) return `Bring the ${FINDS[f].name} here`;
  return null;
}

/** Jobs are kept per piece; finished pieces only. */
export function jobOf(save: SaveData, p: Placed): StationJob | null {
  return save.jobs[String(p.id)] ?? null;
}

/** Any Lab or Workshop already running this job. */
export function jobRunning(save: SaveData, id: string): boolean {
  return Object.values(save.jobs).some((j) => j.id === id);
}

export type StationEvent = { type: 'decoded'; id: BlueprintId; piece: Placed } | { type: 'built'; id: GearId; piece: Placed };

/** Run the Labs and Workshops forward by dt seconds of play. */
export function tickStations(save: SaveData, layout: BaseLayout, dt: number): StationEvent[] {
  const ev: StationEvent[] = [];
  const live = new Set(layout.pieces.map((p) => String(p.id)));
  for (const k of Object.keys(save.jobs)) if (!live.has(k)) delete save.jobs[k];
  for (const p of layout.pieces) {
    if ((p.kind !== 'lab' && p.kind !== 'workshop') || !isDone(p) || !layout.powered.has(p.id)) continue;
    const j = save.jobs[String(p.id)];
    if (!j) continue;
    const [what, id] = j.id.split(':');
    const secs = what === 'research' ? RESEARCH[id as BlueprintId].seconds : GEAR[id as GearId].seconds;
    j.progress = Math.min(1, j.progress + dt / secs);
    if (j.progress < 1) continue;
    delete save.jobs[String(p.id)];
    if (what === 'research') {
      if (!save.blueprints.includes(id as BlueprintId)) save.blueprints.push(id as BlueprintId);
      ev.push({ type: 'decoded', id: id as BlueprintId, piece: p });
    } else if (KIT_GEAR.includes(id as GearId)) {
      if (id === 'relay') save.relayKits++;
      ev.push({ type: 'built', id: id as GearId, piece: p });
    } else {
      if (!save.gear.includes(id as GearId)) save.gear.push(id as GearId);
      ev.push({ type: 'built', id: id as GearId, piece: p });
    }
  }
  return ev;
}

/** Seconds left on a job, for the readouts. */
export function jobSecondsLeft(j: StationJob): number {
  const [what, id] = j.id.split(':');
  const secs = what === 'research' ? RESEARCH[id as BlueprintId].seconds : GEAR[id as GearId].seconds;
  return Math.ceil((1 - j.progress) * secs);
}
