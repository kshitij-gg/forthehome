// Dimensional + topological validation of the floor-plan data.
// Runs in Node at build time (scripts/validate.mjs) and in the browser
// before the decorative interior is built.
import { walls, openings, doors, rooms, floors, type Rect } from './floorplan.ts';

export interface DimRow {
  id: string; name: string; label: string;
  reqEW: number; reqNS: number; actEW: number; actNS: number;
  errEW: number; errNS: number; pass: boolean; note: string;
}

const TOL = 0.010; // 10 mm

export function dimensionTable(): DimRow[] {
  const out: DimRow[] = [];
  for (const r of rooms) {
    if (!r.required) continue;
    const actEW = r.rect[2] - r.rect[0];
    const actNS = r.rect[3] - r.rect[1];
    const errEW = actEW - r.required[0];
    const errNS = actNS - r.required[1];
    out.push({
      id: r.id, name: r.name, label: r.label || '',
      reqEW: r.required[0], reqNS: r.required[1], actEW, actNS, errEW, errNS,
      pass: Math.abs(errEW) <= TOL && Math.abs(errNS) <= TOL,
      note: (r.open ? 'open-plan zone; ' : '') + (r.axisNote || ''),
    });
  }
  return out;
}

const inRect = (x: number, y: number, r: Rect, e = 0) => x > r[0] - e && x < r[2] + e && y > r[1] - e && y < r[3] + e;
const overlapArea = (a: Rect, b: Rect) => {
  const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
  const h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
  return w > 1e-6 && h > 1e-6 ? w * h : 0;
};

function wallAxis(r: Rect): 'x' | 'y' { return r[2] - r[0] >= r[3] - r[1] ? 'x' : 'y'; }

/** true if the point lies in a wall body or in one of its openings */
function pointInWallOrOpening(x: number, y: number): 'wall' | 'opening' | null {
  for (const w of walls) {
    if (!inRect(x, y, w.rect)) continue;
    const ax = wallAxis(w.rect);
    const t = ax === 'x' ? x : y;
    const op = openings.find((o) => o.wall === w.id && t > o.a && t < o.b);
    return op ? 'opening' : 'wall';
  }
  return null;
}

export interface TopologyReport { errors: string[]; warnings: string[]; info: string[] }

export function topology(): TopologyReport {
  const errors: string[] = []; const warnings: string[] = []; const info: string[] = [];
  // walls must not overlap each other
  for (let i = 0; i < walls.length; i++) for (let j = i + 1; j < walls.length; j++) {
    const a = overlapArea(walls[i].rect, walls[j].rect);
    if (a > 1e-5) errors.push(`walls ${walls[i].id} & ${walls[j].id} overlap (${(a * 1e4).toFixed(1)} cm²)`);
  }
  // floor finishes must not overlap
  for (let i = 0; i < floors.length; i++) for (let j = i + 1; j < floors.length; j++) {
    const a = overlapArea(floors[i].rect, floors[j].rect);
    if (a > 1e-5) errors.push(`floor regions ${floors[i].id} & ${floors[j].id} overlap`);
  }
  // openings lie inside their wall; door clear widths >= 0.76 m
  for (const o of openings) {
    const w = walls.find((q) => q.id === o.wall);
    if (!w) { errors.push(`opening ${o.id} references missing wall ${o.wall}`); continue; }
    const ax = wallAxis(w.rect);
    const lo = ax === 'x' ? w.rect[0] : w.rect[1];
    const hi = ax === 'x' ? w.rect[2] : w.rect[3];
    if (o.a < lo - 1e-6 || o.b > hi + 1e-6) errors.push(`opening ${o.id} extends beyond wall ${w.id}`);
    if ((o.kind === 'door' || o.kind === 'lift') && o.b - o.a < 0.76 - 1e-6) errors.push(`opening ${o.id} clear width ${(o.b - o.a).toFixed(3)} < 0.76 m`);
  }
  for (const d of doors) if (!openings.find((o) => o.id === d.opening)) errors.push(`door ${d.id} has no opening`);
  // enclosed rooms: every boundary sample 3 cm outside must be wall / opening / railing edge
  for (const r of rooms) {
    if (r.open) continue;
    const [x0, y0, x1, y1] = r.rect;
    let total = 0, missing = 0;
    const probe = (x: number, y: number) => {
      total++;
      const hit = pointInWallOrOpening(x, y);
      if (!hit) missing++;
    };
    const e = 0.03;
    for (let x = x0 + 0.06; x < x1 - 0.06; x += 0.05) { probe(x, y0 - e); probe(x, y1 + e); }
    for (let y = y0 + 0.06; y < y1 - 0.06; y += 0.05) { probe(x0 - e, y); probe(x1 + e, y); }
    const pct = (100 * (total - missing)) / total;
    const isBalcony = r.id.includes('bal');
    if (isBalcony) info.push(`${r.id}: ${pct.toFixed(0)}% of boundary walled (remainder = glass balustrade)`);
    else if (pct < 99.5) warnings.push(`${r.id}: only ${pct.toFixed(1)}% of the boundary is wall/opening`);
    else info.push(`${r.id}: boundary closed (${pct.toFixed(1)}%)`);
  }
  // no structural wall inside a room's clear rectangle (columns are allowed, reported)
  for (const r of rooms) {
    for (const w of walls) {
      const a = overlapArea(r.rect, w.rect);
      if (a <= 1e-5) continue;
      if (w.kind === 'column') info.push(`${r.id}: column ${w.id} projects ${(a * 1e4).toFixed(0)} cm² into the clear zone`);
      else if (!(r.open || r.id === 'shrine')) errors.push(`wall ${w.id} intrudes into room ${r.id}`);
      else warnings.push(`open zone ${r.id} contains wall ${w.id}`);
    }
  }
  return { errors, warnings, info };
}

export function fmtFtIn(m: number): string {
  const totalIn = m / 0.0254;
  let f = Math.floor(totalIn / 12);
  let i = Math.round(totalIn - f * 12);
  if (i === 12) { f++; i = 0; }
  return `${f}'${i}"`;
}

export function dimensionMarkdown(rows: DimRow[]): string {
  const lines = ['| Room | Label on drawing | Required E-W × N-S (m) | Actual E-W × N-S (m) | Error (mm) | Result | Note |', '|---|---|---|---|---|---|---|'];
  for (const r of rows) {
    lines.push(`| ${r.name} | ${r.label} | ${r.reqEW.toFixed(4)} × ${r.reqNS.toFixed(4)} | ${r.actEW.toFixed(4)} × ${r.actNS.toFixed(4)} | ${(r.errEW * 1000).toFixed(1)} / ${(r.errNS * 1000).toFixed(1)} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.note} |`);
  }
  return lines.join('\n');
}

export function runAll() {
  const rows = dimensionTable();
  const topo = topology();
  const ok = rows.every((r) => r.pass) && topo.errors.length === 0;
  return { ok, rows, topo };
}
