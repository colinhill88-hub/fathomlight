import { BaseLayout, isDone, pieceCode, PIECES, Placed } from '../game/base';
import { creaturesIn, HUNGER_RATE, isHappy, makeRate, SPECIES, thrivingTanks } from '../game/creatures';
import {
  Factory,
  FEEDER_MASH_CAP,
  FEEDER_RATE,
  feederStatus,
  HOPPER_CAP,
  lineCode,
  lineRate,
  LINES,
  machineData,
  MASH_PER_FIBRE,
  mashPerCreature,
  PLATE_RECIPE,
  PRESS_COPPER_CAP,
  PRESS_PLATE_CAP,
  PRESS_RATE,
  PRESS_SCRAP_CAP,
  pressStatus,
  stuckInTray,
  tierOf,
  TRAY_CAP,
  trayCount,
  TROUGH_CAP,
  whorlMult,
} from '../game/factory';
import { MATERIAL_ORDER, MATERIALS, MaterialId, SaveData } from '../game/state';
import { MATERIAL_ICONS } from './hud';

/**
 * The whole-base rates overview (milestone 5 part 2): for every material,
 * how much the base makes and uses per minute right now, the difference and
 * what is in storage; then every machine and every line with its load.
 *
 * Built for a PC screen (a wide table with the sources spelled out), and it
 * stays readable on a phone in landscape: the table keeps five narrow
 * columns, the source notes wrap under each row, and the panel scrolls.
 * Opened from build mode (the Rates button, or O on a keyboard).
 */

type Row = MaterialId | 'mash';

interface Flow {
  made: number;
  used: number;
  /** Who makes and uses it, for the small notes under each row. */
  from: Map<string, number>;
  to: Map<string, number>;
}

/** Everything the overview shows, worked out from the base as it is now. */
export interface BaseRates {
  rows: Map<Row, Flow>;
  /** Stored amount per row (mash: litres in feeder tanks and troughs). */
  stored: Map<Row, number>;
  /** Items waiting in tank trays and machine hoppers (not yet in storage). */
  holding: Map<Row, number>;
  handFed: number;
}

export function baseRates(save: SaveData, layout: BaseLayout, factory: Factory): BaseRates {
  const rows = new Map<Row, Flow>();
  const row = (k: Row) => {
    let r = rows.get(k);
    if (!r) rows.set(k, (r = { made: 0, used: 0, from: new Map(), to: new Map() }));
    return r;
  };
  const add = (k: Row, side: 'made' | 'used', who: string, n: number) => {
    if (n <= 0) return;
    const r = row(k);
    r[side] += n;
    const m = side === 'made' ? r.from : r.to;
    m.set(who, (m.get(who) ?? 0) + n);
  };
  for (const k of [...MATERIAL_ORDER, 'mash' as const]) row(k);
  const thriving = thrivingTanks(save, layout);
  let handFed = 0;
  for (const p of layout.pieces) {
    if (!isDone(p)) continue;
    const mult = whorlMult(save, p.id);
    if (p.kind === 'tank') {
      const piped = save.lines.some((l) => l.kind === 'pipe' && l.to === p.id);
      for (const c of creaturesIn(save, p.id)) {
        if (c.stage === 'egg') continue;
        const sp = SPECIES[c.species];
        if (c.stage === 'grown' && isHappy(save, c)) add(sp.makes, 'made', `${sp.name.toLowerCase()}s`, makeRate(save, layout, c, thriving).perMin);
        if (piped) add('mash', 'used', `${sp.name.toLowerCase()}s`, mashPerCreature(HUNGER_RATE) * mult);
        else handFed++;
      }
    } else if (p.kind === 'feeder' && factory.feederState.get(p.id) === 'running') {
      const r = FEEDER_RATE * mult;
      add('fibre', 'used', pieceCode(layout, p), r);
      add('mash', 'made', pieceCode(layout, p), r * MASH_PER_FIBRE);
    } else if (p.kind === 'press' && factory.pressState.get(p.id) === 'running') {
      const r = PRESS_RATE * mult;
      add('plate', 'made', pieceCode(layout, p), r);
      for (const k of MATERIAL_ORDER) add(k, 'used', pieceCode(layout, p), r * (PLATE_RECIPE[k] ?? 0));
    }
  }
  const stored = new Map<Row, number>();
  const holding = new Map<Row, number>();
  for (const k of MATERIAL_ORDER) stored.set(k, save.stored[k]);
  let mash = 0;
  for (const p of layout.pieces) {
    const m = save.machines[String(p.id)];
    if (p.kind === 'feeder' && m) {
      mash += m.mash;
      holding.set('fibre', (holding.get('fibre') ?? 0) + Math.floor(m.fibre));
    }
    if (p.kind === 'press' && m) {
      holding.set('scrap', (holding.get('scrap') ?? 0) + (m.scrap ?? 0));
      holding.set('copper', (holding.get('copper') ?? 0) + (m.copper ?? 0));
      holding.set('plate', (holding.get('plate') ?? 0) + (m.plate ?? 0));
    }
    if (p.kind === 'tank') {
      const td = save.tankData[String(p.id)];
      mash += td?.mash ?? 0;
      for (const k of MATERIAL_ORDER) if (td?.out?.[k]) holding.set(k, (holding.get(k) ?? 0) + td.out[k]!);
    }
  }
  stored.set('mash', mash);
  return { rows, stored, holding, handFed };
}

/** 0.25, 1.5, 12 */
function fmt(n: number): string {
  if (Math.abs(n) < 0.005) return '0';
  const a = Math.abs(n);
  const s = a < 1 ? a.toFixed(2).replace(/0$/, '') : a < 10 ? a.toFixed(1).replace(/\.0$/, '') : String(Math.round(a));
  return n < 0 ? `−${s}` : s;
}

const MASH_ICON =
  '<svg viewBox="0 0 24 24"><path d="M6 4h12l-1 15a3 3 0 0 1-3 2h-4a3 3 0 0 1-3-2z" fill="#3b4448"/><path d="M7.3 10h9.4l-.7 9a2 2 0 0 1-2 1.5h-4a2 2 0 0 1-2-1.5z" fill="#9aa84a"/><path d="M7.3 10h9.4" stroke="#d8e6a0" stroke-width="1.2"/></svg>';

export class RatesPanel {
  private el = document.getElementById('rates-panel')!;
  private timer = 0;

  constructor(
    private readonly get: () => { save: SaveData; layout: BaseLayout; factory: Factory; capacity: number },
  ) {
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-act="close"]')) this.close();
    });
    window.addEventListener(
      'keydown',
      (e) => {
        if (this.el.hidden) return;
        if (e.key === 'Escape') {
          this.close();
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
  }

  get open(): boolean {
    return !this.el.hidden;
  }

  toggle(): void {
    if (this.el.hidden) this.show();
    else this.close();
  }

  show(): void {
    this.el.hidden = false;
    document.body.classList.add('rates-open');
    this.render();
  }

  close(): void {
    this.el.hidden = true;
    document.body.classList.remove('rates-open');
  }

  /** Refresh twice a second while open. */
  update(dt: number): void {
    if (this.el.hidden) return;
    this.timer += dt;
    if (this.timer < 0.5) return;
    this.timer = 0;
    this.render();
  }

  render(): void {
    const { save, layout, factory, capacity } = this.get();
    const r = baseRates(save, layout, factory);
    const total = MATERIAL_ORDER.reduce((a, k) => a + save.stored[k], 0);
    const notes = (m: Map<string, number>) =>
      [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([who, n]) => `${who}: ${fmt(n)}`)
        .join(' · ');
    const rowHtml = (k: Row) => {
      const f = r.rows.get(k)!;
      const net = f.made - f.used;
      const unit = k === 'mash' ? ' L' : '';
      const name = k === 'mash' ? 'Feed mash' : MATERIALS[k].plural;
      const icon = k === 'mash' ? MASH_ICON : MATERIAL_ICONS[k];
      const hold = r.holding.get(k) ?? 0;
      const st = r.stored.get(k) ?? 0;
      const src = [f.from.size ? `made by ${notes(f.from)}` : '', f.to.size ? `used by ${notes(f.to)}` : ''].filter(Boolean).join('; ');
      const idle = !f.made && !f.used && !st && !hold;
      return `<tr class="${idle ? 'idle' : ''}">
        <th>${icon}<span>${name}</span></th>
        <td class="made">${f.made ? `+${fmt(f.made)}${unit}` : '–'}</td>
        <td class="used">${f.used ? `−${fmt(f.used)}${unit}` : '–'}</td>
        <td class="net ${net > 0.005 ? 'up' : net < -0.005 ? 'down' : ''}">${f.made || f.used ? `${net > 0.005 ? '+' : ''}${fmt(net)}${unit}` : '–'}</td>
        <td class="stock">${k === 'mash' ? `${Math.round(st)} L` : st}${hold ? `<small> +${hold} held</small>` : ''}</td>
      </tr>${src ? `<tr class="src${idle ? ' idle' : ''}"><td colspan="5">${src}</td></tr>` : ''}`;
    };
    const table = `<table class="rates-table">
      <thead><tr><th>Material</th><th>Made /min</th><th>Used /min</th><th>Net /min</th><th>Stored</th></tr></thead>
      <tbody>${[...MATERIAL_ORDER, 'mash' as const].map(rowHtml).join('')}</tbody></table>`;

    // Machines and tanks.
    const mach: string[] = [];
    const sorted = [...layout.pieces].sort((a, b) => a.kind.localeCompare(b.kind) || a.id - b.id);
    for (const p of sorted) {
      const line = this.machineLine(save, layout, factory, p);
      if (line) mach.push(line);
    }
    // Lines, busiest first.
    const lines = save.lines
      .map((l) => {
        const fl = factory.flows.get(l.id);
        const cap = lineRate(l);
        return { l, rate: fl?.rate ?? 0, cap, busy: fl?.busy ?? 0, item: fl?.item ?? null };
      })
      .sort((a, b) => b.rate / b.cap - a.rate / a.cap);
    const byId = new Map(layout.pieces.map((p) => [p.id, p]));
    const lineRows = lines
      .map(({ l, rate, cap, busy, item }) => {
        const a = byId.get(l.from);
        const b = byId.get(l.to);
        const pct = Math.min(100, Math.round((rate / cap) * 100));
        const what = l.kind === 'pipe' ? 'mash' : item ? MATERIALS[item].name.toLowerCase() : 'idle';
        const flat = busy > 0.8 && pct >= 75;
        const up = flat && tierOf(l) < LINES[l.kind].tiers.length;
        return `<li class="${flat ? 'flat' : ''}"><b>${lineCode(l)}</b><span class="ends">${a ? pieceCode(layout, a) : '?'} → ${b ? pieceCode(layout, b) : '?'}</span><span class="bar"><i style="width:${pct}%"></i></span><span class="num">${fmt(rate)}/${cap} ${
          l.kind === 'belt' ? 'items' : 'L'
        } · ${what}${up ? ' · upgrade it' : ''}</span></li>`;
      })
      .join('');
    const html = `<div class="rates-head"><h2>Outpost Kestrel · rates per minute</h2><button type="button" data-act="close" aria-label="Close">✕</button></div>
      <p class="rates-note">What the base makes and uses right now. Storage ${total}/${capacity}.${
        r.handFed ? ` ${r.handFed} creature${r.handFed > 1 ? 's are' : ' is'} fed by hand (no feed pipe), not counted here.` : ''
      } "Held" is waiting in tank trays and machine hoppers.</p>
      ${table}
      <div class="rates-cols">
        <section><h3>Machines and tanks</h3>${mach.length ? `<ul class="rates-mach">${mach.join('')}</ul>` : '<p class="rates-note">No machines yet.</p>'}</section>
        <section><h3>Lines</h3>${lineRows ? `<ul class="rates-lines">${lineRows}</ul>` : '<p class="rates-note">No conveyors or pipes yet. Select a piece in build mode, then Conveyor to… or Conveyor from….</p>'}</section>
      </div>`;
    if (this.el.innerHTML !== html) {
      const scroll = this.el.scrollTop;
      this.el.innerHTML = html;
      this.el.scrollTop = scroll;
    }
  }

  private machineLine(save: SaveData, layout: BaseLayout, factory: Factory, p: Placed): string | null {
    const code = pieceCode(layout, p);
    const mult = whorlMult(save, p.id);
    const w = mult > 1 ? ` · ×${mult} whorl` : '';
    const frame = !isDone(p);
    if (p.kind === 'feeder') {
      const m = machineData(save, p.id);
      const st = factory.feederState.get(p.id);
      const ok = st === 'running' || st === 'full';
      return `<li class="${ok ? 'ok' : 'bad'}"><b>${code}</b> ${PIECES[p.kind].name}<span>${feederStatus(st)}</span><small>${fmt(FEEDER_RATE * mult)} fibre → ${fmt(
        FEEDER_RATE * mult * MASH_PER_FIBRE,
      )} L/min max${w} · hopper ${Math.floor(m.fibre)}/${HOPPER_CAP} · mash ${Math.round(m.mash)}/${FEEDER_MASH_CAP} L</small></li>`;
    }
    if (p.kind === 'press') {
      const m = machineData(save, p.id);
      const st = factory.pressState.get(p.id);
      const ok = st === 'running' || st === 'full';
      return `<li class="${ok ? 'ok' : 'bad'}"><b>${code}</b> ${PIECES[p.kind].name}<span>${pressStatus(st)}</span><small>${fmt(PRESS_RATE * mult)} plating/min max${w} · ${m.scrap}/${PRESS_SCRAP_CAP} scrap, ${m.copper}/${PRESS_COPPER_CAP} copper · rack ${m.plate}/${PRESS_PLATE_CAP}</small></li>`;
    }
    if (p.kind === 'tank') {
      const cs = creaturesIn(save, p.id);
      if (!cs.length && !frame) return null;
      const td = save.tankData[String(p.id)];
      const tray = trayCount(td);
      const happy = cs.filter((c) => c.stage === 'grown' && isHappy(save, c));
      const make = happy.reduce((a, c) => a + makeRate(save, layout, c).perMin, 0);
      const piped = save.lines.some((l) => l.kind === 'pipe' && l.to === p.id);
      const belt = save.lines.some((l) => l.kind === 'belt' && l.from === p.id);
      const full = tray >= TRAY_CAP;
      const stuck = stuckInTray(save, layout, p.id);
      return `<li class="${full || frame ? 'bad' : 'ok'}"><b>${code}</b> ${cs.length} creature${cs.length === 1 ? '' : 's'}<span>${
        frame ? 'Still a frame' : full ? `Output tray full: making paused${stuck.length ? ` (no conveyor takes its ${stuck.map((k) => MATERIALS[k].name.toLowerCase()).join(', ')})` : ''}` : happy.length ? `${happy.length} making ${fmt(make)}/min${w}` : 'Nothing grown and happy yet'
      }</span><small>tray ${tray}/${TRAY_CAP}${belt ? ' (conveyor out)' : ' (no conveyor)'} · ${piped ? `trough ${Math.round(td?.mash ?? 0)}/${TROUGH_CAP} L` : 'fed by hand'}</small></li>`;
    }
    return null;
  }
}
