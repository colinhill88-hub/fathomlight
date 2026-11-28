import { audio } from '../audio/engine';
import { getPropArt } from '../art/propArt';
import { europaArt, type VoyageArtKey } from '../art/europaArt';

/**
 * Beyond Earth (Nov 27, 2026): the Petrel's voyages, drawn in code on a canvas.
 *
 *  'launch'  the first time (about 22 s): the Petrel on her platform at dusk, the countdown,
 *            lift-off over the sea, the Earth falling away into black, the cold moon growing,
 *            the landing on the ice and the drill boring down; then "Europa: under the ice".
 *  'out'     later trips out (about 9 s): lift-off, the moon, the ice.
 *  'home'    the trip home (about 9 s): up out of the ice, the blue Earth growing, a splash down
 *            beside the platform.
 *
 * Victorian watercolor palette: gunmetal and brass, amber lamps, a soft wash. Choir colours
 * only in the ship's core. Any tap on Skip (or Escape) ends it at once.
 */

export type VoyageKind = 'launch' | 'out' | 'home';

const LENGTH: Record<VoyageKind, number> = { launch: 22, out: 9, home: 9 };

const smooth = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};
const seg = (t: number, a: number, b: number) => smooth((t - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class VoyageCutscene {
  active = false;
  private root: HTMLDivElement | null = null;
  private raf = 0;
  private onDone: (() => void) | null = null;
  private stars: { x: number; y: number; r: number; tw: number }[] = [];
  private keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.finish();
    }
  };

  constructor() {
    for (let i = 0; i < 220; i++) this.stars.push({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.4, tw: Math.random() * 10 });
  }

  play(kind: VoyageKind, onDone: () => void): void {
    if (this.active) return;
    this.active = true;
    this.onDone = onDone;
    const root = document.createElement('div');
    root.id = 'voyage-cutscene';
    const canvas = document.createElement('canvas');
    const caption = document.createElement('div');
    caption.className = 'voyage-caption';
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'intro-skip';
    skip.textContent = 'Skip ▸';
    skip.addEventListener('pointerdown', (e) => e.stopPropagation());
    skip.addEventListener('click', (e) => {
      e.stopPropagation();
      this.finish();
    });
    root.append(canvas, caption, skip);
    document.body.appendChild(root);
    this.root = root;
    window.addEventListener('keydown', this.keyHandler, true);
    const ctx = canvas.getContext('2d')!;
    const total = LENGTH[kind];
    const start = performance.now();
    const sounds = new Set<string>();
    const once = (id: string, fn: () => void) => {
      if (sounds.has(id)) return;
      sounds.add(id);
      try {
        fn();
      } catch {
        /* sound is optional */
      }
    };
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      let text = '';
      if (kind === 'home') text = this.drawHome(ctx, w, h, t, once);
      // A later trip out plays the lift-off (4-7 s of the full one), then cruise and landing (14-22 s) a little faster.
      else text = this.drawOut(ctx, w, h, kind === 'launch' ? t : t < 3 ? 4 + t : 14 + (t - 3) * (8 / 6), kind === 'launch', once);
      caption.textContent = text;
      caption.style.opacity = text ? '1' : '0';
      if (t >= total) {
        this.finish();
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private finish(): void {
    if (!this.active) return;
    this.active = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.keyHandler, true);
    this.root?.remove();
    this.root = null;
    const done = this.onDone;
    this.onDone = null;
    done?.();
  }

  // ---------------------------------------------------------------------------

  /** Draw one of Colin's voyage paintings (Nov 28, 2026) to cover the screen; false if it isn't loaded.
   * zoom grows it around (fx, fy) of the painting; dy slides it down the screen. */
  private paint(ctx: CanvasRenderingContext2D, key: VoyageArtKey, w: number, h: number, o: { zoom?: number; fx?: number; fy?: number; dy?: number; alpha?: number } = {}): boolean {
    const img = europaArt()?.voyageImg[key];
    if (!img) return false;
    const k = Math.max(w / img.width, h / img.height) * (o.zoom ?? 1);
    const iw = img.width * k;
    const ih = img.height * k;
    // Kept covering the screen; a slide down (dy) may uncover the sky above, which is drawn under it.
    const x = Math.max(w - iw, Math.min(0, w / 2 - iw * (o.fx ?? 0.5)));
    const y = Math.max(h - ih, Math.min(0, h / 2 - ih * (o.fy ?? 0.5))) + (o.dy ?? 0);
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.drawImage(img, x, y, iw, ih);
    ctx.restore();
    return true;
  }

  private sky(ctx: CanvasRenderingContext2D, w: number, h: number, space: number): void {
    // Dusk over the sea, darkening to space.
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, mix('#2a3a6a', '#02040a', space));
    g.addColorStop(0.55, mix('#e8a27a', '#05070f', space));
    g.addColorStop(1, mix('#f4d6a0', '#070a12', space));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (space > 0.05) {
      for (const s of this.stars) {
        ctx.globalAlpha = space * (0.5 + 0.5 * Math.sin(performance.now() / 700 + s.tw));
        ctx.fillStyle = '#f4f8ff';
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  private ship(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flame: number, angle = 0): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(s, s);
    // Flame and smoke.
    if (flame > 0) {
      for (let i = 0; i < 3; i++) {
        const fx = (i - 1) * 16;
        const len = 60 + flame * 120 + Math.random() * 30;
        const g = ctx.createLinearGradient(0, 0, 0, len);
        g.addColorStop(0, 'rgba(255,250,220,0.95)');
        g.addColorStop(0.3, 'rgba(255,190,90,0.85)');
        g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(fx - 10, 8);
        ctx.quadraticCurveTo(fx, len, fx + 10, 8);
        ctx.fill();
      }
    }
    // The painted finished Petrel (src/art/landmarks/petrel_5), when there is one.
    const painted = getPropArt().landmarks.petrel_5?.source?.resource as (CanvasImageSource & { width: number; height: number }) | undefined;
    if (painted && painted.width > 0) {
      const ph = 380;
      const pw = (ph * painted.width) / painted.height;
      ctx.drawImage(painted, -pw / 2, -ph + 14, pw, ph);
      ctx.restore();
      return;
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#161d20';
    // Fins.
    ctx.fillStyle = '#1b2124';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * 40, -10);
      ctx.lineTo(sd * 70, 8);
      ctx.lineTo(sd * 66, -70);
      ctx.lineTo(sd * 42, -90);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // Body.
    ctx.beginPath();
    ctx.moveTo(-46, 0);
    ctx.lineTo(-46, -230);
    ctx.quadraticCurveTo(-46, -330, 0, -340);
    ctx.quadraticCurveTo(46, -330, 46, -230);
    ctx.lineTo(46, 0);
    ctx.closePath();
    ctx.fillStyle = '#2f373b';
    ctx.fill();
    ctx.stroke();
    // Heat tiles.
    ctx.fillStyle = '#7a6a52';
    ctx.fillRect(-44, -108, 88, 106);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(-44, -330, 30, 330);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(14, -330, 30, 330);
    // Brass bands.
    ctx.fillStyle = '#b8913e';
    for (const y of [-112, -160, -230]) ctx.fillRect(-46, y, 92, 6);
    // Portholes and the Choir core.
    ctx.fillStyle = '#ffc46a';
    for (const [px, py] of [[-18, -134], [18, -134], [-18, -206], [18, -206]]) {
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#6ff3ff';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, -170, 13, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#b07cff';
    ctx.beginPath();
    ctx.ellipse(0, -170, 6, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Dome viewport.
    ctx.fillStyle = 'rgba(159,214,200,0.85)';
    ctx.beginPath();
    ctx.ellipse(0, -264, 18, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private sea(ctx: CanvasRenderingContext2D, w: number, y: number, h: number): void {
    const g = ctx.createLinearGradient(0, y, 0, h);
    g.addColorStop(0, '#3e7f86');
    g.addColorStop(1, '#0c2a33');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, w, h - y);
    ctx.strokeStyle = 'rgba(255,230,190,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const yy = y + 8 + i * 14;
      for (let x = 0; x <= w; x += 20) ctx.lineTo(x, yy + Math.sin(x * 0.03 + performance.now() / 500 + i) * 2);
      ctx.stroke();
    }
  }

  private moon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#f6f4ee');
    g.addColorStop(0.7, '#d8d2c4');
    g.addColorStop(1, '#9c9484');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // The long rust-brown cracks across the ice.
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(140,84,52,0.55)';
    ctx.lineWidth = Math.max(1, r * 0.015);
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      const a = i * 0.7;
      ctx.moveTo(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.2);
      ctx.quadraticCurveTo(x + Math.cos(a + 2) * r * 0.3, y + Math.sin(a + 1) * r * 0.3, x + Math.cos(a + 3.4) * r * 1.2, y + Math.sin(a + 3.4) * r * 1.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private earth(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#9fd8f0');
    g.addColorStop(0.6, '#2f7fa8');
    g.addColorStop(1, '#123a5a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // Land and cloud, clipped to the globe: a few soft, irregular shapes rather than one blob.
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(122,150,96,0.55)';
    for (const [dx, dy, rx, ry, a] of [[0.15, -0.2, 0.28, 0.14, 0.4], [0.3, 0.05, 0.16, 0.22, -0.3], [-0.35, 0.25, 0.2, 0.1, 0.8], [-0.1, 0.45, 0.12, 0.08, 0.2]]) {
      ctx.beginPath();
      ctx.ellipse(x + dx * r, y + dy * r, rx * r, ry * r, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = r * 0.025;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const cy = y + (i / 6 - 0.5) * r * 1.6;
      ctx.moveTo(x - r, cy);
      ctx.bezierCurveTo(x - r * 0.3, cy - r * 0.12, x + r * 0.2, cy + r * 0.1, x + r, cy - r * 0.05);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(180,220,255,0.4)';
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.02, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawOut(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, first: boolean, once: (id: string, fn: () => void) => void): string {
    const s = Math.min(w, h) / 900;
    // 0-4: on the platform, the countdown. 4-9: lift-off. 9-13: into space. 13-18: the moon. 18-22: landing and drilling.
    const lift = seg(t, 4, 9);
    const space = seg(t, 7, 12);
    this.sky(ctx, w, h, space);
    let caption = '';
    if (t < 13) {
      const seaY = h * 0.74 + lift * h * 0.9;
      // The Earth's curve as we climb. Painted: the dusk sea fades as she climbs, then the Earth from orbit fades in.
      const dusk = space < 0.6 && this.paint(ctx, 'dusk', w, h, { fy: 0.6, alpha: 1 - seg(lift, 0.25, 0.75) });
      const orbit = space > 0.3 && this.paint(ctx, 'space', w, h, { zoom: lerp(1.25, 1, space), fy: 0.55, alpha: seg(space, 0.3, 0.6) });
      if (!dusk && !orbit) {
        if (space > 0.3) this.earth(ctx, w / 2, seaY + w * 1.4, w * 1.6);
        else this.sea(ctx, w, seaY, h);
      }
      // The platform (the dusk painting has its own deck in the foreground).
      if (!dusk) {
        ctx.fillStyle = '#2f373b';
        ctx.fillRect(w / 2 - 220 * s, seaY - 14 * s, 440 * s, 16 * s);
        ctx.fillStyle = '#b8913e';
        ctx.fillRect(w / 2 - 220 * s, seaY, 440 * s, 4 * s);
      }
      // Clouds rushing past as she climbs (they thin out into space).
      if (lift > 0.05 && space < (orbit ? 0.45 : 0.9)) {
        ctx.fillStyle = `rgba(255,236,214,${0.55 * (1 - space)})`;
        for (let i = 0; i < 7; i++) {
          const cy = ((i * 0.17 + lift * 2.4) % 1.2) * h - h * 0.1;
          const cx = ((i * 0.37) % 1) * w;
          ctx.beginPath();
          ctx.ellipse(cx, cy, 160 * s + i * 20, 22 * s, 0, 0, Math.PI * 2);
          ctx.ellipse(cx + 90 * s, cy - 10 * s, 90 * s, 18 * s, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const shipY = seaY - 16 * s - lift * lift * h * 0.95;
      const shake = t > 3 && t < 7 ? (Math.random() - 0.5) * 4 : 0;
      const flame = t < 3 ? 0 : Math.min(1, (t - 3) / 1.2);
      this.ship(ctx, w / 2 + shake, Math.max(h * 0.42, shipY) + shake, s * (1 - space * 0.55), flame);
      if (first && t < 3.6) caption = t < 1.2 ? 'The Petrel is ready.' : t < 2.2 ? 'Three · two · one…' : 'Lift-off!';
      if (t > 3 && t < 3.3)
        once('ignite', () => {
          audio.thump({ freq: 70, gain: 0.5, dur: 1.4, bus: 'sfx' });
          audio.hiss({ dur: 4.5, gain: 0.22, type: 'lowpass', freq: 500, bus: 'sfx', brown: true });
        });
      if (t > 9 && t < 12) caption = first ? 'The Earth falls away beneath her.' : '';
    } else if (t < 18.5) {
      // Cruise: the cold moon grows.
      const k = seg(t, 13, 18.5);
      if (!this.paint(ctx, 'moon', w, h, { zoom: lerp(1, 2.6, k * k), fx: 0.67, fy: 0.46 })) this.moon(ctx, w * 0.62, h * 0.5, lerp(20, Math.max(w, h) * 0.55, k * k));
      this.ship(ctx, w * lerp(0.25, 0.42, k), h * lerp(0.6, 0.55, k), s * 0.32, 0.4, 0.9);
      caption = first ? (k < 0.5 ? 'Out past the Moon, toward a small, cold world.' : 'Europa. An ocean under the ice, and the Choir’s kin singing in it.') : '';
      once('moon', () => audio.bell({ freq: 523, gain: 0.12, decay: 3, bus: 'sfx' }));
    } else {
      // Landing on the ice, then the drill bores down and the screen goes to dark water.
      const k = seg(t, 18.5, 21);
      const ice = ctx.createLinearGradient(0, h * 0.6, 0, h);
      ice.addColorStop(0, '#dfe8ec');
      ice.addColorStop(1, '#8aa2b0');
      if (!this.paint(ctx, 'ice', w, h, { zoom: 1 + k * 0.08, fy: 0.6 })) {
        ctx.fillStyle = '#02040a';
        ctx.fillRect(0, 0, w, h);
        for (const st of this.stars) {
          ctx.fillStyle = 'rgba(244,248,255,0.7)';
          ctx.fillRect(st.x * w, st.y * h * 0.6, st.r, st.r);
        }
        ctx.fillStyle = ice;
        ctx.fillRect(0, h * 0.68, w, h * 0.32);
        ctx.strokeStyle = 'rgba(140,84,52,0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.8);
        ctx.lineTo(w, h * 0.74);
        ctx.stroke();
      }
      this.ship(ctx, w / 2, h * 0.68 + k * 80 * s, s * 0.7, k < 0.5 ? 0.3 : 0);
      once('land', () => audio.thump({ freq: 90, gain: 0.4, dur: 0.8, bus: 'sfx' }));
      // Fade to the dark water under the ice.
      ctx.fillStyle = `rgba(4,12,18,${seg(t, 20, 21.6)})`;
      ctx.fillRect(0, 0, w, h);
      caption = t > 20.4 ? 'EUROPA · under the ice' : first ? 'The drill bores down through the ice.' : '';
    }
    return caption;
  }

  private drawHome(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, once: (id: string, fn: () => void) => void): string {
    const s = Math.min(w, h) / 900;
    if (t < 5.5) {
      ctx.fillStyle = '#02040a';
      ctx.fillRect(0, 0, w, h);
      for (const st of this.stars) {
        ctx.fillStyle = 'rgba(244,248,255,0.75)';
        ctx.fillRect(st.x * w, st.y * h, st.r, st.r);
      }
      const k = seg(t, 0.5, 5.5);
      if (!this.paint(ctx, 'space', w, h, { zoom: lerp(1, 1.6, k), fy: 0.7, alpha: seg(t, 0, 2) })) this.earth(ctx, w * 0.6, h * 0.5, lerp(16, Math.max(w, h) * 0.6, k * k));
      this.ship(ctx, w * lerp(0.3, 0.45, k), h * 0.6, s * 0.3, 0.4, -0.9);
      once('home', () => audio.bell({ freq: 392, gain: 0.12, decay: 3, bus: 'sfx' }));
      return k < 0.6 ? 'Home, with the return tanks full of Europa’s brine.' : '';
    }
    // Splash down beside the platform.
    this.sky(ctx, w, h, 0);
    if (!this.paint(ctx, 'dusk', w, h, { fy: 0.6 })) this.sea(ctx, w, h * 0.74, h);
    const k = seg(t, 5.5, 8);
    this.ship(ctx, w / 2, lerp(h * 0.2, h * 0.74 - 16 * s, k), s, k < 0.9 ? 0.5 : 0);
    if (k > 0.95) once('splash', () => audio.thump({ freq: 120, gain: 0.35, dur: 0.6, bus: 'sfx' }));
    ctx.fillStyle = `rgba(10,30,40,${seg(t, 8, 9)})`;
    ctx.fillRect(0, 0, w, h);
    return k > 0.9 ? 'The Petrel settles back onto her platform.' : '';
  }
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(lerp((pa >> sh) & 255, (pb >> sh) & 255, t));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
