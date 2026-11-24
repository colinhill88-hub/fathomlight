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

const bezelIron = new FillGradient({
  type: 'linear', start: { x: 0.15, y: 0 }, end: { x: 0.85, y: 1 },
  colorStops: [
    { offset: 0, color: 0x4f5a58 },
    { offset: 0.35, color: 0x313c3d },
    { offset: 0.8, color: 0x1e282a },
    { offset: 1, color: 0x131b1e },
  ],
});

const bezelBrass = new FillGradient({
  type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
  colorStops: [{ offset: 0, color: 0xd0ae64 }, { offset: 0.5, color: 0x8c6e38 }, { offset: 1, color: 0x4b3b1e }],
});

/** Sleek riveted cast-iron & tarnished-brass recessed viewport bezel. */
export function drawHabitatFrame(g: Graphics, b: WaterBox, rim: number): void {
  const { x, y, w, h } = b;
  const r = Math.min(rim, 11);
  const x0 = x - r;
  const y0 = y - r;
  const fw = w + r * 2;
  const fh = h + r * 2;
  const cr = Math.max(6, r * 1.15);

  // Outer recessed drop-shadow & riveted cast-iron frame.
  g.roundRect(x0 - 1.5, y0 - 1.5, fw + 3, fh + 3, cr + 1.5).fill({ color: 0x0d1518 });
  g.roundRect(x0, y0, fw, fh, cr).fill(bezelIron).stroke({ color: 0x121b1e, width: 1.6 });

  // Subtle tarnished-brass inner lip & deep shadow recess around the glass.
  g.roundRect(x - 2.5, y - 2.5, w + 5, h + 5, Math.max(4, cr * 0.55))
    .fill({ color: 0x111a1d })
    .stroke({ fill: bezelBrass, width: Math.max(1.6, r * 0.24), alpha: 0.88 });
  g.roundRect(x, y, w, h, 4).fill(0x132f37);

  // Subtle top bevel sheen along the upper bezel edge.
  g.moveTo(x0 + cr, y0 + 1.5).lineTo(x0 + fw - cr, y0 + 1.5)
    .stroke({ color: 0x9aa69a, width: 1.1, alpha: 0.42, cap: 'round' });

  // Neat perimeter brass rivets spaced evenly along the top, bottom, and sides.
  const inset = r * 0.52;
  const rivetDot = (rx: number, ry: number) => {
    g.circle(rx, ry, Math.max(1.3, r * 0.17)).fill({ color: 0x141c1e });
    g.circle(rx - 0.35, ry - 0.35, Math.max(0.6, r * 0.08)).fill({ color: 0xd4b46c, alpha: 0.85 });
  };
  const hCount = Math.max(2, Math.floor((w - 16) / 56));
  for (let i = 0; i <= hCount; i++) {
    const rx = x + 8 + ((w - 16) * i) / hCount;
    rivetDot(rx, y0 + inset);
    rivetDot(rx, y0 + fh - inset);
  }
  const vCount = Math.max(2, Math.floor((h - 16) / 54));
  for (let i = 1; i < vCount; i++) {
    const ry = y + 8 + ((h - 16) * i) / vCount;
    rivetDot(x0 + inset, ry);
    rivetDot(x0 + fw - inset, ry);
  }
}
