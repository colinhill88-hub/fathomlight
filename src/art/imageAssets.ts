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

/** Validate the encoded PNG before Pixi decodes it and loses the original color type. */
export async function loadRgbaPngTexture(url: string, width: number, height: number, resolution: number): Promise<Texture> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not fetch ${url} (HTTP ${response.status})`);

  const png = await response.blob();
  const header = new DataView(await png.slice(0, 26).arrayBuffer());
  if (header.byteLength < 26
    || header.getUint32(0) !== 0x89504e47 || header.getUint32(4) !== 0x0d0a1a0a
    || header.getUint32(8) !== 13 || header.getUint32(12) !== 0x49484452
    || header.getUint32(16) !== width || header.getUint32(20) !== height
    || header.getUint8(24) !== 8 || header.getUint8(25) !== 6) {
    throw new Error(`Expected a ${width} × ${height} 8-bit RGBA PNG at ${url}`);
  }

  const src = URL.createObjectURL(png);
  try {
    return await Assets.load<Texture>({ src, parser: 'texture', data: { resolution } });
  } finally {
    URL.revokeObjectURL(src);
  }
}
