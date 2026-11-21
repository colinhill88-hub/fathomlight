import { isKey } from '../controls/bindings';
import { SPECIES, SPECIES_ORDER } from '../game/creatures';
import { GEAR } from '../game/gear';
import { LODES } from '../game/lodes';
import { SCAN_ENTRIES } from '../game/scanner';
import { FRAGMENTS, vocabulary } from '../game/signals';
import { BASE_OXYGEN, GearId, SaveData, TANK_BONUS, TOTAL_AIR_TANKS, maxOxygen } from '../game/state';
import { MODULES, MODULE_ORDER } from '../game/sub';
import { CRUSH } from '../world/terrain';
import { emblemSvg, type RewardIcon } from './reward';

/*
 * Phase 15: the Field kit (I, the View button, or the kit button by the log).
 * A pause screen in the spirit of an adventure game's gear sub-screen:
 *
 *   Kit         Kestrel drawn wearing what the save has (suit tier, lamp,
 *               thrusters, boots, visor, cowl, jar and satchel, harpoon,
 *               resonator), each piece of gear as a card. Gear not found yet
 *               shows as a dark silhouette with no name: a hint that there is
 *               more out there, without a spoiler. KS-1 and KD-1 beside it.
 *   Collection  Creatures (scanned, kept, grown, bred), the Signal array's
 *               patterns and spools, and the finds that can be counted:
 *               air tanks, echo whorls, scanner log, drill lodes.
 *
 * The world holds still while it is open (main.ts treats it like the pause
 * menu). Esc, I or ✕ closes it; a gamepad's B closes it through PadNav, and
 * LB / RB switch tabs.
 */

const WHORLS_TOTAL = 5;

interface Slot {
  icon: RewardIcon;
  name: string;
  code?: string;
  line: string;
  have: boolean;
  /** Known but not in use (a module in the dock, not fitted). */
  dim?: boolean;
}

export interface FieldKitDeps {
  save: () => SaveData;
  openLog: () => void;
  openMap: () => void;
  /** The zone map is the Signal array's: offer it once one is built and powered. */
  canMap: () => boolean;
  onOpenChange: (open: boolean) => void;
}

export class FieldKit {
  private el: HTMLDivElement;
  private tab: 'kit' | 'collection' = 'kit';
  open = false;

  constructor(private deps: FieldKitDeps) {
    this.el = document.createElement('div');
    this.el.id = 'field-kit';
    this.el.hidden = true;
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'Field kit');
    document.body.appendChild(this.el);
    this.el.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'close') this.close();
      else if (act === 'kit' || act === 'collection') {
        this.tab = act;
        this.render();
      } else if (act === 'log') {
        this.close();
        this.deps.openLog();
      } else if (act === 'map') {
        this.close();
        this.deps.openMap();
      }
    });
    window.addEventListener('keydown', (e) => {
      if (!this.open) return;
      const k = e.key.toLowerCase();
      if (k === 'escape' || isKey('kit', k)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.close();
      }
    }, true);
  }

  toggle(): void {
    if (this.open) this.close();
    else this.show();
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this.el.hidden = false;
    this.render();
    this.deps.onOpenChange(true);
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.el.hidden = true;
    this.deps.onOpenChange(false);
  }

  // ---------------------------------------------------------------------------

  private render(): void {
    const s = this.deps.save();
    const body = this.tab === 'kit' ? this.kitTab(s) : this.collectionTab(s);
    this.el.innerHTML = `<div class="fk-card">
      <header class="fk-head">
        <h2>Field kit</h2>
        <div class="tabs" role="tablist">
          <button type="button" role="tab" data-act="kit" class="tab${this.tab === 'kit' ? ' on' : ''}" aria-selected="${this.tab === 'kit'}">Kit</button>
          <button type="button" role="tab" data-act="collection" class="tab${this.tab === 'collection' ? ' on' : ''}" aria-selected="${this.tab === 'collection'}">Collection</button>
        </div>
        <button type="button" class="fk-close" data-act="close" aria-label="Close">✕</button>
      </header>
      <div class="fk-body">${body}</div>
      <footer class="fk-foot">
        <button type="button" data-act="log">Scanner log</button>
        <button type="button" data-act="map" ${this.deps.canMap() ? '' : 'hidden'}>Zone map</button>
      </footer>
    </div>`;
  }

  private card(sl: Slot): string {
    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `<div class="fk-slot${sl.have ? (sl.dim ? ' dim' : '') : ' unknown'}">
      <div class="fk-icon">${emblemSvg(sl.icon)}</div>
      <div class="fk-text"><b>${sl.have ? esc(sl.name) : '???'}${sl.have && sl.code ? ` <span class="fk-code">${esc(sl.code)}</span>` : ''}</b><small>${sl.have ? esc(sl.line) : 'Not found yet'}</small></div>
    </div>`;
  }

  private kitTab(s: SaveData): string {
    const g = (id: GearId) => s.gear.includes(id);
    const gear = (id: GearId, icon: RewardIcon, line: string): Slot => ({ icon, name: GEAR[id].name, code: GEAR[id].code, line, have: g(id) });
    const suit: Slot = g('psuit2')
      ? { icon: 'suit', name: 'Pressure suit', code: 'PS-2', line: `Safe to ${CRUSH.ps2} m`, have: true }
      : g('psuit')
        ? { icon: 'suit', name: 'Pressure suit', code: 'PS-1', line: `Safe to ${CRUSH.ps1} m`, have: true }
        : { icon: 'suit', name: 'Kestrel salvage suit', line: `Safe to ${CRUSH.kestrel} m`, have: true };
    const th = s.kit.thruster;
    const thruster: Slot = g('dash')
      ? { icon: 'thruster', name: 'Dash head', code: 'TH-3', line: 'Boost, and double-tap to dash', have: true }
      : th >= 2
        ? { icon: 'thruster', name: 'Twin-nozzle head', code: 'TH-2', line: 'A faster, longer boost', have: true }
        : { icon: 'thruster', name: 'Hip thruster', code: 'TH-1', line: 'Boost through the water', have: th >= 1 };
    const tanks = s.tanks.length;
    const diver: Slot[] = [
      suit,
      { icon: 'tank', name: 'Air supply', line: `${maxOxygen(s)} s of air · ${tanks}/${TOTAL_AIR_TANKS} upgrades (+${TANK_BONUS} s each)`, have: true },
      g('light') ? gear('light', 'light', 'Wide beam for dark caves') : { icon: 'light', name: 'Shoulder lamp', line: 'A small lamp. Something brighter exists.', have: true },
      thruster,
      { icon: 'jar', name: g('satchel') ? 'Jar and satchel' : 'Specimen jar', code: g('satchel') ? 'SJ-2' : undefined, line: g('satchel') ? 'Carry two creatures at once' : 'Carry one egg or young creature', have: s.kit.jar },
      gear('cutter', 'cutter', 'Kelp walls and welded hatches'),
      gear('tow', 'gear', 'Reel to anchor rings, swing across gaps'),
      gear('sonar', 'sonar', 'Find hollows, send lurkers home'),
      gear('boots', 'boots', 'Hold Down to brace on the seabed'),
      gear('visor', 'suit', 'See finds through rock'),
      gear('cowl', 'suit', 'Vent heat scalds far less'),
      gear('flare', 'light', 'Light dark water ahead'),
      gear('dart', 'gear', 'Stun a predator'),
      gear('resonator', 'fragment', "Sings the Choir's song"),
    ];
    if (s.relayKits > 0) diver.push({ icon: 'tank', name: 'Air relay kits', code: 'AR-1', line: `${s.relayKits} ready to plant`, have: true });

    const sub = s.sub;
    const built = !!sub && sub.stage === 'built';
    const subSlots: Slot[] = [
      { icon: 'module', name: 'Submersible', code: 'KS-1', line: built ? `Hull ${Math.round(sub!.hull * 100)}% · safe to ${sub!.plating ? CRUSH.plated : CRUSH.sub} m` : sub ? 'A frame in the dock' : 'Built at a Moon pool dock', have: built },
      // Modules show only once KS-1 exists, so the list doesn't fill with blanks before the sub is built.
      ...(!built ? [] : MODULE_ORDER).map((m): Slot => {
        const d = MODULES[m];
        const fitted = built && sub!.modules.includes(m);
        const known = !d.blueprint || s.blueprints.includes(d.blueprint);
        return { icon: 'module', name: d.name, code: d.code, line: fitted ? 'Fitted' : 'Ready to fit at the dock', have: built && known, dim: !fitted };
      }),
    ];
    if (built && sub!.plating) subSlots.push({ icon: 'module', name: 'Depth plating', code: 'DP-S', line: `Safe to ${CRUSH.plated} m`, have: true });
    const drone: Slot[] = [
      { icon: 'drone', name: 'Build drone', code: 'KD-1', line: s.drone === 'active' ? 'Welds what you build' : 'Waiting for repair', have: s.drone === 'active' },
      { icon: 'drone', name: GEAR.welder.name, code: GEAR.welder.code, line: 'Welds about twice as fast', have: g('welder') },
      { icon: 'drone', name: 'Cargo cradle', line: 'Flies your dive bag home', have: !!s.kit.carrier },
    ];
    const count = (l: Slot[]) => `${l.filter((x) => x.have).length}/${l.length}`;
    return `<div class="fk-kit">
      <figure class="fk-portrait">${portrait(s)}<figcaption>Kestrel · ${suit.code ?? 'salvage suit'} · ${maxOxygen(s)} s air</figcaption></figure>
      <div class="fk-lists">
        <h3>Diver <span>${count(diver)}</span></h3>
        <div class="fk-grid">${diver.map((x) => this.card(x)).join('')}</div>
        <h3>KS-1 <span>${count(subSlots)}</span></h3>
        <div class="fk-grid">${subSlots.map((x) => this.card(x)).join('')}</div>
        <h3>KD-1 <span>${count(drone)}</span></h3>
        <div class="fk-grid">${drone.map((x) => this.card(x)).join('')}</div>
      </div>
    </div>`;
  }

  private collectionTab(s: SaveData): string {
    const rows = SPECIES_ORDER.map((id) => {
      const sp = SPECIES[id];
      const known = s.scans.includes(sp.scan);
      const kept = s.creatures.filter((c) => c.species === id);
      const nursery = s.nursery.filter((c) => c.species === id).length;
      const grown = kept.filter((c) => c.stage === 'grown').length;
      const bred = kept.some((c) => (c.traits?.gen ?? 1) >= 2) || s.nursery.some((c) => c.species === id && (c.traits?.gen ?? 1) >= 2);
      const patterns = new Set(kept.filter((c) => c.stage === 'grown').map((c) => c.traits?.pattern ?? 0)).size;
      return `<div class="fk-slot${known ? '' : ' unknown'}">
        <div class="fk-icon">${emblemSvg('creature')}</div>
        <div class="fk-text"><b>${known ? sp.name : '???'}</b><small>${
          known ? `${kept.length + nursery} kept · ${grown} grown${patterns ? ` · ${patterns} pattern${patterns === 1 ? '' : 's'}` : ''}${bred ? ' · bred' : ''}` : 'Not scanned yet'
        }</small></div>
      </div>`;
    }).join('');
    const scans = SCAN_ENTRIES.filter((e) => s.scans.includes(e.id)).length;
    const lodes = LODES.filter((l) => (s.lodeNotes ?? []).includes(l.id)).length;
    const found = s.signals.found.length;
    const decoded = s.signals.decoded.length;
    const vocab = vocabulary(s);
    const next = FRAGMENTS.find((f) => !s.signals.decoded.includes(f.id));
    const stat = (icon: RewardIcon, name: string, have: number, total: number, line: string, choir = false) => `<div class="fk-stat${choir ? ' choir' : ''}">
      <div class="fk-icon">${emblemSvg(icon)}</div>
      <div class="fk-text"><b>${name}</b><small>${line}</small></div>
      <div class="fk-meter"><i style="width:${total ? Math.round((have / total) * 100) : 0}%"></i><span>${have}/${total}</span></div>
    </div>`;
    return `<div class="fk-collection">
      <h3>Creatures</h3>
      <div class="fk-grid">${rows}</div>
      <h3>Finds</h3>
      <div class="fk-stats">
        ${stat('tank', 'Air tank upgrades', s.tanks.length, TOTAL_AIR_TANKS, `${BASE_OXYGEN} s base, +${TANK_BONUS} s each`)}
        ${stat('whorl', 'Echo whorls', s.whorls.length, WHORLS_TOTAL, 'Multiply a tank or feeder', true)}
        ${stat('data', 'Scanner log', scans, SCAN_ENTRIES.length, 'Creatures, plants, wrecks and places')}
        ${stat('gear', 'Drill lodes', lodes, LODES.length, 'First drills of each mineral lode')}
      </div>
      <h3>The Choir's song</h3>
      <div class="fk-stats">
        ${stat('fragment', 'Pattern spools', found, FRAGMENTS.length, 'Found in the deep', true)}
        ${stat('fragment', 'Fragments decoded', decoded, FRAGMENTS.length, next ? `Next needs ${next.need} glow patterns${next.bred ? ` (${next.bred} bred)` : ''} · tanks show ${vocab}` : 'Every fragment is read', true)}
      </div>
    </div>`;
  }
}

/**
 * Kestrel, drawn for the Field kit: the squat salvage shell, a lime dome
 * helmet with its crest, broad gauntlets and short split fins, wearing only
 * the gear the save has.
 */
function portrait(s: SaveData): string {
  const g = (id: GearId) => s.gear.includes(id);
  const ps2 = g('psuit2');
  const ps1 = g('psuit') && !ps2;
  const ring = ps2 ? '#e0772a' : ps1 ? '#c9a24a' : '#5d676c';
  const parts: string[] = [];
  // Back: rebreather tanks, harpoon, resonator hoop.
  if (g('resonator')) parts.push('<circle cx="100" cy="92" r="46" fill="none" stroke="url(#fkChoir)" stroke-width="5" opacity=".9"/><circle cx="100" cy="92" r="52" fill="none" stroke="#6ff3ff" stroke-width="1" opacity=".35"/>');
  parts.push('<rect x="74" y="82" width="15" height="54" rx="7" fill="#c9d3d8"/><rect x="111" y="82" width="15" height="54" rx="7" fill="#c9d3d8"/>');
  if (g('tow') || g('dart')) parts.push(`<path d="M132 70l26 -40" stroke="#8a949a" stroke-width="4" stroke-linecap="round"/><path d="M156 26l8 -4-2 9z" fill="${g('dart') ? '#ffd06a' : '#c9d3d8'}"/>`);
  // Legs and fins (mag-boots: lime soles).
  parts.push(`<rect x="78" y="150" width="19" height="28" rx="8" fill="#2c3236"/><rect x="103" y="150" width="19" height="28" rx="8" fill="#2c3236"/>`);
  // Short split fins (mag-boots: dark plates with lime soles).
  const fin = g('boots') ? '#3a4246' : '#d8492e';
  parts.push(`<path d="M76 176h22l-2 12-6-5-5 7-6-6z" fill="${fin}"/><path d="M102 176h22l3 8-6 6-5-7-6 5z" fill="${fin}"/>`);
  if (g('boots')) parts.push('<rect x="74" y="175" width="26" height="4" rx="2" fill="#c6f56a"/><rect x="100" y="175" width="26" height="4" rx="2" fill="#c6f56a"/>');
  // Body shell.
  parts.push(`<path d="M68 96c0-14 14-22 32-22s32 8 32 22v44c0 10-14 16-32 16s-32-6-32-16z" fill="#2c3236" stroke="#c9d3d8" stroke-width="2.5"/>`);
  parts.push(`<path d="M72 118h56M72 132h56" stroke="${ring}" stroke-width="3"/>`);
  parts.push('<path d="M86 100l6 8 8-12 8 12 6-8" stroke="#c9a24a" stroke-width="1.4" fill="none" opacity=".8"/>');
  parts.push('<circle cx="100" cy="106" r="5" fill="#c9d3d8"/><circle cx="100" cy="106" r="2.4" fill="#d8492e"/>');
  // Belt: jar, satchel, thruster.
  parts.push('<rect x="68" y="140" width="64" height="7" rx="3" fill="#d8492e"/>');
  if (s.kit.jar) parts.push('<rect x="56" y="134" width="12" height="18" rx="4" fill="#9fe0d0" opacity=".55" stroke="#c9d3d8" stroke-width="1.5"/><circle cx="62" cy="144" r="3" fill="#ffd27a"/>');
  if (g('satchel')) parts.push('<rect x="132" y="134" width="12" height="18" rx="4" fill="#9fe0d0" opacity=".55" stroke="#c9d3d8" stroke-width="1.5"/>');
  const th = g('dash') ? 3 : s.kit.thruster;
  if (th > 0) {
    parts.push('<rect x="126" y="112" width="16" height="22" rx="4" fill="#3a4246" stroke="#c9d3d8" stroke-width="1.5"/>');
    for (let i = 0; i < th; i++) parts.push(`<circle cx="134" cy="${116 + i * 7}" r="2.6" fill="#c6f56a"/>`);
  }
  // Arms and gauntlets; flare tube on the left wrist.
  parts.push('<rect x="50" y="92" width="16" height="40" rx="7" fill="#4a5459"/><rect x="134" y="92" width="16" height="40" rx="7" fill="#4a5459"/>');
  parts.push('<rect x="46" y="128" width="24" height="16" rx="6" fill="#d8492e"/><rect x="130" y="128" width="24" height="16" rx="6" fill="#d8492e"/>');
  if (g('flare')) parts.push('<rect x="40" y="116" width="12" height="18" rx="3" fill="#c9a24a"/><circle cx="46" cy="116" r="3" fill="#ffd06a"/>');
  // Shoulder lamp (the dive light is bigger and brighter).
  const lamp = g('light');
  parts.push(`<rect x="${lamp ? 52 : 56}" y="${lamp ? 74 : 78}" width="${lamp ? 20 : 12}" height="${lamp ? 14 : 10}" rx="3" fill="#3a4246" stroke="#c9d3d8" stroke-width="1.2"/>`);
  parts.push(`<circle cx="${lamp ? 52 : 56}" cy="${lamp ? 81 : 83}" r="${lamp ? 5 : 3}" fill="#fff2c0"/>`);
  if (lamp) parts.push('<path d="M48 81l-30-16v32z" fill="#fff2b0" opacity=".28"/>');
  // Collar, helmet, crest, visor band, cowl.
  if (g('cowl')) parts.push('<path d="M64 72c4-20 20-30 36-30s32 10 36 30l-8 8c-6-14-16-20-28-20s-22 6-28 20z" fill="#c9d3d8"/>');
  parts.push(`<rect x="74" y="66" width="52" height="12" rx="5" fill="${ps2 ? '#e0772a' : '#c9d3d8'}"/>`);
  parts.push('<path d="M78 68c0-18 10-30 22-30s22 12 22 30z" fill="#c6f56a" opacity=".85"/>');
  parts.push('<path d="M100 22c7 4 10 10 10 17-4-4-6-5-10-6z" fill="#c6f56a"/>');
  parts.push('<path d="M86 62c1-10 6-17 13-19" stroke="#f4ffd8" stroke-width="3" fill="none" opacity=".75"/>');
  parts.push('<circle cx="96" cy="56" r="7" fill="#e6c3a0" opacity=".7"/>');
  if (g('visor')) parts.push('<path d="M80 54h40" stroke="#c6f56a" stroke-width="3.5" opacity=".95"/><path d="M80 54h40" stroke="#f6ffe0" stroke-width="1" />');
  return `<svg viewBox="0 8 200 190" role="img" aria-label="Kestrel's gear"><defs><linearGradient id="fkChoir" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6ff3ff"/><stop offset=".5" stop-color="#b07cff"/><stop offset="1" stop-color="#ff6ad5"/></linearGradient><radialGradient id="fkGlow"><stop offset="0" stop-color="#c9a24a" stop-opacity=".22"/><stop offset="1" stop-color="#c9a24a" stop-opacity="0"/></radialGradient></defs><circle cx="100" cy="110" r="96" fill="url(#fkGlow)"/>${parts.join('')}</svg>`;
}
