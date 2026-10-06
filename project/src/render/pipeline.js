// Render pipeline: scene → linear HDR (RenderPass, GTAO, bloom) → output (filmic tone map, grade,
// vignette, dither) → screen.
//
// Two regimes:
//  • moving — one sample per frame at a dynamically scaled resolution (holds the frame rate);
//  • still  — the camera has stopped: frames are jittered (sub-pixel camera offset + a sun position
//    spread over the solar disc) and averaged into an accumulation buffer. After N samples the image
//    is anti-aliased, the sun shadows have true soft penumbrae and AO noise is gone — then rendering
//    stops completely until something changes, so an idle view costs nothing on a weak GPU.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

export function createPipeline({ renderer, scene, camera, Q, sun = null, sunTarget = null }) {
  const hdr = { type: THREE.HalfFloatType, depthBuffer: true };
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { ...hdr, samples: Q.msaa || 0 }));
  composer.renderToScreen = false;
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null, bloom = null;
  {
    try {
      gtao = new GTAOPass(scene, camera, 4, 4);
      gtao.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1.5, thickness: 1.2, scale: 1.25, samples: Q.aoSamples || 12, distanceFallOff: 1.0 });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: Math.max(4, (Q.aoSamples || 12) - 4) });
      gtao.blendIntensity = 1.0;
      composer.addPass(gtao);
    } catch (e) { console.info('GTAO unavailable', e); gtao = null; }
  }
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.2, 0.5, 0.92); composer.addPass(bloom);
  if (gtao) gtao.enabled = Q.ao > 0;
  bloom.enabled = !!Q.bloom;

  // accumulation (ping-pong) + output
  const accA = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false }), accB = accA.clone();
  let accRead = accA, accWrite = accB;
  const accQuad = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { tNew: { value: null }, tAcc: { value: null }, w: { value: 1 } },
    vertexShader: VS,
    fragmentShader: 'uniform sampler2D tNew, tAcc; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = mix(texture2D(tAcc, vUv), texture2D(tNew, vUv), w); }',
    depthTest: false, depthWrite: false,
  }));
  // ---- eye adaptation (GPU only, no read-backs): centre-weighted log-average luminance → 64² → mip 1×1,
  // blended over time into a 1×1 target that the output pass reads. Rooms away from the sun open up,
  // the sunlit living room calms down — like a photographer exposing for each space.
  const lumRT = new THREE.WebGLRenderTarget(64, 64, { type: THREE.HalfFloatType, depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const adA = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false }), adB = adA.clone();
  let adRead = adA, adWrite = adB, autoOn = true;
  const lumQuad = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null } }, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: 'uniform sampler2D tSrc; varying vec2 vUv; void main(){ vec3 c = texture2D(tSrc, vUv).rgb; float l = max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1e-4); float w = 1.0 - 0.75 * smoothstep(0.15, 0.7, length((vUv - 0.5) * vec2(1.4, 1.0))); gl_FragColor = vec4(log(l) * w, w, 0.0, 1.0); }',
  }));
  const adaptQuad = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { tLum: { value: lumRT.texture }, tPrev: { value: null }, uRate: { value: 1 } }, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: 'uniform sampler2D tLum, tPrev; uniform float uRate; varying vec2 vUv; void main(){ vec2 m = textureLod(tLum, vec2(0.5), 6.0).rg; float g = exp(m.r / max(m.g, 1e-4)); float p = texture2D(tPrev, vec2(0.5)).r; gl_FragColor = vec4(p > 0.0 ? mix(p, g, uRate) : g, 0.0, 0.0, 1.0); }',
  }));
  function meter(tex, dt) {
    if (!autoOn) return;
    lumQuad.material.uniforms.tSrc.value = tex;
    renderer.setRenderTarget(lumRT); lumQuad.render(renderer);
    adaptQuad.material.uniforms.tPrev.value = adRead.texture;
    adaptQuad.material.uniforms.uRate.value = 1 - Math.exp(-Math.max(0, dt) / 0.55);
    renderer.setRenderTarget(adWrite); adaptQuad.render(renderer);
    [adRead, adWrite] = [adWrite, adRead];
  }

  const TM = { [THREE.NeutralToneMapping]: 1, [THREE.AgXToneMapping]: 2, [THREE.ACESFilmicToneMapping]: 3 };
  const outMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, tAdapt: { value: null }, uKey: { value: 0.3 }, uAuto: { value: 0.65 }, toneMappingExposure: { value: 1 }, uFrame: { value: 0 }, uVig: { value: 0.22 }, uSat: { value: 1.04 }, uContrast: { value: 0.12 }, uWarm: { value: 0.012 } },
    defines: { TM: TM[renderer.toneMapping] || 1 },
    vertexShader: VS,
    fragmentShader: `
      uniform sampler2D tDiffuse, tAdapt; uniform float uKey, uAuto, uFrame, uVig, uSat, uContrast, uWarm;
      varying vec2 vUv;
      #include <tonemapping_pars_fragment>
      // (colorspace_pars_fragment is already in three's ShaderMaterial prefix)
      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float g = texture2D(tAdapt, vec2(0.5)).r;
        c *= g > 0.0 ? pow(clamp(uKey / g, 0.4, 2.8), uAuto) : 1.0; // partial auto-exposure: rooms keep their mood
        #if TM == 2
          c = AgXToneMapping(c);
        #elif TM == 3
          c = ACESFilmicToneMapping(c);
        #else
          c = NeutralToneMapping(c);
        #endif
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = max(mix(vec3(l), c, uSat), 0.0);
        c *= vec3(1.0 + uWarm, 1.0, 1.0 - uWarm);           // a breath of warmth, like a calibrated archviz grade
        vec4 o = sRGBTransferOETF(vec4(clamp(c, 0.0, 1.0), 1.0));
        o.rgb = mix(o.rgb, o.rgb * o.rgb * (3.0 - 2.0 * o.rgb), uContrast); // gentle filmic S-curve
        vec2 d = vUv - 0.5; o.rgb *= 1.0 - uVig * dot(d, d) * 1.6;           // soft optical vignette
        float n = fract(sin(dot(gl_FragCoord.xy + uFrame * 7.13, vec2(12.9898, 78.233))) * 43758.5453)
                + fract(sin(dot(gl_FragCoord.xy * 1.31 + uFrame * 3.7, vec2(39.3468, 11.1352))) * 24634.6345) - 1.0;
        o.rgb += n / 255.0;                                                   // triangular dither: no banding
        gl_FragColor = vec4(o.rgb, 1.0);
      }`,
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  const outQuad = new FullScreenQuad(outMat);

  // ---- sizing / dynamic resolution ----
  let W = 1, H = 1, PR = Math.min(window.devicePixelRatio || 1, Q.prMax), aoScale = Q.ao > 0 ? Q.ao : 1;
  const applySize = () => {
    if (fixedPR === null) PR = Math.min(PR, devMax()); // never above the device's pixel budget
    renderer.setPixelRatio(PR); renderer.setSize(W, H);
    composer.setPixelRatio(PR); composer.setSize(W, H);
    if (gtao) gtao.setSize(Math.max(2, Math.round(W * PR * aoScale)), Math.max(2, Math.round(H * PR * aoScale)));
    if (bloom) bloom.setSize(Math.round(W * PR / 2), Math.round(H * PR / 2));
    accA.setSize(Math.round(W * PR), Math.round(H * PR)); accB.setSize(Math.round(W * PR), Math.round(H * PR));
    reset();
  };
  const devMax = () => Math.min(window.devicePixelRatio || 1, Q.prMax, Q.maxPixels ? Math.sqrt(Q.maxPixels / Math.max(1, W * H)) : Infinity);
  let fpsAcc = 0, fpsN = 0, fixedPR = null, stillFor = 0;

  // ---- accumulation state ----
  let n = 0, dirty = true, frame = 0;
  const lastView = new THREE.Matrix4(), lastProj = new THREE.Matrix4();
  let autoStrength = 0.65;
  const sunBase = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  function reset() { n = 0; dirty = true; }
  const cameraMoved = () => {
    camera.updateMatrixWorld();
    const m = !lastView.equals(camera.matrixWorld) || !lastProj.equals(camera.projectionMatrix);
    lastView.copy(camera.matrixWorld); lastProj.copy(camera.projectionMatrix);
    return m;
  };

  function renderScene(dt) {
    composer.render(dt);
    const tex = composer.readBuffer.texture;
    meter(tex, dt);
    return tex;
  }
  function output(tex) {
    outMat.uniforms.tDiffuse.value = tex;
    outMat.uniforms.tAdapt.value = autoOn ? adRead.texture : null;
    outMat.uniforms.uAuto.value = autoOn ? autoStrength : 0;
    outMat.uniforms.toneMappingExposure.value = renderer.toneMappingExposure;
    outMat.uniforms.uFrame.value = frame++ % 64;
    renderer.setRenderTarget(null); outQuad.render(renderer);
  }
  function jittered(i, fn) {
    const jx = halton(i + 1, 2) - 0.5, jy = halton(i + 1, 3) - 0.5;
    const w = Math.round(W * PR), h = Math.round(H * PR);
    camera.setViewOffset(w, h, jx, jy, w, h);
    let moved = false;
    if (sun && sunTarget && sun.intensity > 0 && sun.castShadow && Q.shadowSoft !== false) {
      // spread the sun over a ~0.9° disc: physically soft penumbrae once averaged
      sunBase.copy(sun.position);
      const dir = tmpA.subVectors(sun.position, sunTarget.position); const dist = dir.length(); dir.normalize();
      const u = tmpB.set(0, 1, 0).cross(dir).normalize(), v = new THREE.Vector3().crossVectors(dir, u);
      const r = Math.sqrt(halton(i + 1, 5)) * dist * Math.tan(THREE.MathUtils.degToRad(0.9)), a = halton(i + 1, 7) * Math.PI * 2;
      sun.position.addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r);
      renderer.shadowMap.needsUpdate = true; moved = true;
    }
    try { return fn(); } finally {
      camera.clearViewOffset();
      if (moved) { sun.position.copy(sunBase); renderer.shadowMap.needsUpdate = true; }
    }
  }

  const api = {
    composer, gtao, bloom,
    get pixelRatio() { return PR; },
    get samples() { return n; },
    get converged() { return n >= Q.accum; },
    setSize(w, h) { W = Math.max(1, w); H = Math.max(1, h); applySize(); },
    /** Force a fixed pixel ratio (offline recording) or null to return to dynamic resolution. */
    fixPixelRatio(pr) { fixedPR = pr; PR = pr ?? devMax(); applySize(); },
    invalidate: reset,
    /** Compile the AO / bloom shaders in parallel off the main thread (no frame hitch), so a later quality
     *  upgrade finds them ready. Call once after boot, ideally while the user is looking at the scene. */
    async warm() {
      const mats = [];
      for (const pass of [gtao, bloom]) if (pass) for (const v of Object.values(pass)) { if (v && v.isMaterial) mats.push(v); else if (v && v.isShaderMaterial === undefined && typeof v === 'object' && !v.isTexture) { for (const w of Object.values(v)) if (w && w.isMaterial) mats.push(w); } }
      for (const m of bloom ? [...(bloom.separableBlurMaterials || []), ...(bloom.compositeMaterial ? [bloom.compositeMaterial] : [])] : []) if (!mats.includes(m)) mats.push(m);
      const s = new THREE.Scene(), g = new THREE.PlaneGeometry(2, 2);
      for (const m of new Set(mats)) { const q = new THREE.Mesh(g, m); q.frustumCulled = false; s.add(q); }
      try { await renderer.compileAsync(s, new THREE.Camera()); } catch { /* compiled on first use instead */ }
      return mats.length;
    },
    /** Re-read the (mutated) quality settings: AO / bloom on-off, AO scale + samples, MSAA, resolution cap. */
    apply() {
      if (gtao) {
        gtao.enabled = Q.ao > 0; aoScale = Q.ao > 0 ? Q.ao : 1;
        gtao.updateGtaoMaterial({ samples: Q.aoSamples || 12 }); gtao.updatePdMaterial({ samples: Math.max(4, (Q.aoSamples || 12) - 4) });
      }
      bloom.enabled = !!Q.bloom;
      const ms = Q.msaa || 0;
      if (composer.renderTarget1.samples !== ms) { composer.renderTarget1.samples = composer.renderTarget2.samples = ms; composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); }
      if (fixedPR === null) PR = Math.min(PR > 0 ? Math.max(PR, Q.prMin) : 1, devMax());
      applySize();
    },
    shadowsDirty() { renderer.shadowMap.needsUpdate = true; reset(); },
    /** Re-present the current image (accumulated if refining) — e.g. right before reading the canvas. */
    present() { if (n > 0) output(accRead.texture); else output(renderScene(1 / 60)); },
    /** One plain frame straight to the screen (used by the offline recorder/edits). */
    renderDirect(dt = 1 / 30) { output(renderScene(dt)); },
    /** Main-loop entry. Returns false when converged and nothing was drawn. */
    render(dt) {
      if (cameraMoved()) { n = 0; dirty = false; output(renderScene(dt)); return true; }
      if (dirty) { n = 0; dirty = false; }
      if (n >= Q.accum) return false;
      const tex = jittered(n, () => renderScene(dt));
      accQuad.material.uniforms.tNew.value = tex;
      accQuad.material.uniforms.tAcc.value = accRead.texture;
      accQuad.material.uniforms.w.value = 1 / (n + 1);
      renderer.setRenderTarget(accWrite); accQuad.render(renderer);
      [accRead, accWrite] = [accWrite, accRead];
      n++;
      output(accRead.texture);
      return true;
    },
    /** Dynamic resolution: call once per frame with the frame delta while the view is moving. */
    adapt(dt, moving) {
      if (fixedPR !== null) return;
      stillFor = moving ? 0 : stillFor + dt;
      fpsAcc += dt; fpsN++;
      if (fpsAcc < 0.8) return;
      const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
      const max = devMax();
      let next = PR;
      if (!moving) { if (PR < max && stillFor > 1.2) next = max; } // settled → full resolution for the refinement
      else if (fps < 42 && PR > Q.prMin) next = Math.max(Q.prMin, PR - (fps < 28 ? 0.2 : 0.1));
      else if (fps > 57 && PR < max) next = Math.min(max, PR + 0.05);
      if (Math.abs(next - PR) > 0.01) { PR = +next.toFixed(2); applySize(); }
      api.fps = fps;
    },
    fps: 60,
    grade: outMat.uniforms,
    /** Auto-exposure on/off (off for deterministic offline renders) and its target grey key. */
    setAutoExposure(on, key, strength) { autoOn = !!on; if (key != null) outMat.uniforms.uKey.value = key; if (strength != null) autoStrength = strength; },
    readAdapt() { const b = new Uint16Array(4); renderer.readRenderTargetPixels(adRead, 0, 0, 1, 1, b); return THREE.DataUtils.fromHalfFloat(b[0]); },
    setToneMapping(tm) { outMat.defines.TM = TM[tm] || 1; outMat.needsUpdate = true; reset(); },
  };
  return api;
}
