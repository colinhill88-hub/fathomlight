import { Container, Graphics } from 'pixi.js';
import { Critter } from '../actors/critters';
import { BaseLayout, pieceRect } from '../game/base';
import { creaturesIn, tankDataFor, tanks, vigour } from '../game/creatures';
import { CreatureData, PlantId, SaveData } from '../game/state';
import { tankInner } from './basegfx';

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
}

interface Flake {
  x: number;
  y: number;
  vy: number;
  life: number;
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
  box: { x: number; y: number; w: number; h: number };
  swimmers: Map<number, Swimmer>;
  murkShown: number;
}

function drawPlant(kind: PlantId): Container {
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

export class TankLife {
  readonly view = new Container();
  readonly emissive = new Container();
  readonly glow = new Container();
  private views = new Map<number, TankView>();
  /** A creature to mark with a ring (the one picked in the care panel). */
  highlight: number | null = null;
  private ring = new Graphics();

  constructor() {
    this.emissive.addChild(this.ring);
  }

  sync(save: SaveData, layout: BaseLayout): void {
    const live = tanks(layout);
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
        const root = new Container();
        const plantG = new Container();
        const flakesG = new Graphics();
        const murk = new Graphics();
        const glass = new Graphics();
        const bubblesG = new Graphics();
        const I = tankInner(t.kind);
        const box = { x: r.x + I.x, y: r.y + I.y, w: I.w, h: I.h };
        // Front glass: faint tint and two diagonal glints.
        glass.rect(box.x, box.y, box.w, box.h).fill({ color: 0x9ccac0, alpha: 0.08 });
        for (const gx of [0.12, 0.2, 0.66]) {
          const x = box.x + box.w * gx;
          glass.poly([x, box.y, x + 10, box.y, x - 14, box.y + box.h, x - 24, box.y + box.h]).fill({ color: 0xffffff, alpha: gx === 0.2 ? 0.05 : 0.09 });
        }
        glass.rect(box.x, box.y, box.w, 2).fill({ color: 0xffffff, alpha: 0.25 });
        root.addChild(plantG, flakesG, murk, bubblesG);
        this.view.addChild(root);
        v = { id: t.id, root, plantG, plant: null, murk, glass, flakesG, bubblesG, flakes: [], bubbles: [], box, swimmers: new Map(), murkShown: -1 };
        this.views.set(t.id, v);
      }
      const td = tankDataFor(save, t.id);
      const plantKey = `${td.plant ?? ''}|${td.plant2 ?? ''}`;
      if (plantKey !== v.plant) {
        v.plant = plantKey;
        v.plantG.removeChildren().forEach((c) => c.destroy({ children: true }));
        if (td.plant) {
          const p = drawPlant(td.plant);
          p.position.set(v.box.x + v.box.w * 0.22, v.box.y + v.box.h - 6);
          if (t.kind === 'gtank') p.scale.set(1.5);
          v.plantG.addChild(p);
        }
        if (td.plant2 && t.kind === 'gtank') {
          const p = drawPlant(td.plant2);
          p.position.set(v.box.x + v.box.w * 0.7, v.box.y + v.box.h - 6);
          p.scale.set(1.5);
          v.plantG.addChild(p);
        }
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
        const critter = new Critter(c.species, c.stage, c.id);
        v.root.addChildAt(critter.view, 2);
        this.emissive.addChild(critter.emissive);
        this.glow.addChild(critter.glow);
        const eggX = v.box.x + v.box.w * (0.45 + ((c.id * 0.17) % 0.3));
        const s: Swimmer = {
          data: c,
          critter,
          stage: c.stage,
          x: old?.x ?? (c.stage === 'egg' ? eggX : v.box.x + v.box.w / 2),
          y: old?.y ?? (c.stage === 'egg' ? v.box.y + v.box.h - 10 : v.box.y + v.box.h / 2),
          vx: 0,
          vy: 0,
          tx: 0,
          ty: 0,
          retarget: 0,
          rest: 0,
        };
        if (c.stage === 'egg') {
          s.x = eggX;
          s.y = v.box.y + v.box.h - 8;
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
    for (let i = 0; i < 26; i++)
      v.flakes.push({ x: v.box.x + 20 + Math.random() * (v.box.w - 40), y: v.box.y + 2 - Math.random() * 10, vy: 8 + Math.random() * 10, life: 7 + Math.random() * 3 });
  }

  /** Bubbles and a sparkle after cleaning the tank. */
  scrub(tankId: number): void {
    const v = this.views.get(tankId);
    if (!v) return;
    for (let i = 0; i < 40; i++)
      v.bubbles.push({ x: v.box.x + Math.random() * v.box.w, y: v.box.y + v.box.h - Math.random() * v.box.h * 0.6, r: 1 + Math.random() * 2.5, life: 1 + Math.random() * 1.5 });
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
    for (const v of this.views.values()) {
      const on = v.box.x + v.box.w > viewX0 - 100 && v.box.x < viewX1 + 100;
      v.root.visible = on;
      const water = tankDataFor(save, v.id).water;
      if (Math.abs(water - v.murkShown) > 0.005) {
        v.murkShown = water;
        v.murk.clear();
        const m = 1 - water;
        if (m > 0.03) {
          v.murk.rect(v.box.x, v.box.y, v.box.w, v.box.h).fill({ color: 0x5a6a3a, alpha: m * 0.55 });
          for (let i = 0; i < 30 * m; i++) {
            const x = v.box.x + ((i * 53.7) % v.box.w);
            const y = v.box.y + ((i * 31.3) % v.box.h);
            v.murk.circle(x, y, 1 + (i % 3) * 0.6).fill({ color: 0x8a8a5a, alpha: 0.5 * m });
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
        f.y = Math.min(v.box.y + v.box.h - 8, f.y + f.vy * dt);
        f.x += Math.sin(time * 2 + i) * 6 * dt;
        let eaten = f.life <= 0;
        for (const s of v.swimmers.values()) if (s.stage !== 'egg' && Math.hypot(s.x - f.x, s.y - f.y) < 7) eaten = true;
        if (eaten) {
          v.flakes.splice(i, 1);
          continue;
        }
        if (on) fg.rect(f.x - 1.4, f.y - 0.8, 2.8, 1.6).fill({ color: 0xc9a24a, alpha: Math.min(1, f.life) });
      }
      const bg = v.bubblesG;
      bg.clear();
      for (let i = v.bubbles.length - 1; i >= 0; i--) {
        const b = v.bubbles[i];
        b.life -= dt;
        b.y -= (20 + b.r * 10) * dt;
        if (b.life <= 0 || b.y < v.box.y + 2) {
          v.bubbles.splice(i, 1);
          continue;
        }
        if (on) bg.circle(b.x + Math.sin(time * 5 + i) * 1.5, b.y, b.r).stroke({ color: 0xe8f6f0, width: 0.8, alpha: Math.min(1, b.life) * 0.8 });
      }
      for (const s of v.swimmers.values()) this.move(s, v, dt, time, save, on);
      if (this.highlight !== null && v.swimmers.has(this.highlight)) {
        const s = v.swimmers.get(this.highlight)!;
        const n = 12;
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2 + time;
          this.ring.arc(s.x, s.y - 3, 22, a0, a0 + Math.PI / n).stroke({ color: 0xfff1c0, width: 1.4, alpha: 0.8 });
        }
      }
    }
  }

  private move(s: Swimmer, v: TankView, dt: number, time: number, save: SaveData, on: boolean): void {
    const c = s.data;
    const b = v.box;
    const vig = vigour(save, c);
    const sick = Math.min(1, c.sickness * 3);
    if (c.stage !== 'egg') {
      const pad = c.stage === 'grown' ? 22 : 16;
      const sp = c.species;
      // Swim towards a sinking flake if there is one.
      let flake: Flake | null = null;
      let fd = 90;
      for (const f of v.flakes) {
        const d = Math.hypot(f.x - s.x, f.y - s.y);
        if (d < fd) {
          fd = d;
          flake = f;
        }
      }
      s.retarget -= dt;
      if (flake) {
        s.tx = flake.x;
        s.ty = flake.y;
      } else if (s.retarget <= 0 || Math.hypot(s.tx - s.x, s.ty - s.y) < 8) {
        s.tx = b.x + pad + Math.random() * (b.w - pad * 2);
        // Puffcaps drift high, rays keep low, glowfins swim the middle;
        // crabs walk the floor and shrimp keep low-to-middle (milestone 7).
        const lo = sp === 'crab' ? 0.9 : sp === 'ray' ? 0.7 : sp === 'puffcap' ? 0.2 : sp === 'shrimp' ? 0.45 : 0.3;
        const hi = sp === 'crab' ? 0.9 : sp === 'ray' ? 0.85 : sp === 'puffcap' ? 0.55 : sp === 'shrimp' ? 0.8 : 0.75;
        s.ty = b.y + b.h * (lo + Math.random() * (hi - lo));
        s.retarget = 2 + Math.random() * 4;
        if (sp === 'ray' && Math.random() < 0.3) s.rest = 2 + Math.random() * 3;
      }
      let speed = (sp === 'puffcap' ? 12 : sp === 'crab' ? 16 : 30) * (0.5 + vig * 0.5) * (1 - sick * 0.6);
      let ax = s.tx - s.x;
      let ay = s.ty - s.y;
      if (s.rest > 0 && !flake) {
        s.rest -= dt;
        ax = 0;
        ay = b.y + b.h - 12 - s.y;
        speed = 8;
      }
      if (flake) speed *= 1.6;
      const l = Math.hypot(ax, ay) || 1;
      const k = 1 - Math.exp(-2 * dt);
      s.vx += ((ax / l) * speed - s.vx) * k;
      s.vy += ((ay / l) * speed * 0.7 - s.vy) * k;
      // Sick ones sink towards the floor.
      s.vy += sick * 6 * dt;
      s.x = Math.max(b.x + pad, Math.min(b.x + b.w - pad, s.x + s.vx * dt));
      s.y = Math.max(b.y + pad * 0.8, Math.min(b.y + b.h - 10, s.y + s.vy * dt));
    }
    s.critter.setVisible(on);
    if (on) s.critter.update(dt, time, s.x, s.y, s.vx, s.vy, { vigour: vig, sick, size: 0.85 });
  }
}
