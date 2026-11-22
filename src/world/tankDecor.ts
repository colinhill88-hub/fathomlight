import { Container, Graphics } from 'pixi.js';
import type { DecorId } from '../game/state';

/*
 * Phase 20/21: aquarium decorations, drawn in code in the game's painterly way:
 * layered shapes with a lit side and a shadow side, soft rim light, small
 * encrusting details (barnacles, weed), and warm colours only (cyan, violet and
 * magenta belong to the Choir). Each piece is about 60 units wide at scale 1,
 * standing on its own origin (the sand line), so the tank places it on the floor.
 *
 * The lantern also returns a glow shape for the glow layer.
 */

const SHADE = 0x0d1a1c;

function barnacles(g: Graphics, pts: [number, number][], r = 1.6): void {
  for (const [x, y] of pts) {
    g.circle(x, y, r).fill({ color: 0xd8cfb8 });
    g.circle(x - r * 0.25, y - r * 0.3, r * 0.45).fill({ color: 0x5b5446 });
  }
}

function weed(g: Graphics, x: number, y: number, h: number, lean: number, color = 0x6f8a3a): void {
  g.moveTo(x, y).quadraticCurveTo(x + lean, y - h * 0.6, x + lean * 0.4, y - h).stroke({ color, width: 2.2, alpha: 0.9, cap: 'round' });
}

export function drawDecor(id: DecorId): { view: Container; glow?: Graphics } {
  const view = new Container();
  const g = new Graphics();
  view.addChild(g);
  // A soft contact shadow on the sand.
  g.ellipse(0, 0, 30, 4.5).fill({ color: SHADE, alpha: 0.35 });
  let glow: Graphics | undefined;
  switch (id) {
    case 'arch': {
      // Two weathered pillars and a lintel of reef stone, with a dark opening to swim through.
      g.poly([-30, 0, -26, -40, -14, -54, 14, -54, 26, -40, 30, 0, 17, 0, 15, -30, 6, -38, -6, -38, -15, -30, -17, 0]).fill({ color: 0x8a7a62 });
      g.poly([-30, 0, -26, -40, -14, -54, -10, -50, -20, -38, -22, 0]).fill({ color: 0xb4a283, alpha: 0.85 });
      g.poly([30, 0, 26, -40, 20, -44, 24, -36, 22, 0]).fill({ color: 0x5c4f3f, alpha: 0.8 });
      g.poly([-17, 0, -15, -30, -6, -38, 6, -38, 15, -30, 17, 0]).fill({ color: 0x1d2a2a, alpha: 0.55 });
      for (const [x, y, r] of [[-22, -20, 3], [20, -12, 2.5], [-6, -48, 2.2], [8, -46, 1.6]] as const) g.circle(x, y, r).fill({ color: 0x5f523f, alpha: 0.7 });
      g.moveTo(-14, -54).lineTo(14, -54).stroke({ color: 0xe8d7b0, width: 1.2, alpha: 0.5 });
      barnacles(g, [[-24, -6], [-26, -10], [24, -4], [12, -50]]);
      weed(g, -27, 0, 14, -5);
      weed(g, 27, 0, 11, 4, 0x8a7a30);
      break;
    }
    case 'amphora': {
      // A tipped clay amphora half sunk in the sand, its mouth a dark hollow.
      view.rotation = -0.35;
      g.ellipse(0, -18, 16, 20).fill({ color: 0xa65a36 });
      g.ellipse(-5, -22, 8, 13).fill({ color: 0xc9774a, alpha: 0.8 });
      g.ellipse(6, -12, 9, 12).fill({ color: 0x6e3820, alpha: 0.55 });
      g.rect(-5, -46, 10, 10).fill({ color: 0x9a5232 });
      g.ellipse(0, -46, 7, 2.6).fill({ color: 0x3a1f14 });
      g.moveTo(-5, -40).quadraticCurveTo(-16, -40, -13, -28).stroke({ color: 0x8a4a2c, width: 2.6 });
      g.moveTo(5, -40).quadraticCurveTo(16, -40, 13, -28).stroke({ color: 0x8a4a2c, width: 2.6 });
      g.moveTo(-14, -16).lineTo(14, -16).stroke({ color: 0x5a2e1a, width: 1.2, alpha: 0.6 });
      barnacles(g, [[-10, -8], [-6, -4], [9, -26]], 1.4);
      g.ellipse(0, 1, 18, 4).fill({ color: 0xcbb68a, alpha: 0.9 });
      break;
    }
    case 'helmet': {
      // An old brass diving helmet with three round portholes, green with age at the seams.
      g.rect(-20, -10, 40, 10).fill({ color: 0x7a5a24 });
      g.circle(0, -30, 21).fill({ color: 0xb9893a });
      g.circle(-6, -36, 12).fill({ color: 0xdcb05a, alpha: 0.7 });
      g.circle(7, -24, 13).fill({ color: 0x7a5a24, alpha: 0.5 });
      for (const [x, y, r] of [[0, -30, 8], [-15, -28, 4.5], [15, -28, 4.5]] as const) {
        g.circle(x, y, r + 2).fill({ color: 0x8c6a2c });
        g.circle(x, y, r).fill({ color: 0x18282a });
        g.circle(x - r * 0.35, y - r * 0.35, r * 0.3).fill({ color: 0xbfe0d0, alpha: 0.35 });
      }
      g.moveTo(-20, -10).lineTo(20, -10).stroke({ color: 0x5f8a6a, width: 2, alpha: 0.6 });
      for (let i = -16; i <= 16; i += 8) g.circle(i, -5, 1.4).fill({ color: 0xe3c27a });
      weed(g, 18, -2, 10, 5);
      break;
    }
    case 'chest': {
      // A barnacled sea chest, lid ajar, with a few bubbles slipping out (the tank adds the bubbles).
      g.rect(-24, -24, 48, 24).fill({ color: 0x5e3b22 });
      g.rect(-24, -24, 48, 6).fill({ color: 0x7a4c2c });
      g.poly([-25, -24, -22, -36, 22, -40, 25, -26]).fill({ color: 0x6d4428 });
      g.poly([-22, -36, 22, -40, 21, -37, -21, -33]).fill({ color: 0x9a6438, alpha: 0.7 });
      g.poly([-24, -24, 24, -24, 22, -27, -22, -27]).fill({ color: 0x120c08, alpha: 0.8 });
      g.poly([-22, -27, 22, -27, 18, -26, -18, -26]).fill({ color: 0xffd27a, alpha: 0.35 });
      for (const x of [-16, 16]) g.rect(x - 2, -38, 4, 38).fill({ color: 0x8a7a4a });
      g.rect(-3, -18, 6, 7).fill({ color: 0xc9a24a });
      barnacles(g, [[-20, -4], [-12, -2], [20, -12], [14, -36]], 1.5);
      break;
    }
    case 'driftwood': {
      // A silvered branch lying across the sand, forked, with weed on its tips.
      g.moveTo(-32, -4).quadraticCurveTo(-6, -14, 10, -10).quadraticCurveTo(22, -8, 32, -18).stroke({ color: 0x8c8070, width: 7, cap: 'round' });
      g.moveTo(-32, -6).quadraticCurveTo(-6, -16, 10, -12).stroke({ color: 0xc8bca8, width: 2.4, alpha: 0.7, cap: 'round' });
      g.moveTo(2, -11).quadraticCurveTo(4, -26, -6, -38).stroke({ color: 0x7a6e60, width: 4.5, cap: 'round' });
      g.moveTo(16, -10).quadraticCurveTo(20, -20, 28, -26).stroke({ color: 0x7a6e60, width: 3, cap: 'round' });
      g.circle(-18, -9, 2).fill({ color: 0x4a4036 });
      weed(g, -6, -38, 9, -4);
      weed(g, 32, -18, 8, 4, 0x8a7a30);
      break;
    }
    case 'clam': {
      // A giant open clam shell, ridged outside, pearly inside, with one warm pearl.
      g.poly([-30, -2, -22, -16, 0, -20, 22, -16, 30, -2]).fill({ color: 0xb8a68a });
      g.ellipse(0, -16, 28, 16).fill({ color: 0xe8dccb });
      g.ellipse(-4, -20, 20, 10).fill({ color: 0xfff3e2, alpha: 0.7 });
      g.ellipse(0, -14, 24, 8).fill({ color: 0xd9c4b0, alpha: 0.6 });
      for (let i = -24; i <= 24; i += 6) g.moveTo(i, -2).lineTo(i * 0.75, -26).stroke({ color: 0x8f7c62, width: 1.4, alpha: 0.6 });
      g.poly([-28, -18, -20, -34, 0, -40, 20, -34, 28, -18, 0, -24]).fill({ color: 0xa8957a });
      g.poly([-20, -32, 0, -38, 20, -32, 0, -26]).fill({ color: 0xe9dcc7, alpha: 0.5 });
      g.circle(4, -14, 5).fill({ color: 0xfff6e8 });
      g.circle(2.6, -15.6, 1.8).fill({ color: 0xffffff, alpha: 0.9 });
      break;
    }
    case 'lantern': {
      // A ship's lantern on its side in the sand, its glass still glowing a soft amber.
      g.rect(-12, -40, 24, 34).fill({ color: 0x3a2c1e });
      g.rect(-9, -37, 18, 28).fill({ color: 0xffc860, alpha: 0.85 });
      g.rect(-9, -37, 7, 28).fill({ color: 0xfff0c0, alpha: 0.5 });
      for (const x of [-12, 0, 12]) g.rect(x - 1.5, -40, 3, 34).fill({ color: 0x5a4430 });
      g.rect(-15, -8, 30, 8).fill({ color: 0x4a3828 });
      g.poly([-14, -40, 0, -50, 14, -40]).fill({ color: 0x4a3828 });
      g.circle(0, -53, 4).stroke({ color: 0x6a5238, width: 2 });
      glow = new Graphics();
      glow.circle(0, -23, 34).fill({ color: 0xffb84a, alpha: 0.28 });
      glow.circle(0, -23, 16).fill({ color: 0xffd27a, alpha: 0.45 });
      break;
    }
    case 'wheel': {
      // A wooden ship's wheel, half sunk, its spokes worn smooth.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.moveTo(0, -20).lineTo(Math.cos(a) * 32, -20 + Math.sin(a) * 32).stroke({ color: 0x6e4a2a, width: 3.4, cap: 'round' });
      }
      g.circle(0, -20, 22).stroke({ color: 0x7e5634, width: 6 });
      g.circle(0, -20, 22).stroke({ color: 0xa8784a, width: 1.6, alpha: 0.7 });
      g.circle(0, -20, 6).fill({ color: 0x5a3c22 });
      g.circle(0, -20, 2.6).fill({ color: 0xc9a24a });
      // The sand covers its lower part.
      g.ellipse(0, 4, 36, 10).fill({ color: 0xc9b388 });
      g.ellipse(-8, 0, 20, 4).fill({ color: 0xe0cca0, alpha: 0.7 });
      barnacles(g, [[-18, -34], [20, -8]], 1.5);
      break;
    }
  }
  return { view, glow };
}
