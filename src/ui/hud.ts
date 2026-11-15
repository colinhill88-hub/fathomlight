import { MATERIAL_ORDER, MATERIALS, MaterialId, SaveData, TOTAL_AIR_TANKS, maxOxygen, bagLimits, bagWeight } from '../game/state';
import { SCAN_ENTRIES, entry } from '../game/scanner';
import { SPECIES, SPECIES_ORDER, statusLine } from '../game/creatures';

/**
 * The on-screen interface around the dive watch: carried materials, short
 * messages ("toasts"), the scanner log panel, the blackout screen, the
 * low-oxygen warning and the marker that points to a dropped sample bag.
 * Plain HTML on top of the game canvas, kept small so it does not compete
 * with the scene.
 */

/** Small icons for each material, drawn as SVG. */
export const MATERIAL_ICONS: Record<MaterialId, string> = {

  scrap:
    '<svg viewBox="0 0 24 24"><path d="M3 10l6-4 11 2 2 6-7 5-11-3z" fill="#7a685a"/><path d="M3 10l6-4 11 2-1 2-10-2-5 3z" fill="#b0a8a0" opacity=".5"/><circle cx="8" cy="12" r="1.4" fill="#8a3a20"/><circle cx="15" cy="13" r="2" fill="#8a3a20" opacity=".8"/></svg>',
  copper:
    '<svg viewBox="0 0 24 24"><ellipse cx="11" cy="14" rx="8" ry="6" fill="#6e5440"/><ellipse cx="15" cy="11" rx="5" ry="4" fill="#7d6048"/><circle cx="8" cy="12" r="2" fill="#5f9a72"/><circle cx="14" cy="16" r="1.6" fill="#5f9a72"/><ellipse cx="10" cy="10" rx="2.4" ry="1.2" fill="#d99a62"/></svg>',
  quartz:
    '<svg viewBox="0 0 24 24"><path d="M10 21V8l2-5 2 5v13z" fill="#e8ecdf"/><path d="M12 3l2 5v13h-2z" fill="#a9b5ad"/><path d="M5 21v-8l2-3 2 3v8z" fill="#dfe5d8"/><path d="M15 21v-7l2-3 2 3v7z" fill="#cfd8cc"/></svg>',
  fibre:
    '<svg viewBox="0 0 24 24"><g stroke="#c9a24a" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M12 18C10 12 6 9 4 5"/><path d="M12 18c0-6 0-10 0-14"/><path d="M12 18c2-6 6-9 8-13"/><path d="M12 18C9 14 7 13 5 11" stroke="#a4823a"/><path d="M12 18c3-4 5-5 7-7" stroke="#a4823a"/></g><ellipse cx="12" cy="19" rx="4" ry="2.4" fill="#8a6d32"/></svg>',
};

export class Hud {
  private chips = document.getElementById('inventory')!;
  private toasts = document.getElementById('toasts')!;
  private logBtn = document.getElementById('log-btn')!;
  private logPanel = document.getElementById('log-panel')!;
  private blackout = document.getElementById('blackout')!;
  private blackoutText = document.getElementById('blackout-text')!;
  private lowO2 = document.getElementById('low-o2')!;
  private bagMarker = document.getElementById('bag-marker')!;
  private bagDist = document.getElementById('bag-dist')!;
  private banner = document.getElementById('banner')!;
  private scanBtn = document.getElementById('btn-scan')!;
  private scanLabel = document.getElementById('scan-label')!;
  private collectBtn = document.getElementById('btn-collect')!;
  private collectLabel = document.getElementById('collect-label')!;
  private tagLayer = document.getElementById('tags')!;
  private tagPool: { el: HTMLElement; name: HTMLElement; text: HTMLElement; key: string }[] = [];
  private chipEls = new Map<MaterialId, { el: HTMLElement; count: HTMLElement; stored: HTMLElement }>();
  private bannerText = '';

  constructor(private readonly getSave: () => SaveData) {
    for (const id of MATERIAL_ORDER) {
      const el = document.createElement('div');
      el.className = 'chip';
      el.title = MATERIALS[id].name;
      el.innerHTML = `${MATERIAL_ICONS[id]}<span></span><small></small>`;
      this.chips.appendChild(el);
      this.chipEls.set(id, { el, count: el.querySelector('span')!, stored: el.querySelector('small')! });
    }
    this.logBtn.addEventListener('click', () => {
      const open = this.logPanel.hidden;
      this.logPanel.hidden = !open;
      this.logBtn.setAttribute('aria-expanded', String(open));
      if (open) {
        // Only one panel at a time.
        const settings = document.getElementById('settings-panel')!;
        if (!settings.hidden) document.getElementById('settings-btn')!.click();
        this.renderLog();
      }
    });
    document.getElementById('settings-btn')!.addEventListener('click', () => {
      if (!this.logPanel.hidden) {
        this.logPanel.hidden = true;
        this.logBtn.setAttribute('aria-expanded', 'false');
      }
    });
    this.refreshInventory();
  }

  refreshInventory(bump?: MaterialId): void {
    const { bag, stored } = this.getSave();
    for (const id of MATERIAL_ORDER) {
      const c = this.chipEls.get(id)!;
      c.count.textContent = String(bag[id]);
      // Materials in the base's storage show as a small "+N" (safe from blackouts).
      c.stored.textContent = stored[id] ? `+${stored[id]}` : '';
      c.el.classList.toggle('empty', bag[id] === 0 && stored[id] === 0);
      if (bump === id) {
        c.el.classList.remove('bump');
        void c.el.offsetWidth; // restart the animation
        c.el.classList.add('bump');
      }
    }
    if (!this.logPanel.hidden) this.renderLog();
  }

  toast(text: string, kind: 'item' | 'scan' | 'big' | 'warn' = 'item'): void {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    this.toasts.appendChild(el);
    while (this.toasts.children.length > 4) this.toasts.firstElementChild!.remove();
    const life = kind === 'big' ? 4200 : kind === 'scan' ? 3200 : 2200;
    setTimeout(() => el.classList.add('fade'), life);
    setTimeout(() => el.remove(), life + 700);
  }

  /** A message that stays on screen while a condition holds (empty string hides it). */
  setBanner(text: string): void {
    if (text === this.bannerText) return;
    this.bannerText = text;
    this.banner.textContent = text;
    this.banner.classList.toggle('show', !!text);
  }

  renderLog(): void {
    const save = this.getSave();
    const done = new Set(save.scans);
    const rows = SCAN_ENTRIES.map((e) => {
      const ok = done.has(e.id);
      return `<li class="${ok ? 'ok' : 'unknown'}"><div class="row"><b>${ok ? e.name : 'Unknown'}</b><span>${e.category}</span></div>${
        ok ? `<p>${e.text}</p>` : ''
      }</li>`;
    }).join('');
    const mats = MATERIAL_ORDER.map(
      (id) =>
        `<li class="mat">${MATERIAL_ICONS[id]}<div><b>${MATERIALS[id].plural}: ${save.bag[id]} carried${
          save.stored[id] ? `, ${save.stored[id]} stored` : ''
        }</b><p>${MATERIALS[id].blurb} ${MATERIALS[id].kg} kg each.</p></div></li>`,
    ).join('');
    const lim = bagLimits(save);
    const kg = bagWeight(save.bag);
    const counts: Record<string, number> = {};
    for (const p of save.pieces) if (p.progress === undefined) counts[p.kind] = (counts[p.kind] ?? 0) + 1;
    const frames = save.pieces.filter((p) => p.progress !== undefined).length;
    const names: [string, string][] = [
      ['dome', 'Dome habitat'],
      ['turbine', 'Current turbine'],
      ['storage', 'Storage pod'],
      ['corridor', 'Corridor'],
      ['tank', 'Creature tank'],
      ['filter', 'Filter pump'],
    ];
    const base = save.pieces.length
      ? [
          ...names.filter(([k]) => counts[k]).map(([k, n]) => `${counts[k]} × ${n}`),
          ...(frames ? [`${frames} frame${frames > 1 ? 's' : ''} being welded`] : []),
        ].join(' · ')
      : 'Nothing built yet. Swim to the Kestrel buoy and tap Build.';
    this.logPanel.innerHTML = `
      <h2>Scanner log <small>${done.size} / ${SCAN_ENTRIES.length}</small></h2>
      <ul class="log">${rows}</ul>
      <h2>Materials</h2>
      <p class="note">Dive bag: ${kg.toFixed(1)} kg of ${lim.max} kg. Past ${lim.rated} kg you swim and climb slower, sink when still and use more air. Unload at a storage pod.</p>
      <ul class="log">${mats}</ul>
      <h2>Outpost Kestrel</h2>
      <p class="note">${base}</p>
      <p class="note">${
        save.drone === 'active'
          ? 'Build drone KD-1: repaired. It welds every frame you place.'
          : 'Build drone: missing. It was lost near the survey sled wreck in the sand channel.'
      }</p>
      <h2>Creatures</h2>
      ${this.creatureNotes(save)}
      <p class="note">Air tank upgrades found: ${save.tanks.length} / ${TOTAL_AIR_TANKS} · Dive time ${maxOxygen(save)} s</p>`;
  }

  private creatureNotes(save: SaveData): string {
    const rows = save.creatures
      .map((c) => `<li class="ok"><div class="row"><b>${c.stage === 'egg' ? `${SPECIES[c.species].name} eggs` : SPECIES[c.species].name}${c.stage === 'young' ? ' (young)' : ''}</b><span>Tank</span></div><p>${statusLine(save, c)}</p></li>`)
      .join('');
    const dormant = SPECIES_ORDER.filter((s) => save.dormant[s])
      .map((s) => `${save.dormant[s]} ${SPECIES[s].name.toLowerCase()}`)
      .join(', ');
    return `${rows ? `<ul class="log">${rows}</ul>` : '<p class="note">No creatures kept yet. Scan a creature, then hold Collect by a young one (or a glowfin egg clutch) to put it in the specimen jar, and bring it to a creature tank.</p>'}${
      save.jar ? `<p class="note">In the specimen jar: ${save.jar.stage === 'egg' ? SPECIES[save.jar.species].eggName : SPECIES[save.jar.species].youngName}.</p>` : ''
    }${dormant ? `<p class="note">Dormant remains in storage: ${dormant}. A Revival pool could wake them (its blueprint is somewhere on the wreck shelf).</p>` : ''}`;
  }

  /** The specimen jar chip under the watch. */
  setJar(text: string | null): void {
    const el = document.getElementById('jar-chip')!;
    const html = text
      ? `<svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="3" rx="1" fill="#8a9496"/><path d="M6.5 6h11v12a3 3 0 0 1-3 3h-5a3 3 0 0 1-3-3z" fill="#86b3ae" opacity=".5" stroke="#d8e6a0" stroke-width="1"/><circle cx="12" cy="14" r="3" fill="#ffd9a0" opacity=".9"/></svg>${text}`
      : '';
    if (el.innerHTML !== html) el.innerHTML = html;
    el.classList.toggle('show', !!text);
  }

  scanAnnounce(id: string): void {
    const e = entry(id);
    if (e) this.toast(`Scanned: ${e.name}`, 'scan');
    if (!this.logPanel.hidden) this.renderLog();
  }

  /** Show whether the Scan button has something to scan. */
  setScanTarget(id: string | null, progress: number): void {
    this.scanBtn.classList.toggle('ready', !!id);
    this.scanBtn.style.setProperty('--p', String(progress));
    const e = id ? entry(id) : null;
    const label = e ? `Unknown ${e.category.toLowerCase()}` : '';
    if (this.scanLabel.textContent !== label) this.scanLabel.textContent = label;
    this.scanLabel.classList.toggle('show', !!e);
  }

  /** The Collect button: shown only with a material in reach. */
  setCollect(label: string | null, progress: number): void {
    this.collectBtn.classList.toggle('ready', !!label);
    this.collectBtn.style.setProperty('--p', String(progress));
    const text = label ?? '';
    if (this.collectLabel.textContent !== text) this.collectLabel.textContent = text;
    this.collectLabel.classList.toggle('show', !!label);
  }

  /**
   * Name tags over things already in the scanner log (the quick ID after a
   * tap of Scan). Each tag is just the name; the one closest to the diver
   * also shows the first line of its log entry. sx, sy are screen CSS px.
   */
  setTags(tags: { id: string; sx: number; sy: number; detail: boolean; below?: boolean }[], alpha: number): void {
    while (this.tagPool.length < tags.length) {
      const el = document.createElement('div');
      el.className = 'tag';
      const name = document.createElement('span');
      const text = document.createElement('p');
      el.append(name, text);
      this.tagLayer.appendChild(el);
      this.tagPool.push({ el, name, text, key: '' });
    }
    this.tagPool.forEach((t, i) => {
      const tag = tags[i];
      if (!tag) {
        t.el.style.display = 'none';
        return;
      }
      t.el.style.display = '';
      const e = entry(tag.id);
      const key = `${tag.id}|${tag.detail}`;
      if (t.key !== key && e) {
        t.key = key;
        t.name.textContent = e.name;
        t.text.textContent = tag.detail ? e.text.split('. ')[0].replace(/\.?$/, '.') : '';
        t.text.style.display = tag.detail ? '' : 'none';
      }
      t.el.classList.toggle('below', !!tag.below);
      t.el.style.left = `${tag.sx}px`;
      t.el.style.top = `${tag.sy}px`;
      t.el.style.opacity = String(alpha);
    });
  }

  /** 0 = clear, 1 = fully black. */
  setBlackout(amount: number, text: string): void {
    this.blackout.style.opacity = String(amount);
    this.blackout.style.pointerEvents = amount > 0.05 ? 'auto' : 'none';
    if (this.blackoutText.textContent !== text) this.blackoutText.textContent = text;
  }

  setLowOxygen(level: number): void {
    this.lowO2.style.opacity = String(level);
  }

  /** Point at the dropped bag when it is off screen. sx, sy are its screen position in CSS px. */
  setBagMarker(sx: number | null, sy: number, metres: number): void {
    if (sx === null) {
      this.bagMarker.classList.remove('show');
      return;
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const m = 44;
    const onScreen = sx > m && sx < w - m && sy > m && sy < h - m;
    if (onScreen) {
      this.bagMarker.classList.remove('show');
      return;
    }
    // Sit on the edge of an inner frame, clear of the watch and the buttons.
    const L = 150;
    const Rm = 170;
    const T = 70;
    const B = 70;
    const cx = (L + (w - Rm)) / 2;
    const cy = (T + (h - B)) / 2;
    const dx = sx - cx;
    const dy = sy - cy;
    const k = Math.min((w - Rm - L) / 2 / Math.abs(dx || 1), (h - B - T) / 2 / Math.abs(dy || 1));
    this.bagMarker.style.transform = `translate(${cx + dx * k}px, ${cy + dy * k}px)`;
    this.bagMarker.style.setProperty('--a', `${Math.atan2(dy, dx)}rad`);
    this.bagDist.textContent = `${Math.round(metres)} m`;
    this.bagMarker.classList.add('show');
  }
}
