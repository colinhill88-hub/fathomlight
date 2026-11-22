import { audio, BusName } from './engine';
import { Ambience, ZoneMix } from './ambience';
import { Music, MusicZone, zoneRoot } from './music';
import { SAMPLE_FILES, SAMPLE_GROUPS } from './samples';
import { jit, rr, semi } from './variety';
import { BASIN_EAST, CAVE, FOREST, GROTTO, inCaveTunnel, inKelpCaves, inSanctum, KC, SITE_MOUTH, TRENCH, WRECK_SHELF } from '../world/terrain';

/*
 * Milestone 7b: the sound director. main.ts hands it a snapshot of the game
 * every frame; it works out the zone mix, keeps the ambience and music in
 * step, runs the looping sounds (breathing, scanning, work at the Collect
 * button, drone welding, the sub's motor, machinery) and fires the one-off
 * cues. A few cues come straight from game events (pickups, dents, toasts).
 */

export type WorkKind = 'fibre' | 'scrap' | 'copper' | 'quartz' | 'resin' | 'moss' | 'brass' | 'bloom' | 'ore' | 'creature' | 'repair' | 'winch' | 'recorder' | 'cutter' | 'bracket';

/** Phase 16: hold actions with their own release in holdDone() (materials get theirs from pickup()). */
const HOLD_RELEASE: ReadonlySet<WorkKind> = new Set(['winch', 'cutter', 'bracket', 'recorder', 'creature']);

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
  /** Milestone 7 part 2: the cold surge in the kelp caves (0..1) and the helmet in an air pocket. */
  surge: number;
  inAir: boolean;
  /** Milestone 8: the race current here (0..1) and suit integrity (0..1). */
  race: number;
  suit: number;
  /** Phase 16: 0..1 how far the current Collect work has got (strokes build towards the release). */
  workProgress?: number;
  /** Phase 16: KS-1's drill nose biting (0..1 progress), or null. */
  drill?: number | null;
  /** Phase 16: on foot inside: the base (steel decks) or a wreck (wet, loose plates); null outside. */
  indoors?: 'base' | 'wreck' | null;
  /** Phase 16: on foot: walking speed (px/s) and whether the boots are on the floor. */
  walk?: { speed: number; ground: boolean };
  /** Phase 16 round 3: creatures out in the world near the listener (not eggs), for their soft calls. */
  critters?: { species: string; x: number; y: number; young: boolean }[];
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

/** How much of each zone a point is in. */
export function zoneMix(x: number, y: number): ZoneMix {
  let cave = 0;
  if ((inCaveTunnel(x, y) && x > CAVE.x0 + 60 && x < CAVE.x1 - 40) || inKelpCaves(x, y)) cave = 1;
  else if (x > GROTTO.x0 - 60 && x < GROTTO.x1 + 60 && y > GROTTO.y0 - 60) cave = 0.6;
  const mouth = Math.hypot((x - SITE_MOUTH.x) / (SITE_MOUTH.rx * 3), (y - SITE_MOUTH.y) / (SITE_MOUTH.ry * 3));
  cave = Math.max(cave, 0.6 * (1 - smooth(mouth)));
  // Milestone 10: the trench takes over from the shelf past its rim, more so the deeper.
  const trench = smooth((x - (TRENCH.x0 + 100)) / 500) * smooth((y - 1500) / 600);
  const shelfRaw = smooth((x - (WRECK_SHELF.x0 - 400)) / 500);
  const shelf = shelfRaw * (1 - trench);
  const forest = smooth((x - (FOREST.x0 - 500)) / 600) * (1 - shelfRaw);
  const basin = x < BASIN_EAST + 150 ? smooth((y - 300) / 600) * (1 - smooth((x - (BASIN_EAST - 250)) / 400)) : 0;
  // Milestone 11: inside the sanctum the Choir's water takes over everything.
  const sanctum = inSanctum(x, y) ? 1 : 0;
  cave *= 1 - sanctum;
  const rest = 1 - cave - sanctum;
  const f = forest * rest;
  const b = basin * (1 - forest) * rest;
  const sh = shelf * rest;
  const tr = trench * rest;
  return { cave, forest: f, basin: b, shelf: sh, trench: tr, sanctum, shallows: Math.max(0, rest - f - b - sh - tr) };
}

export class SoundDirector {
  private ambience = new Ambience();
  private music = new Music();
  private mix: ZoneMix = { shallows: 1, basin: 0, forest: 0, cave: 0, shelf: 0, trench: 0, sanctum: 0 };
  private musicZone: MusicZone = 'shallows';
  private prev: Partial<AudioFrame> = {};
  private breathClock = 2;
  private breathPhase: 'in' | 'out' = 'in';
  private beepClock = 0;
  private suitClock = 0;
  private workClock = 0;
  private weldClock = 0;
  private strokes = new Map<number, number>();
  private toastAt: Record<string, number> = {};
  private loops: {
    scan: { osc: OscillatorNode; gain: GainNode };
    motion: { gain: GainNode; filter: BiquadFilterNode };
    motor: { gain: GainNode; oscs: OscillatorNode[]; filter: BiquadFilterNode; wash: GainNode; washF: BiquadFilterNode; whine: GainNode; whineO: OscillatorNode };
    hum: { gain: GainNode; pan: StereoPannerNode | null };
    rumble: GainNode;
    /** Phase 16: the drill nose (motor and rock grind) and KD-1's little propeller. */
    drill: { gain: GainNode; motor: OscillatorNode; grind: BiquadFilterNode; grindG: GainNode };
    whir: { gain: GainNode; osc: OscillatorNode; pan: StereoPannerNode | null };
    /** Round 3: KS-1 idling, heard from outside (placed where the sub is). */
    idle: { gain: GainNode; pan: StereoPannerNode | null };
  } | null = null;
  /** Phase 16: the work under way last frame (to hear its release), and clocks for small repeating cues. */
  private lastWork: WorkKind | null = null;
  private scanTick = 0;
  private drillGrit = 0;
  private stepClock = 0;
  private dronePrev: { x: number; y: number } | null = null;
  /** Round 3: seconds until a nearby creature next calls. */
  private callClock = 3;

  constructor() {
    audio.onReady(() => this.build());
    audio.loadSamples(SAMPLE_FILES);
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

    // The cold surge: a deep rushing rumble.
    const rSrc = ctx.createBufferSource();
    rSrc.buffer = audio.brown;
    rSrc.loop = true;
    const rF = ctx.createBiquadFilter();
    rF.type = 'lowpass';
    rF.frequency.value = 260;
    const rumble = ctx.createGain();
    rumble.gain.value = 0;
    rSrc.connect(rF);
    rF.connect(rumble);
    audio.route(rumble, 'ambience', 0.4);
    rSrc.start();

    // Phase 16: the drill nose: a straining electric motor and a gritty grind of rock.
    const drillG = ctx.createGain();
    drillG.gain.value = 0;
    const motor = ctx.createOscillator();
    motor.type = 'sawtooth';
    motor.frequency.value = 70;
    const motorLp = ctx.createBiquadFilter();
    motorLp.type = 'lowpass';
    motorLp.frequency.value = 900;
    motor.connect(motorLp);
    const motorAmt = ctx.createGain();
    motorAmt.gain.value = 0.35;
    motorLp.connect(motorAmt);
    motorAmt.connect(drillG);
    motor.start();
    const gSrc = ctx.createBufferSource();
    gSrc.buffer = audio.brown;
    gSrc.loop = true;
    const grind = ctx.createBiquadFilter();
    grind.type = 'bandpass';
    grind.frequency.value = 700;
    grind.Q.value = 1.1;
    const grindG = ctx.createGain();
    grindG.gain.value = 1;
    gSrc.connect(grind);
    grind.connect(grindG);
    grindG.connect(drillG);
    gSrc.start(0, Math.random() * 3);
    audio.route(drillG, 'sfx', 0.25);

    // Phase 16: KD-1's propeller: a soft whir that follows the drone around (panned, fading with distance).
    const whirG = ctx.createGain();
    whirG.gain.value = 0;
    const whirO = ctx.createOscillator();
    whirO.type = 'triangle';
    whirO.frequency.value = 190;
    const whirTrem = ctx.createOscillator();
    whirTrem.frequency.value = 23;
    const whirAmt = ctx.createGain();
    whirAmt.gain.value = 0.4;
    const whirVca = ctx.createGain();
    whirVca.gain.value = 0.6;
    whirTrem.connect(whirAmt);
    whirAmt.connect(whirVca.gain);
    whirO.connect(whirVca);
    whirVca.connect(whirG);
    whirO.start();
    whirTrem.start();
    const whirPan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (whirPan) {
      whirG.connect(whirPan);
      audio.route(whirPan, 'sfx', 0.2);
    } else audio.route(whirG, 'sfx', 0.2);

    // Round 3: KS-1 idling, heard from outside: a low electric hum with a pump that breathes slowly,
    // and a faint higher whine so it still reads on a phone speaker. Panned and faded by distance.
    const idleG = ctx.createGain();
    idleG.gain.value = 0;
    const idleF = ctx.createBiquadFilter();
    idleF.type = 'lowpass';
    idleF.frequency.value = 700;
    const idlePump = ctx.createGain();
    idlePump.gain.value = 0.75;
    const pumpLfo = ctx.createOscillator();
    pumpLfo.frequency.value = 0.9;
    const pumpAmt = ctx.createGain();
    pumpAmt.gain.value = 0.25;
    pumpLfo.connect(pumpAmt);
    pumpAmt.connect(idlePump.gain);
    pumpLfo.start();
    for (const [f, type, g] of [
      [48, 'sawtooth', 0.5],
      [144, 'triangle', 0.35],
      [233, 'triangle', 0.25],
      [961, 'sine', 0.04],
    ] as [number, OscillatorType, number][]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = Math.random() * 8 - 4;
      const og = ctx.createGain();
      og.gain.value = g;
      o.connect(og);
      og.connect(idleF);
      o.start();
    }
    idleF.connect(idlePump);
    idlePump.connect(idleG);
    const idlePan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (idlePan) {
      idleG.connect(idlePan);
      audio.route(idlePan, 'sfx', 0.25);
    } else audio.route(idleG, 'sfx', 0.25);

    this.loops = {
      idle: { gain: idleG, pan: idlePan },
      drill: { gain: drillG, motor, grind, grindG },
      whir: { gain: whirG, osc: whirO, pan: whirPan },
      rumble,
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

  private epoch = 0;
  update(f: AudioFrame): void {
    if (this.epoch !== audio.epoch) {
      this.epoch = audio.epoch;
      this.toastAt = {};
    }
    const p = this.prev;
    const dt = f.dt;
    // Zone mix, eased so moving between zones crossfades.
    const want = zoneMix(f.x, f.y);
    const k = 1 - Math.exp(-dt / 1.6);
    for (const z of ['shallows', 'basin', 'forest', 'cave', 'shelf', 'trench', 'sanctum'] as const) this.mix[z] += (want[z] - this.mix[z]) * k;
    const top = (['shallows', 'basin', 'forest', 'cave', 'shelf', 'trench', 'sanctum'] as const).reduce((a, b) => (this.mix[b] > this.mix[a] ? b : a));
    if (top !== this.musicZone && this.mix[top] > 0.6) {
      this.musicZone = top;
      this.music.setZone(top);
    }
    const depth = clamp01(f.depthM / 25);
    const nearSurface = clamp01(1 - f.depthM / 6);
    const m = this.mix;
    // Phase 16: inside the base or a wreck the echo is a short steel room, and the ocean is heard
    // dull through the hull; aboard KS-1 the sea outside is dulled too, but the sub's own sounds are not.
    const indoors = !!f.indoors;
    audio.setScene({
      muffle: f.surfaced || f.inAir ? 16000 : Math.max(900, 4200 - 2300 * depth - 900 * m.cave - 500 * m.forest),
      space: indoors ? 0.32 : f.surfaced ? 0.12 : 0.28 + 0.15 * m.basin + 0.12 * m.forest + 0.8 * m.cave + 0.3 * m.shelf + 0.6 * m.trench + 0.9 * m.sanctum,
      duck: (f.panel ? 0.55 : 1) * (1 - 0.45 * f.lowAir),
      blackout: f.blackout,
      room: indoors ? 1 : 0,
      hull: indoors ? 420 : f.aboard ? 750 : 20000,
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
      if (!this.sam('bubble', { gain: 0.035, rate: 0.8 })) audio.bubbles({ n: 8, spread: 0.4, gain: 0.03, low: 300, high: 900 });
    }
    if (p.blackout !== undefined && p.blackout <= 0.02 && f.blackout > 0.02) this.heartbeat();
    if (p.blackout !== undefined && p.blackout > 0.3 && f.blackout <= 0.3 && f.blackout < (p.blackout ?? 0)) {
      audio.bell({ freq: 587, gain: 0.04, decay: 2.5, ratio: 1, index: 0.5, bus: 'ui', send: 0.6 });
    }
    if (f.splash > 0 && !f.aboard) this.splash(f.splash, f.surfaced);
    if (p.surfaced === true && !f.surfaced && !f.aboard && f.splash <= 0) this.splash(0.3, false);
    if (f.exhale) audio.hiss({ dur: 0.7, attack: 0.08, gain: 0.05, type: 'lowpass', freq: 1100, bus: 'sfx', send: 0.05 });

    // ---- The cold surge (kelp caves) ----
    const nearSqueeze = clamp01(1 - Math.abs(f.x - (KC.squeeze.x1 + KC.squeeze.x2) / 2) / 900) * (m.cave > 0.5 ? 1 : 0);
    L.rumble.gain.setTargetAtTime(out ? 0 : 0.5 * f.surge * nearSqueeze + 0.4 * f.race, t, 0.25);
    // A cracked suit: a slow two-tone alarm from the helmet, under a third.
    if (f.suit < 0.34 && !out && !f.freeAir) {
      this.suitClock -= dt;
      if (this.suitClock <= 0) {
        this.suitClock = 2.6;
        audio.tone({ t, freq: 880, dur: 0.18, gain: 0.045, type: 'triangle', lp: 2400, bus: 'ui' });
        audio.tone({ t: t + 0.22, freq: 660, dur: 0.24, gain: 0.045, type: 'triangle', lp: 2400, bus: 'ui' });
      }
    } else this.suitClock = 0.6;
    if (p.inAir === false && f.inAir) audio.hiss({ dur: 0.6, attack: 0.05, gain: 0.05, type: 'lowpass', freq: 1400, bus: 'ui', send: 0.3 });

    // ---- Swimming through water ----
    const swim = f.aboard || f.surfaced ? 0 : clamp01(f.speed / 420);
    L.motion.gain.gain.setTargetAtTime(0.12 * swim * swim, t, 0.15);
    L.motion.filter.frequency.setTargetAtTime(220 + 500 * swim, t, 0.2);

    // ---- Breathing (Colin: subtle, faster and louder as air runs low) ----
    if (!f.aboard && !f.surfaced && !f.inDome && !f.inAir && !out) {
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
          // Round 3: a recorded regulator exhale carries the bubbles; the synthesised rush stays under it,
          // and the synthesised bubbles take over if the file is not loaded.
          audio.hiss({ dur: 1.0, attack: 0.1, gain: level * 0.5, freq: 380, q: 0.9, brown: true, send: 0.05 });
          if (!this.sam('exhale', { t: t + 0.05, gain: level * 1.1, rate: 1 - 0.08 * f.lowAir, send: 0.05 }))
            audio.bubbles({ t: t + 0.1, n: 10 + Math.round(8 * f.lowAir), spread: 1.1, gain: level * 0.7, low: 260, high: 1000 });
          else if (f.lowAir > 0) audio.bubbles({ t: t + 0.1, n: Math.round(8 * f.lowAir), spread: 1.1, gain: level * 0.5, low: 260, high: 1000 });
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
        // Phase 16: danger first. The beeps start a touch louder than a pickup's ting, and grow from there.
        for (const i of [0, 1]) audio.tone({ t: t + i * 0.16, freq: 1760, dur: 0.07, gain: 0.04 + 0.04 * f.lowAir, type: 'square', lp: 2600, bus: 'ui', send: 0.05 });
      }
    } else this.beepClock = 0.4;

    // ---- Scanning: a rising sweep, then the chime comes with the "Scanned" notice ----
    if (f.scanning !== null && !out) {
      L.scan.gain.gain.setTargetAtTime(0.03, t, 0.05);
      L.scan.osc.frequency.setTargetAtTime(420 + 900 * f.scanning + 30 * Math.sin(t * 40), t, 0.03);
      // Phase 16: the anticipation: soft sonar ticks that speed up and climb as the scan fills.
      this.scanTick -= dt;
      if (this.scanTick <= 0) {
        this.scanTick = 0.26 - 0.17 * f.scanning;
        audio.tone({ freq: (1900 + 1300 * f.scanning) * jit(0.02), dur: 0.025, gain: 0.012 + 0.01 * f.scanning, type: 'triangle', lp: 5000, send: 0.3 });
      }
    } else {
      L.scan.gain.gain.setTargetAtTime(0, t, 0.06);
      this.scanTick = 0;
    }

    // ---- Work at the Collect button ----
    // Phase 16: strokes vary and build with progress; a hold action that completes gets its own release.
    const workPan = Math.max(-0.7, Math.min(0.7, (f.workX - f.x) / 300));
    const wk = clamp01(f.workProgress ?? 0);
    if (f.work && !out) {
      if (this.lastWork !== f.work) this.workStart(f.work, workPan);
      this.workClock -= dt;
      if (this.workClock <= 0) this.workClock = this.workHit(f.work, workPan, wk);
      this.lastWork = f.work;
    } else {
      this.workClock = 0.05;
      this.lastWork = null;
    }

    // ---- Phase 16: the drill nose ----
    const D = L.drill;
    if (f.drill !== null && f.drill !== undefined && !out) {
      const dk = clamp01(f.drill);
      D.gain.gain.setTargetAtTime(0.06 + 0.05 * dk, t, 0.08);
      D.motor.frequency.setTargetAtTime(62 + 40 * dk + 6 * Math.sin(t * 7), t, 0.1);
      D.grind.frequency.setTargetAtTime(500 + 900 * dk, t, 0.15);
      // Grit: chips of rock cracking off, more often as it bites deeper.
      this.drillGrit -= dt;
      if (this.drillGrit <= 0) {
        this.drillGrit = (0.16 - 0.09 * dk) * jit(0.4);
        const v = rr('drill', 4);
        audio.hiss({ dur: 0.018 + 0.01 * v, gain: (0.05 + 0.04 * dk) * jit(0.2), freq: (1600 + 500 * v) * jit(0.1), q: 2.5, send: 0.2 });
        if (v === 0) audio.metal({ freq: 150 * jit(0.15), gain: 0.03, decay: 0.2, send: 0.25 });
        // Round 3: loosened grit pouring off the nose now and then (a recorded trickle, slowed).
        else if (v === 2 && Math.random() < 0.5) this.sam('sand', { gain: 0.025 + 0.025 * dk, rate: 0.6 + 0.2 * dk, send: 0.25 });
      }
    } else D.gain.gain.setTargetAtTime(0, t, 0.12);

    // ---- Phase 16: KD-1's propeller whir, placed in the world ----
    const dp = this.dronePrev;
    const droneSpeed = dp && dt > 0 ? Math.hypot(f.drone.x - dp.x, f.drone.y - dp.y) / dt : 0;
    this.dronePrev = { x: f.drone.x, y: f.drone.y };
    const W = L.whir;
    const dpl = this.place(f.drone.x, f.drone.y, f, 900);
    const whirOn = !out && !indoors && !f.aboard && droneSpeed > 15 && droneSpeed < 2000 && (f.drone.x !== 0 || f.drone.y !== 0);
    W.gain.gain.setTargetAtTime(whirOn ? 0.03 * dpl.g * clamp01(droneSpeed / 260) : 0, t, 0.2);
    W.osc.frequency.setTargetAtTime(170 + 0.25 * Math.min(400, droneSpeed), t, 0.3);
    if (W.pan) W.pan.pan.setTargetAtTime(dpl.pan, t, 0.2);

    // ---- Phase 16: footsteps on foot (steel decks in the base, loose wet plates in a wreck) ----
    if (f.walk && f.walk.ground && Math.abs(f.walk.speed) > 25 && !out) {
      this.stepClock -= dt;
      if (this.stepClock <= 0) {
        const run = clamp01((Math.abs(f.walk.speed) - 60) / 200);
        this.stepClock = (0.42 - 0.17 * run) * jit(0.05);
        this.footstep(f.indoors === 'wreck' ? 'wreck' : 'deck', 0.7 + 0.5 * run);
      }
    } else this.stepClock = 0.12;

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
    // Round 3: KS-1 heard from outside: idling where it is parked, louder as you swim up to it.
    const I = L.idle;
    if (S && S.built && !f.aboard && !indoors && !out) {
      const pl = this.place(S.x, S.y, f, 700);
      I.gain.gain.setTargetAtTime(0.06 * pl.g, t, 0.4);
      if (I.pan) I.pan.pan.setTargetAtTime(pl.pan, t, 0.3);
    } else I.gain.gain.setTargetAtTime(0, t, 0.3);

    // ---- Round 3: soft creature calls, placed where each creature is ----
    this.callClock -= dt;
    if (this.callClock <= 0) {
      this.callClock = 4 + Math.random() * 6;
      const near = (f.critters ?? []).filter((c) => this.place(c.x, c.y, f, 900).g > 0.02);
      if (near.length && !out && !indoors && !f.panel) {
        const c = near[Math.floor(Math.random() * near.length)];
        const pl = this.place(c.x, c.y, f, 900);
        this.creatureCall(c.species, c.young, pl.g, pl.pan);
      }
    }

    if (p.sub && S && !p.sub.thrust && S.thrust && f.aboard) {
      audio.hiss({ dur: 0.8, gain: 0.12, freq: 260, to: 700, q: 0.7, brown: true, send: 0.2 });
      audio.bubbles({ n: 14, spread: 0.6, gain: 0.035, low: 250, high: 800 });
    }

    this.prev = { ...f, sub: f.sub ? { ...f.sub } : null };
  }

  // ---------------------------------------------------------------------------
  // One-off cues.

  /**
   * Phase 16: every gather has a shape: anticipation, contact, payoff.
   *  - contact: workHit() strokes, never the same twice (a round-robin of
   *    voicings plus a little random pitch and level), getting firmer, higher
   *    and quicker as the progress ring fills (k = 0..1), with a hint of strain
   *    near the end;
   *  - release: pickup() (materials) or workDone() (hold actions) the moment it
   *    comes loose: a crunch, pop, snap or clunk that suits the material;
   *  - reward: the Phase 14 ting (stingMinor) that climbs the scale, unchanged.
   * Returns seconds to the next stroke.
   */
  private workHit(kind: WorkKind, pan: number, k: number): number {
    const t = audio.now;
    const VOICES = [1, semi(2), semi(-1.5), semi(3), semi(0.7)];
    const v = rr(`work:${kind}`, VOICES.length);
    const up = VOICES[v] * (1 + 0.12 * k) * jit(0.03);
    const amp = (0.7 + 0.5 * k) * jit(0.12);
    const pace = (1 - 0.3 * k) * jit(0.08);
    const strain = k > 0.62;
    switch (kind) {
      case 'fibre': // Cut: a blade slicing kelp, the stalk's fibres creaking as it gives.
        audio.hiss({ dur: 0.1 + 0.03 * (v % 2), gain: 0.07 * amp, freq: 2600 * up, to: 1100 * up, q: 1.5, pan });
        audio.hiss({ t: t + 0.02, dur: 0.05, gain: 0.03 * amp, freq: 700 * up, q: 3, pan, brown: true });
        if (strain) audio.tone({ t: t + 0.04, freq: 150 * up, to: 190 * up, dur: 0.16, gain: 0.02 * amp, type: 'sawtooth', lp: 700, pan });
        return 0.3 * pace;
      case 'scrap': // Pry loose: metal grinding, a clank as it shifts, loose bits rattling near the end.
        audio.tone({ freq: 140 * up, to: 185 * up, dur: 0.28, gain: 0.04 * amp, type: 'sawtooth', lp: 900, pan });
        if (v !== 1) audio.metal({ t: t + 0.22, freq: 230 * up, gain: 0.05 * amp, decay: 0.45, pan });
        if (strain) for (let i = 0; i < 3; i++) audio.metal({ t: t + 0.3 + i * 0.05 * jit(0.3), freq: 900 * up * jit(0.15), gain: 0.012, decay: 0.08, pan });
        return 0.52 * pace;
      case 'copper': // Dig out: the trowel thuds into gravel, stones scatter, sand trickles as it loosens.
        audio.thump({ freq: 150 * up, gain: 0.09 * amp, dur: 0.16, pan });
        if (!this.sam('mining', { t, gain: 0.045 * amp, rate: 1.15 * up, pan })) this.gravel(t + 0.015, 3 + v, 0.05 * amp, up, pan);
        // Round 3: near the end, sand trickles out from around the nugget (a recorded trickle, every other stroke).
        if (strain && (v % 2 === 1 || !this.sam('sand', { t: t + 0.08, gain: 0.03 * amp, rate: 0.75 * up, pan })))
          audio.hiss({ t: t + 0.08, dur: 0.35, attack: 0.05, gain: 0.025 * amp, type: 'lowpass', freq: 1400 * up, pan, brown: true });
        return 0.42 * pace;
      case 'ore': // Chip off vent ore: dull cracks into warm crust, warm water hissing out of the cracks.
        audio.thump({ freq: 110 * up, gain: 0.07 * amp, dur: 0.14, pan });
        audio.hiss({ dur: 0.045, gain: 0.07 * amp, freq: 1800 * up, q: 1.2, pan });
        if (strain) audio.hiss({ t: t + 0.05, dur: 0.4, attack: 0.04, gain: 0.025 * amp, freq: 3000, to: 2200, q: 0.8, pan });
        return 0.4 * pace;
      case 'quartz': // Chip off: hard taps on crystal; it starts to sing as the crack runs.
        audio.tone({ freq: 2900 * up, dur: 0.05, gain: 0.035 * amp, pan, send: 0.3 });
        audio.hiss({ dur: 0.022, gain: 0.08 * amp, freq: 3800 * up, q: 2, pan });
        if (strain) audio.bell({ t: t + 0.02, freq: 1800 * up, gain: 0.012 * amp, decay: 0.5, ratio: 2.76, index: 0.4, pan, send: 0.4 });
        return 0.36 * pace;
      case 'resin': // Scrape off: a blade dragged over a holdfast; the resin stretches before it lets go.
        audio.hiss({ dur: 0.2, attack: 0.03, gain: 0.05 * amp, freq: 1300 * up, to: 2100 * up, q: 3, pan });
        if (strain) audio.tone({ t: t + 0.08, freq: 210 * up, to: 150 * up, dur: 0.22, gain: 0.025 * amp, type: 'triangle', lp: 600, pan });
        return 0.42 * pace;
      case 'bloom':
      case 'moss':
      case 'bracket': // Peel off: a soft tearing crackle (a bloom glimmers faintly as it lifts).
        for (let i = 0; i < 3 + v; i++) audio.hiss({ t: t + i * 0.033 * jit(0.3), dur: 0.018, gain: 0.04 * amp, freq: 1200 * up * jit(0.2), q: 1.5, pan });
        if (kind === 'bloom' && v === 0) audio.bell({ t: t + 0.05, freq: 1320 * up, gain: 0.01, decay: 0.6, ratio: 3.01, index: 0.2, pan, send: 0.6 });
        return 0.32 * pace;
      case 'creature': // Coaxing a creature into the jar: gentle bubbles, a little quicker as it comes.
        audio.bubbles({ n: 2 + (v % 2), spread: 0.2, gain: 0.025 * amp, low: 500 * up, high: 1100 * up, pan });
        return 0.5 * pace;
      case 'repair': // Repairing the drone: welding crackle.
        for (let i = 0; i < 4; i++) audio.hiss({ t: t + Math.random() * 0.12, dur: 0.015, gain: 0.07 * jit(0.3), type: 'highpass', freq: 3000 * jit(0.2), pan });
        return 0.14;
      case 'winch': // Winding the boom winch: ratchet clicks that quicken, and a strained groan that rises.
        audio.metal({ freq: 820 * up, gain: 0.03 * amp, decay: 0.1, pan });
        if (v === 0) audio.tone({ freq: (62 + 30 * k) * jit(0.04), to: (58 + 26 * k), dur: 0.6, gain: 0.04 * amp, type: 'sawtooth', lp: 400, pan });
        return 0.19 * (1 - 0.45 * k) * jit(0.05);
      case 'brass': // Unbolt: a wrench ratchet, a dull bell-metal clank; the bolt squeals as it turns.
        audio.metal({ freq: 520 * up, gain: 0.025 * amp, decay: 0.1, pan });
        if (v % 2 === 0) audio.metal({ t: t + 0.15, freq: 300 * up, gain: 0.045 * amp, decay: 0.7, pan });
        if (strain) audio.tone({ t: t + 0.06, freq: 1400 * up, to: 1650 * up, dur: 0.12, gain: 0.008, type: 'sawtooth', lp: 3000, pan });
        return 0.3 * pace;
      case 'cutter': // The cutter torch: a roaring hiss, crackle and boiling bubbles, fiercer as it cuts through.
        audio.hiss({ dur: 0.24, gain: 0.07 * amp, freq: 3200 * up, q: 0.6, pan });
        for (let i = 0; i < 2 + v; i++) audio.hiss({ t: t + Math.random() * 0.2, dur: 0.015, gain: 0.08, type: 'highpass', freq: 2600 * jit(0.3), pan });
        audio.bubbles({ n: 3, spread: 0.2, gain: 0.03, low: 600, high: 1600, pan });
        return 0.2 * jit(0.1);
      case 'recorder': // Unclipping the recorder: small latches.
        audio.tone({ freq: 1800 * up, dur: 0.03, gain: 0.04 * amp, type: 'triangle', pan });
        return 0.4 * pace;
    }
  }

  /**
   * Round 2: one recorded CC0 variant from a group (round-robin, pitch and level
   * nudged). Returns false if the files are not loaded, so callers keep the
   * synthesised sound. Underwater it passes the muffle like any effect.
   */
  private sam(group: string, o: { t?: number; gain: number; rate: number; pan?: number; send?: number; bus?: BusName }): boolean {
    const n = SAMPLE_GROUPS[group] ?? 0;
    if (!n) return false;
    return audio.sample(`${group}-${rr(`sam:${group}`, n) + 1}`, { ...o, gain: o.gain * jit(0.1), rate: o.rate * jit(0.06) });
  }

  /** Phase 16: stones and grit scattering (a handful of short, gritty grains). */
  private gravel(t: number, n: number, gain: number, up: number, pan: number): void {
    for (let i = 0; i < n; i++)
      audio.hiss({ t: t + Math.random() * 0.07, dur: 0.008 + Math.random() * 0.014, gain: gain * jit(0.4), freq: (900 + Math.random() * 1500) * up, q: 2.2, pan: pan + (Math.random() - 0.5) * 0.2, brown: i % 2 === 0 });
  }

  /** Phase 16: the anticipation when a hold starts (the cutter lights, the winch brake lets go). */
  private workStart(kind: WorkKind, pan: number): void {
    const t = audio.now;
    if (kind === 'cutter') {
      // Ignition: a soft whump and a rising hiss as the flame catches.
      audio.thump({ t, freq: 160, gain: 0.08, dur: 0.15, pan });
      audio.hiss({ t, dur: 0.3, attack: 0.08, gain: 0.06, freq: 900, to: 3200, q: 0.7, pan });
    } else if (kind === 'winch') {
      audio.metal({ t, freq: 340 * jit(0.05), gain: 0.04, decay: 0.35, pan });
    }
  }

  /**
   * Phase 16: the release when a hold action finishes (called by main.ts at the
   * moment it completes, never when Collect is let go early). `dx` is how far the
   * work is from the listener, for panning.
   */
  holdDone(kind: WorkKind, dx = 0): void {
    if (!audio.running || !HOLD_RELEASE.has(kind)) return;
    this.workDone(kind, Math.max(-0.7, Math.min(0.7, dx / 300)));
  }

  private workDone(kind: WorkKind, pan: number): void {
    const t = audio.now;
    switch (kind) {
      case 'winch': // The pawl drops home: a heavy clunk, a chain shiver and the strain let go.
        audio.thump({ t, freq: 95, gain: 0.09, dur: 0.35, pan, send: 0.35 });
        audio.metal({ t, freq: 210 * jit(0.04), gain: 0.05, decay: 1.1, pan });
        for (let i = 0; i < 5; i++) audio.metal({ t: t + 0.08 + i * 0.04 * jit(0.3), freq: 1100 * jit(0.2), gain: 0.012, decay: 0.07, pan });
        audio.bubbles({ t: t + 0.1, n: 8, spread: 0.5, gain: 0.03, pan });
        break;
      case 'cutter': // Through: a crack, a low groan of the wall giving way and a gush of bubbles.
        audio.hiss({ t, dur: 0.05, gain: 0.08, freq: 2400, q: 1, pan });
        audio.thump({ t: t + 0.02, freq: 80, gain: 0.11, dur: 0.6, pan, send: 0.4 });
        audio.hiss({ t: t + 0.05, dur: 0.9, attack: 0.04, gain: 0.045, type: 'lowpass', freq: 900, to: 250, pan, brown: true });
        audio.bubbles({ t: t + 0.05, n: 18, spread: 0.8, gain: 0.04, low: 300, high: 1400, pan });
        // Round 3: the last stalks of the wall snap (recorded, slowed: big, tough kelp) and a burst of bubbles.
        this.sam('kelp', { t: t + 0.01, gain: 0.05, rate: 0.5, pan, send: 0.4 });
        this.sam('kelp', { t: t + 0.16, gain: 0.03, rate: 0.6, pan: pan * 0.5, send: 0.4 });
        this.sam('bubble', { t: t + 0.1, gain: 0.04, rate: 0.7, pan });
        break;
      case 'bracket': // A bracket lit: the moss comes free with a soft rip and a puff.
        this.sam('rip', { t, gain: 0.05, rate: 0.75, pan });
        audio.hiss({ t, dur: 0.12, gain: 0.045, freq: 900, to: 2600, q: 1.2, pan });
        audio.bubbles({ t: t + 0.04, n: 6, spread: 0.3, gain: 0.03, pan });
        break;
      case 'recorder': // The last latch springs.
        audio.metal({ t, freq: 1300, gain: 0.03, decay: 0.15, pan });
        audio.thump({ t: t + 0.03, freq: 240, gain: 0.05, dur: 0.08, pan });
        break;
      case 'creature': // In: the lid snaps shut over a swirl of bubbles.
        if (!this.sam('bubble', { t, gain: 0.035, rate: 1.15, pan })) audio.bubbles({ t, n: 8, spread: 0.35, gain: 0.03, low: 500, high: 1400, pan });
        audio.tone({ t: t + 0.18, freq: 1500, to: 1100, dur: 0.03, gain: 0.03, type: 'triangle', pan });
        break;
      default:
        break;
    }
  }

  /**
   * A material comes loose (the collect finishes). Phase 16: a release that suits
   * the material, varied each time. The reward ting (Phase 14 stingMinor) plays
   * over it; the old per-material clink is now a short tonal tag under the ting.
   */
  pickup(kind: string): void {
    if (!audio.running) return;
    const t = audio.now;
    const v = rr(`loose:${kind}`, 4);
    const up = [1, semi(1.5), semi(-1), semi(2.5)][v] * jit(0.03);
    switch (kind) {
      case 'copper': // Pops out of the gravel: a crunch, stones skittering, the nugget's dull ring.
        audio.thump({ t, freq: 140 * up, gain: 0.12, dur: 0.2 });
        if (!this.sam('mining', { t, gain: 0.065, rate: 0.85 * up })) this.gravel(t, 7, 0.07, up, 0);
        this.sam('sand', { t: t + 0.06, gain: 0.015, rate: 0.85 * up });
        audio.metal({ t: t + 0.05, freq: 620 * up, gain: 0.025, decay: 0.35, send: 0.3 });
        break;
      case 'scrap': // Tears free: a short screech, a clank and the rattle of loose bits.
        audio.tone({ t, freq: 420 * up, to: 260 * up, dur: 0.12, gain: 0.03, type: 'sawtooth', lp: 1800 });
        audio.metal({ t: t + 0.06, freq: 260 * up, gain: 0.05, decay: 0.6 });
        this.sam('metal', { t: t + 0.05, gain: 0.07, rate: 0.75 * up });
        for (let i = 0; i < 4; i++) audio.metal({ t: t + 0.12 + i * 0.045 * jit(0.3), freq: 1000 * up * jit(0.2), gain: 0.012, decay: 0.08 });
        break;
      case 'quartz': // Snaps off: a sharp crack, a glassy ring and a few tinkling shards.
        if (!this.sam('glass', { t, gain: 0.07, rate: 1.1 * up, send: 0.35 })) audio.hiss({ t, dur: 0.03, gain: 0.12, freq: 5200 * up, q: 1.6 });
        audio.bell({ t: t + 0.005, freq: 2200 * up, gain: 0.03, decay: 0.8, ratio: 2.76, index: 0.5, send: 0.45 });
        for (let i = 0; i < 3; i++) audio.tone({ t: t + 0.05 + i * 0.05 * jit(0.4), freq: 3500 * up * jit(0.15), dur: 0.04, gain: 0.012, send: 0.4 });
        break;
      case 'resin': // Lets go with a sticky pop.
        audio.tone({ t, freq: 330 * up, to: 120, dur: 0.1, gain: 0.07, type: 'triangle', lp: 1200 });
        audio.hiss({ t, dur: 0.05, gain: 0.04, freq: 1500 * up, q: 2 });
        audio.bubbles({ t: t + 0.04, n: 3, spread: 0.2, gain: 0.025 });
        break;
      case 'moss':
      case 'bloom': // Peels away with a soft rip and a puff of spores.
        // Round 3: a recorded rip, pitched down and muffled by the water, over the synthesised tear.
        this.sam('rip', { t, gain: 0.05, rate: 0.8 * up });
        audio.hiss({ t, dur: 0.13, gain: 0.04, freq: 900 * up, to: 2400 * up, q: 1.2 });
        audio.hiss({ t: t + 0.08, dur: 0.3, attack: 0.05, gain: 0.025, type: 'lowpass', freq: 1500 });
        if (kind === 'bloom') audio.bell({ t: t + 0.06, freq: 1568 * up, gain: 0.018, decay: 1.1, ratio: 3.01, index: 0.3, send: 0.6 });
        break;
      case 'fibre': // The stalk parts: a crisp snap and a swish as it drifts.
        // Round 3: a recorded snap (pitched down a little: kelp is thicker than celery).
        this.sam('kelp', { t, gain: 0.06, rate: 0.75 * up });
        audio.hiss({ t, dur: 0.025, gain: 0.07, freq: 3000 * up, q: 1.5 });
        audio.tone({ t, freq: 240 * up, to: 140, dur: 0.06, gain: 0.04, type: 'triangle', lp: 900 });
        audio.hiss({ t: t + 0.05, dur: 0.3, attack: 0.04, gain: 0.03, freq: 1300, to: 700, q: 1 });
        break;
      case 'ore': // A slab of crust cracks away and warm water hisses out.
        if (!this.sam('mining', { t, gain: 0.065, rate: 0.7 * up })) audio.hiss({ t, dur: 0.05, gain: 0.11, freq: 1600 * up, q: 1.1, brown: true });
        audio.thump({ t, freq: 105 * up, gain: 0.12, dur: 0.25 });
        audio.hiss({ t: t + 0.06, dur: 0.5, attack: 0.03, gain: 0.03, freq: 3200, to: 1800, q: 0.8 });
        break;
      case 'brass': // The bolt gives: a ratchet tick and the heavy fitting clanks free.
        audio.metal({ t, freq: 900 * up, gain: 0.02, decay: 0.08 });
        audio.metal({ t: t + 0.06, freq: 290 * up, gain: 0.06, decay: 1.0, send: 0.4 });
        this.sam('metal', { t: t + 0.06, gain: 0.06, rate: 0.6 * up, send: 0.3 });
        break;
      default: // Hull plating and anything else: a solid metal set-down.
        audio.metal({ t, freq: 330 * up, gain: 0.06, decay: 0.7 });
    }
    // A short tonal tag (the old clink, softer) so each material keeps its own note under the ting.
    const f: Record<string, number> = { quartz: 1568, copper: 880, scrap: 698, fibre: 523, resin: 587, moss: 784, plate: 659 };
    audio.bell({ t: t + 0.04, freq: (f[kind] ?? 700) * jit(0.01), gain: 0.022, decay: 0.45, ratio: 1, index: 0.4, send: 0.3 });
    audio.bubbles({ t: t + 0.03, n: 3, spread: 0.25, gain: 0.022 });
  }

  /** Phase 16: a lode or the seam gives way under the drill: a crunch, a rockfall rumble and grit. */
  drillBreak(): void {
    if (!audio.running) return;
    const t = audio.now;
    audio.thump({ t, freq: 70, gain: 0.13, dur: 0.7, send: 0.4 });
    audio.hiss({ t, dur: 0.06, gain: 0.09, freq: 1400, q: 1, brown: true });
    if (!this.sam('mining', { t, gain: 0.08, rate: 0.6, send: 0.35 })) this.gravel(t + 0.03, 12, 0.06, 0.8, 0);
    this.sam('mining', { t: t + 0.18, gain: 0.06, rate: 0.5, send: 0.4 });
    this.sam('sand', { t: t + 0.3, gain: 0.05, rate: 0.55, send: 0.4 });
    audio.hiss({ t: t + 0.08, dur: 1.1, attack: 0.05, gain: 0.035, type: 'lowpass', freq: 600, to: 200, brown: true, send: 0.4 });
    audio.bubbles({ t: t + 0.1, n: 14, spread: 0.8, gain: 0.035, low: 250, high: 1000 });
  }

  /** Phase 16: KD-1 finishes a weld: the torch sputters out, the new piece settles with a deep clank. */
  weldDone(x: number, y: number): void {
    if (!audio.running) return;
    const f = this.prev as AudioFrame;
    const pl = f.x !== undefined ? this.place(x, y, f, 1800) : { g: 1, pan: 0 };
    if (pl.g < 0.02) return;
    const t = audio.now;
    for (let i = 0; i < 4; i++) audio.hiss({ t: t + i * 0.05 * jit(0.4), dur: 0.012, gain: 0.05 * pl.g, type: 'highpass', freq: 3000 * jit(0.2), pan: pl.pan });
    audio.hiss({ t: t + 0.15, dur: 0.6, attack: 0.03, gain: 0.04 * pl.g, freq: 2400, to: 900, q: 0.8, pan: pl.pan });
    audio.thump({ t: t + 0.25, freq: 85, gain: 0.09 * pl.g, dur: 0.45, pan: pl.pan, send: 0.4 });
    audio.metal({ t: t + 0.26, freq: 140 * jit(0.05), gain: 0.045 * pl.g, decay: 1.4, pan: pl.pan, send: 0.5 });
    audio.bubbles({ t: t + 0.3, n: 10, spread: 0.6, gain: 0.03 * pl.g, pan: pl.pan });
  }

  /** Phase 16: one footstep on foot: steel deck plates in the base, loose wet plates in a wreck. */
  private footstep(surface: 'deck' | 'wreck', weight: number): void {
    const v = rr(`step:${surface}`, 5);
    const up = [1, semi(1), semi(-1.2), semi(2), semi(-0.5)][v] * jit(0.03);
    const g = weight * jit(0.15);
    const t = audio.now;
    audio.thump({ t, freq: 120 * up, gain: 0.042 * g, dur: 0.09, send: 0.15 });
    audio.hiss({ t, dur: 0.03, gain: 0.025 * g, freq: 2200 * up, q: 1.2 });
    // Round 3: wet metal steps (recorded) in the wrecks; hard-floor steps on the base's decks.
    if (surface === 'deck' || !this.sam('wetstep', { t, gain: 0.05 * g, rate: 0.9 * up, send: 0.2 }))
      this.sam('step', { t, gain: (surface === 'deck' ? 0.045 : 0.035) * g, rate: (surface === 'deck' ? 0.9 : 0.75) * up, send: 0.2 });
    if (surface === 'deck') {
      // A grating rings a little.
      if (v % 2 === 0) audio.metal({ t: t + 0.004, freq: 420 * up, gain: 0.012 * g, decay: 0.18 });
    } else {
      // Wet, loose: a splash underfoot and the odd rattle of a plate.
      audio.hiss({ t: t + 0.01, dur: 0.12, gain: 0.025 * g, type: 'lowpass', freq: 1800 * up, to: 600 });
      if (v === 1) audio.metal({ t: t + 0.03, freq: 260 * up, gain: 0.02 * g, decay: 0.3 });
    }
  }

  /** Phase 23: a companion creature answers the Choir in its own voice (louder, centred). */
  companionCall(species: string, young: boolean): void {
    this.creatureCall(species, young, 2.2, 0);
  }

  /**
   * Round 3: a soft call from a creature out in the world, placed by distance and pan.
   * Synthesised and quiet (ambience level, under every interaction); young ones are
   * higher and lighter. Each species has its own little voice, varied each time.
   */
  private creatureCall(species: string, young: boolean, g: number, pan: number): void {
    const t = audio.now;
    const up = (young ? semi(5) : 1) * jit(0.04);
    const a = g * (young ? 0.7 : 1);
    switch (species) {
      case 'puffcap': // Two soft, rounded boops, like blowing a bubble.
        for (let i = 0; i < 2; i++) audio.tone({ t: t + i * 0.16 * jit(0.1), freq: 520 * up, to: 760 * up, dur: 0.09, gain: 0.03 * a, type: 'sine', pan, send: 0.5 });
        break;
      case 'ray': // A low, gliding hum as its wings beat.
        audio.tone({ t, freq: 190 * up, to: 150 * up, dur: 0.7, attack: 0.2, gain: 0.03 * a, type: 'triangle', lp: 700, pan, send: 0.6 });
        audio.tone({ t: t + 0.05, freq: 380 * up, to: 300 * up, dur: 0.55, attack: 0.2, gain: 0.01 * a, type: 'sine', pan, send: 0.6 });
        break;
      case 'crab': // Dry claw clicks.
        for (let i = 0; i < 3 + rr('call:crab', 3); i++) audio.hiss({ t: t + i * 0.06 * jit(0.25), dur: 0.01, gain: 0.05 * a, freq: 3200 * up * jit(0.1), q: 5, pan, send: 0.3 });
        break;
      case 'shrimp': // A snap and a tiny chirp.
        audio.hiss({ t, dur: 0.008, gain: 0.07 * a, type: 'highpass', freq: 3000 * up, pan, send: 0.3 });
        audio.tone({ t: t + 0.05, freq: 2400 * up, to: 3100 * up, dur: 0.05, gain: 0.012 * a, type: 'sine', pan, send: 0.4 });
        break;
      case 'snail': // A slow, wet glug.
        audio.tone({ t, freq: 260 * up, to: 180 * up, dur: 0.22, gain: 0.025 * a, type: 'sine', lp: 900, pan, send: 0.5 });
        audio.bubbles({ t: t + 0.12, n: 2, spread: 0.2, gain: 0.015 * a, low: 300, high: 700, pan });
        break;
      case 'eel': // Phase 22: a soft, throaty purr and a slow bubble, like a kettle far off.
        audio.tone({ t, freq: 140 * up, to: 120 * up, dur: 0.35, gain: 0.02 * a, type: 'triangle', lp: 600, pan, send: 0.5 });
        audio.bubbles({ t: t + 0.18, n: 1, spread: 0.1, gain: 0.012 * a, low: 250, high: 500, pan });
        break;
      case 'horse': // Phase 22: the chime seahorse hums a tiny three-note chime, falling, like a bell far off.
        for (const [i, f] of [1318, 1175, 988].entries()) audio.bell({ t: t + i * 0.14, freq: f * up, gain: 0.011 * a, decay: 0.9, ratio: 3, index: 0.2, pan, send: 0.8 });
        break;
      default: // Glowfin and anything else: a soft, rising two-note chirp.
        audio.bell({ t, freq: 880 * up, gain: 0.015 * a, decay: 0.5, ratio: 2, index: 0.3, pan, send: 0.6 });
        audio.bell({ t: t + 0.12, freq: 1175 * up, gain: 0.012 * a, decay: 0.6, ratio: 2, index: 0.3, pan, send: 0.6 });
    }
  }

  /**
   * Phase 18: Linnea speaks. A soft little chirp per syllable: a rounded sine
   * that rises like a question, a gentle bell overtone, and the odd tiny bubble
   * from her gills. Synthesised, on the sfx bus (so the underwater muffle,
   * sliders and phone mix apply), a little lower and quicker each line so it
   * never sounds the same twice. `times` are the syllable offsets in seconds.
   */
  linneaChirp(times: readonly number[], pan = 0): void {
    if (!audio.running) return;
    const t0 = audio.now;
    const key = 1 + rr('linnea', 3) * 0.06;
    times.forEach((dt, i) => {
      const t = t0 + dt;
      const up = key * jit(0.05) * (i === times.length - 1 ? 1.12 : 1);
      const f = 760 * up * (1 + (i % 3) * 0.08);
      audio.tone({ t, freq: f, to: f * 1.45, dur: 0.1, attack: 0.015, gain: 0.032, type: 'sine', pan, send: 0.45 });
      audio.tone({ t: t + 0.01, freq: f * 2, to: f * 2.6, dur: 0.06, attack: 0.01, gain: 0.006, type: 'sine', pan, send: 0.5 });
      if (i === 0 || i === times.length - 1) audio.bell({ t: t + 0.04, freq: f * 1.5, gain: 0.008, decay: 0.45, ratio: 2, index: 0.2, pan, send: 0.6 });
      if (i % 3 === 1) audio.bubbles({ t: t + 0.05, n: 1, spread: 0.05, gain: 0.012, low: 700, high: 1300, pan });
    });
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

  /**
   * Phase 15: letting a creature out of the jar. Phase 16 polish: the lid
   * unscrews (two small clicks) and pops with a low "thoop" of water, a gush of
   * bubbles swirls away (panned across, as it swims off), then a soft falling
   * goodbye. Varied a little each time.
   */
  release(): void {
    if (!audio.running) return;
    const t = audio.now;
    const up = jit(0.04);
    const dir = Math.random() < 0.5 ? -1 : 1;
    audio.tone({ t, freq: 1900 * up, dur: 0.02, gain: 0.025, type: 'triangle' });
    audio.tone({ t: t + 0.07, freq: 1700 * up, dur: 0.025, gain: 0.03, type: 'triangle' });
    audio.tone({ t: t + 0.14, freq: 420 * up, to: 160, dur: 0.09, gain: 0.07, type: 'sine', lp: 1400 });
    audio.hiss({ t: t + 0.15, dur: 0.4, gain: 0.05, type: 'lowpass', freq: 1400, to: 500 });
    for (let i = 0; i < 3; i++) audio.bubbles({ t: t + 0.16 + i * 0.15, n: 5, spread: 0.25, gain: 0.032 - i * 0.006, low: 400, high: 1500, pan: dir * (i * 0.3) });
    // Round 3: a recorded gush of bubbles under the synthesised ones, off to the side it swims.
    this.sam('bubble', { t: t + 0.15, gain: 0.04, rate: 1.05, pan: dir * 0.35 });
    audio.bell({ t: t + 0.24, freq: 880 * up, gain: 0.028, decay: 0.9, ratio: 2, index: 0.3, send: 0.5 });
    audio.bell({ t: t + 0.42, freq: 659 * up, gain: 0.024, decay: 1.2, ratio: 2, index: 0.3, send: 0.6, pan: dir * 0.3 });
  }

  /**
   * Phase 15c: a new action on the control bar: a very soft sonar ping on the music's root and fifth.
   * Not played (Colin, after Phase 16 round 3: too frequent, annoying); kept in case it returns as a rarer cue.
   */
  offerPing(): void {
    if (!audio.running) return;
    const t = audio.now;
    const r = zoneRoot(this.musicZone) + 36;
    const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
    audio.bell({ t, freq: hz(r), gain: 0.014, decay: 1.1, ratio: 1, index: 0.2, bus: 'ui', send: 0.7 });
    audio.bell({ t: t + 0.09, freq: hz(r + 7), gain: 0.01, decay: 1.3, ratio: 1, index: 0.2, bus: 'ui', send: 0.8 });
  }

  /** The identify pulse (a tap of Scan): a soft sonar ping (Phase 16: never quite the same twice). */
  ping(): void {
    if (!audio.running) return;
    audio.bell({ freq: 1320 * jit(0.01), gain: 0.04 * jit(0.1), decay: 1.4, ratio: 1, index: 0.25, send: 0.8 });
  }

  /** Milestone 8 part 2: the sonar pulse: a deep, ringing ping that rolls away. */
  sonar(): void {
    if (!audio.running) return;
    const t = audio.now;
    audio.bell({ t, freq: 520, gain: 0.07, decay: 2.4, ratio: 1, index: 0.2, send: 0.9 });
    audio.tone({ t, freq: 900, to: 260, dur: 0.5, gain: 0.05, send: 0.8 });
    audio.bell({ t: t + 0.7, freq: 520, gain: 0.025, decay: 2, ratio: 1, index: 0.2, send: 0.9 });
  }

  // ---- After milestone 12: the new gear's cues ----
  /** The flare launcher: a pop, then the fizz of the flare catching. */
  flare(): void {
    if (!audio.running) return;
    const t = audio.now;
    audio.thump({ t, freq: 180, gain: 0.12, dur: 0.12, send: 0.3 });
    audio.hiss({ t: t + 0.05, dur: 0.9, gain: 0.06, freq: 2400, to: 1400, q: 0.8, send: 0.4 });
    audio.bubbles({ t, n: 6, spread: 0.3, gain: 0.03 });
  }
  /** The stun dart: a sharp release and a crackle where it strikes. */
  dart(hit: boolean): void {
    if (!audio.running) return;
    const t = audio.now;
    audio.thump({ t, freq: 260, gain: 0.1, dur: 0.08 });
    audio.hiss({ t, dur: 0.15, gain: 0.08, freq: 3000, to: 1200, q: 1.5 });
    if (hit) for (let i = 0; i < 6; i++) audio.hiss({ t: t + 0.18 + i * 0.03, dur: 0.02, gain: 0.07, freq: 4000 + Math.random() * 2000, q: 4 });
  }
  /**
   * Phase 17b: one heavy step in clamped mag-boots. A deep, clanking stomp:
   * a low body thump, a recorded metal impact and footstep slowed right down,
   * and a soft hiss of silt kicked up. All on the sfx bus, so the underwater
   * muffle, the sliders and the phone mix apply. `weight` 0..1.
   */
  magStep(weight = 1): void {
    if (!audio.running) return;
    const t = audio.now;
    const v = rr('magstep', 4);
    const up = [1, semi(-1), semi(1.5), semi(-2)][v] * jit(0.03);
    const g = (0.7 + 0.3 * weight) * jit(0.12);
    audio.thump({ t, freq: 62 * up, gain: 0.11 * g, dur: 0.22, send: 0.3 });
    audio.thump({ t: t + 0.01, freq: 140 * up, gain: 0.035 * g, dur: 0.08, send: 0.2 });
    if (!this.sam('metal', { t, gain: 0.05 * g, rate: 0.5 * up, send: 0.35 })) audio.metal({ t, freq: 170 * up, gain: 0.035 * g, decay: 0.35, send: 0.35 });
    this.sam('step', { t: t + 0.005, gain: 0.05 * g, rate: 0.55 * up, send: 0.25 });
    audio.hiss({ t: t + 0.02, dur: 0.25, attack: 0.02, gain: 0.03 * g, type: 'lowpass', freq: 900 * up, to: 300, brown: true });
    if (v === 2) this.sam('sand', { t: t + 0.05, gain: 0.02 * g, rate: 0.7, send: 0.2 });
  }
  /** Phase 17b: the boots landing after a hop or a slow sink off a ledge. `k` 0..1: how hard. */
  magLand(k: number): void {
    if (!audio.running) return;
    const t = audio.now;
    const g = 0.45 + 0.55 * k;
    audio.thump({ t, freq: 48, gain: 0.16 * g, dur: 0.4, send: 0.45 });
    audio.thump({ t: t + 0.015, freq: 110, gain: 0.05 * g, dur: 0.12, send: 0.3 });
    if (!this.sam('metal', { t, gain: 0.07 * g, rate: 0.42, send: 0.45 })) audio.metal({ t, freq: 120, gain: 0.05 * g, decay: 0.6, send: 0.45 });
    audio.hiss({ t: t + 0.02, dur: 0.5, attack: 0.03, gain: 0.05 * g, type: 'lowpass', freq: 800, to: 220, brown: true });
    if (k > 0.4) this.sam('sand', { t: t + 0.08, gain: 0.03 * g, rate: 0.6, send: 0.25 });
  }
  /** Phase 17b: the boots' magnets clamping on (a clunk and a rising hum) or letting go (a release and a falling hum). */
  magClamp(on: boolean): void {
    if (!audio.running) return;
    const t = audio.now;
    if (on) {
      audio.tone({ t, freq: 90, to: 140, dur: 0.25, attack: 0.03, gain: 0.04, type: 'triangle', lp: 600, send: 0.2 });
      audio.metal({ t: t + 0.05, freq: 210, gain: 0.04, decay: 0.3, send: 0.3 });
      audio.thump({ t: t + 0.05, freq: 90, gain: 0.07, dur: 0.12 });
    } else {
      audio.tone({ t, freq: 140, to: 80, dur: 0.22, attack: 0.02, gain: 0.035, type: 'triangle', lp: 600, send: 0.2 });
      audio.metal({ t, freq: 320, gain: 0.025, decay: 0.15, send: 0.2 });
      audio.bubbles({ t: t + 0.04, n: 5, spread: 0.3, gain: 0.025 });
    }
  }
  /** The TH-3 dash: a hard burst of the thruster. */
  dash(): void {
    if (!audio.running) return;
    const t = audio.now;
    audio.hiss({ t, dur: 0.45, gain: 0.14, freq: 500, to: 1600, q: 0.7, brown: true });
    audio.bubbles({ t, n: 14, spread: 0.5, gain: 0.05, low: 300, high: 1200 });
  }
  /**
   * The tractor beam drawing a material in. Phase 16: anticipation (a rising,
   * shimmering hum while it travels the beam), then the catch: a soft magnetic
   * clack as it lands in the hopper.
   */
  tractor(): void {
    if (!audio.running) return;
    const t = audio.now;
    const up = jit(0.04);
    audio.tone({ t, freq: 220 * up, to: 660 * up, dur: 0.55, attack: 0.05, gain: 0.04, type: 'triangle', send: 0.5 });
    audio.tone({ t, freq: 331 * up, to: 990 * up, dur: 0.5, attack: 0.08, gain: 0.015, type: 'sine', send: 0.6 });
    audio.hiss({ t, dur: 0.5, attack: 0.3, gain: 0.02, freq: 2000, to: 5000, q: 2, send: 0.4 });
    audio.metal({ t: t + 0.55, freq: 480 * up, gain: 0.04, decay: 0.3 });
    audio.thump({ t: t + 0.55, freq: 190, gain: 0.06, dur: 0.1 });
  }

  /** Milestone 8: a lurker warns (a dry clicking rattle from its den). */
  lurkWarn(dx: number): void {
    if (!audio.running) return;
    const t = audio.now;
    const pan = Math.max(-0.8, Math.min(0.8, dx / 500));
    // Phase 16: danger comes first in the mix. The rattle plays unmuffled (deep water used to dull it
    // to almost nothing), still panned towards the den, and the soundtrack dips under it.
    for (let i = 0; i < 7; i++) audio.hiss({ t: t + i * 0.07 + Math.random() * 0.02, dur: 0.014, gain: 0.11, freq: 1400 + Math.random() * 500, q: 6, bus: 'ui', pan, send: 0.2 });
    audio.tone({ t, freq: 70, to: 55, dur: 0.6, gain: 0.11, type: 'sawtooth', lp: 260, bus: 'ui', pan, send: 0.3 });
    audio.tone({ t, freq: 210, to: 165, dur: 0.5, gain: 0.045, type: 'sawtooth', lp: 700, bus: 'ui', pan, send: 0.2 });
    audio.duckForSting(1.2);
  }

  /** Milestone 8: a lurker's bite: a snap, a crunch on the suit and a hiss of escaping air. */
  bite(): void {
    if (!audio.running) return;
    const t = audio.now;
    audio.thump({ t, freq: 110, gain: 0.3, dur: 0.25, bus: 'ui', send: 0.2 });
    audio.hiss({ t, dur: 0.06, gain: 0.25, freq: 2600, q: 1.2, bus: 'ui' });
    audio.metal({ t: t + 0.03, freq: 340, gain: 0.08, decay: 0.4, bus: 'ui' });
    audio.hiss({ t: t + 0.1, dur: 1.2, attack: 0.02, gain: 0.08, freq: 3200, to: 1800, q: 1, bus: 'ui', send: 0.1 });
    audio.bubbles({ t: t + 0.05, n: 20, spread: 0.9, gain: 0.05, low: 300, high: 1300, bus: 'ui' });
    audio.duckForSting(1.5);
  }

  /** Milestone 8: the grapple hook firing and biting into an anchor ring. */
  clip(): void {
    if (!audio.running) return;
    // Phase 16: the line zips out, then the hook bites (varied, so repeated swings don't stutter).
    const up = [1, semi(1), semi(-1), semi(2)][rr('clip', 4)] * jit(0.02);
    audio.hiss({ dur: 0.08, gain: 0.03, freq: 2400 * up, to: 4200 * up, q: 2 });
    audio.metal({ t: audio.now + 0.06, freq: 900 * up, gain: 0.05 * jit(0.1), decay: 0.2 });
    audio.metal({ t: audio.now + 0.14, freq: 700 * up, gain: 0.05 * jit(0.1), decay: 0.3 });
  }

  /** A hard knock against rock in the sub. */
  dent(strength: number): void {
    if (!audio.running) return;
    const g = Math.min(1, 0.4 + strength * 6) * jit(0.08);
    audio.thump({ freq: 70 * jit(0.08), gain: 0.3 * g, dur: 0.5, send: 0.3 });
    audio.metal({ freq: 120 + Math.random() * 40, gain: 0.12 * g, decay: 1.2, send: 0.4 });
    // Phase 16: grit scraping along the hull.
    this.gravel(audio.now + 0.02, 5, 0.04 * g, 0.7, 0);
    audio.bubbles({ n: 6, spread: 0.4, gain: 0.03 });
  }

  /** Milestone 10: crush depth. A deep metal groan from the suit or hull, faster and louder the worse it gets. */
  creak(severity: number): void {
    if (!audio.running) return;
    const k = Math.min(1, severity);
    audio.metal({ freq: 55 + Math.random() * 30, gain: 0.08 + 0.12 * k, decay: 1.6, send: 0.5 });
    audio.thump({ freq: 40, gain: 0.12 + 0.15 * k, dur: 0.6, send: 0.4 });
    // Round 3: a recorded metal creak (heard on a phone speaker, unlike the deep body), and when it's
    // bad, a long groan of the hull under pressure.
    this.sam('creak', { gain: 0.05 + 0.05 * k, rate: 0.75 - 0.15 * k, send: 0.4 });
    if (k > 0.5) this.sam('groan', { t: audio.now + 0.1, gain: 0.04 * k, rate: 0.6, send: 0.5 });
    if (k > 0.5) audio.tone({ freq: 880, dur: 0.12, gain: 0.03, type: 'triangle', lp: 2400, bus: 'ui' });
  }

  /** Hull breached: a two-tone alarm and a rush of water. */
  breach(): void {
    if (!audio.running) return;
    const t = audio.now;
    for (let i = 0; i < 6; i++) audio.tone({ t: t + i * 0.32, freq: i % 2 ? 494 : 659, dur: 0.26, gain: 0.09, type: 'triangle', lp: 2000, bus: 'ui', send: 0.2 });
    audio.duckForSting(2.2);
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

  /** After milestone 8 part 2: on foot. The hatch (in or out), boots on steel, steam and the bilge. */
  hatchCue(entering: boolean): void {
    if (!audio.running) return;
    this.hatch(!entering);
    audio.metal({ t: audio.now + 0.3, freq: 260, gain: 0.05, decay: 0.5, bus: 'ui' });
  }
  step(jump: boolean, hard = false): void {
    if (!audio.running) return;
    // Phase 16: on the effects bus (so the indoor room echo applies) and varied each time.
    const up = [1, semi(1), semi(-1), semi(1.8)][rr('land', 4)] * jit(0.03);
    if (jump) audio.hiss({ dur: 0.08, gain: 0.03 * jit(0.15), type: 'lowpass', freq: 900 * up, send: 0.1 });
    else {
      audio.thump({ freq: (hard ? 90 : 130) * up, gain: (hard ? 0.22 : 0.12) * jit(0.1), dur: 0.16, send: 0.2 });
      audio.metal({ freq: 210 * up, gain: hard ? 0.06 : 0.03, decay: 0.3 });
    }
  }
  hurt(why: 'steam' | 'bilge'): void {
    if (!audio.running) return;
    if (why === 'steam') audio.hiss({ dur: 0.9, attack: 0.02, gain: 0.18, freq: 3400, to: 1600, q: 0.6, bus: 'ui', send: 0.3 });
    else {
      audio.hiss({ dur: 0.6, gain: 0.16, type: 'lowpass', freq: 1400, to: 300, bus: 'ui', send: 0.3 });
      audio.bubbles({ n: 16, spread: 0.6, gain: 0.05, low: 250, high: 1000, bus: 'ui' });
    }
  }

  /**
   * Phase 19: the fight in the wreck. Every machine's attack is heard before
   * it lands: each tell starts with the attack's wind-up and is placed toward
   * the machine (`dx`, units from Kestrel). Tells and hits go on the ui bus
   * (danger comes first: never muffled) and dip the soundtrack, as the
   * lurker's warning does (Phase 16). Kestrel's own rivets stay on sfx, so
   * the room's echo carries them.
   */
  foe(cue: string, dx = 0): void {
    if (!audio.running) return;
    const t = audio.now;
    const pan = Math.max(-0.85, Math.min(0.85, dx / 520));
    const far = Math.max(0.45, 1 - Math.abs(dx) / 1400);
    const up = jit(0.03);
    switch (cue) {
      // ---- Rust tick: a rattle climbing in pitch through the crouch, then a scraping lunge ----
      case 'tickTell': {
        for (let i = 0; i < 9; i++) {
          const k = i / 8;
          audio.hiss({ t: t + k * 0.5, dur: 0.016, gain: (0.06 + 0.06 * k) * far, freq: (1500 + 1600 * k) * up, q: 7, bus: 'ui', pan, send: 0.2 });
        }
        audio.tone({ t, freq: 90 * up, to: 170 * up, dur: 0.1, attack: 0.5, gain: 0.07 * far, type: 'sawtooth', lp: 700, bus: 'ui', pan, send: 0.2 });
        audio.duckForSting(0.9);
        break;
      }
      case 'tickLunge':
        audio.hiss({ t, dur: 0.3, gain: 0.08 * far, freq: 2600 * up, to: 900, q: 1.4, bus: 'ui', pan, send: 0.2 });
        audio.metal({ t, freq: 620 * up, gain: 0.03 * far, decay: 0.15, bus: 'ui', pan });
        break;
      case 'tickLand':
        for (let i = 0; i < 3; i++) audio.metal({ t: t + i * 0.04, freq: (380 + Math.random() * 260) * up, gain: 0.025 * far, decay: 0.12, pan });
        break;
      // ---- Weld drone: a whine that rises with the torch, two lock beeps, the zap ----
      case 'droneAim':
        audio.tone({ t, freq: 520 * up, to: 1650 * up, dur: 0.12, attack: 1.05, gain: 0.05 * far, type: 'sawtooth', lp: 2600, bus: 'ui', pan, send: 0.2 });
        audio.tone({ t, freq: 1040 * up, to: 3300 * up, dur: 0.1, attack: 1.05, gain: 0.015 * far, type: 'sine', bus: 'ui', pan });
        for (const k of [0.75, 0.95]) audio.tone({ t: t + k, freq: 2200, dur: 0.05, attack: 0.004, gain: 0.07 * far, type: 'square', lp: 4000, bus: 'ui', pan });
        audio.duckForSting(1.4);
        break;
      case 'droneFire':
        audio.hiss({ t, dur: 0.18, gain: 0.14 * far, freq: 3800, to: 900, q: 1.2, bus: 'ui', pan, send: 0.3 });
        audio.tone({ t, freq: 900, to: 140, dur: 0.22, gain: 0.08 * far, type: 'sawtooth', lp: 2200, bus: 'ui', pan, send: 0.3 });
        break;
      case 'droneCool':
        audio.hiss({ t: t + 0.05, dur: 0.9, attack: 0.05, gain: 0.04 * far, freq: 1800, to: 900, q: 0.8, pan, send: 0.3 });
        break;
      // ---- Hull keeper: hydraulics heave the hammer up, or steam roars as it rears to charge ----
      case 'wake':
        audio.tone({ t, freq: 38, to: 72, dur: 0.4, attack: 1.2, gain: 0.14, type: 'sawtooth', lp: 260, bus: 'ui', pan, send: 0.4 });
        audio.metal({ t: t + 0.9, freq: 110, gain: 0.09, decay: 1, bus: 'ui', pan, send: 0.4 });
        audio.metal({ t: t + 1.3, freq: 96, gain: 0.09, decay: 1.2, bus: 'ui', pan, send: 0.4 });
        audio.duckForSting(2.2);
        break;
      case 'keeperWindSlam':
        audio.hiss({ t, dur: 0.15, attack: 0.85, gain: 0.1 * far, freq: 700, to: 2600, q: 1.1, bus: 'ui', pan, send: 0.3 });
        for (let i = 0; i < 5; i++) audio.metal({ t: t + i * 0.17, freq: (160 + i * 30) * up, gain: 0.05 * far, decay: 0.18, bus: 'ui', pan });
        audio.tone({ t, freq: 55, to: 82, dur: 0.15, attack: 0.85, gain: 0.1 * far, type: 'sawtooth', lp: 300, bus: 'ui', pan, send: 0.3 });
        audio.duckForSting(1.6);
        break;
      case 'keeperSlam':
        audio.thump({ t, freq: 42, gain: 0.32, dur: 0.7, bus: 'ui', pan, send: 0.5 });
        audio.metal({ t, freq: 88, gain: 0.14, decay: 1.4, bus: 'ui', pan, send: 0.5 });
        if (!this.sam('metal', { t, gain: 0.12, rate: 0.4, send: 0.5 })) audio.metal({ t, freq: 140, gain: 0.08, decay: 0.8 });
        audio.hiss({ t: t + 0.02, dur: 1.2, attack: 0.03, gain: 0.08, type: 'lowpass', freq: 900, to: 160, brown: true, bus: 'ui', pan, send: 0.4 });
        break;
      case 'keeperWindCharge':
        audio.hiss({ t, dur: 0.2, attack: 0.75, gain: 0.13 * far, freq: 2400, to: 4200, q: 0.6, bus: 'ui', pan, send: 0.3 });
        audio.tone({ t, freq: 46, to: 120, dur: 0.12, attack: 0.8, gain: 0.12 * far, type: 'sawtooth', lp: 420, bus: 'ui', pan, send: 0.3 });
        audio.duckForSting(1.6);
        break;
      case 'keeperCharge':
        for (let i = 0; i < 6; i++) audio.thump({ t: t + i * 0.19, freq: 58 * up, gain: 0.14 * far, dur: 0.2, bus: 'ui', pan, send: 0.3 });
        audio.hiss({ t, dur: 1.1, gain: 0.05 * far, type: 'lowpass', freq: 700, brown: true, bus: 'ui', pan });
        break;
      case 'keeperWall':
        audio.thump({ t, freq: 50, gain: 0.3, dur: 0.6, bus: 'ui', pan, send: 0.5 });
        audio.metal({ t, freq: 120, gain: 0.14, decay: 1.6, bus: 'ui', pan, send: 0.5 });
        break;
      case 'keeperOpen':
        // The opening: steam bleeds off and the core spins up bright (the cue to shoot).
        audio.hiss({ t, dur: 0.6, gain: 0.06, freq: 3000, to: 1200, q: 0.8, pan, send: 0.3 });
        audio.tone({ t: t + 0.05, freq: 330, to: 660, dur: 0.3, attack: 0.08, gain: 0.04, type: 'triangle', pan, send: 0.3 });
        break;
      case 'keeperDown':
        audio.tone({ t, freq: 220, to: 30, dur: 1.8, attack: 0.02, gain: 0.12, type: 'sawtooth', lp: 900, bus: 'ui', pan, send: 0.5 });
        audio.thump({ t: t + 0.5, freq: 40, gain: 0.34, dur: 0.9, bus: 'ui', pan, send: 0.6 });
        for (let i = 0; i < 10; i++) audio.metal({ t: t + 0.55 + i * 0.07 + Math.random() * 0.05, freq: 150 + Math.random() * 600, gain: 0.05, decay: 0.4, bus: 'ui', pan, send: 0.4 });
        audio.hiss({ t: t + 0.5, dur: 2.4, attack: 0.05, gain: 0.07, freq: 1600, to: 500, q: 0.6, pan, send: 0.5 });
        break;
      // ---- Kestrel's rivets and what they hit ----
      case 'shot':
        audio.thump({ t, freq: 150 * up, gain: 0.13, dur: 0.09, send: 0.25 });
        audio.hiss({ t, dur: 0.07, gain: 0.09, freq: 3600 * up, to: 1800, q: 1.3, send: 0.25 });
        audio.metal({ t: t + 0.005, freq: 1250 * up, gain: 0.025, decay: 0.12, send: 0.2 });
        break;
      case 'rivetWall':
        audio.metal({ t, freq: (900 + Math.random() * 500) * up, gain: 0.035 * far, decay: 0.18, pan, send: 0.3 });
        break;
      case 'ping':
        audio.metal({ t, freq: (1700 + Math.random() * 400) * up, gain: 0.05 * far, decay: 0.25, pan, send: 0.3 });
        audio.metal({ t: t + 0.01, freq: 2600 * up, gain: 0.02 * far, decay: 0.15, pan });
        break;
      case 'hit':
        audio.thump({ t, freq: 120 * up, gain: 0.12 * far, dur: 0.12, pan, send: 0.2 });
        audio.metal({ t, freq: 420 * up, gain: 0.07 * far, decay: 0.3, pan, send: 0.3 });
        audio.hiss({ t, dur: 0.12, gain: 0.06 * far, freq: 2400, q: 1.5, pan });
        break;
      case 'down':
        audio.thump({ t, freq: 90, gain: 0.12 * far, dur: 0.2, pan, send: 0.3 });
        for (let i = 0; i < 6; i++) audio.metal({ t: t + i * 0.045 + Math.random() * 0.03, freq: 250 + Math.random() * 700, gain: 0.04 * far, decay: 0.25, pan, send: 0.3 });
        audio.hiss({ t, dur: 0.5, gain: 0.05 * far, freq: 2800, to: 900, q: 1, pan, send: 0.3 });
        break;
      case 'block':
        audio.metal({ t, freq: 520 * up, gain: 0.1, decay: 0.45, bus: 'ui', send: 0.3 });
        audio.thump({ t, freq: 110, gain: 0.1, dur: 0.12, bus: 'ui' });
        break;
      case 'perfect':
        // A bright ring off the guard plate: the good timing is heard.
        audio.metal({ t, freq: 780, gain: 0.12, decay: 0.8, bus: 'ui', send: 0.4 });
        audio.tone({ t, freq: 1320, to: 1980, dur: 0.35, attack: 0.005, gain: 0.05, type: 'triangle', bus: 'ui', send: 0.4 });
        audio.thump({ t, freq: 140, gain: 0.1, dur: 0.1, bus: 'ui' });
        break;
    }
  }
  /** Phase 19: Kestrel takes a hit in a fight: a crunch on the suit and a short hiss (softer than a bite). */
  suitHit(): void {
    if (!audio.running) return;
    const t = audio.now;
    audio.thump({ t, freq: 100, gain: 0.24, dur: 0.2, bus: 'ui', send: 0.2 });
    audio.metal({ t: t + 0.02, freq: 300, gain: 0.07, decay: 0.35, bus: 'ui' });
    audio.hiss({ t: t + 0.05, dur: 0.5, attack: 0.02, gain: 0.06, freq: 3000, to: 1700, q: 1, bus: 'ui', send: 0.1 });
    audio.duckForSting(0.8);
  }
  /** Phase 19: a safe lamp lights as Kestrel passes: a warm click and a soft rising hum. */
  safeLamp(): void {
    if (!audio.running) return;
    const t = audio.now;
    audio.metal({ t, freq: 880, gain: 0.03, decay: 0.2, bus: 'ui' });
    audio.tone({ t: t + 0.03, freq: 220, to: 330, dur: 0.6, attack: 0.15, gain: 0.03, type: 'triangle', bus: 'ui', send: 0.3 });
  }

  clamps(docked: boolean): void {
    // Phase 16: the docking shape. A servo whine as the arms swing in (anticipation), the clamps
    // biting one after the other (contact), then the seal: a hiss of the water purging (payoff).
    const t = audio.now;
    const up = jit(0.03);
    audio.tone({ t, freq: 380 * up, to: 620 * up, dur: 0.22, attack: 0.04, gain: 0.02, type: 'sawtooth', lp: 1400 });
    audio.thump({ t: t + 0.2, freq: 80 * up, gain: 0.11, dur: 0.35 });
    audio.metal({ t: t + 0.2, freq: 150 * up, gain: 0.06, decay: 0.8 });
    if (docked) audio.metal({ t: t + 0.46, freq: 165 * up, gain: 0.055, decay: 0.8 });
    audio.hiss({ t: t + 0.5, dur: 0.8, gain: 0.05, freq: 1600, to: 600, q: 0.8 });
    if (docked && !this.sam('bubble', { t: t + 0.55, gain: 0.02, rate: 0.75 })) audio.bubbles({ t: t + 0.55, n: 10, spread: 0.6, gain: 0.03, low: 300, high: 900 });
  }

  private splash(strength: number, up: boolean): void {
    // Unmuffled when the head comes out; muffled bubbles when diving back in.
    const bus: BusName = up ? 'ui' : 'sfx';
    audio.hiss({ dur: 0.35 + 0.4 * strength, gain: 0.08 + 0.12 * strength, type: 'lowpass', freq: up ? 3500 : 1200, to: 400, bus, send: 0.15 });
    audio.hiss({ dur: 0.15, gain: 0.05 * strength, type: 'highpass', freq: 3000, bus, send: 0.1 });
    if (!up) {
      // Round 3: a recorded dip under the surface and a recorded burst of bubbles, over the synthesised wash.
      this.sam('dive', { gain: 0.04 + 0.05 * strength, rate: 0.85, send: 0.15 });
      if (!this.sam('bubble', { t: audio.now + 0.12, gain: 0.04, rate: 0.85 })) audio.bubbles({ n: 14, spread: 0.7, gain: 0.04, low: 300, high: 1200 });
    }
  }

  private heartbeat(): void {
    const t = audio.now;
    for (let i = 0; i < 3; i++) {
      audio.thump({ t: t + i * 0.9, freq: 55, gain: 0.25, dur: 0.18, bus: 'ui', send: 0.1 });
      audio.thump({ t: t + i * 0.9 + 0.22, freq: 50, gain: 0.18, dur: 0.18, bus: 'ui', send: 0.1 });
    }
  }
}
