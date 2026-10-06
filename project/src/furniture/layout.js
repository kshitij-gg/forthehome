// Room-by-room interior design. All positions are plan metres (x east, y north).
import * as THREE from 'three';
import * as F from './pieces.js';
import * as D from './decor.js';
import { mandir, setMandirMaterials } from './mandir.js';
import { place, planBox, B } from '../utils/geom.js';
import { designConfig as DC } from '../data/designConfig.ts';

const H = DC.wallHeight;

export function buildInteriors(M) {
  F.setMaterials(M); D.setDecorMaterials(M); setMandirMaterials(M);
  const root = new THREE.Group(); root.name = 'interiors';
  const registry = []; // { obj, room, name }
  const fans = [];

  const put = (obj, x, y, facing = 'S', h = 0, room = '', name = '') => {
    place(obj, x, y, facing, h);
    root.add(obj);
    registry.push({ obj, room, name });
    return obj;
  };
  const fixed = (mesh, room = '', name = '') => { root.add(mesh); registry.push({ obj: mesh, room, name, fixed: true }); return mesh; };

  const downlights = (pts, h = H) => pts.forEach(([x, y]) => put(F.downlight(), x, y, 'S', h, '', 'downlight'));

  // ================================================================= HALL
  // media wall on the north wall (TV wall), centred on the drawn TV position
  put(F.mediaWall({ w: 3.5 }), 6.6, 7.593, 'S', 0, 'hall', 'media wall');
  // L-shaped sectional: 3-seat run + chaise on the east, back to the dining
  put(F.sofa({ w: 2.15, d: 0.98, seats: 3, arms: 'right', mat: M.fabricBeige, scatterMat: M.fabricOat }), 6.9, 4.57, 'N', 0, 'hall', 'sectional');
  put(F.chaiseModule({ w: 0.98, d: 1.75, mat: M.fabricBeige, armSide: 'left' }), 8.47, 4.955, 'N', 0, 'hall', 'chaise');
  // back cushion for the chaise corner
  { const c = new THREE.Group(); F.setMaterials(M); const bc = new THREE.Mesh(F.rboxGeo(0.95, 0.53, 0.2, 0.04), M.fabricBeige); bc.position.set(0, 0.27 + 0.265, 0); bc.castShadow = true; c.add(bc); put(c, 8.47, 4.18, 'N', 0, 'hall'); }
  put(F.rug({ w: 3.0, d: 2.1, mat: M.rug }), 7.0, 5.85, 'S', 0, 'hall', 'rug');
  put(F.coffeeTableNest(), 7.0, 5.95, 'S', 0, 'hall', 'coffee tables');
  // reading corner on the west: one accent chair, side table and floor lamp (no second sofa)
  put(F.roundTable({ r: 0.22, h: 0.5, topMat: M.walnut, baseMat: M.brass, pedestal: true }), 4.6, 5.0, 'S', 0, 'hall', 'side table');
  put(F.floorLamp(), 4.5, 6.55, 'S', 0, 'hall', 'floor lamp');
  put(F.plant({ h: 1.6, potR: 0.2, potH: 0.48, kind: 'broad', count: 26, seed: 17 }), 9.6, 4.3, 'S', 0, 'hall', 'plant');
  // accent chair angled toward the conversation group, near the foyer
  put(F.accentChair({ mat: M.fabricTaupe }), 4.9, 5.85, Math.PI / 2, 0, 'hall', 'accent chair');
  put(F.plant({ h: 1.35, potR: 0.16, potH: 0.4, kind: 'narrow', count: 22, seed: 13 }), 8.62, 7.34, 'S', 0, 'hall', 'snake plant');
  // curtains on the balcony door
  put(F.curtainSet({ w: 1.9, h: 2.8, sheerClosed: false }), 9.86, 5.45, 'W', 0, 'hall', 'curtains'); // drawn open: balcony view
  // fitted storage run on the hall's west side
  put(F.storageRun({ w: 2.68, h: 2.78, d: 0.8 }), 3.8682, 5.355, 'E', 0, 'hall', 'storage run');
  downlights([[5.0, 4.6], [5.0, 7.0], [8.9, 4.6], [8.9, 7.0], [6.9, 7.0], [5.0, 5.8]]);
  { const fan = F.ceilingFan({ blade: 0.65 }); put(fan, 7.0, 5.85, 'S', H, 'hall', 'fan'); fans.push(fan); }

  // ================================================================= DINING
  put(F.diningTable({ w: 1.9, d: 1.0 }), 5.12, 2.75, 'S', 0, 'dining', 'dining table');
  for (const dx of [-0.62, 0, 0.62]) {
    put(F.diningChair({ mat: M.fabricOat }), 5.12 + dx, 2.75 - 0.73, 'N', 0, 'dining', 'chair');
    put(F.diningChair({ mat: M.fabricOat }), 5.12 + dx, 2.75 + 0.73, 'S', 0, 'dining', 'chair');
  }
  { const p = F.pendantRing({ w: 1.35, d: 0.5 }); put(p, 5.12, 2.75, 'S', 1.72, 'dining', 'pendant'); }
  // wall: floating walnut ledge + large artwork on the M.Bed partition
  { const g = new THREE.Group(); B(g, 1.5, 0.05, 0.24, M.walnut, 0, 0.95, 0.12); const led = B(g, 1.44, 0.006, 0.02, M.ledWarm, 0, 0.922, 0.2); led.userData.light = 'warm'; put(g, 3.4678, 2.75, 'E', 0, 'dining', 'ledge'); }
  { const a = F.artwork({ w: 1.2, h: 0.85, style: 'arcs', seed: 3 }); put(a, 3.4678, 2.75, 'E', 1.75, 'dining', 'art'); }
  { const v = F.lathe([[0, 0], [0.07, 0], [0.11, 0.12], [0.06, 0.32], [0.07, 0.36], [0, 0.36]], M.ceramicMatte); put(v, 3.62, 3.25, 'E', 0.975, 'dining'); }
  put(F.plant({ h: 1.4, potR: 0.18, potH: 0.42, kind: 'broad', count: 22, seed: 21 }), 3.75, 1.7, 'S', 0, 'dining', 'plant');
  fixed(planBox([3.4678, 1.42, 3.4738, 3.59], 0, H, M.wallTeal), 'dining'); // accent wall (themeable)
  downlights([[4.1, 1.9], [6.1, 1.9], [4.1, 3.55], [6.1, 3.55]]);

  // ================================================================= KITCHEN
  // north run: pantry tall unit, fridge housing, sink run (upstand toward hall)
  put(F.tallUnit({ w: 0.477, h: 2.4, kind: 'pantry' }), 7.2115, 3.4338, 'S', 0, 'kitchen', 'pantry');
  put(F.tallUnit({ w: 0.68, h: 2.4, kind: 'fridge' }), 7.79, 3.4338, 'S', 0, 'kitchen', 'fridge');
  put(F.baseRun({ w: 1.2, modules: [[0.4, 'd'], [0.8, 's']], sinkAt: 0.27 }), 8.73, 3.4338, 'S', 0, 'kitchen', 'sink run');
  fixed(planBox([8.11, 3.62, 9.35, 3.7338], 1.08, 1.11, M.quartz), 'kitchen');
  // hall–kitchen wall (closes the old pass-through over the sink, column to feature wall):
  // living-room face continues the fluted-oak feature wall flush; kitchen face = stone splash + plaster
  fixed(planBox([8.13, 3.7438, 9.65, 3.754], 0, H, M.flutedOak), 'hall', 'hall-kitchen wall');
  fixed(planBox([8.13, 3.7338, 9.65, 3.7438], 0, 1.5, M.stoneWarm), 'kitchen', 'kitchen splash');
  fixed(planBox([8.13, 3.7338, 9.65, 3.7438], 1.5, H, M.wall), 'kitchen', 'kitchen wall');
  // east run: drawers, hob, corner (to the NE column)
  put(F.baseRun({ w: 3.6965, modules: [[0.6, 'dd'], [0.9, 'd'], [0.9, 'd'], [0.6, 's'], [0.7, 'd']], hobAt: -0.12 - 1.8483 + 1.95 + 0.0 }), 9.6328, 1.84825, 'W', 0, 'kitchen', 'hob run');
  // south runs either side of the stone pier (window sits over the west run)
  put(F.baseRun({ w: 1.5016, modules: [[0.6, 'd'], [0.9, 's']] }), 7.2292, 0.3, 'N', 0, 'kitchen', 'south run');
  put(F.baseRun({ w: 0.7528, modules: [[0.75, 'dd']] }), 8.9564, 0.3, 'N', 0, 'kitchen', 'south run east');
  { const g = new THREE.Group(); for (const z of [1.55, 1.95]) { B(g, 0.72, 0.035, 0.26, M.walnut, 0, z, 0.13); const l = B(g, 0.68, 0.006, 0.015, M.ledWarm, 0, z - 0.021, 0.2); l.userData.light = 'underCab'; }
    for (let i = 0; i < 4; i++) { const jar = F.lathe([[0, 0], [0.045, 0], [0.045, 0.16], [0.032, 0.18], [0, 0.18]], i % 2 ? M.ceramicMatte : M.glass); jar.position.set(-0.24 + i * 0.16, 1.5675, 0.13); g.add(jar); }
    put(g, 8.9564, 0, 'N', 0, 'kitchen', 'open shelves'); }
  // backsplash (warm stone) on east & south walls
  fixed(planBox([9.92, 0.0, 9.9328, 3.6965], 0.9, 1.5, M.stoneWarm), 'kitchen');
  fixed(planBox([6.80, 0.0, 7.97, 0.012], 0.9, 1.05, M.stoneWarm), 'kitchen');
  fixed(planBox([8.59, 0.0, 9.3328, 0.012], 0.9, 1.5, M.stoneWarm), 'kitchen');
  // uppers on east wall (south of chimney) + chimney + open shelf north of window
  put(F.wallCabinets({ w: 1.2, h: 0.75 }), 9.7578, 0.7, 'W', 1.5, 'kitchen', 'uppers');
  { const ch = F.chimney({ w: 0.9 }); put(ch, 9.68, 1.95, 'W', 1.6, 'kitchen', 'chimney'); }
  put(F.wallCabinets({ w: 0.36, h: 0.75, d: 0.35 }), 9.7578, 3.5, 'W', 1.5, 'kitchen', 'upper corner');
  // structural column (south-centre, as drawn) tied back to the south wall as a stone-clad pier,
  // with a floating walnut breakfast ledge and two counter stools on its north face
  fixed(planBox([7.97, 0.0, 8.59, 1.165], 0, H, M.stoneWarm), 'kitchen');
  fixed(planBox([7.72, 1.165, 8.84, 1.5], 1.0, 1.045, M.walnut), 'kitchen');
  { const l = planBox([7.76, 1.3, 8.80, 1.48], 0.995, 1.0, M.ledWarm); l.userData.light = 'warm'; l.castShadow = false; fixed(l, 'kitchen'); }
  for (const x of [7.98, 8.6]) put(F.barStool(), x, 1.86, 'S', 0, 'kitchen', 'counter stool');
  // kitchen portal: the extended west wall + column read as one fluted-oak pier framing the kitchen
  fixed(planBox([6.3634, 1.75, 6.80, 1.77], 0, H, M.flutedOak), 'kitchen');
  fixed(planBox([6.80, 0.6, 6.82, 1.77], 0, H, M.flutedOak), 'kitchen');
  fixed(planBox([6.3434, 1.3954, 6.3634, 1.77], 0, H, M.flutedOak), 'dining');
  fixed(planBox([6.953, 3.13, 6.973, 3.754], 0, H, M.flutedOak), 'kitchen');
  // finished backs of the tall units toward the living room + ceiling filler
  fixed(planBox([6.973, 3.7338, 8.13, 3.754], 0, H, M.flutedOak), 'kitchen');
  fixed(planBox([6.973, 3.13, 8.13, 3.7338], 2.4, H, M.cabWhite), 'kitchen');
  // living-room face of the tower styled as a feature wall: backlit walnut ledge, art, picture light
  {
    const g = new THREE.Group();
    B(g, 1.1, 0.04, 0.17, M.walnut, 0, 1.0, 0.085);
    const l = B(g, 1.04, 0.006, 0.015, M.ledWarm, 0, 0.977, 0.15); l.userData.light = 'warm'; l.castShadow = false;
    const up = B(g, 1.04, 0.006, 0.012, M.ledWarm, 0, 1.0, 0.012); up.userData.light = 'warm'; up.castShadow = false;
    g.add(D.bookStack({ n: 3, seed: 21 }).translateX(-0.36).translateY(1.02).translateZ(0.085));
    g.add(D.sculpture().translateX(0.36).translateY(1.02).translateZ(0.085));
    const v = F.lathe([[0, 0], [0.05, 0], [0.07, 0.08], [0.04, 0.24], [0.05, 0.27], [0, 0.27]], M.ceramicMatte); v.position.set(0.02, 1.02, 0.085); g.add(v);
    // brass picture light
    B(g, 0.5, 0.025, 0.03, M.brass, 0, 2.38, 0.1); B(g, 0.02, 0.02, 0.1, M.brass, 0, 2.4, 0.05);
    const pl = B(g, 0.46, 0.006, 0.012, M.ledWarm, 0, 2.366, 0.1); pl.userData.light = 'warm'; pl.castShadow = false;
    put(g, 7.5515, 3.754, 'N', 0, 'hall', 'feature ledge');
    put(F.artwork({ w: 0.8, h: 1.0, style: 'arcs', seed: 13 }), 7.5515, 3.754, 'N', 1.72, 'hall', 'feature art');
  }
  // countertop decor
  { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const j = F.lathe([[0, 0], [0.045, 0], [0.045, 0.14 + i * 0.03], [0.03, 0.16 + i * 0.03], [0, 0.16 + i * 0.03]], i === 1 ? M.brass : M.ceramicMatte); j.position.set(i * 0.11, 0, 0); g.add(j); } put(g, 9.75, 3.1, 'W', 0.9, 'kitchen'); }
  { const b = new THREE.Group(); B(b, 0.38, 0.03, 0.26, M.oak, 0, 0.015, 0); put(b, 9.7, 1.15, 'W', 0.9, 'kitchen'); }
  put(F.plant({ h: 0.42, potR: 0.07, potH: 0.12, kind: 'fern', count: 10, seed: 31 }), 7.3, 0.35, 'S', 0.9, 'kitchen', 'herb pot');
  downlights([[7.4, 1.9], [8.6, 1.9], [7.4, 2.8], [8.6, 2.8]]);

  // ================================================================= WASHING / UTILITY
  put(F.washingMachine(), 6.05, 0.36, 'W', 0, 'washing', 'washer');
  put(F.utilitySink(), 6.08, 0.98, 'W', 0, 'washing', 'utility sink');
  put(F.wallCabinets({ w: 1.1, h: 0.6, d: 0.33, mat: M.cabGrey }), 6.2, 0.65, 'W', 1.75, 'washing', 'utility uppers');
  put(F.broomCupboard({ w: 0.5, h: 2.1, d: 0.45 }), 3.6928, 0.95, 'E', 0, 'washing', 'broom cupboard');
  put(F.plant({ h: 1.2, potR: 0.17, potH: 0.38, kind: 'broad', count: 20, seed: 41, potMat: M.terracotta }), 3.75, 0.3, 'S', 0, 'washing', 'plant');
  // ceiling drying rack (pulley)
  { const g = new THREE.Group(); for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(F.cylGeo(0.012, 0.012, 1.4, 8), M.steel); r.rotation.z = Math.PI / 2; r.position.set(0, 0, -0.24 + i * 0.12); g.add(r); } for (const s of [-1, 1]) B(g, 0.03, 0.03, 0.55, M.cabWhite, s * 0.68, 0, 0); put(g, 4.95, 0.7, 'S', 2.35, 'washing', 'drying rack'); }
  downlights([[4.95, 0.65]]);

  // ================================================================= MASTER BEDROOM
  put(F.bed({ size: 'king', headMat: M.fabricBeige, frameMat: M.walnut, duvetMat: M.linen, throwMat: M.throwTaupe }), 1.075, 2.83, 'E', 0, 'mbed', 'king bed');
  // fluted timber headboard wall with a warm cove, framing the high window
  {
    const y0 = 1.32, y1 = 4.36, t = 0.03;
    fixed(planBox([0, y0, t, y1], 0, 1.25, M.flutedOak), 'mbed');
    fixed(planBox([0, y0, t, 1.95], 1.25, 2.72, M.flutedOak), 'mbed');
    fixed(planBox([0, 3.65, t, y1], 1.25, 2.72, M.flutedOak), 'mbed');
    fixed(planBox([0, 1.95, t, 3.65], 2.1, 2.72, M.flutedOak), 'mbed');
    const cove = planBox([t, y0, t + 0.012, y1], 2.72, 2.735, M.ledWarm); cove.userData.light = 'mbedHead'; cove.castShadow = false; fixed(cove, 'mbed');
    const cove2 = planBox([t, y0, t + 0.012, y1], 1.235, 1.25, M.ledWarm); cove2.userData.light = 'mbedHead'; cove2.castShadow = false; fixed(cove2, 'mbed');
    fixed(planBox([0, y0, t + 0.05, y1], 2.72, 2.76, M.walnut), 'mbed');
  }
  put(F.bedsideTable({ mat: M.walnut }), 0.25, 1.56, 'E', 0, 'mbed', 'bedside');
  put(F.bedsideTable({ mat: M.walnut }), 0.25, 4.1, 'E', 0, 'mbed', 'bedside');
  put(F.globePendant({ r: 0.09, drop: 1.25 }), 0.32, 1.56, 'S', H, 'mbed', 'bedside pendant');
  put(F.globePendant({ r: 0.09, drop: 1.25 }), 0.32, 4.1, 'S', H, 'mbed', 'bedside pendant');
  put(F.bench({ w: 1.25, d: 0.38, mat: M.fabricTaupe }), 2.37, 2.83, 'E', 0, 'mbed', 'bench');
  put(F.rug({ w: 2.5, d: 2.0, mat: M.rug }), 1.75, 2.83, 'W', 0, 'mbed', 'rug');
  put(F.wardrobe({ w: 1.56, h: 2.78, pattern: ['taupe', 'mirror', 'taupe'] }), 0.8, 4.9204, 'S', 0, 'mbed', 'wardrobe');
  // wall-mounted TV + floating fluted console on the east partition
  { const g = new THREE.Group(); F.setMaterials(M);
    B(g, 1.5, 2.2, 0.03, M.flutedOak, 0, 1.1, 0.015); const tl = B(g, 1.5, 0.008, 0.012, M.ledWarm, 0, 2.205, 0.03); tl.userData.light = 'warm'; B(g, 0.5, 0.12, 0.2, M.walnut, -0.42, 0.6, 0.13);
    const tv = new THREE.Mesh(F.rboxGeo(1.24, 0.71, 0.03, 0.005), M.black); tv.position.set(0, 1.35, 0.03); g.add(tv);
    const s = B(g, 1.21, 0.68, 0.002, M.screen, 0, 1.35, 0.046); s.castShadow = false;
    put(g, 3.3528, 2.83, 'W', 0, 'mbed', 'tv console'); }
  put(F.curtainSet({ w: 1.85, h: 2.8 }), 1.625, 1.30, 'N', 0, 'mbed', 'curtains');
  fixed(planBox([3.3468, 1.258, 3.3528, 5.2204], 0, H, M.wallTeal), 'mbed'); // accent wall (themeable)
  downlights([[2.3, 1.8], [2.3, 4.0], [0.9, 4.55]]);
  { const fan = F.ceilingFan({ blade: 0.6 }); put(fan, 1.9, 2.83, 'S', H, 'mbed', 'fan'); fans.push(fan); }

  // ================================================================= M.BED BALCONY
  put(F.planterBox({ w: 1.3, d: 0.36, h: 0.5, plants: 3, seed: 51 }), 0.65, 0.22, 'N', 0, 'mbedbal', 'planter');
  put(F.plant({ h: 1.5, potR: 0.2, potH: 0.5, kind: 'broad', count: 24, seed: 53, potMat: M.planterGrey }), 3.05, 0.3, 'N', 0, 'mbedbal', 'plant');
  put(F.balconyLight(), 0.4, 1.143, 'S', 1.9, 'mbedbal', 'wall light');
  put(F.balconyLight(), 2.9, 1.143, 'S', 1.9, 'mbedbal', 'wall light');

  // ================================================================= TOILETS
  // M.Bed toilet: shower west, wall-hung WC on south wall, vanity on north wall
  put(F.showerSet({ w: 1.3716, d: 0.95, glassSide: 'front', gap: 'left' }), 0.475, 6.0062, 'E', 0, 'mtoilet', 'shower');
  put(F.wcWallHung(), 1.25, 6.692 - 0.3, 'S', 0, 'mtoilet', 'wc');
  put(F.vanity({ w: 0.6, d: 0.46, mat: M.walnut }), 1.92, 6.692 - 0.23, 'S', 0, 'mtoilet', 'vanity');
  put(F.backlitMirror({ w: 0.54, h: 0.8 }), 1.92, 6.692, 'S', 1.6, 'mtoilet', 'mirror');
  put(F.towelRail({ w: 0.5 }), 1.65, 5.3204, 'N', 1.25, 'mtoilet', 'towel rail');
  downlights([[1.3, 6.0], [0.47, 6.0]], DC.ceilingToilet);
  // Common toilet
  put(F.showerSet({ w: 1.2192, d: 0.9, glassSide: 'front' }), 0.45, 7.4016, 'E', 0, 'ctoilet', 'shower');
  put(F.wcWallHung(), 1.8, 6.792 + 0.3, 'N', 0, 'ctoilet', 'wc');
  put(F.vanity({ w: 0.5, d: 0.42, mat: M.cabGrey }), 1.2, 6.792 + 0.21, 'N', 0, 'ctoilet', 'vanity');
  put(F.backlitMirror({ w: 0.5, round: true }), 1.2, 6.792, 'N', 1.55, 'ctoilet', 'mirror');
  downlights([[1.4, 7.4], [0.45, 7.4]], DC.ceilingToilet);
  // CH.Bed toilet
  put(F.showerSet({ w: 1.3716, d: 0.93, glassSide: 'front' }), 5.2816, 11.3188, 'S', 0, 'chtoilet', 'shower');
  put(F.wcWallHung(), 5.9674 - 0.3, 9.82, 'W', 0, 'chtoilet', 'wc');
  put(F.vanity({ w: 0.58, d: 0.46, mat: M.oak }), 4.5958 + 0.23, 10.28, 'E', 0, 'chtoilet', 'vanity');
  put(F.backlitMirror({ w: 0.52, h: 0.78 }), 4.5958, 10.28, 'E', 1.6, 'chtoilet', 'mirror');
  downlights([[5.28, 10.2], [5.28, 11.3]], DC.ceilingToilet);

  // ================================================================= CORRIDOR
  { const a = F.artwork({ w: 0.7, h: 0.95, style: 'land', seed: 5 }); put(a, 3.3528, 6.0, 'W', 1.55, 'corridor', 'art'); }
  downlights([[2.87, 5.8], [2.87, 7.0]]);

  // ================================================================= CH. BEDROOM
  {
    // soft teal-grey accent wall behind the bed (paint overlay) + high window
    fixed(planBox([0, 8.15, 0.006, 11.76], 0, 1.25, M.wallTeal), 'chbed');
    fixed(planBox([0, 8.15, 0.006, 9.35], 1.25, 2.9, M.wallTeal), 'chbed');
    fixed(planBox([0, 10.95, 0.006, 11.76], 1.25, 2.9, M.wallTeal), 'chbed');
    fixed(planBox([0, 9.35, 0.006, 10.95], 2.1, 2.9, M.wallTeal), 'chbed');
  }
  put(F.bed({ w: 1.72, l: 2.1, mattress: [1.52, 1.98], size: 'queen', headMat: M.fabricTeal, frameMat: M.oak, duvetMat: M.linen, throwMat: M.fabricOat, headH: 1.05 }), 1.05, 10.18, 'E', 0, 'chbed', 'queen bed');
  put(F.bedsideTable({ mat: M.oak }), 0.25, 9.05, 'E', 0, 'chbed', 'bedside');
  put(F.bedsideTable({ mat: M.oak }), 0.25, 11.3, 'E', 0, 'chbed', 'bedside');
  put(F.wallSconce(), 0.006, 9.05, 'E', 1.3, 'chbed', 'sconce');
  put(F.wallSconce(), 0.006, 11.3, 'E', 1.3, 'chbed', 'sconce');
  // study desk + chair exactly where drawn (east end), shelves above
  put(F.desk({ w: 1.3, d: 0.58, mat: M.oak, pedestal: true }), 4.4958 - 0.29, 10.6, 'W', 0, 'chbed', 'study desk');
  put(F.officeChair({ mat: M.fabricTeal }), 3.62, 10.6, 'E', 0, 'chbed', 'study chair');
  { const g = new THREE.Group(); for (let k = 0; k < 2; k++) { B(g, 1.2, 0.03, 0.24, M.oak, 0, 1.45 + k * 0.4, 0.12); g.add(F.books(4, 3 + k).translateY(1.465 + k * 0.4).translateX(-0.3 + k * 0.5).translateZ(0.1)); } put(g, 4.4958, 10.6, 'W', 0, 'chbed', 'shelves'); }
  // window seat under the north window
  { const g = new THREE.Group(); B(g, 2.35, 0.42, 0.42, M.cabBeige, 0, 0.21, 0); const c = new THREE.Mesh(F.rboxGeo(2.3, 0.08, 0.4, 0.03), M.fabricOat); c.position.set(0, 0.46, 0); g.add(c);
    for (const x of [-0.8, 0.75]) { const p = new THREE.Mesh(F.rboxGeo(0.4, 0.38, 0.12, 0.05), x < 0 ? M.fabricTeal : M.throwTaupe); p.position.set(x, 0.66, -0.12); p.rotation.x = -0.2; g.add(p); }
    put(g, 2.775, 11.7838 - 0.21, 'S', 0, 'chbed', 'window seat'); }
  put(F.curtainSet({ w: 2.35, h: 2.3, stack: 0.35 }), 2.775, 11.75, 'S', 0.5, 'chbed', 'curtains');
  put(F.rug({ w: 2.2, d: 1.7, mat: M.rugGrey }), 1.85, 10.18, 'W', 0, 'chbed', 'rug');
  put(F.plant({ h: 1.1, potR: 0.15, potH: 0.35, kind: 'broad', count: 18, seed: 61 }), 3.45, 8.42, 'S', 0, 'chbed', 'plant');
  downlights([[2.4, 9.0], [2.4, 11.0], [3.9, 10.6]]);
  { const fan = F.ceilingFan({ blade: 0.6 }); put(fan, 2.0, 10.0, 'S', H, 'chbed', 'fan'); fans.push(fan); }

  // ================================================================= CH. RM (dressing)
  put(F.wardrobe({ w: 1.72, h: 2.75, pattern: ['beige', 'mirror', 'beige'] }), 5.472, 8.008, 'N', 0, 'chrm', 'dressing wardrobe');
  { const g = new THREE.Group(); const m = B(g, 0.6, 1.7, 0.02, M.mirror, 0, 1.0, 0.03); void m; B(g, 0.64, 1.74, 0.015, M.brass, 0, 1.0, 0.012); put(g, 6.3484, 8.85, 'W', 0, 'chrm', 'mirror'); }
  { const g = new THREE.Group(); const s = new THREE.Mesh(F.cylGeo(0.24, 0.24, 0.42, 32), M.fabricTaupe); s.position.y = 0.21; s.castShadow = true; g.add(s); F.contactShadow(g, 0.6, 0.6, 0.3); g.userData.collide = true; put(g, 5.65, 8.82, 'S', 0, 'chrm', 'ottoman'); }
  downlights([[5.4, 8.6]]);

  // ================================================================= OFFICE
  put(F.desk({ w: 1.3, d: 0.62, mat: M.walnut, pedestal: true }), 11.5, 11.7838 - 0.31, 'S', 0, 'office', 'workstation 1');
  put(F.desk({ w: 1.3, d: 0.62, mat: M.walnut, pedestal: true }), 12.9, 11.7838 - 0.31, 'S', 0, 'office', 'workstation 2');
  put(F.officeChair({ mat: M.fabricGrey }), 11.5, 10.78, 'N', 0, 'office', 'chair');
  put(F.officeChair({ mat: M.fabricGrey }), 12.9, 10.78, 'N', 0, 'office', 'chair');
  put(F.sofa({ w: 1.85, d: 0.86, seats: 3, arms: 'both', mat: M.fabricGrey, scatter: 2, scatterMat: M.fabricOat }), 12.66, 7.9738 + 0.43, 'N', 0, 'office', 'sofa');
  put(F.roundTable({ r: 0.32, h: 0.38, topMat: M.walnut, baseMat: M.charcoalMetal }), 12.66, 9.25, 'S', 0, 'office', 'coffee table');
  put(F.rug({ w: 2.0, d: 1.4, mat: M.rugGrey }), 12.66, 9.05, 'S', 0, 'office', 'rug');
  put(F.bookshelf({ w: 1.3, h: 2.2, d: 0.34 }), 10.5646 + 0.17, 10.45, 'E', 0, 'office', 'bookshelf');
  { const p = F.acousticPanel({ w: 1.7, h: 0.85 }); put(p, 12.66, 7.9738, 'N', 1.55, 'office', 'acoustic panel'); }
  { const p = F.acousticPanel({ w: 1.0, h: 0.6 }); put(p, 13.6126, 8.6, 'W', 1.75, 'office', 'acoustic panel'); }
  put(F.plant({ h: 1.6, potR: 0.19, potH: 0.45, kind: 'broad', count: 24, seed: 71 }), 13.3, 9.08, 'S', 0, 'office', 'plant');
  fixed(planBox([11.70, 7.9738, 13.6126, 7.9798], 0, H, M.wallTeal), 'office'); // accent wall (themeable)
  { const g = new THREE.Group(); B(g, 2.4, 0.09, 0.09, M.cabWhite, 0, 2.16, 0.05); const s = B(g, 2.3, 0.62, 0.006, M.sheer, 0, 1.83, 0.05); s.castShadow = false; s.renderOrder = 4; put(g, 12.1, 11.7838, 'S', 0, 'office', 'roller blind'); }
  // linear pendant over the workstations
  { const g = new THREE.Group(); B(g, 2.4, 0.04, 0.06, M.charcoalMetal, 0, 0, 0); const l = B(g, 2.36, 0.004, 0.04, M.ledNeutral, 0, -0.022, 0); l.userData.light = 'officeTask'; for (const s of [-1, 1]) B(g, 0.003, 0.9, 0.003, M.blackMetal, s * 1.0, 0.45, 0); put(g, 12.2, 11.2, 'S', 2.0, 'office', 'linear pendant'); }
  downlights([[11.3, 8.8], [13.0, 8.8], [11.3, 10.0], [13.0, 10.0]]);
  { const fan = F.ceilingFan({ blade: 0.6 }); put(fan, 12.1, 9.6, 'S', H, 'office', 'fan'); fans.push(fan); }

  // ================================================================= OFFICE BALCONY (built-in planter beds bound the 3'3" x 3'9" clear zone)
  put(F.planterBox({ w: 1.42, d: 0.9, h: 0.55, plants: 3, seed: 81 }), 14.2579, 8.62, 'W', 0, 'officebal', 'planter bed');
  put(F.planterBox({ w: 1.22, d: 0.9, h: 0.55, plants: 3, seed: 83 }), 14.2579, 11.15, 'W', 0, 'officebal', 'planter bed');
  put(F.balconyLight(), 13.7626, 10.6, 'E', 1.9, 'officebal', 'wall light');

  // ================================================================= HALL BALCONY
  put(F.barrelChair({ mat: M.fabricOat, cane: true }), 11.1, 5.7, 'S', 0, 'hallbal', 'lounge chair');
  put(F.barrelChair({ mat: M.fabricOat, cane: true }), 11.1, 4.52, 'N', 0, 'hallbal', 'lounge chair');
  put(F.roundTable({ r: 0.22, h: 0.45, topMat: M.whiteStone, baseMat: M.charcoalMetal, pedestal: false }), 11.1, 5.11, 'S', 0, 'hallbal', 'side table');
  put(F.plant({ h: 1.4, potR: 0.2, potH: 0.5, kind: 'broad', count: 24, seed: 91, potMat: M.terracotta }), 10.3, 4.08, 'S', 0, 'hallbal', 'plant');
  put(F.plant({ h: 1.0, potR: 0.16, potH: 0.4, kind: 'narrow', count: 18, seed: 93 }), 11.43, 6.28, 'S', 0, 'hallbal', 'plant');
  put(F.balconyLight(), 10.85, 6.4784, 'S', 1.9, 'hallbal', 'wall light');

  // ================================================================= DEOGHAR + ENTRY
  put(mandir({ w: 1.24, d: 0.55 }), 13.0792 - 0.275, 7.226, 'W', 0, 'shrine', 'mandir');
  // shrine back wall in ivory stone
  fixed(planBox([13.06, 6.5784, 13.0792, 7.8738], 0, 2.9, M.whiteStone), 'shrine');
  // entry: fluted shoe cabinet + console + brass mirror
  put(F.shoeConsole({ w: 1.0 }), 11.12, 6.5784 + 0.18, 'N', 0, 'entry', 'shoe console');
  fixed(planBox([10.5646, 6.5784, 11.70, 6.5844], 0, H, M.wallTeal), 'entry'); // accent wall (themeable)
  { const a = F.artwork({ w: 0.45, h: 0.6, style: 'arcs', seed: 12 }); put(a, 10.25, 6.5784, 'N', 1.55, 'entry', 'art'); }
  downlights([[10.25, 7.1], [11.1, 7.2], [12.4, 7.226]]);

  // ================================================================= PASSAGE (common lobby)
  { const g = new THREE.Group(); B(g, 0.72, 0.45, 0.3, M.walnut, 0, 0.225 + 0.05, 0); B(g, 0.68, 0.05, 0.26, M.cabCharcoal, 0, 0.025, 0); g.userData.collide = true; put(g, 8.5, 7.708 + 0.15, 'N', 0, 'passage', 'shoe bench'); }
  { const g = new THREE.Group(); B(g, 0.32, 0.14, 0.012, M.brass, 0, 0, 0.006); put(g, 10.2, 7.708, 'N', 1.5, 'passage', 'nameplate'); }
  downlights([[8.7, 8.3], [9.9, 8.3]]);

  // ================================================================= STYLING LAYER
  put(D.tableSetting(), 5.12, 2.75, 'S', 0, 'dining', 'table setting');
  put(D.fruitBowl(), 8.28, 1.34, 'S', 1.045, 'kitchen', 'fruit bowl');
  put(D.kettle(), 9.6, 2.47, 'W', 0.9, 'kitchen', 'kettle');
  put(D.knifeBlock(), 9.72, 0.42, 'W', 0.9, 'kitchen', 'knife block');
  put(D.utensilPot(), 9.74, 1.42, 'W', 0.9, 'kitchen', 'utensils');
  put(D.coffeeMachine(), 9.05, 0.26, 'N', 0.9, 'kitchen', 'coffee machine');
  put(D.throwDraped({ w: 0.5 }), 5.9, 4.55, 'W', 0.62, 'hall', 'throw');
  put(D.candleTrio(), 4.6, 5.0, 'S', 0.5, 'hall', 'candles');
  put(D.bookStack({ n: 3, seed: 8 }), 2.37, 3.25, 'E', 0.45, 'mbed', 'books');
  put(D.notebook(), 4.2, 10.15, 'W', 0.75, 'chbed', 'notebook');
  put(D.mug(), 4.3, 10.0, 'W', 0.75, 'chbed', 'mug');
  put(D.smallPlant(), 4.3, 11.12, 'W', 0.75, 'chbed', 'desk plant');
  put(D.mug(), 11.0, 11.32, 'S', 0.75, 'office', 'mug');
  put(D.notebook(), 12.05, 11.3, 'S', 0.75, 'office', 'notebook');
  put(D.smallPlant(), 13.42, 11.5, 'S', 0.75, 'office', 'desk plant');
  put(D.notebook(), 12.45, 11.32, 'S', 0.75, 'office', 'notebook');
  put(D.bookStack({ n: 2, seed: 11 }), 12.55, 9.2, 'S', 0.38, 'office', 'books');
  put(D.sculpture(), 12.82, 9.32, 'S', 0.38, 'office', 'sculpture');
  put(D.bathMat({ w: 0.55, d: 0.4 }), 1.75, 5.72, 'S', 0, 'mtoilet', 'bath mat');
  put(D.bathMat({ w: 0.5, d: 0.38 }), 1.85, 7.7, 'S', 0, 'ctoilet', 'bath mat');
  put(D.bathMat({ w: 0.5, d: 0.38 }), 5.02, 9.78, 'S', 0, 'chtoilet', 'bath mat');
  put(D.towelStack(), 4.83, 10.05, 'E', 0.9, 'chtoilet', 'towels');
  put(D.lantern(), 11.42, 4.12, 'S', 0, 'hallbal', 'lantern');
  put(D.lantern(), 0.25, 0.72, 'S', 0, 'mbedbal', 'lantern');

  return { root, registry, fans };
}
