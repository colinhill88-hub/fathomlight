import { FillGradient, type Graphics } from 'pixi.js';

const nacre = new FillGradient({
  type: 'linear', start: { x: 0.18, y: 0 }, end: { x: 0.67, y: 1 },
  colorStops: [{ offset: 0, color: 0xbbbdc9 }, { offset: 0.22, color: 0x81849f },
    { offset: 0.61, color: 0x555976 }, { offset: 1, color: 0x363854 }],
});

export function traceNacreOpening(g: Graphics, x: number, floor: number, width: number, height: number, lean: number): Graphics {
  const crown = x + width * lean;
  return g.moveTo(x - width * 0.34, floor)
    .bezierCurveTo(x - width * 0.31, floor - height * 0.38, x - width * 0.26, floor - height * 0.75, crown, floor - height * 0.8)
    .bezierCurveTo(x + width * (0.18 + lean), floor - height * 0.76, x + width * 0.31, floor - height * 0.42, x + width * 0.34, floor)
    .closePath();
}

export function drawNacreVault(g: Graphics, x: number, floor: number, width: number, height: number, lean = 0): void {
  const X = (u: number) => x + width * u;
  const Y = (v: number) => floor - height * v;
  const crown = X(lean);
  g.moveTo(X(-0.5), floor).bezierCurveTo(X(-0.47), Y(0.48), X(-0.36), Y(0.95), crown, Y(1))
    .bezierCurveTo(X(0.27 + lean), Y(0.96), X(0.44), Y(0.62), X(0.5), floor)
    .lineTo(X(0.34), floor).bezierCurveTo(X(0.31), Y(0.42), X(0.18 + lean), Y(0.76), crown, Y(0.8))
    .bezierCurveTo(X(-0.26), Y(0.75), X(-0.31), Y(0.38), X(-0.34), floor).closePath().fill(nacre);
  g.moveTo(X(-0.46), floor).bezierCurveTo(X(-0.43), Y(0.46), X(-0.31), Y(0.89), crown, Y(0.94))
    .bezierCurveTo(X(0.25 + lean), Y(0.92), X(0.42), Y(0.57), X(0.46), Y(0.06))
    .stroke({ color: 0xd5d4da, width: Math.max(2, width * 0.009), alpha: 0.53, cap: 'round' });
  g.moveTo(X(-0.38), floor).bezierCurveTo(X(-0.35), Y(0.43), X(-0.24), Y(0.8), crown, Y(0.85))
    .bezierCurveTo(X(0.21 + lean), Y(0.83), X(0.34), Y(0.41), X(0.38), floor)
    .stroke({ color: 0x30314c, width: Math.max(3, width * 0.013), alpha: 0.69 });
}
