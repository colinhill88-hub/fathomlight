import { Container, FillGradient, Graphics } from 'pixi.js';
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
  private phase: number;
  private burst = 0;
  private mirror = 1;
  private pitch = 0;
  private speedBefore = 0;

  constructor(view: Container, phase: number, private readonly size: number) {
    this.phase = phase;
    const body = new Graphics();
    body.moveTo(-9.5, -0.3).quadraticCurveTo(-5.4, -5.4, 1.8, -5.6)
      .quadraticCurveTo(7, -5.2, 11.6, -1).quadraticCurveTo(12.8, 0.1, 10.7, 1.2)
      .quadraticCurveTo(6.7, 4.7, 0.6, 4.9).quadraticCurveTo(-5.8, 4.5, -9.5, 1)
      .closePath().fill(scales);
    body.moveTo(-1, -4.9).quadraticCurveTo(0.8, -10.1, 5, -6.9).lineTo(5.6, -4.4)
      .closePath().fill(0x668c88);
    body.moveTo(-5.7, -1.9).quadraticCurveTo(-2.9, -3.5, 1, -3.4)
      .stroke({ color: 0xc8dfce, width: 0.85, alpha: 0.8, cap: 'round' });
    // Keep the scanner's dark gill band broad enough to recognize in motion.
    body.moveTo(5.5, -4.6).quadraticCurveTo(6.9, -0.8, 4.9, 3.9).lineTo(2.4, 4.5)
      .quadraticCurveTo(4, -0.1, 2.8, -5.2).closePath().fill(0x263c45);
    body.circle(8.7, -1.9, 1.45).fill(0x203138).circle(9.1, -2.3, 0.48).fill(0xedebca);
    this.wrist.position.set(-8.2, 0);
    this.wrist.addChild(new Graphics().moveTo(1, -1.9).lineTo(-4.7, -1.1).lineTo(-5.2, 1.1)
      .lineTo(1, 1.9).closePath().fill(0x809d8f));
    this.fork.position.set(-4.4, 0);
    this.fork.addChild(new Graphics().moveTo(1, -1.15).quadraticCurveTo(-2, -3.6, -7.4, -5.1)
      .lineTo(-5.9, -1.8).lineTo(-3.4, 0).lineTo(-6.7, 2.7).lineTo(-7.5, 5)
      .quadraticCurveTo(-1.7, 3.2, 1, 1.18).closePath().fill(0xc8a66e));
    this.wrist.addChild(this.fork);
    this.pectoral.position.set(2.6, 1.6);
    this.pectoral.addChild(new Graphics().moveTo(0.5, -0.65).quadraticCurveTo(-3.5, -0.9, -8, 3.7)
      .quadraticCurveTo(-5, 4.7, -1.6, 2.5).closePath().fill({ color: 0x446f70, alpha: 0.92 }));
    view.addChild(this.wrist, body, this.pectoral);
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
  }
}
