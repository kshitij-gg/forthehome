import './style.css';
import * as THREE from 'three';
import { detectQuality, saveQuality, capQuality, settingsFor, TIERS, TIER_ORDER } from './render/quality.js';
import { createPipeline } from './render/pipeline.js';
import { patchSceneBoxEnv, setBoxEnv } from './render/boxenv.js';
import { setTextureScale, texStats } from './materials/texPool.js';

import { designConfig as DC } from './data/designConfig.ts';
import { rooms, spawn } from './data/floorplan.ts';
import { runAll, fmtFtIn } from './data/validate.ts';
import { createMaterials } from './materials/materials.js';
import { buildArchitecture, CLIP_H } from './architecture/building.js';
import { buildDoors } from './architecture/doors.js';
import { buildInteriors } from './furniture/layout.js';
import { createLighting, NIGHT_STYLES } from './lighting/lighting.js';
import { createDesign } from './design/design.js';
import { createStudio } from './ui/studio.js';
import { buildMirrors } from './furniture/mirrors.js';
import { createTour } from './ui/tour.js';
import { createViews } from './ui/views.js';
import { createControls } from './controls/controls.js';
import { createUI } from './ui/ui.js';
import { mergeStatic, deriveFromFurniture } from './utils/optimize.js';
import { reachability } from './utils/nav.js';

const ui = createUI();
const tick = () => new Promise((r) => setTimeout(r, 16));

async function boot() {
  // ---------------- 1. validate the plan before anything decorative is built ----------------
  ui.progress(0.05, 'Validating plan dimensions…');
  const validation = runAll();
  console.info('%cDIMENSION VALIDATION ' + (validation.ok ? 'PASS' : 'FAIL'), `font-weight:bold;color:${validation.ok ? '#2e7d32' : '#c62828'}`);
  console.table(validation.rows.map((r) => ({ room: r.name, label: r.label, required: `${r.reqEW.toFixed(4)} × ${r.reqNS.toFixed(4)}`, actual: `${r.actEW.toFixed(4)} × ${r.actNS.toFixed(4)}`, errorMM: `${(r.errEW * 1000).toFixed(1)} / ${(r.errNS * 1000).toFixed(1)}`, result: r.pass ? 'PASS' : 'FAIL' })));
  if (!validation.ok) console.warn('!!! FLOOR-PLAN VALIDATION FAILED — see table above !!!', validation.topo.errors);

  // ---------------- 2. renderer / scene ----------------
  // device quality tier: every expensive feature reads its budget from Q
  const QD = detectQuality(), Q = QD.settings;
  setTextureScale(Q.tex);
  console.info(`%cQUALITY ${QD.tier.toUpperCase()}%c ${QD.reason} · ${QD.gpu}`, 'font-weight:bold;color:#8a6d3b', 'color:inherit');
  // the canvas only ever receives the full-screen output pass, so it needs no MSAA of its own
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, Q.prMax));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = Q.shadowSoft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // static scene: shadows re-render only when the sun, doors or cut-away change
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;
  document.body.prepend(renderer.domElement);
  renderer.domElement.setAttribute('tabindex', '0');
  renderer.domElement.setAttribute('aria-label', '3D residence view');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 6000);

  const T0 = performance.now(), LAPS = []; const lap = (n) => { const ms = Math.round(performance.now() - T0); LAPS.push([n, ms]); console.info(`[boot] ${n}: ${ms} ms`); };
  ui.progress(0.15, 'Generating materials…'); await tick();
  const M = await createMaterials(renderer, Q); lap(`materials (${texStats.generated} generated, ${texStats.cached} from cache)`);

  ui.progress(0.4, 'Building architecture…'); await tick();
  const arch = buildArchitecture(M, { washTex: M.washTex, contextDensity: 0.8 });
  scene.add(arch.root);
  const doors = buildDoors(M);
  scene.add(doors.group); lap('architecture');

  ui.progress(0.55, 'Furnishing rooms…'); await tick();
  const interiors = buildInteriors(M);
  scene.add(interiors.root); lap('interiors');
  scene.add(ui.planLines);

  ui.progress(0.66, 'Applying finishes…'); await tick();
  const design = createDesign(M, arch, interiors.registry, renderer); lap('design');
  const mirrors = buildMirrors(M, interiors.registry, renderer, Q.mirrors);

  ui.progress(0.72, 'Lighting…'); await tick();
  const lighting = createLighting(scene, renderer, M, arch, interiors.root, Q);

  // furniture colliders + overview caps, then merge static geometry
  const derived = deriveFromFurniture(interiors.registry, M.capFurniture, CLIP_H);
  derived.caps.forEach((c) => arch.overviewOnly.add(c));
  interiors.fans.forEach((f) => { f.userData.rotor.userData.dynamic = true; f.userData.rotor.traverse((o) => { o.castShadow = false; }); });
  const mI = mergeStatic(interiors.root);
  const mA = mergeStatic(arch.root, { skip: (o) => o === arch.overviewOnly });
  lap('merge');
  console.info(`merged interiors → ${mI.meshes} meshes, architecture → ${mA.meshes} meshes`);

  const staticColliders = [...arch.colliders, ...derived.colliders];
  const getColliders = () => {
    const out = staticColliders.slice();
    for (const d of doors.list) out.push(...d.colliders());
    return out;
  };

  // ---------------- 3. overview clipping (cut-away at 2.35 m) ----------------
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);
  const exempt = new Set([M.neighbour, M.neighbourBand, M.bark, M.canopy, M.canopy2, M.canopy3, M.ground, M.paving, M.asphalt, M.skyline, M.house, M.houseGlass, M.tin, M.tinDark, M.tank, M.palm, M.palmDry, M.lawn, M.earth]);
  const clipMats = new Set();
  scene.traverse((o) => {
    if (!o.isMesh || !o.material || o.material.isShaderMaterial) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => { if (!exempt.has(m)) clipMats.add(m); });
  });
  clipMats.forEach((m) => { m.clippingPlanes = [clipPlane]; m.clipShadows = true; });

  // ---------------- 4. render pipeline (HDR → AO → bloom → accumulation → filmic output) ----------------
  patchSceneBoxEnv(scene); // parallax-corrected room reflections on every PBR material
  const pipeline = createPipeline({ renderer, scene, camera, Q, sun: lighting.sun, sunTarget: lighting.sunTarget });
  const composer = pipeline.composer, gtao = pipeline.gtao;
  let aoEnabled = true;

  // ---------------- 5. controls + UI ----------------
  const ctl = createControls(camera, renderer.domElement, getColliders);

  // vertical FOV that keeps the horizontal view comfortable in portrait (phones)
  const fovFor = (m) => {
    const v = m === 'explore' ? 70 : 50, a = window.innerWidth / Math.max(1, window.innerHeight);
    if (a >= 1) return v;
    const h = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(v) / 2) * (16 / 9) * 0.62); // ~ horizontal of a 16:9 view, a bit tighter
    return Math.min(100, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(h / 2) / a)));
  };
  const setMode = (m) => {
    ui.setMode(m);
    camera.fov = fovFor(m); camera.updateProjectionMatrix();
    clipPlane.constant = m === 'overview' ? CLIP_H : 1e6;
    arch.overviewOnly.visible = m === 'overview';
    pipeline.shadowsDirty();
    ui.setCross(m === 'explore');
  };
  ctl.on('mode', setMode);
  ctl.on('joystick', (t) => ui.joystick(t));
  let helpShown = false, movedOnce = false;
  ctl.on('moved', () => { if (!movedOnce && helpShown) { movedOnce = true; setTimeout(() => ui.hideHelp(), 3500); } });

  const teleports = {
    1: { x: 9.48, y: 8.55, yawDeg: 180 }, 2: { x: 9.3, y: 7.05, yawDeg: 235 }, 3: { x: 6.55, y: 3.75, yawDeg: 245 },
    4: { x: 2.85, y: 4.75, yawDeg: 225 }, 5: { x: 3.05, y: 8.75, yawDeg: 320 }, 6: { x: 6.85, y: 2.45, yawDeg: 95 },
    7: { x: 11.25, y: 8.95, yawDeg: 40 }, 8: { x: 11.0, y: 7.35, yawDeg: 95 }, 9: { x: 10.35, y: 5.6, yawDeg: 120 },
  };
  const safeSpot = (s) => {
    if (!ctl.blocked(s.x, s.y)) return s;
    for (let r = 0.05; r < 1.2; r += 0.05) for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r;
      if (!ctl.blocked(x, y)) return { ...s, x, y };
    }
    return s;
  };
  const explore = (spot) => {
    ui.setPlan(false);
    ctl.enterExplore(safeSpot(spot || { x: spawn.x, y: spawn.y, yawDeg: spawn.yawDeg }));
    if (!helpShown) {
      helpShown = true;
      ui.showHelp('Spectate · no walls · <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> glide in a straight line at eye height · drag to look · <kbd>Shift</kbd> faster · click doors or <kbd>E</kbd> · <kbd>N</kbd> day/night · <kbd>C</kbd> design · <kbd>P</kbd> plan', 12000);
    }
  };
  ui.bExplore.addEventListener('click', () => explore(ctl.mode === 'explore' ? null : undefined));
  ui.bOverview.addEventListener('click', () => { ui.setPlan(false); ctl.enterOverview(false); });

  // ---- lighting + design state (restored from the last visit when available) ----
  const capture = (key) => {
    const c0 = clipPlane.constant; clipPlane.constant = 1e6;
    lighting.captureProbe([arch.overviewOnly, ui.planLines], typeof key === 'string' ? key : null);
    clipPlane.constant = c0;
    pipeline.invalidate();
  };
  // reflection zones: each gets its own probe (captured at its centre) and its own projection box
  const ZONES = [
    { id: 'living', rooms: ['hall', 'dining', 'kitchen'], probe: [6.9, 4.6] },
    { id: 'entry', rooms: ['foyer', 'passage', 'deoghar', 'shrine'], probe: [10.9, 7.25] },
    { id: 'mbed', rooms: ['mbed'] }, { id: 'chbed', rooms: ['chbed'] }, { id: 'office', rooms: ['office'] }, { id: 'chrm', rooms: ['chrm'] },
    { id: 'corridor', rooms: ['corridor'] }, { id: 'washing', rooms: ['washing'] },
    { id: 'mtoilet', rooms: ['mtoilet'] }, { id: 'ctoilet', rooms: ['ctoilet'] }, { id: 'chtoilet', rooms: ['chtoilet'] },
  ].map((z) => {
    const rs = rooms.filter((r) => z.rooms.includes(r.id));
    const x0 = Math.min(...rs.map((r) => r.rect[0])), y0 = Math.min(...rs.map((r) => r.rect[1])), x1 = Math.max(...rs.map((r) => r.rect[2])), y1 = Math.max(...rs.map((r) => r.rect[3]));
    const top = Math.max(...rs.map((r) => r.ceiling || DC.wallHeight));
    const pr = z.probe || [(x0 + x1) / 2, (y0 + y1) / 2];
    return { ...z, min: new THREE.Vector3(x0, -0.05, -y1), max: new THREE.Vector3(x1, top, -y0), pos: new THREE.Vector3(pr[0], 1.42, -pr[1]) };
  });
  // balconies keep the reflections of the room they open from (no probe swap at the threshold)
  const BALCONY_OF = { hallbal: 'living', mbedbal: 'mbed', officebal: 'office' };
  const zoneOfRoom = (id) => ZONES.find((z) => z.rooms.includes(id) || BALCONY_OF[id] === z.id) || null;
  // how far (m) a plan point is inside a zone's rooms — used as hysteresis so probes never flip-flop at a doorway
  const insideBy = (z, x, y) => Math.max(...rooms.filter((r) => z.rooms.includes(r.id) || BALCONY_OF[r.id] === z.id).map((r) => Math.min(x - r.rect[0], r.rect[2] - x, y - r.rect[1], r.rect[3] - y)));
  const OVERVIEW_PROBE = new THREE.Vector3(6.9, 1.45, -5.8);
  let activeZone = undefined, designVer = 0, liveProbes = true;
  const probeKey = () => `live:${activeZone ? activeZone.id : 'overview'}|${designVer}|${JSON.stringify(lighting.state)}`;
  const applyZone = (z) => {
    activeZone = z;
    if (z) { setBoxEnv(z.box !== false, z.min, z.max, z.pos); lighting.probeCam.position.copy(z.pos); }
    else { setBoxEnv(false); lighting.probeCam.position.copy(OVERVIEW_PROBE); }
    capture(probeKey());
  };
  let probeTimer = 0;
  const scheduleProbe = () => { clearTimeout(probeTimer); probeTimer = setTimeout(() => { if (liveProbes) capture(probeKey()); else capture(); }, 250); };
  const saveLight = () => { try { localStorage.setItem('residence-light-v1', JSON.stringify(lighting.state)); } catch { /* ignore */ } };
  try { const s = JSON.parse(localStorage.getItem('residence-light-v1') || 'null'); if (s && s.mode) Object.assign(lighting.state, s, { layers: { ...lighting.state.layers, ...s.layers } }); } catch { /* ignore */ }
  await design.load();
  lighting.apply({});
  ui.progress(0.9, 'Compiling shaders…');
  try { await renderer.compileAsync(scene, camera); } catch { /* optional */ }
  lap('shaders');
  const studio = createStudio(ui, {
    lighting, design,
    onChange: (what) => {
      if (what === 'design') { design.save(); designVer++; patchSceneBoxEnv(scene); scheduleProbe(); }
      if (what === 'lighting' || what === 'lighting-heavy') { saveLight(); pipeline.shadowsDirty(); if (what === 'lighting-heavy') scheduleProbe(); }
      pipeline.invalidate();
    },
  });
  const tour = createTour(ui, { ctl, doors, rooms, explore: (s) => explore(s), safeSpot: (s) => safeSpot(s) });
  const views = createViews(ui, { ctl, camera, explore: (s) => explore(s) });
  const applyScene = (patch) => { lighting.apply(patch); studio.syncLight(); saveLight(); pipeline.shadowsDirty(); scheduleProbe(); };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'KeyL') {
      const i = (NIGHT_STYLES.findIndex((s) => s.id === lighting.state.style) + 1) % NIGHT_STYLES.length;
      const s = NIGHT_STYLES[i]; applyScene({ mode: 'night', style: s.id, kelvin: s.kelvin }); ui.showScene(s.name);
    }
    if (e.code === 'KeyN') { const m = lighting.state.mode === 'day' ? 'night' : 'day'; applyScene({ mode: m }); ui.showScene(m === 'day' ? 'Day' : 'Night'); }
    if (e.code === 'KeyC') studio.open(!studio.isOpen());
    if (e.code === 'KeyP') {
      const on = !ui.plan;
      if (on) { ctl.enterOverview(true); } else { ctl.enterOverview(false); }
      ui.setPlan(on);
      pipeline.invalidate();
    }
    if (e.code === 'KeyE') toggleNearestDoor();
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9 && teleports[n]) {
      if (ctl.mode === 'explore') { const s = safeSpot(teleports[n]); Object.assign(ctl.player, { x: s.x, y: s.y, yaw: -THREE.MathUtils.degToRad(s.yawDeg), pitch: -0.04 }); }
      else { const s = teleports[n]; ctl.focusRoom(s.x, s.y); }
      const rm = rooms.find((r) => r.teleportKey === n); if (rm) ui.showRoom(rm.name, rm.label);
    }
  });
  // click / tap on a door (cursor position, or crosshair while the pointer is captured)
  const ray = new THREE.Raycaster(); ray.far = 3.5;
  const doorOf = (obj) => { for (let o = obj; o; o = o.parent) { const d = doors.list.find((q) => q.root === o); if (d) return d; } return null; };
  ctl.on('click', (pt) => {
    const ndc = pt ? new THREE.Vector2((pt.x / window.innerWidth) * 2 - 1, -(pt.y / window.innerHeight) * 2 + 1) : new THREE.Vector2(0, 0);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([doors.group, arch.root, interiors.root], true)[0];
    const d = hit && doorOf(hit.object);
    if (d) { d.toggle(); ui.showRoom(d.label, d.state.target > 0.5 ? 'opening' : 'closing'); return true; }
    return false;
  });
  function nearestDoor() {
    const fwd = ctl.planForward(); let best = null, bd = 1e9;
    for (const d of doors.list) {
      const dx = d.center.x - ctl.player.x, dy = -d.center.z - ctl.player.y; const dist = Math.hypot(dx, dy);
      if (dist > 1.9) continue;
      const facing = (dx * fwd.x + dy * fwd.y) / (dist || 1);
      if (facing < 0.25) continue;
      if (dist - facing < bd) { bd = dist - facing; best = d; }
    }
    return best;
  }
  function toggleNearestDoor() {
    let best = null, bd = 1e9;
    const p = ctl.mode === 'explore' ? { x: ctl.player.x, y: ctl.player.y } : { x: ctl.orbit.target.x, y: -ctl.orbit.target.z };
    const fwd = ctl.planForward();
    for (const d of doors.list) {
      const dx = d.center.x - p.x, dy = -d.center.z - p.y; const dist = Math.hypot(dx, dy);
      const facing = ctl.mode === 'explore' ? (dx * fwd.x + dy * fwd.y) / (dist || 1) : 1;
      const score = dist - facing * 0.8;
      if (dist < (ctl.mode === 'explore' ? 2.4 : 4) && score < bd) { bd = score; best = d; }
    }
    if (best) { best.toggle(); ui.showRoom(best.label, best.state.target > 0.5 ? 'opening' : 'closing'); }
  }

  // double-click the floor in Overview to step straight into that spot
  renderer.domElement.addEventListener('dblclick', (e) => {
    if (ctl.mode !== 'overview') return;
    const ndc = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    ray.far = 200; ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(arch.floorMeshes, false)[0]; ray.far = 3.5;
    if (!hit) return;
    const yaw = Math.atan2(hit.point.x - camera.position.x, -(hit.point.z - camera.position.z));
    explore({ x: hit.point.x, y: -hit.point.z, yawDeg: THREE.MathUtils.radToDeg(yaw) });
  });

  // ---------------- 6. room detection ----------------
  const labelled = rooms.filter((r) => r.enterable);
  let currentRoom = null;
  function roomAt(x, y) {
    let best = null, ba = 1e9;
    const prio = (r) => (r.open ? (r.id === 'kitchen' || r.id === 'passage' || r.id === 'officebal' ? 1 : 2) : 0);
    for (const r of labelled) {
      if (best && prio(r) > prio(best)) continue;
      if (x >= r.rect[0] && x <= r.rect[2] && y >= r.rect[1] && y <= r.rect[3]) { const a = (r.rect[2] - r.rect[0]) * (r.rect[3] - r.rect[1]); if (a < ba || (best && prio(r) < prio(best))) { ba = a; best = r; } }
    }
    return best;
  }

  // ---------------- 7. resize ----------------
  let lastW = 0, lastH = 0, recording = false;
  const fitViewport = () => {
    const w = window.innerWidth, h = window.innerHeight;
    if (recording || w < 2 || h < 2 || (w === lastW && h === lastH)) return; // ignore hidden/minimised states and offline recording
    lastW = w; lastH = h;
    camera.aspect = w / h; camera.fov = fovFor(ctl.mode); camera.updateProjectionMatrix();
    pipeline.setSize(w, h);
  };
  window.addEventListener('resize', fitViewport);
  fitViewport();

  // ---------------- 8. QA hooks ----------------
  // navigation BFS (QA proof that every room is reachable) runs after first paint, off the critical path
  let nav = null;
  const runNav = () => {
    const saved = doors.list.map((d) => d.state.t);
    doors.list.forEach((d) => { d.state.t = 1; });
    nav = reachability((x, y) => ctl.blocked(x, y), { x: spawn.x, y: spawn.y });
    doors.list.forEach((d, i) => { d.state.t = saved[i]; });
    window.__qa.nav = nav;
    console.info('Navigation BFS from entrance:', nav.rooms.map((r) => `${r.name}:${r.reachable ? 'OK' : 'UNREACHABLE'}(${Math.round(r.coverage * 100)}%)`).join('  '));
    return nav;
  };
  setTimeout(runNav, 2500);
  window.__qa = {
    THREE, validation, nav, runNav, tour, views, mirrors, composer, gtao, pipeline, quality: QD, texStats, renderer, scene, camera, ctl, doors, lighting, design, studio, M, arch,
    captureNow: () => capture(liveProbes ? probeKey() : undefined),
    applyTier: (...a) => applyTier(...a),
    frame: () => loop(), // step one live frame by hand (QA in a hidden tab, where rAF is paused)
    setLight: (patch) => applyScene(patch),
    teleport: (n) => { const s = safeSpot(teleports[n]); ctl.enterExplore(s); },
    lookAt: (x, y, h, tx, ty, th) => { ctl.enterOverview(false); camera.position.set(x, h, -y); ctl.orbit.target.set(tx, th, -ty); ctl.orbit.update(); },
    view: (x, y, yawDeg, pitch = -0.05) => { ctl.enterExplore({ x, y, yawDeg }); ctl.player.x = x; ctl.player.y = y; ctl.player.pitch = pitch; },
    setAO: (on) => { aoEnabled = on; if (gtao) gtao.enabled = on; pipeline.invalidate(); },
    stats: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures, colliders: getColliders().length, fps: pipeline.fps, pixelRatio: pipeline.pixelRatio, samples: pipeline.samples, tier: QD.tier, lights: lighting.poolSize }),
    colliders: getColliders,
  };

  // ---------------- offline walkthrough recorder (1080p frames → local receiver → ffmpeg) ----------------
  const recCtx = {
    renderer, camera, ctl, doors, tour, lighting, design, arch, captureProbe: capture, fans: interiors.fans,
    renderNow: () => { preRender(1); mirrors.update(camera, true); pipeline.renderDirect(1 / 30); },
    // yield without timers: MessageChannel is not throttled when the page is in the background
    tick: (() => { const ch = new MessageChannel(); const q = []; ch.port1.onmessage = () => q.shift()?.(); return () => new Promise((r) => { q.push(r); ch.port2.postMessage(0); }); })(),
    setRecording: (on) => {
      recording = on; document.body.classList.toggle('recording', on);
      renderer.setAnimationLoop(on ? null : loop);
      renderer.shadowMap.autoUpdate = on; renderer.shadowMap.needsUpdate = true;
      liveProbes = !on; activeZone = undefined;
      pipeline.setAutoExposure(!on); // offline renders keep a fixed, deterministic exposure
      if (on) { setBoxEnv(false); lighting.probeCam.position.copy(OVERVIEW_PROBE); }
      if (!on) { pipeline.fixPixelRatio(null); lastW = 0; fitViewport(); }
    },
    setCutaway: (on) => { clipPlane.constant = on ? CLIP_H : 1e6; arch.overviewOnly.visible = on; },
    setSize: (w, h) => {
      pipeline.fixPixelRatio(1); pipeline.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    },
  };
  // Offline recorder + video edits: studio tools, loaded on demand in development only. The public web
  // build (vite --mode web) drops them entirely, so visitors never download or initialise them.
  if (import.meta.env.DEV) {
    const loadTools = async () => {
      const [{ createRecorder }, { createEdit }, { createEdit60 }, { createEdit120 }, { createEditPop }] = await Promise.all([
        import('./record.js'), import('./edit.js'), import('./edit60.js'), import('./edit120.js'), import('./editpop.js')]);
      window.__rec = createRecorder(recCtx);
      window.__edit = createEdit(recCtx); // 30 s motion-graphics showcase edit
      window.__edit60 = createEdit60(recCtx); // 60 s showcase edit
      window.__edit120 = createEdit120(recCtx); // 120 s showcase edit (styles, light scenes, mandir)
      window.__editPop = createEditPop(recCtx); // 60 s pop-art edit
    };
    window.__loadTools = loadTools;
    const q = new URLSearchParams(location.search);
    loadTools().then(() => {
      // ?autorender=120[&from=&to=&port=] starts the offline render on load (used from a standalone browser window)
      if (q.get('autorender') === '120') {
        const from = +(q.get('from') || 0), to = +(q.get('to') || 120), port = q.get('port') || '5303';
        setTimeout(() => window.__edit120.run({ raw: false, from, to, srv: `http://localhost:${port}`, name: q.get('name') || 'motion_edit_120s_video' }), 8000);
      }
    });
  }

  // ---------------- 9. loop ----------------
  setMode('overview');
  ctl.enterOverview(false);
  const clock = new THREE.Clock();
  let lowFor = 0, stepped = false;
  const focus = new THREE.Vector3();
  // auto-exposure: scene log-average that needs no correction, and how strongly to correct (night keeps its mood)
  const AE_KEY = { day: 0.24, night: 0.25 }, AE_STRENGTH = { day: 0.75, night: 0.4 };
  // per-frame, before any render (live loop and offline recorder): light pool + reflection zone
  function preRender(dt) {
    if (ctl.mode === 'explore') focus.copy(camera.position); else focus.copy(ctl.orbit.target);
    lighting.updatePool(focus, dt);
    { const m = lighting.state.mode === 'day' ? 'day' : 'night'; pipeline.setAutoExposure(!recording, AE_KEY[m], AE_STRENGTH[m]); }
    if (liveProbes) {
      let z = null;
      if (ctl.mode === 'explore') {
        const cand = zoneOfRoom(roomAt(ctl.player.x, ctl.player.y)?.id);
        z = activeZone || cand || null;
        if (cand && cand !== activeZone && (!activeZone || insideBy(cand, ctl.player.x, ctl.player.y) > 0.3)) z = cand;
      }
      if (z !== activeZone) applyZone(z);
    }
  }
  lap('ready'); ui.ready();
  setTimeout(() => applyZone(null), 60); // room reflection probe refines the image right after first paint
  let lastLoop = 0;
  let paused = false; // true while a quality change compiles its shaders (the last frame stays on screen)
  const loop = (now = performance.now()) => {
    if (paused) { clock.getDelta(); return; }
    if (Q.maxFps && now - lastLoop < 1000 / Q.maxFps - 2) return; // phones: 30 fps cap saves battery and heat
    lastLoop = now;
    const dt = Math.min(0.05, clock.getDelta());
    fitViewport(); // self-heal if a resize event was missed while hidden
    ctl.update(dt);
    let animating = false;
    doors.list.forEach((d) => { if (d.state.t !== d.state.target) animating = true; d.update(dt); });
    if (animating) pipeline.shadowsDirty();
    interiors.fans.forEach((f) => { f.userData.rotor.rotation.y += dt * 1.2; });
    mirrors.update(camera, ctl.mode === 'explore');
    tour.update(dt);
    if (ctl.mode === 'explore') {
      const r = roomAt(ctl.player.x, ctl.player.y);
      if (r && r !== currentRoom) { currentRoom = r; ui.showRoom(r.name, r.label || ''); }
      const nd = nearestDoor();
      ui.prompt(nd ? `<kbd>E</kbd> or click · ${nd.state.target > 0.5 ? 'close' : 'open'} ${nd.label.toLowerCase()}` : '');
    } else { currentRoom = null; ui.prompt(''); }
    ui.updatePlan(camera);
    preRender(dt);
    const drew = pipeline.render(dt);
    const moving = drew && pipeline.samples === 0;
    pipeline.adapt(dt, moving);
    // watchdog for weak devices: already at the lowest resolution and still below ~28 fps while moving →
    // drop AO, then bloom, then lower the resolution floor and remember a lower Auto tier for the next visit
    if (moving && pipeline.pixelRatio <= Q.prMin + 0.01 && pipeline.fps < 28) {
      if (++lowFor > 180) {
        lowFor = 0;
        if (gtao && gtao.enabled) { gtao.enabled = false; console.info('AO disabled for performance'); }
        else if (pipeline.bloom && pipeline.bloom.enabled) { pipeline.bloom.enabled = false; console.info('Bloom disabled for performance'); }
        else if (Q.prMin > 0.46) {
          Q.prMin = Math.max(0.45, Q.prMin - 0.1);
          const i = TIER_ORDER.indexOf(QD.tier);
          if (QD.auto && i > 0 && !stepped) { stepped = true; capQuality(TIER_ORDER[i - 1]); ui.showScene('Quality lowered for smoother motion'); }
        }
      }
    } else lowFor = 0;
    if (statusEl && (frameN++ % 15 === 0)) statusEl.textContent = `${TIERS[QD.tier].label} · ${pipeline.pixelRatio.toFixed(2)}× · ${Math.round(pipeline.fps)} fps · ${pipeline.converged ? 'refined' : pipeline.samples ? `refining ${pipeline.samples}/${Q.accum}` : 'live'} · ${lighting.poolSize.points + lighting.poolSize.spots}/${lighting.poolSize.total} lights`;
  };
  // ---- phones play in landscape (16:9): portrait shows a rotate prompt; the button goes fullscreen + locks landscape ----
  if (matchMedia('(pointer: coarse)').matches) {
    const rot = document.createElement('div'); rot.className = 'rotate'; rot.setAttribute('role', 'dialog'); rot.setAttribute('aria-label', 'Rotate your phone');
    rot.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="20" y="6" width="24" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="44" r="2" fill="currentColor"/></svg>
      <b>ROTATE YOUR PHONE</b><small>The residence is designed for a wide 16:9 view. Turn your phone sideways to explore.</small><button type="button">PLAY IN LANDSCAPE</button>`;
    rot.querySelector('button').addEventListener('click', async () => {
      try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch { /* not allowed */ }
      try { await screen.orientation?.lock?.('landscape'); } catch { /* iOS / desktop: rotate by hand */ }
    });
    document.body.append(rot);
  }

  // ---- render quality: opens on Low (fast start); raise or lower it live, no reload ----
  let statusEl = null, frameN = 0, tierBusy = false;
  const DESC = { low: 'Fastest start · best battery', medium: 'Ambient occlusion + bloom', high: 'Anti-aliasing, soft shadows, sharper textures', ultra: 'Everything on, sharpest image' };
  const qchip = document.createElement('div'); qchip.className = 'qchip';
  qchip.innerHTML = `<button type="button" class="qbtn" aria-haspopup="true" aria-expanded="false" aria-label="Render quality"><span>QUALITY</span><b></b><i></i></button>
    <div class="qpop" role="menu">${TIER_ORDER.map((k) => `<button type="button" role="menuitem" data-q="${k}"><b>${TIERS[k].label}</b><small>${DESC[k]}</small><em></em></button>`).join('')}<small class="qstat" aria-live="off"></small></div>`;
  document.body.append(qchip);
  statusEl = qchip.querySelector('.qstat');
  const qb = qchip.querySelector('.qbtn'), qLabel = qb.querySelector('b'), qTag = qb.querySelector('i');
  const syncChip = (busy) => {
    qLabel.textContent = busy || TIERS[QD.tier].label.toUpperCase();
    qchip.querySelectorAll('.qpop button').forEach((b) => { b.classList.toggle('on', b.dataset.q === QD.tier); b.querySelector('em').textContent = b.dataset.q === QD.recommended ? 'Recommended for this device' : ''; });
    const up = TIER_ORDER.indexOf(QD.recommended) > TIER_ORDER.indexOf(QD.tier);
    qchip.classList.toggle('hint', up && !busy);
    qTag.textContent = up && !busy ? '▲ RAISE' : '';
  };
  const openQ = (on) => { qchip.classList.toggle('open', on); qb.setAttribute('aria-expanded', String(on)); };
  qb.addEventListener('click', (e) => { e.stopPropagation(); openQ(!qchip.classList.contains('open')); });
  document.addEventListener('click', (e) => { if (!qchip.contains(e.target)) openQ(false); });
  async function applyTier(name, { save = true } = {}) {
    if (tierBusy || !TIERS[name]) return; if (name === QD.tier && !tierBusy) { openQ(false); return; }
    tierBusy = true; openQ(false); syncChip('APPLYING…');
    const t0 = performance.now();
    Object.assign(Q, settingsFor(name, QD.mobile)); QD.tier = name; QD.auto = false;
    if (save) saveQuality(name);
    // instant: shadow + probe sizes, planar mirrors, AO / bloom / MSAA / resolution cap
    lighting.setShadowSize(Q.shadow); lighting.setProbeSize(Q.probe); lighting.clearProbeCache?.(); mirrors.configure(Q.mirrors);
    pipeline.apply(); pipeline.shadowsDirty();
    // pre-warm the newly enabled passes (AO / bloom shaders) while the last frame stays on screen
    paused = true; await new Promise((r) => setTimeout(r, 30));
    try { pipeline.renderDirect(1 / 60); } catch { /* ignore */ }
    paused = false; clock.getDelta();
    capture(liveProbes ? probeKey() : undefined);
    ui.showScene(`${TIERS[name].label} quality · ${((performance.now() - t0) / 1000).toFixed(1)} s`);
    tierBusy = false; syncChip();
    // texture detail follows in the background (cached sets swap in within a second or two)
    M.upgradeTextures(Q.tex, Q.aniso, (p) => { if (p < 1) qLabel.textContent = `${TIERS[QD.tier].label.toUpperCase()} · TEXTURES ${Math.round(p * 100)}%`; else syncChip(); }).catch(() => syncChip());
  }
  setTimeout(() => pipeline.warm().then((n) => console.info(`[boot] pre-compiled ${n} AO/bloom shaders in the background`)), 2500);
  qchip.querySelector('.qpop').addEventListener('click', (e) => { const b = e.target.closest('button[data-q]'); if (b) applyTier(b.dataset.q); });
  syncChip();
  renderer.setAnimationLoop(loop);
  // ?bench=<port>: scripted performance probe (boot laps, moving-camera frame times, time to a refined still)
  {
    const port = new URLSearchParams(location.search).get('bench');
    if (port) setTimeout(async () => {
      explore({ x: 9.1, y: 6.35, yawDeg: 240 });
      const ft = []; let last = performance.now(); const t0 = last;
      await new Promise((done) => { const spin = () => { const now = performance.now(); ft.push(now - last); last = now; ctl.player.yaw += 0.01; if (now - t0 < 8000) requestAnimationFrame(spin); else done(); }; requestAnimationFrame(spin); });
      const s0 = performance.now(); while (!pipeline.converged && performance.now() - s0 < 20000) await new Promise((r) => setTimeout(r, 50));
      const sorted = ft.slice(20).sort((a, b) => a - b), avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const rep = { tier: QD.tier, gpu: QD.gpu, laps: LAPS, tex: texStats, moving: { avgMs: +avg.toFixed(2), p95Ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2), fps: +(1000 / avg).toFixed(1), pixelRatio: pipeline.pixelRatio }, refineMs: Math.round(performance.now() - s0), samples: pipeline.samples, lights: lighting.poolSize, viewport: [innerWidth, innerHeight, devicePixelRatio] };
      fetch(`http://localhost:${port}/snap?name=bench_${QD.tier}`, { method: 'POST', body: JSON.stringify(rep, null, 1) }).catch(() => {});
    }, 2500);
  }
  void fmtFtIn; void aoEnabled;
}

boot().catch((e) => { console.error(e); ui.progress(1, 'Error: ' + e.message); });
