import { Color, Container, Graphics } from 'pixi.js';
import { mulberry32 } from '../rng';

/**
 * Layers of distant rock and the sandy seabed. Far layers move slower than
 * near ones when the view drifts sideways (parallax), and are tinted towards
 * the water colour, which is what makes them read as far away (depth fog).
 *
 * The ridges are built from sine waves with whole-number frequencies, so each
 * strip repeats seamlessly and can be tiled forever.
 */

const FOG = new Color('#3f8086');
const ROCK = new Color('#1d4952');
const SAND = new Color('#cdbb8f');
const SAND_SHADOW = new Color('#a8996f');

function mix(a: Color, b: Color, t: number): number {
  const [ar, ag, ab] = a.toRgbArray();
  const [br, bg, bb] = b.toRgbArray();
  return new Color([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]).toNumber();
}

interface Layer {
  strip: Container;
  speed: number;
  period: number;
}

/** A repeating ridge line: returns height offsets for x in [0, period). */
function ridge(seed: number, roughness: number): (x: number, period: number) => number {
  const rand = mulberry32(seed);
  const waves = Array.from({ length: 7 }, (_, i) => ({
    freq: 1 + i * 2 + Math.floor(rand() * 2),
    amp: (1 / (1 + i * roughness)) * (0.6 + rand() * 0.8),
    phase: rand() * Math.PI * 2,
  }));
  const norm = waves.reduce((s, w) => s + w.amp, 0);
  return (x, period) => {
    let h = 0;
    for (const w of waves) h += Math.sin((x / period) * Math.PI * 2 * w.freq + w.phase) * w.amp;
    return h / norm;
  };
}

export class Backdrop {
  readonly view = new Container();
  private layers: Layer[] = [];

  build(layerCount: number, width: number, height: number): void {
    this.view.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.layers = [];

    const period = Math.max(width, 900) * 1.6;
    const step = Math.max(8, Math.round(period / 240));

    // Rock layers, far to near.
    for (let i = 0; i < layerCount; i++) {
      const t = layerCount === 1 ? 1 : i / (layerCount - 1); // 0 = farthest
      const base = height * (0.52 + t * 0.2);
      const amp = height * (0.1 + t * 0.06);
      const color = mix(FOG, ROCK, 0.25 + t * 0.55);
      const shape = ridge(1000 + i * 77, 0.8 + t * 0.6);
      this.addLayer(period, 0.08 + t * 0.35, (g) => {
        g.moveTo(0, height);
        for (let x = 0; x <= period; x += step) g.lineTo(x, base - shape(x, period) * amp);
        g.lineTo(period, height).closePath().fill({ color });
      });
    }

    // Seabed sand, nearest of all.
    const sandTop = height * 0.84;
    const dune = ridge(4242, 1.4);
    const ripple = ridge(4343, 2.0);
    this.addLayer(period, 0.6, (g) => {
      g.moveTo(0, height);
      for (let x = 0; x <= period; x += step) g.lineTo(x, sandTop - dune(x, period) * height * 0.035);
      g.lineTo(period, height).closePath().fill({ color: SAND.toNumber() });
      // A darker band of soft shadow lower on the sand.
      g.moveTo(0, height);
      for (let x = 0; x <= period; x += step)
        g.lineTo(x, sandTop + height * 0.07 - ripple(x, period) * height * 0.02);
      g.lineTo(period, height).closePath().fill({ color: SAND_SHADOW.toNumber(), alpha: 0.45 });
    });
  }

  private addLayer(period: number, speed: number, draw: (g: Graphics) => void): void {
    const strip = new Container();
    for (let k = 0; k < 3; k++) {
      const g = new Graphics();
      draw(g);
      g.x = k * period;
      strip.addChild(g);
    }
    this.view.addChild(strip);
    this.layers.push({ strip, speed, period });
  }

  /** scroll is how far the view has drifted sideways, in CSS pixels. */
  update(scroll: number): void {
    for (const l of this.layers) {
      const offset = (scroll * l.speed) % l.period;
      l.strip.x = -offset;
    }
  }
}
