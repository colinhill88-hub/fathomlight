import { Application, Container, Graphics, Point } from 'pixi.js';
import { Walker } from '../actors/walker';
import { WalkerOld } from './walker_old';

const OLD = new URLSearchParams(location.search).has('old');
import { Diver } from '../actors/diver';
import { ACCEL_AIR, ACCEL_GROUND, CLIMB, GRAVITY, JUMP_V, MAX_FALL, WALK } from '../interior/interior';

/**
 * The walker's half of the animation lab (character animation session B):
 * animlab.html?walker. The explorer on foot runs a fixed script of inputs
 * through a copy of the interior's own movement rules (the same speeds,
 * acceleration, gravity, jump, grapple hang and ladder climb), on a tiled
 * floor that scrolls under them, so a sliding foot shows at once against
 * the tile seams. Gameplay scale (560 world units to the screen height, as
 * in the Corvina and the base) on the left, 3x close up on the right.
 *
 * animlab.html?compare stands the diver and the walker side by side at the
 * same scale.
 */

interface WSeg {
  name: string;
  t: number;
  /** Stick, -1..1. */
  x: number;
  /** Jump held for this segment (pressed at its start). */
  jump?: boolean;
  /** Standing on a ledge this high, with its edge just ahead. */
  ledge?: number;
  /** Fire the grapple at a ring above and ahead, then hang from it. */
  hang?: boolean;
  /** Hanging: jump to swing off. */
  swingOff?: boolean;
  /** On a ladder: -1 up, 1 down, 0 holding on. */
  climb?: number;
  /** Hold Collect at a console (the interior's hold actions). */
  work?: boolean;
}

export const WALK_SCRIPT: WSeg[] = [
  { name: 'standing', t: 6, x: 0 },
  { name: 'slow walk (stick 0.3)', t: 4, x: 0.3 },
  { name: 'walk (stick 0.6)', t: 3.5, x: 0.6 },
  { name: 'full speed', t: 3, x: 1 },
  { name: 'stop', t: 2.5, x: 0 },
  { name: 'set off and turn', t: 1.2, x: 1 },
  { name: 'turn around (walking)', t: 3, x: -1 },
  { name: 'stop', t: 2, x: 0 },
  { name: 'turn on the spot', t: 0.25, x: 0.3 },
  { name: 'standing (after a turn)', t: 2, x: 0 },
  { name: 'jump from standing', t: 1.6, x: 0, jump: true },
  { name: 'short hop (tap)', t: 1.2, x: 0, jump: false },
  { name: 'running jump', t: 1.0, x: 1 },
  { name: 'running jump: take-off', t: 1.4, x: 1, jump: true },
  { name: 'stop', t: 1.6, x: 0 },
  { name: 'on a ledge', t: 1.2, x: 0, ledge: 280 },
  { name: 'walk off the ledge: fall, land', t: 2.6, x: 0.5, ledge: 280 },
  { name: 'standing', t: 1.2, x: 0 },
  { name: 'grapple: fire, reel in, hang', t: 3.5, x: 0, hang: true },
  { name: 'hang: turn', t: 1.0, x: -0.4, hang: true },
  { name: 'hang: swing off, fall, land', t: 2.4, x: 0, swingOff: true },
  { name: 'ladder: climb up', t: 1.6, x: 0, climb: -1 },
  { name: 'ladder: hold on', t: 1.2, x: 0, climb: 0 },
  { name: 'ladder: climb down, step off', t: 2.2, x: 0, climb: 1 },
  { name: 'work at a console (hold Collect)', t: 3, x: 0, work: true },
  { name: 'standing', t: 3, x: 0 },
];

const HANG_DROP = 8 + 84 + 22;

/** A copy of the interior's movement rules on an endless flat floor (y = 0), plus a ledge, a grapple ring and a ladder. */
class Sim {
  readonly w = (OLD ? new WalkerOld() : new Walker()) as Walker;
  readonly world = new Container();
  private g = new Graphics();
  mode: 'walk' | 'fly' | 'pull' | 'hang' | 'climb' = 'walk';
  ledge: { x: number; h: number; dir: number } | null = null;
  ring: { x: number; y: number } | null = null;
  ladderX: number | null = null;
  private t = 0;
  private flyT = 0;

  constructor() {
    this.world.addChild(this.g, this.w.view, this.w.lens);
    this.w.visor = this.w.visorTarget = 1;
    this.w.onGround = true;
  }

  private floorAt(x: number): number {
    const l = this.ledge;
    return l && (x - l.x) * l.dir < 0 ? -l.h : 0;
  }

  start(s: WSeg, prev: WSeg | null): void {
    const w = this.w;
    if (s.ledge && !prev?.ledge) {
      w.y = -s.ledge;
      w.vx = w.vy = 0;
      this.ledge = { x: w.x + w.face * 70, h: s.ledge, dir: w.face };
    }
    if (!s.ledge && this.ledge && w.onGround && w.y === 0) this.ledge = null;
    if (s.jump && w.onGround) w.vy = -JUMP_V;
    if (s.hang && !prev?.hang) {
      this.ring = { x: w.x + w.face * 110, y: w.y - 300 };
      this.mode = 'fly';
      this.flyT = 0;
    }
    if (s.swingOff && this.mode === 'hang') {
      this.mode = 'walk';
      w.vy = -560;
      w.vx = w.face * 330;
    }
    if (s.climb !== undefined && this.mode !== 'climb') {
      this.mode = 'climb';
      this.ladderX = w.x;
      w.vx = 0;
    }
  }

  step(dt: number, s: WSeg): void {
    const w = this.w;
    this.t += dt;
    if (!s.hang && !s.swingOff && this.mode !== 'hang') this.ring = null;
    w.working = s.work ? 1 : 0;
    if (this.mode === 'fly' || this.mode === 'pull' || this.mode === 'hang') {
      const r = this.ring!;
      const hx = r.x;
      const hy = r.y + HANG_DROP;
      w.onGround = false;
      w.pose = this.mode === 'fly' ? 'jump' : 'hang';
      if (this.mode === 'fly') {
        // As in the game: the hook flies for 0.15 s while gravity carries on.
        this.flyT += dt;
        w.vy = Math.min(MAX_FALL, w.vy + GRAVITY * dt);
        w.y = Math.min(this.floorAt(w.x), w.y + w.vy * dt);
        if (this.flyT >= 0.15) this.mode = 'pull';
      } else if (this.mode === 'pull') {
        const dx = hx - w.x;
        const dy = hy - w.y;
        const d = Math.hypot(dx, dy);
        const st = Math.min(d, 760 * dt);
        w.vx = (dx / Math.max(1, d)) * 380;
        w.vy = (dy / Math.max(1, d)) * 380;
        w.x += (dx / Math.max(1, d)) * st;
        w.y += (dy / Math.max(1, d)) * st;
        if (d < 8) this.mode = 'hang';
      } else {
        w.x += (hx + Math.sin(this.t * 2.4) * 3 - w.x) * Math.min(1, dt * 8);
        w.y = hy;
        w.vx = w.vy = 0;
        if (Math.abs(s.x) > 0.15) w.face = s.x > 0 ? 1 : -1;
      }
      w.hangTo = { x: r.x, y: r.y };
      return;
    }
    w.hangTo = null;
    if (this.mode === 'climb') {
      const dir = s.climb ?? 0;
      w.vx = 0;
      w.vy = dir * CLIMB;
      w.pose = 'climb';
      w.onGround = false;
      w.climbPhase += (w.vy * dt) / 26;
      w.y += w.vy * dt;
      if (w.y >= 0 && dir > 0) {
        w.y = 0;
        this.mode = 'walk';
        w.onGround = true;
        w.pose = 'stand';
      }
      if (s.climb === undefined) this.mode = 'walk';
      return;
    }
    if (this.ladderX !== null && s.climb === undefined && w.onGround) this.ladderX = null;
    // The interior's updateWalk, without walls.
    const target = s.x * WALK;
    const a = w.onGround ? ACCEL_GROUND : ACCEL_AIR;
    if (Math.abs(target - w.vx) < a * dt) w.vx = target;
    else w.vx += Math.sign(target - w.vx) * a * dt;
    if (Math.abs(s.x) > 0.15) w.face = s.x > 0 ? 1 : -1;
    if (!s.jump && w.vy < -260) w.vy += GRAVITY * 1.6 * dt;
    w.vy = Math.min(MAX_FALL, w.vy + GRAVITY * dt);
    w.x += w.vx * dt;
    w.y += w.vy * dt;
    const f = this.floorAt(w.x);
    w.onGround = false;
    if (w.vy > 0 && w.y >= f) {
      w.y = f;
      w.vy = 0;
      w.onGround = true;
    }
    w.pose = !w.onGround ? (w.vy < 0 ? 'jump' : 'fall') : Math.abs(w.vx) > 20 ? 'walk' : 'stand';
  }

  /** The floor (tiled, so a sliding foot shows against the seams), the ledge, the ring and the ladder around x. */
  drawWorld(half: number): void {
    const g = this.g.clear();
    const x0 = this.w.x - half;
    const x1 = this.w.x + half;
    g.rect(x0, 0, x1 - x0, 60).fill({ color: 0x2a3438 });
    g.rect(x0, 0, x1 - x0, 3).fill({ color: 0x8a9aa0 });
    for (let tx = Math.floor(x0 / 40) * 40; tx < x1; tx += 40) {
      g.rect(tx, 0, 1.5, 40).fill({ color: 0x141a1c });
      g.rect(tx + 18, 2, 4, 3).fill({ color: 0xc9a13a, alpha: 0.6 });
    }
    const l = this.ledge;
    if (l) {
      const lx = l.dir > 0 ? Math.min(x0, l.x - 2000) : l.x;
      g.rect(lx, -l.h, 2000, l.h).fill({ color: 0x323e43 });
      g.rect(lx, -l.h, 2000, 3).fill({ color: 0x8a9aa0 });
    }
    if (this.ring) {
      g.circle(this.ring.x, this.ring.y, 7).stroke({ color: 0xffc860, width: 3 });
      const w = this.w;
      if (this.mode === 'pull' || this.mode === 'hang') g.moveTo(w.hand().x, w.hand().y).lineTo(this.ring.x, this.ring.y).stroke({ color: 0xd8c890, width: 1.5 });
    }
    if (this.ladderX !== null) {
      const lx = this.ladderX;
      g.rect(lx - 14, -420, 3, 420).fill({ color: 0x7a868a });
      g.rect(lx + 11, -420, 3, 420).fill({ color: 0x7a868a });
      for (let y = -20; y > -420; y -= 26) g.rect(lx - 14, y, 28, 2.5).fill({ color: 0x9aa6aa });
    }
  }
}

export async function walkerLab(app: Application, params: URLSearchParams): Promise<void> {
  const hud = document.getElementById('hud')!;
  if (params.has('compare')) return compare(app, hud);
  const manual = params.has('manual');
  const frozen = params.has('frozen');

  const panes: { sim: Sim; cam: Container; zoom: () => number; cx: () => number; half: () => number; camY: number }[] = [];
  const mk = (zoom: () => number, cx: () => number, half: () => number) => {
    const cam = new Container();
    const sim = new Sim();
    cam.addChild(sim.world);
    app.stage.addChild(cam);
    panes.push({ sim, cam, zoom, cx, half, camY: -60 });
  };
  // Gameplay scale: the interiors fit 560 world units to the screen height.
  mk(() => app.screen.height / 560, () => app.screen.width * 0.2, () => (app.screen.width * 0.2) / (app.screen.height / 560));
  mk(() => (app.screen.height / 560) * 3, () => app.screen.width * 0.66, () => (app.screen.width * 0.26) / ((app.screen.height / 560) * 3));
  const divider = new Graphics();
  app.stage.addChild(divider);

  const keys = new Set<string>();
  let paused = false;
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!e.repeat && k === 'p') paused = !paused;
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('pointerdown', () => (paused = !paused));

  const total = WALK_SCRIPT.reduce((a, s) => a + s.t, 0);
  let clock = 0;
  const seg0 = Number(params.get('seg') ?? 0);
  for (let i = 0; i < seg0 && i < WALK_SCRIPT.length; i++) clock += WALK_SCRIPT[i].t;
  let lastSeg = -1;
  let label = '';
  const manualSeg: WSeg = { name: 'manual', t: 1, x: 0 };

  const tick = (dt: number) => {
    let s: WSeg = manualSeg;
    let changed = false;
    let prev: WSeg | null = null;
    if (!manual) {
      if (!paused) clock = (clock + dt) % total;
      let t = clock;
      let i = 0;
      while (t > WALK_SCRIPT[i].t) t -= WALK_SCRIPT[i++].t;
      s = WALK_SCRIPT[i];
      changed = i !== lastSeg;
      prev = lastSeg >= 0 ? WALK_SCRIPT[lastSeg] : null;
      lastSeg = i;
      label = `${i}: ${s.name}`;
    }
    const kx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    const jumpKey = keys.has(' ') || keys.has('shift') || keys.has('w') || keys.has('arrowup');
    if (kx || jumpKey || manual) {
      manualSeg.x = kx;
      const was = manualSeg.jump;
      manualSeg.jump = jumpKey;
      s = manualSeg;
      changed = jumpKey && !was;
    }
    for (const p of panes) {
      if (changed) p.sim.start(s, prev);
      p.sim.step(dt, s);
      p.sim.w.animate(dt);
      const z = p.zoom();
      p.cam.scale.set(z);
      // Follow x exactly (the floor's seams show any sliding); y eases like the game's camera.
      p.camY += (p.sim.w.y - 60 - p.camY) * Math.min(1, dt * 5);
      p.cam.position.set(p.cx() - p.sim.w.x * z, app.screen.height * 0.55 - p.camY * z);
      p.sim.drawWorld(p.half());
    }
    divider.clear().rect(app.screen.width * 0.4 - 1, 0, 2, app.screen.height).fill({ color: 0x000000, alpha: 0.5 });
    const w = panes[0].sim.w;
    hud.textContent = `${label}\nspeed ${Math.abs(w.vx).toFixed(0)}  pose ${w.pose}  facing ${w.face}`;
  };

  const lab = {
    walker: panes[0].sim.w,
    /** For measuring: force how Pixi batches the walker's pieces ('auto', 'batch' or 'no-batch'). Returns the piece and vertex counts. */
    batchMode(mode: 'auto' | 'batch' | 'no-batch') {
      let n = 0;
      let verts = 0;
      const visit = (c: Container) => {
        if (c instanceof Graphics) {
          c.context.batchMode = mode;
          c.context.dirty = true;
          (c.context as unknown as { onUpdate(): void }).onUpdate();
          n++;
          for (const inst of c.context.instructions) verts += (inst.data as { path?: { shapePath?: { shapePrimitives?: unknown[] } } })?.path?.shapePath?.shapePrimitives?.length ?? 0;
        }
        for (const ch of c.children) visit(ch);
      };
      for (const p of panes) visit(p.sim.w.view);
      return { pieces: n / panes.length, shapes: verts / panes.length };
    },
    /**
     * Foot contact check: runs the script for `sec` seconds and, for every
     * stretch a foot is planted on the floor, measures how far its drawn ankle
     * moves in the world (should be ~0: no sliding), and how far any drawn
     * ankle ends up from where the animation wanted it (the legs reaching).
     */
    footCheck(sec: number, trace?: string[]) {
      const w = panes[0].sim.w as unknown as {
        feet: { planted: boolean; ax: number; ay: number; roll: number }[];
        nearLeg: { foot: Container };
        farLeg: { foot: Container };
        mode: string;
      };
      const cam = panes[0].cam;
      const drift: Record<string, number> = {};
      let maxReach = 0;
      // Per foot: the heel's and the ball's world point when they took the floor.
      const heel: ({ x: number; y: number } | null)[] = [null, null];
      const ball: ({ x: number; y: number } | null)[] = [null, null];
      let worst = 0;
      let worstSeg = '';
      const P = new Point();
      const pt = (c: Container, x: number, y: number) => cam.toLocal(c.toGlobal(P.set(x, y)));
      const reach: Record<string, number> = {};
      let lastY = panes[0].sim.w.y;
      for (let k = 0; k < Math.round(sec * 60); k++) {
        tick(1 / 60);
        const sim = panes[0].sim.w;
        // The lab lifts the walker onto its ledge in one frame: not a slide.
        if (Math.abs(sim.y - lastY) > 50) heel[0] = heel[1] = ball[0] = ball[1] = null;
        lastY = sim.y;
        for (let i = 0; i < 2; i++) {
          const f = w.feet[i];
          const piece = i === 0 ? w.nearLeg.foot : w.farLeg.foot;
          const a = pt(piece, 0, 0);
          const re = Math.hypot(a.x - (sim.x + f.ax * sim.view.scale.x), a.y - (sim.y + f.ay));
          maxReach = Math.max(maxReach, re);
          reach[label] = Math.max(reach[label] ?? 0, re);
          if (trace && re > 3 && trace.length < 400) trace.push(`R ${k} ${label} foot${i} err${re.toFixed(1)} planted${f.planted} ax${f.ax.toFixed(1)},${f.ay.toFixed(1)} roll${f.roll.toFixed(2)} vx${sim.vx.toFixed(0)}`);
          const onFloor = w.mode === 'ground' && f.planted && sim.onGround && Math.abs(sim.view.scale.x) > 0.99;
          const h = pt(piece, -5.5, 5);
          const b = pt(piece, 8, 5);
          const heelDown = onFloor && f.roll <= 0.01;
          const ballDown = onFloor && f.roll >= -0.01;
          let d = 0;
          if (Math.abs(sim.y - lastY) > 50) d = 0;
          if (heelDown) {
            heel[i] ??= { x: h.x, y: h.y };
            d = Math.max(d, Math.hypot(h.x - heel[i]!.x, h.y - heel[i]!.y));
          } else heel[i] = null;
          if (ballDown) {
            ball[i] ??= { x: b.x, y: b.y };
            d = Math.max(d, Math.hypot(b.x - ball[i]!.x, b.y - ball[i]!.y));
          } else ball[i] = null;
          if (d > (drift[label] ?? 0) + 0.3 && trace) trace.push(`${k} ${label} foot${i} d${d.toFixed(2)} roll${f.roll.toFixed(2)} ax${f.ax.toFixed(1)},${f.ay.toFixed(1)} vx${sim.vx.toFixed(0)}`);
          drift[label] = Math.max(drift[label] ?? 0, d);
          if (d > worst) {
            worst = d;
            worstSeg = label;
          }
        }
      }
      const r2 = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v * 100) / 100]));
      return { worstContactSlide: worst, worstSeg, maxReachError: maxReach, slide: r2(drift), reachError: r2(reach) };
    },
    /** n game frames of the script: simulate, animate and render the gameplay pane (for CPU profiles). */
    loop(n: number) {
      const sim = panes[0].sim;
      const t0 = performance.now();
      for (let i = 0; i < n; i++) {
        const s = WALK_SCRIPT[Math.floor(i / 90) % WALK_SCRIPT.length];
        if (i % 90 === 0) sim.start(s, null);
        sim.step(1 / 60, s);
        sim.w.animate(1 / 60);
        app.renderer.render({ container: panes[0].cam });
      }
      return (performance.now() - t0) / n;
    },
    step(sec: number) {
      app.resize();
      const n = Math.round(sec * 60);
      for (let i = 0; i < n; i++) tick(1 / 60);
      app.render();
      return label;
    },
    /**
     * CPU cost: the walker's animate() per call, and the extra render time
     * the walker adds (its drawing is rebuilt and batched there), over n
     * frames of the whole script.
     */
    bench(n: number) {
      const sim = panes[0].sim;
      const run = (k: number, render: boolean, visible: boolean) => {
        sim.w.view.visible = visible;
        let anim = 0;
        const t0 = performance.now();
        for (let i = 0; i < k; i++) {
          const s = WALK_SCRIPT[Math.floor(i / 90) % WALK_SCRIPT.length];
          if (i % 90 === 0) sim.start(s, null);
          sim.step(1 / 60, s);
          const a0 = performance.now();
          sim.w.animate(1 / 60);
          anim += performance.now() - a0;
          if (render) app.renderer.render({ container: panes[0].cam });
        }
        sim.w.view.visible = true;
        return { total: (performance.now() - t0) / k, anim: anim / k };
      };
      run(200, true, true);
      const a = run(n, false, true);
      const withW = run(Math.round(n / 10), true, true);
      const without = run(Math.round(n / 10), true, false);
      return { animateMs: a.anim, renderWithMs: withW.total, renderWithoutMs: without.total, walkerRenderMs: withW.total - without.total };
    },
  };
  (window as unknown as { __lab: unknown }).__lab = lab;
  if (frozen) {
    app.ticker.stop();
    tick(0.0001);
    app.render();
  } else app.ticker.add((t) => tick(Math.min(0.05, t.deltaMS / 1000)));
}

/** The diver and the walker side by side at the same scale (gameplay scale on the left, 3x on the right). */
function compare(app: Application, hud: HTMLElement): void {
  const mk = (zoom: number, cx: number) => {
    const cam = new Container();
    const d = new Diver();
    d.lampOn = false;
    d.x = -70;
    d.y = -55;
    const w = new Walker();
    w.x = 40;
    w.y = 0;
    w.onGround = true;
    w.visor = w.visorTarget = 1;
    const floor = new Graphics().rect(-200, 0, 400, 30).fill({ color: 0x2a3438 });
    cam.addChild(floor, d.view, w.view, w.lens);
    cam.scale.set(zoom);
    cam.position.set(cx, app.screen.height * 0.6);
    app.stage.addChild(cam);
    return { d, w };
  };
  const z = app.screen.height / 560;
  const a = mk(z, app.screen.width * 0.15);
  const b = mk(z * 3, app.screen.width * 0.6);
  hud.textContent = 'diver (floating) and walker (standing), same scale';
  const tick = (dt: number) => {
    for (const p of [a, b]) {
      p.d.update(dt, 0, 0, false, false);
      p.d.takeBubbles();
      p.d.x = -70;
      p.d.y = -55;
      p.d.view.position.set(-70, -55);
      p.w.animate(dt);
    }
  };
  (window as unknown as { __lab: unknown }).__lab = {
    step(sec: number) {
      const n = Math.round(sec * 60);
      for (let i = 0; i < n; i++) tick(1 / 60);
      app.render();
      return 'compare';
    },
  };
  if (new URLSearchParams(location.search).has('frozen')) {
    app.ticker.stop();
    tick(0.0001);
    app.render();
  } else app.ticker.add((t) => tick(Math.min(0.05, t.deltaMS / 1000)));
}
