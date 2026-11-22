import { mulberry32 } from '../rng';
import { allKept, creatureName, SPECIES, SPECIES_ORDER } from './creatures';
import type { BookEntry, CreatureData, CreatureRequest, DecorId, SaveData, SpeciesId } from './state';
import { COLOURS, PATTERNS, RARE_COLOUR, traitsOf, WILD_PATTERNS, type Traits } from './traits';

/**
 * Phases 20 and 21: the collection book, its rewards, tank decorations,
 * Linnea's creature requests and restocking the reef. No drawing here, just
 * the rules (Node-tested in scripts/test-creature-care.mjs).
 *
 * The book has a page per species: a grid of its 4 colours × 3 glow patterns
 * (12 kinds). A kind is filled in once a creature of it has been raised:
 * hatched, or kept from the wild. Radiant shows as a gold frame on the cell.
 * Each completed row (every colour of one pattern) gives a tank decoration;
 * a completed page gives a rare egg (Colin, Nov 22, 2026: rare eggs and
 * decorations). The fourth colour only ever comes from breeding, so every
 * row asks for some breeding.
 */

export const COLOURS_PER_SPECIES = 4;
export const PATTERNS_PER_SPECIES = 3;

export function kindKey(species: SpeciesId, colour: number, pattern: number): string {
  return `${species}:${colour}:${pattern}`;
}

/** The book, created (and filled from the creatures already kept) on first use. */
export function book(save: SaveData): Record<string, BookEntry> {
  if (!save.book) {
    save.book = {};
    // Older saves: everything already kept is in the book from the start, with no fanfare.
    for (const c of allKept(save)) if (c.stage !== 'egg') record(save, c);
  }
  return save.book;
}

/** What raising this creature adds to the book (computed before it is recorded). */
export interface KindNews {
  /** A kind (colour × pattern) not in the book yet. */
  newKind: boolean;
  /** The first of this colour for its species. */
  newColour: boolean;
  /** The first of this glow pattern for its species. */
  newPattern: boolean;
  /** The first radiant one of this kind. */
  newRadiant: boolean;
  radiant: boolean;
  /** The rare colour or the bred-only third pattern. */
  rare: boolean;
}

export function kindNews(save: SaveData, c: { species: SpeciesId; id: number; traits?: Traits }): KindNews {
  const b = book(save);
  const t = traitsOf(c);
  const keys = Object.keys(b).filter((k) => k.startsWith(`${c.species}:`));
  const has = (pred: (col: number, pat: number) => boolean) =>
    keys.some((k) => {
      const [, col, pat] = k.split(':').map(Number);
      return pred(col, pat);
    });
  const entry = b[kindKey(c.species, t.colour, t.pattern)];
  return {
    newKind: !entry,
    newColour: !has((col) => col === t.colour),
    newPattern: !has((_, pat) => pat === t.pattern),
    newRadiant: !!t.radiant && !entry?.radiant,
    radiant: !!t.radiant,
    rare: t.colour === RARE_COLOUR || t.pattern >= WILD_PATTERNS,
  };
}

/**
 * How big the hatching moment is (Colin: scaled by rarity). Every egg gets a short
 * reveal ('reveal'); a first-ever colour or pattern, or a radiant baby, gets a reward
 * card: 'notable', or 'major' when it is also rare (the rare colour, the third pattern)
 * or the first radiant of its kind.
 */
export function hatchTier(n: KindNews): 'reveal' | 'notable' | 'major' {
  if (n.newRadiant || ((n.newColour || n.newPattern) && n.rare)) return 'major';
  if (n.newColour || n.newPattern || n.radiant) return 'notable';
  return 'reveal';
}

/** Put a raised creature in the book. Returns its news (all false when nothing changed). */
export function record(save: SaveData, c: CreatureData): KindNews {
  const b = (save.book ??= {});
  const n = kindNews(save, c);
  const t = traitsOf(c);
  const k = kindKey(c.species, t.colour, t.pattern);
  if (!b[k]) b[k] = { src: (t.gen ?? 1) >= 2 ? 'bred' : 'wild', gen: t.gen ?? 1, t: Math.round(save.playSeconds), ...(t.radiant ? { radiant: true } : {}) };
  else if (t.radiant) b[k].radiant = true;
  return n;
}

/** Record every kept creature that has hatched (a cheap sweep each second): returns the newly recorded ones. */
export function sweepBook(save: SaveData): CreatureData[] {
  const out: CreatureData[] = [];
  const b = book(save);
  for (const c of allKept(save)) {
    if (c.stage === 'egg') continue;
    const t = traitsOf(c);
    const e = b[kindKey(c.species, t.colour, t.pattern)];
    if (e && (!t.radiant || e.radiant)) continue;
    record(save, c);
    out.push(c);
  }
  return out;
}

/** One species' page: which cells are filled, and which rows. */
export function pageOf(save: SaveData, species: SpeciesId): { cells: (BookEntry | null)[][]; rows: boolean[]; filled: number; complete: boolean; radiant: number } {
  const b = book(save);
  const cells = [...Array(PATTERNS_PER_SPECIES)].map((_, p) => [...Array(COLOURS_PER_SPECIES)].map((_, c) => b[kindKey(species, c, p)] ?? null));
  const rows = cells.map((r) => r.every(Boolean));
  const filled = cells.flat().filter(Boolean).length;
  const radiant = cells.flat().filter((e) => e?.radiant).length;
  return { cells, rows, filled, complete: filled === COLOURS_PER_SPECIES * PATTERNS_PER_SPECIES, radiant };
}

// ---- Decorations ----
export const DECOR: Record<DecorId, { name: string; line: string }> = {
  arch: { name: 'Stone arch', line: 'A weathered arch of reef stone to swim through.' },
  amphora: { name: 'Old amphora', line: 'A clay jar from an ancient wreck, crusted with tiny shells.' },
  helmet: { name: 'Brass dive helmet', line: 'An old diver’s helmet; small creatures love its portholes.' },
  chest: { name: 'Sea chest', line: 'A barnacled chest whose lid lifts with a puff of bubbles.' },
  driftwood: { name: 'Driftwood branch', line: 'A silvered branch, smooth from years at sea.' },
  clam: { name: 'Giant clam shell', line: 'An empty clam shell, pearly inside.' },
  lantern: { name: 'Ship’s lantern', line: 'A ship’s lantern that glows a soft warm amber.' },
  wheel: { name: 'Ship’s wheel', line: 'A wooden wheel from a lost ship, half sunk in the sand.' },
};
export const DECOR_ORDER: DecorId[] = ['arch', 'clam', 'amphora', 'driftwood', 'helmet', 'lantern', 'chest', 'wheel'];

export function addDecor(save: SaveData, d: DecorId, n = 1): void {
  (save.decor ??= {})[d] = (save.decor[d] ?? 0) + n;
}

/** Place a decoration from storage into a tank. Null when done, or why not. */
export function placeDecor(save: SaveData, tankId: number, d: DecorId, slots: number): string | null {
  if ((save.decor?.[d] ?? 0) <= 0) return 'You have none of those to place';
  const td = save.tankData[String(tankId)];
  if (!td) return 'No such tank';
  const list = (td.decor ??= []);
  if (list.length >= slots) return `This tank has room for ${slots} decorations`;
  save.decor![d]! -= 1;
  list.push(d);
  return null;
}
/** Take a decoration back out of a tank, into storage. */
export function removeDecor(save: SaveData, tankId: number, index: number): boolean {
  const list = save.tankData[String(tankId)]?.decor;
  if (!list || !list[index]) return false;
  addDecor(save, list[index]);
  list.splice(index, 1);
  return true;
}

// ---- Rewards (rows, pages and requests) ----
/** A rare egg waits at the Hatchery until it is warmed in a cradle, put in a tank or carried. */
export function giftEgg(save: SaveData, species: SpeciesId, t: { colour: number; pattern: number; radiant?: boolean }): CreatureData {
  const egg: CreatureData = {
    id: save.nextCreatureId++,
    species,
    tank: -1,
    stage: 'egg',
    growth: 0,
    fed: 0.8,
    comfort: 0.5,
    sickness: 0,
    make: 0,
    traits: { colour: t.colour, pattern: t.pattern, radiant: t.radiant || undefined, gen: 2 },
  };
  (save.gifts ??= []).push(egg);
  return egg;
}

export type Reward = CreatureRequest['reward'];

/** Apply a reward. Returns a short line for the reward card. */
export function giveReward(save: SaveData, r: Reward): string {
  if (r.kind === 'decor') {
    addDecor(save, r.decor);
    return `${DECOR[r.decor].name}: place it at a Habitat console`;
  }
  if (r.kind === 'display') {
    if (!save.blueprints.includes('display')) save.blueprints.push('display');
    return 'Display aquarium plans: the Workshop can build a display refit for a Grand tank';
  }
  giftEgg(save, r.species, r);
  return `A rare ${SPECIES[r.species].name.toLowerCase()} egg (${kindName(r.species, r.colour, r.pattern, r.radiant)}) waits at the Hatchery`;
}

export interface BookReward {
  id: string;
  title: string;
  line: string;
  page: boolean;
}

/** Give the reward for every newly completed row and page (once each). */
export function claimBookRewards(save: SaveData): BookReward[] {
  const out: BookReward[] = [];
  const claimed = (save.bookClaimed ??= []);
  for (const sp of SPECIES_ORDER) {
    const pg = pageOf(save, sp);
    pg.rows.forEach((done, p) => {
      const id = `row:${sp}:${p}`;
      if (!done || claimed.includes(id)) return;
      claimed.push(id);
      const d = DECOR_ORDER[claimed.filter((x) => x.startsWith('row:')).length % DECOR_ORDER.length];
      const line = giveReward(save, { kind: 'decor', decor: d });
      out.push({ id, title: `${SPECIES[sp].name}: every ${PATTERNS[sp][p]} colour`, line, page: false });
    });
    const id = `page:${sp}`;
    if (pg.complete && !claimed.includes(id)) {
      claimed.push(id);
      const line = giveReward(save, { kind: 'egg', species: sp, colour: RARE_COLOUR, pattern: 2, radiant: true });
      out.push({ id, title: `${SPECIES[sp].name} page complete`, line, page: true });
    }
  }
  return out;
}

/** "Moss ray, ring glow" style name of a kind. */
export function kindName(species: SpeciesId, colour?: number, pattern?: number, radiant?: boolean): string {
  const bits = [radiant ? 'radiant' : '', colour !== undefined ? COLOURS[species][colour].toLowerCase() : '', SPECIES[species].name.toLowerCase()].filter(Boolean).join(' ');
  return pattern !== undefined ? `${bits}, ${PATTERNS[species][pattern]}` : bits;
}

// ---- Phase 21: Linnea's creature requests ----
/** How many requests she has open at once. They have no time limit (Colin). */
export const REQUESTS_OPEN = 2;
/** The request whose reward is the display aquarium plans (her third). */
export const DISPLAY_REQUEST = 3;

/** Requests open once something has been bred (she has heard about the Hatchery). */
export function requestsOpen(save: SaveData): boolean {
  return Object.values(book(save)).some((e) => e.src === 'bred') || allKept(save).some((c) => (traitsOf(c).gen ?? 1) >= 2);
}

/** Species she might ask about: ones you keep (or have raised). */
function knownSpecies(save: SaveData): SpeciesId[] {
  const b = book(save);
  return SPECIES_ORDER.filter((sp) => Object.keys(b).some((k) => k.startsWith(`${sp}:`)));
}

/** Make her next request (deterministic for a save, so a reload doesn't reshuffle it). */
export function makeRequest(save: SaveData): CreatureRequest | null {
  const reqs = (save.requests ??= { active: [], done: 0, nextId: 1 });
  const known = knownSpecies(save);
  if (!known.length) return null;
  const n = reqs.done + reqs.active.length;
  const r = mulberry32(reqs.nextId * 7919 + n * 104729 + 11);
  const b = book(save);
  const taken = new Set(reqs.active.map((q) => `${q.species}:${q.colour}:${q.pattern}`));
  // Prefer a kind the book is missing (a real goal); the first two ask for something gentle.
  const options: { species: SpeciesId; colour: number; pattern: number }[] = [];
  for (const sp of known)
    for (let p = 0; p < PATTERNS_PER_SPECIES; p++)
      for (let c = 0; c < COLOURS_PER_SPECIES; c++) {
        if (b[kindKey(sp, c, p)] || taken.has(`${sp}:${c}:${p}`)) continue;
        const hard = (c === RARE_COLOUR ? 1 : 0) + (p >= WILD_PATTERNS ? 1 : 0);
        if (n < 2 && hard > 1) continue;
        options.push({ species: sp, colour: c, pattern: p });
      }
  const radiantAsk = n >= 4 && r() < 0.35;
  let pick: { species: SpeciesId; colour?: number; pattern?: number; radiant?: boolean };
  if (options.length && !radiantAsk) pick = options[Math.floor(r() * options.length)];
  else {
    // Everything collected (or a radiant ask): a radiant one of a species you know.
    const sp = known[Math.floor(r() * known.length)];
    pick = { species: sp, pattern: Math.floor(r() * PATTERNS_PER_SPECIES), radiant: true };
  }
  const number = n + 1;
  let reward: Reward;
  if (number === DISPLAY_REQUEST && !save.blueprints.includes('display')) reward = { kind: 'display' };
  else if (number % 2 === 0) {
    const sp = known[Math.floor(r() * known.length)];
    const rare = r() < 0.5;
    reward = { kind: 'egg', species: sp, colour: rare ? RARE_COLOUR : Math.floor(r() * 3), pattern: rare ? Math.floor(r() * 2) : 2, radiant: number >= 6 && r() < 0.5 ? true : undefined };
  } else reward = { kind: 'decor', decor: DECOR_ORDER[(number * 3) % DECOR_ORDER.length] };
  const req: CreatureRequest = { id: reqs.nextId++, ...pick, reward };
  reqs.active.push(req);
  return req;
}

/** Top up her open requests. Returns the new ones (she mentions them when Kestrel talks to her). */
export function topUpRequests(save: SaveData): CreatureRequest[] {
  if (!requestsOpen(save)) return [];
  const reqs = (save.requests ??= { active: [], done: 0, nextId: 1 });
  const out: CreatureRequest[] = [];
  while (reqs.active.length < REQUESTS_OPEN) {
    const q = makeRequest(save);
    if (!q) break;
    out.push(q);
  }
  return out;
}

export function matchesRequest(q: CreatureRequest, species: SpeciesId, t: Traits): boolean {
  return species === q.species && (q.colour === undefined || t.colour === q.colour) && (q.pattern === undefined || t.pattern === q.pattern) && (!q.radiant || !!t.radiant);
}

/** What she asks for, in her words. */
export function requestText(q: CreatureRequest): string {
  return kindName(q.species, q.colour, q.pattern, q.radiant);
}
export function rewardText(r: Reward): string {
  if (r.kind === 'decor') return DECOR[r.decor].name.toLowerCase();
  if (r.kind === 'display') return 'plans for a display aquarium';
  return `a rare ${SPECIES[r.species].name.toLowerCase()} egg`;
}

/**
 * Show her a creature carried in the jar or satchel (the creature stays yours). The first
 * open request it matches is fulfilled and its reward given. Null if none match.
 */
export function showToLinnea(save: SaveData): { req: CreatureRequest; who: string; line: string } | null {
  const reqs = save.requests;
  if (!reqs?.active.length) return null;
  for (const j of [save.jar, save.jar2]) {
    if (!j || j.stage === 'egg') continue;
    const t = j.keep ? traitsOf(j.keep) : j.traits;
    if (!t) continue;
    const q = reqs.active.find((x) => matchesRequest(x, j.species, t));
    if (!q) continue;
    reqs.active = reqs.active.filter((x) => x.id !== q.id);
    reqs.done++;
    const line = giveReward(save, q.reward);
    return { req: q, who: j.keep ? `${creatureName(j.keep)} the ${SPECIES[j.species].name.toLowerCase()}` : `the ${SPECIES[j.species].name.toLowerCase()}`, line };
  }
  return null;
}

// ---- Phase 21: restocking the reef ----
/** Up to this many bred looks per species turn up in the wild. */
export const RESTOCK_KEEP = 4;

/** A bred creature let go: its looks turn up in the wild from now on. True if this is new. */
export function restock(save: SaveData, species: SpeciesId, t: Traits | undefined): boolean {
  if (!t || (t.gen ?? 1) < 2) return false;
  const list = ((save.restocked ??= {})[species] ??= []);
  if (list.some((x) => x.colour === t.colour && x.pattern === t.pattern && !!x.radiant === !!t.radiant)) return false;
  list.push(t.radiant ? { colour: t.colour, pattern: t.pattern, radiant: true, gen: 1 } : { colour: t.colour, pattern: t.pattern, gen: 1 });
  if (list.length > RESTOCK_KEEP) list.shift();
  return true;
}

/**
 * The looks the i-th wild creature of a species shows: a restocked one for every other
 * creature (so the wild keeps its own kinds too), or null for its natural looks.
 */
export function restockedLook(save: SaveData, species: SpeciesId, i: number): Traits | null {
  const list = save.restocked?.[species];
  if (!list?.length || i % 2 === 1) return null;
  const pick = list[(i / 2) % list.length];
  return pick ? { ...pick, gen: 1 } : null;
}

/** "a moss ray" / "an amber shrimp". */
export function an(phrase: string): string {
  return `${/^[aeiou]/i.test(phrase) ? 'an' : 'a'} ${phrase}`;
}
