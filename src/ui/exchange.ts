import { BaseLayout, pieceCode } from '../game/base';
import { DECOR } from '../game/collection';
import { claimContract, ensureContracts, readyContractCount, recordContractEvent, syncHarmonyContracts } from '../game/contracts';
import { creatureName, SPECIES, tanks } from '../game/creatures';
import {
  applyTonic,
  buyExchangeDecor,
  buyMysteryEgg,
  buySupply,
  creatureValue,
  creditsOf,
  discoveredSpecies,
  dispatchCreature,
  dispatchDuplicateCommons,
  duplicateCommonIds,
  EXCHANGE_DECOR,
  EXCHANGE_SUPPLIES,
  MYSTERY_EGG_COST,
  TONIC_COST,
  tonicRemaining,
} from '../game/exchange';
import type { CreatureData, DecorId, SaveData, SpeciesId } from '../game/state';
import { isRare, traitsOf, traitText } from '../game/traits';
import { snapImg } from './creatureSnap';

export interface ExchangeDeps {
  save(): SaveData;
  layout(): BaseLayout;
  persist(): void;
  changed(): void;
  toast(text: string, kind?: 'item' | 'scan' | 'big' | 'warn'): void;
  refreshInventory(): void;
  onBuy(kind: 'decor' | 'supply' | 'egg' | 'tonic', title: string, line: string): void;
  onDispatch(): void;
}

type Tab = 'dispatch' | 'contracts' | 'store';
type SourceFilter = 'reserve' | 'tanks';

export class ExchangePanel {
  open = false;
  private el: HTMLDivElement;
  private tab: Tab = 'dispatch';
  private source: SourceFilter = 'reserve';
  private armedId: number | null = null;
  private armedAt = 0;

  constructor(private readonly deps: ExchangeDeps) {
    this.el = document.createElement('div');
    this.el.id = 'exchange-panel';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'Research Exchange');
    this.el.hidden = true;
    document.body.appendChild(this.el);

    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) {
        this.close();
        return;
      }
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-ex]');
      if (!btn) return;
      const act = btn.dataset.ex!;
      const id = btn.dataset.id ?? '';
      if (act === 'close') this.close();
      else if (act === 'tab') {
        this.tab = id as Tab;
        this.armedId = null;
        this.render();
      } else if (act === 'src') {
        this.source = id as SourceFilter;
        this.armedId = null;
        this.render();
      } else if (act === 'send-dups') this.sendDuplicates();
      else if (act === 'send') this.sendOne(Number(id));
      else if (act === 'buy-decor') this.buyDecor(id as DecorId);
      else if (act === 'buy-tonic') this.buyTonic(Number(id));
      else if (act === 'buy-supply') this.buySupply(id as (typeof EXCHANGE_SUPPLIES)[number]['id']);
      else if (act === 'buy-egg') this.buyEgg(id as SpeciesId);
      else if (act === 'claim-contract') this.claim(id);
    });

    window.addEventListener('keydown', (e) => {
      if (!this.open || e.repeat) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });
  }

  show(): void {
    const s = this.deps.save();
    syncHarmonyContracts(s, this.deps.layout());
    this.open = true;
    this.armedId = null;
    this.source = (s.reserve?.length ?? 0) > 0 ? 'reserve' : 'tanks';
    if (readyContractCount(s) > 0) this.tab = 'contracts';
    this.el.hidden = false;
    this.render();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.armedId = null;
    this.el.hidden = true;
    this.deps.persist();
  }

  private sendDuplicates(): void {
    const s = this.deps.save();
    const res = dispatchDuplicateCommons(s);
    if (!res.count) {
      this.deps.toast('No extra duplicate common adults to dispatch right now.', 'item');
      return;
    }
    recordContractEvent(s, 'dispatch', res.count);
    this.deps.onDispatch();
    this.deps.changed();
    this.deps.persist();
    this.deps.toast(`Dispatched ${res.count} surplus creature${res.count > 1 ? 's' : ''} to partner sanctuaries (+${res.earned} SC).`, 'big');
    this.render();
  }

  private sendOne(creatureId: number): void {
    const s = this.deps.save();
    const c = [...s.creatures, ...(s.reserve ?? [])].find((x) => x.id === creatureId);
    if (!c) return;
    const tr = traitsOf(c);
    const precious = isRare(tr) || !!tr.radiant || !!tr.heirloom || !!tr.choir;
    if (precious && (this.armedId !== creatureId || Date.now() - this.armedAt > 4000)) {
      this.armedId = creatureId;
      this.armedAt = Date.now();
      this.render();
      return;
    }
    this.armedId = null;
    const res = dispatchCreature(s, creatureId);
    if (!res.ok) {
      this.deps.toast(res.why, 'warn');
      return;
    }
    recordContractEvent(s, 'dispatch', 1);
    this.deps.onDispatch();
    this.deps.changed();
    this.deps.persist();
    this.deps.toast(`Dispatched ${res.name} the ${SPECIES[res.species].name.toLowerCase()} (+${res.earned} SC).`, 'item');
    this.render();
  }

  private claim(contractId: string): void {
    const s = this.deps.save();
    const res = claimContract(s, contractId);
    if (!res.ok) {
      this.deps.toast(res.why, 'warn');
      return;
    }
    syncHarmonyContracts(s, this.deps.layout());
    this.deps.changed();
    this.deps.persist();
    this.deps.onBuy('supply', `Contract Complete (+${res.credits} SC)`, `Reward credited${res.bonusText}. A fresh field contract has been posted.`);
    this.render();
  }

  private buyDecor(id: DecorId): void {
    const s = this.deps.save();
    const err = buyExchangeDecor(s, id);
    if (err) {
      this.deps.toast(err, 'warn');
      return;
    }
    this.deps.persist();
    this.deps.onBuy('decor', DECOR[id].name, 'Ready to place at any Habitat console.');
    this.render();
  }

  private buyTonic(tankId: number): void {
    const s = this.deps.save();
    const err = applyTonic(s, tankId);
    if (err) {
      this.deps.toast(err, 'warn');
      return;
    }
    const p = this.deps.layout().pieces.find((q) => q.id === tankId);
    const code = p ? pieceCode(this.deps.layout(), p) : 'tank';
    this.deps.persist();
    this.deps.onBuy('tonic', `Rich Kelp Tonic · ${code}`, 'Faster breeding and boosted rare odds for 15 minutes.');
    this.render();
  }

  private buySupply(id: (typeof EXCHANGE_SUPPLIES)[number]['id']): void {
    const s = this.deps.save();
    const offer = EXCHANGE_SUPPLIES.find((o) => o.id === id);
    const err = buySupply(s, id);
    if (err || !offer) {
      this.deps.toast(err ?? 'Unavailable', 'warn');
      return;
    }
    this.deps.refreshInventory();
    this.deps.persist();
    this.deps.onBuy('supply', offer.name, offer.line);
    this.render();
  }

  private buyEgg(sp: SpeciesId): void {
    const s = this.deps.save();
    const res = buyMysteryEgg(s, sp);
    if (!res.ok) {
      this.deps.toast(res.why, 'warn');
      return;
    }
    this.deps.persist();
    this.deps.onBuy('egg', `Mystery ${SPECIES[sp].name} egg`, 'Waiting in the Creature room cradles.');
    this.render();
  }

  private renderDispatch(s: SaveData): string {
    const layout = this.deps.layout();
    const dups = duplicateCommonIds(s);
    const resCount = (s.reserve ?? []).filter((c) => c.stage !== 'egg').length;
    const tankCount = s.creatures.filter((c) => c.stage !== 'egg').length;
    const list: CreatureData[] = (this.source === 'reserve' ? (s.reserve ?? []) : s.creatures).filter((c) => c.stage !== 'egg');

    const cards = list.length
      ? list
          .map((c) => {
            const tr = traitsOf(c);
            const val = creatureValue(c);
            const armed = this.armedId === c.id && Date.now() - this.armedAt < 4000;
            const loc = c.tank === -2
              ? 'Reserve'
              : (() => {
                  const p = layout.pieces.find((q) => q.id === c.tank);
                  return p ? pieceCode(layout, p) : 'Tank';
                })();
            const badges = [
              tr.choir ? '<span class="rtag choir">Choir</span>' : '',
              tr.heirloom ? '<span class="rtag heirloom">Heirloom</span>' : '',
              tr.radiant ? '<span class="rtag radiant">Radiant</span>' : '',
              !tr.radiant && isRare(tr) ? '<span class="rtag rare">Rare</span>' : '',
            ].join('');
            return `<div class="ex-item${tr.choir ? ' choir' : tr.heirloom ? ' heirloom' : tr.radiant ? ' radiant' : ''}">
              <div class="ex-pic">${snapImg(c.species, tr, '', c.stage, creatureName(c))}</div>
              <div class="ex-info">
                <b>${creatureName(c)} <small>· ${SPECIES[c.species].name}${c.stage === 'young' ? ' (young)' : ''}</small></b>
                <p>${traitText(c.species, tr)} · ${loc}</p>
                ${badges ? `<div class="ex-tags">${badges}</div>` : ''}
              </div>
              <button type="button" class="ex-go${armed ? ' armed' : ''}" data-ex="send" data-id="${c.id}">
                ${armed ? 'Tap again' : `Send <b>+${val} SC</b>`}
              </button>
            </div>`;
          })
          .join('')
      : `<p class="ex-empty">${
          this.source === 'reserve'
            ? 'Your Reserve is empty. Switch to Tanks above, or let extra hatchlings settle into the Reserve.'
            : 'No creatures in your tanks right now.'
        }</p>`;

    return `
      <div class="ex-bar">
        <div class="ex-subtabs">
          <button type="button" data-ex="src" data-id="reserve" class="${this.source === 'reserve' ? 'on' : ''}">Reserve (${resCount})</button>
          <button type="button" data-ex="src" data-id="tanks" class="${this.source === 'tanks' ? 'on' : ''}">Tanks (${tankCount})</button>
        </div>
        <button type="button" class="ex-batch" data-ex="send-dups" ${dups.ids.length ? '' : 'disabled'} title="Keeps at least 2 of each species and 1 of every look; never touches rare, radiant, heirloom, Choir, or Linnea’s requested creatures">
          ${dups.ids.length ? `Send ${dups.ids.length} duplicate commons (+${dups.totalCredits} SC)` : 'No duplicate commons to batch-send'}
        </button>
      </div>
      <p class="ex-note">Send surplus raised creatures to partner sanctuaries for Survey Credits. Rare, radiant, heirloom and Choir-touched creatures ask for a second tap before sending.</p>
      <div class="ex-list">${cards}</div>`;
  }

  private renderStore(s: SaveData): string {
    const sc = creditsOf(s);
    const layout = this.deps.layout();
    const decorCards = EXCHANGE_DECOR.map((o) => {
      const owned = (s.decor?.[o.id] ?? 0) + Object.values(s.tankData).reduce((n, td) => n + (td.decor?.filter((d) => d === o.id).length ?? 0), 0);
      return `<div class="ex-shop-card">
        <div class="ex-shop-meta">
          <b>${DECOR[o.id].name}</b>
          <p>${DECOR[o.id].line}</p>
          ${owned ? `<small class="ex-owned">Owned: ${owned}</small>` : ''}
        </div>
        <button type="button" class="ex-buy" data-ex="buy-decor" data-id="${o.id}" ${sc < o.cost ? 'disabled' : ''}>${o.cost} SC</button>
      </div>`;
    }).join('');

    const tankList = tanks(layout);
    const tonicCards = tankList.length
      ? tankList
          .map((t) => {
            const rem = tonicRemaining(s, t.id);
            const code = pieceCode(layout, t);
            return `<button type="button" class="ex-tonic-btn${rem > 0 ? ' active' : ''}" data-ex="buy-tonic" data-id="${t.id}" ${sc < TONIC_COST ? 'disabled' : ''}>
              <b>${code}</b>
              <small>${rem > 0 ? `Active · ${Math.ceil(rem / 60)}m left` : `Boost 15m · ${TONIC_COST} SC`}</small>
            </button>`;
          })
          .join('')
      : '<p class="ex-empty">Build a creature tank first to apply Rich Kelp Tonic.</p>';

    const supplyCards = EXCHANGE_SUPPLIES.map(
      (o) => `<div class="ex-shop-card">
        <div class="ex-shop-meta">
          <b>${o.name}</b>
          <p>${o.line}</p>
        </div>
        <button type="button" class="ex-buy" data-ex="buy-supply" data-id="${o.id}" ${sc < o.cost ? 'disabled' : ''}>${o.cost} SC</button>
      </div>`,
    ).join('');

    const found = discoveredSpecies(s);
    const eggBtns = found.length
      ? found
          .map(
            (sp) => `<button type="button" class="ex-egg-btn" data-ex="buy-egg" data-id="${sp}" ${sc < MYSTERY_EGG_COST ? 'disabled' : ''}>
              <b>${SPECIES[sp].name}</b>
              <small>${MYSTERY_EGG_COST} SC</small>
            </button>`,
          )
          .join('')
      : '<p class="ex-empty">Scan or raise a species first to order mystery rare eggs.</p>';

    return `
      <h3 class="ex-sec-title">Exclusive Tank Decorations <span>Place in any tank at its Habitat console</span></h3>
      <div class="ex-grid">${decorCards}</div>
      <h3 class="ex-sec-title">Rich Kelp Tonic <span>1.6× breeding speed & boosted rare odds for 15 min · ${TONIC_COST} SC</span></h3>
      <div class="ex-tonic-row">${tonicCards}</div>
      <h3 class="ex-sec-title">Base Supplies & Echo Whorls <span>Delivered straight to base storage</span></h3>
      <div class="ex-grid">${supplyCards}</div>
      <h3 class="ex-sec-title">Mystery Rare Eggs <span>High rare colour, bred-only pattern & radiant odds · delivered to Creature room</span></h3>
      <div class="ex-egg-row">${eggBtns}</div>`;
  }

  private renderContracts(s: SaveData): string {
    syncHarmonyContracts(s, this.deps.layout());
    const list = ensureContracts(s);
    const doneTotal = s.contractsDone ?? 0;
    const cards = list
      .map((c) => {
        const done = c.progress >= c.target;
        const pct = Math.min(100, Math.round((c.progress / Math.max(1, c.target)) * 100));
        const bonusTag = c.bonus === 'egg' ? ' + Mystery Rare Egg' : c.bonus === 'whorl' ? ' + Echo Whorl' : '';
        return `<div class="ex-contract${done ? ' ready' : ''}">
          <div class="ex-c-main">
            <div class="ex-c-head"><b>${c.title}</b><span class="ex-c-pay">+${c.credits} SC${bonusTag}</span></div>
            <p>${c.detail}</p>
            <div class="ex-c-prog"><div class="ex-c-track"><i style="width:${pct}%"></i></div><span>${c.progress}/${c.target}</span></div>
          </div>
          <button type="button" class="ex-go${done ? ' claim' : ''}" data-ex="claim-contract" data-id="${c.id}" ${done ? '' : 'disabled'}>
            ${done ? 'Claim' : 'In progress'}
          </button>
        </div>`;
      })
      .join('');
    return `
      <h3 class="ex-sec-title">Active Field Contracts <span>No time limits · ${doneTotal} completed</span></h3>
      <div class="ex-contracts">${cards}</div>`;
  }

  render(): void {
    if (!this.open) return;
    const s = this.deps.save();
    syncHarmonyContracts(s, this.deps.layout());
    const sc = creditsOf(s);
    const ready = readyContractCount(s);
    this.el.innerHTML = `<div class="ex-card">
      <header class="ex-head">
        <div>
          <h2>Research Exchange · EX-1</h2>
          <span class="ex-sub">Kestrel Supply Buoy</span>
        </div>
        <div class="ex-tabs">
          <button type="button" class="tab${this.tab === 'dispatch' ? ' on' : ''}" data-ex="tab" data-id="dispatch">Dispatch</button>
          <button type="button" class="tab${this.tab === 'contracts' ? ' on' : ''}" data-ex="tab" data-id="contracts">Contracts${ready ? ` <em class="ex-badge">${ready}</em>` : ''}</button>
          <button type="button" class="tab${this.tab === 'store' ? ' on' : ''}" data-ex="tab" data-id="store">Exchange Store</button>
        </div>
        <div class="ex-credits" aria-label="Survey Credits">${sc} <span>SC</span></div>
        <button type="button" class="fk-close" data-ex="close" aria-label="Close">✕</button>
      </header>
      <div class="ex-body">
        ${this.tab === 'dispatch' ? this.renderDispatch(s) : this.tab === 'contracts' ? this.renderContracts(s) : this.renderStore(s)}
      </div>
    </div>`;
  }
}
