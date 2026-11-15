import { Container, Graphics } from 'pixi.js';
import { mulberry32, WORLD_SEED } from '../rng';
import { groundY, isSolid, WORLD_W } from './terrain';
import { Critter } from '../actors/critters';
import { REGROW_SECONDS, SaveData, SpeciesId } from '../game/state';
import type { PointLight } from './scenery';

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
 * materials (6 minutes).
 */

const rand = mulberry32(WORLD_SEED ^ 0x7c3e);
const R = (a: number, b: number) => a + rand() * (b - a);

function floorAt(x: number, from: number): number {
  for (let y = from; y < 1300; y += 2) if (isSolid(x, y)) return y;
  return 1300;
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
  /** The collectible creature in reach, if any. */
  target: { id: string; species: SpeciesId; stage: 'egg' | 'young'; x: number; y: number } | null = null;
  /** 0..1 progress coaxing the target into the jar. */
  progress = 0;
  working = false;
  private lastTarget = '';
  private eggLights = new Map<string, PointLight>();

  constructor() {
    const add = (w: Omit<Wild, 'critter' | 'x' | 'y' | 'vx' | 'vy' | 'tx' | 'ty' | 'retarget' | 'scared' | 'rest' | 'pull' | 'present'>) => {
      const critter = new Critter(w.species, w.stage, this.all.length + 31);
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
    for (const w of this.all) {
      w.x = w.homeX + R(-30, 30);
      w.y = w.stage === 'egg' ? w.homeY : w.homeY + R(-20, 20);
      w.retarget = R(0, 3);
    }
    this.emissive.addChild(this.ring);
  }

  /** Points for the scanner: wild puffcaps and rays (eggs count as glowfins). */
  scanPoints(species: SpeciesId): { x: number; y: number }[] {
    return this.all.filter((w) => w.species === species && w.present && w.stage !== 'egg').map((w) => ({ x: w.x, y: w.y - 4 }));
  }

  private pickTarget(w: Wild): void {
    for (let i = 0; i < 10; i++) {
      w.tx = w.homeX + R(-w.range, w.range);
      if (w.species === 'ray') {
        // Rays keep low over the grass.
        const gy = groundY(Math.max(0, Math.min(WORLD_W, w.tx)));
        w.ty = gy - (w.stage === 'grown' ? R(70, 130) : R(36, 80));
      } else w.ty = w.homeY + R(-w.range * 0.6, w.range * 0.6);
      if (!isSolid(w.tx, w.ty) && !isSolid(w.tx, w.ty + 20)) break;
    }
    w.retarget = R(3, 7);
  }

  /**
   * held: Collect is held and the diver can take this creature (jar empty,
   * species scanned). Returns caught events.
   */
  update(dt: number, time: number, dx: number, dy: number, diverSpeed: number, boosting: boolean, save: SaveData, held: boolean, viewX0: number, viewX1: number): WildEvent[] {
    const events: WildEvent[] = [];
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
        if (fd < 220 && (boosting || diverSpeed > 220) && w.scared <= 0) {
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
        let speed = w.species === 'puffcap' ? 22 : w.stage === 'grown' ? 60 : 48;
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
          speed = w.species === 'puffcap' ? 70 : 170;
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
        if (!isSolid(nx, ny + 6) && ny > 60) {
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
      if (near) w.critter.update(dt, time, w.x, w.y, w.vx, w.vy, { vigour: 1, sick: 0, size: w.size });
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

  /** A released creature: if its spot is empty, it goes home at once. */
  release(species: SpeciesId, stage: 'egg' | 'young' | 'grown', save: SaveData): void {
    const spot = this.all.find((w) => w.collectible && w.species === species && w.id in save.caught && (stage === 'egg') === (w.stage === 'egg'));
    if (spot) delete save.caught[spot.id];
  }
}
