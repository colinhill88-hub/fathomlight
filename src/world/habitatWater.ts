import { Container, FillGradient, Graphics, Sprite, type Texture } from 'pixi.js';
import type { TankArt, TankBackdropKind } from '../art/tankArt';

export interface WaterBox { x: number; y: number; w: number; h: number }

interface Ripple {
  x: number;
  y: number;
  vx: number;
  vy: number;
  strength: number;
  age: number;
}

interface ThemePalette {
  stops: readonly [number, number, number, number];
  farRock: number;
  midRock: number;
  midRockRim: number;
  midRockShade: number;
  haze: number;
  hazeAlpha: number;
  sandTop: number;
  sandDeep: number;
  pebbles: readonly [number, number, number, number];
  shaftColor: number;
  shaftAlpha: number;
  causticColor: number;
}

const THEMES: Record<TankBackdropKind, ThemePalette> = {
  bare: {
    stops: [0x78bbb0, 0x347f7c, 0x1f4e58, 0x14363e],
    farRock: 0x26565c,
    midRock: 0x3b655c,
    midRockRim: 0x8db28e,
    midRockShade: 0x1b3b42,
    haze: 0x2b6469,
    hazeAlpha: 0.24,
    sandTop: 0xb89e6e,
    sandDeep: 0x89724e,
    pebbles: [0x6e6252, 0x9e8c6c, 0x595046, 0xcab68c],
    shaftColor: 0xe6f4c4,
    shaftAlpha: 0.11,
    causticColor: 0xe8f6c8,
  },
  coral: {
    stops: [0x82c4b5, 0x3a8984, 0x21555f, 0x163c44],
    farRock: 0x2b5d62,
    midRock: 0x4b6b5d,
    midRockRim: 0xb2b88f,
    midRockShade: 0x214449,
    haze: 0x337074,
    hazeAlpha: 0.2,
    sandTop: 0xc8ae80,
    sandDeep: 0x957d5a,
    pebbles: [0x8d6c64, 0xb89680, 0x6b5852, 0xe0c4a8],
    shaftColor: 0xf4f2c8,
    shaftAlpha: 0.13,
    causticColor: 0xf2f4c8,
  },
  kelp: {
    stops: [0x6eb39c, 0x2e756e, 0x1c484f, 0x123238],
    farRock: 0x224e50,
    midRock: 0x3c5b49,
    midRockRim: 0x8fa86e,
    midRockShade: 0x183436,
    haze: 0x275d59,
    hazeAlpha: 0.24,
    sandTop: 0xae9764,
    sandDeep: 0x7d6b44,
    pebbles: [0x675c48, 0x8f7f5a, 0x4f493c, 0xbba878],
    shaftColor: 0xe2f0b4,
    shaftAlpha: 0.12,
    causticColor: 0xe2f2b8,
  },
  grass: {
    stops: [0x86c9b8, 0x3e8f84, 0x23585e, 0x173e44],
    farRock: 0x2c6464,
    midRock: 0x47735d,
    midRockRim: 0xa4c486,
    midRockShade: 0x204748,
    haze: 0x367872,
    hazeAlpha: 0.18,
    sandTop: 0xc6b17e,
    sandDeep: 0x948056,
    pebbles: [0x766c56, 0xa89872, 0x5d5646, 0xd8c698],
    shaftColor: 0xedf6c8,
    shaftAlpha: 0.14,
    causticColor: 0xecf6ca,
  },
  bladder: {
    stops: [0x518d83, 0x245e5c, 0x173c44, 0x0f2a31],
    farRock: 0x1b4046,
    midRock: 0x324c44,
    midRockRim: 0x798a5a,
    midRockShade: 0x132a30,
    haze: 0x1e4a4c,
    hazeAlpha: 0.28,
    sandTop: 0x988358,
    sandDeep: 0x6b5c3d,
    pebbles: [0x585042, 0x7c6e50, 0x444038, 0xa29068],
    shaftColor: 0xd8e4a0,
    shaftAlpha: 0.1,
    causticColor: 0xdbe8a8,
  },
  lumen: {
    stops: [0x336c74, 0x1b4651, 0x112f3a, 0x0a1e26],
    farRock: 0x14333d,
    midRock: 0x243c42,
    midRockRim: 0x69885c,
    midRockShade: 0x0d1f26,
    haze: 0x143942,
    hazeAlpha: 0.28,
    sandTop: 0x756c58,
    sandDeep: 0x4e483c,
    pebbles: [0x464844, 0x65685e, 0x363a38, 0x868c74],
    shaftColor: 0xdcf4a4,
    shaftAlpha: 0.08,
    causticColor: 0xdaf2a6,
  },
};

function makeGradient(stops: readonly [number, number, number, number]): FillGradient {
  return new FillGradient({
    type: 'linear',
    start: { x: 0.4, y: 0 },
    end: { x: 0.6, y: 1 },
    colorStops: [
      { offset: 0, color: stops[0] },
      { offset: 0.22, color: stops[1] },
      { offset: 0.68, color: stops[2] },
      { offset: 1, color: stops[3] },
    ],
  });
}

/** Phase 21, living tanks: a soft wake behind swimmers, and a creature breaking the surface. */
interface Mote { x: number; y: number; vx: number; vy: number; age: number; life: number; r: number }
interface SurfaceWave { x: number; age: number; strength: number }
interface Drop { x: number; y: number; vx: number; vy: number; age: number }
const MOTE_CAP = 36;
const WAVE_LIFE = 2.2;
/** How fast a surface ripple runs along the water line (units a second). */
const WAVE_SPEED = 70;

/** A tiny seeded random for the fixed sand, rocks and pebbles. */
function seeded(n: number): () => number {
  let a = (n * 2654435761) >>> 0 || 1;
  return () => {
    a ^= a << 13;
    a ^= a >>> 17;
    a ^= a << 5;
    return ((a >>> 0) % 10000) / 10000;
  };
}

const EDGE = 2;
const WAVE_COUNT = 5;
const RIPPLE_LIFE = 1.25;
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));

/** A closed recirculating tank. The water state and currents here are render-only. */
export class HabitatWater {
  readonly back = new Container();
  readonly front = new Container();
  private readonly backdropLayer = new Container();
  private readonly backdropMask = new Graphics();
  private readonly paintedSprite = new Sprite();
  private readonly proceduralBackdrop = new Graphics();
  private readonly sand = new Graphics();
  private readonly surface = new Graphics();
  private readonly beds = new Graphics();
  private readonly suspended = new Graphics();
  private readonly dirt = new Graphics();
  private readonly particles: number;
  private readonly ripples: Ripple[] = [];
  private scrubTime = 0;
  private drawAgain = 0;
  private rippleDelay = 0;
  private clarity = -1;
  private visible = false;
  private theme: TankBackdropKind | null = null;
  private causticColor = 0xe8f6c8;
  private readonly caustics = new Graphics();
  private readonly motes: Mote[] = [];
  private readonly waves: SurfaceWave[] = [];
  private readonly drops: Drop[] = [];

  constructor(
    private readonly box: WaterBox,
    private readonly seed: number,
    private readonly tankArt?: TankArt,
  ) {
    const { x, y, w, h } = box;
    this.backdropMask.rect(x + EDGE, y + EDGE, w - EDGE * 2, h - EDGE * 2).fill(0xffffff);
    this.backdropLayer.mask = this.backdropMask;
    this.paintedSprite.visible = false;
    this.backdropLayer.addChild(this.proceduralBackdrop, this.paintedSprite);

    const edge = new Graphics()
      .roundRect(x + 2, y + 2, w - 4, h - 4, 5).stroke({ color: 0x8db8a5, width: 1.2, alpha: 0.55 })
      .moveTo(x + 4, y + h * 0.14).lineTo(x + 4, y + h * 0.84).stroke({ color: 0xe6f2d0, width: 2, alpha: 0.34 })
      .moveTo(x + w - 4, y + h * 0.18).lineTo(x + w - 4, y + h * 0.78).stroke({ color: 0x9ec4b5, width: 1.2, alpha: 0.22 });
    this.particles = Math.min(23, Math.ceil(w / 25 + 6));

    this.back.addChild(this.backdropMask, this.backdropLayer, this.caustics, this.sand, this.beds);
    this.front.addChild(this.dirt, this.suspended, this.surface, edge);
    this.dirt.rect(x, y, w, h).fill(0x829264)
      .rect(x + 2, y + h * 0.76, w - 4, h * 0.23).fill(0x5f6e46);

    this.setTheme('bare');
  }

  /** Switch the tank's painted backdrop (or painterly procedural fallback) to match its plant. */
  setTheme(kind: TankBackdropKind): void {
    if (this.theme === kind) return;
    this.theme = kind;
    const pal = THEMES[kind];
    this.causticColor = pal.causticColor;
    const tex = this.tankArt?.[kind] ?? this.tankArt?.bare;
    if (tex) {
      this.applyPaintedBackdrop(tex);
      this.proceduralBackdrop.visible = false;
    } else {
      this.paintedSprite.visible = false;
      this.proceduralBackdrop.visible = true;
      this.drawProceduralBackdrop(kind, pal);
    }
    this.drawSandBed(pal, Boolean(tex));
  }

  private applyPaintedBackdrop(tex: Texture): void {
    const { x, y, w, h } = this.box;
    const iw = w - EDGE * 2;
    const ih = h - EDGE * 2;
    const scale = Math.max(iw / Math.max(1, tex.width), ih / Math.max(1, tex.height));
    this.paintedSprite.texture = tex;
    this.paintedSprite.anchor.set(0.5, 0.5);
    this.paintedSprite.position.set(x + w * 0.5, y + h * 0.5);
    this.paintedSprite.scale.set(scale);
    this.paintedSprite.alpha = 0.94;
    this.paintedSprite.visible = true;
  }

  /** Layered painterly procedural backdrop tailored to each plant's biome. */
  private drawProceduralBackdrop(kind: TankBackdropKind, pal: ThemePalette): void {
    const { x, y, w, h } = this.box;
    const g = this.proceduralBackdrop.clear();
    const r = seeded(this.seed * 31 + kind.charCodeAt(0) * 17);

    // 1. Deep water gradient fill.
    g.rect(x + EDGE, y + EDGE, w - EDGE * 2, h - EDGE * 2).fill({ fill: makeGradient(pal.stops), alpha: 0.96 });

    // 2. Dramatic diagonal sunlit shafts streaming from the water surface.
    for (let i = 0; i < 4; i++) {
      const sx = x + w * (0.08 + i * 0.25 + (r() - 0.5) * 0.06);
      const topW = w * (0.09 + r() * 0.07);
      const drift = w * (0.08 + r() * 0.05);
      g.moveTo(sx, y + EDGE)
        .lineTo(sx + topW, y + EDGE)
        .quadraticCurveTo(sx + topW + drift * 0.5, y + h * 0.46, sx + topW * 1.45 + drift, y + h * 0.94)
        .lineTo(sx + drift * 0.5, y + h * 0.94)
        .quadraticCurveTo(sx + drift * 0.25, y + h * 0.45, sx, y + EDGE)
        .fill({ color: pal.shaftColor, alpha: pal.shaftAlpha * 1.45 * (0.75 + (i % 2) * 0.35) });
    }

    // 3. High far reef valley silhouette framing left & right, dipping in the middle.
    g.moveTo(x + EDGE, y + h - EDGE);
    const farSteps = 12;
    for (let i = 0; i <= farSteps; i++) {
      const u = i / farSteps;
      const valley = Math.sin(u * Math.PI); // high on sides, lower in center
      const ridgeY = y + h * (0.24 + valley * 0.26 + Math.sin(u * 9 + this.seed) * 0.05 + (r() - 0.5) * 0.04);
      g.lineTo(x + EDGE + u * (w - EDGE * 2), ridgeY);
    }
    g.lineTo(x + w - EDGE, y + h - EDGE).closePath().fill({ color: pal.farRock, alpha: 0.78 });

    // 4. Midground sculpted reef rock terraces with warm sunlit ledges & shadowed overhangs.
    const drawTerrace = (x0: number, x1: number, topY: number, height: number, flip: boolean): void => {
      const left = x + w * x0;
      const right = x + w * x1;
      const ty = y + h * topY;
      const by = y + h * Math.min(0.96, topY + height);
      const midX = (left + right) * 0.5;
      const slope = flip ? -h * 0.055 : h * 0.055;
      g.moveTo(left, by)
        .lineTo(left + (flip ? w * 0.04 : 0), ty + slope)
        .quadraticCurveTo(midX, ty - h * 0.045, right - (flip ? 0 : w * 0.04), ty - slope)
        .lineTo(right, by)
        .closePath()
        .fill({ color: pal.midRock, alpha: 0.9 });
      // Crisp warm sunlit limestone/slate top shelf.
      g.moveTo(left + (flip ? w * 0.04 : 0), ty + slope)
        .quadraticCurveTo(midX, ty - h * 0.045, right - (flip ? 0 : w * 0.04), ty - slope)
        .stroke({ color: pal.midRockRim, width: Math.max(2.5, h * 0.028), alpha: 0.78, cap: 'round' });
      // Deep cool overhang shadow underneath.
      g.moveTo(left + (right - left) * 0.06, ty + h * 0.065)
        .quadraticCurveTo(midX, ty + h * 0.035, right - (right - left) * 0.06, ty + h * 0.075)
        .lineTo(right - (right - left) * 0.03, by)
        .lineTo(left + (right - left) * 0.03, by)
        .closePath()
        .fill({ color: pal.midRockShade, alpha: 0.68 });
    };
    drawTerrace(-0.03, 0.34, 0.44, 0.52, false);
    drawTerrace(0.66, 1.03, 0.39, 0.57, true);
    drawTerrace(0.18, 0.52, 0.66, 0.3, false);
    drawTerrace(0.48, 0.84, 0.62, 0.34, true);

    // 5. Lush biome-specific background flora growing on the sculpted shelves.
    this.drawThemeFlora(g, kind, r);

    // 6. Gentle atmospheric haze veil (light enough that the painted rock & flora read clearly).
    g.rect(x + EDGE, y + EDGE, w - EDGE * 2, h - EDGE * 2).fill({ color: pal.haze, alpha: pal.hazeAlpha * 0.48 });

    // 7. Subtle curved pressure-window glass highlight.
    g.moveTo(x + w * 0.05, y + 6).lineTo(x + w * 0.3, y + 6)
      .quadraticCurveTo(x + w * 0.32, y + h * 0.52, x + w * 0.41, y + h * 0.8)
      .lineTo(x + w * 0.18, y + h * 0.85).quadraticCurveTo(x + w * 0.1, y + h * 0.46, x + w * 0.05, y + 6)
      .fill({ color: 0xc5ecba, alpha: 0.07 });
  }

  private drawThemeFlora(g: Graphics, kind: TankBackdropKind, r: () => number): void {
    const { x, y, w, h } = this.box;
    if (kind === 'coral') {
      const clusters = Math.max(4, Math.round(w / 80));
      for (let i = 0; i < clusters; i++) {
        const cx = x + w * (0.09 + (i + 0.25 + r() * 0.5) * (0.82 / clusters));
        const cy = y + h * (0.48 + (i % 2) * 0.16);
        const col = i % 2 ? 0xd0746c : 0xe4a892;
        for (let b = -2; b <= 2; b++) {
          const ang = -Math.PI / 2 + b * 0.36 + (r() - 0.5) * 0.12;
          const len = h * (0.14 + r() * 0.12);
          const bx = cx + Math.cos(ang) * len;
          const by = cy + Math.sin(ang) * len;
          g.moveTo(cx, cy).lineTo(bx, by).stroke({ color: col, width: Math.max(2.6, h * 0.026), cap: 'round', alpha: 0.72 });
          g.circle(bx, by, Math.max(2.2, h * 0.02)).fill({ color: 0xf6c8b6, alpha: 0.68 });
        }
      }
    } else if (kind === 'kelp') {
      const fronds = Math.max(6, Math.round(w / 46));
      for (let i = 0; i < fronds; i++) {
        const bx = x + w * (0.06 + (i + r() * 0.6) * (0.88 / fronds));
        const fh = h * (0.52 + r() * 0.34);
        const sway = (r() - 0.5) * w * 0.09;
        g.moveTo(bx, y + h * 0.9)
          .bezierCurveTo(bx + sway, y + h * 0.9 - fh * 0.35, bx - sway * 0.8, y + h * 0.9 - fh * 0.72, bx + sway * 0.5, y + h * 0.9 - fh)
          .stroke({ color: i % 2 ? 0x8ea44c : 0x6a8648, width: Math.max(3.5, w * 0.022), cap: 'round', alpha: 0.65 });
      }
    } else if (kind === 'grass') {
      const tufts = Math.max(8, Math.round(w / 36));
      for (let i = 0; i < tufts; i++) {
        const bx = x + w * (0.05 + (i + r() * 0.5) * (0.9 / tufts));
        const by = y + h * (0.66 + (i % 2) * 0.12);
        for (let b = -2; b <= 2; b++) {
          const bh = h * (0.2 + r() * 0.18);
          g.moveTo(bx + b * 2.5, by)
            .quadraticCurveTo(bx + b * 4.5, by - bh * 0.55, bx + b * 7 + (r() - 0.5) * 5, by - bh)
            .stroke({ color: b % 2 ? 0x80b85c : 0x5c944c, width: Math.max(1.8, h * 0.014), cap: 'round', alpha: 0.7 });
        }
      }
    } else if (kind === 'bladder') {
      const stalks = Math.max(5, Math.round(w / 58));
      for (let i = 0; i < stalks; i++) {
        const bx = x + w * (0.08 + (i + r() * 0.5) * (0.84 / stalks));
        const sh = h * (0.52 + r() * 0.32);
        const lean = (r() - 0.5) * w * 0.08;
        g.moveTo(bx, y + h * 0.9)
          .quadraticCurveTo(bx + lean, y + h * 0.9 - sh * 0.55, bx + lean * 0.6, y + h * 0.9 - sh)
          .stroke({ color: 0x84743c, width: Math.max(2.2, h * 0.017), cap: 'round', alpha: 0.68 });
        for (const t of [0.38, 0.68, 0.94]) {
          g.circle(bx + lean * t, y + h * 0.9 - sh * t, Math.max(2.8, h * 0.024)).fill({ color: 0xc2aa4e, alpha: 0.68 });
        }
      }
    } else if (kind === 'lumen') {
      const patches = Math.max(5, Math.round(w / 65));
      for (let i = 0; i < patches; i++) {
        const px = x + w * (0.1 + (i + r() * 0.5) * (0.8 / patches));
        const py = y + h * (0.48 + (i % 3) * 0.12);
        const rx = w * (0.055 + r() * 0.04);
        const ry = h * (0.028 + r() * 0.02);
        // Warm yellow-green moss glow halo (no Choir colours).
        g.ellipse(px, py - ry * 0.4, rx * 2.1, ry * 2.6).fill({ color: 0xc8ea78, alpha: 0.22 });
        g.ellipse(px, py, rx, ry).fill({ color: 0x98c456, alpha: 0.82 });
        g.ellipse(px - rx * 0.18, py - ry * 0.25, rx * 0.58, ry * 0.48).fill({ color: 0xf2fca8, alpha: 0.78 });
      }
    }
  }

  private drawSandBed(pal: ThemePalette, overImage: boolean): void {
    const { x, y, w, h } = this.box;
    const sand = this.sand.clear();
    if (overImage) return;
    const r = seeded(this.seed + 101);
    const top = y + h * 0.89;
    sand.moveTo(x + EDGE, y + h - EDGE);
    for (let i = 0; i <= 14; i++) {
      sand.lineTo(
        x + EDGE + ((w - EDGE * 2) * i) / 14,
        top + Math.sin(i * 1.5 + this.seed) * h * 0.018 + (r() - 0.5) * h * 0.014,
      );
    }
    sand.lineTo(x + w - EDGE, y + h - EDGE).closePath().fill({ color: pal.sandTop, alpha: 0.9 });
    sand.rect(x + EDGE, top + h * 0.035, w - EDGE * 2, h * 0.075).fill({ color: pal.sandDeep, alpha: 0.48 });

    const pebbles = Math.round(w / 9);
    for (let i = 0; i < pebbles; i++) {
      const px = x + 6 + r() * (w - 12);
      const py = top + h * 0.02 + r() * h * 0.072;
      const pr = 0.8 + r() * 2.4;
      const tone = pal.pebbles[Math.floor(r() * 4)];
      sand.ellipse(px, py, pr * 1.35, pr).fill({ color: tone, alpha: 0.92 });
      sand.ellipse(px - pr * 0.3, py - pr * 0.35, pr * 0.5, pr * 0.3).fill({ color: 0xf4ead0, alpha: 0.36 });
    }
  }

  ripple(x: number, y: number, vx: number, vy: number, strength: number): void {
    const b = this.box;
    if (this.rippleDelay > 0 || x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) return;
    if (this.ripples.length >= WAVE_COUNT) this.ripples.shift();
    this.ripples.push({ x, y, vx, vy, strength, age: 0 });
    this.rippleDelay = 0.17;
  }

  /** Phase 21: a swimmer's wake: a few motes stirred up behind it that drift and fade. */
  wake(x: number, y: number, vx: number, vy: number): void {
    const b = this.box;
    if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) return;
    if (this.motes.length >= MOTE_CAP) this.motes.shift();
    const j = (this.motes.length * 0.61803398875) % 1;
    this.motes.push({ x: x + (j - 0.5) * 4, y: y + (((j * 7) % 1) - 0.5) * 4, vx: -vx * 0.25 + (j - 0.5) * 6, vy: -vy * 0.25 - 2, age: 0, life: 0.9 + j * 0.8, r: 0.7 + j * 1.1 });
  }

  /**
   * Phase 21: a creature breaks the surface at x: a ripple runs both ways along the water
   * line, a few droplets jump and fall back, and a ring spreads where it came up.
   */
  surfaceBreak(x: number, strength = 1): void {
    const b = this.box;
    this.waves.push({ x, age: 0, strength });
    if (this.waves.length > 4) this.waves.shift();
    for (let i = 0; i < 5; i++) {
      const u = (i - 2) / 2;
      this.drops.push({ x: x + u * 3, y: b.y + 4, vx: u * 16 * strength, vy: -(22 + (2 - Math.abs(u)) * 9) * strength, age: 0 });
    }
    if (this.drops.length > 20) this.drops.splice(0, this.drops.length - 20);
    this.rippleDelay = 0;
    this.ripple(x, b.y + 7, 0, 10, 0.8 * strength);
  }

  /** The water line's height at x (the surface ripples lift and lower it). */
  surfaceY(x: number, time: number): number {
    const t = time + this.seed * 0.37;
    const u = (x - this.box.x - 3) / Math.max(1, this.box.w - 6);
    let py = this.box.y + 5 + Math.sin(u * 13 - t * 1.8) * 2.3 + Math.sin(u * 29 + t * 0.9) * 0.7;
    for (const wv of this.waves) {
      const fade = 1 - wv.age / WAVE_LIFE;
      const front = wv.age * WAVE_SPEED;
      const d = Math.abs(x - wv.x);
      const k = (d - front) / 10;
      py += Math.cos(k * 1.6) * Math.exp(-k * k * 0.5) * 3.2 * wv.strength * fade;
      if (d < 12) py -= (1 - d / 12) * 3 * wv.strength * Math.max(0, 1 - wv.age * 2.5);
    }
    return py;
  }

  scrub(): void {
    this.scrubTime = 1.6;
    const b = this.box;
    this.rippleDelay = 0;
    this.ripple(b.x + b.w * 0.84, b.y + b.h * 0.68, -25, -18, 0.9);
  }

  flow(x: number, y: number, time: number, filtered: boolean): number {
    const b = this.box;
    const u = clamp((x - b.x) / b.w, 0, 1);
    const v = clamp((y - b.y) / b.h, 0, 1);
    let drift = 0.14 * Math.sin(time * 0.65 + this.seed + u * 4 - v * 2);
    if (filtered) drift += (v - 0.5) * 0.8 * (0.28 + 0.72 * u);
    for (const p of this.ripples) {
      const d = Math.hypot(x - p.x, y - p.y) / 52;
      if (d < 1) drift += (1 - d) * (1 - p.age / RIPPLE_LIFE) * p.strength * 0.37 * Math.sign(p.vx);
    }
    return clamp(drift, -0.7, 0.7);
  }

  update(dt: number, time: number, quality: number, filtered: boolean, visible: boolean): void {
    this.scrubTime = Math.max(0, this.scrubTime - dt);
    this.rippleDelay = Math.max(0, this.rippleDelay - dt);
    this.drawAgain = Math.max(0, this.drawAgain - dt);
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const p = this.ripples[i];
      p.age += dt;
      if (p.age >= RIPPLE_LIFE) this.ripples.splice(i, 1);
    }
    for (let i = this.waves.length - 1; i >= 0; i--) if ((this.waves[i].age += dt) >= WAVE_LIFE) this.waves.splice(i, 1);
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.age += dt;
      if (m.age >= m.life) {
        this.motes.splice(i, 1);
        continue;
      }
      const drag = Math.exp(-dt * 2.4);
      m.vx *= drag;
      m.vy = m.vy * drag - 1.5 * dt;
      m.x += m.vx * dt + this.flow(m.x, m.y, time, filtered) * 6 * dt;
      m.y += m.vy * dt;
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.age += dt;
      d.vy += 110 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.y > this.box.y + 6 && d.vy > 0) this.drops.splice(i, 1);
    }
    if (this.clarity < 0) this.clarity = quality;
    this.clarity += (quality - this.clarity) * (1 - Math.exp(-dt * (this.scrubTime > 0 ? 2.7 : 0.9)));
    if (!visible) {
      this.visible = false;
      return;
    }
    this.dirt.alpha = (1 - this.clarity) * 0.34;
    if (this.visible && this.drawAgain > 0) return;
    this.visible = true;
    this.drawAgain = 1 / 20;
    this.paint(time, filtered);
  }

  private paint(time: number, filtered: boolean): void {
    const { x, y, w, h } = this.box;
    const { beds, surface, suspended } = this;
    beds.clear();
    surface.clear();
    suspended.clear();
    const t = time + this.seed * 0.37;
    // Phase 21: caustic light: soft bright bands that wander across the back of the tank.
    const cg = this.caustics.clear();
    for (let i = 0; i < 4; i++) {
      const cx = x + w * (((i * 0.29 + t * 0.021 * (i % 2 ? 1 : -1)) % 1 + 1) % 1);
      const sway = Math.sin(t * 0.7 + i * 2.1) * w * 0.05;
      cg.moveTo(cx - w * 0.035, y + 8).quadraticCurveTo(cx + sway, y + h * 0.45, cx + sway * 1.6 - w * 0.02, y + h * 0.88)
        .lineTo(cx + sway * 1.6 + w * 0.03, y + h * 0.88).quadraticCurveTo(cx + sway + w * 0.04, y + h * 0.45, cx + w * 0.035, y + 8)
        .fill({ color: this.causticColor, alpha: (0.035 + 0.03 * Math.sin(t * 1.3 + i)) * (0.4 + this.clarity * 0.6) });
    }
    for (let i = 0; i < 9; i++) {
      const cx = x + w * ((i * 0.137 + Math.sin(t * 0.4 + i) * 0.03 + 1) % 1);
      const cy = y + h * (0.86 + Math.sin(i * 2.3) * 0.03);
      cg.ellipse(cx, cy, w * 0.03 * (0.6 + 0.4 * Math.sin(t * 1.7 + i * 1.3)), h * 0.008).fill({ color: 0xf6f0c8, alpha: 0.12 * this.clarity });
    }
    for (let i = 0; i < 5; i++) {
      const cx = x + w * (0.14 + i * 0.18 + Math.sin(t * 0.83 + i * 1.3) * 0.04);
      const cy = y + h * (0.77 + Math.sin(t * 0.67 - i) * 0.06);
      const span = w * 0.09;
      beds.moveTo(cx - span, cy).quadraticCurveTo(cx - 3, cy - h * 0.12, cx + span, cy - h * 0.05)
        .quadraticCurveTo(cx, cy - h * 0.025, cx - span, cy).fill({ color: 0xc6dfa0, alpha: 0.06 + this.clarity * 0.12 });
    }

    const samples = Math.max(10, Math.min(31, Math.round(w / 22)));
    const waving = this.waves.length > 0;
    for (let stripe = 0; stripe < 2; stripe++) {
      for (let i = 0; i <= (waving ? samples * 2 : samples); i++) {
        const u = i / (waving ? samples * 2 : samples);
        const py = stripe === 0 ? this.surfaceY(x + 3 + u * (w - 6), time) : y + 5 + stripe * 4 + Math.sin(u * 13 - t * 1.8) * (2.3 - stripe * 0.6)
          + Math.sin(u * 29 + t * 0.9) * 0.7;
        if (i === 0) surface.moveTo(x + 3, py);
        else surface.lineTo(x + 3 + u * (w - 6), py);
      }
      surface.stroke({ color: stripe ? 0x94caba : 0xd3eac3, width: stripe ? 0.9 : 1.5, alpha: stripe ? 0.26 : 0.58 });
    }
    for (let i = 0; i < this.particles; i++) {
      const u = ((i * 0.61803398875 + this.seed * 0.117) % 1 + 1) % 1;
      const v = ((i * 0.377 + t * 0.027) % 1 + 1) % 1;
      const cx = x + 8 + u * (w - 16);
      const cy = y + 9 + (h - 18) * v;
      const drift = this.flow(cx, cy, time, filtered);
      const px = clamp(cx + 5 * Math.sin(t + i * 1.9) + drift * 12, x + 5, x + w - 5);
      const fade = Math.sin(v * Math.PI);
      suspended.circle(px, cy, 0.65 + (i % 3) * 0.33)
        .fill({ color: this.clarity > 0.55 ? 0xc9dfb3 : 0xc5ad75, alpha: fade * (0.23 + (1 - this.clarity) * 0.28) });
    }
    if (filtered || this.scrubTime > 0) {
      const extra = this.scrubTime / 1.6;
      for (let i = 0; i < 7; i++) {
        const v = ((t * (0.28 + extra * 0.44) + i / 7) % 1 + 1) % 1;
        const cx = x + w - 16 - v * (w * 0.16) + Math.sin(i + t * 2) * 3;
        const cy = y + h * (0.88 - v * 0.7);
        suspended.circle(cx, cy, 0.85 + i % 3 * 0.6).stroke({ color: 0xe1f3d0, width: 0.8, alpha: Math.sin(v * Math.PI) * (0.41 + extra * 0.3) });
      }
    }
    // Phase 21: the wake behind swimmers, and droplets from a creature breaking the surface.
    for (const m of this.motes) {
      const f = Math.sin((m.age / m.life) * Math.PI);
      suspended.ellipse(m.x, m.y, m.r * 1.6, m.r).fill({ color: 0xdff3dc, alpha: 0.4 * f });
    }
    for (const d of this.drops) suspended.circle(d.x, d.y, 1.1).fill({ color: 0xeaf8f0, alpha: 0.8 });
    for (const p of this.ripples) {
      // Only draw flat surface ripple rings near the waterline (mid-water swimmers use soft wake motes).
      if (p.y > y + 26) continue;
      const rx = clamp(p.x + p.vx * p.age * 0.38, x + 5, x + w - 5);
      const ry = clamp(p.y + p.vy * p.age * 0.38, y + 5, y + h - 5);
      const radius = Math.min(6 + p.age * 22, rx - x - 2, x + w - rx - 2);
      const height = Math.min(radius * 0.24, ry - y - 2, y + h - ry - 2);
      surface.ellipse(rx, ry, radius, height).stroke({ color: 0xc1ecd0, width: 1.1, alpha: p.strength * 0.52 * (1 - p.age / RIPPLE_LIFE) });
    }
  }
}
