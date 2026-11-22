import { BRACE, DRONE, FOE_HP, KEEPER, RIVET, TICK, resolveHit, type FoeKind, type FoeSpawn, type HitResult } from './combat';

/**
 * Phase 19: the hull keeper's machines, moving and fighting. Plain numbers
 * (no drawing), so a fight can be stepped in Node. src/interior/foeArt.ts
 * draws them and src/audio/director.ts voices the cues.
 *
 * Each machine telegraphs every attack with a pose, a glow and a sound
 * before it lands (a `cue` event goes out at the start of the tell):
 *
 *  - Rust tick: scuttles close, crouches and rattles (`tickTell`), then
 *    lunges along the floor. Jump it or brace; it lands on its back.
 *  - Weld drone: hovers out of reach, aims a sighting line that follows
 *    Kestrel and then holds still (`droneAim`), then fires a hot bolt.
 *    Armoured except while it charges (a hit interrupts it) and while its
 *    vents are open cooling down afterwards.
 *  - Hull keeper: a heavy loader behind a scoop shield. Lifts its arm
 *    (`keeperWindSlam`) and slams a shockwave along the floor (jump it), or
 *    leans back hissing (`keeperWindCharge`) and charges (brace). After
 *    either it is stuck for a moment with its core open: the only time
 *    rivets hurt it.
 */

/** Positions are in level units; y is the feet (tick, keeper) or the middle (drone). */
export interface Foe {
  id: string;
  kind: FoeKind;
  room: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  face: number;
  hp: number;
  state: string;
  /** Seconds in the current state. */
  t: number;
  homeX: number;
  homeY: number;
  onGround: boolean;
  /** 1 just after a rivet lands, fading (the hit flash). */
  flash: number;
  /** Armour pinged (sparks off the shield or shell), fading. */
  ping: number;
  /** Seconds before the next attack may start. */
  rest: number;
  /** The drone's sighting line target (world point). */
  aimX: number;
  aimY: number;
  /** The keeper alternates its attacks. */
  moves: number;
  dead: boolean;
  /** Seconds since it fell apart (for the art). */
  deadT: number;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  /** Kestrel's rivet, or a drone's bolt (a perfectly braced bolt is sent back as Kestrel's). */
  from: 'kestrel' | 'drone';
  /** A bolt sent back by a perfect brace: it always hurts the drone it hits. */
  returned?: boolean;
}

export interface Wave {
  x: number;
  y: number;
  dir: number;
  life: number;
}

/** What the level can tell the machines. */
export interface FoeWorld {
  tile: number;
  solid(x: number, y: number): boolean;
  clear(ax: number, ay: number, bx: number, by: number): boolean;
}

/** Kestrel as the machines see her (set by the interior each frame). */
export interface Hero {
  x: number;
  y: number;
  face: number;
  onGround: boolean;
  braced: boolean;
  /** Seconds since the brace was raised (a perfect brace is a fresh one). */
  braceAge: number;
  /** Seconds left of the grace after a hit (no new hits land). */
  grace: number;
}

export type FoeCue =
  | 'tickTell' | 'tickLunge' | 'tickLand'
  | 'droneAim' | 'droneFire' | 'droneCool'
  | 'keeperWindSlam' | 'keeperSlam' | 'keeperWindCharge' | 'keeperCharge' | 'keeperWall' | 'keeperOpen'
  | 'shot' | 'rivetWall' | 'ping' | 'hit' | 'down' | 'keeperDown' | 'block' | 'perfect' | 'wake';

export type FoeEvent =
  | { type: 'cue'; cue: FoeCue; x: number; y: number; kind?: FoeKind }
  | { type: 'hurt'; attack: 'lunge' | 'bolt' | 'slam' | 'charge'; result: HitResult; fromX: number; push: number };

const GRAV = 1800;

export function makeFoe(s: FoeSpawn): Foe {
  return {
    id: s.id, kind: s.kind, room: s.room, x: s.x, y: s.kind === 'drone' ? s.y - DRONE.hover : s.y, vx: 0, vy: 0, face: -1, hp: FOE_HP[s.kind],
    state: 'idle', t: 0, homeX: s.x, homeY: s.kind === 'drone' ? s.y - DRONE.hover : s.y, onGround: s.kind !== 'drone', flash: 0, ping: 0,
    rest: 0.4 + (s.x % 7) * 0.08, aimX: 0, aimY: 0, moves: 0, dead: false, deadT: 0,
  };
}

/** The box a rivet must enter to touch a foe: [x0, y0, x1, y1]. */
export function foeBox(f: Foe): [number, number, number, number] {
  if (f.kind === 'tick') return [f.x - TICK.halfW, f.y - TICK.height, f.x + TICK.halfW, f.y];
  if (f.kind === 'drone') return [f.x - DRONE.halfW, f.y - 16, f.x + DRONE.halfW, f.y + 16];
  return [f.x - KEEPER.halfW, f.y - KEEPER.height, f.x + KEEPER.halfW, f.y];
}

/** Can a rivet hurt it right now? (Otherwise it pings off armour.) */
export function vulnerable(f: Foe): boolean {
  if (f.dead) return false;
  if (f.kind === 'tick') return true;
  if (f.kind === 'drone') return f.state === 'aim' || f.state === 'cool' || f.state === 'reel';
  return f.state === 'stuck' || f.state === 'stagger';
}

const inBox = (b: [number, number, number, number], x: number, y: number, pad = 0) => x >= b[0] - pad && x <= b[2] + pad && y >= b[1] - pad && y <= b[3] + pad;

export class FoeField {
  foes: Foe[] = [];
  shots: Shot[] = [];
  waves: Wave[] = [];
  /** The room Kestrel is in (by the safe lamps), and the furthest reached this visit. */
  heroRoom = 0;
  reached = 0;
  /** Seconds since any awake foe was close (the suit mends after a while). */
  calm = 99;
  private cool = 0;
  private queued = 0;
  /** The angle of the last shot (the walker's arm follows it), and how long ago. */
  aim = 0;
  aimT = 9;

  constructor(private readonly world: FoeWorld, private readonly roomStarts: number[]) {}

  reset(spawns: FoeSpawn[], keepRoomsBefore = -1): void {
    this.foes = [...this.foes.filter((f) => f.room < keepRoomsBefore), ...spawns.map(makeFoe)];
    this.shots = [];
    this.waves = [];
    this.cool = 0;
    this.queued = 0;
  }

  /** Which room an x is in: the last safe lamp at or before it. */
  roomOf(x: number): number {
    let r = 0;
    this.roomStarts.forEach((sx, i) => {
      if (x >= sx) r = i;
    });
    return r;
  }
  private roomEnd(room: number): number {
    return this.roomStarts[room + 1] ?? Infinity;
  }

  get alive(): Foe[] {
    return this.foes.filter((f) => !f.dead);
  }

  /** Pull the trigger (a press; buffered briefly if the driver is still cycling). */
  shoot(): void {
    this.queued = RIVET.buffer;
  }

  step(dt: number, hero: Hero, ev: FoeEvent[]): void {
    const room = this.roomOf(hero.x);
    this.heroRoom = room;
    if (room > this.reached) this.reached = room;
    this.cool = Math.max(0, this.cool - dt);
    this.queued = Math.max(0, this.queued - dt);
    this.aimT += dt;
    if (this.queued > 0 && this.cool <= 0) {
      this.fire(hero, ev);
      this.queued = 0;
      this.cool = RIVET.cooldown;
    }
    let close = false;
    for (const f of this.foes) {
      f.flash = Math.max(0, f.flash - dt * 4);
      f.ping = Math.max(0, f.ping - dt * 5);
      if (f.dead) {
        f.deadT += dt;
        continue;
      }
      const awake = f.room === room;
      if (awake && f.state === 'idle') {
        f.state = f.kind === 'keeper' ? 'walk' : f.kind === 'drone' ? 'hover' : 'chase';
        f.t = 0;
        if (f.kind === 'keeper') ev.push({ type: 'cue', cue: 'wake', x: f.x, y: f.y, kind: f.kind });
      } else if (!awake && f.state !== 'idle' && !['lunge', 'charge', 'slam'].includes(f.state)) {
        f.state = 'idle';
        f.t = 0;
      }
      f.t += dt;
      f.rest = Math.max(0, f.rest - dt);
      if (f.kind === 'tick') this.tick(f, dt, hero, ev);
      else if (f.kind === 'drone') this.drone(f, dt, hero, ev);
      else this.keeper(f, dt, hero, ev);
      if (awake && Math.abs(f.x - hero.x) < 520) close = true;
    }
    this.calm = close ? 0 : this.calm + dt;
    this.moveShots(dt, hero, ev);
    this.moveWaves(dt, hero, ev);
  }

  // ---- Kestrel's rivets ----

  /** The muzzle: the forearm, in front of the chest (lower while braced). */
  muzzle(hero: Hero): { x: number; y: number } {
    return { x: hero.x + hero.face * 30, y: hero.y - (hero.braced ? 40 : 62) };
  }

  private fire(hero: Hero, ev: FoeEvent[]): void {
    const m = this.muzzle(hero);
    // Soft aim: the nearest foe ahead, within the cone and in sight.
    let best: Foe | null = null;
    let bestD = RIVET.range;
    let ang = hero.face > 0 ? 0 : Math.PI;
    for (const f of this.alive) {
      const b = foeBox(f);
      const tx = (b[0] + b[2]) / 2;
      const ty = f.kind === 'keeper' ? f.y - 70 : (b[1] + b[3]) / 2;
      const dx = tx - m.x;
      const dy = ty - m.y;
      if (dx * hero.face <= 0) continue;
      const d = Math.hypot(dx, dy);
      if (d > bestD || Math.abs(Math.atan2(dy, Math.abs(dx))) > RIVET.aimCone) continue;
      if (!this.world.clear(m.x, m.y, tx, ty)) continue;
      best = f;
      bestD = d;
      ang = Math.atan2(dy, dx);
    }
    void best;
    this.aim = ang;
    this.aimT = 0;
    this.shots.push({ x: m.x, y: m.y, vx: Math.cos(ang) * RIVET.speed, vy: Math.sin(ang) * RIVET.speed, life: RIVET.range / RIVET.speed, from: 'kestrel' });
    ev.push({ type: 'cue', cue: 'shot', x: m.x, y: m.y });
  }

  private moveShots(dt: number, hero: Hero, ev: FoeEvent[]): void {
    const keep: Shot[] = [];
    for (const s of this.shots) {
      s.life -= dt;
      let gone = s.life <= 0;
      // Sub-steps so a fast rivet can't skip through a thin foe or a crate.
      const n = Math.max(1, Math.ceil((Math.hypot(s.vx, s.vy) * dt) / 10));
      for (let k = 0; k < n && !gone; k++) {
        s.x += (s.vx * dt) / n;
        s.y += (s.vy * dt) / n;
        if (this.world.solid(s.x, s.y)) {
          gone = true;
          ev.push({ type: 'cue', cue: s.from === 'kestrel' ? 'rivetWall' : 'block', x: s.x, y: s.y });
          break;
        }
        if (s.from === 'kestrel') {
          for (const f of this.foes) {
            if (f.dead || !inBox(foeBox(f), s.x, s.y, 2)) continue;
            gone = true;
            this.rivetHits(f, s, ev);
            break;
          }
        } else if (hero.grace <= 0) {
          const h = hero.braced ? BRACE.lowHeight : BRACE.height;
          if (s.x > hero.x - 14 && s.x < hero.x + 14 && s.y > hero.y - h && s.y < hero.y) {
            const r = resolveHit({ attack: 'bolt', braced: hero.braced, braceAge: hero.braceAge, face: hero.face, fromX: s.x - s.vx * 0.05, x: hero.x });
            if (r === 'perfect') {
              // Sent straight back where it came from.
              s.vx = -s.vx * 1.15;
              s.vy = -s.vy * 1.15;
              s.from = 'kestrel';
              s.returned = true;
              s.life = 1;
              ev.push({ type: 'cue', cue: 'perfect', x: s.x, y: s.y });
            } else {
              gone = true;
              ev.push({ type: 'hurt', attack: 'bolt', result: r, fromX: s.x - s.vx * 0.05, push: r === 'hit' ? 280 : 120 });
            }
            break;
          }
        }
      }
      if (!gone) keep.push(s);
    }
    this.shots = keep;
  }

  private rivetHits(f: Foe, s: Shot, ev: FoeEvent[]): void {
    if (!vulnerable(f) && !s.returned) {
      f.ping = 1;
      ev.push({ type: 'cue', cue: 'ping', x: s.x, y: s.y, kind: f.kind });
      return;
    }
    f.hp -= RIVET.damage;
    f.flash = 1;
    if (f.kind === 'drone' && f.state === 'aim') {
      // A hit mid-charge spoils the shot and knocks it reeling.
      f.state = 'reel';
      f.t = 0;
    }
    if (f.kind === 'tick') f.vx += Math.sign(s.vx) * 90;
    if (f.hp <= 0) {
      f.dead = true;
      f.deadT = 0;
      f.vx = Math.sign(s.vx) * 120;
      ev.push({ type: 'cue', cue: f.kind === 'keeper' ? 'keeperDown' : 'down', x: f.x, y: f.y, kind: f.kind });
    } else ev.push({ type: 'cue', cue: 'hit', x: s.x, y: s.y, kind: f.kind });
  }

  // ---- Movement on the floor (ticks and the keeper) ----

  private walk(f: Foe, dt: number, halfW: number, minX: number, maxX: number): boolean {
    const T = this.world.tile;
    let blocked = false;
    const nx = f.x + f.vx * dt;
    const ahead = nx + Math.sign(f.vx) * halfW;
    if (f.vx !== 0 && (this.world.solid(ahead, f.y - 10) || nx < minX || nx > maxX)) {
      blocked = true;
      f.vx = 0;
    } else f.x = nx;
    f.vy = Math.min(900, f.vy + GRAV * dt);
    const ny = f.y + f.vy * dt;
    f.onGround = false;
    if (f.vy >= 0 && (this.world.solid(f.x - halfW * 0.6, ny) || this.world.solid(f.x + halfW * 0.6, ny))) {
      f.y = Math.floor(ny / T) * T;
      f.vy = 0;
      f.onGround = true;
    } else f.y = ny;
    return blocked;
  }

  private bounds(f: Foe, halfW: number): [number, number] {
    const T = this.world.tile;
    return [Math.max(this.roomStarts[f.room] - 2 * T, T + halfW), this.roomEnd(f.room) + 2 * T];
  }

  private tick(f: Foe, dt: number, hero: Hero, ev: FoeEvent[]): void {
    const [minX, maxX] = this.bounds(f, TICK.halfW);
    const dx = hero.x - f.x;
    switch (f.state) {
      case 'idle':
        // Scuttling about its patch, picking at the rust.
        f.vx = Math.sin(f.t * 1.3 + f.homeX) * 40;
        if (Math.abs(f.x - f.homeX) > 50) f.vx = Math.sign(f.homeX - f.x) * 40;
        break;
      case 'chase': {
        f.face = dx >= 0 ? 1 : -1;
        // It keeps its distance in the open, but comes on (and over) when a crate stands between them.
        const open = this.world.clear(f.x, f.y - 12, hero.x, hero.y - 12);
        const want = !open || Math.abs(dx) > 150 ? f.face * TICK.speed : Math.abs(dx) < 90 ? -f.face * TICK.speed * 0.6 : 0;
        f.vx += (want - f.vx) * Math.min(1, dt * 8);
        // Only lunge along a clear floor (never into a crate between them).
        if (f.rest <= 0 && Math.abs(dx) < 260 && hero.y - f.y > -50 && hero.y - f.y < 100 && f.onGround && this.world.clear(f.x, f.y - 12, hero.x, hero.y - 30)) {
          f.state = 'tell';
          f.t = 0;
          f.vx = 0;
          ev.push({ type: 'cue', cue: 'tickTell', x: f.x, y: f.y });
        }
        break;
      }
      case 'tell':
        f.vx = 0;
        if (f.t >= TICK.tell) {
          f.state = 'lunge';
          f.t = 0;
          f.vx = f.face * TICK.lungeSpeed;
          f.vy = -TICK.lungeHop;
          f.onGround = false;
          ev.push({ type: 'cue', cue: 'tickLunge', x: f.x, y: f.y });
        }
        break;
      case 'lunge':
        if (hero.grace <= 0 && Math.abs(hero.x - f.x) < TICK.halfW + 12 && hero.y > f.y - TICK.height - 4 && hero.y - (hero.braced ? BRACE.lowHeight : BRACE.height) < f.y) {
          const r = resolveHit({ attack: 'lunge', braced: hero.braced, braceAge: hero.braceAge, face: hero.face, fromX: f.x, x: hero.x });
          if (r === 'hit') ev.push({ type: 'hurt', attack: 'lunge', result: r, fromX: f.x, push: 300 });
          else {
            ev.push({ type: 'cue', cue: r === 'perfect' ? 'perfect' : 'block', x: (f.x + hero.x) / 2, y: f.y - 20 });
            ev.push({ type: 'hurt', attack: 'lunge', result: r, fromX: f.x, push: 90 });
          }
          // Bounced off: flung back onto its back (longer after a perfect brace).
          f.vx = -f.face * (r === 'perfect' ? 380 : 220);
          f.vy = -200;
          f.state = 'flipped';
          f.t = r === 'perfect' ? -BRACE.stun : 0;
          break;
        }
        if ((f.onGround && f.t > 0.12) || f.t > TICK.lunge * 2) {
          f.state = 'flipped';
          f.t = 0;
          ev.push({ type: 'cue', cue: 'tickLand', x: f.x, y: f.y });
        }
        break;
      case 'flipped':
        f.vx *= Math.max(0, 1 - dt * 5);
        if (f.t >= TICK.flipped) {
          f.state = 'chase';
          f.t = 0;
          f.rest = TICK.rest;
        }
        break;
    }
    const blocked = this.walk(f, dt, TICK.halfW, minX, maxX);
    // Chasing into a crate: it scrambles up and over.
    if (blocked && f.state === 'chase' && f.onGround) {
      f.vy = -TICK.climb;
      f.onGround = false;
    }
  }

  private drone(f: Foe, dt: number, hero: Hero, ev: FoeEvent[]): void {
    const chestY = hero.y - (hero.braced ? 32 : 58);
    const dx = hero.x - f.x;
    const bob = Math.sin(f.t * 2.2 + f.homeX) * 6;
    let wantX = f.x;
    let wantY = f.homeY + bob;
    if (f.state !== 'idle') {
      f.face = dx >= 0 ? 1 : -1;
      const dist = Math.abs(dx);
      // Keep its distance: back off when Kestrel comes close, close in when she's far.
      if (dist < DRONE.keepNear) wantX = f.x - f.face * 80;
      else if (dist > DRONE.keepFar) wantX = f.x + f.face * 80;
    } else wantX = f.homeX + Math.sin(f.t * 0.5) * 30;
    const holding = f.state === 'aim' || f.state === 'reel';
    const sp = holding ? 20 : DRONE.speed;
    const [minX, maxX] = this.bounds(f, DRONE.halfW);
    const vx = Math.max(-sp, Math.min(sp, (wantX - f.x) * 2));
    const nx = Math.max(minX, Math.min(maxX, f.x + vx * dt));
    if (!this.world.solid(nx + Math.sign(vx) * DRONE.halfW, f.y)) f.x = nx;
    f.y += (wantY - f.y) * Math.min(1, dt * 3);
    switch (f.state) {
      case 'hover':
        if (f.rest <= 0 && Math.abs(dx) < DRONE.sight && this.world.clear(f.x, f.y, hero.x, chestY)) {
          f.state = 'aim';
          f.t = 0;
          f.aimX = hero.x;
          f.aimY = chestY;
          ev.push({ type: 'cue', cue: 'droneAim', x: f.x, y: f.y });
        }
        break;
      case 'aim':
        // The sighting line follows her, then holds still for the last moment: that's the cue to move.
        if (f.t < DRONE.track) {
          f.aimX += (hero.x - f.aimX) * Math.min(1, dt * 10);
          f.aimY += (chestY - f.aimY) * Math.min(1, dt * 10);
        }
        if (f.t >= DRONE.track + DRONE.lock) {
          const a = Math.atan2(f.aimY - f.y, f.aimX - f.x);
          this.shots.push({ x: f.x + Math.cos(a) * 22, y: f.y + Math.sin(a) * 22, vx: Math.cos(a) * DRONE.boltSpeed, vy: Math.sin(a) * DRONE.boltSpeed, life: 1.6, from: 'drone' });
          ev.push({ type: 'cue', cue: 'droneFire', x: f.x, y: f.y });
          f.state = 'cool';
          f.t = 0;
          ev.push({ type: 'cue', cue: 'droneCool', x: f.x, y: f.y });
        }
        break;
      case 'cool':
        if (f.t >= DRONE.cool) {
          f.state = 'hover';
          f.t = 0;
          f.rest = DRONE.rest;
        }
        break;
      case 'reel':
        f.y += Math.sin(f.t * 30) * 0.8;
        if (f.t >= 0.8) {
          f.state = 'cool';
          f.t = DRONE.cool * 0.4;
        }
        break;
    }
  }

  private keeper(f: Foe, dt: number, hero: Hero, ev: FoeEvent[]): void {
    const [minX, maxX] = this.bounds(f, KEEPER.halfW);
    const dx = hero.x - f.x;
    const dist = Math.abs(dx);
    let blocked = false;
    switch (f.state) {
      case 'idle':
        f.vx = 0;
        break;
      case 'walk':
        f.face = dx >= 0 ? 1 : -1;
        f.vx = dist > KEEPER.slamRange * 0.8 ? f.face * KEEPER.speed : 0;
        if (f.rest <= 0) {
          const far = dist > 250 && dist < KEEPER.chargeRange;
          if (dist < KEEPER.slamRange && (f.moves % 3 !== 2 || !far)) {
            f.state = 'windSlam';
            f.t = 0;
            ev.push({ type: 'cue', cue: 'keeperWindSlam', x: f.x, y: f.y });
          } else if (far && (f.moves % 2 === 1 || f.t > 2.5)) {
            f.state = 'windCharge';
            f.t = 0;
            ev.push({ type: 'cue', cue: 'keeperWindCharge', x: f.x, y: f.y });
          }
        }
        break;
      case 'windSlam':
        f.vx = 0;
        if (f.t >= KEEPER.windSlam) {
          f.state = 'slam';
          f.t = 0;
          f.moves++;
          this.waves.push({ x: f.x + KEEPER.halfW, y: f.y, dir: 1, life: KEEPER.waveLife }, { x: f.x - KEEPER.halfW, y: f.y, dir: -1, life: KEEPER.waveLife });
          ev.push({ type: 'cue', cue: 'keeperSlam', x: f.x, y: f.y });
        }
        break;
      case 'slam':
        if (f.t >= 0.25) this.open(f, KEEPER.stuck, ev);
        break;
      case 'windCharge':
        f.vx = 0;
        f.face = dx >= 0 ? 1 : -1;
        if (f.t >= KEEPER.windCharge) {
          f.state = 'charge';
          f.t = 0;
          f.moves++;
          ev.push({ type: 'cue', cue: 'keeperCharge', x: f.x, y: f.y });
        }
        break;
      case 'charge': {
        f.vx = f.face * KEEPER.chargeSpeed;
        const h = hero.braced ? BRACE.lowHeight : BRACE.height;
        if (hero.grace <= 0 && Math.abs(hero.x - f.x) < KEEPER.halfW + 14 && hero.y > f.y - KEEPER.height && hero.y - h < f.y) {
          const r = resolveHit({ attack: 'charge', braced: hero.braced, braceAge: hero.braceAge, face: hero.face, fromX: f.x, x: hero.x });
          ev.push({ type: 'hurt', attack: 'charge', result: r, fromX: f.x, push: r === 'hit' ? 420 : 160 });
          if (r === 'hit') {
            // It ran her down: no opening this time.
            f.state = 'walk';
            f.t = 0;
            f.vx = 0;
            f.rest = KEEPER.rest * 2;
          } else {
            ev.push({ type: 'cue', cue: r === 'perfect' ? 'perfect' : 'block', x: (f.x + hero.x) / 2, y: f.y - 50 });
            f.vx = -f.face * 60;
            this.open(f, r === 'perfect' ? KEEPER.stagger + BRACE.stun : KEEPER.stagger, ev, 'stagger');
          }
          break;
        }
        if (f.t >= KEEPER.chargeMax) {
          f.state = 'walk';
          f.t = 0;
          f.rest = KEEPER.rest;
        }
        break;
      }
      case 'stuck':
      case 'stagger':
        f.vx *= Math.max(0, 1 - dt * 6);
        if (f.t >= f.aimX) {
          f.state = 'walk';
          f.t = 0;
          f.rest = KEEPER.rest;
        }
        break;
    }
    blocked = this.walk(f, dt, KEEPER.halfW, minX, maxX);
    if (blocked && f.state === 'charge') {
      // Straight into the bulkhead: dazed, core open.
      ev.push({ type: 'cue', cue: 'keeperWall', x: f.x + f.face * KEEPER.halfW, y: f.y - 60 });
      this.open(f, KEEPER.stuck, ev);
    }
    // Walking into it just shoves Kestrel aside (no harm).
    if (f.state !== 'charge' && hero.grace <= 0 && Math.abs(hero.x - f.x) < KEEPER.halfW && hero.y > f.y - KEEPER.height) {
      hero.x = f.x + (hero.x >= f.x ? 1 : -1) * (KEEPER.halfW + 1);
    }
  }

  /** The keeper's core opens for `secs` (the time is kept in aimX: the keeper never aims). */
  private open(f: Foe, secs: number, ev: FoeEvent[], state: 'stuck' | 'stagger' = 'stuck'): void {
    f.state = state;
    f.t = 0;
    f.aimX = secs;
    ev.push({ type: 'cue', cue: 'keeperOpen', x: f.x, y: f.y });
  }

  private moveWaves(dt: number, hero: Hero, ev: FoeEvent[]): void {
    const keep: Wave[] = [];
    for (const w of this.waves) {
      w.life -= dt;
      const nx = w.x + w.dir * KEEPER.waveSpeed * dt;
      // A wave runs along the floor until a wall or the edge of the floor stops it.
      if (w.life <= 0 || this.world.solid(nx, w.y - 10) || !this.world.solid(nx, w.y + 4)) continue;
      w.x = nx;
      if (hero.grace <= 0 && Math.abs(hero.x - w.x) < 18 && hero.y > w.y - KEEPER.waveHeight && hero.y <= w.y + 2) {
        ev.push({ type: 'hurt', attack: 'slam', result: 'hit', fromX: w.x - w.dir * 30, push: 260 });
        continue;
      }
      keep.push(w);
    }
    this.waves = keep;
  }
}
