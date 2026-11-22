import { BaseLayout, pieceCode } from '../game/base';
import { cleanName, contentment, creatureName, KNOWS_KESTREL, SPECIES, suggestedName } from '../game/creatures';
import { kindKey, book } from '../game/collection';
import type { CreatureData, SaveData, SpeciesId } from '../game/state';
import { COLOURS, genText, PATTERNS, RARE_COLOUR, SHAPES, traitsOf, WILD_PATTERNS, type Traits } from '../game/traits';
import { snapImg } from './creatureSnap';

/*
 * Phase 20: a creature's card. Opened from the Habitat console, the Hatchery or the
 * collection book: its portrait (the real rig), its name (tap to change it), species,
 * colour and glow pattern (rare ones marked), generation, parents, where it lives and,
 * for Phase 21, how content it is and whether it knows Kestrel.
 *
 * It sits above every other panel and closes with ✕, Esc or a pad's B (PadNav).
 */

export interface CardDeps {
  save: SaveData;
  layout: BaseLayout;
  persist(): void;
  /** A name changed (the panels and tanks redraw their labels). */
  renamed(c: CreatureData): void;
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** Small rarity tags for a creature's traits. */
export function rarityTags(t: Traits, species?: SpeciesId): string {
  const tags: string[] = [];
  // Phase 23 and 22 first: the rarest tier.
  if (t.choir) tags.push('<span class="rtag choir">Choir-touched</span>');
  if (t.heirloom) tags.push('<span class="rtag heirloom">heirloom line</span>');
  if (t.colour === RARE_COLOUR) tags.push('<span class="rtag rare">rare colour</span>');
  if (t.pattern >= WILD_PATTERNS) tags.push('<span class="rtag rare">bred-only glow</span>');
  if (t.shape === 2) tags.push(`<span class="rtag rare">rare shape${species ? `: ${SHAPES[species][2]}` : ''}</span>`);
  if (t.shape === 1) tags.push(`<span class="rtag unc">${species ? SHAPES[species][1] : 'uncommon shape'}</span>`);
  if (t.size) tags.push(`<span class="rtag unc">${t.size}</span>`);
  if (t.radiant) tags.push('<span class="rtag radiant">radiant</span>');
  return tags.join('');
}

export class CreatureCard {
  private el: HTMLDivElement;
  private current: CreatureData | null = null;
  private editing = false;

  constructor(private readonly deps: CardDeps) {
    this.el = document.createElement('div');
    this.el.id = 'creature-card';
    this.el.hidden = true;
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'Creature card');
    document.body.appendChild(this.el);
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) return this.close();
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'cc-close') this.close();
      else if (act === 'cc-rename') {
        this.editing = true;
        this.render();
        const inp = this.el.querySelector<HTMLInputElement>('input.cc-name');
        inp?.focus();
        inp?.select();
      } else if (act === 'cc-save') this.saveName();
      else if (act === 'cc-reset') {
        if (this.current) delete this.current.name;
        this.editing = false;
        this.after();
      }
    });
    this.el.addEventListener('keydown', (e) => {
      // Typing a name must not move Kestrel or press shortcuts.
      if ((e.target as HTMLElement).closest('input')) {
        e.stopPropagation();
        if (e.key === 'Enter') this.saveName();
        else if (e.key === 'Escape') {
          this.editing = false;
          this.render();
        }
      }
    });
    window.addEventListener(
      'keydown',
      (e) => {
        if (this.el.hidden || (e.target as HTMLElement)?.closest?.('input')) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.close();
        }
      },
      true,
    );
  }

  get open(): boolean {
    return !this.el.hidden;
  }

  show(c: CreatureData): void {
    this.current = c;
    this.editing = false;
    this.el.hidden = false;
    this.render();
  }

  close(): void {
    if (this.el.hidden) return;
    this.el.hidden = true;
    this.current = null;
  }

  private saveName(): void {
    const c = this.current;
    const inp = this.el.querySelector<HTMLInputElement>('input.cc-name');
    if (!c || !inp) return;
    const n = cleanName(inp.value);
    if (n && n !== suggestedName(c)) c.name = n;
    else delete c.name;
    this.editing = false;
    this.after();
  }

  private after(): void {
    if (this.current) this.deps.renamed(this.current);
    this.deps.persist();
    this.render();
  }

  /** Where it is, in words. */
  private where(c: CreatureData): string {
    const { save, layout } = this.deps;
    if (save.creatures.includes(c)) {
      const p = layout.pieces.find((q) => q.id === c.tank);
      return p ? `Lives in ${pieceCode(layout, p)}` : 'In a tank';
    }
    if (save.reserve?.includes(c)) return 'Resting in the reserve';
    if (save.nursery.includes(c)) return 'In a Hatchery cradle';
    if (save.gifts?.includes(c)) return 'A rare egg waiting at the Hatchery';
    if (save.jar?.keep === c || save.jar2?.keep === c) return 'Carried in the specimen jar';
    return '';
  }

  private render(): void {
    const c = this.current;
    if (!c) return;
    const { save } = this.deps;
    const sp = SPECIES[c.species];
    const t = traitsOf(c);
    const egg = c.stage === 'egg';
    const name = egg ? `${sp.name} egg` : creatureName(c);
    const ct = contentment(save, c);
    const bond = c.bond ?? 0;
    const entry = book(save)[kindKey(c.species, t.colour, t.pattern)];
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const nameRow = this.editing
      ? `<div class="cc-edit"><input class="cc-name" maxlength="16" value="${esc(creatureName(c))}" aria-label="Name" autocomplete="off" spellcheck="false"><button type="button" data-act="cc-save">Save</button>${
          c.name ? `<button type="button" data-act="cc-reset" title="Go back to ${esc(suggestedName(c))}">Reset</button>` : ''
        }</div>`
      : `<h3>${esc(name)} ${egg ? '' : '<button type="button" class="cc-pen" data-act="cc-rename" aria-label="Rename" title="Rename">✎</button>'}</h3>`;
    this.el.innerHTML = `<div class="cc-card${t.radiant ? ' radiant' : ''}${t.choir ? ' choir' : t.heirloom ? ' heirloom' : ''}">
      <button type="button" class="x" data-act="cc-close" aria-label="Close">✕</button>
      <div class="cc-portrait">${snapImg(c.species, t, '', egg ? 'egg' : c.stage === 'young' ? 'young' : 'grown', name)}</div>
      <div class="cc-info">
        ${nameRow}
        <p class="cc-species">${sp.name}${c.stage === 'young' ? ' · young' : egg ? '' : ' · grown'}</p>
        <p class="cc-traits">${COLOURS[c.species][t.colour]} · ${PATTERNS[c.species][t.pattern]} ${rarityTags(t, c.species)}</p>
        <p class="cc-line">${genText(t).replace(/^./, (m) => m.toUpperCase())}${c.parents ? ` · parents ${esc(c.parents[0])} and ${esc(c.parents[1])}` : ''}</p>
        <p class="cc-line">${this.where(c)}</p>
        ${egg ? '' : `<div class="cc-content"><div class="row"><span>${ct.label}</span><span>${pct(ct.value)}</span></div><div class="track"><i class="${ct.value >= 0.85 ? 'hi' : ct.value < 0.5 ? 'lo' : ''}" style="width:${pct(ct.value)}"></i></div>
          <ul class="notes">${ct.notes.map((n) => `<li class="${n.good ? 'good' : 'bad'}">${n.good ? '✓' : '·'} ${n.text}</li>`).join('')}</ul></div>
          ${bond >= KNOWS_KESTREL ? '<p class="cc-line good">Knows Kestrel: it swims to the glass when he comes by.</p>' : ''}`}
        ${entry ? `<p class="cc-line dim">In your book since ${entry.src === 'bred' ? 'it was first bred' : 'it was first kept from the wild'}.</p>` : ''}
      </div>
    </div>`;
  }
}
