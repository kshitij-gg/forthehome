// Box-projected (parallax-corrected) environment reflections.
// The room probe is a cube map captured at one point; sampled naively it behaves as if the room were
// infinitely far away, so reflections "swim" and windows land in the wrong place on a glossy floor.
// Intersecting the reflection ray with the room's box and re-aiming it from the probe position puts
// every reflected wall, window and lamp where it belongs. One shared uniform set drives all materials.
import * as THREE from 'three';

export const boxEnv = {
  uBoxMin: { value: new THREE.Vector3(-1e4, -1e4, -1e4) },
  uBoxMax: { value: new THREE.Vector3(1e4, 1e4, 1e4) },
  uProbePos: { value: new THREE.Vector3() },
  uBoxEnvOn: { value: 0 },
};

const VERT_DECL = 'varying vec3 vBoxPos;\n';
const VERT_BODY = `#include <worldpos_vertex>
	vec4 bxp = vec4( transformed, 1.0 );
	#ifdef USE_INSTANCING
		bxp = instanceMatrix * bxp;
	#endif
	vBoxPos = ( modelMatrix * bxp ).xyz;`;
const FRAG_DECL = 'varying vec3 vBoxPos;\nuniform vec3 uBoxMin, uBoxMax, uProbePos;\nuniform float uBoxEnvOn;\n';
const FRAG_FIX = `reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			if ( uBoxEnvOn > 0.5 ) {
				vec3 rv = reflectVec + sign( reflectVec ) * 1e-5;
				vec3 tMax = ( uBoxMax - vBoxPos ) / rv, tMin = ( uBoxMin - vBoxPos ) / rv;
				vec3 tFar = max( tMax, tMin );
				float tHit = min( min( tFar.x, tFar.y ), tFar.z );
				vec3 inBox = step( uBoxMin, vBoxPos ) * step( vBoxPos, uBoxMax );
				float inside = inBox.x * inBox.y * inBox.z;
				vec3 corrected = normalize( vBoxPos + reflectVec * tHit - uProbePos );
				reflectVec = normalize( mix( reflectVec, corrected, inside * ( 1.0 - roughness * 0.5 ) ) );
			}`;

const patched = new WeakSet();
function onCompile(shader) {
  if (!shader.fragmentShader.includes('#include <envmap_physical_pars_fragment>')) return;
  Object.assign(shader.uniforms, boxEnv);
  shader.vertexShader = VERT_DECL + shader.vertexShader.replace('#include <worldpos_vertex>', VERT_BODY);
  shader.fragmentShader = FRAG_DECL + shader.fragmentShader.replace('#include <envmap_physical_pars_fragment>',
    THREE.ShaderChunk.envmap_physical_pars_fragment.replace('reflectVec = inverseTransformDirection( reflectVec, viewMatrix );', FRAG_FIX));
}
const cacheKey = () => 'boxenv1';

/** Patch one material (MeshStandard/Physical only; materials with their own hooks are left alone). */
export function patchBoxEnv(m) {
  if (!m || !m.isMeshStandardMaterial || patched.has(m)) return;
  if (m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) return;
  patched.add(m);
  m.onBeforeCompile = onCompile;
  m.customProgramCacheKey = cacheKey;
  m.needsUpdate = true;
}
export function patchSceneBoxEnv(root) {
  root.traverse((o) => { if (!o.material) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(patchBoxEnv); });
}
/** Set the active room box (world coords) and the probe position; on=false → plain infinite projection. */
export function setBoxEnv(on, min, max, probe) {
  boxEnv.uBoxEnvOn.value = on ? 1 : 0;
  if (min) boxEnv.uBoxMin.value.copy(min);
  if (max) boxEnv.uBoxMax.value.copy(max);
  if (probe) boxEnv.uProbePos.value.copy(probe);
}
