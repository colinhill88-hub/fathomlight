import { FillGradient, type Graphics } from 'pixi.js';
import { FULMAR_PALETTE as PAL } from '../world/fulmarArt';

const baffle = new FillGradient({
  type: 'linear', start: { x: 0, y: 0.3 }, end: { x: 1, y: 0.54 },
  colorStops: [{ offset: 0, color: 0x2a3231 }, { offset: 0.34, color: 0x687268 },
    { offset: 0.62, color: 0x444c47 }, { offset: 1, color: 0x3a3c39 }],
});

export function drawFulmarDecks(g: Graphics, t: number, width: number, height: number): void {
  g.rect(0, 0, width, height).fill(0x242b2b);
  // Acoustic baffles surround the listening rooms. Compression ribs continue below them.
  for (const [top, bottom, span] of [[1, 9, 5], [10, 19, 7], [20, 31, 9]]) {
    const y = top * t;
    const h = (bottom - top) * t;
    g.rect(t, y, width - 2 * t, h).fill({ color: top === 20 ? 0x343e3b : 0x454944 });
    for (let x = t; x < width - t; x += span * t) {
      const w = Math.min(span * t - 15, width - t - x);
      g.poly([x, y + 20, x + 35, y + 2, x + w - 17, y + 2, x + w, y + 55,
        x + w, y + h - 30, x + w - 21, y + h, x + 20, y + h, x, y + h - 25]).fill(baffle);
      g.moveTo(x + 14, y + 28).lineTo(x + 45, y + 10).lineTo(x + w - 17, y + 10)
        .stroke({ color: PAL.cream, alpha: 0.48, width: 3 });
      g.rect(x, y + h - 40, w, 6).fill({ color: PAL.orange, alpha: 0.61 });
    }
  }

  // The inside of the crushed dome, with the same split ribs as the exterior.
  const x = 13 * t;
  const y = 8 * t;
  g.moveTo(x - 330, y).lineTo(x - 315, y - 96).bezierCurveTo(x - 273, y - 259, x - 61, y - 292, x + 40, y - 250)
    .lineTo(x + 86, y - 218).quadraticCurveTo(x + 235, y - 240, x + 318, y - 101).lineTo(x + 330, y).closePath().fill(0x26322f);
  g.moveTo(x - 295, y - 48).lineTo(x - 282, y - 104).bezierCurveTo(x - 224, y - 239, x - 62, y - 258, x + 35, y - 219)
    .lineTo(x + 90, y - 191).quadraticCurveTo(x + 227, y - 214, x + 281, y - 93).lineTo(x + 293, y - 48).closePath().fill(0x142b32);
  for (const s of [-1, 1]) {
    g.moveTo(x + s * 202, y - 47).quadraticCurveTo(x + s * 143, y - 216, x + s * 67, y - 231)
      .stroke({ color: PAL.bronze, width: 10, alpha: 0.64 });
  }
  g.moveTo(x - 52, y - 174).lineTo(x + 16, y - 202).lineTo(x + 52, y - 173).lineTo(x + 89, y - 191)
    .lineTo(x + 118, y - 136).stroke({ color: 0x799492, width: 2, alpha: 0.49 });
  g.roundRect(x - 306, y - 47, 612, 27, 7).fill(PAL.bronze);
  g.rect(x - 289, y - 47, 583, 4).fill({ color: PAL.cream, alpha: 0.76 });
  // Array processing racks and conduit trunks. The powered door and finds are drawn over them.
  for (const i of [0, 1, 2, 3, 4]) {
    const q = (74 + i * 4) * t;
    g.roundRect(q, 3 * t, 116, 5 * t, 9).fill(0x293332);
    g.roundRect(q + 8, 3 * t + 8, 100, 184, 6).fill(baffle);
    for (let k = 0; k < 4; k++) {
      const v = 3 * t + 16 + k * 39;
      g.roundRect(q + 20, v, 72, 19, 4).fill(0x1c292b);
      g.rect(q + 25, v + 5, 36, 3).fill({ color: PAL.orange, alpha: 0.61 });
    }
  }
  for (const offset of [0, 15, 30]) {
    const liftY = 22.7 * t + offset;
    g.moveTo(t, liftY).lineTo(width - 12 * t, liftY).quadraticCurveTo(width - 9 * t, liftY, width - 8 * t, liftY + 32)
      .stroke({ color: 0x615b4d, width: 6, alpha: 0.82 });
  }
}
