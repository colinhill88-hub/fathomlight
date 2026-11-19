import { Container, FillGradient, Graphics, Point } from 'pixi.js';
import { approach, batchAll, clamp } from './animkit';

const scales = new FillGradient({
  type: 'linear', start: { x: 0.45, y: 0 }, end: { x: 0.55, y: 1 },
  colorStops: [
    { offset: 0, color: 0x435e69 }, { offset: 0.37, color: 0x91aba6 },
    { offset: 0.59, color: 0xe5e3bc }, { offset: 1, color: 0x648987 },
  ],
});

/** The narrow wrist and fork trail the body in sequence. All paths are drawn once. */
export class Silverbar {
  private readonly wrist = new Container();
  private readonly fork = new Container();
  private readonly pectoral = new Container();
  private readonly streamer = new Container();
  readonly tailTip = new Point();
  private phase: number;
  private burst = 0;
  private mirror = 1;
  private pitch = 0;
  private speedBefore = 0;

  constructor(view: Container, phase: number, private readonly size: number) {
    this.phase = phase;
    const body = new Graphics();
    body.moveTo(-10.5, 0.6).quadraticCurveTo(-8, -7.4, 0, -8.4)
      .quadraticCurveTo(7, -8.1, 14.6, -1.9).quadraticCurveTo(16.3, -0.3, 13, 1.4)
      .quadraticCurveTo(7.7, 4.4, 0, 7.9).quadraticCurveTo(-6.4, 5.4, -10.5, 2)
      .closePath().fill(scales);
    body.moveTo(-7, -4.8).quadraticCurveTo(-6, -10.5, -0.6, -13.6).quadraticCurveTo(1.8, -10.4, 4, -7.1)
      .closePath().fill(0x487d7f);
    body.moveTo(-7.7, 0.4).quadraticCurveTo(0, -4.4, 9, -2.4)
      .quadraticCurveTo(0, -1.5, -4.8, 3.4).fill({ color: 0xf4eab9, alpha: 0.73 });
    // Keep the scanner's dark gill band broad enough to recognize in motion.
    body.moveTo(4.2, -7.8).quadraticCurveTo(7.9, -2.4, 4.9, 5.6).lineTo(0.4, 7.1)
      .quadraticCurveTo(4.1, -0.6, 0, -8.3).closePath().fill(0x263c45);
    body.circle(9.9, -2.5, 2.05).fill(0x203138).circle(10.6, -3.2, 0.73).fill(0xedebca);
    this.wrist.position.set(-9.6, 0.8);
    this.wrist.addChild(new Graphics().moveTo(1, -1.9).lineTo(-4.7, -1.1).lineTo(-5.2, 1.1)
      .lineTo(1, 1.9).closePath().fill(0x809d8f));
    this.fork.position.set(-4.4, 0);
    this.fork.addChild(new Graphics().moveTo(1, -1.15).quadraticCurveTo(-3.7, -4.2, -12.4, -9.1)
      .lineTo(-8.6, -1.8).lineTo(-4.4, 0).lineTo(-9.7, 3.7).lineTo(-12.5, 10.5)
      .quadraticCurveTo(-3.7, 5.2, 1, 1.18).closePath().fill(0xd8ac67)
      .moveTo(-2, 0).lineTo(-10.7, -6.6).moveTo(-2, 0).lineTo(-10.7, 7.8).stroke({ color: 0xeac991, width: 0.93 }));
    this.wrist.addChild(this.fork);
    this.pectoral.position.set(2.6, 1.6);
    this.pectoral.addChild(new Graphics().moveTo(0.5, -0.65).quadraticCurveTo(-3.5, -0.9, -8, 3.7)
      .quadraticCurveTo(-5, 4.7, -1.6, 2.5).closePath().fill({ color: 0x446f70, alpha: 0.92 }));
    this.streamer.position.set(-1.2, 5.6);
    this.streamer.addChild(new Graphics().moveTo(2, -0.3).quadraticCurveTo(-0.8, 6, -9.7, 10.5)
      .quadraticCurveTo(-4.8, 5.5, -3, 0).fill({ color: 0x76a08b, alpha: 0.95 }));
    view.addChild(this.wrist, this.streamer, body, this.pectoral);
    batchAll(view);
  }

  update(view: Container, dt: number, vx: number, vy: number, face: number, pace: number, waterY: number): void {
    const speed = Math.hypot(vx, vy);
    const surge = clamp((speed - this.speedBefore) / Math.max(dt, 0.001) / 380, 0, 1);
    this.speedBefore = speed;
    this.burst = approach(this.burst, Math.max(surge, clamp((speed - 88) / 130, 0, 1)), 9, dt);
    this.mirror = approach(this.mirror, face, 14 + this.burst * 9, dt);
    const side = this.mirror < 0 ? -1 : 1;
    const trim = (vy + waterY * 0.25) / (Math.abs(vx) + 23);
    this.pitch = approach(this.pitch, clamp(trim * 0.62, -0.57, 0.57), 10, dt);
    view.scale.set(this.size * side * Math.max(0.36, Math.abs(this.mirror)), this.size);
    view.rotation = this.pitch * side;
    this.phase = (this.phase + dt * (7 + pace * 6 + this.burst * 11)) % (Math.PI * 2);
    const amplitude = 0.14 + pace * 0.15 + this.burst * 0.34;
    this.wrist.rotation = Math.sin(this.phase) * amplitude;
    this.fork.rotation = Math.sin(this.phase - 0.95) * amplitude * 0.86;
    this.pectoral.rotation = Math.sin(this.phase * 2) * (0.15 + this.burst * 0.18) - this.pitch * 0.5;
    this.streamer.rotation = Math.sin(this.phase * 0.63 - 1.5) * 0.28 + this.burst * 0.63 + waterY * 0.012;
    const tailAngle = this.wrist.rotation + this.fork.rotation;
    const tx = (this.wrist.x - 4.4 * Math.cos(this.wrist.rotation) - 10.7 * Math.cos(tailAngle)) * view.scale.x;
    const ty = (this.wrist.y - 4.4 * Math.sin(this.wrist.rotation) - 10.7 * Math.sin(tailAngle)) * view.scale.y;
    this.tailTip.set(view.x + tx * Math.cos(view.rotation) - ty * Math.sin(view.rotation),
      view.y + tx * Math.sin(view.rotation) + ty * Math.cos(view.rotation));
  }
}
