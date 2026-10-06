// Minimal UI: exactly two persistent buttons (EXPLORE / OVERVIEW) + transient labels.
import * as THREE from 'three';
import { rooms, labelAnchors } from '../data/floorplan.ts';
import { fmtFtIn } from '../data/validate.ts';

export function createUI() {
  const ui = {};
  const bar = document.createElement('div'); bar.className = 'nav';
  const bExplore = document.createElement('button'); bExplore.textContent = 'EXPLORE'; bExplore.setAttribute('aria-label', 'Explore: walk through the residence in first person');
  const bOverview = document.createElement('button'); bOverview.textContent = 'OVERVIEW'; bOverview.setAttribute('aria-label', 'Overview: orbit around the whole apartment');
  bar.append(bExplore, bOverview); document.body.append(bar);
  ui.bExplore = bExplore; ui.bOverview = bOverview; ui.bar = bar;
  ui.setMode = (m) => { bExplore.classList.toggle('active', m === 'explore'); bOverview.classList.toggle('active', m === 'overview'); bExplore.setAttribute('aria-pressed', m === 'explore'); bOverview.setAttribute('aria-pressed', m === 'overview'); };

  const roomLabel = document.createElement('div'); roomLabel.className = 'roomlabel'; document.body.append(roomLabel);
  const sceneLabel = document.createElement('div'); sceneLabel.className = 'scenelabel'; document.body.append(sceneLabel);
  const help = document.createElement('div'); help.className = 'help'; document.body.append(help);
  const joy = document.createElement('div'); joy.className = 'joy'; joy.innerHTML = '<div></div>'; document.body.append(joy);
  const cross = document.createElement('div'); cross.className = 'cross'; document.body.append(cross);
  const prompt = document.createElement('div'); prompt.className = 'prompt'; document.body.append(prompt);
  let lastPrompt = '';
  ui.prompt = (t) => { if (t === lastPrompt) return; lastPrompt = t; if (t) { prompt.innerHTML = t; prompt.classList.add('on'); } else prompt.classList.remove('on'); };
  let rt = 0, st = 0, ht = 0;
  ui.showRoom = (name, dims) => { roomLabel.innerHTML = `<b>${name}</b>${dims ? `<span>${dims}</span>` : ''}`; roomLabel.classList.add('on'); clearTimeout(rt); rt = setTimeout(() => roomLabel.classList.remove('on'), 2600); };
  ui.showScene = (name) => { sceneLabel.textContent = name; sceneLabel.classList.add('on'); clearTimeout(st); st = setTimeout(() => sceneLabel.classList.remove('on'), 1800); };
  ui.showHelp = (html, ms = 7000) => { help.innerHTML = html; help.classList.add('on'); clearTimeout(ht); ht = setTimeout(() => help.classList.remove('on'), ms); };
  ui.hideHelp = () => { clearTimeout(ht); help.classList.remove('on'); };
  ui.setCross = (on) => cross.classList.toggle('on', on);
  ui.joystick = (t) => {
    if (!t) { joy.classList.remove('on'); return; }
    joy.classList.add('on'); joy.style.left = t.x0 + 'px'; joy.style.top = t.y0 + 'px';
    const dx = Math.max(-50, Math.min(50, t.x - t.x0)), dy = Math.max(-50, Math.min(50, t.y - t.y0));
    joy.firstChild.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  // loading veil
  const veil = document.createElement('div'); veil.className = 'veil'; veil.innerHTML = '<div class="t">Residence · Fourth Floor</div><div class="bar"><i></i></div><div class="s">Building architecture…</div>';
  document.body.append(veil);
  ui.progress = (p, s) => { veil.querySelector('i').style.width = `${Math.round(p * 100)}%`; if (s) veil.querySelector('.s').textContent = s; };
  ui.ready = () => { veil.classList.add('off'); setTimeout(() => veil.remove(), 900); };

  // ------------- plan overlay (P) -------------
  const overlay = document.createElement('div'); overlay.className = 'planlabels'; document.body.append(overlay);
  const items = [];
  for (const r of rooms) {
    if (!r.required) continue;
    const el = document.createElement('div'); el.className = 'pl';
    const ew = r.rect[2] - r.rect[0], ns = r.rect[3] - r.rect[1];
    el.innerHTML = `<b>${r.name}</b><span>${r.label}</span><em>${ew.toFixed(3)} × ${ns.toFixed(3)} m · ${fmtFtIn(ew)} × ${fmtFtIn(ns)} ✓</em>`;
    overlay.append(el);
    const a = labelAnchors[r.id] || [(r.rect[0] + r.rect[2]) / 2, (r.rect[1] + r.rect[3]) / 2];
    items.push({ el, pos: new THREE.Vector3(a[0], 0.2, -a[1]) });
  }
  ui.planLines = (() => {
    const g = new THREE.Group(); g.name = 'planLines';
    const mat = new THREE.LineDashedMaterial({ color: 0xc8962f, dashSize: 0.12, gapSize: 0.06, depthTest: false, transparent: true });
    const matOpen = new THREE.LineDashedMaterial({ color: 0x3f8fb8, dashSize: 0.08, gapSize: 0.08, depthTest: false, transparent: true });
    for (const r of rooms) {
      if (!r.required) continue;
      const [x0, y0, x1, y1] = r.rect; const y = 0.25;
      const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]].map(([x, yy]) => new THREE.Vector3(x, y, -yy));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const l = new THREE.Line(geo, r.open ? matOpen : mat); l.computeLineDistances(); l.renderOrder = 10; g.add(l);
    }
    g.visible = false;
    return g;
  })();
  ui.plan = false;
  ui.setPlan = (on) => { ui.plan = on; overlay.classList.toggle('on', on); ui.planLines.visible = on; };
  const v = new THREE.Vector3();
  ui.updatePlan = (camera) => {
    if (!ui.plan) return;
    for (const it of items) {
      v.copy(it.pos).project(camera);
      const x = (v.x * 0.5 + 0.5) * window.innerWidth, y = (-v.y * 0.5 + 0.5) * window.innerHeight;
      it.el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      it.el.style.display = v.z < 1 ? '' : 'none';
    }
  };
  return ui;
}
