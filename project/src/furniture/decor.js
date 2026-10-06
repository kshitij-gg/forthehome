// Styling layer: the small objects that make a finished home read as lived-in and professionally styled.
import * as THREE from 'three';
import { B, RB, C, rng } from '../utils/geom.js';
import { lathe, contactShadow } from './pieces.js';

let M = null;
const mats = {};
export function setDecorMaterials(m) {
  M = m;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  mats.petalWhite = std({ color: 0xf4efe6, roughness: 0.7 });
  mats.petalBlush = std({ color: 0xe9c6b8, roughness: 0.7 });
  mats.leafDark = std({ color: 0x3f5c33, roughness: 0.6 });
  mats.lemon = std({ color: 0xe8c547, roughness: 0.45 });
  mats.orange = std({ color: 0xe0873a, roughness: 0.5 });
  mats.apple = std({ color: 0xa83a2c, roughness: 0.35 });
  mats.green = std({ color: 0x8ea65a, roughness: 0.45 });
  mats.linenNatural = std({ color: 0xd9cdb8, roughness: 0.95 });
  mats.stoneware = std({ color: 0x6f6a63, roughness: 0.55 });
  mats.wax = std({ color: 0xf2eadc, roughness: 0.6 });
  mats.glassClear = new THREE.MeshPhysicalMaterial({ color: 0xf2f6f6, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.35, depthWrite: false });
  mats.towelSage = std({ color: 0xb9c2ae, roughness: 1 });
  mats.towelWhite = std({ color: 0xf2f0ec, roughness: 1 });
  mats.matGrey = std({ color: 0xa9a49c, roughness: 1 });
  mats.paperWhite = std({ color: 0xf6f3ec, roughness: 0.85 });
  mats.coffee = std({ color: 0x2a1b12, roughness: 0.25 });
}
const G = () => new THREE.Group();

// ---------------------------------------------------------------- dining
export function tableSetting({ seats = [[-0.62, -0.32], [0, -0.32], [0.62, -0.32], [-0.62, 0.32], [0, 0.32], [0.62, 0.32]], h = 0.75 } = {}) {
  const g = G();
  for (const [x, z] of seats) {
    const s = Math.sign(z);
    B(g, 0.4, 0.004, 0.28, mats.linenNatural, x, h + 0.002, z);
    const plate = lathe([[0, 0], [0.125, 0], [0.13, 0.012], [0.12, 0.016], [0.08, 0.008], [0, 0.008]], M.ceramic, 32); plate.position.set(x, h + 0.004, z); g.add(plate);
    const bowl = lathe([[0, 0], [0.04, 0], [0.075, 0.035], [0.072, 0.038], [0.035, 0.006], [0, 0.006]], M.ceramicMatte, 28); bowl.position.set(x, h + 0.02, z); g.add(bowl);
    const glass = lathe([[0, 0], [0.032, 0], [0.032, 0.004], [0.006, 0.01], [0.005, 0.08], [0.038, 0.12], [0.04, 0.17], [0.037, 0.17], [0.034, 0.122], [0, 0.11]], mats.glassClear, 24);
    glass.position.set(x + 0.17, h, z - s * 0.12); glass.renderOrder = 3; g.add(glass);
    // brass cutlery
    for (const dx of [-0.16, 0.16]) B(g, 0.012, 0.004, 0.19, M.brass, x + dx, h + 0.005, z);
  }
  // centrepiece: low walnut tray, candles, vase of blooms
  RB(g, 0.7, 0.03, 0.2, 0.015, M.walnut, 0, h + 0.015, 0);
  for (const dx of [-0.24, 0.24]) { C(g, 0.022, 0.022, 0.16, mats.wax, dx, h + 0.11, 0, 16); const f = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), M.flame); f.scale.y = 2; f.position.set(dx, h + 0.2, 0); f.userData.light = 'flame'; g.add(f); C(g, 0.03, 0.03, 0.012, M.brass, dx, h + 0.036, 0, 16); }
  g.add(flowerVase({}).translateY(h + 0.03));
  return g;
}

export function flowerVase({ seed = 4, blooms = 9 } = {}) {
  const g = G(); const r = rng(seed);
  const vase = lathe([[0, 0], [0.05, 0], [0.065, 0.06], [0.05, 0.16], [0.03, 0.2], [0.034, 0.22], [0, 0.22]], mats.stoneware, 28); g.add(vase);
  for (let i = 0; i < blooms; i++) {
    const a = r() * Math.PI * 2, rad = 0.02 + r() * 0.1, hh = 0.32 + r() * 0.16;
    const stem = C(g, 0.002, 0.002, hh, M.stem, Math.cos(a) * rad * 0.5, hh / 2 + 0.05, Math.sin(a) * rad * 0.5, 4);
    stem.rotation.z = Math.cos(a) * 0.25; stem.rotation.x = -Math.sin(a) * 0.25;
    const head = G(); head.position.set(Math.cos(a) * rad, hh + 0.05, Math.sin(a) * rad); g.add(head);
    const pm = r() < 0.6 ? mats.petalWhite : mats.petalBlush;
    for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), pm); p.scale.set(1, 0.45, 0.7); const ang = (k / 6) * Math.PI * 2; p.position.set(Math.cos(ang) * 0.016, 0, Math.sin(ang) * 0.016); p.rotation.y = -ang; head.add(p); }
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), mats.lemon); c.position.y = 0.005; head.add(c);
    if (i % 2) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mats.leafDark); lf.scale.set(1, 0.12, 0.45); lf.position.set(Math.cos(a) * rad * 0.7, hh * 0.6, Math.sin(a) * rad * 0.7); lf.rotation.set(0.3, a, 0.4); g.add(lf); }
  }
  return g;
}

// ---------------------------------------------------------------- kitchen
export function fruitBowl({ seed = 7 } = {}) {
  const g = G(); const r = rng(seed);
  const bowl = lathe([[0, 0], [0.06, 0], [0.14, 0.06], [0.145, 0.075], [0.135, 0.075], [0.055, 0.012], [0, 0.012]], M.walnut, 36); g.add(bowl);
  const fr = [[mats.lemon, 0.035], [mats.orange, 0.04], [mats.apple, 0.038], [mats.green, 0.037], [mats.orange, 0.04], [mats.lemon, 0.034], [mats.apple, 0.036]];
  fr.forEach(([m, rad], i) => { const a = i * 1.7 + r(); const d = i === 6 ? 0 : 0.06 + r() * 0.02; const s = new THREE.Mesh(new THREE.SphereGeometry(rad, 16, 12), m); s.position.set(Math.cos(a) * d, 0.045 + (i === 6 ? 0.04 : 0) + rad * 0.6, Math.sin(a) * d); s.castShadow = true; g.add(s); });
  return g;
}
export function kettle() {
  const g = G();
  const body = lathe([[0, 0], [0.085, 0], [0.095, 0.03], [0.09, 0.15], [0.06, 0.2], [0.02, 0.215], [0, 0.215]], M.steel, 32); g.add(body);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.009, 8, 20, Math.PI), M.black); handle.position.set(0, 0.215, 0); handle.rotation.y = Math.PI / 2; g.add(handle);
  const sp = C(g, 0.012, 0.018, 0.09, M.steel, 0.1, 0.13, 0, 12); sp.rotation.z = -0.9;
  return g;
}
export function knifeBlock() {
  const g = G();
  const b = B(g, 0.1, 0.22, 0.14, M.walnut, 0, 0.11, 0); b.rotation.x = -0.25;
  for (let i = 0; i < 4; i++) { const h = B(g, 0.016, 0.1, 0.022, M.black, -0.03 + i * 0.02, 0.27, -0.02 - i * 0.004); h.rotation.x = -0.25; }
  return g;
}
export function utensilPot() {
  const g = G();
  g.add(lathe([[0, 0], [0.05, 0], [0.052, 0.15], [0, 0.15]], M.ceramicMatte, 24));
  const r = rng(3);
  for (let i = 0; i < 5; i++) { const s = C(g, 0.006, 0.006, 0.3, i % 2 ? M.walnut : M.black, (r() - 0.5) * 0.04, 0.2, (r() - 0.5) * 0.04, 6); s.rotation.set((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3); }
  return g;
}
export function coffeeMachine() {
  const g = G();
  RB(g, 0.24, 0.34, 0.32, 0.03, M.blackMetal, 0, 0.17, 0);
  B(g, 0.18, 0.1, 0.02, M.steel, 0, 0.22, 0.16);
  C(g, 0.035, 0.03, 0.06, M.ceramic, 0, 0.06, 0.08, 16);
  B(g, 0.2, 0.012, 0.14, M.steel, 0, 0.012, 0.1);
  return g;
}
export function dishTowel() { const g = G(); B(g, 0.2, 0.32, 0.006, mats.towelSage, 0, -0.16, 0); return g; }

// ---------------------------------------------------------------- living / bedroom
export function throwDraped({ w = 0.55, mat } = {}) {
  const g = G(); mat = mat || mats.linenNatural;
  RB(g, w, 0.025, 0.42, 0.01, mat, 0, 0, 0);
  RB(g, w, 0.32, 0.025, 0.01, mat, 0, -0.17, 0.21);
  return g;
}
export function bookStack({ n = 3, seed = 5 } = {}) {
  const g = G(); const r = rng(seed); let y = 0;
  const cols = [M.paper, M.cabTaupe, M.walnut, mats.paperWhite, M.cabCharcoal];
  for (let i = 0; i < n; i++) { const hh = 0.025 + r() * 0.02; const b = B(g, 0.24 + r() * 0.05, hh, 0.17 + r() * 0.03, cols[Math.floor(r() * cols.length)], 0, y + hh / 2, 0); b.rotation.y = (r() - 0.5) * 0.25; y += hh; }
  return g;
}
export function candleTrio() {
  const g = G();
  [[0, 0.16], [0.07, 0.11], [-0.065, 0.08]].forEach(([x, h]) => { C(g, 0.03, 0.03, h, mats.wax, x, h / 2, 0, 18); const f = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), M.flame); f.scale.y = 2; f.position.set(x, h + 0.015, 0); f.userData.light = 'flame'; g.add(f); });
  return g;
}
export function sculpture() {
  const g = G();
  const t = new THREE.Mesh(new THREE.TorusKnotGeometry(0.06, 0.016, 96, 12, 2, 3), M.brass); t.position.y = 0.11; t.castShadow = true; g.add(t);
  C(g, 0.05, 0.05, 0.03, M.walnut, 0, 0.015, 0, 24);
  return g;
}
export function mug() { const g = G(); g.add(lathe([[0, 0], [0.038, 0], [0.04, 0.09], [0.036, 0.09], [0.034, 0.012], [0, 0.012]], M.ceramicMatte, 24)); const h = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 8, 16), M.ceramicMatte); h.position.set(0.045, 0.05, 0); g.add(h); const c = C(g, 0.034, 0.034, 0.002, mats.coffee, 0, 0.075, 0, 16); void c; return g; }
export function notebook() { const g = G(); B(g, 0.15, 0.012, 0.21, M.cabCharcoal, 0, 0.006, 0); B(g, 0.13, 0.002, 0.008, M.brass, 0, 0.0125, -0.08); return g; }
export function smallPlant() {
  const g = G();
  g.add(lathe([[0, 0], [0.05, 0], [0.06, 0.09], [0, 0.085]], M.terracotta, 24));
  const r = rng(9);
  for (let i = 0; i < 9; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mats.leafDark); lf.scale.set(1, 0.15, 0.5); const a = r() * Math.PI * 2; lf.position.set(Math.cos(a) * 0.04, 0.12 + r() * 0.05, Math.sin(a) * 0.04); lf.rotation.set(0.5, a, 0.3); g.add(lf); }
  return g;
}

// ---------------------------------------------------------------- bath
export function towelStack() {
  const g = G();
  RB(g, 0.3, 0.05, 0.2, 0.02, mats.towelWhite, 0, 0.025, 0);
  RB(g, 0.3, 0.05, 0.2, 0.02, mats.towelSage, 0, 0.075, 0);
  RB(g, 0.3, 0.05, 0.2, 0.02, mats.towelWhite, 0, 0.125, 0);
  return g;
}
export function bathMat({ w = 0.6, d = 0.4 } = {}) { const g = G(); const m = RB(g, w, 0.008, d, 0.004, mats.matGrey, 0, 0.004, 0); m.castShadow = false; return g; }
export function handTowelRing() {
  const g = G();
  B(g, 0.05, 0.05, 0.02, M.brass, 0, 0, 0.01);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.006, 8, 28), M.brass); ring.position.set(0, -0.08, 0.04); g.add(ring);
  B(g, 0.17, 0.26, 0.02, mats.towelSage, 0, -0.24, 0.04);
  return g;
}
export function lantern() {
  const g = G();
  B(g, 0.2, 0.02, 0.2, M.blackMetal, 0, 0.01, 0); B(g, 0.2, 0.03, 0.2, M.blackMetal, 0, 0.33, 0);
  for (const [x, z] of [[-0.09, -0.09], [0.09, -0.09], [-0.09, 0.09], [0.09, 0.09]]) B(g, 0.015, 0.32, 0.015, M.blackMetal, x, 0.17, z);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 8, 20), M.blackMetal); ring.position.y = 0.39; g.add(ring);
  const glass = B(g, 0.17, 0.26, 0.17, mats.glassClear, 0, 0.17, 0); glass.renderOrder = 3;
  C(g, 0.035, 0.035, 0.1, mats.wax, 0, 0.09, 0, 16);
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), M.flame); f.scale.y = 2; f.position.set(0, 0.155, 0); f.userData.light = 'flame'; g.add(f);
  contactShadow(g, 0.3, 0.3, 0.3);
  return g;
}
