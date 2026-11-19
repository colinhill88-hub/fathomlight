import { GLSL_SURFACE_MOTION, type SurfaceMotion } from './surfaceMotion';
import { Geometry, Mesh, Shader, Texture } from 'pixi.js';
import { RT_VERTEX, GLSL_COMMON } from './shared';
import { AIR_POCKETS, WORLD_H, WORLD_SPAN, WORLD_X0 } from '../world/terrain';

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
export const MAX_CONTACTS = 12;

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
uniform float uShadowCount;  // the first this many lights cast shadows (G2)
uniform vec4 uShadowCfg;     // march steps, rock softness (world units), relief strength, 1 = wide relief taps
uniform vec4 uMat;           // G4: grime strength, metal sheen strength
uniform float uContactCount;
uniform vec4 uContact[${MAX_CONTACTS}]; // x, y, radius, strength: soft ellipses where things meet the seabed
uniform vec4 uFlags;

${GLSL_COMMON}
${GLSL_SURFACE_MOTION}

uniform vec4 uWaterLocal;
uniform vec2 uWaterFlow;

bool inDryPocket(vec2 wp) {
  ${AIR_POCKETS.map(({ shape: s, waterY }) => `
  if (wp.y < ${waterY.toFixed(1)} && length((wp - vec2(${s.x.toFixed(1)}, ${s.y.toFixed(1)})) / vec2(${s.rx.toFixed(1)}, ${s.ry.toFixed(1)})) < 0.97) return true;`).join('')}
  return false;
}

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
  if (uLivingWater > 0.5) {
    p += vec2(sin(p.y * 0.42 + p.x * 0.26 - t * 0.58) * 0.49, cos(p.x * 0.53 + t * 0.41) * 0.31)
      + uWaterFlow * (sin(t * 0.29) / 105.0);
    t += sin(p.x * 0.38 - p.y * 0.29 + t * 0.29) * 0.73;
  }
  p += vec2(sin(p.y * 0.7 + t * 0.4), cos(p.x * 0.6 + t * 0.3)) * 0.35;
  float a = 1.0 - smoothstep(0.0, 0.16, cellEdge(p, t * 0.9));
  float b = 1.0 - smoothstep(0.0, 0.2, cellEdge(p * 1.37 + 3.7, t * 1.15));
  return a * 0.55 + b * 0.35 + a * b * 0.7;
}

// How much of a light reaches a point: march from the point towards the light through the baked
// occupancy (the mask's green channel). Thick rock or steel in between blocks it; a thin skin of
// rock only dims it, so lit rock surfaces still glow a little at their edge.
float lampReach(vec2 from, vec2 lightPos) {
  vec2 d = lightPos - from;
  float len = length(d);
  float steps = uShadowCfg.x;
  float seg = len / steps;
  float j = hash(from * 0.37 + fract(uTime * 0.61));
  float thick = 0.0;
  bool free = false;
  for (int s = 0; s < 32; s++) {
    if (float(s) >= steps) break;
    vec2 p = from + d * ((float(s) + j) / steps);
    float o = texture(uMask, clamp((p - uOrigin) / uWorld, 0.0, 1.0)).g;
    // The pixel's own rock is its surface, not a shadow caster: only steel met after open air counts.
    if (o < 0.35) free = true;
    else if (free) thick += o * seg;
  }
  return exp(-thick / uShadowCfg.y);
}

// The height the art suggests: coverage plus brightness. Its slope gives a surface normal.
float reliefH(vec2 uv) {
  vec4 t = texture(uScene, uv);
  return t.a * 0.8 + dot(t.rgb, vec3(0.3, 0.5, 0.2)) * 0.6;
}

void main() {
  vec2 wp = uCam + vUV * uView;
  float d = wp.y;
  // 1 above the water (a head out at the surface), 0 below. Same wave as the water shader.
  float wave = d > 65.0 ? 0.0 : waterline(wp.x, uTime);
  float air = smoothstep(wave + 1.0, wave - 1.0, d);
  bool dry = uLivingWater > 0.5 && wp.x > 15420.0 && wp.x < 17440.0 && inDryPocket(wp);

  // Water distortion: nudge where we read the picture by a pixel or so.
  vec2 wob = vec2(sin(wp.y * 0.05 + uTime * 1.6) + 0.5 * sin(wp.x * 0.031 - uTime * 1.1),
                  cos(wp.x * 0.043 + uTime * 1.3) + 0.5 * sin(wp.y * 0.027 + uTime * 0.9));
  if (uLivingWater > 0.5) {
    // Sheltered water stays sharp. Only the nearby wake/thermal plume adds refraction.
    wob *= 0.58;
    if (uWaterLocal.z > 0.0) {
      vec2 off = wp - uWaterLocal.xy;
      float r = dot(off, off) / (uWaterLocal.w * uWaterLocal.w);
      if (r < 1.0) {
        float k = (1.0 - r) * (1.0 - r) * uWaterLocal.z;
        wob += vec2(sin(off.y * 0.092 - uTime * 3.6), cos(off.x * 0.064 + uTime * 3.1)) * k;
      }
    }
  }
  if (dry) wob = vec2(0.0);
  vec2 uv = vUV + wob * (1.0 - air) * uFlags.y / uResolution;
  vec4 c = texture(uScene, uv);

  // G2 relief: a normal worked out from the art itself. Flat stays (0, 0, 1).
  vec3 nrm = vec3(0.0, 0.0, 1.0);
  if (c.a > 0.003 && uShadowCfg.z > 0.0) {
    vec2 o = vec2(3.0) / uView;
    vec2 g = vec2(reliefH(uv + vec2(o.x, 0.0)) - reliefH(uv - vec2(o.x, 0.0)), reliefH(uv + vec2(0.0, o.y)) - reliefH(uv - vec2(0.0, o.y)));
    if (uShadowCfg.w > 0.5) {
      vec2 o2 = o * 2.4;
      vec2 g2 = vec2(reliefH(uv + vec2(o2.x, 0.0)) - reliefH(uv - vec2(o2.x, 0.0)), reliefH(uv + vec2(0.0, o2.y)) - reliefH(uv - vec2(0.0, o2.y)));
      g = g * 0.6 + g2 * 0.35;
    }
    nrm = normalize(vec3(-g * (uShadowCfg.z * 2.2), 1.0));
  }

  // Dynamic lights. A is position, radius, intensity; B colour and cone
  // width; C beam direction, cone softness and how much it lights the water.
  // G4: material. Greyish, bright pixels read as hardware (chrome, brass, hull plates); rock and water are colourful.
  float mx = 0.0;
  float hard = 0.0;
  if (c.a > 0.003) {
    vec3 sc = c.rgb / max(c.a, 0.01);
    mx = max(sc.r, max(sc.g, sc.b));
    float sat = (mx - min(sc.r, min(sc.g, sc.b))) / max(mx, 0.01);
    hard = smoothstep(0.6, 0.15, sat) * smoothstep(0.08, 0.3, mx);
    // Painterly grime and grain anchored to the world, so it never swims with the camera.
    if (uMat.x > 0.0) {
      float n = noise(wp * 0.045) * 0.6 + noise(wp * 0.19) * 0.3 + noise(vec2(wp.x * 0.21, wp.y * 0.013)) * 0.5;
      float fine = hash(floor(wp * 0.8)) - 0.5;
      c.rgb *= 1.0 - uMat.x * (0.03 + 0.3 * hard) * n + fine * uMat.x * (0.01 + 0.07 * hard);
    }
  }
  vec3 specAcc = vec3(0.0);
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
    if (float(i) < uShadowCount && dist > 40.0 && fall * cone > 0.004) l *= lampReach(wp, A.xy);
    // Relief: a surface turned towards the light takes more of it, one turned away takes less.
    float shaped = 1.0;
    if (uShadowCfg.z > 0.0 && c.a > 0.003) {
      vec3 L3 = normalize(vec3(-to / max(dist, 1.0), 0.7));
      shaped = mix(1.0, clamp(dot(nrm, L3) / 0.573, 0.0, 2.0), uShadowCfg.z);
    }
    lit += l * shaped;
    haze += l * C.w;
    // G4: chrome and brass catch the lamp, and the highlight travels across a flange as the lamp moves.
    if (float(i) < uShadowCount && uMat.y > 0.0 && uShadowCfg.z > 0.0 && c.a > 0.003) {
      vec3 L3 = normalize(vec3(-to / max(dist, 1.0), 0.7));
      float sp = pow(max(dot(nrm, normalize(L3 + vec3(0.0, 0.0, 1.0))), 0.0), 26.0);
      specAcc += l * sp * hard * smoothstep(0.35, 0.8, mx) * uMat.y * 1.8;
    }
  }

  vec3 outRgb = vec3(0.0);
  if (c.a > 0.003) {
    float vis = texture(uMask, clamp((wp - uOrigin) / uWorld, 0.0, 1.0)).r;
    vec3 sunCol = absorb(d);
    float shade = 1.0;
    for (int k = 0; k < ${MAX_CONTACTS}; k++) {
      if (float(k) >= uContactCount) break;
      vec4 E = uContact[k];
      vec2 s = (wp - E.xy) / vec2(E.z, E.z * 0.32);
      shade *= 1.0 - E.w * exp(-dot(s, s));
    }
    // Sunlight comes from above: surfaces facing up take more of it.
    vec3 Ls = normalize(vec3(0.12, -0.85, 0.55));
    float sunShape = mix(1.0, clamp(dot(nrm, Ls) / Ls.z, 0.25, 1.7), uShadowCfg.z * 0.7);
    vec3 sun = sunCol * vis * shade * 1.04 * sunShape;
    vec3 ambient = sunCol * 0.2 + vec3(0.012, 0.028, 0.04);

    // Caustics, strongest in the shallows.
    float cK = uFlags.z * vis * shade * exp(-max(d, 0.0) / 430.0) * (1.0 - air);
    vec3 caus = vec3(0.0);
    // G1: the caustic net is the most expensive part of this shader (a hundred or so
    // transcendental operations per pixel). Where it would add less than about one level
    // of 255 (deep water, caves, shade, anywhere the sun cannot reach) it is skipped.
    // uFlags.w turns the skip off, so it can be compared.
    if (uFlags.w < 0.5 || cK * max(sunCol.r, max(sunCol.g, sunCol.b)) > 0.0025) {
      if (uFlags.x > 0.5) {
        caus = vec3(caustics(wp + vec2(1.8, 0.6), uTime), caustics(wp, uTime), caustics(wp - vec2(1.8, 0.6), uTime));
      } else {
        caus = vec3(caustics(wp, uTime));
      }
      // Caustics lie on surfaces that face up, not on walls and undersides.
      caus *= cK * sunCol * mix(1.0, smoothstep(-0.15, 0.45, -nrm.y), uShadowCfg.z);
    }

    vec3 col = c.rgb * (sun * (1.0 + air * 0.15) + ambient + caus + lit * 1.1) + specAcc * c.a;

    // Depth fog pulls distant-looking colour towards the water. Our own
    // lights cut through it.
    float fog = (0.12 + 0.3 * smoothstep(300.0, 1150.0, d)) * (1.0 - clamp(dot(lit, vec3(0.33)), 0.0, 0.85));
    col = mix(col, waterColor(d) * mix(0.45, 1.0, vis) * c.a, fog * (1.0 - air * 0.8));
    outRgb = col;
  }

  // Light scattered by the water itself (visible beams), added on top.
  float dark = 1.0 - 0.75 * clamp(dot(absorb(d), vec3(0.33)), 0.0, 1.0);
  if (uLivingWater > 0.5 && !dry && d > 15.0 && max(haze.r, max(haze.g, haze.b)) > 0.005) {
    float drift = sin(wp.x * 0.018 + wp.y * 0.038 + uTime * 0.68);
    haze *= 0.95 + 0.105 * drift;
  }
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
  /** Graphics session G2: casts shadows (the beam stops at rock and steel). Only the first few of these are honoured. */
  shadow?: boolean;
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
    uShadowCount: number;
    uMat: Float32Array;
    uShadowCfg: Float32Array;
    uContactCount: number;
    uContact: Float32Array;
    uFlags: Float32Array;
    uWaterLocal: Float32Array;
    uWaterFlow: Float32Array;
  };
  private readonly shader: Shader;
  setWaterLocal(x: number, y: number, strength: number, radius: number): void {
    const data = this.u.uWaterLocal;
    data[0] = x; data[1] = y; data[2] = strength; data[3] = radius;
  }

  setWaterFlow(x: number, y: number): void {
    this.u.uWaterFlow[0] = x;
    this.u.uWaterFlow[1] = y;
  }

  /** How many lights the last update sent to the shader. */
  lightCount = 0;

  constructor(scene: Texture, mask: Texture, surface?: SurfaceMotion) {
    const geometry = new Geometry({
      attributes: { aPosition: [0, 0, 1, 0, 1, 1, 0, 1] },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    this.shader = Shader.from({
      gl: { vertex: RT_VERTEX, fragment, name: 'fathomlight-lighting' },
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
          uShadowCount: { value: 0, type: 'f32' },
          uMat: { value: new Float32Array(4), type: 'vec4<f32>' },
          uShadowCfg: { value: new Float32Array([12, 28, 0, 0]), type: 'vec4<f32>' },
          uContactCount: { value: 0, type: 'f32' },
          uContact: { value: new Float32Array(4 * MAX_CONTACTS), type: 'vec4<f32>', size: MAX_CONTACTS },
          uFlags: { value: new Float32Array([0, 1, 0.6, 0]), type: 'vec4<f32>' },
          uLivingWater: { value: surface ? 1 : 0, type: 'f32' },
          uImpacts: { value: surface?.data ?? new Float32Array(16), type: 'vec4<f32>', size: 4 },
          uWaterLocal: { value: new Float32Array(4), type: 'vec4<f32>' },
          uWaterFlow: { value: new Float32Array(2), type: 'vec2<f32>' },
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
    /** G1: skip the caustics where they cannot be seen. */
    skipHiddenCaustics: boolean;
    /** G2: soft ellipses where things meet the seabed: x, y, radius, strength. */
    contacts: [number, number, number, number][];
    /** G2: how many lights cast shadows, how many steps each march takes, relief strength (0 = off) and wide relief taps. */
    shadowLights: number;
    shadowSteps: number;
    relief: number;
    reliefWide: boolean;
    /** G4: grime and grain strength, and the metal sheen strength (0 = off). */
    grime: number;
    sheen: number;
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
    u.uFlags[3] = opts.skipHiddenCaustics ? 1 : 0;
    u.uMat[0] = opts.grime;
    u.uMat[1] = opts.sheen;
    u.uShadowCfg[0] = opts.shadowSteps;
    u.uShadowCfg[1] = 26;
    u.uShadowCfg[2] = opts.relief;
    u.uShadowCfg[3] = opts.reliefWide ? 1 : 0;
    const nc = Math.min(MAX_CONTACTS, opts.contacts.length);
    for (let i = 0; i < nc; i++) u.uContact.set(opts.contacts[i], i * 4);
    u.uContactCount = nc;

    // Keep the lights that matter most on screen: skip ones too far away,
    // then keep the brightest up to the preset's limit.
    const cx = opts.camX + opts.viewW / 2;
    const cy = opts.camY + opts.viewH / 2;
    const reach = Math.hypot(opts.viewW, opts.viewH) / 2;
    const visible = opts.lights
      .filter((l) => l.intensity > 0.01 && Math.hypot(l.x - cx, l.y - cy) < reach + l.radius)
      .sort((a, b) => b.intensity * b.radius - a.intensity * a.radius);
    // The lights that cast shadows go first (the shader treats the first uShadowCount that way).
    const casters = opts.shadowLights > 0 && opts.shadowSteps > 0 ? visible.filter((l) => l.shadow).slice(0, opts.shadowLights) : [];
    const rest = visible.filter((l) => !casters.includes(l));
    const ordered = [...casters, ...rest].slice(0, Math.min(opts.maxLights, MAX_LIGHTS));
    u.uShadowCount = Math.min(casters.length, ordered.length);
    ordered.forEach((l, i) => {
      u.uLightA.set([l.x, l.y, l.radius, l.intensity], i * 4);
      u.uLightB.set([l.color[0], l.color[1], l.color[2], l.coneCos ?? -2], i * 4);
      u.uLightC.set([l.dirX ?? 0, l.dirY ?? 0, l.coneSoft ?? 0.1, l.haze ?? 0.1], i * 4);
    });
    u.uLightCount = ordered.length;
    this.lightCount = ordered.length;
  }

  setScene(scene: Texture): void {
    this.shader.resources.uScene = scene.source;
  }
}
