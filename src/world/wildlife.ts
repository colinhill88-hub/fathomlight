import { Container, Graphics } from 'pixi.js';
import { mulberry32, WORLD_SEED } from '../rng';
import { groundY, isSolid, WORLD_H, WORLD_W } from './terrain';
import { Critter } from '../actors/critters';
import { wildLook, type Traits } from '../game/traits';
import { restockedLook } from '../game/collection';
import { REGROW_SECONDS, SaveData, SpeciesId } from '../game/state';
import type { PointLight } from './scenery';
import type { FlowSample, WaterMotion } from '../scene/waterMotion';

/**
 * Wild creatures you can collect (milestone 4), with fixed homes so the
 * world is the same on every play:
 *  - glowfin egg clutches on the floor of the dark grotto,
 *  - young puffcaps drifting over the drop-off, among bigger adults,
 *  - young dapple rays gliding over the seagrass meadow, with one adult.
 *
 * Stop next to a young one (or a clutch) and hold Collect: it calms, comes
 * closer and slips into the specimen jar. Boosting nearby startles it, and
 * it darts off for a few seconds. Adults are too big for the jar, but can be
 * scanned. A collected spot fills again after the same play time as
 * materials (10 minutes of play).
 */

const rand = mulberry32(WORLD_SEED ^ 0x7c3e);
const R = (a: number, b: number) => a + rand() * (b - a);

function floorAt(x: number, from: number): number {
  for (let y = from; y < WORLD_H; y += 2) if (isSolid(x, y)) return y;
  return WORLD_H;
}

interface Wild {
  id: string;
  species: SpeciesId;
  stage: 'egg' | 'young' | 'grown';
  /** Can it go in the jar? */
  collectible: boolean;
  critter: Critter;
  homeX: number;
  homeY: number;
  range: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  retarget: number;
  /** Seconds left of being startled. */
  scared: number;
  /** Ray: seconds left resting on the sand. */
  rest: number;
  size: number;
  /** 0..1 while sliding into the jar. */
  pull: number;
  present: boolean;
}

const REACH = 95;
const STILL_SPEED = 70;
const CATCH_SECONDS = { egg: 2, young: 2.6 };

export type WildEvent = { type: 'caught'; id: string; species: SpeciesId; stage: 'egg' | 'young' };

export class Wildlife {
  readonly view = new Container();
  readonly emissive = new Container();
  readonly glow = new Container();
  readonly lights: PointLight[] = [];
  private all: Wild[] = [];
  private ring = new Graphics();
  /** G4: eye-shine, drawn unlit and with a soft halo. */
  private eyes = new Graphics();
  private eyeHalo = new Graphics();
  /** The collectible creature in reach, if any. */
  target: { id: string; species: SpeciesId; stage: 'egg' | 'young'; x: number; y: number } | null = null;
  /** 0..1 progress coaxing the target into the jar. */
  progress = 0;
  working = false;
  private lastTarget = '';
  private eggLights = new Map<string, PointLight>();
  private readonly flow: FlowSample = { x: 0, y: 0, silt: 0, energy: 0 };
  private strokeDelay = 0;

  constructor(private readonly living = false) {
    const add = (w: Omit<Wild, 'critter' | 'x' | 'y' | 'vx' | 'vy' | 'tx' | 'ty' | 'retarget' | 'scared' | 'rest' | 'pull' | 'present'>) => {
      const critter = new Critter(w.species, w.stage, this.all.length + 31, wildLook(this.all.length + 31), living);
      const it: Wild = { ...w, critter, x: w.homeX, y: w.homeY, vx: 0, vy: 0, tx: w.homeX, ty: w.homeY, retarget: 0, scared: 0, rest: 0, pull: 0, present: true };
      this.view.addChild(critter.view);
      this.emissive.addChild(critter.emissive);
      this.glow.addChild(critter.glow);
      this.all.push(it);
      return it;
    };
    // Glowfin egg clutches in the grotto, with a faint warm light so they can be found.
    for (const [i, x] of [6040, 6390].entries()) {
      const y = floorAt(x, 760) - 2;
      add({ id: `eggs-${i}`, species: 'glowfin', stage: 'egg', collectible: true, homeX: x, homeY: y, range: 0, size: 1.7 });
      const l: PointLight = { x, y: y - 10, radius: 90, intensity: 0.45, color: [0.9, 0.95, 0.55] };
      this.eggLights.set(`eggs-${i}`, l);
      this.lights.push(l);
    }
    // Milestone 9: in the hidden grotto past the lightless passage, a puffcap polyp and a
    // dapple ray egg case (the first wild eggs of either), each with a faint light.
    for (const [id, sp, x] of [['polyp-0', 'puffcap', 16170], ['raycase-0', 'ray', 16520]] as const) {
      const y = floorAt(x, 1600) - 2;
      add({ id, species: sp, stage: 'egg', collectible: true, homeX: x, homeY: y, range: 0, size: 1.6 });
      const l: PointLight = { x, y: y - 12, radius: 90, intensity: 0.45, color: [1, 0.9, 0.6] };
      this.eggLights.set(id, l);
      this.lights.push(l);
    }
    // Puffcaps over the drop-off.
    add({ id: 'puff-adult-0', species: 'puffcap', stage: 'grown', collectible: false, homeX: 5180, homeY: 360, range: 110, size: 1.7 });
    add({ id: 'puff-adult-1', species: 'puffcap', stage: 'grown', collectible: false, homeX: 5460, homeY: 470, range: 120, size: 1.5 });
    add({ id: 'puff-adult-2', species: 'puffcap', stage: 'grown', collectible: false, homeX: 5640, homeY: 330, range: 100, size: 1.8 });
    add({ id: 'puff-0', species: 'puffcap', stage: 'young', collectible: true, homeX: 5300, homeY: 520, range: 70, size: 1 });
    add({ id: 'puff-1', species: 'puffcap', stage: 'young', collectible: true, homeX: 5560, homeY: 620, range: 70, size: 1 });
    // Dapple rays over the seagrass meadow.
    add({ id: 'ray-adult', species: 'ray', stage: 'grown', collectible: false, homeX: 7600, homeY: groundY(7600) - 90, range: 600, size: 2.1 });
    add({ id: 'ray-0', species: 'ray', stage: 'young', collectible: true, homeX: 7180, homeY: groundY(7180) - 50, range: 200, size: 1.35 });
    add({ id: 'ray-1', species: 'ray', stage: 'young', collectible: true, homeX: 8000, homeY: groundY(8000) - 50, range: 180, size: 1.35 });
    // Milestone 7, the kelp forest: tinker crabs on the floor among the
    // holdfasts, lantern shrimp by the glowing moss on shaded rock.
    add({ id: 'crab-adult', species: 'crab', stage: 'grown', collectible: false, homeX: 11250, homeY: groundY(11250) - 8, range: 260, size: 1.5 });
    add({ id: 'crab-0', species: 'crab', stage: 'young', collectible: true, homeX: 10520, homeY: groundY(10520) - 8, range: 160, size: 1.2 });
    add({ id: 'crab-1', species: 'crab', stage: 'young', collectible: true, homeX: 12300, homeY: groundY(12300) - 8, range: 160, size: 1.2 });
    add({ id: 'crab-2', species: 'crab', stage: 'young', collectible: true, homeX: 13480, homeY: groundY(13480) - 8, range: 140, size: 1.2 });
    add({ id: 'shrimp-adult', species: 'shrimp', stage: 'grown', collectible: false, homeX: 12880, homeY: groundY(12880) - 70, range: 120, size: 1.6 });
    add({ id: 'shrimp-0', species: 'shrimp', stage: 'young', collectible: true, homeX: 11080, homeY: groundY(11080) - 50, range: 90, size: 1.2 });
    add({ id: 'shrimp-1', species: 'shrimp', stage: 'young', collectible: true, homeX: 13980, homeY: groundY(13980) - 50, range: 90, size: 1.2 });
    // Milestone 10: cinder snails creeping over the vent field in the trench, grazing the chimneys.
    add({ id: 'snail-adult', species: 'snail', stage: 'grown', collectible: false, homeX: 30000, homeY: groundY(30000) - 7, range: 160, size: 1.5 });
    add({ id: 'snail-0', species: 'snail', stage: 'young', collectible: true, homeX: 29740, homeY: groundY(29740) - 7, range: 90, size: 1.2 });
    add({ id: 'snail-1', species: 'snail', stage: 'young', collectible: true, homeX: 30250, homeY: groundY(30250) - 7, range: 90, size: 1.2 });
    for (const w of this.all) {
      w.x = w.homeX + R(-30, 30);
      w.y = w.stage === 'egg' ? w.homeY : w.homeY + R(-20, 20);
      w.retarget = R(0, 3);
    }
    this.emissive.addChild(this.ring, this.eyes);
    this.glow.addChild(this.eyeHalo);
  }

  /** Phase 16 round 3: creatures out in the world near (x, y) (not eggs), for their soft calls. */
  voices(x: number, y: number, r: number): { species: SpeciesId; x: number; y: number; young: boolean }[] {
    const out: { species: SpeciesId; x: number; y: number; young: boolean }[] = [];
    for (const w of this.all)
      if (w.present && w.stage !== 'egg' && Math.abs(w.x - x) < r && Math.abs(w.y - y) < r) out.push({ species: w.species, x: w.x, y: w.y, young: w.stage === 'young' });
    return out;
  }

  /** After milestone 12: young creatures and eggs you could collect, for the Echo visor. */
  youngSpots(): { x: number; y: number }[] {
    return this.all.filter((w) => w.collectible && w.present).map((w) => ({ x: w.x, y: w.y }));
  }

  /** Milestone 9: the traits of a wild creature (so the one you catch looks the same in the tank). */
  traitsOf(id: string): Traits | undefined {
    const w = this.all.find((q) => q.id === id);
    return w ? { ...w.critter.traits } : undefined;
  }

  /**
   * G4: eyes catch the lamp. Creatures inside the beam get a warm glint at the head (warm only: the
   * Choir's colours are never used), stronger the closer and the more squarely they are lit. Predators
   * and the wary kelp-forest species glint hardest; the shallows' gentle ones barely.
   */
  eyeShine(lamp: { x: number; y: number; dirX: number; dirY: number; radius: number; coneCos: number; on: boolean }, strength: number, time: number): void {
    const g = this.eyes.clear();
    const h = this.eyeHalo.clear();
    if (!lamp.on || strength <= 0) return;
    for (const w of this.all) {
      if (!w.present || w.stage === 'egg') continue;
      if (this.living && !w.critter.view.visible) continue;
      const eye = w.critter.eyeshine();
      const hx = eye?.x ?? w.x + w.critter.face * w.size * 7;
      const hy = eye?.y ?? w.y - w.size * 1.5;
      const dx = hx - lamp.x;
      const dy = hy - lamp.y;
      const d = Math.hypot(dx, dy);
      if (d > lamp.radius || d < 8) continue;
      const along = (dx * lamp.dirX + dy * lamp.dirY) / d;
      const k = Math.max(0, Math.min(1, (along - lamp.coneCos) / 0.08)) * (1 - d / lamp.radius);
      if (k <= 0.02) continue;
      const wary = w.species === 'crab' || w.species === 'shrimp' ? 1 : 0.55;
      const a = Math.min(1, k * 1.6) * wary * strength * (0.85 + 0.15 * Math.sin(time * 5 + hx));
      const r = 1.6 + w.size * 0.9;
      g.circle(hx, hy, r).fill({ color: 0xffe2a0, alpha: a });
      h.circle(hx, hy, r * 3.2).fill({ color: 0xffc860, alpha: a * 0.5 });
    }
  }

  /** Points for the scanner: wild puffcaps and rays (eggs count as glowfins). */
  scanPoints(species: SpeciesId): { x: number; y: number }[] {
    return this.all.filter((w) => w.species === species && w.present && w.stage !== 'egg').map((w) => ({ x: w.x, y: w.y - 4 }));
  }

  private pickTarget(w: Wild): void {
    for (let i = 0; i < 10; i++) {
      w.tx = w.homeX + R(-w.range, w.range);
      const gy = groundY(Math.max(0, Math.min(WORLD_W, w.tx)));
      if (w.species === 'ray') {
        // Rays keep low over the grass.
        w.ty = gy - (w.stage === 'grown' ? R(70, 130) : R(36, 80));
      } else if (w.species === 'crab' || w.species === 'snail') {
        // Crabs (and cinder snails) walk the floor.
        w.ty = gy - 8;
        break;
      } else if (w.species === 'shrimp') w.ty = gy - R(24, 110);
      else w.ty = w.homeY + R(-w.range * 0.6, w.range * 0.6);
      if (!isSolid(w.tx, w.ty) && !isSolid(w.tx, w.ty + 20)) break;
    }
    w.retarget = R(3, 7);
  }

  /**
   * held: Collect is held and the diver can take this creature (jar empty,
   * species scanned). Returns caught events.
   */
  update(dt: number, time: number, dx: number, dy: number, diverSpeed: number, boosting: boolean, save: SaveData, held: boolean, viewX0: number, viewX1: number, water?: WaterMotion): WildEvent[] {
    const events: WildEvent[] = [];
    this.strokeDelay = Math.max(0, this.strokeDelay - dt);
    const now = save.playSeconds;
    let best: Wild | null = null;
    let bestD = REACH;
    for (const w of this.all) {
      // Coming back after being collected.
      if (w.id in save.caught && now - save.caught[w.id] > REGROW_SECONDS) delete save.caught[w.id];
      const gone = w.id in save.caught;
      if (w.pull > 0) {
        w.pull += dt / 0.35;
        const t = Math.min(1, w.pull);
        w.x += (dx - w.x) * t;
        w.y += (dy - w.y) * t;
        w.critter.update(dt, time, w.x, w.y, 0, 0, { vigour: 1, sick: 0, size: w.size * (1 - t * 0.85) });
        if (t >= 1) {
          w.pull = 0;
          w.present = false;
          w.critter.setVisible(false);
        }
        continue;
      }
      if (gone) {
        if (w.present) {
          w.present = false;
          w.critter.setVisible(false);
        }
        const l = this.eggLights.get(w.id);
        if (l) l.intensity = 0;
        continue;
      }
      if (!w.present) {
        w.present = true;
        w.x = w.homeX;
        w.y = w.homeY;
        w.critter.setVisible(true);
      }
      const near = w.x > viewX0 - 400 && w.x < viewX1 + 400;
      const l = this.eggLights.get(w.id);
      if (l) l.intensity = 0.4 + 0.08 * Math.sin(time * 2 + w.homeX);
      const fdx = w.x - dx;
      const fdy = w.y - dy;
      const fd = Math.hypot(fdx, fdy);
      if (w.stage !== 'egg') {
        // Boosting close by startles it.
        const jumpy = w.species === 'crab' || w.species === 'shrimp';
        if (fd < (jumpy ? 280 : 220) && (boosting || diverSpeed > (jumpy ? 160 : 220)) && w.scared <= 0) {
          w.scared = 3;
          w.rest = 0;
        }
        w.scared = Math.max(0, w.scared - dt);
        w.retarget -= dt;
        if (Math.hypot(w.tx - w.x, w.ty - w.y) < 14 || w.retarget <= 0) {
          this.pickTarget(w);
          if (w.species === 'ray' && w.stage === 'young' && rand() < 0.35) w.rest = R(3, 6);
        }
        let ax = w.tx - w.x;
        let ay = w.ty - w.y;
        let speed = w.species === 'puffcap' ? 22 : w.species === 'snail' ? 10 : w.species === 'crab' ? (w.stage === 'grown' ? 30 : 24) : w.stage === 'grown' ? 60 : 48;
        // Kelp forest creatures are curious but wary: they edge closer to a
        // diver who keeps still, and keep a little distance.
        const forest = w.species === 'crab' || w.species === 'shrimp';
        if (forest && fd < 300 && fd > 110 && diverSpeed < 45 && w.scared <= 0 && !held) {
          ax = dx - w.x;
          ay = w.species === 'crab' ? 0 : dy - w.y;
          speed *= 0.6;
        }
        if (w.rest > 0) {
          // Resting on the sand, wings still.
          w.rest -= dt;
          ax = 0;
          ay = groundY(w.x) - 14 - w.y;
          speed = 15;
        }
        if (w.scared > 0 && fd < 320) {
          ax = fdx;
          ay = fdy * 0.6;
          speed = w.species === 'puffcap' ? 70 : w.species === 'snail' ? 18 : w.species === 'crab' ? 110 : 170;
          if (w.species === 'crab' || w.species === 'snail') ay = 0;
        } else if (w === this.findTarget() && held && diverSpeed < STILL_SPEED && w.collectible) {
          // Being coaxed: it drifts calmly towards the diver.
          ax = dx - w.x;
          ay = dy - w.y;
          speed = fd > 50 ? 30 : 0;
        }
        const l2 = Math.hypot(ax, ay) || 1;
        const k = 1 - Math.exp(-1.6 * dt);
        w.vx += ((ax / l2) * speed - w.vx) * k;
        w.vy += ((ay / l2) * speed * (w.species === 'puffcap' ? 0.8 : 0.5) - w.vy) * k;
        const nx = w.x + w.vx * dt;
        const ny = w.y + w.vy * dt;
        if (w.species === 'crab' || w.species === 'snail') {
          // Walk along the floor.
          w.x = Math.max(w.homeX - w.range - 200, Math.min(w.homeX + w.range + 200, nx));
          w.y = groundY(w.x) - (w.species === 'snail' ? 6 : 8);
          w.vy = 0;
        } else if (!isSolid(nx, ny + 6) && ny > 60) {
          w.x = nx;
          w.y = ny;
        } else {
          w.vx *= -0.4;
          w.vy = -Math.abs(w.vy) * 0.4 - 5;
          this.pickTarget(w);
        }
        // Don't wander off.
        if (Math.abs(w.x - w.homeX) > w.range + 260) this.pickTarget(w);
      }
      w.critter.setVisible(near);
      if (near) {
        const animate = this.living && w.stage !== 'egg';
        const ray = animate && w.species === 'ray';
        const ground = animate && (w.species === 'crab' || w.species === 'snail');
        const curious = animate && (w.species === 'crab' || w.species === 'shrimp') && diverSpeed < 45 && !held && !w.scared
          ? Math.max(0, 1 - Math.abs(fd - 165) / 135) : 0;
        const current = animate && water ? Math.max(-1, Math.min(1, water.sample(w.x, w.y, this.flow).x / 70)) : 0;
        w.critter.update(dt, time, w.x, w.y, w.vx, w.vy, {
          vigour: 1, sick: 0, size: w.size,
          resting: ray && w.rest > 0,
          floorGap: ray ? groundY(w.x) - w.y : undefined,
          notice: animate ? Math.min(1, w.scared / 3) : undefined,
          curious, current,
          floorSlope: ground ? (groundY(w.x + 12) - groundY(w.x - 12)) / 24 : 0,
        });
        const stroke = w.critter.stroke;
        if (animate && water && stroke.strength && this.strokeDelay === 0 && fd < 440) {
          water.disturb(stroke);
          this.strokeDelay = 0.24;
        }
      }
      if (w.collectible && w.scared <= 0 && fd < bestD) {
        bestD = fd;
        best = w;
      }
    }
    this.cachedTarget = best;
    this.target = best && best.stage !== 'grown' ? { id: best.id, species: best.species, stage: best.stage, x: best.x, y: best.y } : null;
    if (!best || best.id !== this.lastTarget) {
      this.progress = 0;
      this.lastTarget = best?.id ?? '';
    }
    this.working = !!best && held && diverSpeed < STILL_SPEED;
    if (best && this.working) {
      this.progress += dt / CATCH_SECONDS[best.stage === 'egg' ? 'egg' : 'young'];
      if (this.progress >= 1) {
        save.caught[best.id] = now;
        best.pull = 0.0001;
        events.push({ type: 'caught', id: best.id, species: best.species, stage: best.stage === 'egg' ? 'egg' : 'young' });
        this.progress = 0;
        this.target = null;
        this.working = false;
      }
    } else this.progress = Math.max(0, this.progress - dt * 0.8);
    // A dashed ring around the creature in reach, filling while coaxing.
    const r = this.ring;
    r.clear();
    if (best && this.target) {
      const rad = best.stage === 'egg' ? 20 : 26;
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2 + time * 0.6;
        r.arc(best.x, best.y - 4, rad, a0, a0 + (Math.PI * 2) / n / 2).stroke({ color: 0xfff1c0, width: 1.6, alpha: 0.65 });
      }
      if (this.progress > 0)
        r.arc(best.x, best.y - 4, rad + 4, -Math.PI / 2, -Math.PI / 2 + this.progress * Math.PI * 2).stroke({ color: 0xffd080, width: 2.6, alpha: 0.95 });
    }
    return events;
  }

  private cachedTarget: Wild | null = null;
  private findTarget(): Wild | null {
    return this.cachedTarget;
  }

  /**
   * Phase 21, restocking the reef: bred creatures you let go make their looks turn up in
   * the wild. Every other wild creature of the species (eggs too, so a catch can carry it)
   * takes one of the released looks; the rest keep their natural ones. Call on load and
   * after a release. A creature caught from the wild takes the looks it shows.
   */
  applyRestock(save: SaveData): void {
    const seen = new Map<SpeciesId, number>();
    this.all.forEach((w, idx) => {
      const i = seen.get(w.species) ?? 0;
      seen.set(w.species, i + 1);
      const found = restockedLook(save, w.species, i);
      if (!found) return;
      const t = w.critter.traits;
      // Phase 22: a released look keeps its size and shape too.
      const look: Traits = { ...found };
      if (t.colour === look.colour && t.pattern === look.pattern && !!t.radiant === !!look.radiant && t.size === look.size && (t.shape ?? 0) === (look.shape ?? 0)) return;
      const old = w.critter;
      const fresh = new Critter(w.species, w.stage, idx + 31, look, this.living);
      for (const [layer, a, b] of [[this.view, old.view, fresh.view], [this.emissive, old.emissive, fresh.emissive], [this.glow, old.glow, fresh.glow]] as const) {
        const at = layer.getChildIndex(a);
        layer.addChildAt(b, Math.max(0, at));
        layer.removeChild(a);
      }
      fresh.setVisible(w.present);
      old.destroy();
      w.critter = fresh;
    });
  }

  /** A released creature: if its spot is empty, it goes home at once. */
  release(species: SpeciesId, stage: 'egg' | 'young' | 'grown', save: SaveData): void {
    const spot = this.all.find((w) => w.collectible && w.species === species && w.id in save.caught && (stage === 'egg') === (w.stage === 'egg'));
    if (spot) delete save.caught[spot.id];
  }
}
