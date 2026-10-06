// Rooms menu (jump to any room) + guided walkthrough tour that walks a collision-free path
// (A* over the same collision field used by Explore) from room to room.
import { fmtFtIn } from '../data/validate.ts';

const SPOTS = {
  passage: { x: 9.48, y: 8.5, yawDeg: 180 },
  hall: { x: 9.3, y: 7.0, yawDeg: 235 },
  dining: { x: 6.6, y: 3.0, yawDeg: 262 },
  kitchen: { x: 7.3, y: 2.35, yawDeg: 92 },
  hallbal: { x: 10.5, y: 5.6, yawDeg: 95 },
  deoghar: { x: 10.95, y: 7.25, yawDeg: 90 },
  office: { x: 11.3, y: 9.0, yawDeg: 40 },
  officebal: { x: 14.2, y: 9.95, yawDeg: 270 },
  mbed: { x: 2.9, y: 4.75, yawDeg: 222 },
  mbedbal: { x: 1.9, y: 0.7, yawDeg: 300 },
  chbed: { x: 3.1, y: 8.75, yawDeg: 315 },
  chrm: { x: 4.9, y: 8.75, yawDeg: 80 },
  mtoilet: { x: 2.1, y: 5.75, yawDeg: 270 },
  ctoilet: { x: 2.1, y: 7.55, yawDeg: 270 },
  chtoilet: { x: 5.1, y: 9.8, yawDeg: 0 },
  washing: { x: 4.9, y: 0.75, yawDeg: 90 },
  corridor: { x: 2.87, y: 7.6, yawDeg: 180 },
};
const MENU = ['hall', 'dining', 'kitchen', 'hallbal', 'deoghar', 'office', 'officebal', 'mbed', 'mbedbal', 'mtoilet', 'chbed', 'chrm', 'chtoilet', 'ctoilet', 'corridor', 'washing', 'passage'];
const TOUR = [
  { id: 'passage', text: 'Common lobby — lift, stair and the main entrance', spot: { x: 9.48, y: 8.5, yawDeg: 180 } },
  { id: 'hall', text: 'Living room — media wall, L-sectional, profile lighting', spot: { x: 9.3, y: 6.95, yawDeg: 238 } },
  { id: 'hall', text: 'Living room looking toward the balcony', spot: { x: 5.6, y: 6.8, yawDeg: 118 } },
  { id: 'dining', text: 'Dining — six seats under a sculptural brass pendant', spot: { x: 6.6, y: 3.0, yawDeg: 262 } },
  { id: 'kitchen', text: 'Kitchen — stone pier with breakfast ledge, L-run with hob and chimney', spot: { x: 7.3, y: 2.35, yawDeg: 92 } },
  { id: 'hallbal', text: 'Hall balcony', spot: { x: 10.5, y: 5.6, yawDeg: 95 } },
  { id: 'deoghar', text: 'Entry and deoghar behind carved jaali doors', spot: { x: 10.95, y: 7.25, yawDeg: 90 } },
  { id: 'office', text: 'Home office — two workstations, 4000 K task light', spot: { x: 11.3, y: 9.0, yawDeg: 40 } },
  { id: 'mbed', text: 'Master bedroom — fluted timber headboard wall with cove', spot: { x: 2.9, y: 4.75, yawDeg: 222 } },
  { id: 'chbed', text: "Kids' bedroom — study desk, window seat, dressing room", spot: { x: 3.1, y: 8.75, yawDeg: 315 } },
];

export function createTour(ui, { ctl, doors, rooms, explore, safeSpot }) {
  const t = { active: false };
  const roomById = Object.fromEntries(rooms.map((r) => [r.id, r]));
  // ---------- rooms menu ----------
  const bRooms = document.createElement('button'); bRooms.textContent = 'ROOMS'; bRooms.setAttribute('aria-label', 'Jump to a room or start the guided tour'); bRooms.setAttribute('aria-expanded', 'false');
  ui.bar.insertBefore(bRooms, ui.bar.querySelector('.navsep'));
  const pop = document.createElement('div'); pop.className = 'roomsmenu'; pop.setAttribute('role', 'menu');
  const tourBtn = document.createElement('button'); tourBtn.className = 'tourbtn'; tourBtn.innerHTML = '<span>▶</span> Guided tour <small>about 1½ minutes</small>';
  pop.append(tourBtn);
  const grid = document.createElement('div'); grid.className = 'rgrid'; pop.append(grid);
  for (const id of MENU) {
    const r = roomById[id]; if (!r) continue;
    const b = document.createElement('button'); b.setAttribute('role', 'menuitem');
    const ew = r.rect[2] - r.rect[0], ns = r.rect[3] - r.rect[1];
    b.innerHTML = `<b>${r.name.replace('M. BED', 'Master Bed').replace('CH. BED', "Kids' Bed").replace('CH. RM (Dressing)', 'Dressing').replace('C. TOILET', 'Common Toilet')}</b><small>${r.label || `${fmtFtIn(ew)} × ${fmtFtIn(ns)}`}</small>`;
    b.addEventListener('click', () => { openMenu(false); go(id); });
    grid.append(b);
  }
  document.body.append(pop);
  const openMenu = (on) => { pop.classList.toggle('open', on); bRooms.classList.toggle('active', on); bRooms.setAttribute('aria-expanded', String(on)); };
  bRooms.addEventListener('click', (e) => { e.stopPropagation(); openMenu(!pop.classList.contains('open')); });
  document.addEventListener('click', (e) => { if (!pop.contains(e.target) && e.target !== bRooms) openMenu(false); });
  tourBtn.addEventListener('click', () => { openMenu(false); start(); });

  function go(id) {
    stop();
    const s = SPOTS[id] || { x: (roomById[id].rect[0] + roomById[id].rect[2]) / 2, y: (roomById[id].rect[1] + roomById[id].rect[3]) / 2, yawDeg: 0 };
    if (ctl.mode === 'overview') ctl.focusRoom(s.x, s.y);
    else { const q = safeSpot(s); Object.assign(ctl.player, { x: q.x, y: q.y, yaw: -q.yawDeg * Math.PI / 180, pitch: -0.05 }); }
    ui.showRoom(roomById[id].name, roomById[id].label || '');
  }

  // ---------- path planning ----------
  const CELL = 0.1, X0 = -0.3, Y0 = -0.3, NX = 155, NY = 125;
  let free = null;
  function buildGrid() {
    free = new Uint8Array(NX * NY);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) free[j * NX + i] = ctl.blocked(X0 + i * CELL, Y0 + j * CELL) ? 0 : 1;
  }
  const idx = (x, y) => [Math.round((x - X0) / CELL), Math.round((y - Y0) / CELL)];
  function nearestFree(i, j) {
    for (let r = 0; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < NX && b < NY && free[b * NX + a]) return [a, b]; }
    return [i, j];
  }
  function astar(ax, ay, bx, by) {
    let [si, sj] = idx(ax, ay), [ti, tj] = idx(bx, by);
    [si, sj] = nearestFree(si, sj); [ti, tj] = nearestFree(ti, tj);
    const N = NX * NY, g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const open = [[0, sj * NX + si]]; g[sj * NX + si] = 0;
    const h = (k) => { const i = k % NX, j = (k / NX) | 0; return Math.hypot(i - ti, j - tj); };
    const goal = tj * NX + ti;
    while (open.length) {
      let bi = 0; for (let q = 1; q < open.length; q++) if (open[q][0] < open[bi][0]) bi = q;
      const [, k] = open.splice(bi, 1)[0];
      if (k === goal) break;
      if (closed[k]) continue; closed[k] = 1;
      const i = k % NX, j = (k / NX) | 0;
      for (const [di, dj, c] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]]) {
        const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NX || b >= NY) continue;
        const n = b * NX + a; if (!free[n] || closed[n]) continue;
        if (di && dj && (!free[j * NX + a] || !free[b * NX + i])) continue;
        const ng = g[k] + c; if (ng < g[n]) { g[n] = ng; came[n] = k; open.push([ng + h(n), n]); }
      }
    }
    const path = []; let k = goal; if (came[k] < 0 && k !== sj * NX + si) return [[ax, ay], [bx, by]];
    while (k >= 0) { path.push([X0 + (k % NX) * CELL, Y0 + ((k / NX) | 0) * CELL]); k = came[k]; }
    path.reverse();
    // string-pulling: drop waypoints that are directly visible
    const clear = (p, q) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); const n = Math.ceil(d / 0.05); for (let s = 1; s < n; s++) { const x = p[0] + (q[0] - p[0]) * s / n, y = p[1] + (q[1] - p[1]) * s / n; if (ctl.blocked(x, y)) return false; } return true; };
    const out = [path[0]]; let a = 0;
    while (a < path.length - 1) { let b = path.length - 1; while (b > a + 1 && !clear(path[a], path[b])) b--; out.push(path[b]); a = b; }
    return out;
  }

  // ---------- tour runtime ----------
  let stopI = 0, phase = 'move', path = [], seg = 0, dwell = 0;
  const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  function start() {
    doors.list.forEach((d) => { if (d.state.target < 0.5) d.toggle(); d.state.t = 1; d.update(0); });
    buildGrid();
    explore(TOUR[0].spot);
    t.active = true; stopI = 0; phase = 'dwell'; dwell = 0;
    ui.showRoom(roomById[TOUR[0].id].name, TOUR[0].text);
    ui.showHelp('Guided tour · press any key, click or scroll to take over', 6000);
  }
  function stop() { if (!t.active) return; t.active = false; }
  t.stop = stop; t.start = start;
  const interrupt = (e) => { if (t.active && !(e.type === 'keydown' && e.repeat)) stop(); };
  window.addEventListener('keydown', interrupt, true);
  window.addEventListener('wheel', interrupt, true);
  window.addEventListener('mousedown', (e) => { if (t.active && e.target.tagName === 'CANVAS') stop(); }, true);

  t.update = (dt) => {
    if (!t.active || ctl.mode !== 'explore') { if (t.active && ctl.mode !== 'explore') stop(); return; }
    const p = ctl.player; const st = TOUR[stopI];
    if (phase === 'dwell') {
      const want = -st.spot.yawDeg * Math.PI / 180;
      p.yaw += angDiff(p.yaw, want) * Math.min(1, dt * 2.2);
      p.pitch += (-0.06 - p.pitch) * Math.min(1, dt * 2);
      dwell += dt;
      if (dwell > 4.2) {
        stopI++;
        if (stopI >= TOUR.length) { stop(); ui.showRoom('Tour complete', 'explore freely'); return; }
        path = astar(p.x, p.y, TOUR[stopI].spot.x, TOUR[stopI].spot.y); seg = 1; phase = 'move';
      }
      return;
    }
    // move along the planned path at walking pace, looking where we walk
    const target = path[seg];
    if (!target) { phase = 'dwell'; dwell = 0; ui.showRoom(roomById[TOUR[stopI].id].name, TOUR[stopI].text); return; }
    const dx = target[0] - p.x, dy = target[1] - p.y, d = Math.hypot(dx, dy);
    const step = 1.05 * dt;
    if (d <= step) { p.x = target[0]; p.y = target[1]; seg++; }
    else { p.x += (dx / d) * step; p.y += (dy / d) * step; }
    const heading = Math.atan2(-dx, dy);
    if (d > 0.05) p.yaw += angDiff(p.yaw, heading) * Math.min(1, dt * 3);
    p.pitch += (-0.04 - p.pitch) * Math.min(1, dt * 2);
    p.h += (1.65 - p.h) * Math.min(1, dt * 2);
  };
  t.astar = astar; t.buildGrid = buildGrid;
  return t;
}
