import { audio } from '../audio/engine';
import { ChoirForm } from '../interior/sanctum';

/**
 * Milestone 11: first contact, the ending (Colin's choice: call and response,
 * then a reward). In the heart of the sanctum:
 *
 *  1. The Choir rises out of its light well.
 *  2. Three phrases, three, four and five notes long. The Choir sings each in
 *     light (and sound); you answer with the resonator by tapping the same
 *     colours in order. A wrong note only makes it sing the phrase again,
 *     slower: there is no way to fail. Each colour is named after one of the
 *     glow patterns your own creatures taught you.
 *  3. It sings back every pattern you raised, as if naming them, and opens
 *     out to fill the room, with a few lines of text.
 *  4. Credits, then "Keep exploring": the game carries on, with its gifts.
 *
 * Keys 1-4 answer on a PC; on the phone, the four big buttons.
 */

export interface ContactWord {
  /** e.g. "Glowfin · banded". */
  name: string;
}

const NOTE_HZ = [293.66, 369.99, 440, 554.37];
const NOTE_CSS = ['#5ff0ff', '#a27cff', '#ff5ad8', '#ffe7a0'];
/** Milestone 12: gamepad buttons for the four pads (A, B, X, Y; standard mapping 0, 1, 2, 3). */
const PAD_KEY = ['A', 'B', 'X', 'Y'];
const PHRASES = [
  [0, 2, 1],
  [1, 3, 0, 2],
  [2, 0, 3, 1, 0],
];
const LINES = [
  'It sings back every pattern you raised, one by one, as if it were naming them.',
  'Something like a smile goes round it, in rings.',
  'It has waited a very long time for someone to grow light, not only carry it.',
];

type Phase = 'rise' | 'sing' | 'answer' | 'joy' | 'name' | 'credits' | 'done';

export class Contact {
  active = false;
  /** The resonator sings while you answer (0..1), for the walker's crystal. */
  singing = 0;
  private phase: Phase = 'rise';
  private t = 0;
  private round = 0;
  private slow = 1;
  private noteI = 0;
  private answer: number[] = [];
  private el: HTMLDivElement | null = null;
  private caption!: HTMLDivElement;
  private pads: HTMLButtonElement[] = [];
  private onDone: () => void = () => {};
  private words: ContactWord[] = [];
  private nameI = 0;
  private keyFn = (e: KeyboardEvent) => this.onKey(e);

  constructor(private readonly choir: ChoirForm) {}

  start(words: ContactWord[], onDone: () => void): void {
    this.active = true;
    this.words = words;
    this.onDone = onDone;
    this.phase = 'rise';
    this.t = 0;
    this.round = 0;
    this.slow = 1;
    this.choir.rise = 0;
    this.choir.note = -1;
    this.choir.noteK = 0;
    this.choir.bloom = 0;
    const el = document.createElement('div');
    el.id = 'contact';
    el.innerHTML = `<div class="contact-caption"></div><div class="contact-pads"></div>`;
    this.caption = el.querySelector('.contact-caption')!;
    const padRow = el.querySelector('.contact-pads')!;
    const fallback = ['ring', 'ribbon', 'spiral', 'star'];
    this.pads = [0, 1, 2, 3].map((i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'contact-pad';
      b.style.setProperty('--c', NOTE_CSS[i]);
      b.innerHTML = `<i></i><span></span><small>${i + 1}<em class="padkey"> · ${PAD_KEY[i]}</em></small>`;
      b.querySelector('span')!.textContent = words[i]?.name ?? fallback[i];
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.tap(i);
      });
      padRow.appendChild(b);
      return b;
    });
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.appendChild(el);
    this.el = el;
    window.addEventListener('keydown', this.keyFn);
    this.say('Light gathers in the well below the plinth, and rises.');
    this.setPads(false);
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.active || e.repeat) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 4) {
      this.tap(n - 1);
      e.preventDefault();
    }
  }

  private say(text: string): void {
    this.caption.textContent = text;
    this.caption.classList.remove('show');
    void this.caption.offsetWidth;
    this.caption.classList.add('show');
  }

  private setPads(on: boolean): void {
    this.el?.classList.toggle('answering', on);
    for (const p of this.pads) p.disabled = !on;
  }

  private play(i: number, len = 0.9, gain = 0.07): void {
    audio.tone({ freq: NOTE_HZ[i], dur: len * 1.6, attack: 0.04, gain, type: 'sine', bus: 'music', send: 0.9 });
    audio.tone({ freq: NOTE_HZ[i] * 2, dur: len * 1.2, attack: 0.02, gain: gain * 0.3, type: 'triangle', bus: 'music', send: 0.9 });
    this.choir.note = i;
    this.choir.noteK = 1;
    const p = this.pads[i];
    p.classList.remove('lit');
    void p.offsetWidth;
    p.classList.add('lit');
  }

  private tap(i: number): void {
    if (this.phase !== 'answer') return;
    this.play(i, 0.6, 0.06);
    this.singing = 1;
    const want = PHRASES[this.round];
    this.answer.push(i);
    const k = this.answer.length - 1;
    if (want[k] !== i) {
      // No way to fail: it simply sings the phrase again, slower.
      this.phase = 'sing';
      this.t = -1.2;
      this.noteI = 0;
      this.slow = Math.min(1.8, this.slow + 0.3);
      this.setPads(false);
      this.say('It tilts, patient, and sings the phrase again, slower.');
      return;
    }
    if (this.answer.length === want.length) {
      this.phase = 'joy';
      this.t = 0;
      this.setPads(false);
      this.say(this.round === 0 ? 'The rings flare. It heard you.' : this.round === 1 ? 'It answers with a ripple that runs right round the room.' : 'Every ring lights at once.');
      // A little flourish up the scale.
      for (let n = 0; n < 4; n++) audio.tone({ t: audio.now + n * 0.12, freq: NOTE_HZ[n] * 2, dur: 1.2, attack: 0.02, gain: 0.03, type: 'sine', bus: 'music', send: 1 });
    }
  }

  /** For tests on slow machines: run the sequence faster. */
  debugSpeed = 1;
  private padPrev: boolean[] = [];

  /** Milestone 12: answer with A, B, X and Y on a gamepad. */
  private pollPad(): void {
    const pad = (navigator.getGamepads?.() ?? []).find((p) => !!p);
    if (!pad) return;
    for (let i = 0; i < 4; i++) {
      const down = !!pad.buttons[i]?.pressed;
      if (down && !this.padPrev[i]) this.tap(i);
      this.padPrev[i] = down;
    }
    // Any button press shows the pad letters on the pads.
    if (pad.buttons.some((b) => b.pressed)) this.el?.classList.add('pad');
  }

  update(dt: number): void {
    if (this.active) this.pollPad();
    if (!this.active) return;
    dt *= this.debugSpeed;
    this.t += dt;
    this.singing = Math.max(0, this.singing - dt * 2);
    this.choir.noteK = Math.max(0, this.choir.noteK - dt * 1.4);
    const step = 0.95 * this.slow;
    switch (this.phase) {
      case 'rise':
        this.choir.rise = Math.min(1, this.t / 5);
        if (this.t > 6) {
          this.phase = 'sing';
          this.t = -0.5;
          this.noteI = 0;
          this.say('It sings to you: a phrase of light. Answer it with the resonator, colour by colour.');
        }
        break;
      case 'sing': {
        const want = PHRASES[this.round];
        if (this.t >= this.noteI * step && this.noteI < want.length && this.t >= 0) {
          this.play(want[this.noteI]);
          this.noteI++;
        }
        if (this.noteI >= want.length && this.t > want.length * step + 0.4) {
          this.phase = 'answer';
          this.answer = [];
          this.setPads(true);
          if (this.round > 0 || this.slow > 1) this.say('Your turn.');
          else this.say('Your turn: tap the colours in the order it sang them (keys 1-4 on a keyboard).');
        }
        break;
      }
      case 'answer':
        break;
      case 'joy':
        this.choir.bloom = Math.min(0.25 * (this.round + 1), this.choir.bloom + dt * 0.2);
        if (this.t > 2.6) {
          this.round++;
          this.slow = 1;
          if (this.round >= PHRASES.length) {
            this.phase = 'name';
            this.t = 0;
            this.nameI = 0;
            this.say(LINES[0]);
            for (const p of this.pads) p.classList.add('gone');
          } else {
            this.phase = 'sing';
            this.t = -0.4;
            this.noteI = 0;
            this.say(this.round === 1 ? 'A longer phrase.' : 'Longer still.');
          }
        }
        break;
      case 'name': {
        // It names each of your creatures' patterns in turn, quickly, then opens out.
        const each = 0.55;
        const n = Math.max(4, this.words.length);
        if (this.t >= this.nameI * each && this.nameI < n) {
          this.play(this.nameI % 4, 0.5, 0.05);
          this.nameI++;
        }
        this.choir.bloom = Math.min(1, this.choir.bloom + dt * 0.08);
        const li = Math.min(LINES.length - 1, Math.floor(this.t / 5));
        if (this.caption.textContent !== LINES[li]) this.say(LINES[li]);
        if (this.t > LINES.length * 5 + 1) this.rollCredits();
        break;
      }
      case 'credits':
        this.choir.bloom = 1;
        break;
      case 'done':
        break;
    }
  }

  private rollCredits(): void {
    this.phase = 'credits';
    this.t = 0;
    const el = this.el!;
    el.classList.add('credits');
    const roll = document.createElement('div');
    roll.className = 'contact-credits';
    roll.innerHTML = `<div class="roll">
      <h1>FATHOMLIGHT</h1>
      <p>First contact</p>
      <p class="gap">The crew of Outpost Kestrel<br>and the Choir</p>
      <p class="gap">Designed by Colin Hill</p>
      <p>Built one slice at a time with Claude Code</p>
      <p class="gap">Every shape, light, creature and sound<br>is drawn and played by code</p>
      <p class="gap">For the toy divers in the bathtub</p>
      <p class="gap">Thank you for diving.</p>
    </div>
    <button type="button" class="contact-go">Keep exploring</button>`;
    el.appendChild(roll);
    // The button appears after a moment, so the roll is not skipped by a stray tap.
    const go = roll.querySelector<HTMLButtonElement>('.contact-go')!;
    setTimeout(() => go.classList.add('show'), 3500);
    go.addEventListener('click', () => this.finish());
    for (let n = 0; n < 6; n++) audio.tone({ t: audio.now + n * 0.5, freq: NOTE_HZ[n % 4] * (n < 4 ? 1 : 2), dur: 3, attack: 0.3, gain: 0.03, type: 'sine', bus: 'music', send: 1 });
  }

  private finish(): void {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.active = false;
    window.removeEventListener('keydown', this.keyFn);
    this.el?.remove();
    this.el = null;
    this.choir.rise = 0;
    this.choir.bloom = 0;
    this.choir.note = -1;
    this.onDone();
  }

  /** For tests: answer the current phrase correctly. */
  debugAnswer(): void {
    if (this.phase !== 'answer') return;
    for (const n of PHRASES[this.round].slice(this.answer.length)) this.tap(n);
  }
  /** For tests: skip to the credits' button. */
  debugFinish(): void {
    this.finish();
  }
  get debugPhase(): string {
    return this.phase;
  }
}
