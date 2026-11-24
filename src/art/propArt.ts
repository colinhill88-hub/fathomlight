import { Texture } from 'pixi.js';
import type { DecorId } from '../game/state';
import { keyOutWhiteAndCrop, loadImage } from './creatureArt';

/**
 * Painted 2D cutout textures for Kestrel, vehicles, base modules, wrecks,
 * interior consoles/trays, tank decor, and wreck combat machines (Colin, Nov 23, 2026).
 *
 * Uses the same 4-corner white-background flood-fill & tight crop as creatureArt.
 * Supports `.webp`, `.jpg`, and `.png`. Missing files or `?art=procedural` fall
 * back cleanly to the code-drawn art.
 */
export type VehicleArtKey = 'sub' | 'drone' | 'buoy';
export type BaseArtKey =
  | 'dome' | 'dock' | 'lab' | 'workshop' | 'nursery' | 'turbine' | 'portal'
  | 'corridor' | 'junction' | 'storage' | 'thermal' | 'hatch' | 'farm' | 'revive' | 'signal'
  | 'filter' | 'feeder' | 'press';
export type FoeArtKey = 'tick' | 'drone' | 'keeper';
export type KestrelArtKey =
  | 'head' | 'torso' | 'pack' | 'pack_single' | 'pack_quad'
  | 'upper_arm' | 'forearm' | 'thigh' | 'shin' | 'fin' | 'fin_walk'
  | 'jar' | 'thruster' | 'thruster_mk2' | 'harpoon'
  | 'rivet' | 'dart' | 'flare' | 'resonator' | 'magboots' | 'satchel'
  | 'lamp' | 'hose';
export type WreckArtKey = 'fulmar' | 'corvina';
export type InteriorArtKey =
  | 'console_habitat' | 'tray_collection' | 'crate'
  | 'airlock' | 'bunk' | 'planner' | 'galley'
  | 'lab_bench' | 'workshop_bench' | 'hatch_cradle' | 'hatch_console'
  | 'revive_pool' | 'signal_dish' | 'recomp_chamber' | 'farm_trough' | 'filter_vat' | 'crane_cradle';
export type PickupArtKey = 'scrap' | 'copper' | 'quartz' | 'fibre' | 'resin' | 'moss' | 'brass' | 'bloom' | 'ore';
export type BottomArtKey = 'lily' | 'sponge' | 'worm' | 'star' | 'pen';

export interface PropArt {
  kestrel: Partial<Record<KestrelArtKey, Texture>>;
  vehicles: Partial<Record<VehicleArtKey, Texture>>;
  base: Partial<Record<BaseArtKey, Texture>>;
  wrecks: Partial<Record<WreckArtKey, Texture>>;
  interior: Partial<Record<InteriorArtKey, Texture>>;
  decor: Partial<Record<DecorId, Texture>>;
  foes: Partial<Record<FoeArtKey, Texture>>;
  pickups: Partial<Record<PickupArtKey, Texture>>;
  bottom: Partial<Record<BottomArtKey, Texture>>;
}

const kestrelFiles = import.meta.glob<string>('./kestrel/*.{webp,jpg,png}', { eager: true, import: 'default', query: '?url&no-inline' });
const vehicleFiles = import.meta.glob<string>('./vehicles/*.{webp,jpg,png}', { eager: true, import: 'default', query: '?url&no-inline' });
const baseFiles = import.meta.glob<string>('./base/*.{webp,jpg,png}', { eager: true, import: 'default', query: '?url&no-inline' });
const wreckFiles = import.meta.glob<string>('./wrecks/*.{webp,jpg,png}', { eager: true, import: 'default', query: '?url&no-inline' });
const interiorFiles = import.meta.glob<string>('./interior/*.{webp,jpg,png}', { eager: true, import: 'default', query: '?url&no-inline' });
const decorFiles = import.meta.glob<string>('./decor/*.{webp,jpg,png}', { eager: true, import: 'default', query: '?url&no-inline' });
const foeFiles = import.meta.glob<string>('./foes/*.{webp,jpg,png}', { eager: true, import: 'default', query: '?url&no-inline' });
const pickupFiles = import.meta.glob<string>('./pickups/*.{webp,jpg,png}', { eager: true, import: 'default', query: '?url&no-inline' });
const bottomFiles = import.meta.glob<string>('./bottom/*.{webp,jpg,png}', { eager: true, import: 'default', query: '?url&no-inline' });

let activePropArt: PropArt = { kestrel: {}, vehicles: {}, base: {}, wrecks: {}, interior: {}, decor: {}, foes: {}, pickups: {}, bottom: {} };

/** Current loaded painted prop textures (empty when `?art=procedural` is active). */
export function getPropArt(): PropArt {
  return activePropArt;
}

function findUrl(globMap: Record<string, string>, prefix: string, key: string): string | undefined {
  return globMap[`./${prefix}/${key}.webp`] ?? globMap[`./${prefix}/${key}.jpg`] ?? globMap[`./${prefix}/${key}.png`];
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
      const url = findUrl(globMap, prefix, key);
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

const KESTREL_KEYS: readonly KestrelArtKey[] = [
  'head', 'torso', 'pack', 'pack_single', 'pack_quad',
  'upper_arm', 'forearm', 'thigh', 'shin', 'fin', 'fin_walk',
  'jar', 'thruster', 'thruster_mk2', 'harpoon',
  'rivet', 'dart', 'flare', 'resonator', 'magboots', 'satchel',
  'lamp', 'hose',
];
const VEHICLE_KEYS: readonly VehicleArtKey[] = ['sub', 'drone', 'buoy'];
const BASE_KEYS: readonly BaseArtKey[] = [
  'dome', 'dock', 'lab', 'workshop', 'nursery', 'turbine', 'portal',
  'corridor', 'junction', 'storage', 'thermal', 'hatch', 'farm', 'revive', 'signal',
  'filter', 'feeder', 'press',
];
const WRECK_KEYS: readonly WreckArtKey[] = ['fulmar', 'corvina'];
const INTERIOR_KEYS: readonly InteriorArtKey[] = [
  'console_habitat', 'tray_collection', 'crate',
  'airlock', 'bunk', 'planner', 'galley',
  'lab_bench', 'workshop_bench', 'hatch_cradle', 'hatch_console',
  'revive_pool', 'signal_dish', 'recomp_chamber', 'farm_trough', 'filter_vat', 'crane_cradle',
];
const DECOR_KEYS: readonly DecorId[] = [
  'arch', 'amphora', 'helmet', 'chest', 'driftwood', 'clam', 'lantern', 'wheel',
  'cairn', 'floats', 'anchor', 'bell', 'coralarch', 'astrolabe', 'belljar', 'kelplantern',
];
const FOE_KEYS: readonly FoeArtKey[] = ['tick', 'drone', 'keeper'];
const PICKUP_KEYS: readonly PickupArtKey[] = ['scrap', 'copper', 'quartz', 'fibre', 'resin', 'moss', 'brass', 'bloom', 'ore'];
const BOTTOM_KEYS: readonly BottomArtKey[] = ['lily', 'sponge', 'worm', 'star', 'pen'];

export async function loadPropArt(mipmaps = false): Promise<PropArt> {
  const [kestrel, vehicles, base, wrecks, interior, decor, foes, pickups, bottom] = await Promise.all([
    loadGroup(kestrelFiles, 'kestrel', KESTREL_KEYS, 320, mipmaps),
    loadGroup(vehicleFiles, 'vehicles', VEHICLE_KEYS, 384, mipmaps),
    loadGroup(baseFiles, 'base', BASE_KEYS, 512, mipmaps),
    loadGroup(wreckFiles, 'wrecks', WRECK_KEYS, 960, mipmaps),
    loadGroup(interiorFiles, 'interior', INTERIOR_KEYS, 384, mipmaps),
    loadGroup(decorFiles, 'decor', DECOR_KEYS, 220, mipmaps),
    loadGroup(foeFiles, 'foes', FOE_KEYS, 320, mipmaps),
    loadGroup(pickupFiles, 'pickups', PICKUP_KEYS, 180, mipmaps),
    loadGroup(bottomFiles, 'bottom', BOTTOM_KEYS, 200, mipmaps),
  ]);
  activePropArt = { kestrel, vehicles, base, wrecks, interior, decor, foes, pickups, bottom };
  return activePropArt;
}
