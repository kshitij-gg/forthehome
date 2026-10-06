// Device quality tiers. The tier is chosen once at boot (GPU string, memory, cores, mobile), can be
// overridden with ?q=low|medium|high|ultra or from the Studio (saved), and every expensive feature
// reads its budget from here: resolution, AA, AO, bloom, shadows, light count, texture size, mirrors.
// Within a tier, the pipeline still scales resolution dynamically to hold the frame rate.
// Shader-affecting settings (light counts, clearcoat/sheen) are the SAME on every tier, so changing tier
// live never recompiles shaders (a rebuild of ~190 programs took 25+ s). Tiers differ only in resolution,
// AO, bloom, MSAA, shadow + probe size, mirrors, texture detail and refinement length.

export const TIERS = {
  low: {
    rects: 1, probeCache: 8,
    label: 'Low', prMax: 1.0, prMin: 0.55, msaa: 0, ao: 0, aoSamples: 0, bloom: false,
    shadow: 1024, shadowSoft: false, points: 5, spots: 4, tex: 0.5, aniso: 2, mirrors: 0,
    physical: true, accum: 16, probe: 128, micro: false,
  },
  medium: {
    rects: 1, probeCache: 12,
    label: 'Medium', prMax: 1.25, prMin: 0.65, msaa: 0, ao: 0.5, aoSamples: 8, bloom: true,
    shadow: 2048, shadowSoft: true, points: 5, spots: 4, tex: 0.75, aniso: 4, mirrors: 256,
    physical: true, accum: 32, probe: 256, micro: true,
  },
  high: {
    rects: 1, probeCache: 24,
    label: 'High', prMax: 1.6, prMin: 0.8, msaa: 4, ao: 1, aoSamples: 12, bloom: true,
    shadow: 4096, shadowSoft: true, points: 5, spots: 4, tex: 1, aniso: 8, mirrors: 512,
    physical: true, accum: 64, probe: 256, micro: true,
  },
  ultra: {
    rects: 1, probeCache: 48,
    label: 'Ultra', prMax: 2.0, prMin: 0.9, msaa: 4, ao: 1, aoSamples: 16, bloom: true,
    shadow: 4096, shadowSoft: true, points: 5, spots: 4, tex: 1.25, aniso: 16, mirrors: 768,
    physical: true, accum: 128, probe: 512, micro: true,
  },
};
export const TIER_ORDER = ['low', 'medium', 'high', 'ultra'];
const KEY = 'residence-quality', CAP_KEY = 'residence-quality-cap';

/** Settings for a tier on this kind of device (phones get a frame cap and smaller shadows/probes). */
export function settingsFor(tier, mobile) {
  const settings = { ...TIERS[tier] };
  settings.physical = !mobile; // fixed per device (not per tier): phones skip clearcoat/sheen from the start
  if (mobile) {
    settings.maxFps = 30;                                  // phones: steady 30 fps, cool and battery-friendly
    // phones have 2-3x pixel density: rendering at 1x looked blurry. Render near native density, but within a
    // per-tier pixel budget (so a big phone screen never costs more than ~1-2.5 MP), then scale down if slow.
    settings.prMax = 2;
    settings.maxPixels = { low: 1.2e6, medium: 1.8e6, high: 2.6e6, ultra: 3.2e6 }[tier];
    settings.tex = Math.max(settings.tex, 0.75);           // 0.5x textures look soft on a sharp phone screen
    settings.aniso = Math.max(settings.aniso, 4);
    settings.accum = Math.min(settings.accum, 16);         // short refinement, then the GPU rests
    settings.shadow = Math.min(settings.shadow, 1024);
    settings.probe = Math.min(settings.probe, 128);
    settings.mirrors = 0;
  }
  return settings;
}

function gpuString() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { gpu: '', webgl2: false };
    const d = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = String(d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    const webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { gpu, webgl2 };
  } catch { return { gpu: '', webgl2: false }; }
}

/** Pick a tier for this device. Returns { tier, settings, gpu, reason }. */
export function detectQuality() {
  const { gpu, webgl2 } = gpuString();
  let forced = null;
  try { forced = new URLSearchParams(location.search).get('q'); } catch { /* no location */ }
  if (!TIERS[forced]) { try { forced = localStorage.getItem(KEY); } catch { forced = null; } }
  const g = gpu.toLowerCase();
  const ua = navigator.userAgent || '';
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820);
  const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 4;
  let tier = 'high', reason = 'desktop GPU';
  if (!webgl2 || /swiftshader|llvmpipe|software|basic render|microsoft basic/.test(g)) { tier = 'low'; reason = 'software / WebGL1'; }
  else if (mobile) {
    const strong = /apple gpu|apple a1[6-9]|adreno \(tm\) (7[3-9]\d|8\d\d)|adreno.*(7[3-9]\d|8\d\d)|mali-g7[1-9]|mali-g[89]\d|immortalis/.test(g);
    tier = strong ? 'medium' : 'low'; reason = strong ? 'recent mobile GPU' : 'mobile GPU';
  } else if (/intel|uhd|iris|hd graphics|mali|adreno|powervr|radeon\(tm\) graphics|radeon graphics|vega \d+ graphics/.test(g)) { tier = 'medium'; reason = 'integrated GPU'; }
  else if (/rtx ?(30[789]0|40[6789]0|50\d0)|rx ?(6[89]\d0|7[6-9]\d0|9\d\d0)|apple m[1-5] (pro|max|ultra)|radeon pro w/.test(g)) { tier = 'ultra'; reason = 'high-end GPU'; }
  if (tier !== 'low' && (mem <= 4 || cores <= 4)) { tier = TIER_ORDER[TIER_ORDER.indexOf(tier) - 1]; reason += ', limited memory/CPU'; }
  // a device that could not hold its frame rate last time starts one tier lower (only for Auto)
  let cap = null; try { cap = localStorage.getItem(CAP_KEY); } catch { cap = null; }
  if (TIERS[cap] && TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(cap)) { tier = cap; reason += ', stepped down after slow frames'; }
  if (TIERS[forced]) { tier = forced; reason = 'chosen'; }
  // The first frame always opens on Low (fast start). A tier chosen earlier (?q= or saved) is honoured;
  // otherwise Auto boots on Low and `recommended` is what this device can comfortably upgrade to.
  const chosen = TIERS[forced] ? forced : null;
  const boot = chosen || 'low';
  return { tier: boot, recommended: tier, settings: settingsFor(boot, mobile), gpu, reason, auto: !chosen, mobile };
}

export function saveQuality(tier) { try { if (tier === 'auto') { localStorage.removeItem(KEY); localStorage.removeItem(CAP_KEY); } else localStorage.setItem(KEY, tier); } catch { /* storage unavailable */ } }
/** Remember that Auto should start at most at `tier` on this device (set by the frame-rate watchdog). */
export function capQuality(tier) { try { localStorage.setItem(CAP_KEY, tier); } catch { /* storage unavailable */ } }
