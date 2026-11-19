import { Container, Graphics } from 'pixi.js';

export interface Stroke {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  strength: number;
}

export interface ShorePose {
  dt: number;
  time: number;
  speed: number;
  notice: number;
  curious: number;
  flow: number;
  floor: number;
}

function joint(parent: Container, x: number, y: number): Container {
  const part = new Container();
  part.position.set(x, y);
  parent.addChild(part);
  return part;
}

export abstract class ShoreRig {
  readonly view = new Container();
  readonly markings = new Graphics();
  readonly halo = new Graphics();
  readonly stroke: Stroke = { x: 0, y: 0, vx: 0, vy: 0, radius: 36, strength: 0 };
  readonly eye = { x: 0, y: 0 };
  angle = 0;
  offset = 0;
  protected phase: number;

  protected constructor(seedPhase: number) {
    this.phase = seedPhase % 1;
  }

  protected tick(p: ShorePose, frequency: number): boolean {
    const previous = this.phase;
    this.phase = (previous + p.dt * frequency) % 1;
    this.stroke.strength = 0;
    return this.phase < previous;
  }

  abstract update(p: ShorePose): void;
}

export class PuffcapRig extends ShoreRig {
  private readonly bell = new Container();
  private readonly ribbons: { root: Container; tip: Container; baseX: number }[] = [];

  constructor(young: boolean, pattern: number, phase: number) {
    super(phase);
    const radius = young ? 23 : 34;
    const height = young ? 13 : 22;
    const cup = new Graphics()
      .moveTo(-radius, 1).bezierCurveTo(-radius, -height, -radius * 0.55, -height * 1.25, 0, -height * 1.17)
      .bezierCurveTo(radius * 0.65, -height * 1.2, radius, -height * 0.42, radius, 1)
      .quadraticCurveTo(radius * 0.85, 14, radius * 0.59, 7).quadraticCurveTo(radius * 0.35, 16, radius * 0.1, 8)
      .quadraticCurveTo(-radius * 0.1, 16, -radius * 0.33, 8).quadraticCurveTo(-radius * 0.75, 15, -radius, 1)
      .fill({ color: 0x914b63, alpha: 0.89 });
    cup.moveTo(-radius + 2, 1).bezierCurveTo(-radius, -height * 0.8, -radius * 0.36, -height * 1.34, radius * 0.32, -height)
      .quadraticCurveTo(radius * 0.72, -height * 0.81, radius - 4, -2).quadraticCurveTo(3, 14, -radius + 2, 1)
      .fill({ color: 0xe9a184, alpha: 0.88 });
    cup.moveTo(-radius + 5, -2).quadraticCurveTo(-radius * 0.59, -height, 0, -height + 3)
      .quadraticCurveTo(-radius * 0.52, -height * 0.45, -radius + 5, -2).fill({ color: 0xffdfb6, alpha: 0.74 });
    cup.moveTo(-radius + 1, 3).quadraticCurveTo(0, 18, radius - 1, 3)
      .stroke({ color: 0xffc9aa, alpha: 0.8, width: 2.4 });
    for (const x of [-5, 5]) cup.ellipse(x, 2, young ? 2.9 : 2.4, young ? 2.6 : 2).fill(0x523047);

    const count = young ? 3 : 5;
    for (let i = 0; i < count; i++) {
      const u = i / (count - 1) * 2 - 1;
      const length = (young ? 19 : 29) + (1 - Math.abs(u)) * (young ? 4 : 11);
      const root = joint(this.view, u * radius * 0.69, 5);
      root.addChild(new Graphics().moveTo(-4, 0).quadraticCurveTo(4, length * 0.5, -2.8, length + 1)
        .lineTo(3, length + 1).quadraticCurveTo(10, length * 0.4, 4, 0).fill({ color: 0xd9959f, alpha: 0.87 })
        .moveTo(0, 1).quadraticCurveTo(6, length * 0.5, 0, length + 2).stroke({ color: 0xffcfb2, width: 1.5, alpha: 0.73 }));
      const tip = joint(root, 0, length);
      tip.addChild(new Graphics().moveTo(-3, -2).quadraticCurveTo(-5, 11, 7 * u, young ? 12 : 20)
        .quadraticCurveTo(1, 8, 3, -2).fill({ color: 0xe5ad9d, alpha: 0.75 }));
      this.ribbons.push({ root, tip, baseX: root.x });
    }
    this.view.addChild(this.bell);
    this.bell.addChild(cup);
    for (let i = 0; i < 7; i++) {
      const u = (i - 3) / 3;
      const x = radius * u * 0.79;
      const y = pattern === 1 ? 6 : -height * (0.69 - u * u * 0.5);
      if (pattern === 2) this.markings.moveTo(x * 0.8, y).lineTo(x, y + 5).stroke({ color: 0xffd981, width: 1.5 });
      else this.markings.circle(x, y, 1.45).fill(0xffe5a1);
    }
    this.halo.ellipse(0, -4, radius * 1.1, height * 1.18).fill({ color: 0xffbd87, alpha: 0.48 });
    Object.assign(this.stroke, { y: 10, vy: 42, radius: young ? 28 : 46 });
  }

  update(p: ShorePose): void {
    const pulse = this.tick(p, 0.61 + Math.min(0.85, p.speed / 100) + p.notice * 0.38);
    const squeeze = Math.exp(-(((this.phase - 0.08) / 0.14) ** 2));
    const recover = Math.sin(this.phase * Math.PI);
    this.bell.scale.set(1 - squeeze * 0.28 + recover * 0.07, 1 + squeeze * 0.23);
    this.markings.scale.copyFrom(this.bell.scale);
    this.eye.x = 5 * this.bell.scale.x;
    this.eye.y = 2 * this.bell.scale.y;
    this.halo.scale.copyFrom(this.bell.scale);
    this.offset = -squeeze * 4;
    this.angle = Math.sin(p.time * 0.62) * 0.12 + p.flow * 0.23;
    this.ribbons.forEach(({ root, tip, baseX }, i) => {
      const u = i / (this.ribbons.length - 1) * 2 - 1;
      const lag = Math.sin(this.phase * Math.PI * 2 - i * 0.38 - 0.9);
      root.position.set(baseX * this.bell.scale.x, 5 * this.bell.scale.y);
      root.rotation = -u * (0.16 + recover * 0.27) + lag * 0.17 + p.flow * 0.58;
      tip.rotation = Math.sin(p.time * 2.1 - i * 0.55) * 0.27 + lag * 0.24 + p.flow * 0.49;
    });
    if (pulse) this.stroke.strength = 0.22 + p.notice * 0.19;
  }
}

export class TinkerRig extends ShoreRig {
  private readonly shell = new Container();
  private readonly legs: { limb: Container; shin: Container; foot: Container; far: boolean }[] = [];
  private readonly claw: Container;
  private readonly finger: Container;
  private readonly eyes: Container;
  private readonly shoulder = new Container();
  private readonly footY = 7;

  constructor(young: boolean, pattern: number, phase: number) {
    super(phase);
    const count = young ? 3 : 4;
    for (const far of [true, false]) {
      for (let i = 0; i < count; i++) {
        const x = -14 + i * 8 + (far ? 3 : 0);
        const limb = joint(this.view, x, -2);
        const shin = joint(limb, 0, 7);
        const foot = joint(shin, 0, 9);
        limb.addChild(new Graphics().moveTo(-2.3, -1).lineTo(-3.2, 6).lineTo(0, 9).lineTo(3.1, 5).lineTo(2.1, -1)
          .fill(far ? 0x584354 : 0x975765));
        shin.addChild(new Graphics().moveTo(-2.35, -1).lineTo(-1.35, 8).lineTo(0.6, 11).lineTo(2, 1)
          .fill(far ? 0x59454b : 0xb97568));
        foot.addChild(new Graphics().moveTo(-1.8, -2).lineTo(-4.1, 0).lineTo(1, 0.6).lineTo(1.2, -2).fill(0x4e3442));
        this.legs.push({ limb, shin, foot, far });
      }
    }
    this.view.addChild(this.shoulder, this.shell);
    const crown = young ? -18 : -28;
    const armor = new Graphics().moveTo(-24, -4).lineTo(-21, -13).lineTo(-28, crown + 3).lineTo(-10, crown + 5)
      .lineTo(-4, crown).lineTo(4, crown + 5).lineTo(17, crown + 4).lineTo(21, -7)
      .quadraticCurveTo(5, 6, -24, -4).fill(0x633749)
      .poly([-23, crown + 4, -10, crown + 7, -7, -8, -20, -9]).fill(0xbd756c)
      .poly([-9, crown + 7, -4, crown + 1, 7, crown + 8, 4, -6, -6, -8]).fill(0xd28f79)
      .poly([8, crown + 8, 16, crown + 5, 19, -8, 6, -6]).fill(0xad625c)
      .moveTo(-20, -7).quadraticCurveTo(-1, 2, 20, -9).stroke({ color: 0xe39d79, width: 2.4, alpha: 0.87 });
    this.shell.addChild(armor);
    this.eyes = joint(this.shell, 16, -13);
    for (const [x, y] of [[1, -6], [6, -1]]) {
      this.eyes.addChild(new Graphics().moveTo(-2, 7).lineTo(x, y).stroke({ color: 0x704553, width: 2.7 })
        .circle(x, y, young ? 3.5 : 2.8).fill(0xffd894).circle(x + 0.9, y, 1.65).fill(0x282332));
    }
    const arm = joint(this.shoulder, 14, -3);
    arm.addChild(new Graphics().moveTo(-2, -1).lineTo(10, -3).lineTo(14, 0).lineTo(9, 5).lineTo(0, 3).fill(0x9c605f));
    this.claw = joint(arm, 12, 0);
    this.claw.addChild(new Graphics().moveTo(-2, 1).quadraticCurveTo(-6, -6, 0, -10).quadraticCurveTo(10, -16, 18, -8)
      .lineTo(12, -4).lineTo(7, -6).lineTo(5, 0).quadraticCurveTo(1, 5, -2, 1).fill(0xd58c72)
      .moveTo(-1, -6).quadraticCurveTo(6, -12, 13, -9).stroke({ color: 0xf3bb90, width: 2 }));
    this.finger = joint(this.claw, 4, 0);
    this.finger.addChild(new Graphics().moveTo(-3, 0).quadraticCurveTo(8, 6, 14, -4).lineTo(7, -1).lineTo(0, -3).fill(0xb16a62));
    for (let i = 0; i < 5; i++) {
      const x = -14 + i * 7;
      if (pattern === 1) this.markings.moveTo(x, -10).lineTo(x + 1, -16).stroke({ color: 0xffc76e, width: 1.8 });
      else this.markings.circle(x, pattern === 2 ? -12 - Math.abs(i - 2) * 2 : -7, 1.4).fill(0xffce7f);
    }
    this.halo.ellipse(0, -10, 29, 17).fill({ color: 0xffb66e, alpha: 0.25 });
    Object.assign(this.stroke, { y: 5, vx: -26, vy: -21, radius: 35 });
  }

  update(p: ShorePose): void {
    const walk = Math.min(1, p.speed / 32);
    const step = this.tick(p, p.speed / 17);
    const probe = Math.max(0, Math.sin(p.time * 0.85)) ** 7;
    const brace = p.notice;
    const bodyY = -Math.abs(Math.sin(this.phase * Math.PI * 2)) * walk * 2 + brace * 2;
    this.shell.y = this.shoulder.y = this.markings.y = this.halo.y = bodyY;
    this.eyes.rotation = -p.curious * 0.24 + Math.sin(p.time * 0.9) * 0.13 + p.flow * 0.13;
    this.eye.x = 16 + 6 * Math.cos(this.eyes.rotation) + Math.sin(this.eyes.rotation);
    this.eye.y = -13 + bodyY + 6 * Math.sin(this.eyes.rotation) - Math.cos(this.eyes.rotation);
    this.claw.rotation = -0.22 + probe * 0.46 - p.curious * 0.48 + brace * 0.59;
    this.finger.rotation = 0.16 + probe * (0.28 + Math.sin(p.time * 12) * 0.2) + p.curious * 0.38;
    this.legs.forEach(({ limb, shin, foot, far }, i) => {
      const cycle = (this.phase + i * 0.39) % 1;
      const lift = Math.max(0, Math.sin(cycle * Math.PI * 2)) * walk * 5;
      const minY = (far ? this.footY - 3 : this.footY) + limb.x * p.floor;
      const px = (0.5 - cycle) * walk * 12 - (14 - i % (this.legs.length / 2) * 9) * 0.43;
      limb.y = -4 + bodyY;
      const py = minY - lift - limb.y;
      const length = Math.min(15.8, Math.hypot(px, py));
      const knee = Math.acos(Math.max(-1, Math.min(1, (length * length - 7 ** 2 - 9 ** 2) / (2 * 7 * 9))));
      limb.rotation = Math.atan2(-px, py) - Math.atan2(Math.sin(knee) * 9, 7 + Math.cos(knee) * 9);
      shin.rotation = knee;
      foot.rotation = -limb.rotation - knee;
    });
    if (step && walk > 0.6) this.stroke.strength = 0.14 + brace * 0.16;
  }
}

export class LanternShrimpRig extends ShoreRig {
  private readonly abdomen: Container[] = [];
  private readonly feelers: { base: Container; tip: Container }[] = [];
  private readonly fans: Container[] = [];
  private readonly mask = new Container();
  private tuck = 0;
  private previousSpeed = 0;
  private tailTime = 0;

  constructor(young: boolean, pattern: number, phase: number) {
    super(phase);
    const count = young ? 3 : 5;
    let end = joint(this.view, -4, -3);
    for (let i = 0; i < count; i++) {
      const w = 8 - i * 0.6;
      const h = 9 - i * 0.9;
      end.addChild(new Graphics().moveTo(2, -h - 2).quadraticCurveTo(-w * 0.7, -h - 3, -w - 2, -h * 0.55)
        .lineTo(-w - 1, h * 0.71).quadraticCurveTo(-3, h + 3, 1, h).fill({ color: 0x8d4c60, alpha: 0.95 })
        .moveTo(0, -h - 1).quadraticCurveTo(-w - 1, -h - 3, -w, h * 0.37).quadraticCurveTo(-2, h, 0, -h - 1)
        .fill({ color: 0xe3a99a, alpha: 0.64 }).moveTo(-w + 1.5, -h * 0.71).lineTo(-w + 1, h * 0.59)
        .stroke({ color: 0xffd6b1, width: 1.35, alpha: 0.85 }));
      this.abdomen.push(end);
      end = joint(end, -w + 1, 1);
    }
    end.addChild(new Graphics().moveTo(1, 0).quadraticCurveTo(-13, -22, -18, -14).quadraticCurveTo(-24, -10, -12, 0)
      .quadraticCurveTo(-25, 6, -18, 14).quadraticCurveTo(-11, 18, 1, 0).fill(0xc7787e)
      .moveTo(-2, 0).lineTo(-17, -11).moveTo(-2, 0).lineTo(-16, 11).stroke({ color: 0xffceaa, width: 1.8, alpha: 0.8 }));
    this.abdomen.push(end);
    this.view.addChild(this.mask);
    this.mask.addChild(new Graphics().moveTo(-9, -7).quadraticCurveTo(6, -22, 22, -11).lineTo(34, -10)
      .lineTo(25, -3).quadraticCurveTo(18, 14, 2, 12).quadraticCurveTo(-10, 8, -9, -7).fill(0x8c4e6c)
      .moveTo(-7, -7).quadraticCurveTo(7, -20, 22, -10).quadraticCurveTo(10, 0, -4, 4).fill(0xefba9b)
      .moveTo(1, 10).quadraticCurveTo(13, 12, 20, -2).stroke({ color: 0xffc9a0, width: 2.5 })
      .circle(23, -11, young ? 4.9 : 3.7).fill(0x342a41).circle(24, -12, young ? 2.4 : 1.75).fill(0xffe2b8));
    for (let i = 0; i < 3; i++) {
      const fan = joint(this.mask, 12 - i * 7, 7);
      fan.addChild(new Graphics().moveTo(0, 0).quadraticCurveTo(4, 7, -5, 14).quadraticCurveTo(-10, 8, -2, 0)
        .fill({ color: 0xf1c0aa, alpha: 0.78 }));
      this.fans.push(fan);
    }
    for (const [i, length] of [young ? 16 : 23, young ? 20 : 31].entries()) {
      const base = joint(this.mask, 27, -7);
      base.addChild(new Graphics().moveTo(0, 0).quadraticCurveTo(length * 0.38, -8 - i * 5, length, -13 - i * 6)
        .stroke({ color: i ? 0xeeb3a1 : 0xffd4b9, width: 1.55 }));
      const tip = joint(base, length, -13 - i * 6);
      tip.addChild(new Graphics().moveTo(-1, 0).quadraticCurveTo(11, -5, young ? 16 : 23, -1)
        .stroke({ color: 0xffcfab, width: 1.2, alpha: 0.83 }));
      this.feelers.push({ base, tip });
    }
    for (let i = 0; i < 4; i++) {
      const x = -2 + i * 6;
      if (pattern === 1) this.markings.moveTo(x, 2).lineTo(x + 2, 7 - i).stroke({ color: 0xffd681, width: 1.7 });
      else this.markings.ellipse(x, pattern === 2 ? -3 - i : 5 - i, i === 3 ? 2.8 : 1.8, 1.3).fill(0xffe2a5);
    }
    this.halo.ellipse(8, 2, 24, 17).fill({ color: 0xffc784, alpha: 0.35 });
    this.eye.x = 24;
    this.eye.y = -12;
    Object.assign(this.stroke, { radius: 44, vx: -58, vy: 18 });
  }

  update(p: ShorePose): void {
    this.tailTime = Math.max(0, this.tailTime - p.dt);
    const burst = p.speed > 66 && (p.speed - this.previousSpeed > 40 * p.dt || p.notice > 0.5);
    if (burst && !this.tailTime) this.tailTime = 0.62;
    this.previousSpeed = p.speed;
    const burstPose = Math.max(0, (this.tailTime - 0.32) / 0.3);
    this.tuck += (burstPose - this.tuck) * Math.min(1, p.dt * (burstPose > this.tuck ? 19 : 8));
    this.tick(p, 3 + Math.min(2.4, p.speed * 0.018));
    this.angle = -this.tuck * 0.42 + Math.sin(p.time * 1.5) * 0.07;
    this.offset = this.tuck * 2.3;
    let x = 0;
    let y = 0;
    let angle = 0;
    this.abdomen.forEach((part, i) => {
      x += part.x * Math.cos(angle) - part.y * Math.sin(angle);
      y += part.x * Math.sin(angle) + part.y * Math.cos(angle);
      part.rotation = -this.tuck * (i === 0 ? 0.74 : 0.48) + Math.sin(p.time * 4 - i * 0.71) * 0.1 + p.flow * 0.13;
      angle += part.rotation;
    });
    this.stroke.x = x - Math.cos(angle) * 13;
    this.stroke.y = y - Math.sin(angle) * 13;
    if (this.tailTime > 0.32 && this.tailTime - p.dt <= 0.32) this.stroke.strength = 0.46;
    this.fans.forEach((fan, i) => { fan.rotation = Math.sin(this.phase * Math.PI * 2 - i * 1.5) * 0.57 - this.tuck * 0.8; });
    this.feelers.forEach(({ base, tip }, i) => {
      base.rotation = Math.sin(p.time * 1.8 - i * 1.8) * 0.19 + p.curious * 0.37 - this.tuck * 0.64 + p.flow * 0.24;
      tip.rotation = Math.sin(p.time * 2.5 - i * 1.45) * 0.29 + this.tuck * 0.54 + p.flow * 0.5;
    });
  }
}

export class CinderRig extends ShoreRig {
  private readonly shell = new Container();
  private readonly foot = new Graphics();
  private readonly head: Container;
  private readonly feelers: Container[] = [];
  private readonly frill: Container[] = [];
  private readonly eyeHeight: number;

  constructor(young: boolean, pattern: number, phase: number) {
    super(phase);
    this.eyeHeight = young ? 10 : 15;
    this.head = joint(this.view, 13, 0);
    this.head.addChild(new Graphics().moveTo(-5, 3).quadraticCurveTo(3, -9, 15, -9).quadraticCurveTo(24, -4, 17, 4)
      .lineTo(-4, 6).fill(0x9b7d67).moveTo(4, 0).quadraticCurveTo(11, -7, 17, -4).stroke({ color: 0xcab296, width: 2.4 }));
    for (const [i, x] of [10, 17].entries()) {
      const active = joint(this.head, x, -5);
      const h = young ? 8 + i * 2 : 11 + i * 4;
      active.addChild(new Graphics().moveTo(0, 0).quadraticCurveTo(2, -h * 0.65, 6, -h).stroke({ color: 0xc49878, width: 2.4 })
        .circle(6, -h, young ? 2.6 : 2.1).fill(0x4d3a38).circle(6.6, -h - 0.5, 0.9).fill(0xffd896));
      this.feelers.push(active);
    }
    this.view.addChild(this.foot, this.shell);
    this.foot.moveTo(-29, 4).quadraticCurveTo(-27, -1, -15, -3).quadraticCurveTo(2, -9, 24, -2)
      .quadraticCurveTo(37, 5, 21, 6).lineTo(-24, 6).closePath().fill(0x65574f)
      .moveTo(-25, 4).quadraticCurveTo(1, 0, 24, 4).stroke({ color: 0xbba485, width: 2.3 });
    const h = young ? 23 : 45;
    const edge = new Graphics().moveTo(-25, 2).quadraticCurveTo(-33, -15, -21, -h * 0.62)
      .lineTo(-18, -h + 6).lineTo(-10, -h).lineTo(3, -h + 2).lineTo(0, -h + 14)
      .lineTo(11, -h * 0.51).quadraticCurveTo(25, -8, 14, 2).closePath().fill(0x563e36);
    edge.moveTo(-24, -1).quadraticCurveTo(-28, -15, -16, -h * 0.65).lineTo(-15, -h + 8)
      .lineTo(-8, -h + 5).quadraticCurveTo(-15, -h * 0.49, -2, -4).fill(0x947263);
    edge.moveTo(-14, -h + 6).lineTo(-9, -h + 2).lineTo(0, -h + 4).lineTo(-4, -h + 12).lineTo(-15, -h + 12).fill(0xc88057);
    for (let i = 0; i < (young ? 3 : 5); i++) {
      const y = -h * 0.79 + i * h * 0.155;
      edge.moveTo(-18 - i, y - 3).quadraticCurveTo(-10, y + 6, -2 + i * 3, y - 1)
        .stroke({ color: i % 2 ? 0x453733 : 0xbd8968, width: 2.6, alpha: 0.8 });
    }
    this.shell.addChild(edge);
    for (let i = 0; i < 5; i++) {
      const lobe = joint(this.view, -19 + i * 8, 3);
      lobe.addChild(new Graphics().ellipse(0, 1, 5.2, 2.2).fill(0x96755e));
      this.frill.push(lobe);
    }
    this.markings.ellipse(-8, -h + 5, 5.3, 1.9).fill(0xffbc6a);
    for (let i = 0; i < 4; i++) {
      const y = -h * 0.72 + i * h * 0.18;
      if (pattern === 2) this.markings.moveTo(-7 - i * 1.6, y).lineTo(i * 2, y + 2.4).stroke({ color: 0xec8a4b, width: 1.5 });
      else this.markings.circle(-8 + i * (pattern ? 3 : 0.5), y, 1.4).fill(0xff9452);
    }
    this.halo.ellipse(-7, -h + 7, 17, 17).fill({ color: 0xff8744, alpha: 0.48 });
    Object.assign(this.stroke, { x: -16, y: 2, vx: -15, vy: -18, radius: 26 });
  }

  update(p: ShorePose): void {
    const step = this.tick(p, 0.21 + p.speed / 18);
    const walk = Math.min(1, p.speed / 12);
    const wave = this.phase * Math.PI * 2;
    const retract = Math.max(p.notice, Math.max(0, Math.sin(p.time * 0.77)) ** 12 * 0.31);
    this.shell.rotation = Math.sin(wave) * walk * 0.058;
    this.markings.rotation = this.halo.rotation = this.shell.rotation;
    this.foot.scale.x = 1 + Math.sin(wave) * walk * 0.075;
    this.head.scale.x = 1.1 - retract * 0.49;
    this.head.x = 13 - retract * 10;
    this.head.rotation = 0.12 + Math.sin(p.time * 1.25) * 0.14 + retract * 0.29;
    this.feelers.forEach((part, i) => {
      part.rotation = Math.sin(p.time * (0.98 + i * 0.56) + i) * 0.29 + retract * 0.59 + p.flow * 0.38;
      part.scale.y = 1 - retract * 0.47;
    });
    const front = this.feelers[1];
    const eyeX = (front.x + 6.6 * Math.cos(front.rotation) + this.eyeHeight * front.scale.y * Math.sin(front.rotation)) * this.head.scale.x;
    const eyeY = front.y + 6.6 * Math.sin(front.rotation) - this.eyeHeight * front.scale.y * Math.cos(front.rotation);
    this.eye.x = this.head.x + eyeX * Math.cos(this.head.rotation) - eyeY * Math.sin(this.head.rotation);
    this.eye.y = this.head.y + eyeX * Math.sin(this.head.rotation) + eyeY * Math.cos(this.head.rotation);
    this.frill.forEach((lobe, i) => { lobe.scale.y = 0.83 + Math.sin(wave - i * 0.88) * walk * 0.29 - retract * 0.31; });
    this.angle = Math.atan(p.floor) * 0.52;
    if (step && walk > 0.7) this.stroke.strength = 0.09;
  }
}
