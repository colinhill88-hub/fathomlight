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
export type VehicleArtKey = 'sub' | 'drone' | 'buoy' | 'buoy_anchor';
export type BaseArtKey =
  | 'dome' | 'dock' | 'bedroom' | 'lab' | 'workshop' | 'nursery' | 'turbine' | 'portal'
  | 'corridor' | 'junction' | 'storage' | 'thermal' | 'hatch' | 'farm' | 'revive' | 'signal'
  | 'filter' | 'feeder' | 'press' | 'sorter' | 'recomp' | 'crane' | 'lantern' | 'works';
export type FoeArtKey = 'tick' | 'drone' | 'keeper';
export type KestrelArtKey =
  | 'head' | 'torso' | 'chest' | 'pelvis' | 'pack' | 'pack_single' | 'pack_quad'
  | 'upper_arm' | 'forearm' | 'forearm_sleeve' | 'hand'
  | 'thigh' | 'shin' | 'fin' | 'fin_walk' | 'boot' | 'fin_blade'
  | 'joint_shoulder' | 'joint_knee'
  | 'jar' | 'thruster' | 'thruster_mk2' | 'harpoon'
  | 'rivet' | 'rivet_bolt' | 'dart' | 'stun_dart' | 'flare' | 'resonator' | 'magboots' | 'satchel'
  | 'lamp' | 'hose';
export type WreckArtKey = 'fulmar' | 'corvina' | 'barge' | 'trawler';
export type InteriorArtKey =
  | 'console_habitat' | 'tray_collection' | 'crate'
  | 'airlock' | 'bunk' | 'planner' | 'galley'
  | 'lab_bench' | 'workshop_bench' | 'hatch_cradle' | 'hatch_console'
  | 'revive_pool' | 'signal_dish' | 'recomp_chamber' | 'farm_trough' | 'filter_vat' | 'crane_cradle' | 'press_frame' | 'press_ram' | 'feeder_hopper' | 'feeder_mash'
  | 'works_lathe' | 'works_model' | 'works_hoist'
  | 'wall_bulkhead' | 'deck_grate' | 'ladder_rung' | 'logbook';
export type PickupArtKey = 'scrap' | 'copper' | 'quartz' | 'fibre' | 'resin' | 'moss' | 'brass' | 'bloom' | 'ore';
export type BottomArtKey = 'lily' | 'sponge' | 'worm' | 'star' | 'pen';
export type LandmarkArtKey = 'sled' | 'beacon' | 'lode' | 'cache' | 'winch' | 'winch_wheel' | 'mooring_buoy' | 'relay_buoy' | 'welder_crate' | 'nursery_crate' | 'probe' | 'shelf_shallows' | 'shelf_kelp' | 'shelf_trench' | 'shelf_sanctum'
  | 'petrel_platform' | 'petrel_1' | 'petrel_2' | 'petrel_3' | 'petrel_4' | 'petrel_5';

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
  landmarks: Partial<Record<LandmarkArtKey, Texture>>;
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
const landmarkFiles = import.meta.glob<string>('./landmarks/*.{webp,jpg,png}', { eager: true, import: 'default', query: '?url&no-inline' });

let activePropArt: PropArt = { kestrel: {}, vehicles: {}, base: {}, wrecks: {}, interior: {}, decor: {}, foes: {}, pickups: {}, bottom: {}, landmarks: {} };

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
  _mipmaps: boolean,
): Promise<Partial<Record<K, Texture>>> {
  const entries = await Promise.all(
    keys.map(async (key) => {
      const url = findUrl(globMap, prefix, key);
      if (!url) return null;
      try {
        const img = await loadImage(url);
        if (prefix === 'interior' && (key === 'wall_bulkhead' || key === 'deck_grate')) {
          const tmp = document.createElement('canvas');
          const sc = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
          const tw = Math.max(1, Math.round(img.naturalWidth * sc));
          const th = Math.max(1, Math.round(img.naturalHeight * sc));
          tmp.width = tw;
          tmp.height = th;
          const tctx = tmp.getContext('2d')!;
          tctx.drawImage(img, 0, 0, tw, th);
          let y0 = 0;
          let y1 = th - 1;
          if (key === 'deck_grate') {
            // Trim any pure-white top/bottom margins from horizontal deck strips so they tile cleanly.
            const px = tctx.getImageData(0, 0, tw, th).data;
            const rowIsWhite = (y: number): boolean => {
              let whiteCount = 0;
              for (let x = 0; x < tw; x++) {
                const o = (y * tw + x) * 4;
                if (px[o] >= 242 && px[o + 1] >= 242 && px[o + 2] >= 242) whiteCount++;
              }
              return whiteCount >= tw * 0.85;
            };
            while (y0 < y1 && rowIsWhite(y0)) y0++;
            while (y1 > y0 && rowIsWhite(y1)) y1--;
          }
          const ch = Math.max(1, y1 - y0 + 1);
          const canvas = document.createElement('canvas');
          canvas.width = tw;
          canvas.height = ch;
          canvas.getContext('2d')!.drawImage(tmp, 0, y0, tw, ch, 0, 0, tw, ch);
          const tex = Texture.from({ resource: canvas, autoGenerateMipmaps: true });
          tex.source.style.addressMode = 'repeat';
          return [key, tex] as const;
        }
        const stripHoles = !(prefix === 'kestrel' && key === 'head');
        return [key, keyOutWhiteAndCrop(img, true, maxDim, stripHoles)] as const;
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
  'head', 'torso', 'chest', 'pelvis', 'pack', 'pack_single', 'pack_quad',
  'upper_arm', 'forearm', 'forearm_sleeve', 'hand',
  'thigh', 'shin', 'fin', 'fin_walk', 'boot', 'fin_blade',
  'joint_shoulder', 'joint_knee',
  'jar', 'thruster', 'thruster_mk2', 'harpoon',
  'rivet', 'rivet_bolt', 'dart', 'stun_dart', 'flare', 'resonator', 'magboots', 'satchel',
  'lamp', 'hose',
];
const VEHICLE_KEYS: readonly VehicleArtKey[] = ['sub', 'drone', 'buoy', 'buoy_anchor'];
const BASE_KEYS: readonly BaseArtKey[] = [
  'dome', 'dock', 'bedroom', 'lab', 'workshop', 'nursery', 'turbine', 'portal',
  'corridor', 'junction', 'storage', 'thermal', 'hatch', 'farm', 'revive', 'signal',
  'filter', 'feeder', 'press', 'sorter', 'recomp', 'crane', 'lantern', 'works',
];
const WRECK_KEYS: readonly WreckArtKey[] = ['fulmar', 'corvina', 'barge', 'trawler'];
const INTERIOR_KEYS: readonly InteriorArtKey[] = [
  'console_habitat', 'tray_collection', 'crate',
  'airlock', 'bunk', 'planner', 'galley',
  'lab_bench', 'workshop_bench', 'hatch_cradle', 'hatch_console',
  'revive_pool', 'signal_dish', 'recomp_chamber', 'farm_trough', 'filter_vat', 'crane_cradle', 'press_frame', 'press_ram', 'feeder_hopper', 'feeder_mash',
  'wall_bulkhead', 'deck_grate', 'ladder_rung', 'logbook',
  'works_lathe', 'works_model', 'works_hoist',
];
const DECOR_KEYS: readonly DecorId[] = [
  'arch', 'amphora', 'helmet', 'chest', 'driftwood', 'clam', 'lantern', 'wheel',
  'cairn', 'floats', 'anchor', 'bell', 'coralarch', 'astrolabe', 'belljar', 'kelplantern',
];
const FOE_KEYS: readonly FoeArtKey[] = ['tick', 'drone', 'keeper'];
const PICKUP_KEYS: readonly PickupArtKey[] = ['scrap', 'copper', 'quartz', 'fibre', 'resin', 'moss', 'brass', 'bloom', 'ore'];
const BOTTOM_KEYS: readonly BottomArtKey[] = ['lily', 'sponge', 'worm', 'star', 'pen'];
const LANDMARK_KEYS: readonly LandmarkArtKey[] = ['sled', 'beacon', 'lode', 'cache', 'winch', 'winch_wheel', 'mooring_buoy', 'relay_buoy', 'welder_crate', 'nursery_crate', 'probe', 'shelf_shallows', 'shelf_kelp', 'shelf_trench', 'shelf_sanctum', 'petrel_platform', 'petrel_1', 'petrel_2', 'petrel_3', 'petrel_4', 'petrel_5'];

export async function loadPropArt(mipmaps = false): Promise<PropArt> {
  const [kestrel, vehicles, base, wrecks, interior, decor, foes, pickups, bottom, landmarks] = await Promise.all([
    loadGroup(kestrelFiles, 'kestrel', KESTREL_KEYS, 320, mipmaps),
    loadGroup(vehicleFiles, 'vehicles', VEHICLE_KEYS, 384, mipmaps),
    loadGroup(baseFiles, 'base', BASE_KEYS, 512, mipmaps),
    loadGroup(wreckFiles, 'wrecks', WRECK_KEYS, 960, mipmaps),
    loadGroup(interiorFiles, 'interior', INTERIOR_KEYS, 384, mipmaps),
    loadGroup(decorFiles, 'decor', DECOR_KEYS, 220, mipmaps),
    loadGroup(foeFiles, 'foes', FOE_KEYS, 320, mipmaps),
    loadGroup(pickupFiles, 'pickups', PICKUP_KEYS, 180, mipmaps),
    loadGroup(bottomFiles, 'bottom', BOTTOM_KEYS, 200, mipmaps),
    loadGroup(landmarkFiles, 'landmarks', LANDMARK_KEYS, 512, mipmaps),
  ]);
  activePropArt = { kestrel, vehicles, base, wrecks, interior, decor, foes, pickups, bottom, landmarks };
  return activePropArt;
}
