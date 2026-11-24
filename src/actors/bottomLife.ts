import { Container, Graphics, Sprite } from 'pixi.js';
import { batchAll } from './animkit';
import { getPropArt } from '../art/propArt';

export type BottomKind = 'lily' | 'sponge' | 'worm' | 'star' | 'pen';

export class BottomAnimal {
  readonly view = new Container();
  private readonly parts: Container[] = [];
  private readonly painted?: Container;

  constructor(readonly kind: BottomKind, readonly x: number, readonly y: number, size: number, phase: number) {
    this.view.position.set(x, y);
    const paintedTex = getPropArt().bottom[kind];
    if (paintedTex) {
      const host = new Container();
      const spr = new Sprite(paintedTex);
      spr.anchor.set(0.5, 0.94);
      const target = kind === 'pen' ? size * 1.75 : kind === 'star' ? size * 2.1 : size * 1.45;
      const sc = target / Math.max(1, Math.max(paintedTex.width, paintedTex.height));
      spr.scale.set(sc);
      host.addChild(spr);
      this.view.addChild(host);
      this.painted = host;
      return;
    }
    const base = new Graphics();
    this.view.addChild(base);
    if (kind === 'lily') {
      base.moveTo(0, 0).quadraticCurveTo(8, -size * 0.5, 5, -size)
        .stroke({ color: 0x94877a, width: 3.5, cap: 'round' });
      for (let i = 0; i < 7; i++) {
        const crown = this.part(5, -size);
        crown.addChild(new Graphics().moveTo(-1, 0).quadraticCurveTo(-12, -15, -4, -28)
          .quadraticCurveTo(8, -30, 11, -21).quadraticCurveTo(5, -22, 0, 0)
          .fill({ color: i % 2 ? 0xc6b391 : 0xa17673, alpha: 0.93 })
          .moveTo(0, -3).quadraticCurveTo(-5, -17, 4, -26).stroke({ color: 0xe0c9a3, width: 1.5 }));
      }
    } else if (kind === 'pen') {
      const rachis = this.part(0, 0);
      const height = size * 1.58;
      const plume = new Graphics().moveTo(0, 0).quadraticCurveTo(-6, -height * 0.5, 6, -height)
        .stroke({ color: 0xc0a08a, width: 3, cap: 'round' });
      for (let i = 0; i < 5; i++) {
        const f = (i + 1) / 6;
        const y = -height * f;
        const w = 5 + Math.sin(f * Math.PI) * size * 0.43;
        plume.moveTo(1, y + 3).quadraticCurveTo(-w * 0.85, y + 7, -w - 2, y - 5)
          .quadraticCurveTo(-w * 0.3, y - 8, 2, y).quadraticCurveTo(w * 0.59, y - 11, w + 4, y - 9)
          .quadraticCurveTo(w * 0.9, y, 1, y + 3).fill(i % 2 ? 0xc49486 : 0xa97773);
      }
      rachis.addChild(plume);
    } else if (kind === 'sponge') {
      const w = size * 0.65;
      base.moveTo(-w * 0.58, 0).lineTo(-w, -size * 0.76).quadraticCurveTo(-w * 0.85, -size, -w * 0.53, -size)
        .lineTo(w * 0.66, -size).lineTo(w, -size * 0.79).lineTo(w * 0.53, 0)
        .closePath().fill({ color: 0x768f8d, alpha: 0.84 });
      for (let i = -2; i <= 2; i++) {
        base.moveTo(i * w * 0.22, 0).quadraticCurveTo(i * w * 0.31, -size * 0.53, (i + 0.21) * w * 0.31, -size)
          .stroke({ color: 0xa8beb3, width: 1.7, alpha: 0.73 });
      }
      for (let i = 1; i <= 4; i++) {
        const top = -i * size / 5;
        const rim = w * (0.55 + i * 0.09);
        base.moveTo(-rim, top).quadraticCurveTo(0, top + 5, rim, top - 1).stroke({ color: 0xc5c6ae, width: 1.2, alpha: 0.74 });
      }
      const osculum = this.part(0, -size * 0.9);
      osculum.addChild(new Graphics().ellipse(0, 0, w * 0.81, 5.7).fill(0x9ca9a1)
        .ellipse(0, -0.4, w * 0.59, 3.55).fill(0x424d51));
    } else if (kind === 'worm') {
      for (let i = 0; i < 4; i++) {
        const offset = (i - 1.5) * 8.4;
        const h = size * (0.52 + 0.36 * Math.sin(i * 2 + phase) ** 2);
        const lean = (i - 1.5) * 2.1;
        base.moveTo(offset, 0).quadraticCurveTo(offset - lean, -h * 0.57, offset + lean, -h)
          .stroke({ color: 0xbba58e, width: 4, cap: 'round' });
        const plume = this.part(offset + lean, -h);
        plume.addChild(new Graphics().moveTo(0, 2).quadraticCurveTo(-14, -3, -9, -15)
          .quadraticCurveTo(-4, -13, 0, -7).quadraticCurveTo(4, -13, 9, -15)
          .quadraticCurveTo(14, -3, 0, 2).fill(0xb87871)
          .moveTo(-7, -11).lineTo(0, -1).lineTo(7, -11).stroke({ color: 0xf0b492, width: 1.45 }));
      }
    } else {
      base.ellipse(1, -3, size, size * 0.29).fill(0x4e5a5c);
      for (let i = 0; i < 5; i++) {
        const arm = this.part(0, -7);
        arm.addChild(new Graphics().moveTo(0, -2).quadraticCurveTo(size * 0.52, -7, size + 9, 1)
          .quadraticCurveTo(size * 0.61, -1, 0, 2).fill(0xd79168)
          .moveTo(3, -1).quadraticCurveTo(size * 0.64, -5, size + 4, -0.3)
          .stroke({ color: 0xf2b988, width: 1, alpha: 0.74 }));
      }
      this.view.addChild(new Graphics().ellipse(0, -7, 5.9, 3.9).fill(0xb97457).circle(0, -8, 1.8).fill(0xf7c98e));
    }
    batchAll(this.view);
  }

  update(time: number, flow: number, passing: number): void {
    const t = time + this.x * 0.017;
    if (this.painted) {
      if (this.kind === 'star') {
        this.painted.scale.set(1 - passing * 0.08, 1 + Math.sin(t * 1.5) * 0.03);
      } else if (this.kind === 'sponge') {
        this.painted.scale.set(1 + Math.sin(t * 1.05) * 0.03, 1 + Math.sin(t * 1.05) * 0.06 - passing * 0.08);
      } else if (this.kind === 'worm') {
        this.painted.rotation = flow * 0.25 + Math.sin(t * 1.8) * 0.08;
        this.painted.scale.set(1 - passing * 0.22, Math.max(0.32, 1 - passing * 0.65));
      } else {
        this.painted.rotation = Math.sin(t * 1.6) * 0.14 + flow * 0.3;
        this.painted.scale.set(1 - passing * 0.14, 0.96 + Math.sin(t * 1.3) * 0.05 - passing * 0.24);
      }
      return;
    }
    for (const [i, part] of this.parts.entries()) {
      if (this.kind === 'lily') {
        part.rotation = (i - 3) * 0.38 * (1 - passing * 0.27) + Math.sin(t * 2.3 - i * 0.7) * 0.12 + flow * 0.24;
        part.scale.y = 0.94 + Math.sin(t * 1.3 + i * 0.52) * 0.1 - passing * 0.26;
      } else if (this.kind === 'pen') {
        part.rotation = Math.sin(t * 1.5) * 0.22 + flow * 0.46;
        part.scale.set(1 - passing * 0.26, 0.93 + Math.sin(t * 1.4) * 0.08 - passing * 0.44);
      } else if (this.kind === 'sponge') {
        part.scale.set(1 + Math.sin(t * 1.05) * 0.05, 1 + Math.sin(t * 1.05) * 0.23 - passing * 0.1);
      } else if (this.kind === 'worm') {
        part.scale.set(1 - passing * 0.76, 0.91 + 0.12 * Math.sin(t * 2 - i) - passing * 0.78);
        part.rotation = flow * 0.46 + Math.sin(t * 1.7 - i) * 0.21;
      } else {
        part.rotation = (i / 5) * Math.PI * 2 + Math.sin(t * 2 - i) * 0.21 + flow * 0.07;
        part.scale.set(1 - passing * 0.17, 0.46);
      }
    }
  }

  private part(x: number, y: number): Container {
    const part = new Container();
    part.position.set(x, y);
    this.view.addChild(part);
    this.parts.push(part);
    return part;
  }
}

export class AnemoneCrown {
  readonly view = new Container();
  private readonly petals: Graphics[] = [];

  constructor(x: number, y: number, colour: number, private readonly direction: number) {
    this.view.position.set(x, y);
    this.view.scale.y = -direction;
    for (let i = 0; i < 9; i++) {
      const h = 23 + Math.sin(i * 3.9) * 5 + (1 - Math.abs(i - 4) / 4) * 9;
      const plume = new Graphics().moveTo(-2.5, 0).quadraticCurveTo(-7, -h * 0.64, -2.3, -h)
        .quadraticCurveTo(1, -h - 6, 4.3, -h + 0.5).quadraticCurveTo(8, -h * 0.6, 2.6, 0)
        .fill({ color: colour, alpha: i % 2 ? 0.75 : 0.88 })
        .moveTo(0, -5).quadraticCurveTo(-2, -h * 0.67, 1, -h)
        .stroke({ color: 0xf8ebae, width: 1.8, alpha: 0.84 })
        .circle(1, -h + 2, 2.6).fill({ color: 0xffe7ad, alpha: 0.9 });
      this.view.addChild(plume);
      this.petals.push(plume);
    }
    this.view.addChild(new Graphics().ellipse(0, 0, 14, 5).fill({ color: 0xad7d70, alpha: 0.9 })
      .ellipse(0, -2, 8, 2.6).fill({ color: 0xf2d496, alpha: 0.72 }));
    batchAll(this.view);
  }

  update(t: number, flow: number, passing: number): void {
    for (const [i, petal] of this.petals.entries()) {
      const flare = 1 + Math.sin(t * 1.7 - i * 0.65) * 0.19 - passing * 0.59;
      petal.rotation = (i - 4) * 0.28 * flare + Math.sin(t * 2.1 - i * 0.52) * 0.12 - this.direction * flow * 0.34;
      petal.scale.set(1 - passing * 0.16, 0.94 + Math.sin(t * 1.61 - i * 0.7) * 0.12 - passing * 0.49);
    }
  }
}
