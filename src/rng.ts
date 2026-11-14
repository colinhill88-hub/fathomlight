/**
 * Seeded random numbers. DESIGN.md says the world uses the same seed every
 * time, so procedural art comes out identical on every play and every device.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const WORLD_SEED = 0x4b357 /* "Kestrel" */;
