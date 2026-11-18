import { Rectangle, Texture } from 'pixi.js';
import { loadRgbaPngTexture } from './imageAssets';

const images = import.meta.glob<string>('./wreck-shelf/*.png', {
  eager: true,
  import: 'default',
  query: '?url&no-inline',
});

export async function loadWreckShelfMidground() {
  const url = images['./wreck-shelf/western-approach.png'];
  if (!url) return undefined;

  try {
    const texture = await loadRgbaPngTexture(url, 2048, 1024, 1);
    // Keep the full plate coordinates for registration and skip drawing its clear padding.
    const paintedBounds = new Rectangle(205, 358, 1336, 331);
    return new Texture({ source: texture.source, frame: paintedBounds, trim: paintedBounds, orig: texture.orig });
  } catch (error) {
    console.warn('Wreck Shelf midground could not be loaded. Using procedural silhouettes.', error);
    return undefined;
  }
}
