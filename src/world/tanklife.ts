import { Container, Graphics } from 'pixi.js';
import { Critter } from '../actors/critters';
import { BaseLayout, pieceRect, Placed } from '../game/base';
import { contentment, creaturesIn, filteredTanks, KNOWS_KESTREL, tankDataFor, tanks, vigour } from '../game/creatures';
import { drawDecor } from './tankDecor';
import { traitsOf } from '../game/traits';
import { CreatureData, PlantId, SaveData } from '../game/state';
import { tankInner } from './basegfx';
import { HabitatWater, type WaterBox } from './habitatWater';

/**
 * Life inside the creature tanks (milestone 4): the creatures swimming, the
 * plant, kelp flakes sinking after a feed, murk when the water gets dirty,
 * bubbles from a scrub and the front glass. Drawn in the lit layer just in
 * front of the tank, behind the diver.
 */

interface Swimmer {
  data: CreatureData;
  critter: Critter;
  stage: CreatureData['stage'];
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  retarget: number;
  rest: number;
  feeding: number;
  /** Phase 21: 0..1 how content (playful when high, sluggish when low), refreshed now and then. */
  mood: number;
  /** Phase 21: a hand-fed treat it is going for. */
  treat?: Flake;
  /** Phase 21, living tanks: rising to break the surface, seconds until it may again, and the wake's timer. */
  rising: boolean;
  surfaceIn: number;
  wakeIn: number;
}

interface Flake {
  x: number;
  y: number;
  vy: number;
  life: number;
  /** Phase 21: a hand-fed treat, for this creature only (bigger, and drawn as a pellet). */
  for?: number;
}

interface TankView {
  id: number;
  root: Container;
  plantG: Container;
  plant: string | null;
  murk: Graphics;
  glass: Graphics;
  flakesG: Graphics;
  bubblesG: Graphics;
  flakes: Flake[];
  bubbles: { x: number; y: number; r: number; life: number }[];
  /** Inner water rectangle in world units. */
  box: WaterBox;
  swimmers: Map<number, Swimmer>;
  murkShown: number;
  water?: HabitatWater;
  filtered: boolean;
  /** Phase 20: decorations on the sand (and the lantern's glow), keyed by what is placed. */
  decorG: Container;
  decorKey: string;
  decorGlow: Container;
  /** Where the sea chest sits (it lets out a bubble now and then). */
  chestX: number | null;
}

export function drawPlant(kind: PlantId): Container {
  const c = new Container();
  const g = c.addChild(new Graphics());
  if (kind === 'coral') {
    const br = (x: number, y: number, a: number, len: number, w: number, d: number): void => {
      const x2 = x + Math.cos(a) * len;
      const y2 = y + Math.sin(a) * len;
      g.moveTo(x, y).lineTo(x2, y2).stroke({ color: 0xc86a6a, width: w, cap: 'round' });
      if (d > 0) {
        br(x2, y2, a - 0.45, len * 0.75, w * 0.75, d - 1);
        br(x2, y2, a + 0.4, len * 0.7, w * 0.75, d - 1);
      } else g.circle(x2, y2, w * 0.7).fill({ color: 0xf0b0a0 });
    };
    br(0, 0, -Math.PI / 2, 14, 5, 3);
  } else if (kind === 'grass') {
    for (let i = 0; i < 9; i++) {
      const x = -12 + i * 3;
      const h = 22 + (i % 3) * 8;
      g.moveTo(x, 0).quadraticCurveTo(x + 3, -h * 0.5, x + (i % 2 ? 5 : -3), -h).stroke({ color: i % 2 ? 0x6f9a4a : 0x5a8a40, width: 2 });
    }
  } else if (kind === 'bladder') {
    // Bladder kelp (milestone 7): short brown fronds with round floats.
    for (let i = 0; i < 5; i++) {
      const lean = (i - 2) * 4;
      const h = 22 + (i % 2) * 10;
      g.moveTo(i * 3 - 6, 0).quadraticCurveTo(lean * 0.4, -h * 0.6, lean, -h).stroke({ color: i % 2 ? 0x7a6a30 : 0x8c7a38, width: 2.4, cap: 'round' });
      for (const t of [0.5, 0.8, 1]) g.circle(lean * t * t, -h * t, 2.6).fill({ color: 0xa8923e });
    }
  } else if (kind === 'lumen') {
    // Lumen moss (milestone 7): a glowing cushion on a stone.
    g.ellipse(0, -3, 14, 6).fill({ color: 0x55605c });
    for (let i = 0; i < 10; i++) g.circle(-11 + i * 2.4, -7 - (i % 3) * 1.5, 3).fill({ color: i % 2 ? 0x8aa84a : 0xa8c860 });
    for (let i = 0; i < 7; i++) g.circle(-9 + i * 3, -9 - (i % 2) * 2, 0.9).fill({ color: 0xf0f8b0 });
  } else {
    for (let k = 0; k < 2; k++) {
      const pts: number[] = [];
      for (let i = 0; i <= 8; i++) pts.push(k * 7 - 3 + Math.sin(i * 0.9 + k) * 3, -i * 8);
      for (let i = 8; i >= 0; i--) pts.push(k * 7 + 3 + Math.sin(i * 0.9 + k) * 3, -i * 8);
      g.poly(pts).fill({ color: k ? 0x8a7a30 : 0x9a8a3a, alpha: 0.95 });
      for (let i = 1; i < 8; i += 2) g.ellipse(k * 7 + Math.sin(i * 0.9 + k) * 3, -i * 8, 2.2, 2.6).fill({ color: 0xb8a84a });
    }
  }
  return c;
}

/**
 * Where a tank's water is, and how big its life is drawn. Outside, the box
 * comes from the piece's art (tankInner); inside the walkable base (Colin,
 * after the interior art pass: "the same creature fidelity inside as
 * outside"), the tank room passes its own, much bigger, window.
 */
export interface TankLifeOptions {
  boxOf?: (t: Placed) => { x: number; y: number; w: number; h: number } | null;
  /** Scale for creatures, plants, flakes and speeds (1 outside). */
  scale?: number;
  /** Plant several clumps of each planted plant along a wide tank's sand. */
  clumps?: boolean;
  /** Draw the faint front glass (indoors the room draws its own). */
  glass?: boolean;
  livingCreatures?: boolean;
  livingBases?: boolean;
}

/**
 * How big creatures are drawn in the tanks. Colin (after Session B): much smaller than
 * before (0.85, now about 59% of that), so the occasional giant really looks big and the
 * tanks, which now hold three times as many, don't look crowded.
 */
export const TANK_SIZE = 0.5;

export class TankLife {
  readonly view = new Container();
  readonly emissive = new Container();
  readonly glow = new Container();
  private views = new Map<number, TankView>();
  /** A creature to mark with a ring (the one picked in the care panel). */
  highlight: number | null = null;
  /** Phase 21: where Kestrel is, so creatures that know him swim to the glass. Null: nobody near. */
  kestrel: { x: number; y: number } | null = null;
  private moodClock = 0;
  private ring = new Graphics();
  private readonly k: number;

  constructor(private readonly opts: TankLifeOptions = {}) {
    this.k = opts.scale ?? 1;
    this.emissive.addChild(this.ring);
  }

  destroy(): void {
    for (const v of this.views.values()) for (const s of v.swimmers.values()) s.critter.destroy();
    this.views.clear();
    this.view.destroy({ children: true });
    this.emissive.destroy({ children: true });
    this.glow.destroy({ children: true });
  }

  sync(save: SaveData, layout: BaseLayout): void {
    const live = tanks(layout);
    const filtered = this.opts.livingBases ? filteredTanks(layout) : undefined;
    const ids = new Set(live.map((t) => t.id));
    for (const [id, v] of this.views) {
      if (ids.has(id)) continue;
      for (const s of v.swimmers.values()) s.critter.destroy();
      v.root.destroy({ children: true });
      this.views.delete(id);
    }
    for (const t of live) {
      let v = this.views.get(t.id);
      if (!v) {
        const r = pieceRect(t);
        const I = tankInner(t.kind);
        const box = this.opts.boxOf ? this.opts.boxOf(t) : { x: r.x + I.x, y: r.y + I.y, w: I.w, h: I.h };
        if (!box) continue;
        const root = new Container();
        const plantG = new Container();
        const flakesG = new Graphics();
        const murk = new Graphics();
        const glass = new Graphics();
        const bubblesG = new Graphics();
        const water = this.opts.livingBases ? new HabitatWater(box, t.id) : undefined;
        // Front glass: faint tint and two diagonal glints.
        if (this.opts.glass !== false) glass.rect(box.x, box.y, box.w, box.h).fill({ color: 0x9ccac0, alpha: 0.08 });
        if (water) {
          const x = box.x + box.w * 0.24;
          glass.moveTo(x, box.y + 4).lineTo(x + 30, box.y + 4)
            .quadraticCurveTo(x + 10, box.y + box.h * 0.41, x + 8, box.y + box.h * 0.63)
            .lineTo(x - 10, box.y + box.h * 0.58).quadraticCurveTo(x - 5, box.y + box.h * 0.24, x, box.y + 4)
            .fill({ color: 0xe3edde, alpha: 0.09 });
        } else {
          for (const gx of [0.12, 0.2, 0.66]) {
            const x = box.x + box.w * gx;
            glass.poly([x, box.y, x + 10, box.y, x - 14, box.y + box.h, x - 24, box.y + box.h]).fill({ color: 0xffffff, alpha: gx === 0.2 ? 0.05 : 0.09 });
          }
          glass.rect(box.x, box.y, box.w, 2).fill({ color: 0xffffff, alpha: 0.25 });
        }
        const decorG = new Container();
        const decorGlow = new Container();
        this.glow.addChild(decorGlow);
        root.addChild(decorG, plantG, flakesG, murk, bubblesG);
        if (water) {
          root.addChildAt(water.back, 0);
          root.addChild(water.front);
        }
        this.view.addChild(root);
        v = { id: t.id, root, plantG, plant: null, murk, glass, flakesG, bubblesG, flakes: [], bubbles: [], box, swimmers: new Map(), murkShown: -1, water, filtered: false, decorG, decorKey: '', decorGlow, chestX: null };
        this.views.set(t.id, v);
      }
      v.filtered = filtered?.has(t.id) ?? false;
      const td = tankDataFor(save, t.id);
      const plantKey = `${td.plant ?? ''}|${td.plant2 ?? ''}`;
      if (plantKey !== v.plant) {
        v.plant = plantKey;
        v.plantG.removeChildren().forEach((c) => c.destroy({ children: true }));
        const grand = t.kind === 'gtank';
        const kinds = [td.plant ?? null, grand ? (td.plant2 ?? null) : null];
        // Outside: one clump per planter. Inside the tank window is wide, so the
        // planted kinds grow as several clumps along the sand.
        const n = this.opts.clumps ? Math.max(2, Math.round(v.box.w / (150 * this.k))) : 2;
        for (let i = 0; i < n; i++) {
          const kind = this.opts.clumps ? (kinds[1] && i % 2 ? kinds[1] : (kinds[0] ?? kinds[1])) : kinds[i];
          if (!kind) continue;
          const p = drawPlant(kind);
          const u = this.opts.clumps ? (i + 0.5) / n + (((i * 37) % 7) - 3) * 0.012 : i === 0 ? 0.22 : 0.7;
          p.position.set(v.box.x + v.box.w * u, v.box.y + v.box.h - 6 * this.k);
          const sc = (grand ? 1.5 : 1) * this.k * (this.opts.clumps ? 0.8 + ((i * 53) % 5) * 0.08 : 1);
          p.scale.set(i % 2 && this.opts.clumps ? -sc : sc, sc);
          v.plantG.addChild(p);
        }
      }
      // Phase 20: decorations stand on the sand, spread out between the plants.
      const decorKey = (td.decor ?? []).join(',');
      if (decorKey !== v.decorKey) {
        v.decorKey = decorKey;
        v.decorG.removeChildren().forEach((c) => c.destroy({ children: true }));
        v.decorGlow.removeChildren().forEach((c) => c.destroy());
        v.chestX = null;
        const list = td.decor ?? [];
        const sc = Math.min(1.6, Math.max(0.55, v.box.h / 150)) * (this.opts.scale && this.opts.scale > 1 ? 1 : 1);
        list.forEach((d, i) => {
          const { view, glow } = drawDecor(d);
          const u = (i + 0.5) / list.length * 0.8 + 0.1 + (i % 2 ? 0.04 : -0.04);
          const x = v.box.x + v.box.w * u;
          const y = v.box.y + v.box.h - 3 * this.k;
          view.position.set(x, y);
          view.scale.set((i % 2 ? -1 : 1) * sc, sc);
          v.decorG.addChild(view);
          if (glow) {
            glow.position.set(x, y);
            glow.scale.set(sc);
            v.decorGlow.addChild(glow);
          }
          if (d === 'chest') v.chestX = x;
        });
      }
      // Creatures.
      const here = creaturesIn(save, t.id);
      const keep = new Set(here.map((c) => c.id));
      for (const [id, s] of v.swimmers)
        if (!keep.has(id)) {
          s.critter.destroy();
          v.swimmers.delete(id);
        }
      for (const c of here) {
        const old = v.swimmers.get(c.id);
        if (old && old.stage === c.stage) {
          old.data = c;
          continue;
        }
        // New, or it hatched or grew: redraw it.
        if (old) old.critter.destroy();
        const critter = new Critter(c.species, c.stage, c.id, traitsOf(c), this.opts.livingCreatures);
        v.root.addChildAt(critter.view, v.root.getChildIndex(v.murk));
        this.emissive.addChild(critter.emissive);
        this.glow.addChild(critter.glow);
        const eggX = v.box.x + v.box.w * (0.45 + ((c.id * 0.17) % 0.3));
        const s: Swimmer = {
          data: c,
          critter,
          stage: c.stage,
          x: old?.x ?? (c.stage === 'egg' ? eggX : v.box.x + v.box.w / 2),
          y: old?.y ?? (c.stage === 'egg' ? v.box.y + v.box.h - 10 * this.k : v.box.y + v.box.h / 2),
          vx: 0,
          vy: 0,
          tx: 0,
          ty: 0,
          retarget: 0,
          rest: 0,
          feeding: 0,
          mood: contentment(save, c).value,
          rising: false,
          surfaceIn: 4 + ((c.id * 7) % 9),
          wakeIn: 0,
        };
        if (c.stage === 'egg') {
          s.x = eggX;
          s.y = v.box.y + v.box.h - 8 * this.k;
        }
        v.swimmers.set(c.id, s);
      }
      // Glass goes on top of everything in the tank.
      v.root.addChild(v.glass);
    }
  }

  /** Kelp flakes sink into the tank. */
  feed(tankId: number): void {
    const v = this.views.get(tankId);
    if (!v) return;
    if (v.water) {
      const { x, y, w } = v.box;
      const inlet = x + w * 0.61;
      v.water.ripple(inlet, y + 5, -10, 26, 0.8);
      for (let i = 0; i < 18; i++) {
        const spread = ((i * 0.61803398875) % 1 - 0.5) * w * 0.56;
        v.flakes.push({ x: inlet + spread, y: y + 5 + (i % 7) * 1.3, vy: (9 + i % 6 * 2) * this.k, life: 5 + i % 4 });
      }
      if (v.flakes.length > 54) v.flakes.splice(0, v.flakes.length - 54);
      return;
    }
    for (let i = 0; i < Math.round(26 * Math.min(3, Math.max(1, v.box.w / 200))); i++)
      v.flakes.push({ x: v.box.x + 20 * this.k + Math.random() * (v.box.w - 40 * this.k), y: v.box.y + 2 - Math.random() * 10 * this.k, vy: (8 + Math.random() * 10) * this.k, life: 7 + Math.random() * 3 });
  }

  /**
   * Phase 21: a treat from Kestrel's hand at the glass: one pellet drops in near the
   * creature, which darts up to take it, with a ripple at the surface and a few bubbles.
   */
  handFeed(tankId: number, creatureId: number): void {
    const v = this.views.get(tankId);
    const s = v?.swimmers.get(creatureId);
    if (!v || !s) return;
    const x = Math.max(v.box.x + 12 * this.k, Math.min(v.box.x + v.box.w - 12 * this.k, s.x));
    const f: Flake = { x, y: v.box.y + 6 * this.k, vy: 14 * this.k, life: 8, for: creatureId };
    v.flakes.push(f);
    s.treat = f;
    v.water?.ripple(x, v.box.y + 4, 0, 18, 0.9);
    for (let i = 0; i < 6; i++) v.bubbles.push({ x: x + (i - 3) * 3 * this.k, y: v.box.y + 14 * this.k + i * 2, r: (1 + (i % 3)) * this.k, life: 0.6 + i * 0.1 });
  }

  /** Bubbles and a sparkle after cleaning the tank. */
  scrub(tankId: number): void {
    const v = this.views.get(tankId);
    if (!v) return;
    v.water?.scrub();
    for (let i = 0; i < Math.round(40 * Math.min(3, Math.max(1, v.box.w / 200))); i++)
      v.bubbles.push({ x: v.box.x + Math.random() * v.box.w, y: v.box.y + v.box.h - Math.random() * v.box.h * 0.6, r: (1 + Math.random() * 2.5) * this.k, life: 1 + Math.random() * 1.5 });
    if (v.water && v.bubbles.length > 120) v.bubbles.splice(0, v.bubbles.length - 120);
  }

  /** World position of a creature in a tank, for the care panel. */
  positionOf(creatureId: number): { x: number; y: number } | null {
    for (const v of this.views.values()) {
      const s = v.swimmers.get(creatureId);
      if (s) return { x: s.x, y: s.y };
    }
    return null;
  }

  update(dt: number, time: number, save: SaveData, viewX0: number, viewX1: number): void {
    this.ring.clear();
    // Phase 21: moods change slowly, so they are refreshed a couple of times a second, not every frame.
    this.moodClock -= dt;
    const moods = this.moodClock <= 0;
    if (moods) this.moodClock = 0.5;
    for (const v of this.views.values()) {
      const on = v.box.x + v.box.w > viewX0 - 100 && v.box.x < viewX1 + 100;
      v.root.visible = on;
      v.decorGlow.visible = on;
      if (moods) for (const s of v.swimmers.values()) s.mood = contentment(save, s.data).value;
      // The sea chest lets a bubble slip out now and then.
      if (on && v.chestX !== null && Math.random() < dt * 0.8)
        v.bubbles.push({ x: v.chestX + (Math.random() - 0.5) * 10 * this.k, y: v.box.y + v.box.h - 20 * this.k, r: (1 + Math.random() * 1.6) * this.k, life: 2.5 });
      if (on) v.plantG.children.forEach((p, i) => (p.skew.x = Math.sin(time * 0.7 + i * 1.9 + v.id) * 0.07));
      const water = tankDataFor(save, v.id).water;
      v.water?.update(dt, time, water, v.filtered, on);
      if (!v.water && Math.abs(water - v.murkShown) > 0.005) {
        v.murkShown = water;
        v.murk.clear();
        const m = 1 - water;
        if (m > 0.03) {
          v.murk.rect(v.box.x, v.box.y, v.box.w, v.box.h).fill({ color: 0x5a6a3a, alpha: m * 0.55 });
          for (let i = 0; i < 30 * m * Math.max(1, v.box.w / 200); i++) {
            const x = v.box.x + ((i * 53.7) % v.box.w);
            const y = v.box.y + ((i * 31.3) % v.box.h);
            v.murk.circle(x, y, (1 + (i % 3) * 0.6) * this.k).fill({ color: 0x8a8a5a, alpha: 0.5 * m });
          }
          // Algae film creeping up the glass.
          v.murk.rect(v.box.x, v.box.y + v.box.h * (1 - m * 0.6), v.box.w, v.box.h * m * 0.6).fill({ color: 0x4a6a2a, alpha: m * 0.3 });
        }
      }
      // Flakes sink and are eaten.
      const fg = v.flakesG;
      fg.clear();
      for (let i = v.flakes.length - 1; i >= 0; i--) {
        const f = v.flakes[i];
        f.life -= dt;
        f.y = Math.min(v.box.y + v.box.h - 8 * this.k, f.y + f.vy * dt);
        const flow = v.water?.flow(f.x, f.y, time, v.filtered) ?? 0;
        f.x += (Math.sin(time * 2 + i) * 6 * this.k + flow * 7) * dt;
        if (v.water) f.x = Math.max(v.box.x + 3, Math.min(v.box.x + v.box.w - 3, f.x));
        let eaten = f.life <= 0;
        for (const s of v.swimmers.values()) {
          if (s.stage === 'egg' || (f.for !== undefined && f.for !== s.data.id) || Math.hypot(s.x - f.x, s.y - f.y) >= (f.for !== undefined ? 12 : 7) * this.k) continue;
          eaten = true;
          if (v.water && f.life > 0) {
            s.feeding = 1;
            v.water.ripple(f.x, f.y, s.vx * 0.4, s.vy * 0.4, 0.34);
          }
        }
        if (eaten) {
          v.flakes.splice(i, 1);
          continue;
        }
        if (on && f.for !== undefined) fg.circle(f.x, f.y, 2.6 * this.k).fill({ color: 0xd9894a, alpha: Math.min(1, f.life) }).circle(f.x - 0.8 * this.k, f.y - 0.8 * this.k, 0.9 * this.k).fill({ color: 0xffe2b0, alpha: Math.min(1, f.life) });
        else if (on && v.water) fg.ellipse(f.x, f.y, 2 * this.k, 0.8 * this.k).fill({ color: 0xe3bc64, alpha: Math.min(1, f.life) });
        else if (on) fg.rect(f.x - 1.4 * this.k, f.y - 0.8 * this.k, 2.8 * this.k, 1.6 * this.k).fill({ color: 0xc9a24a, alpha: Math.min(1, f.life) });
      }
      const bg = v.bubblesG;
      bg.clear();
      for (let i = v.bubbles.length - 1; i >= 0; i--) {
        const b = v.bubbles[i];
        b.life -= dt;
        b.y -= (20 * this.k + b.r * 10) * dt;
        if (b.life <= 0 || b.y < v.box.y + 2) {
          v.bubbles.splice(i, 1);
          continue;
        }
        if (on) bg.circle(b.x + Math.sin(time * 5 + i) * 1.5 * this.k, b.y, b.r).stroke({ color: 0xe8f6f0, width: 0.8 * this.k, alpha: Math.min(1, b.life) * 0.8 });
      }
      for (const s of v.swimmers.values()) this.move(s, v, dt, time, save, on);
      if (on && this.highlight !== null && v.swimmers.has(this.highlight)) {
        const s = v.swimmers.get(this.highlight)!;
        const n = 12;
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2 + time;
          this.ring.arc(s.critter.view.x, s.critter.view.y - 3 * this.k, 22 * this.k, a0, a0 + Math.PI / n).stroke({ color: 0xfff1c0, width: 1.4 * this.k, alpha: 0.8 });
        }
      }
    }
  }

  private move(s: Swimmer, v: TankView, dt: number, time: number, save: SaveData, on: boolean): void {
    const c = s.data;
    const b = v.box;
    const vig = vigour(save, c);
    const sick = Math.min(1, c.sickness * 3);
    s.feeding = Math.max(0, s.feeding - dt * 1.8);
    if (c.stage !== 'egg') {
      const pad = (c.stage === 'grown' ? 22 : 16) * this.k;
      const sp = c.species;
      // Swim towards a sinking flake if there is one.
      let flake: Flake | null = s.treat && v.flakes.includes(s.treat) ? s.treat : null;
      if (!flake) s.treat = undefined;
      let fd = 90 * this.k;
      if (!flake)
        for (const f of v.flakes) {
          if (f.for !== undefined && f.for !== c.id) continue;
          const d = Math.hypot(f.x - s.x, f.y - s.y);
          if (d < fd) {
            fd = d;
            flake = f;
          }
        }
      s.retarget -= dt;
      s.surfaceIn -= dt;
      // Phase 21, living tanks: swimmers that live high in the water now and then rise to break the surface.
      const surfacer = v.water && (sp === 'glowfin' || sp === 'puffcap' || sp === 'shrimp');
      if (surfacer && !s.rising && s.surfaceIn <= 0 && s.mood > 0.45 && Math.random() < dt * 0.25) {
        s.rising = true;
        s.tx = Math.max(b.x + pad, Math.min(b.x + b.w - pad, s.x + (Math.random() - 0.5) * 60 * this.k));
        s.ty = b.y + 2 * this.k;
        s.retarget = 6;
      }
      // Phase 21: a creature that knows Kestrel swims to the glass on his side when he is near.
      const kp = this.kestrel;
      const greet = !flake && (c.bond ?? 0) >= KNOWS_KESTREL && !!kp && kp.x > b.x - 260 * this.k && kp.x < b.x + b.w + 260 * this.k && Math.abs(kp.y - (b.y + b.h / 2)) < b.h + 200 * this.k;
      if (flake) {
        s.tx = flake.x;
        s.ty = flake.y;
      } else if (greet && kp) {
        s.tx = Math.max(b.x + pad, Math.min(b.x + b.w - pad, kp.x + Math.sin(time * 1.3 + c.id) * 18 * this.k));
        s.ty = Math.max(b.y + pad, Math.min(b.y + b.h - pad, kp.y + Math.cos(time * 1.1 + c.id) * 12 * this.k));
        s.retarget = 0.5;
      } else if (s.rising) {
        // Keep heading up until it breaks the surface.
      } else if (s.retarget <= 0 || Math.hypot(s.tx - s.x, s.ty - s.y) < 8 * this.k) {
        s.tx = b.x + pad + Math.random() * (b.w - pad * 2);
        // Puffcaps drift high, rays keep low, glowfins swim the middle;
        // crabs walk the floor and shrimp keep low-to-middle (milestone 7).
        // Phase 22: kiln eels keep low among the gravel; chime seahorses hang in the middle, by the grass.
        const lo = sp === 'crab' || sp === 'snail' ? 0.9 : sp === 'ray' ? 0.7 : sp === 'eel' ? 0.7 : sp === 'horse' ? 0.4 : sp === 'puffcap' ? 0.2 : sp === 'shrimp' ? 0.45 : 0.3;
        const hi = sp === 'crab' || sp === 'snail' ? 0.9 : sp === 'ray' ? 0.85 : sp === 'eel' ? 0.9 : sp === 'horse' ? 0.7 : sp === 'puffcap' ? 0.55 : sp === 'shrimp' ? 0.8 : 0.75;
        s.ty = b.y + b.h * (lo + Math.random() * (hi - lo));
        s.retarget = 2 + Math.random() * 4;
        if (sp === 'ray' && Math.random() < 0.3) s.rest = 2 + Math.random() * 3;
      }
      let speed = (sp === 'puffcap' ? 12 : sp === 'crab' ? 16 : sp === 'snail' ? 7 : sp === 'horse' ? 9 : sp === 'eel' ? 24 : 30) * this.k * (0.5 + vig * 0.5) * (1 - sick * 0.6);
      let ax = s.tx - s.x;
      let ay = s.ty - s.y;
      if (s.rest > 0 && !flake) {
        s.rest -= dt;
        ax = 0;
        ay = b.y + b.h - 12 * this.k - s.y;
        speed = 8 * this.k;
      }
      if (flake) speed *= s.treat ? 2.2 : 1.6;
      // Phase 21: content creatures are playful (quicker, little loops); unhappy ones sluggish.
      speed *= 0.65 + 0.6 * s.mood;
      if (s.mood >= 0.85 && !flake && s.rest <= 0) {
        ax += Math.cos(time * 2.4 + c.id) * 26 * this.k;
        ay += Math.sin(time * 2.4 + c.id) * 18 * this.k;
      }
      const l = Math.hypot(ax, ay) || 1;
      const k = 1 - Math.exp(-2 * dt);
      s.vx += ((ax / l) * speed - s.vx) * k;
      s.vy += ((ay / l) * speed * 0.7 - s.vy) * k;
      // Sick ones sink towards the floor.
      s.vy += sick * 6 * this.k * dt;
      s.x = Math.max(b.x + pad, Math.min(b.x + b.w - pad, s.x + s.vx * dt));
      const top = s.rising ? b.y + 4 * this.k : b.y + pad * 0.8;
      s.y = Math.max(top, Math.min(b.y + b.h - 10 * this.k, s.y + s.vy * dt));
      if (s.rising && (s.y <= b.y + 7 * this.k || flake)) {
        // It breaks the surface: ripples run along the water line, droplets and bubbles. Then it dives again.
        if (!flake && on) {
          v.water?.surfaceBreak(s.x, Math.min(1.3, 0.6 + Math.hypot(s.vx, s.vy) / (40 * this.k)));
          for (let i = 0; i < 5; i++) v.bubbles.push({ x: s.x + (i - 2) * 3 * this.k, y: b.y + 12 * this.k + i * 3 * this.k, r: (0.8 + (i % 3) * 0.6) * this.k, life: 0.5 + i * 0.08 });
        }
        s.rising = false;
        s.surfaceIn = 10 + Math.random() * 14;
        s.retarget = 0;
        s.vy = Math.abs(s.vy) * 0.6;
      }
      // Its wake: motes stirred up behind it while it swims briskly (only where the tank is on screen).
      s.wakeIn -= dt;
      const speedNow = Math.hypot(s.vx, s.vy);
      if (on && v.water && s.wakeIn <= 0 && speedNow > 12 * this.k) {
        const l2 = speedNow || 1;
        v.water.wake(s.x - (s.vx / l2) * 10 * this.k, s.y - (s.vy / l2) * 4 * this.k, s.vx, s.vy);
        s.wakeIn = 0.12 + 1 / (1 + speedNow / (10 * this.k)) * 0.15;
      }
    }
    s.critter.setVisible(on);
    if (!on) return;
    const fitPuffcap = this.opts.livingCreatures && c.species === 'puffcap' && c.stage !== 'egg';
    const maxHeight = c.stage === 'grown' ? 137 : 62;
    const size = fitPuffcap ? Math.min(TANK_SIZE * this.k, (b.h - 14) / maxHeight) : TANK_SIZE * this.k;
    const current = v.water?.flow(s.x, s.y, time, v.filtered) ?? 0;
    s.critter.update(dt, time, s.x, s.y, s.vx, s.vy, { vigour: vig, sick, size, current, feeding: s.feeding });
    if (fitPuffcap) s.critter.fitInHabitat(b, 5);
    const stroke = s.critter.stroke;
    if (v.water && stroke.strength) v.water.ripple(stroke.x, stroke.y, stroke.vx * 0.25, stroke.vy * 0.25, stroke.strength);
  }
}
