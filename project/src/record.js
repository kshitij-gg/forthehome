// Cinematic walkthrough recorder (Explore camera only).
// Technique: eye-level camera (1.58 m), slow walking pace, eased moves, pan-follow camera with tilt held
// near level (verticals stay vertical), crescent/dolly moves into rooms, doors opened on cue,
// pan speed limited so the camera never whips. Frames are rendered deterministically at 1920x1080,
// POSTed to a local receiver and encoded to MP4 with ffmpeg.
import * as THREE from 'three';
import { PALETTES, FLOOR_OPTIONS, SURFACES } from './design/design.js';
import { NIGHT_STYLES } from './lighting/lighting.js';
import { SHOWCASE } from './showcase.js';
import { createFx, LEAD } from './recfx.js';

const EYE = 1.58, WALK = 1.0; // metres, metres/second

// Shot script. `path` = camera positions (smooth Catmull-Rom), `look` = [u, x, y, z] keyframes for what
// the camera looks at, `doors` = [u, doorId] cues, `move` = walk (A* path) to the next shot's start.
export const SCRIPT = [
  { name: 'Lobby', dur: 10, path: [[9.85, 7.95], [9.6, 8.25], [9.7, 8.48], [9.95, 8.54]],
    look: [[0, 8.3, 9.6, 1.6], [0.22, 8.1, 8.45, 1.3], [0.45, 9.47, 7.55, 1.25], [0.72, 11.9, 8.55, 1.2], [1, 11.9, 8.55, 1.2]],
    doors: [[0.5, 'd_office_pass']] },
  { name: 'to office', move: true, to: [10.95, 8.55] },
  { name: 'Office', dur: 11, path: [[10.95, 8.55], [11.5, 9.3], [12.2, 9.75], [13.2, 9.9]],
    look: [[0, 12.2, 11.6, 1.0], [0.3, 12.9, 11.5, 0.95], [0.62, 13.95, 9.95, 1.15], [1, 16.5, 9.9, 1.2]],
    doors: [[0.4, 'd_office_bal']] },
  { name: 'Office balcony', dur: 7, path: [[13.2, 9.9], [13.9, 9.92], [14.2, 9.93]],
    look: [[0, 16.5, 9.9, 1.2], [0.38, 14.3, 11.3, 0.7], [0.68, 14.3, 8.5, 0.7], [1, 12.0, 8.6, 1.0]] },
  { name: 'to office lounge', move: true, to: [12.3, 9.7] },
  { name: 'Office lounge', dur: 7, path: [[12.3, 9.7], [12.0, 9.4], [11.6, 9.0]],
    look: [[0, 12.66, 8.2, 0.75], [0.35, 12.66, 8.0, 1.3], [0.68, 10.65, 10.4, 1.3], [1, 11.3, 7.95, 1.05]],
    doors: [[0.55, 'd_office_foyer']] },
  { name: 'to deoghar', move: true, to: [10.8, 7.15] },
  { name: 'Deoghar', dur: 8.5, path: [[10.8, 7.15], [11.0, 7.18], [11.15, 7.2]],
    look: [[0, 12.9, 7.23, 1.35], [0.5, 12.9, 7.0, 1.15], [1, 12.9, 7.35, 1.3]],
    doors: [[0.05, 'd_shrine']] },
  { name: 'to living', move: true, to: [9.45, 6.85] },
  { name: 'Living room', dur: 12, path: [[9.45, 6.85], [8.6, 6.78], [7.4, 6.75], [6.1, 6.68], [5.55, 6.55]],
    look: [[0, 6.6, 7.45, 1.35], [0.22, 6.8, 7.2, 1.2], [0.45, 7.2, 4.6, 0.7], [0.7, 4.45, 5.4, 1.1], [1, 5.6, 3.0, 0.9]] },
  { name: 'to balcony door', move: true, to: [9.15, 5.9] },
  { name: 'Living room balcony', dur: 7, path: [[9.15, 5.9], [9.7, 5.95], [10.3, 5.95]],
    look: [[0, 10.4, 5.9, 1.35], [0.45, 11.2, 5.0, 0.85], [1, 11.4, 4.3, 1.0]],
    doors: [[0.05, 'd_hall_bal']] },
  { name: 'to dining', move: true, to: [6.62, 3.7] },
  { name: 'Dining', dur: 8, path: [[6.62, 3.7], [6.66, 2.8], [6.58, 1.98]],
    look: [[0, 5.0, 2.95, 0.9], [0.5, 5.0, 2.75, 0.85], [1, 5.1, 2.55, 0.95]] },
  { name: 'to washing', move: true, to: [4.9, 1.95], doorsAtEnd: [[1.6, 'd_wash']] },
  { name: 'Washing area', dur: 5, path: [[4.9, 1.95], [4.9, 1.7], [4.9, 1.55]],
    look: [[0, 4.9, 0.2, 1.1], [0.45, 3.7, 0.6, 1.0], [1, 6.1, 0.6, 1.0]] },
  { name: 'to kitchen', move: true, to: [7.05, 2.45] },
  { name: 'Kitchen', dur: 10, path: [[7.05, 2.45], [7.6, 2.5], [8.35, 2.3]],
    look: [[0, 9.6, 1.95, 1.35], [0.3, 8.8, 3.45, 1.0], [0.55, 9.75, 2.9, 1.5], [0.82, 8.25, 1.15, 1.0], [1, 9.6, 1.7, 1.25]] },
  { name: "to kids' bedroom", move: true, to: [2.87, 7.72], doorsAtEnd: [[2.4, 'd_chbed']] },
  { name: "Kids' bedroom", dur: 9, path: [[2.87, 7.72], [2.92, 8.55], [3.15, 9.25]],
    look: [[0, 2.9, 9.6, 1.35], [0.4, 0.6, 10.2, 0.95], [0.75, 3.0, 11.6, 1.05], [1, 4.2, 10.6, 1.0]] },
  { name: 'to dressing', move: true, to: [4.3, 8.73], doorsAtEnd: [[2.2, 'd_chrm']] },
  { name: "Kids' dressing + bathroom", dur: 8.5, path: [[4.3, 8.73], [5.05, 8.82], [5.08, 9.15], [5.12, 9.6]],
    look: [[0, 6.35, 8.85, 1.3], [0.3, 5.07, 9.45, 1.25], [0.65, 5.25, 11.3, 1.35], [1, 4.6, 10.3, 1.35]],
    doors: [[0.2, 'd_cht']] },
  { name: 'to common toilet', move: true, to: [2.88, 7.55], doorsAtEnd: [[2.0, 'd_ct']] },
  { name: 'Common toilet', dur: 6, path: [[2.88, 7.55], [2.4, 7.55], [2.0, 7.52]],
    look: [[0, 0.3, 7.5, 1.3], [0.6, 0.6, 7.45, 1.25], [1, 1.2, 6.85, 1.3]] },
  { name: 'to master toilet', move: true, to: [2.88, 5.75], doorsAtEnd: [[2.0, 'd_mt']] },
  { name: 'Master toilet', dur: 6, path: [[2.88, 5.75], [2.4, 5.75], [1.95, 5.78]],
    look: [[0, 0.3, 5.9, 1.3], [0.55, 0.5, 6.0, 1.2], [1, 1.9, 6.65, 1.4]] },
  { name: 'to master bedroom', move: true, to: [2.62, 5.55], doorsAtEnd: [[2.0, 'd_mbed']] },
  { name: 'Master bedroom', dur: 13, path: [[2.62, 5.55], [2.6, 4.6], [2.7, 3.8], [2.72, 2.5], [2.7, 2.4]],
    look: [[0, 2.0, 1.6, 1.1], [0.14, 1.2, 2.3, 1.1], [0.3, 0.1, 2.9, 1.2], [0.5, 0.6, 4.6, 1.3], [0.7, 1.6, 0.5, 1.15], [0.86, 0.1, 2.83, 1.15], [1, 0.1, 2.83, 1.15]],
    doors: [[0.58, 'd_mbed_bal']] },
];

const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

function catmull(pts, u) {
  if (pts.length === 1) return pts[0];
  const n = pts.length - 1, s = Math.min(n - 1e-6, Math.max(0, u * n)), i = Math.floor(s), t = s - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  const c = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t * t + (-a + 3 * b - 3 * cc + d) * t * t * t);
  return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
}
function lookAt(keys, u) {
  if (u <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    if (u <= keys[i][0]) {
      const k = ease((u - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
      return [1, 2, 3].map((j) => keys[i - 1][j] + (keys[i][j] - keys[i - 1][j]) * k);
    }
  }
  return keys[keys.length - 1].slice(1);
}
// resample a polyline at uniform arc length (so Catmull-Rom moves keep a constant walking speed)
function resample(pts, step = 0.25) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i]; const d = Math.hypot(bx - ax, by - ay); const n = Math.max(1, Math.round(d / step));
    for (let k = 1; k <= n; k++) out.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]);
  }
  return out;
}

export function createRecorder(ctx) {
  const { renderer, camera, ctl, doors, tour, lighting, design, arch, captureProbe, renderNow, setRecording, setSize, tick } = ctx;
  const api = { progress: { frame: 0, total: 0, done: false, error: null } };
  const doorById = Object.fromEntries(doors.list.map((d) => [d.id, d]));
  const SCRIPTS = { walk: { shots: SCRIPT, walk: WALK }, showcase: SHOWCASE };

  function buildTimeline(name = 'walk') {
    const sc = SCRIPTS[name];
    const walk = sc.walk || WALK;
    // plan the walking legs with all doors open, then close them again for the recording
    doors.list.forEach((d) => { d.state.t = 1; d.update(0); });
    tour.buildGrid();
    const segs = [], events = []; let t = 0;
    for (const s0 of sc.shots) {
      let s = s0;
      // `sec` shots give look / door keys in seconds from the shot start
      if (s.sec && !s.move) s = { ...s, look: s.look.map(([k, ...r]) => [k / s.dur, ...r]), doors: (s.doors || []).map(([k, id]) => [k / s.dur, id]) };
      if (s.move) {
        const prev = segs[segs.length - 1];
        const from = prev ? prev.path[prev.path.length - 1] : [9.5, 8.4];
        const raw = tour.astar(from[0], from[1], s.to[0], s.to[1]);
        raw[0] = from; raw[raw.length - 1] = s.to;
        const path = resample(raw);
        let L = 0; for (let k = 1; k < path.length; k++) L += Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]);
        const dur = Math.max(1.8, L / walk + 0.6);
        const cues = (s.doors || []).map(([u, id]) => [t + u * dur, id]).concat((s.doorsAtEnd || []).map(([sec, id]) => [t + Math.max(0, dur - sec), id]));
        segs.push({ ...s, path, dur, t0: t, t1: t + dur, cues, L });
        t += dur;
      } else {
        const cues = (s.doors || []).map(([u, id]) => [t + u * s.dur, id]);
        for (const [k, e] of s0.ev || []) events.push({ t: t + (s0.sec ? k : k * s.dur), e });
        segs.push({ ...s, t0: t, t1: t + s.dur, cues });
        t += s.dur;
      }
    }
    events.sort((a, b) => a.t - b.t);
    return { segs, events, total: t };
  }

  function sample(tl, time) {
    const segs = tl.segs;
    let i = segs.findIndex((s) => time < s.t1); if (i < 0) i = segs.length - 1;
    const s = segs[i];
    const u = Math.min(1, Math.max(0, (time - s.t0) / s.dur));
    const pos = catmull(s.path, ease(u));
    let look;
    if (!s.move) look = lookAt(s.look, u);
    else {
      // walking: look ahead along the path, blending out of the previous framing and into the next one
      const ahead = catmull(s.path, Math.min(1, ease(u) + 1.6 / Math.max(1.6, s.L)));
      const along = [ahead[0] + (ahead[0] - pos[0]) * 2, ahead[1] + (ahead[1] - pos[1]) * 2, EYE - 0.05];
      const prev = segs[i - 1], next = segs[i + 1];
      const fromLook = prev && !prev.move ? lookAt(prev.look, 1) : along;
      const toLook = next && !next.move ? lookAt(next.look, 0) : along;
      const a = 1 - ease(Math.min(1, u / 0.3)), b = ease(Math.max(0, (u - 0.62) / 0.38));
      look = along.map((v, j) => v + (fromLook[j] - v) * a);
      look = look.map((v, j) => v + (toLook[j] - v) * b);
    }
    return { pos, look, seg: s };
  }

  const SRV = 'http://localhost:5302';
  async function post(path, data) {
    for (let a = 0; a < 6; a++) {
      try { const r = await fetch(SRV + path, { method: 'POST', body: data }); if (r.ok) return r; } catch { /* retry */ }
      await new Promise((r) => setTimeout(r, 400));
    }
    throw new Error('stream post failed: ' + path);
  }
  // raw RGBA straight from the drawing buffer (bottom-up; the streamer flips it), read right after rendering
  let pix = null;
  function grab() {
    const gl = renderer.getContext(); const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    if (!pix || pix.length !== w * h * 4) pix = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pix);
    return pix;
  }

  // camera state with pan-follow smoothing (rate-limited yaw, tilt held close to level)
  const cam = { yaw: 0, pitch: 0, init: false };
  function applyCamera(sm, dt) {
    const [x, y] = sm.pos; const [lx, ly, lz] = sm.look;
    const wantYaw = Math.atan2(-(lx - x), ly - y);
    const dist = Math.hypot(lx - x, ly - y);
    const wantPitch = THREE.MathUtils.clamp(Math.atan2(lz - EYE, Math.max(0.5, dist)) * 0.45, -0.24, 0.06);
    if (!cam.init) { cam.yaw = wantYaw; cam.pitch = wantPitch; cam.init = true; }
    const maxRate = THREE.MathUtils.degToRad(38) * dt; // pan-rate cap keeps turns smooth (no whip pans)
    const dy = angDiff(cam.yaw, wantYaw) * (1 - Math.exp(-dt * 4.2));
    cam.yaw += THREE.MathUtils.clamp(dy, -maxRate, maxRate);
    cam.pitch += (wantPitch - cam.pitch) * (1 - Math.exp(-dt * 2.5));
    const p = ctl.player; p.x = x; p.y = y; p.h = EYE; p.yaw = cam.yaw; p.pitch = cam.pitch;
    camera.position.set(x, EYE, -y);
    camera.rotation.order = 'YXZ'; camera.rotation.set(cam.pitch, cam.yaw, 0); // no roll: verticals stay vertical
  }

  function resetDoors() {
    doors.list.forEach((d) => { d.state.t = 0; d.state.target = 0; d.update(0); });
  }
  function simulate(tl, upTo, dt, onFrame) {
    for (let f = 0; f * dt <= upTo; f++) {
      const t = f * dt;
      for (const s of tl.segs) for (const [ct, id] of s.cues) if (ct >= t - dt / 2 && ct < t + dt / 2 && doorById[id]) doorById[id].state.target = 1;
      doors.list.forEach((d) => d.update(dt));
      applyCamera(sample(tl, t), dt);
      if (onFrame) onFrame(f, t);
    }
  }


  // ---------------------------------------------------------------- showcase: live design changes
  const NUMERIC = ['time', 'kelvin', 'brightness', 'exposure'];
  const ROOMN = { hall: 'Living room', dining: 'Dining', kitchen: 'Kitchen', mbed: 'Master bedroom', chbed: "Children's bedroom", office: 'Office', entry: 'Entry', corridor: 'Corridor', washing: 'Utility' };
  const SURFN = Object.fromEntries(SURFACES.map((s) => [s.id, s.name.toLowerCase()]));
  function noteFor(e) {
    if (e.label) return e.label;
    if (e.pal) {
      const p = PALETTES.find((q) => q.id === e.pal);
      const what = e.surf ? e.surf.map((s) => SURFN[s]).join(', ') : 'walls, furnishings and textiles';
      return ['Colour palette', p.name, `${e.scope.map((s) => ROOMN[s] || s).join(', ')} · ${what}`, p];
    }
    if (e.floor) { const f = FLOOR_OPTIONS.find((q) => q.id === e.floor); return ['Flooring', f.name, `${e.rooms.map((r) => ROOMN[r] || r).join(', ')} · ${f.kind}`]; }
    if (e.light && e.light.style) {
      const st = NIGHT_STYLES.find((q) => q.id === e.light.style);
      return ['Night mood', st.name, `${e.light.kelvin ?? st.kelvin} K${Object.keys(st.coves).length ? ' · coloured coves' : ' · white light'}`];
    }
    return ['Lighting', 'Updated', ''];
  }
  async function applyInstant(e) {
    if (e.floor) await design.applyFloor(e.floor, e.rooms);
    if (e.light) lighting.apply({ ...e.light });
    if (e.pal) design.applyPalette(e.pal, e.scope, e.surf || SURFACES.map((s) => s.id));
  }
  async function resetLook(sc) {
    design.reset(); await tick(); await tick();
    lighting.apply(JSON.parse(JSON.stringify(sc.start)));
  }

  // captions: room title (top-left), change note (bottom-left), live lighting status (top-right)
  const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
  const env = (dt, dur, fi = 0.6, fo = 0.6) => (dt < 0 || dt > dur ? 0 : Math.max(0, Math.min(1, dt / fi, (dur - dt) / fo)));
  function drawOverlay(g, W, H, t, tl) {
    const titles = tl.segs.filter((s) => s.title && s.t0 <= t);
    const ti = titles[titles.length - 1];
    const ta = ti ? env(t - ti.t0, 5.5, 0.8, 0.8) : 0;
    const notes = tl.notes; let ni = -1;
    for (let i = 0; i < notes.length; i++) if (notes[i].t0 <= t) ni = i;
    const no = ni >= 0 ? notes[ni] : null;
    const fin = tl.total - 6.2; // captions bow out for the closing card
    const na = no && t < fin ? env(t - no.t0, Math.min(no.dur, fin - no.t0), 0.45, 0.45) : 0;
    g.save();
    if (na > 0) { // soft lower band for legibility
      const gr = g.createLinearGradient(0, H - 260, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${0.42 * na})`);
      g.fillStyle = gr; g.fillRect(0, H - 260, W, 260);
    }
    if (ta > 0) {
      const gr = g.createLinearGradient(0, 0, 0, 240); gr.addColorStop(0, `rgba(0,0,0,${0.3 * ta})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, 240);
    }
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 16; g.textBaseline = 'alphabetic';
    if (ta > 0) {
      g.globalAlpha = ta; g.fillStyle = '#ffffff';
      g.font = `300 46px ${FONT}`; g.letterSpacing = '9px'; g.fillText(ti.title.toUpperCase(), 88, 122);
      g.fillStyle = '#e3c79a'; g.fillRect(90, 142, 60 * ta, 2);
      g.fillStyle = 'rgba(255,255,255,0.88)'; g.font = `400 21px ${FONT}`; g.letterSpacing = '2px'; g.fillText(ti.sub || '', 90, 180);
    }
    if (na > 0) {
      const [kick, title, detail, pal] = no.note; const rise = (1 - na) * 14;
      g.globalAlpha = na;
      g.fillStyle = '#e3c79a'; g.font = `600 18px ${FONT}`; g.letterSpacing = '5px'; g.fillText(kick.toUpperCase(), 90, H - 150 + rise);
      g.fillStyle = '#ffffff'; g.font = `300 50px ${FONT}`; g.letterSpacing = '1px'; g.fillText(title, 88, H - 92 + rise);
      const tw = g.measureText(title).width;
      g.fillStyle = 'rgba(255,255,255,0.82)'; g.font = `400 21px ${FONT}`; g.letterSpacing = '1px'; g.fillText(detail, 90, H - 52 + rise);
      if (pal) {
        g.shadowBlur = 6;
        ['wall', 'accent', 'upholstery', 'soft', 'cabinet'].forEach((k, i) => {
          g.beginPath(); g.arc(88 + tw + 40 + i * 36, H - 108 + rise, 13, 0, Math.PI * 2);
          g.fillStyle = '#' + new THREE.Color(pal[k]).getHexString(); g.fill();
          g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.stroke();
        });
      }
    }
    // live lighting status
    const s = lighting.state; const st = NIGHT_STYLES.find((q) => q.id === s.style) || NIGHT_STYLES[0];
    let txt;
    if (s.mode === 'day') { const h = Math.floor(s.time), m = Math.floor((s.time - h) * 60); txt = `DAY · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${s.dayLights ? ' · LIGHTS ON' : ''}`; }
    else txt = `NIGHT · ${st.name.toUpperCase()} · ${Math.round(s.kelvin / 10) * 10} K${s.brightness < 0.99 ? ` · ${Math.round(s.brightness * 100)}%` : ''}`;
    g.globalAlpha = 0.9; g.shadowBlur = 12; g.textAlign = 'right';
    g.fillStyle = '#ffffff'; g.font = `600 17px ${FONT}`; g.letterSpacing = '4px'; g.fillText(txt, W - 88, 112);
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = `400 14px ${FONT}`; g.letterSpacing = '5px'; g.fillText('DESIGN STUDIO · LIVE', W - 88, 140);
    g.restore();
  }

  api._tl = {};
  const getTl = (name) => api._tl[name] || (api._tl[name] = buildTimeline(name));
  api.timeline = (name = 'walk') => { const tl = getTl(name); resetDoors(); return tl.segs.map((s) => ({ name: s.name, t0: +s.t0.toFixed(1), dur: +s.dur.toFixed(1) })).concat([{ total: +tl.total.toFixed(1) }]); };

  // preview a single moment (camera framing + the design state at that time) without recording
  api.preview = async (timeSec, name = 'walk') => {
    const tl = getTl(name), sc = SCRIPTS[name];
    resetDoors(); cam.init = false;
    if (sc.start) { await resetLook(sc); for (const ev of tl.events) if (ev.t <= timeSec) await applyInstant(ev.e); captureProbe(); }
    simulate(tl, timeSec, 1 / 30);
    renderNow();
    return sample(tl, timeSec).seg.name;
  };

  // sound-design cue sheet: exact event timings plus where each change lands on screen (for stereo panning)
  api.cues = (name = 'showcase', fps = 60) => {
    const tl = getTl(name);
    resetDoors(); cam.init = false;
    const evs = tl.events.map((ev) => ({ t: ev.t, ta: ev.t + (ev.e.noUI ? 0 : LEAD), e: ev.e }));
    const kind = (e) => (e.pal ? 'palette' : e.floor ? 'floor' : e.light.mode ? 'mode' : e.light.style ? 'scene' : e.light.layers ? 'layers' : e.light.dayLights !== undefined ? 'toggle' : 'slider');
    const dur = (e) => (e.pal ? e.dur || 3.4 : e.floor ? e.dur || 3.8 : e.light && e.dur ? e.dur : 2.2);
    const out = evs.map((ev) => ({ t: ev.t, ta: ev.ta, end: ev.ta + dur(ev.e), kind: kind(ev.e), x: 0 }));
    const v = new THREE.Vector3();
    simulate(tl, tl.total, 1 / fps, (f, t) => {
      evs.forEach((ev, i) => { if (ev.e.at && Math.abs(t - ev.ta) < 0.5 / fps) { camera.position.set(ctl.player.x, EYE, -ctl.player.y); camera.updateMatrixWorld(); v.set(ev.e.at[0], ev.e.at[2], -ev.e.at[1]).project(camera); out[i].x = Math.max(-1, Math.min(1, v.x)); } });
    });
    const doorsT = tl.segs.flatMap((s) => s.cues.map(([ct]) => ct));
    const titles = tl.segs.filter((s) => s.title).map((s) => s.t0);
    const moves = tl.segs.filter((s) => s.move).map((s) => [s.t0, s.t1]);
    resetDoors();
    return { total: tl.total, events: out, doors: doorsT, titles, moves };
  };

  api.run = async ({ script = 'walk', fps = 60, width = 1920, height = 1080, time = 15.5, name, snaps = null } = {}) => {
    const sc = SCRIPTS[script];
    name ||= script === 'walk' ? 'walkthrough_1080p60' : `${script}_1080p60`;
    const saved = { design: design.snapshot(), light: JSON.parse(JSON.stringify(lighting.state)) };
    try {
      const tl = getTl(script);
      if (sc.start) await resetLook(sc); else lighting.apply({ mode: 'day', time, dayLights: false });
      resetDoors();
      // a caption for every event, each one ending before the next starts
      const overlay = !!sc.start;
      const fx = overlay ? createFx({ camera, renderer, design, lighting, arch }) : null;
      if (fx) await fx.prepare();
      const applyDur = (e) => (e.pal ? e.dur || 3.4 : e.floor ? e.dur || 3.8 : e.light && e.dur ? e.dur : 2.2);
      const evs = tl.events.map((ev) => ({ ...ev, ta: ev.t + (fx && !ev.e.noUI ? LEAD : 0) }));
      evs.forEach((ev) => { ev.end = ev.ta + applyDur(ev.e); });
      const fireQ = [...evs].sort((a, b) => a.ta - b.ta);
      tl.notes = fireQ.filter((ev) => !ev.e.silent).map((ev) => ({ t0: ev.ta, note: noteFor(ev.e) }));
      tl.notes.forEach((n, i) => { const next = tl.notes[i + 1]; n.dur = Math.min(4.8, next ? next.t0 - n.t0 - 0.05 : 4.8); });
      const N = Math.round(tl.total * fps);
      api.progress = { frame: 0, total: N, done: false, error: null, seconds: tl.total };
      setRecording(true); setSize(width, height);
      ctl.enterExplore({ x: 9.85, y: 7.95, yawDeg: 315 });
      camera.fov = 64; camera.updateProjectionMatrix();
      cam.init = false;
      captureProbe();
      const dt = 1 / fps;
      for (let w = 0; w < 4; w++) { applyCamera(sample(tl, 0), dt); renderNow(); await tick(); }
      const gl = renderer.getContext();
      const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
      api.progress.size = [W, H];
      const comp = document.createElement('canvas'); comp.width = W; comp.height = H; const g = comp.getContext('2d');
      const fadeC = document.createElement('canvas'); fadeC.width = W; fadeC.height = H; const fg = fadeC.getContext('2d');
      let fade = null, probeDue = false, evIdx = 0; const tweens = [];

      // design events: palettes morph colour-by-colour, numeric light values glide, discrete switches dissolve
      async function fire(e, t) {
        const disc = (e.floor && !fx) || (e.light && (!e.dur || Object.keys(e.light).some((k) => !NUMERIC.includes(k))));
        if (e.floor) await design.floorMaterial(e.floor); // generate textures before the cut
        if (disc) { renderNow(); fg.drawImage(renderer.domElement, 0, 0, W, H); fade = { t0: t, dur: e.fade || (fx ? 2.2 : 1.4), at: e.at }; }
        if (e.floor) { if (fx) tweens.push(await fx.floorWave(e, t)); else await design.applyFloor(e.floor, e.rooms); }
        if (e.light) {
          const now = {}, num = {};
          for (const [k, v] of Object.entries(e.light)) (NUMERIC.includes(k) && e.dur ? num : now)[k] = v;
          if (Object.keys(now).length) lighting.apply(now);
          if (Object.keys(num).length) {
            const from = Object.fromEntries(Object.keys(num).map((k) => [k, lighting.state[k]]));
            tweens.push({ t0: t, dur: e.dur, step: (k) => { const p = {}; for (const q in num) p[q] = from[q] + (num[q] - from[q]) * k; lighting.apply(p); } });
          }
        }
        if (e.pal && fx) tweens.push(fx.paletteWave(e, t, () => design.applyPalette(e.pal, e.scope, e.surf || SURFACES.map((s) => s.id))));
        else if (e.pal) {
          const mats = design.tweenables(); const before = mats.map((m) => m.color.clone());
          design.applyPalette(e.pal, e.scope, e.surf || SURFACES.map((s) => s.id));
          const list = [];
          mats.forEach((m, i) => { if (!before[i].equals(m.color)) { list.push([m, before[i], m.color.clone()]); m.color.copy(before[i]); } });
          tweens.push({ t0: t, dur: e.dur || 2.8, step: (k) => { for (const [m, a, b] of list) m.color.lerpColors(a, b, k); } });
        }
        probeDue = true;
      }

      // in-browser hardware H.264 at a high bitrate (intermediate), streamed out in batches
      let pending = [], pendN = 0, encErr = null;
      const enc = snaps ? null : new VideoEncoder({
        output: (chunk) => { const b = new Uint8Array(chunk.byteLength); chunk.copyTo(b); pending.push(b); pendN++; },
        error: (e) => { encErr = e; },
      });
      if (enc) enc.configure({ codec: 'avc1.640033', width: W, height: H, bitrate: 60e6, bitrateMode: 'variable', framerate: fps, latencyMode: 'quality', avc: { format: 'annexb' } });
      const flushOut = async () => {
        if (!pending.length) return;
        const parts = pending, n = pendN; pending = []; pendN = 0;
        await post(`/chunk?n=${n}`, new Blob(parts));
      };
      if (enc) await post('/h264start');
      const snapF = snaps ? new Map(snaps.map(([n, s]) => [Math.round(s * fps), n])) : null;
      for (let f = 0; f < N; f++) {
        const t = f * dt;
        while (evIdx < fireQ.length && fireQ[evIdx].ta <= t + 1e-6) await fire(fireQ[evIdx++].e, t);
        for (const tw of tweens) { const p = Math.min(1, (t - tw.t0) / tw.dur); tw.step(ease(p)); tw.done = p >= 1; }
        const active = tweens.length > 0;
        for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].done) { const [tw] = tweens.splice(i, 1); if (tw.finish) await tw.finish(); probeDue = true; }
        if (probeDue || (active && f % 10 === 0)) { captureProbe(); probeDue = false; }
        for (const s of tl.segs) for (const [ct, id] of s.cues) if (ct >= t - dt / 2 && ct < t + dt / 2 && doorById[id]) doorById[id].state.target = 1;
        doors.list.forEach((d) => d.update(dt));
        ctx.fans.forEach((fan) => { fan.userData.rotor.rotation.y += dt * 1.2; });
        applyCamera(sample(tl, t), dt);
        if (snapF && !snapF.has(f)) { api.progress.frame = f + 1; if (f % 240 === 0) await tick(); continue; }
        const t0 = performance.now(); renderNow();
        g.drawImage(renderer.domElement, 0, 0, W, H);
        if (fade) {
          const p = (t - fade.t0) / fade.dur;
          if (fx) { if (!fx.reveal(g, fadeC, fade, t, W, H)) fade = null; }
          else if (p >= 1) fade = null; else { g.globalAlpha = 1 - ease(Math.max(0, p)); g.drawImage(fadeC, 0, 0); g.globalAlpha = 1; }
        }
        if (overlay) drawOverlay(g, W, H, t, tl);
        if (fx) { fx.drawUI(g, renderer.domElement, W, H, t, evs); fx.drawBookends(g, W, H, t, tl.total, sc.finale); }
        const t1 = performance.now();
        if (snapF) { const b = await new Promise((r) => comp.toBlob(r, 'image/jpeg', 0.86)); await post(`/snap?name=${snapF.get(f)}`, b); continue; }
        const vf = new VideoFrame(comp, { timestamp: Math.round(f * 1e6 / fps), duration: Math.round(1e6 / fps) });
        enc.encode(vf, { keyFrame: f % (fps * 2) === 0 }); vf.close();
        while (enc.encodeQueueSize > 6) await new Promise((r) => enc.addEventListener('dequeue', r, { once: true }));
        const t2 = performance.now();
        if (pending.length >= 60) await flushOut();
        const t3 = performance.now();
        const st = api.progress.ms || (api.progress.ms = [0, 0, 0]); st[0] += t1 - t0; st[1] += t2 - t1; st[2] += t3 - t2;
        api.progress.frame = f + 1;
        if (encErr) throw encErr;
        if (api.abort) { api.abort = false; enc.close(); throw new Error('aborted'); }
        if (f % 30 === 0) await tick();
      }
      if (!enc) { api.progress.done = true; return; }
      await enc.flush(); await flushOut(); enc.close();
      const r = await post(`/h264end?fps=${fps}&name=${name}`); api.progress.result = await r.text();
      api.progress.done = true;
    } catch (e) { api.progress.error = String(e && e.stack || e); }
    finally {
      setRecording(false);
      if (sc.start) { await design.restore(saved.design); lighting.apply(saved.light); captureProbe(); }
    }
  };
  return api;
}
