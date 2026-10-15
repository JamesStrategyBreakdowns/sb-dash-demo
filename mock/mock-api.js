// Browser-side stand-in for the dashboard's server. It answers every /api/* call the
// frontend makes from an in-memory copy of the synthetic data in seed.js. State lives
// only in this tab: reload the page and everything resets. Nothing leaves the browser.
(function () {
  'use strict';
  const S = window.SBSeed.build(Date.now());
  const realFetch = window.fetch.bind(window);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clone = o => JSON.parse(JSON.stringify(o));

  // ------------------------------------------------------------- versions helpers
  const SINGLE = ['title', 'preview', 'caption', 'poll', 'rabbitHole', 'liPost', 'xPost'];
  const N_SUBJECTS = 4, N_COMMENTS = 3, RH_LINKS = 6, RH_PICK = 3;
  const str = v => (typeof v === 'string' ? v : v == null ? '' : String(v));
  const clampIdx = (n, max) => (Number.isInteger(n) && n >= 0 && n < max ? n : 0);
  const hasLinkPool = d => Array.isArray(d?.rhLinks) && d.rhLinks.length > 0;
  const cleanSlug = s => str(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

  function normalize(raw) {
    const d = raw && typeof raw === 'object' ? raw : {};
    const three = f => [0, 1, 2].map(i => str(d[f]?.[i]));
    const out = {
      schema: 1,
      angles: [0, 1, 2].map(i => ({ name: str(d.angles?.[i]?.name), hook: str(d.angles?.[i]?.hook) })),
      slug: cleanSlug(d.slug),
      subjects: [0, 1, 2].map(v => Array.from({ length: N_SUBJECTS }, (_, i) => str(d.subjects?.[v]?.[i]))),
      xComments: [0, 1, 2].map(v => Array.from({ length: N_COMMENTS }, (_, i) => str(d.xComments?.[v]?.[i]))),
      liComments: [0, 1, 2].map(v => Array.from({ length: N_COMMENTS }, (_, i) => {
        const c = d.liComments?.[v]?.[i];
        const o = typeof c === 'string' ? { text: c } : c || {};
        return { text: str(o.text), image: null, withImage: false };
      })),
    };
    for (const f of SINGLE) out[f] = three(f);
    const p = d.picks || {};
    const gd = d.graphicDraft;
    if (gd && typeof gd === 'object') {
      const edits = k => Object.fromEntries(Object.entries(gd.edits?.[k] || {})
        .filter(([g, x]) => /^[hs]\d+$/.test(g) && x && typeof x === 'object')
        .map(([g, x]) => [g, { before: str(x.before), after: str(x.after) }]));
      out.graphicDraft = { pick: clampIdx(gd.pick, 3), note: str(gd.note).slice(0, 4000), savedAt: Number(gd.savedAt) || 0, edits: [0, 1, 2].map(edits) };
    }
    if (hasLinkPool(d)) {
      out.rhSource = three('rhSource');
      out.rhLinks = d.rhLinks.slice(0, RH_LINKS).map(l => ({ url: str(l?.url), text: [0, 1, 2].map(v => str(l?.text?.[v])) }));
    }
    const pair = (x, maxI) => [clampIdx(x?.[0], 3), clampIdx(x?.[1], maxI)];
    const pairList = (list, single) => {
      const raw2 = Array.isArray(list) ? list : Array.isArray(single) ? [single] : [[0, 0]];
      const o = raw2.filter(Array.isArray).map(x => pair(x, N_COMMENTS));
      return o.filter((x, i) => o.findIndex(y => y[0] === x[0] && y[1] === x[1]) === i);
    };
    let subjects = Array.isArray(p.subjects) ? p.subjects.map(x => pair(x, N_SUBJECTS)) : [];
    subjects = subjects.filter((x, i) => subjects.findIndex(y => y[0] === x[0] && y[1] === x[1]) === i).slice(0, N_SUBJECTS);
    if (!subjects.length) for (let i = 0; i < N_SUBJECTS; i++) subjects.push([0, i]);
    out.picks = {
      ...Object.fromEntries(SINGLE.map(f => [f, clampIdx(p[f], 3)])),
      subjects,
      xComments: pairList(p.xComments, p.xComment),
      liComments: pairList(p.liComments, p.liComment),
    };
    if (out.rhLinks) {
      const n = out.rhLinks.length;
      out.picks.rhSource = clampIdx(p.rhSource, 3);
      let links = Array.isArray(p.rhLinks)
        ? p.rhLinks.filter(Array.isArray).map(x => [clampIdx(x[0], n), clampIdx(x[1], 3)])
        : Array.from({ length: Math.min(RH_PICK, n) }, (_, k) => [k, 0]);
      links = links.filter((x, i) => links.findIndex(y => y[0] === x[0]) === i).slice(0, RH_PICK);
      out.picks.rhLinks = links.sort((a, b) => a[0] - b[0]);
    }
    return out;
  }

  function resolve(raw) {
    const d = normalize(raw);
    const p = d.picks;
    const xs = p.xComments.map(([v, i]) => d.xComments[v][i]).filter(t => t.trim());
    const ls = p.liComments.map(([v, i]) => d.liComments[v][i]).filter(c => c.text.trim());
    const label = (b, k, n) => (n > 1 ? `${b} ${k + 1}` : b);
    const subjects = p.subjects.map(([v, i]) => d.subjects[v][i]);
    return {
      name: d.title[p.title].trim(),
      subject: subjects[0] || '',
      sections: {
        description: d.caption[p.caption].trim(),
        poll: d.poll[p.poll].trim(),
        rabbitHole: d.rhLinks
          ? [d.rhSource[p.rhSource].trim(), ...p.rhLinks.map(([k, v]) => d.rhLinks[k].text[v].trim())].filter(Boolean).join('\n')
          : d.rabbitHole[p.rabbitHole].trim(),
        xPost: [d.xPost[p.xPost].trim(), ...xs.map((c, k) => `**${label('Reply', k, xs.length)}:** ${c.trim()}`)].join('\n\n'),
        liPost: [d.liPost[p.liPost].trim(), ...ls.map((c, k) => `**${label('Self-comment', k, ls.length)}:** ${c.text.trim()}`)].join('\n\n'),
      },
    };
  }

  // ------------------------------------------------------------- the Daily store
  const LABEL = { description: 'Description', poll: 'Poll', rabbitHole: 'Rabbit Hole', xPost: 'X Post', liPost: 'LinkedIn Post' };
  const SECTIONS = Object.keys(LABEL);
  const STATUS = { archived: '📁 Archived', inBeehiiv: '🙌 In Beehiiv', published: '✅ Published', drafting: '1️⃣ First Draft in Progress', review: '1️⃣ Pending Review' };
  const RANK = { '1️⃣ Pending Review': 0, '💬 Revisions Underway': 1, Idea: 2 };
  const cards = new Map();
  for (const c of S.cards) {
    c.versions = normalize(c.versions);
    const r = resolve(c.versions);
    c.name = r.name; c.subject = r.subject;
    c.sections = Object.fromEntries(SECTIONS.map(k => [k, { text: r.sections[k], locked: false, missing: false, heading: LABEL[k] }]));
    delete c.slotted;
    cards.set(c.id, c);
  }
  const touch = c => { c.lastEdited = new Date().toISOString(); return clone(c); };
  const deckList = () => [...cards.values()]
    .filter(c => !c.migrate && ![STATUS.archived, STATUS.inBeehiiv, STATUS.published, STATUS.drafting].includes(c.status) && c.enriched)
    .sort((a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9) || b.created.localeCompare(a.created))
    .map(clone);
  const dailyOf = c => ({ id: c.id, name: c.name, status: c.status, migrate: c.migrate, publishedUrl: null, superseded: null, image: c.image, url: c.url });
  const cal = S.dailyCalendar;
  const calendarView = () => {
    for (const i of cal.issues) if (i.daily && cards.has(i.daily.id)) i.daily = { ...dailyOf(cards.get(i.daily.id)), publishedUrl: i.daily.publishedUrl };
    const nextFree = cal.issues.find(i => !i.daily && i.daysOut >= cal.leadDays) || cal.issues.find(i => !i.daily) || null;
    return { ...clone(cal), nextFree: nextFree ? nextFree.id : null };
  };

  // Feedback jobs: a note "runs" for about 5 seconds, then the card comes back changed.
  const jobs = new Map();
  const FIELD_WORDS = [
    [/poll|question/i, 'poll'], [/tweet|\bx\b|twitter/i, 'xPost'], [/linkedin|\bli\b/i, 'liPost'],
    [/subject/i, 'subjects'], [/title|headline/i, 'title'],
  ];
  function applyFeedback(c, note) {
    const d = c.versions;
    const v = d.picks;
    const graphic = /graphic|image|chart|visual|colou?r/i.test(note);
    const field = (FIELD_WORDS.find(([re]) => re.test(note)) || [null, 'caption'])[1];
    let summary;
    if (field === 'caption') {
      const sentences = d.caption[v.caption].split(/(?<=\.)\s+/);
      d.caption[v.caption] = `Short version: ${sentences[0]} ${sentences.length > 1 ? 'The rest is on the chart.' : ''}`.trim();
      summary = `Tightened the caption (v${v.caption + 1}).`;
    } else if (field === 'poll') {
      const lines = d.poll[v.poll].split('\n');
      lines[0] = lines[0].replace(/\?*$/, '') + ' this year?';
      d.poll[v.poll] = lines.join('\n');
      summary = `Sharpened the poll question (v${v.poll + 1}).`;
    } else if (field === 'xPost' || field === 'liPost') {
      d[field][v[field]] = `${d[field][v[field]]}\n\nWhat would you have done?`;
      summary = `Added a closing question to the ${field === 'xPost' ? 'X' : 'LinkedIn'} post.`;
    } else if (field === 'subjects') {
      d.subjects[0][3] = `${d.subjects[0][3]} (1 min read)`;
      summary = 'Rewrote subject line D.';
    } else {
      d.title[v.title] = `${d.title[v.title]}, in one chart`;
      summary = `Retitled (v${v.title + 1}).`;
    }
    if (graphic) {
      const m = String(c.image).match(/-v(\d)\.png$/);
      const next = m ? (Number(m[1]) + 1) % 3 : 1;
      c.image = c.image.replace(/-v\d\.png$/, `-v${next}.png`);
      summary += ' Re-rendered the graphic in a new style.';
    }
    const r = resolve(d);
    c.name = r.name; c.subject = r.subject;
    for (const k of SECTIONS) c.sections[k].text = r.sections[k];
    return { summary, changed: [field === 'subjects' ? 'subject lines' : field].concat(graphic ? ['graphic'] : []), graphic };
  }
  function jobView(j) {
    const t = Date.now() - j.started;
    if (j.status === 'running') {
      if (t > 5200) {
        const c = cards.get(j.pageId);
        const out = applyFeedback(c, j.note);
        j.status = 'done'; j.stage = 'done'; j.summary = out.summary; j.changed = out.changed;
        j.graphic = out.graphic ? { brief: j.note, status: 'completed', runUrl: null } : null;
        j.card = touch(c); j.finishedAt = new Date().toISOString();
      } else {
        j.stage = t < 1400 ? 'reading' : t < 2900 ? 'thinking' : /graphic|image|chart|visual/i.test(j.note) && t > 4000 ? 'graphic' : 'writing';
      }
    }
    const { id, pageId, title, status, stage, message, summary, changed, graphic, card, createdAt, finishedAt } = j;
    return { id, pageId, title, status, stage, message, summary, changed, graphic, card, createdAt, finishedAt };
  }

  // ------------------------------------------------------------- router
  function json(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }
  const notFound = what => json({ error: `${what} is not part of the demo.` }, 404);
  const err = (status, message) => json({ error: message }, status);

  async function route(method, path, query, body) {
    await sleep(60 + Math.random() * 180);
    let m;
    if (method === 'GET') {
      switch (path) {
        case '/api/config': return json({ teamMode: true, logoToken: null });
        case '/api/sponsors': return json(S.sponsors);
        case '/api/social-followers': return json(S.followers);
        case '/api/skills': return json(S.skills);
        case '/api/workflows': return json(S.workflows);
        case '/api/skill-people': return json(S.skillPeople);
        case '/api/pipeline': return json(S.pipeline);
        case '/api/movement': return json(S.movement);
        case '/api/renewals': return json(S.renewals);
        case '/api/bookings': return json(S.bookings);
        case '/api/calendar': return json(S.calendar);
        case '/api/subscribers': return json(S.subscribers);
        case '/api/content-calendar': return json(S.contentCalendar);
        case '/api/dailies': return json({ cards: deckList(), fetchedAt: new Date().toISOString() });
        case '/api/dailies/summary': {
          const rows = S.dailySummary.map(r => {
            const c = cards.get(r.id.replace(/^sum-/, ''));
            if (!c) return r;
            const outcome = c.migrate || c.status === STATUS.inBeehiiv ? 'approved' : c.status === STATUS.archived ? 'archived' : 'open';
            return { ...r, name: c.name, status: c.status, outcome };
          });
          return json({ rows, fetchedAt: new Date().toISOString() });
        }
        case '/api/daily-calendar': return json(calendarView());
        case '/api/feedback-jobs': return json({ jobs: [...jobs.values()].map(jobView) });
      }
      if ((m = path.match(/^\/api\/dailies\/([^/]+)\/graphic-html$/))) {
        const v = ['0', '1', '2'].includes(query.get('v')) ? query.get('v') : '0';
        if (!cards.has(m[1])) return notFound('That Daily');
        const r = await realFetch(new URL(`graphics/${m[1]}-v${v}.html`, document.baseURI));
        if (!r.ok) return err(404, 'No editable graphic for this Daily.');
        return new Response(await r.text(), { status: 200, headers: { 'Content-Type': 'text/html' } });
      }
      return notFound(path);
    }

    if ((m = path.match(/^\/api\/dailies\/([^/]+)\/(fields|sections\/[a-zA-Z]+|versions|action|telemetry|feedback)$/))) {
      const c = cards.get(m[1]);
      if (!c) return notFound('That Daily');
      const what = m[2];
      if (what === 'telemetry') return new Response(null, { status: 204 });
      if (what === 'fields') {
        for (const k of ['name', 'subject']) if (typeof body[k] === 'string') c[k] = body[k];
        for (const k of ['socialsReady', 'firstEdit']) if (typeof body[k] === 'boolean') c[k] = body[k];
        return json({ card: touch(c) });
      }
      if (what.startsWith('sections/')) {
        const key = what.split('/')[1];
        if (!c.sections[key]) return err(400, `Unknown section ${key}`);
        c.sections[key].text = String(body.text ?? '');
        return json({ card: touch(c) });
      }
      if (what === 'versions') {
        if (!body.data || typeof body.data !== 'object') return err(400, 'Send the versions document as `data`.');
        c.versions = normalize(body.data);
        const r = resolve(c.versions);
        c.name = r.name; c.subject = r.subject;
        for (const k of SECTIONS) c.sections[k].text = r.sections[k];
        return json({ card: touch(c) });
      }
      if (what === 'action') {
        if (body.action === 'migrate') c.migrate = true;
        else if (body.action === 'archive') c.status = STATUS.archived;
        else if (body.action === 'restore') { c.status = body.previous?.status || STATUS.review; c.migrate = !!body.previous?.migrate; }
        else return err(400, `Unknown action ${body.action}`);
        return json({ card: touch(c) });
      }
      if (what === 'feedback') {
        const note = String(body.text || '').trim();
        if (!note) return err(400, 'Say what to change first.');
        if ([...jobs.values()].some(j => j.pageId === c.id && j.status === 'running')) return err(409, 'This Daily already has feedback in progress - wait for it to land.');
        const j = { id: `job-${jobs.size + 1}`, pageId: c.id, note, status: 'running', stage: 'reading', message: null, summary: null, changed: [], graphic: null, card: null, title: c.name, createdAt: new Date().toISOString(), finishedAt: null, started: Date.now() };
        jobs.set(j.id, j);
        return json({ job: jobView(j) });
      }
    }
    if (path === '/api/daily-calendar/slot') {
      const c = cards.get(body.pageId);
      const issue = cal.issues.find(i => i.id === body.issueId);
      if (!c || !issue) return err(400, 'Send pageId and issueId.');
      if (issue.daily && issue.daily.id !== c.id) return err(409, `${issue.date} already has "${issue.daily.name}". Move that one first.`);
      const from = cal.issues.find(i => i.daily && i.daily.id === c.id && i !== issue);
      if (from) { from.daily = null; from.houseAds = []; }
      const free = Math.max(0, cal.slots - issue.ads.length);
      const house = (Math.random() < 0.5 ? cal.houseAds.slice() : cal.houseAds.slice().reverse()).slice(0, free);
      c.migrate = true;
      issue.daily = dailyOf(c);
      issue.houseAds = house;
      cal.build = { lastDispatch: new Date().toISOString(), lastError: null, pending: false };
      return json({ result: { date: issue.date, daysOut: issue.daysOut, ads: clone(issue.ads), houseAds: house, moved: !!from, rebuilding: true }, card: touch(c) });
    }
    if (path === '/api/daily-calendar/unslot') {
      const c = cards.get(body.pageId);
      if (!c) return err(400, 'Send pageId.');
      for (const i of cal.issues) if (i.daily && i.daily.id === c.id) { i.daily = null; i.houseAds = []; }
      c.migrate = false;
      return json({ card: touch(c) });
    }
    return notFound(`${method} ${path}`);
  }

  // ------------------------------------------------------------- the patches
  window.fetch = async function (input, init = {}) {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const method = (init.method || (typeof input === 'object' && input.method) || 'GET').toUpperCase();
    if (url.origin === location.origin) {
      const api = url.pathname.match(/\/api\/.*$/);
      if (api) {
        let body = {};
        if (init.body) { try { body = JSON.parse(typeof init.body === 'string' ? init.body : await new Response(init.body).text()); } catch { body = {}; } }
        return route(method, api[0], url.searchParams, body);
      }
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

  window.SBDemo = { state: S, cards };
})();
