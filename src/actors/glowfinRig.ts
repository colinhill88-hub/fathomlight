import { Container, FillGradient, Graphics, Point, Sprite } from 'pixi.js';
import { getCreatureArt } from '../art/creatureArt';
import { approach, batchAll, clamp } from './animkit';
import type { Stroke } from './shoreCreatureRigs';

export interface GlowfinColors {
  body: number;
  stripe: number;
  belly: number;
  fin: number;
}

const materials = new Map<number, FillGradient>();
function material(color: GlowfinColors): FillGradient {
  const existing = materials.get(color.body);
  if (existing) return existing;
  const gradient = new FillGradient({
    type: 'linear', start: { x: 0.35, y: 0 }, end: { x: 0.62, y: 1 },
    colorStops: [
      { offset: 0, color: color.stripe }, { offset: 0.47, color: color.body },
      { offset: 0.72, color: color.belly }, { offset: 1, color: color.fin },
    ],
  });
  materials.set(color.body, gradient);
  return gradient;
}

/** The Glowfin sculls with its pectorals, then uses the tail for a short escape stroke. */
export class GlowfinRig {
  readonly body = new Container();
  readonly lure = new Point();
  readonly wake = new Point();
  readonly feedStroke: Stroke = { x: 0, y: 0, vx: -18, vy: 2, radius: 30, strength: 0 };
  private readonly wrist = new Container();
  private readonly paddle = new Container();
  private readonly near = new Container();
  private readonly far = new Container();
  private readonly stalk = new Container();
  /** Phase 22: the sail fin (shape 1) and the veil tail (shape 2), when it has one. */
  private readonly sail = new Container();
  private readonly veil = new Container();
  private readonly tip = new Point(11, -13);
  private readonly finTip: Point;
  private phase: number;
  private pace = 0;
  private effort = 0;
  private attention = 0;
  private startle = 0;
  private wary = false;
  private previousSpeed = 0;

  constructor(color: GlowfinColors, young: boolean, phase: number, shape = 0) {
    this.phase = phase;
    // Fry have a fuller forehead, a shorter stalk and a rounder tail paddle.
    const back = young ? -13 : -20;
    const brow = young ? -16 : -23;
    const finLength = young ? 10 : 19;
    this.finTip = new Point(-finLength + 1, 0);
    const hull = new Graphics();
    hull.moveTo(back, 2).bezierCurveTo(back - 5, -9, -12, brow, 4, brow)
      .bezierCurveTo(19, brow, 24, -11, 22.8, -1)
      .bezierCurveTo(22, 11, 11, 18.2, 0, 14)
      .quadraticCurveTo(back + 2, 11, back, 2).closePath().fill(material(color));
    hull.moveTo(back + 2, -4).bezierCurveTo(back + 1, brow * 0.87, -6, brow - 3, 7, brow + 2)
      .quadraticCurveTo(-5, brow + 5, back + 2, -4).fill({ color: color.belly, alpha: 0.47 });
    hull.moveTo(-13, -5).quadraticCurveTo(-6, -13, 1, -12).quadraticCurveTo(-4, -4, -5, 5)
      .quadraticCurveTo(-12, 6, -13, -5).fill({ color: color.stripe, alpha: 0.63 });
    for (const x of [-11, -5, 1]) {
      hull.moveTo(x, -8.7).quadraticCurveTo(x + 3.7, -1, x + 1.3, 7.9)
        .stroke({ color: color.stripe, width: young ? 1.75 : 2.5, alpha: 0.72, cap: 'round' });
    }
    hull.moveTo(-8.5, -6.9).quadraticCurveTo(-1.5, -10, 6.8, -8.8)
      .stroke({ color: color.belly, width: 1.8, alpha: 0.52, cap: 'round' });
    hull.moveTo(6.5, -6.4).quadraticCurveTo(9.3, 1.5, 6.5, 7.5)
      .stroke({ color: color.stripe, width: 1.45, alpha: 0.75, cap: 'round' });
    const eye = young ? 5.3 : 5.8;
    hull.ellipse(12.5, -7.2, eye + 2.6, eye + 1.4).fill({ color: color.belly, alpha: 0.85 })
      .circle(14.1, -7.7, eye).fill(0x242229).circle(15.8, -9.3, eye * 0.37).fill(0xfff1d0);
    hull.moveTo(15.3, 5).quadraticCurveTo(19.5, 7, 21.3, 3.6)
      .stroke({ color: color.stripe, width: 1.25, cap: 'round' });

    this.wrist.position.set(back + 1.4, 1.8);
    this.wrist.addChild(new Graphics().moveTo(2.5, -3.4).lineTo(-5.7, -1.9)
      .lineTo(-5.7, 2.5).lineTo(2.5, 3.4).closePath().fill(color.fin));
    this.paddle.x = -5.5;
    const tail = new Graphics();
    tail.moveTo(0.8, -1.6).quadraticCurveTo(-finLength * 0.56, -8.5, -finLength, -7.3)
      .quadraticCurveTo(-finLength - 2.2, -3.5, -finLength + (young ? 0.8 : 3.7), 0)
      .quadraticCurveTo(-finLength - 2, 5, -finLength + 0.4, 8.6)
      .quadraticCurveTo(-5.5, 8.5, 0.8, 2.2).closePath().fill(color.fin);
    tail.moveTo(-1.5, -0.6).quadraticCurveTo(-6.9, -5.1, -finLength + 2, -5.6)
      .moveTo(-1.4, 1.6).quadraticCurveTo(-7.6, 5, -finLength + 2, 6.2)
      .stroke({ color: color.belly, width: 0.95, alpha: 0.53, cap: 'round' });
    this.paddle.addChild(tail);
    this.wrist.addChild(this.paddle);
    this.near.position.set(5.6, 1.7);
    this.far.position.set(3.8, 0.9);
    const finReach = young ? 13 : 21;
    const flipper = (dark: boolean) => new Graphics().moveTo(0, -0.8)
      .bezierCurveTo(-5.8, -2.7, -finReach + 2, 4, -finReach, 13.5)
      .quadraticCurveTo(-finReach * 0.44, 17.5, -3.4, 10.5).quadraticCurveTo(0.6, 6, 0, -0.8)
      .closePath().fill({ color: dark ? color.stripe : color.fin, alpha: dark ? 0.83 : 0.95 })
      .moveTo(-1.4, 1.5).quadraticCurveTo(-finReach * 0.51, 4.3, -finReach + 2, 12)
      .stroke({ color: color.belly, alpha: 0.7, width: 1.45, cap: 'round' });
    this.near.addChild(flipper(false));
    this.far.addChild(flipper(true));

    this.stalk.position.set(6, brow + 0.3);
    this.tip.set(young ? 8.6 : 19, young ? -8.4 : -16);
    const stalk = new Graphics().moveTo(-0.8, 1.9)
      .bezierCurveTo(-1.6, -8.1, this.tip.x - 3.2, this.tip.y - 13.3, this.tip.x, this.tip.y)
      .stroke({ color: color.stripe, width: 2.05, cap: 'round' });
    this.stalk.addChild(stalk);
    const k = young ? 0.62 : 1;
    if (shape === 1) {
      // A tall sail of a dorsal fin, ribbed, that ripples as it swims.
      this.sail.position.set(-3 * k, brow + 4 * k);
      const g = new Graphics().moveTo(-12 * k, 2).bezierCurveTo(-15 * k, -14 * k, -6 * k, -26 * k, 3 * k, -24 * k)
        .bezierCurveTo(11 * k, -22 * k, 13 * k, -8 * k, 11 * k, 3).closePath().fill({ color: color.fin, alpha: 0.9 });
      for (const [x0, x1, y1] of [[-9, -10, -17], [-5, -4, -22], [0, 2, -22], [5, 8, -16]] as const)
        g.moveTo(x0 * k, 1).quadraticCurveTo(x1 * k, y1 * k * 0.5, x1 * k, y1 * k).stroke({ color: color.stripe, width: 0.9, alpha: 0.65, cap: 'round' });
      g.moveTo(-13 * k, -6 * k).bezierCurveTo(-12 * k, -18 * k, -4 * k, -25 * k, 3 * k, -24 * k).stroke({ color: color.belly, width: 1.3, alpha: 0.6, cap: 'round' });
      this.sail.addChild(g);
    } else if (shape === 2) {
      // A long, flowing veil tail on the tail paddle (it follows the stroke), and a trailing belly veil.
      const L = finLength + 24 * k;
      const v = new Graphics().moveTo(0, -3).bezierCurveTo(-L * 0.4, -16 * k, -L * 0.85, -18 * k, -L, -10 * k)
        .bezierCurveTo(-L * 0.8, -4 * k, -L * 0.95, 2 * k, -L * 1.02, 8 * k)
        .bezierCurveTo(-L * 0.8, 16 * k, -L * 0.4, 14 * k, 0, 3).closePath().fill({ color: color.fin, alpha: 0.62 });
      for (const a of [-0.55, -0.2, 0.15, 0.5])
        v.moveTo(-2, 0).quadraticCurveTo(-L * 0.5, a * 22 * k, -L * 0.95, a * 26 * k).stroke({ color: color.belly, width: 0.8, alpha: 0.45, cap: 'round' });
      this.veil.position.set(-finLength + 4, 0);
      this.veil.addChild(v);
      this.paddle.addChildAt(this.veil, 0);
    }
    const painted = getCreatureArt().glowfin;
    let hullNode: Container = hull;
    if (painted) {
      const sp = new Sprite(painted);
      sp.anchor.set(0.5, 0.5);
      sp.position.set((back + 23) * 0.5, (brow + 14.5) * 0.5);
      sp.width = 24 - back;
      sp.height = 15.5 - brow;
      sp.tint = color.body;
      hullNode = sp;
    }
    this.body.addChild(this.far, this.wrist, this.sail, hullNode, this.near, this.stalk);
    batchAll(this.body);
    this.update(0, 0, 0);
  }

  update(dt: number, speed: number, notice: number, sick = 0, currentY = 0, feeding = 0): void {
    const acceleration = dt > 0 ? (speed - this.previousSpeed) / dt : 0;
    this.previousSpeed = speed;
    this.pace = approach(this.pace, clamp(speed / 135, 0, 1), 6.2, dt);
    if (!this.wary && notice > 0.31) {
      this.wary = true;
      this.startle = 1;
    } else if (notice < 0.16) this.wary = false;
    const burst = Math.max(this.startle, clamp((acceleration - 30) / 177, 0, 1));
    this.effort = approach(this.effort, burst, burst > this.effort ? 16 : 3.6, dt);
    this.startle *= Math.exp(-dt * 4.1);
    this.attention = approach(this.attention, notice, 5.5, dt);
    const stroke = this.pace * 0.56 + this.effort * 0.7;
    const previous = this.phase;
    this.phase = (this.phase + dt * (3.8 + stroke * 13 + feeding * 4) * (1 - sick * 0.56)) % (Math.PI * 2);
    const amplitude = (0.1 + 0.58 * stroke) * (1 - sick * 0.36);
    this.wrist.rotation = Math.sin(this.phase) * amplitude;
    this.paddle.rotation = Math.sin(this.phase - 0.8) * amplitude * 0.8;
    this.sail.rotation = Math.sin(this.phase - 0.4) * (0.04 + amplitude * 0.12);
    this.sail.scale.y = 1 - this.effort * 0.35;
    this.veil.rotation = Math.sin(this.phase - 1.7) * (0.12 + amplitude * 0.5);
    // Use the fins most actively while hovering. Fold the fins in during the dash.
    const scull = (0.42 - 0.28 * this.pace + feeding * 0.2) * (1 - sick * 0.55);
    this.near.rotation = Math.sin(this.phase + 0.92) * scull + 0.18 * this.attention;
    this.far.rotation = -0.21 + Math.sin(this.phase - 0.4) * scull;
    this.stalk.rotation = Math.sin(this.phase - 1.58) * (0.055 + 0.1 * stroke)
      - 0.25 * this.attention + 0.18 * this.effort + sick * 0.2 + clamp(currentY / 240, -0.12, 0.12);
    const angle = this.stalk.rotation;
    this.lure.set(this.stalk.x + this.tip.x * Math.cos(angle) - this.tip.y * Math.sin(angle),
      this.stalk.y + this.tip.x * Math.sin(angle) + this.tip.y * Math.cos(angle));
    const rootAngle = this.wrist.rotation;
    const finAngle = rootAngle + this.paddle.rotation;
    this.wake.set(this.wrist.x + this.paddle.x * Math.cos(rootAngle) + this.finTip.x * Math.cos(finAngle),
      this.wrist.y + this.paddle.x * Math.sin(rootAngle) + this.finTip.x * Math.sin(finAngle));
    this.feedStroke.x = this.wake.x;
    this.feedStroke.y = this.wake.y;
    this.feedStroke.strength = this.phase < previous ? feeding * 0.26 : 0;
  }
}
