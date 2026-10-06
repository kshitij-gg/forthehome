// Static-geometry merging (per material) + derived data (colliders, overview caps).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEEP = ['position', 'normal', 'uv'];

function prep(geo, matrix) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes)) if (!KEEP.includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.applyMatrix4(matrix);
  g.clearGroups();
  return g;
}

/** Merge every static mesh under `root` into one mesh per (material, shadow flags, renderOrder). */
export function mergeStatic(root, { skip = () => false } = {}) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const remove = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.dynamic || skip(p)) return;
    const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}|${o.renderOrder}`;
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, order: o.renderOrder, geos: [], userData: o.userData });
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    buckets.get(key).geos.push(prep(o.geometry, m));
    remove.push(o);
  });
  for (const o of remove) o.parent.remove(o);
  // drop now-empty groups
  const merged = new THREE.Group(); merged.name = root.name + '_merged';
  let tris = 0;
  for (const b of buckets.values()) {
    const geo = mergeGeometries(b.geos, false);
    if (!geo) continue;
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, b.mat);
    m.castShadow = b.cast; m.receiveShadow = b.recv; m.renderOrder = b.order;
    merged.add(m);
    tris += geo.attributes.position.count / 3;
  }
  root.add(merged);
  return { meshes: merged.children.length, tris };
}

/** Plan-space colliders + overview caps from furniture registry (call BEFORE merging). */
export function deriveFromFurniture(registry, capMat, clipH) {
  const colliders = [], caps = [];
  const box = new THREE.Box3();
  for (const it of registry) {
    const o = it.obj;
    o.updateMatrixWorld(true);
    if (o.userData.collide || o.userData.cap) {
      box.makeEmpty();
      o.traverse((c) => { if (c.isMesh && !c.userData.overlay && !c.userData.noCollide && c.material !== undefined && !(c.material.transparent && c.material.opacity < 0.5 && c.material.depthWrite === false)) box.expandByObject(c); });
      if (box.isEmpty()) continue;
      if (o.userData.colliderParts) {
        const pb = new THREE.Box3();
        o.traverse((c) => { if (!c.isMesh || c.userData.overlay) return; pb.setFromObject(c); if (pb.min.y < 1.0 && (pb.max.x - pb.min.x) > 0.08 && (pb.max.z - pb.min.z) > 0.08) colliders.push({ rect: [pb.min.x, -pb.max.z, pb.max.x, -pb.min.z], kind: 'furniture', id: it.name, room: it.room }); });
      }
      const rect = [box.min.x + 0.02, -box.max.z + 0.02, box.max.x - 0.02, -box.min.z - 0.02];
      if (o.userData.collide && !o.userData.colliderParts && box.min.y < 1.0) colliders.push({ rect, kind: 'furniture', id: it.name, room: it.room });
      if (o.userData.cap && box.max.y > clipH) {
        const g = new THREE.Mesh(new THREE.PlaneGeometry(rect[2] - rect[0] + 0.04, rect[3] - rect[1] + 0.04), capMat);
        g.rotation.x = -Math.PI / 2; g.position.set((rect[0] + rect[2]) / 2, clipH - 0.006, -(rect[1] + rect[3]) / 2);
        caps.push(g);
      }
    }
  }
  return { colliders, caps };
}
