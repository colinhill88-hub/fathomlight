import { Graphics, Particle, ParticleContainer, Renderer, Texture } from 'pixi.js';
import { mulberry32 } from '../rng';

/**
 * "Marine snow": tiny specks drifting in the water. Each speck has its own
 * depth, so nearer ones look bigger, brighter and drift past faster.
 * ParticleContainer draws thousands of these in a single GPU call.
 */

interface Speck {
  p: Particle;
  depth: number; // 0 far .. 1 near
  vx: number;
  vy: number;
  phase: number;
}

export class MarineSnow {
  readonly view = new ParticleContainer({
    dynamicProperties: { position: true, alpha: true, vertex: false, rotation: false, uvs: false, color: false },
  });
  private specks: Speck[] = [];
  private texture: Texture | null = null;
  private width = 1;
  private height = 1;

  build(renderer: Renderer, density: number, width: number, height: number): void {
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
      });
    }
  }

  /** dt in seconds; drift is how many CSS pixels the view moved sideways. */
  update(dt: number, time: number, drift: number): void {
    const w = this.width + 20;
    const h = this.height + 20;
    for (const s of this.specks) {
      const p = s.p;
      p.x += (s.vx + Math.sin(time * 0.5 + s.phase) * 3) * dt - drift * (0.15 + s.depth * 0.6);
      p.y += s.vy * (0.4 + s.depth) * dt;
      if (p.x < -10) p.x += w;
      else if (p.x > w - 10) p.x -= w;
      if (p.y > h - 10) p.y -= h;
      p.alpha = (0.15 + s.depth * 0.45) * (0.75 + 0.25 * Math.sin(time * 1.3 + s.phase));
    }
  }
}
