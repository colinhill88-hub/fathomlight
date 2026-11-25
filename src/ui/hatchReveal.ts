import { cleanName, SPECIES, suggestedName } from '../game/creatures';
import type { KindNews } from '../game/collection';
import type { CreatureData } from '../game/state';
import { COLOURS, PATTERNS, SHAPES, traitsOf } from '../game/traits';
import { rarityTags } from './creatureCard';
import { snapImg } from './creatureSnap';

/*
 * Phase 20: the hatching moment. Every egg that hatches gets a short reveal: the egg
 * wobbles, light shows through cracks in the shell, it bursts, and the baby tumbles
 * out. The size of the moment follows its rarity (Colin): main.ts shows a reward
 * card with a fanfare first for a first-ever colour or pattern, or a radiant baby,
 * and this card follows it.
 *
 * The card suggests a name; one tap keeps it (Keep), or type another. Left alone,
 * it keeps the suggestion and slips away after a while, so it never holds up play.
 * It sits at the bottom of the screen and doesn't pause the world.
 */

export interface RevealDeps {
  named(c: CreatureData): void;
  openBook(c: CreatureData): void;
}

interface Job {
  c: CreatureData;
  news: KindNews;
  tier: 'reveal' | 'notable' | 'major';
  where: string;
}

const LIFE = 16000;

export class HatchReveal {
  private el: HTMLDivElement;
  private queue: Job[] = [];
  private job: Job | null = null;
  private timer = 0;
  private touched = false;

  constructor(private readonly deps: RevealDeps) {
    this.el = document.createElement('div');
    this.el.id = 'hatch-reveal';
    this.el.hidden = true;
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'A creature hatched');
    document.body.appendChild(this.el);
    this.el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.touched = true;
    });
    this.el.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'hr-keep') this.keep();
      else if (b.dataset.act === 'hr-book' && this.job) {
        const c = this.job.c;
        this.keep();
        this.deps.openBook(c);
      }
    });
    this.el.addEventListener('keydown', (e) => {
      if (!(e.target as HTMLElement).closest('input')) return;
      // Typing a name must not steer Kestrel.
      e.stopPropagation();
      this.touched = true;
      if (e.key === 'Enter') this.keep();
    });
    this.el.addEventListener('focusin', () => (this.touched = true));
  }

  get showing(): boolean {
    return !!this.job;
  }

  /** Queue a reveal. Bottom modal pop-ups removed (Colin, Nov 25, 2026): auto-keep the suggested name silently. */
  show(c: CreatureData, _news: KindNews, _tier: Job['tier'], _where: string): void {
    this.deps.named(c);
  }

  private next(): void {
    this.job = this.queue.shift() ?? null;
    if (!this.job) {
      this.el.hidden = true;
      this.el.innerHTML = '';
      return;
    }
    this.touched = false;
    this.timer = 0;
    this.render();
    this.el.hidden = false;
  }

  /** Keep the name in the box (or the suggestion) and move on. */
  private keep(): void {
    const j = this.job;
    if (!j) return;
    const inp = this.el.querySelector<HTMLInputElement>('input');
    const n = cleanName(inp?.value ?? '');
    if (n && n !== suggestedName(j.c)) j.c.name = n;
    this.deps.named(j.c);
    if (document.activeElement instanceof HTMLElement && this.el.contains(document.activeElement)) document.activeElement.blur();
    this.next();
  }

  /** Call every frame (real seconds). */
  update(dt: number): void {
    if (!this.job) return;
    this.timer += dt * 1000;
    if (!this.touched && this.timer > LIFE) this.keep();
  }

  private render(): void {
    const j = this.job!;
    const c = j.c;
    const t = traitsOf(c);
    const sp = SPECIES[c.species];
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const nf = j.news.newForms;
    const stamp = t.choir
      ? 'Touched by the Choir!'
      : nf.includes('heirloom')
        ? 'The first of an heirloom line!'
        : t.heirloom
          ? 'An heirloom, like its line'
          : nf.includes('shape2')
            ? `First ${SHAPES[c.species][2]} ${sp.name.toLowerCase()}!`
            : j.news.newRadiant
      ? 'First radiant of its kind!'
      : j.news.newColour && j.news.newPattern
        ? 'A new colour and a new glow!'
        : j.news.newColour
          ? `First ${COLOURS[c.species][t.colour].toLowerCase()} ${sp.name.toLowerCase()}!`
          : j.news.newPattern
            ? `First ${PATTERNS[c.species][t.pattern]} ${sp.name.toLowerCase()}!`
            : nf.includes('tiny')
              ? `First tiny ${sp.name.toLowerCase()}!`
              : nf.includes('giant')
                ? `First giant ${sp.name.toLowerCase()}!`
                : nf.includes('shape1')
                  ? `First ${SHAPES[c.species][1]} ${sp.name.toLowerCase()}!`
                  : j.news.newKind
                    ? 'New in your book'
                    : '';
    this.el.className = `tier-${j.tier}${t.radiant ? ' radiant' : ''}${t.choir ? ' choir' : t.heirloom ? ' heirloom' : ''}`;
    this.el.innerHTML = `<div class="hr-card">
      <div class="hr-stage">
        <svg class="hr-egg" viewBox="0 0 80 96" aria-hidden="true">
          <defs><radialGradient id="hrg" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff6dc"/><stop offset=".6" stop-color="#f0d49a"/><stop offset="1" stop-color="#b98d4a"/></radialGradient></defs>
          <path class="hr-shell" d="M40 4C60 4 74 36 74 58c0 20-15 34-34 34S6 78 6 58C6 36 20 4 40 4z" fill="url(#hrg)" stroke="#a87e3e" stroke-width="2"/>
          <path class="hr-crack" d="M14 52l9-6 6 7 8-9 7 8 9-7 7 6 8-4" fill="none" stroke="#fff3b8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="hr-burst" aria-hidden="true">${'<i></i>'.repeat(10)}</div>
        <div class="hr-baby">${snapImg(c.species, t, '', 'young', sp.name)}</div>
      </div>
      <div class="hr-text">
        <p class="hr-kicker">Hatched ${esc(j.where)}${stamp ? ` · <b>${stamp}</b>` : ''}</p>
        <p class="hr-what">A young ${sp.name.toLowerCase()}: ${COLOURS[c.species][t.colour].toLowerCase()}, ${PATTERNS[c.species][t.pattern]} ${rarityTags(t, c.species)}</p>
        <div class="hr-name"><input maxlength="16" value="${esc(suggestedName(c))}" aria-label="Its name" autocomplete="off" spellcheck="false"><button type="button" class="keep" data-act="hr-keep">Keep</button></div>
        ${j.news.newKind ? '<button type="button" class="hr-book" data-act="hr-book">See it in the book</button>' : ''}
      </div>
    </div>`;
  }
}
