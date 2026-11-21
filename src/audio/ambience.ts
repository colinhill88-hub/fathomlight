import { audio } from './engine';
import { SAMPLE_GROUPS, SAMPLE_LOOPS } from './samples';
import { jit, rr } from './variety';

/*
 * Milestone 7b: the ambient bed. A few long-running layers whose levels and
 * tone follow where the diver is, plus small random events per zone:
 *
 *  - wash:    deep brown-noise water movement, darker with depth
 *  - fizz:    the bright, airy hiss of sunlit shallow water
 *  - surf:    waves overhead, louder near the surface (and unmuffled above it)
 *  - drone:   a low hum of deep water (basin, forest, cave)
 *  - hollow:  the resonant breath of a narrow cave
 *
 * Events: snapping-shrimp crackle and rising bubbles in the shallows, distant
 * groans in the basin, kelp creaks and knocks in the forest, drips in the cave.
 */

export interface ZoneMix {
  shallows: number;
  basin: number;
  forest: number;
  cave: number;
  /** Milestone 8: the wreck shelf. */
  shelf: number;
  /** Milestone 10: the trench. */
  trench: number;
  /** Milestone 11: the sanctum. */
  sanctum: number;
}

interface Layer {
  gain: GainNode;
  filter: BiquadFilterNode;
}

export class Ambience {
  private wash!: Layer;
  private fizz!: Layer;
  private surf!: Layer;
  private hollow!: Layer;
  private drone!: { gain: GainNode; oscs: OscillatorNode[]; filter: BiquadFilterNode };
  private ready = false;
  private nextEvent = 0;
  private nextCrackle = 0;
  private nextSwell = 0;
  /** Phase 16 round 3: the recorded underwater loop under the synthesised wash (null until it decodes). */
  private sea: { gain: GainNode } | null = null;

  constructor() {
    audio.onReady(() => this.build());
  }

  private noiseLayer(brown: boolean, type: BiquadFilterType, freq: number, q: number): Layer {
    const ctx = audio.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = brown ? audio.brown : audio.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter);
    filter.connect(gain);
    audio.route(gain, 'ambience', 0.25);
    src.start(0, Math.random() * 3);
    return { gain, filter };
  }

  /** Round 3: one recorded CC0 variant on the ambience bus; false if not loaded (play the synthesised one). */
  private sam(group: string, o: { gain: number; rate: number; pan: number; send?: number; t?: number }): boolean {
    const n = SAMPLE_GROUPS[group] ?? 0;
    if (!n) return false;
    return audio.sample(`${group}-${rr(`amb:${group}`, n) + 1}`, { ...o, gain: o.gain * jit(0.15), rate: o.rate * jit(0.05), bus: 'ambience', send: o.send ?? 0.6 });
  }

  private build(): void {
    const ctx = audio.ctx!;
    this.sea = null;
    this.wash = this.noiseLayer(true, 'lowpass', 700, 0.6);
    this.fizz = this.noiseLayer(false, 'highpass', 4200, 0.5);
    this.surf = this.noiseLayer(true, 'bandpass', 500, 0.6);
    this.hollow = this.noiseLayer(false, 'bandpass', 190, 7);
    // A slow swell on the wash, like water moving past.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 180;
    lfo.connect(lfoAmt);
    lfoAmt.connect(this.wash.filter.frequency);
    lfo.start();

    const dg = ctx.createGain();
    dg.gain.value = 0;
    const df = ctx.createBiquadFilter();
    df.type = 'lowpass';
    df.frequency.value = 220;
    const oscs: OscillatorNode[] = [];
    for (const [f, type, det] of [
      [55, 'sine', 0],
      [55, 'triangle', 7],
      [82.4, 'sine', -5],
    ] as [number, OscillatorType, number][]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(df);
      o.start();
      oscs.push(o);
    }
    // A slow beat in the hum's level.
    const trem = ctx.createOscillator();
    trem.frequency.value = 0.11;
    const tremAmt = ctx.createGain();
    tremAmt.gain.value = 0.25;
    const tremBase = ctx.createGain();
    tremBase.gain.value = 1;
    trem.connect(tremAmt);
    tremAmt.connect(tremBase.gain);
    trem.start();
    df.connect(tremBase);
    tremBase.connect(dg);
    audio.route(dg, 'ambience', 0.3);
    this.drone = { gain: dg, oscs, filter: df };
    this.ready = true;
  }

  /**
   * @param mix how much of each zone the diver is in (sums to about 1)
   * @param depth 0 at the surface, 1 at about 25 m
   * @param nearSurface 0..1, how close the helmet is to the surface
   * @param surfaced head above water
   * @param quiet 0..1 how much to hush (blackout)
   */
  update(dt: number, mix: ZoneMix, depth: number, nearSurface: number, surfaced: boolean, quiet: number): void {
    if (!this.ready || !audio.running) return;
    const t = audio.now;
    const tc = 1.2;
    const q = 1 - quiet;
    const open = mix.shallows + mix.basin;
    // Water movement: present everywhere underwater, darker as it gets deeper or enclosed.
    const washCut = 900 - 520 * depth - 250 * mix.forest - 380 * mix.cave - 200 * mix.shelf - 300 * mix.trench;
    this.wash.filter.frequency.setTargetAtTime(Math.max(160, washCut), t, tc);
    this.wash.gain.gain.setTargetAtTime((surfaced ? 0.08 : 0.2 + 0.1 * depth) * q, t, tc);
    this.fizz.gain.gain.setTargetAtTime((surfaced ? 0.01 : 0.035 * mix.shallows * (1 - depth) ** 2) * q, t, tc);
    // Waves: overhead near the surface; bright and unmuffled with the head out.
    this.surf.filter.frequency.setTargetAtTime(surfaced ? 1100 : 420, t, 0.3);
    this.surf.filter.Q.value = surfaced ? 0.4 : 0.7;
    this.nextSwell -= dt;
    if (this.nextSwell <= 0) {
      this.nextSwell = 3 + Math.random() * 4;
      const level = (surfaced ? 0.55 : 0.16 * nearSurface * open) * q;
      const g = this.surf.gain.gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(level, t, 0.9);
      g.setTargetAtTime(level * 0.35, t + 1.8, 1.4);
    }
    // The deep hum: pitch drops a little per zone.
    const hum = Math.min(1, 0.15 + depth) * (mix.basin * 0.8 + mix.forest * 1 + mix.cave * 0.7 + mix.shelf * 1.2 + mix.trench * 1.5 + mix.sanctum * 0.9) + 0.1 * depth * mix.shallows;
    this.drone.gain.gain.setTargetAtTime((surfaced ? 0 : 0.16 * hum) * q, t, 2);
    const root = 55 * mix.shallows + 49 * mix.basin + 41.2 * mix.forest + 36.7 * mix.cave + 34.6 * mix.shelf + 27.5 * mix.trench + 36.7 * mix.sanctum;
    this.drone.oscs[0].frequency.setTargetAtTime(root, t, 3);
    this.drone.oscs[1].frequency.setTargetAtTime(root, t, 3);
    this.drone.oscs[2].frequency.setTargetAtTime(root * 1.498, t, 3);
    this.hollow.gain.gain.setTargetAtTime(0.18 * mix.cave * q, t, 1.5);
    // Round 3: the recorded hydrophone loop, a living texture under the synthesised wash. It starts
    // silent once the file has decoded, and follows the same rules: quieter with the head out, dull
    // through a hull (the ambience bus passes the hull filter and the underwater muffle).
    if (!this.sea) this.sea = audio.sampleLoop('sea-1', { bus: 'ambience', send: 0.2, loop: SAMPLE_LOOPS['sea-1'] });
    if (this.sea) this.sea.gain.gain.setTargetAtTime((surfaced ? 0.12 : 0.6 + 0.3 * depth) * q, t, tc);

    if (surfaced || quiet > 0.5) return;
    // Snapping shrimp: the crackle of a living reef, only in the sunlit shallows.
    this.nextCrackle -= dt;
    if (this.nextCrackle <= 0) {
      this.nextCrackle = 0.05 + Math.random() * 0.35;
      if (Math.random() < mix.shallows * (1 - depth)) {
        audio.hiss({ dur: 0.006 + Math.random() * 0.01, gain: 0.02 + Math.random() * 0.04, type: 'highpass', freq: 2500 + Math.random() * 3000, bus: 'ambience', send: 0.05, pan: Math.random() * 1.6 - 0.8 });
      }
    }
    this.nextEvent -= dt;
    if (this.nextEvent > 0) return;
    this.nextEvent = 1.5 + Math.random() * 3.5;
    const r = Math.random();
    let acc = 0;
    const pick = (w: number) => (acc += w) > r;
    const pan = Math.random() * 1.6 - 0.8;
    if (pick(mix.shallows)) {
      // A trickle of bubbles rising somewhere off to the side.
      // Round 3: every other trickle is a recorded one.
      if (Math.random() < 0.5) {
        if (Math.random() < 0.5 || !this.sam('bubble', { gain: 0.03, rate: 0.9 + Math.random() * 0.4, pan, send: 0.4 }))
          audio.bubbles({ n: 3 + Math.floor(Math.random() * 6), spread: 0.8, gain: 0.03, bus: 'ambience', pan });
      }
    } else if (pick(mix.basin)) {
      // A distant groan of deep water.
      if (Math.random() < 0.35) {
        const f = 60 + Math.random() * 30;
        audio.tone({ freq: f, to: f * 0.8, dur: 3 + Math.random() * 2, attack: 1.2, gain: 0.06, type: 'triangle', bus: 'ambience', send: 0.6, pan, lp: 300 });
      }
    } else if (pick(mix.forest)) {
      if (Math.random() < 0.65) this.creak(pan);
      else audio.thump({ freq: 120 + Math.random() * 60, gain: 0.04, bus: 'ambience', send: 0.4, pan });
    } else if (pick(mix.shelf)) {
      // Wrecks settling: long metal groans and the odd far-off clank.
      // Round 3: a recorded hull groan, slowed down to sound huge and far off, or a creak of plates.
      if (Math.random() < 0.6) {
        if (!this.sam('groan', { gain: 0.05, rate: 0.5 + Math.random() * 0.2, pan, send: 0.7 })) {
          const f = 90 + Math.random() * 60;
          audio.tone({ freq: f, to: f * (0.7 + Math.random() * 0.2), dur: 1.6 + Math.random() * 1.5, attack: 0.5, gain: 0.05, type: 'sawtooth', bus: 'ambience', send: 0.7, pan, lp: 500 });
        }
      } else if (Math.random() < 0.5 || !this.sam('creak', { gain: 0.03, rate: 0.55 + Math.random() * 0.15, pan, send: 0.8 }))
        audio.metal({ freq: 160 + Math.random() * 80, gain: 0.03, decay: 1.6, bus: 'ambience', send: 0.8, pan });
      this.nextEvent = 3 + Math.random() * 5;
    } else if (pick(mix.trench)) {
      // The trench: far-off hull-groans of pressure, and slow, deep pulses like something huge moving.
      if (Math.random() < 0.25 && this.sam('groan', { gain: 0.05, rate: 0.32 + Math.random() * 0.1, pan, send: 0.9 })) {
        // Round 3: now and then a recorded groan, slowed right down: pressure working on rock.
      } else if (Math.random() < 0.5) {
        const f = 38 + Math.random() * 18;
        audio.tone({ freq: f, to: f * 0.75, dur: 3.5 + Math.random() * 2.5, attack: 1.4, gain: 0.07, type: 'triangle', bus: 'ambience', send: 0.8, pan, lp: 260 });
      } else if (Math.random() < 0.5) audio.metal({ freq: 70 + Math.random() * 40, gain: 0.03, decay: 2.4, bus: 'ambience', send: 0.9, pan });
      else for (let k = 0; k < 3; k++) audio.thump({ t: audio.now + k * 0.9, freq: 46, gain: 0.04, bus: 'ambience', send: 0.6, pan });
      this.nextEvent = 4 + Math.random() * 6;
    } else if (pick(mix.sanctum)) {
      // The sanctum: soft glassy chimes far off, in fifths, like light becoming sound.
      const base = [293.7, 440, 587.3, 659.3][Math.floor(Math.random() * 4)];
      for (let k = 0; k < 3; k++)
        audio.tone({ t: audio.now + k * 0.45, freq: base * [1, 1.5, 2][k], dur: 2.6, attack: 0.05, gain: 0.025, type: 'sine', bus: 'ambience', send: 1, pan: pan * (1 - k * 0.3) });
      this.nextEvent = 3 + Math.random() * 4;
    } else if (pick(mix.cave)) {
      this.drip(pan);
      if (Math.random() < 0.4) this.drip(pan * 0.5, 0.25 + Math.random() * 0.4);
      this.nextEvent = 0.8 + Math.random() * 2.4;
    }
  }

  /** A kelp stalk creaking as it sways: a slow rubbing glide in pitch. */
  private creak(pan: number): void {
    const ctx = audio.ctx!;
    const t = ctx.currentTime;
    const dur = 0.7 + Math.random() * 1.1;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const f = 70 + Math.random() * 70;
    o.frequency.setValueAtTime(f, t);
    o.frequency.linearRampToValueAtTime(f * (0.8 + Math.random() * 0.5), t + dur);
    // A rough, stick-slip texture: amplitude flutter.
    const flutter = ctx.createOscillator();
    flutter.frequency.value = 9 + Math.random() * 14;
    const fa = ctx.createGain();
    fa.gain.value = 0.5;
    const vca = ctx.createGain();
    vca.gain.value = 0.5;
    flutter.connect(fa);
    fa.connect(vca.gain);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 500 + Math.random() * 400;
    bp.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(vca);
    vca.connect(bp);
    bp.connect(g);
    audio.route(g, 'ambience', 0.4, pan);
    o.start(t);
    flutter.start(t);
    o.stop(t + dur + 0.05);
    flutter.stop(t + dur + 0.05);
  }

  /** A drop of water falling in a cave: a quick falling plink, ringing in the echo. */
  private drip(pan: number, delay = 0): void {
    const t = audio.now + delay;
    const f = 900 + Math.random() * 900;
    audio.tone({ t, freq: f, to: f * 0.55, dur: 0.09, gain: 0.07, bus: 'ambience', send: 0.9, pan });
    audio.tone({ t: t + 0.03, freq: f * 1.9, to: f * 1.2, dur: 0.05, gain: 0.02, bus: 'ambience', send: 0.9, pan });
  }
}
