const IMPACTS = 4;
const DURATION = 2.6;
const CREST_SPEED = 139;
const IMPACT_DRIFT = 31;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const fract = (v: number) => v - Math.floor(v);

/**
 * Shared coastal weather clock (used identically on CPU and GPU):
 * Two out-of-phase cycles (4.5m rain, 3.6m wind) naturally produce clear skies,
 * breezy windy days with big rolling waves, calm showers, and Wind+Rain storms!
 */
export function weatherAt(time: number): { rain: number; overcast: number; wind: number } {
  const rPhase = fract(time / 270 + 0.15);
  const rain = smoothstep(0.64, 0.72, rPhase) * (1 - smoothstep(0.90, 0.98, rPhase));
  const overcast = smoothstep(0.56, 0.70, rPhase) * (1 - smoothstep(0.92, 1.0, rPhase));
  const wPhase = fract(time / 215 + 0.42);
  const gust = smoothstep(0.55, 0.67, wPhase) * (1 - smoothstep(0.86, 0.96, wPhase));
  const wind = clamp01(gust + rain * 0.25);
  return { rain, overcast, wind };
}

/** Base ocean wave height at world X & time (excluding localized splash impacts). */
export function baseWaveHeight(x: number, time: number): number {
  const { wind } = weatherAt(time);
  const calm = Math.sin(x * 0.021 + time * 1.3) * 3.7 + Math.sin(x * 0.047 - time * 1.9) * 1.35
    + Math.sin(x * 0.009 - time * 0.94 + Math.sin(x * 0.013 + time * 0.41) * 0.6) * 2.8;
  const swell = wind * (
    Math.sin(x * 0.0115 - time * 2.15) * 11.5
    + Math.sin(x * 0.026 - time * 3.1 + Math.sin(x * 0.007 - time * 0.8) * 1.1) * 5.8
    + Math.sin(x * 0.058 - time * 4.4) * 2.4
  );
  return calm + swell;
}

/** Packed (position, age, strength, horizontal bias). The shader and drawn waterline share the wave equation. */
export class SurfaceMotion {
  readonly data = new Float32Array(IMPACTS * 4);
  private next = 0;

  strike(x: number, strength: number, vx: number): void {
    this.data.set([x, 0, strength, Math.max(-1, Math.min(1, vx / 250))], this.next * 4);
    this.next = (this.next + 1) % IMPACTS;
  }

  update(dt: number): void {
    for (let i = 0; i < this.data.length; i += 4) {
      if (!this.data[i + 2]) continue;
      this.data[i + 1] += dt;
      if (this.data[i + 1] > DURATION) this.data[i + 2] = 0;
    }
  }

  reset(): void { this.data.fill(0); }

  crestX(slot: number, side: number): number {
    const age = this.data[slot + 1];
    return this.data[slot] + (this.data[slot + 3] * IMPACT_DRIFT + side * CREST_SPEED) * age;
  }

  height(x: number, time: number): number {
    let y = baseWaveHeight(x, time);
    for (let i = 0; i < this.data.length; i += 4) {
      const strength = this.data[i + 2];
      if (!strength) continue;
      const age = this.data[i + 1];
      const dx = x - this.data[i] - this.data[i + 3] * age * IMPACT_DRIFT;
      const d = Math.abs(dx) - age * CREST_SPEED;
      if (Math.abs(d) > 125) continue;
      y += Math.cos(d * 0.12) * Math.exp(-Math.abs(d) / 34 - age * 1.37) * strength * 20;
    }
    return y;
  }
}

export const GLSL_SURFACE_MOTION = /* glsl */ `
uniform float uLivingWater;
uniform vec4 uImpacts[${IMPACTS}];

float weatherRain(float t) {
  float rPhase = fract(t / 270.0 + 0.15);
  return smoothstep(0.64, 0.72, rPhase) * (1.0 - smoothstep(0.90, 0.98, rPhase));
}

float weatherOvercast(float t) {
  float rPhase = fract(t / 270.0 + 0.15);
  return smoothstep(0.56, 0.70, rPhase) * (1.0 - smoothstep(0.92, 1.0, rPhase));
}

float weatherWind(float t) {
  float wPhase = fract(t / 215.0 + 0.42);
  float gust = smoothstep(0.55, 0.67, wPhase) * (1.0 - smoothstep(0.86, 0.96, wPhase));
  return clamp(gust + weatherRain(t) * 0.25, 0.0, 1.0);
}

float waterline(float x, float t) {
  float wind = weatherWind(t);
  float swell = wind * (
    sin(x * 0.0115 - t * 2.15) * 11.5
    + sin(x * 0.026 - t * 3.1 + sin(x * 0.007 - t * 0.8) * 1.1) * 5.8
    + sin(x * 0.058 - t * 4.4) * 2.4
  );
  if (uLivingWater < 0.5) return sin(x * 0.021 + t * 1.3) * 4.0 + sin(x * 0.047 - t * 1.9) * 2.5 + sin(x * 0.11 + t * 2.7) * 1.0 + swell;
  float y = sin(x * 0.021 + t * 1.3) * 3.7 + sin(x * 0.047 - t * 1.9) * 1.35
    + sin(x * 0.009 - t * 0.94 + sin(x * 0.013 + t * 0.41) * 0.6) * 2.8 + swell;
  for (int i = 0; i < ${IMPACTS}; i++) {
    vec4 p = uImpacts[i];
    if (p.z <= 0.0) continue;
    float d = abs(x - p.x - p.w * p.y * ${IMPACT_DRIFT}.0) - p.y * ${CREST_SPEED}.0;
    if (abs(d) > 125.0) continue;
    y += cos(d * 0.12) * exp(-abs(d) / 34.0 - p.y * 1.37) * p.z * 20.0;
  }
  return y;
}
`;
