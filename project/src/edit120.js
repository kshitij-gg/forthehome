// 120-second showcase edit (volume II): house styles, 2026 palettes, tile library, lighting scenes + colour wheel, mandir.
// Same engine as edit60.js: section sequencer, sub-frame motion blur, WebGL FX pass, H.264 encoder to the local streamer.
// 120 BPM (beat 0.5 s); every section starts on a bar line so the soundtrack locks to picture.
import * as THREE from 'three';
import { PALETTES, FLOOR_OPTIONS, SURFACES, HOUSE_STYLES } from './design/design.js';
import { LIGHT_SCENES } from './lighting/lighting.js';

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
const hsv = (h, s, v) => { const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), tt = v * (1 - (1 - f) * s); const [r, g, b] = [[v, tt, p], [q, v, p], [p, v, tt], [p, q, v], [tt, p, v], [v, p, q]][((i % 6) + 6) % 6]; return ((r * 255) << 16) | ((g * 255) << 8) | (b * 255 | 0); };

// ---------------------------------------------------------------- timeline (seconds)
export const SECTIONS = [
  ['intro', 0, 4], ['plan', 4, 10], ['flightA', 10, 14], ['styles', 14, 24], ['flightB', 24, 28], ['colour', 28, 36],
  ['floor', 36, 42], ['light', 42, 52], ['flightC', 52, 56], ['mandir', 56, 70], ['beforeafter', 70, 76], ['aerial', 76, 80],
  ['bedrooms', 80, 84], ['nightgrid', 84, 90], ['flightD', 90, 94], ['rooms', 94, 100], ['macro', 100, 106], ['finale', 106, 114], ['end', 114, 120],
];
const TOTAL = 120;

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
  floorMacro: { p: [[9.6, 7.3, 0.95], [9.45, 6.85, 0.75]], l: [[9.15, 6.0, 0.0], [9.05, 5.6, 0.0]], fov: 55 },
  lapse: { p: [[5.6, 4.55, 1.3], [7.0, 5.15, 1.7]], l: [[10.5, 5.5, 1.1], [10.6, 6.1, 1.2]], fov: 76 },
  livNight: { p: [[10.25, 5.95, 1.75], [9.2, 5.5, 1.45]], l: [[6.2, 6.2, 1.05], [6.4, 6.7, 1.0]], fov: 72 },
  intro: { p: [[9.9, 6.0, 1.3], [9.0, 5.75, 1.6]], l: [[6.0, 6.3, 1.0], [6.2, 6.4, 1.1]], fov: 70 },
  officeBal: { p: [[12.6, 9.9, 1.6], [13.6, 9.92, 1.5]], l: [[16.0, 9.9, 1.3], [16.5, 9.5, 1.2]], fov: 74 },
  aerial: { p: [[16.5, -6.5, 13.5], [11.5, -9.0, 12.0]], l: [[7.2, 6.0, 0.3], [6.9, 5.6, 0.3]], fov: 42 },
  // mandir (murti at plan x 12.88, y 7.226; body 0.83–1.70 m)
  mandirIn: { p: [[10.3, 7.226, 1.6], [11.6, 7.226, 1.45]], l: [[12.9, 7.226, 1.35], [12.9, 7.226, 1.3]], fov: 62 },
  murtiCrane: { p: [[12.35, 7.226, 0.95], [12.4, 7.226, 1.65]], l: [[12.9, 7.226, 1.0], [12.9, 7.226, 1.62]], fov: 50 },
  chakra: { p: [[12.5, 7.30, 1.6], [12.52, 7.36, 1.62]], l: [[12.88, 7.41, 1.59], [12.88, 7.41, 1.59]], fov: 40 },
  shankha: { p: [[12.5, 7.15, 1.58], [12.52, 7.10, 1.6]], l: [[12.88, 7.04, 1.57], [12.88, 7.04, 1.57]], fov: 40 },
  crown: { p: [[12.45, 7.20, 1.62], [12.47, 7.25, 1.68]], l: [[12.88, 7.226, 1.66], [12.88, 7.226, 1.68]], fov: 38 },
  padma: { p: [[12.5, 7.33, 1.25], [12.52, 7.30, 1.3]], l: [[12.85, 7.36, 1.31], [12.85, 7.33, 1.28]], fov: 40 },
  rangoli: { p: [[11.75, 7.226, 1.5], [11.85, 7.226, 1.35]], l: [[12.05, 7.226, 0], [12.1, 7.226, 0]], fov: 60 },
  samai: { p: [[12.0, 7.75, 0.9], [12.05, 7.6, 0.85]], l: [[12.33, 7.646, 0.64], [12.33, 7.646, 0.64]], fov: 45 },
  bells: { p: [[12.2, 7.6, 1.75], [12.25, 7.62, 1.9]], l: [[12.58, 7.716, 1.95], [12.58, 7.716, 2.0]], fov: 45 },
  onyx: { p: [[12.45, 7.5, 1.95], [12.5, 7.42, 2.05]], l: [[13.0, 7.3, 1.9], [13.0, 7.26, 1.95]], fov: 44 },
  mandirWide: { p: [[11.3, 7.226, 1.5], [10.9, 7.226, 1.6]], l: [[12.9, 7.226, 1.4], [12.9, 7.226, 1.45]], fov: 58 },
};
const STYLE_ORDER = ['original', 'modernluxe', 'japandi', 'mediterranean', 'indian', 'artdeco', 'wabisabi', 'scandi', 'moody', 'parisian'];
const STYLE_GRID = ['modernluxe', 'japandi', 'mediterranean', 'artdeco', 'indian', 'wabisabi', 'scandi', 'moody', 'parisian'];
const NEW_PALS = ['cloud', 'espresso', 'moss', 'plum', 'hague', 'japandi', 'mediterranean', 'artdeco', 'heritage', 'wabisabi'];
const CAROUSEL = ['cloud', 'espresso', 'moss', 'plum', 'hague', 'heritage'];
const FLOOR_FLIP = ['herringbone', 'calacatta', 'emperador', 'onyx', 'checker', 'kota', 'jaisalmer', 'microcement', 'zellige', 'hexclay', 'encaustic', 'terrazzo'];
const SLICES = ['calacatta', 'herringbone', 'zellige', 'encaustic'];
const NIGHT_SCENES = ['evening', 'dinner', 'gallery', 'focus', 'bluehour', 'cinema', 'spa', 'diwali'];
const COVE_GRID = [['WARM WHITE', 0xffc98a], ['AMBER', 0xffa040], ['AUTO', null], ['ROSE', 0xff6f91], ['MARIGOLD', 0xff9a2a], ['VIOLET', 0x9a63ff], ['ROYAL BLUE', 0x4a6cff], ['TEAL', 0x2fd6c4], ['SAGE', 0x9fd49a]];
const MANDIR_DETAIL = [['chakra', 'SUDARSHANA CHAKRA', 'BACK RIGHT HAND', [12.88, 7.41, 1.59]], ['shankha', 'PANCHAJANYA SHANKHA', 'BACK LEFT HAND', [12.88, 7.04, 1.57]], ['crown', 'KIRITA MUKUTA', 'TALL GOLD CROWN', [12.88, 7.226, 1.7]], ['padma', 'PADMA', 'LOTUS · ABHAYA', [12.85, 7.35, 1.3]]];
const MANDIR_RITUAL = [['rangoli', 'RANGOLI', 'URLI · FLOATING DIYAS'], ['samai', 'SAMAI', 'FIVE-WICK BRASS LAMPS'], ['bells', 'GHANTI', 'TEMPLE BELLS']];
const MANDIR_LAYERS = ['BACKLIT HONEY ONYX', 'CUSPED MARBLE ARCH', 'BRASS INLAY', 'FIVE DIYAS', 'MARIGOLD TORAN'];
const MACRO = [['floorMacro', 'calacatta', 'CALACATTA GOLD', 'BOOK-MATCHED MARBLE'], ['floorMacro', 'herringbone', 'OAK HERRINGBONE', 'PARQUET · 90 MM'], ['onyx', null, 'GOLD OM', 'ON BACKLIT ONYX'], ['bells', null, 'BRASS', 'HAND-CAST BELLS'], ['samai', null, 'FLAME', 'GHEE DIYAS'], ['crown', null, 'GOLD LEAF', 'ON BLACK STONE']];
const FINALE = [['living', 'LIVING', 'modernluxe'], ['deoghar', 'MANDIR', 'indian'], ['dining', 'DINING', 'artdeco'], ['kitchen', 'KITCHEN', 'mediterranean'], ['office', 'OFFICE', 'japandi'], ['master', 'MASTER', 'moody'], ['kids', 'KIDS', 'scandi'], ['balcony', 'BALCONY', 'wabisabi'],
  ['livNight', 'LOUNGE', 'parisian'], ['deoghar', 'MANDIR', 'artdeco'], ['dining', 'DINING', 'japandi'], ['kitchen', 'KITCHEN', 'indian'], ['master', 'MASTER', 'modernluxe'], ['office', 'OFFICE', 'mediterranean'], ['kids', 'KIDS', 'moody'], ['living', 'LIVING', 'artdeco']];
const GRID9 = [['office', 'OFFICE', 'japandi'], ['balcony', 'BALCONY', 'mediterranean'], ['living', 'LIVING', 'modernluxe'], ['dining', 'DINING', 'artdeco'], ['deoghar', 'MANDIR', 'indian'], ['kitchen', 'KITCHEN', 'parisian'], ['kids', 'KIDS', 'scandi'], ['livNight', 'LOUNGE', 'moody'], ['master', 'MASTER', 'wabisabi']];
const TRIPTYCH = [
  { style: 'parisian', night: false, shots: [['office', 'OFFICE'], ['deoghar', 'MANDIR'], ['officeBal', 'OFFICE BALCONY']] },
  { style: 'mediterranean', night: false, shots: [['dining', 'DINING'], ['kitchen', 'KITCHEN'], ['master', 'MASTER SUITE']] },
  { style: 'moody', night: true, shots: [['living', 'LIVING'], ['kids', "KIDS' ROOM"], ['balcony', 'BALCONY']] },
];
const PLAN_TAGS = [['OFFICE', 12.1, 9.9], ['MANDIR', 12.3, 7.2], ['LIVING', 7.0, 5.8], ['BALCONY', 10.8, 5.2], ['DINING', 5.1, 2.8], ['KITCHEN', 8.2, 1.8], ['MASTER', 1.7, 3.2], ['KIDS', 2.2, 10.0], ['DRESSING', 5.4, 8.5]];
const STATS = [[16, 'PALETTES'], [19, 'FLOORS'], [10, 'STYLES'], [12, 'SCENES'], [360, 'HUE WHEEL'], [1, 'MANDIR']];
// FPV routes (plan x, y, height) + a tag per waypoint
const ROUTES = {
  A: { pts: [[9.75, 8.35, 1.7], [9.5, 7.35, 1.5], [9.75, 6.85, 1.6], [8.6, 6.4, 1.95], [7.4, 5.6, 1.7], [6.75, 4.2, 1.4], [6.6, 3.1, 1.2], [7.75, 2.45, 1.05]], tags: ['ARRIVAL', 'ENTRANCE', 'FOYER', 'LIVING', 'LOUNGE', 'DINING', 'DINING', 'KITCHEN'] },
  B: { pts: [[6.3, 6.9, 1.8], [4.6, 7.05, 1.65], [3.2, 7.2, 1.55], [2.88, 7.9, 1.5], [2.7, 8.9, 1.45], [1.9, 9.8, 1.35], [2.6, 10.9, 1.25]], tags: ['LIVING', 'PASSAGE', 'CORRIDOR', "KIDS' ROOM", "KIDS' ROOM", "KIDS' ROOM", 'WINDOW SEAT'] },
  C: { pts: [[7.75, 2.45, 1.4], [6.7, 3.3, 1.5], [6.8, 4.6, 1.7], [8.0, 5.9, 1.9], [9.2, 5.9, 1.6], [10.4, 5.95, 1.5]], tags: ['KITCHEN', 'DINING', 'DINING', 'LIVING', 'LIVING', 'BALCONY'] },
  D: { pts: [[6.6, 3.2, 1.45], [6.8, 4.6, 1.6], [7.6, 5.7, 1.8], [8.7, 6.45, 1.75], [9.75, 6.95, 1.6], [10.7, 7.226, 1.5], [11.45, 7.226, 1.42]], tags: ['DINING', 'DINING', 'LIVING', 'LIVING', 'FOYER', 'MANDIR', 'MANDIR'] },
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

export function createEdit120(ctx) {
  const { renderer, camera, ctl, doors, tour, lighting, design, arch, renderNow, setRecording, setSize, setCutaway, captureProbe, tick, fans } = ctx;
  const api = { progress: { frame: 0, total: 0, done: false, error: null } };
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; };
  const [comp, g] = mk(); const [prevC, pg] = mk(); const [acc, ag] = mk(); const [altC, xg] = mk();
  let fx = null; const flights = {}; const floorMat = {};

  // ---------------------------------------------------------------- state
  let stateKey = ''; let curPal = {}; let dirty = false; let probedKey = '';
  const lightKey = () => JSON.stringify(lighting.state);
  function setLight(patch) { const b = lightKey(); lighting.apply(patch); return lightKey() !== b; }
  // like setLight, but re-captures the reflection probe whenever the lit state differs from the last probed one
  function lightP(patch) { setLight(patch); const k = stateKey + '|' + lightKey(); if (k !== probedKey) { probedKey = k; captureProbe(k); } }
  function setFloor(id, rooms) { for (const fm of arch.floorMeshes) if (rooms.includes(fm.userData.room)) fm.material = floorMat[id]; }
  function floorX(id, rooms) { dirty = true; setFloor(id, rooms); }
  const STY = Object.fromEntries(HOUSE_STYLES.map((s) => [s.id, s]));
  function style(id) {
    const k = 'style:' + id; if (stateKey === k && !dirty) return false;
    stateKey = k; dirty = false; curPal = {};
    const s = STY[id];
    for (const [r, p] of Object.entries(s.pal)) design.applyPalette(p, [r], SURF);
    const by = {}; for (const [r, f] of Object.entries(s.floors)) (by[f] ||= []).push(r);
    for (const [f, rooms] of Object.entries(by)) setFloor(f, rooms);
    return true;
  }
  function pal(scope, id) { if (curPal[scope] === id) return false; curPal[scope] = id; dirty = true; design.applyPalette(id, [scope], SURF); return true; }
  const LAYERS = { profiles: true, spots: true, coves: true, downlights: true };
  const DAY = { mode: 'day', time: 15.5, dayLights: true, style: 'warm', brightness: 1, kelvin: 2900, coveColor: null, layers: LAYERS };
  const NIGHT = { mode: 'night', style: 'warm', kelvin: 2800, brightness: 1, dayLights: false, coveColor: null, layers: LAYERS };
  const styleLight = (id) => { const l = STY[id].light; return { ...(l.mode === 'day' ? DAY : NIGHT), ...l }; };
  const SCN = Object.fromEntries(LIGHT_SCENES.map((s) => [s.id, s]));
  const sceneLight = (id) => { const p = SCN[id].patch; return { ...(p.mode === 'day' ? DAY : NIGHT), ...p }; };
  const SHRINE = { ...NIGHT, style: 'amber', kelvin: 2500, brightness: 0.9 };
  const pad = (n) => String(n).padStart(2, '0');

  // ---------------------------------------------------------------- camera
  const IMPACTS = SECTIONS.map((s) => s[1]).filter((t) => t > 0).concat([44, 67]);
  function shakeAt(t) {
    let a = 0;
    for (const it of IMPACTS) { const k = t - it; if (k >= 0 && k < 0.6) a += Math.exp(-k / 0.12) * 0.06; }
    if (t >= 56 && t < 70) a *= 0.35; // the shrine stays calm
    if (t < 4) a += 0.006;
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

  // ---------------------------------------------------------------- extra graphics
  // projected 3D callout: ring on the point, leader line, title + sub on a rule
  function tag3(name, sub, P, k, ox = -240, oy = -140) {
    const v = new THREE.Vector3(P[0], P[2], -P[1]).project(camera); if (v.z > 1) return;
    const sx = (v.x * 0.5 + 0.5) * W, sy = (-v.y * 0.5 + 0.5) * H; const e = expoOut(k / 0.4), e2 = expoOut((k - 0.15) / 0.4);
    g.save(); g.font = `900 34px ${HEAVY}`; g.letterSpacing = '3px'; const tw = g.measureText(name).width + 24; g.restore();
    const ex = sx + ox * e, ey = sy + oy * e, len = Math.max(300, tw) * e2, x0 = ox < 0 ? ex - len : ex;
    g.save(); g.globalAlpha = clamp01(k * 6); g.strokeStyle = GOLD; g.lineWidth = 2; g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 10;
    g.beginPath(); g.arc(sx, sy, 7, 0, TAU); g.stroke();
    g.save(); g.globalAlpha *= 0.5 * (1 - clamp01(k / 0.6)); g.beginPath(); g.arc(sx, sy, 10 + 60 * expoOut(k / 0.6), 0, TAU); g.stroke(); g.restore();
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.lineTo(ox < 0 ? ex - len : ex + len, ey); g.stroke();
    g.beginPath(); g.rect(x0, ey - 60, len, 100); g.clip();
    g.fillStyle = '#fff'; g.font = `900 34px ${HEAVY}`; g.letterSpacing = '3px'; g.textAlign = 'left'; g.fillText(name, x0 + 4, ey - 14);
    g.fillStyle = GOLD; g.font = `700 14px ${FONT}`; g.letterSpacing = '5px'; g.fillText(sub, x0 + 4, ey + 26); g.restore();
  }
  function chipRow(names, active, y, a = 1) {
    const n = names.length, gap = 12, w = Math.min(210, (W - 140 - gap * (n - 1)) / n);
    names.forEach((nm, j) => {
      const on = j === active; const x = 70 + j * (w + gap);
      g.save(); g.globalAlpha = a; g.fillStyle = on ? GOLD : 'rgba(255,255,255,0.14)'; g.shadowColor = GOLD; g.shadowBlur = on ? 26 : 0;
      g.beginPath(); g.roundRect(x, y, w, 50, 25); g.fill(); g.shadowBlur = 0; g.fillStyle = on ? '#1a1410' : 'rgba(255,255,255,0.78)';
      g.font = `900 15px ${HEAVY}`; g.letterSpacing = '3px'; g.textAlign = 'center'; g.fillText(nm, x + w / 2, y + 31); g.restore();
    });
  }
  function wheelG(cx, cy, r, hue, a) {
    if (a <= 0) return; const e = back(a);
    g.save(); g.globalAlpha = clamp01(a * 2); g.translate(cx, cy); g.scale(e, e); g.rotate((1 - e) * -1.2);
    const cg = g.createConicGradient(0, 0, 0); for (let i = 0; i <= 12; i++) cg.addColorStop(i / 12, `hsl(${i * 30},100%,58%)`);
    g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 30; g.fillStyle = cg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.arc(0, 0, r * 0.64, 0, TAU, true); g.fill('evenodd');
    g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2;
    for (let i = 0; i < 24; i++) { const an = i / 24 * TAU; g.beginPath(); g.moveTo(Math.cos(an) * r * 1.06, Math.sin(an) * r * 1.06); g.lineTo(Math.cos(an) * r * (i % 2 ? 1.1 : 1.14), Math.sin(an) * r * (i % 2 ? 1.1 : 1.14)); g.stroke(); }
    const col = `hsl(${hue * 360},90%,62%)`; g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 50; g.beginPath(); g.arc(0, 0, r * 0.5, 0, TAU); g.fill();
    const an = hue * TAU; const mx = Math.cos(an) * r * 0.82, my = Math.sin(an) * r * 0.82;
    g.shadowBlur = 12; g.shadowColor = 'rgba(0,0,0,0.6)'; g.lineWidth = 5; g.strokeStyle = '#fff'; g.beginPath(); g.arc(mx, my, 17, 0, TAU); g.stroke();
    g.restore();
  }
  // 3x3 grid that pops in, then the centre cell zooms to full frame (centre drawn last)
  function grid9(k, n, drawCell, label, zoomAt, dot) {
    const gap = 8, cw = (W - gap * 4) / 3, ch = (H - gap * 4) / 3; const zk = ease((k - zoomAt) / 0.65);
    const ord = [4, 1, 5, 3, 0, 7, 2, 6, 8];
    for (const i of [0, 1, 2, 3, 5, 6, 7, 8, 4]) {
      const ci = i % 3, ri = Math.floor(i / 3); const st = clamp01((k - ord[i] * 0.055) / 0.35); if (st <= 0) continue;
      if (i !== 4 && zk >= 1) continue;
      drawCell(i);
      let x = gap + ci * (cw + gap), y = gap + ri * (ch + gap), w = cw, h = ch;
      if (i === 4) { x = lerp(x, 0, zk); y = lerp(y, 0, zk); w = lerp(w, W, zk); h = lerp(h, H, zk); }
      const s = back(st); const cx = x + w / 2, cy = y + h / 2; const fa = i === 4 ? 1 : 1 - zk;
      g.save(); g.translate(cx, cy); g.scale(s, s); g.rotate((1 - st) * (i % 2 ? 0.2 : -0.2)); g.translate(-cx, -cy); g.beginPath(); g.roundRect(x, y, w, h, Math.max(0, 10 * (1 - zk * (i === 4)))); g.clip();
      blit(x, y, w, h, fa);
      g.globalAlpha = st * fa * (i === 4 ? 1 - zk : 1); g.fillStyle = '#fff'; g.font = `900 20px ${HEAVY}`; g.letterSpacing = '4px'; g.textAlign = 'left'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 10;
      const tx = dot ? x + 48 : x + 18; g.fillText(label(i), tx, y + h - 20);
      if (dot) { const c = dot(i); g.beginPath(); g.arc(x + 28, y + h - 27, 10, 0, TAU); g.fillStyle = c; g.shadowColor = c; g.shadowBlur = 18; g.fill(); }
      g.restore();
    }
    return zk;
  }

  // ---------------------------------------------------------------- sections (lt = local time)
  const SEC = {
    intro(lt, t) {
      style('indian'); lightP(sceneLight('diwali'));
      render('intro', lt / 4, { lin: true, roll: -0.06 + 0.03 * lt }, t); blit(0, 0, W, H);
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, W, H);
      marquee('DESIGN STUDIO', t, H / 2 - 300, 120, 420, 0.12); marquee('VOLUME II', t, H / 2 + 300, 120, -420, 0.12);
      cascade('RESIDENCE', lt - 0.4, { size: 210, track: 26, stagger: 0.17, out: 1.8 });
      kicker('A DESIGN STUDIO FILM  ·  VOLUME II', W / 2, H / 2 + 150, clamp01((lt - 1.6) * 4) * (1 - clamp01((lt - 2.2) * 5)), 20, GOLD, 'center');
      if (lt > 2.55) {
        cascade('STYLE. LIGHT. SACRED.', lt - 2.55, { size: 104, track: 10, stagger: 0.025 });
        kicker('TEN HOUSE STYLES  ·  ONE HOME', W / 2, H / 2 + 120, clamp01((lt - 3.0) * 4), 20, GOLD, 'center');
      }
    },
    plan(lt, t) { // aerial orbit over the cut-away flat; one click restyles the whole home, then again on every beat
      setCutaway(true);
      const PL = ['original', 'modernluxe', 'japandi', 'mediterranean', 'indian'];
      const si = lt < 3.5 ? 0 : Math.min(4, 1 + Math.floor((lt - 3.5) / BEAT)); style(PL[si]); lightP(DAY);
      const a = lerp(-0.9, 0.55, ease(lt / 6)); const R = lerp(15, 11.5, ease(lt / 6)); const h = lerp(17, 11, ease(lt / 6));
      const c = [7.2, 5.9];
      const dive = expoIn((lt - 5.35) / 0.65);
      const p = [c[0] + Math.sin(a) * R, c[1] - Math.cos(a) * R, h]; const tgt = [c[0], c[1], 0];
      const pd = L3(p, [9.75, 8.6, 1.9], dive), ld = L3(tgt, [9.6, 7.0, 1.4], dive);
      applyCam(pd, ld, lerp(42, 82, dive), 0, t); renderNow(); blit(0, 0, W, H);
      for (let b = 0; b < 4; b++) { const k = lt - 3.5 - b * BEAT; if (k >= 0 && k < 0.45) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,236,200,${(b ? 0.22 : 0.5) * (1 - k / 0.45)})`; g.fillRect(0, 0, W, H); g.restore(); } }
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
      if (lt >= 3.5 && dive < 0.3) {
        kicker(`STYLE ${pad(si + 1)}  ·  ${STY[PL[si]].name.toUpperCase()}`, W / 2, H - 170, clamp01((lt - 3.55) * 6), 22, GOLD, 'center');
        bigLabel('WHOLE HOME RESTYLED', W / 2, H - 100, clamp01((lt - 3.65) * 5), 74, 'center');
      }
    },
    flightA(lt, t) { setCutaway(false); style('indian'); lightP(DAY); this._flight(flights.A, lt, 4, t); },
    flightB(lt, t) { setCutaway(false); style('japandi'); lightP(DAY); this._flight(flights.B, lt, 4, t); },
    flightC(lt, t) { // night flight, a new lighting scene on every beat
      setCutaway(false); style('modernluxe');
      const id = ['evening', 'bluehour', 'dinner', 'spa', 'gallery', 'diwali', 'focus', 'evening'][Math.min(7, Math.floor(lt / BEAT))];
      lightP(sceneLight(id)); this._flight(flights.C, lt, 4, t);
      kicker(SCN[id].name.toUpperCase(), W - 70, H - 230, 1, 20, GOLD, 'right');
    },
    flightD(lt, t) { setCutaway(false); style('indian'); lightP(sceneLight('diwali')); this._flight(flights.D, lt, 4, t); kicker('DIWALI', W - 70, H - 230, 1, 20, GOLD, 'right'); },
    _flight(F, lt, dur, t) {
      renderFlight(F, lt, dur, t); blit(0, 0, W, H);
      const tg = flightTag(F, lt, dur);
      kicker(pad(tg.idx) + ' / ' + pad(tg.n), 70, H - 255, clamp01(tg.k * 8), 20);
      maskLabel(tg.name, 70, H - 175, tg.k, 92);
      const sp = (flightS(F, lt + 0.01, dur) - flightS(F, lt, dur)) / 0.01; kicker(`${(sp * 3.6).toFixed(1)} KM/H`, W - 70, H - 175, 0.9, 18, '#fff', 'right');
    },
    styles(lt, t) {
      setCutaway(false);
      if (lt < 0.5) { style('original'); lightP(styleLight('original')); render('livHold', 0, {}, t); blit(0, 0, W, H); marquee('STYLES', t, H / 2, 420, 900, 0.18); cascade('STYLES', lt, { size: 330, stagger: 0.03 }); return; }
      if (lt < 5.5) {
        const r = flipShot(lt - 0.5, { t, shot: 'livHold', u: (x) => x / 5, roll: (x) => { const i = Math.floor(x / BEAT); const u = (x - i * BEAT) / BEAT; return (i % 2 ? 1 : -1) * 0.06 * (1 - expoOut(u * 2)); }, base: () => {},
          flips: STYLE_ORDER.map((id, j) => ({ at: j * BEAT, set: () => { style(id); lightP(styleLight(id)); } })), wipe: 'diag', wipeDur: 0.4 });
        const s = STY[STYLE_ORDER[r.i]]; const p = PALETTES.find((q) => q.id === s.pal.hall); const f = FLOOR_OPTIONS.find((q) => q.id === s.floors.hall);
        kicker(`HOUSE STYLE ${pad(r.i + 1)} / 10`, 70, H - 250, clamp01(r.u * 10), 20); maskLabel(s.name.toUpperCase(), 70, H - 150, r.u * BEAT, 92);
        kicker(`${f.name.toUpperCase()}  ·  ${s.light.mode === 'day' ? 'DAYLIGHT' : 'NIGHT SCENE'}`, 72, H - 100, clamp01((r.u - 0.15) * 8), 15, '#fff');
        swatches(p, 86, H - 55, clamp01(r.u * 6));
        for (let j = 0; j < 10; j++) { g.save(); g.fillStyle = j <= r.i ? GOLD : 'rgba(255,255,255,0.25)'; g.fillRect(W - 70 - (10 - j) * 34, 96, 26, j === r.i ? 6 : 3); g.restore(); }
        return;
      }
      if (lt < 8.5) {
        const k = lt - 5.5; lightP(DAY);
        grid9(k, 9, (i) => { style(STYLE_GRID[i]); render('living', 0.2 + k / 4.5, { lin: true, roll: (i % 2 ? 1 : -1) * 0.03 }, t); }, (i) => STY[STYLE_GRID[i]].name.toUpperCase(), 2.3);
        kicker('SAME ROOM  ·  NINE STYLES', W / 2, 70, clamp01((k - 0.5) * 4) * (1 - clamp01((k - 2.2) * 5)), 20, '#fff', 'center');
        return;
      }
      const id = STYLE_GRID[4]; style(id); lightP(styleLight(id));
      render('living', Math.min(1, 0.87 + (lt - 8.5) / 12), { lin: true }, t); blit(0, 0, W, H);
      kicker(STY[id].name.toUpperCase(), 70, H - 210, clamp01((lt - 8.5) * 5), 20); maskLabel('TEN STYLES', 70, H - 105, lt - 8.5, 120);
      kicker('ONE CLICK  ·  EVERY ROOM  ·  EVERY FLOOR  ·  EVERY LIGHT', W - 70, H - 105, clamp01((lt - 8.8) * 4), 16, '#fff', 'right');
    },
    colour(lt, t) {
      setCutaway(false); lightP(DAY); const base = () => style('original');
      if (lt < 0.5) { base(); pal('hall', 'cloud'); render('livHold', 0, {}, t); blit(0, 0, W, H); marquee('COLOUR', t, H / 2, 420, 900, 0.18); cascade('COLOUR', lt, { size: 300, stagger: 0.03 }); return; }
      if (lt < 5.5) {
        const r = flipShot(lt - 0.5, { t, shot: 'livHold', u: (x) => x / 5, roll: (x) => { const i = Math.floor(x / BEAT); const u = (x - i * BEAT) / BEAT; return (i % 2 ? 1 : -1) * 0.07 * (1 - expoOut(u * 2)); }, base, flips: NEW_PALS.map((id, j) => ({ at: j * BEAT, set: () => pal('hall', id) })), wipe: 'circle', cx: W * 0.68, cy: H * 0.42, wipeDur: 0.42 });
        const p = PALETTES.find((q) => q.id === NEW_PALS[r.i]);
        kicker(`2026 PALETTE ${pad(r.i + 1)} / 10`, 70, H - 250, clamp01(r.u * 10), 20); maskLabel(p.name.toUpperCase(), 70, H - 150, r.u * BEAT, 92);
        kicker(p.note.toUpperCase(), 72, H - 100, clamp01((r.u - 0.15) * 8), 14, '#fff'); swatches(p, 86, H - 55, clamp01(r.u * 6));
        bursts(lt - 0.5, [r.i * BEAT], W * 0.68, H * 0.42, hex(p.accent));
        return;
      }
      if (lt < 7.8) { // sliding carousel, the last strip expands
        const k = lt - 5.5; const sw = W / 3.4; const expand = ease((k - 1.8) / 0.5);
        for (let i = 0; i < 6; i++) {
          let x = i * (sw + 12) - k * 240 + 90; let w = sw; const st = expoOut((k - i * 0.06) / 0.4); if (st <= 0) continue;
          if (i === 5 && expand > 0) { x = lerp(x, 0, expand); w = lerp(w, W, expand); }
          if (x > W || x + w < 0) continue;
          base(); pal('hall', CAROUSEL[i]); render('livHold', 0.5 + k / 5 + i * 0.02, { lin: true, fov: 64 }, t);
          const yOff = (1 - st) * (i % 2 ? -H : H);
          g.save(); g.beginPath(); g.rect(x, yOff, w, H); g.clip(); blit(x, yOff, w, H, i === 5 ? 1 : 1 - expand, g, (i - 2.5) * 40); g.restore();
          const p = PALETTES.find((q) => q.id === CAROUSEL[i]);
          g.save(); g.globalAlpha = st * (i === 5 ? 1 : 1 - expand); g.fillStyle = hex(p.accent); g.fillRect(x, H - 10 + yOff, w, 10);
          g.translate(x + 50, H - 60 + yOff); g.rotate(-Math.PI / 2); g.fillStyle = '#fff'; g.font = `900 34px ${HEAVY}`; g.letterSpacing = '4px'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 14; g.fillText(p.name.toUpperCase(), 0, 0); g.restore();
        }
        kicker('SIXTEEN PALETTES  ·  ONE CLICK', W / 2, 120, clamp01((k - 0.4) * 4) * (1 - expand), 24, '#fff', 'center');
        return;
      }
      base(); pal('hall', 'heritage'); render('livHold', Math.min(1, 0.96 + (lt - 7.8) / 8), { lin: true, fov: 64 }, t); blit(0, 0, W, H);
      kicker('SELECTED', 70, H - 200, 1, 20); maskLabel('INDIAN HERITAGE', 70, H - 115, lt - 7.8, 92);
    },
    floor(lt, t) {
      setCutaway(false); lightP(DAY); const base = () => style('scandi');
      if (lt < 0.5) { base(); render('floorSkim', 0, {}, t); blit(0, 0, W, H); marquee('FLOOR', t, H / 2, 420, -900, 0.18); cascade('FLOOR', lt, { size: 330, stagger: 0.03 }); return; }
      if (lt < 3.5) {
        const r = flipShot(lt - 0.5, { t, shot: 'floorSkim', u: (x) => x / 3, roll: (x) => Math.sin(x * 3) * 0.06, base, flips: FLOOR_FLIP.map((id, j) => ({ at: j * 0.25, set: () => floorX(id, LIVING) })), wipe: 'diag', wipeDur: 0.2 });
        const f = FLOOR_OPTIONS.find((q) => q.id === FLOOR_FLIP[r.i]);
        kicker(f.kind.toUpperCase(), 70, H - 190, clamp01(r.u * 12), 20); maskLabel(f.name.toUpperCase(), 70, H - 105, r.u * 0.25, 96);
        g.save(); g.fillStyle = '#fff'; g.font = `200 120px ${HEAVY}`; g.textAlign = 'right'; g.globalAlpha = 0.85; g.fillText(pad(r.i + 1), W - 70, H - 90); g.restore();
        kicker('NEW TILE LIBRARY', W - 72, H - 230, 0.9, 16, GOLD, 'right');
        return;
      }
      const k = lt - 3.5; const sw = W / 4;
      for (let i = 0; i < 4; i++) {
        base(); floorX(SLICES[i], LIVING); render('floorSkim', 0.25 + k / 3.5, { lin: true }, t);
        const st = expoOut((k - i * 0.08) / 0.45); const drift = (i % 2 ? -1 : 1) * (k * 26); const dy = (1 - st) * H * (i % 2 ? -1 : 1) + drift;
        g.save(); g.beginPath(); g.rect(i * sw, 0, sw, H); g.clip(); g.translate(0, dy); g.drawImage(renderer.domElement, 0, -drift * 0.5); g.restore();
        if (i) { g.fillStyle = '#000'; g.fillRect(i * sw - 4, 0, 8, H); }
        const f = FLOOR_OPTIONS.find((q) => q.id === SLICES[i]); const a = clamp01((k - 0.3 - i * 0.08) * 4);
        g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `900 30px ${HEAVY}`; g.letterSpacing = '3px'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 16;
        g.fillText(f.name.toUpperCase(), i * sw + sw / 2, H - 80); g.fillStyle = GOLD; g.font = `700 14px ${FONT}`; g.letterSpacing = '5px'; g.fillText(f.kind.toUpperCase(), i * sw + sw / 2, H - 50); g.restore();
      }
      kicker('19 FINISHES  ·  MARBLE  ·  PARQUET  ·  ZELLIGE  ·  CEMENT', W / 2, 110, clamp01((k - 0.5) * 4), 20, '#fff', 'center');
    },
    light(lt, t) {
      setCutaway(false); style('modernluxe');
      if (lt < 0.5) { lightP({ ...DAY, time: 7.0, dayLights: false }); render('lapse', 0, {}, t); blit(0, 0, W, H); marquee('LIGHT', t, H / 2, 420, 900, 0.18); cascade('LIGHT', lt, { size: 330, stagger: 0.03 }); return; }
      if (lt < 2.0) {
        const k = (lt - 0.5) / 1.5; const hr = lerp(7.0, 18.35, ease(k));
        lighting.apply({ ...DAY, time: hr, dayLights: false }); if (Math.round(t * 120) % 6 === 0) { captureProbe(); probedKey = lightKey(); }
        render('lapse', ease(k), { lin: true, roll: -0.05 + 0.1 * k }, t); blit(0, 0, W, H);
        const hh = Math.floor(hr), mm = Math.floor((hr - hh) * 60);
        bigLabel(`${pad(hh)}:${pad(mm)}`, W - 90, H - 200, 1, 150, 'right', 200);
        kicker('SUNRISE  ·  MORNING  ·  NOON  ·  GOLDEN HOUR', W - 92, H - 345, 1, 18, GOLD, 'right');
        g.save(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(W - 600, H - 172, 510, 3); g.fillStyle = GOLD; g.fillRect(W - 600, H - 172, 510 * k, 3); g.restore();
        return;
      }
      if (lt < 6.0) {
        const i = Math.min(7, Math.floor((lt - 2.0) / BEAT)); const sc = SCN[NIGHT_SCENES[i]];
        lightP(sceneLight(sc.id)); const u = (lt - 2.0 - i * BEAT) / BEAT;
        const roll = (i % 2 ? 1 : -1) * 0.12 * (1 - expoOut(u * 1.5)) + (i % 2 ? 1 : -1) * 0.03;
        render('livNight', (lt - 2.0) / 5, { lin: true, roll }, t); blit(0, 0, W, H);
        const col = sc.patch.coveColor != null ? hex(sc.patch.coveColor) : '#ffd9a8';
        bursts(lt, [2.0 + i * BEAT], W / 2, H * 0.3, col);
        kicker(`SCENE ${pad(i + 5)} / 12  ·  ${sc.patch.kelvin} K`, 70, H - 270, clamp01(u * 10), 20); maskLabel(sc.name.toUpperCase(), 70, H - 165, u * BEAT, 96);
        chipRow(NIGHT_SCENES.map((id) => SCN[id].name.toUpperCase()), i, H - 112, 1);
        return;
      }
      if (lt < 8.5) {
        const k = (lt - 6.0) / 2.5; const hu = (0.06 + ease(k)) % 1; const c = hsv(hu, 0.85, 1);
        setLight({ ...NIGHT, kelvin: 2700, brightness: 0.6, coveColor: c, layers: { profiles: false, spots: true, coves: true, downlights: false } });
        render('livNight', 0.35 + k * 0.4, { lin: true, roll: Math.sin(k * TAU) * 0.04 }, t); blit(0, 0, W, H);
        wheelG(W - 280, H / 2 - 20, 180, hu, clamp01((lt - 6.0) * 3));
        kicker('COVE & ACCENT LIGHT', 70, H - 230, 1, 20); maskLabel('COLOUR WHEEL', 70, H - 135, lt - 6.0, 96);
        bigLabel(hex(c).toUpperCase(), 72, H - 70, 1, 36, 'left', 700);
        return;
      }
      const k = lt - 8.5; const kel = k < 0.75 ? lerp(2200, 4000, ease(k / 0.75)) : lerp(4000, 2700, ease((k - 0.75) / 0.75));
      setLight({ ...NIGHT, kelvin: kel });
      render('livNight', 0.75 + k / 6, { lin: true, roll: Math.sin(k * TAU / 1.5) * 0.05 }, t); blit(0, 0, W, H);
      bigLabel(`${Math.round(kel / 10) * 10} K`, 70, H - 110, 1, 150, 'left', 200); kicker('2200 K INTIMATE  ·  3000 K LIVING  ·  4000 K TASK', 72, H - 265, 1, 18);
      const gr = g.createLinearGradient(72, 0, 572, 0); gr.addColorStop(0, '#ff9d4d'); gr.addColorStop(0.5, '#ffe7c4'); gr.addColorStop(1, '#e6eeff');
      g.fillStyle = gr; g.fillRect(72, H - 80, 500, 6); g.fillStyle = '#fff'; g.beginPath(); g.arc(72 + 500 * (kel - 2200) / 1800, H - 77, 12, 0, TAU); g.fill();
    },
    mandir(lt, t) {
      setCutaway(false); style('indian');
      if (lt < 5) {
        lightP(SHRINE);
        if (lt < 3) {
          render('mandirIn', lt / 3, { lin: true, roll: 0.04 - lt * 0.013 }, t); blit(0, 0, W, H);
          g.fillStyle = `rgba(0,0,0,${0.55 * (1 - clamp01((lt - 0.9) / 0.6))})`; g.fillRect(0, 0, W, H);
          cascade('MANDIR', lt, { size: 300, stagger: 0.05, out: 1.0 });
          if (lt > 1.4) { kicker('NORTH-EAST  ·  VASTU', 70, H - 200, clamp01((lt - 1.4) * 4), 20); maskLabel('THE DEOGHAR', 70, H - 115, lt - 1.5, 92); }
          return;
        }
        render('murtiCrane', (lt - 3) / 2, { lin: true }, t); blit(0, 0, W, H);
        kicker('CHATURBHUJA  ·  FOUR ARMS  ·  BLACK STONE', 70, H - 200, clamp01((lt - 3) * 5), 20); maskLabel('SHRI VISHNU', 70, H - 115, lt - 3, 104);
        return;
      }
      if (lt < 8) { // iconography close-ups
        lightP(SHRINE);
        const i = Math.min(3, Math.floor((lt - 5) / 0.75)); const u = (lt - 5 - i * 0.75) / 0.75; const [shot, name, sub, P] = MANDIR_DETAIL[i];
        render(shot, u, { lin: true, roll: (i % 2 ? 1 : -1) * 0.05 * (1 - expoOut(u * 2)) }, t); blit(0, 0, W, H);
        tag3(name, sub, P, u * 0.75, i % 2 ? 230 : -230, i === 3 ? 150 : -150);
        kicker(`ICONOGRAPHY  ${pad(i + 1)} / 04`, W - 70, 110, 1, 16, '#fff', 'right');
        return;
      }
      if (lt < 10) { // ritual layer
        lightP(SHRINE);
        const i = Math.min(2, Math.floor((lt - 8) / (2 / 3))); const u = (lt - 8 - i * 2 / 3) / (2 / 3); const [shot, name, sub] = MANDIR_RITUAL[i];
        render(shot, u, { lin: true, roll: (i % 2 ? -1 : 1) * 0.05 * (1 - expoOut(u * 2)) }, t); blit(0, 0, W, H);
        kicker(sub, 70, H - 200, clamp01(u * 8), 20); maskLabel(name, 70, H - 115, u * 2 / 3, 104);
        return;
      }
      const k = lt - 10; const sc = k < 1 ? 'evening' : 'diwali'; lightP(sceneLight(sc));
      render('mandirWide', k / 4, { lin: true, roll: 0.02 * Math.sin(k * 1.4) }, t); blit(0, 0, W, H);
      if (k < 1) { kicker('SCENE  ·  EVENING', 70, H - 200, clamp01(k * 6), 20); maskLabel('SANDHYA AARTI', 70, H - 115, k, 96); }
      else { bursts(k, [1, 1.5], W / 2, H * 0.42, '#ff9a2a'); kicker('SCENE  ·  MARIGOLD COVES  ·  2200 K', 70, H - 200, clamp01((k - 1) * 6), 20); maskLabel('DIWALI', 70, H - 105, k - 1, 130); }
      MANDIR_LAYERS.forEach((s, j) => { const a = clamp01((k - 1.4 - j * 0.25) * 6); if (a <= 0) return; g.save(); g.fillStyle = GOLD; g.globalAlpha = a; g.fillRect(W - 70 - 40 * expoOut(a), 186 + j * 46, 40 * expoOut(a), 2); g.restore(); kicker(s, W - 124, 194 + j * 46, a, 18, '#fff', 'right'); });
    },
    beforeafter(lt, t) { // sweeping divider between two whole-home styles
      setCutaway(false);
      const phase2 = lt >= 3; const u = (lt % 3) / 3; const camU = lt / 6;
      const [A, B] = phase2 ? ['japandi', 'indian'] : ['original', 'artdeco'];
      style(A); lightP(styleLight(A)); render('baHold', camU, { lin: true }, t); xg.drawImage(renderer.domElement, 0, 0);
      style(B); lightP(styleLight(B)); render('baHold', camU, { lin: true }, t); blit(0, 0, W, H);
      const sx = W * (0.5 + 0.36 * Math.sin(u * TAU - 0.6)); const intro = expoOut(u / 0.2); const x = lerp(W, sx, intro);
      g.save(); g.beginPath(); g.rect(0, 0, x, H); g.clip(); g.drawImage(altC, 0, 0); g.restore();
      g.save(); g.fillStyle = '#fff'; g.shadowColor = GOLD; g.shadowBlur = 24; g.fillRect(x - 2, 0, 4, H); g.beginPath(); g.arc(x, H / 2, 26, 0, TAU); g.fill();
      g.fillStyle = '#1a1410'; g.beginPath(); g.moveTo(x - 14, H / 2); g.lineTo(x - 5, H / 2 - 8); g.lineTo(x - 5, H / 2 + 8); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x + 14, H / 2); g.lineTo(x + 5, H / 2 - 8); g.lineTo(x + 5, H / 2 + 8); g.closePath(); g.fill(); g.restore();
      bigLabel(STY[A].name.toUpperCase(), 70, 150, clamp01(u * 8), 60); bigLabel(STY[B].name.toUpperCase(), W - 70, 150, clamp01(u * 8), 60, 'right');
      kicker(phase2 ? 'QUIET DAYLIGHT  ·  FESTIVE NIGHT' : 'AS DESIGNED  ·  RESTYLED IN ONE CLICK', W / 2, H - 80, clamp01(u * 6), 20, GOLD, 'center');
    },
    aerial(lt, t) {
      setCutaway(true); lightP(DAY);
      const ids = ['original', 'modernluxe', 'japandi', 'mediterranean', 'indian', 'artdeco', 'moody', 'parisian'];
      const r = flipShot(lt, { t, shot: 'aerial', u: (x) => x / 4, base: () => {}, flips: ids.map((id, j) => ({ at: j * BEAT, set: () => style(id) })), wipe: 'circle', cx: W / 2, cy: H / 2, wipeDur: 0.38 });
      kicker('CUT-AWAY  ·  WHOLE HOME', 70, H - 200, 1, 20); maskLabel(STY[ids[r.i]].name.toUpperCase(), 70, H - 115, r.u * BEAT, 92);
    },
    bedrooms(lt, t) {
      setCutaway(false);
      if (lt < 2) {
        lightP(DAY); const ids = ['scandi', 'indian', 'artdeco', 'mediterranean'];
        const r = flipShot(lt, { t, shot: 'kidsHold', u: (x) => x / 2, base: () => {}, flips: ids.map((id, j) => ({ at: j * BEAT, set: () => style(id) })), wipe: 'circle', cx: W * 0.3, cy: H * 0.4, wipeDur: 0.4 });
        const p = PALETTES.find((q) => q.id === STY[ids[r.i]].pal.chbed);
        kicker("CHILDREN'S ROOM", 70, H - 200, 1, 20); maskLabel(p.name.toUpperCase(), 70, H - 115, r.u * BEAT, 88); swatches(p, 82, H - 62, 1);
        return;
      }
      const ids = ['modernluxe', 'moody', 'parisian', 'indian'];
      const r = flipShot(lt - 2, { t, shot: 'masterHold', u: (x) => x / 2, base: () => {}, flips: ids.map((id, j) => ({ at: j * BEAT, set: () => { style(id); lightP(styleLight(id)); } })), wipe: 'diag', wipeDur: 0.4 });
      const s = STY[ids[r.i]]; const f = FLOOR_OPTIONS.find((q) => q.id === s.floors.mbed);
      kicker(`MASTER SUITE  ·  ${f.name.toUpperCase()}`, 70, H - 200, 1, 20); maskLabel(s.name.toUpperCase(), 70, H - 115, r.u * BEAT, 88);
    },
    nightgrid(lt, t) {
      setCutaway(false); style('modernluxe'); const base = { ...NIGHT, kelvin: 2700, brightness: 0.85 };
      if (lt < 4.6) {
        lightP(base);
        grid9(lt, 9, (i) => { setLight({ ...base, coveColor: COVE_GRID[i][1] }); render('livNight', 0.2 + lt / 7, { lin: true, roll: (i % 2 ? 1 : -1) * 0.03 }, t); }, (i) => COVE_GRID[i][0], 3.7, (i) => (COVE_GRID[i][1] == null ? '#ffd9a8' : hex(COVE_GRID[i][1])));
        kicker('ONE ROOM  ·  NINE COVE COLOURS', W / 2, 70, clamp01((lt - 0.5) * 4) * (1 - clamp01((lt - 3.6) * 5)), 20, '#fff', 'center');
        return;
      }
      const k = lt - 4.6; const c = COVE_GRID[4][1]; lightP({ ...base, coveColor: c });
      render('livNight', Math.min(1, 0.86 + k / 10), { lin: true }, t); blit(0, 0, W, H);
      const [hh] = (() => { const col = new THREE.Color(c); const o = {}; col.getHSL(o); return [o.h]; })();
      wheelG(W - 260, H / 2 - 40, 150, hh, clamp01(k * 3));
      kicker('ANY HUE  ·  ANY ROOM', 70, H - 200, clamp01(k * 5), 20); maskLabel(COVE_GRID[4][0], 70, H - 115, k, 96);
    },
    rooms(lt, t) { // moving triptychs, one house style per set
      setCutaway(false);
      const set = TRIPTYCH[Math.min(2, Math.floor(lt / 2))]; const k = lt % 2; const pw = W / 3;
      style(set.style); lightP(set.night ? styleLight(set.style) : DAY);
      set.shots.forEach(([shot, name], i) => {
        render(shot, 0.15 + k / 2.4, { lin: true, roll: (i - 1) * 0.04 }, t);
        const st = expoOut((k - i * 0.1) / 0.45); const out = expoIn((k - 1.75 - i * 0.04) / 0.25); const dy = (1 - st) * H * (i % 2 ? 1 : -1) + out * H * (i % 2 ? -1 : 1);
        g.save(); g.beginPath(); g.rect(i * pw, dy, pw, H); g.clip(); blit(i * pw, dy, pw, H, 1, g, (i - 1) * 120); g.restore();
        if (i) { g.fillStyle = '#000'; g.fillRect(i * pw - 4, 0, 8, H); }
        g.save(); g.globalAlpha = clamp01((k - 0.25 - i * 0.1) * 5) * (1 - out); g.translate(i * pw + 56, H - 70 + dy); g.rotate(-Math.PI / 2); g.fillStyle = '#fff'; g.font = `900 42px ${HEAVY}`; g.letterSpacing = '6px'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 16; g.fillText(name, 0, 0); g.restore();
      });
      kicker(`EVERY ROOM  ·  ${STY[set.style].name.toUpperCase()}`, W / 2, 120, clamp01(k * 4) * (1 - expoIn((k - 1.8) / 0.2)), 22, '#fff', 'center');
    },
    macro(lt, t) { // material close-ups, one per beat pair
      setCutaway(false);
      const i = Math.min(5, Math.floor(lt)); const u = lt - i; const [shot, fl, name, sub] = MACRO[i];
      style('indian'); if (fl) floorX(fl, LIVING); lightP(fl ? DAY : SHRINE);
      render(shot, u, { lin: true, roll: (i % 2 ? 1 : -1) * (0.06 - 0.05 * u) }, t); blit(0, 0, W, H);
      g.save(); g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `200 130px ${HEAVY}`; g.textAlign = 'right'; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 16; g.fillText(pad(i + 1), W - 70, 190); g.restore();
      kicker('MATERIAL STUDY', W - 72, 220, 0.9, 14, GOLD, 'right');
      kicker(sub, 70, H - 200, clamp01(u * 8), 20); maskLabel(name, 70, H - 115, u, 104);
    },
    finale(lt, t) {
      setCutaway(false);
      if (lt < 4) {
        const i = Math.min(15, Math.floor(lt / 0.25)); const u = (lt - i * 0.25) / 0.25; const [shot, name, sid] = FINALE[i];
        style(sid); lightP(styleLight(sid));
        render(shot, 0.1 + u * 0.9, { lin: true, roll: (i % 2 ? 1 : -1) * 0.12 * (1 - u) }, t); blit(0, 0, W, H);
        if (lt < 2) cascade('ONE HOME', lt - 0.05, { size: 150, track: 14, stagger: 0.03, out: 1.55 });
        else cascade('TEN STYLES', lt - 2.05, { size: 150, track: 14, stagger: 0.03, out: 1.55 });
        kicker(`${name}  ·  ${STY[sid].name.toUpperCase()}`, W / 2, H - 120, 0.95, 24, GOLD, 'center');
        return;
      }
      const k = lt - 4; lightP(NIGHT);
      const zk = grid9(k, 9, (i) => { style(GRID9[i][2]); render(GRID9[i][0], Math.min(1, 0.3 + k / 4), { lin: true, roll: (i % 2 ? 1 : -1) * 0.03 }, t); }, (i) => GRID9[i][1], 2.5);
      if (zk > 0.6) { kicker('INDIAN CONTEMPORARY  ·  DIWALI NIGHT', 70, H - 200, clamp01((zk - 0.6) * 3), 20); maskLabel('THE MANDIR', 70, H - 115, k - 2.9, 100); }
    },
    end(lt, t) {
      setCutaway(false); g.fillStyle = '#050506'; g.fillRect(0, 0, W, H);
      const M = 'STYLES · PALETTES · FLOORS · LIGHT · MANDIR';
      marquee(M, t, 110, 64, 300, 0.08); marquee(M, t, H - 110, 64, -300, 0.08);
      const yc = H / 2 - 90; const lines = expoOut(lt / 0.5);
      g.save(); g.strokeStyle = GOLD; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - 440 * lines, yc - 125); g.lineTo(W / 2 + 440 * lines, yc - 125); g.moveTo(W / 2 - 440 * lines, yc + 110); g.lineTo(W / 2 + 440 * lines, yc + 110); g.stroke(); g.restore();
      cascade('RESIDENCE', lt, { size: 170, track: 30, stagger: 0.03, dy: -100 });
      const sk = clamp01((lt - 0.7) / 0.6);
      if (sk > 0 && sk < 1) { g.save(); g.globalCompositeOperation = 'source-atop'; const x = -300 + (W + 600) * sk; const gr = g.createLinearGradient(x - 120, 0, x + 120, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,240,210,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, yc - 110, W, 200); g.restore(); }
      kicker('DESIGN STUDIO  ·  VOLUME II', W / 2, yc + 72, clamp01((lt - 0.35) * 3), 20, GOLD, 'center');
      STATS.forEach(([n, label], j) => {
        const k = clamp01((lt - 1.1 - j * 0.12) / 1.0); if (k <= 0) return; const cx = W / 2 + (j - 2.5) * 270; const e = expoOut(k); const val = Math.round(n * e);
        g.save(); g.globalAlpha = clamp01(k * 5); g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `200 88px ${HEAVY}`; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 12;
        g.fillText(n === 360 ? `${val}°` : String(val), cx, yc + 270 - (1 - e) * 40);
        g.fillStyle = GOLD; g.font = `700 15px ${FONT}`; g.letterSpacing = '5px'; g.shadowBlur = 0; g.fillText(label, cx + 2.5, yc + 310);
        if (j) { g.fillStyle = 'rgba(227,199,154,0.35)'; g.fillRect(cx - 135, yc + 200, 1, 120 * e); }
        g.restore();
      });
    },
  };
  const BRACKETS = new Set(['flightA', 'flightB', 'flightC', 'flightD', 'light', 'bedrooms', 'aerial']);
  async function drawFrame(t) {
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const sec = SECTIONS.find((s) => t >= s[1] && t < s[2]) || SECTIONS[SECTIONS.length - 1];
    SEC[sec[0]].call(SEC, t - sec[1], t);
    if (BRACKETS.has(sec[0])) brackets(t);
    for (const s of SECTIONS) if (s[1] > 0) lineSweep(t, s[1], 0.3);
  }

  // ---------------------------------------------------------------- FX envelopes
  const punches = []; const P = (t, o) => punches.push({ t, zoom: 0, chroma: 0, flash: 0, glitch: 0, blur: [0, 0], dur: 0.35, ...o });
  for (let i = 0; i < 9; i++) P(0.4 + i * 0.17, { zoom: 0.04, chroma: 12, glitch: 0.3, dur: 0.15 });
  for (let i = 0; i < 6; i++) P(2.55 + i * 0.25, { zoom: 0.03, chroma: 9, dur: 0.14 });
  for (const [name, t0] of SECTIONS) if (t0 > 0) P(t0, { flash: name === 'end' ? 1 : name === 'mandir' ? 0.5 : 0.8, zoom: name === 'mandir' ? 0.08 : 0.14, chroma: 22, glitch: name === 'end' ? 0.6 : name === 'mandir' ? 0.1 : 0.4, dur: 0.45 });
  P(7.5, { flash: 0.9, zoom: 0.1, chroma: 20, dur: 0.5 }); for (let i = 1; i < 4; i++) P(7.5 + i * BEAT, { zoom: 0.06, chroma: 12, dur: 0.25 });
  for (let i = 0; i < 8; i++) P(10 + i * BEAT, { zoom: 0.04, chroma: 8, dur: 0.2 });
  for (let i = 1; i < 10; i++) P(14.5 + i * BEAT, { zoom: 0.06, chroma: 11, flash: 0.08, dur: 0.26 });
  P(19.5, { zoom: 0.1, chroma: 16, dur: 0.4 }); P(22.5, { flash: 0.6, zoom: 0.1, chroma: 18, dur: 0.45 });
  for (let i = 0; i < 8; i++) P(24 + i * BEAT, { zoom: 0.04, chroma: 8, dur: 0.2 });
  for (let i = 1; i < 10; i++) P(28.5 + i * BEAT, { zoom: 0.06, chroma: 10, flash: 0.1, dur: 0.26 });
  P(33.5, { zoom: 0.08, chroma: 14, dur: 0.35 }); P(35.8, { zoom: 0.06, chroma: 12, dur: 0.35 });
  for (let i = 1; i < 12; i++) P(36.5 + i * 0.25, { zoom: 0.03, chroma: 9, dur: 0.12 });
  P(39.5, { flash: 0.4, zoom: 0.1, chroma: 18, dur: 0.4 }); P(40.2, { blur: [260, 0], dur: 0.3 }); P(41.0, { blur: [-260, 0], dur: 0.3 });
  P(44, { flash: 1, zoom: 0.2, chroma: 32, glitch: 0.45, dur: 0.65 });
  for (let i = 1; i < 8; i++) P(44 + i * BEAT, { zoom: 0.07, chroma: 15, glitch: 0.2, dur: 0.28 });
  P(48, { zoom: 0.1, chroma: 20, dur: 0.4 }); P(50.5, { flash: 0.5, zoom: 0.1, chroma: 18, dur: 0.4 });
  for (let i = 0; i < 8; i++) P(52 + i * BEAT, { zoom: 0.06, chroma: 12, glitch: 0.12, dur: 0.25 });
  P(59, { zoom: 0.05, chroma: 10, dur: 0.4 });
  for (let i = 0; i < 4; i++) P(61 + i * 0.75, { zoom: 0.06, chroma: 12, blur: [i % 2 ? 160 : -160, 0], dur: 0.2 });
  for (let i = 0; i < 3; i++) P(64 + i * 2 / 3, { zoom: 0.05, chroma: 10, blur: [0, i % 2 ? 140 : -140], dur: 0.2 });
  P(67, { flash: 0.7, zoom: 0.14, chroma: 24, dur: 0.55 }); for (let i = 1; i < 6; i++) P(67 + i * BEAT, { zoom: 0.04, chroma: 9, dur: 0.22 });
  P(73, { zoom: 0.1, chroma: 16, flash: 0.3, dur: 0.4 });
  for (let i = 1; i < 8; i++) P(76 + i * BEAT, { zoom: 0.06, chroma: 12, dur: 0.24 });
  for (let i = 1; i < 8; i++) P(80 + i * BEAT, { zoom: 0.06, chroma: 12, dur: 0.24 });
  P(88.3, { zoom: 0.1, chroma: 16, dur: 0.4 }); P(88.6, { flash: 0.3, zoom: 0.06, chroma: 14, dur: 0.4 });
  for (let i = 0; i < 8; i++) P(90 + i * BEAT, { zoom: 0.06, chroma: 12, glitch: 0.1, dur: 0.25 });
  P(96, { zoom: 0.08, chroma: 14, dur: 0.35 }); P(98, { zoom: 0.08, chroma: 14, dur: 0.35 });
  for (let i = 1; i < 6; i++) P(100 + i, { zoom: 0.08, chroma: 14, blur: [i % 2 ? 200 : -200, 0], dur: 0.25 });
  for (let i = 1; i < 16; i++) P(106 + i * 0.25, { zoom: 0.08, chroma: 12, blur: [i % 2 ? 120 : -120, 0], dur: 0.12 });
  P(110, { zoom: 0.07, chroma: 12, dur: 0.4 }); P(112.6, { flash: 0.4, zoom: 0.08, chroma: 16, dur: 0.45 });
  for (let i = 0; i < 4; i++) P(118.6 + i * 0.12, { glitch: 0.35, chroma: 14, dur: 0.1 });
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
    if (sec === 'mandir') { f.vig = 0.75; f.grain = 0.045; }
    if (t > TOTAL - 0.7) f.expo *= clamp01((TOTAL - t) / 0.7);
    return f;
  }

  // ---------------------------------------------------------------- frames
  function samplesAt(t) {
    const sec = (SECTIONS.find((s) => t >= s[1] && t < s[2]) || [''])[0];
    if (sec.startsWith('flight')) return [5, 0.85];
    // 9-render grids: one sample (cells are small and mostly static); multi-render splits: two
    if ((t >= 19.5 && t < 22.5) || (sec === 'nightgrid' && t < 88.6) || (sec === 'finale' && t >= 110)) return [1, 0];
    if (sec === 'beforeafter' || sec === 'rooms' || sec === 'aerial' || (sec === 'colour' && t >= 33.5) || (sec === 'floor' && t >= 39.5)) return [2, 1.0];
    if (sec === 'floor' || sec === 'macro') return [4, 1.2];
    if (sec === 'finale') return [4, 1.0];
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
    stateKey = ''; curPal = {}; dirty = false; probedKey = ''; fx = fx || createFxPass();
  }
  let SRV = 'http://localhost:5302';
  async function post(path, data) { for (let a = 0; a < 6; a++) { try { const r = await fetch(SRV + path, { method: 'POST', body: data }); if (r.ok) return r; } catch { /* retry */ } await new Promise((r) => setTimeout(r, 400)); } throw new Error('stream post failed: ' + path); }

  api.run = async ({ fps = 60, snaps = null, name = 'motion_edit_120s_1080p60', from = 0, to = TOTAL, srv = 'http://localhost:5302', raw = true, preset = 'medium' } = {}) => {
    SRV = srv;
    const saved = { design: design.snapshot(), light: JSON.parse(JSON.stringify(lighting.state)) };
    try {
      api.timing = { frame: 0, enc: 0, post: 0, n: 0 }; const N = Math.round(TOTAL * fps); const F0 = Math.round(from * fps), F1 = Math.min(N, Math.round(to * fps)); api.progress = { frame: F0, total: F1, done: false, error: null };
      setRecording(true); setSize(W, H); ctl.enterExplore({ x: 9.85, y: 7.95, yawDeg: 315 });
      await prepare();
      for (let w = 0; w < 4; w++) { await frameAt(0.5 + w * 29, fps); await tick(); }
      let pending = [], pendN = 0, encErr = null, enc = null;
      const RAW = !snaps && raw; let inflight = []; const rawBuf = new Uint8Array(W * H * 4);
      if (RAW) await post(`/start?w=${W}&h=${H}&fps=${fps}&name=${name}&preset=${preset}`);
      if (!snaps && !RAW) {
        enc = new VideoEncoder({ output: (c) => { const b = new Uint8Array(c.byteLength); c.copyTo(b); pending.push(b); pendN++; }, error: (e) => { encErr = e; } });
        enc.configure({ codec: 'avc1.640033', width: W, height: H, bitrate: 90e6, bitrateMode: 'variable', framerate: fps, latencyMode: 'quality', avc: { format: 'annexb' } });
        await post('/h264start');
      }
      const flush = async () => { if (!pending.length) return; const parts = pending, n = pendN; pending = []; pendN = 0; await post(`/chunk?n=${n}`, new Blob(parts)); };
      const list = snaps ? snaps.map(([n, s]) => [Math.round(s * fps), n]) : null;
      for (let f = snaps ? 0 : F0; f < (snaps ? N : F1); f++) {
        const t = f / fps;
        if (list) { const s = list.find((q) => q[0] === f); if (!s) continue; await frameAt(t, fps); const b = await new Promise((r) => fx.canvas.toBlob(r, 'image/jpeg', 0.86)); await post(`/snap?name=${s[1]}`, b); api.progress.frame = f; continue; }
        fans.forEach((fan) => { fan.userData.rotor.rotation.y += 1.2 / fps; });
        let _a = performance.now(); await frameAt(t, fps); const TM = api.timing; TM.frame += performance.now() - _a; _a = performance.now();
        if (RAW) {
          while (inflight.length >= 3) await inflight.shift();
          const gl = fx.canvas.getContext('webgl2'); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, rawBuf);
          inflight.push(post('/frame', rawBuf.slice()));
          TM.enc += performance.now() - _a; TM.n++; api.progress.frame = f + 1;
          if (api.abort) { api.abort = false; throw new Error('aborted'); }
          if (f % 30 === 0) await tick();
          continue;
        }
        const vf = new VideoFrame(fx.canvas, { timestamp: Math.round((f - F0) * 1e6 / fps), duration: Math.round(1e6 / fps) });
        enc.encode(vf, { keyFrame: (f - F0) % (fps * 2) === 0 }); vf.close();
        while (enc.encodeQueueSize > 6) await new Promise((r) => enc.addEventListener('dequeue', r, { once: true }));
        TM.enc += performance.now() - _a; _a = performance.now();
        if (pending.length >= 60) await flush();
        TM.post += performance.now() - _a; TM.n++;
        api.progress.frame = f + 1;
        if (encErr) throw encErr;
        if (api.abort) { api.abort = false; enc.close(); throw new Error('aborted'); }
        if (f % 30 === 0) await tick();
      }
      if (RAW) { await Promise.all(inflight); const r = await post('/end'); api.progress.result = await r.text(); }
      if (enc) { await enc.flush(); await flush(); enc.close(); const r = await post(`/h264end?fps=${fps}&name=${name}`); api.progress.result = await r.text(); }
      api.progress.done = true;
    } catch (e) { api.progress.error = String(e && e.stack || e); }
    finally {
      setCutaway(false); setRecording(false); stateKey = ''; curPal = {}; dirty = false; probedKey = '';
      await design.restore(saved.design); lighting.apply(saved.light); lighting.clearProbeCache?.(); captureProbe();
    }
  };
  api.prep = async () => { setRecording(true); setSize(W, H); await prepare(); }; api.frameAt = frameAt; api.fx = () => fx;
  api.bench = async (ts, fps = 60) => { setRecording(true); setSize(W, H); await prepare(); const out = []; for (const t of ts) { const a = performance.now(); await frameAt(t, fps); await tick(); out.push([t, Math.round(performance.now() - a)]); } setRecording(false); return out; };
  return api;
}
