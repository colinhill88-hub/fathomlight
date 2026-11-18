import { BaseLayout, isDone, pieceCode, Placed } from '../game/base';
import { MATERIAL_ORDER, MaterialId, SaveData } from '../game/state';
import { FINDS, GEAR, GEAR_ORDER, gearBlocker, jobOf, jobRunning, jobSecondsLeft, KIT_GEAR, OTHER_BLUEPRINTS, PIECE_BLUEPRINTS, RESEARCH, RESEARCH_ORDER, researchBlocker } from '../game/gear';
import { payCost } from '../game/creatures';
import { haveFor, missingText } from '../game/sub';
import { MATERIAL_ICONS } from './hud';

/**
 * The Lab and Workshop panel (milestone 7). Stop by a finished Lab or
 * Workshop and tap the button that appears (top right; keyboard K). The
 * camera looks at the piece and a panel on the right shows:
 *  - Lab: data finds carried back, and blueprints to decode (each runs for
 *    a while, with power);
 *  - Workshop: blueprints decoded so far, and gear to build from them.
 * Keyboard: K opens and closes, Esc closes.
 */

export interface StationDeps {
  save: SaveData;
  layout: BaseLayout;
  toast(text: string, kind?: 'item' | 'scan' | 'big' | 'warn'): void;
  refreshInventory(): void;
  persist(): void;
  refund(cost: Partial<Record<MaterialId, number>>): void;
}

function costChips(save: SaveData, cost: Partial<Record<MaterialId, number>>): string {
  return MATERIAL_ORDER.filter((k) => cost[k])
    .map((k) => {
      const have = save.bag[k] + save.stored[k];
      return `<span class="cost ${have >= cost[k]! ? '' : 'short'}">${MATERIAL_ICONS[k]}${have}/${cost[k]}</span>`;
    })
    .join('');
}

export class StationMode {
  active = false;
  pieceId: number | null = null;
  available: number | null = null;

  private btn = document.getElementById('station-btn') as HTMLButtonElement;
  private lbl = this.btn.querySelector('.lbl') as HTMLElement;
  private panel = document.getElementById('station-panel')!;
  private lastHtml = '';
  private clock = 0;
  private cancelArmed = 0;

  constructor(private readonly deps: StationDeps) {
    this.btn.addEventListener('click', () => this.toggle());
    this.panel.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.panel.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
      if (!el || (el as HTMLButtonElement).disabled) return;
      const act = el.dataset.act!;
      if (act === 'research') this.research(el.dataset.id!);
      else if (act === 'make') this.make(el.dataset.id!);
      else if (act === 'cancel') this.cancel();
      else if (act === 'close') this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 'k') this.toggle();
      else if (!this.active) return;
      else if (k === 'escape') this.close();
      else return;
      e.preventDefault();
    });
  }

  /** Show the button while by a finished Lab or Workshop (its id), or hide it (null). */
  setAvailable(id: number | null): void {
    if (id === this.available) return;
    this.available = id;
    const p = id !== null ? this.deps.layout.pieces.find((q) => q.id === id) : null;
    if (p) {
      this.lbl.textContent = p.kind === 'lab' ? 'Lab' : 'Workshop';
      this.btn.setAttribute('aria-label', p.kind === 'lab' ? 'Lab' : 'Workshop');
      this.btn.dataset.kind = p.kind;
    }
    this.btn.classList.toggle('show', id !== null);
    if (id === null && this.active) this.close();
  }

  toggle(): void {
    if (this.active) this.close();
    else if (this.available !== null) this.open(this.available);
  }

  open(id: number): void {
    this.active = true;
    this.pieceId = id;
    document.body.classList.add('stationing');
    this.btn.setAttribute('aria-pressed', 'true');
    this.render(true);
  }

  close(): void {
    if (!this.active) return;
    this.active = false;
    this.pieceId = null;
    document.body.classList.remove('stationing');
    this.btn.setAttribute('aria-pressed', 'false');
    this.deps.persist();
  }

  private piece(): Placed | null {
    return this.deps.layout.pieces.find((p) => p.id === this.pieceId) ?? null;
  }

  private research(id: string): void {
    const { save, layout } = this.deps;
    const p = this.piece();
    const r = RESEARCH[id as keyof typeof RESEARCH];
    if (!p || !r || jobOf(save, p)) return;
    if (!layout.powered.has(p.id)) return this.deps.toast('The Lab needs power: join it to a current turbine', 'warn');
    const why = researchBlocker(save, r);
    if (why) return this.deps.toast(why, 'warn');
    if (jobRunning(save, `research:${r.id}`)) return this.deps.toast('Another Lab is already decoding that', 'warn');
    save.finds = save.finds.filter((f) => !r.finds.includes(f));
    save.jobs[String(p.id)] = { id: `research:${r.id}`, progress: 0 };
    this.deps.toast(`${pieceCode(layout, p)} is decoding the ${r.name.toLowerCase()} (about ${r.seconds} s, while it has power)`, 'big');
    this.deps.persist();
    this.render(true);
  }

  private make(id: string): void {
    const { save, layout } = this.deps;
    const p = this.piece();
    const g = GEAR[id as keyof typeof GEAR];
    if (!p || !g || jobOf(save, p) || (save.gear.includes(g.id) && !KIT_GEAR.includes(g.id))) return;
    if (!layout.powered.has(p.id)) return this.deps.toast('The Workshop needs power: join it to a current turbine', 'warn');
    if (!save.blueprints.includes(g.blueprint)) return this.deps.toast('Decode its blueprint in a Lab first', 'warn');
    const block = gearBlocker(save, g.id);
    if (block) return this.deps.toast(block, 'warn');
    if (jobRunning(save, `build:${g.id}`)) return this.deps.toast('Another Workshop is already building that', 'warn');
    if (!payCost(save, g.cost)) return this.deps.toast(`The ${g.name.toLowerCase()} still needs ${missingText(save, g.cost)}`, 'warn');
    save.jobs[String(p.id)] = { id: `build:${g.id}`, progress: 0 };
    this.deps.refreshInventory();
    this.deps.toast(`${pieceCode(layout, p)} is building the ${g.name.toLowerCase()} ${g.code} (about ${g.seconds} s)`, 'big');
    this.deps.persist();
    this.render(true);
  }

  /** Stop a Workshop job (two taps): its materials come back. Lab jobs can't be stopped. */
  private cancel(): void {
    const { save } = this.deps;
    const p = this.piece();
    const j = p ? jobOf(save, p) : null;
    if (!p || !j || !j.id.startsWith('build:')) return;
    if (Date.now() - this.cancelArmed > 3000) {
      this.cancelArmed = Date.now();
      this.render(true);
      return;
    }
    this.cancelArmed = 0;
    delete save.jobs[String(p.id)];
    this.deps.refund(GEAR[j.id.slice(6) as keyof typeof GEAR].cost);
    this.deps.refreshInventory();
    this.deps.toast('Build stopped. Materials returned.');
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
    const p = this.piece();
    if (!p) return this.close();
    const powered = layout.powered.has(p.id);
    const code = pieceCode(layout, p);
    const lab = p.kind === 'lab';
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const j = jobOf(save, p);
    let body = '';
    if (!isDone(p)) {
      body = `<p class="why">This ${lab ? 'Lab' : 'Workshop'} is still a frame. The drone has to finish welding it.</p>`;
    } else {
      if (j) {
        const [what, id] = j.id.split(':');
        const name = what === 'research' ? RESEARCH[id as keyof typeof RESEARCH].name : `${GEAR[id as keyof typeof GEAR].name} ${GEAR[id as keyof typeof GEAR].code}`;
        const armed = Date.now() - this.cancelArmed < 3000;
        body += `<h3>${what === 'research' ? 'Decoding' : 'Building'}: ${name}</h3>
          <div class="need"><div class="row"><span>${powered ? `About ${jobSecondsLeft(j)} s left` : 'Paused: no power'}</span><span>${pct(j.progress)}</span></div><div class="track"><i style="width:${pct(j.progress)}"></i></div></div>
          ${what === 'build' ? `<button type="button" class="act ${armed ? 'armed' : ''}" data-act="cancel">${armed ? 'Tap again to stop' : 'Stop building'}</button>` : ''}`;
      }
      if (lab) {
        const finds = save.finds.map((f) => `<div class="mod"><div><b>${FINDS[f].name}</b><small>${FINDS[f].text}</small></div></div>`).join('');
        body += `<h3>Data finds carried</h3>${finds || '<p>None. Look for recorders, logs and samples out on the reef: the scanner log hints where.</p>'}`;
        const rows = RESEARCH_ORDER.map((id) => {
          const r = RESEARCH[id];
          if (save.blueprints.includes(id))
            return `<div class="mod"><div><b>${r.name}</b><small>${PIECE_BLUEPRINTS[id] ? 'Decoded: its build card is in build mode now.' : (OTHER_BLUEPRINTS[id] ?? 'Decoded. Build it in a Workshop.')}</small></div></div>`;
          // Blueprints whose finds are still out in the world stay hidden until you have seen what they come from.
          if (r.finds.length && !r.finds.some((f) => save.finds.includes(f)) && id !== 'light') return '';
          // Milestone 10: the trench's own blueprints stay hidden until you have scanned the trench.
          if (r.scans.includes('trench') && !save.scans.includes('trench')) return '';
          if (jobRunning(save, `research:${id}`)) return `<div class="mod"><div><b>${r.name}</b><small>Decoding now.</small></div></div>`;
          const why = researchBlocker(save, r);
          const busy = !!j;
          return `<div class="mod"><div><b>${r.name}</b><small>${why ?? r.text}</small><div class="costs"><span class="cost">${r.seconds} s</span></div></div>
            <button type="button" class="act" data-act="research" data-id="${id}" ${why || busy || !powered ? 'disabled' : ''}>Decode</button></div>`;
        }).join('');
        body += `<h3>Blueprints</h3>${rows}<p>More blueprints wait out in the deeper zones.</p>`;
      } else {
        const rows = GEAR_ORDER.map((id) => {
          const g = GEAR[id];
          if (save.gear.includes(id)) return `<div class="mod"><div><b>${g.name} ${g.code}</b><small>Built and in use. ${g.job}</small></div></div>`;
          if (!save.blueprints.includes(g.blueprint) && id !== 'light') return '';
          const known = save.blueprints.includes(g.blueprint);
          const busy = !!j || jobRunning(save, `build:${id}`);
          const block = known ? gearBlocker(save, id) : null;
          const ok = known && !block && haveFor(save, g.cost) && powered && !busy;
          const kits = KIT_GEAR.includes(id) && save.relayKits ? ` <b>${save.relayKits} carried, ready to plant.</b>` : '';
          return `<div class="mod"><div><b>${known ? `${g.name} ${g.code}` : 'Unknown gear'}</b><small>${known ? (block ? `<b>${block}</b> ` : '') + g.job + kits : 'Decode a blueprint in a Lab to build this.'}</small>${
            known ? `<div class="costs">${costChips(save, g.cost)}<span class="cost">${g.seconds} s</span></div>` : ''
          }</div><button type="button" class="act" data-act="make" data-id="${id}" ${ok ? '' : 'disabled'}>Build</button></div>`;
        }).join('');
        body += `<h3>Gear</h3>${rows}`;
      }
      if (!powered) body += '<p class="why">No power: join it to a current turbine to work.</p>';
    }
    const html = `<div class="head"><b>${code} · ${lab ? 'Lab' : 'Workshop'}</b><span>${powered ? 'powered' : 'no power'}</span>
        <button type="button" class="x" data-act="close" aria-label="Close">✕</button></div>${body}`;
    if (force || html !== this.lastHtml) {
      this.lastHtml = html;
      this.panel.innerHTML = html;
    }
  }
}
