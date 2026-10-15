let state = {
  skills: [],
  workflows: [],
  activeTab: 'home',
  teamMode: false,
  selectedSkill: null,
  drawerOpen: false,
  skillSearch: '',
  skillCategoryFilter: null,
  skillSort: {
    col: 'name',
    dir: 'asc'
  },
  pipelineLoaded: false,
  renewalsLoaded: false,
  movementLoaded: false,
  audienceLoaded: false,
  ccalLoaded: false,
  activeSub: {}
};

async function init() {
  await applyConfig();
  await Promise.all([ fetchSkills(), fetchWorkflows(), fetchSponsors() ]);
  initNav();
  initSidebarResize();
  initThemeSwitch();
  initDrawer();
  initSkillsToolbar();
  navTo(state.activeTab);
  homeRender();
  preloadAll();
  connectSSE();
}

async function applyConfig() {
  try {
    const cfg = await (await fetch('/api/config')).json();
    state.teamMode = !!cfg.teamMode;
    LOGOS.token = cfg.logoToken || null;
  } catch {}
}

async function fetchSkills() {
  const res = await fetch('/api/skills');
  state.skills = await res.json();
  renderSkills();
  if (skillPeople) renderSkillPeople();
}

async function fetchWorkflows() {
  const res = await fetch('/api/workflows');
  state.workflows = await res.json();
}

const LOGOS = {
  domains: {},
  token: null,
  loaded: false
};

async function fetchSponsors() {
  try {
    const d = await (await fetch('/api/sponsors')).json();
    LOGOS.domains = d.domains || {};
    LOGO_FILES = d.files || {};
    LOGOS.loaded = true;
  } catch {}
}

function logoDomainFor(name) {
  if (!name) return null;
  const raw = String(name).split(/\s+[-–]\s+/)[0].trim();
  const d = LOGOS.domains;
  if (d[raw]) return d[raw];
  const lower = raw.toLowerCase();
  for (const k of Object.keys(d)) if (k.toLowerCase() === lower) return d[k];
  for (const k of Object.keys(d)) {
    if (lower.startsWith(k.toLowerCase()) || k.toLowerCase().startsWith(lower)) return d[k];
  }
  return null;
}

const MONO_COLOURS = [ '#8F6BF2', '#0FA396', '#C26A0A', '#4A9EFF', '#C084FC', '#F87171' ];

function monogram(name, size) {
  const t = (name || '?').replace(/[^A-Za-z0-9 ]/g, '').trim();
  const initials = (t.split(/\s+/).map((w => w[0])).join('').slice(0, 2) || '?').toUpperCase();
  let h = 0;
  for (let i = 0; i < t.length; i++) h = h * 31 + t.charCodeAt(i) >>> 0;
  const c = MONO_COLOURS[h % MONO_COLOURS.length];
  return `<span class="logo-mono" style="width:${size}px;height:${size}px;background:${c}22;color:${c};font-size:${Math.round(size * .4)}px">${escapeHtml(initials)}</span>`;
}

function calChipSentence(it) {
  const sponsor = it.name.split(' - ')[0];
  const n = it.name.toLowerCase();
  const when = new Date(it.date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  });
  if (it.type === 'Newsletter Ad') return `${sponsor} ad slot in the ${when} newsletter.`;
  if (it.type === 'Sponsored Breakdown') return /rerun/.test(n) ? `Rerun of the ${sponsor} Sponsored Breakdown, sent ${when}.` : `Full Sponsored Breakdown article on ${sponsor}, sent ${when}.`;
  if (it.type === 'Linkedin Post') return `Sponsored LinkedIn post for ${sponsor}, going out ${when}.`;
  if (it.type === 'X Post') return `Sponsored X post for ${sponsor}, going out ${when}.`;
  if (it.type === 'Retargeting Sequence') return `Retargeting email sequence to readers who clicked ${sponsor}'s links, starting ${when}.`;
  if (/domain insights/.test(n)) return `Domain Insights report for ${sponsor}: which companies clicked their ads, due ${when}.`;
  if (/comment support/.test(n)) return `Comment support on ${sponsor}'s sponsored post, ${when}.`;
  return `${it.type} for ${sponsor}, due ${when}.`;
}

function calChipTip(it) {
  return `<div class="rev-tip-h">${escapeHtml(it.name)}</div><div>${escapeHtml(calChipSentence(it))}</div>` + `<div class="rev-tip-note">Status: ${escapeHtml(it.status || 'Not started')}</div>`;
}

let calChipTipEl = null;

function calBindChipTips() {
  if (calChipTipEl) return;
  calChipTipEl = document.createElement('div');
  calChipTipEl.className = 'rev-tip cal-chip-tip';
  calChipTipEl.style.display = 'none';
  document.body.appendChild(calChipTipEl);
  document.addEventListener('mousemove', (e => {
    const t = e.target.closest && e.target.closest('[data-cal-tip]');
    if (!t) {
      calChipTipEl.style.display = 'none';
      return;
    }
    calChipTipEl.innerHTML = t.getAttribute('data-cal-tip');
    calChipTipEl.style.display = 'block';
    const tw = calChipTipEl.offsetWidth, th = calChipTipEl.offsetHeight;
    let left = e.clientX + 14, top = e.clientY - th - 12;
    if (left + tw > window.innerWidth - 8) left = e.clientX - tw - 14;
    if (top < 8) top = e.clientY + 18;
    calChipTipEl.style.left = left + 'px';
    calChipTipEl.style.top = top + 'px';
  }));
}

let LOGO_FILES = {};

function sponsorLogo(name, size = 20) {
  const domain = logoDomainFor(name);
  const url = domain && LOGO_FILES[domain];
  if (!url) return monogram(name, size);
  return `<img class="logo-img" src="${url}" alt="" width="${size}" height="${size}" loading="lazy" onload="window.__logoFit(this)"\n    onerror="this.outerHTML=window.__monogram(${JSON.stringify(String(name))},${size})">`;
}

window.__monogram = monogram;

window.__logoFit = img => {
  try {
    const n = 24, c = document.createElement('canvas');
    c.width = c.height = n;
    const x = c.getContext('2d', {
      willReadFrequently: true
    });
    x.drawImage(img, 0, 0, n, n);
    const a = (px, py) => x.getImageData(px, py, 1, 1).data[3];
    const m = n >> 1;
    if (a(m, 1) > 200 && a(1, m) > 200 && a(n - 2, m) > 200 && a(m, n - 2) > 200) img.classList.add('logo-bleed');
    const px = (u, v) => x.getImageData(u, v, 1, 1).data;
    const light = p => p[3] > 200 && p[0] > 225 && p[1] > 225 && p[2] > 225;
    if (light(px(0, 0)) && light(px(n - 1, 0)) && !light(px(m, 0)) && !light(px(0, m))) img.classList.add('logo-round');
  } catch {}
};

const NO_SPONSOR = /^\s*(-|–|-|n\/?a|none|tbd|\?)\s*$/i;

function sponsorCell(name, size = 15) {
  const n = String(name ?? '').trim();
  if (!n || NO_SPONSOR.test(n)) return escapeHtml(n || '-');
  return `${sponsorLogo(n, size)}${escapeHtml(n)}`;
}

let COMPANY_BY_DOMAIN = null;

function companyForDomain(domain) {
  if (!COMPANY_BY_DOMAIN) {
    COMPANY_BY_DOMAIN = {};
    const byDomain = {};
    for (const [name, d] of Object.entries(LOGOS.domains)) (byDomain[d] ||= []).push(name);
    for (const [d, names] of Object.entries(byDomain)) {
      const label = d.split('.')[0].toLowerCase();
      const exact = names.find((n => n.toLowerCase().replace(/[^a-z0-9]/g, '') === label));
      COMPANY_BY_DOMAIN[d] = exact || names.slice().sort(((a, b) => a.length - b.length))[0];
    }
  }
  return COMPANY_BY_DOMAIN[domain] || null;
}

function sponsorCompanyLine(name) {
  const domain = logoDomainFor(name);
  if (!domain) return '';
  const company = companyForDomain(domain);
  if (!company) return '';
  const shown = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (shown.includes(company.toLowerCase().replace(/[^a-z0-9]/g, ''))) return '';
  return `<div class="row-co">${escapeHtml(company)}</div>`;
}

function sourceLogo() {
  return '';
}

const HD_MAX = 16;

const hdMoney = n => fmtMoney(Math.round(n));

const hdDate = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'short'
});

const hdSponsor = name => String(name || '').split(' - ')[0].trim();

const hdCampaign = name => String(name || '').split(' - ').slice(0, 2).join(' - ').trim();

function hdKind(name) {
  const n = String(name || '');
  if (/rerun/i.test(n)) return 'Reruns';
  if (/\bSB\b|breakdown/i.test(n)) return 'Breakdowns';
  if (/\bLI\b|linkedin/i.test(n)) return 'LinkedIn posts';
  if (/\bX \d|\bX\b post/i.test(n)) return 'X posts';
  if (/\bAd\b/i.test(n)) return 'Ads';
  return 'Add-ons';
}

function hdRow(left, right, sub) {
  return `<div class="hd-row"><span class="hd-l">${left}</span><span class="hd-r">${right}</span></div>${sub ? `<div class="hd-sub">${sub}</div>` : ''}`;
}

function hdList(rows, render) {
  const shown = rows.slice(0, HD_MAX).map(render).join('');
  return shown + (rows.length > HD_MAX ? `<div class="hd-more">and ${rows.length - HD_MAX} more</div>` : '');
}

function hdLine(e) {
  return hdRow(`<span class="hd-date">${hdDate(e.date)}</span>${sponsorLogo(hdSponsor(e.name), 14)}<span class="hd-name">${escapeHtml(e.name)}</span>`, hdMoney(e.amount));
}

const HD_KIND_ORDER = [ 'Breakdowns', 'Breakdown', 'Ads', 'LinkedIn posts', 'X posts', 'Social', 'Reruns', 'Add-ons' ];

function hdGrouped(list, {kindOf: kindOf, line: line, priced: priced, perGroup: perGroup = 50, newestFirst: newestFirst = false}) {
  const months = new Map;
  for (const e of [ ...list ].sort(((a, b) => newestFirst ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)))) {
    const m = e.date.slice(0, 7);
    if (!months.has(m)) months.set(m, new Map);
    const k = kindOf(e);
    const g = months.get(m);
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(e);
  }
  const mLabel = ym => new Date(ym + '-15T12:00:00').toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  });
  const sum = arr => arr.reduce(((t, e) => t + (e.amount || 0)), 0);
  let html = '';
  for (const [m, groups] of months) {
    const all = [ ...groups.values() ].flat();
    html += `<div class="hd-month"><span>${mLabel(m)}</span><span>${all.length}${priced ? ` · ${hdMoney(sum(all))}` : ''}</span></div>`;
    const kinds = [ ...groups.keys() ].sort(((a, b) => (HD_KIND_ORDER.indexOf(a) + 1 || 99) - (HD_KIND_ORDER.indexOf(b) + 1 || 99)));
    for (const k of kinds) {
      const g = groups.get(k);
      html += `<div class="hd-kind"><span>${escapeHtml(k)}</span><span>${g.length}${priced ? ` · ${hdMoney(sum(g))}` : ''}</span></div>` + g.slice(0, perGroup).map(line).join('') + (g.length > perGroup ? `<div class="hd-more">and ${g.length - perGroup} more ${escapeHtml(k.toLowerCase())}</div>` : '');
    }
  }
  return html;
}

function hdByKind(list) {
  const t = {};
  list.forEach((e => {
    const k = hdKind(e.name);
    t[k] = (t[k] || 0) + e.amount;
  }));
  return Object.entries(t).sort(((a, b) => b[1] - a[1])).map((([k, v]) => `<span class="hd-chip">${k} ${hdMoney(v)}</span>`)).join('');
}

function hdWindow(fromISO, toISO) {
  return BOOK.entries.filter((e => e.date >= fromISO && e.date <= toISO));
}

function hdCampaigns(list) {
  const m = new Map;
  list.forEach((e => {
    const k = hdCampaign(e.name);
    const c = m.get(k) || {
      name: k,
      total: 0,
      n: 0,
      first: e.date,
      last: e.date
    };
    c.total += e.amount;
    c.n++;
    if (e.date < c.first) c.first = e.date;
    if (e.date > c.last) c.last = e.date;
    m.set(k, c);
  }));
  return [ ...m.values() ].sort(((a, b) => b.total - a.total));
}

const FOLLOWERS = {
  data: null
};

async function fetchFollowers() {
  try {
    const d = await (await fetch('/api/social-followers')).json();
    if (!d.error) FOLLOWERS.data = d;
  } catch {}
}

function homeDetail(label) {
  const today = bookToday(), tISO = bookISO(today);
  const back = n => bookISO(bookAddDays(today, -n)), fwd = n => bookISO(bookAddDays(today, n));
  const head = (t, sub) => `<div class="hd-h">${t}</div>${sub ? `<div class="hd-note">${sub}</div>` : ''}`;
  if (label.startsWith('sales:')) {
    const bucket = label.slice(6);
    const TITLE = {
      won: 'Won',
      verbal: 'Verbal / Contract',
      proposal: 'Proposals sent',
      lost: 'Lost'
    };
    const rows = MOV.rows.filter((r => r.bucket === bucket));
    if (!rows.length) return head(TITLE[bucket], 'Nothing in this window.');
    return head(`${TITLE[bucket]} · ${rows.length}`, bucket === 'lost' ? 'Attio has no loss-reason field; the note is the deal\'s latest next action.' : 'From Attio') + rows.map((r => hdRow(`${sponsorLogo(hdSponsor(r.name), 16)}<span class="hd-name"><b>${escapeHtml(r.name)}</b></span>`, hdMoney(r.value || 0), [ r.closedOn ? hdDate(r.closedOn) : '', r.lifecycle || '', r.nextAction ? `note: ${escapeHtml(r.nextAction.length > 160 ? r.nextAction.slice(0, 160) + '…' : r.nextAction)}` : '' ].filter(Boolean).join(' · ')))).join('');
  }
  switch (label) {
   case 'Revenue run-rate':
    {
      const list = hdWindow(back(89), tISO);
      return head('Last 90 days, by month', `${hdMoney(list.reduce(((s, e) => s + e.amount), 0))} delivered, ÷ 3 = the run-rate. Months at the edges are partial. Scroll for every line.`) + hdGrouped(list, {
        kindOf: e => hdKind(e.name),
        line: hdLine,
        priced: true,
        perGroup: 50,
        newestFirst: true
      });
    }

   case 'Delivered, last 30d':
    {
      const list = hdWindow(back(29), tISO).sort(((a, b) => b.date.localeCompare(a.date)));
      return head(`${list.length} deliverables delivered`, `${hdDate(back(29))} to today`) + hdGrouped(list, {
        kindOf: e => hdKind(e.name),
        line: hdLine,
        priced: true,
        newestFirst: true
      });
    }

   case 'Booked, next 30d':
    {
      const list = hdWindow(fwd(1), fwd(30)).sort(((a, b) => a.date.localeCompare(b.date)));
      return head(`${list.length} priced deliverables booked`, `tomorrow to ${hdDate(fwd(30))}`) + hdGrouped(list, {
        kindOf: e => hdKind(e.name),
        line: hdLine,
        priced: true
      });
    }

   case 'All future booked':
    {
      const cs = hdCampaigns(BOOK.entries.filter((e => e.date > tISO)));
      return head(`${cs.length} campaigns booked ahead`, 'Revenue still to run, by sponsor and phase') + hdList(cs, (c => hdRow(`${sponsorLogo(hdSponsor(c.name), 16)}<span class="hd-name"><b>${escapeHtml(c.name)}</b></span>`, `<b>${hdMoney(c.total)}</b>`, `${c.n} deliverable${c.n === 1 ? '' : 's'} · ${hdDate(c.first)}${c.last !== c.first ? ` to ${hdDate(c.last)}` : ''}`)));
    }

   case 'Open pipeline':
    {
      if (!PIPE.meta) return '';
      const stages = PIPE.meta.stages || [];
      const byStage = stages.map((st => {
        const ds = PIPE.deals.filter((d => d.stage === st.key)).sort(((a, b) => (b.value || 0) - (a.value || 0)));
        return {
          st: st,
          ds: ds,
          total: ds.reduce(((s, d) => s + (d.value || 0)), 0)
        };
      })).reverse();
      return head('Open deals by stage', 'Weighted = value × the stage\'s close probability') + byStage.map((({st: st, ds: ds, total: total}) => `<div class="hd-h2">${escapeHtml(st.key)} · ${ds.length} · ${hdMoney(total)} <span class="hd-dim">(${Math.round((st.prob || 0) * 100)}%)</span></div>` + ds.slice(0, 5).map((d => hdRow(`${sponsorLogo(hdSponsor(d.name), 14)}<span class="hd-name">${escapeHtml(d.name)}</span>`, hdMoney(d.value || 0)))).join('') + (ds.length > 5 ? `<div class="hd-more">and ${ds.length - 5} more</div>` : ''))).join('');
    }

   case 'Total audience':
    {
      const f = FOLLOWERS.data?.followers || {};
      const subs = SUBS.data?.stats.active;
      const rows = [ [ 'beehiiv subscribers', subs ], [ 'LinkedIn followers', f.linkedin ], [ 'X followers', f.x ] ];
      const total = rows.reduce(((s, [, v]) => s + (v || 0)), 0);
      return head('Where the audience is', `Followers ${FOLLOWERS.data ? 'pulled ' + new Date(FOLLOWERS.data.generated).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short'
      }) : 'not loaded yet'}. People who follow on more than one channel are counted once per channel.`) + rows.map((([k, v]) => hdRow(k, v == null ? '-' : `${subN(v)} <span class="hd-dim">${total ? Math.round(v / total * 100) + '%' : ''}</span>`))).join('') + hdRow('<b>Total</b>', `<b>${subN(total)}</b>`) + (SUBS.data ? `<div class="hd-h2">Last 5 sends</div>` + [ ...SUBS.data.points || [] ].slice(-5).reverse().map((p => hdRow(`<span class="hd-date">${new Date(p.date * 1e3).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short'
      })}</span><span class="hd-name">${escapeHtml(p.title || '')}</span>`, `${subN(p.recipients)} · ${Math.round(p.openRate)}%`))).join('') : '');
    }

   case 'Deliverables, next 30 days':
   case 'Going out this week':
    {
      if (!CAL.data) return '';
      const sunday = bookISO(bookAddDays(today, 6 - (today.getDay() + 6) % 7));
      const end = label === 'Going out this week' ? sunday : fwd(30);
      const items = (CAL.data.items || []).filter((it => it.date >= tISO && it.date <= end)).sort(((a, b) => a.date.localeCompare(b.date)));
      const counts = {};
      items.forEach((it => {
        const k = KIND_LABEL[calKind(it.type)];
        counts[k] = (counts[k] || 0) + 1;
      }));
      return head(`${items.length} deliverables`, `today to ${hdDate(end)} · ${Object.entries(counts).map((([k, v]) => `${v} ${k.toLowerCase()}`)).join(', ')}`) + hdGrouped(items, {
        kindOf: it => KIND_LABEL[calKind(it.type)],
        priced: false,
        line: it => hdRow(`<span class="hd-date">${hdDate(it.date)}</span>${sponsorLogo(hdSponsor(it.name), 14)}<span class="hd-name">${escapeHtml(it.name)}</span>`, `<span class="hd-dim">${escapeHtml(it.status || '')}</span>`)
      });
    }

   case 'Active campaigns':
   case 'Active + future booked':
    {
      if (!PULSE.campaigns) return '';
      const prog = c => {
        const it = c.items || [];
        return {
          done: it.filter((i => i.s === 'done')).length,
          n: it.length,
          next: it.find((i => i.s !== 'done'))
        };
      };
      const cs = PULSE.campaigns.filter((c => label === 'Active campaigns' ? prog(c).done > 0 : true));
      return head(label === 'Active campaigns' ? 'Campaigns with deliverables out' : 'Every live and booked campaign', 'Delivered / total, and what goes out next') + hdList(cs, (c => {
        const p = prog(c);
        return hdRow(`${sponsorLogo(c.name, 16)}<span class="hd-name"><b>${escapeHtml(c.name)}</b> <span class="hd-dim">${escapeHtml(c.sponsor || '')}</span></span>`, `${p.done}/${p.n}`, p.next ? `next: ${escapeHtml(p.next.t)} · ${escapeHtml(p.next.date)}` : 'complete');
      }));
    }
  }
  return '';
}

let hdTip = null;

function bindHomeDetail() {
  const grid = document.getElementById('homeGrid');
  if (!grid || grid.dataset.hdBound) return;
  grid.dataset.hdBound = '1';
  hdTip = document.createElement('div');
  hdTip.className = 'home-detail';
  hdTip.hidden = true;
  document.body.appendChild(hdTip);
  let current = null;
  grid.addEventListener('mouseover', (e => {
    const card = e.target.closest('[data-detail]');
    if (!card || card === current) return;
    const html = homeDetail(card.dataset.detail);
    if (!html) return;
    current = card;
    hdTip.innerHTML = html;
    hdTip.hidden = false;
    const r = card.getBoundingClientRect(), w = hdTip.offsetWidth, h = hdTip.offsetHeight;
    hdTip.scrollTop = 0;
    let x = Math.min(r.left, window.innerWidth - w - 12), y = r.bottom + 4;
    if (y + h > window.innerHeight - 8) y = Math.max(8, r.top - h - 8);
    if (y + h > window.innerHeight - 8) y = Math.max(8, window.innerHeight - h - 8);
    hdTip.style.left = Math.max(8, x) + 'px';
    hdTip.style.top = y + 'px';
  }));
  grid.addEventListener('mouseout', (e => {
    const card = e.target.closest('[data-detail]');
    if (card && !card.contains(e.relatedTarget) && !hdTip.contains(e.relatedTarget)) {
      current = null;
      hdTip.hidden = true;
    }
  }));
  hdTip.addEventListener('mouseleave', (e => {
    if (current && current.contains(e.relatedTarget)) return;
    current = null;
    hdTip.hidden = true;
  }));
}

function homeCard(label, value, sub, tab, source, featured) {
  const click = tab ? ` data-goto="${tab}"` : '';
  return `<div class="home-card${tab ? ' clickable' : ''}${featured ? ' featured' : ''}"${click} data-detail="${escapeHtml(label)}">${sourceLogo(source)}\n    <div class="pipe-k">${label}</div><div class="pipe-v">${value}</div><div class="pipe-sub">${sub}</div></div>`;
}

const KIND_ORDER = [ 'social', 'ad', 'sb', 'addon' ];

const KIND_LABEL = {
  social: 'Social',
  ad: 'Ads',
  sb: 'Breakdown',
  addon: 'Add-ons'
};

const CAL_ROW_LABEL = {
  social: 'Social',
  ad: 'Ads',
  sb: 'SB',
  addon: 'Add-ons'
};

function calKind(type) {
  if (type === 'Sponsored Breakdown') return 'sb';
  if (type === 'Newsletter Ad') return 'ad';
  if (/linkedin|x post|social/i.test(type || '')) return 'social';
  return 'addon';
}

function relISO(n) {
  const d = new Date;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DAILY_PILOT_END = relISO(11);

const HOME_TARGET = 15e4;

const DAILY_PILOT = relISO(5);

const DAILY_LAUNCH = relISO(19);

function homeWeekLine(today) {
  const monday = bookAddDays(today, -((today.getDay() + 6) % 7));
  const until = iso => Math.ceil((new Date(iso + 'T00:00:00') - today) / dayMs);
  const count = (iso, label, liveLabel) => {
    const n = until(iso);
    return n > 0 ? `<b>${label} in ${n} day${n === 1 ? '' : 's'}</b>` : n > -7 ? `<b>${liveLabel}</b>` : '';
  };
  return [ `Week of ${monday.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })}`, count(DAILY_PILOT, 'Daily pilot', 'Daily pilot is running'), count(DAILY_LAUNCH, 'Daily launches', 'Daily is live') ].filter(Boolean).join(' · ');
}

function homeSales() {
  if (!MOV.totals) return '<div class="home-panel"><h3>Sales this week</h3><div class="pipe-empty">Loading Attio&hellip;</div></div>';
  const t = MOV.totals;
  const won = MOV.rows.filter((r => r.bucket === 'won'));
  const fig = (n, label, cls, bucket) => `<div class="hs-fig" data-detail="sales:${bucket}"><span class="hs-v ${cls || ''}">${n}</span><span>${label}</span></div>`;
  return `<div class="home-panel"><h3>Sales this week</h3>\n    <div class="hs-figs">\n      ${fig(t.won.n, `won · ${fmtMoney(t.won.value)}`, 'hs-good', 'won')}\n      ${fig(t.verbal?.n ?? 0, `verbal · ${fmtMoney(t.verbal?.value || 0)}`, '', 'verbal')}\n      ${fig(t.proposal.n, `proposals · ${fmtMoney(t.proposal.value)}`, '', 'proposal')}\n      ${fig(t.lost.n, `lost · ${fmtMoney(t.lost.value)}`, 'hs-bad', 'lost')}\n    </div>\n    <div class="home-list">${won.length ? won.map((r => `<a class="home-row" href="${escapeHtml(r.url)}" target="_blank" rel="noopener">${sponsorLogo(r.name.split(' - ')[0], 18)}<span class="home-what"><b>${escapeHtml(r.name)}</b></span><span class="home-tag">${fmtMoney(r.value)}</span></a>`)).join('') : '<div class="home-row"><span class="home-what">No wins in the last 7 days.</span></div>'}</div>\n    <p class="pipe-chart-foot">From Attio. Won, lost and verbal: last ${MOV.meta?.windowDays ?? 7} days. Proposals: last ${MOV.meta?.proposalWindowDays ?? 14}.</p>\n  </div>`;
}

function homeRenewals() {
  const rows = REN.rows || [];
  const deals = (PIPE.deals || []).filter((d => d.lifecycle === 'Renewal')).sort(((a, b) => (b.value || 0) - (a.value || 0)));
  const inFlight = `<div class="hr-split"><h4>Renewal deals in progress <span class="count">${deals.length}</span></h4>\n    <div class="home-list">${deals.length ? deals.slice(0, 6).map((d => `<a class="home-row" href="${escapeHtml(d.url)}" target="_blank" rel="noopener">${sponsorLogo(hdSponsor(d.name), 18)}<span class="home-what"><b>${escapeHtml(d.name)}</b></span><span class="home-tag">${escapeHtml(d.stage)} · ${fmtMoney(d.value || 0)}</span></a>`)).join('') + (deals.length > 6 ? `<div class="home-more">and ${deals.length - 6} more, ${fmtMoney(deals.slice(6).reduce(((t, d) => t + (d.value || 0)), 0))} in total</div>` : '') : '<div class="home-row"><span class="home-what">No open renewal deals in Attio.</span></div>'}</div></div>`;
  return `<div class="home-panel"><h3>Renewals to chase <span class="count">${rows.length}</span></h3>\n    <div class="home-list">${rows.length ? rows.map((r => `<div class="home-row">${sponsorLogo(r.sponsor, 18)}<span class="home-what"><b>${escapeHtml(r.sponsor)}</b></span>\n      <span class="home-tag">${r.band === 'ending' ? `last deliverable ${r.daysLeft <= 0 ? 'today' : 'in ' + r.daysLeft + 'd'}` : `ran out ${r.daysSince}d ago`}${r.deal ? ' · deal open' : ' · no renewal deal'}</span></div>`)).join('') : '<div class="home-row"><span class="home-what">No campaign is running out without a next phase booked.</span></div>'}</div>\n    ${inFlight}\n  </div>`;
}

function homeDelivery(today, tISO, fwd) {
  const dash = '-';
  const items = CAL.data ? CAL.data.items || [] : null;
  const sunday = bookISO(bookAddDays(today, 6 - (today.getDay() + 6) % 7));
  const next30 = items ? items.filter((it => it.date >= tISO && it.date <= fwd(30))).length : null;
  const thisWeek = items ? items.filter((it => it.date >= tISO && it.date <= sunday)).length : null;
  const key = (sponsor, phase) => `${String(sponsor).trim().toLowerCase()}|${String(phase || '').replace(/\D/g, '')}`;
  const started = c => (c.items || []).some((i => i.s === 'done'));
  const active = PULSE.campaigns ? new Set(PULSE.campaigns.filter(started).map((c => key(c.name, c.sponsor)))) : null;
  let all = null;
  if (active && items) {
    all = new Set(PULSE.campaigns.map((c => key(c.name, c.sponsor))));
    items.filter((it => it.date >= tISO)).forEach((it => all.add(key(it.name.split(' - ')[0], it.phase))));
  }
  return `<div class="home-cards home-cards-4">\n    ${homeCard('Deliverables, next 30 days', next30 ?? dash, 'on the Deliverables calendar', null, null)}\n    ${homeCard('Going out this week', thisWeek ?? dash, `today through Sunday ${DAYS_SHORT(sunday)}`, null, null)}\n    ${homeCard('Active campaigns', active ? active.size : dash, 'sponsor phases with deliverables out', 'fulfilment', null)}\n    ${homeCard('Active + future booked', all ? all.size : dash, all && active ? `${all.size - active.size} more booked to start` : '', 'fulfilment', null)}\n  </div>`;
}

const DAYS_SHORT = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'short'
});

function homeRender() {
  const grid = document.getElementById('homeGrid');
  if (!grid) return;
  const today = bookToday(), tISO = bookISO(today);
  const back = n => bookISO(bookAddDays(today, -n));
  const fwd = n => bookISO(bookAddDays(today, n));
  const dash = '-';
  let delivered30 = null, booked30 = null, avgMonth90 = null, futureTotal = null;
  if (BOOK.entries.length) {
    delivered30 = bookSum(BOOK.entries, back(29), tISO);
    avgMonth90 = bookSum(BOOK.entries, back(89), tISO) / 3;
    booked30 = bookSum(BOOK.entries, fwd(1), fwd(30));
    futureTotal = BOOK.entries.filter((x => x.date > tISO)).reduce(((s, x) => s + x.amount), 0);
  }
  let openVal = null, weighted = null;
  if (PIPE.deals.length && PIPE.meta) {
    const prob = Object.fromEntries((PIPE.meta.stages || []).map((x => [ x.key, x.prob ])));
    openVal = PIPE.deals.reduce(((a, d) => a + (d.value || 0)), 0);
    weighted = PIPE.deals.reduce(((a, d) => a + (d.value || 0) * (prob[d.stage] || 0)), 0);
  }
  let subs = null, netAdds = null;
  if (SUBS.data) {
    subs = SUBS.data.stats.active;
    const cur = SUBS.main.length ? SUBS.main[SUBS.main.length - 1].recipients : subs;
    const t = Date.now() / 1e3 - 30 * 86400;
    const prior = SUBS.main.filter((p => p.date <= t)).slice(-1)[0];
    netAdds = prior ? cur - prior.recipients : null;
  }
  const cards = [ homeCard('Revenue run-rate', avgMonth90 == null ? dash : `${fmtMoney(Math.round(avgMonth90))}<span class="home-unit">/mo</span>`, avgMonth90 == null ? '' : `<span class="home-goalbar"><i style="width:${Math.min(100, avgMonth90 / HOME_TARGET * 100).toFixed(1)}%"></i></span>${Math.round(avgMonth90 / HOME_TARGET * 100)}% of ${fmtMoney(HOME_TARGET)}/mo · avg of last 90d`, null, null, true), homeCard('Delivered, last 30d', delivered30 == null ? dash : fmtMoney(delivered30), 'revenue recognised', null, null), homeCard('Booked, next 30d', booked30 == null ? dash : fmtMoney(booked30), 'already confirmed', null, null), homeCard('All future booked', futureTotal == null ? dash : fmtMoney(futureTotal), BOOK.entries.length ? `${BOOK.entries.filter((x => x.date > tISO)).length} deliverables` : '', null, null), homeCard('Open pipeline', openVal == null ? dash : fmtMoney(openVal), weighted == null ? '' : fmtMoney(weighted) + ' weighted', 'pipeline', null), homeCard('Total audience', subs == null ? dash : subN(subs + (FOLLOWERS.data?.followers?.linkedin || 0) + (FOLLOWERS.data?.followers?.x || 0)), FOLLOWERS.data ? `beehiiv + LinkedIn + X${netAdds == null ? '' : ` · ${netAdds >= 0 ? '+' : ''}${subN(netAdds)} subs in 30d`}` : 'beehiiv only until followers load', 'audience', null) ];
  calBindChipTips();
  let shipping = '<div class="pipe-empty">Loading&hellip;</div>';
  if (CAL.data) {
    const start = new Date(today);
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    const items = (CAL.data.items || []).filter((it => it.date >= tISO && it.date <= fwd(30)));
    const byDate = new Map;
    (CAL.data.items || []).filter((it => it.date >= bookISO(start) && it.date <= fwd(30))).forEach((it => {
      if (!byDate.has(it.date)) byDate.set(it.date, []);
      byDate.get(it.date).push(it);
    }));
    const weeks = Math.ceil(((today - start) / dayMs + 31) / 7);
    const DOW = [ 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun' ];
    let cells = '';
    for (let i = 0; i < weeks * 7; i++) {
      const d = bookAddDays(start, i);
      const iso = bookISO(d);
      const dow = (d.getDay() + 6) % 7;
      const weekend = dow >= 5;
      const isToday = iso === tISO;
      const past = iso < tISO;
      const beyond = iso > fwd(30);
      const day = byDate.get(iso) || [];
      const rowsHtml = KIND_ORDER.map((kind => {
        const list = day.filter((it => calKind(it.type) === kind));
        const chips = list.slice(0, 3).map((it => `<span class="cal-chip" data-cal-tip="${escapeHtml(calChipTip(it))}">${sponsorLogo(it.name.split(' - ')[0], 16)}</span>`)).join('') + (list.length > 3 ? `<span class="cal-plus">+${list.length - 3}</span>` : '');
        return `<div class="calrow${list.length ? '' : ' empty'}"><span class="calrow-lbl">${CAL_ROW_LABEL[kind]}</span><span class="calrow-chips">${chips}</span></div>`;
      })).join('');
      const pilot = iso >= DAILY_PILOT && iso <= DAILY_PILOT_END;
      const live = iso >= DAILY_LAUNCH;
      const tag = iso === DAILY_PILOT || pilot && dow === 0 ? '<span class="cal-daily-tag">Daily pilot</span>' : iso === DAILY_LAUNCH ? '<span class="cal-daily-tag launch">Daily launch</span>' : '';
      cells += `<div class="calday${isToday ? ' today' : ''}${weekend ? ' weekend' : ''}${past ? ' past' : ''}${beyond ? ' outside' : ''}${pilot ? ' daily-pilot' : ''}${live ? ' daily-live' : ''}">\n        <span class="calnum">${d.getDate()}${d.getDate() === 1 || i === 0 ? ' <em>' + d.toLocaleDateString('en-GB', {
        month: 'short'
      }) + '</em>' : ''}${tag}</span>\n        <div class="calrows">${rowsHtml}</div></div>`;
    }
    shipping = items.length ? `<div class="calgrid-head">${DOW.map((x => `<span>${x}</span>`)).join('')}</div>\n         <div class="calgrid">${cells}</div>\n         <div class="cal-foot"><span class="cal-key daily-pilot"></span>Daily pilot\n           <span class="cal-key daily-live"></span>Daily live\n           <span class="cal-key today"></span>today\n           <span class="cal-key weekend"></span>weekend\n           <span class="pv-dim">${items.length} deliverables across the next 30 days</span></div>` : '<div class="pipe-empty">Nothing scheduled in the next 30 days.</div>';
  }
  let campaigns = '<div class="pipe-empty">Loading&hellip;</div>';
  if (PULSE.campaigns) {
    const pctOf = c => {
      const it = c.items || [];
      return it.length ? it.filter((i => i.s === 'done')).length / it.length : 0;
    };
    const cs = [ ...PULSE.campaigns ].sort(((a, b) => pctOf(b) - pctOf(a)));
    campaigns = cs.length ? `<div class="hc-list"><div class="hc-row hc-head"><span>Sponsor</span><span>Phase</span><span>Progress</span><span class="hc-next">Next deliverable</span></div>` + cs.map((c => {
      const items = c.items || [];
      const done = items.filter((i => i.s === 'done')).length;
      const pct = items.length ? Math.round(done / items.length * 100) : 0;
      const next = items.find((i => i.s !== 'done'));
      return `<div class="hc-row"><span class="hc-name">${sponsorLogo(c.name, 18)}<b>${escapeHtml(c.name)}</b></span>\n        <span class="hc-phase">${escapeHtml(c.sponsor || '')}</span>\n        <span class="hc-prog"><span class="hc-bar"><i style="width:${pct}%"></i></span><span class="hc-count">${done}/${items.length}</span></span>\n        <span class="hc-next">${next ? escapeHtml(next.t + ' · ' + next.date) : 'complete'}</span></div>`;
    })).join('') + `</div>` : '<div class="pipe-empty">No live campaigns.</div>';
  }
  if (hdTip) hdTip.hidden = true;
  grid.innerHTML = `\n    <div class="home-weekline">${homeWeekLine(today)}</div>\n    <div class="home-cards">${cards.join('')}</div>\n    ${homeSales()}\n    ${homeRenewals()}\n    ${homeDelivery(today, tISO, fwd)}\n    <div class="home-panel wide"><h3>Shipping in the next 30 days</h3><p class="pipe-chart-note">From the Deliverables calendar. Each logo is one deliverable going out that day.</p>${shipping}</div>\n    <div class="home-panel wide"><h3>Live campaigns</h3><p class="pipe-chart-note">How far through each sponsor's phase we are.</p>${campaigns}</div>`;
  grid.querySelectorAll('[data-goto]').forEach((el => el.addEventListener('click', (() => navTo(el.dataset.goto)))));
  bindHomeDetail();
}

let lastPreload = 0;

const PRELOAD_STALE_MS = 10 * 60 * 1e3;

function preloadAll() {
  lastPreload = Date.now();
  const run = fn => Promise.resolve().then(fn).catch((() => {})).then((() => homeRender()));
  const jobs = [ fetchFollowers, fetchPipeline, fetchRenewals, fetchMovement, fetchBookings, fetchCalendar, fetchAudience, initPulse, () => window.DailyDeck?.prefetch(), fetchSkillPeople, () => {
    if (!state.ccalLoaded) return fetchContentCalendar();
  } ];
  jobs.forEach(run);
}

const SIDEBAR_MIN = 170, SIDEBAR_MAX = 420, SIDEBAR_KEY = 'sbLabSidebarWidth';

function setSidebarWidth(px) {
  const w = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, px));
  document.documentElement.style.setProperty('--sidebar-width', w + 'px');
  return w;
}

function initSidebarResize() {
  try {
    const saved = parseInt(localStorage.getItem(SIDEBAR_KEY), 10);
    if (saved) setSidebarWidth(saved);
  } catch {}
  const handle = document.getElementById('sidebarResize');
  if (!handle) return;
  let dragging = false;
  handle.addEventListener('mousedown', (e => {
    dragging = true;
    e.preventDefault();
    handle.classList.add('dragging');
    document.body.classList.add('sidebar-resizing');
  }));
  window.addEventListener('mousemove', (e => {
    if (dragging) setSidebarWidth(e.clientX);
  }));
  window.addEventListener('mouseup', (() => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.classList.remove('sidebar-resizing');
    const w = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width'), 10);
    try {
      localStorage.setItem(SIDEBAR_KEY, String(w));
    } catch {}
  }));
  handle.addEventListener('dblclick', (() => {
    setSidebarWidth(220);
    try {
      localStorage.setItem(SIDEBAR_KEY, '220');
    } catch {}
  }));
}

function initThemeSwitch() {
  const btnDark = document.getElementById('themeBtnDark');
  const btnLight = document.getElementById('themeBtnLight');
  if (!btnDark || !btnLight) return;
  const apply = theme => {
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light'); else document.documentElement.removeAttribute('data-theme');
    btnDark.setAttribute('aria-pressed', String(theme !== 'light'));
    btnLight.setAttribute('aria-pressed', String(theme === 'light'));
    try {
      localStorage.setItem('sbLabTheme', theme);
    } catch {}
  };
  let saved = 'dark';
  try {
    saved = localStorage.getItem('sbLabTheme') || 'dark';
  } catch {}
  apply(saved);
  btnDark.addEventListener('click', (() => apply('dark')));
  btnLight.addEventListener('click', (() => apply('light')));
}

const SUBGROUPS = {};

const DEFAULT_SUB = {};

function initNav() {
  document.querySelectorAll('.nav-item').forEach((btn => btn.addEventListener('click', (() => navTo(btn.dataset.tab)))));
  document.querySelectorAll('.nav-subitem').forEach((btn => btn.addEventListener('click', (e => {
    e.stopPropagation();
    navTo(btn.dataset.tab, btn.dataset.sub);
  }))));
}

function navTo(tabId, sub) {
  if (hdTip) hdTip.hidden = true;
  if (lastPreload && Date.now() - lastPreload > PRELOAD_STALE_MS) preloadAll();
  state.activeTab = tabId;
  document.querySelectorAll('.nav-item').forEach((btn => btn.classList.toggle('active', btn.dataset.tab === tabId)));
  document.querySelectorAll('.tab-panel').forEach((p => p.classList.toggle('active', p.id === `panel-${tabId}`)));
  document.querySelectorAll('.nav-sub').forEach((g => g.classList.toggle('expanded', g.dataset.tab === tabId)));
  if (SUBGROUPS[tabId]) {
    sub = sub || state.activeSub[tabId] || DEFAULT_SUB[tabId];
    state.activeSub[tabId] = sub;
    document.querySelectorAll(`.subtab-panel[data-group="${tabId}"]`).forEach((p => p.classList.toggle('active', p.dataset.sub === sub)));
    document.querySelectorAll(`.nav-subitem[data-tab="${tabId}"]`).forEach((b => b.classList.toggle('active', b.dataset.sub === sub)));
  }
  if (tabId !== 'skills' && tabId !== 'skillpeople' && state.drawerOpen) closeDrawer();
  if (tabId === 'skillpeople') fetchSkillPeople();
  if (tabId === 'pipeline' && !state.pipelineLoaded) {
    fetchPipeline();
    fetchRenewals();
    fetchMovement();
  }
  if (tabId === 'audience' && !state.audienceLoaded) fetchAudience();
  if (tabId === 'contentcal' && !state.ccalLoaded) fetchContentCalendar();
  if (tabId === 'fulfilment') initPulse();
  window.DailyDeck?.close();
  if (tabId === 'dailies') window.DailyTriage?.show();
}

function switchTab(tabId) {
  navTo(tabId);
}

function fmt(n) {
  return (n || 0).toLocaleString();
}

function fmtMoney(n) {
  if (!n) return '$0';
  return '$' + Math.round(n).toLocaleString();
}

function pct(num, den, dp = 1) {
  return den > 0 ? (num / den * 100).toFixed(dp) + '%' : '-';
}

function initDrawer() {
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e => {
    if (e.key === 'Escape' && state.drawerOpen) closeDrawer();
  }));
}

function openDrawer(skillId) {
  const skill = state.skills.find((s => s.id === skillId));
  if (!skill) return;
  state.selectedSkill = skill;
  state.drawerOpen = true;
  document.body.classList.add('drawer-open');
  document.querySelectorAll('.skill-row').forEach((row => {
    row.classList.toggle('selected', row.id === `skill-${skillId}`);
  }));
  renderDrawer(skill);
}

function closeDrawer() {
  state.selectedSkill = null;
  state.drawerOpen = false;
  document.body.classList.remove('drawer-open');
  document.querySelectorAll('.skill-row.selected').forEach((c => c.classList.remove('selected')));
}

function renderDrawer(skill) {
  document.getElementById('drawerTitle').textContent = `/${skill.name}`;
  const tagsEl = document.getElementById('drawerWorkflowTags');
  const colors = Object.fromEntries(SKILL_CATS.map((c => [ c.key, c.color ])));
  tagsEl.innerHTML = (skill.workflow || []).map((wf => {
    const color = colors[wf] || 'var(--text-dim)';
    return `<span class="workflow-tag" style="color: ${color}; border-color: color-mix(in srgb, ${color} 25%, transparent)">${wf}</span>`;
  })).join('');
  const relatedSkills = getRelatedSkills(skill.id);
  const body = document.getElementById('drawerBody');
  body.innerHTML = `\n    ${skill.created ? `\n      <div class="drawer-section">\n        <div class="drawer-label">Created</div>\n        <p class="drawer-text">${new Date(`${skill.created}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })}${skill.creator ? ` by ${escapeHtml(skill.creator)}` : ''}${skill.isNew ? ' <span class="sk-new">New</span>' : ''}${skill.origin ? `<br><span class="drawer-origin">${escapeHtml(skill.origin.charAt(0).toUpperCase() + skill.origin.slice(1))}</span>` : ''}</p>\n      </div>\n    ` : ''}\n\n    <div class="drawer-section">\n      <div class="drawer-label">Description</div>\n      <p class="drawer-text">${skill.description || 'No description available.'}</p>\n    </div>\n\n    ${skill.integrations.length > 0 ? `\n      <div class="drawer-section">\n        <div class="drawer-label">Integrations</div>\n        <div class="drawer-badges">\n          ${skill.integrations.map((i => `<span class="badge integration">${i}</span>`)).join('')}\n        </div>\n      </div>\n    ` : ''}\n\n    ${skill.contextFiles.length > 0 ? `\n      <div class="drawer-section">\n        <div class="drawer-label">Context Files</div>\n        <div class="drawer-badges">\n          ${skill.contextFiles.map((f => `<span class="badge context-file">${f}</span>`)).join('')}\n        </div>\n      </div>\n    ` : ''}\n\n    ${relatedSkills.length > 0 ? `\n      <div class="drawer-section">\n        <div class="drawer-label">Related Skills</div>\n        <div class="related-skills">\n          ${relatedSkills.map((r => `\n            <div class="related-skill-item" onclick="openDrawer('${r.skill.id}')">\n              <span class="related-direction">${r.direction}</span>\n              <span class="related-name">/${r.skill.name}</span>\n              <span class="related-desc">${r.skill.description ? r.skill.description.slice(0, 50) + (r.skill.description.length > 50 ? '...' : '') : ''}</span>\n            </div>\n          `)).join('')}\n        </div>\n      </div>\n    ` : ''}\n  `;
}

function getRelatedSkills(skillId) {
  const related = [];
  const seen = new Set;
  for (const wf of state.workflows) {
    const skillSteps = wf.steps.filter((s => s.skill));
    const idx = skillSteps.findIndex((s => s.skill === skillId));
    if (idx === -1) continue;
    if (idx > 0) {
      const prev = skillSteps[idx - 1];
      if (prev.skill && !seen.has(prev.skill)) {
        seen.add(prev.skill);
        const prevSkill = state.skills.find((s => s.id === prev.skill));
        if (prevSkill) {
          related.push({
            skill: prevSkill,
            direction: 'Before',
            workflowName: wf.name,
            workflowColor: wf.color
          });
        }
      }
    }
    if (idx < skillSteps.length - 1) {
      const next = skillSteps[idx + 1];
      if (next.skill && !seen.has(next.skill)) {
        seen.add(next.skill);
        const nextSkill = state.skills.find((s => s.id === next.skill));
        if (nextSkill) {
          related.push({
            skill: nextSkill,
            direction: 'After',
            workflowName: wf.name,
            workflowColor: wf.color
          });
        }
      }
    }
  }
  return related;
}

function connectSSE() {
  const status = document.getElementById('connectionStatus');
  const es = new EventSource('/events');
  es.onopen = () => {
    status.textContent = 'demo data';
    status.classList.add('connected');
  };
  es.onmessage = e => {
    const data = JSON.parse(e.data);
    if (data.type === 'update') {
      switch (data.section) {
       case 'skills':
        fetchSkills();
        fetchWorkflows();
        break;
      }
    }
  };
  es.onerror = () => {
    status.textContent = 'reconnecting...';
    status.classList.remove('connected');
  };
}

function initSkillsToolbar() {
  const searchInput = document.getElementById('skillsSearch');
  searchInput.addEventListener('input', (e => {
    state.skillSearch = e.target.value.toLowerCase();
    renderSkills();
  }));
}

const SKILL_CATS = [ {
  key: 'sales',
  label: 'Sales',
  color: 'var(--wf-sales)'
}, {
  key: 'outbound',
  label: 'Outbound',
  color: 'var(--wf-outbound)'
}, {
  key: 'content',
  label: 'Content',
  color: 'var(--wf-content)'
}, {
  key: 'crm',
  label: 'CRM',
  color: 'var(--wf-crm)'
}, {
  key: 'dailies',
  label: 'Dailies',
  color: 'var(--wf-dailies)'
}, {
  key: 'delivery',
  label: 'Campaign Delivery',
  color: 'var(--wf-delivery)'
}, {
  key: 'ops',
  label: 'Team Ops',
  color: 'var(--wf-ops)'
}, {
  key: 'meta',
  label: 'Meta & Learning',
  color: 'var(--wf-meta)'
}, {
  key: '_other',
  label: 'Other',
  color: 'var(--wf-other)'
} ];

const SKILL_STOPWORDS = new Set(('a an the to for my our i we me of on in at and or with need want ' + 'how do does can could would should please someone something this that it is are be get got ' + 'some any from into about up out new next ' + 'today tomorrow yesterday day days week weeks weekly month months monday tuesday wednesday thursday friday').split(' '));

const SKILL_SYNONYMS = {
  move: [ 'reschedule' ],
  postpone: [ 'reschedule' ],
  delay: [ 'reschedule' ],
  bump: [ 'reschedule' ],
  chase: [ 'follow-up', 'nudge' ],
  followup: [ 'follow-up' ],
  nudge: [ 'follow-up' ],
  bill: [ 'invoice' ],
  invoice: [ 'bill' ],
  pay: [ 'invoice', 'stripe' ],
  email: [ 'reply', 'gmail', 'mail' ],
  respond: [ 'reply' ],
  answer: [ 'reply' ],
  message: [ 'reply', 'msg', 'dm' ],
  renew: [ 'renewal', 'phase' ],
  renewal: [ 'renew', 'phase' ],
  schedule: [ 'calendar', 'slot', 'date' ],
  calendar: [ 'schedule', 'slot' ],
  slot: [ 'schedule', 'calendar' ],
  ad: [ 'ads', 'copy', 'sponsor' ],
  ads: [ 'ad', 'copy' ],
  post: [ 'social', 'linkedin' ],
  linkedin: [ 'social', 'post' ],
  tweet: [ 'quote-tweet', 'x' ],
  lead: [ 'prospect', 'outbound' ],
  leads: [ 'prospect', 'outbound' ],
  prospect: [ 'lead', 'outbound' ],
  score: [ 'leadscore', 'fit' ],
  crm: [ 'attio' ],
  deal: [ 'attio', 'pipeline' ],
  deals: [ 'attio', 'pipeline' ],
  newsletter: [ 'issue', 'beehiiv', 'edition' ],
  issue: [ 'beehiiv', 'edition' ],
  edition: [ 'issue', 'beehiiv' ],
  screenshot: [ 'purpleframe', 'frame' ],
  thumbnail: [ 'thumbnail-picker', 'cover' ],
  report: [ 'performance', 'stats' ],
  stats: [ 'performance', 'report' ],
  contract: [ 'sow', 'statement' ],
  price: [ 'pricing', 'proposal' ],
  pricing: [ 'proposal', 'package' ],
  quote: [ 'proposal', 'pricing' ],
  unsubscribe: [ 'inbox-sweep', 'inbox' ],
  inbox: [ 'inbox-sweep', 'sweep' ],
  article: [ 'draft', 'breakdown' ],
  write: [ 'draft', 'copy' ],
  edit: [ 't-edit', 'review' ],
  proofread: [ 'final-review' ],
  check: [ 'review', 'qa' ],
  intro: [ 'handover' ],
  handoff: [ 'handover' ],
  congrats: [ 'keep-warm' ],
  onboard: [ 'onboarding', 'onboard-sponsor' ],
  migrate: [ 'migrate', 'beehiiv' ],
  daily: [ 'daily-newsletter' ]
};

const skillStem = w => w.replace(/(ings?|ed|es|s)$/, '');

const skillEsc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function skillSearchTokens(q) {
  return q.toLowerCase().split(/[^a-z0-9-]+/).filter((t => t.length > 1 && !SKILL_STOPWORDS.has(t)));
}

function skillScore(s, tokens) {
  const fields = [ [ s.name.toLowerCase(), 6 ], [ (s.description || '').toLowerCase(), 3 ], [ (s.integrations || []).join(' ').toLowerCase(), 2 ], [ s.searchText || '', 1 ] ];
  let total = 0, matched = 0;
  for (const t of tokens) {
    const variants = [ t, skillStem(t), ...SKILL_SYNONYMS[t] || SKILL_SYNONYMS[skillStem(t)] || [] ].filter((v => v.length > 1));
    const res = variants.map((v => new RegExp(`(^|[^a-z0-9])${skillEsc(v)}`)));
    let best = 0;
    for (const [text, w] of fields) {
      if (w > best && res.some((re => re.test(text)))) best = w;
    }
    if (best) {
      matched += 1;
      total += best;
    }
  }
  if (matched < Math.ceil(tokens.length / 2)) return 0;
  return total * matched / tokens.length;
}

function skillRow(s, c) {
  return `\n        <div class="sk-row ${state.selectedSkill && state.selectedSkill.id === s.id ? 'sel' : ''}" id="skill-${s.id}" data-id="${s.id}">\n          <span class="sk-cmd" style="color:${c.color}">/${escapeHtml(s.name)}</span>\n          ${s.isNew ? `<span class="sk-new" title="Created ${escapeHtml(s.created)}">New${s.creator ? ` &middot; ${escapeHtml(s.creator)}` : ''}</span>` : ''}\n          <span class="sk-desc">${escapeHtml(s.description || '')}</span>\n          ${(s.integrations || []).slice(0, 4).map((i => `<span class="sk-int">${escapeHtml(i)}</span>`)).join('')}\n        </div>`;
}

function renderSkills() {
  const view = document.getElementById('skillsView');
  const countEl = document.getElementById('skillCount');
  if (!view) return;
  const catKeys = new Set(SKILL_CATS.map((c => c.key)));
  const catOf = s => SKILL_CATS.find((c => c.key === ((s.workflow || []).find((w => catKeys.has(w))) || '_other')));
  const tokens = skillSearchTokens(state.skillSearch || '');
  if (tokens.length) {
    const scored = state.skills.map((s => ({
      s: s,
      score: skillScore(s, tokens)
    }))).filter((r => r.score > 0)).sort(((a, b) => b.score - a.score || a.s.name.localeCompare(b.s.name)));
    const top = scored.length ? scored[0].score : 0;
    const ranked = scored.filter((r => r.score >= top * .4));
    if (countEl) countEl.textContent = `${ranked.length} match${ranked.length === 1 ? '' : 'es'}`;
    view.innerHTML = ranked.length ? `<div class="sk-group"><div class="sk-group-head">Best matches<span class="sk-group-count">${ranked.length}</span></div>\n         <div class="sk-list">${ranked.map((r => skillRow(r.s, catOf(r.s)))).join('')}</div></div>` : '<div class="empty-state">No skill matches that task. Try fewer or different words.</div>';
    view.querySelectorAll('.sk-row').forEach((r => r.addEventListener('click', (() => openDrawer(r.dataset.id)))));
    return;
  }
  let skills = [ ...state.skills ];
  if (countEl) countEl.textContent = `${skills.length} skill${skills.length === 1 ? '' : 's'}`;
  const buckets = Object.fromEntries(SKILL_CATS.map((c => [ c.key, [] ])));
  skills.sort(((a, b) => a.name.localeCompare(b.name))).forEach((s => {
    const cat = (s.workflow || []).find((w => catKeys.has(w))) || '_other';
    (buckets[cat] || buckets._other).push(s);
  }));
  let html = '';
  for (const c of SKILL_CATS) {
    const list = buckets[c.key];
    if (!list.length) continue;
    html += `<div class="sk-group">\n      <div class="sk-group-head"><span class="sk-dot" style="background:${c.color}"></span>${c.label}<span class="sk-group-count">${list.length}</span></div>\n      <div class="sk-list">${list.map((s => skillRow(s, c))).join('')}</div>\n    </div>`;
  }
  view.innerHTML = html || '<div class="empty-state">No skills match your search.</div>';
  view.querySelectorAll('.sk-row').forEach((r => r.addEventListener('click', (() => openDrawer(r.dataset.id)))));
}

function escapeHtml(text) {
  if (text == null) return '';
  return String(text).replace(/[&<>"']/g, (c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c])));
}

let skillPeople = null;

const SP_ORDER = [ 'Founder', 'Ops', 'Partnerships', 'Content', 'Claude (cloud)', 'Automation' ];

async function fetchSkillPeople() {
  if (skillPeople) return renderSkillPeople();
  try {
    const r = await fetch('/api/skill-people');
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    skillPeople = d;
    renderSkillPeople();
  } catch (e) {
    document.getElementById('spContainer').innerHTML = `<p class="section-hint" style="color:var(--stale)">Could not load skill history: ${escapeHtml(e.message)}</p>`;
  }
}

function renderSkillPeople() {
  const box = document.getElementById('spContainer');
  if (!skillPeople || !state.skills.length) return;
  const meta = Object.fromEntries(state.skills.map((s => [ s.id, s ])));
  const rows = Object.entries(skillPeople.skills).map((([id, g]) => ({
    id: id,
    ...g,
    name: meta[id]?.name || id,
    desc: meta[id]?.description || ''
  })));
  const daysAgo = iso => iso ? Math.floor((Date.now() - new Date(iso + 'T12:00:00Z')) / 864e5) : null;
  const fmtD = iso => iso ? new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  }) : '-';
  const names = [ ...new Set(rows.flatMap((r => [ r.creator, ...Object.keys(r.edits) ])).filter(Boolean)) ].sort(((a, b) => (SP_ORDER.indexOf(a) + 1 || 99) - (SP_ORDER.indexOf(b) + 1 || 99)));
  const people = names.map((n => {
    const created = rows.filter((r => r.creator === n));
    const top = rows.filter((r => r.topEditor === n));
    const edits = rows.reduce(((s, r) => s + (r.edits[n] || 0)), 0);
    const mine = rows.filter((r => r.edits[n])).sort(((a, b) => b.edits[n] - a.edits[n]));
    const newest = created.slice().sort(((a, b) => (b.created || '').localeCompare(a.created || '')))[0];
    const recent = rows.filter((r => r.lastEditor === n && daysAgo(r.lastEdited) <= 30)).length;
    return {
      n: n,
      created: created,
      top: top,
      edits: edits,
      mine: mine,
      newest: newest,
      recent: recent
    };
  })).filter((p => p.created.length || p.edits >= 5));
  const total = rows.reduce(((s, r) => s + r.totalEdits), 0);
  const busiest = rows.slice().sort(((a, b) => b.totalEdits - a.totalEdits))[0];
  const newest = rows.slice().sort(((a, b) => (b.created || '').localeCompare(a.created || '')))[0];
  const stale = rows.filter((r => !r.retired && daysAgo(r.lastEdited) > 60)).length;
  const shared = rows.filter((r => Object.keys(r.edits).filter((k => k !== 'Automation')).length >= 3)).length;
  document.getElementById('spSub').textContent = `Who built each skill and who keeps working on it, from git history (updated ${skillPeople.meta.generated}). ` + 'Skill runs are not logged anywhere, so "uses most" is read as "edits most".';
  const card = (k, v, sub) => `<div class="pipe-card"><div class="pipe-k">${k}</div><div class="pipe-v">${v}</div><div class="pipe-sub">${sub}</div></div>`;
  let h = `<div class="pipe-cards sp-cards">\n    ${card('Skills', rows.length, `${rows.filter((r => r.unattended)).length} run on a schedule, ${rows.filter((r => r.retired)).length} retired`)}\n    ${card('Edits to skills', total.toLocaleString(), `${rows.reduce(((s, r) => s + r.edits30d), 0)} in the last 30 days`)}\n    ${card('Most worked on', escapeHtml('/' + busiest.name), `${busiest.totalEdits} edits by ${Object.keys(busiest.edits).length} people`)}\n    ${card('Newest', escapeHtml('/' + newest.name), `${fmtD(newest.created)} by ${escapeHtml(newest.creator || '?')}`)}\n    ${card('Shared skills', shared, 'edited by 3 or more people')}\n    ${card('Untouched 60+ days', stale, 'not retired, no edit since')}\n  </div>`;
  h += `<div class="pipe-cards sp-cards">${people.map((p => `<div class="pipe-card sp-person">\n      <div class="sp-who"><span class="sp-avatar">${escapeHtml(p.n[0])}</span>${escapeHtml(p.n)}</div>\n      <dl class="sp-dl">\n        <dt>Created</dt><dd>${p.created.length}</dd>\n        <dt>Main editor of</dt><dd>${p.top.length}</dd>\n        <dt>Skill edits</dt><dd>${p.edits} <span class="sp-dim">(${Math.round(p.edits / total * 100)}%)</span></dd>\n        <dt>Last to edit, past 30d</dt><dd>${p.recent}</dd>\n      </dl>\n      ${p.newest ? `<div class="pipe-sub">Newest: /${escapeHtml(p.newest.name)} · ${fmtD(p.newest.created)}</div>` : ''}\n    </div>`)).join('')}</div>`;
  h += `<div class="pipe-chart sp-map-wrap">\n    <div class="sp-map-head"><h3>The skill map</h3>\n      <p class="pipe-chart-note">Each skill floats toward everyone who edits it, so shared skills sit between people. Bigger = longer skill file. Thicker ring = more edits. Colour = main editor. Hover for details, click to open.</p></div>\n    <div class="sp-map" id="spMap"></div>\n  </div>`;
  box.innerHTML = h;
  spDrawMap(rows, people.map((p => p.n)).filter((n => n !== 'Automation')), fmtD, daysAgo);
}

const SP_COLORS = {
  Founder: 'var(--gb-2)',
  Ops: 'var(--gb-5)',
  Content: 'var(--gb-3)',
  Partnerships: 'var(--gb-1)',
  'Claude (cloud)': 'var(--gb-4)'
};

const SP_PHOTOS = {};

const SP_SPOTS = {
  Founder: [ .2, .2 ],
  Ops: [ .8, .2 ],
  Partnerships: [ .84, .72 ],
  Content: [ .16, .72 ],
  'Claude (cloud)': [ .5, .9 ]
};

let spAnim = null;

function spHash(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}

function spDrawMap(rows, names, fmtD, daysAgo) {
  const el = document.getElementById('spMap');
  if (!el) return;
  if (spAnim) cancelAnimationFrame(spAnim);
  const W = 1100, H = 780, AR = 34;
  const anchors = {};
  names.forEach(((n, i) => {
    const spot = SP_SPOTS[n] || [ .5 + .4 * Math.cos(i * 1.3), .5 + .4 * Math.sin(i * 1.3) ];
    anchors[n] = {
      x: spot[0] * W,
      y: spot[1] * H,
      color: SP_COLORS[n] || 'var(--text-muted)'
    };
  }));
  const maxLines = Math.max(...rows.map((r => r.lines))), maxEdits = Math.max(...rows.map((r => r.totalEdits)));
  const nodes = rows.map((r => {
    const w = Object.entries(r.edits).filter((([n]) => anchors[n]));
    if (!w.length && anchors[r.creator]) w.push([ r.creator, 1 ]);
    const sum = w.reduce(((s, [, v]) => s + v), 0) || 1;
    const hx = w.reduce(((s, [n, v]) => s + anchors[n].x * v), 0) / sum || W / 2;
    const hy = w.reduce(((s, [n, v]) => s + anchors[n].y * v), 0) / sum || H / 2;
    const a = spHash(r.id) * Math.PI * 2, j = 30 + spHash(r.id + 'r') * 60;
    return {
      r: r,
      hx: hx,
      hy: hy,
      x: hx + Math.cos(a) * j,
      y: hy + Math.sin(a) * j,
      rad: 6 + 20 * Math.sqrt(r.lines / maxLines),
      ring: 1.5 + 6 * Math.sqrt(r.totalEdits / maxEdits),
      color: anchors[r.topEditor]?.color || 'var(--text-muted)',
      ph: spHash(r.id + 'p') * 6.28,
      sp: .6 + spHash(r.id + 's') * .6
    };
  }));
  for (let it = 0; it < 400; it++) {
    for (const n of nodes) {
      n.x += (n.hx - n.x) * .02;
      n.y += (n.hy - n.y) * .02;
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let k = i + 1; k < nodes.length; k++) {
        const b = nodes[k], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .01, min = a.rad + b.rad + a.ring + b.ring + 16;
        if (d < min) {
          const push = (min - d) / 2, ux = dx / d, uy = dy / d;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }
      for (const an of Object.values(anchors)) {
        const dx = a.x - an.x, dy = a.y - an.y, d = Math.hypot(dx, dy) || .01, min = AR + a.rad + 18;
        if (d < min) {
          a.x = an.x + dx / d * min;
          a.y = an.y + dy / d * min;
        }
      }
      a.x = Math.max(a.rad + 10, Math.min(W - a.rad - 10, a.x));
      a.y = Math.max(a.rad + 10, Math.min(H - a.rad - 24, a.y));
    }
  }
  const esc = escapeHtml;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="sp-svg"><defs>`;
  for (const n of names) if (SP_PHOTOS[n]) svg += `<clipPath id="spClip${n.replace(/\W/g, '')}"><circle cx="${anchors[n].x}" cy="${anchors[n].y}" r="${AR - 3}"/></clipPath>`;
  svg += `</defs><g id="spLinks"></g>`;
  nodes.forEach(((n, i) => {
    const showLabel = n.rad >= 13;
    svg += `<g class="sp-node" data-i="${i}" transform="translate(${n.x.toFixed(1)},${n.y.toFixed(1)})">\n      <circle r="${n.rad.toFixed(1)}" style="fill:color-mix(in srgb, ${n.color} 22%, var(--bg-card));stroke:${n.color};stroke-width:${n.ring.toFixed(1)}"/>\n      ${n.r.unattended ? `<circle r="${(n.rad * .28).toFixed(1)}" style="fill:${n.color}"/>` : ''}\n      <text y="${(n.rad + n.ring / 2 + 12).toFixed(1)}" text-anchor="middle" class="sp-lbl${showLabel ? '' : ' sp-lbl-hide'}${n.r.retired ? ' sp-lbl-retired' : ''}">/${esc(n.r.name)}</text></g>`;
  }));
  for (const n of names) {
    const a = anchors[n];
    svg += `<g class="sp-anchor"><circle cx="${a.x}" cy="${a.y}" r="${AR}" style="fill:var(--bg-card);stroke:${a.color};stroke-width:3"/>` + (SP_PHOTOS[n] ? `<image href="${SP_PHOTOS[n]}" x="${a.x - AR + 3}" y="${a.y - AR + 3}" width="${(AR - 3) * 2}" height="${(AR - 3) * 2}" clip-path="url(#spClip${n.replace(/\W/g, '')})" preserveAspectRatio="xMidYMid slice"/>` : `<text x="${a.x}" y="${a.y + 8}" text-anchor="middle" class="sp-initial" style="fill:${a.color}">${esc(n[0])}</text>`) + `<text x="${a.x}" y="${a.y + AR + 18}" text-anchor="middle" class="sp-anchor-lbl">${esc(n)}</text></g>`;
  }
  svg += '</svg><div class="rev-tip sp-tip" id="spTip" style="display:none"></div>';
  el.innerHTML = svg;
  const tip = document.getElementById('spTip'), links = document.getElementById('spLinks');
  const gs = [ ...el.querySelectorAll('.sp-node') ];
  let hovered = -1;
  const show = (i, ev) => {
    hovered = i;
    const n = nodes[i], r = n.r;
    const editors = Object.entries(r.edits).sort(((a, b) => b[1] - a[1]));
    links.innerHTML = editors.filter((([p]) => anchors[p])).map((([p, v]) => `<line x1="${anchors[p].x}" y1="${anchors[p].y}" x2="${(n.cx ?? n.x).toFixed(1)}" y2="${(n.cy ?? n.y).toFixed(1)}" style="stroke:${anchors[p].color};stroke-width:${1 + 3 * v / r.totalEdits};opacity:.55"/>`)).join('');
    const age = daysAgo(r.lastEdited);
    tip.innerHTML = `<div class="rev-tip-h">/${esc(r.name)}${r.unattended ? ' <span class="sp-badge">Scheduled</span>' : ''}${r.retired ? ' <span class="sp-badge sp-retired">Retired</span>' : ''}</div>\n      ${r.desc ? `<div class="sp-tip-desc">${esc(r.desc.length > 140 ? r.desc.slice(0, 140) + '…' : r.desc)}</div>` : ''}\n      <div class="rev-tip-row"><span>Created</span><b>${fmtD(r.created)} by ${esc(r.creator || '?')}</b></div>\n      <div class="rev-tip-row"><span>Edits</span><b>${r.totalEdits} total, ${r.edits30d} in 30d</b></div>\n      ${editors.map((([p, v]) => `<div class="rev-tip-row"><span><i style="background:${anchors[p]?.color || 'var(--text-dim)'}"></i>${esc(p)}</span><b>${v} (${Math.round(v / r.totalEdits * 100)}%)</b></div>`)).join('')}\n      <div class="rev-tip-row"><span>Last edit</span><b>${age === null ? '-' : age === 0 ? 'today' : age + 'd ago'} by ${esc(r.lastEditor || '?')}</b></div>\n      <div class="rev-tip-row"><span>Size</span><b>${r.lines} lines${r.files > 1 ? `, ${r.files} files` : ''}</b></div>`;
    tip.style.display = 'block';
    move(ev);
  };
  const move = ev => {
    const box = el.getBoundingClientRect();
    let x = ev.clientX - box.left + 16, y = ev.clientY - box.top + 16;
    if (x + tip.offsetWidth > box.width) x = ev.clientX - box.left - tip.offsetWidth - 16;
    if (y + tip.offsetHeight > box.height) y = Math.max(0, box.height - tip.offsetHeight);
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  };
  const hide = () => {
    hovered = -1;
    tip.style.display = 'none';
    links.innerHTML = '';
  };
  gs.forEach(((g, i) => {
    g.addEventListener('mouseenter', (ev => show(i, ev)));
    g.addEventListener('mousemove', move);
    g.addEventListener('mouseleave', hide);
    g.addEventListener('click', (() => openDrawer(nodes[i].r.id)));
  }));
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const panel = document.getElementById('panel-skillpeople');
  const tick = t => {
    spAnim = requestAnimationFrame(tick);
    if (document.hidden || !panel.classList.contains('active') || hovered >= 0) return;
    gs.forEach(((g, i) => {
      const n = nodes[i];
      const x = n.x + Math.sin(t * 4e-4 * n.sp + n.ph) * 5;
      const y = n.y + Math.cos(t * 3e-4 * n.sp + n.ph * 1.7) * 6;
      g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
      n.cx = x;
      n.cy = y;
    }));
  };
  spAnim = requestAnimationFrame(tick);
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date;
  const diffDays = Math.floor((now - d) / (1e3 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  });
}

const PULSE = {
  loaded: false
};

const PULSE_ICON = {
  done: '✓',
  active: '➜',
  todo: '○'
};

async function fetchPulse(force) {
  const el = document.getElementById('pulseContainer');
  const meta = document.getElementById('pulseMeta');
  try {
    const res = await fetch('pulse/data.json' + (force ? '?refresh=1' : ''));
    if (!res.ok) throw new Error('live feed unavailable (' + res.status + ')');
    const data = await res.json();
    pulseRender(data.campaigns || []);
    const n = (data.campaigns || []).length;
    meta.textContent = `${n} active campaign${n === 1 ? '' : 's'} · live from Notion · ${(new Date).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
    PULSE.loaded = true;
  } catch (e) {
    el.innerHTML = `<div class="pipe-empty">Could not load the campaign pulse - ${escapeHtml(e.message)}</div>`;
    meta.textContent = '';
  }
}

const PULSE_NODE_W = 116;

function pulseRender(campaigns) {
  PULSE.campaigns = campaigns;
  const el = document.getElementById('pulseContainer');
  if (!campaigns.length) {
    el.innerHTML = '<div class="pipe-empty">No active campaigns.</div>';
    return;
  }
  el.innerHTML = campaigns.map((c => {
    const items = c.items || [];
    const done = items.filter((i => i.s === 'done')).length;
    const tot = items.length;
    const pct = tot ? Math.round(done / tot * 100) : 0;
    const next = items.find((i => i.s !== 'done'));
    let mascotIdx = items.findIndex((i => i.s === 'active'));
    if (mascotIdx < 0) mascotIdx = items.findIndex((i => i.s === 'todo'));
    const fillPx = mascotIdx >= 0 ? (mascotIdx + .5) * PULSE_NODE_W : tot * PULSE_NODE_W;
    const nodes = items.map((i => {
      const inner = `<span class="t">${escapeHtml(i.t)}</span><span class="d">${escapeHtml(i.date)}</span>`;
      const box = i.url ? `<a class="box" href="${escapeHtml(i.url)}" target="_blank" rel="noopener">${inner}</a>` : `<span class="box">${inner}</span>`;
      return `<div class="node ${i.s}"><div class="connector"></div>${box}<div class="tick">${PULSE_ICON[i.s] || ''}</div></div>`;
    })).join('');
    const mascot = mascotIdx >= 0 ? `<div class="mascot" style="left:${fillPx}px" title="We are here"><img src="pulse/assets/mascot.png" alt=""></div>` : '';
    return `<div class="card">\n      <div class="chead">\n        ${sponsorLogo(c.name, 24)}<span class="cname">${escapeHtml(c.name)}</span>\n        <span class="pill">${escapeHtml(c.sponsor || '')}</span>\n        <span class="count"><b>${done}</b> of <b>${tot}</b> delivered &middot; ${pct}%</span>\n      </div>\n      <div class="nextup">Next up: <b>${next ? escapeHtml(next.t + ' - ' + next.date) : '&#127881; all delivered'}</b></div>\n      <div class="timeline"><div class="tlinner" style="width:${tot * PULSE_NODE_W}px">\n        <div class="barrow"><div class="bar"><i style="width:${fillPx}px"></i></div>${mascot}</div>\n        <div class="track">${nodes}</div>\n      </div></div>\n    </div>`;
  })).join('');
  el.querySelectorAll('.timeline').forEach((tr => {
    const a = tr.querySelector('.node.active') || tr.querySelector('.node.todo');
    if (a) tr.scrollLeft = Math.max(0, a.offsetLeft - tr.clientWidth / 2 + a.offsetWidth / 2);
  }));
}

function initPulse() {
  const btn = document.getElementById('pulseRefreshBtn');
  if (btn && !btn.dataset.bound) {
    btn.dataset.bound = '1';
    btn.addEventListener('click', (() => fetchPulse(true)));
  }
  if (!PULSE.loaded) return fetchPulse(false);
}

const BOOK = {
  entries: []
};

const dayMs = 864e5;

const bookToday = () => {
  const d = new Date;
  d.setHours(0, 0, 0, 0);
  return d;
};

const bookISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const bookAddDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

async function fetchBookings() {
  try {
    const r = await fetch('/api/bookings');
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    bookRender(d);
  } catch (e) {
    console.warn(e);
  }
}

function bookSum(entries, fromISO, toISO) {
  return entries.reduce(((s, e) => e.date >= fromISO && e.date <= toISO ? s + e.amount : s), 0);
}

function bookRender(data) {
  BOOK.entries = data.entries || [];
}

function skillChip(cmd) {
  return `<button type="button" class="skill-chip" data-cmd="${escapeHtml(cmd)}" title="Copy &quot;${escapeHtml(cmd)}&quot; to paste into Claude Code">${escapeHtml(cmd.split(' ')[0])}</button>`;
}

const skillArg = name => String(name || '').split(/\s*[-\u2013\u2014]\s+|\s+[-\u2013\u2014]\s*/)[0].replace(/\s*\(.*\)\s*/g, ' ').replace(/\s+(phase\s*\d+|p\d+|fy\d+|20\d\d)\b.*$/i, '').trim();

document.addEventListener('click', (e => {
  const chip = e.target.closest && e.target.closest('.skill-chip');
  if (!chip) return;
  e.preventDefault();
  e.stopPropagation();
  const cmd = chip.dataset.cmd, label = chip.textContent;
  const done = ok => {
    chip.textContent = ok ? 'Copied' : 'Copy failed';
    chip.classList.add('copied');
    setTimeout((() => {
      chip.textContent = label;
      chip.classList.remove('copied');
    }), 1400);
  };
  const fallback = () => {
    const ta = Object.assign(document.createElement('textarea'), {
      value: cmd
    });
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {}
    ta.remove();
    done(ok);
  };
  try {
    navigator.clipboard.writeText(cmd).then((() => done(true)), fallback);
  } catch {
    fallback();
  }
}), true);

const COLLAPSE_KEY = 'sbLabCollapsed';

function readCollapsed() {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}');
  } catch {
    return {};
  }
}

function setCollapsed(id, folded) {
  const sec = document.getElementById(id);
  const head = document.querySelector(`[data-collapse="${id}"]`);
  if (!sec || !head) return;
  sec.classList.toggle('is-collapsed', folded);
  head.setAttribute('aria-expanded', String(!folded));
}

function toggleCollapsed(id) {
  const saved = readCollapsed();
  saved[id] = !saved[id];
  try {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(saved));
  } catch {}
  setCollapsed(id, saved[id]);
}

document.addEventListener('click', (e => {
  const head = e.target.closest && e.target.closest('[data-collapse]');
  if (head) toggleCollapsed(head.dataset.collapse);
}));

document.addEventListener('keydown', (e => {
  const head = e.target.closest && e.target.closest('[data-collapse]');
  if (head && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    toggleCollapsed(head.dataset.collapse);
  }
}));

Object.entries(readCollapsed()).forEach((([id, folded]) => setCollapsed(id, !!folded)));

const PIPE = {
  meta: null,
  deals: []
};

const TODAY_MS = Date.now();

function pipeDays(since) {
  if (!since) return null;
  return Math.floor((TODAY_MS - new Date(since + 'T00:00:00Z').getTime()) / 864e5);
}

async function fetchPipeline() {
  state.pipelineLoaded = true;
  try {
    const res = await fetch('/api/pipeline');
    const data = await res.json();
    pipeRender(data);
  } catch (e) {
    state.pipelineLoaded = false;
    document.getElementById('pipeSub').innerHTML = `<span style="color:var(--stale)">Could not load /api/pipeline - ${escapeHtml(e.message)}</span>`;
  }
}

const PIPE_COLORS = {
  'Warm Lead': '#C26A0A',
  Talking: '#0FA396',
  'Sent Proposal': '#8F6BF2',
  'Verbal / Contract': '#2E6FB7'
};

const pipeColor = key => PIPE_COLORS[key] || '#7A7A88';

const pipeK = v => v >= 1e3 ? '$' + (v / 1e3).toFixed(v >= 99500 ? 0 : 1).replace(/\.0$/, '') + 'k' : '$' + Math.round(v);

const pipeAttr = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function pipeTopRect(x, y, w, h, r, fill, extra = '') {
  r = Math.min(r, h, w / 2);
  return `<path d="M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z" fill="${fill}" ${extra}/>`;
}

function pipeRightRect(x, y, w, h, r, fill, extra = '') {
  r = Math.min(r, w, h / 2);
  return `<path d="M${x},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} L${x},${y + h} Z" fill="${fill}" ${extra}/>`;
}

function pipeBindTips() {
  if (PIPE.tipBound) return;
  PIPE.tipBound = true;
  pipeTipsOn(document.getElementById('pipeCharts'));
}

function pipeTipsOn(wrap) {
  if (!PIPE.tip) {
    const t = document.createElement('div');
    t.className = 'rev-tip';
    t.style.display = 'none';
    document.body.appendChild(t);
    PIPE.tip = t;
  }
  const tip = PIPE.tip;
  wrap.addEventListener('mousemove', (e => {
    const t = e.target.closest('[data-tip]');
    if (!t) {
      tip.style.display = 'none';
      return;
    }
    tip.innerHTML = t.getAttribute('data-tip');
    tip.style.display = 'block';
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = e.clientX + 14, top = e.clientY - th - 12;
    if (left + tw > window.innerWidth - 8) left = e.clientX - tw - 14;
    if (top < 8) top = e.clientY + 18;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }));
  wrap.addEventListener('mouseleave', (() => {
    tip.style.display = 'none';
  }));
}

const GB_SLICES = 5;

const gbDay = d => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const gbDiffDays = (a, b) => Math.round((gbDay(b) - gbDay(a)) / 864e5);

const gbMonthStart = (y, m) => new Date(y, m, 1);

const gbMonthEnd = (y, m) => new Date(y, m + 1, 0);

const gbMin = (a, b) => a < b ? a : b;

const gbFmt = d => d.toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'short'
});

const gbFmtY = d => d.toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

function gbTrailing(n) {
  return {
    range: t => ({
      from: bookAddDays(t, -(n - 1)),
      to: t
    }),
    prev: t => ({
      from: bookAddDays(t, -(2 * n - 1)),
      to: bookAddDays(t, -n)
    })
  };
}

const GB_PERIODS = [ {
  key: 'l30',
  label: 'Last 30 days',
  ...gbTrailing(30)
}, {
  key: 'l90',
  label: 'Last 90 days',
  ...gbTrailing(90)
}, {
  key: 'l365',
  label: 'Last 12 months',
  ...gbTrailing(365)
}, {
  key: 'tm',
  label: 'This month',
  range: t => ({
    from: gbMonthStart(t.getFullYear(), t.getMonth()),
    to: t
  }),
  prev: t => {
    const s = gbMonthStart(t.getFullYear(), t.getMonth() - 1);
    return {
      from: s,
      to: gbMin(bookAddDays(s, t.getDate() - 1), gbMonthEnd(s.getFullYear(), s.getMonth()))
    };
  }
}, {
  key: 'lm',
  label: 'Last month',
  range: t => ({
    from: gbMonthStart(t.getFullYear(), t.getMonth() - 1),
    to: gbMonthEnd(t.getFullYear(), t.getMonth() - 1)
  }),
  prev: t => ({
    from: gbMonthStart(t.getFullYear(), t.getMonth() - 2),
    to: gbMonthEnd(t.getFullYear(), t.getMonth() - 2)
  })
}, {
  key: 'tq',
  label: 'This quarter',
  range: t => ({
    from: gbMonthStart(t.getFullYear(), Math.floor(t.getMonth() / 3) * 3),
    to: t
  }),
  prev: t => {
    const q0 = gbMonthStart(t.getFullYear(), Math.floor(t.getMonth() / 3) * 3);
    const s = gbMonthStart(q0.getFullYear(), q0.getMonth() - 3);
    const mEnd = gbMonthEnd(s.getFullYear(), s.getMonth() + (t.getMonth() - q0.getMonth()));
    return {
      from: s,
      to: new Date(mEnd.getFullYear(), mEnd.getMonth(), Math.min(t.getDate(), mEnd.getDate()))
    };
  }
}, {
  key: 'lq',
  label: 'Last quarter',
  range: t => {
    const q0 = gbMonthStart(t.getFullYear(), Math.floor(t.getMonth() / 3) * 3);
    return {
      from: gbMonthStart(q0.getFullYear(), q0.getMonth() - 3),
      to: bookAddDays(q0, -1)
    };
  },
  prev: t => {
    const q0 = gbMonthStart(t.getFullYear(), Math.floor(t.getMonth() / 3) * 3);
    return {
      from: gbMonthStart(q0.getFullYear(), q0.getMonth() - 6),
      to: bookAddDays(gbMonthStart(q0.getFullYear(), q0.getMonth() - 3), -1)
    };
  }
}, {
  key: 'ytd',
  label: 'Year to date',
  range: t => ({
    from: new Date(t.getFullYear(), 0, 1),
    to: t
  }),
  prev: t => {
    const s = new Date(t.getFullYear() - 1, 0, 1);
    return {
      from: s,
      to: gbMin(new Date(t.getFullYear() - 1, t.getMonth(), t.getDate()), new Date(t.getFullYear() - 1, 11, 31))
    };
  }
} ];

const gbPeriod = key => GB_PERIODS.find((p => p.key === key)) || GB_PERIODS[0];

const GB_STATE_KEY = 'gbState';

function gbState() {
  let s = {};
  try {
    s = JSON.parse(localStorage.getItem(GB_STATE_KEY) || '{}');
  } catch {}
  return {
    a: gbPeriod(s.a).key,
    b: s.b === 'auto' || !s.b ? 'auto' : gbPeriod(s.b).key,
    compare: !!s.compare
  };
}

function gbSave(s) {
  try {
    localStorage.setItem(GB_STATE_KEY, JSON.stringify(s));
  } catch {}
}

function gbRangeLabel(r) {
  const sameYear = r.from.getFullYear() === r.to.getFullYear();
  const days = gbDiffDays(r.from, r.to) + 1;
  return `${sameYear ? gbFmt(r.from) : gbFmtY(r.from)} - ${gbFmtY(r.to)} · ${days} day${days === 1 ? '' : 's'}`;
}

function gbSide(won, r) {
  const from = bookISO(r.from), to = bookISO(r.to);
  const inWin = won.filter((d => d.closedOn && d.closedOn >= from && d.closedOn <= to));
  const priced = inWin.filter((d => d.value > 0)).sort(((x, y) => y.value - x.value));
  return {
    r: r,
    deals: inWin,
    priced: priced,
    total: priced.reduce(((s, d) => s + d.value), 0)
  };
}

function gbOptions(selected, withAuto) {
  return (withAuto ? `<option value="auto"${selected === 'auto' ? ' selected' : ''}>The period before</option>` : '') + GB_PERIODS.map((p => `<option value="${p.key}"${p.key === selected ? ' selected' : ''}>${p.label}</option>`)).join('');
}

function gbDonut(side, colorOf, ariaLabel) {
  const total = side.total;
  if (!total) return '<div class="pipe-empty">No priced deals won in this timeframe.</div>';
  const named = side.priced.filter((d => colorOf.has(d.name)));
  const rest = side.priced.filter((d => !colorOf.has(d.name)));
  const slices = named.map((d => ({
    name: d.name,
    value: d.value,
    color: colorOf.get(d.name),
    deals: [ d ]
  })));
  if (rest.length) slices.push({
    name: `Other (${rest.length} deal${rest.length === 1 ? '' : 's'})`,
    value: rest.reduce(((s, d) => s + d.value), 0),
    color: 'var(--text-dim)',
    deals: rest
  });
  const pct = v => `${Math.round(v / total * 1e3) / 10}%`;
  const tipFor = sl => {
    let rows = `<div class="rev-tip-row"><span>Value</span><b>${fmtMoney(sl.value)}</b></div>` + `<div class="rev-tip-row"><span>Share</span><b>${pct(sl.value)}</b></div>`;
    rows += sl.deals.length === 1 ? `<div class="rev-tip-row"><span>Won</span><b>${escapeHtml(sl.deals[0].closedOn || '')}</b></div>` : sl.deals.map((d => `<div class="rev-tip-row"><span>${escapeHtml(d.name)}</span><b>${fmtMoney(d.value)}</b></div>`)).join('');
    return `<div class="rev-tip-h">${escapeHtml(sl.name)}</div>${rows}`;
  };
  const R = 100, r = 58, C = 110;
  const pt = (rad, a) => [ C + rad * Math.sin(a), C - rad * Math.cos(a) ];
  let a0 = 0, paths = '';
  slices.forEach((sl => {
    const a1 = a0 + sl.value / total * Math.PI * 2;
    const tip = `data-tip="${pipeAttr(tipFor(sl))}"`;
    if (slices.length === 1) {
      paths += `<circle cx="${C}" cy="${C}" r="${(R + r) / 2}" fill="none" stroke="${sl.color}" stroke-width="${R - r}" ${tip}/>`;
    } else {
      const big = a1 - a0 > Math.PI ? 1 : 0;
      const [x0, y0] = pt(R, a0), [x1, y1] = pt(R, a1), [x2, y2] = pt(r, a1), [x3, y3] = pt(r, a0);
      paths += `<path d="M${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${big} 1 ${x1.toFixed(2)},${y1.toFixed(2)} L${x2.toFixed(2)},${y2.toFixed(2)} A${r},${r} 0 ${big} 0 ${x3.toFixed(2)},${y3.toFixed(2)} Z" fill="${sl.color}" stroke="var(--bg-card)" stroke-width="2" ${tip}/>`;
    }
    a0 = a1;
  }));
  const n = side.priced.length;
  const svg = `<svg class="gb-donut" viewBox="0 0 220 220" role="img" aria-label="${pipeAttr(ariaLabel)}">${paths}\n    <text x="${C}" y="${C - 2}" text-anchor="middle" class="gb-total">${pipeK(total)}</text>\n    <text x="${C}" y="${C + 16}" text-anchor="middle" class="pv-lbl">${n} deal${n === 1 ? '' : 's'}</text></svg>`;
  const legend = slices.map((sl => `<div class="gb-leg" data-tip="${pipeAttr(tipFor(sl))}">\n    <i class="pipe-sw" style="background:${sl.color}"></i><span class="gb-leg-name">${escapeHtml(sl.name)}</span>\n    <b>${fmtMoney(sl.value)}</b><span class="gb-leg-pct">${pct(sl.value)}</span></div>`)).join('');
  return `<div class="gb-body">${svg}<div class="gb-legend">${legend}</div></div>`;
}

function gbHeadline(side) {
  const won = side.deals.length;
  return `<div class="gb-headline"><span class="gb-big">${fmtMoney(side.total)}</span>\n    <span class="gb-meta">${won} deal${won === 1 ? '' : 's'} won · ${escapeHtml(gbRangeLabel(side.r))}</span></div>`;
}

function gbRender() {
  const el = document.getElementById('gbPanel');
  if (!el) return;
  const won = PIPE.won;
  if (!won) {
    el.innerHTML = '';
    return;
  }
  const st = gbState();
  const today = gbDay(new Date);
  const pA = gbPeriod(st.a);
  const A = gbSide(won, pA.range(today));
  const undated = won.filter((d => !d.closedOn)).length;
  const foot = undated ? `<p class="pipe-chart-note gb-foot">${undated} Won deal${undated === 1 ? ' has' : 's have'} no Won date in Attio and ${undated === 1 ? 'is' : 'are'} not counted in any timeframe.</p>` : '';
  const controls = `<div class="gb-controls">\n      <select class="gb-select" data-gb="a" aria-label="Timeframe">${gbOptions(st.a, false)}</select>\n      <button type="button" class="gb-compare${st.compare ? ' on' : ''}" data-gb="compare" aria-pressed="${st.compare}">Compare</button>\n    </div>`;
  const head = `<div class="gb-head"><h3>Gross signed</h3>${controls}</div>`;
  if (!st.compare) {
    const colorOf = new Map(A.priced.slice(0, GB_SLICES).map(((d, i) => [ d.name, `var(--gb-${i + 1})` ])));
    el.innerHTML = `<div class="pipe-chart gb-panel">${head}\n      <p class="pipe-chart-note">Value of deals that reached Won in the timeframe, as signed. Hover a slice for the detail.</p>\n      ${gbHeadline(A)}${gbDonut(A, colorOf, `Gross signed, ${pA.label}, by deal`)}${foot}</div>`;
  } else {
    const rB = st.b === 'auto' ? pA.prev(today) : gbPeriod(st.b).range(today);
    const B = gbSide(won, rB);
    const labelB = st.b === 'auto' ? 'The period before' : gbPeriod(st.b).label;
    const colorOf = new Map;
    for (let i = 0; colorOf.size < GB_SLICES && (i < A.priced.length || i < B.priced.length); i++) {
      for (const d of [ A.priced[i], B.priced[i] ]) {
        if (d && colorOf.size < GB_SLICES && !colorOf.has(d.name)) colorOf.set(d.name, `var(--gb-${colorOf.size + 1})`);
      }
    }
    const diff = A.total - B.total;
    const pctTxt = B.total ? `${diff >= 0 ? '+' : ''}${Math.round(diff / B.total * 1e3) / 10}%` : 'n/a';
    const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : '';
    const strip = `<div class="gb-change ${cls}"><b>${diff >= 0 ? '+' : '-'}${fmtMoney(Math.abs(diff))}</b>\n      <span>${pctTxt}</span><span class="gb-meta">${A.deals.length} vs ${B.deals.length} deals won · ${escapeHtml(pA.label)} vs ${escapeHtml(labelB.toLowerCase())}</span></div>`;
    el.innerHTML = `<div class="pipe-chart gb-panel">${head}\n      <p class="pipe-chart-note">Value of deals that reached Won, as signed. A deal keeps the same colour on both sides. "The period before" runs to the same point of the previous period, so a month in progress is compared like-for-like.</p>\n      ${strip}\n      <div class="gb-split">\n        <div class="gb-side"><div class="gb-side-h">${escapeHtml(pA.label)}</div>${gbHeadline(A)}${gbDonut(A, colorOf, `Gross signed, ${pA.label}, by deal`)}</div>\n        <div class="gb-side"><div class="gb-side-h"><select class="gb-select" data-gb="b" aria-label="Compare with">${gbOptions(st.b, true)}</select></div>${gbHeadline(B)}${gbDonut(B, colorOf, `Gross signed, ${labelB}, by deal`)}</div>\n      </div>${foot}</div>`;
  }
  if (!el.dataset.bound) {
    el.dataset.bound = '1';
    pipeTipsOn(el);
    el.addEventListener('change', (e => {
      const k = e.target.dataset && e.target.dataset.gb;
      if (k !== 'a' && k !== 'b') return;
      const s = gbState();
      s[k] = e.target.value;
      gbSave(s);
      gbRender();
    }));
    el.addEventListener('click', (e => {
      if (!e.target.closest('[data-gb="compare"]')) return;
      const s = gbState();
      s.compare = !s.compare;
      gbSave(s);
      gbRender();
    }));
  }
}

function pipeRender(data) {
  PIPE.lastData = data;
  PIPE.meta = data.meta;
  PIPE.deals = data.deals;
  const stages = data.meta.stages, staleDays = data.meta.staleDays || 30;
  const activeStages = new Set([ 'Talking', 'Sent Proposal', 'Verbal / Contract' ]);
  const enriched = data.deals.map((d => ({
    ...d,
    days: pipeDays(d.stageSince)
  })));
  const isStale = d => d.days != null && d.days > staleDays && activeStages.has(d.stage);
  const openValue = enriched.reduce(((s, d) => s + (d.value || 0)), 0);
  const probByStage = Object.fromEntries(stages.map((s => [ s.key, s.prob ])));
  const weighted = enriched.reduce(((s, d) => s + (d.value || 0) * (probByStage[d.stage] || 0)), 0);
  const staleCount = enriched.filter(isStale).length;
  document.getElementById('pipeCount').textContent = enriched.length;
  document.getElementById('pipeSub').textContent = `${enriched.length} open Attio deals, plus what moved recently · ${data.meta.currency} · pulled ${data.meta.pulled}`;
  const atStage = k => enriched.filter((d => d.stage === k));
  const sumOf = ds => ds.reduce(((s, d) => s + (d.value || 0)), 0);
  const proposals = atStage('Sent Proposal');
  const verbal = atStage('Verbal / Contract');
  const cards = [ [ 'Open pipeline', fmtMoney(openValue), `${enriched.length} deals` ], [ 'Weighted value', fmtMoney(weighted), 'stage-probability adjusted' ], [ 'Proposals out', fmtMoney(sumOf(proposals)), `${proposals.length} deals` ], [ 'Agreed, unsigned', fmtMoney(sumOf(verbal)), verbal.length ? `${verbal.length} deal${verbal.length > 1 ? 's' : ''} awaiting paper` : 'nothing waiting on paper' ], [ 'Needs a nudge', String(staleCount), `${staleDays}d+ in active stage` ] ];
  PIPE.won = Array.isArray(data.won) ? data.won : null;
  gbRender();
  document.getElementById('pipeCards').innerHTML = cards.map((c => `<div class="pipe-card"><div class="pipe-k">${c[0]}</div><div class="pipe-v">${c[1]}</div><div class="pipe-sub">${c[2]}</div></div>`)).join('');
  pipeCharts(enriched, stages, {
    openValue: openValue,
    weighted: weighted,
    probByStage: probByStage,
    isStale: isStale,
    staleDays: staleDays
  });
  pipeBoard(enriched, stages, isStale);
}

function pipeCharts(deals, stages, ctx) {
  const wrap = document.getElementById('pipeCharts');
  const legend = stages.map((s => `<span><i class="pipe-sw" style="background:${pipeColor(s.key)}"></i>${s.key}</span>`)).join('');
  const block = (title, note, body, foot = '') => `<div class="pipe-chart"><h3>${title}</h3><p class="pipe-chart-note">${note}</p>${body}${foot}</div>`;
  wrap.innerHTML = block('Value by stage', 'Where the open dollars sit as deals move left to right toward a win.', pcStageFlow(deals, stages)) + block('Weighted forecast', 'What the pipeline is really worth once stage probabilities are applied.', pcForecast(deals, stages, ctx)) + block('Where deals come from', 'Open value by deal source. Counts include unpriced deals.', pcSources(deals)) + block('Biggest open deals', 'Concentration check - how much of the pipeline hangs on a few logos.', pcTopDeals(deals, ctx.openValue), `<div class="pipe-legend">${legend}</div>`) + block('Deal aging', `How long each deal has sat in its current stage. Red ring = ${ctx.staleDays}d+ in an active stage.`, pcAging(deals, stages, ctx.isStale), `<div class="pipe-legend">${legend}</div>`) + block('Stage entries by month', 'Deals entering their current stage each month - is the top of funnel moving?', pcEntries(deals, stages), `<div class="pipe-legend">${legend}</div>`);
  pipeBindTips();
}

function pcStageFlow(deals, stages) {
  const W = 560, H = 250, padT = 34, padB = 44, plotH = H - padT - padB;
  const agg = stages.map((s => {
    const ds = deals.filter((d => d.stage === s.key));
    return {
      key: s.key,
      n: ds.length,
      val: ds.reduce(((a, d) => a + (d.value || 0)), 0),
      priced: ds.filter((d => d.value > 0)).length
    };
  }));
  const mx = Math.max(1, ...agg.map((a => a.val)));
  const slot = W / agg.length, bw = Math.min(120, slot - 60);
  let s = `<line x1="0" y1="${H - padB}" x2="${W}" y2="${H - padB}" stroke="var(--border)"/>`;
  agg.forEach(((a, i) => {
    const cx = slot * i + slot / 2, h = Math.max(2, a.val / mx * plotH), y = H - padB - h;
    const tip = `<div class="rev-tip-h">${pipeAttr(a.key)}</div><div class="rev-tip-row"><span>Open value</span><b>${fmtMoney(a.val)}</b></div><div class="rev-tip-row"><span>Deals</span><b>${a.n}</b></div><div class="rev-tip-row"><span>Priced</span><b>${a.priced} of ${a.n}</b></div>`;
    s += pipeTopRect(cx - bw / 2, y, bw, h, 4, pipeColor(a.key), `data-tip="${pipeAttr(tip)}"`);
    s += `<text x="${cx}" y="${y - 8}" text-anchor="middle" class="pv-val">${pipeK(a.val)}</text>`;
    s += `<text x="${cx}" y="${H - padB + 17}" text-anchor="middle" class="pv-lbl">${pipeAttr(a.key)}</text>`;
    s += `<text x="${cx}" y="${H - padB + 32}" text-anchor="middle" class="pv-dim">${a.n} deals · ${a.priced} priced</text>`;
    if (i < agg.length - 1) s += `<text x="${slot * (i + 1)}" y="${H - padB - plotH / 2}" text-anchor="middle" class="pv-dim">&#8594;</text>`;
  }));
  return `<svg viewBox="0 0 ${W} ${H}">${s}</svg>`;
}

function pcForecast(deals, stages, ctx) {
  const rows = stages.map((s => {
    const val = deals.filter((d => d.stage === s.key)).reduce(((a, d) => a + (d.value || 0)), 0);
    return {
      key: s.key,
      prob: ctx.probByStage[s.key] || 0,
      val: val,
      w: val * (ctx.probByStage[s.key] || 0)
    };
  }));
  const total = rows.reduce(((a, r) => a + r.w), 0) || 1;
  const W = 560, barH = 26, barY = 8;
  let x = 0, s = '';
  rows.forEach(((r, i) => {
    const seg = Math.max(0, r.w / total * W - (i < rows.length - 1 ? 2 : 0));
    const tip = `<div class="rev-tip-h">${pipeAttr(r.key)}</div><div class="rev-tip-row"><span>Open value</span><b>${fmtMoney(r.val)}</b></div><div class="rev-tip-row"><span>Probability</span><b>${Math.round(r.prob * 100)}%</b></div><div class="rev-tip-row"><span>Weighted</span><b>${fmtMoney(r.w)}</b></div>`;
    s += `<rect x="${x.toFixed(1)}" y="${barY}" width="${seg.toFixed(1)}" height="${barH}" rx="3" fill="${pipeColor(r.key)}" data-tip="${pipeAttr(tip)}"/>`;
    x += seg + 2;
  }));
  const table = rows.map((r => `<div class="pipe-fc-row"><span class="pipe-fc-stage"><i class="pipe-sw" style="background:${pipeColor(r.key)}"></i>${pipeAttr(r.key)}</span><span class="pipe-fc-math">${pipeK(r.val)} × ${Math.round(r.prob * 100)}%</span><b>${fmtMoney(r.w)}</b></div>`)).join('');
  return `<div class="pipe-hero">${fmtMoney(ctx.weighted)}<span class="pipe-hero-sub">expected from ${fmtMoney(ctx.openValue)} open</span></div>\n    <svg viewBox="0 0 ${W} ${barH + 16}" class="pipe-fc-bar">${s}</svg>\n    <div class="pipe-fc-tbl">${table}</div>`;
}

function pcAging(deals, stages, isStale) {
  const W = 560, rowH = 58, padL = 96, padR = 20, padT = 8, plotW = W - padL - padR;
  const maxD = Math.max(30, ...deals.map((d => d.days || 0)));
  const xOf = d => padL + Math.sqrt(d / maxD) * plotW;
  const H = padT + rowH * stages.length + 26;
  let s = '';
  const ticks = [ 0, 7, 30, 90, 180, 365 ].filter((t => t <= maxD));
  if (ticks[ticks.length - 1] < maxD * .8) ticks.push(maxD);
  ticks.forEach((t => {
    const x = xOf(t);
    s += `<line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${H - 24}" stroke="var(--border)"/>`;
    s += `<text x="${x.toFixed(1)}" y="${H - 8}" text-anchor="middle" class="pv-dim">${t === maxD && ![ 0, 7, 30, 90, 180, 365 ].includes(maxD) ? Math.round(maxD) + 'd' : t + 'd'}</text>`;
  }));
  stages.forEach(((st, i) => {
    const yMid = padT + rowH * i + rowH / 2;
    s += `<text x="0" y="${yMid + 4}" class="pv-lbl">${pipeAttr(st.key)}</text>`;
    const ds = deals.filter((d => d.stage === st.key && d.days != null)).sort(((a, b) => a.days - b.days));
    let lastX = -99, lane = 0;
    ds.forEach((d => {
      const x = xOf(d.days);
      lane = x - lastX < 12 ? (lane + 1) % 4 : 0;
      lastX = x;
      const y = yMid + [ 0, -12, 12, -24 ][lane] * (rowH / 58);
      const stale = isStale(d);
      const tip = `<div class="rev-tip-h">${pipeAttr(d.name)}</div><div class="rev-tip-row"><span>Value</span><b>${d.value > 0 ? fmtMoney(d.value) : 'unpriced'}</b></div><div class="rev-tip-row"><span>In stage</span><b>${d.days}d</b></div>${stale ? '<div class="rev-tip-note">Gone quiet - needs a nudge</div>' : ''}`;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${pipeColor(st.key)}" stroke="${stale ? 'var(--stale)' : 'var(--bg-card)'}" stroke-width="2" data-tip="${pipeAttr(tip)}"/>`;
    }));
  }));
  return `<svg viewBox="0 0 ${W} ${H}">${s}</svg><p class="pipe-chart-foot">Square-root time scale - recent weeks get more room than the long tail.</p>`;
}

function pcTopDeals(deals, openValue) {
  const top = deals.filter((d => d.value > 0)).sort(((a, b) => b.value - a.value)).slice(0, 8);
  const W = 560, rowH = 26, gap = 6, padL = 150, padR = 56;
  const H = top.length * (rowH + gap);
  const mx = Math.max(1, ...top.map((d => d.value)));
  let s = '';
  top.forEach(((d, i) => {
    const y = i * (rowH + gap), w = Math.max(2, d.value / mx * (W - padL - padR));
    const nm = d.name.length > 22 ? d.name.slice(0, 21) + '…' : d.name;
    const tip = `<div class="rev-tip-h">${pipeAttr(d.name)}</div><div class="rev-tip-row"><span>Value</span><b>${fmtMoney(d.value)}</b></div><div class="rev-tip-row"><span>Stage</span><b>${pipeAttr(d.stage)}</b></div><div class="rev-tip-row"><span>Share of pipeline</span><b>${pct(d.value, openValue)}</b></div>`;
    s += `<text x="${padL - 8}" y="${y + rowH / 2 + 4}" text-anchor="end" class="pv-lbl">${pipeAttr(nm)}</text>`;
    s += pipeRightRect(padL, y, w, rowH, 4, pipeColor(d.stage), `data-tip="${pipeAttr(tip)}"`);
    s += `<text x="${padL + w + 8}" y="${y + rowH / 2 + 4}" class="pv-val">${pipeK(d.value)}</text>`;
  }));
  const top5 = top.slice(0, 5).reduce(((a, d) => a + d.value), 0);
  return `<svg viewBox="0 0 ${W} ${H}">${s}</svg><p class="pipe-chart-foot">Top 5 deals hold ${pct(top5, openValue)} of open pipeline value.</p>`;
}

function pcSources(deals) {
  const map = new Map;
  deals.forEach((d => {
    const k = d.lifecycle || 'Untagged';
    const e = map.get(k) || {
      key: k,
      n: 0,
      val: 0
    };
    e.n++;
    e.val += d.value || 0;
    map.set(k, e);
  }));
  const rows = [ ...map.values() ].sort(((a, b) => b.val - a.val || b.n - a.n));
  const W = 560, rowH = 38, gap = 12, padL = 118, padR = 56;
  const H = rows.length * (rowH + gap);
  const mx = Math.max(1, ...rows.map((r => r.val)));
  let s = '';
  rows.forEach(((r, i) => {
    const y = i * (rowH + gap), w = Math.max(2, r.val / mx * (W - padL - padR));
    const tip = `<div class="rev-tip-h">${pipeAttr(r.key)}</div><div class="rev-tip-row"><span>Open value</span><b>${fmtMoney(r.val)}</b></div><div class="rev-tip-row"><span>Deals</span><b>${r.n}</b></div>`;
    s += `<text x="${padL - 8}" y="${y + rowH / 2 + 4}" text-anchor="end" class="pv-lbl">${pipeAttr(r.key)}</text>`;
    s += pipeRightRect(padL, y, w, rowH, 4, 'var(--brand-purple)', `opacity=".85" data-tip="${pipeAttr(tip)}"`);
    s += `<text x="${padL + w + 8}" y="${y + rowH / 2 + 4}" class="pv-val">${pipeK(r.val)} <tspan class="pv-dim">· ${r.n}</tspan></text>`;
  }));
  const total = rows.reduce(((a, r) => a + r.val), 0);
  const lead = rows[0];
  const foot = lead ? `<p class="pipe-chart-foot">${escapeHtml(lead.key)} deals are ${pct(lead.val, total)} of open pipeline value.</p>` : '';
  return `<svg viewBox="0 0 ${W} ${H}">${s}</svg>${foot}`;
}

function pcEntries(deals, stages) {
  const MON = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];
  const now = new Date, months = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
      label: MON[d.getMonth()] + (d.getMonth() === 0 || i === 7 ? ' ' + String(d.getFullYear()).slice(2) : '')
    });
  }
  const firstKey = months[0].key;
  const buckets = [ {
    key: 'older',
    label: 'Older'
  }, ...months ];
  const counts = buckets.map((b => ({
    ...b,
    byStage: Object.fromEntries(stages.map((s => [ s.key, 0 ]))),
    total: 0
  })));
  const idx = Object.fromEntries(counts.map(((b, i) => [ b.key, i ])));
  deals.forEach((d => {
    if (!d.stageSince) return;
    const k = d.stageSince.slice(0, 7);
    const b = counts[k < firstKey ? 0 : idx[k] ?? -1];
    if (!b) return;
    b.byStage[d.stage] = (b.byStage[d.stage] || 0) + 1;
    b.total++;
  }));
  const W = 560, H = 250, padT = 24, padB = 26, plotH = H - padT - padB;
  const mx = Math.max(1, ...counts.map((c => c.total)));
  const slot = W / counts.length, bw = Math.min(38, slot - 14);
  let s = `<line x1="0" y1="${H - padB}" x2="${W}" y2="${H - padB}" stroke="var(--border)"/>`;
  counts.forEach(((c, i) => {
    const cx = slot * i + slot / 2;
    let y = H - padB;
    stages.forEach((st => {
      const n = c.byStage[st.key];
      if (!n) return;
      const h = Math.max(1, n / mx * plotH - 2);
      y -= h;
      const tip = `<div class="rev-tip-h">${pipeAttr(c.label)}</div><div class="rev-tip-row"><span><i style="background:${pipeColor(st.key)}"></i>${pipeAttr(st.key)}</span><b>${n} deal${n > 1 ? 's' : ''}</b></div><div class="rev-tip-row"><span>Total entered</span><b>${c.total}</b></div>`;
      s += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" rx="2" fill="${pipeColor(st.key)}" data-tip="${pipeAttr(tip)}"/>`;
      y -= 2;
    }));
    if (c.total) s += `<text x="${cx}" y="${y - 4}" text-anchor="middle" class="pv-dim">${c.total}</text>`;
    s += `<text x="${cx}" y="${H - padB + 16}" text-anchor="middle" class="pv-dim">${pipeAttr(c.label)}</text>`;
  }));
  return `<svg viewBox="0 0 ${W} ${H}">${s}</svg><p class="pipe-chart-foot">Based on when each deal entered its current stage - re-staged deals count in their newest month.</p>`;
}

function pipeBoard(enriched, stages, isStale) {
  const board = document.getElementById('pipeBoard');
  board.innerHTML = stages.map((stage => {
    const ds = enriched.filter((d => d.stage === stage.key)).sort(((a, b) => b.value - a.value || (b.days || 0) - (a.days || 0)));
    const colVal = ds.reduce(((s, d) => s + (d.value || 0)), 0);
    const cards = ds.map((d => {
      const stale = isStale(d);
      const daysTxt = d.days == null ? '' : `<span class="pipe-days ${stale ? 'stale' : ''}">${d.days}d</span>`;
      const valTxt = d.value > 0 ? `<span class="pipe-val">${fmtMoney(d.value)}</span>` : '<span class="pipe-val pipe-val-zero">-</span>';
      const ren = d.lifecycle === 'Renewal' ? '<span class="pipe-badge renewal">Renewal</span>' : '';
      return `<div class="pipe-deal ${stale ? 'is-stale' : ''}" data-url="${escapeHtml(d.url)}">\n        <div class="pipe-deal-top">${sponsorLogo(d.name, 18)}<span class="pipe-deal-name">${escapeHtml(d.name)}${sponsorCompanyLine(d.name)}</span>${ren}</div>\n        <div class="pipe-deal-row">${valTxt}${daysTxt}${stale ? skillChip(`/reply ${skillArg(d.name)}`) : ''}</div>\n      </div>`;
    })).join('');
    return `<div class="pipe-col">\n      <div class="pipe-col-head" style="border-top-color:${pipeColor(stage.key)}">\n        <span class="pipe-col-title">${stage.key}</span>\n        <span class="pipe-col-meta">${ds.length} · ${fmtMoney(colVal)}</span>\n      </div>\n      <div class="pipe-col-body">${cards || '<div class="pipe-empty">No deals</div>'}</div>\n    </div>`;
  })).join('');
  board.querySelectorAll('.pipe-deal').forEach((el => el.addEventListener('click', (() => {
    const u = el.dataset.url;
    if (u) window.open(u, '_blank', 'noopener');
  }))));
}

const MOV = {
  rows: [],
  totals: null,
  meta: null
};

async function fetchMovement() {
  state.movementLoaded = true;
  try {
    const res = await fetch('/api/movement');
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    MOV.rows = data.rows || [];
    MOV.totals = data.totals || null;
    MOV.meta = data.meta || null;
    mvRender();
    homeRender();
  } catch (e) {
    state.movementLoaded = false;
    const sub = document.getElementById('mvSub');
    if (sub) sub.innerHTML = `<span style="color:var(--stale)">Could not check movement - ${escapeHtml(e.message)}</span>`;
    const list = document.getElementById('mvList');
    if (list) list.innerHTML = '';
  }
}

const MV_LABEL = {
  won: 'Won',
  lost: 'Lost',
  badfit: 'Bad Fit',
  proposal: 'Proposal sent',
  verbal: 'Verbal / Contract'
};

function mvScope(text) {
  if (!text) return '';
  const first = String(text).split('\n').map((t => t.trim())).find(Boolean) || '';
  const clipped = first.length > 120 ? `${first.slice(0, 118).trimEnd()}...` : first;
  return clipped ? `<div class="mv-scope">${escapeHtml(clipped)}</div>` : '';
}

function mvRow(r) {
  const val = r.value > 0 ? `<span class="pipe-val">${fmtMoney(r.value)}</span>` : '<span class="pipe-val pipe-val-zero">-</span>';
  const ren = r.lifecycle === 'Renewal' ? '<span class="pipe-badge renewal">Renewal</span>' : '';
  return `<div class="mv-card mv-${r.bucket}" data-url="${escapeHtml(r.url || '')}">\n    <div class="mv-main">\n      ${sponsorLogo(r.name, 20)}\n      <div class="mv-text">\n        <div class="mv-top">\n          <span class="mv-name">${escapeHtml(r.name)}</span>\n          <span class="pipe-badge mv-tag-${r.bucket}">${MV_LABEL[r.bucket]}</span>\n          ${ren}\n        </div>\n        ${sponsorCompanyLine(r.name)}\n        ${r.bucket === 'won' ? mvScope(r.deliverables) : ''}\n      </div>\n    </div>\n    <div class="mv-side">${val}${r.bucket === 'won' ? skillChip(`/onboard-sponsor ${skillArg(r.name)}`) : ''}</div>\n  </div>`;
}

function mvRender() {
  const list = document.getElementById('mvList');
  const sub = document.getElementById('mvSub');
  const countEl = document.getElementById('mvCount');
  if (!list || !sub) return;
  const d = MOV.meta ? MOV.meta.windowDays : 7;
  const inWeek = MOV.rows.filter((r => r.daysAgo == null || r.daysAgo < d));
  const FORWARD = [ 'won', 'verbal', 'proposal' ];
  const tally = b => {
    const rs = inWeek.filter((r => r.bucket === b));
    return {
      n: rs.length,
      value: rs.reduce(((x, r) => x + (r.value || 0)), 0)
    };
  };
  const t = {
    won: tally('won'),
    verbal: tally('verbal'),
    proposal: tally('proposal')
  };
  const forward = inWeek.filter((r => FORWARD.includes(r.bucket))).sort(((a, b) => FORWARD.indexOf(a.bucket) - FORWARD.indexOf(b.bucket) || a.daysAgo - b.daysAgo || (b.value || 0) - (a.value || 0)));
  const closed = inWeek.filter((r => r.bucket === 'lost' || r.bucket === 'badfit'));
  if (countEl) countEl.textContent = forward.length || '';
  const u = MOV.meta ? MOV.meta.undated : 0;
  const undated = u ? ` <span style="color:var(--aging)">${u} closed deal${u === 1 ? ' carries' : 's carry'} no close date and cannot be placed in the window.</span>` : '';
  sub.innerHTML = `This week (last ${d} days), from Attio stage changes. Proposal and agreed values are pipeline, not revenue.${undated}`;
  const stat = (n, label, val, cls) => `<div class="mv-stat ${n ? '' : 'mv-stat-zero'}">\n      <span class="mv-stat-n ${cls}">${n || 0}</span><span class="mv-stat-l">${label}${n && val > 0 ? ` &middot; ${fmtMoney(val)}` : ''}</span></div>`;
  const summary = `<div class="mv-summary">\n      ${stat(t.won?.n, 'won', t.won?.value, 'mv-h-won')}\n      ${stat(t.verbal?.n, 'agreed, unsigned', t.verbal?.value, 'mv-h-verbal')}\n      ${stat(t.proposal?.n, 'proposals sent', t.proposal?.value, 'mv-h-proposal')}\n      ${stat(closed.length, 'closed', 0, 'mv-h-closed')}\n    </div>`;
  const cards = forward.length ? forward.map(mvRow).join('') : `<div class="pipe-empty">Nothing won, agreed or proposed in ${d} days.</div>`;
  const closedLine = closed.length ? `<div class="mv-closed"><span class="mv-closed-k">Closed</span>${closed.map((r => `<a href="${escapeHtml(r.url || '#')}" target="_blank" rel="noopener" title="${pipeAttr(`${MV_LABEL[r.bucket]}${r.closedOn ? ` on ${r.closedOn}` : ''}${r.value > 0 ? ` · ${fmtMoney(r.value)}` : ''}`)}">${escapeHtml(r.name)}</a>`)).join('<span class="mv-dot">&middot;</span>')}</div>` : '';
  list.innerHTML = summary + cards + closedLine;
  list.querySelectorAll('.mv-card').forEach((el => el.addEventListener('click', (() => {
    const u = el.dataset.url;
    if (u) window.open(u, '_blank', 'noopener');
  }))));
}

const REN = {
  rows: [],
  meta: null
};

async function fetchRenewals() {
  state.renewalsLoaded = true;
  try {
    const res = await fetch('/api/renewals');
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    REN.rows = data.rows || [];
    REN.meta = data.meta || null;
    renRender();
    homeRender();
  } catch (e) {
    state.renewalsLoaded = false;
    const block = document.getElementById('renBlock');
    if (block) block.hidden = false;
    const count = document.getElementById('renCount');
    if (count) count.textContent = '';
    document.getElementById('renSub').innerHTML = `<span style="color:var(--stale)">Could not check renewals - ${escapeHtml(e.message)}</span>`;
    document.getElementById('renList').innerHTML = '';
  }
}

function renAction(r) {
  if (r.hold) {
    const until = r.hold.until ? ` until ${new Date(`${r.hold.until}T00:00:00`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    })}` : '';
    return {
      label: `On hold${until}`,
      cls: 'hold',
      todo: r.hold.why || 'Held deliberately, no reason recorded'
    };
  }
  if (!r.deal && r.priorDeal) {
    const v = r.priorDeal.value ? ` at ${fmtMoney(r.priorDeal.value)}` : '';
    return {
      label: 'No renewal open',
      cls: 'crit',
      todo: `Last deal ${r.priorDeal.stage}${v}. Open the renewal and start the conversation`
    };
  }
  if (!r.deal) return {
    label: 'Never in Attio',
    cls: 'crit',
    todo: 'No deal record exists for this sponsor at all, open one'
  };
  if (r.deal.stage === 'Warm Lead') return {
    label: 'Warm Lead',
    cls: 'warn',
    todo: 'Get a proposal out'
  };
  return {
    label: r.deal.stage,
    cls: 'warn',
    todo: 'Get a proposal out'
  };
}

function renSkill(r) {
  if (r.hold) return '';
  if (!r.deal && r.priorDeal) return skillChip(`/create-renewal ${r.sponsor}`);
  if (!r.deal) return skillChip(`/attio ${r.sponsor}`);
  return skillChip(`/proposal ${r.sponsor}`);
}

function renRow(r) {
  const a = renAction(r);
  const clock = r.band === 'ended' ? `<span class="pipe-days stale">ran out ${r.daysSince}d ago</span>` : `<span class="pipe-days">${r.daysLeft}d left</span>`;
  const detail = r.band === 'ended' ? `last ran ${escapeHtml(r.last || '')}` : `ends ${escapeHtml(r.end || '')} &middot; ${r.remaining} still booked`;
  const dealLine = r.deal ? `<a class="ren-deal" href="${escapeHtml(r.deal.url || '#')}" target="_blank" rel="noopener">${escapeHtml(r.deal.name)}</a>` : r.priorDeal ? `<a class="ren-deal" href="${escapeHtml(r.priorDeal.url || '#')}" target="_blank" rel="noopener">${escapeHtml(r.priorDeal.name)} &middot; ${escapeHtml(r.priorDeal.stage)}</a>` : '<span class="ren-deal ren-deal-none">Nothing in Attio</span>';
  return `<div class="ren-card ${r.hold ? 'ren-held' : `ren-${r.band}`}">\n    <div class="ren-main">\n      ${sponsorLogo(r.sponsor, 20)}\n      <div class="ren-text">\n        <div class="ren-top">\n          <span class="ren-name">${escapeHtml(r.sponsor)}</span>\n          <span class="pipe-badge ren-${a.cls}">${escapeHtml(a.label)}</span>\n          ${clock}\n        </div>\n        ${sponsorCompanyLine(r.sponsor)}\n        <div class="ren-when">${detail}</div>\n        <div class="ren-todo">${escapeHtml(a.todo)}</div>\n      </div>\n    </div>\n    <div class="ren-side">${dealLine}<div class="ren-chip">${renSkill(r)}</div></div>\n  </div>`;
}

function renRender() {
  const block = document.getElementById('renBlock');
  const list = document.getElementById('renList');
  if (!block || !list) return;
  const n = REN.rows.length;
  if (!n) {
    block.hidden = true;
    list.innerHTML = '';
    return;
  }
  block.hidden = false;
  const d = REN.meta ? REN.meta.endingDays : 21;
  const todo = REN.meta && typeof REN.meta.actionable === 'number' ? REN.meta.actionable : REN.rows.filter((r => !r.hold)).length;
  document.getElementById('renCount').textContent = todo;
  const suppressed = REN.meta && REN.meta.suppressed || [];
  const unmatched = REN.meta && REN.meta.unmatchedHolds || [];
  let sub = 'Sponsors running out of booked work with no proposal out yet. Anything already at Sent Proposal or Verbal / Contract is being worked and is not listed.';
  if (suppressed.length) {
    sub += ` Not listed by decision: ${suppressed.map((s => `${s.sponsor} (${s.why})`)).join('; ')}`;
  }
  const subEl = document.getElementById('renSub');
  subEl.textContent = sub;
  if (unmatched.length) {
    subEl.innerHTML += ` <span style="color:var(--stale)">Hold set for ${unmatched.map(escapeHtml).join(', ')} matches no sponsor in the calendar - check the spelling, that renewal is not being held, it is just not here.</span>`;
  }
  const ended = REN.rows.filter((r => r.band === 'ended' && !r.hold));
  const ending = REN.rows.filter((r => r.band === 'ending' && !r.hold));
  const held = REN.rows.filter((r => r.hold));
  const group = (title, hint, rows) => rows.length ? `<div class="ren-group"><h4>${title} <span class="count">${rows.length}</span></h4>\n       <p class="section-hint">${hint}</p>${rows.map(renRow).join('')}</div>` : '';
  list.innerHTML = group('Already out of runway', 'The last deliverable has run and nothing is booked after it. The renewal window is open now, not soon.', ended) + group(`Ending within ${d} days`, 'Still delivering, but the end is in sight and no proposal has gone out.', ending) + group('On hold', 'Running out, and deliberately not being chased yet. Each comes back to the list by itself on its date.', held);
}

const SUBS = {
  data: null,
  main: [],
  view: '12m',
  buckets: [],
  bound: false,
  W: 1120,
  H: 380,
  padL: 62,
  padR: 18,
  padT: 20,
  padB: 46
};

SUBS.plotW = SUBS.W - SUBS.padL - SUBS.padR;

SUBS.plotH = SUBS.H - SUBS.padT - SUBS.padB;

const subK = n => (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k';

const subN = n => n == null ? '-' : Math.round(n).toLocaleString('en-US');

async function fetchAudience() {
  state.audienceLoaded = true;
  try {
    const r = await fetch('/api/subscribers');
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    subInit(d);
  } catch (e) {
    state.audienceLoaded = false;
    document.getElementById('subSub').innerHTML = `<span style="color:var(--stale)">Could not load /api/subscribers - ${escapeHtml(e.message)}</span>`;
  }
}

function subInit(d) {
  SUBS.data = d;
  const pts = d.points || [];
  const gmax = Math.max(1, ...pts.map((p => p.recipients)));
  SUBS.main = pts.filter((p => p.recipients >= .55 * gmax)).sort(((a, b) => a.date - b.date));
  const cur = SUBS.main.length ? SUBS.main[SUBS.main.length - 1].recipients : d.stats.active;
  const subsAgo = days => {
    const t = Date.now() / 1e3 - days * 86400;
    const c = SUBS.main.filter((p => p.date <= t)).slice(-1)[0];
    return c ? c.recipients : null;
  };
  const n30 = subsAgo(30), n90 = subsAgo(90);
  const delta = v => v == null ? '-' : (v >= 0 ? '+' : '') + Math.round(v).toLocaleString('en-US');
  document.getElementById('subCount').textContent = subN(d.stats.active);
  document.getElementById('subSub').textContent = `Beehiiv · ${subN(d.stats.active)} active subscribers · ${SUBS.main.length} full editions tracked`;
  const card = (k, v, s) => `<div class="sub-card"><div class="sub-k">${k}</div><div class="sub-v">${v}</div><div class="sub-cardsub">${s}</div></div>`;
  document.getElementById('subCards').innerHTML = [ card('Active subscribers', subN(d.stats.active), 'free list'), card('Net adds · 30d', delta(n30 != null ? cur - n30 : null), 'vs ~30 days ago'), card('Net adds · 90d', delta(n90 != null ? cur - n90 : null), 'vs ~90 days ago'), card('Avg open rate', (d.stats.openRate || 0).toFixed(1) + '%', (d.stats.clickRate || 0).toFixed(1) + '% click') ].join('');
  const sends = SUBS.main.slice(-10).reverse();
  document.querySelector('#subSends tbody').innerHTML = sends.map((p => {
    const ds = new Date(p.date * 1e3).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    });
    const title = escapeHtml((p.title || '').slice(0, 56));
    const link = p.url ? `<a href="${escapeHtml(p.url)}" target="_blank" rel="noopener" class="sub-link">${title}</a>` : title;
    return `<tr><td>${ds}</td><td>${link}</td><td>${subN(p.recipients)}</td><td>${p.openRate != null ? p.openRate.toFixed(1) + '%' : '-'}</td><td>${p.clickRate != null ? p.clickRate.toFixed(1) + '%' : '-'}</td></tr>`;
  })).join('');
  const sw = document.getElementById('subSwitch');
  const VIEWS = [ [ '12m', 'Last 12 months · monthly' ], [ '3m', 'Last 3 months · weekly' ], [ '1m', 'Last month · per send' ] ];
  sw.innerHTML = '';
  VIEWS.forEach((v => {
    const b = document.createElement('button');
    b.className = 'period-pill' + (v[0] === SUBS.view ? ' active' : '');
    b.textContent = v[1];
    b.onclick = () => {
      [ ...sw.children ].forEach((c => c.classList.remove('active')));
      b.classList.add('active');
      SUBS.view = v[0];
      subDrawChart();
    };
    sw.appendChild(b);
  }));
  if (!SUBS.bound) {
    const svg = document.getElementById('subChart');
    svg.addEventListener('mousemove', subOnMove);
    svg.addEventListener('mouseleave', (() => {
      if (SUBS.tip) SUBS.tip.style.display = 'none';
      if (SUBS.guide) SUBS.guide.style.display = 'none';
    }));
    SUBS.bound = true;
  }
  subDrawChart();
}

function subBuckets() {
  const now = Date.now() / 1e3, main = SUBS.main;
  const MON = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];
  let rangeStart, keyOf;
  if (SUBS.view === '12m') {
    rangeStart = now - 365 * 86400;
    keyOf = d => {
      const t = new Date(d * 1e3);
      return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0');
    };
  } else if (SUBS.view === '3m') {
    rangeStart = now - 92 * 86400;
    keyOf = d => {
      const t = new Date(d * 1e3);
      const oj = Date.UTC(t.getUTCFullYear(), 0, 1);
      return t.getUTCFullYear() + '-W' + String(Math.floor((d * 1e3 - oj) / (7 * 864e5))).padStart(2, '0');
    };
  } else {
    rangeStart = now - 31 * 86400;
    keyOf = d => {
      const t = new Date(d * 1e3);
      return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0');
    };
  }
  const map = new Map;
  main.filter((p => p.date >= rangeStart)).forEach((p => {
    const k = keyOf(p.date);
    const e = map.get(k);
    if (!e || p.recipients > e.subs) map.set(k, {
      key: k,
      ts: p.date,
      subs: p.recipients
    });
  }));
  const arr = [ ...map.values() ].sort(((a, b) => a.ts - b.ts));
  arr.forEach((b => {
    const t = new Date(b.ts * 1e3);
    b.label = SUBS.view === '12m' ? MON[t.getUTCMonth()] + ' ' + String(t.getUTCFullYear()).slice(2) : t.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    });
  }));
  return arr;
}

function subDrawChart() {
  const svg = document.getElementById('subChart');
  const b = subBuckets();
  SUBS.buckets = b;
  const {W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, plotW: plotW, plotH: plotH} = SUBS;
  if (b.length < 2) {
    svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" class="rev-lbl">Not enough sends in this range</text>`;
    document.getElementById('subNote').textContent = 'Subscriber count is sampled at each newsletter send (recipients ≈ active list size).';
    return;
  }
  const subs = b.map((x => x.subs)), mn = Math.min(...subs), mx = Math.max(...subs);
  const pad = (mx - mn) * .15 || mx * .01, yMin = Math.max(0, mn - pad), yMax = mx + pad;
  const x = i => padL + i * (plotW / (b.length - 1));
  const y = v => padT + plotH - (v - yMin) / (yMax - yMin) * plotH;
  let s = '';
  for (let g = 0; g <= 4; g++) {
    const val = yMin + (yMax - yMin) * g / 4, yy = padT + plotH - plotH * g / 4;
    s += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="var(--border)"/><text x="${padL - 8}" y="${yy + 3}" text-anchor="end" class="rev-lbl">${subK(val)}</text>`;
  }
  let area = `${x(0).toFixed(1)},${(padT + plotH).toFixed(1)} `;
  b.forEach(((p, i) => area += `${x(i).toFixed(1)},${y(p.subs).toFixed(1)} `));
  area += `${x(b.length - 1).toFixed(1)},${(padT + plotH).toFixed(1)}`;
  s += `<polygon points="${area}" fill="var(--brand-purple)" opacity=".14"/>`;
  let line = '';
  b.forEach(((p, i) => line += `${x(i).toFixed(1)},${y(p.subs).toFixed(1)} `));
  s += `<polyline points="${line.trim()}" fill="none" stroke="var(--brand-purple)" stroke-width="2.5"/>`;
  b.forEach(((p, i) => s += `<circle cx="${x(i).toFixed(1)}" cy="${y(p.subs).toFixed(1)}" r="3" fill="var(--brand-purple)"/>`));
  const step = Math.ceil(b.length / 9);
  b.forEach(((p, i) => {
    if (i % step === 0 || i === b.length - 1) s += `<text x="${x(i).toFixed(1)}" y="${H - padB + 16}" text-anchor="middle" class="rev-lbl">${escapeHtml(p.label)}</text>`;
  }));
  svg.innerHTML = s;
  const net = b[b.length - 1].subs - b[0].subs;
  document.getElementById('subNote').textContent = `Active subscribers sampled at each send. ${net >= 0 ? '+' : ''}${net.toLocaleString('en-US')} over this range.`;
}

function subEnsureTip() {
  if (SUBS.tip) return;
  SUBS.tip = document.createElement('div');
  SUBS.tip.className = 'rev-tip';
  SUBS.tip.style.display = 'none';
  SUBS.guide = document.createElement('div');
  SUBS.guide.className = 'rev-guide';
  SUBS.guide.style.display = 'none';
  document.body.appendChild(SUBS.tip);
  document.body.appendChild(SUBS.guide);
}

function subOnMove(e) {
  subEnsureTip();
  const b = SUBS.buckets;
  if (!b || b.length < 2) return;
  const svg = document.getElementById('subChart'), rect = svg.getBoundingClientRect();
  const sx = SUBS.W / rect.width, sy = SUBS.H / rect.height;
  const span = SUBS.plotW / (b.length - 1);
  let i = Math.round(((e.clientX - rect.left) * sx - SUBS.padL) / span);
  i = Math.max(0, Math.min(b.length - 1, i));
  const p = b[i], prev = i > 0 ? b[i - 1].subs : null, net = prev == null ? null : p.subs - prev;
  SUBS.tip.innerHTML = `<div class="rev-tip-h">${escapeHtml(p.label)}</div>\n    <div class="rev-tip-row"><span><i style="background:var(--brand-purple)"></i>Subscribers</span><b>${subN(p.subs)}</b></div>` + (net != null ? `<div class="rev-tip-row"><span>Net add</span><b>${net >= 0 ? '+' : ''}${subN(net)}</b></div>` : '');
  SUBS.tip.style.display = 'block';
  const tw = SUBS.tip.offsetWidth, th = SUBS.tip.offsetHeight;
  let left = e.clientX + 14, top = e.clientY - th - 12;
  if (left + tw > window.innerWidth - 8) left = e.clientX - tw - 14;
  if (top < 8) top = e.clientY + 18;
  SUBS.tip.style.left = left + 'px';
  SUBS.tip.style.top = top + 'px';
  const gx = rect.left + (SUBS.padL + i * span) / sx;
  SUBS.guide.style.display = 'block';
  SUBS.guide.style.left = gx + 'px';
  SUBS.guide.style.top = rect.top + SUBS.padT / sy + 'px';
  SUBS.guide.style.height = SUBS.plotH / sy + 'px';
}

const CCAL_MON = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];

const CCAL_DOW = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];

const CCAL = {
  data: null,
  byDate: {},
  month: null
};

async function fetchContentCalendar() {
  state.ccalLoaded = true;
  try {
    const r = await fetch('/api/content-calendar');
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    CCAL.data = d;
    CCAL.byDate = Object.fromEntries(d.editions.map((e => [ e.date, e ])));
    const today = new Date;
    CCAL.month = CCAL.month || new Date(today.getFullYear(), today.getMonth(), 1);
    initCcalControls();
    ccalRenderSummary();
    ccalRenderMonth();
  } catch (e) {
    state.ccalLoaded = false;
    document.getElementById('ccalSub').innerHTML = `<span style="color:var(--stale)">Could not load /api/content-calendar - ${escapeHtml(e.message)}</span>`;
  }
}

let ccalControlsBound = false;

function initCcalControls() {
  if (ccalControlsBound) return;
  ccalControlsBound = true;
  document.getElementById('ccalPrevBtn').addEventListener('click', (() => ccalShiftMonth(-1)));
  document.getElementById('ccalNextBtn').addEventListener('click', (() => ccalShiftMonth(1)));
  document.getElementById('ccalTodayBtn').addEventListener('click', (() => {
    const today = new Date;
    CCAL.month = new Date(today.getFullYear(), today.getMonth(), 1);
    ccalRenderMonth();
  }));
  document.getElementById('ccalDow').innerHTML = CCAL_DOW.map((d => `<div>${d}</div>`)).join('');
  let wheelLock = false;
  document.getElementById('ccalGrid').addEventListener('wheel', (e => {
    e.preventDefault();
    if (wheelLock) return;
    wheelLock = true;
    ccalShiftMonth(e.deltaY > 0 ? 1 : -1);
    setTimeout((() => {
      wheelLock = false;
    }), 350);
  }), {
    passive: false
  });
}

function ccalShiftMonth(delta) {
  CCAL.month = new Date(CCAL.month.getFullYear(), CCAL.month.getMonth() + delta, 1);
  ccalRenderMonth();
}

function ccalRenderSummary() {
  const d = CCAL.data;
  const now = new Date;
  now.setHours(0, 0, 0, 0);
  const todayMs = now.getTime();
  const editions = d.editions.map((e => ({
    ...e,
    ms: new Date(e.date + 'T00:00:00').getTime()
  })));
  const upcoming = editions.filter((e => e.ms >= todayMs)).sort(((a, b) => a.ms - b.ms));
  const nextRed = upcoming.find((e => e.score === 'red'));
  document.getElementById('ccalCount').textContent = upcoming.length;
  document.getElementById('ccalSub').innerHTML = `${escapeHtml(d.meta.source)} · synced ${d.meta.pulled}` + (nextRed ? ` · <span style="color:var(--stale)">next send-gate risk: ${CCAL_MON[new Date(nextRed.date + 'T00:00:00').getMonth()].slice(0, 3)} ${new Date(nextRed.date + 'T00:00:00').getDate()} - ${escapeHtml(nextRed.mustFailed[0])}${nextRed.mustFailed.length > 1 ? ` (+${nextRed.mustFailed.length - 1} more)` : ''}</span>` : ' · nothing at risk in this window');
}

function ccalRenderMonth() {
  const first = CCAL.month;
  document.getElementById('ccalMonthLabel').textContent = `${CCAL_MON[first.getMonth()]} ${first.getFullYear()}`;
  const today = new Date;
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().slice(0, 10);
  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - first.getDay());
  const weeks = [];
  let cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let i = 0; i < 7; i++) {
      row.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(row);
    if (cursor > first && cursor.getMonth() !== first.getMonth() && w >= 3) break;
  }
  const html = weeks.map((row => `<div class="cc-mrow">${row.map((dt => {
    const iso = dt.toISOString().slice(0, 10);
    const inMonth = dt.getMonth() === first.getMonth();
    const isToday = iso === todayISO;
    const e = CCAL.byDate[iso];
    const company = e ? ccalCompanyName(e) || 'TBD' : '';
    const adSponsors = e ? ccalAdSponsors(e) : [];
    return `<div class="cc-mcell ${inMonth ? '' : 'outside'} ${isToday ? 'today' : ''} ${e ? 'has-edition cc-' + e.score : ''}" ${e ? `onclick="openCcalModal('${iso}')"` : ''}>\n      <div class="cc-mcell-date">${dt.getDate()}</div>\n      ${e ? `<div class="cc-mcell-body">\n        <div class="cc-mcell-top"><i class="cc-dot ${e.score}"></i><span class="cc-mcell-badge">${e.score === 'red' ? `${e.mustFailed.length} gate issue${e.mustFailed.length === 1 ? '' : 's'}` : `${e.met}/${e.total}`}</span></div>\n        <div class="cc-mcell-name">${escapeHtml(company)}</div>\n        ${e.beehiiv && e.beehiiv.subject ? `<div class="cc-mcell-subject" title="${escapeHtml(e.beehiiv.subject)}">${escapeHtml(e.beehiiv.subject)}</div>` : ''}\n        ${adSponsors.length ? `<div class="cc-mcell-sponsors">${adSponsors.map((s => `<span class="cc-mspon" title="${escapeHtml(s)}">${sponsorLogo(s, 15)}</span>`)).join('')}</div>` : ''}\n      </div>` : ''}\n    </div>`;
  })).join('')}</div>`)).join('');
  document.getElementById('ccalGrid').innerHTML = html;
}

function ccalCompanyName(e) {
  const breakdown = (e.deliverables || []).find((x => x.type === 'Sponsored Breakdown'));
  if (breakdown) return breakdown.name.split(' - ')[0];
  if (e.isRerun && e.articleName) return e.articleName.replace(/\s*rerun\s*$/i, '').trim() || null;
  return e.articleName || null;
}

function ccalAdSponsors(e) {
  return [ ...new Set((e.deliverables || []).filter((x => x.type === 'Newsletter Ad')).map((x => x.name.split(' - ')[0]))) ];
}

const CC_GROUP_ORDER = [ 'Send Gate', 'Build Progress' ];

function ccalTierSection(e, tier, groupLabel, blurb) {
  const items = e.checkpoints.filter((cp => cp.group === groupLabel));
  if (!items.length) return '';
  const cpIcon = cp => cp.applicable === false ? '<span class="cc-cp-icon na" title="Not yet due">–</span>' : cp.met ? '<span class="cc-cp-icon yes">✓</span>' : `<span class="cc-cp-icon no ${tier}">✕</span>`;
  const metCount = items.filter((cp => cp.applicable && cp.met)).length;
  const dueCount = items.filter((cp => cp.applicable)).length;
  const passed = tier === 'must' && dueCount === items.length && metCount === dueCount;
  const pending = tier === 'must' && !passed && metCount === dueCount;
  let tag = '', count = dueCount ? `${metCount}/${dueCount} due` : 'not due yet';
  if (tier === 'must') {
    if (e.sent) {
      tag = passed ? '<span class="cc-cp-group-tag ok">SENT</span>' : '<span class="cc-cp-group-tag">SENT WITH FLAGS</span>';
      if (passed) {
        count = `${metCount}/${dueCount} passed`;
        blurb = 'This edition has already gone out. Every send gate was met.';
      }
    } else if (passed) {
      tag = '<span class="cc-cp-group-tag ok">GATES PASSED</span>';
      count = `${metCount}/${dueCount} passed`;
    } else if (pending) {
      tag = '<span class="cc-cp-group-tag wait">NOT ALL DUE YET</span>';
    } else {
      tag = '<span class="cc-cp-group-tag">BLOCKS SEND</span>';
    }
  }
  return `<div class="cc-cp-group cc-cp-group-${tier}${passed ? ' passed' : pending ? ' pending' : ''}">\n    <div class="cc-cp-group-head">\n      <div class="cc-cp-group-label">${groupLabel}${tag ? ' ' + tag : ''}</div>\n      <span class="cc-cp-group-count">${count}</span>\n    </div>\n    <p class="cc-cp-group-blurb">${blurb}</p>\n    ${items.map((cp => `<div class="cc-cp-row ${cp.applicable === false ? 'na' : ''} ${tier === 'must' && cp.applicable && !cp.met ? 'must-fail' : ''}">\n      <div class="cc-cp-row-main">${cpIcon(cp)}<span>${escapeHtml(cp.label)}</span></div>\n      ${cp.note ? `<div class="cc-cp-note">${escapeHtml(cp.note)}</div>` : ''}\n    </div>`)).join('')}\n  </div>`;
}

function openCcalModal(date) {
  const e = (CCAL.data.editions || []).find((x => x.date === date));
  if (!e) return;
  const MON = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];
  const dt = new Date(e.date + 'T00:00:00');
  const dateLabel = `${e.dow}, ${MON[dt.getMonth()]} ${dt.getDate()}`;
  const adSponsors = ccalAdSponsors(e);
  document.getElementById('ccalModalTitle').textContent = ccalCompanyName(e) || 'TBD';
  document.getElementById('ccalModalSubtitle').textContent = adSponsors.length ? `Ad sponsors: ${adSponsors.join(', ')}` : 'No ad slots booked';
  const groups = ccalTierSection(e, 'must', 'Send Gate', 'What must be true right before this hits inboxes. Any miss here is the score, not an average.') + ccalTierSection(e, 'should', 'Build Progress', 'How far along production is. Informative - doesn’t block the send on its own.');
  const sponsors = (e.deliverables || []).map((x => `<div class="cc-deliv-row">${sponsorLogo(x.name, 16)}<span class="cc-deliv-name">${escapeHtml(x.name)}</span><span class="cc-deliv-status">${escapeHtml(x.adStatus)}</span></div>`)).join('') || '<div class="pipe-empty">No sponsor deliverables on this edition.</div>';
  const slack = (e.slackNotes || []).map((n => `<div class="cc-slack-note ${n.blocker ? 'blocker' : ''}"><b>${escapeHtml(n.sponsor)}:</b> ${escapeHtml(n.note)}</div>`)).join('') || '<div class="pipe-empty">No Slack notes recorded for this edition.</div>';
  const beehiiv = e.beehiiv ? `<a href="${e.beehiiv.url}" target="_blank" rel="noopener" class="kanban-tag" style="text-decoration:none">beehiiv: ${escapeHtml(e.beehiiv.status)} ↗</a>` : '<span class="kanban-tag" style="color:var(--text-dim)">No beehiiv post yet</span>';
  const bh = e.beehiiv || {};
  const subjectBlock = bh.subject ? `<div class="kanban-detail-section">\n      <div class="kanban-detail-label">Subject line${e.sent ? ' (sent)' : ''}</div>\n      <div class="cc-subject">${escapeHtml(bh.subject)}</div>\n      ${bh.preview ? `<div class="cc-preview">${escapeHtml(bh.preview)}</div>` : ''}\n      ${(bh.subjectVariants || []).filter((v => v !== bh.subject)).length ? `<div class="cc-variants">A/B also tested: ${bh.subjectVariants.filter((v => v !== bh.subject)).map(escapeHtml).join(' · ')}</div>` : ''}\n    </div>` : '';
  document.getElementById('ccalModalBody').innerHTML = `\n    <div class="idea-modal-tags">\n      <span class="kanban-tag" style="color: var(--${e.score === 'green' ? 'fresh' : e.score === 'yellow' ? 'aging' : 'stale'}); border-color: var(--${e.score === 'green' ? 'fresh' : e.score === 'yellow' ? 'aging' : 'stale'})40">\n        ${e.score.toUpperCase()}${e.score === 'red' ? ` · ${e.mustFailed.length} gate issue${e.mustFailed.length === 1 ? '' : 's'}` : ` · ${e.met}/${e.total} checkpoints`}\n      </span>\n      <span class="kanban-tag">${dateLabel}</span>\n      ${beehiiv}\n    </div>\n    ${subjectBlock}\n    <div class="cc-cp-groups">${groups}</div>\n    <div class="kanban-detail-section">\n      <div class="kanban-detail-label">Sponsor deliverables</div>\n      ${sponsors}\n    </div>\n    <div class="kanban-detail-section">\n      <div class="kanban-detail-label">Slack cross-check</div>\n      ${slack}\n    </div>\n  `;
  document.getElementById('ccalModal').classList.add('open');
  document.getElementById('ccalModalOverlay').classList.add('open');
}

function closeCcalModal() {
  document.getElementById('ccalModal').classList.remove('open');
  document.getElementById('ccalModalOverlay').classList.remove('open');
}

const CAL = {
  data: null
};

function calMonday(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

async function fetchCalendar() {
  try {
    const r = await fetch('/api/calendar');
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    calRender(d);
  } catch (e) {
    console.warn(e);
  }
}

function calRender(d) {
  CAL.data = d;
}

init();
