// Design engine: curated colour palettes (per room / per surface), paint linings, floor finishes.
import * as THREE from 'three';
import { walls, floors } from '../data/floorplan.ts';
import { wallPieces } from '../architecture/building.js';
import { planBoxGeo, merge } from '../utils/geom.js';
import { gen } from '../materials/texPool.js';
import { tuneMaterial } from '../materials/materials.js';
import { designConfig as DC } from '../data/designConfig.ts';

// ------------------------------------------------------------------ palettes
export const PALETTES = [
  { id: 'beige', name: 'Timeless Beige', note: 'Soft luxurious neutrals, greige and warm taupe',
    wall: 0xefe8dd, accent: 0xcbbca9, upholstery: 0xd8c9b4, soft: 0xa3927f, cabinet: 0xa99886, kitchen: 0x8c857d, rug: 0xddd2c2, curtain: 0xdcd2c3 },
  { id: 'blue', name: 'Sophisticated Blue', note: 'Dusty slate blues balanced with oat and camel',
    wall: 0xe9ecee, accent: 0x6f8698, upholstery: 0x8c9fb0, soft: 0xc2a27c, cabinet: 0x3f5568, kitchen: 0x34495b, rug: 0xd2d8dc, curtain: 0xe3e6e8 },
  { id: 'green', name: 'Nature Green', note: 'Calming sage and olive with linen and oak',
    wall: 0xeceae0, accent: 0x93a283, upholstery: 0xb0b69b, soft: 0x6f7b57, cabinet: 0x66755a, kitchen: 0x58664d, rug: 0xdad6c5, curtain: 0xe6e3d4 },
  { id: 'grey', name: 'Modern Grey', note: 'Layered greys with charcoal contrast',
    wall: 0xe9e8e6, accent: 0x77777a, upholstery: 0xaeada9, soft: 0x4d4d50, cabinet: 0x5f5f62, kitchen: 0x4a4a4d, rug: 0xc2c0bc, curtain: 0xdfdedb },
  { id: 'brown', name: 'Earthy Brown', note: 'Cocoa, camel and rust with wood-led warmth',
    wall: 0xece2d4, accent: 0x8e6d52, upholstery: 0xbda283, soft: 0x7c4f37, cabinet: 0x6e503a, kitchen: 0x5d4330, rug: 0xcfbaa2, curtain: 0xdac7ae },
  { id: 'terracotta', name: 'Sand & Terracotta', note: 'Sun-baked terracotta with sand and ivory',
    wall: 0xf1e7da, accent: 0xc27c5b, upholstery: 0xe2d3bd, soft: 0xb3664a, cabinet: 0xcab59b, kitchen: 0x9e6f55, rug: 0xe1cdb4, curtain: 0xebdcc8 },
  // ---- research-led additions (2026 paint trends + classic style palettes) ----
  { id: 'cloud', name: 'Cloud Dancer', note: 'Soft architectural white, layered ivories and pale oak',
    wall: 0xf0eee9, accent: 0xdcd5c8, upholstery: 0xe6e0d4, soft: 0xb9ad9a, cabinet: 0xdad2c4, kitchen: 0xcfc7b8, rug: 0xe8e2d6, curtain: 0xf2efe9 },
  { id: 'espresso', name: 'Silhouette Espresso', note: 'Deep espresso browns with charcoal undertones and cream',
    wall: 0xe7ddd0, accent: 0x5b4a3f, upholstery: 0x8a7462, soft: 0x4a3a30, cabinet: 0x5b4a3f, kitchen: 0x4b3d34, rug: 0xc8b6a0, curtain: 0xd9cbb8 },
  { id: 'moss', name: 'Mountain Moss', note: 'Muddled moss and card-room greens, grounded and warm',
    wall: 0xe6e3d6, accent: 0x6f7562, upholstery: 0x9a9d82, soft: 0x5c6148, cabinet: 0x6a7058, kitchen: 0x585e48, rug: 0xd3cfbd, curtain: 0xe0dccb },
  { id: 'plum', name: 'Plum & Peignoir', note: 'Carter plum depth with smoky mauve softness',
    wall: 0xe9e0de, accent: 0x6b4552, upholstery: 0xc9b5b3, soft: 0x5e3d4a, cabinet: 0x7a5a63, kitchen: 0x5e4650, rug: 0xd8cac6, curtain: 0xe6dad8 },
  { id: 'hague', name: 'Hague Navy', note: 'Moody inky navy with brass and warm stone',
    wall: 0xe7e5e0, accent: 0x3a4b54, upholstery: 0x5a6b74, soft: 0xb8956a, cabinet: 0x34444d, kitchen: 0x2f3d45, rug: 0xcfcdc6, curtain: 0xdedcd6 },
  { id: 'japandi', name: 'Japandi', note: 'Rice-paper neutrals, ash oak and quiet olive',
    wall: 0xeee8de, accent: 0xc9b9a3, upholstery: 0xd9cdbb, soft: 0x6f6a58, cabinet: 0xb79a78, kitchen: 0x8a7a66, rug: 0xe3dace, curtain: 0xefe8dc },
  { id: 'mediterranean', name: 'Mediterranean', note: 'Sun-washed lime, sage and Aegean blue',
    wall: 0xf3ece0, accent: 0x8fa28a, upholstery: 0xe8dcc6, soft: 0x2f6f8f, cabinet: 0x9caf98, kitchen: 0x7d9278, rug: 0xe6d8c0, curtain: 0xf1e8da },
  { id: 'artdeco', name: 'Art Deco', note: 'Emerald, lacquer black and burnished brass',
    wall: 0xe9e2d6, accent: 0x1f4d43, upholstery: 0x2e5e52, soft: 0xb08d57, cabinet: 0x1d1d1f, kitchen: 0x23272a, rug: 0xd6cab4, curtain: 0xe2d8c6 },
  { id: 'heritage', name: 'Indian Heritage', note: 'Sandstone, peacock teal, marigold and sheesham',
    wall: 0xf1e6d2, accent: 0x1f6f78, upholstery: 0xd9b98a, soft: 0xd98b2b, cabinet: 0x8a5a3c, kitchen: 0x6f4a32, rug: 0xc9733f, curtain: 0xefdcc0 },
  { id: 'wabisabi', name: 'Wabi-Sabi Clay', note: 'Limewash clay, raw linen and smoked timber',
    wall: 0xe4d8c6, accent: 0xb8957a, upholstery: 0xd6c8b4, soft: 0x8c7a66, cabinet: 0xa58a6e, kitchen: 0x8f7a64, rug: 0xd9ccb8, curtain: 0xe8dfd0 },
];

export const SURFACES = [
  { id: 'wall', name: 'Walls' },
  { id: 'accent', name: 'Feature walls' },
  { id: 'upholstery', name: 'Upholstery' },
  { id: 'soft', name: 'Cushions & throws' },
  { id: 'cabinet', name: 'Cabinetry' },
  { id: 'rug', name: 'Rugs' },
  { id: 'curtain', name: 'Curtains' },
];

// Rooms the user can target (scopes). `rooms` = registry/paint-zone ids belonging to the scope.
export const SCOPES = [
  { id: 'hall', name: 'Living', rooms: ['hall'] },
  { id: 'dining', name: 'Dining', rooms: ['dining'] },
  { id: 'kitchen', name: 'Kitchen', rooms: ['kitchen'] },
  { id: 'mbed', name: 'Master Bed', rooms: ['mbed'] },
  { id: 'chbed', name: "Kids' Bed", rooms: ['chbed', 'chrm'] },
  { id: 'office', name: 'Office', rooms: ['office'] },
  { id: 'entry', name: 'Entry & Deoghar', rooms: ['entry'] },
  { id: 'corridor', name: 'Corridor', rooms: ['corridor'] },
  { id: 'washing', name: 'Utility', rooms: ['washing'] },
];

const DEFAULT_PALETTE = { hall: 'beige', dining: 'beige', kitchen: 'beige', mbed: 'beige', chbed: 'blue', office: 'grey', entry: 'beige', corridor: 'beige', washing: 'beige' };

// Non-overlapping paint zones (so no two linings ever share a wall face → no z-fighting)
const ZONES = [
  ['mbed', [0, 1.258, 3.3528, 5.2204]],
  ['chbed', [0, 8.1262, 4.4958, 11.7838]],
  ['chrm', [4.5958, 7.708, 6.3484, 9.3082]],
  ['office', [10.5646, 7.9738, 13.6126, 11.7838]],
  ['corridor', [2.386, 5.3204, 3.3528, 8.0112]],
  ['corridor', [3.3528, 6.70, 4.2686, 7.593]],
  ['dining', [3.4678, 1.3954, 6.4784, 4.0116]],
  ['hall', [4.2686, 4.0116, 9.9328, 7.593]],
  ['hall', [3.4678, 4.0116, 4.2686, 6.70]],
  ['kitchen', [6.4784, 0, 9.9328, 4.0116]],
  ['entry', [9.9328, 6.5784, 11.70, 7.8738]],
  ['washing', [3.4678, 0, 6.3634, 1.2954]],
];

// furniture/finish base materials → themeable surface slot
const SLOT_OF = (M) => new Map([
  [M.fabricBeige, 'upholstery'], [M.fabricGrey, 'upholstery'], [M.fabricOat, 'upholsteryLight'],
  [M.fabricTeal, 'soft'], [M.fabricTaupe, 'soft'], [M.throwTaupe, 'softLight'],
  [M.cabTaupe, 'cabinet'], [M.cabBeige, 'cabinetLight'], [M.cabGrey, 'kitchen'],
  [M.rug, 'rug'], [M.rugGrey, 'rugDeep'],
  [M.curtain, 'curtain'],
  [M.wallTeal, 'accent'], [M.microcement, 'accent'],
]);
const SURFACE_OF_SLOT = { upholstery: 'upholstery', upholsteryLight: 'upholstery', soft: 'soft', softLight: 'soft', cabinet: 'cabinet', cabinetLight: 'cabinet', kitchen: 'cabinet', rug: 'rug', rugDeep: 'rug', curtain: 'curtain', accent: 'accent', wall: 'wall' };

function slotColor(p, slot) {
  const c = new THREE.Color();
  switch (slot) {
    case 'upholsteryLight': return c.set(p.upholstery).lerp(new THREE.Color(0xffffff), 0.42);
    case 'softLight': return c.set(p.soft).lerp(new THREE.Color(0xffffff), 0.45);
    case 'cabinetLight': return c.set(p.cabinet).lerp(new THREE.Color(0xffffff), 0.45);
    case 'rugDeep': return c.set(p.rug).multiplyScalar(0.86);
    default: return c.set(p[slot]);
  }
}

// ------------------------------------------------------------------ floors
export const FLOOR_OPTIONS = [
  { id: 'porcelain', name: 'Warm Grey Porcelain', kind: 'Porcelain 1200×600' },
  { id: 'statuario', name: 'Statuario Marble', kind: 'Polished marble' },
  { id: 'travertine', name: 'Travertine', kind: 'Honed natural stone' },
  { id: 'concrete', name: 'Concrete Grey', kind: 'Porcelain 1200×1200' },
  { id: 'terrazzo', name: 'Ivory Terrazzo', kind: 'Polished terrazzo' },
  { id: 'nero', name: 'Nero Marquina', kind: 'Polished black marble' },
  { id: 'oak', name: 'Natural Oak', kind: 'Engineered oak planks' },
  { id: 'chevron', name: 'Walnut Chevron', kind: 'Chevron parquet' },
  { id: 'herringbone', name: 'Oak Herringbone', kind: 'Herringbone parquet' },
  { id: 'calacatta', name: 'Calacatta Gold', kind: 'Book-matched marble' },
  { id: 'emperador', name: 'Emperador Dark', kind: 'Polished brown marble' },
  { id: 'onyx', name: 'Honey Onyx', kind: 'Translucent onyx slab' },
  { id: 'checker', name: 'Marble Checker', kind: 'Statuario + Nero 600 mm' },
  { id: 'kota', name: 'Kota Stone', kind: 'Honed Indian limestone' },
  { id: 'jaisalmer', name: 'Jaisalmer Gold', kind: 'Yellow sandstone' },
  { id: 'microcement', name: 'Microcement', kind: 'Seamless trowelled finish' },
  { id: 'zellige', name: 'Sage Zellige', kind: 'Hand-made glazed tile' },
  { id: 'hexclay', name: 'Terracotta Hex', kind: 'Handmade clay hexagons' },
  { id: 'encaustic', name: 'Encaustic Cement', kind: 'Patterned cement tile' },
];
export const FLOOR_SCOPES = [
  { id: 'living', name: 'All living areas', rooms: ['hall', 'dining', 'kitchen', 'corridor', 'entry'] },
  { id: 'hall', name: 'Living', rooms: ['hall'] },
  { id: 'dining', name: 'Dining', rooms: ['dining'] },
  { id: 'kitchen', name: 'Kitchen', rooms: ['kitchen'] },
  { id: 'entry', name: 'Entry', rooms: ['entry'] },
  { id: 'corridor', name: 'Corridor', rooms: ['corridor'] },
  { id: 'bedrooms', name: 'All bedrooms', rooms: ['mbed', 'chbed', 'office'] },
  { id: 'mbed', name: 'Master Bed', rooms: ['mbed'] },
  { id: 'chbed', name: "Kids' Bed", rooms: ['chbed'] },
  { id: 'office', name: 'Office', rooms: ['office'] },
];
// ------------------------------------------------------------------ house styles (whole-home presets)
// Each style sets a palette per room, a finish per floor zone and a lighting scene (applied by the Studio).
const ALL_ROOMS = ['hall', 'dining', 'kitchen', 'mbed', 'chbed', 'office', 'entry', 'corridor', 'washing'];
const pals = (base, over = {}) => Object.fromEntries(ALL_ROOMS.map((r) => [r, over[r] || base]));
const floorsOf = (living, beds, over = {}) => ({ hall: living, dining: living, kitchen: living, corridor: living, entry: living, mbed: beds, chbed: beds, office: beds, ...over });
export const HOUSE_STYLES = [
  { id: 'original', name: 'Original', note: 'The as-designed warm contemporary scheme', pal: pals('beige', { chbed: 'blue', office: 'grey' }), floors: floorsOf('porcelain', 'oak'), light: { mode: 'day', time: 15.5, dayLights: false, coveColor: null } },
  { id: 'modernluxe', name: 'Modern Luxe', note: 'Espresso, Calacatta and walnut, lit warm', pal: pals('espresso', { chbed: 'cloud', office: 'hague', kitchen: 'hague' }), floors: floorsOf('calacatta', 'chevron'), light: { mode: 'night', style: 'warm', kelvin: 2700, brightness: 1, coveColor: null } },
  { id: 'japandi', name: 'Japandi', note: 'Ash oak, rice-paper walls, olive accents', pal: pals('japandi', { chbed: 'moss' }), floors: floorsOf('oak', 'oak'), light: { mode: 'day', time: 10.5, dayLights: false, coveColor: null } },
  { id: 'mediterranean', name: 'Mediterranean', note: 'Lime, sage, terracotta hex and zellige', pal: pals('mediterranean'), floors: floorsOf('hexclay', 'oak', { kitchen: 'zellige', entry: 'encaustic' }), light: { mode: 'day', time: 17.4, dayLights: true, coveColor: null } },
  { id: 'indian', name: 'Indian Contemporary', note: 'Sandstone, Kota, sheesham and marigold', pal: pals('heritage', { chbed: 'terracotta' }), floors: floorsOf('jaisalmer', 'chevron', { kitchen: 'kota', entry: 'onyx' }), light: { mode: 'night', style: 'amber', kelvin: 2400, brightness: 1, coveColor: 0xffa040 } },
  { id: 'artdeco', name: 'Art Deco', note: 'Emerald lacquer, checker marble, brass', pal: pals('artdeco', { chbed: 'plum' }), floors: floorsOf('checker', 'chevron'), light: { mode: 'night', style: 'warm', kelvin: 2700, brightness: 1.05, coveColor: 0xffc06a } },
  { id: 'wabisabi', name: 'Wabi-Sabi', note: 'Limewash clay over seamless microcement', pal: pals('wabisabi'), floors: floorsOf('microcement', 'oak'), light: { mode: 'day', time: 16.6, dayLights: false, coveColor: null } },
  { id: 'scandi', name: 'Scandinavian', note: 'Cloud-white, pale oak and terrazzo light', pal: pals('cloud', { chbed: 'blue' }), floors: floorsOf('terrazzo', 'oak'), light: { mode: 'day', time: 11.5, dayLights: false, coveColor: null } },
  { id: 'moody', name: 'Moody Botanical', note: 'Moss and plum over oak herringbone', pal: pals('moss', { mbed: 'plum', office: 'hague' }), floors: floorsOf('herringbone', 'herringbone'), light: { mode: 'night', style: 'warm', kelvin: 2600, brightness: 0.85, coveColor: null } },
  { id: 'parisian', name: 'Parisian Salon', note: 'Mauve plaster, herringbone and Calacatta', pal: pals('plum', { kitchen: 'cloud', office: 'cloud' }), floors: floorsOf('herringbone', 'herringbone', { kitchen: 'calacatta' }), light: { mode: 'day', time: 14.5, dayLights: true, coveColor: null } },
];

const DEFAULT_FLOOR = { hall: 'porcelain', dining: 'porcelain', kitchen: 'porcelain', corridor: 'porcelain', entry: 'porcelain', mbed: 'oak', chbed: 'oak', office: 'oak' };

export function createDesign(M, arch, registry, renderer) {
  const api = {};
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  // ---------- per-room material clones ----------
  const slotOf = SLOT_OF(M);
  const clones = {}; // room -> slot -> material
  const getClone = (room, slot, base) => {
    clones[room] ||= {};
    if (!clones[room][slot]) { const m = base.clone(); m.name = `${room}:${slot}`; clones[room][slot] = m; }
    return clones[room][slot];
  };
  const themeRoomOf = (room) => (room === 'chrm' ? 'chbed' : room);
  for (const it of registry) {
    const room = themeRoomOf(it.room);
    if (!DEFAULT_PALETTE[room]) continue;
    it.obj.traverse((o) => {
      if (!o.isMesh) return;
      const slot = slotOf.get(o.material);
      if (slot) o.material = getClone(room, slot, o.material);
    });
  }

  // ---------- paint linings (one mesh per zone, own material) ----------
  const linings = new THREE.Group(); linings.name = 'paint';
  const allPieces = walls.flatMap((w) => wallPieces(w).map((p) => ({ ...p, wall: w })));
  const T = 0.0025, EPS = 0.012;
  const ov = (a0, a1, b0, b1) => [Math.max(a0, b0), Math.min(a1, b1)];
  const zoneGeos = {};
  for (const [room, [x0, y0, x1, y1]] of ZONES) {
    const geos = (zoneGeos[room] ||= []);
    const add = (rect, z0, z1) => { if (rect[2] - rect[0] > 1e-3 && rect[3] - rect[1] > 1e-3 && z1 - z0 > 1e-3) geos.push(planBoxGeo(rect, z0, Math.min(z1, DC.wallHeight))); };
    for (const p of allPieces) {
      const [a, b, c, d] = p.rect;
      // faces coinciding with the zone boundary (wall outside the zone)
      if (Math.abs(d - y0) < EPS) { const [s, e] = ov(a, c, x0, x1); if (e > s) add([s, y0, e, y0 + T], p.z0, p.z1); }
      if (Math.abs(b - y1) < EPS) { const [s, e] = ov(a, c, x0, x1); if (e > s) add([s, y1 - T, e, y1], p.z0, p.z1); }
      if (Math.abs(c - x0) < EPS) { const [s, e] = ov(b, d, y0, y1); if (e > s) add([x0, s, x0 + T, e], p.z0, p.z1); }
      if (Math.abs(a - x1) < EPS) { const [s, e] = ov(b, d, y0, y1); if (e > s) add([x1 - T, s, x1, e], p.z0, p.z1); }
      // pieces standing inside the zone (columns, wall ends): wrap their inner faces
      const inside = a < x1 - EPS && c > x0 + EPS && b < y1 - EPS && d > y0 + EPS;
      if (inside) {
        const cx0 = Math.max(a, x0), cx1 = Math.min(c, x1), cy0 = Math.max(b, y0), cy1 = Math.min(d, y1);
        if (b > y0 + EPS) add([cx0, b - T, cx1, b], p.z0, p.z1);
        if (d < y1 - EPS) add([cx0, d, cx1, d + T], p.z0, p.z1);
        if (a > x0 + EPS) add([a - T, cy0, a, cy1], p.z0, p.z1);
        if (c < x1 - EPS) add([c, cy0, c + T, cy1], p.z0, p.z1);
      }
    }
  }
  const paintMats = {};
  for (const [room, geos] of Object.entries(zoneGeos)) {
    if (!geos.length) continue;
    const key = themeRoomOf(room);
    const mat = (paintMats[key] ||= (() => { const m = M.wall.clone(); m.name = `${key}:wall`; return m; })());
    const mesh = new THREE.Mesh(merge(geos), mat); mesh.receiveShadow = true; mesh.castShadow = false; mesh.name = 'paint_' + room;
    linings.add(mesh);
  }
  arch.root.add(linings);
  linings.userData.dynamic = true;

  // ---------- palette application ----------
  const state = { palette: { ...DEFAULT_PALETTE }, surfaces: {}, floor: { ...DEFAULT_FLOOR } };
  for (const r of Object.keys(DEFAULT_PALETTE)) state.surfaces[r] = Object.fromEntries(SURFACES.map((s) => [s.id, DEFAULT_PALETTE[r]]));
  const pal = (id) => PALETTES.find((p) => p.id === id) || PALETTES[0];

  function paintRoom(room) {
    const sf = state.surfaces[room];
    if (paintMats[room]) paintMats[room].color.copy(slotColor(pal(sf.wall), 'wall'));
    for (const [slot, m] of Object.entries(clones[room] || {})) {
      const surface = SURFACE_OF_SLOT[slot];
      m.color.copy(slotColor(pal(sf[surface]), slot));
    }
  }
  api.applyPalette = (paletteId, scopeIds, surfaceIds) => {
    for (const sid of scopeIds) {
      for (const sf of surfaceIds) state.surfaces[sid][sf] = paletteId;
      state.palette[sid] = paletteId;
      paintRoom(sid);
    }
  };
  api.paletteOf = (scopeId) => {
    const sf = state.surfaces[scopeId]; const vals = Object.values(sf);
    return vals.every((v) => v === vals[0]) ? vals[0] : 'mixed';
  };

  // ---------- floor finishes ----------
  const floorMats = { porcelain: M.porcelain, oak: M.oakFloor };
  const makeFloor = async (id) => {
    if (floorMats[id]) return floorMats[id];
    const phys = (o) => new THREE.MeshPhysicalMaterial(o);
    let m;
    if (id === 'statuario') { const t = await gen('tileSet', { base: 0xf3f1ed, vein: 0x9c968f, grout: 0xe6e2dc, tileW: 1.2, tileH: 1.2, worldSize: 2.4, veins: 0.42, cloud: 0.035, speck: 0, size: 1024, groutPx: 1, seed: 61 }); m = phys({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, normalScale: new THREE.Vector2(0.25, 0.25), roughness: 0.154, clearcoat: 0.7, clearcoatRoughness: 0.05 }); }
    else if (id === 'travertine') { const t = await gen('tileSet', { base: 0xd9c9ae, vein: 0xc2ad8c, grout: 0xcbb99c, tileW: 0.6, tileH: 1.2, worldSize: 2.4, veins: 0.16, cloud: 0.12, speck: 0.35, size: 1024, groutPx: 2, seed: 71, stagger: 0.5 }); m = phys({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.705 }); }
    else if (id === 'concrete') { const t = await gen('tileSet', { base: 0xa9a7a3, vein: 0x9a9894, grout: 0x8e8c88, tileW: 1.2, tileH: 1.2, worldSize: 2.4, veins: 0.04, cloud: 0.16, speck: 0.3, size: 1024, groutPx: 2, seed: 81 }); m = phys({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.795, clearcoat: 0.1, clearcoatRoughness: 0.4 }); }
    else if (id === 'terrazzo') { const t = await gen('terrazzoSet', {}); m = phys({ map: t.map, normalMap: t.normalMap, roughness: 0.22, clearcoat: 0.55, clearcoatRoughness: 0.1 }); }
    else if (id === 'nero') { const t = await gen('tileSet', { base: 0x1e1d1f, vein: 0xd9d6d0, grout: 0x161517, tileW: 1.2, tileH: 1.2, worldSize: 2.4, veins: 0.5, cloud: 0.05, speck: 0, size: 1024, groutPx: 1, seed: 91 }); m = phys({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, normalScale: new THREE.Vector2(0.2, 0.2), roughness: 0.128, clearcoat: 0.8, clearcoatRoughness: 0.04 }); }
    else if (id === 'calacatta') { const t = await gen('tileSet', { base: 0xf5f2ec, vein: 0xa8916a, grout: 0xeae4d9, tileW: 1.2, tileH: 2.4, worldSize: 2.4, veins: 0.62, cloud: 0.03, speck: 0, size: 1024, groutPx: 1, seed: 63 }); m = phys({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, normalScale: new THREE.Vector2(0.2, 0.2), roughness: 0.128, clearcoat: 0.75, clearcoatRoughness: 0.04 }); }
    else if (id === 'emperador') { const t = await gen('tileSet', { base: 0x5b4030, vein: 0xd2b190, grout: 0x4a3326, tileW: 1.2, tileH: 0.6, worldSize: 2.4, veins: 0.5, cloud: 0.16, speck: 0.05, size: 1024, groutPx: 1, seed: 67 }); m = phys({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, normalScale: new THREE.Vector2(0.2, 0.2), roughness: 0.154, clearcoat: 0.7, clearcoatRoughness: 0.05 }); }
    else if (id === 'onyx') { const t = await gen('tileSet', { base: 0xe6c690, vein: 0xa8733a, grout: 0xd9b67e, tileW: 1.2, tileH: 1.2, worldSize: 2.4, veins: 0.7, cloud: 0.28, speck: 0, size: 1024, groutPx: 1, seed: 69 }); m = phys({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, normalScale: new THREE.Vector2(0.15, 0.15), roughness: 0.103, clearcoat: 0.85, clearcoatRoughness: 0.03 }); }
    else if (id === 'kota') { const t = await gen('tileSet', { base: 0x6d7a77, vein: 0x56635f, grout: 0x5d6966, tileW: 0.6, tileH: 0.6, worldSize: 2.4, veins: 0.06, cloud: 0.2, speck: 0.22, size: 1024, groutPx: 1, seed: 71 }); m = phys({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.538, clearcoat: 0.2, clearcoatRoughness: 0.3 }); }
    else if (id === 'jaisalmer') { const t = await gen('tileSet', { base: 0xd8b673, vein: 0xb48a48, grout: 0xc9a565, tileW: 0.6, tileH: 0.6, worldSize: 2.4, veins: 0.14, cloud: 0.2, speck: 0.28, size: 1024, groutPx: 1, seed: 73 }); m = phys({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.641 }); }
    else if (id === 'microcement') { const t = await gen('tileSet', { base: 0xbab3a7, vein: 0xa69f93, grout: 0xbab3a7, tileW: 2.4, tileH: 2.4, worldSize: 2.4, veins: 0.03, cloud: 0.26, speck: 0.12, size: 1024, groutPx: 0, seed: 75 }); m = phys({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, normalScale: new THREE.Vector2(0.35, 0.35), roughness: 0.705, clearcoat: 0.25, clearcoatRoughness: 0.4 }); }
    else if (['herringbone', 'zellige', 'hexclay', 'encaustic', 'checker'].includes(id)) {
      const P = {
        herringbone: { kind: 'herringbone', base: 0xc19a6b, dark: 0x93704b, light: 0xdcbb8f, cell: 0.09, plankN: 5, worldSize: 1.8 },
        zellige: { kind: 'zellige', base: 0x9cb29a, dark: 0x6f8a70, light: 0xc3d3bd, grout: 0xe8e2d4, cell: 0.1, worldSize: 1.2, gloss: 0.9 },
        hexclay: { kind: 'hex', base: 0xc06a42, dark: 0x8e4528, light: 0xd99a6c, grout: 0xcdbfa8, cell: 0.2, worldSize: 1.2 * Math.sqrt(3) },
        encaustic: { kind: 'encaustic', base: 0xebe3d3, alt: 0x2c3438, accent: 0xb5643f, grout: 0xd8cfbf, cell: 0.2, worldSize: 1.2 },
        checker: { kind: 'checker', base: 0xf3f0ea, dark: 0xb3ada4, alt: 0x1e1d1f, light: 0xcfcac2, grout: 0xd9d4cc, cell: 0.6, worldSize: 2.4 },
      }[id];
      const t = await gen('patternSet', { ...P, size: 1024, seed: 81 });
      m = phys({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, normalScale: new THREE.Vector2(0.7, 0.7), clearcoat: id === 'checker' || id === 'zellige' ? 0.6 : 0.15, clearcoatRoughness: 0.12 });
    }
    else if (id === 'chevron') { const t = await gen('chevronSet', {}); m = phys({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.48, clearcoat: 0.2, clearcoatRoughness: 0.35 }); }
    else { const t = await gen('woodSet', {}); m = phys({ map: t.map, roughness: 0.6 }); }
    for (const k of ['map', 'normalMap', 'roughnessMap']) if (m[k]) { m[k].anisotropy = aniso; m[k].needsUpdate = true; }
    m.clippingPlanes = M.porcelain.clippingPlanes;
    tuneMaterial(m);
    floorMats[id] = m; return m;
  };
  api.floorMaterial = makeFloor;
  api.swatch = async (id) => {
    const m = await makeFloor(id); const img = m.map?.image;
    if (!img) return '';
    const c = document.createElement('canvas'); c.width = 96; c.height = 96;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, Math.min(img.width, 420), Math.min(img.height, 420), 0, 0, 96, 96);
    return c.toDataURL('image/jpeg', 0.85);
  };
  api.applyFloor = async (optionId, roomIds) => {
    const mat = await makeFloor(optionId);
    for (const r of roomIds) state.floor[r] = optionId;
    for (const fm of arch.floorMeshes) {
      const room = fm.userData.room;
      if (roomIds.includes(room)) fm.material = mat;
    }
  };
  api.floorOf = (roomIds) => { const v = roomIds.map((r) => state.floor[r]); return v.every((q) => q === v[0]) ? v[0] : 'mixed'; };

  // ---------- state, undo, persistence ----------
  const history = [];
  api.snapshot = () => JSON.parse(JSON.stringify(state));
  api.push = () => { history.push(api.snapshot()); if (history.length > 40) history.shift(); };
  api.restore = (s) => {
    for (const r of Object.keys(DEFAULT_PALETTE)) { state.surfaces[r] = { ...s.surfaces[r] }; state.palette[r] = s.palette[r]; paintRoom(r); }
    return Promise.all(Object.entries(s.floor).map(([r, f]) => api.applyFloor(f, [r])));
  };
  api.undo = () => { const s = history.pop(); if (s) api.restore(s); return !!s; };
  api.canUndo = () => history.length > 0;
  api.reset = () => {
    api.push();
    const s = { palette: { ...DEFAULT_PALETTE }, surfaces: {}, floor: { ...DEFAULT_FLOOR } };
    for (const r of Object.keys(DEFAULT_PALETTE)) s.surfaces[r] = Object.fromEntries(SURFACES.map((q) => [q.id, DEFAULT_PALETTE[r]]));
    api.restore(s);
  };
  api.applyStyle = async (styleId) => {
    const s = HOUSE_STYLES.find((q) => q.id === styleId); if (!s) return;
    for (const [room, pal] of Object.entries(s.pal)) { for (const sf of SURFACES) state.surfaces[room][sf.id] = pal; state.palette[room] = pal; paintRoom(room); }
    const byFloor = {}; for (const [room, f] of Object.entries(s.floors)) (byFloor[f] ||= []).push(room);
    await Promise.all(Object.entries(byFloor).map(([f, rooms]) => api.applyFloor(f, rooms)));
    state.style = styleId;
  };
  api.state = state;
  // every material a palette can recolour (used to morph colours smoothly on camera)
  api.tweenables = () => [...Object.values(paintMats), ...Object.values(clones).flatMap((o) => Object.values(o))];
  api.save = () => { try { localStorage.setItem('residence-design-v1', JSON.stringify(state)); } catch { /* storage unavailable */ } };
  api.load = async () => {
    try { const raw = localStorage.getItem('residence-design-v1'); if (raw) { const s = JSON.parse(raw); if (s && s.surfaces && s.floor) await api.restore(s); } } catch { /* ignore */ }
  };
  for (const r of Object.keys(DEFAULT_PALETTE)) paintRoom(r);
  void floors;
  return api;
}
