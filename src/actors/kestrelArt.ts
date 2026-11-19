import { Container, FillGradient, Graphics } from 'pixi.js';

// Shared materials for the swimmer and walker. Shapes are drawn once and articulated at runtime.
const ink = 0x18262c;
const bone = 0xdce5c6;
const ochre = 0xe4b866;
const moss = 0xd7ea92;

function ramp(top: number, light: number, shade: number): FillGradient {
  return new FillGradient({
    type: 'linear', start: { x: 0.13, y: 0 }, end: { x: 0.9, y: 1 },
    colorStops: [{ offset: 0, color: top }, { offset: 0.43, color: light }, { offset: 1, color: shade }],
  });
}
const fabric = ramp(0x778d85, 0x405750, 0x192a32);
const steel = ramp(0xc0d6cc, 0x677f87, 0x293a47);
const gold = ramp(0xf3d990, 0xbf884d, 0x855437);
const rubber = ramp(0x6d8a83, 0x354d50, 0x14252c);
const scarlet = ramp(0xf9ac79, 0xc46043, 0x713c38);
const skin = ramp(0xffd9a6, 0xc98761, 0x75463c);
const hair = ramp(0xad7751, 0x563930, 0x2a272a);
const shell = ramp(0xe6f299, 0x8ba550, 0x2f5344);

/** Upright around the pelvis. The swimmer rotates and stretches this same cut into its own proportions. */
export function kestrelTorso(): Container {
  const view = new Container();
  const hips = new Graphics();
  hips.moveTo(-13, -18).quadraticCurveTo(0, -20, 13, -17).lineTo(12, -4)
    .quadraticCurveTo(7, 8, -3, 7).quadraticCurveTo(-14, 5, -14, -5).closePath().fill(fabric);
  hips.moveTo(-13, -12).quadraticCurveTo(-2, -8, 14, -11).lineTo(12, -5)
    .quadraticCurveTo(0, -2, -13, -6).closePath().fill(ink);
  hips.roundRect(5, -11, 7, 6, 2).fill(steel).roundRect(7, -10, 3.5, 3, 1).fill(0x574934);
  const chest = new Graphics({ label: 'kestrelChest' });
  chest.pivot.set(0, -12); chest.position.set(0, -12);
  chest.moveTo(-13, -9).bezierCurveTo(-12, -17, -19, -26, -17, -33)
    .quadraticCurveTo(-13, -42, -1, -41).quadraticCurveTo(14, -42, 17, -32)
    .quadraticCurveTo(18, -21, 12, -8).quadraticCurveTo(0, -4, -13, -9).closePath().fill(fabric);
  chest.moveTo(-15, -32).quadraticCurveTo(-2, -40, 13, -33).quadraticCurveTo(2, -34, -4, -22)
    .quadraticCurveTo(-10, -19, -13, -15).closePath().fill({ color: 0xb0c1a2, alpha: 0.17 });
  chest.moveTo(-11, -19).quadraticCurveTo(0, -14, 12, -19).lineTo(13, -12)
    .quadraticCurveTo(0, -8, -11, -14).closePath().fill(gold);
  chest.moveTo(-13, -35).quadraticCurveTo(-2, -24, 2, -13).lineTo(7, -13)
    .quadraticCurveTo(2, -29, -8, -38).closePath().fill(ink);
  chest.moveTo(-12, -35).quadraticCurveTo(-1, -23, 2, -16).stroke({ color: 0xa2b0a0, width: 0.85, alpha: 0.62 });
  chest.moveTo(-14, -36).lineTo(-10, -43).quadraticCurveTo(2, -47, 14, -42).quadraticCurveTo(18, -36, 16, -30)
    .quadraticCurveTo(1, -33, -14, -36).closePath().fill(steel);
  chest.moveTo(-10, -41).quadraticCurveTo(3, -45, 12, -40).stroke({ color: bone, width: 1.55, alpha: 0.76, cap: 'round' });
  chest.circle(11, -29, 5.3).fill(steel).circle(12, -29, 3.15).fill(ink)
    .circle(10.5, -30.5, 0.85).fill(bone).circle(-8, -37, 1.26).fill(ochre);
  chest.moveTo(-9, -17).lineTo(-4, -15.8).stroke({ color: bone, width: 0.74, alpha: 0.53, cap: 'round' });
  view.addChild(hips, chest);
  return view;
}

export function kestrelLimb(length: number, width: number, type: 'thigh' | 'shin' | 'upper' | 'fore'): Graphics {
  const g = new Graphics();
  const w = width * 0.65;
  const l = length;
  g.moveTo(-3, -w * 0.5).quadraticCurveTo(1, -w * 1.15, l * 0.48, -w)
    .quadraticCurveTo(l * 0.86, -w * 0.84, l + 3, -w * 0.51)
    .quadraticCurveTo(l + 6, 0, l + 2, w * 0.61).quadraticCurveTo(l * 0.38, w, 0, w * 0.81)
    .quadraticCurveTo(-5, w * 0.35, -3, -w * 0.5).closePath().fill(fabric);
  g.moveTo(0, -w * 0.64).quadraticCurveTo(l * 0.49, -w * 1.04, l * 0.76, -w * 0.48)
    .quadraticCurveTo(l * 0.41, -w * 0.61, l * 0.17, -w * 0.02).closePath().fill({ color: 0xb8c3a5, alpha: 0.36 });
  if (type === 'thigh' || type === 'upper') {
    const x = type === 'thigh' ? l - 2 : 2;
    g.ellipse(x, -0.4, 5.5, w * 0.97).fill(steel);
    g.moveTo(x - 2.9, -w * 0.64).quadraticCurveTo(x + 1, -w * 0.9, x + 3, -w * 0.41)
      .stroke({ color: bone, width: 1.2, alpha: 0.72, cap: 'round' });
    const a = l * (type === 'thigh' ? 0.31 : 0.63);
    g.moveTo(a - 2, -w * 0.8).lineTo(a + 2.4, -w * 0.75).lineTo(a + 4.3, w * 0.68).lineTo(a, w * 0.78)
      .closePath().fill(gold);
  } else if (type === 'shin') {
    g.roundRect(l - 6, -w * 0.63, 4, w * 1.33, 1.5).fill(gold);
  } else {
    g.roundRect(l - 2.3, -w * 0.69, 5, w * 1.4, 1.7).fill(steel);
  }
  return g;
}

export function kestrelHand(): Container {
  const hand = new Container();
  hand.addChild(new Graphics().moveTo(-1, -3.8).quadraticCurveTo(5.5, -6, 9.5, -2.3)
    .quadraticCurveTo(12, 1.4, 8.5, 4.8).quadraticCurveTo(4, 5.5, 0, 3.3).closePath().fill(scarlet)
    .moveTo(1, 0).quadraticCurveTo(4.6, -1.5, 6, 1).stroke({ color: 0xffba81, width: 1.4, alpha: 0.64 }));
  return hand;
}

export function kestrelFin(standing: boolean, tip: boolean): Graphics {
  const g = new Graphics();
  if (standing) {
    if (tip) {
      g.moveTo(-1, -4.5).quadraticCurveTo(8, -5.6, 14, -2.5).lineTo(14, 0).lineTo(-1, 0).closePath().fill(rubber);
      g.moveTo(8, -4).lineTo(14, -2.5).lineTo(14, 0).lineTo(8, 0).closePath().fill(scarlet);
    } else {
      g.moveTo(-5.5, 5).quadraticCurveTo(-7, -0.4, -4, -5).quadraticCurveTo(0, -7, 4, -4)
        .quadraticCurveTo(5, -0.1, 9, 0).lineTo(9, 5).closePath().fill(rubber);
      g.moveTo(-4, 2.8).lineTo(8, 2.8).stroke({ color: 0x869d91, width: 1.15, alpha: 0.72 });
    }
  } else if (tip) {
    g.moveTo(-2, -8).quadraticCurveTo(8, -10, 20, -7).quadraticCurveTo(23, 0, 18, 8)
      .quadraticCurveTo(10, 9, -2, 6).closePath().fill(rubber);
    g.moveTo(7, -8.8).quadraticCurveTo(16, -9.4, 20, -7).quadraticCurveTo(23, 0, 18, 8)
      .quadraticCurveTo(14, 9, 7, 7.7).quadraticCurveTo(12, 1, 7, -8.8).closePath().fill(scarlet);
    g.moveTo(10, -6).quadraticCurveTo(15, -6.5, 18, -4.6).stroke({ color: 0xf6c396, width: 1.2, alpha: 0.6, cap: 'round' });
  } else {
    g.moveTo(-5, -5.3).quadraticCurveTo(0, -8, 5, -5.8).quadraticCurveTo(10, -5.2, 19, -8)
      .lineTo(19, 6).quadraticCurveTo(10, 5, 5, 7).quadraticCurveTo(-3, 7, -5, 3.6).closePath().fill(rubber);
    g.moveTo(0, -3).quadraticCurveTo(9, -2.8, 18, -5).stroke({ color: 0xa5be90, width: 1.35, alpha: 0.71, cap: 'round' });
    g.moveTo(7, 2).quadraticCurveTo(14, 1.8, 19, 3).stroke({ color: ink, width: 1.45, alpha: 0.77, cap: 'round' });
  }
  return g;
}

function face() {
  const g = new Graphics();
  g.moveTo(58, 2).lineTo(72, 3).lineTo(72, 15).lineTo(58, 15).closePath().fill(0x9f6049);
  g.moveTo(57, -15).quadraticCurveTo(64, -25, 77, -21).quadraticCurveTo(85, -18, 85, -7)
    .lineTo(89, -0.3).quadraticCurveTo(89.5, 1.7, 86, 2).quadraticCurveTo(86, 11, 78, 12)
    .quadraticCurveTo(70, 12, 62, 6).quadraticCurveTo(53, 3, 53, -6).closePath().fill(skin);
  g.moveTo(54, -4).quadraticCurveTo(48, -17, 62, -23).quadraticCurveTo(75, -29, 83, -20)
    .quadraticCurveTo(81, -16, 77, -16).quadraticCurveTo(72, -20, 67, -14)
    .quadraticCurveTo(64, -7, 58, -8).lineTo(60, 3).quadraticCurveTo(54, 2, 54, -4).closePath().fill(hair);
  g.moveTo(56, -12).quadraticCurveTo(61, -22, 74, -23).stroke({ color: 0xbd8156, width: 1.3, alpha: 0.62, cap: 'round' });
  g.ellipse(62.5, -2.2, 3.8, 4.5).fill(0xba795b);
  g.moveTo(61.3, -4).quadraticCurveTo(64.5, -4.9, 64, -0.2).stroke({ color: 0x774438, width: 1.15, cap: 'round' });
  g.ellipse(78, 1.2, 3.9, 2.15).fill({ color: 0xf1a675, alpha: 0.53 });
  return g;
}

export function kestrelHelmet(opening: boolean): Container {
  const view = new Container();
  const rear = new Graphics();
  rear.moveTo(48, 15).bezierCurveTo(35, 6, 33, -18, 47, -29).quadraticCurveTo(60, -40, 76, -31)
    .lineTo(68, -18).lineTo(67, 13).quadraticCurveTo(57, 22, 48, 15).closePath().fill(shell);
  rear.moveTo(44, -22).quadraticCurveTo(37, -37, 30, -38).quadraticCurveTo(53, -49, 65, -42)
    .quadraticCurveTo(71, -39, 75, -31).quadraticCurveTo(55, -36, 44, -22).closePath().fill(shell);
  rear.moveTo(36, -39).quadraticCurveTo(57, -46, 68, -37).stroke({ color: moss, width: 2.1, alpha: 0.88, cap: 'round' });
  rear.ellipse(50, -5, 9.4, 13.2).fill(steel).ellipse(50, -5, 6.3, 9.6).fill(ink);
  rear.arc(50, -5, 5.9, 2.5, 5.1).stroke({ color: moss, width: 1.25, alpha: 0.85 });
  const head = new Container({ label: 'headRig' });
  const iris = new Container({ label: 'kestrelIris' });
  iris.position.set(82, -6.9);
  iris.addChild(new Graphics().ellipse(0, 0, 1.75, 2.2).fill(0x372d25).circle(0.5, -0.8, 0.5).fill(0xfff7d7));
  const eye = new Container({ label: 'kestrelEye' });
  eye.pivot.set(0, -6.9); eye.position.set(0, -6.9);
  eye.addChild(new Graphics().moveTo(75.6, -6.8).quadraticCurveTo(79, -12, 84.5, -8.3)
    .quadraticCurveTo(84.5, -3.5, 75.6, -6.8).closePath().fill(0xffedc8)
    .moveTo(75.6, -6.8).quadraticCurveTo(79, -12, 84.5, -8.3).stroke({ color: 0x4a2f28, width: 1.05, cap: 'round' }), iris);
  const brow = new Graphics({ label: 'kestrelBrow' });
  brow.pivot.set(80, -12); brow.position.set(80, -12);
  brow.moveTo(74.5, -11.5).quadraticCurveTo(78.6, -14.9, 84, -12.4).stroke({ color: 0x52332a, width: 2, cap: 'round' });
  const lid = new Graphics({ label: 'eyelid' });
  lid.moveTo(76.3, -7).quadraticCurveTo(80.4, -5.4, 84.8, -7.6).stroke({ color: 0x57362a, width: 1.45, cap: 'round' });
  lid.visible = false;
  const smile = new Graphics({ label: 'kestrelSmile' });
  smile.moveTo(77.5, 7).quadraticCurveTo(81, 7.9, 84.2, 5.8).stroke({ color: 0x63382d, width: 1.15, cap: 'round' });
  const gasp = new Graphics({ label: 'kestrelGasp', alpha: 0 });
  gasp.ellipse(82, 6.2, 2.15, 2.45).fill(0x714134).ellipse(81.7, 5.3, 1.15, 0.65).fill(0xc18063);
  head.addChild(face(), eye, brow, lid, smile, gasp);
  const plate = new Graphics({ label: 'plate' });
  const pane = () => plate.moveTo(61, -29).bezierCurveTo(76, -37, 94, -26, 96, -13)
    .quadraticCurveTo(101, 5, 89, 15).quadraticCurveTo(73, 23, 59, 13)
    .bezierCurveTo(65, 5, 64, -17, 61, -29).closePath();
  pane().fill({ color: 0xa7d5ab, alpha: 0.09 });
  pane().stroke({ color: 0x456e50, width: 3.55, alpha: 0.9 });
  plate.moveTo(62, -30).bezierCurveTo(76, -36, 94, -25, 96, -13)
    .stroke({ color: moss, width: 2.8, cap: 'round' });
  plate.moveTo(72, -25).quadraticCurveTo(86, -28, 92, -16)
    .stroke({ color: 0xfff6ca, width: 1.8, alpha: 0.48, cap: 'round' });
  plate.moveTo(94, -4).quadraticCurveTo(95, 7, 87, 12).stroke({ color: 0xbadecc, width: 1.6, alpha: 0.59, cap: 'round' });
  const collar = new Graphics().moveTo(47, 11).quadraticCurveTo(66, 17, 87, 12).lineTo(83, 22)
    .quadraticCurveTo(61, 26, 48, 20).closePath().fill(steel);
  collar.moveTo(50, 17).quadraticCurveTo(67, 22, 82, 17).stroke({ color: bone, width: 1.4, alpha: 0.66 });
  if (opening) {
    plate.pivot.set(65, -31); plate.position.set(65, -31);
  }
  const fog = new Graphics({ label: 'visorFog', alpha: 0 }).ellipse(85, 6, 9, 5).fill({ color: 0xe7f4de, alpha: 0.47 });
  const drops = new Graphics({ label: 'visorDrops', alpha: 0 });
  for (const [x,y] of [[70,-25], [83,-22], [90,-14], [92,4], [78,12]]) {
    drops.ellipse(x,y,1.1,1.6).fill({ color: 0xf8ffe7, alpha: 0.6 });
    drops.moveTo(x,y+1).lineTo(x-0.45,y+3.6).stroke({ color: 0xeeffed, width: 0.8, alpha: 0.43 });
  }
  view.addChild(rear, head, plate, collar, fog, drops);
  return view;
}

export class KestrelExpression {
  private readonly eye: Container;
  private readonly iris: Container;
  private readonly brow: Container;
  private readonly lid: Container;
  private readonly smile: Container;
  private readonly gasp: Container;

  constructor(head: Container) {
    this.eye = head.getChildByLabel('kestrelEye')!;
    this.iris = this.eye.getChildByLabel('kestrelIris')!;
    this.brow = head.getChildByLabel('kestrelBrow')!;
    this.lid = head.getChildByLabel('eyelid')!;
    this.smile = head.getChildByLabel('kestrelSmile')!;
    this.gasp = head.getChildByLabel('kestrelGasp')!;
  }

  apply(blink: boolean, look: number, alert: number, effort: number, gasp = 0): void {
    this.lid.visible = blink;
    this.eye.visible = !blink;
    this.eye.scale.y = 1 + alert * 0.42 - effort * 0.3;
    this.iris.position.set(81.7 + look * 1.55, -7 + look * 0.85);
    this.brow.y = -12 - alert * 2.3 + effort * 1.35;
    this.brow.rotation = look * 0.16 + effort * 0.23;
    this.smile.alpha = 1 - gasp;
    this.gasp.alpha = gasp;
  }
}
