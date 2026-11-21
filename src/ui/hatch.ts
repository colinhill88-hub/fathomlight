import { BaseLayout, pieceCode } from '../game/base';
import { BREED_SECONDS, creaturesIn, HATCH_CAP, HATCH_SECONDS, hatcheries, jarRoom, nurseryTroughCap, putInJar, pairsIn, SPECIES, SPECIES_ORDER, tankCapacity, tanks } from '../game/creatures';
import { CreatureData, SaveData } from '../game/state';
import { genText, isRare, traitsOf, traitText } from '../game/traits';
import { MASH_PER_FIBRE } from '../game/factory';

/**
 * The Hatchery panel (milestone 9). It opens indoors, at the Hatchery's
 * console, in the same frame as the care panel (on the right; the camera
 * frames the cradles on the left).
 *
 * Eggs laid by happy pairs in the base's tanks incubate here. When one
 * hatches, the young waits in its cradle (it doesn't get hungry) until you
 * choose a tank for it, or take it in the jar. Eggs can go to a tank too:
 * they hatch there as usual.
 *
 * Keyboard: Esc closes.
 */

export interface HatchDeps {
  save: SaveData;
  layout: BaseLayout;
  toast(text: string, kind?: 'item' | 'scan' | 'big' | 'warn'): void;
  persist(): void;
  /** Creatures changed (one moved into a tank). */
  changed(): void;
}

export class HatchPanel {
  active = false;
  pieceId: number | null = null;
  private panel = document.getElementById('care-panel')!;
  private lastHtml = '';
  private clock = 0;

  constructor(private readonly deps: HatchDeps) {
    this.panel.addEventListener('click', (e) => {
      if (!this.active) return;
      const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
      if (!el) return;
      const act = el.dataset.act!;
      if (act === 'close' || act === 'h-close') this.close();
      else if (act === 'h-tank') this.toTank(Number(el.dataset.id), Number(el.dataset.tank));
      else if (act === 'h-jar') this.toJar(Number(el.dataset.id));
      else if (act === 'h-feed') this.handFeed();
    });
    window.addEventListener('keydown', (e) => {
      if (!this.active || e.repeat) return;
      if (e.key === 'Escape') {
        this.close();
        e.preventDefault();
      }
    });
  }

  /** After milestone 12: a hand feed for the young: 1 kelp fibre, pressed into the trough as mash. */
  private handFeed(): void {
    const { save, layout } = this.deps;
    const cap = nurseryTroughCap(layout);
    if (cap <= 0) return this.deps.toast('The trough needs a powered Hatchery', 'warn');
    if (troughFull(save.nurseryMash ?? 0, cap)) return this.deps.toast('The trough is full: the young have plenty to eat', 'warn');
    if (save.bag.fibre + save.stored.fibre < 1) return this.deps.toast('Feeding the young takes 1 kelp fibre', 'warn');
    if (save.bag.fibre > 0) save.bag.fibre--;
    else save.stored.fibre--;
    save.nurseryMash = Math.min(cap, (save.nurseryMash ?? 0) + MASH_PER_FIBRE);
    this.deps.toast('The young crowd round the trough.');
    this.deps.persist();
    this.render(true);
  }

  open(pieceId: number): void {
    this.active = true;
    this.pieceId = pieceId;
    document.body.classList.add('caring');
    this.render(true);
  }

  close(): void {
    if (!this.active) return;
    this.active = false;
    this.pieceId = null;
    document.body.classList.remove('caring');
    this.deps.persist();
  }

  update(dt: number): void {
    if (!this.active) return;
    this.clock += dt;
    if (this.clock > 0.3) {
      this.clock = 0;
      this.render(false);
    }
  }

  private take(id: number): CreatureData | null {
    const { save } = this.deps;
    const c = save.nursery.find((q) => q.id === id);
    if (!c) return null;
    save.nursery = save.nursery.filter((q) => q.id !== id);
    return c;
  }

  private toTank(id: number, tankId: number): void {
    const { save, layout } = this.deps;
    if (creaturesIn(save, tankId).length >= tankCapacity(layout, tankId)) {
      this.deps.toast('That tank is full', 'warn');
      return;
    }
    const c = this.take(id);
    if (!c) return;
    c.tank = tankId;
    c.comfort = 0.5;
    save.creatures.push(c);
    const p = layout.pieces.find((q) => q.id === tankId)!;
    const sp = SPECIES[c.species];
    this.deps.toast(`${c.stage === 'egg' ? `The ${sp.name.toLowerCase()} egg` : `The young ${sp.name.toLowerCase()}`} goes into ${pieceCode(layout, p)}.`, 'big');
    this.deps.changed();
    this.deps.persist();
    this.render(true);
  }

  private toJar(id: number): void {
    const { save } = this.deps;
    if (!save.kit.jar) {
      this.deps.toast('You have no specimen jar to carry it in. One was lost by the old anchor in the coral garden.', 'warn');
      return;
    }
    if (!jarRoom(save)) {
      this.deps.toast(save.gear.includes('satchel') ? 'The specimen jar and satchel are both full' : 'The specimen jar is already full', 'warn');
      return;
    }
    const c = this.take(id);
    if (!c) return;
    putInJar(save, { species: c.species, stage: c.stage, keep: c, traits: c.traits });
    this.deps.toast(`${SPECIES[c.species].name} ${c.stage === 'egg' ? 'egg' : 'young'} in the specimen jar.`);
    this.deps.persist();
    this.render(true);
  }

  /**
   * The nursery trough and its hand-feed button (Phase 12 polish). A full trough
   * disables the button and says so, rather than leaving a live-looking button
   * that only answers with a warning.
   */
  private troughRow(): string {
    const { save, layout } = this.deps;
    const cap = nurseryTroughCap(layout);
    const mash = save.nurseryMash ?? 0;
    const fibre = save.bag.fibre + save.stored.fibre;
    const full = cap > 0 && troughFull(mash, cap);
    const state = cap <= 0 ? 'off' : full ? 'full' : fibre < 1 ? 'empty' : 'ready';
    const button = {
      off: ['No power', 'The trough fills only at a powered Hatchery.'],
      full: ['Trough full', `The young have plenty of mash. Feeding opens again once the trough is below ${cap - 1} L.`],
      empty: ['Need 1 fibre', 'Hand feeding takes 1 kelp fibre from your bag or storage.'],
      ready: ['Feed <small>1 fibre</small>', `Press 1 kelp fibre into ${MASH_PER_FIBRE} L of mash for the young.`],
    }[state];
    const note = full
      ? `No feeding needed: the young eat from it while they wait. A hand feed adds ${MASH_PER_FIBRE} L, so it opens again below ${cap - 1} L.`
      : 'The young get hungry while they wait. A feed pipe from an auto feeder keeps it topped up.';
    return `<div class="trough${full ? ' full' : ''}"><div><b>Trough</b> <span class="lvl">${Math.round(mash)}/${cap} L of mash</span><div class="note">${note}</div></div><button type="button" class="feed" data-act="h-feed" title="${button[1]}" aria-label="${button[0].replace(/<[^>]+>/g, '')}: ${button[1]}"${state === 'ready' ? '' : ' disabled'}>${button[0]}</button></div>`;
  }

  private render(force: boolean): void {
    if (!this.active || this.pieceId === null) return;
    const { save, layout } = this.deps;
    const piece = layout.pieces.find((p) => p.id === this.pieceId);
    const code = piece ? pieceCode(layout, piece) : 'Hatchery';
    const cap = HATCH_CAP * Math.max(1, hatcheries(layout).length);
    const powered = piece ? layout.powered.has(piece.id) : false;
    const list = save.nursery;
    const tankList = tanks(layout);
    const jarBlock = !save.kit.jar ? 'No jar' : !jarRoom(save) ? 'Jar full' : '';
    const jarBtn = (id: number) =>
      jarBlock
        ? `<button type="button" data-act="h-jar" data-id="${id}" disabled title="${jarBlock === 'No jar' ? 'You have no specimen jar yet' : save.gear.includes('satchel') ? 'The jar and the satchel both hold a creature' : 'The specimen jar already holds a creature'}">${jarBlock}</button>`
        : `<button type="button" data-act="h-jar" data-id="${id}" title="Carry it in the specimen jar">To jar</button>`;
    const rows = list
      .map((c) => {
        const sp = SPECIES[c.species];
        const t = traitsOf(c);
        const what = c.stage === 'egg' ? `${sp.name} egg` : `Young ${sp.name.toLowerCase()}`;
        const status =
          c.stage === 'egg'
            ? powered
              ? `hatching in about ${Math.max(1, Math.ceil((1 - c.growth) * HATCH_SECONDS))} s`
              : 'cooling: no power'
            : c.sickness > 0.02
              ? 'sick with hunger: feed the young, then choose a tank'
              : `hatched: choose a tank · fed ${Math.round(c.fed * 100)}%`;
        const btns = tankList
          .map((tk) => {
            const n = creaturesIn(save, tk.id).length;
            const full = n >= tankCapacity(layout, tk.id);
            const code = pieceCode(layout, tk);
            const cap = tankCapacity(layout, tk.id);
            return `<button type="button" data-act="h-tank" data-id="${c.id}" data-tank="${tk.id}"${
              full ? ` disabled title="${code} is full (${n}/${cap})"` : ` title="Move it into ${code}"`
            }>${code} <small>${full ? 'full' : `${n}/${cap}`}</small></button>`;
          })
          .join('');
        return `<div class="egg"><b>${what}</b><span class="traits${isRare(t) ? ' rare' : ''}">${traitText(c.species, t)} <small>· ${genText(t)}</small></span><div class="note">${status}</div><div class="row">${btns}${jarBtn(c.id)}</div></div>`;
      })
      .join('');
    // Which tanks have pairs laying, for a one-line overview.
    const laying: string[] = [];
    for (const tk of tankList)
      for (const sp of SPECIES_ORDER) {
        const n = pairsIn(save, tk.id, sp);
        if (n) laying.push(`${n} ${SPECIES[sp].name.toLowerCase()} pair${n > 1 ? 's' : ''} in ${pieceCode(layout, tk)}`);
      }
    const html = `
      <div class="care-head"><b>${code} · Hatchery</b><span>${list.length}/${cap} · ${powered ? 'warm' : 'no power'}</span>
        <button type="button" class="x" data-act="h-close" aria-label="Close">✕</button></div>
      <p class="status">${
        laying.length
          ? `Laying: ${laying.join(', ')}. A pair lays about one egg every ${Math.round(BREED_SECONDS / 60)} minutes.`
          : 'No pairs laying. Two happy, grown creatures of one species in a tank make a breeding pair.'
      }</p>
      ${this.troughRow()}
      ${list.length ? `<div class="nest">${rows}</div>` : '<p class="note">The cradles are empty.</p>'}
      <p class="note">Young take their colour and glow pattern from one parent or the other. Now and then one is born different: a rare colour, or radiant (a brighter glow that makes a little more, and lights more of a dark passage).</p>`;
    if (force || html !== this.lastHtml) {
      this.lastHtml = html;
      this.panel.innerHTML = html;
    }
  }
}

/** Hand feeding would add a whole fibre's mash; within a litre of the brim counts as full. */
function troughFull(mash: number, cap: number): boolean {
  return mash >= cap - 1;
}
