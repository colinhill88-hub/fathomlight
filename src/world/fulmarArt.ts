import { FillGradient, Sprite, type Graphics, type Texture } from 'pixi.js';
import { materialFill } from '../art/worldArt';
import { getPropArt } from '../art/propArt';
import { FULMAR, fulmarTop } from './terrain';

const castSteel = new FillGradient({
  type: 'linear', start: { x: 0.08, y: 0 }, end: { x: 0.29, y: 1 },
  colorStops: [{ offset: 0, color: 0x8a8b80 }, { offset: 0.28, color: 0x616962 }, { offset: 0.53, color: 0x4b514b },
    { offset: 0.75, color: 0x343735 }, { offset: 1, color: 0x232829 }],
});

export const FULMAR_PALETTE = { cream: 0x9c9279, orange: 0xa67144, bronze: 0x75614c, dark: 0x273233, baffle: 0x434c48 };

export function drawListeningStation(g: Graphics, pts: number[], floor: number, panel?: Texture): void {
  const { x0, x1, mainX1, domeX } = FULMAR;
  const painted = getPropArt().wrecks.fulmar;
  if (painted) {
    const spr = new Sprite(painted);
    spr.anchor.set(0.5, 0.96);
    const w = (x1 - x0) * 1.12;
    spr.width = w;
    spr.height = w * (painted.height / Math.max(1, painted.width));
    spr.position.set((x0 + x1) * 0.5 + 32, floor + 14);
    g.addChild(spr);
    return;
  }
  const p = FULMAR_PALETTE;
  g.poly(pts).fill(castSteel);
  if (panel) g.poly(pts).fill(materialFill(panel, 0x6a695c, 0.35, 1110, 520));
  // Broad welded cylinders beneath the pressure dome and the lower relay wing.
  for (const [x, w, inset] of [[x0 + 28, mainX1 - x0 - 54, 157], [mainX1 + 15, x1 - mainX1 - 48, 97]]) {
    g.roundRect(x, floor - inset, w, inset - 19, 33).fill(castSteel);
    g.roundRect(x + 2, floor - inset + 2, w - 4, inset - 23, 30).stroke({ color: p.cream, alpha: 0.4, width: 3 });
    g.moveTo(x + 26, floor - inset + 20).lineTo(x + w - 28, floor - inset + 20)
      .stroke({ color: p.orange, alpha: 0.7, width: 7 });
    for (const xx of [x + 28, x + w * 0.53, x + w - 34]) {
      g.roundRect(xx, floor - inset + 7, 15, inset - 30, 6).fill({ color: 0x303937, alpha: 0.88 });
      g.moveTo(xx + 2, floor - inset + 11).lineTo(xx + 2, floor - 27).stroke({ color: 0x9c9785, width: 2, alpha: 0.5 });
    }
  }
  // A broad observation shell, crushed beneath a jagged split in the glass.
  const lid: number[] = [];
  for (let x = domeX - 115; x <= domeX + 115; x += 5) lid.push(x, fulmarTop(x) + 3);
  g.poly([...lid, domeX + 115, floor - 234, domeX - 115, floor - 234]).fill(castSteel);
  g.moveTo(domeX - 104, floor - 246).bezierCurveTo(domeX - 89, floor - 300, domeX - 23, floor - 335, domeX + 18, floor - 330)
    .lineTo(domeX + 42, floor - 306).lineTo(domeX + 93, floor - 281).lineTo(domeX + 110, floor - 246)
    .closePath().fill(0x183039);
  for (const s of [-1, 1]) {
    g.moveTo(domeX + s * 77, floor - 247).quadraticCurveTo(domeX + s * 54, floor - 306, domeX + s * 22, floor - 331)
      .stroke({ color: p.cream, width: 7, alpha: 0.77 });
  }
  g.moveTo(domeX - 52, floor - 286).lineTo(domeX - 2, floor - 307).lineTo(domeX + 28, floor - 290)
    .lineTo(domeX + 41, floor - 312).lineTo(domeX + 84, floor - 272).stroke({ color: 0x8ba3a0, width: 2, alpha: 0.55 });
  g.roundRect(domeX - 127, floor - 250, 254, 19, 8).fill(0x515754);
  g.moveTo(domeX - 113, floor - 249).lineTo(domeX + 118, floor - 249).stroke({ color: p.cream, width: 3, alpha: 0.67 });
  // A folded receiving array gives the station a silhouette distinct from ship masts.
  const mx = mainX1 - 85;
  const my = fulmarTop(mx);
  g.poly([mx - 22, my, mx + 43, my - 219, mx + 59, my - 225, mx + 13, my + 5]).fill(0x596257);
  g.moveTo(mx + 23, my - 154).quadraticCurveTo(mx + 66, my - 172, mx + 126, my - 253)
    .quadraticCurveTo(mx + 124, my - 201, mx + 79, my - 161).lineTo(mx + 47, my - 153)
    .closePath().fill({ color: p.bronze, alpha: 0.84 });
  g.moveTo(mx + 24, my - 155).quadraticCurveTo(mx + 70, my - 176, mx + 126, my - 253)
    .stroke({ color: p.cream, width: 5, alpha: 0.64 });
  g.moveTo(mx + 49, my - 187).lineTo(mx + 88, my - 242).lineTo(mx + 111, my - 231)
    .stroke({ color: 0x555e55, width: 5 });
}
