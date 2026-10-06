// Shared PBR palette — one material instance per finish, reused everywhere.
// Palette intent: ~65% warm white, 20% warm grey, 10% beige/taupe, 5% walnut/charcoal/brass.
import * as THREE from 'three';
import { gen, setTextureScale } from './texPool.js';
import { patchBoxEnv } from '../render/boxenv.js';
import { dirtTexture, flutedNormal, jaaliAlpha, caneSet, leafTexture, radialTexture, softRectTexture, signTexture, artTexture, linearFadeTexture, facadeTile, grassTexture, skylineTexture } from './textures.js';

export const PALETTE = {
  warmWhite: 0xeee8de,
  ceiling: 0xf3f0ea,
  warmGrey: 0xb3aca2,
  greige: 0xcfc6b9,
  beige: 0xd8cbb8,
  taupe: 0x9d8f80,
  walnut: 0x5a3f2c,
  charcoal: 0x2f2f30,
  brass: 0xb08d57,
  tealGrey: 0x7f9895,
};

// quality settings for this device (set by createMaterials) — used to tune materials created later too
let QS = { physical: true, micro: true, aniso: 8 };
/** Per-device material tuning: strips the costly physical lobes on low tiers and enables box-projected reflections. */
export function tuneMaterial(m) {
  if (!m) return m;
  if (m.isMeshPhysicalMaterial) {
    if (m.userData.cc0 === undefined) { m.userData.cc0 = m.clearcoat; m.userData.sh0 = m.sheen; }
    m.clearcoat = QS.physical ? m.userData.cc0 : 0; m.sheen = QS.physical ? m.userData.sh0 : 0;
  }
  patchBoxEnv(m);
  return m;
}
/** Live tier change: clearcoat/sheen on or off for every material in `root` (+ future ones). */
export function setMaterialQuality(q, root) {
  QS = { ...QS, ...q };
  const seen = new Set();
  root?.traverse((o) => { if (!o.material) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (!seen.has(m)) { seen.add(m); if (m.isMeshPhysicalMaterial) { tuneMaterial(m); m.needsUpdate = true; } } }); });
}

export async function createMaterials(renderer, Q = {}) {
  QS = { ...QS, ...Q };
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = {};
  const tex = {};

  // ---------- textures ----------
  // heavy procedural sets are synthesised in parallel on the texture worker pool
  const aniso0 = Math.min(QS.aniso || 8, maxAniso);
  const JOBS = {
    plaster: ['plasterSet', { base: 0xf4f4f4, amp: 0.024, worldSize: 2.5, size: 1024 }],
    oakFloor: ['woodSet', { base: 0xb8926b, dark: 0x8a6545, light: 0xd2b08a, planks: true, plankW: 0.19, worldSize: 2.6, size: 1024, seed: 3 }],
    oakVeneer: ['woodSet', { base: 0xc09a72, dark: 0x936c4a, light: 0xd8b892, planks: false, worldSize: 1.2, size: 1024, seed: 5 }],
    walnut: ['woodSet', { base: 0x6b4a33, dark: 0x40291a, light: 0x8a6446, planks: false, worldSize: 1.2, size: 1024, seed: 9, pores: 0.45 }],
    porcelain: ['tileSet', { base: 0xddd8d0, vein: 0xc2bab0, grout: 0xc9c3ba, tileW: 1.2, tileH: 0.6, worldSize: 2.4, veins: 0.22, cloud: 0.05, speck: 0.02, size: 1024, groutPx: 2, seed: 2 }],
    bathFloor: ['tileSet', { base: 0xb6b1aa, vein: 0xa29c94, grout: 0x9d978f, tileW: 0.6, tileH: 0.6, worldSize: 1.2, veins: 0.05, cloud: 0.08, speck: 0.12, size: 512, groutPx: 2, seed: 5 }],
    bathWall: ['tileSet', { base: 0xd3cec6, vein: 0xbab3a9, grout: 0xc7c1b8, tileW: 0.6, tileH: 1.2, worldSize: 2.4, veins: 0.18, cloud: 0.05, speck: 0.03, size: 512, groutPx: 1, seed: 8 }],
    bathFeature: ['tileSet', { base: 0xa9a097, vein: 0x8f857b, grout: 0x9d948a, tileW: 0.6, tileH: 1.2, worldSize: 2.4, veins: 0.3, cloud: 0.07, speck: 0.03, size: 512, groutPx: 2, seed: 12 }],
    utility: ['tileSet', { base: 0xa8a39c, vein: 0x99938b, grout: 0x8c867f, tileW: 0.3, tileH: 0.3, worldSize: 1.2, veins: 0, cloud: 0.1, speck: 0.2, size: 512, groutPx: 2, seed: 4 }],
    balcony: ['tileSet', { base: 0x9d9993, vein: 0x8f8a84, grout: 0x7f7a74, tileW: 0.6, tileH: 0.6, worldSize: 1.2, veins: 0, cloud: 0.1, speck: 0.25, size: 512, groutPx: 2, seed: 6 }],
    marble: ['tileSet', { base: 0xf1eee8, vein: 0xbdb5ab, grout: 0xe2ddd5, tileW: 1.2, tileH: 1.2, worldSize: 2.4, veins: 0.28, cloud: 0.03, speck: 0, size: 512, groutPx: 1, seed: 21 }],
    lobby: ['tileSet', { base: 0x8e8a85, vein: 0x7a7570, grout: 0x6c6863, tileW: 0.8, tileH: 0.8, worldSize: 1.6, veins: 0.1, cloud: 0.08, speck: 0.4, size: 512, groutPx: 2, seed: 15 }],
    quartz: ['tileSet', { base: 0xd9d1c5, vein: 0xc4baac, grout: 0xd9d1c5, tileW: 3, tileH: 3, worldSize: 1.5, veins: 0.1, cloud: 0.04, speck: 0.2, size: 512, groutPx: 0, seed: 31 }],
    stoneWarm: ['tileSet', { base: 0xa39a90, vein: 0x8d8379, grout: 0x8f867c, tileW: 0.6, tileH: 1.2, worldSize: 2.4, veins: 0.12, cloud: 0.1, speck: 0.1, size: 512, groutPx: 1, seed: 41 }],
    fabricBeige: ['fabricSet', { base: 0xf0f0f0, worldSize: 0.35, weave: 80 }],
    fabricOat: ['fabricSet', { base: 0xf0f0f0, worldSize: 0.35, weave: 90, seed: 4 }],
    fabricTaupe: ['fabricSet', { base: 0xf0f0f0, worldSize: 0.3, weave: 60, slub: 0.12, seed: 7 }],
    fabricGrey: ['fabricSet', { base: 0xf0f0f0, worldSize: 0.35, weave: 70, seed: 3 }],
    linen: ['fabricSet', { base: 0xf2eee7, worldSize: 0.3, weave: 100, slub: 0.05, seed: 13 }],
    rug: ['fabricSet', { base: 0xf0f0f0, worldSize: 0.4, weave: 110, slub: 0.14, seed: 17, twill: true }],
  };
  Object.assign(JOBS, {
    smudge: ['smudgeSet', { size: 512, seed: 5 }],
    brushed: ['brushedSet', { size: 512, seed: 9 }],
    peel: ['peelSet', { size: 512, seed: 4 }],
    leather: ['leatherSet', { size: 512, seed: 6 }],
  });
  const done = await Promise.all(Object.entries(JOBS).map(async ([k, [fn, args]]) => [k, await gen(fn, args, aniso0)]));
  for (const [k, v] of done) tex[k] = v;
  // neutral weaves: the hue lives in material.color so palettes can recolour upholstery
  tex.fabricTeal = tex.fabricTaupe;
  tex.rugGrey = tex.rug;
  tex.fluted = flutedNormal({ pitch: 0.032, worldSize: 0.64 });
  tex.flutedGlass = flutedNormal({ pitch: 0.018, worldSize: 0.36 });
  tex.jaali = jaaliAlpha({ cells: 6, style: 'lattice', size: 1024 });
  tex.jaaliScreen = jaaliAlpha({ cells: 8, style: 'circle' });
  tex.cane = caneSet({});
  tex.leafBroad = leafTexture({ shape: 'broad', color: 0x4a7236 });
  tex.leafNarrow = leafTexture({ shape: 'narrow', color: 0x3f6b33, vein: 0x9cc17a });
  tex.leafFern = leafTexture({ shape: 'fern', color: 0x5b8a3c });
  tex.contact = softRectTexture({ size: 128, margin: 0.3 });
  tex.radial = radialTexture({ size: 128, color: 'rgba(0,0,0,1)' });
  tex.glow = radialTexture({ size: 128, color: 'rgba(255,255,255,1)' });

  for (const t of Object.values(tex)) {
    const list = t.map ? Object.values(t) : [t];
    list.forEach((q) => { if (q && q.isTexture) q.anisotropy = Math.min(QS.aniso || 8, maxAniso); });
  }
  // micro-surface helpers (absent on the low tier → plain values)
  const sm = tex.smudge || {}, br = tex.brushed || {}, pe = tex.peel || {};
  const v2 = (s) => new THREE.Vector2(s, s);
  const glossy = (o, k = 0.86) => (sm.roughnessMap ? { ...o, roughnessMap: sm.roughnessMap, roughness: Math.min(1, o.roughness / k) } : o);
  const brushed = (o) => (br.normalMap ? { ...o, normalMap: br.normalMap, normalScale: v2(0.22), roughnessMap: br.roughnessMap, roughness: Math.min(1, o.roughness / 0.82) } : o);
  const lacquer = (o) => (pe.normalMap ? { ...o, normalMap: pe.normalMap, normalScale: v2(0.12), roughnessMap: pe.roughnessMap, roughness: Math.min(1, o.roughness / 0.88) } : o);

  // ---------- architecture ----------
  const pl = tex.plaster, plaster = (color, rough = 1, ns = 0.35) => std({ color, map: pl.map, normalMap: pl.normalMap, normalScale: v2(ns), roughnessMap: pl.roughnessMap, roughness: rough });
  M.wall = plaster(0xf1ebe1, 1.0, 0.35);
  M.ceiling = plaster(PALETTE.ceiling, 1.0, 0.18);
  M.wallGrey = plaster(0xc4bdb2, 0.98);
  M.wallTeal = plaster(0x9fb2ae, 0.98);
  M.wallBeige = plaster(0xe0d3c0, 1.0);
  M.core = std({ color: 0x8b8781, roughness: 0.95 });
  M.cap = std({ color: 0x3a3836, roughness: 0.9 });
  M.slab = std({ color: 0xbdb8b0, roughness: 0.95 });
  M.exterior = plaster(0xe6e1d8, 1.0, 0.5);
  M.skirting = std(lacquer({ color: 0x8f8880, roughness: 0.6 }));
  M.shadowGap = std({ color: 0x2a2826, roughness: 0.9 });

  // floors
  // stone sets: roughness maps read ~0.78 on the polished face, 1.0 in grout -> material roughness = target / 0.78
  const stone = (s, rough, ns = 0.5, extra = {}) => ({ map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: rough, normalScale: v2(ns), ...extra });
  M.oakFloor = std({ map: tex.oakFloor.map, normalMap: tex.oakFloor.normalMap, roughnessMap: tex.oakFloor.roughnessMap, roughness: 0.78, normalScale: v2(0.55), envMapIntensity: 0.65 });
  M.porcelain = new THREE.MeshPhysicalMaterial({ clearcoat: 0.25, clearcoatRoughness: 0.16, ...stone(tex.porcelain, 0.24, 0.55), envMapIntensity: 0.6 });
  M.bathStone = std(stone(tex.bathFloor, 0.92, 0.6));
  M.bathWall = std(stone(tex.bathWall, 0.42, 0.45, { envMapIntensity: 0.6 }));
  M.bathFeature = std(stone(tex.bathFeature, 0.55, 0.5, { envMapIntensity: 0.5 }));
  M.utility = std(stone(tex.utility, 1.0, 0.6));
  M.balcony = std(stone(tex.balcony, 1.0, 0.7));
  M.marble = new THREE.MeshPhysicalMaterial({ clearcoat: 0.5, clearcoatRoughness: 0.07, ...stone(tex.marble, 0.26, 0.45), envMapIntensity: 0.75 });
  M.lobby = std(stone(tex.lobby, 0.55, 0.5));
  M.threshold = std({ map: tex.marble.map, roughnessMap: tex.marble.roughnessMap, color: 0xe8e2d8, roughness: 0.36 });

  // stone / counters
  M.quartz = std(stone(tex.quartz, 0.34, 0.3, { envMapIntensity: 0.75 }));
  M.stoneWarm = std(stone(tex.stoneWarm, 0.75, 0.5));
  M.microcement = std({ color: 0xb2aaa0, map: pl.map, normalMap: pl.normalMap, normalScale: v2(0.8), roughnessMap: pl.roughnessMap, roughness: 0.88 });
  M.whiteStone = std({ map: tex.marble.map, roughnessMap: tex.marble.roughnessMap, normalMap: tex.marble.normalMap, normalScale: v2(0.3), roughness: 0.3, envMapIntensity: 0.65 });

  // timber
  // veneers: roughness maps ~0.55-0.75 (pores rougher than the lacquered face)
  const ov = tex.oakVeneer, wn = tex.walnut;
  M.oak = std({ map: ov.map, normalMap: ov.normalMap, roughnessMap: ov.roughnessMap, roughness: 0.95, normalScale: v2(0.45) });
  M.walnut = std({ map: wn.map, normalMap: wn.normalMap, roughnessMap: wn.roughnessMap, roughness: 0.85, normalScale: v2(0.45) });
  const rotClones = [];
  const rot = (t) => { const q = t.clone(); q.rotation = Math.PI / 2; q.needsUpdate = true; rotClones.push([q, t]); return q; };
  M.oakV = std({ map: rot(ov.map), normalMap: rot(ov.normalMap), roughnessMap: rot(ov.roughnessMap), roughness: 0.92, normalScale: v2(0.45) });
  M.walnutV = std({ map: rot(wn.map), normalMap: rot(wn.normalMap), roughnessMap: rot(wn.roughnessMap), roughness: 0.82, normalScale: v2(0.45) });
  M.flutedOak = std({ map: rot(ov.map), normalMap: tex.fluted, normalScale: v2(1.6), roughnessMap: rot(ov.roughnessMap), roughness: 0.92 });
  M.flutedLight = std({ color: 0xe9e2d6, normalMap: tex.fluted, normalScale: v2(1.4), roughness: 0.85 });
  M.slatWalnut = std({ map: wn.map, roughnessMap: wn.roughnessMap, roughness: 0.85 });

  // cabinetry (matte)
  M.cabGrey = std(lacquer({ color: 0x8c857d, roughness: 0.6 }));
  M.cabWhite = std(lacquer({ color: 0xece7df, roughness: 0.5 }));
  M.cabTaupe = std(lacquer({ color: 0xa79787, roughness: 0.58 }));
  M.cabBeige = std(lacquer({ color: 0xd3c5b2, roughness: 0.58 }));
  M.cabCharcoal = std(lacquer({ color: 0x3d3b39, roughness: 0.55 }));
  M.carcass = std(lacquer({ color: 0xe6e0d6, roughness: 0.7 }));
  M.cabInterior = std({ color: 0xd9d1c4, roughness: 0.8 });

  // metals
  M.brass = std(brushed({ color: 0xc19a5b, metalness: 1, roughness: 0.3 }));
  M.brassDark = std(brushed({ color: 0x8f7044, metalness: 1, roughness: 0.38 }));
  M.charcoalMetal = std(brushed({ color: 0x2f2f31, metalness: 0.6, roughness: 0.45 }));
  M.blackMetal = std(glossy({ color: 0x1d1d1f, metalness: 0.5, roughness: 0.5 }));
  M.steel = std(brushed({ color: 0xc9cacb, metalness: 1, roughness: 0.26 }));
  M.chrome = std(glossy({ color: 0xf2f2f2, metalness: 1, roughness: 0.07 }));
  M.aluminium = std(brushed({ color: 0x3b3b3d, metalness: 0.55, roughness: 0.42 }));

  // glass & mirrors
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xdfe8ea, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.16, envMapIntensity: 1.0, depthWrite: false, side: THREE.DoubleSide, specularIntensity: 1 });
  M.glassRail = new THREE.MeshPhysicalMaterial({ color: 0xd4e3e3, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
  M.frosted = std({ color: 0xf2f1ec, roughness: 0.55, transparent: true, opacity: 0.86, normalMap: tex.flutedGlass, normalScale: new THREE.Vector2(1.2, 1.2), side: THREE.DoubleSide });
  M.mirror = std({ color: 0xd8dcdc, metalness: 1, roughness: 0.03, envMapIntensity: 1.2 });
  M.smokedMirror = std({ color: 0x6e6a66, metalness: 1, roughness: 0.06, envMapIntensity: 1.0 });
  M.blackGlass = std(glossy({ color: 0x0b0b0c, metalness: 0.2, roughness: 0.08, envMapIntensity: 0.9 }));
  M.screen = std(glossy({ color: 0x050506, metalness: 0.3, roughness: 0.14, envMapIntensity: 0.8 }));

  // fabrics
  // upholstery uses physical sheen (soft fibre highlights) for a woven, non-plastic read
  const fab = (t, rough = 0.95, color = 0xffffff, sheen = 0.55) => new THREE.MeshPhysicalMaterial({ color, map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(0.7, 0.7), roughness: rough, sheen, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xffffff) });
  M.fabricBeige = fab(tex.fabricBeige, 0.95, 0xd8c9b4);
  M.fabricOat = fab(tex.fabricOat, 0.95, 0xe9e1d4);
  M.fabricTaupe = fab(tex.fabricTaupe, 0.95, 0xa3927f);
  M.fabricTeal = fab(tex.fabricTeal, 0.95, 0x86a19d);
  M.fabricGrey = fab(tex.fabricGrey, 0.95, 0xa8a49e);
  M.linen = fab(tex.linen, 0.95);
  M.linenGrey = fab(tex.linen, 0.95, 0xd7d2ca);
  M.throwTaupe = fab(tex.fabricTaupe, 0.97, 0xc9b8a6);
  M.rug = fab(tex.rug, 1, 0xddd2c2, 0.3);
  M.rugGrey = fab(tex.rugGrey, 1, 0xbcb5aa, 0.3);
  M.leather = tex.leather ? std({ color: 0x6a4a35, map: tex.leather.map, normalMap: tex.leather.normalMap, normalScale: v2(0.6), roughnessMap: tex.leather.roughnessMap, roughness: 0.62 }) : std({ color: 0x6a4a35, roughness: 0.55 });
  M.curtain = std({ color: 0xd9cfc1, map: tex.linen.map, normalMap: tex.linen.normalMap, roughness: 0.95, side: THREE.DoubleSide });
  M.sheer = std({ color: 0xf6f3ee, roughness: 0.9, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
  M.cane = std({ map: tex.cane, roughness: 0.8 });
  M.rattan = std({ color: 0xb48a5c, roughness: 0.75 });

  // ceramics & sanitary
  M.ceramic = std(glossy({ color: 0xf7f6f3, roughness: 0.11, envMapIntensity: 0.85 }));
  M.ceramicMatte = std(glossy({ color: 0xe9e4dc, roughness: 0.5 }));
  M.terracotta = std({ color: 0xb37356, roughness: 0.8 });
  M.planterGrey = std({ color: 0x8d8780, map: tex.plaster.map, roughness: 0.85 });
  M.soil = std({ color: 0x3c2e24, roughness: 1 });
  M.black = std({ color: 0x121212, roughness: 0.6 });
  M.white = std({ color: 0xf5f3ef, roughness: 0.5 });
  M.paper = std({ color: 0xece5d8, roughness: 0.9 });

  // foliage
  const leaf = (t) => std({ map: t, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7 });
  M.leafBroad = leaf(tex.leafBroad); M.leafNarrow = leaf(tex.leafNarrow); M.leafFern = leaf(tex.leafFern);
  M.stem = std({ color: 0x4d5e2f, roughness: 0.8 });
  M.bladeGreen = std({ color: 0x3e6a34, roughness: 0.55, side: THREE.DoubleSide, map: tex.fabricGrey.map ? null : null });

  // jaali
  M.jaaliWood = std({ map: rot(tex.oakVeneer.map), alphaMap: tex.jaali, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 });
  M.jaaliWhite = std({ color: 0xf1ece2, alphaMap: tex.jaali, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 });
  M.jaaliScreen = std({ color: 0xe6dfd3, alphaMap: tex.jaaliScreen, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  M.louvre = std({ color: 0x5f5c58, metalness: 0.4, roughness: 0.6 });

  // light-emitting (scene system drives emissiveIntensity)
  const em = (c, i = 1) => std({ color: 0xe6e2da, emissive: c, emissiveIntensity: i, roughness: 0.6, toneMapped: true });
  M.washTex = linearFadeTexture({ color: '#ffffff' });
  M.capFurniture = std({ color: 0x5c5650, roughness: 0.9 });
  M.ledWarm = em(0xffc98a, 2.2); // 2700K
  M.ledNeutral = em(0xfff1dd, 2.0); // 4000K
  M.downlight = em(0xffe3bf, 3.0);
  M.lampShade = std({ color: 0xf1e9dc, emissive: 0xffc98a, emissiveIntensity: 0.0, roughness: 0.9, side: THREE.DoubleSide });
  M.bulbGlass = std({ color: 0xf8f3ea, emissive: 0xffd2a0, emissiveIntensity: 0.0, roughness: 0.3, transparent: true, opacity: 0.92 });
  M.flame = std({ color: 0x000000, emissive: 0xffa33a, emissiveIntensity: 3.0 });
  M.signGreen = std({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 1.2 });
  M.tvOff = M.screen;

  // overlays
  M.contact = new THREE.MeshBasicMaterial({ map: tex.contact, color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  M.glowAdd = new THREE.MeshBasicMaterial({ map: tex.glow, color: 0xffc98a, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

  // artwork materials (procedural canvases in the house palette)
  const artCache = {};
  M.artMat = (style, seed) => {
    const k = style + seed;
    if (!artCache[k]) {
      const palettes = [
        ['#d9cfc2', '#b9a68e', '#7c6957', '#efe9e0', '#5f6b6a'],
        ['#e6ddd0', '#c2ab8f', '#8d7a66', '#f2ede6', '#9aa5a2'],
        ['#d6d0c6', '#a9a093', '#6d6a63', '#ece8e1', '#c79f6e'],
      ];
      artCache[k] = std({ map: artTexture({ style, seed, palette: palettes[seed % 3] }), roughness: 0.85 });
    }
    return artCache[k];
  };

  // signage & context
  const fire = signTexture('EXIT');
  M.fireSign = new THREE.MeshBasicMaterial({ map: fire, toneMapped: false });
  M.liftDisplay = new THREE.MeshBasicMaterial({ map: signTexture('4', { bg: '#120806', fg: '#ff5a2a', w: 256, h: 96 }), toneMapped: false });
  const dirt = dirtTexture({}); dirt.repeat.set(70, 70); dirt.anisotropy = Math.min(QS.aniso || 8, maxAniso);
  dirt.repeat.set(0.25, 0.25); M.earth = std({ map: dirt, roughness: 1 }); // dusty plot (metric UVs: 4 m tiles)
  { const gr = grassTexture({}); gr.repeat.set(90, 90); M.ground = std({ map: gr, color: 0xd9dcb4, roughness: 1 }); } // green, slightly sun-dried
  // neighbourhood (context.js): vertex-coloured plaster walls, windows (some lit at night), tin, tanks, palms
  { const g2 = grassTexture({}); g2.repeat.set(0.25, 0.25); M.lawn = std({ map: g2, color: 0xc8dcb0, roughness: 1 }); }
  M.house = std({ vertexColors: true, map: tex.plaster.map, roughness: 0.96 });
  M.houseGlass = std({ color: 0x1b2024, roughness: 0.22, metalness: 0.1, envMapIntensity: 0.8 });
  M.tin = std({ color: 0x7d8288, metalness: 0.55, roughness: 0.5, normalMap: flutedNormal({ pitch: 0.076, worldSize: 0.76, convex: true }), normalScale: new THREE.Vector2(1.4, 1.4) });
  M.tinDark = std({ color: 0x55595e, metalness: 0.5, roughness: 0.55 });
  M.tank = std({ color: 0x141416, roughness: 0.6 });
  M.palm = std({ color: 0x5c6d34, roughness: 0.8, side: THREE.DoubleSide });
  M.palmDry = std({ color: 0x8a6d45, roughness: 0.95, side: THREE.DoubleSide });
  M.asphalt = std({ color: 0xa2978a, roughness: 1 }); // dusty gravel lanes, as on Wadibhokar Rd
  M.paving = std({ color: 0xa8a39a, roughness: 0.95 });
  const fac = facadeTile({});
  fac.map.repeat.set(1 / 14, 1 / 12.6); fac.emissiveMap.repeat.set(1 / 14, 1 / 12.6);
  M.neighbour = std({ map: fac.map, emissiveMap: fac.emissiveMap, emissive: 0xffc88a, emissiveIntensity: 0, roughness: 0.85 });
  // lit-window material of the neighbourhood (night lighting drives its emission)
  M.neighbourBand = std({ color: 0x23282c, emissive: 0xffc88a, emissiveIntensity: 0, roughness: 0.25, metalness: 0.1 });
  const skyTex = skylineTexture({ w: 2048, h: 256, seed: 6 }); skyTex.repeat.set(6, 1);
  M.skyline = new THREE.MeshStandardMaterial({ map: skyTex, transparent: true, side: THREE.BackSide, roughness: 1, depthWrite: false, color: 0xb9c0c8 });
  M.bark = std({ color: 0x5b4a3c, roughness: 1 });
  M.canopy = std({ color: 0x55703c, roughness: 0.95, map: tex.fabricGrey.map ? null : null });
  M.canopy2 = std({ color: 0x66803f, roughness: 0.95 });
  M.canopy3 = std({ color: 0x4b6834, roughness: 0.95 });

  // architectural lighting hardware
  M.profileLED = new THREE.MeshStandardMaterial({ color: 0xf2efe9, emissive: 0xfff0dc, emissiveIntensity: 0, roughness: 0.4 });
  M.profileTrim = std({ color: 0x2c2c2e, metalness: 0.6, roughness: 0.4 });
  M.spotTrim = std({ color: 0x1e1e20, metalness: 0.5, roughness: 0.45 });
  M.spotLens = new THREE.MeshStandardMaterial({ color: 0xddd8d0, emissive: 0xfff0dc, emissiveIntensity: 0, roughness: 0.3 });

  M._tex = tex;
  // Raise texture detail in the background (no pause): each set is regenerated at the new scale (cached
  // after the first time) and its images swapped into the existing texture objects, one set per tick.
  M.upgradeTextures = async (scale, aniso, onProgress) => {
    setTextureScale(scale);
    const keys = Object.keys(JOBS); let n = 0;
    for (const k of keys) {
      const [fn, args] = JOBS[k];
      const nu = await gen(fn, args, aniso);
      const old = tex[k];
      for (const name of Object.keys(nu)) { const o = old?.[name], v = nu[name]; if (o && o.isTexture && v && v.isTexture) { o.image = v.image; o.anisotropy = Math.min(aniso, maxAniso); o.dispose(); o.needsUpdate = true; } }
      for (const [c, src] of rotClones) if (c.image !== src.image && keys.some((kk) => Object.values(tex[kk] || {}).includes(src))) { c.image = src.image; c.anisotropy = src.anisotropy; c.dispose(); c.needsUpdate = true; }
      onProgress?.(++n / keys.length);
      await new Promise((r) => setTimeout(r, 90)); // spread GPU uploads over time
    }
  };
  M.setAniso = (a) => { QS.aniso = a; };
  for (const m of Object.values(M)) if (m && m.isMaterial) tuneMaterial(m);
  return M;
}
