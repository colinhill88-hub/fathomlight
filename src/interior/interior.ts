import { materialFill, type WorldArt } from '../art/worldArt';
import { perf } from '../dev/perf';
import { BlurFilter, Container, Graphics, RenderTexture, Renderer, Sprite, Text, type Texture } from 'pixi.js';
import type { Light } from '../fx/lighting';
import { Walker } from '../actors/walker';
import { deckTread, lampFixture, rivet } from './detail';
import { InteriorLighting } from './light';
import { mulberry32, WORLD_SEED } from '../rng';
import { drawSurveyDecks } from './corvinaArt';

/**
 * Dry interiors on foot (after milestone 8 part 2, Colin's direction): a
 * separate space you enter through a hatch, with gravity, platforms and a
 * grapple that hops you up to anchor rings. Built from a tile map (40 units a
 * tile, see src/interior/corvina.ts). Reusable for later interiors (the base,
 * the sanctum's ruins).
 */

export const T = 40;
export const GRAVITY = 1900;
export const MAX_FALL = 950;
export const WALK = 270;
/** Holding Shift (or the pad's left bumper) on foot: a sprint (Colin, after the terrain pass). */
export const SPRINT = 430;
export const ACCEL_GROUND = 2200;
export const ACCEL_AIR = 1200;
export const JUMP_V = 660;
const COYOTE = 0.1;
const BUFFER = 0.13;
const HALF_W = 13;
const HEIGHT = 84;
const GRAPPLE_RANGE = 420;
/**
 * The grapple (Colin, before milestone 11): the harpoon comes off the back,
 * fires its spear into the ring, and you swing on the line as a pendulum,
 * with momentum, letting go (jump) to fly across gaps too wide to jump.
 */
const GRAPPLE_DRAW = 0.24;
const GRAPPLE_FLY = 0.16;
const GRAPPLE_REEL = 0.24;
/** The hands on the line, above the feet. */
const GRIP = 100;
/** Pushing left or right on the line pumps the swing (units/s²); up and down climb it. */
const SWING_PUMP = 720;
const SWING_CLIMB = 220;
const SWING_MAX = 1050;
const VENT_CYCLE = 3.2;
const VENT_BURST = 1.0;
/** Climbing speed on a ladder (the base on foot). */
export const CLIMB = 210;
/** The lighting shader adds up at most this many lights; the nearest win. */
const MAX_LIGHTS = 16;

/** Something to hold Collect at (or tap, for the grapple). */
export interface InteriorAct {
  key: string;
  label: string;
  seconds: number;
  done: () => void;
}

/**
 * A level's own rules and art, for interiors built by code rather than from
 * a hand-drawn map with letters (the walkable base). The Corvina uses none.
 */
export interface InteriorHooks {
  /** Where the walker steps in. */
  spawn: { x: number; y: number };
  /** 'base': clean charcoal hull rooms over black water, not a rusting wreck. */
  style: 'base';
  /** Things to do where the walker stands: an action, a line of information, or nothing. */
  act(x: number, y: number): InteriorAct | string | null;
  /** Extra art over the tiles, drawn once: lit, unlit (emissive) and glow layers, and signs. */
  decorate(g: Graphics, e: Graphics, gl: Graphics, addLamp: (x: number, y: number, zone: number) => void, addText: (t: Text) => void, phase: 'back' | 'front', wallTexture?: Texture): void;
  /** Moving art, every frame. */
  /** view: the world rectangle on screen, so far-off rooms can be skipped (milestone 12). */
  animate(d: Graphics, de: Graphics, time: number, view?: { x0: number; y0: number; x1: number; y1: number }): void;
  /** Is a room (lamp zone) powered? */
  powered(zone: number): boolean;
  /** Extra lights (screens, glowing tanks). */
  lights(): Light[];
  /**
   * Milestone 9: real actors (the creatures in the tanks), added to the lit,
   * emissive and glow layers when the level is entered, and taken away
   * again (detach) when it is left or rebuilt.
   */
  attach?(lit: Container, emissive: Container, glow: Container): void;
  detach?(): void;
  /** Move the actors, every frame (x0..x1: the camera's view in level units). */
  tick?(dt: number, time: number, x0: number, x1: number): void;
}

/** Milestone 9: the camera holds on something (a tank being tended), beside a panel on the right. */
export interface InteriorFocus {
  x: number;
  y: number;
  /** View height to frame it, in level units. */
  h: number;
  /** Width of the panel on the right, in CSS px: the focus is centred in what is left. */
  panelPx: number;
  /** Presentation multiplier for close inspection views with reflective glass. */
  lampGain?: number;
}

/**
 * Milestone 10: what a hand-drawn map's letters mean, so the same system
 * runs other wrecks than the Corvina (the Fulmar deep station). Finds are
 * the digits 1-9 and '$'.
 */
export interface InteriorOptions {
  /** Collect labels for the finds, by map letter. */
  labels?: Record<string, string>;
  /** A sign painted above one find (its letter), e.g. 'SURVEY LAB' over '1'. */
  sign?: { ch: string; text: string };
  /**
   * Milestone 11: the sanctum's heart. 'sanctum' draws pale luminous stone in
   * the Choir's colours instead of a rusting wreck; it is always powered (its
   * lift runs on light), falling into its light pool ('~') only puts you back
   * where you last stood, and doors (by letter) open once a find is taken.
   */
  style?: 'wreck' | 'fulmar' | 'sanctum';
  powered?: boolean;
  gates?: Record<string, string>;
  /** Moving art and lights of the level's own (the Choir rising, in the heart). */
  animate?: (d: Graphics, de: Graphics, time: number) => void;
  lights?: () => Light[];
  /** Finds that need no 'taken' marker drawn (they are drawn by the level's own art). */
  plainFinds?: boolean;
  /** The Collect label at the way out (S). */
  exitLabel?: string;
}
const CORVINA_LABELS: Record<string, string> = {
  '1': 'Take the sonar test logs',
  '2': 'Take the pressure suit drawings',
  '3': "Read the Corvina's log",
  $: 'Open the salvage crate',
};
const isFind = (c: string) => c === '$' || (c >= '1' && c <= '9');

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
  /** Held: run faster on foot. */
  sprint?: boolean;
  collect: boolean;
  lamp: boolean;
}

export class Interior {
  readonly view = new Container();
  readonly walker: Walker;
  active = false;
  /** The Collect button's label and hold progress, and a banner. */
  label: string | null = null;
  progress = 0;
  banner = '';
  lampOn = true;
  private lampGain = 1;

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
  private lamps: { light: Light; core: Graphics; halo: Graphics; zone: number }[] = [];
  private hooks: InteriorHooks | null = null;
  private climbing = false;
  private texts: Text[] = [];
  private emergency: Light[] = [];
  private headLamp: Light = { x: 0, y: 0, radius: 620, intensity: 1.6, color: [1, 0.95, 0.8], dirX: 1, dirY: 0, coneCos: 0.82, coneSoft: 0.14, haze: 0.12 };
  private spots: Spot[] = [];
  private anchors: { x: number; y: number }[] = [];
  private vents: { x: number; y: number; phase: number; hitAt: number }[] = [];
  private time = 0;
  private cam = { x: 0, y: 0 };
  private viewH = 560;
  private viewNow = 560;
  /** Milestone 9: hold the camera on something while a panel is open (tending a tank). */
  focus: InteriorFocus | null = null;
  private actorLit = new Container();
  private actorEm = new Container();
  private actorGlow = new Container();
  private cssW = 1;
  private cssH = 1;
  private coyote = 0;
  private sprinting = false;
  private buffer = 0;
  private jumpWas = false;
  private collectWas = false;
  private lampWas = false;
  private dropTimer = 0;
  /**
   * Riding a lift (Colin, before milestone 11: no more blinking from deck to
   * deck). In the Corvina the gate slides up, you step into the car, the gate
   * shuts, the car's lamp comes on and it runs along its shaft to the other
   * stop. In the base the car rises or sinks between the ends of a long climb.
   */
  private ride: {
    steps: ('call' | 'open' | 'in' | 'close' | 'move' | 'open2' | 'out' | 'close2')[];
    i: number;
    t: number;
    carX0: number;
    carX1: number;
    y0: number;
    y1: number;
    inX: number;
    outX: number;
    gate0: { x: number; y: number } | null;
    gate1: { x: number; y: number } | null;
    width: number;
    walkFrom: number;
  } | null = null;
  /** Where the Corvina's lift car waits (its floor y), between rides. */
  private carY: number | null = null;
  private carLight: Light = { x: 0, y: 0, radius: 260, intensity: 0, color: [1, 0.92, 0.7], haze: 0.05 };
  private gateOpen: [number, number] = [0, 0];
  private grapple: { to: number; phase: 'draw' | 'fly' | 'swing' | 'reel'; t: number; len: number; want: number; maxLen: number; from: { x: number; y: number } } | null = null;
  /** After letting go of a swing: the flight keeps its speed for a while. */
  private flingT = 0;
  /** Only with the grapple line built (set by the game). */
  canGrapple = true;
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
  private opts: InteriorOptions = {};

  constructor(private readonly renderer: Renderer, paintedFace?: Texture, paintedSuit?: Texture, private readonly art?: WorldArt, redesigned = false, compact = false, private readonly livingBases = false) {
    this.walker = new Walker(paintedFace, paintedSuit, redesigned, compact);
    this.lighting = new InteriorLighting(this.sceneRT);
    this.glowSprite = new Sprite(this.glowRT);
    this.glowSprite.blendMode = 'add';
    this.glowSprite.filters = [new BlurFilter({ strength: 10, quality: 3 })];
    this.litRoot.addChild(this.litCam);
    this.litCam.addChild(this.static_, this.doorG, this.breakerG, this.takenG, this.dynamic, this.actorLit, this.walker.view, this.front);
    this.emissiveCam.addChild(this.emissiveStatic, this.dynEmissive, this.actorEm, this.walker.lens, this.overlay);
    this.glowCam.addChild(this.glowStatic, this.actorGlow);
    this.view.addChild(this.lighting.view, this.emissiveCam, this.glowSprite);
    this.view.visible = false;
  }

  get power(): boolean {
    if (this.opts.powered) return true;
    return this.state.breakers.length > 0 && this.state.breakers.every(Boolean);
  }
  private get sanctum(): boolean {
    return this.opts.style === 'sanctum' && !this.hooks;
  }
  /** Milestone 11: a door letter shut until its find is taken. */
  private gateShut(c: string): boolean {
    const f = this.opts.gates?.[c];
    return !!f && !this.state.taken.includes(f);
  }

  /** Graphics session G2 settings for the lighting here (set by the game from the preset and the Settings toggles). */
  look = { shadowLights: 0, shadowSteps: 0, relief: 0 };

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
    return c === '#' || c === 'c' || c === 'X' || c === 'P' || c === 'G' || (c === 'D' && !this.power) || this.gateShut(c);
  }
  /** A ladder tile ('H'). Its top tile holds you up like a grating. */
  private ladder(tx: number, ty: number): boolean {
    return this.ch(tx, ty) === 'H';
  }
  private ladderTop(tx: number, ty: number): boolean {
    return this.ladder(tx, ty) && !this.ladder(tx, ty - 1);
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
  enter(map: string[], state: InteriorState, hooks: InteriorHooks | null = null, opts: InteriorOptions | null = null): void {
    if (opts) this.opts = opts;
    else if (!hooks) this.opts = { labels: CORVINA_LABELS, sign: { ch: '1', text: 'SURVEY LAB' } };
    else this.opts = {};
    if (this.hooks && this.hooks !== hooks) this.hooks.detach?.();
    this.hooks = hooks;
    hooks?.attach?.(this.actorLit, this.actorEm, this.actorGlow);
    this.focus = null;
    this.lampGain = 1;
    this.climbing = false;
    this.map = map;
    this.W = map[0].length;
    this.H = map.length;
    this.state = state;
    this.spots = [];
    this.anchors = [];
    this.vents = [];
    // A new wreck: its lift car waits at its lowest stop, and nothing is mid-ride.
    this.carY = null;
    this.ride = null;
    this.gateOpen = [0, 0];
    for (let ty = 0; ty < this.H; ty++)
      for (let tx = 0; tx < this.W; tx++) {
        const c = map[ty][tx];
        const x = tx * T + T / 2;
        const y = ty * T + T / 2;
        if (c === 'o') this.anchors.push({ x, y });
        else if (c === 'v') this.vents.push({ x, y: ty * T + T, phase: ((tx * 7) % 10) / 10 * VENT_CYCLE, hitAt: -9 });
        else if ('SBU'.includes(c) || isFind(c)) this.spots.push({ ch: c, tx, ty, x, y: ty * T + T });
      }
    const nb = this.spots.filter((s) => s.ch === 'B').length;
    while (this.state.breakers.length < nb) this.state.breakers.push(false);
    this.buildStatic();
    this.lighting.setOccupancy(map, T);
    const s = hooks ? hooks.spawn : this.spots.find((p) => p.ch === 'S')!;
    const w = this.walker;
    w.x = s.x;
    w.y = s.y;
    w.vx = w.vy = 0;
    w.visor = 0;
    w.visorTarget = 1;
    w.face = 1;
    w.onGround = true;
    w.pose = 'stand';
    // Just in through the hatch or the airlock: stand up from a crouch, then lift the face plate.
    w.arrive(9);
    this.lastSafe = { x: w.x, y: w.y };
    this.cam.x = w.x - 400;
    this.cam.y = w.y - 400;
    this.dropGrapple();
    this.active = true;
    this.view.visible = true;
    this.shownKey = '';
  }

  /**
   * Rebuild the level around the walker without moving them (the base
   * changed while you were inside: a piece finished, power came or went).
   */
  reload(map: string[], hooks: InteriorHooks): void {
    const w = this.walker;
    const keep = { x: w.x, y: w.y, vx: w.vx, vy: w.vy, face: w.face, visor: w.visor, cam: { ...this.cam }, safe: { ...this.lastSafe } };
    this.enter(map, this.state, hooks);
    Object.assign(w, { x: keep.x, y: keep.y, vx: keep.vx, vy: keep.vy, face: keep.face, visor: keep.visor });
    this.cam = keep.cam;
    this.lastSafe = keep.safe;
  }
  /** Is there room to stand here (no hull in the way)? */
  standable(x: number, y: number): boolean {
    return !this.rectHits(x - HALF_W, y - HEIGHT, x + HALF_W, y - 1);
  }
  /** Put the walker somewhere (coming back in from a panel). */
  place(x: number, y: number, face: number): void {
    const w = this.walker;
    w.x = x;
    w.y = y;
    w.vx = w.vy = 0;
    w.face = face;
    w.visor = w.visorTarget = 1;
    w.onGround = true;
    w.pose = 'stand';
    w.arrive();
    this.lastSafe = { x, y };
    this.climbing = false;
    this.dropGrapple();
    this.cam.x = x - 400;
    this.cam.y = y - 400;
  }

  mountLadder(x: number, y: number, face: number): void {
    this.place(x, y, face);
    this.climbing = true;
    this.walker.onGround = false;
    this.walker.pose = 'climb';
    this.walker.visor = this.walker.visorTarget = 0;
    this.lastSafe = { x, y: y - 2 * T };
  }

  /** Point at the save's own state lists (they're changed in place). */
  syncState(breakers: boolean[], taken: string[]): void {
    this.state.breakers = breakers;
    this.state.taken = taken;
  }

  leave(): void {
    this.hooks?.detach?.();
    this.hooks = null;
    this.focus = null;
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
    for (const t of this.texts) t.destroy();
    this.texts = [];
    const base = this.hooks?.style === 'base';
    if (base) {
      this.buildBaseStatic(g, e, gl, rand);
      this.shownKey = '';
      return;
    }
    if (this.sanctum) {
      this.buildSanctumStatic(g, e, gl, rand);
      this.shownKey = '';
      return;
    }
    // Back wall: riveted plates, ribs, pipes and a few portholes onto the black water.
    const steel = this.art?.materials[this.opts.style === 'fulmar' ? 'fulmar' : 'corvina'];
    const survey = this.livingBases && this.opts.style !== 'fulmar';
    if (survey) drawSurveyDecks(g, T, PW, PH);
    else this.drawWreckWalls(g, e, steel, PW, PH, rand);
    // Tiles retain their exact collision shapes and interaction hardware.
    for (let ty = 0; ty < this.H; ty++) {
      for (let tx = 0; tx < this.W; tx++) {
        const c = this.map[ty][tx];
        const x = tx * T;
        const y = ty * T;
        if (c === '#') {
          const metal = survey ? 0x4c5753 : 0x4a5052;
          g.rect(x, y, T + 0.5, T + 0.5).fill({ color: metal });
          if (steel) g.rect(x, y, T + 0.5, T + 0.5).fill(materialFill(steel, metal, 0.67, 860, 520));
          if (!this.solidTileStatic(tx, ty - 1)) {
            g.rect(x, y, T + 0.5, 6).fill({ color: survey ? 0x8d8b77 : 0x6e7476 });
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
        } else if (c === 'L') {
          // The lift shaft: a dark recess with guide rails down each side and a few struts.
          g.rect(x, y, T + 0.5, T + 0.5).fill({ color: 0x15191b });
          if (this.ch(tx - 1, ty) !== 'L') g.rect(x + 2, y, 5, T + 0.5).fill({ color: 0x5a554c });
          if (this.ch(tx + 1, ty) !== 'L') g.rect(x + T - 7, y, 5, T + 0.5).fill({ color: 0x5a554c });
          if (ty % 3 === 0) g.rect(x, y + 4, T + 0.5, 3).fill({ color: 0x2a2e30 });
        } else if (c === 'G') {
          // The gate's frame (the gate itself slides, drawn each frame).
          g.rect(x + 2, y, T - 4, T + 0.5).fill({ color: 0x1c2123 });
          g.rect(x, y, 4, T + 0.5).fill({ color: 0x6a6e70 });
          g.rect(x + T - 4, y, 4, T + 0.5).fill({ color: 0x6a6e70 });
          if (this.ch(tx, ty - 1) !== 'G') g.rect(x - 2, y - 6, T + 4, 6).fill({ color: 0xc9a24a });
        } else if (c === 'U') {
          // A call panel beside the gate, with a brass plate.
          g.roundRect(x + 4, y - 38, 16, 24, 3).fill({ color: 0x3a3e40 });
          g.rect(x + 4, y - 38, 16, 4).fill({ color: 0xc9a24a });
          g.roundRect(x - 2, y + T - 8, T + 4, 8, 2).fill({ color: 0x8a8e90 });
        } else if (c === 'B') {
          g.roundRect(x + 6, y + 4, T - 12, T - 8, 3).fill({ color: 0x4a4e50 });
          g.rect(x + 6, y + 4, T - 12, 5).fill({ color: 0xc9a24a });
        } else if (c === 'H') {
          // Milestone 10: a ladder in a wreck: two rails and rungs.
          g.rect(x + 8, y, 4, T + 0.5).fill({ color: 0x6a6e70 });
          g.rect(x + T - 12, y, 4, T + 0.5).fill({ color: 0x6a6e70 });
          for (let k = 6; k < T; k += 13) g.rect(x + 8, y + k, T - 16, 3).fill({ color: 0x8a8e90 });
        } else if (c >= '1' && c <= '9') {
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
        this.lamps.push({ light: { x, y: y + 24, radius: 300, intensity: 0, color: [1, 0.9, 0.72], haze: 0.04 }, core, halo, zone: 0 });
        if ((tx / 7) % 3 === 0) {
          e.circle(x + 18, y, 2.2).fill({ color: 0xd8492e });
          this.emergency.push({ x: x + 18, y: y + 10, radius: 220, intensity: 0.6, color: [1, 0.32, 0.22] });
        }
      }
    // The lab's sign.
    const sg = this.opts.sign;
    const lab = sg ? this.spots.find((p) => p.ch === sg.ch) : null;
    if (lab && sg) {
      const t = new Text({ text: sg.text, style: { fontFamily: 'monospace', fontSize: 14, fill: 0xd8d0b8, fontWeight: 'bold', letterSpacing: 3 } });
      t.alpha = 0.6;
      t.position.set(lab.x - 40, lab.y - 4 * T);
      this.litCam.addChild(t);
      this.texts.push(t);
    }
    this.shownKey = '';
  }
  private drawWreckWalls(g: Graphics, e: Graphics, steel: Texture | undefined, PW: number, PH: number, rand: () => number): void {
    const R = (a: number, b: number) => a + rand() * (b - a);
    g.rect(0, 0, PW, PH).fill({ color: 0x23292b });
    if (steel) g.rect(0, 0, PW, PH).fill(materialFill(steel, 0x23292b, 0.74, 1050, 620));
    for (let y = 0; y < PH; y += 120)
      for (let x = 0; x < PW; x += 160) {
        g.rect(x + 2, y + 2, 156, 116).fill({ color: rand() < 0.5 ? 0x283033 : 0x262c2e, alpha: steel ? 0.42 : 1 });
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
  }

  private solidTileStatic(tx: number, ty: number): boolean {
    const c = this.ch(tx, ty);
    return c === '#' || c === 'c';
  }

  /**
   * The walkable base (after the Corvina on foot): charcoal hull rooms with
   * chrome trim and gold power lines, hanging in black water. The rooms'
   * own art comes from the level's hooks.
   */
  private buildBaseStatic(g: Graphics, e: Graphics, gl: Graphics, rand: () => number): void {
    const PW = this.W * T;
    const PH = this.H * T;
    // Black water outside the hull, with drifting specks and faint light from above.
    g.rect(0, 0, PW, PH).fill({ color: 0x06141a });
    for (let y = 0; y < PH; y += 80) g.rect(0, y, PW, 80).fill({ color: 0x0b2630, alpha: 0.5 * Math.max(0, 1 - y / PH) });
    for (let i = 0; i < (PW * PH) / 14000; i++) g.circle(rand() * PW, rand() * PH, 0.6 + rand() * 1.4).fill({ color: 0x9ec8c8, alpha: 0.08 + rand() * 0.12 });
    // Far off in the black water: the basin's rock floor and the base's own legs, barely there.
    {
      let x = 0;
      const ridge: number[] = [0, PH];
      while (x <= PW) {
        ridge.push(x, PH - 70 - rand() * 90);
        x += 60 + rand() * 80;
      }
      ridge.push(PW, PH);
      g.poly(ridge).fill({ color: 0x0a1c22, alpha: 0.9 });
      for (let lx = 200 + rand() * 300; lx < PW; lx += 500 + rand() * 400) {
        g.rect(lx - 7, PH * 0.45, 14, PH * 0.55).fill({ color: 0x0b2028, alpha: 0.85 });
        for (let y = PH * 0.5; y < PH; y += 90) g.moveTo(lx - 7, y).lineTo(lx + 7, y + 45).stroke({ color: 0x0e2a33, width: 2, alpha: 0.8 });
      }
    }
    const addLamp = (x: number, y: number, zone: number) => {
      lampFixture(g, x, y);
      const core = new Graphics().roundRect(x - 14, y + 2, 28, 3, 1.5).fill({ color: 0xf4ffd8 });
      // The halo sits on the lamp itself (it used to hang below it, like a smudge in mid-air).
      const halo = new Graphics().ellipse(x, y + 4, 30, 8).fill({ color: 0xe8f0c0 });
      this.emissiveCam.addChild(core);
      this.glowCam.addChild(halo);
      this.lamps.push({ light: { x, y: y + 30, radius: 330, intensity: 0, color: [0.95, 0.97, 0.86], haze: 0.03 }, core, halo, zone });
    };
    const addText = (t: Text) => {
      this.litCam.addChildAt(t, 1);
      this.texts.push(t);
    };
    this.hooks!.decorate(g, e, gl, addLamp, addText, 'back', this.art?.materials.kestrel);
    const hull = (tx: number, ty: number) => {
      const c = this.ch(tx, ty);
      return c === '#' || c === 'P';
    };
    for (let ty = 0; ty < this.H; ty++)
      for (let tx = 0; tx < this.W; tx++) {
        const c = this.map[ty][tx];
        const x = tx * T;
        const y = ty * T;
        if (c === '#') {
          g.rect(x, y, T + 0.5, T + 0.5).fill({ color: 0x2a2f33 });
          const open = (dx: number, dy: number) => {
            const n = this.ch(tx + dx, ty + dy);
            return n !== '#' && n !== 'X' && n !== 'P';
          };
          // Outer skin facing the water: darker, with a chrome seam.
          const outside = (dx: number, dy: number) => this.ch(tx + dx, ty + dy) === 'X';
          if (outside(0, -1)) g.rect(x, y, T + 0.5, 4).fill({ color: 0x9aa6ad });
          if (outside(0, 1)) g.rect(x, y + T - 4, T + 0.5, 4).fill({ color: 0x14181b });
          if (outside(-1, 0)) g.rect(x, y, 3, T + 0.5).fill({ color: 0x9aa6ad, alpha: 0.7 });
          if (outside(1, 0)) g.rect(x + T - 3, y, 3, T + 0.5).fill({ color: 0x14181b });
          // Floors: a chrome-capped deck with a gold power line just under it.
          if (open(0, -1)) {
            g.rect(x, y, T + 0.5, 7).fill({ color: 0x8e9aa2 });
            g.rect(x, y, T + 0.5, 2).fill({ color: 0xdfe7ec, alpha: 0.7 });
            g.rect(x, y + 7, T + 0.5, 2).fill({ color: 0x15191c });
            e.rect(x, y + 13, T + 0.5, 1.6).fill({ color: 0xc9a13a, alpha: 0.75 });
            deckTread(g, x, T + 0.5, y + 1.5);
            // Under the deck: the plate's edge and its bolts.
            g.rect(x, y + 16, T + 0.5, 1).fill({ color: 0x3e464b });
            if (tx % 2 === 0) rivet(g, x + 20, y + 24, 1.1);
          }
          // Ceilings and walls facing a room: a dark lip with a bolted strip.
          if (open(0, 1)) {
            g.rect(x, y + T - 5, T + 0.5, 5).fill({ color: 0x14181b });
            g.rect(x, y + T - 9, T + 0.5, 4).fill({ color: 0x353d42 });
            rivet(g, x + 10, y + T - 7, 1);
            rivet(g, x + 30, y + T - 7, 1);
          }
          if (open(1, 0)) g.rect(x + T - 4, y, 4, T + 0.5).fill({ color: 0x1b1f22 });
          if (open(-1, 0)) g.rect(x, y, 4, T + 0.5).fill({ color: 0x3a4146 });
          if (rand() < 0.08) g.rect(x + 6 + rand() * 24, y + 14, 8, 1).fill({ color: 0x3e464b });
        } else if (c === 'P') {
          // The moon pool: dark water in the dock's lower deck.
          g.rect(x, y, T + 0.5, T + 0.5).fill({ color: 0x0a2c34 });
          if (!hull(tx, ty - 1) && this.ch(tx, ty - 1) !== 'P') e.rect(x, y, T + 0.5, 3).fill({ color: 0x3aa0a8, alpha: 0.5 });
        } else if (c === '=') {
          g.rect(x, y, T + 0.5, 7).fill({ color: 0x7c878e });
          for (let k = 3; k < T; k += 8) g.rect(x + k, y + 2, 4, 3).fill({ color: 0x15191c });
          g.rect(x, y + 7, T + 0.5, 2).fill({ color: 0x15191c });
          if (tx % 3 === 0) g.moveTo(x + 4, y + 9).lineTo(x + 4, y + 22).stroke({ color: 0x3a4146, width: 2 });
        }
        if (c === 'H') this.drawLadder(g, x, y);
      }
    this.hooks!.decorate(g, e, gl, addLamp, addText, 'front');
  }

  /**
   * Milestone 11: the sanctum's heart. Pale, nacre-smooth stone lit from
   * inside by veins of cyan, violet and magenta; ledges of solid light; rings
   * of light to grapple; a pool of light at the bottom of its chasm; a lift
   * shaft that is a column of light. Crystal lamps glow in the ceilings.
   */
  private buildSanctumStatic(g: Graphics, e: Graphics, gl: Graphics, rand: () => number): void {
    const PW = this.W * T;
    const PH = this.H * T;
    const R = (a: number, b: number) => a + rand() * (b - a);
    const CH = [0x5ff0ff, 0xa27cff, 0xff5ad8];
    // Far back: a violet dark, with great faint rings and drifting motes.
    const stone = this.art?.materials.heart;
    g.rect(0, 0, PW, PH).fill({ color: 0x0e0c22 });
    if (stone) g.rect(0, 0, PW, PH).fill(materialFill(stone, 0x0e0c22, 0.52, 1380, 920));
    for (let y = 0; y < PH; y += 80) g.rect(0, y, PW, 80).fill({ color: 0x1a1640, alpha: 0.5 * Math.sin((y / PH) * Math.PI) });
    for (let i = 0; i < 7; i++) {
      const x = R(0, PW);
      const y = R(PH * 0.2, PH * 0.8);
      const r = R(120, 320);
      g.ellipse(x, y, r * 0.35, r).stroke({ color: 0x2a2858, width: R(6, 14), alpha: 0.7 });
      e.ellipse(x, y, r * 0.35 - 4, r - 4).stroke({ color: CH[i % 3], width: 1, alpha: 0.25 });
    }
    for (let i = 0; i < (PW * PH) / 9000; i++) e.circle(R(0, PW), R(0, PH), R(0.6, 1.6)).fill({ color: CH[i % 3], alpha: R(0.15, 0.45) });
    const solid = (tx: number, ty: number) => this.solidTileStatic(tx, ty);
    for (let ty = 0; ty < this.H; ty++)
      for (let tx = 0; tx < this.W; tx++) {
        const c = this.map[ty][tx];
        const x = tx * T;
        const y = ty * T;
        if (c === '#') {
          g.rect(x, y, T + 0.5, T + 0.5).fill({ color: 0x5a5e7a });
          if (stone) g.rect(x, y, T + 0.5, T + 0.5).fill(materialFill(stone, 0x5a5e7a, 0.74, 990, 630));
          if (rand() < 0.4) g.ellipse(x + R(8, 32), y + R(8, 32), R(6, 14), R(3, 7)).fill({ color: 0x7a7e9c, alpha: 0.5 });
          // Faces onto the air: a nacre lip and a glowing seam.
          if (!solid(tx, ty - 1)) {
            g.rect(x, y, T + 0.5, 7).fill({ color: 0xc8cce0 });
            g.rect(x, y + 7, T + 0.5, 2).fill({ color: 0x3a3c58 });
            e.rect(x, y + 11, T + 0.5, 1.4).fill({ color: CH[(tx >> 2) % 3], alpha: 0.6 });
          }
          if (!solid(tx, ty + 1)) {
            g.rect(x, y + T - 5, T + 0.5, 5).fill({ color: 0x3a3c58 });
            e.rect(x, y + T - 8, T + 0.5, 1).fill({ color: CH[(tx >> 3) % 3], alpha: 0.35 });
          }
          if (!solid(tx - 1, ty)) g.rect(x, y, 4, T + 0.5).fill({ color: 0x9a9eb8 });
          if (!solid(tx + 1, ty)) g.rect(x + T - 4, y, 4, T + 0.5).fill({ color: 0x3a3c58 });
          // A vein here and there.
          if (rand() < 0.07) {
            let vx = x + R(4, 36);
            let vy = y + R(4, 36);
            e.moveTo(vx, vy);
            for (let k = 0; k < 3; k++) {
              vx += R(-10, 10);
              vy += R(-10, 10);
              e.lineTo(vx, vy);
            }
            e.stroke({ color: CH[Math.floor(rand() * 3)], width: 1, alpha: 0.6 });
          }
        } else if (c === '=') {
          // A ledge of solid light.
          e.roundRect(x, y, T + 0.5, 6, 3).fill({ color: 0xc8f4ff, alpha: 0.85 });
          gl.rect(x, y - 4, T + 0.5, 14).fill({ color: 0x5ff0ff, alpha: 0.45 });
        } else if (c === '~') {
          g.rect(x, y, T + 0.5, T + 0.5).fill({ color: 0x2a1a5a });
          if (this.ch(tx, ty - 1) !== '~') {
            e.rect(x, y, T + 0.5, 4).fill({ color: 0xe8dcff, alpha: 0.9 });
            gl.rect(x, y - 30, T + 0.5, 60).fill({ color: 0xa27cff, alpha: 0.5 });
          }
        } else if (c === 'o') {
          e.circle(x + T / 2, y + T / 2, 10).stroke({ color: 0xc8f4ff, width: 3 });
          gl.circle(x + T / 2, y + T / 2, 22).fill({ color: 0x5ff0ff, alpha: 0.5 });
        } else if (c === 'S') {
          // The glowing arch you came in by.
          g.moveTo(x - 20, y + T).lineTo(x - 20, y - 40).quadraticCurveTo(x + T / 2, y - 100, x + T + 20, y - 40).lineTo(x + T + 20, y + T).closePath().fill({ color: 0x14102c });
          e.moveTo(x - 20, y + T).lineTo(x - 20, y - 40).quadraticCurveTo(x + T / 2, y - 100, x + T + 20, y - 40).lineTo(x + T + 20, y + T).stroke({ color: 0x5ff0ff, width: 2.4 });
          gl.ellipse(x + T / 2, y, 60, 70).fill({ color: 0xa27cff, alpha: 0.4 });
        } else if (c === 'L') {
          // The lift's shaft: a column of light.
          g.rect(x, y, T + 0.5, T + 0.5).fill({ color: 0x1c1846 });
          if (this.ch(tx - 1, ty) !== 'L') e.rect(x + 3, y, 2, T + 0.5).fill({ color: 0x5ff0ff, alpha: 0.6 });
          if (this.ch(tx + 1, ty) !== 'L') e.rect(x + T - 5, y, 2, T + 0.5).fill({ color: 0x5ff0ff, alpha: 0.6 });
          if (this.ch(tx - 1, ty) === 'L' && this.ch(tx + 1, ty) === 'L') gl.rect(x, y, T + 0.5, T + 0.5).fill({ color: 0x5ff0ff, alpha: 0.18 });
        } else if (c === 'G') {
          g.rect(x + 2, y, T - 4, T + 0.5).fill({ color: 0x1c1846 });
        } else if (c === 'U') {
          // A call stone: a short pillar with a crystal.
          g.roundRect(x + 8, y + T - 34, 16, 34, 4).fill({ color: 0x9a9eb8 });
          g.roundRect(x - 2, y + T - 8, T + 4, 8, 2).fill({ color: 0xc8cce0 });
        } else if (c >= '1' && c <= '9') {
          // A plinth of pale stone with a ring of light on top.
          g.roundRect(x - 6, y + T - 26, T + 12, 26, 5).fill({ color: 0x9a9eb8 });
          g.roundRect(x - 6, y + T - 26, T + 12, 5, 3).fill({ color: 0xc8cce0 });
          e.ellipse(x + T / 2, y + T - 30, 14, 4).stroke({ color: c === '9' ? 0xff5ad8 : 0xa27cff, width: 2 });
          gl.ellipse(x + T / 2, y + T - 34, 30, 16).fill({ color: c === '9' ? 0xff5ad8 : 0xa27cff, alpha: 0.5 });
        }
      }
    // Crystal lamps in the ceilings, always lit.
    for (let ty = 1; ty < this.H; ty++)
      for (let tx = 3; tx < this.W - 2; tx += 9) {
        if (!solid(tx, ty - 1) || solid(tx, ty) || '~LG'.includes(this.map[ty][tx])) continue;
        const x = tx * T + T / 2;
        const y = ty * T + 2;
        const col = CH[(tx + ty) % 3];
        g.poly([x - 10, y, x + 10, y, x, y + 14]).fill({ color: 0x9a9eb8 });
        const core = new Graphics().poly([x - 5, y + 2, x + 5, y + 2, x, y + 12]).fill({ color: 0xf4fbff });
        const halo = new Graphics().ellipse(x, y + 10, 36, 20).fill({ color: col });
        this.emissiveCam.addChild(core);
        this.glowCam.addChild(halo);
        const rgb: [number, number, number] = [((col >> 16) & 255) / 255, ((col >> 8) & 255) / 255, (col & 255) / 255];
        this.lamps.push({ light: { x, y: y + 24, radius: 340, intensity: 0, color: rgb, haze: 0.06 }, core, halo, zone: 0 });
      }
  }

  /** Milestone 11: the sanctum's doors (song-locks) and the pool's shimmer, each frame. */
  private animateSanctum(d: Graphics, de: Graphics): void {
    void d;
    const t = this.time;
    for (let ty = 0; ty < this.H; ty++)
      for (let tx = 0; tx < this.W; tx++) {
        const c = this.map[ty][tx];
        if (!this.opts.gates?.[c]) continue;
        const x = tx * T;
        const y = ty * T;
        if (this.gateShut(c)) {
          de.rect(x + 10, y, T - 20, T + 0.5).fill({ color: 0xa27cff, alpha: 0.55 + 0.15 * Math.sin(t * 2.2 + ty) });
          de.rect(x + 17, y, 6, T + 0.5).fill({ color: 0xe8dcff, alpha: 0.7 });
        } else if (this.ch(tx, ty - 1) !== c) de.rect(x + 6, y, T - 12, 3).fill({ color: 0xa27cff, alpha: 0.6 });
      }
  }

  private drawLadder(g: Graphics, x: number, y: number): void {
    g.rect(x + 7, y, 4, T + 0.5).fill({ color: 0xaeb9c0 });
    g.rect(x + T - 11, y, 4, T + 0.5).fill({ color: 0x8e9aa2 });
    for (const k of [8, 28]) {
      g.rect(x + 9, y + k, T - 18, 3).fill({ color: 0xc8d2d8 });
      g.rect(x + 9, y + k + 3, T - 18, 1).fill({ color: 0x15191c, alpha: 0.6 });
    }
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
    for (const s of this.opts.plainFinds ? [] : this.spots) {
      if (!isFind(s.ch) || this.state.taken.includes(s.ch)) continue;
      const x = s.x;
      const y = s.y - 18;
      if (s.ch === '1') tk.roundRect(x - 10, y - 10, 20, 14, 2).fill({ color: 0x3a3e40 }).roundRect(x - 7, y - 8, 14, 9, 1).fill({ color: 0x9ab070 });
      else if (s.ch === '2') tk.roundRect(x - 16, y - 6, 32, 8, 4).fill({ color: 0xd8d0b8 });
      else if (s.ch === '3' || s.ch === '7') tk.roundRect(x - 11, y - 8, 22, 10, 1).fill({ color: 0x6a3a2a });
      else if (s.ch === '4' || s.ch === '5') tk.circle(x, y - 3, 7).stroke({ color: 0xc9a24a, width: 2.4 }).circle(x, y - 3, 2).fill({ color: 0x4a4e50 });
      else if (s.ch === '6') tk.roundRect(x - 16, y - 6, 32, 8, 4).fill({ color: 0xd8d0b8 });
      else tk.rect(x - 8, y - 6, 16, 4).fill({ color: 0xa8822e });
    }
    if (!this.hooks)
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
    if (this.ride) {
      this.updateRide(dt, ev);
      this.label = null;
      this.progress = 0;
      this.banner = '';
      this.render(dt);
      return ev;
    }

    // ---- Grapple target: the best anchor in range with a clear line, ahead and above first ----
    this.grappleTarget = -1;
    if (!this.grapple && !this.climbing && this.canGrapple) {
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
    let act: { key: string; label: string; seconds: number; done: () => void; breaker?: boolean } | null = null;
    let info = '';
    if (this.hooks) {
      const r = this.hooks.act(w.x, w.y);
      if (typeof r === 'string') info = r;
      else if (r) act = r;
    }
    const near = (s: Spot, r = 50) => Math.abs(w.x - s.x) < r && Math.abs(w.y - s.y) < 70;
    let bi = 0;
    for (const s of this.spots) {
      const idx = s.ch === 'B' ? bi++ : -1;
      if (!near(s)) continue;
      if (s.ch === 'S') act = { key: 'exit', label: this.opts.exitLabel ?? 'Climb out through the hatch', seconds: 0.8, done: () => ev.push({ type: 'exit' }) };
      else if (s.ch === 'B' && !this.state.breakers[idx])
        act = {
          key: 'b' + idx,
          label: 'Throw the breaker',
          seconds: 1.2,
          breaker: true,
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
              const carX = s.x + 3 * T;
              const top = Math.min(s.y, other.y);
              const here = this.carY ?? Math.max(s.y, other.y);
              this.ride = {
                steps: [...(Math.abs(here - s.y) > 2 ? (['call'] as const) : []), 'open', 'in', 'close', 'move', 'open2', 'out', 'close2'],
                i: 0,
                t: 0,
                carX0: carX,
                carX1: carX,
                y0: s.y,
                y1: other.y,
                inX: carX,
                outX: other.x,
                gate0: { x: (s.tx + 1) * T, y: s.y },
                gate1: { x: (other.tx + 1) * T, y: other.y },
                width: 3 * T - 8,
                walkFrom: s.x,
              };
              this.callFrom = here;
              void top;
              ev.push({ type: 'lift' });
            },
          };
        }
      } else if (isFind(s.ch) && !this.state.taken.includes(s.ch))
        act = {
          key: 'f' + s.ch,
          label: this.opts.labels?.[s.ch] ?? 'Take it',
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
          this.grapple = { to, phase: 'draw', t: 0, len: 0, want: 0, maxLen: 0, from: { x: 0, y: 0 } };
          w.spear = 'reach';
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
    // Holding Collect: going out shuts the face plate first; anything else, the near hand works at it.
    const leaving = act?.key === 'exit' || act?.key === 'airlock';
    const holding = !!act && act.key !== 'grapple' && inp.collect && w.onGround && this.progress > 0;
    w.visorTarget = holding && leaving ? 0 : 1;
    w.working += ((holding && !leaving ? 1 : 0) - w.working) * Math.min(1, dt * 10);
    w.breakerPull = holding && act?.breaker ? this.progress : 0;
    this.label = act ? act.label : info || null;

    // ---- Movement ----
    if (!this.grapple) w.hangTo = null;
    if (this.grapple) this.updateGrapple(dt, inp, jumpPressed, collectTap, ev);
    else if (this.climbing) this.updateClimb(dt, inp, jumpPressed, ev);
    else this.updateWalk(dt, inp, jumpPressed, ev);

    // ---- Hazards ----
    for (const v of this.vents) {
      const c = (this.time + v.phase) % VENT_CYCLE;
      const on = c < VENT_BURST;
      if (on && Math.abs(w.x - v.x) < 22 && w.y > v.y - 3 * T && w.y - HEIGHT < v.y && this.time - v.hitAt > VENT_CYCLE * 0.8) {
        v.hitAt = this.time;
        w.vy = -520;
        w.vx = (w.x < v.x ? -1 : 1) * 260;
        this.dropGrapple();
        ev.push({ type: 'hurt', amount: 0.08, why: 'steam' });
      }
    }
    if (this.ch(Math.floor(w.x / T), Math.floor((w.y - 10) / T)) === '~') {
      // The sanctum's pool of light only lifts you back out; the bilge stings.
      if (!this.sanctum) ev.push({ type: 'hurt', amount: 0.1, why: 'bilge' });
      w.x = this.lastSafe.x;
      w.y = this.lastSafe.y;
      w.vx = w.vy = 0;
      this.dropGrapple();
    }

    // ---- Banners ----
    this.banner = '';
    this.render(dt);
    return ev;
  }

  private updateWalk(dt: number, inp: InteriorInput, jumpPressed: boolean, ev: InteriorEvent[]): void {
    const w = this.walker;
    // The sprint carries on through a jump, but only starts from the floor.
    if (w.onGround) this.sprinting = !!inp.sprint && Math.abs(inp.moveX) > 0.5;
    const target = inp.moveX * (this.sprinting ? SPRINT : WALK);
    const a = w.onGround ? ACCEL_GROUND : ACCEL_AIR;
    this.flingT = w.onGround ? 0 : Math.max(0, this.flingT - dt);
    if (this.flingT > 0 && Math.abs(w.vx) > Math.abs(target) && (target === 0 || Math.sign(target) === Math.sign(w.vx))) {
      // Flung off a swing: the flight keeps its speed (a little air drag), unless you push against it.
      w.vx *= 1 - 0.35 * dt;
    } else if (Math.abs(target - w.vx) < a * dt) w.vx = target;
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
        for (let tx = Math.floor((w.x - HALF_W) / T); tx <= Math.floor((w.x + HALF_W - 0.01) / T); tx++) if (this.ch(tx, ty) === '=' || this.ladderTop(tx, ty)) hitGrate = true;
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
      if ((below === '#' || below === 'c' || below === '=' || below === 'H') && !this.vents.some((v) => Math.abs(v.x - w.x) < 60)) this.lastSafe = { x: w.x, y: w.y };
    }
    w.pose = !w.onGround ? (w.vy < 0 ? 'jump' : 'fall') : Math.abs(w.vx) > 20 ? 'walk' : 'stand';
    // Ladders: push up on one to climb it, or down while standing on its top.
    const ltx = Math.floor(w.x / T);
    const lc = ltx * T + T / 2;
    if (Math.abs(w.x - lc) < 16) {
      const onBody = this.ladder(ltx, Math.floor((w.y - 10) / T)) || this.ladder(ltx, Math.floor((w.y - 50) / T));
      const footTy = Math.floor((w.y + 2) / T);
      if (inp.moveY < -0.5 && onBody) this.climbing = true;
      else if (inp.moveY > 0.5 && w.onGround && this.ladderTop(ltx, footTy) && Math.abs(inp.moveX) < 0.5) {
        this.climbing = true;
        w.y += 6;
      }
      if (this.climbing) {
        w.x = lc;
        w.vx = w.vy = 0;
        w.onGround = false;
      }
    }
  }

  private updateClimb(dt: number, inp: InteriorInput, jumpPressed: boolean, ev: InteriorEvent[]): void {
    const w = this.walker;
    const tx = Math.floor(w.x / T);
    w.x += (tx * T + T / 2 - w.x) * Math.min(1, dt * 12);
    if (Math.abs(inp.moveX) > 0.2) w.face = inp.moveX > 0 ? 1 : -1;
    const dir = Math.abs(inp.moveY) > 0.25 ? Math.sign(inp.moveY) : 0;
    // Step off sideways where the ladder passes a floor.
    if (Math.abs(inp.moveX) > 0.6 && dir === 0) {
      const fy = Math.round(w.y / T) * T;
      const under = this.ch(Math.floor((w.x + Math.sign(inp.moveX) * T) / T), fy / T);
      if (Math.abs(w.y - fy) < 14 && (under === '#' || under === '=')) {
        w.y = fy;
        this.climbing = false;
        w.onGround = true;
        return;
      }
    }
    w.vx = 0;
    w.vy = dir * CLIMB;
    const ny = w.y + w.vy * dt;
    w.pose = 'climb';
    w.climbPhase += (w.vy * dt) / 26;
    if (jumpPressed) {
      // Hop off sideways.
      this.climbing = false;
      w.vy = -380;
      w.vx = (Math.abs(inp.moveX) > 0.2 ? Math.sign(inp.moveX) : w.face) * 240;
      this.fallFrom = w.y;
      ev.push({ type: 'jump' });
      return;
    }
    if (dir < 0) {
      // Up: stop under a ceiling; step off the top onto the floor above.
      if (this.rectHits(w.x - HALF_W, ny - HEIGHT, w.x + HALF_W, ny - HEIGHT + 1)) return;
      const topTy = Math.floor((w.y - 1) / T);
      if (this.ladderTop(tx, topTy) && ny <= topTy * T) {
        w.y = topTy * T;
        this.climbing = false;
        w.onGround = true;
        w.pose = 'stand';
        return;
      }
      w.y = ny;
    } else if (dir > 0) {
      // Down: land on the floor at the bottom.
      if (this.rectHits(w.x - HALF_W, ny - 1, w.x + HALF_W, ny)) {
        w.y = Math.floor(ny / T) * T;
        this.climbing = false;
        w.onGround = true;
        w.pose = 'stand';
        return;
      }
      w.y = ny;
    }
    // Climbed off the bottom of the ladder into open air: let go.
    if (!this.ladder(tx, Math.floor((w.y - 10) / T)) && !this.ladder(tx, Math.floor((w.y - 50) / T))) {
      this.climbing = false;
      this.fallFrom = w.y;
    }
    w.onGround = false;
  }

  private onGrating(): boolean {
    const w = this.walker;
    const ty = Math.floor((w.y + 2) / T);
    for (let tx = Math.floor((w.x - HALF_W) / T); tx <= Math.floor((w.x + HALF_W - 0.01) / T); tx++) if (this.ch(tx, ty) === '=') return true;
    return false;
  }

  private updateGrapple(dt: number, inp: InteriorInput, jumpPressed: boolean, collectTap: boolean, ev: InteriorEvent[]): void {
    const w = this.walker;
    const g = this.grapple!;
    const a = this.anchors[g.to];
    g.t += dt;
    if (g.phase === 'draw' || g.phase === 'fly' || g.phase === 'reel') {
      // Reaching back for the harpoon, firing it, and reeling the spear back in: the
      // walker moves as usual meanwhile (a little slower while aiming).
      this.updateWalk(dt, { ...inp, moveX: g.phase === 'reel' ? inp.moveX : inp.moveX * 0.4 }, g.phase === 'reel' && jumpPressed, ev);
      w.hangTo = g.phase === 'reel' ? null : a;
      if (g.phase === 'draw') {
        if (g.t > GRAPPLE_DRAW * 0.45) w.spear = 'hand';
        if (g.t >= GRAPPLE_DRAW) {
          g.phase = 'fly';
          g.t = 0;
          ev.push({ type: 'grapple' });
        }
      } else if (g.phase === 'fly') {
        if (g.t >= GRAPPLE_FLY) {
          // The spear bites and the line reels in hard, lifting you off your feet: short
          // enough that the bottom of the swing clears the floor under the ring.
          const gx = w.x;
          const gy = w.y - GRIP;
          const d = Math.hypot(gx - a.x, gy - a.y);
          let floor = a.y + T;
          while (floor < this.H * T && !this.solidTile(Math.floor(a.x / T), Math.floor(floor / T)) && !'=~'.includes(this.ch(Math.floor(a.x / T), Math.floor(floor / T)))) floor += T / 2;
          floor = Math.floor(floor / T) * T;
          g.maxLen = Math.max(60, Math.min(GRAPPLE_RANGE, floor - a.y - GRIP - 48));
          g.len = Math.max(60, d);
          g.want = Math.max(60, Math.min(g.maxLen, d - 18));
          g.phase = 'swing';
          g.t = 0;
          w.onGround = false;
          this.climbing = false;
        }
      } else if (g.t >= GRAPPLE_REEL) {
        this.dropGrapple();
        w.spear = 'back';
      }
      return;
    }
    // ---- Swinging: a pendulum on the line ----
    if (jumpPressed || collectTap) {
      // Let go: keep the swing's speed, with a little hop when jumping off.
      if (jumpPressed) {
        w.vy = Math.min(w.vy, 120) - 240;
        w.vx *= 1.08;
      }
      this.flingT = 1.1;
      this.releaseLine(g);
      return;
    }
    if (Math.abs(inp.moveX) > 0.15) w.face = inp.moveX > 0 ? 1 : -1;
    if (inp.moveY < -0.5) g.want = Math.max(60, g.want - SWING_CLIMB * dt);
    else if (inp.moveY > 0.5) g.want = Math.min(g.maxLen, g.want + SWING_CLIMB * dt);
    // The line reels in fast towards the length wanted, and pays out at climbing speed.
    g.len = g.len > g.want ? Math.max(g.want, g.len - 760 * dt) : Math.min(g.want, g.len + SWING_CLIMB * dt);
    let vx = w.vx + inp.moveX * SWING_PUMP * dt;
    let vy = w.vy + GRAVITY * dt;
    const drag = 1 - 0.12 * dt;
    vx *= drag;
    vy *= drag;
    let nx = w.x + vx * dt;
    let ny = w.y + vy * dt;
    // The line: the hands can't get further from the ring than its length.
    const dx = nx - a.x;
    const dy = ny - GRIP - a.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > g.len) {
      const ux = dx / d;
      const uy = dy / d;
      nx = a.x + ux * g.len;
      ny = a.y + uy * g.len + GRIP;
      const vr = vx * ux + vy * uy;
      if (vr > 0) {
        vx -= vr * ux;
        vy -= vr * uy;
      }
    }
    const sp = Math.hypot(vx, vy);
    if (sp > SWING_MAX) {
      vx *= SWING_MAX / sp;
      vy *= SWING_MAX / sp;
    }
    // Walls and floors: slide along them; touching the floor lets go of the line.
    const hit = (x: number, y: number) => this.rectHits(x - HALF_W, y - HEIGHT, x + HALF_W, y - 1);
    if (hit(nx, ny)) {
      if (!hit(nx, w.y)) {
        if (vy > 0) {
          w.x = nx;
          w.vx = vx;
          w.vy = 0;
          w.onGround = true;
          this.releaseLine(g);
          return;
        }
        ny = w.y;
        vy = 0;
      } else if (!hit(w.x, ny)) {
        nx = w.x;
        vx = -vx * 0.25;
      } else {
        nx = w.x;
        ny = w.y;
        vx = vy = 0;
      }
    }
    w.x = nx;
    w.y = ny;
    w.vx = vx;
    w.vy = vy;
    w.onGround = false;
    w.pose = 'hang';
    w.hangTo = a;
    // The body hangs along the line.
    const bx = w.x - a.x;
    const by = w.y - GRIP - a.y;
    w.swingAngle = Math.atan2(-bx, Math.max(1, by));
    this.fallFrom = w.y;
  }

  /**
   * The harpoon in the hand, its line and the spear: flying out to the ring,
   * stuck in it while you swing, and reeling back when you let go.
   */
  private drawGrapple(g: NonNullable<Interior['grapple']>): void {
    const w = this.walker;
    const a = this.anchors[g.to];
    const f = this.front;
    const swinging = g.phase === 'swing';
    // Where the hands are: on the line while swinging, else the near hand.
    const hand = swinging ? { x: w.x - Math.sin(w.swingAngle ?? 0) * 0, y: w.y - GRIP } : w.hand();
    if (swinging) {
      const bx = w.x - a.x;
      const by = w.y - GRIP - a.y;
      const d = Math.hypot(bx, by) || 1;
      hand.x = a.x + (bx / d) * Math.min(d, g.len);
      hand.y = a.y + (by / d) * Math.min(d, g.len);
    }
    if (g.phase === 'draw' && w.spear !== 'hand') return;
    // Aim: from the hand to the ring (reeling, back towards the hand).
    let tip = { x: a.x, y: a.y };
    if (g.phase === 'draw') tip = { x: hand.x + (a.x - hand.x) * 0.04, y: hand.y + (a.y - hand.y) * 0.04 };
    else if (g.phase === 'fly') {
      const k = Math.min(1, g.t / GRAPPLE_FLY);
      tip = { x: hand.x + (a.x - hand.x) * k, y: hand.y + (a.y - hand.y) * k };
    } else if (g.phase === 'reel') {
      const k = Math.min(1, g.t / GRAPPLE_REEL);
      const e = k * k;
      tip = { x: g.from.x + (hand.x - g.from.x) * e, y: g.from.y + (hand.y - g.from.y) * e };
    }
    const ang = Math.atan2(tip.y - hand.y, tip.x - hand.x);
    const cx = Math.cos(ang);
    const cy = Math.sin(ang);
    // The line (slack reeling back, taut otherwise).
    if (g.phase !== 'draw') {
      if (g.phase === 'reel') {
        const mx = (hand.x + tip.x) / 2;
        const my = (hand.y + tip.y) / 2 + 14 * (1 - g.t / GRAPPLE_REEL);
        f.moveTo(hand.x, hand.y).quadraticCurveTo(mx, my, tip.x, tip.y).stroke({ color: 0xd8c890, width: 1.6 });
      } else f.moveTo(hand.x, hand.y).lineTo(tip.x, tip.y).stroke({ color: 0xd8c890, width: 2 });
    }
    // The harpoon's white stock and chrome barrel in the hand, pointing at the ring.
    const sx = hand.x - cx * 6;
    const sy = hand.y - cy * 6;
    f.moveTo(sx - cx * 10, sy - cy * 10).lineTo(sx + cx * 8, sy + cy * 8).stroke({ color: 0xd8dde0, width: 5, cap: 'round' });
    f.moveTo(sx + cx * 8, sy + cy * 8).lineTo(sx + cx * 18, sy + cy * 18).stroke({ color: 0x4d5d77, width: 2.2 });
    // The spear: a chrome shaft and barbed head.
    const back = 16;
    f.moveTo(tip.x - cx * back, tip.y - cy * back).lineTo(tip.x, tip.y).stroke({ color: 0x8e979c, width: 1.6 });
    f.poly([tip.x + cx * 6, tip.y + cy * 6, tip.x - cy * 3.2, tip.y + cx * 3.2, tip.x + cy * 3.2, tip.y - cx * 3.2]).fill({ color: 0xd6e0ee });
  }
  private front = new Graphics();
  private callFrom = 0;
  /** Ride a lift from where the walker stands to (x, y): the base's lifts (no gates, the car comes to you). */
  startRide(x: number, y: number): void {
    const w = this.walker;
    this.dropGrapple();
    this.climbing = false;
    this.ride = { steps: ['close', 'move', 'open2'], i: 0, t: 0, carX0: w.x, carX1: x, y0: w.y, y1: y, inX: w.x, outX: x, gate0: null, gate1: null, width: 92, walkFrom: w.x };
    this.callFrom = w.y;
  }
  get riding(): boolean {
    return !!this.ride;
  }

  private updateRide(dt: number, ev: InteriorEvent[]): void {
    const w = this.walker;
    const r = this.ride!;
    const step = r.steps[r.i];
    r.t += dt;
    const moveDur = Math.max(1.4, Math.abs(r.y1 - r.y0) / 240);
    // Stepping in and out takes as long as the walk (at an easy 150 a second).
    if ((step === 'in' || step === 'out') && r.t <= dt) r.walkFrom = w.x;
    const walkDur = Math.max(0.25, Math.abs((step === 'in' ? r.inX : r.outX) - r.walkFrom) / 150);
    const dur = step === 'move' ? moveDur : step === 'call' ? Math.max(1, Math.abs(this.callFrom - r.y0) / 320) : step === 'in' || step === 'out' ? walkDur : 0.42;
    const k = Math.min(1, r.t / dur);
    const ease = k * k * (3 - 2 * k);
    w.vy = 0;
    w.onGround = true;
    w.pose = 'stand';
    w.vx = 0;
    // The walker steps in and out; otherwise stands still on the car's floor.
    const walkTo = (x: number) => {
      const nx = r.walkFrom + (x - r.walkFrom) * k;
      w.vx = (nx - w.x) / Math.max(0.001, dt);
      if (k < 1) {
        w.pose = 'walk';
        w.face = x > r.walkFrom ? 1 : -1;
      } else w.vx = 0;
      w.x = nx;
    };
    if (step === 'call') this.carY = this.callFrom + (r.y0 - this.callFrom) * ease;
    else if (step === 'open') this.gateOpen[0] = ease;
    else if (step === 'in') walkTo(r.inX);
    else if (step === 'close') {
      if (r.gate0) this.gateOpen[0] = 1 - ease;
      this.carLit = ease;
    } else if (step === 'move') {
      w.y = r.y0 + (r.y1 - r.y0) * ease;
      w.x = r.carX0 + (r.carX1 - r.carX0) * ease;
      this.carY = w.y;
      // A little judder as the car runs.
      w.y += Math.sin(this.time * 31) * 0.6 * Math.sin(Math.PI * k);
    } else if (step === 'open2') {
      if (r.gate1) this.gateOpen[1] = ease;
      this.carLit = 1 - ease * 0.6;
    } else if (step === 'out') walkTo(r.outX);
    else if (step === 'close2') this.gateOpen[1] = 1 - ease;
    if (k >= 1) {
      if (step === 'move') {
        w.y = r.y1;
        ev.push({ type: 'lift' });
      }
      r.i++;
      r.t = 0;
      if (r.i >= r.steps.length) {
        this.ride = null;
        this.carLit = 0.4;
        this.gateOpen = [0, 0];
        this.lastSafe = { x: w.x, y: w.y };
        this.fallFrom = 0;
        if (!r.gate0) this.carLit = 0;
      }
    }
  }
  private carLit = 0;

  /** The lift car, its cable and the gates (Corvina), drawn behind and in front of the walker. */
  private drawLift(d: Graphics, de: Graphics, f: Graphics): void {
    const r = this.ride;
    const ups = this.spots.filter((s) => s.ch === 'U');
    let carX: number | null = null;
    let floorY = 0;
    let width = 3 * T - 8;
    let shaftTop = 0;
    if (ups.length === 2) {
      // The Corvina: the car always shows, waiting at a stop when no one rides it.
      carX = ups[0].x + 3 * T;
      if (this.carY === null) this.carY = Math.max(ups[0].y, ups[1].y);
      floorY = this.carY;
      shaftTop = Math.min(ups[0].y, ups[1].y) - 3 * T;
    }
    if (r && !r.gate0) {
      carX = this.walker.x;
      floorY = this.walker.y;
      width = r.width;
      shaftTop = Math.min(r.y0, r.y1) - 3 * T - 40;
    }
    // Gates: steel bars sliding up into the frame.
    if (ups.length === 2)
      ups.forEach((u) => {
        const open = r ? (r.gate0 && Math.abs(r.gate0.y - u.y) < 2 ? this.gateOpen[0] : r.gate1 && Math.abs(r.gate1.y - u.y) < 2 ? this.gateOpen[1] : 0) : 0;
        const gx = (u.tx + 1) * T;
        const top = u.y - 3 * T;
        const h = 3 * T * (1 - open);
        if (this.sanctum) {
          // A curtain of light that draws up like a veil.
          de.rect(gx + 8, top, T - 16, h).fill({ color: 0x5ff0ff, alpha: 0.35 });
          de.rect(gx + 18, top, 4, h).fill({ color: 0xe8fbff, alpha: 0.6 });
        } else {
          for (let b = 0; b < 4; b++) f.rect(gx + 6 + b * 8, top, 3, h).fill({ color: 0x8a8e90 });
          f.rect(gx + 2, top + h - 5, T - 4, 5).fill({ color: 0xc9a24a });
        }
        // The call panel's lamp: green when the car waits here.
        const here = this.carY !== null && Math.abs(this.carY - u.y) < 2;
        de.circle(u.x - T / 2 + 12, u.y - 26, 3).fill({ color: !this.power ? 0x3a2020 : here ? 0x9ae070 : 0xd8902e });
      });
    if (carX === null) {
      this.carLight.intensity = 0;
      return;
    }
    const half = width / 2;
    const ch = 3 * T - 10;
    const top = floorY - ch;
    if (this.sanctum) {
      // The sanctum's lift: a disc of pale stone riding the column of light, with a ring of light round it.
      d.ellipse(carX, floorY + 2, half + 6, 8).fill({ color: 0x9a9eb8 });
      f.ellipse(carX, floorY - 1, half + 2, 5).fill({ color: 0xc8cce0 });
      de.ellipse(carX, floorY + 6, half, 4).stroke({ color: 0x5ff0ff, width: 2, alpha: 0.9 });
      de.ellipse(carX, floorY - 40, half - 8, 50).stroke({ color: 0xa27cff, width: 1.2, alpha: 0.25 + 0.5 * this.carLit });
      this.carLight.x = carX;
      this.carLight.y = floorY - 30;
      this.carLight.color = [0.5, 0.8, 1];
      this.carLight.intensity = 0.6 + 0.6 * this.carLit;
      return;
    }
    // The cable up to the head of the shaft.
    d.moveTo(carX, shaftTop).lineTo(carX, top - 6).stroke({ color: 0x8e979c, width: 2 });
    // Back of the car: a dark cage wall with ribs, the roof and the floor.
    d.rect(carX - half, top, width, ch).fill({ color: 0x2c3234, alpha: 0.92 });
    for (let x = carX - half + 10; x < carX + half - 4; x += 14) d.rect(x, top + 8, 2, ch - 14).fill({ color: 0x3e4648 });
    d.rect(carX - half - 3, top - 8, width + 6, 9).fill({ color: 0x5a554c });
    d.rect(carX - half - 3, top - 8, width + 6, 2).fill({ color: 0xc9a24a, alpha: 0.8 });
    d.roundRect(carX - 10, top - 16, 20, 9, 3).fill({ color: 0x3a3e40 });
    // In front of the walker: the floor plate, the side posts and a waist-high rail.
    f.rect(carX - half - 3, floorY - 6, width + 6, 9).fill({ color: 0x6a6e70 });
    f.rect(carX - half - 3, floorY - 6, width + 6, 2).fill({ color: 0x9aa0a2 });
    f.rect(carX - half - 3, top - 4, 5, ch + 2).fill({ color: 0x6a6e70 });
    f.rect(carX + half - 2, top - 4, 5, ch + 2).fill({ color: 0x6a6e70 });
    f.rect(carX - half, floorY - 46, width, 3).fill({ color: 0x8a8e90, alpha: 0.9 });
    // The car's lamp: on while riding.
    const lit = this.power || !!this.hooks ? this.carLit : 0;
    de.roundRect(carX - 7, top - 3, 14, 4, 1.5).fill({ color: lit > 0.05 ? 0xfff0c8 : 0x4a4e50, alpha: 0.4 + 0.6 * lit });
    this.carLight.x = carX;
    this.carLight.y = top + 14;
    this.carLight.color = [1, 0.92, 0.7];
    this.carLight.intensity = 1.2 * lit;
  }

  /** Stop grappling at once (a vent's blast, the bilge, being put somewhere): the harpoon is back on the pack. */
  private dropGrapple(): void {
    this.grapple = null;
    this.walker.spear = 'back';
    this.walker.swingAngle = null;
  }

  /** Let go of the line: the spear pulls free and reels back to the harpoon. */
  private releaseLine(g: NonNullable<Interior['grapple']>): void {
    const a = this.anchors[g.to];
    g.phase = 'reel';
    g.t = 0;
    g.from = { x: a.x, y: a.y };
    this.walker.swingAngle = null;
    this.walker.hangTo = null;
    if (!this.walker.onGround) this.walker.pose = this.walker.vy < 0 ? 'jump' : 'fall';
  }

  // ---------------------------------------------------------------------------

  private render(dt: number): void {
    const w = this.walker;
    w.animate(dt);
    // Camera: follow with a little look-ahead, clamped to the level.
    const f = this.focus;
    // Milestone 9: tending a tank, the camera eases in on it (beside the care panel).
    this.viewNow += ((f ? f.h : this.viewH) - this.viewNow) * (1 - Math.exp(-4 * dt));
    const viewH = this.viewNow;
    const zoom = this.cssH / viewH;
    const viewW = this.cssW / zoom;
    let lx = w.x + w.face * 120 + w.vx * 0.2 - viewW / 2;
    // In the base the floor sits low on screen (rooms are what you look at, not the water below).
    let ly = this.hooks ? w.y - viewH * 0.7 : w.y - 60 - viewH / 2;
    if (f) {
      lx = f.x - viewW / 2 + f.panelPx / zoom / 2;
      ly = f.y - viewH / 2;
    }
    const k = 1 - Math.exp(-(f ? 3.5 : 5) * dt);
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
    this.front.clear();
    if (this.grapple) this.drawGrapple(this.grapple);
    if (this.sanctum) this.animateSanctum(d, de);
    if (this.opts.animate) this.opts.animate(d, de, this.time);
    if (this.hooks) {
      de.clear();
      this.hooks.animate(d, de, this.time, { x0: this.cam.x, y0: this.cam.y, x1: this.cam.x + viewW, y1: this.cam.y + viewH });
      this.hooks.tick?.(dt, this.time, this.cam.x, this.cam.x + viewW);
    }
    this.drawLift(d, de, this.front);
    // Lights: lamps (with power), the emergency lamps, and the helmet lamp's beam.
    // The beam starts at the shoulder lamp (the same lamp as the diver's).
    w.lampOn = this.lampOn;
    const lamp = w.lampPoint();
    this.headLamp.x = lamp.x;
    this.headLamp.y = lamp.y;
    this.headLamp.dirX = w.face * 0.97;
    this.headLamp.dirY = 0.24;
    this.lampGain += ((this.focus?.lampGain ?? 1) - this.lampGain) * (1 - Math.exp(-dt * 8));
    this.headLamp.intensity = this.lampOn ? 1.6 * this.lampGain : 0;
    if (this.hooks)
      for (const l of this.lamps) {
        const on = this.hooks.powered(l.zone);
        l.core.visible = l.halo.visible = on;
        l.light.intensity = on ? 1.05 : 0;
      }
    // The nearest lights win (the shader adds up at most MAX_LIGHTS).
    const cx = this.cam.x + viewW / 2;
    const cy = this.cam.y + viewH / 2;
    const pool = [this.carLight, ...this.lamps.map((l) => l.light), ...(this.hooks ? this.hooks.lights() : this.power ? [] : this.emergency), ...(this.opts.lights ? this.opts.lights() : [])].filter(
      (l) => l.intensity > 0 && Math.abs(l.x - cx) < viewW / 2 + l.radius && Math.abs(l.y - cy) < viewH / 2 + l.radius,
    );
    pool.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
    // G2: the helmet lamp and the nearest few room lamps cast shadows through the walls.
    this.headLamp.shadow = true;
    pool.forEach((l, i) => (l.shadow = i < 2));
    const lights: Light[] = [this.headLamp, ...pool.slice(0, MAX_LIGHTS - 1)];
    this.lighting.update({
      time: this.time,
      camX: this.cam.x,
      camY: this.cam.y,
      viewW,
      viewH,
      cssW: this.cssW,
      cssH: this.cssH,
      ambient: this.hooks ? [0.3, 0.32, 0.34] : this.sanctum ? [0.26, 0.25, 0.38] : this.power ? [0.46, 0.44, 0.42] : [0.16, 0.17, 0.2],
      lights,
      shadowLights: this.look.shadowLights,
      shadowSteps: this.look.shadowSteps,
      relief: this.look.relief,
    });
    perf.lights = lights.length;
    perf.pass('lit', () => this.renderer.render({ container: this.litRoot, target: this.sceneRT, clear: true, clearColor: [0, 0, 0, 0] }));
    perf.pass('glow', () => this.renderer.render({ container: this.glowCam, target: this.glowRT, clear: true, clearColor: [0, 0, 0, 0] }));
  }

  /** For tests and the sound: where the walker is. */
  get pos(): { x: number; y: number; onGround: boolean; climbing: boolean } {
    return { x: this.walker.x, y: this.walker.y, onGround: this.walker.onGround, climbing: this.climbing };
  }
}
