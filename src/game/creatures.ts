import { BaseLayout, isDone, Placed } from './base';
import { CreatureData, MaterialId, MATERIAL_ORDER, MATERIALS, PlantId, SaveData, SpeciesId, TankData } from './state';
import { EAT_BELOW, MASH_FED, TRAY_CAP, trayCount, whorlMult } from './factory';

/**
 * Creature care (milestone 4). No drawing here, just the rules.
 *
 * Creatures are collected young (or as eggs) in the specimen jar and put in
 * a creature tank at the base. Each one has three needs, all 0..1 where 1 is
 * best, as DESIGN.md asks:
 *  - Fed: drops slowly; kelp flakes (1 kelp fibre per feed) fill it.
 *  - Comfort: what the tank is like for this species (its favourite plant,
 *    the right company, no tank-mate it dislikes, power, not overcrowded).
 *    It drifts towards that over about a minute.
 *  - Water quality: shared by the tank; every creature dirties it, a filter
 *    pump joined to the tank keeps it clean, and Clean tank scrubs it by hand.
 *
 * A creature whose needs stay met grows up, glows brighter and then makes a
 * material for the base now and then. If a need stays very low it gets sick
 * (visibly pale and slow), and if that lasts it goes dormant: its remains are
 * kept in storage until a Revival pool is found (DESIGN.md, Creature care).
 *
 * Everything runs on play time, like regrowing materials, so closing the app
 * never lets anything starve.
 */

export interface SpeciesDef {
  id: SpeciesId;
  name: string;
  /** Name of the young (or egg clutch) in the jar. */
  youngName: string;
  eggName: string;
  /** Where it lives in the wild. */
  home: string;
  plant: PlantId;
  /**
   * 'same': likes others of its kind. 'any': likes any tank-mate. 'space':
   * prefers to be alone. 'clients' (milestone 7, the lantern shrimp): content
   * when it has another species to clean.
   */
  company: 'same' | 'any' | 'space' | 'clients';
  dislikes: SpeciesId[];
  makes: MaterialId;
  makesText: string;
  /** Scanner log id needed before the diver knows how to collect and keep it. */
  scan: string;
}

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  glowfin: {
    id: 'glowfin',
    name: 'Glowfin',
    youngName: 'glowfin fry',
    eggName: 'glowfin egg clutch',
    home: 'the dark grotto under the ledge',
    plant: 'coral',
    company: 'same',
    dislikes: ['puffcap'],
    makes: 'quartz',
    makesText: 'nibbles crystal grit off the tank rocks and leaves clean quartz',
    scan: 'glowfin',
  },
  puffcap: {
    id: 'puffcap',
    name: 'Puffcap',
    youngName: 'young puffcap',
    eggName: 'puffcap polyp',
    home: 'the open water over the drop-off',
    plant: 'kelp',
    company: 'space',
    dislikes: ['crab'],
    makes: 'fibre',
    makesText: 'sheds tough threads from its frill that twist into kelp fibre',
    scan: 'puffcap',
  },
  ray: {
    id: 'ray',
    name: 'Dapple ray',
    youngName: 'young dapple ray',
    eggName: 'dapple ray egg case',
    home: 'the seagrass meadow on the east plateau',
    plant: 'grass',
    company: 'any',
    dislikes: [],
    makes: 'copper',
    makesText: 'sifts the tank sand and turns up copper grit',
    scan: 'ray',
  },
  // Milestone 7: the kelp forest. Curious but wary (DESIGN.md, Art direction).
  crab: {
    id: 'crab',
    name: 'Tinker crab',
    youngName: 'young tinker crab',
    eggName: 'tinker crab egg sponge',
    home: 'the holdfasts of the kelp forest',
    plant: 'bladder',
    company: 'any',
    dislikes: [],
    makes: 'scrap',
    makesText: 'picks rust flakes and metal grit off its shell and the tank frame, and drops them as scrap',
    scan: 'crab',
  },
  shrimp: {
    id: 'shrimp',
    name: 'Lantern shrimp',
    youngName: 'young lantern shrimp',
    eggName: 'lantern shrimp eggs',
    home: 'the shaded rock of the kelp forest',
    plant: 'lumen',
    company: 'clients',
    dislikes: [],
    makes: 'moss',
    makesText: 'grazes the tank glass and leaves tufts of lumen moss',
    scan: 'shrimp',
  },
};
export const SPECIES_ORDER: SpeciesId[] = ['glowfin', 'puffcap', 'ray', 'crab', 'shrimp'];

/**
 * Pairings (milestone 7; DESIGN.md, mixed tanks). Clashes: puffcap threads
 * sting glowfins, and tinker crabs snip puffcap ribbons. The lantern shrimp
 * is a cleaner: every tank-mate of another species makes more, and its tank
 * fouls more slowly.
 */
export const CLASH_TEXT: Partial<Record<SpeciesId, (other: string) => string>> = {
  glowfin: (o) => `Stung by the ${o}'s threads`,
  puffcap: (o) => `Ribbons snipped by the ${o}`,
};
/** Each cleaning lantern shrimp adds this much to a tank-mate's output (another species only)... */
export const CLEAN_BONUS = 0.25;
/** ...and the tank fouls this much more slowly with a shrimp in it. */
export const SHRIMP_CLEAN_WATER = 0.35;

export const PLANTS: Record<PlantId, { name: string; cost: Partial<Record<MaterialId, number>>; scan: string }> = {
  coral: { name: 'Branch coral', cost: { quartz: 1 }, scan: 'coral' },
  kelp: { name: 'Ribbon kelp', cost: { fibre: 1 }, scan: 'kelp' },
  grass: { name: 'Seagrass', cost: { fibre: 1 }, scan: 'grass' },
  bladder: { name: 'Bladder kelp', cost: { resin: 1 }, scan: 'bladder' },
  lumen: { name: 'Lumen moss', cost: { moss: 1 }, scan: 'lumen' },
};
export const PLANT_ORDER: PlantId[] = ['coral', 'kelp', 'grass', 'bladder', 'lumen'];

/** Creatures per tank (eggs count too). */
export const TANK_CAPACITY = 4;
/** Tanks one filter pump can keep clean. */
export const TANKS_PER_FILTER = 2;
/** Kelp fibre per feed (it is ground into flakes). */
export const FEED_COST: MaterialId = 'fibre';

// Rates, per second of play. Single numbers, easy to tune after Colin plays.
/** Full to empty in 15 minutes. */
export const HUNGER_RATE = 1 / 900;
/** How much one feed adds. */
export const FEED_AMOUNT = 0.6;
/** Each creature dirties its tank this fast: one alone takes 20 minutes, four take 5. */
export const DIRT_RATE = 1 / 1200;
/** A filter pump cleans at this rate (much faster than four creatures dirty it). */
export const FILTER_RATE = 1 / 150;
/** One Clean tank scrub. */
export const CLEAN_AMOUNT = 0.4;
/** Below this, a need makes the creature sick. */
export const SICK_BELOW = 0.25;
/** Sick this long without help and it goes dormant (6 minutes). */
export const SICK_SECONDS = 360;
/** Needs at or above this let it grow and make materials. */
export const HAPPY_AT = 0.6;
/** Young to grown, with needs met (8 minutes). */
export const GROW_SECONDS = 480;
/** Egg to young, in any tank (90 seconds). */
export const HATCH_SECONDS = 90;
/** A grown, happy creature makes one material this often (4 minutes), before bonuses. */
export const MAKE_SECONDS = 240;
/**
 * Milestone 5: output scales with how many happy creatures and tanks the
 * base has. Each happy tank-mate adds this much (a shoal works together)...
 */
export const SHOAL_BONUS = 0.15;
/** ...and each other thriving tank in the base adds this much (a healthy reef), */
export const REEF_BONUS = 0.1;
/** up to this. A tank thrives with at least two grown, happy creatures. */
export const REEF_MAX = 0.5;

/** Is this creature happy enough to grow and make things? */
export function isHappy(save: SaveData, c: CreatureData): boolean {
  return c.stage !== 'egg' && c.sickness === 0 && worstNeed(save, c).value >= HAPPY_AT;
}

/** Tanks with at least two grown, happy creatures. */
export function thrivingTanks(save: SaveData, layout: BaseLayout): Set<number> {
  const out = new Set<number>();
  for (const t of tanks(layout)) if (creaturesIn(save, t.id).filter((c) => c.stage === 'grown' && isHappy(save, c)).length >= 2) out.add(t.id);
  return out;
}

/**
 * How fast a grown creature makes its material, in items per minute, and
 * the parts of that number for the readouts. Zero unless it is happy.
 */
export function makeRate(
  save: SaveData,
  layout: BaseLayout,
  c: CreatureData,
  thriving = thrivingTanks(save, layout),
): { perMin: number; shoal: number; reef: number; whorl: number; clean: number } {
  const happyMates = creaturesIn(save, c.tank).filter((m) => m.id !== c.id && isHappy(save, m));
  const mates = happyMates.length;
  const shoal = SHOAL_BONUS * mates;
  // Milestone 7: lantern shrimp clean their tank-mates of other species.
  const clean = c.species === 'shrimp' ? 0 : CLEAN_BONUS * happyMates.filter((m) => m.species === 'shrimp').length;
  const reef = Math.min(REEF_MAX, REEF_BONUS * (thriving.size - (thriving.has(c.tank) ? 1 : 0)));
  const whorl = whorlMult(save, c.tank);
  const base = c.stage === 'grown' && isHappy(save, c) ? 60 / MAKE_SECONDS : 0;
  return { perMin: base * (1 + shoal + clean) * (1 + reef) * whorl, shoal, reef, whorl, clean };
}

export function tankDataFor(save: SaveData, tankId: number): TankData {
  const k = String(tankId);
  if (!save.tankData[k]) save.tankData[k] = { water: 1, plant: null };
  return save.tankData[k];
}

export function creaturesIn(save: SaveData, tankId: number): CreatureData[] {
  return save.creatures.filter((c) => c.tank === tankId);
}

/** Finished creature tanks, west to east. */
export function tanks(layout: BaseLayout): Placed[] {
  return layout.pieces.filter((p) => p.kind === 'tank' && isDone(p)).sort((a, b) => a.gx - b.gx || a.gy - b.gy);
}

/** Tank number shown to the player (1 = the westmost). */
export function tankNumber(layout: BaseLayout, tankId: number): number {
  return tanks(layout).findIndex((t) => t.id === tankId) + 1;
}

/**
 * Which tanks have a working filter pump: a finished, powered pump joined to
 * the tank through collars (directly or through other pieces). Each pump
 * keeps its nearest two tanks clean.
 */
export function filteredTanks(layout: BaseLayout): Set<number> {
  const out = new Set<number>();
  const done = new Set(layout.pieces.filter(isDone).map((p) => p.id));
  const byId = new Map(layout.pieces.map((p) => [p.id, p]));
  for (const f of layout.pieces) {
    if (f.kind !== 'filter' || !done.has(f.id) || !layout.powered.has(f.id)) continue;
    let served = 0;
    const seen = new Set([f.id]);
    let ring = [f.id];
    while (ring.length && served < TANKS_PER_FILTER) {
      const next: number[] = [];
      for (const id of ring)
        for (const n of layout.links.get(id) ?? []) {
          if (seen.has(n) || !done.has(n)) continue;
          seen.add(n);
          next.push(n);
          if (byId.get(n)?.kind === 'tank' && !out.has(n) && served < TANKS_PER_FILTER) {
            out.add(n);
            served++;
          }
        }
      ring = next;
    }
  }
  return out;
}

export interface ComfortNote {
  text: string;
  good: boolean;
}

/** What comfort this creature would settle at in its tank, and why. */
export function comfortTarget(save: SaveData, layout: BaseLayout, c: CreatureData): { target: number; notes: ComfortNote[] } {
  const sp = SPECIES[c.species];
  const td = tankDataFor(save, c.tank);
  const mates = creaturesIn(save, c.tank).filter((m) => m.id !== c.id && m.stage !== 'egg');
  const all = creaturesIn(save, c.tank);
  const notes: ComfortNote[] = [];
  let t = 0.5;
  if (td.plant === sp.plant) {
    t += 0.3;
    notes.push({ text: `${PLANTS[sp.plant].name} to shelter in`, good: true });
  } else notes.push({ text: `Wants ${PLANTS[sp.plant].name.toLowerCase()} in the tank`, good: false });
  if (sp.company === 'same') {
    const same = mates.some((m) => m.species === c.species);
    if (same) t += 0.2;
    notes.push({ text: same ? `Company of another ${sp.name.toLowerCase()}` : `Lonely: likes another ${sp.name.toLowerCase()}`, good: same });
  } else if (sp.company === 'any') {
    if (mates.length) t += 0.2;
    notes.push({ text: mates.length ? 'Has tank-mates to follow' : 'Lonely: likes any tank-mate', good: mates.length > 0 });
  } else if (sp.company === 'clients') {
    const clients = mates.filter((m) => m.species !== c.species).length;
    if (clients) t += 0.2;
    notes.push({ text: clients ? 'Has tank-mates to clean' : 'Idle: likes another species to clean', good: clients > 0 });
  } else {
    if (mates.length <= 1) t += 0.2;
    notes.push({ text: mates.length <= 1 ? 'Room to drift' : 'Crowded: likes space to drift', good: mates.length <= 1 });
  }
  if (c.species !== 'shrimp' && mates.some((m) => m.species === 'shrimp')) notes.push({ text: 'Kept clean by the lantern shrimp (more output)', good: true });
  const bad = mates.filter((m) => sp.dislikes.includes(m.species));
  if (bad.length) {
    t -= 0.4;
    const other = SPECIES[bad[0].species].name.toLowerCase();
    notes.push({ text: (CLASH_TEXT[c.species] ?? ((o: string) => `Bothered by the ${o}`))(other), good: false });
  }
  if (!layout.powered.has(c.tank)) {
    t -= 0.4;
    notes.push({ text: 'Tank has no power: no light or flow', good: false });
  }
  if (all.length > 3) t -= 0.1 * (all.length - 3);
  return { target: Math.max(0, Math.min(1, t)), notes };
}

/** The lowest of the three needs, and which one it is. */
export function worstNeed(save: SaveData, c: CreatureData): { value: number; which: 'fed' | 'comfort' | 'water' } {
  const w = tankDataFor(save, c.tank).water;
  let v = c.fed;
  let which: 'fed' | 'comfort' | 'water' = 'fed';
  if (c.comfort < v) {
    v = c.comfort;
    which = 'comfort';
  }
  if (w < v) {
    v = w;
    which = 'water';
  }
  return { value: v, which };
}

/** A one-line status, like the concept art's "Hungry. Lantern is dimming." */
export function statusLine(save: SaveData, c: CreatureData): string {
  if (c.stage === 'egg') return `Egg: hatching in about ${Math.max(1, Math.ceil((1 - c.growth) * HATCH_SECONDS))} s.`;
  const sp = SPECIES[c.species];
  const w = worstNeed(save, c);
  const glowWord =
    c.species === 'glowfin' ? 'Lantern' : c.species === 'puffcap' ? 'Spots are' : c.species === 'crab' ? 'Eyes are' : c.species === 'shrimp' ? 'Lights are' : 'Dapples are';
  const what = { fed: 'Hungry', comfort: 'Unsettled', water: 'Water is dirty' }[w.which];
  if (c.sickness > 0.02) return `Sick: ${what.toLowerCase()}. ${glowWord === 'Lantern' ? 'Lantern is' : glowWord} fading. Fix it soon.`;
  if (w.value < 0.45) return `${what}. ${glowWord === 'Lantern' ? 'Lantern is' : glowWord} dimming.`;
  if (c.stage === 'young')
    return w.value >= HAPPY_AT ? `Healthy and growing: ${Math.floor(c.growth * 100)}% grown.` : `Settling in. Needs above ${Math.round(HAPPY_AT * 100)}% to grow.`;
  return w.value >= HAPPY_AT ? `Grown and thriving. It ${sp.makesText}.` : `Grown. Happier, it would make ${MATERIALS[sp.makes].name.toLowerCase()}.`;
}

/** 0..1: how brightly it glows (and how lively it looks). */
export function vigour(save: SaveData, c: CreatureData): number {
  if (c.stage === 'egg') return 0.6;
  const w = worstNeed(save, c).value;
  return Math.max(0.15, Math.min(1, 0.35 + w * 0.65 - c.sickness * 0.5)) * (c.stage === 'grown' ? 1 : 0.8);
}

export type CareEvent =
  | { type: 'hatched'; c: CreatureData }
  | { type: 'grown'; c: CreatureData }
  | { type: 'sick'; c: CreatureData; why: string }
  | { type: 'better'; c: CreatureData }
  | { type: 'dormant'; c: CreatureData }
  | { type: 'made'; c: CreatureData; kind: MaterialId; stored: boolean };

/**
 * Run the needs forward by dt seconds of play.
 */
export function tickCare(save: SaveData, layout: BaseLayout, dt: number): CareEvent[] {
  const ev: CareEvent[] = [];
  const filtered = filteredTanks(layout);
  const thriving = thrivingTanks(save, layout);
  const live = new Set(layout.pieces.filter((p) => p.kind === 'tank').map((p) => p.id));
  // Water.
  for (const t of tanks(layout)) {
    const td = tankDataFor(save, t.id);
    const here = creaturesIn(save, t.id).filter((c) => c.stage !== 'egg');
    const n = here.length;
    const cleaner = here.some((c) => c.species === 'shrimp') ? 1 - SHRIMP_CLEAN_WATER : 1;
    // Echo whorls quicken the whole tank: its creatures foul the water faster too.
    td.water -= n * DIRT_RATE * cleaner * whorlMult(save, t.id) * dt;
    if (filtered.has(t.id)) td.water += FILTER_RATE * dt;
    td.water = Math.max(0, Math.min(1, td.water));
  }
  for (const k of Object.keys(save.tankData)) if (!live.has(Number(k))) delete save.tankData[k];

  for (const c of [...save.creatures]) {
    if (c.stage === 'egg') {
      c.growth += dt / HATCH_SECONDS;
      if (c.growth >= 1) {
        c.stage = 'young';
        c.growth = 0;
        c.fed = Math.max(c.fed, 0.7);
        ev.push({ type: 'hatched', c });
      }
      continue;
    }
    c.fed = Math.max(0, c.fed - HUNGER_RATE * whorlMult(save, c.tank) * dt);
    // Milestone 5: creatures eat from the tank's feed trough (filled by an
    // auto feeder through a feed pipe) whenever they get peckish.
    const trough = tankDataFor(save, c.tank);
    if (c.fed < EAT_BELOW && (trough.mash ?? 0) > 0) {
      const eat = Math.min(trough.mash ?? 0, (EAT_BELOW + 0.03 - c.fed) / MASH_FED);
      trough.mash = (trough.mash ?? 0) - eat;
      c.fed = Math.min(1, c.fed + eat * MASH_FED);
    }
    const { target } = comfortTarget(save, layout, c);
    c.comfort += (target - c.comfort) * Math.min(1, dt / 40);
    const w = worstNeed(save, c);
    if (w.value < SICK_BELOW) {
      const was = c.sickness;
      c.sickness += dt / SICK_SECONDS;
      if (was === 0) ev.push({ type: 'sick', c, why: { fed: 'hungry', comfort: 'unsettled', water: 'dirty water' }[w.which] });
      if (c.sickness >= 1) {
        save.creatures = save.creatures.filter((x) => x.id !== c.id);
        save.dormant[c.species] = (save.dormant[c.species] ?? 0) + 1;
        ev.push({ type: 'dormant', c });
        continue;
      }
    } else if (c.sickness > 0) {
      c.sickness = Math.max(0, c.sickness - dt / 90);
      if (c.sickness === 0) ev.push({ type: 'better', c });
    }
    const happy = w.value >= HAPPY_AT && c.sickness === 0;
    if (c.stage === 'young' && happy) {
      c.growth += dt / GROW_SECONDS;
      if (c.growth >= 1) {
        c.stage = 'grown';
        c.growth = 1;
        ev.push({ type: 'grown', c });
      }
    } else if (c.stage === 'grown' && happy) {
      c.make += (makeRate(save, layout, c, thriving).perMin / 60) * dt;
      if (c.make >= 1) {
        const kind = SPECIES[c.species].makes;
        // Milestone 5 part 2: it goes in the tank's output tray, for a
        // conveyor (or the diver) to take away. A full tray pauses making.
        const td = tankDataFor(save, c.tank);
        if (trayCount(td) < TRAY_CAP) {
          td.out ??= {};
          td.out[kind] = (td.out[kind] ?? 0) + 1;
          c.make = 0;
          ev.push({ type: 'made', c, kind, stored: false });
        } else c.make = 1;
      }
    }
  }
  return ev;
}

/** Take a cost from what is carried first, then from storage. False if it cannot be paid. */
export function payCost(save: SaveData, cost: Partial<Record<MaterialId, number>>): boolean {
  for (const k of MATERIAL_ORDER) if (save.bag[k] + save.stored[k] < (cost[k] ?? 0)) return false;
  for (const k of MATERIAL_ORDER) {
    let need = cost[k] ?? 0;
    const fromBag = Math.min(need, save.bag[k]);
    save.bag[k] -= fromBag;
    need -= fromBag;
    save.stored[k] -= need;
  }
  return true;
}

/** A new creature for a tank, from what was in the jar. */
export function newCreature(save: SaveData, species: SpeciesId, stage: 'egg' | 'young', tank: number): CreatureData {
  const c: CreatureData = { id: save.nextCreatureId++, species, tank, stage, growth: 0, fed: 0.75, comfort: 0.5, sickness: 0, make: 0 };
  save.creatures.push(c);
  return c;
}
