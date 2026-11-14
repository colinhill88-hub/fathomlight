import { Container, Graphics } from 'pixi.js';
import { mulberry32 } from '../rng';
import { waterColor } from '../fx/shared';

/**
 * Layers of distant rock behind the play area. Far layers move less than
 * near ones as the camera moves (parallax), both sideways and up and down,
 * and are tinted towards the water colour at the camera's depth, which is
 * what makes them read as far away (depth fog). The tint is recalculated
 * every frame, so the ridges darken as you dive deeper.
 *
 * The ridges are built from sine waves with whole-number frequencies, so each
 * strip repeats seamlessly and can be tiled forever.
 */

const ROCK: [number, number, number] = [0.1, 0.24, 0.28];
const PERIOD = 2600;
/** Camera depth at which the layers sit where they were drawn. */
const REF_DEPTH = 260;

interface Layer {
  strip: Container;
  parallax: number;
  strength: number; // 0 = pure fog colour, 1 = full rock colour
}

/** A repeating ridge line: returns height offsets for x in [0, period). */
function ridge(seed: number, roughness: number): (x: number) => number {
  const rand = mulberry32(seed);
  const waves = Array.from({ length: 7 }, (_, i) => ({
    freq: 1 + i * 2 + Math.floor(rand() * 2),
    amp: (1 / (1 + i * roughness)) * (0.6 + rand() * 0.8),
    phase: rand() * Math.PI * 2,
  }));
  const norm = waves.reduce((s, w) => s + w.amp, 0);
  return (x) => {
    let h = 0;
    for (const w of waves) h += Math.sin((x / PERIOD) * Math.PI * 2 * w.freq + w.phase) * w.amp;
    return h / norm;
  };
}

function toHex([r, g, b]: [number, number, number]): number {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return (c(r) << 16) | (c(g) << 8) | c(b);
}

export class Backdrop {
  readonly view = new Container();
  private layers: Layer[] = [];

  build(layerCount: number): void {
    this.view.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.layers = [];
    const step = 10;
    for (let i = 0; i < layerCount; i++) {
      const t = layerCount === 1 ? 1 : i / (layerCount - 1); // 0 = farthest
      const base = 330 + t * 110;
      const amp = 90 + t * 60;
      const shape = ridge(1000 + i * 77, 0.8 + t * 0.6);
      const strip = new Container();
      for (let k = 0; k < 3; k++) {
        const g = new Graphics();
        g.moveTo(0, 2400);
        for (let x = 0; x <= PERIOD; x += step) g.lineTo(x, base - shape(x) * amp);
        g.lineTo(PERIOD, 2400).closePath().fill({ color: 0xffffff });
        g.x = k * PERIOD;
        strip.addChild(g);
      }
      this.view.addChild(strip);
      this.layers.push({ strip, parallax: 0.12 + t * 0.33, strength: 0.22 + t * 0.5 });
    }
  }

  /** Camera centre in world units, zoom = CSS px per world unit. */
  update(camCX: number, camCY: number, zoom: number, cssW: number, cssH: number): void {
    for (const l of this.layers) {
      const p = l.parallax;
      const ox = (camCX * p) % PERIOD;
      const oy = REF_DEPTH + (camCY - REF_DEPTH) * p;
      l.strip.scale.set(zoom);
      l.strip.position.set(cssW / 2 - (ox + PERIOD) * zoom, cssH / 2 - oy * zoom);
      // Fog: the ridge takes the water colour at the depth we are looking at.
      const fog = waterColor(camCY + 80);
      const c: [number, number, number] = [
        fog[0] + (ROCK[0] * (fog[2] * 2.2) - fog[0]) * l.strength,
        fog[1] + (ROCK[1] * (fog[2] * 2.2) - fog[1]) * l.strength,
        fog[2] + (ROCK[2] * (fog[2] * 2.2) - fog[2]) * l.strength,
      ];
      for (const g of l.strip.children) (g as Graphics).tint = toHex(c);
    }
  }
}
