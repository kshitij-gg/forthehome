// Lighting system: physically-based daylight (time of day, Dhule solar path), layered architectural
// night lighting (recessed profiles, gimbal spotlights, coves, downlights, pendants), live controls.
// Light count is constant (only intensities/colours change) → no shader recompiles while adjusting.
// Fill and spot lights are virtual; a fixed-size pool of real lights (sized by the quality tier) is
// re-assigned every frame to the ones that matter most near the viewer, so shaders loop over a few
// lights instead of all 28 — the single biggest fragment-cost saving on low-end GPUs.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { designConfig as DC } from '../data/designConfig.ts';
import { planBox } from '../utils/geom.js';
import { openings, walls, rooms as ROOMS } from '../data/floorplan.ts';

// Sky portals: every glazed window and balcony door gets a wide, fully-feathered spotlight placed just
// outside the glass and aimed down into the room (area lights looked similar but cost ~10x in shader
// compile time — far too slow a first load for ordinary laptops and phones). This is what makes daylight read as daylight — bright
// near the glass, falling off with depth — instead of the flat top-down fill of ceiling point lights.
const BALCONY_DOORS = { o_mbed_bal: 'mbed', o_hall_bal: 'hall', o_office_bal: 'office' };
const PORTALS = openings.filter((o) => o.kind === 'window' || BALCONY_DOORS[o.id]).map((o) => {
  const w = walls.find((q) => q.id === o.wall); const [x0, y0, x1, y1] = w.rect;
  const room = ROOMS.find((r) => r.id === (o.room || BALCONY_DOORS[o.id]));
  const rc = [(room.rect[0] + room.rect[2]) / 2, (room.rect[1] + room.rect[3]) / 2];
  const vertical = y1 - y0 > x1 - x0;
  let x, y, nx = 0, ny = 0;
  if (vertical) { nx = rc[0] > (x0 + x1) / 2 ? 1 : -1; x = (nx > 0 ? x1 : x0) + nx * 0.04; y = (o.a + o.b) / 2; }
  else { ny = rc[1] > (y0 + y1) / 2 ? 1 : -1; y = (ny > 0 ? y1 : y0) + ny * 0.04; x = (o.a + o.b) / 2; }
  return { id: o.id, room: room.id, x, y, nx, ny, w: o.b - o.a, h: o.head - o.sill, z: (o.sill + o.head) / 2, door: !!BALCONY_DOORS[o.id] };
});

export function kelvin(k) {
  const t = k / 100; let r, g, b;
  if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307; }
  else { r = 329.698727446 * Math.pow(t - 60, -0.1332047592); g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); b = 255; }
  const c = (v) => Math.max(0, Math.min(255, v)) / 255;
  return new THREE.Color(c(r), c(g), c(b));
}

// room fill lights (plan x, y, height, kelvin, base candela, range, role)
const LIGHTS = [
  ['hallA', 5.6, 5.9, 2.55, 2900, 8, 6.5, 'hall'],
  ['hallB', 8.3, 5.9, 2.55, 2900, 8, 6.5, 'hall'],
  ['dining', 5.12, 2.75, 1.6, 2700, 5, 5.0, 'dining'],
  ['kitchen', 8.2, 1.9, 2.6, 3500, 9, 5.0, 'kitchen'],
  ['mbed', 1.7, 3.0, 2.6, 2700, 6, 5.0, 'mbed'],
  ['chbed', 2.2, 10.0, 2.6, 2900, 6, 5.0, 'chbed'],
  ['office', 12.1, 9.9, 2.6, 4000, 8, 5.5, 'office'],
  ['mtoilet', 1.2, 6.0, 2.3, 3000, 3.2, 2.4, 'toilet'],
  ['ctoilet', 1.2, 7.4, 2.3, 3000, 3.0, 2.4, 'toilet'],
  ['chtoilet', 5.28, 10.6, 2.3, 3000, 3.2, 2.6, 'toilet'],
  ['shrine', 12.3, 7.22, 2.4, 2700, 3.0, 2.6, 'shrine'],
  ['foyer', 10.4, 7.15, 2.6, 2800, 4.0, 4.0, 'entry'],
  ['corridor', 2.87, 6.6, 2.6, 2800, 3.2, 3.6, 'corridor'],
  ['chrm', 5.47, 8.55, 2.5, 2900, 2.8, 2.6, 'chbed'],
  ['passage', 9.25, 8.3, 2.6, 3500, 4.0, 4.0, 'passage'],
  ['washing', 4.9, 0.65, 2.5, 4000, 3.2, 3.0, 'utility'],
];

// recessed linear LED profiles [x0, y0, x1, y1, role]
const PROFILES = [
  [5.0, 5.0, 9.2, 5.0, 'hall'], [5.0, 6.75, 9.2, 6.75, 'hall'],
  [4.05, 2.05, 5.85, 2.05, 'dining'], [4.05, 3.45, 5.85, 3.45, 'dining'],
  [6.85, 1.62, 9.1, 1.62, 'kitchen'], [6.85, 2.72, 9.1, 2.72, 'kitchen'],
  [2.75, 1.8, 2.75, 4.6, 'mbed'], [0.65, 4.4, 2.2, 4.4, 'mbed'],
  [3.55, 8.75, 3.55, 11.25, 'chbed'], [0.65, 8.95, 2.3, 8.95, 'chbed'],
  [11.1, 9.4, 13.1, 9.4, 'office'], [11.1, 10.6, 13.1, 10.6, 'office'],
  [2.87, 5.55, 2.87, 7.8, 'corridor'], [4.85, 8.65, 6.1, 8.65, 'chbed'],
  [10.05, 7.2, 11.55, 7.2, 'entry'], [3.85, 0.66, 6.0, 0.66, 'utility'], [8.35, 8.3, 10.15, 8.3, 'passage'],
];

// adjustable gimbal spotlights: [x, y, targetX, targetY, targetZ, role]
const SPOTS = [
  [5.25, 7.15, 5.25, 7.59, 0.9, 'hall'], [7.95, 7.15, 7.95, 7.59, 0.9, 'hall'],
  [4.75, 5.35, 4.27, 5.35, 1.2, 'hall'],
  [7.55, 4.55, 7.55, 3.76, 1.7, 'hall', 0.28],
  [3.95, 2.75, 3.47, 2.75, 1.7, 'dining'],
  [0.55, 2.2, 0.0, 2.2, 1.0, 'mbed'], [0.55, 3.46, 0.0, 3.46, 1.0, 'mbed'],
  [3.95, 10.6, 4.25, 10.6, 0.76, 'chbed'], [0.5, 10.18, 0.0, 10.18, 1.2, 'chbed'],
  [11.2, 10.45, 10.6, 10.45, 1.2, 'office'],
  [12.25, 7.226, 12.95, 7.226, 1.15, 'shrine'],
  [2.9, 6.0, 3.35, 6.0, 1.55, 'corridor'],
];

// Night styles: white temperature + cove colours (by room) — colour only ever in coves/accent strips.
export const NIGHT_STYLES = [
  { id: 'warm', name: 'Warm White', kelvin: 2900, coves: {} },
  { id: 'amber', name: 'Amber Lounge', kelvin: 2300, coves: { all: 0xffa04a }, dim: 0.75 },
  { id: 'blue', name: 'Moonlight Blue', kelvin: 3000, coves: { hall: 0x5d82ff, media: 0x5d82ff, office: 0x5d82ff, mbed: 0x7d96ff, chbed: 0x6f8cff, dining: 0x7d96ff }, dim: 0.7 },
  { id: 'violet', name: 'Soft Violet', kelvin: 2900, coves: { hall: 0x9a63ff, media: 0xa45cff, office: 0x8a6bff, mbed: 0xb07cff, chbed: 0x9a7cff, dining: 0xb48aff }, dim: 0.7 },
  { id: 'accent', name: 'Colour Accent', kelvin: 2800, coves: { hall: 0xb44cff, media: 0xe04aa8, dining: 0xffb02e, mbed: 0xff7a5c, head: 0xff8a5a, chbed: 0x2fd6c4, office: 0x5a62ff }, dim: 0.8, tint: true },
];

// Named lighting scenes. CCT follows residential practice: 2200–2700 K for intimate/evening, 2700–3000 K for
// living, 3000–3500 K for kitchens/gallery, 4000 K for task. Colour lives only in coves/accent strips.
const ALL_ON = { profiles: true, spots: true, coves: true, downlights: true };
export const LIGHT_SCENES = [
  { id: 'sunrise', name: 'Sunrise', group: 'day', patch: { mode: 'day', time: 7.0, dayLights: false, coveColor: null } },
  { id: 'morning', name: 'Morning', group: 'day', patch: { mode: 'day', time: 9.5, dayLights: false, coveColor: null } },
  { id: 'noon', name: 'Noon', group: 'day', patch: { mode: 'day', time: 12.5, dayLights: false, coveColor: null } },
  { id: 'golden', name: 'Golden hour', group: 'day', patch: { mode: 'day', time: 17.6, dayLights: true, brightness: 0.8, coveColor: null } },
  { id: 'evening', name: 'Evening', group: 'night', patch: { mode: 'night', style: 'warm', kelvin: 2700, brightness: 1, coveColor: null, layers: ALL_ON } },
  { id: 'dinner', name: 'Dinner', group: 'night', patch: { mode: 'night', style: 'amber', kelvin: 2300, brightness: 0.7, coveColor: null, layers: { profiles: false, spots: true, coves: true, downlights: true } } },
  { id: 'gallery', name: 'Gallery', group: 'night', patch: { mode: 'night', style: 'warm', kelvin: 3500, brightness: 1.15, coveColor: null, layers: { profiles: false, spots: true, coves: false, downlights: true } } },
  { id: 'focus', name: 'Focus', group: 'night', patch: { mode: 'night', style: 'warm', kelvin: 4000, brightness: 1.35, coveColor: null, layers: ALL_ON } },
  { id: 'bluehour', name: 'Blue hour', group: 'night', patch: { mode: 'night', style: 'blue', kelvin: 3000, brightness: 0.6, coveColor: 0x4a6cff, layers: ALL_ON } },
  { id: 'cinema', name: 'Cinema', group: 'night', patch: { mode: 'night', style: 'warm', kelvin: 2700, brightness: 0.35, coveColor: 0x6a4cff, layers: { profiles: false, spots: false, coves: true, downlights: false } } },
  { id: 'spa', name: 'Spa', group: 'night', patch: { mode: 'night', style: 'warm', kelvin: 2700, brightness: 0.6, coveColor: 0x2fd6c4, layers: { profiles: false, spots: true, coves: true, downlights: false } } },
  { id: 'diwali', name: 'Diwali', group: 'night', patch: { mode: 'night', style: 'amber', kelvin: 2200, brightness: 0.95, coveColor: 0xff9a2a, layers: ALL_ON } },
];

export const DEFAULT_LIGHTING = {
  mode: 'day', time: 10.5, dayLights: false, style: 'warm', brightness: 1.0, kelvin: 2900, exposure: 0, coveColor: null,
  layers: { profiles: true, spots: true, coves: true, downlights: true },
};

// approximate solar position for Dhule (lat 20.9°N), mid-February declination
function solar(hours) {
  const lat = THREE.MathUtils.degToRad(DC.latitude), dec = THREE.MathUtils.degToRad(-12.5);
  const H = THREE.MathUtils.degToRad(15 * (hours - 12.4));
  const el = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat)) + Math.PI; // from north, clockwise
  return { el, az };
}

export function createLighting(scene, renderer, M, arch, interiorsRoot, Q = {}) {
  const sys = { state: JSON.parse(JSON.stringify(DEFAULT_LIGHTING)) };
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  // ---------- sky ----------
  const sky = new Sky(); sky.scale.setScalar(4000); scene.add(sky);
  const su = sky.material.uniforms;
  su.turbidity.value = 3.5; su.rayleigh.value = 1.3; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.82;
  const nightBg = (() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#04060c'); g.addColorStop(0.62, '#0c1323'); g.addColorStop(1, '#1e2436');
    x.fillStyle = g; x.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  // ---------- sun ----------
  const sun = new THREE.DirectionalLight(0xfff3e2, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(Q.shadow || 4096, Q.shadow || 4096);
  const sc = sun.shadow.camera; sc.left = -10; sc.right = 10; sc.top = 10; sc.bottom = -10; sc.near = 5; sc.far = 80;
  sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4; sun.shadow.blurSamples = 16;
  const target = new THREE.Object3D(); target.position.set(7.3, 0, -6); scene.add(target); sun.target = target;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xdfe8f2, 0xb7ab98, 1.0); scene.add(hemi);

  // ---------- room fills ----------
  const pl = LIGHTS.map(([id, x, y, h, k, cd, range, role]) => {
    const l = new THREE.PointLight(kelvin(k), 0, range, 2);
    l.position.set(x, h, -y); l.userData = { id, base: cd, k, role };
    return l; // virtual: values only, the pool below does the rendering
  });

  // ---------- sky portals (virtual) ----------
  const portals = PORTALS.map((P) => {
    const back = 0.9; // the source sits outside the glass so the cone spans the whole opening
    const l = new THREE.SpotLight(0xffffff, 0, 9, Math.min(1.2, Math.atan2(Math.max(P.w, P.h) * 0.62, back)), 1.0, 2);
    l.position.set(P.x - P.nx * back, P.z + 0.15, -(P.y - P.ny * back));
    l.target.position.set(P.x + P.nx * 2.6, Math.max(0.2, P.z - 1.1), -(P.y + P.ny * 2.6)); l.target.updateMatrixWorld();
    l.userData = { ...P, area: P.w * P.h }; return l;
  });

  // ---------- recessed profile lights (fixtures) ----------
  const H = DC.wallHeight;
  const profileGroup = new THREE.Group(); profileGroup.name = 'profiles';
  for (const [x0, y0, x1, y1] of PROFILES) {
    const horiz = Math.abs(y1 - y0) < 1e-6;
    const trim = horiz ? [x0, y0 - 0.026, x1, y0 + 0.026] : [x0 - 0.026, y0, x0 + 0.026, y1];
    const led = horiz ? [x0 + 0.012, y0 - 0.017, x1 - 0.012, y0 + 0.017] : [x0 - 0.017, y0 + 0.012, x0 + 0.017, y1 - 0.012];
    const t = planBox(trim, H - 0.004, H + 0.001, M.profileTrim); t.castShadow = false; profileGroup.add(t);
    const l = planBox(led, H - 0.0055, H - 0.004, M.profileLED); l.castShadow = false; profileGroup.add(l);
  }
  scene.add(profileGroup);

  // ---------- gimbal spotlights ----------
  const spotGroup = new THREE.Group(); spotGroup.name = 'spots';
  const spots = SPOTS.map(([x, y, tx, ty, tz, role, k = 1]) => {
    const s = new THREE.SpotLight(0xfff0dc, 0, 7, THREE.MathUtils.degToRad(19), 0.75, 2);
    s.position.set(x, H - 0.06, -y);
    s.target.position.set(tx, tz, -ty);
    s.userData = { role, base: 34 * k };
    s.target.updateMatrixWorld(); // virtual, like the fills
    // fixture: flush trim ring + tilted gimbal can + lens
    const g = new THREE.Group(); g.position.set(x, H, -y);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.006, 28), M.spotTrim); ring.position.y = -0.003; g.add(ring);
    const can = new THREE.Group(); can.position.y = -0.03; g.add(can);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.06, 24, 1, true), M.spotTrim); can.add(body);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.026, 24), M.spotLens); lens.rotation.x = Math.PI / 2; lens.position.y = -0.028; can.add(lens);
    const dir = new THREE.Vector3(tx - x, tz - (H - 0.06), -(ty - y)).normalize();
    can.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    spotGroup.add(g);
    return s;
  });
  scene.add(spotGroup);

  // ---------- light pool ----------
  const mkPool = (list, n, make) => Array.from({ length: Math.min(n ?? list.length, list.length) }, () => { const l = make(); scene.add(l); if (l.target) scene.add(l.target); return { l, src: null, fade: 0 }; });
  const MAXP = 12, MAXS = 8, MAXR = 3; // physical pool maxima (Ultra); the active budget follows the quality tier
  const pPoolAll = mkPool(pl, MAXP, () => new THREE.PointLight(0xffffff, 0, 5, 2));
  const sPoolAll = mkPool(spots, MAXS, () => new THREE.SpotLight(0xffffff, 0, 7, 0.3, 0.75, 2));
  let pPool = pPoolAll, sPool = sPoolAll;
  const fillPool = (pool, list, focus, dt, isSpot, doRank = true) => {
    const all = pool.length >= list.length;
    if (doRank) {
    const score = (v) => {
      if (v.intensity <= 0) return -1;
      if (all) return 1;
      const d = v.position.distanceTo(focus), r = v.distance || 8;
      const near = Math.max(0, 1 - d / (r + 3));
      const cur = pool.some((s) => s.src === v) ? 1.2 : 1; // hysteresis: don't flicker between equals
      return v.intensity * (isSpot ? 0.08 : 1) * near * near * cur + (near > 0 ? 1e-3 : 0);
    };
    const ranked = list.map((v) => [score(v), v]).filter((q) => q[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, pool.length).map((q) => q[1]);
    const want = new Set(ranked);
    for (const s of pool) if (s.src && !want.has(s.src)) s.src = null;
    for (const v of ranked) {
      if (pool.some((s) => s.src === v)) continue;
      const free = pool.find((s) => !s.src); if (!free) break;
      free.src = v; free.fade = all ? 1 : 0;
    }
    }
    for (const s of pool) {
      const l = s.l;
      if (!s.src) { l.intensity = 0; continue; }
      s.fade = Math.min(1, s.fade + dt / 0.3);
      const v = s.src;
      l.position.copy(v.position); l.color.copy(v.color); l.distance = v.distance; l.decay = v.decay;
      l.intensity = v.intensity * s.fade;
      if (isSpot) { l.angle = v.angle; l.penumbra = v.penumbra; l.target.position.copy(v.target.position); l.target.updateMatrixWorld(); }
    }
  };
  const rPoolAll = Array.from({ length: Math.min(MAXR, portals.length) }, () => { const l = new THREE.SpotLight(0xffffff, 0, 9, 1, 1, 2); scene.add(l); scene.add(l.target); return { l, src: null, fade: 0 }; });
  let rPool = rPoolAll;
  const roomAtFocus = (f) => { const x = f.x, y = -f.z; const r = ROOMS.find((q) => x >= q.rect[0] && x <= q.rect[2] && y >= q.rect[1] && y <= q.rect[3]); return r ? r.id : null; };
  const OPEN = new Set(['hall', 'dining', 'kitchen']);
  const fillPortals = (focus, dt, doRank = true) => {
    const here = roomAtFocus(focus);
    const all = rPool.length >= portals.length;
    if (doRank) {
    const scored = portals.map((v) => {
      if (v.intensity <= 0) return [-1, v];
      if (all) return [1, v];
      const d = Math.hypot(v.position.x - focus.x, v.position.z - focus.z);
      const same = v.userData.room === here || (OPEN.has(here) && OPEN.has(v.userData.room));
      const cur = rPool.some((s) => s.src === v) ? 1.2 : 1;
      return [v.intensity * Math.max(0, 1 - d / 9) ** 2 * (same ? 3 : 1) * cur, v];
    }).filter((q) => q[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, rPool.length).map((q) => q[1]);
    const want = new Set(scored);
    for (const s of rPool) if (s.src && !want.has(s.src)) s.src = null;
    for (const v of scored) { if (rPool.some((s) => s.src === v)) continue; const free = rPool.find((s) => !s.src); if (!free) break; free.src = v; free.fade = all ? 1 : 0; }
    }
    for (const s of rPool) {
      const l = s.l;
      if (!s.src) { l.intensity = 0; continue; }
      s.fade = Math.min(1, s.fade + dt / 0.4);
      const v = s.src;
      l.position.copy(v.position); l.target.position.copy(v.target.position); l.target.updateMatrixWorld();
      l.angle = v.angle; l.penumbra = v.penumbra; l.distance = v.distance; l.decay = v.decay;
      l.color.copy(v.color); l.intensity = v.intensity * s.fade;
    }
  };
  /** Assign the real lights to the virtual ones that matter most around `focus` (world position). */
  const lastRank = new THREE.Vector3(1e9, 0, 0); let rankAge = 1e9, rankSig = '';
  sys.updatePool = (focus, dt = 1) => {
    rankAge += dt;
    const sig = JSON.stringify(sys.state); // lighting changed → re-rank at once
    const doRank = focus.distanceTo(lastRank) > 0.35 || rankAge > 0.6 || sig !== rankSig;
    if (doRank) { lastRank.copy(focus); rankAge = 0; rankSig = sig; }
    fillPool(pPool, pl, focus, dt, false, doRank); fillPool(sPool, spots, focus, dt, true, doRank); fillPortals(focus, dt, doRank);
  };
  sys.poolSize = { points: 0, spots: 0, rects: 0, total: pl.length + spots.length };
  /** Active real-light budget (changes the shader light counts → callers should recompile afterwards). */
  sys.setBudget = ({ points, spots: sp, rects }) => {
    const set = (all, n) => { const act = all.slice(0, Math.min(n, all.length)); all.forEach((s) => { const on = act.includes(s); s.l.visible = on; if (!on) { s.src = null; s.l.intensity = 0; } }); return act; };
    pPool = set(pPoolAll, points); sPool = set(sPoolAll, sp); rPool = set(rPoolAll, rects);
    sys.poolSize.points = pPool.length; sys.poolSize.spots = sPool.length; sys.poolSize.rects = rPool.length;
    rankSig = ''; // re-rank on the next frame
  };
  sys.setBudget({ points: Q.points, spots: Q.spots, rects: Q.rects });
  sys.setShadowSize = (n) => { sun.shadow.mapSize.set(n, n); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } };
  sys.setProbeSize = (n) => { cubeRT.setSize(n, n); };

  // ---------- emissive inventories ----------
  const special = {};
  interiorsRoot.traverse((o) => {
    if (!o.isMesh || !o.userData.light) return;
    const key = o.userData.light === 'mediaCove' ? 'media' : o.userData.light === 'mbedHead' ? 'head' : null;
    if (!key) return;
    if (!special[key]) special[key] = o.material.clone();
    o.material = special[key];
  });
  const coveMats = arch.coveGroups;

  // ---------- apply ----------
  sys.apply = (patch = {}) => {
    // merge layer switches individually so toggling one never resets the others
    const prevLayers = { ...DEFAULT_LIGHTING.layers, ...sys.state.layers };
    const s = Object.assign(sys.state, patch);
    s.layers = { ...prevLayers, ...(patch.layers || {}) };
    const day = s.mode === 'day';
    const bright = s.brightness;
    const style = NIGHT_STYLES.find((q) => q.id === s.style) || NIGHT_STYLES[0];
    const white = kelvin(s.kelvin);
    const L = s.layers;

    if (day) {
      const { el, az } = solar(s.time);
      const elev = Math.max(el, THREE.MathUtils.degToRad(1.5));
      const dir = new THREE.Vector3(Math.sin(az) * Math.cos(elev), Math.sin(elev), -Math.cos(az) * Math.cos(elev));
      sun.position.copy(target.position).addScaledVector(dir, 40);
      const lowSun = THREE.MathUtils.clamp(1 - THREE.MathUtils.radToDeg(elev) / 25, 0, 1); // 0 high → 1 near horizon
      sun.color.copy(kelvin(5600 - 2900 * lowSun));
      sun.intensity = 2.6 * (1.2 + 4.0 * Math.sin(elev) ** 0.6 * (1 - lowSun * 0.35));
      sun.castShadow = true;
      hemi.color.set(0xd9e4f2).lerp(new THREE.Color(0xc9a98f), lowSun * 0.6); hemi.groundColor.set(0xbfae98); hemi.intensity = 0.6 * (0.18 + 0.06 * (1 - lowSun));
      scene.environmentIntensity = 0.52 - lowSun * 0.1;
      sky.visible = true; su.sunPosition.value.copy(dir); su.rayleigh.value = 1.2 + lowSun * 1.4; su.turbidity.value = 3.5 + lowSun * 3;
      scene.background = null;
      renderer.toneMappingExposure = 0.62 * 2 ** s.exposure * (1 + lowSun * 0.25);
      M.neighbourBand.emissiveIntensity = lowSun * 0.12;
      scene.fog = new THREE.Fog(new THREE.Color(0xdfe6ee).lerp(new THREE.Color(0xd8a988), lowSun * 0.6), 70, 280);
    } else {
      sun.intensity = 0; // keep castShadow on: toggling it changes every material's shader (a multi-second recompile on the first night frame)
      hemi.color.set(0x24304a); hemi.groundColor.set(0x0b0b0d); hemi.intensity = 0.05;
      scene.environmentIntensity = 0.55;
      sky.visible = false; scene.background = nightBg;
      renderer.toneMappingExposure = 0.86 * 2 ** s.exposure;
      M.neighbourBand.emissive.set(0xffc88a); M.neighbourBand.emissiveIntensity = 0.35;
      scene.fog = new THREE.Fog(0x0d1424, 70, 280);
    }

    // artificial layers (night, or day with "interior lights on")
    const art = day ? (s.dayLights ? 0.55 : 0) : 1;
    const dim = (day ? 1 : (style.dim ?? 1)) * bright * art;
    const share = 0.62 * (0.15 + (L.downlights ? 0.3 : 0) + (L.profiles ? 0.4 : 0) + (L.coves ? 0.15 : 0));
    const skyFill = { hall: 3.0, dining: 2.0, kitchen: 2.8, mbed: 2.8, chbed: 2.8, office: 2.8, toilet: 1.1, shrine: 1.2, entry: 1.6, corridor: 1.6, passage: 1.2, utility: 1.4 };
    const skyCol = kelvin(5600);
    // sky portals: diffuse sky through the glass, plus warm bounce when the sun is on that facade
    {
      const { el: sel, az: saz } = solar(s.time);
      const sx = Math.sin(saz), sy = Math.cos(saz); // plan direction towards the sun
      const skyLum = day ? 3.0 * (0.3 + 0.7 * Math.sin(Math.max(0.05, sel)) ** 0.5) : 0;
      const skyTint = kelvin(7200), sunTint = kelvin(4300);
      for (const v of portals) {
        const P = v.userData;
        const sunIn = day ? Math.max(0, -(P.nx * sx + P.ny * sy)) * Math.max(0, Math.sin(sel)) : 0;
        v.intensity = (day ? skyLum * (P.door ? 1.0 : 0.9) * (1 + 1.6 * sunIn) : 0.05) * P.area * 1.1; // luminance × opening area → candela
        v.color.copy(day ? skyTint.clone().lerp(sunTint, Math.min(1, sunIn * 1.4)) : new THREE.Color(0x6d82b0));
      }
    }
    pl.forEach((l) => {
      const role = l.userData.role;
      const task = role === 'toilet' || role === 'kitchen' || role === 'utility' || role === 'passage';
      const k = l.userData.base * dim * (task ? Math.max(share, 0.75) : share) * (role === 'shrine' ? 1.1 : 1);
      if (day && !s.dayLights) { l.intensity = (skyFill[role] ?? 1.4) * 0.24; l.color.copy(skyCol); return; } // bounce only: the portals carry the daylight
      l.intensity = k + (day ? (skyFill[role] ?? 1.4) * 0.18 : 0);
      l.color.copy(role === 'shrine' ? kelvin(2700) : role === 'office' && !day ? kelvin(Math.max(s.kelvin, 3800)) : white);
      if (day) l.color.lerp(skyCol, 0.5);
      if (s.coveColor != null && art > 0 && role !== 'shrine' && role !== 'toilet') l.color.lerp(new THREE.Color(s.coveColor), day ? 0.08 : 0.18);
      if (style.tint && !day) {
        const tint = { hall: 0xc060ff, dining: 0xffb040, mbed: 0xff8a70, chbed: 0x40d0c0, office: 0x6a70ff }[role];
        if (tint) l.color.lerp(new THREE.Color(tint), 0.28);
      }
    });
    // spotlights
    spots.forEach((sp) => { sp.intensity = L.spots ? sp.userData.base * dim : 0; sp.color.copy(sp.userData.role === 'shrine' ? kelvin(2700) : white); });
    M.spotLens.emissive.copy(white); M.spotLens.emissiveIntensity = L.spots ? 3.5 * Math.min(1.4, dim + (art > 0 ? 0.1 : 0)) : 0;
    // profiles
    M.profileLED.emissive.copy(white); M.profileLED.emissiveIntensity = L.profiles ? 6.0 * Math.min(1.5, dim) : 0;
    // downlights, pendants, lamps, joinery strips
    const on = art > 0 ? Math.min(1.5, dim) : 0;
    M.downlight.emissive.copy(white); M.downlight.emissiveIntensity = L.downlights ? 3.2 * on : 0;
    M.bulbGlass.emissiveIntensity = 2.0 * on; M.lampShade.emissiveIntensity = 1.4 * on;
    M.ledWarm.emissive.copy(kelvin(Math.min(s.kelvin, 3000))); M.ledWarm.emissiveIntensity = 2.2 * on;
    M.ledNeutral.emissiveIntensity = 2.0 * on;
    // coves (colour allowed only here)
    const warm = kelvin(Math.min(s.kelvin, 3000));
    const covesOn = L.coves && art > 0;
    const pick = s.coveColor != null ? s.coveColor : null;
    for (const [id, c] of Object.entries(coveMats)) {
      const col = pick != null ? pick : day ? null : (style.coves[id] ?? style.coves.all);
      c.strip.emissive.copy(col != null ? new THREE.Color(col) : warm);
      c.strip.emissiveIntensity = covesOn ? (col != null ? 2.8 : 2.2) * Math.min(1.5, dim + 0.15) : 0;
      c.wash.color.copy(col != null ? new THREE.Color(col) : warm);
      c.wash.opacity = covesOn ? Math.min(0.85, 0.42 * Math.min(1.6, dim + 0.2) * (col != null ? 1.4 : 1)) : 0;
    }
    for (const key of ['media', 'head']) {
      const m = special[key]; if (!m) continue;
      const col = pick != null ? pick : day ? null : (style.coves[key] ?? (key === 'media' ? style.coves.hall : style.coves.mbed) ?? style.coves.all);
      m.emissive.copy(col != null ? new THREE.Color(col) : warm);
      m.emissiveIntensity = covesOn ? (col != null ? 3.0 : 2.2) * Math.min(1.5, dim + 0.15) : 0;
    }
  };

  // ---------- interior reflection/irradiance probe ----------
  const cubeRT = new THREE.WebGLCubeRenderTarget(Q.probe || 256, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const cubeCam = new THREE.CubeCamera(0.05, 200, cubeRT);
  cubeCam.position.set(6.9, 1.45, -5.8);
  scene.add(cubeCam);
  let probeTex = null;
  // optional string key: probes are cached per key (small LRU) so offline renders can flip between lit states cheaply
  const probeCache = new Map();
  sys.captureProbe = (hide = [], key = null) => {
    if (typeof key !== 'string') key = null;
    if (key && probeCache.has(key)) { const c = probeCache.get(key); probeCache.delete(key); probeCache.set(key, c); probeTex = c; scene.environment = c; return; }
    const vis = hide.map((o) => o.visible);
    hide.forEach((o) => { o.visible = false; });
    scene.environment = envTex;
    cubeCam.update(renderer, scene);
    const next = pmrem.fromCubemap(cubeRT.texture).texture;
    const cached = new Set(probeCache.values());
    if (probeTex && !cached.has(probeTex)) probeTex.dispose();
    probeTex = next;
    if (key) {
      probeCache.set(key, next);
      while (probeCache.size > (Q.probeCache || 48)) { const [k0, t0] = probeCache.entries().next().value; probeCache.delete(k0); if (t0 !== probeTex) t0.dispose(); }
    }
    scene.environment = probeTex;
    hide.forEach((o, i) => { o.visible = vis[i]; });
  };
  sys.clearProbeCache = () => { for (const t of probeCache.values()) if (t !== probeTex) t.dispose(); probeCache.clear(); };
  sys.formatTime = (h) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return `${String(hh).padStart(2, '0')}:${String(mm === 60 ? 0 : mm).padStart(2, '0')}`; };
  sys.portals = portals;
  sys.sun = sun; sys.sunTarget = target; sys.hemi = hemi; sys.points = pl; sys.spots = spots; sys.sky = sky; sys.probeCam = cubeCam;
  return sys;
}
