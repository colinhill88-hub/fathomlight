import { Container, FillGradient, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { BELL_AT, EUROPA_CREATURES, EUROPA_SPOTS, GLYPHS, isPresent, type EuropaSpecies } from '../game/europa';
import type { SaveData } from '../game/state';
import { mulberry32 } from '../rng';
import { BRINE_POOLS, ceilY, EUROPA_W, floorY, ICE_WALL_X, LANDER } from '../world/europaTerrain';

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

export class EuropaScene {
  readonly view = new Container();
  private readonly bg = new Graphics();
  private readonly world = new Container();
  private readonly far = new Container();
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
  private bgW = 0;
  private bgH = 0;
  private time = 0;

  constructor() {
    this.light.blendMode = 'add';
    this.world.addChild(this.far, this.terrain, this.objects, this.spotLayer, this.modules, this.actors, this.fg, this.light, this.dust);
    this.view.addChild(this.bg, this.world);
    this.view.visible = false;
    this.drawTerrain();
    this.drawLander();
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

  private drawTerrain(): void {
    const g = this.terrain;
    const rand = mulberry32(0xe0e0a);
    const STEP = 16;
    // Far parallax: hanging ice columns and a dim seabed ridge, very dark.
    const far = new Graphics();
    for (let i = 0; i < 26; i++) {
      const x = i * 260 + rand() * 120;
      const top = ceilY(x) - 200;
      const len = 180 + rand() * 360;
      far.poly([x - 40, top, x + 40, top, x + 8, top + len, x - 6, top + len]).fill({ color: 0x14283a, alpha: 0.7 });
    }
    for (let x = -400; x < EUROPA_W + 400; x += 40) {
      const y = floorY(Math.max(0, Math.min(EUROPA_W, x))) - 120 - Math.sin(x * 0.003) * 50;
      far.rect(x, y, 41, 900).fill({ color: 0x101c26, alpha: 0.75 });
    }
    this.far.addChild(far);

    // The ice ceiling: from far above down to its underside, in bands of blue, with facets.
    const ceilPts: number[] = [-600, -3000];
    for (let x = -600; x <= EUROPA_W + 600; x += STEP) ceilPts.push(x, ceilY(Math.max(0, Math.min(EUROPA_W, x))));
    ceilPts.push(EUROPA_W + 600, -3000);
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
    g.poly(ceilPts).fill(iceFill);
    // A pale rim along the underside, and cracks.
    for (let x = 0; x < EUROPA_W; x += STEP) g.moveTo(x, ceilY(x)).lineTo(x + STEP, ceilY(x + STEP));
    g.stroke({ color: ICE_HI, width: 3, alpha: 0.35 });
    for (let i = 0; i < 70; i++) {
      const x = rand() * EUROPA_W;
      const y = ceilY(x);
      g.moveTo(x, y - 4).lineTo(x + (rand() - 0.5) * 40, y - 40 - rand() * 80).stroke({ color: ICE_HI, width: 1, alpha: 0.18 });
    }
    // Icicles (decoration only: they never snag the diver). Long and thick in the icicle forest.
    for (let x = 140; x < ICE_WALL_X - 60; x += 18 + rand() * 30) {
      const forest = Math.max(0, 1 - Math.abs(x - 4500) / 600);
      if (rand() > 0.45 + forest * 0.5) continue;
      const y = ceilY(x) - 2;
      const len = 14 + rand() * 40 + forest * (60 + rand() * 120);
      const w = 4 + rand() * 6 + forest * 6;
      g.poly([x - w, y, x + w, y, x + w * 0.15, y + len]).fill({ color: ICE, alpha: 0.95 });
      g.poly([x - w * 0.6, y, x - w * 0.1, y, x, y + len * 0.8]).fill({ color: ICE_HI, alpha: 0.35 });
    }

    // The seabed: cold silt, with a lighter crust and pebbles.
    const floorPts: number[] = [-600, 4000];
    for (let x = -600; x <= EUROPA_W + 600; x += STEP) floorPts.push(x, floorY(Math.max(0, Math.min(EUROPA_W, x))));
    floorPts.push(EUROPA_W + 600, 4000);
    g.poly(floorPts).fill(SILT);
    for (let x = 0; x < EUROPA_W; x += STEP) g.moveTo(x, floorY(x)).lineTo(x + STEP, floorY(x + STEP));
    g.stroke({ color: SILT_HI, width: 5, alpha: 0.8 });
    for (let i = 0; i < 160; i++) {
      const x = rand() * EUROPA_W;
      g.ellipse(x, floorY(x) + 6 + rand() * 30, 3 + rand() * 7, 2 + rand() * 3).fill({ color: SILT_HI, alpha: 0.5 });
    }
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
      // Salt crust at the rims.
      for (const side of [-1, 1]) g.ellipse(p.x + side * (p.w / 2 + 20), floorY(p.x + side * (p.w / 2 + 20)) - 2, 46, 8).fill({ color: 0xd8e4e4, alpha: 0.45 });
    }
    // The thick-ice wall to the east, blue-black, with a faint seam of far-off light.
    // (The ceiling and the seabed meet at the thick-ice wall and at the west wall, so they close the slice by themselves.)
    // Beyond the east wall, far off, a faint glow through the ice: where the singing comes from.
    const seam = new Sprite(softGlow());
    seam.anchor.set(0.5);
    seam.tint = 0x8fdcff;
    seam.alpha = 0.18;
    seam.scale.set(520 / 128, 900 / 128);
    seam.position.set(ICE_WALL_X + 120, (ceilY(ICE_WALL_X - 300) + floorY(ICE_WALL_X - 300)) / 2);
    this.light.addChild(seam);
    // Foreground: a few dark icicle silhouettes near the camera plane (drawn over the actors).
    for (let i = 0; i < 18; i++) {
      const x = 200 + rand() * (EUROPA_W - 400);
      const y = ceilY(x) - 10;
      this.fg.poly([x - 14, y, x + 14, y, x + 2, y + 60 + rand() * 90]).fill({ color: 0x08121a, alpha: 0.55 });
    }
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
  ): void {
    this.time += dt;
    const t = this.time;
    // Background: a near-black ocean, a little lighter under the ice.
    if (screen.w !== this.bgW || screen.h !== this.bgH) {
      this.bgW = screen.w;
      this.bgH = screen.h;
      this.bg.clear().rect(0, 0, screen.w, screen.h).fill(BG_GRAD);
    }

    this.world.scale.set(cam.zoom);
    this.world.position.set(-cam.x * cam.zoom, -cam.y * cam.zoom);
    this.far.position.set(cam.x * 0.35, cam.y * 0.2);

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
    this.beam.scale.set((f * 560) / 256, 380 / 128);
    this.beam.alpha = 0.34;
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
