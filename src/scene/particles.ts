import { Graphics, Particle, ParticleContainer, Renderer, Texture } from 'pixi.js';
import { mulberry32 } from '../rng';

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
  update(dt: number, time: number, driftX: number, driftY: number, fade: number, lamps: SnowLight[] = []): void {
    const w = this.width + 20;
    const h = this.height + 20;
    for (const s of this.specks) {
      const p = s.p;
      const par = s.par;
      p.x += (s.vx + Math.sin(time * 0.5 + s.phase) * 3) * dt - driftX * par;
      p.y += s.vy * (0.4 + s.depth) * dt - driftY * par;
      if (p.x < -10) p.x += w;
      else if (p.x > w - 10) p.x -= w;
      if (p.y > h - 10) p.y -= h;
      else if (p.y < -10) p.y += h;
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
      p.alpha = Math.min(1, s.base * (0.75 + 0.25 * Math.sin(time * 1.3 + s.phase)) * fade * (1 + lit * (s.bokeh ? 2.5 : 5)));
      p.tint = lit > 0.04 ? 0xfff0c8 : 0xffffff;
    }
  }
}
