import { Matrix, Rectangle, Texture, type FillStyle } from 'pixi.js';
import { loadImageTexture } from './imageAssets';

const files = import.meta.glob<string>('./painterly-world/*.{webp,jpg}', { eager: true, import: 'default', query: '?url&no-inline' });

const plates = ['basin', 'basin-east', 'meadow', 'reeftop', 'grotto-mid', 'cliff', 'forest-east', 'shelf', 'shelf-east', 'trench', 'trench-mid', 'abyss', 'caves', 'sanctum'] as const;
const materials = ['shale', 'limestone', 'grotto', 'forest', 'silt', 'basalt', 'cave', 'nacre', 'kestrel', 'corvina', 'fulmar', 'heart'] as const;
type Plate = typeof plates[number];
export type Material = typeof materials[number];

export interface WorldArt {
  plates: Partial<Record<Plate, Texture>>;
  materials: Partial<Record<Material, Texture>>;
  life: readonly (Texture | undefined)[];
  reef: readonly (Texture | undefined)[];
  debris: readonly (Texture | undefined)[];
  forestKelp: readonly Texture[];
}

async function optionalTexture(name: string, width: number, height: number): Promise<Texture | undefined> {
  const url = files[`./painterly-world/${name}.webp`] ?? files[`./painterly-world/${name}.jpg`];
  if (!url) return undefined;
  try {
    return await loadImageTexture(url, width, height);
  } catch (error) {
    console.warn(`World artwork ${name} could not be loaded. Using the existing scenery.`, error);
    return undefined;
  }
}

export async function loadWorldArt(mipmaps = false): Promise<WorldArt> {
  const [backdrops, surfaces, shore, deep, reef, debris, ribbons] = await Promise.all([
    Promise.all(plates.map(async (name) => [name, await optionalTexture(name, 1536, 768)] as const)),
    Promise.all(materials.map(async (name) => [name, await optionalTexture(name, 512, 512)] as const)),
    optionalTexture('shore-life', 768, 768),
    optionalTexture('deep-life', 768, 768),
    optionalTexture('littoral-reef', 768, 768),
    optionalTexture('shelf-debris', 768, 768),
    optionalTexture('forest-ribbons', 512, 336),
  ]);
  const tiles = (atlas: Texture | undefined) => Array.from({ length: 4 }, (_, index) => atlas && new Texture({
    source: atlas.source,
    frame: new Rectangle((index % 2) * 384, Math.floor(index / 2) * 384, 384, 384),
  }));
  const forestKelp: Texture[] = [];
  if (ribbons) {
    ribbons.source.resolution = 2;
    for (let row = 0; row < 3; row++) {
      forestKelp.push(new Texture({ source: ribbons.source, frame: new Rectangle(0, row * 56, 256, 56) }));
    }
  }
  for (const [, texture] of surfaces) {
    if (texture) {
      texture.source.style.addressMode = 'repeat';
      texture.source.autoGenerateMipmaps = mipmaps;
    }
  }
  if (mipmaps) for (const [, texture] of backdrops) if (texture) texture.source.autoGenerateMipmaps = true;
  return {
    plates: Object.fromEntries(backdrops), materials: Object.fromEntries(surfaces),
    life: [...tiles(shore), ...tiles(deep)], reef: tiles(reef), debris: tiles(debris), forestKelp,
  };
}

/** Artwork follows the caller's existing polygon, in the caller's lit coordinate space. */
export function materialFill(texture: Texture | undefined, color: number, alpha: number, width: number, height: number, x = 0, y = 0): FillStyle {
  if (!texture) return { color, alpha };
  return { texture, alpha, textureSpace: 'global', matrix: new Matrix(width / texture.width, 0, 0, height / texture.height, x, y) };
}
