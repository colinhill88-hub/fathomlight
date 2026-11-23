import { Texture } from 'pixi.js';
import type { DecorId } from '../game/state';
import { keyOutWhiteAndCrop, loadImage } from './creatureArt';

/**
 * Painted 2D cutout textures for vehicles, hero base modules, tank decor, and
 * wreck combat machines (Colin, Nov 23, 2026).
 *
 * Uses the same 4-corner white-background flood-fill & tight crop as creatureArt.
 * Missing files or `?art=procedural` fall back cleanly to the code-drawn art.
 */
export type VehicleArtKey = 'sub' | 'drone' | 'buoy';
export type BaseArtKey = 'dome' | 'dock' | 'lab' | 'workshop' | 'nursery' | 'turbine' | 'portal';
export type FoeArtKey = 'tick' | 'drone' | 'keeper';

export interface PropArt {
  vehicles: Partial<Record<VehicleArtKey, Texture>>;
  base: Partial<Record<BaseArtKey, Texture>>;
  decor: Partial<Record<DecorId, Texture>>;
  foes: Partial<Record<FoeArtKey, Texture>>;
}

const vehicleWebps = import.meta.glob<string>('./vehicles/*.webp', { eager: true, import: 'default', query: '?url&no-inline' });
const baseWebps = import.meta.glob<string>('./base/*.webp', { eager: true, import: 'default', query: '?url&no-inline' });
const decorWebps = import.meta.glob<string>('./decor/*.webp', { eager: true, import: 'default', query: '?url&no-inline' });
const foeWebps = import.meta.glob<string>('./foes/*.webp', { eager: true, import: 'default', query: '?url&no-inline' });

let activePropArt: PropArt = { vehicles: {}, base: {}, decor: {}, foes: {} };

/** Current loaded painted prop textures (empty when `?art=procedural` is active). */
export function getPropArt(): PropArt {
  return activePropArt;
}

async function loadGroup<K extends string>(
  globMap: Record<string, string>,
  prefix: string,
  keys: readonly K[],
  maxDim: number,
  mipmaps: boolean,
): Promise<Partial<Record<K, Texture>>> {
  const entries = await Promise.all(
    keys.map(async (key) => {
      const url = globMap[`./${prefix}/${key}.webp`];
      if (!url) return null;
      try {
        const img = await loadImage(url);
        return [key, keyOutWhiteAndCrop(img, mipmaps, maxDim)] as const;
      } catch {
        return null;
      }
    }),
  );
  const out: Partial<Record<K, Texture>> = {};
  for (const e of entries) if (e) out[e[0]] = e[1];
  return out;
}

const VEHICLE_KEYS: readonly VehicleArtKey[] = ['sub', 'drone', 'buoy'];
const BASE_KEYS: readonly BaseArtKey[] = ['dome', 'dock', 'lab', 'workshop', 'nursery', 'turbine', 'portal'];
const DECOR_KEYS: readonly DecorId[] = [
  'arch', 'amphora', 'helmet', 'chest', 'driftwood', 'clam', 'lantern', 'wheel',
  'cairn', 'floats', 'anchor', 'bell', 'coralarch', 'astrolabe', 'belljar', 'kelplantern',
];
const FOE_KEYS: readonly FoeArtKey[] = ['tick', 'drone', 'keeper'];

export async function loadPropArt(mipmaps = false): Promise<PropArt> {
  const [vehicles, base, decor, foes] = await Promise.all([
    loadGroup(vehicleWebps, 'vehicles', VEHICLE_KEYS, 384, mipmaps),
    loadGroup(baseWebps, 'base', BASE_KEYS, 512, mipmaps),
    loadGroup(decorWebps, 'decor', DECOR_KEYS, 220, mipmaps),
    loadGroup(foeWebps, 'foes', FOE_KEYS, 320, mipmaps),
  ]);
  activePropArt = { vehicles, base, decor, foes };
  return activePropArt;
}
