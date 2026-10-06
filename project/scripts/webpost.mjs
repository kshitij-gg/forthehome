// Post-build for the deployable website (vite build --mode web → project/dist).
// Writes cache headers for static hosts (Netlify / Cloudflare Pages read `_headers`; Vercel reads
// vercel.json) and prints the transfer size of every file so the download budget stays visible.
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, brotliCompressSync } from 'node:zlib';

const out = join(fileURLToPath(new URL('..', import.meta.url)), 'dist');
// hashed assets never change → cache for a year; the HTML entry must revalidate so updates ship instantly
writeFileSync(join(out, '_headers'), `/assets/*
  Cache-Control: public, max-age=31536000, immutable
/index.html
  Cache-Control: public, max-age=0, must-revalidate
`);
writeFileSync(join(out, 'vercel.json'), JSON.stringify({
  headers: [
    { source: '/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/index.html', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }] },
  ],
}, null, 2));

const rows = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else rows.push(p); } };
walk(out);
let raw = 0, gz = 0, br = 0;
for (const p of rows) {
  const b = readFileSync(p); const g = gzipSync(b, { level: 9 }).length, z = brotliCompressSync(b).length;
  raw += b.length; gz += g; br += z;
  console.log(`${p.slice(out.length + 1).padEnd(44)} ${(b.length / 1024).toFixed(0).padStart(6)} KB   gzip ${(g / 1024).toFixed(0).padStart(5)} KB   brotli ${(z / 1024).toFixed(0).padStart(5)} KB`);
}
console.log(`${'TOTAL'.padEnd(44)} ${(raw / 1024).toFixed(0).padStart(6)} KB   gzip ${(gz / 1024).toFixed(0).padStart(5)} KB   brotli ${(br / 1024).toFixed(0).padStart(5)} KB`);
