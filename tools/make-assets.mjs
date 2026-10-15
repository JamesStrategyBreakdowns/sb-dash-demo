// Generates the demo's static assets from mock/seed.js:
//   logos/<company>.svg       simple marks for the fictional companies
//   graphics/<daily>-v<n>.html  editable 1080x1350 infographics, 3 styles per Daily
//   graphics/<daily>-v<n>.png   the same graphics rendered to PNG (needs Playwright)
//   pulse/data.json           a snapshot for the standalone campaign pulse page
//
// Usage: node tools/make-assets.mjs [--no-png]
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { COMPANIES, DAILIES, build } = require(join(ROOT, 'mock', 'seed.js'));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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

// ---------------------------------------------------------------- infographics
const STYLES = [
  { bg: '#FFFAF3', ink: '#1A1A1F', muted: '#7A7468', grid: '#E9E0D0', accent: '#8F6BF2', accent2: '#C9B8FB', soft: '#EFE9FD', palette: ['#8F6BF2', '#FC6932', '#0FA396', '#FBBF24', '#4A9EFF'] },
  { bg: '#1A1A1F', ink: '#FFFAF3', muted: '#9E9EA8', grid: '#2E2E38', accent: '#FC6932', accent2: '#7A3A22', soft: '#2A211D', palette: ['#FC6932', '#B19EF8', '#4ADE80', '#FBBF24', '#4A9EFF'] },
  { bg: '#FFFFFF', ink: '#111318', muted: '#6B7280', grid: '#E5E7EB', accent: '#0FA396', accent2: '#9FDDD4', soft: '#E8F7F4', palette: ['#0FA396', '#2E6FB7', '#C26A0A', '#8F6BF2', '#E4572E'] },
];
const fmt = (v, unit) => unit === '%' ? `${v}%` : unit === '$' ? `$${v}` : `${v}${unit || ''}`;

function barSvg(ch, st, W, H) {
  const pad = { l: 24, r: 24, t: 54, b: 70 };
  const vals = ch.values, n = vals.length;
  const max = Math.max(...vals, 0), min = Math.min(...vals, 0);
  const plotH = H - pad.t - pad.b;
  const y = v => pad.t + (max - v) / (max - min || 1) * plotH;
  const slot = (W - pad.l - pad.r) / n, bw = Math.min(110, slot * 0.62);
  const top = Math.max(...vals);
  let s = `<line x1="${pad.l}" y1="${y(0)}" x2="${W - pad.r}" y2="${y(0)}" stroke="${st.grid}" stroke-width="3"/>`;
  vals.forEach((v, i) => {
    const cx = pad.l + slot * i + slot / 2, y0 = y(0), y1 = y(v);
    const fill = v === top ? st.accent : st.accent2;
    s += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(3, Math.abs(y1 - y0)).toFixed(1)}" rx="10" fill="${fill}"/>`;
    s += `<text x="${cx.toFixed(1)}" y="${(v >= 0 ? y1 - 16 : y0 - 16).toFixed(1)}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="800" font-size="34" fill="${st.ink}">${esc(fmt(v, ch.unit))}</text>`;
    s += `<text x="${cx.toFixed(1)}" y="${(H - pad.b + 44).toFixed(1)}" text-anchor="middle" font-family="Manrope" font-weight="600" font-size="26" fill="${st.muted}">${esc(ch.labels[i])}</text>`;
  });
  return s;
}

function lineSvg(ch, st, W, H) {
  const pad = { l: 40, r: 40, t: 60, b: 70 };
  const vals = ch.values, n = vals.length;
  const max = Math.max(...vals) * 1.1, min = 0;
  const x = i => pad.l + i * (W - pad.l - pad.r) / (n - 1);
  const y = v => pad.t + (max - v) / (max - min) * (H - pad.t - pad.b);
  let s = '';
  for (let g = 0; g <= 4; g++) { const yy = pad.t + g * (H - pad.t - pad.b) / 4; s += `<line x1="${pad.l}" y1="${yy}" x2="${W - pad.r}" y2="${yy}" stroke="${st.grid}" stroke-width="2"/>`; }
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  s += `<polygon points="${x(0)},${H - pad.b} ${pts} ${x(n - 1)},${H - pad.b}" fill="${st.accent}" opacity=".14"/>`;
  s += `<polyline points="${pts}" fill="none" stroke="${st.accent}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>`;
  vals.forEach((v, i) => {
    const last = i === n - 1, first = i === 0;
    s += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${last ? 14 : 8}" fill="${last ? st.accent : st.bg}" stroke="${st.accent}" stroke-width="5"/>`;
    if (first || last) s += `<text x="${x(i).toFixed(1)}" y="${(y(v) - 30).toFixed(1)}" text-anchor="${last ? 'end' : 'start'}" font-family="Hanken Grotesk" font-weight="800" font-size="40" fill="${st.ink}">${esc(fmt(v, ch.unit))}</text>`;
    s += `<text x="${x(i).toFixed(1)}" y="${(H - pad.b + 44).toFixed(1)}" text-anchor="middle" font-family="Manrope" font-weight="600" font-size="24" fill="${st.muted}">${esc(ch.labels[i])}</text>`;
  });
  return s;
}

function donutSvg(ch, st, W, H) {
  const cx = W * 0.32, cy = H / 2, R = Math.min(W * 0.27, H * 0.42), r = R * 0.58;
  const total = ch.values.reduce((a, b) => a + b, 0);
  let a0 = -Math.PI / 2, s = '';
  ch.values.forEach((v, i) => {
    const a1 = a0 + v / total * Math.PI * 2, big = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rad, a) => `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
    s += `<path d="M${p(R, a0)} A${R},${R} 0 ${big} 1 ${p(R, a1)} L${p(r, a1)} A${r},${r} 0 ${big} 0 ${p(r, a0)} Z" fill="${st.palette[i % st.palette.length]}" stroke="${st.bg}" stroke-width="6"/>`;
    a0 = a1;
  });
  s += `<text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="800" font-size="58" fill="${st.ink}">${esc(fmt(ch.values[0], ch.unit))}</text>`;
  s += `<text x="${cx}" y="${cy + 48}" text-anchor="middle" font-family="Manrope" font-weight="600" font-size="24" fill="${st.muted}">${esc(ch.labels[0])}</text>`;
  const lx = W * 0.64;
  ch.labels.forEach((l, i) => {
    const ly = cy - (ch.labels.length - 1) * 46 + i * 92;
    s += `<rect x="${lx}" y="${ly - 22}" width="30" height="30" rx="8" fill="${st.palette[i % st.palette.length]}"/>`;
    s += `<text x="${lx + 46}" y="${ly}" font-family="Manrope" font-weight="600" font-size="28" fill="${st.ink}">${esc(l)}</text>`;
    s += `<text x="${lx + 46}" y="${ly + 36}" font-family="Hanken Grotesk" font-weight="800" font-size="30" fill="${st.muted}">${esc(fmt(ch.values[i], ch.unit))}</text>`;
  });
  return s;
}

function graphicHtml(d, v) {
  const st = STYLES[v];
  const ch = d.chart;
  const W = 936, H = v === 2 ? 640 : 780;
  const body = ch.kind === 'bar' ? barSvg(ch, st, W, H) : ch.kind === 'line' ? lineSvg(ch, st, W, H) : donutSvg(ch, st, W, H);
  const callout = v === 2 ? `<div class="callout"><div class="big">${esc(d.stat.match(/\$?\d[\d.,]*[x%]?/)?.[0] || '')}</div><p>${esc(d.stat)}</p></div>` : '';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(d.titles[v])}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@700;800&family=Manrope:wght@500;600;700&display=swap">
<style>
  html, body { margin: 0; width: 1080px; height: 1350px; overflow: hidden; background: ${st.bg}; }
  body { box-sizing: border-box; padding: 72px; font-family: 'Manrope', sans-serif; color: ${st.ink}; display: flex; flex-direction: column; }
  .kicker { font: 700 22px/1 'Manrope', sans-serif; letter-spacing: .14em; text-transform: uppercase; color: ${st.accent}; margin: 0 0 22px; }
  h1 { font: 800 64px/1.05 'Hanken Grotesk', sans-serif; margin: 0 0 18px; letter-spacing: -.01em; }
  .sub { font: 600 28px/1.35 'Manrope', sans-serif; color: ${st.muted}; margin: 0 0 24px; }
  .callout { display: flex; gap: 28px; align-items: center; background: ${st.soft}; border-radius: 22px; padding: 26px 32px; margin: 0 0 20px; }
  .callout .big { font: 800 84px/1 'Hanken Grotesk', sans-serif; color: ${st.accent}; }
  .callout p { font: 600 26px/1.35 'Manrope', sans-serif; margin: 0; }
  svg { display: block; flex: 1; }
  .foot { display: flex; justify-content: space-between; align-items: flex-end; font: 600 21px/1.3 'Manrope', sans-serif; color: ${st.muted}; margin-top: 18px; }
  .brand { font: 800 24px/1 'Hanken Grotesk', sans-serif; letter-spacing: .06em; color: ${st.ink}; }
</style></head>
<body>
  <p class="kicker">The Daily · ${esc(d.company)}</p>
  <h1>${esc(d.titles[v])}</h1>
  <p class="sub">${esc(ch.subtitle)}</p>
  ${callout}
  <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(ch.title)}">${body}</svg>
  <div class="foot"><span>Source: ${esc(d.sourceName)} (fictional data)</span><span class="brand">STRATEGY BREAKDOWNS</span></div>
</body></html>
`;
}

mkdirSync(join(ROOT, 'graphics'), { recursive: true });
for (const d of DAILIES) for (let v = 0; v < 3; v++) writeFileSync(join(ROOT, 'graphics', `${d.id}-v${v}.html`), graphicHtml(d, v));

// ---------------------------------------------------------------- pulse snapshot
mkdirSync(join(ROOT, 'pulse'), { recursive: true });
writeFileSync(join(ROOT, 'pulse', 'data.json'), JSON.stringify(build(Date.now()).pulse, null, 1) + '\n');

// ---------------------------------------------------------------- PNG renders
if (!process.argv.includes('--no-png')) {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright')); }
  const launch = { executablePath: process.env.CHROME || undefined };
  if (process.env.HTTPS_PROXY) launch.proxy = { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' };
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const d of DAILIES) {
    for (let v = 0; v < 3; v++) {
      await page.setContent(graphicHtml(d, v), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: join(ROOT, 'graphics', `${d.id}-v${v}.png`) });
    }
  }
  await browser.close();
}
console.log(`logos: ${COMPANIES.length}, graphics: ${DAILIES.length * 3}`);
