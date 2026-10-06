// Operable doors: hinged, double-hinged (jaali), single sliders, bypass sliders, bi-parting sliders.
// Every door owns its frame/track geometry, an animated state and a collision footprint.
import * as THREE from 'three';
import { doors, openings } from '../data/floorplan.ts';
import { wallById, axisOf } from './building.js';
import { boxGeo, rboxGeo } from '../utils/geom.js';

const LEAF_T = 0.042;

function leafMesh(type, w, h, M, opts = {}) {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const t = opts.thick || LEAF_T;
  if (type === 'solid-walnut') {
    add(boxGeo(w, h, t), M.walnutV, 0, h / 2, 0);
    // routed horizontal grooves
    for (let k = 1; k < 5; k++) add(boxGeo(w - 0.16, 0.006, t + 0.002), M.cabCharcoal, 0, (h * k) / 5, 0);
    // tall brass pull both faces
    const px = opts.handleX ?? (w / 2 - 0.12);
    for (const s of [1, -1]) {
      add(boxGeo(0.024, 0.9, 0.024), M.brass, px, 1.05, s * (t / 2 + 0.045));
      add(boxGeo(0.02, 0.02, 0.05), M.brass, px, 0.65, s * (t / 2 + 0.022));
      add(boxGeo(0.02, 0.02, 0.05), M.brass, px, 1.45, s * (t / 2 + 0.022));
    }
    if (opts.lock) add(boxGeo(0.05, 0.14, t + 0.01), M.brassDark, px, 1.0 - 0.25, 0);
  } else if (type === 'oak-panel' || type === 'taupe-panel') {
    const mat = type === 'oak-panel' ? M.oakV : M.cabTaupe;
    add(boxGeo(w, h, t), mat, 0, h / 2, 0);
    // recessed vertical handle groove
    const hx = opts.handleX ?? (w / 2 - 0.07);
    add(boxGeo(0.022, 0.6, t + 0.004), M.cabCharcoal, hx, 1.05, 0);
    if (type === 'taupe-panel') { add(boxGeo(w, 0.02, t + 0.004), M.charcoalMetal, 0, h - 0.01, 0); add(boxGeo(0.02, h, t + 0.004), M.charcoalMetal, -w / 2 + 0.01, h / 2, 0); add(boxGeo(0.02, h, t + 0.004), M.charcoalMetal, w / 2 - 0.01, h / 2, 0); }
  } else if (type === 'fluted-glass' || type === 'clear-glass') {
    const fr = type === 'clear-glass' ? 0.05 : 0.032;
    const frameMat = type === 'clear-glass' ? M.aluminium : M.charcoalMetal;
    add(boxGeo(fr, h, t), frameMat, -w / 2 + fr / 2, h / 2, 0);
    add(boxGeo(fr, h, t), frameMat, w / 2 - fr / 2, h / 2, 0);
    add(boxGeo(w, fr, t), frameMat, 0, fr / 2, 0);
    add(boxGeo(w, fr, t), frameMat, 0, h - fr / 2, 0);
    if (type === 'fluted-glass') add(boxGeo(w, 0.03, t), frameMat, 0, 1.05, 0);
    const gl = add(boxGeo(w - fr * 2, h - fr * 2, 0.008), type === 'clear-glass' ? M.glass : M.frosted, 0, h / 2, 0);
    gl.castShadow = false; gl.renderOrder = 3;
    if (type === 'fluted-glass') add(boxGeo(0.018, 0.5, 0.05), M.brass, (opts.handleX ?? (w / 2 - 0.07)), 1.05, 0);
    else add(boxGeo(0.02, 0.35, 0.05), M.charcoalMetal, (opts.handleX ?? (w / 2 - 0.08)), 1.05, 0);
  } else if (type === 'jaali') {
    const fr = 0.05;
    add(boxGeo(fr, h, t), M.oakV, -w / 2 + fr / 2, h / 2, 0);
    add(boxGeo(fr, h, t), M.oakV, w / 2 - fr / 2, h / 2, 0);
    add(boxGeo(w, fr, t), M.oakV, 0, fr / 2, 0);
    add(boxGeo(w, fr, t), M.oakV, 0, h - fr / 2, 0);
    add(boxGeo(w, 0.06, t), M.oakV, 0, 0.75, 0);
    add(boxGeo(w - fr * 2, 0.7 - fr, 0.02), M.oakV, 0, 0.4, 0);
    const jl = add(boxGeo(w - fr * 2, h - 0.8 - fr, 0.012), M.jaaliWood, 0, 0.78 + (h - 0.8 - fr) / 2, 0); jl.castShadow = true;
    add(new THREE.SphereGeometry(0.022, 16, 12), M.brass, (opts.handleX ?? (w / 2 - 0.08)), 1.0, t / 2 + 0.02);
  }
  return g;
}

/** Build all doors. Returns { group, list } where list items expose toggle/update/collider. */
export function buildDoors(M) {
  const group = new THREE.Group(); group.name = 'doors';
  const list = [];
  for (const d of doors) {
    const o = openings.find((q) => q.id === d.opening);
    const w = wallById[o.wall]; const r = w.rect; const ax = axisOf(r);
    const t0 = ax === 'x' ? r[1] : r[0], t1 = ax === 'x' ? r[3] : r[2];
    const len = o.b - o.a, H = o.head;
    // Local frame: u = along wall axis, v = across wall (plan), group positioned at opening start, wall mid-plane
    const root = new THREE.Group();
    const along = ax === 'x' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, -1); // +u
    const across = ax === 'x' ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(1, 0, 0); // +v (plan +y or +x)
    const zAx = new THREE.Vector3().crossVectors(along, new THREE.Vector3(0, 1, 0));
    const basis = new THREE.Matrix4().makeBasis(along, new THREE.Vector3(0, 1, 0), zAx);
    const vs = ax === 'x' ? -1 : 1; void across; // local z = vs * plan-thickness offset
    root.quaternion.setFromRotationMatrix(basis);
    const tm = (t0 + t1) / 2, th = t1 - t0;
    root.position.copy(ax === 'x' ? new THREE.Vector3(o.a, 0, -tm) : new THREE.Vector3(tm, 0, -o.a));
    group.add(root);
    const sideV = d.side * th / 2; // face plane (v) on the door side

    const add = (geo, mat, u, y, v) => { const m = new THREE.Mesh(geo, mat); m.position.set(u, y, vs * v); m.castShadow = true; m.receiveShadow = true; root.add(m); return m; };
    // jamb linings / architrave (all doors)
    const frameMat = d.leaf === 'solid-walnut' ? M.walnutV : d.leaf === 'jaali' ? M.oakV : (d.leaf === 'clear-glass' ? M.aluminium : M.cabCharcoal);
    const fw = 0.012;
    if (d.type !== 'slide-bypass') {
      add(boxGeo(fw, H, th + 0.004), frameMat, fw / 2, H / 2, 0);
      add(boxGeo(fw, H, th + 0.004), frameMat, len - fw / 2, H / 2, 0);
      add(boxGeo(len, fw, th + 0.004), frameMat, len / 2, H - fw / 2, 0);
    }

    const state = { open: !!d.startOpen, t: d.startOpen ? 1 : 0, target: d.startOpen ? 1 : 0 };
    const parts = [];
    let footprint; // function(t) -> plan rects that block
    const toPlan = (u0, v0, u1, v1) => {
      // local (u along, v across from mid-plane) → plan rect
      const ua = o.a + Math.min(u0, u1), ub = o.a + Math.max(u0, u1);
      const va = tm + Math.min(v0, v1), vb = tm + Math.max(v0, v1);
      return ax === 'x' ? [ua, va, ub, vb] : [va, ua, vb, ub];
    };

    if (d.type === 'hinged') {
      const hingeU = d.hingeAt === 'a' ? fw : len - fw;
      const lw = len - fw * 2 - 0.004;
      const pivot = new THREE.Group(); pivot.position.set(hingeU, 0, vs * (sideV - d.side * (LEAF_T / 2 + 0.005))); root.add(pivot);
      const leaf = leafMesh(d.leaf, lw, H - fw - 0.006, M, { handleX: d.hingeAt === 'a' ? lw / 2 - 0.1 : -lw / 2 + 0.1, lock: d.id === 'd_main' });
      leaf.position.set(d.hingeAt === 'a' ? lw / 2 : -lw / 2, 0.003, 0);
      pivot.add(leaf);
      // hinges
      for (const y of [0.25, 1.05, 1.85]) { const hg = new THREE.Mesh(boxGeo(0.012, 0.1, 0.012), M.brassDark); hg.position.set(0, y, vs * d.side * 0.006); pivot.add(hg); }
      const sgn = (d.hingeAt === 'a' ? -1 : 1) * d.side * vs; // rotation sign to swing toward side
      parts.push((t) => { pivot.rotation.y = sgn * t * (Math.PI / 2) * 0.97; });
      footprint = (t) => {
        if (t < 0.15) return [toPlan(0, -th / 2, len, th / 2)];
        if (t > 0.9) { // leaf lies perpendicular on the swing side
          const u = hingeU; const v0 = sideV, v1 = sideV + d.side * lw;
          return [toPlan(u - 0.03, v0, u + 0.03, v1)];
        }
        return [toPlan(0, -th / 2, len, th / 2)];
      };
    } else if (d.type === 'double-hinged') {
      const lw = (len - fw * 2) / 2 - 0.004;
      const mk = (hingeU, dir) => {
        const pivot = new THREE.Group(); pivot.position.set(hingeU, 0, vs * (sideV - d.side * (LEAF_T / 2 + 0.005))); root.add(pivot);
        const leaf = leafMesh(d.leaf, lw, H - fw - 0.006, M, { handleX: dir > 0 ? lw / 2 - 0.08 : -lw / 2 + 0.08, lock: d.id === 'd_main' && dir > 0 });
        leaf.position.set(dir * lw / 2, 0.003, 0); pivot.add(leaf);
        const sgn = (dir > 0 ? -1 : 1) * d.side * vs;
        parts.push((t) => { pivot.rotation.y = sgn * t * (Math.PI / 2) * 0.95; });
      };
      mk(fw, 1); mk(len - fw, -1);
      footprint = (t) => (t < 0.9 ? [toPlan(0, -th / 2, len, th / 2)] : [toPlan(0, sideV, 0.05, sideV + d.side * lw), toPlan(len - 0.05, sideV, len, sideV + d.side * lw)]);
    } else if (d.type === 'slide1') {
      const lw = len + 0.06;
      const v = sideV + d.side * (d.track ?? 0.03);
      const leaf = leafMesh(d.leaf, lw, H + 0.02, M, { handleX: d.park > 0 ? -lw / 2 + 0.07 : lw / 2 - 0.07, thick: 0.038 });
      const holder = new THREE.Group(); holder.position.set(len / 2, 0.006, vs * v); root.add(holder); holder.add(leaf);
      // surface-mounted top track (visible), spanning closed + parked positions
      const trackLen = lw * 2 + 0.04;
      const trackU = d.park > 0 ? len / 2 + lw / 2 : len / 2 - lw / 2;
      add(boxGeo(trackLen, 0.05, 0.05), M.charcoalMetal, trackU, H + 0.05, v);
      add(boxGeo(trackLen, 0.012, 0.012), M.brassDark, trackU, H + 0.02, v + d.side * 0.02);
      // floor guide
      add(boxGeo(0.03, 0.02, 0.03), M.charcoalMetal, d.park > 0 ? len + 0.02 : -0.02, 0.01, v - d.side * 0.035);
      parts.push((t) => { holder.position.x = len / 2 + d.park * t * lw; });
      footprint = (t) => {
        const off = d.park * t * lw;
        const rects = [toPlan(len / 2 + off - lw / 2, v - 0.025, len / 2 + off + lw / 2, v + 0.025)];
        if (t < 0.85) rects.push(toPlan(0, -th / 2, len, th / 2));
        return rects;
      };
    } else if (d.type === 'slide-bypass') {
      const lw = len / 2 + 0.03;
      const vA = -0.03, vB = 0.03; // two tracks inside the wall thickness
      // fixed outer frame
      add(boxGeo(0.05, H, th), M.aluminium, 0.025, H / 2, 0);
      add(boxGeo(0.05, H, th), M.aluminium, len - 0.025, H / 2, 0);
      add(boxGeo(len, 0.06, th), M.aluminium, len / 2, H - 0.03, 0);
      add(boxGeo(len, 0.02, th), M.aluminium, len / 2, 0.01, 0);
      const A = leafMesh('clear-glass', lw, H - 0.08, M, { handleX: lw / 2 - 0.08, thick: 0.035 });
      A.position.set(lw / 2, 0.02, vs * vA); root.add(A);
      const Bl = leafMesh('clear-glass', lw, H - 0.08, M, { handleX: -lw / 2 + 0.08, thick: 0.035 });
      Bl.position.set(len - lw / 2, 0.02, vs * vB); root.add(Bl);
      parts.push((t) => { Bl.position.x = len - lw / 2 - t * (len - lw - 0.05); });
      footprint = (t) => (t < 0.85 ? [toPlan(0, -th / 2, len, th / 2)] : [toPlan(0, -th / 2, lw + 0.05, th / 2)]);
    } else if (d.type === 'slide-biparting') {
      const lw = len / 2 + 0.03;
      const v = sideV + d.side * (d.track ?? 0.03);
      const L = leafMesh(d.leaf, lw, H + 0.02, M, { handleX: lw / 2 - 0.06, thick: 0.038 });
      const R = leafMesh(d.leaf, lw, H + 0.02, M, { handleX: -lw / 2 + 0.06, thick: 0.038 });
      L.position.set(lw / 2 - 0.03, 0.006, vs * v); R.position.set(len - lw / 2 + 0.03, 0.006, vs * v);
      root.add(L); root.add(R);
      add(boxGeo(len + lw * 2, 0.05, 0.05), M.charcoalMetal, len / 2, H + 0.05, v);
      parts.push((t) => { L.position.x = lw / 2 - 0.03 - t * lw; R.position.x = len - lw / 2 + 0.03 + t * lw; });
      footprint = (t) => (t < 0.85 ? [toPlan(0, -th / 2, len, th / 2)] : [toPlan(-lw, v - 0.025, 0, v + 0.025), toPlan(len, v - 0.025, len + lw, v + 0.025)]);
    }

    const center = ax === 'x' ? new THREE.Vector3((o.a + o.b) / 2, 1.0, -tm) : new THREE.Vector3(tm, 1.0, -(o.a + o.b) / 2);
    const item = {
      id: d.id, label: d.label, spec: d, opening: o, center, state, root,
      toggle() { state.target = state.target > 0.5 ? 0 : 1; },
      update(dt) {
        const speed = d.type.startsWith('slide') ? 1.4 : 1.1;
        if (state.t !== state.target) {
          const dir = Math.sign(state.target - state.t);
          state.t = THREE.MathUtils.clamp(state.t + dir * dt * speed, 0, 1);
          if ((dir > 0 && state.t >= state.target) || (dir < 0 && state.t <= state.target)) state.t = state.target;
        }
        const e = state.t < 0.5 ? 2 * state.t * state.t : 1 - Math.pow(-2 * state.t + 2, 2) / 2;
        parts.forEach((p) => p(e));
      },
      colliders() { return footprint(state.t).map((rect) => ({ rect, kind: 'door', id: d.id })); },
    };
    item.update(0);
    list.push(item);
  }
  void rboxGeo;
  return { group, list };
}
