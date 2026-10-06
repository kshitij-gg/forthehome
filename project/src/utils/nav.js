// Navigation-grid BFS: proves every enterable room is reachable from the entrance
// (with all operable doors open) using the same collision test as Explore mode.
import { rooms } from '../data/floorplan.ts';

export function reachability(blocked, start, cell = 0.05) {
  const minX = -0.3, minY = -0.3, maxX = 15.0, maxY = 12.1;
  const W = Math.ceil((maxX - minX) / cell), Hh = Math.ceil((maxY - minY) / cell);
  const seen = new Uint8Array(W * Hh);
  const idx = (i, j) => j * W + i;
  const toCell = (x, y) => [Math.round((x - minX) / cell), Math.round((y - minY) / cell)];
  const [si, sj] = toCell(start.x, start.y);
  const q = [[si, sj]]; seen[idx(si, sj)] = 1;
  let count = 0;
  while (q.length) {
    const [i, j] = q.pop(); count++;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= Hh) continue;
      const k = idx(ni, nj); if (seen[k]) continue;
      const x = minX + ni * cell, y = minY + nj * cell;
      if (blocked(x, y)) { seen[k] = 2; continue; }
      seen[k] = 1; q.push([ni, nj]);
    }
  }
  const result = [];
  for (const r of rooms) {
    if (!r.enterable) continue;
    // a room is reachable if any reachable cell lies inside its rectangle
    let ok = false, cells = 0, reach = 0;
    for (let x = r.rect[0] + 0.05; x < r.rect[2] - 0.05; x += cell) for (let y = r.rect[1] + 0.05; y < r.rect[3] - 0.05; y += cell) {
      const [i, j] = toCell(x, y); cells++;
      if (seen[idx(i, j)] === 1) { ok = true; reach++; }
    }
    result.push({ id: r.id, name: r.name, reachable: ok, coverage: cells ? reach / cells : 0 });
  }
  return { reachableCells: count, rooms: result };
}
