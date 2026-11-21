import { audio } from './engine';

/*
 * Reward stings (Phase 14): the music-box moments that land on top of the
 * reward animations in `src/ui/reward.ts`. Every one is synthesised, like the
 * rest of the game's sound, and plays on the unmuffled 'ui' bus so a reward
 * reads clearly even at depth.
 *
 * Three sizes, matching the three reward tiers:
 *   - minor:   a pickup sparkle whose pitch climbs while pickups keep coming;
 *   - notable: a short slam and a two-chord answer;
 *   - major:   a riser (anticipation), a slam (impact) and a fanfare (payoff).
 *
 * The fanfare is an original rising figure in D lydian (the shallows' key),
 * short-short-short-long, resolving onto a held chord with a sparkle on top.
 * Choir rewards (whorls, signal fragments, the resonator) use glassier bells
 * and a whole-tone colour instead, so they sound like nothing else on the reef.
 */

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** D lydian, used for the climbing pickup sparkle (two octaves). */
const SPARKLE = [74, 76, 78, 80, 81, 83, 85, 86, 88, 90, 92, 93];

export type StingFlavour = 'kestrel' | 'choir' | 'life';

/** A small, bright "ting" that climbs a step each time while pickups keep coming. */
export function stingMinor(step: number): void {
  if (!audio.running) return;
  const t = audio.now;
  const n = SPARKLE[Math.min(step, SPARKLE.length - 1)];
  audio.bell({ t, freq: hz(n), gain: 0.032, decay: 0.7, ratio: 3.5, index: 0.25, bus: 'ui', send: 0.45 });
  if (step >= 4) audio.bell({ t: t + 0.06, freq: hz(n + 7), gain: 0.018, decay: 0.9, ratio: 1, index: 0.2, bus: 'ui', send: 0.6 });
}

/** A notable find: a soft slam, then a bright two-chord answer. */
export function stingNotable(flavour: StingFlavour): void {
  if (!audio.running) return;
  const t = audio.now;
  audio.thump({ t, freq: 120, gain: 0.16, dur: 0.28, bus: 'ui', send: 0.25 });
  audio.hiss({ t, dur: 0.18, gain: 0.05, type: 'highpass', freq: 3200, bus: 'ui', send: 0.3 });
  const choir = flavour === 'choir';
  const ratio = choir ? 3.01 : flavour === 'life' ? 2 : 1;
  const a = choir ? [72, 76, 80] : flavour === 'life' ? [69, 74, 78] : [74, 78, 81];
  const b = choir ? [74, 78, 82, 86] : flavour === 'life' ? [71, 76, 80, 83] : [76, 81, 85, 88];
  a.forEach((n, i) => audio.bell({ t: t + 0.04 + i * 0.025, freq: hz(n), gain: 0.04, decay: 0.9, ratio, index: 0.45, bus: 'ui', send: 0.5 }));
  b.forEach((n, i) => audio.bell({ t: t + 0.26 + i * 0.03, freq: hz(n), gain: 0.04, decay: 1.8, ratio, index: 0.4, bus: 'ui', send: 0.6 }));
  audio.bubbles({ t: t + 0.05, n: 8, spread: 0.6, gain: 0.025, bus: 'ui' });
}

/**
 * The anticipation before a major reward: a swelling breath of filtered noise
 * and an arpeggio that speeds up as it climbs into the slam.
 */
export function stingRiser(seconds: number, flavour: StingFlavour): void {
  if (!audio.running) return;
  const t = audio.now;
  audio.hiss({ t, dur: seconds, attack: seconds * 0.85, gain: 0.07, freq: 500, to: 5200, q: 1.4, bus: 'ui', send: 0.6 });
  audio.tone({ t, freq: hz(38), to: hz(50), dur: seconds, attack: seconds * 0.8, gain: 0.05, type: 'sawtooth', lp: 700, bus: 'ui', send: 0.3 });
  const steps = flavour === 'choir' ? [62, 66, 70, 74, 78, 82, 86, 90] : [62, 66, 69, 73, 74, 78, 81, 85, 86];
  let at = 0;
  steps.forEach((n, i) => {
    // Accelerate: the gaps shrink as the arpeggio climbs.
    const gap = (seconds / steps.length) * (1.45 - (i / steps.length) * 0.9);
    audio.bell({ t: t + at, freq: hz(n), gain: 0.012 + 0.03 * (i / steps.length), decay: 0.5, ratio: flavour === 'choir' ? 3.01 : 2, index: 0.3, bus: 'ui', send: 0.7 });
    at += gap;
  });
  audio.bubbles({ t: t + seconds * 0.4, n: 14, spread: seconds * 0.6, gain: 0.025, low: 600, high: 2200, bus: 'ui' });
}

/** The impact: a deep hull-thud, struck metal, a burst of bubbles and a bright chord stab. */
export function stingSlam(flavour: StingFlavour): void {
  if (!audio.running) return;
  const t = audio.now;
  audio.thump({ t, freq: 74, gain: 0.34, dur: 0.6, bus: 'ui', send: 0.35 });
  audio.thump({ t, freq: 160, gain: 0.16, dur: 0.18, bus: 'ui', send: 0.2 });
  if (flavour !== 'choir') audio.metal({ t, freq: 196, gain: 0.07, decay: 1.4, bus: 'ui', send: 0.5 });
  audio.hiss({ t, dur: 0.5, gain: 0.08, type: 'highpass', freq: 2600, to: 6000, bus: 'ui', send: 0.5 });
  audio.bubbles({ t: t + 0.02, n: 24, spread: 0.9, gain: 0.035, low: 300, high: 1800, bus: 'ui' });
  const chord = flavour === 'choir' ? [62, 66, 70, 74, 78] : flavour === 'life' ? [57, 64, 69, 73, 76] : [50, 62, 69, 74, 78, 81];
  for (const n of chord) audio.bell({ t, freq: hz(n), gain: 0.045, decay: 2.2, ratio: flavour === 'choir' ? 3.01 : 1, index: 0.6, bus: 'ui', send: 0.55 });
}

/**
 * The payoff: "da-da-da-daaa" rising, then a held chord with a sparkle that
 * rings out. Starts `delay` seconds from now (the slam's tail).
 */
export function stingFanfare(flavour: StingFlavour, delay = 0.18): void {
  if (!audio.running) return;
  const t = audio.now + delay;
  const choir = flavour === 'choir';
  const ratio = choir ? 3.01 : 1;
  // Short-short-short-long, then a step up to the held note.
  const figure = choir
    ? [
        [74, 0, 0.11],
        [78, 0.12, 0.11],
        [82, 0.24, 0.11],
        [86, 0.36, 1.6],
      ]
    : flavour === 'life'
      ? [
          [69, 0, 0.11],
          [71, 0.12, 0.11],
          [73, 0.24, 0.11],
          [76, 0.36, 0.3],
          [81, 0.6, 1.8],
        ]
      : [
          [69, 0, 0.11],
          [73, 0.12, 0.11],
          [76, 0.24, 0.11],
          [80, 0.36, 0.3],
          [81, 0.6, 1.9],
        ];
  for (const [n, at, len] of figure) {
    audio.bell({ t: t + at, freq: hz(n), gain: 0.07, decay: Math.max(0.5, len * 1.3), ratio, index: 0.55, bus: 'ui', send: 0.5 });
    // A soft triangle double gives the melody a body under the bells.
    audio.tone({ t: t + at, freq: hz(n - 12), dur: len, gain: 0.025, type: 'triangle', lp: 1800, bus: 'ui', send: 0.3 });
  }
  const hold = figure[figure.length - 1][1];
  // The held chord: a warm pad that swells under the last note.
  const pad = choir ? [62, 66, 70, 74] : flavour === 'life' ? [57, 64, 69, 73] : [50, 57, 66, 69, 76];
  for (const n of pad) {
    audio.tone({ t: t + hold, freq: hz(n), dur: 2.4, attack: 0.25, gain: 0.022, type: 'sawtooth', lp: 1400, bus: 'ui', send: 0.6 });
    audio.tone({ t: t + hold, freq: hz(n) * 1.004, dur: 2.4, attack: 0.25, gain: 0.018, type: 'sawtooth', lp: 1200, bus: 'ui', send: 0.6 });
  }
  // The sparkle: a cascade of high glints falling back down as the chord rings.
  const top = choir ? [98, 94, 90, 86, 82] : [93, 92, 88, 85, 81, 78];
  top.forEach((n, i) => audio.bell({ t: t + hold + 0.25 + i * 0.09, freq: hz(n), gain: 0.022, decay: 1.4, ratio: 3.5, index: 0.2, bus: 'ui', send: 0.8 }));
}

/** The card settling away: a soft breath and a low chime. */
export function stingSettle(): void {
  if (!audio.running) return;
  const t = audio.now;
  audio.hiss({ t, dur: 0.35, attack: 0.05, gain: 0.03, type: 'lowpass', freq: 1800, to: 500, bus: 'ui', send: 0.4 });
  audio.bell({ t: t + 0.05, freq: hz(62), gain: 0.025, decay: 1.2, ratio: 1, index: 0.3, bus: 'ui', send: 0.6 });
}
