import type { MaterialId, SaveData } from './state';
import { groundY } from '../world/terrain';

/**
 * Phase 13: mineral lodes, the drill nose's lasting job.
 *
 * Before Phase 13 KS-1's drill nose had one use: the soft seam under the trench
 * rim. Lodes give it a reason to stay fitted. Each is a hard, glinting knot of
 * ore in the seabed along the sub's routes (kelp forest, wreck shelf, trench
 * ledge, trench floor) that a diver's hands cannot break. Bow over one and hold
 * Collect: the drill bores it in a few seconds and the cuttings go into the
 * dive bag. A lode seals over again after `LODE_REGROW` seconds of play, so a
 * sub trip through a zone can always bring back its materials.
 *
 * They only add materials. Creature-assisted obstacles, the seam and every
 * existing gate stay as they were.
 */
export interface Lode {
  id: string;
  x: number;
  /** Zone wording for the banner and toast. */
  where: string;
  yield: Partial<Record<MaterialId, number>>;
  /** A first-drill bonus and a core-sample note (once per lode). */
  first: Partial<Record<MaterialId, number>>;
  note: string;
  /** Tint of the exposed mineral. */
  color: number;
}

export const LODE_REGROW = 10 * 60;
export const LODE_SECONDS = 2.6;
/** How close the sub's bow must be (world units). */
export const LODE_REACH = 200;

export const LODES: Lode[] = [
  {
    id: 'lode-forest',
    x: 11400,
    where: 'kelp forest',
    yield: { copper: 2, quartz: 1 },
    first: { copper: 1 },
    note: 'Core sample, kelp forest floor: green-stained copper ore threaded with quartz, under a skin of holdfast roots.',
    color: 0x6fae84,
  },
  {
    id: 'lode-shelf-w',
    x: 20500,
    where: 'wreck shelf',
    yield: { copper: 2, quartz: 1 },
    first: { quartz: 1 },
    note: 'Core sample, western wreck shelf: copper and quartz in old lava, scored by the race long before the wrecks came.',
    color: 0x7fb8a0,
  },
  {
    id: 'lode-shelf-e',
    x: 21800,
    where: 'wreck shelf',
    yield: { copper: 1, scrap: 2 },
    first: { brass: 1 },
    note: 'Core sample, wreck shelf: a fused crust of ore and wreck metal. A brass fitting was sealed inside it.',
    color: 0xc8a060,
  },
  {
    id: 'lode-trench',
    x: 28200,
    where: 'trench ledge',
    yield: { ore: 2, quartz: 1 },
    first: { ore: 1 },
    note: 'Core sample, trench ledge: vent ore that cooled in the rock, far from any chimney. The drill reaches what the vents give grudgingly.',
    color: 0xe07a3a,
  },
  {
    id: 'lode-floor',
    x: 30700,
    where: 'trench floor',
    yield: { ore: 2, quartz: 2 },
    first: { brass: 1, ore: 1 },
    note: 'Core sample, trench floor, 99 m: dense vent ore and clear quartz. Faint rings in the quartz, like ripples. Something below sings into the stone.',
    color: 0xf09048,
  },
];

export const lodeY = (l: Lode): number => groundY(l.x);

/** Seconds of play until a drilled lode is ready again (0 = ready). */
export function lodeWait(save: SaveData, l: Lode): number {
  const at = save.lodes?.[l.id];
  if (at === undefined) return 0;
  return Math.max(0, at + LODE_REGROW - save.playSeconds);
}

/** Has this lode ever been drilled? (the first-drill bonus and note) */
export const lodeFirst = (save: SaveData, l: Lode): boolean => !(save.lodeNotes ?? []).includes(l.id);

/** The lode under KS-1's bow, if any. */
export function lodeAt(bowX: number, y: number): Lode | null {
  for (const l of LODES) if (Math.hypot(bowX - l.x, y - (lodeY(l) - 40)) < LODE_REACH) return l;
  return null;
}

