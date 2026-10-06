// Overview (orbit) + Explore (first-person, collision) navigation.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { designConfig as DC } from '../data/designConfig.ts';
import { floors, openings } from '../data/floorplan.ts';
import { openingRect } from '../architecture/building.js';
const thresholds = openings.filter((o) => o.kind === 'door').map((o) => openingRect(o));

const inRect = (x, y, r) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];

export function createControls(camera, dom, getColliders) {
  const ctl = { mode: 'overview', listeners: {} };
  const emit = (e, d) => (ctl.listeners[e] || []).forEach((f) => f(d));
  ctl.on = (e, f) => ((ctl.listeners[e] ||= []).push(f));

  // ---------------- overview ----------------
  const orbit = new OrbitControls(camera, dom);
  orbit.enableDamping = true; orbit.dampingFactor = 0.08;
  orbit.minDistance = 4; orbit.maxDistance = 34;
  orbit.maxPolarAngle = 1.22; orbit.minPolarAngle = 0.0;
  orbit.target.set(7.4, 0.0, -5.6);
  orbit.screenSpacePanning = true;
  orbit.zoomToCursor = true;
  const homePos = new THREE.Vector3(3.2, 16.5, 7.8);
  camera.position.copy(homePos);
  orbit.update();

  // ---------------- explore state ----------------
  const player = { x: 9.92, y: 8.45, h: DC.eyeHeight, yaw: 0, pitch: -0.05, vx: 0, vy: 0, vz: 0, floor: 0 };
  ctl.spectate = true; // Explore is a free-flying spectator camera (no walls, no collision)
  const keys = new Set();
  let locked = false;
  let touchMove = null, touchLook = null; // {id, x0, y0, x, y}

  function setYawFromPlanDir(deg) { // deg: 0 = north, 90 = east, 180 = south
    // camera looks along -Z when yaw = 0 → plan north
    player.yaw = -THREE.MathUtils.degToRad(deg);
  }

  ctl.enterExplore = (spot) => {
    ctl.mode = 'explore';
    orbit.enabled = false;
    if (spot) { player.x = spot.x; player.y = spot.y; player.h = DC.eyeHeight; setYawFromPlanDir(spot.yawDeg ?? 180); player.pitch = -0.04; }
    player.vx = player.vy = player.vz = 0;
    camera.near = 0.05; camera.updateProjectionMatrix();
    emit('mode', 'explore');
    document.activeElement?.blur?.(); // Space must fly, not press a focused button
  };
  ctl.enterOverview = (topDown = false) => {
    if (document.pointerLockElement) document.exitPointerLock();
    ctl.mode = 'overview';
    orbit.enabled = true;
    camera.near = 0.1; camera.updateProjectionMatrix();
    if (topDown) {
      orbit.target.set(7.2, 0, -6.0);
      camera.position.set(7.2, 26, -6.0 + 0.01);
    } else {
      camera.position.copy(homePos); orbit.target.set(7.4, 0.0, -5.6);
    }
    camera.up.set(0, 1, 0);
    orbit.update();
    emit('mode', 'overview');
  };
  ctl.focusRoom = (x, y) => { // overview: frame a room
    orbit.target.set(x, 0.5, -y);
    camera.position.set(x + 3.2, 7.5, -y + 5.0);
    orbit.update();
  };

  function requestLock() {
    if (matchMedia('(pointer: coarse)').matches) return;
    dom.requestPointerLock?.()?.catch?.(() => {});
  }
  // Mouse: drag-to-look always works; a click (no drag) either toggles the door under the
  // cursor/crosshair or, if nothing interactive is hit, captures the pointer for FPS look.
  let drag = null;
  dom.addEventListener('mousedown', (e) => {
    if (ctl.mode !== 'explore' || e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
  });
  window.addEventListener('mouseup', (e) => {
    if (ctl.mode !== 'explore' || !drag) { drag = null; return; }
    const wasClick = drag.moved < 5; drag = null;
    if (!wasClick) return;
    (ctl.listeners.click || []).some((f) => f(locked ? null : { x: e.clientX, y: e.clientY }));
  });
  document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === dom; emit('lock', locked); });
  document.addEventListener('mousemove', (e) => {
    if (ctl.mode !== 'explore') return;
    if (locked) {
      player.yaw -= e.movementX * 0.0022;
      player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * 0.0022, -1.35, 1.35);
    } else if (drag && (e.buttons & 1)) {
      drag.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
      player.yaw += e.movementX * 0.0035; // grab-and-drag the view
      player.pitch = THREE.MathUtils.clamp(player.pitch + e.movementY * 0.0035, -1.35, 1.35);
    }
  });
  dom.addEventListener('contextmenu', (e) => { if (ctl.mode === 'explore') e.preventDefault(); });
  // scroll wheel = take a step forward / back (explore)
  let wheelImpulse = 0;
  dom.addEventListener('wheel', (e) => {
    if (ctl.mode !== 'explore') return;
    e.preventDefault();
    wheelImpulse = THREE.MathUtils.clamp(wheelImpulse - Math.sign(e.deltaY) * 0.35, -1.2, 1.2);
  }, { passive: false });
  const isTyping = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
  window.addEventListener('keydown', (e) => { if (isTyping(e)) return; keys.add(e.code); if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && ctl.mode === 'explore') e.preventDefault(); });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); if (document.pointerLockElement) document.exitPointerLock(); } });

  // touch: left half = move joystick, right half = look (explore mode only)
  dom.addEventListener('touchstart', (e) => {
    if (ctl.mode !== 'explore') return;
    for (const t of e.changedTouches) {
      const left = t.clientX < window.innerWidth / 2;
      const rec = { id: t.identifier, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY };
      if (left && !touchMove) { touchMove = rec; emit('joystick', rec); } else if (!touchLook) touchLook = rec;
    }
    e.preventDefault();
  }, { passive: false });
  dom.addEventListener('touchmove', (e) => {
    if (ctl.mode !== 'explore') return;
    for (const t of e.changedTouches) {
      if (touchMove && t.identifier === touchMove.id) { touchMove.x = t.clientX; touchMove.y = t.clientY; emit('joystick', touchMove); }
      if (touchLook && t.identifier === touchLook.id) {
        player.yaw -= (t.clientX - touchLook.x) * 0.005; player.pitch = THREE.MathUtils.clamp(player.pitch - (t.clientY - touchLook.y) * 0.005, -1.2, 1.2);
        touchLook.x = t.clientX; touchLook.y = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });
  const endTouch = (e) => {
    for (const t of e.changedTouches) {
      if (touchMove && t.identifier === touchMove.id) { touchMove = null; emit('joystick', null); }
      if (touchLook && t.identifier === touchLook.id) touchLook = null;
    }
  };
  dom.addEventListener('touchend', endTouch); dom.addEventListener('touchcancel', endTouch);

  // ---------------- collision ----------------
  const R = DC.playerRadius;
  function blocked(x, y) {
    for (const c of getColliders()) {
      const r = c.rect;
      if (x > r[0] - R && x < r[2] + R && y > r[1] - R && y < r[3] + R) {
        // circle vs rect exact test
        const cx = Math.max(r[0], Math.min(x, r[2])), cy = Math.max(r[1], Math.min(y, r[3]));
        if ((x - cx) ** 2 + (y - cy) ** 2 < R * R) return true;
      }
    }
    // must stand on a floor finish
    return !floors.some((f) => inRect(x, y, f.rect)) && !thresholds.some((r) => inRect(x, y, r));
  }
  ctl.blocked = blocked;
  function floorHeight(x, y) { const f = floors.find((q) => inRect(x, y, q.rect)); return f ? (f.y ?? 0) : 0; }

  ctl.update = (dt) => {
    if (ctl.mode === 'overview') {
      orbit.update();
      // keep target inside the site
      orbit.target.x = THREE.MathUtils.clamp(orbit.target.x, -2, 16.5);
      orbit.target.z = THREE.MathUtils.clamp(orbit.target.z, -13.5, 1.5);
      orbit.target.y = THREE.MathUtils.clamp(orbit.target.y, -0.5, 2.5);
      return;
    }
    // input → desired velocity (plan frame)
    let f = 0, s = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) s += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) s -= 1;
    if (Math.abs(wheelImpulse) > 0.01) { f += Math.sign(wheelImpulse) * Math.min(1, Math.abs(wheelImpulse) * 2.5); wheelImpulse *= Math.exp(-dt * 5); } else wheelImpulse = 0;
    if (touchMove) { const dx = touchMove.x - touchMove.x0, dy = touchMove.y - touchMove.y0; const m = Math.min(1, Math.hypot(dx, dy) / 60); const a = Math.atan2(dx, -dy); f += Math.cos(a) * m; s += Math.sin(a) * m; }
    const u = 0; // no vertical movement: Explore glides on a level line
    const len = Math.hypot(f, s); if (len > 1) { f /= len; s /= len; }
    const fast = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const moving = len > 0 || (ctl.spectate && u !== 0);
    const acc = 1 - Math.exp(-dt * (moving ? 7 : 9));
    if (ctl.spectate) {
      // SPECTATE (level glide): moves in straight horizontal lines at eye height wherever you face;
      // looking up/down never changes height, and walls/furniture never block
      const speed = fast ? 4.0 : 1.9;
      const fx = -Math.sin(player.yaw), fy = Math.cos(player.yaw);
      const rx = Math.cos(player.yaw), ry = Math.sin(player.yaw);
      const tvx = (fx * f + rx * s) * speed, tvy = (fy * f + ry * s) * speed;
      player.vx += (tvx - player.vx) * acc; player.vy += (tvy - player.vy) * acc; player.vz = 0;
      if (Math.abs(player.vx) + Math.abs(player.vy) > 1e-4) emit('moved');
      player.x = THREE.MathUtils.clamp(player.x + player.vx * dt, -15, 30);
      player.y = THREE.MathUtils.clamp(player.y + player.vy * dt, -15, 27);
      const fh = floorHeight(player.x, player.y);
      player.floor += (fh - player.floor) * Math.min(1, dt * 10);
      player.h += (player.floor + DC.eyeHeight - player.h) * Math.min(1, dt * 6);
      camera.position.set(player.x, player.h, -player.y);
    } else {
      // WALK: eye height, floor following and collision
      const speed = fast ? DC.sprintSpeed : DC.walkSpeed;
      const fx = -Math.sin(player.yaw), fy = Math.cos(player.yaw);
      const rx = Math.cos(player.yaw), ry = Math.sin(player.yaw);
      const tvx = (fx * f + rx * s) * speed, tvy = (fy * f + ry * s) * speed;
      player.vx += (tvx - player.vx) * acc; player.vy += (tvy - player.vy) * acc;
      if (Math.abs(player.vx) + Math.abs(player.vy) > 1e-4) emit('moved');
      if (blocked(player.x, player.y)) { // returning from spectate inside an obstacle: settle on a free spot
        for (let r = 0.05; r < 2 && blocked(player.x, player.y); r += 0.05) for (let a = 0; a < 6.28; a += 0.4) { if (!blocked(player.x + Math.cos(a) * r, player.y + Math.sin(a) * r)) { player.x += Math.cos(a) * r; player.y += Math.sin(a) * r; break; } }
      }
      const steps = Math.ceil(Math.max(Math.abs(player.vx), Math.abs(player.vy)) * dt / 0.05) || 1;
      for (let i = 0; i < steps; i++) {
        const nx = player.x + (player.vx * dt) / steps;
        if (!blocked(nx, player.y)) player.x = nx; else player.vx = 0;
        const ny = player.y + (player.vy * dt) / steps;
        if (!blocked(player.x, ny)) player.y = ny; else player.vy = 0;
      }
      const fh = floorHeight(player.x, player.y);
      player.floor += (fh - player.floor) * Math.min(1, dt * 10);
      player.h += (player.floor + DC.eyeHeight - player.h) * Math.min(1, dt * 6);
      camera.position.set(player.x, player.h, -player.y);
    }
    camera.rotation.order = 'YXZ';
    camera.rotation.set(player.pitch, player.yaw, 0);
  };

  ctl.player = player;
  ctl.orbit = orbit;
  ctl.isLocked = () => locked;
  ctl.planForward = () => ({ x: -Math.sin(player.yaw), y: Math.cos(player.yaw) });
  return ctl;
}
