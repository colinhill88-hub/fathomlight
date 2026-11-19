import { loadRgbaPngTexture } from './imageAssets';

const images = import.meta.glob<string>('./kelp-forest/*.png', {
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

export async function loadForestOutcrop() {
  const url = images['./kelp-forest/central-outcrop.png'];
  if (!url) return undefined;

  try {
    return await loadRgbaPngTexture(url, 1280, 512, 2);
  } catch (error) {
    console.warn('Kelp Forest outcrop could not be loaded. Using procedural rock.', error);
    return undefined;
  }
}
