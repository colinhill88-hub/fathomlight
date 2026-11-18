/*
 * Milestone 7b: the audio engine. Every sound in Fathomlight is made by code
 * with the Web Audio API (no sound files), like the art.
 *
 * The signal path:
 *
 *   effects voices  ─┐                      ┌─> water filter ─┐
 *   ambience voices ─┼─> bus volume (dry) ──┘                 ├─> master ─> blackout/hide ─> limiter ─> speakers
 *   music voices    ─┘─> bus volume (wet) ─> shared reverb ───┘
 *                         (music also passes a duck gain, lowered while panels are open)
 *
 * The water filter is a low-pass that muffles effects and ambience while the
 * diver is underwater (more with depth); music is never muffled.
 *
 * iPhone and iPad: audio can only start inside a tap or key press, so the
 * engine is created on the first one (and resumed on later ones if iOS
 * interrupted it, after a phone call for example). The silent switch mutes
 * Web Audio unless "Play with the silent switch on" is chosen in Settings.
 */

export interface AudioSettings {
  master: number;
  music: number;
  ambience: number;
  effects: number;
  muted: boolean;
  /** iPhone: keep playing when the ring/silent switch is on silent. */
  ignoreSilent: boolean;
  /**
   * Milestone 12: the speaker mix. 'phone' cuts the deep rumble a phone speaker
   * can't play (so it doesn't eat the headroom) and lifts the mids a little;
   * 'full' is for headphones and desktop speakers. Defaults to 'phone' on touch devices.
   */
  speaker: 'phone' | 'full';
}

const TOUCH = typeof window !== 'undefined' && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
export const AUDIO_DEFAULTS: AudioSettings = { master: 0.8, music: 0.6, ambience: 0.7, effects: 0.8, muted: false, ignoreSilent: false, speaker: TOUCH ? 'phone' : 'full' };
const KEY = 'fathomlight.audio';

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<AudioSettings>;
      const s = { ...AUDIO_DEFAULTS };
      for (const k of ['master', 'music', 'ambience', 'effects'] as const) {
        if (typeof v[k] === 'number' && isFinite(v[k]!)) s[k] = Math.max(0, Math.min(1, v[k]!));
      }
      s.muted = !!v.muted;
      s.ignoreSilent = !!v.ignoreSilent;
      if (v.speaker === 'phone' || v.speaker === 'full') s.speaker = v.speaker;
      return s;
    }
  } catch {
    /* storage blocked or bad data: defaults */
  }
  return { ...AUDIO_DEFAULTS };
}

function saveAudioSettings(s: AudioSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: settings last this visit only */
  }
}

/** 'ui' is effects volume, but never muffled by the water (panel clicks, notices). */
export type BusName = 'music' | 'ambience' | 'sfx' | 'ui';

interface Bus {
  dry: GainNode;
  wet: GainNode;
}

/** Sliders feel even when the gain follows a curve (half-way sounds half as loud). */
const curve = (v: number) => v * v;

type AudioSessionNav = Navigator & { audioSession?: { type: string } };

export class AudioEngine {
  ctx: AudioContext | null = null;
  settings: AudioSettings = loadAudioSettings();
  buses!: Record<BusName, Bus>;
  private master!: GainNode;
  /** Fades everything for blackouts and while the app is hidden. */
  private fader!: GainNode;
  private duck!: GainNode;
  /** The underwater muffle on effects and ambience. */
  private water!: BiquadFilterNode;
  /** How much effects and ambience ring in the reverb (cave echo). */
  private space!: GainNode;
  private reverb!: ConvolverNode;
  noise!: AudioBuffer;
  brown!: AudioBuffer;
  /** Runs once the context exists (the ambience and music build their graphs). */
  private readyFns: (() => void)[] = [];
  /** Every builder, kept so a fresh context can be rebuilt after iOS breaks the old one. */
  private builders: (() => void)[] = [];
  /** Counts up each time the context is replaced; voices with stored audio times reset on a change. */
  epoch = 0;
  /** A gesture asked the context to resume; if it still is not running at the next gesture, replace it. */
  private resumeAsked = false;
  private hidden = false;
  private blackout = 0;
  private meter: AnalyserNode | null = null;
  /** Milestone 12: the final mix chain's speaker filters, and the pause duck. */
  private lowCut!: BiquadFilterNode;
  private presence!: BiquadFilterNode;
  private musicShelf!: BiquadFilterNode;
  private paused = false;

  /** Loudness of the output right now (RMS, 0..1), for automated checks. */
  level(): number {
    if (!this.meter) return 0;
    const d = new Float32Array(this.meter.fftSize);
    this.meter.getFloatTimeDomainData(d);
    let sum = 0;
    for (const v of d) sum += v * v;
    return Math.sqrt(sum / d.length);
  }

  /** Time now on the audio clock (seconds). */
  get now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  get running(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  onReady(fn: () => void): void {
    this.builders.push(fn);
    if (this.ctx) fn();
    else this.readyFns.push(fn);
  }

  /** Install listeners that start (and restart) audio on a user gesture. */
  attachUnlock(): void {
    const kick = () => this.unlock();
    for (const ev of ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'])
      window.addEventListener(ev, kick, { capture: true, passive: true });
    // After milestone 10 (Colin lost the sound on his iPhone): a home-screen app on iOS does not always
    // fire visibilitychange when it comes back, so 'pageshow' and 'focus' count as coming back too, and a
    // tap re-reads document.hidden instead of trusting a stale flag (which kept the game muted for good).
    const seen = () => {
      this.hidden = document.hidden;
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend().catch(() => {});
      else void this.ctx.resume().catch(() => {});
      this.applyFader(0.05);
    };
    document.addEventListener('visibilitychange', seen);
    window.addEventListener('pageshow', seen);
    window.addEventListener('focus', seen);
  }

  /** Create or resume the context. Must run inside a gesture on iOS. */
  unlock(): void {
    const wasHidden = this.hidden;
    this.hidden = document.hidden;
    if (this.hidden) return;
    if (wasHidden) this.applyFader(0.05);
    this.applySession();
    // iOS can leave a context 'interrupted' or suspended for good (after a call, Siri or another app's
    // audio): resume() then never takes. If a resume asked for at the last tap did not work, start afresh.
    if (this.ctx && this.ctx.state !== 'running' && this.resumeAsked) {
      const old = this.ctx;
      this.ctx = null;
      this.meter = null;
      void old.close().catch(() => {});
      this.readyFns = [...this.builders];
      this.epoch++;
    }
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      try {
        this.ctx = new Ctor({ latencyHint: 'interactive' });
      } catch {
        return;
      }
      this.build();
      // iOS also wants a sound actually started inside the gesture.
      const b = this.ctx.createBuffer(1, 1, 22050);
      const s = this.ctx.createBufferSource();
      s.buffer = b;
      s.connect(this.ctx.destination);
      s.start();
      const fns = this.readyFns;
      this.readyFns = [];
      for (const f of fns) f();
    }
    if (this.ctx.state !== 'running') {
      this.resumeAsked = true;
      void this.ctx
        .resume()
        .then(() => {
          if (this.ctx?.state === 'running') this.resumeAsked = false;
        })
        .catch(() => {});
    } else this.resumeAsked = false;
  }

  private applySession(): void {
    const nav = navigator as AudioSessionNav;
    if (nav.audioSession) {
      try {
        // 'ambient' mixes with other apps and follows the silent switch; 'playback' plays through it.
        nav.audioSession.type = this.settings.ignoreSilent ? 'playback' : 'ambient';
      } catch {
        /* not allowed here */
      }
    }
  }

  /** True when this browser can choose whether the silent switch mutes the game (iPhone Safari). */
  static get hasSilentSwitchChoice(): boolean {
    return !!(navigator as AudioSessionNav).audioSession;
  }

  private build(): void {
    const ctx = this.ctx!;
    // Milestone 12, the final mix chain:
    //   fader -> low cut -> presence -> glue compressor -> limiter -> out.
    // The glue compressor gently binds music, ambience and effects together;
    // the limiter only catches peaks (a pile of cues at once, a bite, a dent).
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.12;
    limiter.connect(ctx.destination);
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -20;
    glue.knee.value = 10;
    glue.ratio.value = 2;
    glue.attack.value = 0.03;
    glue.release.value = 0.35;
    const makeup = ctx.createGain();
    makeup.gain.value = 1.25;
    glue.connect(makeup);
    makeup.connect(limiter);
    this.lowCut = ctx.createBiquadFilter();
    this.lowCut.type = 'highpass';
    this.lowCut.Q.value = 0.7;
    this.presence = ctx.createBiquadFilter();
    this.presence.type = 'peaking';
    this.presence.frequency.value = 2400;
    this.presence.Q.value = 0.8;
    this.lowCut.connect(this.presence);
    this.presence.connect(glue);
    this.fader = ctx.createGain();
    this.fader.connect(this.lowCut);
    this.meter = ctx.createAnalyser();
    this.meter.fftSize = 2048;
    limiter.connect(this.meter);
    this.master = ctx.createGain();
    this.master.connect(this.fader);

    this.water = ctx.createBiquadFilter();
    this.water.type = 'lowpass';
    this.water.frequency.value = 4000;
    this.water.Q.value = 0.5;
    this.water.connect(this.master);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(3.6);
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.9;
    this.reverb.connect(verbOut);
    verbOut.connect(this.master);
    this.space = ctx.createGain();
    this.space.gain.value = 0.3;
    this.space.connect(this.reverb);

    this.duck = ctx.createGain();
    // A gentle shelf under the music's pads so they don't mask the ambient drone.
    this.musicShelf = ctx.createBiquadFilter();
    this.musicShelf.type = 'lowshelf';
    this.musicShelf.frequency.value = 180;
    this.musicShelf.gain.value = -3;
    this.duck.connect(this.musicShelf);
    this.musicShelf.connect(this.master);
    // A soft echo on the music, fed into the reverb, for a spacious sound.
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.72;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const dTone = ctx.createBiquadFilter();
    dTone.type = 'lowpass';
    dTone.frequency.value = 2200;
    delay.connect(dTone);
    dTone.connect(fb);
    fb.connect(delay);
    const dOut = ctx.createGain();
    dOut.gain.value = 0.35;
    dTone.connect(dOut);
    dOut.connect(this.reverb);
    dOut.connect(this.duck);

    const mk = (dryTo: AudioNode, wetTo: AudioNode): Bus => {
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      dry.connect(dryTo);
      wet.connect(wetTo);
      return { dry, wet };
    };
    const musicWet = ctx.createGain();
    musicWet.connect(this.reverb);
    musicWet.connect(delay);
    this.buses = {
      music: mk(this.duck, musicWet),
      ambience: mk(this.water, this.space),
      sfx: mk(this.water, this.space),
      ui: mk(this.master, this.reverb),
    };

    // Noise sources shared by every voice: white and brown (deep, rumbly).
    const len = ctx.sampleRate * 4;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    this.brown = ctx.createBuffer(1, len, ctx.sampleRate);
    const w = this.noise.getChannelData(0);
    const br = this.brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const r = Math.random() * 2 - 1;
      w[i] = r;
      last = (last + 0.02 * r) / 1.02;
      br[i] = last * 3.5;
    }
    this.applyVolumes();
    this.applyFader(0);
  }

  /** A stereo reverb tail made from decaying noise (a big, soft underwater space). */
  private impulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        // Darker as it decays, like sound in water.
        const k = 0.5 - 0.42 * t;
        lp += (Math.random() * 2 - 1 - lp) * k;
        d[i] = lp * Math.pow(1 - t, 2.6) * (i < 200 ? i / 200 : 1);
      }
    }
    return buf;
  }

  setSettings(patch: Partial<AudioSettings>): void {
    Object.assign(this.settings, patch);
    saveAudioSettings(this.settings);
    if (patch.ignoreSilent !== undefined) this.applySession();
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const s = this.settings;
    const t = this.ctx.currentTime;
    const phone = s.speaker === 'phone';
    this.lowCut.frequency.setTargetAtTime(phone ? 110 : 28, t, 0.05);
    this.presence.gain.setTargetAtTime(phone ? 2.5 : 0, t, 0.05);
    this.master.gain.setTargetAtTime(s.muted ? 0 : curve(s.master), t, 0.05);
    const set = (b: Bus, v: number, makeup: number) => {
      b.dry.gain.setTargetAtTime(curve(v) * makeup, t, 0.05);
      b.wet.gain.setTargetAtTime(curve(v) * makeup, t, 0.05);
    };
    // Make-up gain so the voices (written at small levels) sit well above the ambient bed.
    set(this.buses.music, s.music, 1.6);
    set(this.buses.ambience, s.ambience, 1);
    set(this.buses.sfx, s.effects, 2.4);
    set(this.buses.ui, s.effects, 2.2);
  }

  /** Milestone 12: the pause menu softens everything and dips the music. */
  setPaused(on: boolean): void {
    if (this.paused === on) return;
    this.paused = on;
    this.applyFader(0.25);
  }

  private applyFader(tc: number): void {
    if (!this.ctx) return;
    const v = this.hidden ? 0 : (1 - 0.6 * this.blackout) * (this.paused ? 0.55 : 1);
    this.fader.gain.setTargetAtTime(v, this.ctx.currentTime, Math.max(0.01, tc));
  }

  /** Called every frame by the director with the scene's state. */
  setScene(o: { muffle: number; space: number; duck: number; blackout: number }): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.water.frequency.setTargetAtTime(o.muffle, t, 0.25);
    this.space.gain.setTargetAtTime(o.space, t, 0.6);
    this.duck.gain.setTargetAtTime(o.duck * (this.paused ? 0.45 : 1), t, 0.5);
    if (Math.abs(o.blackout - this.blackout) > 0.01) {
      this.blackout = o.blackout;
      this.applyFader(0.3);
    }
  }

  // ---------------------------------------------------------------------------
  // Voice helpers. Each makes a short-lived set of nodes that stop themselves.

  /** Route a voice into a bus, with an optional reverb send and stereo pan. */
  route(node: AudioNode, bus: BusName, send = 0.2, pan = 0): void {
    const ctx = this.ctx!;
    let out: AudioNode = node;
    if (pan !== 0 && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(p);
      out = p;
    }
    out.connect(this.buses[bus].dry);
    if (send > 0) {
      const g = ctx.createGain();
      g.gain.value = send;
      out.connect(g);
      g.connect(this.buses[bus].wet);
    }
  }

  /** A pitched blip with an attack/decay envelope. */
  tone(o: {
    t?: number;
    freq: number;
    to?: number;
    dur: number;
    gain: number;
    type?: OscillatorType;
    attack?: number;
    bus?: BusName;
    send?: number;
    pan?: number;
    lp?: number;
  }): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = o.t ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t + o.dur);
    const g = ctx.createGain();
    const a = o.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + o.dur);
    let head: AudioNode = osc;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      osc.connect(f);
      head = f;
    }
    head.connect(g);
    this.route(g, o.bus ?? 'sfx', o.send ?? 0.15, o.pan ?? 0);
    osc.start(t);
    osc.stop(t + a + o.dur + 0.05);
  }

  /** A burst of filtered noise (splashes, scrapes, hiss, chips). */
  hiss(o: {
    t?: number;
    dur: number;
    gain: number;
    type?: BiquadFilterType;
    freq: number;
    to?: number;
    q?: number;
    attack?: number;
    bus?: BusName;
    send?: number;
    pan?: number;
    brown?: boolean;
  }): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = o.t ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = o.brown ? this.brown : this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? 'bandpass';
    f.frequency.setValueAtTime(o.freq, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + o.dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    const a = o.attack ?? 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + o.dur);
    src.connect(f);
    f.connect(g);
    this.route(g, o.bus ?? 'sfx', o.send ?? 0.1, o.pan ?? 0);
    src.start(t, Math.random() * 3);
    src.stop(t + a + o.dur + 0.05);
  }

  /** A soft FM bell or electric-piano tone (the "glass" of the soundtrack and chimes). */
  bell(o: { t?: number; freq: number; gain: number; decay: number; ratio?: number; index?: number; bus?: BusName; send?: number; pan?: number; attack?: number }): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = o.t ?? ctx.currentTime;
    const car = ctx.createOscillator();
    car.frequency.value = o.freq;
    const mod = ctx.createOscillator();
    mod.frequency.value = o.freq * (o.ratio ?? 2);
    const mg = ctx.createGain();
    const idx = (o.index ?? 1.2) * o.freq;
    mg.gain.setValueAtTime(idx, t);
    mg.gain.exponentialRampToValueAtTime(Math.max(1, idx * 0.04), t + o.decay * 0.6);
    mod.connect(mg);
    mg.connect(car.frequency);
    const g = ctx.createGain();
    const a = o.attack ?? 0.006;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + o.decay);
    car.connect(g);
    this.route(g, o.bus ?? 'sfx', o.send ?? 0.4, o.pan ?? 0);
    car.start(t);
    mod.start(t);
    car.stop(t + a + o.decay + 0.05);
    mod.stop(t + a + o.decay + 0.05);
  }

  /** A struck metal sound: a few inharmonic partials (clanks, dents, clamps). */
  metal(o: { t?: number; freq: number; gain: number; decay: number; bus?: BusName; send?: number; pan?: number }): void {
    const t = o.t ?? this.now;
    const parts = [1, 2.32, 3.86, 5.41];
    parts.forEach((r, i) =>
      this.tone({ t, freq: o.freq * r, dur: o.decay / (1 + i * 0.6), gain: o.gain / (1 + i), bus: o.bus, send: o.send ?? 0.3, pan: o.pan, type: 'sine' }),
    );
    this.hiss({ t, dur: 0.05, gain: o.gain * 0.8, freq: o.freq * 3, q: 0.8, bus: o.bus, pan: o.pan });
  }

  /** A low thud with a falling pitch (impacts, presses, clamps). */
  thump(o: { t?: number; freq: number; gain: number; dur?: number; bus?: BusName; send?: number; pan?: number }): void {
    const t = o.t ?? this.now;
    this.tone({ t, freq: o.freq, to: o.freq * 0.45, dur: o.dur ?? 0.3, gain: o.gain, bus: o.bus, send: o.send ?? 0.15, pan: o.pan });
    this.hiss({ t, dur: 0.08, gain: o.gain * 0.5, type: 'lowpass', freq: 600, bus: o.bus, pan: o.pan, brown: true });
  }

  /** A cluster of rising bubble blips (real bubbles chirp upwards in pitch). */
  bubbles(o: { t?: number; n: number; spread: number; gain: number; low?: number; high?: number; bus?: BusName; pan?: number }): void {
    const t0 = o.t ?? this.now;
    const lo = o.low ?? 380;
    const hi = o.high ?? 1400;
    for (let i = 0; i < o.n; i++) {
      const t = t0 + Math.random() * o.spread;
      const f = lo * Math.pow(hi / lo, Math.random());
      this.tone({
        t,
        freq: f,
        to: f * (1.5 + Math.random() * 0.6),
        dur: 0.03 + Math.random() * 0.05,
        gain: o.gain * (0.4 + Math.random() * 0.6),
        bus: o.bus,
        send: 0.12,
        pan: (o.pan ?? 0) + (Math.random() - 0.5) * 0.4,
      });
    }
  }
}

export const audio = new AudioEngine();
