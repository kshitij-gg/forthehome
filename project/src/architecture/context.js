// Neighbourhood around the site (Dhule, Maharashtra), modelled on the street view of the real plot:
// low-rise 1–4 storey RCC houses with flat roofs and parapets, plinth bands, window chajjas, the odd
// balcony, black rooftop water tanks, stair headrooms and tin shades; a few houses still a bare
// concrete frame with brick infill; dusty lanes, electric poles with sagging wires, date palms and
// neem trees; the plot itself behind corrugated tin sheeting.
//
// Built for the web: every house is merged into a handful of meshes (vertex-coloured walls, one
// window material that lights up at night, one dark glass, metal, tanks) — a few draw calls in all,
// no extra textures to download, nothing animated, no shadows cast outside the site.
import * as THREE from 'three';
import { planBoxGeo, merge } from '../utils/geom.js';

const PALETTE = ['#e7b3bd', '#9cc7bc', '#f1cfcf', '#e9dcc3', '#f1e7d6', '#e7cfc0', '#d6e0e2', '#e6d3a4', '#d9dccc', '#cbc6bf', '#efe7df', '#e8c9a6', '#dcd2e3', '#c9d7c6', '#f0dcb8'];
const CONCRETE = '#a9a49c', BRICK = '#a45d40', PLINTH = '#857669';

export function buildSurroundings(M, base, { density = 1 } = {}) {
  const g = new THREE.Group(); g.name = 'surroundings';
  let seed = 20251106; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = (a) => a[Math.floor(r() * a.length)];
  const walls = [], lit = [], dark = [], metal = [], tanks = [], wood = [], lawn = [];
  const col = (h) => new THREE.Color(h);

  // vertex colour with a little ground grime and per-box tone drift
  const tint = (geo, c, grime = true) => {
    const p = geo.attributes.position, a = new Float32Array(p.count * 3), d = 0.94 + r() * 0.1;
    for (let i = 0; i < p.count; i++) {
      const k = grime ? (0.74 + 0.26 * Math.min(1, Math.max(0, (p.getY(i) - base) / 1.6))) * d : d;
      a[i * 3] = c.r * k; a[i * 3 + 1] = c.g * k; a[i * 3 + 2] = c.b * k;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return geo;
  };
  const wall = (rect, z0, z1, c, grime = true) => walls.push(tint(planBoxGeo(rect, base + z0, base + z1), c, grime));
  const into = (list, rect, z0, z1) => list.push(planBoxGeo(rect, base + z0, base + z1));
  const tankGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.1, 10);

  // ---------------- one house ----------------
  function house(x0, y0, w, d, floors, face, under) {
    const FH = 3.1, H = floors * FH, x1 = x0 + w, y1 = y0 + d;
    const c = col(under ? CONCRETE : pick(PALETTE));
    if (under) {
      // bare RCC frame: slabs, a 3×3 column grid, brick infill on the lower floors
      for (let f = 1; f <= floors; f++) wall([x0, y0, x1, y1], f * FH - 0.15, f * FH, c);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        const cx = x0 + 0.2 + (w - 0.4) * i / 2, cy = y0 + 0.2 + (d - 0.4) * j / 2;
        wall([cx - 0.15, cy - 0.15, cx + 0.15, cy + 0.15], 0, H + (r() < 0.5 ? 0.9 : 0), c);
      }
      const brick = col(BRICK);
      for (let f = 1; f < Math.min(floors, 3); f++) {
        const z = f * FH;
        if (r() < 0.8) wall([x0 + 0.3, y0, x0 + w * (0.4 + r() * 0.5), y0 + 0.2], z, z + (r() < 0.5 ? 1.0 : FH - 0.15), brick, false);
        if (r() < 0.6) wall([x0, y0 + 0.3, x0 + 0.2, y1 - 0.3], z, z + FH - 0.15, brick, false);
      }
      return;
    }
    const greyTop = floors >= 2 && r() < 0.25; // upper floor still unplastered/unpainted, as on the street
    wall([x0, y0, x1, y1], 0, greyTop ? H - FH : H, c);
    if (greyTop) wall([x0, y0, x1, y1], H - FH, H, col(CONCRETE));
    wall([x0 - 0.06, y0 - 0.06, x1 + 0.06, y1 + 0.06], 0, 0.45, col(PLINTH), false); // plinth band
    // parapet
    const pc = c.clone().multiplyScalar(0.96), pt = 0.15, ph = H + 0.95;
    wall([x0, y0, x1, y0 + pt], H, ph, pc); wall([x0, y1 - pt, x1, y1], H, ph, pc);
    wall([x0, y0, x0 + pt, y1], H, ph, pc); wall([x1 - pt, y0, x1, y1], H, ph, pc);
    // facades: windows + chajjas (front and back), smaller windows on the sides
    const sides = [
      { n: 'S', a0: x0, a1: x1, at: y0, out: -1, major: true }, { n: 'N', a0: x0, a1: x1, at: y1, out: 1, major: true },
      { n: 'W', a0: y0, a1: y1, at: x0, out: -1, major: false }, { n: 'E', a0: y0, a1: y1, at: x1, out: 1, major: false },
    ];
    for (const s of sides) {
      const len = s.a1 - s.a0, n = Math.max(1, Math.floor(len / (s.major ? 3.0 : 4.2)));
      for (let f = 0; f < floors; f++) {
        for (let k = 0; k < n; k++) {
          if (!s.major && r() < 0.4) continue;
          const cpos = s.a0 + (len * (k + 0.5)) / n, ww = s.major ? 1.2 + (r() < 0.3 ? 0.6 : 0) : 0.75, z = f * FH;
          const isDoor = f === 0 && s.n === face && k === Math.floor(n / 2);
          const z0 = isDoor ? 0.1 : 0.9, z1 = isDoor ? 2.25 : 2.1;
          const winRect = (o0, o1) => (s.n === 'S' || s.n === 'N') ? [cpos - ww / 2, s.at + o0, cpos + ww / 2, s.at + o1] : [s.at + o0, cpos - ww / 2, s.at + o1, cpos + ww / 2];
          const o = s.out;
          const wr = winRect(Math.min(0.03 * o, -0.01 * o), Math.max(0.03 * o, -0.01 * o));
          if (isDoor && r() < 0.35) into(metal, wr, z + 0.0, z + 2.6); // rolling shutter (ground-floor shop)
          else into(isDoor ? dark : (r() < 0.38 ? lit : dark), wr, z + z0, z + z1);
          // chajja over the opening
          const cr = winRect(Math.min(0, 0.55 * o), Math.max(0, 0.55 * o));
          const wide = (s.n === 'S' || s.n === 'N') ? [cr[0] - 0.25, cr[1], cr[2] + 0.25, cr[3]] : [cr[0], cr[1] - 0.25, cr[2], cr[3] + 0.25];
          wall(wide, z + z1 + 0.08, z + z1 + 0.16, c.clone().multiplyScalar(0.9), false);
        }
      }
    }
    // front balcony on an upper floor
    if (floors >= 2 && r() < 0.45) {
      const f = 1 + Math.floor(r() * (floors - 1)), z = f * FH, o = 1.15;
      const fr = face === 'S' ? [x0 + 0.8, y0 - o, x1 - 0.8, y0] : face === 'N' ? [x0 + 0.8, y1, x1 - 0.8, y1 + o] : face === 'W' ? [x0 - o, y0 + 0.8, x0, y1 - 0.8] : [x1, y0 + 0.8, x1 + o, y1 - 0.8];
      wall(fr, z - 0.15, z, c);
      const edge = face === 'S' ? [fr[0], fr[1], fr[2], fr[1] + 0.12] : face === 'N' ? [fr[0], fr[3] - 0.12, fr[2], fr[3]] : face === 'W' ? [fr[0], fr[1], fr[0] + 0.12, fr[3]] : [fr[2] - 0.12, fr[1], fr[2], fr[3]];
      wall(edge, z, z + 1.0, c.clone().multiplyScalar(0.97));
    }
    // roof: stair headroom, water tanks on a stand, sometimes a tin shade on posts
    const hx = r() < 0.5 ? x0 + 0.3 : x1 - 2.7, hy = r() < 0.5 ? y0 + 0.3 : y1 - 3.3;
    wall([hx, hy, hx + 2.4, hy + 3.0], H, H + 2.5, c);
    const nt = 1 + (r() < 0.45 ? 1 : 0);
    for (let k = 0; k < nt; k++) {
      const tx = hx + 0.6 + k * 1.25, ty = hy + 1.5;
      walls.push(tint(planBoxGeo([tx - 0.6, ty - 0.6, tx + 0.6, ty + 0.6], base + H + 2.5, base + H + 2.65), col(CONCRETE), false));
      tanks.push(tankGeo.clone().translate(tx, base + H + 2.65 + 0.55, -ty));
    }
    if (r() < 0.55) {
      const sx0 = x0 + 0.3 + r() * 1.5, sy0 = y0 + 0.3 + r() * 1.5, sx1 = Math.min(x1 - 0.3, sx0 + 5 + r() * 4), sy1 = Math.min(y1 - 0.3, sy0 + 4 + r() * 4);
      if (r() < 0.3) wall([sx0, sy0, sx1, sy1], H + 2.45, H + 2.5, col('#3f7d52'), false); // green shade cloth
      else into(metal, [sx0, sy0, sx1, sy1], H + 2.45, H + 2.5);
      for (const [px, py] of [[sx0, sy0], [sx1, sy0], [sx0, sy1], [sx1, sy1]]) into(metal, [px - 0.04, py - 0.04, px + 0.04, py + 0.04], H, H + 2.45);
    }
  }

  // ---------------- lanes, plots ----------------
  const ROADS_Y = [[-17, -11], [33, 38.5], [79, 84.5], [-60, -54.5], [125, 130]];
  const ROADS_X = [[-16, -10.5], [30, 35.5], [73, 78.5], [-58, -52.5], [-100, -94.5]];
  const SITE = [-9.5, -10, 27.5, 24.5];
  const APTS = [[48, 2, 14, 18], [-48, 40, 16, 14]];
  const RADIUS = 68; // a compact ring of streets around the plot — enough context, no lag // our plot (kept clear)
  const hit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  const roadRects = [...ROADS_Y.map(([a, b]) => [-140, a, 160, b]), ...ROADS_X.map(([a, b]) => [a, -140, b, 160])];
  const ys = [-140, ...ROADS_Y.flat().sort((a, b) => a - b), 160], xs = [-140, ...ROADS_X.flat().sort((a, b) => a - b), 160];
  const blocks = [];
  for (let i = 0; i < xs.length - 1; i += 2) for (let j = 0; j < ys.length - 1; j += 2) blocks.push([xs[i] + 1.2, ys[j] + 1.2, xs[i + 1] - 1.2, ys[j + 1] - 1.2]);
  let houses = 0;
  for (const B of blocks) {
    const cx = (B[0] + B[2]) / 2, cy = (B[1] + B[3]) / 2;
    if (Math.hypot(cx - 7, cy - 6) > 135) continue;
    // two rows of plots: one facing the lane to the south, one facing the lane to the north
    for (const row of ['S', 'N']) {
      let x = B[0];
      while (x < B[2] - 7) {
        if (r() > density) { x += 10; continue; }
        const w = 8 + r() * 4.5, d = Math.min((B[3] - B[1]) / 2 - 1.5, 9 + r() * 5), gap = 0.6 + r() * 1.6;
        const y0 = row === 'S' ? B[1] + 1.8 + r() * 1.2 : B[3] - 1.8 - r() * 1.2 - d;
        const rect = [x, y0, x + w, y0 + d];
        if (x + w > B[2]) break;
        const near = Math.hypot(x + w / 2 - 7, y0 + d / 2 - 6) < RADIUS;
        if (near && !hit(rect, SITE) && !APTS.some(([a, b, w2, d2]) => hit(rect, [a - 2, b - 2, a + w2 + 2, b + d2 + 2])) && !roadRects.some((q) => hit(rect, q)) && d > 6) {
          const fl = r() < 0.18 ? 1 : r() < 0.6 ? 2 : r() < 0.9 ? 3 : 4;
          house(rect[0], rect[1], w, d, fl, row, r() < 0.05);
          // a tidy green front yard between the house and the lane
          lawn.push(planBoxGeo([x, row === 'S' ? B[1] + 0.6 : y0 + d, x + w, row === 'S' ? y0 : B[3] - 0.6], base, base + 0.03));
          // low front compound wall with a gate
          const fy = row === 'S' ? B[1] + 0.4 : B[3] - 0.4;
          const wc = col(pick(PALETTE)).multiplyScalar(0.92);
          wall([x - 0.3, Math.min(fy, fy + (row === 'S' ? 0.15 : -0.15)), x + w * 0.35, Math.max(fy, fy + (row === 'S' ? 0.15 : -0.15))], 0, 1.25, wc);
          wall([x + w * 0.62, Math.min(fy, fy + (row === 'S' ? 0.15 : -0.15)), x + w + 0.3, Math.max(fy, fy + (row === 'S' ? 0.15 : -0.15))], 0, 1.25, wc);
          into(metal, [x + w * 0.35, Math.min(fy, fy + 0.05), x + w * 0.62, Math.max(fy, fy + 0.05)], 0, 1.4); // gate
          houses++;
        }
        x += w + gap;
      }
    }
  }

  // two white 5-storey apartment blocks further out (as seen down the road to the east)
  for (const [ax, ay, aw, ad] of APTS) {
    const ac = col('#eeeae4'); wall([ax, ay, ax + aw, ay + ad], 0, 15.5, ac);
    wall([ax - 0.1, ay - 0.1, ax + aw + 0.1, ay + ad + 0.1], 15.5, 16.5, ac);
    for (let f = 0; f < 5; f++) for (let k = 0; k < 4; k++) { const cx = ax + aw * (k + 0.5) / 4; into(r() < 0.4 ? lit : dark, [cx - 0.8, ay - 0.04, cx + 0.8, ay + 0.01], f * 3.1 + 0.9, f * 3.1 + 2.1); wall([cx - 1.2, ay - 1.0, cx + 1.2, ay], f * 3.1 + 2.9, f * 3.1 + 3.05, ac); }
  }
  // ---------------- our plot: tin-sheet frontage, compound walls, ground ----------------
  const tinH = 2.6, gateA = 3.5, gateB = 9.5;
  into(metal, [SITE[0], SITE[1], gateA, SITE[1] + 0.05], 0, tinH);
  into(metal, [gateB, SITE[1], SITE[2], SITE[1] + 0.05], 0, tinH);
  const tin = new THREE.Mesh(merge([planBoxGeo([SITE[0], SITE[1] - 0.06, gateA, SITE[1] - 0.01], base, base + tinH), planBoxGeo([gateB, SITE[1] - 0.06, SITE[2], SITE[1] - 0.01], base, base + tinH)]), M.tin);
  g.add(tin);
  for (let x = SITE[0]; x <= SITE[2]; x += 2.4) into(metal, [x - 0.04, SITE[1] - 0.12, x + 0.04, SITE[1] - 0.04], 0, tinH + 0.1); // posts
  const cw = col('#d8cdb9');
  wall([SITE[0], SITE[3] - 0.2, SITE[2], SITE[3]], 0, 1.9, cw); wall([SITE[0], SITE[1], SITE[0] + 0.2, SITE[3]], 0, 1.9, cw); wall([SITE[2] - 0.2, SITE[1], SITE[2], SITE[3]], 0, 1.9, cw);

  // dusty earth on the plot itself (the town around is green)
  { const e = new THREE.Mesh(planBoxGeo([SITE[0], SITE[1], SITE[2], SITE[3]], base, base + 0.015), M.earth); e.receiveShadow = true; g.add(e); }
  // ---------------- roads, poles + overhead wires ----------------
  const roads = roadRects.map((q) => [Math.max(q[0], -75), Math.max(q[1], -75), Math.min(q[2], 90), Math.min(q[3], 90)]).filter((q) => q[0] < q[2] && q[1] < q[3]).map((q) => planBoxGeo(q, base, base + 0.02));
  g.add(new THREE.Mesh(merge(roads), M.asphalt));
  const wirePts = [];
  const poleLine = (pts) => {
    for (let i = 0; i < pts.length; i++) {
      const [px, py] = pts[i];
      walls.push(tint(planBoxGeo([px - 0.11, py - 0.11, px + 0.11, py + 0.11], base, base + 9.2), col(CONCRETE), false));
      into(metal, [px - 0.8, py - 0.05, px + 0.8, py + 0.05], 8.6, 8.7);
      if (i) {
        const [qx, qy] = pts[i - 1];
        for (const off of [-0.7, 0, 0.7]) for (let k = 0; k < 10; k++) {
          const t0 = k / 10, t1 = (k + 1) / 10, sag = (t) => 8.75 - 0.75 * Math.sin(Math.PI * t);
          wirePts.push(qx + (px - qx) * t0 + off, base + sag(t0), -(qy + (py - qy) * t0), qx + (px - qx) * t1 + off, base + sag(t1), -(qy + (py - qy) * t1));
        }
      }
    }
  };
  for (const [a] of ROADS_Y) { const pts = []; for (let x = -55; x <= 70; x += 29) if (Math.abs(a) < 80) pts.push([x, a - 0.6]); poleLine(pts); }
  for (const [a] of ROADS_X) { const pts = []; for (let y = -55; y <= 70; y += 29) if (Math.abs(a) < 80) pts.push([a - 0.6, y]); poleLine(pts); }
  const wires = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(wirePts, 3)), new THREE.LineBasicMaterial({ color: 0x1c1c1e, transparent: true, opacity: 0.85 }));
  wires.userData.dynamic = true; g.add(wires);

  // ---------------- trees: date palms (with dry hanging fronds) + neem ----------------
  const frondGeo = (() => { // arched, tapering strip built from 10 segments
    const pos = [], idx = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10, wdt = 0.34 * (1 - t * 0.8), z = t * 2.9, y = Math.sin(t * 1.9) * 0.9 - t * t * 1.4; pos.push(-wdt, y, z, wdt, y, z); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  })();
  const fronds = [], dryF = [], trunks = [];
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1, 8, 4);
  const palm = (x, y, h) => {
    trunks.push(trunkGeo.clone().scale(1, h, 1).translate(x, base + h / 2, -y));
    const n = 16;
    for (let k = 0; k < n; k++) {
      const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-0.35 + r() * 0.5, (k / n) * Math.PI * 2 + r() * 0.3, 0, 'YXZ')).setPosition(x, base + h, -y);
      fronds.push(frondGeo.clone().applyMatrix4(m));
    }
    for (let k = 0; k < 9; k++) { // dead fronds hanging under the crown
      const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(1.15 + r() * 0.3, (k / 9) * Math.PI * 2 + r(), 0, 'YXZ')).setPosition(x, base + h - 0.3, -y);
      dryF.push(frondGeo.clone().scale(0.8, 0.8, 0.75).applyMatrix4(m));
    }
  };
  // flanking the gate like the street view, then along the lanes
  palm(gateA - 1.2, SITE[1] - 1.6, 8.5); palm(gateB + 1.4, SITE[1] - 1.4, 9.5); palm(SITE[2] - 2, SITE[1] - 1.8, 7.5);
  for (let i = 0; i < 30 * density; i++) { const [a] = pick(ROADS_Y); if (Math.abs(a) < 70) palm(-55 + r() * 125, a - 2 + (r() < 0.5 ? 0 : 9.5), 6 + r() * 4); }
  const blob = new THREE.IcosahedronGeometry(1, 1);
  const neem = [];
  for (let i = 0; i < 80 * density; i++) {
    const x = -60 + r() * 135, y = -60 + r() * 135;
    if (hit([x - 3, y - 3, x + 3, y + 3], SITE) || roadRects.some((q) => hit([x - 2, y - 2, x + 2, y + 2], q))) continue;
    const s = 0.9 + r() * 0.8, th = 2.8 * s;
    trunks.push(trunkGeo.clone().scale(s * 0.9, th, s * 0.9).translate(x, base + th / 2, -y));
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + r(); const rr = (1.4 + r() * 0.9) * s; neem.push(blob.clone().scale(rr, rr * 0.75, rr).translate(x + Math.cos(a) * 1.2 * s, base + th + 1.0 * s + r() * 1.2 * s, -y + Math.sin(a) * 1.2 * s)); }
  }

  // ---------------- assemble: a few merged meshes ----------------
  const add = (geos, mat) => { if (!geos.length) return; const m = new THREE.Mesh(merge(geos), mat); m.castShadow = false; m.receiveShadow = true; m.userData.dynamic = true; g.add(m); return m; }; // already merged (keeps vertex colours)
  add(walls, M.house); add(lit, M.neighbourBand); add(dark, M.houseGlass); add(metal, M.tinDark); add(tanks, M.tank);
  add(trunks, M.bark); add(fronds, M.palm); add(dryF, M.palmDry); add(neem, M.canopy); add(lawn, M.lawn);
  void wood;
  g.userData.houses = houses;
  return g;
}
