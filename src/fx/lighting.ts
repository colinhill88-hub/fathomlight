import { Geometry, Mesh, Shader, Texture } from 'pixi.js';
import { FULLSCREEN_VERTEX, GLSL_COMMON } from './shared';
import { WORLD_H, WORLD_SPAN, WORLD_X0 } from '../world/terrain';

/**
 * Scene lighting. Everything solid (sand, rock, plants, the diver) is first
 * drawn flat into an off-screen picture. This shader then lights that
 * picture pixel by pixel and draws it to the screen:
 *
 *  - Sunlight that dims and turns blue with depth, blocked by rock above
 *    (read from the baked shadow map, so overhangs cast soft shadows).
 *  - Caustics: the rippling net of light that waves focus onto the seabed.
 *    Ultra splits them into red, green and blue for a faint rainbow edge.
 *  - Dynamic lights: the headlamp (a cone), the beacon, glowing fish and
 *    anemones (round). Each also lights up the water itself a little, so
 *    the headlamp beam is visible in the dark.
 *  - Water distortion: a gentle wobble, as if seen through moving water.
 *  - Depth fog that blends objects towards the water colour.
 *  - Ultra: the diver's soft shadow on the seabed below.
 */

export const MAX_LIGHTS = 12;

const fragment = /* glsl */ `
precision highp float;

in vec2 vUV;
out vec4 finalColor;

uniform sampler2D uScene;
uniform sampler2D uMask;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uCam;
uniform vec2 uView;
uniform vec2 uWorld;
uniform vec2 uOrigin;
uniform float uLightCount;
uniform vec4 uLightA[${MAX_LIGHTS}];
uniform vec4 uLightB[${MAX_LIGHTS}];
uniform vec4 uLightC[${MAX_LIGHTS}];
uniform vec4 uShadow;
uniform vec4 uFlags;

${GLSL_COMMON}

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

// Distance from the nearest cell edge in moving cellular noise. Thin bright
// lines where it is small make the caustic net.
float cellEdge(vec2 p, float t) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash2(i + g);
      o = 0.5 + 0.42 * sin(t + 6.2831 * o);
      float d = length(g + o - f);
      if (d < f1) { f2 = f1; f1 = d; }
      else if (d < f2) { f2 = d; }
    }
  }
  return f2 - f1;
}

float caustics(vec2 wp, float t) {
  vec2 p = wp / 72.0;
  p += vec2(sin(p.y * 0.7 + t * 0.4), cos(p.x * 0.6 + t * 0.3)) * 0.35;
  float a = 1.0 - smoothstep(0.0, 0.16, cellEdge(p, t * 0.9));
  float b = 1.0 - smoothstep(0.0, 0.2, cellEdge(p * 1.37 + 3.7, t * 1.15));
  return a * 0.55 + b * 0.35 + a * b * 0.7;
}

void main() {
  vec2 wp = uCam + vUV * uView;
  float d = wp.y;
  // 1 above the water (a head out at the surface), 0 below. Same wave as the water shader.
  float wave = sin(wp.x * 0.021 + uTime * 1.3) * 4.0 + sin(wp.x * 0.047 - uTime * 1.9) * 2.5 + sin(wp.x * 0.11 + uTime * 2.7) * 1.0;
  float air = smoothstep(wave + 1.0, wave - 1.0, d);

  // Water distortion: nudge where we read the picture by a pixel or so.
  vec2 wob = vec2(sin(wp.y * 0.05 + uTime * 1.6) + 0.5 * sin(wp.x * 0.031 - uTime * 1.1),
                  cos(wp.x * 0.043 + uTime * 1.3) + 0.5 * sin(wp.y * 0.027 + uTime * 0.9));
  vec2 uv = vUV + wob * (1.0 - air) * uFlags.y / uResolution;
  vec4 c = texture(uScene, uv);

  // Dynamic lights. A is position, radius, intensity; B colour and cone
  // width; C beam direction, cone softness and how much it lights the water.
  vec3 lit = vec3(0.0);
  vec3 haze = vec3(0.0);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (float(i) >= uLightCount) break;
    vec4 A = uLightA[i];
    vec4 B = uLightB[i];
    vec4 C = uLightC[i];
    vec2 to = wp - A.xy;
    float dist = length(to);
    float fall = clamp(1.0 - dist / A.z, 0.0, 1.0);
    fall *= fall;
    float cone = 1.0;
    if (B.w > -1.0) {
      float cosA = dot(to / max(dist, 0.001), C.xy);
      cone = smoothstep(B.w - C.z, B.w, cosA);
      // A little spill right next to the lamp so the diver's helmet catches it.
      cone = max(cone, smoothstep(40.0, 0.0, dist) * 0.6);
    }
    vec3 l = B.rgb * A.w * fall * cone;
    lit += l;
    haze += l * C.w;
  }

  vec3 outRgb = vec3(0.0);
  if (c.a > 0.003) {
    float vis = texture(uMask, clamp((wp - uOrigin) / uWorld, 0.0, 1.0)).r;
    vec3 sunCol = absorb(d);
    float shade = 1.0;
    if (uShadow.w > 0.0) {
      vec2 s = (wp - uShadow.xy) / vec2(uShadow.z, uShadow.z * 0.32);
      shade = 1.0 - uShadow.w * exp(-dot(s, s));
    }
    vec3 sun = sunCol * vis * shade * 1.04;
    vec3 ambient = sunCol * 0.2 + vec3(0.012, 0.028, 0.04);

    // Caustics, strongest in the shallows.
    float cK = uFlags.z * vis * shade * exp(-max(d, 0.0) / 430.0) * (1.0 - air);
    vec3 caus;
    if (uFlags.x > 0.5) {
      caus = vec3(caustics(wp + vec2(1.8, 0.6), uTime), caustics(wp, uTime), caustics(wp - vec2(1.8, 0.6), uTime));
    } else {
      caus = vec3(caustics(wp, uTime));
    }
    caus *= cK * sunCol;

    vec3 col = c.rgb * (sun * (1.0 + air * 0.15) + ambient + caus + lit * 1.1);

    // Depth fog pulls distant-looking colour towards the water. Our own
    // lights cut through it.
    float fog = (0.12 + 0.3 * smoothstep(300.0, 1150.0, d)) * (1.0 - clamp(dot(lit, vec3(0.33)), 0.0, 0.85));
    col = mix(col, waterColor(d) * mix(0.45, 1.0, vis) * c.a, fog * (1.0 - air * 0.8));
    outRgb = col;
  }

  // Light scattered by the water itself (visible beams), added on top.
  float dark = 1.0 - 0.75 * clamp(dot(absorb(d), vec3(0.33)), 0.0, 1.0);
  outRgb += haze * dark * (1.0 - c.a * 0.6) * (1.0 - air * 0.7);

  // Fine grain against banding.
  outRgb += (hash(vUV * uResolution + fract(uTime * 0.37)) - 0.5) / 255.0;

  // The output is "premultiplied": where nothing was drawn (alpha 0) the
  // haze simply adds light over the water behind.
  finalColor = vec4(max(outRgb, 0.0), c.a);
}
`;

export interface Light {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  color: [number, number, number];
  /** Cone lights only: direction (unit vector) and half-angle cosine. */
  dirX?: number;
  dirY?: number;
  coneCos?: number;
  coneSoft?: number;
  /** How much the light shows up in the water itself. */
  haze?: number;
}

export class Lighting {
  readonly view: Mesh<Geometry, Shader>;
  private readonly u: {
    uTime: number;
    uResolution: Float32Array;
    uCam: Float32Array;
    uView: Float32Array;
    uWorld: Float32Array;
    uOrigin: Float32Array;
    uLightCount: number;
    uLightA: Float32Array;
    uLightB: Float32Array;
    uLightC: Float32Array;
    uShadow: Float32Array;
    uFlags: Float32Array;
  };
  private readonly shader: Shader;

  constructor(scene: Texture, mask: Texture) {
    const geometry = new Geometry({
      attributes: { aPosition: [0, 0, 1, 0, 1, 1, 0, 1] },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    this.shader = Shader.from({
      gl: { vertex: FULLSCREEN_VERTEX, fragment, name: 'fathomlight-lighting' },
      resources: {
        lightUniforms: {
          uTime: { value: 0, type: 'f32' },
          uResolution: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
          uCam: { value: new Float32Array([0, 0]), type: 'vec2<f32>' },
          uView: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
          uWorld: { value: new Float32Array([WORLD_SPAN, WORLD_H]), type: 'vec2<f32>' },
          uOrigin: { value: new Float32Array([WORLD_X0, 0]), type: 'vec2<f32>' },
          uLightCount: { value: 0, type: 'f32' },
          uLightA: { value: new Float32Array(4 * MAX_LIGHTS), type: 'vec4<f32>', size: MAX_LIGHTS },
          uLightB: { value: new Float32Array(4 * MAX_LIGHTS), type: 'vec4<f32>', size: MAX_LIGHTS },
          uLightC: { value: new Float32Array(4 * MAX_LIGHTS), type: 'vec4<f32>', size: MAX_LIGHTS },
          uShadow: { value: new Float32Array(4), type: 'vec4<f32>' },
          uFlags: { value: new Float32Array([0, 1, 0.6, 0]), type: 'vec4<f32>' },
        },
        uScene: scene.source,
        uMask: mask.source,
      },
    });
    this.u = this.shader.resources.lightUniforms.uniforms;
    this.view = new Mesh({ geometry, shader: this.shader });
  }

  update(opts: {
    time: number;
    camX: number;
    camY: number;
    viewW: number;
    viewH: number;
    cssW: number;
    cssH: number;
    lights: Light[];
    maxLights: number;
    chromatic: boolean;
    shadow: [number, number, number, number] | null;
  }): void {
    const u = this.u;
    u.uTime = opts.time;
    u.uCam[0] = opts.camX;
    u.uCam[1] = opts.camY;
    u.uView[0] = opts.viewW;
    u.uView[1] = opts.viewH;
    u.uResolution[0] = opts.cssW;
    u.uResolution[1] = opts.cssH;
    u.uFlags[0] = opts.chromatic ? 1 : 0;
    u.uFlags[1] = 1.1; // distortion, in CSS pixels
    u.uFlags[2] = 0.75; // caustic strength
    if (opts.shadow) u.uShadow.set(opts.shadow);
    else u.uShadow[3] = 0;

    // Keep the lights that matter most on screen: skip ones too far away,
    // then keep the brightest up to the preset's limit.
    const cx = opts.camX + opts.viewW / 2;
    const cy = opts.camY + opts.viewH / 2;
    const reach = Math.hypot(opts.viewW, opts.viewH) / 2;
    const visible = opts.lights
      .filter((l) => l.intensity > 0.01 && Math.hypot(l.x - cx, l.y - cy) < reach + l.radius)
      .sort((a, b) => b.intensity * b.radius - a.intensity * a.radius)
      .slice(0, Math.min(opts.maxLights, MAX_LIGHTS));
    visible.forEach((l, i) => {
      u.uLightA.set([l.x, l.y, l.radius, l.intensity], i * 4);
      u.uLightB.set([l.color[0], l.color[1], l.color[2], l.coneCos ?? -2], i * 4);
      u.uLightC.set([l.dirX ?? 0, l.dirY ?? 0, l.coneSoft ?? 0.1, l.haze ?? 0.1], i * 4);
    });
    u.uLightCount = visible.length;
  }

  setScene(scene: Texture): void {
    this.shader.resources.uScene = scene.source;
  }
}
