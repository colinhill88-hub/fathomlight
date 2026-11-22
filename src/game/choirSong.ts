import { allKept, SPECIES, SPECIES_ORDER } from './creatures';
import { book, FORMS, formsOf } from './collection';
import type { CreatureData, SaveData, SpeciesId } from './state';
import { PATTERNS, RARE_COLOUR, traitsOf, WILD_PATTERNS } from './traits';

/**
 * Phase 23: the Choir's answer grows with your collection (Colin, Nov 22, 2026: "richer,
 * same story"). No drawing here, just the rule (Node-tested in scripts/test-rarity.mjs);
 * src/ui/contact.ts plays it.
 *
 * At first contact the Choir sings back every glow pattern you have raised (the book's
 * pages, not only what is in the tanks today). How varied and rare the collection is
 * sets a richness from 0 to 1, in four tiers:
 *  - 0: as before (a few patterns): its own colours, its own notes.
 *  - 1: it takes on your creatures' glow colours as it names them, with a soft harmony.
 *  - 2: an extra ring of your colours, a held chord under the naming, sparkles for rare kinds.
 *  - 3: all of it, and it sings the rarest back with a shimmer of its own.
 * An outstanding collection gets one special line at the end.
 *
 * A raised creature carried in the jar (optional) is a companion: it joins the call and
 * answer with a moment of its own. Without one the ending plays as it always has.
 */

/** Each species' glow colour, for the Choir to sing back (warm, as the creatures' are). */
export const SPECIES_GLOW: Record<SpeciesId, number> = {
  glowfin: 0xfff2a8,
  puffcap: 0xffd9a0,
  ray: 0xffe0a0,
  crab: 0xffc860,
  shrimp: 0xffd070,
  snail: 0xff9a4a,
  eel: 0xffa04a,
  horse: 0xfff0c0,
};

export interface SongWord {
  /** "Glowfin · banded". */
  name: string;
  species: SpeciesId;
  pattern: number;
  /** The glow colour it is sung in. */
  colour: number;
  /** Raised in a rare kind (the rare colour, the bred-only pattern, radiant, the rare shape). */
  rare: boolean;
  /** An heirloom line or Choir-touched one of this species has been raised. */
  legendary: boolean;
}

export interface ChoirSong {
  words: SongWord[];
  /** Species raised (with at least one kind in the book). */
  species: number;
  /** Kinds (species × colour × pattern) in the book. */
  kinds: number;
  /** Rare kinds and rare forms raised. */
  rare: number;
  /** Heirloom and Choir-touched forms raised. */
  legendary: number;
  /** 0..1. */
  richness: number;
  tier: 0 | 1 | 2 | 3;
  /** An outstanding collection: the special line. */
  outstanding: boolean;
}

export const OUTSTANDING_LINE =
  'Then it sings one last phrase you have never heard: every colour you ever raised, all at once, and holds it. Somehow you understand that no one has brought it so much life before.';

/** The Choir's song for this save. */
export function choirSong(save: SaveData): ChoirSong {
  const b = book(save);
  const forms = save.bookForms ?? {};
  const words: SongWord[] = [];
  let kinds = 0;
  let rare = 0;
  let legendary = 0;
  let species = 0;
  for (const sp of SPECIES_ORDER) {
    const keys = Object.keys(b).filter((k) => k.startsWith(`${sp}:`));
    if (!keys.length) continue;
    species++;
    kinds += keys.length;
    const leg = FORMS.filter((f) => (f === 'heirloom' || f === 'choir') && forms[`${sp}:${f}`]).length;
    legendary += leg;
    rare += forms[`${sp}:shape2`] ? 1 : 0;
    const pats = new Set<number>();
    for (const k of keys) {
      const [, col, pat] = k.split(':').map(Number);
      const isRare = col === RARE_COLOUR || pat >= WILD_PATTERNS || !!b[k].radiant;
      if (isRare) rare++;
      pats.add(pat);
    }
    for (const pat of [...pats].sort()) {
      const rareHere = keys.some((k) => {
        const [, col, p] = k.split(':').map(Number);
        return p === pat && (col === RARE_COLOUR || p >= WILD_PATTERNS || !!b[k].radiant);
      });
      words.push({ name: `${SPECIES[sp].name} · ${PATTERNS[sp][pat]}`, species: sp, pattern: pat, colour: SPECIES_GLOW[sp], rare: rareHere, legendary: leg > 0 });
    }
  }
  const richness = Math.min(1,
    0.3 * (species / SPECIES_ORDER.length) +
    0.35 * Math.min(1, kinds / 40) +
    0.2 * Math.min(1, rare / 12) +
    0.15 * Math.min(1, legendary / 2));
  const tier = (richness < 0.25 ? 0 : richness < 0.5 ? 1 : richness < 0.75 ? 2 : 3) as ChoirSong['tier'];
  const outstanding = species >= 6 && kinds >= 30 && (legendary >= 1 || rare >= 10);
  return { words, species, kinds, rare, legendary, richness, tier, outstanding };
}

/** A companion for the ending: a raised creature (from the tanks) carried in the jar or satchel. */
export function companion(save: SaveData): CreatureData | null {
  for (const j of [save.jar, save.jar2]) if (j?.keep && j.stage !== 'egg') return j.keep;
  return null;
}

/** What the companion brings to the song: its pattern's name and colour, and how special it is. */
export function companionWord(c: CreatureData): SongWord {
  const t = traitsOf(c);
  return {
    name: `${SPECIES[c.species].name} · ${PATTERNS[c.species][t.pattern]}`,
    species: c.species,
    pattern: t.pattern,
    colour: SPECIES_GLOW[c.species],
    rare: t.colour === RARE_COLOUR || t.pattern >= WILD_PATTERNS || !!t.radiant || t.shape === 2,
    legendary: !!t.heirloom || !!t.choir,
  };
}

/** Everything kept that is Choir-touched (for the post-contact notes). */
export function choirTouched(save: SaveData): CreatureData[] {
  return allKept(save).filter((c) => formsOf(traitsOf(c)).includes('choir'));
}
