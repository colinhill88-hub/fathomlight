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
import type { JarLook, KitLook } from '../actors/diver';
import type { KitPart } from '../actors/walker';
import { KitPortrait } from './kitPortrait';

/*
 * Phase 15: the Field kit (I, the View button, or the kit button by the log).
 * Phase 17a: the Kit tab's portrait is the real Kestrel rig (kitPortrait.ts),
 * and pointing at a card (hover, tap, or the gamepad's highlight) lights that
 * part up on the body; a part not found yet shows as a dark "???" shape.
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
  /** Phase 17a: the part of Kestrel's body this card lights up in the portrait. */
  part?: KitPart;
}

export interface FieldKitDeps {
  save: () => SaveData;
  openLog: () => void;
  openMap: () => void;
  /** The zone map is the Signal array's: offer it once one is built and powered. */
  canMap: () => boolean;
  onOpenChange: (open: boolean) => void;
  /** Phase 17a: what Kestrel wears (the same look the world's rig uses) and the jar's creature. */
  kitLook: () => KitLook;
  jar: () => JarLook | null;
}

export class FieldKit {
  private el: HTMLDivElement;
  private tab: 'kit' | 'collection' = 'kit';
  open = false;
  private portrait = new KitPortrait();
  /** The card under the mouse, and the one tapped or clicked (it stays lit until another is chosen). */
  private hoverCard: HTMLElement | null = null;
  private chosenId: string | null = null;

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
      if (b.dataset.part) {
        // A tap or click picks the card (again: lets it go), so touch can light parts too.
        this.chosenId = this.chosenId === b.dataset.id ? null : b.dataset.id ?? null;
        this.lightUp();
        return;
      }
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
    this.el.addEventListener('pointerover', (e) => {
      if ((e as PointerEvent).pointerType !== 'mouse') return;
      const c = (e.target as HTMLElement).closest<HTMLElement>('.fk-slot[data-part]');
      if (c !== this.hoverCard) {
        this.hoverCard = c;
        this.lightUp();
      }
    });
    this.el.addEventListener('pointerleave', () => {
      this.hoverCard = null;
      this.lightUp();
    });
    // The gamepad's highlight (PadNav adds .pad-focus to the button it is on).
    new MutationObserver(() => this.lightUp()).observe(this.el, { subtree: true, attributes: true, attributeFilter: ['class'] });
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
    this.chosenId = null;
    this.hoverCard = null;
    this.portrait.setKit(this.deps.kitLook(), this.deps.jar());
    this.render();
    this.portrait.show();
    this.deps.onOpenChange(true);
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.el.hidden = true;
    this.portrait.hide();
    this.deps.onOpenChange(false);
  }

  /** Light the chosen card's part on the portrait: the hovered card first, then the pad's, then a tapped one. */
  private lightUp(): void {
    if (!this.open) return;
    const cards = [...this.el.querySelectorAll<HTMLElement>('.fk-slot[data-part]')];
    const hover = this.hoverCard && this.hoverCard.isConnected ? this.hoverCard : null;
    const pad = cards.find((c) => c.classList.contains('pad-focus')) ?? null;
    const chosen = cards.find((c) => c.dataset.id === this.chosenId) ?? null;
    const card = hover ?? pad ?? chosen;
    for (const c of cards) {
      const on = c === card;
      if (c.classList.contains('lit') !== on) c.classList.toggle('lit', on);
      c.setAttribute('aria-pressed', String(c === chosen));
    }
    const part = (card?.dataset.part as KitPart | undefined) ?? null;
    const known = !card?.classList.contains('unknown');
    this.portrait.highlight(part, known);
    const cap = this.el.querySelector<HTMLElement>('.fk-portrait figcaption');
    if (cap) {
      const base = cap.dataset.base ?? '';
      const text = card ? (known ? card.querySelector('b')?.textContent?.trim() ?? base : '??? · not found yet') : base;
      if (cap.textContent !== text) cap.textContent = text;
    }
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
    // The live portrait canvas survives redraws: put it back in its frame.
    this.el.querySelector('.fk-portrait .fk-rig-box')?.appendChild(this.portrait.canvas);
    this.lightUp();
  }

  private card(sl: Slot): string {
    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const cls = `fk-slot${sl.have ? (sl.dim ? ' dim' : '') : ' unknown'}`;
    const inner = `<div class="fk-icon">${emblemSvg(sl.icon)}</div>
      <div class="fk-text"><b>${sl.have ? esc(sl.name) : '???'}${sl.have && sl.code ? ` <span class="fk-code">${esc(sl.code)}</span>` : ''}</b><small>${sl.have ? esc(sl.line) : 'Not found yet'}</small></div>`;
    // Phase 17a: cards for something Kestrel wears are buttons (hover, tap or pad) that light it on the portrait.
    if (sl.part) return `<button type="button" class="${cls}" data-part="${sl.part}" data-id="${sl.part}" aria-pressed="false">${inner}</button>`;
    return `<div class="${cls}">${inner}</div>`;
  }

  private kitTab(s: SaveData): string {
    const g = (id: GearId) => s.gear.includes(id);
    const gear = (id: GearId, icon: RewardIcon, line: string, part?: KitPart): Slot => ({ icon, name: GEAR[id].name, code: GEAR[id].code, line, have: g(id), part });
    const suit: Slot = g('psuit2')
      ? { icon: 'suit', name: 'Pressure suit', code: 'PS-2', line: `Safe to ${CRUSH.ps2} m`, have: true, part: 'suit' }
      : g('psuit')
        ? { icon: 'suit', name: 'Pressure suit', code: 'PS-1', line: `Safe to ${CRUSH.ps1} m`, have: true, part: 'suit' }
        : { icon: 'suit', name: 'Kestrel salvage suit', line: `Safe to ${CRUSH.kestrel} m`, have: true, part: 'suit' };
    const th = s.kit.thruster;
    const thruster: Slot = g('dash')
      ? { icon: 'thruster', name: 'Dash head', code: 'TH-3', line: 'Boost, and double-tap to dash', have: true, part: 'thruster' }
      : th >= 2
        ? { icon: 'thruster', name: 'Twin-nozzle head', code: 'TH-2', line: 'A faster, longer boost', have: true, part: 'thruster' }
        : { icon: 'thruster', name: 'Hip thruster', code: 'TH-1', line: 'Boost through the water', have: th >= 1, part: 'thruster' };
    const tanks = s.tanks.length;
    const diver: Slot[] = [
      suit,
      { icon: 'tank', name: 'Air supply', line: `${maxOxygen(s)} s of air · ${tanks}/${TOTAL_AIR_TANKS} upgrades (+${TANK_BONUS} s each)`, have: true, part: 'tanks' },
      g('light') ? gear('light', 'light', 'Wide beam for dark caves', 'light') : { icon: 'light', name: 'Shoulder lamp', line: 'A small lamp. Something brighter exists.', have: true, part: 'light' },
      thruster,
      { icon: 'jar', name: g('satchel') ? 'Jar and satchel' : 'Specimen jar', code: g('satchel') ? 'SJ-2' : undefined, line: g('satchel') ? 'Carry two creatures at once' : 'Carry one egg or young creature', have: s.kit.jar, part: 'jar' },
      gear('cutter', 'cutter', 'Kelp walls and welded hatches'),
      gear('tow', 'gear', 'Reel to anchor rings, swing across gaps', 'harpoon'),
      gear('sonar', 'sonar', 'Find hollows, send lurkers home'),
      gear('boots', 'boots', 'Clamp on to walk the seabed, out of the current', 'boots'),
      gear('visor', 'suit', 'See finds through rock', 'visor'),
      gear('cowl', 'suit', 'Vent heat scalds far less', 'cowl'),
      gear('flare', 'light', 'Light dark water ahead', 'flare'),
      gear('dart', 'gear', 'Stun a predator', 'dart'),
      gear('resonator', 'fragment', "Sings the Choir's song", 'resonator'),
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
      <figure class="fk-portrait"><div class="fk-rig-box"></div><figcaption data-base="Kestrel · ${suit.code ?? 'salvage suit'} · ${maxOxygen(s)} s air">Kestrel · ${suit.code ?? 'salvage suit'} · ${maxOxygen(s)} s air</figcaption></figure>
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
