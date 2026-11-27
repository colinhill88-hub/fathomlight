import { audio } from '../audio/engine';

/**
 * Beyond Earth (Nov 27, 2026): singing with the Choir's kin at the hearth, in Europa's warm deep.
 *
 * Like first contact on Earth (src/ui/contact.ts), but quieter and colder: the kin sing three
 * phrases of light and sound, three, four and five notes long, and Kestrel answers with the
 * resonator by tapping the same notes in order (keys 1-4, or the four pads). A wrong note only
 * makes them sing it again, slower: there is no way to fail. Their light is faint and flickers,
 * because they are fading. After the last phrase, a few lines tell why, and what they ask.
 *
 * It reuses the first-contact overlay's look (the #contact styles); the two are never open at once.
 */

const NOTE_HZ = [261.63, 329.63, 392, 493.88];
const NOTE_CSS = ['#6ff3ff', '#b07cff', '#ff6ad5', '#ffe7a0'];
const NAMES = ['cold', 'deep', 'warm', 'kin'];
const PHRASES = [
  [1, 0, 2],
  [0, 2, 3, 1],
  [2, 3, 0, 1, 2],
];
const LINES = [
  'They sing it back to you, softer, and their light shivers like a candle in a draught.',
  'The vents are going cold, they show you: one by one, over a very long time. Their light goes with the warmth.',
  'Warm the vents again, they ask. A kindling core from what this world grows will wake the nearest one.',
  'The far vents need more heat than Europa still holds. But you come from a world with warm vents of its own.',
];

export class KinSong {
  active = false;
  private el: HTMLDivElement | null = null;
  private caption!: HTMLDivElement;
  private pads: HTMLButtonElement[] = [];
  private round = 0;
  private answer: number[] = [];
  private slow = 1;
  private timers: number[] = [];
  private onNote: (i: number) => void = () => {};
  private onDone: () => void = () => {};
  private keyFn = (e: KeyboardEvent) => {
    if (!this.active || e.repeat) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 4) {
      e.preventDefault();
      this.tap(n - 1);
    }
  };

  start(onNote: (i: number) => void, onDone: () => void): void {
    if (this.active) return;
    this.active = true;
    this.onNote = onNote;
    this.onDone = onDone;
    this.round = 0;
    this.slow = 1;
    const el = document.createElement('div');
    el.id = 'contact';
    el.innerHTML = `<div class="contact-caption"></div><div class="contact-pads"></div>`;
    this.caption = el.querySelector('.contact-caption')!;
    const row = el.querySelector('.contact-pads')!;
    this.pads = [0, 1, 2, 3].map((i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'contact-pad';
      b.style.setProperty('--c', NOTE_CSS[i]);
      b.innerHTML = `<i></i><span>${NAMES[i]}</span><small>${i + 1}</small>`;
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.tap(i);
      });
      row.appendChild(b);
      return b;
    });
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.appendChild(el);
    document.body.classList.add('kin-singing');
    this.el = el;
    window.addEventListener('keydown', this.keyFn);
    this.say('Faint rings of light gather round the hearth, and turn toward you.');
    this.setPads(false);
    this.later(2600, () => this.sing());
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private say(text: string): void {
    this.caption.textContent = text;
    this.caption.classList.remove('show');
    void this.caption.offsetWidth;
    this.caption.classList.add('show');
  }

  private setPads(on: boolean): void {
    this.el?.classList.toggle('answering', on);
    for (const b of this.pads) b.disabled = !on;
  }

  private note(i: number): void {
    this.onNote(i);
    try {
      audio.bell({ freq: NOTE_HZ[i], gain: 0.16, decay: 1.6, bus: 'sfx' });
    } catch {
      /* sound is optional */
    }
    const b = this.pads[i];
    b.classList.add('lit');
    this.later(260, () => b.classList.remove('lit'));
  }

  /** The kin sing the current phrase; then it is Kestrel's turn. */
  private sing(): void {
    const ph = PHRASES[this.round];
    this.answer = [];
    this.setPads(false);
    this.say(this.round === 0 ? 'They sing. Answer them with the resonator: the same notes, in order.' : this.slow > 1 ? 'They sing it again, slower.' : 'They sing again, a longer phrase.');
    const gap = 620 * this.slow;
    ph.forEach((n, k) => this.later(900 + k * gap, () => this.note(n)));
    this.later(900 + ph.length * gap + 200, () => this.setPads(true));
  }

  private tap(i: number): void {
    if (!this.active || !this.el?.classList.contains('answering')) return;
    this.note(i);
    const ph = PHRASES[this.round];
    this.answer.push(i);
    const k = this.answer.length - 1;
    if (this.answer[k] !== ph[k]) {
      this.slow = Math.min(1.8, this.slow + 0.4);
      this.setPads(false);
      this.later(700, () => this.sing());
      return;
    }
    if (this.answer.length < ph.length) return;
    this.round++;
    this.slow = 1;
    this.setPads(false);
    if (this.round < PHRASES.length) {
      this.later(900, () => this.sing());
      return;
    }
    // The song is sung: what they show you.
    LINES.forEach((line, n) => this.later(800 + n * 4200, () => this.say(line)));
    for (let n = 0; n < 8; n++) this.later(900 + n * 600, () => this.note(n % 4));
    this.later(800 + LINES.length * 4200 + 600, () => this.finish());
  }

  private finish(): void {
    if (!this.active) return;
    this.active = false;
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    window.removeEventListener('keydown', this.keyFn);
    this.el?.remove();
    this.el = null;
    document.body.classList.remove('kin-singing');
    this.onDone();
  }
}
