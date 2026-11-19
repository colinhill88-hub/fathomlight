import { Graphics, Particle, ParticleContainer, Renderer, Texture } from 'pixi.js';
import { mulberry32 } from '../rng';
import { isWaterAir, type FlowSample, type WaterMotion } from './waterMotion';

/**
 * "Marine snow": tiny specks drifting in the water. Each speck has its own
 * depth, so nearer ones look bigger, brighter and drift past faster.
 * ParticleContainer draws thousands of these in a single GPU call.
 */

/** A light that specks can catch, in screen pixels. cone is the half-angle cosine (-2 = round). */
export interface SnowLight {
  x: number;
  y: number;
  r: number;
  k: number;
  dirX: number;
  dirY: number;
  cone: number;
}

interface Speck {
  p: Particle;
  depth: number; // 0 far .. 1 near
  vx: number;
  vy: number;
  phase: number;
  /** Resting alpha, and how fast it streams past (bigger = nearer). */
  base: number;
  par: number;
  bokeh: boolean;
}

export class MarineSnow {
  readonly view = new ParticleContainer({
    dynamicProperties: { position: true, alpha: true, vertex: false, rotation: false, uvs: false, color: true },
  });
  private specks: Speck[] = [];
  private texture: Texture | null = null;
  private width = 1;
  private height = 1;
  private readonly motionGrid: FlowSample[] = Array.from({ length: 48 }, () => ({ x: 0, y: 0, silt: 0, energy: 0 }));
  private readonly flow = { x: 0, y: 0, silt: 0, energy: 0 };

  private flowAt(x: number, y: number): FlowSample {
    const gx = Math.max(0, Math.min(7, x * 8 / this.width - 0.5));
    const gy = Math.max(0, Math.min(5, y * 6 / this.height - 0.5));
    const col = Math.min(6, Math.floor(gx)), row = Math.min(4, Math.floor(gy));
    const i = row * 8 + col;
    const tx = gx - col, ty = gy - row;
    const a = this.motionGrid[i], b = this.motionGrid[i + 1], c = this.motionGrid[i + 8], d = this.motionGrid[i + 9];
    const wa = (1 - tx) * (1 - ty), wb = tx * (1 - ty), wc = (1 - tx) * ty, wd = tx * ty;
    this.flow.x = a.x * wa + b.x * wb + c.x * wc + d.x * wd;
    this.flow.y = a.y * wa + b.y * wb + c.y * wc + d.y * wd;
    this.flow.silt = a.silt * wa + b.silt * wb + c.silt * wc + d.silt * wd;
    this.flow.energy = a.energy * wa + b.energy * wb + c.energy * wc + d.energy * wd;
    return this.flow;
  }

  build(renderer: Renderer, density: number, width: number, height: number, bokeh = 0): void {
    if (!this.texture) {
      // A soft round dot, drawn once and reused by every speck.
      const g = new Graphics();
      for (let r = 8; r >= 1; r--) g.circle(8, 8, r).fill({ color: 0xffffff, alpha: 0.12 + (8 - r) * 0.02 });
      this.texture = renderer.generateTexture({ target: g, resolution: 2 });
      g.destroy();
    }

    this.view.removeParticles();
    this.specks = [];
    this.width = width;
    this.height = height;

    const count = Math.round((density * width * height) / 1_000_000);
    const rand = mulberry32(777);
    for (let i = 0; i < count; i++) {
      const depth = rand();
      const scale = 0.12 + depth * depth * 0.45;
      const p = new Particle({
        texture: this.texture,
        x: rand() * width,
        y: rand() * height,
        scaleX: scale,
        scaleY: scale,
        anchorX: 0.5,
        anchorY: 0.5,
        alpha: 0.15 + depth * 0.45,
      });
      this.view.addParticle(p);
      this.specks.push({
        p,
        depth,
        vx: (rand() - 0.5) * 4,
        vy: 2 + rand() * 6,
        phase: rand() * Math.PI * 2,
        base: 0.15 + depth * 0.45,
        par: 0.3 + depth * 0.9,
        bokeh: false,
      });
    }
    // G3: a sparse near layer of big, soft, out-of-focus specks that slide past faster than the rest.
    for (let i = 0; i < bokeh; i++) {
      const scale = 1.1 + rand() * 1.6;
      const p = new Particle({ texture: this.texture, x: rand() * width, y: rand() * height, scaleX: scale, scaleY: scale, anchorX: 0.5, anchorY: 0.5, alpha: 0.06 });
      this.view.addParticle(p);
      this.specks.push({ p, depth: 1.2, vx: (rand() - 0.5) * 6, vy: 3 + rand() * 6, phase: rand() * Math.PI * 2, base: 0.05 + rand() * 0.05, par: 1.5 + rand() * 0.6, bokeh: true });
    }
  }

  /**
   * dt in seconds; driftX/Y is how many CSS pixels the camera moved this
   * frame, so near specks stream past faster than far ones. `fade` dims the
   * specks in the dark depths.
   */
  update(dt: number, time: number, driftX: number, driftY: number, fade: number, lamps: SnowLight[] = [], motion?: WaterMotion, camX = 0, camY = 0, zoom = 1): void {
    const w = this.width + 20;
    const h = this.height + 20;
    if (motion) {
      for (let i = 0; i < this.motionGrid.length; i++) {
        motion.sample(camX + ((i % 8 + 0.5) * this.width) / (8 * zoom), camY + ((Math.floor(i / 8) + 0.5) * this.height) / (6 * zoom), this.motionGrid[i]);
      }
    }
    for (const s of this.specks) {
      const p = s.p;
      const par = s.par;
      const flow = motion ? this.flowAt(p.x, p.y) : undefined;
      p.x += (s.vx + Math.sin(time * 0.5 + s.phase) * 3 + (flow?.x ?? 0) * zoom * par) * dt - driftX * par;
      p.y += (s.vy * (flow ? 0.3 + s.depth * 0.75 : 0.4 + s.depth) + (flow?.y ?? 0) * zoom * par) * dt - driftY * par;
      if (p.x < -10) p.x += w;
      else if (p.x > w - 10) p.x -= w;
      if (p.y > h - 10) p.y -= h;
      else if (p.y < -10) p.y += h;
      const wx = camX + p.x / zoom;
      const wy = camY + p.y / zoom;
      if (flow && isWaterAir(wx, wy)) { p.alpha = 0; continue; }
      // G3: specks inside a lamp's light catch it: brighter and warm.
      let lit = 0;
      for (const l of lamps) {
        const dx = p.x - l.x;
        const dy = p.y - l.y;
        const d = Math.hypot(dx, dy);
        if (d >= l.r) continue;
        let k = 1 - d / l.r;
        k *= k;
        if (l.cone > -1) k *= Math.max(0, Math.min(1, (((dx * l.dirX + dy * l.dirY) / Math.max(d, 1)) - l.cone) / 0.12));
        lit += k * l.k;
      }
      lit = Math.min(1.5, lit);
      // Slow sediment ribbons amongst sparse fast near motes. Sanctum water is much clearer.
      const band = flow ? (0.55 + 0.36 * Math.sin(wx * 0.005 + wy * 0.014 + time * 0.28 + s.depth * 2.2) + flow.silt * 0.66) : 1;
      const density = flow && flow.energy < 0.12 ? 0.55 : 1;
      p.alpha = Math.min(1, s.base * (0.75 + 0.25 * Math.sin(time * 1.3 + s.phase)) * fade * band * density * (1 + lit * (s.bokeh ? 2.5 : 5)));
      p.tint = lit > 0.04 ? 0xfff0c8 : flow ? (flow.silt > 0.51 ? 0xb5a590 : 0xb4d7db) : 0xffffff;
    }
  }
}
