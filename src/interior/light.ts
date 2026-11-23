import { Geometry, Mesh, Shader, Texture } from 'pixi.js';
import { RT_VERTEX, GLSL_DETAIL } from '../fx/shared';
import type { Light } from '../fx/lighting';

/**
 * Lighting for dry interiors (after milestone 8 part 2). Simpler than the
 * underwater shader: no caustics, fog or wobble. The flat-drawn room is lit by
 * a low ambient (dark until a ship's power is back) plus round lamps and the
 * helmet lamp's cone, with a little dust in the air so beams show.
 */
const MAX = 32;

const fragment = /* glsl */ `
precision highp float;
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uScene;
uniform vec2 uCam;
uniform vec2 uView;
uniform vec2 uResolution;
uniform vec3 uAmbient;
uniform float uTime;
uniform float uCount;
uniform vec4 uA[${MAX}];
uniform vec4 uB[${MAX}];
uniform vec4 uC[${MAX}];
uniform sampler2D uOcc;      // G2: which tiles are steel (red channel), one pixel per tile
uniform vec2 uOccWorld;
uniform float uShadowCount;  // the first this many lights cast shadows
uniform vec4 uShadowCfg;     // march steps, softness (world units), relief strength
uniform vec3 uDetail;        // scene texel size, fidelity enabled

${GLSL_DETAIL}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

// How much of a light reaches a point through the walls: march towards it, add up the steel.
float reach(vec2 from, vec2 lightPos) {
  vec2 d = lightPos - from;
  float len = length(d);
  float steps = uShadowCfg.x;
  float seg = len / steps;
  float j = hash(from * 0.41 + fract(uTime * 0.53));
  float thick = 0.0;
  bool free = false;
  for (int s = 0; s < 32; s++) {
    if (float(s) >= steps) break;
    vec2 p = from + d * ((float(s) + j) / steps);
    float o = texture(uOcc, clamp(p / uOccWorld, 0.0, 1.0)).r;
    // The pixel's own rock is its surface, not a shadow caster: only steel met after open air counts.
    if (o < 0.35) free = true;
    else if (free) thick += o * seg;
  }
  return exp(-thick / uShadowCfg.y);
}

float reliefH(vec2 uv) {
  vec4 t = texture(uScene, uv);
  return t.a * 0.8 + dot(t.rgb, vec3(0.3, 0.5, 0.2)) * 0.6;
}

void main() {
  vec2 wp = uCam + vUV * uView;
  vec4 c = texture(uScene, vUV);
  vec3 nrm = vec3(0.0, 0.0, 1.0);
  if (c.a > 0.003 && uShadowCfg.z > 0.0) {
    vec2 o = mix(vec2(3.0) / uView, 1.15 * uDetail.xy, uDetail.z);
    vec2 g = vec2(reliefH(vUV + vec2(o.x, 0.0)) - reliefH(vUV - vec2(o.x, 0.0)), reliefH(vUV + vec2(0.0, o.y)) - reliefH(vUV - vec2(0.0, o.y)));
    g = mix(g, limitRelief(g), uDetail.z);
    nrm = normalize(vec3(-g * (uShadowCfg.z * 2.2), 1.0));
  }
  vec3 lit = vec3(0.0);
  vec3 dust = vec3(0.0);
  for (int i = 0; i < ${MAX}; i++) {
    if (float(i) >= uCount) break;
    vec4 A = uA[i];
    vec4 B = uB[i];
    vec4 C = uC[i];
    vec2 to = wp - A.xy;
    float dist = length(to);
    float fall = clamp(1.0 - dist / A.z, 0.0, 1.0);
    fall *= fall;
    float cone = 1.0;
    if (B.w > -1.0) {
      float cosA = dot(to / max(dist, 0.001), C.xy);
      cone = smoothstep(B.w - C.z, B.w, cosA);
      cone = max(cone, (1.0 - smoothstep(0.0, 36.0, dist)) * mix(0.5, 0.32, uDetail.z));
    }
    vec3 l = B.rgb * A.w * fall * cone;
    if (float(i) < uShadowCount && dist > 30.0 && fall * cone > 0.004) l *= reach(wp, A.xy);
    float shaped = 1.0;
    if (uShadowCfg.z > 0.0 && c.a > 0.003) {
      vec3 L3 = normalize(vec3(-to / max(dist, 1.0), 0.7));
      shaped = mix(1.0, clamp(dot(nrm, L3) / 0.573, 0.0, 2.0), uShadowCfg.z);
    }
    lit += l * shaped;
    dust += l * C.w;
  }
  vec3 gain = uAmbient + lit * 1.15;
  if (uDetail.z > 0.5) gain = retainHighlightDetail(gain);
  vec3 col = c.rgb * gain;
  col += dust * (1.0 - c.a * 0.7) * 0.5;
  col += (hash(vUV * uResolution + fract(uTime * 0.37)) - 0.5) / 255.0;
  finalColor = vec4(max(col, 0.0), max(c.a, clamp(dot(dust, vec3(0.3)), 0.0, 1.0)));
}
`;

export class InteriorLighting {
  readonly view: Mesh<Geometry, Shader>;
  private readonly shader: Shader;
  private readonly u: {
    uCam: Float32Array;
    uView: Float32Array;
    uResolution: Float32Array;
    uAmbient: Float32Array;
    uTime: number;
    uCount: number;
    uA: Float32Array;
    uB: Float32Array;
    uC: Float32Array;
    uOccWorld: Float32Array;
    uShadowCount: number;
    uShadowCfg: Float32Array;
    uDetail: Float32Array;
  };
  private occ: Texture | null = null;

  constructor(scene: Texture) {
    const geometry = new Geometry({ attributes: { aPosition: [0, 0, 1, 0, 1, 1, 0, 1] }, indexBuffer: [0, 1, 2, 0, 2, 3] });
    this.shader = Shader.from({
      gl: { vertex: RT_VERTEX, fragment, name: 'fathomlight-interior-light' },
      resources: {
        u: {
          uCam: { value: new Float32Array(2), type: 'vec2<f32>' },
          uView: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
          uResolution: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
          uAmbient: { value: new Float32Array([0.1, 0.1, 0.12]), type: 'vec3<f32>' },
          uTime: { value: 0, type: 'f32' },
          uCount: { value: 0, type: 'f32' },
          uA: { value: new Float32Array(4 * MAX), type: 'vec4<f32>', size: MAX },
          uB: { value: new Float32Array(4 * MAX), type: 'vec4<f32>', size: MAX },
          uC: { value: new Float32Array(4 * MAX), type: 'vec4<f32>', size: MAX },
          uOccWorld: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
          uShadowCount: { value: 0, type: 'f32' },
          uShadowCfg: { value: new Float32Array([16, 22, 0, 0]), type: 'vec4<f32>' },
          uDetail: { value: new Float32Array(3), type: 'vec3<f32>' },
        },
        uScene: scene.source,
        uOcc: Texture.EMPTY.source,
      },
    });
    this.u = this.shader.resources.u.uniforms;
    this.view = new Mesh({ geometry, shader: this.shader });
  }

  /** One pixel per tile: steel where a light cannot pass. Call whenever the map changes. */
  setOccupancy(map: string[], tile: number): void {
    const h = map.length;
    const w = map[0].length;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const ch = map[y][x];
        const solid = ch === '#' || ch === 'c';
        const k = (y * w + x) * 4;
        img.data[k] = solid ? 255 : 0;
        img.data[k + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    const t = Texture.from(c);
    t.source.style.addressMode = 'clamp-to-edge';
    t.source.style.scaleMode = 'linear';
    this.shader.resources.uOcc = t.source;
    this.occ?.destroy(true);
    this.occ = t;
    this.u.uOccWorld[0] = w * tile;
    this.u.uOccWorld[1] = h * tile;
  }

  update(o: { time: number; camX: number; camY: number; viewW: number; viewH: number; cssW: number; cssH: number; ambient: [number, number, number]; lights: Light[]; shadowLights: number; shadowSteps: number; relief: number; fidelity: boolean }): void {
    const u = this.u;
    u.uShadowCfg[0] = o.shadowSteps;
    u.uShadowCfg[1] = 22;
    u.uShadowCfg[2] = o.relief;
    u.uTime = o.time;
    u.uCam[0] = o.camX;
    u.uCam[1] = o.camY;
    u.uView[0] = o.viewW;
    u.uView[1] = o.viewH;
    u.uResolution[0] = o.cssW;
    u.uResolution[1] = o.cssH;
    const scene = this.shader.resources.uScene;
    u.uDetail[0] = 1 / scene.pixelWidth;
    u.uDetail[1] = 1 / scene.pixelHeight;
    u.uDetail[2] = o.fidelity ? 1 : 0;
    u.uAmbient.set(o.ambient);
    const cx = o.camX + o.viewW / 2;
    const cy = o.camY + o.viewH / 2;
    const reach = Math.hypot(o.viewW, o.viewH) / 2;
    const sorted = o.lights
      .map((l) => ({ l, margin: reach + l.radius - Math.hypot(l.x - cx, l.y - cy) }))
      .filter((e) => e.l.intensity > 0.01 && e.margin > 0)
      .sort((a, b) => (b.margin + b.l.radius * 0.5) - (a.margin + a.l.radius * 0.5))
      .map((e) => e.l);
    const casters = o.shadowLights > 0 && o.shadowSteps > 0 ? sorted.filter((l) => l.shadow).slice(0, o.shadowLights) : [];
    const vis = [...casters, ...sorted.filter((l) => !casters.includes(l))].slice(0, MAX);
    u.uShadowCount = casters.length;
    vis.forEach((l, i) => {
      const dist = Math.hypot(l.x - cx, l.y - cy);
      const edgeFade = l.shadow ? 1 : Math.min(1, Math.max(0, (reach + l.radius - dist) / 160));
      u.uA.set([l.x, l.y, l.radius, l.intensity * edgeFade], i * 4);
      u.uB.set([l.color[0], l.color[1], l.color[2], l.coneCos ?? -2], i * 4);
      u.uC.set([l.dirX ?? 0, l.dirY ?? 0, l.coneSoft ?? 0.1, l.haze ?? 0.05], i * 4);
    });
    u.uCount = vis.length;
  }

  setScene(scene: Texture): void {
    this.shader.resources.uScene = scene.source;
  }
}
