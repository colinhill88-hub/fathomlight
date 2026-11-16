import { audio, BusName } from './engine';
import { Ambience, ZoneMix } from './ambience';
import { Music, MusicZone } from './music';
import { BASIN_EAST, CAVE, FOREST, GROTTO, inCaveTunnel, SITE_MOUTH } from '../world/terrain';

/*
 * Milestone 7b: the sound director. main.ts hands it a snapshot of the game
 * every frame; it works out the zone mix, keeps the ambience and music in
 * step, runs the looping sounds (breathing, scanning, work at the Collect
 * button, drone welding, the sub's motor, machinery) and fires the one-off
 * cues. A few cues come straight from game events (pickups, dents, toasts).
 */

export type WorkKind = 'fibre' | 'scrap' | 'copper' | 'quartz' | 'resin' | 'moss' | 'creature' | 'repair' | 'winch' | 'recorder';

export interface AudioFrame {
  dt: number;
  /** The listener: the diver, or the sub while aboard. */
  x: number;
  y: number;
  depthM: number;
  surfaced: boolean;
  aboard: boolean;
  inDome: boolean;
  /** 0..1 how dark the blackout is. */
  blackout: number;
  /** Which panel is open ('' = none). */
  panel: string;
  speed: number;
  boosting: boolean;
  lampOn: boolean;
  /** 0..1 how low the air is (0 above a quarter tank). */
  lowAir: number;
  /** Breathing from the surface, a dome or the sub. */
  freeAir: boolean;
  work: WorkKind | null;
  workX: number;
  scanning: number | null;
  drone: { x: number; y: number; welding: boolean };
  presses: { id: number; x: number; y: number; stroke: number }[];
  feeders: { x: number; y: number }[];
  sub: { x: number; y: number; speed: number; thrust: boolean; docked: boolean; built: boolean } | null;
  /** The diver's splash strength this frame (breaking the surface or diving). */
  splash: number;
  /** Breathing out with the head above water. */
  exhale: boolean;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

/** How much of each zone a point is in. */
export function zoneMix(x: number, y: number): ZoneMix {
  let cave = 0;
  if (inCaveTunnel(x, y) && x > CAVE.x0 + 60 && x < CAVE.x1 - 40) cave = 1;
  else if (x > GROTTO.x0 - 60 && x < GROTTO.x1 + 60 && y > GROTTO.y0 - 60) cave = 0.6;
  const mouth = Math.hypot((x - SITE_MOUTH.x) / (SITE_MOUTH.rx * 3), (y - SITE_MOUTH.y) / (SITE_MOUTH.ry * 3));
  cave = Math.max(cave, 0.6 * (1 - smooth(mouth)));
  const forest = smooth((x - (FOREST.x0 - 500)) / 600);
  const basin = x < BASIN_EAST + 150 ? smooth((y - 300) / 600) * (1 - smooth((x - (BASIN_EAST - 250)) / 400)) : 0;
  const rest = 1 - cave;
  const f = forest * rest;
  const b = basin * (1 - forest) * rest;
  return { cave, forest: f, basin: b, shallows: Math.max(0, rest - f - b) };
}

export class SoundDirector {
  private ambience = new Ambience();
  private music = new Music();
  private mix: ZoneMix = { shallows: 1, basin: 0, forest: 0, cave: 0 };
  private musicZone: MusicZone = 'shallows';
  private prev: Partial<AudioFrame> = {};
  private breathClock = 2;
  private breathPhase: 'in' | 'out' = 'in';
  private beepClock = 0;
  private workClock = 0;
  private weldClock = 0;
  private strokes = new Map<number, number>();
  private toastAt: Record<string, number> = {};
  private loops: {
    scan: { osc: OscillatorNode; gain: GainNode };
    motion: { gain: GainNode; filter: BiquadFilterNode };
    motor: { gain: GainNode; oscs: OscillatorNode[]; filter: BiquadFilterNode; wash: GainNode; washF: BiquadFilterNode; whine: GainNode; whineO: OscillatorNode };
    hum: { gain: GainNode; pan: StereoPannerNode | null };
  } | null = null;

  constructor() {
    audio.onReady(() => this.build());
    // Soft clicks for every button outside the swim controls (those have their own sounds).
    document.addEventListener(
      'click',
      (e) => {
        const b = (e.target as HTMLElement | null)?.closest?.('button');
        if (b && !b.closest('#controls')) this.click();
      },
      true,
    );
  }

  private build(): void {
    const ctx = audio.ctx!;
    const scanO = ctx.createOscillator();
    scanO.type = 'sine';
    const scanG = ctx.createGain();
    scanG.gain.value = 0;
    scanO.connect(scanG);
    audio.route(scanG, 'sfx', 0.3);
    scanO.start();

    const mSrc = ctx.createBufferSource();
    mSrc.buffer = audio.brown;
    mSrc.loop = true;
    const mF = ctx.createBiquadFilter();
    mF.type = 'bandpass';
    mF.frequency.value = 300;
    mF.Q.value = 0.8;
    const mG = ctx.createGain();
    mG.gain.value = 0;
    mSrc.connect(mF);
    mF.connect(mG);
    audio.route(mG, 'sfx', 0.1);
    mSrc.start();

    // The sub: a deep electric motor, propeller wash and a thruster whine.
    const motorF = ctx.createBiquadFilter();
    motorF.type = 'lowpass';
    motorF.frequency.value = 260;
    const motorG = ctx.createGain();
    motorG.gain.value = 0;
    const oscs: OscillatorNode[] = [];
    for (const [f, det] of [
      [46, 0],
      [46, 9],
      [92, -4],
    ]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(motorF);
      o.start();
      oscs.push(o);
    }
    motorF.connect(motorG);
    audio.route(motorG, 'sfx', 0.15);
    const wSrc = ctx.createBufferSource();
    wSrc.buffer = audio.brown;
    wSrc.loop = true;
    const washF = ctx.createBiquadFilter();
    washF.type = 'bandpass';
    washF.frequency.value = 250;
    washF.Q.value = 1.2;
    const wash = ctx.createGain();
    wash.gain.value = 0;
    wSrc.connect(washF);
    washF.connect(wash);
    audio.route(wash, 'sfx', 0.15);
    wSrc.start();
    const whineO = ctx.createOscillator();
    whineO.type = 'square';
    whineO.frequency.value = 300;
    const whineF = ctx.createBiquadFilter();
    whineF.type = 'lowpass';
    whineF.frequency.value = 900;
    const whine = ctx.createGain();
    whine.gain.value = 0;
    whineO.connect(whineF);
    whineF.connect(whine);
    audio.route(whine, 'sfx', 0.2);
    whineO.start();

    // Machinery hum near running auto feeders.
    const humG = ctx.createGain();
    humG.gain.value = 0;
    const humF = ctx.createBiquadFilter();
    humF.type = 'lowpass';
    humF.frequency.value = 320;
    for (const f of [58, 116.5, 175]) {
      const o = ctx.createOscillator();
      o.type = f < 100 ? 'sawtooth' : 'sine';
      o.frequency.value = f;
      o.connect(humF);
      o.start();
    }
    humF.connect(humG);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) {
      humG.connect(pan);
      audio.route(pan, 'sfx', 0.2);
    } else audio.route(humG, 'sfx', 0.2);

    this.loops = {
      scan: { osc: scanO, gain: scanG },
      motion: { gain: mG, filter: mF },
      motor: { gain: motorG, oscs, filter: motorF, wash, washF, whine, whineO },
      hum: { gain: humG, pan },
    };
  }

  /** Volume and stereo position for a sound at (x, y), heard from the listener. */
  private place(x: number, y: number, f: AudioFrame, range = 1300): { g: number; pan: number } {
    const d = Math.hypot(x - f.x, (y - f.y) * 1.3);
    return { g: clamp01(1 - d / range) ** 2, pan: Math.max(-0.85, Math.min(0.85, (x - f.x) / 700)) };
  }

  update(f: AudioFrame): void {
    const p = this.prev;
    const dt = f.dt;
    // Zone mix, eased so moving between zones crossfades.
    const want = zoneMix(f.x, f.y);
    const k = 1 - Math.exp(-dt / 1.6);
    for (const z of ['shallows', 'basin', 'forest', 'cave'] as const) this.mix[z] += (want[z] - this.mix[z]) * k;
    const top = (['shallows', 'basin', 'forest', 'cave'] as const).reduce((a, b) => (this.mix[b] > this.mix[a] ? b : a));
    if (top !== this.musicZone && this.mix[top] > 0.6) {
      this.musicZone = top;
      this.music.setZone(top);
    }
    const depth = clamp01(f.depthM / 25);
    const nearSurface = clamp01(1 - f.depthM / 6);
    const m = this.mix;
    audio.setScene({
      muffle: f.surfaced ? 16000 : Math.max(900, 4200 - 2300 * depth - 900 * m.cave - 500 * m.forest),
      space: f.surfaced ? 0.12 : 0.28 + 0.15 * m.basin + 0.12 * m.forest + 0.8 * m.cave,
      duck: (f.panel ? 0.4 : 1) * (1 - 0.45 * f.lowAir),
      blackout: f.blackout,
    });
    this.ambience.update(dt, m, depth, nearSurface, f.surfaced, f.blackout);
    this.music.update(dt);
    if (!audio.running) {
      this.prev = f;
      return;
    }
    const L = this.loops!;
    const t = audio.now;
    const out = f.blackout > 0.02;

    // ---- Changes since the last frame ----
    if (p.panel !== undefined && p.panel !== f.panel) this.panelCue(!!f.panel);
    if (p.lampOn !== undefined && p.lampOn !== f.lampOn && !f.aboard) this.lampCue(f.lampOn);
    if (p.aboard !== undefined && p.aboard !== f.aboard && !out) this.hatch(f.aboard);
    if (p.sub && f.sub && p.sub.docked !== f.sub.docked && f.aboard) this.clamps(f.sub.docked);
    if (p.boosting === false && f.boosting && !f.aboard && !f.surfaced) {
      audio.hiss({ dur: 0.5, gain: 0.08, freq: 300, to: 900, q: 0.8, brown: true });
      audio.bubbles({ n: 8, spread: 0.4, gain: 0.03, low: 300, high: 900 });
    }
    if (p.blackout !== undefined && p.blackout <= 0.02 && f.blackout > 0.02) this.heartbeat();
    if (p.blackout !== undefined && p.blackout > 0.3 && f.blackout <= 0.3 && f.blackout < (p.blackout ?? 0)) {
      audio.bell({ freq: 587, gain: 0.04, decay: 2.5, ratio: 1, index: 0.5, bus: 'ui', send: 0.6 });
    }
    if (f.splash > 0 && !f.aboard) this.splash(f.splash, f.surfaced);
    if (p.surfaced === true && !f.surfaced && !f.aboard && f.splash <= 0) this.splash(0.3, false);
    if (f.exhale) audio.hiss({ dur: 0.7, attack: 0.08, gain: 0.05, type: 'lowpass', freq: 1100, bus: 'sfx', send: 0.05 });

    // ---- Swimming through water ----
    const swim = f.aboard || f.surfaced ? 0 : clamp01(f.speed / 420);
    L.motion.gain.gain.setTargetAtTime(0.12 * swim * swim, t, 0.15);
    L.motion.filter.frequency.setTargetAtTime(220 + 500 * swim, t, 0.2);

    // ---- Breathing (Colin: subtle, faster and louder as air runs low) ----
    if (!f.aboard && !f.surfaced && !f.inDome && !out) {
      this.breathClock -= dt;
      if (this.breathClock <= 0) {
        const exertion = f.boosting || f.work ? 1 : 0;
        const level = 0.045 + 0.16 * f.lowAir + 0.02 * exertion;
        const period = 5 - 2.4 * f.lowAir - 1.1 * exertion;
        if (this.breathPhase === 'in') {
          // The demand valve hissing as the diver breathes in.
          audio.hiss({ dur: 0.9 - 0.3 * f.lowAir, attack: 0.25, gain: level, freq: 1900, to: 2400, q: 1.4, send: 0.05 });
          this.breathPhase = 'out';
          this.breathClock = period * 0.4;
        } else {
          // Breathing out: a rush of bubbles from the regulator.
          audio.hiss({ dur: 1.0, attack: 0.1, gain: level * 0.8, freq: 380, q: 0.9, brown: true, send: 0.05 });
          audio.bubbles({ t: t + 0.1, n: 10 + Math.round(8 * f.lowAir), spread: 1.1, gain: level * 0.7, low: 260, high: 1000 });
          this.breathPhase = 'in';
          this.breathClock = period * 0.6;
        }
      }
    } else {
      this.breathClock = Math.min(this.breathClock, 1.5);
      this.breathPhase = 'in';
    }

    // ---- Low-air warning: the dive watch beeps ----
    if (f.lowAir > 0 && !f.freeAir && !out) {
      this.beepClock -= dt;
      if (this.beepClock <= 0) {
        this.beepClock = 2.2 - 1.4 * f.lowAir;
        for (const i of [0, 1]) audio.tone({ t: t + i * 0.16, freq: 1760, dur: 0.07, gain: 0.03 + 0.04 * f.lowAir, type: 'square', lp: 2600, bus: 'ui', send: 0.05 });
      }
    } else this.beepClock = 0.4;

    // ---- Scanning: a rising sweep, then the chime comes with the "Scanned" notice ----
    if (f.scanning !== null && !out) {
      L.scan.gain.gain.setTargetAtTime(0.03, t, 0.05);
      L.scan.osc.frequency.setTargetAtTime(420 + 900 * f.scanning + 30 * Math.sin(t * 40), t, 0.03);
    } else L.scan.gain.gain.setTargetAtTime(0, t, 0.06);

    // ---- Work at the Collect button ----
    if (f.work && !out) {
      this.workClock -= dt;
      if (this.workClock <= 0) this.workClock = this.workHit(f.work, Math.max(-0.7, Math.min(0.7, (f.workX - f.x) / 300)));
    } else this.workClock = 0.05;

    // ---- The drone's welding torch ----
    if (f.drone.welding && !out) {
      const pl = this.place(f.drone.x, f.drone.y, f, 1500);
      this.weldClock -= dt;
      if (this.weldClock <= 0 && pl.g > 0.01) {
        this.weldClock = 0.025 + Math.random() * 0.09;
        audio.hiss({ dur: 0.008 + Math.random() * 0.025, gain: (0.05 + Math.random() * 0.07) * pl.g, type: 'highpass', freq: 2200 + Math.random() * 3000, pan: pl.pan, send: 0.08 });
        if (Math.random() < 0.08) audio.bubbles({ n: 2, spread: 0.2, gain: 0.03 * pl.g, pan: pl.pan });
      }
    }

    // ---- The plate press: a heavy stroke and a hiss each time a plate drops ----
    for (const pr of f.presses) {
      const was = this.strokes.get(pr.id);
      if (was !== undefined && pr.stroke < was - 0.01) {
        const pl = this.place(pr.x, pr.y, f, 1600);
        if (pl.g > 0.01) {
          audio.thump({ freq: 90, gain: 0.2 * pl.g, dur: 0.4, pan: pl.pan, send: 0.3 });
          audio.metal({ t: t + 0.02, freq: 110, gain: 0.06 * pl.g, decay: 0.7, pan: pl.pan });
          audio.hiss({ t: t + 0.25, dur: 0.7, gain: 0.05 * pl.g, freq: 2600, to: 900, q: 0.8, pan: pl.pan });
        }
      }
      this.strokes.set(pr.id, pr.stroke);
    }

    // ---- Feeder hum ----
    let best = { g: 0, pan: 0 };
    for (const fd of f.feeders) {
      const pl = this.place(fd.x, fd.y, f, 1000);
      if (pl.g > best.g) best = pl;
    }
    L.hum.gain.gain.setTargetAtTime(out ? 0 : 0.05 * best.g, t, 0.4);
    if (L.hum.pan) L.hum.pan.pan.setTargetAtTime(best.pan, t, 0.3);

    // ---- The sub ----
    const S = f.sub;
    const mo = L.motor;
    if (S && S.built && f.aboard && !out) {
      const sp = clamp01(S.speed / 620);
      mo.gain.gain.setTargetAtTime(S.docked ? 0.02 : 0.05 + 0.08 * sp, t, 0.3);
      for (const [i, o] of mo.oscs.entries()) o.frequency.setTargetAtTime((i === 2 ? 92 : 46) * (1 + 0.5 * sp), t, 0.4);
      mo.filter.frequency.setTargetAtTime(240 + 500 * sp, t, 0.3);
      mo.wash.gain.setTargetAtTime(0.2 * sp, t, 0.3);
      mo.washF.frequency.setTargetAtTime(180 + 500 * sp, t, 0.3);
      mo.whine.gain.setTargetAtTime(S.thrust ? 0.025 : 0, t, S.thrust ? 0.15 : 0.5);
      mo.whineO.frequency.setTargetAtTime(S.thrust ? 520 : 300, t, 0.6);
    } else {
      mo.gain.gain.setTargetAtTime(0, t, 0.4);
      mo.wash.gain.setTargetAtTime(0, t, 0.4);
      mo.whine.gain.setTargetAtTime(0, t, 0.3);
    }
    if (p.sub && S && !p.sub.thrust && S.thrust && f.aboard) {
      audio.hiss({ dur: 0.8, gain: 0.12, freq: 260, to: 700, q: 0.7, brown: true, send: 0.2 });
      audio.bubbles({ n: 14, spread: 0.6, gain: 0.035, low: 250, high: 800 });
    }

    this.prev = { ...f, sub: f.sub ? { ...f.sub } : null };
  }

  // ---------------------------------------------------------------------------
  // One-off cues.

  /** One stroke of work for each kind of thing collected. Returns seconds to the next. */
  private workHit(kind: WorkKind, pan: number): number {
    const t = audio.now;
    const j = () => 0.85 + Math.random() * 0.3;
    switch (kind) {
      case 'fibre': // Cut: a quick blade slice through kelp.
        audio.hiss({ dur: 0.12, gain: 0.07, type: 'bandpass', freq: 2600 * j(), to: 1200, q: 1.5, pan });
        return 0.3 * j();
      case 'scrap': // Pry loose: metal grinding and a clank as it gives.
        audio.tone({ freq: 140 * j(), to: 180, dur: 0.3, gain: 0.04, type: 'sawtooth', lp: 900, pan });
        if (Math.random() < 0.6) audio.metal({ t: t + 0.25, freq: 230 * j(), gain: 0.05, decay: 0.45, pan });
        return 0.55 * j();
      case 'copper': // Dig out: thuds into gravel.
        audio.thump({ freq: 150 * j(), gain: 0.09, dur: 0.18, pan });
        audio.hiss({ dur: 0.12, gain: 0.05, freq: 800 * j(), q: 0.7, brown: true, pan });
        return 0.42 * j();
      case 'quartz': // Chip off: hard taps on crystal.
        audio.tone({ freq: 2900 * j(), dur: 0.06, gain: 0.035, pan, send: 0.3 });
        audio.hiss({ dur: 0.025, gain: 0.08, freq: 3800, q: 2, pan });
        return 0.36 * j();
      case 'resin': // Scrape off: a blade dragged over a holdfast.
        audio.hiss({ dur: 0.22, attack: 0.03, gain: 0.05, freq: 1300 * j(), to: 2100, q: 3, pan });
        return 0.42 * j();
      case 'moss': // Peel off: a soft tearing crackle.
        for (let i = 0; i < 4; i++) audio.hiss({ t: t + i * 0.035 * j(), dur: 0.02, gain: 0.04, freq: 1200 * j(), q: 1.5, pan });
        return 0.32 * j();
      case 'creature': // Coaxing a creature into the jar: gentle bubbles.
        audio.bubbles({ n: 2, spread: 0.2, gain: 0.025, low: 500, high: 1100, pan });
        return 0.5 * j();
      case 'repair': // Repairing the drone: welding crackle.
        for (let i = 0; i < 4; i++) audio.hiss({ t: t + Math.random() * 0.12, dur: 0.015, gain: 0.07, type: 'highpass', freq: 3000, pan });
        return 0.14;
      case 'winch': // Winding the boom winch: ratchet clicks and a strained groan.
        audio.metal({ freq: 820 * j(), gain: 0.03, decay: 0.12, pan });
        if (Math.random() < 0.25) audio.tone({ freq: 70, to: 62, dur: 0.6, gain: 0.04, type: 'sawtooth', lp: 400, pan });
        return 0.18;
      case 'recorder': // Unclipping the recorder: small latches.
        audio.tone({ freq: 1800 * j(), dur: 0.03, gain: 0.04, type: 'triangle', pan });
        return 0.4 * j();
    }
  }

  pickup(kind: string): void {
    if (!audio.running) return;
    const f: Record<string, number> = { quartz: 1568, copper: 880, scrap: 698, fibre: 523, resin: 587, moss: 784, plate: 659 };
    const fr = f[kind] ?? 700;
    audio.bell({ freq: fr, gain: 0.045, decay: 0.6, ratio: 1, index: 0.4, send: 0.3 });
    audio.bell({ t: audio.now + 0.07, freq: fr * 1.5, gain: 0.025, decay: 0.5, ratio: 1, index: 0.3, send: 0.3 });
    audio.bubbles({ n: 3, spread: 0.2, gain: 0.025 });
  }

  /** A bigger find: an air tank upgrade, an echo whorl or the recovered sample bag. */
  find(kind: 'tank' | 'whorl' | 'bag'): void {
    if (!audio.running) return;
    const t = audio.now;
    const notes = kind === 'tank' ? [62, 66, 69, 74] : kind === 'whorl' ? [69, 76, 81, 83, 88] : [67, 71];
    notes.forEach((n, i) =>
      audio.bell({ t: t + i * 0.12, freq: 440 * Math.pow(2, (n - 69) / 12), gain: 0.05, decay: 1.6, ratio: kind === 'whorl' ? 3.01 : 1, index: 0.5, bus: 'ui', send: 0.6 }),
    );
    audio.bubbles({ n: 8, spread: 0.6, gain: 0.03 });
  }

  /** The identify pulse (a tap of Scan): a soft sonar ping. */
  ping(): void {
    if (!audio.running) return;
    audio.bell({ freq: 1320, gain: 0.04, decay: 1.4, ratio: 1, index: 0.25, send: 0.8 });
  }

  /** A hard knock against rock in the sub. */
  dent(strength: number): void {
    if (!audio.running) return;
    const g = Math.min(1, 0.4 + strength * 6);
    audio.thump({ freq: 70, gain: 0.3 * g, dur: 0.5, send: 0.3 });
    audio.metal({ freq: 120 + Math.random() * 40, gain: 0.12 * g, decay: 1.2, send: 0.4 });
    audio.bubbles({ n: 6, spread: 0.4, gain: 0.03 });
  }

  /** Hull breached: a two-tone alarm and a rush of water. */
  breach(): void {
    if (!audio.running) return;
    const t = audio.now;
    for (let i = 0; i < 6; i++) audio.tone({ t: t + i * 0.32, freq: i % 2 ? 494 : 659, dur: 0.26, gain: 0.06, type: 'triangle', lp: 2000, bus: 'ui', send: 0.2 });
    audio.hiss({ dur: 2.2, attack: 0.05, gain: 0.2, freq: 500, q: 0.6, brown: true });
    audio.bubbles({ n: 30, spread: 2, gain: 0.04, low: 200, high: 900 });
  }

  /** A notice popped up. */
  toast(kind: string): void {
    if (!audio.running) return;
    const t = audio.now;
    if (t - (this.toastAt[kind] ?? -9) < 0.4) return;
    this.toastAt[kind] = t;
    if (kind === 'warn') {
      audio.tone({ t, freq: 523, dur: 0.18, gain: 0.04, type: 'triangle', lp: 1500, bus: 'ui', send: 0.2 });
      audio.tone({ t: t + 0.17, freq: 392, dur: 0.3, gain: 0.04, type: 'triangle', lp: 1500, bus: 'ui', send: 0.2 });
    } else if (kind === 'scan') {
      // Scan complete: a bright two-note chime.
      audio.bell({ t, freq: 1175, gain: 0.05, decay: 1.2, ratio: 1, index: 0.5, bus: 'ui', send: 0.5 });
      audio.bell({ t: t + 0.13, freq: 1760, gain: 0.04, decay: 1.6, ratio: 1, index: 0.4, bus: 'ui', send: 0.5 });
    } else if (kind === 'big') {
      audio.bell({ t, freq: 880, gain: 0.025, decay: 1.2, ratio: 1, index: 0.3, bus: 'ui', send: 0.5 });
      audio.bell({ t: t + 0.1, freq: 1319, gain: 0.02, decay: 1.4, ratio: 1, index: 0.3, bus: 'ui', send: 0.5 });
    }
  }

  private click(): void {
    if (!audio.running) return;
    audio.tone({ freq: 1250, to: 950, dur: 0.03, gain: 0.035, type: 'triangle', lp: 3500, bus: 'ui', send: 0.05 });
  }

  private panelCue(open: boolean): void {
    audio.tone({ freq: open ? 260 : 330, to: open ? 360 : 230, dur: 0.12, gain: 0.04, type: 'triangle', lp: 1500, bus: 'ui', send: 0.2 });
    audio.hiss({ dur: 0.14, gain: 0.02, type: 'lowpass', freq: 900, bus: 'ui' });
  }

  private lampCue(on: boolean): void {
    audio.tone({ freq: on ? 2100 : 1700, dur: 0.02, gain: 0.04, type: 'square', lp: 4000 });
    audio.thump({ freq: on ? 420 : 360, gain: 0.03, dur: 0.05, send: 0 });
  }

  private hatch(boarding: boolean): void {
    audio.metal({ freq: 180, gain: 0.07, decay: 0.6 });
    audio.hiss({ t: audio.now + 0.1, dur: boarding ? 0.9 : 0.5, gain: 0.05, freq: 1800, to: 700, q: 0.8 });
    if (!boarding) audio.bubbles({ n: 10, spread: 0.6, gain: 0.03 });
  }

  private clamps(docked: boolean): void {
    const t = audio.now;
    audio.thump({ t, freq: 80, gain: 0.15, dur: 0.35 });
    audio.metal({ t, freq: 150, gain: 0.08, decay: 0.8 });
    if (docked) audio.metal({ t: t + 0.28, freq: 165, gain: 0.07, decay: 0.8 });
    audio.hiss({ t: t + 0.3, dur: 0.8, gain: 0.05, freq: 1600, to: 600, q: 0.8 });
  }

  private splash(strength: number, up: boolean): void {
    // Unmuffled when the head comes out; muffled bubbles when diving back in.
    const bus: BusName = up ? 'ui' : 'sfx';
    audio.hiss({ dur: 0.35 + 0.4 * strength, gain: 0.08 + 0.12 * strength, type: 'lowpass', freq: up ? 3500 : 1200, to: 400, bus, send: 0.15 });
    audio.hiss({ dur: 0.15, gain: 0.05 * strength, type: 'highpass', freq: 3000, bus, send: 0.1 });
    if (!up) audio.bubbles({ n: 14, spread: 0.7, gain: 0.04, low: 300, high: 1200 });
  }

  private heartbeat(): void {
    const t = audio.now;
    for (let i = 0; i < 3; i++) {
      audio.thump({ t: t + i * 0.9, freq: 55, gain: 0.25, dur: 0.18, bus: 'ui', send: 0.1 });
      audio.thump({ t: t + i * 0.9 + 0.22, freq: 50, gain: 0.18, dur: 0.18, bus: 'ui', send: 0.1 });
    }
  }
}
