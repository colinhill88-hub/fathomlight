/**
 * Phase 18: Linnea's words, in a small warm card over her head. It shows one
 * line at a time. Talking again shows the next line; after the last, the card
 * fades. It also fades by itself after a while, or as Kestrel swims away. It
 * never steals input (taps pass through to the game).
 */
export class LinneaSpeech {
  private readonly el: HTMLDivElement;
  private readonly text: HTMLParagraphElement;
  private readonly more: HTMLSpanElement;
  private lines: string[] = [];
  private index = -1;
  private life = 0;
  shown = false;

  constructor() {
    const el = (this.el = document.createElement('div'));
    el.id = 'linnea-say';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<b>Linnea</b><p></p><span class="more" aria-hidden="true">•••</span>';
    this.text = el.querySelector('p')!;
    this.more = el.querySelector('.more')!;
    (document.getElementById('tags') ?? document.body).appendChild(el);
  }

  /** Start a conversation: the first line shows now. */
  start(lines: string[]): string {
    this.lines = lines;
    this.index = -1;
    return this.next()!;
  }

  /** Show the next line, or null (and fade) when there are no more. */
  next(): string | null {
    this.index++;
    if (this.index >= this.lines.length) {
      this.hide();
      return null;
    }
    const line = this.lines[this.index];
    this.text.textContent = line;
    this.more.hidden = this.index >= this.lines.length - 1;
    // About a third of a second a word, and never less than five seconds.
    this.life = Math.max(5, line.split(/\s+/).length * 0.36 + 2.5);
    this.shown = true;
    this.el.classList.add('show');
    this.el.classList.remove('pop');
    void this.el.offsetWidth;
    this.el.classList.add('pop');
    return line;
  }

  /** Is there a line after this one? */
  get hasMore(): boolean {
    return this.shown && this.index < this.lines.length - 1;
  }

  hide(): void {
    this.shown = false;
    this.index = this.lines.length;
    this.el.classList.remove('show');
  }

  /** Keep the card over her head (screen CSS px). dt is real seconds. */
  update(dt: number, sx: number, sy: number, viewW: number): void {
    if (!this.shown) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.hide();
      return;
    }
    const x = Math.max(130, Math.min(viewW - 130, sx));
    this.el.style.left = `${x}px`;
    this.el.style.top = `${Math.max(70, sy)}px`;
    this.el.style.setProperty('--tail', `${Math.max(-100, Math.min(100, sx - x))}px`);
  }
}
