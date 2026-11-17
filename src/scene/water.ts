import { Geometry, Mesh, Shader, Texture } from 'pixi.js';
import { RT_VERTEX, GLSL_COMMON } from '../fx/shared';
import { WORLD_H, WORLD_SPAN, WORLD_X0 } from '../world/terrain';

/**
 * The open water behind everything: one rectangle covering the screen,
 * coloured per pixel by a GPU shader. It works in world coordinates, so the
 * colour follows real depth as the camera moves:
 *  - depth colour (warm tones fade first),
 *  - the rippling underside of the surface when you swim up to it,
 *  - light shafts that sway and fade with depth and are blocked by rock,
 *  - slow murk, and a little noise to stop colour banding.
 */

const fragment = /* glsl */ `
precision highp float;

in vec2 vUV;
out vec4 finalColor;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uCam;
uniform vec2 uView;
uniform vec2 uWorld;
uniform vec2 uOrigin;
uniform sampler2D uMask;

${GLSL_COMMON}

void main() {
  vec2 wp = uCam + vUV * uView;
  float d = wp.y;
  vec3 col = waterColor(d);

  // Daylight reaching this spot (rock above casts a soft shadow).
  float vis = texture(uMask, clamp((wp - uOrigin) / uWorld, 0.0, 1.0)).r;
  col *= mix(0.45, 1.0, vis);

  // Light shafts: slanted bands that sway slowly and fade with depth.
  float x = (wp.x * 0.8 + d * 0.42) / 560.0;
  float shafts = 0.0;
  shafts += pow(0.5 + 0.5 * sin(x * 5.0 + uTime * 0.15), 6.0) * 0.55;
  shafts += pow(0.5 + 0.5 * sin(x * 8.3 - uTime * 0.11 + 1.7), 8.0) * 0.40;
  shafts += pow(0.5 + 0.5 * sin(x * 13.1 + uTime * 0.07 + 4.1), 10.0) * 0.25;
  shafts *= 0.6 + 0.4 * noise(vec2(x * 3.0, uTime * 0.2));
  shafts *= exp(-max(d, 0.0) / 430.0) * vis;
  col += vec3(0.75, 0.92, 0.88) * shafts * 0.24;

  // Brightness just under the surface.
  col += vec3(0.8, 0.95, 0.9) * exp(-max(d, 0.0) / 60.0) * 0.16;

  // The surface seen from below: a bright, rippling mirror.
  float wave = sin(wp.x * 0.021 + uTime * 1.3) * 4.0 + sin(wp.x * 0.047 - uTime * 1.9) * 2.5
             + sin(wp.x * 0.11 + uTime * 2.7) * 1.0;
  float above = smoothstep(wave + 1.5, wave - 1.5, d);
  float ripple = noise(vec2(wp.x * 0.03 + uTime * 0.4, wp.y * 0.08 - uTime * 0.3));
  vec3 surf = mix(vec3(0.70, 0.86, 0.84), vec3(0.93, 0.98, 0.96), ripple);
  surf *= 0.94 + 0.06 * sin(wp.x * 0.05 + uTime * 1.5);
  // Higher up, the rippling underside gives way to hazy daylight air, so a
  // head breaking the surface reads as being out in the open.
  float h = clamp((wave - d) / 110.0, 0.0, 1.0);
  vec3 sky = mix(vec3(0.86, 0.93, 0.93), vec3(0.62, 0.79, 0.88), h);
  sky += (noise(vec2(wp.x / 220.0 + uTime * 0.01, wp.y / 60.0)) - 0.5) * 0.05;
  surf = mix(surf, sky, smoothstep(0.04, 0.3, h));
  col = mix(col, surf, above);
  col += vec3(1.0) * smoothstep(3.5, 0.0, abs(d - wave)) * 0.25; // bright line at the surface

  // Slow murk so the water never looks like a flat gradient.
  float murk = noise(vec2(wp.x / 280.0 + uTime * 0.02, wp.y / 280.0 - uTime * 0.01));
  col *= 0.93 + 0.1 * murk;

  // Tiny per-pixel noise hides colour banding on smooth gradients.
  col += (hash(vUV * uResolution + fract(uTime)) - 0.5) / 255.0;

  finalColor = vec4(col, 1.0);
}
`;

export class Water {
  readonly view: Mesh<Geometry, Shader>;
  private readonly u: {
    uTime: number;
    uResolution: Float32Array;
    uCam: Float32Array;
    uView: Float32Array;
    uWorld: Float32Array;
    uOrigin: Float32Array;
  };

  constructor(mask: Texture) {
    const geometry = new Geometry({
      attributes: { aPosition: [0, 0, 1, 0, 1, 1, 0, 1] },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    const shader = Shader.from({
      gl: { vertex: RT_VERTEX, fragment, name: 'fathomlight-water' },
      resources: {
        waterUniforms: {
          uTime: { value: 0, type: 'f32' },
          uResolution: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
          uCam: { value: new Float32Array([0, 0]), type: 'vec2<f32>' },
          uView: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
          uWorld: { value: new Float32Array([WORLD_SPAN, WORLD_H]), type: 'vec2<f32>' },
          uOrigin: { value: new Float32Array([WORLD_X0, 0]), type: 'vec2<f32>' },
        },
        uMask: mask.source,
      },
    });
    this.u = shader.resources.waterUniforms.uniforms;
    this.view = new Mesh({ geometry, shader });
  }

  update(time: number, camX: number, camY: number, viewW: number, viewH: number, pxW: number, pxH: number): void {
    const u = this.u;
    u.uTime = time;
    u.uCam[0] = camX;
    u.uCam[1] = camY;
    u.uView[0] = viewW;
    u.uView[1] = viewH;
    u.uResolution[0] = pxW;
    u.uResolution[1] = pxH;
  }
}
