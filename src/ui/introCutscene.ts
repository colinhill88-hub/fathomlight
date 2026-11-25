import { audio } from '../audio/engine';
import shot1Url from '../art/intro/intro_01_tub.jpg';
import shot2Url from '../art/intro/intro_02_play.jpg';
import shot3Url from '../art/intro/intro_03_hold.jpg';
import shot4Url from '../art/intro/intro_04_plunge.jpg';
import shot5Url from '../art/intro/intro_05_underwater.jpg';

/**
 * Claymation stop-motion new-game intro cutscene (~21.5 seconds).
 *
 * Plays automatically when starting a brand-new dive (and can be replayed
 * from the pause menu). Uses a 12 fps stop-motion micro-cadence for the
 * bathtub claymation shots, live soap bubbles and rising underwater bubbles
 * on a canvas overlay, gentle synthesized music-box / water-plunge audio,
 * and dissolves through a bright bubble curtain straight into the live
 * starting ocean as Kestrel splashes into the water.
 */

interface ShotSpec {
  url: string;
  start: number;
  end: number;
  /** Stop-motion stepped cadence (true for claymation shots, false for final ocean glide). */
  stopMotion: boolean;
  /** Start/end camera zoom & pan (percent of frame). */
  s0: number;
  s1: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  rot0: number;
  rot1: number;
  caption?: string;
}

const TOTAL_DURATION = 21.5;
const PLUNGE_HANDOFF_AT = 19.6;

const SHOTS: ShotSpec[] = [
  {
    url: shot1Url,
    start: 0.0,
    end: 4.5,
    stopMotion: true,
    s0: 1.03,
    s1: 1.11,
    x0: -0.6,
    x1: 0.8,
    y0: 0.4,
    y1: -0.6,
    rot0: -0.25,
    rot1: 0.15,
    caption: 'Every ocean begins somewhere small.',
  },
  {
    url: shot2Url,
    start: 4.5,
    end: 9.2,
    stopMotion: true,
    s0: 1.08,
    s1: 1.15,
    x0: 1.0,
    x1: -1.1,
    y0: -0.5,
    y1: 0.7,
    rot0: 0.3,
    rot1: -0.3,
  },
  {
    url: shot3Url,
    start: 9.2,
    end: 13.2,
    stopMotion: true,
    s0: 1.04,
    s1: 1.14,
    x0: -0.5,
    x1: 0.4,
    y0: -0.4,
    y1: 0.6,
    rot0: -0.15,
    rot1: 0.2,
  },
  {
    url: shot4Url,
    start: 13.2,
    end: 17.5,
    stopMotion: true,
    s0: 1.04,
    s1: 1.14,
    x0: 0.2,
    x1: -0.2,
    y0: -1.8,
    y1: 2.2,
    rot0: 0.1,
    rot1: -0.1,
    caption: 'Into the deep, Kestrel.',
  },
  {
    url: shot5Url,
    start: 17.5,
    end: TOTAL_DURATION,
    stopMotion: false,
    s0: 1.05,
    s1: 1.16,
    x0: 0.0,
    x1: 0.0,
    y0: -1.5,
    y1: 2.5,
    rot0: 0.0,
    rot1: 0.0,
  },
];

interface BubbleParticle {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  wobble: number;
  phase: number;
  kind: 'soap' | 'water' | 'curtain';
  alpha: number;
}

export interface IntroCallbacks {
  /** Fired right as the underwater bubble curtain begins dissolving into live play (place Kestrel in the water!). */
  onPlunge(): void;
  /** Fired once the intro overlay is fully finished or skipped. */
  onFinish(): void;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Deterministic tiny hash for organic claymation frame-to-frame micro-wobble. */
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

export class IntroCutscene {
  private root: HTMLDivElement | null = null;
  private raf = 0;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private _active = false;
  private plunged = false;
  private callbacks: IntroCallbacks | null = null;

  get active(): boolean {
    return this._active;
  }

  /** Start the claymation intro cutscene. */
  play(callbacks: IntroCallbacks): void {
    if (this._active) return;
    this._active = true;
    this.plunged = false;
    this.callbacks = callbacks;
    document.body.classList.add('intro-playing');

    const root = document.createElement('div');
    root.id = 'intro-cutscene';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Fathomlight opening cutscene');

    const stage = document.createElement('div');
    stage.className = 'intro-stage';

    // Create image layers for all 5 claymation shots.
    const imgs: HTMLImageElement[] = SHOTS.map((shot, i) => {
      const img = document.createElement('img');
      img.className = 'intro-frame';
      img.src = shot.url;
      img.alt = '';
      img.decoding = 'async';
      img.style.opacity = i === 0 ? '1' : '0';
      stage.appendChild(img);
      return img;
    });

    // Subtle warm claymation vignette & film texture overlay.
    const vignette = document.createElement('div');
    vignette.className = 'intro-vignette';

    // Live FX canvas (iridescent soap bubbles, water droplets, underwater bubble curtain).
    const fxCanvas = document.createElement('canvas');
    fxCanvas.className = 'intro-fx';
    const ctx = fxCanvas.getContext('2d');

    // Poetic caption line.
    const caption = document.createElement('div');
    caption.className = 'intro-caption';

    // Minimal beat dots.
    const dots = document.createElement('div');
    dots.className = 'intro-dots';
    const dotEls: HTMLSpanElement[] = SHOTS.map(() => {
      const d = document.createElement('span');
      d.className = 'intro-dot';
      dots.appendChild(d);
      return d;
    });

    // Skip button (touch + mouse friendly).
    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'intro-skip';
    skipBtn.textContent = 'Skip ▸';
    skipBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    skipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.finish(true);
    });

    root.append(stage, vignette, fxCanvas, caption, dots, skipBtn);
    document.body.appendChild(root);
    this.root = root;

    // Size FX canvas cleanly to viewport.
    let vw = window.innerWidth;
    let vh = window.innerHeight;
    const sizeCanvas = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      fxCanvas.width = Math.max(1, Math.round(vw * dpr));
      fxCanvas.height = Math.max(1, Math.round(vh * dpr));
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeCanvas();
    this.resizeHandler = sizeCanvas;
    window.addEventListener('resize', sizeCanvas);

    // Keyboard skip (Escape / Space / Enter).
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.finish(true);
      }
    };
    window.addEventListener('keydown', this.keyHandler, true);

    // Particle pool for soap bubbles & underwater bubble surge.
    const particles: BubbleParticle[] = [];
    for (let i = 0; i < 22; i++) {
      particles.push({
        x: Math.random() * vw,
        y: vh * (0.2 + Math.random() * 0.9),
        r: 6 + Math.random() * 18,
        vy: -(18 + Math.random() * 26),
        vx: (Math.random() - 0.5) * 14,
        wobble: 8 + Math.random() * 16,
        phase: Math.random() * Math.PI * 2,
        kind: 'soap',
        alpha: 0.45 + Math.random() * 0.4,
      });
    }

    // Audio cue triggers (each fires once at its timestamp).
    const cuesFired = new Set<string>();
    const fireCue = (id: string, fn: () => void) => {
      if (cuesFired.has(id)) return;
      cuesFired.add(id);
      fn();
    };

    let t0 = 0;
    let prevNow = 0;
    let curtainSpawned = false;

    const tick = (now: number) => {
      if (!this._active) return;
      if (t0 === 0) {
        t0 = now;
        prevNow = now;
      }
      const dt = Math.min(0.05, (now - prevNow) / 1000);
      prevNow = now;
      const t = (now - t0) / 1000;

      // Gentle synthesized soundtrack cues.
      if (t >= 0.35) fireCue('chime1', () => this.playChime([523.25, 659.25, 783.99], 0.065));
      if (t >= 4.7) fireCue('playPop1', () => this.playBubblePop(540, 0.07));
      if (t >= 6.1) fireCue('chime2', () => this.playChime([587.33, 739.99, 880.0], 0.055));
      if (t >= 7.3) fireCue('playPop2', () => this.playBubblePop(660, 0.065));
      if (t >= 9.6) fireCue('chime3', () => this.playChime([659.25, 783.99, 1046.5], 0.06));
      if (t >= 13.7) fireCue('plunge', () => this.playPlungeSound(0.24));
      if (t >= 17.8) fireCue('submerge', () => this.playChime([392.0, 523.25, 659.25], 0.075));

      // Trigger the live game Kestrel splash-in right as the underwater bubble curtain rises!
      if (t >= PLUNGE_HANDOFF_AT && !this.plunged) {
        this.plunged = true;
        this.playPlungeSound(0.18);
        this.callbacks?.onPlunge();
      }

      // Fade the whole overlay cleanly into the live game during the final 1.9 seconds.
      const fadeOut = 1 - smoothstep(PLUNGE_HANDOFF_AT, TOTAL_DURATION, t);
      const fadeIn = smoothstep(0.0, 0.65, t);
      root.style.opacity = String(fadeIn);
      stage.style.opacity = String(fadeOut);
      vignette.style.opacity = String(fadeOut);
      caption.style.opacity = String(Math.min(fadeOut, 1));
      dots.style.opacity = String(fadeOut * 0.85);
      skipBtn.style.opacity = String(fadeOut);

      // Update each claymation shot layer (12 fps stop-motion cadence on shots 1-4, silky 60 fps on shot 5).
      let activeCaption = '';
      let activeCaptionAlpha = 0;

      for (let i = 0; i < SHOTS.length; i++) {
        const shot = SHOTS[i];
        const img = imgs[i];
        const xfade = 0.65;

        let alpha = 0;
        if (i === 0) {
          alpha = 1 - smoothstep(shot.end - xfade, shot.end + 0.1, t);
        } else if (i === SHOTS.length - 1) {
          alpha = smoothstep(shot.start - xfade, shot.start + 0.1, t);
        } else {
          const inA = smoothstep(shot.start - xfade, shot.start + 0.1, t);
          const outA = 1 - smoothstep(shot.end - xfade, shot.end + 0.1, t);
          alpha = Math.min(inA, outA);
        }

        img.style.opacity = alpha > 0.002 ? alpha.toFixed(3) : '0';
        dotEls[i].classList.toggle('on', t >= shot.start - 0.1 && t < shot.end);

        if (alpha > 0.002) {
          const rawP = clamp01((t - shot.start) / (shot.end - shot.start));
          // 12 fps stop-motion quantization gives authentic claymation charm!
          const frameIdx = Math.floor(t * 12);
          const p = shot.stopMotion ? Math.floor(rawP * (shot.end - shot.start) * 12) / ((shot.end - shot.start) * 12) : rawP;
          const s = shot.s0 + (shot.s1 - shot.s0) * p;
          const x = shot.x0 + (shot.x1 - shot.x0) * p;
          const y = shot.y0 + (shot.y1 - shot.y0) * p;
          const rot = shot.rot0 + (shot.rot1 - shot.rot0) * p;

          // Tiny handmade claymation frame micro-wobble (subtle, charming, never nauseating).
          const jx = shot.stopMotion ? (hash(frameIdx + i * 31) - 0.5) * 0.14 : 0;
          const jy = shot.stopMotion ? (hash(frameIdx + i * 73 + 9) - 0.5) * 0.14 : 0;
          const jrot = shot.stopMotion ? (hash(frameIdx + i * 19 + 3) - 0.5) * 0.18 : 0;

          img.style.transform = `translate3d(${(x + jx).toFixed(2)}%, ${(y + jy).toFixed(2)}%, 0) scale(${s.toFixed(4)}) rotate(${(rot + jrot).toFixed(2)}deg)`;
        }

        if (shot.caption && t >= shot.start + 0.55 && t <= shot.end - 0.35) {
          const cIn = smoothstep(shot.start + 0.55, shot.start + 1.15, t);
          const cOut = 1 - smoothstep(shot.end - 0.95, shot.end - 0.35, t);
          const cA = Math.min(cIn, cOut);
          if (cA > activeCaptionAlpha) {
            activeCaption = shot.caption;
            activeCaptionAlpha = cA;
          }
        }
      }

      if (activeCaption && activeCaptionAlpha > 0.01) {
        caption.textContent = activeCaption;
        caption.style.opacity = (activeCaptionAlpha * fadeOut).toFixed(3);
      } else {
        caption.style.opacity = '0';
      }

      // Spawn underwater rising bubbles starting at Shot 4 (when the hand places Kestrel in the water).
      if (t >= 13.4 && t < 19.8 && particles.length < 75 && Math.random() < dt * 28) {
        particles.push({
          x: vw * (0.2 + Math.random() * 0.6),
          y: vh + 10 + Math.random() * 30,
          r: 2.5 + Math.random() * 8.5,
          vy: -(90 + Math.random() * 140),
          vx: (Math.random() - 0.5) * 28,
          wobble: 10 + Math.random() * 18,
          phase: Math.random() * Math.PI * 2,
          kind: 'water',
          alpha: 0.45 + Math.random() * 0.45,
        });
      }

      // Burst a lush underwater bubble curtain across the lens to seamlessly bridge into the live ocean!
      if (t >= PLUNGE_HANDOFF_AT - 0.45 && !curtainSpawned) {
        curtainSpawned = true;
        for (let i = 0; i < 95; i++) {
          particles.push({
            x: Math.random() * vw,
            y: vh + Math.random() * vh * 0.65,
            r: 4 + Math.random() * 18,
            vy: -(280 + Math.random() * 340),
            vx: (Math.random() - 0.5) * 50,
            wobble: 14 + Math.random() * 24,
            phase: Math.random() * Math.PI * 2,
            kind: 'curtain',
            alpha: 0.55 + Math.random() * 0.4,
          });
        }
      }

      // Render live bubbles on the FX canvas.
      if (ctx) {
        ctx.clearRect(0, 0, vw, vh);
        const soapGlobalAlpha = 1 - smoothstep(12.2, 13.8, t);
        const curtainFade = 1 - smoothstep(PLUNGE_HANDOFF_AT + 0.6, TOTAL_DURATION, t);

        for (let i = particles.length - 1; i >= 0; i--) {
          const b = particles[i];
          b.y += b.vy * dt;
          b.x += (b.vx + Math.sin(t * 2.4 + b.phase) * b.wobble) * dt;

          if (b.kind === 'soap') {
            if (b.y < -b.r * 2) {
              b.y = vh + b.r * 2;
              b.x = Math.random() * vw;
            }
            const a = b.alpha * soapGlobalAlpha;
            if (a <= 0.01) continue;
            // Iridescent warm-lit soap bubble
            const g = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.08, b.x, b.y, b.r);
            g.addColorStop(0, `rgba(255, 252, 238, ${(a * 0.72).toFixed(3)})`);
            g.addColorStop(0.55, `rgba(170, 238, 245, ${(a * 0.16).toFixed(3)})`);
            g.addColorStop(0.85, `rgba(255, 210, 235, ${(a * 0.32).toFixed(3)})`);
            g.addColorStop(1, `rgba(160, 240, 255, ${(a * 0.52).toFixed(3)})`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
            // Tiny warm window-lamp specular highlight
            ctx.fillStyle = `rgba(255, 250, 230, ${(a * 0.85).toFixed(3)})`;
            ctx.beginPath();
            ctx.ellipse(b.x - b.r * 0.34, b.y - b.r * 0.32, b.r * 0.22, b.r * 0.12, -0.6, 0, Math.PI * 2);
            ctx.fill();
          } else {
            if (b.y < -b.r * 2) {
              particles.splice(i, 1);
              continue;
            }
            const a = b.alpha * (b.kind === 'curtain' ? curtainFade : fadeOut);
            if (a <= 0.01) continue;
            // Bright silver-turquoise underwater bubble
            const g = ctx.createRadialGradient(b.x - b.r * 0.28, b.y - b.r * 0.28, b.r * 0.1, b.x, b.y, b.r);
            g.addColorStop(0, `rgba(240, 255, 255, ${(a * 0.92).toFixed(3)})`);
            g.addColorStop(0.6, `rgba(145, 238, 242, ${(a * 0.30).toFixed(3)})`);
            g.addColorStop(1, `rgba(95, 210, 225, ${(a * 0.55).toFixed(3)})`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      if (t >= TOTAL_DURATION) {
        this.finish(false);
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };

    // Wait briefly for the first claymation image to decode so there is zero blank flash.
    const startLoop = () => {
      if (!this._active) return;
      this.raf = requestAnimationFrame(tick);
    };
    if (imgs[0].complete) {
      startLoop();
    } else {
      imgs[0].addEventListener('load', startLoop, { once: true });
      imgs[0].addEventListener('error', startLoop, { once: true });
    }
  }

  private finish(skipped: boolean): void {
    if (!this._active) return;
    this._active = false;
    cancelAnimationFrame(this.raf);
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler, true);
      this.keyHandler = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    this.root?.remove();
    this.root = null;
    document.body.classList.remove('intro-playing');

    const cb = this.callbacks;
    this.callbacks = null;
    if (skipped && !this.plunged) {
      this.plunged = true;
      cb?.onPlunge();
    }
    cb?.onFinish();
  }

  /** Warm, gentle music-box / celesta arpeggio via the existing Web Audio context. */
  private playChime(freqs: number[], gainLevel: number): void {
    const ac = audio.ctx;
    if (!ac || ac.state !== 'running' || audio.settings.muted) return;
    const dest = audio.buses?.ui?.dry ?? ac.destination;
    const now = ac.currentTime;
    freqs.forEach((f, idx) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.24);
      g.gain.setValueAtTime(0.0001, now + idx * 0.24);
      g.gain.linearRampToValueAtTime(gainLevel, now + idx * 0.24 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.24 + 2.2);
      osc.connect(g).connect(dest);
      osc.start(now + idx * 0.24);
      osc.stop(now + idx * 0.24 + 2.3);
    });
  }

  /** Playful tiny bathtub soap-bubble pop. */
  private playBubblePop(baseFreq: number, gainLevel: number): void {
    const ac = audio.ctx;
    if (!ac || ac.state !== 'running' || audio.settings.muted) return;
    const dest = audio.buses?.ui?.dry ?? ac.destination;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 0.65, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.65, now + 0.09);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gainLevel, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(g).connect(dest);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  /** Warm water-entry plunge & bubble rush when Kestrel enters the water. */
  private playPlungeSound(gainLevel: number): void {
    const ac = audio.ctx;
    if (!ac || ac.state !== 'running' || audio.settings.muted || !audio.noise) return;
    const dest = audio.buses?.ui?.dry ?? ac.destination;
    const now = ac.currentTime;

    // Filtered noise splash
    const src = ac.createBufferSource();
    src.buffer = audio.noise;
    const filt = ac.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(950, now);
    filt.frequency.exponentialRampToValueAtTime(280, now + 1.15);
    filt.Q.setValueAtTime(1.4, now);

    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gainLevel, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);

    src.connect(filt).connect(g).connect(dest);
    src.start(now);
    src.stop(now + 1.4);

    // Rising underwater bubbles after splash
    for (let i = 0; i < 4; i++) {
      const delay = 0.18 + i * 0.16;
      const osc = ac.createOscillator();
      const bg = ac.createGain();
      osc.type = 'sine';
      const f = 320 + i * 110;
      osc.frequency.setValueAtTime(f * 0.7, now + delay);
      osc.frequency.exponentialRampToValueAtTime(f * 1.45, now + delay + 0.11);
      bg.gain.setValueAtTime(0.0001, now + delay);
      bg.gain.linearRampToValueAtTime(gainLevel * 0.28, now + delay + 0.02);
      bg.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.14);
      osc.connect(bg).connect(dest);
      osc.start(now + delay);
      osc.stop(now + delay + 0.16);
    }
  }
}
