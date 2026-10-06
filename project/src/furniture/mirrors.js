// Real planar reflections for the house mirrors (vanity, dressing and entry mirrors).
// Each mirror only renders while the viewer is inside its room, so the cost stays local.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { rooms } from '../data/floorplan.ts';

const ROOM_ALIAS = { entry: ['deoghar', 'foyer'], chrm: ['chrm'], mtoilet: ['mtoilet'], ctoilet: ['ctoilet'], chtoilet: ['chtoilet'] };

export function buildMirrors(M, registry, renderer, size = 256) {
  const list = [];
  let enabled = size > 0; size = size || 256;
  const pr = Math.min(1.5, renderer.getPixelRatio());
  for (const it of registry) {
    it.obj.traverse((o) => {
      if (!o.isMesh || o.material !== M.mirror) return;
      const geo = o.geometry; geo.computeBoundingBox();
      const bb = geo.boundingBox;
      let rg, offZ;
      if (Math.abs(o.rotation.x) > 0.1) { // round mirror (cylinder turned to face +Z)
        const r = (bb.max.x - bb.min.x) / 2;
        rg = new THREE.CircleGeometry(r - 0.004, 48);
        offZ = o.position.z + (bb.max.y - bb.min.y) / 2 + 0.0015;
      } else {
        const w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
        rg = new THREE.PlaneGeometry(w - 0.03, h - 0.03);
        offZ = o.position.z + bb.max.z + 0.0015;
      }
      const sz = size;
      const ref = new Reflector(rg, { textureWidth: sz * pr, textureHeight: sz * pr, color: 0xb9bdbd, clipBias: 0.003 });
      ref.position.set(o.position.x, o.position.y, offZ);
      ref.userData.dynamic = true; ref.visible = false;
      o.parent.add(ref);
      const ids = ROOM_ALIAS[it.room] || [it.room];
      const rects = rooms.filter((r) => ids.includes(r.id)).map((r) => r.rect);
      list.push({ ref, rects, room: it.room });
    });
  }
  const tmp = new THREE.Vector3();
  return {
    list,
    /** Live quality: 0 disables planar reflections (mirrors fall back to the room probe), else resizes them. */
    configure(n) {
      enabled = n > 0;
      if (enabled) for (const m of list) { const rt = m.ref.getRenderTarget(); const s = Math.round(n * pr); if (rt.width !== s) rt.setSize(s, s); }
    },
    update(camera, active) {
      for (const m of list) {
        let on = false;
        if (active && enabled) {
          const x = camera.position.x, y = -camera.position.z;
          on = m.rects.some((r) => x > r[0] - 0.4 && x < r[2] + 0.4 && y > r[1] - 0.4 && y < r[3] + 0.4);
          if (on) { m.ref.getWorldPosition(tmp); on = tmp.distanceTo(camera.position) < 6; }
        }
        m.ref.visible = on;
      }
    },
  };
}
