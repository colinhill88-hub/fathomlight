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
    case 'anchor': {
      // Heavy iron fluke anchor leaning in the sand with a draped chain link and weed.
      g.moveTo(0, -52).lineTo(0, -10).stroke({ color: 0x4c5458, width: 6, cap: 'round' });
      g.moveTo(-1, -50).lineTo(-1, -12).stroke({ color: 0x7c868a, width: 1.8, alpha: 0.7 });
      g.moveTo(-16, -42).lineTo(16, -42).stroke({ color: 0x5c4a38, width: 5, cap: 'round' });
      g.circle(0, -55, 5.5).stroke({ color: 0x6c7478, width: 2.6 });
      g.moveTo(-24, -18).quadraticCurveTo(0, -2, 24, -18).stroke({ color: 0x4c5458, width: 6, cap: 'round' });
      g.poly([-28, -22, -18, -14, -22, -24]).fill({ color: 0x626c70 });
      g.poly([28, -22, 18, -14, 22, -24]).fill({ color: 0x626c70 });
      barnacles(g, [[-12, -10], [10, -8], [-4, -30], [14, -42]], 1.5);
      weed(g, -20, -14, 14, -5);
      weed(g, 18, -14, 12, 4, 0x8a7a30);
      break;
    }
    case 'coralarch': {
      // A natural arch of warm rosy-terracotta reef coral.
      g.moveTo(-26, 0).quadraticCurveTo(-24, -46, 0, -48).quadraticCurveTo(24, -46, 26, 0)
        .stroke({ color: 0xc2685e, width: 11, cap: 'round' });
      g.moveTo(-24, -4).quadraticCurveTo(-22, -44, 0, -46).quadraticCurveTo(22, -44, 24, -4)
        .stroke({ color: 0xe69c88, width: 4, alpha: 0.7, cap: 'round' });
      for (const [bx, by, tx, ty] of [[-20, -30, -32, -44], [-8, -46, -14, -58], [10, -46, 16, -57], [22, -28, 32, -40]] as const) {
        g.moveTo(bx, by).lineTo(tx, ty).stroke({ color: 0xd47a6e, width: 4.5, cap: 'round' });
        g.circle(tx, ty, 3).fill({ color: 0xf4c2b2 });
      }
      barnacles(g, [[-24, -4], [24, -5]], 1.4);
      break;
    }
    case 'astrolabe': {
      // A surveyor's weathered brass astrolabe tilted in the sand.
      g.circle(0, -24, 21).stroke({ color: 0xb88b3a, width: 4.5 });
      g.circle(0, -24, 16).stroke({ color: 0xdfc06c, width: 1.5, alpha: 0.7 });
      g.ellipse(0, -24, 20, 8).stroke({ color: 0x9c722c, width: 2.4 });
      g.ellipse(0, -24, 8, 20).stroke({ color: 0xc99c48, width: 2.2 });
      g.moveTo(-16, -34).lineTo(16, -14).stroke({ color: 0xf0d68a, width: 2.2, cap: 'round' });
      g.circle(0, -24, 3.5).fill({ color: 0xf2d88e });
      g.circle(0, -48, 4).stroke({ color: 0xb88b3a, width: 2 });
      g.ellipse(0, 1, 22, 5).fill({ color: 0xc2ab7e, alpha: 0.85 });
      break;
    }
    case 'floats': {
      // Hand-blown sea-green fisherman's glass floats in hemp netting.
      for (const [fx, fy, r, col] of [[-12, -13, 12, 0x5c9c88], [12, -11, 10, 0x76b094], [0, -25, 11, 0x4e8c7a]] as const) {
        g.circle(fx, fy, r).fill({ color: col, alpha: 0.88 });
        g.circle(fx - r * 0.3, fy - r * 0.3, r * 0.35).fill({ color: 0xd8f2df, alpha: 0.55 });
        g.circle(fx, fy, r).stroke({ color: 0x9c8256, width: 1.6, alpha: 0.8 });
        g.moveTo(fx - r * 0.7, fy - r * 0.5).lineTo(fx + r * 0.7, fy + r * 0.5).stroke({ color: 0x8a7048, width: 1.1, alpha: 0.7 });
        g.moveTo(fx + r * 0.7, fy - r * 0.5).lineTo(fx - r * 0.7, fy + r * 0.5).stroke({ color: 0x8a7048, width: 1.1, alpha: 0.7 });
      }
      weed(g, -22, 0, 11, -4);
      break;
    }
    case 'bell': {
      // Tarnished bronze ship's bell tilted in the sand.
      view.rotation = 0.24;
      g.poly([-20, -4, -14, -22, -11, -36, 11, -36, 14, -22, 20, -4]).fill({ color: 0x9c7838 });
      g.poly([-17, -6, -12, -22, -9, -34, -2, -34, -4, -20, -8, -6]).fill({ color: 0xd4b05c, alpha: 0.7 });
      g.ellipse(0, -4, 20, 4.5).fill({ color: 0x423018 });
      g.circle(0, -5, 4).fill({ color: 0xc9a24a });
      g.circle(0, -40, 4.5).stroke({ color: 0x8a6830, width: 2.4 });
      g.moveTo(-14, -20).lineTo(14, -20).stroke({ color: 0x5c8468, width: 2, alpha: 0.65 });
      barnacles(g, [[12, -10], [8, -28], [-12, -12]], 1.4);
      break;
    }
    case 'belljar': {
      // Brass-capped glass bell jar holding a warm glowing sprig of lumen moss.
      g.rect(-15, -7, 30, 7).fill({ color: 0x7a5c28 });
      g.roundRect(-13, -44, 26, 38, 12).fill({ color: 0x8cc2b0, alpha: 0.28 }).stroke({ color: 0xcce8d8, width: 1.5, alpha: 0.7 });
      g.ellipse(0, -14, 9, 5).fill({ color: 0x88b84c });
      g.circle(-4, -17, 3.5).fill({ color: 0xc2e86a });
      g.circle(3, -19, 4).fill({ color: 0xeaf8a8 });
      g.circle(0, -15, 2.5).fill({ color: 0xf8ffd0 });
      g.circle(0, -47, 3.5).fill({ color: 0xc9a24a });
      glow = new Graphics();
      glow.circle(0, -20, 30).fill({ color: 0xc6e86a, alpha: 0.24 });
      glow.circle(0, -20, 14).fill({ color: 0xeef8a8, alpha: 0.42 });
      break;
    }
    case 'cairn': {
      // Balanced stack of smooth river stones.
      for (const [cy, rx, ry, col] of [[-5, 22, 6, 0x6d6458], [-14, 17, 5.5, 0x8c806e], [-22, 13, 4.8, 0x646058], [-29, 9.5, 4, 0xa8987e], [-35, 6, 3.2, 0x7d7466]] as const) {
        g.ellipse(0, cy, rx, ry).fill({ color: col });
        g.ellipse(-rx * 0.25, cy - ry * 0.35, rx * 0.45, ry * 0.35).fill({ color: 0xe6dac0, alpha: 0.42 });
      }
      weed(g, 20, 0, 12, 5);
      weed(g, -20, 0, 10, -4, 0x8a7a30);
      break;
    }
    case 'kelplantern': {
      // Tall woven brass cage lantern on a stone plinth, casting warm golden light.
      g.rect(-14, -8, 28, 8).fill({ color: 0x5c5850 });
      g.rect(-3, -34, 6, 26).fill({ color: 0x7c5e2c });
      g.roundRect(-12, -52, 24, 24, 6).fill({ color: 0xffd066, alpha: 0.85 }).stroke({ color: 0x9c7634, width: 2.4 });
      g.moveTo(0, -52).lineTo(0, -28).stroke({ color: 0x7c5e2c, width: 1.8 });
      g.moveTo(-12, -40).lineTo(12, -40).stroke({ color: 0x7c5e2c, width: 1.6 });
      g.poly([-14, -52, 0, -60, 14, -52]).fill({ color: 0x6e5226 });
      glow = new Graphics();
      glow.circle(0, -40, 38).fill({ color: 0xffc254, alpha: 0.28 });
      glow.circle(0, -40, 18).fill({ color: 0xffe49c, alpha: 0.48 });
      break;
    }
  }
  return { view, glow };
}
