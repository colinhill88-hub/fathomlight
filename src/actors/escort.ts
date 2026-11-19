import { Container } from 'pixi.js';
import { Critter } from './critters';
import type { PointLight } from '../world/scenery';
import type { JarData } from '../game/state';
import { RADIANT_LIGHT, traitsOf } from '../game/traits';

/**
 * Milestone 9: a grown glowfin carried in the specimen jar swims beside the
 * diver as a living light (Colin's choice: creatures as keys). Its glow gets
 * through the lightless water under the kelp caves' junction, where even the
 * dive light dies. A radiant glowfin lights a wider circle.
 */
export const ESCORT_RADIUS = 340;

export class Escort {
  readonly view = new Container();
  readonly emissive = new Container();
  readonly glow = new Container();
  readonly light: PointLight = { x: 0, y: 0, radius: ESCORT_RADIUS, intensity: 0, color: [1, 0.92, 0.62] };
  private critter: Critter | null = null;
  private key = '';
  x = 0;
  y = 0;
  private vx = 0;
  private vy = 0;
  private fade = 0;

  constructor(private readonly living = false) {}

  /** Is a grown glowfin out with the diver? */
  get active(): boolean {
    return !!this.critter;
  }

  /** Follow what is in the jar: a grown glowfin comes out to swim; anything else, it goes. */
  sync(jar: JarData | null, diverX: number, diverY: number): void {
    const c = jar?.species === 'glowfin' && jar.stage === 'grown' ? (jar.keep ?? null) : null;
    const key = c ? `${c.id}` : jar?.species === 'glowfin' && jar.stage === 'grown' ? 'wild' : '';
    if (key === this.key) return;
    this.key = key;
    this.critter?.destroy();
    this.critter = null;
    if (!key) return;
    const traits = c ? traitsOf(c) : traitsOf({ id: 1 });
    this.critter = new Critter('glowfin', 'grown', c?.id ?? 1, traits, this.living);
    this.view.addChild(this.critter.view);
    this.emissive.addChild(this.critter.emissive);
    this.glow.addChild(this.critter.glow);
    this.light.radius = ESCORT_RADIUS * (traits.radiant ? RADIANT_LIGHT : 1);
    this.x = diverX;
    this.y = diverY - 20;
    this.vx = this.vy = 0;
    this.fade = 0;
  }

  /** Light reach right now (0 when none is out). */
  get reach(): number {
    return this.critter ? this.light.radius * this.fade : 0;
  }

  update(dt: number, time: number, diverX: number, diverY: number, face: number, show: boolean): void {
    const c = this.critter;
    this.fade += ((c && show ? 1 : 0) - this.fade) * Math.min(1, dt * 2.5);
    this.light.intensity = 1.35 * this.fade;
    if (!c) return;
    c.setVisible(show);
    // A lazy orbit just behind and above the diver's shoulder, darting ahead now and then.
    const tx = diverX - face * 46 + Math.sin(time * 0.9) * 26;
    const ty = diverY - 34 + Math.sin(time * 1.4 + 1) * 14;
    // Far behind (a respawn, leaving the sub): it catches up at once.
    if (Math.hypot(tx - this.x, ty - this.y) > 500) {
      this.x = tx;
      this.y = ty;
      this.vx = this.vy = 0;
    }
    const k = 1 - Math.exp(-2.2 * dt);
    this.vx += ((tx - this.x) * 3 - this.vx) * k;
    this.vy += ((ty - this.y) * 3 - this.vy) * k;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.light.x = this.x;
    this.light.y = this.y - 8;
    c.update(dt, time, this.x, this.y, this.vx, this.vy, { vigour: 1, sick: 0, size: 1.15 });
  }
}
