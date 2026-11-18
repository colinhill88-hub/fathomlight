import { Rectangle, Texture } from 'pixi.js';
import { loadRgbaPngTexture } from './imageAssets';

const images = import.meta.glob<string>('./diver/kestrel-suit-materials.png', {
  eager: true,
  import: 'default',
  query: '?url&no-inline',
});

export async function loadPaintedSuit() {
  const url = images['./diver/kestrel-suit-materials.png'];
  if (!url) return undefined;

  try {
    const { source } = await loadRgbaPngTexture(url, 576, 256, 4);
    // Pixi frame coordinates are in logical units at the atlas resolution.
    return {
      swimmer: new Texture({ source, frame: new Rectangle(2, 2, 100, 56) }),
      walker: new Texture({ source, frame: new Rectangle(106, 2, 36, 52) }),
    };
  } catch (error) {
    console.warn('Painted suit materials could not be loaded. Using the procedural suit.', error);
    return undefined;
  }
}
