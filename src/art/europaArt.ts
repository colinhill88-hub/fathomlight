import { Texture } from 'pixi.js';
import { loadImage } from './creatureArt';

/**
 * Beyond Earth (Nov 28, 2026): Colin's painted Europa art (src/art/europa/ and src/art/voyage/;
 * the Petrel works room's props are in src/art/interior/works_* and load with the rest of the
 * interior art, in propArt.ts). Prepared offline by
 * scripts/prep-europa-art.py (keyed and re-encoded), so they load as they are: no runtime
 * key-out, and the zone layers keep their full frame so they line up.
 *
 * Loaded only when they are first needed (a voyage starts, or a save on Europa loads), so
 * players who haven't reached Europa don't download them. Anything missing simply leaves the
 * code-drawn version in place.
 */
export type EuropaArtKey =
  | 'ice_bg' | 'ice_mid' | 'ice_fg' | 'passage_bg' | 'passage_mid' | 'passage_fg'
  | 'floes_bg' | 'floes_sky' | 'floes_mid' | 'floes_fg' | 'deep_bg' | 'deep_mid' | 'deep_fg'
  | 'blackwater' | 'jupiter'
  | 'hab' | 'still' | 'bell' | 'glyph_stand' | 'glyph_hang' | 'floe' | 'floe_thin' | 'brine_pool'
  | 'vent_cold' | 'vent_lit' | 'hearth' | 'kin_gate' | 'kin' | 'rime' | 'brine' | 'frond'
  | 'moth' | 'moth_glow' | 'glasshorn' | 'glasshorn_glow' | 'krill' | 'krill_glow'
  | 'floe_ray' | 'floe_ray_glow' | 'ray_saddle' | 'ray_bladder' | 'ray_crest' | 'ray_gland';
export type VoyageArtKey = 'dusk' | 'space' | 'moon' | 'ice';

export interface EuropaArt {
  europa: Partial<Record<EuropaArtKey, Texture>>;
  voyage: Partial<Record<VoyageArtKey, Texture>>;
  /** The voyage paintings as images, for the voyage scene's 2D canvas. */
  voyageImg: Partial<Record<VoyageArtKey, HTMLImageElement>>;
}

const europaFiles = import.meta.glob<string>('./europa/*.webp', { eager: true, import: 'default', query: '?url&no-inline' });
const voyageFiles = import.meta.glob<string>('./voyage/*.webp', { eager: true, import: 'default', query: '?url&no-inline' });

const byName = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace(/\.webp$/, ''), url]));

let loading: Promise<EuropaArt> | null = null;
let loaded: EuropaArt | null = null;

async function loadAll<K extends string>(files: Record<string, string>): Promise<{ tex: Partial<Record<K, Texture>>; img: Partial<Record<K, HTMLImageElement>> }> {
  const tex: Partial<Record<K, Texture>> = {};
  const img: Partial<Record<K, HTMLImageElement>> = {};
  await Promise.all(
    Object.entries(byName(files)).map(async ([name, url]) => {
      try {
        const im = await loadImage(url);
        img[name as K] = im;
        tex[name as K] = Texture.from(im);
      } catch {
        /* missing or broken: the code-drawn version stays */
      }
    }),
  );
  return { tex, img };
}

/** Start (or join) loading the Europa art. Safe to call many times. */
export function loadEuropaArt(): Promise<EuropaArt> {
  if (!loading) {
    loading = Promise.all([loadAll<EuropaArtKey>(europaFiles), loadAll<VoyageArtKey>(voyageFiles)]).then(([e, v]) => {
      loaded = { europa: e.tex, voyage: v.tex, voyageImg: v.img };
      return loaded;
    });
  }
  return loading;
}

/** The art, if it has finished loading. */
export function europaArt(): EuropaArt | null {
  return loaded;
}
