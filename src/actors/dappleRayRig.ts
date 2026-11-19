import { Container, FillGradient, Graphics, Point } from 'pixi.js';
import { approach, batchAll, clamp } from './animkit';
import type { Stroke } from './shoreCreatureRigs';

const sand = new FillGradient({
  type: 'linear', start: { x: 0.3, y: 0 }, end: { x: 0.72, y: 1 },
  colorStops: [
    { offset: 0, color: 0x8b7661 }, { offset: 0.38, color: 0xbfaa80 },
    { offset: 0.73, color: 0xcdb187 }, { offset: 1, color: 0x827357 },
  ],
});

function dapples(g: Graphics, spots: readonly (readonly [number, number, number])[]): void {
  for (const [x, y, r] of spots) {
    g.ellipse(x, y, r + 0.85, r * 0.74 + 0.85).fill({ color: 0xead8ad, alpha: 0.66 });
    g.ellipse(x, y, r, r * 0.74).fill({ color: 0x6c5543, alpha: 0.76 });
  }
}

/** The split spans bank and flex around a firm disc. Tail segments trail the stroke. */
export class DappleRayRig {
  readonly view = new Container();
  readonly tip = new Point();
  readonly stroke: Stroke = { x: 0, y: 0, vx: -38, vy: 32, radius: 42, strength: 0 };
  private readonly wings = [new Container(), new Container()];
  private readonly tips = [new Container(), new Container()];
  private readonly tail: Container[] = [];
  private readonly segmentLength: number;
  private phase: number;
  rest = 0;
  bank = 0;

  constructor(young: boolean, phase: number) {
    this.phase = phase;
    this.segmentLength = young ? 4.9 : 6;
    let mount = this.view;
    for (let i = 0; i < 5; i++) {
      const joint = new Container();
      joint.position.set(i === 0 ? -19 : -this.segmentLength, 0);
      const w = 2.5 - i * 0.36;
      joint.addChild(new Graphics().moveTo(0.45, -w / 2)
        .quadraticCurveTo(-this.segmentLength / 2, -w * 0.56, -this.segmentLength - 0.35, -w * 0.39)
        .lineTo(-this.segmentLength - 0.35, w * 0.39).lineTo(0.45, w / 2).closePath().fill(0xaa8c65));
      mount.addChild(joint);
      this.tail.push(joint);
      mount = joint;
    }
    for (let i = 0; i < 2; i++) {
      const far = i === 0;
      const root = this.wings[i];
      const outer = this.tips[i];
      const span = young ? 0.82 : 1;
      root.position.set(-3.5, 0);
      const edge = far ? 0x837c63 : 0xddc18e;
      const upper = new Graphics().moveTo(-18, 0.7).quadraticCurveTo(-17, 7.2, -11, 11.3 * span)
        .lineTo(4, 10.5 * span).quadraticCurveTo(14, 5.2, 22, -1.4)
        .quadraticCurveTo(6, -4.2, -18, 0.7).closePath().fill(far ? 0x8e826a : sand);
      outer.position.set(-5.2, 9 * span);
      const tip = new Graphics().moveTo(-9, -2.8).lineTo(-7.5, 1.9)
        .quadraticCurveTo(-6.9, 10.7 * span, -4.2, 12.3 * span)
        .quadraticCurveTo(1.5, 12.5 * span, 7.4, 7.8 * span).quadraticCurveTo(12, 3.8, 18, -6.2)
        .quadraticCurveTo(7.3, 0.4, -9, -2.8).closePath().fill(far ? 0x958a6c : sand);
      tip.moveTo(-4.3, 12 * span).quadraticCurveTo(3.6, 12.5 * span, 11, 3)
        .stroke({ color: edge, width: 1.1, alpha: 0.67, cap: 'round' });
      if (!far) {
        dapples(upper, [[-10.3, 3.3, 2.2], [-3.7, 6.6, 2], [5.2, 3.4, 2.45]]);
        dapples(tip, [[-3, 5.2, 2], [3.7, 3.8, 1.55]]);
      }
      outer.addChild(tip);
      root.addChild(outer, upper);
    }
    const spine = new Graphics();
    spine.moveTo(-21, 0).quadraticCurveTo(-12, -7, 4, -6.5)
      .quadraticCurveTo(15, -7.2, 21.6, -3).quadraticCurveTo(25, 1.6, 18.5, 4.2)
      .quadraticCurveTo(5.8, 7.3, -21, 0).closePath().fill(sand);
    spine.moveTo(-13.3, -2.7).quadraticCurveTo(-4.9, -5.8, 8, -4)
      .stroke({ color: 0xd6c7a0, width: 1.25, alpha: 0.68, cap: 'round' });
    dapples(spine, [[-11.1, -0.6, 2], [-4.6, -1.4, 2.3], [3.6, 0.2, 1.8]]);
    for (const [x, y, r] of [[10.8, -5.2, 1.7], [16.1, -5.7, young ? 2.75 : 2.3]]) {
      spine.ellipse(x, y, r + 1.2, r * 0.88 + 0.65).fill(0xbba783)
        .circle(x + 0.5, y - 0.5, r).fill(0x262c27)
        .circle(x + 1.1, y - 1.1, 0.67).fill(0xece1c2);
    }
    this.view.addChild(this.wings[0], this.wings[1], spine);
    batchAll(this.view);
    this.update(0, 0, false, Infinity, 0, 0);
  }

  update(dt: number, speed: number, resting: boolean, floorGap: number, vy: number, alarm: number, current = 0): void {
    this.rest = approach(this.rest, resting ? 1 : 0, resting ? 4.8 : 8.8, dt);
    this.bank = approach(this.bank, clamp(vy / 90, -0.48, 0.48), 4.3, dt);
    const previous = this.phase;
    this.phase = (this.phase + dt * (1.85 + Math.min(1, speed / 112) * 2.7 + alarm * 1.2)) % (Math.PI * 2);
    const stroke = Math.sin(this.phase);
    const clear = clamp((floorGap - 7) / 37, 0.18, 1);
    const span = (1 - this.rest * 0.7) * clear;
    for (let i = 0; i < 2; i++) {
      const far = i === 0;
      const root = this.wings[i];
      const wingbeat = far ? Math.sin(this.phase - 0.82) : stroke;
      root.scale.y = (far ? -1 : 1) * (far ? 0.58 : 0.91) * span * (0.83 + wingbeat * 0.23);
      root.rotation = (wingbeat * 0.17 + (far ? -this.bank : this.bank) * 0.27) * span;
      this.tips[i].rotation = (Math.sin(this.phase - (far ? 1.62 : 0.94)) * 0.32 + current * 0.21) * span;
    }
    const near = this.wings[1];
    const outer = this.tips[1];
    const tipX = outer.x - Math.sin(outer.rotation) * 10;
    const tipY = (outer.y + Math.cos(outer.rotation) * 10) * near.scale.y;
    this.stroke.x = near.x + tipX * Math.cos(near.rotation) - tipY * Math.sin(near.rotation);
    this.stroke.y = near.y + tipX * Math.sin(near.rotation) + tipY * Math.cos(near.rotation);
    this.stroke.strength = dt > 0 && this.phase < previous && speed > 25 && span > 0.3 ? 0.27 + alarm * 0.15 : 0;
    let x = -19;
    let y = 0;
    let angle = 0;
    for (let i = 0; i < this.tail.length; i++) {
      const a = Math.sin(this.phase - i * 0.59 - 0.4) * (0.08 + i * 0.022 + alarm * 0.047) * (1 - this.rest * 0.9);
      this.tail[i].rotation = a;
      angle += a;
      x -= Math.cos(angle) * this.segmentLength;
      y -= Math.sin(angle) * this.segmentLength;
    }
    this.tip.set(x, y);
  }
}
