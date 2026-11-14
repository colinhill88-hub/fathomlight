import { Geometry, Mesh, Shader } from 'pixi.js';

/**
 * The water itself: one rectangle covering the screen, coloured by a custom
 * GPU shader (a tiny program that runs once per pixel, every frame).
 *
 * Milestone 0 draws only the depth gradient, soft light shafts from the
 * surface and a faint shimmer, as proof that custom shaders work on the
 * phone. Caustics, distortion and proper lighting arrive in milestone 1.
 */

const vertex = /* glsl */ `
in vec2 aPosition;
out vec2 vUV;

void main() {
  vUV = aPosition;
  // aPosition runs 0..1; turn it into the -1..1 range the GPU expects (y flipped).
  gl_Position = vec4(aPosition.x * 2.0 - 1.0, 1.0 - aPosition.y * 2.0, 0.0, 1.0);
}
`;

const fragment = /* glsl */ `
precision highp float;

in vec2 vUV;
out vec4 finalColor;

uniform float uTime;
uniform vec2 uResolution;
uniform float uScroll;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 uv = vUV;
  float aspect = uResolution.x / max(uResolution.y, 1.0);

  // Depth gradient: pale sunlit teal at the surface to deep blue-green below.
  vec3 surface = vec3(0.66, 0.82, 0.78);
  vec3 mid     = vec3(0.24, 0.52, 0.54);
  vec3 deep    = vec3(0.07, 0.23, 0.29);
  vec3 col = mix(surface, mid, smoothstep(0.0, 0.45, uv.y));
  col = mix(col, deep, smoothstep(0.35, 1.05, uv.y));

  // Light shafts: slanted bands that sway slowly and fade with depth.
  float x = (uv.x * aspect + uScroll * 0.15) + uv.y * 0.45;
  float shafts = 0.0;
  shafts += pow(0.5 + 0.5 * sin(x * 5.0 + uTime * 0.15), 6.0) * 0.55;
  shafts += pow(0.5 + 0.5 * sin(x * 8.3 - uTime * 0.11 + 1.7), 8.0) * 0.40;
  shafts += pow(0.5 + 0.5 * sin(x * 13.1 + uTime * 0.07 + 4.1), 10.0) * 0.25;
  shafts *= 0.6 + 0.4 * noise(vec2(x * 3.0, uTime * 0.2));
  shafts *= pow(1.0 - clamp(uv.y, 0.0, 1.0), 1.6);
  col += vec3(0.75, 0.92, 0.88) * shafts * 0.22;

  // Faint glow right under the surface.
  col += vec3(0.8, 0.95, 0.9) * pow(1.0 - uv.y, 6.0) * 0.12;

  // Slow murk so the water never looks like a flat gradient.
  float murk = noise(vec2(uv.x * aspect * 2.0 + uTime * 0.02 + uScroll * 0.05, uv.y * 2.0 - uTime * 0.01));
  col *= 0.94 + 0.08 * murk;

  // Tiny per-pixel noise hides colour banding on smooth gradients.
  col += (hash(uv * uResolution + fract(uTime)) - 0.5) / 255.0;

  finalColor = vec4(col, 1.0);
}
`;

export class Water {
  readonly view: Mesh<Geometry, Shader>;
  private readonly uniforms: { uTime: number; uResolution: Float32Array; uScroll: number };

  constructor() {
    const geometry = new Geometry({
      attributes: { aPosition: [0, 0, 1, 0, 1, 1, 0, 1] },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });

    const shader = Shader.from({
      gl: { vertex, fragment, name: 'fathomlight-water' },
      resources: {
        waterUniforms: {
          uTime: { value: 0, type: 'f32' },
          uResolution: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
          uScroll: { value: 0, type: 'f32' },
        },
      },
    });

    this.uniforms = shader.resources.waterUniforms.uniforms;
    this.view = new Mesh({ geometry, shader });
  }

  update(timeSeconds: number, scroll: number, widthPx: number, heightPx: number): void {
    this.uniforms.uTime = timeSeconds;
    this.uniforms.uScroll = scroll;
    this.uniforms.uResolution[0] = widthPx;
    this.uniforms.uResolution[1] = heightPx;
  }
}
