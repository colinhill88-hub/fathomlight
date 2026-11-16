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
};
export const RESEARCH_ORDER: BlueprintId[] = ['light'];

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
};
export const GEAR_ORDER: GearId[] = ['light'];

export const FINDS: Record<FindId, { name: string; text: string }> = {
  recorder: { name: 'SLED 2 recorder', text: 'A scuffed data cartridge from the survey sled. The Lab can read it.' },
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
