import { FillGradient, type Graphics } from 'pixi.js';
import { CORVINA_PALETTE as PAL } from '../world/corvinaArt';

const surveyWall = new FillGradient({
  type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
  colorStops: [{ offset: 0, color: 0x384b49 }, { offset: 0.19, color: 0x657777 },
    { offset: 0.48, color: 0x82908a }, { offset: 0.77, color: 0x53605b }, { offset: 1, color: 0x302e2a }],
});

const floodedHold = new FillGradient({
  type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
  colorStops: [{ offset: 0, color: 0x263235 }, { offset: 0.24, color: 0x425556 },
    { offset: 0.68, color: 0x363634 }, { offset: 1, color: 0x263939 }],
});

export function drawSurveyDecks(g: Graphics, tile: number, width: number, height: number): void {
  const T = tile;
  g.rect(0, 0, width, height).fill(0x233135);
  for (const [top, bottom, fill] of [[1, 9, surveyWall], [10, 19, surveyWall], [20, 32, floodedHold]] as const) {
    const y = top * T;
    const h = (bottom - top) * T;
    g.rect(T, y, width - T * 2, h).fill(fill);
    // The survey stripe follows the ship's deck lines around repairs.
    const stripe = y + (top === 20 ? h * 0.37 : h * 0.69);
    g.rect(T, stripe, width - 2 * T, top === 20 ? 12 : 18).fill({ color: PAL.stripe, alpha: 0.79 });
    g.rect(T, stripe + 2, width - 2 * T, 2.5).fill({ color: PAL.seam, alpha: 0.55 });
    g.rect(T, y + h - 33, width - 2 * T, 22).fill({ color: 0x2b3433, alpha: 0.72 });
    for (let x = 4 * T; x < width - 2 * T; x += 10 * T) {
      g.moveTo(x - 44, y + 4).quadraticCurveTo(x - 11, y + 28, x, y + 75)
        .lineTo(x + 8, y + h - 32).lineTo(x + 36, y + h).lineTo(x + 64, y + h)
        .lineTo(x + 40, y + h - 38).lineTo(x + 32, y + 73)
        .quadraticCurveTo(x + 18, y + 21, x - 16, y).closePath().fill({ color: 0x222f2f, alpha: 0.92 });
      g.moveTo(x - 34, y + 5).quadraticCurveTo(x + 1, y + 26, x + 10, y + 76)
        .lineTo(x + 18, y + h - 33).lineTo(x + 45, y + h)
        .stroke({ color: PAL.enamel, width: 4, alpha: 0.6 });
      const rust = y + h * 0.47;
      g.poly([x + 31, rust, x + 178, rust + 19, x + 104, rust + 30,
        x + 88, rust + 60, x + 29, rust + 111]).fill({ color: 0x663e30, alpha: 0.19 });
    }
  }
  // Dark water beyond the lab's long bridge windows, broken up by retained mullions.
  for (const x of [8 * T, 18 * T, 47 * T, 56 * T, 65 * T, 78 * T]) {
    const y = 2.35 * T;
    g.poly([x - 12, y + 21, x + 8, y, x + 234, y, x + 253, y + 18, x + 249, y + 83,
      x + 230, y + 96, x, y + 96, x - 14, y + 80]).fill(0x374444);
    g.roundRect(x, y + 11, 238, 70, 10).fill(0x10282f);
    g.moveTo(x + 20, y + 41).quadraticCurveTo(x + 109, y + 22, x + 204, y + 27)
      .stroke({ color: 0x689595, width: 5, alpha: 0.32 });
    g.rect(x + 117, y + 9, 7, 75).fill(0x4a5956);
    g.rect(x + 4, y + 81, 226, 4).fill({ color: PAL.seam, alpha: 0.58 });
  }
  // Survey racks sit well behind the original desks, doors and interactable records.
  for (const [tx, count] of [[53, 3], [69, 2], [83, 2]]) {
    const x = tx * T;
    const y = 6.5 * T;
    g.roundRect(x, y - 43, 102 * count, 51, 6).fill(0x344344);
    for (let i = 0; i < count; i++) {
      const q = x + 14 + i * 102;
      g.roundRect(q, y - 32, 77, 27, 3).fill(0x182a2a);
      g.moveTo(q + 7, y - 15).lineTo(q + 28, y - 17).lineTo(q + 43, y - 11).lineTo(q + 69, y - 20)
        .stroke({ color: 0x93926f, alpha: 0.42, width: 1.5 });
    }
  }
  // Twin storm rail and crane carriage across the open hold. The actual rings are drawn over it.
  const railY = 22 * T + 22;
  for (const off of [-17, 5]) g.rect(T, railY + off, width - 2 * T, 8).fill(0x273636);
  g.rect(T, railY + 9, width - 2 * T, 2).fill({ color: PAL.seam, alpha: 0.6 });
  for (const tx of [15, 31, 50, 69, 86]) {
    const x = (tx + 0.5) * T;
    g.roundRect(x - 37, railY - 28, 74, 29, 6).fill(0x696354);
    g.roundRect(x - 28, railY - 25, 56, 4, 2).fill(0x989177);
  }
}
