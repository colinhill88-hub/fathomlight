import { Container } from 'pixi.js';
import { LinneaRig } from '../actors/linneaRig';
import { approach, clamp } from '../actors/animkit';
import { LINNEA_NOTICE_RANGE, LINNEA_SPOTS, type LinneaSpotId } from '../game/linnea';
import { groundY } from './terrain';
import type { PointLight } from './scenery';

/**
 * Phase 18: Linnea out in the world. She floats at her current spot with a
 * gentle drift, turns to look at Kestrel when Kestrel comes near (and tilts
 * her head), and bobs and chirps while she talks. When the story moves on she
 * fades away and is found at the next spot instead (she is never in two
 * places, and never follows Kestrel).
 */

const SCALE = 0.95;

export class LinneaActor {
  readonly view = new Container();
  readonly glow = new Container();
  /** A small warm light so she can be seen in dim water. */
  readonly light: PointLight = { x: 0, y: 0, radius: 120, intensity: 0, color: [1, 0.72, 0.55] };
  readonly rig = new LinneaRig(5);
  spot: LinneaSpotId | null = null;
  x = 0;
  y = 0;
  /** 0..1 how present she is (fades when she moves on). */
  private alpha = 0;
  private homeX = 0;
  private homeY = 0;
  private face = -1;
  private idleFace: 1 | -1 = -1;
  private driftT = Math.random() * 10;
  private turnTimer = 6;
  private pending: LinneaSpotId | null = null;
  private vx = 0;
  /** Talking: time left, and the syllable rhythm for the mouth. */
  private talkLeft = 0;
  private talkAmt = 0;
  private mouth = 0;
  private syllables: number[] = [];
  private sylT = 0;
  near = 0;

  constructor() {
    this.view.addChild(this.rig.view);
    this.view.scale.set(SCALE);
    this.glow.addChild(this.rig.halo);
    this.glow.scale.set(SCALE);
    this.view.visible = this.glow.visible = false;
  }

  /** Where she should be now (null hides her). On a change she fades out, then appears there. */
  setSpot(id: LinneaSpotId | null): void {
    if (id === this.spot && this.pending === null) return;
    if (this.spot === null || this.alpha < 0.02) this.place(id);
    else this.pending = id;
  }

  private place(id: LinneaSpotId | null): void {
    this.spot = id;
    this.pending = null;
    if (!id) return;
    const s = LINNEA_SPOTS[id];
    this.homeX = this.x = s.x;
    this.homeY = this.y = groundY(s.x) - s.lift;
    this.idleFace = s.face;
    this.face = s.face;
  }

  /** Begin talking for about this long; `syllables` sets the mouth's rhythm (one per chirp). */
  talk(seconds: number, chirps: number): void {
    this.talkLeft = seconds;
    this.syllables = [];
    let t = 0.05;
    for (let i = 0; i < chirps; i++) {
      this.syllables.push(t);
      t += 0.16 + (i % 3) * 0.05;
    }
    this.sylT = 0;
  }

  get talking(): boolean {
    return this.talkLeft > 0;
  }

  /** Is she here and visible enough to talk to? */
  get present(): boolean {
    return this.spot !== null && this.pending === null && this.alpha > 0.6;
  }

  /** Her head in world units (for the speech card). */
  headWorld(): { x: number; y: number } {
    return { x: this.x + this.rig.headPoint.x * SCALE, y: this.y + this.rig.headPoint.y * SCALE };
  }

  update(dt: number, time: number, kx: number, ky: number, active: boolean): void {
    // Fade out to move on, then fade in at the new spot.
    const want = this.spot && this.pending === null && active ? 1 : 0;
    this.alpha = approach(this.alpha, want, want ? 1.6 : 2.4, dt);
    if (this.pending !== null && this.alpha < 0.02) this.place(this.pending);
    const shown = this.spot !== null && this.alpha > 0.01;
    this.view.visible = this.glow.visible = shown;
    this.light.intensity = shown ? 0.16 * this.alpha : 0;
    if (!shown) return;

    const d = Math.hypot(kx - this.x, ky - this.y);
    this.near = clamp(1 - (d - 90) / (LINNEA_NOTICE_RANGE - 90), 0, 1);
    // A gentle wander around her spot (she stays put: she never follows Kestrel).
    this.driftT += dt;
    const tx = this.homeX + Math.sin(this.driftT * 0.21) * 22 * (1 - this.near * 0.7);
    const ty = this.homeY + Math.sin(this.driftT * 0.33 + 1.2) * 9;
    const nx = approach(this.x, tx, 0.9, dt);
    this.vx = dt > 0 ? (nx - this.x) / dt : 0;
    this.x = nx;
    this.y = approach(this.y, ty, 0.9, dt);
    // Face Kestrel when near; otherwise look the way she drifts, now and then glancing round.
    this.turnTimer -= dt;
    if (this.turnTimer <= 0) {
      this.turnTimer = 5 + Math.random() * 6;
      if (this.near === 0) this.idleFace = this.idleFace === 1 ? -1 : 1;
    }
    if (this.near > 0.05) this.face = kx >= this.x ? 1 : -1;
    else this.face = this.idleFace;

    // Talking: a chirp rhythm opens the mouth; the bob and fanned gills follow talkAmt.
    if (this.talkLeft > 0) {
      this.talkLeft -= dt;
      this.sylT += dt;
    }
    this.talkAmt = approach(this.talkAmt, this.talkLeft > 0 ? 1 : 0, 5, dt);
    let open = 0;
    for (const s of this.syllables) {
      const u = (this.sylT - s) / 0.14;
      if (u > 0 && u < 1) open = Math.max(open, Math.sin(u * Math.PI));
    }
    this.mouth = approach(this.mouth, open, 30, dt);

    this.rig.update({ dt, time, near: this.near, talk: this.talkAmt, mouth: this.mouth, face: this.face, speed: Math.abs(this.vx) });
    this.view.position.set(this.x, this.y);
    this.glow.position.set(this.x, this.y);
    this.view.alpha = this.alpha;
    this.glow.alpha = this.alpha * (0.6 + this.talkAmt * 0.4);
    const h = this.headWorld();
    this.light.x = h.x;
    this.light.y = h.y;
  }

  /** The beat times of the chirps since talk() began (for the sound). */
  chirpTimes(): readonly number[] {
    return this.syllables;
  }
}
