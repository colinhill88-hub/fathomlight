import { Container, MeshSimple, Rectangle, Sprite, Texture } from 'pixi.js';
import { ANCHOR_X, BUOY_X, groundY, smooth } from '../world/terrain';
import { loadImageTexture } from './imageAssets';

const images = import.meta.glob<string>('./sunlit-shallows/*.png', {
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
export async function loadShallowsArt(): Promise<ShallowsArt | null> {
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
const FADE = 240;

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
    const edge = Math.min(camX - BUOY_X, ANCHOR_X - camX);
    const coverage = smooth(edge / FADE) * smooth((1400 - height / zoom) / 440);
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
