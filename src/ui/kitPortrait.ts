import { Application, ColorMatrixFilter, Container, Graphics, Text, type Filter } from 'pixi.js';
import type { JarLook, KitLook } from '../actors/diver';
import { Walker, type KitPart } from '../actors/walker';

/*
 * Phase 17a: the Field kit's portrait of Kestrel is the real rig, not a
 * separate drawing. It is the on-foot rig (`src/actors/walker.ts`, the same
 * person the swimming diver is built from), standing calmly and breathing,
 * wearing exactly the kit the save has.
 *
 * It draws into its own small canvas with its own renderer, so the world's
 * picture behind the Field kit stays as it was (the world is paused). The
 * renderer is made the first time the Field kit opens and its ticker stops
 * while the Field kit is closed.
 *
 * Highlights: hovering, tapping or pad-focusing a card names a part. A part
 * the save has glows with a slow warm pulse and a halo behind it. A part not
 * found yet is drawn on Kestrel as a dark silhouette marked "???", so the
 * player sees there is a place for it without learning what it is.
 */

/** A warm gold, the Field kit's own colour (never the Choir's cyan, violet or magenta). */
const GOLD = 0xffd27a;

export class KitPortrait {
  readonly canvas = document.createElement('canvas');
  private app: Application | null = null;
  private starting: Promise<void> | null = null;
  private walker: Walker | null = null;
  private stage = new Container();
  private halo = new Graphics();
  private shadow = new Graphics();
  private rigHost = new Container();
  private label: Text | null = null;
  private glow = new ColorMatrixFilter();
  private dark = new ColorMatrixFilter();
  private kit: KitLook | null = null;
  private jar: JarLook | null = null;
  private part: KitPart | null = null;
  private known = true;
  private lit: { node: Container; was: Filter[] | null }[] = [];
  private time = 0;
  private running = false;
  /** Seconds until the next slow turn round (a calm, live pose, not a statue). */
  private turnIn = 9;

  constructor() {
    this.canvas.className = 'fk-rig';
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', "Kestrel, wearing the kit you've found");
    // Silhouette: every colour to a deep blue-black, keeping the shape's alpha.
    this.dark.matrix = [0, 0, 0, 0, 0.035, 0, 0, 0, 0, 0.06, 0, 0, 0, 0, 0.08, 0, 0, 0, 0.92, 0];
  }

  /** Make the renderer (once). Resolves when it can draw. */
  private start(): Promise<void> {
    if (this.starting) return this.starting;
    this.starting = (async () => {
      const app = new Application();
      await app.init({
        canvas: this.canvas,
        preference: 'webgl',
        backgroundAlpha: 0,
        antialias: true,
        width: 240,
        height: 300,
        resolution: Math.min(2, window.devicePixelRatio || 1),
        autoDensity: true,
        autoStart: false,
      });
      this.app = app;
      // The same compact, detailed Kestrel the game draws (no painted textures: they belong to the legacy rig).
      const w = (this.walker = new Walker(undefined, undefined, true, true, true));
      w.onGround = true;
      w.pose = 'stand';
      w.face = 1;
      // Out in the water the face plate stays down.
      w.visor = w.visorTarget = 0;
      w.lampOn = true;
      this.rigHost.addChild(w.view, w.lens);
      this.stage.addChild(this.shadow, this.halo, this.rigHost);
      app.stage.addChild(this.stage);
      app.ticker.add((t) => this.frame(Math.min(0.05, t.deltaMS / 1000)));
      this.applyLook();
    })().catch((err) => {
      // No second renderer (very old device): the portrait stays empty, the cards still work.
      console.warn('Field kit portrait unavailable', err);
    });
    return this.starting;
  }

  /** The kit to wear (from the save) and the jar's creature. */
  setKit(kit: KitLook, jar: JarLook | null): void {
    this.kit = kit;
    this.jar = jar;
    this.applyLook();
  }

  /**
   * Light up a part (or none). `known` false draws it as a dark "???"
   * silhouette: the portrait wears it for the moment, but as a shadow.
   */
  highlight(part: KitPart | null, known = true): void {
    if (part === this.part && known === this.known) return;
    this.part = part;
    this.known = known;
    this.applyLook();
  }

  show(): void {
    this.running = true;
    void this.start().then(() => {
      if (this.running) this.app?.ticker.start();
    });
  }

  hide(): void {
    this.running = false;
    this.app?.ticker.stop();
  }

  private applyLook(): void {
    const w = this.walker;
    if (!w || !this.kit) return;
    const k: KitLook = { ...this.kit };
    // A part not found yet is worn as a silhouette while its card is chosen.
    if (this.part && !this.known) wearPart(k, this.part);
    w.kit = k;
    w.jar = k.jar ? this.jar : null;
    // An unfound resonator's crystal would give away the Choir's colours: its light stays off as a silhouette.
    w.lens.visible = !(this.part === 'resonator' && !this.known);
    // Draw the new kit now, so the parts to light exist this frame.
    w.animate(1 / 60);
    for (const l of this.lit) l.node.filters = l.was;
    this.lit = [];
    if (this.label) this.label.visible = false;
    if (!this.part) return;
    const f = this.known ? this.glow : this.dark;
    for (const node of w.partNodes(this.part)) {
      if (!node.visible) continue;
      const was = (node.filters as Filter[] | null) ?? null;
      this.lit.push({ node, was });
      node.filters = [f];
    }
  }

  private frame(dt: number): void {
    const app = this.app;
    const w = this.walker;
    if (!app || !w) return;
    this.time += dt;
    // Fit the canvas to its box (the panel lays out differently on a phone).
    const box = this.canvas.parentElement?.getBoundingClientRect();
    if (box && box.width > 10) {
      const cw = Math.round(box.width);
      const ch = Math.round(Math.min(box.width * 1.25, Number.parseFloat(getComputedStyle(this.canvas).maxHeight) || 300));
      if (app.renderer.width !== cw || app.renderer.height !== ch) app.renderer.resize(cw, ch);
    }
    const W = app.renderer.width;
    const H = app.renderer.height;
    // Kestrel stands about 120 units tall with the tanks and harpoon: fit that with room for the halo.
    const s = Math.min(H / 132, W / 82);
    this.rigHost.scale.set(s);
    this.rigHost.position.set(W / 2, H * 0.9);
    // A slow turn now and then, so both sides of the kit show.
    this.turnIn -= dt;
    if (this.turnIn <= 0 && !this.part) {
      w.face = -w.face;
      this.turnIn = 10 + Math.random() * 4;
    }
    w.x = 0;
    w.y = 0;
    w.vx = w.vy = 0;
    w.animate(dt);
    // A soft patch of seabed shadow under the boots.
    this.shadow.clear().ellipse(W / 2, H * 0.9, 30 * s, 5 * s).fill({ color: 0x000000, alpha: 0.28 });
    // The glow: a slow warm pulse on the part, and a halo behind it.
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 4.2);
    const b = 1.18 + 0.32 * pulse;
    this.glow.matrix = [b, 0, 0, 0, 0.12 + 0.16 * pulse, 0, b * 0.97, 0, 0, 0.09 + 0.12 * pulse, 0, 0, b * 0.8, 0, 0.02, 0, 0, 0, 1, 0];
    this.halo.clear();
    if (this.part && this.lit.length) {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const { node } of this.lit) {
        const r = node.getBounds();
        if (r.width <= 0) continue;
        x0 = Math.min(x0, r.x);
        y0 = Math.min(y0, r.y);
        x1 = Math.max(x1, r.x + r.width);
        y1 = Math.max(y1, r.y + r.height);
      }
      if (x1 > x0) {
        const cx = (x0 + x1) / 2;
        const cy = (y0 + y1) / 2;
        const rx = Math.max(14, (x1 - x0) / 2 + 8);
        const ry = Math.max(14, (y1 - y0) / 2 + 8);
        if (this.known) {
          for (let i = 4; i >= 1; i--) this.halo.ellipse(cx, cy, rx * (0.7 + i * 0.16), ry * (0.7 + i * 0.16)).fill({ color: GOLD, alpha: (0.05 + 0.05 * pulse) });
          this.halo.ellipse(cx, cy, rx * 1.05, ry * 1.05).stroke({ color: GOLD, width: 1.5, alpha: 0.35 + 0.3 * pulse });
        } else {
          this.halo.ellipse(cx, cy, rx * 1.05, ry * 1.05).stroke({ color: 0x9fb4b0, width: 1.2, alpha: 0.35 });
          const t = (this.label ??= this.makeLabel());
          t.visible = true;
          t.position.set(Math.min(W - 20, Math.max(20, cx)), Math.max(12, y0 - 12));
        }
      }
    }
    app.render();
  }

  private makeLabel(): Text {
    const t = new Text({
      text: '???',
      style: { fontFamily: 'system-ui, sans-serif', fontSize: 15, fontWeight: '800', fill: 0xd6e4e0, stroke: { color: 0x061014, width: 4 }, letterSpacing: 1 },
    });
    t.anchor.set(0.5);
    this.stage.addChild(t);
    return t;
  }
}

/** Put a part on a kit (for the "???" silhouette of something not found yet). */
function wearPart(k: KitLook, part: KitPart): void {
  switch (part) {
    case 'harpoon': k.spear = true; break;
    case 'thruster': k.thruster = Math.max(1, k.thruster) as 1 | 2; break;
    case 'boots': k.boots = true; break;
    case 'visor': k.visor = true; break;
    case 'cowl': k.cowl = true; break;
    case 'flare': k.flare = true; break;
    case 'dart': k.dart = true; break;
    case 'jar': k.jar = true; break;
    case 'resonator': k.resonator = true; break;
    case 'tanks': k.tanks = Math.max(1, k.tanks); break;
    default: break;
  }
}
