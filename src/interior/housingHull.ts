import { Container, FillGradient, Graphics } from 'pixi.js';
import { CELL, collarsOf, isDone, type BaseLayout } from '../game/base';
import type { BaseLevel, Room } from './baselevel';

const skin = new FillGradient({
  type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
  colorStops: [{ offset: 0, color: 0x597274 }, { offset: 0.23, color: 0x344c50 },
    { offset: 0.65, color: 0x243439 }, { offset: 1, color: 0x121e25 }],
});
const cast = new FillGradient({
  type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
  colorStops: [{ offset: 0, color: 0x78918c }, { offset: 0.27, color: 0x4c6867 },
    { offset: 0.75, color: 0x263c40 }, { offset: 1, color: 0x18282e }],
});
const spill = new FillGradient({
  type: 'linear', start: { x: 0.52, y: 0 }, end: { x: 0.49, y: 1 },
  colorStops: [{ offset: 0, color: 'rgba(147,220,204,.27)' },
    { offset: 0.46, color: 'rgba(95,177,169,.11)' }, { offset: 1, color: 'rgba(74,137,149,0)' }],
});

type Box = { l: number; r: number; t: number; b: number };

/** Shell profiles live in the registered indoor tile coordinates. The playable cavity fits inside them. */
function shell(g: Graphics, b: Box, shoulder: number, heel: number, radius: number): Graphics {
  const { l, r, t, b: y } = b;
  return g.moveTo(l + shoulder, t)
    .lineTo(r - shoulder, t).quadraticCurveTo(r - radius, t, r, t + shoulder)
    .lineTo(r, y - heel).quadraticCurveTo(r - radius * 0.15, y, r - heel, y)
    .lineTo(l + heel, y).quadraticCurveTo(l + radius * 0.15, y, l, y - heel)
    .lineTo(l, t + shoulder).quadraticCurveTo(l + radius, t, l + shoulder, t).closePath();
}

/** Render-only hull, skins and wet-side lights. There is no dependency back into the level map. */
export class HousingHull {
  readonly mask = new Graphics();
  readonly shell = new Graphics();
  readonly trim = new Graphics();
  readonly waterLight = new Container();
  private readonly lamps: { id: number; beam: Graphics }[] = [];

  constructor(level: BaseLevel, private readonly layout: BaseLayout, tile: number) {
    for (const room of level.rooms) {
      const x = room.tx0 * tile;
      const y = room.ty0 * tile;
      const w = room.tw * tile;
      const h = room.th * tile;
      this.drawModule(room, x, y, w, h);
      this.drawSaddles(room, x, y, w, h, tile);
      if (room.kind === 'dock' || room.kind === 'tank' || room.kind === 'gtank' || room.kind === 'dome') {
        const bottom = y + h - 13;
        for (const k of room.kind === 'dock' ? [0.26, 0.73] : [0.55]) this.drawLamp(room.piece.id, x + w * k, bottom);
      }
      for (const c of collarsOf(room.piece)) {
        if (c.dir !== 'U') continue;
        const other = layout.collarPartner(c);
        if (!other || !isDone(other)) continue;
        const cx = x + (c.gx - room.piece.gx + 0.5) * w / room.w;
        this.drawJoint({ l: cx - 46, r: cx + 46, t: y - 35, b: y + 38 }, true);
      }
    }
    for (const d of level.doors) {
      const x = (d.tx + (d.dir === 'R' ? 1 : 0)) * tile;
      const top = (d.floorTy - 3) * tile;
      if (!d.sealed && d.dir === 'R') this.drawJoint({ l: x - 34, r: x + 34, t: top - 15, b: d.floorTy * tile + 27 }, false);
      else if (d.sealed) {
        const side = d.dir === 'R' ? 1 : -1;
        this.drawJoint({ l: x + (side > 0 ? -40 : -4), r: x + (side > 0 ? 4 : 40), t: top - 12, b: d.floorTy * tile + 19 }, false, true);
      }
    }
    this.update();
  }

  update(): void {
    for (const { id, beam } of this.lamps) beam.visible = this.layout.powered.has(id);
  }

  destroy(): void {
    this.mask.destroy();
    this.shell.destroy();
    this.trim.destroy();
    this.waterLight.destroy({ children: true });
  }

  private drawModule(room: Room, x: number, y: number, w: number, h: number): void {
    if (room.kind === 'dock') {
      // A dry observation deck above a narrower, separately framed wet berth.
      this.drawSkin({ l: x + 48, r: x + w - 48, t: y + 211, b: y + h - 23 }, 57, 67, 16, true);
      this.drawSkin({ l: x + 18, r: x + w - 18, t: y - 12, b: y + 247 }, 54, 33, 26);
      return;
    }
    const tube = room.kind === 'corridor' || room.kind === 'shaft';
    const dome = room.kind === 'dome';
    const habitat = room.kind === 'tank' || room.kind === 'gtank' || room.kind === 'farm';
    const b = { l: x + (tube ? 24 : 18), r: x + w - (tube ? 24 : 18),
      t: y + (tube ? 26 : dome ? -23 : habitat ? -10 : 5), b: y + h - (tube ? 22 : 12) };
    this.drawSkin(b, dome ? 86 : tube ? 31 : habitat ? 48 : 39, dome ? 55 : tube ? 30 : 39, dome ? 33 : 15);
    if (dome) {
      this.trim.moveTo(b.l + 105, b.t + 13).lineTo(b.r - 105, b.t + 13)
        .stroke({ color: 0x486367, width: 3.5, cap: 'round' });
      for (const side of [-1, 1]) {
        const px = x + w / 2 + side * w * 0.36;
        this.trim.moveTo(px, b.t + 6).lineTo(px + side * 30, y + 33)
          .stroke({ color: 0x7c9892, width: 10, alpha: 0.52, cap: 'round' });
      }
    }
  }

  private drawSkin(b: Box, shoulder: number, heel: number, radius: number, wet = false): void {
    shell(this.mask, b, shoulder, heel, radius).fill(0xffffff);
    shell(this.shell, b, shoulder, heel, radius).fill(skin);
    const g = this.trim;
    shell(g, b, shoulder, heel, radius).stroke({ color: 0x182b30, width: 10 });
    shell(g, b, shoulder, heel, radius).stroke({ color: 0x64807d, width: 2.6, alpha: 0.66 });
    const { l, r, t, b: y } = b;
    if (!wet) {
      g.moveTo(l + 6, t + shoulder).quadraticCurveTo(l + radius, t + 7, l + shoulder + 2, t + 7)
        .lineTo(r - shoulder - 2, t + 7).quadraticCurveTo(r - radius, t + 7, r - 6, t + shoulder)
        .stroke({ fill: cast, width: 8, cap: 'round' });
    }
    g.moveTo(l + 7, y - heel).quadraticCurveTo(l + heel * 0.52, y - 6, l + heel + 3, y - 5)
      .lineTo(r - heel - 3, y - 5).quadraticCurveTo(r - heel * 0.52, y - 6, r - 7, y - heel)
      .stroke({ color: 0x415c5f, width: 6, cap: 'round' });
    for (const px of [l + shoulder + 17, r - shoulder - 17]) {
      g.circle(px, t + 7, 2).fill(0x26363b);
      g.circle(px - 0.4, t + 6.5, 0.7).fill(0xbdc9ae);
    }
  }

  private drawJoint(b: Box, vertical: boolean, sealed = false): void {
    const { l, r, t, b: y } = b;
    this.mask.roundRect(l, t, r - l, y - t, 11).fill(0xffffff);
    this.shell.roundRect(l, t, r - l, y - t, 11).fill(0x30494a);
    const g = this.trim;
    g.roundRect(l + 1.5, t + 1.5, r - l - 3, y - t - 3, 10).stroke({ color: 0x698a86, width: 3.2 });
    if (vertical) {
      for (const v of [t + 6, y - 12]) g.roundRect(l - 4, v, r - l + 8, 8, 3).fill(cast);
    } else {
      for (const px of [l + 7, r - 13]) {
        g.roundRect(px, t + 5, 6, y - t - 10, 3).fill({ color: 0x93a095, alpha: 0.76 });
        for (const py of [t + 14, y - 14]) g.circle(px + 3, py, 1.8).fill(0x335052);
      }
      if (sealed) g.roundRect((l + r) / 2 - 4, t + 7, 8, 4, 1.6).fill(0xf1b877);
    }
  }

  private drawSaddles(room: Room, x: number, y: number, w: number, h: number, tile: number): void {
    const step = w / room.w;
    for (let k = 0; k < room.w; k++) {
      if (this.layout.pieceAt(room.piece.gx + k, room.piece.gy - 1)) continue;
      for (const u of [22 / CELL, 1 - 22 / CELL]) {
        const px = x + (k + u) * step;
        const py = y + h - (room.kind === 'corridor' ? tile * 0.59 : tile * 0.45);
        this.trim.poly([px - 22, py - 7, px + 22, py - 7, px + 15, py + 12, px - 15, py + 12]).fill(cast);
        this.trim.rect(px - 10, py + 10, 20, 4).fill(0x33494d);
      }
    }
  }

  private drawLamp(id: number, x: number, y: number): void {
    const beam = new Graphics().moveTo(x - 7, y).lineTo(x + 8, y)
      .quadraticCurveTo(x + 39, y + 56, x + 96, y + 143)
      .lineTo(x - 64, y + 143).quadraticCurveTo(x - 20, y + 50, x - 7, y).closePath().fill(spill)
      .roundRect(x - 10, y - 1, 20, 7, 3).fill(0x5f7c74)
      .roundRect(x - 6, y + 2, 12, 2.5, 1).fill(0xaed6bd);
    this.waterLight.addChild(beam);
    this.lamps.push({ id, beam });
  }
}
