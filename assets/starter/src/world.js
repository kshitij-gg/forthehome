import * as THREE from "three";

const MAT = {
  plaster: new THREE.MeshStandardMaterial({ color: 0xd9d2c5, roughness: 0.9 }),
  floor: new THREE.MeshStandardMaterial({ color: 0x8f755a, roughness: 0.72 }),
  stone: new THREE.MeshStandardMaterial({ color: 0xb4aa9b, roughness: 0.78 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x272724, roughness: 0.52 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0xb7aa98, roughness: 0.96 })
};

function box(scene, size, position, material, name) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

export function buildWorld(scene) {
  // This is intentionally a tiny transparent example. Replace from semantic plan.
  box(scene, [8, 0.12, 6], [0, -0.06, 0], MAT.floor, "floor");
  box(scene, [8, 2.8, 0.18], [0, 1.4, -3], MAT.plaster, "wall-north");
  box(scene, [0.18, 2.8, 6], [-4, 1.4, 0], MAT.plaster, "wall-west");
  box(scene, [0.18, 2.8, 6], [4, 1.4, 0], MAT.plaster, "wall-east");

  // Low, modern seating group.
  box(scene, [2.5, 0.42, 0.9], [-1.2, 0.38, 0.65], MAT.fabric, "sofa-seat");
  box(scene, [2.5, 0.72, 0.18], [-1.2, 0.76, 1.02], MAT.fabric, "sofa-back");
  box(scene, [1.25, 0.24, 0.72], [1.25, 0.24, 0.2], MAT.stone, "coffee-table");
  box(scene, [2.5, 0.55, 0.42], [0, 0.28, -2.65], MAT.dark, "media-console");

  const rug = new THREE.Mesh(
    new THREE.BoxGeometry(4.3, 0.025, 2.7),
    new THREE.MeshStandardMaterial({ color: 0xbcb0a0, roughness: 1 })
  );
  rug.position.set(0, 0.02, 0.55);
  rug.receiveShadow = true;
  scene.add(rug);

  return {
    bounds: new THREE.Box3(
      new THREE.Vector3(-3.8, 0, -2.8),
      new THREE.Vector3(3.8, 2.8, 2.8)
    ),
    colliders: [
      new THREE.Box3(new THREE.Vector3(-4.09, 0, -3), new THREE.Vector3(-3.91, 2.8, 3)),
      new THREE.Box3(new THREE.Vector3(3.91, 0, -3), new THREE.Vector3(4.09, 2.8, 3)),
      new THREE.Box3(new THREE.Vector3(-4, 0, -3.09), new THREE.Vector3(4, 2.8, -2.91)),
      new THREE.Box3(new THREE.Vector3(-2.45, 0, 0.2), new THREE.Vector3(0.05, 1.2, 1.2)),
      new THREE.Box3(new THREE.Vector3(0.62, 0, -0.16), new THREE.Vector3(1.88, 0.5, 0.56))
    ]
  };
}
