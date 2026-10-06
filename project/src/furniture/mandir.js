// Mandir (deoghar) — layered contemporary temple niche with a standing Vishnu murti.
// Local space: origin = centre of footprint at floor level, FRONT faces +Z, width along X.
// Layers, back to front: backlit honey-onyx panel → carved marble frame with cusped arch and shikhara
// crown (brass inlay) → fluted marble pilasters → prabhavali (flame halo) → Vishnu on a double-lotus
// padmapitha → plinth with brass inlay, diyas and kalash → floor rangoli, urli, samai lamps; brass bells
// and a marigold/mango-leaf toran hang from a cove-lit canopy.
// Iconography (Chaturbhuja Vishnu, samapada stance): back right — Sudarshana chakra; back left —
// Panchajanya shankha; front right — padma held in abhaya; front left — resting on the Kaumodaki gada.
import * as THREE from 'three';
import { B, C } from '../utils/geom.js';
import { tileSet } from '../materials/textures.js';

let M = null;
export function setMandirMaterials(m) { M = m; }

const G = () => new THREE.Group();
const lathe = (pts, mat, seg = 32) => { const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), seg), mat); m.castShadow = true; m.receiveShadow = true; return m; };
const sphere = (r, mat, seg = 20) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.7 | 0)), mat); m.castShadow = true; return m; };
const torus = (R, r, mat, seg = 40) => { const m = new THREE.Mesh(new THREE.TorusGeometry(R, r, 10, seg), mat); m.castShadow = true; return m; };
function limb(parent, a, b, r, mat) { // cylinder between two points (local)
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), len = A.distanceTo(Bv);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, len, 14), mat);
  m.position.copy(A).add(Bv).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize());
  m.castShadow = true; parent.add(m); return m;
}
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

let mats = null;
function materials() {
  if (mats) return mats;
  const onyx = tileSet({ base: 0xf2c27a, vein: 0x8a4a14, grout: 0xe8bd78, tileW: 1.2, tileH: 2.4, worldSize: 1.2, veins: 1.0, cloud: 0.42, speck: 0, size: 512, groutPx: 0, seed: 91 });
  onyx.map.repeat.set(1, 1);
  mats = {
    gold: new THREE.MeshPhysicalMaterial({ color: 0xd9a64a, metalness: 1, roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.15 }),
    goldDark: new THREE.MeshStandardMaterial({ color: 0x9c7432, metalness: 1, roughness: 0.38 }),
    stone: new THREE.MeshPhysicalMaterial({ color: 0x17171c, roughness: 0.22, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.12 }),
    silk: new THREE.MeshPhysicalMaterial({ color: 0xe9a52c, roughness: 0.45, sheen: 1, sheenColor: 0xffd27a, sheenRoughness: 0.35 }),
    pearl: new THREE.MeshPhysicalMaterial({ color: 0xf4eee2, roughness: 0.25, clearcoat: 0.8, iridescence: 0.25 }),
    lotus: new THREE.MeshStandardMaterial({ color: 0xf2a6b8, roughness: 0.55 }),
    onyx: new THREE.MeshStandardMaterial({ map: onyx.map, emissiveMap: onyx.map, emissive: 0xffb25a, emissiveIntensity: 0.42, roughness: 0.12, envMapIntensity: 0.6 }),
    marigold: new THREE.MeshStandardMaterial({ color: 0xf08a1c, roughness: 0.85 }),
    marigoldY: new THREE.MeshStandardMaterial({ color: 0xf6c12a, roughness: 0.85 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x3f7a2c, roughness: 0.6, side: THREE.DoubleSide }),
    water: new THREE.MeshPhysicalMaterial({ color: 0x2b4a52, roughness: 0.05, transmission: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.2 }),
    kumkum: new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.6 }),
  };
  return mats;
}

// ------------------------------------------------------------------ Vishnu murti (≈0.62 m to crown tip)
export function vishnuMurti() {
  const X = materials(); const g = G();
  const body = G(); body.scale.set(1, 1, 0.82); g.add(body);
  // feet + pitambara dhoti (silk) with gold border and pleated front panel
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.02, 0.06), X.stone); f.position.set(s * 0.026, 0.01, 0.012); body.add(f); }
  body.add(lathe([[0, 0.018], [0.05, 0.018], [0.058, 0.04], [0.06, 0.12], [0.066, 0.2], [0.07, 0.262], [0, 0.265]], X.silk));
  { const hem = at(torus(0.058, 0.004, X.gold), 0, 0.03, 0); hem.rotation.x = Math.PI / 2; body.add(hem); }
  { const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.012), X.silk); p.position.set(0, 0.13, 0.056); body.add(p); B(body, 0.032, 0.006, 0.014, X.gold, 0, 0.03, 0.057); }
  const belt = torus(0.071, 0.008, X.gold); belt.rotation.x = Math.PI / 2; belt.position.y = 0.265; body.add(belt);
  body.add(at(sphere(0.011, X.gold, 12), 0, 0.265, 0.07));
  // torso, shoulders, neck (polished black stone)
  body.add(lathe([[0, 0.262], [0.064, 0.262], [0.068, 0.3], [0.077, 0.37], [0.084, 0.405], [0.06, 0.428], [0.022, 0.44], [0.02, 0.458], [0, 0.46]], X.stone));
  for (const s of [-1, 1]) body.add(at(sphere(0.026, X.stone, 16), s * 0.078, 0.405, 0));
  // ornaments: hara necklaces, yajnopavita, vanamala garland to the knees
  const neck = torus(0.032, 0.006, X.gold); neck.position.set(0, 0.435, 0.004); neck.rotation.x = Math.PI / 2 - 0.25; body.add(neck);
  { const c = new THREE.EllipseCurve(0, 0, 0.05, 0.065, Math.PI, 2 * Math.PI); const pts = c.getPoints(24).map((p) => new THREE.Vector3(p.x, 0.43 + p.y, 0.058 + Math.abs(p.x) * -0.2));
    body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.004, 6), X.gold)); body.add(at(sphere(0.012, X.kumkum, 12), 0, 0.366, 0.058)); }
  { const pts = [[-0.075, 0.405, 0.03], [-0.07, 0.3, 0.07], [-0.055, 0.17, 0.085], [0, 0.11, 0.09], [0.055, 0.17, 0.085], [0.07, 0.3, 0.07], [0.075, 0.405, 0.03]].map((p) => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(pts); body.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.006, 6), X.leaf));
    for (let i = 0; i <= 22; i++) { const p = curve.getPoint(i / 22); body.add(at(sphere(0.0085, i % 3 ? X.marigold : X.marigoldY, 8), p.x, p.y, p.z + 0.004)); } }
  { const sash = [[0.07, 0.41, 0.02], [0.03, 0.36, 0.068], [-0.04, 0.3, 0.066], [-0.068, 0.27, 0.03]].map((p) => new THREE.Vector3(...p));
    body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sash), 30, 0.0025, 5), X.gold)); }
  // head: face, makara kundala, urdhva-pundra tilak, siraschakra halo, tall kirita mukuta
  const head = G(); head.position.y = 0.492; body.add(head);
  { const hd = sphere(0.043, X.stone, 24); hd.scale.set(0.92, 1.08, 1); head.add(hd); }
  for (const s of [-1, 1]) { const k = torus(0.011, 0.0035, X.gold, 20); k.position.set(s * 0.043, -0.022, 0); k.rotation.y = Math.PI / 2; head.add(k); head.add(at(sphere(0.0045, X.kumkum, 8), s * 0.043, -0.033, 0)); }
  for (const s of [-1, 1]) { const e = sphere(0.0065, X.pearl, 10); e.scale.set(1.5, 0.6, 0.4); e.position.set(s * 0.016, 0.004, 0.038); head.add(e); }
  { const t = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.02, 0.003), X.pearl); t.position.set(0, 0.024, 0.041); head.add(t); head.add(at(sphere(0.003, X.kumkum, 8), 0, 0.018, 0.043)); }
  const crown = lathe([[0, 0.025], [0.043, 0.025], [0.046, 0.04], [0.041, 0.05], [0.044, 0.07], [0.039, 0.1], [0.033, 0.125], [0.024, 0.145], [0.012, 0.158], [0.004, 0.17], [0, 0.172]], X.gold, 12);
  head.add(crown);
  for (const yy of [0.04, 0.07, 0.1]) { const r = torus(0.044 - (yy - 0.04) * 0.15, 0.0035, X.goldDark, 24); r.rotation.x = Math.PI / 2; r.position.y = yy; head.add(r); }
  for (let i = 0; i < 5; i++) { const j = sphere(0.0042, i % 2 ? X.kumkum : X.pearl, 8); const a = -0.6 + i * 0.3; j.position.set(Math.sin(a) * 0.045, 0.055, Math.cos(a) * 0.045); head.add(j); }
  head.add(at(sphere(0.008, X.gold, 10), 0, 0.178, 0));
  { const halo = torus(0.072, 0.006, X.gold, 48); halo.position.set(0, 0.03, -0.035); head.add(halo); const disk = new THREE.Mesh(new THREE.CircleGeometry(0.07, 40), X.goldDark); disk.position.set(0, 0.03, -0.038); head.add(disk); }
  // four arms (black stone) with gold armlets and bangles
  const arm = (pts, side) => {
    for (let i = 0; i < pts.length - 1; i++) limb(body, pts[i], pts[i + 1], i ? 0.0135 : 0.016, X.stone);
    for (const p of pts.slice(1)) body.add(at(sphere(0.0145, X.stone, 12), ...p));
    const mid = pts[0].map((v, k) => v + (pts[1][k] - v) * 0.45); const al = torus(0.017, 0.003, X.gold, 18); al.position.set(...mid);
    al.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...pts[1]).sub(new THREE.Vector3(...pts[0])).normalize()); body.add(al);
    const w = pts[pts.length - 1]; const bg = torus(0.015, 0.0035, X.gold, 18); bg.position.set(w[0], w[1] - 0.012 * side, w[2]); bg.rotation.x = Math.PI / 2; body.add(bg);
  };
  // back arms raised (deity's right = viewer's left, -x)
  arm([[-0.08, 0.405, -0.012], [-0.125, 0.455, -0.02], [-0.138, 0.535, -0.02]], 1);
  arm([[0.08, 0.405, -0.012], [0.125, 0.455, -0.02], [0.138, 0.535, -0.02]], 1);
  // front arms
  arm([[-0.08, 0.4, 0.02], [-0.11, 0.33, 0.04], [-0.105, 0.36, 0.085]], 1); // abhaya with padma
  arm([[0.08, 0.4, 0.02], [0.112, 0.32, 0.03], [0.12, 0.255, 0.05]], -1); // on the gada
  // Sudarshana chakra (back right)
  { const ch = G(); ch.position.set(-0.142, 0.585, -0.02);
    ch.add(torus(0.042, 0.0045, X.gold, 48)); ch.add(torus(0.03, 0.0025, X.goldDark, 40));
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const sp = new THREE.Mesh(new THREE.BoxGeometry(0.0025, 0.04, 0.003), X.gold); sp.position.set(Math.sin(a) * 0.02, Math.cos(a) * 0.02, 0); sp.rotation.z = -a; ch.add(sp); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const f = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.014, 6), X.gold); f.position.set(Math.sin(a) * 0.05, Math.cos(a) * 0.05, 0); f.rotation.z = -a; ch.add(f); }
    ch.add(at(sphere(0.007, X.kumkum, 10), 0, 0, 0.004)); body.add(ch); }
  // Panchajanya shankha (back left), pearl conch with gold cap
  { const sh = G(); sh.position.set(0.145, 0.57, -0.01); sh.rotation.set(0.2, 0, -0.5);
    const c = lathe([[0, 0], [0.012, 0.004], [0.021, 0.016], [0.023, 0.03], [0.018, 0.045], [0.011, 0.057], [0.004, 0.066], [0, 0.07]], X.pearl, 18); c.scale.set(1, 1, 0.8); sh.add(c);
    for (let i = 0; i < 4; i++) { const r = torus(0.018 - i * 0.003, 0.0018, X.pearl, 16); r.rotation.x = Math.PI / 2; r.position.y = 0.035 + i * 0.008; sh.add(r); }
    const cap = lathe([[0, 0], [0.012, 0], [0.01, -0.01], [0, -0.012]], X.gold, 16); sh.add(cap); body.add(sh); }
  // padma (front right)
  { const lo = G(); lo.position.set(-0.1, 0.37, 0.095);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const p = sphere(0.009, X.lotus, 10); p.scale.set(0.6, 1.5, 0.35); p.position.set(Math.sin(a) * 0.008, 0.012, Math.cos(a) * 0.008); p.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4); lo.add(p); }
    lo.add(at(sphere(0.006, X.marigoldY, 8), 0, 0.012, 0)); limb(lo, [0, 0, 0], [0, -0.03, 0.006], 0.0018, X.leaf); body.add(lo); }
  // Kaumodaki gada (front left) resting head-down on the pedestal
  { limb(body, [0.122, 0.035, 0.055], [0.12, 0.25, 0.05], 0.0055, X.gold);
    const hd = lathe([[0, 0], [0.018, 0.004], [0.027, 0.02], [0.025, 0.038], [0.014, 0.05], [0.006, 0.056], [0, 0.058]], X.gold, 18); hd.position.set(0.122, 0.0, 0.055); body.add(hd);
    for (const yy of [0.02, 0.034]) { const r = torus(0.026, 0.0028, X.goldDark, 20); r.rotation.x = Math.PI / 2; r.position.set(0.122, yy, 0.055); body.add(r); } }
  return g;
}

// double-lotus padmapitha
function padmapitha(r = 0.13) {
  const X = materials(); const g = G();
  g.add(lathe([[0, 0], [r + 0.02, 0], [r + 0.02, 0.025], [r, 0.03], [r * 0.8, 0.045], [0, 0.045]], X.goldDark));
  for (let tier = 0; tier < 2; tier++) for (let i = 0; i < 20; i++) {
    const a = (i + tier * 0.5) / 20 * Math.PI * 2; const p = sphere(0.026, X.gold, 12); p.scale.set(0.55, 1.2, 0.25);
    const rr = tier ? r * 0.8 : r * 0.95, y = tier ? 0.09 : 0.03;
    p.position.set(Math.sin(a) * rr, y, Math.cos(a) * rr); p.lookAt(Math.sin(a) * rr * 3, tier ? y + 0.06 : y - 0.06, Math.cos(a) * rr * 3); g.add(p);
  }
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.78, r * 0.7, 0.03, 32), X.gold), 0, 0.115, 0));
  return g;
}

// prabhavali — flame-studded arch behind the murti
function prabhavali(w = 0.36, h = 0.5) {
  const X = materials(); const g = G();
  const pts = []; const R = w / 2;
  for (let i = 0; i <= 30; i++) pts.push(new THREE.Vector3(-R, (i / 30) * (h - R), 0));
  for (let i = 1; i <= 60; i++) { const a = Math.PI - (i / 60) * Math.PI; pts.push(new THREE.Vector3(Math.cos(a) * R, h - R + Math.sin(a) * R, 0)); }
  for (let i = 1; i <= 30; i++) pts.push(new THREE.Vector3(R, (h - R) * (1 - i / 30), 0));
  const curve = new THREE.CatmullRomCurve3(pts);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.009, 8), X.gold));
  for (let i = 0; i <= 34; i++) { const p = curve.getPoint(i / 34), t = curve.getTangent(i / 34); const f = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.035, 6), X.gold);
    f.position.copy(p); const nrm = new THREE.Vector3(-t.y, t.x, 0).normalize(); if (p.y < 0.02) continue; f.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm.multiplyScalar(-1)); g.add(f); }
  // kirtimukha crest at the apex
  g.add(at(sphere(0.022, X.gold, 14), 0, h + 0.012, 0)); g.add(at(sphere(0.008, X.kumkum, 10), 0, h + 0.014, 0.02));
  return g;
}

function bell(X) { const g = G(); const b = lathe([[0, 0], [0.04, 0], [0.036, 0.018], [0.026, 0.062], [0.012, 0.08], [0, 0.084]], X.gold); g.add(b); g.add(at(sphere(0.009, X.goldDark, 10), 0, -0.006, 0)); return g; }
function samai(X, h = 0.62) { // tall brass oil-lamp stand with five lit wicks
  const g = G();
  g.add(lathe([[0, 0], [0.11, 0], [0.11, 0.015], [0.07, 0.03], [0.03, 0.05], [0.02, 0.09], [0.028, 0.11], [0.016, 0.14], [0.016, h - 0.12], [0.03, h - 0.1], [0.018, h - 0.08], [0.02, h - 0.04], [0.09, h - 0.02], [0.095, h], [0.08, h + 0.005], [0, h]], X.gold));
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const fl = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), M.flame); fl.scale.set(1, 2.4, 1); fl.position.set(Math.sin(a) * 0.075, h + 0.02, Math.cos(a) * 0.075); fl.userData.light = 'flame'; g.add(fl); }
  g.add(at(lathe([[0, 0], [0.012, 0.0], [0.016, 0.03], [0.006, 0.06], [0, 0.07]], X.gold, 12), 0, h, 0));
  return g;
}
function diya(X) { const g = G(); g.add(lathe([[0, 0], [0.026, 0], [0.04, 0.016], [0.036, 0.022], [0, 0.012]], X.gold, 18)); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 10, 8), M.flame); fl.scale.set(1, 2.3, 1); fl.position.set(0, 0.036, 0); fl.userData.light = 'flame'; g.add(fl); return g; }
function kalash(X) {
  const g = G(); g.add(lathe([[0, 0], [0.04, 0], [0.065, 0.04], [0.07, 0.07], [0.05, 0.11], [0.03, 0.125], [0.04, 0.135], [0, 0.135]], X.gold));
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const l = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.09), X.leaf); l.position.set(Math.sin(a) * 0.035, 0.16, Math.cos(a) * 0.035); l.rotation.set(Math.cos(a) * 0.6, a, -Math.sin(a) * 0.6); g.add(l); }
  const coco = sphere(0.04, new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.9 }), 14); coco.scale.set(1, 1.25, 1); coco.position.y = 0.175; g.add(coco);
  const r = torus(0.04, 0.004, X.kumkum, 20); r.rotation.x = Math.PI / 2; r.position.y = 0.165; g.add(r);
  return g;
}
function rangoliTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); x.translate(256, 256);
  const ring = (n, r0, r1, col, rot = 0) => { x.fillStyle = col; for (let i = 0; i < n; i++) { x.save(); x.rotate(rot + i / n * Math.PI * 2); x.beginPath(); x.moveTo(0, -r0); x.quadraticCurveTo(r1 * 0.32, -(r0 + r1) / 2, 0, -r1); x.quadraticCurveTo(-r1 * 0.32, -(r0 + r1) / 2, 0, -r0); x.fill(); x.restore(); } };
  x.fillStyle = '#f6efe2'; x.beginPath(); x.arc(0, 0, 250, 0, Math.PI * 2); x.fill();
  ring(16, 160, 246, '#d9541e'); ring(16, 150, 230, '#f2a516', Math.PI / 16); ring(12, 90, 160, '#c2185b'); ring(12, 84, 150, '#7b1fa2', Math.PI / 12);
  ring(8, 30, 92, '#1e88a8'); x.fillStyle = '#f6c12a'; x.beginPath(); x.arc(0, 0, 30, 0, Math.PI * 2); x.fill(); x.fillStyle = '#d9541e'; x.beginPath(); x.arc(0, 0, 12, 0, Math.PI * 2); x.fill();
  for (let i = 0; i < 48; i++) { x.fillStyle = '#ffffff'; const a = i / 48 * Math.PI * 2; x.beginPath(); x.arc(Math.sin(a) * 238, Math.cos(a) * 238, 4, 0, Math.PI * 2); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function omTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#ffd88a'; x.font = '200px "Nirmala UI", "Mangal", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ॐ', 128, 140);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ------------------------------------------------------------------ the full mandir
export function mandir({ w = 1.24, d = 0.55 } = {}) {
  const X = materials(); const g = G();
  const zb = -d / 2;
  // plinth: Makrana step + sheesham drawers + marble top with brass inlay
  B(g, w + 0.06, 0.08, d + 0.12, M.whiteStone, 0, 0.04, 0.04);
  B(g, w, 0.5, d - 0.04, M.carcass, 0, 0.33, -0.02);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { B(g, w / 2 - 0.008, 0.235, 0.02, M.walnut, -w / 4 + i * (w / 2), 0.2 + j * 0.245, d / 2 - 0.03); B(g, 0.12, 0.01, 0.012, X.gold, -w / 4 + i * (w / 2), 0.29 + j * 0.245, d / 2 - 0.016); }
  B(g, w + 0.04, 0.045, d + 0.02, M.whiteStone, 0, 0.6, 0);
  B(g, w + 0.042, 0.008, 0.006, X.gold, 0, 0.6, d / 2 + 0.012);
  const top = 0.623;
  // backlit honey-onyx panel
  const onyx = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.04, 1.75), X.onyx); onyx.position.set(0, top + 0.875, zb + 0.012); g.add(onyx);
  // carved marble frame: outer outline with stepped shikhara crown, cusped (multifoil) arch opening
  const fw = w, sy = 0.62, R = 0.36, crownH = 2.2;
  const outer = new THREE.Shape();
  outer.moveTo(-fw / 2, 0); outer.lineTo(fw / 2, 0); outer.lineTo(fw / 2, crownH - 0.42);
  const tiers = [[fw / 2, crownH - 0.42], [fw / 2 - 0.08, crownH - 0.36], [fw / 2 - 0.08, crownH - 0.3], [fw / 2 - 0.18, crownH - 0.24], [fw / 2 - 0.18, crownH - 0.18], [fw / 2 - 0.3, crownH - 0.1]];
  for (const [x, y] of tiers) outer.lineTo(x, y);
  outer.quadraticCurveTo(0.12, crownH, 0, crownH + 0.06); outer.quadraticCurveTo(-0.12, crownH, -(fw / 2 - 0.3), crownH - 0.1);
  for (const [x, y] of [...tiers].reverse()) outer.lineTo(-x, y);
  outer.lineTo(-fw / 2, 0);
  const hole = new THREE.Path(); const archPts = [];
  hole.moveTo(-R, 0.06); archPts.push([-R, 0.06]); hole.lineTo(-R, sy); archPts.push([-R, sy]);
  for (let i = 1; i <= 140; i++) { const a = Math.PI - (i / 140) * Math.PI; const rr = R - 0.035 * Math.abs(Math.sin(a * 7)); const p = [Math.cos(a) * rr, sy + Math.sin(a) * rr * 1.25]; hole.lineTo(...p); archPts.push(p); }
  hole.lineTo(R, 0.06); archPts.push([R, 0.06]); hole.lineTo(-R, 0.06);
  outer.holes.push(hole);
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 24 }), M.whiteStone);
  frame.position.set(0, top, zb + 0.03); frame.castShadow = true; frame.receiveShadow = true; g.add(frame);
  // brass inlay tracing the cusped arch + crown edge
  { const pts = archPts.map(([x, y]) => new THREE.Vector3(x * 1.06, y * 1.0 + 0.0, 0)); g.add(at(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 260, 0.005, 6), X.gold), 0, top, zb + 0.081)); }
  { const pts = outer.getPoints(12).filter((p) => p.y > crownH - 0.45).map((p) => new THREE.Vector3(p.x * 0.97, p.y - 0.025, 0)); g.add(at(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.004, 6), X.gold), 0, top, zb + 0.081)); }
  // kalash finial on the shikhara
  g.add(at(lathe([[0, 0], [0.035, 0], [0.05, 0.03], [0.03, 0.06], [0.012, 0.08], [0.02, 0.095], [0.006, 0.12], [0, 0.13]], X.gold, 20), 0, top + crownH + 0.05, zb + 0.055));
  // fluted pilasters with brass capitals and bases
  for (const s of [-1, 1]) {
    const px = s * (fw / 2 - 0.085);
    const col = lathe([[0, 0], [0.042, 0], [0.042, 0.03], [0.034, 0.05], [0.03, 0.06], [0.03, 1.3], [0.036, 1.33], [0.044, 1.36], [0.044, 1.4], [0, 1.4]], M.whiteStone, 16);
    col.position.set(px, top, zb + 0.12); g.add(col);
    for (const yy of [0.05, 1.34]) { const r = torus(0.034, 0.005, X.gold, 24); r.rotation.x = Math.PI / 2; r.position.set(px, top + yy, zb + 0.12); g.add(r); }
    g.add(at(sphere(0.02, X.gold, 12), px, top + 1.43, zb + 0.12));
  }
  // Om in gold on the onyx, above the halo
  { const om = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshStandardMaterial({ map: omTexture(), transparent: true, emissive: 0xffc070, emissiveIntensity: 0.6, emissiveMap: null, metalness: 0.6, roughness: 0.3, depthWrite: false })); om.position.set(0, top + 1.36, zb + 0.084); g.add(om); }
  // murti on padmapitha, prabhavali behind
  const pp = padmapitha(0.125); pp.position.set(0, top + 0.08, zb + 0.2); g.add(pp);
  B(g, 0.36, 0.08, 0.3, M.whiteStone, 0, top + 0.04, zb + 0.2); B(g, 0.362, 0.008, 0.302, X.gold, 0, top + 0.08, zb + 0.2);
  const v = vishnuMurti(); v.scale.setScalar(1.3); v.position.set(0, top + 0.21, zb + 0.2); g.add(v);
  const hal = prabhavali(0.46, 0.72); hal.position.set(0, top + 0.17, zb + 0.105); g.add(hal);
  // plinth styling: five diyas, kalash, flower thalis
  for (let i = 0; i < 5; i++) g.add(at(diya(X), -0.4 + i * 0.2, top + 0.0, d / 2 - 0.07));
  g.add(at(kalash(X), -0.44, top, zb + 0.24)); g.add(at(kalash(X), 0.44, top, zb + 0.24));
  // canopy with cove strip, bells, toran
  B(g, w + 0.06, 0.07, d * 0.85, M.walnut, 0, 2.78, -d * 0.07);
  const strip = B(g, w - 0.1, 0.006, 0.02, M.ledWarm, 0, 2.742, 0.06); strip.userData.light = 'shrine'; strip.castShadow = false;
  for (const s of [-1, 1]) { const bl = bell(X); bl.position.set(s * 0.49, 1.98, d / 2 - 0.05); g.add(bl); C(g, 0.0018, 0.0018, 0.76, M.brassDark, s * 0.49, 2.36, d / 2 - 0.05, 6); }
  // toran: three marigold swags + hanging mango leaves
  for (let k = 0; k < 3; k++) {
    const x0 = -w / 2 + 0.04 + k * (w - 0.08) / 3, x1 = x0 + (w - 0.08) / 3;
    for (let i = 0; i <= 14; i++) { const t = i / 14; const x = x0 + (x1 - x0) * t, y = 2.72 - Math.sin(t * Math.PI) * 0.11; g.add(at(sphere(0.016, i % 2 ? X.marigold : X.marigoldY, 10), x, y, d / 2 - 0.02)); }
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.1), X.leaf); l.position.set((x0 + x1) / 2, 2.55, d / 2 - 0.02); g.add(l);
  }
  // floor: rangoli, urli with floating flowers and floating diyas, two samai lamps
  const rg = new THREE.Mesh(new THREE.CircleGeometry(0.34, 64), new THREE.MeshStandardMaterial({ map: rangoliTexture(), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 }));
  rg.rotation.x = -Math.PI / 2; rg.position.set(0, 0.003, d / 2 + 0.52); rg.receiveShadow = true; g.add(rg);
  { const u = lathe([[0, 0], [0.12, 0], [0.19, 0.04], [0.21, 0.075], [0.2, 0.08], [0.18, 0.05], [0, 0.03]], X.gold, 40); u.position.set(0, 0.004, d / 2 + 0.52); g.add(u);
    const wt = new THREE.Mesh(new THREE.CircleGeometry(0.185, 40), X.water); wt.rotation.x = -Math.PI / 2; wt.position.set(0, 0.058, d / 2 + 0.52); g.add(wt);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, r = 0.06 + (i % 3) * 0.04; const f = sphere(0.016, i % 2 ? X.marigold : X.lotus, 10); f.scale.set(1, 0.45, 1); f.position.set(Math.sin(a) * r, 0.062, d / 2 + 0.52 + Math.cos(a) * r); g.add(f); }
    for (const a of [0.8, 2.9, 5.0]) { const dy = diya(X); dy.scale.setScalar(0.7); dy.position.set(Math.sin(a) * 0.12, 0.058, d / 2 + 0.52 + Math.cos(a) * 0.12); g.add(dy); } }
  for (const s of [-1, 1]) g.add(at(samai(X), s * 0.42, 0, d / 2 + 0.2));
  // warm glow for the gold (independent of the room fill)
  const glow = new THREE.PointLight(0xffb468, 0.9, 1.6, 2); glow.position.set(0, top + 0.55, d / 2 + 0.25); g.add(glow);
  g.userData.collide = true; g.userData.kind = 'mandir';
  return g;
}
