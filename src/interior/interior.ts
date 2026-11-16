import { BlurFilter, Container, Graphics, RenderTexture, Renderer, Sprite, Text } from 'pixi.js';
import type { Light } from '../fx/lighting';
import { Walker } from '../actors/walker';
import { InteriorLighting } from './light';
import { mulberry32, WORLD_SEED } from '../rng';

/**
 * Dry interiors on foot (after milestone 8 part 2, Colin's direction): a
 * separate space you enter through a hatch, with gravity, platforms and a
 * grapple that hops you up to anchor rings. Built from a tile map (40 units a
 * tile, see src/interior/corvina.ts). Reusable for later interiors (the base,
 * the sanctum's ruins).
 */

export const T = 40;
const GRAVITY = 1900;
const MAX_FALL = 950;
const WALK = 270;
const ACCEL_GROUND = 2200;
const ACCEL_AIR = 1200;
const JUMP_V = 660;
const COYOTE = 0.1;
const BUFFER = 0.13;
const HALF_W = 13;
const HEIGHT = 84;
const GRAPPLE_RANGE = 420;
const GRAPPLE_FLY = 0.15;
const GRAPPLE_PULL = 760;
const VENT_CYCLE = 3.2;
const VENT_BURST = 1.0;

export interface InteriorState {
  /** Breakers thrown, in the order they appear in the map. */
  breakers: boolean[];
  /** Finds and one-off pickups already taken (by map letter). */
  taken: string[];
}

export type InteriorEvent =
  | { type: 'exit' }
  | { type: 'breaker'; index: number; power: boolean }
  | { type: 'find'; id: string }
  | { type: 'hurt'; amount: number; why: 'steam' | 'bilge' }
  | { type: 'lift' }
  | { type: 'grapple' }
  | { type: 'land'; hard: boolean }
  | { type: 'jump' };

interface Spot {
  ch: string;
  tx: number;
  ty: number;
  x: number;
  y: number;
}

export interface InteriorInput {
  moveX: number;
  moveY: number;
  jump: boolean;
  collect: boolean;
  lamp: boolean;
}

export class Interior {
  readonly view = new Container();
  readonly walker = new Walker();
  active = false;
  /** The Collect button's label and hold progress, and a banner. */
  label: string | null = null;
  progress = 0;
  banner = '';
  lampOn = true;

  private map: string[] = [];
  private W = 0;
  private H = 0;
  private sceneRT = RenderTexture.create({ width: 4, height: 4 });
  private lighting: InteriorLighting;
  private litRoot = new Container();
  private litCam = new Container();
  private emissiveCam = new Container();
  private glowCam = new Container();
  private glowRT = RenderTexture.create({ width: 4, height: 4 });
  private glowSprite: Sprite;
  private overlay = new Graphics();
  private dynamic = new Graphics();
  private dynEmissive = new Graphics();
  private static_ = new Graphics();
  private emissiveStatic = new Graphics();
  private glowStatic = new Graphics();
  private lamps: { light: Light; core: Graphics; halo: Graphics }[] = [];
  private emergency: Light[] = [];
  private headLamp: Light = { x: 0, y: 0, radius: 620, intensity: 1.6, color: [1, 0.95, 0.8], dirX: 1, dirY: 0, coneCos: 0.82, coneSoft: 0.14, haze: 0.12 };
  private spots: Spot[] = [];
  private anchors: { x: number; y: number }[] = [];
  private vents: { x: number; y: number; phase: number; hitAt: number }[] = [];
  private time = 0;
  private cam = { x: 0, y: 0 };
  private viewH = 760;
  private cssW = 1;
  private cssH = 1;
  private coyote = 0;
  private buffer = 0;
  private jumpWas = false;
  private collectWas = false;
  private lampWas = false;
  private dropTimer = 0;
  private grapple: { to: number; phase: 'fly' | 'pull' | 'hang'; t: number } | null = null;
  private grappleTarget = -1;
  private holdKey = '';
  private needRelease = false;
  private lastSafe = { x: 0, y: 0 };
  private fallFrom = 0;
  private state: InteriorState = { breakers: [], taken: [] };
  private doorG = new Graphics();
  private breakerG = new Graphics();
  private takenG = new Graphics();
  private shownKey = '';

  constructor(private readonly renderer: Renderer) {
    this.lighting = new InteriorLighting(this.sceneRT);
    this.glowSprite = new Sprite(this.glowRT);
    this.glowSprite.blendMode = 'add';
    this.glowSprite.filters = [new BlurFilter({ strength: 10, quality: 3 })];
    this.litRoot.addChild(this.litCam);
    this.litCam.addChild(this.static_, this.doorG, this.breakerG, this.takenG, this.dynamic, this.walker.view);
    this.emissiveCam.addChild(this.emissiveStatic, this.dynEmissive, this.walker.lens, this.overlay);
    this.glowCam.addChild(this.glowStatic);
    this.view.addChild(this.lighting.view, this.emissiveCam, this.glowSprite);
    this.view.visible = false;
  }

  get power(): boolean {
    return this.state.breakers.length > 0 && this.state.breakers.every(Boolean);
  }

  resize(cssW: number, cssH: number, res: number): void {
    this.cssW = cssW;
    this.cssH = cssH;
    this.sceneRT.resize(cssW, cssH, res);
    this.glowRT.resize(cssW, cssH, res * 0.5);
  }

  // ---------------------------------------------------------------------------
  // Tiles.

  private ch(tx: number, ty: number): string {
    if (ty < 0 || ty >= this.H || tx < 0 || tx >= this.W) return '#';
    return this.map[ty][tx];
  }
  /** Solid for everything (steel, crates, a shut powered door). */
  private solidTile(tx: number, ty: number): boolean {
    const c = this.ch(tx, ty);
    return c === '#' || c === 'c' || (c === 'D' && !this.power);
  }
  private rectHits(x0: number, y0: number, x1: number, y1: number): boolean {
    for (let ty = Math.floor(y0 / T); ty <= Math.floor((y1 - 0.01) / T); ty++)
      for (let tx = Math.floor(x0 / T); tx <= Math.floor((x1 - 0.01) / T); tx++) if (this.solidTile(tx, ty)) return true;
    return false;
  }
  private lineClear(ax: number, ay: number, bx: number, by: number): boolean {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 12);
    for (let k = 1; k < n; k++) {
      const x = ax + ((bx - ax) * k) / n;
      const y = ay + ((by - ay) * k) / n;
      if (this.solidTile(Math.floor(x / T), Math.floor(y / T))) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------------

  /** Build a level and step into it at its 'S' tile. */
  enter(map: string[], state: InteriorState): void {
    this.map = map;
    this.W = map[0].length;
    this.H = map.length;
    this.state = state;
    this.spots = [];
    this.anchors = [];
    this.vents = [];
    for (let ty = 0; ty < this.H; ty++)
      for (let tx = 0; tx < this.W; tx++) {
        const c = map[ty][tx];
        const x = tx * T + T / 2;
        const y = ty * T + T / 2;
        if (c === 'o') this.anchors.push({ x, y });
        else if (c === 'v') this.vents.push({ x, y: ty * T + T, phase: ((tx * 7) % 10) / 10 * VENT_CYCLE, hitAt: -9 });
        else if ('SBU123$'.includes(c)) this.spots.push({ ch: c, tx, ty, x, y: ty * T + T });
      }
    const nb = this.spots.filter((s) => s.ch === 'B').length;
    while (this.state.breakers.length < nb) this.state.breakers.push(false);
    this.buildStatic();
    const s = this.spots.find((p) => p.ch === 'S')!;
    const w = this.walker;
    w.x = s.x;
    w.y = s.y;
    w.vx = w.vy = 0;
    w.visor = 0;
    w.visorTarget = 1;
    w.face = 1;
    this.lastSafe = { x: w.x, y: w.y };
    this.cam.x = w.x - 400;
    this.cam.y = w.y - 400;
    this.grapple = null;
    this.active = true;
    this.view.visible = true;
    this.shownKey = '';
  }

  leave(): void {
    this.active = false;
    this.view.visible = false;
    this.label = null;
    this.banner = '';
  }

  // ---------------------------------------------------------------------------
  // Drawing the level once.

  private buildStatic(): void {
    const g = this.static_.clear();
    const e = this.emissiveStatic.clear();
    const gl = this.glowStatic.clear();
    for (const l of this.lamps) {
      l.core.destroy();
      l.halo.destroy();
    }
    this.lamps = [];
    this.emergency = [];
    let seed = WORLD_SEED ^ 0x77aa;
    const rand = mulberry32(seed++);
    const R = (a: number, b: number) => a + rand() * (b - a);
    const PW = this.W * T;
    const PH = this.H * T;
    // Back wall: riveted plates, ribs, pipes and a few portholes onto the black water.
    g.rect(0, 0, PW, PH).fill({ color: 0x23292b });
    for (let y = 0; y < PH; y += 120)
      for (let x = 0; x < PW; x += 160) {
        g.rect(x + 2, y + 2, 156, 116).fill({ color: rand() < 0.5 ? 0x283033 : 0x262c2e });
        for (let k = 8; k < 156; k += 22) g.circle(x + k, y + 6, 1.4).fill({ color: 0x3a4245 });
      }
    for (let x = 0; x < PW; x += 240) g.rect(x, 0, 18, PH).fill({ color: 0x1c2123 });
    for (const py of [3, 13, 23]) {
      g.rect(0, py * T + 6, PW, 9).fill({ color: 0x3b3a36 });
      g.rect(0, py * T + 6, PW, 3).fill({ color: 0x5a554c, alpha: 0.6 });
      for (let x = 60; x < PW; x += 300) g.rect(x, py * T + 2, 10, 17).fill({ color: 0x6a4a2e });
    }
    for (let x = 140; x < PW; x += 420) {
      const y = 3 * T;
      g.circle(x, y + 40, 18).fill({ color: 0x5a554c });
      g.circle(x, y + 40, 13).fill({ color: 0x061014 });
      e.circle(x, y + 40, 12).fill({ color: 0x0c2a33, alpha: 0.9 });
    }
    // Rust and grime streaks.
    for (let i = 0; i < (PW * PH) / 9000; i++) {
      const x = R(0, PW);
      const y = R(0, PH);
      g.rect(x, y, R(1, 3), R(10, 60)).fill({ color: 0x5a3a28, alpha: R(0.1, 0.3) });
    }
    // Tiles.
    for (let ty = 0; ty < this.H; ty++) {
      for (let tx = 0; tx < this.W; tx++) {
        const c = this.map[ty][tx];
        const x = tx * T;
        const y = ty * T;
        if (c === '#') {
          g.rect(x, y, T + 0.5, T + 0.5).fill({ color: 0x4a5052 });
          if (!this.solidTileStatic(tx, ty - 1)) {
            g.rect(x, y, T + 0.5, 6).fill({ color: 0x6e7476 });
            g.rect(x, y + 6, T + 0.5, 2).fill({ color: 0x2c3234 });
            for (let k = 6; k < T; k += 12) g.circle(x + k, y + 3, 1.2).fill({ color: 0x2c3234 });
          }
          if (!this.solidTileStatic(tx, ty + 1)) g.rect(x, y + T - 4, T + 0.5, 4).fill({ color: 0x2c3234 });
          if (rand() < 0.15) g.rect(x + R(4, 30), y + 8, 2, R(10, 28)).fill({ color: 0x6a3a22, alpha: 0.5 });
        } else if (c === 'c') {
          g.roundRect(x + 2, y + 2, T - 4, T - 4, 3).fill({ color: 0x5a4a38 });
          g.rect(x + 2, y + T / 2 - 2, T - 4, 4).fill({ color: 0x3a3028 });
          g.moveTo(x + 4, y + 4).lineTo(x + T - 4, y + T - 4).stroke({ color: 0x3a3028, width: 2 });
        } else if (c === '=') {
          g.rect(x, y, T + 0.5, 7).fill({ color: 0x6a6e70 });
          for (let k = 3; k < T; k += 8) g.rect(x + k, y + 2, 4, 3).fill({ color: 0x23292b });
          g.rect(x, y + 7, T + 0.5, 2).fill({ color: 0x2c3234 });
          if (tx % 4 === 0) g.moveTo(x + 4, y + 9).lineTo(x + 4, y + 26).stroke({ color: 0x3b3a36, width: 2 });
        } else if (c === '~') {
          g.rect(x, y, T + 0.5, T + 0.5).fill({ color: 0x0e2a30 });
          if (this.ch(tx, ty - 1) !== '~') e.rect(x, y, T + 0.5, 3).fill({ color: 0x2a6a70, alpha: 0.6 });
        } else if (c === 'o') {
          g.rect(x + T / 2 - 3, y, 6, T / 2 - 6).fill({ color: 0x5a554c });
          g.circle(x + T / 2, y + T / 2, 9).stroke({ color: 0xa8822e, width: 4 });
        } else if (c === 'v') {
          g.roundRect(x + 6, y + T - 10, T - 12, 10, 2).fill({ color: 0x3a3e40 });
          for (let k = 10; k < T - 8; k += 6) g.rect(x + k, y + T - 8, 3, 6).fill({ color: 0x151a1c });
        } else if (c === 'S') {
          // The hatch you came down by: a ladder up to the light.
          for (let ly = 0; ly <= ty; ly++) {
            const yy = ly * T;
            g.rect(x + 8, yy, 4, T).fill({ color: 0x6a6e70 });
            g.rect(x + T - 12, yy, 4, T).fill({ color: 0x6a6e70 });
            g.rect(x + 8, yy + 18, T - 16, 3).fill({ color: 0x8a8e90 });
          }
          gl.rect(x - 10, 0, T + 20, T * 2).fill({ color: 0x4a7a86, alpha: 0.5 });
          this.emergency.push({ x: x + T / 2, y: T, radius: 360, intensity: 0.7, color: [0.5, 0.75, 0.85] });
        } else if (c === 'U') {
          g.rect(x - 4, 0, 6, PH).fill({ color: 0x3b3a36, alpha: 0.0 });
          g.roundRect(x - 2, y + T - 8, T + 4, 8, 2).fill({ color: 0x8a8e90 });
          g.rect(x - 4, y - T * 2, 5, T * 3).fill({ color: 0x5a554c });
          g.rect(x + T, y - T * 2, 5, T * 3).fill({ color: 0x5a554c });
          g.rect(x - 4, y - T * 2, T + 9, 6).fill({ color: 0xc9a24a });
        } else if (c === 'B') {
          g.roundRect(x + 6, y + 4, T - 12, T - 8, 3).fill({ color: 0x4a4e50 });
          g.rect(x + 6, y + 4, T - 12, 5).fill({ color: 0xc9a24a });
        } else if (c === '1' || c === '2' || c === '3') {
          // A desk with something on it.
          g.rect(x - 14, y + T - 18, T + 28, 6).fill({ color: 0x5a4a38 });
          g.rect(x - 10, y + T - 12, 5, 12).fill({ color: 0x3a3028 });
          g.rect(x + T + 5, y + T - 12, 5, 12).fill({ color: 0x3a3028 });
        } else if (c === '$') {
          g.roundRect(x + 2, y + 10, T - 4, T - 10, 3).fill({ color: 0x6a4a38 });
          g.rect(x + 2, y + 10, T - 4, 5).fill({ color: 0xa8402e });
        }
      }
    }
    // Ceiling lamps on every deck (they light when the power is back), and dim red emergency lamps.
    for (let ty = 1; ty < this.H; ty++)
      for (let tx = 2; tx < this.W - 2; tx += 7) {
        if (!this.solidTileStatic(tx, ty - 1) || this.solidTileStatic(tx, ty) || this.map[ty][tx] === '~') continue;
        const x = tx * T + T / 2;
        const y = ty * T + 4;
        g.roundRect(x - 12, y - 4, 24, 7, 2).fill({ color: 0x3a3e40 });
        const core = new Graphics().roundRect(x - 9, y + 1, 18, 3, 1).fill({ color: 0xfff0c8 });
        const halo = new Graphics().ellipse(x, y + 10, 40, 16).fill({ color: 0xffd890 });
        this.emissiveCam.addChild(core);
        this.glowCam.addChild(halo);
        this.lamps.push({ light: { x, y: y + 24, radius: 300, intensity: 0, color: [1, 0.9, 0.72], haze: 0.04 }, core, halo });
        if ((tx / 7) % 3 === 0) {
          e.circle(x + 18, y, 2.2).fill({ color: 0xd8492e });
          this.emergency.push({ x: x + 18, y: y + 10, radius: 170, intensity: 0.45, color: [1, 0.3, 0.2] });
        }
      }
    // The lab's sign.
    const lab = this.spots.find((p) => p.ch === '1');
    if (lab) {
      const t = new Text({ text: 'SURVEY LAB', style: { fontFamily: 'monospace', fontSize: 14, fill: 0xd8d0b8, fontWeight: 'bold', letterSpacing: 3 } });
      t.alpha = 0.6;
      t.position.set(lab.x - 40, lab.y - 4 * T);
      this.litCam.addChild(t);
    }
    this.shownKey = '';
  }
  private solidTileStatic(tx: number, ty: number): boolean {
    const c = this.ch(tx, ty);
    return c === '#' || c === 'c';
  }

  /** Doors, breakers and taken things, redrawn only when they change. */
  private redrawState(): void {
    const key = `${this.state.breakers.join()}|${this.state.taken.join()}`;
    if (key === this.shownKey) return;
    this.shownKey = key;
    const p = this.power;
    const d = this.doorG.clear();
    for (let ty = 0; ty < this.H; ty++)
      for (let tx = 0; tx < this.W; tx++) {
        if (this.map[ty][tx] !== 'D') continue;
        const x = tx * T;
        const y = ty * T;
        if (!p) {
          d.rect(x + 4, y, T - 8, T + 0.5).fill({ color: 0x7a7068 });
          d.rect(x + 4, y + T / 2 - 2, T - 8, 4).fill({ color: 0xc9a24a });
        } else d.rect(x + 4, y, T - 8, 6).fill({ color: 0x7a7068 });
      }
    const b = this.breakerG.clear();
    let i = 0;
    for (const s of this.spots) {
      if (s.ch !== 'B') continue;
      const on = this.state.breakers[i++];
      const x = s.tx * T;
      const y = s.ty * T;
      b.rect(x + T / 2 - 2, y + (on ? 10 : 20), 4, 12).fill({ color: 0xd8d0c0 });
      b.circle(x + T - 11, y + 13, 3).fill({ color: on ? 0x9ae070 : 0xd8492e });
    }
    const tk = this.takenG.clear();
    for (const s of this.spots) {
      if (!'123$'.includes(s.ch) || this.state.taken.includes(s.ch)) continue;
      const x = s.x;
      const y = s.y - 18;
      if (s.ch === '1') tk.roundRect(x - 10, y - 10, 20, 14, 2).fill({ color: 0x3a3e40 }).roundRect(x - 7, y - 8, 14, 9, 1).fill({ color: 0x9ab070 });
      else if (s.ch === '2') tk.roundRect(x - 16, y - 6, 32, 8, 4).fill({ color: 0xd8d0b8 });
      else if (s.ch === '3') tk.roundRect(x - 11, y - 8, 22, 10, 1).fill({ color: 0x6a3a2a });
      else tk.rect(x - 8, y - 6, 16, 4).fill({ color: 0xa8822e });
    }
    for (const l of this.lamps) {
      l.core.visible = l.halo.visible = p;
      l.light.intensity = p ? 1.0 : 0;
    }
  }

  // ---------------------------------------------------------------------------
  // The frame.

  update(dt: number, inp: InteriorInput, paused: boolean): InteriorEvent[] {
    const ev: InteriorEvent[] = [];
    if (!this.active) return ev;
    this.time += dt;
    const w = this.walker;
    this.redrawState();
    const jumpPressed = inp.jump && !this.jumpWas;
    const collectTap = inp.collect && !this.collectWas;
    if (inp.lamp && !this.lampWas) this.lampOn = !this.lampOn;
    this.jumpWas = inp.jump;
    this.collectWas = inp.collect;
    this.lampWas = inp.lamp;
    if (paused) {
      this.render(dt);
      return ev;
    }

    // ---- Grapple target: the best anchor in range with a clear line, ahead and above first ----
    this.grappleTarget = -1;
    if (!this.grapple) {
      const hx = w.x;
      const hy = w.y - 60;
      let best = Infinity;
      this.anchors.forEach((a, i) => {
        const d = Math.hypot(a.x - hx, a.y - hy);
        if (d < 50 || d > GRAPPLE_RANGE || !this.lineClear(hx, hy, a.x, a.y)) return;
        const dir = Math.abs(inp.moveX) > 0.2 ? Math.sign(inp.moveX) : w.face;
        const score = d + ((a.x - hx) * dir >= -20 ? 0 : 300) + (a.y < hy ? 0 : 200);
        if (score < best) {
          best = score;
          this.grappleTarget = i;
        }
      });
    }

    // ---- Things to hold Collect at ----
    let act: { key: string; label: string; seconds: number; done: () => void } | null = null;
    let info = '';
    const near = (s: Spot, r = 50) => Math.abs(w.x - s.x) < r && Math.abs(w.y - s.y) < 70;
    let bi = 0;
    for (const s of this.spots) {
      const idx = s.ch === 'B' ? bi++ : -1;
      if (!near(s)) continue;
      if (s.ch === 'S') act = { key: 'exit', label: 'Climb out through the hatch', seconds: 0.8, done: () => ev.push({ type: 'exit' }) };
      else if (s.ch === 'B' && !this.state.breakers[idx])
        act = {
          key: 'b' + idx,
          label: 'Throw the breaker',
          seconds: 1.2,
          done: () => {
            this.state.breakers[idx] = true;
            ev.push({ type: 'breaker', index: idx, power: this.power });
          },
        };
      else if (s.ch === 'U') {
        if (!this.power) info = 'The lift is dead: no power';
        else {
          const other = this.spots.find((o) => o.ch === 'U' && o !== s)!;
          act = {
            key: 'lift',
            label: other.y < s.y ? 'Take the lift up' : 'Take the lift down',
            seconds: 0.6,
            done: () => {
              w.x = other.x;
              w.y = other.y;
              w.vx = w.vy = 0;
              this.lastSafe = { x: w.x, y: w.y };
              ev.push({ type: 'lift' });
            },
          };
        }
      } else if ('123$'.includes(s.ch) && !this.state.taken.includes(s.ch))
        act = {
          key: 'f' + s.ch,
          label: s.ch === '1' ? 'Take the sonar test logs' : s.ch === '2' ? 'Take the pressure suit drawings' : s.ch === '3' ? "Read the Corvina's log" : 'Open the salvage crate',
          seconds: 1.2,
          done: () => {
            this.state.taken.push(s.ch);
            ev.push({ type: 'find', id: s.ch });
          },
        };
    }
    if (!act && this.grappleTarget >= 0 && !this.grapple) {
      const to = this.grappleTarget;
      act = {
        key: 'grapple',
        label: 'Fire the grapple',
        seconds: 0,
        done: () => {
          this.grapple = { to, phase: 'fly', t: 0 };
          ev.push({ type: 'grapple' });
        },
      };
    }
    if (act && act.key === 'grapple') {
      if (collectTap) act.done();
      this.progress = 0;
    } else if (act) {
      if (act.key !== this.holdKey) this.progress = 0;
      // After an action completes, Collect must be let go before the next one starts.
      if (inp.collect && w.onGround && !this.needRelease) {
        this.progress += dt / act.seconds;
        if (this.progress >= 1) {
          this.progress = 0;
          this.needRelease = true;
          act.done();
          act = null;
        }
      } else this.progress = Math.max(0, this.progress - dt);
    } else this.progress = 0;
    if (!inp.collect) this.needRelease = false;
    this.holdKey = act?.key ?? '';
    this.label = act ? act.label : info || null;

    // ---- Movement ----
    if (this.grapple) this.updateGrapple(dt, inp, jumpPressed);
    else this.updateWalk(dt, inp, jumpPressed, ev);

    // ---- Hazards ----
    for (const v of this.vents) {
      const c = (this.time + v.phase) % VENT_CYCLE;
      const on = c < VENT_BURST;
      if (on && Math.abs(w.x - v.x) < 22 && w.y > v.y - 3 * T && w.y - HEIGHT < v.y && this.time - v.hitAt > VENT_CYCLE * 0.8) {
        v.hitAt = this.time;
        w.vy = -520;
        w.vx = (w.x < v.x ? -1 : 1) * 260;
        this.grapple = null;
        ev.push({ type: 'hurt', amount: 0.08, why: 'steam' });
      }
    }
    if (this.ch(Math.floor(w.x / T), Math.floor((w.y - 10) / T)) === '~') {
      ev.push({ type: 'hurt', amount: 0.1, why: 'bilge' });
      w.x = this.lastSafe.x;
      w.y = this.lastSafe.y;
      w.vx = w.vy = 0;
      this.grapple = null;
    }

    // ---- Banners ----
    this.banner = '';
    this.render(dt);
    return ev;
  }

  private updateWalk(dt: number, inp: InteriorInput, jumpPressed: boolean, ev: InteriorEvent[]): void {
    const w = this.walker;
    const target = inp.moveX * WALK;
    const a = w.onGround ? ACCEL_GROUND : ACCEL_AIR;
    if (Math.abs(target - w.vx) < a * dt) w.vx = target;
    else w.vx += Math.sign(target - w.vx) * a * dt;
    if (Math.abs(inp.moveX) > 0.15) w.face = inp.moveX > 0 ? 1 : -1;
    // Jump: a short grace after leaving a ledge, and a remembered press just before landing.
    this.coyote = w.onGround ? COYOTE : Math.max(0, this.coyote - dt);
    this.buffer = jumpPressed ? BUFFER : Math.max(0, this.buffer - dt);
    this.dropTimer = Math.max(0, this.dropTimer - dt);
    if (this.buffer > 0 && this.coyote > 0) {
      if (inp.moveY > 0.5 && this.onGrating()) this.dropTimer = 0.25;
      else {
        w.vy = -JUMP_V;
        ev.push({ type: 'jump' });
      }
      this.buffer = 0;
      this.coyote = 0;
    }
    // Let go of jump early for a lower hop.
    if (!inp.jump && w.vy < -260) w.vy += GRAVITY * 1.6 * dt;
    w.vy = Math.min(MAX_FALL, w.vy + GRAVITY * dt);
    // Move and collide, one axis at a time.
    w.x += w.vx * dt;
    if (this.rectHits(w.x - HALF_W, w.y - HEIGHT, w.x + HALF_W, w.y - 1)) {
      if (w.vx > 0) w.x = Math.floor((w.x + HALF_W) / T) * T - HALF_W - 0.01;
      else if (w.vx < 0) w.x = Math.ceil((w.x - HALF_W) / T) * T + HALF_W + 0.01;
      w.vx = 0;
    }
    const prevY = w.y;
    w.y += w.vy * dt;
    const ground = w.onGround;
    w.onGround = false;
    if (w.vy > 0) {
      // Landing on solid tiles, or on a grating from above.
      const ty = Math.floor(w.y / T);
      const hitSolid = this.rectHits(w.x - HALF_W, w.y - 1, w.x + HALF_W, w.y);
      let hitGrate = false;
      if (this.dropTimer <= 0 && prevY <= ty * T + 1)
        for (let tx = Math.floor((w.x - HALF_W) / T); tx <= Math.floor((w.x + HALF_W - 0.01) / T); tx++) if (this.ch(tx, ty) === '=') hitGrate = true;
      if (hitSolid || hitGrate) {
        w.y = ty * T;
        if (this.fallFrom && w.y - this.fallFrom > 260) ev.push({ type: 'land', hard: w.y - this.fallFrom > 420 });
        w.vy = 0;
        w.onGround = true;
      }
    } else if (w.vy < 0 && this.rectHits(w.x - HALF_W, w.y - HEIGHT, w.x + HALF_W, w.y - HEIGHT + 1)) {
      w.y = (Math.floor((w.y - HEIGHT) / T) + 1) * T + HEIGHT + 0.01;
      w.vy = 0;
    }
    if (ground && !w.onGround) this.fallFrom = w.y;
    if (w.onGround) {
      this.fallFrom = 0;
      // Remember solid footing away from the bilge and vents, to come back to after a fall.
      const below = this.ch(Math.floor(w.x / T), Math.floor((w.y + 4) / T));
      if ((below === '#' || below === 'c' || below === '=') && !this.vents.some((v) => Math.abs(v.x - w.x) < 60)) this.lastSafe = { x: w.x, y: w.y };
    }
    w.pose = !w.onGround ? (w.vy < 0 ? 'jump' : 'fall') : Math.abs(w.vx) > 20 ? 'walk' : 'stand';
  }

  private onGrating(): boolean {
    const w = this.walker;
    const ty = Math.floor((w.y + 2) / T);
    for (let tx = Math.floor((w.x - HALF_W) / T); tx <= Math.floor((w.x + HALF_W - 0.01) / T); tx++) if (this.ch(tx, ty) === '=') return true;
    return false;
  }

  private updateGrapple(dt: number, inp: InteriorInput, jumpPressed: boolean): void {
    const w = this.walker;
    const g = this.grapple!;
    const a = this.anchors[g.to];
    g.t += dt;
    const hx = a.x;
    const hy = a.y + 8 + HEIGHT + 22;
    if (g.phase === 'fly') {
      if (g.t >= GRAPPLE_FLY) {
        g.phase = 'pull';
        g.t = 0;
      }
    } else if (g.phase === 'pull') {
      const dx = hx - w.x;
      const dy = hy - w.y;
      const d = Math.hypot(dx, dy);
      const step = Math.min(d, GRAPPLE_PULL * dt);
      w.vx = (dx / Math.max(1, d)) * GRAPPLE_PULL * 0.5;
      w.vy = (dy / Math.max(1, d)) * GRAPPLE_PULL * 0.5;
      w.x += (dx / Math.max(1, d)) * step;
      w.y += (dy / Math.max(1, d)) * step;
      if (d < 8) g.phase = 'hang';
      if (g.t > 2) this.grapple = null;
    } else {
      // Hanging under the anchor: jump to swing off, or press down to let go.
      w.x += (hx + Math.sin(this.time * 2.4) * 3 - w.x) * Math.min(1, dt * 8);
      w.y = hy;
      w.vx = w.vy = 0;
      if (Math.abs(inp.moveX) > 0.15) w.face = inp.moveX > 0 ? 1 : -1;
      if (jumpPressed) {
        this.grapple = null;
        w.vy = -560;
        w.vx = (Math.abs(inp.moveX) > 0.15 ? Math.sign(inp.moveX) : w.face) * 330;
      } else if (inp.moveY > 0.6) this.grapple = null;
    }
    w.onGround = false;
    w.pose = g.phase === 'fly' ? 'jump' : 'hang';
    if (!this.grapple) this.fallFrom = w.y;
  }

  // ---------------------------------------------------------------------------

  private render(dt: number): void {
    const w = this.walker;
    w.animate(dt);
    // Camera: follow with a little look-ahead, clamped to the level.
    const viewH = this.viewH;
    const zoom = this.cssH / viewH;
    const viewW = this.cssW / zoom;
    const lx = w.x + w.face * 120 + w.vx * 0.2 - viewW / 2;
    const ly = w.y - 60 - viewH / 2;
    const k = 1 - Math.exp(-5 * dt);
    this.cam.x += (lx - this.cam.x) * k;
    this.cam.y += (ly - this.cam.y) * k;
    this.cam.x = Math.max(0, Math.min(this.W * T - viewW, this.cam.x));
    this.cam.y = Math.max(0, Math.min(this.H * T - viewH, this.cam.y));
    for (const c of [this.litCam, this.emissiveCam, this.glowCam]) {
      c.scale.set(zoom);
      c.position.set(-this.cam.x * zoom, -this.cam.y * zoom);
    }
    // Steam, the bilge's surface, the grapple line and its target.
    const d = this.dynamic.clear();
    const de = this.dynEmissive.clear();
    for (const v of this.vents) {
      const c = (this.time + v.phase) % VENT_CYCLE;
      if (c < VENT_BURST) {
        const f = 1 - c / VENT_BURST;
        for (let i = 0; i < 9; i++) {
          const yy = v.y - ((i / 9 + c * 2) % 1) * 3 * T;
          d.circle(v.x + Math.sin(i * 3 + this.time * 6) * 8, yy, 10 + (v.y - yy) * 0.12).fill({ color: 0xc8d0d0, alpha: 0.25 * f });
        }
      } else if (c > VENT_CYCLE - 0.6) d.circle(v.x, v.y - 6, 6).fill({ color: 0xc8d0d0, alpha: 0.2 });
    }
    const o = this.overlay.clear();
    if (this.grappleTarget >= 0 && !this.grapple) {
      const a = this.anchors[this.grappleTarget];
      const r = 22 + Math.sin(this.time * 6) * 3;
      o.circle(a.x, a.y, r).stroke({ color: 0xffc860, width: 2, alpha: 0.9 });
    }
    if (this.grapple) {
      const a = this.anchors[this.grapple.to];
      const hand = { x: w.x + w.face * 4, y: w.y - HEIGHT - 18 };
      const k2 = this.grapple.phase === 'fly' ? Math.min(1, this.grapple.t / GRAPPLE_FLY) : 1;
      o.moveTo(hand.x, hand.y).lineTo(hand.x + (a.x - hand.x) * k2, hand.y + (a.y - hand.y) * k2).stroke({ color: 0xd8c890, width: 2 });
    }
    void de;
    // Lights: lamps (with power), the emergency lamps, and the helmet lamp's beam.
    const head = w.head();
    this.headLamp.x = head.x + w.face * 10;
    this.headLamp.y = head.y;
    this.headLamp.dirX = w.face * 0.97;
    this.headLamp.dirY = 0.24;
    this.headLamp.intensity = this.lampOn ? 1.6 : 0;
    const lights: Light[] = [this.headLamp, ...this.lamps.map((l) => l.light), ...(this.power ? [] : this.emergency)];
    this.lighting.update({
      time: this.time,
      camX: this.cam.x,
      camY: this.cam.y,
      viewW,
      viewH,
      cssW: this.cssW,
      cssH: this.cssH,
      ambient: this.power ? [0.42, 0.4, 0.38] : [0.07, 0.08, 0.1],
      lights,
    });
    this.renderer.render({ container: this.litRoot, target: this.sceneRT, clear: true, clearColor: [0, 0, 0, 0] });
    this.renderer.render({ container: this.glowCam, target: this.glowRT, clear: true, clearColor: [0, 0, 0, 0] });
  }

  /** For tests and the sound: where the walker is. */
  get pos(): { x: number; y: number; onGround: boolean } {
    return { x: this.walker.x, y: this.walker.y, onGround: this.walker.onGround };
  }
}
