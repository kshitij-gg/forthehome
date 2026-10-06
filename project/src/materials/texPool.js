// Pool of texture workers (inlined into the bundle so it also works from file://).
// Falls back to main-thread generation when workers/OffscreenCanvas are unavailable.
// Sizes scale with the quality tier, and every generated set is cached in IndexedDB (WebP colour,
// PNG data maps) so later visits decode cached images instead of re-synthesising them.
import * as THREE from 'three';
import * as T from './textures.js';
import TexWorker from './texWorker.js?worker&inline';

const VERSION = 'tex-v6';
let workers = null, rr = 0, seq = 0, SCALE = 1;
const pending = new Map();
const DEF = { woodSet: 1024, tileSet: 1024, patternSet: 1024, terrazzoSet: 1024, chevronSet: 1024, plasterSet: 512, fabricSet: 512, smudgeSet: 512, brushedSet: 512, peelSet: 512, leatherSet: 512 };

/** Texture resolution multiplier for this device (quality tier). */
export function setTextureScale(s) { SCALE = s || 1; }
export const texStats = { generated: 0, cached: 0, ms: 0 };

function scaled(fn, args) {
  if (SCALE === 1 || !DEF[fn]) return args;
  const base = args.size || DEF[fn];
  const size = Math.max(128, Math.min(2048, Math.round((base * SCALE) / 64) * 64));
  const out = { ...args, size };
  if (fn === 'tileSet') out.groutPx = args.groutPx === 0 ? 0 : Math.max(1, Math.round((args.groutPx ?? 2) * Math.max(0.75, size / base)));
  return out;
}

// ---------- IndexedDB cache ----------
let dbP = null;
function db() {
  if (dbP) return dbP;
  dbP = new Promise((res) => {
    try {
      if (typeof indexedDB === 'undefined') return res(null);
      const r = indexedDB.open('residence-textures', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('t');
      r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null);
    } catch { res(null); }
  });
  return dbP;
}
async function cacheGet(key) {
  const d = await db(); if (!d) return null;
  return new Promise((res) => { try { const q = d.transaction('t').objectStore('t').get(key); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch { res(null); } });
}
async function cachePut(key, val) {
  const d = await db(); if (!d) return;
  try { d.transaction('t', 'readwrite').objectStore('t').put(val, key); } catch { /* quota or private mode */ }
}

function failAll() {
  workers = [];
  for (const [id, p] of pending) { pending.delete(id); p.reject(new Error('worker unavailable')); }
}
function init() {
  if (workers !== null) return workers;
  try {
    if (typeof OffscreenCanvas === 'undefined' || !('transferToImageBitmap' in OffscreenCanvas.prototype)) throw new Error('no OffscreenCanvas');
    const n = Math.max(2, Math.min(6, (navigator.hardwareConcurrency || 4) - 1));
    workers = Array.from({ length: n }, () => {
      const w = new TexWorker();
      w.onmessage = (e) => { const p = pending.get(e.data.id); if (!p) return; pending.delete(e.data.id); e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data.parts); };
      w.onerror = (ev) => { ev.preventDefault?.(); failAll(); };
      return w;
    });
  } catch { workers = []; }
  return workers;
}

function toTexture(part, aniso) {
  const t = new THREE.Texture(part.bitmap);
  t.flipY = false; // ImageBitmaps are uploaded as-is
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = part.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.repeat.set(part.repeat[0], part.repeat[1]);
  t.rotation = part.rotation || 0;
  t.anisotropy = aniso;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
const shape = (parts, aniso) => {
  if (parts._) return toTexture(parts._, aniso);
  const out = {};
  for (const [k, v] of Object.entries(parts)) out[k] = toTexture(v, aniso);
  return out;
};

/** Generate a texture set by generator name. Resolves to the same shape the generator returns. */
export async function gen(fn, args = {}, aniso = 8) {
  const a = scaled(fn, args);
  const t0 = performance.now();
  const ws = init();
  if (!ws.length) { texStats.generated++; return T[fn](a); }
  const key = VERSION + ':' + fn + ':' + JSON.stringify(a);
  // 1) cache hit → decode the stored images off the main thread
  const hit = await cacheGet(key);
  if (hit && hit.parts) {
    try {
      const parts = {};
      for (const [k, v] of Object.entries(hit.parts)) parts[k] = { ...v, bitmap: await createImageBitmap(v.blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }) };
      texStats.cached++; texStats.ms += performance.now() - t0;
      return shape(parts, aniso);
    } catch { /* fall through and regenerate */ }
  }
  // 2) synthesise on a worker, then store the encoded result
  const id = ++seq;
  const parts = await new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws[rr++ % ws.length].postMessage({ id, fn, args: a, encode: true });
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('timeout')); } }, 30000);
  }).catch(() => null);
  if (!parts) { texStats.generated++; return T[fn](a); } // worker failed → main thread
  texStats.generated++; texStats.ms += performance.now() - t0;
  if (Object.values(parts).every((p) => p.blob)) {
    const store = {};
    for (const [k, v] of Object.entries(parts)) store[k] = { blob: v.blob, srgb: v.srgb, repeat: v.repeat, rotation: v.rotation };
    cachePut(key, { parts: store });
  }
  return shape(parts, aniso);
}
