/**
 * Shader code shared by the water and the lighting, so the open water and
 * the fog on objects always agree about what colour the water is at a depth.
 * There is a TypeScript twin of `waterColor` for tinting the distant rocks.
 */

export const GLSL_COMMON = /* glsl */ `
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

// Water colour at a depth (world units, 75 per metre). Warm tones fade first,
// so it goes from pale sunlit teal to blue-green to blue-black.
vec3 waterColor(float d) {
  vec3 c0 = vec3(0.64, 0.82, 0.78);
  vec3 c1 = vec3(0.25, 0.53, 0.55);
  vec3 c2 = vec3(0.08, 0.26, 0.33);
  vec3 c3 = vec3(0.025, 0.10, 0.16);
  vec3 c = mix(c0, c1, smoothstep(0.0, 380.0, d));
  c = mix(c, c2, smoothstep(250.0, 800.0, d));
  c = mix(c, c3, smoothstep(700.0, 1250.0, d));
  return c;
}

// How much sunlight of each colour survives down to a depth.
vec3 absorb(float d) {
  return exp(-max(d, 0.0) * vec3(0.00095, 0.00036, 0.00026));
}
`;

const stops: [number, number, number][] = [
  [0.64, 0.82, 0.78],
  [0.25, 0.53, 0.55],
  [0.08, 0.26, 0.33],
  [0.025, 0.1, 0.16],
];

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function mix3(a: number[], b: number[], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** TypeScript copy of the shader's waterColor. Returns r, g, b in 0..1. */
export function waterColor(d: number): [number, number, number] {
  let c = mix3(stops[0], stops[1], smoothstep(0, 380, d));
  c = mix3(c, stops[2], smoothstep(250, 800, d));
  c = mix3(c, stops[3], smoothstep(700, 1250, d));
  return c;
}

/** A full-screen rectangle; the shaders map it straight onto the screen. */
export const FULLSCREEN_VERTEX = /* glsl */ `
in vec2 aPosition;
out vec2 vUV;

void main() {
  vUV = aPosition;
  gl_Position = vec4(aPosition.x * 2.0 - 1.0, 1.0 - aPosition.y * 2.0, 0.0, 1.0);
}
`;
