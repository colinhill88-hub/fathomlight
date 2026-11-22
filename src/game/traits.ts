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
  /** Phase 22: the occasional tiny or giant one. Missing: ordinary size. */
  size?: Size;
  /** Phase 22: fin or shell shape, 0..2 (SHAPES). Missing: 0, the usual shape. 1 is uncommon, 2 rare and bred only. */
  shape?: number;
  /** Phase 22: an heirloom line. Only appears from the fourth generation on, then runs in the family. */
  heirloom?: boolean;
  /** Phase 23: touched by the Choir (only after first contact): it carries the Choir's colours. */
  choir?: boolean;
}

export type Size = 'tiny' | 'giant';
/** How much bigger or smaller a tiny or giant one is drawn. */
export const SIZE_SCALE: Record<Size, number> = { tiny: 0.68, giant: 1.38 };

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

/**
 * Phase 22: fin or shell shapes, three per species. The first is the usual one; the
 * second turns up now and then (uncommon, also in the wild); the third is rare and
 * only ever comes from breeding.
 */
export const SHAPES: Record<SpeciesId, string[]> = {
  glowfin: ['round fins', 'sail fin', 'veil tail'],
  puffcap: ['frilled rim', 'lace rim', 'crowned bell'],
  ray: ['round wings', 'pointed wings', 'fringed wings'],
  crab: ['smooth shell', 'spiked shell', 'fan crest'],
  shrimp: ['plain fan', 'long whips', 'plume tail'],
  snail: ['round coil', 'tall spire', 'fluted shell'],
};

/**
 * Phase 22, tiered rarity (Colin, Nov 22, 2026): uncommon traits about 1 in 8 hatchings,
 * rare about 1 in 25, heirloom and Choir-touched 1 in 100 or rarer; all better with great
 * care (the care bonus multiplies each fresh chance, up to twice).
 *  - Size: a tiny or a giant one, each 1 in 16 (so a size variant is 1 in 8).
 *  - Shape: the second shape 1 in 8, the third 1 in 25.
 *  - Heirloom: 1 in 100, and only for an egg of the 4th generation or later.
 *  - Choir-touched: 1 in 150, and only after first contact.
 * A parent's size, shape, heirloom and Choir light are passed on often (they run in
 * families), so a line can be bred true with patience.
 */
export const SIZE_ODDS = 1 / 16;
export const SHAPE_UNCOMMON = 1 / 8;
export const SHAPE_RARE = 1 / 25;
export const HEIRLOOM_ODDS = 1 / 100;
/** An heirloom needs an egg of at least this generation (parents bred for three generations). */
export const HEIRLOOM_GEN = 4;
export const CHOIR_ODDS = 1 / 150;
/** The chance a young takes a parent's size or shape (from one parent picked at random). */
export const FORM_KEEP = 0.75;
/** Chance an egg is an heirloom, by how many parents are. */
export const HEIRLOOM_LINE = [HEIRLOOM_ODDS, 0.5, 0.85];
/** Chance an egg is Choir-touched, by how many parents are (after contact). */
export const CHOIR_LINE = [CHOIR_ODDS, 1 / 12, 1 / 6];

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

/**
 * Phase 22: the size and shape a wild creature may show (uncommon forms only: the rare
 * shape, heirlooms and the Choir's light are never found in the wild). Kept apart from
 * wildTraits so creatures from older saves, whose looks come from their id, never change.
 */
export function wildForms(rand: () => number = Math.random): Pick<Traits, 'size' | 'shape'> {
  const out: Pick<Traits, 'size' | 'shape'> = {};
  const r = rand();
  if (r < SIZE_ODDS) out.size = 'tiny';
  else if (r < SIZE_ODDS * 2) out.size = 'giant';
  if (rand() < SHAPE_UNCOMMON) out.shape = 1;
  return out;
}

/** The looks of a wild creature placed in the world (its seed fixes them). */
export function wildLook(seed: number): Traits {
  return { ...traitsOf({ id: seed }), ...wildForms(mulberry32(seed * 6151 + 29)) };
}

/** Its traits. Creatures from before milestone 9 get wild traits fixed by their id. */
export function traitsOf(c: { id: number; traits?: Traits }): Traits {
  return c.traits ?? wildTraits(mulberry32(c.id * 7919 + 17));
}

/**
 * Phase 21: good care makes rare results more likely (Colin: about twice as likely for a
 * content, well-kept pair as for a neglected one). `care` multiplies the chance of a colour
 * mutation, a pattern mutation and radiance; 1 is the old odds, CARE_MAX the best.
 * Radiance never goes above RADIANT_CAP, so even a radiant pair isn't a certainty.
 */
export const CARE_MAX = 2;
export const RADIANT_CAP = 0.9;

/** What else the egg depends on: whether the Choir has been met (Choir-touched eggs). */
export interface InheritOpts {
  contact?: boolean;
}

/** An egg's traits from two parents (`care` from carePower in src/game/collection.ts; 1 = the old odds). */
export function inherit(a: Traits, b: Traits, rand: () => number = Math.random, care = 1, opts: InheritOpts = {}): Traits {
  const k = Math.max(1, Math.min(CARE_MAX, care));
  const colour = rand() < MUTATION * k ? Math.floor(rand() * 4) : rand() < 0.5 ? a.colour : b.colour;
  let pattern = rand() < 0.5 ? a.pattern : b.pattern;
  if (rand() < PATTERN_MUTATION * k) {
    const fresh = [0, 1, 2].filter((p) => p !== a.pattern && p !== b.pattern);
    pattern = fresh.length ? fresh[Math.floor(rand() * fresh.length)] : Math.floor(rand() * 3);
  }
  const radiant = rand() < radiantChance(a, b, k);
  const gen = Math.max(a.gen ?? 1, b.gen ?? 1) + 1;
  const out: Traits = { colour, pattern, radiant: radiant || undefined, gen };
  // Phase 22 (drawn after the older traits, so the same draws still give the same colour, pattern and radiance).
  const r = rand();
  const from = rand() < 0.5 ? a : b;
  const keep = rand() < FORM_KEEP;
  if (r < SIZE_ODDS * k) out.size = 'tiny';
  else if (r < SIZE_ODDS * 2 * k) out.size = 'giant';
  else if (keep && from.size) out.size = from.size;
  const r2 = rand();
  const from2 = rand() < 0.5 ? a : b;
  const keep2 = rand() < FORM_KEEP;
  if (r2 < SHAPE_RARE * k) out.shape = 2;
  else if (r2 < (SHAPE_RARE + SHAPE_UNCOMMON) * k) out.shape = 1;
  else if (keep2 && from2.shape) out.shape = from2.shape;
  if (rand() < heirloomChance(a, b, k)) out.heirloom = true;
  if (rand() < choirChance(a, b, k, !!opts.contact)) out.choir = true;
  return out;
}

/** Chance an egg is an heirloom, with care (none before the 4th generation, unless a parent already is one). */
export function heirloomChance(a: Traits, b: Traits, care = 1): number {
  const k = Math.max(1, Math.min(CARE_MAX, care));
  const n = (a.heirloom ? 1 : 0) + (b.heirloom ? 1 : 0);
  if (!n && Math.max(a.gen ?? 1, b.gen ?? 1) + 1 < HEIRLOOM_GEN) return 0;
  return Math.min(RADIANT_CAP, HEIRLOOM_LINE[n] * k);
}

/** Chance an egg is Choir-touched, with care (none before first contact). */
export function choirChance(a: Traits, b: Traits, care = 1, contact = false): number {
  if (!contact) return 0;
  const k = Math.max(1, Math.min(CARE_MAX, care));
  return Math.min(RADIANT_CAP, CHOIR_LINE[(a.choir ? 1 : 0) + (b.choir ? 1 : 0)] * k);
}

/** Chance an egg of these parents is radiant, with care. */
export function radiantChance(a: Traits, b: Traits, care = 1): number {
  const k = Math.max(1, Math.min(CARE_MAX, care));
  return Math.min(RADIANT_CAP, RADIANT_ODDS[(a.radiant ? 1 : 0) + (b.radiant ? 1 : 0)] * k);
}

/**
 * Phase 21, the breeding planner: the exact chances of each colour and pattern
 * (and of radiance) for an egg of these two parents. They follow `inherit` step by step.
 */
export interface EggOdds {
  colour: number[];
  pattern: number[];
  radiant: number;
  /** Phase 22: chance of a tiny one and of a giant one. */
  tiny: number;
  giant: number;
  /** Phase 22: chance of each shape. */
  shape: number[];
  heirloom: number;
  choir: number;
}

export function eggOdds(a: Traits, b: Traits, care = 1, opts: InheritOpts = {}): EggOdds {
  const k = Math.max(1, Math.min(CARE_MAX, care));
  const cm = Math.min(1, MUTATION * k);
  const colour = [0, 1, 2, 3].map((c) => cm / 4 + (1 - cm) * (0.5 * Number(a.colour === c) + 0.5 * Number(b.colour === c)));
  const pm = Math.min(1, PATTERN_MUTATION * k);
  const fresh = [0, 1, 2].filter((p) => p !== a.pattern && p !== b.pattern);
  const pattern = [0, 1, 2].map((p) => {
    const keep = 0.5 * Number(a.pattern === p) + 0.5 * Number(b.pattern === p);
    const mut = fresh.length ? (fresh.includes(p) ? 1 / fresh.length : 0) : 1 / 3;
    return (1 - pm) * keep + pm * mut;
  });
  // Size: a fresh tiny or giant, else (most often) a parent's size, else ordinary.
  const sf = Math.min(1, SIZE_ODDS * k);
  const sizeFrom = (s: Size) => FORM_KEEP * 0.5 * (Number(a.size === s) + Number(b.size === s));
  const tiny = sf + (1 - 2 * sf) * sizeFrom('tiny');
  const giant = Math.min(1 - sf, sf * 2) - sf + (1 - 2 * sf) * sizeFrom('giant');
  const rare = Math.min(1, SHAPE_RARE * k);
  const unc = Math.min(1, (SHAPE_RARE + SHAPE_UNCOMMON) * k) - rare;
  const rest = 1 - rare - unc;
  const shapeFrom = (s: number) => FORM_KEEP * 0.5 * (Number((a.shape ?? 0) === s) + Number((b.shape ?? 0) === s));
  const s1 = unc + rest * shapeFrom(1);
  const s2 = rare + rest * shapeFrom(2);
  const shape = [1 - s1 - s2, s1, s2];
  return {
    colour, pattern, radiant: radiantChance(a, b, k),
    tiny, giant, shape, heirloom: heirloomChance(a, b, k), choir: choirChance(a, b, k, !!opts.contact),
  };
}

/** "giant · sail fin · heirloom" style extras (empty for an ordinary one). */
export function formText(species: SpeciesId, t: Traits): string {
  return [t.size ?? '', t.shape ? SHAPES[species]?.[t.shape] ?? '' : '', t.heirloom ? 'heirloom' : '', t.choir ? 'Choir-touched' : ''].filter(Boolean).join(' · ');
}

/** "Moonpale, banded glow · giant · sail fin · radiant". */
export function traitText(species: SpeciesId, t: Traits): string {
  const forms = formText(species, t);
  return `${COLOURS[species][t.colour] ?? COLOURS[species][0]}, ${PATTERNS[species][t.pattern] ?? PATTERNS[species][0]}${forms ? ` · ${forms}` : ''}${t.radiant ? ' · radiant' : ''}`;
}

/** Is anything about it rare (a rare colour, radiant, the rare shape, an heirloom or the Choir's light)? */
export function isRare(t: Traits): boolean {
  return t.colour === RARE_COLOUR || !!t.radiant || t.shape === 2 || !!t.heirloom || !!t.choir;
}

/** Is anything about it uncommon or better (a size variant or the second shape too)? */
export function isUncommon(t: Traits): boolean {
  return isRare(t) || !!t.size || t.shape === 1 || t.pattern >= WILD_PATTERNS;
}

/**
 * Phase 22: how rare it is, as a tier, for the hatching moment, tags and sorting.
 * 'legendary' is an heirloom or Choir-touched (1 in 100 or rarer); 'rare' is the rare
 * colour, the rare shape or radiant (about 1 in 25 to 1 in 50); 'uncommon' is a size
 * variant, the second shape or the bred-only pattern.
 */
export function rarityTier(t: Traits): 'common' | 'uncommon' | 'rare' | 'legendary' {
  if (t.heirloom || t.choir) return 'legendary';
  if (t.colour === RARE_COLOUR || t.shape === 2 || t.radiant) return 'rare';
  if (t.size || t.shape === 1 || t.pattern >= WILD_PATTERNS) return 'uncommon';
  return 'common';
}

/** Drop anything malformed from a creature's saved traits (old or edited saves). */
export function cleanTraits(t: Traits): Traits {
  if (t.size !== undefined && t.size !== 'tiny' && t.size !== 'giant') delete t.size;
  if (t.shape !== undefined && !(t.shape === 1 || t.shape === 2)) delete t.shape;
  if (t.heirloom !== undefined && t.heirloom !== true) delete t.heirloom;
  if (t.choir !== undefined && t.choir !== true) delete t.choir;
  return t;
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
