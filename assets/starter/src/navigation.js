import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

export function createNavigation({ camera, renderer, colliders, hint, exploreButton, overviewButton }) {
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.target.set(0, 0.9, 0);
  orbit.minDistance = 4;
  orbit.maxDistance = 18;
  orbit.maxPolarAngle = Math.PI * 0.49;

  const walk = new PointerLockControls(camera, renderer.domElement);
  const keys = new Set();
  const playerRadius = 0.30;
  const eyeHeight = 1.65;
  let mode = "overview";

  const setPressed = () => {
    exploreButton.setAttribute("aria-pressed", String(mode === "explore"));
    overviewButton.setAttribute("aria-pressed", String(mode === "overview"));
  };

  function enterExplore() {
    mode = "explore";
    orbit.enabled = false;
    camera.position.y = eyeHeight;
    walk.lock();
    hint.textContent = "WASD to move · mouse to look · Esc releases cursor";
    setPressed();
  }

  function enterOverview() {
    mode = "overview";
    walk.unlock();
    orbit.enabled = true;
    camera.position.set(7.6, 6.1, 7.6);
    orbit.target.set(0, 0.9, 0);
    orbit.update();
    hint.textContent = "Drag to orbit · scroll to zoom";
    setPressed();
  }

  exploreButton.addEventListener("click", enterExplore);
  overviewButton.addEventListener("click", enterOverview);

  window.addEventListener("keydown", (event) => keys.add(event.code));
  window.addEventListener("keyup", (event) => keys.delete(event.code));

  const playerBox = new THREE.Box3();
  const candidate = new THREE.Vector3();
  const size = new THREE.Vector3(playerRadius * 2, 1.7, playerRadius * 2);

  function blocked(position) {
    playerBox.setFromCenterAndSize(
      new THREE.Vector3(position.x, 0.85, position.z),
      size
    );
    return colliders.some((c) => playerBox.intersectsBox(c));
  }

  function update(delta) {
    if (mode === "overview") {
      orbit.update();
      return;
    }

    const speed = 2.25;
    const forward = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown"));
    const strafe = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));

    if (!forward && !strafe) return;

    const direction = new THREE.Vector3(strafe, 0, -forward);
    if (direction.lengthSq() > 1) direction.normalize();
    direction.applyQuaternion(camera.quaternion);
    direction.y = 0;
    direction.normalize().multiplyScalar(speed * delta);

    candidate.copy(camera.position);
    candidate.x += direction.x;
    if (!blocked(candidate)) camera.position.x = candidate.x;

    candidate.copy(camera.position);
    candidate.z += direction.z;
    if (!blocked(candidate)) camera.position.z = candidate.z;

    camera.position.y = eyeHeight;
  }

  return { update, enterOverview, enterExplore };
}
