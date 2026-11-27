import { BRINE_POOLS, ceilY, floorY } from '../world/europaTerrain';
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
  return s;
})();

/** The Choir kin's ice glyphs: read one (hold Collect) and the Petrel's core learns a Europa piece. */
export interface Glyph {
  id: 'still' | 'bell';
  x: number;
  y: number;
  /** The piece it teaches. */
  module: EuropaModuleId;
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

/** Fuel for one trip home, before and after the Brine still. */
// Never stranded: the four brine spots at the two pools nearest the hab pay for a trip (checked in scripts/test-europa.mjs).
export const FUEL_COST: Partial<Record<EuropaMat, number>> = { brine: 4, rime: 3 };
export const FUEL_COST_STILL: Partial<Record<EuropaMat, number>> = { brine: 2, rime: 2 };

/** Europa's two creatures in the first biome (scanned, not yet raised: a cold tank comes later). */
export type EuropaSpecies = 'moth' | 'glasshorn';
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
};

/** Europa's own scanner log entries. */
export const EUROPA_LOG: Record<string, { name: string; text: string }> = {
  eu_ice: { name: 'Under the ice', text: 'Europa. The Petrel bored down through kilometres of ice and her hab hangs here, under it, in a black ocean. No sun has ever reached this water. Far to the east, very faintly, something is singing.' },
  eu_brine: { name: 'Brine pool', text: 'A lake on the seabed: water so salty it lies under the ocean like a pool under air, with its own shimmering surface. Salt crusts its edges.' },
  eu_wall: { name: 'The thick-ice wall', text: 'The ice comes down to the seabed here, blue-black and very old. The singing comes from beyond it. You will need a new way to travel to get past.' },
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
  if (!e.learned.includes(g.module)) e.learned.push(g.module);
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

/** Fuel the Petrel and fly home. Returns why not, or null on success. */
export function flyHome(save: SaveData): string | null {
  const cost = fuelCost(save);
  if (!canAfford(save, cost)) return `The return tanks still need ${missingText(save, cost)}.`;
  pay(save, cost);
  const e = europaOf(save);
  e.here = false;
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
  if (!e.scans.includes('glyph_still') && !e.scans.includes('glyph_bell'))
    return ['It’s so cold. My gills are tingling!', 'The ice by the salty pools is glowing a little. Is that writing?'];
  if (e.learned.length && !e.built.length) return ['The Petrel’s heart drew a picture from the glyph!', 'If we gather enough, the drone could build it onto the hab.'];
  if (!e.scans.includes('glyph_bell')) return ['Do you hear it too? Far to the east, behind the ice.', 'There might be more glyphs where the ice hangs low.'];
  if (!canAfford(save, fuelCost(save))) return ['When you want to go home, the tanks need brine and rime.', 'Don’t worry, it all grows back near here.'];
  return ['The singing is coming from beyond that big wall of ice.', 'We’ll need some new way to travel to get there, I think.'];
}
