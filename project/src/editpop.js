// 60-second POP-ART showcase edit — collage stickers, bold colour fields, bouncy type and a GPU
// stylizer (pop / poster / duotone / halftone / riso / kaleidoscope / mirror) applied to every render.
// 120 BPM (beat 0.5 s); sections land on bar lines so the funk-pop soundtrack locks to picture.
import * as THREE from 'three';
import { PALETTES, FLOOR_OPTIONS, SURFACES } from './design/design.js';
import { NIGHT_STYLES } from './lighting/lighting.js';

const W = 1920, H = 1080, BEAT = 0.5, TAU = Math.PI * 2, TOTAL = 60;
const HEAVY = '"Segoe UI Black", "Arial Black", "Segoe UI", sans-serif';
const BOLD = '"Segoe UI", Arial, sans-serif';
const C = { pink: '#ff3d8b', yellow: '#ffd23f', cyan: '#3de1ff', orange: '#ff7a1a', lilac: '#b388ff', mint: '#4be3a0', ink: '#1b1530', cream: '#fff4e0', white: '#ffffff', red: '#ff4d4d', blue: '#3d6bff' };
const POP = [C.pink, C.yellow, C.cyan, C.orange, C.lilac, C.mint];
const SURF = SURFACES.map((s) => s.id);
const LIVING = ['hall', 'dining', 'kitchen', 'corridor', 'entry'];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => { x = clamp01(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const expoOut = (x) => { x = clamp01(x); return x === 1 ? 1 : 1 - 2 ** (-9 * x); };
const expoIn = (x) => { x = clamp01(x); return x === 0 ? 0 : 2 ** (10 * x - 10); };
const backOut = (x) => { x = clamp01(x); const c = 2.2; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
const elastic = (x) => { x = clamp01(x); if (x === 0 || x === 1) return x; return 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1; };
const lerp = (a, b, k) => a + (b - a) * k;
const L3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const hex = (c) => '#' + new THREE.Color(c).getHexString();
const rgb = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };

export const SECTIONS = [['intro', 0, 3], ['tour', 3, 9], ['colour', 9, 15], ['kaleido', 15, 21], ['floor', 21, 27], ['lights', 27, 33], ['mirror', 33, 39], ['riso', 39, 45], ['peel', 45, 51], ['polaroid', 51, 57], ['end', 57, 60]];

const S = {
  office: { p: [[10.95, 9.0, 1.5], [11.9, 10.0, 1.25]], l: [[12.4, 11.5, 0.95], [13.2, 11.2, 0.9]], fov: 70 },
  deoghar: { p: [[10.45, 7.1, 1.6], [11.1, 7.2, 1.4]], l: [[12.9, 7.2, 1.35], [12.9, 7.22, 1.25]], fov: 62 },
  living: { p: [[9.6, 6.9, 1.9], [8.6, 6.3, 1.45]], l: [[6.2, 6.2, 0.9], [5.9, 5.2, 0.8]], fov: 72 },
  balcony: { p: [[9.3, 5.85, 1.5], [10.4, 5.95, 1.6]], l: [[12.6, 5.2, 1.2], [13.0, 4.2, 1.3]], fov: 72 },
  dining: { p: [[6.8, 4.1, 1.9], [6.55, 3.0, 1.45]], l: [[5.0, 2.95, 0.8], [4.8, 2.6, 0.85]], fov: 66 },
  kitchen: { p: [[6.95, 2.6, 1.7], [7.75, 2.38, 1.4]], l: [[9.6, 2.4, 1.2], [9.6, 1.5, 1.0]], fov: 70 },
  master: { p: [[2.62, 5.3, 1.75], [2.75, 3.7, 1.4]], l: [[0.2, 3.1, 1.2], [0.1, 2.7, 1.0]], fov: 70 },
  masterHold: { p: [[2.72, 4.1, 1.6], [2.74, 3.8, 1.5]], l: [[0.1, 2.85, 0.9], [0.1, 2.8, 0.85]], fov: 74 },
  kids: { p: [[2.85, 8.0, 1.75], [3.15, 9.2, 1.45]], l: [[0.6, 10.0, 1.0], [0.6, 10.4, 0.9]], fov: 72 },
  kidsHold: { p: [[3.15, 9.0, 1.65], [3.2, 9.2, 1.55]], l: [[0.5, 10.2, 1.0], [0.5, 10.25, 0.95]], fov: 74 },
  livHold: { p: [[9.42, 5.95, 1.7], [9.1, 5.45, 1.5]], l: [[6.3, 6.6, 0.85], [6.4, 6.2, 0.9]], fov: 66 },
  baHold: { p: [[9.5, 6.4, 1.75], [9.15, 5.8, 1.55]], l: [[6.2, 6.4, 0.9], [6.3, 6.0, 0.9]], fov: 72 },
  floorSkim: { p: [[9.42, 7.35, 0.42], [9.3, 6.2, 0.32]], l: [[8.3, 2.6, 0.05], [8.1, 2.1, 0.03]], fov: 74 },
  livNight: { p: [[10.25, 5.95, 1.75], [9.3, 5.55, 1.5]], l: [[6.2, 6.2, 1.05], [6.4, 6.7, 1.0]], fov: 70 },
  intro: { p: [[9.7, 6.2, 1.5], [9.1, 5.8, 1.6]], l: [[6.0, 6.3, 1.0], [6.2, 6.4, 1.05]], fov: 64 },
  kaleido: { p: [[8.8, 6.6, 2.2], [7.6, 5.4, 2.0]], l: [[6.0, 5.0, 0.6], [6.6, 4.6, 0.5]], fov: 82 },
};
const ROUTE = { pts: [[9.75, 8.35, 1.7], [9.5, 7.35, 1.5], [9.75, 6.85, 1.6], [8.6, 6.4, 1.95], [7.4, 5.6, 1.7], [6.75, 4.2, 1.4], [6.6, 3.1, 1.2], [7.75, 2.45, 1.05]], tags: ['HELLO!', 'COME IN', 'FOYER', 'LIVING', 'LOUNGE', 'DINING', 'DINING', 'KITCHEN'] };
const TOUR = [['living', 'LIVING', 'arch'], ['office', 'OFFICE', 'round'], ['deoghar', 'DEOGHAR', 'circle'], ['dining', 'DINING', 'round'], ['kitchen', 'KITCHEN', 'arch'], ['master', 'MASTER', 'circle']];
const PAL_ORDER = ['beige', 'blue', 'green', 'grey', 'brown', 'terracotta'];
const FLOORS8 = ['porcelain', 'statuario', 'travertine', 'concrete', 'terrazzo', 'nero', 'oak', 'chevron'];
const POLAROIDS = [['living', 'the lounge'], ['office', 'home office'], ['deoghar', 'deoghar'], ['dining', 'dinner club'], ['kitchen', 'the kitchen'], ['kids', 'kids room'], ['master', 'master suite'], ['balcony', 'balcony'], ['livNight', 'night mode']];

// ---------------------------------------------------------------- GPU stylizer (per render)
function createStylizer() {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const gl = c.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
  const vs = `#version 300 es
in vec2 p; out vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
  const fs = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform vec2 uRes; uniform int uMode, uWarp;
uniform vec3 uA, uB, uP; uniform float uLevels, uDot, uMis, uSegs, uRot, uSat, uTime;
in vec2 vUv; out vec4 o;
const float TAU = 6.2831853;
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 satur(vec3 c, float s){ float l = lum(c); return clamp(mix(vec3(l), c, s), 0.0, 1.0); }
float ht(vec2 frag, float v, float ang, float size){
  mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)); vec2 q = R * frag; vec2 cell = fract(q / size) - 0.5;
  float d = length(cell); float rad = sqrt(clamp(v, 0.0, 1.0)) * 0.66; return 1.0 - smoothstep(rad - 0.08, rad + 0.08, d);
}
vec2 warp(vec2 uv){
  if (uWarp == 1) { // kaleidoscope
    vec2 q = uv - 0.5; q.x *= uRes.x / uRes.y; float r = length(q); float a = atan(q.y, q.x) + uRot;
    float seg = TAU / uSegs; a = mod(a, seg); if (a > seg * 0.5) a = seg - a; q = vec2(cos(a), sin(a)) * r * 1.15; q.x /= uRes.x / uRes.y;
    uv = q + 0.5; uv = abs(mod(uv + 1.0, 2.0) - 1.0);
  } else if (uWarp == 2) { if (uv.x > 0.5) uv.x = 1.0 - uv.x; }
  return uv;
}
void main(){
  vec2 uv = warp(vUv); vec2 frag = gl_FragCoord.xy;
  vec3 c = texture(uTex, uv).rgb;
  if (uMode == 0) { // pop: punchy saturation + optional posterize
    c = satur(c, uSat); c = pow(c, vec3(0.92));
    if (uLevels > 0.0) c = floor(c * uLevels + 0.5) / uLevels;
  } else if (uMode == 1) { // duotone with a highlight lift
    float l = smoothstep(0.04, 0.96, lum(c)); c = mix(uA, uB, l); c = mix(c, uP, smoothstep(0.86, 1.0, l) * 0.6);
  } else if (uMode == 2) { // CMY halftone on paper
    vec3 k = 1.0 - satur(c, 1.3);
    float cy = ht(frag, k.r, 0.26, uDot), mg = ht(frag, k.g, 1.31, uDot), ye = ht(frag, k.b, 0.0, uDot);
    c = uP * (1.0 - cy * vec3(1.0, 0.0, 0.0) * 0.9) * (1.0 - mg * vec3(0.0, 1.0, 0.0) * 0.9) * (1.0 - ye * vec3(0.0, 0.0, 1.0) * 0.9);
  } else if (uMode == 3) { // two-ink riso with misregistration
    vec3 ca = texture(uTex, warp(vUv + vec2(uMis, -uMis * 0.6) / uRes)).rgb, cb = texture(uTex, warp(vUv - vec2(uMis * 0.8, uMis * 0.4) / uRes)).rgb;
    float a = clamp((1.0 - lum(ca)) * 1.15 + (ca.r - ca.b) * 0.35, 0.0, 1.0), b = clamp((1.0 - lum(cb)) * 1.05 + (cb.b - cb.r) * 0.45, 0.0, 1.0);
    float da = ht(frag, a, 0.3, uDot), db = ht(frag, b, 1.2, uDot * 1.15);
    c = uP * mix(vec3(1.0), uA, da * 0.92) * mix(vec3(1.0), uB, db * 0.85);
  }
  o = vec4(c, 1.0);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const U = Object.fromEntries(['uTex', 'uRes', 'uMode', 'uWarp', 'uA', 'uB', 'uP', 'uLevels', 'uDot', 'uMis', 'uSegs', 'uRot', 'uSat', 'uTime'].map((n) => [n, gl.getUniformLocation(pr, n)]));
  gl.viewport(0, 0, W, H);
  const MODES = { pop: 0, duo: 1, halftone: 2, riso: 3 };
  return {
    canvas: c,
    draw(src, st = {}) {
      gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.uniform1i(U.uTex, 0); gl.uniform2f(U.uRes, W, H); gl.uniform1i(U.uMode, MODES[st.mode || 'pop']); gl.uniform1i(U.uWarp, st.warp || 0);
      gl.uniform3fv(U.uA, rgb(st.a || C.ink)); gl.uniform3fv(U.uB, rgb(st.b || C.yellow)); gl.uniform3fv(U.uP, rgb(st.paper || C.cream));
      gl.uniform1f(U.uLevels, st.levels || 0); gl.uniform1f(U.uDot, st.dot || 9); gl.uniform1f(U.uMis, st.mis || 0); gl.uniform1f(U.uSegs, st.segs || 8);
      gl.uniform1f(U.uRot, st.rot || 0); gl.uniform1f(U.uSat, st.sat ?? 1.45); gl.uniform1f(U.uTime, st.time || 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return c;
    },
  };
}
// final pass: paper grain, punch zoom, flash, small chroma
function createFinal() {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const gl = c.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
  const vs = `#version 300 es
in vec2 p; out vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
  const fs = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform vec2 uRes; uniform float uZoom, uFlash, uChroma, uTime, uShake, uExpo; uniform vec3 uFlashCol;
in vec2 vUv; out vec4 o;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = 0.5 + (vUv - 0.5) / uZoom + vec2(sin(uTime * 61.0), cos(uTime * 47.0)) * uShake;
  vec2 ca = (uv - 0.5) * uChroma / uRes.x;
  vec3 c = vec3(texture(uTex, uv + ca).r, texture(uTex, uv).g, texture(uTex, uv - ca).b);
  float g = h(floor(vUv * uRes) + floor(uTime * 24.0)) - 0.5; float fib = h(floor(vUv * uRes / 3.0)) - 0.5;
  c += g * 0.045 + fib * 0.02;
  c = mix(c, uFlashCol, uFlash); c *= uExpo;
  o = vec4(c, 1.0);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const U = Object.fromEntries(['uTex', 'uRes', 'uZoom', 'uFlash', 'uChroma', 'uTime', 'uShake', 'uExpo', 'uFlashCol'].map((n) => [n, gl.getUniformLocation(pr, n)]));
  gl.viewport(0, 0, W, H);
  return {
    canvas: c,
    draw(src, f) {
      gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.uniform1i(U.uTex, 0); gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uZoom, f.zoom); gl.uniform1f(U.uFlash, f.flash); gl.uniform1f(U.uChroma, f.chroma);
      gl.uniform1f(U.uTime, f.time); gl.uniform1f(U.uShake, f.shake); gl.uniform1f(U.uExpo, f.expo); gl.uniform3fv(U.uFlashCol, rgb(f.flashCol || C.white));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}

export function createEditPop(ctx) {
  const { renderer, camera, ctl, doors, tour, lighting, design, arch, renderNow, setRecording, setSize, setCutaway, captureProbe, tick, fans } = ctx;
  const api = { progress: { frame: 0, total: 0, done: false, error: null } };
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; };
  const [comp, g] = mk(); const [altC, xg] = mk(); const [prevC, pg] = mk(); const [acc, ag] = mk();
  let sty = null, fin = null, flight = null; const floorMat = {}; const floorImg = {};

  // ---------------------------------------------------------------- state
  let stateKey = ''; let curPal = {};
  const lightKey = () => JSON.stringify(lighting.state);
  function setLight(patch) { const b = lightKey(); lighting.apply(patch); return lightKey() !== b; }
  function setFloor(id, rooms) { for (const fm of arch.floorMeshes) if (rooms.includes(fm.userData.room)) fm.material = floorMat[id]; }
  const DEF = { hall: 'beige', dining: 'beige', kitchen: 'beige', mbed: 'beige', chbed: 'blue', office: 'grey', entry: 'beige', corridor: 'beige', washing: 'beige' };
  function scheme(name) {
    if (stateKey === name) return false; stateKey = name; curPal = {};
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

  // ---------------------------------------------------------------- camera + render
  function applyCam(p, l, fov, roll) {
    camera.fov = fov; camera.updateProjectionMatrix(); camera.position.set(p[0], p[2], -p[1]); camera.up.set(0, 1, 0);
    camera.lookAt(l[0], l[2], -l[1]); camera.rotateZ(roll); ctl.player.x = p[0]; ctl.player.y = p[1];
  }
  function cam(shot, u, opt = {}) { const s = S[shot]; const k = opt.lin ? u : ease(u); applyCam(L3(s.p[0], s.p[1], k), L3(s.l[0], s.l[1], k), opt.fov || s.fov, opt.roll || 0); }
  // render a shot and return the stylized canvas
  function shot(name, u, style = {}, opt = {}) { cam(name, clamp01(u), { lin: true, ...opt }); renderNow(); return sty.draw(renderer.domElement, style); }
  function buildFlight(route) {
    tour.buildGrid(); const W0 = route.pts; const pts = [];
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
  const flightS = (F, lt, dur) => { const u = clamp01(lt / dur); return F.len * clamp01(ease(u) * 0.3 + (u + 0.03 * Math.sin(TAU * dur * 2 * u)) * 0.7); };
  function flightShot(F, lt, dur, style) {
    const s = flightS(F, lt, dur); const p = flightAt(F, s); const a1 = flightAt(F, s + 1.5), a2 = flightAt(F, s + 2.4);
    const h0 = Math.atan2(a1[0] - p[0], a1[1] - p[1]), h1 = Math.atan2(a2[0] - a1[0], a2[1] - a1[1]); let dh = h1 - h0; while (dh > Math.PI) dh -= TAU; while (dh < -Math.PI) dh += TAU;
    applyCam(p, [a1[0], a1[1], a1[2] - 0.12], 80, Math.max(-0.28, Math.min(0.28, -dh * 0.6))); renderNow(); return sty.draw(renderer.domElement, style);
  }

  // ---------------------------------------------------------------- 2D vocabulary
  function cover(img, x, y, w, h, gx = g) { const sa = W / H, da = w / h; let sw = W, sh = H, sx = 0, sy = 0; if (da < sa) { sw = H * da; sx = (W - sw) / 2; } else { sh = W / da; sy = (H - sh) / 2; } gx.drawImage(img, sx, sy, sw, sh, x, y, w, h); }
  function shapePath(gx, kind, x, y, w, h) {
    gx.beginPath();
    if (kind === 'circle') gx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, TAU);
    else if (kind === 'arch') { const r = w / 2; gx.moveTo(x, y + h); gx.lineTo(x, y + r); gx.arc(x + r, y + r, r, Math.PI, 0); gx.lineTo(x + w, y + h); gx.closePath(); }
    else if (kind === 'blob') { const cx = x + w / 2, cy = y + h / 2; for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU; const r = 1 + 0.07 * Math.sin(a * 3 + x * 0.01) + 0.05 * Math.sin(a * 5); const px = cx + Math.cos(a) * w / 2 * r, py = cy + Math.sin(a) * h / 2 * r; if (i) gx.lineTo(px, py); else gx.moveTo(px, py); } gx.closePath(); }
    else gx.roundRect(x, y, w, h, Math.min(w, h) * 0.12);
  }
  // die-cut sticker: hard offset shadow, content clipped to shape, white border + ink outline
  function sticker(kind, cx, cy, w, h, rot, sc, content, opt = {}) {
    if (sc <= 0.001) return;
    g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(sc, sc);
    const x = -w / 2, y = -h / 2;
    g.save(); g.translate(opt.shadow ?? 16, opt.shadow ?? 16); shapePath(g, kind, x - 10, y - 10, w + 20, h + 20); g.fillStyle = opt.shadowCol || C.ink; g.fill(); g.restore();
    shapePath(g, kind, x - 10, y - 10, w + 20, h + 20); g.fillStyle = opt.border || C.white; g.fill();
    g.save(); shapePath(g, kind, x, y, w, h); g.clip(); content(x, y, w, h); g.restore();
    shapePath(g, kind, x - 10, y - 10, w + 20, h + 20); g.lineWidth = 4; g.strokeStyle = C.ink; g.stroke();
    g.restore();
  }
  function popText(text, x, y, size, k, opt = {}) { // elastic pop + squash/stretch + hard shadow + ink outline
    if (k <= 0) return; const e = elastic(k / (opt.dur || 0.6)); const sq = 1 + 0.35 * Math.sin(k * 26) * Math.exp(-k * 7);
    g.save(); g.translate(x, y); g.rotate((opt.rot || 0) + (1 - e) * (opt.spin || 0.4)); g.scale(e / sq, e * sq);
    g.font = `900 ${size}px ${HEAVY}`; g.letterSpacing = `${opt.track ?? 0}px`; g.textAlign = opt.align || 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const sx = opt.shadow ?? size * 0.07;
    g.fillStyle = opt.shadowCol || C.ink; g.fillText(text, sx, sx);
    g.lineWidth = size * 0.09; g.strokeStyle = C.ink; g.strokeText(text, 0, 0);
    g.fillStyle = opt.fill || C.white; g.fillText(text, 0, 0);
    g.restore();
  }
  function bounceWord(word, x, y, size, k, colors, opt = {}) { // per-letter bounce in alternating colours
    g.save(); g.font = `900 ${size}px ${HEAVY}`; g.letterSpacing = `${opt.track ?? 4}px`;
    const ws = [...word].map((ch) => g.measureText(ch).width + (opt.track ?? 4)); const tot = ws.reduce((a, b) => a + b, 0); g.restore();
    let cx = x - tot / 2;
    [...word].forEach((ch, i) => { const kk = k - i * (opt.stagger ?? 0.06); popText(ch, cx + ws[i] / 2, y + Math.sin((k + i * 0.3) * 6) * (opt.wave ?? 0) , size, kk, { fill: colors[i % colors.length], rot: (i % 2 ? 0.06 : -0.06), spin: 0.8, dur: 0.55 }); cx += ws[i]; });
  }
  function tag(text, x, y, k, bg = C.yellow, fg = C.ink, size = 30, rot = -0.04) { // pill label
    if (k <= 0) return; const e = backOut(k / 0.35);
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(e, e); g.font = `900 ${size}px ${HEAVY}`; g.letterSpacing = '2px'; const w = g.measureText(text).width + size * 1.2, h = size * 1.6;
    g.fillStyle = C.ink; g.beginPath(); g.roundRect(-w / 2 + 6, -h / 2 + 6, w, h, h / 2); g.fill();
    g.fillStyle = bg; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, h / 2); g.fill(); g.lineWidth = 3; g.strokeStyle = C.ink; g.stroke();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, 2); g.restore();
  }
  function bg(color, pattern = 'dots', t = 0, fg = 'rgba(255,255,255,0.22)') {
    g.fillStyle = color; g.fillRect(0, 0, W, H); g.save(); g.fillStyle = fg; g.strokeStyle = fg;
    if (pattern === 'dots') { const s = 64, o = (t * 40) % s; for (let y = -s; y < H + s; y += s) for (let x = -s; x < W + s; x += s) { const off = ((y / s) % 2) * s / 2; g.beginPath(); g.arc(x + off + o, y + o, 7, 0, TAU); g.fill(); } }
    else if (pattern === 'stripes') { g.lineWidth = 34; const o = (t * 120) % 120; for (let x = -H; x < W + H; x += 120) { g.beginPath(); g.moveTo(x + o, 0); g.lineTo(x + o - H, H); g.stroke(); } }
    else if (pattern === 'checker') { const s = 90, o = (t * 60) % (s * 2); for (let y = -s * 2; y < H + s; y += s) for (let x = -s * 2; x < W + s; x += s) if (((x + y) / s) % 2 === 0) g.fillRect(x + o, y + o, s, s); }
    else if (pattern === 'rays') { const n = 18, a0 = t * 0.6; g.translate(W / 2, H / 2); for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, W, a0 + i * TAU / n, a0 + (i + 0.5) * TAU / n); g.closePath(); g.fill(); } }
    g.restore();
  }
  function starburst(cx, cy, r, k, color, pts = 14, rot = 0) {
    if (k <= 0) return; const e = elastic(k / 0.5); g.save(); g.translate(cx, cy); g.rotate(rot + k * 0.6); g.scale(e, e);
    const path = () => { g.beginPath(); for (let i = 0; i <= pts * 2; i++) { const a = i / (pts * 2) * TAU; const rr = i % 2 ? r * 0.72 : r; const px = Math.cos(a) * rr, py = Math.sin(a) * rr; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); };
    g.translate(14, 14); path(); g.fillStyle = C.ink; g.fill(); g.translate(-14, -14); path(); g.fillStyle = color; g.fill(); g.lineWidth = 5; g.strokeStyle = C.ink; g.stroke(); g.restore();
  }
  function confetti(t, t0, ox, oy, n = 120, seed = 1) {
    const k = t - t0; if (k < 0 || k > 2.2) return;
    for (let i = 0; i < n; i++) {
      const a = hash(i * 3.1 + seed) * TAU, sp = 500 + hash(i * 7.7 + seed) * 1400; const vx = Math.cos(a) * sp, vy = Math.sin(a) * sp - 600;
      const x = ox + vx * k * 0.75, y = oy + vy * k * 0.75 + 1100 * k * k; const rot = k * (4 + hash(i) * 10);
      g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = clamp01(2.2 - k); g.fillStyle = POP[i % POP.length];
      if (i % 3 === 0) { g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill(); } else g.fillRect(-11, -6, 22, 12 * Math.abs(Math.cos(rot * 2)) + 2);
      g.restore();
    }
  }
  function splatWipe(k, cx, cy, img) { // ink-splat shaped reveal of `img` over what's already drawn
    if (k <= 0) return; const R = Math.hypot(W, H) * expoOut(k);
    g.save(); g.beginPath();
    for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU; const r = R * (1 + 0.18 * Math.sin(a * 5 + cx) + 0.1 * Math.sin(a * 9 + cy)); const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
    g.closePath(); g.clip(); g.drawImage(img, 0, 0); g.restore();
  }
  function marquee(text, t, y, size, speed, color, outline = false, rot = 0) {
    g.save(); g.translate(W / 2, y); g.rotate(rot); g.translate(-W / 2, 0); g.font = `900 ${size}px ${HEAVY}`; g.letterSpacing = '6px'; g.textBaseline = 'middle';
    const unit = text + ' ✦ '; const w = g.measureText(unit).width; let x = -((((t * speed) % w) + w) % w) - w;
    while (x < W + w) { if (outline) { g.lineWidth = 4; g.strokeStyle = color; g.strokeText(unit, x, 0); } else { g.fillStyle = color; g.fillText(unit, x, 0); } x += w; }
    g.restore();
  }

  // ---------------------------------------------------------------- sections
  const SEC = {
    intro(lt, t) { // HELLO HOME!
      scheme('final'); setLight(DAY); setCutaway(false);
      bg(C.pink, 'dots', t);
      marquee('RESIDENCE · DESIGN STUDIO', t, 110, 70, 180, 'rgba(255,255,255,0.35)', true, -0.04);
      marquee('PALETTES · FLOORS · LIGHT', t, H - 100, 70, -180, 'rgba(255,255,255,0.35)', true, -0.04);
      const img = shot('intro', lt / 3, { mode: 'duo', a: C.ink, b: C.yellow, paper: C.white });
      const grow = expoIn((lt - 2.45) / 0.55); const r = lerp(330, 1250, grow);
      sticker('circle', W / 2, H / 2 + 20, r * 2, r * 2, 0, elastic(lt / 0.7), (x, y, w, h) => cover(img, x, y, w, h));
      if (grow < 0.3) {
        popText('HELLO,', W / 2 - 520, H / 2 - 300, 150, lt - 0.45, { fill: C.yellow, rot: -0.12 });
        popText('HOME!', W / 2 + 540, H / 2 + 320, 170, lt - 0.85, { fill: C.cyan, rot: 0.1 });
        bounceWord('RESIDENCE', W / 2, H / 2 + 30, 150, lt - 1.3, [C.white, C.yellow, C.cyan, C.orange, C.mint], { wave: 10 });
      }
      confetti(t, 2.0, W / 2, H / 2, 140, 3);
    },
    tour(lt, t) { // stickers of every room pop onto colour fields
      scheme('final'); setLight(DAY);
      bg([C.cyan, C.orange, C.lilac][Math.min(2, Math.floor(lt / 2))], ['checker', 'stripes', 'dots'][Math.min(2, Math.floor(lt / 2))], t);
      const out = expoIn((lt - 5.55) / 0.45);
      popText('ROOM TOUR!', W / 2, 92, 96, lt, { fill: C.yellow, rot: -0.03 });
      TOUR.forEach(([name, label, kind], i) => {
        const k = lt - 0.4 - i * BEAT; if (k < 0) return;
        const col = i % 3, row = Math.floor(i / 3); const w = 470, h = kind === 'circle' ? 380 : 360;
        const cx = 360 + col * 600 + (row ? 40 : -40), cy = 370 + row * 440;
        const fly = out * (i % 2 ? 1 : -1); const rot = (i % 2 ? 0.07 : -0.06) + Math.sin(t * 2 + i) * 0.03 + fly * 0.8;
        const img = shot(name, 0.15 + (lt - i * BEAT) / 7, { mode: 'pop', sat: 1.6, levels: 0 });
        sticker(kind, cx + fly * 1400, cy - Math.abs(fly) * 300, kind === 'circle' ? 380 : w, h, rot, elastic(k / 0.6), (x, y, ww, hh) => cover(img, x, y, ww, hh));
        tag(label, cx + fly * 1400, cy + h / 2 + 30 - Math.abs(fly) * 300, k - 0.2, POP[(i + 2) % POP.length], C.ink, 30, rot);
      });
    },
    colour(lt, t) { // PICK A COLOUR! — paint chips and an ink-splat palette swap
      scheme('default'); setLight(DAY);
      const i = Math.max(0, Math.min(5, Math.floor((lt - 0.5) / BEAT))); const p = PALETTES.find((q) => q.id === PAL_ORDER[i]);
      const big = expoIn((lt - 3.2) / 0.5) * (lt < 5.6 ? 1 : 1 - expoOut((lt - 5.6) / 0.4) * 0);
      bg(hex(p.accent), 'stripes', t, 'rgba(255,255,255,0.18)');
      // living-room card (right) with palette flips revealed by ink splats
      const ccx = lerp(1220, W / 2, big), ccy = lerp(560, H / 2, big), cw = lerp(980, W + 80, big), ch = lerp(620, H + 80, big);
      const k = lt - 0.5 - i * BEAT;
      let img;
      if (i > 0 && k < 0.35 && lt < 3.5) { pal('hall', PAL_ORDER[i - 1]); const a = shot('livHold', lt / 6, { mode: 'pop', sat: 1.5 }); pg.drawImage(a, 0, 0); }
      pal('hall', lt < 3.5 ? PAL_ORDER[i] : 'terracotta');
      img = shot('livHold', lt / 6, { mode: 'pop', sat: 1.5, levels: lt > 3.5 ? 6 : 0 });
      xg.drawImage(img, 0, 0);
      sticker('round', ccx, ccy, cw, ch, lerp(-0.04, 0, big), elastic(lt / 0.6), (x, y, w, h) => {
        if (i > 0 && k < 0.35 && lt < 3.5) { cover(prevC, x, y, w, h); g.save(); g.translate(x, y); g.scale(w / W, h / H); splatWipe(k / 0.35, W * 0.62, H * 0.4, altC); g.restore(); }
        else cover(altC, x, y, w, h);
      }, { shadow: lerp(18, 0, big) });
      if (big < 0.5) {
        popText('PICK A', 360, 150, 110, lt, { fill: C.white, rot: -0.06 }); popText('COLOUR!', 380, 270, 130, lt - 0.15, { fill: C.yellow, rot: -0.04 });
        PAL_ORDER.forEach((id, j) => { // fanned paint chips; the active one jumps forward
          const q = PALETTES.find((x) => x.id === id); const active = j === i && lt >= 0.5; const kk = lt - 0.2 - j * 0.08;
          if (kk <= 0) return; const e = backOut(kk / 0.4);
          const cx = 140 + j * 85, cy = 720 - (active ? 60 : 0) * backOut((lt - 0.5 - j * BEAT) / 0.3); const rot = -0.35 + j * 0.13;
          g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(e, e);
          g.fillStyle = C.ink; g.fillRect(-70 + 10, -150 + 10, 160, 300); g.fillStyle = C.white; g.fillRect(-70, -150, 160, 300);
          g.fillStyle = hex(q.accent); g.fillRect(-60, -140, 140, 170); g.fillStyle = hex(q.upholstery); g.fillRect(-60, 30, 140, 45);
          g.fillStyle = C.ink; g.font = `900 17px ${HEAVY}`; g.textAlign = 'left'; g.fillText(q.name.split(' ').pop().toUpperCase(), -58, 108);
          g.lineWidth = 3; g.strokeStyle = C.ink; g.strokeRect(-70, -150, 160, 300); g.restore();
        });
        if (lt >= 0.5 && lt < 3.5) tag(p.name.toUpperCase() + '!', 1220, 930, k, C.white, C.ink, 40, 0.03);
      } else {
        popText('SAND &', W / 2, H / 2 - 120, 190, lt - 3.8, { fill: C.cream, rot: -0.05 });
        popText('TERRACOTTA!', W / 2, H / 2 + 90, 190, lt - 4.0, { fill: C.orange, rot: 0.03 });
        starburst(1600, 220, 130, lt - 4.3, C.yellow, 16); popText('YES!', 1600, 222, 70, lt - 4.4, { fill: C.pink });
      }
    },
    kaleido(lt, t) { // DESIGN IS PLAY — kaleidoscope of the living room cycling palettes, then night moods
      scheme('default');
      const night = lt >= 3;
      if (!night) { setLight(DAY); pal('hall', ['blue', 'green', 'terracotta', 'brown', 'grey', 'blue'][Math.min(5, Math.floor(lt / BEAT))]); }
      else { pal('hall', 'terracotta'); const m = ['accent', 'violet', 'blue', 'amber', 'accent', 'violet'][Math.min(5, Math.floor((lt - 3) / BEAT))]; setLight({ ...NIGHT, style: m, kelvin: 2800 }); }
      const img = shot('kaleido', lt / 6, { mode: 'pop', warp: 1, segs: 8 + Math.floor(lt) % 2 * 4, rot: lt * 0.5, sat: 1.7, levels: night ? 5 : 0 });
      g.drawImage(img, 0, 0);
      const words = night ? [['NIGHT', 3.0], ['MODE', 3.5], ['ON!', 4.0]] : [['DESIGN', 0.3], ['IS', 0.8], ['PLAY', 1.3]];
      words.forEach(([w, at], j) => popText(w, W / 2, H / 2 - 170 + j * 170, 170, lt - at, { fill: [C.yellow, C.white, C.pink][j], rot: (j - 1) * 0.06 }));
      if (!night) starburst(W / 2 + 520, H / 2 - 260, 110, lt - 1.8, C.cyan, 12);
    },
    floor(lt, t) { // FLOOR IT! — tile rain, then flips inside an arch
      scheme('default'); pal('hall', 'terracotta'); design.applyPalette('green', ['hall'], ['soft']); setLight(DAY);
      bg(C.yellow, 'checker', t, 'rgba(255,255,255,0.35)');
      const flips = lt >= 2 && lt < 5; const fi = Math.max(0, Math.min(7, Math.floor((lt - 2) / 0.375)));
      const archIn = elastic((lt - 1.6) / 0.6) * (1 - expoIn((lt - 5.5) / 0.5));
      // tiles: rain into a grid, then shrink into a strip along the bottom
      const strip = ease((lt - 1.5) / 0.5);
      FLOORS8.forEach((id, j) => {
        const k = lt - 0.3 - j * 0.08; if (k < 0) return; const land = backOut(k / 0.5);
        const gx = 360 + (j % 4) * 400, gy = 300 + Math.floor(j / 4) * 400; const sx = 180 + j * 222, sy = H - 120;
        let x = lerp(gx, sx, strip), y = lerp(-300, gy, land); y = lerp(y, sy, strip); const size = lerp(330, 180, strip);
        const active = flips && j === FLOOR_ORDER_IDX(fi); const jump = active ? -50 * backOut(((lt - 2) % 0.375) / 0.2) : 0;
        const out = expoIn((lt - 5.5) / 0.5);
        g.save(); g.translate(x + out * (j - 3.5) * 300, y + jump - out * 900); g.rotate((hash(j) - 0.5) * 0.3 + k * (1 - land) * 3 + out * 3);
        g.fillStyle = C.ink; g.fillRect(-size / 2 + 10, -size / 2 + 10, size, size); g.fillStyle = C.white; g.fillRect(-size / 2 - 8, -size / 2 - 8, size + 16, size + 16);
        const im = floorImg[id]; if (im) g.drawImage(im, 0, 0, Math.min(im.width, 400), Math.min(im.height, 400), -size / 2, -size / 2, size, size);
        g.lineWidth = active ? 8 : 3; g.strokeStyle = active ? C.pink : C.ink; g.strokeRect(-size / 2 - 8, -size / 2 - 8, size + 16, size + 16); g.restore();
      });
      if (lt < 1.6) popText('FLOOR IT!', W / 2, 150, 170, lt, { fill: C.pink, rot: -0.05 });
      if (archIn > 0.001) {
        const id = FLOORS8[FLOOR_ORDER_IDX(fi)];
        const k = (lt - 2) - fi * 0.375;
        if (flips && fi > 0 && k < 0.25) { setFloor(FLOORS8[FLOOR_ORDER_IDX(fi - 1)], LIVING); pg.drawImage(shot('floorSkim', (lt - 1.6) / 4, { mode: 'pop', sat: 1.4 }), 0, 0); }
        setFloor(flips || lt >= 5 ? id : 'porcelain', LIVING);
        const img = shot('floorSkim', (lt - 1.6) / 4, { mode: 'pop', sat: 1.4 }); xg.drawImage(img, 0, 0);
        sticker('arch', W / 2, H / 2 - 70, 900, 760, -0.02, archIn, (x, y, w, h) => {
          if (flips && fi > 0 && k < 0.25) { cover(prevC, x, y, w, h); g.save(); g.translate(x, y); g.scale(w / W, h / H); splatWipe(k / 0.25, W * 0.5, H * 0.75, altC); g.restore(); } else cover(altC, x, y, w, h);
        });
        const f = FLOOR_OPTIONS.find((q) => q.id === id); tag(f.name.toUpperCase(), W / 2, 120, lt - 1.9, C.pink, C.white, 40, 0.04);
      }
    },
    lights(lt, t) { // LIGHTS ON! — comic bursts per mood, strobe
      scheme('final');
      const day = lt < 1; const mi = Math.max(0, Math.min(3, Math.floor((lt - 1) / 0.75)));
      const moods = [['amber', 'AMBER!', C.orange], ['blue', 'MOONLIGHT!', C.blue], ['violet', 'VIOLET!', C.lilac], ['accent', 'PARTY!', C.pink]];
      const strobe = lt >= 4; const step = Math.floor((lt - 4) / 0.125);
      if (day) setLight(DAY);
      else if (!strobe) setLight({ ...NIGHT, style: moods[mi][0], kelvin: NIGHT_STYLES.find((s) => s.id === moods[mi][0]).kelvin });
      else { const pat = [[1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 0, 0], [0, 0, 1, 1]][step % 4]; setLight({ ...NIGHT, style: 'accent', layers: { profiles: !!pat[0], spots: !!pat[1], coves: !!pat[2], downlights: !!pat[3] } }); }
      const col = day ? C.cyan : strobe ? POP[step % POP.length] : moods[mi][2];
      bg(day ? C.cyan : C.ink, 'rays', t, day ? 'rgba(255,255,255,0.25)' : col + '55');
      const img = shot('livNight', lt / 6, { mode: 'pop', sat: 1.6 });
      const k = day ? lt : strobe ? (lt - 4) % 0.125 : (lt - 1) - mi * 0.75;
      if (!day && !strobe) starburst(W / 2, H / 2, 560, k + 0.2, col, 18, mi);
      sticker('circle', W / 2, H / 2, 760, 760, 0, elastic(lt / 0.6) * (strobe ? 1 + 0.03 * Math.sin(step * 3) : 1), (x, y, w, h) => cover(img, x, y, w, h), { border: day ? C.white : col });
      if (day) { popText('LIGHTS', 470, 300, 140, lt, { fill: C.yellow, rot: -0.08 }); popText('...', 470, 440, 140, lt - 0.3, { fill: C.white }); }
      else if (!strobe) { popText(moods[mi][1], W / 2 + 560, H / 2 + 300, 130, k, { fill: col, rot: 0.08 }); popText('ON!', 330, 250, 170, lt - 1, { fill: C.yellow, rot: -0.1 }); }
      else { popText('BLINK', 360, 300, 130, (lt - 4), { fill: POP[step % 6], rot: -0.08 }); popText('BLINK!', W - 380, H - 280, 130, (lt - 4.25), { fill: POP[(step + 3) % 6], rot: 0.08 }); }
    },
    mirror(lt, t) { // MIRROR MIRROR — symmetric bedrooms, duotones swapping on the beat
      const kids = lt < 3; const bi = Math.floor((kids ? lt : lt - 3) / 0.75);
      const pairs = [[C.ink, C.pink], [C.blue, C.yellow], [C.ink, C.mint], [C.red, C.cream]];
      const [ca, cb] = pairs[(bi + (kids ? 0 : 2)) % pairs.length];
      if (kids) { scheme('default'); setLight(DAY); pal('chbed', ['blue', 'terracotta', 'green', 'green'][Math.min(3, bi)]); }
      else { scheme('default'); const steps = [() => { setLight(DAY); pal('mbed', 'brown'); setFloor('oak', ['mbed']); }, () => { setLight(DAY); pal('mbed', 'brown'); setFloor('chevron', ['mbed']); }, () => { pal('mbed', 'brown'); setFloor('chevron', ['mbed']); setLight({ ...NIGHT, style: 'amber', kelvin: 2300 }); }, () => { pal('mbed', 'brown'); setFloor('chevron', ['mbed']); setLight({ ...NIGHT, style: 'amber', kelvin: 2300, brightness: 0.6 }); }]; steps[Math.min(3, bi)](); }
      const duo = bi % 2 === 1;
      const img = shot(kids ? 'kidsHold' : 'masterHold', (kids ? lt : lt - 3) / 3, duo ? { mode: 'duo', a: ca, b: cb, paper: C.white, warp: 2 } : { mode: 'pop', sat: 1.5, warp: 2 });
      g.drawImage(img, 0, 0);
      g.save(); g.fillStyle = C.white; g.fillRect(W / 2 - 3, 0, 6, H); g.restore();
      popText(kids ? 'MIRROR' : 'MASTER', W / 2, 140, 150, (kids ? lt : lt - 3), { fill: C.yellow, rot: -0.03 });
      popText(kids ? 'MIRROR!' : 'SUITE!', W / 2, 290, 150, (kids ? lt : lt - 3) - 0.2, { fill: C.pink, rot: 0.03 });
      const labels = kids ? ['SOPHISTICATED BLUE', 'SAND & TERRACOTTA', 'NATURE GREEN', 'NATURE GREEN'] : ['EARTHY BROWN', 'WALNUT CHEVRON', 'AMBER LOUNGE', 'DIM 60%'];
      tag(labels[Math.min(3, bi)], W / 2, H - 120, ((kids ? lt : lt - 3) - bi * 0.75), POP[bi % 6], C.ink, 40, (bi % 2 ? 0.04 : -0.04));
    },
    riso(lt, t) { // TAKE THE TOUR — riso-printed drone flight
      scheme('final'); setLight(DAY);
      const beat = (lt % BEAT) / BEAT; const mis = 3 + 14 * (1 - expoOut(beat * 2));
      const inks = [[C.pink, C.blue], [C.orange, C.blue], [C.pink, C.mint]][Math.floor(lt / 2) % 3];
      const img = flightShot(flight, lt, 6, { mode: 'riso', a: inks[0], b: inks[1], paper: C.cream, dot: 7, mis });
      g.drawImage(img, 0, 0);
      marquee('TAKE THE TOUR', t, H / 2 - 20, 260, 520, 'rgba(27,21,48,0.85)', true, -0.06);
      const s = flightS(flight, lt, 6); let wi = 0; flight.wpS.forEach((ws, i) => { if (ws <= s + 0.3) wi = i; });
      while (wi > 0 && flight.tags[wi] === flight.tags[wi - 1]) wi--;
      let t0 = 0; for (let x = lt; x > 0; x -= 1 / 60) { const s2 = flightS(flight, x, 6); let w2 = 0; flight.wpS.forEach((ws, i) => { if (ws <= s2 + 0.3) w2 = i; }); while (w2 > 0 && flight.tags[w2] === flight.tags[w2 - 1]) w2--; if (w2 !== wi) { t0 = x; break; } }
      tag(flight.tags[wi], 300, H - 150, lt - t0, inks[0], C.white, 56, -0.06);
    },
    peel(lt, t) { // BEFORE → AFTER → NIGHT, revealed by page peels
      scheme('default'); setLight(DAY);
      const stage = lt < 3 ? 0 : 1; const lk = stage ? lt - 3 : lt;
      const A = stage ? ['final', DAY] : ['default', DAY], B = stage ? ['final', { ...NIGHT, style: 'violet', kelvin: 2700 }] : ['final', DAY];
      scheme(A[0]); setLight(A[1]); xg.drawImage(shot('baHold', lt / 6, { mode: 'pop', sat: 1.35 }), 0, 0);
      scheme(B[0]); setLight(B[1]); const after = shot('baHold', lt / 6, { mode: 'pop', sat: 1.35 });
      g.drawImage(after, 0, 0);
      const p = ease((lk - 0.35) / 1.9);
      // half-plane polygon clipping (Sutherland–Hodgman) of the screen against x + y >= c (or <=)
      const clipHP = (poly, c, keepAbove) => { const out = []; const inside = (q) => (keepAbove ? q[0] + q[1] >= c : q[0] + q[1] <= c);
        for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const ia = inside(a), ib = inside(b);
          if (ia) out.push(a); if (ia !== ib) { const k = (c - a[0] - a[1]) / ((b[0] + b[1]) - (a[0] + a[1])); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); } }
        return out; };
      const screen = [[0, 0], [W, 0], [W, H], [0, H]];
      const fromBR = stage === 0; // stage 0 peels from bottom-right, stage 1 from top-left
      const c = fromBR ? (W + H) * (1 - p) : (W + H) * p;
      const keep = clipHP(screen, c, !fromBR), peeled = clipHP(screen, c, fromBR);
      const path = (poly) => { g.beginPath(); poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
      if (keep.length > 2) { g.save(); path(keep); g.clip(); g.drawImage(altC, 0, 0); g.restore(); }
      if (p > 0.001 && p < 0.999 && peeled.length > 2) { // the curled flap: peeled region reflected over the fold, squeezed toward it
        const flap = peeled.map(([x, y]) => { const rx = c - y, ry = c - x; const d = (x + y - c) / 2; return [lerp(rx, x - d, 0.45), lerp(ry, y - d, 0.45)]; });
        g.save(); g.shadowColor = 'rgba(27,21,48,0.5)'; g.shadowBlur = 45; g.shadowOffsetX = fromBR ? -14 : 14; g.shadowOffsetY = fromBR ? -14 : 14;
        path(flap); const gr = g.createLinearGradient(fromBR ? W : 0, fromBR ? H : 0, fromBR ? 0 : W, fromBR ? 0 : H); gr.addColorStop(0, '#fffdf6'); gr.addColorStop(1, '#eadcc0'); g.fillStyle = gr; g.fill(); g.restore();
        g.save(); path(flap); g.lineWidth = 3; g.strokeStyle = C.ink; g.stroke(); g.restore();
      }
      const [la, lb] = stage ? ['DAY', 'NIGHT!'] : ['BEFORE', 'AFTER!'];
      tag(la, 230, 120, lk, C.white, C.ink, 46, -0.05); tag(lb, W - 260, H - 130, lk - 1.2, C.pink, C.white, 56, 0.05);
      if (lk > 2.2) starburst(W - 260, H - 300, 120, lk - 2.2, C.yellow, 14);
    },
    polaroid(lt, t) { // tossed polaroids pile up, then zoom into the last one
      scheme('final'); setLight(lt < 3 ? DAY : { ...NIGHT, style: 'amber', kelvin: 2300 });
      bg(C.mint, 'dots', t, 'rgba(255,255,255,0.3)');
      popText('SNAP!', W / 2, H / 2, 300, lt - 0.0, { fill: C.yellow, rot: -0.05 });
      const zk = ease((lt - 5.2) / 0.8);
      POLAROIDS.forEach(([name, cap], i) => {
        const k = lt - 0.35 - i * 0.5; if (k < 0) return; const land = backOut(k / 0.45);
        const tx = 300 + (i % 3) * 660 + (hash(i * 3) - 0.5) * 140, ty = 290 + Math.floor(i / 3) * 290 + (hash(i * 5) - 0.5) * 80;
        const sx = i % 2 ? W + 500 : -500, sy = H + 300; let x = lerp(sx, tx, land), y = lerp(sy, ty, land); let rot = (hash(i * 7) - 0.5) * 0.5 + (1 - land) * (i % 2 ? 1.5 : -1.5);
        let w = 520, h = 380, sc = 1;
        if (i === POLAROIDS.length - 1 && zk > 0) { x = lerp(x, W / 2, zk); y = lerp(y, H / 2 + 60 * (1 - zk), zk); rot = lerp(rot, 0, zk); sc = lerp(1, 3.9, zk); }
        const img = shot(name, 0.2 + k / 4, { mode: 'pop', sat: 1.5 });
        g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc);
        g.fillStyle = 'rgba(27,21,48,0.35)'; g.fillRect(-w / 2 - 22 + 14, -h / 2 - 22 + 14, w + 44, h + 110);
        g.fillStyle = '#fffdf8'; g.fillRect(-w / 2 - 22, -h / 2 - 22, w + 44, h + 110);
        cover(img, -w / 2, -h / 2, w, h);
        const flash = clamp01(1 - k / 0.25); if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash})`; g.fillRect(-w / 2, -h / 2, w, h); }
        g.fillStyle = C.ink; g.font = `italic 700 34px ${BOLD}`; g.textAlign = 'center'; g.fillText(cap, 0, h / 2 + 55);
        g.restore();
      });
    },
    end(lt, t) { // confetti logo
      setCutaway(false);
      g.fillStyle = C.pink; g.fillRect(0, 0, W, H);
      g.save(); g.fillStyle = C.yellow; g.beginPath(); g.moveTo(W * lerp(1.2, 0.55, expoOut(lt / 0.5)), 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(W * lerp(1.2, 0.35, expoOut(lt / 0.5)), H); g.closePath(); g.fill(); g.restore();
      bg('rgba(0,0,0,0)', 'dots', t, 'rgba(255,255,255,0.2)');
      bounceWord('RESIDENCE', W / 2, H / 2 - 40, 210, lt - 0.1, [C.white, C.cyan, C.yellow, C.mint, C.orange], { wave: 8, stagger: 0.05 });
      tag('DESIGN STUDIO ✦ LIVE RESTYLING', W / 2, H / 2 + 150, lt - 0.7, C.ink, C.yellow, 40, -0.02);
      tag('PALETTES · FLOORS · LIGHT', W / 2, H / 2 + 260, lt - 0.95, C.white, C.ink, 30, 0.03);
      confetti(t, 57.05, W / 2, H / 2, 160, 9); confetti(t, 57.6, 300, H, 80, 4); confetti(t, 57.8, W - 300, H, 80, 6);
      const iris = expoIn((lt - 2.3) / 0.7); if (iris > 0) { g.save(); g.fillStyle = C.ink; g.beginPath(); g.rect(0, 0, W, H); g.arc(W / 2, H / 2, Math.hypot(W, H) * (1 - iris), 0, TAU, true); g.fill('evenodd'); g.restore(); }
    },
  };
  const FLOOR_ORDER_IDX = (i) => [0, 5, 2, 3, 4, 1, 7, 6][i]; // porcelain, nero, travertine, concrete, terrazzo, statuario, chevron, oak

  async function drawFrame(t) {
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
    const sec = SECTIONS.find((s) => t >= s[1] && t < s[2]) || SECTIONS[SECTIONS.length - 1];
    SEC[sec[0]](t - sec[1], t);
  }

  // ---------------------------------------------------------------- final-pass envelopes
  const hits = []; const P = (t, o) => hits.push({ t, zoom: 0, flash: 0, chroma: 0, shake: 0, dur: 0.3, col: C.white, ...o });
  for (const [, t0] of SECTIONS) if (t0 > 0) P(t0, { zoom: 0.09, flash: 0.55, chroma: 10, shake: 0.004, col: POP[Math.floor(t0) % 6] });
  for (let i = 0; i < 6; i++) P(3.4 + i * BEAT, { zoom: 0.035, chroma: 5 });
  for (let i = 0; i < 6; i++) P(9.5 + i * BEAT, { zoom: 0.05, chroma: 8, flash: 0.12, col: C.yellow });
  for (let i = 0; i < 8; i++) P(23 + i * 0.375, { zoom: 0.03, chroma: 5 });
  for (let i = 0; i < 4; i++) P(28 + i * 0.75, { zoom: 0.08, chroma: 12, shake: 0.006, flash: 0.15, col: POP[i] });
  for (let i = 0; i < 16; i++) P(31 + i * 0.125, { zoom: 0.015, chroma: 6, flash: 0.08, col: POP[i % 6] });
  for (let i = 0; i < 8; i++) P(33 + i * 0.75, { zoom: 0.04, chroma: 7 });
  for (let i = 0; i < 12; i++) P(39 + i * BEAT, { zoom: 0.03, chroma: 10 });
  for (let i = 0; i < 9; i++) P(51.35 + i * 0.5, { zoom: 0.04, flash: 0.25, chroma: 6 });
  P(2.0, { zoom: 0.12, flash: 0.8, chroma: 16, shake: 0.006, col: C.yellow });
  P(57.05, { zoom: 0.14, flash: 0.9, chroma: 18, shake: 0.008, col: C.yellow });
  function finalAt(t) {
    const f = { zoom: 1, flash: 0, chroma: 1.0, shake: 0, time: t, expo: 1, flashCol: C.white };
    for (const h of hits) { const k = t - h.t; if (k < 0 || k > h.dur) continue; const d = Math.exp(-k / (h.dur * 0.3)); f.zoom += h.zoom * d; f.chroma += h.chroma * d; f.shake += h.shake * d; const fl = h.flash * Math.exp(-k / (h.dur * 0.18)); if (fl > f.flash) { f.flash = fl; f.flashCol = h.col; } }
    if (t < 0.25) f.expo = t / 0.25;
    return f;
  }
  function samplesAt(t) { const sec = (SECTIONS.find((s) => t >= s[1] && t < s[2]) || [''])[0]; if (sec === 'riso') return [3, 0.9]; if (sec === 'kaleido') return [2, 1.0]; return [2, 0.8]; }
  async function frameAt(t, fps) {
    const [n, shutter] = samplesAt(t);
    for (let s = 0; s < n; s++) { const ts = t + ((s + 0.5) / n - 0.5) * shutter / fps; await drawFrame(ts); ag.globalAlpha = 1 / (s + 1); ag.drawImage(comp, 0, 0); }
    ag.globalAlpha = 1; fin.draw(acc, finalAt(t));
  }
  async function prepare() {
    for (const f of FLOOR_OPTIONS) { floorMat[f.id] = await design.floorMaterial(f.id); floorImg[f.id] = floorMat[f.id].map && floorMat[f.id].map.image; }
    doors.list.forEach((d) => { d.state.t = 1; d.state.target = 1; d.update(0); });
    flight = buildFlight(ROUTE);
    doors.list.forEach((d) => { d.state.t = 1; d.state.target = 1; d.update(0); });
    stateKey = ''; curPal = {}; sty = sty || createStylizer(); fin = fin || createFinal();
  }
  const SRV = 'http://localhost:5302';
  async function post(path, data) { for (let a = 0; a < 6; a++) { try { const r = await fetch(SRV + path, { method: 'POST', body: data }); if (r.ok) return r; } catch { /* retry */ } await new Promise((r) => setTimeout(r, 400)); } throw new Error('stream post failed: ' + path); }

  api.run = async ({ fps = 60, snaps = null, name = 'pop_edit_60s_1080p60' } = {}) => {
    const saved = { design: design.snapshot(), light: JSON.parse(JSON.stringify(lighting.state)) };
    try {
      const N = Math.round(TOTAL * fps); api.progress = { frame: 0, total: N, done: false, error: null };
      setRecording(true); setSize(W, H); ctl.enterExplore({ x: 9.85, y: 7.95, yawDeg: 315 }); setCutaway(false);
      await prepare();
      for (let w = 0; w < 4; w++) { await frameAt(1 + w * 14, fps); await tick(); }
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
        if (list) { const s = list.find((q) => q[0] === f); if (!s) continue; await frameAt(t, fps); const b = await new Promise((r) => fin.canvas.toBlob(r, 'image/jpeg', 0.86)); await post(`/snap?name=${s[1]}`, b); api.progress.frame = f; continue; }
        fans.forEach((fan) => { fan.userData.rotor.rotation.y += 1.2 / fps; });
        await frameAt(t, fps);
        const vf = new VideoFrame(fin.canvas, { timestamp: Math.round(f * 1e6 / fps), duration: Math.round(1e6 / fps) });
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
    finally { setCutaway(false); setRecording(false); stateKey = ''; curPal = {}; await design.restore(saved.design); lighting.apply(saved.light); captureProbe(); }
  };
  return api;
}
