// Generates the demo's static assets from mock/seed.js:
//   logos/<company>.svg       simple marks for the fictional companies
//   pulse/data.json           a snapshot for the standalone campaign pulse page
//   social/data.json          the posts behind the (hidden) Social Performance tab
//
// Usage: node tools/make-assets.mjs
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { COMPANIES, build } = require(join(ROOT, 'mock', 'seed.js'));

// ---------------------------------------------------------------- logos
const SHAPES = {
  triangle: '<path d="M32 14 L50 46 H14 Z" fill="#fff" opacity=".92"/>',
  circle: '<circle cx="32" cy="32" r="17" fill="#fff" opacity=".92"/>',
  square: '<rect x="17" y="17" width="30" height="30" rx="5" fill="#fff" opacity=".92"/>',
  ring: '<circle cx="32" cy="32" r="15" fill="none" stroke="#fff" stroke-width="7" opacity=".92"/>',
  leaf: '<path d="M16 46 C16 26 30 16 48 16 C48 34 38 48 18 48 Z" fill="#fff" opacity=".92"/>',
  diamond: '<path d="M32 13 L51 32 L32 51 L13 32 Z" fill="#fff" opacity=".92"/>',
  hex: '<path d="M32 13 L49 23 V41 L32 51 L15 41 V23 Z" fill="#fff" opacity=".92"/>',
};
mkdirSync(join(ROOT, 'logos'), { recursive: true });
for (const c of COMPANIES) {
  const letter = c.name[0];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="14" fill="${c.color}"/>${SHAPES[c.shape]}<text x="32" y="38.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="17" fill="${c.color}">${letter}</text></svg>\n`;
  writeFileSync(join(ROOT, 'logos', `${c.slug}.svg`), svg);
}

// ---------------------------------------------------------------- pulse snapshot
mkdirSync(join(ROOT, 'pulse'), { recursive: true });
writeFileSync(join(ROOT, 'pulse', 'data.json'), JSON.stringify(build(Date.now()).pulse, null, 1) + '\n');

// ---------------------------------------------------------------- social snapshot
// The Social Performance tab embeds social/index.html, which reads data.json beside it.
mkdirSync(join(ROOT, 'social'), { recursive: true });
writeFileSync(join(ROOT, 'social', 'data.json'), JSON.stringify(build(Date.now()).social, null, 1) + '\n');

console.log(`logos: ${COMPANIES.length}, pulse and social snapshots written`);
