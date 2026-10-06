// Procedural furniture library. Every factory returns a THREE.Group in local space:
// origin = centre of footprint at floor level, FRONT faces +Z, width along X.
import * as THREE from 'three';
import { B, RB, C, boxGeo, rboxGeo, cylGeo, mesh, slab, superEllipseShape, roundRectShape, ellipseShape, rng } from '../utils/geom.js';

let M = null;
export function setMaterials(m) { M = m; }

const G = () => new THREE.Group();
const tag = (g, o = {}) => { Object.assign(g.userData, o); return g; };

// soft contact shadow under an object (fake AO)
export function contactShadow(parent, w, d, opacity = 0.42, y = 0.003) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.contact);
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 1;
  m.material = M.contact; m.userData.noMerge = false; m.userData.overlay = true;
  if (opacity !== 0.42) { m.material = M.contact.clone(); m.material.opacity = opacity; }
  m.castShadow = false; m.receiveShadow = false;
  parent.add(m); return m;
}

// ------------------------------------------------------------------ seating
export function sofa({ w = 2.2, d = 0.95, seats = 3, arms = 'both', mat, seatH = 0.43, backH = 0.8, armW = 0.17, armH = 0.62, scatter = 2, scatterMat } = {}) {
  const g = G(); mat = mat || M.fabricBeige;
  const leftArm = arms === 'both' || arms === 'left', rightArm = arms === 'both' || arms === 'right';
  const x0 = -w / 2 + (leftArm ? armW : 0), x1 = w / 2 - (rightArm ? armW : 0);
  const iw = x1 - x0;
  const backD = 0.2;
  // recessed plinth (shadow gap) + frame
  B(g, w - 0.08, 0.07, d - 0.08, M.cabCharcoal, 0, 0.035, -0.01);
  RB(g, w, 0.2, d, 0.03, mat, 0, 0.17, 0);
  // back frame
  RB(g, w, backH - 0.27, backD, 0.04, mat, 0, 0.27 + (backH - 0.27) / 2, -d / 2 + backD / 2);
  // arms
  if (leftArm) RB(g, armW, armH - 0.07, d, 0.05, mat, -w / 2 + armW / 2, 0.07 + (armH - 0.07) / 2, 0);
  if (rightArm) RB(g, armW, armH - 0.07, d, 0.05, mat, w / 2 - armW / 2, 0.07 + (armH - 0.07) / 2, 0);
  // seat + back cushions
  const cw = iw / seats;
  for (let i = 0; i < seats; i++) {
    const cx = x0 + cw * (i + 0.5);
    RB(g, cw - 0.012, seatH - 0.27, d - backD - 0.02, 0.06, mat, cx, 0.27 + (seatH - 0.27) / 2, backD / 2 + 0.0);
    const bc = RB(g, cw - 0.015, 0.44, 0.2, 0.08, mat, cx, seatH + 0.2, -d / 2 + backD + 0.08);
    bc.rotation.x = -0.14;
  }
  // scatter cushions
  const r = rng(Math.round(w * 100));
  for (let i = 0; i < scatter; i++) {
    const sx = i === 0 ? x0 + 0.28 : x1 - 0.28;
    const sc = RB(g, 0.44, 0.44, 0.13, 0.06, scatterMat || M.fabricOat, sx, seatH + 0.2, -d / 2 + backD + 0.22);
    sc.rotation.set(-0.25, (r() - 0.5) * 0.3, (r() - 0.5) * 0.2);
  }
  contactShadow(g, w + 0.15, d + 0.15);
  return tag(g, { collide: true, kind: 'sofa' });
}

export function chaiseModule({ w = 0.95, d = 1.6, mat, seatH = 0.43, backH = 0.8, armSide = 'right' } = {}) {
  const g = G(); mat = mat || M.fabricBeige;
  B(g, w - 0.08, 0.07, d - 0.08, M.cabCharcoal, 0, 0.035, 0);
  RB(g, w, 0.2, d, 0.03, mat, 0, 0.17, 0);
  RB(g, w - 0.02, seatH - 0.27, d - 0.02, 0.06, mat, 0, 0.27 + (seatH - 0.27) / 2, 0);
  const ax = armSide === 'right' ? w / 2 - 0.085 : -w / 2 + 0.085;
  RB(g, 0.17, 0.55, d, 0.05, mat, ax, 0.07 + 0.275, 0);
  void backH;
  contactShadow(g, w + 0.15, d + 0.15);
  return tag(g, { collide: true });
}

export function barrelChair({ mat, frameMat, r = 0.38, cane = false } = {}) {
  const g = G(); mat = mat || M.fabricOat;
  const shellMat = cane ? M.cane : (frameMat || mat);
  // plinth base
  C(g, r * 0.8, r * 0.85, 0.06, M.cabCharcoal, 0, 0.03, 0, 32);
  // seat cushion
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.04, r - 0.03, 0.14, 40), mat); seat.position.y = 0.36; seat.castShadow = seat.receiveShadow = true; g.add(seat);
  C(g, r - 0.02, r - 0.02, 0.24, shellMat, 0, 0.18, 0, 40);
  // curved back shell (270° around the rear)
  const th0 = Math.PI * 0.25 + Math.PI / 2, tl = Math.PI * 1.0;
  for (const [rad, side] of [[r, THREE.FrontSide], [r - 0.05, THREE.BackSide]]) {
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.42, 40, 1, true, th0, tl), side === THREE.BackSide ? mat : shellMat);
    shell.material = side === THREE.BackSide ? mat.clone() : shell.material;
    if (side === THREE.BackSide) shell.material.side = THREE.BackSide;
    shell.position.y = 0.5; shell.castShadow = true; shell.receiveShadow = true; g.add(shell);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r - 0.025, 0.028, 10, 40, tl), shellMat);
  rim.rotation.x = -Math.PI / 2; rim.rotation.z = th0 - Math.PI / 2 + Math.PI; rim.position.y = 0.71; rim.castShadow = true; g.add(rim);
  rim.rotation.set(Math.PI / 2, 0, -(th0 - Math.PI / 2));
  contactShadow(g, r * 2.4, r * 2.4);
  return tag(g, { collide: true });
}

export function accentChair({ mat } = {}) {
  const g = G(); mat = mat || M.fabricTaupe;
  const legs = [[-0.28, 0.24], [0.28, 0.24], [-0.28, -0.26], [0.28, -0.26]];
  legs.forEach(([x, z]) => { const l = C(g, 0.016, 0.012, 0.2, M.walnut, x, 0.1, z, 12); l.rotation.z = x * 0.15; });
  RB(g, 0.7, 0.16, 0.72, 0.05, mat, 0, 0.28, 0);
  RB(g, 0.66, 0.1, 0.6, 0.05, mat, 0, 0.39, 0.04);
  const back = RB(g, 0.7, 0.5, 0.14, 0.06, mat, 0, 0.6, -0.3); back.rotation.x = -0.2;
  RB(g, 0.1, 0.24, 0.66, 0.04, mat, -0.33, 0.47, 0); RB(g, 0.1, 0.24, 0.66, 0.04, mat, 0.33, 0.47, 0);
  contactShadow(g, 0.85, 0.85);
  return tag(g, { collide: true });
}

export function diningChair({ mat } = {}) {
  // upholstered dining chair: padded seat, reclined padded back on solid oak posts, tapered legs
  const g = G(); mat = mat || M.fabricOat;
  const legs = [[-0.19, 0.18], [0.19, 0.18]];
  legs.forEach(([x, z]) => { const l = C(g, 0.018, 0.013, 0.45, M.oak, x, 0.225, z, 12); l.rotation.x = -0.05; });
  for (const x of [-0.19, 0.19]) { // rear legs continue up as back posts
    const post = C(g, 0.017, 0.013, 0.92, M.oak, x, 0.46, -0.2, 12); post.rotation.x = 0.1;
  }
  RB(g, 0.42, 0.03, 0.4, 0.01, M.oak, 0, 0.43, 0); // seat frame
  RB(g, 0.46, 0.075, 0.46, 0.035, mat, 0, 0.48, 0.01); // seat cushion
  const back = RB(g, 0.44, 0.34, 0.07, 0.035, mat, 0, 0.74, -0.215); back.rotation.x = 0.1;
  B(g, 0.36, 0.025, 0.025, M.oak, 0, 0.18, -0.19); // stretcher
  contactShadow(g, 0.55, 0.55, 0.28);
  return tag(g, { collide: false });
}

export function officeChair({ mat } = {}) {
  const g = G(); mat = mat || M.fabricGrey;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spoke = B(g, 0.03, 0.03, 0.3, M.blackMetal, Math.sin(a) * 0.15, 0.06, Math.cos(a) * 0.15); spoke.rotation.y = a;
    const caster = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), M.black); caster.position.set(Math.sin(a) * 0.3, 0.025, Math.cos(a) * 0.3); g.add(caster);
  }
  C(g, 0.025, 0.025, 0.33, M.chrome, 0, 0.23, 0, 12);
  RB(g, 0.5, 0.08, 0.48, 0.035, mat, 0, 0.46, 0.02);
  const back = RB(g, 0.46, 0.55, 0.06, 0.03, mat, 0, 0.82, -0.24); back.rotation.x = 0.1;
  B(g, 0.06, 0.25, 0.04, M.blackMetal, 0, 0.6, -0.25);
  for (const s of [-1, 1]) { B(g, 0.03, 0.2, 0.03, M.blackMetal, s * 0.24, 0.58, 0); RB(g, 0.06, 0.03, 0.26, 0.012, M.black, s * 0.24, 0.69, 0); }
  return tag(g, { collide: false });
}

// ------------------------------------------------------------------ tables
export function roundTable({ r = 0.4, h = 0.38, topMat, baseMat, pedestal = true } = {}) {
  const g = G();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r - 0.006, 0.03, 48), topMat || M.whiteStone); top.position.y = h - 0.015; top.castShadow = top.receiveShadow = true; g.add(top);
  if (pedestal) {
    C(g, r * 0.35, r * 0.42, h - 0.03, baseMat || M.walnut, 0, (h - 0.03) / 2, 0, 32);
  } else {
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const l = C(g, 0.012, 0.012, h - 0.03, baseMat || M.charcoalMetal, Math.cos(a) * r * 0.75, (h - 0.03) / 2, Math.sin(a) * r * 0.75, 8); void l; }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.75, 0.008, 6, 40), baseMat || M.charcoalMetal); ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; g.add(ring);
  }
  contactShadow(g, r * 2.3, r * 2.3, 0.35);
  return tag(g, { collide: true });
}

export function diningTable({ w = 1.9, d = 1.0, h = 0.75 } = {}) {
  const g = G();
  const top = slab(superEllipseShape(w, d, 3.0), 0.035, M.whiteStone, 0.008); top.position.y = h - 0.035; g.add(top);
  // sculpted timber base: two tapered blades + stretcher
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(-0.24, 0); shape.lineTo(0.24, 0); shape.lineTo(0.13, h - 0.06); shape.lineTo(-0.13, h - 0.06); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
    geo.translate(0, 0, -0.035);
    const blade = new THREE.Mesh(geo, M.walnut); blade.rotation.y = Math.PI / 2; blade.position.set(s * w * 0.28, 0, 0); blade.castShadow = blade.receiveShadow = true; g.add(blade);
    B(g, 0.09, 0.03, 0.55, M.walnut, s * w * 0.28, h - 0.05, 0);
  }
  B(g, w * 0.56, 0.05, 0.06, M.walnut, 0, 0.2, 0);
  contactShadow(g, w + 0.3, d + 0.3, 0.3);
  return tag(g, { collide: true });
}

export function coffeeTableNest() {
  const g = G();
  const a = roundTable({ r: 0.42, h: 0.36, topMat: M.whiteStone, baseMat: M.walnut });
  const b = roundTable({ r: 0.32, h: 0.42, topMat: M.walnut, baseMat: M.charcoalMetal, pedestal: false });
  a.position.set(-0.2, 0, 0.05); b.position.set(0.38, 0, -0.12);
  g.add(a); g.add(b);
  // decor
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.ceramicMatte); bowl.position.set(-0.28, 0.47, 0.05); bowl.rotation.x = Math.PI; g.add(bowl);
  B(g, 0.24, 0.04, 0.17, M.paper, -0.05, 0.38, 0.1); B(g, 0.22, 0.03, 0.16, M.cabTaupe, -0.06, 0.415, 0.1);
  const vase = lathe([[0, 0], [0.05, 0], [0.06, 0.06], [0.035, 0.16], [0.03, 0.2], [0.04, 0.22], [0, 0.22]], M.ceramic); vase.position.set(0.4, 0.42, -0.12); g.add(vase);
  return tag(g, { collide: true });
}

function lathe(pts, mat, seg = 28) {
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
export { lathe };

// ------------------------------------------------------------------ beds
export function bed({ w = 1.95, l = 2.15, mattress = [1.83, 1.98], headMat, frameMat, duvetMat, throwMat, headH = 1.15, size = 'king' } = {}) {
  const g = G();
  headMat = headMat || M.fabricBeige; frameMat = frameMat || M.oak; duvetMat = duvetMat || M.linen; throwMat = throwMat || M.throwTaupe;
  const hbD = 0.1; const z0 = -l / 2; // head end at -Z (local back)
  // base frame (recessed plinth)
  B(g, w - 0.12, 0.08, l - 0.25, M.cabCharcoal, 0, 0.04, 0.05);
  RB(g, w, 0.24, l - hbD, 0.02, frameMat, 0, 0.08 + 0.12, hbD / 2);
  // channel-tufted upholstered headboard
  const n = Math.round(w / 0.2);
  const cw = w / n;
  for (let i = 0; i < n; i++) RB(g, cw - 0.006, headH - 0.06, hbD, 0.045, headMat, -w / 2 + cw * (i + 0.5), 0.06 + (headH - 0.06) / 2, z0 + hbD / 2);
  B(g, w + 0.01, 0.05, hbD + 0.02, frameMat, 0, headH + 0.02, z0 + hbD / 2);
  // mattress
  const [mw, ml] = mattress;
  const mz = z0 + hbD + 0.03 + ml / 2;
  RB(g, mw, 0.24, ml, 0.06, M.linenGrey, 0, 0.32 + 0.12, mz);
  // duvet (covers the lower 70%), with turned-down cuff and side drape
  const dl = ml * 0.74, dz = mz + ml / 2 - dl / 2 + 0.02;
  RB(g, mw + 0.08, 0.07, dl, 0.035, duvetMat, 0, 0.56 + 0.03, dz);
  RB(g, mw + 0.09, 0.05, 0.28, 0.03, duvetMat, 0, 0.63, dz - dl / 2 + 0.14);
  for (const s of [-1, 1]) RB(g, 0.03, 0.28, dl, 0.015, duvetMat, s * (mw / 2 + 0.045), 0.46, dz);
  RB(g, mw + 0.08, 0.28, 0.03, 0.015, duvetMat, 0, 0.46, dz + dl / 2 + 0.01);
  // folded throw at the foot
  RB(g, mw + 0.12, 0.035, 0.42, 0.015, throwMat, 0, 0.64, mz + ml / 2 - 0.3);
  for (const s of [-1, 1]) RB(g, 0.025, 0.2, 0.42, 0.01, throwMat, s * (mw / 2 + 0.07), 0.55, mz + ml / 2 - 0.3);
  // pillows
  const pw = size === 'king' ? 0.72 : 0.66;
  const pillows = size === 'king' ? [-0.42, 0.42] : [-0.36, 0.36];
  pillows.forEach((px) => {
    const p = RB(g, pw, 0.42, 0.16, 0.07, M.linen, px * (mw / 1.83), 0.76, z0 + hbD + 0.16); p.rotation.x = -0.32;
  });
  pillows.forEach((px, i) => {
    const p = RB(g, pw - 0.04, 0.38, 0.15, 0.07, i ? M.linenGrey : M.linenGrey, px * (mw / 1.83) * 0.98, 0.7, z0 + hbD + 0.32); p.rotation.x = -0.45;
  });
  const cush = RB(g, 0.5, 0.3, 0.12, 0.05, throwMat, 0, 0.7, z0 + hbD + 0.45); cush.rotation.x = -0.5;
  contactShadow(g, w + 0.2, l + 0.15, 0.4);
  return tag(g, { collide: true, kind: 'bed' });
}

export function bedsideTable({ w = 0.46, d = 0.4, h = 0.5, mat } = {}) {
  const g = G(); mat = mat || M.oak;
  RB(g, w, 0.035, d, 0.008, mat, 0, h - 0.0175, 0);
  RB(g, w - 0.02, h - 0.2, d - 0.02, 0.006, mat, 0, h - 0.035 - (h - 0.2) / 2, 0);
  B(g, w - 0.08, 0.006, 0.004, M.cabCharcoal, 0, h - 0.13, d / 2 - 0.008);
  B(g, w - 0.06, 0.15, d - 0.06, M.cabCharcoal, 0, 0.075, -0.01);
  // decor: small lamp-free tray, book, ceramic
  B(g, 0.2, 0.03, 0.14, M.paper, -0.06, h + 0.015, 0.04);
  const cup = lathe([[0, 0], [0.035, 0], [0.04, 0.09], [0, 0.09]], M.ceramicMatte); cup.position.set(0.12, h, -0.05); g.add(cup);
  contactShadow(g, w + 0.1, d + 0.1, 0.3);
  return tag(g, { collide: true });
}

export function bench({ w = 1.3, d = 0.42, h = 0.45, mat } = {}) {
  const g = G(); mat = mat || M.fabricTaupe;
  RB(g, w, 0.12, d, 0.04, mat, 0, h - 0.06, 0);
  for (const s of [-1, 1]) { B(g, 0.04, h - 0.12, d - 0.04, M.walnut, s * (w / 2 - 0.08), (h - 0.12) / 2, 0); }
  B(g, w - 0.16, 0.025, 0.04, M.walnut, 0, 0.12, 0);
  contactShadow(g, w + 0.1, d + 0.1, 0.3);
  return tag(g, { collide: true });
}

// ------------------------------------------------------------------ storage
/** Floor-to-ceiling sliding wardrobe. pattern: list of 'taupe'|'oak'|'mirror'|'beige'|'grey'|'white' per panel */
export function wardrobe({ w = 2.0, h = 2.75, d = 0.6, pattern, light = true } = {}) {
  const g = G();
  const n = pattern ? pattern.length : Math.max(2, Math.round(w / 0.9));
  pattern = pattern || Array.from({ length: n }, (_, i) => (i % 2 ? 'taupe' : 'oak'));
  const matOf = { taupe: M.cabTaupe, oak: M.oakV, mirror: M.smokedMirror, beige: M.cabBeige, grey: M.cabGrey, white: M.cabWhite, walnut: M.walnut, fluted: M.flutedOak };
  // carcass
  B(g, w, h - 0.06, d - 0.06, M.carcass, 0, (h - 0.06) / 2 + 0.06, -0.03);
  B(g, w - 0.02, 0.06, d - 0.08, M.cabCharcoal, 0, 0.03, -0.04);
  // tracks
  B(g, w, 0.035, 0.08, M.charcoalMetal, 0, h - 0.0175, d / 2 - 0.04);
  B(g, w, 0.012, 0.07, M.charcoalMetal, 0, 0.066, d / 2 - 0.04);
  // sliding panels on two planes (overlap 25 mm)
  const pw = w / n + 0.025;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (w / n) * (i + 0.5);
    const z = d / 2 - (i % 2 ? 0.065 : 0.03);
    const m = matOf[pattern[i]] || M.cabTaupe;
    const pnl = B(g, pw - 0.004, h - 0.12, 0.022, m, x, 0.075 + (h - 0.12) / 2, z);
    void pnl;
    // slim vertical charcoal edge profiles (concealed handle)
    B(g, 0.018, h - 0.12, 0.03, M.charcoalMetal, x + (i % 2 ? -1 : 1) * (pw / 2 - 0.009), 0.075 + (h - 0.12) / 2, z);
    if (pattern[i] === 'mirror') { B(g, pw - 0.004, 0.02, 0.026, M.charcoalMetal, x, 0.075 + (h - 0.12) * 0.62, z); }
  }
  if (light) {
    const strip = B(g, w - 0.06, 0.01, 0.02, M.ledWarm, 0, h - 0.07, d / 2 - 0.1); strip.castShadow = false; strip.userData.light = 'wardrobe';
  }
  return tag(g, { collide: true, cap: true });
}

export function shoeConsole({ w = 1.05, d = 0.36, h = 0.95, mirror = true } = {}) {
  const g = G();
  // floating shoe cabinet with fluted oak shutters, quartz top, mirror above
  B(g, w, h - 0.18, d, M.carcass, 0, 0.18 + (h - 0.18) / 2, 0);
  const n = 3; const pw = w / n;
  for (let i = 0; i < n; i++) B(g, pw - 0.004, h - 0.2, 0.02, M.flutedOak, -w / 2 + pw * (i + 0.5), 0.18 + (h - 0.2) / 2, d / 2 + 0.01);
  B(g, w + 0.02, 0.025, d + 0.02, M.quartz, 0, h + 0.0125, 0.005);
  const led = B(g, w - 0.04, 0.008, 0.02, M.ledWarm, 0, 0.17, d / 2 - 0.04); led.userData.light = 'warm';
  if (mirror) {
    const fr = RB(g, 0.72, 0.95, 0.025, 0.012, M.brass, 0, h + 0.75, -d / 2 + 0.0125);
    void fr;
    B(g, 0.69, 0.92, 0.01, M.mirror, 0, h + 0.75, -d / 2 + 0.03);
  }
  // decor
  const tray = lathe([[0, 0], [0.12, 0], [0.13, 0.02], [0.115, 0.025], [0, 0.012]], M.brass); tray.position.set(-0.25, h + 0.025, 0); g.add(tray);
  const vase = lathe([[0, 0], [0.06, 0], [0.08, 0.12], [0.04, 0.28], [0.05, 0.32], [0, 0.32]], M.ceramicMatte); vase.position.set(0.3, h + 0.025, -0.03); g.add(vase);
  for (let i = 0; i < 3; i++) { const st = C(g, 0.003, 0.003, 0.35, M.stem, 0.3 + (i - 1) * 0.02, h + 0.4, -0.03 + (i - 1) * 0.01, 5); st.rotation.z = (i - 1) * 0.2; }
  contactShadow(g, w + 0.1, d + 0.15, 0.25);
  return tag(g, { collide: true });
}

export function storageRun({ w = 2.7, h = 2.75, d = 0.8 } = {}) {
  // Hall-side fitted storage run: closed sliding fronts with a lit display niche
  const g = G();
  const pw0 = w / 4;
  // carcass: full depth except a recessed display niche (0.92–1.65 m) in the two centre bays
  B(g, w, 0.85, d - 0.04, M.carcass, 0, 0.425, -0.02);
  B(g, w, h - 1.67, d - 0.04, M.carcass, 0, 1.67 + (h - 1.67) / 2, -0.02);
  B(g, pw0, 0.82, d - 0.04, M.carcass, -w / 2 + pw0 / 2, 1.26, -0.02);
  B(g, pw0, 0.82, d - 0.04, M.carcass, w / 2 - pw0 / 2, 1.26, -0.02);
  B(g, w / 2, 0.82, 0.3, M.carcass, 0, 1.26, -d / 2 + 0.15);
  B(g, w / 2 - 0.02, 0.8, 0.012, M.walnutV, 0, 1.26, -d / 2 + 0.306);
  B(g, 0.03, 0.82, d - 0.36, M.walnut, 0, 1.26, 0.12);
  B(g, w - 0.02, 0.07, d - 0.05, M.cabCharcoal, 0, 0.035, -0.04);
  const n = 4; const pw = w / n;
  const pattern = ['beige', 'oak', 'oak', 'beige'];
  const matOf = { beige: M.cabBeige, oak: M.flutedOak };
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + pw * (i + 0.5);
    if (i === 1 || i === 2) {
      // open display niche (0.9-1.6 m) with back-lit shelf
      B(g, pw - 0.005, 0.83, 0.022, matOf[pattern[i]], x, 0.08 + 0.415, d / 2 - 0.02);
      B(g, pw - 0.005, h - 1.65 - 0.02, 0.022, matOf[pattern[i]], x, 1.65 + (h - 1.65) / 2, d / 2 - 0.02);
      B(g, pw - 0.04, 0.74, 0.01, M.walnut, x, 1.28, -d / 2 + 0.2);
      B(g, pw - 0.04, 0.03, d - 0.3, M.walnut, x, 0.92, 0.0);
      const led = B(g, pw - 0.06, 0.008, 0.02, M.ledWarm, x, 1.63, d / 2 - 0.08); led.userData.light = 'warm';
      // display objects
      if (i === 1) { const v = lathe([[0, 0], [0.07, 0], [0.09, 0.15], [0.05, 0.3], [0, 0.3]], M.ceramicMatte); v.position.set(x - 0.12, 0.935, 0); g.add(v); B(g, 0.18, 0.22, 0.03, M.paper, x + 0.15, 1.05, -0.12).rotation.x = -0.15; }
      else { const v = lathe([[0, 0], [0.1, 0], [0.11, 0.08], [0.06, 0.16], [0, 0.16]], M.brass); v.position.set(x + 0.1, 0.935, 0); g.add(v); for (let k = 0; k < 4; k++) B(g, 0.035, 0.24, 0.17, [M.cabTaupe, M.paper, M.cabGrey, M.walnut][k], x - 0.2 + k * 0.04, 1.055, 0); }
    } else {
      B(g, pw - 0.005, h - 0.1, 0.022, matOf[pattern[i]], x, 0.07 + (h - 0.1) / 2, d / 2 - 0.02);
      B(g, 0.018, 0.9, 0.03, M.charcoalMetal, x + (i === 0 ? 1 : -1) * (pw / 2 - 0.03), 1.1, d / 2 - 0.005);
    }
  }
  return tag(g, { collide: true, cap: true });
}

// ------------------------------------------------------------------ media / living
export function mediaWall({ w = 3.4, h = 2.9 } = {}) {
  const g = G();
  // stone/microcement centre panel flanked by vertical walnut slats
  const pw = 1.9;
  B(g, pw, h - 0.1, 0.03, M.microcement, 0, (h - 0.1) / 2, 0.015);
  const sw = (w - pw) / 2;
  for (const s of [-1, 1]) {
    const cx = s * (pw / 2 + sw / 2);
    B(g, sw, h - 0.1, 0.02, M.cabCharcoal, cx, (h - 0.1) / 2, 0.01);
    const n = Math.floor(sw / 0.05);
    for (let i = 0; i < n; i++) B(g, 0.03, h - 0.1, 0.03, M.slatWalnut, cx - sw / 2 + 0.025 + i * (sw / n), (h - 0.1) / 2, 0.035);
  }
  // floating console
  RB(g, 2.4, 0.36, 0.42, 0.01, M.cabGrey, 0, 0.38, 0.24);
  for (let i = 0; i < 3; i++) B(g, 0.78, 0.004, 0.004, M.cabCharcoal, -0.8 + i * 0.8, 0.5, 0.452);
  B(g, 2.42, 0.025, 0.44, M.walnut, 0, 0.5725, 0.24);
  const under = B(g, 2.3, 0.008, 0.02, M.ledWarm, 0, 0.195, 0.36); under.userData.light = 'warm'; under.castShadow = false;
  // TV (65")
  RB(g, 1.46, 0.84, 0.03, 0.006, M.black, 0, 1.45, 0.05);
  const scr = B(g, 1.43, 0.81, 0.002, M.screen, 0, 1.45, 0.066); scr.castShadow = false;
  // soundbar & decor
  RB(g, 0.9, 0.06, 0.09, 0.02, M.black, 0, 0.62, 0.25);
  const v = lathe([[0, 0], [0.08, 0], [0.1, 0.1], [0.05, 0.38], [0.06, 0.42], [0, 0.42]], M.ceramicMatte); v.position.set(-0.95, 0.585, 0.22); g.add(v);
  for (let k = 0; k < 3; k++) B(g, 0.22, 0.035, 0.16, [M.paper, M.cabTaupe, M.walnut][k], 0.85, 0.6 + k * 0.035, 0.22).rotation.y = k * 0.1;
  const cove = B(g, pw - 0.1, 0.01, 0.015, M.ledWarm, 0, h - 0.12, 0.05); cove.userData.light = 'mediaCove'; cove.castShadow = false;
  return tag(g, { collide: true, colliderParts: true });
}

export function rug({ w = 2.4, d = 1.7, mat, border = true } = {}) {
  const g = G();
  const m = RB(g, w, 0.012, d, 0.005, mat || M.rug, 0, 0.006, 0); m.castShadow = false;
  if (border) { const b = RB(g, w - 0.16, 0.0125, d - 0.16, 0.004, M.rugGrey, 0, 0.0065, 0); b.castShadow = false; const c = RB(g, w - 0.24, 0.013, d - 0.24, 0.004, mat || M.rug, 0, 0.007, 0); c.castShadow = false; }
  return tag(g, { collide: false, kind: 'rug' });
}

// ------------------------------------------------------------------ desks & office
export function desk({ w = 1.2, d = 0.6, h = 0.75, mat, pedestal = true, monitor = true } = {}) {
  const g = G(); mat = mat || M.oak;
  RB(g, w, 0.03, d, 0.006, mat, 0, h - 0.015, 0);
  if (pedestal) {
    B(g, 0.42, h - 0.03, d - 0.04, M.cabWhite, w / 2 - 0.21, (h - 0.03) / 2, -0.01);
    for (let i = 0; i < 3; i++) B(g, 0.38, 0.003, 0.004, M.cabCharcoal, w / 2 - 0.21, 0.24 + i * 0.22, d / 2 - 0.028);
    B(g, 0.03, h - 0.03, d - 0.06, M.charcoalMetal, -w / 2 + 0.03, (h - 0.03) / 2, 0);
  } else {
    for (const s of [-1, 1]) B(g, 0.03, h - 0.03, d - 0.06, M.charcoalMetal, s * (w / 2 - 0.03), (h - 0.03) / 2, 0);
  }
  // cable tray + grommet
  B(g, w - 0.3, 0.05, 0.12, M.charcoalMetal, 0, h - 0.08, -d / 2 + 0.08);
  C(g, 0.03, 0.03, 0.032, M.charcoalMetal, -w / 2 + 0.2, h, -d / 2 + 0.08, 16);
  if (monitor) {
    RB(g, 0.62, 0.37, 0.02, 0.006, M.black, 0, h + 0.33, -d / 2 + 0.16);
    B(g, 0.6, 0.35, 0.002, M.screen, 0, h + 0.33, -d / 2 + 0.171);
    B(g, 0.04, 0.16, 0.03, M.charcoalMetal, 0, h + 0.08, -d / 2 + 0.13);
    B(g, 0.22, 0.012, 0.16, M.charcoalMetal, 0, h + 0.006, -d / 2 + 0.13);
    B(g, 0.44, 0.012, 0.14, M.cabWhite, 0, h + 0.006, 0.05);
    RB(g, 0.06, 0.025, 0.1, 0.012, M.cabWhite, 0.32, h + 0.012, 0.06);
  }
  // task lamp
  C(g, 0.06, 0.07, 0.015, M.charcoalMetal, -w / 2 + 0.15, h + 0.008, -d / 2 + 0.12, 20);
  const arm = B(g, 0.012, 0.42, 0.012, M.charcoalMetal, -w / 2 + 0.15, h + 0.22, -d / 2 + 0.12); arm.rotation.z = 0.12;
  const head = C(g, 0.045, 0.06, 0.08, M.charcoalMetal, -w / 2 + 0.2, h + 0.42, -d / 2 + 0.2, 16); head.rotation.x = 0.6;
  contactShadow(g, w + 0.1, d + 0.1, 0.25);
  return tag(g, { collide: true });
}

export function bookshelf({ w = 1.2, h = 2.1, d = 0.34 } = {}) {
  const g = G();
  const r = rng(Math.round(w * 37));
  B(g, w, h, 0.02, M.cabWhite, 0, h / 2, -d / 2 + 0.01);
  for (const s of [-1, 1]) B(g, 0.025, h, d, M.walnut, s * (w / 2 - 0.0125), h / 2, 0);
  B(g, w - 0.05, 0.4, d - 0.02, M.cabGrey, 0, 0.2, 0.0);
  for (let i = 0; i < 2; i++) B(g, (w - 0.05) / 2 - 0.004, 0.38, 0.02, M.cabGrey, -w / 4 + i * (w / 2) - 0.012 + i * 0.024, 0.2, d / 2 - 0.01);
  const shelves = 4;
  for (let k = 0; k < shelves; k++) {
    const y = 0.4 + ((h - 0.4) / shelves) * (k + 1);
    B(g, w - 0.05, 0.025, d - 0.02, M.walnut, 0, y, 0);
    // books
    let x = -w / 2 + 0.05;
    while (x < w / 2 - 0.1) {
      if (r() < 0.18) { x += 0.12; continue; }
      const bw = 0.025 + r() * 0.02, bh = 0.2 + r() * 0.1;
      const cols = [M.cabTaupe, M.paper, M.cabGrey, M.walnut, M.cabBeige, M.fabricTeal, M.cabCharcoal];
      B(g, bw, bh, 0.17 + r() * 0.05, cols[Math.floor(r() * cols.length)], x + bw / 2, y - ((h - 0.4) / shelves) + 0.0125 + bh / 2 + 0.0, -0.02);
      x += bw + 0.002;
      if (r() < 0.05) x += 0.2;
    }
  }
  return tag(g, { collide: true, cap: true });
}

export function acousticPanel({ w = 1.6, h = 0.9 } = {}) {
  const g = G();
  B(g, w, h, 0.02, M.fabricGrey, 0, 0, 0.01);
  const n = Math.floor(w / 0.06);
  for (let i = 0; i < n; i++) B(g, 0.03, h - 0.04, 0.025, M.slatWalnut, -w / 2 + 0.03 + i * (w / n), 0, 0.03);
  return g;
}

// ------------------------------------------------------------------ kitchen
/** Base cabinet run: w along X, depth d, front +Z. drawers: array of module widths with 'd' or 's' */
export function baseRun({ w, d = 0.6, h = 0.9, modules, topMat, sinkAt = null, hobAt = null, endPanel = false } = {}) {
  const g = G(); topMat = topMat || M.quartz;
  const plinth = 0.1, topT = 0.04;
  const ch = h - plinth - topT;
  B(g, w, ch, d - 0.04, M.carcass, 0, plinth + ch / 2, -0.02);
  B(g, w - 0.02, plinth, d - 0.1, M.cabCharcoal, 0, plinth / 2, -0.06);
  modules = modules || [];
  let x = -w / 2;
  const tot = modules.reduce((a, m) => a + m[0], 0);
  const scale = tot > 0 ? w / tot : 1;
  for (const [mw0, type] of modules) {
    const mw = mw0 * scale;
    const cx = x + mw / 2;
    if (type === 'd') {
      // 3 deep drawers
      const hs = [ch * 0.25, ch * 0.35, ch * 0.4];
      let y = plinth;
      for (let i = hs.length - 1; i >= 0; i--) { B(g, mw - 0.004, hs[i] - 0.004, 0.019, M.cabGrey, cx, y + hs[i] / 2, d / 2 - 0.0095); B(g, mw * 0.6, 0.012, 0.012, M.charcoalMetal, cx, y + hs[i] - 0.03, d / 2 + 0.006); y += hs[i]; }
    } else if (type === 'dd') {
      const hs = [ch * 0.5, ch * 0.5]; let y = plinth;
      for (const hh of hs) { B(g, mw - 0.004, hh - 0.004, 0.019, M.cabGrey, cx, y + hh / 2, d / 2 - 0.0095); B(g, mw * 0.6, 0.012, 0.012, M.charcoalMetal, cx, y + hh - 0.03, d / 2 + 0.006); y += hh; }
    } else {
      B(g, mw - 0.004, ch - 0.004, 0.019, M.cabGrey, cx, plinth + ch / 2, d / 2 - 0.0095);
      B(g, mw * 0.5, 0.012, 0.012, M.charcoalMetal, cx, plinth + ch - 0.03, d / 2 + 0.006);
    }
    x += mw;
  }
  // countertop (with sink cut-out if needed)
  const yT = h - topT / 2;
  if (sinkAt !== null) {
    const sw = 0.62, sd = 0.42, sx = sinkAt;
    B(g, sx - sw / 2 + w / 2, topT, d, topMat, (-w / 2 + sx - sw / 2) / 2, yT, 0);
    B(g, w / 2 - (sx + sw / 2), topT, d, topMat, (w / 2 + sx + sw / 2) / 2, yT, 0);
    B(g, sw, topT, (d - sd) / 2 + 0.02, topMat, sx, yT, d / 2 - ((d - sd) / 2 + 0.02) / 2);
    B(g, sw, topT, (d - sd) / 2 - 0.02, topMat, sx, yT, -d / 2 + ((d - sd) / 2 - 0.02) / 2);
    // bowl (inside faces)
    const bowl = new THREE.Mesh(boxGeo(sw - 0.01, 0.22, sd - 0.01), M.steel.clone()); bowl.material.side = THREE.BackSide; bowl.position.set(sx, h - 0.11 - topT + 0.02, 0.02); g.add(bowl);
    // tap
    const tapX = sx, tapZ = -d / 2 + 0.07;
    C(g, 0.025, 0.028, 0.04, M.chrome, tapX, h + 0.02, tapZ, 16);
    const neck = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.014, 10, 24, Math.PI), M.chrome); neck.position.set(tapX, h + 0.28, tapZ + 0.12); neck.rotation.y = Math.PI / 2; g.add(neck);
    C(g, 0.014, 0.014, 0.28, M.chrome, tapX, h + 0.16, tapZ, 12);
    C(g, 0.016, 0.014, 0.06, M.chrome, tapX, h + 0.25, tapZ + 0.24, 12);
  } else {
    B(g, w, topT, d, topMat, 0, yT, 0);
  }
  if (hobAt !== null) {
    const hb = B(g, 0.76, 0.008, 0.52, M.blackGlass, hobAt, h + 0.004, 0); void hb;
    const burners = [[-0.22, -0.11, 0.08], [0.22, -0.11, 0.07], [-0.22, 0.12, 0.06], [0.22, 0.12, 0.09], [0, 0, 0.05]];
    burners.forEach(([bx, bz, br]) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(br, 0.008, 6, 28), M.blackMetal); ring.rotation.x = Math.PI / 2; ring.position.set(hobAt + bx, h + 0.02, bz); g.add(ring);
      C(g, br * 0.55, br * 0.6, 0.02, M.brassDark, hobAt + bx, h + 0.015, bz, 20);
      for (let k = 0; k < 4; k++) { const p = B(g, br * 2.2, 0.012, 0.012, M.blackMetal, hobAt + bx, h + 0.03, bz); p.rotation.y = (k * Math.PI) / 4; }
    });
    for (let k = 0; k < 4; k++) C(g, 0.018, 0.02, 0.025, M.blackMetal, hobAt - 0.24 + k * 0.16, h - topT - 0.05, d / 2 + 0.012, 16).rotation.x = Math.PI / 2;
  }
  if (endPanel) B(g, 0.02, h, d, topMat, w / 2 + 0.01, h / 2, 0);
  return tag(g, { collide: true });
}

export function wallCabinets({ w, h = 0.72, d = 0.35, mat, open = [] } = {}) {
  const g = G(); mat = mat || M.cabWhite;
  B(g, w, h, d - 0.02, M.carcass, 0, h / 2, -0.01);
  const n = Math.max(1, Math.round(w / 0.5));
  const pw = w / n;
  for (let i = 0; i < n; i++) {
    if (open.includes(i)) { B(g, pw - 0.02, 0.02, d - 0.04, M.walnut, -w / 2 + pw * (i + 0.5), h / 2, 0); continue; }
    B(g, pw - 0.004, h - 0.004, 0.019, mat, -w / 2 + pw * (i + 0.5), h / 2, d / 2 - 0.0095);
  }
  B(g, w - 0.01, 0.025, 0.01, M.charcoalMetal, 0, 0.0125, d / 2 - 0.005); // J-profile shadow
  const led = B(g, w - 0.06, 0.006, 0.02, M.ledNeutral, 0, -0.004, d / 2 - 0.06); led.userData.light = 'underCab'; led.castShadow = false;
  return tag(g, { cap: true });
}

export function tallUnit({ w = 0.6, h = 2.4, d = 0.6, kind = 'pantry' } = {}) {
  const g = G();
  B(g, w, h - 0.1, d - 0.04, M.carcass, 0, 0.1 + (h - 0.1) / 2, -0.02);
  B(g, w - 0.02, 0.1, d - 0.1, M.cabCharcoal, 0, 0.05, -0.06);
  if (kind === 'fridge') {
    // stainless french-door fridge in a housing
    B(g, w - 0.04, h - 0.6, 0.62, M.steel, 0, 0.1 + (h - 0.6) / 2, 0.02);
    B(g, 0.004, h - 0.85, 0.63, M.blackMetal, 0, 0.6 + (h - 0.85) / 2 - 0.15, 0.02);
    B(g, w - 0.04, 0.004, 0.63, M.blackMetal, 0, 0.6, 0.02);
    for (const s of [-1, 1]) C(g, 0.012, 0.012, 0.6, M.chrome, s * 0.04, 1.2, 0.34, 10);
    C(g, 0.012, 0.012, 0.3, M.chrome, 0, 0.45, 0.34, 10).rotation.z = Math.PI / 2;
    B(g, w - 0.004, 0.48, 0.019, M.cabWhite, 0, h - 0.25, d / 2 - 0.0095);
  } else {
    const hh = (h - 0.1) / 2;
    B(g, w - 0.004, hh - 0.004, 0.019, M.cabWhite, 0, 0.1 + hh / 2, d / 2 - 0.0095);
    B(g, w - 0.004, hh - 0.004, 0.019, M.cabWhite, 0, 0.1 + hh * 1.5, d / 2 - 0.0095);
    B(g, 0.012, 0.5, 0.012, M.charcoalMetal, w / 2 - 0.05, 1.05, d / 2 + 0.006);
  }
  return tag(g, { collide: true, cap: true });
}

export function chimney({ w = 0.9 } = {}) {
  const g = G();
  // T-shaped hood: angled glass/steel canopy + duct cover to ceiling
  B(g, w, 0.06, 0.5, M.steel, 0, 0.03, 0.0);
  const glass = B(g, w, 0.32, 0.01, M.blackGlass, 0, 0.2, 0.18); glass.rotation.x = -0.45;
  B(g, w, 0.32, 0.2, M.blackMetal, 0, 0.2, -0.12);
  B(g, 0.32, 0.9, 0.26, M.steel, 0, 0.8, -0.1);
  const lamp = B(g, 0.18, 0.006, 0.06, M.ledNeutral, 0, -0.004, 0.08); lamp.userData.light = 'underCab';
  return g;
}

// ------------------------------------------------------------------ bathroom
export function vanity({ w = 0.75, d = 0.48, mat } = {}) {
  const g = G(); mat = mat || M.oak;
  // wall-hung drawer unit + quartz top + vessel basin + wall mixer
  B(g, w, 0.38, d - 0.02, mat, 0, 0.48 + 0.19, -0.01);
  B(g, w - 0.04, 0.005, 0.005, M.cabCharcoal, 0, 0.67, d / 2 - 0.02);
  B(g, w + 0.02, 0.03, d, M.quartz, 0, 0.885, 0);
  const basin = lathe([[0, 0], [0.16, 0], [0.2, 0.03], [0.21, 0.12], [0.195, 0.125], [0.18, 0.04], [0, 0.03]], M.ceramic, 40);
  basin.scale.set(1, 1, 0.82); basin.position.set(0, 0.9, 0.02); g.add(basin);
  C(g, 0.02, 0.02, 0.012, M.chrome, 0, 0.9 + 0.031, 0.02, 12);
  // wall spout
  B(g, 0.05, 0.05, 0.02, M.brushedGold || M.brass, 0, 1.15, -d / 2 + 0.01);
  C(g, 0.012, 0.012, 0.18, M.brass, 0, 1.15, -d / 2 + 0.1, 12).rotation.x = Math.PI / 2;
  C(g, 0.015, 0.015, 0.05, M.brass, 0.12, 1.15, -d / 2 + 0.03, 12).rotation.x = Math.PI / 2;
  // towel + soap
  RB(g, 0.24, 0.04, 0.16, 0.015, M.linen, -w / 2 + 0.16, 0.92, 0.08);
  const soap = lathe([[0, 0], [0.035, 0], [0.035, 0.13], [0.012, 0.15], [0.012, 0.17], [0, 0.17]], M.ceramicMatte); soap.position.set(w / 2 - 0.1, 0.9, -0.1); g.add(soap);
  return tag(g, { collide: true });
}

export function backlitMirror({ w = 0.7, h = 0.9, round = false } = {}) {
  const g = G();
  if (round) {
    const glow = new THREE.Mesh(new THREE.CircleGeometry(w / 2 + 0.03, 48), M.ledWarm); glow.position.z = 0.005; glow.userData.light = 'mirror'; g.add(glow);
    const mir = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.02, 48), M.mirror); mir.rotation.x = Math.PI / 2; mir.position.z = 0.03; g.add(mir);
  } else {
    const glow = B(g, w + 0.05, h + 0.05, 0.004, M.ledWarm, 0, 0, 0.004); glow.userData.light = 'mirror'; glow.castShadow = false;
    RB(g, w, h, 0.02, 0.03, M.mirror, 0, 0, 0.03);
  }
  return g;
}

export function wcWallHung() {
  const g = G();
  // concealed cistern ledge + flush plate
  B(g, 0.6, 1.0, 0.18, M.bathWall, 0, 0.5, -0.09 - 0.12);
  B(g, 0.22, 0.15, 0.01, M.chrome, 0, 0.82, -0.115);
  // bowl
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 20), M.ceramic);
  bowl.scale.set(0.9, 0.62, 1.35); bowl.position.set(0, 0.3, 0.12); bowl.castShadow = true; g.add(bowl);
  RB(g, 0.36, 0.25, 0.12, 0.04, M.ceramic, 0, 0.3, -0.06);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.025, 40), M.ceramic); seat.scale.set(1, 1, 1.32); seat.position.set(0, 0.41, 0.13); g.add(seat);
  // health faucet
  B(g, 0.04, 0.06, 0.03, M.chrome, 0.35, 0.55, -0.1);
  C(g, 0.012, 0.014, 0.13, M.chrome, 0.35, 0.6, -0.07, 10);
  return tag(g, { collide: false });
}

export function showerSet({ w = 0.9, d = 1.0, glassSide = 'right', h = 2.1, gap = 'right' } = {}) {
  // wet zone: rain head, mixer, niche glow, glass screen along local x = +w/2 side, linear drain
  const g = G();
  const head = C(g, 0.15, 0.15, 0.012, M.chrome, 0, 2.2, 0, 32); void head;
  B(g, 0.02, 0.02, 0.35, M.chrome, 0, 2.23, -d / 2 + 0.175);
  C(g, 0.035, 0.035, 0.02, M.chrome, 0, 1.1, -d / 2 + 0.01, 24).rotation.x = Math.PI / 2;
  C(g, 0.012, 0.012, 0.09, M.chrome, 0.06, 1.1, -d / 2 + 0.05, 10).rotation.x = Math.PI / 2;
  // niche (recessed look)
  B(g, 0.6, 0.32, 0.01, M.bathFeature, 0, 1.35, -d / 2 + 0.006);
  B(g, 0.6, 0.02, 0.1, M.whiteStone, 0, 1.2, -d / 2 + 0.05);
  const nl = B(g, 0.56, 0.006, 0.01, M.ledWarm, 0, 1.5, -d / 2 + 0.02); nl.userData.light = 'warm'; nl.castShadow = false;
  // bottles
  for (let i = 0; i < 3; i++) { const b = lathe([[0, 0], [0.028, 0], [0.028, 0.16], [0.012, 0.19], [0, 0.19]], [M.ceramicMatte, M.cabCharcoal, M.white][i]); b.position.set(-0.15 + i * 0.1, 1.21, -d / 2 + 0.05); g.add(b); }
  // glass screen (walk-in: fixed panel, open gap on one end)
  if (glassSide === 'front') {
    const gw = w * 0.66, sg = gap === 'left' ? 1 : -1; // glass sits away from the gap
    const gxc = sg * (w / 2 - gw / 2);
    const gl = B(g, gw, h, 0.01, M.glass, gxc, h / 2 + 0.02, d / 2); gl.castShadow = false; gl.renderOrder = 3;
    B(g, gw, 0.02, 0.02, M.charcoalMetal, gxc, 0.02, d / 2);
    B(g, 0.02, h, 0.02, M.charcoalMetal, sg * (w / 2 - 0.01), h / 2, d / 2);
    B(g, 0.015, 0.015, d, M.charcoalMetal, gxc - sg * (gw / 2 - 0.02), h, 0);
  } else {
    const gx = glassSide === 'right' ? w / 2 : -w / 2;
    const gl = B(g, 0.01, h, d * 0.85, M.glass, gx, h / 2 + 0.02, -d / 2 + (d * 0.85) / 2); gl.castShadow = false; gl.renderOrder = 3;
    B(g, 0.02, 0.02, d * 0.85, M.charcoalMetal, gx, 0.02, -d / 2 + (d * 0.85) / 2);
    B(g, 0.02, h, 0.02, M.charcoalMetal, gx, h / 2, -d / 2 + 0.01);
    B(g, 0.015, 0.015, 0.5, M.charcoalMetal, gx, h, -d / 2 + 0.25);
  }
  // linear drain
  B(g, w * 0.8, 0.004, 0.06, M.steel, 0, 0.002, d / 2 - 0.15);
  return tag(g, { colliderRects: [] });
}

export function towelRail({ w = 0.6 } = {}) {
  const g = G();
  for (const y of [0, 0.25]) C(g, 0.01, 0.01, w, M.brass, 0, y, 0.06, 10).rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) B(g, 0.02, 0.32, 0.06, M.brass, s * w / 2, 0.125, 0.03);
  RB(g, w * 0.7, 0.5, 0.03, 0.01, M.linenGrey, -0.05, -0.05, 0.07);
  return g;
}

// ------------------------------------------------------------------ deoghar (pooja unit)
export function poojaUnit({ w = 1.25, d = 0.48 } = {}) {
  const g = G();
  // lower drawer platform (ivory stone top, walnut fronts)
  B(g, w, 0.55, d, M.carcass, 0, 0.275 + 0.08, 0);
  B(g, w - 0.02, 0.08, d - 0.06, M.cabCharcoal, 0, 0.04, -0.03);
  for (let i = 0; i < 2; i++) B(g, w / 2 - 0.006, 0.26, 0.02, M.walnut, -w / 4 + i * (w / 2), 0.08 + 0.13 + 0.28, d / 2);
  for (let i = 0; i < 2; i++) B(g, w / 2 - 0.006, 0.26, 0.02, M.walnut, -w / 4 + i * (w / 2), 0.08 + 0.13, d / 2);
  for (let i = 0; i < 4; i++) B(g, 0.16, 0.012, 0.012, M.brass, -w / 4 + (i % 2) * (w / 2), 0.08 + 0.2 + Math.floor(i / 2) * 0.28, d / 2 + 0.015);
  B(g, w + 0.04, 0.04, d + 0.04, M.whiteStone, 0, 0.655, 0.0);
  // back: ivory marble panel with arched recess outline + side jaali panels
  B(g, w, 1.6, 0.03, M.whiteStone, 0, 0.675 + 0.8, -d / 2 + 0.015);
  const archShape = new THREE.Shape();
  const aw = 0.62, ah = 1.05;
  archShape.moveTo(-aw / 2, 0); archShape.lineTo(-aw / 2, ah - aw / 2); archShape.absarc(0, ah - aw / 2, aw / 2, Math.PI, 0, true); archShape.lineTo(aw / 2, 0); archShape.closePath();
  const arch = new THREE.Mesh(new THREE.ExtrudeGeometry(archShape, { depth: 0.012, bevelEnabled: false }), M.oak);
  arch.position.set(0, 0.68, -d / 2 + 0.03); g.add(arch);
  const archIn = new THREE.Mesh(new THREE.ShapeGeometry(archShape), M.cabBeige); archIn.scale.set(0.9, 0.95, 1); archIn.position.set(0, 0.7, -d / 2 + 0.043); g.add(archIn);
  for (const s of [-1, 1]) {
    const jl = B(g, 0.24, 1.3, 0.012, M.jaaliWood, s * (w / 2 - 0.15), 0.68 + 0.65, -d / 2 + 0.04);
    jl.castShadow = true;
    const bl = B(g, 0.24, 1.3, 0.005, M.ledWarm, s * (w / 2 - 0.15), 0.68 + 0.65, -d / 2 + 0.032); bl.userData.light = 'shrine'; bl.castShadow = false;
  }
  // upper canopy with concealed 2700K strip
  B(g, w, 0.08, d * 0.8, M.walnut, 0, 2.2, -d * 0.1);
  const strip = B(g, w - 0.1, 0.006, 0.02, M.ledWarm, 0, 2.155, 0.05); strip.userData.light = 'shrine'; strip.castShadow = false;
  // shelf
  B(g, w - 0.36, 0.03, 0.22, M.whiteStone, 0, 1.15, -d / 2 + 0.14);
  // brass idols (abstract lathe forms), bells, diyas
  const idol = (x, y, s) => { const m = lathe([[0, 0], [0.06, 0], [0.065, 0.02], [0.04, 0.05], [0.05, 0.12], [0.03, 0.18], [0.035, 0.22], [0.015, 0.26], [0, 0.27]].map(([a, b]) => [a * s, b * s]), M.brass); m.position.set(x, y, -d / 2 + 0.12); g.add(m); };
  idol(0, 0.675, 1.15); idol(-0.18, 1.165, 0.8); idol(0.18, 1.165, 0.8);
  for (const s of [-1, 1]) {
    const bell = lathe([[0, 0], [0.045, 0], [0.04, 0.02], [0.03, 0.07], [0.015, 0.09], [0, 0.095]], M.brass);
    bell.position.set(s * 0.42, 1.55, -d / 2 + 0.12); g.add(bell);
    C(g, 0.002, 0.002, 0.6, M.brassDark, s * 0.42, 1.94, -d / 2 + 0.12, 6);
  }
  for (const s of [-1, 0.0001, 1]) {
    const x = s * 0.28;
    const diya = lathe([[0, 0], [0.03, 0], [0.045, 0.02], [0.04, 0.025], [0, 0.015]], M.brass); diya.position.set(x, 0.675, 0.08); g.add(diya);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), M.flame); flame.scale.set(1, 2.2, 1); flame.position.set(x, 0.715, 0.08); flame.userData.light = 'flame'; g.add(flame);
  }
  // marigold garland (string of small spheres)
  const gm = new THREE.MeshStandardMaterial({ color: 0xe0902a, roughness: 0.9 });
  for (let i = 0; i <= 24; i++) {
    const t = i / 24; const x = -0.4 + t * 0.8; const y = 2.02 - Math.sin(t * Math.PI) * 0.14;
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), gm); s.position.set(x, y, -d / 2 + 0.07); g.add(s);
  }
  // kneeling mat / low seat
  const mat2 = RB(g, 0.6, 0.04, 0.42, 0.02, M.fabricBeige, 0, 0.02, d / 2 + 0.35); mat2.userData.noCollide = true;
  return tag(g, { collide: true });
}

// ------------------------------------------------------------------ utility
export function washingMachine() {
  const g = G();
  RB(g, 0.6, 0.85, 0.58, 0.02, M.white, 0, 0.425, 0);
  const door = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 12, 40), M.steel); door.position.set(0, 0.42, 0.3); g.add(door);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.16, 40), M.blackGlass); glass.position.set(0, 0.42, 0.296); g.add(glass);
  B(g, 0.56, 0.12, 0.01, M.cabWhite, 0, 0.77, 0.29);
  C(g, 0.03, 0.03, 0.02, M.steel, 0.18, 0.77, 0.3, 16).rotation.x = Math.PI / 2;
  B(g, 0.14, 0.04, 0.005, M.screen, -0.05, 0.77, 0.296);
  return tag(g, { collide: true });
}

export function utilitySink() {
  const g = G();
  B(g, 0.55, 0.06, 0.5, M.whiteStone, 0, 0.88, 0);
  const bowl = new THREE.Mesh(boxGeo(0.45, 0.2, 0.38), M.steel.clone()); bowl.material.side = THREE.BackSide; bowl.position.set(0, 0.8, 0.02); g.add(bowl);
  for (const s of [-1, 1]) B(g, 0.04, 0.82, 0.04, M.charcoalMetal, s * 0.24, 0.41, 0.2);
  C(g, 0.012, 0.012, 0.25, M.chrome, 0, 1.03, -0.22, 10);
  C(g, 0.01, 0.01, 0.15, M.chrome, 0, 1.15, -0.15, 10).rotation.x = Math.PI / 2;
  // exposed CPVC supply + drain pipes
  C(g, 0.016, 0.016, 2.0, M.white, -0.2, 1.0, -0.23, 10);
  C(g, 0.03, 0.03, 0.8, M.cabGrey, 0.15, 0.4, -0.22, 12);
  return tag(g, { collide: true });
}

export function broomCupboard({ w = 0.5, h = 2.1, d = 0.45 } = {}) {
  const g = G();
  B(g, w, h, d, M.carcass, 0, h / 2, 0);
  B(g, w - 0.004, h - 0.004, 0.02, M.cabGrey, 0, h / 2, d / 2 + 0.01);
  B(g, 0.012, 0.5, 0.012, M.charcoalMetal, w / 2 - 0.05, 1.05, d / 2 + 0.025);
  // louvred vent
  for (let i = 0; i < 6; i++) B(g, w - 0.12, 0.01, 0.01, M.cabCharcoal, 0, 1.75 + i * 0.03, d / 2 + 0.022);
  return tag(g, { collide: true, cap: true });
}

// ------------------------------------------------------------------ decor & soft furnishings
export function curtain({ w = 2.0, h = 2.6, folds = 8, sheer = false, gather = 1 } = {}) {
  const segs = Math.max(24, folds * 8);
  const geo = new THREE.PlaneGeometry(w * gather, h, segs, 6);
  const pos = geo.attributes.position;
  const amp = sheer ? 0.025 : 0.04;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const t = (x / (w * gather) + 0.5) * folds * Math.PI * 2;
    pos.setZ(i, Math.sin(t) * amp * (1 + (0.5 - y / h) * 0.15));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, sheer ? M.sheer : M.curtain);
  m.position.y = h / 2; m.castShadow = !sheer; m.receiveShadow = true;
  if (sheer) m.renderOrder = 4;
  const g = G(); g.add(m);
  return g;
}

/** Curtain set for an opening: track + drapes stacked at both ends + sheer across. */
export function curtainSet({ w, h = 2.8, stack = 0.45, sheerClosed = true } = {}) {
  const g = G();
  B(g, w + 0.3, 0.03, 0.12, M.cabWhite, 0, h + 0.01, 0);
  if (sheerClosed) { const s = curtain({ w: w + 0.2, h: h - 0.03, folds: Math.round(w * 5), sheer: true }); s.position.set(0, 0.02, 0.025); g.add(s); }
  for (const sd of [-1, 1]) {
    const c = curtain({ w: stack, h: h - 0.03, folds: 3 });
    c.position.set(sd * (w / 2 + 0.15 - stack / 2), 0.02, -0.03); g.add(c);
  }
  return g;
}

export function artwork({ w = 0.8, h = 1.0, style = 'arcs', seed = 1, frameMat } = {}) {
  const g = G();
  RB(g, w + 0.05, h + 0.05, 0.035, 0.004, frameMat || M.walnut, 0, 0, 0.0175);
  const mat = M.artMat ? M.artMat(style, seed) : M.cabWhite;
  const canvasM = B(g, w, h, 0.01, mat, 0, 0, 0.04); canvasM.castShadow = false;
  return g;
}

export function plant({ h = 1.2, potR = 0.18, potH = 0.38, leafMat, potMat, count = 18, spread = 0.45, seed = 3, kind = 'broad' } = {}) {
  const g = G();
  const r = rng(seed);
  potMat = potMat || M.planterGrey;
  const pot = lathe([[0, 0], [potR * 0.75, 0], [potR, potH * 0.85], [potR * 1.03, potH], [potR * 0.92, potH], [0, potH - 0.02]], potMat, 32); g.add(pot);
  C(g, potR * 0.9, potR * 0.9, 0.02, M.soil, 0, potH - 0.03, 0, 24);
  leafMat = leafMat || (kind === 'fern' ? M.leafFern : kind === 'narrow' ? M.leafNarrow : M.leafBroad);
  const lw = kind === 'narrow' ? 0.09 : kind === 'fern' ? 0.16 : 0.26;
  const ll = kind === 'narrow' ? 0.55 : kind === 'fern' ? 0.38 : 0.32;
  const leafGeo = new THREE.PlaneGeometry(kind === 'narrow' ? 0.06 : lw, ll, 1, kind === 'narrow' ? 8 : 3);
  leafGeo.translate(0, ll / 2, 0);
  // bend leaf (snake-plant blades are real tapered geometry, not alpha cut-outs)
  const lp = leafGeo.attributes.position;
  for (let i = 0; i < lp.count; i++) {
    const y = lp.getY(i), t = y / ll;
    if (kind === 'narrow') { lp.setX(i, lp.getX(i) * Math.pow(Math.max(0, 1 - t), 0.55) * (1 + Math.sin(t * 3) * 0.15)); lp.setZ(i, t * t * 0.05 + lp.getX(i) * 0.4); }
    else lp.setZ(i, t * t * 0.08);
  }
  leafGeo.computeVertexNormals();
  if (kind === 'narrow') leafMat = M.bladeGreen;
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const hh = potH + (kind === 'narrow' ? 0.02 : (0.15 + r() * (h - potH - 0.3)));
    const rad = (kind === 'narrow' ? 0.04 : 0.05 + r() * spread * 0.5);
    if (kind !== 'narrow') { const st = C(g, 0.004, 0.006, hh - potH + 0.02, M.stem, Math.cos(a) * rad * 0.5, potH + (hh - potH) / 2, Math.sin(a) * rad * 0.5, 5); st.userData.noCollide = true; st.rotation.z = Math.cos(a) * 0.15; st.rotation.x = -Math.sin(a) * 0.15; }
    const leaf = new THREE.Mesh(leafGeo, leafMat); leaf.userData.noCollide = true;
    leaf.position.set(Math.cos(a) * rad, hh, Math.sin(a) * rad);
    leaf.rotation.order = 'YXZ';
    leaf.rotation.y = -a + Math.PI / 2;
    leaf.rotation.x = kind === 'narrow' ? -(0.05 + r() * 0.25) : -(0.5 + r() * 0.7);
    const s = kind === 'narrow' ? (h - potH) / ll * (0.6 + r() * 0.4) : 0.8 + r() * 0.5;
    leaf.scale.set(s * (kind === 'narrow' ? 1 : 1), s, s);
    leaf.castShadow = true;
    g.add(leaf);
  }
  contactShadow(g, potR * 3, potR * 3, 0.35);
  return tag(g, { collide: true, kind: 'plant' });
}

export function planterBox({ w = 1.0, d = 0.4, h = 0.55, plants = 3, seed = 5, kind = 'fern' } = {}) {
  const g = G();
  RB(g, w, h, d, 0.02, M.planterGrey, 0, h / 2, 0);
  B(g, w - 0.06, 0.02, d - 0.06, M.soil, 0, h - 0.03, 0);
  const r = rng(seed);
  for (let i = 0; i < plants; i++) {
    const p = plant({ h: 0.6 + r() * 0.5, potR: 0.001, potH: 0.0, count: 14, kind: i % 2 ? kind : 'broad', seed: seed + i });
    p.children[0].visible = false; // hide pot
    p.position.set(-w / 2 + (w / plants) * (i + 0.5), h - 0.04, (r() - 0.5) * 0.1);
    g.add(p);
  }
  return tag(g, { collide: true });
}

export function ceilingFan({ blade = 0.62, mat } = {}) {
  const g = G(); mat = mat || M.cabWhite;
  C(g, 0.012, 0.012, 0.3, M.cabWhite, 0, -0.15, 0, 8);
  C(g, 0.08, 0.08, 0.04, M.cabWhite, 0, -0.02, 0, 20);
  const rotor = G(); rotor.position.y = -0.33; g.add(rotor);
  C(rotor, 0.11, 0.09, 0.07, M.cabWhite, 0, 0, 0, 28);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const bl = B(rotor, blade, 0.008, 0.12, M.oak, Math.cos(a) * (blade / 2 + 0.08), -0.01, Math.sin(a) * (blade / 2 + 0.08));
    bl.rotation.y = -a; bl.rotation.x = 0.08;
  }
  g.userData.rotor = rotor;
  return g;
}

export function downlight() {
  const g = G();
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 20), M.cabWhite); ring.position.y = -0.005; g.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.035, 20), M.downlight); disc.rotation.x = Math.PI / 2; disc.position.y = -0.011; disc.userData.light = 'downlight'; g.add(disc);
  return g;
}

export function pendantRing({ w = 1.4, d = 0.55 } = {}) {
  // sculptural linear-oval brass ring pendant with diffused LED underside
  const g = G();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 12, 64), M.brass);
  ring.scale.set(w / 1.0, d / 1.0, 1); ring.rotation.x = Math.PI / 2; g.add(ring);
  const diff = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 8, 64), M.ledWarm); diff.scale.set(w / 1.0, d / 1.0, 1); diff.rotation.x = Math.PI / 2; diff.position.y = -0.018; diff.userData.light = 'pendant'; g.add(diff);
  for (const s of [-1, 1]) { const c = C(g, 0.0015, 0.0015, 1.0, M.blackMetal, s * w * 0.32, 0.5, 0, 4); void c; }
  C(g, 0.06, 0.06, 0.015, M.brass, 0, 1.0, 0, 16);
  return g;
}

export function globePendant({ r = 0.1, drop = 0.9 } = {}) {
  const g = G();
  C(g, 0.0015, 0.0015, drop, M.blackMetal, 0, -drop / 2, 0, 4);
  C(g, 0.03, 0.03, 0.01, M.brass, 0, -0.005, 0, 12);
  const cap = C(g, 0.02, 0.025, 0.04, M.brass, 0, -drop, 0, 12); void cap;
  const glob = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), M.bulbGlass); glob.position.y = -drop - r + 0.01; glob.userData.light = 'bulb'; g.add(glob);
  return g;
}

export function wallSconce() {
  const g = G();
  B(g, 0.08, 0.16, 0.02, M.brass, 0, 0, 0.01);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 20, 1, true), M.lampShade); shade.position.set(0, 0, 0.09); shade.userData.light = 'shade'; g.add(shade);
  return g;
}

export function balconyLight() {
  const g = G();
  RB(g, 0.1, 0.22, 0.08, 0.01, M.charcoalMetal, 0, 0, 0.04);
  const l = B(g, 0.07, 0.008, 0.06, M.ledWarm, 0, -0.11, 0.045); l.userData.light = 'warm';
  const u = B(g, 0.07, 0.008, 0.06, M.ledWarm, 0, 0.11, 0.045); u.userData.light = 'warm';
  return g;
}

export function towelHook() { const g = G(); C(g, 0.01, 0.01, 0.06, M.brass, 0, 0, 0.03, 8).rotation.x = Math.PI / 2; return g; }

export function floorLamp() {
  const g = G();
  C(g, 0.14, 0.15, 0.02, M.brass, 0, 0.01, 0, 24);
  C(g, 0.01, 0.01, 1.45, M.brass, 0, 0.74, 0, 8);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.3, 28, 1, true), M.lampShade); shade.position.y = 1.5; shade.userData.light = 'shade'; g.add(shade);
  return tag(g, { collide: true });
}

export function tableLamp() {
  const g = G();
  const base = lathe([[0, 0], [0.07, 0], [0.09, 0.08], [0.06, 0.2], [0.02, 0.24], [0, 0.24]], M.ceramicMatte); g.add(base);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.18, 24, 1, true), M.lampShade); shade.position.y = 0.33; shade.userData.light = 'shade'; g.add(shade);
  return g;
}

export function books(n = 5, seed = 2) {
  const g = G(); const r = rng(seed);
  let y = 0;
  for (let i = 0; i < n; i++) { const h = 0.025 + r() * 0.02; const b = B(g, 0.22 + r() * 0.06, h, 0.16 + r() * 0.04, [M.paper, M.cabTaupe, M.cabGrey, M.walnut, M.cabBeige][i % 5], 0, y + h / 2, 0); b.rotation.y = (r() - 0.5) * 0.2; y += h; }
  return g;
}

export { roundRectShape, ellipseShape, rboxGeo, cylGeo, mesh };

export function barStool({ mat } = {}) {
  const g = G(); mat = mat || M.fabricTaupe;
  // upholstered seat on a slim brass-capped walnut frame with footrest ring
  const seat = new THREE.Mesh(rboxGeo(0.4, 0.07, 0.38, 0.03), mat); seat.position.y = 0.66; seat.castShadow = true; seat.receiveShadow = true; g.add(seat);
  const back = new THREE.Mesh(rboxGeo(0.38, 0.16, 0.05, 0.02), mat); back.position.set(0, 0.8, -0.17); back.rotation.x = -0.12; back.castShadow = true; g.add(back);
  for (const [x, z] of [[-0.15, 0.14], [0.15, 0.14], [-0.15, -0.14], [0.15, -0.14]]) { const l = C(g, 0.014, 0.012, 0.63, M.walnut, x, 0.315, z, 10); l.rotation.z = x * 0.12; l.rotation.x = -z * 0.12; }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.008, 6, 32), M.brass); ring.rotation.x = Math.PI / 2; ring.position.y = 0.24; g.add(ring);
  contactShadow(g, 0.5, 0.5, 0.3);
  return tag(g, { collide: true });
}
