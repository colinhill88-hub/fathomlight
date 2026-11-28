import { Container, MeshSimple, Rectangle, Sprite, Texture } from 'pixi.js';
import { ANCHOR_X, BUOY_X, groundY, smooth } from '../world/terrain';
import { loadImageTexture, loadRgbaPngTexture } from './imageAssets';

const images = import.meta.glob<string>('./sunlit-shallows/*.png', {
  eager: true,
  import: 'default',
  query: '?url&no-inline',
});

const paintings = import.meta.glob<string>('./sunlit-shallows/*.webp', {
  eager: true,
  import: 'default',
  query: '?url&no-inline',
});

const TILE = 256;
const PADDING = 8;
const FRAME = TILE - 2 * PADDING;

export interface ReefTextures {
  coral: readonly Texture[];
  fan: readonly Texture[];
  rock: readonly Texture[];
}

interface ShallowsArt {
  far: Texture;
  mid: Texture;
  reef: ReefTextures;
}

/** All three images are optional. Publish the art only as a complete set. */
export async function loadShallowsArt(mipmaps = false): Promise<ShallowsArt | null> {
  const farUrl = images['./sunlit-shallows/reef-far.png'];
  const midUrl = images['./sunlit-shallows/reef-mid.png'];
  const atlasUrl = images['./sunlit-shallows/reef-atlas.png'];
  if (!farUrl || !midUrl || !atlasUrl) return null;

  try {
    const [far, mid, atlas] = await Promise.all([
      loadImageTexture(farUrl, 2048, 1024),
      loadImageTexture(midUrl, 2048, 1024),
      loadImageTexture(atlasUrl, 1024, 512),
    ]);
    far.source.autoGenerateMipmaps = mid.source.autoGenerateMipmaps = mipmaps;
    const frames = Array.from({ length: 8 }, (_, index) => {
      const x = (index % 4) * TILE + PADDING;
      const y = Math.floor(index / 4) * TILE + PADDING;
      return new Texture({ source: atlas.source, frame: new Rectangle(x, y, FRAME, FRAME) });
    });
    return { far, mid, reef: { coral: frames.slice(0, 3), fan: frames.slice(3, 6), rock: frames.slice(6) } };
  } catch (error) {
    console.warn('Sunlit Shallows artwork could not be loaded. Using procedural scenery.', error);
    return null;
  }
}

const SEABED_WIDTH = ANCHOR_X - BUOY_X;
const SEABED_DEPTH = 192;

export async function loadShallowsSeabed(): Promise<Texture | null> {
  const url = images['./sunlit-shallows/seabed-strip.png'];
  if (!url) return null;

  try {
    return await loadImageTexture(url, 1960, SEABED_DEPTH);
  } catch (error) {
    console.warn('Sunlit Shallows seabed artwork could not be loaded. Using procedural terrain.', error);
    return null;
  }
}

export async function loadShallowsKelp(): Promise<readonly Texture[] | null> {
  const ribbon = images['./sunlit-shallows/kelp-ribbon.png'];
  const narrow = images['./sunlit-shallows/kelp-narrow.png'];
  const torn = images['./sunlit-shallows/kelp-torn.png'];
  if (!ribbon || !narrow || !torn) return null;

  try {
    // MeshRope follows the texture's logical height. At 2x it stays 48 world units wide.
    return await Promise.all([ribbon, narrow, torn].map((url) => loadRgbaPngTexture(url, 512, 96, 2)));
  } catch (error) {
    console.warn('Sunlit Shallows kelp artwork could not be loaded. Using procedural kelp.', error);
    return null;
  }
}

/** Colin's painted near-camera kelp (Nov 28, 2026): one 1024 × 512 sheet, a cluster on its
 * left half and one on its right half (prepared by scripts/prep-earth-art.py). */
export async function loadShallowsFrontKelp(): Promise<readonly Texture[] | null> {
  const url = paintings['./sunlit-shallows/kelp-front.webp'];
  if (!url) return null;
  try {
    const sheet = await loadImageTexture(url, 1024, 512);
    return [0, 1].map((half) => new Texture({ source: sheet.source, frame: new Rectangle(half * 512, 0, 512, 512) }));
  } catch (error) {
    console.warn('Painted foreground kelp could not be loaded. Using the drawn kelp.', error);
    return null;
  }
}

/** The strip is drawn inside the existing ground silhouette at world scale. */
export function createShallowsSeabed(texture: Texture): MeshSimple {
  const step = 10;
  const inset = 2;
  const spans = Math.ceil(SEABED_WIDTH / step);
  const vertices = new Float32Array((spans + 1) * 4);
  const uvs = new Float32Array(vertices.length);
  const indices = new Uint32Array(spans * 6);
  for (let i = 0; i <= spans; i++) {
    const x = Math.min(ANCHOR_X, BUOY_X + i * step);
    const y = groundY(x);
    const u = (x - BUOY_X) / SEABED_WIDTH;
    vertices.set([x, y + inset, x, y + SEABED_DEPTH], i * 4);
    uvs.set([u, inset / SEABED_DEPTH, u, 1], i * 4);
    if (i < spans) {
      const top = i * 2;
      indices.set([top, top + 2, top + 1, top + 2, top + 3, top + 1], i * 6);
    }
  }
  const mesh = new MeshSimple({ texture, vertices, uvs, indices });
  mesh.autoUpdate = false;
  const geometry = mesh.geometry;
  mesh.once('destroyed', () => geometry.destroy(true));
  return mesh;
}

const REF_DEPTH = 260;
/** The reef paintings fade in from the base's side and out toward the channel over a long swim
 * (they used to snap in over 240 units at the buoy, which made the base-to-shallows seam jump). */
const FADE_IN = 760;
const FADE_OUT = 640;

/** Decorative plates in the backdrop pass, behind the lit world. */
export class ShallowsBackdrop {
  readonly view = new Container();
  private readonly layers: { sprite: Sprite; parallax: number; centerX: number; top: number; width: number }[];

  constructor(art: ShallowsArt) {
    this.layers = [
      // Lift the actual painted crests out from behind the terrain. The far
      // plate is hazier, with the mid reef's ledges carrying stronger values.
      { sprite: new Sprite({ texture: art.far, alpha: 0.66, tint: 0xd6e8ea }), parallax: 0.12, centerX: 1780, top: -152, width: 2100 },
      { sprite: new Sprite({ texture: art.mid, alpha: 0.88, tint: 0xa7c4c3 }), parallax: 0.42, centerX: 2020, top: -98, width: 1940 },
    ];
    for (const { sprite, width } of this.layers) {
      sprite.width = width;
      sprite.height = width / 2;
      sprite.anchor.x = 0.5;
      this.view.addChild(sprite);
    }
    this.view.visible = false;
  }

  /** The procedural ridges fade with the same coverage as the painted layer. */
  update(camX: number, camY: number, zoom: number, width: number, height: number): number {
    const edge = Math.min((camX - (BUOY_X - FADE_IN)) / FADE_IN, (ANCHOR_X + FADE_OUT - camX) / FADE_OUT);
    const coverage = smooth(edge) * smooth((1400 - height / zoom) / 440);
    this.view.visible = coverage > 0;
    if (!this.view.visible) return 0;
    this.view.alpha = coverage;
    this.view.scale.set(zoom);
    for (const { sprite, parallax, centerX, top } of this.layers) {
      sprite.position.set(
        width / (2 * zoom) + (centerX - camX) * parallax,
        height / (2 * zoom) + top - REF_DEPTH + (REF_DEPTH - camY) * parallax,
      );
    }
    return coverage;
  }
}
