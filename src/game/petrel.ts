import { BaseLayout, isDone } from './base';
import { PETREL_AIR, type MaterialId, type SaveData, type SpeciesId } from './state';
import { traitsOf } from './traits';

/**
 * The Petrel (planned with Colin, Nov 27, 2026; see "Beyond Earth" in
 * docs/ROADMAP.md). No drawing here, just the rules.
 *
 * After first contact the Choir shows Kestrel its kin under the ice of a far
 * moon. The Petrel is the ship that will carry him there. It is built in five
 * stages on a launch platform at the surface above the base, and every stage
 * is one of the ship's systems, made from what a pair of creatures gives:
 * the base's creature care becomes the launch programme.
 *
 * A finished, powered Petrel works PW-1 makes the current stage's parts from
 * base storage, one part at a time (it never takes from the dive bag). A
 * stage only starts once the base has grown the creatures whose biology the
 * system needs (grown, in a tank: they lend the works their know-how, they
 * are never used up). When a stage's last part is made it is fitted to the
 * ship at once and pays off with a reward.
 *
 * Every number is one constant below, easy to tune.
 */

export interface PetrelKey {
  /** A grown creature of this species in a tank... */
  species: SpeciesId;
  /** ...this many of them (default 1)... */
  count?: number;
  /** ...showing at least this many different glow patterns. */
  patterns?: number;
}

export interface PetrelStage {
  id: 'frame' | 'shield' | 'air' | 'nav' | 'core';
  /** The ship system, as the panel names it. */
  name: string;
  /** What the works makes for it (plural). */
  part: string;
  /** Parts needed to finish the stage. */
  parts: number;
  /** Materials from base storage for one part. */
  recipe: Partial<Record<MaterialId, number>>;
  /** Creatures the base must have grown before the stage starts. */
  keys: PetrelKey[];
  /** Also needs a Choir-touched creature somewhere in the base (an egg counts). */
  choir?: boolean;
  /** One line on what the system does for the ship. */
  why: string;
  /** What finishing it gives right away (shown in the panel and on the reward card). */
  reward: string;
}

export const PETREL_STAGES: PetrelStage[] = [
  {
    id: 'frame',
    name: 'Frame and launch platform',
    part: 'girders',
    parts: 12,
    recipe: { scrap: 3, copper: 2, plate: 1 },
    keys: [{ species: 'crab' }, { species: 'ray' }],
    why: 'Tinker crabs know old metal and dapple rays know copper: together they show the works how to draw girders that flex instead of crack.',
    reward: 'The platform and the Petrel’s frame rise at the surface, and Kestrel HQ sends a survey grant of 150 SC.',
  },
  {
    id: 'shield',
    name: 'Heat shield and engine bells',
    part: 'heat tiles',
    parts: 12,
    recipe: { brass: 2, ore: 2, plate: 1 },
    keys: [{ species: 'eel' }, { species: 'snail' }],
    why: 'Kiln eels and cinder snails live beside the vents without burning. Their brass and cooled vent ore make tiles that shrug off fire.',
    reward: 'Spare heat tiles line Kestrel’s suit: vent heat scalds 40% less.',
  },
  {
    id: 'air',
    name: 'Life support',
    part: 'air cartridges',
    parts: 10,
    recipe: { fibre: 3, moss: 2, resin: 1 },
    keys: [{ species: 'puffcap' }, { species: 'shrimp' }],
    why: 'Puffcap threads and lantern-shrimp moss make a living air garden: a sealed loop that keeps breathing on its own.',
    reward: 'A spare air cartridge fits Kestrel’s pack: +20 seconds of air on every dive.',
  },
  {
    id: 'nav',
    name: 'Navigation and viewports',
    part: 'lenses',
    parts: 10,
    recipe: { quartz: 3, copper: 1, brass: 1 },
    keys: [{ species: 'glowfin', count: 3, patterns: 3 }],
    why: 'Glowfins steer by light. Three glowfins with three different patterns teach the works to grind lenses that read the stars.',
    reward: 'The spare lenses focus the tank lamps: every creature makes 10% more.',
  },
  {
    id: 'core',
    name: 'The Choir core',
    part: 'core rings',
    parts: 8,
    recipe: { bloom: 2, brass: 2, quartz: 2 },
    keys: [{ species: 'horse' }],
    choir: true,
    why: 'Chime seahorses hum the Choir’s pitch, and a Choir-touched creature carries its light. The core is grown, not built: it sings the ship awake.',
    reward: 'The Petrel is whole. She waits on the platform for her launch.',
  },
];

/** Seconds of work per part at full power (the materials are usually what holds a stage up). */
export const PART_SECONDS = 75;
/** Stage rewards, as numbers. */
export const PETREL_GRANT_SC = 150;
export const PETREL_SCALD = 0.6;
export const PETREL_YIELD = 1.1;

export interface PetrelData {
  /** Stages finished, 0..5. */
  done: number;
  /** Parts made toward the current stage. */
  parts: number;
  /** 0..1 progress on the part being made. */
  progress: number;
}

/** The ship's progress, created on first use (old saves have none). */
export function petrelOf(save: SaveData): PetrelData {
  if (!save.petrel) save.petrel = { done: 0, parts: 0, progress: 0 };
  return save.petrel;
}

/** Stages finished (0 when there is no ship yet), without creating anything. */
export function petrelDone(save: SaveData): number {
  return Math.max(0, Math.min(PETREL_STAGES.length, save.petrel?.done ?? 0));
}

export function petrelComplete(save: SaveData): boolean {
  return petrelDone(save) >= PETREL_STAGES.length;
}

/** The stage being worked on, or null once the ship is whole. */
export function currentStage(save: SaveData): PetrelStage | null {
  return PETREL_STAGES[petrelDone(save)] ?? null;
}

/** Is a finished, powered Petrel works on the site? */
export function hasWorks(layout: BaseLayout): boolean {
  return layout.pieces.some((p) => p.kind === 'works' && isDone(p) && layout.powered.has(p.id));
}

/** One unmet key, in words, or null when the stage's creatures are all there. */
export function missingKey(save: SaveData, stage: PetrelStage): string | null {
  for (const k of stage.keys) {
    const grown = save.creatures.filter((c) => c.species === k.species && c.stage === 'grown');
    const need = k.count ?? 1;
    if (grown.length < need) return `${need > 1 ? `${need} grown` : 'a grown'} ${SPECIES_NAME[k.species]}${need > 1 ? 's' : ''} in a tank`;
    if (k.patterns) {
      const pats = new Set(grown.map((c) => traitsOf(c).pattern));
      if (pats.size < k.patterns) return `${SPECIES_NAME[k.species]}s showing ${k.patterns} different glow patterns (you have ${pats.size})`;
    }
  }
  if (stage.choir && !save.creatures.some((c) => traitsOf(c).choir)) return 'a Choir-touched creature in the base (an egg counts)';
  return null;
}

/** The first material the next part is short of, or null when storage holds a whole part. */
export function shortOf(save: SaveData, stage: PetrelStage): MaterialId | null {
  for (const [k, n] of Object.entries(stage.recipe) as [MaterialId, number][]) if ((save.stored[k] ?? 0) < n) return k;
  return null;
}

/** Which species each stage leans on (for the panel). */
const SPECIES_NAME: Record<SpeciesId, string> = {
  glowfin: 'glowfin',
  puffcap: 'puffcap',
  ray: 'dapple ray',
  crab: 'tinker crab',
  shrimp: 'lantern shrimp',
  snail: 'cinder snail',
  eel: 'kiln eel',
  horse: 'chime seahorse',
};
export const speciesLabel = (s: SpeciesId): string => SPECIES_NAME[s];

export type PetrelState = 'locked' | 'no-works' | 'needs-key' | 'short' | 'running' | 'done';

export interface PetrelStatus {
  state: PetrelState;
  stage: PetrelStage | null;
  /** The unmet key or the missing material, in words. */
  why: string;
}

export function petrelStatus(save: SaveData, layout: BaseLayout): PetrelStatus {
  const stage = currentStage(save);
  if (!stage) return { state: 'done', stage: null, why: 'The Petrel is whole. She waits on the platform for her launch.' };
  if (!save.sanctum?.contact) return { state: 'locked', stage, why: 'Only after first contact.' };
  if (!hasWorks(layout)) return { state: 'no-works', stage, why: layout.pieces.some((p) => p.kind === 'works') ? 'The Petrel works needs power (and to be finished).' : 'Build a Petrel works PW-1 at the base.' };
  const key = missingKey(save, stage);
  if (key) return { state: 'needs-key', stage, why: `Needs ${key}.` };
  const short = shortOf(save, stage);
  if (short) return { state: 'short', stage, why: `Waiting for ${short === 'plate' ? 'hull plating' : short} in base storage.` };
  return { state: 'running', stage, why: `Making ${stage.part}.` };
}

export type PetrelEvent = { type: 'part'; stage: PetrelStage; parts: number } | { type: 'stage'; stage: PetrelStage; index: number };

/** Run the works forward by dt seconds of play. */
export function tickPetrel(save: SaveData, layout: BaseLayout, dt: number): PetrelEvent[] {
  const out: PetrelEvent[] = [];
  if (!save.sanctum?.contact) return out;
  const stage = currentStage(save);
  if (!stage || !hasWorks(layout) || missingKey(save, stage) || shortOf(save, stage)) return out;
  const rate = Math.max(0, ...layout.pieces.filter((p) => p.kind === 'works' && isDone(p)).map((p) => layout.powerRate(p.id)));
  const pd = petrelOf(save);
  pd.progress = Math.min(1, pd.progress + (dt * rate) / PART_SECONDS);
  if (pd.progress < 1) return out;
  pd.progress = 0;
  for (const [k, n] of Object.entries(stage.recipe) as [MaterialId, number][]) save.stored[k] = Math.max(0, (save.stored[k] ?? 0) - n);
  pd.parts++;
  out.push({ type: 'part', stage, parts: pd.parts });
  if (pd.parts >= stage.parts) {
    const index = pd.done;
    pd.done++;
    pd.parts = 0;
    if (stage.id === 'frame') save.credits = Math.max(0, Math.floor(save.credits ?? 0)) + PETREL_GRANT_SC;
    out.push({ type: 'stage', stage, index });
  }
  return out;
}

/** 0..1 across the whole ship (for the art and the panel). */
export function petrelFraction(save: SaveData): number {
  const done = petrelDone(save);
  const stage = PETREL_STAGES[done];
  if (!stage) return 1;
  const pd = save.petrel;
  return (done + ((pd?.parts ?? 0) + (pd?.progress ?? 0)) / stage.parts) / PETREL_STAGES.length;
}

/** The stage rewards that change the rules (read by main, the oxygen and the creatures). */
export const petrelScald = (save: SaveData): number => (petrelDone(save) >= 2 ? PETREL_SCALD : 1);
export const petrelAir = (save: SaveData): number => (petrelDone(save) >= 3 ? PETREL_AIR : 0);
export { PETREL_AIR };
export const petrelYield = (save: SaveData): number => (petrelDone(save) >= 4 ? PETREL_YIELD : 1);
