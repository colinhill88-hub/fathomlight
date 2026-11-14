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
    maxLights: 8,
    chromaticCaustics: false,
    glowResolution: 0.25,
    glowQuality: 2,
    detail: 1,
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
    maxLights: 12,
    chromaticCaustics: true,
    glowResolution: 0.5,
    glowQuality: 4,
    detail: 1.6,
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
export function pixelRatioFor(preset: Preset, cssW: number, cssH: number): number {
  let r = Math.min(window.devicePixelRatio || 1, preset.maxPixelRatio);
  const pixels = cssW * cssH * r * r;
  if (pixels > preset.maxBackbufferPixels) r *= Math.sqrt(preset.maxBackbufferPixels / pixels);
  return Math.max(1, r);
}
