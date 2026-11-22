import type { Graphics } from 'pixi.js';
import type { Light } from '../fx/lighting';
import type { Walker } from '../actors/walker';
import { HURT_GRACE, KEEPER, foesFor, type FoeKind, type FoeSpawn, type HitResult, type SectionSave } from '../game/combat';
import { FoeField, type FoeCue, type FoeEvent, type Hero } from '../game/foes';
import { drawFoe } from './foeArt';
import type { Interior, InteriorCombat, InteriorEvent, InteriorInput } from './interior';

/**
 * Phase 19: a fight in an infested wreck section, plugged into the interior
 * (`InteriorOptions.combat`). It owns the machines (src/game/foes.ts), the
 * brace (hold Down behind the guard plate), the rivets, the safe lamps, and
 * the sparks and scrap that fly. main.ts hears about everything through
 * `CombatHooks` (sounds, the suit, reward moments) and calls `shoot()` when
 * the Shoot action is pressed.
 */

export interface CombatHooks {
  cue(c: FoeCue, x: number, y: number, kind?: FoeKind): void;
  /** An attack reached Kestrel (blocked ones too; only 'hit' costs suit). */
  hurt(attack: 'lunge' | 'bolt' | 'slam' | 'charge', result: HitResult): void;
  /** A safe lamp lit for the first time this visit. */
  lamp(index: number): void;
  keeperBeaten(): void;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: number;
  size: number;
  /** Scrap chunks are lit (they're metal); sparks glow. */
  chunk: boolean;
}

const LIME = 0xc6f03a;
const GOLD = 0xffc23a;
const RED = 0xff3a22;

export class CombatLayer implements InteriorCombat {
  readonly field: FoeField;
  braced = false;
  braceAge = 0;
  grace = 0;
  /** The weapon is owned (bracing needs its guard plate). */
  armed = true;
  private lit: boolean[];
  private sparks: Spark[] = [];
  private flashT = 0;
  private flashAt = { x: 0, y: 0 };
  private time = 0;

  constructor(
    private readonly interior: Interior,
    private readonly layout: { lamps: { x: number; y: number; room: number }[]; roomStarts: number[]; spawns: FoeSpawn[]; door: { x: number; y: number } },
    private readonly section: () => SectionSave | undefined,
    private readonly hooks: CombatHooks,
  ) {
    this.field = new FoeField({ tile: 40, solid: (x, y) => interior.solidAt(x, y), clear: (ax, ay, bx, by) => interior.lineClear(ax, ay, bx, by) }, layout.roomStarts);
    this.lit = layout.lamps.map(() => false);
    this.begin();
  }

  /** A fresh visit: every small machine is back, the keeper too unless beaten; no lamps lit yet. */
  begin(): void {
    this.field.reset(foesFor(this.layout.spawns, this.section()));
    this.field.reached = 0;
    this.lit = this.layout.lamps.map(() => false);
    this.sparks = [];
    this.grace = 0;
    this.braced = false;
  }

  /** After a blackout: the rooms from the safe lamp on fill again; the ones behind stay as they were. */
  wake(): { x: number; y: number } {
    const reached = this.field.reached;
    const lamp = [...this.layout.lamps].filter((l) => l.room <= reached).sort((a, b) => b.room - a.room)[0];
    const room = lamp?.room ?? 0;
    this.field.reset(foesFor(this.layout.spawns, this.section(), room), room);
    this.sparks = [];
    this.grace = 1.5;
    return lamp ? { x: lamp.x, y: lamp.y } : this.layout.door;
  }

  shoot(): void {
    if (this.armed) this.field.shoot();
  }

  steer(inp: InteriorInput, w: Walker, dt: number): InteriorInput {
    this.time += dt;
    const want = this.armed && inp.moveY > 0.5 && w.onGround && !inp.jump;
    if (want && !this.braced) this.braceAge = 0;
    this.braced = want;
    if (want) this.braceAge += dt;
    w.guard += ((want ? 1 : 0) - w.guard) * Math.min(1, dt * (want ? 16 : 9));
    if (!want) return inp;
    // Braced: planted where she stands; she can still turn to face the other way.
    if (Math.abs(inp.moveX) > 0.15) w.face = inp.moveX > 0 ? 1 : -1;
    return { ...inp, moveX: 0, sprint: false };
  }

  step(dt: number, w: Walker, ev: InteriorEvent[]): void {
    void ev;
    this.grace = Math.max(0, this.grace - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    const hero: Hero = { x: w.x, y: w.y, face: w.face, onGround: w.onGround, braced: this.braced, braceAge: this.braceAge, grace: this.grace };
    const fev: FoeEvent[] = [];
    this.field.step(dt, hero, fev);
    // The keeper shoved her aside as it walked into her.
    if (hero.x !== w.x && this.interior.standable(hero.x, w.y)) w.x = hero.x;
    for (const e of fev) {
      if (e.type === 'hurt') {
        const dir = w.x >= e.fromX ? 1 : -1;
        if (e.result === 'hit') {
          this.grace = HURT_GRACE;
          w.vx = dir * e.push;
          w.vy = -Math.min(380, e.push * 0.75);
          w.onGround = false;
          this.burst(w.x, w.y - 50, 10, RED, 260);
        } else {
          w.vx = dir * e.push;
          this.burst(w.x + w.face * 18, w.y - (this.braced ? 36 : 58), e.result === 'perfect' ? 16 : 8, e.result === 'perfect' ? LIME : GOLD, 320);
        }
        this.hooks.hurt(e.attack, e.result);
      } else {
        this.cueFx(e.cue, e.x, e.y, e.kind, w);
        this.hooks.cue(e.cue, e.x, e.y, e.kind);
        if (e.cue === 'keeperDown') this.hooks.keeperBeaten();
      }
    }
    // Safe lamps light as she passes.
    this.layout.lamps.forEach((l, i) => {
      if (!this.lit[i] && Math.abs(w.x - l.x) < 50) {
        this.lit[i] = true;
        if (i > 0) this.hooks.lamp(i);
      }
    });
    // The arm follows the last shot for a moment.
    const aimingNow = this.field.aimT < 0.35;
    if (aimingNow) w.aim = this.field.aim;
    w.aiming += ((aimingNow ? 1 : 0) - w.aiming) * Math.min(1, dt * (aimingNow ? 30 : 8));
    if (aimingNow) w.face = Math.cos(this.field.aim) >= 0 ? 1 : -1;
    // A flicker while she can't be hit.
    w.view.alpha = this.grace > 0 ? (Math.sin(this.time * 38) > 0 ? 0.45 : 1) : 1;
    // Sparks and scrap.
    const keep: Spark[] = [];
    for (const s of this.sparks) {
      s.life -= dt;
      if (s.life <= 0) continue;
      s.vy += (s.chunk ? 1400 : 900) * dt;
      const nx = s.x + s.vx * dt;
      const ny = s.y + s.vy * dt;
      if (s.chunk && this.interior.solidAt(nx, ny)) {
        s.vy *= -0.35;
        s.vx *= 0.6;
      } else {
        s.x = nx;
        s.y = ny;
      }
      keep.push(s);
    }
    this.sparks = keep;
  }

  private burst(x: number, y: number, n: number, color: number, speed: number, chunks = 0, chunkColor = 0x5a3a28): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, life: 0.25 + Math.random() * 0.3, max: 0.55, color, size: 1.4 + Math.random(), chunk: false });
    }
    for (let i = 0; i < chunks; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const v = 160 + Math.random() * 260;
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.4 + Math.random() * 0.8, max: 2.2, color: Math.random() < 0.5 ? chunkColor : 0x4a4642, size: 3 + Math.random() * 4, chunk: true });
    }
  }

  private cueFx(c: FoeCue, x: number, y: number, kind: FoeKind | undefined, w: Walker): void {
    switch (c) {
      case 'shot':
        this.flashT = 0.07;
        this.flashAt = { x, y };
        w.kick = 4;
        break;
      case 'rivetWall':
        this.burst(x, y, 7, GOLD, 220);
        break;
      case 'ping':
        this.burst(x, y, 6, 0xffffff, 260);
        break;
      case 'hit':
        this.burst(x, y, 10, GOLD, 300, 2);
        break;
      case 'block':
        this.burst(x, y, 8, GOLD, 240);
        break;
      case 'perfect':
        this.burst(x, y, 18, LIME, 360);
        break;
      case 'down':
        this.burst(x, y - (kind === 'drone' ? 0 : 12), 18, GOLD, 320, kind === 'drone' ? 7 : 6);
        break;
      case 'keeperDown':
        this.burst(x, y - 60, 30, GOLD, 380, 14);
        break;
      case 'keeperSlam':
        this.burst(x - KEEPER.halfW, y - 4, 10, 0xc8b8a0, 200, 3, 0x3a3230);
        this.burst(x + KEEPER.halfW, y - 4, 10, 0xc8b8a0, 200, 3, 0x3a3230);
        break;
      case 'keeperWall':
        this.burst(x, y, 16, GOLD, 300, 4);
        break;
      case 'tickLand':
        this.burst(x, y - 4, 4, 0xc8b8a0, 120);
        break;
    }
  }

  draw(back: Graphics, front: Graphics, em: Graphics, glow: Graphics, time: number): void {
    void front;
    // The keeper store's shutter: down and rusted until the keeper is beaten, then raised.
    this.drawShutter(back, em, glow);
    // Safe lamps: dim amber, then lime once passed.
    this.layout.lamps.forEach((l, i) => {
      const lx = l.x;
      const ly = l.y - 3 * 40 + 8;
      if (this.lit[i]) {
        em.roundRect(lx - 7, ly - 10, 14, 18, 4).fill({ color: LIME, alpha: 0.9 });
        glow.circle(lx, ly, 34 + Math.sin(time * 2 + i) * 3).fill({ color: LIME, alpha: 0.35 });
      } else em.roundRect(lx - 7, ly - 10, 14, 18, 4).fill({ color: 0x8a6a2a, alpha: 0.45 });
    });
    for (const f of this.field.foes) drawFoe(f, back, em, glow, time);
    // Shockwaves: a rolling ridge of dust and a hot line along the floor.
    for (const wv of this.field.waves) {
      const k = wv.life / KEEPER.waveLife;
      back.moveTo(wv.x - wv.dir * 30, wv.y).quadraticCurveTo(wv.x - wv.dir * 4, wv.y - 34 * k, wv.x + wv.dir * 6, wv.y).closePath().fill({ color: 0xb8a890, alpha: 0.55 * k });
      em.moveTo(wv.x - wv.dir * 40, wv.y - 1).lineTo(wv.x + wv.dir * 6, wv.y - 1).stroke({ color: GOLD, width: 3, alpha: 0.8 * k });
      glow.ellipse(wv.x, wv.y - 8, 26, 12).fill({ color: 0xff8a2a, alpha: 0.4 * k });
    }
    // Rivets (gold, hot) and bolts (red-hot), with short trails.
    for (const s of this.field.shots) {
      const sp = Math.hypot(s.vx, s.vy) || 1;
      const ux = s.vx / sp;
      const uy = s.vy / sp;
      const mine = s.from === 'kestrel';
      const col = mine ? (s.returned ? LIME : GOLD) : RED;
      em.moveTo(s.x - ux * (mine ? 18 : 24), s.y - uy * (mine ? 18 : 24)).lineTo(s.x, s.y).stroke({ color: col, width: mine ? 2.6 : 3.6, alpha: 0.95, cap: 'round' });
      em.circle(s.x, s.y, mine ? 2.2 : 3.4).fill({ color: 0xfff4d8 });
      glow.circle(s.x, s.y, mine ? 10 : 16).fill({ color: col, alpha: 0.45 });
    }
    if (this.flashT > 0) {
      const k = this.flashT / 0.07;
      em.circle(this.flashAt.x, this.flashAt.y, 7 * k + 3).fill({ color: LIME, alpha: 0.9 * k });
      glow.circle(this.flashAt.x, this.flashAt.y, 26 * k).fill({ color: LIME, alpha: 0.5 * k });
    }
    for (const s of this.sparks) {
      const a = Math.min(1, s.life / (s.max * 0.5));
      if (s.chunk) back.rect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size * 0.7).fill({ color: s.color, alpha: a });
      else em.moveTo(s.x, s.y).lineTo(s.x - s.vx * 0.02, s.y - s.vy * 0.02).stroke({ color: s.color, width: s.size, alpha: a });
    }
  }

  private drawShutter(g: Graphics, em: Graphics, glow: Graphics): void {
    const open = !!this.section()?.taken.includes('k');
    const x = 63 * 40;
    const top = 8 * 40;
    const bottom = 11 * 40;
    if (open) {
      g.rect(x + 2, top - 6, 36, 10).fill({ color: 0x4a4440 });
      g.rect(x + 2, top + 2, 36, 3).fill({ color: 0xa8822e, alpha: 0.6 });
      em.circle(x + 20, top - 14, 3).fill({ color: LIME, alpha: 0.9 });
      return;
    }
    g.rect(x + 2, top, 36, bottom - top).fill({ color: 0x4a4440 });
    for (let yy = top + 8; yy < bottom; yy += 12) g.rect(x + 2, yy, 36, 3).fill({ color: 0x2a2826 });
    g.rect(x + 8, top + 30, 5, 50).fill({ color: 0x7a3e22, alpha: 0.5 });
    em.circle(x + 20, top - 14, 3).fill({ color: RED, alpha: 0.9 });
    glow.circle(x + 20, top - 14, 12).fill({ color: RED, alpha: 0.3 });
  }

  lights(): Light[] {
    const out: Light[] = [];
    if (this.flashT > 0) out.push({ x: this.flashAt.x, y: this.flashAt.y, radius: 220, intensity: 1.4 * (this.flashT / 0.07), color: [0.8, 1, 0.4], haze: 0.05 });
    for (const f of this.field.foes) {
      if (f.dead) continue;
      if (f.kind === 'keeper' && (f.state === 'stuck' || f.state === 'stagger')) out.push({ x: f.x, y: f.y - 70, radius: 260, intensity: 1.1, color: [1, 0.62, 0.22], haze: 0.06 });
      if (f.kind === 'drone' && f.state === 'aim') out.push({ x: f.x, y: f.y + 20, radius: 160, intensity: 0.8, color: [1, 0.7, 0.3], haze: 0.05 });
    }
    this.layout.lamps.forEach((l, i) => {
      if (this.lit[i]) out.push({ x: l.x, y: l.y - 110, radius: 280, intensity: 0.7, color: [0.78, 0.95, 0.4], haze: 0.04 });
    });
    return out.slice(0, 6);
  }
}
