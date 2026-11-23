import { Assets, type Texture } from 'pixi.js';
import type { PlantId } from '../game/state';

/**
 * Painted aquarium tank backdrops (one per plant plus a bare reef default).
 * Generated images live in `src/art/tanks/<kind>.webp` (or `.png`) and are
 * logged in `docs/art/SOURCES.md`. Missing files or `?art=procedural` fall
 * back cleanly to HabitatWater's layered painterly procedural backdrops.
 */
export type TankBackdropKind = 'bare' | PlantId;
export type TankArt = Partial<Record<TankBackdropKind, Texture>>;

const webps = import.meta.glob<string>('./tanks/*.webp', { eager: true, import: 'default', query: '?url&no-inline' });
const pngs = import.meta.glob<string>('./tanks/*.png', { eager: true, import: 'default', query: '?url&no-inline' });

const KINDS: readonly TankBackdropKind[] = ['bare', 'coral', 'kelp', 'grass', 'bladder', 'lumen'];

export async function loadTankArt(mipmaps = false): Promise<TankArt> {
  const entries = await Promise.all(
    KINDS.map(async (kind) => {
      const url = webps[`./tanks/${kind}.webp`] ?? pngs[`./tanks/${kind}.png`];
      if (!url) return [kind, undefined] as const;
      try {
        const texture = await Assets.load<Texture>(url);
        if (mipmaps) texture.source.autoGenerateMipmaps = true;
        return [kind, texture] as const;
      } catch (error) {
        console.warn(`Tank artwork ${kind} could not be loaded. Using the procedural backdrop.`, error);
        return [kind, undefined] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}
