/**
 * Graphics presets (DESIGN.md, Platform and tech).
 *
 * A preset is just a bundle of numbers that the scene reads. Every effect is
 * on in both presets; Ultra turns the dials up and adds a few extras that the
 * phone does not need (see PROGRESS.md for the full table).
 */

export type PresetId = 'high' | 'ultra';
export type PresetChoice = PresetId | 'auto';

export interface Preset {
  id: PresetId;
  label: string;
  /** Frame-rate cap. High aims for a smooth 60, Ultra allows up to 120. */
  maxFps: number;
  /** Most pixels per CSS pixel we will render (iPhone screens are 3x). */
  maxPixelRatio: number;
  /** Upper bound on the drawing surface, so Ultra stops at 4K. */
  maxBackbufferPixels: number;
  /** Drifting specks of "marine snow" per 1000x1000 CSS pixels of screen. */
  particleDensity: number;
  /** Layers of distant rock between the water and the seabed. */
  parallaxLayers: number;
  /** Ultra only: the diver casts a soft moving shadow on the seabed. */
  softShadows: boolean;
  /** Most dynamic lights the lighting shader adds up per pixel. */
  maxLights: number;
  /** Ultra splits caustics into red, green and blue for a rainbow fringe. */
  chromaticCaustics: boolean;
  /** Sharpness of the glow (bloom) layer, as a fraction of the screen. */
  glowResolution: number;
  /** Blur passes for the glow; more passes = smoother halos. */
  glowQuality: number;
  /** Extra kelp, coral and foreground plants. 1 = normal. */
  detail: number;

  // ---- Graphics session G1: the HDR post stack. Each has a Settings toggle (FxToggles). ----
  /** Draw the world into a half-float picture (falls back to ordinary 8-bit where the device cannot). */
  hdr: boolean;
  /** Tone mapping: bright light rolls off softly instead of clipping flat. 0 = off, 1 = full. */
  toneMap: number;
  /** Colour grading per zone, 0..1. */
  grade: number;
  /** Bloom: how much bright things glow, how many halving steps the blur uses, and the brightness where it starts. */
  bloom: number;
  bloomLevels: number;
  /** Size of the first bloom picture as a fraction of the screen (the rest halve from there). */
  bloomScale: number;
  bloomThreshold: number;
  /** How much of the old glow layer is fed into the bloom as well. */
  bloomGlowFeed: number;
  /** The edge darkening (moved from CSS into the final pass), 0..1. */
  vignette: number;
  /** Fine film grain, 0..1 (also dithers 8-bit output). */
  grain: number;
  /**
   * Antialias the world picture itself. The canvas no longer needs MSAA (the screen is one full-screen quad),
   * but the world's own edges (rock ridges, emissive shapes) do on a screen that is not very dense. Ultra only.
   */
  hdrMsaa: boolean;
  // ---- Graphics session G2: light with form and shadow. Each has a Settings toggle (FxToggles). ----
  /** How many lights cast shadows (the diver's lamp, the sub's lights), and how many steps each shadow march takes. */
  lightShadows: number;
  shadowSteps: number;
  /** Relief lighting from the art's own bumps and edges: strength (0 = off) and whether it samples twice as widely. */
  relief: number;
  reliefWide: boolean;
  /** Most contact shadows drawn where things meet the seabed, and how strong the base's are. */
  contactShadows: number;
  contactStrength: number;
  // ---- Graphics session G3: atmosphere and composition. Each has a Settings toggle (FxToggles). ----
  /** Zone silhouettes behind the play area (basin boulders and arches, distant kelp, shelf hulks): how visible, 0..1. */
  zoneAlpha: number;
  /** God rays from the surface: strength (0 = off) and march steps. */
  godRays: number;
  godRaySteps: number;
  /** Marine snow catching the lamp: strength, and how many big soft out-of-focus specks float past in front. */
  snowLight: number;
  bokeh: number;
  /** Soft blur on the near foreground kelp, in CSS pixels (0 = off; Ultra only). */
  dof: number;
  /** Caustic shimmer in the water just under the surface: strength. */
  shimmer: number;
  // ---- Graphics session G4: materials and life. Each has a Settings toggle (FxToggles). ----
  /** Painterly grime and grain anchored to the world (stronger on hardware), and the metal sheen on chrome and brass. */
  grime: number;
  sheen: number;
  /** The slow reflection streak across dome glass: strength (0 = off). */
  glassStreak: number;
  /** Lamp eye-shine on creatures: strength (0 = off). */
  eyeShine: number;
  /** Extra render scale (supersampling) when switched on in Settings (Ultra's default is off). */
  supersample: number;
  /** Leave out caustics where they cannot be seen (deep water, caves, shade). */
  skipHiddenCaustics: boolean;
}

/** Settings → Graphics toggles for the G1 effects, so each can be compared on and off. */
export interface FxToggles {
  hdr: boolean;
  tone: boolean;
  grade: boolean;
  bloom: boolean;
  vignette: boolean;
  grain: boolean;
  causticSkip: boolean;
  /** G2 */
  shadows: boolean;
  relief: boolean;
  contact: boolean;
  /** G3 */
  zones: boolean;
  rays: boolean;
  litSnow: boolean;
  dof: boolean;
  shimmer: boolean;
  /** G4 */
  grime: boolean;
  sheen: boolean;
  glass: boolean;
  eyes: boolean;
  supersample: boolean;
  /** Smooth edges (MSAA on the world picture). Missing = the preset's own choice (Ultra on, High off). */
  edges?: boolean;
  /** The dev performance overlay. */
  perf: boolean;
  /** Milestone 12: adaptive resolution (see renderScale). */
  adaptive: boolean;
}

export const FX_DEFAULT: FxToggles = { hdr: true, tone: true, grade: true, bloom: true, vignette: true, grain: true, causticSkip: true, shadows: true, relief: true, contact: true, zones: true, rays: true, litSnow: true, dof: true, shimmer: true, grime: true, sheen: true, glass: true, eyes: true, supersample: false, perf: false, adaptive: true };

const FX_KEY = 'fathomlight.fx';

export function loadFx(): FxToggles {
  try {
    const raw = localStorage.getItem(FX_KEY);
    if (raw) return { ...FX_DEFAULT, ...(JSON.parse(raw) as Partial<FxToggles>) };
  } catch {
    /* blocked or damaged: defaults */
  }
  return { ...FX_DEFAULT };
}

export function saveFx(fx: FxToggles): void {
  try {
    localStorage.setItem(FX_KEY, JSON.stringify(fx));
  } catch {
    /* ignore */
  }
}

const FOUR_K = 3840 * 2160;

export const PRESETS: Record<PresetId, Preset> = {
  high: {
    id: 'high',
    label: 'High',
    maxFps: 60,
    // 2x is still sharp on a Retina phone and leaves headroom for the heavy
    // effects coming in milestone 1. Revisit once those exist.
    maxPixelRatio: 2,
    maxBackbufferPixels: FOUR_K,
    particleDensity: 220,
    parallaxLayers: 3,
    softShadows: false,
    maxLights: 20,
    chromaticCaustics: false,
    glowResolution: 0.25,
    glowQuality: 2,
    detail: 1,
    // G1. High is the cheaper set: fewer bloom steps and a lighter grain. Cut from High first if the phone slows.
    hdr: true,
    toneMap: 1,
    grade: 1,
    bloom: 0.3,
    bloomLevels: 4,
    bloomScale: 0.25,
    bloomThreshold: 1.0,
    bloomGlowFeed: 0.18,
    vignette: 1,
    grain: 0.6,
    skipHiddenCaustics: true,
    hdrMsaa: false,
    // G2: the phone gets the lamp only, short marches, plain relief and few contact shadows.
    lightShadows: 1,
    shadowSteps: 10,
    relief: 0.55,
    reliefWide: false,
    contactShadows: 6,
    contactStrength: 0.4,
    // G3: the phone gets quiet versions: fainter silhouettes, short ray marches, a few bokeh specks, no blur.
    zoneAlpha: 0.8,
    godRays: 0.09,
    godRaySteps: 8,
    snowLight: 0.9,
    bokeh: 5,
    dof: 0,
    shimmer: 0.6,
    // G4: the phone gets lighter grime and sheen; supersampling is for the PC.
    grime: 0.35,
    sheen: 0.6,
    glassStreak: 0.7,
    eyeShine: 1,
    supersample: 1.25,
  },
  ultra: {
    id: 'ultra',
    label: 'Ultra',
    maxFps: 120,
    maxPixelRatio: 4,
    maxBackbufferPixels: FOUR_K,
    particleDensity: 600,
    parallaxLayers: 5,
    softShadows: true,
    maxLights: 32,
    chromaticCaustics: true,
    glowResolution: 0.5,
    glowQuality: 4,
    detail: 1.6,
    hdr: true,
    toneMap: 1,
    grade: 1,
    bloom: 0.34,
    bloomLevels: 6,
    bloomScale: 0.5,
    bloomThreshold: 1.0,
    bloomGlowFeed: 0.2,
    vignette: 1,
    grain: 1,
    skipHiddenCaustics: true,
    hdrMsaa: true,
    lightShadows: 3,
    shadowSteps: 22,
    relief: 0.8,
    reliefWide: true,
    contactShadows: 12,
    contactStrength: 0.5,
    zoneAlpha: 1,
    godRays: 0.14,
    godRaySteps: 14,
    snowLight: 1.3,
    bokeh: 12,
    dof: 2.4,
    shimmer: 1,
    grime: 0.55,
    sheen: 1,
    glassStreak: 1,
    eyeShine: 1,
    supersample: 1.5,
  },
};

const STORAGE_KEY = 'fathomlight.graphicsPreset';

/**
 * Auto-detect: anything with a touch screen as its main pointer (iPhone,
 * iPad) gets High; a computer with a mouse gets Ultra.
 */
export function detectPreset(): PresetId {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const iOS =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return coarse || iOS ? 'high' : 'ultra';
}

export function loadChoice(): PresetChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'high' || v === 'ultra' || v === 'auto') return v;
  } catch {
    /* private browsing can block storage; fall back to auto */
  }
  return 'auto';
}

export function saveChoice(choice: PresetChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* ignore */
  }
}

export function resolveChoice(choice: PresetChoice): Preset {
  return PRESETS[choice === 'auto' ? detectPreset() : choice];
}

/** Pixel ratio to render at, honouring the preset's sharpness and 4K caps. */
/** Graphics session G4: the Settings "Render scale" switch multiplies the pixel ratio (supersampling); 1 = off. */
export const renderBoost = { v: 1 };
/**
 * Milestone 12: adaptive resolution. When frames run slow for a few seconds,
 * main.ts lowers this in small steps (to 0.7 at the least) and raises it again
 * when there is headroom, so a heavy scene drops a little sharpness instead of
 * stuttering. Switch it off in Settings to see the full resolution always.
 */
export const renderScale = { v: 1 };
export const RENDER_SCALE_MIN = 0.7;

export function pixelRatioFor(preset: Preset, cssW: number, cssH: number): number {
  let r = Math.min(window.devicePixelRatio || 1, preset.maxPixelRatio) * renderBoost.v * renderScale.v;
  const pixels = cssW * cssH * r * r;
  if (pixels > preset.maxBackbufferPixels) r *= Math.sqrt(preset.maxBackbufferPixels / pixels);
  return Math.max(1, r);
}
