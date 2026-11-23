import { addDecor, DECOR, giftEgg, matchesRequest } from './collection';
import { creatureName, SPECIES, SPECIES_ORDER, tankDataFor } from './creatures';
import type { CreatureData, DecorId, MaterialId, SaveData, SpeciesId } from './state';
import { isRare, isUncommon, traitsOf } from './traits';

/**
 * Kestrel Supply Buoy — Research Exchange & Survey Credits (Colin, Nov 23, 2026).
 *
 * Pure, Node-testable rules for offloading surplus raised creatures to partner
 * marine sanctuaries in exchange for Survey Credits (SC), then spending Credits on
 * exclusive tank decorations, Rich Kelp Tonic (breeding boost), rare supplies,
 * Echo whorls, and mystery rare eggs.
 */

/** World X of the floating Supply Buoy, just east of the base, Linnea, and the Choir portal. */
export const SUPPLY_BUOY_X = 2060;
/** How long one dose of Rich Kelp Tonic boosts a tank (15 minutes of play time). */
export const TONIC_SECONDS = 900;
/** Cost of one dose of Rich Kelp Tonic in Survey Credits. */
export const TONIC_COST = 45;
/** Cost of a mystery rare egg for a discovered species. */
export const MYSTERY_EGG_COST = 110;

export interface ExchangeDecorOffer {
  id: DecorId;
  cost: number;
}

export const EXCHANGE_DECOR: readonly ExchangeDecorOffer[] = [
  { id: 'cairn', cost: 40 },
  { id: 'floats', cost: 55 },
  { id: 'anchor', cost: 65 },
  { id: 'bell', cost: 70 },
  { id: 'coralarch', cost: 85 },
  { id: 'astrolabe', cost: 95 },
  { id: 'belljar', cost: 110 },
  { id: 'kelplantern', cost: 120 },
];

export interface ExchangeSupplyOffer {
  id: 'plating' | 'brass' | 'bloom' | 'whorl';
  name: string;
  line: string;
  cost: number;
  mat?: MaterialId;
  qty?: number;
}

export const EXCHANGE_SUPPLIES: readonly ExchangeSupplyOffer[] = [
  { id: 'brass', name: 'Brass fittings ×4', line: 'Salvaged marine brass delivered straight to base storage.', cost: 50, mat: 'brass', qty: 4 },
  { id: 'plating', name: 'Hull plating ×4', line: 'Pressed hull plates delivered straight to base storage.', cost: 55, mat: 'plate', qty: 4 },
  { id: 'bloom', name: 'Glowing bloom ×1', line: 'A deep-water bloom for the Revival pool, delivered to storage.', cost: 65, mat: 'bloom', qty: 1 },
  { id: 'whorl', name: 'Echo whorl ×1', line: 'An acoustic whorl to double a tank or machine’s output.', cost: 140 },
];

export function creditsOf(save: SaveData): number {
  return Math.max(0, Math.floor(save.credits ?? 0));
}

export function spendCredits(save: SaveData, cost: number): boolean {
  if (creditsOf(save) < cost) return false;
  save.credits = creditsOf(save) - cost;
  return true;
}

/** Survey Credits paid when dispatching this creature to partner sanctuaries. */
export function creatureValue(c: CreatureData): number {
  if (c.stage === 'egg') return 0;
  const tr = traitsOf(c);
  let base = 15;
  if (tr.choir) base = 350;
  else if (tr.heirloom) base = 220;
  else if (tr.radiant && isRare(tr)) base = 165;
  else if (tr.radiant) base = 120;
  else if (isRare(tr)) base = 75;
  else if (isUncommon(tr)) base = 35;
  return c.stage === 'young' ? Math.max(8, Math.round(base * 0.5)) : base;
}

/** True when Rich Kelp Tonic is actively boosting breeding in this tank. */
export function tonicActive(save: SaveData, tankId: number): boolean {
  const until = save.tankData[String(tankId)]?.tonicUntil ?? 0;
  return until > save.playSeconds;
}

/** Remaining seconds of Rich Kelp Tonic on this tank (0 when inactive). */
export function tonicRemaining(save: SaveData, tankId: number): number {
  const until = save.tankData[String(tankId)]?.tonicUntil ?? 0;
  return Math.max(0, Math.ceil(until - save.playSeconds));
}

/** Dispatch one creature from any tank or the Reserve for Survey Credits. */
export function dispatchCreature(save: SaveData, creatureId: number): { ok: true; earned: number; name: string; species: SpeciesId } | { ok: false; why: string } {
  const fromTanks = save.creatures.findIndex((c) => c.id === creatureId);
  const fromRes = fromTanks < 0 ? (save.reserve ?? []).findIndex((c) => c.id === creatureId) : -1;
  const c = fromTanks >= 0 ? save.creatures[fromTanks] : fromRes >= 0 ? save.reserve![fromRes] : null;
  if (!c) return { ok: false, why: 'Creature not found' };
  if (c.stage === 'egg') return { ok: false, why: 'Eggs cannot be dispatched yet' };
  const earned = creatureValue(c);
  if (fromTanks >= 0) save.creatures.splice(fromTanks, 1);
  else save.reserve!.splice(fromRes, 1);
  save.credits = creditsOf(save) + earned;
  return { ok: true, earned, name: creatureName(c), species: c.species };
}

/**
 * Find surplus grown common creatures that are safe to batch-dispatch:
 * - strictly common (no rare/uncommon/radiant/heirloom/Choir traits);
 * - does not match any of Linnea's active requests;
 * - always keeps at least 2 of each species (protecting breeding pairs)
 *   and at least 1 of each (species, colour, pattern) look;
 * - prefers dispatching from the Reserve first, then tanks.
 */
export function duplicateCommonIds(save: SaveData): { ids: number[]; totalCredits: number } {
  const reserve = save.reserve ?? [];
  const all = [...save.creatures, ...reserve].filter((c) => c.stage !== 'egg');
  const speciesCounts = new Map<SpeciesId, number>();
  const lookCounts = new Map<string, number>();
  for (const c of all) {
    speciesCounts.set(c.species, (speciesCounts.get(c.species) ?? 0) + 1);
    const tr = traitsOf(c);
    const lk = `${c.species}:${tr.colour}:${tr.pattern}`;
    lookCounts.set(lk, (lookCounts.get(lk) ?? 0) + 1);
  }
  const reqs = save.requests?.active ?? [];
  // Prefer Reserve creatures first, then tank creatures.
  const candidates = [...reserve, ...save.creatures];
  const ids: number[] = [];
  let totalCredits = 0;
  for (const c of candidates) {
    if (c.stage !== 'grown') continue;
    const tr = traitsOf(c);
    if (tr.choir || tr.heirloom || tr.radiant || isRare(tr) || isUncommon(tr)) continue;
    if (reqs.some((q) => matchesRequest(q, c.species, tr))) continue;
    const spCount = speciesCounts.get(c.species) ?? 0;
    const lk = `${c.species}:${tr.colour}:${tr.pattern}`;
    const lkCount = lookCounts.get(lk) ?? 0;
    if (spCount <= 2 || lkCount <= 1) continue;
    speciesCounts.set(c.species, spCount - 1);
    lookCounts.set(lk, lkCount - 1);
    ids.push(c.id);
    totalCredits += creatureValue(c);
  }
  return { ids, totalCredits };
}

/** Batch-dispatch all safe duplicate common adults in one tap. */
export function dispatchDuplicateCommons(save: SaveData): { count: number; earned: number } {
  const { ids } = duplicateCommonIds(save);
  let count = 0;
  let earned = 0;
  for (const id of ids) {
    const res = dispatchCreature(save, id);
    if (res.ok) {
      count += 1;
      earned += res.earned;
    }
  }
  return { count, earned };
}

/** Buy an exclusive decoration from the Supply Buoy. */
export function buyExchangeDecor(save: SaveData, id: DecorId): string | null {
  const offer = EXCHANGE_DECOR.find((o) => o.id === id);
  if (!offer) return 'Unknown decoration';
  if (!spendCredits(save, offer.cost)) return `Needs ${offer.cost} SC`;
  addDecor(save, id, 1);
  return null;
}

/** Buy a Rich Kelp Tonic and apply it immediately to a tank. */
export function applyTonic(save: SaveData, tankId: number): string | null {
  if (!spendCredits(save, TONIC_COST)) return `Needs ${TONIC_COST} SC`;
  const td = tankDataFor(save, tankId);
  td.tonicUntil = Math.max(td.tonicUntil ?? 0, save.playSeconds) + TONIC_SECONDS;
  return null;
}

/** Buy a supply crate or Echo whorl from the Supply Buoy. */
export function buySupply(save: SaveData, id: ExchangeSupplyOffer['id']): string | null {
  const offer = EXCHANGE_SUPPLIES.find((o) => o.id === id);
  if (!offer) return 'Unknown supply';
  if (!spendCredits(save, offer.cost)) return `Needs ${offer.cost} SC`;
  if (offer.id === 'whorl') {
    let n = 1;
    while (save.whorls.includes(`exchange:${n}`)) n++;
    save.whorls.push(`exchange:${n}`);
  } else if (offer.mat && offer.qty) {
    save.stored[offer.mat] = (save.stored[offer.mat] ?? 0) + offer.qty;
  }
  return null;
}

/** Discovered species eligible for a Mystery Rare Egg. */
export function discoveredSpecies(save: SaveData): SpeciesId[] {
  return SPECIES_ORDER.filter((sp) =>
    save.scans.includes(SPECIES[sp].scan)
    || Object.keys(save.book ?? {}).some((k) => k.startsWith(`${sp}:`)),
  );
}

/** Buy a Mystery Rare Egg (rare colour, bred-only pattern, or radiant) for a discovered species. */
export function buyMysteryEgg(save: SaveData, species: SpeciesId, rand = Math.random): { ok: true; egg: CreatureData } | { ok: false; why: string } {
  if (!discoveredSpecies(save).includes(species)) return { ok: false, why: 'Discover this species first' };
  if (!spendCredits(save, MYSTERY_EGG_COST)) return { ok: false, why: `Needs ${MYSTERY_EGG_COST} SC` };
  // Rare colour or bred-only pattern, with a 40% chance of radiant!
  const colour = rand() < 0.65 ? 3 : Math.floor(rand() * 4);
  const pattern = rand() < 0.65 ? 2 : Math.floor(rand() * 3);
  const radiant = rand() < 0.4;
  const egg = giftEgg(save, species, { colour, pattern, radiant });
  return { ok: true, egg };
}

export function decorLabel(id: DecorId): string {
  return DECOR[id]?.name ?? id;
}
