import { Color, Container, Graphics, type Texture } from 'pixi.js';
import { materialFill, type WorldArt } from '../art/worldArt';
import { waterColor } from '../fx/shared';
import type { SurfaceMotion } from '../fx/surfaceMotion';
import { mulberry32 } from '../rng';
import { Backdrop } from '../scene/backdrop';
import { Water } from '../scene/water';
import { ZoneBackdrop } from '../scene/zonebackdrop';
import { groundY, WORLD_X0, WORLD_W } from '../world/terrain';
import type { OceanRect } from './oceanCapture';

/** The same depth palette and painterly parallax used by the swim camera. */
export class HousingSea {
  private readonly view = new Container();
  private readonly distance = new Container();
  private readonly bank = new Graphics();
  private readonly specks = new Graphics();
  private readonly water: Water;
  private readonly ridges = new Backdrop();
  private readonly plates: ZoneBackdrop;

  constructor(mask: Texture, private readonly art?: WorldArt, surfaceMotion?: SurfaceMotion) {
    this.water = new Water(mask, surfaceMotion, true);
    this.plates = new ZoneBackdrop(undefined, undefined, art);
    this.ridges.build(3);
    this.plates.build();
    this.distance.addChild(this.ridges.view, this.plates.view, this.bank, this.specks);
    this.view.addChild(this.water.view, this.distance);
  }

  prepare(bounds: OceanRect, width: number, height: number, time: number) {
    const { x, y, w, h } = bounds;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const zoom = height / h;
    const span = w * zoom;
    // The walkable module grid is wider than it is tall relative to the swim world.
    this.distance.scale.x = width / span;
    this.water.update(time, x, y, w, h, width, height);
    this.ridges.update(cx, cy, zoom, span, height);
    const cover = this.plates.update(cx, cy, zoom, span, height);
    this.ridges.view.alpha = Math.max(0, 1 - cover * 0.92);
    this.drawBank(bounds, zoom);
    this.drawDrift(bounds, zoom, time);

    const [r, g, b] = waterColor(cy);
    const terrainTint = Color.shared.setValue([0.34 + 0.39 * r, 0.52 + 0.47 * g, 0.63 + 0.30 * b]).toNumber();
    return { view: this.view, terrainTint };
  }

  /** A distant slice of the basin floor gives tall foundations a second depth reference. */
  private drawBank({ x, y, w, h }: OceanRect, zoom: number): void {
    const g = this.bank.clear();
    const parallax = 0.68;
    const anchorX = -1800;
    const cx = Math.max(WORLD_X0, Math.min(WORLD_W, x + w / 2));
    const clearance = groundY(cx) - (y + h / 2);
    // From tall stilts the distant seabed is visible above the actual floor.
    // Down on the basin floor the two profiles converge instead of forming a wall behind the room.
    const rise = Math.min(255, Math.max(0, (clearance - 80) * 0.84));
    const bottom = h * zoom + 12;
    const shape: number[] = [];
    for (let i = 0, n = Math.ceil(w / 22); i <= n; i++) {
      const wx = x + w * i / n;
      const sampleX = Math.max(WORLD_X0, Math.min(WORLD_W, anchorX + (wx - anchorX) * parallax));
      const floor = groundY(sampleX) - rise;
      shape.push((wx - x) * zoom, Math.min(bottom, (floor - y) * zoom));
    }
    shape.push(w * zoom, bottom, 0, bottom);
    const tint = Color.shared.setValue(waterColor(y + h * 0.86)).toNumber();
    g.poly(shape).fill({ color: tint, alpha: 0.64 });
    if (this.art?.materials.silt) {
      g.poly(shape).fill(materialFill(this.art.materials.silt, tint, 0.46,
        580 * zoom, 260 * zoom, -x * parallax * zoom, -y * zoom));
    }
  }

  private drawDrift({ x, y, w, h }: OceanRect, zoom: number, time: number): void {
    const g = this.specks.clear();
    const spacing = 58;
    for (let row = Math.floor(y / spacing) - 1; row <= (y + h) / spacing + 1; row++) {
      const drift = time * (2.2 + 1.1 * Math.sin(row * 4.7));
      for (let col = Math.floor((x - drift) / spacing) - 1; col <= (x + w - drift) / spacing + 1; col++) {
        const rand = mulberry32(Math.imul(col, 73856093) ^ Math.imul(row, 19349663));
        const px = (col + rand()) * spacing + drift;
        const py = (row + rand()) * spacing + Math.sin(time * 0.43 + rand() * 6.28) * 5;
        if (py <= 6) continue;
        const radius = (0.35 + rand() * 0.45) * zoom;
        g.ellipse((px - x) * zoom, (py - y) * zoom, radius * 1.5, radius)
          .fill({ color: 0xa4d6d6, alpha: 0.13 + rand() * 0.18 });
      }
    }
  }
}
