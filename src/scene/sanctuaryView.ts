import { Container, FillGradient, Graphics, Sprite, type Texture } from 'pixi.js';
import { Critter } from '../actors/critters';
import type { WorldArt } from '../art/worldArt';
import { getPropArt } from '../art/propArt';
import type { BaseLayout } from '../game/base';
import {
  cleanTank,
  creatureName,
  creaturesIn,
  decorSlots,
  feedTank,
  gatherAllIntoSanctuary,
  handFeed,
  PLANTS,
  PLANT_ORDER,
  SPECIES,
  tankCapacity,
  tankDataFor,
  tankHarmony,
  tankHasPlant,
  payCost,
} from '../game/creatures';
import { DECOR, DECOR_ORDER } from '../game/collection';
import type { CreatureData, DecorId, MaterialId, PlantId, SaveData } from '../game/state';
import { MATERIALS } from '../game/state';
import { COLOURS, PATTERNS, traitsOf } from '../game/traits';
import { drawDecor } from '../world/tankDecor';
import { drawPlant } from '../world/tanklife';

/**
 * Grand Sanctuary Tank (Colin, Nov 25, 2026):
 * A full-screen, ocean-fidelity living aquarium rendered with PixiJS painted
 * backdrops, sculpted biome seabed, swaying painted kelp & reef flora,
 * drag-and-drop painted decorations, full-detail animated creature rigs,
 * Day / Bioluminescent Night lighting toggle, click-to-feed, cursor glass play,
 * and clickable sparkling material drops.
 */

export interface SanctuaryHooks {
  onSave(): void;
  onToast(msg: string): void;
  onSound(kind: 'feed' | 'pickup' | 'bubble' | 'ui'): void;
  onOpenClassic(tankId: number): void;
  onClose(): void;
}

interface SwimFish {
  data: CreatureData;
  critter: Critter;
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  retarget: number;
  z: number;
  phase: number;
  notice: number;
  feeding: number;
}

interface FoodFlake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  wob: number;
}

interface SparklePop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: number;
  size: number;
}

interface TankDrop {
  mat: MaterialId;
  x: number;
  y: number;
  phase: number;
  spr: Container;
}

interface PlacedDecorItem {
  id: DecorId;
  nx: number;
  ny: number;
  flip: boolean;
  view: Container;
  glow?: Graphics;
}

type ToolMode = 'play' | 'decor' | 'flora';

export class SanctuaryView {
  readonly view = new Container();
  private readonly bgLayer = new Container();
  private readonly rayLayer = new Graphics();
  private readonly floraBack = new Container();
  private readonly seabedG = new Graphics();
  private readonly decorLayer = new Container();
  private readonly dropLayer = new Container();
  private readonly fishLayer = new Container();
  private readonly fishEmissive = new Container();
  private readonly fishGlow = new Container();
  private readonly fxLayer = new Graphics();
  private readonly vignetteLayer = new Graphics();

  private readonly hudEl: HTMLDivElement;
  private readonly topStatsEl: HTMLDivElement;
  private readonly inspectorEl: HTMLDivElement;
  private readonly trayEl: HTMLDivElement;

  private activeTankId: number | null = null;
  private save: SaveData | null = null;
  private layout: BaseLayout | null = null;
  private cssW = 1280;
  private cssH = 720;
  private time = 0;
  private nightMode = false;
  private nightMix = 0;
  private tool: ToolMode = 'play';
  private selectedFishId: number | null = null;
  private draggingDecor: PlacedDecorItem | null = null;
  private pointer = { x: -999, y: -999, active: false, down: false };

  private swimmers: SwimFish[] = [];
  private placedDecor: PlacedDecorItem[] = [];
  private kelpStalks: { spr: Sprite; baseX: number; baseY: number; phase: number; amp: number }[] = [];
  private plantNodes: { node: Container; phase: number }[] = [];
  private foods: FoodFlake[] = [];
  private pops: SparklePop[] = [];
  private drops: TankDrop[] = [];
  private backdropSprites: Sprite[] = [];
  private seabedBuiltW = 0;
  private seabedBuiltH = 0;
  private lastSig = '';

  constructor(
    private readonly worldArt: WorldArt | undefined,
    private readonly hooks: SanctuaryHooks,
  ) {
    this.view.visible = false;
    this.fishGlow.blendMode = 'add';
    this.view.addChild(
      this.bgLayer,
      this.rayLayer,
      this.floraBack,
      this.seabedG,
      this.decorLayer,
      this.dropLayer,
      this.fishLayer,
      this.fishEmissive,
      this.fishGlow,
      this.fxLayer,
      this.vignetteLayer,
    );

    // Sleek brass-and-glass full-screen HUD overlay.
    this.hudEl = document.createElement('div');
    this.hudEl.id = 'sanctuary-hud';
    this.hudEl.hidden = true;
    this.hudEl.innerHTML = `
      <div class="sanct-top">
        <div class="sanct-title-card">
          <div class="sanct-eyebrow">GRAND SANCTUARY TANK</div>
          <div class="sanct-stats" data-role="stats"></div>
        </div>
        <div class="sanct-actions">
          <button type="button" class="sanct-btn" data-act="night" title="Toggle Day / Bioluminescent Night">🌙 Night Glow</button>
          <button type="button" class="sanct-btn" data-act="clean" title="Scrub tank glass & freshen water">✨ Clean</button>
          <button type="button" class="sanct-btn" data-act="gather" title="Bring creatures from all tanks into this Sanctuary" hidden>🐠 Gather All</button>
          <button type="button" class="sanct-btn" data-act="classic" title="Open Roster, Breeding & Book panel">📋 Roster &amp; Breed</button>
          <button type="button" class="sanct-btn sanct-close" data-act="close" title="Return to base (Esc)">✕ Exit</button>
        </div>
      </div>
      <div class="sanct-inspector" data-role="inspector" hidden></div>
      <div class="sanct-bottom">
        <div class="sanct-tray" data-role="tray" hidden></div>
        <div class="sanct-toolbar">
          <button type="button" class="sanct-tool active" data-tool="play">🫧 Feed &amp; Play</button>
          <button type="button" class="sanct-tool" data-tool="decor">⚓ Arrange Decor</button>
          <button type="button" class="sanct-tool" data-tool="flora">🌿 Plant Flora</button>
          <span class="sanct-hint" data-role="hint">Click water to drop food · Click glowing orbs to collect · Click a creature to inspect</span>
        </div>
      </div>
    `;
    document.body.appendChild(this.hudEl);
    this.topStatsEl = this.hudEl.querySelector<HTMLDivElement>('[data-role="stats"]')!;
    this.inspectorEl = this.hudEl.querySelector<HTMLDivElement>('[data-role="inspector"]')!;
    this.trayEl = this.hudEl.querySelector<HTMLDivElement>('[data-role="tray"]')!;

    this.bindEvents();
  }

  get active(): boolean {
    return this.activeTankId !== null;
  }

  get tankId(): number | null {
    return this.activeTankId;
  }

  open(save: SaveData, layout: BaseLayout, tankId: number, cssW: number, cssH: number): void {
    this.save = save;
    this.layout = layout;
    this.activeTankId = tankId;
    this.cssW = cssW;
    this.cssH = cssH;
    this.tool = 'play';
    this.selectedFishId = null;
    this.draggingDecor = null;
    this.foods = [];
    this.pops = [];
    this.view.visible = true;
    this.hudEl.hidden = false;
    this.inspectorEl.hidden = true;
    this.trayEl.hidden = true;
    this.syncToolbar();
    this.buildEnvironment(cssW, cssH);
    this.syncTankContents(true);
    this.refreshHud();
  }

  close(): void {
    if (!this.active) return;
    this.activeTankId = null;
    this.draggingDecor = null;
    this.selectedFishId = null;
    this.view.visible = false;
    this.hudEl.hidden = true;
    this.clearDynamicNodes();
    this.hooks.onClose();
  }

  private clearDynamicNodes(): void {
    for (const f of this.swimmers) {
      f.critter.view.destroy({ children: true });
      f.critter.emissive.destroy({ children: true });
      f.critter.glow.destroy({ children: true });
    }
    this.swimmers = [];
    for (const d of this.placedDecor) {
      d.view.destroy({ children: true });
      d.glow?.destroy();
    }
    this.placedDecor = [];
    for (const dr of this.drops) dr.spr.destroy({ children: true });
    this.drops = [];
    for (const p of this.plantNodes) p.node.destroy({ children: true });
    this.plantNodes = [];
    this.lastSig = '';
  }

  /** Sculpted organic seabed height at screen X (left sunlit reef, center sandy clearing, right warm vent terrace). */
  private floorY(x: number): number {
    const u = x / Math.max(1, this.cssW);
    const base = this.cssH * 0.85;
    const leftReef = -Math.exp(-Math.pow((u - 0.14) / 0.16, 2)) * this.cssH * 0.08;
    const rightVent = -Math.exp(-Math.pow((u - 0.86) / 0.17, 2)) * this.cssH * 0.10;
    const wave = Math.sin(u * Math.PI * 5.2) * 10 + Math.sin(u * Math.PI * 11.4 + 1.2) * 4;
    return base + leftReef + rightVent + wave;
  }

  private buildEnvironment(w: number, h: number): void {
    this.seabedBuiltW = w;
    this.seabedBuiltH = h;
    this.bgLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.backdropSprites = [];
    this.floraBack.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.kelpStalks = [];

    // 1. Deep painted ocean gradient behind the watercolor backdrop plates.
    const grad = new FillGradient(0, 0, 0, h);
    grad.addColorStop(0, 0x1e5c64);
    grad.addColorStop(0.55, 0x103842);
    grad.addColorStop(1, 0x071d24);
    const bgRect = new Graphics().rect(0, 0, w, h).fill(grad);
    this.bgLayer.addChild(bgRect);

    // 2. Layered hand-painted watercolor world vistas (Basin reef + Grotto arches + Deep Trench vents!).
    const plateKeys: (keyof WorldArt['plates'])[] = ['basin', 'grotto-mid', 'meadow'];
    for (const [idx, key] of plateKeys.entries()) {
      const tex = this.worldArt?.plates[key];
      if (!tex) continue;
      const spr = new Sprite(tex);
      spr.anchor.set(0.5, 0.5);
      const sc = Math.max((w * 0.65) / Math.max(1, tex.width), (h * 0.92) / Math.max(1, tex.height));
      spr.scale.set(sc);
      spr.position.set(w * (0.2 + idx * 0.3), h * 0.48);
      spr.alpha = idx === 1 ? 0.54 : 0.44;
      this.bgLayer.addChild(spr);
      this.backdropSprites.push(spr);
    }

    // 3. Background painted swaying kelp stalks & reef corals framing the Sanctuary.
    const kelpTexs = this.worldArt?.forestKelp ?? [];
    if (kelpTexs.length) {
      const spots = [0.05, 0.11, 0.18, 0.27, 0.72, 0.83, 0.92, 0.96];
      for (const [i, u] of spots.entries()) {
        const tex = kelpTexs[i % kelpTexs.length];
        const spr = new Sprite(tex);
        spr.anchor.set(0, 0.5);
        spr.rotation = -Math.PI / 2;
        const kh = h * (0.36 + (i % 3) * 0.14);
        spr.width = kh;
        spr.height = 38 + (i % 3) * 14;
        const bx = w * u;
        const by = this.floorY(bx) + 14;
        spr.position.set(bx, by);
        spr.alpha = 0.72;
        this.floraBack.addChild(spr);
        this.kelpStalks.push({ spr, baseX: bx, baseY: by, phase: i * 1.37, amp: 0.05 + (i % 3) * 0.018 });
      }
    }

    // Painted seabed coral tufts & ambient seabed animals (sea lilies, sponges, sea pens) for lush visual depth!
    const reefTexs = this.worldArt?.reef ?? [];
    const bottomArt = getPropArt().bottom;
    const bottomKeys = ['lily', 'sponge', 'worm', 'star', 'pen'] as const;
    for (let i = 0; i < 8; i++) {
      const u = 0.07 + (i / 7) * 0.86;
      const bx = w * u;
      const by = this.floorY(bx) + 6;
      const rTex = reefTexs[i % Math.max(1, reefTexs.length)];
      if (rTex && i % 2 === 0) {
        const spr = new Sprite(rTex);
        spr.anchor.set(0.5, 0.9);
        const sc = (74 + (i % 3) * 18) / Math.max(1, rTex.width);
        spr.scale.set(sc);
        spr.position.set(bx, by);
        spr.alpha = 0.82;
        this.floraBack.addChild(spr);
      } else {
        const bTex = bottomArt[bottomKeys[i % bottomKeys.length]];
        if (bTex) {
          const spr = new Sprite(bTex);
          spr.anchor.set(0.5, 0.92);
          const sc = (54 + (i % 3) * 14) / Math.max(1, bTex.width);
          spr.scale.set(sc);
          spr.position.set(bx, by);
          spr.alpha = 0.86;
          this.floraBack.addChild(spr);
        }
      }
    }

    // 4. Sculpted undulating painted seabed floor (sunlit sand/limestone on left, warm vent basalt on right).
    const sg = this.seabedG.clear();
    const pts: number[] = [];
    for (let x = 0; x <= w + 24; x += 24) pts.push(x, this.floorY(x));
    pts.push(w + 24, h + 10, 0, h + 10);
    const sandGrad = new FillGradient(0, h * 0.74, 0, h);
    sandGrad.addColorStop(0, 0x3b5856);
    sandGrad.addColorStop(0.35, 0x22383a);
    sandGrad.addColorStop(1, 0x0e1c20);
    sg.poly(pts).fill(sandGrad);
    // Soft rim highlight along the sunlit sand crest.
    for (let x = 0; x <= w; x += 20) {
      const y = this.floorY(x);
      if (x === 0) sg.moveTo(x, y + 2);
      else sg.lineTo(x, y + 2);
    }
    sg.stroke({ color: 0x8cc2b4, width: 4, alpha: 0.36, cap: 'round' });
    // Warm subtle hydrothermal vent glow fissures on the far-right deep terrace.
    const vx = w * 0.87;
    const vy = this.floorY(vx) + 12;
    sg.ellipse(vx, vy, 46, 12).fill({ color: 0x1a1c1e, alpha: 0.8 });
    sg.ellipse(vx, vy, 28, 6).fill({ color: 0xff9842, alpha: 0.45 });
    sg.ellipse(vx, vy, 12, 3).fill({ color: 0xffd888, alpha: 0.65 });

    // 5. Subtle riveted brass-and-glass aquarium frame bezel around the viewport edges.
    const vg = this.vignetteLayer.clear();
    vg.rect(0, 0, w, 12).fill({ color: 0x081316, alpha: 0.78 });
    vg.rect(0, h - 12, w, 12).fill({ color: 0x081316, alpha: 0.78 });
    vg.rect(0, 0, 12, h).fill({ color: 0x081316, alpha: 0.78 });
    vg.rect(w - 12, 0, 12, h).fill({ color: 0x081316, alpha: 0.78 });
    vg.roundRect(10, 10, w - 20, h - 20, 14).stroke({ color: 0x9e7d3a, width: 2.4, alpha: 0.62 });
  }

  private syncTankContents(force = false): void {
    if (!this.save || !this.layout || this.activeTankId === null) return;
    const td = tankDataFor(this.save, this.activeTankId);
    const list = creaturesIn(this.save, this.activeTankId);
    const plants = this.activePlants(td);
    const decor = this.activeDecorList(td);
    const outSig = Object.entries(td.out ?? {}).map(([k, v]) => `${k}:${v}`).join(',');
    const sig = `${list.map((c) => `${c.id}:${c.stage}`).join(',')}|${plants.join(',')}|${decor.map((d) => `${d.id}@${d.nx.toFixed(2)},${d.ny.toFixed(2)},${d.flip}`).join(';')}|${outSig}`;
    if (!force && sig === this.lastSig) return;
    this.lastSig = sig;

    // 1. Sync placed biome flora clusters.
    for (const p of this.plantNodes) p.node.destroy({ children: true });
    this.plantNodes = [];
    for (const [i, pid] of plants.entries()) {
      const count = 3;
      for (let k = 0; k < count; k++) {
        const node = drawPlant(pid);
        const u = 0.08 + ((i * 0.19 + k * 0.27 + 0.06) % 0.84);
        const px = this.cssW * u;
        const py = this.floorY(px) + 4;
        const sc = 1.65 + (k % 2) * 0.35;
        node.scale.set(sc);
        node.position.set(px, py);
        this.floraBack.addChild(node);
        this.plantNodes.push({ node, phase: i * 2.1 + k * 1.4 });
      }
    }

    // 2. Sync painted decorations (preserving drag positions in td.sanctuaryDecor).
    for (const d of this.placedDecor) {
      d.view.destroy({ children: true });
      d.glow?.destroy();
    }
    this.placedDecor = [];
    for (const item of decor) {
      const built = drawDecor(item.id);
      const px = item.nx * this.cssW;
      const py = item.ny * this.cssH;
      const sc = 1.7;
      built.view.scale.set(item.flip ? -sc : sc, sc);
      built.view.position.set(px, py);
      this.decorLayer.addChild(built.view);
      if (built.glow) {
        built.glow.scale.set(sc);
        built.glow.position.set(px, py);
        this.fishGlow.addChild(built.glow);
      }
      this.placedDecor.push({ ...item, view: built.view, glow: built.glow });
    }

    // 3. Sync full-detail animated Critter rigs.
    const existing = new Map(this.swimmers.map((s) => [s.data.id, s]));
    const nextSwimmers: SwimFish[] = [];
    for (const c of list) {
      const old = existing.get(c.id);
      if (old && old.data.stage === c.stage) {
        old.data = c;
        nextSwimmers.push(old);
        existing.delete(c.id);
        continue;
      }
      const critter = new Critter(c.species, c.stage, c.id, traitsOf(c), true);
      const z = c.stage === 'egg' ? 0.15 : ((c.id * 0.6180339) % 1);
      critter.fog = z * 0.35;
      const sc = (c.stage === 'egg' ? 1.15 : 1.12) * (1 - z * 0.22);
      critter.view.scale.set(sc);
      critter.emissive.scale.set(sc);
      critter.glow.scale.set(sc);
      this.fishLayer.addChild(critter.view);
      this.fishEmissive.addChild(critter.emissive);
      this.fishGlow.addChild(critter.glow);

      const zone = this.homeZone(c.species);
      const x = this.cssW * (zone.x0 + Math.random() * (zone.x1 - zone.x0));
      const y = c.stage === 'egg' || c.species === 'crab' || c.species === 'snail'
        ? this.floorY(x) - 10
        : this.cssH * (zone.y0 + Math.random() * (zone.y1 - zone.y0));
      nextSwimmers.push({
        data: c,
        critter,
        x,
        y,
        vx: (Math.random() - 0.5) * 30,
        vy: 0,
        tx: x,
        ty: y,
        retarget: 1 + Math.random() * 4,
        z,
        phase: c.id * 1.93,
        notice: 0,
        feeding: 0,
      });
    }
    for (const stale of existing.values()) {
      stale.critter.view.destroy({ children: true });
      stale.critter.emissive.destroy({ children: true });
      stale.critter.glow.destroy({ children: true });
    }
    this.swimmers = nextSwimmers;

    // 4. Sync clickable sparkling material drops from td.out!
    for (const dr of this.drops) dr.spr.destroy({ children: true });
    this.drops = [];
    const pickups = getPropArt().pickups;
    let dIdx = 0;
    for (const [mat, qty] of Object.entries(td.out ?? {}) as [MaterialId, number][]) {
      const count = Math.min(4, Math.max(0, Math.floor(qty ?? 0)));
      for (let k = 0; k < count; k++) {
        const u = 0.14 + (((dIdx * 0.23 + 0.09) % 0.72));
        const dx = this.cssW * u;
        const dy = this.floorY(dx) - 24 - (dIdx % 3) * 14;
        const box = new Container();
        const halo = new Graphics().circle(0, 0, 22).fill({ color: 0xffd878, alpha: 0.34 })
          .circle(0, 0, 13).stroke({ color: 0xfff0b8, width: 1.8, alpha: 0.85 });
        box.addChild(halo);
        const tex: Texture | undefined = mat === 'plate' ? pickups.scrap : pickups[mat as keyof typeof pickups];
        if (tex) {
          const sp = new Sprite(tex);
          sp.anchor.set(0.5);
          sp.scale.set(28 / Math.max(1, Math.max(tex.width, tex.height)));
          box.addChild(sp);
        } else {
          box.addChild(new Graphics().circle(0, 0, 8).fill({ color: 0xffe290 }));
        }
        box.position.set(dx, dy);
        this.dropLayer.addChild(box);
        this.drops.push({ mat, x: dx, y: dy, phase: dIdx * 1.3, spr: box });
        dIdx++;
      }
    }
  }

  private homeZone(sp: CreatureData['species']): { x0: number; x1: number; y0: number; y1: number; floor?: boolean } {
    switch (sp) {
      case 'puffcap': return { x0: 0.12, x1: 0.88, y0: 0.14, y1: 0.44 };
      case 'ray': return { x0: 0.10, x1: 0.90, y0: 0.22, y1: 0.62 };
      case 'glowfin': return { x0: 0.08, x1: 0.65, y0: 0.28, y1: 0.72 };
      case 'horse': return { x0: 0.10, x1: 0.72, y0: 0.34, y1: 0.74 };
      case 'shrimp': return { x0: 0.15, x1: 0.85, y0: 0.42, y1: 0.78 };
      case 'eel': return { x0: 0.48, x1: 0.92, y0: 0.56, y1: 0.82 };
      case 'crab':
      case 'snail': return { x0: 0.10, x1: 0.90, y0: 0.78, y1: 0.86, floor: true };
    }
  }

  private activePlants(td: ReturnType<typeof tankDataFor>): PlantId[] {
    const out: PlantId[] = [];
    for (const p of [td.plant, td.plant2, ...(td.sanctuaryPlants ?? [])]) {
      if (p && !out.includes(p)) out.push(p);
    }
    return out;
  }

  private activeDecorList(td: ReturnType<typeof tankDataFor>): { id: DecorId; nx: number; ny: number; flip: boolean }[] {
    if (td.sanctuaryDecor?.length) {
      return td.sanctuaryDecor.map((d) => ({ id: d.id, nx: d.x, ny: d.y, flip: !!d.flip }));
    }
    const base = td.decor ?? [];
    if (!base.length) return [];
    const seeded = base.map((id, i) => {
      const nx = 0.14 + ((i + 0.5) / base.length) * 0.72;
      const ny = (this.floorY(nx * this.cssW) - 4) / Math.max(1, this.cssH);
      return { id, nx, ny, flip: i % 2 === 1 };
    });
    td.sanctuaryDecor = seeded.map((d) => ({ id: d.id, x: d.nx, y: d.ny, flip: d.flip }));
    return seeded;
  }

  update(dt: number, cssW: number, cssH: number): void {
    if (!this.active) return;
    this.time += dt;
    if (Math.abs(cssW - this.seabedBuiltW) > 4 || Math.abs(cssH - this.seabedBuiltH) > 4) {
      this.cssW = cssW;
      this.cssH = cssH;
      this.buildEnvironment(cssW, cssH);
      this.syncTankContents(true);
    } else {
      this.syncTankContents(false);
    }

    // Smooth Day / Bioluminescent Night transition!
    this.nightMix += ((this.nightMode ? 1 : 0) - this.nightMix) * Math.min(1, dt * 4.5);
    const bgTint = this.lerpHex(0xffffff, 0x263a52, this.nightMix);
    for (const sp of this.backdropSprites) sp.tint = bgTint;
    this.seabedG.tint = this.lerpHex(0xffffff, 0x3b4e64, this.nightMix);
    this.floraBack.tint = this.lerpHex(0xffffff, 0x455c72, this.nightMix);
    this.decorLayer.tint = this.lerpHex(0xffffff, 0x566c80, this.nightMix);
    this.fishLayer.tint = this.lerpHex(0xffffff, 0x7088a0, this.nightMix);
    this.fishGlow.alpha = 0.65 + this.nightMix * 0.55;

    // Animated sunlight shafts & surface caustics (soften into moonlit rays in Night Glow mode).
    const rg = this.rayLayer.clear();
    const rayAlpha = (0.14 - this.nightMix * 0.08);
    const rayCol = this.nightMix > 0.5 ? 0x6ca8d4 : 0x9ef2dc;
    for (let i = 0; i < 6; i++) {
      const bx = this.cssW * (0.1 + i * 0.17) + Math.sin(this.time * 0.35 + i * 1.4) * 34;
      const topW = 48 + (i % 3) * 24;
      const botW = topW * 2.4;
      const slant = 95 + (i % 2) * 35;
      rg.poly([bx - topW / 2, 0, bx + topW / 2, 0, bx + slant + botW / 2, this.cssH * 0.86, bx + slant - botW / 2, this.cssH * 0.86])
        .fill({ color: rayCol, alpha: rayAlpha * (0.65 + 0.35 * Math.sin(this.time * 0.7 + i * 2.1)) });
    }
    // Gentle swaying kelp & planted biome flora.
    for (const k of this.kelpStalks) {
      k.spr.rotation = -Math.PI / 2 + Math.sin(this.time * 1.15 + k.phase) * k.amp;
    }
    for (const p of this.plantNodes) {
      p.node.skew.x = Math.sin(this.time * 1.4 + p.phase) * 0.06;
    }

    // Update drifting food flakes.
    const nextFoods: FoodFlake[] = [];
    for (const f of this.foods) {
      f.life -= dt;
      if (f.life <= 0) continue;
      f.x += (f.vx + Math.sin(this.time * 3.2 + f.wob) * 14) * dt;
      f.y += f.vy * dt;
      f.vx *= Math.max(0, 1 - dt * 1.8);
      const fy = this.floorY(f.x) - 6;
      if (f.y > fy) {
        f.y = fy;
        f.vy = 0;
      }
      nextFoods.push(f);
    }
    this.foods = nextFoods;

    // Update full-detail swimming creatures!
    const w = this.cssW;
    const h = this.cssH;
    for (const s of this.swimmers) {
      const zone = this.homeZone(s.data.species);
      if (s.data.stage === 'egg') {
        const ey = this.floorY(s.x) - 10;
        s.y = ey;
        s.critter.update(dt, this.time, s.x, s.y, 0, 0, { vigour: 1, sick: 0 });
        continue;
      }
      s.retarget -= dt;
      s.feeding = Math.max(0, s.feeding - dt * 1.6);

      // 1. Seek nearest food flake if any!
      let targetFood: FoodFlake | null = null;
      let bestFd = 320;
      for (const fl of this.foods) {
        const d = Math.hypot(fl.x - s.x, fl.y - s.y);
        if (d < bestFd) {
          bestFd = d;
          targetFood = fl;
        }
      }
      let curious = 0;
      if (targetFood) {
        s.tx = targetFood.x;
        s.ty = targetFood.y;
        s.notice = 1;
        if (bestFd < 24) {
          // Nibble the flake!
          targetFood.life = 0;
          s.feeding = 1;
          s.data.fed = Math.min(1, s.data.fed + 0.14);
          this.spawnPops(s.x, s.y - 10, 6, 0x9ef5d0);
          this.hooks.onSound('bubble');
        }
      } else if (this.pointer.active && this.tool === 'play') {
        // 2. Gentle "Tap the Glass" cursor curiosity!
        const pd = Math.hypot(this.pointer.x - s.x, this.pointer.y - s.y);
        if (pd < 230 && pd > 55) {
          curious = 1 - pd / 230;
          s.notice = Math.min(1, s.notice + dt * 3);
          if (s.data.species === 'puffcap') {
            // Puffcaps gently drift away with a pulse when nudged close.
            s.vx += ((s.x - this.pointer.x) / (pd || 1)) * 55 * dt;
            s.vy += ((s.y - this.pointer.y) / (pd || 1)) * 45 * dt;
          } else if (!zone.floor) {
            s.tx = this.pointer.x + Math.cos(this.time * 1.6 + s.phase) * 75;
            s.ty = Math.min(this.floorY(this.pointer.x) - 28, this.pointer.y + Math.sin(this.time * 1.3 + s.phase) * 45);
          }
        } else {
          s.notice = Math.max(0, s.notice - dt * 1.5);
        }
      } else {
        s.notice = Math.max(0, s.notice - dt * 1.5);
      }

      if (!targetFood && (s.retarget <= 0 || Math.hypot(s.tx - s.x, s.ty - s.y) < 28)) {
        s.tx = w * (zone.x0 + Math.random() * (zone.x1 - zone.x0));
        s.ty = zone.floor ? this.floorY(s.tx) - 10 : h * (zone.y0 + Math.random() * (zone.y1 - zone.y0));
        s.retarget = 2.8 + Math.random() * 4.5;
      }

      const dx = s.tx - s.x;
      const dy = s.ty - s.y;
      const dist = Math.hypot(dx, dy) || 1;
      const accel = targetFood ? 190 : zone.floor ? 65 : 75;
      s.vx += (dx / dist) * accel * dt;
      s.vy += (dy / dist) * (zone.floor ? 40 : accel * 0.72) * dt;
      const maxSp = targetFood ? 155 : s.data.species === 'puffcap' ? 42 : zone.floor ? 52 : 85;
      const sp = Math.hypot(s.vx, s.vy);
      if (sp > maxSp) {
        s.vx *= maxSp / sp;
        s.vy *= maxSp / sp;
      }
      s.vx *= Math.max(0, 1 - dt * 0.9);
      s.vy *= Math.max(0, 1 - dt * 0.9);
      s.x = Math.max(44, Math.min(w - 44, s.x + s.vx * dt));
      const fy = this.floorY(s.x) - 12;
      if (zone.floor) {
        s.y = fy;
        s.vy = 0;
      } else {
        s.y = Math.max(66, Math.min(fy - 8, s.y + s.vy * dt));
      }
      s.critter.update(dt, this.time, s.x, s.y, s.vx, s.vy, {
        vigour: Math.max(0.45, s.data.fed),
        sick: s.data.sickness > 0 ? 0.6 : 0,
        notice: s.notice,
        curious,
        feeding: s.feeding,
        floorGap: Math.max(0, fy - s.y),
      });
    }

    // Bobbing glowing collectible drops.
    for (const dr of this.drops) {
      dr.spr.position.set(dr.x, dr.y + Math.sin(this.time * 2.8 + dr.phase) * 5);
      dr.spr.rotation = Math.sin(this.time * 1.9 + dr.phase) * 0.08;
    }

    // Render food flakes, ambient rising tank bubbles, and sparkle pops.
    const fx = this.fxLayer.clear();
    // Soft ambient tank micro-bubbles rising from the right vent & left kelp.
    for (let i = 0; i < 18; i++) {
      const seed = i * 67.3;
      const u = ((this.time * (0.09 + (i % 4) * 0.025) + seed * 0.17) % 1);
      const bx = (i < 8 ? w * 0.87 : w * (0.12 + (i % 7) * 0.11)) + Math.sin(this.time * 1.8 + seed) * 14;
      const by = this.floorY(bx) - u * (h * 0.82);
      fx.circle(bx, by, 1.8 + (i % 3) * 1.1).stroke({ color: 0xdaf8f2, width: 1, alpha: Math.sin(u * Math.PI) * 0.35 });
    }
    for (const f of this.foods) {
      fx.circle(f.x, f.y, f.size).fill({ color: 0xf4cf72, alpha: Math.min(1, f.life * 0.5) });
      fx.circle(f.x - 1, f.y - 1, f.size * 0.45).fill({ color: 0xfff8d8, alpha: 0.85 });
    }
    const keptPops: SparklePop[] = [];
    for (const p of this.pops) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 28 * dt;
      const a = p.life / p.max;
      fx.circle(p.x, p.y, p.size * a).fill({ color: p.color, alpha: a });
      keptPops.push(p);
    }
    this.pops = keptPops;

    // Subtle selection ring around inspected creature or dragged decoration.
    if (this.selectedFishId !== null) {
      const sel = this.swimmers.find((s) => s.data.id === this.selectedFishId);
      if (sel) {
        const r = 34 + Math.sin(this.time * 5) * 3;
        fx.circle(sel.x, sel.y, r).stroke({ color: 0xffe08a, width: 2, alpha: 0.75 });
      }
    }
    if (this.draggingDecor) {
      fx.circle(this.draggingDecor.view.x, this.draggingDecor.view.y - 24, 42)
        .stroke({ color: 0x9ef5d8, width: 2.2, alpha: 0.85 });
    }
  }

  private spawnPops(x: number, y: number, n: number, color: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 25 + Math.random() * 65;
      this.pops.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: 0.55 + Math.random() * 0.4, max: 0.95, color, size: 2.2 + Math.random() * 2.2 });
    }
  }

  private lerpHex(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return (r << 16) | (g << 8) | bl;
  }

  private refreshHud(): void {
    if (!this.save || !this.layout || this.activeTankId === null) return;
    const td = tankDataFor(this.save, this.activeTankId);
    const list = creaturesIn(this.save, this.activeTankId);
    const cap = tankCapacity(this.layout, this.activeTankId, this.save);
    const h = tankHarmony(this.save, this.activeTankId);
    const stars = '★'.repeat(h.stars) + '☆'.repeat(Math.max(0, 5 - h.stars));
    const waterPct = Math.round(td.water * 100);
    this.topStatsEl.innerHTML = `
      <span class="sanct-stars" title="Ecosystem Harmony">${stars}</span>
      <span>${list.length} / ${cap} creatures</span>
      <span>Water ${waterPct}%</span>
      <span>${this.activePlants(td).length}/5 flora</span>
    `;
    const otherFish = this.save.creatures.filter((c) => c.tank !== this.activeTankId).length;
    const gatherBtn = this.hudEl.querySelector<HTMLButtonElement>('[data-act="gather"]')!;
    gatherBtn.hidden = otherFish === 0;
    if (otherFish > 0) gatherBtn.textContent = `🐠 Gather All (${otherFish})`;
    const nightBtn = this.hudEl.querySelector<HTMLButtonElement>('[data-act="night"]')!;
    nightBtn.textContent = this.nightMode ? '☀ Day Light' : '🌙 Night Glow';
  }

  private syncToolbar(): void {
    this.hudEl.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((b) => {
      b.classList.toggle('active', b.dataset.tool === this.tool);
    });
    const hint = this.hudEl.querySelector<HTMLElement>('[data-role="hint"]')!;
    if (this.tool === 'play') {
      hint.textContent = 'Click water to drop food · Click glowing orbs to collect · Click a creature to inspect';
      this.trayEl.hidden = true;
    } else if (this.tool === 'decor') {
      hint.textContent = 'Drag placed decor anywhere on the seabed · Click a piece below to add or remove';
      this.renderDecorTray();
      this.trayEl.hidden = false;
    } else {
      hint.textContent = 'Plant biome flora so every species feels right at home in the Sanctuary';
      this.renderFloraTray();
      this.trayEl.hidden = false;
    }
  }

  private renderDecorTray(): void {
    if (!this.save || !this.layout || this.activeTankId === null) return;
    const td = tankDataFor(this.save, this.activeTankId);
    const spare = this.save.decor ?? {};
    const placedIds = new Set((td.sanctuaryDecor ?? []).map((d) => d.id));
    const available = DECOR_ORDER.filter((id) => placedIds.has(id) || (spare[id] ?? 0) > 0);
    const slots = decorSlots(this.save, this.layout, this.activeTankId);
    if (!available.length) {
      this.trayEl.innerHTML = `<div class="sanct-tray-empty">No decorations unlocked yet — earn them from the Collection Book, Linnea, or the Supply Buoy (EX-1)!</div>`;
      return;
    }
    this.trayEl.innerHTML = available.map((id) => {
      const placed = placedIds.has(id);
      return `<button type="button" class="sanct-chip ${placed ? 'on' : ''}" data-decor="${id}">
        ${placed ? '✓ ' : '+ '}${DECOR[id].name}
      </button>`;
    }).join('') + `<span class="sanct-slot-pill">${placedIds.size}/${slots} placed</span>`;
  }

  private renderFloraTray(): void {
    if (!this.save || this.activeTankId === null) return;
    const td = tankDataFor(this.save, this.activeTankId);
    this.trayEl.innerHTML = PLANT_ORDER.map((pid) => {
      const has = tankHasPlant(td, pid);
      const def = PLANTS[pid];
      const costTxt = Object.entries(def.cost).map(([m, n]) => `${n} ${MATERIALS[m as MaterialId].name.toLowerCase()}`).join(', ');
      return `<button type="button" class="sanct-chip ${has ? 'on' : ''}" data-flora="${pid}" ${has ? 'disabled' : ''}>
        ${has ? '✓ ' : '+ '}${def.name}${has ? '' : ` (${costTxt})`}
      </button>`;
    }).join('');
  }

  private showInspector(c: CreatureData): void {
    this.selectedFishId = c.id;
    const sp = SPECIES[c.species];
    const tr = traitsOf(c);
    const col = COLOURS[c.species][tr.colour];
    const pat = PATTERNS[c.species][tr.pattern];
    this.inspectorEl.hidden = false;
    this.inspectorEl.innerHTML = `
      <div class="sanct-insp-head">
        <strong>${creatureName(c)}</strong>
        <span>${sp.name} · ${c.stage}</span>
        <button type="button" class="sanct-insp-x" data-act="insp-close">✕</button>
      </div>
      <div class="sanct-insp-sub">${col}, ${pat}${tr.radiant ? ' · ✨ Radiant' : ''}${tr.choir ? ' · ✦ Choir-touched' : ''}</div>
      <div class="sanct-insp-bars">Fed ${Math.round(c.fed * 100)}% · Comfort ${Math.round(c.comfort * 100)}%</div>
      <div class="sanct-insp-btns">
        <button type="button" class="sanct-chip" data-act="treat">🍤 Hand-Feed Treat</button>
      </div>
    `;
  }

  private bindEvents(): void {
    this.hudEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act], [data-tool], [data-decor], [data-flora]');
      if (!btn || !this.save || !this.layout || this.activeTankId === null) return;
      e.stopPropagation();
      const act = btn.dataset.act;
      if (act === 'close') { this.close(); return; }
      if (act === 'night') {
        this.nightMode = !this.nightMode;
        this.hooks.onSound('ui');
        this.refreshHud();
        return;
      }
      if (act === 'clean') {
        const msg = cleanTank(this.save, this.activeTankId);
        if (msg) this.hooks.onToast(msg);
        else {
          this.hooks.onToast('Tank glass scrubbed and water freshened!');
          this.spawnPops(this.cssW * 0.5, this.cssH * 0.45, 16, 0x9ef5e8);
          this.hooks.onSound('bubble');
          this.hooks.onSave();
        }
        this.refreshHud();
        return;
      }
      if (act === 'gather') {
        const moved = gatherAllIntoSanctuary(this.save, this.layout, this.activeTankId);
        this.hooks.onToast(moved > 0 ? `Gathered ${moved} creature${moved === 1 ? '' : 's'} into the Grand Sanctuary!` : 'All creatures are already here.');
        this.hooks.onSound('pickup');
        this.hooks.onSave();
        this.syncTankContents(true);
        this.refreshHud();
        return;
      }
      if (act === 'classic') {
        const id = this.activeTankId;
        this.close();
        this.hooks.onOpenClassic(id);
        return;
      }
      if (act === 'insp-close') {
        this.selectedFishId = null;
        this.inspectorEl.hidden = true;
        return;
      }
      if (act === 'treat' && this.selectedFishId !== null) {
        const c = this.save.creatures.find((x) => x.id === this.selectedFishId);
        if (c) {
          const err = handFeed(this.save, c);
          if (err) this.hooks.onToast(err);
          else {
            const sw = this.swimmers.find((x) => x.data.id === c.id);
            if (sw) {
              sw.feeding = 1;
              this.spawnPops(sw.x, sw.y - 12, 10, 0xffe488);
            }
            this.hooks.onSound('feed');
            this.hooks.onSave();
            this.showInspector(c);
          }
        }
        return;
      }
      if (btn.dataset.tool) {
        this.tool = btn.dataset.tool as ToolMode;
        this.draggingDecor = null;
        this.hooks.onSound('ui');
        this.syncToolbar();
        return;
      }
      if (btn.dataset.decor) {
        const id = btn.dataset.decor as DecorId;
        const td = tankDataFor(this.save, this.activeTankId);
        td.sanctuaryDecor ??= [];
        const bag = (this.save.decor ??= {});
        const idx = td.sanctuaryDecor.findIndex((d) => d.id === id);
        if (idx >= 0) {
          td.sanctuaryDecor.splice(idx, 1);
          td.decor = td.sanctuaryDecor.map((d) => d.id);
          bag[id] = (bag[id] ?? 0) + 1;
        } else {
          const slots = decorSlots(this.save, this.layout, this.activeTankId);
          if (td.sanctuaryDecor.length >= slots) {
            this.hooks.onToast(`Sanctuary decor limit (${slots}) reached — remove one first.`);
            return;
          }
          if ((bag[id] ?? 0) <= 0) return;
          bag[id] = (bag[id] ?? 1) - 1;
          if (bag[id]! <= 0) delete bag[id];
          const nx = 0.22 + Math.random() * 0.56;
          const ny = (this.floorY(nx * this.cssW) - 4) / Math.max(1, this.cssH);
          td.sanctuaryDecor.push({ id, x: nx, y: ny, flip: false });
          td.decor = td.sanctuaryDecor.map((d) => d.id);
        }
        this.hooks.onSound('ui');
        this.hooks.onSave();
        this.syncTankContents(true);
        this.renderDecorTray();
        this.refreshHud();
        return;
      }
      if (btn.dataset.flora) {
        const pid = btn.dataset.flora as PlantId;
        const td = tankDataFor(this.save, this.activeTankId);
        if (tankHasPlant(td, pid)) return;
        const cost = PLANTS[pid].cost;
        if (!payCost(this.save, cost)) {
          this.hooks.onToast(`Need ${Object.entries(cost).map(([m, n]) => `${n} ${MATERIALS[m as MaterialId].name.toLowerCase()}`).join(', ')} to plant ${PLANTS[pid].name}.`);
          return;
        }
        td.sanctuaryPlants ??= [];
        if (!td.sanctuaryPlants.includes(pid)) td.sanctuaryPlants.push(pid);
        if (!td.plant) td.plant = pid;
        this.hooks.onToast(`Planted ${PLANTS[pid].name} in the Grand Sanctuary!`);
        this.hooks.onSound('pickup');
        this.hooks.onSave();
        this.syncTankContents(true);
        this.renderFloraTray();
        this.refreshHud();
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.active) return;
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      this.pointer.active = true;
      if (this.draggingDecor && this.save && this.activeTankId !== null) {
        const x = Math.max(48, Math.min(this.cssW - 48, e.clientX));
        const fy = this.floorY(x);
        const y = Math.max(this.cssH * 0.45, Math.min(fy + 8, e.clientY));
        this.draggingDecor.nx = x / Math.max(1, this.cssW);
        this.draggingDecor.ny = y / Math.max(1, this.cssH);
        this.draggingDecor.view.position.set(x, y);
        this.draggingDecor.glow?.position.set(x, y);
      }
    });

    window.addEventListener('pointerup', () => {
      if (!this.active) return;
      this.pointer.down = false;
      if (this.draggingDecor && this.save && this.activeTankId !== null) {
        const td = tankDataFor(this.save, this.activeTankId);
        const rec = td.sanctuaryDecor?.find((d) => d.id === this.draggingDecor!.id);
        if (rec) {
          rec.x = this.draggingDecor.nx;
          rec.y = this.draggingDecor.ny;
        }
        this.draggingDecor = null;
        this.hooks.onSave();
      }
    });

    window.addEventListener('pointerdown', (e) => {
      if (!this.active || !this.save || this.activeTankId === null) return;
      if ((e.target as HTMLElement).closest('#sanctuary-hud')) return;
      const x = e.clientX;
      const y = e.clientY;
      this.pointer.x = x;
      this.pointer.y = y;
      this.pointer.down = true;

      if (this.tool === 'decor') {
        // Pick up a placed decoration to drag it (right-click flips it!).
        for (const d of this.placedDecor) {
          if (Math.hypot(d.view.x - x, (d.view.y - 26) - y) < 52) {
            if (e.button === 2) {
              d.flip = !d.flip;
              const sc = Math.abs(d.view.scale.y);
              d.view.scale.set(d.flip ? -sc : sc, sc);
              const td = tankDataFor(this.save, this.activeTankId);
              const rec = td.sanctuaryDecor?.find((r) => r.id === d.id);
              if (rec) rec.flip = d.flip;
              this.hooks.onSave();
            } else {
              this.draggingDecor = d;
            }
            return;
          }
        }
        return;
      }

      // 1. Check clickable glowing tank drops first!
      for (let i = 0; i < this.drops.length; i++) {
        const dr = this.drops[i];
        if (Math.hypot(dr.x - x, dr.y - y) < 34) {
          const td = tankDataFor(this.save, this.activeTankId);
          const qty = td.out?.[dr.mat] ?? 0;
          if (qty > 0) {
            this.save.stored[dr.mat] = (this.save.stored[dr.mat] ?? 0) + 1;
            td.out![dr.mat] = qty - 1;
            if (td.out![dr.mat]! <= 0) delete td.out![dr.mat];
            this.spawnPops(dr.x, dr.y, 14, 0xffe488);
            this.hooks.onToast(`Collected +1 ${MATERIALS[dr.mat].name} into base storage!`);
            this.hooks.onSound('pickup');
            this.hooks.onSave();
            this.syncTankContents(true);
            return;
          }
        }
      }

      // 2. Check clicking on a creature to inspect it!
      for (const sw of this.swimmers) {
        if (Math.hypot(sw.x - x, sw.y - y) < 36) {
          this.showInspector(sw.data);
          this.hooks.onSound('ui');
          return;
        }
      }

      // 3. Otherwise: drop a shower of tasty golden kelp-mash food flakes right where you clicked!
      this.selectedFishId = null;
      this.inspectorEl.hidden = true;
      feedTank(this.save, this.activeTankId);
      for (let k = 0; k < 7; k++) {
        this.foods.push({
          x: x + (Math.random() - 0.5) * 32,
          y: y + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 28,
          vy: 24 + Math.random() * 20,
          life: 14,
          size: 2.6 + Math.random() * 1.8,
          wob: Math.random() * 10,
        });
      }
      this.spawnPops(x, y, 5, 0xffe290);
      this.hooks.onSound('feed');
      this.hooks.onSave();
      this.refreshHud();
    });

    window.addEventListener('keydown', (e) => {
      if (this.active && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    });
  }
}
