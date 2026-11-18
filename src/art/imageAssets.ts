import { Assets, type Texture } from 'pixi.js';

/** Load a bundled image and check the pixel grid expected by its consumers. */
export async function loadImageTexture(url: string, width: number, height: number): Promise<Texture> {
  const texture = await Assets.load<Texture>(url);
  const { pixelWidth, pixelHeight } = texture.source;
  if (pixelWidth !== width || pixelHeight !== height) {
    throw new Error(`Expected ${width} × ${height} at ${url}, received ${pixelWidth} × ${pixelHeight}`);
  }
  return texture;
}
