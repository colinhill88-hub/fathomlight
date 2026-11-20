import { FillGradient, Graphics } from 'pixi.js';
import type { WaterBox } from './habitatWater';

const enamel = new FillGradient({
  type: 'linear', start: { x: 0.2, y: 0 }, end: { x: 0.78, y: 1 },
  colorStops: [
    { offset: 0, color: 0xb6b59c },
    { offset: 0.18, color: 0x83978b },
    { offset: 0.52, color: 0x526d67 },
    { offset: 0.81, color: 0x345452 },
    { offset: 1, color: 0x293c40 },
  ],
});

const observationGlass = new FillGradient({
  type: 'linear', start: { x: 0.2, y: 0 }, end: { x: 0.7, y: 1 },
  colorStops: [{ offset: 0, color: 0x648e87 }, { offset: 0.38, color: 0x315b60 }, { offset: 1, color: 0x152e36 }],
});

/** Kestrel's ribs have a soft enamel face and an exposed bronze pressure seam. */
export function drawPressureRib(g: Graphics, x: number, y: number, length: number, breadth: number, horizontal = false): void {
  const outer = horizontal ? [x, y, length, breadth] as const : [x, y, breadth, length] as const;
  g.roundRect(...outer, 3).fill(enamel);
  if (horizontal) g.rect(x + 3, y + 1, length - 6, 1.5).fill(0xbea67c);
  else g.rect(x + 1, y + 3, 1.5, length - 6).fill(0xbea67c);
  for (const t of [0.12, 0.49, 0.88]) {
    const cx = horizontal ? x + length * t : x + breadth * 0.54;
    const cy = horizontal ? y + breadth * 0.54 : y + length * t;
    g.circle(cx, cy, breadth * 0.18).fill(0x324747);
    g.circle(cx - 0.5, cy - 0.5, breadth * 0.085).fill(0xc2bba3);
  }
}

/** The crown is deliberately broad-shouldered, with a flat ridge for the service spine. */
export function drawObservationCrown(g: Graphics, lamps: Graphics, glow: Graphics, box: WaterBox): void {
  const { x, y, w, h } = box;
  const X = (u: number) => x + u * w;
  const Y = (v: number) => y + v * h;
  g.moveTo(x, Y(1)).lineTo(X(0.045), Y(0.45)).bezierCurveTo(X(0.1), Y(0.13), X(0.24), y, X(0.37), y)
    .lineTo(X(0.68), y).bezierCurveTo(X(0.81), Y(0.01), X(0.92), Y(0.16), X(0.963), Y(0.49))
    .lineTo(X(1), Y(1)).closePath().fill(enamel);
  g.moveTo(X(0.07), Y(0.88)).lineTo(X(0.12), Y(0.45)).bezierCurveTo(X(0.16), Y(0.19), X(0.26), Y(0.13), X(0.37), Y(0.13))
    .lineTo(X(0.66), Y(0.13)).bezierCurveTo(X(0.78), Y(0.13), X(0.87), Y(0.22), X(0.899), Y(0.48))
    .lineTo(X(0.93), Y(0.88)).closePath().fill(observationGlass);
  g.moveTo(X(0.102), Y(0.83)).quadraticCurveTo(X(0.16), Y(0.7), X(0.34), Y(0.75))
    .bezierCurveTo(X(0.55), Y(0.82), X(0.62), Y(0.53), X(0.9), Y(0.67)).lineTo(X(0.93), Y(0.88))
    .lineTo(X(0.07), Y(0.88)).fill({ color: 0x193e42, alpha: 0.61 });
  for (const [u, bend] of [[0.24, 0.13], [0.5, 0], [0.76, -0.1]]) {
    g.moveTo(X(u), Y(0.91)).quadraticCurveTo(X(u + bend * 0.62), Y(0.53), X(u + bend), Y(0.13))
      .stroke({ color: 0x2e4748, width: w * 0.026 });
    g.moveTo(X(u + 0.009), Y(0.9)).quadraticCurveTo(X(u + bend * 0.62 + 0.009), Y(0.53), X(u + bend + 0.009), Y(0.15))
      .stroke({ color: 0xa5a893, width: w * 0.007, alpha: 0.74 });
  }
  g.moveTo(X(0.15), Y(0.37)).bezierCurveTo(X(0.32), Y(0.16), X(0.56), Y(0.2), X(0.72), Y(0.23))
    .stroke({ color: 0xd7e1c6, width: h * 0.085, alpha: 0.17, cap: 'round' });
  g.rect(x, Y(0.9), w, h * 0.1).fill(0x39524e);
  g.rect(X(0.03), Y(0.91), w * 0.94, h * 0.021).fill({ color: 0xcab28b, alpha: 0.69 });
  for (const u of [0.18, 0.5, 0.82]) {
    lamps.roundRect(X(u - 0.045), Y(0.81), w * 0.09, h * 0.027, 2).fill({ color: 0xffd29a, alpha: 0.87 });
    glow.ellipse(X(u), Y(0.83), w * 0.12, h * 0.18).fill({ color: 0xdca66f, alpha: 0.24 });
  }
}

/** The same chamfered pressure yoke reads through either side of the observation window. */
export function drawHabitatFrame(g: Graphics, b: WaterBox, rim: number): void {
  const { x, y, w, h } = b;
  const x0 = x - rim, x1 = x + w + rim, y0 = y - rim, y1 = y + h + rim;
  const chamfer = rim * 2.1;
  g.poly([x0 + chamfer, y0, x1 - chamfer, y0, x1, y0 + chamfer, x1, y1 - chamfer,
    x1 - chamfer, y1, x0 + chamfer, y1, x0, y1 - chamfer, x0, y0 + chamfer])
    .fill(enamel);
  g.roundRect(x - rim * 0.42, y - rim * 0.42, w + rim * 0.84, h + rim * 0.84, rim)
    .fill(0x263c41);
  g.roundRect(x, y, w, h, 4).fill(0x265755);
  g.moveTo(x0 + chamfer, y0 + rim * 0.26).lineTo(x1 - chamfer, y0 + rim * 0.26)
    .stroke({ color: 0xdad0a3, width: rim * 0.14, alpha: 0.72 });
  g.moveTo(x0 + chamfer, y1 - rim * 0.25).lineTo(x1 - chamfer, y1 - rim * 0.25)
    .stroke({ color: 0xa27445, width: rim * 0.32, alpha: 0.87 });
  for (const side of [-1, 1]) {
    const bx = side < 0 ? x0 : x1;
    for (const u of [0.27, 0.75]) {
      const by = y + h * u;
      g.moveTo(bx, by - rim * 1.25).lineTo(bx + side * rim * 0.44, by - rim * 0.64)
        .lineTo(bx + side * rim * 0.44, by + rim * 0.64).lineTo(bx, by + rim)
        .lineTo(bx - side * rim * 0.75, by + rim * 0.63).lineTo(bx - side * rim * 0.75, by - rim * 0.67)
        .fill(0x7b6953);
      g.moveTo(bx - side * rim * 0.66, by - rim * 0.69).lineTo(bx + side * rim * 0.36, by - rim * 0.56)
        .stroke({ color: 0xcaa77c, width: rim * 0.18, alpha: 0.82 });
    }
  }
}
