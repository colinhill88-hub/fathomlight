import { BaseLayout, isDone, pieceCode, Placed } from '../game/base';
import { isKey } from '../controls/bindings';
import { MATERIAL_ORDER, MaterialId, MATERIALS, SaveData } from '../game/state';
import {
  airClock,
  haveFor,
  holdCount,
  missingText,
  MODULE_ORDER,
  moduleKnown,
  MODULES,
  payFor,
  repairCost,
  startSub,
  SUB_AIR,
  SUB_BUILD_TIME,
  SUB_COST,
  SUB_SLOTS,
} from '../game/sub';
import { MATERIAL_ICONS } from './hud';
import { CRUSH } from '../world/terrain';
/** Milestone 10: what depth plating DP-S costs to fit. */
export const DEPTH_PLATING_COST: Partial<Record<MaterialId, number>> = { plate: 6, ore: 4, brass: 3 };
import type { SubModule } from '../game/state';

/**
 * The Moon pool dock panel (milestone 6). Swim (or drive) up to a finished
 * dock and tap Dock (top right; keyboard G). The camera looks at the dock
 * and a panel on the right shows the submersible:
 *  - no sub yet: what it costs, and Build (the drone welds it in the berth);
 *  - a frame: how far the welding has got;
 *  - berthed here: hull and air, Repair (hull plating), and the three
 *    module slots, with modules to fit or take off;
 *  - out on the reef: where it is.
 * Keyboard: G opens and closes, Esc closes, R repairs.
 */

export interface DockDeps {
  save: SaveData;
  layout: BaseLayout;
  toast(text: string, kind?: 'item' | 'scan' | 'big' | 'warn'): void;
  /** Phase 14: a reward moment for a KS-1 upgrade ('plating' for depth plating). The first fit of each module only. */
  reward?(what: SubModule | 'plating'): void;
  refreshInventory(): void;
  persist(): void;
  droneReady(): boolean;
  /** Seconds until KD-1 is back from a delivery run, or null if it is here (after milestone 12). */
  droneAway(): number | null;
  /** The drone is welding the sub frame right now. */
  weldingSub(): boolean;
  /** A sub was started, or its modules changed: update the drawing. */
  subChanged(): void;
  /** Give materials back (into storage while there is room, then carried). */
  refund(cost: Partial<Record<MaterialId, number>>): void;
  /** Metres from the dock to the sub. */
  subDistance(): number;
}

function costChips(save: SaveData, cost: Partial<Record<MaterialId, number>>): string {
  return MATERIAL_ORDER.filter((k) => cost[k])
    .map((k) => {
      const have = save.bag[k] + save.stored[k];
      return `<span class="cost ${have >= cost[k]! ? '' : 'short'}">${MATERIAL_ICONS[k]}${have}/${cost[k]}</span>`;
    })
    .join('');
}

export class DockMode {
  active = false;
  dockId: number | null = null;
  available: number | null = null;

  private btn = document.getElementById('dock-btn') as HTMLButtonElement;
  private panel = document.getElementById('dock-panel')!;
  private lastHtml = '';
  private clock = 0;
  private removeArmed: { m: SubModule | null; at: number } = { m: null, at: 0 };

  constructor(private readonly deps: DockDeps) {
    this.btn.addEventListener('click', () => this.toggle());
    this.panel.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.panel.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
      if (!el || (el as HTMLButtonElement).disabled) return;
      const act = el.dataset.act!;
      if (act === 'build') this.buildSub();
      else if (act === 'repair') this.repair();
      else if (act === 'fit') this.fit(el.dataset.id as SubModule);
      else if (act === 'unfit') this.unfit(el.dataset.id as SubModule);
      else if (act === 'plating') this.plating();
      else if (act === 'close') this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (isKey('dock', k)) this.toggle();
      else if (!this.active) return;
      else if (k === 'escape') this.close();
      else if (isKey('repair', k)) this.repair();
      else return;
      e.preventDefault();
    });
  }

  /** Show the Dock button while at a finished dock (its id), or hide it (null). */
  setAvailable(id: number | null): void {
    if (id === this.available) return;
    this.available = id;
    this.btn.classList.toggle('show', id !== null);
    if (id === null && this.active) this.close();
  }

  toggle(): void {
    if (this.active) this.close();
    else if (this.available !== null) this.open(this.available);
  }

  open(id: number): void {
    this.active = true;
    this.dockId = id;
    document.body.classList.add('docking');
    this.btn.setAttribute('aria-pressed', 'true');
    this.render(true);
  }

  close(): void {
    if (!this.active) return;
    this.active = false;
    this.dockId = null;
    document.body.classList.remove('docking');
    this.btn.setAttribute('aria-pressed', 'false');
    this.deps.persist();
  }

  private dock(): Placed | null {
    return this.deps.layout.pieces.find((p) => p.id === this.dockId) ?? null;
  }

  /** The sub, if it is berthed in this dock and built. */
  private berthed() {
    const s = this.deps.save.sub;
    return s && s.stage === 'built' && s.docked && s.dock === this.dockId ? s : null;
  }

  private buildSub(): void {
    const { save, layout } = this.deps;
    const d = this.dock();
    if (!d || save.sub) return;
    if (!layout.powered.has(d.id)) return this.deps.toast('The dock needs power before it can build anything', 'warn');
    if (!this.deps.droneReady()) return this.deps.toast('The build drone has to weld the sub. Repair it first (by the survey sled wreck).', 'warn');
    const away = this.deps.droneAway();
    if (away !== null) return this.deps.toast(`KD-1 is out on a delivery run: the sub frame waits until it's back (about ${away} s).`, 'warn');
    if (!payFor(save, SUB_COST)) return this.deps.toast(`To build the sub you still need ${missingText(save, SUB_COST)}`, 'warn');
    startSub(save, d);
    this.deps.subChanged();
    this.deps.refreshInventory();
    this.deps.toast(`Sub frame laid in the berth of ${pieceCode(layout, d)}. The drone welds it (about ${SUB_BUILD_TIME} s).`, 'big');
    this.deps.persist();
    this.render(true);
  }

  private repair(): void {
    const s = this.berthed();
    if (!s || s.hull >= 1) return;
    const n = repairCost(s.hull);
    if (!payFor(this.deps.save, { plate: n })) return this.deps.toast(`Repairing the hull takes ${n} hull plating`, 'warn');
    s.hull = 1;
    this.deps.subChanged();
    this.deps.refreshInventory();
    this.deps.toast(`Hull repaired: −${n} hull plating. KS-1 is good as new.`, 'big');
    this.deps.persist();
    this.render(true);
  }

  private fit(m: SubModule): void {
    const s = this.berthed();
    if (!s || s.modules.includes(m)) return;
    if (s.modules.length >= SUB_SLOTS) return this.deps.toast('All three slots are full. Take a module off first.', 'warn');
    if (!payFor(this.deps.save, MODULES[m].cost)) return this.deps.toast(`${MODULES[m].name} still needs ${missingText(this.deps.save, MODULES[m].cost)}`, 'warn');
    s.modules.push(m);
    this.deps.subChanged();
    this.deps.refreshInventory();
    this.deps.reward?.(m);
    this.deps.toast(`${MODULES[m].name} fitted to KS-1`, 'big');
    this.deps.persist();
    this.render(true);
  }

  /** Milestone 10: depth plating DP-S, a hull refit (it takes no module slot). */
  private plating(): void {
    const s = this.berthed();
    const save = this.deps.save;
    if (!s || s.plating || !save.blueprints.includes('plating')) return;
    if (!payFor(save, DEPTH_PLATING_COST)) return this.deps.toast(`Depth plating still needs ${missingText(save, DEPTH_PLATING_COST)}`, 'warn');
    s.plating = true;
    this.deps.subChanged();
    this.deps.refreshInventory();
    this.deps.reward?.('plating');
    this.deps.toast(`Depth plating DP-S bolted on: KS-1 is rated to ${CRUSH.plated} m now (it was ${CRUSH.sub} m).`, 'big');
    this.deps.persist();
    this.render(true);
  }

  private unfit(m: SubModule): void {
    const s = this.berthed();
    if (!s || !s.modules.includes(m)) return;
    if (m === 'cargo' && (holdCount(s) > 0 || (s.aboard && MATERIAL_ORDER.some((k) => this.deps.save.bag[k] > 0)))) {
      return this.deps.toast('Empty the cargo bay into storage first (a powered storage pod must have room)', 'warn');
    }
    if (this.removeArmed.m !== m || Date.now() - this.removeArmed.at > 3000) {
      this.removeArmed = { m, at: Date.now() };
      this.render(true);
      return;
    }
    this.removeArmed = { m: null, at: 0 };
    s.modules = s.modules.filter((x) => x !== m);
    this.deps.refund(MODULES[m].cost);
    this.deps.subChanged();
    this.deps.refreshInventory();
    this.deps.toast(`${MODULES[m].name} taken off. Materials returned.`);
    this.deps.persist();
    this.render(true);
  }

  update(dt: number): void {
    if (!this.active) return;
    this.clock += dt;
    if (this.clock > 0.25) {
      this.clock = 0;
      this.render(false);
    }
  }

  private render(force: boolean): void {
    if (!this.active) return;
    const { save, layout } = this.deps;
    const d = this.dock();
    if (!d) return this.close();
    const powered = layout.powered.has(d.id);
    const code = pieceCode(layout, d);
    const s = save.sub;
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    let body = '';
    if (!isDone(d)) {
      body = '<p class="why">This dock is still a frame. The drone has to finish welding it.</p>';
    } else if (!s) {
      const ok = haveFor(save, SUB_COST);
      const reason = !powered ? 'The dock needs power: join it to a current turbine.' : !this.deps.droneReady() ? 'The build drone has to weld the sub. Repair it first.' : !ok ? `Still need ${missingText(save, SUB_COST)}.` : '';
      body = `<h3>Submersible KS-1</h3>
        <p>A two-person survey sub with a glass dome cockpit and three module slots. It carries ${SUB_AIR / 60} minutes of air, so it is a safe point you take with you: breathe aboard, and after a blackout the crew can bring you back to it.</p>
        <div class="costs">${costChips(save, SUB_COST)}<span class="cost">${SUB_BUILD_TIME} s weld</span></div>
        ${reason ? `<p class="why">${reason}</p>` : ''}
        <button type="button" class="act big" data-act="build" ${reason ? 'disabled' : ''}>Build the sub here</button>`;
    } else if (s.stage === 'frame') {
      const p = s.progress ?? 0;
      body = `<h3>Submersible KS-1: frame</h3>
        <div class="need"><div class="row"><span>Welded</span><span>${pct(p)}</span></div><div class="track"><i style="width:${pct(p)}"></i></div></div>
        <p class="${this.deps.weldingSub() ? 'ok' : 'why'}">${
          this.deps.weldingSub() ? `The drone is welding it: about ${Math.ceil((1 - p) * SUB_BUILD_TIME)} s left.` : 'Waiting for the drone (it finishes base frames first, and follows you when you swim far away).'
        }</p>`;
    } else if (!this.berthed()) {
      body = `<h3>Submersible KS-1</h3>
        <p>Out on the reef, about ${Math.round(this.deps.subDistance())} m away. Hull ${pct(s.hull)} · air ${airClock(s.air)}.</p>
        <p class="ok">Drive it slowly into the open berth under the pool and it docks itself. Docked, it refills its air, unloads its cargo into storage, and can be repaired and refitted here.</p>`;
    } else {
      const rc = repairCost(s.hull);
      const armed = (m: SubModule) => this.removeArmed.m === m && Date.now() - this.removeArmed.at < 3000;
      const slots = Array.from({ length: SUB_SLOTS }, (_, i) => {
        const m = s.modules[i];
        if (!m) return `<div class="mod empty"><div><b>Slot ${i + 1}: empty</b><small>Fit a module from the list below.</small></div></div>`;
        return `<div class="mod"><div><b>${MODULES[m].name}</b> <small>${MODULES[m].code} · ${MODULES[m].job}</small></div><button type="button" class="act ${armed(m) ? 'armed' : ''}" data-act="unfit" data-id="${m}">${armed(m) ? 'Tap again' : 'Take off'}</button></div>`;
      }).join('');
      const spare = MODULE_ORDER.filter((m) => !s.modules.includes(m) && moduleKnown(save, m));
      const fits = spare
        .map((m) => {
          const ok = haveFor(save, MODULES[m].cost) && s.modules.length < SUB_SLOTS;
          return `<div class="mod"><div><b>${MODULES[m].name}</b><small>${MODULES[m].job}</small><div class="costs">${costChips(save, MODULES[m].cost)}</div></div><button type="button" class="act" data-act="fit" data-id="${m}" ${ok ? '' : 'disabled'}>Fit</button></div>`;
        })
        .join('');
      body = `<h3>Submersible KS-1 · berthed</h3>
        <div class="need"><div class="row"><span>Hull</span><span>${pct(s.hull)}</span></div><div class="track"><i class="${s.hull < 0.35 ? 'low' : ''}" style="width:${pct(s.hull)}"></i></div></div>
        <div class="need"><div class="row"><span>Air</span><span>${airClock(s.air)}</span></div><div class="track"><i class="air" style="width:${pct(s.air / SUB_AIR)}"></i></div></div>
        ${
          s.hull < 1
            ? `<button type="button" class="act big" data-act="repair" ${haveFor(save, { plate: rc }) ? '' : 'disabled'}>Repair the hull <span class="costs">${costChips(save, { plate: rc })}</span></button>`
            : '<p class="ok">Hull sound. Air refills while berthed.</p>'
        }
        ${s.hull <= 0 ? '<p class="why">The hull is breached: it must be repaired before anyone can take it out.</p>' : ''}
        <h3>Module slots (${s.modules.length}/${SUB_SLOTS})</h3>
        ${slots}
        ${fits ? `<h3>Modules to fit</h3>${fits}` : '<p class="ok">Every module available so far is fitted.</p>'}
        <h3>Hull refit</h3>
        ${
          s.plating
            ? `<div class="mod"><div><b>Depth plating</b> <small>DP-S · fitted: rated to ${CRUSH.plated} m</small></div></div>`
            : save.blueprints.includes('plating')
              ? `<div class="mod"><div><b>Depth plating</b><small>DP-S · a bolted second skin of plate and vent ore. Takes KS-1 from ${CRUSH.sub} m to ${CRUSH.plated} m. Uses no slot.</small><div class="costs">${costChips(save, DEPTH_PLATING_COST)}</div></div><button type="button" class="act" data-act="plating" ${haveFor(save, DEPTH_PLATING_COST) ? '' : 'disabled'}>Fit</button></div>`
              : `<p>KS-1's hull is rated to ${CRUSH.sub} m. Depth plating would take it deeper: its design is somewhere in the trench.</p>`
        }
        <p>${s.aboard ? 'You are aboard: tap Exit (V) to climb out, or drive off.' : 'Swim up to the sub and tap Board (V) to take it out.'}</p>`;
    }
    const html = `<div class="head"><b>${code} · Moon pool dock</b><span>${powered ? 'powered' : 'no power'}</span>
        <button type="button" class="x" data-act="close" aria-label="Close">✕</button></div>${body}`;
    if (force || html !== this.lastHtml) {
      this.lastHtml = html;
      this.panel.innerHTML = html;
    }
  }
}

/** Plain text of a cost, for toasts: "3 hull plating, 2 scrap metal". */
export function costText(cost: Partial<Record<MaterialId, number>>): string {
  return MATERIAL_ORDER.filter((k) => cost[k])
    .map((k) => `${cost[k]} ${MATERIALS[k].name.toLowerCase()}`)
    .join(', ');
}
