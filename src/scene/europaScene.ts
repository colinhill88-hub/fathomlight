import { Container, FillGradient, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { BELL_AT, EUROPA_CREATURES, EUROPA_SPOTS, GLYPHS, isPresent, KIN_GATES, kinLight, kinRestored, type EuropaSpecies } from '../game/europa';
import type { SaveData } from '../game/state';
import { mulberry32 } from '../rng';
import { ABYSS, BRINE_POOLS, ceilY, DEAD_VENTS, EUROPA_W, FLOE_X0, FLOE_X1, FLOES, floorY, HEARTH, ICE_WALL_X, LANDER, OPEN, PASSAGE, SKYLIGHT } from '../world/europaTerrain';

/**
 * Beyond Earth (Nov 27, 2026): Europa's first biome, "Under the ice", drawn in code.
 *
 * Its own scene, shown in place of the Earth ocean (like the wreck interiors). The Earth
 * lighting shader isn't used here: the art is painted dark and cold, and Kestrel's lamp and
 * the creatures' glow are added on top (additive light), so the lamp is what reveals it.
 *
 * Colours: ice in blue-whites, the seabed in cold grey-blue silt, the lander in the base kit's
 * Victorian gunmetal and brass with amber portholes. Europa's life glows icy white and pale
 * blue-green (Colin, Nov 27, 2026); the Choir kin's glyphs keep a faint Choir cyan and violet.
 */

const INK = 0x0c1418;
const ICE_DEEP = 0x1c3550;
const ICE = 0x3d6a8a;
const ICE_HI = 0xa8d4ea;
const SILT = 0x1f2a33;
const SILT_HI = 0x34434e;
const BRINE = 0x2e5560;
const STEEL = 0x2f373b;
const STEEL_LIGHT = 0x58656b;
const BRASS = 0xb8913e;
const BRASS_HI = 0xe8c878;
const AMBER = 0xffc46a;
const GLOW_WHITE = 0xe8fbff;
const GLOW_TEAL = 0x9ff2dc;

const BG_GRAD = new FillGradient({
  type: 'linear',
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
  colorStops: [
    { offset: 0, color: 0x0d2433 },
    { offset: 1, color: 0x04090e },
  ],
  textureSpace: 'local',
});

/** Soft light textures, drawn once on a canvas: a round glow and a lamp beam that fades along its length and to its edges. */
function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): Texture {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!);
  return Texture.from(cv);
}
let glowTex: Texture | null = null;
let beamTex: Texture | null = null;
function softGlow(): Texture {
  glowTex ??= canvasTexture(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });
  return glowTex;
}
function softBeam(): Texture {
  beamTex ??= canvasTexture(256, 128, (c) => {
    // Brightest at the lamp (left), fading along the beam; soft at the edges of the cone.
    for (let x = 0; x < 256; x++) {
      const u = x / 255;
      const half = 6 + u * 58;
      const a = Math.pow(1 - u, 1.6);
      const g = c.createLinearGradient(0, 64 - half, 0, 64 + half);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(x, 64 - half, 1, half * 2);
    }
  });
  return beamTex;
}

const SKY_GRAD = new FillGradient({
  type: 'linear',
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
  colorStops: [
    { offset: 0, color: 0x01030a },
    { offset: 0.8, color: 0x0a1424 },
    { offset: 1, color: 0x1a2a3e },
  ],
  textureSpace: 'local',
});
const WARM_GRAD = new FillGradient({
  type: 'linear',
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
  colorStops: [
    { offset: 0, color: 0x0d2433 },
    { offset: 1, color: 0x5a3220 },
  ],
  textureSpace: 'local',
});
const SURFACE_GLOW = new FillGradient({
  type: 'linear',
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
  colorStops: [
    { offset: 0, color: 0x6a90a8 },
    { offset: 1, color: 0x0d2433 },
  ],
  textureSpace: 'local',
});

interface Moth {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  view: Container;
  glow: Graphics;
}
interface Horn {
  x: number;
  pool: number;
  dir: number;
  phase: number;
  view: Container;
  glow: Graphics;
}

/** What the scene needs to draw a floe ray. */
export interface RayLook {
  x: number;
  y: number;
  facing: number;
  /** -1..1: nose down to nose up. */
  pitch: number;
  /** 0..1: how hard it is swimming (faster wingbeats). */
  effort: number;
  gear: string[];
}

/**
 * A floe ray, drawn in code: seen from a little above and to the side, a broad slate-and-white
 * body with wings that beat slowly, a long thin tail, and pale blue-green lights along the wing
 * edges. Its organic gear sits on it: a woven frond saddle and pouch, a translucent air bladder,
 * a rime crest on its brow, a glowing gland.
 */
export class RayView {
  readonly view = new Container();
  readonly glow = new Container();
  private readonly body = new Graphics();
  private readonly wingNear = new Graphics();
  private readonly wingFar = new Graphics();
  private readonly gearG = new Graphics();
  private readonly lights = new Graphics();
  private gearSig = '-';
  private t = Math.random() * 10;

  constructor() {
    this.view.addChild(this.wingFar, this.body, this.gearG, this.wingNear);
    this.glow.addChild(this.lights);
    // The wings: one broad diamond seen a little from above, slate on top with a pale underside
    // showing along the lower edge. They flex (scale y) as it swims. The far half sits behind the body.
    const up = this.wingFar;
    up.moveTo(108, -2).bezierCurveTo(60, -40, 0, -96, -40, -100).bezierCurveTo(-40, -60, -80, -20, -112, -2).closePath();
    up.fill({ color: 0x41515c }).stroke({ color: INK, width: 2 });
    up.moveTo(70, -14).bezierCurveTo(30, -40, -10, -70, -34, -86).stroke({ color: 0x6c7e8a, width: 2, alpha: 0.6 });
    const dn = this.wingNear;
    dn.moveTo(108, 2).bezierCurveTo(60, 40, 0, 96, -40, 100).bezierCurveTo(-40, 60, -80, 20, -112, 2).closePath();
    dn.fill({ color: 0x52626e }).stroke({ color: INK, width: 2 });
    dn.moveTo(96, 8).bezierCurveTo(50, 40, 0, 84, -36, 92).bezierCurveTo(-30, 70, -40, 50, -60, 34).closePath();
    dn.fill({ color: 0xe6eef0, alpha: 0.32 });
    // The body ridge down the middle, the head with its eyes and two curled horn-fins, and the tail.
    const b = this.body;
    b.ellipse(0, 0, 104, 18).fill({ color: 0x4a5a66 }).stroke({ color: INK, width: 2 });
    b.ellipse(10, -6, 80, 7).fill({ color: 0x6c7e8a, alpha: 0.6 });
    b.circle(92, -7, 3.6).fill({ color: 0x0c1418 });
    b.circle(93, -8, 1.2).fill({ color: 0xffffff });
    for (const sy of [-1, 1]) b.moveTo(104, sy * 6).quadraticCurveTo(126, sy * 10, 122, sy * 20).stroke({ color: 0x4a5a66, width: 4, cap: 'round' });
    b.moveTo(-104, 0).quadraticCurveTo(-180, 8, -250, -4).stroke({ color: 0x4a5a66, width: 4, cap: 'round' });
    b.moveTo(-250, -4).lineTo(-262, -8).stroke({ color: 0x4a5a66, width: 2, cap: 'round' });
  }

  update(dt: number, look: RayLook): void {
    this.t += dt * (1.2 + look.effort * 2.4);
    const flap = Math.sin(this.t * 2.2);
    // Wingbeats: the wings flex in turn, the near one a little more (it is closer to us).
    this.wingNear.scale.y = 0.55 + 0.45 * flap;
    this.wingFar.scale.y = 0.55 - 0.4 * flap;
    for (const c of [this.view, this.glow]) {
      c.position.set(look.x, look.y);
      c.scale.set(look.facing < 0 ? -0.8 : 0.8, 0.8);
      c.rotation = look.facing * look.pitch * 0.35;
    }
    this.lights.scale.y = this.wingNear.scale.y;
    const sig = look.gear.join(',');
    if (sig !== this.gearSig) {
      this.gearSig = sig;
      this.drawGear(look.gear);
    }
    this.lights.alpha = 0.7 + 0.3 * Math.sin(this.t * 1.3);
  }

  private drawGear(gear: string[]): void {
    const g = this.gearG.clear();
    const l = this.lights.clear();
    for (let k = 0; k < 6; k++) l.circle(80 - k * 22, 24 + k * 13, 2.6).fill({ color: GLOW_TEAL });
    l.circle(0, 10, 90).fill({ color: GLOW_TEAL, alpha: 0.05 });
    if (gear.includes('saddle')) {
      g.roundRect(-30, -30, 60, 18, 8).fill({ color: 0xbfe0d4 }).stroke({ color: 0x5e7a6e, width: 1.6 });
      for (let x = -24; x <= 24; x += 8) g.moveTo(x, -30).lineTo(x + 4, -12).stroke({ color: 0x7fa898, width: 1.2 });
      g.roundRect(-20, -12, 26, 22, 8).fill({ color: 0xa8cfc0 }).stroke({ color: 0x5e7a6e, width: 1.4 });
    }
    if (gear.includes('bladder')) {
      g.ellipse(-60, -28, 26, 18).fill({ color: 0xd8f4ff, alpha: 0.4 }).stroke({ color: 0xeafaff, width: 1.6, alpha: 0.8 });
      g.ellipse(-68, -34, 8, 5).fill({ color: 0xffffff, alpha: 0.6 });
    }
    if (gear.includes('crest')) {
      for (let k = 0; k < 5; k++) g.poly([62 + k * 8, -12, 68 + k * 8, -12, 64 + k * 8, -34 - (k % 2) * 10]).fill({ color: 0xdff4ff }).stroke({ color: 0x8fb4c8, width: 1 });
    }
    if (gear.includes('gland')) {
      g.circle(100, -16, 8).fill({ color: 0xcff8ee }).stroke({ color: 0x5e8a80, width: 1.4 });
      l.circle(100, -16, 6).fill({ color: GLOW_TEAL });
      l.circle(100, -16, 40).fill({ color: GLOW_TEAL, alpha: 0.25 });
    }
  }
}

export class EuropaScene {
  readonly view = new Container();
  private readonly bg = new Graphics();
  private readonly world = new Container();
  private readonly sky = new Graphics();
  private readonly jupiter = new Container();
  private readonly far = new Container();
  private readonly surfaceGlow = new Container();
  private readonly terrain = new Graphics();
  private readonly objects = new Container();
  private readonly spotLayer = new Container();
  /** Kestrel's view is moved in here while on Europa. */
  readonly actors = new Container();
  private readonly light = new Container();
  private readonly lamp = new Container();
  private readonly beam = new Sprite();
  private readonly halo = new Sprite();
  private readonly aura = new Sprite();
  private readonly fg = new Graphics();
  private readonly dust = new Graphics();
  private readonly spotViews = new Map<string, Container>();
  private readonly glyphGlow: Graphics[] = [];
  private readonly moths: Moth[] = [];
  private readonly horns: Horn[] = [];
  private readonly habLights = new Graphics();
  private readonly modules = new Container();
  private readonly weldSpark = new Graphics();
  private modSig = '';
  private brokenSig = '';
  private brokenFloes = new Set<string>();
  /** Kestrel's floe ray, and two wild ones gliding in the floe field. */
  readonly ray = new RayView();
  private readonly wildRays: { view: RayView; x: number; y: number; dir: number; phase: number }[] = [];
  private readonly krill: { x: number; y: number; phase: number; g: Graphics }[] = [];
  private readonly current = new Graphics();
  /** Biome 3: the black-water band, the vents (and their warm light), the kin, and their gates. */
  private readonly blackWater = new Graphics();
  private readonly ventArt = new Graphics();
  private readonly ventGlow = new Container();
  private readonly kinG = new Graphics();
  private readonly gates = new Graphics();
  private ventSig = '';
  private ventsDrawn = false;
  /** A note the kin are singing (0..3), and how bright the flash still is. */
  private kinNote = -1;
  private kinNoteK = 0;
  private bgW = 0;
  private bgH = 0;
  private time = 0;

  constructor() {
    this.light.blendMode = 'add';
    this.world.addChild(this.sky, this.jupiter, this.surfaceGlow, this.far, this.terrain, this.objects, this.spotLayer, this.modules, this.actors, this.fg, this.light, this.dust);
    this.view.addChild(this.bg, this.world);
    this.view.visible = false;
    this.surfaceGlow.alpha = 0.45;
    this.drawStatic();
    this.drawTerrain();
    this.drawLander();
    this.objects.addChild(this.ventArt, this.ray.view, this.current);
    // The black water sits over the actors (it hides Kestrel too, unless the glow gland lights it).
    this.world.addChildAt(this.blackWater, this.world.getChildIndex(this.fg));
    this.light.addChild(this.ventGlow, this.kinG, this.gates);
    this.drawDeep();
    this.light.addChild(this.ray.glow);
    for (const [i, x] of [9800, 12600].entries()) {
      const v = new RayView();
      this.objects.addChild(v.view);
      this.light.addChild(v.glow);
      this.wildRays.push({ view: v, x, y: 500 + i * 300, dir: i ? -1 : 1, phase: i * 3 });
    }
    for (const x of [9250, 10250, 11500, 12300]) {
      const g = new Graphics();
      this.light.addChild(g);
      this.krill.push({ x, y: 160, phase: x * 0.01, g });
    }
    this.drawGlyphs();
    this.drawSpots();
    this.spawnCreatures();
    for (const sp of [this.beam, this.halo, this.aura]) {
      sp.texture = sp === this.beam ? softBeam() : softGlow();
      sp.anchor.set(sp === this.beam ? 0 : 0.5, 0.5);
    }
    this.beam.tint = 0xf6efd8;
    this.halo.tint = 0xf6efd8;
    this.aura.tint = 0xbfe8f0;
    this.lamp.addChild(this.aura, this.halo, this.beam);
    this.light.addChild(this.lamp, this.habLights, this.weldSpark);
  }

  get active(): boolean {
    return this.view.visible;
  }

  // ---------------------------------------------------------------------------
  // Static art.

  /** The parts that never change: the sky with Jupiter, the far parallax ice, the foreground icicles, and the glow past the wall. */
  private drawStatic(): void {
    const rand = mulberry32(0xe0e0a);
    // The sky over the open water (behind everything; the ice covers it wherever there is ice).
    const sky = this.sky;
    sky.rect(-600, -3200, EUROPA_W + 1200, 3200).fill(SKY_GRAD);
    for (let i = 0; i < 420; i++) sky.circle(-600 + rand() * (EUROPA_W + 1200), -3100 + rand() * 3050, 0.6 + rand() * 1.6).fill({ color: 0xf4f8ff, alpha: 0.35 + rand() * 0.55 });
    // Jupiter: huge and banded, low over the floe field. It sits in a slow parallax layer (see update)
    // so it hangs in the sky wherever Kestrel surfaces in the field.
    const jg = new Graphics();
    const jx = 0;
    const jy = -300;
    const jr = 380;
    jg.circle(jx, jy, jr + 40).fill({ color: 0xe8c9a0, alpha: 0.07 });
    jg.circle(jx, jy, jr).fill({ color: 0xd9b58a });
    const bands = [0xc49a6c, 0xe8d2b0, 0xb0805a, 0xf0e0c8, 0xb88c64, 0xe2c8a4, 0xa87452];
    bands.forEach((c, i) => {
      const y0 = jy - jr + (i + 0.6) * ((jr * 2) / (bands.length + 1));
      const half = Math.sqrt(Math.max(0, jr * jr - (y0 - jy) ** 2));
      jg.ellipse(jx, y0, half * 0.98, 16 + (i % 3) * 8).fill({ color: c, alpha: 0.75 });
    });
    jg.ellipse(jx + jr * 0.35, jy + jr * 0.3, 52, 28).fill({ color: 0xc0623e, alpha: 0.8 });
    // Day and night: a soft light crescent on the left, a darker one on the right, both inside the disc.
    const crescent = (side: number, inner: number, color: number, alpha: number) => {
      const pts: number[] = [];
      for (let k = 0; k <= 24; k++) {
        const a = -Math.PI / 2 + (k / 24) * Math.PI;
        pts.push(jx + side * Math.cos(a) * jr, jy + Math.sin(a) * jr);
      }
      for (let k = 24; k >= 0; k--) {
        const a = -Math.PI / 2 + (k / 24) * Math.PI;
        pts.push(jx + side * Math.cos(a) * jr * inner, jy + Math.sin(a) * jr);
      }
      jg.poly(pts).fill({ color, alpha });
    };
    crescent(-1, 0.55, 0xffffff, 0.07);
    crescent(1, 0.25, 0x000000, 0.3);
    crescent(1, 0.7, 0x000000, 0.2);
    this.jupiter.addChild(jg);
    // Only ever in the sky (above the water line), whatever the parallax does.
    const clip = new Graphics().rect(-1e5, -1e5, 2e5 + EUROPA_W, 1e5).fill({ color: 0xffffff });
    this.world.addChild(clip);
    this.jupiter.mask = clip;
    // Far parallax: hanging ice columns under the ice shelf, and a dim seabed ridge everywhere.
    const far = new Graphics();
    for (let i = 0; i < 24; i++) {
      const x = i * 255 + rand() * 120;
      const top = ceilY(x) - 200;
      const len = 180 + rand() * 360;
      far.poly([x - 40, top, x + 40, top, x + 8, top + len, x - 6, top + len]).fill({ color: 0x14283a, alpha: 0.7 });
    }
    for (let x = -400; x < EUROPA_W + 400; x += 40) {
      const y = floorY(Math.max(0, Math.min(EUROPA_W, x))) - 120 - Math.sin(x * 0.003) * 50;
      far.rect(x, y, 41, 900).fill({ color: 0x101c26, alpha: 0.75 });
    }
    this.far.addChild(far);
    // Light from the open sky, filtering down into the floe field's water.
    const shaft = new Graphics();
    shaft.rect(FLOE_X0 - 200, 0, FLOE_X1 - FLOE_X0 + 400, 700).fill(SURFACE_GLOW);
    this.surfaceGlow.addChild(shaft);
    // The glow past the wall, where the passage comes out.
    const seam = new Sprite(softGlow());
    seam.anchor.set(0.5);
    seam.tint = 0x8fdcff;
    seam.alpha = 0.2;
    seam.scale.set(520 / 128, 700 / 128);
    seam.position.set(PASSAGE.x1 - 300, PASSAGE.roof - 100);
    this.light.addChild(seam);
    // Foreground: a few dark icicle silhouettes under the ice shelf (drawn over the actors).
    for (let i = 0; i < 16; i++) {
      const x = 200 + rand() * (ICE_WALL_X - 400);
      const y = ceilY(x) - 10;
      this.fg.poly([x - 14, y, x + 14, y, x + 2, y + 60 + rand() * 90]).fill({ color: 0x08121a, alpha: 0.55 });
    }
  }

  /** The ice and the seabed; redrawn when the crest breaks something open. */
  private drawTerrain(): void {
    const g = this.terrain.clear();
    for (const c of g.removeChildren()) c.destroy();
    const rand = mulberry32(0xe0e0b);
    const STEP = 16;
    // The ice ceiling, in runs (it is open to the sky over the floe field and any broken skylight).
    const iceFill = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: 0x0a1a2a },
        { offset: 0.85, color: ICE_DEEP },
        { offset: 1, color: ICE },
      ],
      textureSpace: 'local',
    });
    const at = (x: number) => ceilY(Math.max(0, Math.min(EUROPA_W, x)));
    let run: number[] = [];
    const flush = (x: number) => {
      if (run.length >= 4) {
        g.poly([run[0], -3000, ...run, x, -3000]).fill(iceFill);
        for (let i = 2; i < run.length; i += 2) g.moveTo(run[i - 2], run[i - 1]).lineTo(run[i], run[i + 1]);
        g.stroke({ color: ICE_HI, width: 3, alpha: 0.35 });
      }
      run = [];
    };
    for (let x = -600; x <= EUROPA_W + 600; x += STEP) {
      const c = at(x);
      if (c === OPEN) flush(x - STEP);
      else run.push(x, c);
    }
    flush(EUROPA_W + 600);
    for (let i = 0; i < 70; i++) {
      const x = rand() * ICE_WALL_X;
      const y = ceilY(x);
      if (y === OPEN) continue;
      g.moveTo(x, y - 4).lineTo(x + (rand() - 0.5) * 40, y - 40 - rand() * 80).stroke({ color: ICE_HI, width: 1, alpha: 0.18 });
    }
    // The thin patch over biome 1 (lighter, cracked) until the crest breaks it; then a shaft up to the sky.
    if (ceilY(SKYLIGHT.x) !== OPEN) {
      const y = ceilY(SKYLIGHT.x);
      g.rect(SKYLIGHT.x - SKYLIGHT.half, y - 60, SKYLIGHT.half * 2, 60).fill({ color: ICE_HI, alpha: 0.28 });
      for (let k = -2; k <= 2; k++) g.moveTo(SKYLIGHT.x + k * 24, y).lineTo(SKYLIGHT.x + k * 30 + 10, y - 50).stroke({ color: 0xffffff, width: 1.2, alpha: 0.4 });
    } else this.waterLine(g, SKYLIGHT.x - SKYLIGHT.half, SKYLIGHT.x + SKYLIGHT.half);
    // Icicles under the shelf (decoration only: they never snag the diver). Long and thick in the icicle forest.
    for (let x = 140; x < ICE_WALL_X - 60; x += 18 + rand() * 30) {
      const forest = Math.max(0, 1 - Math.abs(x - 4500) / 600);
      if (rand() > 0.45 + forest * 0.5) continue;
      const y = ceilY(x) - 2;
      if (y === OPEN) continue;
      const len = 14 + rand() * 40 + forest * (60 + rand() * 120);
      const w = 4 + rand() * 6 + forest * 6;
      g.poly([x - w, y, x + w, y, x + w * 0.15, y + len]).fill({ color: ICE, alpha: 0.95 });
      g.poly([x - w * 0.6, y, x - w * 0.1, y, x, y + len * 0.8]).fill({ color: ICE_HI, alpha: 0.35 });
    }
    // The open water's surface over the floe field, and the floes floating on it.
    this.waterLine(g, FLOE_X0 - 60, FLOE_X1 + 200);
    for (const f of FLOES) {
      if (f.thin && this.brokenFloes.has(f.id)) continue;
      const x0 = f.x - f.w / 2;
      const x1 = f.x + f.w / 2;
      // A slab of ice: a lumpy snow top a little above the water, sides that slope in, and a
      // rough, rounded underside (most of a floe is under water).
      const pts: number[] = [];
      for (let x = x0 + 10; x <= x1 - 10; x += 18) pts.push(x, -20 - Math.sin(x * 0.04 + f.x) * 5 - rand() * 5);
      pts.push(x1 + 6, -4, x1 - 6, f.depth * 0.5);
      for (let x = x1 - 20; x >= x0 + 20; x -= 18) {
        const u = (x - x0) / f.w;
        pts.push(x, f.depth * (0.75 + 0.25 * Math.sin(u * Math.PI)) - rand() * 12);
      }
      pts.push(x0 + 6, f.depth * 0.5, x0 - 6, -4);
      g.poly(pts).fill({ color: f.thin ? 0x9fc4d8 : 0x5f8aa8, alpha: f.thin ? 0.72 : 0.96 }).stroke({ color: ICE_HI, width: 2, alpha: 0.45 });
      // The part above water: bright snow and a pale band at the waterline.
      const top: number[] = [];
      for (let i = 0; i < pts.length; i += 2) if (pts[i + 1] < 0) top.push(pts[i], pts[i + 1]);
      top.push(x1 + 6, 0, x0 - 6, 0);
      g.poly(top).fill({ color: 0xf2f8fc, alpha: 0.92 });
      g.rect(x0, -2, f.w, 6).fill({ color: 0xbfe4f0, alpha: 0.5 });
      if (f.thin) for (let k = 0; k < 4; k++) g.moveTo(x0 + 30 + k * 70, f.depth * 0.7).lineTo(x0 + 50 + k * 70, 0).stroke({ color: 0xffffff, width: 1.2, alpha: 0.5 });
      else g.ellipse(f.x - f.w * 0.15, f.depth * 0.45, f.w * 0.22, f.depth * 0.18).fill({ color: ICE_HI, alpha: 0.12 });
    }
    // The seabed: cold silt, with a lighter crust and pebbles.
    const floorPts: number[] = [-600, 4000];
    for (let x = -600; x <= EUROPA_W + 600; x += STEP) floorPts.push(x, floorY(Math.max(0, Math.min(EUROPA_W, x))));
    floorPts.push(EUROPA_W + 600, 4000);
    g.poly(floorPts).fill(SILT);
    for (let x = 0; x < EUROPA_W; x += STEP) g.moveTo(x, floorY(x)).lineTo(x + STEP, floorY(x + STEP));
    g.stroke({ color: SILT_HI, width: 5, alpha: 0.8 });
    for (let i = 0; i < 300; i++) {
      const x = rand() * EUROPA_W;
      g.ellipse(x, floorY(x) + 6 + rand() * 30, 3 + rand() * 7, 2 + rand() * 3).fill({ color: SILT_HI, alpha: 0.5 });
    }
    // The far shore of the floe field: ice rising out of the water.
    // Brine pools: a flat, glassy surface lying in the hollow.
    for (const p of BRINE_POOLS) {
      const top = Math.min(floorY(p.x - p.w / 2 - 40), floorY(p.x + p.w / 2 + 40)) + 6;
      const pts: number[] = [];
      for (let x = p.x - p.w / 2 - 50; x <= p.x + p.w / 2 + 50; x += 8) {
        const fy = floorY(x);
        if (fy > top) pts.push(x, Math.max(top, Math.min(fy, top + 400)));
      }
      if (pts.length < 6) continue;
      const poly = [pts[0], top, ...pts, pts[pts.length - 2], top];
      g.poly(poly).fill({ color: BRINE, alpha: 0.92 });
      g.moveTo(pts[0], top).lineTo(pts[pts.length - 2], top).stroke({ color: GLOW_TEAL, width: 2, alpha: 0.5 });
      for (const side of [-1, 1]) g.ellipse(p.x + side * (p.w / 2 + 20), floorY(p.x + side * (p.w / 2 + 20)) - 2, 46, 8).fill({ color: 0xd8e4e4, alpha: 0.45 });
    }
  }

  /** Biome 3's fixed art: the warm wash over the vent floor, and the black-water band. */
  private drawDeep(): void {
    const warm = new Graphics();
    warm.rect(ABYSS.x0, ABYSS.blackBottom, ABYSS.x1 - ABYSS.x0, ABYSS.floor - ABYSS.blackBottom + 200).fill(WARM_GRAD);
    warm.alpha = 0.55;
    this.surfaceGlow.addChild(warm);
    const b = this.blackWater;
    // Soft-edged: a solid core with fading bands above and below.
    for (let i = 0; i < 6; i++) {
      const e = i * 40;
      b.rect(ABYSS.x0 + 100, ABYSS.blackTop - 200 + e, ABYSS.x1 - ABYSS.x0 - 200, 40).fill({ color: 0x000000, alpha: (i + 1) / 7 });
      b.rect(ABYSS.x0 + 100, ABYSS.blackBottom + 160 - e, ABYSS.x1 - ABYSS.x0 - 200, 40).fill({ color: 0x000000, alpha: (i + 1) / 7 });
    }
    b.rect(ABYSS.x0 + 100, ABYSS.blackTop + 40, ABYSS.x1 - ABYSS.x0 - 200, ABYSS.blackBottom - ABYSS.blackTop + 120).fill({ color: 0x000000 });
  }

  /** The vents: cold grey chimneys, or rekindled ones glowing amber; the hearth always faintly warm. */
  private drawVents(lit: string[]): void {
    const g = this.ventArt.clear();
    for (const c of this.ventGlow.removeChildren()) c.destroy();
    const gl = new Graphics();
    this.ventGlow.addChild(gl);
    const soft = (x: number, y: number, r: number, tint: number, alpha: number) => {
      const sp = new Sprite(softGlow());
      sp.anchor.set(0.5);
      sp.tint = tint;
      sp.alpha = alpha;
      sp.scale.set((r * 2) / 128);
      sp.position.set(x, y);
      this.ventGlow.addChild(sp);
    };
    const chimney = (x: number, hot: boolean, h: number) => {
      const base = floorY(x);
      g.poly([x - 60, base + 20, x + 60, base + 20, x + 22, base - h, x - 22, base - h]).fill({ color: hot ? 0x3a2a22 : 0x2a3036 }).stroke({ color: INK, width: 2 });
      g.ellipse(x, base - h, 24, 8).fill({ color: hot ? 0xff9a40 : 0x15191c });
      if (hot) {
        gl.ellipse(x, base - h, 20, 7).fill({ color: 0xffb060, alpha: 0.9 });
        soft(x, base - h - 40, 200, 0xff8a3a, 0.45);
        soft(x, base - h - 10, 70, 0xffd090, 0.6);
      }
    };
    for (const v of DEAD_VENTS) chimney(v.x, lit.includes(v.id), 180);
    chimney(HEARTH.x, true, 260);
  }

  /** The kin sing a note (it flashes in them), during the song. */
  flashKin(note: number): void {
    this.kinNote = note;
    this.kinNoteK = 1;
  }

  /** The surface of open water: a pale line with a shimmer, seen from below. */
  private waterLine(g: Graphics, x0: number, x1: number): void {
    g.rect(x0, 0, x1 - x0, 4).fill({ color: 0xbfe4f0, alpha: 0.45 });
    g.rect(x0, 4, x1 - x0, 30).fill({ color: 0x7fb4c8, alpha: 0.12 });
  }

  private drawLander(): void {
    const x = LANDER.x;
    const top = ceilY(x);
    const g = new Graphics();
    // The bore shaft up through the ice: a dark tube with a brass liner.
    g.rect(x - LANDER.shaftW / 2, top - 900, LANDER.shaftW, 900).fill({ color: 0x050b10 });
    g.rect(x - LANDER.shaftW / 2 - 6, top - 900, 6, 900).fill({ color: BRASS, alpha: 0.6 });
    g.rect(x + LANDER.shaftW / 2, top - 900, 6, 900).fill({ color: BRASS, alpha: 0.6 });
    // The hab: a riveted gunmetal capsule hanging on brass struts under the shaft, with a moon pool below.
    const hy = top + 30;
    for (const sx of [-60, 60]) g.moveTo(x + sx * 0.5, top).lineTo(x + sx, hy + 20).stroke({ color: BRASS, width: 5 });
    g.roundRect(x - 120, hy, 240, 150, 60).fill(STEEL).stroke({ color: INK, width: 3 });
    g.roundRect(x - 110, hy + 8, 220, 22, 12).fill({ color: STEEL_LIGHT, alpha: 0.45 });
    for (const bx of [-70, 70]) g.rect(x + bx - 6, hy, 12, 150).fill(BRASS);
    for (let k = 0; k < 9; k++) g.circle(x - 100 + k * 25, hy + 138, 1.8).fill(BRASS_HI);
    // Portholes (amber), one with Linnea's jar in it.
    for (const px of [-35, 35]) {
      g.circle(x + px, hy + 62, 20).fill(BRASS).stroke({ color: INK, width: 2 });
      g.circle(x + px, hy + 62, 15).fill({ color: 0x3a2a14 });
    }
    // Linnea: a soft peach axolotl curled in a water jar behind the west porthole.
    g.ellipse(x - 35, hy + 66, 9, 6).fill({ color: 0xf0b49a });
    g.circle(x - 41, hy + 62, 4).fill({ color: 0xf5c2ac });
    for (const a of [-0.9, -0.5, -0.1]) g.moveTo(x - 44, hy + 60).lineTo(x - 44 + Math.cos(a + Math.PI) * 6, hy + 60 + Math.sin(a + Math.PI) * 6).stroke({ color: 0xe89a86, width: 1.6 });
    // The moon pool's lip underneath (where Kestrel comes and goes).
    g.ellipse(x, hy + 150, 70, 10).fill({ color: 0x0a1418 }).stroke({ color: BRASS, width: 3 });
    // The module ring round the hab's waist: two sockets, left and right.
    for (const sx of [-1, 1]) g.roundRect(x + sx * 130 - 14, hy + 50, 28, 40, 6).fill({ color: STEEL_LIGHT }).stroke({ color: INK, width: 2 });
    const t = new Text({ text: 'PETREL · HAB', style: { fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', fill: BRASS_HI, letterSpacing: 2 } });
    t.anchor.set(0.5);
    t.position.set(x, hy + 112);
    g.addChild(t);
    this.objects.addChild(g);
    // The hab's warm light, added on top.
    const hl = this.habLights;
    for (const px of [-35, 35]) {
      hl.circle(x + px, hy + 62, 13).fill({ color: AMBER, alpha: 0.75 });
      hl.circle(x + px, hy + 62, 60).fill({ color: AMBER, alpha: 0.12 });
    }
    hl.ellipse(x, hy + 190, 120, 70).fill({ color: AMBER, alpha: 0.07 });
  }

  private drawGlyphs(): void {
    for (const gl of GLYPHS) {
      const g = new Graphics();
      const up = gl.id === 'bell';
      // An ice pillar (standing, or hanging), with rings cut into it.
      if (up) g.poly([gl.x - 30, gl.y - 60, gl.x + 30, gl.y - 60, gl.x + 16, gl.y + 50, gl.x - 16, gl.y + 50]).fill({ color: ICE, alpha: 0.95 });
      else g.poly([gl.x - 22, gl.y + 70, gl.x + 22, gl.y + 70, gl.x + 30, gl.y - 50, gl.x - 30, gl.y - 50]).fill({ color: ICE, alpha: 0.95 });
      g.poly(up ? [gl.x - 30, gl.y - 60, gl.x - 10, gl.y - 60, gl.x - 6, gl.y + 50, gl.x - 16, gl.y + 50] : [gl.x - 22, gl.y + 70, gl.x - 8, gl.y + 70, gl.x - 10, gl.y - 50, gl.x - 30, gl.y - 50]).fill({ color: ICE_HI, alpha: 0.3 });
      this.objects.addChild(g);
      const glow = new Graphics();
      glow.ellipse(gl.x, gl.y, 16, 7).stroke({ color: 0x6ff3ff, width: 2, alpha: 0.8 });
      glow.ellipse(gl.x, gl.y, 7, 16).stroke({ color: 0xb07cff, width: 1.6, alpha: 0.7 });
      glow.circle(gl.x, gl.y, 40).fill({ color: 0x9fe8ff, alpha: 0.12 });
      this.light.addChild(glow);
      this.glyphGlow.push(glow);
    }
  }

  private drawSpots(): void {
    for (const s of EUROPA_SPOTS) {
      const c = new Container();
      const g = new Graphics();
      if (s.kind === 'rime') {
        for (let i = 0; i < 5; i++) g.poly([s.x - 10 + i * 5, s.y - 16, s.x - 7 + i * 5, s.y - 16, s.x - 8 + i * 5, s.y + 10 + (i % 2) * 8]).fill({ color: 0xdff4ff, alpha: 0.9 });
      } else if (s.kind === 'brine') {
        g.roundRect(s.x - 16, s.y - 4, 32, 10, 4).fill({ color: 0xeef4f2 }).stroke({ color: 0x8aa0a4, width: 1 });
        for (let i = 0; i < 4; i++) g.rect(s.x - 12 + i * 7, s.y - 9 - (i % 2) * 3, 5, 6).fill({ color: 0xf8fbfb });
      } else {
        for (let i = 0; i < 4; i++) g.moveTo(s.x - 6 + i * 4, s.y + 10).quadraticCurveTo(s.x - 12 + i * 8, s.y - 14, s.x - 4 + i * 6, s.y - 26).stroke({ color: 0xbfe8e0, width: 2.2, alpha: 0.85 });
      }
      c.addChild(g);
      // A faint glint, so they read in the dark (icy white).
      const glint = new Graphics().circle(s.x, s.y - 4, 18).fill({ color: GLOW_WHITE, alpha: 0.12 });
      this.light.addChild(glint);
      c.on('removed', () => glint.destroy());
      (c as Container & { glint?: Graphics }).glint = glint;
      this.spotLayer.addChild(c);
      this.spotViews.set(s.id, c);
    }
  }

  private spawnCreatures(): void {
    const rand = mulberry32(0x5eed);
    const make = (species: EuropaSpecies) => {
      const view = new Container();
      const body = new Graphics();
      const glow = new Graphics();
      if (species === 'moth') {
        body.ellipse(0, 0, 7, 4).fill({ color: 0xdfeef4 });
        for (const s of [-1, 1]) {
          body.ellipse(-3, s * 7, 9, 5).fill({ color: 0xf2fbff, alpha: 0.7 });
          body.ellipse(4, s * 6, 7, 4).fill({ color: 0xf2fbff, alpha: 0.55 });
        }
        for (const s of [-1, 1]) for (const k of [-6, -1, 4]) glow.circle(k, s * 7, 1.6).fill({ color: GLOW_TEAL });
        glow.circle(0, 0, 16).fill({ color: GLOW_TEAL, alpha: 0.18 });
      } else {
        body.ellipse(0, 0, 34, 9).fill({ color: 0xcfe6ee, alpha: 0.45 }).stroke({ color: 0xeaf8ff, width: 1.2, alpha: 0.6 });
        for (let k = -26; k <= 26; k += 6) body.moveTo(k, 6).lineTo(k - 3, 16).stroke({ color: 0xdcecf2, width: 1, alpha: 0.6 });
        body.poly([30, -4, 52, -16, 34, 2]).fill({ color: 0xf2fbff, alpha: 0.8 });
        glow.circle(48, -13, 4).fill({ color: GLOW_WHITE });
        glow.circle(48, -13, 26).fill({ color: GLOW_WHITE, alpha: 0.2 });
        glow.ellipse(0, 0, 40, 14).fill({ color: GLOW_TEAL, alpha: 0.08 });
      }
      view.addChild(body);
      this.objects.addChild(view);
      this.light.addChild(glow);
      return { view, glow };
    };
    for (let i = 0; i < EUROPA_CREATURES.moth.count; i++) {
      const x = 1300 + rand() * 4300;
      const { view, glow } = make('moth');
      this.moths.push({ x, y: ceilY(x) + 60 + rand() * 80, vx: (rand() - 0.5) * 40, vy: 0, phase: rand() * 10, view, glow });
    }
    for (let i = 0; i < EUROPA_CREATURES.glasshorn.count; i++) {
      const { view, glow } = make('glasshorn');
      const pool = i % BRINE_POOLS.length;
      this.horns.push({ x: BRINE_POOLS[pool].x - BRINE_POOLS[pool].w / 2 - 80, pool, dir: 1, phase: rand() * 10, view, glow });
    }
  }

  /** Nearest creature to a point (for scanning), within r. */
  nearestCreature(x: number, y: number, r: number): { species: EuropaSpecies; x: number; y: number } | null {
    let best: { species: EuropaSpecies; x: number; y: number } | null = null;
    let bd = r;
    for (const m of this.moths) {
      const d = Math.hypot(m.x - x, m.y - y);
      if (d < bd) {
        bd = d;
        best = { species: 'moth', x: m.x, y: m.y };
      }
    }
    for (const h of this.horns) {
      const hy = floorY(h.x) - 18;
      const d = Math.hypot(h.x - x, hy - y);
      if (d < bd) {
        bd = d;
        best = { species: 'glasshorn', x: h.x, y: hy };
      }
    }
    return best;
  }

  // ---------------------------------------------------------------------------
  // Per frame.

  update(
    dt: number,
    save: SaveData,
    cam: { x: number; y: number; zoom: number },
    screen: { w: number; h: number },
    diver: { x: number; y: number; facing: number; lampOn: boolean },
    ray: RayLook | null = null,
    gland = false,
  ): void {
    this.time += dt;
    const t = this.time;
    const e0 = save.europa;
    const bsig = `${e0?.skylight ? 1 : 0}|${(e0?.brokenFloes ?? []).join(',')}`;
    if (bsig !== this.brokenSig) {
      this.brokenSig = bsig;
      this.brokenFloes = new Set(e0?.brokenFloes ?? []);
      this.drawTerrain();
    }
    this.ray.view.visible = this.ray.glow.visible = !!ray;
    if (ray) this.ray.update(dt, ray);
    for (const w of this.wildRays) {
      w.x += w.dir * 60 * dt;
      if (w.x > FLOE_X1 - 300) w.dir = -1;
      if (w.x < FLOE_X0 + 400) w.dir = 1;
      w.view.update(dt, { x: w.x, y: w.y + Math.sin(t * 0.4 + w.phase) * 40, facing: w.dir, pitch: Math.sin(t * 0.4 + w.phase) * 0.2, effort: 0.1, gear: [] });
    }
    for (const k of this.krill) {
      const g = k.g.clear();
      const cx = k.x + Math.sin(t * 0.3 + k.phase) * 140;
      const cy = k.y + Math.cos(t * 0.5 + k.phase) * 40;
      for (let i = 0; i < 28; i++) {
        const a = i * 2.39 + t * (0.6 + (i % 3) * 0.2);
        const r = 10 + (i % 7) * 9;
        g.circle(cx + Math.cos(a) * r * 1.6, cy + Math.sin(a) * r * 0.6, 1.6).fill({ color: GLOW_WHITE, alpha: 0.8 });
      }
      g.circle(cx, cy, 70).fill({ color: GLOW_WHITE, alpha: 0.05 });
    }
    // Biome 3: vents (redrawn when one is rekindled), the kin around the hearth, the black water, the gates.
    const kinState = save.europa?.kin;
    const vsig = (kinState?.vents ?? []).join(',');
    if (vsig !== this.ventSig || !this.ventsDrawn) {
      this.ventsDrawn = true;
      this.ventSig = vsig;
      this.drawVents(kinState?.vents ?? []);
    }
    this.blackWater.alpha = gland ? 0.55 : 0.97;
    this.kinNoteK = Math.max(0, this.kinNoteK - dt * 1.6);
    const kg = this.kinG.clear();
    if (Math.abs(cam.x - HEARTH.x) < 2200 && cam.y > ABYSS.blackTop - 400) {
      const light = kinLight(save);
      const cols = [0x6ff3ff, 0xb07cff, 0xff6ad5, 0xffe7a0];
      for (let i = 0; i < 5; i++) {
        const a = t * 0.18 + (i / 5) * Math.PI * 2;
        const x = HEARTH.x + Math.cos(a) * 170;
        const y = HEARTH.y - 120 + Math.sin(a) * 60 + Math.sin(t * 0.7 + i) * 14;
        // Fading: a flicker that steadies as the vents warm again.
        const flick = 1 - (1 - light) * (0.5 + 0.5 * Math.sin(t * (3 + i) + i * 2));
        const sing = this.kinNote >= 0 && i % 4 === this.kinNote ? this.kinNoteK : 0;
        const al = Math.min(1, light * flick * 0.8 + sing);
        const r = 26 + light * 12;
        kg.ellipse(x, y, r, r * 0.42).stroke({ color: cols[0], width: 2.4, alpha: al });
        kg.ellipse(x, y, r * 0.42, r).stroke({ color: cols[1], width: 2, alpha: al * 0.9 });
        kg.moveTo(x - r, y + r * 0.6).bezierCurveTo(x - r * 0.3, y + r * 1.4, x + r * 0.3, y - r * 0.2, x + r, y + r * 0.5).stroke({ color: cols[2], width: 2, alpha: al * 0.8 });
        kg.circle(x, y, 4 + sing * 6).fill({ color: sing > 0 ? cols[this.kinNote] : 0xe9fdff, alpha: Math.min(1, al + 0.2) });
        kg.circle(x, y, 60).fill({ color: 0x9fe8ff, alpha: 0.05 * light + sing * 0.15 });
      }
    }
    const gg = this.gates.clear();
    if (kinRestored(save)) {
      for (const p of [KIN_GATES.hab, KIN_GATES.deep]) {
        const pulse = 0.6 + 0.4 * Math.sin(t * 2);
        gg.ellipse(p.x, p.y, 44, 70).stroke({ color: 0x6ff3ff, width: 4, alpha: pulse });
        gg.ellipse(p.x, p.y, 34, 58).stroke({ color: 0xb07cff, width: 2.4, alpha: pulse * 0.8 });
        gg.ellipse(p.x, p.y, 40, 64).fill({ color: 0x9fe8ff, alpha: 0.08 });
      }
    }
    const cg = this.current.clear();
    if (Math.abs(cam.x + 600 - (PASSAGE.x0 + PASSAGE.x1) / 2) < 2200) {
      for (let i = 0; i < 40; i++) {
        const span = PASSAGE.x1 - PASSAGE.x0;
        const x = PASSAGE.x1 - ((i * 211 + t * 420) % span);
        const y = PASSAGE.roof + 30 + ((i * 53) % 260);
        cg.moveTo(x, y).lineTo(x + 40, y).stroke({ color: 0xbfe8f0, width: 1.4, alpha: 0.25 });
      }
    }
    // Background: a near-black ocean, a little lighter under the ice.
    if (screen.w !== this.bgW || screen.h !== this.bgH) {
      this.bgW = screen.w;
      this.bgH = screen.h;
      this.bg.clear().rect(0, 0, screen.w, screen.h).fill(BG_GRAD);
    }

    this.world.scale.set(cam.zoom);
    this.world.position.set(-cam.x * cam.zoom, -cam.y * cam.zoom);
    this.far.position.set(cam.x * 0.35, cam.y * 0.2);
    // Jupiter drifts slowly across the sky as Kestrel crosses the floe field (and stays out of sight under the shelf, behind the ice).
    // Its centre stays a little above the view's middle (never below the horizon line), clipped to the sky.
    this.jupiter.position.set(cam.x * 0.88 + 2000, Math.min(-80, cam.y + 200) + 300);

    // Pickups: hidden while they grow back.
    for (const s of EUROPA_SPOTS) {
      const v = this.spotViews.get(s.id) as (Container & { glint?: Graphics }) | undefined;
      if (!v) continue;
      const here = isPresent(save, s);
      v.visible = here;
      if (v.glint) {
        v.glint.visible = here;
        v.glint.alpha = 0.6 + 0.4 * Math.sin(t * 2 + s.x);
      }
    }
    // Glyphs pulse; once read, they settle to a steady glow.
    GLYPHS.forEach((gl, i) => {
      const read = save.europa?.scans.includes(`glyph_${gl.id}`);
      this.glyphGlow[i].alpha = read ? 0.45 : 0.55 + 0.45 * Math.sin(t * 1.6 + i);
    });

    // Rime moths flutter along under the ice and drift toward the lamp.
    for (const m of this.moths) {
      const toLamp = diver.lampOn && Math.hypot(diver.x - m.x, diver.y - m.y) < 360;
      const tx = toLamp ? diver.x + diver.facing * 60 : m.x + Math.sin(t * 0.3 + m.phase) * 80;
      const ty = toLamp ? diver.y - 30 : ceilY(m.x) + 70 + Math.sin(t * 0.5 + m.phase) * 30;
      m.vx += ((tx - m.x) * 0.4 - m.vx) * Math.min(1, dt * 1.2);
      m.vy += ((ty - m.y) * 0.4 - m.vy) * Math.min(1, dt * 1.2);
      m.x = Math.max(150, Math.min(ICE_WALL_X - 120, m.x + m.vx * dt));
      m.y = Math.max(ceilY(m.x) + 24, Math.min(floorY(m.x) - 30, m.y + m.vy * dt));
      const flap = Math.sin(t * 9 + m.phase);
      m.view.position.set(m.x, m.y);
      m.view.scale.set(m.vx < 0 ? -1 : 1, 0.75 + 0.25 * flap);
      m.glow.position.set(m.x, m.y);
      m.glow.scale.set(m.vx < 0 ? -1 : 1, 1);
      m.glow.alpha = 0.7 + 0.3 * Math.sin(t * 2 + m.phase);
    }
    // Glasshorns walk slowly back and forth along a brine pool's edge.
    for (const h of this.horns) {
      const p = BRINE_POOLS[h.pool];
      const x0 = p.x - p.w / 2 - 170;
      const x1 = p.x + p.w / 2 + 170;
      h.x += h.dir * 14 * dt;
      if (h.x > x1) h.dir = -1;
      if (h.x < x0) h.dir = 1;
      const y = floorY(h.x) - 14 + Math.sin(t * 2 + h.phase) * 1.5;
      h.view.position.set(h.x, y);
      h.view.scale.set(h.dir, 1);
      h.glow.position.set(h.x, y);
      h.glow.scale.set(h.dir, 1);
    }

    // Built pieces on the hab (and the air bell under the icicle forest), redrawn when they change.
    const e = save.europa;
    const sig = `${e?.built.join(',')}|${e?.welding?.id ?? ''}`;
    if (sig !== this.modSig) {
      this.modSig = sig;
      this.drawModules(save);
    }
    const sp = this.weldSpark.clear();
    if (e?.welding) {
      const at = e.welding.id === 'bell' ? BELL_AT : { x: LANDER.x + 150, y: ceilY(LANDER.x) + 100 };
      // KD-1 at work: a small brass drone with a torch spark.
      const dx = at.x + Math.sin(t * 2) * 30;
      const dy = at.y - 40 + Math.cos(t * 3) * 10;
      sp.circle(dx, dy, 9).fill({ color: BRASS, alpha: 0.9 });
      sp.circle(dx, dy + 12, 3 + Math.random() * 3).fill({ color: 0xfff0c0 });
      sp.circle(dx, dy + 12, 22).fill({ color: AMBER, alpha: 0.3 });
    }

    // Kestrel's lamp: a soft cone of warm-white light ahead of him, and a halo round him.
    const f = diver.facing;
    this.beam.visible = this.halo.visible = diver.lampOn;
    this.beam.position.set(diver.x + f * 18, diver.y - 26);
    this.beam.scale.set((f * (gland ? 900 : 560)) / 256, (gland ? 560 : 380) / 128);
    this.beam.alpha = 0.34;
    this.beam.tint = gland ? 0xd8fff4 : 0xf6efd8;
    if (gland) this.beam.visible = true;
    this.halo.position.set(diver.x, diver.y - 12);
    this.halo.scale.set(380 / 128);
    this.halo.alpha = 0.16;
    this.aura.position.set(diver.x, diver.y - 12);
    this.aura.scale.set(220 / 128);
    this.aura.alpha = 0.12;

    // Drifting motes of ice.
    const dg = this.dust.clear();
    for (let i = 0; i < 60; i++) {
      const x = cam.x + ((i * 173.3 + t * 8) % 1600) - 200;
      const y = cam.y + ((i * 97.1 + t * (4 + (i % 3))) % 1000);
      dg.circle(x, y, 1.2).fill({ color: 0xdff4ff, alpha: 0.25 });
    }
  }

  private drawModules(save: SaveData): void {
    for (const c of this.modules.removeChildren()) c.destroy({ children: true });
    const e = save.europa;
    if (!e) return;
    const top = ceilY(LANDER.x) + 30;
    const g = new Graphics();
    const building = (id: string) => e.built.includes(id as 'still') || e.welding?.id === id;
    if (building('still')) {
      const alpha = e.built.includes('still') ? 1 : 0.5;
      const x = LANDER.x + 150;
      g.roundRect(x - 10, top + 30, 56, 90, 20).fill({ color: STEEL, alpha }).stroke({ color: INK, width: 2, alpha });
      for (const y of [top + 50, top + 95]) g.rect(x - 10, y, 56, 6).fill({ color: BRASS, alpha });
      g.moveTo(x + 18, top + 120).lineTo(x + 18, top + 150).stroke({ color: BRASS, width: 4, alpha });
      g.circle(x + 18, top + 72, 9).fill({ color: AMBER, alpha: 0.8 * alpha });
      const t = new Text({ text: 'BS-1', style: { fontFamily: 'monospace', fontSize: 9, fill: BRASS_HI } });
      t.anchor.set(0.5);
      t.position.set(x + 18, top + 108);
      t.alpha = alpha;
      g.addChild(t);
    }
    if (building('bell')) {
      const alpha = e.built.includes('bell') ? 1 : 0.5;
      const { x, y } = BELL_AT;
      g.moveTo(x, ceilY(x)).lineTo(x, y).stroke({ color: BRASS, width: 3, alpha });
      g.arc(x, y + 60, 70, Math.PI, 0).fill({ color: 0x9fd6e8, alpha: 0.18 * alpha }).stroke({ color: BRASS, width: 4, alpha });
      for (const k of [-50, 0, 50]) g.circle(x + k, y + 60 - Math.sqrt(70 * 70 - k * k), 3).fill({ color: BRASS_HI, alpha });
      g.moveTo(x - 70, y + 60).lineTo(x + 70, y + 60).stroke({ color: 0xdff4ff, width: 2, alpha: 0.6 * alpha });
    }
    this.modules.addChild(g);
  }

  /** Is (x, y) inside the built air bell's dome? */
  static inBell(save: SaveData, x: number, y: number): boolean {
    if (!save.europa?.built.includes('bell')) return false;
    return Math.hypot(x - BELL_AT.x, y - (BELL_AT.y + 60)) < 68 && y < BELL_AT.y + 62;
  }
}
