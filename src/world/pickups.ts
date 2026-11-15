import { Container, Graphics } from 'pixi.js';
import { mulberry32, WORLD_SEED } from '../rng';
import { isSolid, CREVICE_X } from './terrain';
import { MaterialId, REGROW_MS, SaveData, DroppedBag } from '../game/state';
import type { PointLight } from './scenery';

/**
 * Things the diver collects by swimming into them:
 *  - materials (scrap metal, copper, quartz, kelp fibre), which grow back
 *    a few minutes after being taken,
 *  - hidden air tank upgrades, which add dive time for good,
 *  - the sample bag dropped after blacking out.
 * Every pickup has a fixed place, so the world is the same on every play.
 */

const rand = mulberry32(WORLD_SEED ^ 0x9e11);
const R = (a: number, b: number) => a + rand() * (b - a);

/** The first solid y at x, searching down from `from`. */
function surfaceAt(x: number, from = 0): number {
  for (let y = from; y < 1300; y += 2) if (isSolid(x, y)) return y;
  return 1300;
}

interface Spot {
  id: string;
  kind: MaterialId | 'tank';
  x: number;
  y: number;
}

const SPOTS: Spot[] = (() => {
  const s: Spot[] = [];
  const add = (kind: MaterialId, xs: (number | [number, number])[]) =>
    xs.forEach((p, i) => {
      const [x, from] = Array.isArray(p) ? p : [p, 0];
      s.push({ id: `${kind}-${i}`, kind, x, y: surfaceAt(x, from) - (kind === 'quartz' ? 3 : 5) });
    });
  add('scrap', [3960, 4040, 4210, 4290, 4370, 4930, 5070, 2890, [6120, 760], 7420]);
  add('copper', [520, 1260, 1560, 2660, 3400, 3720, 4460, 7120, 8170, [6330, 760]]);
  add('quartz', [280, 2220, 2310, 3140, 4720, 4850, 5310, 6020, 6420, 8330]);
  add('fibre', [1650, 1910, 2560, 3300, 3460, 6960, 7310, 7900, 8210]);
  s.push({ id: 'tank-grotto', kind: 'tank', x: 6720, y: surfaceAt(6720, 760) - 12 });
  s.push({ id: 'tank-crevice', kind: 'tank', x: CREVICE_X, y: surfaceAt(CREVICE_X) - 12 });
  return s;
})();

// ---- Drawing (all code-drawn, small and weathered) ----

function drawScrap(g: Graphics): void {
  const pts = [-11, -3, -4, -7, 9, -5, 12, 2, 4, 6, -9, 4];
  g.poly(pts).fill({ color: 0x6a5a4c });
  g.poly([-11, -3, -4, -7, 9, -5, 8, -3, -4, -5, -10, -1]).fill({ color: 0xa8a199, alpha: 0.35 });
  for (let i = 0; i < 4; i++) g.circle(R(-8, 8), R(-4, 3), R(1.5, 3)).fill({ color: 0x8a3a20, alpha: 0.7 });
  g.circle(-6, -2, 0.9).fill({ color: 0x2b2622 });
  g.circle(6, -1, 0.9).fill({ color: 0x2b2622 });
  g.moveTo(-10, 4).lineTo(-13, 7).stroke({ color: 0x4a3f36, width: 1.4 });
}

function drawCopper(g: Graphics): void {
  g.ellipse(0, 0, 9, 6).fill({ color: 0x5b4a3a });
  g.ellipse(5, -2, 6, 4.5).fill({ color: 0x6e5440 });
  for (let i = 0; i < 6; i++) g.circle(R(-7, 9), R(-5, 3), R(1.2, 2.6)).fill({ color: 0x5f9a72, alpha: 0.8 });
  g.ellipse(-2, -3, 3, 1.4).fill({ color: 0xd99a62, alpha: 0.7 });
}

function drawQuartz(g: Graphics): void {
  const prism = (x: number, h: number, w: number, lean: number) => {
    g.poly([x - w, 0, x - w + lean, -h, x + lean, -h - w, x + w + lean, -h, x + w, 0]).fill({ color: 0xe8ecdf, alpha: 0.85 });
    g.poly([x + lean, -h - w, x + w + lean, -h, x + w, 0, x, 0]).fill({ color: 0xa9b5ad, alpha: 0.6 });
    g.moveTo(x - w * 0.5, -1).lineTo(x - w * 0.5 + lean, -h + 1).stroke({ color: 0xffffff, width: 0.8, alpha: 0.8 });
  };
  prism(-5, 9, 2.6, -2);
  prism(4, 8, 2.4, 2.5);
  prism(0, 14, 3.2, 0.5);
  g.ellipse(0, 1, 10, 2.5).fill({ color: 0x4c5d61 });
}

function drawFibre(g: Graphics): void {
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i / 8 - 0.5) * 2.2;
    const l = R(8, 15);
    g.moveTo(0, 2).quadraticCurveTo(Math.cos(a) * l * 0.5 + R(-3, 3), Math.sin(a) * l * 0.6, Math.cos(a) * l, Math.sin(a) * l)
      .stroke({ color: i % 2 ? 0xc9a24a : 0xa4823a, width: 1.4, cap: 'round' });
  }
  g.ellipse(0, 2, 6, 3.5).fill({ color: 0x8a6d32 });
  g.ellipse(-1.5, 1, 2.5, 1.2).fill({ color: 0xe8cf86, alpha: 0.7 });
}

function drawTank(g: Graphics): void {
  // A small spare air cylinder in Kestrel yellow, lying on its side.
  g.roundRect(-16, -6, 30, 12, 6).fill({ color: 0xc29b45 });
  g.roundRect(-16, 1, 30, 5, 3).fill({ color: 0x8c6f31, alpha: 0.7 });
  g.roundRect(-14, -5, 26, 2.5, 1.2).fill({ color: 0xffffff, alpha: 0.25 });
  g.rect(-4, -6, 2, 12).fill({ color: 0x3b4448 });
  g.rect(14, -2.5, 4, 5).fill({ color: 0x8a9496 });
  g.circle(19.5, 0, 2.6).fill({ color: 0xa8402e });
  for (let i = 0; i < 3; i++) {
    const x = R(-12, 10);
    g.moveTo(x, -2).lineTo(x + R(-1, 1), R(2, 6)).stroke({ color: 0x8a3a20, width: 1, alpha: 0.6 });
  }
  for (let i = 0; i < 5; i++) g.circle(R(-15, 12), R(3, 6), R(1, 2)).fill({ color: 0x5e7a3c, alpha: 0.8 });
}

function drawBag(g: Graphics): void {
  g.ellipse(0, 4, 13, 9).fill({ color: 0x4a4436 });
  g.ellipse(-3, 1, 7, 4).fill({ color: 0x6a624e, alpha: 0.8 });
  g.moveTo(-6, -4).quadraticCurveTo(0, -10, 6, -4).stroke({ color: 0x232524, width: 2 });
  g.rect(-9, 4, 18, 2).fill({ color: 0xa8402e });
  g.roundRect(8, -1, 5, 7, 1).fill({ color: 0xc29b45 });
}

const DRAW: Record<Spot['kind'], (g: Graphics) => void> = {
  scrap: drawScrap,
  copper: drawCopper,
  quartz: drawQuartz,
  fibre: drawFibre,
  tank: drawTank,
};

interface Item {
  spot: Spot;
  view: Graphics;
  glint: Graphics;
  present: boolean;
  /** 0 while sitting still; counts up while being pulled in towards the diver. */
  pull: number;
  phase: number;
}

export type PickupEvent =
  | { type: 'material'; kind: MaterialId; x: number; y: number }
  | { type: 'tank'; id: string }
  | { type: 'bag'; items: Partial<Record<MaterialId, number>> };

export class Pickups {
  readonly view = new Container();
  readonly emissive = new Container();
  readonly glow = new Container();
  readonly lights: PointLight[] = [];

  private items: Item[] = [];
  private bagView = new Graphics();
  private bagLamp = new Graphics();
  private bagHalo = new Graphics();
  private bagLight: PointLight = { x: 0, y: 0, radius: 160, intensity: 0, color: [1, 0.7, 0.3] };
  private tankLights = new Map<string, PointLight>();

  constructor() {
    for (const spot of SPOTS) {
      const view = new Graphics();
      DRAW[spot.kind](view);
      view.position.set(spot.x, spot.y);
      view.rotation = spot.kind === 'tank' ? R(-0.15, 0.15) : R(-0.25, 0.25);
      const glint = new Graphics();
      const s = spot.kind === 'tank' ? 7 : 4;
      glint.poly([0, -s, s * 0.22, 0, 0, s, -s * 0.22, 0]).fill({ color: 0xfff6d8 });
      glint.poly([-s, 0, 0, s * 0.22, s, 0, 0, -s * 0.22]).fill({ color: 0xfff6d8 });
      glint.position.set(spot.x + (spot.kind === 'quartz' ? 0 : 3), spot.y - (spot.kind === 'quartz' ? 9 : 4));
      this.view.addChild(view);
      this.emissive.addChild(glint);
      this.items.push({ spot, view, glint, present: true, pull: 0, phase: rand() * 10 });
      if (spot.kind === 'tank') {
        // A faint warm light makes the hidden tanks findable in the dark.
        const l: PointLight = { x: spot.x, y: spot.y - 10, radius: 110, intensity: 0.5, color: [1, 0.85, 0.5] };
        this.tankLights.set(spot.id, l);
        this.lights.push(l);
      }
    }
    drawBag(this.bagView);
    this.bagLamp.circle(0, 0, 2.2).fill({ color: 0xffc070 });
    this.bagHalo.circle(0, 0, 18).fill({ color: 0xffa040 });
    this.view.addChild(this.bagView);
    this.emissive.addChild(this.bagLamp);
    this.glow.addChild(this.bagHalo);
    this.lights.push(this.bagLight);
  }

  /** Where the dropped bag is, if there is one (for the off-screen marker). */
  bagPos: { x: number; y: number } | null = null;

  update(dt: number, time: number, dx: number, dy: number, save: SaveData, now: number): PickupEvent[] {
    const events: PickupEvent[] = [];
    for (const it of this.items) {
      const { spot } = it;
      const isTank = spot.kind === 'tank';
      const taken = isTank ? save.tanks.includes(spot.id) : spot.id in save.taken;
      if (!isTank && taken && now - save.taken[spot.id] > REGROW_MS) delete save.taken[spot.id];
      const gone = isTank ? save.tanks.includes(spot.id) : spot.id in save.taken;

      if (it.pull > 0) {
        // Being pulled in: slide towards the diver and shrink, then vanish.
        it.pull += dt / 0.25;
        const t = Math.min(1, it.pull);
        it.view.position.set(spot.x + (dx - spot.x) * t, spot.y + (dy - spot.y) * t);
        it.view.scale.set(1 - t * 0.8);
        it.glint.visible = false;
        if (t >= 1) {
          it.pull = 0;
          it.view.visible = false;
          it.present = false;
        }
        continue;
      }
      if (gone) {
        if (it.present) {
          it.present = false;
          it.view.visible = false;
          it.glint.visible = false;
        }
        const l = this.tankLights.get(spot.id);
        if (l) l.intensity = 0;
        continue;
      }
      if (!it.present) {
        it.present = true;
        it.view.visible = true;
        it.view.position.set(spot.x, spot.y);
        it.view.scale.set(1);
      }
      // Twinkle: a short sparkle every few seconds, each pickup on its own beat.
      const beat = (time + it.phase) % (isTank ? 2.2 : 3.6);
      const tw = beat < 0.5 ? Math.sin((beat / 0.5) * Math.PI) : 0;
      it.glint.visible = tw > 0.02;
      it.glint.alpha = tw;
      it.glint.scale.set(0.5 + tw * 0.7);
      it.glint.rotation = time * 0.8;
      const l = this.tankLights.get(spot.id);
      if (l) l.intensity = 0.4 + 0.2 * Math.sin(time * 2.4);

      const reach = isTank ? 46 : 40;
      if (Math.hypot(dx - spot.x, dy - spot.y) < reach) {
        it.pull = 0.0001;
        if (isTank) {
          save.tanks.push(spot.id);
          events.push({ type: 'tank', id: spot.id });
          if (l) l.intensity = 0;
        } else {
          save.taken[spot.id] = now;
          events.push({ type: 'material', kind: spot.kind as MaterialId, x: spot.x, y: spot.y });
        }
      }
    }

    // The dropped sample bag.
    const bag: DroppedBag | null = save.dropped;
    this.bagPos = bag ? { x: bag.x, y: bag.y } : null;
    this.bagView.visible = this.bagLamp.visible = this.bagHalo.visible = !!bag;
    this.bagLight.intensity = 0;
    if (bag) {
      this.bagView.position.set(bag.x, bag.y);
      const blink = (time % 1.6) < 0.25 ? 1 : 0.25;
      this.bagLamp.position.set(bag.x + 10.5, bag.y + 1);
      this.bagHalo.position.set(bag.x + 10.5, bag.y + 1);
      this.bagLamp.alpha = blink;
      this.bagHalo.alpha = blink * 0.8;
      this.bagLight.x = bag.x + 10;
      this.bagLight.y = bag.y;
      this.bagLight.intensity = blink * 0.7;
      if (Math.hypot(dx - bag.x, dy - bag.y) < 48) {
        events.push({ type: 'bag', items: bag.items });
        save.dropped = null;
      }
    }
    return events;
  }

  /** Where pickups of a kind lie (the scanner uses these). */
  static spotsOf(kind: Spot['kind']): { x: number; y: number }[] {
    return SPOTS.filter((s) => s.kind === kind).map((s) => ({ x: s.x, y: s.y }));
  }
}

/** Somewhere sensible to put the bag: on the seabed below where the diver blacked out. */
export function bagRestingPlace(x: number, y: number): { x: number; y: number } {
  let yy = y;
  while (yy < 1300 && !isSolid(x, yy + 12)) yy += 4;
  return { x, y: Math.min(yy, 1290) };
}

