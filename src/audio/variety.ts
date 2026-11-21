/*
 * Phase 16: no machine-gun repetition. Frequent sounds pick one of a few
 * variants from a shuffled bag (round-robin, never the same one twice running)
 * and nudge pitch and level a little each time, so a run of strokes, steps or
 * clicks never sounds like the same recording replayed.
 */

const bags = new Map<string, { order: number[]; at: number; last: number }>();

/** The next variant (0..n-1) for this sound: a shuffled round-robin that never repeats back to back. */
export function rr(key: string, n: number): number {
  if (n <= 1) return 0;
  let bag = bags.get(key);
  if (!bag || bag.order.length !== n) {
    bag = { order: [], at: n, last: -1 };
    bags.set(key, bag);
  }
  if (bag.at >= n) {
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    // A fresh shuffle must not start with the variant that just played.
    if (order[0] === bag.last) [order[0], order[n - 1]] = [order[n - 1], order[0]];
    bag.order = order;
    bag.at = 0;
  }
  bag.last = bag.order[bag.at++];
  return bag.last;
}

/** A random multiplier around 1, e.g. jit(0.05) is 0.95..1.05. */
export const jit = (spread: number): number => 1 + (Math.random() * 2 - 1) * spread;

/** Semitones to a frequency ratio. */
export const semi = (n: number): number => Math.pow(2, n / 12);
