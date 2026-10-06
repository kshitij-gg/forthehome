// Motion design for the showcase recording.
// 3D: palettes spread across surfaces as a travelling wavefront with a glowing edge; new floors grow
// out from a landing point; light changes reveal radially from where they land.
// 2D: a Design Studio panel slides in, a cursor picks the option, a light trail carries it to the
// surface, a ripple marks the landing, then the change spreads. Opening title + closing scheme card.
import * as THREE from 'three';
import { PALETTES, FLOOR_OPTIONS } from './design/design.js';
import { NIGHT_STYLES, kelvin } from './lighting/lighting.js';

export const LEAD = 1.9; // seconds from panel-in to the change landing
const PW = 400;
const GOLD = '#e3c79a';
const RIM = new THREE.Color(1.0, 0.74, 0.42);
const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const NUMERIC = ['time', 'kelvin', 'brightness', 'exposure'];
const ease = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * t * (t * (t * 6 - 15) + 10); };
const outCubic = (t) => { t = Math.min(1, Math.max(0, t)); return 1 - (1 - t) ** 3; };
const clamp01 = (t) => Math.min(1, Math.max(0, t));

// ---------------------------------------------------------------- wavefront shader patch
export function ensureWave(m, overlay = false) {
  if (m.userData.wave) return m.userData.wave;
  const u = {
    uWActive: { value: 0 }, uWOrigin: { value: new THREE.Vector3() }, uWRadius: { value: 0 },
    uWSoft: { value: 0.1 }, uWWidth: { value: 0.1 }, uWNew: { value: new THREE.Color() }, uWRim: { value: new THREE.Color(0, 0, 0) },
  };
  m.userData.wave = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vWaveP;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
#ifdef USE_INSTANCING
  vWaveP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vWaveP = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif`);
    sh.fragmentShader = 'varying vec3 vWaveP;\nuniform float uWActive, uWRadius, uWSoft, uWWidth;\nuniform vec3 uWOrigin, uWNew, uWRim;\n' + sh.fragmentShader
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `float wD = distance(vWaveP, uWOrigin);
${overlay ? 'if (uWActive > 0.5 && wD > uWRadius) discard;' : ''}
float wIn = uWActive > 0.5 ? 1.0 - smoothstep(uWRadius - uWSoft, uWRadius, wD) : 0.0;
vec4 diffuseColor = vec4( ${overlay ? 'diffuse' : 'mix( diffuse, uWNew, wIn )'}, opacity );`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
if (uWActive > 0.5) { float wq = (wD - uWRadius) / uWWidth; totalEmissiveRadiance += uWRim * exp(-wq * wq); }`);
  };
  m.customProgramCacheKey = () => (overlay ? 'waveO' : 'wave');
  m.needsUpdate = true;
  return u;
}

const toWorld = (at) => new THREE.Vector3(at[0], at[2], -at[1]);

export function createFx({ camera, renderer, design, lighting, arch }) {
  const fx = {};
  const floorImg = {};
  const proj = new THREE.Vector3();

  fx.prepare = async () => {
    for (const m of design.tweenables()) ensureWave(m);
    for (const f of FLOOR_OPTIONS) { const m = await design.floorMaterial(f.id); floorImg[f.id] = m.map && m.map.image; }
  };

  const rimStrength = (k, peak) => peak * Math.min(1, k * 8) * (1 - clamp01((k - 0.82) / 0.18));

  // palette: changed materials keep their old colour and the new one floods outward from `at`
  fx.paletteWave = (e, t, applyPalette) => {
    const mats = design.tweenables(); const before = mats.map((m) => m.color.clone());
    applyPalette();
    const list = [];
    mats.forEach((m, i) => {
      if (before[i].equals(m.color)) return;
      const after = m.color.clone(); m.color.copy(before[i]);
      const u = ensureWave(m); u.uWNew.value.copy(after); list.push([m, u, after]);
    });
    const o = toWorld(e.at), reach = e.reach || 7, dur = e.dur || 3.4;
    for (const [, u] of list) { u.uWOrigin.value.copy(o); u.uWRadius.value = 0; u.uWActive.value = 1; u.uWRim.value.setRGB(0, 0, 0); }
    return {
      t0: t, dur,
      step: (k) => { const r = k * reach; const s = rimStrength(k, 2.3); for (const [, u] of list) { u.uWRadius.value = r; u.uWRim.value.copy(RIM).multiplyScalar(s); } },
      finish: () => { for (const [m, u, after] of list) { m.color.copy(after); u.uWActive.value = 0; } },
    };
  };

  // floor: an overlay of the new finish grows from the landing point, then replaces the old one
  fx.floorWave = async (e, t) => {
    const base = await design.floorMaterial(e.floor);
    const mat = base.clone(); mat.clippingPlanes = base.clippingPlanes;
    const u = ensureWave(mat, true); u.uWWidth.value = 0.16;
    const meshes = arch.floorMeshes.filter((m) => e.rooms.includes(m.userData.room));
    const ovs = meshes.map((m) => {
      const ov = new THREE.Mesh(m.geometry, mat); ov.position.copy(m.position); ov.position.y += 0.0015;
      ov.receiveShadow = true; ov.renderOrder = 1; m.parent.add(ov); return ov;
    });
    u.uWOrigin.value.copy(toWorld(e.at)); u.uWRadius.value = 0; u.uWActive.value = 1;
    const reach = e.reach || 7, dur = e.dur || 3.8;
    return {
      t0: t, dur,
      step: (k) => { u.uWRadius.value = k * reach; u.uWRim.value.copy(RIM).multiplyScalar(rimStrength(k, 4.5)); },
      finish: async () => { await design.applyFloor(e.floor, e.rooms); ovs.forEach((o) => o.parent.remove(o)); mat.dispose(); },
    };
  };

  fx.project = (at, W, H) => {
    proj.copy(toWorld(at)).project(camera);
    return { x: (proj.x * 0.5 + 0.5) * W, y: (-proj.y * 0.5 + 0.5) * H, ok: proj.z < 1 };
  };

  // ---------------------------------------------------------------- Studio panel spec per event
  const ROOMN = { hall: 'Living room', dining: 'Dining', kitchen: 'Kitchen', mbed: 'Master bedroom', chbed: "Children's bedroom", office: 'Office', entry: 'Entry', corridor: 'Corridor' };
  const coveCol = (s) => { const c = Object.values(s.coves)[0]; return c != null ? '#' + new THREE.Color(c).getHexString() : '#' + kelvin(s.kelvin).getHexString(); };
  function specFor(e) {
    if (e.pal) return { kind: 'palette', title: 'Colour palette', sub: e.scope.map((s) => ROOMN[s]).join(', '), sel: e.pal, h: 104 + PALETTES.length * 46 + 14 };
    if (e.floor) return { kind: 'floor', title: 'Flooring', sub: e.scopeLabel || e.rooms.map((r) => ROOMN[r]).join(', '), sel: e.floor, h: 104 + 4 * 92 + 8 };
    const L = e.light;
    if (L.mode) return { kind: 'mode', title: 'Day & night', sub: 'Whole home', sel: L.mode, cur: lighting.state.mode, h: 104 + 70 };
    if (L.style) return { kind: 'scene', title: 'Lighting scene', sub: 'Whole home', sel: L.style, h: 104 + NIGHT_STYLES.length * 46 + 14 };
    if (L.mode) return { kind: 'mode', title: 'Day & night', sub: 'Whole home', sel: L.mode, cur: lighting.state.mode, h: 104 + 70 };
    if (L.layers) return { kind: 'layers', title: 'Light layers', sub: 'Whole home', before: { ...lighting.state.layers }, after: { ...lighting.state.layers, ...L.layers }, h: 104 + 4 * 48 + 12 };
    if (L.dayLights !== undefined) return { kind: 'toggle', title: 'Interior lights', sub: 'Daylight mode', before: lighting.state.dayLights, after: L.dayLights, h: 104 + 62 };
    const key = Object.keys(L).find((k) => NUMERIC.includes(k));
    return { kind: 'slider', key, title: { kelvin: 'Colour temperature', time: 'Time of day', brightness: 'Brightness', exposure: 'Exposure' }[key], sub: 'Whole home', h: 104 + 118 };
  }
  const RANGE = { kelvin: [2200, 5000], time: [7, 18.5], brightness: [0, 1.2], exposure: [-1, 1] };
  const fmt = (key, v) => (key === 'kelvin' ? `${Math.round(v / 10) * 10} K` : key === 'time' ? `${String(Math.floor(v)).padStart(2, '0')}:${String(Math.floor((v % 1) * 60)).padStart(2, '0')}` : key === 'brightness' ? `${Math.round(v * 100)}%` : v.toFixed(2));

  function sw(g, x, y, on, k) { // toggle switch, k = 0..1 knob position
    g.fillStyle = on ? `rgba(227,199,154,${0.35 + 0.5 * k})` : 'rgba(255,255,255,0.18)';
    g.beginPath(); g.roundRect(x, y, 48, 26, 13); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + 13 + 22 * k, y + 13, 10, 0, Math.PI * 2); g.fill();
  }
  function cursor(g, x, y, s, a) {
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.scale(s, s);
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 8; g.shadowOffsetY = 2;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 26); g.lineTo(7, 20); g.lineTo(12, 31); g.lineTo(17, 29); g.lineTo(12, 18); g.lineTo(21, 18); g.closePath();
    g.fillStyle = '#ffffff'; g.fill(); g.shadowBlur = 0; g.lineWidth = 1.3; g.strokeStyle = '#151515'; g.stroke();
    g.restore();
  }

  // draws the panel; returns the cursor target point (and the clicked item point) in screen space
  function drawPanel(g, src, ev, x, y, t) {
    const sp = ev.spec; const rel = t - ev.t; const clicked = rel >= 1.0; const applied = t >= ev.ta;
    const ck = ease((rel - 1.0) / 0.35);
    // frosted backdrop
    g.save(); g.beginPath(); g.roundRect(x, y, PW, sp.h, 18); g.clip();
    g.filter = 'blur(22px)'; g.drawImage(src, x - 40, y - 40, PW + 80, sp.h + 80, x - 40, y - 40, PW + 80, sp.h + 80); g.filter = 'none';
    g.fillStyle = 'rgba(14,14,17,0.58)'; g.fillRect(x, y, PW, sp.h); g.restore();
    g.beginPath(); g.roundRect(x + 0.5, y + 0.5, PW - 1, sp.h - 1, 18); g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.16)'; g.stroke();
    g.textAlign = 'left';
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.font = `600 12px ${FONT}`; g.letterSpacing = '4px'; g.fillText('DESIGN STUDIO', x + 26, y + 36);
    g.fillStyle = '#ffffff'; g.font = `300 27px ${FONT}`; g.letterSpacing = '0.5px'; g.fillText(sp.title, x + 24, y + 70);
    g.fillStyle = GOLD; g.font = `400 14px ${FONT}`; g.letterSpacing = '1.5px'; g.fillText(sp.sub, x + 26, y + 92);
    let tgt = null;
    const hl = (rx, ry, rw, rh, on) => {
      if (!on) return;
      g.save(); g.fillStyle = `rgba(227,199,154,${0.18 * ck})`; g.beginPath(); g.roundRect(rx, ry, rw, rh, 10); g.fill();
      g.lineWidth = 1.6; g.strokeStyle = `rgba(227,199,154,${0.9 * ck})`; g.shadowColor = GOLD; g.shadowBlur = 14 * ck; g.stroke(); g.restore();
    };
    const tick = (cx, cy) => { if (!applied) return; const a = ease((t - ev.ta) / 0.4); g.save(); g.globalAlpha *= a; g.strokeStyle = GOLD; g.lineWidth = 2.2; g.beginPath(); g.moveTo(cx - 6, cy); g.lineTo(cx - 1, cy + 5); g.lineTo(cx + 8, cy - 5); g.stroke(); g.restore(); };
    if (sp.kind === 'palette' || sp.kind === 'scene') {
      const rows = sp.kind === 'palette' ? PALETTES : NIGHT_STYLES;
      rows.forEach((r, i) => {
        const ry = y + 106 + i * 46; const sel = r.id === sp.sel;
        hl(x + 12, ry, PW - 24, 40, sel && clicked);
        if (sp.kind === 'palette') {
          ['wall', 'accent', 'upholstery', 'soft'].forEach((k, j) => { g.beginPath(); g.arc(x + 36 + j * 21, ry + 20, 8, 0, Math.PI * 2); g.fillStyle = '#' + new THREE.Color(r[k]).getHexString(); g.fill(); g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.stroke(); });
        } else {
          g.save(); g.beginPath(); g.arc(x + 38, ry + 20, 9, 0, Math.PI * 2); g.fillStyle = coveCol(r); g.shadowColor = coveCol(r); g.shadowBlur = 12; g.fill(); g.restore();
          g.fillStyle = 'rgba(255,255,255,0.5)'; g.font = `400 13px ${FONT}`; g.letterSpacing = '1px'; g.textAlign = 'right'; g.fillText(`${r.kelvin} K`, x + PW - 52, ry + 25); g.textAlign = 'left';
        }
        g.fillStyle = sel && clicked ? '#ffffff' : 'rgba(255,255,255,0.8)'; g.font = `${sel && clicked ? 500 : 400} 16px ${FONT}`; g.letterSpacing = '0.5px';
        g.fillText(r.name, x + (sp.kind === 'palette' ? 132 : 62), ry + 25);
        if (sel) { tgt = { x: x + PW - 120, y: ry + 22, ix: x + 12, iy: ry + 20 }; tick(x + PW - 34, ry + 20); }
      });
    } else if (sp.kind === 'floor') {
      const tw = (PW - 44) / 2, th = 56;
      FLOOR_OPTIONS.forEach((f, i) => {
        const c = i % 2, r = Math.floor(i / 2); const tx = x + 16 + c * (tw + 12), ty = y + 106 + r * 92; const sel = f.id === sp.sel;
        const img = floorImg[f.id];
        g.save(); g.beginPath(); g.roundRect(tx, ty, tw, th, 8); g.clip();
        if (img) g.drawImage(img, 0, 0, Math.min(img.width, 520), Math.min(img.height, 520) * th / tw, tx, ty, tw, th); else { g.fillStyle = '#777'; g.fillRect(tx, ty, tw, th); }
        g.restore();
        g.beginPath(); g.roundRect(tx, ty, tw, th, 8); g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.22)'; g.stroke();
        if (sel && clicked) { g.save(); g.beginPath(); g.roundRect(tx - 3, ty - 3, tw + 6, th + 6, 10); g.lineWidth = 2.4; g.strokeStyle = `rgba(227,199,154,${ck})`; g.shadowColor = GOLD; g.shadowBlur = 16 * ck; g.stroke(); g.restore(); }
        g.fillStyle = sel && clicked ? '#ffffff' : 'rgba(255,255,255,0.75)'; g.font = `400 13px ${FONT}`; g.letterSpacing = '0.5px'; g.fillText(f.name, tx + 2, ty + th + 20);
        if (sel) { tgt = { x: tx + tw * 0.62, y: ty + th * 0.55, ix: tx, iy: ty + th / 2 }; if (applied) tick(tx + tw - 16, ty + 14); }
      });
    } else if (sp.kind === 'mode') {
      const sw2 = (PW - 48) / 2;
      ['day', 'night'].forEach((m, i) => {
        const sx = x + 24 + i * sw2, sy = y + 108; const on = clicked ? m === sp.sel : m === sp.cur;
        g.save(); g.beginPath(); g.roundRect(sx + 2, sy, sw2 - 4, 52, 12); g.fillStyle = on ? 'rgba(227,199,154,0.22)' : 'rgba(255,255,255,0.06)'; g.fill();
        if (on) { g.lineWidth = 1.5; g.strokeStyle = GOLD; g.stroke(); } g.restore();
        g.save(); g.translate(sx + 34, sy + 26); g.fillStyle = on ? '#ffe2b0' : 'rgba(255,255,255,0.6)';
        if (m === 'day') { g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.fill(); g.strokeStyle = g.fillStyle; g.lineWidth = 2; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); g.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); g.stroke(); } }
        else { g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(5, -4, 9, 0, Math.PI * 2); g.fill(); }
        g.restore();
        g.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,0.7)'; g.font = `400 17px ${FONT}`; g.fillText(m === 'day' ? 'Day' : 'Night', sx + 58, sy + 32);
        if (m === sp.sel) tgt = { x: sx + sw2 * 0.55, y: sy + 30, ix: sx, iy: sy + 26 };
      });
    } else if (sp.kind === 'layers' || sp.kind === 'toggle') {
      const keys = sp.kind === 'layers' ? [['profiles', 'Profile lights'], ['spots', 'Spotlights'], ['coves', 'Coves'], ['downlights', 'Downlights']] : [['dayLights', 'Interior lights on']];
      const bef = sp.kind === 'layers' ? sp.before : { dayLights: sp.before }, aft = sp.kind === 'layers' ? sp.after : { dayLights: sp.after };
      let first = true;
      keys.forEach(([k, label], i) => {
        const ry = y + 106 + i * 48; const changed = bef[k] !== aft[k];
        const kk = changed ? (clicked ? (aft[k] ? ck : 1 - ck) : (bef[k] ? 1 : 0)) : (aft[k] ? 1 : 0);
        g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `400 16px ${FONT}`; g.letterSpacing = '0.5px'; g.fillText(label, x + 26, ry + 27);
        sw(g, x + PW - 76, ry + 8, kk > 0.5, kk);
        if (changed && first) { tgt = { x: x + PW - 52, y: ry + 22, ix: x + 12, iy: ry + 20 }; first = false; }
      });
    } else if (sp.kind === 'slider') {
      const [a, b] = RANGE[sp.key]; const v = lighting.state[sp.key]; const k = clamp01((v - a) / (b - a));
      g.fillStyle = '#ffffff'; g.font = `200 40px ${FONT}`; g.letterSpacing = '1px'; g.fillText(fmt(sp.key, v), x + 24, y + 152);
      const tx0 = x + 26, tx1 = x + PW - 26, ty = y + 188;
      const gr = g.createLinearGradient(tx0, 0, tx1, 0);
      const stops = { kelvin: ['#ff9d4d', '#ffe7c4', '#d8e6ff'], time: ['#ffe9b8', '#ffb067', '#4c5d8f'], brightness: ['#2a2a2a', '#bbbbbb', '#ffffff'], exposure: ['#333', '#999', '#fff'] }[sp.key];
      stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
      g.fillStyle = gr; g.beginPath(); g.roundRect(tx0, ty - 4, tx1 - tx0, 8, 4); g.fill();
      const kx = tx0 + k * (tx1 - tx0);
      g.save(); g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 8; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(kx, ty, 11, 0, Math.PI * 2); g.fill(); g.restore();
      if (clicked) { g.save(); g.strokeStyle = `rgba(227,199,154,${ck})`; g.lineWidth = 2; g.beginPath(); g.arc(kx, ty, 15, 0, Math.PI * 2); g.stroke(); g.restore(); }
      tgt = { x: kx + 2, y: ty + 4, ix: x + 12, iy: ty };
    }
    return tgt;
  }

  // ---------------------------------------------------------------- per-frame UI
  fx.drawUI = (g, src, W, H, t, events) => {
    // the latest event whose panel has started drives the panel; others may still be landing
    let cur = null;
    for (const ev of events) if (!ev.e.noUI && ev.t <= t) cur = ev;
    for (const ev of events) if (!ev.spec && ev.t <= t) ev.spec = specFor(ev.e);
    if (cur) {
      const rel = t - cur.t, out = clamp01((t - (cur.end + 0.35)) / 0.5);
      const prev = events[events.indexOf(cur) - 1];
      const cont = prev && !prev.e.noUI && cur.t < prev.end + 0.85; // panel already up: swap content without sliding
      const inK = cont ? 1 : outCubic(rel / 0.45);
      const a = inK * (1 - out);
      if (a > 0.001) {
        const x = W - 88 - PW + (1 - inK) * 60 + out * 40, y = 196;
        g.save(); g.globalAlpha = a;
        const tgt = drawPanel(g, src, cur, x, y, t);
        g.restore();
        if (tgt) {
          // cursor glides in, clicks, then rides the slider while the value changes
          const start = { x: x + PW * 0.35, y: y + cur.spec.h + 140 };
          const mk = ease((rel - 0.3) / 0.65);
          const cx = start.x + (tgt.x - start.x) * mk, cy = start.y + (tgt.y - start.y) * mk;
          const press = rel > 1.0 && rel < 1.18 ? 0.86 : 1;
          const ca = clamp01((rel - 0.2) / 0.25) * (1 - out);
          g.save(); g.globalAlpha = 1;
          if (rel >= 1.0 && rel < 1.6) { // click ripple
            const rk = (rel - 1.0) / 0.6; g.strokeStyle = `rgba(227,199,154,${0.9 * (1 - rk)})`; g.lineWidth = 2; g.beginPath(); g.arc(tgt.x, tgt.y, 6 + 26 * outCubic(rk), 0, Math.PI * 2); g.stroke();
          }
          cursor(g, cx, cy, press, ca);
          g.restore();
          // light trail from the chosen option to where it lands in the room
          if (cur.e.at && rel >= 1.02) {
            const p = fx.project(cur.e.at, W, H);
            if (p.ok) {
              const a0 = { x: tgt.ix, y: tgt.iy }, c1 = { x: a0.x - 260, y: a0.y + 10 }, c2 = { x: p.x + (a0.x - p.x) * 0.25, y: p.y - 220 };
              const bz = (s) => { const u = 1 - s; return { x: u * u * u * a0.x + 3 * u * u * s * c1.x + 3 * u * s * s * c2.x + s * s * s * p.x, y: u * u * u * a0.y + 3 * u * u * s * c1.y + 3 * u * s * s * c2.y + s * s * s * p.y }; };
              const head = ease((rel - 1.02) / (LEAD - 1.02)), fadeT = clamp01((rel - LEAD) / 0.7);
              const tail = ease(fadeT); // whole trail while travelling, then it retracts into the landing point
              if (fadeT < 1) {
                g.save(); g.lineCap = 'round'; g.shadowColor = GOLD; g.shadowBlur = 18;
                const n = 48;
                for (let i = 0; i < n; i++) {
                  const s0 = tail + (head - tail) * (i / n), s1 = tail + (head - tail) * ((i + 1) / n);
                  const q0 = bz(s0), q1 = bz(s1);
                  g.strokeStyle = `rgba(255,228,176,${(0.35 + 0.65 * (i / n)) * (1 - fadeT * 0.6)})`; g.lineWidth = 1.6 + 3.2 * (i / n);
                  g.beginPath(); g.moveTo(q0.x, q0.y); g.lineTo(q1.x, q1.y); g.stroke();
                }
                if (head < 1) { const h = bz(head); g.fillStyle = '#fff6e4'; g.shadowBlur = 30; g.beginPath(); g.arc(h.x, h.y, 7, 0, Math.PI * 2); g.fill(); }
                g.restore();
              }
            }
          }
        }
      }
    }
    // landing bursts (independent of the panel so overlapping events still land properly)
    for (const ev of events) {
      if (!ev.e.at || t < ev.ta || t > ev.ta + 1.3) continue;
      const p = fx.project(ev.e.at, W, H); if (!p.ok) continue;
      g.save(); g.shadowColor = GOLD; g.shadowBlur = 16;
      for (let r = 0; r < 3; r++) {
        const k = (t - ev.ta - r * 0.16) / 1.0; if (k < 0 || k > 1) continue;
        g.strokeStyle = `rgba(255,228,180,${0.85 * (1 - k)})`; g.lineWidth = 2.5 * (1 - k) + 0.5;
        g.beginPath(); g.ellipse(p.x, p.y, 10 + 150 * outCubic(k), (10 + 150 * outCubic(k)) * 0.62, 0, 0, Math.PI * 2); g.stroke();
      }
      const fk = clamp01((t - ev.ta) / 0.5); g.fillStyle = `rgba(255,245,225,${0.9 * (1 - fk)})`; g.beginPath(); g.arc(p.x, p.y, 7 + 10 * fk, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  };

  // radial reveal for discrete changes (lighting): the old frame is eaten away from the landing point
  const tmp = document.createElement('canvas'); const tg = tmp.getContext('2d');
  fx.reveal = (g, fadeC, fade, t, W, H) => {
    const p = (t - fade.t0) / fade.dur; if (p >= 1) return false;
    if (tmp.width !== W) { tmp.width = W; tmp.height = H; }
    const c = fade.at ? fx.project(fade.at, W, H) : { x: W / 2, y: H / 2, ok: true };
    const R = Math.hypot(W, H) * 1.05 * ease(Math.max(0, p)), soft = 220;
    tg.globalCompositeOperation = 'copy'; tg.drawImage(fadeC, 0, 0);
    tg.globalCompositeOperation = 'destination-out';
    const gr = tg.createRadialGradient(c.x, c.y, Math.max(0, R - soft), c.x, c.y, R + 1);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    tg.fillStyle = gr; tg.fillRect(0, 0, W, H);
    g.drawImage(tmp, 0, 0);
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,214,150,${0.35 * (1 - p)})`; g.lineWidth = 3; g.shadowColor = GOLD; g.shadowBlur = 30;
    g.beginPath(); g.arc(c.x, c.y, Math.max(1, R - soft * 0.5), 0, Math.PI * 2); g.stroke(); g.restore();
    return true;
  };

  // ---------------------------------------------------------------- opening + closing cards
  fx.drawBookends = (g, W, H, t, total, finale) => {
    if (t < 4) {
      const black = t < 0.7 ? 1 : 1 - ease((t - 0.7) / 1.6);
      if (black > 0) { g.fillStyle = `rgba(0,0,0,${black})`; g.fillRect(0, 0, W, H); }
      const a = Math.min(clamp01((t - 0.25) / 0.7), 1 - clamp01((t - 3.0) / 0.9));
      if (a > 0) {
        g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 20;
        g.fillStyle = '#ffffff'; g.font = `200 76px ${FONT}`; g.letterSpacing = '26px'; g.fillText('RESIDENCE', W / 2 + 13, H / 2 - 10);
        g.fillStyle = GOLD; g.fillRect(W / 2 - 40 * a, H / 2 + 18, 80 * a, 2);
        g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `400 19px ${FONT}`; g.letterSpacing = '7px'; g.fillText('DESIGN STUDIO  ·  LIVE RESTYLING', W / 2 + 3, H / 2 + 62);
        g.restore();
      }
    }
    const t0 = total - 6.2;
    if (t > t0 && finale) {
      const a = Math.min(clamp01((t - t0) / 0.8), 1);
      g.save();
      const gr = g.createLinearGradient(0, 0, W * 0.62, 0); gr.addColorStop(0, `rgba(8,8,10,${0.82 * a})`); gr.addColorStop(1, 'rgba(8,8,10,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.textAlign = 'left'; g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 10;
      const y0 = H / 2 - finale.length * 37 - 30;
      g.globalAlpha = a; g.fillStyle = GOLD; g.font = `600 16px ${FONT}`; g.letterSpacing = '6px'; g.fillText('THE FINAL SCHEME', 120, y0);
      finale.forEach(([room, spec, pal], i) => {
        const k = ease((t - t0 - 0.35 - i * 0.14) / 0.6); if (k <= 0) return;
        const y = y0 + 62 + i * 74; g.globalAlpha = k;
        g.fillStyle = '#ffffff'; g.font = `300 30px ${FONT}`; g.letterSpacing = '1px'; g.fillText(room, 120 + (1 - k) * 24, y);
        g.fillStyle = 'rgba(255,255,255,0.72)'; g.font = `400 17px ${FONT}`; g.letterSpacing = '1px'; g.fillText(spec, 122 + (1 - k) * 24, y + 26);
        const p = PALETTES.find((q) => q.id === pal);
        if (p) ['wall', 'accent', 'upholstery', 'soft'].forEach((kk, j) => { g.beginPath(); g.arc(500 + j * 24 + (1 - k) * 24, y - 10, 9, 0, Math.PI * 2); g.fillStyle = '#' + new THREE.Color(p[kk]).getHexString(); g.fill(); g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.4)'; g.stroke(); });
      });
      g.restore();
      const black = clamp01((t - (total - 1.5)) / 1.4);
      if (black > 0) { g.fillStyle = `rgba(0,0,0,${ease(black)})`; g.fillRect(0, 0, W, H); }
    }
  };
  return fx;
}
