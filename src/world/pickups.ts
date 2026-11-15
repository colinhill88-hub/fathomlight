import { Container, Graphics } from 'pixi.js';
import { mulberry32, WORLD_SEED } from '../rng';
import { isSolid, CREVICE_X } from './terrain';
import { MATERIALS, MaterialId, REGROW_SECONDS, SaveData, DroppedBag } from '../game/state';
import type { PointLight } from './scenery';

/**
 * Things the diver collects:
 *  - materials (scrap metal, copper, quartz, kelp fibre). These take work
 *    (Colin's feedback after milestone 2): stop next to one and hold Collect
 *    while the diver chips, pries, digs or cuts it free. They grow back after
 *    10 minutes of play time, a timer that carries on through blackouts and
 *    across closing the app.
 *  - hidden air tank upgrades, picked up by swimming into them,
 *  - the sample bag dropped after blacking out, also picked up by touch.
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
  // Scarcer after milestone 4 (Colin: "I seem to have more than I need"), so
  // kept creatures, which make materials, matter more. 39 spots became 28.
  add('scrap', [3960, 4040, 4210, 4290, 4930, 7420, [6120, 760], 2890]);
  add('copper', [520, 1260, 2660, 3400, 4460, 7120, [6330, 760]]);
  add('quartz', [280, 2220, 3140, 4720, 5310, 6020, 6420]);
  add('fibre', [1650, 1910, 2560, 3300, 6960, 7900]);
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

/** Seconds of work to free one of each material, and what the work is called. */
export const EFFORT: Record<MaterialId, { seconds: number; verb: string }> = {
  fibre: { seconds: 1.6, verb: 'Cut' },
  scrap: { seconds: 2.2, verb: 'Pry loose' },
  copper: { seconds: 2.6, verb: 'Dig out' },
  quartz: { seconds: 3.0, verb: 'Chip off' },
};
/** How close the diver's middle must be to reach a material. */
const REACH = 72;
/** Faster than this and the diver cannot work (no collecting while swimming past). */
const STILL_SPEED = 70;

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: number;
  r: number;
  spark: boolean;
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
  /** The material within reach that Collect would work on, if any. */
  target: { id: string; kind: MaterialId; x: number; y: number } | null = null;
  /** 0..1 work done on the target. */
  progress = 0;
  /** True while the diver is actually working (held, in reach and still). */
  working = false;

  private bits: Bit[] = [];
  private bitsG = new Graphics();
  private sparksG = new Graphics();
  private ring = new Graphics();
  private strikeClock = 0;
  private lastTarget = '';

  /** Call once after construction: adds the work effects to the layers. */
  private ensureFx(): void {
    if (this.bitsG.parent) return;
    this.view.addChild(this.bitsG);
    this.emissive.addChild(this.sparksG, this.ring);
  }

  /**
   * now: play time in seconds (save.playSeconds). held: the Collect control
   * is held. speed: how fast the diver is moving.
   */
  update(dt: number, time: number, dx: number, dy: number, save: SaveData, held: boolean, speed: number): PickupEvent[] {
    this.ensureFx();
    const now = save.playSeconds;
    const events: PickupEvent[] = [];
    let best: Item | null = null;
    let bestD = REACH;
    for (const it of this.items) {
      const { spot } = it;
      const isTank = spot.kind === 'tank';
      const taken = isTank ? save.tanks.includes(spot.id) : spot.id in save.taken;
      if (!isTank && taken && now - save.taken[spot.id] > REGROW_SECONDS) delete save.taken[spot.id];
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

      const dist = Math.hypot(dx - spot.x, dy - spot.y);
      if (isTank) {
        if (dist < 46) {
          it.pull = 0.0001;
          save.tanks.push(spot.id);
          events.push({ type: 'tank', id: spot.id });
          if (l) l.intensity = 0;
        }
      } else if (dist < bestD) {
        bestD = dist;
        best = it;
      }
    }

    // ---- Working on a material ----
    const t = best ? { id: best.spot.id, kind: best.spot.kind as MaterialId, x: best.spot.x, y: best.spot.y } : null;
    if (!t || t.id !== this.lastTarget) this.progress = 0;
    this.lastTarget = t?.id ?? '';
    this.target = t;
    this.working = !!t && held && speed < STILL_SPEED;
    if (t && this.working) {
      const effort = EFFORT[t.kind];
      this.progress += dt / effort.seconds;
      // Each stroke knocks off a few bits (and sparks when prying metal).
      this.strikeClock -= dt;
      if (this.strikeClock <= 0) {
        this.strikeClock = 0.24;
        this.strike(t.kind, t.x, t.y - 4);
      }
      // The material shakes a little as it is worked loose.
      if (best) best.view.position.set(t.x + Math.sin(time * 40) * 0.8 * this.progress, t.y);
      if (this.progress >= 1 && best) {
        this.progress = 0;
        best.pull = 0.0001;
        save.taken[t.id] = now;
        events.push({ type: 'material', kind: t.kind, x: t.x, y: t.y });
        for (let i = 0; i < 3; i++) this.strike(t.kind, t.x, t.y - 4);
      }
    } else if (t) {
      // Let go: the work slips back slowly, so a short pause does not lose it all.
      this.progress = Math.max(0, this.progress - dt * 0.35);
    }
    this.drawFx(dt, time);

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

  private strike(kind: MaterialId, x: number, y: number): void {
    const colors: Record<MaterialId, number[]> = {
      scrap: [0x8a3a20, 0x6a5a4c, 0xa8a199],
      copper: [0x9f8d66, 0xcdb98c, 0x5f9a72],
      quartz: [0xe8ecdf, 0xffffff, 0xa9b5ad],
      fibre: [0xc9a24a, 0x8a6d32, 0x6f8a45],
    };
    const cs = colors[kind];
    const n = kind === 'copper' ? 6 : 4;
    for (let i = 0; i < n; i++) {
      this.bits.push({
        x: x + R(-6, 6),
        y: y + R(-4, 4),
        vx: R(-70, 70),
        vy: kind === 'copper' ? R(-40, -5) : R(-90, -20),
        life: 1,
        color: cs[Math.floor(rand() * cs.length)],
        r: kind === 'copper' ? R(3, 7) : R(0.8, 2),
        spark: false,
      });
    }
    if (kind === 'scrap' || kind === 'quartz') {
      for (let i = 0; i < (kind === 'scrap' ? 3 : 2); i++)
        this.bits.push({ x, y, vx: R(-120, 120), vy: R(-120, -30), life: 1, color: kind === 'scrap' ? 0xffc070 : 0xfffbe8, r: 1, spark: true });
    }
  }

  private drawFx(dt: number, time: number): void {
    const g = this.bitsG;
    const sg = this.sparksG;
    g.clear();
    sg.clear();
    for (const b of this.bits) {
      b.life -= dt / (b.spark ? 0.3 : b.r > 2.5 ? 1.4 : 0.9);
      b.vx *= 1 - dt * 3;
      b.vy += (b.spark ? 200 : b.r > 2.5 ? -10 : 60) * dt; // sand clouds drift, chips sink
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0) continue;
      if (b.spark) sg.moveTo(b.x, b.y).lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02).stroke({ color: b.color, width: 1.2, alpha: b.life });
      else if (b.r > 2.5) g.circle(b.x, b.y, b.r * (1.6 - b.life * 0.6)).fill({ color: b.color, alpha: 0.35 * b.life });
      else g.rect(b.x, b.y, b.r, b.r).fill({ color: b.color, alpha: b.life });
    }
    this.bits = this.bits.filter((b) => b.life > 0);

    // A ring around the material in reach: dashed while idle, filling while working.
    const r = this.ring;
    r.clear();
    const t = this.target;
    if (!t) return;
    const rad = 17;
    const cy = t.y - 5;
    for (let k = 0; k < 12; k++) {
      const a0 = (k / 12) * Math.PI * 2 + time * 0.6;
      r.arc(t.x, cy, rad, a0, a0 + 0.3).stroke({ color: 0xfff1d0, width: 1.4, alpha: 0.55 });
    }
    if (this.progress > 0) r.arc(t.x, cy, rad + 4, -Math.PI / 2, -Math.PI / 2 + this.progress * Math.PI * 2).stroke({ color: 0xfff1d0, width: 3, alpha: 0.95 });
  }

  /** The label for the Collect button, e.g. "Chip off quartz". */
  static actionLabel(kind: MaterialId): string {
    return `${EFFORT[kind].verb} ${MATERIALS[kind].name.toLowerCase()}`;
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

