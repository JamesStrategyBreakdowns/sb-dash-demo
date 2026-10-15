// Revenue Calculator, demo edition. The real tab models pricing, so the demo shows only
// its layout: every figure is a placeholder and the whole tab sits behind a blur.
(function () {
  const LINES = ['Newsletter ads', 'Sponsored pieces', 'Social posts', 'Add-ons', 'The Daily'];
  const COLORS = ['var(--gb-2)', 'var(--gb-1)', 'var(--gb-5)', 'var(--gb-4)', 'var(--gb-3)'];
  const SHARE = [34, 26, 14, 8, 18];
  const X = '$00,000';
  let done = false;

  const slider = (label, pos) => `
    <div class="rm-row"><label>${label}</label><output>${X}</output>
      <div class="rm-track"><input type="range" min="0" max="100" value="${pos}" disabled tabindex="-1"></div></div>`;

  function render() {
    const root = document.getElementById('rmRoot');
    if (!root) return;
    const rail = LINES.map((name, i) => `
      <div class="pipe-card">
        <div class="rm-legend-title"><i class="pipe-sw" style="background:${COLORS[i]}"></i>${name}</div>
        ${slider('Fill rate', 40 + i * 9)}${slider('Card price', 30 + i * 11)}${slider('Discount off card', 15 + i * 6)}
      </div>`).join('');
    const bar = LINES.map((n, i) => `<div style="flex:${SHARE[i]};background:${COLORS[i]}" title="${n}"></div>`).join('');
    const legend = LINES.map((n, i) => `<span><i class="pipe-sw" style="background:${COLORS[i]}"></i>${n}</span>`).join('');
    const rows = ['Last 3 months, actual', 'Current settings', 'Daily at 2 slots', 'Full inventory'].map(s =>
      `<tr><td>${s}</td>${LINES.map(() => `<td>${X}</td>`).join('')}<td class="rm-total">${X}</td><td></td></tr>`).join('');
    root.innerHTML = `
      <div class="rm-grid">
        <aside class="rm-rail">${rail}</aside>
        <div class="rm-main">
          <div class="pipe-chart">
            <div class="rm-hero">
              <div><div class="pipe-k">Monthly revenue</div><div class="pipe-v rm-big">${X}</div></div>
              <div class="rm-facts">
                <div class="rm-fact"><b>${X}</b><span>monthly target</span></div>
                <div class="rm-fact"><b>${X}</b><span>vs the last 3 months</span></div>
                <div class="rm-fact"><b>${X}</b><span>a year at this rate</span></div>
              </div>
            </div>
            <div class="rm-bar" style="display:flex;height:28px;border-radius:8px;overflow:hidden">${bar}</div>
            <div class="pipe-legend">${legend}</div>
          </div>
          <div class="pipe-chart">
            <div class="rm-headrow"><h3>Compare scenarios</h3></div>
            <div class="rm-tablewrap"><table class="rm-tbl">
              <thead><tr><th>Scenario</th>${LINES.map(n => `<th>${n}</th>`).join('')}<th>Total / month</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table></div>
          </div>
        </div>
      </div>`;
    done = true;
  }

  window.RevenueModel = { show() { if (!done) render(); } };
})();
