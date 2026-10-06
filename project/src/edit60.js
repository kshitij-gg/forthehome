// 60-second INSANE showcase edit — section sequencer on the hyper-motion toolkit.
// Every section draws with LOCAL time; sub-frame motion blur, FX pass and encoder as in edit.js.
// 120 BPM (beat 0.5 s); all section starts land on bar lines so the soundtrack locks to picture.
import * as THREE from 'three';
import { PALETTES, FLOOR_OPTIONS, SURFACES } from './design/design.js';
import { NIGHT_STYLES } from './lighting/lighting.js';

const W = 1920, H = 1080, BEAT = 0.5, TAU = Math.PI * 2;
const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const HEAVY = '"Segoe UI Black", "Segoe UI", Arial, sans-serif';
const GOLD = '#e3c79a';
const SURF = SURFACES.map((s) => s.id);
const LIVING = ['hall', 'dining', 'kitchen', 'corridor', 'entry'];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => { x = clamp01(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const expoOut = (x) => { x = clamp01(x); return x === 1 ? 1 : 1 - 2 ** (-9 * x); };
const expoIn = (x) => { x = clamp01(x); return x === 0 ? 0 : 2 ** (10 * x - 10); };
const back = (x) => { x = clamp01(x); const c = 1.9; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const L3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const noise1 = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };
const hex = (c) => '#' + new THREE.Color(c).getHexString();

// ---------------------------------------------------------------- timeline (seconds)
export const SECTIONS = [
  ['intro', 0, 2], ['plan', 2, 8], ['flightA', 8, 12], ['colour', 12, 19], ['flightB', 19, 23], ['floor', 23, 28],
  ['rooms', 28, 32], ['light', 32, 40], ['flightC', 40, 44], ['beforeafter', 44, 50], ['bedrooms', 50, 54], ['finale', 54, 58], ['end', 58, 60],
];
const TOTAL = 60;

const S = {
  office: { p: [[10.95, 9.0, 1.5], [11.9, 10.0, 1.25]], l: [[12.4, 11.5, 0.95], [13.2, 11.2, 0.9]], fov: 74 },
  deoghar: { p: [[10.35, 7.08, 1.65], [11.25, 7.2, 1.35]], l: [[12.9, 7.2, 1.35], [12.9, 7.22, 1.25]], fov: 66 },
  living: { p: [[9.6, 6.9, 1.9], [8.4, 6.2, 1.35]], l: [[6.2, 6.2, 0.9], [5.8, 5.0, 0.8]], fov: 76 },
  balcony: { p: [[9.3, 5.85, 1.5], [10.45, 5.95, 1.6]], l: [[12.6, 5.2, 1.2], [13.0, 4.0, 1.3]], fov: 76 },
  dining: { p: [[6.8, 4.1, 1.9], [6.5, 2.9, 1.4]], l: [[5.0, 2.95, 0.8], [4.8, 2.6, 0.85]], fov: 70 },
  kitchen: { p: [[6.95, 2.6, 1.7], [7.85, 2.35, 1.35]], l: [[9.6, 2.4, 1.2], [9.6, 1.4, 1.0]], fov: 72 },
  master: { p: [[2.62, 5.3, 1.75], [2.75, 3.6, 1.35]], l: [[0.2, 3.1, 1.2], [0.1, 2.6, 1.0]], fov: 72 },
  masterHold: { p: [[2.72, 4.1, 1.6], [2.74, 3.75, 1.5]], l: [[0.1, 2.85, 0.9], [0.1, 2.8, 0.85]], fov: 72 },
  kids: { p: [[2.85, 8.0, 1.75], [3.2, 9.25, 1.4]], l: [[0.6, 10.0, 1.0], [0.6, 10.4, 0.9]], fov: 74 },
  kidsHold: { p: [[3.15, 9.0, 1.65], [3.2, 9.2, 1.55]], l: [[0.5, 10.2, 1.0], [0.5, 10.25, 0.95]], fov: 72 },
  livHold: { p: [[9.42, 5.95, 1.7], [9.05, 5.35, 1.45]], l: [[6.3, 6.6, 0.85], [6.4, 6.2, 0.9]], fov: 68 },
  baHold: { p: [[9.5, 6.4, 1.75], [9.1, 5.7, 1.55]], l: [[6.2, 6.4, 0.9], [6.3, 6.0, 0.9]], fov: 72 },
  floorSkim: { p: [[9.45, 7.4, 0.32], [9.25, 5.9, 0.22]], l: [[8.3, 2.6, 0.04], [8.0, 2.0, 0.02]], fov: 80 },
  lapse: { p: [[5.6, 4.55, 1.3], [7.0, 5.15, 1.7]], l: [[10.5, 5.5, 1.1], [10.6, 6.1, 1.2]], fov: 76 },
  livNight: { p: [[10.25, 5.95, 1.75], [9.2, 5.5, 1.45]], l: [[6.2, 6.2, 1.05], [6.4, 6.7, 1.0]], fov: 72 },
  intro: { p: [[9.9, 6.0, 1.3], [9.0, 5.75, 1.6]], l: [[6.0, 6.3, 1.0], [6.2, 6.4, 1.1]], fov: 70 },
  officeBal: { p: [[12.6, 9.9, 1.6], [13.6, 9.92, 1.5]], l: [[16.0, 9.9, 1.3], [16.5, 9.5, 1.2]], fov: 74 },
};
const PAL_ORDER = ['beige', 'blue', 'green', 'grey', 'brown', 'terracotta'];
const FLOOR_FLIP = ['porcelain', 'nero', 'travertine', 'concrete', 'terrazzo', 'chevron', 'oak', 'statuario'];
const SLICES = ['statuario', 'nero', 'terrazzo', 'chevron'];
const MOODS = ['amber', 'blue', 'violet', 'accent'];
const FINALE = [['office', 'OFFICE'], ['deoghar', 'DEOGHAR'], ['living', 'LIVING'], ['dining', 'DINING'], ['kitchen', 'KITCHEN'], ['kids', 'KIDS'], ['master', 'MASTER'], ['balcony', 'BALCONY']];
const GRID9 = [['office', 'OFFICE'], ['deoghar', 'DEOGHAR'], ['living', 'LIVING'], ['balcony', 'BALCONY'], ['livNight', 'LOUNGE'], ['dining', 'DINING'], ['kitchen', 'KITCHEN'], ['kids', 'KIDS'], ['master', 'MASTER']];
const TRIPTYCH = [[['office', 'OFFICE'], ['deoghar', 'DEOGHAR'], ['officeBal', 'OFFICE BALCONY']], [['dining', 'DINING'], ['kitchen', 'KITCHEN'], ['master', 'MASTER SUITE']]];
const PLAN_TAGS = [['OFFICE', 12.1, 9.9], ['DEOGHAR', 11.8, 7.2], ['LIVING', 7.0, 5.8], ['BALCONY', 10.8, 5.2], ['DINING', 5.1, 2.8], ['KITCHEN', 8.2, 1.8], ['MASTER', 1.7, 3.2], ['KIDS', 2.2, 10.0], ['DRESSING', 5.4, 8.5]];
// FPV routes (plan x, y, height) + a tag per waypoint
const ROUTES = {
  A: { pts: [[9.75, 8.35, 1.7], [9.5, 7.35, 1.5], [9.75, 6.85, 1.6], [8.6, 6.4, 1.95], [7.4, 5.6, 1.7], [6.75, 4.2, 1.4], [6.6, 3.1, 1.2], [7.75, 2.45, 1.05]], tags: ['ARRIVAL', 'ENTRANCE', 'FOYER', 'LIVING', 'LOUNGE', 'DINING', 'DINING', 'KITCHEN'] },
  B: { pts: [[6.3, 6.9, 1.8], [4.6, 7.05, 1.65], [3.2, 7.2, 1.55], [2.88, 7.9, 1.5], [2.7, 8.9, 1.45], [1.9, 9.8, 1.35], [2.6, 10.9, 1.25]], tags: ['LIVING', 'PASSAGE', 'CORRIDOR', "KIDS' ROOM", "KIDS' ROOM", "KIDS' ROOM", 'WINDOW SEAT'] },
  C: { pts: [[7.75, 2.45, 1.4], [6.7, 3.3, 1.5], [6.8, 4.6, 1.7], [8.0, 5.9, 1.9], [9.2, 5.9, 1.6], [10.4, 5.95, 1.5]], tags: ['KITCHEN', 'DINING', 'DINING', 'LIVING', 'LIVING', 'BALCONY'] },
};

// ---------------------------------------------------------------- FX pass
function createFxPass() {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const gl = c.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
  const vs = `#version 300 es
in vec2 p; out vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
  const fs = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform vec2 uRes, uBlur, uCenter;
uniform float uZoom, uChroma, uFlash, uGrain, uTime, uVig, uGlitch, uExpo, uBars, uRadial;
in vec2 vUv; out vec4 o;
float h(float n){ return fract(sin(n) * 43758.5453); }
void main(){
  vec2 uv = vUv;
  if (uGlitch > 0.0) { float row = floor(uv.y * 34.0); float r = h(row + floor(uTime * 30.0) * 7.13);
    if (r < uGlitch * 0.55) uv.x += (h(row * 3.7 + floor(uTime * 30.0)) - 0.5) * 0.14 * uGlitch; }
  vec2 d = uv - 0.5;
  vec2 cuv = uCenter + (uv - uCenter) / uZoom;
  vec3 c = vec3(0.0);
  for (int i = 0; i < 16; i++) {
    float k = float(i) / 15.0;
    vec2 u = cuv + uBlur * (k - 0.5) / uRes;
    u = uCenter + (u - uCenter) * (1.0 - uRadial * k);
    vec2 ca = d * uChroma / uRes.x * 2.0;
    c.r += texture(uTex, u + ca).r; c.g += texture(uTex, u).g; c.b += texture(uTex, u - ca).b;
  }
  c /= 16.0; c *= uExpo; c = mix(c, vec3(1.0), uFlash);
  float vg = smoothstep(1.0, 0.32, length(d * vec2(1.25, 1.0))); c *= mix(1.0, vg, uVig);
  c += (h(uv.x * 1931.0 + uv.y * 7717.0 + fract(uTime * 13.7) * 311.0) - 0.5) * uGrain;
  if (abs(uv.y - 0.5) > 0.5 - uBars * 0.5) c = vec3(0.0);
  o = vec4(c, 1.0);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const names = ['uTex', 'uRes', 'uBlur', 'uCenter', 'uZoom', 'uChroma', 'uFlash', 'uGrain', 'uTime', 'uVig', 'uGlitch', 'uExpo', 'uBars', 'uRadial'];
  const u = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(pr, n)]));
  gl.viewport(0, 0, W, H);
  return {
    canvas: c,
    draw(src, f) {
      gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.uniform1i(u.uTex, 0); gl.uniform2f(u.uRes, W, H); gl.uniform2f(u.uBlur, f.blur[0], f.blur[1]); gl.uniform2f(u.uCenter, f.center[0], f.center[1]);
      gl.uniform1f(u.uZoom, f.zoom); gl.uniform1f(u.uChroma, f.chroma); gl.uniform1f(u.uFlash, f.flash); gl.uniform1f(u.uGrain, f.grain);
      gl.uniform1f(u.uTime, f.time); gl.uniform1f(u.uVig, f.vig); gl.uniform1f(u.uGlitch, f.glitch); gl.uniform1f(u.uExpo, f.expo); gl.uniform1f(u.uBars, f.bars); gl.uniform1f(u.uRadial, f.radial);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}

export function createEdit60(ctx) {
  const { renderer, camera, ctl, doors, tour, lighting, design, arch, renderNow, setRecording, setSize, setCutaway, captureProbe, tick, fans } = ctx;
  const api = { progress: { frame: 0, total: 0, done: false, error: null } };
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; };
  const [comp, g] = mk(); const [prevC, pg] = mk(); const [acc, ag] = mk(); const [altC, xg] = mk();
  let fx = null; const flights = {}; const floorMat = {};

  // ---------------------------------------------------------------- state
  let stateKey = ''; let curPal = {};
  const lightKey = () => JSON.stringify(lighting.state);
  function setLight(patch) { const b = lightKey(); lighting.apply(patch); return lightKey() !== b; }
  function setFloor(id, rooms) { for (const fm of arch.floorMeshes) if (rooms.includes(fm.userData.room)) fm.material = floorMat[id]; }
  const DEF = { hall: 'beige', dining: 'beige', kitchen: 'beige', mbed: 'beige', chbed: 'blue', office: 'grey', entry: 'beige', corridor: 'beige', washing: 'beige' };
  function scheme(name) {
    if (stateKey === name) return false;
    stateKey = name; curPal = {};
    for (const r of Object.keys(DEF)) design.applyPalette(DEF[r], [r], SURF);
    setFloor('porcelain', LIVING); setFloor('oak', ['mbed', 'chbed', 'office']);
    if (name === 'final') {
      design.applyPalette('blue', ['office'], ['accent', 'upholstery', 'soft', 'rug']); setFloor('chevron', ['office']);
      design.applyPalette('terracotta', ['hall'], SURF); design.applyPalette('green', ['hall'], ['soft']); setFloor('statuario', LIVING);
      design.applyPalette('brown', ['dining'], SURF); design.applyPalette('green', ['kitchen'], ['cabinet']);
      design.applyPalette('green', ['chbed'], SURF); design.applyPalette('brown', ['mbed'], SURF); setFloor('chevron', ['mbed']);
    }
    return true;
  }
  function pal(scope, id) { if (curPal[scope] === id) return false; curPal[scope] = id; design.applyPalette(id, [scope], SURF); return true; }
  const DAY = { mode: 'day', time: 15.5, dayLights: true, style: 'warm', brightness: 1, kelvin: 2900, layers: { profiles: true, spots: true, coves: true, downlights: true } };
  const NIGHT = { mode: 'night', style: 'warm', kelvin: 2800, brightness: 1, dayLights: false, layers: { profiles: true, spots: true, coves: true, downlights: true } };

  // ---------------------------------------------------------------- camera
  const IMPACTS = SECTIONS.map((s) => s[1]).filter((t) => t > 0).concat([35]);
  function shakeAt(t) {
    let a = 0;
    for (const it of IMPACTS) { const k = t - it; if (k >= 0 && k < 0.6) a += Math.exp(-k / 0.12) * 0.06; }
    if (t >= 37.5 && t < 38.5) a += 0.012 * (1 - ((t - 37.5) % 0.125) / 0.125);
    if (t < 2) a += 0.006;
    return a;
  }
  function applyCam(p, l, fov, roll, t) {
    const sh = shakeAt(t); const n1 = noise1(t * 23.0), n2 = noise1(t * 19.0 + 40), n3 = noise1(t * 29.0 + 80);
    camera.fov = fov; camera.updateProjectionMatrix();
    camera.position.set(p[0] + n1 * sh, p[2] + n2 * sh, -(p[1] + n3 * sh)); camera.up.set(0, 1, 0);
    camera.lookAt(l[0] + n2 * sh * 2, l[2] + n3 * sh * 2, -(l[1] + n1 * sh * 2));
    camera.rotateZ(roll + n3 * sh * 1.5);
    ctl.player.x = p[0]; ctl.player.y = p[1];
  }
  function render(shot, u, opt = {}, t = 0) {
    const s = S[shot]; const k = opt.lin ? u : expoOut(u) * 0.55 + u * 0.45;
    applyCam(L3(s.p[0], s.p[1], k), L3(s.l[0], s.l[1], k), opt.fov || s.fov, opt.roll || 0, t); renderNow();
  }
  function buildFlight(route) {
    tour.buildGrid();
    const W0 = route.pts; const pts = [];
    for (let i = 0; i < W0.length - 1; i++) {
      const a = W0[i], b = W0[i + 1]; const r = tour.astar(a[0], a[1], b[0], b[1]); r[0] = [a[0], a[1]]; r[r.length - 1] = [b[0], b[1]];
      r.forEach((q, j) => { if (i > 0 && j === 0) return; const k = j / Math.max(1, r.length - 1); pts.push([q[0], q[1], lerp(a[2], b[2], ease(k))]); });
    }
    const res = [pts[0]];
    for (let i = 1; i < pts.length; i++) { const a = res[res.length - 1], b = pts[i]; const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.05)); for (let k = 1; k <= n; k++) res.push(L3(a, b, k / n)); }
    let sm = res;
    for (let pass = 0; pass < 4; pass++) { const R = 9; sm = sm.map((_, i) => { const lo = Math.max(0, i - R), hi = Math.min(sm.length - 1, i + R); const a3 = [0, 0, 0]; for (let j = lo; j <= hi; j++) for (let c = 0; c < 3; c++) a3[c] += sm[j][c]; return a3.map((v) => v / (hi - lo + 1)); }); sm[0] = res[0]; sm[sm.length - 1] = res[res.length - 1]; }
    const cum = [0]; for (let i = 1; i < sm.length; i++) cum.push(cum[i - 1] + Math.hypot(sm[i][0] - sm[i - 1][0], sm[i][1] - sm[i - 1][1], sm[i][2] - sm[i - 1][2]));
    const wpS = W0.map((w) => { let bi = 0, bd = 1e9; sm.forEach((q, i) => { const d = Math.hypot(q[0] - w[0], q[1] - w[1]); if (d < bd) { bd = d; bi = i; } }); return cum[bi]; });
    return { pts: sm, cum, len: cum[cum.length - 1], wpS, tags: route.tags };
  }
  const flightAt = (F, s) => { s = Math.max(0, Math.min(F.len, s)); let lo = 0, hi = F.cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (F.cum[m] < s) lo = m; else hi = m; } const k = (s - F.cum[lo]) / Math.max(1e-6, F.cum[hi] - F.cum[lo]); return L3(F.pts[lo], F.pts[hi], k); };
  const flightS = (F, lt, dur) => { const u = clamp01(lt / dur); return F.len * clamp01(ease(u) * 0.25 + (u + 0.035 * Math.sin(TAU * dur * 2 * u)) * 0.75); };
  function renderFlight(F, lt, dur, t) {
    const s = flightS(F, lt, dur); const p = flightAt(F, s); const a1 = flightAt(F, s + 1.5), a2 = flightAt(F, s + 2.4);
    const h0 = Math.atan2(a1[0] - p[0], a1[1] - p[1]), h1 = Math.atan2(a2[0] - a1[0], a2[1] - a1[1]);
    let dh = h1 - h0; while (dh > Math.PI) dh -= TAU; while (dh < -Math.PI) dh += TAU;
    applyCam(p, [a1[0], a1[1], a1[2] - 0.12], 82, Math.max(-0.3, Math.min(0.3, -dh * 0.7)), t); renderNow();
  }
  function flightTag(F, lt, dur) {
    const tagAt = (x) => { const s = flightS(F, x, dur); let w = 0; F.wpS.forEach((ws, i) => { if (ws <= s + 0.3) w = i; }); while (w > 0 && F.tags[w] === F.tags[w - 1]) w--; return w; };
    const wi = tagAt(lt); let t0 = 0; for (let x = lt; x > 0; x -= 1 / 120) if (tagAt(x) !== wi) { t0 = x; break; }
    const uniq = [...new Set(F.tags)]; return { name: F.tags[wi], k: lt - t0, idx: uniq.indexOf(F.tags[wi]) + 1, n: uniq.length };
  }
  function blit(x, y, w, h, alpha = 1, gx = g, sxOff = 0, src = renderer.domElement) {
    const sa = W / H, da = w / h; let sw = W, sh = H, sx = 0, sy = 0;
    if (da < sa) { sw = H * da; sx = (W - sw) / 2 + sxOff; } else { sh = W / da; sy = (H - sh) / 2; }
    gx.globalAlpha = alpha; gx.drawImage(src, Math.max(0, Math.min(W - sw, sx)), sy, sw, sh, x, y, w, h); gx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- type + shapes
  function cascade(word, lt, opt = {}) {
    const size = opt.size || 260, track = opt.track ?? 22, stag = opt.stagger ?? 0.035;
    g.save(); g.font = `900 ${size}px ${HEAVY}`; g.letterSpacing = `${track}px`; g.textBaseline = 'middle'; g.textAlign = 'left';
    const chars = [...word]; const widths = chars.map((c) => g.measureText(c).width + track); const total = widths.reduce((a, b) => a + b, 0) - track;
    let x = W / 2 - total / 2 + (opt.dx || 0); const y = H / 2 + (opt.dy || 0);
    chars.forEach((ch, i) => {
      const k = lt - i * stag; const sgn = i % 2 ? -1 : 1;
      if (k >= 0 && ch !== ' ') {
        const out = opt.out != null ? expoIn((lt - opt.out - i * stag * 0.5) / 0.25) : 0;
        for (let j = 3; j >= 0; j--) {
          const ej = expoOut((k - j * 0.035) / 0.35);
          g.save(); g.translate(x + widths[i] / 2, y + (1 - ej) * sgn * 260 - out * 300 * sgn); g.rotate((1 - ej) * sgn * -0.5); g.scale(1 + (1 - ej) * 1.2, 1 + (1 - ej) * 1.2);
          g.globalAlpha = (j === 0 ? 1 : 0.18 / j) * clamp01(k * 10) * (1 - out); g.fillStyle = j === 0 ? '#fff' : GOLD; g.fillText(ch, -widths[i] / 2 + track / 2, 0); g.restore();
        }
      }
      x += widths[i];
    });
    g.restore();
  }
  function marquee(text, t, y, size, speed, alpha) {
    g.save(); g.font = `900 ${size}px ${HEAVY}`; g.letterSpacing = '12px'; g.textBaseline = 'middle'; g.globalAlpha = alpha;
    const unit = text + '   ·   '; const w = g.measureText(unit).width; let x = -((((t * speed) % w) + w) % w) - w;
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2; while (x < W + w) { g.strokeText(unit, x, y); x += w; } g.restore();
  }
  function kicker(text, x, y, a, size = 18, color = GOLD, align = 'left') { g.save(); g.globalAlpha = a; g.textAlign = align; g.fillStyle = color; g.font = `700 ${size}px ${FONT}`; g.letterSpacing = '6px'; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 12; g.fillText(text, x, y); g.restore(); }
  function bigLabel(text, x, y, a, size = 64, align = 'left', weight = 900) { g.save(); g.globalAlpha = a; g.textAlign = align; g.fillStyle = '#fff'; g.font = `${weight} ${size}px ${HEAVY}`; g.letterSpacing = '3px'; g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 18; g.fillText(text, x, y); g.restore(); }
  function maskLabel(text, x, y, k, size = 84) {
    const e = expoOut(k / 0.4); g.save(); g.font = `900 ${size}px ${HEAVY}`; g.letterSpacing = '3px'; const w = g.measureText(text).width + 20;
    g.beginPath(); g.rect(x - 10, y - size, w * e, size * 1.25); g.clip(); bigLabel(text, x, y, 1, size); g.restore();
    g.save(); g.fillStyle = GOLD; g.globalAlpha = 1 - clamp01((k - 0.35) / 0.2); g.fillRect(x - 10 + w * e - 14, y - size, 14, size * 1.25); g.restore();
  }
  function swatches(p, x, y, a, r = 15) { g.save(); g.globalAlpha = a; ['wall', 'accent', 'upholstery', 'soft', 'cabinet'].forEach((k, i) => { g.beginPath(); g.arc(x + i * (r * 2 + 8), y, r, 0, TAU); g.fillStyle = hex(p[k]); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.stroke(); }); g.restore(); }
  function brackets(t) {
    const p = 1 - expoOut(((t % BEAT) / BEAT) * 2); const m = 46 + 14 * p, L = 60 + 30 * p;
    g.save(); g.strokeStyle = `rgba(255,255,255,${0.55 + 0.4 * p})`; g.lineWidth = 3;
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const cx = sx > 0 ? m : W - m, cy = sy > 0 ? m : H - m; g.beginPath(); g.moveTo(cx, cy + sy * L); g.lineTo(cx, cy); g.lineTo(cx + sx * L, cy); g.stroke(); }
    g.fillStyle = `rgba(255,70,60,${Math.floor(t * 2) % 2 ? 1 : 0.35})`; g.beginPath(); g.arc(W - m - 18, m + 34, 7, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `700 13px ${FONT}`; g.letterSpacing = '4px'; g.textAlign = 'right';
    g.fillText(`REC  00:${String(Math.floor(t)).padStart(2, '0')}:${String(Math.floor(t * 60) % 60).padStart(2, '0')}`, W - m - 34, m + 39);
    g.textAlign = 'left'; g.fillText('RESIDENCE · DESIGN STUDIO', m + 20, m + 39); g.restore();
  }
  function bursts(t, times, cx, cy, color = GOLD) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const t0 of times) { const k = t - t0; if (k < 0 || k > 0.6) continue; for (let r = 0; r < 2; r++) { const kk = clamp01((k - r * 0.08) / 0.5); g.strokeStyle = color; g.globalAlpha = (1 - kk) * 0.8; g.lineWidth = 8 * (1 - kk) + 1; g.beginPath(); g.arc(cx, cy, 40 + 900 * expoOut(kk), 0, TAU); g.stroke(); } }
    g.restore();
  }
  function lineSweep(t, t0, dur = 0.3) { const k = (t - t0) / dur; if (k < 0 || k > 1) return; g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,236,200,${0.55 * (1 - k)})`; g.shadowColor = GOLD; g.shadowBlur = 40; g.fillRect(-200 + (W + 400) * expoOut(k), 0, 22, H); g.restore(); }
  function wipe(kind, k, cx = W / 2, cy = H / 2, dir = 1) {
    if (k >= 1) return;
    if (kind === 'circle') {
      const R = Math.hypot(W, H) * expoOut(k);
      g.save(); g.beginPath(); g.rect(0, 0, W, H); g.arc(cx, cy, R, 0, TAU, true); g.clip('evenodd'); g.drawImage(prevC, 0, 0); g.restore();
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,230,190,${0.9 * (1 - k)})`; g.lineWidth = 10; g.shadowColor = GOLD; g.shadowBlur = 40; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke(); g.restore();
    } else {
      const e = ease(k), sk = 300, x = lerp(-sk, W + sk, e);
      g.save(); g.beginPath();
      if (dir > 0) { g.moveTo(x, 0); g.lineTo(W + sk, 0); g.lineTo(W + sk, H); g.lineTo(x - sk, H); } else { g.moveTo(-sk, 0); g.lineTo(W - x + sk, 0); g.lineTo(W - x, H); g.lineTo(-sk, H); }
      g.closePath(); g.clip(); g.drawImage(prevC, 0, 0); g.restore();
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,230,190,${0.8 * (1 - e)})`; g.lineWidth = 8; g.shadowColor = GOLD; g.shadowBlur = 30;
      g.beginPath(); if (dir > 0) { g.moveTo(x, 0); g.lineTo(x - sk, H); } else { g.moveTo(W - x + sk, 0); g.lineTo(W - x, H); } g.stroke(); g.restore();
    }
  }
  // generic "flip" shot: base state + cumulative flips; renders previous state into prevC for the wipe
  function flipShot(lt, o) {
    let i = -1; o.flips.forEach((f, j) => { if (f.at <= lt) i = j; });
    const u = i >= 0 ? (lt - o.flips[i].at) / (o.flips[i + 1] ? o.flips[i + 1].at - o.flips[i].at : 0.5) : 0;
    const applyUpTo = (n) => { o.base(); for (let j = 0; j <= n; j++) o.flips[j].set(); };
    const wk = i >= 0 ? (lt - o.flips[i].at) / (o.wipeDur || 0.4) : 1;
    if (i > 0 && wk < 1) { applyUpTo(i - 1); render(o.shot, o.u(lt), { lin: true, roll: o.roll ? o.roll(lt) : 0 }, o.t); pg.drawImage(renderer.domElement, 0, 0); }
    applyUpTo(i);
    render(o.shot, o.u(lt), { lin: true, roll: o.roll ? o.roll(lt) : 0 }, o.t); blit(0, 0, W, H);
    if (i > 0) wipe(o.wipe || 'circle', wk, o.cx ?? W * 0.6, o.cy ?? H * 0.45, i % 2 ? 1 : -1);
    return { i, u };
  }

  // ---------------------------------------------------------------- sections (lt = local time)
  const SEC = {
    intro(lt, t) {
      scheme('final'); setLight({ ...NIGHT, style: 'amber', kelvin: 2300, brightness: 0.85 });
      render('intro', lt / 2, { lin: true, roll: -0.06 + 0.06 * lt }, t); blit(0, 0, W, H);
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, W, H);
      marquee('DESIGN STUDIO', t, H / 2 - 300, 120, 420, 0.12); marquee('LIVE RESTYLING', t, H / 2 + 300, 120, -420, 0.12);
      cascade('RESIDENCE', lt - 0.25, { size: 210, track: 26, stagger: 0.17 });
      kicker('A DESIGN STUDIO FILM', W / 2, H / 2 + 150, clamp01((lt - 1.3) * 4), 20, GOLD, 'center');
    },
    plan(lt, t) { // aerial orbit over the cut-away flat; one click restyles the whole home
      setCutaway(true);
      const restyled = lt >= 3.5; scheme(restyled ? 'final' : 'default'); setLight(DAY);
      const a = lerp(-0.9, 0.55, ease(lt / 6)); const R = lerp(15, 11.5, ease(lt / 6)); const h = lerp(17, 11, ease(lt / 6));
      const c = [7.2, 5.9];
      const dive = expoIn((lt - 5.35) / 0.65); // dive into the lobby for the next flight
      const p = [c[0] + Math.sin(a) * R, c[1] - Math.cos(a) * R, h]; const tgt = [c[0], c[1], 0];
      const pd = L3(p, [9.75, 8.6, 1.9], dive), ld = L3(tgt, [9.6, 7.0, 1.4], dive);
      applyCam(pd, ld, lerp(42, 82, dive), 0, t); renderNow(); blit(0, 0, W, H);
      if (lt >= 3.5) { const k = lt - 3.5; if (k < 0.6) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,236,200,${0.5 * (1 - k / 0.6)})`; g.fillRect(0, 0, W, H); g.restore(); } }
      cascade('THE PLAN', lt, { size: 200, stagger: 0.03, out: 1.5, dy: -380 });
      const v = new THREE.Vector3();
      PLAN_TAGS.forEach(([name, x, y], i) => {
        const k = lt - 0.6 - i * 0.12; if (k < 0 || dive > 0.3) return;
        v.set(x, 0.3, -y).project(camera); if (v.z > 1) return;
        const sx = (v.x * 0.5 + 0.5) * W, sy = (-v.y * 0.5 + 0.5) * H; const e = expoOut(k / 0.4); const len = 70 * e;
        g.save(); g.globalAlpha = clamp01(k * 6) * (1 - dive * 3); g.strokeStyle = GOLD; g.lineWidth = 2; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx, sy - len); g.stroke();
        g.fillStyle = GOLD; g.beginPath(); g.arc(sx, sy, 6, 0, TAU); g.fill();
        g.font = `900 18px ${HEAVY}`; g.letterSpacing = '4px'; const tw = g.measureText(name).width + 28;
        g.fillStyle = 'rgba(12,12,14,0.78)'; g.beginPath(); g.roundRect(sx - tw / 2, sy - len - 40, tw * e, 34, 17); g.fill();
        g.fillStyle = '#fff'; g.textAlign = 'center'; if (e > 0.6) g.fillText(name, sx, sy - len - 17); g.restore();
      });
      if (lt >= 3.5 && dive < 0.3) { kicker('ONE CLICK', W / 2, H - 170, clamp01((lt - 3.6) * 5), 22, GOLD, 'center'); bigLabel('WHOLE HOME RESTYLED', W / 2, H - 100, clamp01((lt - 3.7) * 5), 74, 'center'); }
    },
    flightA(lt, t) { setCutaway(false); scheme('final'); setLight(DAY); this._flight(flights.A, lt, 4, t); },
    flightB(lt, t) { setCutaway(false); scheme('final'); setLight(DAY); this._flight(flights.B, lt, 4, t); },
    flightC(lt, t) { // night flight, mood changes on every beat
      setCutaway(false); scheme('final');
      const mood = ['warm', 'amber', 'violet', 'accent', 'blue', 'amber', 'warm', 'accent'][Math.min(7, Math.floor(lt / BEAT))];
      const st = NIGHT_STYLES.find((s) => s.id === mood); setLight({ ...NIGHT, style: mood, kelvin: st.kelvin });
      this._flight(flights.C, lt, 4, t);
      kicker(st.name.toUpperCase(), W - 70, H - 230, 1, 20, GOLD, 'right');
    },
    _flight(F, lt, dur, t) {
      renderFlight(F, lt, dur, t); blit(0, 0, W, H);
      const tg = flightTag(F, lt, dur);
      kicker(String(tg.idx).padStart(2, '0') + ' / ' + String(tg.n).padStart(2, '0'), 70, H - 255, clamp01(tg.k * 8), 20);
      maskLabel(tg.name, 70, H - 175, tg.k, 92);
      const sp = (flightS(F, lt + 0.01, dur) - flightS(F, lt, dur)) / 0.01; kicker(`${(sp * 3.6).toFixed(1)} KM/H`, W - 70, H - 175, 0.9, 18, '#fff', 'right');
    },
    colour(lt, t) {
      setCutaway(false); scheme('default'); setLight(DAY);
      if (lt < 0.5) { pal('hall', 'beige'); render('livHold', 0, {}, t); blit(0, 0, W, H); marquee('COLOUR', t, H / 2, 420, 900, 0.18); cascade('COLOUR', lt, { size: 300, stagger: 0.03 }); return; }
      if (lt < 3.5) {
        const r = flipShot(lt - 0.5, { t, shot: 'livHold', u: (x) => x / 3, roll: (x) => { const i = Math.floor(x / BEAT); const u = (x - i * BEAT) / BEAT; return (i % 2 ? 1 : -1) * 0.07 * (1 - expoOut(u * 2)); }, base: () => {}, flips: PAL_ORDER.map((id, j) => ({ at: j * BEAT, set: () => pal('hall', id) })), wipe: 'circle', cx: W * 0.68, cy: H * 0.42, wipeDur: 0.42 });
        const p = PALETTES.find((q) => q.id === PAL_ORDER[r.i]);
        kicker(`PALETTE ${String(r.i + 1).padStart(2, '0')} / 06`, 70, H - 200, clamp01(r.u * 10), 20); maskLabel(p.name.toUpperCase(), 70, H - 115, r.u * BEAT, 92); swatches(p, 82, H - 62, clamp01(r.u * 6));
        bursts(lt - 0.5, [r.i * BEAT], W * 0.68, H * 0.42, hex(p.accent));
        return;
      }
      if (lt < 6.5) { // sliding carousel, one strip expands
        const k = lt - 3.5; const sw = W / 3.4; const expand = ease((lt - 6.0) / 0.5);
        for (let i = 0; i < 6; i++) {
          let x = i * (sw + 12) - k * 240 + 90; let w = sw; const st = expoOut((k - i * 0.06) / 0.4); if (st <= 0) continue;
          if (i === 5 && expand > 0) { x = lerp(x, 0, expand); w = lerp(w, W, expand); }
          if (x > W || x + w < 0) continue;
          pal('hall', PAL_ORDER[i]); render('livHold', 0.5 + k / 6 + i * 0.02, { lin: true, fov: 64 }, t);
          const yOff = (1 - st) * (i % 2 ? -H : H);
          g.save(); g.beginPath(); g.rect(x, yOff, w, H); g.clip(); blit(x, yOff, w, H, i === 5 ? 1 : 1 - expand, g, (i - 2.5) * 40); g.restore();
          const p = PALETTES.find((q) => q.id === PAL_ORDER[i]);
          g.save(); g.globalAlpha = st * (i === 5 ? 1 : 1 - expand); g.fillStyle = hex(p.accent); g.fillRect(x, H - 10 + yOff, w, 10);
          g.translate(x + 50, H - 60 + yOff); g.rotate(-Math.PI / 2); g.fillStyle = '#fff'; g.font = `900 34px ${HEAVY}`; g.letterSpacing = '4px'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 14; g.fillText(p.name.toUpperCase(), 0, 0); g.restore();
        }
        kicker('SIX PALETTES  ·  ONE CLICK', W / 2, 120, clamp01((k - 0.4) * 4) * (1 - expand), 24, '#fff', 'center');
        return;
      }
      pal('hall', 'terracotta'); render('livHold', 1, { lin: true }, t); blit(0, 0, W, H);
      kicker('SELECTED', 70, H - 200, 1, 20); maskLabel('SAND & TERRACOTTA', 70, H - 115, lt - 6.5, 92);
    },
    floor(lt, t) {
      setCutaway(false); scheme('default'); pal('hall', 'terracotta'); design.applyPalette('green', ['hall'], ['soft']); setLight(DAY);
      if (lt < 0.5) { setFloor('porcelain', LIVING); render('floorSkim', 0, {}, t); blit(0, 0, W, H); marquee('FLOOR', t, H / 2, 420, -900, 0.18); cascade('FLOOR', lt, { size: 330, stagger: 0.03 }); return; }
      if (lt < 3) {
        const r = flipShot(lt - 0.5, { t, shot: 'floorSkim', u: (x) => x / 2.5, roll: (x) => Math.sin(x * 3) * 0.06, base: () => {}, flips: FLOOR_FLIP.map((id, j) => ({ at: j * 0.25, set: () => setFloor(id, LIVING) })), wipe: 'diag', wipeDur: 0.5 * 0.25 / 0.25 * 0.25 });
        const f = FLOOR_OPTIONS.find((q) => q.id === FLOOR_FLIP[r.i]);
        kicker(f.kind.toUpperCase(), 70, H - 190, clamp01(r.u * 12), 20); maskLabel(f.name.toUpperCase(), 70, H - 105, r.u * 0.25, 96);
        g.save(); g.fillStyle = '#fff'; g.font = `200 120px ${HEAVY}`; g.textAlign = 'right'; g.globalAlpha = 0.85; g.fillText(`0${r.i + 1}`, W - 70, H - 90); g.restore();
        return;
      }
      const k = lt - 3; const sw = W / 4;
      for (let i = 0; i < 4; i++) {
        setFloor(SLICES[i], LIVING); render('floorSkim', 0.25 + k / 3.5, { lin: true }, t);
        const st = expoOut((k - i * 0.08) / 0.45); const drift = (i % 2 ? -1 : 1) * (k * 26); const dy = (1 - st) * H * (i % 2 ? -1 : 1) + drift;
        g.save(); g.beginPath(); g.rect(i * sw, 0, sw, H); g.clip(); g.translate(0, dy); g.drawImage(renderer.domElement, 0, -drift * 0.5); g.restore();
        if (i) { g.fillStyle = '#000'; g.fillRect(i * sw - 4, 0, 8, H); }
        const f = FLOOR_OPTIONS.find((q) => q.id === SLICES[i]); const a = clamp01((k - 0.3 - i * 0.08) * 4);
        g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `900 30px ${HEAVY}`; g.letterSpacing = '3px'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 16;
        g.fillText(f.name.toUpperCase(), i * sw + sw / 2, H - 80); g.fillStyle = GOLD; g.font = `700 14px ${FONT}`; g.letterSpacing = '5px'; g.fillText(f.kind.toUpperCase(), i * sw + sw / 2, H - 50); g.restore();
      }
      setFloor('statuario', LIVING);
    },
    rooms(lt, t) { // moving triptychs
      setCutaway(false); scheme('final'); setLight(DAY);
      const set = TRIPTYCH[lt < 2 ? 0 : 1]; const k = lt % 2; const pw = W / 3;
      set.forEach(([shot, name], i) => {
        render(shot, 0.15 + k / 2.4, { lin: true, roll: (i - 1) * 0.04 }, t);
        const st = expoOut((k - i * 0.1) / 0.45); const out = expoIn((k - 1.75 - i * 0.04) / 0.25); const dy = (1 - st) * H * (i % 2 ? 1 : -1) + out * H * (i % 2 ? -1 : 1);
        g.save(); g.beginPath(); g.rect(i * pw, dy, pw, H); g.clip(); blit(i * pw, dy, pw, H, 1, g, (i - 1) * 120); g.restore();
        if (i) { g.fillStyle = '#000'; g.fillRect(i * pw - 4, 0, 8, H); }
        g.save(); g.globalAlpha = clamp01((k - 0.25 - i * 0.1) * 5) * (1 - out); g.translate(i * pw + 56, H - 70 + dy); g.rotate(-Math.PI / 2); g.fillStyle = '#fff'; g.font = `900 42px ${HEAVY}`; g.letterSpacing = '6px'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 16; g.fillText(name, 0, 0); g.restore();
      });
      kicker('EVERY ROOM  ·  DESIGNED', W / 2, 120, clamp01(k * 4) * (1 - expoIn((k - 1.8) / 0.2)), 22, '#fff', 'center');
    },
    light(lt, t) {
      setCutaway(false); scheme('final');
      if (lt < 0.5) { setLight({ ...DAY, dayLights: false }); render('lapse', 0, {}, t); blit(0, 0, W, H); marquee('LIGHT', t, H / 2, 420, 900, 0.18); cascade('LIGHT', lt, { size: 330, stagger: 0.03 }); return; }
      if (lt < 3) {
        const k = (lt - 0.5) / 2.5; const hr = lerp(7.0, 18.35, ease(k));
        lighting.apply({ ...DAY, time: hr, dayLights: false }); if (Math.round(t * 120) % 6 === 0) captureProbe();
        render('lapse', ease(k), { lin: true, roll: -0.05 + 0.1 * k }, t); blit(0, 0, W, H);
        const hh = Math.floor(hr), mm = Math.floor((hr - hh) * 60);
        bigLabel(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, W - 90, H - 200, 1, 150, 'right', 200);
        kicker('REAL SOLAR PATH · 20.9° N', W - 92, H - 345, 1, 18, GOLD, 'right');
        g.save(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(W - 600, H - 172, 510, 3); g.fillStyle = GOLD; g.fillRect(W - 600, H - 172, 510 * k, 3); g.restore();
        return;
      }
      if (lt < 5.5) {
        const i = lt < 3.5 ? -1 : Math.min(3, Math.floor((lt - 3.5) / BEAT)); const style = i < 0 ? 'warm' : MOODS[i]; const st = NIGHT_STYLES.find((s) => s.id === style);
        if (setLight({ ...NIGHT, style, kelvin: st.kelvin })) captureProbe();
        const u = i < 0 ? (lt - 3) / 0.5 : (lt - 3.5 - i * BEAT) / BEAT;
        const roll = i < 0 ? 0 : (i % 2 ? 1 : -1) * 0.13 * (1 - expoOut(u * 1.5)) + (i % 2 ? 1 : -1) * 0.03;
        render('livNight', (lt - 3) / 4.5, { lin: true, roll }, t); blit(0, 0, W, H);
        const cc = Object.values(st.coves)[0]; const col = cc != null ? hex(cc) : '#ffd9a8';
        bursts(lt, [3, 3.5, 4, 4.5, 5], W / 2, H * 0.3, col);
        kicker(i < 0 ? 'NIGHT' : `SCENE ${String(i + 1).padStart(2, '0')}`, 70, H - 200, clamp01(u * 10), 20); maskLabel(st.name.toUpperCase(), 70, H - 115, u * BEAT, 96);
        g.save(); g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 24; g.fillRect(72, H - 80, 200 * expoOut(u * 2), 6); g.restore();
        return;
      }
      if (lt < 6.5) {
        const step = Math.floor((lt - 5.5) / 0.125); const pat = [[1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 0, 0], [0, 0, 1, 1], [1, 0, 0, 1], [0, 1, 1, 0], [1, 1, 1, 0], [1, 1, 1, 1]][step % 8];
        setLight({ ...NIGHT, style: 'accent', layers: { profiles: !!pat[0], spots: !!pat[1], coves: !!pat[2], downlights: !!pat[3] } });
        render('livNight', 0.55 + (lt - 5.5) / 4, { lin: true, roll: (step % 2 ? 1 : -1) * 0.025 }, t); blit(0, 0, W, H);
        ['PROFILES', 'SPOTS', 'COVES', 'DOWNLIGHTS'].forEach((n, j) => {
          const on = pat[j]; g.save(); g.fillStyle = on ? GOLD : 'rgba(255,255,255,0.16)'; g.shadowColor = GOLD; g.shadowBlur = on ? 26 : 0;
          g.beginPath(); g.roundRect(70 + j * 225, H - 125, 205, 58, 29); g.fill(); g.fillStyle = on ? '#1a1410' : 'rgba(255,255,255,0.75)'; g.shadowBlur = 0;
          g.font = `900 18px ${HEAVY}`; g.letterSpacing = '3px'; g.textAlign = 'center'; g.fillText(n, 70 + j * 225 + 102, H - 89); g.restore();
        });
        kicker('LIGHT LAYERS', 72, H - 155, 1, 18);
        return;
      }
      const k = lt - 6.5; const kel = k < 0.75 ? lerp(2200, 5000, ease(k / 0.75)) : lerp(5000, 2900, ease((k - 0.75) / 0.75));
      setLight({ ...NIGHT, kelvin: kel });
      render('livNight', 0.75 + k / 6, { lin: true, roll: Math.sin(k * TAU / 1.5) * 0.05 }, t); blit(0, 0, W, H);
      bigLabel(`${Math.round(kel / 10) * 10} K`, 70, H - 110, 1, 150, 'left', 200); kicker('COLOUR TEMPERATURE', 72, H - 265, 1, 18);
      const gr = g.createLinearGradient(72, 0, 572, 0); gr.addColorStop(0, '#ff9d4d'); gr.addColorStop(0.5, '#ffe7c4'); gr.addColorStop(1, '#d8e6ff');
      g.fillStyle = gr; g.fillRect(72, H - 80, 500, 6); g.fillStyle = '#fff'; g.beginPath(); g.arc(72 + 500 * (kel - 2200) / 2800, H - 77, 12, 0, TAU); g.fill();
    },
    beforeafter(lt, t) { // sweeping divider: original vs restyled, then day vs night
      setCutaway(false);
      const phase2 = lt >= 3; const u = (lt % 3) / 3;
      const camU = lt / 6;
      // left = before
      if (phase2) { scheme('final'); setLight(DAY); } else { scheme('default'); setLight(DAY); }
      render('baHold', camU, { lin: true }, t); xg.drawImage(renderer.domElement, 0, 0);
      // right = after
      if (phase2) { scheme('final'); setLight(NIGHT); } else { scheme('final'); setLight(DAY); }
      render('baHold', camU, { lin: true }, t); blit(0, 0, W, H);
      const sx = W * (0.5 + 0.36 * Math.sin(u * TAU * 1.0 - 0.6) * (1 - expoIn((u - 0.85) / 0.15) * 0)) ;
      const intro = expoOut(u / 0.2); const x = lerp(W, sx, intro);
      g.save(); g.beginPath(); g.rect(0, 0, x, H); g.clip(); g.drawImage(altC, 0, 0); g.restore();
      g.save(); g.fillStyle = '#fff'; g.shadowColor = GOLD; g.shadowBlur = 24; g.fillRect(x - 2, 0, 4, H); g.beginPath(); g.arc(x, H / 2, 26, 0, TAU); g.fill();
      g.fillStyle = '#1a1410'; g.beginPath(); g.moveTo(x - 14, H / 2); g.lineTo(x - 5, H / 2 - 8); g.lineTo(x - 5, H / 2 + 8); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x + 14, H / 2); g.lineTo(x + 5, H / 2 - 8); g.lineTo(x + 5, H / 2 + 8); g.closePath(); g.fill(); g.restore();
      const [lb, rb] = phase2 ? ['DAY', 'NIGHT'] : ['BEFORE', 'AFTER'];
      bigLabel(lb, 70, 150, clamp01(u * 8), 70); bigLabel(rb, W - 70, 150, clamp01(u * 8), 70, 'right');
      kicker(phase2 ? 'SAME ROOM  ·  REAL-TIME LIGHT' : 'ORIGINAL  ·  RESTYLED IN ONE CLICK', W / 2, H - 80, clamp01(u * 6), 20, GOLD, 'center');
    },
    bedrooms(lt, t) { // kids then master: palette, floor and light flips with wipes
      setCutaway(false);
      if (lt < 2) {
        scheme('default'); setLight(DAY);
        const ids = ['blue', 'terracotta', 'grey', 'green'];
        const r = flipShot(lt, { t, shot: 'kidsHold', u: (x) => x / 2, base: () => {}, flips: ids.map((id, j) => ({ at: j * BEAT, set: () => pal('chbed', id) })), wipe: 'circle', cx: W * 0.3, cy: H * 0.4, wipeDur: 0.4 });
        const p = PALETTES.find((q) => q.id === ids[r.i]);
        kicker("CHILDREN'S BEDROOM", 70, H - 200, 1, 20); maskLabel(p.name.toUpperCase(), 70, H - 115, r.u * BEAT, 88); swatches(p, 82, H - 62, 1);
        return;
      }
      scheme('default');
      const labels = ['EARTHY BROWN', 'WALNUT CHEVRON', 'AMBER LOUNGE', 'DIMMED 55%'];
      const r = flipShot(lt - 2, { t, shot: 'masterHold', u: (x) => x / 2, base: () => { setLight(DAY); setFloor('oak', ['mbed']); pal('mbed', 'beige'); },
        flips: [{ at: 0, set: () => pal('mbed', 'brown') }, { at: 0.5, set: () => setFloor('chevron', ['mbed']) }, { at: 1.0, set: () => setLight({ ...NIGHT, style: 'amber', kelvin: 2300 }) }, { at: 1.5, set: () => setLight({ ...NIGHT, style: 'amber', kelvin: 2300, brightness: 0.55 }) }],
        wipe: 'diag', wipeDur: 0.4 });
      kicker('MASTER SUITE', 70, H - 200, 1, 20); maskLabel(labels[Math.max(0, r.i)], 70, H - 115, r.u * BEAT, 88);
    },
    finale(lt, t) {
      setCutaway(false); scheme('final'); setLight(NIGHT);
      if (lt < 2) {
        const i = Math.min(7, Math.floor(lt / 0.25)); const u = (lt - i * 0.25) / 0.25;
        render(FINALE[i][0], 0.1 + u * 0.9, { lin: true, roll: (i % 2 ? 1 : -1) * 0.12 * (1 - u) }, t); blit(0, 0, W, H);
        cascade('THE FINAL SCHEME', lt - 0.05, { size: 120, track: 10, stagger: 0.02, out: 1.55 });
        kicker(FINALE[i][1], W / 2, H - 120, 0.95, 26, GOLD, 'center');
        return;
      }
      const k = lt - 2; const gap = 8, cw = (W - gap * 4) / 3, ch = (H - gap * 4) / 3; const zk = ease((k - 1.35) / 0.65);
      for (let i = 0; i < 9; i++) {
        const ci = i % 3, ri = Math.floor(i / 3); const st = clamp01((k - [4, 1, 5, 3, 0, 7, 2, 6, 8][i] * 0.055) / 0.35); if (st <= 0) continue;
        render(GRID9[i][0], 0.3 + k / 3, { lin: true, roll: (i % 2 ? 1 : -1) * 0.03 }, t);
        let x = gap + ci * (cw + gap), y = gap + ri * (ch + gap), w = cw, h = ch;
        if (i === 4) { x = lerp(x, 0, zk); y = lerp(y, 0, zk); w = lerp(w, W, zk); h = lerp(h, H, zk); }
        const s = back(st); const cx = x + w / 2, cy = y + h / 2;
        g.save(); g.translate(cx, cy); g.scale(s, s); g.rotate((1 - st) * (i % 2 ? 0.2 : -0.2)); g.translate(-cx, -cy); g.beginPath(); g.roundRect(x, y, w, h, 10); g.clip();
        blit(x, y, w, h, i === 4 ? 1 : 1 - zk);
        g.globalAlpha = st * (i === 4 ? 1 : 1 - zk); g.fillStyle = '#fff'; g.font = `900 20px ${HEAVY}`; g.letterSpacing = '4px'; g.textAlign = 'left'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 10;
        g.fillText(GRID9[i][1], x + 18, y + h - 20); g.restore();
      }
    },
    end(lt, t) {
      setCutaway(false); g.fillStyle = '#050506'; g.fillRect(0, 0, W, H);
      marquee('PALETTES · FLOORS · LIGHT · IN REAL TIME', t, 140, 70, 300, 0.08); marquee('PALETTES · FLOORS · LIGHT · IN REAL TIME', t, H - 140, 70, -300, 0.08);
      const lines = expoOut(lt / 0.5);
      g.save(); g.strokeStyle = GOLD; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - 440 * lines, H / 2 - 125); g.lineTo(W / 2 + 440 * lines, H / 2 - 125); g.moveTo(W / 2 - 440 * lines, H / 2 + 110); g.lineTo(W / 2 + 440 * lines, H / 2 + 110); g.stroke(); g.restore();
      cascade('RESIDENCE', lt, { size: 170, track: 30, stagger: 0.03, dy: -10 });
      const sk = clamp01((lt - 0.7) / 0.6);
      if (sk > 0 && sk < 1) { g.save(); g.globalCompositeOperation = 'source-atop'; const x = -300 + (W + 600) * sk; const gr = g.createLinearGradient(x - 120, 0, x + 120, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,240,210,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, H / 2 - 110, W, 200); g.restore(); }
      kicker('DESIGN STUDIO  ·  LIVE RESTYLING', W / 2, H / 2 + 72, clamp01((lt - 0.35) * 3), 20, GOLD, 'center');
      kicker('PALETTES  ·  FLOORS  ·  LIGHT  ·  IN REAL TIME', W / 2, H / 2 + 170, clamp01((lt - 0.6) * 3) * 0.8, 15, '#fff', 'center');
    },
  };
  const BRACKETS = new Set(['flightA', 'flightB', 'flightC', 'light', 'bedrooms']);
  async function drawFrame(t) {
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const sec = SECTIONS.find((s) => t >= s[1] && t < s[2]) || SECTIONS[SECTIONS.length - 1];
    SEC[sec[0]].call(SEC, t - sec[1], t);
    if (BRACKETS.has(sec[0])) brackets(t);
    for (const s of SECTIONS) if (s[1] > 0) lineSweep(t, s[1], 0.3);
  }

  // ---------------------------------------------------------------- FX envelopes
  const punches = []; const P = (t, o) => punches.push({ t, zoom: 0, chroma: 0, flash: 0, glitch: 0, blur: [0, 0], dur: 0.35, ...o });
  for (let i = 0; i < 9; i++) P(0.25 + i * 0.17, { zoom: 0.04, chroma: 12, glitch: 0.3, dur: 0.15 });
  for (const [name, t0] of SECTIONS) if (t0 > 0) P(t0, { flash: name === 'end' ? 1 : 0.8, zoom: 0.14, chroma: 22, glitch: name === 'end' ? 0.6 : 0.4, dur: 0.45 });
  P(5.5, { flash: 0.9, zoom: 0.1, chroma: 20, dur: 0.5 }); // one-click restyle from above
  for (let i = 0; i < 8; i++) P(8 + i * BEAT, { zoom: 0.05, chroma: 9, dur: 0.22 });
  for (let i = 0; i < 6; i++) P(12.5 + i * BEAT, { zoom: 0.07, chroma: 10, flash: 0.12, dur: 0.28 });
  P(15.5, { zoom: 0.08, chroma: 14, dur: 0.4 });
  for (let i = 0; i < 8; i++) P(19 + i * BEAT, { zoom: 0.05, chroma: 9, dur: 0.22 });
  for (let i = 0; i < 8; i++) P(23.5 + i * 0.25, { zoom: 0.04, chroma: 9, dur: 0.12 });
  P(26, { zoom: 0.08, chroma: 14, dur: 0.35 }); P(30, { zoom: 0.08, chroma: 14, dur: 0.35 });
  P(35, { flash: 1, zoom: 0.2, chroma: 32, glitch: 0.45, dur: 0.65 });
  for (let i = 0; i < 4; i++) P(35.5 + i * BEAT, { zoom: 0.08, chroma: 16, glitch: 0.25, dur: 0.3 });
  for (let i = 0; i < 8; i++) P(37.5 + i * 0.125, { zoom: 0.02, chroma: 8, dur: 0.1 });
  P(38.5, { blur: [260, 0], dur: 0.3 }); P(39.25, { blur: [-260, 0], dur: 0.3 });
  for (let i = 0; i < 8; i++) P(40 + i * BEAT, { zoom: 0.06, chroma: 14, glitch: 0.15, dur: 0.25 });
  P(47, { flash: 0.6, zoom: 0.1, chroma: 18, dur: 0.4 });
  for (let i = 0; i < 8; i++) P(50 + i * BEAT, { zoom: 0.06, chroma: 10, dur: 0.25 });
  for (let i = 1; i < 8; i++) P(54 + i * 0.25, { zoom: 0.08, chroma: 12, blur: [i % 2 ? 120 : -120, 0], dur: 0.12 });
  P(56, { zoom: 0.07, chroma: 12, dur: 0.4 });
  for (let i = 0; i < 4; i++) P(58.6 + i * 0.12, { glitch: 0.35, chroma: 14, dur: 0.1 });
  const ZOOMS = SECTIONS.map((s) => s[1]).filter((t) => t > 0);
  function fxAt(t) {
    const f = { zoom: 1, chroma: 1.4, flash: 0, glitch: 0, blur: [0, 0], center: [0.5, 0.5], grain: 0.05, vig: 0.6, expo: 1, bars: 0, time: t, radial: 0 };
    for (const p of punches) {
      const k = t - p.t; if (k < -0.06 || k > p.dur) continue;
      const pre = k < 0 ? clamp01(1 + k / 0.06) : 1; const d = Math.exp(-Math.max(0, k) / (p.dur * 0.35)) * pre;
      f.zoom += p.zoom * d; f.chroma += p.chroma * d; f.flash = Math.max(f.flash, p.flash * Math.exp(-Math.max(0, k) / (p.dur * 0.22)) * (k >= 0 ? 1 : 0));
      f.glitch = Math.max(f.glitch, p.glitch * d); f.blur[0] += p.blur[0] * d; f.blur[1] += p.blur[1] * d;
    }
    for (const z of ZOOMS) { const k = t - z; if (k > -0.22 && k < 0) { f.radial += 0.22 * expoIn(1 + k / 0.22); f.zoom += 0.25 * expoIn(1 + k / 0.22); } if (k >= 0 && k < 0.25) f.radial += 0.18 * (1 - expoOut(k / 0.25)); }
    if (t < 0.3) f.expo = 0; else if (t < 0.6) f.expo = (t - 0.3) / 0.3;
    const sec = (SECTIONS.find((s) => t >= s[1] && t < s[2]) || [''])[0];
    if (sec.startsWith('flight')) f.bars = 0.2;
    if (t > 59.3) f.expo *= clamp01((60 - t) / 0.7);
    return f;
  }

  // ---------------------------------------------------------------- frames
  function samplesAt(t) {
    const sec = (SECTIONS.find((s) => t >= s[1] && t < s[2]) || [''])[0];
    if (sec.startsWith('flight')) return [5, 0.85];
    if (sec === 'plan') return [3, 1.0];
    if (sec === 'finale') return t < 56 ? [4, 1.0] : [3, 1.0];
    if (sec === 'floor') return [4, 1.2];
    if (sec === 'beforeafter' || sec === 'rooms' || sec === 'colour') return [3, 1.0];
    return [3, 1.0];
  }
  async function frameAt(t, fps) {
    const [n, shutter] = samplesAt(t);
    for (let s = 0; s < n; s++) { const ts = t + ((s + 0.5) / n - 0.5) * shutter / fps; await drawFrame(ts); ag.globalAlpha = 1 / (s + 1); ag.drawImage(comp, 0, 0); }
    ag.globalAlpha = 1; fx.draw(acc, fxAt(t));
  }
  async function prepare() {
    for (const f of FLOOR_OPTIONS) floorMat[f.id] = await design.floorMaterial(f.id);
    doors.list.forEach((d) => { d.state.t = 1; d.state.target = 1; d.update(0); });
    for (const k of Object.keys(ROUTES)) flights[k] = buildFlight(ROUTES[k]);
    doors.list.forEach((d) => { d.state.t = 1; d.state.target = 1; d.update(0); });
    stateKey = ''; curPal = {}; fx = fx || createFxPass();
  }
  const SRV = 'http://localhost:5302';
  async function post(path, data) { for (let a = 0; a < 6; a++) { try { const r = await fetch(SRV + path, { method: 'POST', body: data }); if (r.ok) return r; } catch { /* retry */ } await new Promise((r) => setTimeout(r, 400)); } throw new Error('stream post failed: ' + path); }

  api.run = async ({ fps = 60, snaps = null, name = 'motion_edit_60s_1080p60' } = {}) => {
    const saved = { design: design.snapshot(), light: JSON.parse(JSON.stringify(lighting.state)) };
    try {
      const N = Math.round(TOTAL * fps); api.progress = { frame: 0, total: N, done: false, error: null };
      setRecording(true); setSize(W, H); ctl.enterExplore({ x: 9.85, y: 7.95, yawDeg: 315 });
      await prepare();
      for (let w = 0; w < 4; w++) { await frameAt(0.5 + w * 13, fps); await tick(); }
      let pending = [], pendN = 0, encErr = null, enc = null;
      if (!snaps) {
        enc = new VideoEncoder({ output: (c) => { const b = new Uint8Array(c.byteLength); c.copyTo(b); pending.push(b); pendN++; }, error: (e) => { encErr = e; } });
        enc.configure({ codec: 'avc1.640033', width: W, height: H, bitrate: 90e6, bitrateMode: 'variable', framerate: fps, latencyMode: 'quality', avc: { format: 'annexb' } });
        await post('/h264start');
      }
      const flush = async () => { if (!pending.length) return; const parts = pending, n = pendN; pending = []; pendN = 0; await post(`/chunk?n=${n}`, new Blob(parts)); };
      const list = snaps ? snaps.map(([n, s]) => [Math.round(s * fps), n]) : null;
      for (let f = 0; f < N; f++) {
        const t = f / fps;
        if (list) { const s = list.find((q) => q[0] === f); if (!s) continue; await frameAt(t, fps); const b = await new Promise((r) => fx.canvas.toBlob(r, 'image/jpeg', 0.86)); await post(`/snap?name=${s[1]}`, b); api.progress.frame = f; continue; }
        fans.forEach((fan) => { fan.userData.rotor.rotation.y += 1.2 / fps; });
        await frameAt(t, fps);
        const vf = new VideoFrame(fx.canvas, { timestamp: Math.round(f * 1e6 / fps), duration: Math.round(1e6 / fps) });
        enc.encode(vf, { keyFrame: f % (fps * 2) === 0 }); vf.close();
        while (enc.encodeQueueSize > 6) await new Promise((r) => enc.addEventListener('dequeue', r, { once: true }));
        if (pending.length >= 60) await flush();
        api.progress.frame = f + 1;
        if (encErr) throw encErr;
        if (api.abort) { api.abort = false; enc.close(); throw new Error('aborted'); }
        if (f % 30 === 0) await tick();
      }
      if (enc) { await enc.flush(); await flush(); enc.close(); const r = await post(`/h264end?fps=${fps}&name=${name}`); api.progress.result = await r.text(); }
      api.progress.done = true;
    } catch (e) { api.progress.error = String(e && e.stack || e); }
    finally {
      setCutaway(false); setRecording(false); stateKey = ''; curPal = {};
      await design.restore(saved.design); lighting.apply(saved.light); captureProbe();
    }
  };
  return api;
}
