import { mulberry32 } from '../rng';
import type { CreatureData, SpeciesId } from './state';

/**
 * Inherited traits (milestone 9, Colin's choices). No drawing here, just the
 * rules; src/actors/critters.ts draws them.
 *
 *  - Colour: four per species. The first three turn up in the wild (the
 *    first is the common one); the fourth is rare and only ever appears as
 *    a mutation when creatures breed.
 *  - Glow pattern: three per species, the arrangement of its glowing marks.
 *  - Radiant: a rare, brighter and wider glow. It has a gameplay effect: a
 *    radiant creature makes a little more, and a radiant glowfin lights more
 *    of a lightless passage when it swims with you.
 *
 * A young creature takes its colour and pattern each from one parent or the
 * other, with a small chance of a mutation. Radiance runs in families.
 */

export interface Traits {
  /** 0..3; 3 is the rare colour. */
  colour: number;
  /** 0..2. */
  pattern: number;
  radiant?: boolean;
  /** 1 = caught in the wild (or revived); 2 = its young, and so on. */
  gen?: number;
}

export const COLOURS: Record<SpeciesId, string[]> = {
  glowfin: ['Coral', 'Tide blue', 'Kelp gold', 'Moonpale'],
  puffcap: ['Peach', 'Rose', 'Lemon', 'Sea-glass'],
  ray: ['Sand', 'Slate', 'Moss', 'Midnight'],
  crab: ['Rust', 'Olive', 'Brick', 'Steel blue'],
  shrimp: ['Amber', 'Ruby', 'Clearwater', 'Gilded'],
  snail: ['Iron', 'Bronze', 'Ash', 'Ember gold'],
};
export const PATTERNS: Record<SpeciesId, string[]> = {
  glowfin: ['side line', 'spotted', 'banded'],
  puffcap: ['polka dots', 'rim lights', 'starburst'],
  ray: ['tail light', 'dappled glow', 'ring glow'],
  crab: ['eye shine', 'shell spots', 'claw tips'],
  shrimp: ['side lights', 'banded', 'tail lantern'],
  snail: ['seam glow', 'foot lights', 'spiral glow'],
};
export const RARE_COLOUR = 3;

/** Chance a colour mutates in an egg. */
export const MUTATION = 0.08;
/**
 * After milestone 12 (Colin: breeding should find new patterns at least as fast as
 * the wild): a pattern mutates this often, and a mutation always gives a pattern
 * neither parent shows (when there is one). The third pattern of each species is
 * never found in the wild: only breeding brings it out.
 */
export const PATTERN_MUTATION = 0.2;
/** Wild creatures only ever show the first this-many patterns. */
export const WILD_PATTERNS = 2;
/** Chance an egg is radiant, by how many parents are. */
export const RADIANT_ODDS = [0.04, 0.35, 0.75];
/** A radiant grown creature makes this much more. */
export const RADIANT_MAKE = 1.25;
/** A radiant glowfin's escort light reaches this much further. */
export const RADIANT_LIGHT = 1.6;

function pickWeighted(r: number, w: number[]): number {
  let acc = 0;
  const sum = w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) {
    acc += w[i] / sum;
    if (r < acc) return i;
  }
  return w.length - 1;
}

/** Traits of a creature from the wild: common colours and patterns, never radiant. */
export function wildTraits(rand: () => number = Math.random): Traits {
  return { colour: pickWeighted(rand(), [55, 30, 15]), pattern: pickWeighted(rand(), [65, 35]), gen: 1 };
}

/** Its traits. Creatures from before milestone 9 get wild traits fixed by their id. */
export function traitsOf(c: { id: number; traits?: Traits }): Traits {
  return c.traits ?? wildTraits(mulberry32(c.id * 7919 + 17));
}

/** An egg's traits from two parents. */
export function inherit(a: Traits, b: Traits, rand: () => number = Math.random): Traits {
  const colour = rand() < MUTATION ? Math.floor(rand() * 4) : rand() < 0.5 ? a.colour : b.colour;
  let pattern = rand() < 0.5 ? a.pattern : b.pattern;
  if (rand() < PATTERN_MUTATION) {
    const fresh = [0, 1, 2].filter((p) => p !== a.pattern && p !== b.pattern);
    pattern = fresh.length ? fresh[Math.floor(rand() * fresh.length)] : Math.floor(rand() * 3);
  }
  const radiant = rand() < RADIANT_ODDS[(a.radiant ? 1 : 0) + (b.radiant ? 1 : 0)];
  return { colour, pattern, radiant: radiant || undefined, gen: Math.max(a.gen ?? 1, b.gen ?? 1) + 1 };
}

/** "Moonpale, banded glow · radiant". */
export function traitText(species: SpeciesId, t: Traits): string {
  return `${COLOURS[species][t.colour] ?? COLOURS[species][0]}, ${PATTERNS[species][t.pattern] ?? PATTERNS[species][0]}${t.radiant ? ' · radiant' : ''}`;
}

/** Is anything about it rare (a rare colour, or radiant)? */
export function isRare(t: Traits): boolean {
  return t.colour === RARE_COLOUR || !!t.radiant;
}

/** "1st generation" style label. */
export function genText(t: Traits): string {
  const g = t.gen ?? 1;
  if (g <= 1) return 'wild-born';
  const sfx = g === 2 ? 'nd' : g === 3 ? 'rd' : 'th';
  return `${g}${sfx} generation, bred at the base`;
}

/** Traits for a creature that has none yet (caught, or old save). */
export function ensureTraits(c: CreatureData): Traits {
  c.traits ??= traitsOf(c);
  return c.traits;
}
