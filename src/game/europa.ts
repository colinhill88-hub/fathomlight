import { BRINE_POOLS, ceilY, FLOES, floorY, ICE_WALL_X, PASSAGE } from '../world/europaTerrain';
import { petrelComplete } from './petrel';
import type { SaveData } from './state';

/**
 * Beyond Earth (Nov 27, 2026): Europa's rules. No drawing here.
 * See "Beyond Earth" in docs/ROADMAP.md for Colin's decisions:
 *  - First contact is the start of the next stage; the Petrel carries Kestrel to Europa.
 *  - Kestrel's gear, the drone KD-1 and Linnea come along; KS-1 stays home (Europa will
 *    get its own way of getting around, designed later with Colin).
 *  - Europa's own life glows icy white and pale blue-green (the Choir keeps cyan, violet, magenta).
 *  - Earth base pieces don't work in the cold. Europa's pieces are discovered there: the
 *    Choir's kin carved them into the ice as glyphs, and the Petrel's Choir core reads them.
 *  - Going home costs Europa resources (fuel refined from brine and rime). Going back to
 *    Europa is free: the Choir core carries the Petrel there. Never stranded: the fuel's
 *    materials always grow back near the lander.
 *
 * Europa's materials live in their own store (save.europa.stores), apart from the Earth
 * materials, so nothing on Earth changes.
 */

export type EuropaMat = 'rime' | 'brine' | 'frond';
export const EUROPA_MATS: EuropaMat[] = ['rime', 'brine', 'frond'];
export const EUROPA_MAT: Record<EuropaMat, { name: string; plural: string; kg: number; effort: number; blurb: string }> = {
  rime: { name: 'Rime crystal', plural: 'Rime crystals', kg: 1, effort: 2.4, blurb: 'Clear ice grown in needles on the ceiling. Cold-proof glass and the fuel’s oxidiser.' },
  brine: { name: 'Brine salt', plural: 'Brine salt', kg: 2, effort: 2.2, blurb: 'Salt crust from the edge of a brine pool. The Petrel’s fuel is refined from it.' },
  frond: { name: 'Frost frond', plural: 'Frost fronds', kg: 0.5, effort: 1.6, blurb: 'Stiff, glassy weed from the seabed. Woven into seals that stay soft in the cold.' },
};
/** Seconds for a Europa material to grow back (play time). */
export const EUROPA_REGROW = 8 * 60;

export interface EuropaSpot {
  id: string;
  kind: EuropaMat;
  x: number;
  y: number;
}

/** Where the materials are: rime on the ceiling, brine at the pools' edges, fronds on the seabed. */
export const EUROPA_SPOTS: EuropaSpot[] = (() => {
  const s: EuropaSpot[] = [];
  const rime = [1250, 1700, 2450, 3200, 4150, 4500, 4850, 5650];
  rime.forEach((x, i) => s.push({ id: `rime-${i}`, kind: 'rime', x, y: ceilY(x) + 16 }));
  BRINE_POOLS.forEach((p, i) => {
    for (const side of [-1, 1]) {
      const x = p.x + side * (p.w / 2 + 30);
      s.push({ id: `brine-${i}-${side < 0 ? 'w' : 'e'}`, kind: 'brine', x, y: floorY(x) - 8 });
    }
  });
  const fronds = [1100, 1500, 2600, 3050, 4300, 5800];
  fronds.forEach((x, i) => s.push({ id: `frond-${i}`, kind: 'frond', x, y: floorY(x) - 10 }));
  // The floe field (biome 2): rime under the floes, fronds and brine crust on the open seabed.
  FLOES.filter((f) => !f.thin).forEach((f, i) => s.push({ id: `rime-f${i}`, kind: 'rime', x: f.x + (i % 2 ? 60 : -60), y: f.depth + 14 }));
  [9300, 10500, 11300, 12600, 13300].forEach((x, i) => s.push({ id: `frond-f${i}`, kind: 'frond', x, y: floorY(x) - 10 }));
  [11650, 12150].forEach((x, i) => s.push({ id: `brine-f${i}`, kind: 'brine', x, y: floorY(x) - 8 }));
  return s;
})();

/** The Choir kin's ice glyphs: read one (hold Collect) and the Petrel's core learns a Europa piece. */
export interface Glyph {
  id: 'still' | 'bell' | 'bladder' | 'crest' | 'gland';
  x: number;
  y: number;
  /** What it teaches: a piece for the hab, or a piece of gear for the floe ray. */
  module?: EuropaModuleId;
  gear?: RayGearId;
  text: string;
}
export const GLYPHS: Glyph[] = [
  {
    id: 'still',
    x: 2150,
    y: floorY(2150 - 210) - 60,
    module: 'still',
    text: 'Rings cut into a pillar of ice beside the first brine pool, glowing faintly from inside. The Petrel’s core hums as you read them, and a drawing forms: a still that boils fuel out of brine using the cold itself.',
  },
  {
    id: 'bell',
    x: 4500,
    y: ceilY(4500) + 40,
    module: 'bell',
    text: 'A glyph carved upside down into the low ice of the icicle forest: a dome of trapped air, held by rings. The core draws it out: an air bell that can hang anywhere under the ice.',
  },
  // The floe ray's gear (Colin, Nov 27, 2026: unlocked one at a time, not all at once).
  {
    id: 'bladder',
    x: ICE_WALL_X - 180,
    y: floorY(ICE_WALL_X - 180) - 70,
    gear: 'bladder',
    text: 'At the foot of the thick-ice wall, beside the black mouth of a passage, rings carved round a hollow: a ray with a bubble of air on its back, and a rider breathing from it. The current in the passage is strong and the water freezing. A diver alone could never cross it. A floe ray carrying air for its rider could.',
  },
  {
    id: 'crest',
    x: 10100,
    y: floorY(10100) - 70,
    gear: 'crest',
    text: 'On the rocky rise in the floe field, a glyph of a ray with a hard crest of rime on its brow, breaking upward through a floe. Thin ice, it seems, is no wall at all to a ray wearing one.',
  },
  {
    id: 'gland',
    x: 11900,
    y: floorY(11900) - 70,
    gear: 'gland',
    text: 'Deep in the hollow, where no light from the leads reaches, a glyph that glows by itself: a ray with a lantern grown on its brow, lighting the dark ahead. Farther on, the glyph says, the dark is deeper still.',
  },
];

export type EuropaModuleId = 'still' | 'bell';
export interface EuropaModuleDef {
  id: EuropaModuleId;
  name: string;
  code: string;
  job: string;
  cost: Partial<Record<EuropaMat, number>>;
  /** Seconds of KD-1 welding. */
  seconds: number;
}
export const EUROPA_MODULES: Record<EuropaModuleId, EuropaModuleDef> = {
  still: {
    id: 'still',
    name: 'Brine still',
    code: 'BS-1',
    job: 'Bolts to the lander’s ring and refines brine with the cold outside: the fuel for the trip home takes half as much.',
    cost: { rime: 3, frond: 3, brine: 2 },
    seconds: 40,
  },
  bell: {
    id: 'bell',
    name: 'Air bell',
    code: 'AB-1',
    job: 'A dome of air hung under the ice by the icicle forest. Swim up into it to breathe, far from the hab.',
    cost: { rime: 4, frond: 2 },
    seconds: 35,
  },
};
/** Where the air bell hangs once built. */
export const BELL_AT = { x: 4120, y: ceilY(4120) + 30 };

// ---- The floe ray (Colin, Nov 27, 2026): befriended, ridden, and fitted with organic gear ----

/** Where the wild floe ray glides, near the hab, until Kestrel befriends it. */
export const RAY_HOME = { x: 1650, y: 820 };
/** Frost fronds it must be offered (one at a time) before it lets Kestrel ride. */
export const RAY_TRUST = 3;

export type RayGearId = 'saddle' | 'bladder' | 'crest' | 'gland';
export interface RayGearDef {
  id: RayGearId;
  name: string;
  job: string;
  cost: Partial<Record<EuropaMat, number>>;
  /** Seconds to grow in the hab's brine vat. */
  seconds: number;
}
/** The order they unlock in: the saddle once the ray trusts Kestrel, then a glyph each. */
export const RAY_GEAR_ORDER: RayGearId[] = ['saddle', 'bladder', 'crest', 'gland'];
export const RAY_GEAR: Record<RayGearId, RayGearDef> = {
  saddle: {
    id: 'saddle',
    name: 'Frond saddle and pouch',
    job: 'A saddle woven from frost fronds, with a pouch: the ray swims faster with a rider who sits well, and Kestrel can gather without getting off.',
    cost: { frond: 4, brine: 1 },
    seconds: 30,
  },
  bladder: {
    id: 'bladder',
    name: 'Air bladder',
    job: 'A bladder of air grown on the saddle: Kestrel breathes from it while riding, and the ray will carry him through the cold passage under the wall.',
    cost: { frond: 3, rime: 2, brine: 2 },
    seconds: 40,
  },
  crest: {
    id: 'crest',
    name: 'Ice-breaker crest',
    job: 'A hard crest of rime grown on the ray’s brow: at speed, it rams through thin ice. A thin patch over the first biome, and two thin floes, will break.',
    cost: { rime: 5, brine: 2 },
    seconds: 45,
  },
  gland: {
    id: 'gland',
    name: 'Glow gland',
    job: 'A lantern grown on the ray’s brow, glowing icy blue-green: a wide light ahead of you while riding, for the darkest water.',
    cost: { rime: 3, frond: 3, brine: 1 },
    seconds: 40,
  },
};

export interface RayData {
  /** Fronds offered so far (it trusts Kestrel at RAY_TRUST). */
  trust: number;
  /** Where it waits when Kestrel isn't riding. */
  x: number;
  y: number;
  riding: boolean;
  learned: RayGearId[];
  gear: RayGearId[];
  growing?: { id: RayGearId; progress: number };
}

/** Fuel for one trip home, before and after the Brine still. */
// Never stranded: the four brine spots at the two pools nearest the hab pay for a trip (checked in scripts/test-europa.mjs).
export const FUEL_COST: Partial<Record<EuropaMat, number>> = { brine: 4, rime: 3 };
export const FUEL_COST_STILL: Partial<Record<EuropaMat, number>> = { brine: 2, rime: 2 };

/** Europa's two creatures in the first biome (scanned, not yet raised: a cold tank comes later). */
export type EuropaSpecies = 'moth' | 'glasshorn' | 'krill' | 'floeray';
export const EUROPA_CREATURES: Record<EuropaSpecies, { name: string; where: string; text: string; count: number }> = {
  moth: {
    name: 'Rime moth',
    where: 'under the ice',
    count: 5,
    text: 'A palm-sized swimmer with four frost-white fin-wings, fluttering along the underside of the ice. Rows of pale blue-green lights run down its wings. It drinks the warmth of your lamp and follows it, a little. It would die in Earth’s water: far too warm.',
  },
  glasshorn: {
    name: 'Glasshorn',
    where: 'by the brine pools',
    count: 3,
    text: 'A slow, long creature as clear as glass, walking the brine pools’ edges on dozens of fine legs. A single horn of ice-white light glows on its head. It grazes the salt crust, and leaves a trail of tiny bubbles.',
  },
  krill: {
    name: 'Lantern krill',
    where: 'in the floe field’s leads',
    count: 4,
    text: 'Swarms of tiny swimmers, each one a speck of icy white light, gathering under the open leads where Jupiter’s light comes down. A swarm turns all at once, like a flock of birds.',
  },
  floeray: {
    name: 'Floe ray',
    where: 'near the hab, and the floe field',
    count: 0,
    text: 'A broad, gentle ray as wide as KS-1 is long, white underneath and slate above, with pale blue-green lights along the edges of its wings. It glides under the ice for hours without a beat of its wings. It is curious about Kestrel, and very fond of frost fronds.',
  },
};

/** Europa's own scanner log entries. */
export const EUROPA_LOG: Record<string, { name: string; text: string }> = {
  eu_ice: { name: 'Under the ice', text: 'Europa. The Petrel bored down through kilometres of ice and her hab hangs here, under it, in a black ocean. No sun has ever reached this water. Far to the east, very faintly, something is singing.' },
  eu_brine: { name: 'Brine pool', text: 'A lake on the seabed: water so salty it lies under the ocean like a pool under air, with its own shimmering surface. Salt crusts its edges.' },
  eu_wall: { name: 'The thick-ice wall', text: 'The ice comes down almost to the seabed here, blue-black and very old, and a long, low passage runs under it, with a cold current pouring out. The singing comes from beyond it. A diver alone could never swim against it.' },
  eu_floes: { name: 'The floe field', text: 'Past the wall the ice is broken: floes as big as houses float on open water, with leads of black water between them, and above them a black sky with Jupiter in it, banded and enormous. You can surface here, and breathe.' },
  moth: { name: EUROPA_CREATURES.moth.name, text: EUROPA_CREATURES.moth.text },
  glasshorn: { name: EUROPA_CREATURES.glasshorn.name, text: EUROPA_CREATURES.glasshorn.text },
};

export interface EuropaData {
  /** Has Kestrel been to Europa? */
  visited: boolean;
  /** Is Kestrel on Europa right now (so a load starts there)? */
  here: boolean;
  stores: Record<EuropaMat, number>;
  /** Spot id -> play time it was taken. */
  taken: Record<string, number>;
  /** Europa log entries and glyphs read. */
  scans: string[];
  /** Europa pieces learned from glyphs, and built. */
  learned: EuropaModuleId[];
  built: EuropaModuleId[];
  /** A piece being welded: which, and 0..1. */
  welding?: { id: EuropaModuleId; progress: number };
  /** Trips made home. */
  trips: number;
  /** The floe ray (missing until Kestrel first offers it a frond). */
  ray?: RayData;
  /** Ice the crest has broken: the skylight over biome 1, and thin floes by id. */
  skylight?: boolean;
  brokenFloes?: string[];
}

export function freshEuropa(): EuropaData {
  return { visited: false, here: false, stores: { rime: 0, brine: 0, frond: 0 }, taken: {}, scans: [], learned: [], built: [], trips: 0 };
}

export function europaOf(save: SaveData): EuropaData {
  if (!save.europa) save.europa = freshEuropa();
  return save.europa;
}

/** Can the Petrel fly to Europa now? (Whole, and not already there.) */
export function canLaunch(save: SaveData): boolean {
  return petrelComplete(save) && !save.europa?.here;
}

export function isPresent(save: SaveData, spot: EuropaSpot): boolean {
  const t = save.europa?.taken[spot.id];
  return t === undefined || save.playSeconds - t >= EUROPA_REGROW;
}

/** Take a material from a spot into Europa's store (the hab keeps it: no dive bag on Europa yet). */
export function takeSpot(save: SaveData, spot: EuropaSpot): boolean {
  const e = europaOf(save);
  if (!isPresent(save, spot)) return false;
  e.taken[spot.id] = save.playSeconds;
  e.stores[spot.kind]++;
  return true;
}

export function fuelCost(save: SaveData): Partial<Record<EuropaMat, number>> {
  return save.europa?.built.includes('still') ? FUEL_COST_STILL : FUEL_COST;
}

export function canAfford(save: SaveData, cost: Partial<Record<EuropaMat, number>>): boolean {
  const s = save.europa?.stores;
  return !!s && (Object.entries(cost) as [EuropaMat, number][]).every(([k, n]) => s[k] >= n);
}

export function missingText(save: SaveData, cost: Partial<Record<EuropaMat, number>>): string {
  const s = europaOf(save).stores;
  return (Object.entries(cost) as [EuropaMat, number][])
    .filter(([k, n]) => s[k] < n)
    .map(([k, n]) => `${n - s[k]} ${(n - s[k] > 1 ? EUROPA_MAT[k].plural : EUROPA_MAT[k].name).toLowerCase()}`)
    .join(', ');
}

function pay(save: SaveData, cost: Partial<Record<EuropaMat, number>>): void {
  const s = europaOf(save).stores;
  for (const [k, n] of Object.entries(cost) as [EuropaMat, number][]) s[k] -= n;
}

/** Read a glyph: learn its piece. */
export function readGlyph(save: SaveData, g: Glyph): boolean {
  const e = europaOf(save);
  if (e.scans.includes(`glyph_${g.id}`)) return false;
  e.scans.push(`glyph_${g.id}`);
  if (g.module && !e.learned.includes(g.module)) e.learned.push(g.module);
  learnFromGlyph(save, g);
  return true;
}

/** Start welding a learned piece onto the lander (KD-1 does the welding). */
export function startModule(save: SaveData, id: EuropaModuleId): string | null {
  const e = europaOf(save);
  if (!e.learned.includes(id)) return 'Not learned yet: find its glyph in the ice.';
  if (e.built.includes(id)) return 'Already built.';
  if (e.welding) return `KD-1 is still welding the ${EUROPA_MODULES[e.welding.id].name.toLowerCase()}.`;
  const def = EUROPA_MODULES[id];
  if (!canAfford(save, def.cost)) return `Still needs ${missingText(save, def.cost)}.`;
  pay(save, def.cost);
  e.welding = { id, progress: 0 };
  return null;
}

/** Run the welding forward. Returns the piece finished this tick, if any. */
export function tickEuropa(save: SaveData, dt: number): EuropaModuleId | null {
  const w = save.europa?.welding;
  if (!w) return null;
  w.progress = Math.min(1, w.progress + dt / EUROPA_MODULES[w.id].seconds);
  if (w.progress < 1) return null;
  const e = europaOf(save);
  e.built.push(w.id);
  e.welding = undefined;
  return w.id;
}

// ---- The floe ray ----

export function rayOf(save: SaveData): RayData {
  const e = europaOf(save);
  if (!e.ray) e.ray = { trust: 0, x: RAY_HOME.x, y: RAY_HOME.y, riding: false, learned: [], gear: [] };
  return e.ray;
}
export const rayTrusts = (save: SaveData): boolean => (save.europa?.ray?.trust ?? 0) >= RAY_TRUST;
export const hasRayGear = (save: SaveData, id: RayGearId): boolean => !!save.europa?.ray?.gear.includes(id);

/** Offer the wild ray a frost frond. Returns what happened, for a message. */
export function offerFrond(save: SaveData): 'no-frond' | 'trusting' | 'trusts' | 'already' {
  const e = europaOf(save);
  const r = rayOf(save);
  if (r.trust >= RAY_TRUST) return 'already';
  if (e.stores.frond < 1) return 'no-frond';
  e.stores.frond--;
  r.trust++;
  if (r.trust < RAY_TRUST) return 'trusting';
  // Trusting Kestrel at last: Linnea thinks of a saddle.
  if (!r.learned.includes('saddle')) r.learned.push('saddle');
  if (!e.scans.includes('floeray')) e.scans.push('floeray');
  return 'trusts';
}

/** Grow a learned piece of ray gear in the hab's brine vat. */
export function startGear(save: SaveData, id: RayGearId): string | null {
  const r = rayOf(save);
  if (!r.learned.includes(id)) return 'Not learned yet.';
  if (r.gear.includes(id)) return 'Already fitted.';
  if (r.growing) return `The vat is still growing the ${RAY_GEAR[r.growing.id].name.toLowerCase()}.`;
  const def = RAY_GEAR[id];
  if (!canAfford(save, def.cost)) return `Still needs ${missingText(save, def.cost)}.`;
  pay(save, def.cost);
  r.growing = { id, progress: 0 };
  return null;
}

/** Run the vat forward; returns the gear grown (and fitted) this tick, if any. */
export function tickRayGear(save: SaveData, dt: number): RayGearId | null {
  const g = save.europa?.ray?.growing;
  if (!g) return null;
  g.progress = Math.min(1, g.progress + dt / RAY_GEAR[g.id].seconds);
  if (g.progress < 1) return null;
  const r = rayOf(save);
  r.gear.push(g.id);
  r.growing = undefined;
  return g.id;
}

/** Can the ray take Kestrel through the passage under the wall? */
export const canCrossPassage = (save: SaveData): boolean => !!save.europa?.ray?.riding && hasRayGear(save, 'bladder');
/** The passage's current (world units a second, pushing west) for whoever isn't allowed through. */
export const PASSAGE_CURRENT = 420;
export const passageSpan = PASSAGE;

/** Break thin ice with the crest: the skylight, or a thin floe. Returns true if something broke. */
export function breakIce(save: SaveData, what: 'skylight' | string): boolean {
  const e = europaOf(save);
  if (!hasRayGear(save, 'crest')) return false;
  if (what === 'skylight') {
    if (e.skylight) return false;
    e.skylight = true;
    return true;
  }
  e.brokenFloes ??= [];
  if (e.brokenFloes.includes(what)) return false;
  e.brokenFloes.push(what);
  return true;
}

/** Read a glyph that teaches ray gear (the ray must trust Kestrel first: it is gear for *his* ray). */
export function learnFromGlyph(save: SaveData, g: Glyph): void {
  if (g.gear) {
    const r = rayOf(save);
    if (!r.learned.includes(g.gear)) r.learned.push(g.gear);
  }
}

/** Fuel the Petrel and fly home. Returns why not, or null on success. */
export function flyHome(save: SaveData): string | null {
  const cost = fuelCost(save);
  if (!canAfford(save, cost)) return `The return tanks still need ${missingText(save, cost)}.`;
  pay(save, cost);
  const e = europaOf(save);
  e.here = false;
  if (e.ray) e.ray.riding = false;
  e.trips++;
  return null;
}

/** Arrive on Europa (the first time or again). */
export function arrive(save: SaveData): boolean {
  const e = europaOf(save);
  const first = !e.visited;
  e.visited = true;
  e.here = true;
  if (!e.scans.includes('eu_ice')) e.scans.push('eu_ice');
  return first;
}

/** Linnea's lines on Europa (her jar sits in the hab's window). */
export function linneaEuropa(save: SaveData): string[] {
  const e = europaOf(save);
  const r = e.ray;
  // The floe ray comes first once she has seen it.
  if (!r || r.trust === 0) {
    if (e.scans.includes('glyph_still') || e.stores.frond > 0)
      return ['There’s a big ray gliding out there, by the first pool. It keeps looking at the hab.', 'I think it smells the frost fronds. Maybe offer it one?'];
  } else if (r.trust < RAY_TRUST) return ['It came closer this time! Rays are shy.', `A few more fronds and it might let you ride (${r.trust} of ${RAY_TRUST}).`];
  else if (!r.gear.includes('saddle')) return ['It trusts you! But holding onto a fin all day…', 'Weave a saddle from the fronds in the vat: then you could gather without hopping off.'];
  else if (!r.learned.includes('bladder')) return ['That current under the big wall is far too strong to swim.', 'Ride over and look at the wall’s foot. The glyphs might know a way.'];
  else if (!r.gear.includes('bladder')) return ['An air bladder for you, on the ray’s back! Grow it in the vat.', 'Then the ray can take you right through the passage.'];
  else if (!e.scans.includes('eu_floes')) return ['The singing is louder past the wall, isn’t it?', 'Hold on tight in the passage.'];
  else if (!r.learned.includes('crest') || !r.learned.includes('gland')) return ['You saw Jupiter! I wish I could see it.', 'There were glyphs out there on the seabed, under the floes.'];
  if (!e.scans.includes('glyph_still') && !e.scans.includes('glyph_bell'))
    return ['It’s so cold. My gills are tingling!', 'The ice by the salty pools is glowing a little. Is that writing?'];
  if (e.learned.length && !e.built.length) return ['The Petrel’s heart drew a picture from the glyph!', 'If we gather enough, the drone could build it onto the hab.'];
  if (!e.scans.includes('glyph_bell')) return ['Do you hear it too? Far to the east, behind the ice.', 'There might be more glyphs where the ice hangs low.'];
  if (!canAfford(save, fuelCost(save))) return ['When you want to go home, the tanks need brine and rime.', 'Don’t worry, it all grows back near here.'];
  if (e.scans.includes('eu_floes')) return ['The singing comes from even farther away now, past the floes.', 'Wherever it is, it’s deep and dark. Your ray will want a light.'];
  return ['The singing is coming from beyond that big wall of ice.', 'Maybe the big ray could take us there?'];
}
