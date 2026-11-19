import { Container, Graphics } from 'pixi.js';
import type { Light } from '../fx/lighting';
import { groundY, isSolid } from '../world/terrain';
import { mulberry32, WORLD_SEED } from '../rng';
import type { FlowSample, WaterMotion } from '../scene/waterMotion';
import { drawRibbonStalker, drawSailJaw, drawTrestleStrider } from './predatorArt';

/**
 * Milestone 10: the trench's predators (Colin: the angler, the stalker, and a
 * large deep-sea spider). DESIGN.md asks for fear here: large shapes at the
 * edge of the light, needle teeth, lures, eyes that reflect, things that
 * follow. They are built so that no lamp setting is safe from all of them:
 *
 *  - The lanternjaw hangs still in open water with an amber lure. A lit lamp
 *    draws it: it drifts towards the light and snaps. Lamp off, it barely
 *    notices you.
 *  - The pale stalker follows at the edge of the lamp's reach. While the lamp
 *    is on and you keep moving it only follows; stop, or go dark, and it
 *    strikes.
 *  - The abyssal strider, a deep-sea spider, walks the ledges on long legs.
 *    It is drawn to light and comes for a lit diver, slowly and steadily.
 *
 * A sonar pulse drives all three off for a while. None of them attacks the
 * sub. Every design is original, and every glow is warm (amber, pale white):
 * cyan, violet and magenta belong to the Choir.
 */

export type HunterKind = 'lanternjaw' | 'stalker' | 'spider';
export interface DiverView {
  x: number;
  y: number;
  lampOn: boolean;
  speed: number;
}
export interface HunterEvent {
  kind: HunterKind;
  type: 'warn' | 'bite' | 'follow';
  x: number;
  y: number;
  damage: number;
}

const rand = mulberry32(WORLD_SEED ^ 0x5d1e);

abstract class Hunter {
  readonly view = new Graphics();
  readonly emissive = new Graphics();
  readonly glow = new Graphics();
  readonly light: Light = { x: 0, y: 0, radius: 120, intensity: 0, color: [1, 0.7, 0.35] };
  x = 0;
  y = 0;
  face = 1;
  protected time = rand() * 20;
  visualFlow = 0;
  wake: { x: number; y: number } | undefined;
  protected constructor(protected readonly living: boolean) {}
  abstract readonly kind: HunterKind;
  abstract update(dt: number, d: DiverView, target: boolean, visible: boolean): HunterEvent | null;
  /** A sonar pulse: returns true if it was hunting (it backs off either way). */
  abstract scare(): boolean;
  head(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
  get stirring(): boolean { return false; }
  protected show(v: boolean): void {
    this.view.visible = this.emissive.visible = this.glow.visible = v;
    if (!v) this.light.intensity = 0;
  }
}

// ---------------------------------------------------------------------------
// The lanternjaw: an ambush hunter in open water, drawn in by light.

class Lanternjaw extends Hunter {
  readonly kind = 'lanternjaw' as const;
  private state: 'hang' | 'drift' | 'snap' | 'back' | 'rest' = 'hang';
  private t = 0;
  private vx = 0;
  private vy = 0;
  private jaw = 0;
  private aimX = 0;
  private aimY = 0;
  private warned = false;

  constructor(
    readonly hx: number,
    readonly hy: number,
    living: boolean,
  ) {
    super(living);
    this.x = hx;
    this.y = hy;
    this.face = rand() < 0.5 ? -1 : 1;
  }

  scare(): boolean {
    const was = this.state === 'drift' || this.state === 'snap';
    this.state = 'back';
    this.t = -8;
    return was;
  }

  update(dt: number, d: DiverView, target: boolean, visible: boolean): HunterEvent | null {
    this.time += dt;
    this.t += dt;
    let ev: HunterEvent | null = null;
    const dx = d.x - this.x;
    const dy = d.y - this.y;
    const dist = Math.hypot(dx, dy);
    const homeD = Math.hypot(this.x - this.hx, this.y - this.hy);
    let ax = 0;
    let ay = 0;
    let speed = 0;
    if (this.state === 'hang') {
      ax = this.hx - this.x;
      ay = this.hy + Math.sin(this.time * 0.5) * 20 - this.y;
      speed = 20;
      if (target && ((d.lampOn && dist < 520) || dist < 150)) {
        this.state = 'drift';
        this.t = 0;
        this.warned = false;
      }
    } else if (this.state === 'drift') {
      // Drawn towards the light, never far from home.
      ax = dx;
      ay = dy;
      speed = d.lampOn ? 62 : 25;
      if (!this.warned && dist < 300) {
        this.warned = true;
        ev = { kind: this.kind, type: 'warn', x: this.x, y: this.y, damage: 0 };
      }
      if (!target || homeD > 420 || (!d.lampOn && dist > 160) || dist > 700) {
        this.state = 'back';
        this.t = 0;
      } else if (dist < 120) {
        this.state = 'snap';
        this.t = 0;
        this.aimX = d.x;
        this.aimY = d.y;
      }
    } else if (this.state === 'snap') {
      // A burst forward, jaws wide.
      ax = this.aimX - this.x;
      ay = this.aimY - this.y;
      speed = 560;
      if (this.t > 0.28) {
        if (target && dist < 62) ev = { kind: this.kind, type: 'bite', x: this.x, y: this.y, damage: 0.3 };
        this.state = 'back';
        this.t = 0;
      }
    } else if (this.state === 'back') {
      ax = this.hx - this.x;
      ay = this.hy - this.y;
      speed = 90;
      if (homeD < 20 && this.t > 0) {
        this.state = 'rest';
        this.t = 0;
      }
    } else if (this.t > 3.5) this.state = 'hang';
    const L = Math.hypot(ax, ay);
    const tvx = L > 1 ? (ax / L) * Math.min(speed, L * 3) : 0;
    const tvy = L > 1 ? (ay / L) * Math.min(speed, L * 3) : 0;
    const k = 1 - Math.exp(-(this.state === 'snap' ? 9 : 1.8) * dt);
    this.vx += (tvx - this.vx) * k;
    this.vy += (tvy - this.vy) * k;
    const nx = this.x + this.vx * dt;
    const ny = this.y + this.vy * dt;
    if (!isSolid(nx, ny + 30) && !isSolid(nx + 60 * this.face, ny)) {
      this.x = nx;
      this.y = ny;
    } else {
      this.vx *= -0.3;
      this.vy = -Math.abs(this.vy) * 0.3;
    }
    if (Math.abs(this.vx) > 8) this.face = Math.sign(this.vx);
    const wantJaw = this.state === 'snap' ? 1 : this.state === 'drift' && dist < 260 ? 0.35 : 0.05;
    this.jaw += (wantJaw - this.jaw) * Math.min(1, dt * 10);
    this.show(visible);
    if (visible) {
      if (this.living) {
        const bright = this.state === 'rest' ? 0.25 : this.state === 'back' ? 0.4 : 0.75 + 0.25 * Math.sin(this.time * 3);
        this.wake = drawSailJaw(this, this.x, this.y, this.face, this.time, this.jaw, Math.hypot(this.vx, this.vy), bright, this.visualFlow);
      } else this.draw();
    }
    return ev;
  }

  get stirring(): boolean { return this.state === 'snap' || Math.hypot(this.vx, this.vy) > 98; }

  head(): { x: number; y: number } {
    return { x: this.x + this.face * 40, y: this.y };
  }

  private draw(): void {
    const g = this.view.clear();
    const e = this.emissive.clear();
    const gl = this.glow.clear();
    const f = this.face;
    const x = this.x;
    const y = this.y;
    const sw = Math.sin(this.time * 2.2) * 6;
    // Tail: a tapering, ragged fin.
    g.moveTo(x - f * 40, y - 14).quadraticCurveTo(x - f * 90, y - 6 + sw, x - f * 128, y - 18 + sw * 1.4).lineTo(x - f * 124, y + 12 + sw * 1.4).quadraticCurveTo(x - f * 88, y + 10 + sw, x - f * 40, y + 20).fill({ color: 0x1c1a1c });
    for (let k = 0; k < 6; k++) g.moveTo(x - f * (96 + k * 5), y - 14 + sw * 1.2).lineTo(x - f * (100 + k * 5), y + 8 + sw * 1.2).stroke({ color: 0x2c2a2c, width: 1 });
    // Body: a heavy dark bulb, wider at the head.
    g.ellipse(x, y, 62, 34).fill({ color: 0x232023 });
    g.ellipse(x - f * 6, y + 14, 46, 14).fill({ color: 0x302a2c, alpha: 0.8 });
    for (let k = 0; k < 9; k++) g.circle(x + f * (-40 + k * 10), y - 18 + (k % 3) * 9, 2.4).fill({ color: 0x141214, alpha: 0.8 });
    // The jaw: an underslung lower jaw that drops open, lined with needle teeth.
    const open = this.jaw;
    const hx = x + f * 38;
    const hy = y + 4;
    g.poly([hx - f * 10, hy - 22, hx + f * 34, hy - 10, hx + f * 36, hy - 2, hx - f * 4, hy]).fill({ color: 0x2a2628 });
    g.poly([hx - f * 10, hy + 8, hx + f * 34, hy + 2 + open * 30, hx + f * 30, hy + 10 + open * 34, hx - f * 14, hy + 24]).fill({ color: 0x262224 });
    if (open > 0.1) g.poly([hx - f * 6, hy, hx + f * 34, hy - 4, hx + f * 32, hy + 2 + open * 30, hx - f * 8, hy + 10]).fill({ color: 0x0a0405 });
    for (let k = 0; k < 7; k++) {
      const t = k / 6;
      const tx = hx - f * 4 + f * 36 * t;
      g.moveTo(tx, hy - 4 - t * 4).lineTo(tx + f * 1.5, hy + 6 + open * 6).stroke({ color: 0xe8e0d0, width: 1.1 });
      g.moveTo(tx, hy + 8 + open * 30 * t).lineTo(tx - f * 1.5, hy - 2 + open * 22 * t).stroke({ color: 0xe8e0d0, width: 1.1 });
    }
    // A small eye that catches the light.
    const ex = x + f * 30;
    const ey = y - 14;
    g.circle(ex, ey, 4.6).fill({ color: 0x0a0a0c });
    e.circle(ex + f, ey - 1, 1.8).fill({ color: 0xffe0a0, alpha: this.state === 'hang' ? 0.5 : 1 });
    // The lure: a long stalk from the brow with a glowing bulb.
    const sx = x + f * 22;
    const sy = y - 30;
    const lx = sx + f * 66 + Math.sin(this.time * 1.4) * 6;
    const ly = sy - 30 + Math.cos(this.time * 1.1) * 6;
    g.moveTo(sx, sy).quadraticCurveTo(sx + f * 20, sy - 56, lx, ly).stroke({ color: 0x3a3436, width: 1.6 });
    const bright = this.state === 'rest' ? 0.25 : this.state === 'back' ? 0.4 : 0.75 + 0.25 * Math.sin(this.time * 3);
    e.circle(lx, ly, 4).fill({ color: 0xffdc90, alpha: 0.4 + 0.6 * bright });
    gl.circle(lx, ly, 22).fill({ color: 0xffa040, alpha: 0.7 * bright });
    this.light.x = lx;
    this.light.y = ly;
    this.light.radius = 170;
    this.light.intensity = 1.1 * bright;
  }
}

// ---------------------------------------------------------------------------
// The pale stalker: follows at the edge of the light, strikes when you stop.

class Stalker extends Hunter {
  readonly kind = 'stalker' as const;
  private state: 'roam' | 'follow' | 'strike' | 'flee' = 'roam';
  private t = 0;
  private vx = 0;
  private vy = 0;
  private tx: number;
  private ty: number;
  private still = 0;
  private dark = 0;
  private trail: { x: number; y: number }[] = [];
  private side = 1;

  constructor(readonly area: { x0: number; x1: number; y0: number; y1: number }, living: boolean) {
    super(living);
    this.x = this.tx = (area.x0 + area.x1) / 2;
    this.y = this.ty = (area.y0 + area.y1) / 2;
    for (let i = 0; i < 22; i++) this.trail.push({ x: this.x - i * 8, y: this.y });
  }

  scare(): boolean {
    const was = this.state === 'follow' || this.state === 'strike';
    this.state = 'flee';
    this.t = -7;
    return was;
  }

  private near(d: DiverView): boolean {
    const a = this.area;
    return d.x > a.x0 - 400 && d.x < a.x1 + 400 && d.y > a.y0 - 500 && d.y < a.y1 + 500;
  }

  update(dt: number, d: DiverView, target: boolean, visible: boolean): HunterEvent | null {
    this.time += dt;
    this.t += dt;
    let ev: HunterEvent | null = null;
    const dx = d.x - this.x;
    const dy = d.y - this.y;
    const dist = Math.hypot(dx, dy);
    let speed = 60;
    if (this.state === 'roam') {
      if (Math.hypot(this.tx - this.x, this.ty - this.y) < 30 || this.t > 8) {
        const a = this.area;
        this.tx = a.x0 + rand() * (a.x1 - a.x0);
        this.ty = a.y0 + rand() * (a.y1 - a.y0);
        this.t = 0;
      }
      if (target && this.near(d) && dist < 900) {
        this.state = 'follow';
        this.t = 0;
        this.still = 0;
        this.dark = 0;
        this.side = dx > 0 ? -1 : 1;
        ev = { kind: this.kind, type: 'follow', x: this.x, y: this.y, damage: 0 };
      }
    } else if (this.state === 'follow') {
      // Keep to the edge of the light, behind and a little above.
      const keep = 400;
      this.tx = d.x + this.side * keep * 0.85;
      this.ty = d.y - keep * 0.45 + Math.sin(this.time * 0.6) * 60;
      speed = 230;
      this.still = d.speed < 35 ? this.still + dt : Math.max(0, this.still - dt * 2);
      this.dark = d.lampOn ? 0 : this.dark + dt;
      if (!target || !this.near(d)) {
        this.state = 'roam';
        this.t = 0;
      } else if (this.still > 2.6 || this.dark > 1.1) {
        this.state = 'strike';
        this.t = 0;
        ev = { kind: this.kind, type: 'warn', x: this.x, y: this.y, damage: 0 };
      }
    } else if (this.state === 'strike') {
      this.tx = d.x;
      this.ty = d.y;
      speed = 540;
      if (target && dist < 55) {
        ev = { kind: this.kind, type: 'bite', x: this.x, y: this.y, damage: 0.3 };
        this.state = 'flee';
        this.t = -2;
      } else if (this.t > 1.6 || !target) {
        this.state = 'flee';
        this.t = 0;
      }
    } else {
      // Fleeing out of the light, then back to roaming.
      this.tx = this.x - Math.sign(dx || 1) * 400;
      this.ty = this.y - 100;
      speed = 260;
      if (this.t > 3) {
        this.state = 'roam';
        this.t = 0;
        const a = this.area;
        this.tx = a.x0 + rand() * (a.x1 - a.x0);
        this.ty = a.y0 + rand() * (a.y1 - a.y0);
      }
    }
    const ax = this.tx - this.x;
    const ay = this.ty - this.y;
    const L = Math.hypot(ax, ay);
    const k = 1 - Math.exp(-(this.state === 'strike' ? 6 : 1.6) * dt);
    const tvx = L > 1 ? (ax / L) * Math.min(speed, L * 2) : 0;
    const tvy = L > 1 ? (ay / L) * Math.min(speed, L * 2) : 0;
    this.vx += (tvx - this.vx) * k;
    this.vy += (tvy - this.vy) * k;
    const nx = this.x + this.vx * dt;
    const ny = this.y + this.vy * dt;
    if (!isSolid(nx, ny)) {
      this.x = nx;
      this.y = ny;
    } else {
      this.vx *= -0.4;
      this.vy = -Math.abs(this.vy) - 20;
    }
    if (Math.abs(this.vx) > 10) this.face = Math.sign(this.vx);
    // The body follows the head's path.
    const step = 9;
    const tr = this.trail;
    tr[0] = { x: this.x, y: this.y };
    for (let i = 1; i < tr.length; i++) {
      const p = tr[i - 1];
      const q = tr[i];
      const ddx = q.x - p.x;
      const ddy = q.y - p.y;
      const l = Math.hypot(ddx, ddy) || 1;
      tr[i] = { x: p.x + (ddx / l) * step, y: p.y + (ddy / l) * step };
    }
    this.show(visible);
    if (visible) {
      if (this.living) {
        drawRibbonStalker(this, tr, this.time, this.state === 'strike', this.state === 'follow', this.visualFlow);
        this.wake = tr[tr.length - 1];
      } else this.draw();
    }
    return ev;
  }

  get stirring(): boolean { return this.state === 'strike' || this.state === 'flee'; }

  private draw(): void {
    const g = this.view.clear();
    const e = this.emissive.clear();
    const gl = this.glow.clear();
    const tr = this.trail;
    // A long, pale, ribbon-finned body, thickest behind the head.
    for (let i = tr.length - 1; i > 0; i--) {
      const a = tr[i];
      const b = tr[i - 1];
      const f = i / tr.length;
      const w = 4 + 13 * Math.sin(Math.min(1, (1 - f) * 1.4) * Math.PI * 0.85);
      const wave = Math.sin(this.time * 4 - i * 0.5) * 2.5 * f;
      g.moveTo(a.x, a.y + wave).lineTo(b.x, b.y + wave).stroke({ color: 0xb8b0a4, width: w * 2, cap: 'round' });
    }
    for (let i = 2; i < tr.length - 1; i += 2) {
      const a = tr[i];
      // A ribbon fin along the back, and a faint darker line down the flank.
      g.moveTo(a.x, a.y - 12).lineTo(a.x + Math.sin(this.time * 5 - i) * 3, a.y - 22).stroke({ color: 0xd8d0c4, width: 1.2, alpha: 0.6 });
      g.circle(a.x, a.y + 2, 1.6).fill({ color: 0x6a6258, alpha: 0.5 });
    }
    // The head: narrow, with a long underslung jaw and needle teeth.
    const h = tr[0];
    const nb = tr[2];
    const ux = (h.x - nb.x) / (Math.hypot(h.x - nb.x, h.y - nb.y) || 1);
    const uy = (h.y - nb.y) / (Math.hypot(h.x - nb.x, h.y - nb.y) || 1);
    const nx = -uy;
    const ny = ux;
    const open = this.state === 'strike' ? 0.8 : 0.1;
    const tipX = h.x + ux * 34;
    const tipY = h.y + uy * 34;
    g.poly([h.x - nx * 12, h.y - ny * 12, tipX - nx * 2, tipY - ny * 2, h.x + ux * 10, h.y + uy * 10]).fill({ color: 0xc8c0b4 });
    g.poly([h.x + nx * 11, h.y + ny * 11, tipX + nx * (2 + open * 16), tipY + ny * (2 + open * 16), h.x + ux * 10, h.y + uy * 10]).fill({ color: 0xa8a094 });
    for (let k = 1; k < 6; k++) {
      const t = k / 6;
      const bx = h.x + (tipX - h.x) * t;
      const by = h.y + (tipY - h.y) * t;
      g.moveTo(bx + nx * 2, by + ny * 2).lineTo(bx + nx * (2 + open * 12 * t + 4), by + ny * (2 + open * 12 * t + 4)).stroke({ color: 0xf8f0e0, width: 1 });
    }
    // Eyes that reflect: pale, cold-white, glowing back at the lamp.
    const ex = h.x + ux * 10 - nx * 6;
    const ey = h.y + uy * 10 - ny * 6;
    e.circle(ex, ey, 2.6).fill({ color: 0xfff4e0 });
    gl.circle(ex, ey, 10).fill({ color: 0xfff0d0, alpha: this.state === 'roam' ? 0.35 : 0.8 });
    this.light.intensity = 0;
  }

  head(): { x: number; y: number } {
    return { x: this.trail[0].x, y: this.trail[0].y };
  }
}

// ---------------------------------------------------------------------------
// The abyssal strider: a giant sea spider walking the ledges, drawn to light.

class Spider extends Hunter {
  readonly kind = 'spider' as const;
  private state: 'wander' | 'approach' | 'grab' | 'flee' = 'wander';
  private t = 0;
  private vx = 0;
  private tx: number;
  private gait = 0;
  private reach = 0;
  private bored = 0;
  private feet: { x: number; y: number; px: number; lift: number }[] = [];
  private static readonly BODY_H = 96;
  private static readonly OFFS = [-120, -78, -40, -10, 14, 44, 82, 124];

  constructor(readonly area: { x0: number; x1: number }, living: boolean) {
    super(living);
    this.x = this.tx = (area.x0 + area.x1) / 2;
    this.y = groundY(this.x) - Spider.BODY_H;
    for (const o of Spider.OFFS) this.feet.push({ x: this.x + o, y: groundY(this.x + o), px: this.x + o, lift: 0 });
  }

  scare(): boolean {
    const was = this.state === 'approach' || this.state === 'grab';
    this.state = 'flee';
    this.t = -6;
    return was;
  }

  update(dt: number, d: DiverView, target: boolean, visible: boolean): HunterEvent | null {
    this.time += dt;
    this.t += dt;
    let ev: HunterEvent | null = null;
    const a = this.area;
    const dx = d.x - this.x;
    const dy = d.y - this.y;
    const dist = Math.hypot(dx, dy);
    const inRange = d.x > a.x0 - 250 && d.x < a.x1 + 250 && d.y > this.y - 500 && d.y < this.y + 260;
    let speed = 26;
    if (this.state === 'wander') {
      if (Math.abs(this.tx - this.x) < 20 || this.t > 9) {
        this.tx = a.x0 + rand() * (a.x1 - a.x0);
        this.t = 0;
      }
      if (target && d.lampOn && inRange && dist < 650) {
        this.state = 'approach';
        this.t = 0;
        this.bored = 0;
        ev = { kind: this.kind, type: 'warn', x: this.x, y: this.y, damage: 0 };
      }
    } else if (this.state === 'approach') {
      this.tx = Math.max(a.x0 - 120, Math.min(a.x1 + 120, d.x));
      speed = 78;
      this.bored = d.lampOn ? 0 : this.bored + dt;
      if (!target || !inRange || this.bored > 1.6) {
        this.state = 'wander';
        this.t = 0;
      } else if (dist < 150) {
        this.state = 'grab';
        this.t = 0;
      }
    } else if (this.state === 'grab') {
      // It rears up and its front legs close.
      this.reach = Math.min(1, this.t / 0.45);
      speed = 0;
      if (this.t > 0.45) {
        if (target && dist < 135) ev = { kind: this.kind, type: 'bite', x: this.x, y: this.y, damage: 0.25 };
        this.state = 'flee';
        this.t = ev ? -1.5 : 1;
      }
    } else {
      this.tx = this.x - Math.sign(dx || 1) * 300;
      speed = 110;
      if (this.t > 3) {
        this.state = 'wander';
        this.t = 0;
      }
    }
    if (this.state !== 'grab') this.reach = Math.max(0, this.reach - dt * 2);
    const want = Math.sign(this.tx - this.x) * Math.min(speed, Math.abs(this.tx - this.x) * 2);
    this.vx += (want - this.vx) * Math.min(1, dt * 3);
    const nx = Math.max(a.x0 - 160, Math.min(a.x1 + 160, this.x + this.vx * dt));
    const ny = groundY(nx) - Spider.BODY_H;
    if (Math.abs(ny - this.y) < 60 || this.state === 'flee') {
      this.x = nx;
      this.y += (ny - this.y) * Math.min(1, dt * 4);
    } else this.vx = 0;
    if (Math.abs(this.vx) > 4) this.face = Math.sign(this.vx);
    // Feet: each one plants, and steps when the body has moved far past it.
    this.gait += Math.abs(this.vx) * dt;
    Spider.OFFS.forEach((o, i) => {
      const f = this.feet[i];
      const home = this.x + o * 1.05;
      if (f.lift <= 0 && Math.abs(f.x - home) > 46 && (i % 2 === Math.floor(this.gait / 46) % 2)) {
        f.lift = 0.0001;
        f.px = f.x;
      }
      if (f.lift > 0) {
        f.lift += dt / 0.28;
        const t = Math.min(1, f.lift);
        f.x = f.px + (home + Math.sign(this.vx) * 20 - f.px) * t;
        f.y = groundY(f.x) - Math.sin(t * Math.PI) * 26;
        if (t >= 1) f.lift = 0;
      } else f.y = groundY(f.x);
    });
    this.show(visible);
    if (visible) {
      if (this.living) {
        drawTrestleStrider(this, this.feet, Spider.OFFS, this.x, this.y, this.face, this.reach, this.time, this.state !== 'wander', d, this.visualFlow);
        this.wake = this.feet.find((f) => f.lift > 0.88);
      } else this.draw(d);
    }
    return ev;
  }

  get stirring(): boolean { return this.state !== 'wander'; }

  head(): { x: number; y: number } {
    return { x: this.x + this.face * 30, y: this.y };
  }

  private draw(d: DiverView): void {
    const g = this.view.clear();
    const e = this.emissive.clear();
    const gl = this.glow.clear();
    const bob = Math.sin(this.time * 2) * 3;
    const bx = this.x;
    const by = this.y + bob - this.reach * 30;
    // Legs: hip -> knee (high) -> foot, thin and jointed, banded pale and rust.
    Spider.OFFS.forEach((o, i) => {
      const f = this.feet[i];
      let fx = f.x;
      let fy = f.y;
      // The two front legs reach for the diver while grabbing.
      const front = (o > 0 ? 1 : -1) === this.face && Math.abs(o) > 70;
      if (front && this.reach > 0) {
        fx += (d.x - fx) * this.reach * 0.8;
        fy += (d.y - fy) * this.reach * 0.8;
      }
      const hx = bx + o * 0.12;
      const hy = by + 4;
      const kx = (hx + fx) / 2 + o * 0.25;
      const ky = Math.min(hy, fy) - 70 - Math.abs(o) * 0.15;
      g.moveTo(hx, hy).lineTo(kx, ky).stroke({ color: 0x9a5a44, width: 4, cap: 'round' });
      g.moveTo(kx, ky).lineTo(fx, fy).stroke({ color: 0xb87058, width: 3, cap: 'round' });
      for (const t of [0.3, 0.6]) g.circle(kx + (fx - kx) * t, ky + (fy - ky) * t, 2.4).fill({ color: 0xe8c8b0 });
      g.circle(kx, ky, 3.4).fill({ color: 0x7a3e30 });
    });
    // Body: a slender trunk with a proboscis at the front and a stub abdomen behind.
    const f = this.face;
    g.ellipse(bx, by, 26, 10).fill({ color: 0xa86048 });
    g.ellipse(bx - f * 30, by + 2, 12, 7).fill({ color: 0x8a4a38 });
    g.poly([bx + f * 22, by - 6, bx + f * 56, by - 2, bx + f * 56, by + 3, bx + f * 22, by + 7]).fill({ color: 0xb87058 });
    g.ellipse(bx - f * 4, by - 4, 16, 3).fill({ color: 0xffffff, alpha: 0.12 });
    // A tubercle of four tiny eyes on top; they catch the lamp.
    g.circle(bx + f * 10, by - 12, 4).fill({ color: 0x8a4a38 });
    e.circle(bx + f * 9, by - 13, 1.2).fill({ color: 0xffe8c0 }).circle(bx + f * 12, by - 13, 1.2).fill({ color: 0xffe8c0 });
    gl.circle(bx + f * 10, by - 13, 6).fill({ color: 0xffd8a0, alpha: this.state === 'wander' ? 0.25 : 0.6 });
    this.light.intensity = 0;
  }
}

/** Every predator of the trench, in shared containers. */
export class DeepHunters {
  readonly view = new Container();
  readonly emissive = new Container();
  readonly glow = new Container();
  readonly list: Hunter[] = [];
  private readonly flow: FlowSample = { x: 0, y: 0, silt: 0, energy: 0 };
  private wakeDelay = 0;

  constructor(
    jaws: readonly { x: number; y: number }[],
    stalkers: readonly { x0: number; x1: number; y0: number; y1: number }[],
    spiders: readonly { x0: number; x1: number }[],
    private readonly living = false,
  ) {
    for (const j of jaws) this.list.push(new Lanternjaw(j.x, j.y, living));
    for (const s of stalkers) this.list.push(new Stalker(s, living));
    for (const s of spiders) this.list.push(new Spider(s, living));
    for (const h of this.list) {
      this.view.addChild(h.view);
      this.emissive.addChild(h.emissive);
      this.glow.addChild(h.glow);
    }
  }

  get lights(): Light[] {
    return this.list.map((h) => h.light);
  }

  points(kind: HunterKind): { x: number; y: number }[] {
    return this.list.filter((h) => h.kind === kind).map((h) => h.head());
  }

  /** A sonar pulse from (x, y): those within range back off. Returns how many were hunting. */
  scare(x: number, y: number, range: number): number {
    let n = 0;
    for (const h of this.list) if (Math.hypot(h.x - x, h.y - y) < range && h.scare()) n++;
    return n;
  }

  update(dt: number, d: DiverView, target: boolean, viewX0: number, viewX1: number, viewY0: number, viewY1: number, water?: WaterMotion): HunterEvent[] {
    const out: HunterEvent[] = [];
    this.wakeDelay = Math.max(0, this.wakeDelay - dt);
    for (const h of this.list) {
      const vis = h.x > viewX0 - 400 && h.x < viewX1 + 400 && h.y > viewY0 - 400 && h.y < viewY1 + 400;
      // Far away (more than two screens), they idle without moving to save time.
      if (!vis && Math.hypot(h.x - d.x, h.y - d.y) > 2600) {
        h.view.visible = h.emissive.visible = h.glow.visible = false;
        h.light.intensity = 0;
        continue;
      }
      h.visualFlow = vis && this.living && water ? water.sample(h.x, h.y, this.flow, true).y / 70 : 0;
      const ev = h.update(dt, d, target, vis);
      if (vis && this.living && water && !this.wakeDelay && h.wake && h.stirring && Math.hypot(h.x - d.x, h.y - d.y) < 500) {
        const crabLike = h.kind === 'spider';
        water.disturb({ x: h.wake.x, y: h.wake.y - (crabLike ? 4 : 0), vx: h.face * (crabLike ? -20 : -66), vy: crabLike ? -25 : 8,
          radius: crabLike ? 42 : 72, strength: crabLike ? 0.22 : 0.49 });
        this.wakeDelay = 0.42;
      }
      if (ev) out.push(ev);
    }
    return out;
  }
}
