// Geometry helpers. Plan coords: (x east, y north) metres. World: X = x, Z = -y, Y up.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const P = (x, y, h = 0) => new THREE.Vector3(x, h, -y);

const geoCache = new Map();
const key = (...a) => a.map((v) => (typeof v === 'number' ? v.toFixed(4) : String(v))).join('|');

/** Rewrite BoxGeometry UVs so every face is mapped in metres (u,v = world size). */
export function metricBoxUV(geo, w, h, d) {
  const uv = geo.attributes.uv;
  // face order: +x, -x, +y, -y, +z, -z ; 4 verts each
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i;
      uv.setXY(idx, uv.getX(idx) * dims[f][0], uv.getY(idx) * dims[f][1]);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

export function boxGeo(w, h, d) {
  const k = key('box', w, h, d);
  if (!geoCache.has(k)) geoCache.set(k, metricBoxUV(new THREE.BoxGeometry(w, h, d), w, h, d));
  return geoCache.get(k);
}

export function rboxGeo(w, h, d, r = 0.02, seg = 3) {
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const k = key('rbox', w, h, d, r, seg);
  if (!geoCache.has(k)) {
    const g = new RoundedBoxGeometry(w, h, d, seg, r);
    // scale uv to metres approximately (RoundedBox uv is 0..1 per face)
    const uv = g.attributes.uv; const n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
      let su = w, sv = h;
      if (nx > 0.5) { su = d; sv = h; } else if (ny > 0.5) { su = w; sv = d; }
      uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    }
    geoCache.set(k, g);
  }
  return geoCache.get(k);
}

export function cylGeo(rt, rb, h, seg = 24, open = false) {
  const k = key('cyl', rt, rb, h, seg, open);
  if (!geoCache.has(k)) geoCache.set(k, new THREE.CylinderGeometry(rt, rb, h, seg, 1, open));
  return geoCache.get(k);
}

export function mesh(geo, mat, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  return m;
}

/** box in LOCAL coordinates: centre (x,y,z), size (w,h,d) */
export function B(parent, w, h, d, mat, x, y, z, opts) {
  const m = mesh(boxGeo(w, h, d), mat, x, y, z, opts);
  parent.add(m);
  return m;
}
export function RB(parent, w, h, d, r, mat, x, y, z, opts) {
  const m = mesh(rboxGeo(w, h, d, r), mat, x, y, z, opts);
  parent.add(m);
  return m;
}
export function C(parent, rt, rb, h, mat, x, y, z, seg = 24, opts) {
  const m = mesh(cylGeo(rt, rb, h, seg), mat, x, y, z, opts);
  parent.add(m);
  return m;
}

/** Plan-space box: rect [x0,y0,x1,y1], vertical span z0..z1 → world mesh */
export function planBox(rect, z0, z1, mat, opts = {}) {
  const [x0, y0, x1, y1] = rect;
  const w = x1 - x0, d = y1 - y0, h = z1 - z0;
  const g = metricBoxUV(new THREE.BoxGeometry(w, h, d), w, h, d);
  const m = new THREE.Mesh(g, mat);
  m.position.set((x0 + x1) / 2, (z0 + z1) / 2, -(y0 + y1) / 2);
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  return m;
}

/** Plan-space box geometry already translated to world position (for merging). */
export function planBoxGeo(rect, z0, z1) {
  const [x0, y0, x1, y1] = rect;
  const w = x1 - x0, d = y1 - y0, h = z1 - z0;
  const g = metricBoxUV(new THREE.BoxGeometry(w, h, d), w, h, d);
  // shift UVs by world position so adjacent pieces share a continuous texture
  g.translate((x0 + x1) / 2, (z0 + z1) / 2, -(y0 + y1) / 2);
  worldUV(g);
  return g;
}

/** Re-project UVs from world position along each face normal (tri-planar by face). */
export function worldUV(g) {
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
    if (ny > 0.5) uv.setXY(i, x, -z);
    else if (nx > 0.5) uv.setXY(i, -z, y);
    else uv.setXY(i, x, y);
  }
  uv.needsUpdate = true;
  return g;
}

export function merge(geos) {
  const ok = geos.filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  ok.forEach((g) => { if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); });
  return mergeGeometries(ok, false);
}

/** Facing helpers: front of local object = +Z. */
export const FACING = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 };

/** Place a local group at plan (x,y) at floor height h, front facing dir */
export function place(obj, x, y, facing = 'S', h = 0) {
  obj.position.set(x, h, -y);
  obj.rotation.y = typeof facing === 'number' ? facing : FACING[facing];
  return obj;
}

export function lathe(points, mat, seg = 32) {
  const g = new THREE.LatheGeometry(points.map((p) => new THREE.Vector2(p[0], p[1])), seg);
  return new THREE.Mesh(g, mat);
}

/** Rounded-rectangle Shape (for extruded tops etc.) centred on origin */
export function roundRectShape(w, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  r = Math.min(r, w / 2, d / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export function ellipseShape(w, d, seg = 64) {
  const s = new THREE.Shape();
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const px = (Math.cos(a) * w) / 2, py = (Math.sin(a) * d) / 2;
    if (i === 0) s.moveTo(px, py); else s.lineTo(px, py);
  }
  return s;
}

/** Super-ellipse (soft oval) shape — sculpted dining tops etc. */
export function superEllipseShape(w, d, n = 3.2, seg = 96) {
  const s = new THREE.Shape();
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const c = Math.cos(a), sn = Math.sin(a);
    const px = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * w / 2;
    const py = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n) * d / 2;
    if (i === 0) s.moveTo(px, py); else s.lineTo(px, py);
  }
  return s;
}

/** Horizontal extruded slab from a shape: thickness t, top at y=0 → returns mesh with top at local y = t */
export function slab(shape, t, mat, bevel = 0.006) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: t - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 48 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  // metric planar UVs (top view)
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), -pos.getZ(i) + pos.getY(i) * 0.3);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export const rectW = (r) => r[2] - r[0];
export const rectD = (r) => r[3] - r[1];
export const rectCx = (r) => (r[0] + r[2]) / 2;
export const rectCy = (r) => (r[1] + r[3]) / 2;
