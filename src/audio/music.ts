import { audio } from './engine';

/*
 * Milestone 7b: the generative soundtrack (Colin: warm synth-ambient, sparse).
 *
 * Music comes and goes. A "passage" plays for one to two and a half minutes:
 * slow warm pads change chord every 9 to 14 s, a soft electric-piano melody
 * wanders over them in short phrases, and glassy chimes ring now and then.
 * Then it rests for 40 to 100 s, leaving the ambience and water alone.
 * Swimming into a new zone during a rest starts a passage sooner, in that
 * zone's key and mood.
 *
 * Each zone has a key, a scale, chord voicings, a register and a brightness:
 *  - shallows: D major / lydian, bright and calm
 *  - basin:    A dorian, lower and spacious
 *  - forest:   E minor with a flat second, darker, slower and a little uneasy
 *  - cave:     the forest's key, almost only a low drone and rare notes
 *
 * Nothing here uses cyan/violet "Choir" sounds yet: those come with the sanctum.
 */

export type MusicZone = 'shallows' | 'basin' | 'forest' | 'cave' | 'shelf' | 'trench' | 'sanctum';

interface Profile {
  /** MIDI note of the pad root. */
  root: number;
  /** Scale steps (semitones above the root) for the melody. */
  scale: number[];
  /** Chord voicings, semitones above the root. */
  chords: number[][];
  /** Melody range in semitones above root + 12. */
  lo: number;
  hi: number;
  /** Pad brightness (low-pass cutoff in Hz). */
  bright: number;
  /** Seconds per melody beat. */
  beat: number;
  /** Chance per beat that the melody plays a note during a phrase. */
  density: number;
  /** Chance of a chime per chord. */
  chimes: number;
  padGain: number;
  /** Semitone offsets that sound uneasy here and may sneak into the melody. */
  tension?: number[];
}

const PROFILES: Record<MusicZone, Profile> = {
  shallows: {
    root: 50, // D3
    scale: [0, 2, 4, 6, 7, 9, 11],
    chords: [
      [0, 7, 14, 16, 23],
      [5, 12, 16, 21],
      [-3, 7, 12, 16, 19],
      [7, 14, 19, 21],
      [2, 9, 14, 17, 21],
    ],
    lo: 0,
    hi: 19,
    bright: 1500,
    beat: 0.85,
    density: 0.5,
    chimes: 0.6,
    padGain: 0.055,
  },
  basin: {
    root: 45, // A2
    scale: [0, 2, 3, 5, 7, 9, 10],
    chords: [
      [0, 7, 14, 15],
      [5, 12, 17, 21],
      [-2, 5, 10, 14],
      [3, 10, 15, 19],
    ],
    lo: -2,
    hi: 15,
    bright: 1000,
    beat: 1.0,
    density: 0.38,
    chimes: 0.45,
    padGain: 0.055,
  },
  forest: {
    root: 40, // E2
    scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [
      [0, 7, 12, 15, 19],
      [1, 8, 13, 17],
      [-4, 3, 8, 12, 15],
      [0, 7, 14, 15],
      [5, 12, 15, 20],
    ],
    lo: 0,
    hi: 15,
    bright: 750,
    beat: 1.15,
    density: 0.3,
    chimes: 0.3,
    padGain: 0.05,
    tension: [1, 6],
  },
  // Milestone 8: the wreck shelf. Twilight: low, slow, and uneasy (a flattened fifth).
  shelf: {
    root: 37, // C#2
    scale: [0, 1, 3, 5, 6, 8, 10],
    chords: [
      [0, 7, 12, 15],
      [1, 6, 13, 16],
      [-2, 5, 10, 13],
      [0, 6, 12, 15],
    ],
    lo: -3,
    hi: 12,
    bright: 600,
    beat: 1.35,
    density: 0.18,
    chimes: 0.2,
    padGain: 0.045,
    tension: [6, 1],
  },
  // Milestone 10: the trench. Lowest of all, very sparse, a minor second rubbing against the root.
  trench: {
    root: 33, // A1
    scale: [0, 1, 3, 6, 7, 10],
    chords: [
      [0, 7, 13],
      [1, 6, 12],
      [-2, 5, 13],
    ],
    lo: -5,
    hi: 8,
    bright: 420,
    beat: 1.7,
    density: 0.1,
    chimes: 0.12,
    padGain: 0.05,
    tension: [1, 6],
  },
  // Milestone 11: the sanctum. Awe after dread: a wide, open lydian over D, slow and glassy, with more chimes.
  sanctum: {
    root: 38, // D2
    scale: [0, 2, 4, 6, 7, 9, 11],
    chords: [
      [0, 7, 14, 19, 23],
      [2, 9, 14, 18, 21],
      [-5, 7, 11, 14, 19],
      [4, 11, 16, 18, 23],
    ],
    lo: 0,
    hi: 19,
    bright: 1800,
    beat: 1.5,
    density: 0.22,
    chimes: 0.6,
    padGain: 0.05,
  },
  cave: {
    root: 40,
    scale: [0, 3, 5, 7, 10],
    chords: [
      [0, 7, 12],
      [1, 8, 13],
      [0, 7, 15],
    ],
    lo: -5,
    hi: 10,
    bright: 520,
    beat: 1.4,
    density: 0.14,
    chimes: 0.15,
    padGain: 0.04,
    tension: [1],
  },
};

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

interface PadVoice {
  gain: GainNode;
  oscs: OscillatorNode[];
}

export class Music {
  private zone: MusicZone = 'shallows';
  private playing = false;
  /** Seconds left in the current passage or rest. */
  private left = 4;
  private restFor = 0;
  private chordAt = 0;
  private chordIdx = 0;
  private chord: number[] = [];
  private pads: PadVoice[] = [];
  private filter: BiquadFilterNode | null = null;
  private noteAt = 0;
  private phraseLeft = 0;
  private melody = 12;
  private ready = false;

  constructor() {
    audio.onReady(() => {
      const ctx = audio.ctx!;
      // One shared warm filter for the pads, with a slow breathing sweep.
      this.filter = ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 1200;
      this.filter.Q.value = 0.7;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.045;
      const amt = ctx.createGain();
      amt.gain.value = 260;
      lfo.connect(amt);
      amt.connect(this.filter.frequency);
      lfo.start();
      audio.route(this.filter, 'music', 0.55);
      this.ready = true;
    });
  }

  /** Start a passage soon (used when entering a new zone during a rest). */
  setZone(z: MusicZone): void {
    if (z === this.zone) return;
    this.zone = z;
    if (this.playing) {
      // Move to the new key with the next chord, a little early.
      this.chordAt = Math.min(this.chordAt, audio.now + 1.5);
      this.melody = 12;
    } else if (this.restFor > 15) this.left = Math.min(this.left, 2 + Math.random() * 3);
  }

  private epoch = 0;
  update(dt: number): void {
    if (!this.ready || !audio.running) return;
    const now = audio.now;
    if (this.epoch !== audio.epoch) {
      // A fresh audio context (its clock starts again at 0): forget voices and times from the old one.
      this.epoch = audio.epoch;
      this.pads = [];
      this.playing = false;
      this.left = 2;
      this.chordAt = 0;
      this.noteAt = 0;
    }
    const P = PROFILES[this.zone];
    this.left -= dt;
    if (!this.playing) {
      this.restFor += dt;
      if (this.left <= 0) {
        this.playing = true;
        this.left = 70 + Math.random() * 80;
        this.chordAt = now + 0.1;
        this.phraseLeft = 0;
        this.noteAt = now + 6;
        this.chordIdx = Math.floor(Math.random() * P.chords.length);
      }
      return;
    }
    if (this.left <= 0) {
      // Let the last chord ring out, then rest.
      this.playing = false;
      this.restFor = 0;
      this.left = 40 + Math.random() * 60;
      this.releasePads(now, 7);
      return;
    }
    if (this.filter) this.filter.frequency.setTargetAtTime(P.bright, now, 4);

    if (now >= this.chordAt - 0.05) {
      this.nextChord(P, this.chordAt);
      this.chordAt = Math.max(now, this.chordAt) + 9 + Math.random() * 5;
      if (Math.random() < P.chimes) this.chime(P, this.chordAt - 5 - Math.random() * 3);
    }

    // The melody: short phrases with long breaths between, scheduled a beat ahead.
    if (this.noteAt < now - 1) this.noteAt = now + P.beat;
    while (this.noteAt < now + 0.3) {
      const t = Math.max(now, this.noteAt);
      if (this.phraseLeft <= 0) {
        if (Math.random() < 0.45) this.phraseLeft = 3 + Math.floor(Math.random() * 5);
        this.noteAt = t + P.beat * (2 + Math.floor(Math.random() * 4));
        continue;
      }
      this.phraseLeft--;
      const lens = [1, 1, 2, 2, 3];
      const len = lens[Math.floor(Math.random() * lens.length)];
      if (Math.random() < P.density + 0.35) this.note(P, t, len * P.beat);
      this.noteAt = t + len * P.beat;
    }
  }

  private nextChord(P: Profile, t: number): void {
    const ctx = audio.ctx!;
    t = Math.max(ctx.currentTime, t);
    // Mostly step to a neighbouring chord; sometimes jump.
    const n = P.chords.length;
    this.chordIdx = (this.chordIdx + (Math.random() < 0.7 ? 1 : 1 + Math.floor(Math.random() * (n - 1)))) % n;
    this.chord = P.chords[this.chordIdx];
    this.releasePads(t, 5);
    const pad = ctx.createGain();
    pad.gain.setValueAtTime(0.0001, t);
    pad.gain.linearRampToValueAtTime(P.padGain, t + 3.5);
    pad.connect(this.filter!);
    const oscs: OscillatorNode[] = [];
    for (const step of this.chord) {
      const f = hz(P.root + step);
      // Two detuned saws per note give the warm analogue width; a sine adds body to the bass.
      for (const det of [-7, 6]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = det + (Math.random() - 0.5) * 4;
        const g = ctx.createGain();
        g.gain.value = step < 3 ? 0.55 : 0.32;
        o.connect(g);
        g.connect(pad);
        o.start(t);
        oscs.push(o);
      }
    }
    const sub = ctx.createOscillator();
    sub.frequency.value = hz(P.root + this.chord[0] - 12);
    const sg = ctx.createGain();
    sg.gain.value = 0.9;
    sub.connect(sg);
    sg.connect(pad);
    sub.start(t);
    oscs.push(sub);
    this.pads.push({ gain: pad, oscs });
  }

  private releasePads(t: number, release: number): void {
    for (const p of this.pads) {
      p.gain.gain.cancelScheduledValues(t);
      p.gain.gain.setTargetAtTime(0, t, release / 4);
      for (const o of p.oscs) o.stop(t + release + 0.5);
    }
    this.pads = [];
  }

  /** One melody note: a soft FM electric-piano tone with a gentle attack. */
  private note(P: Profile, t: number, len: number): void {
    // A small random walk along the scale, pulled towards chord tones.
    const cands: number[] = [];
    for (let o = -12; o <= 24; o += 12) for (const s of P.scale) cands.push(s + o);
    if (P.tension && Math.random() < 0.12) for (const x of P.tension) cands.push(x + 12);
    const near = cands.filter((c) => c >= P.lo && c <= P.hi && Math.abs(c - this.melody) <= 5 && c !== this.melody);
    const chordPcs = new Set(this.chord.map((c) => ((c % 12) + 12) % 12));
    const weighted = near.flatMap((c) => (chordPcs.has(((c % 12) + 12) % 12) ? [c, c, c] : [c]));
    if (!weighted.length) return;
    this.melody = weighted[Math.floor(Math.random() * weighted.length)];
    const f = hz(P.root + 12 + this.melody);
    audio.bell({ t, freq: f, gain: 0.07, decay: Math.min(4, 1.2 + len), ratio: 1, index: 0.9, bus: 'music', send: 0.6, pan: (Math.random() - 0.5) * 0.5, attack: 0.02 });
    // A faint octave shimmer.
    audio.bell({ t: t + 0.01, freq: f * 2, gain: 0.012, decay: 1.2, ratio: 3.5, index: 0.5, bus: 'music', send: 0.8 });
  }

  /** A glassy high chime, ringing in the reverb. */
  private chime(P: Profile, t: number): void {
    t = Math.max(audio.now, t);
    const top = this.chord[this.chord.length - 1] ?? 12;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const step = top + 12 + [0, 7, 5, -5][i % 4];
      audio.bell({ t: t + i * 0.45, freq: hz(P.root + step), gain: 0.025, decay: 3, ratio: 3.01, index: 0.6, bus: 'music', send: 0.9, pan: (Math.random() - 0.5) * 1.2 });
    }
  }
}
