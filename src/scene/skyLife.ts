import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { mulberry32 } from '../rng';

/**
 * SkyLife (Colin, Nov 24, 2026): high-fidelity painterly Sun, Moon, and
 * articulated daytime coastal Seagulls synced to the Water shader's 6-minute
 * Day / Night cycle. Clipped cleanly above the ocean horizon so the Sun & Moon
 * rise from and set behind the waves, and gulls soar strictly in the open air.
 */

const DAY_CYCLE_SEC = 360;
const DAY_START_OFFSET = 0.715;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

function lerpRgb(a: [number, number, number], b: [number, number, number], t: number): number {
  const k = clamp01(t);
  const r = Math.round(a[0] + (b[0] - a[0]) * k);
  const g = Math.round(a[1] + (b[1] - a[1]) * k);
  const bl = Math.round(a[2] + (b[2] - a[2]) * k);
  return (r << 16) | (g << 8) | bl;
}

/** Paint a high-fidelity gouache/watercolor Sun disc + subtle corona texture onto a 256×256 canvas. */
function makeSunTextures(): { disc: Texture; rays: Texture } {
  const S = 256;
  const cx = S / 2;
  const cy = S / 2;

  // 1. Painterly Sun disc with warm limb darkening & subtle surface brushwork.
  const c1 = document.createElement('canvas');
  c1.width = c1.height = S;
  const g1 = c1.getContext('2d')!;
  const aura = g1.createRadialGradient(cx, cy, 24, cx, cy, 122);
  aura.addColorStop(0, 'rgba(255, 252, 232, 0.96)');
  aura.addColorStop(0.28, 'rgba(255, 236, 178, 0.72)');
  aura.addColorStop(0.55, 'rgba(255, 194, 112, 0.24)');
  aura.addColorStop(1, 'rgba(255, 165, 85, 0)');
  g1.fillStyle = aura;
  g1.fillRect(0, 0, S, S);

  // Core disc with soft painterly limb tint.
  const R = 48;
  g1.save();
  g1.beginPath();
  g1.arc(cx, cy, R, 0, Math.PI * 2);
  g1.clip();
  const body = g1.createRadialGradient(cx - 10, cy - 12, 4, cx, cy, R);
  body.addColorStop(0, '#fffef4');
  body.addColorStop(0.52, '#fff5cc');
  body.addColorStop(0.84, '#ffd480');
  body.addColorStop(1, '#f4a44e');
  g1.fillStyle = body;
  g1.fillRect(cx - R, cy - R, R * 2, R * 2);
  // Soft watercolor mottling inside the solar surface.
  const rng = mulberry32(0x501a);
  for (let i = 0; i < 24; i++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * R * 0.78;
    const rr = 6 + rng() * 14;
    g1.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 240, 0.14)' : 'rgba(240, 152, 62, 0.10)';
    g1.beginPath();
    g1.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr, rr * 0.65, a, 0, Math.PI * 2);
    g1.fill();
  }
  g1.restore();

  // 2. Soft rotating painterly solar corona rays.
  const c2 = document.createElement('canvas');
  c2.width = c2.height = S;
  const g2 = c2.getContext('2d')!;
  g2.translate(cx, cy);
  const rayCount = 14;
  for (let i = 0; i < rayCount; i++) {
    const ang = (i / rayCount) * Math.PI * 2;
    const len = i % 2 === 0 ? 118 : 90;
    const wid = i % 2 === 0 ? 15 : 10;
    g2.save();
    g2.rotate(ang);
    const rg = g2.createLinearGradient(28, 0, len, 0);
    rg.addColorStop(0, 'rgba(255, 240, 185, 0.34)');
    rg.addColorStop(0.6, 'rgba(255, 210, 130, 0.10)');
    rg.addColorStop(1, 'rgba(255, 190, 110, 0)');
    g2.fillStyle = rg;
    g2.beginPath();
    g2.moveTo(26, -wid * 0.45);
    g2.quadraticCurveTo(len * 0.6, -wid * 0.2, len, 0);
    g2.quadraticCurveTo(len * 0.6, wid * 0.2, 26, wid * 0.45);
    g2.closePath();
    g2.fill();
    g2.restore();
  }

  return { disc: Texture.from(c1), rays: Texture.from(c2) };
}

/** Paint a high-fidelity pearlescent Moon with lunar maria craters & atmospheric halo onto a 256×256 canvas. */
function makeMoonTexture(): Texture {
  const S = 256;
  const cx = S / 2;
  const cy = S / 2;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;

  // Cool silver-blue atmospheric aura.
  const halo = g.createRadialGradient(cx, cy, 24, cx, cy, 118);
  halo.addColorStop(0, 'rgba(215, 232, 255, 0.52)');
  halo.addColorStop(0.45, 'rgba(130, 175, 228, 0.16)');
  halo.addColorStop(1, 'rgba(90, 140, 210, 0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, S, S);

  const R = 42;
  g.save();
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.clip();
  // Pearlescent base sphere.
  const base = g.createRadialGradient(cx - 14, cy - 14, 4, cx, cy, R * 1.1);
  base.addColorStop(0, '#f8fbff');
  base.addColorStop(0.55, '#dce6f2');
  base.addColorStop(0.88, '#a6bad2');
  base.addColorStop(1, '#6c84a4');
  g.fillStyle = base;
  g.fillRect(cx - R, cy - R, R * 2, R * 2);

  // Hand-placed painterly lunar maria (seas) & subtle crater rims.
  const maria: [number, number, number, number, number, number][] = [
    [-12, -10, 15, 11, -0.3, 0.24],
    [8, -14, 12, 9, 0.4, 0.20],
    [14, 4, 14, 12, 0.2, 0.22],
    [-4, 12, 11, 8, -0.5, 0.18],
    [-20, 8, 9, 7, 0.1, 0.22],
    [2, -2, 8, 7, 0.3, 0.16],
  ];
  for (const [dx, dy, rx, ry, rot, a] of maria) {
    g.fillStyle = `rgba(92, 112, 142, ${a})`;
    g.beginPath();
    g.ellipse(cx + dx, cy + dy, rx, ry, rot, 0, Math.PI * 2);
    g.fill();
  }
  const rng = mulberry32(0x100a);
  for (let i = 0; i < 16; i++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * R * 0.78;
    const cr = 2 + rng() * 4.2;
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d;
    g.fillStyle = 'rgba(78, 96, 124, 0.18)';
    g.beginPath();
    g.arc(x, y, cr, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(248, 252, 255, 0.25)';
    g.lineWidth = 0.9;
    g.beginPath();
    g.arc(x - 0.6, y - 0.6, cr, Math.PI * 0.85, Math.PI * 1.75);
    g.stroke();
  }
  // Soft waxing-gibbous terminator shadow along the bottom-right rim for rich 3D depth.
  const term = g.createRadialGradient(cx - 18, cy - 12, R * 0.65, cx + 10, cy + 8, R * 1.2);
  term.addColorStop(0, 'rgba(18, 28, 48, 0)');
  term.addColorStop(0.75, 'rgba(18, 28, 48, 0.16)');
  term.addColorStop(1, 'rgba(12, 20, 38, 0.48)');
  g.fillStyle = term;
  g.fillRect(cx - R, cy - R, R * 2, R * 2);
  g.restore();

  return Texture.from(c);
}

/** Paint a whimsical gouache/watercolor vintage saucer UFO Easter egg onto a 192×96 canvas. */
function makeUfoTexture(): Texture {
  const W = 192;
  const H = 96;
  const cx = W / 2;
  const cy = H * 0.56;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;

  // Soft ethereal greenish-ivory underside glow.
  const glow = g.createRadialGradient(cx, cy + 8, 6, cx, cy + 12, 54);
  glow.addColorStop(0, 'rgba(198, 255, 180, 0.42)');
  glow.addColorStop(0.55, 'rgba(130, 224, 198, 0.14)');
  glow.addColorStop(1, 'rgba(100, 200, 190, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  // Translucent glass dome cupola on top.
  const dome = g.createRadialGradient(cx - 8, cy - 22, 3, cx, cy - 12, 26);
  dome.addColorStop(0, 'rgba(232, 255, 245, 0.88)');
  dome.addColorStop(0.6, 'rgba(130, 196, 188, 0.58)');
  dome.addColorStop(1, 'rgba(54, 92, 98, 0.72)');
  g.fillStyle = dome;
  g.beginPath();
  g.arc(cx, cy - 8, 24, Math.PI, 0);
  g.closePath();
  g.fill();
  g.strokeStyle = '#38464c';
  g.lineWidth = 2;
  g.stroke();

  // Painterly brushed-pewter & antique-brass saucer hull.
  const hull = g.createLinearGradient(cx, cy - 12, cx, cy + 16);
  hull.addColorStop(0, '#96a9b2');
  hull.addColorStop(0.45, '#52646c');
  hull.addColorStop(1, '#263338');
  g.fillStyle = hull;
  g.beginPath();
  g.ellipse(cx, cy, 56, 14, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#182226';
  g.lineWidth = 2;
  g.stroke();

  // Brass rim belt & glowing warm porthole lights around the saucer equator.
  g.strokeStyle = '#d4b26a';
  g.lineWidth = 2.4;
  g.beginPath();
  g.ellipse(cx, cy + 1, 52, 9.5, 0, 0.08 * Math.PI, 0.92 * Math.PI);
  g.stroke();
  for (let i = -2; i <= 2; i++) {
    const px = cx + i * 19;
    const py = cy + 2 + (4 - Math.abs(i)) * 0.7;
    g.fillStyle = i % 2 === 0 ? '#e6ff9e' : '#ffdb8a';
    g.beginPath();
    g.ellipse(px, py, 4.2, 2.5, 0, 0, Math.PI * 2);
    g.fill();
  }
  return Texture.from(c);
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

interface RainSplash {
  x: number;
  dy: number;
  life: number;
  max: number;
  size: number;
}

interface Gull {
  root: Container;
  body: Graphics;
  farInner: Container;
  farOuter: Container;
  nearInner: Container;
  nearOuter: Container;
  /** World X position (wraps around the camera horizontally). */
  wx: number;
  /** Base altitude above waterline (negative Y in world space, e.g. -55..-210). */
  baseY: number;
  vx: number;
  scale: number;
  phase: number;
  flapRate: number;
  glideCycle: number;
  swoopPhase: number;
}

/** Build an articulated 2-segment coastal Seagull rig (body + far & near hinged wings with black primary tips). */
function buildGull(): Omit<Gull, 'wx' | 'baseY' | 'vx' | 'scale' | 'phase' | 'flapRate' | 'glideCycle' | 'swoopPhase'> {
  const root = new Container();

  const makeWing = (far: boolean): { inner: Container; outer: Container } => {
    const inner = new Container();
    inner.position.set(far ? 2 : 0, far ? -2.2 : -1.2);
    const ig = new Graphics();
    const mantle = far ? 0xa5b4bf : 0xc6d3dc;
    const edge = far ? 0x627380 : 0x7c8f9c;
    // Inner wing (shoulder to wrist): arched slate-grey upper mantle & white trailing edge.
    ig.moveTo(-4, 0)
      .quadraticCurveTo(3, -5.5, 13, -1.5)
      .lineTo(11, 2.6)
      .quadraticCurveTo(2, 1.8, -4, 2.2)
      .closePath()
      .fill({ color: mantle })
      .stroke({ color: edge, width: 0.75, alpha: 0.75 });
    ig.moveTo(-2, 1.8).quadraticCurveTo(4, 1.6, 11, 2.2).stroke({ color: 0xf6f8f8, width: 1.1, alpha: far ? 0.65 : 0.9 });
    inner.addChild(ig);

    // Outer primary wingtip (wrist to tip) with crisp charcoal-black wingtip feathers.
    const outer = new Container();
    outer.position.set(12.2, -0.4);
    const og = new Graphics();
    og.moveTo(-1, -1.6)
      .quadraticCurveTo(7, -2.8, 15.5, 0.2)
      .quadraticCurveTo(8, 2.6, -1, 2.4)
      .closePath()
      .fill({ color: far ? 0xb4c2cc : 0xd4dee6 });
    // Charcoal-black primary feather tips characteristic of coastal gulls.
    og.moveTo(7.5, -1.7)
      .quadraticCurveTo(12, -1.5, 16, 0.2)
      .quadraticCurveTo(11.5, 1.9, 6.8, 1.8)
      .closePath()
      .fill({ color: far ? 0x2a3238 : 0x1e252a });
    // Tiny white mirror spot near tip.
    og.circle(11.4, 0.1, 0.9).fill({ color: 0xffffff, alpha: 0.8 });
    outer.addChild(og);
    inner.addChild(outer);
    return { inner, outer };
  };

  const far = makeWing(true);
  const near = makeWing(false);

  // Sleek coastal gull body: white belly, soft slate back, fanned tail, yellow beak.
  const body = new Graphics();
  // Tail fan.
  body.poly([-9, -0.5, -17.5, -2.5, -16.5, 1.6, -9, 1.4]).fill({ color: 0xf4f7f8 });
  body.moveTo(-15.5, -1.6).lineTo(-15, 1.2).stroke({ color: 0x262e34, width: 1.2, alpha: 0.85 });
  // Torso & head.
  body.moveTo(-10, 0)
    .quadraticCurveTo(-2, -4.4, 7.5, -2.6)
    .quadraticCurveTo(12.5, -3.4, 14.5, -1.2)
    .quadraticCurveTo(12.5, 1.8, 7.5, 2.4)
    .quadraticCurveTo(-1, 3.8, -10, 1.2)
    .closePath()
    .fill({ color: 0xf6f8f8 });
  // Slate mantle cap along the back.
  body.moveTo(-8, -0.6).quadraticCurveTo(0, -4.2, 7, -2.4).quadraticCurveTo(0, -1.2, -8, -0.6).fill({ color: 0xb9c7d1, alpha: 0.85 });
  // Subtle belly shadow.
  body.moveTo(-6, 1.6).quadraticCurveTo(1, 3.4, 8, 1.8).stroke({ color: 0xc2ced6, width: 1.1, alpha: 0.65 });
  // Hooked golden-yellow gull beak & dark eye.
  body.poly([14, -1.6, 18.8, -0.6, 17.8, 0.7, 13.8, 0.4]).fill({ color: 0xe6b43c });
  body.circle(16.6, 0.2, 0.65).fill({ color: 0xc84430 });
  body.circle(12.2, -1.3, 0.85).fill({ color: 0x161c20 });

  root.addChild(far.inner, body, near.inner);
  return { root, body, farInner: far.inner, farOuter: far.outer, nearInner: near.inner, nearOuter: near.outer };
}

export class SkyLife {
  readonly view = new Container();
  private readonly clipMask = new Graphics();
  private readonly sunRays: Sprite;
  private readonly sunDisc: Sprite;
  private readonly moonDisc: Sprite;
  private readonly starFx = new Graphics();
  private readonly ufoSprite: Sprite;
  private readonly gullLayer = new Container();
  private readonly rainFx = new Graphics();
  private readonly splashFx = new Graphics();
  private readonly skyGroup = new Container();
  private readonly gulls: Gull[] = [];
  private shootingStars: ShootingStar[] = [];
  private rainSplashes: RainSplash[] = [];
  private nextStarAt = 4;
  private ufoState: { active: boolean; x: number; y: number; vx: number; t: number; nextAt: number } = {
    active: false, x: 0, y: 0, vx: 0, t: 0, nextAt: 42,
  };

  constructor() {
    const sunTex = makeSunTextures();
    this.sunRays = new Sprite(sunTex.rays);
    this.sunRays.anchor.set(0.5);
    this.sunDisc = new Sprite(sunTex.disc);
    this.sunDisc.anchor.set(0.5);

    this.moonDisc = new Sprite(makeMoonTexture());
    this.moonDisc.anchor.set(0.5);

    this.ufoSprite = new Sprite(makeUfoTexture());
    this.ufoSprite.anchor.set(0.5);
    this.ufoSprite.visible = false;

    // Sky group (Sun, Moon, stars, UFO, gulls, falling rain) is clipped cleanly above the ocean horizon.
    this.skyGroup.addChild(this.sunRays, this.sunDisc, this.moonDisc, this.starFx, this.ufoSprite, this.gullLayer, this.rainFx);
    this.skyGroup.mask = this.clipMask;
    // Surface rain splashes sit right on top of the waterline (unclipped vertically).
    this.view.addChild(this.clipMask, this.skyGroup, this.splashFx);

    const rng = mulberry32(0x6011);
    for (let i = 0; i < 7; i++) {
      const rig = buildGull();
      const dir = i % 2 === 0 ? 1 : -1;
      const g: Gull = {
        ...rig,
        wx: -600 + i * 340 + rng() * 140,
        baseY: -42 - rng() * 175,
        vx: dir * (44 + rng() * 28),
        scale: 0.72 + rng() * 0.48,
        phase: rng() * Math.PI * 2,
        flapRate: 5.4 + rng() * 2.0,
        glideCycle: rng() * 12,
        swoopPhase: rng() * Math.PI * 2,
      };
      this.gullLayer.addChild(g.root);
      this.gulls.push(g);
    }
  }

  update(dt: number, time: number, camX: number, camY: number, viewW: number, viewH: number, cssW: number, cssH: number): void {
    const zoom = cssH / Math.max(1, viewH);
    const horizonScreenY = (0 - camY) * zoom;
    // If the ocean horizon is above the top of the screen, nothing in the sky is visible.
    if (horizonScreenY <= 2) {
      this.view.visible = false;
      return;
    }
    this.view.visible = true;
    // Clip cleanly right at the horizon so Sun, Moon, and Seagulls never appear underwater.
    this.clipMask.clear().rect(0, 0, cssW, Math.min(cssH, horizonScreenY + 3)).fill({ color: 0xffffff });

    // Exact same Day / Night & Weather clock as src/scene/water.ts.
    const dayPhase = (((time / DAY_CYCLE_SEC) + DAY_START_OFFSET) % 1 + 1) % 1;
    const sunAngle = (dayPhase - 0.25) * Math.PI * 2;
    const sunElev = Math.sin(sunAngle);
    const dayAmt = smoothstep(-0.14, 0.28, sunElev);
    const du = (sunElev - 0.04) / 0.22;
    const duskAmt = Math.exp(-(du * du));
    const wPhase = (((time / 270) + 0.15) % 1 + 1) % 1;
    const rainAmt = smoothstep(0.64, 0.72, wPhase) * (1 - smoothstep(0.90, 0.98, wPhase));
    const overcast = smoothstep(0.56, 0.70, wPhase) * (1 - smoothstep(0.92, 1.0, wPhase));
    const sunVis = smoothstep(-0.18, 0.02, sunElev) * (1 - overcast * 0.72);

    const skySpanWorld = Math.max(240, viewH * 0.42);
    const skySpanPx = skySpanWorld * zoom;
    const aspect = cssW / Math.max(1, cssH);

    // 1. Painterly Sun sprite + slowly turning solar corona rays.
    const sunXNorm = -Math.cos(sunAngle) * 0.56;
    const sunYNorm = Math.max(-0.25, Math.min(0.90, sunElev * 0.84 + 0.10));
    const sunScreenX = (0.5 + sunXNorm / aspect) * cssW;
    const sunScreenY = horizonScreenY - sunYNorm * skySpanPx;
    const sunSize = Math.max(88, Math.min(185, cssH * 0.22)) * (1 + duskAmt * 0.18);
    this.sunDisc.visible = this.sunRays.visible = sunVis > 0.01;
    if (this.sunDisc.visible) {
      this.sunDisc.position.set(sunScreenX, sunScreenY);
      this.sunDisc.width = this.sunDisc.height = sunSize;
      this.sunDisc.alpha = sunVis;
      this.sunDisc.tint = lerpRgb([255, 250, 232], [255, 198, 130], duskAmt * 0.85);

      this.sunRays.position.set(sunScreenX, sunScreenY);
      this.sunRays.width = this.sunRays.height = sunSize * 1.55;
      this.sunRays.rotation = time * 0.035;
      this.sunRays.alpha = sunVis * (0.55 + duskAmt * 0.35);
      this.sunRays.tint = lerpRgb([255, 245, 210], [255, 178, 108], duskAmt * 0.9);
    }

    // 2. Painterly Moon sprite with lunar maria craters.
    const moonElev = -sunElev;
    const moonVis = smoothstep(-0.08, 0.14, moonElev);
    const moonXNorm = Math.cos(sunAngle) * 0.48;
    const moonYNorm = Math.max(-0.2, Math.min(0.88, moonElev * 0.80 + 0.12));
    const moonScreenX = (0.5 + moonXNorm / aspect) * cssW;
    const moonScreenY = horizonScreenY - moonYNorm * skySpanPx;
    const moonSize = Math.max(72, Math.min(148, cssH * 0.175));
    this.moonDisc.visible = moonVis > 0.01;
    if (this.moonDisc.visible) {
      this.moonDisc.position.set(moonScreenX, moonScreenY);
      this.moonDisc.width = this.moonDisc.height = moonSize;
      this.moonDisc.alpha = moonVis * 0.96;
    }

    // 2b. Night Sky Shooting Stars & Rare Gouache UFO Easter Egg!
    const nightVis = smoothstep(0.06, -0.22, sunElev);
    const sfx = this.starFx.clear();
    if (nightVis > 0.12 && horizonScreenY > 40) {
      this.nextStarAt -= dt;
      if (this.nextStarAt <= 0 && this.shootingStars.length < 2) {
        this.nextStarAt = 4.5 + Math.random() * 8.5;
        const dir = Math.random() < 0.5 ? 1 : -1;
        this.shootingStars.push({
          x: cssW * (0.12 + Math.random() * 0.76),
          y: Math.max(14, horizonScreenY * (0.08 + Math.random() * 0.42)),
          vx: dir * (280 + Math.random() * 190),
          vy: 75 + Math.random() * 85,
          life: 0,
          max: 0.55 + Math.random() * 0.45,
        });
      }
      // Rare UFO Easter egg cruising smoothly across the distant night sky.
      if (!this.ufoState.active) {
        this.ufoState.nextAt -= dt;
        if (this.ufoState.nextAt <= 0) {
          const fromLeft = Math.random() < 0.5;
          this.ufoState.active = true;
          this.ufoState.t = 0;
          this.ufoState.x = fromLeft ? -70 : cssW + 70;
          this.ufoState.y = Math.max(26, horizonScreenY * (0.18 + Math.random() * 0.34));
          this.ufoState.vx = (fromLeft ? 1 : -1) * (88 + Math.random() * 34);
          this.ufoState.nextAt = 95 + Math.random() * 110;
        }
      }
    }
    const keptStars: ShootingStar[] = [];
    for (const st of this.shootingStars) {
      st.life += dt;
      if (st.life >= st.max) continue;
      st.x += st.vx * dt;
      st.y += st.vy * dt;
      const p = st.life / st.max;
      const fade = Math.sin(p * Math.PI) * Math.max(0.2, nightVis);
      const tail = 0.11;
      sfx.moveTo(st.x, st.y).lineTo(st.x - st.vx * tail, st.y - st.vy * tail)
        .stroke({ color: 0xfff5d8, width: 2.0, alpha: fade * 0.85, cap: 'round' });
      sfx.moveTo(st.x, st.y).lineTo(st.x - st.vx * tail * 0.45, st.y - st.vy * tail * 0.45)
        .stroke({ color: 0xffffff, width: 1.2, alpha: fade, cap: 'round' });
      sfx.circle(st.x, st.y, 2.2).fill({ color: 0xfffbe8, alpha: fade });
      keptStars.push(st);
    }
    this.shootingStars = keptStars;

    if (this.ufoState.active) {
      this.ufoState.t += dt;
      // Gentle cruising bob, then a playful acceleration zip near the far edge!
      const zip = this.ufoState.t > 5.5 ? 1 + (this.ufoState.t - 5.5) * 1.4 : 1;
      this.ufoState.x += this.ufoState.vx * zip * dt;
      const uy = this.ufoState.y + Math.sin(this.ufoState.t * 2.6) * 10;
      this.ufoSprite.visible = nightVis > 0.05;
      this.ufoSprite.position.set(this.ufoState.x, uy);
      const sc = Math.max(0.32, Math.min(0.56, cssH / 1600));
      this.ufoSprite.scale.set(sc);
      this.ufoSprite.rotation = Math.sin(this.ufoState.t * 2.1) * 0.08 + (zip > 1 ? Math.sign(this.ufoState.vx) * 0.12 : 0);
      this.ufoSprite.alpha = Math.min(0.92, nightVis * 1.15);
      // Soft faint shimmer trail behind the UFO when it zips away.
      if (zip > 1.05 && this.ufoSprite.visible) {
        sfx.moveTo(this.ufoState.x, uy).lineTo(this.ufoState.x - this.ufoState.vx * 0.35, uy)
          .stroke({ color: 0xc8ffbe, width: 3.2, alpha: 0.32 * nightVis, cap: 'round' });
      }
      if (this.ufoState.x < -140 || this.ufoState.x > cssW + 140 || nightVis <= 0.02) {
        this.ufoState.active = false;
        this.ufoSprite.visible = false;
      }
    } else {
      this.ufoSprite.visible = false;
    }

    // 3. Passing Coastal Rain Squall: wind-driven rain streaks + animated water-surface crown splashes & expanding ripples!
    const rf = this.rainFx.clear();
    const spf = this.splashFx.clear();
    if (rainAmt > 0.02) {
      const dropCount = Math.round(40 + rainAmt * 110);
      const skyTop = -40;
      const skySpan = Math.max(80, horizonScreenY + 40);
      const rainCol = dayAmt > 0.3 ? 0xd8eaee : 0x9ab4c4;
      for (let i = 0; i < dropCount; i++) {
        const seed = i * 73.137;
        const speed = 580 + (i % 7) * 58;
        const u = ((time * speed + seed * 19) % skySpan) / skySpan;
        const rx = (((seed * 97.3 - time * 165) % (cssW + 120)) + (cssW + 120)) % (cssW + 120) - 60;
        const ry = skyTop + u * skySpan;
        const len = 16 + (i % 4) * 6;
        rf.moveTo(rx, ry).lineTo(rx - len * 0.28, ry + len)
          .stroke({ color: rainCol, width: i % 3 === 0 ? 1.35 : 0.95, alpha: (0.18 + (i % 5) * 0.06) * rainAmt, cap: 'round' });
      }
      // Spawn lively raindrop impact splashes right along the ocean waterline.
      if (horizonScreenY > 8 && horizonScreenY < cssH + 16) {
        const spawns = Math.min(4, Math.floor((rainAmt * 38) * dt + Math.random()));
        for (let k = 0; k < spawns; k++) {
          if (this.rainSplashes.length < 48) {
            this.rainSplashes.push({
              x: Math.random() * cssW,
              dy: (Math.random() - 0.4) * 8,
              life: 0,
              max: 0.34 + Math.random() * 0.22,
              size: 8 + Math.random() * 10,
            });
          }
        }
      }
    }
    const keptSplashes: RainSplash[] = [];
    for (const sp of this.rainSplashes) {
      sp.life += dt;
      if (sp.life >= sp.max) continue;
      const p = sp.life / sp.max;
      const sy = horizonScreenY + sp.dy;
      const alpha = (1 - p) * Math.max(0.25, rainAmt);
      // Expanding elliptical ripple ring on the ocean surface.
      spf.ellipse(sp.x, sy, 2 + sp.size * p, 0.8 + sp.size * 0.24 * p)
        .stroke({ color: 0xe6f8f4, width: 1.15 * (1 - p * 0.5), alpha: alpha * 0.72 });
      // Tiny bouncing crown-splash droplets during the first 45% of impact!
      if (p < 0.45) {
        const cp = p / 0.45;
        const hop = Math.sin(cp * Math.PI) * (5 + sp.size * 0.35);
        const spread = cp * (3 + sp.size * 0.35);
        spf.circle(sp.x - spread, sy - hop, 1.15).fill({ color: 0xf4fffc, alpha: (1 - cp) * 0.85 });
        spf.circle(sp.x + spread, sy - hop * 0.9, 1.15).fill({ color: 0xf4fffc, alpha: (1 - cp) * 0.85 });
        spf.circle(sp.x, sy - hop * 1.25, 1.0).fill({ color: 0xffffff, alpha: (1 - cp) * 0.75 });
      }
      keptSplashes.push(sp);
    }
    this.rainSplashes = keptSplashes;

    // 4. Articulated daytime coastal Seagulls (active during clear day & golden hour; shelter during heavy rain & night).
    const gullVis = clamp01(dayAmt + duskAmt * 0.72) * (1 - rainAmt * 0.9);
    this.gullLayer.visible = gullVis > 0.02;
    if (!this.gullLayer.visible) return;

    const gullTint = lerpRgb([255, 255, 255], [255, 212, 178], duskAmt * 0.75);
    const wrapW = Math.max(1600, viewW + 500);
    const leftBound = camX - 250;
    const rightBound = camX + viewW + 250;

    for (const g of this.gulls) {
      g.wx += g.vx * dt;
      // Keep the flock cycling smoothly across the player's coastal sky view.
      if (g.wx > rightBound) g.wx -= wrapW;
      else if (g.wx < leftBound) g.wx += wrapW;

      // Alternate between active flapping bursts and graceful soaring glides.
      const cycle = (time + g.glideCycle) % 6.2;
      const flapping = cycle < 2.8 ? 1 : 0;
      const flapMix = flapping ? smoothstep(0, 0.35, cycle) * (1 - smoothstep(2.4, 2.8, cycle)) : 0;
      const wingWave = Math.sin(time * g.flapRate + g.phase);
      const wingLag = Math.sin(time * g.flapRate + g.phase - 0.85);

      // Gentle soaring altitude wave + occasional swoop toward the waves.
      const swoop = Math.sin(time * 0.42 + g.swoopPhase) * 26 + Math.sin(time * 0.95 + g.phase) * 9;
      const wy = Math.min(-18, g.baseY + swoop - flapMix * wingWave * 3.5);

      const sx = (g.wx - camX) * zoom;
      const sy = (wy - camY) * zoom;
      const dir = g.vx >= 0 ? 1 : -1;
      const sc = g.scale * Math.max(0.55, Math.min(1.15, zoom * 0.95));

      g.root.position.set(sx, sy);
      g.root.scale.set(dir * sc, sc);
      g.root.alpha = gullVis * 0.94;
      g.root.rotation = Math.cos(time * 0.42 + g.swoopPhase) * 0.08 * dir;
      g.body.tint = gullTint;

      // Articulated 2-segment wing flap & glide kinematics!
      const nearAngle = -0.22 + (wingWave * 0.62 * flapMix) + (1 - flapMix) * (-0.12 + Math.sin(time * 1.4 + g.phase) * 0.06);
      const nearOuterAngle = (wingLag * 0.55 * flapMix) + (1 - flapMix) * 0.16;
      g.nearInner.rotation = nearAngle;
      g.nearOuter.rotation = nearOuterAngle;

      const farAngle = -0.34 + (wingWave * 0.56 * flapMix) + (1 - flapMix) * (-0.22 + Math.sin(time * 1.4 + g.phase) * 0.05);
      const farOuterAngle = (wingLag * 0.48 * flapMix) + (1 - flapMix) * 0.12;
      g.farInner.rotation = farAngle;
      g.farOuter.rotation = farOuterAngle;
    }
  }
}
