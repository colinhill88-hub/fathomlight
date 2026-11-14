import { Graphics, Particle, ParticleContainer, Renderer, Texture } from 'pixi.js';
import { mulberry32 } from '../rng';

/**
 * Air bubbles from the diver's helmet. They come out in little bursts with
 * each breath, wobble as they rise, grow slightly and vanish at the surface.
 */

interface Bubble {
  p: Particle;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  alive: boolean;
}

const rand = mulberry32(0xb0bb);

export class Bubbles {
  readonly view = new ParticleContainer({
    dynamicProperties: { position: true, vertex: true, alpha: true, rotation: false, uvs: false, color: false },
  });
  private pool: Bubble[] = [];
  private texture: Texture;
  private breath = 0;

  constructor(renderer: Renderer) {
    const g = new Graphics();
    g.circle(16, 16, 14).fill({ color: 0xffffff, alpha: 0.12 });
    g.circle(16, 16, 14).stroke({ color: 0xffffff, alpha: 0.75, width: 2 });
    g.circle(11, 10, 3.5).fill({ color: 0xffffff, alpha: 0.9 });
    this.texture = renderer.generateTexture({ target: g, resolution: 2 });
    g.destroy();
  }

  private spawn(x: number, y: number, vx: number, vy: number): void {
    let b = this.pool.find((q) => !q.alive);
    if (!b) {
      const p = new Particle({ texture: this.texture, anchorX: 0.5, anchorY: 0.5 });
      b = { p, vx: 0, vy: 0, size: 1, phase: 0, alive: false };
      this.pool.push(b);
      this.view.addParticle(p);
    }
    b.alive = true;
    b.p.x = x + (rand() - 0.5) * 6;
    b.p.y = y + (rand() - 0.5) * 6;
    b.vx = vx * 0.3 + (rand() - 0.5) * 20;
    b.vy = vy * 0.3 - 20 - rand() * 30;
    b.size = 0.12 + rand() * 0.28;
    b.phase = rand() * 6;
    b.p.alpha = 0.9;
  }

  /** emitX/Y is the helmet valve; boosting makes the diver breathe harder. */
  update(dt: number, emitX: number, emitY: number, diverVX: number, diverVY: number, hard: boolean): void {
    this.breath -= dt * (hard ? 2.2 : 1);
    if (this.breath <= 0) {
      this.breath = 2.4 + rand() * 1.2;
      const n = 4 + Math.floor(rand() * 4);
      for (let i = 0; i < n; i++) this.spawn(emitX, emitY - i * 5, diverVX, diverVY);
    }
    for (const b of this.pool) {
      if (!b.alive) continue;
      const p = b.p;
      b.phase += dt * 6;
      b.vy = Math.max(b.vy - 90 * dt, -170 + b.size * 100);
      b.vx *= 1 - dt * 2;
      p.x += (b.vx + Math.sin(b.phase) * 22) * dt;
      p.y += b.vy * dt;
      b.size = Math.min(0.55, b.size + dt * 0.02);
      p.scaleX = b.size * (1 + Math.sin(b.phase * 1.3) * 0.08);
      p.scaleY = b.size * (1 - Math.sin(b.phase * 1.3) * 0.08);
      if (p.y < 6) {
        b.alive = false;
        p.alpha = 0;
      }
    }
  }
}
