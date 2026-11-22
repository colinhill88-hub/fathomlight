import { BaseLayout, pieceCode } from '../game/base';
import { isKey } from '../controls/bindings';
import {
  CLEAN_AMOUNT,
  comfortTarget,
  creaturesIn,
  FEED_AMOUNT,
  filteredTanks,
  payCost,
  PLANT_ORDER,
  PLANTS,
  SPECIES,
  statusLine,
  makeRate,
  tankDataFor,
  tankNumber,
  tankCapacity,
  breedNote,
  creatureName,
  jarRoom,
  putInJar,
  careForAll,
  contentment,
  decorSlots,
  handFeed,
  handFeedWait,
  isDisplay,
  moveCreature,
  nextUpgrade,
  reserveOpen,
  RESERVE_CAP,
  tanks,
  upgradeTank,
  worstNeed,
} from '../game/creatures';
import { DECOR, DECOR_ORDER, placeDecor, removeDecor } from '../game/collection';
import type { DecorId } from '../game/state';
import { genText, isRare, isUncommon, rarityTier, traitsOf, traitText } from '../game/traits';
import { CreatureData, MATERIALS, SaveData } from '../game/state';
import { creatureMilestone } from '../game/discovery';
import { TRAY_CAP, trayCount, TROUGH_CAP, whorlMult } from '../game/factory';
import { MATERIAL_ORDER, TankData } from '../game/state';

/** The output tray (milestone 5 part 2): what is waiting, and how it leaves. */
function trayLine(save: SaveData, td: TankData, living: boolean): string {
  const n = trayCount(td);
  const what = MATERIAL_ORDER.filter((k) => td.out?.[k])
    .map((k) => `${td.out![k]} ${MATERIALS[k].name.toLowerCase()}`)
    .join(', ');
  const belt = save.lines.some((l) => l.kind === 'belt' && save.tankData[String(l.from)] === td);
  const good = n < TRAY_CAP;
  return `<li class="${good ? 'good' : 'bad'}">${good ? '✓' : '✗'} Output tray ${n}/${TRAY_CAP}${what ? ` (${what})` : ''}${
    belt ? ': a conveyor carries it away' : n ? (living ? ' · Collect at the amber tray' : ': stop by the tank and tap Collect to take it, or run a conveyor from the tank') : ''
  }${good ? '' : '. Full: making is paused'}</li>`;
}

/**
 * Tank care (milestone 4), laid out like the "Tank care on phone" concept:
 * the camera zooms in on the tank, and a panel on the right shows the
 * creatures, their three needs and what to do.
 *
 * Touch: swim up to a creature tank and tap Tend (top right). Tap a name to
 * pick a creature. Feed (1 kelp fibre: kelp flakes for the whole tank),
 * Clean tank (scrub the glass and stir the filter bed), plant a favourite
 * plant, take a creature out into the jar or release it.
 * Keyboard: T opens and closes, Esc closes, Tab picks the next creature,
 * F feeds, C cleans.
 */

export interface CareDeps {
  save: SaveData;
  layout: BaseLayout;
  livingBases: boolean;
  deposit(tankId: number): void;
  toast(text: string, kind?: 'item' | 'scan' | 'big' | 'warn'): void;
  refreshInventory(): void;
  persist(): void;
  /** Visual effects in the tank. */
  fedFx(tankId: number): void;
  scrubFx(tankId: number): void;
  /** Creatures changed (added, removed). */
  changed(): void;
  /** A creature was let go into the wild. */
  released(c: CreatureData): void;
  highlight(id: number | null): void;
  /** Phase 20: open a creature's card. */
  openCard(c: CreatureData): void;
  /** Phase 21: a hand feed (bubbles and a nibble at the glass), and a tank upgraded or redecorated. */
  handFedFx(tankId: number, id: number): void;
  tankChanged(): void;
}

/** Phase 21: the Habitat console's list filter. */
type Filter = 'all' | 'rare' | 'care' | string;
type Sort = 'name' | 'species' | 'content' | 'rare';

/** "Makes 0.36 kelp fibre/min (+30% shoal, +10% reef, ×2 whorl)". */
function makeLine(save: SaveData, layout: BaseLayout, c: CreatureData): string {
  const r = makeRate(save, layout, c);
  if (r.perMin <= 0) return 'Makes nothing while unhappy.';
  const sp = SPECIES[c.species];
  const parts = [r.radiant > 1 ? `+${Math.round((r.radiant - 1) * 100)}% radiant` : '', r.shoal > 0 ? `+${Math.round(r.shoal * 100)}% shoal` : '', r.clean > 0 ? `+${Math.round(r.clean * 100)}% cleaned` : '', r.reef > 0 ? `+${Math.round(r.reef * 100)}% reef` : '', r.whorl > 1 ? `×${r.whorl} whorl` : '']
    .filter(Boolean)
    .join(', ');
  return `Makes ${r.perMin.toFixed(2)} ${sp.makes === 'fibre' ? 'kelp fibre' : sp.makes}/min${parts ? ` (${parts})` : ''}. Happy tank-mates and other thriving tanks raise it.`;
}

export class CareMode {
  active = false;
  tankId: number | null = null;
  selected: number | null = null;
  available: number | null = null;

  private btn = document.getElementById('tend-btn') as HTMLButtonElement;
  private panel = document.getElementById('care-panel')!;
  private releaseArmed = 0;
  private cleanAt = 0;
  private lastHtml = '';
  private clock = 0;
  /** Phase 21: when the pointer last moved over the panel (the live refresh waits, so a tap never lands on a replaced button). */
  private touchedAt = 0;
  private filter: Filter = 'all';
  private sort: Sort = 'species';

  constructor(private readonly deps: CareDeps) {
    if (deps.livingBases) {
      this.panel.setAttribute('aria-label', 'Habitat Console');
      this.panel.classList.add('habitat-console');
    }
    this.btn.addEventListener('click', () => this.toggle());
    this.panel.addEventListener('pointerdown', (e) => e.stopPropagation());
    for (const ev of ['pointermove', 'pointerdown'] as const) this.panel.addEventListener(ev, () => (this.touchedAt = performance.now()));
    this.panel.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
      if (!el) return;
      const act = el.dataset.act!;
      if (act === 'pick') this.select(Number(el.dataset.id));
      else if (act === 'feed') this.feed();
      else if (act === 'clean') this.clean();
      else if (act === 'plant') this.plant(el.dataset.id as keyof typeof PLANTS, 1);
      else if (act === 'plant2') this.plant(el.dataset.id as keyof typeof PLANTS, 2);
      else if (act === 'take') this.takeOut();
      else if (act === 'deposit' && this.tankId !== null) {
        this.deps.deposit(this.tankId);
        this.selected ??= this.here()[0]?.id ?? null;
        this.render(true);
      }
      else if (act === 'release') this.release();
      else if (act === 'close') this.close();
      else if (act === 'hand') this.feedByHand();
      else if (act === 'card') {
        const c = this.here().find((x) => x.id === this.selected);
        if (c) this.deps.openCard(c);
      } else if (act === 'care-all') this.careAll();
      else if (act === 'upgrade') this.upgrade();
      else if (act === 'decor') this.decorate(el.dataset.id as DecorId);
      else if (act === 'undecor') this.undecorate(Number(el.dataset.id));
      else if (act === 'filter') {
        this.filter = el.dataset.id ?? 'all';
        this.render(true);
      }
    });
    this.panel.addEventListener('change', (e) => {
      if (!this.active) return;
      const el = e.target as HTMLSelectElement;
      if (el.dataset.act === 'move' && el.value) this.move(el.value === 'reserve' ? 'reserve' : Number(el.value));
      else if (el.dataset.act === 'sort') {
        this.sort = el.value as Sort;
        this.render(true);
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.repeat || (e.target as HTMLElement)?.closest?.('input, select')) return;
      if (document.getElementById('creature-card')?.hidden === false) return;
      const k = e.key.toLowerCase();
      if (isKey('tend', k)) this.toggle();
      else if (!this.active) return;
      else if (k === 'escape') this.close();
      else if (k === 'tab' && !this.deps.livingBases) this.cycle();
      else if (isKey('feed', k)) this.feed();
      else if (isKey('clean', k)) this.clean();
      else if (isKey('handFeed', k)) this.feedByHand();
      else if (isKey('careAll', k)) this.careAll();
      else return;
      e.preventDefault();
    });
  }

  /** Show the Tend button while the diver is at a tank (its id), or hide it (null). */
  setAvailable(tankId: number | null): void {
    if (tankId === this.available) return;
    this.available = tankId;
    this.btn.classList.toggle('show', tankId !== null);
    if (tankId === null && this.active) this.close();
  }

  toggle(): void {
    if (this.active) this.close();
    else if (this.available !== null) this.open(this.available);
  }

  open(tankId: number): void {
    this.active = true;
    this.tankId = tankId;
    const first = creaturesIn(this.deps.save, tankId)[0];
    this.selected = first?.id ?? null;
    this.releaseArmed = 0;
    document.body.classList.add('caring');
    this.btn.setAttribute('aria-pressed', 'true');
    this.render(true);
    if (this.deps.livingBases) this.panel.querySelector<HTMLButtonElement>('[data-act="close"]')?.focus({ preventScroll: true });
  }

  close(): void {
    if (!this.active) return;
    this.active = false;
    this.tankId = null;
    this.deps.highlight(null);
    document.body.classList.remove('caring');
    this.btn.setAttribute('aria-pressed', 'false');
    this.deps.persist();
  }

  /** The tank's painted stencil code (TANK 2, GT-1), as on its room's sign. */
  private code(): string {
    const p = this.deps.layout.pieces.find((q) => q.id === this.tankId);
    return p ? pieceCode(this.deps.layout, p) : `Tank ${tankNumber(this.deps.layout, this.tankId!)}`;
  }

  private here(): CreatureData[] {
    return this.tankId === null ? [] : creaturesIn(this.deps.save, this.tankId);
  }

  private select(id: number): void {
    this.selected = id;
    this.releaseArmed = 0;
    this.render(true);
  }

  private cycle(): void {
    const list = this.here();
    if (!list.length) return;
    const i = list.findIndex((c) => c.id === this.selected);
    this.select(list[(i + 1) % list.length].id);
  }

  private feed(): void {
    const { save } = this.deps;
    const eaters = this.here().filter((c) => c.stage !== 'egg');
    if (!eaters.length) {
      this.deps.toast(this.here().length ? 'Eggs do not eat yet' : 'Nobody in this tank to feed', 'warn');
      return;
    }
    if (!payCost(save, { fibre: 1 })) {
      this.deps.toast('Feeding needs 1 kelp fibre (ground into flakes). Cut some from a kelp holdfast.', 'warn');
      return;
    }
    for (const c of eaters) c.fed = Math.min(1, c.fed + FEED_AMOUNT);
    this.deps.fedFx(this.tankId!);
    this.deps.refreshInventory();
    this.deps.toast('Kelp flakes in: −1 kelp fibre');
    this.deps.persist();
    this.render(true);
  }

  private clean(): void {
    if (performance.now() - this.cleanAt < 1500 || this.tankId === null) return;
    this.cleanAt = performance.now();
    const td = tankDataFor(this.deps.save, this.tankId);
    td.water = Math.min(1, td.water + CLEAN_AMOUNT);
    this.deps.scrubFx(this.tankId);
    this.deps.toast('Glass scrubbed and filter bed stirred');
    if (this.deps.livingBases) this.deps.persist();
    this.render(true);
  }

  private plant(id: keyof typeof PLANTS, slot: 1 | 2): void {
    const { save } = this.deps;
    if (this.tankId === null) return;
    const td = tankDataFor(save, this.tankId);
    const p = PLANTS[id];
    if ((slot === 1 ? td.plant : td.plant2) === id) return;
    if (!save.scans.includes(p.scan)) {
      this.deps.toast(`Scan ${p.name.toLowerCase()} on the reef first, to know how to grow it`, 'warn');
      return;
    }
    // Milestone 9: a cutting from a Kelp farm plants it for free.
    const cut = (save.cuttings[id] ?? 0) > 0;
    if (cut) save.cuttings[id] = (save.cuttings[id] ?? 0) - 1;
    else if (!payCost(save, p.cost)) {
      const [k, n] = Object.entries(p.cost)[0] as [keyof typeof MATERIALS, number];
      this.deps.toast(`Planting ${p.name.toLowerCase()} needs ${n} ${MATERIALS[k].name.toLowerCase()} (or a cutting from a Kelp farm)`, 'warn');
      return;
    }
    if (slot === 1) td.plant = id;
    else td.plant2 = id;
    this.deps.changed();
    this.deps.refreshInventory();
    this.deps.toast(`Planted ${p.name.toLowerCase()}`);
    this.deps.persist();
    this.render(true);
  }

  /** Phase 21: a treat from Kestrel's hand at the glass (free; once a minute per creature). It builds a bond. */
  private feedByHand(): void {
    const c = this.here().find((x) => x.id === this.selected);
    if (!c) return;
    const why = handFeed(this.deps.save, c);
    if (why) return this.deps.toast(why, 'warn');
    this.deps.handFedFx(this.tankId!, c.id);
    const b = c.bond ?? 0;
    this.deps.toast(b >= 0.5 ? `${creatureName(c)} takes the treat from your glove and nuzzles it` : `${creatureName(c)} darts in for the treat`);
    this.deps.persist();
    this.render(true);
  }

  /** Phase 21: feed and scrub every tank at once (1 kelp fibre per hungry tank). */
  private careAll(): void {
    const { save, layout } = this.deps;
    const r = careForAll(save, layout);
    for (const t of tanks(layout)) {
      this.deps.fedFx(t.id);
    }
    this.deps.refreshInventory();
    if (!r.fed && !r.cleaned) this.deps.toast(r.short ? 'Not enough kelp fibre to feed anyone' : 'Every tank is fed and clean already', r.short ? 'warn' : 'item');
    else this.deps.toast(`Cared for all: fed ${r.fed} tank${r.fed === 1 ? '' : 's'}, scrubbed ${r.cleaned}${r.short ? `. ${r.short} still hungry: no kelp fibre left` : ''}`, r.short ? 'warn' : 'item');
    this.deps.persist();
    this.render(true);
  }

  private move(to: number | 'reserve'): void {
    const { save, layout } = this.deps;
    const c = this.here().find((x) => x.id === this.selected);
    if (!c) return;
    const why = moveCreature(save, layout, c.id, to);
    if (why) {
      this.deps.toast(why, 'warn');
      this.render(true);
      return;
    }
    const p = layout.pieces.find((q) => q.id === to);
    this.deps.toast(`${creatureName(c)} ${to === 'reserve' ? 'rests in the reserve' : `moves to ${p ? pieceCode(layout, p) : 'another tank'}`}`);
    this.afterRemove();
  }

  private upgrade(): void {
    const { save, layout } = this.deps;
    if (this.tankId === null) return;
    const why = upgradeTank(save, layout, this.tankId);
    if (why) return this.deps.toast(why, 'warn');
    const cap = tankCapacity(layout, this.tankId, save);
    this.deps.toast(isDisplay(save, layout, this.tankId) ? `The display aquarium is ready: ${cap} creatures and six decorations` : `Tank extended: it holds ${cap} now`, 'big');
    this.deps.tankChanged();
    this.deps.persist();
    this.render(true);
  }

  private decorate(d: DecorId): void {
    const { save, layout } = this.deps;
    if (this.tankId === null) return;
    const why = placeDecor(save, this.tankId, d, decorSlots(save, layout, this.tankId));
    if (why) return this.deps.toast(why, 'warn');
    this.deps.toast(`${DECOR[d].name} placed. Creatures love something to explore.`);
    this.deps.tankChanged();
    this.deps.persist();
    this.render(true);
  }

  private undecorate(i: number): void {
    if (this.tankId === null || !removeDecor(this.deps.save, this.tankId, i)) return;
    this.deps.tankChanged();
    this.deps.persist();
    this.render(true);
  }

  /** The creatures shown as tabs: filtered and sorted (Phase 21, for big tanks). */
  private shown(list: CreatureData[]): CreatureData[] {
    const { save } = this.deps;
    const rare = (c: CreatureData) => isUncommon(traitsOf(c));
    const tierRank = { common: 0, uncommon: 1, rare: 2, legendary: 3 } as const;
    const needs = (c: CreatureData) => c.stage !== 'egg' && (c.sickness > 0 || worstNeed(save, c).value < 0.5);
    let out = list.filter((c) =>
      this.filter === 'all' ? true : this.filter === 'rare' ? rare(c) : this.filter === 'care' ? needs(c) : c.species === this.filter,
    );
    const key: Record<Sort, (c: CreatureData) => string | number> = {
      name: (c) => creatureName(c).toLowerCase(),
      species: (c) => `${c.species}:${creatureName(c).toLowerCase()}`,
      content: (c) => contentment(save, c).value,
      rare: (c) => -(tierRank[rarityTier(traitsOf(c))] * 2 + Number(!!traitsOf(c).radiant)),
    };
    const k = key[this.sort];
    return [...out].sort((a, b) => (k(a) < k(b) ? -1 : k(a) > k(b) ? 1 : 0));
  }

  /** Phase 21: the selected creature's quick actions: hand-feed, card, move. */
  private creatureActs(c: CreatureData): string {
    const { save, layout } = this.deps;
    const wait = handFeedWait(save, c);
    const hand = c.stage === 'egg' ? '' : `<button type="button" data-act="hand" ${wait ? `disabled title="Still nibbling the last treat"` : 'title="A free treat from your glove: it gets to know Kestrel"'}>${wait ? `Treat in ${wait} s` : 'Hand-feed'}</button>`;
    const opts = tanks(layout)
      .filter((t) => t.id !== this.tankId)
      .map((t) => {
        const n = creaturesIn(save, t.id).length;
        const cap = tankCapacity(layout, t.id, save);
        return `<option value="${t.id}" ${n >= cap ? 'disabled' : ''}>${pieceCode(layout, t)} (${n}/${cap})</option>`;
      })
      .join('');
    const res = reserveOpen(layout) ? `<option value="reserve" ${(save.reserve?.length ?? 0) >= RESERVE_CAP ? 'disabled' : ''}>Reserve (${save.reserve?.length ?? 0}/${RESERVE_CAP})</option>` : '';
    const move = opts || res ? `<select data-act="move" aria-label="Move to"><option value="">Move to…</option>${opts}${res}</select>` : '';
    return `<div class="quick">${hand}<button type="button" data-act="card">Card</button>${move}</div>`;
  }

  /** Phase 21: decorations in this tank (tap one to take it out) and ones to place. */
  private decorRow(): string {
    const { save, layout } = this.deps;
    if (this.tankId === null) return '';
    const placed = save.tankData[String(this.tankId)]?.decor ?? [];
    const slots = decorSlots(save, layout, this.tankId);
    const owned = DECOR_ORDER.filter((d) => (save.decor?.[d] ?? 0) > 0);
    if (!placed.length && !owned.length) return '';
    const full = placed.length >= slots;
    return `<div class="decor"><span>Decor ${placed.length}/${slots}:</span>${placed
      .map((d, i) => `<button type="button" class="on" data-act="undecor" data-id="${i}" title="Take it out">${DECOR[d].name}<small>take out</small></button>`)
      .join('')}${owned
      .map((d) => `<button type="button" data-act="decor" data-id="${d}" ${full ? 'disabled' : ''} title="${DECOR[d].line}">${DECOR[d].name}<small>${full ? 'no room' : `place (${save.decor![d]})`}</small></button>`)
      .join('')}</div>`;
  }

  /** Phase 21: the tank's upgrade button (a Workshop kit), when there is one to fit. */
  private upgradeButton(): string {
    const { save, layout } = this.deps;
    if (this.tankId === null) return '';
    const up = nextUpgrade(save, layout, this.tankId);
    if ('blocked' in up) return '';
    const have = (up.kit === 'tankkit' ? save.tankKits : save.displayKits) ?? 0;
    const known = save.blueprints.includes(up.kit === 'tankkit' ? 'tankkit' : 'display');
    if (!known && !have) return '';
    const code = up.kit === 'tankkit' ? 'TX-1' : 'DR-1';
    return `<button type="button" data-act="upgrade" ${have ? `title="Fit a ${code} kit: room for ${up.to}"` : `disabled title="Build a ${code} kit in the Workshop"`}>${up.kit === 'tankkit' ? 'Extend' : 'Make display aquarium'} <small>${have ? `${code} → ${up.to}` : `needs ${code}`}</small></button>`;
  }

  private takeOut(): void {
    const { save } = this.deps;
    const c = this.here().find((x) => x.id === this.selected);
    if (!c) return;
    if (!save.kit.jar) {
      this.deps.toast('You have no specimen jar to carry it in. One was lost by the old anchor in the coral garden.', 'warn');
      return;
    }
    if (!jarRoom(save)) {
      this.deps.toast(save.gear.includes('satchel') ? 'The specimen jar and satchel are both full' : 'The specimen jar is already full', 'warn');
      return;
    }
    save.creatures = save.creatures.filter((x) => x.id !== c.id);
    putInJar(save, { species: c.species, stage: c.stage, keep: c, traits: c.traits });
    const ability = c.stage === 'grown' ? creatureMilestone(save, c.species) : '';
    this.deps.toast(`${creatureName(c)} the ${SPECIES[c.species].name.toLowerCase()} moved into the specimen jar. ${ability || 'Put it in another tank from inside the base.'}`, 'big');
    this.afterRemove();
  }

  /** "To jar", or why not: one shared rule for room in the jar (jarRoom). */
  private jarButton(): string {
    const { save } = this.deps;
    if (!save.kit.jar) return '<button type="button" data-act="take" disabled title="You have no specimen jar yet">No jar</button>';
    if (!jarRoom(save))
      return `<button type="button" data-act="take" disabled title="${save.gear.includes('satchel') ? 'The jar and the satchel both hold a creature' : 'The specimen jar already holds a creature'}">Jar full</button>`;
    return `<button type="button" data-act="take" title="Carry it in the specimen ${save.jar ? 'satchel' : 'jar'}">To jar</button>`;
  }

  private release(): void {
    const c = this.here().find((x) => x.id === this.selected);
    if (!c) return;
    if (Date.now() - this.releaseArmed > 3000) {
      this.releaseArmed = Date.now();
      this.render(true);
      return;
    }
    this.releaseArmed = 0;
    this.deps.save.creatures = this.deps.save.creatures.filter((x) => x.id !== c.id);
    this.deps.released(c);
    this.deps.toast(`Released. ${creatureName(c)} the ${SPECIES[c.species].name.toLowerCase()} heads home to ${SPECIES[c.species].home}.`, 'big');
    this.afterRemove();
  }

  private afterRemove(): void {
    this.selected = this.here()[0]?.id ?? null;
    this.deps.changed();
    this.deps.persist();
    this.render(true);
  }

  /** Call every frame; redraws the panel a few times a second. */
  update(dt: number): void {
    if (!this.active) return;
    this.clock += dt;
    if (this.clock > 0.25) {
      this.clock = 0;
      this.render(false);
    }
  }

  private render(force: boolean): void {
    if (!this.active || this.tankId === null) return;
    const { save, layout, livingBases } = this.deps;
    const list = this.here();
    if (this.selected !== null && !list.some((c) => c.id === this.selected)) this.selected = list[0]?.id ?? null;
    this.deps.highlight(this.selected);
    const td = tankDataFor(save, this.tankId);
    const filtered = filteredTanks(layout).has(this.tankId);
    const powered = layout.powered.has(this.tankId);
    const piped = save.lines.some((l) => l.kind === 'pipe' && l.to === this.tankId);
    const mult = whorlMult(save, this.tankId);
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const bar = (label: string, v: number, cls: string) =>
      `<div class="need"><div class="row"><span>${label}</span><span>${pct(v)}</span></div><div class="track"><i class="${cls}${v < 0.25 ? ' low' : ''}" style="width:${pct(v)}"></i></div></div>`;
    // Phase 21: sort and filter once a tank is busy.
    const species = [...new Set(list.map((x) => x.species))];
    const many = list.length >= 4;
    const visible = many ? this.shown(list) : list;
    if (many && this.filter !== 'all' && !visible.some((x) => x.id === this.selected) && visible[0]) {
      this.selected = visible[0].id;
      this.deps.highlight(this.selected);
    }
    const chips = many
      ? `<div class="filters"><span>Show:</span>${[['all', 'All'], ['rare', 'Rare'], ['care', 'Needs care'], ...(species.length > 1 ? species.map((sp) => [sp, SPECIES[sp].name]) : [])]
          .map(([id, label]) => `<button type="button" data-act="filter" data-id="${id}" class="${this.filter === id ? 'on' : ''}">${label}</button>`)
          .join('')}<select data-act="sort" aria-label="Sort by">${(['species', 'name', 'content', 'rare'] as Sort[])
          .map((k) => `<option value="${k}" ${this.sort === k ? 'selected' : ''}>${{ species: 'By species', name: 'By name', content: 'Least content first', rare: 'Rarest first' }[k]}</option>`)
          .join('')}</select></div>`
      : '';
    const tabs = visible
      .map(
        (c) =>
          `<button type="button" data-act="pick" data-id="${c.id}" class="tab${c.id === this.selected ? ' on' : ''}${c.sickness > 0.02 ? ' sick' : ''}">${
            c.stage === 'egg' ? `${SPECIES[c.species].name} eggs` : `${creatureName(c)} <small>${SPECIES[c.species].name.toLowerCase()}${c.stage === 'young' ? ', young' : ''}</small>`
          }</button>`,
      )
      .join('');
    const c = list.find((x) => x.id === this.selected);
    let body = '';
    if (!c) {
      body = `<p class="status">${livingBases ? 'This habitat is empty. Bring a young creature or an egg clutch from the reef to start a colony.' : 'This tank is empty. Collect a young creature or an egg clutch out on the reef with Collect, then stop by this tank and tap Collect to put it in.'}</p>`;
    } else if (c.stage === 'egg') {
      body = `<p class="status">${statusLine(save, c)}</p><p class="note">Eggs only need time. The fry will need feeding once they hatch.</p>${this.creatureActs(c)}`;
    } else {
      const ct = comfortTarget(save, layout, c);
      const happy = contentment(save, c);
      body = `<p class="status${c.sickness > 0.02 ? ' sick' : ''}">${statusLine(save, c)}</p>
        <div class="need content-bar"><div class="row"><span>${happy.label}${(c.bond ?? 0) >= 0.5 ? ' · knows Kestrel' : ''}</span><span>${pct(happy.value)}</span></div><div class="track"><i class="content${happy.value >= 0.85 ? ' hi' : ''}${happy.value < 0.25 ? ' low' : ''}" style="width:${pct(happy.value)}"></i></div></div>
        ${this.creatureActs(c)}
        ${bar('Fed', c.fed, 'fed')}
        ${bar('Comfort', c.comfort, 'comfort')}
        ${livingBases ? '' : bar('Water quality', td.water, 'water')}
        <ul class="notes">${[...ct.notes, ...[breedNote(save, layout, c)].filter((n) => !!n)].map((n) => `<li class="${n!.good ? 'good' : 'bad'}">${n!.good ? '✓' : '✗'} ${n!.text}</li>`).join('')}<li class="${
          filtered ? 'good' : 'bad'
        }">${filtered ? '✓ Filter pump keeps the water clean' : '✗ No filter pump: the water slowly gets dirty'}</li>${
          piped ? `<li class="good">✓ Feed pipe: ${Math.round(td.mash ?? 0)}/${TROUGH_CAP} L of mash in the trough</li>` : ''
        }${livingBases ? '' : trayLine(save, td, false)}${mult > 1 ? `<li class="good">✓ ${mult - 1} Echo whorl${mult > 2 ? 's' : ''}: ×${mult} output, eats and fouls ×${mult}</li>` : ''}</ul>${
          c.stage === 'grown' ? `<p class="note">${makeLine(save, layout, c)}</p>` : ''
        }`;
    }
    const planter = (slot: 1 | 2) =>
      PLANT_ORDER.map((p) => {
        const known = save.scans.includes(PLANTS[p].scan);
        const [k, n] = Object.entries(PLANTS[p].cost)[0] as [keyof typeof MATERIALS, number];
        const cur = slot === 1 ? td.plant : td.plant2;
        return `<button type="button" data-act="${slot === 1 ? 'plant' : 'plant2'}" data-id="${p}" class="plant${cur === p ? ' on' : ''}${known ? '' : ' locked'}">${
          known ? PLANTS[p].name : 'Unknown plant'
        }<small>${cur === p ? 'growing' : (save.cuttings[p] ?? 0) > 0 ? `cutting (${save.cuttings[p]} ready)` : `${n} ${MATERIALS[k].name.toLowerCase()}`}</small></button>`;
      }).join('');
    // Milestone 7 part 2: a Grand tank has a second planter, so two species can both have their favourite.
    const grand = layout.pieces.find((q) => q.id === this.tankId)?.kind === 'gtank';
    const plants = grand ? `${planter(1)}</div><div class="plants"><span>Planter 2:</span>${planter(2)}` : planter(1);
    const armed = Date.now() - this.releaseArmed < 3000;
    const capacity = tankCapacity(layout, this.tankId, save);
    const feed = '<button type="button" class="big" data-act="feed">Feed kelp flakes <small>1 fibre</small></button>';
    const clean = '<button type="button" data-act="clean">Clean tank</button>';
    // Phase 21: routine feeding and cleaning of every tank in one press, once there are several.
    const all = tanks(layout).length > 1 ? '<button type="button" data-act="care-all" title="Feed every hungry tank (1 kelp fibre each) and scrub every tank">Care for all</button>' : '';
    const upgrade = this.upgradeButton();
    const overview = livingBases ? `<section class="habitat-care" aria-label="Habitat care">
      ${bar('Water quality', td.water, 'water')}
      ${filtered ? '<p class="note">Filter pump running</p>' : ''}
      <div class="acts">${feed}${clean}${all}${upgrade}${save.jar ? `<button type="button" data-act="deposit" ${list.length >= capacity ? `disabled title="This habitat holds ${capacity}: make room or use another"` : 'title="Move the jar\'s creature into this habitat"'}>${list.length >= capacity ? 'Habitat full' : 'Move specimen from jar'}</button>` : ''}</div>
      <ul class="notes">${trayLine(save, td, true)}</ul>
    </section>` : '';
    const html = `
      <div class="care-head"><b>${livingBases ? `Habitat Console · ${this.code()}` : this.code()}${this.tankId !== null && isDisplay(save, layout, this.tankId) ? ' · Display aquarium' : ''}</b><span>${list.length}/${capacity} · ${powered ? 'powered' : 'no power'}</span>
        <button type="button" class="x" data-act="close" aria-label="Close">✕</button></div>
      ${overview}
      ${chips}
      ${list.length ? (visible.length ? `<div class="tabs">${tabs}</div>` : '<p class="note">None in this tank match. Tap All to see everyone.</p>') : ''}
      ${c ? `<h3>${c.stage === 'egg' ? SPECIES[c.species].eggName.replace(/^./, (m) => m.toUpperCase()) : `${creatureName(c)} <small>· ${SPECIES[c.species].name}</small>`}</h3><p class="traits${isRare(traitsOf(c)) ? ' rare' : ''}">${traitText(c.species, traitsOf(c))} <small>· ${genText(traitsOf(c))}</small></p>` : ''}
      ${body}
      <div class="plants"><span>${grand ? 'Planter 1:' : 'Plant:'}</span>${plants}</div>
      ${this.decorRow()}
      <div class="acts">
        ${livingBases ? '' : feed + clean + all + upgrade}
        ${c ? `${this.jarButton()}<button type="button" data-act="release" class="${armed ? 'armed' : ''}">${armed ? 'Tap again' : 'Release'}</button>` : ''}
      </div>`;
    if (!force && performance.now() - this.touchedAt < 1500) return;
    if (force || html !== this.lastHtml) {
      const active = document.activeElement;
      const previous = livingBases && active instanceof HTMLButtonElement && this.panel.contains(active) ? active.dataset : null;
      this.lastHtml = html;
      this.panel.innerHTML = html;
      if (previous) {
        const next = Array.from(this.panel.querySelectorAll<HTMLButtonElement>('[data-act]')).find((button) =>
          !button.disabled && button.dataset.act === previous.act && button.dataset.id === previous.id);
        (next ?? this.panel.querySelector<HTMLButtonElement>('[data-act="close"]'))?.focus({ preventScroll: true });
      }
    }
  }
}
