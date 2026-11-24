import { Container, Graphics, Sprite } from 'pixi.js';
import { mulberry32 } from '../rng';
import type { SaveData } from '../game/state';
import { LODES, lodeWait, lodeY } from '../game/lodes';
import { groundY } from './terrain';
import { getPropArt } from '../art/propArt';

export * from '../game/lodes';

/** Glinting ore knots on the seabed; dull, chipped stone while they reseal. */
export class LodeArt {
  readonly view = new Container();
  readonly emissive = new Container();
  private ready: Container[] = [];
  private spent: Container[] = [];
  private glints: Graphics[] = [];

  constructor() {
    const rand = mulberry32(1313);
    const R = (a: number, b: number) => a + rand() * (b - a);
    const paintedLode = getPropArt().landmarks.lode;
    for (const l of LODES) {
      const y = lodeY(l);
      const ready = new Graphics();
      const spent = new Graphics();
      const glint = new Graphics();
      if (paintedLode) {
        const sc = 172 / Math.max(1, paintedLode.width);
        const slope = Math.max(-0.24, Math.min(0.24, Math.atan2(groundY(l.x + 36) - groundY(l.x - 36), 72)));
        const rSpr = new Sprite(paintedLode);
        rSpr.anchor.set(0.5, 0.86);
        rSpr.scale.set(sc);
        rSpr.position.set(l.x, y + 14);
        rSpr.rotation = slope;
        ready.addChild(rSpr);

        const sSpr = new Sprite(paintedLode);
        sSpr.anchor.set(0.5, 0.86);
        sSpr.scale.set(sc * 0.94, sc * 0.82);
        sSpr.position.set(l.x, y + 16);
        sSpr.rotation = slope;
        sSpr.tint = 0x565a5e;
        sSpr.alpha = 0.84;
        spent.addChild(sSpr);

        // Soft contoured seabed silt skirt & pebbles over the base so the lode roots organically with zero flat line.
        for (const host of [ready, spent]) {
          const skirt = new Graphics();
          skirt.moveTo(l.x - 86, groundY(l.x - 86) + 12);
          for (let dx = -86; dx <= 86; dx += 14) {
            skirt.lineTo(l.x + dx, groundY(l.x + dx) - 4 + Math.sin(dx * 0.12 + l.x) * 3.5);
          }
          skirt.lineTo(l.x + 86, groundY(l.x + 86) + 16).lineTo(l.x - 86, groundY(l.x - 86) + 16).closePath()
            .fill({ color: 0x162425, alpha: 0.96 });
          for (let p = 0; p < 9; p++) {
            const px = l.x + R(-72, 72);
            const py = groundY(px) + R(-4, 5);
            skirt.ellipse(px, py, R(7, 16), R(3.5, 6.5)).fill({ color: p % 2 === 0 ? 0x203231 : 0x182728, alpha: 0.92 });
          }
          host.addChild(skirt);
        }

        for (let i = 0; i < 6; i++) {
          glint.circle(l.x + R(-42, 42), y - R(12, 38), R(2, 3.2)).fill({ color: l.color, alpha: 0.9 });
        }
        glint.ellipse(l.x, y - 18, 58, 22).fill({ color: l.color, alpha: 0.1 });
      } else {
        // A knuckle of dark host rock standing out of the bed.
        for (const g of [ready, spent]) {
          g.ellipse(l.x, y - 4, 74, 22).fill({ color: 0x1f2124, alpha: 0.95 });
          g.ellipse(l.x - 22, y - 18, 38, 22).fill({ color: 0x34363a });
          g.ellipse(l.x + 24, y - 15, 32, 19).fill({ color: 0x2f3135 });
          g.ellipse(l.x - 26, y - 30, 20, 8).fill({ color: 0x4a4d52, alpha: 0.6 });
        }
        // Veins and crystal points of the lode's mineral.
        for (let i = 0; i < 12; i++) {
          const x = l.x + R(-54, 54);
          const yy = y - R(6, 30);
          ready.moveTo(x, yy).lineTo(x + R(-16, 16), yy + R(-7, 7)).stroke({ color: l.color, width: R(2, 3.6), alpha: 0.9 });
        }
        for (let i = 0; i < 9; i++) {
          const x = l.x + R(-46, 46);
          const yy = y - R(16, 34);
          const hgt = R(12, 24);
          ready.poly([x - 5, yy, x - 1, yy - hgt, x + 5, yy]).fill({ color: 0xd8e0d8, alpha: 0.85 });
          ready.poly([x - 1, yy - hgt, x + 5, yy, x + 1, yy]).fill({ color: l.color, alpha: 0.45 });
          glint.circle(x, yy - hgt * 0.6, R(2, 3.2)).fill({ color: l.color, alpha: 0.95 });
        }
        // A soft halo so a lode reads from a distance in the sub's lights.
        glint.ellipse(l.x, y - 20, 60, 24).fill({ color: l.color, alpha: 0.08 });
        // Drilled: a bored crater with tool marks.
        spent.ellipse(l.x, y - 12, 22, 9).fill({ color: 0x141518 });
        for (let i = 0; i < 5; i++) spent.moveTo(l.x + R(-30, 30), y - R(8, 20)).lineTo(l.x + R(-30, 30), y - R(8, 20)).stroke({ color: 0x55575a, width: 1, alpha: 0.7 });
      }
      spent.visible = false;
      this.view.addChild(ready, spent);
      this.emissive.addChild(glint);
      this.ready.push(ready);
      this.spent.push(spent);
      this.glints.push(glint);
    }
  }

  update(save: SaveData, time: number): void {
    LODES.forEach((l, i) => {
      const ok = lodeWait(save, l) === 0;
      this.ready[i].visible = ok;
      this.spent[i].visible = !ok;
      this.glints[i].visible = ok;
      this.glints[i].alpha = 0.6 + 0.4 * Math.sin(time * 1.7 + i * 1.9);
    });
  }
}
