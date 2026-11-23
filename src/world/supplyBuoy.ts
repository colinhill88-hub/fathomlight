import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { SUPPLY_BUOY_X } from '../game/exchange';
import { getPropArt } from '../art/propArt';
import { groundY } from './terrain';

/**
 * The Kestrel Supply Buoy (EX-1): a weathered charcoal-and-brass research exchange
 * buoy moored just east of the base. Swim up and press Collect to dispatch surplus
 * creatures for Survey Credits or buy exclusive tank decor, tonics, and supplies.
 */
export class SupplyBuoy {
  readonly view = new Container();
  readonly emissive = new Container();
  readonly glow = new Container();

  readonly x = SUPPLY_BUOY_X;
  readonly baseY = 145;
  y = 145;

  private readonly floorY: number;
  private readonly chain = new Graphics();
  private readonly body = new Container();
  private readonly emBody = new Container();
  private readonly glowBody = new Container();
  private readonly beacon = new Graphics();
  private readonly beaconGlow = new Graphics();

  constructor() {
    this.floorY = groundY(this.x);
    this.view.addChild(this.chain, this.body);
    this.emissive.addChild(this.emBody);
    this.glow.addChild(this.glowBody);

    // Anchor block on the seabed.
    const anchor = new Graphics();
    anchor.position.set(this.x, this.floorY);
    anchor.poly([-24, 4, -18, -14, 18, -14, 24, 4]).fill({ color: 0x3b4448 });
    anchor.poly([-18, -14, 18, -14, 14, -10, -14, -10]).fill({ color: 0x627074, alpha: 0.7 });
    anchor.circle(0, -16, 5).stroke({ color: 0x8a7444, width: 2.5 });
    this.view.addChild(anchor);

    // Buoy hull: painted sprite if available, else procedural charcoal-and-brass drum.
    const painted = getPropArt().vehicles.buoy;
    if (painted) {
      const spr = new Sprite(painted);
      spr.anchor.set(0.5, 0.58);
      const sc = 128 / Math.max(1, painted.height);
      spr.scale.set(sc);
      spr.position.set(0, 2);
      this.body.addChild(spr);

      // Emissive beacon perched on the mast lamp.
      this.beacon.circle(0, -64, 4.4).fill({ color: 0xc6f03a });
      this.emBody.addChild(this.beacon);

      // Soft glow halo.
      this.beaconGlow.circle(0, -64, 38).fill({ color: 0xc6f03a, alpha: 0.28 });
      this.beaconGlow.circle(0, -64, 16).fill({ color: 0xe8ff9a, alpha: 0.45 });
      this.glowBody.addChild(this.beaconGlow);
    } else {
      const g = new Graphics();
      // Lower ballast keel & mooring ring.
      g.rect(-14, 24, 28, 12).fill({ color: 0x262d30 });
      g.circle(0, 40, 5.5).stroke({ color: 0x8a7444, width: 2.6 });
      // Main charcoal pressure hull.
      g.roundRect(-34, -22, 68, 48, 14).fill({ color: 0x2d3538 });
      // Top sunlit highlight + bottom shade.
      g.roundRect(-30, -20, 60, 14, 8).fill({ color: 0x48565a, alpha: 0.72 });
      g.roundRect(-32, 12, 64, 12, 6).fill({ color: 0x171d20, alpha: 0.65 });
      // Brushed brass middle band & rivets.
      g.rect(-34, -4, 68, 10).fill({ color: 0xb68b3a });
      g.rect(-34, -4, 68, 3).fill({ color: 0xe6c878, alpha: 0.65 });
      for (const rx of [-26, -12, 12, 26]) g.circle(rx, 1, 1.5).fill({ color: 0x5c4418 });
      // Chrome side collars / bumpers.
      g.roundRect(-38, -14, 7, 30, 3).fill({ color: 0x7e8d90 });
      g.roundRect(31, -14, 7, 30, 3).fill({ color: 0x7e8d90 });
      // Dispatch porthole window (lime-tinted Kestrel glass).
      g.circle(0, 1, 12).fill({ color: 0x6c7a7c });
      g.circle(0, 1, 9.5).fill({ color: 0x1b3a34 });
      g.circle(-2.5, -2, 3.2).fill({ color: 0xc6f03a, alpha: 0.35 });
      // Upper antenna mast & beacon housing.
      g.rect(-14, -30, 28, 9).fill({ color: 0x434d50 });
      g.moveTo(0, -30).lineTo(0, -56).stroke({ color: 0x7e8d90, width: 3.5, cap: 'round' });
      g.moveTo(-10, -40).lineTo(10, -40).stroke({ color: 0xb68b3a, width: 2.2, cap: 'round' });
      g.circle(0, -58, 6).fill({ color: 0x3b4448 });

      const stencil = new Text({
        text: 'EX-1',
        style: { fontFamily: 'monospace', fontSize: 9, fontWeight: 'bold', fill: 0xf2d488, letterSpacing: 1 },
      });
      stencil.anchor.set(0.5);
      stencil.position.set(0, -13);

      this.body.addChild(g, stencil);

      // Emissive beacon & warm brass porthole ring.
      this.beacon.circle(0, -58, 4.4).fill({ color: 0xc6f03a });
      const portEm = new Graphics();
      portEm.circle(0, 1, 9.5).stroke({ color: 0xc6f03a, width: 1.4, alpha: 0.65 });
      this.emBody.addChild(this.beacon, portEm);

      // Soft glow halo.
      this.beaconGlow.circle(0, -58, 36).fill({ color: 0xc6f03a, alpha: 0.24 });
      this.beaconGlow.circle(0, -58, 16).fill({ color: 0xe8ff9a, alpha: 0.42 });
      const portGlow = new Graphics();
      portGlow.circle(0, 1, 24).fill({ color: 0xc6f03a, alpha: 0.14 });
      this.glowBody.addChild(this.beaconGlow, portGlow);
    }

    this.update(0);
  }

  update(time: number): void {
    const bob = Math.sin(time * 1.35) * 6.5;
    const sway = Math.sin(time * 0.85 + 0.7) * 5;
    const tilt = Math.sin(time * 0.95) * 0.055;
    const bx = this.x + sway;
    const by = this.baseY + bob;
    this.y = by;

    this.body.position.set(bx, by);
    this.body.rotation = tilt;
    this.emBody.position.set(bx, by);
    this.emBody.rotation = tilt;
    this.glowBody.position.set(bx, by);
    this.glowBody.rotation = tilt;

    // Beacon pulse.
    const pulse = 0.55 + 0.45 * Math.sin(time * 3.1);
    this.beacon.alpha = 0.7 + pulse * 0.3;
    this.beaconGlow.alpha = 0.45 + pulse * 0.55;

    // Mooring chain from seabed anchor to buoy keel.
    const cg = this.chain.clear();
    const topX = bx - Math.sin(tilt) * 40;
    const topY = by + Math.cos(tilt) * 40;
    const midX = (topX + this.x) * 0.5 + Math.sin(time * 1.1) * 8;
    const midY = (topY + this.floorY - 16) * 0.5;
    cg.moveTo(this.x, this.floorY - 16)
      .quadraticCurveTo(midX, midY, topX, topY)
      .stroke({ color: 0x3b4448, width: 3.4 });
    cg.moveTo(this.x, this.floorY - 16)
      .quadraticCurveTo(midX, midY, topX, topY)
      .stroke({ color: 0x8e7c52, width: 1.1, alpha: 0.6 });
  }
}
