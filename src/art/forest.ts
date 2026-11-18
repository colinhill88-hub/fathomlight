import { loadRgbaPngTexture } from './imageAssets';

const images = import.meta.glob<string>('./kelp-forest/forest-mid.png', {
  eager: true,
  import: 'default',
  query: '?url&no-inline',
});

export async function loadForestMidground() {
  const url = images['./kelp-forest/forest-mid.png'];
  if (!url) return undefined;

  try {
    return await loadRgbaPngTexture(url, 2048, 1024, 1);
  } catch (error) {
    console.warn('Kelp Forest midground could not be loaded. Using procedural silhouettes.', error);
    return undefined;
  }
}
