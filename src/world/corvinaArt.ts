import { FillGradient, Sprite, type Graphics, type Texture } from 'pixi.js';
import { materialFill } from '../art/worldArt';
import { getPropArt } from '../art/propArt';
import { corvinaHouse, corvinaHull, CV_HATCH } from './terrain';

export const CORVINA_PALETTE = { stripe: 0x9e573d, seam: 0xb88865, enamel: 0x90a094, shadow: 0x233538 };

const flank = new FillGradient({
  type: 'linear', start: { x: 0.06, y: 0 }, end: { x: 0.11, y: 1 },
  colorStops: [{ offset: 0, color: 0x9aa59a }, { offset: 0.34, color: 0x546f6d },
    { offset: 0.5, color: 0x394e50 }, { offset: 0.73, color: 0x55443b }, { offset: 1, color: 0x393631 }],
});

/** Registered to the collision hull, wheelhouse and existing aft deck hatch. */
export function drawSurveyWreck(g: Graphics, steel?: Texture): void {
  const hull = corvinaHull();
  const painted = getPropArt().wrecks.corvina;
  if (painted) {
    const xs = hull.map((p) => p[0]);
    const ys = hull.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const spr = new Sprite(painted);
    spr.anchor.set(0.5, 1.0);
    const w = maxX - minX + 20;
    spr.width = w;
    spr.height = w * (painted.height / Math.max(1, painted.width));
    spr.position.set((minX + maxX) * 0.5, maxY + 4);
    g.addChild(spr);
    return;
  }
  const [a, ay] = hull[0];
  const [b, by] = hull[2];
  const [c, cy] = hull[3];
  const [d, dy] = hull[4];
  const [e, ey] = hull[5];
  const house = corvinaHouse();
  g.poly(hull.flat()).fill(flank);
  if (steel) g.poly(hull.flat()).fill(materialFill(steel, 0x718481, 0.27, 1030, 510));
  // The rolled hull exposes a light upper plating course and a crushed, buried keel.
  g.poly([a, ay, b, by, c, cy, c - 12, cy + 67, b - 42, by + 65, a + 9, ay + 51])
    .fill({ color: 0x97a59b, alpha: 0.47 });
  g.poly([a + 13, ay + 75, b - 25, by + 91, c - 14, cy + 99, c - 18, cy + 122,
    b - 24, by + 118, a + 17, ay + 95]).fill({ color: CORVINA_PALETTE.stripe, alpha: 0.91 });
  g.moveTo(a + 14, ay + 76).lineTo(b - 25, by + 91).lineTo(c - 15, cy + 99)
    .stroke({ color: CORVINA_PALETTE.seam, width: 3, alpha: 0.64 });
  g.poly([e, ey, a + 27, ay + 190, a + 384, ay + 214, b - 42, by + 181, c - 28, cy + 214, d, dy])
    .fill({ color: 0x3a3c37, alpha: 0.73 });
  // Long torn plates form a dark break in the exposed cargo hold.
  const x = a + 615;
  const y = ay + 117;
  g.poly([x - 48, y + 15, x + 49, y - 5, x + 124, y + 9, x + 193, y - 19, x + 281, y - 30,
    x + 263, y + 54, x + 216, y + 93, x + 108, y + 89, x + 85, y + 63, x - 25, y + 72])
    .fill({ color: 0x182d32, alpha: 0.94 });
  for (const [offset, top, end] of [[-12, 14, 72], [53, 4, 68], [121, 10, 88], [187, -12, 87], [248, -24, 62]]) {
    g.moveTo(x + offset, y + top).lineTo(x + offset - 14, y + end)
      .stroke({ color: 0x706858, width: 7, alpha: 0.74 });
  }
  g.moveTo(x - 40, y + 15).lineTo(x + 49, y - 5).lineTo(x + 124, y + 9).lineTo(x + 193, y - 19).lineTo(x + 275, y - 29)
    .stroke({ color: 0xb0a086, width: 3, alpha: 0.65 });
  for (const [xx, yy] of [[a + 106, ay + 21], [b + 17, by + 9], [b + 61, by - 16], [b + 105, by - 43]]) {
    g.roundRect(xx, yy, 29, 12, 3).fill(0x172c30);
  }

  const { x: hx, y: hy, w, h } = house;
  g.moveTo(hx, hy + h).lineTo(hx, hy + 35).lineTo(hx + 31, hy + 5).lineTo(hx + w - 38, hy)
    .lineTo(hx + w, hy + 26).lineTo(hx + w, hy + h).closePath().fill(flank);
  g.poly([hx + 16, hy + 37, hx + 39, hy + 21, hx + w - 45, hy + 14, hx + w - 19, hy + 33,
    hx + w - 24, hy + 79, hx + 23, hy + 87]).fill(0x162d34);
  g.moveTo(hx + 23, hy + 87).lineTo(hx + w - 24, hy + 79).stroke({ color: 0xa5a18a, width: 5, alpha: 0.75 });
  g.moveTo(hx + 35, hy + 108).lineTo(hx + w - 10, hy + 102).stroke({ color: CORVINA_PALETTE.stripe, width: 11 });
  for (const offset of [72, 153, 236, 309]) {
    g.moveTo(hx + offset, hy + 21).lineTo(hx + offset + 10, hy + 84).stroke({ color: 0x748379, width: 8 });
  }
  g.moveTo(hx + 51, hy + 51).lineTo(hx + 142, hy + 39).lineTo(hx + 224, hy + 43)
    .stroke({ color: 0x7b9c9c, width: 5, alpha: 0.46 });
  const mx = b - 385;
  g.moveTo(mx - 60, by + 44).lineTo(mx - 35, by - 100).lineTo(mx + 119, by - 186)
    .lineTo(mx + 140, by - 177).lineTo(mx - 18, by - 87).lineTo(mx - 27, by + 38).closePath().fill(0x615c4d);
  g.moveTo(mx - 43, by - 48).lineTo(mx + 53, by - 121).lineTo(mx + 15, by - 120)
    .moveTo(mx + 22, by - 130).lineTo(mx + 93, by - 148)
    .stroke({ color: 0x94836b, width: 5, alpha: 0.78 });
  g.moveTo(mx + 128, by - 176).quadraticCurveTo(mx + 139, by - 126, mx + 137, by - 79)
    .stroke({ color: 0x6c746c, width: 2, alpha: 0.72 });
  g.moveTo(CV_HATCH.x - 32, CV_HATCH.y + 10).lineTo(CV_HATCH.x + 74, CV_HATCH.y + 17)
    .stroke({ color: CORVINA_PALETTE.seam, width: 6, alpha: 0.72 });
}
