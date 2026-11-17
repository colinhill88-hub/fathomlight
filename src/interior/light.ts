import { Geometry, Mesh, Shader, Texture } from 'pixi.js';
import { RT_VERTEX } from '../fx/shared';
import type { Light } from '../fx/lighting';

/**
 * Lighting for dry interiors (after milestone 8 part 2). Simpler than the
 * underwater shader: no caustics, fog or wobble. The flat-drawn room is lit by
 * a low ambient (dark until a ship's power is back) plus round lamps and the
 * helmet lamp's cone, with a little dust in the air so beams show.
 */
const MAX = 16;

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

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 wp = uCam + vUV * uView;
  vec4 c = texture(uScene, vUV);
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
      cone = max(cone, smoothstep(36.0, 0.0, dist) * 0.5);
    }
    vec3 l = B.rgb * A.w * fall * cone;
    lit += l;
    dust += l * C.w;
  }
  vec3 col = c.rgb * (uAmbient + lit * 1.15);
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
  };

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
        },
        uScene: scene.source,
      },
    });
    this.u = this.shader.resources.u.uniforms;
    this.view = new Mesh({ geometry, shader: this.shader });
  }

  update(o: { time: number; camX: number; camY: number; viewW: number; viewH: number; cssW: number; cssH: number; ambient: [number, number, number]; lights: Light[] }): void {
    const u = this.u;
    u.uTime = o.time;
    u.uCam[0] = o.camX;
    u.uCam[1] = o.camY;
    u.uView[0] = o.viewW;
    u.uView[1] = o.viewH;
    u.uResolution[0] = o.cssW;
    u.uResolution[1] = o.cssH;
    u.uAmbient.set(o.ambient);
    const cx = o.camX + o.viewW / 2;
    const cy = o.camY + o.viewH / 2;
    const reach = Math.hypot(o.viewW, o.viewH) / 2;
    const vis = o.lights
      .filter((l) => l.intensity > 0.01 && Math.hypot(l.x - cx, l.y - cy) < reach + l.radius)
      .sort((a, b) => b.intensity * b.radius - a.intensity * a.radius)
      .slice(0, MAX);
    vis.forEach((l, i) => {
      u.uA.set([l.x, l.y, l.radius, l.intensity], i * 4);
      u.uB.set([l.color[0], l.color[1], l.color[2], l.coneCos ?? -2], i * 4);
      u.uC.set([l.dirX ?? 0, l.dirY ?? 0, l.coneSoft ?? 0.1, l.haze ?? 0.05], i * 4);
    });
    u.uCount = vis.length;
  }

  setScene(scene: Texture): void {
    this.shader.resources.uScene = scene.source;
  }
}
