// Procedural canvas textures (no external images). All generated at load time.
import * as THREE from 'three';

// ---------- value noise ----------
function makeNoise(seed = 7) {
  const p = new Uint8Array(512);
  let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const vals = new Float32Array(256); for (let i = 0; i < 256; i++) vals[i] = r();
  const fade = (t) => t * t * (3 - 2 * t);
  return (x, y, period = 0, periodY = period) => {
    let xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    let x1 = xi + 1, y1 = yi + 1;
    if (period) { xi = ((xi % period) + period) % period; x1 = ((x1 % period) + period) % period; }
    if (periodY) { yi = ((yi % periodY) + periodY) % periodY; y1 = ((y1 % periodY) + periodY) % periodY; }
    const v00 = vals[p[(xi & 255) + p[yi & 255]]], v10 = vals[p[(x1 & 255) + p[yi & 255]]];
    const v01 = vals[p[(xi & 255) + p[y1 & 255]]], v11 = vals[p[(x1 & 255) + p[y1 & 255]]];
    const u = fade(xf), v = fade(yf);
    return (v00 * (1 - u) + v10 * u) * (1 - v) + (v01 * (1 - u) + v11 * u) * v;
  };
}
const N1 = makeNoise(11), N2 = makeNoise(29), N3 = makeNoise(53);
function fbm(n, x, y, oct = 4, period = 0) {
  let a = 0.5, f = 1, t = 0, norm = 0;
  for (let i = 0; i < oct; i++) { t += a * n(x * f, y * f, period ? period * f : 0); norm += a; a *= 0.5; f *= 2; }
  return t / norm;
}

// fbm that wraps with independent periods on x and y (coordinates in noise cells; periods integers)
function fbm2(n, x, y, oct = 4, px = 0, py = px) {
  let a = 0.5, f = 1, t = 0, norm = 0;
  for (let i = 0; i < oct; i++) { t += a * n(x * f, y * f, px * f, py * f); norm += a; a *= 0.5; f *= 2; }
  return t / norm;
}
const rnd = (seed) => { let s = Math.max(1, Math.floor(seed)) % 2147483647; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
function grayCanvas(arr, w, h) {
  const c = canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const v = clamp(arr[i] * 255); img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  return c;
}

function canvas(w, h = w) {
  if (typeof document === 'undefined') return new OffscreenCanvas(w, h); // inside the texture worker pool
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
const clamp = (v, a = 0, b = 255) => Math.max(a, Math.min(b, v));
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

function finish(c, { srgb = true, repeat = 1, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  t.repeat.set(repeat, repeat);
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** height (Float32Array, w*h, 0..1) → tangent-space normal map canvas */
function normalFromHeight(hgt, w, h, strength = 2) {
  const c = canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const l = hgt[y * w + ((x - 1 + w) % w)], r = hgt[y * w + ((x + 1) % w)];
    const u = hgt[((y - 1 + h) % h) * w + x], d = hgt[((y + 1) % h) * w + x];
    let nx = (l - r) * strength, ny = (d - u) * strength, nz = 1;
    const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
    const i = (y * w + x) * 4;
    img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
function roughFromHeight(hgt, w, h, base, amp) {
  const c = canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const v = clamp((base + (hgt[i] - 0.5) * amp) * 255); img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function woodSet({ base = 0xb08560, dark = 0x7a5536, light = 0xc9a27c, planks = true, size = 1024, plankW = 0.19, worldSize = 2.4, seed = 1, pores = 0.55, gloss = 0.45, figure = 0.65 } = {}) {
  const w = size, h = size;
  const c = canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
  const hgt = new Float32Array(w * h), rgh = new Float32Array(w * h);
  const B0 = hex(base), D0 = hex(dark), L0 = hex(light);
  const rng = rnd(seed * 97 + 13);
  const rows = planks ? Math.max(1, Math.round(worldSize / plankW)) : 1;
  const rowH = h / rows, pxPerM = w / worldSize;
  // periods (in noise cells across the texture) — integers so every field wraps
  const PX = Math.max(2, Math.round(worldSize * 1.6)), PXF = Math.max(4, Math.round(worldSize * 26)), PY = planks ? rows * 3 : 6;
  const PPX = Math.max(8, Math.round(worldSize / 0.028)), PPY = Math.max(32, Math.round(h / 2.2));
  const rowsData = [];
  for (let r = 0; r < rows; r++) {
    const nj = planks ? (rng() < 0.55 ? 1 : 2) : 0;
    const joints = [];
    for (let k = 0; k < nj; k++) joints.push(Math.floor(((k + rng() * 0.7) / Math.max(1, nj)) * w + rng() * w * 0.3) % w);
    joints.sort((a, b) => a - b);
    const segs = [];
    const n = Math.max(1, joints.length);
    for (let k = 0; k < n; k++) {
      const flat = rng() < figure;
      segs.push({ start: joints.length ? joints[k] : 0, tone: (rng() - 0.5) * 0.28, warm: (rng() - 0.5) * 0.07, z0: 0.6 + rng() * 2.8, c: 0.15 + rng() * 0.7, taper: (0.8 + rng() * 2.2) * (rng() < 0.5 ? -1 : 1), freq: planks ? 5 + rng() * 7 : 14 + rng() * 6, flat, rough: (rng() - 0.5) * 0.08, off: rng() * 40 });
    }
    rowsData.push({ joints, segs });
  }
  const segAt = (rd, x) => {
    if (!rd.joints.length) return [rd.segs[0], x];
    let k = rd.joints.length - 1;
    for (let i = 0; i < rd.joints.length; i++) if (x >= rd.joints[i]) k = i;
    if (x < rd.joints[0]) k = rd.joints.length - 1;
    const s = rd.segs[k];
    return [s, (x - s.start + w) % w];
  };
  const jointDist = (rd, x) => { let d = 1e9; for (const j of rd.joints) { const a = Math.abs(x - j); d = Math.min(d, a, w - a); } return d; };
  for (let y = 0; y < h; y++) {
    const r = Math.floor(y / rowH), rd = rowsData[r] || rowsData[0];
    const ly = (y - r * rowH) / rowH;
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const [s, lx] = segAt(rd, x);
      const um = lx / pxPerM; // metres along the board
      // slow warp so rings meander; periodic in both axes
      const wp = fbm2(N1, u * PX + s.off, v * PY, 3, PX, PY) - 0.5;
      const wf = fbm2(N2, u * PXF, v * PY * 4, 2, PXF, PY * 4) - 0.5;
      let ringPos;
      if (planks) {
        const a = (ly - s.c) * 2.2;
        ringPos = s.flat ? (Math.sqrt(a * a + s.z0 * s.z0 * 0.04) * 4 + um * s.taper * 0.9 + wp * 1.4) * s.freq * 0.32 : (a + wp * 0.35) * s.freq * 0.55;
      } else {
        // rift veneer: irregular ring spacing (density field) + integer ring count so the sheet tiles
        const dens = fbm2(N3, u * 2 + s.off, v * 3, 3, 2, 3);
        ringPos = v * Math.round(s.freq * 3) + dens * 7 + wp * 0.9 + wf * 0.3;
      }
      const ring = ringPos - Math.floor(ringPos);
      const late = Math.pow(ring, 2.6); // earlywood light → latewood dark, abrupt reset at the ring boundary
      // pores: short dark dashes aligned with the grain, denser in earlywood
      const pn = N3(u * PPX, v * PPY, PPX, PPY);
      const pore = Math.max(0, (pn - (1 - pores * 0.32)) / (pores * 0.32 + 1e-6)) * (1 - late * 0.6);
      const fibre = N2(u * PPX * 0.5 + 3.1, v * PPY * 0.5, PPX * 0.5, PPY * 0.5) - 0.5;
      // long mineral/colour streaks running with the grain (veneer character)
      const streak = planks ? 0 : fbm2(N1, u * 3 + s.off, v * 36, 3, 3, 36) - 0.5;
      let t = 0.56 + s.tone + wp * (planks ? 0.25 : 0.12) + streak * 0.3 + fibre * 0.07 - late * (planks ? 0.34 : 0.17) - pore * 0.22;
      let cr, cg, cb;
      if (t < 0.5) { const k = Math.max(0, t) / 0.5; cr = D0[0] + (B0[0] - D0[0]) * k; cg = D0[1] + (B0[1] - D0[1]) * k; cb = D0[2] + (B0[2] - D0[2]) * k; }
      else { const k = Math.min(1, (t - 0.5) / 0.5); cr = B0[0] + (L0[0] - B0[0]) * k; cg = B0[1] + (L0[1] - B0[1]) * k; cb = B0[2] + (L0[2] - B0[2]) * k; }
      cr *= 1 + s.warm; cb *= 1 - s.warm;
      let hv = 0.78 - (planks ? late * 0.05 : 0) - pore * 0.22 + fibre * (planks ? 0.03 : 0.01);
      let ro = (1 - gloss) + s.rough + pore * 0.22 + late * 0.03 + fibre * 0.04;
      if (planks) {
        const ed = Math.min(Math.min(ly, 1 - ly) * rowH, jointDist(rd, x));
        if (ed < 1.0) { cr *= 0.32; cg *= 0.3; cb *= 0.28; hv = 0.0; ro = 0.95; }
        else if (ed < 3.2) { const k = (ed - 1) / 2.2; hv *= 0.35 + 0.65 * k; const d = 0.8 + 0.2 * k; cr *= d; cg *= d; cb *= d; ro += (1 - k) * 0.1; }
      }
      const i = (y * w + x) * 4;
      img.data[i] = clamp(cr); img.data[i + 1] = clamp(cg); img.data[i + 2] = clamp(cb); img.data[i + 3] = 255;
      hgt[y * w + x] = hv; rgh[y * w + x] = ro;
    }
  }
  ctx.putImageData(img, 0, 0);
  const rep = 1 / worldSize;
  const map = finish(c); map.repeat.set(rep, rep);
  const nmap = finish(normalFromHeight(hgt, w, h, planks ? 2.2 : 0.9), { srgb: false }); nmap.repeat.set(rep, rep);
  const rmap = finish(grayCanvas(rgh, w, h), { srgb: false }); rmap.repeat.set(rep, rep);
  return { map, normalMap: nmap, roughnessMap: rmap };
}

// ---------------------------------------------------------------------
// TILE / STONE (large format) with optional veining. Seamless.
// Veins come from a domain-warped ridge field with a soft halo; every tile has its own tone and a
// tiny tilt (lippage) so reflections break slightly from tile to tile, plus chamfered edges and a
// roughness map with faint polishing swirls. Roughness map: polished face ≈ 0.8, grout 1.0.
// ---------------------------------------------------------------------
export function tileSet({ base = 0xd9d4cc, vein = 0xb9b2a8, grout = 0xb8b2a8, tileW = 1.2, tileH = 0.6, worldSize = 2.4, size = 1024, veins = 0.35, speck = 0.06, groutPx = 2, seed = 3, cloud = 0.06, stagger = 0, lippage = 1 } = {}) {
  const w = size, h = size, c = canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
  const hgt = new Float32Array(w * h), rgh = new Float32Array(w * h);
  const B0 = hex(base), V0 = hex(vein), G0 = hex(grout);
  const pxPerM = size / worldSize;
  const tw = tileW * pxPerM, th = tileH * pxPerM;
  const F = Math.max(2, Math.round(worldSize * 2.5)), FB = Math.max(1, Math.round(F * 0.3)); // noise periods across the texture
  const hash = (a, b) => { const q = Math.sin(a * 127.1 + b * 311.7 + seed * 17.3) * 43758.5453; return q - Math.floor(q); };
  // smooth fields on a half-res grid (bilinear) — veins stay crisp because the ridge is sharpened per pixel
  const S = 2, lw = Math.ceil(w / S) + 2, lh = Math.ceil(h / S) + 2;
  const fN = new Float32Array(lw * lh), fR = new Float32Array(lw * lh), fF = new Float32Array(lw * lh), fP = new Float32Array(lw * lh);
  for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) {
    const u = (i * S) / w, v = (j * S) / h, k = j * lw + i;
    fN[k] = fbm2(N1, u * F * 2 + seed, v * F * 2, 5, F * 2, F * 2);
    fP[k] = fbm2(N3, u * F * 6, v * F * 6, 3, F * 6, F * 6);
    if (veins > 0) {
      // anisotropic diagonal frame (a fast, b slow): integer periods keep it seamless, veins run long and flowing
      const a = (u + v) * F, b = (v - u) * FB;
      const q1 = fbm2(N2, a, b, 4, F, FB), q2 = fbm2(N3, a + 3.7, b + 1.9, 4, F, FB);
      fR[k] = fbm2(N1, a + q1 * 1.7 + seed * 0.37, b + q2 * 0.9, 5, F, FB);
      fF[k] = fbm2(N2, a * 2 + q2 * 2.2 + 1.3, b * 3 + q1 * 1.4, 4, F * 2, FB * 3);
    }
  }
  const smp = (arr, x, y) => {
    const fx = x / S, fy = y / S, i0 = Math.floor(fx), j0 = Math.floor(fy), ax = fx - i0, ay = fy - j0, k = j0 * lw + i0;
    return (arr[k] * (1 - ax) + arr[k + 1] * ax) * (1 - ay) + (arr[k + lw] * (1 - ax) + arr[k + lw + 1] * ax) * ay;
  };
  const cham = Math.max(1.5, 0.003 * pxPerM);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / h;
    const row = Math.floor(y / th);
    const xs = x + (row % 2 ? stagger * tw : 0);
    const col = Math.floor(xs / tw);
    const tid = row * 97 + col;
    const n = smp(fN, x, y);
    const tTone = (hash(tid, 1) - 0.5) * cloud * 0.9;
    const t = (n - 0.5) * cloud * 4 + tTone;
    let vv = 0, halo = 0;
    if (veins > 0) {
      const rr = smp(fR, x, y), ridge = 1 - Math.abs(2 * rr - 1);
      vv = Math.pow(ridge, 22) * veins * 1.25;
      halo = Math.pow(ridge, 5) * veins * 0.22;
      const fine = 1 - Math.abs(2 * smp(fF, x, y) - 1);
      vv += Math.pow(fine, 30) * veins * 0.5;
      vv = Math.min(1, vv);
    }
    const sp = speck > 0 && N3(u * 260, v * 260, 260, 260) > 1 - speck * 0.6 ? 0.1 : 0;
    const shade = (1 + t) * (1 - sp) * (1 - halo * 0.35);
    let cr = B0[0] * shade * (1 - vv) + V0[0] * vv;
    let cg = B0[1] * shade * (1 - vv) + V0[1] * vv;
    let cb = B0[2] * shade * (1 - vv) + V0[2] * vv;
    // lippage: each tile tilts a hair, so reflections step slightly between tiles
    const gx = xs - col * tw, gy = y - row * th;
    const tilt = lippage * ((hash(tid, 3) - 0.5) * gx / tw + (hash(tid, 5) - 0.5) * gy / th) * 0.06;
    let hv = 0.8 + tilt + (n - 0.5) * 0.02 - vv * 0.01;
    const polish = smp(fP, x, y);
    let ro = 0.78 + (polish - 0.5) * 0.18 + vv * 0.05 + sp * 0.3;
    const ed = Math.min(gx, tw - gx, gy, th - gy);
    if (groutPx > 0 && ed < groutPx) { cr = G0[0]; cg = G0[1]; cb = G0[2]; hv = 0.0; ro = 1.0; }
    else if (groutPx > 0 && ed < groutPx + cham) { const k = (ed - groutPx) / cham; hv *= 0.45 + 0.55 * k; const d = 0.93 + 0.07 * k; cr *= d; cg *= d; cb *= d; ro = Math.min(1, ro + (1 - k) * 0.12); }
    const i = (y * w + x) * 4;
    img.data[i] = clamp(cr); img.data[i + 1] = clamp(cg); img.data[i + 2] = clamp(cb); img.data[i + 3] = 255;
    hgt[y * w + x] = hv; rgh[y * w + x] = Math.min(1, ro);
  }
  ctx.putImageData(img, 0, 0);
  const rep = 1 / worldSize;
  const map = finish(c); map.repeat.set(rep, rep);
  const nmap = finish(normalFromHeight(hgt, w, h, 1.4), { srgb: false }); nmap.repeat.set(rep, rep);
  const rmap = finish(grayCanvas(rgh, w, h), { srgb: false }); rmap.repeat.set(rep, rep);
  return { map, normalMap: nmap, roughnessMap: rmap };
}

// ---------------------------------------------------------------------
// PATTERNED FLOORS — herringbone timber, hexagon terracotta, zellige, encaustic cement, marble checker.
// One per-pixel pass computes the tile/plank id, local coords, colour, height (for normals) and gloss.
// ---------------------------------------------------------------------
export function patternSet({ kind = 'herringbone', base = 0xb98d5f, dark = 0x8a6141, light = 0xd6b083, alt = 0x2b2a29, accent = 0xb5643f, grout = 0xcfc6b8, worldSize = 2.4, size = 1024, cell = 0.1, plankN = 5, seed = 4, gloss = 0.5 } = {}) {
  const w = size, h = size, c = canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
  const hgt = new Float32Array(w * h), rough = new Float32Array(w * h);
  const B0 = hex(base), D0 = hex(dark), L0 = hex(light), A0 = hex(alt), C0 = hex(accent), G0 = hex(grout);
  const pxPerM = size / worldSize, cpx = cell * pxPerM;
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7 + seed * 17.3) * 43758.5453; return s - Math.floor(s); };
  const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const SQ3 = Math.sqrt(3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let col, hv = 0.6, ro = 1 - gloss;
    if (kind === 'herringbone') {
      // staircase herringbone: cells where (i - j) mod 2n < n belong to horizontal planks, the rest vertical
      const px = x / cpx, py = y / cpx, i = Math.floor(px), j = Math.floor(py), n = plankN;
      const m = (((i - j) % (2 * n)) + 2 * n) % (2 * n), horiz = m < n;
      // distance along the plank from its start cell (axis-aligned, so joints are square)
      const kk = horiz ? Math.floor((i - j) / (2 * n)) : Math.floor((i - j - n) / (2 * n));
      const along = horiz ? px - (j + 2 * n * kk) : py - (i - 2 * n + 1 - 2 * n * kk);
      const across = horiz ? py - j : px - i;
      const id = horiz ? j * 131 + Math.floor((i - j) / (2 * n)) : i * 197 + Math.floor((i - j - n) / (2 * n)) + 5000;
      const tone = (hash(id, 1) - 0.5) * 0.3;
      const ga = horiz ? px : py, gb = horiz ? py : px;
      const g1 = fbm(N1, ga * 0.9 + id, gb * 9, 3, 0);
      let ring = Math.pow(Math.sin(gb * 22 + g1 * 9 + id) * 0.5 + 0.5, 3);
      const t = 0.5 + (g1 - 0.5) * 0.9 + tone - ring * 0.18;
      col = t < 0.5 ? mix3(D0, B0, t / 0.5) : mix3(B0, L0, (t - 0.5) / 0.5);
      const seam = Math.min(across, 1 - across) * cpx < 1.1 || Math.min(along, n - along) * cpx < 1.1;
      if (seam) { col = col.map((v) => v * 0.55); hv = 0.1; } else hv = 0.6 + (g1 - 0.5) * 0.15;
      ro = 0.55 + (g1 - 0.5) * 0.2;
    } else if (kind === 'hex') {
      // flat-top hexagon grid (cell = flat-to-flat size)
      const s = cpx / SQ3, qx = x / (1.5 * s), col0 = Math.round(qx);
      let best = 1e9, cx = 0, cy = 0, id = 0;
      for (let dc = -1; dc <= 1; dc++) {
        const cc = col0 + dc, ox = cc * 1.5 * s, off = (cc & 1) ? cpx / 2 : 0, rr = Math.round((y - off) / cpx);
        for (let dr = -1; dr <= 1; dr++) { const oy = (rr + dr) * cpx + off; const d = Math.hypot(x - ox, y - oy); if (d < best) { best = d; cx = ox; cy = oy; id = cc * 977 + rr + dr; } }
      }
      const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
      const edge = Math.max(dy, dx * SQ3 / 2 + dy / 2) / (cpx / 2); // 1 at the hexagon edge
      const tone = (hash(id, 3) - 0.5) * 0.32, n = fbm(N2, x / 40 + id, y / 40, 3, 0);
      col = mix3(B0, D0, Math.max(0, Math.min(1, 0.45 + tone + (n - 0.5) * 0.6)));
      if (hash(id, 9) > 0.86) col = mix3(col, L0, 0.45);
      if (edge > 0.93) { col = G0; hv = 0.05; } else { hv = 0.55 - edge * 0.12 + (n - 0.5) * 0.1; }
      ro = 0.72;
    } else if (kind === 'zellige') {
      // hand-made glazed squares: per-tile hue shifts, pooled glaze darker at edges, wavy surface
      const px = x / cpx, py = y / cpx, i = Math.floor(px), j = Math.floor(py), lx = px - i, ly = py - j;
      const wob = (fbm(N3, px * 2.3, py * 2.3, 2, 0) - 0.5) * 0.06;
      const ex = Math.min(lx, 1 - lx) + wob, ey = Math.min(ly, 1 - ly) - wob, e = Math.min(ex, ey);
      const tone = (hash(i, j) - 0.5) * 0.5, n = fbm(N1, px * 3 + i, py * 3 + j, 3, 0);
      col = mix3(B0, tone < 0 ? D0 : L0, Math.abs(tone) * 1.2 + (n - 0.5) * 0.3);
      col = mix3(col, D0, Math.max(0, 0.12 - e) * 4);
      if (e < 0.035) { col = G0; hv = 0.05; ro = 0.8; } else { hv = 0.6 + (n - 0.5) * 0.35 - Math.max(0, 0.15 - e) * 1.5; ro = 0.08 + (1 - n) * 0.08; }
    } else if (kind === 'encaustic') {
      // cement tiles with a four-petal / star motif in three colours
      const px = x / cpx, py = y / cpx, i = Math.floor(px), j = Math.floor(py);
      const u = (px - i) * 2 - 1, v = (py - j) * 2 - 1, r = Math.hypot(u, v), a = Math.atan2(v, u);
      const petal = r < 0.55 + 0.32 * Math.abs(Math.cos(2 * a));
      const ring = Math.abs(r - 0.86) < 0.06, corner = Math.min(Math.hypot(u - 1, v - 1), Math.hypot(u + 1, v - 1), Math.hypot(u - 1, v + 1), Math.hypot(u + 1, v + 1)) < 0.42;
      const dot = r < 0.16;
      col = dot ? C0 : petal ? A0 : corner ? C0 : ring ? A0 : B0;
      const n = fbm(N2, px * 6, py * 6, 3, 0);
      col = col.map((q) => q * (0.92 + (n - 0.5) * 0.18));
      const gl = Math.min(px - i, 1 - (px - i), py - j, 1 - (py - j)) * cpx;
      if (gl < 1.2) { col = G0; hv = 0.1; } else hv = 0.6 + (n - 0.5) * 0.06;
      ro = 0.62;
    } else { // checker: alternating marbles
      const px = x / cpx, py = y / cpx, i = Math.floor(px), j = Math.floor(py), dark2 = (i + j) & 1;
      const wx = x / pxPerM * 1.6 + i * 1.7, wy = y / pxPerM * 1.6 + j * 2.3;
      const q = fbm(N2, wx, wy, 4, 0), ridge = 1 - Math.abs(2 * fbm(N1, wx + q * 2.5, wy + q * 2.5, 5, 0) - 1);
      const vv = Math.min(1, Math.pow(ridge, 18) * 1.2);
      col = dark2 ? mix3(A0, L0, vv * 0.85) : mix3(B0, D0, vv * 0.7);
      const gl = Math.min(px - i, 1 - (px - i), py - j, 1 - (py - j)) * cpx;
      if (gl < 1.0) { col = G0; hv = 0.15; } else hv = 0.6;
      ro = 0.1;
    }
    const k = (y * w + x) * 4;
    img.data[k] = clamp(col[0]); img.data[k + 1] = clamp(col[1]); img.data[k + 2] = clamp(col[2]); img.data[k + 3] = 255;
    hgt[y * w + x] = hv; rough[y * w + x] = ro;
  }
  ctx.putImageData(img, 0, 0);
  const rc = canvas(w, h), rctx = rc.getContext('2d'), rimg = rctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const v = clamp(rough[i] * 255); rimg.data[i * 4] = v; rimg.data[i * 4 + 1] = v; rimg.data[i * 4 + 2] = v; rimg.data[i * 4 + 3] = 255; }
  rctx.putImageData(rimg, 0, 0);
  const rep = 1 / worldSize;
  const map = finish(c); map.repeat.set(rep, rep);
  const nmap = finish(normalFromHeight(hgt, w, h, kind === 'zellige' ? 3.2 : 1.4), { srgb: false }); nmap.repeat.set(rep, rep);
  const rmap = finish(rc, { srgb: false }); rmap.repeat.set(rep, rep);
  return { map, normalMap: nmap, roughnessMap: rmap };
}

export function plasterSet({ base = 0xefe9df, amp = 0.025, worldSize = 3, size = 512, seed = 1, trowel = 1 } = {}) {
  const w = size, c = canvas(w), ctx = c.getContext('2d'), img = ctx.createImageData(w, w);
  const hgt = new Float32Array(w * w), rgh = new Float32Array(w * w);
  const B0 = hex(base);
  const P = Math.max(3, Math.round(worldSize * 2.4)), PT = P * 3, PG = Math.max(64, Math.round(w / 3));
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / w;
    const n = fbm2(N1, u * P + seed, v * P, 5, P, P);
    // trowel: elongated, slightly rotated strokes
    const tr = fbm2(N2, u * PT + v * P, v * PT * 0.35, 3, PT, PT);
    const stroke = Math.pow(Math.abs(tr - 0.5) * 2, 3) * trowel;
    const g = N3(u * PG, v * PG, PG, PG);
    const t = (n - 0.5) * amp * 2.2 - stroke * amp * 0.9 + (g - 0.5) * amp * 0.35;
    const i = (y * w + x) * 4;
    img.data[i] = clamp(B0[0] * (1 + t)); img.data[i + 1] = clamp(B0[1] * (1 + t)); img.data[i + 2] = clamp(B0[2] * (1 + t)); img.data[i + 3] = 255;
    hgt[y * w + x] = n * 0.55 + stroke * 0.25 + g * 0.2;
    rgh[y * w + x] = 0.9 + (g - 0.5) * 0.08 - stroke * 0.12;
  }
  ctx.putImageData(img, 0, 0);
  const rep = 1 / worldSize;
  const map = finish(c); map.repeat.set(rep, rep);
  const nmap = finish(normalFromHeight(hgt, w, w, 0.9), { srgb: false }); nmap.repeat.set(rep, rep);
  const rmap = finish(grayCanvas(rgh, w, w), { srgb: false }); rmap.repeat.set(rep, rep);
  return { map, normalMap: nmap, roughnessMap: rmap };
}

// ---------------------------------------------------------------------
// FABRIC — woven texture, colour + normal. Plain weave by default, twill with twill=true.
// Threads vary in thickness and tone (slub), with a soft fuzz layer so cloth never looks printed.
// ---------------------------------------------------------------------
export function fabricSet({ base = 0xcfc4b4, worldSize = 0.5, size = 512, weave = 64, slub = 0.08, seed = 2, twill = false } = {}) {
  const w = size, c = canvas(w), ctx = c.getContext('2d'), img = ctx.createImageData(w, w);
  const hgt = new Float32Array(w * w);
  const B0 = hex(base);
  const WV = Math.round(weave);
  const rng = rnd(seed * 31 + 7);
  const warpT = Float32Array.from({ length: WV }, () => (rng() - 0.5)), weftT = Float32Array.from({ length: WV }, () => (rng() - 0.5));
  const PF = Math.max(16, Math.round(WV / 4)), PZ = Math.max(64, Math.round(w / 2));
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const uu = (x / w) * WV, vv = (y / w) * WV, iu = Math.floor(uu), iv = Math.floor(vv);
    const fu = uu - iu, fv = vv - iv;
    const warp = Math.sin(fu * Math.PI), weft = Math.sin(fv * Math.PI);
    const up = twill ? ((iu + iv) % 4 < 2) : ((iu + iv) % 2 === 0);
    const over = up ? warp * (0.75 + 0.25 * Math.sin(fv * Math.PI)) : weft * (0.75 + 0.25 * Math.sin(fu * Math.PI));
    const thr = up ? warpT[iu % WV] : weftT[iv % WV];
    const n = fbm2(N1, (x / w) * PF + seed, (y / w) * PF * 0.25, 3, PF, Math.max(1, Math.round(PF * 0.25)));
    const fuzz = N2((x / w) * PZ, (y / w) * PZ, PZ, PZ);
    const t = (over - 0.5) * 0.12 + thr * slub * 0.9 + (n - 0.5) * slub * 1.6 + (fuzz - 0.5) * 0.05;
    const i = (y * w + x) * 4;
    img.data[i] = clamp(B0[0] * (1 + t)); img.data[i + 1] = clamp(B0[1] * (1 + t)); img.data[i + 2] = clamp(B0[2] * (1 + t)); img.data[i + 3] = 255;
    hgt[y * w + x] = over * 0.8 + thr * 0.1 + fuzz * 0.1;
  }
  ctx.putImageData(img, 0, 0);
  const rep = 1 / worldSize;
  const map = finish(c); map.repeat.set(rep, rep);
  const nmap = finish(normalFromHeight(hgt, w, w, 1.8), { srgb: false }); nmap.repeat.set(rep, rep);
  return { map, normalMap: nmap };
}

// ---------------------------------------------------------------------
// FLUTED / RIBBED normal map (vertical flutes). pitch in metres.
// ---------------------------------------------------------------------
export function flutedNormal({ pitch = 0.03, worldSize = 0.6, size = 256, convex = true } = {}) {
  const w = size, h = 8, hgt = new Float32Array(w * h);
  const n = worldSize / pitch;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = ((x / w) * n) % 1;
    const s = Math.sin(t * Math.PI);
    hgt[y * w + x] = convex ? Math.sqrt(Math.max(0, s)) : 1 - Math.sqrt(Math.max(0, s));
  }
  const t = finish(normalFromHeight(hgt, w, h, 6), { srgb: false });
  t.repeat.set(1 / worldSize, 1);
  return t;
}

// ---------------------------------------------------------------------
// JAALI (geometric lattice) alpha map — white = solid
// ---------------------------------------------------------------------
export function jaaliAlpha({ size = 512, cells = 6, style = 'star' } = {}) {
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
  const cs = size / cells;
  ctx.fillStyle = '#000';
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
    const cx = i * cs + cs / 2, cy = j * cs + cs / 2;
    if (style === 'star') {
      ctx.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2 + Math.PI / 8;
        const r = k % 2 ? cs * 0.2 : cs * 0.42;
        const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    } else if (style === 'lattice') {
      // classic interlaced lattice: rounded-diamond voids with a small circle at each node
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
      const s = cs * 0.5, r = cs * 0.08;
      ctx.beginPath(); ctx.moveTo(-s / 2 + r, -s / 2); ctx.lineTo(s / 2 - r, -s / 2); ctx.quadraticCurveTo(s / 2, -s / 2, s / 2, -s / 2 + r); ctx.lineTo(s / 2, s / 2 - r); ctx.quadraticCurveTo(s / 2, s / 2, s / 2 - r, s / 2); ctx.lineTo(-s / 2 + r, s / 2); ctx.quadraticCurveTo(-s / 2, s / 2, -s / 2, s / 2 - r); ctx.lineTo(-s / 2, -s / 2 + r); ctx.quadraticCurveTo(-s / 2, -s / 2, -s / 2 + r, -s / 2); ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.arc(i * cs, j * cs, cs * 0.09, 0, Math.PI * 2); ctx.fill();
    } else if (style === 'slat') {
      ctx.fillRect(i * cs + cs * 0.3, 0, cs * 0.4, size);
    } else {
      ctx.beginPath(); ctx.arc(cx, cy, cs * 0.36, 0, Math.PI * 2); ctx.fill();
    }
  }
  const t = finish(c, { srgb: false });
  return t;
}

// rattan / cane weave colour + alpha
export function caneSet({ base = 0xc9a77a, size = 256, cells = 16 } = {}) {
  const c = canvas(size), ctx = c.getContext('2d');
  const B0 = hex(base);
  ctx.fillStyle = `rgb(${B0[0] * 0.5},${B0[1] * 0.5},${B0[2] * 0.5})`; ctx.fillRect(0, 0, size, size);
  const cs = size / cells;
  ctx.strokeStyle = `rgb(${B0[0]},${B0[1]},${B0[2]})`; ctx.lineWidth = cs * 0.28;
  for (let i = 0; i <= cells; i++) {
    ctx.beginPath(); ctx.moveTo(i * cs, 0); ctx.lineTo(i * cs, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * cs); ctx.lineTo(size, i * cs); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * cs - size, 0); ctx.lineTo(i * cs, size); ctx.stroke();
  }
  return finish(c);
}

// leaf alpha + colour (single leaf on transparent canvas)
export function leafTexture({ size = 256, color = 0x4f7a3a, vein = 0x8db070, shape = 'broad' } = {}) {
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const C0 = hex(color), V0 = hex(vein);
  const g = ctx.createLinearGradient(0, 0, size, 0);
  g.addColorStop(0, `rgb(${C0[0] * 0.75},${C0[1] * 0.75},${C0[2] * 0.75})`);
  g.addColorStop(0.5, `rgb(${C0[0]},${C0[1]},${C0[2]})`);
  g.addColorStop(1, `rgb(${C0[0] * 0.8},${C0[1] * 0.8},${C0[2] * 0.8})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  const wv = shape === 'broad' ? 0.42 : shape === 'fern' ? 0.25 : 0.14;
  ctx.moveTo(size / 2, size * 0.98);
  ctx.bezierCurveTo(size * (0.5 - wv * 1.2), size * 0.7, size * (0.5 - wv), size * 0.2, size / 2, size * 0.02);
  ctx.bezierCurveTo(size * (0.5 + wv), size * 0.2, size * (0.5 + wv * 1.2), size * 0.7, size / 2, size * 0.98);
  ctx.fill();
  ctx.strokeStyle = `rgba(${V0[0]},${V0[1]},${V0[2]},0.8)`; ctx.lineWidth = size * 0.012;
  ctx.beginPath(); ctx.moveTo(size / 2, size * 0.98); ctx.lineTo(size / 2, size * 0.05); ctx.stroke();
  ctx.lineWidth = size * 0.005;
  for (let k = 0.15; k < 0.9; k += 0.09) {
    ctx.beginPath(); ctx.moveTo(size / 2, size * (k + 0.05));
    ctx.lineTo(size * (0.5 - wv * 0.8), size * k); ctx.moveTo(size / 2, size * (k + 0.05)); ctx.lineTo(size * (0.5 + wv * 0.8), size * k); ctx.stroke();
  }
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// abstract artwork canvas in the house palette
export function artTexture({ w = 512, h = 640, palette = ['#d8cfc2', '#b8a58c', '#7d6a58', '#e9e3da', '#5f6b6a'], seed = 1, style = 'arcs' } = {}) {
  const c = canvas(w, h), ctx = c.getContext('2d');
  let s = seed * 7919;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  ctx.fillStyle = palette[3]; ctx.fillRect(0, 0, w, h);
  if (style === 'arcs') {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = palette[Math.floor(r() * palette.length)];
      ctx.globalAlpha = 0.55 + r() * 0.4;
      ctx.beginPath();
      const cx = r() * w, cy = h * (0.3 + r() * 0.7), rad = w * (0.15 + r() * 0.45);
      ctx.arc(cx, cy, rad, Math.PI, 0); ctx.fill();
    }
  } else if (style === 'blocks') {
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = palette[Math.floor(r() * palette.length)];
      ctx.globalAlpha = 0.5 + r() * 0.5;
      ctx.fillRect(r() * w * 0.7, r() * h * 0.7, w * (0.2 + r() * 0.4), h * (0.1 + r() * 0.35));
    }
  } else {
    // landscape horizon wash
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = palette[i % palette.length]; ctx.globalAlpha = 0.7;
      const y0 = h * (0.35 + i * 0.13);
      ctx.beginPath(); ctx.moveTo(0, y0);
      for (let x = 0; x <= w; x += 16) ctx.lineTo(x, y0 + Math.sin(x * 0.012 + i * 2 + seed) * 18 + (r() - 0.5) * 4);
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // canvas texture grain
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 10; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  ctx.putImageData(img, 0, 0);
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(1, 1);
  return t;
}

// radial soft blob (contact shadows / light pools / cove wash)
export function radialTexture({ size = 128, inner = 0, outer = 1, color = '#000', soft = true } = {}) {
  const c = canvas(size), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, (size / 2) * inner, size / 2, size / 2, (size / 2) * outer);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  if (!soft) g.addColorStop(0.7, color);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
export function linearFadeTexture({ size = 128, color = '#fff' } = {}) {
  const c = canvas(8, size), ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 8, size);
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
// rectangular soft shadow (for furniture footprints)
export function softRectTexture({ size = 128, margin = 0.22 } = {}) {
  const c = canvas(size), ctx = c.getContext('2d'), img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / (size - 1), v = y / (size - 1);
    const dx = Math.min(u, 1 - u) / margin, dy = Math.min(v, 1 - v) / margin;
    const a = Math.min(1, dx) * Math.min(1, dy);
    const i = (y * size + x) * 4;
    img.data[i] = 0; img.data[i + 1] = 0; img.data[i + 2] = 0; img.data[i + 3] = clamp(Math.pow(a, 1.4) * 255);
  }
  ctx.putImageData(img, 0, 0);
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// text sign texture (fire exit / labels)
export function signTexture(text, { w = 512, h = 192, bg = '#0f7a3c', fg = '#ffffff' } = {}) {
  const c = canvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  // running man pictogram (simple)
  ctx.save(); ctx.translate(h * 0.55, h * 0.5); ctx.lineCap = 'round'; ctx.strokeStyle = fg; ctx.lineWidth = h * 0.09;
  ctx.beginPath(); ctx.arc(h * 0.08, -h * 0.28, h * 0.08, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -h * 0.14); ctx.lineTo(-h * 0.06, h * 0.08); ctx.lineTo(h * 0.14, h * 0.3);
  ctx.moveTo(-h * 0.06, h * 0.08); ctx.lineTo(-h * 0.22, h * 0.28); ctx.moveTo(-h * 0.02, -h * 0.08); ctx.lineTo(h * 0.18, -h * 0.02);
  ctx.moveTo(-h * 0.02, -h * 0.08); ctx.lineTo(-h * 0.2, -h * 0.02); ctx.stroke(); ctx.restore();
  ctx.font = `bold ${h * 0.36}px Arial, Helvetica, sans-serif`; ctx.textBaseline = 'middle';
  ctx.fillText(text, h * 1.0, h * 0.52);
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// window view backdrop: soft sky + distant city silhouette (used on distant skyline panels)
export function skylineTexture({ w = 1024, h = 256, seed = 4 } = {}) {
  const c = canvas(w, h), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let layer = 0; layer < 3; layer++) {
    const tone = [190, 160, 130][layer];
    ctx.fillStyle = `rgba(${tone - 10},${tone - 4},${tone + 6},${0.55 + layer * 0.18})`;
    let x = 0;
    while (x < w) {
      const bw = 20 + r() * 70, bh = h * (0.15 + r() * (0.25 + layer * 0.1));
      ctx.fillRect(x, h - bh, bw, bh);
      x += bw + r() * 6;
    }
  }
  const t = finish(c);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// ---------------------------------------------------------------------
// TERRAZZO — polished cement matrix with marble chips
// ---------------------------------------------------------------------
export function terrazzoSet({ base = 0xe9e3d9, chips = [0x8c8a86, 0xc7744f, 0x2f2e2d, 0xf7f4ef, 0xb9a68c], worldSize = 1.2, size = 1024, seed = 5 } = {}) {
  const c = canvas(size), ctx = c.getContext('2d');
  const B0 = hex(base);
  ctx.fillStyle = `rgb(${B0[0]},${B0[1]},${B0[2]})`; ctx.fillRect(0, 0, size, size);
  let s = seed * 7919; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const hgt = new Float32Array(size * size).fill(0.5);
  const n = Math.round(size * size / 900);
  for (let i = 0; i < n; i++) {
    const col = hex(chips[Math.floor(r() * chips.length)]);
    const x = r() * size, y = r() * size, rad = (r() < 0.85 ? 2 + r() * 7 : 8 + r() * 16) * size / 1024;
    const tone = 0.85 + r() * 0.3;
    ctx.fillStyle = `rgb(${clamp(col[0] * tone)},${clamp(col[1] * tone)},${clamp(col[2] * tone)})`;
    ctx.beginPath();
    const k = 5 + Math.floor(r() * 4);
    for (let j = 0; j < k; j++) { const a = (j / k) * Math.PI * 2 + r() * 0.5; const rr = rad * (0.6 + r() * 0.5); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.closePath(); ctx.fill();
    // wrap chips at the edges so the texture tiles
    if (x < rad * 2 || y < rad * 2 || x > size - rad * 2 || y > size - rad * 2) { ctx.save(); ctx.translate(x < size / 2 ? size : -size, 0); ctx.fill(); ctx.restore(); ctx.save(); ctx.translate(0, y < size / 2 ? size : -size); ctx.fill(); ctx.restore(); }
  }
  // fine aggregate speckle
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < size * size; i++) { const v = (N3((i % size) * 0.9, Math.floor(i / size) * 0.9) - 0.5) * 18; img.data[i * 4] = clamp(img.data[i * 4] + v); img.data[i * 4 + 1] = clamp(img.data[i * 4 + 1] + v); img.data[i * 4 + 2] = clamp(img.data[i * 4 + 2] + v); }
  ctx.putImageData(img, 0, 0);
  const rep = 1 / worldSize;
  const map = finish(c); map.repeat.set(rep, rep);
  const nmap = finish(normalFromHeight(hgt, size, size, 0.2), { srgb: false }); nmap.repeat.set(rep, rep);
  return { map, normalMap: nmap };
}

// ---------------------------------------------------------------------
// CHEVRON PARQUET — 45° timber planks meeting on straight centre lines
// ---------------------------------------------------------------------
export function chevronSet({ base = 0x6e4c34, dark = 0x45301f, light = 0x8f6a4b, plankW = 0.084853, colW = 0.42, worldSize = 1.68, size = 1024, seed = 3 } = {}) {
  const c = canvas(size), ctx = c.getContext('2d');
  const px = size / worldSize;
  const C = colW * px, P = (plankW / Math.SQRT1_2) * px; // vertical pitch of a 45° plank
  const B0 = hex(base), D0 = hex(dark), L0 = hex(light);
  let s = seed * 104729; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const hgt = new Float32Array(size * size).fill(0.6);
  const cols = Math.round(size / C);
  const rowsN = Math.ceil(size / P) + 4;
  for (let i = 0; i < cols; i++) {
    const x0 = i * C, x1 = x0 + C, sg = i % 2 ? 1 : -1;
    for (let j = -2; j < rowsN; j++) {
      const b = j * P;
      const tone = (r() - 0.5) * 0.35;
      const mix = (a, bb, k) => a + (bb - a) * k;
      const k = 0.5 + tone;
      const col = k < 0.5 ? [mix(D0[0], B0[0], k * 2), mix(D0[1], B0[1], k * 2), mix(D0[2], B0[2], k * 2)] : [mix(B0[0], L0[0], (k - 0.5) * 2), mix(B0[1], L0[1], (k - 0.5) * 2), mix(B0[2], L0[2], (k - 0.5) * 2)];
      const y0 = sg > 0 ? b : b + C, y1 = sg > 0 ? b + C : b;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x1, y1 + P); ctx.lineTo(x0, y0 + P); ctx.closePath();
      ctx.fillStyle = `rgb(${clamp(col[0])},${clamp(col[1])},${clamp(col[2])})`; ctx.fill();
      ctx.clip();
      // grain running along the plank (45°)
      ctx.globalAlpha = 0.16;
      for (let g = 0; g < 26; g++) {
        const off = r() * P * 1.2 - P * 0.1;
        ctx.strokeStyle = r() < 0.5 ? `rgb(${D0[0]},${D0[1]},${D0[2]})` : `rgb(${L0[0]},${L0[1]},${L0[2]})`;
        ctx.lineWidth = 0.6 + r() * 1.6;
        ctx.beginPath(); ctx.moveTo(x0, y0 + off); ctx.bezierCurveTo(x0 + C * 0.33, y0 + off + (y1 - y0) * 0.33 + (r() - 0.5) * 3, x0 + C * 0.66, y0 + off + (y1 - y0) * 0.66 + (r() - 0.5) * 3, x1, y1 + off); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.restore();
      // joint lines
      ctx.strokeStyle = 'rgba(30,20,12,0.65)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(30,20,12,0.7)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, size); ctx.stroke();
  }
  // height from luminance for a subtle grain normal
  const img = ctx.getImageData(0, 0, size, size).data;
  for (let i = 0; i < size * size; i++) hgt[i] = (img[i * 4] + img[i * 4 + 1]) / 510;
  const rep = 1 / worldSize;
  const map = finish(c); map.repeat.set(rep, rep);
  const nmap = finish(normalFromHeight(hgt, size, size, 0.9), { srgb: false }); nmap.repeat.set(rep, rep);
  return { map, normalMap: nmap };
}

// ---------------------------------------------------------------------
// FACADE tile for neighbouring apartment blocks: 4 bays x 4 floors (14 m x 12.6 m)
// returns colour map + emissive map (randomly lit windows for night)
// ---------------------------------------------------------------------
export function facadeTile({ size = 512, seed = 3, wall = '#ddd5c8', trim = '#c9c0b2' } = {}) {
  const W = size, H = size;
  const c = canvas(W, H), ctx = c.getContext('2d');
  const e = canvas(W, H), ex = e.getContext('2d');
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  ctx.fillStyle = wall; ctx.fillRect(0, 0, W, H);
  let s = seed * 7919; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const bw = W / 4, fh = H / 4, mx = W / 14, my = H / 12.6;
  for (let f = 0; f < 4; f++) {
    const y0 = H - (f + 1) * fh;
    ctx.fillStyle = trim; ctx.fillRect(0, y0 + fh - 0.22 * my, W, 0.22 * my);
    for (let b = 0; b < 4; b++) {
      const x0 = b * bw;
      const balcony = (b + f) % 3 === 0;
      const ww = (balcony ? 2.4 : 1.7) * mx, wh = (balcony ? 2.2 : 1.35) * my;
      const wx = x0 + (bw - ww) / 2, wy = y0 + fh - 0.22 * my - (balcony ? 0.05 : 0.9) * my - wh;
      ctx.fillStyle = '#3b3d40'; ctx.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
      const gr = ctx.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, '#9fb3c4'); gr.addColorStop(0.55, '#6f8494'); gr.addColorStop(1, '#4c5964');
      ctx.fillStyle = gr; ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(wx + ww * 0.1, wy, ww * 0.12, wh);
      ctx.fillStyle = '#3b3d40'; ctx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
      if (balcony) {
        ctx.fillStyle = 'rgba(70,72,75,0.85)'; ctx.fillRect(wx - 0.3 * mx, wy + wh - 1.0 * my, ww + 0.6 * mx, 0.08 * my);
        for (let k = 0; k < 12; k++) ctx.fillRect(wx - 0.3 * mx + k * (ww + 0.6 * mx) / 11, wy + wh - 1.0 * my, 2, 1.0 * my);
      }
      ctx.fillStyle = trim; ctx.fillRect(wx - 0.25 * mx, wy - 0.18 * my, ww + 0.5 * mx, 0.12 * my);
      if (r() < 0.42) {
        const lg = ex.createLinearGradient(0, wy, 0, wy + wh); const warm = r() < 0.8 ? '255,196,130' : '210,225,255';
        lg.addColorStop(0, `rgba(${warm},0.55)`); lg.addColorStop(1, `rgba(${warm},0.95)`);
        ex.fillStyle = lg; ex.fillRect(wx, wy, ww, wh);
        ex.fillStyle = '#000'; ex.fillRect(wx + ww / 2 - 2, wy, 4, wh);
      }
    }
  }
  return { map: finish(c), emissiveMap: finish(e) };
}

export function grassTexture({ size = 512 } = {}) {
  const c = canvas(size), ctx = c.getContext('2d'), img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = fbm(N1, x / 64, y / 64, 4, 8), m = fbm(N2, x / 8, y / 8, 2, 64);
    const i = (y * size + x) * 4;
    img.data[i] = 92 + n * 40 + m * 18; img.data[i + 1] = 118 + n * 42 + m * 20; img.data[i + 2] = 64 + n * 22; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return finish(c);
}

// ---------------------------------------------------------------------
// MICRO-SURFACE MAPS — what stops CG surfaces looking factory-perfect.
// smudgeSet: roughness variation for glossy finishes (faint wipe arcs, blotches, hairline scratches).
//   Values ≈ 0.7–1.0 (mean ≈ 0.86); use with material.roughness ≈ target / 0.86.
// brushedSet: directional brushed-metal normal + roughness streaks.
// peelSet: lacquer / paint orange-peel normal with a faint roughness wash.
// leatherSet: pebbled hide grain (normal + roughness), colour lives in material.color.
// ---------------------------------------------------------------------
export function smudgeSet({ size = 512, seed = 5 } = {}) {
  const w = size, rgh = new Float32Array(w * w), hgt = new Float32Array(w * w);
  const rng = rnd(seed * 53 + 1);
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / w;
    const b = fbm2(N1, u * 5 + seed, v * 5, 4, 5, 5);
    const s = fbm2(N2, u * 12, v * 12, 3, 12, 12);
    rgh[y * w + x] = 0.86 + (b - 0.5) * 0.22 + (s - 0.5) * 0.08;
    hgt[y * w + x] = 0.5;
  }
  // wipe arcs + hairline scratches (drawn into the field, wrapped)
  const arcs = Math.round(w / 40);
  for (let a = 0; a < arcs; a++) {
    const cx = rng() * w, cy = rng() * w, R = w * (0.08 + rng() * 0.3), a0 = rng() * Math.PI * 2, span = 0.6 + rng() * 1.6, wd = 2 + rng() * 6, k = 0.04 + rng() * 0.05;
    for (let t = 0; t < span; t += 1 / R) {
      const px = cx + Math.cos(a0 + t) * R, py = cy + Math.sin(a0 + t) * R;
      for (let d = -wd; d <= wd; d++) {
        const qx = Math.round(px + Math.cos(a0 + t) * d), qy = Math.round(py + Math.sin(a0 + t) * d);
        const idx = (((qy % w) + w) % w) * w + (((qx % w) + w) % w);
        rgh[idx] -= k * (1 - Math.abs(d) / (wd + 1));
      }
    }
  }
  const sc = Math.round(w / 6);
  for (let a = 0; a < sc; a++) {
    let px = rng() * w, py = rng() * w; const ang = rng() * Math.PI * 2, len = w * (0.02 + rng() * 0.12), k = 0.06 + rng() * 0.1;
    for (let t = 0; t < len; t++) {
      px += Math.cos(ang); py += Math.sin(ang);
      const idx = (((Math.round(py) % w) + w) % w) * w + (((Math.round(px) % w) + w) % w);
      rgh[idx] += k; hgt[idx] -= 0.25;
    }
  }
  for (let i = 0; i < rgh.length; i++) rgh[i] = Math.max(0.55, Math.min(1, rgh[i]));
  const rmap = finish(grayCanvas(rgh, w, w), { srgb: false });
  const nmap = finish(normalFromHeight(hgt, w, w, 0.8), { srgb: false });
  return { roughnessMap: rmap, normalMap: nmap };
}

export function brushedSet({ size = 512, seed = 9 } = {}) {
  const w = size, hgt = new Float32Array(w * w), rgh = new Float32Array(w * w);
  const PU = 3, PV = Math.round(w / 1.5);
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / w;
    const streak = fbm2(N1, u * PU + seed, v * PV, 2, PU, PV);
    const fine = N2(u * PU * 8, v * PV * 0.5, PU * 8, Math.round(PV * 0.5));
    hgt[y * w + x] = streak * 0.7 + fine * 0.3;
    rgh[y * w + x] = 0.82 + (streak - 0.5) * 0.3 + (fine - 0.5) * 0.1;
  }
  return { normalMap: finish(normalFromHeight(hgt, w, w, 1.2), { srgb: false }), roughnessMap: finish(grayCanvas(rgh, w, w), { srgb: false }) };
}

export function peelSet({ size = 512, seed = 4, cells = 90 } = {}) {
  const w = size, hgt = new Float32Array(w * w), rgh = new Float32Array(w * w);
  const C = Math.round(cells);
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / w;
    const p = fbm2(N3, u * C + seed, v * C, 2, C, C);
    const b = fbm2(N1, u * 4, v * 4, 3, 4, 4);
    hgt[y * w + x] = p;
    rgh[y * w + x] = 0.88 + (b - 0.5) * 0.18 + (p - 0.5) * 0.05;
  }
  return { normalMap: finish(normalFromHeight(hgt, w, w, 0.7), { srgb: false }), roughnessMap: finish(grayCanvas(rgh, w, w), { srgb: false }) };
}

export function leatherSet({ size = 512, seed = 6, cells = 46 } = {}) {
  const w = size, hgt = new Float32Array(w * w), rgh = new Float32Array(w * w), c = canvas(w), ctx = c.getContext('2d'), img = ctx.createImageData(w, w);
  const C = Math.round(cells);
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / w;
    // pebbles: cell-ish pattern from the min of two offset value-noise layers
    const a = N1(u * C + seed, v * C, C, C), b = N2(u * C * 1.7 + 3, v * C * 1.7, Math.round(C * 1.7), Math.round(C * 1.7));
    const peb = 1 - Math.pow(Math.abs(a - b), 0.6);
    const tone = fbm2(N3, u * 6, v * 6, 3, 6, 6);
    hgt[y * w + x] = peb;
    rgh[y * w + x] = 0.78 + (1 - peb) * 0.2 + (tone - 0.5) * 0.12;
    const t = 1 + (tone - 0.5) * 0.12 - (1 - peb) * 0.08;
    const i = (y * w + x) * 4; img.data[i] = clamp(235 * t); img.data[i + 1] = clamp(235 * t); img.data[i + 2] = clamp(235 * t); img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { map: finish(c), normalMap: finish(normalFromHeight(hgt, w, w, 1.6), { srgb: false }), roughnessMap: finish(grayCanvas(rgh, w, w), { srgb: false }) };
}

// ---------------------------------------------------------------------
// DIRT — dusty, compacted earth with grit, pebbles and faint tyre tracks (seamless, small)
// ---------------------------------------------------------------------
export function dirtTexture({ size = 512, seed = 3 } = {}) {
  const w = size, c = canvas(w), ctx = c.getContext('2d'), img = ctx.createImageData(w, w);
  const B0 = [181, 160, 128];
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / w;
    const n = fbm2(N1, u * 6 + seed, v * 6, 5, 6, 6), g = N2(u * 180, v * 180, 180, 180), tr = fbm2(N3, u * 2, v * 24, 2, 2, 24);
    const peb = N3(u * 90 + 7, v * 90, 90, 90) > 0.86 ? 0.82 : 1;
    const t = (n - 0.5) * 0.32 + (g - 0.5) * 0.12 - Math.max(0, tr - 0.62) * 0.4;
    const i = (y * w + x) * 4;
    img.data[i] = clamp(B0[0] * (1 + t) * peb); img.data[i + 1] = clamp(B0[1] * (1 + t) * peb); img.data[i + 2] = clamp(B0[2] * (1 + t * 1.1) * peb); img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return finish(c);
}
