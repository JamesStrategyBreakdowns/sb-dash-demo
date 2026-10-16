(() => {
  const T = {
    data: null,
    loading: false,
    error: null,
    period: 'all',
    wired: false
  };
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, (c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c])));
  const DAY = 864e5;
  const OUTCOMES = [ {
    key: 'approved',
    label: 'Approved for drafting'
  }, {
    key: 'open',
    label: 'Still open'
  }, {
    key: 'archived',
    label: 'Archived'
  } ];
  const KIND = {
    x: 'X',
    linkedin: 'in',
    reddit: 'r/',
    youtube: 'YT',
    newsletter: 'NL',
    web: 'Web'
  };
  const KIND_LONG = {
    x: 'X accounts',
    linkedin: 'LinkedIn',
    reddit: 'Reddit',
    youtube: 'YouTube',
    newsletter: 'Newsletters',
    web: 'Publications'
  };
  const dayKey = d => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };
  const fmtDay = d => new Date(d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '-';
  const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
  function inPeriod(rows) {
    if (T.period === 'all') return rows;
    const cut = Date.now() - 30 * DAY;
    return rows.filter((r => Date.parse(r.created) >= cut));
  }
  function tally(rows, keyFn) {
    const m = new Map;
    for (const r of rows) {
      const k = keyFn(r);
      if (!k) continue;
      const e = m.get(k.key) || {
        ...k,
        total: 0,
        approved: 0,
        open: 0,
        archived: 0
      };
      e.total++;
      e[r.outcome]++;
      m.set(k.key, e);
    }
    return [ ...m.values() ].sort(((a, b) => b.total - a.total || b.approved - a.approved || a.label.localeCompare(b.label)));
  }
  function stackBar(e, max) {
    const w = max ? e.total / max * 100 : 0;
    const segs = OUTCOMES.filter((o => e[o.key])).map((o => `<i class="dt-seg dt-${o.key}" style="flex:${e[o.key]}" title="${esc(o.label)}: ${e[o.key]}"></i>`)).join('');
    return `<span class="dt-bar" style="width:${Math.max(w, 2)}%">${segs}</span>`;
  }
  const legend = () => `<div class="dt-legend">${OUTCOMES.map((o => `<span><i class="dt-sw dt-${o.key}"></i>${o.label}</span>`)).join('')}</div>`;
  function renderKpis(rows, all) {
    const approved = rows.filter((r => r.outcome === 'approved')).length;
    const archived = rows.filter((r => r.outcome === 'archived')).length;
    const migrated = rows.filter((r => r.published)).length;
    const decided = approved + archived;
    const card = (k, v, sub) => `<div class="pipe-card"><div class="pipe-k">${k}</div><div class="pipe-v">${v}</div><div class="pipe-sub">${sub}</div></div>`;
    $('dtKpis').innerHTML = [ card('Topics approved for drafting', approved, T.period === 'all' ? `of ${rows.length} the research run filed` : `of ${rows.length} filed in the last 30 days`), card('Drafts migrated to beehiiv', migrated, approved ? `from ${plural(approved, 'approved topic')}` : 'nothing approved yet'), card('Approval rate', pct(approved, decided), decided ? `of ${plural(decided, 'topic')} decided` : 'nothing decided yet') ].join('');
  }
  function renderIntake(all) {
    const box = $('dtIntake');
    if (!all.length) {
      box.innerHTML = '<h3 class="sub-h">Latest intake</h3><p class="sub-note">No topics yet.</p>';
      return;
    }
    const latestKey = dayKey(all[0].created);
    const latest = all.filter((r => dayKey(r.created) === latestKey));
    const today = dayKey(Date.now());
    const label = latestKey === today ? 'Today' : fmtDay(all[0].created);
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date;
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      const rows = all.filter((r => dayKey(r.created) === k));
      days.push({
        k: k,
        d: d,
        rows: rows,
        n: rows.length,
        by: Object.fromEntries(OUTCOMES.map((o => [ o.key, rows.filter((r => r.outcome === o.key)).length ])))
      });
    }
    const max = Math.max(5, ...days.map((d => d.n)));
    const cols = days.map((d => {
      const tip = `${fmtDay(d.d)}: ${plural(d.n, 'new topic')}${d.n ? ' (' + OUTCOMES.filter((o => d.by[o.key])).map((o => `${d.by[o.key]} ${o.label.toLowerCase()}`)).join(', ') + ')' : ''}`;
      const segs = OUTCOMES.slice().reverse().filter((o => d.by[o.key])).map((o => `<i class="dt-seg dt-${o.key}" style="flex:${d.by[o.key]}"></i>`)).join('');
      return `<div class="dt-day${d.k === latestKey ? ' is-latest' : ''}" title="${esc(tip)}">\n        <span class="dt-col" style="height:${d.n / max * 100}%">${d.n ? `<span class="dt-day-n">${d.n}</span>` : ''}${segs}</span>\n      </div>`;
    })).join('');
    const labels = days.map((d => `<span class="${d.k === latestKey ? 'is-latest' : ''}">${d.d.toLocaleDateString(undefined, {
      weekday: 'narrow'
    })}</span>`)).join('');
    const strip = `<div class="dt-plot"><span class="dt-target" style="bottom:calc((100% - 18px) * ${5 / max})" title="Pulse target: 5 a day"><em>target 5</em></span>${cols}</div><div class="dt-days">${labels}</div>`;
    const list = latest.map((r => `<li>\n        <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a>\n        <span class="dt-meta">${[ r.company, r.source ? r.source.label : 'no source logged', r.chartType ].filter(Boolean).map(esc).join(' · ')}</span>\n        <span class="dt-pill dt-${r.outcome}">${esc(r.status || r.outcome)}</span>\n      </li>`)).join('');
    box.innerHTML = `\n      <div class="dt-head"><h3 class="sub-h">Latest intake <span class="count">${esc(label)}</span></h3><span class="dt-big">${latest.length} new</span></div>\n      <p class="sub-note">The most recent day the research run filed new topics, and the last 14 days beside it.</p>\n      <div class="dt-strip">${strip}</div>\n      ${legend()}\n      <ul class="dt-list">${list}</ul>`;
  }
  function renderSources(rows) {
    const box = $('dtSources');
    const withSrc = rows.filter((r => r.source));
    const srcs = tally(withSrc, (r => r.source));
    const top = srcs.slice(0, 10);
    const max = top[0]?.total || 0;
    const kinds = tally(withSrc, (r => ({
      key: r.source.kind,
      label: KIND_LONG[r.source.kind] || r.source.kind
    })));
    const missing = rows.length - withSrc.length;
    const body = top.length ? top.map((s => {
      const decided = s.approved + s.archived;
      return `<div class="dt-row">\n        <span class="dt-kind dt-k-${esc(s.kind)}" title="${esc(KIND_LONG[s.kind] || s.kind)}">${esc(KIND[s.kind] || '?')}</span>\n        <a class="dt-name" href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.label)}">${esc(s.label)}</a>\n        <span class="dt-track">${stackBar(s, max)}</span>\n        <span class="dt-n">${s.total}</span>\n        <span class="dt-rate" title="${decided ? `${s.approved} approved of ${decided} decided` : 'nothing decided yet'}">${decided ? pct(s.approved, decided) : '-'}</span>\n      </div>`;
    })).join('') : '<p class="sub-note">No row in this period has a Source URL yet.</p>';
    box.innerHTML = `\n      <div class="dt-head"><h3 class="sub-h">Where the ideas come from <span class="count">${T.period === 'all' ? 'lifetime' : 'last 30 days'}</span></h3><span class="dt-big">${plural(srcs.length, 'source')}</span></div>\n      <p class="sub-note">Where the research run finds its topics, read off each topic's source. The % is how many of that source's decided topics we approved for drafting: the evidence for promoting or dropping a source.</p>\n      <div class="dt-mix">${kinds.map((k => `<span><b>${pct(k.total, withSrc.length)}</b> ${esc(k.label)}</span>`)).join('')}</div>\n      <div class="dt-rows"><div class="dt-row dt-row-head"><span></span><span>Source</span><span></span><span>Topics</span><span>Approved</span></div>${body}</div>\n      ${legend()}\n      ${srcs.length > top.length ? `<p class="dt-foot">+ ${plural(srcs.length - top.length, 'more source')} with fewer topics.</p>` : ''}\n      ${missing ? `<p class="dt-foot">${plural(missing, 'row')} ${missing === 1 ? 'has' : 'have'} no Source URL logged (ideas added by hand), so ${missing === 1 ? 'it is' : 'they are'} not counted above.</p>` : ''}`;
  }
  function renderTopics(rows) {
    const box = $('dtTopics');
    const cos = tally(rows, (r => r.company && {
      key: r.company,
      label: r.company
    }));
    const top = cos.filter((c => c.key !== 'Multiple')).slice(0, 10);
    const multi = cos.find((c => c.key === 'Multiple'));
    const max = top[0]?.total || 0;
    const charts = tally(rows, (r => r.chartType && {
      key: r.chartType,
      label: r.chartType
    }));
    const cmax = charts[0]?.total || 0;
    const sponsored = rows.filter((r => r.sponsored)).length;
    const coRows = top.length ? top.map((c => `<div class="dt-row dt-row-co">\n        <span class="dt-name" title="${esc(c.label)}">${esc(c.label)}</span>\n        <span class="dt-track">${stackBar(c, max)}</span>\n        <span class="dt-n">${c.total}</span>\n      </div>`)).join('') : '<p class="sub-note">No company set on any row in this period.</p>';
    const chartRows = charts.map((c => `<div class="dt-row dt-row-co">\n        <span class="dt-name">${esc(c.label)}</span>\n        <span class="dt-track"><span class="dt-bar dt-bar-mono" style="width:${Math.max(c.total / cmax * 100, 2)}%" title="${esc(c.label)}: ${c.total}"></span></span>\n        <span class="dt-n">${pct(c.total, rows.filter((r => r.chartType)).length)}</span>\n      </div>`)).join('');
    box.innerHTML = `\n      <div class="dt-head"><h3 class="sub-h">What we cover <span class="count">${T.period === 'all' ? 'lifetime' : 'last 30 days'}</span></h3><span class="dt-big">${plural(cos.length, 'company', 'companies')}</span></div>\n      <p class="sub-note">The companies the topics are about, and the chart shapes we lean on. A company that keeps coming back is a beat we own; a long tail of one-offs is a run with no beat.</p>\n      <div class="dt-split">\n        <div><h4 class="dt-h4">Companies</h4><div class="dt-rows">${coRows}</div>\n          ${multi ? `<p class="dt-foot">Plus ${plural(multi.total, 'multi-company topic')} (a comparison across several).</p>` : ''}</div>\n        <div><h4 class="dt-h4">Chart shapes</h4><div class="dt-rows">${chartRows || '<p class="sub-note">No chart type set yet.</p>'}</div>\n          ${sponsored ? `<p class="dt-foot">${plural(sponsored, 'sponsored topic')} in this period.</p>` : ''}</div>\n      </div>\n      ${legend()}`;
  }
  function render() {
    if (T.error && !T.data) {
      $('dtSub').textContent = `Couldn't load the summary: ${T.error}`;
      return;
    }
    if (!T.data) return;
    const all = T.data.rows;
    const rows = inPeriod(all);
    $('dtCount').textContent = all.length;
    $('dtSub').textContent = `Every topic the research run has filed, read at ${new Date(T.data.fetchedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })}.`;
    renderKpis(rows, all);
    renderIntake(all);
    renderSources(rows);
    renderTopics(rows);
  }
  async function load(fresh = false) {
    if (T.loading) return;
    T.loading = true;
    const btn = $('dtRefresh');
    btn?.classList.add('refreshing');
    try {
      const r = await fetch('/api/dailies/summary' + (fresh ? '?fresh=1' : ''));
      const j = await r.json().catch((() => ({})));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      T.data = j;
      T.error = null;
    } catch (e) {
      T.error = e.message;
    } finally {
      T.loading = false;
      btn?.classList.remove('refreshing');
      render();
    }
  }
  function wire() {
    if (T.wired) return;
    T.wired = true;
    $('dtRefresh').addEventListener('click', (() => load(true)));
    $('dtPeriod').addEventListener('click', (e => {
      const b = e.target.closest('[data-p]');
      if (!b) return;
      T.period = b.dataset.p;
      $('dtPeriod').querySelectorAll('[data-p]').forEach((x => x.classList.toggle('active', x === b)));
      render();
    }));
  }
  window.DailyTriage = {
    show() {
      wire();
      load(false);
    }
  };
})();
