import { Container, Graphics } from 'pixi.js';
import type { Light } from '../fx/lighting';
import { groundY } from '../world/terrain';

/**
 * Milestone 8: the wreck lurker, the first predator (Colin: unsettling, but
 * avoidable). A long, mottled eel-like hunter that waits in a den under
 * wreckage with only its head and a warm glowing lure showing.
 *
 * It never chases. Swim close in front of its den and it warns you first: the
 * lure flares, its eyes catch your light and it draws back. Then it lunges out
 * along a straight line and snaps. Out of reach, nothing happens. After a lunge
 * it slides back and rests for a few seconds, so a careful diver can pass.
 * Lamp off, it notices you from less far away. It ignores the sub.
 *
 * Original design: no real or game creature is copied. Its glow stays warm
 * (amber), as DESIGN.md's colour rule asks.
 */

type State = 'idle' | 'warn' | 'lunge' | 'retreat' | 'rest';

const REACH = 250;
const DETECT_LIT = 200;
const DETECT_DARK = 125;
const WARN = 0.75;
const LUNGE = 0.22;
const RETREAT = 1.1;
const REST = 3.4;
const SEGS = 16;

export class Lurker {
  readonly view = new Graphics();
  readonly emissive = new Graphics();
  readonly glow = new Graphics();
  readonly light: Light;
  state: State = 'idle';
  private t = 0;
  private ext = 0.06;
  private aimX: number;
  private aimY: number;
  private time = Math.random() * 10;
  readonly denX: number;
  readonly denY: number;

  constructor(
    x: number,
    readonly dir: number,
  ) {
    this.denX = x + dir * 10;
    this.denY = groundY(x) - 22;
    this.aimX = this.denX + dir * REACH;
    this.aimY = this.denY - 30;
    this.light = { x: this.denX, y: this.denY, radius: 110, intensity: 0.5, color: [1, 0.7, 0.35] };
  }

  /** Milestone 8 part 2: a sonar pulse sends it back into its den to rest for about 10 s. Returns true if it was out. */
  scare(): boolean {
    const was = this.state !== 'rest';
    if (this.state === 'lunge') {
      this.state = 'retreat';
      this.t = 0;
    } else if (this.state !== 'retreat') {
      this.state = 'rest';
      this.t = -6.5;
    }
    return was;
  }

  /** Where the head is now. */
  head(): { x: number; y: number } {
    const k = this.ext;
    return { x: this.denX + (this.aimX - this.denX) * k, y: this.denY + (this.aimY - this.denY) * k };
  }

  /**
   * Returns 'warn' on the frame it starts warning and 'bite' on the frame its
   * jaws close on the diver.
   */
  update(dt: number, dx: number, dy: number, lampOn: boolean, target: boolean, visible: boolean): 'warn' | 'bite' | null {
    this.time += dt;
    this.t += dt;
    let ev: 'warn' | 'bite' | null = null;
    const ddx = dx - this.denX;
    const ddy = dy - this.denY;
    const d = Math.hypot(ddx, ddy);
    const inFront = ddx * this.dir > -20;
    if (this.state === 'idle') {
      this.ext += (0.07 + 0.02 * Math.sin(this.time * 1.3) - this.ext) * Math.min(1, dt * 3);
      if (target && inFront && d < (lampOn ? DETECT_LIT : DETECT_DARK)) {
        this.state = 'warn';
        this.t = 0;
        ev = 'warn';
      }
    } else if (this.state === 'warn') {
      // It draws back into the den, then fixes on where the diver is.
      this.ext += (0.0 - this.ext) * Math.min(1, dt * 6);
      if (this.t >= WARN) {
        const L = Math.max(1, d);
        const reach = Math.min(REACH, L + 30);
        this.aimX = this.denX + (ddx / L) * reach;
        this.aimY = this.denY + (ddy / L) * reach;
        // Only forwards and a little up or down: it can't turn round in its den.
        if ((this.aimX - this.denX) * this.dir < 40) this.aimX = this.denX + this.dir * 40;
        this.aimY = Math.min(this.aimY, this.denY + 20);
        this.state = 'lunge';
        this.t = 0;
      }
    } else if (this.state === 'lunge') {
      this.ext = Math.min(1, this.t / LUNGE);
      if (this.t >= LUNGE) {
        const h = this.head();
        if (target && Math.hypot(dx - h.x, dy - h.y) < 52) ev = 'bite';
        this.state = 'retreat';
        this.t = 0;
      }
    } else if (this.state === 'retreat') {
      this.ext = 1 - this.t / RETREAT;
      if (this.t >= RETREAT) {
        this.ext = 0.05;
        this.state = 'rest';
        this.t = 0;
      }
    } else if (this.t >= REST) {
      this.state = 'idle';
      this.t = 0;
    }
    if (this.state !== 'lunge' && this.state !== 'retreat') {
      // At rest the head peeks out, looking about.
      this.aimX = this.denX + this.dir * REACH;
      this.aimY = this.denY - 30 + Math.sin(this.time * 0.4) * 20;
    }
    if (visible) this.draw();
    else this.light.intensity = 0;
    this.view.visible = this.emissive.visible = this.glow.visible = visible;
    return ev;
  }

  private draw(): void {
    const g = this.view.clear();
    const e = this.emissive.clear();
    const gl = this.glow.clear();
    const h = this.head();
    const len = Math.hypot(h.x - this.denX, h.y - this.denY);
    const ux = len > 1 ? (h.x - this.denX) / len : this.dir;
    const uy = len > 1 ? (h.y - this.denY) / len : 0;
    const nx = -uy;
    const ny = ux;
    // Body: from deep in the den out to the head, with a slow sideways wave.
    const pts: { x: number; y: number; w: number }[] = [];
    for (let i = 0; i <= SEGS; i++) {
      const f = i / SEGS;
      const along = -30 + (len + 30) * f;
      const wave = Math.sin(this.time * 3 - f * 6) * 7 * Math.sin(f * Math.PI) * (this.state === 'lunge' ? 0.3 : 1);
      pts.push({ x: this.denX + ux * along + nx * wave, y: this.denY + uy * along + ny * wave, w: 7 + 6 * Math.sin(Math.min(1, f * 1.3) * Math.PI * 0.9) });
    }
    for (let i = 0; i < SEGS; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0x3a342e, width: a.w * 2, cap: 'round' });
    }
    for (let i = 0; i < SEGS; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      // Pale belly line and dark mottling.
      g.moveTo(a.x + nx * a.w * 0.5, a.y + ny * a.w * 0.5).lineTo(b.x + nx * b.w * 0.5, b.y + ny * b.w * 0.5).stroke({ color: 0x8a8070, width: 2.2, alpha: 0.6 });
      if (i % 2 === 0) g.circle(a.x - nx * a.w * 0.3, a.y - ny * a.w * 0.3, a.w * 0.35).fill({ color: 0x1e1a18, alpha: 0.7 });
      // A row of short spines along its back.
      if (i > 2 && i % 2 === 1) g.moveTo(a.x - nx * a.w, a.y - ny * a.w).lineTo(a.x - nx * (a.w + 7) - ux * 3, a.y - ny * (a.w + 7) - uy * 3).stroke({ color: 0x5a5048, width: 1.6 });
    }
    // Head: a long wedge, jaws open while lunging.
    const open = this.state === 'lunge' ? 0.55 : this.state === 'warn' ? 0.25 : 0.06;
    const hx = h.x + ux * 6;
    const hy = h.y + uy * 6;
    const tipX = hx + ux * 26;
    const tipY = hy + uy * 26;
    g.poly([hx - nx * 12, hy - ny * 12, tipX - nx * open * 18, tipY - ny * open * 18, hx + ux * 8, hy + uy * 8]).fill({ color: 0x433b34 });
    g.poly([hx + nx * 11, hy + ny * 11, tipX + nx * open * 18, tipY + ny * open * 18, hx + ux * 8, hy + uy * 8]).fill({ color: 0x5a4e44 });
    if (open > 0.2) {
      // Needle teeth.
      for (let k = 1; k < 5; k++) {
        const f = k / 5;
        const bx = hx + (tipX - hx) * f;
        const by = hy + (tipY - hy) * f;
        const o = open * 18 * f;
        g.moveTo(bx - nx * o, by - ny * o).lineTo(bx - nx * (o - 5), by - ny * (o - 5)).stroke({ color: 0xe8e0d0, width: 1.2 });
        g.moveTo(bx + nx * o, by + ny * o).lineTo(bx + nx * (o - 5), by + ny * (o - 5)).stroke({ color: 0xe8e0d0, width: 1.2 });
      }
    }
    // Eyes: small, and they shine when it is hunting.
    const ex = hx + ux * 4 - nx * 6;
    const ey = hy + uy * 4 - ny * 6;
    const hunting = this.state === 'warn' || this.state === 'lunge';
    e.circle(ex, ey, 2.2).fill({ color: hunting ? 0xffd070 : 0x806a40, alpha: hunting ? 1 : 0.6 });
    if (hunting) gl.circle(ex, ey, 9).fill({ color: 0xffb040, alpha: 0.8 });
    // The lure: a glowing bead on a thin stalk over its head, flaring as it warns.
    const sx = hx - nx * 10 - ux * 4;
    const sy = hy - ny * 10 - uy * 4;
    const lx = sx + ux * 16 - nx * 20 + Math.sin(this.time * 2.2) * 3;
    const ly = sy + uy * 16 - ny * 20 + Math.cos(this.time * 1.7) * 3;
    g.moveTo(sx, sy).quadraticCurveTo(sx - nx * 22, sy - ny * 22, lx, ly).stroke({ color: 0x5a5048, width: 1.2 });
    const flare = this.state === 'warn' ? 1 : this.state === 'lunge' ? 0.7 : 0.45 + 0.15 * Math.sin(this.time * 2);
    e.circle(lx, ly, 3.2).fill({ color: 0xffd890 });
    gl.circle(lx, ly, 10 + 10 * flare).fill({ color: 0xffa040, alpha: 0.5 + 0.5 * flare });
    this.light.x = lx;
    this.light.y = ly;
    this.light.intensity = 0.4 + 0.9 * flare;
  }
}

/** All the lurkers on the shelf, drawn in their own containers. */
export class Lurkers {
  readonly view = new Container();
  readonly emissive = new Container();
  readonly glow = new Container();
  readonly list: Lurker[];

  constructor(dens: readonly { x: number; dir: number }[]) {
    this.list = dens.map((d) => new Lurker(d.x, d.dir));
    for (const l of this.list) {
      this.view.addChild(l.view);
      this.emissive.addChild(l.emissive);
      this.glow.addChild(l.glow);
    }
  }

  get lights(): Light[] {
    return this.list.map((l) => l.light);
  }

  update(dt: number, dx: number, dy: number, lampOn: boolean, target: boolean, viewX0: number, viewX1: number): { warn: Lurker | null; bite: Lurker | null } {
    let warn: Lurker | null = null;
    let bite: Lurker | null = null;
    for (const l of this.list) {
      const vis = l.denX > viewX0 - 400 && l.denX < viewX1 + 400;
      const ev = l.update(dt, dx, dy, lampOn, target, vis);
      if (ev === 'warn') warn = l;
      if (ev === 'bite') bite = l;
    }
    return { warn, bite };
  }
}
