// Architecture compiled from src/data/floorplan.ts: slab, floors, walls with openings,
// windows, linings, ceilings + coves, skirting, railings, stair, lift, duct, context.
import * as THREE from 'three';
import { walls, openings, rooms, floors, railings, stair } from '../data/floorplan.ts';
import { designConfig as DC } from '../data/designConfig.ts';
import { planBoxGeo, planBox, merge, B, C, P, worldUV } from '../utils/geom.js';
import { buildSurroundings } from './context.js';

const H = DC.wallHeight;
export const CLIP_H = 2.35; // overview cut height

const axisOf = (r) => (r[2] - r[0] >= r[3] - r[1] ? 'x' : 'y');
const wallById = Object.fromEntries(walls.map((w) => [w.id, w]));

/** Split a wall into solid pieces around its openings. */
export function wallPieces(w, height = H) {
  const r = w.rect, ax = axisOf(r);
  const lo = ax === 'x' ? r[0] : r[1], hi = ax === 'x' ? r[2] : r[3];
  const ops = openings.filter((o) => o.wall === w.id).sort((a, b) => a.a - b.a);
  const mk = (s, e) => (ax === 'x' ? [s, r[1], e, r[3]] : [r[0], s, r[2], e]);
  const pieces = [];
  let cur = lo;
  for (const o of ops) {
    if (o.a > cur + 1e-4) pieces.push({ rect: mk(cur, o.a), z0: 0, z1: height });
    if (o.sill > 1e-4) pieces.push({ rect: mk(o.a, o.b), z0: 0, z1: o.sill, sill: true, op: o });
    if (o.head < height - 1e-4) pieces.push({ rect: mk(o.a, o.b), z0: o.head, z1: height, lintel: true, op: o });
    cur = o.b;
  }
  if (hi > cur + 1e-4) pieces.push({ rect: mk(cur, hi), z0: 0, z1: height });
  return pieces;
}

/** plan rect of an opening (span × wall thickness) */
export function openingRect(o) {
  const w = wallById[o.wall]; const r = w.rect;
  return axisOf(r) === 'x' ? [o.a, r[1], o.b, r[3]] : [r[0], o.a, r[2], o.b];
}
export { axisOf, wallById };

const inRect = (x, y, r, e = 0) => x > r[0] - e && x < r[2] + e && y > r[1] - e && y < r[3] + e;
const floorAt = (x, y) => floors.find((f) => inRect(x, y, f.rect));

export function buildArchitecture(M, ctx) {
  const root = new THREE.Group(); root.name = 'architecture';
  const overviewOnly = new THREE.Group(); overviewOnly.name = 'overviewCaps';
  const upper = []; // meshes hidden in overview (ceilings etc.)
  const colliders = [];

  // ---------------- base slab & floor finishes ----------------
  const slabGeos = [];
  const minX = -0.25, maxX = 14.85, minY = -0.25, maxY = 12.03;
  // slab under the whole footprint (stepped outline approximated with rectangles)
  [[-0.25, -0.1, 3.36, 12.03], [3.35, -0.25, 10.1, 7.75], [10.0, 3.7, 11.75, 6.6], [10.0, 6.4, 13.3, 12.03], [13.2, 7.78, 14.85, 12.03], [3.35, 7.5, 10.6, 12.03]]
    .forEach((r) => slabGeos.push(planBoxGeo(r, -DC.slabThickness - 0.02, -0.02)));
  const slab = new THREE.Mesh(merge(slabGeos), M.slab); slab.receiveShadow = true; slab.castShadow = true; root.add(slab);
  void minX; void maxX; void minY; void maxY;

  // one mesh per floor region so finishes can be swapped room-by-room (Design Studio)
  const floorMeshes = [];
  for (const f of floors) {
    const top = f.y ?? 0;
    const m = new THREE.Mesh(planBoxGeo(f.rect, top - 0.02, top), M[f.mat] || M.porcelain);
    m.receiveShadow = true; m.name = 'floor_' + f.id;
    m.userData = { dynamic: true, floor: f.id, room: f.room, baseMat: f.mat };
    root.add(m); floorMeshes.push(m);
  }
  // thresholds under every door opening (stone strips)
  const thresholdGeos = [];
  for (const o of openings) {
    if (o.kind !== 'door') continue;
    thresholdGeos.push(planBoxGeo(openingRect(o), -0.02, 0.004));
  }
  { const m = new THREE.Mesh(merge(thresholdGeos), M.threshold); m.receiveShadow = true; m.name = 'thresholds'; root.add(m); }

  // ---------------- walls ----------------
  const wallGeos = { paint: [], core: [], exterior: [] };
  const capGeos = [];
  const skirtGeos = [];
  for (const w of walls) {
    const pieces = wallPieces(w);
    for (const p of pieces) {
      const g = planBoxGeo(p.rect, p.z0, p.z1);
      (w.kind === 'core' ? wallGeos.core : wallGeos.paint).push(g);
      if (p.z1 > CLIP_H) capGeos.push(planBoxGeo(p.rect, CLIP_H - 0.012, CLIP_H - 0.004));
      if (p.z0 === 0) {
        // collider (door gaps excluded automatically because doors have no z0=0 piece)
        colliders.push({ rect: p.rect, kind: 'wall', id: w.id });
        // shadow-gap skirting on faces that touch a dry floor
        const r = p.rect, ax = axisOf(r);
        const faces = ax === 'x'
          ? [{ rect: [r[0], r[1] - 0.012, r[2], r[1]], probe: [(r[0] + r[2]) / 2, r[1] - 0.05] }, { rect: [r[0], r[3], r[2], r[3] + 0.012], probe: [(r[0] + r[2]) / 2, r[3] + 0.05] }]
          : [{ rect: [r[0] - 0.012, r[1], r[0], r[3]], probe: [r[0] - 0.05, (r[1] + r[3]) / 2] }, { rect: [r[2], r[1], r[2] + 0.012, r[3]], probe: [r[2] + 0.05, (r[1] + r[3]) / 2] }];
        if (w.kind === 'column') {
          faces.push(...(ax === 'x'
            ? [{ rect: [r[0] - 0.012, r[1], r[0], r[3]], probe: [r[0] - 0.05, (r[1] + r[3]) / 2] }, { rect: [r[2], r[1], r[2] + 0.012, r[3]], probe: [r[2] + 0.05, (r[1] + r[3]) / 2] }]
            : [{ rect: [r[0], r[1] - 0.012, r[2], r[1]], probe: [(r[0] + r[2]) / 2, r[1] - 0.05] }, { rect: [r[0], r[3], r[2], r[3] + 0.012], probe: [(r[0] + r[2]) / 2, r[3] + 0.05] }]));
        }
        for (const f of faces) {
          const fl = floorAt(f.probe[0], f.probe[1]);
          if (fl && ['porcelain', 'oak', 'lobby', 'marble'].includes(fl.mat)) skirtGeos.push(planBoxGeo(f.rect, 0, 0.075));
        }
      }
    }
  }
  const wallMesh = new THREE.Mesh(merge(wallGeos.paint), M.wall); wallMesh.castShadow = true; wallMesh.receiveShadow = true; wallMesh.name = 'walls';
  root.add(wallMesh);
  if (wallGeos.core.length) { const cm = new THREE.Mesh(merge(wallGeos.core), M.wall); cm.castShadow = cm.receiveShadow = true; root.add(cm); }
  const skirt = new THREE.Mesh(merge(skirtGeos), M.skirting); skirt.receiveShadow = true; root.add(skirt);
  const caps = new THREE.Mesh(merge(capGeos), M.cap); caps.name = 'wallCaps'; overviewOnly.add(caps);

  // ---------------- wet-area & feature linings ----------------
  const liningGeos = { bathWall: [], bathFeature: [] };
  const lineRoom = (roomId, height, matKey = 'bathWall', featureEdge = null) => {
    const rm = rooms.find((r) => r.id === roomId);
    const [x0, y0, x1, y1] = rm.rect; const t = 0.012;
    const edges = [
      { e: 'S', rect: [x0, y0, x1, y0 + t], ax: 'x', lo: x0, hi: x1, probe: (s) => [s, y0 - 0.03] },
      { e: 'N', rect: [x0, y1 - t, x1, y1], ax: 'x', lo: x0, hi: x1, probe: (s) => [s, y1 + 0.03] },
      { e: 'W', rect: [x0, y0, x0 + t, y1], ax: 'y', lo: y0, hi: y1, probe: (s) => [x0 - 0.03, s] },
      { e: 'E', rect: [x1 - t, y0, x1, y1], ax: 'y', lo: y0, hi: y1, probe: (s) => [x1 + 0.03, s] },
    ];
    for (const ed of edges) {
      // openings touching this edge
      const cuts = [];
      for (const o of openings) {
        const orc = openingRect(o);
        const [px, py] = ed.probe(ed.ax === 'x' ? (o.a + o.b) / 2 : (o.a + o.b) / 2);
        const touches = ed.ax === axisOf(wallById[o.wall].rect) && inRect(px, py, orc, 0.001);
        if (touches) cuts.push(o);
      }
      cuts.sort((a, b) => a.a - b.a);
      let cur = ed.lo;
      const mk = (s, e) => (ed.ax === 'x' ? [s, ed.rect[1], e, ed.rect[3]] : [ed.rect[0], s, ed.rect[2], e]);
      const target = featureEdge === ed.e ? liningGeos.bathFeature : liningGeos[matKey];
      for (const o of cuts) {
        const a = Math.max(o.a, ed.lo), b = Math.min(o.b, ed.hi);
        if (a > cur) target.push(planBoxGeo(mk(cur, a), 0, height));
        if (o.sill > 0) target.push(planBoxGeo(mk(a, b), 0, o.sill));
        if (o.head < height) target.push(planBoxGeo(mk(a, b), o.head, height));
        cur = b;
      }
      if (ed.hi > cur) target.push(planBoxGeo(mk(cur, ed.hi), 0, height));
    }
  };
  lineRoom('mtoilet', DC.ceilingToilet, 'bathWall', 'W');
  lineRoom('ctoilet', DC.ceilingToilet, 'bathWall', 'W');
  lineRoom('chtoilet', DC.ceilingToilet, 'bathWall', 'N');
  for (const [k, g] of Object.entries(liningGeos)) if (g.length) { const m = new THREE.Mesh(merge(g), M[k]); m.receiveShadow = true; m.castShadow = false; root.add(m); }
  // washing area: 1.2 m durable dado tile
  const washDado = [];
  { const [x0, y0, x1, y1] = rooms.find((r) => r.id === 'washing').rect; const t = 0.01;
    washDado.push(planBoxGeo([x0, y0, x0 + t, y1], 0, 1.2), planBoxGeo([x1 - t, y0, x1, y1], 0, 1.2), planBoxGeo([x0, y0, 3.95, y0 + t], 0, 1.2), planBoxGeo([5.75, y0, x1, y0 + t], 0, 1.2)); }
  { const m = new THREE.Mesh(merge(washDado), M.utility); m.receiveShadow = true; root.add(m); }

  // ---------------- windows ----------------
  for (const o of openings) {
    if (!['window', 'vent', 'jaali'].includes(o.kind)) continue;
    root.add(buildWindow(o, M));
  }

  // ---------------- ceilings ----------------
  const ceilGeos = [], toiletCeil = [], bulkGeos = [], coveStrips = [];
  const ceilH = (x, y) => {
    for (const id of ['mtoilet', 'ctoilet', 'chtoilet']) if (inRect(x, y, rooms.find((r) => r.id === id).rect)) return DC.ceilingToilet;
    return H;
  };
  for (const f of floors) {
    const cx = (f.rect[0] + f.rect[2]) / 2, cy = (f.rect[1] + f.rect[3]) / 2;
    const h = ceilH(cx, cy);
    (h < H ? toiletCeil : ceilGeos).push(planBoxGeo(f.rect, h, h + 0.04));
  }
  // ceiling over stair is open (shaft); over lift & duct closed by core tops
  ceilGeos.push(planBoxGeo([3.3528, 7.593, 4.4958, 8.1262], H, H + 0.04));
  const ceil = new THREE.Mesh(merge(ceilGeos), M.ceiling); ceil.receiveShadow = true; ceil.name = 'ceiling'; root.add(ceil); upper.push(ceil);
  const tceil = new THREE.Mesh(merge(toiletCeil), M.ceiling); tceil.receiveShadow = true; root.add(tceil); upper.push(tceil);
  // perimeter cove bulkheads (100 mm drop) with hidden LED
  const coveRooms = [
    { id: 'mbed', color: 'mbed' }, { id: 'chbed', color: 'chbed' }, { id: 'office', color: 'office' },
    { id: 'hall', color: 'hall' }, { id: 'dining', color: 'dining' },
  ];
  const coveRects = {};
  for (const cr of coveRooms) {
    const rm = rooms.find((r) => r.id === cr.id);
    let [x0, y0, x1, y1] = rm.rect;
    if (cr.id === 'dining') { y1 = 4.0116; x1 = 6.4; y0 = 1.3954; }
    if (cr.id === 'hall') { x0 = 4.2686; }
    const wB = DC.coveWidth, z0 = H - DC.coveDrop, z1 = H;
    const segs = [[x0, y0, x1, y0 + wB], [x0, y1 - wB, x1, y1], [x0, y0 + wB, x0 + wB, y1 - wB], [x1 - wB, y0 + wB, x1, y1 - wB]];
    segs.forEach((s) => bulkGeos.push(planBoxGeo(s, z0, z1)));
    coveRects[cr.id] = { inner: [x0 + wB, y0 + wB, x1 - wB, y1 - wB], color: cr.color };
  }
  const bulk = new THREE.Mesh(merge(bulkGeos), M.ceiling); bulk.receiveShadow = true; bulk.castShadow = false; root.add(bulk); upper.push(bulk);
  // cove LED strips: emissive strip inside the reveal + soft wash on the recessed ceiling
  const coveGroups = {};
  for (const [id, cr] of Object.entries(coveRects)) {
    const [x0, y0, x1, y1] = cr.inner;
    const mat = M.ledWarm.clone(); mat.name = 'cove_' + id;
    const washMat = new THREE.MeshBasicMaterial({ map: ctx.washTex, color: 0xffc98a, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false });
    const g = new THREE.Group(); g.name = 'cove_' + id;
    const strip = [], wash = [];
    const zS = H - DC.coveDrop + 0.02;
    strip.push(planBoxGeo([x0, y0 + 0.01, x1, y0 + 0.022], zS, zS + 0.012), planBoxGeo([x0, y1 - 0.022, x1, y1 - 0.01], zS, zS + 0.012), planBoxGeo([x0 + 0.01, y0, x0 + 0.022, y1], zS, zS + 0.012), planBoxGeo([x1 - 0.022, y0, x1 - 0.01, y1], zS, zS + 0.012));
    const sm = new THREE.Mesh(merge(strip), mat); g.add(sm);
    // wash planes (gradient fading inward from each edge), just under the ceiling plane
    const wd = 0.55;
    const mkWash = (cx, cy, w, d, rot) => {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), washMat);
      pl.rotation.x = Math.PI / 2; pl.rotation.z = rot; pl.position.set(cx, H - 0.004, -cy); pl.renderOrder = 2; return pl;
    };
    wash.push(mkWash((x0 + x1) / 2, y0 + wd / 2, x1 - x0, wd, 0));
    wash.push(mkWash((x0 + x1) / 2, y1 - wd / 2, x1 - x0, wd, Math.PI));
    wash.push(mkWash(x0 + wd / 2, (y0 + y1) / 2, y1 - y0, wd, Math.PI / 2));
    wash.push(mkWash(x1 - wd / 2, (y0 + y1) / 2, y1 - y0, wd, -Math.PI / 2));
    wash.forEach((w) => g.add(w));
    root.add(g); upper.push(g);
    coveGroups[id] = { strip: mat, wash: washMat, group: g };
  }

  // ---------------- railings ----------------
  for (const r of railings) root.add(buildRailing(r, M, colliders));

  // ---------------- stair, lift, duct ----------------
  root.add(buildStair(M, colliders, upper));
  root.add(buildLift(M));
  root.add(buildDuctLouvre(M));
  // lift + duct interiors are sealed (non-enterable)
  colliders.push({ rect: [6.4484, 7.708, 7.9724, 9.232], kind: 'lift' });
  colliders.push({ rect: [6.4484, 10.2598, 7.9724, 11.7838], kind: 'duct' });
  // core tops
  root.add(planBox([6.4484, 7.708, 7.9724, 11.7838], H - 0.02, H + 0.04, M.ceiling));

  // ---------------- exterior context ----------------
  root.add(buildContext(M, ctx.contextDensity ?? 1));

  root.add(overviewOnly);
  return { root, colliders, upper, overviewOnly, coveGroups, floorMeshes, coveRects };
}

// ---------------------------------------------------------------------
function buildWindow(o, M) {
  const g = new THREE.Group(); g.name = 'window_' + o.id;
  const w = wallById[o.wall]; const r = w.rect; const ax = axisOf(r);
  const t0 = ax === 'x' ? r[1] : r[0], t1 = ax === 'x' ? r[3] : r[2];
  const tm = (t0 + t1) / 2;
  const len = o.b - o.a, hgt = o.head - o.sill;
  const ext = w.kind === 'ext';
  // frame plane sits at the outer third of the wall
  const fr = 0.045, fd = 0.06;
  const add = (along0, along1, th0, th1, z0, z1, mat) => {
    const rect = ax === 'x' ? [along0, th0, along1, th1] : [th0, along0, th1, along1];
    const m = planBox(rect, z0, z1, mat); g.add(m); return m;
  };
  if (o.kind === 'jaali') {
    // utility jaali screen (GRC/stone lattice) with stone sill
    add(o.a, o.b, tm - 0.02, tm + 0.02, o.sill, o.head, M.jaaliScreen).castShadow = true;
    add(o.a, o.b, t0 - 0.01, t1 + 0.01, o.sill - 0.03, o.sill, M.whiteStone);
    return g;
  }
  const fz0 = o.sill, fz1 = o.head;
  // outer frame
  add(o.a, o.a + fr, tm - fd / 2, tm + fd / 2, fz0, fz1, M.aluminium);
  add(o.b - fr, o.b, tm - fd / 2, tm + fd / 2, fz0, fz1, M.aluminium);
  add(o.a, o.b, tm - fd / 2, tm + fd / 2, fz0, fz0 + fr, M.aluminium);
  add(o.a, o.b, tm - fd / 2, tm + fd / 2, fz1 - fr, fz1, M.aluminium);
  // mullions
  const nPanes = len > 1.6 ? 3 : len > 0.9 ? 2 : 1;
  for (let i = 1; i < nPanes; i++) { const s = o.a + (len * i) / nPanes; add(s - 0.02, s + 0.02, tm - fd / 2, tm + fd / 2, fz0, fz1, M.aluminium); }
  if (o.kind === 'window' && hgt > 1.2) { const tz = fz1 - 0.45; add(o.a, o.b, tm - fd / 2, tm + fd / 2, tz - 0.02, tz + 0.02, M.aluminium); }
  // glass
  const glass = add(o.a + fr, o.b - fr, tm - 0.004, tm + 0.004, fz0 + fr, fz1 - fr, o.kind === 'vent' ? M.frosted : M.glass);
  glass.castShadow = false; glass.renderOrder = 3;
  // interior stone sill + reveal lining
  const inside = ext ? (ax === 'x' ? (t0 < 6 ? 1 : 1) : 1) : 1; void inside;
  add(o.a - 0.02, o.b + 0.02, t0 - 0.025, t1 + 0.025, o.sill - 0.025, o.sill, M.whiteStone);
  return g;
}

function buildRailing(r, M, colliders) {
  const g = new THREE.Group();
  const [ax0, ay0] = r.a, [bx, by] = r.b;
  const horiz = Math.abs(by - ay0) < 1e-6;
  const len = horiz ? bx - ax0 : by - ay0;
  const rect = horiz ? [ax0, ay0 - 0.012, bx, ay0 + 0.012] : [ax0 - 0.012, ay0, ax0 + 0.012, by];
  const glass = planBox(rect, 0.06, DC.railingHeight - 0.03, M.glassRail); glass.castShadow = false; glass.renderOrder = 3; g.add(glass);
  const capR = horiz ? [ax0, ay0 - 0.022, bx, ay0 + 0.022] : [ax0 - 0.022, ay0, ax0 + 0.022, by];
  g.add(planBox(capR, DC.railingHeight - 0.035, DC.railingHeight, M.charcoalMetal));
  const shoe = horiz ? [ax0, ay0 - 0.035, bx, ay0 + 0.035] : [ax0 - 0.035, ay0, ax0 + 0.035, by];
  g.add(planBox(shoe, -0.02, 0.07, M.charcoalMetal));
  // slab edge band beyond railing
  const edge = horiz ? [ax0 - 0.05, ay0 - 0.09, bx + 0.05, ay0 - 0.035] : [ax0 - 0.09, ay0 - 0.05, ax0 - 0.035, by + 0.05];
  const outward = horiz ? (ay0 < 1 || ay0 > 7.8 && ay0 < 7.9 ? -1 : -1) : 1; void outward;
  g.add(planBox(edge, -0.2, 0.0, M.exterior));
  colliders.push({ rect: horiz ? [ax0, ay0 - 0.04, bx, ay0 + 0.04] : [ax0 - 0.04, ay0, ax0 + 0.04, by], kind: 'railing' });
  void len;
  return g;
}

// ---------------------------------------------------------------------
function buildStair(M, colliders, upper) {
  const g = new THREE.Group(); g.name = 'stair';
  const [sx0, sy0, sx1, sy1] = stair.rect;
  const fw = stair.flightWidth, well = stair.wellWidth;
  const westX = [sx0, sx0 + fw], eastX = [sx1 - fw, sx1];
  const R = stair.riser, T = stair.tread, n = stair.risersPerFlight;
  const yL = sy0 + (n - 1) * T; // landing start
  const treadMat = M.stoneWarm, riserMat = M.whiteStone;
  // a flight: x range, starting y, direction (+1 north / -1 south), starting z, z direction
  const flight = (xr, yStart, ydir, zStart, zdir) => {
    const xm = (xr[0] + xr[1]) / 2;
    for (let i = 0; i < n - 1; i++) {
      const zTop = zStart + zdir * R * (i + 1);
      const ya = yStart + ydir * T * i, yb = ya + ydir * T;
      const yr = [Math.min(ya, yb), Math.max(ya, yb)];
      g.add(planBox([xr[0], yr[0] - 0.02, xr[1], yr[1] + 0.02], zTop - 0.035, zTop, treadMat));
      const rz0 = Math.min(zTop, zTop - zdir * R), rz1 = Math.max(zTop, zTop - zdir * R);
      g.add(planBox([xr[0], ya - 0.01, xr[1], ya + 0.01], rz0, rz1 - (zdir > 0 ? 0.035 : 0), riserMat));
    }
    // waist slab (sloped) under the flight
    const yEnd = yStart + ydir * T * (n - 1), zEnd = zStart + zdir * R * (n - 1);
    const a = new THREE.Vector3(xm, zStart - 0.14, -yStart), b = new THREE.Vector3(xm, zEnd - 0.14, -yEnd);
    const slope = new THREE.Mesh(new THREE.BoxGeometry(xr[1] - xr[0], 0.16, a.distanceTo(b)), M.wall);
    slope.position.copy(a).add(b).multiplyScalar(0.5); slope.lookAt(b);
    slope.castShadow = slope.receiveShadow = true; g.add(slope);
  };
  // UP flight (west) 0 → +1.575 northwards; upper return (east) +1.575 → +3.15 southwards
  flight(westX, sy0, 1, 0, 1);
  flight(eastX, yL, -1, R * n, 1);
  // DN flight (east) 0 → -1.575 northwards; lower return (west) -1.575 → -3.15 southwards
  flight(eastX, sy0, 1, 0, -1);
  flight(westX, yL, -1, -R * n, -1);
  // landings
  g.add(planBox([sx0, yL, sx1, sy1], R * n - 0.16, R * n, treadMat));
  g.add(planBox([sx0, yL, sx1, sy1], -R * n - 0.16, -R * n, treadMat));
  // lower floor & upper floor slab edges
  g.add(planBox([sx0, sy0 - 1.2, sx1, sy0], -2 * R * n - 0.16, -2 * R * n, M.lobby));
  const upperSlab = planBox([sx0, 7.708, sx1, sy0], 2 * R * n - 0.2, 2 * R * n, M.slab); g.add(upperSlab);
  g.add(planBox([sx0, sy0 - 0.2, sx1, sy0], H, 2 * R * n, M.wall)); // beam/bulkhead at shaft edge
  // central well wall (as drawn: double line between the flights) + wall-mounted handrails
  g.add(planBox([sx0 + fw, sy0 + T, sx1 - fw, yL], -2 * R * n, 2 * R * n, M.wall));
  const rail = (x, y0, y1, z0, z1) => {
    const a = new THREE.Vector3(x, z0 + 0.9, -y0), b = new THREE.Vector3(x, z1 + 0.9, -y1);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, a.distanceTo(b), 12), M.walnut);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); m.rotateX(Math.PI / 2);
    g.add(m);
    for (const p of [a, b]) {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 8), M.steel);
      br.position.copy(p); br.position.x += x < (sx0 + sx1) / 2 ? -0.035 : 0.035; br.rotation.z = Math.PI / 2; g.add(br);
    }
  };
  const yA = sy0 + T * 0.5, yB = yL - T * 0.5;
  rail(sx0 + fw - 0.05, yA, yB, R * 0.5, R * (n - 1.5)); // up flight, well side
  rail(sx0 + 0.05, yA, yB, R * 0.5, R * (n - 1.5)); // up flight, wall side
  rail(sx1 - fw + 0.05, yA, yB, -R * 0.5, -R * (n - 1.5)); // dn flight, well side
  rail(sx1 - 0.05, yA, yB, -R * 0.5, -R * (n - 1.5)); // dn flight, wall side
  rail(sx1 - fw + 0.05, yB, yA, R * (n + 0.5), R * (2 * n - 1.5)); // upper return
  // shaft walls above ceiling and below floor
  const shaft = [];
  [[7.9724, sy0, 8.0874, sy1], [10.4496, sy0, 10.5646, sy1], [sx0, 11.7838, sx1, 11.9338]].forEach((r) => {
    shaft.push(planBoxGeo(r, H, 2 * R * n + 3.0), planBoxGeo(r, -2 * R * n - 0.2, -0.02));
  });
  shaft.push(planBoxGeo([sx0, 7.5, sx1, sy0 - 0.2], -2 * R * n - 0.2, -0.17)); // below passage
  const sm = new THREE.Mesh(merge(shaft), M.wall); sm.receiveShadow = true; g.add(sm);
  g.add(planBox([sx0, sy0, sx1, sy1], 2 * R * n + 2.9, 2 * R * n + 3.0, M.ceiling));
  // fire-exit sign on the east wall above the stair entry
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16), M.fireSign);
  sign.position.set(10.4496 - 0.012, 2.35, -(sy0 + 0.25)); sign.rotation.y = -Math.PI / 2; g.add(sign);
  const signBox = planBox([10.4496 - 0.03, sy0 + 0.03, 10.4496 - 0.005, sy0 + 0.47], 2.26, 2.44, M.white); g.add(signBox);
  // the player stays on the floor plate: stair edge barrier
  colliders.push({ rect: [sx0, sy0 + 0.02, sx1, sy1], kind: 'stair' });
  void upper; void upperSlab;
  return g;
}

function buildLift(M) {
  const g = new THREE.Group(); g.name = 'lift';
  const xf = 8.0874; // passage-side face of lift wall
  const y0 = 8.0, y1 = 8.9;
  // stone architrave
  g.add(planBox([xf, y0 - 0.1, xf + 0.03, y0], 0, 2.2, M.stoneWarm));
  g.add(planBox([xf, y1, xf + 0.03, y1 + 0.1], 0, 2.2, M.stoneWarm));
  g.add(planBox([xf, y0 - 0.1, xf + 0.03, y1 + 0.1], 2.1, 2.2, M.stoneWarm));
  // two brushed-steel landing doors (closed, static)
  g.add(planBox([xf - 0.06, y0, xf - 0.035, (y0 + y1) / 2 - 0.003], 0, 2.1, M.steel));
  g.add(planBox([xf - 0.06, (y0 + y1) / 2 + 0.003, xf - 0.035, y1], 0, 2.1, M.steel));
  g.add(planBox([xf - 0.115, y0, xf - 0.06, y1], 0, 2.1, M.black)); // car door behind
  // call panel + indicator
  g.add(planBox([xf, y1 + 0.2, xf + 0.012, y1 + 0.3], 1.0, 1.25, M.steel));
  const btn = new THREE.Mesh(new THREE.CircleGeometry(0.014, 20), M.ledNeutral);
  btn.position.set(xf + 0.014, 1.15, -(y1 + 0.25)); btn.rotation.y = Math.PI / 2; g.add(btn);
  const btn2 = btn.clone(); btn2.position.y = 1.1; g.add(btn2);
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.07), M.liftDisplay);
  disp.position.set(xf + 0.032, 2.15, -(y0 + y1) / 2); disp.rotation.y = Math.PI / 2; g.add(disp);
  return g;
}

function buildDuctLouvre(M) {
  const g = new THREE.Group(); g.name = 'ductLouvre';
  const o = openings.find((q) => q.id === 'o_duct_louvre');
  const xm = 8.03;
  g.add(planBox([xm - 0.03, o.a, xm + 0.03, o.a + 0.04], o.sill, o.head, M.louvre));
  g.add(planBox([xm - 0.03, o.b - 0.04, xm + 0.03, o.b], o.sill, o.head, M.louvre));
  g.add(planBox([xm - 0.03, o.a, xm + 0.03, o.b], o.sill, o.sill + 0.04, M.louvre));
  g.add(planBox([xm - 0.03, o.a, xm + 0.03, o.b], o.head - 0.04, o.head, M.louvre));
  for (let z = o.sill + 0.08; z < o.head - 0.05; z += 0.07) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.06, o.b - o.a - 0.08), M.louvre);
    s.position.set(xm, z, -(o.a + o.b) / 2); s.rotation.z = 0.6; g.add(s);
  }
  g.add(planBox([xm - 0.05, o.a + 0.04, xm - 0.04, o.b - 0.04], o.sill + 0.04, o.head - 0.04, M.black));
  return g;
}

// ---------------------------------------------------------------------
// Exterior context: the tower below, neighbouring blocks, ground, trees.
function buildContext(M, ctxDensity = 1) {
  const g = new THREE.Group(); g.name = 'context';
  const levels = 4, ftf = DC.floorToFloor;
  const base = -levels * ftf;
  // building mass below this apartment (same footprint), with recessed window bands
  const mass = [];
  [[-0.15, 1.143, 3.3528, 11.9338], [3.3528, -0.15, 10.0828, 7.708], [9.9328, 6.4784, 13.1942, 11.9338], [13.1, 7.8738, 13.7626, 11.9338], [3.3528, 7.5, 10.6, 11.9338]].forEach((r) => mass.push(planBoxGeo(r, base + ftf, -0.17)));
  const massMesh = new THREE.Mesh(merge(mass), M.exterior); massMesh.receiveShadow = true; g.add(massMesh);
  // balcony slabs of lower floors
  for (let L = 1; L < levels; L++) {
    const z = -L * ftf;
    [[-0.1, -0.1, 3.36, 1.143], [10.0, 3.75, 11.7, 6.48], [13.7, 7.82, 14.8, 11.8]].forEach((r) => g.add(planBox(r, z - 0.15, z, M.exterior)));
    // dark glazing bands
    [[-0.17, 1.6, -0.15, 3.9], [-0.17, 9.2, -0.15, 11.0], [6.9, -0.17, 8.5, -0.15], [10.9, 11.934, 13.3, 11.95]].forEach((r) => g.add(planBox(r, z + 0.9, z + 2.1, M.blackGlass)));
  }
  // parapet / roof edge above (suggest upper floors continue)
  [[-0.15, 1.143, 3.3528, 11.9338], [3.3528, -0.15, 10.0828, 7.708], [9.9328, 6.4784, 13.1942, 11.9338], [13.1, 7.8738, 13.7626, 11.9338], [3.3528, 7.5, 10.6, 11.9338]]
    .forEach((r) => { const m = planBox(r, H + 0.04, ftf + 0.05, M.exterior); g.add(m); });
  // ground floor on stilts (parking) with the lift/stair core, as on site
  const cols = [];
  for (const [x, y] of [[0, 1.3], [0, 5.3], [0, 8.1], [0, 11.8], [3.4, 0], [3.4, 4.0], [3.4, 7.6], [3.4, 11.8], [6.5, 0], [6.5, 4.0], [9.9, 0], [9.9, 3.8], [9.9, 6.5], [10.6, 11.8], [13.1, 6.5], [13.6, 8.0], [13.6, 11.8], [6.4, 11.8]])
    cols.push(planBoxGeo([x - 0.2, y - 0.2, x + 0.2, y + 0.2], base, base + ftf));
  cols.push(planBoxGeo([6.45, 7.71, 10.45, 11.78], base, base + ftf)); // lift + stair core
  g.add(new THREE.Mesh(merge(cols), M.exterior));
  // dusty open ground, a concrete apron under the building
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), M.ground);
  ground.rotation.x = -Math.PI / 2; ground.position.set(7, base, -6); ground.receiveShadow = true; g.add(ground);
  g.add(planBox([-1.2, -1.2, 15.2, 13], base, base + 0.04, M.paving));
  // the neighbourhood (low-rise Dhule streets) — see context.js
  g.add(buildSurroundings(M, base, { density: ctxDensity }));
  // low distant horizon (the town is low-rise)
  const skyRing = new THREE.Mesh(new THREE.CylinderGeometry(260, 260, 16, 64, 1, true), M.skyline);
  skyRing.position.set(7, base + 8, -6); skyRing.userData.dynamic = true; g.add(skyRing);
  return g;
}

export { C, B, P, worldUV };
