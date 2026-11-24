import { GLSL_SURFACE_MOTION, type SurfaceMotion } from '../fx/surfaceMotion';
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
uniform float uShimmer;
uniform float uFidelity;

${GLSL_COMMON}
${GLSL_SURFACE_MOTION}

void main() {
  vec2 wp = uCam + vUV * uView;
  float d = wp.y;
  vec3 col = waterColor(d);

  // Daylight reaching this spot (rock above casts a soft shadow).
  float vis = texture(uMask, clamp((wp - uOrigin) / uWorld, 0.0, 1.0)).r;
  col *= mix(0.45, 1.0, vis);

  // ---- Dynamic Day / Night Cycle (6-minute loop, starting in golden late afternoon gliding into sunset -> starry night -> golden sunrise) ----
  float dayPhase = fract(uTime / 360.0 + 0.715); // 0.0 = midnight, 0.25 = sunrise, 0.50 = noon, 0.75 = sunset
  float sunAngle = (dayPhase - 0.25) * 6.2831853; // 0 at sunrise, PI/2 at noon, PI at sunset
  float sunElev = sin(sunAngle); // +1 noon, 0 horizon, -1 midnight
  float dayAmt = smoothstep(-0.14, 0.28, sunElev);
  float nightAmt = smoothstep(0.08, -0.26, sunElev);
  float du = (sunElev - 0.04) / 0.22;
  float duskAmt = exp(-(du * du)); // peaks warmly at both sunrise & sunset
  float sunsetSide = smoothstep(0.45, 0.55, dayPhase); // 0 = sunrise (east/right), 1 = sunset (west/left)

  // Light shafts: slanted bands that sway slowly and tint warmly during sunrise/sunset.
  float x = (wp.x * 0.8 + d * 0.42) / 560.0;
  if (uLivingWater > 0.5) x += 0.09 * sin(wp.x * 0.002 + uTime * 0.22) + 0.12 * sin(d * 0.006 - uTime * 0.47);
  float shafts = 0.0;
  shafts += pow(0.5 + 0.5 * sin(x * 5.0 + uTime * 0.15), 6.0) * 0.55;
  shafts += pow(0.5 + 0.5 * sin(x * 8.3 - uTime * 0.11 + 1.7), 8.0) * 0.40;
  shafts += pow(0.5 + 0.5 * sin(x * 13.1 + uTime * 0.07 + 4.1), 10.0) * 0.25;
  shafts *= 0.6 + 0.4 * noise(vec2(x * 3.0, uTime * 0.2));
  shafts *= exp(-max(d, 0.0) / 430.0) * vis;
  vec3 shaftTint = mix(vec3(0.42, 0.62, 0.82), vec3(0.75, 0.92, 0.88), dayAmt);
  shaftTint = mix(shaftTint, vec3(1.0, 0.72, 0.46), duskAmt * 0.82);
  col += shaftTint * shafts * mix(0.11, 0.26, dayAmt + duskAmt * 0.35);

  // Brightness just under the surface (warm golden-peach at sunrise/sunset, cool silver at night).
  vec3 underGlow = mix(vec3(0.42, 0.58, 0.74), vec3(0.8, 0.95, 0.9), dayAmt);
  underGlow = mix(underGlow, vec3(0.98, 0.72, 0.52), duskAmt * 0.72);
  col += underGlow * exp(-max(d, 0.0) / 68.0) * mix(0.10, 0.18, dayAmt + duskAmt * 0.3);

  // G3: a faint caustic shimmer drifting through the water just under the surface.
  if (uShimmer > 0.0 && d < 420.0) {
    vec2 q = wp * 0.019;
    float n1 = abs(sin(q.x * 1.7 + sin(q.y * 1.3 + uTime * 0.6) * 1.4 + uTime * 0.5));
    float n2 = abs(sin(q.y * 2.1 + sin(q.x * 1.1 - uTime * 0.45) * 1.6 - uTime * 0.4));
    float net = pow(1.0 - min(n1, n2), 7.0);
    col += shaftTint * net * uShimmer * exp(-max(d, 0.0) / 190.0) * vis * smoothstep(8.0, 60.0, d) * (0.35 + 0.65 * noise(wp * 0.008 + uTime * 0.05)) * 0.08;
  }

  // The surface seen from below, and the sweeping painted sky above the waterline.
  float wave = d > 65.0 ? 0.0 : waterline(wp.x, uTime);
  float surfaceDistance = d - wave;
  float edge = mix(1.5, max(0.25, 0.9 * uView.y / uResolution.y), uFidelity);
  float above = 1.0 - smoothstep(-edge, edge, surfaceDistance);
  float ripple = noise(vec2(wp.x * 0.03 + uTime * 0.4, wp.y * 0.08 - uTime * 0.3));
  vec3 surfDay = mix(vec3(0.70, 0.86, 0.84), vec3(0.93, 0.98, 0.96), ripple);
  vec3 surfDusk = mix(vec3(0.76, 0.54, 0.48), vec3(1.0, 0.82, 0.60), ripple);
  vec3 surfNight = mix(vec3(0.16, 0.24, 0.34), vec3(0.38, 0.50, 0.64), ripple);
  vec3 surf = mix(surfNight, surfDay, dayAmt);
  surf = mix(surf, surfDusk, duskAmt * 0.85);
  surf *= 0.94 + 0.06 * sin(wp.x * 0.05 + uTime * 1.5);

  // Sweeping painterly sky above the waterline: 3-stop zenith/mid/horizon gradient, Sun, Moon, Stars & Clouds!
  float skyH = clamp((wave - d) / max(240.0, uView.y * 0.42), 0.0, 1.0);
  // Screen-horizontal coordinate with gentle parallax so sun/moon/clouds sit infinitely far away.
  float sx = (vUV.x - 0.5) * (uResolution.x / max(1.0, uResolution.y));
  float parX = vUV.x + uCam.x * 0.000018;

  vec3 dayHor = vec3(0.84, 0.92, 0.92);
  vec3 dayMid = vec3(0.54, 0.77, 0.89);
  vec3 dayZen = vec3(0.28, 0.54, 0.76);

  vec3 duskHor = mix(vec3(1.00, 0.72, 0.42), vec3(0.98, 0.54, 0.38), sunsetSide);
  vec3 duskMid = mix(vec3(0.84, 0.50, 0.52), vec3(0.68, 0.38, 0.54), sunsetSide);
  vec3 duskZen = vec3(0.18, 0.22, 0.40);

  vec3 nightHor = vec3(0.10, 0.16, 0.26);
  vec3 nightMid = vec3(0.06, 0.10, 0.19);
  vec3 nightZen = vec3(0.03, 0.05, 0.11);

  vec3 cHor = mix(mix(nightHor, dayHor, dayAmt), duskHor, duskAmt);
  vec3 cMid = mix(mix(nightMid, dayMid, dayAmt), duskMid, duskAmt);
  vec3 cZen = mix(mix(nightZen, dayZen, dayAmt), duskZen, duskAmt);

  vec3 sky = mix(cHor, cMid, smoothstep(0.0, 0.42, skyH));
  sky = mix(sky, cZen, smoothstep(0.32, 1.0, skyH));

  // Sun arc across the sky (rises east/right, arcs overhead, sets west/left).
  float sunX = -cos(sunAngle) * 0.56;
  float sunY = clamp(sunElev * 0.88 + 0.06, -0.25, 0.92);
  vec2 sunVec = vec2(sx - sunX, skyH - sunY);
  float sunDist = length(sunVec);
  float sunVis = smoothstep(-0.18, 0.02, sunElev);
  // Wide atmospheric sunrise/sunset horizon bloom around the sun.
  vec3 sunAuraCol = mix(vec3(1.0, 0.95, 0.82), vec3(1.0, 0.58, 0.28), duskAmt);
  sky += sunAuraCol * exp(-sunDist * 2.6) * (0.42 + 0.55 * duskAmt) * sunVis;
  sky += vec3(1.0, 0.88, 0.62) * exp(-sunDist * 11.0) * 0.85 * sunVis;
  // Crisp glowing solar disc.
  float sunDisc = 1.0 - smoothstep(0.038, 0.054, sunDist);
  sky = mix(sky, mix(vec3(1.0, 0.98, 0.90), vec3(1.0, 0.86, 0.58), duskAmt * 0.7), sunDisc * sunVis);

  // Silver Moon arcing across the night sky.
  float moonElev = -sunElev;
  float moonVis = smoothstep(-0.08, 0.14, moonElev);
  float moonX = cos(sunAngle) * 0.48;
  float moonY = clamp(moonElev * 0.82 + 0.10, -0.2, 0.88);
  float moonDist = length(vec2(sx - moonX, skyH - moonY));
  sky += vec3(0.55, 0.72, 0.92) * exp(-moonDist * 4.5) * 0.36 * moonVis;
  float moonDisc = 1.0 - smoothstep(0.028, 0.038, moonDist);
  sky = mix(sky, vec3(0.92, 0.96, 1.0), moonDisc * moonVis);

  // Twinkling stars emerging across the upper night & twilight sky.
  if (nightAmt + duskAmt * 0.45 > 0.05) {
    vec2 starCell = floor(vec2(parX * 140.0, skyH * 52.0));
    vec2 starFrac = fract(vec2(parX * 140.0, skyH * 52.0)) - 0.5;
    float rnd = hash(starCell);
    if (rnd > 0.968) {
      float tw = 0.55 + 0.45 * sin(uTime * (2.0 + rnd * 5.0) + rnd * 90.0);
      float star = (1.0 - smoothstep(0.05, 0.24, length(starFrac))) * tw;
      sky += vec3(0.86, 0.92, 1.0) * star * smoothstep(0.14, 0.55, skyH) * (nightAmt * 0.95 + duskAmt * 0.25);
    }
  }

  // Soft painted drifting coastal cloud banks lit from beneath by sunrise/sunset.
  vec2 cloudUV = vec2(parX * 3.8 + uTime * 0.0045, skyH * 4.2);
  float c1 = noise(cloudUV);
  float c2 = noise(cloudUV * 2.3 + vec2(4.2, -1.7));
  float cloudShape = smoothstep(0.46, 0.78, c1 * 0.68 + c2 * 0.32) * smoothstep(0.05, 0.26, skyH) * (1.0 - smoothstep(0.74, 0.98, skyH));
  vec3 cloudBase = mix(vec3(0.16, 0.22, 0.32), vec3(0.94, 0.95, 0.94), dayAmt);
  vec3 cloudLit = mix(vec3(0.32, 0.42, 0.56), vec3(1.0, 0.98, 0.94), dayAmt);
  cloudBase = mix(cloudBase, vec3(0.46, 0.30, 0.42), duskAmt * 0.85);
  cloudLit = mix(cloudLit, vec3(1.0, 0.72, 0.46), duskAmt * 0.95);
  float sunRim = exp(-sunDist * 2.2) * sunVis;
  vec3 cloudCol = mix(cloudBase, cloudLit, clamp(0.35 + (1.0 - skyH) * 0.55 + sunRim * 0.6, 0.0, 1.0));
  sky = mix(sky, cloudCol, cloudShape * 0.58);

  surf = mix(surf, sky, smoothstep(0.02, 0.22, skyH));
  col = mix(col, surf, above);

  // Shimmering sun/moon glitter path along the water surface!
  float reflX = sunVis > 0.1 ? sunX : moonX;
  float reflSpread = mix(0.18, 0.34, duskAmt);
  float rx = (sx - reflX) / reflSpread;
  float glitter = exp(-(rx * rx)) * (0.55 + 0.45 * sin(wp.x * 0.14 + uTime * 3.6));
  vec3 reflCol = sunVis > 0.1 ? mix(vec3(1.0, 0.96, 0.86), vec3(1.0, 0.70, 0.38), duskAmt) : vec3(0.75, 0.86, 1.0);
  if (uLivingWater > 0.5 && d >= wave && d < 44.0) {
    float film = exp(-(d - wave) * 0.072) * (0.4 + 0.6 * ripple);
    col += film * mix(vec3(0.105, 0.18, 0.16), vec3(0.24, 0.16, 0.10), duskAmt * 0.7) * vis;
  }
  col += mix(vec3(1.0), reflCol, 0.7) * (1.0 - smoothstep(0.0, 4.2, abs(surfaceDistance))) * (0.24 + 0.42 * glitter * (sunVis + moonVis * 0.55));

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
    uShimmer: number;
  };

  constructor(mask: Texture, surface?: SurfaceMotion, fidelity = false) {
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
          uShimmer: { value: 0, type: 'f32' },
          uFidelity: { value: fidelity ? 1 : 0, type: 'f32' },
          uLivingWater: { value: surface ? 1 : 0, type: 'f32' },
          uImpacts: { value: surface?.data ?? new Float32Array(16), type: 'vec4<f32>', size: 4 },
        },
        uMask: mask.source,
      },
    });
    this.u = shader.resources.waterUniforms.uniforms;
    this.view = new Mesh({ geometry, shader });
  }

  /** G3: strength of the caustic shimmer in the water near the surface (0 = off). */
  setShimmer(v: number): void {
    this.u.uShimmer = v;
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
