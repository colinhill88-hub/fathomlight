import { BaseLayout, pieceCode } from '../game/base';
import { BREED_SECONDS, carePower, contentment, creatureName, creaturesIn, HATCH_CAP, HATCH_SECONDS, hatcheries, jarRoom, moveCreature, nurseryRoom, nurseryTroughCap, putInJar, pairsIn, RESERVE_CAP, SPECIES, SPECIES_ORDER, tankCapacity, tanks } from '../game/creatures';
import { CreatureData, SaveData, SpeciesId } from '../game/state';
import { COLOURS, eggOdds, genText, isRare, PATTERNS, RARE_COLOUR, traitsOf, traitText, WILD_PATTERNS } from '../game/traits';
import { book, kindKey } from '../game/collection';
import { snapImg } from './creatureSnap';
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
  /** Phase 20: open a creature's card. */
  openCard(c: CreatureData): void;
}

/** "about 1 in 6", "about 2 in 3", "certain". */
export function oddsText(p: number): string {
  if (p <= 0) return 'none';
  if (p >= 0.995) return 'certain';
  if (p >= 0.5) return `about ${Math.round(p * 100)}%`;
  return `about 1 in ${Math.max(2, Math.round(1 / p))}`;
}

export class HatchPanel {
  active = false;
  pieceId: number | null = null;
  private panel = document.getElementById('care-panel')!;
  private lastHtml = '';
  private clock = 0;
  /** Phase 21: when the pointer last moved over the panel (the live refresh waits, so a tap never lands on a replaced button). */
  private touchedAt = 0;
  /** Phase 21: the panel's tabs, and the planner's picks. */
  private tab: 'cradles' | 'reserve' | 'planner' = 'cradles';
  private planSpecies: SpeciesId | null = null;
  private planA: number | null = null;
  private planB: number | null = null;
  private resFilter: SpeciesId | 'all' = 'all';

  constructor(private readonly deps: HatchDeps) {
    for (const ev of ['pointermove', 'pointerdown'] as const) this.panel.addEventListener(ev, () => (this.touchedAt = performance.now()));
    this.panel.addEventListener('click', (e) => {
      if (!this.active) return;
      const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
      if (!el) return;
      const act = el.dataset.act!;
      if (act === 'close' || act === 'h-close') this.close();
      else if (act === 'h-tank') this.toTank(Number(el.dataset.id), Number(el.dataset.tank));
      else if (act === 'h-jar') this.toJar(Number(el.dataset.id));
      else if (act === 'h-feed') this.handFeed();
      else if (act === 'h-tab') {
        this.tab = el.dataset.id as typeof this.tab;
        this.render(true);
      } else if (act === 'h-warm') this.warm(Number(el.dataset.id));
      else if (act === 'h-card') {
        const c = this.find(Number(el.dataset.id));
        if (c) this.deps.openCard(c);
      } else if (act === 'p-species') {
        this.planSpecies = el.dataset.id as SpeciesId;
        this.planA = this.planB = null;
        this.render(true);
      } else if (act === 'p-pick') {
        const id = Number(el.dataset.id);
        if (this.planA === id) this.planA = null;
        else if (this.planB === id) this.planB = null;
        else if (this.planA === null) this.planA = id;
        else this.planB = id;
        this.render(true);
      } else if (act === 'p-pair') this.pairUp();
      else if (act === 'r-filter') {
        this.resFilter = el.dataset.id as SpeciesId | 'all';
        this.render(true);
      }
    });
    this.panel.addEventListener('change', (e) => {
      if (!this.active) return;
      const el = e.target as HTMLSelectElement;
      if (el.dataset.act === 'r-move' && el.value) {
        const why = moveCreature(this.deps.save, this.deps.layout, Number(el.dataset.id), el.value === 'reserve' ? 'reserve' : Number(el.value));
        if (why) this.deps.toast(why, 'warn');
        else this.deps.changed();
        this.deps.persist();
        this.render(true);
      }
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
    const c = save.nursery.find((q) => q.id === id) ?? save.gifts?.find((q) => q.id === id);
    if (!c) return null;
    save.nursery = save.nursery.filter((q) => q.id !== id);
    if (save.gifts) save.gifts = save.gifts.filter((q) => q.id !== id);
    return c;
  }

  private find(id: number): CreatureData | undefined {
    const { save } = this.deps;
    return [...save.nursery, ...(save.gifts ?? []), ...save.creatures, ...(save.reserve ?? [])].find((q) => q.id === id);
  }

  /** Phase 20: a rare egg from a reward goes into a warm cradle (where it hatches like a laid one). */
  private warm(id: number): void {
    const { save, layout } = this.deps;
    if (nurseryRoom(save, layout) <= 0) return this.deps.toast('Every cradle is taken: place some young in tanks first', 'warn');
    const c = save.gifts?.find((q) => q.id === id);
    if (!c) return;
    save.gifts = save.gifts!.filter((q) => q.id !== id);
    save.nursery.push(c);
    this.deps.toast(`The rare ${SPECIES[c.species].name.toLowerCase()} egg settles into a warm cradle.`);
    this.deps.persist();
    this.render(true);
  }

  /** Phase 21: move the planner's second parent into the first one's tank, so the two can pair. */
  private pairUp(): void {
    const { save, layout } = this.deps;
    const a = this.find(this.planA ?? -1);
    const b = this.find(this.planB ?? -1);
    if (!a || !b) return;
    // Bring a resting parent out of the reserve first, to the other's tank.
    let home = a.tank >= 0 ? a.tank : b.tank >= 0 ? b.tank : null;
    if (home === null) home = tanks(layout).find((t) => creaturesIn(save, t.id).length + 2 <= tankCapacity(layout, t.id, save))?.id ?? null;
    if (home === null) return this.deps.toast('No tank has room for the pair', 'warn');
    for (const c of [a, b]) {
      if (c.tank === home) continue;
      const why = moveCreature(save, layout, c.id, home);
      if (why) return this.deps.toast(why, 'warn');
    }
    const p = layout.pieces.find((q) => q.id === home);
    this.deps.toast(`${creatureName(a)} and ${creatureName(b)} share ${p ? pieceCode(layout, p) : 'a tank'} now. Keep them content and they'll lay.`, 'big');
    this.deps.changed();
    this.deps.persist();
    this.render(true);
  }

  private toTank(id: number, tankId: number): void {
    const { save, layout } = this.deps;
    if (creaturesIn(save, tankId).length >= tankCapacity(layout, tankId, save)) {
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

  /** Phase 21: the reserve, where creatures rest with no care needed. Filter by species; move to any tank. */
  private reserveTab(): string {
    const { save, layout } = this.deps;
    const all = save.reserve ?? [];
    const species = [...new Set(all.map((c) => c.species))];
    const list = all.filter((c) => this.resFilter === 'all' || c.species === this.resFilter).sort((a, b) => a.species.localeCompare(b.species) || creatureName(a).localeCompare(creatureName(b)));
    const dest = (c: CreatureData) =>
      `<select data-act="r-move" data-id="${c.id}" aria-label="Move ${creatureName(c)} to"><option value="">To a tank…</option>${tanks(layout)
        .map((t) => {
          const n = creaturesIn(save, t.id).length;
          const cap = tankCapacity(layout, t.id, save);
          return `<option value="${t.id}" ${n >= cap ? 'disabled' : ''}>${pieceCode(layout, t)} (${n}/${cap})</option>`;
        })
        .join('')}</select>`;
    const rows = list
      .map((c) => {
        const t = traitsOf(c);
        return `<div class="egg res">${snapImg(c.species, t, 'mini', c.stage === 'young' ? 'young' : 'grown')}<b>${creatureName(c)} <small>· ${SPECIES[c.species].name.toLowerCase()}${c.stage === 'young' ? ', young' : ''}</small></b><span class="traits${isRare(t) ? ' rare' : ''}">${traitText(c.species, t)} <small>· ${genText(t)}</small></span><div class="row">${dest(c)}<button type="button" data-act="h-card" data-id="${c.id}">Card</button></div></div>`;
      })
      .join('');
    const chips = species.length > 1 ? `<div class="filters"><span>Show:</span>${[['all', 'All'], ...species.map((sp) => [sp, SPECIES[sp].name])].map(([id, l]) => `<button type="button" data-act="r-filter" data-id="${id}" class="${this.resFilter === id ? 'on' : ''}">${l}</button>`).join('')}</div>` : '';
    return `<p class="note">The reserve is the Hatchery's cool holding bay. Creatures here rest safely: they need no food or cleaning, don't grow or make anything, and aren't on show. Move one in from any Habitat console, and back to any tank from here.</p>${chips}${
      rows ? `<div class="nest">${rows}</div>` : '<p class="note">Nobody is resting here.</p>'
    }`;
  }

  /**
   * Phase 21: the breeding planner. Pick a species, then two grown parents (from the tanks or
   * the reserve): it shows the chance of each colour and pattern, of radiance, and of a kind the
   * book is missing, with the care bonus their contentment earns. "Pair them" moves them together.
   */
  private plannerTab(): string {
    const { save } = this.deps;
    const pool = [...save.creatures, ...(save.reserve ?? [])].filter((c) => c.stage === 'grown');
    const species = SPECIES_ORDER.filter((sp) => pool.filter((c) => c.species === sp).length >= 2);
    if (!species.length) return '<p class="note">The planner needs two grown creatures of one species, in your tanks or the reserve.</p>';
    if (!this.planSpecies || !species.includes(this.planSpecies)) this.planSpecies = species[0];
    const sp = this.planSpecies;
    const mine = pool.filter((c) => c.species === sp);
    const a = mine.find((c) => c.id === this.planA);
    const b = mine.find((c) => c.id === this.planB);
    const pick = mine
      .map((c) => {
        const t = traitsOf(c);
        const on = c.id === this.planA ? 'A' : c.id === this.planB ? 'B' : '';
        return `<button type="button" class="pp${on ? ' on' : ''}" data-act="p-pick" data-id="${c.id}">${snapImg(c.species, t, 'mini', 'grown')}<span><b>${on ? `${on} · ` : ''}${creatureName(c)}</b><small>${COLOURS[sp][t.colour]}, ${PATTERNS[sp][t.pattern]}${t.radiant ? ' · radiant' : ''} · ${Math.round(contentment(save, c).value * 100)}% content${c.tank < 0 ? ' · resting' : ''}</small></span></button>`;
      })
      .join('');
    let result = '<p class="note">Pick two parents.</p>';
    if (a && b) {
      const care = carePower(save, a, b);
      const odds = eggOdds(traitsOf(a), traitsOf(b), care);
      const base = eggOdds(traitsOf(a), traitsOf(b), 1);
      const bk = book(save);
      let missing = 0;
      for (let col = 0; col < 4; col++) for (let pat = 0; pat < 3; pat++) if (!bk[kindKey(sp, col, pat)]) missing += odds.colour[col] * odds.pattern[pat];
      const row = (label: string, p: number, rare = false) => (p > 0.0005 ? `<li class="${rare ? 'rare' : ''}"><span>${label}</span><b>${oddsText(p)}</b></li>` : '');
      const together = a.tank >= 0 && a.tank === b.tank;
      result = `<div class="plan">
        <p class="care-bonus ${care >= 1.9 ? 'good' : care > 1.05 ? 'ok' : ''}">Care bonus ×${care.toFixed(1)}: ${care >= 1.9 ? 'a content, well-kept pair. Rare results are twice as likely.' : care > 1.05 ? 'happier parents would make rare results likelier still (up to ×2).' : 'just getting by. Feed, clean, decorate and hand-feed them to make rare results up to twice as likely.'}</p>
        <div class="odds"><div><h4>Colour</h4><ul>${COLOURS[sp].map((n, i) => row(n, odds.colour[i], i === RARE_COLOUR)).join('')}</ul></div>
        <div><h4>Glow pattern</h4><ul>${PATTERNS[sp].map((n, i) => row(n, odds.pattern[i], i >= WILD_PATTERNS)).join('')}</ul></div></div>
        <ul class="odds-sum">${row('Radiant', odds.radiant, true)}${missing > 0.0005 ? row('A kind your book is missing', missing, true) : '<li><span>Every kind they can make is already in your book</span></li>'}</ul>
        ${(a.traits?.radiant || b.traits?.radiant) ? '<p class="note">Radiance runs in this family.</p>' : ''}
        <p class="note dim">Without the care bonus: rare colour ${oddsText(base.colour[RARE_COLOUR])}, radiant ${oddsText(base.radiant)}.</p>
        ${together ? `<p class="note good">They share a tank already. If others of their kind are there too, any two may pair.</p>` : `<button type="button" class="big" data-act="p-pair">Pair them <small>move them into one tank</small></button>`}
      </div>`;
    }
    return `<div class="filters"><span>Species:</span>${species.map((x) => `<button type="button" data-act="p-species" data-id="${x}" class="${x === sp ? 'on' : ''}">${SPECIES[x].name}</button>`).join('')}</div>
      <div class="pick">${pick}</div>${result}`;
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
    const gifts = save.gifts ?? [];
    const rows = [...list, ...gifts]
      .map((c) => {
        const gift = gifts.includes(c);
        const sp = SPECIES[c.species];
        const t = traitsOf(c);
        const what = gift ? `Rare ${sp.name.toLowerCase()} egg` : c.stage === 'egg' ? `${sp.name} egg` : `${creatureName(c)} · young ${sp.name.toLowerCase()}`;
        const status = gift
          ? 'a reward: warm it in a cradle, or put it straight in a tank (it hatches there)'
          : c.stage === 'egg'
            ? powered
              ? `hatching in about ${Math.max(1, Math.ceil((1 - c.growth) * HATCH_SECONDS))} s`
              : 'cooling: no power'
            : c.sickness > 0.02
              ? 'sick with hunger: feed the young, then choose a tank'
              : `hatched: choose a tank · fed ${Math.round(c.fed * 100)}%`;
        const btns = tankList
          .map((tk) => {
            const n = creaturesIn(save, tk.id).length;
            const full = n >= tankCapacity(layout, tk.id, save);
            const code = pieceCode(layout, tk);
            const cap = tankCapacity(layout, tk.id, save);
            return `<button type="button" data-act="h-tank" data-id="${c.id}" data-tank="${tk.id}"${
              full ? ` disabled title="${code} is full (${n}/${cap})"` : ` title="Move it into ${code}"`
            }>${code} <small>${full ? 'full' : `${n}/${cap}`}</small></button>`;
          })
          .join('');
        const warm = gift ? `<button type="button" data-act="h-warm" data-id="${c.id}" ${nurseryRoom(save, layout) > 0 ? '' : 'disabled title="Every cradle is taken"'}>Warm in a cradle</button>` : '';
        const card = c.stage === 'egg' ? '' : `<button type="button" data-act="h-card" data-id="${c.id}">Card</button>`;
        return `<div class="egg${gift ? ' gift' : ''}">${c.stage === 'egg' ? '' : snapImg(c.species, t, 'mini', 'young')}<b>${what}</b><span class="traits${isRare(t) ? ' rare' : ''}">${traitText(c.species, t)} <small>· ${genText(t)}${c.parents ? ` · of ${c.parents[0]} and ${c.parents[1]}` : ''}</small></span><div class="note">${status}</div><div class="row">${warm}${btns}${jarBtn(c.id)}${card}</div></div>`;
      })
      .join('');
    // Which tanks have pairs laying, for a one-line overview.
    const laying: string[] = [];
    for (const tk of tankList)
      for (const sp of SPECIES_ORDER) {
        const n = pairsIn(save, tk.id, sp);
        if (n) laying.push(`${n} ${SPECIES[sp].name.toLowerCase()} pair${n > 1 ? 's' : ''} in ${pieceCode(layout, tk)}`);
      }
    const tabBtn = (id: typeof this.tab, label: string) => `<button type="button" data-act="h-tab" data-id="${id}" class="tab${this.tab === id ? ' on' : ''}">${label}</button>`;
    const head = `
      <div class="care-head"><b>${code} · Hatchery</b><span>${list.length}/${cap} · ${powered ? 'warm' : 'no power'}</span>
        <button type="button" class="x" data-act="h-close" aria-label="Close">✕</button></div>
      <div class="tabs h-tabs">${tabBtn('cradles', `Cradles${gifts.length ? ` · ${gifts.length} rare egg${gifts.length > 1 ? 's' : ''}` : ''}`)}${tabBtn('reserve', `Reserve ${save.reserve?.length ?? 0}/${RESERVE_CAP}`)}${tabBtn('planner', 'Planner')}</div>`;
    if (this.tab !== 'cradles') {
      const html = head + (this.tab === 'reserve' ? this.reserveTab() : this.plannerTab());
      if (!force && performance.now() - this.touchedAt < 1500) return;
    if (force || html !== this.lastHtml) {
        this.lastHtml = html;
        this.panel.innerHTML = html;
      }
      return;
    }
    const html = `${head}
      <p class="status">${
        laying.length
          ? `Laying: ${laying.join(', ')}. A pair lays about one egg every ${Math.round(BREED_SECONDS / 60)} minutes.`
          : 'No pairs laying. Two happy, grown creatures of one species in a tank make a breeding pair.'
      }</p>
      ${this.troughRow()}
      ${list.length || gifts.length ? `<div class="nest">${rows}</div>` : '<p class="note">The cradles are empty.</p>'}
      <p class="note">Young take their colour and glow pattern from one parent or the other. Now and then one is born different: a rare colour, or radiant (a brighter glow that makes a little more, and lights more of a dark passage).</p>`;
    if (!force && performance.now() - this.touchedAt < 1500) return;
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
