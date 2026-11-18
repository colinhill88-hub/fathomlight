import { loadRgbaPngTexture } from './imageAssets';

const images = import.meta.glob<string>('./diver/kestrel-face.png', {
  eager: true,
  import: 'default',
  query: '?url&no-inline',
});

export async function loadPaintedDiver() {
  const url = images['./diver/kestrel-face.png'];
  if (!url) return undefined;

  try {
    return await loadRgbaPngTexture(url, 160, 168, 4);
  } catch (error) {
    console.warn('Painted diver face could not be loaded. Using the procedural face.', error);
    return undefined;
  }
}
