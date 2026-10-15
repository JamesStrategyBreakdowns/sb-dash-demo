// Browser-side stand-in for the dashboard's server. It answers every /api/* call the
// frontend makes from an in-memory copy of the synthetic data in seed.js. Nothing
// leaves the browser, and reloading the page resets everything.
(function () {
  'use strict';
  const S = window.SBSeed.build(Date.now());
  const realFetch = window.fetch.bind(window);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function json(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }
  const notFound = what => json({ error: `${what} is not part of the demo.` }, 404);

  async function route(method, path, query) {
    await sleep(60 + Math.random() * 180);
    if (method !== 'GET') return notFound(`${method} ${path}`);
    switch (path) {
      case '/api/config': return json({ teamMode: true, logoToken: null });
      case '/api/sponsors': return json(S.sponsors);
      case '/api/social-followers': return json(S.followers);
      case '/api/skills': return json(S.skills);
      case '/api/workflows': return json(S.workflows);
      case '/api/skill-people': return json(S.skillPeople);
      case '/api/context': return json(S.context);
      case '/api/suggestions': return json(S.suggestions);
      case '/api/pipeline': return json(S.pipeline);
      case '/api/movement': return json(S.movement);
      case '/api/renewals': return json(S.renewals);
      case '/api/bookings': return json(S.bookings);
      case '/api/calendar': return json(S.calendar);
      case '/api/subscribers': return json(S.subscribers);
      case '/api/content-calendar': return json(S.contentCalendar);
      case '/api/big3': return json(S.big3);
      case '/api/weekly-activity': return json(S.weeklyActivity);
      case '/api/contributors': return json(S.shipping);
      case '/api/watchdog': return json(S.watchdog);
      case '/api/funnel/strategyhub': return json(S.funnelFor(query.get('period') || 'last_30_days'));
      case '/api/dailies/summary': return json({ rows: S.dailySummary, fetchedAt: new Date().toISOString() });
    }
    const m = path.match(/^\/api\/funnel\/automation\/([^/]+)\/emails$/);
    if (m) return json(S.funnelEmails(m[1]));
    return notFound(path);
  }

  window.fetch = async function (input, init = {}) {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const method = (init.method || (typeof input === 'object' && input.method) || 'GET').toUpperCase();
    if (url.origin === location.origin) {
      const api = url.pathname.match(/\/api\/.*$/);
      if (api) return route(method, api[0], url.searchParams);
      if (/\/pulse\/data\.json$/.test(url.pathname)) { await sleep(120); return json(S.pulse); }
    }
    return realFetch(input, init);
  };

  if (navigator.sendBeacon) {
    const realBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => (/\/api\//.test(String(url)) ? true : realBeacon(url, data));
  }

  const RealES = window.EventSource;
  window.EventSource = function (url, opts) {
    if (!/\/events$/.test(new URL(url, location.href).pathname)) return new RealES(url, opts);
    const es = { readyState: 1, url: String(url), onopen: null, onmessage: null, onerror: null, close() { this.readyState = 2; }, addEventListener() {}, removeEventListener() {} };
    setTimeout(() => { if (typeof es.onopen === 'function') es.onopen({ type: 'open' }); }, 80);
    return es;
  };

  // Every outbound link in the synthetic data points at demo.invalid. Keep them inert.
  function demoToast() {
    let t = document.getElementById('demoToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'demoToast';
      t.className = 'demo-toast';
      document.body.appendChild(t);
    }
    t.textContent = 'Links to Notion, the CRM and beehiiv are switched off in the demo.';
    t.classList.add('on');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('on'), 2200);
  }
  const realOpen = window.open.bind(window);
  window.open = (u, ...rest) => (/demo\.invalid/.test(String(u)) ? (demoToast(), null) : realOpen(u, ...rest));
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a && /demo\.invalid/.test(a.getAttribute('href') || '')) { e.preventDefault(); e.stopPropagation(); demoToast(); }
  }, true);
})();
