import { Container, FillGradient, Graphics, Sprite, type Texture } from 'pixi.js';
import { mulberry32 } from '../rng';
import { surfaceWave } from '../fx/surface';
import { drawDockBrace, POOL_SURFACE_Y } from '../world/moonpool';

type Rect = { x: number; y: number; w: number; h: number };
type Camera = { x0: number; y0: number; x1: number; y1: number };

const sea = new FillGradient({
  type: 'linear', start: { x: 0.28, y: 0 }, end: { x: 0.52, y: 1 },
  colorStops: [{ offset: 0, color: 0x3c7791 }, { offset: 0.45, color: 0x244b61 }, { offset: 1, color: 0x0b263b }],
});
const floodedSea = new FillGradient({
  type: 'linear', start: { x: 0.45, y: 0 }, end: { x: 0.45, y: 1 },
  colorStops: [{ offset: 0, color: 0x2d616d }, { offset: 0.48, color: 0x215365 }, { offset: 1, color: 0x071523 }],
});
const depthFade = new FillGradient({
  type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
  colorStops: [{ offset: 0, color: 'rgba(6, 17, 28, 0)' }, { offset: 1, color: 'rgba(4, 11, 19, 0.9)' }],
});
const dockBeam = new FillGradient({
  type: 'linear', start: { x: 0.2, y: 0 }, end: { x: 0.7, y: 1 },
  colorStops: [{ offset: 0, color: 'rgba(199, 234, 214, 0.56)' }, { offset: 0.45, color: 'rgba(119, 203, 196, 0.20)' }, { offset: 1, color: 'rgba(58, 157, 162, 0)' }],
});

/** One small, clipped view. Positions are in the same level units as the cutaway. */
class OceanAperture {
  readonly root = new Container();
  readonly scene = new Container();
  private readonly ridge = new Container();
  private readonly moving = new Graphics();
  private readonly flakes: { x: number; y: number; phase: number; size: number }[] = [];
  private readonly sprite?: Sprite;

  constructor(readonly kind: 'port' | 'pool' | 'service', private readonly area: Rect, basin?: Texture, private readonly waterline = 0) {
    const { x, y, w, h } = area;
    const pool = kind === 'pool';
    this.root.position.set(x, y);
    const mask = new Graphics().roundRect(0, 0, w, h, pool ? 1 : 6).fill(0xffffff);
    this.root.addChild(this.scene, mask);
    this.scene.mask = mask;
    const base = this.scene.addChild(new Graphics());
    base.rect(0, 0, w, h).fill(pool ? floodedSea : sea);
    if (basin) {
      this.sprite = this.scene.addChild(new Sprite({ texture: basin, alpha: pool ? 0.48 : 0.53, tint: 0x74a8bc }));
      this.sprite.width = Math.max(w + 120, 210);
      this.sprite.height = this.sprite.width * basin.height / basin.width;
    }
    this.scene.addChild(this.ridge);
    const stone = this.ridge.addChild(new Graphics());
    const Y = (v: number) => v * h;
    // Broad silhouettes, with their bases disappearing into haze.
    stone.moveTo(-24, Y(0.76)).lineTo(w * 0.16, Y(0.49)).lineTo(w * 0.22, Y(0.29)).lineTo(w * 0.34, Y(0.22))
      .lineTo(w * 0.46, Y(0.46)).lineTo(w * 0.52, Y(0.73)).lineTo(w * 0.66, Y(0.62)).lineTo(w * 0.81, Y(0.38))
      .lineTo(w + 28, Y(0.65)).lineTo(w + 28, h + 6).lineTo(-24, h + 6).closePath()
      .fill({ color: 0x173e50, alpha: pool ? 0.52 : 0.7 });
    stone.poly([-24, Y(0.76), w * 0.22, Y(0.29), w * 0.34, Y(0.22), w * 0.25, Y(0.59), w * 0.17, Y(0.81), -24, h])
      .fill({ color: 0x51818c, alpha: 0.35 });
    stone.moveTo(w * 0.42, Y(0.92)).lineTo(w * 0.65, Y(0.73)).lineTo(w * 0.83, Y(0.64)).lineTo(w + 32, Y(0.79))
      .lineTo(w + 32, h + 6).lineTo(w * 0.4, h + 6).closePath().fill({ color: 0x132e40, alpha: 0.74 });

    const near = this.scene.addChild(new Graphics());
    if (pool) {
      const s = w / 385;
      const roof = waterline - POOL_SURFACE_Y * s;
      for (const side of [-1, 1]) {
        const pylon = w / 2 + side * 151 * s;
        near.moveTo(pylon - side * 11, waterline - 18).lineTo(pylon + side * 9, h + 9)
          .stroke({ color: 0x152e39, width: 24 });
        drawDockBrace(near, w / 2, roof, side, s);
        const lampX = w / 2 + side * w * 0.235;
        near.moveTo(lampX - 9, waterline + 6).lineTo(lampX + 9, waterline + 6)
          .quadraticCurveTo(lampX + side * 25, waterline + 51, lampX + side * 104 + 44, h)
          .lineTo(lampX + side * 104 - 54, h).closePath().fill(dockBeam);
        near.roundRect(lampX - 11, waterline + 2, 22, 6, 2).fill({ color: 0xcae0be, alpha: 0.88 });
      }
      near.rect(0, waterline + 16, w, h - waterline - 16).fill(depthFade);
    } else if (kind === 'port') {
      for (const side of [-1, 1]) {
        const px = w * (side < 0 ? 0.115 : 0.885);
        near.moveTo(px, -7).lineTo(px + side * 19, h + 8).stroke({ color: 0x162f3a, width: 19 });
        near.moveTo(px - side * 4, -7).lineTo(px + side * 15, h + 8).stroke({ color: 0x739e9c, width: 3, alpha: 0.62 });
        drawDockBrace(near, w / 2, -212, side, 1.85);
      }
      near.moveTo(10, 11).bezierCurveTo(w * 0.16, 0, w * 0.37, 11, w * 0.52, 8)
        .stroke({ color: 0xadcecd, width: 2, alpha: 0.24, cap: 'round' });
      for (const x of [w * 0.34, w * 0.66]) {
        near.rect(x - 5, 0, 10, h).fill(0x3b5060);
        near.rect(x - 4, 0, 2, h).fill({ color: 0xa9a888, alpha: 0.65 });
      }
    }
    this.scene.addChild(this.moving);
    const rand = mulberry32(Math.round(x * 9151 + y * 7717));
    for (let i = 0, n = pool ? 19 : kind === 'port' ? 13 : 4; i < n; i++) {
      this.flakes.push({ x: rand(), y: rand(), phase: rand() * 7, size: 0.7 + rand() * 1.7 });
    }
  }

  update(time: number, camera: Camera): void {
    const { x, y, w, h } = this.area;
    this.root.visible = x + w >= camera.x0 && x <= camera.x1 && y + h >= camera.y0 && y <= camera.y1;
    if (!this.root.visible) return;
    const travel = (camera.x0 + camera.x1) / 2 - (x + w / 2);
    this.ridge.x = Math.max(-14, Math.min(14, travel * 0.045));
    if (this.sprite) {
      const shift = Math.max(-44, Math.min(44, travel * 0.14));
      this.sprite.position.set((w - this.sprite.width) / 2 + shift, (h - this.sprite.height) * 0.42);
    }
    const g = this.moving.clear();
    const pool = this.kind === 'pool';
    for (const p of this.flakes) {
      const px = (p.x * w + time * (4 + p.size * 1.9)) % w;
      const py = (pool ? this.waterline + 9 : 5) + p.y * (h - (pool ? this.waterline + 14 : 13)) + Math.sin(time * 0.9 + p.phase) * 4;
      const beam = Math.abs(Math.abs(px - w / 2) - w * (0.235 + p.y * 0.10));
      const gain = pool ? (1 - p.y) * (beam < w * 0.11 ? 0.8 : 0.29) : 0.42;
      g.ellipse(px, py, p.size * 1.45, p.size).fill({ color: 0xb9e2d7, alpha: gain });
    }
    if (pool) {
      const left = w * 0.24;
      const right = w * 0.76;
      const wave = (px: number) => this.waterline + surfaceWave(x + px, time) * 0.36;
      g.moveTo(left, wave(left));
      for (let i = 1; i <= 28; i++) {
        const px = left + (right - left) * i / 28;
        g.lineTo(px, wave(px));
      }
      g.stroke({ color: 0x091f2a, width: 5, alpha: 0.67, cap: 'round' });
      g.moveTo(left, wave(left) - 1);
      for (let i = 1; i <= 28; i++) {
        const px = left + (right - left) * i / 28;
        g.lineTo(px, wave(px) - 1);
      }
      g.stroke({ color: 0xc4e9d4, width: 1.9, alpha: 0.72, cap: 'round' });
      for (let i = 0; i < 5; i++) {
        const px = left + 16 + ((time * 12 + i * 82) % (right - left - 41));
        g.moveTo(px, wave(px) + 3).quadraticCurveTo(px + 9, wave(px + 9) + 1, px + 18, wave(px + 18) + 4)
          .stroke({ color: 0xbce3da, width: 1.1, alpha: 0.35, cap: 'round' });
      }
    }
  }
}

export class HousingOcean {
  readonly root = new Container();
  readonly views: OceanAperture[] = [];

  constructor(private readonly basin?: Texture) {}

  add(kind: OceanAperture['kind'], area: Rect, waterline?: number): void {
    const view = new OceanAperture(kind, area, this.basin, waterline);
    this.views.push(view);
    this.root.addChild(view.root);
  }

  update(time: number, camera: Camera): void {
    for (const view of this.views) view.update(time, camera);
  }

  clear(): void {
    for (const view of this.views) view.root.destroy({ children: true });
    this.views.length = 0;
  }
}
