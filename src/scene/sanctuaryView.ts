import { Container, FillGradient, Graphics, Sprite, type Texture } from 'pixi.js';
import { Critter } from '../actors/critters';
import type { WorldArt } from '../art/worldArt';
import { getPropArt } from '../art/propArt';
import type { BaseLayout } from '../game/base';
import {
  breedPairInTank,
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
  tankDataFor,
  tankHarmony,
  tankHasPlant,
  payCost,
  warmEggInTank,
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

type TreatKind = 'flakes' | 'growth' | 'shimmer' | 'mineral';

interface FoodFlake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  wob: number;
  kind: TreatKind;
}

interface BubbleRing {
  x: number;
  y: number;
  r: number;
  vy: number;
  life: number;
  max: number;
}

interface SwirlPt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface AlgaePatch {
  x: number;
  y: number;
  r: number;
  alpha: number;
  maxAlpha: number;
  color: number;
}

interface BiomeWing {
  id: 'shallows' | 'kelp' | 'trench' | 'sanctum';
  name: string;
  hint: string;
  u0: number;
  u1: number;
  plates: (keyof WorldArt['plates'])[];
  unlocked: boolean;
}

interface DecorSocket {
  id: string;
  wing: BiomeWing['id'];
  tier: 'ledge' | 'terrace' | 'floor';
  nx: number;
  ny: number;
  x: number;
  y: number;
  w: number;
  unlocked: boolean;
}

interface ChimeWave {
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  max: number;
  hitIds: Set<number>;
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

type ToolMode = 'play' | 'toy' | 'scrub' | 'breed' | 'decor' | 'flora';

interface CourtshipDance {
  idA: number;
  idB: number;
  cx: number;
  cy: number;
  t: number;
  dur: number;
}

export class SanctuaryView {
  readonly view = new Container();
  private readonly bgLayer = new Container();
  private readonly midDepthLayer = new Graphics();
  private readonly rayLayer = new Graphics();
  private readonly floraBack = new Container();
  private readonly seabedG = new Graphics();
  private readonly decorLayer = new Container();
  private readonly dropLayer = new Container();
  private readonly fishLayer = new Container();
  private readonly fishEmissive = new Container();
  private readonly fishGlow = new Container();
  private readonly fgDepthLayer = new Container();
  private readonly veilLayer = new Graphics();
  private readonly fxLayer = new Graphics();
  private readonly vignetteLayer = new Graphics();

  private readonly hudEl: HTMLDivElement;
  private readonly topStatsEl: HTMLDivElement;
  private readonly inspectorEl: HTMLDivElement;
  private readonly trayEl: HTMLDivElement;
  private readonly lockPlaquesEl: HTMLDivElement;
  private readonly scrubBarEl: HTMLDivElement;

  private activeTankId: number | null = null;
  private save: SaveData | null = null;
  private layout: BaseLayout | null = null;
  private cssW = 1280;
  private cssH = 720;
  private time = 0;
  private nightMode = false;
  private nightMix = 0;
  private zenMode = false;
  private tool: ToolMode = 'play';
  private treat: TreatKind = 'flakes';
  private selectedFishId: number | null = null;
  private breedFirstId: number | null = null;
  private courtship: CourtshipDance | null = null;
  private draggingDecor: PlacedDecorItem | null = null;
  private pointer = { x: -999, y: -999, px: -999, py: -999, active: false, down: false };

  private swimmers: SwimFish[] = [];
  private placedDecor: PlacedDecorItem[] = [];
  private kelpStalks: { spr: Sprite; baseX: number; baseY: number; phase: number; amp: number }[] = [];
  private plantNodes: { node: Container; phase: number }[] = [];
  private foods: FoodFlake[] = [];
  private pops: SparklePop[] = [];
  private rings: BubbleRing[] = [];
  private swirls: SwirlPt[] = [];
  private algae: AlgaePatch[] = [];
  private chimes: ChimeWave[] = [];
  private wings: BiomeWing[] = [];
  private sockets: DecorSocket[] = [];
  private hoverSocket: DecorSocket | null = null;
  private shineSweep = 0;
  private scrubCelebrated = false;
  private parX = 0;
  private parY = 0;
  private ringCooldown = 0;
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
      this.midDepthLayer,
      this.rayLayer,
      this.floraBack,
      this.seabedG,
      this.decorLayer,
      this.dropLayer,
      this.fishLayer,
      this.fishEmissive,
      this.fishGlow,
      this.fgDepthLayer,
      this.veilLayer,
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
          <button type="button" class="sanct-btn" data-act="chime" title="Ring the Sanctuary Chime Bell to light up your fish in harmony">🔔 Chime</button>
          <button type="button" class="sanct-btn" data-act="night" title="Toggle Day / Bioluminescent Night">🌙 Night Glow</button>
          <button type="button" class="sanct-btn" data-act="zen" title="Hide UI for full-screen Zen observation (H)">📷 Zen</button>
          <button type="button" class="sanct-btn" data-act="gather" title="Bring creatures from all tanks into this Sanctuary" hidden>🐠 Gather All</button>
          <button type="button" class="sanct-btn" data-act="classic" title="Open Roster, Collection Book & Care panel">📋 Roster</button>
          <button type="button" class="sanct-btn sanct-close" data-act="close" title="Return to base (Esc)">✕ Exit</button>
        </div>
      </div>
      <button type="button" class="sanct-zen-exit" data-act="zen" hidden>👁 Show HUD (H)</button>
      <div class="sanct-locks" data-role="locks"></div>
      <div class="sanct-inspector" data-role="inspector" hidden></div>
      <div class="sanct-bottom">
        <div class="sanct-scrub-meter" data-role="scrub-bar" hidden></div>
        <div class="sanct-tray" data-role="tray" hidden></div>
        <div class="sanct-toolbar">
          <button type="button" class="sanct-tool active" data-tool="play">🫧 Feed</button>
          <button type="button" class="sanct-tool" data-tool="toy">🌀 Bubble Toy</button>
          <button type="button" class="sanct-tool" data-tool="scrub">🧽 Scrub Glass</button>
          <button type="button" class="sanct-tool" data-tool="breed">💞 Pair &amp; Breed</button>
          <button type="button" class="sanct-tool" data-tool="decor">⚓ Decor</button>
          <button type="button" class="sanct-tool" data-tool="flora">🌿 Flora</button>
          <span class="sanct-hint" data-role="hint">Click water to toss treats · Click eggs to warm &amp; hatch</span>
        </div>
      </div>
    `;
    document.body.appendChild(this.hudEl);
    this.topStatsEl = this.hudEl.querySelector<HTMLDivElement>('[data-role="stats"]')!;
    this.inspectorEl = this.hudEl.querySelector<HTMLDivElement>('[data-role="inspector"]')!;
    this.trayEl = this.hudEl.querySelector<HTMLDivElement>('[data-role="tray"]')!;
    this.lockPlaquesEl = this.hudEl.querySelector<HTMLDivElement>('[data-role="locks"]')!;
    this.scrubBarEl = this.hudEl.querySelector<HTMLDivElement>('[data-role="scrub-bar"]')!;

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
    this.zenMode = false;
    this.hudEl.classList.remove('zen');
    this.selectedFishId = null;
    this.breedFirstId = null;
    this.courtship = null;
    this.draggingDecor = null;
    this.foods = [];
    this.pops = [];
    this.rings = [];
    this.swirls = [];
    this.chimes = [];
    this.seedAlgae();
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

  private computeWings(): BiomeWing[] {
    const scans = new Set(this.save?.scans ?? []);
    const species = new Set((this.save?.creatures ?? []).map((c) => c.species));
    const hasAny = (ids: string[]) => ids.some((id) => scans.has(id));
    return [
      { id: 'shallows', name: 'SUNLIT REEF', hint: '', u0: 0, u1: 0.26, plates: ['basin', 'meadow'], unlocked: true },
      {
        id: 'kelp',
        name: 'KELP FOREST & GROTTO',
        hint: 'Scan the Kelp Forest or Grotto to unlock',
        u0: 0.26,
        u1: 0.52,
        plates: ['grotto-mid', 'forest-east'],
        unlocked: hasAny(['forest', 'gkelp', 'crab', 'shrimp', 'kcaves', 'cave']) || species.has('crab') || species.has('shrimp'),
      },
      {
        id: 'trench',
        name: 'WRECK SHELF & DEEP TRENCH',
        hint: 'Scan the Wreck Shelf or Trench Vents to unlock',
        u0: 0.52,
        u1: 0.78,
        plates: ['shelf', 'trench-mid'],
        unlocked: hasAny(['wshelf', 'corvina', 'trench', 'vents', 'snail', 'eel', 'fulmar']) || species.has('snail') || species.has('eel'),
      },
      {
        id: 'sanctum',
        name: 'CHOIR SANCTUM ALCOVE',
        hint: 'Scan the Sanctum or Chime Seahorse to unlock',
        u0: 0.78,
        u1: 1.0,
        plates: ['sanctum'],
        unlocked: hasAny(['sdoor', 'shall', 'slock', 'sheart', 'horse', 'contact']) || species.has('horse'),
      },
    ];
  }

  private buildEnvironment(w: number, h: number): void {
    this.seabedBuiltW = w;
    this.seabedBuiltH = h;
    this.wings = this.computeWings();
    this.bgLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.backdropSprites = [];
    this.floraBack.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.fgDepthLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.kelpStalks = [];

    // 1. Deep painted ocean gradient behind the 4 biome watercolor plates (transitions sunlit teal -> deep trench -> pale sanctum).
    const grad = new FillGradient(0, 0, w, h);
    grad.addColorStop(0, 0x22686e);
    grad.addColorStop(0.45, 0x13424a);
    grad.addColorStop(0.78, 0x0b222c);
    grad.addColorStop(1, 0x0d2834);
    const bgRect = new Graphics().rect(-40, -20, w + 80, h + 40).fill(grad);
    this.bgLayer.addChild(bgRect);

    // 2. Layered hand-painted watercolor world vistas for all 4 biome wings!
    for (const wing of this.wings) {
      const cx = w * ((wing.u0 + wing.u1) / 2);
      const wingW = w * (wing.u1 - wing.u0) + 120;
      const tex = wing.plates.map((k) => this.worldArt?.plates[k]).find(Boolean);
      if (!tex) continue;
      const spr = new Sprite(tex);
      spr.anchor.set(0.5, 0.5);
      const sc = Math.max(wingW / Math.max(1, tex.width), (h * 0.96) / Math.max(1, tex.height));
      spr.scale.set(sc);
      spr.position.set(cx, h * 0.48);
      spr.alpha = wing.unlocked ? 0.56 : 0.22;
      this.bgLayer.addChild(spr);
      this.backdropSprites.push(spr);
    }

    // 2b. Mid-ground 3D depth ridges, distant rock arches & deep volcanic vent chimneys!
    const mg = this.midDepthLayer.clear();
    const ridgePts: number[] = [-40, h + 20];
    for (let x = -40; x <= w + 60; x += 28) {
      const u = x / Math.max(1, w);
      const ry = h * 0.68 - Math.sin(u * Math.PI * 3.1 + 0.5) * 46 - Math.sin(u * Math.PI * 7.4) * 18;
      ridgePts.push(x, ry);
    }
    ridgePts.push(w + 60, h + 20);
    mg.poly(ridgePts).fill({ color: 0x0c242b, alpha: 0.56 });
    // Deep Trench volcanic hydrothermal vent chimneys in Wing 3 (52%..78%).
    const trenchWing = this.wings[2];
    if (trenchWing?.unlocked) {
      for (const [vxu, vh] of [[0.60, 125], [0.68, 165], [0.74, 105]] as const) {
        const vx = w * vxu;
        const vy = this.floorY(vx) + 6;
        mg.poly([vx - 24, vy, vx - 10, vy - vh, vx + 10, vy - vh, vx + 26, vy]).fill({ color: 0x1d1c1e, alpha: 0.85 });
        mg.moveTo(vx - 3, vy - vh + 10).lineTo(vx + 4, vy - vh * 0.5).lineTo(vx - 2, vy - 18)
          .stroke({ color: 0xff8c38, width: 2.2, alpha: 0.68, cap: 'round' });
        mg.ellipse(vx, vy - vh, 12, 4).fill({ color: 0xffb858, alpha: 0.65 });
      }
    }

    // 3. Background painted swaying kelp stalks & biome reef flora.
    const kelpTexs = this.worldArt?.forestKelp ?? [];
    if (kelpTexs.length) {
      const spots = [0.04, 0.11, 0.21, 0.30, 0.37, 0.44, 0.50, 0.84, 0.94];
      for (const [i, u] of spots.entries()) {
        const wing = this.wings.find((wg) => u >= wg.u0 && u <= wg.u1);
        const tex = kelpTexs[i % kelpTexs.length];
        const spr = new Sprite(tex);
        spr.anchor.set(0, 0.5);
        spr.rotation = -Math.PI / 2;
        const kh = h * (u > 0.25 && u < 0.53 ? 0.52 + (i % 3) * 0.12 : 0.34 + (i % 3) * 0.12);
        spr.width = kh;
        spr.height = 40 + (i % 3) * 14;
        const bx = w * u;
        const by = this.floorY(bx) + 14;
        spr.position.set(bx, by);
        spr.alpha = wing?.unlocked ? 0.78 : 0.22;
        this.floraBack.addChild(spr);
        this.kelpStalks.push({ spr, baseX: bx, baseY: by, phase: i * 1.37, amp: 0.05 + (i % 3) * 0.018 });
      }
    }

    // Painted seabed coral tufts & ambient seabed animals (sea lilies, sponges, sea pens) for lush visual depth!
    const reefTexs = this.worldArt?.reef ?? [];
    const bottomArt = getPropArt().bottom;
    const bottomKeys = ['lily', 'sponge', 'worm', 'star', 'pen'] as const;
    for (let i = 0; i < 10; i++) {
      const u = 0.06 + (i / 9) * 0.88;
      const wing = this.wings.find((wg) => u >= wg.u0 && u <= wg.u1);
      const bx = w * u;
      const by = this.floorY(bx) + 6;
      const rTex = reefTexs[i % Math.max(1, reefTexs.length)];
      if (rTex && i % 2 === 0) {
        const spr = new Sprite(rTex);
        spr.anchor.set(0.5, 0.9);
        const sc = (74 + (i % 3) * 18) / Math.max(1, rTex.width);
        spr.scale.set(sc);
        spr.position.set(bx, by);
        spr.alpha = wing?.unlocked ? 0.84 : 0.22;
        this.floraBack.addChild(spr);
      } else {
        const bTex = bottomArt[bottomKeys[i % bottomKeys.length]];
        if (bTex) {
          const spr = new Sprite(bTex);
          spr.anchor.set(0.5, 0.92);
          const sc = (54 + (i % 3) * 14) / Math.max(1, bTex.width);
          spr.scale.set(sc);
          spr.position.set(bx, by);
          spr.alpha = wing?.unlocked ? 0.86 : 0.24;
          this.floraBack.addChild(spr);
        }
      }
    }

    // 4. Sculpted undulating painted seabed floor spanning all 4 biome terraces!
    const sg = this.seabedG.clear();
    const pts: number[] = [];
    for (let x = -40; x <= w + 48; x += 24) pts.push(x, this.floorY(x));
    pts.push(w + 48, h + 20, -40, h + 20);
    const sandGrad = new FillGradient(0, h * 0.74, w, h);
    sandGrad.addColorStop(0, 0x456660);
    sandGrad.addColorStop(0.35, 0x2c4b46);
    sandGrad.addColorStop(0.7, 0x1c2529);
    sandGrad.addColorStop(1, 0x2c3c46);
    sg.poly(pts).fill(sandGrad);
    for (let x = 0; x <= w; x += 20) {
      const y = this.floorY(x);
      if (x === 0) sg.moveTo(x, y + 2);
      else sg.lineTo(x, y + 2);
    }
    sg.stroke({ color: 0x8cc2b4, width: 4, alpha: 0.36, cap: 'round' });

    // 4a. Tiered biome rock ledges & grounded snap sockets (3 tiers per biome: Upper Ledge, Mid Terrace, Seabed Floor)!
    const wingBy = new Map(this.wings.map((wg) => [wg.id, wg]));
    const socketDefs: { id: string; wing: BiomeWing['id']; tier: DecorSocket['tier']; nx: number; ny?: number; w: number }[] = [
      // Wing 1: Sunlit Reef & Shallows
      { id: 'sh-ledge', wing: 'shallows', tier: 'ledge', nx: 0.085, ny: 0.57, w: 126 },
      { id: 'sh-terrace', wing: 'shallows', tier: 'terrace', nx: 0.195, ny: 0.70, w: 118 },
      { id: 'sh-floor', wing: 'shallows', tier: 'floor', nx: 0.14, w: 110 },
      // Wing 2: Kelp Forest & Grotto
      { id: 'kp-ledge', wing: 'kelp', tier: 'ledge', nx: 0.335, ny: 0.54, w: 132 },
      { id: 'kp-terrace', wing: 'kelp', tier: 'terrace', nx: 0.455, ny: 0.68, w: 120 },
      { id: 'kp-floor', wing: 'kelp', tier: 'floor', nx: 0.39, w: 114 },
      // Wing 3: Wreck Shelf & Deep Trench
      { id: 'tr-ledge', wing: 'trench', tier: 'ledge', nx: 0.59, ny: 0.58, w: 128 },
      { id: 'tr-terrace', wing: 'trench', tier: 'terrace', nx: 0.71, ny: 0.71, w: 122 },
      { id: 'tr-floor', wing: 'trench', tier: 'floor', nx: 0.645, w: 114 },
      // Wing 4: Choir Sanctum Alcove
      { id: 'sa-ledge', wing: 'sanctum', tier: 'ledge', nx: 0.85, ny: 0.55, w: 128 },
      { id: 'sa-terrace', wing: 'sanctum', tier: 'terrace', nx: 0.935, ny: 0.69, w: 116 },
      { id: 'sa-floor', wing: 'sanctum', tier: 'floor', nx: 0.89, w: 112 },
    ];
    const ledgeStyle: Record<BiomeWing['id'], { body: number; rim: number; shade: number }> = {
      shallows: { body: 0x3b5c58, rim: 0x8cc6b4, shade: 0x1a3030 },
      kelp: { body: 0x2c4a3e, rim: 0x7cb888, shade: 0x142620 },
      trench: { body: 0x26292e, rim: 0x7a6a58, shade: 0x121418 },
      sanctum: { body: 0x3a4d5c, rim: 0xaad2dc, shade: 0x1c2834 },
    };
    this.sockets = socketDefs.map((d) => {
      const x = w * d.nx;
      const y = d.ny !== undefined ? h * d.ny : this.floorY(x) - 2;
      const unlocked = !!wingBy.get(d.wing)?.unlocked;
      if (d.tier !== 'floor') {
        const st = ledgeStyle[d.wing];
        const hw = d.w / 2;
        const th = d.tier === 'ledge' ? 30 : 24;
        // Sculpted rocky shelf protruding naturally from the tank wall/back.
        sg.poly([
          x - hw, y + 4,
          x - hw + 10, y - 2,
          x + hw - 10, y - 2,
          x + hw, y + 4,
          x + hw - 16, y + th,
          x + 8, y + th + 6,
          x - hw + 18, y + th - 2,
        ]).fill({ color: st.body }).stroke({ color: 0x0e1a1d, width: 2 });
        // Shaded rocky underside + sunlit top rim ledge where decorations sit flush.
        sg.poly([x - hw + 14, y + 10, x + hw - 14, y + 10, x + hw - 18, y + th - 1, x - hw + 20, y + th - 3])
          .fill({ color: st.shade, alpha: 0.65 });
        sg.moveTo(x - hw + 8, y).quadraticCurveTo(x, y - 3, x + hw - 8, y)
          .stroke({ color: st.rim, width: 3.2, alpha: unlocked ? 0.65 : 0.22, cap: 'round' });
      }
      return { id: d.id, wing: d.wing, tier: d.tier, nx: d.nx, ny: y / Math.max(1, h), x, y, w: d.w, unlocked };
    });

    // 4b. Soft-focus foreground framing kelp & corner rock overhangs for rich 3D parallax depth!
    const fgG = new Graphics();
    fgG.poly([-40, h + 20, -40, h * 0.72, w * 0.08, h * 0.88, w * 0.14, h + 20]).fill({ color: 0x07151a, alpha: 0.65 });
    fgG.poly([w + 40, h + 20, w + 40, h * 0.70, w * 0.92, h * 0.87, w * 0.85, h + 20]).fill({ color: 0x07151a, alpha: 0.65 });
    this.fgDepthLayer.addChild(fgG);
    if (kelpTexs.length) {
      for (const u of [0.02, 0.98]) {
        const spr = new Sprite(kelpTexs[0]);
        spr.anchor.set(0, 0.5);
        spr.rotation = -Math.PI / 2;
        spr.width = h * 0.42;
        spr.height = 56;
        spr.position.set(w * u, h + 20);
        spr.tint = 0x162c2b;
        spr.alpha = 0.55;
        this.fgDepthLayer.addChild(spr);
      }
    }

    // 4c. Misty greyed-out unexplored biome veils + engraved brass plaques for locked wings!
    const vl = this.veilLayer.clear();
    const plaques: string[] = [];
    for (const wing of this.wings) {
      if (wing.unlocked) continue;
      const x0 = w * wing.u0;
      const ww = w * (wing.u1 - wing.u0);
      vl.rect(x0, 0, ww, h).fill({ color: 0x141d22, alpha: 0.68 });
      vl.moveTo(x0, 14).lineTo(x0, h - 14).stroke({ color: 0x8aa0a4, width: 1.5, alpha: 0.25 });
      const leftPct = ((wing.u0 + wing.u1) / 2) * 100;
      plaques.push(`
        <div class="sanct-lock-plaque" style="left:${leftPct.toFixed(1)}%">
          <div class="sanct-lock-tag">🔒 UNCHARTED WING</div>
          <strong>${wing.name}</strong>
          <span>${wing.hint}</span>
        </div>
      `);
    }
    this.lockPlaquesEl.innerHTML = plaques.join('');

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
      const z = c.stage === 'egg' ? 0.12 : ((c.id * 0.6180339) % 1);
      critter.fog = z * 0.38;
      // Compact showcase scale so dozens of creatures fill the Sanctuary like a living reef!
      const sc = (c.stage === 'egg' ? 0.82 : 0.72) * (1 - z * 0.28);
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
    const unlockedMax = this.wings.reduce((m, wg) => (wg.unlocked ? Math.max(m, wg.u1) : m), 0.26);
    const clampX = (x0: number, x1: number) => {
      const hi = Math.max(0.22, Math.min(x1, unlockedMax - 0.03));
      const lo = Math.min(x0, hi - 0.14);
      return { x0: Math.max(0.04, lo), x1: hi };
    };
    switch (sp) {
      case 'puffcap': return { ...clampX(0.06, 0.72), y0: 0.14, y1: 0.44 };
      case 'ray': return { ...clampX(0.06, 0.78), y0: 0.22, y1: 0.62 };
      case 'glowfin': return { ...clampX(0.05, 0.48), y0: 0.28, y1: 0.72 };
      case 'crab': return { ...clampX(0.24, 0.56), y0: 0.78, y1: 0.86, floor: true };
      case 'shrimp': return { ...clampX(0.22, 0.62), y0: 0.42, y1: 0.78 };
      case 'snail': return { ...clampX(0.50, 0.80), y0: 0.78, y1: 0.86, floor: true };
      case 'eel': return { ...clampX(0.52, 0.80), y0: 0.54, y1: 0.82 };
      case 'horse': return { ...clampX(0.74, 0.96), y0: 0.28, y1: 0.72 };
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

    // Smooth mouse-driven 3D aquarium depth parallax!
    const targetParX = this.pointer.active ? (this.pointer.x / Math.max(1, cssW) - 0.5) * 2 : 0;
    const targetParY = this.pointer.active ? (this.pointer.y / Math.max(1, cssH) - 0.5) * 2 : 0;
    this.parX += (targetParX - this.parX) * Math.min(1, dt * 4);
    this.parY += (targetParY - this.parY) * Math.min(1, dt * 4);
    this.bgLayer.position.set(-this.parX * 14, -this.parY * 6);
    this.midDepthLayer.position.set(-this.parX * 26, -this.parY * 10);
    this.floraBack.position.set(-this.parX * 8, -this.parY * 3);
    this.fgDepthLayer.position.set(this.parX * 20, this.parY * 7);

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

    // Advance live courtship spiral dance if active!
    if (this.courtship) {
      this.courtship.t += dt;
      if (Math.random() < dt * 14) {
        const a = Math.random() * Math.PI * 2;
        const r = 18 + Math.random() * 28;
        this.spawnPops(this.courtship.cx + Math.cos(a) * r, this.courtship.cy + Math.sin(a) * r, 1, Math.random() < 0.5 ? 0xffb8c6 : 0xffe490);
      }
      if (this.courtship.t >= this.courtship.dur) {
        this.spawnPops(this.courtship.cx, this.courtship.cy, 20, 0xffe490);
        this.courtship = null;
      }
    }

    // Update full-detail swimming creatures!
    const w = this.cssW;
    const h = this.cssH;
    for (const s of this.swimmers) {
      const zone = this.homeZone(s.data.species);
      if (s.data.stage === 'egg') {
        const ey = this.floorY(s.x) - 10;
        const wob = s.data.growth > 0.65 ? Math.sin(this.time * 12 + s.phase) * (2.5 * s.data.growth) : 0;
        s.y = ey;
        s.critter.update(dt, this.time, s.x + wob, s.y, 0, 0, { vigour: 1, sick: 0 });
        continue;
      }
      // If currently performing a courtship spiral dance, orbit smoothly around the meeting center!
      if (this.courtship && (s.data.id === this.courtship.idA || s.data.id === this.courtship.idB)) {
        const isA = s.data.id === this.courtship.idA;
        const ang = this.courtship.t * 4.4 + (isA ? 0 : Math.PI);
        const rad = 42 * (1 - 0.35 * Math.sin((this.courtship.t / this.courtship.dur) * Math.PI));
        const tx = this.courtship.cx + Math.cos(ang) * rad;
        const ty = this.courtship.cy + Math.sin(ang) * (rad * 0.65);
        s.vx = (tx - s.x) * 6;
        s.vy = (ty - s.y) * 6;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.critter.update(dt, this.time, s.x, s.y, s.vx, s.vy, { vigour: 1, sick: 0, notice: 1, curious: 1, feeding: 0 });
        continue;
      }
      s.retarget -= dt;
      s.feeding = Math.max(0, s.feeding - dt * 1.6);

      // 1. Seek nearest food flake OR playful bubble ring!
      let targetFood: FoodFlake | null = null;
      let bestFd = 320;
      for (const fl of this.foods) {
        const d = Math.hypot(fl.x - s.x, fl.y - s.y);
        if (d < bestFd) {
          bestFd = d;
          targetFood = fl;
        }
      }
      let targetRing: BubbleRing | null = null;
      if (!targetFood && !zone.floor) {
        let bestRd = 240;
        for (const rg of this.rings) {
          const d = Math.hypot(rg.x - s.x, rg.y - s.y);
          if (d < bestRd) {
            bestRd = d;
            targetRing = rg;
          }
        }
      }
      let curious = 0;
      if (targetFood) {
        s.tx = targetFood.x;
        s.ty = targetFood.y;
        s.notice = 1;
        if (bestFd < 24) {
          const kind = targetFood.kind;
          targetFood.life = 0;
          s.feeding = 1;
          s.data.fed = Math.min(1, s.data.fed + 0.16);
          s.data.comfort = Math.min(1, s.data.comfort + 0.06);
          if (kind === 'growth' && s.data.stage === 'young') {
            s.data.growth = Math.min(0.99, s.data.growth + 0.14);
            this.spawnPops(s.x, s.y - 10, 9, 0x92f4a8);
          } else if (kind === 'shimmer' && this.save && this.activeTankId !== null) {
            const td = tankDataFor(this.save, this.activeTankId);
            td.tonicUntil = Math.max(td.tonicUntil ?? 0, this.save.playSeconds) + 90;
            this.spawnPops(s.x, s.y - 10, 11, 0xfff0b2);
          } else if (kind === 'mineral' && this.save && this.activeTankId !== null && s.data.stage === 'grown') {
            s.data.make = Math.min(1, s.data.make + 0.45);
            if (s.data.make >= 1) {
              s.data.make = 0;
              const td = tankDataFor(this.save, this.activeTankId);
              const mat = SPECIES[s.data.species].makes;
              td.out ??= {};
              td.out[mat] = (td.out[mat] ?? 0) + 1;
              this.syncTankContents(true);
            }
            this.spawnPops(s.x, s.y - 10, 9, 0xffc66e);
          } else {
            this.spawnPops(s.x, s.y - 10, 6, 0x9ef5d0);
          }
          this.hooks.onSound('bubble');
        }
      } else if (targetRing) {
        // Playfully dart right through floating bubble rings!
        s.tx = targetRing.x;
        s.ty = targetRing.y;
        s.notice = 1;
        curious = 0.9;
        if (Math.hypot(targetRing.x - s.x, targetRing.y - s.y) < targetRing.r + 12) {
          targetRing.life = 0;
          s.data.comfort = Math.min(1, s.data.comfort + 0.15);
          if (s.data.stage === 'grown') s.data.make = Math.min(0.99, s.data.make + 0.12);
          this.spawnPops(s.x, s.y, 12, 0xb8f8f0);
          this.hooks.onSound('bubble');
        }
      } else if (this.pointer.active && this.tool === 'play') {
        // 2. Gentle "Tap the Glass" cursor curiosity!
        const pd = Math.hypot(this.pointer.x - s.x, this.pointer.y - s.y);
        if (pd < 230 && pd > 55) {
          curious = 1 - pd / 230;
          s.notice = Math.min(1, s.notice + dt * 3);
          if (s.data.species === 'puffcap') {
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

      // Surf active current swirl ribbons!
      for (const sw of this.swirls) {
        const sd = Math.hypot(sw.x - s.x, sw.y - s.y);
        if (sd < 95) {
          const pull = (1 - sd / 95) * 1.6;
          s.vx += sw.vx * pull * dt;
          s.vy += sw.vy * pull * dt;
        }
      }

      if (!targetFood && !targetRing && (s.retarget <= 0 || Math.hypot(s.tx - s.x, s.ty - s.y) < 28)) {
        // Living Decor behavior: 38% chance to visit a favorite placed decoration!
        const fav = this.favoriteDecorFor(s.data.species);
        if (fav && Math.random() < 0.38) {
          s.tx = fav.view.x + (Math.random() - 0.5) * 58;
          s.ty = zone.floor ? this.floorY(s.tx) - 10 : Math.max(80, fav.view.y - 26 - Math.random() * 44);
        } else {
          s.tx = w * (zone.x0 + Math.random() * (zone.x1 - zone.x0));
          s.ty = zone.floor ? this.floorY(s.tx) - 10 : h * (zone.y0 + Math.random() * (zone.y1 - zone.y0));
        }
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
    // Advance Bubble Rings, Current Swirls, and Resonance Chime Waves!
    this.ringCooldown = Math.max(0, this.ringCooldown - dt);
    const keptRings: BubbleRing[] = [];
    for (const rg of this.rings) {
      rg.life -= dt;
      if (rg.life <= 0) continue;
      rg.y += rg.vy * dt;
      rg.x += Math.sin(this.time * 2.6 + rg.r) * 14 * dt;
      rg.r += 4.5 * dt;
      const a = Math.min(1, rg.life / (rg.max * 0.4));
      fx.ellipse(rg.x, rg.y, rg.r, rg.r * 0.56).stroke({ color: 0xc8faf4, width: 2.8, alpha: 0.72 * a });
      fx.ellipse(rg.x, rg.y - 1.5, rg.r * 0.86, rg.r * 0.44).stroke({ color: 0xffffff, width: 1.1, alpha: 0.55 * a });
      keptRings.push(rg);
    }
    this.rings = keptRings;

    const keptSwirls: SwirlPt[] = [];
    for (let i = 0; i < this.swirls.length; i++) {
      const sw = this.swirls[i];
      sw.life -= dt;
      if (sw.life <= 0) continue;
      sw.x += sw.vx * 0.12 * dt;
      sw.y += sw.vy * 0.12 * dt;
      fx.circle(sw.x, sw.y, 4 + sw.life * 8).fill({ color: 0x9ef5e8, alpha: sw.life * 0.24 });
      keptSwirls.push(sw);
    }
    this.swirls = keptSwirls;

    const keptChimes: ChimeWave[] = [];
    for (const ch of this.chimes) {
      ch.life -= dt;
      if (ch.life <= 0) continue;
      const p = 1 - ch.life / ch.max;
      ch.r = p * ch.maxR;
      const a = (1 - p) * 0.85;
      fx.circle(ch.x, ch.y, ch.r).stroke({ color: 0xffe08a, width: 3.4 * (1 - p * 0.6), alpha: a });
      fx.circle(ch.x, ch.y, ch.r * 0.92).stroke({ color: 0xfff6d4, width: 1.4, alpha: a * 0.65 });
      // Every creature touched by the harmonic wave flashes its glow pattern & gathers toward center!
      for (const sw of this.swimmers) {
        if (sw.data.stage === 'egg' || ch.hitIds.has(sw.data.id)) continue;
        const d = Math.hypot(sw.x - ch.x, sw.y - ch.y);
        if (Math.abs(d - ch.r) < 34) {
          ch.hitIds.add(sw.data.id);
          sw.notice = 1;
          const tr = traitsOf(sw.data);
          const col = tr.choir ? 0xb49cff : tr.radiant ? 0xfff0a0 : 0xffe088;
          this.spawnPops(sw.x, sw.y, tr.radiant || tr.choir ? 14 : 7, col);
          if (sw.data.species !== 'crab' && sw.data.species !== 'snail') {
            sw.tx = this.cssW * (0.35 + Math.random() * 0.3);
            sw.ty = this.cssH * (0.32 + Math.random() * 0.26);
          }
        }
      }
      keptChimes.push(ch);
    }
    this.chimes = keptChimes;

    // Render PowerWash-style organic algae & mineral biofilm smudges (wiped cleanly in Scrub Glass mode!).
    for (const al of this.algae) {
      if (al.alpha <= 0.02) continue;
      const vis = this.tool === 'scrub' ? 0.52 : 0.24;
      fx.circle(al.x, al.y, al.r).fill({ color: al.color, alpha: al.alpha * vis });
      fx.circle(al.x + al.r * 0.24, al.y - al.r * 0.16, al.r * 0.62).fill({ color: 0x8cc278, alpha: al.alpha * vis * 0.65 });
      fx.circle(al.x - al.r * 0.22, al.y + al.r * 0.2, al.r * 0.42).fill({ color: 0x3b6844, alpha: al.alpha * vis * 0.55 });
    }
    if (this.tool === 'scrub' && this.pointer.active) {
      // PowerWash sponge ring cursor with active foam sheen!
      const r = this.pointer.down ? 44 : 38;
      fx.circle(this.pointer.x, this.pointer.y, r).fill({ color: 0xd8fff8, alpha: this.pointer.down ? 0.14 : 0.06 })
        .stroke({ color: 0xb8f8e8, width: 2.5, alpha: 0.85 });
    }
    // 100% Sparkling Clean celebratory diagonal glass shine sweep!
    if (this.shineSweep > 0) {
      this.shineSweep = Math.max(0, this.shineSweep - dt * 1.15);
      const p = 1 - this.shineSweep;
      const sx = -200 + p * (this.cssW + 460);
      fx.poly([sx, 0, sx + 120, 0, sx - 80, this.cssH, sx - 200, this.cssH])
        .fill({ color: 0xfff8dc, alpha: Math.sin(p * Math.PI) * 0.32 });
    }

    for (const f of this.foods) {
      const col = f.kind === 'growth' ? 0x7cf09e : f.kind === 'shimmer' ? 0xfff2b8 : f.kind === 'mineral' ? 0xe89c4c : 0xf4cf72;
      fx.circle(f.x, f.y, f.size).fill({ color: col, alpha: Math.min(1, f.life * 0.5) });
      fx.circle(f.x - 1, f.y - 1, f.size * 0.45).fill({ color: 0xffffff, alpha: 0.85 });
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

    // Egg hatch-progress halos + Pair & Breed partner highlight rings!
    const breedFirst = this.breedFirstId !== null ? this.swimmers.find((s) => s.data.id === this.breedFirstId) : null;
    for (const s of this.swimmers) {
      if (s.data.stage === 'egg') {
        const prog = Math.max(0.06, Math.min(1, s.data.growth));
        const ready = prog >= 0.75;
        const pulse = 0.6 + 0.4 * Math.sin(this.time * (ready ? 7 : 3.2) + s.phase);
        fx.circle(s.x, s.y, 22).stroke({ color: 0xffe08a, width: 1.5, alpha: 0.25 });
        fx.arc(s.x, s.y, 22, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2)
          .stroke({ color: ready ? 0x9ef5c8 : 0xffd670, width: 3.2, alpha: 0.72 + 0.28 * pulse, cap: 'round' });
      } else if (this.tool === 'breed' && s.data.stage === 'grown') {
        if (s.data.id === this.breedFirstId) {
          fx.circle(s.x, s.y, 34 + Math.sin(this.time * 6) * 3).stroke({ color: 0xffa6be, width: 2.8, alpha: 0.92 });
        } else if (breedFirst && s.data.species === breedFirst.data.species) {
          fx.circle(s.x, s.y, 30 + Math.sin(this.time * 5 + s.phase) * 3).stroke({ color: 0xffd278, width: 2.2, alpha: 0.8 });
        } else if (!breedFirst && s.data.fed >= 0.55) {
          fx.circle(s.x, s.y, 26).stroke({ color: 0xffe49c, width: 1.3, alpha: 0.36 });
        }
      }
    }

    // Render glowing geography snap-sockets whenever Arrange Decor mode is active!
    if (this.tool === 'decor') {
      const pulse = 0.55 + 0.45 * Math.sin(this.time * 4.5);
      for (const sk of this.sockets) {
        if (!sk.unlocked) continue;
        const occ = this.socketOccupied(sk, this.draggingDecor?.id);
        const hovered = this.hoverSocket?.id === sk.id;
        if (occ && !hovered) continue;
        const col = hovered ? 0xffe488 : 0x9ef5d8;
        const alpha = hovered ? 0.95 : 0.42 + pulse * 0.28;
        fx.ellipse(sk.x, sk.y - 2, hovered ? 36 : 26, hovered ? 9 : 6.5)
          .fill({ color: col, alpha: hovered ? 0.26 : 0.12 })
          .stroke({ color: col, width: hovered ? 2.6 : 1.6, alpha });
        if (hovered) {
          fx.moveTo(sk.x - 7, sk.y - 18).lineTo(sk.x, sk.y - 10).lineTo(sk.x + 7, sk.y - 18)
            .stroke({ color: 0xfff0b2, width: 2.2, alpha: 0.95, cap: 'round', join: 'round' });
        }
      }
    }

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
    const eggs = list.filter((c) => c.stage === 'egg').length;
    const h = tankHarmony(this.save, this.activeTankId);
    const stars = '★'.repeat(h.stars) + '☆'.repeat(Math.max(0, 5 - h.stars));
    const waterPct = Math.round(td.water * 100);
    this.topStatsEl.innerHTML = `
      <span class="sanct-stars" title="Ecosystem Harmony">${stars}</span>
      <span>${list.length - eggs} creature${list.length - eggs === 1 ? '' : 's'}${eggs > 0 ? ` · ${eggs} egg${eggs === 1 ? '' : 's'}` : ''}</span>
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

  private socketOccupied(sk: DecorSocket, ignoreId?: DecorId): boolean {
    return this.placedDecor.some((d) => d.id !== ignoreId && Math.hypot(d.view.x - sk.x, d.view.y - sk.y) < 22);
  }

  private nearestOpenSocket(x: number, y: number, ignoreId?: DecorId): DecorSocket | null {
    let best: DecorSocket | null = null;
    let bestD = Infinity;
    for (const sk of this.sockets) {
      if (!sk.unlocked || this.socketOccupied(sk, ignoreId)) continue;
      const d = Math.hypot(sk.x - x, sk.y - y);
      if (d < bestD) {
        bestD = d;
        best = sk;
      }
    }
    return best;
  }

  private seedAlgae(): void {
    this.algae = [];
    this.scrubCelebrated = false;
    if (!this.save || this.activeTankId === null) return;
    const td = tankDataFor(this.save, this.activeTankId);
    const dirt = Math.max(0.35, 1 - td.water);
    const count = Math.round(28 + dirt * 24);
    const tones = [0x4c7c4e, 0x5d8e56, 0x3e6e58, 0x6a965c];
    for (let i = 0; i < count; i++) {
      const perimeter = i < count * 0.72;
      let x: number;
      let y: number;
      if (perimeter) {
        const edge = i % 4;
        x = edge === 0 ? 28 + Math.random() * 165 : edge === 1 ? this.cssW - 28 - Math.random() * 165 : 70 + Math.random() * (this.cssW - 140);
        y = edge === 2 ? 55 + Math.random() * 125 : edge === 3 ? this.cssH - 70 - Math.random() * 145 : 90 + Math.random() * (this.cssH - 180);
      } else {
        x = 140 + Math.random() * (this.cssW - 280);
        y = 120 + Math.random() * (this.cssH - 250);
      }
      const ma = 0.65 + Math.random() * 0.35;
      this.algae.push({ x, y, r: 22 + Math.random() * 34, alpha: ma, maxAlpha: ma, color: tones[i % tones.length] });
    }
    this.updateScrubMeter();
  }

  private cleanPercent(): number {
    if (!this.algae.length) return 100;
    let total = 0;
    let left = 0;
    for (const al of this.algae) {
      total += al.maxAlpha;
      left += al.alpha;
    }
    if (total <= 0.01) return 100;
    return Math.min(100, Math.round((1 - left / total) * 100));
  }

  private updateScrubMeter(): void {
    const show = this.tool === 'scrub';
    this.scrubBarEl.hidden = !show;
    if (!show) return;
    const pct = this.cleanPercent();
    this.scrubBarEl.innerHTML = `
      <span>🧽 Glass Cleanliness</span>
      <div class="sanct-scrub-track"><i style="width:${pct}%"></i></div>
      <strong>${pct}%</strong>
    `;
  }

  private favoriteDecorFor(sp: CreatureData['species']): PlacedDecorItem | undefined {
    const prefs: Record<CreatureData['species'], DecorId[]> = {
      crab: ['helmet', 'anchor', 'chest', 'wheel'],
      eel: ['arch', 'coralarch', 'amphora', 'cairn'],
      horse: ['kelplantern', 'lantern', 'coralarch', 'belljar'],
      glowfin: ['chest', 'amphora', 'bell', 'astrolabe'],
      shrimp: ['driftwood', 'clam', 'cairn', 'floats'],
      snail: ['cairn', 'driftwood', 'anchor', 'amphora'],
      puffcap: ['floats', 'bell', 'kelplantern'],
      ray: ['arch', 'wheel', 'clam'],
    };
    const want = prefs[sp];
    const matches = this.placedDecor.filter((d) => want.includes(d.id));
    if (!matches.length) return undefined;
    return matches[Math.floor(Math.random() * matches.length)];
  }

  private ringChime(cx = this.cssW * 0.5, cy = this.cssH * 0.42): void {
    this.chimes.push({ x: cx, y: cy, r: 10, maxR: Math.hypot(this.cssW, this.cssH) * 0.72, life: 1.9, max: 1.9, hitIds: new Set() });
    this.spawnPops(cx, cy, 14, 0xffe290);
    this.hooks.onSound('pickup');
  }

  private toggleZen(): void {
    this.zenMode = !this.zenMode;
    this.hudEl.classList.toggle('zen', this.zenMode);
    const exitBtn = this.hudEl.querySelector<HTMLButtonElement>('.sanct-zen-exit')!;
    exitBtn.hidden = !this.zenMode;
    this.hooks.onSound('ui');
  }

  private renderTreatTray(): void {
    const opts: { id: TreatKind; label: string; tip: string }[] = [
      { id: 'flakes', label: '🌾 Kelp Flakes', tip: 'Everyday meal for all species' },
      { id: 'growth', label: '🌱 Growth Pellets', tip: 'Helps young creatures grow faster' },
      { id: 'shimmer', label: '✨ Shimmer Spores', tip: 'Boosts Radiant & rare breeding odds' },
      { id: 'mineral', label: '🪨 Mineral Grit', tip: 'Triggers bonus material output' },
    ];
    this.trayEl.innerHTML = opts.map((o) =>
      `<button type="button" class="sanct-chip ${this.treat === o.id ? 'on' : ''}" data-treat="${o.id}" title="${o.tip}">${o.label}</button>`
    ).join('');
  }

  private syncToolbar(): void {
    this.hudEl.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((b) => {
      b.classList.toggle('active', b.dataset.tool === this.tool);
    });
    const hint = this.hudEl.querySelector<HTMLElement>('[data-role="hint"]')!;
    if (this.tool === 'play') {
      hint.textContent = 'Click water to toss treats · Click eggs to warm & hatch · Click chest/bell decor!';
      this.renderTreatTray();
      this.trayEl.hidden = false;
    } else if (this.tool === 'toy') {
      hint.textContent = 'Click & drag through the water to swirl currents and blow bubble rings for your fish to play in!';
      this.trayEl.hidden = true;
    } else if (this.tool === 'scrub') {
      hint.textContent = 'Hold & sweep your sponge over the algae biofilm until the glass reaches 100% Sparkling Clean!';
      this.trayEl.hidden = true;
    } else if (this.tool === 'breed') {
      hint.textContent = this.breedFirstId !== null
        ? 'Now click a second grown creature of the same species to start their courtship dance!'
        : 'Click two grown, well-fed creatures of the same species to pair them and lay an egg right in the tank';
      this.trayEl.hidden = true;
    } else if (this.tool === 'decor') {
      hint.textContent = 'Drag decor to snap onto glowing rock ledges & seabed tiers · Right-click a piece to flip';
      this.renderDecorTray();
      this.trayEl.hidden = false;
    } else {
      hint.textContent = 'Plant biome flora so every species feels right at home in the Sanctuary';
      this.renderFloraTray();
      this.trayEl.hidden = false;
    }
    this.updateScrubMeter();
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
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act], [data-tool], [data-decor], [data-flora], [data-treat]');
      if (!btn || !this.save || !this.layout || this.activeTankId === null) return;
      e.stopPropagation();
      const act = btn.dataset.act;
      if (act === 'close') { this.close(); return; }
      if (act === 'chime') {
        this.ringChime();
        return;
      }
      if (act === 'zen') {
        this.toggleZen();
        return;
      }
      if (act === 'night') {
        this.nightMode = !this.nightMode;
        this.hooks.onSound('ui');
        this.refreshHud();
        return;
      }
      if (btn.dataset.treat) {
        this.treat = btn.dataset.treat as TreatKind;
        this.hooks.onSound('ui');
        this.renderTreatTray();
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
        this.breedFirstId = null;
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
          const sk = this.nearestOpenSocket(this.cssW * 0.25, this.cssH * 0.72);
          if (!sk) {
            this.hooks.onToast('All display ledges in your unlocked biomes are full — scan new biomes to open more tiers!');
            return;
          }
          bag[id] = (bag[id] ?? 1) - 1;
          if (bag[id]! <= 0) delete bag[id];
          td.sanctuaryDecor.push({ id, x: sk.nx, y: sk.ny, flip: false });
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
      const vx = (e.clientX - this.pointer.x) * 14;
      const vy = (e.clientY - this.pointer.y) * 14;
      this.pointer.px = this.pointer.x;
      this.pointer.py = this.pointer.y;
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      this.pointer.active = true;
      if (this.draggingDecor && this.save && this.activeTankId !== null) {
        const snap = this.nearestOpenSocket(e.clientX, e.clientY, this.draggingDecor.id);
        this.hoverSocket = snap;
        const x = snap ? snap.x : Math.max(48, Math.min(this.cssW - 48, e.clientX));
        const y = snap ? snap.y : Math.max(this.cssH * 0.45, Math.min(this.floorY(x) + 8, e.clientY));
        this.draggingDecor.nx = x / Math.max(1, this.cssW);
        this.draggingDecor.ny = y / Math.max(1, this.cssH);
        this.draggingDecor.view.position.set(x, y);
        this.draggingDecor.glow?.position.set(x, y);
      } else if (this.pointer.down && this.tool === 'toy') {
        // Swirl shimmering currents & blow rising bubble rings!
        this.swirls.push({ x: e.clientX, y: e.clientY, vx: Math.max(-220, Math.min(220, vx)), vy: Math.max(-220, Math.min(220, vy)), life: 0.75 });
        if (this.ringCooldown <= 0 && this.rings.length < 10) {
          this.ringCooldown = 0.28;
          this.rings.push({ x: e.clientX, y: e.clientY, r: 16, vy: -34, life: 4.5, max: 4.5 });
          this.hooks.onSound('bubble');
        }
      } else if (this.pointer.down && this.tool === 'scrub' && this.save && this.activeTankId !== null) {
        // PowerWash-style tactile glass-scrubbing minigame!
        let wiped = false;
        for (const al of this.algae) {
          if (al.alpha <= 0.02) continue;
          if (Math.hypot(al.x - e.clientX, al.y - e.clientY) < al.r + 44) {
            al.alpha = Math.max(0, al.alpha - 0.24);
            wiped = true;
            if (al.alpha <= 0.02) {
              al.alpha = 0;
              this.spawnPops(al.x, al.y, 10, 0xb8fff4);
              this.foods.push({ x: al.x, y: al.y, vx: (Math.random() - 0.5) * 18, vy: 18, life: 12, size: 2.2, wob: Math.random() * 10, kind: 'flakes' });
            }
          }
        }
        if (wiped) {
          const pct = this.cleanPercent();
          const td = tankDataFor(this.save, this.activeTankId);
          td.water = Math.max(td.water, pct / 100);
          this.spawnPops(e.clientX, e.clientY, 3, 0xe8fffc);
          this.updateScrubMeter();
          if (pct >= 100 && !this.scrubCelebrated) {
            this.scrubCelebrated = true;
            this.shineSweep = 1;
            td.water = 1;
            cleanTank(this.save, this.activeTankId);
            for (const sw of this.swimmers) sw.data.comfort = Math.min(1, sw.data.comfort + 0.18);
            this.spawnPops(this.cssW * 0.5, this.cssH * 0.45, 28, 0xffe490);
            this.hooks.onToast('✨ 100% Sparkling Clean! Your creatures love the crystal-clear water!');
            this.hooks.onSound('pickup');
          }
          this.hooks.onSave();
          this.refreshHud();
        }
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
        if (this.hoverSocket) {
          this.spawnPops(this.hoverSocket.x, this.hoverSocket.y - 8, 8, 0xffe490);
          this.hooks.onSound('ui');
        }
        this.draggingDecor = null;
        this.hoverSocket = null;
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

      // 0. Clicking any nesting egg on the seabed gently warms it (+26% progress) or hatches it when ready!
      for (const sw of this.swimmers) {
        if (sw.data.stage === 'egg' && Math.hypot(sw.x - x, sw.y - y) < 34) {
          const res = warmEggInTank(this.save, sw.data.id);
          if (res.hatched && res.egg) {
            this.spawnPops(sw.x, sw.y - 8, 22, 0x9ef5d0);
            this.hooks.onToast(`🎉 A young ${SPECIES[res.egg.species].name.toLowerCase()} hatched right in the Sanctuary!`);
            this.hooks.onSound('pickup');
          } else {
            this.spawnPops(sw.x, sw.y - 6, 9, 0xffe28a);
            this.hooks.onSound('bubble');
          }
          this.hooks.onSave();
          this.syncTankContents(true);
          this.refreshHud();
          return;
        }
      }

      // 0b. In Pair & Breed mode: click two grown creatures of the same species to trigger a courtship dance & lay an egg!
      if (this.tool === 'breed') {
        for (const sw of this.swimmers) {
          if (sw.data.stage !== 'egg' && Math.hypot(sw.x - x, sw.y - y) < 38) {
            if (sw.data.stage !== 'grown') {
              this.hooks.onToast(`${creatureName(sw.data)} is still young — only grown creatures can pair!`);
              return;
            }
            if (this.breedFirstId === null || this.breedFirstId === sw.data.id) {
              this.breedFirstId = sw.data.id;
              this.spawnPops(sw.x, sw.y - 10, 8, 0xffb2c6);
              this.hooks.onSound('ui');
              this.syncToolbar();
              return;
            }
            const firstSw = this.swimmers.find((q) => q.data.id === this.breedFirstId);
            const res = breedPairInTank(this.save, this.activeTankId, this.breedFirstId, sw.data.id);
            this.breedFirstId = null;
            this.syncToolbar();
            if (!res.ok) {
              this.hooks.onToast(res.why);
              return;
            }
            const cx = firstSw ? (firstSw.x + sw.x) / 2 : sw.x;
            const cy = Math.min(this.cssH * 0.62, firstSw ? (firstSw.y + sw.y) / 2 : sw.y);
            this.courtship = { idA: firstSw?.data.id ?? sw.data.id, idB: sw.data.id, cx, cy, t: 0, dur: 2.3 };
            this.spawnPops(cx, cy, 16, 0xffb8c6);
            this.hooks.onToast(`💞 Courtship dance! A ${SPECIES[res.egg.species].eggName} has been laid — click it to warm & hatch!`);
            this.hooks.onSound('pickup');
            this.hooks.onSave();
            this.syncTankContents(true);
            this.refreshHud();
            return;
          }
        }
        this.breedFirstId = null;
        this.syncToolbar();
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

      if (this.tool === 'toy') {
        this.rings.push({ x, y, r: 18, vy: -32, life: 4.8, max: 4.8 });
        this.spawnPops(x, y, 6, 0xb8f8f0);
        this.hooks.onSound('bubble');
        return;
      }
      if (this.tool === 'scrub') {
        return;
      }

      // 1b. Interactive Living Decor toys in Play mode (chest bubble burst, bell chime, lantern glow)!
      for (const d of this.placedDecor) {
        if (Math.hypot(d.view.x - x, (d.view.y - 26) - y) < 42) {
          if (d.id === 'bell') {
            this.ringChime(d.view.x, d.view.y - 24);
            return;
          }
          if (d.id === 'chest' || d.id === 'amphora') {
            this.rings.push({ x: d.view.x, y: d.view.y - 36, r: 16, vy: -40, life: 4.2, max: 4.2 });
            this.spawnPops(d.view.x, d.view.y - 30, 14, 0xffe488);
            this.hooks.onSound('bubble');
            return;
          }
          if (d.id === 'kelplantern' || d.id === 'lantern') {
            this.spawnPops(d.view.x, d.view.y - 34, 14, 0xffd878);
            this.hooks.onSound('ui');
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

      // 3. Otherwise: drop a shower of the selected specialty treat right where you clicked!
      this.selectedFishId = null;
      this.inspectorEl.hidden = true;
      feedTank(this.save, this.activeTankId);
      const sinkVy = this.treat === 'mineral' ? 54 : this.treat === 'growth' ? 36 : this.treat === 'shimmer' ? 14 : 24;
      const popCol = this.treat === 'growth' ? 0x7cf09e : this.treat === 'shimmer' ? 0xfff2b8 : this.treat === 'mineral' ? 0xe89c4c : 0xffe290;
      for (let k = 0; k < 7; k++) {
        this.foods.push({
          x: x + (Math.random() - 0.5) * 32,
          y: y + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 28,
          vy: sinkVy + Math.random() * 18,
          life: 15,
          size: this.treat === 'mineral' ? 3.2 : 2.6 + Math.random() * 1.6,
          wob: Math.random() * 10,
          kind: this.treat,
        });
      }
      this.spawnPops(x, y, 6, popCol);
      this.hooks.onSound('feed');
      this.hooks.onSave();
      this.refreshHud();
    });

    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      } else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        this.toggleZen();
      }
    });
  }
}
