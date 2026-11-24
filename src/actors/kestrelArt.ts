import { Container, FillGradient, Graphics, Sprite } from 'pixi.js';
import { getPropArt } from '../art/propArt';

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
const enamel = ramp(0xf6cf83, 0xc48a4c, 0x72482f);
const glass = ramp(0x89b8aa, 0x426f70, 0x21383f);

/** Upright around the pelvis. The swimmer rotates and stretches this same cut into its own proportions. */
export function kestrelTorso(compact = false, detailed = false): Container {
  const view = new Container();
  const paintedTorso = getPropArt().kestrel.torso;
  if (paintedTorso) {
    const chest = new Container({ label: 'kestrelChest' });
    chest.pivot.set(0, -12);
    chest.position.set(0, -12);
    const spr = new Sprite(paintedTorso);
    spr.anchor.set(0.5, 0.52);
    const sc = 56 / Math.max(1, paintedTorso.height);
    spr.scale.set(sc);
    spr.position.set(1, -18);
    chest.addChild(spr);
    view.addChild(chest);
    return view;
  }
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
  if (compact) {
    chest.moveTo(-16, -30).quadraticCurveTo(-12, -36, -5, -34).lineTo(-1, -19)
      .quadraticCurveTo(-8, -18, -14, -21).closePath().fill(enamel);
    chest.moveTo(6, -28).lineTo(17, -28).lineTo(13, -21).lineTo(8, -22).closePath().fill(enamel);
    chest.moveTo(-13, -30).quadraticCurveTo(-10, -32, -7, -31)
      .stroke({ color: 0xf5df9a, width: 1.2, cap: 'round', alpha: 0.78 });
  }
  if (detailed) {
    chest.moveTo(-12, -24).quadraticCurveTo(-7, -20, -3, -21).lineTo(-9, -19).lineTo(-13, -21)
      .closePath().fill({ color: 0x3f3029, alpha: 0.53 });
    chest.moveTo(-11, -30).quadraticCurveTo(-9, -32, -6, -32)
      .stroke({ color: 0xffdb9c, width: 0.8, alpha: 0.78, cap: 'round' });
    chest.moveTo(3, -34).quadraticCurveTo(9, -34, 15, -32)
      .stroke({ color: 0x273940, width: 1.3, alpha: 0.83, cap: 'round' });
    hips.moveTo(-10, 1).quadraticCurveTo(-4, 3, 3, 1)
      .stroke({ color: 0x8caa99, width: 0.85, alpha: 0.46, cap: 'round' });
  }
  view.addChild(hips, chest);
  return view;
}

export function kestrelLimb(length: number, width: number, type: 'thigh' | 'shin' | 'upper' | 'fore', detailed = false): Container {
  const kArt = getPropArt().kestrel;
  const key = type === 'upper' ? 'upper_arm' : type === 'fore' ? 'forearm' : type;
  const painted = kArt[key];
  if (painted) {
    const c = new Container();
    const spr = new Sprite(painted);
    spr.anchor.set(0.14, 0.5);
    const targetLen = length + (type === 'fore' ? 12 : 6);
    const sc = targetLen / Math.max(1, painted.width);
    spr.scale.set(sc);
    spr.position.set(-2, 0);
    c.addChild(spr);
    return c;
  }
  const g = new Graphics();
  const w = width * 0.65;
  const l = length;
  g.moveTo(-3, -w * 0.5).quadraticCurveTo(1, -w * 1.15, l * 0.48, -w)
    .quadraticCurveTo(l * 0.86, -w * 0.84, l + 3, -w * 0.51)
    .quadraticCurveTo(l + 6, 0, l + 2, w * 0.61).quadraticCurveTo(l * 0.38, w, 0, w * 0.81)
    .quadraticCurveTo(-5, w * 0.35, -3, -w * 0.5).closePath().fill(fabric);
  g.moveTo(0, -w * 0.64).quadraticCurveTo(l * 0.49, -w * 1.04, l * 0.76, -w * 0.48)
    .quadraticCurveTo(l * 0.41, -w * 0.61, l * 0.17, -w * 0.02).closePath().fill({ color: 0xb8c3a5, alpha: 0.36 });
  if (detailed) {
    g.moveTo(-1, w * 0.34).quadraticCurveTo(l * 0.38, w * 0.57, l + 1, w * 0.33)
      .quadraticCurveTo(l * 0.60, w * 0.86, 0, w * 0.71).closePath().fill({ color: ink, alpha: 0.47 });
    g.moveTo(l * 0.28, -w * 0.27).quadraticCurveTo(l * 0.47, -w * 0.29, l * 0.65, -w * 0.07)
      .stroke({ color: 0xa3b4a4, width: 0.94, alpha: 0.38, cap: 'round' });
  }
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

export function kestrelHand(compact = false, detailed = false): Container {
  const hand = new Container();
  if (getPropArt().kestrel.forearm) {
    // Painted forearm plate already includes the weathered terracotta-red diving gauntlet!
    return hand;
  }
  if (compact) {
    const gauntlet = new Graphics().moveTo(-2, -5.8).lineTo(5, -7.4)
      .quadraticCurveTo(11.8, -6.7, 12.3, 1.5).quadraticCurveTo(10, 8.6, 2, 8)
      .lineTo(-1, 5.5).lineTo(-4, 4).quadraticCurveTo(-5, 0, -2, -1).closePath().fill(scarlet)
      .moveTo(-3, -5.7).quadraticCurveTo(0, -7.3, 2, -6.9).lineTo(2.8, 6.8)
      .quadraticCurveTo(-1, 8, -3.5, 5).closePath().fill(steel)
      .moveTo(4.2, -4.1).quadraticCurveTo(7.5, -4.1, 9.2, -2)
      .stroke({ color: 0xffd099, width: 1.4, alpha: 0.64, cap: 'round' });
    if (detailed) gauntlet.moveTo(4.3, 1.8).quadraticCurveTo(9, 1.1, 10, 2.6)
      .quadraticCurveTo(8, 6.6, 4.8, 6.2).closePath().fill({ color: 0x643d3b, alpha: 0.67 })
      .moveTo(4, 1.3).quadraticCurveTo(6.4, 0.1, 8.2, 0.6).stroke({ color: 0xf5ab78, width: 1.1, alpha: 0.7, cap: 'round' });
    hand.addChild(gauntlet);
    hand.pivot.set(4, 0);
    return hand;
  }
  hand.addChild(new Graphics().moveTo(-1, -3.8).quadraticCurveTo(5.5, -6, 9.5, -2.3)
    .quadraticCurveTo(12, 1.4, 8.5, 4.8).quadraticCurveTo(4, 5.5, 0, 3.3).closePath().fill(scarlet)
    .moveTo(1, 0).quadraticCurveTo(4.6, -1.5, 6, 1).stroke({ color: 0xffba81, width: 1.4, alpha: 0.64 }));
  return hand;
}

export function kestrelFin(standing: boolean, tip: boolean, compact = false, detailed = false): Container {
  const paintedFin = !standing ? getPropArt().kestrel.fin : undefined;
  if (paintedFin) {
    const c = new Container();
    if (!tip) {
      // Mount the sleek painted flipper blade on the ankle joint (tip stays empty so there's no double blade).
      const spr = new Sprite(paintedFin);
      spr.anchor.set(0.12, 0.5);
      const sc = 36 / Math.max(1, paintedFin.width);
      spr.scale.set(sc);
      spr.position.set(-2, 0);
      c.addChild(spr);
    }
    return c;
  }
  const g = new Graphics();
  if (compact && tip) {
    const edge = standing ? 11.8 : 13.7;
    const top = standing ? -5.9 : -10;
    const bottom = standing ? 0 : 8.9;
    const middle = (top + bottom) / 2;
    g.moveTo(-2, top + 1.1).quadraticCurveTo(5, top - 0.4, edge, top)
      .lineTo(edge - 0.5, middle - 1.55).lineTo(edge - 5, middle)
      .lineTo(edge - 0.5, middle + 1.55).lineTo(edge, bottom)
      .quadraticCurveTo(5, bottom + 0.4, -2, bottom - 1.1).closePath().fill(scarlet);
    g.moveTo(0, top + 2).lineTo(edge - 4, top + 1.4)
      .stroke({ color: 0xf1ab74, width: 1.15, alpha: 0.7, cap: 'round' });
    if (detailed) g.moveTo(1, middle + 1).quadraticCurveTo(edge * 0.46, middle + 2, edge - 1.8, bottom - 0.9)
      .stroke({ color: 0x663a42, width: 1.2, alpha: 0.78, cap: 'round' });
    return g;
  }
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

function face(detailed: boolean) {
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
  if (detailed) {
    g.moveTo(67, -13).quadraticCurveTo(72, -8, 69, -3).quadraticCurveTo(70, 4, 77, 10)
      .quadraticCurveTo(70, 10, 64, 6).quadraticCurveTo(62, 2, 65, -2).closePath().fill({ color: 0x824d43, alpha: 0.43 });
    g.moveTo(80, -1).quadraticCurveTo(83.6, -2.2, 85.4, -3.6).lineTo(88.1, 0)
      .quadraticCurveTo(87.3, 1.6, 84.4, 1.6).quadraticCurveTo(83, 3, 80, -1).closePath().fill({ color: 0xffc18f, alpha: 0.61 });
    g.moveTo(66, -19).quadraticCurveTo(73, -24, 80, -21)
      .stroke({ color: 0xe2a575, width: 0.94, alpha: 0.60, cap: 'round' });
    g.moveTo(56.8, -10.5).quadraticCurveTo(59.4, -16.5, 64.9, -19)
      .stroke({ color: 0x9d634c, width: 1.2, alpha: 0.68, cap: 'round' });
  }
  return g;
}

export function kestrelHelmet(opening: boolean, compact = false, detailed = false): Container {
  const view = new Container();
  const paintedHead = getPropArt().kestrel.head;
  if (paintedHead) {
    const head = new Container({ label: 'headRig' });
    const spr = new Sprite(paintedHead);
    spr.anchor.set(0.5, 0.52);
    const sc = (compact ? 64 : 68) / Math.max(1, paintedHead.height);
    spr.scale.set(sc);
    spr.position.set(66, -6);
    // Keep lightweight labeled expression nodes so KestrelExpression stays 100% compatible.
    const iris = new Container({ label: 'kestrelIris' });
    const eye = new Container({ label: 'kestrelEye' });
    eye.addChild(iris);
    const brow = new Container({ label: 'kestrelBrow' });
    const lid = new Graphics({ label: 'eyelid' });
    lid.moveTo(76, -8).quadraticCurveTo(80, -6.5, 84, -8.2).stroke({ color: 0x4a2f22, width: 1.4, cap: 'round' });
    lid.visible = false;
    const smile = new Container({ label: 'kestrelSmile' });
    const gasp = new Container({ label: 'kestrelGasp', alpha: 0 });
    head.addChild(spr, eye, brow, lid, smile, gasp);
    const plate = new Graphics({ label: 'plate' });
    if (opening) {
      const hingeY = compact ? -24 : -31;
      plate.pivot.set(65, hingeY);
      plate.position.set(65, hingeY);
    }
    const fog = new Graphics({ label: 'visorFog', alpha: 0 }).ellipse(84, 5, 8, 4.5).fill({ color: 0xe7f4de, alpha: 0.42 });
    const drops = new Graphics({ label: 'visorDrops', alpha: 0 });
    for (const [x, y] of [[70, -24], [83, -21], [90, -13], [91, 4], [78, 11]]) {
      drops.ellipse(x, y, 1.1, 1.6).fill({ color: 0xf8ffe7, alpha: 0.55 });
    }
    view.addChild(head, plate, fog, drops);
    return view;
  }
  const rear = new Graphics();
  if (compact) {
    rear.moveTo(43, 14).quadraticCurveTo(34, 5, 36, -14).lineTo(39, -24)
      .lineTo(40, -34).lineTo(54, -36).lineTo(61, -32).lineTo(73, -32).lineTo(85, -27)
      .lineTo(75, -20).lineTo(72, 9).lineTo(77, 16).quadraticCurveTo(55, 26, 43, 14)
      .closePath().fill(enamel).stroke({ color: 0x4b4235, width: 2 });
    rear.moveTo(42, -31).lineTo(52, -33).lineTo(60, -29).lineTo(72, -29)
      .stroke({ color: ochre, width: 2.3, alpha: 0.8, cap: 'round' });
    rear.ellipse(48, -4, 9, 10.5).fill(steel).ellipse(48, -4, 6.8, 8.1).fill(ink)
      .ellipse(46.5, -5, 2.8, 3.6).fill(enamel);
    if (detailed) {
      rear.moveTo(38, -17).lineTo(43, -21).lineTo(53, -22).lineTo(53.5, -17).lineTo(41.3, -14).closePath()
        .fill({ color: 0x775b3d, alpha: 0.69 });
      rear.moveTo(42.5, 5).quadraticCurveTo(46, 9, 51.4, 6.9)
        .stroke({ color: 0x9bc1ba, width: 1, alpha: 0.67, cap: 'round' });
      rear.circle(44.4, -24.6, 1.15).fill(0x5e5944).circle(44.1, -25, 0.45).fill(0xf8ddb1);
    }
  } else {
    rear.moveTo(48, 15).bezierCurveTo(35, 6, 33, -18, 47, -29).quadraticCurveTo(60, -40, 76, -31)
      .lineTo(68, -18).lineTo(67, 13).quadraticCurveTo(57, 22, 48, 15).closePath().fill(shell);
    rear.moveTo(44, -22).quadraticCurveTo(37, -37, 30, -38).quadraticCurveTo(53, -49, 65, -42)
      .quadraticCurveTo(71, -39, 75, -31).quadraticCurveTo(55, -36, 44, -22).closePath().fill(shell);
    rear.moveTo(36, -39).quadraticCurveTo(57, -46, 68, -37).stroke({ color: moss, width: 2.1, alpha: 0.88, cap: 'round' });
    rear.ellipse(50, -5, 9.4, 13.2).fill(steel).ellipse(50, -5, 6.3, 9.6).fill(ink);
    rear.arc(50, -5, 5.9, 2.5, 5.1).stroke({ color: moss, width: 1.25, alpha: 0.85 });
  }
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
  head.addChild(face(detailed), eye, brow, lid, smile, gasp);
  const plate = new Graphics({ label: 'plate' });
  if (compact) {
    const porthole = () => plate.moveTo(62, -23).quadraticCurveTo(79, -29, 90, -21)
      .lineTo(97, -9).quadraticCurveTo(98, 8, 85, 13).quadraticCurveTo(69, 19, 61, 7)
      .quadraticCurveTo(54, -6, 62, -23).closePath();
    porthole().fill({ color: 0x3e7680, alpha: detailed ? 0.18 : 0.28 });
    porthole().stroke({ color: 0x30383a, width: 6 });
    porthole().stroke({ color: 0xb18450, width: 2.4 });
    plate.moveTo(62, -20).quadraticCurveTo(76, -27, 88, -20)
      .stroke({ color: 0xe6c58c, width: 2.6, cap: 'round' });
    plate.moveTo(93, -11).quadraticCurveTo(99, 3, 87, 10)
      .stroke({ fill: glass, width: 2.5, cap: 'round' });
    plate.circle(62, 2, 1.5).fill(bone).circle(91, -16, 1.3).fill(bone);
    if (detailed) {
      plate.moveTo(88.7, -15.4).quadraticCurveTo(93.8, -9.2, 94.7, -3.6)
        .stroke({ color: 0xb6ded9, width: 1.1, alpha: 0.64, cap: 'round' });
      plate.moveTo(74, 12.8).quadraticCurveTo(81, 13.4, 86, 10.6)
        .stroke({ color: 0x5a493b, width: 1.1, alpha: 0.72, cap: 'round' });
    }
  } else {
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
  }
  const collar = new Graphics().moveTo(47, 11).quadraticCurveTo(66, 17, 87, 12).lineTo(83, 22)
    .quadraticCurveTo(61, 26, 48, 20).closePath().fill(steel);
  collar.moveTo(50, 17).quadraticCurveTo(67, 22, 82, 17).stroke({ color: bone, width: 1.4, alpha: 0.66 });
  if (opening) {
    const hingeY = compact ? -24 : -31;
    plate.pivot.set(65, hingeY); plate.position.set(65, hingeY);
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
