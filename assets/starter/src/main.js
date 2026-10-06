import * as THREE from "three";
import "./style.css";
import { buildWorld } from "./world.js";
import { createNavigation } from "./navigation.js";

const canvas = document.querySelector("#world");
const hint = document.querySelector(".hint");
const exploreButton = document.querySelector("#explore");
const overviewButton = document.querySelector("#overview");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc8c0b3);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.05, 80);
camera.position.set(7.6, 6.1, 7.6);

scene.add(new THREE.HemisphereLight(0xf5eee1, 0x635b50, 1.75));

const sun = new THREE.DirectionalLight(0xfff3dc, 3.0);
sun.position.set(-4, 7, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -10;
sun.shadow.camera.right = 10;
sun.shadow.camera.top = 10;
sun.shadow.camera.bottom = -10;
scene.add(sun);

const { colliders } = buildWorld(scene);
const navigation = createNavigation({
  camera,
  renderer,
  colliders,
  hint,
  exploreButton,
  overviewButton
});

const clock = new THREE.Clock();

function render() {
  navigation.update(Math.min(clock.getDelta(), 0.05));
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
render();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
