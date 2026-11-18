import { Geometry, Mesh, RenderTexture, Renderer, Shader, Texture } from 'pixi.js';
import { FULLSCREEN_VERTEX, GLSL_COMMON, RT_VERTEX } from './shared';

/**
 * The post stack (graphics session G1).
 *
 * The world (water, rock, lighting, emissive, glow, marine snow, and dry
 * interiors) is drawn into one picture that can hold light brighter than
 * "white" (a half-float target, or an ordinary 8-bit one on devices that
 * cannot render to half-float). Then:
 *
 *  1. Bloom: anything brighter than a threshold, plus a little of the old glow
 *     layer, is blurred down a chain of half-size pictures and added back.
 *  2. One final full-screen pass turns the picture into what you see: soft
 *     filmic tone mapping (bright light rolls off instead of clipping),
 *     per-zone colour grading, the vignette (moved here from CSS) and fine grain.
 *
 * The scanner, the build grid and the collect rings are drawn after this
 * pass, straight onto the screen, so they stay crisp.
 */

export interface ZoneWeights {
  shallows: number;
  basin: number;
  forest: number;
  cave: number;
  shelf: number;
  /** Milestone 10. */
  trench: number;
  /** Milestone 11: the Choir's colours take over. */
  sanctum: number;
}

/** Can this device render into a half-float picture? Checked on a scratch context, so the game's own is untouched. */
export function halfFloatSupported(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return false;
    const ext = gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float');
    let ok = false;
    if (ext) {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 4, 4, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE && gl.getError() === gl.NO_ERROR;
      gl.deleteFramebuffer(fbo);
      gl.deleteTexture(tex);
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Shaders.

const PREFILTER = /* glsl */ `
precision highp float;
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uSrc;
uniform sampler2D uGlow;
uniform vec2 uTexel;
uniform vec2 uGlowTexel;
uniform vec4 uParams; // threshold, knee, glow feed

// The old glow layer is stored sharp (it is blurred only when it is added to the picture),
// so it is read through a wide 13-tap filter here, or its edges would show up in the bloom.
vec3 glowTap(vec2 o) {
  return texture(uGlow, vUV + o * uGlowTexel * 2.0).rgb;
}

vec3 tap(vec2 o) {
  vec3 c = min(texture(uSrc, vUV + o * uTexel).rgb, vec3(12.0));
  float br = max(c.r, max(c.g, c.b));
  float knee = uParams.y;
  float soft = clamp(br - uParams.x + knee, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee + 1e-4);
  float k = max(soft, br - uParams.x) / max(br, 1e-4);
  return c * max(k, 0.0);
}

void main() {
  // 13 taps in five overlapping boxes: stable when small bright things move.
  vec3 a = tap(vec2(-2.0, -2.0)), b = tap(vec2(0.0, -2.0)), c = tap(vec2(2.0, -2.0));
  vec3 d = tap(vec2(-2.0, 0.0)), e = tap(vec2(0.0, 0.0)), f = tap(vec2(2.0, 0.0));
  vec3 g = tap(vec2(-2.0, 2.0)), h = tap(vec2(0.0, 2.0)), i = tap(vec2(2.0, 2.0));
  vec3 j = tap(vec2(-1.0, -1.0)), k = tap(vec2(1.0, -1.0));
  vec3 l = tap(vec2(-1.0, 1.0)), m = tap(vec2(1.0, 1.0));
  vec3 col = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  // The old glow layer feeds the bloom too, so existing glows keep their look and spread a little.
  vec3 gl = glowTap(vec2(0.0)) * 0.125
    + (glowTap(vec2(-2.0, -2.0)) + glowTap(vec2(2.0, -2.0)) + glowTap(vec2(-2.0, 2.0)) + glowTap(vec2(2.0, 2.0))) * 0.03125
    + (glowTap(vec2(0.0, -2.0)) + glowTap(vec2(-2.0, 0.0)) + glowTap(vec2(2.0, 0.0)) + glowTap(vec2(0.0, 2.0))) * 0.0625
    + (glowTap(vec2(-1.0, -1.0)) + glowTap(vec2(1.0, -1.0)) + glowTap(vec2(-1.0, 1.0)) + glowTap(vec2(1.0, 1.0))) * 0.125;
  col += gl * uParams.z;
  finalColor = vec4(col, 1.0);
}
`;

const DOWN = /* glsl */ `
precision highp float;
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uSrc;
uniform vec2 uTexel;

void main() {
  vec3 a = texture(uSrc, vUV + uTexel * vec2(-2.0, -2.0)).rgb, b = texture(uSrc, vUV + uTexel * vec2(0.0, -2.0)).rgb, c = texture(uSrc, vUV + uTexel * vec2(2.0, -2.0)).rgb;
  vec3 d = texture(uSrc, vUV + uTexel * vec2(-2.0, 0.0)).rgb, e = texture(uSrc, vUV).rgb, f = texture(uSrc, vUV + uTexel * vec2(2.0, 0.0)).rgb;
  vec3 g = texture(uSrc, vUV + uTexel * vec2(-2.0, 2.0)).rgb, h = texture(uSrc, vUV + uTexel * vec2(0.0, 2.0)).rgb, i = texture(uSrc, vUV + uTexel * vec2(2.0, 2.0)).rgb;
  vec3 j = texture(uSrc, vUV + uTexel * vec2(-1.0, -1.0)).rgb, k = texture(uSrc, vUV + uTexel * vec2(1.0, -1.0)).rgb;
  vec3 l = texture(uSrc, vUV + uTexel * vec2(-1.0, 1.0)).rgb, m = texture(uSrc, vUV + uTexel * vec2(1.0, 1.0)).rgb;
  finalColor = vec4(e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125, 1.0);
}
`;

// up = this level + a soft tent blur of the smaller level above it.
const UP = /* glsl */ `
precision highp float;
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uBase;
uniform sampler2D uLow;
uniform vec2 uTexel; // of the smaller picture
uniform float uWeight;

void main() {
  vec3 s = texture(uLow, vUV + uTexel * vec2(-1.0, -1.0)).rgb + texture(uLow, vUV + uTexel * vec2(1.0, -1.0)).rgb
         + texture(uLow, vUV + uTexel * vec2(-1.0, 1.0)).rgb + texture(uLow, vUV + uTexel * vec2(1.0, 1.0)).rgb;
  s += 2.0 * (texture(uLow, vUV + uTexel * vec2(0.0, -1.0)).rgb + texture(uLow, vUV + uTexel * vec2(0.0, 1.0)).rgb
            + texture(uLow, vUV + uTexel * vec2(-1.0, 0.0)).rgb + texture(uLow, vUV + uTexel * vec2(1.0, 0.0)).rgb);
  s += 4.0 * texture(uLow, vUV).rgb;
  finalColor = vec4(texture(uBase, vUV).rgb + s * (1.0 / 16.0) * uWeight, 1.0);
}
`;

// G3 god rays: from every pixel march towards the sun above the screen; anything drawn in the lit
// picture (rock, kelp, hardware, the diver) blocks the way, so shafts are cut by what stands in them.
const RAYS = /* glsl */ `
precision highp float;
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uLit;
uniform vec4 uP;   // steps, time, camera phase, 0
uniform vec2 uSun; // in screen uv, above the top edge

${GLSL_COMMON}

void main() {
  float here = 1.0 - texture(uLit, vUV).a;
  vec2 d = uSun - vUV;
  float steps = uP.x;
  vec2 stepv = d * 0.85 / steps;
  vec2 p = vUV + stepv * hash(vUV * vec2(311.0, 197.0) + fract(uP.y));
  float acc = 0.0;
  float w = 1.0;
  for (int i = 0; i < 24; i++) {
    if (float(i) >= steps) break;
    p += stepv;
    acc += (1.0 - texture(uLit, p).a) * w;
    w *= 0.94;
  }
  acc /= steps * 0.55;
  float ang = atan(vUV.x - uSun.x, vUV.y - uSun.y);
  float beams = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(ang * 17.0 + uP.z), 3.0) * (0.7 + 0.3 * sin(ang * 41.0 - uP.y * 0.12));
  finalColor = vec4(vec3(acc * beams * here), 1.0);
}
`;

const FINAL = /* glsl */ `
precision highp float;
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform sampler2D uRays;
uniform vec2 uResolution;
uniform float uTime;
uniform vec4 uFlags;   // tone map amount, bloom strength, vignette amount, grain amount
uniform vec4 uTint;    // colour balance multiplier (rgb), exposure (a)
uniform vec4 uGrade;   // saturation, contrast, unused, unused
uniform vec4 uLift;    // shadow tint (rgb)
uniform vec4 uMode;    // x: 1 when bloom is on, y: 1 when god rays are on
uniform vec4 uRayCol;  // god ray colour times strength

${GLSL_COMMON}

// Soft shoulder: untouched below the knee, then bright light rolls off towards white
// instead of clipping. Continuous in value and slope at the knee.
vec3 shoulder(vec3 x) {
  const float k = 0.72;
  vec3 hi = max(x - k, 0.0);
  return min(x, vec3(k)) + (1.0 - k) * (1.0 - exp(-hi / (1.0 - k)));
}

void main() {
  vec3 c = texture(uScene, vUV).rgb;
  if (uMode.x > 0.5) c += texture(uBloom, vUV).rgb * uFlags.y;
  if (uMode.y > 0.5) c += texture(uRays, vUV).r * uRayCol.rgb;
  c *= uTint.a;
  vec3 col = mix(min(c, vec3(1.0)), shoulder(c), uFlags.x);

  // Colour grade, in display space: balance, saturation, contrast, shadow tint.
  col *= uTint.rgb;
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, uGrade.x);
  col = (col - 0.4) * uGrade.y + 0.4;
  col += uLift.rgb * (1.0 - clamp(col, 0.0, 1.0));

  // Vignette: the same shape the page used to draw with CSS.
  vec2 p = (vUV - vec2(0.5, 0.45)) / vec2(0.75, 0.70);
  float v = clamp((length(p) - 0.55) / 0.45, 0.0, 1.0);
  col = mix(col, vec3(2.0, 14.0, 20.0) / 255.0, 0.55 * v * uFlags.z);

  // Fine grain, strongest in the mid-tones, which also dithers the 8-bit output.
  float l2 = clamp(dot(col, vec3(0.333)), 0.0, 1.0);
  float amp = (1.0 + 2.0 * uFlags.w * (0.5 + 0.5 * (1.0 - abs(2.0 * l2 - 1.0)))) / 255.0;
  col += (hash(vUV * uResolution + fract(uTime * 0.37)) - 0.5) * amp * 1.5;

  finalColor = vec4(max(col, 0.0), 1.0);
}
`;

// ---------------------------------------------------------------------------
// Per-zone grading. Balance, exposure, saturation, contrast and shadow tint.

interface Grade {
  tint: [number, number, number];
  exposure: number;
  sat: number;
  contrast: number;
  lift: [number, number, number];
}


const GRADES: Record<keyof ZoneWeights | 'interior', Grade> = {
  // Warm and clear.
  shallows: { tint: [1.045, 1.012, 0.945], exposure: 1.02, sat: 1.1, contrast: 1.04, lift: [0.004, 0.004, 0] },
  // Cool.
  basin: { tint: [0.93, 0.99, 1.07], exposure: 1.02, sat: 0.96, contrast: 1.05, lift: [0.004, 0.012, 0.022] },
  // Green and dim.
  forest: { tint: [0.95, 1.06, 0.9], exposure: 0.97, sat: 0.96, contrast: 1.06, lift: [0, 0.012, 0.004] },
  // Grey-teal.
  shelf: { tint: [0.96, 1.01, 1.01], exposure: 1.0, sat: 0.7, contrast: 1.08, lift: [0.006, 0.014, 0.014] },
  // Milestone 10: cold blue-black, low saturation, a touch more contrast.
  trench: { tint: [0.9, 0.98, 1.08], exposure: 1.0, sat: 0.62, contrast: 1.1, lift: [0.002, 0.008, 0.014] },
  // Milestone 11: the sanctum. Richer colour, a lifted violet floor and a little more light: awe, not dread.
  sanctum: { tint: [0.98, 0.96, 1.08], exposure: 1.08, sat: 1.15, contrast: 1.04, lift: [0.01, 0.006, 0.022] },
  // Near black.
  cave: { tint: [0.97, 1.0, 1.02], exposure: 0.98, sat: 0.84, contrast: 1.05, lift: [0.002, 0.006, 0.01] },
  // Dry steel and lamplight.
  interior: { tint: [1.02, 1.0, 0.97], exposure: 1.0, sat: 0.96, contrast: 1.05, lift: [0.004, 0.004, 0.004] },
};

export function gradeFor(zone: ZoneWeights | null): Grade {
  if (!zone) return GRADES.interior;
  const out: Grade = { tint: [0, 0, 0], exposure: 0, sat: 0, contrast: 0, lift: [0, 0, 0] };
  for (const k of ['shallows', 'basin', 'forest', 'cave', 'shelf', 'trench', 'sanctum'] as const) {
    const w = zone[k];
    const g = GRADES[k];
    for (let i = 0; i < 3; i++) {
      out.tint[i] += g.tint[i] * w;
      out.lift[i] += g.lift[i] * w;
    }
    out.exposure += g.exposure * w;
    out.sat += g.sat * w;
    out.contrast += g.contrast * w;
  }
  return out;
}

// ---------------------------------------------------------------------------

interface Level {
  down: RenderTexture;
  up: RenderTexture;
  w: number;
  h: number;
}

export interface PostOptions {
  time: number;
  cssW: number;
  cssH: number;
  /** null while on foot indoors. */
  zone: ZoneWeights | null;
  /** The preset's strengths, already combined with the Settings toggles (0 = off). */
  tone: number;
  grade: number;
  bloom: number;
  vignette: number;
  grain: number;
  bloomThreshold: number;
  bloomGlowFeed: number;
  /** G3: god rays strength (0 = off, pass skipped), march steps, and the sway phase. */
  rays: number;
  raySteps: number;
  rayPhase: number;
}

function quad(): Geometry {
  return new Geometry({ attributes: { aPosition: [0, 0, 1, 0, 1, 1, 0, 1] }, indexBuffer: [0, 1, 2, 0, 2, 3] });
}

export class PostStack {
  /** The final pass; goes on the stage, with the crisp overlays after it. */
  readonly view: Mesh<Geometry, Shader>;
  /** True when the world picture is half-float. False is the 8-bit fallback (or the toggle is off). */
  halfFloat = false;
  private scene!: RenderTexture;
  private levels: Level[] = [];
  private prefilter: Mesh<Geometry, Shader>;
  private downs: Mesh<Geometry, Shader>[] = [];
  private ups: Mesh<Geometry, Shader>[] = [];
  private finalShader: Shader;
  private rays!: RenderTexture;
  private raysMesh: Mesh<Geometry, Shader>;
  private ru: { uP: Float32Array; uSun: Float32Array };
  private raysOn = false;
  private fu: { uResolution: Float32Array; uTime: number; uFlags: Float32Array; uTint: Float32Array; uGrade: Float32Array; uLift: Float32Array; uMode: Float32Array; uRayCol: Float32Array };
  private pu: { uTexel: Float32Array; uGlowTexel: Float32Array; uParams: Float32Array };
  private width = 4;
  private height = 4;
  private useBloom = true;
  private wantHalf = true;
  private msaa = false;
  private canHalf = false;
  private bloomLevels = 4;
  private bloomScale = 0.5;

  constructor(
    private readonly renderer: Renderer,
    private readonly glow: RenderTexture,
    private readonly lit: RenderTexture,
  ) {
    this.canHalf = halfFloatSupported();
    // Make sure the context lets us render to half-float (Pixi asks for the float one itself).
    try {
      const gl = (renderer as unknown as { gl: WebGL2RenderingContext }).gl;
      gl.getExtension('EXT_color_buffer_float');
      gl.getExtension('EXT_color_buffer_half_float');
    } catch {
      /* the check above decides */
    }
    this.scene = this.makeRT(this.canHalf && this.wantHalf, false);

    this.prefilter = this.makePass(PREFILTER, {
      prefilterUniforms: { uTexel: { value: new Float32Array([1, 1]), type: 'vec2<f32>' }, uGlowTexel: { value: new Float32Array([1, 1]), type: 'vec2<f32>' }, uParams: { value: new Float32Array([0.9, 0.5, 0.5, 0]), type: 'vec4<f32>' } },
      uSrc: this.scene.source,
      uGlow: this.glow.source,
    }, 'prefilterUniforms');
    this.pu = (this.prefilter.shader as Shader).resources.prefilterUniforms.uniforms;

    this.finalShader = Shader.from({
      gl: { vertex: FULLSCREEN_VERTEX, fragment: FINAL, name: 'fathomlight-post' },
      resources: {
        postUniforms: {
          uResolution: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
          uTime: { value: 0, type: 'f32' },
          uFlags: { value: new Float32Array([1, 0.6, 1, 1]), type: 'vec4<f32>' },
          uTint: { value: new Float32Array([1, 1, 1, 1]), type: 'vec4<f32>' },
          uGrade: { value: new Float32Array([1, 1, 0, 0]), type: 'vec4<f32>' },
          uLift: { value: new Float32Array([0, 0, 0, 0]), type: 'vec4<f32>' },
          uMode: { value: new Float32Array([1, 0, 0, 0]), type: 'vec4<f32>' },
          uRayCol: { value: new Float32Array([0, 0, 0, 0]), type: 'vec4<f32>' },
        },
        uScene: this.scene.source,
        uBloom: this.scene.source,
        uRays: this.scene.source,
      },
    });
    this.fu = this.finalShader.resources.postUniforms.uniforms;
    this.rays = RenderTexture.create({ width: 4, height: 4, antialias: false, scaleMode: 'linear' });
    this.raysMesh = this.makePass(RAYS, { rayUniforms: { uP: { value: new Float32Array([10, 0, 0, 0]), type: 'vec4<f32>' }, uSun: { value: new Float32Array([0.55, -0.35]), type: 'vec2<f32>' } }, uLit: this.lit.source }, 'rayUniforms');
    this.ru = (this.raysMesh.shader as Shader).resources.rayUniforms.uniforms;
    this.view = new Mesh({ geometry: quad(), shader: this.finalShader });
  }

  private makeRT(half: boolean, msaa: boolean): RenderTexture {
    this.halfFloat = half;
    this.msaa = msaa;
    return RenderTexture.create({ width: 4, height: 4, antialias: msaa, scaleMode: 'linear', ...(half ? { format: 'rgba16float' as const } : {}) });
  }

  private makePass(fragment: string, resources: Record<string, unknown>, group: string): Mesh<Geometry, Shader> {
    void group;
    const shader = Shader.from({ gl: { vertex: RT_VERTEX, fragment, name: 'fathomlight-bloom' }, resources: resources as never });
    return new Mesh({ geometry: quad(), shader });
  }

  /** The picture the world is drawn into each frame. */
  get sceneRT(): RenderTexture {
    return this.scene;
  }

  /** Is this the half-float path the preset asked for, and does the device allow it? */
  get supportsHalfFloat(): boolean {
    return this.canHalf;
  }

  /**
   * Call on every size or setting change. `hdr` asks for half-float (the
   * fallback to 8-bit is automatic), `levels` is how many halving steps the
   * bloom blur uses, and `bloom` false skips the chain entirely.
   */
  resize(cssW: number, cssH: number, res: number, hdr: boolean, levels: number, bloom: boolean, scale: number, msaa: boolean): void {
    this.useBloom = bloom;
    this.bloomLevels = levels;
    this.bloomScale = scale;
    const half = hdr && this.canHalf;
    let oldScene: RenderTexture | null = null;
    if (half !== this.halfFloat || this.wantHalf !== hdr || msaa !== this.msaa) {
      this.wantHalf = hdr;
      oldScene = this.scene;
      this.scene = this.makeRT(half, msaa);
    }
    this.scene.resize(cssW, cssH, res);
    this.width = Math.max(1, Math.round(cssW * res));
    this.height = Math.max(1, Math.round(cssH * res));
    // God rays are drawn at a quarter of the screen: soft by nature.
    this.rays.resize(Math.max(2, Math.round(this.width / 4)), Math.max(2, Math.round(this.height / 4)), 1);
    this.finalShader.resources.uRays = this.rays.source;
    this.rebuildLevels();
    // Only now that every shader points at the new pictures is it safe to free the old one.
    oldScene?.destroy(true);
  }

  /** (Re)create the bloom chain: each level is half the size of the one before. */
  private rebuildLevels(): void {
    const oldLevels = this.levels;
    const oldPasses = [...this.downs, ...this.ups].filter(Boolean);
    this.levels = [];
    this.downs = [];
    this.ups = [];
    if (this.useBloom) {
      let w = this.width;
      let h = this.height;
      for (let i = 0; i < this.bloomLevels; i++) {
        // The first step is `bloomScale` of the screen (1/2 on Ultra, 1/4 on High); each one after halves again.
        const f = i === 0 ? this.bloomScale : 0.5;
        w = Math.max(2, Math.ceil(w * f));
        h = Math.max(2, Math.ceil(h * f));
        const down = this.makeLevelRT(w, h);
        const up = i === this.bloomLevels - 1 ? down : this.makeLevelRT(w, h);
        this.levels.push({ down, up, w, h });
      }
      // Shaders: level 0 is filled by the prefilter, the rest by downsampling the one before.
      for (let i = 1; i < this.levels.length; i++) {
        const prev = this.levels[i - 1].down;
        this.downs[i] = this.makePass(DOWN, { downUniforms: { uTexel: { value: new Float32Array([1 / this.levels[i - 1].w, 1 / this.levels[i - 1].h]), type: 'vec2<f32>' } }, uSrc: prev.source }, 'downUniforms');
      }
      for (let i = this.levels.length - 2; i >= 0; i--) {
        const low = this.levels[i + 1].up;
        this.ups[i] = this.makePass(
          UP,
          { upUniforms: { uTexel: { value: new Float32Array([1 / this.levels[i + 1].w, 1 / this.levels[i + 1].h]), type: 'vec2<f32>' }, uWeight: { value: 0.65, type: 'f32' } }, uBase: this.levels[i].down.source, uLow: low.source },
          'upUniforms',
        );
      }
    }
    this.prefilter.shader!.resources.uSrc = this.scene.source;
    this.finalShader.resources.uScene = this.scene.source;
    this.finalShader.resources.uBloom = this.levels.length ? this.levels[0].up.source : this.scene.source;
    // The old chain is no longer referenced by anything that will draw: free it.
    for (const m of oldPasses) {
      // Unbind the pictures first, so freeing them doesn't leave a shader pointing at a destroyed texture.
      const r = m.shader!.resources as Record<string, unknown>;
      for (const k of ['uSrc', 'uBase', 'uLow']) if (k in r) r[k] = Texture.EMPTY.source;
      m.destroy({ children: true });
    }
    for (const l of oldLevels) {
      l.down.destroy(true);
      if (l.up !== l.down) l.up.destroy(true);
    }
  }

  private makeLevelRT(w: number, h: number): RenderTexture {
    const rt = RenderTexture.create({ width: w, height: h, antialias: false, scaleMode: 'linear', ...(this.halfFloat ? { format: 'rgba16float' as const } : {}) });
    return rt;
  }

  /** Update every uniform for this frame. */
  update(o: PostOptions): void {
    const f = this.fu;
    f.uTime = o.time;
    f.uResolution[0] = o.cssW;
    f.uResolution[1] = o.cssH;
    const g = gradeFor(o.zone);
    const a = o.grade;
    const mix = (x: number, n: number) => n + (x - n) * a;
    f.uFlags[0] = o.tone;
    f.uFlags[1] = o.bloom;
    f.uFlags[2] = o.vignette;
    f.uFlags[3] = o.grain;
    f.uTint[0] = mix(g.tint[0], 1);
    f.uTint[1] = mix(g.tint[1], 1);
    f.uTint[2] = mix(g.tint[2], 1);
    f.uTint[3] = mix(g.exposure, 1);
    f.uGrade[0] = mix(g.sat, 1);
    f.uGrade[1] = mix(g.contrast, 1);
    f.uLift[0] = g.lift[0] * a;
    f.uLift[1] = g.lift[1] * a;
    f.uLift[2] = g.lift[2] * a;
    this.raysOn = o.rays > 0.01;
    f.uMode[1] = this.raysOn ? 1 : 0;
    f.uRayCol[0] = 0.78 * o.rays;
    f.uRayCol[1] = 0.94 * o.rays;
    f.uRayCol[2] = 0.9 * o.rays;
    this.ru.uP[0] = o.raySteps;
    this.ru.uP[1] = o.time;
    this.ru.uP[2] = o.rayPhase;
    f.uMode[0] = this.useBloom && this.levels.length > 0 ? 1 : 0;
    // The prefilter's taps are spaced so they still cover every source pixel when the first step is smaller than half.
    const step = 0.5 / this.bloomScale;
    this.pu.uTexel[0] = step / this.width;
    this.pu.uTexel[1] = step / this.height;
    this.pu.uGlowTexel[0] = 1 / Math.max(1, this.glow.source.pixelWidth);
    this.pu.uGlowTexel[1] = 1 / Math.max(1, this.glow.source.pixelHeight);
    this.pu.uParams[0] = o.bloomThreshold;
    this.pu.uParams[1] = 0.45;
    this.pu.uParams[2] = o.bloomGlowFeed;
  }

  /** The god rays pass (skipped when they are off or too deep to matter). */
  renderRays(): void {
    if (this.raysOn) this.renderer.render({ container: this.raysMesh, target: this.rays, clear: false });
  }

  /** Run the bloom chain (after the world has been drawn into `sceneRT`). */
  renderBloom(): void {
    if (!this.useBloom || !this.levels.length) return;
    const r = this.renderer;
    r.render({ container: this.prefilter, target: this.levels[0].down, clear: false });
    for (let i = 1; i < this.levels.length; i++) r.render({ container: this.downs[i], target: this.levels[i].down, clear: false });
    for (let i = this.levels.length - 2; i >= 0; i--) r.render({ container: this.ups[i], target: this.levels[i].up, clear: false });
  }
}
