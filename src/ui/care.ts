import { BaseLayout, pieceCode } from '../game/base';
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
} from '../game/creatures';
import { genText, isRare, traitsOf, traitText } from '../game/traits';
import { CreatureData, MATERIALS, SaveData } from '../game/state';
import { TRAY_CAP, trayCount, TROUGH_CAP, whorlMult } from '../game/factory';
import { MATERIAL_ORDER, TankData } from '../game/state';

/** The output tray (milestone 5 part 2): what is waiting, and how it leaves. */
function trayLine(save: SaveData, td: TankData): string {
  const n = trayCount(td);
  const what = MATERIAL_ORDER.filter((k) => td.out?.[k])
    .map((k) => `${td.out![k]} ${MATERIALS[k].name.toLowerCase()}`)
    .join(', ');
  const belt = save.lines.some((l) => l.kind === 'belt' && save.tankData[String(l.from)] === td);
  const good = n < TRAY_CAP;
  return `<li class="${good ? 'good' : 'bad'}">${good ? '✓' : '✗'} Output tray ${n}/${TRAY_CAP}${what ? ` (${what})` : ''}${
    belt ? ': a conveyor carries it away' : n ? ': stop by the tank and tap Collect to take it, or run a conveyor from the tank' : ''
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
}

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

  constructor(private readonly deps: CareDeps) {
    this.btn.addEventListener('click', () => this.toggle());
    this.panel.addEventListener('pointerdown', (e) => e.stopPropagation());
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
      else if (act === 'release') this.release();
      else if (act === 'close') this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 't') this.toggle();
      else if (!this.active) return;
      else if (k === 'escape') this.close();
      else if (k === 'tab') this.cycle();
      else if (k === 'f') this.feed();
      else if (k === 'c') this.clean();
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
    document.body.classList.add('caring');
    this.btn.setAttribute('aria-pressed', 'true');
    this.render(true);
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

  private takeOut(): void {
    const { save } = this.deps;
    const c = this.here().find((x) => x.id === this.selected);
    if (!c) return;
    if (save.jar) {
      this.deps.toast('The specimen jar is already full', 'warn');
      return;
    }
    save.creatures = save.creatures.filter((x) => x.id !== c.id);
    save.jar = { species: c.species, stage: c.stage, keep: c };
    // Milestone 9: grown glowfins and tinker crabs are keys out in the world.
    const key =
      c.stage === 'grown' && c.species === 'glowfin'
        ? ' Outside, it swims beside you as a light: it can lead you through lightless water where the dive light dies.'
        : c.stage === 'grown' && c.species === 'crab'
          ? ' Its fine claws can pick locks too small and rusted for the cutter.'
          : ' Put it in another tank from inside the base.';
    this.deps.toast(`${SPECIES[c.species].name} moved into the specimen jar.${key}`, 'big');
    this.afterRemove();
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
    this.deps.toast(`Released. The ${SPECIES[c.species].name.toLowerCase()} heads home to ${SPECIES[c.species].home}.`, 'big');
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
    const { save, layout } = this.deps;
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
    const tabs = list
      .map(
        (c) =>
          `<button type="button" data-act="pick" data-id="${c.id}" class="tab${c.id === this.selected ? ' on' : ''}${c.sickness > 0.02 ? ' sick' : ''}">${
            c.stage === 'egg' ? `${SPECIES[c.species].name} eggs` : SPECIES[c.species].name
          }${c.stage === 'young' ? ' <small>young</small>' : ''}</button>`,
      )
      .join('');
    const c = list.find((x) => x.id === this.selected);
    let body = '';
    if (!c) {
      body = `<p class="status">This tank is empty. Collect a young creature or an egg clutch out on the reef with Collect, then stop by this tank and tap Collect to put it in.</p>`;
    } else if (c.stage === 'egg') {
      body = `<p class="status">${statusLine(save, c)}</p><p class="note">Eggs only need time. The fry will need feeding once they hatch.</p>`;
    } else {
      const ct = comfortTarget(save, layout, c);
      body = `<p class="status${c.sickness > 0.02 ? ' sick' : ''}">${statusLine(save, c)}</p>
        ${bar('Fed', c.fed, 'fed')}
        ${bar('Comfort', c.comfort, 'comfort')}
        ${bar('Water quality', td.water, 'water')}
        <ul class="notes">${[...ct.notes, ...[breedNote(save, layout, c)].filter((n) => !!n)].map((n) => `<li class="${n!.good ? 'good' : 'bad'}">${n!.good ? '✓' : '✗'} ${n!.text}</li>`).join('')}<li class="${
          filtered ? 'good' : 'bad'
        }">${filtered ? '✓ Filter pump keeps the water clean' : '✗ No filter pump: the water slowly gets dirty'}</li>${
          piped ? `<li class="good">✓ Feed pipe: ${Math.round(td.mash ?? 0)}/${TROUGH_CAP} L of mash in the trough</li>` : ''
        }${trayLine(save, td)}${mult > 1 ? `<li class="good">✓ ${mult - 1} Echo whorl${mult > 2 ? 's' : ''}: ×${mult} output, eats and fouls ×${mult}</li>` : ''}</ul>${
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
    const html = `
      <div class="care-head"><b>${this.code()}</b><span>${list.length}/${tankCapacity(layout, this.tankId)} · ${powered ? 'powered' : 'no power'}</span>
        <button type="button" class="x" data-act="close" aria-label="Close">✕</button></div>
      ${list.length ? `<div class="tabs">${tabs}</div>` : ''}
      ${c ? `<h3>${c.stage === 'egg' ? SPECIES[c.species].eggName.replace(/^./, (m) => m.toUpperCase()) : SPECIES[c.species].name}</h3><p class="traits${isRare(traitsOf(c)) ? ' rare' : ''}">${traitText(c.species, traitsOf(c))} <small>· ${genText(traitsOf(c))}</small></p>` : ''}
      ${body}
      <div class="plants"><span>${grand ? 'Planter 1:' : 'Plant:'}</span>${plants}</div>
      <div class="acts">
        <button type="button" class="big" data-act="feed">Feed kelp flakes <small>1 fibre</small></button>
        <button type="button" data-act="clean">Clean tank</button>
        ${c ? `<button type="button" data-act="take">To jar</button><button type="button" data-act="release" class="${armed ? 'armed' : ''}">${armed ? 'Tap again' : 'Release'}</button>` : ''}
      </div>`;
    if (force || html !== this.lastHtml) {
      this.lastHtml = html;
      this.panel.innerHTML = html;
    }
  }
}
