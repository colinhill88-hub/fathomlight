import { EUROPA_MAT, EUROPA_MATS, EUROPA_MODULES, europaOf, fuelCost, canAfford, linneaEuropa, RAY_GEAR, RAY_GEAR_ORDER, RAY_TRUST, type EuropaMat, type EuropaModuleId, type RayGearId } from '../game/europa';
import type { SaveData } from '../game/state';

/**
 * Beyond Earth (Nov 27, 2026): the Petrel hab's console on Europa. Europa's stores, the
 * pieces learned from the Choir kin's glyphs (KD-1 welds them onto the hab), the fuel for the
 * trip home, and Linnea in her jar by the porthole.
 */
export interface EuropaPanelDeps {
  save(): SaveData;
  build(id: EuropaModuleId): void;
  growGear(id: RayGearId): void;
  flyHome(): void;
}

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
const costText = (save: SaveData, cost: Partial<Record<EuropaMat, number>>) =>
  (Object.entries(cost) as [EuropaMat, number][])
    .map(([k, n]) => `<span class="pw-mat${(save.europa?.stores[k] ?? 0) < n ? ' short' : ''}">${n} ${esc((n > 1 ? EUROPA_MAT[k].plural : EUROPA_MAT[k].name).toLowerCase())}</span>`)
    .join('');

export class EuropaPanel {
  open = false;
  private readonly el: HTMLDivElement;
  private timer = 0;
  private lastHtml = '';

  constructor(private readonly deps: EuropaPanelDeps) {
    this.el = document.createElement('div');
    this.el.id = 'europa-panel';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'Petrel hab');
    this.el.hidden = true;
    document.body.appendChild(this.el);
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t === this.el || t.closest('[data-eu="close"]')) return this.close();
      const b = t.closest<HTMLElement>('[data-eu]');
      if (!b) return;
      if (b.dataset.eu === 'build') this.deps.build(b.dataset.id as EuropaModuleId);
      if (b.dataset.eu === 'grow') this.deps.growGear(b.dataset.id as RayGearId);
      if (b.dataset.eu === 'home') this.deps.flyHome();
      this.render();
    });
    window.addEventListener('keydown', (e) => {
      if (this.open && e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });
  }

  show(): void {
    this.open = true;
    this.el.hidden = false;
    this.el.innerHTML = '<div class="pw-card"></div>';
    this.lastHtml = '';
    this.render();
    this.timer = window.setInterval(() => this.render(), 1000);
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.el.hidden = true;
    window.clearInterval(this.timer);
  }

  private render(): void {
    const card = this.el.querySelector<HTMLDivElement>('.pw-card');
    if (!card) return;
    const save = this.deps.save();
    const e = europaOf(save);
    const stores = EUROPA_MATS.map((k) => `<span class="pw-mat">${e.stores[k]} ${esc(EUROPA_MAT[k].plural.toLowerCase())}</span>`).join('');
    const mods = e.learned.length
      ? e.learned
          .map((id) => {
            const d = EUROPA_MODULES[id];
            const built = e.built.includes(id);
            const welding = e.welding?.id === id;
            const ok = !built && !e.welding && canAfford(save, d.cost);
            return `<li class="pw-stage ${built ? 'done' : 'now'}">
              <div class="pw-stage-head"><strong>${esc(d.name)} <span class="pw-code">${d.code}</span></strong>
              <span class="pw-parts">${built ? 'Built' : welding ? `KD-1 welding · ${Math.round((e.welding?.progress ?? 0) * 100)}%` : ''}</span></div>
              <p class="pw-why">${esc(d.job)}</p>
              ${built || welding ? '' : `<div class="pw-recipe">${costText(save, d.cost)}<button type="button" class="eu-btn" data-eu="build" data-id="${id}" ${ok ? '' : 'disabled'}>Build</button></div>`}
            </li>`;
          })
          .join('')
      : '<li class="pw-stage later"><p class="pw-why">No Europa pieces yet. Earth’s hardware cracks in this cold: look for the glyphs the Choir’s kin carved into the ice, and the Petrel’s core will read them.</p></li>';
    // The floe ray's gear, grown in the hab's brine vat: only what has been learned shows (one unlock at a time).
    const r = e.ray;
    let rayRows = '';
    if (r && r.trust > 0) {
      const learned = RAY_GEAR_ORDER.filter((id) => r.learned.includes(id));
      const next = RAY_GEAR_ORDER.length - learned.length;
      rayRows = `<li class="pw-stage ${r.trust >= RAY_TRUST ? 'now' : 'later'}"><div class="pw-stage-head"><strong>Your floe ray</strong><span class="pw-parts">${r.trust >= RAY_TRUST ? 'Befriended' : `Trust ${r.trust} of ${RAY_TRUST}`}</span></div>
        <p class="pw-why">${r.trust >= RAY_TRUST ? 'Gear for it grows here in the brine vat and fits itself. More is drawn in glyphs out in the ice.' : 'Offer it frost fronds (hold Collect beside it) until it trusts you.'}</p></li>`;
      rayRows += learned
        .map((id) => {
          const d = RAY_GEAR[id];
          const fitted = r.gear.includes(id);
          const growing = r.growing?.id === id;
          const ok = !fitted && !r.growing && canAfford(save, d.cost);
          return `<li class="pw-stage ${fitted ? 'done' : 'now'}">
            <div class="pw-stage-head"><strong>${esc(d.name)}</strong><span class="pw-parts">${fitted ? 'Fitted' : growing ? `Growing · ${Math.round((r.growing?.progress ?? 0) * 100)}%` : ''}</span></div>
            <p class="pw-why">${esc(d.job)}</p>
            ${fitted || growing ? '' : `<div class="pw-recipe">${costText(save, d.cost)}<button type="button" class="eu-btn" data-eu="grow" data-id="${id}" ${ok ? '' : 'disabled'}>Grow</button></div>`}
          </li>`;
        })
        .join('');
      if (r.trust >= RAY_TRUST && next > 0) rayRows += `<li class="pw-stage later"><p class="pw-why">${next} more piece${next > 1 ? 's' : ''} of ray gear to find, drawn in glyphs out in the ice.</p></li>`;
    }
    const fuel = fuelCost(save);
    const canGo = canAfford(save, fuel);
    const [l1, l2] = linneaEuropa(save);
    const html = `
      <header class="pw-head">
        <div><h2>Petrel hab <span class="pw-code">EUROPA</span></h2><span class="pw-sub">Air, the console, and Linnea by the porthole.</span></div>
        <button type="button" class="pw-close" data-eu="close" aria-label="Close">✕</button>
      </header>
      <div class="pw-status">Linnea: “${esc(l1)} ${esc(l2)}”</div>
      <ol class="pw-stages">
        <li class="pw-stage"><div class="pw-stage-head"><strong>Europa stores</strong></div><div class="pw-recipe">${stores}</div></li>
        ${mods}
        ${rayRows}
        <li class="pw-stage now">
          <div class="pw-stage-head"><strong>Fly home</strong><span class="pw-parts">${e.built.includes('still') ? 'Brine still fitted: half the fuel' : ''}</span></div>
          <p class="pw-why">The Choir core carries the Petrel out here for nothing, but going home takes fuel refined from Europa's brine and rime. It all grows back near the hab.</p>
          <div class="pw-recipe">${costText(save, fuel)}<button type="button" class="eu-btn" data-eu="home" ${canGo ? '' : 'disabled'}>Fuel up and fly home</button></div>
        </li>
      </ol>`;
    // Only redraw when something changed, so a tap is never lost to a redraw under the finger.
    if (html !== this.lastHtml) {
      this.lastHtml = html;
      card.innerHTML = html;
    }
  }
}
