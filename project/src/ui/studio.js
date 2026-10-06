// Design Studio: day/night, lighting layers & controls, colour palettes (whole home / room / surface),
// floor finishes, undo/reset. Changes preview live in the 3D view.
import { PALETTES, SURFACES, SCOPES, FLOOR_OPTIONS, FLOOR_SCOPES, HOUSE_STYLES } from '../design/design.js';
import { NIGHT_STYLES, LIGHT_SCENES } from '../lighting/lighting.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export function createStudio(ui, { lighting, design, onChange }) {
  const st = {};
  // ---------------- nav additions: day/night + design ----------------
  const sep = el('span', 'navsep');
  const bMode = el('button', 'modebtn', '');
  bMode.setAttribute('aria-label', 'Switch between day and night');
  const bDesign = el('button', '', 'DESIGN');
  bDesign.setAttribute('aria-label', 'Open the design studio: lighting, colours and floors');
  ui.bar.append(sep, bMode, bDesign);
  const sun = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><g stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></g></svg>';
  const moon = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M20.3 14.6A8.5 8.5 0 0 1 9.4 3.7a8.5 8.5 0 1 0 10.9 10.9z"/></svg>';
  const syncModeBtn = () => { const day = lighting.state.mode === 'day'; bMode.innerHTML = `${day ? sun : moon}<span>${day ? 'DAY' : 'NIGHT'}</span>`; };

  // ---------------- panel ----------------
  const panel = el('aside', 'studio');
  panel.setAttribute('aria-label', 'Design studio');
  panel.innerHTML = `
    <header><div><b>Design Studio</b><small>Changes preview live</small></div><button class="x" aria-label="Close design studio">✕</button></header>
    <nav class="tabs" role="tablist">
      <button role="tab" data-tab="style" class="on">Style</button>
      <button role="tab" data-tab="light">Lighting</button>
      <button role="tab" data-tab="colour">Colours</button>
      <button role="tab" data-tab="floor">Floors</button>
    </nav>
    <section data-pane="style" class="on"></section>
    <section data-pane="light"></section>
    <section data-pane="colour"></section>
    <section data-pane="floor"></section>`;
  document.body.append(panel);
  const pane = (id) => panel.querySelector(`[data-pane="${id}"]`);
  panel.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
    panel.querySelectorAll('.tabs button').forEach((q) => q.classList.toggle('on', q === b));
    panel.querySelectorAll('section').forEach((s) => s.classList.toggle('on', s.dataset.pane === b.dataset.tab));
  }));
  const open = (on) => { panel.classList.toggle('open', on); bDesign.classList.toggle('active', on); if (on && document.pointerLockElement) document.exitPointerLock(); };
  st.open = open; st.isOpen = () => panel.classList.contains('open');
  bDesign.addEventListener('click', () => open(!st.isOpen()));
  panel.querySelector('.x').addEventListener('click', () => open(false));
  // keep keyboard input inside the panel from driving the camera
  panel.addEventListener('keydown', (e) => e.stopPropagation());

  const changed = (what) => onChange?.(what);

  // ================= LIGHTING =================
  const L = pane('light');
  L.innerHTML = `
    <div class="grp"><label>Scenes</label><div class="chips" id="scenes"></div></div>
    <div class="seg" role="group" aria-label="Lighting mode"><button data-mode="day">${sun} Day</button><button data-mode="night">${moon} Night</button></div>
    <div class="grp day-only"><label>Time of day <output id="tod"></output></label><input type="range" id="time" min="7" max="18.5" step="0.25"><div class="chk"><label><input type="checkbox" id="daylights"> Interior lights on</label></div></div>
    <div class="grp night-only"><label>Lighting mood</label><div class="chips" id="styles"></div></div>
    <div class="grp"><label>Layers</label>
      <div class="toggles">
        <label class="tg"><input type="checkbox" data-layer="profiles"><span></span>Ceiling profile lights</label>
        <label class="tg"><input type="checkbox" data-layer="spots"><span></span>Spotlights</label>
        <label class="tg"><input type="checkbox" data-layer="coves"><span></span>Cove lighting</label>
        <label class="tg"><input type="checkbox" data-layer="downlights"><span></span>Downlights</label>
      </div></div>
    <div class="grp"><label>Cove &amp; accent colour <output id="ccv"></output></label>
      <div class="wheelrow"><canvas id="wheel" width="176" height="176" aria-label="Colour wheel for cove lighting"></canvas>
        <div class="wheelside"><div class="swatches" id="cswatch"></div><button class="ghost" id="cauto">Auto (from mood)</button></div></div></div>
    <div class="grp"><label>Brightness <output id="brv"></output></label><input type="range" id="bright" min="0.1" max="1.6" step="0.05"></div>
    <div class="grp"><label>Colour temperature <output id="ktv"></output></label><input type="range" id="kel" class="kelvin" min="2200" max="5000" step="100"></div>
    <div class="grp"><label>Exposure <output id="exv"></output></label><input type="range" id="exp" min="-1" max="1" step="0.05"></div>
    <button class="ghost" id="lreset">Reset lighting</button>`;
  const styles = L.querySelector('#styles');
  for (const s of NIGHT_STYLES) { const b = el('button', 'chip', s.name); b.dataset.style = s.id; styles.append(b); }
  const ls = () => lighting.state;
  const syncLight = () => {
    const s = ls();
    L.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === s.mode));
    L.classList.toggle('is-day', s.mode === 'day'); L.classList.toggle('is-night', s.mode === 'night');
    L.querySelector('#time').value = s.time; L.querySelector('#tod').textContent = lighting.formatTime(s.time);
    L.querySelector('#daylights').checked = s.dayLights;
    styles.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.style === s.style));
    L.querySelectorAll('[data-layer]').forEach((c) => { c.checked = !!s.layers[c.dataset.layer]; });
    L.querySelector('#bright').value = s.brightness; L.querySelector('#brv').textContent = Math.round(s.brightness * 100) + '%';
    L.querySelector('#kel').value = s.kelvin; L.querySelector('#ktv').textContent = s.kelvin + ' K';
    L.querySelector('#exp').value = s.exposure; L.querySelector('#exv').textContent = (s.exposure > 0 ? '+' : '') + s.exposure.toFixed(2) + ' EV';
    L.querySelector('#ccv').textContent = s.coveColor == null ? 'Auto' : hex(s.coveColor).toUpperCase();
    if (typeof drawWheel === 'function') drawWheel();
    syncModeBtn();
  };
  const setLight = (patch, heavy = false) => { lighting.apply(patch); syncLight(); changed(heavy ? 'lighting-heavy' : 'lighting'); };
  // ---- scenes ----
  const scenesEl = L.querySelector('#scenes');
  for (const s of LIGHT_SCENES) { const b = el('button', 'chip', s.name); b.dataset.scene = s.id; scenesEl.append(b); }
  scenesEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const s = LIGHT_SCENES.find((q) => q.id === b.dataset.scene); setLight(JSON.parse(JSON.stringify(s.patch)), true); st.scene = s.id; scenesEl.querySelectorAll('button').forEach((q) => q.classList.toggle('on', q === b)); ui.showScene(s.name); });
  // ---- colour wheel (hue around, saturation outward) ----
  const wheel = L.querySelector('#wheel'), wg = wheel.getContext('2d'); const WR = 84, WC = 88;
  const wheelImg = (() => { const img = wg.createImageData(176, 176); for (let y = 0; y < 176; y++) for (let x = 0; x < 176; x++) { const dx = x - WC, dy = y - WC, r = Math.hypot(dx, dy) / WR; const i = (y * 176 + x) * 4; if (r > 1) { img.data[i + 3] = 0; continue; } const h = (Math.atan2(dy, dx) / (2 * Math.PI) + 1) % 1; const c = hsv(h, r, 1); img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255; } return img; })();
  function hsv(h, s, v) { const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), tt = v * (1 - (1 - f) * s); const [r, g, b] = [[v, tt, p], [q, v, p], [p, v, tt], [p, q, v], [tt, p, v], [v, p, q]][i % 6]; return [r * 255 | 0, g * 255 | 0, b * 255 | 0]; }
  const toHS = (hexv) => { const r = ((hexv >> 16) & 255) / 255, g = ((hexv >> 8) & 255) / 255, b = (hexv & 255) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [((h / 6) + 1) % 1, mx ? d / mx : 0]; };
  var drawWheel = () => {
    wg.clearRect(0, 0, 176, 176); wg.putImageData(wheelImg, 0, 0);
    const c = ls().coveColor; if (c == null) return; const [h, s] = toHS(c); const a = h * 2 * Math.PI;
    wg.beginPath(); wg.arc(WC + Math.cos(a) * s * WR, WC + Math.sin(a) * s * WR, 8, 0, Math.PI * 2); wg.lineWidth = 3; wg.strokeStyle = '#fff'; wg.stroke(); wg.lineWidth = 1.5; wg.strokeStyle = '#2b2925'; wg.stroke();
  };
  const pickAt = (e, heavy) => {
    const r = wheel.getBoundingClientRect(); const x = (e.clientX - r.left) * 176 / r.width - WC, y = (e.clientY - r.top) * 176 / r.height - WC;
    const s = Math.min(1, Math.hypot(x, y) / WR), h = (Math.atan2(y, x) / (2 * Math.PI) + 1) % 1; const [cr, cg, cb] = hsv(h, s, 1);
    setLight({ coveColor: (cr << 16) | (cg << 8) | cb, layers: { coves: true }, ...(ls().mode === 'day' ? { dayLights: true } : {}) }, heavy);
  };
  let dragging = false;
  wheel.addEventListener('pointerdown', (e) => { dragging = true; wheel.setPointerCapture(e.pointerId); pickAt(e, false); });
  wheel.addEventListener('pointermove', (e) => { if (dragging) pickAt(e, false); });
  wheel.addEventListener('pointerup', (e) => { dragging = false; pickAt(e, true); });
  const SW = [['Warm white', 0xffc98a], ['Amber', 0xffa040], ['Marigold', 0xff9a2a], ['Rose', 0xff6f91], ['Violet', 0x9a63ff], ['Royal blue', 0x4a6cff], ['Teal', 0x2fd6c4], ['Sage', 0x9fd49a]];
  const cswatch = L.querySelector('#cswatch');
  for (const [n, c] of SW) { const b = el('button', 'csw'); b.title = n; b.setAttribute('aria-label', n); b.style.background = hex(c); b.dataset.c = c; cswatch.append(b); }
  cswatch.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; setLight({ coveColor: +b.dataset.c, layers: { coves: true }, ...(ls().mode === 'day' ? { dayLights: true } : {}) }, true); });
  L.querySelector('#cauto').addEventListener('click', () => setLight({ coveColor: null }, true));
  L.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setLight({ mode: b.dataset.mode }, true)));
  L.querySelector('#time').addEventListener('input', (e) => setLight({ time: +e.target.value }));
  L.querySelector('#time').addEventListener('change', () => changed('lighting-heavy'));
  L.querySelector('#daylights').addEventListener('change', (e) => setLight({ dayLights: e.target.checked }, true));
  styles.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const s = NIGHT_STYLES.find((q) => q.id === b.dataset.style); setLight({ style: b.dataset.style, kelvin: s.kelvin, mode: 'night' }, true); });
  // in Day mode a layer you switch on is shown immediately by turning the interior lights on
  L.querySelectorAll('[data-layer]').forEach((c) => c.addEventListener('change', () => setLight({ layers: { [c.dataset.layer]: c.checked }, ...(c.checked && ls().mode === 'day' ? { dayLights: true } : {}) }, true)));
  L.querySelector('#bright').addEventListener('input', (e) => setLight({ brightness: +e.target.value }));
  L.querySelector('#bright').addEventListener('change', () => changed('lighting-heavy'));
  L.querySelector('#kel').addEventListener('input', (e) => setLight({ kelvin: +e.target.value }));
  L.querySelector('#kel').addEventListener('change', () => changed('lighting-heavy'));
  L.querySelector('#exp').addEventListener('input', (e) => setLight({ exposure: +e.target.value }));
  L.querySelector('#lreset').addEventListener('click', () => setLight({ ...JSON.parse(JSON.stringify(st.lightDefaults)) }, true));
  bMode.addEventListener('click', () => setLight({ mode: ls().mode === 'day' ? 'night' : 'day' }, true));
  st.lightDefaults = JSON.parse(JSON.stringify(lighting.state));
  st.syncLight = syncLight;

  // ================= HOUSE STYLES =================
  const SP = pane('style');
  SP.innerHTML = `<p class="lead">One-click house styles. Each sets colours for every room, a finish for every floor and a matching lighting scene.</p><div class="styles" id="styl"></div>
    <div class="row"><button class="ghost" id="sundo">Undo</button></div>`;
  const styl = SP.querySelector('#styl');
  const palById = (id) => PALETTES.find((p) => p.id === id);
  for (const s of HOUSE_STYLES) {
    const p = palById(s.pal.hall), q = palById(s.pal.mbed);
    const card = el('button', 'sty'); card.dataset.style = s.id;
    const fl = FLOOR_OPTIONS.find((f) => f.id === s.floors.hall);
    card.innerHTML = `<span class="sw">${[p.wall, p.accent, p.upholstery, p.soft, q.accent].map((c) => `<i style="background:${hex(c)}"></i>`).join('')}</span><b>${s.name}</b><small>${s.note}</small><em>${fl ? fl.name : ''} · ${s.light.mode === 'day' ? 'Day' : 'Night'}</em>`;
    styl.append(card);
  }
  styl.addEventListener('click', async (e) => {
    const c = e.target.closest('.sty'); if (!c) return;
    const s = HOUSE_STYLES.find((q) => q.id === c.dataset.style);
    design.push(); c.classList.add('loading');
    await design.applyStyle(s.id);
    lighting.apply({ ...JSON.parse(JSON.stringify(s.light)), ...(s.light.coveColor == null ? { coveColor: null } : {}) });
    c.classList.remove('loading');
    styl.querySelectorAll('.sty').forEach((q) => q.classList.toggle('on', q === c));
    st.sync(); changed('design'); changed('lighting-heavy'); ui.showScene(s.name);
  });
  SP.querySelector('#sundo').addEventListener('click', () => { design.undo(); st.sync(); changed('design'); });

  // ================= COLOURS =================
  const C = pane('colour');
  C.innerHTML = `
    <div class="grp"><label>Apply to</label><div class="chips scope" id="cscope"></div></div>
    <div class="grp"><label>Surfaces</label><div class="chips multi" id="csurf"></div></div>
    <div class="palettes" id="pals"></div>
    <div class="row"><button class="ghost" id="cundo">Undo</button><button class="ghost" id="creset">Reset colours</button></div>`;
  const cscope = C.querySelector('#cscope');
  const scopes = [{ id: 'all', name: 'Whole home', rooms: SCOPES.map((s) => s.id) }, ...SCOPES.map((s) => ({ id: s.id, name: s.name, rooms: [s.id] }))];
  let curScope = 'all';
  scopes.forEach((s) => { const b = el('button', 'chip' + (s.id === 'all' ? ' on' : ''), s.name); b.dataset.scope = s.id; cscope.append(b); });
  const csurf = C.querySelector('#csurf');
  const selSurf = new Set(SURFACES.map((s) => s.id));
  SURFACES.forEach((s) => { const b = el('button', 'chip on', s.name); b.dataset.surf = s.id; b.setAttribute('aria-pressed', 'true'); csurf.append(b); });
  const pals = C.querySelector('#pals');
  for (const p of PALETTES) {
    const card = el('button', 'pal');
    card.dataset.pal = p.id;
    card.innerHTML = `<span class="sw">${[p.wall, p.accent, p.upholstery, p.soft, p.cabinet].map((c) => `<i style="background:${hex(c)}"></i>`).join('')}</span><b>${p.name}</b><small>${p.note}</small>`;
    pals.append(card);
  }
  const syncColour = () => {
    const sc = scopes.find((s) => s.id === curScope);
    const ids = sc.rooms.map((r) => design.paletteOf(r));
    const cur = ids.every((v) => v === ids[0]) ? ids[0] : 'mixed';
    pals.querySelectorAll('.pal').forEach((c) => c.classList.toggle('on', c.dataset.pal === cur));
    C.querySelector('#cundo').disabled = !design.canUndo();
    F.querySelector('#fundo').disabled = !design.canUndo();
  };
  cscope.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; curScope = b.dataset.scope; cscope.querySelectorAll('button').forEach((q) => q.classList.toggle('on', q === b)); syncColour(); });
  csurf.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const id = b.dataset.surf;
    if (selSurf.has(id) && selSurf.size > 1) selSurf.delete(id); else selSurf.add(id);
    csurf.querySelectorAll('button').forEach((q) => { const on = selSurf.has(q.dataset.surf); q.classList.toggle('on', on); q.setAttribute('aria-pressed', String(on)); });
  });
  pals.addEventListener('click', (e) => {
    const c = e.target.closest('.pal'); if (!c) return;
    design.push();
    design.applyPalette(c.dataset.pal, scopes.find((s) => s.id === curScope).rooms, [...selSurf]);
    syncColour(); changed('design');
    ui.showScene(PALETTES.find((p) => p.id === c.dataset.pal).name);
  });
  C.querySelector('#cundo').addEventListener('click', () => { design.undo(); syncColour(); syncFloor(); changed('design'); });
  C.querySelector('#creset').addEventListener('click', () => { design.reset(); syncColour(); syncFloor(); changed('design'); });

  // ================= FLOORS =================
  const F = pane('floor');
  F.innerHTML = `
    <div class="grp"><label>Apply to</label><div class="chips scope" id="fscope"></div></div>
    <div class="floors" id="fopts"></div>
    <div class="row"><button class="ghost" id="fundo">Undo</button><button class="ghost" id="freset">Reset floors</button></div>`;
  const fscope = F.querySelector('#fscope');
  let curF = 'living';
  FLOOR_SCOPES.forEach((s) => { const b = el('button', 'chip' + (s.id === curF ? ' on' : ''), s.name); b.dataset.scope = s.id; fscope.append(b); });
  const fopts = F.querySelector('#fopts');
  let thumbsDone = false;
  for (const o of FLOOR_OPTIONS) { const b = el('button', 'fl'); b.dataset.floor = o.id; b.innerHTML = `<span class="th"></span><b>${o.name}</b><small>${o.kind}</small>`; fopts.append(b); }
  const makeThumbs = () => {
    if (thumbsDone) return; thumbsDone = true;
    // generate swatches progressively so the UI never freezes
    const list = [...fopts.querySelectorAll('.fl')];
    let i = 0;
    // all swatches are synthesised in parallel on the worker pool
    list.forEach(async (b) => { b.classList.add('loading'); b.querySelector('.th').style.backgroundImage = `url(${await design.swatch(b.dataset.floor)})`; b.classList.remove('loading'); });
    void i;
  };
  panel.querySelector('[data-tab="floor"]').addEventListener('click', makeThumbs);
  const syncFloor = () => {
    const sc = FLOOR_SCOPES.find((s) => s.id === curF);
    const cur = design.floorOf(sc.rooms);
    fopts.querySelectorAll('.fl').forEach((b) => b.classList.toggle('on', b.dataset.floor === cur));
    F.querySelector('#fundo').disabled = !design.canUndo();
  };
  fscope.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; curF = b.dataset.scope; fscope.querySelectorAll('button').forEach((q) => q.classList.toggle('on', q === b)); syncFloor(); });
  fopts.addEventListener('click', async (e) => {
    const b = e.target.closest('.fl'); if (!b) return;
    design.push();
    b.classList.add('loading');
    await design.applyFloor(b.dataset.floor, FLOOR_SCOPES.find((s) => s.id === curF).rooms);
    b.classList.remove('loading');
    syncFloor(); syncColour(); changed('design');
    ui.showScene(FLOOR_OPTIONS.find((q) => q.id === b.dataset.floor).name);
  });
  F.querySelector('#fundo').addEventListener('click', () => { design.undo(); syncFloor(); syncColour(); changed('design'); });
  F.querySelector('#freset').addEventListener('click', () => { design.reset(); syncFloor(); syncColour(); changed('design'); });

  st.sync = () => { syncLight(); syncColour(); syncFloor(); };
  st.sync();
  return st;
}
