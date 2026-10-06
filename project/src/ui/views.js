// Saved camera views: hero eye-level shots and aerial dollhouse angles, with smooth eased fly-to.
// Explore views tween the walker (x, y, yaw, pitch); overview views tween the orbit camera + target.
import * as THREE from 'three';

export const VIEWS = [
  { group: 'Eye level', id: 'living', name: 'Living — hero', spot: { x: 9.3, y: 7.0, yawDeg: 235, pitch: -0.06 } },
  { group: 'Eye level', id: 'media', name: 'Living — media wall', spot: { x: 7.1, y: 5.15, yawDeg: 352, pitch: -0.08 } },
  { group: 'Eye level', id: 'dining', name: 'Dining', spot: { x: 6.62, y: 3.85, yawDeg: 252, pitch: -0.14 } },
  { group: 'Eye level', id: 'kitchen', name: 'Kitchen', spot: { x: 7.2, y: 2.4, yawDeg: 95, pitch: -0.1 } },
  { group: 'Eye level', id: 'mandir', name: 'Mandir', spot: { x: 11.35, y: 7.226, yawDeg: 90, pitch: -0.12 } },
  { group: 'Eye level', id: 'foyer', name: 'Entry foyer', spot: { x: 10.0, y: 7.15, yawDeg: 270, pitch: -0.05 } },
  { group: 'Eye level', id: 'balcony', name: 'Balcony', spot: { x: 10.5, y: 5.75, yawDeg: 120, pitch: -0.04 } },
  { group: 'Eye level', id: 'office', name: 'Home office', spot: { x: 11.2, y: 9.0, yawDeg: 40, pitch: -0.1 } },
  { group: 'Eye level', id: 'mbed', name: 'Master suite', spot: { x: 2.72, y: 4.0, yawDeg: 262, pitch: -0.1 } },
  { group: 'Eye level', id: 'chbed', name: "Children's room", spot: { x: 3.15, y: 8.95, yawDeg: 300, pitch: -0.1 } },
  { group: 'Eye level', id: 'dress', name: 'Dressing room', spot: { x: 4.9, y: 8.75, yawDeg: 80, pitch: -0.06 } },
  { group: 'Eye level', id: 'lobby', name: 'Arrival lobby', spot: { x: 9.6, y: 8.5, yawDeg: 180, pitch: -0.05 } },
  { group: 'Aerial', id: 'doll', name: 'Dollhouse', orbit: { pos: [15.5, -9.5, 14.0], target: [7.2, 6.0, 0.3] } },
  { group: 'Aerial', id: 'dollsw', name: 'Dollhouse — south-west', orbit: { pos: [-5.5, -4.5, 12.5], target: [6.8, 5.6, 0.3] } },
  { group: 'Aerial', id: 'dollne', name: 'Dollhouse — north-east', orbit: { pos: [19.5, 19.0, 13.0], target: [7.0, 6.2, 0.3] } },
  { group: 'Aerial', id: 'plan', name: 'Plan (top-down)', orbit: { pos: [7.2, 5.95, 21.0], target: [7.2, 6.0, 0.0] } },
];

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

export function createViews(ui, { ctl, camera, explore }) {
  let anim = 0;
  const flyExplore = (spot, dur = 1.3) => {
    if (ctl.mode !== 'explore') { explore(spot); const p = ctl.player; p.pitch = spot.pitch ?? -0.05; return; }
    const p = ctl.player; const a = { x: p.x, y: p.y, yaw: p.yaw, pitch: p.pitch };
    const b = { x: spot.x, y: spot.y, yaw: a.yaw + angDiff(a.yaw, -THREE.MathUtils.degToRad(spot.yawDeg)), pitch: spot.pitch ?? -0.05 };
    const t0 = performance.now(); const id = ++anim;
    const step = () => {
      if (id !== anim) return; const k = ease(Math.min(1, (performance.now() - t0) / (dur * 1000)));
      p.x = a.x + (b.x - a.x) * k; p.y = a.y + (b.y - a.y) * k; p.yaw = a.yaw + (b.yaw - a.yaw) * k; p.pitch = a.pitch + (b.pitch - a.pitch) * k;
      p.vx = p.vy = 0; if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const flyOrbit = (o, dur = 1.6) => {
    if (ctl.mode !== 'overview') ctl.enterOverview(false);
    const from = camera.position.clone(), fromT = ctl.orbit.target.clone();
    const to = new THREE.Vector3(o.pos[0], o.pos[2], -o.pos[1]), toT = new THREE.Vector3(o.target[0], o.target[2], -o.target[1]);
    const t0 = performance.now(); const id = ++anim;
    const step = () => {
      if (id !== anim) return; const k = ease(Math.min(1, (performance.now() - t0) / (dur * 1000)));
      camera.position.lerpVectors(from, to, k); ctl.orbit.target.lerpVectors(fromT, toT, k); ctl.orbit.update();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const go = (v) => { if (v.spot) flyExplore(v.spot); else flyOrbit(v.orbit); ui.showRoom?.(v.name, v.group === 'Aerial' ? 'aerial view' : 'view'); };

  // nav button + popover (re-uses the rooms menu styling)
  const bViews = document.createElement('button'); bViews.textContent = 'VIEWS'; bViews.setAttribute('aria-label', 'Jump to a saved camera view'); bViews.setAttribute('aria-expanded', 'false');
  ui.bar.insertBefore(bViews, ui.bar.querySelector('.navsep'));
  const pop = document.createElement('div'); pop.className = 'roomsmenu viewsmenu'; pop.setAttribute('role', 'menu');
  for (const grp of ['Eye level', 'Aerial']) {
    const h = document.createElement('div'); h.className = 'vhead'; h.textContent = grp; pop.append(h);
    const grid = document.createElement('div'); grid.className = 'rgrid'; pop.append(grid);
    for (const v of VIEWS.filter((q) => q.group === grp)) {
      const b = document.createElement('button'); b.setAttribute('role', 'menuitem'); b.innerHTML = `<b>${v.name}</b><small>${grp === 'Aerial' ? 'cut-away' : 'eye level'}</small>`;
      b.addEventListener('click', () => { open(false); go(v); }); grid.append(b);
    }
  }
  document.body.append(pop);
  const open = (on) => { pop.classList.toggle('open', on); bViews.classList.toggle('active', on); bViews.setAttribute('aria-expanded', String(on)); };
  bViews.addEventListener('click', (e) => { e.stopPropagation(); open(!pop.classList.contains('open')); });
  document.addEventListener('click', (e) => { if (!pop.contains(e.target) && e.target !== bViews) open(false); });
  return { go, views: VIEWS, flyExplore, flyOrbit };
}
