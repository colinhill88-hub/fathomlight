import { approach, clamp, smoothstep } from './animkit';

export type KestrelAction = 'free' | 'scan' | 'grapple' | 'busy';

/** Animation intent only. The controller owns velocity, facing, interaction and transition timing. */
export class KestrelSwimMotion {
  stroke = 0;
  travel = 0;
  power = 0;
  reach = 0;
  brake = 0;
  interest = 0;
  look = 0;
  relief = 0;
  trim = 0;
  compression = 0;
  private idleTime = 0;
  private nextIdle = 2.1;
  private gestureTime = 0;
  private gestureIndex = 0;
  private prevVx = 0;
  private prevVy = 0;
  private nextNotice = 0;
  private noticed = '';
  private launchTime = 0;

  constructor(private readonly compact = false) {}

  get adjust(): number { return this.gestureIndex % 2 === 0 ? this.interest : 0; }

  update(dt: number, vx: number, vy: number, mx: number, my: number, face: number, boosted: number,
    surfaced: boolean, surfaceTime: number, impact: number, action: KestrelAction, target: { id: string; x: number; y: number } | null,
    x: number, y: number, pitch: number): void {
    const speed = Math.hypot(vx, vy);
    const input = Math.min(1, Math.hypot(mx, my));
    const prior = Math.hypot(this.prevVx, this.prevVy);
    const forward = prior < 16 ? 0 : ((vx - this.prevVx) * this.prevVx + (vy - this.prevVy) * this.prevVy) / (dt * prior);
    this.prevVx = vx; this.prevVy = vy;
    const reversing = prior > 59 && mx * vx + my * vy < -44;
    const catching = (action === 'free' && !surfaced) ? Math.max(reversing ? 1 : 0, clamp((-forward - 135) / 510, 0, 1)) : 0;
    this.brake = approach(this.brake, catching, catching > this.brake ? 14 : 4.3, dt);
    this.travel = approach(this.travel, surfaced ? 0 : smoothstep(speed / 140), speed > 100 ? 6 : 3.4, dt);
    this.power = approach(this.power, surfaced ? 0.32 : Math.max(boosted, smoothstep((speed - 85) / 180) * input), 5.5, dt);
    const start = !surfaced && !reversing && action === 'free' ? input * (1 - smoothstep(speed / 200)) : 0;
    if (this.compact) {
      this.launchTime = input > 0.08 && !surfaced && action === 'free' ? this.launchTime + dt : 0;
      const coil = start * (1 - smoothstep(this.launchTime / 0.23));
      this.compression = approach(this.compression, coil, coil > this.compression ? 28 : 15, dt);
    }
    const extension = start * (this.compact ? smoothstep(this.launchTime / 0.19) : 1);
    this.reach = approach(this.reach, extension, extension > this.reach ? (this.compact ? 18 : 11) : 4, dt);
    this.stroke = (this.stroke + dt * (surfaced ? 5.5 : 1.5 + input * 2.7 + this.power * (this.compact ? 7.6 : 5.8))) % (Math.PI * 2);
    this.relief = surfaced ? smoothstep(surfaceTime / 0.16) * (1 - smoothstep((surfaceTime - 0.29) / 0.93)) * (0.6 + impact * 0.4) : 0;

    const idle = !surfaced && action === 'free' && input < 0.08 && speed < 40;
    this.idleTime = idle ? this.idleTime + dt : 0;
    this.nextNotice = Math.max(0, this.nextNotice - dt);
    if (idle && target && target.id !== this.noticed && this.nextNotice <= 0 && this.idleTime > 0.55
      && (target.x - x) * face > -18) {
      this.noticed = target.id;
      this.gestureTime = 1.6;
      this.gestureIndex = 1;
      this.nextIdle = this.idleTime + 4.9;
      this.nextNotice = 4.3;
    } else if (idle && this.idleTime > this.nextIdle && this.gestureTime <= 0) {
      this.gestureTime = 1.8;
      this.gestureIndex++;
      this.nextIdle = this.idleTime + (this.gestureIndex % 2 === 0 ? 5.5 : 4.8);
    }
    if (!idle) {
      this.gestureTime = 0;
      this.nextIdle = 2.1;
    } else this.gestureTime = Math.max(0, this.gestureTime - dt);
    const envelope = idle ? smoothstep((1.8 - this.gestureTime) / 0.42) * smoothstep(this.gestureTime / 0.48) : 0;
    this.interest = approach(this.interest, envelope, idle ? 7 : 18, dt);
    const looking = target && (action === 'scan' || (idle && this.gestureIndex % 2 === 1))
      ? clamp(Math.atan2(target.y - y, Math.max(28, (target.x - x) * face)) - pitch, -0.52, 0.5)
      : Math.sin(this.stroke * 0.67) * 0.27;
    this.look = approach(this.look, looking, 7.5, dt);
    this.trim = approach(this.trim, clamp((my * 0.45 + vy / 650), -0.8, 0.8), 6.5, dt);
  }
}
