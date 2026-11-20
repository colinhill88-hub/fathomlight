import { Matrix, RenderTexture, type Container, type Renderer } from 'pixi.js';
import { perf } from '../dev/perf';

export type OceanRect = { x: number; y: number; w: number; h: number };
export type OceanRegistration = { x: number; y: number; sx: number; sy: number };
export type OceanImage = { texture: RenderTexture; rect: OceanRect };
export type OceanSource = (view: OceanRect, time: number) => OceanImage;

/** A shared, padded image of the real scenery. Each pane samples the same level coordinates. */
export class OceanCapture {
  private texture = RenderTexture.create({ width: 896, height: 504 });
  private highQuality = false;
  private requestedQuality = false;
  private readonly transform = new Matrix();
  private registration?: OceanRegistration;
  private image?: OceanImage;
  private last = -Infinity;

  constructor(private readonly renderer: Renderer, private readonly world: Container,
    private readonly scenery: (bounds: OceanRect, dt: number) => Container[]) {}

  setHighQuality(high: boolean): void {
    this.requestedQuality = high;
  }

  source(registration: OceanRegistration, foreground?: Container): OceanSource {
    return (view, time) => {
      if (this.requestedQuality !== this.highQuality) {
        // Keep the old picture valid until visible panes are about to rebind it.
        const old = this.texture;
        this.highQuality = this.requestedQuality;
        this.texture = RenderTexture.create(this.highQuality
          ? { width: 1536, height: 864, antialias: true }
          : { width: 896, height: 504 });
        this.image = undefined;
        old.destroy(true);
      }
      const prev = this.image?.rect;
      const needsCoverage = !prev || view.x < prev.x || view.y < prev.y ||
        view.x + view.w > prev.x + prev.w || view.y + view.h > prev.y + prev.h;
      if (this.registration === registration && !needsCoverage && this.image && time - this.last < 1 / 22) return this.image;
      const dt = this.registration === registration ? Math.max(0, Math.min(0.075, time - this.last)) : 0;
      const rect = { x: view.x - 90, y: view.y - 75, w: view.w + 180, h: view.h + 150 };
      const x = registration.x + rect.x * registration.sx;
      const y = registration.y + rect.y * registration.sy;
      const w = rect.w * registration.sx;
      const h = rect.h * registration.sy;
      const layers = this.scenery({ x, y, w, h }, dt);
      if (foreground) layers.push(foreground);
      const scaleX = this.texture.width / w;
      const scaleY = this.texture.height / h;
      this.transform.set(scaleX, 0, 0, scaleY, -x * scaleX, -y * scaleY);
      const visibility = this.world.children.map((child) => child.visible);
      try {
        this.world.children.forEach((child) => { if (!layers.includes(child)) child.visible = false; });
        if (foreground) foreground.visible = true;
        perf.pass('ocean panes', () => this.renderer.render({ container: this.world, target: this.texture,
          transform: this.transform, clear: true, clearColor: [0, 0, 0, 0] }));
      } finally {
        this.world.children.forEach((child, index) => { child.visible = visibility[index]; });
      }
      this.registration = registration;
      this.last = time;
      return this.image = { texture: this.texture, rect };
    };
  }
}
