import { BaseLayout, isDone, isTankKind, Placed } from './base';
import { CreatureData, JarData, MaterialId, MATERIAL_ORDER, MATERIALS, PlantId, SaveData, SpeciesId, TankData } from './state';
import { EAT_BELOW, MASH_FED, NURSERY_TROUGH, TRAY_CAP, trayCount, whorlMult } from './factory';
import { ensureTraits, inherit, isRare, RADIANT_MAKE, traitsOf, wildForms, wildTraits, type Traits } from './traits';

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
   * needs room to drift: content while its tank is no more than half full
   * (Colin, Nov 22, 2026: scales with the tank, see `driftRoom`). 'clients' (milestone 7, the lantern shrimp): content
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
  // Milestone 10: the trench (Colin: a new trench creature acts as the key there).
  snail: {
    id: 'snail',
    name: 'Cinder snail',
    youngName: 'young cinder snail',
    eggName: 'cinder snail egg capsules',
    home: 'the vent field in the trench',
    plant: 'lumen',
    company: 'same',
    dislikes: ['crab'],
    makes: 'ore',
    makesText: 'grazes mineral crust off the tank rocks and sheds it, cooled, as vent ore',
    scan: 'snail',
  },
  // Phase 22: the trench floor, by the drowned Fulmar.
  eel: {
    id: 'eel',
    name: 'Kiln eel',
    youngName: 'young kiln eel',
    eggName: 'kiln eel egg string',
    home: "the trench floor's east end, past the Fulmar's stern",
    plant: 'lumen',
    company: 'any',
    dislikes: ['puffcap'],
    makes: 'brass',
    makesText: 'noses through the tank gravel for old metal and polishes it into bright brass fittings',
    scan: 'eel',
  },
  // Phase 22: the sanctum's edge, in the antechamber's pale light.
  horse: {
    id: 'horse',
    name: 'Chime seahorse',
    youngName: 'young chime seahorse',
    eggName: 'chime seahorse brood pouch',
    home: "the antechamber at the sanctum's edge",
    plant: 'grass',
    company: 'same',
    dislikes: ['crab'],
    makes: 'bloom',
    makesText: 'hums to the seagrass at night, and now and then a glowing bloom opens where it sleeps',
    scan: 'horse',
  },
};
export const SPECIES_ORDER: SpeciesId[] = ['glowfin', 'puffcap', 'ray', 'crab', 'shrimp', 'snail', 'eel', 'horse'];

/**
 * Pairings (milestone 7; DESIGN.md, mixed tanks). Clashes: puffcap threads
 * sting glowfins, and tinker crabs snip puffcap ribbons. The lantern shrimp
 * is a cleaner: every tank-mate of another species makes more, and its tank
 * fouls more slowly.
 */
export const CLASH_TEXT: Partial<Record<SpeciesId, (other: string) => string>> = {
  glowfin: (o) => `Stung by the ${o}'s threads`,
  puffcap: (o) => `Ribbons snipped by the ${o}`,
  snail: (o) => `Scales picked at by the ${o}`,
  eel: (o) => `Fin stung by the ${o}'s threads`,
  horse: (o) => `Filaments snipped by the ${o}`,
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

/**
 * Take a founding pair from the wild, then breed in tanks. A lost or dormant
 * founder can be replaced even before the player has the Revival pool.
 */
export const WILD_CAP = 2;
export function wildAllowed(save: SaveData, sp: SpeciesId): boolean {
  if ((save.wildCaught[sp] ?? 0) < WILD_CAP) return true;
  const founders = save.creatures.filter(c => c.species === sp).length +
    save.nursery.filter(c => c.species === sp).length +
    // Phase 21: resting in the reserve still counts (it would otherwise be a way round the wild's limit).
    (save.reserve ?? []).filter(c => c.species === sp).length +
    Number(save.jar?.species === sp) + Number(save.jar2?.species === sp);
  return founders < WILD_CAP;
}

/**
 * Phase 15: let the newest catch out of the jar (the satchel's slot first).
 * A wild catch no longer counts against the wild's limit, so the right one can
 * be caught instead; a named creature from the tanks is simply gone. Returns
 * what was released (the caller puts a wild one back in the world), or null.
 */
export function releaseFromJar(save: SaveData): JarData | null {
  const slot = save.jar2 ? 'jar2' : save.jar ? 'jar' : null;
  if (!slot) return null;
  const j = save[slot]!;
  if (!j.keep) save.wildCaught[j.species] = Math.max(0, (save.wildCaught[j.species] ?? 0) - 1);
  save[slot] = null;
  if (slot === 'jar' && save.jar2) {
    save.jar = save.jar2;
    save.jar2 = null;
  }
  return j;
}

/**
 * Phase 16 (satchel fix): where the next creature would go. The jar first, then
 * the satchel's second slot if the specimen satchel (SJ-2) is owned. Null when
 * there is no jar at all or every slot Kestrel has is full.
 */
export function jarRoom(save: SaveData): 'jar' | 'jar2' | null {
  if (!save.kit.jar) return null;
  if (!save.jar) return 'jar';
  if (!save.jar2 && save.gear.includes('satchel')) return 'jar2';
  return null;
}

/** Put a creature in the first free slot. False (and nothing changes) when there is no room. */
export function putInJar(save: SaveData, j: JarData): boolean {
  const slot = jarRoom(save);
  if (!slot) return false;
  save[slot] = j;
  return true;
}

/**
 * Take the jar's creature out (oldest first) and move the satchel's catch up at
 * once, so a second deposit is offered straight away, indoors or out.
 */
export function takeFromJar(save: SaveData): JarData | null {
  const j = save.jar ?? null;
  if (!j) return null;
  save.jar = save.jar2 ?? null;
  save.jar2 = null;
  return j;
}

/**
 * Creatures per tank (eggs count too). Colin (after Session B): creatures are drawn much
 * smaller in the tanks now, so tanks hold three times as many (a small tank 4 → 12, a
 * Grand tank 8 → 24; extended 18 and 36; the display aquarium 60).
 */
export const TANK_CAPACITY = 12;
/** Milestone 7 part 2: the Grand tank. */
export const GTANK_CAPACITY = 24;
/**
 * Phase 21, room for more creatures (Colin, Nov 22, 2026): a TX-1 extension kit from the
 * Workshop takes a small tank from 4 to 6 and a Grand tank from 8 to 12; a display refit
 * (DR-1) then makes a Grand tank the display aquarium, for 20. Index = TankData.level.
 */
export const TANK_LEVELS: Record<'tank' | 'gtank', number[]> = { tank: [TANK_CAPACITY, 18], gtank: [GTANK_CAPACITY, 36, 60] };
/** A tank's level: 0 as built, 1 extended, 2 the display aquarium (Grand tanks only). */
export function tankLevel(save: SaveData | undefined, id: number): number {
  return Math.max(0, Math.floor(save?.tankData[String(id)]?.level ?? 0));
}
/** How many creatures (and eggs) a tank holds. Pass the save so upgrades count. */
export function tankCapacity(layout: BaseLayout, id: number, save?: SaveData): number {
  const kind = layout.pieces.find((p) => p.id === id)?.kind === 'gtank' ? 'gtank' : 'tank';
  const lv = TANK_LEVELS[kind];
  return lv[Math.min(lv.length - 1, tankLevel(save, id))];
}
/** Is this the display aquarium? */
export function isDisplay(save: SaveData, layout: BaseLayout, id: number): boolean {
  return layout.pieces.find((p) => p.id === id)?.kind === 'gtank' && tankLevel(save, id) >= 2;
}
/** The kit the next upgrade of this tank needs, or why it can't be upgraded. */
export function nextUpgrade(save: SaveData, layout: BaseLayout, id: number): { kit: 'tankkit' | 'displaykit'; to: number } | { blocked: string } {
  const grand = layout.pieces.find((p) => p.id === id)?.kind === 'gtank';
  const lv = tankLevel(save, id);
  if (lv === 0) return { kit: 'tankkit', to: (grand ? TANK_LEVELS.gtank : TANK_LEVELS.tank)[1] };
  if (grand && lv === 1) return { kit: 'displaykit', to: TANK_LEVELS.gtank[2] };
  return { blocked: grand ? 'This is the display aquarium: as big as a tank gets' : 'Extended. Only a Grand tank grows further' };
}
/** Fit the next upgrade from a carried kit. Null when done, or why not. */
export function upgradeTank(save: SaveData, layout: BaseLayout, id: number): string | null {
  const up = nextUpgrade(save, layout, id);
  if ('blocked' in up) return up.blocked;
  const field = up.kit === 'tankkit' ? 'tankKits' : 'displayKits';
  if ((save[field] ?? 0) <= 0) return up.kit === 'tankkit' ? 'Needs a tank extension kit TX-1 from the Workshop' : 'Needs a display refit kit DR-1 from the Workshop';
  save[field] = (save[field] ?? 0) - 1;
  tankDataFor(save, id).level = tankLevel(save, id) + 1;
  return null;
}
/** Decorations a tank has room for: 2 in a small tank, 3 in a Grand tank, one more extended, 6 in the display aquarium. */
export function decorSlots(save: SaveData, layout: BaseLayout, id: number): number {
  const grand = layout.pieces.find((p) => p.id === id)?.kind === 'gtank';
  const lv = tankLevel(save, id);
  if (grand && lv >= 2) return 6;
  return (grand ? 3 : 2) + (lv >= 1 ? 1 : 0);
}
/**
 * How many creatures a tank can hold while a puffcap still has room to drift
 * (Colin, Nov 22, 2026): half its capacity, so it scales with the tank. A
 * small tank keeps 2 as before, a Grand tank 4, and bigger or upgraded tanks more.
 */
export function driftRoom(capacity: number): number {
  return Math.max(2, Math.floor(capacity / 2));
}
/** Tanks one filter pump can keep clean. */
export const TANKS_PER_FILTER = 2;
/** Kelp fibre per feed (it is ground into flakes). */
export const FEED_COST: MaterialId = 'fibre';

// Rates, per second of play. Single numbers, easy to tune after Colin plays.
/** Full to empty in about 21 minutes (Colin, after Session B: smaller creatures eat less; was 15, and young now take 12 minutes to grow). */
export const HUNGER_RATE = 1 / 1300;
/** How much one feed adds. */
export const FEED_AMOUNT = 0.6;
/**
 * Each creature dirties its tank this fast: one alone takes an hour. (Colin, after Session B:
 * creatures are smaller and tanks hold three times as many, so each dirties a third as much;
 * a full tank fouls about as fast as a full tank did before.)
 */
export const DIRT_RATE = 1 / 3600;
/** A filter pump cleans at this rate (much faster than four creatures dirty it). */
export const FILTER_RATE = 1 / 150;
/** One Clean tank scrub. */
export const CLEAN_AMOUNT = 0.4;
/** One juvenile with its own plant can weather a full outing between care visits. */
const SHELTER_USE = 0.6;
/** Below this, a need makes the creature sick. */
export const SICK_BELOW = 0.25;
/** Sick this long without help and it goes dormant (6 minutes). */
export const SICK_SECONDS = 360;
/** Needs at or above this let it grow and make materials. */
export const HAPPY_AT = 0.6;
/**
 * After milestone 12 (Colin: "planting feels pointless"): comfort has a higher
 * bar. A tank starts at 50% comfort and company adds 20%, so without the
 * species' plant (+30%) a creature can't reach it. Food and water keep the 60% bar.
 */
export const COMFORT_HAPPY = 0.75;
/** Do all three needs clear their bars? */
function needsMet(save: SaveData, c: CreatureData): boolean {
  const w = tankDataFor(save, c.tank).water;
  return c.fed >= HAPPY_AT && w >= HAPPY_AT && c.comfort >= COMFORT_HAPPY;
}
/** Young to grown, with needs met (12 minutes; Colin, after Session B: was 8). */
export const GROW_SECONDS = 720;
/** Egg to young, in any tank (90 seconds). */
export const HATCH_SECONDS = 90;
/** A grown, happy creature makes one material this often (4 minutes), before bonuses. */
export const MAKE_SECONDS = 240;
/**
 * Milestone 5: output scales with how many happy creatures and tanks the
 * base has. Each happy tank-mate adds this much (a shoal works together)...
 */
export const SHOAL_BONUS = 0.15;
/** The shoal bonus stops growing at seven happy tank-mates (a full Grand tank's worth before tanks grew). */
export const SHOAL_MAX = 1.05;
/** ...and each other thriving tank in the base adds this much (a healthy reef), */
export const REEF_BONUS = 0.1;
/** up to this. A tank thrives with at least two grown, happy creatures. */
export const REEF_MAX = 0.5;

/** Is this creature happy enough to grow and make things? */
export function isHappy(save: SaveData, c: CreatureData): boolean {
  return c.stage !== 'egg' && c.sickness === 0 && needsMet(save, c);
}

/** Tanks with at least two grown, happy creatures. */
export function thrivingTanks(save: SaveData, layout: BaseLayout): Set<number> {
  const out = new Set<number>();
  for (const t of tanks(layout)) if (creaturesIn(save, t.id).filter((c) => c.stage === 'grown' && isHappy(save, c)).length >= 2) out.add(t.id);
  return out;
}

export interface TankHarmony {
  /** 0 if empty, 1..5 stars when occupied. */
  stars: number;
  /** Extra care-power bonus towards rare breeding odds (0..0.40). */
  rareBonus: number;
  /** Extra material production multiplier (0..0.32). */
  yieldBonus: number;
  flora: boolean;
  decor: boolean;
  thriving: boolean;
  showcase: boolean;
  nextTip: string | null;
}

/**
 * Tank Harmony / Showcase Rating (★–★★★★★): matching biome flora, 2+ painted
 * decorations, thriving care, and rare/diverse residents each add a star and
 * boost both rare-trait breeding odds and material production speed.
 */
export function tankHarmony(save: SaveData, tankId: number): TankHarmony {
  const here = creaturesIn(save, tankId).filter((c) => c.stage !== 'egg');
  if (!here.length) {
    return { stars: 0, rareBonus: 0, yieldBonus: 0, flora: false, decor: false, thriving: false, showcase: false, nextTip: 'Add a creature to start building Harmony.' };
  }
  const td = tankDataFor(save, tankId);
  const flora = here.some((c) => td.plant === SPECIES[c.species].plant || td.plant2 === SPECIES[c.species].plant);
  const decorCount = td.decor?.length ?? 0;
  const decor = decorCount >= 2;
  const thriving = td.water >= 0.72 && here.every((c) => c.fed >= 0.65 && c.comfort >= 0.65);
  const speciesCount = new Set(here.map((c) => c.species)).size;
  const showcase =
    speciesCount >= 3 ||
    here.some((c) => {
      const tr = traitsOf(c);
      return isRare(tr) || !!tr.radiant || !!tr.heirloom || !!tr.choir;
    });
  const stars = 1 + (flora ? 1 : 0) + (decor ? 1 : 0) + (thriving ? 1 : 0) + (showcase ? 1 : 0);
  const rareBonus = (stars - 1) * 0.1;
  const yieldBonus = (stars - 1) * 0.08;
  let nextTip: string | null = null;
  if (!flora) nextTip = 'Plant a matching biome flora for +1★';
  else if (!decor) nextTip = decorCount === 1 ? 'Place 1 more tank decoration for +1★' : 'Place 2 tank decorations for +1★';
  else if (!thriving) nextTip = 'Keep water & residents thriving for +1★';
  else if (!showcase) nextTip = 'House a rare/radiant specimen or 3 species for +1★';
  return { stars, rareBonus, yieldBonus, flora, decor, thriving, showcase, nextTip };
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
): { perMin: number; shoal: number; reef: number; whorl: number; clean: number; radiant: number; harmony: number } {
  const happyMates = creaturesIn(save, c.tank).filter((m) => m.id !== c.id && isHappy(save, m));
  const mates = happyMates.length;
  const shoal = Math.min(SHOAL_MAX, SHOAL_BONUS * mates);
  // Milestone 7: lantern shrimp clean their tank-mates of other species.
  const clean = c.species === 'shrimp' ? 0 : CLEAN_BONUS * happyMates.filter((m) => m.species === 'shrimp').length;
  const reef = Math.min(REEF_MAX, REEF_BONUS * (thriving.size - (thriving.has(c.tank) ? 1 : 0)));
  const whorl = whorlMult(save, c.tank);
  const harmony = tankHarmony(save, c.tank).yieldBonus;
  const base = c.stage === 'grown' && isHappy(save, c) ? 60 / MAKE_SECONDS : 0;
  // Milestone 9: a radiant creature makes a quarter more.
  const radiant = traitsOf(c).radiant ? RADIANT_MAKE : 1;
  return { perMin: base * (1 + shoal + clean) * (1 + reef) * (1 + harmony) * whorl * radiant, shoal, reef, whorl, clean, radiant, harmony };
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
  return layout.pieces.filter((p) => isTankKind(p.kind) && isDone(p)).sort((a, b) => a.gx - b.gx || a.gy - b.gy);
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
          if (isTankKind(byId.get(n)?.kind ?? 'dome') && !out.has(n) && served < TANKS_PER_FILTER) {
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
  if (td.plant === sp.plant || td.plant2 === sp.plant) {
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
    const room = driftRoom(tankCapacity(layout, c.tank, save));
    const roomy = mates.length + 1 <= room;
    if (roomy) t += 0.2;
    notes.push({ text: roomy ? 'Room to drift' : `Crowded: likes space to drift (at most ${room} in this tank)`, good: roomy });
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
  // Crowding starts once a tank is nearly full (3 in a tank, 7 in a Grand tank).
  const roomy = tankCapacity(layout, c.tank, save) - 1;
  if (all.length > roomy) t -= 0.1 * (all.length - roomy);
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
    return needsMet(save, c)
      ? `Healthy and growing: ${Math.floor(c.growth * 100)}% grown.`
      : c.comfort < COMFORT_HAPPY && w.value >= HAPPY_AT
        ? `Settling in. Needs ${Math.round(COMFORT_HAPPY * 100)}% comfort to grow. Plant ${PLANTS[sp.plant].name.toLowerCase()}. One youngster with its own plant uses food and clean water more slowly.`
        : `Settling in. Needs food and water above ${Math.round(HAPPY_AT * 100)}% to grow.`;
  return needsMet(save, c)
    ? `Grown and thriving. It ${sp.makesText}.`
    : c.comfort < COMFORT_HAPPY && w.value >= HAPPY_AT
      ? `Grown, but not comfortable enough to make ${MATERIALS[sp.makes].name.toLowerCase()} (needs ${Math.round(COMFORT_HAPPY * 100)}% comfort).`
      : `Grown. Happier, it would make ${MATERIALS[sp.makes].name.toLowerCase()}.`;
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
  | { type: 'made'; c: CreatureData; kind: MaterialId; stored: boolean }
  | { type: 'laid'; c: CreatureData; parents: [CreatureData, CreatureData] }
  | { type: 'nursery-hatched'; c: CreatureData; home?: number | 'reserve' | null };

/**
 * Run the needs forward by dt seconds of play.
 */
export function tickCare(save: SaveData, layout: BaseLayout, dt: number): CareEvent[] {
  const ev: CareEvent[] = [];
  const filtered = filteredTanks(layout);
  const thriving = thrivingTanks(save, layout);
  const live = new Set(layout.pieces.filter((p) => isTankKind(p.kind)).map((p) => p.id));
  const sheltered = new Set<number>();
  // Water.
  for (const t of tanks(layout)) {
    const td = tankDataFor(save, t.id);
    const here = creaturesIn(save, t.id).filter((c) => c.stage !== 'egg');
    const n = here.length;
    const juvenile = here[0];
    const shelter = n === 1 && juvenile.stage === 'young' &&
      (td.plant === SPECIES[juvenile.species].plant || td.plant2 === SPECIES[juvenile.species].plant);
    if (shelter) sheltered.add(juvenile.id);
    const cleaner = here.some((c) => c.species === 'shrimp') ? 1 - SHRIMP_CLEAN_WATER : 1;
    // Echo whorls quicken the whole tank: its creatures foul the water faster too.
    td.water -= n * DIRT_RATE * cleaner * (shelter ? SHELTER_USE : 1) * whorlMult(save, t.id) * dt;
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
    c.fed = Math.max(0, c.fed - HUNGER_RATE * (sheltered.has(c.id) ? SHELTER_USE : 1) * whorlMult(save, c.tank) * dt);
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
    // Phase 21: how well it knows Kestrel fades slowly without hand-feeding.
    if (c.bond) c.bond = Math.max(0, c.bond - BOND_FADE * dt);
    const happy = needsMet(save, c) && c.sickness === 0;
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
  tickBreeding(save, layout, dt, ev);
  return ev;
}

// ---- Milestone 9: breeding (Colin's choices) ----
/**
 * A happy, grown pair of one species in a tank lays an egg about this often
 * (10 minutes of play; Colin, after Session B: was 6), while the base has a powered
 * Creature room with room. A crowded tank breeds more slowly (`crowding`).
 */
export const BREED_SECONDS = 600;
/** Eggs (and young waiting for a home) one Creature room holds. */
export const HATCH_CAP = 4;

/**
 * Colin (after Session B): a crowded tank breeds more slowly. Up to half full, full speed;
 * then slower and slower, down to a quarter of the speed when the tank is full.
 */
export function crowding(count: number, capacity: number): number {
  const fill = capacity > 0 ? count / capacity : 1;
  if (fill <= 0.5) return 1;
  return Math.max(0.25, 1 - ((fill - 0.5) / 0.5) * 0.75);
}

/**
 * Colin (after Session B): young settle into a home by themselves when they hatch. The best
 * tank with room: the one its parents live in, then a tank with its favourite plant and its
 * own kind; never a tank with a creature it clashes with, or one too full for a puffcap.
 * If no tank suits, it rests in the reserve; if that is full or not built, it waits in the
 * Creature room as before. Returns where it went (null: it waits).
 */
export function settleYoung(save: SaveData, layout: BaseLayout, c: CreatureData): number | 'reserve' | null {
  const sp = SPECIES[c.species];
  let best: { id: number; score: number } | null = null;
  for (const t of tanks(layout)) {
    const here = creaturesIn(save, t.id);
    const cap = tankCapacity(layout, t.id, save);
    if (here.length >= cap) continue;
    if (here.some((m) => sp.dislikes.includes(m.species) || SPECIES[m.species].dislikes.includes(c.species))) continue;
    if (sp.company === 'space' && here.length + 1 > driftRoom(cap)) continue;
    let score = 0;
    if (c.from === t.id) score += 4;
    if (tankDataFor(save, t.id).plant === sp.plant) score += 2;
    if (here.some((m) => m.species === c.species)) score += 1;
    score -= (here.length / cap) * 0.5;
    if (!best || score > best.score) best = { id: t.id, score };
  }
  if (best) {
    save.nursery = save.nursery.filter((x) => x.id !== c.id);
    c.tank = best.id;
    save.creatures.push(c);
    return best.id;
  }
  if (reserveOpen(layout) && (save.reserve?.length ?? 0) < RESERVE_CAP) {
    save.nursery = save.nursery.filter((x) => x.id !== c.id);
    c.tank = -2;
    (save.reserve ??= []).push(c);
    return 'reserve';
  }
  return null;
}

/** Finished, powered Hatcheries. */
export function hatcheries(layout: BaseLayout): Placed[] {
  return layout.pieces.filter((p) => p.kind === 'hatch' && isDone(p) && layout.powered.has(p.id));
}
/** How many eggs and young the base's Hatcheries can still take. */
export function nurseryTroughCap(layout: BaseLayout): number {
  return NURSERY_TROUGH * hatcheries(layout).length;
}

export function nurseryRoom(save: SaveData, layout: BaseLayout): number {
  return HATCH_CAP * hatcheries(layout).length - save.nursery.length;
}
/** Happy grown creatures of a species in a tank (the ones that can breed). */
function breeders(save: SaveData, tankId: number, sp: SpeciesId): CreatureData[] {
  return creaturesIn(save, tankId).filter((c) => c.species === sp && c.stage === 'grown' && isHappy(save, c));
}
/** Pairs of a species in a tank that are ready to breed. */
export function pairsIn(save: SaveData, tankId: number, sp: SpeciesId): number {
  return Math.floor(breeders(save, tankId, sp).length / 2);
}

/** How breeding is going for this creature's kind in its tank, for the care panel. */
export function breedNote(save: SaveData, layout: BaseLayout, c: CreatureData): ComfortNote | null {
  if (c.stage !== 'grown') return null;
  const sp = SPECIES[c.species];
  const name = sp.name.toLowerCase();
  if (!isHappy(save, c)) return { text: `Too unsettled to breed`, good: false };
  const pairs = pairsIn(save, c.tank, c.species);
  if (!pairs) return { text: `Another happy grown ${name} here would make a breeding pair`, good: false };
  if (!layout.pieces.some((p) => p.kind === 'hatch' && isDone(p))) return { text: `A breeding pair: build a Creature room so they can lay eggs`, good: false };
  if (!hatcheries(layout).length) return { text: `A breeding pair, but the Creature room has no power`, good: false };
  const prog = tankDataFor(save, c.tank).breed?.[c.species] ?? 0;
  if (nurseryRoom(save, layout) <= 0) return { text: `A breeding pair: the Creature room is full. Make room in a tank or the reserve`, good: false };
  const crowd = crowding(creaturesIn(save, c.tank).length, tankCapacity(layout, c.tank, save));
  const min = Math.max(1, Math.ceil(((1 - prog) * BREED_SECONDS) / pairs / crowd / 60));
  return { text: `A breeding pair: next egg in about ${min} min${crowd < 1 ? ' (slower: the tank is crowded)' : ''}`, good: crowd >= 0.5 };
}

function tickBreeding(save: SaveData, layout: BaseLayout, dt: number, ev: CareEvent[]): void {
  const hatch = hatcheries(layout);
  // Eggs in a powered Hatchery hatch. After milestone 12 (Colin) the young get hungry while they
  // wait: they eat from the Hatcheries' trough (a feed pipe fills it), and starve like any creature.
  const hatchRate = hatch.length ? Math.max(...hatch.map((h) => layout.powerRate(h.id))) : 0;
  for (const c of [...save.nursery]) {
    if (c.stage !== 'young') continue;
    c.fed = Math.max(0, c.fed - HUNGER_RATE * dt);
    if (c.fed < EAT_BELOW && (save.nurseryMash ?? 0) > 0) {
      const eat = Math.min(save.nurseryMash ?? 0, (EAT_BELOW + 0.03 - c.fed) / MASH_FED);
      save.nurseryMash = (save.nurseryMash ?? 0) - eat;
      c.fed = Math.min(1, c.fed + eat * MASH_FED);
    }
    if (c.fed < SICK_BELOW) {
      const was = c.sickness;
      c.sickness += dt / SICK_SECONDS;
      if (was === 0) ev.push({ type: 'sick', c, why: 'hungry' });
      if (c.sickness >= 1) {
        save.nursery = save.nursery.filter((x) => x.id !== c.id);
        save.dormant[c.species] = (save.dormant[c.species] ?? 0) + 1;
        ev.push({ type: 'dormant', c });
      }
    } else if (c.sickness > 0) c.sickness = Math.max(0, c.sickness - dt / 90);
  }
  if (hatch.length)
    for (const c of save.nursery) {
      if (c.stage !== 'egg') continue;
      c.growth += (dt * hatchRate) / HATCH_SECONDS;
      if (c.growth >= 1) {
        c.stage = 'young';
        c.growth = 0;
        c.fed = 1;
        // Colin (after Session B): it swims home by itself (unless that is switched off).
        const home = save.autoSettle === false ? null : settleYoung(save, layout, c);
        ev.push({ type: 'nursery-hatched', c, home });
      }
    }
  if (!hatch.length) return;
  for (const t of tanks(layout)) {
    const td = tankDataFor(save, t.id);
    for (const sp of SPECIES_ORDER) {
      const b = breeders(save, t.id, sp);
      const pairs = Math.floor(b.length / 2);
      if (!pairs) {
        if (td.breed?.[sp]) delete td.breed[sp];
        continue;
      }
      td.breed ??= {};
      const crowd = crowding(creaturesIn(save, t.id).length, tankCapacity(layout, t.id, save));
      const tonic = (td.tonicUntil ?? 0) > save.playSeconds;
      const prog = Math.min(1, (td.breed[sp] ?? 0) + (pairs * dt * crowd * (tonic ? 1.6 : 1)) / BREED_SECONDS);
      td.breed[sp] = prog;
      if (prog < 1 || nurseryRoom(save, layout) <= 0) continue;
      td.breed[sp] = 0;
      // Two parents from the happy grown ones, and the egg's traits from them.
      const i = Math.floor(Math.random() * b.length);
      let j = Math.floor(Math.random() * (b.length - 1));
      if (j >= i) j++;
      const pa = b[i];
      const pb = b[j];
      const harm = tankHarmony(save, t.id);
      const power = Math.min(1, carePower(save, pa, pb) + (tonic ? 0.45 : 0) + harm.rareBonus);
      const egg: CreatureData = {
        id: save.nextCreatureId++,
        species: sp,
        tank: -1,
        stage: 'egg',
        growth: 0,
        fed: 0.8,
        comfort: 0.5,
        sickness: 0,
        make: 0,
        // Phase 21 + Research Exchange: good care & Rich Kelp Tonic raise rare odds.
        traits: inherit(ensureTraits(pa), ensureTraits(pb), Math.random, power, { contact: !!save.sanctum?.contact }),
        parents: [creatureName(pa), creatureName(pb)],
        from: t.id,
      };
      save.nursery.push(egg);
      ev.push({ type: 'laid', c: egg, parents: [pa, pb] });
    }
  }
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
export function newCreature(save: SaveData, species: SpeciesId, stage: 'egg' | 'young', tank: number, traits?: Traits): CreatureData {
  // Milestone 9: wild ones get wild traits; young from the Hatchery or the Revival pool bring theirs.
  const c: CreatureData = { id: save.nextCreatureId++, species, tank, stage, growth: 0, fed: 0.75, comfort: 0.5, sickness: 0, make: 0, traits: traits ?? { ...wildTraits(), ...wildForms() } };
  save.creatures.push(c);
  return c;
}

// ---- Phase 13: names, so kept creatures are individuals rather than keys ----
const NAMES = [
  'Pip', 'Wren', 'Juno', 'Fennel', 'Cobble', 'Tansy', 'Brine', 'Sable', 'Nori', 'Bramble', 'Pebble', 'Lark',
  'Quill', 'Rook', 'Sorrel', 'Umber', 'Vesper', 'Willow', 'Briar', 'Clove', 'Dune', 'Ember', 'Flint', 'Gale',
  'Hazel', 'Jasper', 'Kip', 'Marrow', 'Nettle', 'Opal', 'Perch', 'Rill', 'Shoal', 'Thistle', 'Wick', 'Yarrow',
  'Tumble', 'Scallop', 'Drift', 'Mote', 'Bodkin', 'Cinder', 'Fathom', 'Glim', 'Hob', 'Inky', 'Lantern', 'Murk',
];
/**
 * A stable name from the creature's id (and species), so nothing new is
 * saved and every save already has names. The same creature keeps its name
 * through the jar, the Hatchery and the Revival pool (they keep the id).
 */
export function creatureName(c: { id: number; species: SpeciesId; name?: string }): string {
  // Phase 20: a name chosen at hatching wins.
  if (c.name && c.name.trim()) return c.name.trim();
  return suggestedName(c);
}
/**
 * The name every creature had before Phase 20 (Phase 13). Its hash only ever reached a
 * few names per species (ids 1 to 4 were all "Murk"), so Phase 20 suggests better-mixed
 * names; creatures that already had one keep it (see keepOldNames).
 */
export function legacyName(c: { id: number; species: SpeciesId }): string {
  let h = (c.id * 2654435761 + SPECIES_ORDER.indexOf(c.species) * 40503) >>> 0;
  h ^= h >>> 15;
  // Phase 16 fix: `^=` makes h a signed number, so about half of all ids gave a negative
  // index and the name "undefined". Wrap those round; every name that already worked is unchanged.
  const i = h % NAMES.length;
  return NAMES[i < 0 ? i + NAMES.length : i];
}
/** Phase 20: the name the game suggests at hatching (well mixed, so neighbours rarely share one). */
export function suggestedName(c: { id: number; species: SpeciesId }): string {
  let h = Math.imul(c.id + 1, 0x9e3779b1) ^ Math.imul(SPECIES_ORDER.indexOf(c.species) + 7, 0x85ebca6b);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  return NAMES[(h >>> 0) % NAMES.length];
}
/**
 * Phase 20, once per save: every creature already kept keeps the name it had (written into
 * `name`), so the better name suggestions never rename anyone. Returns true if it ran.
 */
export function keepOldNames(save: SaveData): boolean {
  if (save.tips.includes('names:v2')) return false;
  for (const c of allKept(save)) if (!c.name && c.stage !== 'egg') c.name = legacyName(c);
  save.tips.push('names:v2');
  return true;
}
/** Phase 20: a name a player typed, tidied (trimmed, one line, at most 16 characters). Empty: keep the suggestion. */
export function cleanName(raw: string): string {
  return raw.replace(/[\u0000-\u001f<>&"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
}

// ---- Phase 21: contentment, hand-feeding and the care bonus to the odds ----
/** Bond gained per hand feed, and how fast it fades (full to nothing in 30 minutes of play). */
export const BOND_PER_FEED = 0.25;
export const BOND_FADE = 1 / 1800;
/** Seconds of play between treats for one creature, and what a treat adds to its food. */
export const HAND_FEED_COOLDOWN = 45;
export const HAND_FEED_FOOD = 0.2;
/** It knows Kestrel (and swims to the glass) from this much bond. */
export const KNOWS_KESTREL = 0.5;
/** Contentment at or above this is "content" (playful); below UNSETTLED it is sluggish. */
export const CONTENT_AT = 0.85;
export const UNSETTLED_AT = 0.5;
/** The care bonus runs from ×1 for a pair at CARE_LOW contentment to ×2 at CARE_HIGH. */
export const CARE_LOW = 0.6;
export const CARE_HIGH = 0.9;

export interface Contentment {
  value: number;
  label: 'Content' | 'Settled' | 'Restless' | 'Unhappy';
  notes: ComfortNote[];
}

/**
 * How content a creature is, 0..1 (Phase 21). Most of it is its three needs (fed, comfort,
 * clean water); the rest is attention: decorations in its tank to explore, and knowing Kestrel
 * from hand-feeding. A well-kept creature with both reaches 1; one that only just meets its
 * needs sits near 0.5. Sickness pulls it down. Eggs are always settled.
 */
export function contentment(save: SaveData, c: CreatureData): Contentment {
  if (c.stage === 'egg') return { value: 0.7, label: 'Settled', notes: [] };
  const water = c.tank >= 0 ? tankDataFor(save, c.tank).water : 1;
  const needs = (c.fed + c.comfort + water) / 3;
  const decor = c.tank >= 0 ? Math.min(2, save.tankData[String(c.tank)]?.decor?.length ?? 0) : 0;
  const bond = Math.min(1, c.bond ?? 0);
  const value = Math.max(0, Math.min(1, needs * 0.8 + 0.05 * decor + 0.1 * bond - c.sickness * 0.5));
  const notes: ComfortNote[] = [
    { text: needs >= 0.9 ? 'Every need well met' : `Needs ${Math.round(needs * 100)}% met`, good: needs >= 0.9 },
    { text: decor ? `${decor === 2 ? 'Decorations' : 'A decoration'} to explore` : 'Nothing to explore: a decoration would help', good: decor > 0 },
    { text: bond >= KNOWS_KESTREL ? 'Knows Kestrel and swims to greet him' : bond > 0 ? 'Getting to know Kestrel' : 'Hand-feed it now and then to win its trust', good: bond >= KNOWS_KESTREL },
  ];
  const label = value >= CONTENT_AT ? 'Content' : value >= 0.65 ? 'Settled' : value >= UNSETTLED_AT ? 'Restless' : 'Unhappy';
  return { value, label, notes };
}

/** How much more likely rare traits are for an egg from this pair: ×1 (neglected) to ×2 (content, well kept). */
export function carePower(save: SaveData, a: CreatureData, b: CreatureData): number {
  const q = (contentment(save, a).value + contentment(save, b).value) / 2;
  return 1 + Math.max(0, Math.min(1, (q - CARE_LOW) / (CARE_HIGH - CARE_LOW)));
}

/** Hand-feed one creature at the glass. Null when done, or why not. Free: a treat from Kestrel's pocket. */
export function handFeed(save: SaveData, c: CreatureData): string | null {
  if (c.stage === 'egg') return 'Eggs do not eat yet';
  const wait = handFeedWait(save, c);
  if (wait > 0) return `Still nibbling the last treat (${wait} s)`;
  c.fed = Math.min(1, c.fed + HAND_FEED_FOOD);
  c.bond = Math.min(1, (c.bond ?? 0) + BOND_PER_FEED);
  c.handFedAt = save.playSeconds;
  return null;
}
/** Seconds until it will take another treat (0: now). */
export function handFeedWait(save: SaveData, c: CreatureData): number {
  if (c.handFedAt === undefined) return 0;
  return Math.max(0, Math.ceil(HAND_FEED_COOLDOWN - (save.playSeconds - c.handFedAt)));
}

// ---- Phase 21: the reserve, moving creatures, and "care for all" ----
/** Creatures the reserve holds. They rest there with no care needed and aren't on show. */
export const RESERVE_CAP = 30;
/** The reserve is the Hatchery's cold holding bay: open once a Hatchery is built. */
export function reserveOpen(layout: BaseLayout): boolean {
  return layout.pieces.some((p) => p.kind === 'hatch' && isDone(p));
}
/** Every creature you keep, wherever it is (tanks, reserve, Hatchery, rare eggs waiting, the jar). */
export function allKept(save: SaveData): CreatureData[] {
  const jar = [save.jar?.keep, save.jar2?.keep].filter((c): c is CreatureData => !!c);
  return [...save.creatures, ...(save.reserve ?? []), ...save.nursery, ...(save.gifts ?? []), ...jar];
}
/**
 * Move a creature from a tank or the reserve into another tank or the reserve.
 * Null when done, or why not (nothing changes then).
 */
export function moveCreature(save: SaveData, layout: BaseLayout, id: number, to: number | 'reserve'): string | null {
  const inTank = save.creatures.find((c) => c.id === id);
  const inRes = (save.reserve ?? []).find((c) => c.id === id);
  const c = inTank ?? inRes;
  if (!c) return 'It is not in a tank or the reserve';
  if (to === 'reserve') {
    if (inRes) return 'Already resting in the reserve';
    if (!reserveOpen(layout)) return 'The reserve is part of the Creature room: build one first';
    if ((save.reserve ?? []).length >= RESERVE_CAP) return `The reserve is full (${RESERVE_CAP})`;
    save.creatures = save.creatures.filter((x) => x.id !== id);
    c.tank = -2;
    (save.reserve ??= []).push(c);
    return null;
  }
  if (inTank && inTank.tank === to) return 'Already in that tank';
  if (!tanks(layout).some((t) => t.id === to)) return 'No such tank';
  if (creaturesIn(save, to).length >= tankCapacity(layout, to, save)) return 'That tank is full';
  if (inRes) {
    save.reserve = (save.reserve ?? []).filter((x) => x.id !== id);
    save.creatures.push(c);
    // A rested creature settles in again, but isn't hungry or sick from the reserve.
    c.fed = Math.max(c.fed, 0.75);
  }
  c.tank = to;
  c.comfort = Math.min(c.comfort, 0.5);
  return null;
}

/**
 * "Care for all": feed every tank whose creatures are getting hungry (1 kelp fibre each, as
 * the Feed button) and scrub every tank's glass. Tanks it can't afford to feed are counted.
 */
export function careForAll(save: SaveData, layout: BaseLayout): { fed: number; cleaned: number; short: number } {
  let fed = 0;
  let cleaned = 0;
  let short = 0;
  for (const t of tanks(layout)) {
    const eaters = creaturesIn(save, t.id).filter((c) => c.stage !== 'egg');
    const td = tankDataFor(save, t.id);
    if (eaters.length && td.water < 0.95) {
      td.water = Math.min(1, td.water + CLEAN_AMOUNT);
      cleaned++;
    }
    if (!eaters.some((c) => c.fed < 0.8)) continue;
    if (!payCost(save, { fibre: 1 })) {
      short++;
      continue;
    }
    for (const c of eaters) c.fed = Math.min(1, c.fed + FEED_AMOUNT);
    fed++;
  }
  return { fed, cleaned, short };
}

/**
 * Colin (after Session B), the Creature room: feed one tank from its console (1 kelp fibre,
 * as at a Habitat console). Null when done, or why not.
 */
export function feedTank(save: SaveData, tankId: number): string | null {
  const eaters = creaturesIn(save, tankId).filter((c) => c.stage !== 'egg');
  if (!eaters.length) return 'Nobody in this tank eats yet';
  if (!eaters.some((c) => c.fed < 0.95)) return 'They have all eaten';
  if (!payCost(save, { fibre: 1 })) return 'Feeding takes 1 kelp fibre';
  for (const c of eaters) c.fed = Math.min(1, c.fed + FEED_AMOUNT);
  return null;
}
/** ...and scrub one tank's water. Null when done, or why not. */
export function cleanTank(save: SaveData, tankId: number): string | null {
  const td = tankDataFor(save, tankId);
  if (td.water >= 0.99) return 'The water is already clean';
  td.water = Math.min(1, td.water + CLEAN_AMOUNT);
  return null;
}
