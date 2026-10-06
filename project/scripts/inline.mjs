// Post-build: inline the JS bundle and CSS into a single self-contained build/index.html
// (opens directly from disk via file://, no server needed).
import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(fileURLToPath(new URL('..', import.meta.url)), '..', 'build');
let html = readFileSync(join(out, 'index.html'), 'utf8');
const assets = join(out, 'assets');
const files = existsSync(assets) ? readdirSync(assets) : [];
for (const f of files) {
  const p = join(assets, f);
  if (f.endsWith('.js')) {
    const js = readFileSync(p, 'utf8').replace(/<\/script/g, '<\\/script');
    html = html.replace(new RegExp(`<script[^>]*src="\\./assets/${f.replace(/\./g, '\\.')}"[^>]*></script>`), () => `<script type="module">${js}</script>`);
  } else if (f.endsWith('.css')) {
    const css = readFileSync(p, 'utf8');
    html = html.replace(new RegExp(`<link[^>]*href="\\./assets/${f.replace(/\./g, '\\.')}"[^>]*>`), () => `<style>${css}</style>`);
  }
}
// module scripts must run after the body exists when inlined in <head>
html = html.replace(/<script type="module">/, '<script type="module" defer>');
if (/<script type="module" defer>/.test(html) && html.indexOf('<script type="module" defer>') < html.indexOf('<body>')) {
  const m = html.match(/<script type="module" defer>[\s\S]*?<\/script>/);
  html = html.replace(m[0], '');
  html = html.replace('</body>', () => m[0] + '\n</body>');
}
writeFileSync(join(out, 'index.html'), html);
if (existsSync(assets)) rmSync(assets, { recursive: true, force: true });
console.log(`inlined → ${join(out, 'index.html')} (${(html.length / 1024).toFixed(0)} KB)`);
