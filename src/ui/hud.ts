import { airClock, MODULES } from '../game/sub';
import { MATERIAL_ORDER, MATERIALS, MaterialId, SaveData, TOTAL_AIR_TANKS, maxOxygen, bagLimits, bagWeight } from '../game/state';
import { SCAN_ENTRIES, entry } from '../game/scanner';
import { SPECIES, SPECIES_ORDER, statusLine } from '../game/creatures';
import { discoveryNotes, fieldResearch } from '../game/discovery';
import { GEAR } from '../game/gear';

/**
 * The on-screen interface around the dive watch: carried materials, short
 * messages ("toasts"), the scanner log panel, the blackout screen, the
 * low-oxygen warning and the marker that points to a dropped sample bag.
 * Plain HTML on top of the game canvas, kept small so it does not compete
 * with the scene.
 */

/** Small icons for each material, drawn as SVG. */
export const MATERIAL_ICONS: Record<MaterialId, string> = {
  ore: '<svg viewBox="0 0 24 24"><path d="M3 17l2-7 6-4 7 1 4 6-2 5z" fill="#3e3430"/><circle cx="9" cy="12" r="2.2" fill="#6a5a50"/><circle cx="15" cy="14" r="1.8" fill="#6a6058"/><path d="M8 16l3-4 4 1" stroke="#ff9a40" stroke-width="1.3" fill="none"/></svg>',

  scrap:
    '<svg viewBox="0 0 24 24"><path d="M3 10l6-4 11 2 2 6-7 5-11-3z" fill="#7a685a"/><path d="M3 10l6-4 11 2-1 2-10-2-5 3z" fill="#b0a8a0" opacity=".5"/><circle cx="8" cy="12" r="1.4" fill="#8a3a20"/><circle cx="15" cy="13" r="2" fill="#8a3a20" opacity=".8"/></svg>',
  copper:
    '<svg viewBox="0 0 24 24"><ellipse cx="11" cy="14" rx="8" ry="6" fill="#6e5440"/><ellipse cx="15" cy="11" rx="5" ry="4" fill="#7d6048"/><circle cx="8" cy="12" r="2" fill="#5f9a72"/><circle cx="14" cy="16" r="1.6" fill="#5f9a72"/><ellipse cx="10" cy="10" rx="2.4" ry="1.2" fill="#d99a62"/></svg>',
  quartz:
    '<svg viewBox="0 0 24 24"><path d="M10 21V8l2-5 2 5v13z" fill="#e8ecdf"/><path d="M12 3l2 5v13h-2z" fill="#a9b5ad"/><path d="M5 21v-8l2-3 2 3v8z" fill="#dfe5d8"/><path d="M15 21v-7l2-3 2 3v7z" fill="#cfd8cc"/></svg>',
  fibre:
    '<svg viewBox="0 0 24 24"><g stroke="#c9a24a" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M12 18C10 12 6 9 4 5"/><path d="M12 18c0-6 0-10 0-14"/><path d="M12 18c2-6 6-9 8-13"/><path d="M12 18C9 14 7 13 5 11" stroke="#a4823a"/><path d="M12 18c3-4 5-5 7-7" stroke="#a4823a"/></g><ellipse cx="12" cy="19" rx="4" ry="2.4" fill="#8a6d32"/></svg>',
  plate:
    '<svg viewBox="0 0 24 24"><path d="M3 9l9-4 9 4v7l-9 4-9-4z" fill="#6b777a"/><path d="M3 9l9-4 9 4-9 4z" fill="#a9b4b6"/><path d="M12 13v7l9-4V9z" fill="#4e585b"/><path d="M5.5 9.3l6.5-2.9 6.5 2.9" fill="none" stroke="#c9a24a" stroke-width="1.1"/><circle cx="7" cy="10" r=".9" fill="#3b4448"/><circle cx="12" cy="7.6" r=".9" fill="#3b4448"/><circle cx="17" cy="10" r=".9" fill="#3b4448"/><circle cx="12" cy="12" r=".9" fill="#3b4448"/></svg>',
  resin:
    '<svg viewBox="0 0 24 24"><path d="M12 3c3 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12z" fill="#b8782a"/><path d="M12 6c1.8 3.4 3.6 5.6 3.6 8.6" stroke="#f0c070" stroke-width="1.4" fill="none" opacity=".8"/><ellipse cx="10" cy="15" rx="1.8" ry="2.4" fill="#ffe0a0" opacity=".55"/></svg>',
  brass:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#a8822e"/><circle cx="12" cy="12" r="5" fill="#2c3a3f"/><circle cx="12" cy="12" r="4" fill="#5d7f7a" opacity=".6"/><circle cx="12" cy="4.5" r="1.2" fill="#e8c870"/><circle cx="19.5" cy="12" r="1.2" fill="#e8c870"/><circle cx="12" cy="19.5" r="1.2" fill="#e8c870"/><circle cx="4.5" cy="12" r="1.2" fill="#e8c870"/><path d="M6 8a8 8 0 0 1 6-4" stroke="#7fa88a" stroke-width="1.5" fill="none"/></svg>',
  bloom:
    '<svg viewBox="0 0 24 24"><path d="M12 22c-1-4 0-7 0-9" stroke="#6a7a4a" stroke-width="1.6" fill="none"/><g fill="#fff8e8"><ellipse cx="12" cy="6" rx="3" ry="3.6"/><ellipse cx="7" cy="9.5" rx="3.6" ry="2.8"/><ellipse cx="17" cy="9.5" rx="3.6" ry="2.8"/><ellipse cx="9" cy="13" rx="3" ry="2.4"/><ellipse cx="15" cy="13" rx="3" ry="2.4"/></g><circle cx="12" cy="10" r="2.6" fill="#ffe060"/></svg>',
  moss:
    '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="17" rx="9" ry="4" fill="#4a5a34"/><circle cx="7" cy="14" r="3" fill="#8aa84a"/><circle cx="12" cy="12.5" r="3.6" fill="#a8c860"/><circle cx="17" cy="14" r="3" fill="#8aa84a"/><circle cx="9" cy="12" r="1" fill="#f0f8b0"/><circle cx="14" cy="11" r="1.1" fill="#f0f8b0"/><circle cx="17.5" cy="13" r=".8" fill="#f0f8b0"/></svg>',
};

/** The submersible line in the log (milestone 6). */
function subNote(save: SaveData): string {
  const s = save.sub;
  if (!s) return 'Submersible: not built. Build a Moon pool dock (it takes hull plating from a plate press), then build the sub there.';
  if (s.stage === 'frame') return `Submersible KS-1: frame in the dock, ${Math.floor((s.progress ?? 0) * 100)}% welded.`;
  const mods = s.modules.length ? s.modules.map((m) => MODULES[m].name.toLowerCase()).join(', ') : 'no modules yet';
  return `Submersible KS-1: hull ${Math.round(s.hull * 100)}%, air ${airClock(s.air)}, ${mods}. ${s.docked ? 'Berthed at the Moon pool dock.' : 'Out on the reef.'}`;
}

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
  /** Phase 13: the actions on offer this frame, read by the control helper. */
  collectOffer: { label: string; tap: boolean } | null = null;
  scanOffer: string | null = null;
  boardOffer: string | null = null;
  collectInfo: string | null = null;

  constructor(private readonly getSave: () => SaveData) {
    for (const id of MATERIAL_ORDER) {
      const el = document.createElement('div');
      // Hull plating (made at the base) and the kelp forest materials: their chips hide until there is some.
      el.className = id === 'plate' || id === 'resin' || id === 'moss' || id === 'brass' || id === 'bloom' ? 'chip optional' : 'chip';
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

  /** Phase 14: the inventory chip for a material, for the pickup flare. */
  chip(id: MaterialId): HTMLElement | null {
    return this.chipEls.get(id)?.el ?? null;
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
    // After milestone 8 part 2 (Colin: messages vanished too fast): longer messages
    // stay longer, about a quarter of a second a word, and a tap dismisses one.
    const words = text.split(/\s+/).length;
    const base = kind === 'big' ? 4200 : kind === 'scan' ? 3200 : 2200;
    const life = Math.min(14000, Math.max(base, words * (kind === 'big' || kind === 'warn' ? 280 : 200)));
    setTimeout(() => el.classList.add('fade'), life);
    setTimeout(() => el.remove(), life + 700);
    el.addEventListener('click', () => el.remove());
  }

  private readEl: HTMLDivElement | null = null;
  /** True while a log or document is open for reading (the game pauses the air clock). */
  get reading(): boolean {
    return !!this.readEl;
  }
  /** After milestone 8 part 2: logs and documents open in a panel that stays until closed. */
  showReading(title: string, body: string, note = ''): void {
    this.readEl?.remove();
    const el = document.createElement('div');
    el.id = 'read-panel';
    el.setAttribute('role', 'dialog');
    el.innerHTML = `<div class="read-card"><h2></h2><div class="read-body"></div><p class="read-note"></p><button type="button">Close</button></div>`;
    el.querySelector('h2')!.textContent = title;
    const bodyEl = el.querySelector('.read-body')!;
    for (const para of body.split('\n\n')) {
      const p = document.createElement('p');
      p.textContent = para;
      bodyEl.appendChild(p);
    }
    el.querySelector('.read-note')!.textContent = note;
    const close = () => {
      el.remove();
      if (this.readEl === el) this.readEl = null;
    };
    el.querySelector('button')!.addEventListener('click', close);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    window.addEventListener(
      'keydown',
      function onKey(e: KeyboardEvent) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          close();
          window.removeEventListener('keydown', onKey);
        }
      },
    );
    document.body.appendChild(el);
    this.readEl = el;
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
    const discoveries = discoveryNotes(save);
    const research = fieldResearch(save);
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
      ['feeder', 'Auto feeder'],
      ['press', 'Plate press'],
      ['dock', 'Moon pool dock'],
      ['lab', 'Lab'],
      ['workshop', 'Workshop'],
      ['gtank', 'Grand tank'],
      ['sorter', 'Sorting pod'],
      ['recomp', 'Recompression room'],
      ['crane', 'Salvage crane'],
      ['hatch', 'Hatchery'],
      ['farm', 'Kelp farm'],
      ['revive', 'Revival pool'],
      ['shaft', 'Riser shaft'],
      ['junction', 'Cross junction'],
      ['lantern', 'Choir lantern'],
      ['bracket', 'Cliff bracket'],
    ];
    const base = save.pieces.length
      ? [
          ...names.filter(([k]) => counts[k]).map(([k, n]) => `${counts[k]} × ${n}`),
          ...(frames ? [`${frames} frame${frames > 1 ? 's' : ''} being welded`] : []),
          ...(save.lines.length
            ? [
                ['CB-1', 'CB-2', 'FL-1', 'FL-2']
                  .map((code) => {
                    const n = save.lines.filter((l) => `${l.kind === 'belt' ? 'CB' : 'FL'}-${l.tier ?? 1}` === code).length;
                    return n ? `${n} × ${code} ${code.startsWith('CB') ? 'conveyor' : 'feed pipe'}` : '';
                  })
                  .filter(Boolean)
                  .join(', '),
              ]
            : []),
        ].join(' · ')
      : 'Nothing built yet. Swim to the Kestrel buoy and tap Build.';
    this.logPanel.innerHTML = `
      <h2>Scanner log <small>${done.size} / ${SCAN_ENTRIES.length}</small></h2>
      ${discoveries.length ? `<h3>Field notes</h3><ul class="note">${discoveries.map(note => `<li>${note}</li>`).join('')}</ul>` : ''}
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
      <p class="note">${subNote(save)}</p>
      <h2>Gear and blueprints</h2>
      ${research.length ? `<p class="note">Ready to decode at the Lab · ${research.map(item => item.name).join(' · ')}</p>` : ''}
      <p class="note">${
        save.gear.includes('light')
          ? 'Dive light DL-1: built and in use. It opens the dark cave in the east cliff.'
          : save.blueprints.includes('light')
            ? `Dive light blueprint decoded: build it in a Workshop (${GEAR.light.cost.plate} hull plating, ${GEAR.light.cost.quartz} quartz, ${GEAR.light.cost.copper} copper).`
            : save.finds.includes('recorder')
              ? 'Carrying the SLED 2 recorder: decode it in a Lab.'
              : 'The survey sled wreck\'s recorder holds a dive light design. Scan the sled, then unclip the recorder.'
      }</p>
      <p class="note">${save.boomOpen ? 'Survey boom gate: open. The sub can cross into the kelp forest.' : 'Survey boom gate: closed. Its winch is on the kelp forest side.'}</p>
      ${this.cavesNotes(save)}
      ${this.trenchNotes(save)}
      <h2>Creatures</h2>
      ${this.creatureNotes(save)}
      <p class="note">Air tank upgrades found: ${save.tanks.length} / ${TOTAL_AIR_TANKS} · Dive time ${maxOxygen(save)} s</p>
      <p class="note">Echo whorls found: ${save.whorls.length}${
        save.whorls.length ? ` (${Object.values(save.fitted).reduce((a, b) => a + b, 0)} fitted)` : ''
      }. Rare; they glow in colours nothing else on the reef does.</p>`;
  }

  /** Milestone 10: the trench's gear, the cleft and the Choir's signal fragments. */
  private trenchNotes(save: SaveData): string {
    if (!save.scans.includes('trench') && !save.tips.includes('trench')) return '';
    const suit = save.gear.includes('psuit2') ? 'PS-2 (110 m)' : save.gear.includes('psuit') ? 'PS-1 (60 m)' : 'the Kestrel suit (30 m)';
    const sub = save.sub ? (save.sub.plating ? 'KS-1 with depth plating (120 m)' : 'KS-1 (45 m)') : 'no sub yet';
    const n = save.signals.decoded.length;
    return `<h2>The trench</h2>
      <p class="note">Crush depth: you wear ${suit}; ${sub}.</p>
      <p class="note">Signal fragments: ${save.signals.found.length} of 4 spools found, ${n} decoded${n ? ' (read them above, as Artefacts)' : ''}. A Signal array reads them once your grown creatures show enough different glow patterns.</p>${
        n >= 4 || save.gear.includes('resonator')
          ? `<h2>The sanctum</h2>
      <p class="note">The resonator: ${save.gear.includes('resonator') ? 'built and worn' : 'all four fragments decoded: build it in a Workshop'}.</p>
      <p class="note">The door in the trench floor's far east end: ${save.sanctum.door ? 'open' : 'shut'}. Song-locks: ${save.sanctum.locks.filter(Boolean).length} of 2 sung open.</p>
      <p class="note">${save.sanctum.contact ? 'First contact made. A Choir gate in the antechamber carries you home, and its twin by the Kestrel buoy brings you back.' : 'The Choir waits in the heart, on the floor of the deepest pool.'}</p>`
          : ''
      }`;
  }

  /** Milestone 7 part 2: what is left to find and make from the kelp caves. */
  private cavesNotes(save: SaveData): string {
    if (!save.gear.includes('light')) return '';
    const finds: [string, string, string, string][] = [
      ['relaylog', 'relay', 'KS RELAY 2 log (in the caves\' first hall)', 'Air relay AR-1'],
      ['weldchip', 'welder', 'KD WELD chip (past the cold surge)', 'DR-2 welder'],
      ['towcoil', 'tow', 'rope store notes (up from the junction)', 'Grapple line'],
      ['cache', 'cutter', 'survey cache (beyond the black water)', 'Cutter torch'],
    ];
    const rows = finds
      .map(([f, bp, where, what]) => {
        const g = save.gear.includes(bp as never) || (bp === 'relay' && (save.relayKits > 0 || save.relays.length > 0));
        const state = g
          ? 'built'
          : save.blueprints.includes(bp as never)
            ? 'blueprint decoded: build it in a Workshop'
            : save.finds.includes(f as never)
              ? 'carrying the find: decode it in a Lab'
              : `find the ${where}`;
        return `<li>${what}: ${state}</li>`;
      })
      .join('');
    const pieces = [
      ['gtank', 'Grand tank GT-1 (scan the tinker crab, lantern shrimp and giant kelp, then decode it in a Lab)'],
      ['sorter', 'Sorting pod SP-1 (scan giant kelp and bladder kelp, then decode it in a Lab)'],
    ]
      .map(([bp, how]) => `<li>${save.blueprints.includes(bp as never) ? `${how.split(' (')[0]}: build card unlocked` : how}</li>`)
      .join('');
    const lit = save.brackets.filter(Boolean).length;
    const shelf = save.scans.includes('wshelf')
      ? `<p class="note">The wreck shelf: suit integrity ${Math.round(save.suit * 100)}% · sealed hatches opened ${save.hatches.length} / 2${save.gear.includes('tow') ? '' : ' · the race needs a grapple line'}${save.vane ? ' · flow vane raised' : ''}</p><p class="note">The Corvina: ${
          !save.corvina.hatch ? 'deck hatch sealed (grapple her stern bollard, cut the hatch)' : save.corvina.breakers.every(Boolean) ? 'power restored' : `breakers thrown ${save.corvina.breakers.filter(Boolean).length} / 2`
        }${save.scans.includes('cvlog') ? " · log read" : ''}${save.hiddenOpen ? ' · hidden passage found' : ''}</p>`
      : '';
    return `${shelf}<p class="note">The kelp caves:</p><ul class="note">${rows}${pieces}<li>Black water brackets lit: ${lit} / 4</li><li>Kelp wall: ${save.kelpCut ? 'cut open' : 'uncut (needs the cutter torch)'}</li>${
      save.relays.length || save.relayKits ? `<li>Air relays planted: ${save.relays.length}${save.relayKits ? `, ${save.relayKits} kit${save.relayKits > 1 ? 's' : ''} to plant` : ''}</li>` : ''
    }</ul>`;
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
    this.scanOffer = e ? e.category.toLowerCase() : null;
    if (this.scanLabel.textContent !== label) this.scanLabel.textContent = label;
    this.scanLabel.classList.toggle('show', !!e);
  }

  /** The Collect button: shown only with a material in reach. */
  setCollect(label: string | null, progress: number, tap = false, info = false): void {
    // Phase 13: an explanation (a refusal, or what something needs) is not an action for the control helper.
    this.collectOffer = label && !info ? { label, tap } : null;
    this.collectInfo = info ? label : null;
    this.collectLabel.classList.toggle('tap', tap);
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
    this.placeMarker(this.bagMarker, this.bagDist, sx, sy, metres);
  }

  /** Milestone 6: where the parked sub is, when it is off screen. */
  setSubMarker(sx: number | null, sy: number, metres: number): void {
    this.placeMarker(this.subMarker, this.subDist, sx, sy, metres);
  }

  private subMarker = document.getElementById('sub-marker')!;
  private subDist = document.getElementById('sub-dist')!;

  private placeMarker(marker: HTMLElement, dist: HTMLElement, sx: number | null, sy: number, metres: number): void {
    if (sx === null) {
      marker.classList.remove('show');
      return;
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const m = 44;
    const onScreen = sx > m && sx < w - m && sy > m && sy < h - m;
    if (onScreen) {
      marker.classList.remove('show');
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
    marker.style.transform = `translate(${cx + dx * k}px, ${cy + dy * k}px)`;
    marker.style.setProperty('--a', `${Math.atan2(dy, dx)}rad`);
    dist.textContent = `${Math.round(metres)} m`;
    marker.classList.add('show');
  }

  private suitShown = '';
  private suitHitTimer = 0;
  /** Milestone 8: the suit integrity bar under the watch. */
  setSuit(frac: number, show: boolean): void {
    const el = document.getElementById('suit-bar')!;
    const pct = Math.round(frac * 100);
    const cls = frac < 0.35 ? 'red' : frac < 0.7 ? 'amber' : '';
    const key = `${show}|${pct}|${cls}`;
    if (key === this.suitShown) return;
    this.suitShown = key;
    el.classList.toggle('show', show);
    el.classList.toggle('amber', cls === 'amber');
    el.classList.toggle('red', cls === 'red');
    (el.querySelector('.track i') as HTMLElement).style.width = `${pct}%`;
    el.querySelector('b')!.textContent = `${pct}%`;
  }
  private depthShown = '';
  /** Milestone 10: the crush-depth chip: the rated depth, amber within 5 m of it, red past it. */
  setDepthLimit(limitM: number | null, depthM: number, top: number): void {
    const el = document.getElementById('depth-chip')!;
    const state = limitM === null ? 'hide' : depthM > limitM ? 'crush' : depthM > limitM - 5 ? 'near' : 'ok';
    const key = `${state}|${limitM}|${top}`;
    if (key === this.depthShown) return;
    this.depthShown = key;
    el.classList.toggle('show', state !== 'hide');
    el.classList.toggle('near', state === 'near');
    el.classList.toggle('crush', state === 'crush');
    el.style.top = `calc(var(--safe-top) + ${top}px)`;
    if (limitM !== null) {
      el.querySelector('span')!.textContent = state === 'crush' ? 'CRUSH' : 'MAX';
      el.querySelector('b')!.textContent = `${limitM} m`;
    }
  }
  /** A red flash on the suit bar when the diver is bitten. */
  suitHit(): void {
    const el = document.getElementById('suit-bar')!;
    el.classList.add('hit');
    clearTimeout(this.suitHitTimer);
    this.suitHitTimer = window.setTimeout(() => el.classList.remove('hit'), 450);
  }

  /** The sub's status chip under the watch (milestone 6), shown while aboard. */
  setSubChip(html: string | null, warn = false): void {
    const el = document.getElementById('sub-chip')!;
    const text = html ?? '';
    if (el.innerHTML !== text) el.innerHTML = text;
    el.classList.toggle('show', !!html);
    el.classList.toggle('warn', warn);
  }

  /** The Board / Exit button (touch), with its label. */
  setBoard(label: string | null): void {
    this.boardOffer = label;
    const btn = document.getElementById('btn-sub')!;
    btn.classList.toggle('ready', !!label);
    const span = btn.querySelector('span')!;
    if (label && span.textContent !== label) span.textContent = label;
  }
}
